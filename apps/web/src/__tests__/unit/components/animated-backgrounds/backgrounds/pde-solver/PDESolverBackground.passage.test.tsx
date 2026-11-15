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
 * that a leave taken back puts everything where it was. A still is never
 * asked to leave: the stage holds it whole until it is taken away.
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
    // Watched all the way in, a sample at a time. Which moments get sampled
    // is the machine's business, so what is asked is what holds at every
    // one of them: the order things arrive in.
    const samples: Array<{
      lit: number;
      swell: number;
      bench: number;
      height: number;
    }> = [];
    await until(() => {
      const now = parts();
      samples.push({
        lit: now.surface.uStrength.value,
        swell: now.surface.uSwell.value,
        bench: now.bench.uOpacity.value / 0.2,
        height: now.plate.position.y,
      });
      return (
        now.surface.uSwell.value === 1 && now.bench.uOpacity.value > 0.1999
      );
    });

    // The arrival was seen, not just its end.
    expect(samples[0].swell).toBeLessThan(1);
    samples.forEach((sample, index) => {
      // The sheet is lit before it has relief, and has relief before the
      // bench is there to stand over.
      expect(sample.lit).toBeGreaterThanOrEqual(sample.swell);
      if (sample.bench > 0) expect(sample.swell).toBeGreaterThan(0);
      // It rises into place and never past it.
      expect(sample.height).toBeLessThanOrEqual(1e-9);
      if (index > 0)
        expect(sample.height).toBeGreaterThanOrEqual(samples[index - 1].height);
    });
    const settled = samples[samples.length - 1];
    expect(settled.lit).toBe(1);
    expect(settled.height).toBeCloseTo(0);
    unmount();
  });

  it('goes slack, sinks to the bench and leaves no light behind — and comes back if asked', async () => {
    const view = render(<PDESolverBackground settings={settings} />);
    // Past the arrival, so what is seen leaving is a settled plate.
    await until(
      () =>
        parts().surface.uSwell.value === 1 &&
        parts().bench.uOpacity.value > 0.1999
    );
    expect(parts().surface.uStrength.value).toBe(1);

    view.rerender(
      <PDESolverBackground settings={settings} leaving leaveMs={1500} />
    );
    // The relief goes before the light does: at no moment on the way out is
    // a sheet that still has some of its shape any dimmer than it was.
    await until(() => {
      const now = parts();
      if (now.surface.uSlack.value < 1)
        expect(now.surface.uStrength.value).toBe(1);
      expect(now.plate.position.y).toBeLessThanOrEqual(0);
      return now.surface.uStrength.value === 0;
    });
    const gone = parts();
    expect(gone.surface.uSlack.value).toBe(1);
    expect(gone.mirror.uSlack.value).toBe(1);
    expect(gone.mirror.uStrength.value).toBe(0);
    expect(gone.bench.uOpacity.value).toBe(0);
    // Down on the bench, where the plate and its reflection are one thing.
    expect(gone.plate.position.y).toBeCloseTo(gone.reflection.position.y);
    expect(gone.plate.position.y).toBeLessThan(-0.4);

    // Taken back, it returns to where it was.
    view.rerender(<PDESolverBackground settings={settings} />);
    await until(() => parts().surface.uSlack.value === 0);
    const back = parts();
    expect(back.surface.uSwell.value).toBe(1);
    expect(back.surface.uStrength.value).toBe(1);
    expect(back.mirror.uStrength.value).toBeCloseTo(0.3);
    expect(back.bench.uOpacity.value).toBeCloseTo(0.2);
    expect(back.plate.position.y).toBeCloseTo(0);
    view.unmount();
  });
});
