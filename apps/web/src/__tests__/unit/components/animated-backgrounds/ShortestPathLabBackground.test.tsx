import { render } from '@testing-library/react';
import ShortestPathLabBackground from '../../../../components/animated-backgrounds/backgrounds/shortest-path-lab/ShortestPathLabBackground';

jest.mock('three/examples/jsm/postprocessing/EffectComposer.js', () => ({
  EffectComposer: jest.fn(() => ({
    addPass: jest.fn(),
    setSize: jest.fn(),
    render: jest.fn(),
  })),
}));
jest.mock('three/examples/jsm/postprocessing/RenderPass.js', () => ({
  RenderPass: jest.fn(),
}));
jest.mock('three/examples/jsm/postprocessing/UnrealBloomPass.js', () => ({
  UnrealBloomPass: jest.fn(),
}));

describe('ShortestPathLabBackground', () => {
  it('mounts and unmounts cleanly', () => {
    const settings: any = {
      opacity: 0.8,
      elementSize: 0.02,
      globalTimeMultiplier: 1,
      spTotalNodes: 10,
      spEdgeDensity: 0.2,
      spStartNode: 0,
      spGoalNode: 5,
      spHeuristicWeight: 1,
      spAnimationSpeed: 2,
      spTraversalSpeed: 2,
      spBaseEdgeAlpha: 0.2,
      spBaseEdgeThickness: 1,
      spActionEdgeThickness: 2,
      spDotSize: 8,
      spDotGlow: 0.5,
      spGlowBloom: 0,
      spGlowStrength: 1,
      spGlowRadius: 0.2,
      spGlowThreshold: 0.2,
      colors: {
        primary: [1, 0, 0],
        secondary: [0, 1, 0],
        accent: [0, 0, 1],
        background: [0, 0, 0],
        grid: [0.5, 0.5, 0.5],
      },
    };

    const { unmount } = render(
      <ShortestPathLabBackground className="bg" settings={settings} />
    );

    unmount();
  });
});
