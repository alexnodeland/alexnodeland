import {
  analyse,
  AxisSettings,
  axisFrequency,
  axisPosition,
  DISPLAY_RANGE_DB,
  distort,
  levelToDecibels,
  noteName,
  SAMPLE_RATE,
  Synth,
  SynthSettings,
  toLevel,
  UNIT_SECONDS,
  waveform,
} from '../../../../../components/animated-backgrounds/backgrounds/spectrogram-oscilloscope/synth';

// One oscillator, a sine, and nothing after it: the signal a test can do
// arithmetic on.
const pure = (over: Partial<SynthSettings> = {}): SynthSettings => ({
  vco1Frequency: 440,
  vco1Amplitude: 1,
  vco1WaveformType: 0,
  vco1Phase: 0,
  vco1FMAmount: 0,
  vco1FMFrequency: 0,
  vco2Frequency: 660,
  vco2Amplitude: 0,
  vco2WaveformType: 0,
  vco2Phase: 0,
  vco2FMAmount: 0,
  vco2FMFrequency: 0,
  mixRatio: 0,
  detune: 0,
  delayTime: 0,
  delayFeedback: 0,
  delayMix: 0,
  filterType: 0,
  filterCutoff: 0.5,
  filterResonance: 0,
  filterLFOAmount: 0,
  filterLFOSpeed: 0,
  distortionAmount: 0,
  distortionType: 0,
  ringModFrequency: 0,
  ringModAmount: 0,
  noiseAmount: 0,
  noiseType: 0,
  reverbAmount: 0,
  reverbDecay: 1,
  reverbPredelay: 0,
  ...over,
});

const logAxis: AxisSettings = {
  useLogScale: 1,
  minLogFreq: 40,
  maxLogFreq: 8000,
  frequencyScale: 3,
};

const BINS = 192;

// The spectrum of whatever a synth has just made, and where its peak is.
const spectrumOf = (synth: Synth, axis: AxisSettings = logAxis) => {
  const out = new Float32Array(BINS);
  analyse(synth, axis, out, 16, 1);
  let peak = 0;
  for (let b = 1; b < BINS; b++) if (out[b] > out[peak]) peak = b;
  return {
    out,
    peakHertz: axisFrequency((peak + 0.5) / BINS, axis),
    peak: out[peak],
  };
};

const rms = (synth: Synth, samples: number) => {
  let sum = 0;
  for (let i = 0; i < samples; i++) sum += synth.at(i) * synth.at(i);
  return Math.sqrt(sum / samples);
};

describe('the oscillators’ shapes', () => {
  it('draws one cycle of each', () => {
    expect(waveform(0.25, 0)).toBeCloseTo(1); // sine
    expect(waveform(0.75, 0)).toBeCloseTo(-1);
    expect(waveform(0.25, 1)).toBe(1); // square
    expect(waveform(0.75, 1)).toBe(-1);
    expect(waveform(0.5, 2)).toBeCloseTo(-1); // triangle
    expect(waveform(0, 2)).toBeCloseTo(1);
    expect(waveform(0, 3)).toBeCloseTo(-1); // sawtooth
    expect(waveform(0.999, 3)).toBeCloseTo(1, 2);
  });

  it('is periodic: a phase a whole number of cycles on is the same phase', () => {
    for (const type of [0, 1, 2, 3]) {
      expect(waveform(7.3, type)).toBeCloseTo(waveform(0.3, type));
    }
  });
});

describe('the waveshapers', () => {
  it('leaves the signal alone at no drive', () => {
    for (const type of [0, 1, 2, 3]) expect(distort(0.37, 0, type)).toBe(0.37);
  });

  it('never lets a hard clip or a fold past full scale', () => {
    for (let x = -3; x <= 3; x += 0.05) {
      expect(Math.abs(distort(x, 0.7, 1))).toBeLessThanOrEqual(1 + 1e-9);
      expect(Math.abs(distort(x, 0.7, 2))).toBeLessThanOrEqual(1 + 1e-9);
    }
  });

  it('keeps the sign of what it shapes', () => {
    for (const type of [0, 1, 2]) {
      expect(distort(0.4, 0.5, type)).toBeGreaterThan(0);
      expect(distort(-0.4, 0.5, type)).toBeLessThan(0);
    }
  });

  it('crushes to steps', () => {
    // At full crush there are four levels to a unit.
    const crushed = new Set<number>();
    for (let x = 0; x < 1; x += 0.001) crushed.add(distort(x, 1, 3));
    expect(crushed.size).toBe(4);
  });
});

describe('the frequency axis', () => {
  const linear: AxisSettings = { ...logAxis, useLogScale: 0 };

  it('runs between its limits on a logarithmic scale, an octave a step', () => {
    expect(axisFrequency(0, logAxis)).toBeCloseTo(40);
    expect(axisFrequency(1, logAxis)).toBeCloseTo(8000);
    // Equal steps along the axis are equal ratios of frequency.
    const ratio = axisFrequency(0.5, logAxis) / axisFrequency(0.25, logAxis);
    expect(
      axisFrequency(0.75, logAxis) / axisFrequency(0.5, logAxis)
    ).toBeCloseTo(ratio);
  });

  it('runs from zero on a linear one', () => {
    expect(axisFrequency(0.5, linear)).toBeCloseTo(1500);
    expect(axisFrequency(1, linear)).toBeCloseTo(3000);
  });

  it.each([
    ['logarithmic', logAxis],
    ['linear', linear],
  ])('finds where a frequency sits on a %s axis', (_name, axis) => {
    for (const x of [0.1, 0.33, 0.5, 0.9]) {
      expect(axisPosition(axisFrequency(x, axis), axis)).toBeCloseTo(x);
    }
  });
});

describe('naming a note', () => {
  it('names the way a tuner does', () => {
    expect(noteName(440)).toBe('a4');
    expect(noteName(110)).toBe('a2');
    expect(noteName(261.63)).toBe('c4');
    expect(noteName(466.16)).toBe('a♯4');
  });

  it('takes the nearest note for a frequency between two', () => {
    expect(noteName(445)).toBe('a4');
  });

  it('has no name for no frequency', () => {
    expect(noteName(0)).toBe('');
    expect(noteName(Number.NaN)).toBe('');
  });
});

describe('the synth', () => {
  it('makes the samples it is asked for, into a ring', () => {
    const synth = new Synth(1024);
    synth.render(300, pure());
    expect(synth.count).toBe(300);
    expect(synth.head).toBe(300);
    synth.render(1000, pure());
    expect(synth.count).toBe(1300);
    // Wrapped: the ring holds the most recent 1024.
    expect(synth.head).toBe(1300 % 1024);
  });

  it('makes a sine of the amplitude it was set to', () => {
    const synth = new Synth();
    synth.render(4096, pure({ vco1Amplitude: 0.8 }));
    expect(rms(synth, 4000)).toBeCloseTo(0.8 / Math.SQRT2, 2);
  });

  it('is in tune: the spectrum of a 440 Hz sine peaks at 440 Hz', () => {
    const synth = new Synth();
    synth.render(4096, pure());
    const { peakHertz, peak } = spectrumOf(synth);
    // Within the width of a bin on this axis.
    expect(peakHertz / 440).toBeGreaterThan(0.97);
    expect(peakHertz / 440).toBeLessThan(1.03);
    // A sine of amplitude one measures one.
    expect(peak).toBeGreaterThan(0.9);
    expect(peak).toBeLessThan(1.1);
  });

  it('bends when its frequency is moved under it, rather than jumping', () => {
    // The phase is accumulated, so the waveform is continuous across the
    // change: no sample-to-sample step bigger than the new frequency makes.
    const synth = new Synth();
    synth.render(500, pure({ vco1Frequency: 220 }));
    const before = synth.at(0);
    synth.render(1, pure({ vco1Frequency: 880 }));
    const step = Math.abs(synth.at(0) - before);
    expect(step).toBeLessThan((2 * Math.PI * 880) / SAMPLE_RATE + 1e-6);
  });

  it('mixes the two oscillators by the mix control', () => {
    const second = new Synth();
    second.render(
      4096,
      pure({ mixRatio: 1, vco2Amplitude: 1, vco2Frequency: 1320 })
    );
    const { peakHertz } = spectrumOf(second);
    expect(peakHertz / 1320).toBeGreaterThan(0.97);
    expect(peakHertz / 1320).toBeLessThan(1.03);
  });

  it('puts the harmonics of a sawtooth where a sawtooth has them', () => {
    const synth = new Synth();
    synth.render(4096, pure({ vco1Frequency: 220, vco1WaveformType: 3 }));
    const { out } = spectrumOf(synth);
    const at = (hertz: number) =>
      out[Math.floor(axisPosition(hertz, logAxis) * BINS)];
    // Every harmonic, the nth at 1/n: the second is about half the first.
    expect(at(440) / at(220)).toBeGreaterThan(0.35);
    expect(at(440) / at(220)).toBeLessThan(0.65);
    // And nothing to speak of between them.
    expect(at(330)).toBeLessThan(at(220) * 0.2);
  });

  it('takes the top off with a low-pass and the bottom off with a high-pass', () => {
    const settings = pure({
      vco1Frequency: 110,
      vco1WaveformType: 3,
      filterCutoff: 0.03, // 300 Hz
    });
    const open = new Synth();
    open.render(4096, settings);
    const low = new Synth();
    low.render(4096, { ...settings, filterType: 1 });
    const high = new Synth();
    high.render(4096, { ...settings, filterType: 2 });

    const band = (synth: Synth, from: number, to: number) => {
      const { out } = spectrumOf(synth);
      let sum = 0;
      for (let b = 0; b < BINS; b++) {
        const hertz = axisFrequency((b + 0.5) / BINS, logAxis);
        if (hertz >= from && hertz < to) sum += out[b] * out[b];
      }
      return sum;
    };

    expect(band(low, 1500, 8000)).toBeLessThan(band(open, 1500, 8000) * 0.1);
    expect(band(high, 40, 150)).toBeLessThan(band(open, 40, 150) * 0.5);
    // And each leaves the other end mostly alone.
    expect(band(low, 40, 150)).toBeGreaterThan(band(open, 40, 150) * 0.5);
    expect(band(high, 1500, 8000)).toBeGreaterThan(
      band(open, 1500, 8000) * 0.5
    );
  });

  it('echoes: a delay puts energy where there was silence', () => {
    // A burst, then nothing: with the delay on, something comes back.
    const settings = pure({ delayTime: 1, delayMix: 1, delayFeedback: 0.5 });
    const dry = new Synth();
    dry.render(400, pure());
    dry.render(600, pure({ vco1Amplitude: 0 }));
    const wet = new Synth();
    wet.render(400, settings);
    wet.render(600, { ...settings, vco1Amplitude: 0 });
    expect(rms(dry, 150)).toBeCloseTo(0);
    expect(rms(wet, 150)).toBeGreaterThan(0.1);
  });

  it('makes the same noise every run', () => {
    const settings = pure({ vco1Amplitude: 0, noiseAmount: 0.5, noiseType: 1 });
    const one = new Synth(512, 99);
    const other = new Synth(512, 99);
    one.render(512, settings);
    other.render(512, settings);
    expect(Array.from(other.ring)).toEqual(Array.from(one.ring));
    expect(rms(one, 500)).toBeGreaterThan(0);
  });

  it('holds numbers whatever the controls are set to', () => {
    const synth = new Synth();
    synth.render(
      4096,
      pure({
        filterType: 2,
        filterResonance: 1,
        filterCutoff: 5,
        filterLFOAmount: 4,
        filterLFOSpeed: 9,
        distortionAmount: 1,
        distortionType: 1,
        delayTime: 1,
        delayMix: 1,
        delayFeedback: 0.99,
        reverbAmount: 1,
        ringModAmount: 1,
        ringModFrequency: 7000,
        noiseAmount: 1,
        noiseType: 2,
        vco1FMAmount: 1,
        vco1FMFrequency: 3,
      })
    );
    expect(Array.from(synth.ring).every(Number.isFinite)).toBe(true);
  });

  it('sounds a note put in by hand, where it was put, and lets it die away', () => {
    const synth = new Synth();
    const silent = pure({ vco1Amplitude: 0 });
    synth.pluck(880, 0.6);
    synth.render(1024, silent);
    const { peakHertz } = spectrumOf(synth);
    expect(peakHertz / 880).toBeGreaterThan(0.97);
    expect(peakHertz / 880).toBeLessThan(1.03);

    const loud = rms(synth, 256);
    synth.render(8192, silent);
    expect(rms(synth, 256)).toBeLessThan(loud * 0.05);
  });

  it('ducks under a voice and carries it', () => {
    const synth = new Synth();
    const voice = (seconds: number) =>
      0.5 * Math.sin(2 * Math.PI * 1760 * seconds);
    synth.render(4096, pure(), voice, 1);
    // Fully ducked: the 440 Hz oscillator is gone and the voice is all.
    const { peakHertz } = spectrumOf(synth);
    expect(peakHertz / 1760).toBeGreaterThan(0.97);
    expect(peakHertz / 1760).toBeLessThan(1.03);
  });

  it('keeps the modulators’ slow clock', () => {
    const synth = new Synth();
    synth.render(Math.round(SAMPLE_RATE * UNIT_SECONDS * 3), pure());
    expect(synth.units).toBeCloseTo(3, 1);
  });

  it('gives an oscilloscope a phase to trigger on', () => {
    const synth = new Synth();
    synth.render(SAMPLE_RATE / 10, pure({ vco1Frequency: 100 }));
    // A tenth of a second of 100 Hz is ten whole cycles.
    expect(synth.carrierPhase).toBeCloseTo(10, 3);
  });
});

describe('the spectrum, as the display reads it', () => {
  it('measures nothing above half the sample rate', () => {
    const synth = new Synth();
    synth.render(4096, pure());
    const out = new Float32Array(8).fill(1);
    analyse(
      synth,
      { ...logAxis, minLogFreq: SAMPLE_RATE, maxLogFreq: SAMPLE_RATE * 2 },
      out,
      16,
      1
    );
    expect(Array.from(out)).toEqual(new Array(8).fill(0));
  });

  it('reads a peak at the same height through either window', () => {
    // The smoothing control blends the window; it must not move the level.
    const synth = new Synth();
    synth.render(4096, pure());
    const hann = new Float32Array(BINS);
    const rect = new Float32Array(BINS);
    analyse(synth, logAxis, hann, 16, 1);
    analyse(synth, logAxis, rect, 16, 0);
    expect(Math.max(...hann) / Math.max(...rect)).toBeGreaterThan(0.85);
    expect(Math.max(...hann) / Math.max(...rect)).toBeLessThan(1.15);
  });

  it('leaks less through the smoother window', () => {
    const synth = new Synth();
    synth.render(4096, pure());
    const hann = new Float32Array(BINS);
    const rect = new Float32Array(BINS);
    analyse(synth, logAxis, hann, 16, 1);
    analyse(synth, logAxis, rect, 16, 0);
    // Two octaves above the tone, where nothing is.
    const far = Math.floor(axisPosition(1760, logAxis) * BINS);
    expect(hann[far]).toBeLessThan(rect[far]);
  });

  it('reads in decibels, over the range the display shows', () => {
    expect(toLevel(0.6)).toBeCloseTo(1);
    expect(toLevel(0)).toBe(0);
    expect(toLevel(-1)).toBe(0);
    expect(toLevel(10)).toBe(1);
    // Twenty decibels down is a tenth of the amplitude.
    expect(toLevel(0.06)).toBeCloseTo(1 - 20 / DISPLAY_RANGE_DB);
    expect(levelToDecibels(1)).toBeCloseTo(0);
    expect(levelToDecibels(0)).toBeCloseTo(-DISPLAY_RANGE_DB);
    expect(levelToDecibels(toLevel(0.06))).toBeCloseTo(-20);
  });
});
