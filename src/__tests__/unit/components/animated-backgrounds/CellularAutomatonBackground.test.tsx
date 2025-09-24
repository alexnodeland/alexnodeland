import { render } from '@testing-library/react';
import CellularAutomatonBackground from '../../../../components/animated-backgrounds/backgrounds/cellular-automaton/CellularAutomatonBackground';

describe('CellularAutomatonBackground', () => {
  it('mounts and unmounts', () => {
    const settings: any = {
      opacity: 0.9,
      elementSize: 0.02,
      globalTimeMultiplier: 1,
      cellSize: 0.2,
      cellSizeMultiplier: 0.1,
      evolutionSpeed1: 1,
      evolutionSpeed2: 1,
      diagonalEvolutionSpeed: 1,
      updateAnimationSpeed: 1,
      waveAmplitude: 0.5,
      connectionLineWidth: 0.003,
      diagonalConnectionWeight: 0.5,
      activityIntensity: 0.7,
      colors: {
        primary: [1, 0, 0],
        secondary: [0, 1, 0],
        accent: [0, 0, 1],
        background: [0, 0, 0],
        grid: [0.5, 0.5, 0.5],
      },
    };
    const { unmount } = render(
      <CellularAutomatonBackground className="bg" settings={settings} />
    );
    unmount();
  });
});
