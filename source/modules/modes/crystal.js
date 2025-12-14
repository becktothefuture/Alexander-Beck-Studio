// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         CRYSTAL GROWTH MODE (SIM 12)                          ║
// ║        Magical bonding structures with hard caps (cursor = movement only)     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
//
// Design goals:
// - Balls accumulate "crystal mass" automatically over time (cursor does NOT affect growth).
// - When sufficiently "charged", nearby balls form permanent-ish bonds (branching structures).
// - Bonds are constraint-solved (PBD-style) to create stable crystalline geometry.
// - Visuals are intentionally noticeable: glowing bonds, pulsing balls, particle bursts.
// - Performance is protected via hard caps (balls, bonds, particles) and short-circuits.
//
// Accessibility:
// - Respects prefers-reduced-motion by disabling particles and reducing pulsing.
//
// Performance:
// - No per-frame allocations in hot paths; uses typed arrays + ring buffers.

import { getGlobals, clearBalls } from '../core/state.js';
import { spawnBall } from '../physics/spawn.js';
import { getColorByIndex, pickRandomColor } from '../visual/colors.js';

const TAU = Math.PI * 2;

function clamp(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

function getReducedMotion() {
  try {
    return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
  } catch (_) {
    return false;
  }
}

function safeDpr(g) {
  return (g.DPR || 1);
}

function ensureBallCrystalFields(ball) {
  // Per-ball state kept on the ball object (no allocations during update).
  ball._crystalMass = ball._crystalMass ?? 0;
  ball._crystalBonds = ball._crystalBonds ?? 0;
  ball._crystalFlash = ball._crystalFlash ?? 0;
}

function adjIndex(n, i, j) {
  return i * n + j;
}

function getAccentColor(g) {
  // Cursor highlight is spec'd as palette index 5, but rely on current palette runtime values.
  return g.cursorBallColor || getColorByIndex(5);
}

function spawnParticleBurst(sim, x, y, color, count, reducedMotion) {
  if (reducedMotion) return;
  const cap = sim.pCap;
  if (cap <= 0) return;

  const n = clamp(count | 0, 0, 12);
  const life = Math.max(0.05, sim.pLife);

  for (let i = 0; i < n; i++) {
    const idx = sim.pHead;
    sim.pHead = (sim.pHead + 1) % cap;
    if (sim.pCount < cap) sim.pCount++;

    const a = Math.random() * TAU;
    const s = 120 + Math.random() * 120; // px/s

    sim.pX[idx] = x;
    sim.pY[idx] = y;
    sim.pVX[idx] = Math.cos(a) * s;
    sim.pVY[idx] = Math.sin(a) * s;
    sim.pAge[idx] = 0;
    sim.pLifeArr[idx] = life * (0.75 + 0.5 * Math.random());
    sim.pR[idx] = 3 + Math.random() * 3;
    sim.pColor[idx] = color;
  }
}

function pruneOldestBond(g, sim) {
  if (sim.bCount <= 0) return false;

  const cap = sim.bCap;
  const idx = sim.bHead;

  const a = sim.bA[idx];
  const b = sim.bB[idx];

  // Clear adjacency.
  const n = sim.nMax;
  sim.adj[adjIndex(n, a, b)] = 0;
  sim.adj[adjIndex(n, b, a)] = 0;

  // Decrement per-ball counts (defensive).
  const balls = g.balls;
  if (balls[a]) balls[a]._crystalBonds = Math.max(0, (balls[a]._crystalBonds || 0) - 1);
  if (balls[b]) balls[b]._crystalBonds = Math.max(0, (balls[b]._crystalBonds || 0) - 1);

  // Pop head.
  sim.bHead = (sim.bHead + 1) % cap;
  sim.bCount--;

  return true;
}

function addBond(g, sim, i, j, restLen, color, reducedMotion) {
  const cap = sim.bCap;
  if (cap <= 0) return false;

  // Enforce hard cap (FIFO pruning).
  while (sim.bCount >= cap) {
    if (!pruneOldestBond(g, sim)) break;
  }

  if (sim.bCount >= cap) return false;

  const idx = (sim.bHead + sim.bCount) % cap;
  sim.bA[idx] = i;
  sim.bB[idx] = j;
  sim.bRest[idx] = restLen;
  sim.bAge[idx] = 0;
  sim.bColor[idx] = color;

  sim.bCount++;

  // Mark adjacency.
  const n = sim.nMax;
  sim.adj[adjIndex(n, i, j)] = 1;
  sim.adj[adjIndex(n, j, i)] = 1;

  // Per-ball counts.
  g.balls[i]._crystalBonds++;
  g.balls[j]._crystalBonds++;

  // Flash + mass reset (noticeable “bond event”).
  const bi = g.balls[i];
  const bj = g.balls[j];
  bi._crystalFlash = 1.0;
  bj._crystalFlash = 1.0;
  bi._crystalMass = 0.20;
  bj._crystalMass = 0.20;

  // Particle burst from midpoint.
  spawnParticleBurst(
    sim,
    (bi.x + bj.x) * 0.5,
    (bi.y + bj.y) * 0.5,
    color,
    sim.pPerBond,
    reducedMotion
  );

  return true;
}

function stepGrowthAndBonding(g, sim, dt) {
  const balls = g.balls;
  const nBalls = balls.length;
  if (nBalls <= 1) return;

  const reducedMotion = sim.reducedMotion;

  const growth = Math.max(0, g.crystalGrowthRate || 0);
  const threshold = clamp(g.crystalBondThreshold ?? 0.55, 0, 1);

  // Limits
  const maxPerBall = Math.max(0, (g.crystalMaxBondsPerBall | 0) || 0);
  const maxTotal = Math.max(0, (g.crystalMaxBondsTotal | 0) || 0);

  // Bonding radius
  const DPR = safeDpr(g);
  const r = Math.max(1, (g.crystalBondRadius || 0) * DPR);
  const r2 = r * r;

  // Growth (automatic; cursor does not influence this).
  for (let i = 0; i < nBalls; i++) {
    const b = balls[i];
    ensureBallCrystalFields(b);

    b._crystalMass = Math.min(1.0, b._crystalMass + growth * dt);
    // Flash decays quickly (visual-only).
    b._crystalFlash = Math.max(0, b._crystalFlash - dt * 3.2);
  }

  // Throttle expensive bond checks (not every physics step).
  sim.bondAcc += dt;
  if (sim.bondAcc < sim.bondEvery) return;
  sim.bondAcc = 0;

  if (maxTotal > 0 && sim.bCount >= Math.min(sim.bCap, maxTotal)) return;

  const color = getAccentColor(g);
  const adj = sim.adj;
  const adjN = sim.nMax;

  for (let i = 0; i < nBalls - 1; i++) {
    const bi = balls[i];
    if (bi._crystalMass < threshold) continue;
    if (maxPerBall > 0 && bi._crystalBonds >= maxPerBall) continue;

    for (let j = i + 1; j < nBalls; j++) {
      const bj = balls[j];
      if (bj._crystalMass < threshold) continue;
      if (maxPerBall > 0 && bj._crystalBonds >= maxPerBall) continue;

      if (adj[adjIndex(adjN, i, j)] === 1) continue; // already bonded

      // Hard total cap (short-circuit).
      if (maxTotal > 0 && sim.bCount >= Math.min(sim.bCap, maxTotal)) return;

      const dx = bj.x - bi.x;
      const dy = bj.y - bi.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > r2) continue;

      const d = Math.sqrt(Math.max(1e-6, d2));
      const restLen = Math.max(6 * DPR, d); // keep stable minimum
      addBond(g, sim, i, j, restLen, color, reducedMotion);
    }
  }
}

function solveBondConstraints(g, sim, dt) {
  const balls = g.balls;
  const nBalls = balls.length;
  if (nBalls <= 1) return;

  const bCount = sim.bCount;
  if (bCount <= 0) return;

  const stiffness = clamp(g.crystalBondStiffness ?? 0.60, 0, 1);
  const damping = clamp(g.crystalBondDamping ?? 0.38, 0, 1);
  const passes = clamp((sim.constraintPasses | 0) || 4, 1, 8);

  // Correction clamp (px) avoids explosive snaps.
  const DPR = safeDpr(g);
  const maxCorr = 6.0 * DPR;

  const cap = sim.bCap;
  let idx = sim.bHead;
  let remaining = bCount;

  for (let pass = 0; pass < passes; pass++) {
    idx = sim.bHead;
    remaining = bCount;

    while (remaining-- > 0) {
      const a = sim.bA[idx];
      const b = sim.bB[idx];
      const rest = sim.bRest[idx];

      const ba = balls[a];
      const bb = balls[b];
      if (!ba || !bb) {
        idx = (idx + 1) % cap;
        continue;
      }

      const dx = bb.x - ba.x;
      const dy = bb.y - ba.y;
      const d2 = dx * dx + dy * dy;
      const d = Math.sqrt(Math.max(1e-6, d2));

      const err = d - rest;
      if (Math.abs(err) > 0.0001) {
        const nx = dx / d;
        const ny = dy / d;

        // Position correction (PBD).
        const corr = clamp(err * 0.5 * stiffness, -maxCorr, maxCorr);
        ba.x += nx * corr;
        ba.y += ny * corr;
        bb.x -= nx * corr;
        bb.y -= ny * corr;

        // Velocity damping along the constraint axis (prevents ringing).
        if (damping > 0) {
          const rvx = bb.vx - ba.vx;
          const rvy = bb.vy - ba.vy;
          const vRel = rvx * nx + rvy * ny;
          const imp = vRel * 0.5 * damping;
          ba.vx += nx * imp;
          ba.vy += ny * imp;
          bb.vx -= nx * imp;
          bb.vy -= ny * imp;
        }
      }

      idx = (idx + 1) % cap;
    }
  }
}

function updateParticles(sim, dt) {
  const cap = sim.pCap;
  const count = sim.pCount;
  if (cap <= 0 || count <= 0) return;

  // Iterate ring buffer order (oldest -> newest) to allow deterministic decay.
  // Stored as a moving head of "most recently written", but for simplicity we
  // just update all slots and rely on age/life to fade out.
  for (let i = 0; i < cap; i++) {
    const life = sim.pLifeArr[i];
    if (life <= 0) continue;
    const age = sim.pAge[i];
    if (age >= life) continue;

    sim.pAge[i] = age + dt;

    sim.pX[i] += sim.pVX[i] * dt;
    sim.pY[i] += sim.pVY[i] * dt;

    // Gentle damping + slight “fall” so bursts feel like glitter.
    sim.pVX[i] *= Math.max(0, 1 - dt * 2.5);
    sim.pVY[i] = sim.pVY[i] * Math.max(0, 1 - dt * 2.5) + 90 * dt;
  }
}

export function initializeCrystal() {
  const g = getGlobals();
  clearBalls();

  const canvas = g.canvas;
  if (!canvas) return;

  const reducedMotion = getReducedMotion();

  // Hard caps (safety). Also clamp to global maxBalls if present.
  const count = clamp((g.crystalBallCount | 0) || 0, 10, 80);
  const maxBalls = (g.maxBalls | 0) || 300;
  const finalCount = Math.min(count, maxBalls);

  // Seed balls
  const w = canvas.width;
  const h = canvas.height;

  for (let i = 0; i < finalCount; i++) {
    const x = (Math.random() * w) | 0;
    const y = (Math.random() * h) | 0;
    const color = (i < 8) ? getColorByIndex(i) : pickRandomColor();
    const b = spawnBall(x, y, color);
    ensureBallCrystalFields(b);

    // Start calm; cursor is the main “speed up” input.
    b.vx = (Math.random() * 2 - 1) * 40;
    b.vy = (Math.random() * 2 - 1) * 40;
    b._crystalMass = Math.random() * 0.15;
    b._crystalBonds = 0;
    b._crystalFlash = 0;
  }

  const nBalls = g.balls.length;
  const bCap = clamp((g.crystalMaxBondsTotal | 0) || 0, 0, 400);
  const pCap = reducedMotion ? 0 : clamp((g.crystalParticleMax | 0) || 0, 0, 200);

  g.crystalSim = {
    // Adjacency & per-ball lookups are sized to a fixed upper bound so we can add seeds later.
    nMax: 80,

    // Bonds (ring buffer)
    bCap,
    bHead: 0,
    bCount: 0,
    bA: new Int16Array(Math.max(1, bCap)),
    bB: new Int16Array(Math.max(1, bCap)),
    bRest: new Float32Array(Math.max(1, bCap)),
    bAge: new Float32Array(Math.max(1, bCap)),
    bColor: new Array(Math.max(1, bCap)),

    // Adjacency matrix (O(1) lookup). Fixed upper bound allows click-to-add.
    adj: new Uint8Array(80 * 80),

    // Bond check throttle (seconds)
    bondAcc: 0,
    bondEvery: 1 / 30,

    // Constraint passes (small for performance; still stable with short dt)
    constraintPasses: 5,

    // Particles (fixed pool)
    pCap,
    pHead: 0,
    pCount: 0,
    pLife: Math.max(0.05, g.crystalParticleLife || 0.42),
    pPerBond: clamp((g.crystalParticlesPerBond | 0) || 0, 0, 12),
    pX: new Float32Array(Math.max(1, pCap)),
    pY: new Float32Array(Math.max(1, pCap)),
    pVX: new Float32Array(Math.max(1, pCap)),
    pVY: new Float32Array(Math.max(1, pCap)),
    pAge: new Float32Array(Math.max(1, pCap)),
    pLifeArr: new Float32Array(Math.max(1, pCap)),
    pR: new Float32Array(Math.max(1, pCap)),
    pColor: new Array(Math.max(1, pCap)),

    reducedMotion
  };

  // Prime colors for particles.
  for (let i = 0; i < g.crystalSim.pCap; i++) {
    g.crystalSim.pColor[i] = getAccentColor(g);
  }
  for (let i = 0; i < g.crystalSim.bCap; i++) {
    g.crystalSim.bColor[i] = getAccentColor(g);
  }

  console.log(`✓ Crystal initialized: ${nBalls} balls, bonds cap=${bCap}, particles cap=${pCap}`);
}

/**
 * Spawn a new seed ball at a given canvas-space position (px, already DPR-scaled).
 * Safe: respects hard ball caps and does not resize bond/adjacency buffers.
 */
export function spawnCrystalSeedAt(x, y) {
  const g = getGlobals();
  const sim = g.crystalSim;
  if (!sim) return;
  if (!g.canvas) return;

  const maxBallsGlobal = (g.maxBalls | 0) || 300;
  const maxBallsLocal = 80;
  if (g.balls.length >= Math.min(maxBallsGlobal, maxBallsLocal)) return;

  const b = spawnBall(x, y, pickRandomColor());
  ensureBallCrystalFields(b);
  b.vx = (Math.random() * 2 - 1) * 120;
  b.vy = (Math.random() * 2 - 1) * 120;
  b._crystalMass = Math.random() * 0.12;
  b._crystalBonds = 0;
  b._crystalFlash = 0.6;
}

/**
 * Cursor effect for Crystal mode: movement ONLY.
 * This does not modify growth rate or bonding thresholds.
 */
export function applyCrystalForces(ball, dt) {
  const g = getGlobals();

  // Cursor must be in the simulation bounds (pointer system controls this).
  if (!g.mouseInCanvas) return;
  if (g.mouseX === -1e9) return;

  const DPR = safeDpr(g);
  const r = Math.max(1, (g.crystalCursorRadius || 0) * DPR);
  const soft = Math.max(1e-3, (g.crystalCursorSoft || 0) * DPR);
  const power = g.crystalCursorPower || 0;

  const dx = ball.x - g.mouseX;
  const dy = ball.y - g.mouseY;
  const d2 = dx * dx + dy * dy;
  const r2 = r * r;
  if (d2 > r2) return;

  const d = Math.sqrt(Math.max(1e-6, d2));
  const q = 1 - (d / r); // 0..1 (closer = stronger)

  // Repel (positive power). Allow negative power for attraction if desired.
  const s = (power * q * q) / (d + soft);
  const nx = dx / d;
  const ny = dy / d;
  ball.vx += nx * s * dt;
  ball.vy += ny * s * dt;
}

/**
 * Called from physics engine each fixed-timestep step while Crystal is active.
 */
export function stepCrystal(dt) {
  const g = getGlobals();
  const sim = g.crystalSim;
  if (!sim) return;

  // Growth + bond creation (throttled).
  stepGrowthAndBonding(g, sim, dt);

  // Constraint solver keeps bonded structures coherent.
  solveBondConstraints(g, sim, dt);

  // Particle system (purely visual).
  if (!sim.reducedMotion) {
    updateParticles(sim, dt);
  }

  // Age bonds.
  const cap = sim.bCap;
  let idx = sim.bHead;
  let remaining = sim.bCount;
  while (remaining-- > 0) {
    sim.bAge[idx] += dt;
    idx = (idx + 1) % cap;
  }
}

export function renderCrystal(ctx) {
  const g = getGlobals();
  const sim = g.crystalSim;
  const balls = g.balls;
  if (!sim) return;

  const accent = getAccentColor(g);
  const reducedMotion = sim.reducedMotion;

  const glowBlur = Math.max(0, g.crystalGlowBlur || 0) * safeDpr(g);
  const bondWBase = Math.max(0.5, g.crystalBondWidth || 1) * safeDpr(g);
  const bondOpacity = clamp(g.crystalBondOpacity ?? 0.85, 0, 1);
  const pulseAmt = reducedMotion ? 0 : clamp(g.crystalPulseAmt ?? 0.18, 0, 0.5);
  const pulseHz = Math.max(0, g.crystalPulseHz || 1.0);

  // ---- Bonds (behind balls) ----
  if (sim.bCount > 0) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = accent;
    ctx.shadowColor = accent;
    ctx.shadowBlur = glowBlur;

    const cap = sim.bCap;
    let idx = sim.bHead;
    let remaining = sim.bCount;
    while (remaining-- > 0) {
      const a = sim.bA[idx];
      const b = sim.bB[idx];
      const ba = balls[a];
      const bb = balls[b];
      if (ba && bb) {
        const age = sim.bAge[idx];
        const fadeIn = clamp(age / 0.5, 0, 1);
        const pulse = 1 + pulseAmt * Math.sin(age * TAU * pulseHz);

        ctx.globalAlpha = bondOpacity * fadeIn;
        ctx.lineWidth = bondWBase * pulse;
        ctx.beginPath();
        ctx.moveTo(ba.x, ba.y);
        ctx.lineTo(bb.x, bb.y);
        ctx.stroke();
      }
      idx = (idx + 1) % cap;
    }

    ctx.restore();
  }

  // ---- Particles ----
  if (!reducedMotion && sim.pCap > 0) {
    ctx.save();
    ctx.shadowColor = accent;
    ctx.shadowBlur = glowBlur * 0.65;

    for (let i = 0; i < sim.pCap; i++) {
      const life = sim.pLifeArr[i];
      if (life <= 0) continue;
      const age = sim.pAge[i];
      if (age <= 0 || age >= life) continue;

      const t = age / life;
      const a = (1 - t) * 0.95;
      ctx.globalAlpha = a;
      ctx.fillStyle = sim.pColor[i] || accent;
      ctx.beginPath();
      ctx.arc(sim.pX[i], sim.pY[i], sim.pR[i], 0, TAU);
      ctx.fill();
    }

    ctx.restore();
  }

  // ---- Balls (custom draw for pulsing + glow) ----
  ctx.save();
  for (let i = 0; i < balls.length; i++) {
    const b = balls[i];
    ensureBallCrystalFields(b);

    const mass = clamp(b._crystalMass, 0, 1);
    const flash = clamp(b._crystalFlash, 0, 1);

    // Noticeable pulse builds with mass, with a tiny per-ball phase offset.
    const ph = (b.t || 0) * TAU * pulseHz + i * 0.73;
    const pulse = 1 + pulseAmt * (0.20 + 0.80 * mass) * Math.sin(ph);

    const r = b.r * pulse;

    ctx.shadowColor = accent;
    ctx.shadowBlur = glowBlur * (0.20 + 0.90 * mass + 0.80 * flash);

    ctx.globalAlpha = 1;
    ctx.fillStyle = b.color;
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

