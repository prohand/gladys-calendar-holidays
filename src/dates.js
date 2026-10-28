// -----------------------------------------------------------------------------
// Calendar dates as 'YYYY-MM-DD' strings. A holiday is a day of the calendar,
// not an instant: every computation works on these strings, and an instant is
// only turned into a date once, in the time zone of Gladys (TZ, injected by
// the supervisor). Arithmetic runs on UTC midnights, where no day lasts 23 or
// 25 hours.
// -----------------------------------------------------------------------------

const DAY_MS = 24 * 60 * 60 * 1000;
const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * The time zone of Gladys: TZ, set by the supervisor. Read and checked here
 * rather than trusted to the system (the Alpine image has no tzdata; Node's
 * ICU carries its own zones): an unusable value falls back to the process one.
 */
export function processTimeZone(env = process.env.TZ) {
  if (env) {
    try {
      return new Intl.DateTimeFormat('en', { timeZone: env }).resolvedOptions().timeZone;
    } catch {
      // Not an IANA name (':/etc/localtime'…): fall through.
    }
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

const partFormatters = new Map();

/**
 * The calendar date, hour and minute of an instant in a time zone.
 * @param {number|Date} instant
 * @param {string} timeZone IANA name
 * @returns {{ date: string, hour: number, minute: number }}
 */
export function localSlot(instant, timeZone) {
  let formatter = partFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    });
    partFormatters.set(timeZone, formatter);
  }
  const parts = Object.fromEntries(
    formatter.formatToParts(new Date(instant)).map(({ type, value }) => [type, value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
  };
}

/** True for a real calendar date written 'YYYY-MM-DD' (no 2026-02-30). */
export function isDate(value) {
  const match = DATE_PATTERN.exec(value ?? '');
  if (!match) {
    return false;
  }
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

function toUtc(date) {
  return Date.parse(`${date}T00:00:00Z`);
}

function fromUtc(ms) {
  return new Date(ms).toISOString().slice(0, 10);
}

/** The date `days` days after `date` (before it when negative). */
export function addDays(date, days) {
  return fromUtc(toUtc(date) + days * DAY_MS);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from, to) {
  return Math.round((toUtc(to) - toUtc(from)) / DAY_MS);
}

/** Day of the week, 0 = Sunday … 6 = Saturday. */
export function weekday(date) {
  return new Date(toUtc(date)).getUTCDay();
}

const dateFormatters = new Map();

/**
 * A date written for people, in a language: 'long' → "Monday 4 January 2027",
 * 'short' → "Mon 4 Jan". Formatted at UTC, where the string's day lives.
 */
export function formatDate(date, language, style = 'long') {
  const key = `${language}:${style}`;
  let formatter = dateFormatters.get(key);
  if (!formatter) {
    const options =
      style === 'long'
        ? { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }
        : { weekday: 'short', day: 'numeric', month: 'short' };
    formatter = new Intl.DateTimeFormat(language, { ...options, timeZone: 'UTC' });
    dateFormatters.set(key, formatter);
  }
  return formatter.format(new Date(toUtc(date)));
}

/**
 * The instant (ISO, UTC) of the midnight that starts a date in a time zone:
 * the bounds of the windows of events sent to Gladys, which stores a full-day
 * event at the midnights of its time zone.
 */
export function zonedMidnight(date, timeZone) {
  const target = toUtc(date);
  let instant = target;
  // Two passes: the offset found at the first guess can differ by an hour
  // from the offset at midnight on a daylight saving time change.
  for (let pass = 0; pass < 2; pass += 1) {
    const slot = localSlot(instant, timeZone);
    const wall = toUtc(slot.date) + slot.hour * 3_600_000 + slot.minute * 60_000;
    instant -= wall - target;
  }
  return new Date(instant).toISOString();
}
