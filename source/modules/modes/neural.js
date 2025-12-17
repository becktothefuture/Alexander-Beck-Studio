// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              NEURAL MODE                                     ║
// ║                   Emergent connectivity (“synapses”)                          ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls } from '../core/state.js';
import { getColorByIndex, pickRandomColor } from '../visual/colors.js';
import { randomRadiusForMode } from '../utils/ball-sizing.js';
import { MODES } from '../core/constants.js';

// Circle-only “connectivity” mode:
// - No line rendering.
// - Connection is expressed via gentle clustering (motion cohesion) + optional halo pulse.

let _neuralCohesionT = 0;

export function initializeNeural() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;
  clearBalls();

  const targetBalls = Math.max(8, Math.min(g.neuralBallCount ?? 80, 260));
  const w = canvas.width;
  const h = canvas.height;
  const margin = 40 * (g.DPR || 1);

  // Ensure at least one ball of each color (0-7)
  const first = Math.min(8, targetBalls);
  for (let colorIndex = 0; colorIndex < first; colorIndex++) {
    const x = margin + Math.random() * (w - 2 * margin);
    const y = margin + Math.random() * (h - 2 * margin);
    const ball = spawnBall(x, y, getColorByIndex(colorIndex));

    // Size system: make Neural respect per-mode sizing variation.
    const rr = randomRadiusForMode(g, MODES.NEURAL);
    ball.r = rr;
    ball.rBase = rr;
    ball.m = Math.max(1, rr * rr * 0.12);

    ball.vx = 0;
    ball.vy = 0;
    ball.driftAx = 0;
    ball.driftTime = 0;
    // Per-ball deterministic phase for “wander” (no per-step Math.random)
    ball._neuralPhase = Math.random() * Math.PI * 2;
  }

  for (let i = first; i < targetBalls; i++) {
    const x = margin + Math.random() * (w - 2 * margin);
    const y = margin + Math.random() * (h - 2 * margin);
    const ball = spawnBall(x, y, pickRandomColor());

    const rr = randomRadiusForMode(g, MODES.NEURAL);
    ball.r = rr;
    ball.rBase = rr;
    ball.m = Math.max(1, rr * rr * 0.12);

    ball.vx = 0;
    ball.vy = 0;
    ball.driftAx = 0;
    ball.driftTime = 0;
    ball._neuralPhase = Math.random() * Math.PI * 2;
  }
}

export function applyNeuralForces(ball, dt) {
  const g = getGlobals();
  const massScale = Math.max(0.25, ball.m / g.MASS_BASELINE_KG);

  const strength = Math.max(0, g.neuralWanderStrength ?? 420);
  const phase = (ball._neuralPhase ?? 0) + dt * 1.35;
  ball._neuralPhase = phase;

  // Smooth “wander” — two orthogonal sinusoids with different rates.
  const ax = Math.sin(phase * 1.7 + 0.3) * strength;
  const ay = Math.cos(phase * 1.1 + 1.2) * strength;
  ball.vx += (ax * dt) / massScale;
  ball.vy += (ay * dt) / massScale;

  // Connectivity (circle-only): gentle “cohesion” towards a moving centroid.
  // This creates transient clustering without drawing any links.
  _neuralCohesionT += dt;
  const balls = g.balls;
  const n = balls.length;
  if (n > 1) {
    // Recompute centroid at a low frequency to avoid extra work.
    // (Still O(n), but only a few times per second.)
    const shouldRecompute = (_neuralCohesionT > 0.18);
    if (shouldRecompute) _neuralCohesionT = 0;

    if (shouldRecompute || g._neuralCx === undefined) {
      let sx = 0, sy = 0;
      for (let i = 0; i < n; i++) {
        sx += balls[i].x;
        sy += balls[i].y;
      }
      g._neuralCx = sx / n;
      g._neuralCy = sy / n;
    }

    const cx = g._neuralCx;
    const cy = g._neuralCy;
    const cohesion = Math.max(0, Math.min(1, g.neuralCohesion ?? 0.18));
    const dx = cx - ball.x;
    const dy = cy - ball.y;
    ball.vx += (dx * cohesion * dt) / massScale;
    ball.vy += (dy * cohesion * dt) / massScale;
  }

  // Soft damping (mode-local) — stable across dt
  const damp60 = Math.max(0.0, Math.min(1.0, g.neuralDamping ?? 0.985));
  const damp = Math.pow(damp60, dt * 60);
  ball.vx *= damp;
  ball.vy *= damp;
}

export function preRenderNeural(_ctx) {
  // Intentionally empty: NO LINES. (Hook retained for compatibility.)
}

