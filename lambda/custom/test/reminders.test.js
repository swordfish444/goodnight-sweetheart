const test = require('node:test');
const assert = require('node:assert/strict');

const { setDailySchedule, speechForSchedules } = require('../lib/reminders');

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

test('setDailySchedule still creates a reminder when profile permission is unavailable', async () => {
  const originalToken = process.env.OPENROUTER_TOKEN;
  process.env.OPENROUTER_TOKEN = '';

  const createdRequests = [];
  const deletedTokens = [];
  const handlerInput = {
    requestEnvelope: {
      context: {
        System: {
          device: {
            deviceId: 'device-123',
          },
        },
      },
    },
    serviceClientFactory: {
      getUpsServiceClient() {
        return {
          async getSystemTimeZone() {
            return 'America/Los_Angeles';
          },
          async getProfileGivenName() {
            const error = new Error('forbidden');
            error.statusCode = 403;
            throw error;
          },
        };
      },
      getReminderManagementServiceClient() {
        return {
          async getReminders() {
            return {
              alerts: [
                {
                  alertToken: 'old-token',
                  trigger: {
                    recurrence: {
                      recurrenceRules: ['FREQ=DAILY;BYHOUR=21;BYMINUTE=0;BYSECOND=0;INTERVAL=1'],
                    },
                  },
                  alertInfo: {
                    spokenInfo: {
                      content: [
                        {
                          locale: 'en-US',
                          text: 'Goodnight Sweetheart. Previous bedtime reminder.',
                        },
                      ],
                    },
                  },
                },
              ],
            };
          },
          async deleteReminder(alertToken) {
            deletedTokens.push(alertToken);
          },
          async createReminder(request) {
            createdRequests.push(request);
            return {
              alertToken: 'new-token',
            };
          },
        };
      },
    },
  };

  try {
    const result = await setDailySchedule(handlerInput, '22:00:00');

    assert.deepEqual(result, {
      deletedCount: 1,
      removedDaily: true,
    });
    assert.deepEqual(deletedTokens, ['old-token']);
    assert.equal(createdRequests.length, 1);
    assert.equal(createdRequests[0].alertInfo.spokenInfo.content[0].locale, 'en-US');
    assert.match(createdRequests[0].alertInfo.spokenInfo.content[0].text, /^Goodnight Sweetheart\./);
  } finally {
    if (originalToken === undefined) {
      delete process.env.OPENROUTER_TOKEN;
    } else {
      process.env.OPENROUTER_TOKEN = originalToken;
    }
  }
});
