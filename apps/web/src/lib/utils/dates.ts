/**
 * Dates, in the house case. Everything rendered on the site is lowercase, and
 * `toLocaleDateString` writes "July 26, 2026" — the one title-case line a card
 * used to carry. One formatter, so a blog card, a post header and the
 * activity panel spell a date the same way.
 */

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

/**
 * "july 26, 2026". Parsed by hand from the ISO date rather than through
 * `new Date(iso)`, which shifts the day across midnight in any timezone west
 * of UTC; a full timestamp falls back to the Date's own local fields.
 */
export const formatDate = (iso: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match) {
    const [, year, month, day] = match;
    return `${MONTHS[Number(month) - 1]} ${Number(day)}, ${year}`;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
};

/**
 * "july 26" — the same date with its year taken off, for a card sitting under
 * a year break that has already said which year it is (see .year-break in
 * timeline.scss). The `datetime` attribute beside it still carries the whole
 * ISO date, so nothing a machine reads loses anything.
 */
export const formatMonthDay = (iso: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match) {
    const [, , month, day] = match;
    return `${MONTHS[Number(month) - 1]} ${Number(day)}`;
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return `${MONTHS[date.getMonth()]} ${date.getDate()}`;
};

/**
 * "2016" — the year alone, for the markers down the timeline's rail. Read off
 * the ISO string by the same hand-parse as above and for the same reason: a
 * January date put through `new Date` comes back as the year before it west of
 * UTC, which would print the wrong year at exactly the place the rail is
 * claiming one turned over.
 */
export const yearOf = (iso: string): string => {
  const match = /^(\d{4})/.exec(iso);
  if (match) return match[1];
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : String(date.getFullYear());
};

/** "3:05 pm" — the message timestamps in the chat. */
export const formatTime = (date: Date): string =>
  date
    .toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase();
