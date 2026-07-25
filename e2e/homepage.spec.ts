import { test, expect } from '@playwright/test';

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

  test('should have working theme toggle', async ({ page }) => {
    await page.goto('/');

    // Look for theme toggle button
    const themeToggle = page.getByRole('button').first();
    if ((await themeToggle.count()) > 0) {
      await themeToggle.click();
      // Just verify the page still works after clicking
      await expect(
        page
          .getByText(/alex nodeland/i)
          .filter({ visible: true })
          .first()
      ).toBeVisible();
    }
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
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Check that there are no critical JavaScript errors
    const criticalErrors = errors.filter(
      error =>
        error && // Check if error exists
        !error.includes('Warning') &&
        !error.includes('console.warn') &&
        !error.includes('NO_COLOR')
    );
    expect(criticalErrors).toHaveLength(0);
  });
});
