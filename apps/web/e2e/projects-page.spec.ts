import { test, expect } from '@playwright/test';
import { trackCriticalErrors } from './consoleErrors';

test.describe('Projects Page', () => {
  test('should load projects page successfully', async ({ page }) => {
    await page.goto('/projects');

    // Check that the page loads
    await expect(page).toHaveTitle(/projects/i);
  });

  test('should display basic content', async ({ page }) => {
    await page.goto('/projects');

    // Check that the header is visible
    await expect(
      page.getByRole('heading', { level: 1, name: 'projects' })
    ).toBeVisible();

    // Check that navigation exists
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
  });

  test('should display at least one project card with a valid external link', async ({
    page,
  }) => {
    await page.goto('/projects');

    // The card is a box with its ways out at the foot: the octocat to the
    // repo, and the chain to the project's own site where there is one.
    const cards = page.locator('article.project-card');
    await expect(cards.first()).toBeVisible();

    const firstRepo = cards.first().locator('.project-out-repo');
    await expect(firstRepo).toHaveAttribute('target', '_blank');
    await expect(firstRepo).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(firstRepo).toHaveAttribute('href', /^https:\/\/github\.com\//);

    // Whichever mark the card as a whole follows covers the whole card, so a
    // click on the body of it lands on that link rather than on nothing.
    const covered = await cards.first().evaluate(card => {
      const link = card.querySelector('.is-card-link') as HTMLElement;
      const box = card.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2
      );
      return { href: link.getAttribute('href'), covers: link.contains(hit) };
    });
    expect(covered.covers).toBe(true);
    expect(covered.href).toMatch(/^https:\/\//);
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/projects');

    // Check meta description exists
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content');
  });

  test('should load without critical JavaScript errors', async ({ page }) => {
    // The listener and its filter live in consoleErrors.ts, shared by every
    // page spec — four private copies of the filter is how they all drifted
    // stale together.
    const errors = trackCriticalErrors(page);

    await page.goto('/projects');

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(errors).toHaveLength(0);
  });
});
