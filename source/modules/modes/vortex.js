// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             VORTEX SHEETS MODE                               ║
// ║      Invisible swirl field anchored to cursor; spirals + radial pull         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls } from '../core/state.js';
import { Ball } from '../physics/Ball.js';
import { pickRandomColor, getColorByIndex } from '../visual/colors.js';
import { MODES } from '../core/constants.js';

const FAR_FALLOFF = 0.0015;    // reduces effect with distance

export function initializeVortex() {
  const g = getGlobals();
  clearBalls();
  const canvas = g.canvas;
  if (!canvas) return;

  const w = canvas.width;
  const h = canvas.height;
  const count = Math.min(g.vortexBallCount || 180, g.maxBalls || 300);

  // Ensure at least one of each color
  for (let colorIndex = 0; colorIndex < 8 && colorIndex < count; colorIndex++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
    const c = getColorByIndex(colorIndex);
    const b = new Ball(x, y, r, c);
    b.vx = (Math.random() - 0.5) * 80;
    b.vy = (Math.random() - 0.5) * 80;
    g.balls.push(b);
  }

  for (let i = 8; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = g.R_MIN + Math.random() * (g.R_MAX - g.R_MIN);
    const c = pickRandomColor();
    const b = new Ball(x, y, r, c);
    b.vx = (Math.random() - 0.5) * 80;
    b.vy = (Math.random() - 0.5) * 80;
    g.balls.push(b);
  }
}

export function applyVortexForces(ball, dt) {
  const g = getGlobals();
  if (g.currentMode !== MODES.VORTEX) return;

  const mx = g.mouseX;
  const my = g.mouseY;
  if (!g.mouseInCanvas) return;

  const swirlStrength = g.vortexSwirlStrength || 420;
  const radialPull = g.vortexRadialPull || 180;

  const dx = ball.x - mx;
  const dy = ball.y - my;
  const dist2 = dx * dx + dy * dy;
  const dist = Math.max(8, Math.sqrt(dist2));
  const inv = 1 / (1 + dist * FAR_FALLOFF);

  // Tangential swirl (perp to radial)
  const nx = dx / dist;
  const ny = dy / dist;
  const tx = -ny;
  const ty = nx;
  const swirl = swirlStrength * inv;
  ball.vx += tx * swirl * dt;
  ball.vy += ty * swirl * dt;

  // Mild inward pull
  const pull = radialPull * inv;
  ball.vx -= nx * pull * dt;
  ball.vy -= ny * pull * dt;
  
  // Gentle drag to prevent runaway speeds
  ball.vx *= 0.995;
  ball.vy *= 0.995;
}
