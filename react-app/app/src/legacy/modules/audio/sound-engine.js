// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    SOUND ENGINE — "SOFT ORGANIC IMPACTS"                     ║
// ║    Realistic, non-melodic collision sounds with intensity-driven dynamics    ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getState } from '../core/state.js';

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
  
  // Volume / dynamics (reduced 50% for subtle chimes)
  minGain: 0.001,
  maxGain: 0.0125,
  masterGain: 0.28,
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
const contactMotifVoices = new Set();
const CONTACT_RIPPLE_MOTIF_VARIATIONS = Object.freeze([
  Object.freeze({ id: 'bright-tight', ringDelayScale: 0.96, panSpread: 0.14, pressureGain: 0.96, brightness: 1.16 }),
  Object.freeze({ id: 'bright-wide-left', ringDelayScale: 1.00, panSpread: 0.22, pressureGain: 0.92, brightness: 1.10 }),
  Object.freeze({ id: 'bright-wide-right', ringDelayScale: 1.04, panSpread: 0.26, pressureGain: 0.90, brightness: 1.18 }),
  Object.freeze({ id: 'warm-long', ringDelayScale: 1.08, panSpread: 0.18, pressureGain: 0.98, brightness: 1.06 }),
]);
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
      Math.max(80, harmonicFrequency * 0.88),
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
 * Contact activation motif: a positive pressure-wave bloom synced to the
 * visible ripple. The press stays tactile, then five airy ring pulses travel
 * outward and decay into a longer shimmer tail.
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
    { label: 'soft-pressure-hit', offset: 0.012, duration: 0.24 },
    { label: 'ring-one', offset: ringOffsets[0], duration: 0.20, release: 0.24 },
    { label: 'ring-two', offset: ringOffsets[1], duration: 0.26, release: 0.32 },
    { label: 'ring-three', offset: ringOffsets[2], duration: 0.34, release: 0.42 },
    { label: 'ring-four', offset: ringOffsets[3], duration: 0.43, release: 0.55 },
    { label: 'ring-five', offset: ringOffsets[4], duration: 0.50, release: 0.56 },
    { label: 'air-tail', offset: 1.36 * variation.ringDelayScale, duration: 0.42, release: 0.50 },
  ];

  recordSoundDebugEvent('contact-ripple-motif', 'sound-engine:contact-ripple-motif', {
    character: 'positive-pressure-wave-ripple',
    motif: 'snap-lift-five-rings-air-tail',
    layerCount: 4,
    noteCount: pressureEvents.length,
    variation: variation.id,
    variationIndex,
    variationCount: CONTACT_RIPPLE_MOTIF_VARIATIONS.length,
    ringOffsetsMs: ringOffsets.map((offset) => Math.round(offset * 1000)),
    tailReleaseMs: 560,
    durationMs: Math.round(Math.max(...pressureEvents.map((event) => (
      event.offset + event.duration + (event.release ?? 0.30)
    ))) * 1000),
    frequencies: [132, 440, 523, 659, 784, 880, 659],
  });

  scheduleContactPressureSnap({
    offset: 0,
    duration: 0.034,
    gain: 0.017 * pressureGain,
    filterStart: 5200 * brightness,
    filterEnd: 2600 * brightness,
  });
  scheduleContactPressureThump({
    offset: 0.012,
    duration: 0.18,
    gain: 0.010 * pressureGain,
    frequency: 132,
    frequencyEnd: 108,
    filterStart: 1100 * brightness,
    filterEnd: 520,
    release: 0.10,
  });
  scheduleContactPressureRing({
    offset: ringOffsets[0],
    duration: 0.20,
    gain: 0.0130 * pressureGain,
    pan: -variation.panSpread,
    frequency: 440 * brightness,
    frequencyEnd: 466 * brightness,
    harmonicFrequency: 880 * brightness,
    harmonicGain: 0.0032 * pressureGain,
    filterStart: 3300 * brightness,
    filterEnd: 1680 * brightness,
    noiseGain: 0.0058,
    release: 0.24,
  });
  scheduleContactPressureRing({
    offset: ringOffsets[1],
    duration: 0.26,
    gain: 0.0140 * pressureGain,
    pan: variation.panSpread,
    frequency: 523 * brightness,
    frequencyEnd: 587 * brightness,
    harmonicFrequency: 1046 * brightness,
    harmonicGain: 0.0034 * pressureGain,
    filterStart: 3120 * brightness,
    filterEnd: 1520 * brightness,
    noiseGain: 0.0054,
    release: 0.32,
  });
  scheduleContactPressureRing({
    offset: ringOffsets[2],
    duration: 0.34,
    gain: 0.0135 * pressureGain,
    pan: 0,
    frequency: 659 * brightness,
    frequencyEnd: 698 * brightness,
    harmonicFrequency: 1318 * brightness,
    harmonicGain: 0.0032 * pressureGain,
    filterStart: 2860 * brightness,
    filterEnd: 1360 * brightness,
    noiseGain: 0.0048,
    release: 0.42,
  });
  scheduleContactPressureRing({
    offset: ringOffsets[3],
    duration: 0.43,
    gain: 0.0120 * pressureGain,
    pan: variation.panSpread * 0.52,
    frequency: 784 * brightness,
    frequencyEnd: 880 * brightness,
    harmonicFrequency: 1568 * brightness,
    harmonicGain: 0.0029 * pressureGain,
    filterStart: 2600 * brightness,
    filterEnd: 1180 * brightness,
    noiseGain: 0.0042,
    release: 0.55,
  });
  scheduleContactPressureRing({
    offset: ringOffsets[4],
    duration: 0.50,
    gain: 0.0090 * pressureGain,
    pan: -variation.panSpread * 0.32,
    frequency: 880 * brightness,
    frequencyEnd: 784 * brightness,
    harmonicFrequency: 1760 * brightness,
    harmonicGain: 0.0024 * pressureGain,
    filterStart: 2240 * brightness,
    filterEnd: 980 * brightness,
    noiseGain: 0.0036,
    release: 0.56,
  });
  scheduleContactPressureRing({
    offset: 1.36 * variation.ringDelayScale,
    duration: 0.42,
    gain: 0.0068 * pressureGain,
    pan: 0,
    frequency: 659 * brightness,
    frequencyEnd: 587 * brightness,
    harmonicFrequency: 1318 * brightness,
    harmonicGain: 0.0018 * pressureGain,
    filterStart: 1780 * brightness,
    filterEnd: 760 * brightness,
    noiseGain: 0.0022,
    release: 0.50,
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
