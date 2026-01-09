// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           3D SPHERE POINT CLOUD                              ║
// ║      Hollow sphere that rotates with cursor; camera-locked like cube         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { spawnBall } from '../physics/spawn.js';
import { clampRadiusToGlobalBounds } from '../utils/ball-sizing.js';

function fibonacciSphere(count) {
  const pts = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < count; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    pts.push({ theta, phi });
  }
  return pts;
}

function rotateXYZ(x, y, z, rx, ry, rz) {
  // Yaw (Y)
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;

  // Pitch (X)
  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;

  // Roll (Z)
  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const x3 = x1 * cosZ - y2 * sinZ;
  const y3 = x1 * sinZ + y2 * cosZ;

  return { x: x3, y: y3, z: z2 };
}

function clamp01(v) {
  return Math.max(-1, Math.min(1, v));
}

export function initialize3DSphere() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  clearBalls();

  const densityBase = Math.max(10, Math.round(g.sphere3dDensity ?? 140));
  const count = getMobileAdjustedCount(densityBase);
  if (count <= 0) return;

  const radiusVw = g.sphere3dRadiusVw ?? 18;
  const radiusPx = Math.max(10, (radiusVw / 100) * canvas.width);
  const dotSizeMul = Math.max(0.1, g.sphere3dDotSizeMul ?? 1.5);
  const baseR = (g.R_MED || 20) * 0.30 * 2.0 * (g.DPR || 1);

  g.sphere3dState = {
    cx: canvas.width * 0.5,
    cy: canvas.height * 0.5,
    radiusPx,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    tumbleX: 0,
    tumbleY: 0,
    dotSizeMul
  };

  const pts = fibonacciSphere(count);
  for (let i = 0; i < pts.length; i++) {
    const ball = spawnBall(0, 0);
    if (!ball) continue;
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    ball.r = clampRadiusToGlobalBounds(g, baseR * dotSizeMul);
    ball._cloudBaseR = baseR;
    ball._sphere3d = { theta: pts[i].theta, phi: pts[i].phi };
    ball._cloudMode = 'sphere';
    ball.isSleeping = false;
  }
}

export function apply3DSphereForces(ball, dt) {
  const g = getGlobals();
  const canvas = g.canvas;
  const state = g.sphere3dState;
  if (!canvas || !state || !ball || !ball._sphere3d) return;

  // Read runtime params for real-time updates
  const idleSpeed = g.sphere3dIdleSpeed ?? 0.15;
  const tumbleSpeed = g.sphere3dTumbleSpeed ?? 2.5;
  const tumbleDamping = Math.max(0, Math.min(0.999, g.sphere3dTumbleDamping ?? 0.94));
  const dotSizeMul = Math.max(0.1, g.sphere3dDotSizeMul ?? 1.5);

  // Update shared rotation once per frame (first ball)
  if (ball === g.balls[0]) {
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;
    
    // Only calculate mouse movement if mouse is in canvas
    if (g.mouseInCanvas) {
      // Track mouse movement for rotation
      const prevMouseX = state.prevMouseX ?? g.mouseX;
      const prevMouseY = state.prevMouseY ?? g.mouseY;
      
      // Calculate movement delta (clamped to prevent extreme spins)
      const rawDx = g.mouseX - prevMouseX;
      const rawDy = g.mouseY - prevMouseY;
      const maxDelta = 100 * (g.DPR || 1); // max pixels per frame
      const mouseDx = Math.max(-maxDelta, Math.min(maxDelta, rawDx));
      const mouseDy = Math.max(-maxDelta, Math.min(maxDelta, rawDy));
      
      state.prevMouseX = g.mouseX;
      state.prevMouseY = g.mouseY;

      // Calculate mouse position relative to sphere center
      const relX = g.mouseX - cx;
      const relY = g.mouseY - cy;
      const distFromCenter = Math.sqrt(relX * relX + relY * relY);
      
      // Check if mouse is over the sphere (within visual radius)
      const visualRadius = state.radiusPx * state.dotSizeMul * 1.5;
      
      if (distFromCenter < visualRadius) {
        // Mouse is over sphere: dragging spins it
        // Horizontal drag → yaw (spin around Y axis)
        // Vertical drag → pitch (spin around X axis)
        const spinGain = tumbleSpeed * 0.02; // sensitivity
        state.tumbleY += mouseDx * spinGain;
        state.tumbleX += -mouseDy * spinGain; // negative because down = pitch forward
      }
    } else {
      // Mouse left viewport: reset tracking to prevent jumps when it returns
      state.prevMouseX = undefined;
      state.prevMouseY = undefined;
    }

    // Damping
    state.tumbleX *= tumbleDamping;
    state.tumbleY *= tumbleDamping;

    // Apply rotation: idle + tumble (no static cursor influence)
    state.rotY += (idleSpeed + state.tumbleY) * dt;
    state.rotX += (idleSpeed * 0.6 + state.tumbleX) * dt;
    state.rotZ += idleSpeed * 0.2 * dt;
  }

  const { theta, phi } = ball._sphere3d;
  const r = state.radiusPx;

  // Local sphere coordinates
  const x = r * Math.sin(phi) * Math.cos(theta);
  const y = r * Math.cos(phi);
  const z = r * Math.sin(phi) * Math.sin(theta);

  const rotated = rotateXYZ(x, y, z, state.rotX, state.rotY, state.rotZ);
  const focal = Math.max(80, g.sphere3dFocalLength ?? 600);
  const zShift = rotated.z + r; // keep positive for projection
  const scale = focal / (focal + zShift);

  const targetX = state.cx + rotated.x * scale;
  const targetY = state.cy + rotated.y * scale;

  const rawR = ball._cloudBaseR * dotSizeMul * scale;

  ball.r = clampRadiusToGlobalBounds(g, rawR);
  ball.x = targetX;
  ball.y = targetY;
  ball.vx = 0;
  ball.vy = 0;
  ball.omega = 0;
  ball.isSleeping = false;
}
