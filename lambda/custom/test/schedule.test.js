const test = require('node:test');
const assert = require('node:assert/strict');

const {
  nextScheduledTime,
  normalizeDaySlot,
  normalizeScheduleGroup,
  normalizeTimeSlot,
  parseRecurrenceRule,
  recurrenceRuleForDaily,
  recurrenceRuleForDay,
  timeForSpeech,
} = require('../lib/schedule');

test('normalizeTimeSlot keeps Alexa time values in HH:MM:SS form', () => {
  assert.equal(normalizeTimeSlot('22:15'), '22:15:00');
  assert.equal(normalizeTimeSlot('06:45:30'), '06:45:30');
  assert.equal(normalizeTimeSlot('TONIGHT'), null);
});

test('normalizeDaySlot accepts Alexa day values', () => {
  assert.deepEqual(normalizeDaySlot('MONDAY'), {
    code: 'MO',
    dayOfWeek: 1,
    name: 'Monday',
    slot: 'MONDAY',
  });
});

test('normalizeScheduleGroup accepts weekday slot values and aliases', () => {
  assert.deepEqual(normalizeScheduleGroup('weekdays'), {
    aliases: [
      'WEEKDAYS',
      'WEEKDAY',
      'WORK WEEK',
      'WORKWEEK',
      'WEEKNIGHTS',
      'WEEK NIGHTS',
      'WORK NIGHTS',
      'WEEKDAY NIGHTS',
    ],
    code: 'WEEKDAYS',
    dayCodes: ['MO', 'TU', 'WE', 'TH', 'FR'],
    name: 'weekdays',
  });
  assert.equal(normalizeScheduleGroup('all week')?.code, 'DAILY');
  assert.equal(normalizeScheduleGroup('nightly')?.code, 'DAILY');
  assert.equal(normalizeScheduleGroup('weekday nights')?.code, 'WEEKDAYS');
  assert.equal(normalizeScheduleGroup('weekend nights')?.code, 'WEEKENDS');
});

test('timeForSpeech converts normalized times into spoken values', () => {
  assert.equal(timeForSpeech('22:00:00'), '10:00 PM');
  assert.equal(timeForSpeech('06:30:00'), '6:30 AM');
});

test('daily recurrence rule carries the bedtime components', () => {
  assert.equal(
    recurrenceRuleForDaily('22:15:00'),
    'FREQ=DAILY;BYHOUR=22;BYMINUTE=15;BYSECOND=0;INTERVAL=1',
  );
});

test('weekly recurrence rule carries the weekday and bedtime components', () => {
  assert.equal(
    recurrenceRuleForDay('FR', '21:45:00'),
    'FREQ=WEEKLY;BYDAY=FR;BYHOUR=21;BYMINUTE=45;BYSECOND=0;INTERVAL=1',
  );
});

test('parseRecurrenceRule decodes daily rules', () => {
  assert.deepEqual(
    parseRecurrenceRule('FREQ=DAILY;BYHOUR=22;BYMINUTE=15;BYSECOND=0;INTERVAL=1'),
    {
      kind: 'DAILY',
      time: '22:15:00',
    },
  );
});

test('parseRecurrenceRule decodes weekly rules', () => {
  assert.deepEqual(
    parseRecurrenceRule('FREQ=WEEKLY;BYDAY=FR;BYHOUR=21;BYMINUTE=45;BYSECOND=0;INTERVAL=1'),
    {
      dayCode: 'FR',
      dayName: 'Friday',
      kind: 'WEEKLY',
      time: '21:45:00',
    },
  );
});

test('nextScheduledTime returns an Alexa-style timestamp string', () => {
  const scheduledTime = nextScheduledTime({
    time: '22:00:00',
    timeZoneId: 'America/Los_Angeles',
  });

  assert.match(scheduledTime, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.000$/);
});
