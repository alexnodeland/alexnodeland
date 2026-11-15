import {
  DEFAULT_GOVERNOR,
  Governor,
  governorEnabled,
  isSoftwareRenderer,
  resolveQuality,
  SOFTWARE_FLOOR,
} from '../../../../../../components/animated-backgrounds/core/stage/quality';

type FieldWindow = Window & {
  __fieldQuality?: {
    governor?: boolean;
    pixelRatio?: number;
    tier?: 'high' | 'low';
  };
};

// A GL context that gives the name of what is drawing, the way a browser
// does: through the debug extension when it offers one, or plainly.
const context = (name: unknown, viaExtension = true) => ({
  RENDERER: 0x1f01,
  getExtension: (extension: string) =>
    viaExtension && extension === 'WEBGL_debug_renderer_info'
      ? { UNMASKED_RENDERER_WEBGL: 0x9246 }
      : null,
  getParameter: (parameter: number) =>
    parameter === (viaExtension ? 0x9246 : 0x1f01) ? name : null,
});

const SWIFTSHADER =
  'ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)';

// Feed a governor frames of one length for a stretch of time; the last
// scale it reported, if it reported one.
const run = (governor: Governor, frameMs: number, forMs: number) => {
  let changed: number | null = null;
  for (let t = 0; t < forMs; t += frameMs) {
    const scale = governor.sample(frameMs);
    if (scale !== null) changed = scale;
  }
  return changed;
};

describe('the render governor', () => {
  it('leaves a device that keeps up alone', () => {
    const governor = new Governor();
    expect(run(governor, 16.7, 30_000)).toBeNull();
    expect(governor.scale).toBe(1);
  });

  it('gives resolution back when frames run long', () => {
    const governor = new Governor();
    const changed = run(governor, 40, 4_000);
    expect(changed).not.toBeNull();
    expect(governor.scale).toBeLessThan(1);
    expect(governor.scale).toBeCloseTo(DEFAULT_GOVERNOR.step, 5);
  });

  it('never goes below its floor, however slow the device', () => {
    const governor = new Governor();
    run(governor, 60, 120_000);
    expect(governor.scale).toBe(DEFAULT_GOVERNOR.floor);
  });

  it('takes resolution back, more reluctantly, when there is room', () => {
    const governor = new Governor();
    run(governor, 40, 4_000);
    const lowered = governor.scale;

    // A couple of seconds of quick frames is not yet evidence.
    run(governor, 8, 3_000);
    expect(governor.scale).toBe(lowered);

    run(governor, 8, 30_000);
    expect(governor.scale).toBe(1);
  });

  it('holds its ground in the band between the two thresholds', () => {
    // Merely adequate at a scale is a reason to stay there, not to hunt
    // between two.
    const governor = new Governor();
    run(governor, 40, 4_000);
    const lowered = governor.scale;
    run(governor, 20, 60_000);
    expect(governor.scale).toBe(lowered);
  });

  it('reads nothing into one enormous frame', () => {
    const governor = new Governor();
    for (let i = 0; i < 50; i++) expect(governor.sample(900)).toBeNull();
    expect(governor.scale).toBe(1);
  });

  it('starts a device known to be slow where it would have ended up', () => {
    const governor = new Governor({ floor: 0.35 }, true);
    expect(governor.scale).toBe(0.35);
    // Still slow: there is nowhere lower to go, so nothing changes.
    expect(run(governor, 60, 20_000)).toBeNull();
    expect(governor.scale).toBe(0.35);
  });

  it('gives such a device its pixels back if it turns out to have the room', () => {
    const governor = new Governor({ floor: 0.35 }, true);
    run(governor, 8, 60_000);
    expect(governor.scale).toBe(1);
  });

  it('is quiet for a moment after a change, while the targets are rebuilt', () => {
    const governor = new Governor();
    let waited = 0;
    while (governor.sample(40) === null && waited < 10_000) waited += 40;
    const lowered = governor.scale;
    expect(lowered).toBeLessThan(1);

    // Still slow, but the frames that paid for the change do not count.
    expect(run(governor, 40, 1_000)).toBeNull();
    expect(governor.scale).toBe(lowered);

    // And not quiet for good: a device that is still behind gives more.
    expect(run(governor, 40, 4_000)).not.toBeNull();
    expect(governor.scale).toBeLessThan(lowered);
  });
});

describe('the quality a device is asked for', () => {
  const fieldWindow = window as FieldWindow;

  afterEach(() => {
    delete fieldWindow.__fieldQuality;
  });

  it('asks a desktop for multisampling and the full bloom chain', () => {
    const quality = resolveQuality();
    expect(quality.tier).toBe('high');
    expect(quality.samples).toBeGreaterThan(0);
    expect(quality.bloomLevels).toBe(5);
  });

  it('asks a touch device for neither', () => {
    const matchMedia = window.matchMedia;
    window.matchMedia = ((query: string) => ({
      matches: query.includes('coarse'),
      media: query,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    })) as unknown as typeof window.matchMedia;
    try {
      const quality = resolveQuality();
      expect(quality.tier).toBe('low');
      expect(quality.samples).toBe(0);
      expect(quality.bloomLevels).toBeLessThan(5);
    } finally {
      window.matchMedia = matchMedia;
    }
  });

  it('spends fewer samples on a dense screen', () => {
    fieldWindow.__fieldQuality = { pixelRatio: 2 };
    const dense = resolveQuality();
    fieldWindow.__fieldQuality = { pixelRatio: 1 };
    const sparse = resolveQuality();
    expect(dense.pixelRatio).toBe(2);
    expect(dense.samples).toBeLessThan(sparse.samples);
  });

  it('lets a test or a screenshot pin the resolution', () => {
    expect(governorEnabled()).toBe(true);
    fieldWindow.__fieldQuality = { governor: false };
    expect(governorEnabled()).toBe(false);
  });

  describe('where there is no graphics hardware', () => {
    it.each([
      ['Chrome’s', SWIFTSHADER],
      ['Mesa’s', 'llvmpipe (LLVM 15.0.7, 256 bits)'],
      ['Mesa’s older one', 'softpipe'],
      ['Windows’', 'Microsoft Basic Render Driver'],
      ['one that just says so', 'Generic Software Renderer'],
    ])('knows %s rasteriser by its name', (_whose, name) => {
      expect(isSoftwareRenderer(context(name))).toBe(true);
      // Where the browser gives the name without the extension, too.
      expect(isSoftwareRenderer(context(name, false))).toBe(true);
    });

    it.each([
      'ANGLE (Apple, ANGLE Metal Renderer: Apple M2, Unspecified Version)',
      'ANGLE (Intel, Intel(R) Iris(R) Xe Graphics Direct3D11 vs_5_0 ps_5_0, D3D11)',
      'Mali-G78',
      'Adreno (TM) 740',
    ])('takes %s for hardware', name => {
      expect(isSoftwareRenderer(context(name))).toBe(false);
    });

    it('assumes hardware when it cannot ask', () => {
      // No context, a browser that will not say, a context that throws: the
      // governor finds out the slow way instead.
      expect(isSoftwareRenderer(null)).toBe(false);
      expect(isSoftwareRenderer(undefined)).toBe(false);
      expect(isSoftwareRenderer(context(null))).toBe(false);
      expect(
        isSoftwareRenderer({
          RENDERER: 0x1f01,
          getExtension: () => {
            throw new Error('context lost');
          },
          getParameter: () => SWIFTSHADER,
        })
      ).toBe(false);
    });

    it('asks for the least picture there is', () => {
      const quality = resolveQuality(context(SWIFTSHADER));
      expect(quality.software).toBe(true);
      expect(quality.tier).toBe('low');
      expect(quality.samples).toBe(0);
      // No bloom at all: not a level, not a pass.
      expect(quality.bloomLevels).toBe(0);
      // And goes lower than any graphics hardware is asked to.
      expect(SOFTWARE_FLOOR).toBeLessThan(DEFAULT_GOVERNOR.floor);
    });

    it('still gives the whole picture to someone who asks for it by name', () => {
      // How a screenshot is taken on a machine with no graphics hardware.
      fieldWindow.__fieldQuality = { tier: 'high' };
      const quality = resolveQuality(context(SWIFTSHADER));
      expect(quality.software).toBe(false);
      expect(quality.tier).toBe('high');
      expect(quality.samples).toBeGreaterThan(0);
      expect(quality.bloomLevels).toBe(5);
    });

    it('leaves hardware on the tier it had', () => {
      const quality = resolveQuality(context('ANGLE (Apple, Apple M2)'));
      expect(quality.software).toBe(false);
      expect(quality.tier).toBe('high');
      expect(quality.bloomLevels).toBe(5);
    });

    it('lets a tier be asked for on hardware as well', () => {
      fieldWindow.__fieldQuality = { tier: 'low' };
      const quality = resolveQuality(context('ANGLE (Apple, Apple M2)'));
      expect(quality.tier).toBe('low');
      expect(quality.software).toBe(false);
      expect(quality.bloomLevels).toBe(4);
    });
  });
});
