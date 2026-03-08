const test = require('node:test');
const assert = require('node:assert/strict');

const { generateBedtimeMessage, trimToReminderLimits } = require('../lib/ai');

test('trimToReminderLimits keeps short reminder copy concise', () => {
  const trimmed = trimToReminderLimits(
    'Goodnight Sweetheart. You are deeply loved tonight. Let the day go softly. Rest in gratitude. Tomorrow can wait.',
    {
      maxCharacters: 130,
      maxSentences: 4,
    },
  );

  assert.equal(trimmed, 'You are deeply loved tonight. Let the day go softly. Rest in gratitude.');
});

test('generateBedtimeMessage falls back when no OpenRouter token is configured', async () => {
  const message = await generateBedtimeMessage({
    apiToken: '',
    fallback: () => 'Fallback bedtime message.',
    time: '22:00:00',
  });

  assert.equal(message, 'Fallback bedtime message.');
});

test('generateBedtimeMessage trims OpenRouter output to reminder-safe copy', async () => {
  const message = await generateBedtimeMessage({
    apiToken: 'token',
    fallback: () => 'Fallback bedtime message.',
    fetchImpl: async () => ({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content:
                'Goodnight Sweetheart. Tonight is your chance to breathe. You are worthy of rest. Let your heart feel grateful. Sleep gently.',
            },
          },
        ],
      }),
    }),
    maxCharacters: 130,
    time: '22:00:00',
  });

  assert.equal(message, 'Tonight is your chance to breathe. You are worthy of rest. Let your heart feel grateful.');
});
