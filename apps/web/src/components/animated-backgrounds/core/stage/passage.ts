/**
 * Coming on and going off.
 *
 * A background used to change by the lights going down: a black sheet faded
 * over the field, the scene under it was swapped, and the sheet came off
 * again. It hid a cut. Now the scene itself leaves — the stage tells it how
 * far gone it is (`frame.outro`), as it tells it how far it has arrived
 * (`frame.intro`) — and each one goes the way the thing it is would: waves
 * die down from the source outward, a board is cleared, a trace collapses to
 * a line and the line to a dot. What is left between two scenes is the ground
 * they both stand on.
 *
 * This file is what the six share: which way the set is being walked through
 * (so the camera can carry one swing across the change), and the arithmetic
 * of doing something to many elements one after another.
 */

export type Heading = 1 | -1;

// Which way the last step through the set went: forward (the cycle, the right
// arrow) or back. Module state on purpose — the scene that leaves and the
// scene that arrives are different stages, and the direction is the one thing
// that has to survive between them.
let current: Heading = 1;

export const setHeading = (next: Heading): void => {
  current = next;
};

export const heading = (): Heading => current;

export const clamp01 = (t: number): number => Math.min(1, Math.max(0, t));

export const smooth = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};

/** Slow to start: something being let go of. */
export const easeIn = (t: number): number => {
  const x = clamp01(t);
  return x * x * x;
};

/** Slow to finish: something settling. */
export const easeOut = (t: number): number => {
  const x = 1 - clamp01(t);
  return 1 - x * x * x;
};

/** Past its mark and back to it: something landing with a little weight. */
export const easeOutBack = (t: number, overshoot = 1.4): number => {
  const x = clamp01(t) - 1;
  return 1 + (overshoot + 1) * x * x * x + overshoot * x * x;
};

/**
 * One element's share of a whole movement.
 *
 * `progress` is the movement, 0 → 1. `order` is where in the queue this
 * element stands, 0 (first) → 1 (last). `span` is how much of the whole each
 * one takes: at 1 they all move together, and the smaller it is the more the
 * movement reads as a front passing through them. The result is that
 * element's own 0 → 1, linear — ease it however suits what it is doing.
 */
export const staggered = (
  progress: number,
  order: number,
  span: number
): number => {
  const width = Math.min(1, Math.max(1e-4, span));
  return clamp01((clamp01(progress) - clamp01(order) * (1 - width)) / width);
};

/**
 * The same, for a shader: `passage(progress, order, span)`. Prepend to a
 * vertex or fragment shader that staggers by an attribute or a position.
 */
export const PASSAGE_GLSL = /* glsl */ `
  float passage(float progress, float order, float span) {
    float width = clamp(span, 1e-4, 1.0);
    return clamp(
      (clamp(progress, 0.0, 1.0) - clamp(order, 0.0, 1.0) * (1.0 - width)) / width,
      0.0, 1.0
    );
  }
`;

/**
 * How present a scene is, in the two terms nearly every material wants:
 *
 *   arrive — 0 → 1 as it comes on, eased, and held at 1 thereafter.
 *   leave  — 0 → 1 as it goes off; 0 until it is asked to.
 *   light  — what to multiply a material's strength by so that the last of
 *            the scene's light has gone when it has. It holds through most of
 *            the leaving, because the leaving is the movement's to show, and
 *            only then comes down.
 */
export interface Presence {
  arrive: number;
  leave: number;
  light: number;
}

export const presenceOf = (frame: {
  intro: number;
  outro: number;
}): Presence => {
  const arrive = smooth(frame.intro);
  const leave = clamp01(frame.outro);
  return {
    arrive,
    leave,
    light: arrive * (1 - smooth((leave - 0.55) / 0.45)),
  };
};
