import { act, render } from '@testing-library/react';
import React from 'react';
import * as THREE from 'three';
import { pdeSolverConfig } from '../../../../../../components/animated-backgrounds/backgrounds/pde-solver/config';
import PDESolverBackground from '../../../../../../components/animated-backgrounds/backgrounds/pde-solver/PDESolverBackground';
import { getCompleteSettings } from '../../../../../../components/animated-backgrounds/core/baseConfig';
import { setReadout } from '../../../../../../components/animated-backgrounds/core/stage/telemetry';

/**
 * How the membrane comes on and goes off.
 *
 * What it looks like is the films' to say. What can be asked here is the
 * arithmetic the picture hangs on: that a settled plate is showing all of
 * its relief at full strength, that one which has left is showing none and
 * emitting nothing — the plate, its reflection and the bench alike — and
 * that a leave taken back puts everything where it was.
 */

interface StubRenderer {
  render: jest.Mock;
}

const renderers = (): StubRenderer[] =>
  (THREE.WebGLRenderer as unknown as { instances: StubRenderer[] }).instances;

const settings = getCompleteSettings(pdeSolverConfig as never) as never;

const frames = async (ms = 120) => {
  await act(async () => {
    await new Promise(resolve => setTimeout(resolve, ms));
  });
};

// Frames, until something is so. The machine's clock is not the scene's —
// a busy one delivers long frames and the stage counts each as a tenth of a
// second at most — so nothing here is timed by the wall.
const until = async (done: () => boolean, limit = 150) => {
  const so = () => renderers().length > 0 && done();
  await frames(40);
  for (let i = 0; i < limit && !so(); i++) await frames(40);
  if (!so()) throw new Error('the scene never got there');
};

type Uniforms = Record<string, { value: number }>;

interface Parts {
  plate: THREE.Object3D;
  reflection: THREE.Object3D;
  surface: Uniforms;
  mirror: Uniforms;
  bench: Uniforms;
}

// The scene is whatever the renderer was last asked to draw that has the
// membrane in it: the plate, then its reflection, then the bench's grid.
const parts = (): Parts => {
  const [renderer] = renderers();
  const call = [...renderer.render.mock.calls].reverse().find(([scene]) => {
    let found = false;
    (scene as THREE.Scene).traverse(object => {
      const material = (object as THREE.Mesh).material as
        THREE.ShaderMaterial | undefined;
      if (material?.uniforms?.uSwell) found = true;
    });
    return found;
  });
  if (!call) throw new Error('the membrane was never drawn');
  const membranes: THREE.Mesh[] = [];
  let bench: Uniforms | null = null;
  (call[0] as THREE.Scene).traverse(object => {
    const material = (object as THREE.Mesh).material as
      THREE.ShaderMaterial | undefined;
    if (material?.uniforms?.uSwell) membranes.push(object as THREE.Mesh);
    else if (material?.uniforms?.uOpacity)
      bench = material.uniforms as unknown as Uniforms;
  });
  const [plate, mirror] = membranes;
  if (!plate || !mirror || !bench)
    throw new Error('part of the scene is missing');
  return {
    plate: plate.parent as THREE.Object3D,
    reflection: mirror.parent as THREE.Object3D,
    surface: (plate.material as THREE.ShaderMaterial)
      .uniforms as unknown as Uniforms,
    mirror: (mirror.material as THREE.ShaderMaterial)
      .uniforms as unknown as Uniforms,
    bench,
  };
};

describe('the membrane, coming on and going off', () => {
  beforeEach(() => {
    renderers().length = 0;
  });

  afterEach(() => {
    act(() => setReadout(''));
  });

  it('is all there once it has settled: full relief, full strength, in place', async () => {
    // A still is drawn settled, which is the steady state by another name.
    const { unmount } = render(
      <PDESolverBackground settings={settings} frozen />
    );
    await frames();
    const { plate, surface, mirror, bench } = parts();

    expect(surface.uSwell.value).toBe(1);
    expect(surface.uSlack.value).toBe(0);
    expect(mirror.uSwell.value).toBe(1);
    expect(mirror.uSlack.value).toBe(0);
    expect(surface.uStrength.value).toBe(1);
    expect(mirror.uStrength.value).toBeCloseTo(0.3);
    expect(bench.uOpacity.value).toBeCloseTo(0.2);
    expect(plate.position.y).toBeCloseTo(0);
    unmount();
  });

  it('arrives flat and unlit, and the relief comes up through it afterwards', async () => {
    const { unmount } = render(<PDESolverBackground settings={settings} />);
    await until(() => parts().surface.uStrength.value > 0);
    const early = parts();
    const startedAt = early.plate.position.y;
    // Lit and rising before there is any relief worth the name, and the
    // bench not yet there to stand over.
    expect(early.surface.uStrength.value).toBeLessThan(1);
    expect(early.surface.uSwell.value).toBe(0);
    expect(startedAt).toBeLessThan(0);
    expect(early.bench.uOpacity.value).toBe(0);

    await until(() => parts().surface.uSwell.value > 0.2);
    const later = parts();
    expect(later.surface.uSwell.value).toBeLessThan(1);
    expect(later.plate.position.y).toBeGreaterThan(startedAt);
    expect(later.bench.uOpacity.value).toBeGreaterThan(0);
    unmount();
  });

  it('goes slack, sinks to the bench and leaves no light behind', async () => {
    const view = render(<PDESolverBackground settings={settings} frozen />);
    await frames();

    // A still has no movement to leave by, so asked to go it is simply gone:
    // the end of the leaving in one frame.
    view.rerender(
      <PDESolverBackground settings={settings} frozen leaving leaveMs={650} />
    );
    await frames();
    const gone = parts();
    expect(gone.surface.uSlack.value).toBe(1);
    expect(gone.surface.uStrength.value).toBe(0);
    expect(gone.mirror.uStrength.value).toBe(0);
    expect(gone.bench.uOpacity.value).toBe(0);
    // Down on the bench, where the plate and its reflection are one thing.
    expect(gone.plate.position.y).toBeCloseTo(gone.reflection.position.y);
    expect(gone.plate.position.y).toBeLessThan(-0.4);

    // Taken back, it is where it was.
    view.rerender(<PDESolverBackground settings={settings} frozen />);
    await frames();
    const back = parts();
    expect(back.surface.uSlack.value).toBe(0);
    expect(back.surface.uStrength.value).toBe(1);
    expect(back.mirror.uStrength.value).toBeCloseTo(0.3);
    expect(back.bench.uOpacity.value).toBeCloseTo(0.2);
    expect(back.plate.position.y).toBeCloseTo(0);
    view.unmount();
  });

  it('lets the relief go before the light, on the way out', async () => {
    const view = render(<PDESolverBackground settings={settings} />);
    // Past the arrival, so what is seen leaving is a settled plate.
    await until(() => parts().surface.uSwell.value === 1);
    await until(() => parts().bench.uOpacity.value > 0.1999);
    expect(parts().surface.uStrength.value).toBe(1);

    view.rerender(
      <PDESolverBackground settings={settings} leaving leaveMs={4000} />
    );
    await until(() => parts().surface.uSlack.value > 0.3);
    const midway = parts();
    expect(midway.surface.uSlack.value).toBeLessThan(1);
    expect(midway.surface.uStrength.value).toBeGreaterThan(0.9);
    expect(midway.plate.position.y).toBeLessThanOrEqual(0);

    await until(() => parts().surface.uStrength.value === 0);
    const gone = parts();
    expect(gone.surface.uSlack.value).toBe(1);
    expect(gone.mirror.uStrength.value).toBe(0);
    expect(gone.bench.uOpacity.value).toBe(0);
    expect(gone.plate.position.y).toBeCloseTo(gone.reflection.position.y);
    view.unmount();
  });
});
