const {
  DAY_BY_CODE,
  PROFILE_GIVEN_NAME_PERMISSION,
  REMINDER_PERMISSION,
  SKILL_PREFIX,
} = require('./constants');
const { generateBedtimeMessage } = require('./ai');
const { randomMessage } = require('./messages');
const { getCustomerFirstName, isProfilePermissionError } = require('./profile');
const {
  dayCodeForTimeZone,
  nextScheduledTime,
  normalizeDaySlot,
  normalizeTimeSlot,
  parseRecurrenceRule,
  recurrenceRuleForDaily,
  recurrenceRuleForDay,
  timeForSpeech,
} = require('./schedule');

function isPermissionError(error) {
  return [401, 403].includes(error?.statusCode) || [401, 403].includes(error?.response?.status);
}

function isTimeZoneError(error) {
  return error?.message === 'TIMEZONE_UNAVAILABLE';
}

function reminderTextForMessage(message) {
  return `${SKILL_PREFIX} ${message}`;
}

async function getDeviceTimeZone(handlerInput) {
  const deviceId = handlerInput.requestEnvelope.context.System.device.deviceId;

  try {
    return await handlerInput.serviceClientFactory.getUpsServiceClient().getSystemTimeZone(deviceId);
  } catch (error) {
    const wrapped = new Error('TIMEZONE_UNAVAILABLE');
    wrapped.cause = error;
    throw wrapped;
  }
}

function skillReminderText(reminder) {
  return reminder?.alertInfo?.spokenInfo?.content?.[0]?.text || '';
}

function isSkillReminder(reminder) {
  return skillReminderText(reminder).startsWith(SKILL_PREFIX);
}

function scheduleFromReminder(reminder) {
  const rule = reminder?.trigger?.recurrence?.recurrenceRules?.[0];

  if (!rule) {
    return null;
  }

  const parsed = parseRecurrenceRule(rule);

  if (parsed.kind === 'DAILY') {
    return {
      alertToken: reminder.alertToken,
      kind: 'DAILY',
      time: parsed.time,
      text: skillReminderText(reminder),
    };
  }

  if (parsed.kind === 'WEEKLY') {
    return {
      alertToken: reminder.alertToken,
      kind: 'WEEKLY',
      time: parsed.time,
      dayCode: parsed.dayCode,
      dayName: parsed.dayName,
      text: skillReminderText(reminder),
    };
  }

  return null;
}

async function listSkillReminders(handlerInput) {
  const response = await handlerInput.serviceClientFactory.getReminderManagementServiceClient().getReminders();
  const alerts = response.alerts || [];
  const skillAlerts = alerts.filter(isSkillReminder);
  console.log('Goodnight Sweetheart reminder inventory', {
    totalAlertCount: alerts.length,
    skillAlertCount: skillAlerts.length,
  });
  return skillAlerts;
}

function sortSchedules(schedules) {
  return [...schedules].sort((left, right) => {
    if (left.kind === 'DAILY') {
      return -1;
    }

    if (right.kind === 'DAILY') {
      return 1;
    }

    return normalizeDaySlot(left.dayCode).dayOfWeek - normalizeDaySlot(right.dayCode).dayOfWeek;
  });
}

async function listSkillSchedules(handlerInput) {
  const reminders = await listSkillReminders(handlerInput);
  return sortSchedules(reminders.map(scheduleFromReminder).filter(Boolean));
}

async function deleteReminder(handlerInput, alertToken) {
  return handlerInput.serviceClientFactory.getReminderManagementServiceClient().deleteReminder(alertToken);
}

async function deleteReminders(handlerInput, reminders) {
  for (const reminder of reminders) {
    await deleteReminder(handlerInput, reminder.alertToken);
  }
}

function reminderRequest({ dayCode, message, time, timeZoneId }) {
  const scheduledTime = nextScheduledTime({
    dayCode,
    time,
    timeZoneId,
  });

  const recurrenceRule = dayCode ? recurrenceRuleForDay(dayCode, time) : recurrenceRuleForDaily(time);

  return {
    requestTime: new Date().toISOString(),
    trigger: {
      type: 'SCHEDULED_ABSOLUTE',
      scheduledTime,
      timeZoneId,
      recurrence: {
        recurrenceRules: [recurrenceRule],
      },
    },
    alertInfo: {
      spokenInfo: {
        content: [
          {
            locale: 'en-US',
            text: reminderTextForMessage(message),
          },
        ],
      },
    },
    pushNotification: {
      status: 'ENABLED',
    },
  };
}

async function createReminder(handlerInput, request) {
  return handlerInput.serviceClientFactory.getReminderManagementServiceClient().createReminder(request);
}

function fallbackMessage() {
  return randomMessage();
}

async function getOptionalCustomerFirstName(handlerInput) {
  try {
    return await getCustomerFirstName(handlerInput);
  } catch (error) {
    if (!isProfilePermissionError(error)) {
      throw error;
    }

    console.warn('Goodnight Sweetheart proceeding without customer first name permission');
    return null;
  }
}

async function createBedtimeReminder(handlerInput, { dayCode, firstName, time, timeZoneId }) {
  const dayName = dayCode ? (DAY_BY_CODE.get(dayCode)?.name || dayCode) : 'every day';
  const message = await generateBedtimeMessage({
    dayName,
    fallback: fallbackMessage,
    firstName,
    time,
  });

  console.log('Goodnight Sweetheart creating reminder', {
    dayCode: dayCode || 'DAILY',
    dayName,
    hasFirstName: Boolean(firstName),
    messageLength: message.length,
    time,
    timeZoneId,
  });

  const response = await createReminder(
    handlerInput,
    reminderRequest({
      dayCode,
      message,
      time,
      timeZoneId,
    }),
  );

  console.log('Goodnight Sweetheart reminder created', {
    alertToken: response?.alertToken || null,
    dayCode: dayCode || 'DAILY',
    time,
  });

  return response;
}

async function setDailySchedule(handlerInput, time) {
  const timeZoneId = await getDeviceTimeZone(handlerInput);
  const firstName = await getOptionalCustomerFirstName(handlerInput);
  const schedules = await listSkillSchedules(handlerInput);

  await deleteReminders(handlerInput, schedules);
  await createBedtimeReminder(handlerInput, {
    firstName,
    time,
    timeZoneId,
  });

  console.log('Goodnight Sweetheart daily schedule updated', {
    deletedCount: schedules.length,
    hasFirstName: Boolean(firstName),
    time,
    timeZoneId,
  });

  return {
    deletedCount: schedules.length,
    removedDaily: schedules.some((schedule) => schedule.kind === 'DAILY'),
  };
}

async function setDaySchedule(handlerInput, dayCode, time) {
  const timeZoneId = await getDeviceTimeZone(handlerInput);
  const firstName = await getOptionalCustomerFirstName(handlerInput);
  const schedules = await listSkillSchedules(handlerInput);
  const remindersToDelete = schedules.filter(
    (schedule) => schedule.kind === 'DAILY' || (schedule.kind === 'WEEKLY' && schedule.dayCode === dayCode),
  );

  await deleteReminders(handlerInput, remindersToDelete);
  await createBedtimeReminder(handlerInput, {
    dayCode,
    firstName,
    time,
    timeZoneId,
  });

  console.log('Goodnight Sweetheart day schedule updated', {
    dayCode,
    deletedCount: remindersToDelete.length,
    hasFirstName: Boolean(firstName),
    time,
    timeZoneId,
  });

  return {
    deletedCount: remindersToDelete.length,
    removedDaily: remindersToDelete.some((schedule) => schedule.kind === 'DAILY'),
    dayName: normalizeDaySlot(dayCode)?.name || dayCode,
  };
}

async function setScheduleGroupSchedule(handlerInput, group, time) {
  if (group.code === 'DAILY') {
    const result = await setDailySchedule(handlerInput, time);
    return {
      ...result,
      createdCount: 1,
      groupCode: group.code,
      groupName: group.name,
    };
  }

  const timeZoneId = await getDeviceTimeZone(handlerInput);
  const firstName = await getOptionalCustomerFirstName(handlerInput);
  const schedules = await listSkillSchedules(handlerInput);
  const remindersToDelete = schedules.filter(
    (schedule) =>
      schedule.kind === 'DAILY' ||
      (schedule.kind === 'WEEKLY' && group.dayCodes.includes(schedule.dayCode)),
  );

  await deleteReminders(handlerInput, remindersToDelete);

  for (const dayCode of group.dayCodes) {
    await createBedtimeReminder(handlerInput, {
      dayCode,
      firstName,
      time,
      timeZoneId,
    });
  }

  console.log('Goodnight Sweetheart schedule group updated', {
    createdCount: group.dayCodes.length,
    deletedCount: remindersToDelete.length,
    groupCode: group.code,
    hasFirstName: Boolean(firstName),
    time,
    timeZoneId,
  });

  return {
    createdCount: group.dayCodes.length,
    deletedCount: remindersToDelete.length,
    groupCode: group.code,
    groupName: group.name,
    removedDaily: remindersToDelete.some((schedule) => schedule.kind === 'DAILY'),
  };
}

async function clearDaySchedule(handlerInput, dayCode) {
  const schedules = await listSkillSchedules(handlerInput);
  const dailySchedule = schedules.find((schedule) => schedule.kind === 'DAILY');

  if (dailySchedule) {
    return {
      blockedByDaily: true,
      cleared: false,
      dayName: normalizeDaySlot(dayCode)?.name || dayCode,
    };
  }

  const daySchedule = schedules.find((schedule) => schedule.kind === 'WEEKLY' && schedule.dayCode === dayCode);

  if (!daySchedule) {
    return {
      blockedByDaily: false,
      cleared: false,
      dayName: normalizeDaySlot(dayCode)?.name || dayCode,
    };
  }

  await deleteReminder(handlerInput, daySchedule.alertToken);

  return {
    blockedByDaily: false,
    cleared: true,
    dayName: daySchedule.dayName,
  };
}

async function clearAllSchedules(handlerInput) {
  const schedules = await listSkillSchedules(handlerInput);
  await deleteReminders(handlerInput, schedules);
  return {
    deletedCount: schedules.length,
  };
}

function remainingDayLines(schedules, excludedDayCodes) {
  return schedules
    .filter((schedule) => schedule.kind === 'WEEKLY' && !excludedDayCodes.has(schedule.dayCode))
    .map((schedule) => `${schedule.dayName} at ${timeForSpeech(schedule.time)}`);
}

function speechForSchedules(schedules) {
  if (!schedules.length) {
    return 'You do not have a Goodnight Sweetheart bedtime schedule yet.';
  }

  const dailySchedule = schedules.find((schedule) => schedule.kind === 'DAILY');

  if (dailySchedule) {
    return `Right now you have one every-day bedtime reminder set for ${timeForSpeech(dailySchedule.time)}.`;
  }

  const weeklySchedules = schedules.filter((schedule) => schedule.kind === 'WEEKLY');
  const weeklyByDay = new Map(weeklySchedules.map((schedule) => [schedule.dayCode, schedule]));
  const segments = [];
  const excludedDayCodes = new Set();

  const weekdayCodes = ['MO', 'TU', 'WE', 'TH', 'FR'];
  const weekdayTime = weeklyByDay.get('MO')?.time;

  if (weekdayTime && weekdayCodes.every((dayCode) => weeklyByDay.get(dayCode)?.time === weekdayTime)) {
    weekdayCodes.forEach((dayCode) => excludedDayCodes.add(dayCode));
    segments.push(`weekdays at ${timeForSpeech(weekdayTime)}`);
  }

  const weekendCodes = ['SA', 'SU'];
  const weekendTime = weeklyByDay.get('SA')?.time;

  if (weekendTime && weekendCodes.every((dayCode) => weeklyByDay.get(dayCode)?.time === weekendTime)) {
    weekendCodes.forEach((dayCode) => excludedDayCodes.add(dayCode));
    segments.push(`weekends at ${timeForSpeech(weekendTime)}`);
  }

  segments.push(...remainingDayLines(weeklySchedules, excludedDayCodes));

  return `Here is your bedtime schedule: ${segments.join(', ')}.`;
}

async function bedtimeForTonight(handlerInput) {
  const timeZoneId = await getDeviceTimeZone(handlerInput);
  const schedules = await listSkillSchedules(handlerInput);
  const dayCode = dayCodeForTimeZone(timeZoneId);
  const dayName = normalizeDaySlot(dayCode)?.name || 'tonight';
  const dailySchedule = schedules.find((schedule) => schedule.kind === 'DAILY');

  if (dailySchedule) {
    return {
      dayCode,
      dayName,
      hasSchedule: true,
      kind: 'DAILY',
      time: dailySchedule.time,
    };
  }

  const tonightSchedule = schedules.find((schedule) => schedule.kind === 'WEEKLY' && schedule.dayCode === dayCode);

  if (!tonightSchedule) {
    return {
      dayCode,
      dayName,
      hasSchedule: false,
    };
  }

  return {
    dayCode,
    dayName,
    hasSchedule: true,
    kind: 'WEEKLY',
    time: tonightSchedule.time,
  };
}

function requestPermissions(handlerInput, permissions, speech) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  delete sessionAttributes.pendingAction;
  delete sessionAttributes.directiveToken;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

  return handlerInput.responseBuilder
    .speak(speech)
    .withAskForPermissionsConsentCard([...new Set(permissions)])
    .getResponse();
}

function requestReminderPermissions(handlerInput, pendingAction) {
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  const directiveToken = `reminder-permission-${Date.now()}`;

  if (pendingAction) {
    sessionAttributes.pendingAction = pendingAction;
  }

  sessionAttributes.directiveToken = directiveToken;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

  console.log('Goodnight Sweetheart requesting reminder permission', {
    hasPendingAction: Boolean(pendingAction),
    pendingActionType: pendingAction?.type || null,
    directiveToken,
  });

  return handlerInput.responseBuilder
    .addDirective({
      type: 'Connections.SendRequest',
      name: 'AskFor',
      payload: {
        '@type': 'AskForPermissionsConsentRequest',
        '@version': '2',
        permissionScopes: [
          {
            permissionScope: REMINDER_PERMISSION,
          },
        ],
      },
      token: directiveToken,
    })
    .getResponse();
}

function requestBedtimeSetupPermissions(handlerInput) {
  return requestPermissions(
    handlerInput,
    [REMINDER_PERMISSION, PROFILE_GIVEN_NAME_PERMISSION],
    'I need permission to manage Alexa reminders and read your first name so I can personalize your goodnight message. I have sent a permission card to your Alexa app. After you grant access, come back and try again.',
  );
}

module.exports = {
  bedtimeForTonight,
  clearAllSchedules,
  clearDaySchedule,
  isPermissionError,
  isTimeZoneError,
  listSkillSchedules,
  normalizeDaySlot,
  normalizeTimeSlot,
  requestBedtimeSetupPermissions,
  requestReminderPermissions,
  setDailySchedule,
  setDaySchedule,
  setScheduleGroupSchedule,
  speechForSchedules,
  timeForSpeech,
};
