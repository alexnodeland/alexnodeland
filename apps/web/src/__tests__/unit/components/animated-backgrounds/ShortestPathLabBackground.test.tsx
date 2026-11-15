import { act, render } from '@testing-library/react';
import React from 'react';
import * as THREE from 'three';
import { shortestPathLabConfig } from '../../../../components/animated-backgrounds/backgrounds/shortest-path-lab/config';
import ShortestPathLabBackground, {
  drawnShare,
  generateRandomGraph,
  readingPose,
  reconstructPath,
  restPose,
  showPose,
  standing,
  SURVEY_WIDTH,
  surveyed,
  surveyFront,
  surveyOrder,
} from '../../../../components/animated-backgrounds/backgrounds/shortest-path-lab/ShortestPathLabBackground';
import { getCompleteSettings } from '../../../../components/animated-backgrounds/core/baseConfig';
import { distanceToFit } from '../../../../components/animated-backgrounds/core/stage/rig';
import { setReadout } from '../../../../components/animated-backgrounds/core/stage/telemetry';

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

/**
 * Coming on and going off: the map is surveyed outward from the start node,
 * and rolled back up to it. One number — where the survey's front is — says
 * how much of every node and every edge there is.
 */
describe('the survey the pathfinder arrives and leaves by', () => {
  const line = [0, 0.25, 0.5, 1].map(x => ({ position: { x, y: 0 } }));

  it('orders the nodes by how far they are from the start', () => {
    const order = surveyOrder(line, 0, 1, 1, new Float32Array(4));
    expect(Array.from(order)).toEqual([0, 0.25, 0.5, 1]);

    // From the other end the same map is surveyed the other way.
    const back = surveyOrder(line, 3, 1, 1, new Float32Array(4));
    expect(back[3]).toBe(0);
    expect(back[0]).toBe(1);
  });

  it('measures across the bench as it is laid out, not as it was generated', () => {
    const nodes = [
      { position: { x: 0, y: 0 } },
      { position: { x: 0.5, y: 0 } },
      { position: { x: 0, y: 0.5 } },
    ];
    // Spread three times as deep as wide, the node up the bench is the far one.
    const order = surveyOrder(nodes, 0, 1, 3, new Float32Array(3));
    expect(order[2]).toBe(1);
    expect(order[1]).toBeCloseTo(1 / 3);
  });

  it('has found nothing as the scene begins, and all of it once arrived', () => {
    const before = surveyFront(0, 0);
    expect(surveyed(before, 0)).toBe(0);
    expect(drawnShare(before, 0, 0.01)).toBe(0);

    const arrived = surveyFront(1, 0);
    for (const order of [0, 0.3, 1]) expect(surveyed(arrived, order)).toBe(1);
    // Every edge whole, however short: the still and the steady picture are
    // exactly what they were.
    expect(drawnShare(arrived, 0.99, 1)).toBe(1);
    expect(drawnShare(arrived, 1, 1)).toBe(1);
    expect(standing(0)).toBe(1);
  });

  it('finds the near nodes first and the far ones last', () => {
    let last = -Infinity;
    for (let intro = 0; intro <= 1.0001; intro += 0.05) {
      const front = surveyFront(intro, 0);
      expect(front).toBeGreaterThanOrEqual(last);
      last = front;
      expect(surveyed(front, 0.2)).toBeGreaterThanOrEqual(surveyed(front, 0.8));
    }
    const midway = surveyFront(0.4, 0);
    expect(surveyed(midway, 0)).toBe(1);
    expect(surveyed(midway, 1)).toBe(0);
  });

  it('draws an edge from its nearer end, as far as the front has run along it', () => {
    // An edge from a node a fifth of the way out to one four fifths out.
    expect(drawnShare(0.2, 0.2, 0.8)).toBe(0);
    expect(drawnShare(0.5, 0.2, 0.8)).toBeCloseTo(0.5);
    expect(drawnShare(0.8, 0.2, 0.8)).toBe(1);
    // It reaches the far node as that node starts to swell, not after.
    expect(surveyed(0.8, 0.8)).toBe(0);
    expect(surveyed(0.8 + SURVEY_WIDTH / 2, 0.8)).toBeCloseTo(0.5);
    expect(surveyed(0.81 + SURVEY_WIDTH, 0.8)).toBe(1);
  });

  it('lets the landscape down first, then rolls the map up to the start', () => {
    // Early in a leaving the heights are going and the map is all there.
    const early = surveyFront(1, 0.12);
    expect(standing(0.12)).toBeLessThan(1);
    expect(surveyed(early, 1)).toBe(1);

    // By the time the far side has gone the bench is flat…
    const late = surveyFront(1, 0.6);
    expect(standing(0.6)).toBe(0);
    expect(surveyed(late, 1)).toBe(0);
    // …and the start is still there, the last thing to go.
    expect(surveyed(late, 0)).toBeGreaterThan(0);

    const gone = surveyFront(1, 1);
    expect(surveyed(gone, 0)).toBe(0);
    expect(drawnShare(gone, 0, 0.5)).toBe(0);
  });

  it('runs back out from where it had got to when a leaving is taken back', () => {
    let last = -Infinity;
    for (let outro = 1; outro >= -0.0001; outro -= 0.1) {
      const front = surveyFront(1, Math.max(0, outro));
      expect(front).toBeGreaterThanOrEqual(last);
      last = front;
    }
    expect(surveyFront(1, 0)).toBeGreaterThan(1 + SURVEY_WIDTH);
  });
});

describe('the pathfinder, asked to leave', () => {
  const settings = getCompleteSettings(shortestPathLabConfig as never);
  const Scene = ShortestPathLabBackground as unknown as React.ComponentType<{
    settings: never;
    leaving?: boolean;
    leaveMs?: number;
  }>;

  interface StubRenderer {
    render: jest.Mock;
  }
  const renderers = (): StubRenderer[] =>
    (THREE.WebGLRenderer as unknown as { instances: StubRenderer[] }).instances;

  const frames = async (ms = 120) => {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, ms));
    });
  };

  /** The strength of everything in the scene that has one, and the floor. */
  const light = () => {
    const calls = renderers()[0].render.mock.calls;
    const scene = calls
      .map(([drawn]) => drawn as THREE.Object3D)
      .reverse()
      .find(drawn => drawn instanceof THREE.Scene && drawn.children.length > 1);
    const strengths: number[] = [];
    scene?.traverse(object => {
      const uniforms = (
        (object as THREE.Mesh).material as THREE.ShaderMaterial | undefined
      )?.uniforms;
      if (uniforms?.uStrength) strengths.push(uniforms.uStrength.value);
      else if (uniforms?.uOpacity) strengths.push(uniforms.uOpacity.value);
    });
    return strengths;
  };

  beforeEach(() => {
    renderers().length = 0;
  });

  afterEach(() => {
    act(() => setReadout(''));
  });

  it('has put out every light by the time it has gone, and lit them again if told to stay', async () => {
    const { rerender, unmount } = render(
      <Scene settings={settings as never} />
    );
    await frames();
    expect(light().length).toBeGreaterThanOrEqual(3);
    expect(light().slice(0, 2)).toEqual([1, 1]);

    rerender(<Scene settings={settings as never} leaving leaveMs={60} />);
    await frames(260);
    expect(light()).toEqual(light().map(() => 0));

    rerender(<Scene settings={settings as never} />);
    await frames(260);
    expect(light().slice(0, 2)).toEqual([1, 1]);
    unmount();
  });
});
