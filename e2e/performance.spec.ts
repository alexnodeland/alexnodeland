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
        const veil = document.querySelector('.window-veil');
        if (!veil) return null;
        return {
          live: veil.classList.contains('veil-live'),
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

  test('the hero fold eases every property on one clock', async ({ page }) => {
    await page.goto('/');
    await settle(page);

    const clocks = await page.evaluate(() => {
      // What an element actually eases: its transition-property list, minus
      // every entry whose paired duration is zero (an element with no
      // transition declared reports the initial `all 0s`).
      const read = (selector: string) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const style = getComputedStyle(el);
        const properties = style.transitionProperty
          .split(',')
          .map(property => property.trim());
        const durations = style.transitionDuration
          .split(',')
          .map(duration => duration.trim());
        const timings = style.transitionTimingFunction
          .split(/,(?![^(]*\))/)
          .map(timing => timing.trim());
        const eased = properties
          .map((property, index) => ({
            property,
            duration: durations[index % durations.length],
            timing: timings[index % timings.length],
          }))
          .filter(entry => parseFloat(entry.duration) > 0);
        return eased;
      };
      return {
        hero: read('.site-hero.is-collapsible'),
        title: read('.site-hero.is-collapsible h1'),
        tagline: read('.site-hero.is-collapsible p'),
      };
    });

    // The fold is one state change. Its box (the paddings), its title (the
    // transform) and its tagline all have to ease on the same duration and
    // the same curve, or they arrive at different times and the title spends
    // frames under the window's edge — the mismatch this replaced.
    const durations = new Set<string>();
    const timings = new Set<string>();
    for (const eased of Object.values(clocks)) {
      expect(eased).not.toBeNull();
      expect(eased!.length).toBeGreaterThan(0);
      for (const entry of eased!) {
        durations.add(entry.duration);
        timings.add(entry.timing);
      }
    }
    expect([...durations]).toHaveLength(1);
    expect([...timings]).toHaveLength(1);
    expect(clocks.hero!.map(e => e.property)).toContain('padding-top');
    expect(clocks.title!.map(e => e.property)).toContain('transform');
    expect(clocks.tagline!.map(e => e.property)).toContain('transform');
  });

  test('the hero box and its title fold together in every frame', async ({
    page,
  }) => {
    // The projects list: long enough to scroll past the fold line on every
    // device profile, which the homepage is not on a phone.
    await page.goto('/projects');
    await settle(page);

    // Hydration is what arms the fold, and on a loaded runner it can land
    // after `settle`. So the first fold is only waited for — it proves the
    // shell is live — and the hero is put back to rest before the run that
    // is actually measured.
    const collapsed = () =>
      page.evaluate(() =>
        document.querySelector('.site-hero')!.classList.contains('is-collapsed')
      );
    const scrollTo = (top: number) =>
      page.evaluate(value => {
        (document.querySelector('.layout') as HTMLElement).scrollTop = value;
      }, top);
    await scrollTo(200);
    await expect
      .poll(collapsed, { message: 'the hero should fold', timeout: 20_000 })
      .toBe(true);
    await scrollTo(0);
    await expect
      .poll(collapsed, { message: 'the hero should unfold', timeout: 20_000 })
      .toBe(false);
    // Past the unfold's ease, so the resting numbers below are resting.
    await page.waitForTimeout(600);

    // Scroll past the fold line and sample the box and the title's transform
    // on every frame of the fold. The two are eased from the same class on
    // the same clock, so their progress has to agree at every sample — a box
    // that is closed around a title still at full size, or a title already
    // tucked away above an open box, is the state this guards against.
    const run = await page.evaluate(async () => {
      const layout = document.querySelector('.layout') as HTMLElement;
      const hero = document.querySelector('.site-hero') as HTMLElement;
      const title = hero.querySelector('h1') as HTMLElement;
      const frame = () =>
        new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
      const padding = () => parseFloat(getComputedStyle(hero).paddingTop);
      const scale = () => {
        const transform = getComputedStyle(title).transform;
        const matrix = transform.match(/matrix\(([^)]+)\)/);
        return matrix ? parseFloat(matrix[1].split(',')[0]) : 1;
      };
      const restPadding = padding();
      const foldedScale =
        parseFloat(
          getComputedStyle(hero).getPropertyValue('--collapsed-title-scale')
        ) || 0.55;

      layout.scrollTop = 200;
      const samples: { collapsed: boolean; padding: number; scale: number }[] =
        [];
      const started = performance.now();
      // Well past the 320ms fold, however long the runner's frames are.
      while (performance.now() - started < 900) {
        await frame();
        samples.push({
          collapsed: hero.classList.contains('is-collapsed'),
          padding: padding(),
          scale: scale(),
        });
      }
      return { restPadding, foldedPadding: padding(), foldedScale, samples };
    });

    expect(run.foldedPadding).toBeLessThan(run.restPadding);
    const last = run.samples[run.samples.length - 1];
    expect(last.collapsed).toBe(true);

    for (const sample of run.samples) {
      const box =
        (run.restPadding - sample.padding) /
        (run.restPadding - run.foldedPadding);
      const titleProgress = (1 - sample.scale) / (1 - run.foldedScale);
      if (!sample.collapsed) {
        // Not yet folded: nothing has moved.
        expect(box).toBeLessThan(0.02);
        expect(titleProgress).toBeLessThan(0.02);
      } else {
        expect(Math.abs(box - titleProgress)).toBeLessThan(0.1);
      }
    }
    // And the last frame has landed, both halves of it.
    expect(
      (run.restPadding - last.padding) / (run.restPadding - run.foldedPadding)
    ).toBeGreaterThan(0.98);
    expect((1 - last.scale) / (1 - run.foldedScale)).toBeGreaterThan(0.98);
  });

  test('the scroll-linked properties land on their readers, not their containers', async ({
    page,
  }) => {
    await page.goto('/blog');
    await settle(page);

    await page.evaluate(() => {
      const layout = document.querySelector('.layout');
      if (layout) layout.scrollTop = 200;
    });

    // 200px is past both ranges: the hero folds and the veil's publisher
    // settles at 1. Both run on the page's animation frames — generous
    // timeout, as everywhere here.
    await expect
      .poll(
        () =>
          page.evaluate(() =>
            getComputedStyle(
              document.querySelector('.site-hero') as HTMLElement
            )
              .getPropertyValue('--hero-collapse')
              .trim()
          ),
        { message: 'the hero should fold', timeout: 20_000 }
      )
      .toBe('1');

    const placement = await page.evaluate(() => {
      const inline = (selector: string, property: string) =>
        (
          document.querySelector(selector) as HTMLElement
        ).style.getPropertyValue(property);
      return {
        collapseOnHero: inline('.site-hero', '--hero-collapse'),
        collapseOnStage: inline('.stage', '--hero-collapse'),
        veilOnWindow: inline('.layout', '--veil-strength'),
        veilOnVeil: inline('.window-veil', '--veil-strength'),
      };
    });

    // A custom property inherits, so a per-frame write must sit on the
    // smallest subtree that reads it. On the stage or the window it drags
    // every element of the page into every scroll frame's style invalidation.
    // The hero's own value is not written per frame at all any more — it is
    // the stylesheet's, from the folded state — so nothing inline carries it.
    expect(placement.collapseOnHero).toBe('');
    expect(placement.collapseOnStage).toBe('');
    expect(placement.veilOnWindow).toBe('');
    expect(placement.veilOnVeil).toBe('1');
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

    // Pin the cheapest background, exactly as the pixel-ratio test does. The
    // shell otherwise picks one at random per load, and the spread between
    // simple-waves and the PDE field is an order of magnitude of per-frame GL
    // cost — noise that swamps the chrome cost this test exists to watch.
    await page.addInitScript(() => {
      localStorage.setItem(
        'animatedBackgroundSettings',
        JSON.stringify({ currentBackgroundId: 'simple-waves' })
      );
    });
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

    // Pinned for the same reason as the scroll sampler above: long tasks are
    // main-thread, but a heavy random background steals the same cores.
    await page.addInitScript(() => {
      localStorage.setItem(
        'animatedBackgroundSettings',
        JSON.stringify({ currentBackgroundId: 'simple-waves' })
      );
    });
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
