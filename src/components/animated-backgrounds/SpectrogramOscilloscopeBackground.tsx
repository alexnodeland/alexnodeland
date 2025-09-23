import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { AnimatedBackgroundProps } from '../../types/animated-backgrounds';

const SpectrogramOscilloscopeBackground: React.FC<AnimatedBackgroundProps> = ({ className, settings }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const spectrogramTextureRef = useRef<THREE.DataTexture | null>(null);
  const waveformTextureRef = useRef<THREE.DataTexture | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    
    containerRef.current.appendChild(renderer.domElement);
    
    // Store references
    sceneRef.current = scene;
    rendererRef.current = renderer;

    // Create textures for spectrogram history and waveform
    const spectrogramWidth = 512; // Frequency bins
    const spectrogramHeight = 256; // Time history
    const spectrogramData = new Float32Array(spectrogramWidth * spectrogramHeight * 4);
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
      
      // Visual Parameters
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
            // Recursive delay with feedback
            float delayed = generateNoise(delayedT, 0.0) * 0.0; // Placeholder for actual delay buffer
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
          
          // Square waves have only odd harmonics
          if (uVCO1WaveformType > 0.5 && uVCO1WaveformType < 1.5) {
            if (mod(h, 2.0) < 1.0) harmAmp1 = 0.0;
            else harmAmp1 *= 1.5;
          }
          // Sawtooth has all harmonics
          else if (uVCO1WaveformType > 2.5) {
            harmAmp1 *= 1.2;
          }
          
          if (hdist1 < 15.0) magnitude += uVCO1Amplitude * exp(-hdist1 * 0.05) * harmAmp1;
          if (hdist2 < 15.0) magnitude += uVCO2Amplitude * exp(-hdist2 * 0.05) * harmAmp2;
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
      
      // Color mapping for spectrogram
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
        uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
        uMouse: { value: new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2) },
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
        uDelayTime: { value: settings.delayTime || 0.3 },
        uDelayFeedback: { value: settings.delayFeedback || 0.4 },
        uDelayMix: { value: settings.delayMix || 0.0 },
        
        // Filter Parameters
        uFilterType: { value: settings.filterType || 0 },
        uFilterCutoff: { value: settings.filterCutoff || 0.5 },
        uFilterResonance: { value: settings.filterResonance || 0.3 },
        uFilterLFOAmount: { value: settings.filterLFOAmount || 0.0 },
        uFilterLFOSpeed: { value: settings.filterLFOSpeed || 2.0 },
        
        // Distortion Parameters
        uDistortionAmount: { value: settings.distortionAmount || 0.0 },
        uDistortionType: { value: settings.distortionType || 0 },
        
        // Ring Modulator Parameters
        uRingModFrequency: { value: settings.ringModFrequency || 100.0 },
        uRingModAmount: { value: settings.ringModAmount || 0.0 },
        
        // Noise Generator Parameters
        uNoiseAmount: { value: settings.noiseAmount || 0.0 },
        uNoiseType: { value: settings.noiseType || 0 },
        
        // Reverb Parameters
        uReverbAmount: { value: settings.reverbAmount || 0.0 },
        uReverbDecay: { value: settings.reverbDecay || 0.5 },
        uReverbPredelay: { value: settings.reverbPredelay || 0.1 },
        
        // Visual Parameters
        uWaveformBrightness: { value: settings.waveformBrightness },
        uSpectrogramBrightness: { value: settings.spectrogramBrightness },
        uColorLow: { value: new THREE.Vector3(...settings.colors.low) },
        uColorMid: { value: new THREE.Vector3(...settings.colors.mid) },
        uColorHigh: { value: new THREE.Vector3(...settings.colors.high) },
        uColorPeak: { value: new THREE.Vector3(...settings.colors.peak) },
        uWaveformColor: { value: new THREE.Vector3(...settings.colors.waveform) },
        uWaveformThickness: { value: settings.waveformThickness },
        uSpectrogramSmoothing: { value: settings.spectrogramSmoothing },
        uFrequencyScale: { value: settings.frequencyScale },
        uTimeScale: { value: settings.timeScale },
        uFFTWindowSize: { value: settings.fftWindowSize },
        uUseLogScale: { value: settings.useLogScale || 1.0 },
        uMinLogFreq: { value: settings.minLogFreq || 20.0 },
        uMaxLogFreq: { value: settings.maxLogFreq || 8000.0 }
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending
    });

    // Create a plane geometry
    const geometry = new THREE.PlaneGeometry(2, 2);
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);

    // Mouse tracking
    const handleMouseMove = (event: MouseEvent) => {
      mouseRef.current.x = event.clientX;
      mouseRef.current.y = event.clientY;
    };

    window.addEventListener('mousemove', handleMouseMove);

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
        renderer.setSize(window.innerWidth, window.innerHeight);
        material.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      }
    };

    window.addEventListener('resize', handleResize);

    // Cleanup function
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      
      // Clean up Three.js resources
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      if (spectrogramTexture) spectrogramTexture.dispose();
      if (waveformTexture) waveformTexture.dispose();
    };
  }, [settings]);

  return (
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
        opacity: settings.opacity
      }}
    />
  );
};

export default SpectrogramOscilloscopeBackground;
