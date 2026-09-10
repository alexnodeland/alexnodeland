/**
 * What every keyboard-shortcut handler on the site checks before it acts, so
 * the three of them (the backgrounds, the chat, the shortcuts list) cannot
 * disagree about when a key is a command.
 */

/**
 * A key typed into something that takes text is text, not a command. Inputs,
 * textareas, selects and anything contenteditable.
 */
export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
};

/**
 * A key with a modifier held is the browser's or the system's, never ours:
 * ⌘C copies, ⌘S saves, Ctrl+H opens history. A shortcut that fired on those
 * used to open the chat on every copy.
 */
export const hasModifier = (event: KeyboardEvent): boolean =>
  event.metaKey || event.ctrlKey || event.altKey;

/**
 * Whether a keydown should be treated as one of the site's single-key
 * shortcuts: unmodified, not typed into a field, and not already handled by
 * something closer to the user.
 */
export const isShortcutKey = (event: KeyboardEvent): boolean =>
  !event.defaultPrevented &&
  !hasModifier(event) &&
  !isTypingTarget(event.target);
