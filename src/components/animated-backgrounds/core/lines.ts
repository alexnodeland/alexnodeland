import type * as THREE from 'three';
import type { Line2 } from 'three/examples/jsm/lines/Line2.js';

/**
 * Moves a two-point Line2's ends in place.
 *
 * `LineGeometry.setPositions` allocates a fresh interleaved buffer on every
 * call, and a graph of a few hundred edges moves every one of them every
 * frame while its nodes are in flight. The geometry's instanceStart and
 * instanceEnd share one buffer — six floats, the two ends — so writing that
 * and flagging it is the whole update.
 */
export const writeLine = (
  line: Line2,
  ax: number,
  ay: number,
  bx: number,
  by: number
): void => {
  const attribute = line.geometry.attributes.instanceStart as
    | THREE.InterleavedBufferAttribute
    | undefined;
  const buffer = attribute?.data;
  if (buffer && buffer.array.length >= 6) {
    const array = buffer.array as Float32Array;
    array[0] = ax;
    array[1] = ay;
    array[2] = 0;
    array[3] = bx;
    array[4] = by;
    array[5] = 0;
    buffer.needsUpdate = true;
  } else {
    line.geometry.setPositions([ax, ay, 0, bx, by, 0]);
  }
};

/**
 * Nodes in flight between two layouts of a graph: where each set off from,
 * where it is going, and the ease between. What both graph backgrounds use
 * to swap one graph for another without a cut.
 */
export interface Morph {
  from: Float32Array;
  to: Float32Array;
  start: number;
  duration: number;
}

/** 0 → 1 along a morph at `now`, eased out; 1 once it is over. */
export const morphProgress = (morph: Morph, now: number): number => {
  const t = Math.min(1, (now - morph.start) / morph.duration);
  return 1 - Math.pow(1 - t, 3);
};

export interface Positioned {
  position: { x: number; y: number };
}

/**
 * Sets `next`'s nodes off from where `previous`'s were — each from the old
 * node at its index, wrapping, so a bigger graph grows out of a smaller one
 * — and returns the morph that will carry them to their places. With no
 * duration the nodes are simply left where they are, and there is no morph.
 */
export const beginMorph = (
  previous: Positioned[],
  next: Positioned[],
  now: number,
  duration: number
): Morph | null => {
  if (duration <= 0) return null;
  const count = next.length;
  const from = new Float32Array(count * 2);
  const to = new Float32Array(count * 2);
  for (let i = 0; i < count; i++) {
    const origin = previous.length
      ? previous[i % previous.length].position
      : next[i].position;
    from[i * 2] = origin.x;
    from[i * 2 + 1] = origin.y;
    to[i * 2] = next[i].position.x;
    to[i * 2 + 1] = next[i].position.y;
    next[i].position.x = origin.x;
    next[i].position.y = origin.y;
  }
  return { from, to, start: now, duration };
};

/**
 * Carries `nodes` along a morph at `now`, writing their positions. True once
 * they have arrived.
 */
export const advanceMorph = (
  morph: Morph,
  nodes: Positioned[],
  now: number
): boolean => {
  const t = morphProgress(morph, now);
  const { from, to } = morph;
  for (let i = 0; i < nodes.length; i++) {
    nodes[i].position.x = from[i * 2] + (to[i * 2] - from[i * 2]) * t;
    nodes[i].position.y =
      from[i * 2 + 1] + (to[i * 2 + 1] - from[i * 2 + 1]) * t;
  }
  return t >= 1;
};
