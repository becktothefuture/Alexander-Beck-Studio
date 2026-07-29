// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             3D CUBE POINT CLOUD                              ║
// ║     Rotating cube (edges/faces) projected in 3D with cursor-driven tumble     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { spawnBall } from '../physics/spawn.js';
import { clampRadiusToGlobalBounds } from '../utils/ball-sizing.js';
import { getHeroTitleCanvasCenter } from '../rendering/title-depth.js';
import { resolveDistanceFogOpacity } from '../visual/depth-fog.js';
import { triggerDetent } from '../audio/simulation-audio-adapter.js';
import {
  CUBE_3D_DEFAULTS,
  resolveCube3DMotionScale,
  resolveCube3DSizePx,
} from './cube3d-config.js';
import { generateCubePoints } from './cube3d-geometry.js';

let reducedMotionQuery = null;

function prefersReducedMotion() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
  reducedMotionQuery ||= window.matchMedia('(prefers-reduced-motion: reduce)');
  return reducedMotionQuery.matches;
}

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

function clampCanvasAlpha(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return 1;
  return Math.max(0, Math.min(1, next));
}

export function initialize3DCube() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  clearBalls();

  // Apply mobile reduction to density BEFORE generating points to preserve cube structure.
  // Slicing afterwards would cut off entire edges, destroying the cube shape.
  const baseEdgeDensity = Math.max(2, Math.round(
    g.cube3dEdgeDensity ?? CUBE_3D_DEFAULTS.cube3dEdgeDensity,
  ));
  const edgeDensity = getMobileAdjustedCount(baseEdgeDensity);
  const baseFaceGrid = Math.max(0, Math.round(
    g.cube3dFaceGrid ?? CUBE_3D_DEFAULTS.cube3dFaceGrid,
  ));
  const faceGrid = baseFaceGrid > 0 ? getMobileAdjustedCount(baseFaceGrid) : 0;
  const sizeVw = g.cube3dSizeVw ?? CUBE_3D_DEFAULTS.cube3dSizeVw;
  const sizePx = resolveCube3DSizePx(canvas.width, sizeVw);
  const baseR = (g.R_MED || 20) * 0.30 * 2.0 * (g.DPR || 1);
  const dotSizeMul = Math.max(
    0.1,
    g.cube3dDotSizeMul ?? CUBE_3D_DEFAULTS.cube3dDotSizeMul,
  );

  const pts = generateCubePoints(edgeDensity, faceGrid);

  const titleCenter = getHeroTitleCanvasCenter(g);
  g.cube3dState = {
    cx: titleCenter.x,
    cy: titleCenter.y,
    sizePx,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    tumbleX: 0,
    tumbleY: 0,
    pointerWasInCanvas: false,
    lastPointerSequence: null,
    audioAngle: 0
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
  const idleSpeed = g.cube3dIdleSpeed ?? CUBE_3D_DEFAULTS.cube3dIdleSpeed;
  const cursorInfluence = g.cube3dCursorInfluence ?? CUBE_3D_DEFAULTS.cube3dCursorInfluence;
  const tumbleSpeed = g.cube3dTumbleSpeed ?? CUBE_3D_DEFAULTS.cube3dTumbleSpeed;
  const tumbleDamping = Math.max(0, Math.min(
    0.999,
    g.cube3dTumbleDamping ?? CUBE_3D_DEFAULTS.cube3dTumbleDamping,
  ));
  const dotSizeMul = Math.max(
    0.1,
    g.cube3dDotSizeMul ?? CUBE_3D_DEFAULTS.cube3dDotSizeMul,
  );
  const reducedMotion = prefersReducedMotion();
  const motionScale = resolveCube3DMotionScale(
    reducedMotion,
    g.cube3dReducedMotionScale,
  );
  const idleMotionScale = reducedMotion ? 0 : 1;

  // Update shared rotation once per frame
  if (ball === g.balls[0]) {
    const titleCenter = getHeroTitleCanvasCenter(g);
    state.cx = titleCenter.x;
    state.cy = titleCenter.y;
    state.sizePx = resolveCube3DSizePx(
      canvas.width,
      g.cube3dSizeVw ?? CUBE_3D_DEFAULTS.cube3dSizeVw,
    );
    const cx = state.cx;
    const cy = state.cy;
    const pointerInCanvas = g.pointerInCanvas ?? g.mouseInCanvas;
    const inputX = Number.isFinite(g.pointerX) ? g.pointerX : g.mouseX;
    const inputY = Number.isFinite(g.pointerY) ? g.pointerY : g.mouseY;
    const pointerSequence = g.pointerSequence || 0;
    const nx = pointerInCanvas ? clamp01((inputX - cx) / (canvas.width * 0.5)) : 0;
    const ny = pointerInCanvas ? clamp01((inputY - cy) / (canvas.height * 0.5)) : 0;

    const needsPointerSeed = pointerInCanvas && (
      !state.pointerWasInCanvas ||
      state.lastPointerSequence !== pointerSequence ||
      g.pointerJustEnteredCanvas === true
    );
    const dx = needsPointerSeed ? 0 : nx - (state.prevNx ?? 0);
    const dy = needsPointerSeed ? 0 : ny - (state.prevNy ?? 0);
    state.prevNx = nx;
    state.prevNy = ny;
    state.pointerWasInCanvas = Boolean(pointerInCanvas);
    if (pointerInCanvas) state.lastPointerSequence = pointerSequence;

    // Tumble impulse from mouse movement (drag-like)
    state.tumbleX += -dy * tumbleSpeed;
    state.tumbleY += dx * tumbleSpeed;

    // Damping
    state.tumbleX *= tumbleDamping;
    state.tumbleY *= tumbleDamping;

    // Apply rotation: idle + cursor + tumble
    state.rotY += (
      (idleSpeed * idleMotionScale)
      + ((nx * cursorInfluence + state.tumbleY) * motionScale)
    ) * dt;
    state.rotX += (
      (idleSpeed * 0.6 * idleMotionScale)
      + ((ny * cursorInfluence + state.tumbleX) * motionScale)
    ) * dt;
    state.rotZ += idleSpeed * 0.2 * idleMotionScale * dt;
    const manualAngularVelocity = Math.hypot(state.tumbleX, state.tumbleY) * motionScale;
    if (pointerInCanvas && manualAngularVelocity > 0.12) {
      state.audioAngle += manualAngularVelocity * dt;
      triggerDetent({
        id: '3d-cube:edge',
        value: state.audioAngle,
        step: Math.PI / 16,
        velocity: manualAngularVelocity,
        minVelocity: 0.16,
        minIntervalMs: 34,
        gain: 0.052,
        filterHz: 3300,
      });
    }
  }

  const { x, y, z } = ball._cube3d;
  const unitRotation = rotateXYZ(x, y, z, state.rotX, state.rotY, state.rotZ);
  const rotatedX = unitRotation.x * state.sizePx;
  const rotatedY = unitRotation.y * state.sizePx;
  const rotatedZ = unitRotation.z * state.sizePx;
  const focal = Math.max(
    80,
    g.cube3dFocalLength ?? CUBE_3D_DEFAULTS.cube3dFocalLength,
  );

  // Calculate distance from viewer for correct perspective
  // rotated.z ranges from -sizePx/2 (back) to +sizePx/2 (front)
  // zDist: back gives sizePx (far), front gives 0 (close)
  const halfSize = state.sizePx * 0.5;
  const zDist = halfSize - rotatedZ;
  const scale = focal / (focal + zDist);
  // Now: back points get smaller scale (more distant), front points get larger scale (closer)

  const targetX = state.cx + rotatedX * scale;
  const targetY = state.cy + rotatedY * scale;
  const rawR = ball._cloudBaseR * dotSizeMul * scale;

  // Depth factor for logo layering and engine fog
  // Map z from [-sizePx/2, +sizePx/2] to [0, 1] where 0 is back, 1 is front
  const depthFactor = (rotatedZ + halfSize) / state.sizePx;

  ball.alpha = resolveDistanceFogOpacity(depthFactor, {
    fogStart: g.cube3dFogStart ?? CUBE_3D_DEFAULTS.cube3dFogStart,
    fogMin: g.cube3dFogMin ?? CUBE_3D_DEFAULTS.cube3dFogMin,
  });

  ball.r = clampRadiusToGlobalBounds(g, rawR);
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

export function render3DCubeDepthLayer(ctx, options = {}) {
  const g = getGlobals();
  const balls = g.balls;
  if (!ctx || !Array.isArray(balls) || balls.length === 0) return;

  const layer = options.layer === 'front' ? 'front' : 'behind';
  const depthPlane = Number.isFinite(options.depthPlane) ? options.depthPlane : 0.5;
  const canvasWidth = Number(options.canvasWidth) || Number.POSITIVE_INFINITY;
  const canvasHeight = Number(options.canvasHeight) || Number.POSITIVE_INFINITY;

  ctx.save();
  for (let i = 0; i < balls.length; i += 1) {
    const ball = balls[i];
    if (!ball || ball._cloudMode !== 'cube') continue;

    const z = Number.isFinite(ball.z) ? ball.z : 1;
    if (layer === 'behind' ? z >= depthPlane : z < depthPlane) continue;

    const radius = typeof ball.getDisplayRadius === 'function'
      ? ball.getDisplayRadius()
      : (Number(ball.r) || 0);
    if (radius <= 0.05) continue;
    if (
      ball.x + radius < 0 ||
      ball.y + radius < 0 ||
      ball.x - radius > canvasWidth ||
      ball.y - radius > canvasHeight
    ) {
      continue;
    }

    const alpha = clampCanvasAlpha((ball.alpha ?? 1) * (ball.filterOpacity ?? 1));
    if (alpha <= 0.001) continue;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
