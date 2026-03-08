const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildPrompt,
  generateBedtimeMessage,
  personalizeBedtimeMessage,
  trimToReminderLimits,
} = require('../lib/ai');

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

test('personalizeBedtimeMessage adds the customer first name when needed', () => {
  const personalized = personalizeBedtimeMessage('You are worthy of rest. Let the day go softly.', 'Skylar', {
    maxCharacters: 130,
    maxSentences: 5,
  });

  assert.equal(personalized, 'Goodnight Skylar. You are worthy of rest. Let the day go softly.');
});

test('buildPrompt requires the provided first name in the opening sentence', () => {
  const prompt = buildPrompt({
    dayName: 'Monday',
    firstName: 'Skylar',
    maxCharacters: 260,
    time: '22:00:00',
  });

  assert.match(prompt, /Start the first sentence with "Goodnight Skylar\."/);
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
    firstName: 'Skylar',
    time: '22:00:00',
  });

  assert.equal(
    message,
    'Goodnight Skylar. Tonight is your chance to breathe. You are worthy of rest. Let your heart feel grateful. Sleep gently.',
  );
});
