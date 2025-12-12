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
// CONFIGURATION
// ════════════════════════════════════════════════════════════════════════════════
const CONFIG = {
  // Synthesis
  attackTime: 0.008,           // 8ms soft attack
  decayTime: 0.08,             // 80ms exponential decay
  harmonicGain: 0.15,          // 2nd harmonic level (subtle warmth)
  
  // Filter (underwater muffling)
  filterBaseFreq: 2200,        // Base cutoff Hz
  filterVelocityRange: 800,    // +Hz for harder hits
  filterQ: 0.7,                // Gentle resonance
  
  // Reverb
  reverbDecay: 0.35,           // 350ms tail
  reverbWetMix: 0.35,          // 35% wet
  reverbHighDamp: 0.6,         // High-frequency damping
  
  // Volume
  minGain: 0.12,               // Softest collision
  maxGain: 0.45,               // Hardest collision (never jarring)
  masterGain: 0.7,             // Overall volume
  
  // Performance
  maxConcurrentSounds: 14,     // Prevent muddy buildup
  minTimeBetweenSounds: 0.015, // 15ms debounce per ball
  
  // Stereo
  maxPan: 0.3,                 // Subtle stereo width (-0.3 to +0.3)
};

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
let activeSoundCount = 0;
let lastSoundTime = new Map(); // ball id → timestamp

// Reduced motion preference
let prefersReducedMotion = false;

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
    // Create AudioContext
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) {
      console.warn('Web Audio API not supported');
      return false;
    }
    
    audioContext = new AudioCtx();
    
    // Resume if suspended (Safari requirement)
    if (audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Build audio graph
    buildAudioGraph();
    
    isUnlocked = true;
    isEnabled = true;
    console.log('✓ Audio unlocked and enabled');
    return true;
    
  } catch (error) {
    console.error('Failed to unlock audio:', error);
    return false;
  }
}

/**
 * Build the audio processing graph:
 * Oscillators → Filter → [Dry + Reverb] → Limiter → Master → Output
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
 * Play a collision sound
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
  
  // Throttle concurrent sounds
  if (activeSoundCount >= CONFIG.maxConcurrentSounds) return;
  
  // Debounce per-ball (prevent rapid-fire from same collision)
  if (ballId !== null) {
    const now = audioContext.currentTime;
    const lastTime = lastSoundTime.get(ballId) || 0;
    if (now - lastTime < CONFIG.minTimeBetweenSounds) return;
    lastSoundTime.set(ballId, now);
  }
  
  // Clean up old entries periodically
  if (lastSoundTime.size > 500) {
    const threshold = audioContext.currentTime - 1;
    for (const [id, time] of lastSoundTime) {
      if (time < threshold) lastSoundTime.delete(id);
    }
  }
  
  // Map ball radius to pentatonic pitch
  // Larger balls → lower pitch, smaller balls → higher pitch
  const frequency = radiusToFrequency(ballRadius);
  
  // Clamp intensity
  const clampedIntensity = Math.max(0, Math.min(1, intensity));
  
  // Play the synthesized pebble sound
  playSynthesizedPebble(frequency, clampedIntensity, xPosition);
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

/**
 * Synthesize and play a single "underwater pebble" sound
 */
function playSynthesizedPebble(frequency, intensity, xPosition) {
  const now = audioContext.currentTime;
  
  activeSoundCount++;
  
  // Calculate parameters based on intensity
  const gain = CONFIG.minGain + (CONFIG.maxGain - CONFIG.minGain) * intensity;
  const filterFreq = CONFIG.filterBaseFreq + CONFIG.filterVelocityRange * intensity;
  
  // ──────────────────────────────────────────────────────────────────────────────
  // OSCILLATOR: Sine wave (fundamental)
  // ──────────────────────────────────────────────────────────────────────────────
  const osc = audioContext.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = frequency;
  
  // ──────────────────────────────────────────────────────────────────────────────
  // OSCILLATOR 2: 2nd harmonic for warmth (subtle)
  // ──────────────────────────────────────────────────────────────────────────────
  const osc2 = audioContext.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = frequency * 2; // Octave above
  
  const harmGain = audioContext.createGain();
  harmGain.gain.value = CONFIG.harmonicGain;
  
  // ──────────────────────────────────────────────────────────────────────────────
  // MIXER: Combine oscillators
  // ──────────────────────────────────────────────────────────────────────────────
  const oscMix = audioContext.createGain();
  
  // ──────────────────────────────────────────────────────────────────────────────
  // FILTER: Low-pass for underwater muffling
  // ──────────────────────────────────────────────────────────────────────────────
  const filter = audioContext.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = filterFreq;
  filter.Q.value = CONFIG.filterQ;
  
  // ──────────────────────────────────────────────────────────────────────────────
  // ENVELOPE: Soft attack, exponential decay
  // ──────────────────────────────────────────────────────────────────────────────
  const envelope = audioContext.createGain();
  envelope.gain.setValueAtTime(0, now);
  envelope.gain.linearRampToValueAtTime(gain, now + CONFIG.attackTime);
  envelope.gain.exponentialRampToValueAtTime(0.001, now + CONFIG.attackTime + CONFIG.decayTime);
  
  // ──────────────────────────────────────────────────────────────────────────────
  // PANNER: Subtle stereo positioning
  // ──────────────────────────────────────────────────────────────────────────────
  const panner = audioContext.createStereoPanner();
  panner.pan.value = (xPosition - 0.5) * 2 * CONFIG.maxPan; // -0.3 to +0.3
  
  // ──────────────────────────────────────────────────────────────────────────────
  // CONNECT AUDIO GRAPH
  // ──────────────────────────────────────────────────────────────────────────────
  osc.connect(oscMix);
  osc2.connect(harmGain);
  harmGain.connect(oscMix);
  oscMix.connect(filter);
  filter.connect(envelope);
  envelope.connect(panner);
  
  // Route to dry + wet (reverb) buses
  panner.connect(dryGain);
  
  // Softer hits get more reverb (sound more distant)
  const reverbAmount = 1 - (intensity * 0.5); // 0.5-1.0 range
  const reverbSend = audioContext.createGain();
  reverbSend.gain.value = reverbAmount;
  panner.connect(reverbSend);
  reverbSend.connect(wetGain);
  
  // ──────────────────────────────────────────────────────────────────────────────
  // START AND STOP
  // ──────────────────────────────────────────────────────────────────────────────
  const duration = CONFIG.attackTime + CONFIG.decayTime + 0.05; // Extra buffer for reverb tail
  
  osc.start(now);
  osc2.start(now);
  osc.stop(now + duration);
  osc2.stop(now + duration);
  
  // Cleanup after sound completes
  osc.onended = () => {
    activeSoundCount = Math.max(0, activeSoundCount - 1);
    // Disconnect nodes to allow GC
    try {
      osc.disconnect();
      osc2.disconnect();
      harmGain.disconnect();
      oscMix.disconnect();
      filter.disconnect();
      envelope.disconnect();
      panner.disconnect();
      reverbSend.disconnect();
    } catch (e) { /* already disconnected */ }
  };
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
    activeSounds: activeSoundCount,
  };
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

