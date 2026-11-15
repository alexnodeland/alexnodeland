import {
  calculateSubgraphConductivity,
  createClusteredGraph,
  readingPose,
  restPose,
  showPose,
} from '../../../../components/animated-backgrounds/backgrounds/graph-topology/GraphTopologyBackground';
import { distanceToFit } from '../../../../components/animated-backgrounds/core/stage/rig';

// A generator a test can replay: the layout and the search are both seeded.
const seeded = (seed: number) => () => {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return seed / 4294967296;
};

/**
 * The scene's own contract with the page — mounting, drawing, holding still,
 * the 404 — is asked of all six backgrounds together (scenes.test.tsx). What
 * is here is the scheduler's own: the network it is shown, the score it
 * searches on, and where the camera stands to watch.
 */
describe('the scheduler’s network', () => {
  it('has the machines it was asked for, in the datacenters it was asked for', () => {
    const { nodes, edges } = createClusteredGraph(32, 3, seeded(7));
    expect(nodes).toHaveLength(32);
    expect(nodes.map(node => node.id)).toEqual(
      Array.from({ length: 32 }, (_, i) => i)
    );
    for (const edge of edges) {
      expect(edge.source).not.toBe(edge.target);
      expect(nodes[edge.source]).toBeDefined();
      expect(nodes[edge.target]).toBeDefined();
      expect(edge.weight).toBeGreaterThan(0);
    }
  });

  it('gives a remainder of machines to the last datacenter rather than dropping them', () => {
    expect(createClusteredGraph(10, 3, seeded(1)).nodes).toHaveLength(10);
  });

  it('is the same network for the same seed', () => {
    const one = createClusteredGraph(24, 3, seeded(42));
    const other = createClusteredGraph(24, 3, seeded(42));
    expect(other).toEqual(one);
  });

  it('links a rack far better than it links two datacenters', () => {
    const { edges } = createClusteredGraph(30, 3, seeded(3));
    // Same-rack links are a tenth of a millisecond to one; the ones between
    // datacenters are five to twenty.
    const local = edges.filter(edge => edge.latencyMs <= 1);
    const remote = edges.filter(edge => edge.latencyMs >= 5);
    expect(local.length).toBeGreaterThan(remote.length);
    expect(Math.min(...local.map(edge => edge.weight))).toBeGreaterThan(
      Math.max(...remote.map(edge => edge.weight))
    );
  });
});

describe('the score the scheduler searches on', () => {
  // Two racks of three, well linked inside, joined by one thin link.
  const edges = [
    { source: 0, target: 1, latencyMs: 1, weight: 100 },
    { source: 1, target: 2, latencyMs: 1, weight: 100 },
    { source: 0, target: 2, latencyMs: 1, weight: 100 },
    { source: 3, target: 4, latencyMs: 1, weight: 100 },
    { source: 4, target: 5, latencyMs: 1, weight: 100 },
    { source: 3, target: 5, latencyMs: 1, weight: 100 },
    { source: 2, target: 3, latencyMs: 10, weight: 1 },
  ];

  it('prefers a rack to a set that straddles two', () => {
    const rack = calculateSubgraphConductivity(new Set([0, 1, 2]), edges, 6);
    const straddling = calculateSubgraphConductivity(
      new Set([1, 2, 3]),
      edges,
      6
    );
    expect(rack).toBeGreaterThan(straddling);
  });

  it('will not take nothing, everything, or machines with no link between them', () => {
    expect(calculateSubgraphConductivity(new Set(), edges, 6)).toBe(-Infinity);
    expect(
      calculateSubgraphConductivity(new Set([0, 1, 2, 3, 4, 5]), edges, 6)
    ).toBe(-Infinity);
    expect(calculateSubgraphConductivity(new Set([0, 4]), edges, 6)).toBe(
      -Infinity
    );
  });

  it('penalises a set far from half the network either way', () => {
    const half = calculateSubgraphConductivity(new Set([0, 1, 2]), edges, 6);
    const pair = calculateSubgraphConductivity(new Set([0, 1]), edges, 6);
    expect(half).toBeGreaterThan(pair);
  });
});

describe('where the scheduler’s camera stands', () => {
  it.each([
    ['a desktop', 16 / 9],
    ['a phone', 390 / 844],
  ])('rests closer than the whole network on %s', (_name, aspect) => {
    // The page's window covers the middle of the screen; from close in, the
    // clusters stand around it rather than under it.
    expect(restPose(aspect).distance).toBeLessThan(showPose(aspect).distance);
  });

  it('stands lower with the page out of the way, so the lifted set stands clear', () => {
    expect(showPose(1.6).elevation).toBeLessThan(restPose(1.6).elevation);
  });

  it('reads the number from straight overhead, where the screen is the plane it was laid out in', () => {
    const pose = readingPose();
    expect(pose.elevation).toBeCloseTo(Math.PI / 2);
    expect(pose.target).toEqual([0, 0, 0]);
    // One unit of the layout either side of the centre fills the height.
    expect(pose.distance).toBeCloseTo(distanceToFit(1, pose.fov));
  });
});
