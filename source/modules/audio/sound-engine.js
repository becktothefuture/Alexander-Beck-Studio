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
 */

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
// Soft organic impacts — locked baseline for further evolution.
// ════════════════════════════════════════════════════════════════════════════════
const BASE_CONFIG = Object.freeze({
  // ─── Synthesis ────────────────────────────────────────────────────────────────
  // Softer attack removes the initial "click"; longer decay for natural tail
  attackTime: 0.005,            // Was 0.001 — softer onset, less clacky
  decayTime: 0.075,             // Was 0.060 — slightly longer for body
  harmonicGain: 0.02,           // Was 0.04 — minimal harmonics (non-melodic)
  
  // ─── Filter (Timbre) ──────────────────────────────────────────────────────────
  // Darker baseline; only hard impacts get brightness
  filterBaseFreq: 580,          // Was 950 — much darker default
  filterVelocityRange: 400,     // Was 260 — intensity can open up more
  filterQ: 0.18,                // Was 0.24 — gentler resonance
  
  // ─── Reverb ───────────────────────────────────────────────────────────────────
  // Short room, subtle glue (unchanged)
  reverbDecay: 0.14,
  reverbWetMix: 0.08,           // Was 0.10 — slightly drier
  reverbHighDamp: 0.80,         // Was 0.72 — more high damping
  
  // ─── Volume / Dynamics ────────────────────────────────────────────────────────
  // Lower overall, with more headroom for intensity scaling
  minGain: 0.008,               // Was 0.018 — soft hits nearly inaudible
  maxGain: 0.09,                // Was 0.11 — hard hits still present
  masterGain: 0.28,             // Was 0.30 — slight reduction
  
  // ─── Performance ──────────────────────────────────────────────────────────────
  minTimeBetweenSounds: 0.012,  // Was 0.010 — slightly more debounce
  
  // ─── Stereo ───────────────────────────────────────────────────────────────────
  maxPan: 0.15,                 // Was 0.18 — tighter stereo image
  
  // ─── Noise Transient (the "snap" at impact) ───────────────────────────────────
  // Significantly reduced for softer, less percussive sound
  noiseTransientEnabled: true,
  noiseTransientGain: 0.045,    // Was 0.12 — 63% reduction
  noiseTransientDecay: 0.008,   // Was 0.012 — shorter burst
  noiseTransientFilterMin: 500, // Was 750 — darker transient
  noiseTransientFilterMax: 1800,// Was 2400 — less harsh
  
  // ─── Micro-Variation (organic feel) ───────────────────────────────────────────
  variancePitch: 0.06,          // Was 0.035 — more pitch variance (non-melodic)
  varianceDecay: 0.20,          // Was 0.16 — more decay variance
  varianceGain: 0.15,           // Was 0.12 — more volume variance
  varianceFilter: 0.18,         // Was 0.12 — more timbre variance
  varianceNoise: 0.25,          // Was 0.18 — more transient variance
  
  // ─── Inharmonicity (disabled) ─────────────────────────────────────────────────
  inharmonicityEnabled: false,
  inharmonicSpread: 0,
  thirdHarmonicGain: 0,
  thirdHarmonicInharm: 0,
  
  // ─── Intensity-Driven Dynamics ────────────────────────────────────────────────
  // These scale based on collision energy — key to realistic feel
  velocityNoiseScale: 1.8,      // Was 1.4 — harder hits get more snap
  velocityBrightnessScale: 1.4, // Was 1.1 — harder hits get brighter
  velocityDecayScale: 0.65,     // Was 0.78 — harder hits decay faster
  intensityExponent: 1.5,       // NEW: non-linear curve (soft hits very quiet)
  
  // ─── Character Hits (disabled) ────────────────────────────────────────────────
  characterHitChance: 0,
  characterBrightnessBoost: 1,
  characterResonanceBoost: 1,

  // ─── Tone Safety (anti-harshness) ─────────────────────────────────────────────
  toneSafetyMinHz: 130,         // Was 140 — slightly wider safe zone
  toneSafetyMaxHz: 480,         // Was 520 — narrower safe zone
  toneSafetyExponent: 2.2,      // Was 2.0 — steeper rolloff at extremes
  toneSafetyHighGainAtten: 0.25,// Was 0.18 — more high attenuation
  toneSafetyLowGainAtten: 0.06, // Was 0.08 — less low attenuation
  toneSafetyHighBrightAtten: 0.45,// Was 0.32 — much darker highs

  filterMinHz: 350,             // Was 420 — allow darker sounds
  filterMaxHz: 2800,            // Was 3800 — hard cap lower

  voiceGainMax: 0.14,           // Was 0.18 — lower ceiling per voice
  
  // ─── Energy Threshold ─────────────────────────────────────────────────────────
  collisionMinImpact: 0.58,     // Was 0.52 — ignore more soft touches
  
  // ─── Ambient (disabled) ───────────────────────────────────────────────────────
  rollingEnabled: false,
  rollingMaxVelocity: 80,
  rollingMinVelocity: 15,
  rollingGain: 0,
  rollingFreq: 130,
  
  whooshEnabled: false,
  whooshMinVelocity: 500,
  whooshGain: 0.0,
  whooshFreq: 800,

  // ─── High-Shelf EQ (aggressive high rolloff) ──────────────────────────────────
  // This is the "ramp" that tames harsh frequencies without hard-cutting
  highShelfFreq: 2200,          // Was 3400 — starts rolling off earlier
  highShelfGain: -6.0,          // Was -3.5 — nearly double the cut
});

let CONFIG = { ...BASE_CONFIG };

// ════════════════════════════════════════════════════════════════════════════════
// SOUND PRESETS — Locked baseline for evolution
// ════════════════════════════════════════════════════════════════════════════════
export const SOUND_PRESETS = {
  organicImpact: {
    label: 'Organic Impact (Baseline)',
    description: 'Soft, intensity-driven thuds with aggressive high rolloff',
    ...BASE_CONFIG,
  },
};

let currentPreset = 'organicImpact';

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
  // More aggressive settings for transparent peak control
  limiter = audioContext.createDynamicsCompressor();
  limiter.threshold.value = -6;    // Was -3 — catches more peaks
  limiter.knee.value = 10;         // Was 6 — softer knee for transparency
  limiter.ratio.value = 16;        // Was 12 — harder limiting
  limiter.attack.value = 0.0005;   // Was 0.001 — faster attack catches transients
  limiter.release.value = 0.08;    // Was 0.1 — slightly faster release

  // Gentle high-shelf to soften highs without hard-cutting
  highShelf = audioContext.createBiquadFilter();
  highShelf.type = 'highshelf';
  highShelf.frequency.value = CONFIG.highShelfFreq;
  highShelf.gain.value = CONFIG.highShelfGain;
  highShelf.Q.value = 0.7;

  // Soft clipper (gentle safety before the limiter)
  // Lower amount = gentler saturation, more headroom before distortion
  saturator = audioContext.createWaveShaper();
  saturator.curve = makeSoftClipCurve(0.55);  // Was 0.85 — much gentler
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
  saturator.connect(highShelf);
  highShelf.connect(limiter);
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
 * Play a sound using a pooled voice — soft organic impact
 * 
 * Key traits for realism:
 * 1) Non-linear intensity curve: soft hits are MUCH quieter than hard hits
 * 2) Intensity drives gain, brightness (filter), and transient amount
 * 3) Darker baseline timbre; only hard impacts reveal highs
 * 4) Micro-variance on all parameters for organic feel
 */
function playVoice(voice, frequency, intensity, xPosition, now) {
  voice.inUse = true;
  voice.startTime = now;
  
  // ═══ NON-LINEAR INTENSITY CURVE ═══
  // This is the key to realistic dynamics:
  // - intensity^1.5 means a 50% intensity collision plays at ~35% perceived volume
  // - Soft touches become nearly inaudible; only hard impacts are prominent
  const energy = clamp(intensity, 0, 1);
  const gainShape = Math.pow(energy, CONFIG.intensityExponent); // Non-linear!
  
  // ═══ FREQUENCY (with variance) ═══
  const variedFreq = vary(frequency, CONFIG.variancePitch);
  
  // ═══ DECAY (intensity-dependent) ═══
  // Harder hits have shorter decay (snappier); soft hits linger slightly
  const decayVar = vary(CONFIG.decayTime, CONFIG.varianceDecay);
  const finalDecay = decayVar * (1 - gainShape * (1 - CONFIG.velocityDecayScale));
  const duration = finalDecay + 0.02;

  // ═══ GAIN (non-linear intensity mapping) ═══
  let gain = CONFIG.minGain + (CONFIG.maxGain - CONFIG.minGain) * gainShape;
  gain *= vary(1.0, CONFIG.varianceGain);

  // ═══ FILTER (brightness scales with intensity) ═══
  // Soft hits stay dark; only hard impacts open up the filter
  const brightnessScale = 1 + (CONFIG.velocityBrightnessScale - 1) * gainShape;
  let filterFreq = CONFIG.filterBaseFreq + CONFIG.filterVelocityRange * Math.pow(gainShape, 1.3);
  filterFreq *= vary(1.0, CONFIG.varianceFilter) * brightnessScale;
  
  // ═══ STEREO + REVERB ═══
  const panValue = (xPosition - 0.5) * 2 * CONFIG.maxPan;
  const reverbAmount = 0.12 + (1 - gainShape) * 0.5; // Softer hits = more diffuse
  
  // Tone safety + anti-clipping headroom
  ({ gain, filterFreq } = applyToneSafety(variedFreq, gain, filterFreq));
  
  voice.filter.frequency.value = filterFreq;
  voice.filter.Q.value = CONFIG.filterQ;
  voice.panner.pan.value = panValue;
  voice.reverbSend.gain.value = reverbAmount;
  
  // Main envelope (single sine body)
  voice.envelope.gain.cancelScheduledValues(now);
  voice.envelope.gain.setValueAtTime(gain, now);
  voice.envelope.gain.exponentialRampToValueAtTime(0.001, now + finalDecay);
  
  const osc = audioContext.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = variedFreq;
  
  // Store refs (harmonics disabled)
  voice.osc = osc;
  voice.osc2 = null;
  voice.osc3 = null;
  voice.harmGain = null;
  voice.harm3Gain = null;
  
  // Connect tonal chain
  osc.connect(voice.filter);

  // ═══ NOISE TRANSIENT (the "snap" at impact) ═══
  // Only prominent on hard hits; soft touches have almost no transient
  if (CONFIG.noiseTransientEnabled && gainShape > 0.25) {
    const noiseSource = createTransientNoise();
    voice.noiseSource = noiseSource;
    
    // Filter opens with intensity (soft = dark transient, hard = brighter)
    const noiseIntensity = Math.pow(gainShape, 1.4); // Even steeper curve for transient
    const noiseFilterBase = CONFIG.noiseTransientFilterMin + 
      (CONFIG.noiseTransientFilterMax - CONFIG.noiseTransientFilterMin) * noiseIntensity;
    voice.noiseFilter.frequency.value = vary(noiseFilterBase, CONFIG.varianceNoise);
    
    // Transient gain scales with intensity (soft hits get almost no snap)
    const noiseGain = CONFIG.noiseTransientGain * 
      CONFIG.velocityNoiseScale * 
      noiseIntensity * 
      gain;
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
 * Map ball radius to organic frequency (non-melodic)
 * Uses inverse mapping: larger radius = lower frequency
 * 
 * Key difference from melodic mapping:
 * - Continuous (not quantized to scale)
 * - Wide variance makes each hit unique
 * - Narrower overall range (thuddy, not tinny)
 */
function radiusToFrequency(radius) {
  const minR = 8;
  const maxR = 55;
  const normalized = clamp((radius - minR) / (maxR - minR), 0, 1);
  const inv = 1 - normalized; // Larger radius → lower pitch

  // Narrow, low range for thuddy impacts (not clacky/tinny)
  // Range: ~145–280 Hz (much lower than before)
  const baseFreq = 145 + inv * 135;
  
  // High variance (±9%) ensures no two hits sound alike
  return baseFreq * vary(1, CONFIG.variancePitch * 1.5);
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
  
  if (highShelf && ('highShelfFreq' in updates || 'highShelfGain' in updates)) {
    highShelf.frequency.value = CONFIG.highShelfFreq;
    highShelf.gain.value = CONFIG.highShelfGain;
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

