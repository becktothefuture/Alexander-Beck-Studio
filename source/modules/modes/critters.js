// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                               CRITTERS MODE                                   ║
// ║           Ball-only “little creatures” (step locomotion + steering)           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls } from '../core/state.js';
import { getColorByIndex, pickRandomColor } from '../visual/colors.js';

function clamp(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

function wrapAngle(a) {
  // Wrap to [-PI, PI]
  if (a > Math.PI) a -= Math.PI * 2;
  else if (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function smoothstep01(t) {
  t = clamp(t, 0, 1);
  return t * t * (3 - 2 * t);
}

function stepPulse01(phase01, sharpness) {
  // Triangle wave -> smoothstep -> power for “staccato steps”
  const tri = phase01 < 0.5 ? (phase01 * 2) : (2 - phase01 * 2); // 0..1..0
  const s = smoothstep01(tri);
  const p = clamp(sharpness, 0.5, 6.0);
  return Math.pow(s, p);
}

export function initializeCritters() {
  const globals = getGlobals();
  clearBalls();

  const w = globals.canvas.width;
  const h = globals.canvas.height;
  const DPR = globals.DPR || 1;

  const count = Math.max(10, Math.min(260, globals.critterCount | 0));

  // Keep critters visually "creature-sized"
  const rMin = Math.max(4 * DPR, globals.R_MIN * 0.70);
  const rMax = Math.max(rMin + 1, Math.min(globals.R_MAX * 0.90, 16 * DPR));

  // First, ensure at least one critter of each color (0-7) for palette representation
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = (Math.random() * w) | 0;
    const y = (Math.random() * h) | 0;
    const color = getColorByIndex(colorIndex);
    const ball = spawnBall(x, y, color);

    // Override radius tighter for "critters" feel
    const rr = rMin + Math.random() * (rMax - rMin);
    ball.r = rr;
    ball.m = Math.max(1, rr * rr * 0.12);

    ball.vx = 0;
    ball.vy = 0;

    // Per-ball "critter brain" (stored on the ball object; no per-frame allocs)
    ball._critterHeading = Math.random() * Math.PI * 2;
    ball._critterTurn = 0;
    ball._critterPhase = Math.random();
    ball._critterLastPhase = ball._critterPhase;
    ball._critterWander = (Math.random() * 2 - 1); // stable personality
    ball._critterPause = 0;
  }

  // Then fill the rest with weighted random colors
  for (let i = 8; i < count; i++) {
    const x = (Math.random() * w) | 0;
    const y = (Math.random() * h) | 0;

    // Use weighted color distribution (matches Ball Pit ratio)
    const color = pickRandomColor();
    const ball = spawnBall(x, y, color);

    // Override radius tighter for “critters” feel
    const rr = rMin + Math.random() * (rMax - rMin);
    ball.r = rr;
    ball.m = Math.max(1, rr * rr * 0.12);

    ball.vx = 0;
    ball.vy = 0;

    // Per-ball “critter brain” (stored on the ball object; no per-frame allocs)
    ball._critterHeading = Math.random() * Math.PI * 2;
    ball._critterTurn = 0;
    ball._critterPhase = Math.random();
    ball._critterLastPhase = ball._critterPhase;
    ball._critterWander = (Math.random() * 2 - 1); // stable personality
    ball._critterPause = 0;
  }
}

export function applyCrittersForces(ball, dt) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // ---- Parameters (config-driven) ----
  const speed = Math.max(0, g.critterSpeed || 0);
  const vMax = Math.max(50, g.critterMaxSpeed || 0);
  const stepHz = Math.max(0, g.critterStepHz || 0);
  const sharp = g.critterStepSharpness ?? 2.4;
  const turnNoise = Math.max(0, g.critterTurnNoise || 0);
  const turnDamp = Math.max(0.1, g.critterTurnDamp || 0);
  const turnSeek = Math.max(0, g.critterTurnSeek || 0);
  const avoidR = Math.max(0, (g.critterAvoidRadius || 0) * (g.DPR || 1));
  const avoidF = Math.max(0, g.critterAvoidForce || 0);
  const edgeAvoid = Math.max(0, g.critterEdgeAvoid || 0);
  const mousePull = Math.max(0, g.critterMousePull || 0);
  const mouseRadiusVw = Math.max(0, g.critterMouseRadiusVw || 0);

  // ---- Internal state ----
  let heading = ball._critterHeading || 0;
  let turn = ball._critterTurn || 0;
  let phase = ball._critterPhase || 0;
  let lastPhase = ball._critterLastPhase ?? phase;
  let pause = ball._critterPause || 0;
  const personality = ball._critterWander || 0;

  // ---- Micro-pause gating (little “think” moments) ----
  if (pause > 0) {
    pause = Math.max(0, pause - dt);
  } else {
    // Low probability pause; scaled by dt so it’s frame-rate independent
    if (Math.random() < 0.25 * dt) {
      pause = 0.03 + Math.random() * 0.09;
    }
  }

  // ---- Desired heading (wander + edge + mouse + local avoid) ----
  let steerX = 0;
  let steerY = 0;

  // Edge avoidance (soft inward pull in an “edge zone”)
  if (edgeAvoid > 0) {
    const w = canvas.width;
    const h = canvas.height;
    const zone = Math.max(24 * (g.DPR || 1), Math.min(w, h) * 0.08);
    const x = ball.x;
    const y = ball.y;

    if (x < zone) steerX += (1 - x / zone);
    else if (x > w - zone) steerX -= (1 - (w - x) / zone);

    if (y < zone) steerY += (1 - y / zone);
    else if (y > h - zone) steerY -= (1 - (h - y) / zone);

    const s = edgeAvoid * 1.35;
    steerX *= s;
    steerY *= s;
  }

  // Mouse fear zone (in vw): flee when close, graze when far
  // Also adds a panic boost (speed + turn noise) for “frantic” motion near cursor.
  let panic01 = 0;
  if (mousePull > 0 && g.mouseX !== -1e9) {
    const vw = (window.innerWidth || canvas.width) / 100;
    const r = Math.max(1, mouseRadiusVw * vw) * (g.DPR || 1);
    const dx = ball.x - g.mouseX;
    const dy = ball.y - g.mouseY;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) {
      const d = Math.sqrt(d2) + 1e-6;
      const q = 1 - (d / r);
      panic01 = q;
      const fear = mousePull * (0.85 + 0.65 * q);
      steerX += (dx / d) * fear;
      steerY += (dy / d) * fear;

      // subtle orbit so they don’t deadlock into straight lines
      const orbit = 0.25 * q * fear;
      steerX += (-dy / d) * orbit;
      steerY += (dx / d) * orbit;

      // Panic: suppress pauses so they keep moving when threatened
      pause = 0;
    }
  }

  // Local avoidance (cheap n^2; critter counts are intentionally modest)
  if (avoidR > 0 && avoidF > 0) {
    const balls = g.balls;
    const rr2 = avoidR * avoidR;
    let ax = 0;
    let ay = 0;
    let n = 0;
    for (let i = 0; i < balls.length; i++) {
      const o = balls[i];
      if (o === ball) continue;
      const dx = ball.x - o.x;
      const dy = ball.y - o.y;
      const d2 = dx * dx + dy * dy;
      if (d2 > 0 && d2 < rr2) {
        const d = Math.sqrt(d2);
        // Make separation mostly *near-field* so critters can travel in tighter packs.
        const q = 1 - (d / avoidR);
        const q2 = q * q;
        const inv = 1 / (d + 1e-6);
        ax += dx * inv * q2;
        ay += dy * inv * q2;
        n++;
      }
    }
    if (n > 0) {
      const invN = 1 / n;
      steerX += (ax * invN) * 1.15;
      steerY += (ay * invN) * 1.15;

      // Apply a direct velocity push too (feels like a “flinch”)
      ball.vx += (ax * invN) * (avoidF * 0.65) * dt;
      ball.vy += (ay * invN) * (avoidF * 0.65) * dt;
    }
  }

  // Wander: correlated random walk (turn inertia, “personality” bias)
  // Panic adds extra jitter so motion reads “skittery”
  const panicNoiseBoost = 1 + (panic01 * 1.35 * mousePull);
  const noise = (Math.random() * 2 - 1) * (turnNoise * panicNoiseBoost);
  turn += (noise + personality * 0.35 * turnNoise) * dt;

  // Convert steer vector to desired heading (if any)
  const steerLen2 = steerX * steerX + steerY * steerY;
  if (steerLen2 > 1e-6) {
    const desired = Math.atan2(steerY, steerX);
    const delta = wrapAngle(desired - heading);
    turn += delta * (turnSeek * dt);
  }

  // Turn damping + integrate heading
  turn *= Math.exp(-turnDamp * dt);
  heading = wrapAngle(heading + turn * dt);

  // Stride phase update
  if (stepHz > 0) {
    lastPhase = phase;
    phase += stepHz * dt;
    phase -= (phase | 0);
  }

  // “Disney locomotion”: anticipate (squash), then hop (impulse), then stretch.
  // This reads as little jumps from place to place rather than constant glide.
  const pulse = (pause > 0) ? 0 : stepPulse01(phase, sharp);
  const panicSpeedBoost = 1 + (panic01 * 0.95 * mousePull);

  // Anticipation: just before step reset, compress along travel direction.
  if (pause <= 0 && phase > 0.82) {
    const anticip = (phase - 0.82) / 0.18; // 0..1
    const amt = 0.10 * anticip * (0.65 + 0.35 * panicSpeedBoost);
    if (amt > ball.squashAmount) {
      ball.squashAmount = amt;
      ball.squashNormalAngle = -Math.PI / 2; // compress along heading
    }
  }

  // Hop impulse once per stride (on wrap). Panic increases hop amplitude + randomness.
  const wrapped = (stepHz > 0) && (phase < lastPhase);
  if (pause <= 0 && wrapped) {
    const massScale = Math.max(0.25, ball.m / (g.MASS_BASELINE_KG || 129));
    const hopBase = speed * (0.55 + 0.55 * pulse) * panicSpeedBoost;
    const hop = hopBase * (0.85 + 0.30 * Math.random());
    const cx = Math.cos(heading);
    const cy = Math.sin(heading);
    const px = -cy;
    const py = cx;
    const lateral = (Math.random() * 2 - 1) * 0.18 * (0.35 + 0.65 * panic01) * hop;
    ball.vx += ((cx * hop) + (px * lateral)) / massScale;
    ball.vy += ((cy * hop) + (py * lateral)) / massScale;

    // Stretch on launch (along heading)
    ball.squashAmount = Math.max(ball.squashAmount, 0.20 + 0.15 * panic01);
    ball.squashNormalAngle = Math.PI / 2; // stretch along heading
  }

  // Low “grazing” thrust between hops (keeps them alive when stepHz is low)
  const thrust = speed * (0.08 + 0.25 * pulse) * panicSpeedBoost;
  ball.vx += Math.cos(heading) * thrust * dt;
  ball.vy += Math.sin(heading) * thrust * dt;

  // Clamp max speed (prevents “floaty” accelerations)
  const vx = ball.vx;
  const vy = ball.vy;
  const v2 = vx * vx + vy * vy;
  const max2 = vMax * vMax;
  if (v2 > max2) {
    const s = vMax / (Math.sqrt(v2) + 1e-6);
    ball.vx = vx * s;
    ball.vy = vy * s;
  }

  // Store back
  ball._critterHeading = heading;
  ball._critterTurn = turn;
  ball._critterPhase = phase;
  ball._critterLastPhase = lastPhase;
  ball._critterPause = pause;

  // Use heading as rotation for nicer squash/stretch orientation
  ball.theta = heading;
}


