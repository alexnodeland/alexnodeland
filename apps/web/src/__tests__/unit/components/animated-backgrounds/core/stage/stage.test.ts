import * as THREE from 'three';
import {
  createStage,
  Frame,
  Stage,
  STAGE_GROUND,
} from '../../../../../../components/animated-backgrounds/core/stage/stage';
import { Pose } from '../../../../../../components/animated-backgrounds/core/stage/rig';

interface StubRenderer {
  domElement: HTMLCanvasElement;
  render: jest.Mock;
  dispose: jest.Mock;
  forceContextLoss: jest.Mock;
}

const renderers = (): StubRenderer[] =>
  (THREE.WebGLRenderer as unknown as { instances: StubRenderer[] }).instances;

type FieldWindow = Window & {
  __fieldQuality?: { governor?: boolean; pixelRatio?: number };
};

const base: Pose = {
  target: [0, 0, 0],
  distance: 4,
  azimuth: 0,
  elevation: 0.8,
  fov: 40,
};

// The clock the stage runs on, in the test's hands: frames happen when the
// test says, at the times it says.
let queue: Array<((time: number) => void) | null> = [];
let clock = 1000;

const step = (ms = 16) => {
  clock += ms;
  const callbacks = queue;
  queue = [];
  callbacks.forEach(callback => callback?.(clock));
};

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('the stage', () => {
  let container: HTMLDivElement;
  let stage: Stage | null;
  const frames: Frame[] = [];

  beforeEach(() => {
    queue = [];
    clock = 1000;
    frames.length = 0;
    renderers().length = 0;
    (window as FieldWindow).__fieldQuality = { governor: false };
    jest
      .spyOn(window, 'requestAnimationFrame')
      .mockImplementation(callback => queue.push(callback));
    jest.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => {
      queue[id - 1] = null;
    });
    container = document.createElement('div');
    document.body.appendChild(container);
    stage = null;
  });

  afterEach(() => {
    stage?.dispose();
    container.remove();
    document.body.className = '';
    delete (window as FieldWindow).__fieldQuality;
  });

  // A stage with a scene that only keeps what it was told each frame.
  const begin = async (
    update?: (frame: Frame) => void,
    resize?: () => void
  ) => {
    stage = createStage(container, { rig: { base: () => base } });
    stage.start(frame => {
      frames.push({ ...frame });
      update?.(frame);
    }, resize);
    // The shaders' compile resolves, and the first frame is asked for.
    await flush();
    return stage;
  };

  const drawn = () => renderers()[0].render.mock.calls.length;

  it('puts its canvas in the container, the size of the viewport', async () => {
    await begin();
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas).not.toBeNull();
    expect(canvas.style.display).toBe('block');
    expect(canvas.width).toBe(window.innerWidth);
    expect(canvas.height).toBe(window.innerHeight);
    expect(stage?.aspect).toBeCloseTo(window.innerWidth / window.innerHeight);
  });

  it('composites onto the ground the page is drawn on', () => {
    // `--bg-stage` in variables.scss, as a number.
    expect(STAGE_GROUND).toBe(0x07080a);
  });

  it('draws nothing until the scene has started, and then every frame', async () => {
    stage = createStage(container, { rig: { base: () => base } });
    stage.requestFrame();
    step();
    expect(drawn()).toBe(0);

    stage.start(frame => frames.push({ ...frame }));
    await flush();
    step();
    step();
    step();
    expect(frames).toHaveLength(3);
    expect(drawn()).toBeGreaterThanOrEqual(3);
  });

  it('tells a scene how long it has been running, and never more than a tenth of a second at once', async () => {
    await begin();
    step(16);
    step(16);
    expect(frames[1].dt).toBeCloseTo(0.016);
    expect(frames[1].time).toBeCloseTo(0.016);

    // A tab coming back from the background: one long frame, not the whole
    // time it was away.
    step(30_000);
    expect(frames[2].dt).toBeCloseTo(0.1);
    expect(frames[2].time).toBeCloseTo(0.116);
  });

  it('brings a scene in over its arrival, and no longer', async () => {
    stage = createStage(container, {
      rig: { base: () => base },
      introSeconds: 0.05,
    });
    stage.start(frame => frames.push({ ...frame }));
    await flush();
    step(16);
    step(20);
    expect(frames[1].intro).toBeGreaterThan(0);
    expect(frames[1].intro).toBeLessThan(1);
    step(100);
    step(100);
    expect(frames[3].intro).toBe(1);
  });

  it('holds a still: one frame, drawn arrived, and then nothing', async () => {
    stage = createStage(container, { rig: { base: () => base } });
    stage.setFrozen(true);
    stage.start(frame => frames.push({ ...frame }));
    await flush();
    step();
    expect(frames).toHaveLength(1);
    expect(frames[0].frozen).toBe(true);
    expect(frames[0].dt).toBe(0);
    expect(frames[0].intro).toBe(1);

    step();
    step();
    expect(frames).toHaveLength(1);

    // Something a still shows has changed: one more frame, on request.
    stage.requestFrame();
    stage.requestFrame();
    step();
    expect(frames).toHaveLength(2);

    // The hold lifted, the clock picks up from now rather than from then.
    stage.setFrozen(false);
    step(5_000);
    step(16);
    expect(frames[2].dt).toBe(0);
    expect(frames[3].dt).toBeCloseTo(0.016);
  });

  it('knows when the page’s content is hidden, and lifts the canopy off the title’s place', async () => {
    await begin();
    step();
    expect(frames[0].hidden).toBe(false);
    expect(stage?.post.canopyLift).toBe(0);

    document.body.classList.add('mobile-explore-active');
    for (let i = 0; i < 200; i++) step(16);
    expect(frames[frames.length - 1].hidden).toBe(true);
    expect(stage?.post.canopyLift).toBeGreaterThan(0.99);

    document.body.classList.remove('mobile-explore-active');
    for (let i = 0; i < 200; i++) step(16);
    expect(stage?.post.canopyLift).toBeLessThan(0.01);
  });

  it('lifts the canopy for the 404’s number too', async () => {
    await begin();
    if (stage) stage.reading = 1;
    for (let i = 0; i < 200; i++) step(16);
    expect(stage?.post.canopyLift).toBeGreaterThan(0.99);
  });

  it('finds where a point on the screen lands on the ground', async () => {
    await begin();
    step();
    const out = new THREE.Vector3();
    // The middle of the screen looks at the camera's target.
    expect(stage?.groundPoint(0, 0, 0, out)).toBe(true);
    expect(out.x).toBeCloseTo(0);
    expect(out.y).toBeCloseTo(0);
    expect(out.z).toBeCloseTo(0);

    // To the right on screen is to the right on the ground; lower on screen
    // is nearer the camera.
    stage?.groundPoint(0.5, 0, 0, out);
    expect(out.x).toBeGreaterThan(0);
    stage?.groundPoint(0, -0.5, 0, out);
    expect(out.z).toBeGreaterThan(0);

    // A ground the ray is already under is never reached.
    expect(stage?.groundPoint(0, 0, 100, out)).toBe(false);
  });

  it('never meets the ground with a ray that runs level or away', async () => {
    stage = createStage(container, {
      rig: { base: () => ({ ...base, elevation: 0.05 }), minElevation: 0.01 },
    });
    stage.start(() => undefined);
    await flush();
    step();
    // Nearly level, and the top of the screen looks above the horizon.
    expect(stage.groundPoint(0, 0.9, 0, new THREE.Vector3())).toBe(false);
  });

  it('follows the viewport, at most once a frame', async () => {
    const resize = jest.fn();
    const width = window.innerWidth;
    await begin(undefined, resize);
    step();

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: 500,
    });
    // A phone's URL bar sliding in and out fires this over and over.
    for (let i = 0; i < 5; i++) window.dispatchEvent(new Event('resize'));
    step();
    expect(resize).toHaveBeenCalledTimes(1);
    expect(stage?.width).toBe(500);
    expect(container.querySelector('canvas')?.width).toBe(500);

    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      writable: true,
      value: width,
    });
  });

  it('draws at the ratio it was asked for', async () => {
    (window as FieldWindow).__fieldQuality = { governor: false, pixelRatio: 2 };
    await begin();
    expect(stage?.pixelRatio).toBe(2);
    expect(container.querySelector('canvas')?.width).toBe(
      window.innerWidth * 2
    );
  });

  it('tips the camera as the window scrolls', async () => {
    const layout = document.createElement('div');
    layout.className = 'layout';
    document.body.appendChild(layout);
    // The breath and the page's own standing switched off: what is left to
    // move the camera is the scroll.
    stage = createStage(container, {
      rig: {
        base: () => base,
        drift: { azimuth: 0, elevation: 0, period: 1 },
        intro: { distance: 0, elevation: 0 },
        page: false,
      },
    });
    stage.start(() => undefined);
    await flush();
    for (let i = 0; i < 30; i++) step(16);
    expect(stage.rig.pose.elevation).toBeCloseTo(base.elevation);

    layout.scrollTop = 400;
    layout.dispatchEvent(new Event('scroll'));
    for (let i = 0; i < 120; i++) step(16);
    const tipped = stage.rig.pose.elevation;
    expect(tipped).toBeGreaterThan(base.elevation + 0.02);
    expect(stage.rig.pose.distance).toBeLessThan(base.distance);

    // Some other scroller is not the window's.
    const other = document.createElement('div');
    document.body.appendChild(other);
    other.dispatchEvent(new Event('scroll'));
    for (let i = 0; i < 120; i++) step(16);
    expect(stage.rig.pose.elevation).toBeCloseTo(tipped);

    // Back at the top, the camera comes back.
    layout.scrollTop = 0;
    layout.dispatchEvent(new Event('scroll'));
    for (let i = 0; i < 240; i++) step(16);
    expect(stage.rig.pose.elevation).toBeCloseTo(base.elevation, 3);

    layout.remove();
    other.remove();
  });

  it('stops, with a note, when a scene fails mid-flight — and leaves the page alone', async () => {
    let fail = false;
    await begin(() => {
      if (fail) throw new Error('a shader went wrong');
    });
    step();
    fail = true;
    expect(() => step()).not.toThrow();
    expect(console.warn).toHaveBeenCalledWith(
      'The background stopped:',
      expect.any(Error)
    );
    const count = frames.length;
    step();
    step();
    expect(frames).toHaveLength(count);
  });

  it('stops drawing when the context is lost and picks up when it comes back', async () => {
    await begin();
    step();
    const canvas = container.querySelector('canvas') as HTMLCanvasElement;

    const lost = new Event('webglcontextlost', { cancelable: true });
    canvas.dispatchEvent(lost);
    // Without this the browser is free never to give the context back.
    expect(lost.defaultPrevented).toBe(true);
    const count = frames.length;
    step();
    stage?.requestFrame();
    step();
    expect(frames).toHaveLength(count);

    canvas.dispatchEvent(new Event('webglcontextrestored'));
    step();
    expect(frames.length).toBeGreaterThan(count);
    // And the clock starts from now.
    expect(frames[frames.length - 1].dt).toBe(0);
  });

  it('shares the pointer with the scene', async () => {
    await begin();
    const event = new MouseEvent('pointermove', {
      bubbles: true,
      clientX: window.innerWidth,
      clientY: 0,
    });
    document.documentElement.dispatchEvent(event);
    step();
    expect(frames[0].pointer.x).toBeCloseTo(1);
    expect(frames[0].pointer.y).toBeCloseTo(1);
    expect(frames[0].pointer.overField).toBe(true);
  });

  it('leaves nothing behind', async () => {
    await begin();
    step();
    const [renderer] = renderers();
    const current = stage;
    stage = null;
    current?.dispose();

    expect(container.querySelector('canvas')).toBeNull();
    expect(renderer.dispose).toHaveBeenCalled();
    expect(renderer.forceContextLoss).toHaveBeenCalled();

    const count = frames.length;
    step();
    window.dispatchEvent(new Event('resize'));
    step();
    current?.requestFrame();
    step();
    expect(frames).toHaveLength(count);
    // Twice is no worse than once.
    expect(() => current?.dispose()).not.toThrow();
  });
});
