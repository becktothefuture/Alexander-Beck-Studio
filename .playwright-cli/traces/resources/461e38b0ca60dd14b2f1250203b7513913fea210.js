// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    SOUND ENGINE — "SOFT ORGANIC IMPACTS"                     ║
// ║    Realistic, non-melodic collision sounds with intensity-driven dynamics    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getState } from "/src/legacy/modules/core/state.js";

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
  // Synthesis (longer decay for chime-like sustain)
  attackTime: 0.003,
  decayTime: 0.12,
  harmonicGain: 0.02,
  
  // Filter (timbre)
  filterBaseFreq: 580,
  filterVelocityRange: 400,
  filterQ: 0.18,
  filterMinHz: 350,
  filterMaxHz: 2800,
  
  // Pitch mapping (radius → frequency) - wider range for melodic chimes
  pitchMinHz: 220,
  pitchMaxHz: 880,
  pitchCurve: 1.2,
  
  // Reverb (ethereal shimmer)
  reverbDecay: 0.25,
  reverbWetMix: 0.18,
  reverbHighDamp: 0.55,
  
  // Volume / dynamics
  minGain: 0.001,
  maxGain: 0.0125,
  masterGain: 0.42,
  voiceGainMax: 0.02,
  
  // Performance
  minTimeBetweenSounds: 0.012,
  
  // Stereo
  maxPan: 0.15,
  
  // Noise transient (softened for chime character)
  noiseTransientEnabled: true,
  noiseTransientGain: 0.018,
  noiseTransientDecay: 0.004,
  noiseTransientFilterMin: 800,
  noiseTransientFilterMax: 2400,
  noiseTransientQ: 0.8,
  
  // Sparkle partial (glass-like micro-chimes for aethereal quality)
  sparkleGain: 0.035,
  sparkleRatioMin: 2.0,
  sparkleRatioMax: 5.0,
  sparkleDecayMul: 0.85,
  
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

  tickBaseGain: 0.028,
  tickMinVelocity: 50,
  tickMaxVelocity: 1600,
  tickMinRate: 0.6,
  tickMaxRate: 9,
  swishBaseGain: 0.016,
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
    masterGain: 0.42,
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
const contactMotifVoices = new Set();
const CONTACT_RIPPLE_MOTIF_VARIATIONS = Object.freeze([
  Object.freeze({ id: 'lift-tight', ringDelayScale: 0.98, panSpread: 0.14, pressureGain: 0.72, brightness: 1.30 }),
  Object.freeze({ id: 'lift-wide-left', ringDelayScale: 1.00, panSpread: 0.22, pressureGain: 0.70, brightness: 1.24 }),
  Object.freeze({ id: 'lift-wide-right', ringDelayScale: 1.02, panSpread: 0.26, pressureGain: 0.68, brightness: 1.34 }),
  Object.freeze({ id: 'lift-long', ringDelayScale: 1.04, panSpread: 0.18, pressureGain: 0.74, brightness: 1.22 }),
]);
const CONTACT_RIPPLE_MOTIF_GAIN = 3.25;
let contactMotifVariationIndex = 0;

// Broadcast state changes so UI stays in sync
export const SOUND_STATE_EVENT = 'simulations:sound-state';
function emitSoundStateChange() {
  try {
    if (typeof window !== 'undefined' && window.dispatchEvent) {
      window.dispatchEvent(new CustomEvent(SOUND_STATE_EVENT, { detail: getSoundState() }));
    }
  } catch (e) {}
}

function recordSoundDebugEvent(type, id, detail = {}) {
  if (typeof window === 'undefined') return;
  const key = String(id || type);
  const store = window.__ABS_SIMULATION_AUDIO__ || {
    total: 0,
    byType: {},
    byId: {},
    events: [],
  };
  store.total += 1;
  store.byType[type] = (store.byType[type] || 0) + 1;
  store.byId[key] = (store.byId[key] || 0) + 1;
  store.lastEvent = {
    type,
    id: key,
    at: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    ...detail,
  };
  if (store.events.length < 80) {
    store.events.push(store.lastEvent);
  } else {
    store.events[store.total % store.events.length] = store.lastEvent;
  }
  window.__ABS_SIMULATION_AUDIO__ = store;
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
  
  // Limiter (aggressive clip prevention)
  limiter = audioContext.createDynamicsCompressor();
  limiter.threshold.value = -12;
  limiter.knee.value = 3;
  limiter.ratio.value = 20;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.05;

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
  const duration = 0.018;
  const length = Math.floor(sampleRate * duration);
  wheelTickBuffer = audioContext.createBuffer(1, length, sampleRate);
  const data = wheelTickBuffer.getChannelData(0);
  const noiseEnd = Math.max(1, Math.floor(sampleRate * 0.0018));
  const sineEnd = Math.max(noiseEnd + 1, Math.floor(sampleRate * 0.0065));
  for (let i = 0; i < noiseEnd; i++) {
    const decay = Math.exp(-i / noiseEnd * 7.5);
    data[i] = (Math.random() * 2 - 1) * decay;
  }
  const freq = 1480;
  for (let i = noiseEnd; i < sineEnd; i++) {
    const t = i / sampleRate;
    const env = 0.42 * (1 - (i - noiseEnd) / (sineEnd - noiseEnd));
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
  const hp = audioContext.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 650;
  const lp = audioContext.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = filterHz;
  src.connect(hp).connect(lp).connect(g).connect(wheelBus);
  src.start();
}

export function playDetentClick({ gain = 0.05, filterHz = 3200 } = {}) {
  recordSoundDebugEvent('detent-playback', 'sound-engine:detent', { gain, filterHz });
  playWheelClick(gain, filterHz);
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

export function playHoverSound() {
  if (!isEnabled || !isUnlocked || !audioContext || prefersReducedMotion) return;
  recordSoundDebugEvent('hover-playback', 'sound-engine:hover', {
    gain: 0.034,
    filterHz: 3000,
    character: 'quiet-wheel-detent',
  });
  playWheelClick(0.034, 3000);
}

export function playButtonPressSound() {
  if (!isEnabled || !isUnlocked || !audioContext || prefersReducedMotion) return;
  recordSoundDebugEvent('button-press-playback', 'sound-engine:button-press', { gain: 0.099, filterHz: 2200 });
  playWheelClick(0.099, 2200);
}

export function playSoundEnabledMotif() {
  if (!isEnabled || !isUnlocked || !audioContext || prefersReducedMotion) return;
  ensureWheelBus();

  const now = audioContext.currentTime;
  const notes = [
    { frequency: 523.25, offset: 0.000, gain: 0.028 },
    { frequency: 659.25, offset: 0.075, gain: 0.024 },
    { frequency: 783.99, offset: 0.150, gain: 0.021 },
  ];

  recordSoundDebugEvent('sound-enabled-motif', 'sound-engine:sound-enabled-motif', {
    noteCount: notes.length,
    frequencies: notes.map((note) => note.frequency),
  });

  for (const note of notes) {
    const start = now + note.offset;
    const duration = 0.155;
    const stop = start + duration + 0.03;
    const osc = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(note.frequency, start);
    osc.detune.setValueAtTime((Math.random() - 0.5) * 8, start);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2800, start);
    filter.Q.setValueAtTime(0.45, start);

    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(note.gain, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);

    osc.connect(filter).connect(gain).connect(wheelBus);
    osc.onended = () => {
      try { osc.disconnect(); } catch (e) {}
      try { filter.disconnect(); } catch (e) {}
      try { gain.disconnect(); } catch (e) {}
    };
    osc.start(start);
    osc.stop(stop);
  }
}

function stopContactRippleMotif() {
  for (const voice of contactMotifVoices) {
    for (const oscillator of voice.oscillators) {
      try { oscillator.stop(); } catch (e) {}
    }
    for (const node of voice.nodes) {
      try { node.disconnect(); } catch (e) {}
    }
  }
  contactMotifVoices.clear();
}

function registerContactMotifVoice({ sources, nodes, primary = sources[0] }) {
  const voice = { oscillators: sources, nodes };
  contactMotifVoices.add(voice);
  if (primary) {
    primary.onended = () => {
      if (!contactMotifVoices.delete(voice)) return;
      for (const node of voice.nodes) {
        try { node.disconnect(); } catch (e) {}
      }
    };
  }
  return voice;
}

function scheduleContactPressureSnap({
  offset,
  duration,
  gain: peakGain,
  pan = 0,
  filterStart = 3600,
  filterEnd = 1800,
}) {
  const start = audioContext.currentTime + offset;
  const stop = start + duration + 0.025;
  const noise = createTransientNoise();
  const filter = audioContext.createBiquadFilter();
  const envelope = audioContext.createGain();
  const panner = typeof audioContext.createStereoPanner === 'function'
    ? audioContext.createStereoPanner()
    : null;

  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(filterStart, start);
  filter.frequency.exponentialRampToValueAtTime(filterEnd, start + duration);
  filter.Q.setValueAtTime(3.4, start);

  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(peakGain, start + 0.003);
  envelope.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  if (panner) panner.pan.setValueAtTime(pan, start);

  noise.connect(filter).connect(envelope);
  const output = panner ? envelope.connect(panner) : envelope;
  output.connect(dryGain);
  output.connect(wetGain);

  registerContactMotifVoice({
    sources: [noise],
    nodes: [noise, filter, envelope, ...(panner ? [panner] : [])],
    primary: noise,
  });
  noise.start(start, Math.random() * 1.2);
  noise.stop(stop);
}

function scheduleContactPressureThump({
  offset,
  duration,
  gain: peakGain,
  pan = 0,
  frequency = 82,
  frequencyEnd = 52,
  filterStart = 520,
  filterEnd = 220,
  release = 0.18,
}) {
  const start = audioContext.currentTime + offset;
  const envelopeEnd = start + duration;
  const stop = envelopeEnd + release + 0.05;
  const oscillator = audioContext.createOscillator();
  const filter = audioContext.createBiquadFilter();
  const envelope = audioContext.createGain();
  const panner = typeof audioContext.createStereoPanner === 'function'
    ? audioContext.createStereoPanner()
    : null;

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(frequencyEnd, start + Math.min(duration, 0.24));

  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterStart, start);
  filter.frequency.exponentialRampToValueAtTime(filterEnd, envelopeEnd + release);
  filter.Q.setValueAtTime(0.54, start);

  envelope.gain.setValueAtTime(0.0001, start);
  envelope.gain.exponentialRampToValueAtTime(peakGain, start + 0.012);
  envelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, peakGain * 0.18), envelopeEnd);
  envelope.gain.exponentialRampToValueAtTime(0.0001, envelopeEnd + release);
  if (panner) panner.pan.setValueAtTime(pan, start);

  oscillator.connect(filter).connect(envelope);
  const output = panner ? envelope.connect(panner) : envelope;
  output.connect(dryGain);
  output.connect(wetGain);

  registerContactMotifVoice({
    sources: [oscillator],
    nodes: [oscillator, filter, envelope, ...(panner ? [panner] : [])],
    primary: oscillator,
  });
  oscillator.start(start);
  oscillator.stop(stop);
}

function scheduleContactPressureRing({
  offset,
  duration,
  gain: peakGain,
  pan = 0,
  frequency,
  frequencyEnd,
  harmonicFrequency = null,
  harmonicGain = 0,
  filterStart,
  filterEnd,
  noiseGain = 0.012,
  release = 0.20,
}) {
  const start = audioContext.currentTime + offset;
  const envelopeEnd = start + duration;
  const stop = envelopeEnd + release + 0.04;
  const oscillator = audioContext.createOscillator();
  const harmonic = Number.isFinite(harmonicFrequency) && harmonicGain > 0
    ? audioContext.createOscillator()
    : null;
  const noise = createTransientNoise();
  const toneFilter = audioContext.createBiquadFilter();
  const noiseFilter = audioContext.createBiquadFilter();
  const toneEnvelope = audioContext.createGain();
  const harmonicGainNode = harmonic ? audioContext.createGain() : null;
  const noiseEnvelope = audioContext.createGain();
  const panner = typeof audioContext.createStereoPanner === 'function'
    ? audioContext.createStereoPanner()
    : null;

  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime(frequency, start);
  oscillator.frequency.exponentialRampToValueAtTime(frequencyEnd, start + Math.min(duration * 0.62, 0.28));
  if (harmonic) {
    harmonic.type = 'sine';
    harmonic.frequency.setValueAtTime(harmonicFrequency, start);
    harmonic.frequency.exponentialRampToValueAtTime(
      Math.max(80, harmonicFrequency * 1.06),
      start + Math.min(duration * 0.72, 0.36),
    );
    harmonicGainNode.gain.setValueAtTime(harmonicGain, start);
    harmonicGainNode.gain.exponentialRampToValueAtTime(0.0001, envelopeEnd + release);
  }

  toneFilter.type = 'bandpass';
  toneFilter.frequency.setValueAtTime(filterStart, start);
  toneFilter.frequency.exponentialRampToValueAtTime(filterEnd, envelopeEnd + release);
  toneFilter.Q.setValueAtTime(2.2, start);

  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.setValueAtTime(filterStart * 1.32, start);
  noiseFilter.frequency.exponentialRampToValueAtTime(filterEnd * 0.92, envelopeEnd);
  noiseFilter.Q.setValueAtTime(1.6, start);

  toneEnvelope.gain.setValueAtTime(0.0001, start);
  toneEnvelope.gain.exponentialRampToValueAtTime(peakGain, start + 0.006);
  toneEnvelope.gain.exponentialRampToValueAtTime(Math.max(0.0002, peakGain * 0.16), envelopeEnd);
  toneEnvelope.gain.exponentialRampToValueAtTime(0.0001, envelopeEnd + release);

  noiseEnvelope.gain.setValueAtTime(0.0001, start);
  noiseEnvelope.gain.exponentialRampToValueAtTime(noiseGain, start + 0.004);
  noiseEnvelope.gain.exponentialRampToValueAtTime(0.0001, start + Math.min(duration * 0.58, 0.12));
  if (panner) panner.pan.setValueAtTime(pan, start);

  oscillator.connect(toneFilter).connect(toneEnvelope);
  if (harmonic && harmonicGainNode) harmonic.connect(harmonicGainNode).connect(toneFilter);
  noise.connect(noiseFilter).connect(noiseEnvelope);
  const toneOutput = panner ? toneEnvelope.connect(panner) : toneEnvelope;
  const noiseOutput = panner ? noiseEnvelope.connect(panner) : noiseEnvelope;
  toneOutput.connect(dryGain);
  toneOutput.connect(wetGain);
  noiseOutput.connect(dryGain);

  registerContactMotifVoice({
    sources: [oscillator, ...(harmonic ? [harmonic] : []), noise],
    nodes: [
      oscillator,
      ...(harmonic ? [harmonic, harmonicGainNode] : []),
      noise,
      toneFilter,
      noiseFilter,
      toneEnvelope,
      noiseEnvelope,
      ...(panner ? [panner] : []),
    ],
    primary: oscillator,
  });
  oscillator.start(start);
  harmonic?.start(start);
  noise.start(start, Math.random() * 1.2);
  oscillator.stop(stop);
  harmonic?.stop(stop);
  noise.stop(start + Math.min(duration + 0.03, 0.18));
}

/**
 * Contact activation motif: a bright lifted ripple synced to the visible wave.
 * The press stays tactile without a bass drop, then five airy ring pulses travel
 * outward and resolve into a longer upward shimmer tail.
 * The first Contact click may unlock audio; an explicitly muted engine stays silent.
 */
export async function playContactRippleMotif({ unlockIfNeeded = false } = {}) {
  if (!isUnlocked && unlockIfNeeded) {
    const didUnlock = await unlockAudio();
    if (!didUnlock) return false;
  }
  if (!isEnabled || !isUnlocked || !audioContext || prefersReducedMotion) return false;

  stopContactRippleMotif();
  const variationIndex = contactMotifVariationIndex;
  const variation = CONTACT_RIPPLE_MOTIF_VARIATIONS[variationIndex];
  contactMotifVariationIndex = (variationIndex + 1) % CONTACT_RIPPLE_MOTIF_VARIATIONS.length;

  const ringOffsets = [0.14, 0.31, 0.54, 0.83, 1.18].map((offset) => (
    Number((offset * variation.ringDelayScale).toFixed(3))
  ));
  const brightness = variation.brightness;
  const pressureGain = variation.pressureGain;
  const pressureEvents = [
    { label: 'press-snap', offset: 0.000, duration: 0.034 },
    { label: 'lifted-press-body', offset: 0.014, duration: 0.14 },
    { label: 'ring-one', offset: ringOffsets[0], duration: 0.20, release: 0.24 },
    { label: 'ring-two', offset: ringOffsets[1], duration: 0.26, release: 0.32 },
    { label: 'ring-three', offset: ringOffsets[2], duration: 0.34, release: 0.42 },
    { label: 'ring-four', offset: ringOffsets[3], duration: 0.43, release: 0.55 },
    { label: 'ring-five', offset: ringOffsets[4], duration: 0.50, release: 0.56 },
    { label: 'upward-air-tail', offset: 1.32 * variation.ringDelayScale, duration: 0.48, release: 0.58 },
  ];

  recordSoundDebugEvent('contact-ripple-motif', 'sound-engine:contact-ripple-motif', {
    character: 'bright-lift-ripple',
    motif: 'snap-lift-five-rings-upward-air-tail',
    layerCount: 4,
    noteCount: pressureEvents.length,
    variation: variation.id,
    variationIndex,
    variationCount: CONTACT_RIPPLE_MOTIF_VARIATIONS.length,
    gainMultiplier: CONTACT_RIPPLE_MOTIF_GAIN,
    ringOffsetsMs: ringOffsets.map((offset) => Math.round(offset * 1000)),
    tailReleaseMs: 580,
    durationMs: Math.round(Math.max(...pressureEvents.map((event) => (
      event.offset + event.duration + (event.release ?? 0.30)
    ))) * 1000),
    frequencies: [196, 392, 494, 587, 659, 784, 988, 1175],
  });

  scheduleContactPressureSnap({
    offset: 0,
    duration: 0.034,
    gain: 0.017 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    filterStart: 5200 * brightness,
    filterEnd: 2600 * brightness,
  });
  scheduleContactPressureThump({
    offset: 0.014,
    duration: 0.12,
    gain: 0.0048 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    frequency: 196,
    frequencyEnd: 247,
    filterStart: 2600 * brightness,
    filterEnd: 1450 * brightness,
    release: 0.08,
  });
  scheduleContactPressureRing({
    offset: ringOffsets[0],
    duration: 0.20,
    gain: 0.0128 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    pan: -variation.panSpread,
    frequency: 392 * brightness,
    frequencyEnd: 494 * brightness,
    harmonicFrequency: 784 * brightness,
    harmonicGain: 0.0034 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    filterStart: 3900 * brightness,
    filterEnd: 2300 * brightness,
    noiseGain: 0.0062 * CONTACT_RIPPLE_MOTIF_GAIN,
    release: 0.24,
  });
  scheduleContactPressureRing({
    offset: ringOffsets[1],
    duration: 0.26,
    gain: 0.0132 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    pan: variation.panSpread,
    frequency: 494 * brightness,
    frequencyEnd: 587 * brightness,
    harmonicFrequency: 988 * brightness,
    harmonicGain: 0.0036 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    filterStart: 3720 * brightness,
    filterEnd: 2200 * brightness,
    noiseGain: 0.0058 * CONTACT_RIPPLE_MOTIF_GAIN,
    release: 0.32,
  });
  scheduleContactPressureRing({
    offset: ringOffsets[2],
    duration: 0.34,
    gain: 0.0126 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    pan: 0,
    frequency: 587 * brightness,
    frequencyEnd: 740 * brightness,
    harmonicFrequency: 1175 * brightness,
    harmonicGain: 0.0033 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    filterStart: 3500 * brightness,
    filterEnd: 2050 * brightness,
    noiseGain: 0.0050 * CONTACT_RIPPLE_MOTIF_GAIN,
    release: 0.42,
  });
  scheduleContactPressureRing({
    offset: ringOffsets[3],
    duration: 0.43,
    gain: 0.0114 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    pan: variation.panSpread * 0.52,
    frequency: 659 * brightness,
    frequencyEnd: 880 * brightness,
    harmonicFrequency: 1318 * brightness,
    harmonicGain: 0.0030 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    filterStart: 3260 * brightness,
    filterEnd: 1880 * brightness,
    noiseGain: 0.0044 * CONTACT_RIPPLE_MOTIF_GAIN,
    release: 0.55,
  });
  scheduleContactPressureRing({
    offset: ringOffsets[4],
    duration: 0.50,
    gain: 0.0098 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    pan: -variation.panSpread * 0.32,
    frequency: 784 * brightness,
    frequencyEnd: 988 * brightness,
    harmonicFrequency: 1568 * brightness,
    harmonicGain: 0.0027 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    filterStart: 3020 * brightness,
    filterEnd: 1720 * brightness,
    noiseGain: 0.0038 * CONTACT_RIPPLE_MOTIF_GAIN,
    release: 0.56,
  });
  scheduleContactPressureRing({
    offset: 1.32 * variation.ringDelayScale,
    duration: 0.48,
    gain: 0.0058 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    pan: 0,
    frequency: 988 * brightness,
    frequencyEnd: 1175 * brightness,
    harmonicFrequency: 1976 * brightness,
    harmonicGain: 0.0019 * pressureGain * CONTACT_RIPPLE_MOTIF_GAIN,
    filterStart: 2850 * brightness,
    filterEnd: 1580 * brightness,
    noiseGain: 0.0028 * CONTACT_RIPPLE_MOTIF_GAIN,
    release: 0.58,
  });
  return true;
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
  const pitAudioProfile = getPitAudioThrottleProfile();

  // Energy threshold: soft touches are silent
  if (intensity < CONFIG.collisionMinImpact + pitAudioProfile.minImpactBoost) return;

  const now = audioContext.currentTime;
  
  // Global rate limiter
  if (now - lastGlobalSoundTime < GLOBAL_MIN_INTERVAL * pitAudioProfile.globalIntervalMultiplier) return;

  if (pitAudioProfile.dropChance > 0 && Math.random() < pitAudioProfile.dropChance) return;
  
  // Per-ball debounce
  if (ballId !== null) {
    const lastTime = lastSoundTime.get(ballId) || 0;
    if (now - lastTime < CONFIG.minTimeBetweenSounds * pitAudioProfile.perBallIntervalMultiplier) return;
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
  recordSoundDebugEvent('collision-playback', ballId || 'collision', {
    intensity: clampedIntensity,
    x: xPosition,
  });
  
  playVoice(voice, frequency, clampedIntensity, xPosition, now);
}

function getPitAudioThrottleProfile() {
  const fallback = {
    minImpactBoost: 0,
    globalIntervalMultiplier: 1,
    perBallIntervalMultiplier: 1,
    dropChance: 0
  };

  try {
    const state = getState();
    if (!state || state.currentMode !== 'pit') return fallback;

    const policy = String(state.pitAudioThrottlePolicy || 'throttle-aware').toLowerCase();
    if (policy !== 'throttle-aware') return fallback;

    const throttleLevel = Math.max(0, Math.min(2, Math.round(Number(state.adaptiveThrottleLevel) || 0)));
    const isMobileClass = Boolean(state.isMobile || state.isMobileViewport);

    if (throttleLevel >= 2) {
      return {
        minImpactBoost: isMobileClass ? 0.24 : 0.18,
        globalIntervalMultiplier: isMobileClass ? 3.2 : 2.5,
        perBallIntervalMultiplier: isMobileClass ? 2.8 : 2.2,
        dropChance: isMobileClass ? 0.72 : 0.52
      };
    }

    if (throttleLevel >= 1) {
      return {
        minImpactBoost: isMobileClass ? 0.14 : 0.1,
        globalIntervalMultiplier: isMobileClass ? 2.1 : 1.7,
        perBallIntervalMultiplier: isMobileClass ? 1.8 : 1.5,
        dropChance: isMobileClass ? 0.4 : 0.2
      };
    }

    if (isMobileClass) {
      return {
        minImpactBoost: 0.05,
        globalIntervalMultiplier: 1.3,
        perBallIntervalMultiplier: 1.2,
        dropChance: 0.12
      };
    }
  } catch (e) {
    return fallback;
  }

  return fallback;
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
  if (!isEnabled) {
    stopWheelLoops();
    stopContactRippleMotif();
  }
  emitSoundStateChange();
  return isEnabled;
}

/** Set sound enabled state */
export function setSoundEnabled(enabled) {
  if (!isUnlocked) return;
  isEnabled = !!enabled;
  if (!isEnabled) {
    stopWheelLoops();
    stopContactRippleMotif();
  }
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
  stopContactRippleMotif();
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNvdW5kLWVuZ2luZS5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyDilZTilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZdcbi8vIOKVkSAgICAgICAgICAgICAgICAgICAgU09VTkQgRU5HSU5FIOKAlCBcIlNPRlQgT1JHQU5JQyBJTVBBQ1RTXCIgICAgICAgICAgICAgICAgICAgICDilZFcbi8vIOKVkSAgICBSZWFsaXN0aWMsIG5vbi1tZWxvZGljIGNvbGxpc2lvbiBzb3VuZHMgd2l0aCBpbnRlbnNpdHktZHJpdmVuIGR5bmFtaWNzICAgIOKVkVxuLy8g4pWa4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWdXG5cbmltcG9ydCB7IGdldFN0YXRlIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvY29yZS9zdGF0ZS5qc1wiO1xuXG4vKipcbiAqIFNvdW5kIERlc2lnbjogU29mdCBPcmdhbmljIEltcGFjdHNcbiAqIFxuICogS2V5IHByaW5jaXBsZXMgZm9yIHJlYWxpc206XG4gKiAtIEludGVuc2l0eSBkcml2ZXMgRVZFUllUSElORzogc29mdCB0b3VjaGVzIOKJiCBzaWxlbnQsIGhhcmQgaGl0cyDiiYggYXVkaWJsZVxuICogLSBOb24tbGluZWFyIGR5bmFtaWNzOiBlbmVyZ3leMS41IGN1cnZlIG1lYW5zIGdlbnRsZSBoaXRzIGFyZSB2ZXJ5IHF1aWV0XG4gKiAtIERhcmtlciB0aW1icmUgYmFzZWxpbmU6IG9ubHkgaGFyZCBpbXBhY3RzIHJldmVhbCBoaWdoIGZyZXF1ZW5jaWVzXG4gKiAtIE1pY3JvLXZhcmlhbmNlIG9uIGFsbCBwYXJhbWV0ZXJzOiBubyB0d28gaGl0cyBzb3VuZCBpZGVudGljYWxcbiAqIC0gQWdncmVzc2l2ZSBoaWdoLWZyZXF1ZW5jeSByb2xsb2ZmOiBwcmV2ZW50cyBoYXJzaC9jbGFja3kgYXJ0aWZhY3RzXG4gKiAtIFNvZnQgbGltaXRpbmc6IHBlYWtzIGFyZSBjb21wcmVzc2VkLCBuZXZlciBjbGlwXG4gKiBcbiAqIFBlcmZvcm1hbmNlOiA4LXZvaWNlIHBvb2wsIE8oMSkgcGVyIGNvbGxpc2lvbiwgfjNtcyBhdWRpbyBsYXRlbmN5XG4gKi9cblxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBNSUNSTy1WQVJJQVRJT04gSEVMUEVSXG4vLyBSZWFsLXdvcmxkIGNvbGxpc2lvbnMgTkVWRVIgc291bmQgaWRlbnRpY2FsLlxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbi8qKiBBZGQgcmFuZG9tIHZhcmlhbmNlIHRvIGEgdmFsdWU6IHZhcnkoMTAwLCAwLjE1KSDihpIgODXigJMxMTUgKi9cbmZ1bmN0aW9uIHZhcnkoYmFzZSwgdmFyaWFuY2UgPSAwLjE1KSB7XG4gIHJldHVybiBiYXNlICogKDEgKyAoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiAyICogdmFyaWFuY2UpO1xufVxuXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIENPTkZJR1VSQVRJT04g4oCUIExvY2tlZCBiYXNlbGluZSBmb3Igc29mdCBvcmdhbmljIGltcGFjdHNcbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuY29uc3QgQkFTRV9DT05GSUcgPSB7XG4gIC8vIFN5bnRoZXNpcyAobG9uZ2VyIGRlY2F5IGZvciBjaGltZS1saWtlIHN1c3RhaW4pXG4gIGF0dGFja1RpbWU6IDAuMDAzLFxuICBkZWNheVRpbWU6IDAuMTIsXG4gIGhhcm1vbmljR2FpbjogMC4wMixcbiAgXG4gIC8vIEZpbHRlciAodGltYnJlKVxuICBmaWx0ZXJCYXNlRnJlcTogNTgwLFxuICBmaWx0ZXJWZWxvY2l0eVJhbmdlOiA0MDAsXG4gIGZpbHRlclE6IDAuMTgsXG4gIGZpbHRlck1pbkh6OiAzNTAsXG4gIGZpbHRlck1heEh6OiAyODAwLFxuICBcbiAgLy8gUGl0Y2ggbWFwcGluZyAocmFkaXVzIOKGkiBmcmVxdWVuY3kpIC0gd2lkZXIgcmFuZ2UgZm9yIG1lbG9kaWMgY2hpbWVzXG4gIHBpdGNoTWluSHo6IDIyMCxcbiAgcGl0Y2hNYXhIejogODgwLFxuICBwaXRjaEN1cnZlOiAxLjIsXG4gIFxuICAvLyBSZXZlcmIgKGV0aGVyZWFsIHNoaW1tZXIpXG4gIHJldmVyYkRlY2F5OiAwLjI1LFxuICByZXZlcmJXZXRNaXg6IDAuMTgsXG4gIHJldmVyYkhpZ2hEYW1wOiAwLjU1LFxuICBcbiAgLy8gVm9sdW1lIC8gZHluYW1pY3NcbiAgbWluR2FpbjogMC4wMDEsXG4gIG1heEdhaW46IDAuMDEyNSxcbiAgbWFzdGVyR2FpbjogMC40MixcbiAgdm9pY2VHYWluTWF4OiAwLjAyLFxuICBcbiAgLy8gUGVyZm9ybWFuY2VcbiAgbWluVGltZUJldHdlZW5Tb3VuZHM6IDAuMDEyLFxuICBcbiAgLy8gU3RlcmVvXG4gIG1heFBhbjogMC4xNSxcbiAgXG4gIC8vIE5vaXNlIHRyYW5zaWVudCAoc29mdGVuZWQgZm9yIGNoaW1lIGNoYXJhY3RlcilcbiAgbm9pc2VUcmFuc2llbnRFbmFibGVkOiB0cnVlLFxuICBub2lzZVRyYW5zaWVudEdhaW46IDAuMDE4LFxuICBub2lzZVRyYW5zaWVudERlY2F5OiAwLjAwNCxcbiAgbm9pc2VUcmFuc2llbnRGaWx0ZXJNaW46IDgwMCxcbiAgbm9pc2VUcmFuc2llbnRGaWx0ZXJNYXg6IDI0MDAsXG4gIG5vaXNlVHJhbnNpZW50UTogMC44LFxuICBcbiAgLy8gU3BhcmtsZSBwYXJ0aWFsIChnbGFzcy1saWtlIG1pY3JvLWNoaW1lcyBmb3IgYWV0aGVyZWFsIHF1YWxpdHkpXG4gIHNwYXJrbGVHYWluOiAwLjAzNSxcbiAgc3BhcmtsZVJhdGlvTWluOiAyLjAsXG4gIHNwYXJrbGVSYXRpb01heDogNS4wLFxuICBzcGFya2xlRGVjYXlNdWw6IDAuODUsXG4gIFxuICAvLyBNaWNyby12YXJpYXRpb24gKG9yZ2FuaWMgZmVlbClcbiAgdmFyaWFuY2VQaXRjaDogMC4wNixcbiAgdmFyaWFuY2VEZWNheTogMC4yMCxcbiAgdmFyaWFuY2VHYWluOiAwLjE1LFxuICB2YXJpYW5jZUZpbHRlcjogMC4xOCxcbiAgdmFyaWFuY2VOb2lzZTogMC4yNSxcbiAgXG4gIC8vIEludGVuc2l0eS1kcml2ZW4gZHluYW1pY3NcbiAgdmVsb2NpdHlOb2lzZVNjYWxlOiAxLjgsXG4gIHZlbG9jaXR5QnJpZ2h0bmVzc1NjYWxlOiAxLjQsXG4gIHZlbG9jaXR5RGVjYXlTY2FsZTogMC42NSxcbiAgaW50ZW5zaXR5RXhwb25lbnQ6IDEuNSxcbiAgXG4gIC8vIFRvbmUgc2FmZXR5IChhbnRpLWhhcnNobmVzcylcbiAgdG9uZVNhZmV0eU1pbkh6OiAxMzAsXG4gIHRvbmVTYWZldHlNYXhIejogNDgwLFxuICB0b25lU2FmZXR5RXhwb25lbnQ6IDIuMixcbiAgdG9uZVNhZmV0eUhpZ2hHYWluQXR0ZW46IDAuMjUsXG4gIHRvbmVTYWZldHlMb3dHYWluQXR0ZW46IDAuMDYsXG4gIHRvbmVTYWZldHlIaWdoQnJpZ2h0QXR0ZW46IDAuNDUsXG4gIFxuICAvLyBFbmVyZ3kgdGhyZXNob2xkXG4gIGNvbGxpc2lvbk1pbkltcGFjdDogMC41OCxcbiAgXG4gIC8vIEhpZ2gtc2hlbGYgRVEgKGFnZ3Jlc3NpdmUgaGlnaCByb2xsb2ZmKVxuICBoaWdoU2hlbGZGcmVxOiAyMjAwLFxuICBoaWdoU2hlbGZHYWluOiAtNi4wLFxufTtcblxubGV0IFdIRUVMX1NGWF9DT05GSUcgPSB7XG4gIC8vIENvbnRpbnVvdXMgd2hlZWwgbG9vcCAobGVnYWN5KS4gV2hlbiBkaXNhYmxlZCwgYHVwZGF0ZVdoZWVsU2Z4KClgIHdpbGwgc3RvcCBhbnkgbG9vcHMuXG4gIGNvbnRpbnVvdXNFbmFibGVkOiBmYWxzZSxcbiAgdGlja0dhaW5NdWw6IDEuMCxcbiAgc3dpc2hHYWluTXVsOiAxLjAsXG5cbiAgdGlja0Jhc2VHYWluOiAwLjAyOCxcbiAgdGlja01pblZlbG9jaXR5OiA1MCxcbiAgdGlja01heFZlbG9jaXR5OiAxNjAwLFxuICB0aWNrTWluUmF0ZTogMC42LFxuICB0aWNrTWF4UmF0ZTogOSxcbiAgc3dpc2hCYXNlR2FpbjogMC4wMTYsXG4gIHN3aXNoTWluVmVsb2NpdHk6IDIyMCxcbiAgc3dpc2hNYXhWZWxvY2l0eTogMjIwMCxcbiAgc3dpc2hNaW5IejogNjAwLFxuICBzd2lzaE1heEh6OiAyMjAwLFxuXG4gIC8vIERpc2NyZXRlIGNsaWNrIHVzZWQgYnkgcG9ydGZvbGlvIGNhcm91c2VsIHdoZW4gYSBwcm9qZWN0IHBhc3NlcyBjZW50ZXJcbiAgY2VudGVyR2FpbjogMC4wOCxcbiAgY2VudGVyRmlsdGVySHo6IDE2MDAsXG5cbiAgc25hcEdhaW46IDAuMTIsXG4gIG9wZW5HYWluOiAwLjEyLFxuICBvcGVuRmlsdGVySHo6IDE4MDAsXG4gIGNsb3NlR2FpbjogMC4xMCxcbiAgY2xvc2VGaWx0ZXJIejogMTYwMCxcbiAgc25hcERlYm91bmNlTXM6IDMwMCxcbiAgc3RvcERlbGF5TXM6IDYwLFxufTtcblxuZXhwb3J0IGZ1bmN0aW9uIGdldFdoZWVsU2Z4Q29uZmlnKCkge1xuICByZXR1cm4geyAuLi5XSEVFTF9TRlhfQ09ORklHIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiB1cGRhdGVXaGVlbFNmeENvbmZpZyh1cGRhdGVzKSB7XG4gIGZvciAoY29uc3QgW2tleSwgdmFsdWVdIG9mIE9iamVjdC5lbnRyaWVzKHVwZGF0ZXMpKSB7XG4gICAgaWYgKGtleSBpbiBXSEVFTF9TRlhfQ09ORklHKSB7XG4gICAgICBXSEVFTF9TRlhfQ09ORklHW2tleV0gPSB2YWx1ZTtcbiAgICB9XG4gIH1cbn1cblxuLy8gTXV0YWJsZSBjb25maWcgKGluaXRpYWxpemVkIGFmdGVyIHByZXNldHMgYXJlIGRlZmluZWQpXG5sZXQgQ09ORklHID0gbnVsbDtcblxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBQUkVTRVRTIOKAlCBEaWZmZXJlbnQgc291bmQgY2hhcmFjdGVycyBmb3IgZGlmZmVyZW50IGFlc3RoZXRpY3Ncbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuZXhwb3J0IGNvbnN0IFNPVU5EX1BSRVNFVFMgPSB7XG4gIC8vIERlZmF1bHQ6IGJhbGFuY2VkLCB3YXJtLCBuYXR1cmFsXG4gIG9yZ2FuaWNJbXBhY3Q6IHtcbiAgICBsYWJlbDogJ09yZ2FuaWMgSW1wYWN0JyxcbiAgICBkZXNjcmlwdGlvbjogJ1dhcm0sIG5hdHVyYWwgdGh1ZHMgd2l0aCBpbnRlbnNpdHkgZHluYW1pY3MnLFxuICAgIC4uLkJBU0VfQ09ORklHLFxuICB9LFxuICBcbiAgLy8gQnJpZ2h0ZXIsIG1vcmUgcmVzb25hbnQg4oCUIGxpa2UgZ2xhc3MgbWFyYmxlcyBvbiBoYXJkIHN1cmZhY2VcbiAgZ2xhc3NNYXJibGVzOiB7XG4gICAgbGFiZWw6ICdHbGFzcyBNYXJibGVzJyxcbiAgICBkZXNjcmlwdGlvbjogJ0NsZWFyLCBnbGFzc3kgaW1wYWN0cyB3aXRoIG1vcmUgcHJlc2VuY2UnLFxuICAgIC4uLkJBU0VfQ09ORklHLFxuICAgIHBpdGNoTWluSHo6IDI2MCxcbiAgICBwaXRjaE1heEh6OiA3ODAsXG4gICAgcGl0Y2hDdXJ2ZTogMS4wNSxcbiAgICBmaWx0ZXJCYXNlRnJlcTogODUwLFxuICAgIGZpbHRlclZlbG9jaXR5UmFuZ2U6IDYwMCxcbiAgICBub2lzZVRyYW5zaWVudEdhaW46IDAuMDY1LFxuICAgIG5vaXNlVHJhbnNpZW50RmlsdGVyTWluOiA2NTAsXG4gICAgbm9pc2VUcmFuc2llbnRGaWx0ZXJNYXg6IDIyMDAsXG4gICAgbm9pc2VUcmFuc2llbnRROiAxLjYsXG4gICAgZGVjYXlUaW1lOiAwLjA1NSxcbiAgICBpbnRlbnNpdHlFeHBvbmVudDogMS4zLFxuICAgIGhpZ2hTaGVsZkdhaW46IC00LjUsXG4gIH0sXG4gIFxuICAvLyDimIUgUFJFRkVSUkVEOiBDbGVhciwgY2xvc2UsIHNvb3RoaW5nIGNyeXN0YWxsaW5lIG1pY3JvLWNoaW1lc1xuICBjcnlzdGFsUGViYmxlczoge1xuICAgIGxhYmVsOiAnQ3J5c3RhbCBQZWJibGVzIOKYhScsXG4gICAgZGVzY3JpcHRpb246ICdDcmlzcCwgY2xvc2UsIHNvb3RoaW5nIG1pY3JvLWNoaW1lcyAobm9uLXJlcGV0aXRpdmUpJyxcbiAgICAuLi5CQVNFX0NPTkZJRyxcbiAgICAvLyBIaWdoZXIsIGxpZ2h0ZXIgcGl0Y2ggbWFwcGluZ1xuICAgIHBpdGNoTWluSHo6IDQyMCxcbiAgICBwaXRjaE1heEh6OiAxNjAwLFxuICAgIHBpdGNoQ3VydmU6IDEuMTUsXG4gICAgLy8gQnJpZ2h0ZXIgdGltYnJlLCBzdGlsbCBzb2Z0ZW5lZFxuICAgIGZpbHRlckJhc2VGcmVxOiAxMzAwLFxuICAgIGZpbHRlclZlbG9jaXR5UmFuZ2U6IDE3MDAsXG4gICAgZmlsdGVyUTogMC4yMixcbiAgICBmaWx0ZXJNYXhIejogNjIwMCxcbiAgICAvLyBTaG9ydCArIGRlbGljYXRlXG4gICAgZGVjYXlUaW1lOiAwLjA0MCxcbiAgICBpbnRlbnNpdHlFeHBvbmVudDogMS42NSxcbiAgICBjb2xsaXNpb25NaW5JbXBhY3Q6IDAuNzAsXG4gICAgbWluVGltZUJldHdlZW5Tb3VuZHM6IDAuMDE4LFxuICAgIC8vIFNwYXJrbGUgaW5zdGVhZCBvZiBcInNuYXBcIlxuICAgIG5vaXNlVHJhbnNpZW50R2FpbjogMC4wMjAsXG4gICAgbm9pc2VUcmFuc2llbnREZWNheTogMC4wMDYsXG4gICAgbm9pc2VUcmFuc2llbnRGaWx0ZXJNaW46IDEyMDAsXG4gICAgbm9pc2VUcmFuc2llbnRGaWx0ZXJNYXg6IDcwMDAsXG4gICAgbm9pc2VUcmFuc2llbnRROiAyLjgsXG4gICAgc3BhcmtsZUdhaW46IDAuMTIsXG4gICAgc3BhcmtsZVJhdGlvTWluOiAyLjYsXG4gICAgc3BhcmtsZVJhdGlvTWF4OiA0LjQsXG4gICAgc3BhcmtsZURlY2F5TXVsOiAwLjU1LFxuICAgIC8vIEtlZXAgaXQgY2xvc2UgKGxlc3MgZGlzdGFuY2UpXG4gICAgcmV2ZXJiV2V0TWl4OiAwLjA0LFxuICAgIHJldmVyYkRlY2F5OiAwLjEwLFxuICAgIGhpZ2hTaGVsZkdhaW46IC00LjAsXG4gICAgbWFzdGVyR2FpbjogMC40MixcbiAgfSxcbiAgXG4gIC8vIOKYhSBQUkVGRVJSRUQ6IFZlcnkgc29mdCwgbWluaW1hbCB0cmFuc2llbnQg4oCUIGxpa2Ugd29vZGVuIGJlYWRzXG4gIHdvb2RlbkJlYWRzOiB7XG4gICAgbGFiZWw6ICdXb29kZW4gQmVhZHMg4piFJyxcbiAgICBkZXNjcmlwdGlvbjogJ1VsdHJhLXNvZnQsIG11dGVkIHRodWRzIChyZWNvbW1lbmRlZCknLFxuICAgIC4uLkJBU0VfQ09ORklHLFxuICAgIGZpbHRlckJhc2VGcmVxOiA0MjAsXG4gICAgZmlsdGVyVmVsb2NpdHlSYW5nZTogMjAwLFxuICAgIG5vaXNlVHJhbnNpZW50R2FpbjogMC4wMjUsXG4gICAgbm9pc2VUcmFuc2llbnRGaWx0ZXJNaW46IDM4MCxcbiAgICBub2lzZVRyYW5zaWVudEZpbHRlck1heDogMTQwMCxcbiAgICBub2lzZVRyYW5zaWVudFE6IDEuMSxcbiAgICBkZWNheVRpbWU6IDAuMDk1LFxuICAgIGludGVuc2l0eUV4cG9uZW50OiAxLjcsXG4gICAgY29sbGlzaW9uTWluSW1wYWN0OiAwLjYyLFxuICAgIGhpZ2hTaGVsZkdhaW46IC03LjUsXG4gICAgcmV2ZXJiV2V0TWl4OiAwLjEyLFxuICB9LFxuICBcbiAgLy8gTG9uZ2VyIGRlY2F5LCBtb3JlIGJvdW5jZSDigJQgcGxheWZ1bCBydWJiZXIgYmFsbHNcbiAgcnViYmVyQmFsbHM6IHtcbiAgICBsYWJlbDogJ1J1YmJlciBCYWxscycsXG4gICAgZGVzY3JpcHRpb246ICdCb3VuY3ksIHBsYXlmdWwgd2l0aCBsb25nZXIgZGVjYXknLFxuICAgIC4uLkJBU0VfQ09ORklHLFxuICAgIHBpdGNoTWluSHo6IDE2MCxcbiAgICBwaXRjaE1heEh6OiAzNjAsXG4gICAgZmlsdGVyQmFzZUZyZXE6IDUyMCxcbiAgICBmaWx0ZXJWZWxvY2l0eVJhbmdlOiAzNTAsXG4gICAgbm9pc2VUcmFuc2llbnRHYWluOiAwLjAzNSxcbiAgICBub2lzZVRyYW5zaWVudEZpbHRlck1pbjogNDUwLFxuICAgIG5vaXNlVHJhbnNpZW50RmlsdGVyTWF4OiAxNjAwLFxuICAgIG5vaXNlVHJhbnNpZW50UTogMS4yLFxuICAgIGRlY2F5VGltZTogMC4xMjAsXG4gICAgaW50ZW5zaXR5RXhwb25lbnQ6IDEuNCxcbiAgICByZXZlcmJXZXRNaXg6IDAuMTQsXG4gICAgaGlnaFNoZWxmR2FpbjogLTUuMCxcbiAgfSxcbiAgXG4gIC8vIFNoYXJwZXIgYXR0YWNrLCBicmlnaHRlciDigJQgY3Jpc3AgYW5kIHBlcmN1c3NpdmVcbiAgbWV0YWxsaWNDbGljazoge1xuICAgIGxhYmVsOiAnTWV0YWxsaWMgQ2xpY2snLFxuICAgIGRlc2NyaXB0aW9uOiAnQ3Jpc3AsIHBlcmN1c3NpdmUgaW1wYWN0cycsXG4gICAgLi4uQkFTRV9DT05GSUcsXG4gICAgcGl0Y2hNaW5IejogMjIwLFxuICAgIHBpdGNoTWF4SHo6IDYyMCxcbiAgICBwaXRjaEN1cnZlOiAxLjEsXG4gICAgZmlsdGVyQmFzZUZyZXE6IDcyMCxcbiAgICBmaWx0ZXJWZWxvY2l0eVJhbmdlOiA1NTAsXG4gICAgbm9pc2VUcmFuc2llbnRHYWluOiAwLjA4MCxcbiAgICBub2lzZVRyYW5zaWVudEZpbHRlck1pbjogNzAwLFxuICAgIG5vaXNlVHJhbnNpZW50RmlsdGVyTWF4OiAyNDAwLFxuICAgIG5vaXNlVHJhbnNpZW50UTogMS44LFxuICAgIG5vaXNlVHJhbnNpZW50RGVjYXk6IDAuMDA2LFxuICAgIGRlY2F5VGltZTogMC4wNDUsXG4gICAgaW50ZW5zaXR5RXhwb25lbnQ6IDEuMixcbiAgICBoaWdoU2hlbGZHYWluOiAtMy41LFxuICAgIGNvbGxpc2lvbk1pbkltcGFjdDogMC41MCxcbiAgfSxcbn07XG5cbi8vIERlZmF1bHQgcHJlc2V0IChjcnlzdGFsUGViYmxlcyBpcyB0dW5lZCBmb3IgY3Jpc3AsIHNvb3RoaW5nIHByZXNlbmNlKVxubGV0IGN1cnJlbnRQcmVzZXQgPSAnY3J5c3RhbFBlYmJsZXMnO1xuXG4vLyBJbml0aWFsaXplIENPTkZJRyB3aXRoIHRoZSBkZWZhdWx0IHByZXNldFxuQ09ORklHID0geyAuLi5TT1VORF9QUkVTRVRTW2N1cnJlbnRQcmVzZXRdIH07XG5kZWxldGUgQ09ORklHLmxhYmVsO1xuZGVsZXRlIENPTkZJRy5kZXNjcmlwdGlvbjtcblxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBTVEFURVxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5sZXQgYXVkaW9Db250ZXh0ID0gbnVsbDtcbmxldCBtYXN0ZXJHYWluID0gbnVsbDtcbmxldCByZXZlcmJOb2RlID0gbnVsbDtcbmxldCBkcnlHYWluID0gbnVsbDtcbmxldCB3ZXRHYWluID0gbnVsbDtcbmxldCBsaW1pdGVyID0gbnVsbDtcbmxldCBzYXR1cmF0b3IgPSBudWxsO1xubGV0IGhpZ2hTaGVsZiA9IG51bGw7XG5sZXQgd2hlZWxCdXMgPSBudWxsO1xuXG5sZXQgaXNFbmFibGVkID0gZmFsc2U7XG5sZXQgaXNVbmxvY2tlZCA9IGZhbHNlO1xuY29uc3QgY29udGFjdE1vdGlmVm9pY2VzID0gbmV3IFNldCgpO1xuY29uc3QgQ09OVEFDVF9SSVBQTEVfTU9USUZfVkFSSUFUSU9OUyA9IE9iamVjdC5mcmVlemUoW1xuICBPYmplY3QuZnJlZXplKHsgaWQ6ICdsaWZ0LXRpZ2h0JywgcmluZ0RlbGF5U2NhbGU6IDAuOTgsIHBhblNwcmVhZDogMC4xNCwgcHJlc3N1cmVHYWluOiAwLjcyLCBicmlnaHRuZXNzOiAxLjMwIH0pLFxuICBPYmplY3QuZnJlZXplKHsgaWQ6ICdsaWZ0LXdpZGUtbGVmdCcsIHJpbmdEZWxheVNjYWxlOiAxLjAwLCBwYW5TcHJlYWQ6IDAuMjIsIHByZXNzdXJlR2FpbjogMC43MCwgYnJpZ2h0bmVzczogMS4yNCB9KSxcbiAgT2JqZWN0LmZyZWV6ZSh7IGlkOiAnbGlmdC13aWRlLXJpZ2h0JywgcmluZ0RlbGF5U2NhbGU6IDEuMDIsIHBhblNwcmVhZDogMC4yNiwgcHJlc3N1cmVHYWluOiAwLjY4LCBicmlnaHRuZXNzOiAxLjM0IH0pLFxuICBPYmplY3QuZnJlZXplKHsgaWQ6ICdsaWZ0LWxvbmcnLCByaW5nRGVsYXlTY2FsZTogMS4wNCwgcGFuU3ByZWFkOiAwLjE4LCBwcmVzc3VyZUdhaW46IDAuNzQsIGJyaWdodG5lc3M6IDEuMjIgfSksXG5dKTtcbmNvbnN0IENPTlRBQ1RfUklQUExFX01PVElGX0dBSU4gPSAzLjI1O1xubGV0IGNvbnRhY3RNb3RpZlZhcmlhdGlvbkluZGV4ID0gMDtcblxuLy8gQnJvYWRjYXN0IHN0YXRlIGNoYW5nZXMgc28gVUkgc3RheXMgaW4gc3luY1xuZXhwb3J0IGNvbnN0IFNPVU5EX1NUQVRFX0VWRU5UID0gJ3NpbXVsYXRpb25zOnNvdW5kLXN0YXRlJztcbmZ1bmN0aW9uIGVtaXRTb3VuZFN0YXRlQ2hhbmdlKCkge1xuICB0cnkge1xuICAgIGlmICh0eXBlb2Ygd2luZG93ICE9PSAndW5kZWZpbmVkJyAmJiB3aW5kb3cuZGlzcGF0Y2hFdmVudCkge1xuICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KFNPVU5EX1NUQVRFX0VWRU5ULCB7IGRldGFpbDogZ2V0U291bmRTdGF0ZSgpIH0pKTtcbiAgICB9XG4gIH0gY2F0Y2ggKGUpIHt9XG59XG5cbmZ1bmN0aW9uIHJlY29yZFNvdW5kRGVidWdFdmVudCh0eXBlLCBpZCwgZGV0YWlsID0ge30pIHtcbiAgaWYgKHR5cGVvZiB3aW5kb3cgPT09ICd1bmRlZmluZWQnKSByZXR1cm47XG4gIGNvbnN0IGtleSA9IFN0cmluZyhpZCB8fCB0eXBlKTtcbiAgY29uc3Qgc3RvcmUgPSB3aW5kb3cuX19BQlNfU0lNVUxBVElPTl9BVURJT19fIHx8IHtcbiAgICB0b3RhbDogMCxcbiAgICBieVR5cGU6IHt9LFxuICAgIGJ5SWQ6IHt9LFxuICAgIGV2ZW50czogW10sXG4gIH07XG4gIHN0b3JlLnRvdGFsICs9IDE7XG4gIHN0b3JlLmJ5VHlwZVt0eXBlXSA9IChzdG9yZS5ieVR5cGVbdHlwZV0gfHwgMCkgKyAxO1xuICBzdG9yZS5ieUlkW2tleV0gPSAoc3RvcmUuYnlJZFtrZXldIHx8IDApICsgMTtcbiAgc3RvcmUubGFzdEV2ZW50ID0ge1xuICAgIHR5cGUsXG4gICAgaWQ6IGtleSxcbiAgICBhdDogdHlwZW9mIHBlcmZvcm1hbmNlICE9PSAndW5kZWZpbmVkJyA/IHBlcmZvcm1hbmNlLm5vdygpIDogRGF0ZS5ub3coKSxcbiAgICAuLi5kZXRhaWwsXG4gIH07XG4gIGlmIChzdG9yZS5ldmVudHMubGVuZ3RoIDwgODApIHtcbiAgICBzdG9yZS5ldmVudHMucHVzaChzdG9yZS5sYXN0RXZlbnQpO1xuICB9IGVsc2Uge1xuICAgIHN0b3JlLmV2ZW50c1tzdG9yZS50b3RhbCAlIHN0b3JlLmV2ZW50cy5sZW5ndGhdID0gc3RvcmUubGFzdEV2ZW50O1xuICB9XG4gIHdpbmRvdy5fX0FCU19TSU1VTEFUSU9OX0FVRElPX18gPSBzdG9yZTtcbn1cblxuLy8gVm9pY2UgcG9vbCBmb3IgZWZmaWNpZW50IHNvdW5kIHBsYXliYWNrIChyZXVzYWJsZSBub2RlcylcbmNvbnN0IFZPSUNFX1BPT0xfU0laRSA9IDg7XG5sZXQgdm9pY2VQb29sID0gW107XG5sZXQgbGFzdEdsb2JhbFNvdW5kVGltZSA9IDA7XG5jb25zdCBHTE9CQUxfTUlOX0lOVEVSVkFMID0gMC4wMDU7IC8vIDVtcyBiZXR3ZWVuIEFOWSBzb3VuZHMgKDIwMC9zZWMgbWF4KVxuXG5sZXQgbGFzdFNvdW5kVGltZSA9IG5ldyBNYXAoKTsgLy8gYmFsbCBpZCDihpIgdGltZXN0YW1wXG5cbi8vIFJlZHVjZWQgbW90aW9uIHByZWZlcmVuY2VcbmxldCBwcmVmZXJzUmVkdWNlZE1vdGlvbiA9IGZhbHNlO1xuXG4vLyBTaGFyZWQgbm9pc2UgYnVmZmVyIChjcmVhdGVkIG9uY2UsIHJldXNlZClcbmxldCBzaGFyZWROb2lzZUJ1ZmZlciA9IG51bGw7XG5cbi8vIFdoZWVsIFNGWCBzdGF0ZVxubGV0IHdoZWVsVGlja0J1ZmZlciA9IG51bGw7XG5sZXQgd2hlZWxUaWNrU291cmNlID0gbnVsbDtcbmxldCB3aGVlbFRpY2tHYWluID0gbnVsbDtcbmxldCB3aGVlbFRpY2tGaWx0ZXIgPSBudWxsO1xubGV0IHdoZWVsU3dpc2hCdWZmZXIgPSBudWxsO1xubGV0IHdoZWVsU3dpc2hTb3VyY2UgPSBudWxsO1xubGV0IHdoZWVsU3dpc2hHYWluID0gbnVsbDtcbmxldCB3aGVlbFN3aXNoRmlsdGVyID0gbnVsbDtcbmxldCB3aGVlbFdob29zaEJ1ZmZlciA9IG51bGw7XG5sZXQgd2hlZWxTdG9wVGltZXIgPSBudWxsO1xuXG5sZXQgaXNTb3VuZEVuZ2luZUluaXRpYWxpemVkID0gZmFsc2U7XG5cbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gSU5JVElBTElaQVRJT05cbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuXG4vKipcbiAqIEluaXRpYWxpemUgdGhlIHNvdW5kIGVuZ2luZSAoY2FsbCBvbmNlIGF0IHN0YXJ0dXApXG4gKiBEb2VzIE5PVCBjcmVhdGUgQXVkaW9Db250ZXh0IHlldCDigJQgdGhhdCByZXF1aXJlcyB1c2VyIGludGVyYWN0aW9uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBpbml0U291bmRFbmdpbmUoKSB7XG4gIGlmIChpc1NvdW5kRW5naW5lSW5pdGlhbGl6ZWQpIHJldHVybjtcbiAgaXNTb3VuZEVuZ2luZUluaXRpYWxpemVkID0gdHJ1ZTtcblxuICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93Lm1hdGNoTWVkaWEpIHtcbiAgICBjb25zdCBtb3Rpb25RdWVyeSA9IHdpbmRvdy5tYXRjaE1lZGlhKCcocHJlZmVycy1yZWR1Y2VkLW1vdGlvbjogcmVkdWNlKScpO1xuICAgIHByZWZlcnNSZWR1Y2VkTW90aW9uID0gbW90aW9uUXVlcnkubWF0Y2hlcztcbiAgICBtb3Rpb25RdWVyeS5hZGRFdmVudExpc3RlbmVyKCdjaGFuZ2UnLCAoZSkgPT4ge1xuICAgICAgcHJlZmVyc1JlZHVjZWRNb3Rpb24gPSBlLm1hdGNoZXM7XG4gICAgfSk7XG4gIH1cbn1cblxuLyoqXG4gKiBBcHBseSBydW50aW1lLWNvbmZpZyBvdmVycmlkZXMgZm9yIHNvdW5kLlxuICpcbiAqIFN1cHBvcnRlZCBjb25maWcgc2hhcGVzOlxuICogLSB7IHNvdW5kUHJlc2V0OiBcImNyeXN0YWxQZWJibGVzXCIsIHNvdW5kQ29uZmlnOiB7IC4uLkNPTkZJR19LRVlTIH0gfVxuICogLSB7IHNvdW5kUHJlc2V0OiBcImNyeXN0YWxQZWJibGVzXCIsIDxDT05GSUdfS0VZUz46IDx2YWx1ZT4sIC4uLiB9XG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVNvdW5kQ29uZmlnRnJvbVJ1bnRpbWVDb25maWcocnVudGltZUNvbmZpZykge1xuICBjb25zdCBjZmcgPSBydW50aW1lQ29uZmlnICYmIHR5cGVvZiBydW50aW1lQ29uZmlnID09PSAnb2JqZWN0JyA/IHJ1bnRpbWVDb25maWcgOiBudWxsO1xuICBpZiAoIWNmZykgcmV0dXJuO1xuXG4gIC8vIFByZXNldCBmaXJzdCAoc2V0cyBiYXNlbGluZSlcbiAgaWYgKHR5cGVvZiBjZmcuc291bmRQcmVzZXQgPT09ICdzdHJpbmcnKSB7XG4gICAgYXBwbHlTb3VuZFByZXNldChjZmcuc291bmRQcmVzZXQpO1xuICB9XG5cbiAgLy8gRXhwbGljaXQgb2JqZWN0IG92ZXJyaWRlc1xuICBpZiAoY2ZnLnNvdW5kQ29uZmlnICYmIHR5cGVvZiBjZmcuc291bmRDb25maWcgPT09ICdvYmplY3QnKSB7XG4gICAgdXBkYXRlU291bmRDb25maWcoY2ZnLnNvdW5kQ29uZmlnKTtcbiAgICByZXR1cm47XG4gIH1cblxuICAvLyBGbGF0LWtleSBvdmVycmlkZXMgKG9ubHkgaWYga2V5IGV4aXN0cyBpbiBDT05GSUcpXG4gIGNvbnN0IHVwZGF0ZXMgPSB7fTtcbiAgbGV0IGhhc0FueSA9IGZhbHNlO1xuICBmb3IgKGNvbnN0IFtrLCB2XSBvZiBPYmplY3QuZW50cmllcyhjZmcpKSB7XG4gICAgaWYgKGsgaW4gQ09ORklHKSB7XG4gICAgICB1cGRhdGVzW2tdID0gdjtcbiAgICAgIGhhc0FueSA9IHRydWU7XG4gICAgfVxuICB9XG4gIGlmIChoYXNBbnkpIHVwZGF0ZVNvdW5kQ29uZmlnKHVwZGF0ZXMpO1xufVxuXG4vKipcbiAqIFVubG9jayBhdWRpbyAobXVzdCBiZSBjYWxsZWQgZnJvbSB1c2VyIGdlc3R1cmUgbGlrZSBjbGljaylcbiAqIENyZWF0ZXMgQXVkaW9Db250ZXh0IGFuZCBidWlsZHMgdGhlIGF1ZGlvIGdyYXBoXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiB1bmxvY2tBdWRpbygpIHtcbiAgaWYgKGlzVW5sb2NrZWQpIHJldHVybiB0cnVlO1xuICBcbiAgdHJ5IHtcbiAgICBjb25zdCBBdWRpb0N0eCA9IHdpbmRvdy5BdWRpb0NvbnRleHQgfHwgd2luZG93LndlYmtpdEF1ZGlvQ29udGV4dDtcbiAgICBpZiAoIUF1ZGlvQ3R4KSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1dlYiBBdWRpbyBBUEkgbm90IHN1cHBvcnRlZCcpO1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICBcbiAgICBhdWRpb0NvbnRleHQgPSBuZXcgQXVkaW9DdHgoeyBcbiAgICAgIGxhdGVuY3lIaW50OiAnaW50ZXJhY3RpdmUnLFxuICAgICAgc2FtcGxlUmF0ZTogNDQxMDBcbiAgICB9KTtcbiAgICBcbiAgICBpZiAoYXVkaW9Db250ZXh0LnN0YXRlID09PSAnc3VzcGVuZGVkJykge1xuICAgICAgYXdhaXQgYXVkaW9Db250ZXh0LnJlc3VtZSgpO1xuICAgIH1cbiAgICBcbiAgICBidWlsZEF1ZGlvR3JhcGgoKTtcbiAgICBcbiAgICBpc1VubG9ja2VkID0gdHJ1ZTtcbiAgICBpc0VuYWJsZWQgPSB0cnVlO1xuICAgIGVtaXRTb3VuZFN0YXRlQ2hhbmdlKCk7XG4gICAgXG4gICAgY29uc3QgbGF0ZW5jeU1zID0gKGF1ZGlvQ29udGV4dC5iYXNlTGF0ZW5jeSB8fCAwKSAqIDEwMDA7XG4gICAgY29uc29sZS5sb2coYOKckyBBdWRpbyB1bmxvY2tlZCAoJHtsYXRlbmN5TXMudG9GaXhlZCgxKX1tcyBiYXNlIGxhdGVuY3kpYCk7XG4gICAgcmV0dXJuIHRydWU7XG4gICAgXG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHVubG9jayBhdWRpbzonLCBlcnJvcik7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbi8qKlxuICogQnVpbGQgdGhlIGF1ZGlvIHByb2Nlc3NpbmcgZ3JhcGg6XG4gKiBWb2ljZSBQb29sIOKGkiBbRHJ5ICsgUmV2ZXJiXSDihpIgU29mdCBDbGlwIOKGkiBIaWdoIFNoZWxmIOKGkiBMaW1pdGVyIOKGkiBNYXN0ZXIg4oaSIE91dHB1dFxuICovXG5mdW5jdGlvbiBidWlsZEF1ZGlvR3JhcGgoKSB7XG4gIC8vIE1hc3RlciBnYWluXG4gIG1hc3RlckdhaW4gPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICBtYXN0ZXJHYWluLmdhaW4udmFsdWUgPSBDT05GSUcubWFzdGVyR2FpbjtcbiAgXG4gIC8vIExpbWl0ZXIgKGFnZ3Jlc3NpdmUgY2xpcCBwcmV2ZW50aW9uKVxuICBsaW1pdGVyID0gYXVkaW9Db250ZXh0LmNyZWF0ZUR5bmFtaWNzQ29tcHJlc3NvcigpO1xuICBsaW1pdGVyLnRocmVzaG9sZC52YWx1ZSA9IC0xMjtcbiAgbGltaXRlci5rbmVlLnZhbHVlID0gMztcbiAgbGltaXRlci5yYXRpby52YWx1ZSA9IDIwO1xuICBsaW1pdGVyLmF0dGFjay52YWx1ZSA9IDAuMDAxO1xuICBsaW1pdGVyLnJlbGVhc2UudmFsdWUgPSAwLjA1O1xuXG4gIC8vIEhpZ2gtc2hlbGYgRVEgKHRhbWUgaGlnaHMpXG4gIGhpZ2hTaGVsZiA9IGF1ZGlvQ29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgaGlnaFNoZWxmLnR5cGUgPSAnaGlnaHNoZWxmJztcbiAgaGlnaFNoZWxmLmZyZXF1ZW5jeS52YWx1ZSA9IENPTkZJRy5oaWdoU2hlbGZGcmVxO1xuICBoaWdoU2hlbGYuZ2Fpbi52YWx1ZSA9IENPTkZJRy5oaWdoU2hlbGZHYWluO1xuICBoaWdoU2hlbGYuUS52YWx1ZSA9IDAuNztcblxuICAvLyBTb2Z0IGNsaXBwZXIgKGdlbnRsZSBzYXR1cmF0aW9uKVxuICBzYXR1cmF0b3IgPSBhdWRpb0NvbnRleHQuY3JlYXRlV2F2ZVNoYXBlcigpO1xuICBzYXR1cmF0b3IuY3VydmUgPSBtYWtlU29mdENsaXBDdXJ2ZSgwLjU1KTtcbiAgc2F0dXJhdG9yLm92ZXJzYW1wbGUgPSAnMngnO1xuICBcbiAgLy8gRHJ5L3dldCByb3V0aW5nIGZvciByZXZlcmJcbiAgZHJ5R2FpbiA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gIGRyeUdhaW4uZ2Fpbi52YWx1ZSA9IDEgLSBDT05GSUcucmV2ZXJiV2V0TWl4O1xuICBcbiAgd2V0R2FpbiA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gIHdldEdhaW4uZ2Fpbi52YWx1ZSA9IENPTkZJRy5yZXZlcmJXZXRNaXg7XG4gIFxuICAvLyBSZXZlcmIgKGFsZ29yaXRobWljIGRlbGF5IG5ldHdvcmspXG4gIHJldmVyYk5vZGUgPSBjcmVhdGVSZXZlcmJFZmZlY3QoKTtcbiAgY29uc3QgcmV2ZXJiT3V0ID0gcmV2ZXJiTm9kZS5fb3V0cHV0O1xuICBcbiAgLy8gQ29ubmVjdCBncmFwaFxuICBkcnlHYWluLmNvbm5lY3Qoc2F0dXJhdG9yKTtcbiAgd2V0R2Fpbi5jb25uZWN0KHJldmVyYk5vZGUpO1xuICByZXZlcmJPdXQuY29ubmVjdChzYXR1cmF0b3IpO1xuICBzYXR1cmF0b3IuY29ubmVjdChoaWdoU2hlbGYpO1xuICBoaWdoU2hlbGYuY29ubmVjdChsaW1pdGVyKTtcbiAgbGltaXRlci5jb25uZWN0KG1hc3RlckdhaW4pO1xuICBtYXN0ZXJHYWluLmNvbm5lY3QoYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcblxuICBlbnN1cmVXaGVlbEJ1cygpO1xuICBcbiAgLy8gSW5pdGlhbGl6ZSB2b2ljZSBwb29sXG4gIGluaXRWb2ljZVBvb2woKTtcbn1cblxuLyoqIENyZWF0ZSBhIGdlbnRsZSBzb2Z0LWNsaXBwaW5nIGN1cnZlICh0YW5oLXN0eWxlKSAqL1xuZnVuY3Rpb24gbWFrZVNvZnRDbGlwQ3VydmUoYW1vdW50ID0gMC41NSkge1xuICBjb25zdCBuID0gMTAyNDtcbiAgY29uc3QgY3VydmUgPSBuZXcgRmxvYXQzMkFycmF5KG4pO1xuICBjb25zdCBkcml2ZSA9IDEgKyBhbW91bnQgKiA4O1xuICBmb3IgKGxldCBpID0gMDsgaSA8IG47IGkrKykge1xuICAgIGNvbnN0IHggPSAoaSAqIDIpIC8gKG4gLSAxKSAtIDE7XG4gICAgY3VydmVbaV0gPSBNYXRoLnRhbmgoZHJpdmUgKiB4KSAvIE1hdGgudGFuaChkcml2ZSk7XG4gIH1cbiAgcmV0dXJuIGN1cnZlO1xufVxuXG4vKiogQ3JlYXRlIGFsZ29yaXRobWljIHJldmVyYiB1c2luZyBmZWVkYmFjayBkZWxheSBuZXR3b3JrICovXG5mdW5jdGlvbiBjcmVhdGVSZXZlcmJFZmZlY3QoKSB7XG4gIGNvbnN0IGlucHV0ID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgY29uc3Qgb3V0cHV0ID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgXG4gIGNvbnN0IGRlbGF5cyA9IFswLjAyOSwgMC4wMzcsIDAuMDUzLCAwLjA2N107XG4gIGNvbnN0IGZlZWRiYWNrR2FpbiA9IDAuNDtcbiAgXG4gIGNvbnN0IGRlbGF5Tm9kZXMgPSBkZWxheXMubWFwKHRpbWUgPT4ge1xuICAgIGNvbnN0IGRlbGF5ID0gYXVkaW9Db250ZXh0LmNyZWF0ZURlbGF5KDAuMSk7XG4gICAgZGVsYXkuZGVsYXlUaW1lLnZhbHVlID0gdGltZSAqIENPTkZJRy5yZXZlcmJEZWNheTtcbiAgICByZXR1cm4gZGVsYXk7XG4gIH0pO1xuICBcbiAgY29uc3QgZmVlZGJhY2tzID0gZGVsYXlOb2Rlcy5tYXAoKCkgPT4ge1xuICAgIGNvbnN0IGdhaW4gPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIGdhaW4uZ2Fpbi52YWx1ZSA9IGZlZWRiYWNrR2FpbjtcbiAgICByZXR1cm4gZ2FpbjtcbiAgfSk7XG4gIFxuICBjb25zdCBkYW1waW5nRmlsdGVyID0gYXVkaW9Db250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICBkYW1waW5nRmlsdGVyLnR5cGUgPSAnbG93cGFzcyc7XG4gIGRhbXBpbmdGaWx0ZXIuZnJlcXVlbmN5LnZhbHVlID0gMjAwMCAqICgxIC0gQ09ORklHLnJldmVyYkhpZ2hEYW1wKTtcbiAgZGFtcGluZ0ZpbHRlci5RLnZhbHVlID0gMC41O1xuICBcbiAgZGVsYXlOb2Rlcy5mb3JFYWNoKChkZWxheSwgaSkgPT4ge1xuICAgIGlucHV0LmNvbm5lY3QoZGVsYXkpO1xuICAgIGRlbGF5LmNvbm5lY3QoZmVlZGJhY2tzW2ldKTtcbiAgICBmZWVkYmFja3NbaV0uY29ubmVjdChkYW1waW5nRmlsdGVyKTtcbiAgICBmZWVkYmFja3NbaV0uY29ubmVjdChkZWxheU5vZGVzWyhpICsgMSkgJSBkZWxheU5vZGVzLmxlbmd0aF0pO1xuICB9KTtcbiAgXG4gIGRhbXBpbmdGaWx0ZXIuY29ubmVjdChvdXRwdXQpO1xuICBpbnB1dC5jb25uZWN0KG91dHB1dCk7XG4gIFxuICBpbnB1dC5fb3V0cHV0ID0gb3V0cHV0O1xuICByZXR1cm4gaW5wdXQ7XG59XG5cbi8qKiBJbml0aWFsaXplIHRoZSB2b2ljZSBwb29sIHdpdGggcHJlLWFsbG9jYXRlZCBhdWRpbyBub2RlcyAqL1xuZnVuY3Rpb24gaW5pdFZvaWNlUG9vbCgpIHtcbiAgdm9pY2VQb29sID0gW107XG4gIFxuICBmb3IgKGxldCBpID0gMDsgaSA8IFZPSUNFX1BPT0xfU0laRTsgaSsrKSB7XG4gICAgY29uc3Qgdm9pY2UgPSB7XG4gICAgICBpZDogaSxcbiAgICAgIGluVXNlOiBmYWxzZSxcbiAgICAgIHN0YXJ0VGltZTogMCxcbiAgICAgIC8vIFBlcnNpc3RlbnQgbm9kZXMgKHJldXNlZClcbiAgICAgIGZpbHRlcjogYXVkaW9Db250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpLFxuICAgICAgZW52ZWxvcGU6IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCksXG4gICAgICBwYW5uZXI6IGF1ZGlvQ29udGV4dC5jcmVhdGVTdGVyZW9QYW5uZXIoKSxcbiAgICAgIHJldmVyYlNlbmQ6IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCksXG4gICAgICBub2lzZUZpbHRlcjogYXVkaW9Db250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpLFxuICAgICAgbm9pc2VFbnZlbG9wZTogYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKSxcbiAgICAgIC8vIFBlci11c2Ugbm9kZXNcbiAgICAgIG9zYzogbnVsbCxcbiAgICAgIGhhcm1vbmljT3NjOiBudWxsLFxuICAgICAgc3BhcmtsZU9zYzogbnVsbCxcbiAgICAgIG5vaXNlU291cmNlOiBudWxsLFxuICAgIH07XG4gICAgXG4gICAgdm9pY2UuZmlsdGVyLnR5cGUgPSAnbG93cGFzcyc7XG4gICAgdm9pY2Uubm9pc2VGaWx0ZXIudHlwZSA9ICdiYW5kcGFzcyc7XG4gICAgdm9pY2Uubm9pc2VGaWx0ZXIuUS52YWx1ZSA9IDEuMjtcbiAgICBcbiAgICAvLyBDb25uZWN0IHBlcnNpc3RlbnQgY2hhaW5cbiAgICB2b2ljZS5maWx0ZXIuY29ubmVjdCh2b2ljZS5lbnZlbG9wZSk7XG4gICAgdm9pY2UuZW52ZWxvcGUuY29ubmVjdCh2b2ljZS5wYW5uZXIpO1xuICAgIHZvaWNlLnBhbm5lci5jb25uZWN0KGRyeUdhaW4pO1xuICAgIHZvaWNlLnBhbm5lci5jb25uZWN0KHZvaWNlLnJldmVyYlNlbmQpO1xuICAgIHZvaWNlLnJldmVyYlNlbmQuY29ubmVjdCh3ZXRHYWluKTtcbiAgICBcbiAgICB2b2ljZS5ub2lzZUZpbHRlci5jb25uZWN0KHZvaWNlLm5vaXNlRW52ZWxvcGUpO1xuICAgIHZvaWNlLm5vaXNlRW52ZWxvcGUuY29ubmVjdCh2b2ljZS5wYW5uZXIpO1xuICAgIFxuICAgIHZvaWNlUG9vbC5wdXNoKHZvaWNlKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBlbnN1cmVXaGVlbEJ1cygpIHtcbiAgaWYgKCFhdWRpb0NvbnRleHQpIHJldHVybjtcbiAgaWYgKCF3aGVlbEJ1cykge1xuICAgIHdoZWVsQnVzID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgICB3aGVlbEJ1cy5nYWluLnZhbHVlID0gMTtcbiAgfSBlbHNlIHtcbiAgICB0cnkgeyB3aGVlbEJ1cy5kaXNjb25uZWN0KCk7IH0gY2F0Y2ggKGUpIHt9XG4gIH1cbiAgaWYgKGxpbWl0ZXIpIHtcbiAgICB3aGVlbEJ1cy5jb25uZWN0KGxpbWl0ZXIpO1xuICB9IGVsc2Uge1xuICAgIHdoZWVsQnVzLmNvbm5lY3QoYXVkaW9Db250ZXh0LmRlc3RpbmF0aW9uKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVXaGVlbFRpY2tCdWZmZXIoKSB7XG4gIGlmICh3aGVlbFRpY2tCdWZmZXIgfHwgIWF1ZGlvQ29udGV4dCkgcmV0dXJuO1xuICBjb25zdCBzYW1wbGVSYXRlID0gYXVkaW9Db250ZXh0LnNhbXBsZVJhdGU7XG4gIGNvbnN0IGR1cmF0aW9uID0gMC4wMTg7XG4gIGNvbnN0IGxlbmd0aCA9IE1hdGguZmxvb3Ioc2FtcGxlUmF0ZSAqIGR1cmF0aW9uKTtcbiAgd2hlZWxUaWNrQnVmZmVyID0gYXVkaW9Db250ZXh0LmNyZWF0ZUJ1ZmZlcigxLCBsZW5ndGgsIHNhbXBsZVJhdGUpO1xuICBjb25zdCBkYXRhID0gd2hlZWxUaWNrQnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICBjb25zdCBub2lzZUVuZCA9IE1hdGgubWF4KDEsIE1hdGguZmxvb3Ioc2FtcGxlUmF0ZSAqIDAuMDAxOCkpO1xuICBjb25zdCBzaW5lRW5kID0gTWF0aC5tYXgobm9pc2VFbmQgKyAxLCBNYXRoLmZsb29yKHNhbXBsZVJhdGUgKiAwLjAwNjUpKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBub2lzZUVuZDsgaSsrKSB7XG4gICAgY29uc3QgZGVjYXkgPSBNYXRoLmV4cCgtaSAvIG5vaXNlRW5kICogNy41KTtcbiAgICBkYXRhW2ldID0gKE1hdGgucmFuZG9tKCkgKiAyIC0gMSkgKiBkZWNheTtcbiAgfVxuICBjb25zdCBmcmVxID0gMTQ4MDtcbiAgZm9yIChsZXQgaSA9IG5vaXNlRW5kOyBpIDwgc2luZUVuZDsgaSsrKSB7XG4gICAgY29uc3QgdCA9IGkgLyBzYW1wbGVSYXRlO1xuICAgIGNvbnN0IGVudiA9IDAuNDIgKiAoMSAtIChpIC0gbm9pc2VFbmQpIC8gKHNpbmVFbmQgLSBub2lzZUVuZCkpO1xuICAgIGRhdGFbaV0gPSBNYXRoLnNpbigyICogTWF0aC5QSSAqIGZyZXEgKiB0KSAqIGVudjtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVXaGVlbFN3aXNoQnVmZmVyKCkge1xuICBpZiAod2hlZWxTd2lzaEJ1ZmZlciB8fCAhYXVkaW9Db250ZXh0KSByZXR1cm47XG4gIGNvbnN0IHNhbXBsZVJhdGUgPSBhdWRpb0NvbnRleHQuc2FtcGxlUmF0ZTtcbiAgY29uc3QgZHVyYXRpb24gPSAwLjI4O1xuICBjb25zdCBsZW5ndGggPSBNYXRoLmZsb29yKHNhbXBsZVJhdGUgKiBkdXJhdGlvbik7XG4gIHdoZWVsU3dpc2hCdWZmZXIgPSBhdWRpb0NvbnRleHQuY3JlYXRlQnVmZmVyKDEsIGxlbmd0aCwgc2FtcGxlUmF0ZSk7XG4gIGNvbnN0IGRhdGEgPSB3aGVlbFN3aXNoQnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgdCA9IGkgLyBsZW5ndGg7XG4gICAgY29uc3QgZW52ID0gdCA8IDAuMDggPyB0IC8gMC4wOCA6ICh0ID4gMC45MiA/ICgxIC0gdCkgLyAwLjA4IDogMSk7XG4gICAgZGF0YVtpXSA9IChNYXRoLnJhbmRvbSgpICogMiAtIDEpICogZW52ICogMC42O1xuICB9XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVdoZWVsV2hvb3NoQnVmZmVyKCkge1xuICBpZiAod2hlZWxXaG9vc2hCdWZmZXIgfHwgIWF1ZGlvQ29udGV4dCkgcmV0dXJuO1xuICBjb25zdCBzYW1wbGVSYXRlID0gYXVkaW9Db250ZXh0LnNhbXBsZVJhdGU7XG4gIGNvbnN0IGR1cmF0aW9uID0gMC4xMjtcbiAgY29uc3QgbGVuZ3RoID0gTWF0aC5mbG9vcihzYW1wbGVSYXRlICogZHVyYXRpb24pO1xuICB3aGVlbFdob29zaEJ1ZmZlciA9IGF1ZGlvQ29udGV4dC5jcmVhdGVCdWZmZXIoMSwgbGVuZ3RoLCBzYW1wbGVSYXRlKTtcbiAgY29uc3QgZGF0YSA9IHdoZWVsV2hvb3NoQnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICBmb3IgKGxldCBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3QgZGVjYXkgPSBNYXRoLmV4cCgtNC41ICogaSAvIGxlbmd0aCk7XG4gICAgZGF0YVtpXSA9IChNYXRoLnJhbmRvbSgpICogMiAtIDEpICogZGVjYXk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3RhcnRXaGVlbExvb3BzKCkge1xuICBpZiAoIWF1ZGlvQ29udGV4dCkgcmV0dXJuO1xuICBpZiAod2hlZWxUaWNrU291cmNlICYmIHdoZWVsU3dpc2hTb3VyY2UpIHJldHVybjtcbiAgZW5zdXJlV2hlZWxCdXMoKTtcbiAgY3JlYXRlV2hlZWxUaWNrQnVmZmVyKCk7XG4gIHdoZWVsVGlja1NvdXJjZSA9IGF1ZGlvQ29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgd2hlZWxUaWNrU291cmNlLmJ1ZmZlciA9IHdoZWVsVGlja0J1ZmZlcjtcbiAgd2hlZWxUaWNrU291cmNlLmxvb3AgPSB0cnVlO1xuICB3aGVlbFRpY2tHYWluID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgd2hlZWxUaWNrR2Fpbi5nYWluLnZhbHVlID0gMDtcbiAgd2hlZWxUaWNrRmlsdGVyID0gYXVkaW9Db250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICB3aGVlbFRpY2tGaWx0ZXIudHlwZSA9ICdoaWdocGFzcyc7XG4gIHdoZWVsVGlja0ZpbHRlci5mcmVxdWVuY3kudmFsdWUgPSA3MDA7XG4gIHdoZWVsVGlja1NvdXJjZS5jb25uZWN0KHdoZWVsVGlja0ZpbHRlcikuY29ubmVjdCh3aGVlbFRpY2tHYWluKS5jb25uZWN0KHdoZWVsQnVzKTtcbiAgd2hlZWxUaWNrU291cmNlLnN0YXJ0KCk7XG5cbiAgY3JlYXRlV2hlZWxTd2lzaEJ1ZmZlcigpO1xuICB3aGVlbFN3aXNoU291cmNlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICB3aGVlbFN3aXNoU291cmNlLmJ1ZmZlciA9IHdoZWVsU3dpc2hCdWZmZXI7XG4gIHdoZWVsU3dpc2hTb3VyY2UubG9vcCA9IHRydWU7XG4gIHdoZWVsU3dpc2hHYWluID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgd2hlZWxTd2lzaEdhaW4uZ2Fpbi52YWx1ZSA9IDA7XG4gIHdoZWVsU3dpc2hGaWx0ZXIgPSBhdWRpb0NvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gIHdoZWVsU3dpc2hGaWx0ZXIudHlwZSA9ICdiYW5kcGFzcyc7XG4gIHdoZWVsU3dpc2hGaWx0ZXIuZnJlcXVlbmN5LnZhbHVlID0gV0hFRUxfU0ZYX0NPTkZJRy5zd2lzaE1pbkh6O1xuICB3aGVlbFN3aXNoRmlsdGVyLlEudmFsdWUgPSAwLjg7XG4gIHdoZWVsU3dpc2hTb3VyY2UuY29ubmVjdCh3aGVlbFN3aXNoRmlsdGVyKS5jb25uZWN0KHdoZWVsU3dpc2hHYWluKS5jb25uZWN0KHdoZWVsQnVzKTtcbiAgd2hlZWxTd2lzaFNvdXJjZS5zdGFydCgpO1xufVxuXG5mdW5jdGlvbiBzdG9wV2hlZWxMb29wcygpIHtcbiAgaWYgKHdoZWVsU3RvcFRpbWVyKSB7XG4gICAgY2xlYXJUaW1lb3V0KHdoZWVsU3RvcFRpbWVyKTtcbiAgICB3aGVlbFN0b3BUaW1lciA9IG51bGw7XG4gIH1cbiAgaWYgKHdoZWVsVGlja1NvdXJjZSkge1xuICAgIHRyeSB7IHdoZWVsVGlja1NvdXJjZS5zdG9wKCk7IH0gY2F0Y2ggKGUpIHt9XG4gICAgd2hlZWxUaWNrU291cmNlLmRpc2Nvbm5lY3QoKTtcbiAgICB3aGVlbFRpY2tHYWluLmRpc2Nvbm5lY3QoKTtcbiAgICB3aGVlbFRpY2tGaWx0ZXIuZGlzY29ubmVjdCgpO1xuICAgIHdoZWVsVGlja1NvdXJjZSA9IHdoZWVsVGlja0dhaW4gPSB3aGVlbFRpY2tGaWx0ZXIgPSBudWxsO1xuICB9XG4gIGlmICh3aGVlbFN3aXNoU291cmNlKSB7XG4gICAgdHJ5IHsgd2hlZWxTd2lzaFNvdXJjZS5zdG9wKCk7IH0gY2F0Y2ggKGUpIHt9XG4gICAgd2hlZWxTd2lzaFNvdXJjZS5kaXNjb25uZWN0KCk7XG4gICAgd2hlZWxTd2lzaEdhaW4uZGlzY29ubmVjdCgpO1xuICAgIHdoZWVsU3dpc2hGaWx0ZXIuZGlzY29ubmVjdCgpO1xuICAgIHdoZWVsU3dpc2hTb3VyY2UgPSB3aGVlbFN3aXNoR2FpbiA9IHdoZWVsU3dpc2hGaWx0ZXIgPSBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIHBsYXlXaGVlbENsaWNrKGdhaW4sIGZpbHRlckh6KSB7XG4gIGlmICghaXNFbmFibGVkIHx8ICFpc1VubG9ja2VkIHx8ICFhdWRpb0NvbnRleHQgfHwgcHJlZmVyc1JlZHVjZWRNb3Rpb24pIHJldHVybjtcbiAgZW5zdXJlV2hlZWxCdXMoKTtcbiAgY3JlYXRlV2hlZWxUaWNrQnVmZmVyKCk7XG4gIGNvbnN0IHNyYyA9IGF1ZGlvQ29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgc3JjLmJ1ZmZlciA9IHdoZWVsVGlja0J1ZmZlcjtcbiAgY29uc3QgZyA9IGF1ZGlvQ29udGV4dC5jcmVhdGVHYWluKCk7XG4gIGcuZ2Fpbi52YWx1ZSA9IGdhaW47XG4gIGNvbnN0IGhwID0gYXVkaW9Db250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICBocC50eXBlID0gJ2hpZ2hwYXNzJztcbiAgaHAuZnJlcXVlbmN5LnZhbHVlID0gNjUwO1xuICBjb25zdCBscCA9IGF1ZGlvQ29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgbHAudHlwZSA9ICdsb3dwYXNzJztcbiAgbHAuZnJlcXVlbmN5LnZhbHVlID0gZmlsdGVySHo7XG4gIHNyYy5jb25uZWN0KGhwKS5jb25uZWN0KGxwKS5jb25uZWN0KGcpLmNvbm5lY3Qod2hlZWxCdXMpO1xuICBzcmMuc3RhcnQoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBsYXlEZXRlbnRDbGljayh7IGdhaW4gPSAwLjA1LCBmaWx0ZXJIeiA9IDMyMDAgfSA9IHt9KSB7XG4gIHJlY29yZFNvdW5kRGVidWdFdmVudCgnZGV0ZW50LXBsYXliYWNrJywgJ3NvdW5kLWVuZ2luZTpkZXRlbnQnLCB7IGdhaW4sIGZpbHRlckh6IH0pO1xuICBwbGF5V2hlZWxDbGljayhnYWluLCBmaWx0ZXJIeik7XG59XG5cbmZ1bmN0aW9uIHBsYXlXaGVlbFdob29zaChnYWluLCBmaWx0ZXJIeikge1xuICBpZiAoIWlzRW5hYmxlZCB8fCAhaXNVbmxvY2tlZCB8fCAhYXVkaW9Db250ZXh0IHx8IHByZWZlcnNSZWR1Y2VkTW90aW9uKSByZXR1cm47XG4gIGVuc3VyZVdoZWVsQnVzKCk7XG4gIGNyZWF0ZVdoZWVsV2hvb3NoQnVmZmVyKCk7XG4gIGNvbnN0IHNyYyA9IGF1ZGlvQ29udGV4dC5jcmVhdGVCdWZmZXJTb3VyY2UoKTtcbiAgc3JjLmJ1ZmZlciA9IHdoZWVsV2hvb3NoQnVmZmVyO1xuICBjb25zdCBnID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgZy5nYWluLnZhbHVlID0gZ2FpbjtcbiAgY29uc3QgYnAgPSBhdWRpb0NvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gIGJwLnR5cGUgPSAnYmFuZHBhc3MnO1xuICBicC5mcmVxdWVuY3kudmFsdWUgPSBmaWx0ZXJIejtcbiAgYnAuUS52YWx1ZSA9IDAuOTtcbiAgc3JjLmNvbm5lY3QoYnApLmNvbm5lY3QoZykuY29ubmVjdCh3aGVlbEJ1cyk7XG4gIHNyYy5zdGFydCgpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlV2hlZWxTZngodmVsb2NpdHlQeFBlclNlYyA9IDApIHtcbiAgaWYgKCFpc0VuYWJsZWQgfHwgIWlzVW5sb2NrZWQgfHwgIWF1ZGlvQ29udGV4dCB8fCBwcmVmZXJzUmVkdWNlZE1vdGlvbikge1xuICAgIHN0b3BXaGVlbExvb3BzKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGlmICghV0hFRUxfU0ZYX0NPTkZJRy5jb250aW51b3VzRW5hYmxlZCkge1xuICAgIHN0b3BXaGVlbExvb3BzKCk7XG4gICAgcmV0dXJuO1xuICB9XG4gIGNvbnN0IHNwZWVkID0gTWF0aC5hYnModmVsb2NpdHlQeFBlclNlYyk7XG4gIGlmICghTnVtYmVyLmlzRmluaXRlKHNwZWVkKSkgcmV0dXJuO1xuXG4gIGlmIChzcGVlZCA8IFdIRUVMX1NGWF9DT05GSUcudGlja01pblZlbG9jaXR5KSB7XG4gICAgaWYgKHdoZWVsVGlja0dhaW4pIHtcbiAgICAgIGNvbnN0IG5vdyA9IGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZTtcbiAgICAgIHdoZWVsVGlja0dhaW4uZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoMCwgbm93LCAwLjA1KTtcbiAgICB9XG4gICAgaWYgKHdoZWVsU3dpc2hHYWluKSB7XG4gICAgICBjb25zdCBub3cgPSBhdWRpb0NvbnRleHQuY3VycmVudFRpbWU7XG4gICAgICB3aGVlbFN3aXNoR2Fpbi5nYWluLnNldFRhcmdldEF0VGltZSgwLCBub3csIDAuMDgpO1xuICAgIH1cbiAgICBpZiAoIXdoZWVsU3RvcFRpbWVyKSB7XG4gICAgICB3aGVlbFN0b3BUaW1lciA9IHNldFRpbWVvdXQoc3RvcFdoZWVsTG9vcHMsIFdIRUVMX1NGWF9DT05GSUcuc3RvcERlbGF5TXMpO1xuICAgIH1cbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAod2hlZWxTdG9wVGltZXIpIHtcbiAgICBjbGVhclRpbWVvdXQod2hlZWxTdG9wVGltZXIpO1xuICAgIHdoZWVsU3RvcFRpbWVyID0gbnVsbDtcbiAgfVxuXG4gIHN0YXJ0V2hlZWxMb29wcygpO1xuICBjb25zdCBub3cgPSBhdWRpb0NvbnRleHQuY3VycmVudFRpbWU7XG4gIGNvbnN0IHRpY2tOb3JtID0gY2xhbXAoXG4gICAgKHNwZWVkIC0gV0hFRUxfU0ZYX0NPTkZJRy50aWNrTWluVmVsb2NpdHkpIC9cbiAgICAgIChXSEVFTF9TRlhfQ09ORklHLnRpY2tNYXhWZWxvY2l0eSAtIFdIRUVMX1NGWF9DT05GSUcudGlja01pblZlbG9jaXR5KSxcbiAgICAwLFxuICAgIDFcbiAgKTtcbiAgY29uc3QgdGlja1JhdGUgPSBXSEVFTF9TRlhfQ09ORklHLnRpY2tNaW5SYXRlICtcbiAgICAoKFdIRUVMX1NGWF9DT05GSUcudGlja01heFJhdGUgLSBXSEVFTF9TRlhfQ09ORklHLnRpY2tNaW5SYXRlKSAqIHRpY2tOb3JtKTtcbiAgaWYgKHdoZWVsVGlja1NvdXJjZSkge1xuICAgIHdoZWVsVGlja1NvdXJjZS5wbGF5YmFja1JhdGUuc2V0VGFyZ2V0QXRUaW1lKHRpY2tSYXRlLCBub3csIDAuMDQpO1xuICB9XG4gIGlmICh3aGVlbFRpY2tHYWluKSB7XG4gICAgY29uc3QgbXVsID0gTnVtYmVyLmlzRmluaXRlKFdIRUVMX1NGWF9DT05GSUcudGlja0dhaW5NdWwpID8gV0hFRUxfU0ZYX0NPTkZJRy50aWNrR2Fpbk11bCA6IDEuMDtcbiAgICBjb25zdCBnYWluID0gKFdIRUVMX1NGWF9DT05GSUcudGlja0Jhc2VHYWluICogKDAuMzUgKyB0aWNrTm9ybSAqIDAuNzUpKSAqIE1hdGgubWF4KDAsIG11bCk7XG4gICAgd2hlZWxUaWNrR2Fpbi5nYWluLnNldFRhcmdldEF0VGltZShnYWluLCBub3csIDAuMDUpO1xuICB9XG5cbiAgY29uc3Qgc3dpc2hOb3JtID0gY2xhbXAoXG4gICAgKHNwZWVkIC0gV0hFRUxfU0ZYX0NPTkZJRy5zd2lzaE1pblZlbG9jaXR5KSAvXG4gICAgICAoV0hFRUxfU0ZYX0NPTkZJRy5zd2lzaE1heFZlbG9jaXR5IC0gV0hFRUxfU0ZYX0NPTkZJRy5zd2lzaE1pblZlbG9jaXR5KSxcbiAgICAwLFxuICAgIDFcbiAgKTtcbiAgaWYgKHdoZWVsU3dpc2hHYWluKSB7XG4gICAgY29uc3QgbXVsID0gTnVtYmVyLmlzRmluaXRlKFdIRUVMX1NGWF9DT05GSUcuc3dpc2hHYWluTXVsKSA/IFdIRUVMX1NGWF9DT05GSUcuc3dpc2hHYWluTXVsIDogMS4wO1xuICAgIGNvbnN0IGdhaW4gPSAoV0hFRUxfU0ZYX0NPTkZJRy5zd2lzaEJhc2VHYWluICogTWF0aC5wb3coc3dpc2hOb3JtLCAxLjQpKSAqIE1hdGgubWF4KDAsIG11bCk7XG4gICAgd2hlZWxTd2lzaEdhaW4uZ2Fpbi5zZXRUYXJnZXRBdFRpbWUoZ2Fpbiwgbm93LCAwLjA4KTtcbiAgfVxuICBpZiAod2hlZWxTd2lzaEZpbHRlcikge1xuICAgIGNvbnN0IGZyZXEgPSBXSEVFTF9TRlhfQ09ORklHLnN3aXNoTWluSHogK1xuICAgICAgKChXSEVFTF9TRlhfQ09ORklHLnN3aXNoTWF4SHogLSBXSEVFTF9TRlhfQ09ORklHLnN3aXNoTWluSHopICogc3dpc2hOb3JtKTtcbiAgICB3aGVlbFN3aXNoRmlsdGVyLmZyZXF1ZW5jeS5zZXRUYXJnZXRBdFRpbWUoZnJlcSwgbm93LCAwLjA4KTtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gcGxheVdoZWVsU25hcCgpIHtcbiAgcGxheVdoZWVsQ2xpY2soV0hFRUxfU0ZYX0NPTkZJRy5zbmFwR2FpbiwgMTYwMCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwbGF5V2hlZWxDZW50ZXJDbGljaygpIHtcbiAgcGxheVdoZWVsQ2xpY2soV0hFRUxfU0ZYX0NPTkZJRy5jZW50ZXJHYWluLCBXSEVFTF9TRlhfQ09ORklHLmNlbnRlckZpbHRlckh6IHx8IDE2MDApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGxheVdoZWVsT3BlbigpIHtcbiAgcGxheVdoZWVsQ2xpY2soV0hFRUxfU0ZYX0NPTkZJRy5vcGVuR2FpbiwgV0hFRUxfU0ZYX0NPTkZJRy5vcGVuRmlsdGVySHogfHwgMTgwMCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwbGF5V2hlZWxDbG9zZSgpIHtcbiAgcGxheVdoZWVsQ2xpY2soV0hFRUxfU0ZYX0NPTkZJRy5jbG9zZUdhaW4sIFdIRUVMX1NGWF9DT05GSUcuY2xvc2VGaWx0ZXJIeiB8fCAxNjAwKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBsYXlIb3ZlclNvdW5kKCkge1xuICBpZiAoIWlzRW5hYmxlZCB8fCAhaXNVbmxvY2tlZCB8fCAhYXVkaW9Db250ZXh0IHx8IHByZWZlcnNSZWR1Y2VkTW90aW9uKSByZXR1cm47XG4gIHJlY29yZFNvdW5kRGVidWdFdmVudCgnaG92ZXItcGxheWJhY2snLCAnc291bmQtZW5naW5lOmhvdmVyJywge1xuICAgIGdhaW46IDAuMDM0LFxuICAgIGZpbHRlckh6OiAzMDAwLFxuICAgIGNoYXJhY3RlcjogJ3F1aWV0LXdoZWVsLWRldGVudCcsXG4gIH0pO1xuICBwbGF5V2hlZWxDbGljaygwLjAzNCwgMzAwMCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwbGF5QnV0dG9uUHJlc3NTb3VuZCgpIHtcbiAgaWYgKCFpc0VuYWJsZWQgfHwgIWlzVW5sb2NrZWQgfHwgIWF1ZGlvQ29udGV4dCB8fCBwcmVmZXJzUmVkdWNlZE1vdGlvbikgcmV0dXJuO1xuICByZWNvcmRTb3VuZERlYnVnRXZlbnQoJ2J1dHRvbi1wcmVzcy1wbGF5YmFjaycsICdzb3VuZC1lbmdpbmU6YnV0dG9uLXByZXNzJywgeyBnYWluOiAwLjA5OSwgZmlsdGVySHo6IDIyMDAgfSk7XG4gIHBsYXlXaGVlbENsaWNrKDAuMDk5LCAyMjAwKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBsYXlTb3VuZEVuYWJsZWRNb3RpZigpIHtcbiAgaWYgKCFpc0VuYWJsZWQgfHwgIWlzVW5sb2NrZWQgfHwgIWF1ZGlvQ29udGV4dCB8fCBwcmVmZXJzUmVkdWNlZE1vdGlvbikgcmV0dXJuO1xuICBlbnN1cmVXaGVlbEJ1cygpO1xuXG4gIGNvbnN0IG5vdyA9IGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZTtcbiAgY29uc3Qgbm90ZXMgPSBbXG4gICAgeyBmcmVxdWVuY3k6IDUyMy4yNSwgb2Zmc2V0OiAwLjAwMCwgZ2FpbjogMC4wMjggfSxcbiAgICB7IGZyZXF1ZW5jeTogNjU5LjI1LCBvZmZzZXQ6IDAuMDc1LCBnYWluOiAwLjAyNCB9LFxuICAgIHsgZnJlcXVlbmN5OiA3ODMuOTksIG9mZnNldDogMC4xNTAsIGdhaW46IDAuMDIxIH0sXG4gIF07XG5cbiAgcmVjb3JkU291bmREZWJ1Z0V2ZW50KCdzb3VuZC1lbmFibGVkLW1vdGlmJywgJ3NvdW5kLWVuZ2luZTpzb3VuZC1lbmFibGVkLW1vdGlmJywge1xuICAgIG5vdGVDb3VudDogbm90ZXMubGVuZ3RoLFxuICAgIGZyZXF1ZW5jaWVzOiBub3Rlcy5tYXAoKG5vdGUpID0+IG5vdGUuZnJlcXVlbmN5KSxcbiAgfSk7XG5cbiAgZm9yIChjb25zdCBub3RlIG9mIG5vdGVzKSB7XG4gICAgY29uc3Qgc3RhcnQgPSBub3cgKyBub3RlLm9mZnNldDtcbiAgICBjb25zdCBkdXJhdGlvbiA9IDAuMTU1O1xuICAgIGNvbnN0IHN0b3AgPSBzdGFydCArIGR1cmF0aW9uICsgMC4wMztcbiAgICBjb25zdCBvc2MgPSBhdWRpb0NvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgIGNvbnN0IGdhaW4gPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIGNvbnN0IGZpbHRlciA9IGF1ZGlvQ29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcblxuICAgIG9zYy50eXBlID0gJ3RyaWFuZ2xlJztcbiAgICBvc2MuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKG5vdGUuZnJlcXVlbmN5LCBzdGFydCk7XG4gICAgb3NjLmRldHVuZS5zZXRWYWx1ZUF0VGltZSgoTWF0aC5yYW5kb20oKSAtIDAuNSkgKiA4LCBzdGFydCk7XG5cbiAgICBmaWx0ZXIudHlwZSA9ICdsb3dwYXNzJztcbiAgICBmaWx0ZXIuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKDI4MDAsIHN0YXJ0KTtcbiAgICBmaWx0ZXIuUS5zZXRWYWx1ZUF0VGltZSgwLjQ1LCBzdGFydCk7XG5cbiAgICBnYWluLmdhaW4uc2V0VmFsdWVBdFRpbWUoMC4wMDAxLCBzdGFydCk7XG4gICAgZ2Fpbi5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUobm90ZS5nYWluLCBzdGFydCArIDAuMDEyKTtcbiAgICBnYWluLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAwMDEsIHN0YXJ0ICsgZHVyYXRpb24pO1xuXG4gICAgb3NjLmNvbm5lY3QoZmlsdGVyKS5jb25uZWN0KGdhaW4pLmNvbm5lY3Qod2hlZWxCdXMpO1xuICAgIG9zYy5vbmVuZGVkID0gKCkgPT4ge1xuICAgICAgdHJ5IHsgb3NjLmRpc2Nvbm5lY3QoKTsgfSBjYXRjaCAoZSkge31cbiAgICAgIHRyeSB7IGZpbHRlci5kaXNjb25uZWN0KCk7IH0gY2F0Y2ggKGUpIHt9XG4gICAgICB0cnkgeyBnYWluLmRpc2Nvbm5lY3QoKTsgfSBjYXRjaCAoZSkge31cbiAgICB9O1xuICAgIG9zYy5zdGFydChzdGFydCk7XG4gICAgb3NjLnN0b3Aoc3RvcCk7XG4gIH1cbn1cblxuZnVuY3Rpb24gc3RvcENvbnRhY3RSaXBwbGVNb3RpZigpIHtcbiAgZm9yIChjb25zdCB2b2ljZSBvZiBjb250YWN0TW90aWZWb2ljZXMpIHtcbiAgICBmb3IgKGNvbnN0IG9zY2lsbGF0b3Igb2Ygdm9pY2Uub3NjaWxsYXRvcnMpIHtcbiAgICAgIHRyeSB7IG9zY2lsbGF0b3Iuc3RvcCgpOyB9IGNhdGNoIChlKSB7fVxuICAgIH1cbiAgICBmb3IgKGNvbnN0IG5vZGUgb2Ygdm9pY2Uubm9kZXMpIHtcbiAgICAgIHRyeSB7IG5vZGUuZGlzY29ubmVjdCgpOyB9IGNhdGNoIChlKSB7fVxuICAgIH1cbiAgfVxuICBjb250YWN0TW90aWZWb2ljZXMuY2xlYXIoKTtcbn1cblxuZnVuY3Rpb24gcmVnaXN0ZXJDb250YWN0TW90aWZWb2ljZSh7IHNvdXJjZXMsIG5vZGVzLCBwcmltYXJ5ID0gc291cmNlc1swXSB9KSB7XG4gIGNvbnN0IHZvaWNlID0geyBvc2NpbGxhdG9yczogc291cmNlcywgbm9kZXMgfTtcbiAgY29udGFjdE1vdGlmVm9pY2VzLmFkZCh2b2ljZSk7XG4gIGlmIChwcmltYXJ5KSB7XG4gICAgcHJpbWFyeS5vbmVuZGVkID0gKCkgPT4ge1xuICAgICAgaWYgKCFjb250YWN0TW90aWZWb2ljZXMuZGVsZXRlKHZvaWNlKSkgcmV0dXJuO1xuICAgICAgZm9yIChjb25zdCBub2RlIG9mIHZvaWNlLm5vZGVzKSB7XG4gICAgICAgIHRyeSB7IG5vZGUuZGlzY29ubmVjdCgpOyB9IGNhdGNoIChlKSB7fVxuICAgICAgfVxuICAgIH07XG4gIH1cbiAgcmV0dXJuIHZvaWNlO1xufVxuXG5mdW5jdGlvbiBzY2hlZHVsZUNvbnRhY3RQcmVzc3VyZVNuYXAoe1xuICBvZmZzZXQsXG4gIGR1cmF0aW9uLFxuICBnYWluOiBwZWFrR2FpbixcbiAgcGFuID0gMCxcbiAgZmlsdGVyU3RhcnQgPSAzNjAwLFxuICBmaWx0ZXJFbmQgPSAxODAwLFxufSkge1xuICBjb25zdCBzdGFydCA9IGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZSArIG9mZnNldDtcbiAgY29uc3Qgc3RvcCA9IHN0YXJ0ICsgZHVyYXRpb24gKyAwLjAyNTtcbiAgY29uc3Qgbm9pc2UgPSBjcmVhdGVUcmFuc2llbnROb2lzZSgpO1xuICBjb25zdCBmaWx0ZXIgPSBhdWRpb0NvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gIGNvbnN0IGVudmVsb3BlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgY29uc3QgcGFubmVyID0gdHlwZW9mIGF1ZGlvQ29udGV4dC5jcmVhdGVTdGVyZW9QYW5uZXIgPT09ICdmdW5jdGlvbidcbiAgICA/IGF1ZGlvQ29udGV4dC5jcmVhdGVTdGVyZW9QYW5uZXIoKVxuICAgIDogbnVsbDtcblxuICBmaWx0ZXIudHlwZSA9ICdiYW5kcGFzcyc7XG4gIGZpbHRlci5mcmVxdWVuY3kuc2V0VmFsdWVBdFRpbWUoZmlsdGVyU3RhcnQsIHN0YXJ0KTtcbiAgZmlsdGVyLmZyZXF1ZW5jeS5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKGZpbHRlckVuZCwgc3RhcnQgKyBkdXJhdGlvbik7XG4gIGZpbHRlci5RLnNldFZhbHVlQXRUaW1lKDMuNCwgc3RhcnQpO1xuXG4gIGVudmVsb3BlLmdhaW4uc2V0VmFsdWVBdFRpbWUoMC4wMDAxLCBzdGFydCk7XG4gIGVudmVsb3BlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZShwZWFrR2Fpbiwgc3RhcnQgKyAwLjAwMyk7XG4gIGVudmVsb3BlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAwMDEsIHN0YXJ0ICsgZHVyYXRpb24pO1xuICBpZiAocGFubmVyKSBwYW5uZXIucGFuLnNldFZhbHVlQXRUaW1lKHBhbiwgc3RhcnQpO1xuXG4gIG5vaXNlLmNvbm5lY3QoZmlsdGVyKS5jb25uZWN0KGVudmVsb3BlKTtcbiAgY29uc3Qgb3V0cHV0ID0gcGFubmVyID8gZW52ZWxvcGUuY29ubmVjdChwYW5uZXIpIDogZW52ZWxvcGU7XG4gIG91dHB1dC5jb25uZWN0KGRyeUdhaW4pO1xuICBvdXRwdXQuY29ubmVjdCh3ZXRHYWluKTtcblxuICByZWdpc3RlckNvbnRhY3RNb3RpZlZvaWNlKHtcbiAgICBzb3VyY2VzOiBbbm9pc2VdLFxuICAgIG5vZGVzOiBbbm9pc2UsIGZpbHRlciwgZW52ZWxvcGUsIC4uLihwYW5uZXIgPyBbcGFubmVyXSA6IFtdKV0sXG4gICAgcHJpbWFyeTogbm9pc2UsXG4gIH0pO1xuICBub2lzZS5zdGFydChzdGFydCwgTWF0aC5yYW5kb20oKSAqIDEuMik7XG4gIG5vaXNlLnN0b3Aoc3RvcCk7XG59XG5cbmZ1bmN0aW9uIHNjaGVkdWxlQ29udGFjdFByZXNzdXJlVGh1bXAoe1xuICBvZmZzZXQsXG4gIGR1cmF0aW9uLFxuICBnYWluOiBwZWFrR2FpbixcbiAgcGFuID0gMCxcbiAgZnJlcXVlbmN5ID0gODIsXG4gIGZyZXF1ZW5jeUVuZCA9IDUyLFxuICBmaWx0ZXJTdGFydCA9IDUyMCxcbiAgZmlsdGVyRW5kID0gMjIwLFxuICByZWxlYXNlID0gMC4xOCxcbn0pIHtcbiAgY29uc3Qgc3RhcnQgPSBhdWRpb0NvbnRleHQuY3VycmVudFRpbWUgKyBvZmZzZXQ7XG4gIGNvbnN0IGVudmVsb3BlRW5kID0gc3RhcnQgKyBkdXJhdGlvbjtcbiAgY29uc3Qgc3RvcCA9IGVudmVsb3BlRW5kICsgcmVsZWFzZSArIDAuMDU7XG4gIGNvbnN0IG9zY2lsbGF0b3IgPSBhdWRpb0NvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICBjb25zdCBmaWx0ZXIgPSBhdWRpb0NvbnRleHQuY3JlYXRlQmlxdWFkRmlsdGVyKCk7XG4gIGNvbnN0IGVudmVsb3BlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgY29uc3QgcGFubmVyID0gdHlwZW9mIGF1ZGlvQ29udGV4dC5jcmVhdGVTdGVyZW9QYW5uZXIgPT09ICdmdW5jdGlvbidcbiAgICA/IGF1ZGlvQ29udGV4dC5jcmVhdGVTdGVyZW9QYW5uZXIoKVxuICAgIDogbnVsbDtcblxuICBvc2NpbGxhdG9yLnR5cGUgPSAnc2luZSc7XG4gIG9zY2lsbGF0b3IuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKGZyZXF1ZW5jeSwgc3RhcnQpO1xuICBvc2NpbGxhdG9yLmZyZXF1ZW5jeS5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKGZyZXF1ZW5jeUVuZCwgc3RhcnQgKyBNYXRoLm1pbihkdXJhdGlvbiwgMC4yNCkpO1xuXG4gIGZpbHRlci50eXBlID0gJ2xvd3Bhc3MnO1xuICBmaWx0ZXIuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKGZpbHRlclN0YXJ0LCBzdGFydCk7XG4gIGZpbHRlci5mcmVxdWVuY3kuZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZShmaWx0ZXJFbmQsIGVudmVsb3BlRW5kICsgcmVsZWFzZSk7XG4gIGZpbHRlci5RLnNldFZhbHVlQXRUaW1lKDAuNTQsIHN0YXJ0KTtcblxuICBlbnZlbG9wZS5nYWluLnNldFZhbHVlQXRUaW1lKDAuMDAwMSwgc3RhcnQpO1xuICBlbnZlbG9wZS5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUocGVha0dhaW4sIHN0YXJ0ICsgMC4wMTIpO1xuICBlbnZlbG9wZS5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoTWF0aC5tYXgoMC4wMDAyLCBwZWFrR2FpbiAqIDAuMTgpLCBlbnZlbG9wZUVuZCk7XG4gIGVudmVsb3BlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAwMDEsIGVudmVsb3BlRW5kICsgcmVsZWFzZSk7XG4gIGlmIChwYW5uZXIpIHBhbm5lci5wYW4uc2V0VmFsdWVBdFRpbWUocGFuLCBzdGFydCk7XG5cbiAgb3NjaWxsYXRvci5jb25uZWN0KGZpbHRlcikuY29ubmVjdChlbnZlbG9wZSk7XG4gIGNvbnN0IG91dHB1dCA9IHBhbm5lciA/IGVudmVsb3BlLmNvbm5lY3QocGFubmVyKSA6IGVudmVsb3BlO1xuICBvdXRwdXQuY29ubmVjdChkcnlHYWluKTtcbiAgb3V0cHV0LmNvbm5lY3Qod2V0R2Fpbik7XG5cbiAgcmVnaXN0ZXJDb250YWN0TW90aWZWb2ljZSh7XG4gICAgc291cmNlczogW29zY2lsbGF0b3JdLFxuICAgIG5vZGVzOiBbb3NjaWxsYXRvciwgZmlsdGVyLCBlbnZlbG9wZSwgLi4uKHBhbm5lciA/IFtwYW5uZXJdIDogW10pXSxcbiAgICBwcmltYXJ5OiBvc2NpbGxhdG9yLFxuICB9KTtcbiAgb3NjaWxsYXRvci5zdGFydChzdGFydCk7XG4gIG9zY2lsbGF0b3Iuc3RvcChzdG9wKTtcbn1cblxuZnVuY3Rpb24gc2NoZWR1bGVDb250YWN0UHJlc3N1cmVSaW5nKHtcbiAgb2Zmc2V0LFxuICBkdXJhdGlvbixcbiAgZ2FpbjogcGVha0dhaW4sXG4gIHBhbiA9IDAsXG4gIGZyZXF1ZW5jeSxcbiAgZnJlcXVlbmN5RW5kLFxuICBoYXJtb25pY0ZyZXF1ZW5jeSA9IG51bGwsXG4gIGhhcm1vbmljR2FpbiA9IDAsXG4gIGZpbHRlclN0YXJ0LFxuICBmaWx0ZXJFbmQsXG4gIG5vaXNlR2FpbiA9IDAuMDEyLFxuICByZWxlYXNlID0gMC4yMCxcbn0pIHtcbiAgY29uc3Qgc3RhcnQgPSBhdWRpb0NvbnRleHQuY3VycmVudFRpbWUgKyBvZmZzZXQ7XG4gIGNvbnN0IGVudmVsb3BlRW5kID0gc3RhcnQgKyBkdXJhdGlvbjtcbiAgY29uc3Qgc3RvcCA9IGVudmVsb3BlRW5kICsgcmVsZWFzZSArIDAuMDQ7XG4gIGNvbnN0IG9zY2lsbGF0b3IgPSBhdWRpb0NvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICBjb25zdCBoYXJtb25pYyA9IE51bWJlci5pc0Zpbml0ZShoYXJtb25pY0ZyZXF1ZW5jeSkgJiYgaGFybW9uaWNHYWluID4gMFxuICAgID8gYXVkaW9Db250ZXh0LmNyZWF0ZU9zY2lsbGF0b3IoKVxuICAgIDogbnVsbDtcbiAgY29uc3Qgbm9pc2UgPSBjcmVhdGVUcmFuc2llbnROb2lzZSgpO1xuICBjb25zdCB0b25lRmlsdGVyID0gYXVkaW9Db250ZXh0LmNyZWF0ZUJpcXVhZEZpbHRlcigpO1xuICBjb25zdCBub2lzZUZpbHRlciA9IGF1ZGlvQ29udGV4dC5jcmVhdGVCaXF1YWRGaWx0ZXIoKTtcbiAgY29uc3QgdG9uZUVudmVsb3BlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKTtcbiAgY29uc3QgaGFybW9uaWNHYWluTm9kZSA9IGhhcm1vbmljID8gYXVkaW9Db250ZXh0LmNyZWF0ZUdhaW4oKSA6IG51bGw7XG4gIGNvbnN0IG5vaXNlRW52ZWxvcGUgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICBjb25zdCBwYW5uZXIgPSB0eXBlb2YgYXVkaW9Db250ZXh0LmNyZWF0ZVN0ZXJlb1Bhbm5lciA9PT0gJ2Z1bmN0aW9uJ1xuICAgID8gYXVkaW9Db250ZXh0LmNyZWF0ZVN0ZXJlb1Bhbm5lcigpXG4gICAgOiBudWxsO1xuXG4gIG9zY2lsbGF0b3IudHlwZSA9ICd0cmlhbmdsZSc7XG4gIG9zY2lsbGF0b3IuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKGZyZXF1ZW5jeSwgc3RhcnQpO1xuICBvc2NpbGxhdG9yLmZyZXF1ZW5jeS5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKGZyZXF1ZW5jeUVuZCwgc3RhcnQgKyBNYXRoLm1pbihkdXJhdGlvbiAqIDAuNjIsIDAuMjgpKTtcbiAgaWYgKGhhcm1vbmljKSB7XG4gICAgaGFybW9uaWMudHlwZSA9ICdzaW5lJztcbiAgICBoYXJtb25pYy5mcmVxdWVuY3kuc2V0VmFsdWVBdFRpbWUoaGFybW9uaWNGcmVxdWVuY3ksIHN0YXJ0KTtcbiAgICBoYXJtb25pYy5mcmVxdWVuY3kuZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZShcbiAgICAgIE1hdGgubWF4KDgwLCBoYXJtb25pY0ZyZXF1ZW5jeSAqIDEuMDYpLFxuICAgICAgc3RhcnQgKyBNYXRoLm1pbihkdXJhdGlvbiAqIDAuNzIsIDAuMzYpLFxuICAgICk7XG4gICAgaGFybW9uaWNHYWluTm9kZS5nYWluLnNldFZhbHVlQXRUaW1lKGhhcm1vbmljR2Fpbiwgc3RhcnQpO1xuICAgIGhhcm1vbmljR2Fpbk5vZGUuZ2Fpbi5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKDAuMDAwMSwgZW52ZWxvcGVFbmQgKyByZWxlYXNlKTtcbiAgfVxuXG4gIHRvbmVGaWx0ZXIudHlwZSA9ICdiYW5kcGFzcyc7XG4gIHRvbmVGaWx0ZXIuZnJlcXVlbmN5LnNldFZhbHVlQXRUaW1lKGZpbHRlclN0YXJ0LCBzdGFydCk7XG4gIHRvbmVGaWx0ZXIuZnJlcXVlbmN5LmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoZmlsdGVyRW5kLCBlbnZlbG9wZUVuZCArIHJlbGVhc2UpO1xuICB0b25lRmlsdGVyLlEuc2V0VmFsdWVBdFRpbWUoMi4yLCBzdGFydCk7XG5cbiAgbm9pc2VGaWx0ZXIudHlwZSA9ICdiYW5kcGFzcyc7XG4gIG5vaXNlRmlsdGVyLmZyZXF1ZW5jeS5zZXRWYWx1ZUF0VGltZShmaWx0ZXJTdGFydCAqIDEuMzIsIHN0YXJ0KTtcbiAgbm9pc2VGaWx0ZXIuZnJlcXVlbmN5LmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoZmlsdGVyRW5kICogMC45MiwgZW52ZWxvcGVFbmQpO1xuICBub2lzZUZpbHRlci5RLnNldFZhbHVlQXRUaW1lKDEuNiwgc3RhcnQpO1xuXG4gIHRvbmVFbnZlbG9wZS5nYWluLnNldFZhbHVlQXRUaW1lKDAuMDAwMSwgc3RhcnQpO1xuICB0b25lRW52ZWxvcGUuZ2Fpbi5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKHBlYWtHYWluLCBzdGFydCArIDAuMDA2KTtcbiAgdG9uZUVudmVsb3BlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZShNYXRoLm1heCgwLjAwMDIsIHBlYWtHYWluICogMC4xNiksIGVudmVsb3BlRW5kKTtcbiAgdG9uZUVudmVsb3BlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAwMDEsIGVudmVsb3BlRW5kICsgcmVsZWFzZSk7XG5cbiAgbm9pc2VFbnZlbG9wZS5nYWluLnNldFZhbHVlQXRUaW1lKDAuMDAwMSwgc3RhcnQpO1xuICBub2lzZUVudmVsb3BlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZShub2lzZUdhaW4sIHN0YXJ0ICsgMC4wMDQpO1xuICBub2lzZUVudmVsb3BlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAwMDEsIHN0YXJ0ICsgTWF0aC5taW4oZHVyYXRpb24gKiAwLjU4LCAwLjEyKSk7XG4gIGlmIChwYW5uZXIpIHBhbm5lci5wYW4uc2V0VmFsdWVBdFRpbWUocGFuLCBzdGFydCk7XG5cbiAgb3NjaWxsYXRvci5jb25uZWN0KHRvbmVGaWx0ZXIpLmNvbm5lY3QodG9uZUVudmVsb3BlKTtcbiAgaWYgKGhhcm1vbmljICYmIGhhcm1vbmljR2Fpbk5vZGUpIGhhcm1vbmljLmNvbm5lY3QoaGFybW9uaWNHYWluTm9kZSkuY29ubmVjdCh0b25lRmlsdGVyKTtcbiAgbm9pc2UuY29ubmVjdChub2lzZUZpbHRlcikuY29ubmVjdChub2lzZUVudmVsb3BlKTtcbiAgY29uc3QgdG9uZU91dHB1dCA9IHBhbm5lciA/IHRvbmVFbnZlbG9wZS5jb25uZWN0KHBhbm5lcikgOiB0b25lRW52ZWxvcGU7XG4gIGNvbnN0IG5vaXNlT3V0cHV0ID0gcGFubmVyID8gbm9pc2VFbnZlbG9wZS5jb25uZWN0KHBhbm5lcikgOiBub2lzZUVudmVsb3BlO1xuICB0b25lT3V0cHV0LmNvbm5lY3QoZHJ5R2Fpbik7XG4gIHRvbmVPdXRwdXQuY29ubmVjdCh3ZXRHYWluKTtcbiAgbm9pc2VPdXRwdXQuY29ubmVjdChkcnlHYWluKTtcblxuICByZWdpc3RlckNvbnRhY3RNb3RpZlZvaWNlKHtcbiAgICBzb3VyY2VzOiBbb3NjaWxsYXRvciwgLi4uKGhhcm1vbmljID8gW2hhcm1vbmljXSA6IFtdKSwgbm9pc2VdLFxuICAgIG5vZGVzOiBbXG4gICAgICBvc2NpbGxhdG9yLFxuICAgICAgLi4uKGhhcm1vbmljID8gW2hhcm1vbmljLCBoYXJtb25pY0dhaW5Ob2RlXSA6IFtdKSxcbiAgICAgIG5vaXNlLFxuICAgICAgdG9uZUZpbHRlcixcbiAgICAgIG5vaXNlRmlsdGVyLFxuICAgICAgdG9uZUVudmVsb3BlLFxuICAgICAgbm9pc2VFbnZlbG9wZSxcbiAgICAgIC4uLihwYW5uZXIgPyBbcGFubmVyXSA6IFtdKSxcbiAgICBdLFxuICAgIHByaW1hcnk6IG9zY2lsbGF0b3IsXG4gIH0pO1xuICBvc2NpbGxhdG9yLnN0YXJ0KHN0YXJ0KTtcbiAgaGFybW9uaWM/LnN0YXJ0KHN0YXJ0KTtcbiAgbm9pc2Uuc3RhcnQoc3RhcnQsIE1hdGgucmFuZG9tKCkgKiAxLjIpO1xuICBvc2NpbGxhdG9yLnN0b3Aoc3RvcCk7XG4gIGhhcm1vbmljPy5zdG9wKHN0b3ApO1xuICBub2lzZS5zdG9wKHN0YXJ0ICsgTWF0aC5taW4oZHVyYXRpb24gKyAwLjAzLCAwLjE4KSk7XG59XG5cbi8qKlxuICogQ29udGFjdCBhY3RpdmF0aW9uIG1vdGlmOiBhIGJyaWdodCBsaWZ0ZWQgcmlwcGxlIHN5bmNlZCB0byB0aGUgdmlzaWJsZSB3YXZlLlxuICogVGhlIHByZXNzIHN0YXlzIHRhY3RpbGUgd2l0aG91dCBhIGJhc3MgZHJvcCwgdGhlbiBmaXZlIGFpcnkgcmluZyBwdWxzZXMgdHJhdmVsXG4gKiBvdXR3YXJkIGFuZCByZXNvbHZlIGludG8gYSBsb25nZXIgdXB3YXJkIHNoaW1tZXIgdGFpbC5cbiAqIFRoZSBmaXJzdCBDb250YWN0IGNsaWNrIG1heSB1bmxvY2sgYXVkaW87IGFuIGV4cGxpY2l0bHkgbXV0ZWQgZW5naW5lIHN0YXlzIHNpbGVudC5cbiAqL1xuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHBsYXlDb250YWN0UmlwcGxlTW90aWYoeyB1bmxvY2tJZk5lZWRlZCA9IGZhbHNlIH0gPSB7fSkge1xuICBpZiAoIWlzVW5sb2NrZWQgJiYgdW5sb2NrSWZOZWVkZWQpIHtcbiAgICBjb25zdCBkaWRVbmxvY2sgPSBhd2FpdCB1bmxvY2tBdWRpbygpO1xuICAgIGlmICghZGlkVW5sb2NrKSByZXR1cm4gZmFsc2U7XG4gIH1cbiAgaWYgKCFpc0VuYWJsZWQgfHwgIWlzVW5sb2NrZWQgfHwgIWF1ZGlvQ29udGV4dCB8fCBwcmVmZXJzUmVkdWNlZE1vdGlvbikgcmV0dXJuIGZhbHNlO1xuXG4gIHN0b3BDb250YWN0UmlwcGxlTW90aWYoKTtcbiAgY29uc3QgdmFyaWF0aW9uSW5kZXggPSBjb250YWN0TW90aWZWYXJpYXRpb25JbmRleDtcbiAgY29uc3QgdmFyaWF0aW9uID0gQ09OVEFDVF9SSVBQTEVfTU9USUZfVkFSSUFUSU9OU1t2YXJpYXRpb25JbmRleF07XG4gIGNvbnRhY3RNb3RpZlZhcmlhdGlvbkluZGV4ID0gKHZhcmlhdGlvbkluZGV4ICsgMSkgJSBDT05UQUNUX1JJUFBMRV9NT1RJRl9WQVJJQVRJT05TLmxlbmd0aDtcblxuICBjb25zdCByaW5nT2Zmc2V0cyA9IFswLjE0LCAwLjMxLCAwLjU0LCAwLjgzLCAxLjE4XS5tYXAoKG9mZnNldCkgPT4gKFxuICAgIE51bWJlcigob2Zmc2V0ICogdmFyaWF0aW9uLnJpbmdEZWxheVNjYWxlKS50b0ZpeGVkKDMpKVxuICApKTtcbiAgY29uc3QgYnJpZ2h0bmVzcyA9IHZhcmlhdGlvbi5icmlnaHRuZXNzO1xuICBjb25zdCBwcmVzc3VyZUdhaW4gPSB2YXJpYXRpb24ucHJlc3N1cmVHYWluO1xuICBjb25zdCBwcmVzc3VyZUV2ZW50cyA9IFtcbiAgICB7IGxhYmVsOiAncHJlc3Mtc25hcCcsIG9mZnNldDogMC4wMDAsIGR1cmF0aW9uOiAwLjAzNCB9LFxuICAgIHsgbGFiZWw6ICdsaWZ0ZWQtcHJlc3MtYm9keScsIG9mZnNldDogMC4wMTQsIGR1cmF0aW9uOiAwLjE0IH0sXG4gICAgeyBsYWJlbDogJ3Jpbmctb25lJywgb2Zmc2V0OiByaW5nT2Zmc2V0c1swXSwgZHVyYXRpb246IDAuMjAsIHJlbGVhc2U6IDAuMjQgfSxcbiAgICB7IGxhYmVsOiAncmluZy10d28nLCBvZmZzZXQ6IHJpbmdPZmZzZXRzWzFdLCBkdXJhdGlvbjogMC4yNiwgcmVsZWFzZTogMC4zMiB9LFxuICAgIHsgbGFiZWw6ICdyaW5nLXRocmVlJywgb2Zmc2V0OiByaW5nT2Zmc2V0c1syXSwgZHVyYXRpb246IDAuMzQsIHJlbGVhc2U6IDAuNDIgfSxcbiAgICB7IGxhYmVsOiAncmluZy1mb3VyJywgb2Zmc2V0OiByaW5nT2Zmc2V0c1szXSwgZHVyYXRpb246IDAuNDMsIHJlbGVhc2U6IDAuNTUgfSxcbiAgICB7IGxhYmVsOiAncmluZy1maXZlJywgb2Zmc2V0OiByaW5nT2Zmc2V0c1s0XSwgZHVyYXRpb246IDAuNTAsIHJlbGVhc2U6IDAuNTYgfSxcbiAgICB7IGxhYmVsOiAndXB3YXJkLWFpci10YWlsJywgb2Zmc2V0OiAxLjMyICogdmFyaWF0aW9uLnJpbmdEZWxheVNjYWxlLCBkdXJhdGlvbjogMC40OCwgcmVsZWFzZTogMC41OCB9LFxuICBdO1xuXG4gIHJlY29yZFNvdW5kRGVidWdFdmVudCgnY29udGFjdC1yaXBwbGUtbW90aWYnLCAnc291bmQtZW5naW5lOmNvbnRhY3QtcmlwcGxlLW1vdGlmJywge1xuICAgIGNoYXJhY3RlcjogJ2JyaWdodC1saWZ0LXJpcHBsZScsXG4gICAgbW90aWY6ICdzbmFwLWxpZnQtZml2ZS1yaW5ncy11cHdhcmQtYWlyLXRhaWwnLFxuICAgIGxheWVyQ291bnQ6IDQsXG4gICAgbm90ZUNvdW50OiBwcmVzc3VyZUV2ZW50cy5sZW5ndGgsXG4gICAgdmFyaWF0aW9uOiB2YXJpYXRpb24uaWQsXG4gICAgdmFyaWF0aW9uSW5kZXgsXG4gICAgdmFyaWF0aW9uQ291bnQ6IENPTlRBQ1RfUklQUExFX01PVElGX1ZBUklBVElPTlMubGVuZ3RoLFxuICAgIGdhaW5NdWx0aXBsaWVyOiBDT05UQUNUX1JJUFBMRV9NT1RJRl9HQUlOLFxuICAgIHJpbmdPZmZzZXRzTXM6IHJpbmdPZmZzZXRzLm1hcCgob2Zmc2V0KSA9PiBNYXRoLnJvdW5kKG9mZnNldCAqIDEwMDApKSxcbiAgICB0YWlsUmVsZWFzZU1zOiA1ODAsXG4gICAgZHVyYXRpb25NczogTWF0aC5yb3VuZChNYXRoLm1heCguLi5wcmVzc3VyZUV2ZW50cy5tYXAoKGV2ZW50KSA9PiAoXG4gICAgICBldmVudC5vZmZzZXQgKyBldmVudC5kdXJhdGlvbiArIChldmVudC5yZWxlYXNlID8/IDAuMzApXG4gICAgKSkpICogMTAwMCksXG4gICAgZnJlcXVlbmNpZXM6IFsxOTYsIDM5MiwgNDk0LCA1ODcsIDY1OSwgNzg0LCA5ODgsIDExNzVdLFxuICB9KTtcblxuICBzY2hlZHVsZUNvbnRhY3RQcmVzc3VyZVNuYXAoe1xuICAgIG9mZnNldDogMCxcbiAgICBkdXJhdGlvbjogMC4wMzQsXG4gICAgZ2FpbjogMC4wMTcgKiBwcmVzc3VyZUdhaW4gKiBDT05UQUNUX1JJUFBMRV9NT1RJRl9HQUlOLFxuICAgIGZpbHRlclN0YXJ0OiA1MjAwICogYnJpZ2h0bmVzcyxcbiAgICBmaWx0ZXJFbmQ6IDI2MDAgKiBicmlnaHRuZXNzLFxuICB9KTtcbiAgc2NoZWR1bGVDb250YWN0UHJlc3N1cmVUaHVtcCh7XG4gICAgb2Zmc2V0OiAwLjAxNCxcbiAgICBkdXJhdGlvbjogMC4xMixcbiAgICBnYWluOiAwLjAwNDggKiBwcmVzc3VyZUdhaW4gKiBDT05UQUNUX1JJUFBMRV9NT1RJRl9HQUlOLFxuICAgIGZyZXF1ZW5jeTogMTk2LFxuICAgIGZyZXF1ZW5jeUVuZDogMjQ3LFxuICAgIGZpbHRlclN0YXJ0OiAyNjAwICogYnJpZ2h0bmVzcyxcbiAgICBmaWx0ZXJFbmQ6IDE0NTAgKiBicmlnaHRuZXNzLFxuICAgIHJlbGVhc2U6IDAuMDgsXG4gIH0pO1xuICBzY2hlZHVsZUNvbnRhY3RQcmVzc3VyZVJpbmcoe1xuICAgIG9mZnNldDogcmluZ09mZnNldHNbMF0sXG4gICAgZHVyYXRpb246IDAuMjAsXG4gICAgZ2FpbjogMC4wMTI4ICogcHJlc3N1cmVHYWluICogQ09OVEFDVF9SSVBQTEVfTU9USUZfR0FJTixcbiAgICBwYW46IC12YXJpYXRpb24ucGFuU3ByZWFkLFxuICAgIGZyZXF1ZW5jeTogMzkyICogYnJpZ2h0bmVzcyxcbiAgICBmcmVxdWVuY3lFbmQ6IDQ5NCAqIGJyaWdodG5lc3MsXG4gICAgaGFybW9uaWNGcmVxdWVuY3k6IDc4NCAqIGJyaWdodG5lc3MsXG4gICAgaGFybW9uaWNHYWluOiAwLjAwMzQgKiBwcmVzc3VyZUdhaW4gKiBDT05UQUNUX1JJUFBMRV9NT1RJRl9HQUlOLFxuICAgIGZpbHRlclN0YXJ0OiAzOTAwICogYnJpZ2h0bmVzcyxcbiAgICBmaWx0ZXJFbmQ6IDIzMDAgKiBicmlnaHRuZXNzLFxuICAgIG5vaXNlR2FpbjogMC4wMDYyICogQ09OVEFDVF9SSVBQTEVfTU9USUZfR0FJTixcbiAgICByZWxlYXNlOiAwLjI0LFxuICB9KTtcbiAgc2NoZWR1bGVDb250YWN0UHJlc3N1cmVSaW5nKHtcbiAgICBvZmZzZXQ6IHJpbmdPZmZzZXRzWzFdLFxuICAgIGR1cmF0aW9uOiAwLjI2LFxuICAgIGdhaW46IDAuMDEzMiAqIHByZXNzdXJlR2FpbiAqIENPTlRBQ1RfUklQUExFX01PVElGX0dBSU4sXG4gICAgcGFuOiB2YXJpYXRpb24ucGFuU3ByZWFkLFxuICAgIGZyZXF1ZW5jeTogNDk0ICogYnJpZ2h0bmVzcyxcbiAgICBmcmVxdWVuY3lFbmQ6IDU4NyAqIGJyaWdodG5lc3MsXG4gICAgaGFybW9uaWNGcmVxdWVuY3k6IDk4OCAqIGJyaWdodG5lc3MsXG4gICAgaGFybW9uaWNHYWluOiAwLjAwMzYgKiBwcmVzc3VyZUdhaW4gKiBDT05UQUNUX1JJUFBMRV9NT1RJRl9HQUlOLFxuICAgIGZpbHRlclN0YXJ0OiAzNzIwICogYnJpZ2h0bmVzcyxcbiAgICBmaWx0ZXJFbmQ6IDIyMDAgKiBicmlnaHRuZXNzLFxuICAgIG5vaXNlR2FpbjogMC4wMDU4ICogQ09OVEFDVF9SSVBQTEVfTU9USUZfR0FJTixcbiAgICByZWxlYXNlOiAwLjMyLFxuICB9KTtcbiAgc2NoZWR1bGVDb250YWN0UHJlc3N1cmVSaW5nKHtcbiAgICBvZmZzZXQ6IHJpbmdPZmZzZXRzWzJdLFxuICAgIGR1cmF0aW9uOiAwLjM0LFxuICAgIGdhaW46IDAuMDEyNiAqIHByZXNzdXJlR2FpbiAqIENPTlRBQ1RfUklQUExFX01PVElGX0dBSU4sXG4gICAgcGFuOiAwLFxuICAgIGZyZXF1ZW5jeTogNTg3ICogYnJpZ2h0bmVzcyxcbiAgICBmcmVxdWVuY3lFbmQ6IDc0MCAqIGJyaWdodG5lc3MsXG4gICAgaGFybW9uaWNGcmVxdWVuY3k6IDExNzUgKiBicmlnaHRuZXNzLFxuICAgIGhhcm1vbmljR2FpbjogMC4wMDMzICogcHJlc3N1cmVHYWluICogQ09OVEFDVF9SSVBQTEVfTU9USUZfR0FJTixcbiAgICBmaWx0ZXJTdGFydDogMzUwMCAqIGJyaWdodG5lc3MsXG4gICAgZmlsdGVyRW5kOiAyMDUwICogYnJpZ2h0bmVzcyxcbiAgICBub2lzZUdhaW46IDAuMDA1MCAqIENPTlRBQ1RfUklQUExFX01PVElGX0dBSU4sXG4gICAgcmVsZWFzZTogMC40MixcbiAgfSk7XG4gIHNjaGVkdWxlQ29udGFjdFByZXNzdXJlUmluZyh7XG4gICAgb2Zmc2V0OiByaW5nT2Zmc2V0c1szXSxcbiAgICBkdXJhdGlvbjogMC40MyxcbiAgICBnYWluOiAwLjAxMTQgKiBwcmVzc3VyZUdhaW4gKiBDT05UQUNUX1JJUFBMRV9NT1RJRl9HQUlOLFxuICAgIHBhbjogdmFyaWF0aW9uLnBhblNwcmVhZCAqIDAuNTIsXG4gICAgZnJlcXVlbmN5OiA2NTkgKiBicmlnaHRuZXNzLFxuICAgIGZyZXF1ZW5jeUVuZDogODgwICogYnJpZ2h0bmVzcyxcbiAgICBoYXJtb25pY0ZyZXF1ZW5jeTogMTMxOCAqIGJyaWdodG5lc3MsXG4gICAgaGFybW9uaWNHYWluOiAwLjAwMzAgKiBwcmVzc3VyZUdhaW4gKiBDT05UQUNUX1JJUFBMRV9NT1RJRl9HQUlOLFxuICAgIGZpbHRlclN0YXJ0OiAzMjYwICogYnJpZ2h0bmVzcyxcbiAgICBmaWx0ZXJFbmQ6IDE4ODAgKiBicmlnaHRuZXNzLFxuICAgIG5vaXNlR2FpbjogMC4wMDQ0ICogQ09OVEFDVF9SSVBQTEVfTU9USUZfR0FJTixcbiAgICByZWxlYXNlOiAwLjU1LFxuICB9KTtcbiAgc2NoZWR1bGVDb250YWN0UHJlc3N1cmVSaW5nKHtcbiAgICBvZmZzZXQ6IHJpbmdPZmZzZXRzWzRdLFxuICAgIGR1cmF0aW9uOiAwLjUwLFxuICAgIGdhaW46IDAuMDA5OCAqIHByZXNzdXJlR2FpbiAqIENPTlRBQ1RfUklQUExFX01PVElGX0dBSU4sXG4gICAgcGFuOiAtdmFyaWF0aW9uLnBhblNwcmVhZCAqIDAuMzIsXG4gICAgZnJlcXVlbmN5OiA3ODQgKiBicmlnaHRuZXNzLFxuICAgIGZyZXF1ZW5jeUVuZDogOTg4ICogYnJpZ2h0bmVzcyxcbiAgICBoYXJtb25pY0ZyZXF1ZW5jeTogMTU2OCAqIGJyaWdodG5lc3MsXG4gICAgaGFybW9uaWNHYWluOiAwLjAwMjcgKiBwcmVzc3VyZUdhaW4gKiBDT05UQUNUX1JJUFBMRV9NT1RJRl9HQUlOLFxuICAgIGZpbHRlclN0YXJ0OiAzMDIwICogYnJpZ2h0bmVzcyxcbiAgICBmaWx0ZXJFbmQ6IDE3MjAgKiBicmlnaHRuZXNzLFxuICAgIG5vaXNlR2FpbjogMC4wMDM4ICogQ09OVEFDVF9SSVBQTEVfTU9USUZfR0FJTixcbiAgICByZWxlYXNlOiAwLjU2LFxuICB9KTtcbiAgc2NoZWR1bGVDb250YWN0UHJlc3N1cmVSaW5nKHtcbiAgICBvZmZzZXQ6IDEuMzIgKiB2YXJpYXRpb24ucmluZ0RlbGF5U2NhbGUsXG4gICAgZHVyYXRpb246IDAuNDgsXG4gICAgZ2FpbjogMC4wMDU4ICogcHJlc3N1cmVHYWluICogQ09OVEFDVF9SSVBQTEVfTU9USUZfR0FJTixcbiAgICBwYW46IDAsXG4gICAgZnJlcXVlbmN5OiA5ODggKiBicmlnaHRuZXNzLFxuICAgIGZyZXF1ZW5jeUVuZDogMTE3NSAqIGJyaWdodG5lc3MsXG4gICAgaGFybW9uaWNGcmVxdWVuY3k6IDE5NzYgKiBicmlnaHRuZXNzLFxuICAgIGhhcm1vbmljR2FpbjogMC4wMDE5ICogcHJlc3N1cmVHYWluICogQ09OVEFDVF9SSVBQTEVfTU9USUZfR0FJTixcbiAgICBmaWx0ZXJTdGFydDogMjg1MCAqIGJyaWdodG5lc3MsXG4gICAgZmlsdGVyRW5kOiAxNTgwICogYnJpZ2h0bmVzcyxcbiAgICBub2lzZUdhaW46IDAuMDAyOCAqIENPTlRBQ1RfUklQUExFX01PVElGX0dBSU4sXG4gICAgcmVsZWFzZTogMC41OCxcbiAgfSk7XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKiogQ3JlYXRlIGEgc2hvcnQgbm9pc2UgYnVyc3QgZm9yIHRyYW5zaWVudCBcInNuYXBcIiAqL1xuZnVuY3Rpb24gY3JlYXRlVHJhbnNpZW50Tm9pc2UoKSB7XG4gIGlmICghc2hhcmVkTm9pc2VCdWZmZXIpIHtcbiAgICBjb25zdCBidWZmZXJTaXplID0gYXVkaW9Db250ZXh0LnNhbXBsZVJhdGUgKiAyO1xuICAgIHNoYXJlZE5vaXNlQnVmZmVyID0gYXVkaW9Db250ZXh0LmNyZWF0ZUJ1ZmZlcigxLCBidWZmZXJTaXplLCBhdWRpb0NvbnRleHQuc2FtcGxlUmF0ZSk7XG4gICAgY29uc3QgZGF0YSA9IHNoYXJlZE5vaXNlQnVmZmVyLmdldENoYW5uZWxEYXRhKDApO1xuICAgIFxuICAgIC8vIFBpbmstaXNoIG5vaXNlIChtb3JlIG5hdHVyYWwgdGhhbiBwdXJlIHdoaXRlKVxuICAgIGxldCBiMCA9IDAsIGIxID0gMCwgYjIgPSAwO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgYnVmZmVyU2l6ZTsgaSsrKSB7XG4gICAgICBjb25zdCB3aGl0ZSA9IE1hdGgucmFuZG9tKCkgKiAyIC0gMTtcbiAgICAgIGIwID0gMC45OTc2NSAqIGIwICsgd2hpdGUgKiAwLjA5OTA0NjA7XG4gICAgICBiMSA9IDAuOTYzMDAgKiBiMSArIHdoaXRlICogMC4yOTY1MTY0O1xuICAgICAgYjIgPSAwLjU3MDAwICogYjIgKyB3aGl0ZSAqIDEuMDUyNjkxMztcbiAgICAgIGRhdGFbaV0gPSAoYjAgKyBiMSArIGIyICsgd2hpdGUgKiAwLjE4NDgpICogMC4yNTtcbiAgICB9XG4gIH1cbiAgXG4gIGNvbnN0IG5vaXNlID0gYXVkaW9Db250ZXh0LmNyZWF0ZUJ1ZmZlclNvdXJjZSgpO1xuICBub2lzZS5idWZmZXIgPSBzaGFyZWROb2lzZUJ1ZmZlcjtcbiAgbm9pc2UubG9vcFN0YXJ0ID0gTWF0aC5yYW5kb20oKSAqIDEuNTtcbiAgbm9pc2UubG9vcEVuZCA9IG5vaXNlLmxvb3BTdGFydCArIDAuMTtcbiAgbm9pc2UubG9vcCA9IGZhbHNlO1xuICBcbiAgcmV0dXJuIG5vaXNlO1xufVxuXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcbi8vIFNPVU5EIFBMQVlCQUNLXG4vLyDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZBcblxuLyoqXG4gKiBQbGF5IGEgY29sbGlzaW9uIHNvdW5kIHVzaW5nIHZvaWNlIHBvb2wgd2l0aCBzdGVhbGluZ1xuICogQHBhcmFtIHtudW1iZXJ9IGJhbGxSYWRpdXMgLSBCYWxsIHJhZGl1cyAobWFwcyB0byBwaXRjaClcbiAqIEBwYXJhbSB7bnVtYmVyfSBpbnRlbnNpdHkgLSBDb2xsaXNpb24gaW50ZW5zaXR5IDAtMSAobWFwcyB0byB2b2x1bWUgKyBicmlnaHRuZXNzKVxuICogQHBhcmFtIHtudW1iZXJ9IHhQb3NpdGlvbiAtIEJhbGwgWCBwb3NpdGlvbiAwLTEgKG1hcHMgdG8gc3RlcmVvIHBhbilcbiAqIEBwYXJhbSB7c3RyaW5nfG51bWJlcn0gYmFsbElkIC0gVW5pcXVlIGJhbGwgaWRlbnRpZmllciBmb3IgZGVib3VuY2luZ1xuICovXG5leHBvcnQgZnVuY3Rpb24gcGxheUNvbGxpc2lvblNvdW5kKGJhbGxSYWRpdXMsIGludGVuc2l0eSwgeFBvc2l0aW9uID0gMC41LCBiYWxsSWQgPSBudWxsKSB7XG4gIGlmICghaXNFbmFibGVkIHx8ICFpc1VubG9ja2VkIHx8ICFhdWRpb0NvbnRleHQgfHwgcHJlZmVyc1JlZHVjZWRNb3Rpb24pIHJldHVybjtcbiAgY29uc3QgcGl0QXVkaW9Qcm9maWxlID0gZ2V0UGl0QXVkaW9UaHJvdHRsZVByb2ZpbGUoKTtcblxuICAvLyBFbmVyZ3kgdGhyZXNob2xkOiBzb2Z0IHRvdWNoZXMgYXJlIHNpbGVudFxuICBpZiAoaW50ZW5zaXR5IDwgQ09ORklHLmNvbGxpc2lvbk1pbkltcGFjdCArIHBpdEF1ZGlvUHJvZmlsZS5taW5JbXBhY3RCb29zdCkgcmV0dXJuO1xuXG4gIGNvbnN0IG5vdyA9IGF1ZGlvQ29udGV4dC5jdXJyZW50VGltZTtcbiAgXG4gIC8vIEdsb2JhbCByYXRlIGxpbWl0ZXJcbiAgaWYgKG5vdyAtIGxhc3RHbG9iYWxTb3VuZFRpbWUgPCBHTE9CQUxfTUlOX0lOVEVSVkFMICogcGl0QXVkaW9Qcm9maWxlLmdsb2JhbEludGVydmFsTXVsdGlwbGllcikgcmV0dXJuO1xuXG4gIGlmIChwaXRBdWRpb1Byb2ZpbGUuZHJvcENoYW5jZSA+IDAgJiYgTWF0aC5yYW5kb20oKSA8IHBpdEF1ZGlvUHJvZmlsZS5kcm9wQ2hhbmNlKSByZXR1cm47XG4gIFxuICAvLyBQZXItYmFsbCBkZWJvdW5jZVxuICBpZiAoYmFsbElkICE9PSBudWxsKSB7XG4gICAgY29uc3QgbGFzdFRpbWUgPSBsYXN0U291bmRUaW1lLmdldChiYWxsSWQpIHx8IDA7XG4gICAgaWYgKG5vdyAtIGxhc3RUaW1lIDwgQ09ORklHLm1pblRpbWVCZXR3ZWVuU291bmRzICogcGl0QXVkaW9Qcm9maWxlLnBlckJhbGxJbnRlcnZhbE11bHRpcGxpZXIpIHJldHVybjtcbiAgICBsYXN0U291bmRUaW1lLnNldChiYWxsSWQsIG5vdyk7XG4gIH1cbiAgXG4gIGxhc3RHbG9iYWxTb3VuZFRpbWUgPSBub3c7XG4gIFxuICAvLyBQZXJpb2RpYyBjbGVhbnVwIG9mIG9sZCBlbnRyaWVzXG4gIGlmIChsYXN0U291bmRUaW1lLnNpemUgPiAyMDApIHtcbiAgICBjb25zdCB0aHJlc2hvbGQgPSBub3cgLSAwLjU7XG4gICAgZm9yIChjb25zdCBbaWQsIHRpbWVdIG9mIGxhc3RTb3VuZFRpbWUpIHtcbiAgICAgIGlmICh0aW1lIDwgdGhyZXNob2xkKSBsYXN0U291bmRUaW1lLmRlbGV0ZShpZCk7XG4gICAgfVxuICB9XG4gIFxuICBjb25zdCB2b2ljZSA9IGFjcXVpcmVWb2ljZShub3cpO1xuICBpZiAoIXZvaWNlKSByZXR1cm47XG4gIFxuICBjb25zdCBmcmVxdWVuY3kgPSByYWRpdXNUb0ZyZXF1ZW5jeShiYWxsUmFkaXVzKTtcbiAgY29uc3QgY2xhbXBlZEludGVuc2l0eSA9IE1hdGgubWF4KDAsIE1hdGgubWluKDEsIGludGVuc2l0eSkpO1xuICByZWNvcmRTb3VuZERlYnVnRXZlbnQoJ2NvbGxpc2lvbi1wbGF5YmFjaycsIGJhbGxJZCB8fCAnY29sbGlzaW9uJywge1xuICAgIGludGVuc2l0eTogY2xhbXBlZEludGVuc2l0eSxcbiAgICB4OiB4UG9zaXRpb24sXG4gIH0pO1xuICBcbiAgcGxheVZvaWNlKHZvaWNlLCBmcmVxdWVuY3ksIGNsYW1wZWRJbnRlbnNpdHksIHhQb3NpdGlvbiwgbm93KTtcbn1cblxuZnVuY3Rpb24gZ2V0UGl0QXVkaW9UaHJvdHRsZVByb2ZpbGUoKSB7XG4gIGNvbnN0IGZhbGxiYWNrID0ge1xuICAgIG1pbkltcGFjdEJvb3N0OiAwLFxuICAgIGdsb2JhbEludGVydmFsTXVsdGlwbGllcjogMSxcbiAgICBwZXJCYWxsSW50ZXJ2YWxNdWx0aXBsaWVyOiAxLFxuICAgIGRyb3BDaGFuY2U6IDBcbiAgfTtcblxuICB0cnkge1xuICAgIGNvbnN0IHN0YXRlID0gZ2V0U3RhdGUoKTtcbiAgICBpZiAoIXN0YXRlIHx8IHN0YXRlLmN1cnJlbnRNb2RlICE9PSAncGl0JykgcmV0dXJuIGZhbGxiYWNrO1xuXG4gICAgY29uc3QgcG9saWN5ID0gU3RyaW5nKHN0YXRlLnBpdEF1ZGlvVGhyb3R0bGVQb2xpY3kgfHwgJ3Rocm90dGxlLWF3YXJlJykudG9Mb3dlckNhc2UoKTtcbiAgICBpZiAocG9saWN5ICE9PSAndGhyb3R0bGUtYXdhcmUnKSByZXR1cm4gZmFsbGJhY2s7XG5cbiAgICBjb25zdCB0aHJvdHRsZUxldmVsID0gTWF0aC5tYXgoMCwgTWF0aC5taW4oMiwgTWF0aC5yb3VuZChOdW1iZXIoc3RhdGUuYWRhcHRpdmVUaHJvdHRsZUxldmVsKSB8fCAwKSkpO1xuICAgIGNvbnN0IGlzTW9iaWxlQ2xhc3MgPSBCb29sZWFuKHN0YXRlLmlzTW9iaWxlIHx8IHN0YXRlLmlzTW9iaWxlVmlld3BvcnQpO1xuXG4gICAgaWYgKHRocm90dGxlTGV2ZWwgPj0gMikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWluSW1wYWN0Qm9vc3Q6IGlzTW9iaWxlQ2xhc3MgPyAwLjI0IDogMC4xOCxcbiAgICAgICAgZ2xvYmFsSW50ZXJ2YWxNdWx0aXBsaWVyOiBpc01vYmlsZUNsYXNzID8gMy4yIDogMi41LFxuICAgICAgICBwZXJCYWxsSW50ZXJ2YWxNdWx0aXBsaWVyOiBpc01vYmlsZUNsYXNzID8gMi44IDogMi4yLFxuICAgICAgICBkcm9wQ2hhbmNlOiBpc01vYmlsZUNsYXNzID8gMC43MiA6IDAuNTJcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKHRocm90dGxlTGV2ZWwgPj0gMSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgbWluSW1wYWN0Qm9vc3Q6IGlzTW9iaWxlQ2xhc3MgPyAwLjE0IDogMC4xLFxuICAgICAgICBnbG9iYWxJbnRlcnZhbE11bHRpcGxpZXI6IGlzTW9iaWxlQ2xhc3MgPyAyLjEgOiAxLjcsXG4gICAgICAgIHBlckJhbGxJbnRlcnZhbE11bHRpcGxpZXI6IGlzTW9iaWxlQ2xhc3MgPyAxLjggOiAxLjUsXG4gICAgICAgIGRyb3BDaGFuY2U6IGlzTW9iaWxlQ2xhc3MgPyAwLjQgOiAwLjJcbiAgICAgIH07XG4gICAgfVxuXG4gICAgaWYgKGlzTW9iaWxlQ2xhc3MpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIG1pbkltcGFjdEJvb3N0OiAwLjA1LFxuICAgICAgICBnbG9iYWxJbnRlcnZhbE11bHRpcGxpZXI6IDEuMyxcbiAgICAgICAgcGVyQmFsbEludGVydmFsTXVsdGlwbGllcjogMS4yLFxuICAgICAgICBkcm9wQ2hhbmNlOiAwLjEyXG4gICAgICB9O1xuICAgIH1cbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBmYWxsYmFjaztcbiAgfVxuXG4gIHJldHVybiBmYWxsYmFjaztcbn1cblxuLyoqXG4gKiBQbGF5IGEgc2hvcnQgdGVzdCBoaXQgKGZvciBVSSBhdWRpdGlvbmluZykuXG4gKiBVc2VmdWwgZm9yIHRoZSBzeW50aC1zdHlsZSBjb250cm9sIHN1cmZhY2U6IGxldHMgeW91IFwiZnVtYmxlXCIgc2V0dGluZ3Mgd2l0aG91dFxuICogbmVlZGluZyBhIHBoeXNpY2FsIGNvbGxpc2lvbiB0byBoYXBwZW4uXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwbGF5VGVzdFNvdW5kKHsgaW50ZW5zaXR5ID0gMC44MiwgcmFkaXVzID0gMTgsIHhQb3NpdGlvbiA9IDAuNzIgfSA9IHt9KSB7XG4gIHBsYXlDb2xsaXNpb25Tb3VuZChyYWRpdXMsIGludGVuc2l0eSwgeFBvc2l0aW9uLCBudWxsKTtcbn1cblxuLyoqIEFjcXVpcmUgYSB2b2ljZSBmcm9tIHRoZSBwb29sICh3aXRoIHZvaWNlIHN0ZWFsaW5nKSAqL1xuZnVuY3Rpb24gYWNxdWlyZVZvaWNlKG5vdykge1xuICAvLyBMb29rIGZvciBmcmVlIHZvaWNlXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgVk9JQ0VfUE9PTF9TSVpFOyBpKyspIHtcbiAgICBpZiAoIXZvaWNlUG9vbFtpXS5pblVzZSkgcmV0dXJuIHZvaWNlUG9vbFtpXTtcbiAgfVxuICBcbiAgLy8gU3RlYWwgb2xkZXN0XG4gIGxldCBvbGRlc3RWb2ljZSA9IHZvaWNlUG9vbFswXTtcbiAgZm9yIChsZXQgaSA9IDE7IGkgPCBWT0lDRV9QT09MX1NJWkU7IGkrKykge1xuICAgIGlmICh2b2ljZVBvb2xbaV0uc3RhcnRUaW1lIDwgb2xkZXN0Vm9pY2Uuc3RhcnRUaW1lKSB7XG4gICAgICBvbGRlc3RWb2ljZSA9IHZvaWNlUG9vbFtpXTtcbiAgICB9XG4gIH1cbiAgXG4gIHJlbGVhc2VWb2ljZShvbGRlc3RWb2ljZSk7XG4gIHJldHVybiBvbGRlc3RWb2ljZTtcbn1cblxuLyoqIFJlbGVhc2UgYSB2b2ljZSAoc3RvcCBvc2NpbGxhdG9ycywgbWFyayBhcyBmcmVlKSAqL1xuZnVuY3Rpb24gcmVsZWFzZVZvaWNlKHZvaWNlKSB7XG4gIGlmICh2b2ljZS5vc2MpIHtcbiAgICB0cnkgeyB2b2ljZS5vc2Muc3RvcCgpOyB2b2ljZS5vc2MuZGlzY29ubmVjdCgpOyB9IGNhdGNoIChlKSB7fVxuICAgIHZvaWNlLm9zYyA9IG51bGw7XG4gIH1cbiAgaWYgKHZvaWNlLmhhcm1vbmljT3NjKSB7XG4gICAgdHJ5IHsgdm9pY2UuaGFybW9uaWNPc2Muc3RvcCgpOyB2b2ljZS5oYXJtb25pY09zYy5kaXNjb25uZWN0KCk7IH0gY2F0Y2ggKGUpIHt9XG4gICAgdm9pY2UuaGFybW9uaWNPc2MgPSBudWxsO1xuICB9XG4gIGlmICh2b2ljZS5zcGFya2xlT3NjKSB7XG4gICAgdHJ5IHsgdm9pY2Uuc3BhcmtsZU9zYy5zdG9wKCk7IHZvaWNlLnNwYXJrbGVPc2MuZGlzY29ubmVjdCgpOyB9IGNhdGNoIChlKSB7fVxuICAgIHZvaWNlLnNwYXJrbGVPc2MgPSBudWxsO1xuICB9XG4gIGlmICh2b2ljZS5ub2lzZVNvdXJjZSkge1xuICAgIHRyeSB7IHZvaWNlLm5vaXNlU291cmNlLnN0b3AoKTsgdm9pY2Uubm9pc2VTb3VyY2UuZGlzY29ubmVjdCgpOyB9IGNhdGNoIChlKSB7fVxuICAgIHZvaWNlLm5vaXNlU291cmNlID0gbnVsbDtcbiAgfVxuICB2b2ljZS5pblVzZSA9IGZhbHNlO1xufVxuXG4vKiogUGxheSBhIHNvdW5kIHVzaW5nIGEgcG9vbGVkIHZvaWNlICovXG5mdW5jdGlvbiBwbGF5Vm9pY2Uodm9pY2UsIGZyZXF1ZW5jeSwgaW50ZW5zaXR5LCB4UG9zaXRpb24sIG5vdykge1xuICB2b2ljZS5pblVzZSA9IHRydWU7XG4gIHZvaWNlLnN0YXJ0VGltZSA9IG5vdztcbiAgXG4gIC8vIE5vbi1saW5lYXIgaW50ZW5zaXR5IGN1cnZlIChzb2Z0IGhpdHMgTVVDSCBxdWlldGVyKVxuICBjb25zdCBlbmVyZ3kgPSBNYXRoLm1heCgwLCBNYXRoLm1pbigxLCBpbnRlbnNpdHkpKTtcbiAgY29uc3QgZ2FpblNoYXBlID0gTWF0aC5wb3coZW5lcmd5LCBDT05GSUcuaW50ZW5zaXR5RXhwb25lbnQpO1xuICBcbiAgY29uc3QgdmFyaWVkRnJlcSA9IHZhcnkoZnJlcXVlbmN5LCBDT05GSUcudmFyaWFuY2VQaXRjaCk7XG4gIFxuICAvLyBEZWNheSAoaGFyZGVyID0gc25hcHBpZXIpXG4gIGNvbnN0IGRlY2F5VmFyID0gdmFyeShDT05GSUcuZGVjYXlUaW1lLCBDT05GSUcudmFyaWFuY2VEZWNheSk7XG4gIGNvbnN0IGZpbmFsRGVjYXkgPSBkZWNheVZhciAqICgxIC0gZ2FpblNoYXBlICogKDEgLSBDT05GSUcudmVsb2NpdHlEZWNheVNjYWxlKSk7XG4gIGNvbnN0IGR1cmF0aW9uID0gZmluYWxEZWNheSArIDAuMDI7XG5cbiAgLy8gR2FpbiAobm9uLWxpbmVhciBpbnRlbnNpdHkgbWFwcGluZylcbiAgbGV0IGdhaW4gPSBDT05GSUcubWluR2FpbiArIChDT05GSUcubWF4R2FpbiAtIENPTkZJRy5taW5HYWluKSAqIGdhaW5TaGFwZTtcbiAgZ2FpbiAqPSB2YXJ5KDEuMCwgQ09ORklHLnZhcmlhbmNlR2Fpbik7XG5cbiAgLy8gRmlsdGVyIChicmlnaHRuZXNzIHNjYWxlcyB3aXRoIGludGVuc2l0eSlcbiAgY29uc3QgYnJpZ2h0bmVzc1NjYWxlID0gMSArIChDT05GSUcudmVsb2NpdHlCcmlnaHRuZXNzU2NhbGUgLSAxKSAqIGdhaW5TaGFwZTtcbiAgbGV0IGZpbHRlckZyZXEgPSBDT05GSUcuZmlsdGVyQmFzZUZyZXEgKyBDT05GSUcuZmlsdGVyVmVsb2NpdHlSYW5nZSAqIE1hdGgucG93KGdhaW5TaGFwZSwgMS4zKTtcbiAgZmlsdGVyRnJlcSAqPSB2YXJ5KDEuMCwgQ09ORklHLnZhcmlhbmNlRmlsdGVyKSAqIGJyaWdodG5lc3NTY2FsZTtcbiAgXG4gIGNvbnN0IHBhblZhbHVlID0gKHhQb3NpdGlvbiAtIDAuNSkgKiAyICogQ09ORklHLm1heFBhbjtcbiAgY29uc3QgcmV2ZXJiQW1vdW50ID0gMC4xMiArICgxIC0gZ2FpblNoYXBlKSAqIDAuNTtcbiAgXG4gIC8vIFRvbmUgc2FmZXR5XG4gICh7IGdhaW4sIGZpbHRlckZyZXEgfSA9IGFwcGx5VG9uZVNhZmV0eSh2YXJpZWRGcmVxLCBnYWluLCBmaWx0ZXJGcmVxKSk7XG4gIFxuICB2b2ljZS5maWx0ZXIuZnJlcXVlbmN5LnZhbHVlID0gZmlsdGVyRnJlcTtcbiAgdm9pY2UuZmlsdGVyLlEudmFsdWUgPSBDT05GSUcuZmlsdGVyUTtcbiAgdm9pY2UucGFubmVyLnBhbi52YWx1ZSA9IHBhblZhbHVlO1xuICB2b2ljZS5yZXZlcmJTZW5kLmdhaW4udmFsdWUgPSByZXZlcmJBbW91bnQ7XG4gIHZvaWNlLm5vaXNlRmlsdGVyLlEudmFsdWUgPSBjbGFtcChDT05GSUcubm9pc2VUcmFuc2llbnRRIHx8IDEuMiwgMC41LCA4LjApO1xuICBcbiAgLy8gTWFpbiBlbnZlbG9wZVxuICB2b2ljZS5lbnZlbG9wZS5nYWluLmNhbmNlbFNjaGVkdWxlZFZhbHVlcyhub3cpO1xuICB2b2ljZS5lbnZlbG9wZS5nYWluLnNldFZhbHVlQXRUaW1lKGdhaW4sIG5vdyk7XG4gIHZvaWNlLmVudmVsb3BlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAwMSwgbm93ICsgZmluYWxEZWNheSk7XG4gIFxuICBjb25zdCBvc2MgPSBhdWRpb0NvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICBvc2MudHlwZSA9ICdzaW5lJztcbiAgb3NjLmZyZXF1ZW5jeS52YWx1ZSA9IHZhcmllZEZyZXE7XG4gIFxuICB2b2ljZS5vc2MgPSBvc2M7XG4gIG9zYy5jb25uZWN0KHZvaWNlLmZpbHRlcik7XG5cbiAgLy8gSGFybW9uaWMgd2FybXRoIChzdWJ0bGUgMm5kIHBhcnRpYWwpXG4gIGlmICgoQ09ORklHLmhhcm1vbmljR2FpbiB8fCAwKSA+IDAuMDAxKSB7XG4gICAgY29uc3QgaGFybW9uaWNPc2MgPSBhdWRpb0NvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgIGhhcm1vbmljT3NjLnR5cGUgPSAnc2luZSc7XG4gICAgaGFybW9uaWNPc2MuZnJlcXVlbmN5LnZhbHVlID0gdmFyaWVkRnJlcSAqIDI7XG4gICAgXG4gICAgY29uc3QgaGFybW9uaWNFbnYgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIGhhcm1vbmljRW52LmdhaW4uY2FuY2VsU2NoZWR1bGVkVmFsdWVzKG5vdyk7XG4gICAgaGFybW9uaWNFbnYuZ2Fpbi5zZXRWYWx1ZUF0VGltZShnYWluICogQ09ORklHLmhhcm1vbmljR2Fpbiwgbm93KTtcbiAgICBoYXJtb25pY0Vudi5nYWluLmV4cG9uZW50aWFsUmFtcFRvVmFsdWVBdFRpbWUoMC4wMDEsIG5vdyArIGZpbmFsRGVjYXkpO1xuICAgIFxuICAgIHZvaWNlLmhhcm1vbmljT3NjID0gaGFybW9uaWNPc2M7XG4gICAgaGFybW9uaWNPc2MuY29ubmVjdChoYXJtb25pY0Vudik7XG4gICAgaGFybW9uaWNFbnYuY29ubmVjdCh2b2ljZS5maWx0ZXIpO1xuICAgIGhhcm1vbmljT3NjLm9uZW5kZWQgPSAoKSA9PiB7XG4gICAgICB0cnkgeyBoYXJtb25pY0Vudi5kaXNjb25uZWN0KCk7IH0gY2F0Y2ggKGUpIHt9XG4gICAgfTtcbiAgICBoYXJtb25pY09zYy5zdGFydChub3cpO1xuICAgIGhhcm1vbmljT3NjLnN0b3Aobm93ICsgZHVyYXRpb24pO1xuICB9IGVsc2Uge1xuICAgIHZvaWNlLmhhcm1vbmljT3NjID0gbnVsbDtcbiAgfVxuXG4gIC8vIFNwYXJrbGUgcGFydGlhbCAoZ2xhc3MtbGlrZSBtaWNyby1jaGltZSkg4oCUIHNob3J0LCBkZWxpY2F0ZSwgbm9uLXJlcGV0aXRpdmVcbiAgaWYgKChDT05GSUcuc3BhcmtsZUdhaW4gfHwgMCkgPiAwLjAwMSkge1xuICAgIGNvbnN0IHNwYXJrbGVPc2MgPSBhdWRpb0NvbnRleHQuY3JlYXRlT3NjaWxsYXRvcigpO1xuICAgIHNwYXJrbGVPc2MudHlwZSA9ICdzaW5lJztcbiAgICBcbiAgICBjb25zdCByTWluID0gQ09ORklHLnNwYXJrbGVSYXRpb01pbiB8fCAyLjM7XG4gICAgY29uc3Qgck1heCA9IENPTkZJRy5zcGFya2xlUmF0aW9NYXggfHwgNC4xO1xuICAgIGNvbnN0IHJhdGlvID0gY2xhbXAock1pbiArIE1hdGgucmFuZG9tKCkgKiAock1heCAtIHJNaW4pLCAxLjIsIDEwLjApO1xuICAgIHNwYXJrbGVPc2MuZnJlcXVlbmN5LnZhbHVlID0gdmFyaWVkRnJlcSAqIHZhcnkocmF0aW8sIDAuMDIpO1xuICAgIFxuICAgIGNvbnN0IHNwYXJrbGVFbnYgPSBhdWRpb0NvbnRleHQuY3JlYXRlR2FpbigpO1xuICAgIGNvbnN0IHNwYXJrbGVEZWNheSA9IE1hdGgubWF4KFxuICAgICAgMC4wMTIsXG4gICAgICBmaW5hbERlY2F5ICogY2xhbXAoQ09ORklHLnNwYXJrbGVEZWNheU11bCB8fCAwLjY1LCAwLjI1LCAwLjk1KVxuICAgICk7XG4gICAgc3BhcmtsZUVudi5nYWluLmNhbmNlbFNjaGVkdWxlZFZhbHVlcyhub3cpO1xuICAgIHNwYXJrbGVFbnYuZ2Fpbi5zZXRWYWx1ZUF0VGltZShnYWluICogQ09ORklHLnNwYXJrbGVHYWluLCBub3cpO1xuICAgIHNwYXJrbGVFbnYuZ2Fpbi5leHBvbmVudGlhbFJhbXBUb1ZhbHVlQXRUaW1lKDAuMDAxLCBub3cgKyBzcGFya2xlRGVjYXkpO1xuICAgIFxuICAgIHZvaWNlLnNwYXJrbGVPc2MgPSBzcGFya2xlT3NjO1xuICAgIHNwYXJrbGVPc2MuY29ubmVjdChzcGFya2xlRW52KTtcbiAgICBzcGFya2xlRW52LmNvbm5lY3Qodm9pY2UuZmlsdGVyKTtcbiAgICBzcGFya2xlT3NjLm9uZW5kZWQgPSAoKSA9PiB7XG4gICAgICB0cnkgeyBzcGFya2xlRW52LmRpc2Nvbm5lY3QoKTsgfSBjYXRjaCAoZSkge31cbiAgICB9O1xuICAgIHNwYXJrbGVPc2Muc3RhcnQobm93KTtcbiAgICBzcGFya2xlT3NjLnN0b3Aobm93ICsgZHVyYXRpb24pO1xuICB9IGVsc2Uge1xuICAgIHZvaWNlLnNwYXJrbGVPc2MgPSBudWxsO1xuICB9XG5cbiAgLy8gTm9pc2UgdHJhbnNpZW50IChvbmx5IG9uIGhhcmRlciBoaXRzKVxuICBpZiAoQ09ORklHLm5vaXNlVHJhbnNpZW50RW5hYmxlZCAmJiBnYWluU2hhcGUgPiAwLjI1KSB7XG4gICAgY29uc3Qgbm9pc2VTb3VyY2UgPSBjcmVhdGVUcmFuc2llbnROb2lzZSgpO1xuICAgIHZvaWNlLm5vaXNlU291cmNlID0gbm9pc2VTb3VyY2U7XG4gICAgXG4gICAgY29uc3Qgbm9pc2VJbnRlbnNpdHkgPSBNYXRoLnBvdyhnYWluU2hhcGUsIDEuNCk7XG4gICAgY29uc3Qgbm9pc2VGaWx0ZXJCYXNlID0gQ09ORklHLm5vaXNlVHJhbnNpZW50RmlsdGVyTWluICsgXG4gICAgICAoQ09ORklHLm5vaXNlVHJhbnNpZW50RmlsdGVyTWF4IC0gQ09ORklHLm5vaXNlVHJhbnNpZW50RmlsdGVyTWluKSAqIG5vaXNlSW50ZW5zaXR5O1xuICAgIHZvaWNlLm5vaXNlRmlsdGVyLmZyZXF1ZW5jeS52YWx1ZSA9IHZhcnkobm9pc2VGaWx0ZXJCYXNlLCBDT05GSUcudmFyaWFuY2VOb2lzZSk7XG4gICAgXG4gICAgY29uc3Qgbm9pc2VHYWluID0gQ09ORklHLm5vaXNlVHJhbnNpZW50R2FpbiAqIENPTkZJRy52ZWxvY2l0eU5vaXNlU2NhbGUgKiBub2lzZUludGVuc2l0eSAqIGdhaW47XG4gICAgY29uc3Qgbm9pc2VEZWNheSA9IHZhcnkoQ09ORklHLm5vaXNlVHJhbnNpZW50RGVjYXksIENPTkZJRy52YXJpYW5jZU5vaXNlKTtcbiAgICBcbiAgICB2b2ljZS5ub2lzZUVudmVsb3BlLmdhaW4uY2FuY2VsU2NoZWR1bGVkVmFsdWVzKG5vdyk7XG4gICAgdm9pY2Uubm9pc2VFbnZlbG9wZS5nYWluLnNldFZhbHVlQXRUaW1lKG5vaXNlR2Fpbiwgbm93KTtcbiAgICB2b2ljZS5ub2lzZUVudmVsb3BlLmdhaW4uZXhwb25lbnRpYWxSYW1wVG9WYWx1ZUF0VGltZSgwLjAwMSwgbm93ICsgbm9pc2VEZWNheSk7XG4gICAgXG4gICAgbm9pc2VTb3VyY2UuY29ubmVjdCh2b2ljZS5ub2lzZUZpbHRlcik7XG4gICAgbm9pc2VTb3VyY2Uuc3RhcnQobm93KTtcbiAgICBub2lzZVNvdXJjZS5zdG9wKG5vdyArIG5vaXNlRGVjYXkgKyAwLjAxKTtcbiAgfSBlbHNlIHtcbiAgICB2b2ljZS5ub2lzZVNvdXJjZSA9IG51bGw7XG4gIH1cbiAgXG4gIG9zYy5zdGFydChub3cpO1xuICBvc2Muc3RvcChub3cgKyBkdXJhdGlvbik7XG4gIG9zYy5vbmVuZGVkID0gKCkgPT4gcmVsZWFzZVZvaWNlKHZvaWNlKTtcbn1cblxuZnVuY3Rpb24gY2xhbXAodiwgbWluLCBtYXgpIHtcbiAgcmV0dXJuIHYgPCBtaW4gPyBtaW4gOiB2ID4gbWF4ID8gbWF4IDogdjtcbn1cblxuLyoqIEFwcGx5IHRvbmUgc2FmZXR5IChwcmV2ZW50IGJyaXR0bGUvdWdseSBleHRyZW1lIHRvbmVzKSAqL1xuZnVuY3Rpb24gYXBwbHlUb25lU2FmZXR5KGZyZXF1ZW5jeSwgZ2FpbiwgZmlsdGVyRnJlcSkge1xuICBjb25zdCB0ID0gY2xhbXAoXG4gICAgKGZyZXF1ZW5jeSAtIENPTkZJRy50b25lU2FmZXR5TWluSHopIC8gKENPTkZJRy50b25lU2FmZXR5TWF4SHogLSBDT05GSUcudG9uZVNhZmV0eU1pbkh6KSxcbiAgICAwLCAxXG4gICk7XG5cbiAgY29uc3QgZXhwID0gQ09ORklHLnRvbmVTYWZldHlFeHBvbmVudDtcbiAgY29uc3QgaGlnaCA9IE1hdGgucG93KHQsIGV4cCk7XG4gIGNvbnN0IGxvdyA9IE1hdGgucG93KDEgLSB0LCBleHApO1xuXG4gIGNvbnN0IGdhaW5NdWwgPSBjbGFtcChcbiAgICAxIC0gKENPTkZJRy50b25lU2FmZXR5SGlnaEdhaW5BdHRlbiAqIGhpZ2gpIC0gKENPTkZJRy50b25lU2FmZXR5TG93R2FpbkF0dGVuICogbG93KSxcbiAgICAwLjYsIDFcbiAgKTtcbiAgbGV0IHNhZmVHYWluID0gTWF0aC5taW4oZ2FpbiAqIGdhaW5NdWwsIENPTkZJRy52b2ljZUdhaW5NYXgpO1xuXG4gIGNvbnN0IGJyaWdodE11bCA9IGNsYW1wKDEgLSBDT05GSUcudG9uZVNhZmV0eUhpZ2hCcmlnaHRBdHRlbiAqIGhpZ2gsIDAuNTUsIDEpO1xuICBsZXQgc2FmZUZpbHRlciA9IGNsYW1wKGZpbHRlckZyZXEgKiBicmlnaHRNdWwsIENPTkZJRy5maWx0ZXJNaW5IeiwgQ09ORklHLmZpbHRlck1heEh6KTtcblxuICByZXR1cm4geyBnYWluOiBzYWZlR2FpbiwgZmlsdGVyRnJlcTogc2FmZUZpbHRlciB9O1xufVxuXG4vKiogTWFwIGJhbGwgcmFkaXVzIHRvIG9yZ2FuaWMgZnJlcXVlbmN5IChub24tbWVsb2RpYykgKi9cbmZ1bmN0aW9uIHJhZGl1c1RvRnJlcXVlbmN5KHJhZGl1cykge1xuICBjb25zdCBtaW5SID0gOCwgbWF4UiA9IDU1O1xuICBjb25zdCBub3JtYWxpemVkID0gY2xhbXAoKHJhZGl1cyAtIG1pblIpIC8gKG1heFIgLSBtaW5SKSwgMCwgMSk7XG4gIGNvbnN0IGludiA9IDEgLSBub3JtYWxpemVkO1xuICBcbiAgY29uc3QgbWluSHogPSBjbGFtcChDT05GSUcucGl0Y2hNaW5IeiB8fCAxNDUsIDQwLCA2MDAwKTtcbiAgY29uc3QgbWF4SHogPSBjbGFtcChDT05GSUcucGl0Y2hNYXhIeiB8fCAyODAsIG1pbkh6ICsgMTAsIDEyMDAwKTtcbiAgY29uc3QgY3VydmUgPSBjbGFtcChDT05GSUcucGl0Y2hDdXJ2ZSB8fCAxLjAsIDAuNSwgMi41KTtcbiAgY29uc3Qgc2hhcGVkID0gTWF0aC5wb3coaW52LCBjdXJ2ZSk7XG4gIFxuICBjb25zdCBiYXNlRnJlcSA9IG1pbkh6ICsgc2hhcGVkICogKG1heEh6IC0gbWluSHopO1xuICByZXR1cm4gYmFzZUZyZXEgKiB2YXJ5KDEsIChDT05GSUcudmFyaWFuY2VQaXRjaCB8fCAwLjA2KSAqIDEuNSk7XG59XG5cbi8vIOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkFxuLy8gUFVCTElDIEFQSVxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbi8qKiBUb2dnbGUgc291bmQgb24vb2ZmICovXG5leHBvcnQgZnVuY3Rpb24gdG9nZ2xlU291bmQoKSB7XG4gIGlmICghaXNVbmxvY2tlZCkgcmV0dXJuIGZhbHNlO1xuICBpc0VuYWJsZWQgPSAhaXNFbmFibGVkO1xuICBpZiAoIWlzRW5hYmxlZCkge1xuICAgIHN0b3BXaGVlbExvb3BzKCk7XG4gICAgc3RvcENvbnRhY3RSaXBwbGVNb3RpZigpO1xuICB9XG4gIGVtaXRTb3VuZFN0YXRlQ2hhbmdlKCk7XG4gIHJldHVybiBpc0VuYWJsZWQ7XG59XG5cbi8qKiBTZXQgc291bmQgZW5hYmxlZCBzdGF0ZSAqL1xuZXhwb3J0IGZ1bmN0aW9uIHNldFNvdW5kRW5hYmxlZChlbmFibGVkKSB7XG4gIGlmICghaXNVbmxvY2tlZCkgcmV0dXJuO1xuICBpc0VuYWJsZWQgPSAhIWVuYWJsZWQ7XG4gIGlmICghaXNFbmFibGVkKSB7XG4gICAgc3RvcFdoZWVsTG9vcHMoKTtcbiAgICBzdG9wQ29udGFjdFJpcHBsZU1vdGlmKCk7XG4gIH1cbiAgZW1pdFNvdW5kU3RhdGVDaGFuZ2UoKTtcbn1cblxuLyoqIEdldCBjdXJyZW50IHNvdW5kIHN0YXRlICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0U291bmRTdGF0ZSgpIHtcbiAgcmV0dXJuIHtcbiAgICBpc1VubG9ja2VkLFxuICAgIGlzRW5hYmxlZCxcbiAgICBhY3RpdmVTb3VuZHM6IHZvaWNlUG9vbC5maWx0ZXIodiA9PiB2LmluVXNlKS5sZW5ndGgsXG4gICAgcG9vbFNpemU6IFZPSUNFX1BPT0xfU0laRSxcbiAgfTtcbn1cblxuLyoqIFNldCBtYXN0ZXIgdm9sdW1lICgwLTEpICovXG5leHBvcnQgZnVuY3Rpb24gc2V0TWFzdGVyVm9sdW1lKHZvbHVtZSkge1xuICBpZiAobWFzdGVyR2Fpbikge1xuICAgIG1hc3RlckdhaW4uZ2Fpbi52YWx1ZSA9IGNsYW1wKHZvbHVtZSwgMCwgMSkgKiBDT05GSUcubWFzdGVyR2FpbjtcbiAgfVxufVxuXG4vKiogQ2xlYW4gdXAgcmVzb3VyY2VzICovXG5leHBvcnQgZnVuY3Rpb24gZGlzcG9zZVNvdW5kRW5naW5lKCkge1xuICBzdG9wQ29udGFjdFJpcHBsZU1vdGlmKCk7XG4gIGlmIChhdWRpb0NvbnRleHQpIHtcbiAgICBhdWRpb0NvbnRleHQuY2xvc2UoKTtcbiAgICBhdWRpb0NvbnRleHQgPSBudWxsO1xuICB9XG4gIGlzVW5sb2NrZWQgPSBmYWxzZTtcbiAgaXNFbmFibGVkID0gZmFsc2U7XG4gIGxhc3RTb3VuZFRpbWUuY2xlYXIoKTtcbiAgc3RvcFdoZWVsTG9vcHMoKTtcbiAgd2hlZWxCdXMgPSBudWxsO1xuICBlbWl0U291bmRTdGF0ZUNoYW5nZSgpO1xufVxuXG4vKiogR2V0IGN1cnJlbnQgY29uZmlnIChmb3IgZGVidWdnaW5nKSAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldFNvdW5kQ29uZmlnKCkge1xuICByZXR1cm4geyAuLi5DT05GSUcgfTtcbn1cblxuLyoqIFVwZGF0ZSBzcGVjaWZpYyBjb25maWcgcGFyYW1ldGVycyBhdCBydW50aW1lICovXG5leHBvcnQgZnVuY3Rpb24gdXBkYXRlU291bmRDb25maWcodXBkYXRlcykge1xuICBmb3IgKGNvbnN0IFtrZXksIHZhbHVlXSBvZiBPYmplY3QuZW50cmllcyh1cGRhdGVzKSkge1xuICAgIGlmIChrZXkgaW4gQ09ORklHKSB7XG4gICAgICBDT05GSUdba2V5XSA9IHZhbHVlO1xuICAgIH1cbiAgfVxuICBcbiAgLy8gVXBkYXRlIGF1ZGlvIG5vZGVzIGlmIG5lZWRlZFxuICBpZiAod2V0R2FpbiAmJiBkcnlHYWluICYmICdyZXZlcmJXZXRNaXgnIGluIHVwZGF0ZXMpIHtcbiAgICB3ZXRHYWluLmdhaW4udmFsdWUgPSBDT05GSUcucmV2ZXJiV2V0TWl4O1xuICAgIGRyeUdhaW4uZ2Fpbi52YWx1ZSA9IDEgLSBDT05GSUcucmV2ZXJiV2V0TWl4O1xuICB9XG4gIGlmIChoaWdoU2hlbGYgJiYgKCdoaWdoU2hlbGZGcmVxJyBpbiB1cGRhdGVzIHx8ICdoaWdoU2hlbGZHYWluJyBpbiB1cGRhdGVzKSkge1xuICAgIGhpZ2hTaGVsZi5mcmVxdWVuY3kudmFsdWUgPSBDT05GSUcuaGlnaFNoZWxmRnJlcTtcbiAgICBoaWdoU2hlbGYuZ2Fpbi52YWx1ZSA9IENPTkZJRy5oaWdoU2hlbGZHYWluO1xuICB9XG4gIGlmIChtYXN0ZXJHYWluICYmICdtYXN0ZXJHYWluJyBpbiB1cGRhdGVzKSB7XG4gICAgbWFzdGVyR2Fpbi5nYWluLnZhbHVlID0gQ09ORklHLm1hc3RlckdhaW47XG4gIH1cbn1cblxuLyoqIEFwcGx5IGEgc291bmQgcHJlc2V0ICovXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlTb3VuZFByZXNldChwcmVzZXROYW1lKSB7XG4gIGNvbnN0IHByZXNldCA9IFNPVU5EX1BSRVNFVFNbcHJlc2V0TmFtZV07XG4gIGlmICghcHJlc2V0KSByZXR1cm4gZmFsc2U7XG4gIGN1cnJlbnRQcmVzZXQgPSBwcmVzZXROYW1lO1xuICBjb25zdCB7IGxhYmVsLCBkZXNjcmlwdGlvbiwgLi4udmFsdWVzIH0gPSBwcmVzZXQ7XG4gIHVwZGF0ZVNvdW5kQ29uZmlnKHZhbHVlcyk7XG4gIHJldHVybiB0cnVlO1xufVxuXG4vKiogR2V0IGN1cnJlbnQgcHJlc2V0IG5hbWUgKi9cbmV4cG9ydCBmdW5jdGlvbiBnZXRDdXJyZW50UHJlc2V0KCkge1xuICByZXR1cm4gY3VycmVudFByZXNldDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFbEYsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7O0FBRTVELENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDO0FBQzlCLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLE9BQU87QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDckUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7QUFDdEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQztBQUN6RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNoRCxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDO0FBQzdELENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUM7QUFDbkIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxTQUFTO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWxGLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDOUQsUUFBUSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDMUQ7O0FBRUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixD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QUFHLENBQUMsT0FBTyxDQUFDO0FBQ3RDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0FBQzVDLE1BQU0sQ0FBQyxNQUFNLENBQUMsS0FBSztBQUNuQixNQUFNLENBQUMsTUFBTSxDQUFDLFdBQVc7O0FBRXpCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLEdBQUcsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDdkIsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNyQixHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ3JCLEdBQUcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDbEIsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ2xCLEdBQUcsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDcEIsR0FBRyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNwQixHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJOztBQUVuQixHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3JCLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDdEIsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDcEMsS0FBSyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ3RELENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ2xILENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUN0SCxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDdkgsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDakgsQ0FBQyxDQUFDO0FBQ0YsS0FBSyxDQUFDLHlCQUF5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUN0QyxHQUFHLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWxDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQztBQUMxQyxNQUFNLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO0FBQzFELFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQy9ELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNGLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZjs7QUFFQSxRQUFRLENBQUMscUJBQXFCLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDM0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNaLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2QsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xCLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxD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S0FBSzs7QUFFcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRixDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWxGLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE9BQU87QUFDcEQsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUM7QUFDekQsQ0FBQyxDQUFDO0FBQ0YsTUFBTSxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDLE1BQU07QUFDdEMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxJQUFJOztBQUVqQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQzdFLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxPQUFPO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQztBQUNGOztBQUVBLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsS0FBSztBQUMzQyxDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRSxDQUFDLENBQUM7QUFDRixNQUFNLENBQUMsUUFBUSxDQUFDLGlDQUFpQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ2pFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUN2RixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNOztBQUVsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxRQUFRO0FBQ2hDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENB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QUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQixDQUFDO0FBQ0QsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVc7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSztBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQztBQUNELENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVk7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBQ0QsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3pELENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNoQyxDQUFDLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUM7QUFDcEUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3QixDQUFDO0FBQ0QsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2pFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDO0FBQ0QsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDO0FBQy9CLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUN2QixDQUFDO0FBQ0QsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDeEIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLO0FBQ2Q7O0FBRUEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzlELFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNoQixDQUFDO0FBQ0QsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUs7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTTtBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3BELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUk7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxJQUFJO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUk7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSTtBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQztBQUNsRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDO0FBQ3pCLENBQUMsQ0FBQztBQUNGOztBQUVBLFFBQVEsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU07QUFDM0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUM7QUFDakIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUN4QyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztBQUM3QixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDO0FBQzlDLENBQUMsQ0FBQztBQUNGOztBQUVBLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLE1BQU07QUFDOUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxVQUFVO0FBQzVDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUN4QixDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUNsRCxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQztBQUNwRSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsZUFBZSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMvRCxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDekUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQzdDLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ25CLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVTtBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNsRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDcEQsQ0FBQyxDQUFDO0FBQ0Y7O0FBRUEsUUFBUSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxNQUFNO0FBQy9DLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsVUFBVTtBQUM1QyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDdkIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDbEQsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQztBQUNyRSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQztBQUNGOztBQUVBLFFBQVEsQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsTUFBTTtBQUNoRCxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFVBQVU7QUFDNUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3ZCLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQ2xELENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxVQUFVLENBQUM7QUFDdEUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDbEQsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMs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QUFDLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQzlFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxZQUFZLENBQUMsZUFBZSxDQUFDLFFBQVEsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDckUsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQzlGLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUN2RCxDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxnQkFBZ0IsQ0FBQztBQUM3RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLGdCQUFnQixDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQy9GLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsSUFBSSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUN4RCxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLFVBQVUsQ0FBQztBQUM3QyxDQUFDLENB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Y0FBYyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDN0I7O0FBRUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUM7QUFDeEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsTUFBTTtBQUNoRixDQUFDLENBQUMsY0FBYyxDQUFDLENBQUM7O0FBRWxCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVztBQUN0QyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUM7O0FBRUgsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDbkYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTTtBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDO0FBQ3BELENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTTtBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsQ0FBQzs7QUFFcEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxTQUFTLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQzs7QUFFL0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUM7O0FBRXhDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNwRSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDOztBQUVwRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE9BQU8sQ0FBQyxRQUFRLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTCxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUM7QUFDbEIsQ0FBQyxDQUFDO0FBQ0Y7O0FBRUEsUUFBUSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzVCOztBQUVBLFFBQVEsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0UsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQztBQUMvQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSztBQUNkOztBQUVBLFFBQVEsQ0FBQywyQkFBMkIsQ0FBQztBQUNyQyxDQUFDLENBQUMsTUFBTTtBQUNSLENBQUMsQ0FBQyxRQUFRO0FBQ1YsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVE7QUFDaEIsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNULENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDcEIsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNsQixDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ2pELENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDdkMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUM7QUFDdEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDckUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7O0FBRVYsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQzFCLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDckQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDNUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7O0FBRXJDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNyRSxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDdEUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsY0FBYyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQzs7QUFFbkQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQztBQUN6QyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRO0FBQzdELENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQztBQUN6QixDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7O0FBRXpCLENBQUMsQ0FBQyx5QkFBeUIsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEtBQUs7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUNsQjs7QUFFQSxRQUFRLENBQUMsNEJBQTRCLENBQUM7QUFDdEMsQ0FBQyxDQUFDLE1BQU07QUFDUixDQUFDLENBQUMsUUFBUTtBQUNWLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRO0FBQ2hCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ2hCLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDbkIsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUNuQixDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ2pCLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ2hCLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDakQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUN0QyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzNDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUNwRCxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDbEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUM1QyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNyRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsa0JBQWtCLENBQUM7QUFDdEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTs7QUFFVixDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDMUIsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUN2RCxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxZQUFZLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDOztBQUVuRyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDekIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNyRCxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNqRixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQzs7QUFFdEMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDN0MsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsNEJBQTRCLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ3JFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDO0FBQzVGLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUMzRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDOztBQUVuRCxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsUUFBUSxDQUFDO0FBQzlDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDN0QsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQzs7QUFFekIsQ0FBQyxDQUFDLHlCQUF5QixDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RFLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVTtBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUN2Qjs7QUFFQSxRQUFRLENBQUMsMkJBQTJCLENBQUM7QUFDckMsQ0FBQyxDQUFDLE1BQU07QUFDUixDQUFDLENBQUMsUUFBUTtBQUNWLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRO0FBQ2hCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsU0FBUztBQUNYLENBQUMsQ0FBQyxZQUFZO0FBQ2QsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQzFCLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLFdBQVc7QUFDYixDQUFDLENBQUMsU0FBUztBQUNYLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ25CLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ2hCLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU07QUFDakQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUN0QyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzNDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsZ0JBQWdCLENBQUMsQ0FBQztBQUNwRCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUM7QUFDeEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLGdCQUFnQixDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDVixDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsQ0FBQztBQUN0QyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDLENBQUM7QUFDdEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDaEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUN0RSxDQUFDLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRO0FBQ3JFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQztBQUN0QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJOztBQUVWLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUM5QixDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsU0FBUyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDMUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUMvRCxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsNEJBQTRCO0FBQ25ELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxJQUFJLENBQUMsY0FBYyxDQUFDLFlBQVksQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUM3RCxDQUFDLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDckYsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUM5QixDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsV0FBVyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3pELENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3JGLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDOztBQUV6QyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDL0IsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNqRSxDQUFDLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyw0QkFBNEIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUM7QUFDbkYsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7O0FBRTFDLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUN6RSxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQztBQUNoRyxDQUFDLENBQUMsWUFBWSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7O0FBRS9FLENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxhQUFhLENBQUMsSUFBSSxDQUFDLDRCQUE0QixDQUFDLFNBQVMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUMzRSxDQUFDLENBQUMsYUFBYSxDQUFDLElBQUksQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNsRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxjQUFjLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDOztBQUVuRCxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxVQUFVLENBQUMsQ0FBQyxPQUFPLENBQUMsWUFBWSxDQUFDO0FBQ3RELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLGdCQUFnQixDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztBQUMxRixDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO0FBQ25ELENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVk7QUFDekUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYTtBQUM1RSxDQUFDLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUM7QUFDN0IsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQzs7QUFFOUIsQ0FBQyxDQUFDLHlCQUF5QixDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNqRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVTtBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVTtBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVk7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYTtBQUNuQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7QUFDekIsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7QUFDeEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDckQ7O0FBRUEsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUk7QUFDOUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxJQUFJO0FBQ3hELENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTTtBQUNwRixDQUFDLENBQUM7QUFDRixNQUFNLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQztBQUNyQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDaEMsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7O0FBRXRGLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQywwQkFBMEI7QUFDbkQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLCtCQUErQixDQUFDLGNBQWMsQ0FBQztBQUNuRSxDQUFDLENBQUMsMEJBQTBCLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsK0JBQStCLENBQUMsTUFBTTs7QUFFNUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDekQsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsVUFBVTtBQUN6QyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFlBQVk7QUFDN0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ2pFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNoRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDaEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUNqRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDakYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFN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Q0FBQztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUM7QUFDRixDQUFDO0FBQ0QsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxpQkFBaUI7QUFDbEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDcEIsQ0FBQztBQUNELENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSztBQUNkOztBQUVBLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFbEYsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsS0FBSztBQUMxRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVU7QUFDbkYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLE1BQU0sQ0FBQyxHQUFHO0FBQ3RFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO0FBQzlELENBQUMsQ0FBQztBQUNGLE1BQU0sQ0FBQyxRQUFRLENB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QUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3JCOztBQUVBLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdkMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNoRSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNwQixDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUN2QixDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEtBQUssQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLE9BQU87QUFDdkQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUNwRCxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUM7QUFDOUQsQ0FBQztBQUNELENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQztBQUMxRCxDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUM3QixDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FB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QUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3hFLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFNBQVMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDL0QsQ0FBQyxDQUFDLENBQUM7QUFDSCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtB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QUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUM1QixDQUFDLENBQUM7QUFDRixDQUFDO0FBQ0QsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDO0FBQ2hCLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQzFCLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDO0FBQ3pDOztBQUVBLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzFDOztBQUVBLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUM1RCxRQUFRLENBQUMsZUFBZSxDQUFDLFNBQVMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3RELENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDO0FBQzVGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQzs7QUFFSCxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGtCQUFrQjtBQUN2QyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDL0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7O0FBRWxDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLHNCQUFzQixDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDdkYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQzs7QUFFOUQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvRSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUM7O0FBRXhGLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ25EOztBQUVBLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUN4RCxRQUFRLENBQUMsaUJBQWlCLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUMzQixDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pFLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVU7QUFDNUIsQ0FBQztBQUNELENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDekQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ2xFLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3JDLENBQUM7QUFDRCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDbkQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pFOztBQUVBLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEYsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFbEYsQ0FBQyxDQUFDLENB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