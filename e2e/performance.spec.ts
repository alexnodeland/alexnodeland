import { expect, test } from '@playwright/test';

/**
 * Performance regression tests.
 *
 * Two kinds of test live here, on purpose:
 *
 * 1. Structural guards — assertions about *how* the chrome is built (which
 *    properties transition, when expensive filter surfaces exist, how large
 *    the background's drawing buffer is). These are deterministic, run in
 *    every browser project, and fail the moment a regression reintroduces a
 *    pattern this codebase has already paid to remove: `transition: all`,
 *    an always-on document-wide custom-property publisher, a backdrop filter
 *    live during a slide.
 *
 * 2. Measured metrics — frame times while scrolling, long tasks across a
 *    navigation. Absolute numbers on CI hardware (software GL, shared CPU)
 *    are noisy, so these assert only sanity ceilings an order of magnitude
 *    above healthy values — a real regression (layout storm, runaway loop)
 *    still trips them — and attach the raw numbers to the report so runs can
 *    be compared over time. Chromium-only: the APIs they leans on
 *    (PerformanceObserver longtask) are Blink-specific.
 */

// The shell takes a beat to mount: the background is lazy-loaded and the
// panels restore from localStorage after hydration.
const settle = async (page: import('@playwright/test').Page, ms = 1200) => {
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(ms);
};

test.describe('structural performance guards', () => {
  test('the stage and nav transition an explicit property list, not `all`', async ({
    page,
  }) => {
    await page.goto('/');
    await settle(page);

    const props = await page.evaluate(() => {
      const read = (selector: string) => {
        const el = document.querySelector(selector);
        return el ? getComputedStyle(el).transitionProperty : null;
      };
      return {
        stage: read('.stage'),
        nav: read('.nav'),
        navLink: read('.nav-link'),
      };
    });

    // `all` on a fixed-position container means every state flip diffs the
    // full computed style set and arms layout properties for animation.
    expect(props.stage).not.toBeNull();
    expect(props.stage).not.toContain('all');
    expect(props.stage).toContain('left');
    expect(props.stage).toContain('right');
    expect(props.nav).not.toContain('all');
    expect(props.navLink).not.toContain('all');
  });

  test('--window-top publishes only while a sidebar exists to read it', async ({
    page,
  }) => {
    await page.goto('/');
    await settle(page);

    const readTop = () =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue('--window-top')
      );

    // Closed panels: no publisher. Every write to a root-level custom
    // property invalidates style document-wide, so at rest there must be
    // none — scrolling moves the window's top edge on every frame.
    expect(await readTop()).toBe('');

    // The keyboard shortcut, not the pill: the launcher wears an entry
    // animation, and a clicked element that never goes still fails
    // Playwright's stability wait.
    await page.keyboard.press('c');
    await expect
      .poll(readTop, {
        message: 'opening the chat should start the publisher',
      })
      .toMatch(/px$/);
  });

  test('the window veil keeps no live blur surface at rest', async ({
    page,
  }) => {
    // The veil only renders off the home route.
    await page.goto('/blog');
    await settle(page);

    const veilState = () =>
      page.evaluate(() => {
        const layout = document.querySelector('.layout');
        const veil = document.querySelector('.window-veil');
        if (!layout || !veil) return null;
        return {
          live: layout.classList.contains('veil-live'),
          visibility: getComputedStyle(veil, '::before').visibility,
        };
      });

    // At the top of the page the veil is invisible — and must be *gone*
    // (visibility), not merely transparent, or its 18px backdrop blur keeps
    // re-resolving over the animated canvas behind the window every frame.
    const atRest = await veilState();
    expect(atRest).not.toBeNull();
    expect(atRest!.live).toBe(false);
    expect(atRest!.visibility).toBe('hidden');

    // Scrolled, the veil comes back for exactly as long as there is
    // something to veil. The publisher runs on the page's animation frames,
    // which crawl under parallel software-GL load — hence the long timeout.
    await page.evaluate(() => {
      const layout = document.querySelector('.layout');
      if (layout) layout.scrollTop = 200;
    });
    await expect
      .poll(async () => (await veilState())!.visibility, {
        message: 'scrolling should re-arm the veil',
        timeout: 20_000,
      })
      .toBe('visible');
  });

  test('the mobile chat sheet sheds its backdrop filter while sliding', async ({
    page,
    isMobile,
  }) => {
    test.skip(!isMobile, 'the full-screen sheet only exists on phone widths');

    await page.goto('/');
    await settle(page);
    // Keyboard rather than the pill — see the note in the publisher test.
    await page.keyboard.press('c');
    const sheet = page.locator('.chat-sidebar');
    await expect(sheet).toBeVisible();

    const readFilter = () =>
      sheet.evaluate(el => {
        const cs = getComputedStyle(el) as CSSStyleDeclaration & {
          webkitBackdropFilter?: string;
        };
        return cs.backdropFilter || cs.webkitBackdropFilter || '';
      });

    // Parked, the sheet wears the window's frosted glass — poll for the
    // *settled* value, not the first interpolated frame of the settle fade.
    // The timeout is generous because the fade advances with the page's
    // animation clock, and under parallel software-GL load a 220ms fade can
    // take seconds of wall time to paint its final frame.
    await expect.poll(readFilter, { timeout: 20_000 }).toBe('blur(5px)');

    // The moving states take the filter off: a full-screen backdrop filter
    // re-resolved on every frame of a 300ms slide is the most expensive
    // thing a phone GPU can be asked to do while also compositing the move.
    // Asserted against the stylesheet rather than by toggling classes on the
    // live element — React owns className and resets hand-added classes on
    // any re-render.
    const gatingRules = await page.evaluate(() => {
      const found: Record<string, string> = {};
      const walk = (rules: CSSRuleList) => {
        for (const rule of Array.from(rules)) {
          if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) {
            walk(rule.cssRules);
          } else if (
            rule instanceof CSSStyleRule &&
            /\.(chat-sidebar|settings-sidebar)\.(opening|closing)/.test(
              rule.selectorText
            )
          ) {
            const value = rule.style.getPropertyValue('backdrop-filter');
            if (value) found[rule.selectorText] = value;
          }
        }
      };
      for (const sheet of Array.from(document.styleSheets)) {
        try {
          walk(sheet.cssRules);
        } catch {
          // Cross-origin sheet — none of ours.
        }
      }
      return found;
    });

    const gated = (fragment: string) =>
      Object.entries(gatingRules).some(
        ([selector, value]) =>
          selector.includes(fragment) && value.trim() === 'none'
      );
    expect(gated('.chat-sidebar.opening')).toBe(true);
    expect(gated('.chat-sidebar.closing')).toBe(true);
    expect(gated('.settings-sidebar.closing')).toBe(true);
  });

  test('the background renders at the capped mobile pixel ratio', async ({
    page,
    isMobile,
    browserName,
  }) => {
    test.skip(!isMobile, 'the 1.5 cap only applies at phone widths');
    test.skip(
      browserName !== 'chromium',
      'headless WebGL is only dependable in chromium'
    );

    // Pin the cheapest background so the test never depends on the random
    // pick, then wait for its canvas.
    await page.addInitScript(() => {
      localStorage.setItem(
        'animatedBackgroundSettings',
        JSON.stringify({ currentBackgroundId: 'simple-waves' })
      );
    });
    await page.goto('/');
    await settle(page, 2500);

    const sizes = await page.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      return {
        buffer: canvas.width,
        css: window.innerWidth,
        dpr: window.devicePixelRatio,
      };
    });
    test.skip(sizes === null, 'no WebGL canvas mounted in this environment');

    // On a >1.5x phone the drawing buffer must be 1.5 × CSS pixels — the
    // uncapped device ratio would roughly double the per-frame fill cost of
    // a canvas that is then composited under a scrim anyway.
    const expected = sizes!.css * Math.min(sizes!.dpr, 1.5);
    expect(Math.abs(sizes!.buffer - expected)).toBeLessThanOrEqual(2);
  });
});

test.describe('measured metrics (chromium)', () => {
  test('scrolling the window stays under the frame-time ceiling', async ({
    page,
    browserName,
    isMobile,
  }, testInfo) => {
    test.skip(browserName !== 'chromium', 'frame sampling tuned for Blink');
    test.skip(isMobile, 'desktop project only — one stable baseline');
    // Software GL on CI hardware runs frames an order of magnitude slower
    // than any real device; give the sampler room to finish regardless.
    test.setTimeout(90_000);

    await page.goto('/cv'); // the longest page — worst-case layout
    await settle(page, 2000);

    const metrics = await page.evaluate(
      () =>
        new Promise<{ frames: number; avg: number; p95: number; max: number }>(
          resolve => {
            const layout = document.querySelector('.layout') as HTMLElement;
            const deltas: number[] = [];
            let last = performance.now();
            let scrolled = 0;
            const step = (now: number) => {
              deltas.push(now - last);
              last = now;
              // ~30px/frame emulates a brisk flick through the hero collapse
              // range and on into the document; 60 samples is enough for a
              // stable p95 without stretching the test on slow CI frames.
              scrolled += 30;
              layout.scrollTop = scrolled;
              if (scrolled < 1800) {
                requestAnimationFrame(step);
              } else {
                deltas.sort((a, b) => a - b);
                const avg = deltas.reduce((s, d) => s + d, 0) / deltas.length;
                resolve({
                  frames: deltas.length,
                  avg,
                  p95: deltas[Math.floor(deltas.length * 0.95)],
                  max: deltas[deltas.length - 1],
                });
              }
            };
            requestAnimationFrame(step);
          }
        )
    );

    await testInfo.attach('scroll-frame-times', {
      body: JSON.stringify(metrics, null, 2),
      contentType: 'application/json',
    });

    // Sanity ceilings, not targets: with software GL on shared CPUs and the
    // suite running fully parallel, healthy frames average in the hundreds
    // of milliseconds (~180ms exclusive, ~800ms under full parallel load —
    // the WebGL background alone costs that under swiftshader). The
    // ceilings only catch catastrophic regressions; the attached numbers
    // are the real measurement, compare them across runs.
    expect(metrics.avg).toBeLessThan(1500);
    expect(metrics.p95).toBeLessThan(5000);
  });

  test('a page navigation stays under the long-task ceiling', async ({
    page,
    browserName,
    isMobile,
  }, testInfo) => {
    test.skip(browserName !== 'chromium', 'longtask observer is Blink-only');
    test.skip(isMobile, 'desktop project only — one stable baseline');

    await page.goto('/');
    await settle(page, 2000);

    // Arm the observer, run the shell's whole navigation transition (hero
    // swap, height ease, content rise), then read the tally.
    await page.evaluate(() => {
      const w = window as typeof window & { __longTasks?: number[] };
      w.__longTasks = [];
      new PerformanceObserver(list => {
        for (const entry of list.getEntries()) {
          w.__longTasks!.push(entry.duration);
        }
      }).observe({ type: 'longtask', buffered: false });
    });

    await page.getByRole('navigation').getByText('blog').click();
    await page.waitForURL(/\/blog/);
    await page.waitForTimeout(1500); // every timeline in the transition ends

    const longTasks = await page.evaluate(
      () => (window as typeof window & { __longTasks?: number[] }).__longTasks!
    );
    const total = longTasks.reduce((s, d) => s + d, 0);

    await testInfo.attach('navigation-long-tasks', {
      body: JSON.stringify({ count: longTasks.length, total, longTasks }),
      contentType: 'application/json',
    });

    // Same philosophy as above: a generous ceiling that real regressions
    // (a transition re-armed on layout properties, a rebuild storm) exceed.
    // ~4s totals are normal for CI-grade hardware running software GL; the
    // attached numbers are the measurement to compare across runs.
    expect(total).toBeLessThan(10_000);
  });
});
