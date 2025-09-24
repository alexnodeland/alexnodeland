import { render } from '@testing-library/react';
import SimpleWaveBackground from '../../../../components/animated-backgrounds/backgrounds/simple-waves/SimpleWaveBackground';

describe('SimpleWaveBackground', () => {
  it('mounts and appends canvas', () => {
    const settings: any = {
      opacity: 0.8,
      elementSize: 0.02,
      globalTimeMultiplier: 1,
      waveFrequency: 2,
      waveAmplitude: 0.5,
      colors: { primary: [1, 0, 0], secondary: [0, 1, 0], accent: [0, 0, 1] },
    };
    const { container, unmount } = render(
      <SimpleWaveBackground className="bg" settings={settings} />
    );
    expect(container.querySelector('.bg')).toBeInTheDocument();
    unmount();
  });
});
