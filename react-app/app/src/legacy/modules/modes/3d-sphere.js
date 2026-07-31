// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           3D SPHERE POINT CLOUD                              ║
// ║      Hollow sphere that rotates with cursor; camera-locked like cube         ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { MODES } from '../core/constants.js';
import { spawnBall } from '../physics/spawn.js';
import { clampRadiusToGlobalBounds } from '../utils/ball-sizing.js';
import { getHeroTitleCanvasCenter } from '../rendering/title-depth.js';
import { subscribeScenePointer } from '../input/scene-pointer.js';
import { resolveDistanceFogOpacity } from '../visual/depth-fog.js';
import { triggerDetent } from '../audio/simulation-audio-adapter.js';

const DEFAULT_DRAG_GAIN = 1.25;
const DEFAULT_RELEASE_SPIN_GAIN = 1.05;
const DEFAULT_ANGULAR_DAMPING_PER_SEC = 0.55;
const DEFAULT_MAX_ANGULAR_VELOCITY = 8.0;
const DEFAULT_ORBIT_RADIUS_VW = 4.5;
const DEFAULT_ORBIT_SPEED = 0.12;
const DEFAULT_SPIN_STRAIN_MAX = 0.055;
const DEFAULT_SPIN_STRAIN_START = 3.0;
const DEFAULT_REDUCED_MOTION_SCALE = 0.18;
const DEFAULT_MIN_DOT_RADIUS_PX = 1.8;
const DEFAULT_ALPHA_MAX = 1;
const INPUT_VELOCITY_EASE = 10;
const INPUT_VELOCITY_THRESHOLD = 0.025;
const DEPTH_BLEND_BAND = 0.045;
const depthRenderScratch = [];
let unsubscribePointer = null;

function fibonacciSphere(count) {
  const pts = [];
  const goldenRatio = (1 + Math.sqrt(5)) / 2;
  for (let i = 0; i < count; i++) {
    const theta = 2 * Math.PI * i / goldenRatio;
    const phi = Math.acos(1 - 2 * (i + 0.5) / count);
    const sinPhi = Math.sin(phi);
    pts.push({
      x: sinPhi * Math.cos(theta),
      y: Math.cos(phi),
      z: sinPhi * Math.sin(theta),
    });
  }
  return pts;
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function clampCanvasAlpha(value) {
  const next = Number(value);
  if (!Number.isFinite(next)) return 1;
  return Math.max(0, Math.min(1, next));
}

function smoothstep(t) {
  const x = clampNumber(t, 0, 1);
  return x * x * (3 - (2 * x));
}

/**
 * Map screen coordinates to virtual trackball surface (unit sphere)
 * Returns a 3D point on the sphere or on the hyperbolic sheet outside
 * @param {number} x - Screen x relative to sphere center
 * @param {number} y - Screen y relative to sphere center  
 * @param {number} radius - Sphere radius in pixels
 */
function mapToTrackball(x, y, radius) {
  // Normalize to -1..1 range
  const nx = x / radius;
  const ny = y / radius; // No inversion needed: Screen Y-down matches Render Y-down
  const distSq = nx * nx + ny * ny;
  
  if (distSq <= 1.0) {
    // On sphere surface: z = sqrt(1 - x^2 - y^2)
    return { x: nx, y: ny, z: Math.sqrt(1.0 - distSq) };
  } else {
    // Outside sphere: use hyperbolic sheet for smooth continuation
    // z = 1/(2*dist) for smooth trackball behavior
    const dist = Math.sqrt(distSq);
    return { x: nx / dist, y: ny / dist, z: 0.5 / dist };
  }
}

/**
 * Calculate rotation axis and angle from two trackball points
 * Returns axis (normalized) and angle in radians
 * Uses standard trackball formula: axis = p1 × p2 (previous × current)
 */
function trackballRotation(p1, p2) {
  // Cross product p1 × p2 (standard trackball order)
  // Axis perpendicular to motion, following right-hand rule
  const ax = p1.y * p2.z - p1.z * p2.y;
  const ay = p1.z * p2.x - p1.x * p2.z;
  const az = p1.x * p2.y - p1.y * p2.x;
  
  // Normalize axis
  const len = Math.sqrt(ax * ax + ay * ay + az * az);
  if (len < 0.0001) {
    return { axis: { x: 0, y: 1, z: 0 }, angle: 0 };
  }
  
  // Angle from dot product
  // CRITICAL: Trackball formula uses 2× the arc angle for natural rotation
  // Reference: "The object rotates along that arc by twice the angle of the arc"
  const dot = Math.max(-1, Math.min(1, p1.x * p2.x + p1.y * p2.y + p1.z * p2.z));
  const arcAngle = Math.acos(dot);
  const rotationAngle = 2.0 * arcAngle;  // Trackball physics: rotate by 2× arc angle
  
  return {
    axis: { x: ax / len, y: ay / len, z: az / len },
    angle: rotationAngle
  };
}

/**
 * Apply 3x3 rotation matrix to a point
 * Matrix stored as flat array: [m00, m01, m02, m10, m11, m12, m20, m21, m22]
 */
/**
 * Create rotation matrix from axis and angle
 * Using Rodrigues' rotation formula
 */
function axisAngleToMatrix(axis, angle) {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const t = 1 - c;
  const x = axis.x;
  const y = axis.y;
  const z = axis.z;
  
  return [
    t * x * x + c,     t * x * y - s * z, t * x * z + s * y,
    t * x * y + s * z, t * y * y + c,     t * y * z - s * x,
    t * x * z - s * y, t * y * z + s * x, t * z * z + c
  ];
}

/**
 * Multiply two 3x3 matrices
 * Result = A * B
 */
function multiplyMatrices(a, b) {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
  ];
}

function resolveReducedMotionScale(g) {
  const reduce = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!reduce) return 1;
  return clampNumber(g.sphere3dReducedMotionScale ?? DEFAULT_REDUCED_MOTION_SCALE, 0, 1);
}

function resolveAngularDampingPerSec(g) {
  const damping = Number(g.sphere3dAngularDampingPerSec);
  if (Number.isFinite(damping)) {
    return clampNumber(damping, 0, 8);
  }
  if (Number.isFinite(g.sphere3dTumbleDamping)) {
    const legacyDamping = clampNumber(g.sphere3dTumbleDamping, 0.001, 0.999);
    return clampNumber(-Math.log(legacyDamping) * 60, 0, 8);
  }
  return DEFAULT_ANGULAR_DAMPING_PER_SEC;
}

function resolveDragGain(g) {
  return clampNumber(g.sphere3dDragGain ?? g.sphere3dTumbleSpeed ?? DEFAULT_DRAG_GAIN, 0, 4);
}

function resolveSpinIdleSpeed(g) {
  return clampNumber(g.sphere3dSpinIdleSpeed ?? g.sphere3dIdleSpeed ?? 0.08, 0, 1.5);
}

function pointMatchesDrag(state, detail) {
  if (!state?.isDragging) return false;
  return state.dragPointerId === null || detail?.pointerId === null || detail.pointerId === state.dragPointerId;
}

function resetDragState(state) {
  if (!state) return;
  state.isDragging = false;
  state.dragPointerId = null;
  state.prevTrackballPoint = null;
  state.lastPointerTime = 0;
  state.pointerWasInCanvas = false;
}

function handleSpherePointer(type, detail) {
  const g = getGlobals();
  if (g.currentMode !== MODES.SPHERE_3D || !detail) return;
  const state = g.sphere3dState;
  if (!state) return;

  if (type === 'down') {
    if (!detail.inBounds) {
      resetDragState(state);
      return;
    }
    const relX = detail.x - state.cx;
    const relY = detail.y - state.cy;
    const interactionRadius = state.radiusPx * 1.35;
    if (Math.hypot(relX, relY) > interactionRadius) {
      resetDragState(state);
      return;
    }
    state.isDragging = true;
    state.dragPointerId = detail.pointerId ?? null;
    state.prevTrackballPoint = mapToTrackball(relX, relY, state.radiusPx);
    state.lastPointerTime = Number(detail.time) || performance.now();
    state.pointerWasInCanvas = true;
    return;
  }

  if (type === 'move') {
    if (!pointMatchesDrag(state, detail)) return;
    const now = Number(detail.time) || performance.now();
    const elapsed = state.lastPointerTime > 0 ? (now - state.lastPointerTime) / 1000 : 0;
    const dt = clampNumber(elapsed, 0.008, 0.08);
    const relX = detail.x - state.cx;
    const relY = detail.y - state.cy;
    const currentPoint = mapToTrackball(relX, relY, state.radiusPx);

    if (state.prevTrackballPoint) {
      const rotation = trackballRotation(state.prevTrackballPoint, currentPoint);
      const angularVel = rotation.angle / dt;
      if (angularVel > INPUT_VELOCITY_THRESHOLD) {
        const motionScale = resolveReducedMotionScale(g);
        const dragGain = resolveDragGain(g) * motionScale;
        const maxAngularVelocity = clampNumber(
          g.sphere3dMaxAngularVelocity ?? DEFAULT_MAX_ANGULAR_VELOCITY,
          0.2,
          16
        ) * Math.max(0.2, motionScale);
        const targetAngularVel = Math.min(angularVel * dragGain, maxAngularVelocity);
        const follow = 1 - Math.exp(-INPUT_VELOCITY_EASE * dt);
        state.currentAngularVelX += ((rotation.axis.x * targetAngularVel) - state.currentAngularVelX) * follow;
        state.currentAngularVelY += ((rotation.axis.y * targetAngularVel) - state.currentAngularVelY) * follow;
        state.currentAngularVelZ += ((rotation.axis.z * targetAngularVel) - state.currentAngularVelZ) * follow;
      }
    }

    state.prevTrackballPoint = currentPoint;
    state.lastPointerTime = now;
    state.pointerWasInCanvas = true;
    return;
  }

  if (type === 'up' || type === 'cancel') {
    if (!pointMatchesDrag(state, detail)) return;
    const releaseGain = type === 'cancel'
      ? 0.35
      : clampNumber(g.sphere3dReleaseSpinGain ?? DEFAULT_RELEASE_SPIN_GAIN, 0, 2);
    state.currentAngularVelX *= releaseGain;
    state.currentAngularVelY *= releaseGain;
    state.currentAngularVelZ *= releaseGain;
    resetDragState(state);
  }
}

function ensurePointerSubscription() {
  if (unsubscribePointer) return;
  unsubscribePointer = subscribeScenePointer(handleSpherePointer);
}

export function initialize3DSphere() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  clearBalls();
  ensurePointerSubscription();

  const densityBase = Math.max(10, Math.round(g.sphere3dDensity ?? 350));
  const count = getMobileAdjustedCount(densityBase);
  if (count <= 0) return;

  const radiusVw = g.sphere3dRadiusVw ?? 72;
  // Scale based on shorter side (vmin) to ensure it fits/scales appropriately
  const minDim = Math.min(canvas.width, canvas.height);
  const radiusPx = Math.max(10, (radiusVw / 100) * minDim);
  const dotSizeMul = Math.max(0.2, g.sphere3dDotSizeMul ?? 1.0);
  const baseR = (g.R_MED || 20) * 0.30 * 2.0 * (g.DPR || 1);

  // Initialize rotation matrix as identity (no rotation)
  const rotMatrix = [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  ];
  
  const titleCenter = getHeroTitleCanvasCenter(g);
  g.sphere3dState = {
    cx: canvas.width * 0.5,
    cy: titleCenter.y,
    radiusPx,
    rotationMatrix: rotMatrix,  // 3x3 rotation matrix (avoids gimbal lock)
    dotSizeMul,
    prevTrackballPoint: null,
    currentAngularVelX: 0,
    currentAngularVelY: 0,
    currentAngularVelZ: 0,
    orbitPhase: 0,
    spinAxisLocalX: 0,
    spinAxisLocalY: 1,
    spinAxisLocalZ: 0,
    spinStrain: 0,
    isDragging: false,
    dragPointerId: null,
    lastPointerTime: 0,
    pointerWasInCanvas: false,
    audioAngle: 0,
    motionScale: resolveReducedMotionScale(g),
    idleSpeed: resolveSpinIdleSpeed(g),
    focal: Math.max(80, g.sphere3dFocalLength ?? 600),
    minDotRadius: Math.max(0, g.sphere3dMinDotRadiusPx ?? DEFAULT_MIN_DOT_RADIUS_PX) * (g.DPR || 1),
    alphaMax: clampNumber(g.sphere3dAlphaMax ?? DEFAULT_ALPHA_MAX, 0.2, 1),
    fogStart: g.sphere3dFogStart ?? 0.9,
    fogMin: g.sphere3dFogMin ?? 0.42,
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
    ball._sphere3d = pts[i];
    ball._cloudMode = 'sphere';
    ball.isSleeping = false;
  }
}

export function apply3DSphereForces(ball, dt) {
  const g = getGlobals();
  const canvas = g.canvas;
  const state = g.sphere3dState;
  if (!canvas || !state || !ball || !ball._sphere3d) return;

  const dotSizeMul = Math.max(0.2, g.sphere3dDotSizeMul ?? 1.0);

  // Update shared rotation once per frame (first ball)
  if (ball === g.balls[0]) {
    // Resolve shared configuration once per frame, not once per particle.
    state.motionScale = resolveReducedMotionScale(g);
    state.idleSpeed = resolveSpinIdleSpeed(g);
    state.focal = Math.max(80, g.sphere3dFocalLength ?? 600);
    state.minDotRadius = Math.max(0, g.sphere3dMinDotRadiusPx ?? DEFAULT_MIN_DOT_RADIUS_PX) * (g.DPR || 1);
    state.alphaMax = clampNumber(g.sphere3dAlphaMax ?? DEFAULT_ALPHA_MAX, 0.2, 1);
    state.fogStart = g.sphere3dFogStart ?? 0.9;
    state.fogMin = g.sphere3dFogMin ?? 0.42;

    const motionScale = state.motionScale;
    const idleSpeed = state.idleSpeed;
    const titleCenter = getHeroTitleCanvasCenter(g);

    const radiusVw = g.sphere3dRadiusVw ?? 72;
    // Scale based on shorter side (vmin) to ensure it fits/scales appropriately
    const minDim = Math.min(canvas.width, canvas.height);
    state.radiusPx = Math.max(10, (radiusVw / 100) * minDim);

    const orbitRadius = Math.max(0, (g.sphere3dOrbitRadiusVw ?? DEFAULT_ORBIT_RADIUS_VW) / 100) * minDim * motionScale;
    const orbitSpeed = clampNumber(g.sphere3dOrbitSpeed ?? DEFAULT_ORBIT_SPEED, 0, 1.5) * motionScale;
    state.orbitPhase += orbitSpeed * dt;
    state.cx = canvas.width * 0.5;
    state.cy = titleCenter.y + Math.sin(state.orbitPhase) * orbitRadius * 0.38;

    const damping = Math.exp(-resolveAngularDampingPerSec(g) * dt * (state.isDragging ? 0.18 : 1));
    state.currentAngularVelX *= damping;
    state.currentAngularVelY *= damping;
    state.currentAngularVelZ *= damping;

    // Apply coasting rotation from residual angular velocity.
    let totalAngularVel = Math.sqrt(
      state.currentAngularVelX * state.currentAngularVelX +
      state.currentAngularVelY * state.currentAngularVelY +
      state.currentAngularVelZ * state.currentAngularVelZ
    );

    const maxAngularVelocity = clampNumber(
      g.sphere3dMaxAngularVelocity ?? DEFAULT_MAX_ANGULAR_VELOCITY,
      0.2,
      16
    ) * Math.max(0.2, motionScale);
    if (totalAngularVel > maxAngularVelocity) {
      const velocityScale = maxAngularVelocity / totalAngularVel;
      state.currentAngularVelX *= velocityScale;
      state.currentAngularVelY *= velocityScale;
      state.currentAngularVelZ *= velocityScale;
      totalAngularVel = maxAngularVelocity;
    }

    if (totalAngularVel > 0.001) {
      const axisX = state.currentAngularVelX / totalAngularVel;
      const axisY = state.currentAngularVelY / totalAngularVel;
      const axisZ = state.currentAngularVelZ / totalAngularVel;
      const coastAngle = totalAngularVel * dt;
      const coastMatrix = axisAngleToMatrix({ x: axisX, y: axisY, z: axisZ }, coastAngle);
      state.rotationMatrix = multiplyMatrices(coastMatrix, state.rotationMatrix);
      state.spinAxisLocalX = state.rotationMatrix[0] * axisX + state.rotationMatrix[3] * axisY + state.rotationMatrix[6] * axisZ;
      state.spinAxisLocalY = state.rotationMatrix[1] * axisX + state.rotationMatrix[4] * axisY + state.rotationMatrix[7] * axisZ;
      state.spinAxisLocalZ = state.rotationMatrix[2] * axisX + state.rotationMatrix[5] * axisY + state.rotationMatrix[8] * axisZ;
      if (state.isDragging && totalAngularVel > 0.08) {
        state.audioAngle += coastAngle;
        triggerDetent({
          id: '3d-sphere:orbit',
          value: state.audioAngle,
          step: Math.PI / 18,
          velocity: totalAngularVel,
          minVelocity: 0.11,
          minIntervalMs: 34,
          gain: 0.048,
          filterHz: 3200,
        });
      }
    } else {
      state.currentAngularVelX = 0;
      state.currentAngularVelY = 0;
      state.currentAngularVelZ = 0;
    }

    if (!state.isDragging && totalAngularVel < 0.25) {
      const blend = 1.0 - (totalAngularVel / 0.25);
      const idleAngle = idleSpeed * motionScale * dt * blend;
      const idleMatrix = axisAngleToMatrix({ x: 0, y: 1, z: 0 }, idleAngle);
      state.rotationMatrix = multiplyMatrices(idleMatrix, state.rotationMatrix);
    }
    const strainMax = clampNumber(g.sphere3dSpinStrainMax ?? DEFAULT_SPIN_STRAIN_MAX, 0, 0.12);
    const strainStart = clampNumber(g.sphere3dSpinStrainStart ?? DEFAULT_SPIN_STRAIN_START, 0.2, 12);
    const strainT = smoothstep((totalAngularVel - strainStart) / Math.max(0.1, maxAngularVelocity - strainStart));
    state.spinStrain += ((strainT * strainMax * motionScale) - state.spinStrain) * (1 - Math.exp(-8 * dt));
  }

  const point = ball._sphere3d;
  const r = state.radiusPx;
  const matrix = state.rotationMatrix;
  let unitX = point.x;
  let unitY = point.y;
  let unitZ = point.z;
  const strain = state.spinStrain || 0;
  if (strain > 0.0001) {
    const axisX = state.spinAxisLocalX || 0;
    const axisY = state.spinAxisLocalY || 1;
    const axisZ = state.spinAxisLocalZ || 0;
    const dot = unitX * axisX + unitY * axisY + unitZ * axisZ;
    const parallelX = axisX * dot;
    const parallelY = axisY * dot;
    const parallelZ = axisZ * dot;
    const perpX = unitX - parallelX;
    const perpY = unitY - parallelY;
    const perpZ = unitZ - parallelZ;
    const axisCompression = 1 - strain * 0.5;
    const radialBulge = 1 + strain;
    unitX = parallelX * axisCompression + perpX * radialBulge;
    unitY = parallelY * axisCompression + perpY * radialBulge;
    unitZ = parallelZ * axisCompression + perpZ * radialBulge;
  }
  const localX = r * unitX;
  const localY = r * unitY;
  const localZ = r * unitZ;
  // Keep the per-particle hot path allocation-free. The sphere's local
  // coordinates are precomputed once during initialization.
  const rotatedX = matrix[0] * localX + matrix[1] * localY + matrix[2] * localZ;
  const rotatedY = matrix[3] * localX + matrix[4] * localY + matrix[5] * localZ;
  const rotatedZ = matrix[6] * localX + matrix[7] * localY + matrix[8] * localZ;
  const focal = state.focal;
  
  // Calculate distance from viewer for correct perspective
  // rotated.z ranges from -r (back, away from viewer) to +r (front, toward viewer)
  // zDist: back=-r gives 2r (far), front=+r gives 0 (close)
  const zDist = r - rotatedZ;
  const scale = focal / (focal + zDist);
  // Now: back balls get smaller scale (more distant), front balls get larger scale (closer)

  const targetX = state.cx + rotatedX * scale;
  const targetY = state.cy + rotatedY * scale;

  const rawR = ball._cloudBaseR * dotSizeMul * scale;
  const depth = (rotatedZ + r) / (2 * r);

  // Scale size based on z-depth for perspective illusion
  // Back balls (z=0) are smaller, front balls (z=1) are larger
  // This enhances the 3D effect significantly
  const perspectiveSize = 0.6 + depth * 0.8; // 0.6x to 1.4x scale
  
  ball.r = Math.max(state.minDotRadius, clampRadiusToGlobalBounds(g, rawR * perspectiveSize));
  ball.x = targetX;
  ball.y = targetY;
  ball.vx = 0;
  ball.vy = 0;
  ball.omega = 0;
  ball.isSleeping = false;
  
  // Normalize z-depth to 0-1 range for logo layering
  // rotated.z ranges from -r to +r, so zShift (rotated.z + r) ranges from 0 to 2r
  // ball.z = 0 means BACK (fogged), ball.z = 1 means FRONT (clear)
  ball.z = depth;
  ball.alpha = resolveDistanceFogOpacity(depth, {
    fogStart: state.fogStart,
    fogMin: state.fogMin,
  }) * state.alphaMax;
}

export function render3DSphereDepthLayer(ctx, options = {}) {
  const g = getGlobals();
  const balls = g.balls;
  if (!ctx || !Array.isArray(balls) || balls.length === 0) return;

  const layer = options.layer === 'front' ? 'front' : 'behind';
  const depthPlane = Number.isFinite(options.depthPlane) ? options.depthPlane : 0.5;
  const canvasWidth = Number(options.canvasWidth) || Number.POSITIVE_INFINITY;
  const canvasHeight = Number(options.canvasHeight) || Number.POSITIVE_INFINITY;
  const band = Math.max(0.001, Number(g.sphere3dDepthBlendBand ?? DEPTH_BLEND_BAND));

  // The engine always renders the behind layer first. Build and sort the full
  // depth list once there, then reuse the identical order for the front layer.
  if (layer === 'behind' || depthRenderScratch.length === 0) {
    depthRenderScratch.length = 0;
    for (let i = 0; i < balls.length; i += 1) {
      const ball = balls[i];
      if (ball?._cloudMode === 'sphere') depthRenderScratch.push(ball);
    }
    depthRenderScratch.sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
  }

  ctx.save();
  for (let i = 0; i < depthRenderScratch.length; i += 1) {
    const ball = depthRenderScratch[i];
    const z = Number.isFinite(ball.z) ? ball.z : 1;
    if (layer === 'behind' && z > depthPlane + band) continue;
    if (layer === 'front' && z < depthPlane - band) continue;
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

    const t = smoothstep((z - (depthPlane - band)) / (band * 2));
    const layerAlpha = layer === 'front' ? t : 1 - t;
    const alpha = clampCanvasAlpha((ball.alpha ?? 1) * (ball.filterOpacity ?? 1) * layerAlpha);
    if (alpha <= 0.001) continue;

    ctx.globalAlpha = alpha;
    ctx.fillStyle = ball.color;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}
