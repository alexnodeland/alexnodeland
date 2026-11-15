import { getRenderPixelRatio } from '../renderScale';
import { isCompactViewport } from '../useIsMobileViewport';

/**
 * How much picture a device is asked for.
 *
 * The scenes are lit, three-dimensional and post-processed, which is a great
 * deal more per pixel than the flat fields they replace. Three things keep
 * that honest. A tier, chosen once from what the device says it is: a phone
 * gets no multisampling, a lighter bloom and fewer elements from every scene
 * that can spare them. A governor, which watches the frames the device
 * actually delivers and gives resolution back before it gives up frame rate —
 * a soft field under a scrim loses very little at four fifths of its
 * pixels, and a great deal at twenty frames a second. And a floor for the
 * device with no graphics hardware at all, which starts where the governor
 * would have ended up: see `software` below.
 */

export type Tier = 'high' | 'low';

export interface Quality {
  tier: Tier;
  /** Device pixels per CSS pixel the scene is drawn at, before the governor. */
  pixelRatio: number;
  /** MSAA samples on the scene's own target. */
  samples: number;
  /** Mip levels in the bloom chain; none at all when there is no bloom. */
  bloomLevels: number;
  /**
   * Whether the picture is being drawn by the processor. Every pixel of
   * every pass is then main-thread time in all but name — the page waits on
   * the rasteriser — so such a device is asked for the least picture there
   * is: the low tier, no bloom, and the governor's floor from the first
   * frame rather than after ten seconds of finding out.
   */
  software: boolean;
}

/**
 * A hook for looking closely: `window.__fieldQuality = { governor: false }`
 * pins the resolution (a software rasteriser in a test run is always "too
 * slow", and a screenshot wants every pixel), `pixelRatio` overrides the
 * ratio outright, and `tier: 'high'` asks for the whole picture whatever is
 * drawing it — which is how the screenshots are taken, on a machine with no
 * graphics hardware.
 */
interface QualityOverride {
  governor?: boolean;
  pixelRatio?: number;
  tier?: Tier;
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

/** As much of a GL context as it takes to ask what is drawing it. */
interface RendererInfoSource {
  getExtension(name: string): unknown;
  getParameter(name: number): unknown;
  RENDERER: number;
}

// The names the software rasterisers go by: Chrome's (SwiftShader), Mesa's
// (llvmpipe, softpipe), Windows' (the Basic Render Driver), and whatever
// simply says so.
const SOFTWARE_RENDERERS =
  /swiftshader|llvmpipe|softpipe|software|basic render/i;

/**
 * Whether a GL context is drawn by the processor rather than by graphics
 * hardware: a machine with none, a driver the browser will not trust, or a
 * test run. Asked of the renderer's own name, which a browser may decline to
 * give — in which case the answer is no, and the governor finds out the slow
 * way.
 */
export const isSoftwareRenderer = (
  gl: RendererInfoSource | null | undefined
): boolean => {
  if (!gl || typeof gl.getExtension !== 'function') return false;
  try {
    const info = gl.getExtension('WEBGL_debug_renderer_info') as {
      UNMASKED_RENDERER_WEBGL: number;
    } | null;
    const name = gl.getParameter(
      info ? info.UNMASKED_RENDERER_WEBGL : gl.RENDERER
    );
    return SOFTWARE_RENDERERS.test(String(name ?? ''));
  } catch {
    return false;
  }
};

export const resolveQuality = (gl?: RendererInfoSource | null): Quality => {
  const override = readOverride();
  // Asked for by name, the whole picture is given whatever is drawing it.
  const software = override.tier !== 'high' && isSoftwareRenderer(gl);
  const tier: Tier =
    override.tier ??
    (software || isCompactViewport() || coarsePointer() ? 'low' : 'high');
  const pixelRatio = override.pixelRatio ?? getRenderPixelRatio();
  return {
    tier,
    pixelRatio,
    // A dense screen needs less help with its edges than a sparse one, and a
    // phone's GPU is better spent elsewhere.
    samples: tier === 'low' ? 0 : pixelRatio > 1.5 ? 2 : 4,
    bloomLevels: software ? 0 : tier === 'low' ? 4 : 5,
    software,
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
 * How far down a software rasteriser is taken: about an eighth of the
 * pixels. Lower than any graphics hardware is ever asked to go, because the
 * arithmetic is different in kind — there every pixel is the processor's,
 * and the page's own work is waiting behind it. Measured on one (see
 * docs/design/03-fields-and-glass.md, §9): at the ordinary floor a frame of
 * the waves cost three times what the flat field it replaced did.
 */
export const SOFTWARE_FLOOR = 0.35;

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

  /**
   * `fromFloor` starts at the least it will ever ask for and works up, for
   * a device already known to be slow: it is spared the seconds it would
   * have spent proving it, and still gets its pixels back if it turns out
   * to have the room.
   */
  constructor(options: Partial<GovernorOptions> = {}, fromFloor = false) {
    this.options = { ...DEFAULT_GOVERNOR, ...options };
    if (fromFloor) this.scale = this.options.floor;
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
