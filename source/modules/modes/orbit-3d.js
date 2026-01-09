// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    ORBIT 3D: PLANETARY RING SYSTEM                          ║
// ║   3D orbital rings with true perspective, multi-layer rotation, tumble      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { spawnBall } from '../physics/spawn.js';
import { pickRandomColor } from '../visual/colors.js';
import { clampRadiusToGlobalBounds } from '../utils/ball-sizing.js';

function clamp01(v) {
  return Math.max(-1, Math.min(1, v));
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

function generateOrbitalRings(count, radiusVw, canvasWidth, shellCount) {
  const pts = [];
  const radiusPx = Math.max(10, (radiusVw / 100) * canvasWidth);
  const shells = Math.max(2, Math.min(8, shellCount | 0));
  
  const pointsPerShell = Math.ceil(count / shells);
  
  for (let shell = 0; shell < shells; shell++) {
    const shellRadius = radiusPx * (0.4 + (shell / (shells - 1)) * 0.6); // 40% to 100% radius
    const shellInclination = (shell / shells) * Math.PI * 0.25; // 0 to 45 degrees
    const shellPhaseOffset = (shell / shells) * Math.PI * 2; // Stagger starting positions
    const shellSpeed = 0.3 + (shell % 2) * 0.4; // Alternating speeds (0.3 or 0.7)
    
    const pointsInShell = Math.min(pointsPerShell, count - pts.length);
    
    for (let i = 0; i < pointsInShell; i++) {
      const angle = (i / pointsInShell) * Math.PI * 2 + shellPhaseOffset;
      const eccentricity = 0.1 + Math.random() * 0.1; // Slight elliptical variation
      
      pts.push({
        shell,
        angle,
        radius: shellRadius,
        inclination: shellInclination,
        speed: shellSpeed,
        eccentricity,
        wobblePhase: Math.random() * Math.PI * 2
      });
    }
  }
  
  return pts;
}

export function initializeOrbit3D() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  clearBalls();

  const densityBase = Math.max(10, Math.round(g.orbit3dDensity ?? 120));
  const count = getMobileAdjustedCount(densityBase);
  if (count <= 0) return;

  const radiusVw = g.orbit3dRadiusVw ?? 22;
  const shellCount = g.orbit3dShellCount ?? 4;
  const baseR = (g.R_MED || 20) * 0.30 * 2.0 * (g.DPR || 1);
  const dotSizeMul = Math.max(0.1, g.orbit3dDotSizeMul ?? 1.2);

  g.orbit3dState = {
    cx: canvas.width * 0.5,
    cy: canvas.height * 0.5,
    rotX: 0,
    rotY: 0,
    rotZ: 0,
    tumbleX: 0,
    tumbleY: 0,
    dotSizeMul,
    time: 0
  };

  const pts = generateOrbitalRings(count, radiusVw, canvas.width, shellCount);
  
  for (let i = 0; i < pts.length; i++) {
    const ball = spawnBall(0, 0, pickRandomColor());
    if (!ball) continue;
    
    ball.vx = 0;
    ball.vy = 0;
    ball.omega = 0;
    ball.r = clampRadiusToGlobalBounds(g, baseR * dotSizeMul);
    ball._cloudBaseR = baseR;
    ball._orbit3d = pts[i];
    ball._cloudMode = 'orbit';
    ball.isSleeping = false;
  }
}

export function applyOrbit3DForces(ball, dt) {
  const g = getGlobals();
  const canvas = g.canvas;
  const state = g.orbit3dState;
  if (!canvas || !state || !ball || !ball._orbit3d) return;

  // Read runtime params for real-time updates
  const idleSpeed = g.orbit3dIdleSpeed ?? 0.25;
  const orbitalSpeed = g.orbit3dOrbitalSpeed ?? 0.8;
  const tumbleSpeed = g.orbit3dTumbleSpeed ?? 2.0;
  const tumbleDamping = Math.max(0, Math.min(0.999, g.orbit3dTumbleDamping ?? 0.93));
  const dotSizeMul = Math.max(0.1, g.orbit3dDotSizeMul ?? 1.2);
  const wobbleStrength = g.orbit3dWobbleStrength ?? 0.15;
  const inclinationMix = g.orbit3dInclinationMix ?? 0.7;

  // Update shared rotation once per frame (first ball)
  if (ball === g.balls[0]) {
    const cx = canvas.width * 0.5;
    const cy = canvas.height * 0.5;
    
    state.time += dt;
    
    // Mouse interaction: dragging spins the orbital system
    if (g.mouseInCanvas) {
      const prevMouseX = state.prevMouseX ?? g.mouseX;
      const prevMouseY = state.prevMouseY ?? g.mouseY;
      
      const rawDx = g.mouseX - prevMouseX;
      const rawDy = g.mouseY - prevMouseY;
      const maxDelta = 100 * (g.DPR || 1);
      const mouseDx = Math.max(-maxDelta, Math.min(maxDelta, rawDx));
      const mouseDy = Math.max(-maxDelta, Math.min(maxDelta, rawDy));
      
      state.prevMouseX = g.mouseX;
      state.prevMouseY = g.mouseY;

      // Calculate distance from center for interaction scaling
      const relX = g.mouseX - cx;
      const relY = g.mouseY - cy;
      const distFromCenter = Math.sqrt(relX * relX + relY * relY);
      const visualRadius = canvas.width * 0.3;
      
      if (distFromCenter < visualRadius * 1.5) {
        const spinGain = tumbleSpeed * 0.015;
        state.tumbleY += mouseDx * spinGain;
        state.tumbleX += -mouseDy * spinGain;
      }
    } else {
      state.prevMouseX = undefined;
      state.prevMouseY = undefined;
    }

    // Damping
    state.tumbleX *= tumbleDamping;
    state.tumbleY *= tumbleDamping;

    // Apply rotation: idle + tumble
    state.rotY += (idleSpeed + state.tumbleY) * dt;
    state.rotX += (idleSpeed * 0.5 + state.tumbleX) * dt;
    state.rotZ += idleSpeed * 0.15 * dt;
  }

  const orbit = ball._orbit3d;
  
  // Update orbital angle based on shell speed
  orbit.angle += orbitalSpeed * orbit.speed * dt;
  
  // Calculate position in orbital ring with slight eccentricity
  const r = orbit.radius * (1 + orbit.eccentricity * Math.cos(orbit.angle));
  const wobble = Math.sin(state.time * 2 + orbit.wobblePhase) * wobbleStrength * orbit.radius;
  
  // Local coordinates in tilted ring plane
  const x = r * Math.cos(orbit.angle);
  const y = wobble; // Slight wobble perpendicular to ring
  const z = r * Math.sin(orbit.angle);
  
  // Apply ring inclination
  const inclinationAngle = orbit.inclination * inclinationMix;
  const cosInc = Math.cos(inclinationAngle);
  const sinInc = Math.sin(inclinationAngle);
  
  const x2 = x;
  const y2 = y * cosInc - z * sinInc;
  const z2 = y * sinInc + z * cosInc;
  
  // Apply global rotation
  const rotated = rotateXYZ(x2, y2, z2, state.rotX, state.rotY, state.rotZ);
  
  // Perspective projection
  const focal = Math.max(80, g.orbit3dFocalLength ?? 600);
  const maxRadius = orbit.radius * 1.5;
  const zShift = rotated.z + maxRadius; // Keep positive
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
