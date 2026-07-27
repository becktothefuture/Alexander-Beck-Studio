// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         CARBONATED BUBBLES MODE                              ║
// ║    Bubbles nucleate from lower drink sites, rise to terminal speed,          ║
// ║    shear around pointer/touch bodies, pop at the top, then recycle.          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, getMobileAdjustedCount } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { playCollisionSound } from '../audio/sound-engine.js';
import { pickRandomColorWithIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';
import { resolveAtmosphereDepthProfile } from '../rendering/atmosphere/atmosphere-frame-hook.js';

const TAU = Math.PI * 2;
const POINTER_SPEED_SMOOTHING = 0.18;
const SOURCE_COUNT_DESKTOP = 18;
const SOURCE_COUNT_MOBILE = 12;
const RISE_TAU = 0.62;
const LATERAL_DRAG_PER_S = 8.5;
const POINTER_FIELD_MUL = 2.2;
const POINTER_REPEL = 900;
const POINTER_CURL = 420;
const POINTER_WAKE = 260;
const MAX_SPEED = 760;
const BUBBLE_SOUND_GLOBAL_MS = 55;
const BUBBLE_SOUND_BUBBLE_MS = 260;

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function smooth01(value) {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
}

function nextSeed(seed) {
  let x = (seed || 0x9e3779b9) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return x >>> 0;
}

function randomFromBall(ball) {
  ball.bubbleSeed = nextSeed(ball.bubbleSeed);
  return (ball.bubbleSeed >>> 0) / 4294967296;
}

function getReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getBubbleBand(g, canvas) {
  const h = canvas.height;
  const extent = Math.max(0.15, Math.min(1, g.bubblesVerticalExtent ?? 1));
  const halfBand = (h * extent) / 2;
  const centerY = h / 2;
  const bandTop = Math.max(0, centerY - halfBand);
  const bandBottom = Math.min(h, centerY + halfBand);
  return { bandTop, bandBottom };
}

function getBubbleZ(g, sideRandom = Math.random(), depthRandom = Math.random()) {
  const atmosphereProfile = resolveAtmosphereDepthProfile(MODES.BUBBLES);
  if (atmosphereProfile) {
    const plane = clamp(Number(atmosphereProfile.plane ?? 0.5), 0, 1);
    const span = clamp(Number(atmosphereProfile.spread ?? 0.26), 0.02, 1);
    const frontShare = clamp01(Number(atmosphereProfile.frontShare ?? 0.34));
    const halfSpan = span * 0.5;
    const z = sideRandom < frontShare
      ? plane + depthRandom * halfSpan
      : plane - depthRandom * halfSpan;
    return clamp(z, 0, 1);
  }
  const span = Math.max(0.1, Math.min(1, g.bubblesDepthSpan ?? 0.8));
  const z = 0.5 + (Math.random() - 0.5) * span;
  return Math.max(0, Math.min(1, z));
}

export function refreshBubbleAtmosphereDepth() {
  const g = getGlobals();
  if (g.currentMode !== MODES.BUBBLES || !Array.isArray(g.balls)) return;
  for (let i = 0; i < g.balls.length; i += 1) {
    const ball = g.balls[i];
    ball.z = getBubbleZ(g, randomFromBall(ball), randomFromBall(ball));
    assignBubbleTraits(ball, g, ball.bubbleSourceIndex || 0);
  }
}

function getBubbleSources(g, canvas) {
  const count = g.isMobile || g.isMobileViewport ? SOURCE_COUNT_MOBILE : SOURCE_COUNT_DESKTOP;
  const key = `${canvas.width}:${canvas.height}:${count}`;
  if (g.bubbleNucleationKey === key && Array.isArray(g.bubbleNucleationSources)) {
    return g.bubbleNucleationSources;
  }

  const sources = [];
  const w = canvas.width;
  const dpr = g.DPR || 1;
  for (let i = 0; i < count; i++) {
    const lane = count <= 1 ? 0.5 : i / (count - 1);
    const edgeBias = Math.sin(lane * Math.PI);
    const jitter = (Math.random() - 0.5) * (w / count) * 0.7;
    const x = clamp((lane * w) + jitter, 24 * dpr, w - 24 * dpr);
    sources.push({
      x,
      phase: Math.random() * TAU,
      jitter: (18 + edgeBias * 42) * dpr,
      seed: nextSeed((Math.random() * 4294967295) >>> 0)
    });
  }

  g.bubbleNucleationKey = key;
  g.bubbleNucleationSources = sources;
  return sources;
}

function chooseBubbleSource(g, canvas, seed01 = Math.random()) {
  const sources = getBubbleSources(g, canvas);
  const count = sources.length;
  if (count === 0) return null;
  const index = Math.max(0, Math.min(count - 1, Math.floor(seed01 * count)));
  return { source: sources[index], index };
}

function assignBubbleTraits(ball, g, sourceIndex = ball.bubbleSourceIndex || 0) {
  const dpr = g.DPR || 1;
  const radiusSpan = Math.max(1, (g.R_MAX || ball.targetRadius) - (g.R_MIN || ball.targetRadius));
  const sizeN = clamp((ball.targetRadius - (g.R_MIN || ball.targetRadius)) / radiusSpan, 0, 1);
  const sizeMul = 0.82 + sizeN * 0.3;
  const depthMul = 0.72 + (ball.z ?? 0.5) * 0.56;
  const speedSeed = 0.88 + randomFromBall(ball) * 0.24;

  ball.bubbleSourceIndex = sourceIndex;
  ball.bubbleTerminalMul = depthMul * sizeMul * speedSeed;
  ball.bubbleAge = 0;
  ball.bubbleLaneDrift = (randomFromBall(ball) - 0.5) * 28 * dpr;
  ball.wobblePhase = randomFromBall(ball) * TAU;
  ball.wobbleFreq = 1.35 + (1 - sizeN) * 1.6 + randomFromBall(ball) * 0.55;
  ball.wobbleMul = 0.45 + sizeN * 0.85 + randomFromBall(ball) * 0.25;
  ball.bubbleWakeMemory = 0;
  ball.bubbleNextSoundAtMs = 0;
}

function resetBubbleAtSource(ball, { initialY = null, spawnProgress = 0 } = {}) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  const dpr = g.DPR || 1;
  const { bandTop, bandBottom } = getBubbleBand(g, canvas);
  const seededSource = chooseBubbleSource(g, canvas, randomFromBall(ball));
  const source = seededSource?.source || { x: randomFromBall(ball) * canvas.width, jitter: 40 * dpr, phase: 0 };
  const sourceIndex = seededSource?.index || 0;
  const jitter = (randomFromBall(ball) - 0.5) * source.jitter;
  const { color, distributionIndex } = pickRandomColorWithIndex();
  const targetRadius = randomRadiusForMode(g, MODES.BUBBLES);
  const z = getBubbleZ(g);
  const y = Number.isFinite(initialY)
    ? initialY
    : bandBottom - targetRadius;

  ball.x = clamp(source.x + jitter, -targetRadius * 2, canvas.width + targetRadius * 2);
  ball.y = clamp(y, bandTop + targetRadius, bandBottom - targetRadius);
  ball.color = color;
  ball.distributionIndex = distributionIndex;
  ball.z = z;
  ball.depthScale = 1;
  ball.targetRadius = targetRadius;
  ball.baseRadius = targetRadius;
  ball.spawning = spawnProgress < 1;
  ball.spawnProgress = clamp01(spawnProgress);
  ball.dissipating = false;
  ball.dissipateProgress = 0;
  ball.microBurst = false;
  ball.microTime = 0;
  ball.microLife = 0;
  ball.microStartRadius = 0;
  ball.alpha = 1;

  const ease = 1 - Math.pow(1 - ball.spawnProgress, 3);
  ball.r = targetRadius * ease;
  ball.rBase = ball.r;
  assignBubbleTraits(ball, g, sourceIndex);

  const riseSpeed = Math.max(1, Number(g.bubblesRiseSpeed) || 360);
  ball.vx = (randomFromBall(ball) - 0.5) * 16 * dpr;
  ball.vy = -riseSpeed * dpr * ball.bubbleTerminalMul * (0.18 + randomFromBall(ball) * 0.22);
}

function updateBubblePointerState(g, dt) {
  const dpr = g.DPR || 1;
  const active = Boolean(g.pointerInCanvas || g.mouseInCanvas);
  const pointerX = Number.isFinite(g.pointerX) ? g.pointerX : g.mouseX;
  const pointerY = Number.isFinite(g.pointerY) ? g.pointerY : g.mouseY;
  const hasPoint = active && Number.isFinite(pointerX) && Number.isFinite(pointerY);

  g.bubblesReducedMotion = getReducedMotion();

  if (!hasPoint || dt <= 0) {
    g.bubblesPointerActive = false;
    g.bubblesPointerSpeed = 0;
    g.bubblesPointerVx *= 0.8;
    g.bubblesPointerVy *= 0.8;
    return;
  }

  if (!g.bubblesPointerActive || g.pointerJustEnteredCanvas) {
    g.bubblesPointerLastX = pointerX;
    g.bubblesPointerLastY = pointerY;
    g.bubblesPointerVx = 0;
    g.bubblesPointerVy = 0;
    g.bubblesPointerSpeed = 0;
  } else {
    const invDt = 1 / Math.max(dt, 0.001);
    const vx = (pointerX - g.bubblesPointerLastX) * invDt;
    const vy = (pointerY - g.bubblesPointerLastY) * invDt;
    g.bubblesPointerVx += (vx - g.bubblesPointerVx) * POINTER_SPEED_SMOOTHING;
    g.bubblesPointerVy += (vy - g.bubblesPointerVy) * POINTER_SPEED_SMOOTHING;
    g.bubblesPointerSpeed = Math.hypot(g.bubblesPointerVx, g.bubblesPointerVy);
  }

  g.bubblesPointerActive = true;
  g.bubblesPointerX = pointerX;
  g.bubblesPointerY = pointerY;
  g.bubblesPointerLastX = pointerX;
  g.bubblesPointerLastY = pointerY;
  g.bubblesPointerObjectRadius = Math.max((g.bubblesDeflectRadius || 0) * dpr * 0.46, 42 * dpr);
}

function tryBubbleSound(ball, intensity, kind = 'bubble') {
  const g = getGlobals();
  if (g.bubblesReducedMotion) return;
  const now = typeof performance !== 'undefined' ? performance.now() : 0;
  if (now < (g.bubblesLastSoundAtMs || 0) + BUBBLE_SOUND_GLOBAL_MS) return;
  if (now < (ball.bubbleNextSoundAtMs || 0)) return;
  const canvas = g.canvas;
  const pan = canvas ? clamp01(ball.x / Math.max(1, canvas.width)) : 0.5;
  const safeIntensity = clamp(intensity, 0.72, 0.98);
  g.bubblesLastSoundAtMs = now;
  ball.bubbleNextSoundAtMs = now + BUBBLE_SOUND_BUBBLE_MS + randomFromBall(ball) * 180;
  playCollisionSound(ball.r || ball.targetRadius || 12, safeIntensity, pan, `${ball._soundId}-${kind}`);
}

export function initializeBubbles() {
  const g = getGlobals();
  // Clear existing balls
  g.balls.length = 0;
  
  const canvas = g.canvas;
  if (!canvas) return;
  
  const w = canvas.width;
  const density = clamp(Number(g.bubblesDensity ?? 0.8), 0, 1);
  const mobileDensityMul = (g.isMobile || g.isMobileViewport)
    ? clamp(Number(g.bubblesMobileDensityMul ?? 0.75), 0, 1)
    : 1;
  const count = getMobileAdjustedCount(Math.round((g.bubblesMaxCount || 200) * density * mobileDensityMul));
  if (count <= 0) return;
  const { bandTop, bandBottom } = getBubbleBand(g, canvas);
  getBubbleSources(g, canvas);
  g.bubblesPointerActive = false;
  g.bubblesPointerVx = 0;
  g.bubblesPointerVy = 0;
  g.bubblesPointerSpeed = 0;
  g.bubblesLastSoundAtMs = 0;
  g.bubblesReducedMotion = getReducedMotion();
  
  // Initial distribution: spread across the entire height with staggered spawn progress
  // to avoid clumping at the bottom on first frame. Recycles still come from below.
  // Seed the shared distribution once so each legend color appears.
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = bandTop + Math.random() * (bandBottom - bandTop);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const seededProgress = Math.random(); // staggered scale-in phase
    createBubble(x, y, color, distributionIndex, false, seededProgress);
  }
  
  // Fill rest with random colors across height, staggered progress
  for (let i = 8; i < count; i++) {
    const x = Math.random() * w;
    const y = bandTop + Math.random() * (bandBottom - bandTop);
    const { color, distributionIndex } = pickRandomColorWithIndex();
    const seededProgress = Math.random();
    createBubble(x, y, color, distributionIndex, false, seededProgress);
  }
}

/**
 * Create a bubble ball at position (x, y) with given color
 * @param {boolean} alreadyVisible - If true, skip spawn animation (for initial setup)
 * @param {number} [spawnProgressSeed] - Optional 0..1 seed to stagger initial spawn
 */
function createBubble(x, y, color, distributionIndex, alreadyVisible = false, spawnProgressSeed) {
  const g = getGlobals();
  
  const targetRadius = randomRadiusForMode(g, MODES.BUBBLES);
  const z = getBubbleZ(g);
  
  const baseProgress = Number.isFinite(spawnProgressSeed) ? Math.max(0, Math.min(1, spawnProgressSeed)) : (alreadyVisible ? 1 : 0);
  const initialEase = 1 - Math.pow(1 - baseProgress, 3);
  const initialRadius = targetRadius * initialEase;
  const b = new Ball(x, y, initialRadius, color);
  b.distributionIndex = distributionIndex;
  b.isBubble = true;
  b.z = z; // Random z-depth centered on logo
  b.depthScale = 1;
  b.baseRadius = targetRadius;
  b.targetRadius = targetRadius;
  b.bubbleSeed = nextSeed((((x + 1) * 73856093) ^ ((y + 1) * 19349663) ^ ((g.balls.length + 1) * 83492791)) >>> 0);
  
  // Animation states
  b.spawning = baseProgress < 1 && !alreadyVisible;
  b.spawnProgress = baseProgress;
  b.dissipating = false;
  b.dissipateProgress = 0;
  b.alpha = 1;
  b.microBurst = false;
  b.microTime = 0;
  b.microLife = 0;
  b.microStartRadius = 0;
  assignBubbleTraits(b, g, Math.floor(randomFromBall(b) * Math.max(1, getBubbleSources(g, g.canvas).length)));
  const riseSpeed = Math.max(1, Number(g.bubblesRiseSpeed) || 360);
  b.vx = (randomFromBall(b) - 0.5) * 18 * (g.DPR || 1);
  b.vy = -riseSpeed * (g.DPR || 1) * b.bubbleTerminalMul * (0.25 + randomFromBall(b) * 0.35);
  
  g.balls.push(b);
  return b;
}

/**
 * Recycle a bubble - reset it to the bottom with new properties
 */
function recycleBubble(ball) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;
  resetBubbleAtSource(ball, { spawnProgress: 0 });
}

export function applyBubblesForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.BUBBLES) return;
  if (!ball.isBubble) return;
  
  const canvas = g.canvas;
  if (!canvas) return;
  const { bandTop } = getBubbleBand(g, canvas);
  const step = Math.min(0.033, Math.max(0, dt));
  if (step <= 0) return;

  // Micro-burst phase: tiny burst that fades quickly, then recycle
  if (ball.microBurst) {
    ball.microTime += step;
    const life = ball.microLife || 0.18;
    const t = Math.min(1, life > 0 ? ball.microTime / life : 1);
    const shrink = Math.max(0, 1 - t);
    ball.vx *= 0.94;
    ball.vy *= 0.90;
    ball.r = ball.microStartRadius * shrink;
    ball.rBase = ball.r;
    ball.alpha = Math.max(0, 1 - t);
    if (t >= 1) {
      ball.microBurst = false;
      recycleBubble(ball);
    }
    return;
  }
  
  // Handle spawn animation (scale up from 0)
  if (ball.spawning) {
    ball.spawnProgress += step * (g.bubblesReducedMotion ? 2.2 : 2.8);
    
    // Ease out for smooth appearance
    const ease = 1 - Math.pow(1 - Math.min(1, ball.spawnProgress), 3);
    ball.r = ball.targetRadius * ease;
    ball.rBase = ball.r;
    
    if (ball.spawnProgress >= 1) {
      ball.spawning = false;
      ball.r = ball.targetRadius;
      ball.rBase = ball.r;
    }
  }
  
  const dpr = g.DPR || 1;
  const reducedMotion = Boolean(g.bubblesReducedMotion);
  const riseSpeed = Math.max(1, Number(g.bubblesRiseSpeed) || 360) * (reducedMotion ? 0.55 : 1);
  const wobbleStrength = ((Number(g.bubblesWobble) || 40) * 0.01) * (reducedMotion ? 0.4 : 1);
  const targetVy = -riseSpeed * dpr * (ball.bubbleTerminalMul || 1);
  const riseBlend = 1 - Math.exp(-step / RISE_TAU);
  ball.vy += (targetVy - ball.vy) * riseBlend;

  ball.bubbleAge = (ball.bubbleAge || 0) + step;
  if (ball.bubbleAge > 10000) ball.bubbleAge %= TAU;
  ball.wobblePhase = ((ball.wobblePhase || 0) + (ball.wobbleFreq || 2) * step) % TAU;
  const lateralLift = Math.sin(ball.wobblePhase) * wobbleStrength * (ball.wobbleMul || 1) * 160 * dpr;
  const slowDrift = Math.sin((ball.bubbleAge || 0) * 0.38 + (ball.bubbleSourceIndex || 0)) * (ball.bubbleLaneDrift || 0);
  ball.vx += (lateralLift + slowDrift) * step;

  const lateralDamp = Math.exp(-LATERAL_DRAG_PER_S * step);
  ball.vx *= lateralDamp;

  if (g.bubblesPointerActive && !reducedMotion) {
    const dx = ball.x - g.bubblesPointerX;
    const dy = ball.y - g.bubblesPointerY;
    const objectRadius = Math.max(1, g.bubblesPointerObjectRadius || (48 * dpr));
    const fieldRadius = objectRadius * POINTER_FIELD_MUL;
    const fieldRadiusSq = fieldRadius * fieldRadius;
    const d2 = dx * dx + dy * dy;

    if (d2 < fieldRadiusSq && d2 > 0.0001) {
      const dist = Math.sqrt(d2);
      const invDist = 1 / dist;
      const nx = dx * invDist;
      const ny = dy * invDist;
      const q = smooth01(1 - dist / fieldRadius);
      const pointerSpeed = Math.min(1, (g.bubblesPointerSpeed || 0) / (900 * dpr));
      const minDist = objectRadius + Math.max(1, ball.r || ball.targetRadius || 1);
      let impulse = 0;

      if (dist < minDist) {
        const push = Math.pow((minDist - dist) / objectRadius, 2);
        const force = POINTER_REPEL * dpr * push;
        ball.vx += nx * force * step;
        ball.vy += ny * force * 0.55 * step;
        const vn = ball.vx * nx + ball.vy * ny;
        if (vn < 0) {
          ball.vx -= nx * vn * 0.65;
          ball.vy -= ny * vn * 0.65;
        }
        impulse += force * push;
      }

      let axisX = 0;
      let axisY = -1;
      const pointerSpeedAbs = g.bubblesPointerSpeed || 0;
      if (pointerSpeedAbs > 18 * dpr) {
        const invSpeed = 1 / pointerSpeedAbs;
        axisX = g.bubblesPointerVx * invSpeed;
        axisY = g.bubblesPointerVy * invSpeed;
      }

      const side = (nx * axisY - ny * axisX) >= 0 ? 1 : -1;
      const tx = -ny * side;
      const ty = nx * side;
      const curl = q * q * POINTER_CURL * dpr * (0.45 + pointerSpeed);
      ball.vx += tx * curl * step;
      ball.vy += ty * curl * 0.42 * step;
      impulse += curl;

      const along = dx * axisX + dy * axisY;
      if (along < 0) {
        const wakeQ = q * smooth01((-along) / fieldRadius);
        ball.bubbleWakeMemory = Math.max(ball.bubbleWakeMemory || 0, wakeQ);
        ball.vx += tx * POINTER_WAKE * dpr * wakeQ * step;
        ball.vy += POINTER_WAKE * dpr * wakeQ * 0.22 * step;
      }

      if (q > 0.62 && impulse > 520 * dpr && randomFromBall(ball) > 0.86) {
        tryBubbleSound(ball, 0.72 + Math.min(0.2, impulse / (4200 * dpr)), 'slip');
      }
    }
  } else {
    ball.bubbleWakeMemory = (ball.bubbleWakeMemory || 0) * 0.92;
  }

  const maxSpeed = MAX_SPEED * dpr;
  const speed = Math.hypot(ball.vx, ball.vy);
  if (speed > maxSpeed && speed > 0) {
    const scale = maxSpeed / speed;
    ball.vx *= scale;
    ball.vy *= scale;
  }
  
  if (!Number.isFinite(ball.x) || !Number.isFinite(ball.y) || !Number.isFinite(ball.vx) || !Number.isFinite(ball.vy)) {
    recycleBubble(ball);
    return;
  }

  // Check if bubble reached top of band - surface pop then recycle.
  const topThreshold = bandTop + Math.max(2, ball.targetRadius);
  
  if (ball.y < topThreshold && !ball.spawning && !ball.microBurst) {
    // Start micro-burst pop: quick fade/shrink, then recycle to bottom
    ball.microBurst = true;
    ball.microTime = 0;
    ball.microLife = 0.18;
    ball.microStartRadius = Math.max(0.2, ball.targetRadius);
    ball.r = ball.microStartRadius;
    ball.rBase = ball.r;
    ball.alpha = 1;
    ball.vx = (randomFromBall(ball) - 0.5) * 34 * dpr;
    ball.vy = -(90 + randomFromBall(ball) * 50) * dpr;
    if (!reducedMotion && randomFromBall(ball) > 0.68) {
      tryBubbleSound(ball, 0.74 + Math.min(0.18, (ball.targetRadius || 1) / Math.max(1, g.R_MAX || 24) * 0.18), 'pop');
    }
    return;
  }
  
  const wrapMargin = Math.max(24 * dpr, (ball.r || ball.targetRadius || 12) * 4);
  if (ball.x < -wrapMargin) {
    ball.x = canvas.width + wrapMargin;
  } else if (ball.x > canvas.width + wrapMargin) {
    ball.x = -wrapMargin;
  }

  const { bandBottom } = getBubbleBand(g, canvas);
  if (ball.y > bandBottom + wrapMargin * 3 || Math.hypot(ball.vx, ball.vy) > maxSpeed * 4) {
    recycleBubble(ball);
  }
}

export function updateBubbles(dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.BUBBLES) return;
  updateBubblePointerState(g, Math.min(0.033, Math.max(0, dt)));
}
