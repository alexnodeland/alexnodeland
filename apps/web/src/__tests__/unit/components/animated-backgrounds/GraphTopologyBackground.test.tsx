import { act, render } from '@testing-library/react';
import React from 'react';
import * as THREE from 'three';
import { graphTopologyConfig } from '../../../../components/animated-backgrounds/backgrounds/graph-topology/config';
import GraphTopologyBackground, {
  benchShown,
  calculateSubgraphConductivity,
  createClusteredGraph,
  dropLinesShown,
  lightShown,
  linkRun,
  NodePassage,
  nodePassage,
  readingPose,
  restPose,
  showPose,
} from '../../../../components/animated-backgrounds/backgrounds/graph-topology/GraphTopologyBackground';
import { getCompleteSettings } from '../../../../components/animated-backgrounds/core/baseConfig';
import { distanceToFit } from '../../../../components/animated-backgrounds/core/stage/rig';
import { setReadout } from '../../../../components/animated-backgrounds/core/stage/telemetry';

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

describe('the network being wired up, and unplugged', () => {
  const at = (intro: number, outro: number, order: number): NodePassage =>
    nodePassage(intro, outro, order, { height: 0, size: 1, glint: 0 });

  it('is exactly the network once it has arrived and until it is asked to go', () => {
    for (const order of [0, 0.37, 1]) {
      expect(at(1, 0, order)).toEqual({ height: 0, size: 1, glint: 0 });
      expect(linkRun(1, 0, order)).toBe(1);
    }
    expect(benchShown(1, 0)).toBe(1);
    expect(dropLinesShown(1, 0)).toBe(1);
    expect(lightShown(0)).toBe(1);
  });

  it('starts from a bare bench: no machine has a size and no link any length', () => {
    for (const order of [0, 0.5, 1]) {
      expect(at(0, 0, order).size).toBe(0);
      expect(at(0, 0, order).height).toBeGreaterThan(0.3);
      expect(linkRun(0, 0, order)).toBe(0);
    }
    expect(benchShown(0, 0)).toBe(0);
  });

  it('sets the machines down in the order they are numbered', () => {
    // A third of the way in the first is on the bench, one from the middle
    // of the queue is on its way down, and the last has not appeared.
    expect(at(0.34, 0, 0)).toMatchObject({ height: 0, size: 1 });
    const falling = at(0.34, 0, 0.5);
    expect(falling.size).toBeGreaterThan(0);
    expect(falling.height).toBeGreaterThan(0);
    expect(at(0.34, 0, 1).size).toBe(0);
  });

  it('lands a machine with a little weight: past its place, and back to it', () => {
    const heights = Array.from(
      { length: 60 },
      (_, i) => at((i / 59) * 0.25, 0, 0).height
    );
    expect(Math.min(...heights)).toBeLessThan(0);
    expect(Math.min(...heights)).toBeGreaterThan(-0.05);
    expect(heights[heights.length - 1]).toBeCloseTo(0, 5);
  });

  it('runs no link to a machine that has not landed yet', () => {
    for (const order of [0, 0.25, 0.5, 0.75, 1]) {
      for (let intro = 0; intro <= 1; intro += 0.01) {
        if (linkRun(intro, 0, order) > 0) {
          // The later of its two machines is all but down by then.
          expect(at(intro, 0, order).height).toBeLessThan(0.05);
          expect(at(intro, 0, order).size).toBe(1);
          break;
        }
      }
      // …and every link is run by the time the arrival is over.
      expect(linkRun(0.95, 0, order)).toBe(1);
    }
  });

  it('only ever runs a link further as the scene arrives', () => {
    let previous = 0;
    for (let intro = 0; intro <= 1.0001; intro += 0.02) {
      const run = linkRun(intro, 0, 0.6);
      expect(run).toBeGreaterThanOrEqual(previous);
      previous = run;
    }
  });

  it('pulls the links back before it lets the machines go, last down first away', () => {
    // A little way into the leaving the last link to be run is on its way
    // back while the first is still whole, and no machine has moved.
    expect(linkRun(1, 0.2, 1)).toBeLessThan(1);
    expect(linkRun(1, 0.2, 0)).toBe(1);
    expect(at(1, 0.2, 1)).toEqual({ height: 0, size: 1, glint: 0 });

    // Further in, the last machine down is rising while the first sits.
    expect(at(1, 0.5, 1).height).toBeGreaterThan(0);
    expect(at(1, 0.5, 1).size).toBeLessThan(1);
    expect(at(1, 0.5, 0)).toEqual({ height: 0, size: 1, glint: 0 });
    // By which point there is hardly a link left to hold any of them.
    expect(linkRun(1, 0.62, 0)).toBe(0);
  });

  it('has gone entirely by the end of the leaving', () => {
    for (const order of [0, 0.5, 1]) {
      expect(at(1, 1, order).size).toBe(0);
      expect(linkRun(1, 1, order)).toBe(0);
    }
    expect(benchShown(1, 1)).toBe(0);
    expect(dropLinesShown(1, 1)).toBe(0);
    expect(lightShown(1)).toBe(0);
  });

  it('comes back the way it went if the leaving is taken back', () => {
    // Nothing is remembered: where a machine is depends only on how far
    // gone the scene is, so the same number gives the same place.
    const going = at(1, 0.7, 0.4);
    at(1, 1, 0.4);
    expect(at(1, 0.7, 0.4)).toEqual(going);
    expect(at(1, 0.3, 0.4).size).toBeGreaterThan(going.size);
  });
});

describe('the scheduler, asked to leave', () => {
  interface StubRenderer {
    render: jest.Mock;
  }
  const renderers = (): StubRenderer[] =>
    (THREE.WebGLRenderer as unknown as { instances: StubRenderer[] }).instances;
  const settings = getCompleteSettings(graphTopologyConfig as never) as never;
  const frames = async (ms: number) => {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, ms));
    });
  };

  /** What the scene last drew: its own meshes, by what their materials take. */
  const drawn = () => {
    const calls = renderers()[0].render.mock.calls;
    let scene: THREE.Scene | null = null;
    for (const [candidate] of calls) {
      if ((candidate as THREE.Scene).children.length > 1) {
        scene = candidate as THREE.Scene;
      }
    }
    const uniforms: Array<Record<string, { value: unknown }>> = [];
    const counts: number[] = [];
    scene?.traverse(object => {
      const mesh = object as THREE.Mesh;
      const material = mesh.material as THREE.ShaderMaterial | undefined;
      if (!material?.uniforms) return;
      uniforms.push(material.uniforms);
      const geometry = mesh.geometry as THREE.InstancedBufferGeometry;
      if (geometry.isInstancedBufferGeometry) {
        counts.push(geometry.instanceCount);
      }
    });
    return { uniforms, counts };
  };

  beforeEach(() => {
    renderers().length = 0;
  });

  afterEach(() => {
    act(() => setReadout(''));
  });

  it('leaves nothing lit behind it, and no link drawn', async () => {
    const { rerender, unmount } = render(
      <GraphTopologyBackground settings={settings} />
    );
    await frames(120);
    const before = drawn();
    expect(before.uniforms.length).toBeGreaterThanOrEqual(3);

    rerender(
      <GraphTopologyBackground settings={settings} leaving leaveMs={80} />
    );
    await frames(400);

    const after = drawn();
    const strengths = after.uniforms
      .filter(u => 'uStrength' in u)
      .map(u => u.uStrength.value);
    expect(strengths.length).toBeGreaterThanOrEqual(2);
    expect(strengths.every(value => value === 0)).toBe(true);
    const floors = after.uniforms.filter(u => 'uOpacity' in u);
    expect(floors.map(u => u.uOpacity.value)).toEqual([0]);
    // The ribbons: every link is back, and no drop line is standing.
    expect(Math.min(...after.counts)).toBe(0);
    unmount();
  });
});
