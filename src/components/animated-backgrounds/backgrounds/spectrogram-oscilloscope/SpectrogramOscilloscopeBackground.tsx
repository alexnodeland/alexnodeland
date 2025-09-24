import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { AnimatedBackgroundProps } from '../../core/types';
import { SpectrogramOscilloscopeSettings } from './config';

const SpectrogramOscilloscopeBackground: React.FC<
  AnimatedBackgroundProps<SpectrogramOscilloscopeSettings>
> = ({ className, settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const spectrogramTextureRef = useRef<THREE.DataTexture | null>(null);
  const waveformTextureRef = useRef<THREE.DataTexture | null>(null);

  // Web Audio API references
  const audioContextRef = useRef<AudioContext | null>(null);
  const vco1Ref = useRef<OscillatorNode | null>(null);
  const vco2Ref = useRef<OscillatorNode | null>(null);
  const gainNodeRef = useRef<GainNode | null>(null);
  const filterNodeRef = useRef<BiquadFilterNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const distortionNodeRef = useRef<WaveShaperNode | null>(null);
  const convolverNodeRef = useRef<ConvolverNode | null>(null);
  const isPlayingRef = useRef<boolean>(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);

    container.appendChild(renderer.domElement);

    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Create textures for spectrogram history and waveform
    const spectrogramWidth = 512; // Frequency bins
    const spectrogramHeight = 256; // Time history
    const spectrogramData = new Float32Array(
      spectrogramWidth * spectrogramHeight * 4
    );
    const spectrogramTexture = new THREE.DataTexture(
      spectrogramData,
      spectrogramWidth,
      spectrogramHeight,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    spectrogramTexture.needsUpdate = true;
    spectrogramTextureRef.current = spectrogramTexture;

    // Waveform texture for current signal
    const waveformSize = 1024;
    const waveformData = new Float32Array(waveformSize * 4);
    const waveformTexture = new THREE.DataTexture(
      waveformData,
      waveformSize,
      1,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    waveformTexture.needsUpdate = true;
    waveformTextureRef.current = waveformTexture;

    // Vertex shader
    const vertexShader = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;

    // Fragment shader for spectrogram and oscilloscope visualization
    const fragmentShader = `
      uniform float uTime;
      uniform vec2 uResolution;
      uniform vec2 uMouse;
      uniform sampler2D uSpectrogramTexture;
      uniform sampler2D uWaveformTexture;
      uniform float uCurrentRow;

      // VCO 1 Parameters
      uniform float uVCO1Frequency;
      uniform float uVCO1Amplitude;
      uniform float uVCO1WaveformType; // 0: sine, 1: square, 2: triangle, 3: sawtooth
      uniform float uVCO1Phase;
      uniform float uVCO1FMAmount;
      uniform float uVCO1FMFrequency;

      // VCO 2 Parameters
      uniform float uVCO2Frequency;
      uniform float uVCO2Amplitude;
      uniform float uVCO2WaveformType;
      uniform float uVCO2Phase;
      uniform float uVCO2FMAmount;
      uniform float uVCO2FMFrequency;

      // Mixer Parameters
      uniform float uMixRatio;
      uniform float uDetune;

      // Delay/Echo Parameters
      uniform float uDelayTime;
      uniform float uDelayFeedback;
      uniform float uDelayMix;

      // Filter Parameters
      uniform float uFilterType; // 0: bypass, 1: lowpass, 2: highpass, 3: bandpass
      uniform float uFilterCutoff;
      uniform float uFilterResonance;
      uniform float uFilterLFOAmount;
      uniform float uFilterLFOSpeed;

      // Distortion Parameters
      uniform float uDistortionAmount;
      uniform float uDistortionType; // 0: soft clip, 1: hard clip, 2: foldback, 3: bitcrush

      // Ring Modulator Parameters
      uniform float uRingModFrequency;
      uniform float uRingModAmount;

      // Noise Generator Parameters
      uniform float uNoiseAmount;
      uniform float uNoiseType; // 0: white, 1: pink, 2: brown

      // Reverb Parameters
      uniform float uReverbAmount;
      uniform float uReverbDecay;
      uniform float uReverbPredelay;

      // Visual Parameters using standardized colors
      uniform float uWaveformBrightness;
      uniform float uSpectrogramBrightness;
      uniform vec3 uColorLow;
      uniform vec3 uColorMid;
      uniform vec3 uColorHigh;
      uniform vec3 uColorPeak;
      uniform vec3 uWaveformColor;
      uniform float uWaveformThickness;
      uniform float uSpectrogramSmoothing;
      uniform float uFrequencyScale;
      uniform float uTimeScale;
      uniform float uFFTWindowSize;
      uniform float uUseLogScale;
      uniform float uMinLogFreq;
      uniform float uMaxLogFreq;

      varying vec2 vUv;

      // Generate waveform based on type
      float generateWaveform(float phase, float waveformType) {
        float p = fract(phase);

        if (waveformType < 0.5) {
          // Sine wave
          return sin(phase * 6.28318530718);
        } else if (waveformType < 1.5) {
          // Square wave
          return p < 0.5 ? 1.0 : -1.0;
        } else if (waveformType < 2.5) {
          // Triangle wave
          return 4.0 * abs(p - 0.5) - 1.0;
        } else {
          // Sawtooth wave
          return 2.0 * p - 1.0;
        }
      }

      // Pseudo-random number generator
      float hash(float n) {
        return fract(sin(n) * 43758.5453);
      }

      // Generate noise
      float generateNoise(float t, float noiseType) {
        if (noiseType < 0.5) {
          // White noise
          return hash(t * 100.0) * 2.0 - 1.0;
        } else if (noiseType < 1.5) {
          // Pink noise approximation
          float n = hash(t * 100.0) * 2.0 - 1.0;
          n += hash(t * 50.0) * 2.0 - 1.0;
          n += hash(t * 25.0) * 2.0 - 1.0;
          return n / 3.0;
        } else {
          // Brown noise approximation
          float prev = hash(floor(t * 100.0)) * 2.0 - 1.0;
          float next = hash(floor(t * 100.0) + 1.0) * 2.0 - 1.0;
          return mix(prev, next, fract(t * 100.0)) * 0.5;
        }
      }

      // Apply distortion
      float applyDistortion(float signal, float amount, float distType) {
        if (amount < 0.01) return signal;

        if (distType < 0.5) {
          // Soft clipping (tanh-like)
          float drive = 1.0 + amount * 10.0;
          return tanh(signal * drive) / drive;
        } else if (distType < 1.5) {
          // Hard clipping
          float threshold = 1.0 - amount;
          return clamp(signal, -threshold, threshold) / threshold;
        } else if (distType < 2.5) {
          // Foldback distortion
          float fold = 1.0 - amount * 0.9;
          float s = abs(signal);
          while (s > fold) {
            s = 2.0 * fold - s;
          }
          return sign(signal) * s;
        } else {
          // Bit crusher
          float bits = mix(16.0, 2.0, amount);
          float levels = pow(2.0, bits);
          return floor(signal * levels) / levels;
        }
      }

      // Simple filter implementation
      float applyFilter(float signal, float cutoff, float resonance, float filterType, float t) {
        // LFO for filter modulation
        float lfo = sin(t * uFilterLFOSpeed) * uFilterLFOAmount;
        float fc = cutoff + lfo;
        fc = clamp(fc, 0.01, 0.99);

        // Simple approximation of filters using frequency-dependent attenuation
        if (filterType < 0.5) {
          // Bypass
          return signal;
        } else if (filterType < 1.5) {
          // Lowpass - attenuate high frequencies
          float smoothing = 1.0 - fc;
          return signal * (1.0 - smoothing) + sin(t * 100.0) * smoothing * resonance * 0.1;
        } else if (filterType < 2.5) {
          // Highpass - attenuate low frequencies
          float edge = fc;
          return signal * edge + cos(t * 1000.0) * (1.0 - edge) * resonance * 0.1;
        } else {
          // Bandpass - combination
          float width = 0.1;
          float low = max(0.0, fc - width);
          float high = min(1.0, fc + width);
          return signal * (high - low) * 2.0 + sin(t * fc * 1000.0) * resonance * 0.1;
        }
      }

      // Generate signal at specific time with effects chain
      float generateSignal(float t) {
        // === VCO GENERATION ===
        // FM modulation for VCO1
        float fm1 = sin(t * uVCO1FMFrequency) * uVCO1FMAmount;
        float vco1Phase = t * (uVCO1Frequency * 0.01 + fm1) + uVCO1Phase;

        // FM modulation for VCO2 with detune
        float fm2 = sin(t * uVCO2FMFrequency) * uVCO2FMAmount;
        float vco2Phase = t * (uVCO2Frequency * 0.01 * (1.0 + uDetune) + fm2) + uVCO2Phase;

        // Generate VCO signals
        float vco1 = generateWaveform(vco1Phase, uVCO1WaveformType) * uVCO1Amplitude;
        float vco2 = generateWaveform(vco2Phase, uVCO2WaveformType) * uVCO2Amplitude;

        // Mix VCO signals
        float signal = mix(vco1, vco2, uMixRatio);

        // === EFFECTS CHAIN ===

        // Add noise
        if (uNoiseAmount > 0.01) {
          float noise = generateNoise(t, uNoiseType);
          signal = mix(signal, signal + noise, uNoiseAmount);
        }

        // Ring modulation
        if (uRingModAmount > 0.01) {
          float ringMod = sin(t * uRingModFrequency * 0.1);
          signal = mix(signal, signal * ringMod, uRingModAmount);
        }

        // Apply filter
        if (uFilterType > 0.5) {
          signal = applyFilter(signal, uFilterCutoff, uFilterResonance, uFilterType, t);
        }

        // Apply distortion
        if (uDistortionAmount > 0.01) {
          signal = applyDistortion(signal, uDistortionAmount, uDistortionType);
        }

        // Delay/Echo effect (simplified - adds previous signal)
        if (uDelayMix > 0.01 && uDelayTime > 0.01) {
          float delayedT = t - uDelayTime * 0.1;
          if (delayedT > 0.0) {
            // Approximate delay with phase-shifted signal
            float delayPhase1 = delayedT * (uVCO1Frequency * 0.01 + sin(delayedT * uVCO1FMFrequency) * uVCO1FMAmount);
            float delayPhase2 = delayedT * (uVCO2Frequency * 0.01 * (1.0 + uDetune));
            float delaySignal = generateWaveform(delayPhase1, uVCO1WaveformType) * uVCO1Amplitude * 0.5;
            delaySignal += generateWaveform(delayPhase2, uVCO2WaveformType) * uVCO2Amplitude * 0.5;
            delaySignal *= uDelayFeedback;

            signal = mix(signal, signal + delaySignal, uDelayMix);
          }
        }

        // Simple reverb approximation (multiple delays with decay)
        if (uReverbAmount > 0.01) {
          float reverb = 0.0;
          for(float i = 1.0; i <= 4.0; i += 1.0) {
            float revTime = t - (uReverbPredelay + i * 0.02) * 0.1;
            if (revTime > 0.0) {
              float revPhase = revTime * uVCO1Frequency * 0.01;
              float revSignal = sin(revPhase) * exp(-i * uReverbDecay);
              reverb += revSignal * 0.25;
            }
          }
          signal = mix(signal, signal + reverb * 0.3, uReverbAmount);
        }

        return signal;
      }

      // Enhanced FFT magnitude calculation with better harmonic content
      float getFrequencyMagnitude(float freq, float time) {
        float magnitude = 0.0;
        float samples = 64.0;

        // Analyze a window of the signal
        for(float i = 0.0; i < samples; i += 1.0) {
          float t = time + i * 0.001;
          float signal = generateSignal(t);

          // Correlate with test frequency (both sine and cosine for better accuracy)
          magnitude += signal * sin(freq * i * 0.1);
          magnitude += signal * cos(freq * i * 0.1) * 0.5;
        }

        magnitude = abs(magnitude) / samples;

        // Convert frequency to Hz for harmonic calculations
        float freqHz = freq * 100.0;
        float f1 = uVCO1Frequency;
        float f2 = uVCO2Frequency * (1.0 + uDetune);

        // Add fundamental frequencies with wider detection range
        float dist1 = abs(freqHz - f1);
        float dist2 = abs(freqHz - f2);

        if (dist1 < 20.0) magnitude += uVCO1Amplitude * exp(-dist1 * 0.1);
        if (dist2 < 20.0) magnitude += uVCO2Amplitude * exp(-dist2 * 0.1);

        // Extended harmonics for richer spectrum (up to 20th harmonic)
        for (float h = 2.0; h <= 20.0; h += 1.0) {
          float hdist1 = abs(freqHz - f1 * h);
          float hdist2 = abs(freqHz - f2 * h);

          // Waveform-dependent harmonic amplitude
          float harmAmp1 = 1.0 / pow(h, 0.7); // Slower rolloff
          float harmAmp2 = 1.0 / pow(h, 0.7);

          // Square waves have only odd harmonics with 1/n amplitude
          if (uVCO1WaveformType > 0.5 && uVCO1WaveformType < 1.5) {
            if (mod(h, 2.0) > 0.1) harmAmp1 *= 2.0 / h; // Strong odd harmonics
            else harmAmp1 = 0.0;
          }
          // Sawtooth has all harmonics with 1/n amplitude
          else if (uVCO1WaveformType > 2.5) {
            harmAmp1 = 1.5 / h;
          }
          // Triangle has only odd harmonics with 1/n² amplitude
          else if (uVCO1WaveformType > 1.5 && uVCO1WaveformType < 2.5) {
            if (mod(h, 2.0) > 0.1) harmAmp1 = 0.8 / (h * h);
            else harmAmp1 = 0.0;
          }

          // Same for VCO2
          if (uVCO2WaveformType > 0.5 && uVCO2WaveformType < 1.5) {
            if (mod(h, 2.0) > 0.1) harmAmp2 *= 2.0 / h;
            else harmAmp2 = 0.0;
          }
          else if (uVCO2WaveformType > 2.5) {
            harmAmp2 = 1.5 / h;
          }
          else if (uVCO2WaveformType > 1.5 && uVCO2WaveformType < 2.5) {
            if (mod(h, 2.0) > 0.1) harmAmp2 = 0.8 / (h * h);
            else harmAmp2 = 0.0;
          }

          if (hdist1 < 20.0) magnitude += uVCO1Amplitude * exp(-hdist1 * 0.03) * harmAmp1;
          if (hdist2 < 20.0) magnitude += uVCO2Amplitude * exp(-hdist2 * 0.03) * harmAmp2;
        }

        // Add subharmonics for bass richness
        for (float s = 2.0; s <= 4.0; s += 1.0) {
          float sdist1 = abs(freqHz - f1 / s);
          float sdist2 = abs(freqHz - f2 / s);
          if (sdist1 < 10.0) magnitude += uVCO1Amplitude * exp(-sdist1 * 0.1) * 0.3;
          if (sdist2 < 10.0) magnitude += uVCO2Amplitude * exp(-sdist2 * 0.1) * 0.3;
        }

        // Effects add frequency content
        if (uDistortionAmount > 0.01) {
          // Distortion adds high harmonics
          for (float h = 3.0; h <= 10.0; h += 2.0) {
            if (abs(freqHz - f1 * h) < 30.0) {
              magnitude += uDistortionAmount * exp(-abs(freqHz - f1 * h) * 0.02) * 0.5;
            }
          }
        }

        if (uRingModAmount > 0.01) {
          // Ring mod creates sidebands
          float ringHz = uRingModFrequency;
          magnitude += uRingModAmount * exp(-abs(freqHz - (f1 + ringHz)) * 0.05) * 0.4;
          magnitude += uRingModAmount * exp(-abs(freqHz - abs(f1 - ringHz)) * 0.05) * 0.4;
        }

        if (uNoiseAmount > 0.01) {
          // Noise adds broadband energy
          magnitude += uNoiseAmount * 0.05 * (1.0 + hash(freqHz) * 0.3);
        }

        return magnitude;
      }

      // Color mapping for spectrogram using standardized colors
      vec3 spectrogramColor(float value) {
        // Enhance contrast
        value = pow(value * 2.0, 1.5);
        value = clamp(value, 0.0, 1.0);

        if (value < 0.25) {
          return mix(uColorLow * 0.1, uColorLow, value * 4.0);
        } else if (value < 0.5) {
          return mix(uColorLow, uColorMid, (value - 0.25) * 4.0);
        } else if (value < 0.75) {
          return mix(uColorMid, uColorHigh, (value - 0.5) * 4.0);
        } else {
          return mix(uColorHigh, uColorPeak, (value - 0.75) * 4.0);
        }
      }

      void main() {
        vec2 uv = gl_FragCoord.xy / uResolution.xy;
        vec3 finalColor = vec3(0.0);

        // Layout: oscilloscope on top 30%, spectrogram below
        float scopeHeight = 0.3;
        float scopeEnd = 1.0 - scopeHeight;

        if (uv.y > scopeEnd) {
          // === OSCILLOSCOPE SECTION ===
          float scopeY = (uv.y - scopeEnd) / scopeHeight;

          // Generate current signal for display
          float timeOffset = uv.x * 4.0; // Show 4 periods
          float displayTime = uTime + timeOffset;
          float signal = generateSignal(displayTime);

          // Map signal to scope Y position
          float waveY = signal * 0.4 + 0.5;

          // Draw waveform with glow
          float dist = abs(scopeY - waveY);
          float waveIntensity = exp(-dist * 100.0 / uWaveformThickness);
          float glowIntensity = exp(-dist * 10.0 / uWaveformThickness) * 0.3;

          vec3 waveColor = uWaveformColor * (waveIntensity + glowIntensity) * uWaveformBrightness;
          finalColor += waveColor;

          // Grid overlay for oscilloscope
          float gridX = smoothstep(0.003, 0.001, abs(fract(uv.x * 8.0) - 0.5));
          float gridY = smoothstep(0.003, 0.001, abs(fract(scopeY * 4.0) - 0.5));
          finalColor += vec3(0.1, 0.15, 0.2) * max(gridX, gridY) * 0.25;

        } else {
          // === SPECTROGRAM SECTION ===
          float spectrogramY = 1.0 - (uv.y / scopeEnd); // Inverted so newest is at top

          // Calculate time offset for this row
          float timeOffset = spectrogramY * 5.0 * uTimeScale; // History depth
          float analysisTime = uTime - timeOffset;

          // Map horizontal position to frequency (linear or logarithmic)
          float frequency;
          if (uUseLogScale > 0.5) {
            // Logarithmic scale for better frequency distribution
            float logMin = log(uMinLogFreq);
            float logMax = log(uMaxLogFreq);
            float logFreq = mix(logMin, logMax, uv.x);
            frequency = exp(logFreq) / 100.0; // Convert back to our internal scale

            // Draw logarithmic frequency grid
            float octave = log(frequency * 100.0) / log(2.0);
            float octaveGrid = smoothstep(0.01, 0.001, abs(fract(octave) - 0.5));
            finalColor += vec3(0.05, 0.1, 0.15) * octaveGrid * 0.4;

            // Add markers at musical frequencies (A notes across octaves)
            for (float octaveA = 55.0; octaveA <= 3520.0; octaveA *= 2.0) {
              float markerPos = (log(octaveA) - logMin) / (logMax - logMin);
              if (abs(uv.x - markerPos) < 0.002) {
                finalColor += vec3(0.1, 0.2, 0.3) * 0.5;
              }
            }
          } else {
            // Linear scale (original)
            frequency = uv.x * uFrequencyScale * 20.0;

            // Frequency grid lines
            float freqGrid = smoothstep(0.003, 0.001, abs(fract(uv.x * 10.0) - 0.5));
            finalColor += vec3(0.02, 0.05, 0.08) * freqGrid * 0.3;
          }

          // Get magnitude at this frequency and time
          float magnitude = getFrequencyMagnitude(frequency, analysisTime);

          // Apply fade with distance (older = dimmer)
          float ageFade = 1.0 - spectrogramY * 0.7;
          magnitude *= ageFade;

          // Color based on magnitude
          vec3 spectroColor = spectrogramColor(magnitude);
          finalColor += spectroColor * uSpectrogramBrightness;

          // Time grid lines
          float timeGrid = smoothstep(0.003, 0.001, abs(fract(spectrogramY * 10.0) - 0.5));
          finalColor += vec3(0.02, 0.05, 0.08) * timeGrid * 0.2;
        }

        // Separator line between sections
        float separatorDist = abs(uv.y - scopeEnd);
        float separator = smoothstep(0.004, 0.001, separatorDist);
        finalColor += uWaveformColor * separator * 0.4;

        // Mouse frequency analyzer
        vec2 mouseUV = uMouse / uResolution;
        if (length(uv - mouseUV) < 0.05 && uv.y < scopeEnd) {
          float mouseFreq;
          if (uUseLogScale > 0.5) {
            float logMin = log(uMinLogFreq);
            float logMax = log(uMaxLogFreq);
            float logFreq = mix(logMin, logMax, mouseUV.x);
            mouseFreq = exp(logFreq) / 100.0;
          } else {
            mouseFreq = mouseUV.x * uFrequencyScale * 20.0;
          }
          float mouseMag = getFrequencyMagnitude(mouseFreq, uTime);
          float intensity = exp(-length(uv - mouseUV) * 40.0) * mouseMag;
          finalColor += vec3(1.0, 0.8, 0.0) * intensity;
        }

        gl_FragColor = vec4(finalColor, 1.0);
      }
    `;

    // Create shader material with VCO and spectrogram parameters
    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0.0 },
        uResolution: {
          value: new THREE.Vector2(
            renderer.domElement.width,
            renderer.domElement.height
          ),
        },
        uMouse: {
          value: new THREE.Vector2(
            renderer.domElement.width / 2,
            renderer.domElement.height / 2
          ),
        },
        uSpectrogramTexture: { value: spectrogramTexture },
        uWaveformTexture: { value: waveformTexture },
        uCurrentRow: { value: 0.0 },

        // VCO 1 Parameters
        uVCO1Frequency: { value: settings.vco1Frequency },
        uVCO1Amplitude: { value: settings.vco1Amplitude },
        uVCO1WaveformType: { value: settings.vco1WaveformType },
        uVCO1Phase: { value: settings.vco1Phase },
        uVCO1FMAmount: { value: settings.vco1FMAmount },
        uVCO1FMFrequency: { value: settings.vco1FMFrequency },

        // VCO 2 Parameters
        uVCO2Frequency: { value: settings.vco2Frequency },
        uVCO2Amplitude: { value: settings.vco2Amplitude },
        uVCO2WaveformType: { value: settings.vco2WaveformType },
        uVCO2Phase: { value: settings.vco2Phase },
        uVCO2FMAmount: { value: settings.vco2FMAmount },
        uVCO2FMFrequency: { value: settings.vco2FMFrequency },

        // Mixer Parameters
        uMixRatio: { value: settings.mixRatio },
        uDetune: { value: settings.detune },

        // Delay/Echo Parameters
        uDelayTime: { value: settings.delayTime },
        uDelayFeedback: { value: settings.delayFeedback },
        uDelayMix: { value: settings.delayMix },

        // Filter Parameters
        uFilterType: { value: settings.filterType },
        uFilterCutoff: { value: settings.filterCutoff },
        uFilterResonance: { value: settings.filterResonance },
        uFilterLFOAmount: { value: settings.filterLFOAmount },
        uFilterLFOSpeed: { value: settings.filterLFOSpeed },

        // Distortion Parameters
        uDistortionAmount: { value: settings.distortionAmount },
        uDistortionType: { value: settings.distortionType },

        // Ring Modulator Parameters
        uRingModFrequency: { value: settings.ringModFrequency },
        uRingModAmount: { value: settings.ringModAmount },

        // Noise Generator Parameters
        uNoiseAmount: { value: settings.noiseAmount },
        uNoiseType: { value: settings.noiseType },

        // Reverb Parameters
        uReverbAmount: { value: settings.reverbAmount },
        uReverbDecay: { value: settings.reverbDecay },
        uReverbPredelay: { value: settings.reverbPredelay },

        // Visual Parameters using standardized colors
        uWaveformBrightness: { value: settings.waveformBrightness },
        uSpectrogramBrightness: { value: settings.spectrogramBrightness },
        uColorLow: { value: new THREE.Vector3(...settings.colors.background) },
        uColorMid: { value: new THREE.Vector3(...settings.colors.primary) },
        uColorHigh: { value: new THREE.Vector3(...settings.colors.secondary) },
        uColorPeak: { value: new THREE.Vector3(...settings.colors.accent) },
        uWaveformColor: {
          value: new THREE.Vector3(...settings.colors.primary),
        },
        uWaveformThickness: { value: settings.waveformThickness },
        uSpectrogramSmoothing: { value: settings.spectrogramSmoothing },
        uFrequencyScale: { value: settings.frequencyScale },
        uTimeScale: { value: settings.timeScale },
        uFFTWindowSize: { value: settings.fftWindowSize },
        uUseLogScale: { value: settings.useLogScale },
        uMinLogFreq: { value: settings.minLogFreq },
        uMaxLogFreq: { value: settings.maxLogFreq },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
    });

    // Create a plane geometry
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Mouse tracking
    const handleMouseMove = (event: MouseEvent) => {
      const pixelRatio = renderer.getPixelRatio();
      mouseRef.current.x = event.clientX * pixelRatio;
      mouseRef.current.y = event.clientY * pixelRatio;
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Web Audio API functions (currently unused but kept for future expansion)

    const startAudioPlayback = async () => {
      if (isPlayingRef.current) return;

      try {
        // Create audio context
        audioContextRef.current = new (window.AudioContext ||
          (window as any).webkitAudioContext)();

        // Resume context if suspended (browser security)
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
        }

        // Create oscillators
        vco1Ref.current = audioContextRef.current.createOscillator();
        vco2Ref.current = audioContextRef.current.createOscillator();

        // Set oscillator types
        const waveTypes = ['sine', 'square', 'triangle', 'sawtooth'] as const;
        vco1Ref.current.type = waveTypes[Math.floor(settings.vco1WaveformType)];
        vco2Ref.current.type = waveTypes[Math.floor(settings.vco2WaveformType)];

        // Set frequencies
        vco1Ref.current.frequency.value = settings.vco1Frequency;
        vco2Ref.current.frequency.value =
          settings.vco2Frequency * (1 + settings.detune);

        // Create gain nodes for mixing
        const vco1Gain = audioContextRef.current.createGain();
        const vco2Gain = audioContextRef.current.createGain();
        vco1Gain.gain.value = settings.vco1Amplitude * 0.3; // Scale for audible volume
        vco2Gain.gain.value = settings.vco2Amplitude * 0.3;

        // Create mixer
        const mixer = audioContextRef.current.createGain();
        mixer.gain.value = 0.7; // Overall volume control

        // Create filter
        filterNodeRef.current = audioContextRef.current.createBiquadFilter();
        const filterTypes = [
          'lowpass',
          'lowpass',
          'highpass',
          'bandpass',
        ] as const;
        filterNodeRef.current.type =
          filterTypes[Math.floor(settings.filterType)];
        filterNodeRef.current.frequency.value = settings.filterCutoff * 10000;
        filterNodeRef.current.Q.value = settings.filterResonance * 30;

        // Final gain for output
        gainNodeRef.current = audioContextRef.current.createGain();
        gainNodeRef.current.gain.value = 0; // Start at 0, ramp up

        // Connect the audio graph
        vco1Ref.current.connect(vco1Gain);
        vco2Ref.current.connect(vco2Gain);
        vco1Gain.connect(mixer);
        vco2Gain.connect(mixer);

        // Apply effects chain - simplified for debugging
        let currentNode: AudioNode = mixer;

        // Filter
        if (settings.filterType > 0) {
          currentNode.connect(filterNodeRef.current);
          currentNode = filterNodeRef.current;
        }

        // Connect directly to output for now
        currentNode.connect(gainNodeRef.current);
        gainNodeRef.current.connect(audioContextRef.current.destination);

        // Start oscillators
        vco1Ref.current.start();
        vco2Ref.current.start();

        // Fade in - use linear ramp for more reliable fade
        gainNodeRef.current.gain.setValueAtTime(
          0.001,
          audioContextRef.current.currentTime
        );
        gainNodeRef.current.gain.linearRampToValueAtTime(
          0.4,
          audioContextRef.current.currentTime + 0.1
        );

        // Add FM modulation
        if (settings.vco1FMAmount > 0) {
          const lfo1 = audioContextRef.current.createOscillator();
          const lfo1Gain = audioContextRef.current.createGain();
          lfo1.frequency.value = settings.vco1FMFrequency;
          lfo1Gain.gain.value = settings.vco1FMAmount * 50;
          lfo1.connect(lfo1Gain);
          lfo1Gain.connect(vco1Ref.current.frequency);
          lfo1.start();
        }

        if (settings.vco2FMAmount > 0) {
          const lfo2 = audioContextRef.current.createOscillator();
          const lfo2Gain = audioContextRef.current.createGain();
          lfo2.frequency.value = settings.vco2FMFrequency;
          lfo2Gain.gain.value = settings.vco2FMAmount * 50;
          lfo2.connect(lfo2Gain);
          lfo2Gain.connect(vco2Ref.current.frequency);
          lfo2.start();
        }

        // Add filter LFO
        if (settings.filterLFOAmount > 0 && filterNodeRef.current) {
          const filterLFO = audioContextRef.current.createOscillator();
          const filterLFOGain = audioContextRef.current.createGain();
          filterLFO.frequency.value = settings.filterLFOSpeed;
          filterLFOGain.gain.value = settings.filterLFOAmount * 5000;
          filterLFO.connect(filterLFOGain);
          filterLFOGain.connect(filterNodeRef.current.frequency);
          filterLFO.start();
        }

        isPlayingRef.current = true;
      } catch (error) {
        // Audio playback failed - silently continue
        isPlayingRef.current = false;
      }
    };

    const stopAudioPlayback = () => {
      if (!isPlayingRef.current) return;

      try {
        // Fade out
        if (gainNodeRef.current && audioContextRef.current) {
          gainNodeRef.current.gain.linearRampToValueAtTime(
            0.001,
            audioContextRef.current.currentTime + 0.1
          );

          // Stop after fade
          setTimeout(() => {
            if (vco1Ref.current) {
              try {
                vco1Ref.current.stop();
              } catch (e) {
                // Already stopped
              }
              vco1Ref.current = null;
            }
            if (vco2Ref.current) {
              try {
                vco2Ref.current.stop();
              } catch (e) {
                // Already stopped
              }
              vco2Ref.current = null;
            }
            if (audioContextRef.current) {
              audioContextRef.current.close();
              audioContextRef.current = null;
            }

            gainNodeRef.current = null;
            filterNodeRef.current = null;
            delayNodeRef.current = null;
            distortionNodeRef.current = null;
            convolverNodeRef.current = null;
            isPlayingRef.current = false;
          }, 150);
        }
      } catch (error) {
        // Audio stop failed - silently continue
      }
    };

    // Keyboard event handlers
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'p' && !event.repeat) {
        startAudioPlayback();
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() === 'p') {
        stopAudioPlayback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Animation loop
    let currentRow = 0;
    const animate = (time: number) => {
      const t = time * 0.001;

      if (material.uniforms.uTime) {
        material.uniforms.uTime.value = t * settings.globalTimeMultiplier;
      }

      // Update mouse uniform
      if (material.uniforms.uMouse) {
        material.uniforms.uMouse.value.x = mouseRef.current.x;
        material.uniforms.uMouse.value.y = mouseRef.current.y;
      }

      // Update spectrogram texture row counter
      currentRow = (currentRow + 1) % spectrogramHeight;
      if (material.uniforms.uCurrentRow) {
        material.uniforms.uCurrentRow.value = currentRow / spectrogramHeight;
      }

      renderer.render(scene, camera);
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate(0);

    // Handle window resize
    const handleResize = () => {
      if (renderer && material.uniforms.uResolution) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);
        material.uniforms.uResolution.value.set(
          renderer.domElement.width,
          renderer.domElement.height
        );
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      // Stop audio if playing
      stopAudioPlayback();

      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);

      if (container && renderer.domElement) {
        container.removeChild(renderer.domElement);
      }

      // Clean up Three.js resources
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (spectrogramTexture) spectrogramTexture.dispose();
      if (waveformTexture) waveformTexture.dispose();
    };
  }, [settings]);

  // State for showing audio playback indicator
  const [isPlaying, setIsPlaying] = React.useState(false);

  // Update the audio playback functions to set state
  React.useEffect(() => {
    // Monitor playing state for UI update
    const checkInterval = setInterval(() => {
      setIsPlaying(isPlayingRef.current);
    }, 100);

    return () => clearInterval(checkInterval);
  }, []);

  return (
    <>
      <div
        ref={containerRef}
        className={className}
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          zIndex: -1,
          pointerEvents: 'none',
          opacity: settings.opacity,
        }}
      />
      {isPlaying && (
        <div
          style={{
            position: 'fixed',
            bottom: '20px',
            right: '20px',
            padding: '10px 20px',
            background: 'rgba(0, 255, 127, 0.2)',
            border: '2px solid rgba(0, 255, 127, 0.8)',
            borderRadius: '25px',
            color: 'rgba(0, 255, 127, 1)',
            fontFamily: 'monospace',
            fontSize: '14px',
            fontWeight: 'bold',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            backdropFilter: 'blur(10px)',
            pointerEvents: 'none',
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: 'rgba(0, 255, 127, 1)',
              boxShadow: '0 0 10px rgba(0, 255, 127, 0.8)',
            }}
          />
          <span>♪ audio playing</span>
        </div>
      )}
    </>
  );
};

export default SpectrogramOscilloscopeBackground;
