import { expect, test, type Page } from '@playwright/test';
import { trackCriticalErrors } from './consoleErrors';

/**
 * One background giving way to another.
 *
 * A change of background used to be a black sheet fading over a cut. Now the
 * scene that is up is told it is leaving and takes itself off the field, and
 * only then is the next one built. What a reader is owed through that, and
 * what these check:
 *
 *   the name changes at once — the pill is the answer to the key, and it
 *   does not wait for the picture;
 *   there is never more than one scene — two would be two WebGL contexts and
 *   two simulations on a phone that can afford one;
 *   it ends with the new one on the field, shown, however fast it was asked.
 */

const PHONE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

// The set, in the order the arrow keys walk it, by the pill's own names.
const start = async (page: Page, background: string) => {
  await page.addInitScript(id => {
    if (window.sessionStorage.getItem('handover-seeded')) return;
    window.sessionStorage.setItem('handover-seeded', '1');
    window.localStorage.setItem(
      'animatedBackgroundSettings',
      JSON.stringify({ version: 2, currentBackgroundId: id, settings: {} })
    );
  }, background);
  await page.goto('/');
  await page.waitForSelector('canvas', { timeout: 30_000 });
  // Shown, not merely mounted: the canvas comes up once it has a frame.
  await expect
    .poll(() => shown(page), { timeout: 20_000 })
    .toBeGreaterThan(0.99);
};

// How strongly the scene's canvas is being shown, 0 → 1.
const shown = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.querySelector<HTMLCanvasElement>(
      '.background-arrival canvas'
    );
    if (!canvas) return 0;
    return canvas.style.opacity === '' ? 1 : Number(canvas.style.opacity);
  });

const scenes = (page: Page) =>
  page.locator('.background-arrival canvas').count();

// Sample the field through a hand-over: how many scenes there were at most.
const mostScenesDuring = async (page: Page, ms: number) => {
  let most = 0;
  const until = Date.now() + ms;
  while (Date.now() < until) {
    most = Math.max(most, await scenes(page));
    await page.waitForTimeout(40);
  }
  return most;
};

test.describe('changing background', () => {
  test('desktop: the name answers the key, and one scene hands over to the next', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    const errors = trackCriticalErrors(page);
    await start(page, 'simple-waves');
    await expect(page.locator('.background-name')).toHaveText('waves');

    await page.keyboard.press('ArrowRight');
    // At once: well inside the time the old scene takes to leave.
    await expect(page.locator('.background-name')).toHaveText('scheduling', {
      timeout: 400,
    });

    expect(await mostScenesDuring(page, 2_500)).toBe(1);
    await expect.poll(() => scenes(page), { timeout: 15_000 }).toBe(1);
    await expect
      .poll(() => shown(page), { timeout: 20_000 })
      .toBeGreaterThan(0.99);
    expect(errors).toHaveLength(0);
  });

  test('desktop: asked three times in a breath, it lands on the third', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    const errors = trackCriticalErrors(page);
    await start(page, 'simple-waves');

    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    await expect(page.locator('.background-name')).toHaveText('pathfinding', {
      timeout: 400,
    });

    expect(await mostScenesDuring(page, 2_500)).toBe(1);
    await expect.poll(() => scenes(page), { timeout: 15_000 }).toBe(1);
    await expect
      .poll(() => shown(page), { timeout: 20_000 })
      .toBeGreaterThan(0.99);
    await expect(page.locator('.background-name')).toHaveText('pathfinding');
    expect(errors).toHaveLength(0);
  });

  test('desktop: turning back before it has gone keeps the scene that was up', async ({
    page,
  }) => {
    await page.setViewportSize(DESKTOP);
    await start(page, 'simple-waves');

    await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(150);
    await page.keyboard.press('ArrowLeft');
    await expect(page.locator('.background-name')).toHaveText('waves');

    // Never taken down, and back at full strength.
    expect(await mostScenesDuring(page, 1_500)).toBe(1);
    await expect
      .poll(() => shown(page), { timeout: 20_000 })
      .toBeGreaterThan(0.99);
  });

  test('phone: the next button hands over the same way', async ({ page }) => {
    await page.setViewportSize(PHONE);
    const errors = trackCriticalErrors(page);
    await start(page, 'cellular-automaton');

    await page.click('.mobile-interactivity-btn');
    await page.waitForTimeout(500);
    await expect(page.locator('.mobile-explore-name')).toContainText(
      'automaton'
    );

    await page.click('[aria-label="Next background"]');
    await expect(page.locator('.mobile-explore-name')).toContainText('waves', {
      timeout: 400,
    });

    expect(await mostScenesDuring(page, 2_500)).toBe(1);
    await expect.poll(() => scenes(page), { timeout: 15_000 }).toBe(1);
    await expect
      .poll(() => shown(page), { timeout: 20_000 })
      .toBeGreaterThan(0.99);
    expect(errors).toHaveLength(0);
  });
});
