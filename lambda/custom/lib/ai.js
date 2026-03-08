const { timeForSpeech } = require('./schedule');

const DEFAULT_MODEL = 'moonshotai/kimi-k2.5';
const DEFAULT_MAX_CHARACTERS = 260;
const DEFAULT_MAX_SENTENCES = 5;

function normalizeWhitespace(value) {
  return String(value || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function sentenceListFromText(text) {
  const normalized = normalizeWhitespace(text);

  if (!normalized) {
    return [];
  }

  return (normalized.match(/[^.!?]+[.!?]["']?|.+$/g) || [])
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function ensureSentenceEnding(sentence) {
  return /[.!?]["']?$/.test(sentence) ? sentence : `${sentence}.`;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function stripSkillNameLead(text) {
  return normalizeWhitespace(text).replace(/^goodnight sweetheart[.!?,:\s-]*/i, '');
}

function trimToReminderLimits(
  text,
  {
    maxCharacters = DEFAULT_MAX_CHARACTERS,
    maxSentences = DEFAULT_MAX_SENTENCES,
  } = {},
) {
  const sentences = sentenceListFromText(text)
    .map((sentence) => ensureSentenceEnding(sentence))
    .slice(0, maxSentences);

  const selected = [];

  for (const sentence of sentences) {
    const candidate = normalizeWhitespace([...selected, sentence].join(' '));

    if (!selected.length || candidate.length <= maxCharacters) {
      selected.push(sentence);
      continue;
    }

    break;
  }

  return normalizeWhitespace(selected.join(' ')).replace(/^Goodnight Sweetheart\.\s*/i, '');
}

function personalizeBedtimeMessage(
  text,
  firstName,
  {
    maxCharacters = DEFAULT_MAX_CHARACTERS,
    maxSentences = DEFAULT_MAX_SENTENCES,
  } = {},
) {
  const normalizedName = String(firstName || '').trim();
  const cleaned = stripSkillNameLead(text);

  if (!normalizedName) {
    return trimToReminderLimits(cleaned, {
      maxCharacters,
      maxSentences,
    });
  }

  const namePattern = new RegExp(`\\b${escapeRegExp(normalizedName)}\\b`, 'i');
  const personalized = namePattern.test(cleaned) ? cleaned : `Goodnight ${normalizedName}. ${cleaned}`;

  return trimToReminderLimits(personalized, {
    maxCharacters,
    maxSentences,
  });
}

function extractMessageContent(payload) {
  const content = payload?.choices?.[0]?.message?.content;

  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === 'string') {
          return part;
        }

        if (part?.type === 'text' && typeof part.text === 'string') {
          return part.text;
        }

        return '';
      })
      .join(' ');
  }

  return '';
}

function buildPrompt({ dayName, firstName, time, maxCharacters }) {
  const spokenTime = time ? timeForSpeech(time) : 'bedtime';
  const context = dayName ? `for ${dayName}` : 'for tonight';
  const personalizationInstruction = firstName
    ? `Start the first sentence with "Goodnight ${firstName}." and use that first name only once.`
    : 'Do not use names or placeholders.';

  return [
    'Write one original bedtime reminder for an Alexa skill.',
    'It should feel warm, affectionate, grounding, and grateful.',
    `Keep it under ${maxCharacters} characters total.`,
    'Use 2 to 5 short sentences.',
    'Do not use emojis, markdown, bullet points, or quotes.',
    personalizationInstruction,
    'Avoid medical claims, therapy language, or references to AI.',
    `This reminder will be heard on a shared Alexa device ${context} at ${spokenTime}.`,
  ].join(' ');
}

async function requestOpenRouterMessage({
  apiToken,
  fetchImpl = fetch,
  maxCharacters = DEFAULT_MAX_CHARACTERS,
  model = process.env.OPENROUTER_MODEL || DEFAULT_MODEL,
  dayName,
  firstName,
  time,
}) {
  if (!apiToken) {
    return null;
  }

  const response = await fetchImpl('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiToken}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://github.com/swordfish444/goodnight-sweetheart',
      'X-Title': 'Goodnight Sweetheart',
    },
    body: JSON.stringify({
      model,
      temperature: 0.9,
      max_tokens: 160,
      reasoning: {
        effort: 'none',
        exclude: true,
      },
      messages: [
        {
          role: 'system',
          content:
            'You write concise bedtime reminder copy for Alexa skills. Keep it safe, gentle, and natural to hear aloud.',
        },
        {
          role: 'user',
          content: buildPrompt({
            dayName,
            firstName,
            time,
            maxCharacters,
          }),
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`OPENROUTER_ERROR ${response.status} ${body}`.trim());
  }

  const payload = await response.json();
  return trimToReminderLimits(extractMessageContent(payload), {
    maxCharacters,
    maxSentences: Number(process.env.AI_MESSAGE_MAX_SENTENCES || DEFAULT_MAX_SENTENCES),
  });
}

async function generateBedtimeMessage({
  apiToken = process.env.OPENROUTER_TOKEN,
  fallback,
  fetchImpl = fetch,
  dayName,
  firstName,
  time,
  maxCharacters = Number(process.env.AI_MESSAGE_MAX_CHARACTERS || DEFAULT_MAX_CHARACTERS),
} = {}) {
  const fallbackMessage = typeof fallback === 'function' ? fallback() : fallback;

  if (!apiToken) {
    return fallbackMessage;
  }

  try {
    const generated = await requestOpenRouterMessage({
      apiToken,
      dayName,
      fetchImpl,
      firstName,
      maxCharacters,
      time,
    });

    return personalizeBedtimeMessage(generated || fallbackMessage, firstName, {
      maxCharacters,
      maxSentences: Number(process.env.AI_MESSAGE_MAX_SENTENCES || DEFAULT_MAX_SENTENCES),
    });
  } catch (error) {
    console.error('Goodnight Sweetheart AI generation failed', error);
    return personalizeBedtimeMessage(fallbackMessage, firstName, {
      maxCharacters,
      maxSentences: Number(process.env.AI_MESSAGE_MAX_SENTENCES || DEFAULT_MAX_SENTENCES),
    });
  }
}

module.exports = {
  DEFAULT_MAX_CHARACTERS,
  DEFAULT_MAX_SENTENCES,
  DEFAULT_MODEL,
  buildPrompt,
  extractMessageContent,
  generateBedtimeMessage,
  personalizeBedtimeMessage,
  trimToReminderLimits,
};
