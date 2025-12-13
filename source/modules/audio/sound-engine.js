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
// CONFIGURATION (mutable for runtime tweaking)
// ════════════════════════════════════════════════════════════════════════════════
let CONFIG = {
  // Synthesis — instant attack, soft decay
  attackTime: 0,               // 0ms = instant onset (sub-1ms response)
  decayTime: 0.055,            // 55ms quick decay (dissipates)
  harmonicGain: 0.09,          // Subtle warmth
  
  // Filter — soft but present
  filterBaseFreq: 2400,        // Balanced brightness
  filterVelocityRange: 380,    // Subtle velocity response
  filterQ: 0.4,                // Smooth, no harshness
  
  // Reverb — gentle tail
  reverbDecay: 0.28,           // Short ambient tail
  reverbWetMix: 0.22,          // Subtle space
  reverbHighDamp: 0.65,        // Damped highs
  
  // Volume — soft but clicky
  minGain: 0.05,               // Whisper minimum
  maxGain: 0.28,               // Soft maximum
  masterGain: 0.52,            // Understated
  
  // Performance (voice pool size is fixed at 8)
  minTimeBetweenSounds: 0.008, // Per-ball debounce (8ms, tighter)
  
  // Stereo
  maxPan: 0.22,                // Subtle width
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // ENERGY-BASED SOUND SYSTEM — Small Wooden Play Circles
  // ═══════════════════════════════════════════════════════════════════════════════
  
  // Collision threshold (soft touches are silent, like real wooden pieces)
  collisionMinImpact: 0.12,    // Light taps still audible, feather touches silent
  
  // Rolling rumble (wood-on-surface friction)
  // Think: wooden beads rolling on a table — subtle, textured
  rollingEnabled: true,
  rollingMaxVelocity: 80,      // Only when rolling slowly (settling)
  rollingMinVelocity: 15,      // Below this = too slow, silent
  rollingGain: 0.025,          // Very subtle — background texture only
  rollingFreq: 120,            // Higher than before (wood is lighter than stone)
  
  // Air whoosh — DISABLED for small wooden pieces
  // These are too small/light to displace air audibly
  whooshEnabled: false,        // ← Disabled! Not realistic for small objects
  whooshMinVelocity: 500,      // (unused)
  whooshGain: 0.0,             // (unused)
  whooshFreq: 800,             // (unused)
};

// ════════════════════════════════════════════════════════════════════════════════
// SOUND PRESETS
// ════════════════════════════════════════════════════════════════════════════════
export const SOUND_PRESETS = {
  // ═══════════════════════════════════════════════════════════════════════════════
  // DEFAULT — soft click, instant, dissipating
  // All presets use attackTime: 0 for sub-1ms response
  // ═══════════════════════════════════════════════════════════════════════════════
  softClick: {
    label: 'Soft Click',
    description: 'Instant, clicky, gently fading',
    attackTime: 0, decayTime: 0.055, harmonicGain: 0.09,
    filterBaseFreq: 2400, filterVelocityRange: 380, filterQ: 0.4,
    reverbDecay: 0.28, reverbWetMix: 0.22, masterGain: 0.52
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // FAVORITES — River Stones & Rain Drops adjacent
  // ═══════════════════════════════════════════════════════════════════════════════
  riverStones: {
    label: 'River Stones',
    description: 'Crisp, tactile taps',
    attackTime: 0, decayTime: 0.05, harmonicGain: 0.18,
    filterBaseFreq: 2800, filterVelocityRange: 600, filterQ: 0.55,
    reverbDecay: 0.2, reverbWetMix: 0.15, masterGain: 0.48
  },
  rainDrops: {
    label: 'Rain Drops',
    description: 'Light, delicate plinks',
    attackTime: 0, decayTime: 0.042, harmonicGain: 0.11,
    filterBaseFreq: 3200, filterVelocityRange: 450, filterQ: 0.45,
    reverbDecay: 0.35, reverbWetMix: 0.3, masterGain: 0.4
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // NEW ADDITIONS — organic variations
  // ═══════════════════════════════════════════════════════════════════════════════
  silkTouch: {
    label: 'Silk Touch',
    description: 'Ultra-smooth, barely there',
    attackTime: 0, decayTime: 0.065, harmonicGain: 0.04,
    filterBaseFreq: 1800, filterVelocityRange: 250, filterQ: 0.3,
    reverbDecay: 0.4, reverbWetMix: 0.35, masterGain: 0.32
  },
  morningDew: {
    label: 'Morning Dew',
    description: 'Fresh, hopeful sparkle',
    attackTime: 0, decayTime: 0.048, harmonicGain: 0.14,
    filterBaseFreq: 3600, filterVelocityRange: 550, filterQ: 0.5,
    reverbDecay: 0.32, reverbWetMix: 0.28, masterGain: 0.38
  },
  bamboo: {
    label: 'Bamboo',
    description: 'Hollow, zen garden taps',
    attackTime: 0, decayTime: 0.08, harmonicGain: 0.2,
    filterBaseFreq: 2200, filterVelocityRange: 400, filterQ: 0.65,
    reverbDecay: 0.25, reverbWetMix: 0.2, masterGain: 0.45
  },
  whisper: {
    label: 'Whisper',
    description: 'Almost silent, intimate',
    attackTime: 0, decayTime: 0.07, harmonicGain: 0.03,
    filterBaseFreq: 1400, filterVelocityRange: 180, filterQ: 0.25,
    reverbDecay: 0.5, reverbWetMix: 0.45, masterGain: 0.22
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // WILDCARD — unpredictable
  // ═══════════════════════════════════════════════════════════════════════════════
  glitch: {
    label: 'Glitch',
    description: 'Digital artifacts, unstable',
    attackTime: 0, decayTime: 0.025, harmonicGain: 0.55,
    filterBaseFreq: 5500, filterVelocityRange: 2500, filterQ: 2.5,
    reverbDecay: 0.08, reverbWetMix: 0.05, masterGain: 0.35
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // SCARY — dark and unsettling (slight attack for eerie effect)
  // ═══════════════════════════════════════════════════════════════════════════════
  theVoid: {
    label: 'The Void',
    description: 'Dark, hollow, unsettling',
    attackTime: 0.005, decayTime: 0.25, harmonicGain: 0.02,
    filterBaseFreq: 350, filterVelocityRange: 100, filterQ: 0.8,
    reverbDecay: 0.85, reverbWetMix: 0.7, masterGain: 0.55
  },
  
  // ═══════════════════════════════════════════════════════════════════════════════
  // COOL & UNDERSTATED — elegant mystery
  // ═══════════════════════════════════════════════════════════════════════════════
  midnight: {
    label: 'Midnight',
    description: 'Subtle, mysterious, elegant',
    attackTime: 0, decayTime: 0.09, harmonicGain: 0.07,
    filterBaseFreq: 1900, filterVelocityRange: 280, filterQ: 0.35,
    reverbDecay: 0.55, reverbWetMix: 0.4, masterGain: 0.36
  }
};

let currentPreset = 'softClick';

// ════════════════════════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════════════════════════
let audioContext = null;
let masterGain = null;
let reverbNode = null;
let dryGain = null;
let wetGain = null;
let limiter = null;

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
 * Voice Pool → [Dry + Reverb] → Limiter → Master → Output
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
  
  // Dry/wet routing for reverb
  dryGain = audioContext.createGain();
  dryGain.gain.value = 1 - CONFIG.reverbWetMix;
  
  wetGain = audioContext.createGain();
  wetGain.gain.value = CONFIG.reverbWetMix;
  
  // Create reverb (algorithmic approach using delay network)
  reverbNode = createReverbEffect();
  
  // Connect graph
  dryGain.connect(limiter);
  wetGain.connect(reverbNode);
  reverbNode.connect(limiter);
  limiter.connect(masterGain);
  masterGain.connect(audioContext.destination);
  
  // Initialize voice pool
  initVoicePool();
  
  // Initialize ambient sounds (rolling rumble + air whoosh)
  initAmbientSounds();
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
 * Each voice has: oscillator placeholder, filter, envelope, panner
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
      // Oscillators created per-use (can't restart, but lightweight)
      osc: null,
      osc2: null,
      harmGain: null,
    };
    
    // Configure filter
    voice.filter.type = 'lowpass';
    
    // Connect persistent chain: filter → envelope → panner → dry/wet
    voice.filter.connect(voice.envelope);
    voice.envelope.connect(voice.panner);
    voice.panner.connect(dryGain);
    voice.panner.connect(voice.reverbSend);
    voice.reverbSend.connect(wetGain);
    
    voicePool.push(voice);
  }
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
  if (voice.osc) {
    try {
      voice.osc.stop();
      voice.osc.disconnect();
    } catch (e) { /* already stopped */ }
    voice.osc = null;
  }
  if (voice.osc2) {
    try {
      voice.osc2.stop();
      voice.osc2.disconnect();
    } catch (e) { /* already stopped */ }
    voice.osc2 = null;
  }
  if (voice.harmGain) {
    try { voice.harmGain.disconnect(); } catch (e) {}
    voice.harmGain = null;
  }
  voice.inUse = false;
}

/**
 * Play a sound using a pooled voice
 */
function playVoice(voice, frequency, intensity, xPosition, now) {
  voice.inUse = true;
  voice.startTime = now;
  
  // Pre-calculate all parameters (minimize runtime math)
  const gain = CONFIG.minGain + (CONFIG.maxGain - CONFIG.minGain) * intensity;
  const filterFreq = CONFIG.filterBaseFreq + CONFIG.filterVelocityRange * intensity;
  const duration = CONFIG.decayTime + 0.015; // Tight buffer
  const reverbAmount = 1 - (intensity * 0.5);
  const panValue = (xPosition - 0.5) * 2 * CONFIG.maxPan;
  
  // ─── INSTANT PARAMETER UPDATES (reused nodes) ───────────────────────────────
  // Use .value for immediate effect (faster than setValueAtTime for static values)
  voice.filter.frequency.value = filterFreq;
  voice.filter.Q.value = CONFIG.filterQ;
  voice.panner.pan.value = panValue;
  voice.reverbSend.gain.value = reverbAmount;
  
  // ─── ENVELOPE: INSTANT ATTACK ───────────────────────────────────────────────
  // Cancel any pending automation, set gain INSTANTLY, then decay
  voice.envelope.gain.cancelScheduledValues(now);
  voice.envelope.gain.setValueAtTime(gain, now);  // INSTANT onset (0ms attack)
  voice.envelope.gain.exponentialRampToValueAtTime(0.001, now + CONFIG.decayTime);
  
  // ─── OSCILLATORS (must be new - Web Audio limitation) ───────────────────────
  const osc = audioContext.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = frequency; // Use .value (faster)
  
  const osc2 = audioContext.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = frequency * 2;
  
  const harmGain = audioContext.createGain();
  harmGain.gain.value = CONFIG.harmonicGain;
  
  // Store refs for cleanup
  voice.osc = osc;
  voice.osc2 = osc2;
  voice.harmGain = harmGain;
  
  // ─── CONNECT & START ────────────────────────────────────────────────────────
  osc.connect(voice.filter);
  osc2.connect(harmGain);
  harmGain.connect(voice.filter);
  
  osc.start(now);
  osc2.start(now);
  osc.stop(now + duration);
  osc2.stop(now + duration);
  
  // Schedule release
  osc.onended = () => releaseVoice(voice);
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
  let whooshSum = 0;
  let rollingCount = 0;
  
  // Analyze all balls for energy contribution
  for (const ball of balls) {
    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
    
    // Rolling: ball near floor + moving slowly horizontally
    const isNearFloor = (ball.y + ball.r) >= (floorY - 5);
    if (isNearFloor && speed > CONFIG.rollingMinVelocity && speed < CONFIG.rollingMaxVelocity) {
      // Weight by horizontal velocity (rolling is horizontal)
      const horizSpeed = Math.abs(ball.vx);
      rollingSum += horizSpeed / CONFIG.rollingMaxVelocity;
      rollingCount++;
    }
    
    // Whoosh: any ball moving fast
    if (speed > CONFIG.whooshMinVelocity) {
      whooshSum += (speed - CONFIG.whooshMinVelocity) / 500; // Normalize
    }
  }
  
  // Smooth the energy values (prevents jarring changes)
  const targetRolling = Math.min(1, rollingSum / Math.max(1, rollingCount * 0.5));
  const targetWhoosh = Math.min(1, whooshSum / 3);
  
  currentRollingEnergy += (targetRolling - currentRollingEnergy) * ENERGY_SMOOTH;
  currentWhooshEnergy += (targetWhoosh - currentWhooshEnergy) * ENERGY_SMOOTH;
  
  // Apply to ambient sound gains
  if (rollingGain && CONFIG.rollingEnabled) {
    const rollVol = currentRollingEnergy * CONFIG.rollingGain;
    rollingGain.gain.setTargetAtTime(rollVol, audioContext.currentTime, 0.05);
    
    // Modulate pitch slightly based on average speed
    if (rollingOsc) {
      const pitchMod = 1 + currentRollingEnergy * 0.3; // +30% at max
      rollingOsc.frequency.setTargetAtTime(CONFIG.rollingFreq * pitchMod, audioContext.currentTime, 0.1);
    }
  }
  
  if (whooshGain && CONFIG.whooshEnabled) {
    const whooshVol = currentWhooshEnergy * CONFIG.whooshGain;
    whooshGain.gain.setTargetAtTime(whooshVol, audioContext.currentTime, 0.03);
    
    // Raise filter frequency for faster movement (brighter whoosh)
    if (whooshFilter) {
      const freqMod = 1 + currentWhooshEnergy * 1.5; // Up to 2.5x
      whooshFilter.frequency.setTargetAtTime(CONFIG.whooshFreq * freqMod, audioContext.currentTime, 0.05);
    }
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
  
  // Apply preset values to config
  updateSoundConfig({
    attackTime: preset.attackTime,
    decayTime: preset.decayTime,
    harmonicGain: preset.harmonicGain,
    filterBaseFreq: preset.filterBaseFreq,
    filterVelocityRange: preset.filterVelocityRange,
    filterQ: preset.filterQ,
    reverbDecay: preset.reverbDecay,
    reverbWetMix: preset.reverbWetMix,
    masterGain: preset.masterGain,
  });
  
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

