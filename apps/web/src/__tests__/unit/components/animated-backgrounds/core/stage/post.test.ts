import * as THREE from 'three';
import {
  DEFAULT_BLOOM,
  DEFAULT_GRADE,
  PostChain,
} from '../../../../../../components/animated-backgrounds/core/stage/post';

interface StubRenderer {
  render: jest.Mock;
  getRenderTarget(): THREE.WebGLRenderTarget | null;
  autoClear: boolean;
}

// A pass, as the stand-in renderer saw it: where it drew to, and with what.
interface Pass {
  target: THREE.WebGLRenderTarget | null;
  uniforms: Record<string, { value: unknown }> | null;
  autoClear: boolean;
}

const chain = (
  options: Partial<ConstructorParameters<typeof PostChain>[1]> = {}
) => {
  const renderer = new THREE.WebGLRenderer() as unknown as StubRenderer;
  const passes: Pass[] = [];
  renderer.render.mockImplementation((scene: THREE.Scene) => {
    const quad = scene.children[0] as THREE.Mesh | undefined;
    const material = quad?.material as THREE.ShaderMaterial | undefined;
    passes.push({
      target: renderer.getRenderTarget(),
      // The values as they stood for this pass: the quad's material is
      // shared between passes and written again for the next.
      uniforms: material?.uniforms
        ? Object.fromEntries(
            Object.entries(material.uniforms).map(([name, uniform]) => [
              name,
              { value: uniform.value },
            ])
          )
        : null,
      autoClear: renderer.autoClear,
    });
  });
  const post = new PostChain(renderer as unknown as THREE.WebGLRenderer, {
    samples: 4,
    levels: 5,
    bloom: { ...DEFAULT_BLOOM },
    grade: { ...DEFAULT_GRADE },
    ...options,
  });
  post.setSize(1600, 900);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera();
  const draw = (time = 0) => {
    passes.length = 0;
    post.render(scene, camera, time);
    return passes;
  };
  return { post, draw, renderer };
};

describe('what happens to a frame between the scene and the screen', () => {
  it('draws the scene once, into a target of its own that can hold more than white', () => {
    const { post, draw } = chain();
    const passes = draw();
    expect(passes[0].target).toBe(post.sceneTarget);
    expect(
      passes.filter(pass => pass.target === post.sceneTarget)
    ).toHaveLength(1);
    expect(post.sceneTarget.texture.type).toBe(THREE.HalfFloatType);
    expect(post.sceneTarget.samples).toBe(4);
    expect(post.sceneTarget.width).toBe(1600);
    expect(post.sceneTarget.height).toBe(900);
  });

  it('ends on the screen', () => {
    const passes = chain().draw();
    expect(passes[passes.length - 1].target).toBeNull();
    // And only there.
    expect(passes.filter(pass => pass.target === null)).toHaveLength(1);
  });

  it('blurs the light down a chain of halvings and back up it', () => {
    const { draw } = chain();
    const passes = draw();
    // The scene, five steps down, four back up, and the grade.
    expect(passes).toHaveLength(1 + 5 + 4 + 1);

    const down = passes.slice(1, 6).map(pass => pass.target);
    expect(down.map(target => target?.width)).toEqual([800, 400, 200, 100, 50]);
    expect(down.map(target => target?.height)).toEqual([450, 225, 113, 57, 29]);

    // Back up the same chain, each level added onto the next larger one.
    const up = passes.slice(6, 10);
    expect(up.map(pass => pass.target)).toEqual(down.slice(0, 4).reverse());
    expect(up.every(pass => pass.autoClear === false)).toBe(true);
  });

  it('keeps only what is above the threshold, and only on the first step', () => {
    const { draw } = chain({
      bloom: { ...DEFAULT_BLOOM, threshold: 0.9, knee: 0.25 },
    });
    const passes = draw();
    expect(passes[1].uniforms?.uPrefilter.value).toBe(1);
    expect(passes[1].uniforms?.uThreshold.value).toBe(0.9);
    expect(passes[1].uniforms?.uKnee.value).toBe(0.25);
    for (const pass of passes.slice(2, 6)) {
      expect(pass.uniforms?.uPrefilter.value).toBe(0);
    }
  });

  it('skips the bloom entirely when there is none to add', () => {
    const off = chain({ bloom: false });
    expect(off.draw()).toHaveLength(2);

    const silent = chain();
    silent.post.bloom.strength = 0;
    const passes = silent.draw();
    expect(passes).toHaveLength(2);
    expect(passes[1].uniforms?.uBloom.value).toBe(0);
  });

  it('reads its settings every frame, so a scene can move them', () => {
    const { post, draw } = chain();
    post.bloom.strength = 0.9;
    post.grade.exposure = 1.4;
    post.grade.vignette = 0.5;
    const grade = draw(12.5).pop();
    expect(grade?.uniforms?.uBloom.value).toBe(0.9);
    expect(grade?.uniforms?.uExposure.value).toBe(1.4);
    expect(grade?.uniforms?.uVignette.value).toBe(0.5);
    expect(grade?.uniforms?.uTime.value).toBe(12.5);
    expect(grade?.uniforms?.uAspect.value).toBeCloseTo(1600 / 900);
  });

  it('holds the top of the picture down under the title, and lets go by as much as it is lifted', () => {
    const { post, draw } = chain({
      grade: { ...DEFAULT_GRADE, canopy: 0.5 },
    });
    expect(draw().pop()?.uniforms?.uCanopy.value).toBeCloseTo(0.5);

    post.canopyLift = 0.5;
    expect(draw().pop()?.uniforms?.uCanopy.value).toBeCloseTo(0.25);

    post.canopyLift = 1;
    expect(draw().pop()?.uniforms?.uCanopy.value).toBe(0);

    // A lift past either end is an end.
    post.canopyLift = 3;
    expect(draw().pop()?.uniforms?.uCanopy.value).toBe(0);
    post.canopyLift = -1;
    expect(draw().pop()?.uniforms?.uCanopy.value).toBeCloseTo(0.5);
  });

  it('leaves the renderer clearing the way it found it', () => {
    const { draw, renderer } = chain();
    renderer.autoClear = false;
    draw();
    expect(renderer.autoClear).toBe(false);
  });

  it('never sizes a target to nothing', () => {
    const { post } = chain();
    expect(() => post.setSize(0, 0)).not.toThrow();
    expect(post.sceneTarget.width).toBe(1);
    expect(post.sceneTarget.height).toBe(1);
  });
});
