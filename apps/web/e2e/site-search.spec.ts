import { test, expect } from '@playwright/test';
import { trackCriticalErrors } from './consoleErrors';

test.describe('Site search', () => {
  test('opens on the chord, finds a project, and lands on its card', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'a phone has no keyboard chord; see the next test');
    const errors = trackCriticalErrors(page);
    await page.goto('/timeline');

    await page.keyboard.press('ControlOrMeta+k');
    const dialog = page.getByRole('dialog', { name: 'search the site' });
    await expect(dialog).toBeVisible();

    const box = dialog.getByRole('combobox');
    await expect(box).toBeFocused();
    await box.fill('fugue');
    await expect(dialog.getByRole('option').first()).toContainText('fugue');

    await page.keyboard.press('Enter');
    await expect(dialog).toBeHidden();
    // The development server compiles a page the first time it is visited,
    // and /projects may not have been yet: the arrival and the scroll to the
    // card wait for that, so they get longer than the default five seconds.
    await expect(page).toHaveURL(/\/projects\/#project-fugue$/, {
      timeout: 15_000,
    });

    // The card the result named is the one on screen once the page settles.
    const card = page.locator('#project-fugue');
    await expect(card).toBeInViewport({ timeout: 15_000 });

    expect(errors).toHaveLength(0);
  });

  test('opens from the magnifier on a phone', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'the desktop hint is covered by the chord test');
    await page.goto('/');

    await page.getByRole('button', { name: 'search the site' }).tap();
    const dialog = page.getByRole('dialog', { name: 'search the site' });
    await expect(dialog).toBeVisible();

    await dialog.getByRole('combobox').fill('apps');
    await dialog.getByRole('option').first().tap();
    await expect(page).toHaveURL(/\/apps\/?$/);
  });
});
