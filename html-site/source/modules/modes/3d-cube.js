// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             3D CUBE POINT CLOUD                              ║
// ║     Rotating cube (edges/faces) projected in 3D with cursor-driven tumble     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { spawnBall } from '../physics/spawn.js';
import { clampRadiusToGlobalBounds } from '../utils/ball-sizing.js';

function clamp01(v) {
  return Math.max(-1, Math.min(1, v));
}

function rotateXYZ(x, y, z, rx, ry, rz) {
  const cosY = Math.cos(ry);
  const sinY = Math.sin(ry);
  const x1 = x * cosY - z * sinY;
  const z1 = x * sinY + z * cosY;

  const cosX = Math.cos(rx);
  const sinX = Math.sin(rx);
  const y2 = y * cosX - z1 * sinX;
  const z2 = y * sinX + z1 * cosX;

  const cosZ = Math.cos(rz);
  const sinZ = Math.sin(rz);
  const x3 = x1 * cosZ - y2 * sinZ;
  const y3 = x1 * sinZ + y2 * cosZ;

  return { x: x3, y: y3, z: z2 };
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function generateCubePoints(size, edgeDensity, faceGrid) {
  const pts = [];
  const half = size * 0.5;
  const density = Math.max(2, edgeDensity | 0);
  const faceSteps = Math.max(0, faceGrid | 0);

  // Vertices
  const verts = [
    [-half, -half, -half], [half, -half, -half],
    [-half, half, -half],  [half, half, -half],
    [-half, -half, half],  [half, -half, half],
    [-half, half, half],   [half, half, half]
  ];

  // Edges (pairs of vertex indices)
  const edges = [
    [0, 1], [2, 3], [4, 5], [6, 7], // X edges
    [0, 2], [1, 3], [4, 6], [5, 7], // Y edges
    [0, 4], [1, 5], [2, 6], [3, 7]  // Z edges
  ];

  for (const [a, b] of edges) {
    for (let i = 0; i <= density; i++) {
      const t = i / density;
      pts.push({
        x: lerp(verts[a][0], verts[b][0], t),
        y: lerp(verts[a][1], verts[b][1], t),
        z: lerp(verts[a][2], verts[b][2], t)
      });
    }
  }

  // Faces (optional grid)
  if (faceSteps > 0) {
    const steps = faceSteps + 1;
    const step = size / steps;
    const coords = [];
    for (let i = 0; i <= steps; i++) coords.push(-half + i * step);

    const faces = [
      { axis: 'z', value: -half }, { axis: 'z', value: half },
      { axis: 'x', value: -half }, { axis: 'x', value: half },
      { axis: 'y', value: -half }, { axis: 'y', value: half }
    ];

    for (const face of faces) {
      for (let i = 0; i < coords.length; i++) {
        for (let j = 0; j < coords.length; j++) {
          let x = 0, y = 0, z = 0;
          if (face.axis === 'z') {
            x = coords[i]; y = coords[j]; z = face.value;
          } else if (face.axis === 'x') {
            x = face.value; y = coords[i]; z = coords[j];
          } else {
            x = coords[i]; y = face.value; z = coords[j];
          }
          pts.push({ x, y, z });
        }
      }
    }
  }

  return pts;
}

export function initialize3DCube() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  clearBalls();

  // Apply mobile reduction to density BEFORE generating points to preserve cube structure.
  // Slicing afterwards would cut off entire edges, destroying the cube shape.
  const baseEdgeDensity = Math.max(2, Math.round(g.cube3dEdgeDensity ?? 8));
  const edgeDensity = getMobileAdjustedCount(baseEdgeDensity);
  const baseFaceGrid = Math.max(0, Math.round(g.cube3dFaceGrid ?? 0));
  const faceGrid = baseFaceGrid > 0 ? getMobileAdjustedCount(baseFaceGrid) : 0;
  const sizeVw = g.cube3dSizeVw ?? 25;
  const sizePx = Math.max(10, (sizeVw / 100) * canvas.width);
  const baseR = (g.R_MED || 20) * 0.30 * 2.0 * (g.DPR || 1);
  const dotSizeMul = Math.max(0.1, g.cube3dDotSizeMul ?? 1.5);

  const pts = generateCubePoints(sizePx, edgeDensity, faceGrid);

  g.cube3dState = {
    cx: canvas.width * 0.5,
    cy: canvas.height * 0.5,
    sizePx,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    idleSpeed: g.cube3dIdleSpeed ?? 0.2,
    cursorInfluence: g.cube3dCursorInfluence ?? 1.5,
    tumbleX: 0,
    tumbleY: 0,
    tumbleDamping: Math.max(0, Math.min(0.999, g.cube3dTumbleDamping ?? 0.95)),
    tumbleSpeed: g.cube3dTumbleSpeed ?? 3,
    dotSizeMul
  };

  for (let i = 0; i < pts.length; i++) {
    const ball = spawnBall(0, 0);
    if (!ball) continue;
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    ball.r = clampRadiusToGlobalBounds(g, baseR * dotSizeMul);
    ball._cloudBaseR = baseR;
    ball._cube3d = { x: pts[i].x, y: pts[i].y, z: pts[i].z };
    ball._cloudMode = 'cube';
    ball.isSleeping = false;
  }
}

export function apply3DCubeForces(ball, dt) {
  const g = getGlobals();
  const canvas = g.canvas;
  const state = g.cube3dState;
  if (!canvas || !state || !ball || !ball._cube3d) return;

  // Read runtime params each frame for real-time updates
  const idleSpeed = g.cube3dIdleSpeed ?? 0.2;
  const cursorInfluence = g.cube3dCursorInfluence ?? 1.5;
  const tumbleSpeed = g.cube3dTumbleSpeed ?? 3;
  const tumbleDamping = Math.max(0, Math.min(0.999, g.cube3dTumbleDamping ?? 0.95));
  const dotSizeMul = Math.max(0.1, g.cube3dDotSizeMul ?? 1.5);

  // Update shared rotation once per frame
  if (ball === g.balls[0]) {
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;
    const nx = g.mouseInCanvas ? clamp01((g.mouseX - cx) / (canvas.width * 0.5)) : 0;
    const ny = g.mouseInCanvas ? clamp01((g.mouseY - cy) / (canvas.height * 0.5)) : 0;

    const dx = nx - (state.prevNx ?? 0);
    const dy = ny - (state.prevNy ?? 0);
    state.prevNx = nx;
    state.prevNy = ny;

    // Tumble impulse from mouse movement (drag-like)
    state.tumbleX += -dy * tumbleSpeed;
    state.tumbleY += dx * tumbleSpeed;

    // Damping
    state.tumbleX *= tumbleDamping;
    state.tumbleY *= tumbleDamping;

    // Apply rotation: idle + cursor + tumble
    state.rotY += (idleSpeed + nx * cursorInfluence + state.tumbleY) * dt;
    state.rotX += (idleSpeed * 0.6 + ny * cursorInfluence + state.tumbleX) * dt;
    state.rotZ += idleSpeed * 0.2 * dt;
  }

  const { x, y, z } = ball._cube3d;
  const rotated = rotateXYZ(x, y, z, state.rotX, state.rotY, state.rotZ);
  const focal = Math.max(80, g.cube3dFocalLength ?? 500);
  
  // Calculate distance from viewer for correct perspective
  // rotated.z ranges from -sizePx/2 (back) to +sizePx/2 (front)
  // zDist: back gives sizePx (far), front gives 0 (close)
  const halfSize = state.sizePx * 0.5;
  const zDist = halfSize - rotated.z;
  const scale = focal / (focal + zDist);
  // Now: back points get smaller scale (more distant), front points get larger scale (closer)

  const targetX = state.cx + rotated.x * scale;
  const targetY = state.cy + rotated.y * scale;
  const rawR = ball._cloudBaseR * dotSizeMul * scale;

  // Depth factor for logo layering and engine fog
  // Map z from [-sizePx/2, +sizePx/2] to [0, 1] where 0 is back, 1 is front
  const depthFactor = (rotated.z + halfSize) / state.sizePx;
  
  // Cube's own additional fog (fades back points more)
  // This stacks with the engine's depth fog for a stronger atmospheric effect
  const fadeStart = Math.max(0, Math.min(1, g.cube3dFogStart ?? 0.5));
  const fadeMin = Math.max(0, Math.min(1, g.cube3dFogMin ?? 0.1));
  
  // Smooth fade using quadratic easing for gradual transition
  // Fade increases as depthFactor DECREASES (back points fade more)
  let fadeRamp = 0;
  if (depthFactor < fadeStart) {
    const t = (fadeStart - depthFactor) / fadeStart;
    fadeRamp = t * t; // Quadratic ease-in for smooth acceleration
  }
  ball.alpha = 1.0 - fadeRamp * (1.0 - fadeMin);

  // Scale size based on z-depth for perspective illusion
  // Back balls (z=0) are smaller, front balls (z=1) are larger
  // This enhances the 3D effect significantly
  const perspectiveSize = 0.6 + ball.z * 0.8; // 0.6x to 1.4x scale
  
  ball.r = clampRadiusToGlobalBounds(g, rawR * perspectiveSize);
  ball.x = targetX;
  ball.y = targetY;
  ball.vx = 0;
  ball.vy = 0;
  ball.omega = 0;
  ball.isSleeping = false;
  
  // Use depthFactor directly as z for logo layering (already normalized 0-1)
  // Back points: depthFactor=0 (behind logo, dark, small)
  // Front points: depthFactor=1 (in front of logo, bright, large)
  ball.z = depthFactor;
}
