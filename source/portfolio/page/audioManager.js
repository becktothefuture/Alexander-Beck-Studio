// AudioManager – minimal global SFX helper for LockedPortfolio and future use
// ------------------------------------------------------------
// Handles: pre-loading OGG files, resuming AudioContext on first user gesture,
//          and playing short, latency-free sound effects.
// The module purposely avoids any external dependencies so it can load early.

import { GLOBAL_CONFIG } from './config.js';

// Detect codec support
const testAudio = document.createElement('audio');
const oggSupport = testAudio.canPlayType ? testAudio.canPlayType('audio/ogg; codecs="vorbis"') : '';
// Safari returns "maybe" even though it cannot actually play OGG reliably. Treat only "probably" as safe.
const SUPPORTS_OGG = oggSupport === 'probably';
const ext = SUPPORTS_OGG ? 'ogg' : 'mp3';

// Path mapping – can be extended easily.
const SOUND_PATHS = {
  digit: new URL(`./assets/sounds/digit.${ext}`, import.meta.url).href,
  error: new URL(`./assets/sounds/error.${ext}`, import.meta.url).href,
  unlock: new URL(`./assets/sounds/unlock.${ext}`, import.meta.url).href,
};

// WebAudio context (created lazily to avoid autoplay restrictions)
const ctx = new (window.AudioContext || window.webkitAudioContext)();
let isContextUnlocked = false;
// -----------------------------------------------------------------
// Scroll-wheel click loop (iPod-style)
// -----------------------------------------------------------------
let clickBuffer = null;
let wheelSource = null;
let wheelGain = null;
let wheelFilter = null;
// Page-flip one-shot click and misc state
let stopTimeout = null;
let isLockedState = false; // Updated via setLockedState()
let knockBuffer = null;

function createClickBuffer() {
  if (clickBuffer) return;
  const sampleRate = ctx.sampleRate;
  const duration = 0.046; // 46 ms buffer (~2048 samples @44.1k)
  const length = Math.floor(sampleRate * duration);
  clickBuffer = ctx.createBuffer(1, length, sampleRate);
  const data = clickBuffer.getChannelData(0);

  const noiseEnd = Math.floor(sampleRate * 0.003); // 3 ms noise
  const sineEnd = Math.floor(sampleRate * 0.008); // next 5 ms sine

  // 0-3 ms: exponential-decay white noise burst
  for (let i = 0; i < noiseEnd; i++) {
    const decay = Math.exp(-i / noiseEnd * 6); // fast decay
    data[i] = (Math.random() * 2 - 1) * decay;
  }

  // 3-8 ms: half-cycle sine (~900 Hz)
  const freq = 900;
  for (let i = noiseEnd; i < sineEnd; i++) {
    const t = i / sampleRate;
    const env = 0.7 * (1 - (i - noiseEnd) / (sineEnd - noiseEnd)); // taper
    data[i] = Math.sin(2 * Math.PI * freq * t) * env;
  }

  // Rest already zero (silence)
}

function startWheelLoop() {
  if (wheelSource) return;
  createClickBuffer();
  wheelSource = ctx.createBufferSource();
  wheelSource.buffer = clickBuffer;
  wheelSource.loop = true;

  wheelGain = ctx.createGain();

  const cfg = GLOBAL_CONFIG.SOUND.scrollWheel;
  wheelGain.gain.value = cfg.baseGain;

  wheelFilter = ctx.createBiquadFilter();
  updateWheelTimbre();

  wheelSource.connect(wheelFilter).connect(wheelGain).connect(ctx.destination);
  wheelSource.start();
  if (GLOBAL_CONFIG.DEBUG?.audio) console.log('🎵 wheel loop start');
}

function stopWheelLoop() {
  if (!wheelSource) return;
  try { wheelSource.stop(); } catch {}
  wheelSource.disconnect();
  wheelGain.disconnect();
  wheelFilter.disconnect();
  wheelSource = wheelGain = wheelFilter = null;
  if (GLOBAL_CONFIG.DEBUG?.audio) console.log('🎵 wheel loop stop');
}

// Add helper to update filter/gain according to lock state
function updateWheelTimbre() {
  if (!wheelFilter || !wheelGain) return;
  const cfg = GLOBAL_CONFIG.SOUND.scrollWheel;
  if (isLockedState) {
    wheelFilter.type = 'lowpass';
    wheelFilter.frequency.value = cfg.blockCutoffHz;
    wheelGain.gain.value = cfg.baseGain * cfg.blockGainMul;
  } else {
    wheelFilter.type = 'highpass';
    wheelFilter.frequency.value = cfg.paperCutoffHz;
    wheelGain.gain.value = cfg.baseGain;
  }
}

// Public: call with velocity in pixels/s (absolute positive)
export function updateWheelVelocity(velocityPxPerSec = 0) {
  const cfg = GLOBAL_CONFIG.SOUND.scrollWheel;
  if (!cfg.enabled) return;

  // Map velocity to frequency (Hz)
  const freq = velocityPxPerSec * cfg.velocityToHzMultiplier;
  const playbackRate = Math.min(freq, cfg.maxPlaybackRate);

  // Safety guard: avoid passing non-finite values to WebAudio params
  if (!Number.isFinite(playbackRate)) {
    if (GLOBAL_CONFIG.DEBUG?.audio) {
      console.warn('🎵 updateWheelVelocity: non-finite playbackRate', playbackRate, 'for velocity', velocityPxPerSec);
    }
    return; // abort updates for invalid inputs
  }

  if (playbackRate === 0 || velocityPxPerSec < cfg.minVelocityThreshold) {
    // Gracefully stop after short debounce (prevents chattering at boundary)
    clearTimeout(stopTimeout);
    stopTimeout = setTimeout(stopWheelLoop, 40);
    return;
  }

  // Ensure context & loop running
  resumeContext();
  startWheelLoop();
  clearTimeout(stopTimeout);

  // Live param updates
  if (wheelSource) {
    wheelSource.playbackRate.value = playbackRate;
  }
  if (wheelGain) updateWheelTimbre();

  if (GLOBAL_CONFIG.DEBUG?.audio) {
    console.log('🎵 wheel vel', velocityPxPerSec.toFixed(1), '→ rate', playbackRate.toFixed(2));
  }
}

export function setLockedState(lock) {
  isLockedState = lock;
  updateWheelTimbre();
}

// Decoded buffers cache
const BUFFERS = {};
const pendingPlays = [];

// ─────────────────────────────────────────────
// Motion-driven notebook ambience
// ─────────────────────────────────────────────
let rustleBuffer = null;
let rustleSource = null;
let rustleGain = null;
let rustleStopTimeout = null;

function createRustleBuffer() {
  if (rustleBuffer) return;
  const sampleRate = ctx.sampleRate;
  const duration = 0.25; // 250 ms loop
  const length = Math.floor(sampleRate * duration);
  rustleBuffer = ctx.createBuffer(1, length, sampleRate);
  const data = rustleBuffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const t = i / length;
    // white noise with gentle envelope so loop edges click less
    const env = t < 0.1 ? t * 10 : (t > 0.9 ? (1 - t) * 10 : 1);
    data[i] = (Math.random() * 2 - 1) * env;
  }
}

function startRustleLoop() {
  if (rustleSource) return;
  createRustleBuffer();
  rustleSource = ctx.createBufferSource();
  rustleSource.buffer = rustleBuffer;
  rustleSource.loop = true;

  rustleGain = ctx.createGain();
  rustleGain.gain.value = 0;

  // mild band-pass to imitate paper layers
  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 1400;
  bp.Q.value = 1;

  rustleSource.connect(bp).connect(rustleGain).connect(ctx.destination);
  rustleSource.start();
}

function stopRustleLoop() {
  if (!rustleSource) return;
  try { rustleSource.stop(); } catch {}
  rustleSource.disconnect();
  rustleGain.disconnect();
  rustleSource = rustleGain = null;
}

// one-shot whoosh (120 ms) – airy page hinge
let whooshBuffer = null;
function createWhooshBuffer() {
  if (whooshBuffer) return;
  const sampleRate = ctx.sampleRate;
  const duration = 0.12;
  const length = Math.floor(sampleRate * duration);
  whooshBuffer = ctx.createBuffer(1, length, sampleRate);
  const data = whooshBuffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    const decay = Math.exp(-4 * i / length);
    data[i] = (Math.random() * 2 - 1) * decay;
  }
}

export function playWhoosh(velDegPerSec = 0) {
  const cfg = GLOBAL_CONFIG.SOUND.pageFlip;
  if (!cfg.enabled) return;
  resumeContext();
  createWhooshBuffer();
  const src = ctx.createBufferSource();
  src.buffer = whooshBuffer;
  const g = ctx.createGain();
  // Scale 0.8-1.2 × around baseGain
  const gainMul = Math.min(1.2, 0.8 + velDegPerSec / 600);
  g.gain.value = (cfg.baseGain ?? 0.35) * gainMul;

  const bp = ctx.createBiquadFilter();
  bp.type = 'bandpass';
  bp.frequency.value = 2200;
  bp.Q.value = 1;

  src.connect(bp).connect(g).connect(ctx.destination);
  src.start();
}

// landing pap (subtle thud)
let papBuffer = null;
function createPapBuffer() {
  if (papBuffer) return;
  const sampleRate = ctx.sampleRate;
  const duration = 0.03;
  const length = Math.floor(sampleRate * duration);
  papBuffer = ctx.createBuffer(1, length, sampleRate);
  const data = papBuffer.getChannelData(0);

  const noiseEnd = Math.floor(length * 0.6);
  // noise part
  for (let i = 0; i < noiseEnd; i++) {
    const env = Math.exp(-6 * i / noiseEnd);
    data[i] = (Math.random() * 2 - 1) * env;
  }
  // low sine tail 120 Hz
  for (let i = noiseEnd; i < length; i++) {
    const t = i / sampleRate;
    const env = Math.exp(-10 * (i - noiseEnd) / (length - noiseEnd));
    data[i] = Math.sin(2 * Math.PI * 120 * t) * env * 0.6;
  }
}

export function playPap() {
  resumeContext();
  createPapBuffer();
  const src = ctx.createBufferSource();
  src.buffer = papBuffer;
  const g = ctx.createGain();
  g.gain.value = 0.4; // fixed subtle
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 800;
  src.connect(lp).connect(g).connect(ctx.destination);
  src.start();
}

// ---------------------------------------------------------------------
// Simplified page-flip click (soft, single shot)
// ---------------------------------------------------------------------

function playFlipClickInternal() {
  resumeContext();
  createClickBuffer();
  const src = ctx.createBufferSource();
  src.buffer = clickBuffer;
  const g = ctx.createGain();
  g.gain.value = 0.25; // softer than before – no shrill
  // Gentle low-pass to remove harsh highs
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 1200;

  src.connect(lp).connect(g).connect(ctx.destination);
  src.start();
}

// Expose for external callers (ScrollEngine snap completion)
export function playFlipClick() {
  playFlipClickInternal();
}

// ---------------------------------------------------------------------
// updateMotion – drastically simplified: we ONLY play a click on landing.
// ---------------------------------------------------------------------
export function updateMotion({ landing = false } = {}) {
  if (landing) playFlipClickInternal();
}

// Debug helper – namespacing logs for clarity
function log(...args) {
  if (GLOBAL_CONFIG?.DEBUG?.audio) console.log('%c🎵 Audio', 'color:orange', ...args);
}

// Fetch & decode all sounds in parallel
async function loadBuffers() {
  const entries = Object.entries(SOUND_PATHS);
  await Promise.all(
    entries.map(async ([key, url]) => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arrayBuffer = await res.arrayBuffer();
        BUFFERS[key] = await ctx.decodeAudioData(arrayBuffer);
        log(`Loaded sound: ${key}`);
        // Flush pending
        pendingPlays
          .filter(req => req.id === key)
          .forEach(req => {
            play(req.id);
            pendingPlays.splice(pendingPlays.indexOf(req), 1);
          });
      } catch (err) {
        console.warn(`AudioManager: failed to load/decode ${key} (${url})`, err);
        BUFFERS[key] = null; // mark as unsupported
      }
    })
  );
}

// Kick off preload ASAP (no await – fire & forget)
loadBuffers();

// Public API --------------------------------------------------
export function resumeContext() {
  if (isContextUnlocked) return; // Already resumed
  if (ctx.state === 'suspended') {
    ctx.resume().then(() => {
      log('AudioContext resumed');
      isContextUnlocked = true;
    });
  } else {
    isContextUnlocked = true;
  }
}

export function play(id) {
  if (!isContextUnlocked) return; // Must call resumeContext() first.
  const buffer = BUFFERS[id];
  if (!buffer) {
    log(`Buffer ${id} not ready or unsupported, using HTMLAudio fallback`);
    // Fallback to HTMLAudio for browsers that can't decode OGG (e.g., Safari)
    const audioTag = new Audio(SOUND_PATHS[id]);
    audioTag.volume = 1;
    const tryPlay = () => audioTag.play().catch(err => log('HTMLAudio play error', err));
    audioTag.addEventListener('canplaythrough', tryPlay, { once: true });
    tryPlay();
    return;
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.connect(ctx.destination);
  source.start();
}

// Convenience helpers for debugging
export function isUnlocked() {
  return isContextUnlocked;
}

export function debugBuffers() {
  console.table(
    Object.keys(SOUND_PATHS).map(key => ({ key, loaded: !!BUFFERS[key] }))
  );
}

// ---------------- Page Flip Whoosh ---------------------------
// old pageFlip functions removed – superseded by playWhoosh / playPap / rustle 

// ---------------- Blocked scroll knock (used by locked portfolio) ----------------
function createKnockBuffer() {
  if (knockBuffer) return;
  const sampleRate = ctx.sampleRate;
  const duration = 0.02; // 20ms
  const length = Math.floor(sampleRate * duration);
  knockBuffer = ctx.createBuffer(1, length, sampleRate);
  const data = knockBuffer.getChannelData(0);

  // Noise burst 0-4 ms
  const noiseEnd = Math.floor(sampleRate * 0.004);
  for (let i = 0; i < noiseEnd; i++) {
    const decay = Math.exp(-5 * i / noiseEnd);
    data[i] = (Math.random() * 2 - 1) * decay;
  }

  // Low sine tail 200 Hz 4-10 ms
  const sineEnd = Math.floor(sampleRate * 0.01);
  const freq = 200;
  for (let i = noiseEnd; i < sineEnd; i++) {
    const t = i / sampleRate;
    const env = 0.8 * (1 - (i - noiseEnd) / (sineEnd - noiseEnd));
    data[i] = Math.sin(2 * Math.PI * freq * t) * env;
  }
}

export function playKnock() {
  const cfg = GLOBAL_CONFIG.SOUND.blockKnock;
  if (!cfg) return;
  resumeContext();
  createKnockBuffer();
  const src = ctx.createBufferSource();
  src.buffer = knockBuffer;
  const g = ctx.createGain();
  g.gain.value = cfg.gain;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = cfg.cutoffHz;
  src.connect(lp).connect(g).connect(ctx.destination);
  src.start();
} 