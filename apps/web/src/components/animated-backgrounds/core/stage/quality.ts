import { getRenderPixelRatio } from '../renderScale';
import { isCompactViewport } from '../useIsMobileViewport';

/**
 * How much picture a device is asked for.
 *
 * The scenes are lit, three-dimensional and post-processed, which is a great
 * deal more per pixel than the flat fields they replace. Two things keep that
 * honest. A tier, chosen once from what the device says it is: a phone gets
 * no multisampling, a lighter bloom and fewer elements from every scene that
 * can spare them. And a governor, which watches the frames the device
 * actually delivers and gives resolution back before it gives up frame rate —
 * a soft field under a scrim loses very little at four fifths of its
 * pixels, and a great deal at twenty frames a second.
 */

export type Tier = 'high' | 'low';

export interface Quality {
  tier: Tier;
  /** Device pixels per CSS pixel the scene is drawn at, before the governor. */
  pixelRatio: number;
  /** MSAA samples on the scene's own target. */
  samples: number;
  /** Mip levels in the bloom chain. */
  bloomLevels: number;
}

/**
 * A hook for looking closely: `window.__fieldQuality = { governor: false }`
 * pins the resolution (a software rasteriser in a test run is always "too
 * slow", and a screenshot wants every pixel), and `pixelRatio` overrides the
 * ratio outright.
 */
interface QualityOverride {
  governor?: boolean;
  pixelRatio?: number;
}

const readOverride = (): QualityOverride => {
  if (typeof window === 'undefined') return {};
  return (
    (window as unknown as { __fieldQuality?: QualityOverride })
      .__fieldQuality ?? {}
  );
};

const coarsePointer = (): boolean =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(pointer: coarse)').matches;

export const resolveQuality = (): Quality => {
  const tier: Tier = isCompactViewport() || coarsePointer() ? 'low' : 'high';
  const pixelRatio = readOverride().pixelRatio ?? getRenderPixelRatio();
  return {
    tier,
    pixelRatio,
    // A dense screen needs less help with its edges than a sparse one, and a
    // phone's GPU is better spent elsewhere.
    samples: tier === 'low' ? 0 : pixelRatio > 1.5 ? 2 : 4,
    bloomLevels: tier === 'low' ? 4 : 5,
  };
};

export const governorEnabled = (): boolean => readOverride().governor !== false;

export interface GovernorOptions {
  /** A smoothed frame longer than this is too slow. */
  slowMs: number;
  /** One shorter than this has room to spare. */
  fastMs: number;
  /** How long either has to hold before the scale moves, in ms. */
  slowHoldMs: number;
  fastHoldMs: number;
  /** The scale never drops below this fraction of the device's own ratio. */
  floor: number;
  /** Each step down multiplies the scale by this; each step up divides. */
  step: number;
}

export const DEFAULT_GOVERNOR: GovernorOptions = {
  slowMs: 26,
  fastMs: 13,
  slowHoldMs: 1500,
  fastHoldMs: 6000,
  floor: 0.55,
  step: 0.8,
};

/**
 * Trades resolution for frame time, slowly and with a dead band.
 *
 * Fed each frame's duration, it keeps an exponential average and moves the
 * render scale one step when the average has sat on the wrong side of a
 * threshold for long enough: down quickly when frames are slow, up
 * reluctantly when there is plainly room. Reallocating every render target is
 * itself a hitch, so a change is followed by a quiet period, and the two
 * thresholds are a factor of two apart — a device that is merely adequate at
 * a scale stays there rather than hunting between two.
 */
export class Governor {
  scale = 1;
  private average = 16.7;
  private slowFor = 0;
  private fastFor = 0;
  private quietFor = 0;
  private readonly options: GovernorOptions;

  constructor(options: Partial<GovernorOptions> = {}) {
    this.options = { ...DEFAULT_GOVERNOR, ...options };
  }

  /**
   * Take one frame's duration in milliseconds. Returns the new scale when it
   * has just changed, and null otherwise.
   */
  sample(frameMs: number): number | null {
    const { slowMs, fastMs, slowHoldMs, fastHoldMs, floor, step } =
      this.options;
    // A tab coming back from the background, a breakpoint, a long GC: one
    // enormous frame says nothing about the device.
    if (frameMs > 250) return null;

    this.average += (frameMs - this.average) * 0.1;

    if (this.quietFor > 0) {
      this.quietFor -= frameMs;
      return null;
    }

    this.slowFor = this.average > slowMs ? this.slowFor + frameMs : 0;
    this.fastFor = this.average < fastMs ? this.fastFor + frameMs : 0;

    if (this.slowFor >= slowHoldMs && this.scale > floor) {
      this.scale = Math.max(floor, this.scale * step);
      return this.settle();
    }
    if (this.fastFor >= fastHoldMs && this.scale < 1) {
      this.scale = Math.min(1, this.scale / step);
      return this.settle();
    }
    return null;
  }

  private settle(): number {
    this.slowFor = 0;
    this.fastFor = 0;
    // Long enough for the new targets to be allocated and the average to
    // forget the frames that paid for it.
    this.quietFor = 1200;
    this.average = (this.options.slowMs + this.options.fastMs) / 2;
    return this.scale;
  }
}
