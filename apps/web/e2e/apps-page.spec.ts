import { test, expect } from '@playwright/test';
import { trackCriticalErrors } from './consoleErrors';

test.describe('Apps Page', () => {
  test('should load with its title and the nav', async ({ page }) => {
    await page.goto('/apps');

    await expect(page).toHaveTitle(/apps/i);
    await expect(
      page.getByRole('heading', { level: 1, name: 'apps' })
    ).toBeVisible();
    await expect(page.getByRole('navigation')).toBeVisible();
  });

  test('should show the mac apps with the line that installs each', async ({
    page,
  }) => {
    await page.goto('/apps');

    const install = page.locator('#macos .project-install code').first();
    await expect(install).toBeVisible();
    await expect(install).toHaveText(
      /^brew install --cask alexnodeland\/tap\//
    );

    // The line sits above the card's stretched link, so a click on it lands
    // on the command rather than following the card out. At the default
    // viewport the first row's lines sit just under the window's fold.
    await install.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    const onTop = await install.evaluate(code => {
      const box = code.getBoundingClientRect();
      const hit = document.elementFromPoint(
        box.left + box.width / 2,
        box.top + box.height / 2
      );
      return code.contains(hit);
    });
    expect(onTop).toBe(true);
  });

  test('should load without critical JavaScript errors', async ({ page }) => {
    const errors = trackCriticalErrors(page);

    await page.goto('/apps');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    expect(errors).toHaveLength(0);
  });
});
