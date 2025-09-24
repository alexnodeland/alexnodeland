import { render } from '@testing-library/react';
import SpectrogramOscilloscopeBackground from '../../../../components/animated-backgrounds/backgrounds/spectrogram-oscilloscope/SpectrogramOscilloscopeBackground';

describe('SpectrogramOscilloscopeBackground', () => {
  beforeEach(() => {
    jest.spyOn(window, 'addEventListener');
    jest.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    (window.addEventListener as jest.Mock).mockRestore();
    (window.removeEventListener as jest.Mock).mockRestore();
  });

  it('mounts, registers resize handler, and unmounts', () => {
    const settings: any = {
      opacity: 0.8,
      elementSize: 0.02,
      globalTimeMultiplier: 1,
      vco1Frequency: 110,
      vco1Amplitude: 0.7,
      vco1WaveformType: 3,
      vco1Phase: 0,
      vco1FMAmount: 0.1,
      vco1FMFrequency: 0.3,
      vco2Frequency: 165,
      vco2Amplitude: 0.5,
      vco2WaveformType: 1,
      vco2Phase: 0,
      vco2FMAmount: 0.1,
      vco2FMFrequency: 0.3,
      mixRatio: 0.5,
      detune: 0.01,
      delayTime: 0.2,
      delayFeedback: 0.2,
      delayMix: 0.3,
      filterType: 1,
      filterCutoff: 0.5,
      filterResonance: 0.2,
      filterLFOAmount: 0.2,
      filterLFOSpeed: 0.5,
      distortionAmount: 0.1,
      distortionType: 0,
      ringModFrequency: 200,
      ringModAmount: 0.2,
      noiseAmount: 0.1,
      noiseType: 0,
      reverbAmount: 0.3,
      reverbDecay: 1,
      reverbPredelay: 0.05,
      waveformBrightness: 1.5,
      spectrogramBrightness: 1.8,
      waveformThickness: 2,
      spectrogramSmoothing: 0.6,
      frequencyScale: 3,
      timeScale: 0.1,
      fftWindowSize: 64,
      useLogScale: 1,
      minLogFreq: 20,
      maxLogFreq: 5000,
      colors: {
        primary: [0, 0.8, 1],
        secondary: [1, 0.4, 0.8],
        accent: [1, 1, 0],
        background: [0, 0, 0],
        grid: [0.2, 0.3, 0.4],
      },
    };

    const { unmount } = render(
      <SpectrogramOscilloscopeBackground className="bg" settings={settings} />
    );

    expect(window.addEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );

    unmount();

    expect(window.removeEventListener).toHaveBeenCalledWith(
      'resize',
      expect.any(Function)
    );
  });
});
