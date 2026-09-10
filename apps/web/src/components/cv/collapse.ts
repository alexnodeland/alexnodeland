import React from 'react';

/**
 * The whole card is the toggle. The <summary> opens and closes it natively;
 * this closes it from a click on the body it opened, so the reader does not
 * have to travel back up to the title to put it away. A click on a link or
 * control inside the body is that thing's, and a click that ends a text
 * selection is the selection's.
 */
export const closeFromBody = (event: React.MouseEvent<HTMLElement>): void => {
  const target = event.target as HTMLElement | null;
  if (target?.closest('a, button, input, select, textarea, summary')) return;
  if (window.getSelection?.()?.toString()) return;
  const details = event.currentTarget.closest('details');
  if (details) details.open = false;
};
