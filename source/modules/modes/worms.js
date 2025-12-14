// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           WORMS MODE (SIM 11)                                ║
// ║        Biologically-grounded worm locomotion (Verlet + constraints)          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// Design goals (per spec):
// - Overhead view: organisms roam the full viewport (no ground plane).
// - Each worm is a chain of circle segments (4–9), head leads, body follows.
// - Verlet integration + distance constraints (rope/soft-body style).
// - Multiple constraint passes per frame for stability.
// - Segment-vs-segment collisions (same worm non-adjacent + different worms).
// - Mouse interaction: organisms flee from the pointer.
// - Disney-ish squash & stretch (render-time) with follow-through/overlap (solver-time).
//
// Performance:
// - No per-frame allocations in update/render hot paths.
// - O(n²) collision is OK at current scale (≤ ~90 segments).

import { getGlobals } from '../core/state.js';

const TAU = Math.PI * 2;

// Simulation sizing targets (tuned for this canvas system)
const WORMS_MIN = 10;
// User override: allow some organisms to be a single ball.
const SEG_MIN_SINGLE = 1;
const SEG_MIN_CHAIN = 4;
const SEG_MAX = 9;
const SINGLE_ORGANISM_CHANCE = 0.22; // fraction of worms that are a single segment

// Constraint solver
const CONSTRAINT_PASSES = 6;
const COLLISION_PASSES = 2;

// Grounded Verlet parameters
// Overhead view: no gravity / no "ground plane". Keep motion non-floaty via friction.
const GRAVITY_PX_S2 = 0;
const DAMP_AIR = 0.88;           // default damping (overridden by panel/config)

// Locomotion (head drive)
const BASE_SPEED = 420;          // default px/s baseline (overridden by panel/config)
const STEP_HZ = 3.4;             // default cadence (overridden by panel/config)
const STEP_PULSE_SHARPNESS = 2.2;// larger = more “step-like”
const TURN_DAMP = 8.5;           // default turning inertia damping (overridden)
const TURN_NOISE = 2.0;          // default random walk strength (overridden)
const TURN_RATE_MAX = 2.1;       // rad/s clamp (prevents instant turning)
const TURN_SEEK = 6.5;           // default steer strength (overridden)

// Micro-pauses (jittery, step-like)
const PAUSE_CHANCE_PER_S = 0.35;
const PAUSE_MIN_S = 0.04;
const PAUSE_MAX_S = 0.18;

// Flee + awareness interaction
const FLEE_RADIUS = 260;         // px (scaled by DPR)
const FLEE_FORCE = 1.6;          // heading bias away from mouse
const PANIC_SPEED_BOOST = 0.85;  // extra speed multiplier at max panic

const SENSE_RADIUS = 220;        // px (scaled by DPR)
const AVOID_FORCE = 0.9;         // how strongly heads avoid other heads
const AVOID_SWIRL = 0.35;        // adds a small tangential dodge (prevents deadlocks)
const CROWD_SPEED_BOOST = 0.22;  // extra speed when near other heads

// Visual squash/stretch
const SQUASH_DECAY = 0.86;        // overridden by state.wormSquashDecay
const SPEED_STRETCH_GAIN = 0.0011; // overridden by state.wormStretchGain
const SPEED_STRETCH_MAX = 0.38;    // overridden by state.wormStretchMax

// Precomputed sine lookup table (avoids heavy trig in hot loops).
const SIN_LUT_SIZE = 256;
const SIN_LUT = (() => {
  const lut = new Float32Array(SIN_LUT_SIZE);
  for (let i = 0; i < SIN_LUT_SIZE; i++) {
    lut[i] = Math.sin((i / SIN_LUT_SIZE) * TAU);
  }
  return lut;
})();

function sinLut(theta) {
  // theta in radians, map to [0, SIN_LUT_SIZE)
  const t = theta * (SIN_LUT_SIZE / TAU);
  // Fast wrap (supports negative).
  let idx = t | 0;
  idx %= SIN_LUT_SIZE;
  if (idx < 0) idx += SIN_LUT_SIZE;
  return SIN_LUT[idx];
}

function cosLut(theta) {
  return sinLut(theta + Math.PI / 2);
}

function clamp01(x) {
  return x < 0 ? 0 : (x > 1 ? 1 : x);
}

function clamp(x, lo, hi) {
  return x < lo ? lo : (x > hi ? hi : x);
}

// Simple deterministic per-worm RNG (LCG) to avoid Math.random in hot paths.
function lcgNext(stateU32) {
  // Numerical Recipes constants (good enough here).
  return (Math.imul(stateU32, 1664525) + 1013904223) >>> 0;
}

function lcgFloat01(stateU32) {
  // Use top 24 bits for a stable float in [0,1).
  return (stateU32 >>> 8) * (1 / 16777216);
}

function smoothStep01(x) {
  // Smoothstep(0,1,x): 3x^2 - 2x^3
  x = clamp01(x);
  return x * x * (3 - 2 * x);
}

function stepPulse(phase01) {
  // Make a step-like gait envelope from a sine-ish phase without trig:
  // Use a triangle wave -> smoothstep -> sharpen.
  const t = phase01 < 0.5 ? phase01 * 2 : (1 - phase01) * 2; // 0..1..0
  const s = smoothStep01(t);
  return Math.pow(s, STEP_PULSE_SHARPNESS);
}

function getReducedMotion() {
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

/**
 * Initialize the worms simulation.
 * Stores all worm state on `globals.wormSim`.
 */
export function initializeWorms() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // Clear ball-based scene (this mode uses its own data).
  if (g.balls) g.balls.length = 0;

  const inset = Math.max(0, (g.wallInset ?? 3)) * (g.DPR || 1);
  const w = canvas.width;
  const h = canvas.height;

  // Segment radius: tie to global ball sizing so the mode “fits” the system.
  // Use the smaller side of the current ball range to keep worms readable.
  const rBase = Math.max(6, Math.min(18, (g.R_MIN || 10) * 0.95));
  const linkBase = rBase * 1.85;

  // User override: "Create twice as many" (originally 12 here) -> 24 minimum.
  const desiredPop = Math.max(WORMS_MIN, Math.round(g.wormPopulation ?? 24));
  const singleChance = clamp01(Number(g.wormSingleChance ?? SINGLE_ORGANISM_CHANCE));
  const wormCount = desiredPop;

  // First pass: decide segment counts and total segments.
  const wormSegCount = new Uint8Array(wormCount);
  const wormStart = new Uint16Array(wormCount);
  const wormTheta = new Float32Array(wormCount);
  const wormTurnRate = new Float32Array(wormCount);
  const wormTurnSquash = new Float32Array(wormCount);
  const wormStepPhase = new Float32Array(wormCount);
  const wormPause = new Float32Array(wormCount);
  const wormRng = new Uint32Array(wormCount);
  const wormColorIdx = new Uint8Array(wormCount);

  let totalSegs = 0;
  for (let wi = 0; wi < wormCount; wi++) {
    // Seed rng from time + index; deterministic enough per init.
    let seed = ((performance.now() * 1000) | 0) ^ (wi * 2654435761);
    seed = (seed >>> 0) || 1;
    wormRng[wi] = seed;

    wormRng[wi] = lcgNext(wormRng[wi]);
    const u = lcgFloat01(wormRng[wi]);
    let segs;
    if (u < singleChance) {
      segs = SEG_MIN_SINGLE;
    } else {
      wormRng[wi] = lcgNext(wormRng[wi]);
      segs = SEG_MIN_CHAIN + (wormRng[wi] % (SEG_MAX - SEG_MIN_CHAIN + 1));
    }
    wormSegCount[wi] = segs;
    wormStart[wi] = totalSegs;
    totalSegs += segs;
  }

  // Flat segment arrays (tight, cache-friendly).
  const x = new Float32Array(totalSegs);
  const y = new Float32Array(totalSegs);
  const px = new Float32Array(totalSegs);
  const py = new Float32Array(totalSegs);
  const r = new Float32Array(totalSegs);
  const segWorm = new Uint8Array(totalSegs);
  const segIndex = new Uint8Array(totalSegs);
  const squash = new Float32Array(totalSegs);

  // Overhead view: place organisms across the whole viewport.
  const minX = inset + rBase + 6;
  const maxX = w - inset - rBase - 6;
  const minY = inset + rBase + 6;
  const maxY = h - inset - rBase - 6;
  const spanX = Math.max(1, maxX - minX);
  const spanY = Math.max(1, maxY - minY);

  for (let wi = 0; wi < wormCount; wi++) {
    const start = wormStart[wi];
    const segs = wormSegCount[wi];

    wormRng[wi] = lcgNext(wormRng[wi]);
    const fx = lcgFloat01(wormRng[wi]);
    wormRng[wi] = lcgNext(wormRng[wi]);
    const fy = lcgFloat01(wormRng[wi]);
    const headX = minX + fx * spanX;
    const headY = minY + fy * spanY;

    // Initial direction free (overhead view).
    wormRng[wi] = lcgNext(wormRng[wi]);
    const dir = lcgFloat01(wormRng[wi]) * TAU;
    wormTheta[wi] = dir;
    wormTurnRate[wi] = 0;
    wormTurnSquash[wi] = 0;
    wormStepPhase[wi] = lcgFloat01(wormRng[wi]);
    wormPause[wi] = 0;

    // Color selection: keep within existing 8-color palette.
    wormRng[wi] = lcgNext(wormRng[wi]);
    wormColorIdx[wi] = wormRng[wi] % 8;

    for (let si = 0; si < segs; si++) {
      const i = start + si;
      segWorm[i] = wi;
      segIndex[i] = si;
      r[i] = rBase * (1 - si * 0.03); // subtle taper
      squash[i] = 0;

      // Lay out body behind head.
      const off = si * linkBase;
      const xx = headX - Math.cos(dir) * off;
      const yy = headY;
      x[i] = xx;
      y[i] = yy;
      px[i] = xx;
      py[i] = yy;
    }
  }

  g.wormSim = {
    // Geometry
    wormCount,
    totalSegs,
    wormSegCount,
    wormStart,
    wormColorIdx,
    linkBase,
    rBase,

    // Worm dynamics
    wormTheta,
    wormTurnRate,
    wormTurnSquash,
    wormStepPhase,
    wormPause,
    wormRng,

    // Segment buffers
    x, y, px, py, r,
    segWorm, segIndex,
    squash,
  };

  console.log(`✓ Worms initialized: ${wormCount} worms, ${totalSegs} segments`);
}

function applyBoundsAndGround(sim, canvasW, canvasH, inset) {
  const x = sim.x;
  const y = sim.y;
  const px = sim.px;
  const py = sim.py;
  const r = sim.r;
  const n = sim.totalSegs;

  const minX = inset;
  const minY = inset;
  const maxX = canvasW - inset;
  const maxY = canvasH - inset;

  // Damped "bounce" away from boundaries to prevent edge sticking.
  // (Not a bouncy sim; just enough to avoid accumulating on walls.)
  const wallDamp = 0.55;

  for (let i = 0; i < n; i++) {
    const ri = r[i];

    // Left/right bounds
    if (x[i] < minX + ri) {
      x[i] = minX + ri;
      // Reflect X velocity component (Verlet): vx = x - px
      const vx = x[i] - px[i];
      px[i] = x[i] + vx * wallDamp;
    } else if (x[i] > maxX - ri) {
      x[i] = maxX - ri;
      const vx = x[i] - px[i];
      px[i] = x[i] + vx * wallDamp;
    }

    // Ceiling (rare)
    if (y[i] < minY + ri) {
      y[i] = minY + ri;
      const vy = y[i] - py[i];
      py[i] = y[i] + vy * wallDamp;
    }

    // Bottom bound
    if (y[i] > maxY - ri) {
      y[i] = maxY - ri;
      const vy = y[i] - py[i];
      py[i] = y[i] + vy * wallDamp;
    }
  }
}

function solveLinks(sim) {
  const x = sim.x;
  const y = sim.y;
  const r = sim.r;
  const wormCount = sim.wormCount;
  const wormStart = sim.wormStart;
  const wormSegCount = sim.wormSegCount;
  const phase = sim.wormStepPhase;

  // Contraction wave (subtle): produces “soft caterpillar” propagation.
  // Keep it small to avoid springy/floating reads.
  const waveAmp = 0.05;
  const phaseOffset = 0.85;

  for (let wi = 0; wi < wormCount; wi++) {
    const start = wormStart[wi];
    const segs = wormSegCount[wi];
    const ph = phase[wi] * TAU;

    // Head leads: move follower more than leader for each link.
    // Farther from head: more symmetric.
    for (let si = 0; si < segs - 1; si++) {
      const a = start + si;
      const b = a + 1;

      const dx = x[b] - x[a];
      const dy = y[b] - y[a];
      const dist = Math.sqrt(dx * dx + dy * dy) + 1e-6;

      const taper = 0.7 + (r[a] / (sim.rBase || 1)) * 0.3;
      const rest = sim.linkBase * taper * (1 + waveAmp * sinLut(ph - si * phaseOffset));

      const delta = dist - rest;
      const nx = dx / dist;
      const ny = dy / dist;

      // Weighting biases: head leads, body follows.
      const t = si / Math.max(1, segs - 2);
      const wA = 0.18 + 0.22 * t; // leader moves little near head, more mid-body
      const wB = 1 - wA;

      const cx = nx * delta;
      const cy = ny * delta;

      x[a] += cx * wA;
      y[a] += cy * wA;
      x[b] -= cx * wB;
      y[b] -= cy * wB;
    }
  }
}

function solveCollisions(sim) {
  const x = sim.x;
  const y = sim.y;
  const r = sim.r;
  const segWorm = sim.segWorm;
  const segIndex = sim.segIndex;
  const squash = sim.squash;
  const n = sim.totalSegs;

  for (let i = 0; i < n; i++) {
    const xi = x[i];
    const yi = y[i];
    const ri = r[i];
    const wi = segWorm[i];
    const si = segIndex[i];

    for (let j = i + 1; j < n; j++) {
      // Skip adjacent segments on same worm (they are linked).
      if (wi === segWorm[j]) {
        const sj = segIndex[j];
        const d = sj > si ? (sj - si) : (si - sj);
        if (d <= 1) continue;
      }

      const dx = x[j] - xi;
      const dy = y[j] - yi;
      const rr = ri + r[j];
      const d2 = dx * dx + dy * dy;

      if (d2 < rr * rr) {
        const dist = Math.sqrt(d2) + 1e-6;
        const overlap = rr - dist;
        const nx = dx / dist;
        const ny = dy / dist;

        // Soft nudge (positional separation, no bounce).
        const push = overlap * 0.5;
        x[i] -= nx * push;
        y[i] -= ny * push;
        x[j] += nx * push;
        y[j] += ny * push;

        // Visual squash on contact (decays later).
        const impact = clamp01(overlap / rr);
        if (impact > squash[i]) squash[i] = impact;
        if (impact > squash[j]) squash[j] = impact;
      }
    }
  }
}

function updateLocomotion(sim, dt, canvasW, inset, g) {
  const x = sim.x;
  const y = sim.y;
  const px = sim.px;
  const py = sim.py;
  const wormCount = sim.wormCount;
  const wormStart = sim.wormStart;
  const wormSegCount = sim.wormSegCount;
  const theta = sim.wormTheta;
  const turnRate = sim.wormTurnRate;
  const turnSquash = sim.wormTurnSquash;
  const phase = sim.wormStepPhase;
  const pause = sim.wormPause;
  const rng = sim.wormRng;
  const canvasH = g.canvas?.height || 0;

  const dpr = g.DPR || 1;
  // Mouse attraction:
  // The worms are attracted only when they are within a circular “zone” around the pointer.
  // The zone radius is defined in vw (default 30vw).
  //
  // NOTE: We keep backward compatibility by treating `wormMouseFear` as an alias for
  // `wormMousePull` if the new key isn't present.
  const mousePull = Math.max(0, Number(g.wormMousePull ?? g.wormMouseFear ?? 1.0));
  const mouseRadiusVw = Math.max(0, Number(g.wormMouseRadiusVw ?? 30));
  const mouseRadius = (window.innerWidth * (mouseRadiusVw / 100)) * dpr;
  const mouseR2 = mouseRadius * mouseRadius;

  // IMPORTANT (realism + stability):
  // Long-range “sensing” makes the whole population behave like a pressure field,
  // and in a bounded box that pressure naturally finds the perimeter (edge-clumping).
  // Real insects interact locally, so we clamp sense radius to a fraction of the viewport.
  const minDim = Math.max(1, Math.min(canvasW, canvasH));
  const senseRRequested = Math.max(0, Number(g.wormSenseRadius ?? SENSE_RADIUS)) * dpr;
  const senseRMax = 0.28 * minDim; // local neighborhood only (in canvas px)
  const senseR = Math.min(senseRRequested, senseRMax);
  const senseR2 = senseR * senseR;
  const dotMul = Number(g.wormDotSpeedMul ?? 1.15);
  const baseSpeed = Number(g.wormBaseSpeed ?? BASE_SPEED);
  const stepHz = Number(g.wormStepHz ?? STEP_HZ);
  const noiseTurn = Number(g.wormTurnNoise ?? TURN_NOISE);
  const dampTurn = Number(g.wormTurnDamp ?? TURN_DAMP);
  const seek = Number(g.wormTurnSeek ?? TURN_SEEK);
  // Clamp avoidance to avoid “global repulsion” looks at extreme config values.
  const avoidForce = Math.min(3.0, Math.max(0, Number(g.wormAvoidForce ?? AVOID_FORCE)));
  const avoidSwirl = Math.min(1.5, Math.max(0, Number(g.wormAvoidSwirl ?? AVOID_SWIRL)));
  const crowdBoost = Number(g.wormCrowdBoost ?? CROWD_SPEED_BOOST);

  const hasMouse = g.mouseInCanvas && g.mouseX > -1e8 && g.mouseY > -1e8;
  const mx = g.mouseX;
  const my = g.mouseY;

  // Edge avoidance (simplified):
  // Strong enough to keep heads off the walls, but not so strong it looks like a force-field.
  const edgeAvoid = Math.max(0, Number(g.wormEdgeAvoid ?? 1.0));
  const edgeZone = Math.max(40 * dpr, Math.min(300 * dpr, 0.18 * minDim));
  const edgeForce = 3.6 * edgeAvoid;
  const centerForce = 0.12 * edgeAvoid; // tiny bias to break perimeter equilibria
  const cx = canvasW * 0.5;
  const cy = canvasH * 0.5;
  const edgeMinX = inset + edgeZone;
  const edgeMaxX = canvasW - inset - edgeZone;
  const edgeMinY = inset + edgeZone;
  const edgeMaxY = canvasH - inset - edgeZone;

  for (let wi = 0; wi < wormCount; wi++) {
    // Advance gait phase
    let ph = phase[wi] + (stepHz * dt);
    ph -= Math.floor(ph);
    phase[wi] = ph;

    // Pause timer + stochastic micro-pauses
    let p = pause[wi];
    if (p > 0) {
      p -= dt;
      if (p < 0) p = 0;
      pause[wi] = p;
    } else {
      rng[wi] = lcgNext(rng[wi]);
      const u = lcgFloat01(rng[wi]);
      if (u < PAUSE_CHANCE_PER_S * dt) {
        rng[wi] = lcgNext(rng[wi]);
        const u2 = lcgFloat01(rng[wi]);
        pause[wi] = PAUSE_MIN_S + (PAUSE_MAX_S - PAUSE_MIN_S) * u2;
      }
    }

    // Correlated random walk for direction (turning inertia).
    rng[wi] = lcgNext(rng[wi]);
    const noise = (lcgFloat01(rng[wi]) * 2 - 1) * noiseTurn;

    let tr = turnRate[wi];
    tr += (noise - tr * dampTurn) * dt;

    const head = wormStart[wi];
    const hx = x[head];
    const hy = y[head];

    // Attract to mouse ONLY inside the zone.
    // We also add a small tangential swirl near center to avoid hard stacking.
    let mouseInfluence = 0;
    let steerX = 0;
    let steerY = 0;
    if (hasMouse) {
      const mdx = mx - hx;
      const mdy = my - hy;
      const md2 = mdx * mdx + mdy * mdy;
      if (md2 < mouseR2 && md2 > 1e-6) {
        const md = Math.sqrt(md2);
        const t = 1 - md / mouseRadius;
        const w = t * t; // eased
        const inv = 1 / md;
        const nx = mdx * inv;
        const ny = mdy * inv;

        // Pull inward.
        const pull = w * mousePull * 2.2;
        steerX += nx * pull;
        steerY += ny * pull;

        // Gentle orbiting swirl to prevent “all pile on the mouse”.
        const swirl = w * mousePull * 0.55;
        const swirlSign = (wi & 1) ? 1 : -1;
        steerX += (-ny) * swirl * swirlSign;
        steerY += (nx) * swirl * swirlSign;

        mouseInfluence = w;
      }
    }

    // Edge repulsion field (prevents "flocking to edges" at high density).
    // Adds an inward vector when inside the edge zone.
    if (hx < edgeMinX) {
      const t = 1 - (hx - inset) / edgeZone;
      const w = t * t;
      steerX += w * edgeForce;
    } else if (hx > edgeMaxX) {
      const t = 1 - (canvasW - inset - hx) / edgeZone;
      const w = t * t;
      steerX -= w * edgeForce;
    }
    if (hy < edgeMinY) {
      const t = 1 - (hy - inset) / edgeZone;
      const w = t * t;
      steerY += w * edgeForce;
    } else if (hy > edgeMaxY) {
      const t = 1 - (canvasH - inset - hy) / edgeZone;
      const w = t * t;
      steerY -= w * edgeForce;
    }

    // Subtle center bias (always-on, very low gain).
    if (centerForce > 0) {
      const dxC = cx - hx;
      const dyC = cy - hy;
      const distC = Math.sqrt(dxC * dxC + dyC * dyC) + 1e-6;
      const w = Math.min(1, distC / (0.5 * minDim));
      steerX += (dxC / distC) * (centerForce * w);
      steerY += (dyC / distC) * (centerForce * w);
    }

    // "See each other": head-to-head avoidance + small tangential deflection.
    // O(w²) but tiny (24 worms).
    let crowd = 0;
    for (let wj = 0; wj < wormCount; wj++) {
      if (wj === wi) continue;
      const hj = wormStart[wj];
      const dx = hx - x[hj];
      const dy = hy - y[hj];
      const d2 = dx * dx + dy * dy;
      if (d2 < senseR2 && d2 > 1e-6) {
        const d = Math.sqrt(d2);
        const t = 1 - d / senseR;
        const w = t * t;
        const inv = 1 / d;
        const nx = dx * inv;
        const ny = dy * inv;
        steerX += nx * (w * avoidForce);
        steerY += ny * (w * avoidForce);
        // Tangential "slide past" to avoid getting stuck in pure repulsion.
        const tx = -ny;
        const ty = nx;
        const swirlSign = (wi & 1) ? 1 : -1;
        steerX += tx * (w * avoidSwirl * swirlSign);
        steerY += ty * (w * avoidSwirl * swirlSign);
        crowd = Math.max(crowd, w);
      }
    }

    // If we have a steering vector, nudge turn rate toward its direction.
    if (steerX !== 0 || steerY !== 0) {
      // Desired heading = current heading + steering.
      const th0 = theta[wi];
      const fx = cosLut(th0) + steerX;
      const fy = sinLut(th0) + steerY;
      const desired = Math.atan2(fy, fx);
      let da = desired - th0;
      // Wrap to [-π, π]
      if (da > Math.PI) da -= TAU;
      else if (da < -Math.PI) da += TAU;
      tr += da * seek * dt;
    }

    tr = clamp(tr, -TURN_RATE_MAX, TURN_RATE_MAX);
    turnRate[wi] = tr;

    let th = theta[wi] + tr * dt;
    // Keep theta in [-π, π] (optional but prevents drift).
    if (th > Math.PI) th -= TAU;
    else if (th < -Math.PI) th += TAU;
    theta[wi] = th;

    // Turning squash driver (Disney-ish: squash on sharp turns / stopping).
    // This is a mode-level signal applied in rendering; it decays smoothly.
    const turn01 = Math.min(1, Math.abs(tr) / TURN_RATE_MAX);
    const turnGain = Math.max(0, Number(g.wormTurnSquashGain ?? 0.28));
    const targetTurnSquash = Math.min(1, turn01 * turnGain);
    // Smooth in/out (slow-in/slow-out)
    turnSquash[wi] += (targetTurnSquash - turnSquash[wi]) * Math.min(1, 10 * dt);

    // Step envelope (bursty locomotion, eased).
    const pulse = stepPulse(ph);
    const pauseMul = pause[wi] > 0 ? 0 : 1;
    const segs = wormSegCount[wi];

    // Size-speed relationship:
    // - Single dots should be slower than multi-segment organisms.
    // - Longer worms should move faster (head leads, body follows).
    //
    // Keep this lightweight and deterministic.
    const lenT = (segs - 1) / Math.max(1, (SEG_MAX - 1)); // 0..1
    const lengthSpeedGain = 0.90; // max +90% at full length (9 segments)
    const lengthMul = 1 + lengthSpeedGain * lenT;

    // Dot speed: interpret wormDotSpeedMul as an inverse for dots.
    // (Higher slider value => dots slower). This matches the current config
    // where dots were previously too fast (e.g. 2.5).
    const dotSpeedMul = (segs === 1)
      ? clamp(1 / Math.max(0.05, dotMul), 0.05, 2.0)
      : 1;

    const speedBase = baseSpeed * (0.30 + 1.05 * pulse) * pauseMul * lengthMul * dotSpeedMul;
    // Slight speed-up when being “drawn in”, but no runaway acceleration.
    const speed = speedBase * (1 + mouseInfluence * 0.35 + crowd * crowdBoost);

    const dt2 = dt * dt;
    const ax = cosLut(th) * speed * dt2;
    const ay = sinLut(th) * speed * dt2;

    // Apply “muscle” to head as acceleration in Verlet form.
    x[head] += ax;
    y[head] += ay;

    // Follow-through: a small lag impulse propagated down the chain by constraints.
    // (No allocations; just slightly bias the second segment’s previous position.)
    if (segs > 2) {
      const neck = head + 1;
      const vx = x[head] - px[head];
      px[neck] -= vx * 0.05;
      py[neck] -= (y[head] - py[head]) * 0.02;
    }
  }
}

/**
 * Per-frame update for Worms mode.
 * Called from the physics engine's mode-specialized path.
 */
export function updateWorms(dtSeconds) {
  const g = getGlobals();
  const sim = g.wormSim;
  const canvas = g.canvas;
  if (!sim || !canvas) return;

  // Respect reduced motion: keep static (no autonomous movement).
  const reducedMotion = getReducedMotion();

  const dt = Math.min(0.033, Math.max(0, dtSeconds));
  if (dt <= 0) return;

  const inset = Math.max(0, (g.wallInset ?? 3)) * (g.DPR || 1);

  if (!reducedMotion) {
    // Locomotion state updates (head drive).
    updateLocomotion(sim, dt, canvas.width, inset, g);

    // Verlet integration for all segments.
    const x = sim.x;
    const y = sim.y;
    const px = sim.px;
    const py = sim.py;
    const n = sim.totalSegs;
    const damp = clamp(Number(g.wormDamping ?? DAMP_AIR), 0.0, 0.9999);
    const squashDecay = clamp(Number(g.wormSquashDecay ?? SQUASH_DECAY), 0.0, 0.9999);

    // Gravity term in Verlet form: a * dt^2
    const gy = 0;

    for (let i = 0; i < n; i++) {
      const vx = (x[i] - px[i]) * damp;
      const vy = (y[i] - py[i]) * damp;

      px[i] = x[i];
      py[i] = y[i];

      x[i] += vx;
      y[i] += (vy + gy);

      // Decay contact squash for visuals.
      sim.squash[i] *= squashDecay;
    }

    // Constraint solver passes:
    // 1) link lengths (rope constraints)
    // 2) collisions (circle non-overlap)
    // 3) bounds + ground traction
    for (let p = 0; p < CONSTRAINT_PASSES; p++) {
      solveLinks(sim);
      applyBoundsAndGround(sim, canvas.width, canvas.height, inset);
    }

    for (let p = 0; p < COLLISION_PASSES; p++) {
      solveCollisions(sim);
      applyBoundsAndGround(sim, canvas.width, canvas.height, inset);
    }
  } else {
    // Reduced motion: still enforce bounds and decay squash.
    applyBoundsAndGround(sim, canvas.width, canvas.height, inset);
    for (let i = 0; i < sim.totalSegs; i++) {
      sim.squash[i] *= clamp(Number(g.wormSquashDecay ?? SQUASH_DECAY), 0.0, 0.9999);
    }
  }
}

/**
 * Render worms as squashed/stretched circles (ellipses) aligned to velocity.
 * Called from physics engine render() when this mode is active.
 */
export function renderWorms(ctx) {
  const g = getGlobals();
  const sim = g.wormSim;
  const canvas = g.canvas;
  if (!sim || !canvas) return;

  const colors = g.currentColors || [];
  const x = sim.x;
  const y = sim.y;
  const px = sim.px;
  const py = sim.py;
  const r = sim.r;
  const squash = sim.squash;
  const segWorm = sim.segWorm;
  const wormColorIdx = sim.wormColorIdx;
  const turnSquash = sim.wormTurnSquash;
  const n = sim.totalSegs;

  // Use a fixed dt for velocity visualization to keep stable at different frame rates.
  const dt = 1 / 60;
  const invDt = 1 / dt;

  const stretchGain = Number(g.wormStretchGain ?? SPEED_STRETCH_GAIN);
  const stretchMax = Number(g.wormStretchMax ?? SPEED_STRETCH_MAX);
  const contactX = Number(g.wormContactSquashX ?? 0.22);
  const contactY = Number(g.wormContactSquashY ?? 0.35);

  for (let i = 0; i < n; i++) {
    const vx = (x[i] - px[i]) * invDt;
    const vy = (y[i] - py[i]) * invDt;
    const speed = Math.sqrt(vx * vx + vy * vy);

    // Stretch along velocity; preserve area via inverse scaling.
    const stretch = clamp(speed * stretchGain, 0, stretchMax);
    const wi = segWorm[i];
    const contact = clamp01(Math.max(squash[i], turnSquash ? (turnSquash[wi] || 0) : 0));

    const sx = (1 + stretch) * (1 - contact * contactX);
    const sy = (1 / (1 + stretch)) * (1 + contact * contactY);

    // Align to velocity direction when moving; otherwise keep neutral.
    const ang = speed > 2 ? Math.atan2(vy, vx) : 0;

    const ci = wormColorIdx[wi] % 8;
    const fill = colors[ci] || '#0a0a0a';

    ctx.save();
    ctx.translate(x[i], y[i]);
    if (ang !== 0) ctx.rotate(ang);
    ctx.scale(sx, sy);
    ctx.beginPath();
    ctx.arc(0, 0, r[i], 0, TAU);
    ctx.fillStyle = fill;
    ctx.fill();
    ctx.restore();
  }
}

