// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    ORBIT 3D 2: EXPANSIVE GENTLE SPIRAL                      ║
// ║         Same physics as Orbit 1, configured for expansive motion            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { spawnBall } from '../physics/spawn.js';
import { pickRandomColor } from '../visual/colors.js';
import { clampRadiusToGlobalBounds } from '../utils/ball-sizing.js';

export function initializeOrbit3D2() {
  const globals = getGlobals();
  clearBalls();

  const baseCount = Math.max(0, (globals.orbit3d2MoonCount ?? 100) | 0);
  const count = getMobileAdjustedCount(baseCount);
  if (count <= 0) return;
  const w = globals.canvas.width;
  const h = globals.canvas.height;

  // EXPANSIVE: Spawn far from center
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.min(w, h) * 0.35 + Math.random() * Math.min(w, h) * 0.15; // Expansive spawn
    const x = w * 0.5 + Math.cos(angle) * radius;
    const y = h * 0.5 + Math.sin(angle) * radius;

    const ball = spawnBall(x, y, pickRandomColor());
    if (!ball) continue;

    // SLOWER: Initial tangential velocity (DPR-scaled)
    const DPR = globals.DPR || 1;
    const speed = (globals.orbit3d2VelocityMult ?? 1.1) * 150 * DPR;
    ball.vx = -Math.sin(angle) * speed;
    ball.vy = Math.cos(angle) * speed;
    ball.orbitDepth = Math.random();
  }
}

export function applyOrbit3D2Forces(ball, dt) {
  const g = getGlobals();

  // Mouse is attractor
  const cx = (g.mouseX === -1e9) ? g.canvas.width * 0.5 : g.mouseX;
  const cy = (g.mouseY === -1e9) ? g.canvas.height * 0.5 : g.mouseY;

  const dx = cx - ball.x;
  const dy = cy - ball.y;
  const dist = Math.sqrt(dx * dx + dy * dy + 1);

  const radialX = dx / dist;
  const radialY = dy / dist;
  const tangentX = -dy / dist;
  const tangentY = dx / dist;

  // GUARDRAIL 1: Minimum distance repulsion
  // DPR-scaled: physics runs in canvas pixels
  const DPR = g.DPR || 1;
  const minRadius = 80 * DPR; // EXPANSIVE: Larger min radius
  if (dist < minRadius) {
    const repulsionStrength = (minRadius - dist) * 100;
    ball.vx -= radialX * repulsionStrength * dt;
    ball.vy -= radialY * repulsionStrength * dt;
  }

  // Gentle spiral forces
  const gravity = g.orbit3d2Gravity ?? 80000;
  
  // Strong tangential for spinning
  const tangentForce = gravity * 0.015;
  ball.vx += tangentX * tangentForce * dt;
  ball.vy += tangentY * tangentForce * dt;

  // Weak inward pull for slow spiral (softened)
  const softening = 100 * DPR;
  const radialForce = (gravity * 0.003) / (1 + dist / softening);
  ball.vx += radialX * radialForce * dt;
  ball.vy += radialY * radialForce * dt;

  // GUARDRAIL 2: Separation force
  const separationRadius = 100 * g.DPR; // EXPANSIVE: Larger separation
  let sepX = 0, sepY = 0, neighborCount = 0;
  for (let i = 0; i < g.balls.length; i++) {
    const other = g.balls[i];
    if (other === ball) continue;
    const dx2 = ball.x - other.x;
    const dy2 = ball.y - other.y;
    const d2 = dx2 * dx2 + dy2 * dy2;
    if (d2 < separationRadius * separationRadius && d2 > 0) {
      const d_other = Math.sqrt(d2);
      const strength = 1 - (d_other / separationRadius);
      sepX += (dx2 / d_other) * strength;
      sepY += (dy2 / d_other) * strength;
      neighborCount++;
    }
  }
  if (neighborCount > 0) {
    const separationForce = 8000;
    ball.vx += (sepX / neighborCount) * separationForce * dt;
    ball.vy += (sepY / neighborCount) * separationForce * dt;
  }

  // GUARDRAIL 3: Speed limiting (DPR-scaled)
  const maxSpeed = 300 * DPR; // EXPANSIVE: Fixed max speed
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed > maxSpeed) {
    ball.vx = (ball.vx / speed) * maxSpeed;
    ball.vy = (ball.vy / speed) * maxSpeed;
  }

  // Light damping
  const damp = 1 - (g.orbit3d2Damping ?? 0.02);
  ball.vx *= damp;
  ball.vy *= damp;

  // Depth effect for size
  const angle = Math.atan2(dy, dx);
  const depthScale = g.orbit3d2DepthScale ?? 0.6;
  ball.z = ball.orbitDepth + Math.sin(angle * 2) * 0.2;
  ball.z = Math.max(0, Math.min(1, ball.z));
  const rawR = Math.max(2, ball.rBase * (0.5 + ball.z * depthScale));
  ball.r = clampRadiusToGlobalBounds(g, rawR);
}
