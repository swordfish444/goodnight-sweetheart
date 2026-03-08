const { REMINDER_PERMISSION, SKILL_PREFIX } = require('./constants');
const { randomMessage } = require('./messages');
const {
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
  return alerts.filter(isSkillReminder);
}

async function listSkillSchedules(handlerInput) {
  const reminders = await listSkillReminders(handlerInput);

  return reminders
    .map(scheduleFromReminder)
    .filter(Boolean)
    .sort((left, right) => {
      if (left.kind === 'DAILY') {
        return -1;
      }

      if (right.kind === 'DAILY') {
        return 1;
      }

      return normalizeDaySlot(left.dayCode).dayOfWeek - normalizeDaySlot(right.dayCode).dayOfWeek;
    });
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

async function setDailySchedule(handlerInput, time) {
  const timeZoneId = await getDeviceTimeZone(handlerInput);
  const schedules = await listSkillSchedules(handlerInput);

  await deleteReminders(handlerInput, schedules);

  await createReminder(
    handlerInput,
    reminderRequest({
      message: randomMessage(),
      time,
      timeZoneId,
    }),
  );

  return {
    deletedCount: schedules.length,
  };
}

async function setDaySchedule(handlerInput, dayCode, time) {
  const timeZoneId = await getDeviceTimeZone(handlerInput);
  const schedules = await listSkillSchedules(handlerInput);
  const remindersToDelete = schedules.filter(
    (schedule) => schedule.kind === 'DAILY' || (schedule.kind === 'WEEKLY' && schedule.dayCode === dayCode),
  );

  await deleteReminders(handlerInput, remindersToDelete);

  await createReminder(
    handlerInput,
    reminderRequest({
      dayCode,
      message: randomMessage(),
      time,
      timeZoneId,
    }),
  );

  return {
    removedDaily: remindersToDelete.some((schedule) => schedule.kind === 'DAILY'),
    dayName: normalizeDaySlot(dayCode)?.name || dayCode,
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

function speechForSchedules(schedules) {
  if (!schedules.length) {
    return 'You do not have a Goodnight Sweetheart bedtime schedule yet.';
  }

  const dailySchedule = schedules.find((schedule) => schedule.kind === 'DAILY');

  if (dailySchedule) {
    return `Right now you have one every-day bedtime reminder set for ${timeForSpeech(dailySchedule.time)}.`;
  }

  const dayLines = schedules
    .filter((schedule) => schedule.kind === 'WEEKLY')
    .map((schedule) => `${schedule.dayName} at ${timeForSpeech(schedule.time)}`);

  return `Here is your bedtime schedule: ${dayLines.join(', ')}.`;
}

function requestReminderPermissions(handlerInput, pendingAction) {
  const directiveToken = `goodnight-sweetheart-${Date.now()}`;
  const sessionAttributes = handlerInput.attributesManager.getSessionAttributes();
  sessionAttributes.pendingAction = pendingAction;
  sessionAttributes.directiveToken = directiveToken;
  handlerInput.attributesManager.setSessionAttributes(sessionAttributes);

  return handlerInput.responseBuilder
    .speak(
      'To manage bedtime reminders, I need permission to create Alexa reminders for you. Please review the next permission prompt.',
    )
    .addDirective({
      type: 'Connections.SendRequest',
      name: 'AskFor',
      payload: {
        '@type': 'AskForPermissionsConsentRequest',
        '@version': '1',
        permissionScope: REMINDER_PERMISSION,
      },
      token: directiveToken,
    })
    .getResponse();
}

module.exports = {
  clearAllSchedules,
  clearDaySchedule,
  isPermissionError,
  isTimeZoneError,
  listSkillSchedules,
  normalizeDaySlot,
  normalizeTimeSlot,
  requestReminderPermissions,
  setDailySchedule,
  setDaySchedule,
  speechForSchedules,
  timeForSpeech,
};
