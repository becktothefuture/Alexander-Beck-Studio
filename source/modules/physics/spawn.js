// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                              BALL SPAWNING                                   ║
// ║              Extracted from balls-source.html lines 2249-2284                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { Ball } from './Ball.js';
import { getGlobals } from '../core/state.js';
import { pickRandomColor } from '../visual/colors.js';

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function randBetween(min, max) {
  return min + Math.random() * (max - min);
}

export function spawnBall(x, y, color) {
  if (!color) color = pickRandomColor();
  const globals = getGlobals();
  const baseSize = (globals.R_MIN + globals.R_MAX) / 2;
  
  let r;
  if (globals.sizeVariation === 0) {
    r = baseSize;
  } else {
    const maxVariation = baseSize * 0.1;
    const minR = Math.max(1, baseSize - maxVariation);
    const maxR = baseSize + maxVariation;
    r = randBetween(minR, maxR);
  }
  
  const ball = new Ball(x, y, r, color);
  
  const centerX = globals.canvas.width * 0.5;
  const dir = (x < centerX) ? 1 : -1;
  const sizeInfluence = clamp((r / ((globals.R_MIN + globals.R_MAX) * 0.5)), 0.6, 1.4);
  const baseKick = 140 * sizeInfluence;
  const randKick = 180 * sizeInfluence;
  const upwardKick = 120;
  ball.vx = dir * (baseKick + Math.random() * randKick);
  ball.vy = -Math.random() * upwardKick;
  ball.driftAx = dir * (360 + Math.random() * 420) * sizeInfluence;
  ball.driftTime = 0.22 + Math.random() * 0.28;
  
  globals.balls.push(ball);
  return ball;
}

