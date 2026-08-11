import { test, expect } from '@playwright/test';
import { trackCriticalErrors } from './consoleErrors';

test.describe('Homepage', () => {
  test('should load homepage successfully', async ({ page }) => {
    await page.goto('/');

    // Titles and headings are lowercase site-wide, so match case-insensitively
    // rather than encoding a capitalisation the site does not use.
    await expect(page).toHaveTitle(/alex nodeland/i);

    // Check for basic content
    await expect(
      page
        .getByText(/alex nodeland/i)
        .filter({ visible: true })
        .first()
    ).toBeVisible();
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');

    // Check meta description
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content');
  });

  test('should have working navigation', async ({ page }) => {
    await page.goto('/');

    // Check that navigation exists
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();

    // Check that main navigation links exist. There is no "home" link: the
    // brand is the way back, and it is deliberately not rendered on the
    // homepage itself, so asserting one here could never have passed.
    // Scoped to the nav and matched exactly: the page body also links to the
    // blog ("read the blog"), which an unscoped substring match collides with.
    await expect(
      nav.getByRole('link', { name: 'blog', exact: true })
    ).toBeVisible();
    await expect(
      nav.getByRole('link', { name: 'projects', exact: true })
    ).toBeVisible();
    await expect(
      nav.getByRole('link', { name: 'cv', exact: true })
    ).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Check that content is still visible
    await expect(
      page
        .getByText(/alex nodeland/i)
        .filter({ visible: true })
        .first()
    ).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('should load without critical JavaScript errors', async ({ page }) => {
    // The listener and its filter live in consoleErrors.ts, shared by every
    // page spec — four private copies of the filter is how they all drifted
    // stale together.
    const errors = trackCriticalErrors(page);

    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(errors).toHaveLength(0);
  });
});
