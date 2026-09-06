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

/** "3:05 pm" — the message timestamps in the chat. */
export const formatTime = (date: Date): string =>
  date
    .toLocaleTimeString([], {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase();
