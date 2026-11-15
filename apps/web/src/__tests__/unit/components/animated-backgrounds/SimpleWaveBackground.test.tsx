import { act, render } from '@testing-library/react';
import React from 'react';
import * as THREE from 'three';
import { simpleWaveConfig } from '../../../../components/animated-backgrounds/backgrounds/simple-waves/config';
import SimpleWaveBackground, {
  passageOf,
  readingPose,
  restPose,
  showPose,
} from '../../../../components/animated-backgrounds/backgrounds/simple-waves/SimpleWaveBackground';
import { getCompleteSettings } from '../../../../components/animated-backgrounds/core/baseConfig';
import { distanceToFit } from '../../../../components/animated-backgrounds/core/stage/rig';

/**
 * The scene's contract with the page is asked of all six backgrounds
 * together (scenes.test.tsx). The waves are drawn entirely in a shader, so
 * what is left to ask here is where the camera stands over them, and what
 * the shader is told as they come on and go off.
 */
describe('where the camera stands over the waves', () => {
  it.each([
    ['a desktop', 16 / 9],
    ['a phone', 390 / 844],
  ])('looks across the water, low, on %s', (_name, aspect) => {
    const pose = restPose(aspect);
    // A few degrees over the horizon: a surface seen edge-on is what turns
    // three sines into swell.
    expect(pose.elevation).toBeGreaterThan(0.1);
    expect(pose.elevation).toBeLessThan(0.4);
  });

  it('rises a little with the page out of the way, to show the pattern', () => {
    expect(showPose(1.6).elevation).toBeGreaterThan(restPose(1.6).elevation);
  });

  it('reads the number from straight overhead, where the screen is the plane it was drawn on', () => {
    const pose = readingPose();
    expect(pose.elevation).toBeCloseTo(Math.PI / 2);
    expect(pose.azimuth).toBe(0);
    expect(pose.distance).toBeCloseTo(distanceToFit(1, pose.fov));
  });
});

/**
 * Coming on and going off. The swell spreads over still water behind a
 * front, and is taken off it behind another; the shader is handed four
 * numbers for it, and those are arithmetic.
 */
describe('how the swell comes on and goes off', () => {
  const EVERYWHERE = 1e3;

  it('is the three sines and nothing else once arrived and not leaving', () => {
    // The steady picture must be the one it always was: the swell everywhere,
    // the calm nowhere, no wave on a front, all of the light.
    expect(passageOf(1, 0)).toEqual({
      swell: EVERYWHERE,
      calm: -EVERYWHERE,
      wave: 0,
      waveAt: 0,
      light: 1,
    });
  });

  it('starts from dark, still water', () => {
    const start = passageOf(0, 0);
    expect(start.swell).toBe(0);
    expect(start.light).toBe(0);
    expect(start.wave).toBe(0);
  });

  it('brings the water up ahead of the swell, and the swell out behind a crest', () => {
    let reached = -1;
    let crest = 0;
    for (let intro = 0; intro < 1; intro += 0.02) {
      const { swell, wave, waveAt, light } = passageOf(intro, 0);
      // The front only ever moves outward.
      expect(swell).toBeGreaterThanOrEqual(reached);
      reached = swell;
      // A crest, never a trough, and riding the front itself.
      expect(wave).toBeGreaterThanOrEqual(0);
      if (wave > 0) expect(waveAt).toBe(swell);
      crest = Math.max(crest, wave);
      // The light is up while the front still has most of the way to go.
      if (intro >= 0.3) expect(light).toBeCloseTo(1);
    }
    expect(crest).toBeGreaterThan(0.5);
    // By the end the front is past everything the fog lets through, so the
    // step to "everywhere" is a step nobody sees.
    expect(reached).toBeGreaterThan(18);
    // And the crest is spent before the front has finished.
    expect(passageOf(0.999, 0).wave).toBeCloseTo(0, 3);
  });

  it('lets the calm cross first and puts the light out after it', () => {
    let reached = -EVERYWHERE;
    let trough = 0;
    for (let outro = 0.02; outro <= 1.0001; outro += 0.02) {
      const { swell, calm, wave, waveAt, light } = passageOf(
        1,
        Math.min(1, outro)
      );
      // The swell is not taken back in: the calm overtakes it.
      expect(swell).toBe(EVERYWHERE);
      expect(calm).toBeGreaterThanOrEqual(reached);
      reached = calm;
      // A trough this time, and behind the calm's edge: on water that is
      // already flat, following the swell out.
      expect(wave).toBeLessThanOrEqual(0);
      if (wave < 0) expect(waveAt).toBeLessThan(calm);
      trough = Math.min(trough, wave);
      // The water is still lit while the calm is crossing the near part of
      // it, which is most of the picture.
      if (outro <= 0.5) expect(light).toBeCloseTo(1);
    }
    expect(trough).toBeLessThan(-0.4);
    const gone = passageOf(1, 1);
    expect(gone.calm).toBeGreaterThan(18);
    expect(gone.light).toBe(0);
    expect(gone.wave).toBeCloseTo(0, 6);
  });

  it('comes back from a leaving that is taken back', () => {
    // Part-way gone the calm is part-way out, and there is still light to
    // come back to; and nothing about a leaving is remembered, so back at
    // zero is simply the steady picture.
    const partly = passageOf(1, 0.4);
    expect(partly.calm).toBeGreaterThan(0);
    expect(partly.calm).toBeLessThan(18);
    expect(partly.light).toBeGreaterThan(0.9);
    const back = passageOf(1, 0);
    expect(back.calm).toBe(-EVERYWHERE);
    expect(back.light).toBe(1);
  });
});

describe('the waves, asked to leave', () => {
  interface StubRenderer {
    render: jest.Mock;
  }
  const renderers = (): StubRenderer[] =>
    (THREE.WebGLRenderer as unknown as { instances: StubRenderer[] }).instances;

  const frames = async (ms: number) => {
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, ms));
    });
  };

  // The sheet's material, found in the scene the renderer was last handed.
  const sheetUniforms = () => {
    const calls = renderers()[0].render.mock.calls;
    for (let i = calls.length - 1; i >= 0; i--) {
      const scene = calls[i][0] as THREE.Scene;
      let found: Record<string, { value: unknown }> | null = null;
      scene.traverse(object => {
        const material = (object as THREE.Mesh).material as
          THREE.ShaderMaterial | undefined;
        if (material?.uniforms?.uFronts) found = material.uniforms;
      });
      if (found) return found as Record<string, { value: unknown }>;
    }
    throw new Error('the sheet was never drawn');
  };

  beforeEach(() => {
    renderers().length = 0;
  });

  it('has put its light out by the end of the leave, and has it back if told to stay', async () => {
    const settings = getCompleteSettings(simpleWaveConfig as never) as never;
    const { rerender, unmount } = render(
      <SimpleWaveBackground settings={settings} />
    );
    await frames(120);

    rerender(<SimpleWaveBackground settings={settings} leaving leaveMs={60} />);
    await frames(400);
    const gone = sheetUniforms();
    expect(gone.uStrength.value).toBe(0);
    // The calm has been everywhere the swell was.
    expect((gone.uFronts.value as THREE.Vector2).y).toBeGreaterThan(18);

    rerender(
      <SimpleWaveBackground settings={settings} leaving={false} leaveMs={60} />
    );
    await frames(400);
    const back = sheetUniforms();
    expect((back.uFronts.value as THREE.Vector2).y).toBeLessThan(0);
    expect(back.uStrength.value).toBeGreaterThan(0);
    unmount();
  });
});
