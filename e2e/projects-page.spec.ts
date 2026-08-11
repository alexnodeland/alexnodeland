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

    const projectLinks = page.locator('a.project-card');
    await expect(projectLinks.first()).toBeVisible();

    const firstLink = projectLinks.first();
    await expect(firstLink).toHaveAttribute('target', '_blank');
    await expect(firstLink).toHaveAttribute('rel', 'noopener noreferrer');
    await expect(firstLink).toHaveAttribute('href', /^https:\/\/github\.com\//);
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
