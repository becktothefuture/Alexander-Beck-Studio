// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    SOUND ENGINE — "SOFT ORGANIC IMPACTS"                     ║
// ║    Realistic, non-melodic collision sounds with intensity-driven dynamics    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Sound Design: Soft Organic Impacts
 * 
 * Key principles for realism:
 * - Intensity drives EVERYTHING: soft touches ≈ silent, hard hits ≈ audible
 * - Non-linear dynamics: energy^1.5 curve means gentle hits are very quiet
 * - Darker timbre baseline: only hard impacts reveal high frequencies
 * - Micro-variance on all parameters: no two hits sound identical
 * - Aggressive high-frequency rolloff: prevents harsh/clacky artifacts
 * - Soft limiting: peaks are compressed, never clip
 * 
 * Performance: 8-voice pool, O(1) per collision, ~3ms audio latency
 */

// ════════════════════════════════════════════════════════════════════════════════
// MICRO-VARIATION HELPER
// Real-world collisions NEVER sound identical.
// ════════════════════════════════════════════════════════════════════════════════

/** Add random variance to a value: vary(100, 0.15) → 85–115 */
function vary(base, variance = 0.15) {
  return base * (1 + (Math.random() - 0.5) * 2 * variance);
}

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION — Locked baseline for soft organic impacts
// ════════════════════════════════════════════════════════════════════════════════
const BASE_CONFIG = {
  // Synthesis
  attackTime: 0.005,
  decayTime: 0.075,
  harmonicGain: 0.0,
  
  // Filter (timbre)
  filterBaseFreq: 580,
  filterVelocityRange: 400,
  filterQ: 0.18,
  filterMinHz: 350,
  filterMaxHz: 2800,
  
  // Pitch mapping (radius → frequency)
  pitchMinHz: 145,
  pitchMaxHz: 280,
  pitchCurve: 1.0,
  
  // Reverb
  reverbDecay: 0.14,
  reverbWetMix: 0.08,
  reverbHighDamp: 0.80,
  
  // Volume / dynamics
  minGain: 0.008,
  maxGain: 0.09,
  masterGain: 0.28,
  voiceGainMax: 0.14,
  
  // Performance
  minTimeBetweenSounds: 0.012,
  
  // Stereo
  maxPan: 0.15,
  
  // Noise transient (impact "snap")
  noiseTransientEnabled: true,
  noiseTransientGain: 0.045,
  noiseTransientDecay: 0.008,
  noiseTransientFilterMin: 500,
  noiseTransientFilterMax: 1800,
  noiseTransientQ: 1.2,
  
  // Sparkle partial (glass-like micro-chimes; disabled by default)
  sparkleGain: 0.0,
  sparkleRatioMin: 2.3,
  sparkleRatioMax: 4.1,
  sparkleDecayMul: 0.65,
  
  // Micro-variation (organic feel)
  variancePitch: 0.06,
  varianceDecay: 0.20,
  varianceGain: 0.15,
  varianceFilter: 0.18,
  varianceNoise: 0.25,
  
  // Intensity-driven dynamics
  velocityNoiseScale: 1.8,
  velocityBrightnessScale: 1.4,
  velocityDecayScale: 0.65,
  intensityExponent: 1.5,
  
  // Tone safety (anti-harshness)
  toneSafetyMinHz: 130,
  toneSafetyMaxHz: 480,
  toneSafetyExponent: 2.2,
  toneSafetyHighGainAtten: 0.25,
  toneSafetyLowGainAtten: 0.06,
  toneSafetyHighBrightAtten: 0.45,
  
  // Energy threshold
  collisionMinImpact: 0.58,
  
  // High-shelf EQ (aggressive high rolloff)
  highShelfFreq: 2200,
  highShelfGain: -6.0,
};

let WHEEL_SFX_CONFIG = {
  // Continuous wheel loop (legacy). When disabled, `updateWheelSfx()` will stop any loops.
  continuousEnabled: false,
  tickGainMul: 1.0,
  swishGainMul: 1.0,

  tickBaseGain: 0.05,
  tickMinVelocity: 50,
  tickMaxVelocity: 1600,
  tickMinRate: 0.6,
  tickMaxRate: 9,
  swishBaseGain: 0.04,
  swishMinVelocity: 220,
  swishMaxVelocity: 2200,
  swishMinHz: 600,
  swishMaxHz: 2200,

  // Discrete click used by portfolio carousel when a project passes center
  centerGain: 0.08,
  centerFilterHz: 1600,

  snapGain: 0.12,
  openGain: 0.12,
  openFilterHz: 1800,
  closeGain: 0.10,
  closeFilterHz: 1600,
  snapDebounceMs: 300,
  stopDelayMs: 60,
};

export function getWheelSfxConfig() {
  return { ...WHEEL_SFX_CONFIG };
}

export function updateWheelSfxConfig(updates) {
  for (const [key, value] of Object.entries(updates)) {
    if (key in WHEEL_SFX_CONFIG) {
      WHEEL_SFX_CONFIG[key] = value;
    }
  }
}

// Mutable config (initialized after presets are defined)
let CONFIG = null;

// ════════════════════════════════════════════════════════════════════════════════
// PRESETS — Different sound characters for different aesthetics
// ════════════════════════════════════════════════════════════════════════════════
export const SOUND_PRESETS = {
  // Default: balanced, warm, natural
  organicImpact: {
    label: 'Organic Impact',
    description: 'Warm, natural thuds with intensity dynamics',
    ...BASE_CONFIG,
  },
  
  // Brighter, more resonant — like glass marbles on hard surface
  glassMarbles: {
    label: 'Glass Marbles',
    description: 'Clear, glassy impacts with more presence',
    ...BASE_CONFIG,
    pitchMinHz: 260,
    pitchMaxHz: 780,
    pitchCurve: 1.05,
    filterBaseFreq: 850,
    filterVelocityRange: 600,
    noiseTransientGain: 0.065,
    noiseTransientFilterMin: 650,
    noiseTransientFilterMax: 2200,
    noiseTransientQ: 1.6,
    decayTime: 0.055,
    intensityExponent: 1.3,
    highShelfGain: -4.5,
  },
  
  // ★ PREFERRED: Clear, close, soothing crystalline micro-chimes
  crystalPebbles: {
    label: 'Crystal Pebbles ★',
    description: 'Crisp, close, soothing micro-chimes (non-repetitive)',
    ...BASE_CONFIG,
    // Higher, lighter pitch mapping
    pitchMinHz: 420,
    pitchMaxHz: 1600,
    pitchCurve: 1.15,
    // Brighter timbre, still softened
    filterBaseFreq: 1300,
    filterVelocityRange: 1700,
    filterQ: 0.22,
    filterMaxHz: 6200,
    // Short + delicate
    decayTime: 0.040,
    intensityExponent: 1.65,
    collisionMinImpact: 0.70,
    minTimeBetweenSounds: 0.018,
    // Sparkle instead of "snap"
    noiseTransientGain: 0.020,
    noiseTransientDecay: 0.006,
    noiseTransientFilterMin: 1200,
    noiseTransientFilterMax: 7000,
    noiseTransientQ: 2.8,
    sparkleGain: 0.12,
    sparkleRatioMin: 2.6,
    sparkleRatioMax: 4.4,
    sparkleDecayMul: 0.55,
    // Keep it close (less distance)
    reverbWetMix: 0.04,
    reverbDecay: 0.10,
    highShelfGain: -4.0,
    masterGain: 0.24,
  },
  
  // ★ PREFERRED: Very soft, minimal transient — like wooden beads
  woodenBeads: {
    label: 'Wooden Beads ★',
    description: 'Ultra-soft, muted thuds (recommended)',
    ...BASE_CONFIG,
    filterBaseFreq: 420,
    filterVelocityRange: 200,
    noiseTransientGain: 0.025,
    noiseTransientFilterMin: 380,
    noiseTransientFilterMax: 1400,
    noiseTransientQ: 1.1,
    decayTime: 0.095,
    intensityExponent: 1.7,
    collisionMinImpact: 0.62,
    highShelfGain: -7.5,
    reverbWetMix: 0.12,
  },
  
  // Longer decay, more bounce — playful rubber balls
  rubberBalls: {
    label: 'Rubber Balls',
    description: 'Bouncy, playful with longer decay',
    ...BASE_CONFIG,
    pitchMinHz: 160,
    pitchMaxHz: 360,
    filterBaseFreq: 520,
    filterVelocityRange: 350,
    noiseTransientGain: 0.035,
    noiseTransientFilterMin: 450,
    noiseTransientFilterMax: 1600,
    noiseTransientQ: 1.2,
    decayTime: 0.120,
    intensityExponent: 1.4,
    reverbWetMix: 0.14,
    highShelfGain: -5.0,
  },
  
  // Sharper attack, brighter — crisp and percussive
  metallicClick: {
    label: 'Metallic Click',
    description: 'Crisp, percussive impacts',
    ...BASE_CONFIG,
    pitchMinHz: 220,
    pitchMaxHz: 620,
    pitchCurve: 1.1,
    filterBaseFreq: 720,
    filterVelocityRange: 550,
    noiseTransientGain: 0.080,
    noiseTransientFilterMin: 700,
    noiseTransientFilterMax: 2400,
    noiseTransientQ: 1.8,
    noiseTransientDecay: 0.006,
    decayTime: 0.045,
    intensityExponent: 1.2,
    highShelfGain: -3.5,
    collisionMinImpact: 0.50,
  },
};

// Default preset (crystalPebbles is tuned for crisp, soothing presence)
let currentPreset = 'crystalPebbles';

// Initialize CONFIG with the default preset
CONFIG = { ...SOUND_PRESETS[currentPreset] };
delete CONFIG.label;
delete CONFIG.description;

// ════════════════════════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════════════════════════
let audioContext = null;
let masterGain = null;
let reverbNode = null;
let dryGain = null;
let wetGain = null;
let limiter = null;
let saturator = null;
let highShelf = null;
let wheelBus = null;

let isEnabled = false;
let isUnlocked = false;

// Broadcast state changes so UI stays in sync
export const SOUND_STATE_EVENT = 'bravia-balls:sound-state';
function emitSoundStateChange() {
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent(SOUND_STATE_EVENT, { detail: getSoundState() }));
    }
  } catch (e) {}
}

// Voice pool for efficient sound playback (reusable nodes)
const VOICE_POOL_SIZE = 8;
let voicePool = [];
let lastGlobalSoundTime = 0;
const GLOBAL_MIN_INTERVAL = 0.005; // 5ms between ANY sounds (200/sec max)

let lastSoundTime = new Map(); // ball id → timestamp

// Reduced motion preference
let prefersReducedMotion = false;

// Shared noise buffer (created once, reused)
let sharedNoiseBuffer = null;

// Wheel SFX state
let wheelTickBuffer = null;
let wheelTickSource = null;
let wheelTickGain = null;
let wheelTickFilter = null;
let wheelSwishBuffer = null;
let wheelSwishSource = null;
let wheelSwishGain = null;
let wheelSwishFilter = null;
let wheelWhooshBuffer = null;
let wheelStopTimer = null;

let isSoundEngineInitialized = false;

// ════════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Initialize the sound engine (call once at startup)
 * Does NOT create AudioContext yet — that requires user interaction
 */
export function initSoundEngine() {
  if (isSoundEngineInitialized) return;
  isSoundEngineInitialized = true;

  if (typeof window !== 'undefined' && window.matchMedia) {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = motionQuery.matches;
    motionQuery.addEventListener('change', (e) => {
      prefersReducedMotion = e.matches;
    });
  }
}

/**
 * Apply runtime-config overrides for sound.
 *
 * Supported config shapes:
 * - { soundPreset: "crystalPebbles", soundConfig: { ...CONFIG_KEYS } }
 * - { soundPreset: "crystalPebbles", <CONFIG_KEYS>: <value>, ... }
 */
export function applySoundConfigFromRuntimeConfig(runtimeConfig) {
  const cfg = runtimeConfig && typeof runtimeConfig === 'object' ? runtimeConfig : null;
  if (!cfg) return;

  // Preset first (sets baseline)
  if (typeof cfg.soundPreset === 'string') {
    applySoundPreset(cfg.soundPreset);
  }

  // Explicit object overrides
  if (cfg.soundConfig && typeof cfg.soundConfig === 'object') {
    updateSoundConfig(cfg.soundConfig);
    return;
  }

  // Flat-key overrides (only if key exists in CONFIG)
  const updates = {};
  let hasAny = false;
  for (const [k, v] of Object.entries(cfg)) {
    if (k in CONFIG) {
      updates[k] = v;
      hasAny = true;
    }
  }
  if (hasAny) updateSoundConfig(updates);
}

/**
 * Unlock audio (must be called from user gesture like click)
 * Creates AudioContext and builds the audio graph
 */
export async function unlockAudio() {
  if (isUnlocked) return true;
  
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      console.warn('Web Audio API not supported');
      return false;
    }
    
    audioContext = new AudioCtx({ 
      latencyHint: 'interactive',
      sampleRate: 44100
    });
    
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    buildAudioGraph();
    
    isUnlocked = true;
    isEnabled = true;
    emitSoundStateChange();
    
    const latencyMs = (audioContext.baseLatency || 0) * 1000;
    console.log(`✓ Audio unlocked (${latencyMs.toFixed(1)}ms base latency)`);
    return true;
    
  } catch (error) {
    console.error('Failed to unlock audio:', error);
    return false;
  }
}

/**
 * Build the audio processing graph:
 * Voice Pool → [Dry + Reverb] → Soft Clip → High Shelf → Limiter → Master → Output
 */
function buildAudioGraph() {
  // Master gain
  masterGain = audioContext.createGain();
  masterGain.gain.value = CONFIG.masterGain;
  
  // Limiter (prevent clipping)
  limiter = audioContext.createDynamicsCompressor();
  limiter.threshold.value = -6;
  limiter.knee.value = 10;
  limiter.ratio.value = 16;
  limiter.attack.value = 0.0005;
  limiter.release.value = 0.08;

  // High-shelf EQ (tame highs)
  highShelf = audioContext.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = CONFIG.highShelfFreq;
  highShelf.gain.value = CONFIG.highShelfGain;
  highShelf.Q.value = 0.7;

  // Soft clipper (gentle saturation)
  saturator = audioContext.createWaveShaper();
  saturator.curve = makeSoftClipCurve(0.55);
  saturator.oversample = '2x';
  
  // Dry/wet routing for reverb
  dryGain = audioContext.createGain();
  dryGain.gain.value = 1 - CONFIG.reverbWetMix;
  
  wetGain = audioContext.createGain();
  wetGain.gain.value = CONFIG.reverbWetMix;
  
  // Reverb (algorithmic delay network)
  reverbNode = createReverbEffect();
  const reverbOut = reverbNode._output;
  
  // Connect graph
  dryGain.connect(saturator);
  wetGain.connect(reverbNode);
  reverbOut.connect(saturator);
  saturator.connect(highShelf);
  highShelf.connect(limiter);
  limiter.connect(masterGain);
  masterGain.connect(audioContext.destination);

  ensureWheelBus();
  
  // Initialize voice pool
  initVoicePool();
}

/** Create a gentle soft-clipping curve (tanh-style) */
function makeSoftClipCurve(amount = 0.55) {
  const n = 1024;
  const curve = new Float32Array(n);
  const drive = 1 + amount * 8;
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1;
    curve[i] = Math.tanh(drive * x) / Math.tanh(drive);
  }
  return curve;
}

/** Create algorithmic reverb using feedback delay network */
function createReverbEffect() {
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  
  const delays = [0.029, 0.037, 0.053, 0.067];
  const feedbackGain = 0.4;
  
  const delayNodes = delays.map(time => {
    const delay = audioContext.createDelay(0.1);
    delay.delayTime.value = time * CONFIG.reverbDecay;
    return delay;
  });
  
  const feedbacks = delayNodes.map(() => {
    const gain = audioContext.createGain();
    gain.gain.value = feedbackGain;
    return gain;
  });
  
  const dampingFilter = audioContext.createBiquadFilter();
  dampingFilter.type = 'lowpass';
  dampingFilter.frequency.value = 2000 * (1 - CONFIG.reverbHighDamp);
  dampingFilter.Q.value = 0.5;
  
  delayNodes.forEach((delay, i) => {
    input.connect(delay);
    delay.connect(feedbacks[i]);
    feedbacks[i].connect(dampingFilter);
    feedbacks[i].connect(delayNodes[(i + 1) % delayNodes.length]);
  });
  
  dampingFilter.connect(output);
  input.connect(output);
  
  input._output = output;
  return input;
}

/** Initialize the voice pool with pre-allocated audio nodes */
function initVoicePool() {
  voicePool = [];
  
  for (let i = 0; i < VOICE_POOL_SIZE; i++) {
    const voice = {
      id: i,
      inUse: false,
      startTime: 0,
      // Persistent nodes (reused)
      filter: audioContext.createBiquadFilter(),
      envelope: audioContext.createGain(),
      panner: audioContext.createStereoPanner(),
      reverbSend: audioContext.createGain(),
      noiseFilter: audioContext.createBiquadFilter(),
      noiseEnvelope: audioContext.createGain(),
      // Per-use nodes
      osc: null,
      harmonicOsc: null,
      sparkleOsc: null,
      noiseSource: null,
    };
    
    voice.filter.type = 'lowpass';
    voice.noiseFilter.type = 'bandpass';
    voice.noiseFilter.Q.value = 1.2;
    
    // Connect persistent chain
    voice.filter.connect(voice.envelope);
    voice.envelope.connect(voice.panner);
    voice.panner.connect(dryGain);
    voice.panner.connect(voice.reverbSend);
    voice.reverbSend.connect(wetGain);
    
    voice.noiseFilter.connect(voice.noiseEnvelope);
    voice.noiseEnvelope.connect(voice.panner);
    
    voicePool.push(voice);
  }
}

function ensureWheelBus() {
  if (!audioContext) return;
  if (!wheelBus) {
    wheelBus = audioContext.createGain();
    wheelBus.gain.value = 1;
  } else {
    try { wheelBus.disconnect(); } catch (e) {}
  }
  if (limiter) {
    wheelBus.connect(limiter);
  } else {
    wheelBus.connect(audioContext.destination);
  }
}

function createWheelTickBuffer() {
  if (wheelTickBuffer || !audioContext) return;
  const sampleRate = audioContext.sampleRate;
  const duration = 0.045;
  const length = Math.floor(sampleRate * duration);
  wheelTickBuffer = audioContext.createBuffer(1, length, sampleRate);
  const data = wheelTickBuffer.getChannelData(0);
  const noiseEnd = Math.floor(sampleRate * 0.003);
  const sineEnd = Math.floor(sampleRate * 0.010);
  for (let i = 0; i < noiseEnd; i++) {
    const decay = Math.exp(-i / noiseEnd * 6);
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  const freq = 880;
  for (let i = noiseEnd; i < sineEnd; i++) {
    const t = i / sampleRate;
    const env = 0.65 * (1 - (i - noiseEnd) / (sineEnd - noiseEnd));
    data[i] = Math.sin(2 * Math.PI * freq * t) * env;
  }
}

function createWheelSwishBuffer() {
  if (wheelSwishBuffer || !audioContext) return;
  const sampleRate = audioContext.sampleRate;
  const duration = 0.28;
  const length = Math.floor(sampleRate * duration);
  wheelSwishBuffer = audioContext.createBuffer(1, length, sampleRate);
  const data = wheelSwishBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const t = i / length;
    const env = t < 0.08 ? t / 0.08 : (t > 0.92 ? (1 - t) / 0.08 : 1);
    data[i] = (Math.random() * 2 - 1) * env * 0.6;
  }
}

function createWheelWhooshBuffer() {
  if (wheelWhooshBuffer || !audioContext) return;
  const sampleRate = audioContext.sampleRate;
  const duration = 0.12;
  const length = Math.floor(sampleRate * duration);
  wheelWhooshBuffer = audioContext.createBuffer(1, length, sampleRate);
  const data = wheelWhooshBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const decay = Math.exp(-4.5 * i / length);
    data[i] = (Math.random() * 2 - 1) * decay;
  }
}

function startWheelLoops() {
  if (!audioContext) return;
  if (wheelTickSource && wheelSwishSource) return;
  ensureWheelBus();
  createWheelTickBuffer();
  wheelTickSource = audioContext.createBufferSource();
  wheelTickSource.buffer = wheelTickBuffer;
  wheelTickSource.loop = true;
  wheelTickGain = audioContext.createGain();
  wheelTickGain.gain.value = 0;
  wheelTickFilter = audioContext.createBiquadFilter();
  wheelTickFilter.type = 'highpass';
  wheelTickFilter.frequency.value = 700;
  wheelTickSource.connect(wheelTickFilter).connect(wheelTickGain).connect(wheelBus);
  wheelTickSource.start();

  createWheelSwishBuffer();
  wheelSwishSource = audioContext.createBufferSource();
  wheelSwishSource.buffer = wheelSwishBuffer;
  wheelSwishSource.loop = true;
  wheelSwishGain = audioContext.createGain();
  wheelSwishGain.gain.value = 0;
  wheelSwishFilter = audioContext.createBiquadFilter();
  wheelSwishFilter.type = 'bandpass';
  wheelSwishFilter.frequency.value = WHEEL_SFX_CONFIG.swishMinHz;
  wheelSwishFilter.Q.value = 0.8;
  wheelSwishSource.connect(wheelSwishFilter).connect(wheelSwishGain).connect(wheelBus);
  wheelSwishSource.start();
}

function stopWheelLoops() {
  if (wheelStopTimer) {
    clearTimeout(wheelStopTimer);
    wheelStopTimer = null;
  }
  if (wheelTickSource) {
    try { wheelTickSource.stop(); } catch (e) {}
    wheelTickSource.disconnect();
    wheelTickGain.disconnect();
    wheelTickFilter.disconnect();
    wheelTickSource = wheelTickGain = wheelTickFilter = null;
  }
  if (wheelSwishSource) {
    try { wheelSwishSource.stop(); } catch (e) {}
    wheelSwishSource.disconnect();
    wheelSwishGain.disconnect();
    wheelSwishFilter.disconnect();
    wheelSwishSource = wheelSwishGain = wheelSwishFilter = null;
  }
}

function playWheelClick(gain, filterHz) {
  if (!isEnabled || !isUnlocked || !audioContext || prefersReducedMotion) return;
  ensureWheelBus();
  createWheelTickBuffer();
  const src = audioContext.createBufferSource();
  src.buffer = wheelTickBuffer;
  const g = audioContext.createGain();
  g.gain.value = gain;
  const lp = audioContext.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = filterHz;
  src.connect(lp).connect(g).connect(wheelBus);
  src.start();
}

function playWheelWhoosh(gain, filterHz) {
  if (!isEnabled || !isUnlocked || !audioContext || prefersReducedMotion) return;
  ensureWheelBus();
  createWheelWhooshBuffer();
  const src = audioContext.createBufferSource();
  src.buffer = wheelWhooshBuffer;
  const g = audioContext.createGain();
  g.gain.value = gain;
  const bp = audioContext.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = filterHz;
  bp.Q.value = 0.9;
  src.connect(bp).connect(g).connect(wheelBus);
  src.start();
}

export function updateWheelSfx(velocityPxPerSec = 0) {
  if (!isEnabled || !isUnlocked || !audioContext || prefersReducedMotion) {
    stopWheelLoops();
    return;
  }
  if (!WHEEL_SFX_CONFIG.continuousEnabled) {
    stopWheelLoops();
    return;
  }
  const speed = Math.abs(velocityPxPerSec);
  if (!Number.isFinite(speed)) return;

  if (speed < WHEEL_SFX_CONFIG.tickMinVelocity) {
    if (wheelTickGain) {
      const now = audioContext.currentTime;
      wheelTickGain.gain.setTargetAtTime(0, now, 0.05);
    }
    if (wheelSwishGain) {
      const now = audioContext.currentTime;
      wheelSwishGain.gain.setTargetAtTime(0, now, 0.08);
    }
    if (!wheelStopTimer) {
      wheelStopTimer = setTimeout(stopWheelLoops, WHEEL_SFX_CONFIG.stopDelayMs);
    }
    return;
  }

  if (wheelStopTimer) {
    clearTimeout(wheelStopTimer);
    wheelStopTimer = null;
  }

  startWheelLoops();
  const now = audioContext.currentTime;
  const tickNorm = clamp(
    (speed - WHEEL_SFX_CONFIG.tickMinVelocity) /
      (WHEEL_SFX_CONFIG.tickMaxVelocity - WHEEL_SFX_CONFIG.tickMinVelocity),
    0,
    1
  );
  const tickRate = WHEEL_SFX_CONFIG.tickMinRate +
    ((WHEEL_SFX_CONFIG.tickMaxRate - WHEEL_SFX_CONFIG.tickMinRate) * tickNorm);
  if (wheelTickSource) {
    wheelTickSource.playbackRate.setTargetAtTime(tickRate, now, 0.04);
  }
  if (wheelTickGain) {
    const mul = Number.isFinite(WHEEL_SFX_CONFIG.tickGainMul) ? WHEEL_SFX_CONFIG.tickGainMul : 1.0;
    const gain = (WHEEL_SFX_CONFIG.tickBaseGain * (0.35 + tickNorm * 0.75)) * Math.max(0, mul);
    wheelTickGain.gain.setTargetAtTime(gain, now, 0.05);
  }

  const swishNorm = clamp(
    (speed - WHEEL_SFX_CONFIG.swishMinVelocity) /
      (WHEEL_SFX_CONFIG.swishMaxVelocity - WHEEL_SFX_CONFIG.swishMinVelocity),
    0,
    1
  );
  if (wheelSwishGain) {
    const mul = Number.isFinite(WHEEL_SFX_CONFIG.swishGainMul) ? WHEEL_SFX_CONFIG.swishGainMul : 1.0;
    const gain = (WHEEL_SFX_CONFIG.swishBaseGain * Math.pow(swishNorm, 1.4)) * Math.max(0, mul);
    wheelSwishGain.gain.setTargetAtTime(gain, now, 0.08);
  }
  if (wheelSwishFilter) {
    const freq = WHEEL_SFX_CONFIG.swishMinHz +
      ((WHEEL_SFX_CONFIG.swishMaxHz - WHEEL_SFX_CONFIG.swishMinHz) * swishNorm);
    wheelSwishFilter.frequency.setTargetAtTime(freq, now, 0.08);
  }
}

export function playWheelSnap() {
  playWheelClick(WHEEL_SFX_CONFIG.snapGain, 1600);
}

export function playWheelCenterClick() {
  playWheelClick(WHEEL_SFX_CONFIG.centerGain, WHEEL_SFX_CONFIG.centerFilterHz || 1600);
}

export function playWheelOpen() {
  playWheelClick(WHEEL_SFX_CONFIG.openGain, WHEEL_SFX_CONFIG.openFilterHz || 1800);
}

export function playWheelClose() {
  playWheelClick(WHEEL_SFX_CONFIG.closeGain, WHEEL_SFX_CONFIG.closeFilterHz || 1600);
}

/** Create a short noise burst for transient "snap" */
function createTransientNoise() {
  if (!sharedNoiseBuffer) {
    const bufferSize = audioContext.sampleRate * 2;
    sharedNoiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = sharedNoiseBuffer.getChannelData(0);
    
    // Pink-ish noise (more natural than pure white)
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.0990460;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.25;
    }
  }
  
  const noise = audioContext.createBufferSource();
  noise.buffer = sharedNoiseBuffer;
  noise.loopStart = Math.random() * 1.5;
  noise.loopEnd = noise.loopStart + 0.1;
  noise.loop = false;
  
  return noise;
}

// ════════════════════════════════════════════════════════════════════════════════
// SOUND PLAYBACK
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Play a collision sound using voice pool with stealing
 * @param {number} ballRadius - Ball radius (maps to pitch)
 * @param {number} intensity - Collision intensity 0-1 (maps to volume + brightness)
 * @param {number} xPosition - Ball X position 0-1 (maps to stereo pan)
 * @param {string|number} ballId - Unique ball identifier for debouncing
 */
export function playCollisionSound(ballRadius, intensity, xPosition = 0.5, ballId = null) {
  if (!isEnabled || !isUnlocked || !audioContext || prefersReducedMotion) return;
  
  // Energy threshold: soft touches are silent
  if (intensity < CONFIG.collisionMinImpact) return;
  
  const now = audioContext.currentTime;
  
  // Global rate limiter
  if (now - lastGlobalSoundTime < GLOBAL_MIN_INTERVAL) return;
  
  // Per-ball debounce
  if (ballId !== null) {
    const lastTime = lastSoundTime.get(ballId) || 0;
    if (now - lastTime < CONFIG.minTimeBetweenSounds) return;
    lastSoundTime.set(ballId, now);
  }
  
  lastGlobalSoundTime = now;
  
  // Periodic cleanup of old entries
  if (lastSoundTime.size > 200) {
    const threshold = now - 0.5;
    for (const [id, time] of lastSoundTime) {
      if (time < threshold) lastSoundTime.delete(id);
    }
  }
  
  const voice = acquireVoice(now);
  if (!voice) return;
  
  const frequency = radiusToFrequency(ballRadius);
  const clampedIntensity = Math.max(0, Math.min(1, intensity));
  
  playVoice(voice, frequency, clampedIntensity, xPosition, now);
}

/**
 * Play a short test hit (for UI auditioning).
 * Useful for the synth-style control surface: lets you "fumble" settings without
 * needing a physical collision to happen.
 */
export function playTestSound({ intensity = 0.82, radius = 18, xPosition = 0.72 } = {}) {
  playCollisionSound(radius, intensity, xPosition, null);
}

/** Acquire a voice from the pool (with voice stealing) */
function acquireVoice(now) {
  // Look for free voice
  for (let i = 0; i < VOICE_POOL_SIZE; i++) {
    if (!voicePool[i].inUse) return voicePool[i];
  }
  
  // Steal oldest
  let oldestVoice = voicePool[0];
  for (let i = 1; i < VOICE_POOL_SIZE; i++) {
    if (voicePool[i].startTime < oldestVoice.startTime) {
      oldestVoice = voicePool[i];
    }
  }
  
  releaseVoice(oldestVoice);
  return oldestVoice;
}

/** Release a voice (stop oscillators, mark as free) */
function releaseVoice(voice) {
  if (voice.osc) {
    try { voice.osc.stop(); voice.osc.disconnect(); } catch (e) {}
    voice.osc = null;
  }
  if (voice.harmonicOsc) {
    try { voice.harmonicOsc.stop(); voice.harmonicOsc.disconnect(); } catch (e) {}
    voice.harmonicOsc = null;
  }
  if (voice.sparkleOsc) {
    try { voice.sparkleOsc.stop(); voice.sparkleOsc.disconnect(); } catch (e) {}
    voice.sparkleOsc = null;
  }
  if (voice.noiseSource) {
    try { voice.noiseSource.stop(); voice.noiseSource.disconnect(); } catch (e) {}
    voice.noiseSource = null;
  }
  voice.inUse = false;
}

/** Play a sound using a pooled voice */
function playVoice(voice, frequency, intensity, xPosition, now) {
  voice.inUse = true;
  voice.startTime = now;
  
  // Non-linear intensity curve (soft hits MUCH quieter)
  const energy = Math.max(0, Math.min(1, intensity));
  const gainShape = Math.pow(energy, CONFIG.intensityExponent);
  
  const variedFreq = vary(frequency, CONFIG.variancePitch);
  
  // Decay (harder = snappier)
  const decayVar = vary(CONFIG.decayTime, CONFIG.varianceDecay);
  const finalDecay = decayVar * (1 - gainShape * (1 - CONFIG.velocityDecayScale));
  const duration = finalDecay + 0.02;

  // Gain (non-linear intensity mapping)
  let gain = CONFIG.minGain + (CONFIG.maxGain - CONFIG.minGain) * gainShape;
  gain *= vary(1.0, CONFIG.varianceGain);

  // Filter (brightness scales with intensity)
  const brightnessScale = 1 + (CONFIG.velocityBrightnessScale - 1) * gainShape;
  let filterFreq = CONFIG.filterBaseFreq + CONFIG.filterVelocityRange * Math.pow(gainShape, 1.3);
  filterFreq *= vary(1.0, CONFIG.varianceFilter) * brightnessScale;
  
  const panValue = (xPosition - 0.5) * 2 * CONFIG.maxPan;
  const reverbAmount = 0.12 + (1 - gainShape) * 0.5;
  
  // Tone safety
  ({ gain, filterFreq } = applyToneSafety(variedFreq, gain, filterFreq));
  
  voice.filter.frequency.value = filterFreq;
  voice.filter.Q.value = CONFIG.filterQ;
  voice.panner.pan.value = panValue;
  voice.reverbSend.gain.value = reverbAmount;
  voice.noiseFilter.Q.value = clamp(CONFIG.noiseTransientQ || 1.2, 0.5, 8.0);
  
  // Main envelope
  voice.envelope.gain.cancelScheduledValues(now);
  voice.envelope.gain.setValueAtTime(gain, now);
  voice.envelope.gain.exponentialRampToValueAtTime(0.001, now + finalDecay);
  
  const osc = audioContext.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = variedFreq;
  
  voice.osc = osc;
  osc.connect(voice.filter);

  // Harmonic warmth (subtle 2nd partial)
  if ((CONFIG.harmonicGain || 0) > 0.001) {
    const harmonicOsc = audioContext.createOscillator();
    harmonicOsc.type = 'sine';
    harmonicOsc.frequency.value = variedFreq * 2;
    
    const harmonicEnv = audioContext.createGain();
    harmonicEnv.gain.cancelScheduledValues(now);
    harmonicEnv.gain.setValueAtTime(gain * CONFIG.harmonicGain, now);
    harmonicEnv.gain.exponentialRampToValueAtTime(0.001, now + finalDecay);
    
    voice.harmonicOsc = harmonicOsc;
    harmonicOsc.connect(harmonicEnv);
    harmonicEnv.connect(voice.filter);
    harmonicOsc.onended = () => {
      try { harmonicEnv.disconnect(); } catch (e) {}
    };
    harmonicOsc.start(now);
    harmonicOsc.stop(now + duration);
  } else {
    voice.harmonicOsc = null;
  }

  // Sparkle partial (glass-like micro-chime) — short, delicate, non-repetitive
  if ((CONFIG.sparkleGain || 0) > 0.001) {
    const sparkleOsc = audioContext.createOscillator();
    sparkleOsc.type = 'sine';
    
    const rMin = CONFIG.sparkleRatioMin || 2.3;
    const rMax = CONFIG.sparkleRatioMax || 4.1;
    const ratio = clamp(rMin + Math.random() * (rMax - rMin), 1.2, 10.0);
    sparkleOsc.frequency.value = variedFreq * vary(ratio, 0.02);
    
    const sparkleEnv = audioContext.createGain();
    const sparkleDecay = Math.max(
      0.012,
      finalDecay * clamp(CONFIG.sparkleDecayMul || 0.65, 0.25, 0.95)
    );
    sparkleEnv.gain.cancelScheduledValues(now);
    sparkleEnv.gain.setValueAtTime(gain * CONFIG.sparkleGain, now);
    sparkleEnv.gain.exponentialRampToValueAtTime(0.001, now + sparkleDecay);
    
    voice.sparkleOsc = sparkleOsc;
    sparkleOsc.connect(sparkleEnv);
    sparkleEnv.connect(voice.filter);
    sparkleOsc.onended = () => {
      try { sparkleEnv.disconnect(); } catch (e) {}
    };
    sparkleOsc.start(now);
    sparkleOsc.stop(now + duration);
  } else {
    voice.sparkleOsc = null;
  }

  // Noise transient (only on harder hits)
  if (CONFIG.noiseTransientEnabled && gainShape > 0.25) {
    const noiseSource = createTransientNoise();
    voice.noiseSource = noiseSource;
    
    const noiseIntensity = Math.pow(gainShape, 1.4);
    const noiseFilterBase = CONFIG.noiseTransientFilterMin + 
      (CONFIG.noiseTransientFilterMax - CONFIG.noiseTransientFilterMin) * noiseIntensity;
    voice.noiseFilter.frequency.value = vary(noiseFilterBase, CONFIG.varianceNoise);
    
    const noiseGain = CONFIG.noiseTransientGain * CONFIG.velocityNoiseScale * noiseIntensity * gain;
    const noiseDecay = vary(CONFIG.noiseTransientDecay, CONFIG.varianceNoise);
    
    voice.noiseEnvelope.gain.cancelScheduledValues(now);
    voice.noiseEnvelope.gain.setValueAtTime(noiseGain, now);
    voice.noiseEnvelope.gain.exponentialRampToValueAtTime(0.001, now + noiseDecay);
    
    noiseSource.connect(voice.noiseFilter);
    noiseSource.start(now);
    noiseSource.stop(now + noiseDecay + 0.01);
  } else {
    voice.noiseSource = null;
  }
  
  osc.start(now);
  osc.stop(now + duration);
  osc.onended = () => releaseVoice(voice);
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v;
}

/** Apply tone safety (prevent brittle/ugly extreme tones) */
function applyToneSafety(frequency, gain, filterFreq) {
  const t = clamp(
    (frequency - CONFIG.toneSafetyMinHz) / (CONFIG.toneSafetyMaxHz - CONFIG.toneSafetyMinHz),
    0, 1
  );

  const exp = CONFIG.toneSafetyExponent;
  const high = Math.pow(t, exp);
  const low = Math.pow(1 - t, exp);

  const gainMul = clamp(
    1 - (CONFIG.toneSafetyHighGainAtten * high) - (CONFIG.toneSafetyLowGainAtten * low),
    0.6, 1
  );
  let safeGain = Math.min(gain * gainMul, CONFIG.voiceGainMax);

  const brightMul = clamp(1 - CONFIG.toneSafetyHighBrightAtten * high, 0.55, 1);
  let safeFilter = clamp(filterFreq * brightMul, CONFIG.filterMinHz, CONFIG.filterMaxHz);

  return { gain: safeGain, filterFreq: safeFilter };
}

/** Map ball radius to organic frequency (non-melodic) */
function radiusToFrequency(radius) {
  const minR = 8, maxR = 55;
  const normalized = clamp((radius - minR) / (maxR - minR), 0, 1);
  const inv = 1 - normalized;
  
  const minHz = clamp(CONFIG.pitchMinHz || 145, 40, 6000);
  const maxHz = clamp(CONFIG.pitchMaxHz || 280, minHz + 10, 12000);
  const curve = clamp(CONFIG.pitchCurve || 1.0, 0.5, 2.5);
  const shaped = Math.pow(inv, curve);
  
  const baseFreq = minHz + shaped * (maxHz - minHz);
  return baseFreq * vary(1, (CONFIG.variancePitch || 0.06) * 1.5);
}

// ════════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════════════════════

/** Toggle sound on/off */
export function toggleSound() {
  if (!isUnlocked) return false;
  isEnabled = !isEnabled;
  if (!isEnabled) stopWheelLoops();
  emitSoundStateChange();
  return isEnabled;
}

/** Set sound enabled state */
export function setSoundEnabled(enabled) {
  if (!isUnlocked) return;
  isEnabled = !!enabled;
  if (!isEnabled) stopWheelLoops();
  emitSoundStateChange();
}

/** Get current sound state */
export function getSoundState() {
  return {
    isUnlocked,
    isEnabled,
    activeSounds: voicePool.filter(v => v.inUse).length,
    poolSize: VOICE_POOL_SIZE,
  };
}

/** Set master volume (0-1) */
export function setMasterVolume(volume) {
  if (masterGain) {
    masterGain.gain.value = clamp(volume, 0, 1) * CONFIG.masterGain;
  }
}

/** Clean up resources */
export function disposeSoundEngine() {
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  isUnlocked = false;
  isEnabled = false;
  lastSoundTime.clear();
  stopWheelLoops();
  wheelBus = null;
  emitSoundStateChange();
}

/** Get current config (for debugging) */
export function getSoundConfig() {
  return { ...CONFIG };
}

/** Update specific config parameters at runtime */
export function updateSoundConfig(updates) {
  for (const [key, value] of Object.entries(updates)) {
    if (key in CONFIG) {
      CONFIG[key] = value;
    }
  }
  
  // Update audio nodes if needed
  if (wetGain && dryGain && 'reverbWetMix' in updates) {
    wetGain.gain.value = CONFIG.reverbWetMix;
    dryGain.gain.value = 1 - CONFIG.reverbWetMix;
  }
  if (highShelf && ('highShelfFreq' in updates || 'highShelfGain' in updates)) {
    highShelf.frequency.value = CONFIG.highShelfFreq;
    highShelf.gain.value = CONFIG.highShelfGain;
  }
  if (masterGain && 'masterGain' in updates) {
    masterGain.gain.value = CONFIG.masterGain;
  }
}

/** Apply a sound preset */
export function applySoundPreset(presetName) {
  const preset = SOUND_PRESETS[presetName];
  if (!preset) return false;
  currentPreset = presetName;
  const { label, description, ...values } = preset;
  updateSoundConfig(values);
  return true;
}

/** Get current preset name */
export function getCurrentPreset() {
  return currentPreset;
}
