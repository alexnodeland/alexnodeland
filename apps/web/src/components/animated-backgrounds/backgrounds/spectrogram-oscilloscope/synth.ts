/**
 * The synthesizer, as a stream of samples.
 *
 * This used to be a function in a fragment shader: `generateSignal(t)`,
 * evaluated afresh for every pixel of the oscilloscope and a hundred times
 * over for every pixel of the spectrogram. A function of time alone cannot
 * have a memory, so everything in the chain that needs one was faked — the
 * filter scaled the signal and added a sine, the delay re-synthesised the
 * oscillators at an earlier time, the reverb was four copies of a tone.
 *
 * Here it is what a synthesizer is: state, advanced a sample at a time, into
 * a ring of the most recent samples. The oscillators carry their own phase,
 * so a frequency moved under them bends the pitch rather than jumping it.
 * The filter is a real one (a state-variable filter with a cutoff that can
 * be swept), the delay is a line with feedback, and the reverb's taps are
 * taps on the signal. The oscilloscope draws the ring; the spectrogram is a
 * transform of the ring; and the two are, literally, the same samples.
 *
 * It runs in slow motion — a few hundred samples for every second on the
 * wall — which is what lets a 110 Hz sawtooth be watched. Kept free of
 * three and React so it can be tested as arithmetic.
 */

/** The synth's own sample rate, in its own (nominal) hertz. */
export const SAMPLE_RATE = 22050;

/**
 * One unit of the modulators' clock, in the synth's seconds. The slow
 * modulators — the FM, the filter's sweep — are set in radians per unit, as
 * they always were, so that they move at a speed the eye can follow while
 * the oscillators they act on keep their real pitch.
 */
export const UNIT_SECONDS = 0.01;

const TWO_PI = Math.PI * 2;
// FM amount sliders run 0-1; scale them into a usable modulation index.
const FM_INDEX_SCALE = 8;

/** The settings the synth reads: every one a live control. */
export interface SynthSettings {
  vco1Frequency: number;
  vco1Amplitude: number;
  vco1WaveformType: number;
  vco1Phase: number;
  vco1FMAmount: number;
  vco1FMFrequency: number;
  vco2Frequency: number;
  vco2Amplitude: number;
  vco2WaveformType: number;
  vco2Phase: number;
  vco2FMAmount: number;
  vco2FMFrequency: number;
  mixRatio: number;
  detune: number;
  delayTime: number;
  delayFeedback: number;
  delayMix: number;
  filterType: number;
  filterCutoff: number;
  filterResonance: number;
  filterLFOAmount: number;
  filterLFOSpeed: number;
  distortionAmount: number;
  distortionType: number;
  ringModFrequency: number;
  ringModAmount: number;
  noiseAmount: number;
  noiseType: number;
  reverbAmount: number;
  reverbDecay: number;
  reverbPredelay: number;
}

/** What the display's frequency axis runs over. */
export interface AxisSettings {
  useLogScale: number;
  minLogFreq: number;
  maxLogFreq: number;
  frequencyScale: number;
}

/** One cycle of a waveform at `phase`, in cycles. 0 sine, 1 square, 2 triangle, 3 sawtooth. */
export const waveform = (phase: number, type: number): number => {
  if (type < 0.5) return Math.sin(phase * TWO_PI);
  const p = phase - Math.floor(phase);
  if (type < 1.5) return p < 0.5 ? 1 : -1;
  if (type < 2.5) return 4 * Math.abs(p - 0.5) - 1;
  return 2 * p - 1;
};

/** The waveshapers. 0 soft clip, 1 hard clip, 2 foldback, 3 bit crush. */
export const distort = (
  signal: number,
  amount: number,
  type: number
): number => {
  if (amount < 0.01) return signal;
  if (type < 0.5) {
    const drive = 1 + amount * 10;
    return Math.tanh(signal * drive) / drive;
  }
  if (type < 1.5) {
    const threshold = 1 - amount;
    return Math.max(-threshold, Math.min(threshold, signal)) / threshold;
  }
  if (type < 2.5) {
    const fold = 1 - amount * 0.9;
    let s = Math.abs(signal);
    // Reflected back off the ceiling until it is under it. Bounded: a
    // signal this far out of range has other problems.
    for (let i = 0; i < 16 && s > fold; i++) s = 2 * fold - s;
    return Math.sign(signal) * s;
  }
  const levels = Math.pow(2, 16 + (2 - 16) * amount);
  return Math.floor(signal * levels) / levels;
};

/**
 * The frequency, in the synth's hertz, at a position 0 → 1 along the
 * display's axis: logarithmic between the two limits, or linear from zero.
 */
export const axisFrequency = (x: number, axis: AxisSettings): number => {
  if (axis.useLogScale > 0.5) {
    const low = Math.log(Math.max(1, axis.minLogFreq));
    const high = Math.log(Math.max(axis.minLogFreq + 1, axis.maxLogFreq));
    return Math.exp(low + (high - low) * x);
  }
  return Math.max(1, x * axis.frequencyScale * 1000);
};

/** The inverse: where along the axis a frequency sits. */
export const axisPosition = (hertz: number, axis: AxisSettings): number => {
  if (axis.useLogScale > 0.5) {
    const low = Math.log(Math.max(1, axis.minLogFreq));
    const high = Math.log(Math.max(axis.minLogFreq + 1, axis.maxLogFreq));
    return (Math.log(Math.max(1e-6, hertz)) - low) / (high - low);
  }
  return hertz / (axis.frequencyScale * 1000);
};

const NOTE_NAMES = [
  'c',
  'c♯',
  'd',
  'd♯',
  'e',
  'f',
  'f♯',
  'g',
  'g♯',
  'a',
  'a♯',
  'b',
];

/** The nearest note to a frequency, the way a tuner names one: "a2". */
export const noteName = (hertz: number): string => {
  if (!(hertz > 0)) return '';
  const semitones = Math.round(12 * Math.log2(hertz / 440)) + 57;
  const octave = Math.floor(semitones / 12);
  return `${NOTE_NAMES[((semitones % 12) + 12) % 12]}${octave}`;
};

// What the time controls' full travel is worth, in the synth's seconds: the
// delay line, the gap before the reverb's first reflection, and the spacing
// of the reflections after it.
const DELAY_SECONDS = 0.02;
const PREDELAY_SECONDS = 0.04;
const REFLECTION_SECONDS = 0.0055;

// A note put in by hand: a sine at one frequency, dying away.
interface Pluck {
  phase: number;
  step: number;
  level: number;
}

// How quickly a plucked note dies: its level is multiplied by this each
// sample, which is about a twentieth of a second of the synth's time.
const PLUCK_DECAY = Math.exp(-1 / (0.05 * SAMPLE_RATE));

// The window every transform is taken through, tabulated once.
const HANN_STEPS = 1024;
const HANN = (() => {
  const table = new Float32Array(HANN_STEPS + 1);
  for (let i = 0; i <= HANN_STEPS; i++) {
    table[i] = 0.5 - 0.5 * Math.cos((TWO_PI * i) / HANN_STEPS);
  }
  return table;
})();

export class Synth {
  /** The most recent samples, as a ring. */
  readonly ring: Float32Array;
  /** Where the next sample goes. */
  head = 0;
  /** How many samples have been made in all. */
  count = 0;

  private phase1 = 0;
  private phase2 = 0;
  // The filter's two integrators.
  private ic1 = 0;
  private ic2 = 0;
  private readonly delay: Float32Array;
  private delayHead = 0;
  // The noise colours' running state, and the generator they draw from.
  private pink = [0, 0, 0];
  private brown = 0;
  private seed: number;
  private plucks: Pluck[] = [];

  constructor(size = 4096, seed = 0x2f6e2b1) {
    this.ring = new Float32Array(size);
    this.delay = new Float32Array(4096);
    this.seed = seed;
  }

  /**
   * The first oscillator's phase at the newest sample, in cycles — what an
   * oscilloscope triggers on to hold a waveform still.
   */
  get carrierPhase(): number {
    return this.phase1;
  }

  /** The modulators' clock at the next sample, in units. */
  get units(): number {
    return this.count / (SAMPLE_RATE * UNIT_SECONDS);
  }

  /** The sample `back` samples before the newest (0 is the newest). */
  at(back: number): number {
    const size = this.ring.length;
    return this.ring[(((this.head - 1 - back) % size) + size) % size];
  }

  /** Sound a note by hand: a sine at `hertz` that dies away. */
  pluck(hertz: number, level = 0.5): void {
    if (this.plucks.length >= 8) this.plucks.shift();
    this.plucks.push({ phase: 0, step: hertz / SAMPLE_RATE, level });
  }

  private random(): number {
    // A small linear congruential generator: noise that is the same noise
    // every run, so a test can say what it expects.
    this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0;
    return this.seed / 4294967296;
  }

  private noise(type: number): number {
    const white = this.random() * 2 - 1;
    if (type < 0.5) return white;
    if (type < 1.5) {
      // Pink: three leaky integrators at spaced corners, summed. Roughly
      // three decibels an octave down, which is all "pink" promises.
      const p = this.pink;
      p[0] = 0.99765 * p[0] + white * 0.099046;
      p[1] = 0.963 * p[1] + white * 0.2965164;
      p[2] = 0.57 * p[2] + white * 1.0526913;
      return (p[0] + p[1] + p[2] + white * 0.1848) * 0.25;
    }
    // Brown: white noise, integrated and leaked.
    this.brown = (this.brown + white * 0.02) / 1.02;
    return this.brown * 3.5;
  }

  /**
   * Make `samples` more samples. `voice`, when given, is another source
   * mixed in ahead of the output (the 404's number, played): it is called
   * with the synth's time in seconds and `duck` is how far the synth itself
   * is turned down under it.
   */
  render(
    samples: number,
    s: SynthSettings,
    voice?: (seconds: number) => number,
    duck = 0
  ): void {
    const ring = this.ring;
    const size = ring.length;
    const delay = this.delay;
    const delaySize = delay.length;
    const toUnits = 1 / (SAMPLE_RATE * UNIT_SECONDS);

    // The delay, in samples: the control's full travel is DELAY_SECONDS.
    // Short on purpose — at these lengths an echo is a comb, and a comb is
    // something a spectrogram can show: evenly spaced notches, closing up
    // as the delay lengthens.
    const delaySamples = Math.max(
      1,
      Math.min(
        delaySize - 1,
        Math.round(s.delayTime * DELAY_SECONDS * SAMPLE_RATE)
      )
    );
    const delayOn = s.delayMix > 0.01 && s.delayTime > 0.01;
    const reverbOn = s.reverbAmount > 0.01;
    const filterOn = s.filterType > 0.5;
    const quality = 0.5 + s.filterResonance * 12;
    const damp = 1 / quality;

    for (let n = 0; n < samples; n++) {
      const units = this.count * toUnits;
      const seconds = this.count / SAMPLE_RATE;

      // ── The oscillators ─────────────────────────────────────────────────
      // Frequency modulation, Chowning form: the modulator is added to the
      // carrier's phase. The carrier's own phase is accumulated rather than
      // computed from the clock, so a frequency changed under it changes
      // the pitch from here on instead of jumping the waveform.
      const fm1 =
        Math.sin(units * s.vco1FMFrequency) * s.vco1FMAmount * FM_INDEX_SCALE;
      const fm2 =
        Math.sin(units * s.vco2FMFrequency) * s.vco2FMAmount * FM_INDEX_SCALE;
      this.phase1 += s.vco1Frequency / SAMPLE_RATE;
      this.phase2 += (s.vco2Frequency * (1 + s.detune)) / SAMPLE_RATE;
      if (this.phase1 > 1e6) this.phase1 -= 1e6;
      if (this.phase2 > 1e6) this.phase2 -= 1e6;
      const vco1 =
        waveform(this.phase1 + fm1 + s.vco1Phase, s.vco1WaveformType) *
        s.vco1Amplitude;
      const vco2 =
        waveform(this.phase2 + fm2 + s.vco2Phase, s.vco2WaveformType) *
        s.vco2Amplitude;
      let x = vco1 + (vco2 - vco1) * s.mixRatio;

      // ── The effects, in order ───────────────────────────────────────────
      if (s.noiseAmount > 0.01) x += this.noise(s.noiseType) * s.noiseAmount;

      if (s.ringModAmount > 0.01) {
        const carrier = Math.sin(TWO_PI * s.ringModFrequency * seconds);
        x += (x * carrier - x) * s.ringModAmount;
      }

      if (filterOn) {
        // A state-variable filter, in the form that stays stable with the
        // cutoff anywhere below the Nyquist frequency — which matters,
        // because the cutoff is being swept.
        const sweep = Math.sin(units * s.filterLFOSpeed) * s.filterLFOAmount;
        const cutoff = Math.max(
          20,
          Math.min(SAMPLE_RATE * 0.45, (s.filterCutoff + sweep) * 10000)
        );
        const g = Math.tan((Math.PI * cutoff) / SAMPLE_RATE);
        const a1 = 1 / (1 + g * (g + damp));
        const a2 = g * a1;
        const a3 = g * a2;
        const v3 = x - this.ic2;
        const v1 = a1 * this.ic1 + a2 * v3;
        const v2 = this.ic2 + a2 * this.ic1 + a3 * v3;
        this.ic1 = 2 * v1 - this.ic1;
        this.ic2 = 2 * v2 - this.ic2;
        if (s.filterType < 1.5) x = v2;
        else if (s.filterType < 2.5) x = x - damp * v1 - v2;
        else x = v1 * damp;
      }

      x = distort(x, s.distortionAmount, s.distortionType);

      if (delayOn) {
        const read = (this.delayHead - delaySamples + delaySize) % delaySize;
        const echo = delay[read];
        delay[this.delayHead] = x + echo * s.delayFeedback;
        this.delayHead = (this.delayHead + 1) % delaySize;
        x += echo * s.delayMix;
      }

      if (reverbOn) {
        // Four early reflections off the samples already made, each later
        // and quieter than the last.
        let reflected = 0;
        for (let i = 1; i <= 4; i++) {
          const back = Math.min(
            size - 2,
            Math.round(
              (s.reverbPredelay * PREDELAY_SECONDS + i * REFLECTION_SECONDS) *
                SAMPLE_RATE
            )
          );
          reflected +=
            ring[(((this.head - 1 - back) % size) + size) % size] *
            Math.exp(-i * s.reverbDecay) *
            0.25;
        }
        x += reflected * 0.3 * s.reverbAmount;
      }

      // Notes put in by hand, and the 404's voice with the synth ducked
      // under it.
      for (let i = this.plucks.length - 1; i >= 0; i--) {
        const pluck = this.plucks[i];
        pluck.phase += pluck.step;
        x += Math.sin(pluck.phase * TWO_PI) * pluck.level;
        pluck.level *= PLUCK_DECAY;
        if (pluck.level < 1e-4) this.plucks.splice(i, 1);
      }
      if (voice) x = x * (1 - duck) + voice(seconds);

      // Whatever the controls are set to, the ring holds numbers.
      ring[this.head] = Number.isFinite(x) ? x : 0;
      this.head = (this.head + 1) % size;
      this.count += 1;
    }
  }
}

/**
 * The spectrum of the synth's most recent samples, at `out.length`
 * frequencies spaced along the display's axis.
 *
 * Each frequency is measured, not drawn: the samples are correlated against
 * a sine and a cosine at that frequency through a window, and what comes out
 * is how much of that frequency is in them. The window is `cycles` periods of
 * the frequency being measured, so every bin resolves the same musical
 * interval — a constant-Q transform, which is the transform a logarithmic
 * axis is asking for — up to `maxWindow` samples, which is as far back as
 * the lowest bins are allowed to listen.
 *
 * `smoothing` blends the window from rectangular to Hann. A rectangular
 * window gives the sharpest main lobe and the worst spectral leakage; Hann
 * trades a wider main lobe for far lower sidelobes, which reads as a
 * smoother spectrum. That blend *is* the smoothing control — no blurring
 * involved.
 *
 * Magnitudes are normalised by the window's own gain, so a change of window
 * does not change the height of a peak; a sine of amplitude 1 measures 1.
 */
export const analyse = (
  synth: Synth,
  axis: AxisSettings,
  out: Float32Array,
  cycles: number,
  smoothing: number,
  maxWindow = 1024
): void => {
  const ring = synth.ring;
  const size = ring.length;
  const bins = out.length;
  const limit = Math.min(maxWindow, size, Math.max(8, synth.count));
  const nyquist = SAMPLE_RATE / 2;

  for (let b = 0; b < bins; b++) {
    const hertz = axisFrequency((b + 0.5) / bins, axis);
    if (hertz >= nyquist) {
      out[b] = 0;
      continue;
    }
    const window = Math.max(
      16,
      Math.min(limit, Math.round((cycles * SAMPLE_RATE) / hertz))
    );
    // A phasor turned by one sample's worth of angle each step: the sine
    // and cosine at every sample, for two multiplies each.
    const angle = (TWO_PI * hertz) / SAMPLE_RATE;
    const turnC = Math.cos(angle);
    const turnS = Math.sin(angle);
    let c = 1;
    let s = 0;
    let re = 0;
    let im = 0;
    let gain = 0;
    const toHann = HANN_STEPS / (window - 1);
    let at = (((synth.head - window) % size) + size) % size;
    for (let i = 0; i < window; i++) {
      const w = 1 + (HANN[(i * toHann) | 0] - 1) * smoothing;
      const sample = ring[at] * w;
      re += sample * c;
      im += sample * s;
      gain += w;
      const nextC = c * turnC - s * turnS;
      s = c * turnS + s * turnC;
      c = nextC;
      at += 1;
      if (at === size) at = 0;
    }
    // The factor of two accounts for the negative-frequency image of a
    // real-valued signal.
    out[b] = (2 * Math.sqrt(re * re + im * im)) / Math.max(1, gain);
  }
};

/** How many decibels of the spectrum the display shows, from its loudest down. */
export const DISPLAY_RANGE_DB = 48;

/**
 * A magnitude as the display's level, 0 → 1: decibels below full scale,
 * over the display's range. Spectra are read in decibels because hearing is
 * — the tenth harmonic of a sawtooth is a tenth the amplitude of the first,
 * and plainly audible.
 */
export const toLevel = (magnitude: number): number => {
  if (!(magnitude > 0)) return 0;
  const decibels = 20 * Math.log10(magnitude / 0.6);
  const level = (decibels + DISPLAY_RANGE_DB) / DISPLAY_RANGE_DB;
  return level < 0 ? 0 : level > 1 ? 1 : level;
};

/** A level back as decibels, for the readout. */
export const levelToDecibels = (level: number): number =>
  level * DISPLAY_RANGE_DB - DISPLAY_RANGE_DB;
