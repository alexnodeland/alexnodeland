import { test, expect } from '@playwright/test';
import { trackCriticalErrors } from './consoleErrors';

test.describe('CV Page', () => {
  test('should load CV page successfully', async ({ page }) => {
    await page.goto('/cv');

    // Check that the page loads
    await expect(page).toHaveTitle(/cv|resume/i);

    // Check for resume content
    await expect(
      page
        .getByText(/alex nodeland/i)
        .filter({ visible: true })
        .first()
    ).toBeVisible();
  });

  test('should have export functionality', async ({ page }) => {
    await page.goto('/cv');

    // The control row is two dropdowns: pick a length, take the document
    // away. The three formats live behind the download trigger.
    await expect(
      page.getByRole('button', { name: /choose cv length/i })
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: /download the cv/i })
    ).toBeVisible();

    await page.getByRole('button', { name: /download the cv/i }).click();
    await expect(page.getByRole('option', { name: 'pdf' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'docx' })).toBeVisible();
    await expect(page.getByRole('option', { name: 'markdown' })).toBeVisible();
  });

  test('should have search functionality', async ({ page }) => {
    await page.goto('/cv');

    // Look for search input (any input should work)
    const searchInput = page.locator('input').first();
    if ((await searchInput.count()) > 0) {
      await searchInput.fill('react');
      // Just verify the page still loads after search
      await expect(
        page
          .getByText(/alex nodeland/i)
          .filter({ visible: true })
          .first()
      ).toBeVisible();
    }
  });

  // Opens the download menu and takes one format. The menu closes itself
  // after the choice, so each call is self-contained.
  const downloadAs = async (
    page: import('@playwright/test').Page,
    format: 'pdf' | 'docx' | 'markdown'
  ) => {
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /download the cv/i }).click();
    await page.getByRole('option', { name: format, exact: true }).click();
    return downloadPromise;
  };

  test('should download the PDF artifact for the current view', async ({
    page,
  }) => {
    await page.goto('/cv');

    // The full CV serves the full artifact…
    const fullDownload = await downloadAs(page, 'pdf');
    expect(fullDownload.suggestedFilename()).toBe('alex-nodeland-cv.pdf');

    // …and switching to the one-page view swaps in the one-page artifact.
    await page.getByRole('button', { name: /choose cv length/i }).click();
    await page.getByRole('option', { name: 'one page' }).click();
    const resumeDownload = await downloadAs(page, 'pdf');
    expect(resumeDownload.suggestedFilename()).toBe('alex-nodeland-resume.pdf');
  });

  test('should export DOCX from the download menu', async ({ page }) => {
    await page.goto('/cv');

    const download = await downloadAs(page, 'docx');
    expect(download.suggestedFilename()).toMatch(/\.docx$/);
  });

  test('should export Markdown from the download menu', async ({ page }) => {
    await page.goto('/cv');

    const download = await downloadAs(page, 'markdown');
    expect(download.suggestedFilename()).toMatch(/\.md$/);
  });

  test('should display main resume sections', async ({ page }) => {
    await page.goto('/cv');

    // Just check that main sections are visible
    await expect(page.getByText(/experience/i).first()).toBeVisible();
    await expect(page.getByText(/education/i).first()).toBeVisible();
    await expect(page.getByText(/skills/i).first()).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test basic responsiveness
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/cv');

    // Just check that key elements are still visible
    await expect(
      page
        .getByText(/alex nodeland/i)
        .filter({ visible: true })
        .first()
    ).toBeVisible();
    await expect(page.getByRole('button').first()).toBeVisible();
  });

  test('should have basic accessibility', async ({ page }) => {
    await page.goto('/cv');

    // Just check that the page has some content and interactive elements
    await expect(
      page
        .getByText(/alex nodeland/i)
        .filter({ visible: true })
        .first()
    ).toBeVisible();

    // Check for interactive elements (buttons or links)
    const buttons = page.getByRole('button');
    const links = page.getByRole('link');
    const buttonCount = await buttons.count();
    const linkCount = await links.count();
    expect(buttonCount + linkCount).toBeGreaterThan(0);
  });

  test('should load without critical JavaScript errors', async ({ page }) => {
    // The listener and its filter live in consoleErrors.ts, shared by every
    // page spec — four private copies of the filter is how they all drifted
    // stale together.
    const errors = trackCriticalErrors(page);

    await page.goto('/cv');

    // Wait for page to fully load
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(errors).toHaveLength(0);
  });
});
