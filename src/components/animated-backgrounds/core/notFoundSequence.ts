/**
 * The clock every 404 sequence runs on.
 *
 * A background is asked for its 404 sequence by the `notFound` prop, and what
 * it does with that is its own — but how fast the number forms, and how it
 * lets go again when the reader leaves the page, is the same everywhere. This
 * keeps that in one place: a raw 0 → 1 that climbs while the flag is up and
 * falls back when it drops, eased into the progress the sequences read.
 *
 * Integrated from frame time, never computed from a start timestamp: a resize,
 * a slider, a tab coming back from the background — nothing restarts it.
 */

/**
 * How long the picture takes to come apart into the number, in seconds,
 * unless a sequence asks for its own time.
 */
export const NOT_FOUND_FORM_SECONDS = 7;

/** How long it takes to let the number go once the page is left. */
export const NOT_FOUND_RELEASE_SECONDS = 1.6;

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

export class NotFoundSequence {
  /** 0 → 1, linear in time. */
  raw = 0;
  /** Seconds since the sequence began; holds while it is released. */
  seconds = 0;
  /** How long this sequence takes to form. */
  readonly formSeconds: number;

  constructor(options: { formSeconds?: number } = {}) {
    this.formSeconds = options.formSeconds ?? NOT_FOUND_FORM_SECONDS;
  }

  /** The progress the sequences read: raw, eased so it neither snaps in nor out. */
  get value(): number {
    const t = this.raw;
    return t * t * (3 - 2 * t);
  }

  get active(): boolean {
    return this.raw > 0;
  }

  /** Advance by `dt` seconds toward the flag. */
  advance(dt: number, on: boolean): number {
    if (on) {
      this.raw = clamp01(this.raw + dt / this.formSeconds);
      this.seconds += dt;
    } else {
      this.raw = clamp01(this.raw - dt / NOT_FOUND_RELEASE_SECONDS);
      if (this.raw === 0) this.seconds = 0;
    }
    return this.value;
  }

  /**
   * Jump to the end. For a frame drawn under reduced motion, where the story
   * is told in one picture rather than seven seconds.
   */
  settle(on: boolean): number {
    this.raw = on ? 1 : 0;
    this.seconds = on ? this.formSeconds : 0;
    return this.value;
  }
}

/**
 * A resize worth rebuilding the number for. A phone's URL bar sliding in and
 * out changes the height by a tenth or so, many times over one flick; that is
 * not a new viewport, and rebuilding for it is exactly what makes a sequence
 * jump. A width change, or a real change in shape, is.
 */
export const viewportReshaped = (
  before: { width: number; height: number },
  after: { width: number; height: number }
): boolean => {
  if (before.width !== after.width) return true;
  const ratio = after.height / Math.max(1, before.height);
  return ratio > 1.25 || ratio < 0.8;
};
