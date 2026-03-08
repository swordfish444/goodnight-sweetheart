const test = require('node:test');
const assert = require('node:assert/strict');

const { speechForSchedules } = require('../lib/reminders');

test('speechForSchedules groups matching weekdays and weekends', () => {
  const speech = speechForSchedules([
    { kind: 'WEEKLY', dayCode: 'MO', dayName: 'Monday', time: '22:00:00' },
    { kind: 'WEEKLY', dayCode: 'TU', dayName: 'Tuesday', time: '22:00:00' },
    { kind: 'WEEKLY', dayCode: 'WE', dayName: 'Wednesday', time: '22:00:00' },
    { kind: 'WEEKLY', dayCode: 'TH', dayName: 'Thursday', time: '22:00:00' },
    { kind: 'WEEKLY', dayCode: 'FR', dayName: 'Friday', time: '22:00:00' },
    { kind: 'WEEKLY', dayCode: 'SA', dayName: 'Saturday', time: '23:00:00' },
    { kind: 'WEEKLY', dayCode: 'SU', dayName: 'Sunday', time: '23:00:00' },
  ]);

  assert.equal(speech, 'Here is your bedtime schedule: weekdays at 10:00 PM, weekends at 11:00 PM.');
});
