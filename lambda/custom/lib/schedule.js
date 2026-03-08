const { Temporal } = require('@js-temporal/polyfill');

const { DAY_BY_CODE, DAY_BY_SLOT, SCHEDULE_GROUP_BY_SLOT } = require('./constants');

function pad(value) {
  return String(value).padStart(2, '0');
}

function normalizeTimeSlot(slotValue) {
  if (!slotValue || typeof slotValue !== 'string') {
    return null;
  }

  const trimmed = slotValue.trim();

  if (/^\d{2}:\d{2}$/.test(trimmed)) {
    return `${trimmed}:00`;
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

function normalizeDaySlot(slotValue) {
  if (!slotValue || typeof slotValue !== 'string') {
    return null;
  }

  return DAY_BY_SLOT.get(slotValue.trim().toUpperCase()) || null;
}

function normalizeScheduleGroup(slotValue) {
  if (!slotValue || typeof slotValue !== 'string') {
    return null;
  }

  return SCHEDULE_GROUP_BY_SLOT.get(slotValue.trim().toUpperCase()) || null;
}

function timeForSpeech(timeValue) {
  const normalizedTime = normalizeTimeSlot(timeValue);

  if (!normalizedTime) {
    return timeValue;
  }

  const [hour, minute, second] = normalizedTime.split(':').map(Number);
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    timeZone: 'UTC',
  });

  return formatter.format(new Date(Date.UTC(2024, 0, 1, hour, minute, second || 0)));
}

function recurrenceRuleForDaily(timeValue) {
  const [hour, minute, second] = normalizeTimeSlot(timeValue).split(':').map(Number);
  return `FREQ=DAILY;BYHOUR=${hour};BYMINUTE=${minute};BYSECOND=${second};INTERVAL=1`;
}

function recurrenceRuleForDay(dayCode, timeValue) {
  const [hour, minute, second] = normalizeTimeSlot(timeValue).split(':').map(Number);
  return `FREQ=WEEKLY;BYDAY=${dayCode};BYHOUR=${hour};BYMINUTE=${minute};BYSECOND=${second};INTERVAL=1`;
}

function parseRecurrenceRule(rule) {
  const values = Object.fromEntries(
    rule.split(';').map((segment) => {
      const [key, value] = segment.split('=');
      return [key, value];
    }),
  );

  const time = `${pad(values.BYHOUR || 0)}:${pad(values.BYMINUTE || 0)}:${pad(values.BYSECOND || 0)}`;

  if (values.FREQ === 'DAILY') {
    return {
      kind: 'DAILY',
      time,
    };
  }

  if (values.FREQ === 'WEEKLY' && values.BYDAY) {
    const day = DAY_BY_CODE.get(values.BYDAY);
    return {
      kind: 'WEEKLY',
      time,
      dayCode: values.BYDAY,
      dayName: day ? day.name : values.BYDAY,
    };
  }

  return {
    kind: 'UNKNOWN',
    time,
  };
}

function nextScheduledTime({ dayCode, time, timeZoneId }) {
  const normalizedTime = normalizeTimeSlot(time);

  if (!normalizedTime) {
    return null;
  }

  const [hour, minute, second] = normalizedTime.split(':').map(Number);
  const now = Temporal.Now.zonedDateTimeISO(timeZoneId);
  let candidate = now.with({
    hour,
    minute,
    second,
    millisecond: 0,
    microsecond: 0,
    nanosecond: 0,
  });

  if (dayCode) {
    const targetDay = DAY_BY_CODE.get(dayCode)?.dayOfWeek;

    if (!targetDay) {
      return null;
    }

    const difference = (targetDay - now.dayOfWeek + 7) % 7;
    candidate = now.add({ days: difference }).with({
      hour,
      minute,
      second,
      millisecond: 0,
      microsecond: 0,
      nanosecond: 0,
    });

    if (Temporal.ZonedDateTime.compare(candidate, now) <= 0) {
      candidate = candidate.add({ days: 7 });
    }
  } else if (Temporal.ZonedDateTime.compare(candidate, now) <= 0) {
    candidate = candidate.add({ days: 1 });
  }

  return `${candidate.year}-${pad(candidate.month)}-${pad(candidate.day)}T${pad(candidate.hour)}:${pad(
    candidate.minute,
  )}:${pad(candidate.second)}.000`;
}

function dayCodeForTimeZone(timeZoneId) {
  const now = Temporal.Now.zonedDateTimeISO(timeZoneId);
  const currentDay = Array.from(DAY_BY_CODE.values()).find((definition) => definition.dayOfWeek === now.dayOfWeek);
  return currentDay?.code || null;
}

module.exports = {
  dayCodeForTimeZone,
  nextScheduledTime,
  normalizeDaySlot,
  normalizeScheduleGroup,
  normalizeTimeSlot,
  parseRecurrenceRule,
  recurrenceRuleForDaily,
  recurrenceRuleForDay,
  timeForSpeech,
};
