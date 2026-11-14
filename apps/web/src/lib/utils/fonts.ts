/**
 * The typeface, for the two places that set type without the stylesheet: the
 * canvas the 404's number is drawn on, and anything that has to wait for a
 * cut of the face before it can draw at all.
 *
 * Text in the document needs none of this — it is on screen in the fallback
 * and re-set when the face lands (`font-display: swap`, see
 * src/styles/fonts.scss). A canvas is different: what it draws, it draws
 * once, in whatever is loaded at that moment, and it is never re-set.
 */

/** The family as the stylesheet declares it. */
export const FONT_FAMILY = 'JetBrains Mono';

/**
 * The heavier of the system's two weights (`strong` in global.scss), and the
 * one the 404's number is set in.
 */
export const FONT_WEIGHT_STRONG = 600;

// A font that has not arrived by now is not going to make the difference
// between a good 404 and a bad one; the number is drawn in the fallback.
const FONT_WAIT_MS = 800;

/**
 * Run `callback` once `text` can be drawn in the given cut of the face — at
 * once, synchronously, when it already can (or where the browser has no way
 * to say), and otherwise as soon as the file lands or the wait runs out.
 * Returns a way to call it off.
 */
export const whenFontReady = (
  weight: number,
  text: string,
  callback: () => void
): (() => void) => {
  const font = `${weight} 1em '${FONT_FAMILY}'`;
  const fonts = typeof document === 'undefined' ? undefined : document.fonts;
  let ready = true;
  try {
    ready = !fonts || fonts.check(font, text);
  } catch {
    // A browser that cannot parse the query cannot be waited on either.
  }
  if (ready || !fonts) {
    callback();
    return () => {};
  }

  let live = true;
  const finish = () => {
    if (!live) return;
    live = false;
    window.clearTimeout(timer);
    callback();
  };
  const timer = window.setTimeout(finish, FONT_WAIT_MS);
  fonts.load(font, text).then(finish, finish);
  return () => {
    live = false;
    window.clearTimeout(timer);
  };
};
