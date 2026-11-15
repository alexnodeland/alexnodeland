import {
  generateRandomGraph,
  readingPose,
  reconstructPath,
  restPose,
  showPose,
} from '../../../../components/animated-backgrounds/backgrounds/shortest-path-lab/ShortestPathLabBackground';
import { distanceToFit } from '../../../../components/animated-backgrounds/core/stage/rig';

const seeded = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};

/**
 * The scene's contract with the page is asked of all six backgrounds
 * together (scenes.test.tsx). Here: the graph a search is given, the path it
 * hands back, and where the camera stands.
 */
describe('the graph a search is given', () => {
  it('has the nodes it was asked for, laid out inside the field', () => {
    const { nodes } = generateRandomGraph(36, 0.12, seeded(5));
    expect(nodes).toHaveLength(36);
    for (const node of nodes) {
      expect(Math.abs(node.position.x)).toBeLessThanOrEqual(0.9);
      expect(Math.abs(node.position.y)).toBeLessThanOrEqual(0.5);
    }
  });

  it('weighs an edge by its length, which is what makes the heuristic admissible', () => {
    const { nodes, edges } = generateRandomGraph(20, 0.3, seeded(9));
    expect(edges.length).toBeGreaterThan(0);
    for (const edge of edges) {
      const a = nodes[edge.source].position;
      const b = nodes[edge.target].position;
      expect(edge.weight).toBeCloseTo(Math.hypot(a.x - b.x, a.y - b.y));
      expect(edge.source).toBeLessThan(edge.target);
    }
  });

  it('has about the share of possible edges it was asked for', () => {
    const count = 40;
    const possible = (count * (count - 1)) / 2;
    const sparse = generateRandomGraph(count, 0.1, seeded(2)).edges.length;
    const dense = generateRandomGraph(count, 0.5, seeded(2)).edges.length;
    expect(sparse / possible).toBeGreaterThan(0.05);
    expect(sparse / possible).toBeLessThan(0.16);
    expect(dense / possible).toBeGreaterThan(0.42);
    expect(dense / possible).toBeLessThan(0.58);
  });

  it('is the same graph for the same seed', () => {
    expect(generateRandomGraph(16, 0.2, seeded(11))).toEqual(
      generateRandomGraph(16, 0.2, seeded(11))
    );
  });
});

describe('the path a search hands back', () => {
  it('runs from the start to the goal, in order', () => {
    // 0 → 3 → 7 → 2, as the search recorded it: each node's predecessor.
    const prev = new Map([
      [2, 7],
      [7, 3],
      [3, 0],
    ]);
    expect(reconstructPath(prev, 2)).toEqual([0, 3, 7, 2]);
  });

  it('is the goal alone when the goal is where it started', () => {
    expect(reconstructPath(new Map(), 4)).toEqual([4]);
  });
});

describe('where the pathfinder’s camera stands', () => {
  it.each([
    ['a desktop', 16 / 9],
    ['a phone', 390 / 844],
  ])('rests closer than the whole graph on %s', (_name, aspect) => {
    expect(restPose(aspect).distance).toBeLessThan(showPose(aspect).distance);
  });

  it('looks across the bench rather than down on it, so cost reads as height', () => {
    for (const pose of [restPose(1.6), showPose(1.6)]) {
      expect(pose.elevation).toBeLessThan(Math.PI / 4);
      expect(pose.elevation).toBeGreaterThan(0);
    }
    expect(showPose(1.6).elevation).toBeLessThan(restPose(1.6).elevation);
  });

  it('reads the number from straight overhead, flat', () => {
    const pose = readingPose();
    expect(pose.elevation).toBeCloseTo(Math.PI / 2);
    expect(pose.distance).toBeCloseTo(distanceToFit(1, pose.fov));
  });
});
