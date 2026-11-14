import type * as Three from 'three';
import { writeVertexNormals } from '../../../../../../components/animated-backgrounds/backgrounds/pde-solver/PDESolverBackground';

/**
 * The plate's normals are written by hand on every frame, because three's own
 * `computeVertexNormals` was most of a frame's work. The hand-written pass has
 * one job: to give the answer that would have.
 *
 * Three itself cannot be asked — the shared setup stands a mock in for it,
 * and its real build is an ES module Jest cannot load — so the plate here is
 * laid out the way `THREE.PlaneGeometry` lays one out (rows from the top, two
 * triangles a cell, wound so that a flat plate faces +z), and
 * `computeVertexNormals` is written out below as what it is: every face's
 * cross product added to its three corners, and each corner's total
 * normalised.
 */
const plate = (
  cols: number,
  rows: number,
  size: { width: number; height: number },
  heightAt: (x: number, y: number) => number
) => {
  const position = new Float32Array(cols * rows * 3);
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = (col / (cols - 1) - 0.5) * size.width;
      const y = (0.5 - row / (rows - 1)) * size.height;
      position.set([x, y, heightAt(x, y)], (row * cols + col) * 3);
    }
  }
  const corners: number[] = [];
  for (let row = 0; row < rows - 1; row++) {
    for (let col = 0; col < cols - 1; col++) {
      const a = col + cols * row;
      const b = col + cols * (row + 1);
      const c = col + 1 + cols * (row + 1);
      const d = col + 1 + cols * row;
      corners.push(a, b, d, b, c, d);
    }
  }
  const normal = {
    array: new Float32Array(position.length),
    count: cols * rows,
    needsUpdate: false,
  };
  const geometry = {
    parameters: {
      ...size,
      widthSegments: cols - 1,
      heightSegments: rows - 1,
    },
    index: { array: Uint32Array.from(corners) },
    attributes: { position: { array: position, count: cols * rows }, normal },
    computeVertexNormals: jest.fn(),
  };
  return {
    geometry: geometry as unknown as Three.PlaneGeometry,
    raw: geometry,
    position,
    corners,
    normal,
  };
};

/** `BufferGeometry.computeVertexNormals`, for an indexed mesh. */
const faceSummedNormals = (position: Float32Array, corners: number[]) => {
  const normal = new Float64Array(position.length);
  for (let f = 0; f < corners.length; f += 3) {
    const [a, b, c] = corners.slice(f, f + 3).map(corner => corner * 3);
    const cb = [0, 1, 2].map(k => position[c + k] - position[b + k]);
    const ab = [0, 1, 2].map(k => position[a + k] - position[b + k]);
    const face = [
      cb[1] * ab[2] - cb[2] * ab[1],
      cb[2] * ab[0] - cb[0] * ab[2],
      cb[0] * ab[1] - cb[1] * ab[0],
    ];
    for (const corner of [a, b, c]) {
      face.forEach((part, k) => (normal[corner + k] += part));
    }
  }
  for (let at = 0; at < normal.length; at += 3) {
    const length = Math.hypot(normal[at], normal[at + 1], normal[at + 2]);
    for (let k = 0; k < 3; k++) normal[at + k] /= length;
  }
  return normal;
};

const relief = (x: number, y: number) =>
  0.3 * Math.sin(2.3 * x + 0.4) * Math.cos(1.7 * y) + 0.1 * x * y;

describe('PDE solver vertex normals', () => {
  it('gives every vertex what summing its faces gives — the edges and corners too', () => {
    // Not square, and not square-celled: a row mistaken for a column, or one
    // spacing for the other, shows.
    const { geometry, position, corners, normal } = plate(
      23,
      17,
      { width: 2, height: 3 },
      relief
    );
    writeVertexNormals(geometry);

    const expected = faceSummedNormals(position, corners);
    for (let at = 0; at < expected.length; at++) {
      expect(normal.array[at]).toBeCloseTo(expected[at], 5);
    }
  });

  it('does the same on the plate the solver draws', () => {
    const { geometry, position, corners, normal } = plate(
      128,
      128,
      { width: 2, height: 2 },
      (x, y) => 0.15 * relief(x, y)
    );
    writeVertexNormals(geometry);

    const expected = faceSummedNormals(position, corners);
    let widest = 0;
    for (let at = 0; at < expected.length; at++) {
      widest = Math.max(widest, Math.abs(normal.array[at] - expected[at]));
    }
    expect(widest).toBeLessThan(1e-5);
  });

  it('gives a tilted plate one normal everywhere: the plane’s own', () => {
    // z = 0.2x + 0.1y. Every face lies in the plane, so every vertex's
    // normal is the plane's, exactly, whatever the weighting.
    const { geometry, normal } = plate(
      9,
      9,
      { width: 2, height: 2 },
      (x, y) => 0.2 * x + 0.1 * y
    );
    writeVertexNormals(geometry);

    const length = Math.hypot(-0.2, -0.1, 1);
    for (let at = 0; at < normal.array.length; at += 3) {
      expect(normal.array[at]).toBeCloseTo(-0.2 / length, 5);
      expect(normal.array[at + 1]).toBeCloseTo(-0.1 / length, 5);
      expect(normal.array[at + 2]).toBeCloseTo(1 / length, 5);
    }
  });

  it('faces a flat plate straight up', () => {
    const { geometry, normal } = plate(5, 4, { width: 2, height: 2 }, () => 0);
    writeVertexNormals(geometry);
    for (let at = 0; at < normal.array.length; at += 3) {
      expect(normal.array[at]).toBeCloseTo(0, 10);
      expect(normal.array[at + 1]).toBeCloseTo(0, 10);
      expect(normal.array[at + 2]).toBe(1);
    }
  });

  it('marks the normals for upload', () => {
    const { geometry, normal } = plate(4, 4, { width: 2, height: 2 }, () => 0);
    writeVertexNormals(geometry);
    expect(normal.needsUpdate).toBe(true);
  });

  describe('a mesh it was not written for is left to three', () => {
    it('one with no index', () => {
      const { geometry, raw } = plate(4, 4, { width: 2, height: 2 }, () => 0);
      (raw as { index: unknown }).index = null;
      writeVertexNormals(geometry);
      expect(raw.computeVertexNormals).toHaveBeenCalledTimes(1);
    });

    it('one that is not a plane of the size its vertices say', () => {
      const { geometry, raw } = plate(4, 4, { width: 2, height: 2 }, () => 0);
      raw.parameters.widthSegments = 7;
      writeVertexNormals(geometry);
      expect(raw.computeVertexNormals).toHaveBeenCalledTimes(1);
    });

    it('one with no parameters at all', () => {
      const { geometry, raw } = plate(4, 4, { width: 2, height: 2 }, () => 0);
      (raw as { parameters: unknown }).parameters = undefined;
      writeVertexNormals(geometry);
      expect(raw.computeVertexNormals).toHaveBeenCalledTimes(1);
    });
  });
});
