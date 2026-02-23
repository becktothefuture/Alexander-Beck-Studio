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
function applyMatrix(point, matrix) {
  return {
    x: matrix[0] * point.x + matrix[1] * point.y + matrix[2] * point.z,
    y: matrix[3] * point.x + matrix[4] * point.y + matrix[5] * point.z,
    z: matrix[6] * point.x + matrix[7] * point.y + matrix[8] * point.z
  };
}

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

export function initialize3DSphere() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  clearBalls();

  const densityBase = Math.max(10, Math.round(g.sphere3dDensity ?? 350));
  const count = getMobileAdjustedCount(densityBase);
  if (count <= 0) return;

  const radiusVw = g.sphere3dRadiusVw ?? 18;
  // Scale based on shorter side (vmin) to ensure it fits/scales appropriately
  const minDim = Math.min(canvas.width, canvas.height);
  const radiusPx = Math.max(10, (radiusVw / 100) * minDim);
  const dotSizeMul = 1.5; // Fixed size multiplier from design
  const baseR = (g.R_MED || 20) * 0.30 * 2.0 * (g.DPR || 1);

  // Initialize rotation matrix as identity (no rotation)
  const rotMatrix = [
    1, 0, 0,
    0, 1, 0,
    0, 0, 1
  ];
  
    g.sphere3dState = {
      cx: canvas.width * 0.5,
      cy: canvas.height * 0.5,
      radiusPx,
      rotationMatrix: rotMatrix,  // 3x3 rotation matrix (avoids gimbal lock)
      dotSizeMul,
      // Trackball state
      prevTrackballPoint: null,
      currentAngularVelX: 0,
      currentAngularVelY: 0,
      currentAngularVelZ: 0,
      idleRotationTime: 0,
      // Smoothed mouse state for fluid interaction
      smoothMouseX: g.mouseX,
      smoothMouseY: g.mouseY,
      lastMouseX: g.mouseX,
      lastMouseY: g.mouseY
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
  const tumbleSpeed = g.sphere3dTumbleSpeed ?? 8.0;
  const tumbleDamping = Math.max(0, Math.min(0.999, g.sphere3dTumbleDamping ?? 0.94));
  const dotSizeMul = 1.5; // Fixed size multiplier from design

  // Update shared rotation once per frame (first ball)
  if (ball === g.balls[0]) {
    // Update center and radius to handle resize dynamically
    state.cx = canvas.width * 0.5;
    state.cy = canvas.height * 0.5;

    const radiusVw = g.sphere3dRadiusVw ?? 18;
    // Scale based on shorter side (vmin) to ensure it fits/scales appropriately
    const minDim = Math.min(canvas.width, canvas.height);
    state.radiusPx = Math.max(10, (radiusVw / 100) * minDim);

    const cx = state.cx;
    const cy = state.cy;
    
    // ═══════════════════════════════════════════════════════════════════════════════
    // TRACKBALL ROTATION MODEL (Matrix-based, no Euler angle drift)
    // ═══════════════════════════════════════════════════════════════════════════════
    if (g.mouseInCanvas) {
      // Smooth mouse position for fluid "weighty" feel
      const mouseDamping = Math.max(0.01, Math.min(1, g.sphere3dMouseDamping ?? 0.15));
      
      // Initialize smoothed mouse if first frame or reset
      if (state.smoothMouseX === undefined) {
        state.smoothMouseX = g.mouseX;
        state.smoothMouseY = g.mouseY;
      }
      
      // Lerp smoothed mouse towards current mouse
      // This adds "weight" to the cursor interaction
      state.smoothMouseX += (g.mouseX - state.smoothMouseX) * mouseDamping;
      state.smoothMouseY += (g.mouseY - state.smoothMouseY) * mouseDamping;
      
      // Use smoothed mouse for interaction calculations
      const interactionX = state.smoothMouseX;
      const interactionY = state.smoothMouseY;
      
      // Calculate mouse position relative to sphere center
      const relX = interactionX - cx;
      const relY = interactionY - cy;
      const distFromCenter = Math.sqrt(relX * relX + relY * relY);
      
      // Check if mouse is over/near the sphere
      const interactionRadius = state.radiusPx * 1.3;
      
      if (distFromCenter < interactionRadius) {
        // Map current mouse position to trackball surface
        const currentPoint = mapToTrackball(relX, relY, state.radiusPx);
        
        if (state.prevTrackballPoint) {
          // Calculate rotation from previous to current position
          const rotation = trackballRotation(state.prevTrackballPoint, currentPoint);
          
          if (rotation.angle > 0.0001) {
            // Calculate angular velocity (rad/s)
            const angularVel = rotation.angle / dt;
            
            // Velocity threshold to filter jitter
            // Lowered to 0.05 rad/s to allow slow, precise "grabbing" movements
            const velocityThreshold = 0.05; 
            
            if (angularVel > velocityThreshold) {
              // Apply rotation sensitivity
              const sensitivity = tumbleSpeed;
              const scaledAngle = rotation.angle * sensitivity;
              
              // Create rotation matrix for this frame's rotation
              const deltaMatrix = axisAngleToMatrix(rotation.axis, scaledAngle);
              
              // Apply rotation to existing matrix: newMatrix = deltaMatrix * oldMatrix
              state.rotationMatrix = multiplyMatrices(deltaMatrix, state.rotationMatrix);
              
              // Store angular velocity for damping
              // Blend with existing velocity for momentum conservation
              const momentumBlend = 0.5; // Balance between new input and existing momentum
              state.currentAngularVelX = state.currentAngularVelX * momentumBlend + (rotation.axis.x * angularVel * sensitivity) * (1 - momentumBlend);
              state.currentAngularVelY = state.currentAngularVelY * momentumBlend + (rotation.axis.y * angularVel * sensitivity) * (1 - momentumBlend);
              state.currentAngularVelZ = state.currentAngularVelZ * momentumBlend + (rotation.axis.z * angularVel * sensitivity) * (1 - momentumBlend);
            }
          }
        }
        
        // Update previous point
        state.prevTrackballPoint = currentPoint;
      } else {
        state.prevTrackballPoint = null;
      }
    } else {
      state.prevTrackballPoint = null;
    }

    // Apply damping to angular velocity
    const damping = tumbleDamping;
    state.currentAngularVelX *= damping;
    state.currentAngularVelY *= damping;
    state.currentAngularVelZ *= damping;
    
  // Apply coasting rotation from residual angular velocity
  // Use a small epsilon to prevent jitter at very low speeds
  const totalAngularVel = Math.sqrt(
    state.currentAngularVelX * state.currentAngularVelX +
    state.currentAngularVelY * state.currentAngularVelY +
    state.currentAngularVelZ * state.currentAngularVelZ
  );
  
  if (totalAngularVel > 0.001) {
    // Normalize axis
    const axisX = state.currentAngularVelX / totalAngularVel;
    const axisY = state.currentAngularVelY / totalAngularVel;
    const axisZ = state.currentAngularVelZ / totalAngularVel;
    const coastAngle = totalAngularVel * dt;
    
    // Apply coasting rotation
    const coastMatrix = axisAngleToMatrix({ x: axisX, y: axisY, z: axisZ }, coastAngle);
    state.rotationMatrix = multiplyMatrices(coastMatrix, state.rotationMatrix);
  } else {
    // Zero out velocity when stopped to prevent micro-drift
    state.currentAngularVelX = 0;
    state.currentAngularVelY = 0;
    state.currentAngularVelZ = 0;
  }
  
  // Gentle idle rotation around Y-axis (only when coasting is slow)
  // Blends in as manual rotation slows down
  if (totalAngularVel < 0.2) {
    const blend = 1.0 - (totalAngularVel / 0.2); // 0 to 1
    const idleAngle = idleSpeed * dt * blend;
    const idleMatrix = axisAngleToMatrix({ x: 0, y: 1, z: 0 }, idleAngle);
    state.rotationMatrix = multiplyMatrices(idleMatrix, state.rotationMatrix);
  }
  }

  const { theta, phi } = ball._sphere3d;
  const r = state.radiusPx;

  // Local sphere coordinates (spherical to Cartesian)
  const localPoint = {
    x: r * Math.sin(phi) * Math.cos(theta),
    y: r * Math.cos(phi),
    z: r * Math.sin(phi) * Math.sin(theta)
  };

  // Apply rotation matrix (trackball rotation)
  const rotated = applyMatrix(localPoint, state.rotationMatrix);
  const focal = Math.max(80, g.sphere3dFocalLength ?? 600);
  
  // Calculate distance from viewer for correct perspective
  // rotated.z ranges from -r (back, away from viewer) to +r (front, toward viewer)
  // zDist: back=-r gives 2r (far), front=+r gives 0 (close)
  const zDist = r - rotated.z;
  const scale = focal / (focal + zDist);
  // Now: back balls get smaller scale (more distant), front balls get larger scale (closer)

  const targetX = state.cx + rotated.x * scale;
  const targetY = state.cy + rotated.y * scale;

  const rawR = ball._cloudBaseR * dotSizeMul * scale;

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
  
  // Normalize z-depth to 0-1 range for logo layering
  // rotated.z ranges from -r to +r, so zShift (rotated.z + r) ranges from 0 to 2r
  // ball.z = 0 means BACK (fogged), ball.z = 1 means FRONT (clear)
  ball.z = (rotated.z + r) / (2 * r);
}
