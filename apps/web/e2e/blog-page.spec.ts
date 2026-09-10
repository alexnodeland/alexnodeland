import { test, expect } from '@playwright/test';
import { trackCriticalErrors } from './consoleErrors';

test.describe('Blog Page', () => {
  test('should load blog page successfully', async ({ page }) => {
    await page.goto('/blog');

    // Check that the page loads
    await expect(page).toHaveTitle(/blog/i);
  });

  test('should display basic content', async ({ page }) => {
    await page.goto('/blog');

    // Check that basic blog content is visible
    await expect(page.getByText(/blog/i).first()).toBeVisible();

    // Check that navigation exists
    const nav = page.getByRole('navigation');
    await expect(nav).toBeVisible();
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/blog');

    // Check meta description exists
    const metaDescription = page.locator('meta[name="description"]');
    await expect(metaDescription).toHaveAttribute('content');
  });

  test('should load without critical JavaScript errors', async ({ page }) => {
    // The listener and its filter live in consoleErrors.ts, shared by every
    // page spec — four private copies of the filter is how they all drifted
    // stale together.
    const errors = trackCriticalErrors(page);

    await page.goto('/blog');

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(errors).toHaveLength(0);
  });
});
