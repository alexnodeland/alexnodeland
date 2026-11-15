import {
  DEFAULT_GOVERNOR,
  Governor,
  governorEnabled,
  resolveQuality,
} from '../../../../../../components/animated-backgrounds/core/stage/quality';

type FieldWindow = Window & {
  __fieldQuality?: { governor?: boolean; pixelRatio?: number };
};

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
});
