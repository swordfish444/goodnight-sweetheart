const REMINDER_PERMISSION = 'alexa::alerts:reminders:skill:readwrite';
const SKILL_PREFIX = 'Goodnight Sweetheart.';

const DAY_DEFINITIONS = [
  { code: 'MO', slot: 'MONDAY', name: 'Monday', dayOfWeek: 1 },
  { code: 'TU', slot: 'TUESDAY', name: 'Tuesday', dayOfWeek: 2 },
  { code: 'WE', slot: 'WEDNESDAY', name: 'Wednesday', dayOfWeek: 3 },
  { code: 'TH', slot: 'THURSDAY', name: 'Thursday', dayOfWeek: 4 },
  { code: 'FR', slot: 'FRIDAY', name: 'Friday', dayOfWeek: 5 },
  { code: 'SA', slot: 'SATURDAY', name: 'Saturday', dayOfWeek: 6 },
  { code: 'SU', slot: 'SUNDAY', name: 'Sunday', dayOfWeek: 7 },
];

const DAY_BY_SLOT = new Map(
  DAY_DEFINITIONS.flatMap((definition) => [
    [definition.slot, definition],
    [definition.name.toUpperCase(), definition],
    [definition.code, definition],
  ]),
);

const DAY_BY_CODE = new Map(DAY_DEFINITIONS.map((definition) => [definition.code, definition]));

const SCHEDULE_GROUP_DEFINITIONS = [
  {
    code: 'DAILY',
    name: 'every day',
    dayCodes: DAY_DEFINITIONS.map((definition) => definition.code),
    aliases: ['EVERY DAY', 'EVERYDAY', 'DAILY', 'EVERY NIGHT', 'ALL WEEK'],
  },
  {
    code: 'WEEKDAYS',
    name: 'weekdays',
    dayCodes: ['MO', 'TU', 'WE', 'TH', 'FR'],
    aliases: ['WEEKDAYS', 'WEEKDAY', 'WORK WEEK', 'WORKWEEK', 'WEEKNIGHTS', 'WEEK NIGHTS'],
  },
  {
    code: 'WEEKENDS',
    name: 'weekends',
    dayCodes: ['SA', 'SU'],
    aliases: ['WEEKENDS', 'WEEKEND'],
  },
];

const SCHEDULE_GROUP_BY_SLOT = new Map(
  SCHEDULE_GROUP_DEFINITIONS.flatMap((definition) => [
    [definition.code, definition],
    ...definition.aliases.map((alias) => [alias, definition]),
  ]),
);

module.exports = {
  DAY_BY_CODE,
  DAY_BY_SLOT,
  DAY_DEFINITIONS,
  REMINDER_PERMISSION,
  SCHEDULE_GROUP_BY_SLOT,
  SCHEDULE_GROUP_DEFINITIONS,
  SKILL_PREFIX,
};
