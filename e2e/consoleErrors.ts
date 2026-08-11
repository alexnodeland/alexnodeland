import type { Page } from '@playwright/test';

/**
 * Collects the console errors a visitor would actually be hurt by.
 *
 * Every page spec asserts "no critical JavaScript errors", and each used to
 * carry its own copy of the listener and filter — which is how they all
 * drifted out of date together. The one filter that matters lives here:
 *
 * - `dev-404-page`: `gatsby develop` prefetches page-data for its own 404
 *   page, and the request 404s by design on every page load. The message
 *   text is just "Failed to load resource…" — the tell is in the resource
 *   URL, which only `msg.location()` sees.
 * - Warnings and NO_COLOR chatter are noise, not breakage.
 *
 * Call before `page.goto`, assert `toHaveLength(0)` after the page settles.
 */
export const trackCriticalErrors = (page: Page): string[] => {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() !== 'error') return;
    if ((msg.location()?.url ?? '').includes('dev-404-page')) return;
    const text = msg.text();
    if (!text) return;
    if (
      text.includes('Warning') ||
      text.includes('console.warn') ||
      text.includes('NO_COLOR') ||
      text.includes('dev-404-page')
    )
      return;
    errors.push(text);
  });
  return errors;
};
