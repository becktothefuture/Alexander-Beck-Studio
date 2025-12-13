// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    SOUND ENGINE — "UNDERWATER PEBBLES"                       ║
// ║        Dreamy, muffled collision sounds using Web Audio API synthesis        ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

/**
 * Sound Design: Underwater Pebbles
 * - Sine wave body with subtle 2nd harmonic for warmth
 * - Low-pass filter (2-3.5kHz) simulates water absorption
 * - Shared reverb bus for cohesion
 * - Pentatonic pitch mapping ensures pleasant overlaps
 * - Ball radius → pitch (large = low, small = high)
 * - Collision intensity → volume + filter brightness
 */

// ════════════════════════════════════════════════════════════════════════════════
// PENTATONIC SCALE FREQUENCIES (C Major Pentatonic: C-D-E-G-A)
// Always harmonious when multiple sounds overlap
// ════════════════════════════════════════════════════════════════════════════════
const PENTATONIC_FREQUENCIES = [
  131.0,  // C3
  147.0,  // D3
  165.0,  // E3
  196.0,  // G3
  220.0,  // A3
  262.0,  // C4
  294.0,  // D4
  330.0,  // E4
  392.0,  // G4
  440.0,  // A4
  523.0,  // C5
];

// ════════════════════════════════════════════════════════════════════════════════
// MICRO-VARIATION HELPERS — The Secret to Realistic Sound
// Real-world collisions NEVER sound identical. These helpers add organic variance.
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Add random variance to a value
 * @param {number} base - Base value
 * @param {number} variance - Max % variance (0.15 = ±15%)
 * @returns {number}
 */
function vary(base, variance = 0.15) {
  return base * (1 + (Math.random() - 0.5) * 2 * variance);
}

/**
 * Random value in range
 */
function randRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Weighted random choice (for occasional "character" hits)
 * @param {number} probability - 0-1, chance of returning true
 */
function chance(probability) {
  return Math.random() < probability;
}

// ════════════════════════════════════════════════════════════════════════════════
// CONFIGURATION (mutable for runtime tweaking)
// ════════════════════════════════════════════════════════════════════════════════
let CONFIG = {
  // Synthesis — instant attack, soft decay
  attackTime: 0,               // 0ms = instant onset (sub-1ms response)
  decayTime: 0.055,            // Slightly longer for warmth
  harmonicGain: 0.18,          // More body/warmth to counter tinny-ness
  
  // Filter — warm, not tinny
  filterBaseFreq: 1400,        // Warmer: reduced high-end
  filterVelocityRange: 280,    // Less brightness swing
  filterQ: 0.35,               // Softer resonance
  
  // Reverb — gentle tail
  reverbDecay: 0.18,           // Wooden: drier room
  reverbWetMix: 0.12,          // Wooden: low wet mix
  reverbHighDamp: 0.65,        // Damped highs
  
  // Volume — soft but clicky
  minGain: 0.03,               // Lower floor (avoid constant "ticking")
  maxGain: 0.18,               // Cap peaks (keeps scene calm)
  masterGain: 0.42,            // Lower overall loudness
  
  // Performance (voice pool size is fixed at 8)
  minTimeBetweenSounds: 0.008, // Per-ball debounce (8ms, tighter)
  
  // Stereo
  maxPan: 0.22,                // Subtle width
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // REALISTIC VARIATION — What makes it sound alive, not synthetic
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Transient noise burst (the "snap" at moment of impact)
  noiseTransientEnabled: true,
  noiseTransientGain: 0.28,      // Reduced for less harshness
  noiseTransientDecay: 0.010,    // Slightly longer (10ms) - softer attack
  noiseTransientFilterMin: 1200, // Darker transient base
  noiseTransientFilterMax: 3500, // Reduced upper bound (less harsh)
  
  // Micro-variation ranges (0.15 = ±15% random variation per hit)
  variancePitch: 0.08,           // Pitch wobble (±8%)
  varianceDecay: 0.25,           // Decay time (±25%)
  varianceGain: 0.20,            // Volume (±20%)
  varianceFilter: 0.18,          // Brightness (±18%)
  varianceNoise: 0.30,           // Transient intensity (±30%)
  
  // Inharmonic partials (what makes wood sound like wood, not a synth)
  inharmonicityEnabled: true,
  inharmonicSpread: 0.012,       // 2nd harmonic is ~1.2% sharp (typical of wood)
  thirdHarmonicGain: 0.06,       // Add subtle 3rd partial
  thirdHarmonicInharm: 0.018,    // 3rd is slightly more detuned
  
  // Velocity-sensitive timbre (soft=warm/mellow, hard=punchy but not harsh)
  velocityNoiseScale: 2.0,       // Reduced: hard hits get 2x transient noise
  velocityBrightnessScale: 1.3,  // Reduced: less brightness boost on hard hits
  velocityDecayScale: 0.7,       // Slightly longer decay for warmth
  
  // Occasional "character" hits (rare, distinctive sounds)
  characterHitChance: 0.08,      // 8% of hits get extra character
  characterBrightnessBoost: 1.4, // Character hits are 40% brighter
  characterResonanceBoost: 1.6,  // Character hits have more resonance

  // ═══════════════════════════════════════════════════════════════════════════════
  // TONE SAFETY (anti-harshness at extremes + anti-clipping headroom)
  // ═══════════════════════════════════════════════════════════════════════════════
  // Prevent “ugly” sound at the edges of the tone range by softly:
  // - reducing gain for very high / very low notes
  // - reducing brightness for very high notes
  // - clamping filter to a safe range
  //
  // This is *not* a hard clamp that kills expressiveness — it’s a gentle curve.
  toneSafetyMinHz: 120,        // Covers slight detune below C3
  toneSafetyMaxHz: 600,        // Covers slight detune above C5
  toneSafetyExponent: 2.2,     // Higher = more focused attenuation at extremes
  toneSafetyHighGainAtten: 0.22, // Up to -22% gain at very high notes
  toneSafetyLowGainAtten: 0.10,  // Up to -10% gain at very low notes
  toneSafetyHighBrightAtten: 0.30, // Up to -30% filter freq at very high notes

  filterMinHz: 450,            // Avoid “mud” + prevent weird lowpass edge behavior
  filterMaxHz: 5200,           // Avoid brittle highs / aliasy edge cases

  voiceGainMax: 0.25,          // Final per-voice ceiling (pre-master), prevents spikes
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ENERGY-BASED SOUND SYSTEM — Small Wooden Play Circles
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Collision threshold (only significant impacts make sound)
  collisionMinImpact: 0.60,    // 60% threshold - only noticeable collisions
  
  // Rolling rumble (wood-on-surface friction) — DISABLED by default
  // Background should be quiet; collisions only
  rollingEnabled: false,
  rollingMaxVelocity: 80,
  rollingMinVelocity: 15,
  rollingGain: 0,              // Silent
  rollingFreq: 130,
  
  // Air whoosh — DISABLED for small wooden pieces
  // These are too small/light to displace air audibly
  whooshEnabled: false,        // ← Disabled! Not realistic for small objects
  whooshMinVelocity: 500,      // (unused)
  whooshGain: 0.0,             // (unused)
  whooshFreq: 800,             // (unused)
};

// ════════════════════════════════════════════════════════════════════════════════
// SOUND PRESETS — 6 Refined, Balanced Presets
// ════════════════════════════════════════════════════════════════════════════════
// Philosophy: Subtle but responsive. Each preset has distinct character while
// maintaining consistent quality. All use 60% silence threshold for clean sound.
// ════════════════════════════════════════════════════════════════════════════════
export const SOUND_PRESETS = {

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. NATURAL WOOD — Warm, organic, the refined default
  // ═══════════════════════════════════════════════════════════════════════════════
  naturalWood: {
    label: 'Natural Wood',
    description: 'Warm organic tones · soft body · refined default',
    attackTime: 0,
    decayTime: 0.058,
    harmonicGain: 0.16,
    filterBaseFreq: 1350,
    filterVelocityRange: 300,
    filterQ: 0.32,
    reverbDecay: 0.20,
    reverbWetMix: 0.14,
    masterGain: 0.44,
    minGain: 0.03,
    maxGain: 0.17,
    collisionMinImpact: 0.60,
    rollingEnabled: false,
    rollingGain: 0,
    rollingFreq: 130,
    rollingMinVelocity: 14,
    rollingMaxVelocity: 85,
    whooshEnabled: false,
    noiseTransientEnabled: true,
    noiseTransientGain: 0.24,
    noiseTransientDecay: 0.011,
    noiseTransientFilterMin: 1100,
    noiseTransientFilterMax: 3200,
    variancePitch: 0.07,
    varianceDecay: 0.22,
    varianceGain: 0.18,
    varianceFilter: 0.16,
    varianceNoise: 0.28,
    inharmonicityEnabled: true,
    inharmonicSpread: 0.010,
    thirdHarmonicGain: 0.07,
    velocityNoiseScale: 1.8,
    velocityBrightnessScale: 1.25,
    characterHitChance: 0.07,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. SOFT CERAMIC — Smooth, refined, gentle brightness
  // ═══════════════════════════════════════════════════════════════════════════════
  softCeramic: {
    label: 'Soft Ceramic',
    description: 'Smooth refined touch · gentle brightness · elegant',
    attackTime: 0,
    decayTime: 0.048,
    harmonicGain: 0.11,
    filterBaseFreq: 1700,
    filterVelocityRange: 380,
    filterQ: 0.38,
    reverbDecay: 0.24,
    reverbWetMix: 0.18,
    masterGain: 0.42,
    minGain: 0.03,
    maxGain: 0.16,
    collisionMinImpact: 0.60,
    rollingEnabled: false,
    rollingGain: 0,
    rollingFreq: 130,
    rollingMinVelocity: 14,
    rollingMaxVelocity: 85,
    whooshEnabled: false,
    noiseTransientEnabled: true,
    noiseTransientGain: 0.30,
    noiseTransientDecay: 0.008,
    noiseTransientFilterMin: 1400,
    noiseTransientFilterMax: 3800,
    variancePitch: 0.06,
    varianceDecay: 0.20,
    varianceGain: 0.16,
    varianceFilter: 0.14,
    varianceNoise: 0.25,
    inharmonicityEnabled: false,
    inharmonicSpread: 0.006,
    thirdHarmonicGain: 0.04,
    velocityNoiseScale: 2.0,
    velocityBrightnessScale: 1.35,
    characterHitChance: 0.09,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. RIVER PEBBLES — Tactile, natural, satisfying clicks
  // ═══════════════════════════════════════════════════════════════════════════════
  riverPebbles: {
    label: 'River Pebbles',
    description: 'Tactile stone clicks · natural variation · satisfying',
    attackTime: 0,
    decayTime: 0.042,
    harmonicGain: 0.13,
    filterBaseFreq: 1900,
    filterVelocityRange: 450,
    filterQ: 0.45,
    reverbDecay: 0.22,
    reverbWetMix: 0.16,
    masterGain: 0.45,
    minGain: 0.035,
    maxGain: 0.18,
    collisionMinImpact: 0.60,
    rollingEnabled: false,
    rollingGain: 0,
    rollingFreq: 110,
    rollingMinVelocity: 14,
    rollingMaxVelocity: 85,
    whooshEnabled: false,
    noiseTransientEnabled: true,
    noiseTransientGain: 0.34,
    noiseTransientDecay: 0.007,
    noiseTransientFilterMin: 1500,
    noiseTransientFilterMax: 4200,
    variancePitch: 0.08,
    varianceDecay: 0.24,
    varianceGain: 0.20,
    varianceFilter: 0.18,
    varianceNoise: 0.30,
    inharmonicityEnabled: false,
    inharmonicSpread: 0.008,
    thirdHarmonicGain: 0.05,
    velocityNoiseScale: 2.2,
    velocityBrightnessScale: 1.45,
    characterHitChance: 0.10,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. FELT TOUCH — Ultra-soft, intimate, muffled warmth
  // ═══════════════════════════════════════════════════════════════════════════════
  feltTouch: {
    label: 'Felt Touch',
    description: 'Ultra-soft · intimate warmth · gentle presence',
    attackTime: 0,
    decayTime: 0.068,
    harmonicGain: 0.20,
    filterBaseFreq: 1100,
    filterVelocityRange: 200,
    filterQ: 0.28,
    reverbDecay: 0.30,
    reverbWetMix: 0.22,
    masterGain: 0.40,
    minGain: 0.025,
    maxGain: 0.14,
    collisionMinImpact: 0.60,
    rollingEnabled: false,
    rollingGain: 0,
    rollingFreq: 100,
    rollingMinVelocity: 14,
    rollingMaxVelocity: 85,
    whooshEnabled: false,
    noiseTransientEnabled: true,
    noiseTransientGain: 0.16,
    noiseTransientDecay: 0.014,
    noiseTransientFilterMin: 900,
    noiseTransientFilterMax: 2400,
    variancePitch: 0.06,
    varianceDecay: 0.20,
    varianceGain: 0.15,
    varianceFilter: 0.12,
    varianceNoise: 0.22,
    inharmonicityEnabled: true,
    inharmonicSpread: 0.008,
    thirdHarmonicGain: 0.09,
    velocityNoiseScale: 1.4,
    velocityBrightnessScale: 1.15,
    characterHitChance: 0.05,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. GLASS MARBLES — Clear, bright but controlled, playful
  // ═══════════════════════════════════════════════════════════════════════════════
  glassMarbles: {
    label: 'Glass Marbles',
    description: 'Clear bright tones · playful clicks · controlled sparkle',
    attackTime: 0,
    decayTime: 0.038,
    harmonicGain: 0.08,
    filterBaseFreq: 2200,
    filterVelocityRange: 500,
    filterQ: 0.52,
    reverbDecay: 0.26,
    reverbWetMix: 0.20,
    masterGain: 0.40,
    minGain: 0.03,
    maxGain: 0.16,
    collisionMinImpact: 0.60,
    rollingEnabled: false,
    rollingGain: 0,
    rollingFreq: 140,
    rollingMinVelocity: 14,
    rollingMaxVelocity: 85,
    whooshEnabled: false,
    noiseTransientEnabled: true,
    noiseTransientGain: 0.32,
    noiseTransientDecay: 0.006,
    noiseTransientFilterMin: 1800,
    noiseTransientFilterMax: 4500,
    variancePitch: 0.09,
    varianceDecay: 0.26,
    varianceGain: 0.20,
    varianceFilter: 0.18,
    varianceNoise: 0.30,
    inharmonicityEnabled: false,
    inharmonicSpread: 0.004,
    thirdHarmonicGain: 0.03,
    velocityNoiseScale: 2.4,
    velocityBrightnessScale: 1.5,
    characterHitChance: 0.12,
  },

  // ═══════════════════════════════════════════════════════════════════════════════
  // 6. MUTED CLAY — Earthy, deep, grounded warmth
  // ═══════════════════════════════════════════════════════════════════════════════
  mutedClay: {
    label: 'Muted Clay',
    description: 'Earthy deep tones · grounded warmth · subtle presence',
    attackTime: 0,
    decayTime: 0.065,
    harmonicGain: 0.22,
    filterBaseFreq: 1000,
    filterVelocityRange: 220,
    filterQ: 0.30,
    reverbDecay: 0.28,
    reverbWetMix: 0.18,
    masterGain: 0.46,
    minGain: 0.03,
    maxGain: 0.16,
    collisionMinImpact: 0.60,
    rollingEnabled: false,
    rollingGain: 0,
    rollingFreq: 90,
    rollingMinVelocity: 14,
    rollingMaxVelocity: 85,
    whooshEnabled: false,
    noiseTransientEnabled: true,
    noiseTransientGain: 0.20,
    noiseTransientDecay: 0.012,
    noiseTransientFilterMin: 800,
    noiseTransientFilterMax: 2600,
    variancePitch: 0.07,
    varianceDecay: 0.24,
    varianceGain: 0.18,
    varianceFilter: 0.15,
    varianceNoise: 0.26,
    inharmonicityEnabled: true,
    inharmonicSpread: 0.014,
    thirdHarmonicGain: 0.10,
    velocityNoiseScale: 1.6,
    velocityBrightnessScale: 1.2,
    characterHitChance: 0.06,
  },
};

let currentPreset = 'naturalWood';

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

let isEnabled = false;
let isUnlocked = false;

// Voice pool for efficient sound playback (reusable nodes)
const VOICE_POOL_SIZE = 8; // Max simultaneous sounds
let voicePool = [];
let lastGlobalSoundTime = 0;
const GLOBAL_MIN_INTERVAL = 0.005; // 5ms between ANY sounds (200 sounds/sec max)

let lastSoundTime = new Map(); // ball id → timestamp

// Reduced motion preference
let prefersReducedMotion = false;

// ════════════════════════════════════════════════════════════════════════════════
// AMBIENT SOUND SOURCES (continuous, energy-modulated)
// ════════════════════════════════════════════════════════════════════════════════
let rollingOsc = null;        // Low-frequency oscillator for rumble
let rollingGain = null;       // Gain control for rolling
let rollingFilter = null;     // Low-pass for warmth

let whooshNoise = null;       // Noise source for whoosh
let whooshGain = null;        // Gain control for whoosh
let whooshFilter = null;      // Band-pass for air sound

// Energy tracking (smoothed for natural transitions)
let currentRollingEnergy = 0;
let currentWhooshEnergy = 0;
const ENERGY_SMOOTH = 0.15;   // Smoothing factor (0-1, lower = smoother)

// ════════════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Initialize the sound engine (call once at startup)
 * Does NOT create AudioContext yet — that requires user interaction
 */
export function initSoundEngine() {
  // Check reduced motion preference
  if (typeof window !== 'undefined' && window.matchMedia) {
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    prefersReducedMotion = motionQuery.matches;
    motionQuery.addEventListener('change', (e) => {
      prefersReducedMotion = e.matches;
    });
  }
  
  console.log('✓ Sound engine initialized (awaiting user unlock)');
}

/**
 * Unlock audio (must be called from user gesture like click)
 * Creates AudioContext and builds the audio graph
 */
export async function unlockAudio() {
  if (isUnlocked) return true;
  
  try {
    // Create AudioContext with lowest latency possible
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      console.warn('Web Audio API not supported');
      return false;
    }
    
    // 'interactive' = smallest buffer size for real-time response
    // Typically 128 samples @ 44.1kHz = ~2.9ms latency
    audioContext = new AudioCtx({ 
      latencyHint: 'interactive',
      sampleRate: 44100  // Standard rate, well-optimized
    });
    
    // Resume if suspended (Safari requirement)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Build audio graph
    buildAudioGraph();
    
    isUnlocked = true;
    isEnabled = true;
    
    // Log actual latency achieved
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
 * Voice Pool → [Dry + Reverb] → Soft Clip → Limiter → Master → Output
 */
function buildAudioGraph() {
  // Master gain (overall volume control)
  masterGain = audioContext.createGain();
  masterGain.gain.value = CONFIG.masterGain;
  
  // Limiter (prevent clipping with many simultaneous sounds)
  limiter = audioContext.createDynamicsCompressor();
  limiter.threshold.value = -3;
  limiter.knee.value = 6;
  limiter.ratio.value = 12;
  limiter.attack.value = 0.001;
  limiter.release.value = 0.1;

  // Soft clipper (gentle safety before the limiter)
  saturator = audioContext.createWaveShaper();
  saturator.curve = makeSoftClipCurve(0.85);
  saturator.oversample = '2x';
  
  // Dry/wet routing for reverb
  dryGain = audioContext.createGain();
  dryGain.gain.value = 1 - CONFIG.reverbWetMix;
  
  wetGain = audioContext.createGain();
  wetGain.gain.value = CONFIG.reverbWetMix;
  
  // Create reverb (algorithmic approach using delay network)
  reverbNode = createReverbEffect();
  const reverbOut = reverbNode?._output || reverbNode;
  
  // Connect graph
  dryGain.connect(saturator);
  wetGain.connect(reverbNode);
  reverbOut.connect(saturator);
  saturator.connect(limiter);
  limiter.connect(masterGain);
  masterGain.connect(audioContext.destination);
  
  // Initialize voice pool
  initVoicePool();
  
  // Initialize ambient sounds (rolling rumble + air whoosh)
  initAmbientSounds();
}

/**
 * Create a gentle soft-clipping curve (tanh-style)
 * @param {number} amount - 0..1 (higher = more saturation)
 */
function makeSoftClipCurve(amount = 0.8) {
  const n = 1024;
  const curve = new Float32Array(n);
  const drive = 1 + amount * 8; // 1..9
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / (n - 1) - 1; // -1..1
    // Smooth saturation: tanh(drive*x) / tanh(drive)
    curve[i] = Math.tanh(drive * x) / Math.tanh(drive);
  }
  return curve;
}

/**
 * Initialize continuous ambient sound sources
 * These run constantly but with gain = 0 until energy is fed in
 */
function initAmbientSounds() {
  // ─── ROLLING TEXTURE ────────────────────────────────────────────────────────
  // Wood-on-surface friction: primarily noise with subtle tonal component
  // Think: wooden beads rolling on a table, gentle and textured
  if (CONFIG.rollingEnabled) {
    // Subtle tonal component (triangle wave = slightly wooden)
    rollingOsc = audioContext.createOscillator();
    rollingOsc.type = 'triangle';
    rollingOsc.frequency.value = CONFIG.rollingFreq;
    
    const rollingOscGain = audioContext.createGain();
    rollingOscGain.gain.value = 0.3; // Tonal is secondary to noise
    
    // Primary: filtered noise (friction texture)
    const rollingNoise = createNoiseSource();
    const rollingNoiseGain = audioContext.createGain();
    rollingNoiseGain.gain.value = 0.7; // Noise is primary (friction)
    
    // Bandpass filter for "woody" character (not too bassy, not too hissy)
    rollingFilter = audioContext.createBiquadFilter();
    rollingFilter.type = 'bandpass';
    rollingFilter.frequency.value = 350;  // Mid-range, wooden
    rollingFilter.Q.value = 0.8;          // Gentle bandwidth
    
    rollingGain = audioContext.createGain();
    rollingGain.gain.value = 0; // Start silent
    
    // Connect: (osc + noise) → filter → gain → dry bus
    rollingOsc.connect(rollingOscGain);
    rollingOscGain.connect(rollingFilter);
    rollingNoise.connect(rollingNoiseGain);
    rollingNoiseGain.connect(rollingFilter);
    rollingFilter.connect(rollingGain);
    rollingGain.connect(dryGain);
    
    rollingOsc.start();
  }
  
  // ─── AIR WHOOSH ─────────────────────────────────────────────────────────────
  // Filtered noise for wind/air displacement
  if (CONFIG.whooshEnabled) {
    whooshNoise = createNoiseSource();
    
    whooshFilter = audioContext.createBiquadFilter();
    whooshFilter.type = 'bandpass';
    whooshFilter.frequency.value = CONFIG.whooshFreq;
    whooshFilter.Q.value = 0.8;
    
    whooshGain = audioContext.createGain();
    whooshGain.gain.value = 0; // Start silent
    
    // Connect: noise → filter → gain → dry bus
    whooshNoise.connect(whooshFilter);
    whooshFilter.connect(whooshGain);
    whooshGain.connect(dryGain);
  }
}

/**
 * Create a white noise source (for rumble texture and whoosh)
 */
function createNoiseSource() {
  const bufferSize = audioContext.sampleRate * 2; // 2 seconds
  const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
  const data = buffer.getChannelData(0);
  
  // Fill with white noise
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  
  const noise = audioContext.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  noise.start();
  
  return noise;
}

/**
 * Initialize the voice pool with pre-allocated audio nodes
 * Each voice has: oscillators, filter, envelope, panner, noise transient
 */
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
      // Noise transient chain (the "snap" at moment of impact)
      noiseFilter: audioContext.createBiquadFilter(),
      noiseEnvelope: audioContext.createGain(),
      // Oscillators created per-use (can't restart, but lightweight)
      osc: null,
      osc2: null,
      osc3: null,      // 3rd harmonic for richness
      harmGain: null,
      harm3Gain: null, // 3rd harmonic gain
      noiseSource: null,
    };
    
    // Configure main filter
    voice.filter.type = 'lowpass';
    
    // Configure noise filter (bandpass for that woody "crack")
    voice.noiseFilter.type = 'bandpass';
    voice.noiseFilter.Q.value = 1.2;
    
    // Connect persistent chain: filter → envelope → panner → dry/wet
    voice.filter.connect(voice.envelope);
    voice.envelope.connect(voice.panner);
    voice.panner.connect(dryGain);
    voice.panner.connect(voice.reverbSend);
    voice.reverbSend.connect(wetGain);
    
    // Noise transient chain: noiseFilter → noiseEnvelope → panner (shares panner)
    voice.noiseFilter.connect(voice.noiseEnvelope);
    voice.noiseEnvelope.connect(voice.panner);
    
    voicePool.push(voice);
  }
}

/**
 * Create a short noise burst source for transient "snap"
 * Uses pre-generated noise buffer for efficiency
 */
let sharedNoiseBuffer = null;
function createTransientNoise() {
  // Create shared buffer once (2 seconds, loops)
  if (!sharedNoiseBuffer) {
    const bufferSize = audioContext.sampleRate * 2;
    sharedNoiseBuffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = sharedNoiseBuffer.getChannelData(0);
    
    // Pink-ish noise (more natural than pure white)
    // Simple approximation: low-pass filtered white noise
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
  // Randomize start position for variety
  noise.loopStart = Math.random() * 1.5;
  noise.loopEnd = noise.loopStart + 0.1;
  noise.loop = false; // Don't loop - just a burst
  
  return noise;
}

/**
 * Create a simple algorithmic reverb using feedback delay network
 * More efficient than ConvolverNode for real-time synthesis
 */
function createReverbEffect() {
  const input = audioContext.createGain();
  const output = audioContext.createGain();
  
  // Multi-tap delay network for diffuse reverb
  const delays = [0.029, 0.037, 0.053, 0.067]; // Prime-ish ratios for diffusion
  const feedbackGain = 0.4; // Controls reverb length
  
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
  
  // High-frequency damping filter (underwater sound absorption)
  const dampingFilter = audioContext.createBiquadFilter();
  dampingFilter.type = 'lowpass';
  dampingFilter.frequency.value = 2000 * (1 - CONFIG.reverbHighDamp);
  dampingFilter.Q.value = 0.5;
  
  // Connect delay network
  delayNodes.forEach((delay, i) => {
    input.connect(delay);
    delay.connect(feedbacks[i]);
    feedbacks[i].connect(dampingFilter);
    // Cross-feed to next delay for diffusion
    feedbacks[i].connect(delayNodes[(i + 1) % delayNodes.length]);
  });
  
  dampingFilter.connect(output);
  input.connect(output); // Early reflections
  
  // Return as pseudo-node
  input._output = output;
  return input;
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
  // Skip if disabled or not unlocked
  if (!isEnabled || !isUnlocked || !audioContext) return;
  
  // Skip if reduced motion preferred
  if (prefersReducedMotion) return;
  
  // ═══ ENERGY THRESHOLD: Soft touches are silent (like real life) ═══
  if (intensity < CONFIG.collisionMinImpact) return;
  
  const now = audioContext.currentTime;
  
  // Global rate limiter (max ~200 sounds/sec across ALL sources)
  if (now - lastGlobalSoundTime < GLOBAL_MIN_INTERVAL) return;
  
  // Per-ball debounce (prevent rapid-fire from same ball)
  if (ballId !== null) {
    const lastTime = lastSoundTime.get(ballId) || 0;
    if (now - lastTime < CONFIG.minTimeBetweenSounds) return;
    lastSoundTime.set(ballId, now);
  }
  
  // Update global timestamp
  lastGlobalSoundTime = now;
  
  // Clean up old entries periodically
  if (lastSoundTime.size > 200) {
    const threshold = now - 0.5;
    for (const [id, time] of lastSoundTime) {
      if (time < threshold) lastSoundTime.delete(id);
    }
  }
  
  // Get a voice (free or steal oldest)
  const voice = acquireVoice(now);
  if (!voice) return; // Should never happen with stealing
  
  // Map ball radius to pentatonic pitch
  const frequency = radiusToFrequency(ballRadius);
  
  // Clamp intensity
  const clampedIntensity = Math.max(0, Math.min(1, intensity));
  
  // Play using the pooled voice
  playVoice(voice, frequency, clampedIntensity, xPosition, now);
}

/**
 * Acquire a voice from the pool (with voice stealing)
 * Returns the oldest voice if all are in use
 */
function acquireVoice(now) {
  // First, look for a free voice
  for (const voice of voicePool) {
    if (!voice.inUse) {
      return voice;
    }
  }
  
  // All voices in use - steal the oldest one
  let oldestVoice = voicePool[0];
  for (const voice of voicePool) {
    if (voice.startTime < oldestVoice.startTime) {
      oldestVoice = voice;
    }
  }
  
  // Stop the old oscillators immediately
  releaseVoice(oldestVoice);
  
  return oldestVoice;
}

/**
 * Release a voice (stop oscillators, mark as free)
 */
function releaseVoice(voice) {
  // Stop and disconnect all oscillators
  if (voice.osc) {
    try { voice.osc.stop(); voice.osc.disconnect(); } catch (e) { /* already stopped */ }
    voice.osc = null;
  }
  if (voice.osc2) {
    try { voice.osc2.stop(); voice.osc2.disconnect(); } catch (e) { /* already stopped */ }
    voice.osc2 = null;
  }
  if (voice.osc3) {
    try { voice.osc3.stop(); voice.osc3.disconnect(); } catch (e) { /* already stopped */ }
    voice.osc3 = null;
  }
  if (voice.noiseSource) {
    try { voice.noiseSource.stop(); voice.noiseSource.disconnect(); } catch (e) { /* already stopped */ }
    voice.noiseSource = null;
  }
  
  // Disconnect gain nodes
  if (voice.harmGain) {
    try { voice.harmGain.disconnect(); } catch (e) {}
    voice.harmGain = null;
  }
  if (voice.harm3Gain) {
    try { voice.harm3Gain.disconnect(); } catch (e) {}
    voice.harm3Gain = null;
  }
  
  voice.inUse = false;
}

/**
 * Play a sound using a pooled voice — REALISTIC VERSION
 * 
 * Key realism techniques:
 * 1. Noise transient burst ("snap" at impact moment)
 * 2. Micro-variation on every parameter
 * 3. Velocity-sensitive timbre (soft=warm, hard=bright+snappy)
 * 4. Inharmonic partials (real wood is never perfectly harmonic)
 * 5. Multi-stage decay (transient + body)
 * 6. Occasional "character" hits with extra resonance
 */
function playVoice(voice, frequency, intensity, xPosition, now) {
  voice.inUse = true;
  voice.startTime = now;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 1: MICRO-RANDOMIZATION — Make every hit unique
  // ═══════════════════════════════════════════════════════════════════════════════
  const variedFreq = vary(frequency, CONFIG.variancePitch);
  const variedDecay = vary(CONFIG.decayTime, CONFIG.varianceDecay);
  const variedGain = vary(1.0, CONFIG.varianceGain);
  const variedFilter = vary(1.0, CONFIG.varianceFilter);
  const variedNoise = vary(1.0, CONFIG.varianceNoise);
  
  // Check for occasional "character" hit (slight extra resonance/brightness)
  const isCharacterHit = chance(CONFIG.characterHitChance);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 2: VELOCITY-SENSITIVE TIMBRE
  // Soft hits = warm, mellow | Hard hits = bright, snappy, more transient noise
  // ═══════════════════════════════════════════════════════════════════════════════
  const velocityCurve = Math.pow(intensity, 0.7); // Slight compression for naturalness
  
  // Noise scales UP with velocity (hard hits have more "crack")
  const noiseAmount = velocityCurve * CONFIG.velocityNoiseScale * variedNoise;
  
  // Brightness scales UP with velocity
  const brightnessBoost = 1 + (velocityCurve * (CONFIG.velocityBrightnessScale - 1));
  
  // Decay scales DOWN with velocity (hard = snappier)
  const decayMod = 1 - (velocityCurve * (1 - CONFIG.velocityDecayScale));
  const finalDecay = variedDecay * decayMod;
  
  // Character hit adjustments
  const charBrightMod = isCharacterHit ? CONFIG.characterBrightnessBoost : 1;
  const charResMod = isCharacterHit ? CONFIG.characterResonanceBoost : 1;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 3: CALCULATE FINAL PARAMETERS
  // ═══════════════════════════════════════════════════════════════════════════════
  let baseGain = CONFIG.minGain + (CONFIG.maxGain - CONFIG.minGain) * intensity;
  let gain = baseGain * variedGain;
  
  let filterFreq = (CONFIG.filterBaseFreq + CONFIG.filterVelocityRange * intensity) 
                   * variedFilter * brightnessBoost * charBrightMod;
  
  const filterQ = CONFIG.filterQ * charResMod;
  const duration = finalDecay + 0.025; // Buffer for release
  const reverbAmount = 1 - (intensity * 0.5);
  const panValue = (xPosition - 0.5) * 2 * CONFIG.maxPan;
  
  // ─── TONE SAFETY ─────────────────────────────────────────────────────────────
  ({ gain, filterFreq } = applyToneSafety(variedFreq, gain, filterFreq));
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 4: SETUP TONAL OSCILLATORS (with inharmonicity)
  // ═══════════════════════════════════════════════════════════════════════════════
  voice.filter.frequency.value = filterFreq;
  voice.filter.Q.value = filterQ;
  voice.panner.pan.value = panValue;
  voice.reverbSend.gain.value = reverbAmount;
  
  // Main envelope (tonal body)
  voice.envelope.gain.cancelScheduledValues(now);
  voice.envelope.gain.setValueAtTime(gain, now);
  voice.envelope.gain.exponentialRampToValueAtTime(0.001, now + finalDecay);
  
  // ─── FUNDAMENTAL ────────────────────────────────────────────────────────────
  const osc = audioContext.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = variedFreq;
  
  // ─── 2nd HARMONIC (with inharmonicity for wood character) ───────────────────
  const osc2 = audioContext.createOscillator();
  osc2.type = 'sine';
  // Inharmonicity: real wood overtones are slightly sharp
  const inharm2 = CONFIG.inharmonicityEnabled 
    ? (1 + vary(CONFIG.inharmonicSpread, 0.3)) 
    : 1;
  osc2.frequency.value = variedFreq * 2 * inharm2;
  
  const harmGain = audioContext.createGain();
  // 2nd harmonic gains slightly more presence on harder hits
  harmGain.gain.value = CONFIG.harmonicGain * (1 + velocityCurve * 0.3);
  
  // ─── 3rd HARMONIC (subtle, adds body) ───────────────────────────────────────
  const osc3 = audioContext.createOscillator();
  osc3.type = 'sine';
  const inharm3 = CONFIG.inharmonicityEnabled 
    ? (1 + vary(CONFIG.thirdHarmonicInharm, 0.4)) 
    : 1;
  osc3.frequency.value = variedFreq * 3 * inharm3;
  
  const harm3Gain = audioContext.createGain();
  harm3Gain.gain.value = CONFIG.thirdHarmonicGain * (isCharacterHit ? 1.5 : 1);
  
  // Store refs
  voice.osc = osc;
  voice.osc2 = osc2;
  voice.osc3 = osc3;
  voice.harmGain = harmGain;
  voice.harm3Gain = harm3Gain;
  
  // Connect tonal chain
  osc.connect(voice.filter);
  osc2.connect(harmGain);
  harmGain.connect(voice.filter);
  osc3.connect(harm3Gain);
  harm3Gain.connect(voice.filter);
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 5: NOISE TRANSIENT ("snap" at impact)
  // This is what makes it sound like a REAL collision vs a synth
  // ═══════════════════════════════════════════════════════════════════════════════
  if (CONFIG.noiseTransientEnabled && noiseAmount > 0.1) {
    const noiseSource = createTransientNoise();
    voice.noiseSource = noiseSource;
    
    // Noise filter frequency: scales with velocity (hard = brighter snap)
    const noiseFilterFreq = CONFIG.noiseTransientFilterMin + 
      (CONFIG.noiseTransientFilterMax - CONFIG.noiseTransientFilterMin) * velocityCurve;
    voice.noiseFilter.frequency.value = vary(noiseFilterFreq, 0.15);
    
    // Noise envelope: very short burst, then instant decay
    const noiseGain = CONFIG.noiseTransientGain * noiseAmount * gain;
    const noiseDecay = vary(CONFIG.noiseTransientDecay, 0.25);
    
    voice.noiseEnvelope.gain.cancelScheduledValues(now);
    voice.noiseEnvelope.gain.setValueAtTime(noiseGain, now);
    voice.noiseEnvelope.gain.exponentialRampToValueAtTime(0.001, now + noiseDecay);
    
    // Connect and start noise
    noiseSource.connect(voice.noiseFilter);
    noiseSource.start(now);
    noiseSource.stop(now + noiseDecay + 0.01);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // STEP 6: START & SCHEDULE CLEANUP
  // ═══════════════════════════════════════════════════════════════════════════════
  osc.start(now);
  osc2.start(now);
  osc3.start(now);
  osc.stop(now + duration);
  osc2.stop(now + duration);
  osc3.stop(now + duration);
  
  osc.onended = () => releaseVoice(voice);
}

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Apply gentle, “musical” constraints so extreme tones don't get brittle/ugly.
 * Returns adjusted {gain, filterFreq}.
 */
function applyToneSafety(frequency, gain, filterFreq) {
  const t = clamp(
    (frequency - CONFIG.toneSafetyMinHz) / (CONFIG.toneSafetyMaxHz - CONFIG.toneSafetyMinHz),
    0,
    1
  );

  const exp = CONFIG.toneSafetyExponent;
  const high = Math.pow(t, exp);
  const low = Math.pow(1 - t, exp);

  // Gain: reduce at extremes (mostly high end)
  const gainMul = clamp(
    1 - (CONFIG.toneSafetyHighGainAtten * high) - (CONFIG.toneSafetyLowGainAtten * low),
    0.6,
    1
  );
  let safeGain = gain * gainMul;

  // Brightness: reduce at high end (prevents brittle “sizzle”)
  const brightMul = clamp(1 - CONFIG.toneSafetyHighBrightAtten * high, 0.55, 1);
  let safeFilter = filterFreq * brightMul;

  // Clamp into safe filter range
  safeFilter = clamp(safeFilter, CONFIG.filterMinHz, CONFIG.filterMaxHz);

  // Absolute ceiling per voice (pre-master)
  safeGain = Math.min(safeGain, CONFIG.voiceGainMax);

  return { gain: safeGain, filterFreq: safeFilter };
}

/**
 * Map ball radius to pentatonic frequency
 * Uses inverse mapping: larger radius = lower frequency
 */
function radiusToFrequency(radius) {
  // Assume radius range ~10-50 (DPR-scaled)
  // Normalize to 0-1 then invert (large = 0, small = 1)
  const minR = 8, maxR = 55;
  const normalized = 1 - Math.max(0, Math.min(1, (radius - minR) / (maxR - minR)));
  
  // Map to pentatonic scale index with slight randomization
  const baseIndex = normalized * (PENTATONIC_FREQUENCIES.length - 1);
  const randomOffset = (Math.random() - 0.5) * 1.5; // ±0.75 index variation
  const index = Math.max(0, Math.min(PENTATONIC_FREQUENCIES.length - 1, 
    Math.round(baseIndex + randomOffset)));
  
  // Add subtle detuning for organic feel (±3%)
  const detune = 1 + (Math.random() - 0.5) * 0.06;
  
  return PENTATONIC_FREQUENCIES[index] * detune;
}


// ════════════════════════════════════════════════════════════════════════════════
// PUBLIC API
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Toggle sound on/off
 * @returns {boolean} New enabled state
 */
export function toggleSound() {
  if (!isUnlocked) return false;
  isEnabled = !isEnabled;
  return isEnabled;
}

/**
 * Set sound enabled state
 * @param {boolean} enabled
 */
export function setSoundEnabled(enabled) {
  if (!isUnlocked) return;
  isEnabled = !!enabled;
}

/**
 * Get current sound state
 * @returns {{ isUnlocked: boolean, isEnabled: boolean }}
 */
export function getSoundState() {
  return {
    isUnlocked,
    isEnabled,
    activeSounds: voicePool.filter(v => v.inUse).length,
    poolSize: VOICE_POOL_SIZE,
    rollingEnergy: currentRollingEnergy,
    whooshEnergy: currentWhooshEnergy,
  };
}

/**
 * UPDATE AMBIENT SOUNDS based on ball velocities
 * Call this every frame from the main loop
 * 
 * @param {Array} balls - Array of ball objects with {vx, vy, y, r} properties
 * @param {number} floorY - Y coordinate of the floor (for detecting rolling)
 */
export function updateAmbientSounds(balls, floorY = Infinity) {
  if (!isEnabled || !isUnlocked || !audioContext) return;
  if (prefersReducedMotion) return;
  
  let rollingSum = 0;
  let rollingCount = 0;
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ROLLING: Wooden pieces rolling on surface
  // Only when: touching floor + moving horizontally + not bouncing
  // ═══════════════════════════════════════════════════════════════════════════════
  if (CONFIG.rollingEnabled) {
    for (const ball of balls) {
      const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
      const horizSpeed = Math.abs(ball.vx);
      const vertSpeed = Math.abs(ball.vy);
      
      // Must be near floor
      const isNearFloor = (ball.y + ball.r) >= (floorY - 3);
      
      // Must be moving primarily horizontally (rolling, not bouncing)
      const isRolling = horizSpeed > vertSpeed * 2;
      
      // Must be in the right speed range
      const inSpeedRange = speed > CONFIG.rollingMinVelocity && speed < CONFIG.rollingMaxVelocity;
      
      if (isNearFloor && isRolling && inSpeedRange) {
        // Weight by horizontal velocity
        rollingSum += horizSpeed / CONFIG.rollingMaxVelocity;
        rollingCount++;
      }
    }
  }
  
  // Smooth the rolling energy (prevents jarring)
  const targetRolling = rollingCount > 0 
    ? Math.min(1, rollingSum / Math.max(1, rollingCount * 0.7))
    : 0;
  
  currentRollingEnergy += (targetRolling - currentRollingEnergy) * ENERGY_SMOOTH;
  
  // Apply rolling sound (very subtle, background texture)
  if (rollingGain && CONFIG.rollingEnabled) {
    const rollVol = currentRollingEnergy * CONFIG.rollingGain;
    rollingGain.gain.setTargetAtTime(rollVol, audioContext.currentTime, 0.08);
    
    // Gentle pitch modulation based on rolling speed
    if (rollingOsc) {
      const pitchMod = 1 + currentRollingEnergy * 0.15; // Subtle +15% at max
      rollingOsc.frequency.setTargetAtTime(CONFIG.rollingFreq * pitchMod, audioContext.currentTime, 0.15);
    }
  }
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // WHOOSH: Disabled for small wooden pieces (not realistic)
  // Keep gain at 0 to silence any existing nodes
  // ═══════════════════════════════════════════════════════════════════════════════
  if (whooshGain) {
    whooshGain.gain.setTargetAtTime(0, audioContext.currentTime, 0.05);
  }
}

/**
 * Set master volume (0-1)
 * @param {number} volume
 */
export function setMasterVolume(volume) {
  if (masterGain) {
    masterGain.gain.value = Math.max(0, Math.min(1, volume)) * CONFIG.masterGain;
  }
}

/**
 * Clean up resources (call on page unload if needed)
 */
export function disposeSoundEngine() {
  if (audioContext) {
    audioContext.close();
    audioContext = null;
  }
  isUnlocked = false;
  isEnabled = false;
  lastSoundTime.clear();
}

// ════════════════════════════════════════════════════════════════════════════════
// CONFIG API - Runtime parameter tweaking
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Get current config values
 * @returns {object} Copy of current config
 */
export function getSoundConfig() {
  return { ...CONFIG };
}

/**
 * Update specific config parameters
 * @param {object} updates - Key/value pairs to update
 */
export function updateSoundConfig(updates) {
  for (const [key, value] of Object.entries(updates)) {
    if (key in CONFIG) {
      CONFIG[key] = value;
    }
  }
  
  // Update wet/dry mix if reverb params changed
  if (wetGain && dryGain && 'reverbWetMix' in updates) {
    wetGain.gain.value = CONFIG.reverbWetMix;
    dryGain.gain.value = 1 - CONFIG.reverbWetMix;
  }
  
  // Update master gain if changed
  if (masterGain && 'masterGain' in updates) {
    masterGain.gain.value = CONFIG.masterGain;
  }
}

/**
 * Apply a sound preset
 * @param {string} presetName - Key from SOUND_PRESETS
 * @returns {boolean} Success
 */
export function applySoundPreset(presetName) {
  const preset = SOUND_PRESETS[presetName];
  if (!preset) {
    console.warn(`Unknown sound preset: ${presetName}`);
    return false;
  }
  
  currentPreset = presetName;
  
  // Apply preset values to config (1:1 with CONFIG keys)
  // NOTE: We intentionally exclude label/description from updateSoundConfig.
  const { label, description, ...values } = preset;
  updateSoundConfig(values);
  
  console.log(`🎵 Applied sound preset: ${preset.label}`);
  return true;
}

/**
 * Get current preset name
 * @returns {string}
 */
export function getCurrentPreset() {
  return currentPreset;
}

/**
 * Get all available presets
 * @returns {object}
 */
export function getAvailablePresets() {
  return SOUND_PRESETS;
}

