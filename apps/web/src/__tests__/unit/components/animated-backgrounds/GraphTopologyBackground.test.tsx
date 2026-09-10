import { render } from '@testing-library/react';
import GraphTopologyBackground from '../../../../components/animated-backgrounds/backgrounds/graph-topology/GraphTopologyBackground';

describe('GraphTopologyBackground', () => {
  it('mounts and unmounts', () => {
    const settings: any = {
      opacity: 0.8,
      elementSize: 0.02,
      globalTimeMultiplier: 1,
      totalNodes: 12,
      clusterCount: 3,
      requestedNodes: 4,
      animationSpeed: 1,
      scale: 1,
      edgeThickness: 1,
      updateAnimationSpeed: 2,
      colors: {
        primary: [1, 0, 0],
        secondary: [0, 1, 0],
        accent: [0, 0, 1],
        background: [0, 0, 0],
        grid: [0.5, 0.5, 0.5],
      },
    };
    const { unmount } = render(
      <GraphTopologyBackground className="bg" settings={settings} />
    );
    unmount();
  });
});
