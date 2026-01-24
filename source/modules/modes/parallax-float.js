// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          PARALLAX (FLOAT) MODE                                ║
// ║       Organic variant of Linear with random positions + levitation           ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { pickRandomColor } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { getModeSizeVarianceFrac, clampRadiusToGlobalBounds } from '../utils/ball-sizing.js';

// Smoothed mouse state (shared across all balls in this mode)
let _smoothMouseX = 0;
let _smoothMouseY = 0;
let _mouseInitialized = false;

export function initializeParallaxFloat() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // Reset smoothed mouse state
  _smoothMouseX = 0;
  _smoothMouseY = 0;
  _mouseInitialized = false;

  clearBalls();

  const w = canvas.width;
  const h = canvas.height;

  // Grid dimensions (number of vertices in each dimension)
  const gridX = getMobileAdjustedCount(Math.max(0, Math.min(40, Math.round(g.parallaxFloatGridX ?? g.parallaxLinearGridX ?? 14))));
  const gridY = getMobileAdjustedCount(Math.max(0, Math.min(40, Math.round(g.parallaxFloatGridY ?? g.parallaxLinearGridY ?? 10))));
  const gridZ = getMobileAdjustedCount(Math.max(0, Math.min(20, Math.round(g.parallaxFloatGridZ ?? g.parallaxLinearGridZ ?? 7))));
  if (gridX <= 0 || gridY <= 0 || gridZ <= 0) return;

  // Grid span: how much of the viewport the grid occupies in world space.
  // Default 10 = 10x viewport spread
  const spanX = Math.max(0, Math.min(10.0, g.parallaxFloatSpanX ?? g.parallaxLinearSpanX ?? 3));
  const spanY = Math.max(0, Math.min(10.0, g.parallaxFloatSpanY ?? g.parallaxLinearSpanY ?? 3));
  const xMin = -0.5 * w * spanX;
  const yMin = -0.5 * h * spanY;
  const xStep = (w * spanX) / Math.max(1, gridX - 1);
  const yStep = (h * spanY) / Math.max(1, gridY - 1);

  // Z-depth range (how far back the grid extends)
  const zNear = Math.max(10, g.parallaxFloatZNear ?? g.parallaxLinearZNear ?? 50);
  const zFar = Math.max(zNear + 100, g.parallaxFloatZFar ?? g.parallaxLinearZFar ?? 800);
  const zStep = (zFar - zNear) / Math.max(1, gridZ - 1);

  // Camera/projection
  const focalLength = Math.max(80, g.parallaxFloatFocalLength ?? g.parallaxLinearFocalLength ?? 420);

  const dotSizeMul = Math.max(0.1, Math.min(6.0, g.parallaxFloatDotSizeMul ?? g.parallaxLinearDotSizeMul ?? 1.8));
  const baseR = (g.R_MED || 20) * 0.32 * 2.4 * (g.DPR || 1) * dotSizeMul;
  const varFrac = getModeSizeVarianceFrac(g, MODES.PARALLAX_FLOAT);

  // Randomization amount (0-100 UI scale, or 0-1 legacy)
  // 0 = perfect grid like linear; 100 = fully random
  let randomizeRaw = g.parallaxFloatRandomize ?? 50;
  let randomize01 = (randomizeRaw > 1) ? (randomizeRaw / 100) : randomizeRaw;
  const randomize = Math.max(0, Math.min(1, randomize01));

  // Create 3D grid with random offsets
  const centerX = w * 0.5;
  const centerY = h * 0.5;

  let idx = 0;
  // Render back-to-front: start with far (iz=gridZ-1) so near dots draw last (on top)
  for (let iz = gridZ - 1; iz >= 0; iz--) {
    const z = zNear + iz * zStep;
    const depthFactor = iz / Math.max(1, gridZ - 1); // 0 (near) to 1 (far)
    
    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        // 3D grid position (centered) with random offset
        const xGrid = xMin + ix * xStep;
        const yGrid = yMin + iy * yStep;
        const zGrid = z;

        // Add random offset scaled by grid step and randomize amount
        const x3d = xGrid + (Math.random() - 0.5) * xStep * randomize * 2;
        const y3d = yGrid + (Math.random() - 0.5) * yStep * randomize * 2;
        const z3d = zGrid + (Math.random() - 0.5) * zStep * randomize * 2;

        // Project to 2D (perspective projection)
        const scale = focalLength / (focalLength + z3d);
        const x2d = centerX + x3d * scale;
        const y2d = centerY + y3d * scale;

        // Size (opacity is constant)
        const r = baseR * scale;
        const alpha = 1.0;

        const color = pickRandomColor();
        const ball = spawnBall(x2d, y2d, color);
        ball.r = clampRadiusToGlobalBounds(g, r);
        ball.vx = 0;
        ball.vy = 0;
        ball.alpha = alpha;
        
        // Levitation config (from control panel)
        const baseAmp = Math.max(0, g.parallaxFloatLevitationAmp ?? 20);
        const baseSpeed = Math.max(0.01, g.parallaxFloatLevitationSpeed ?? 0.2);
        
        // Store 3D position + levitation parameters
        ball._parallax3D = {
          x: x3d,
          y: y3d,
          z: z3d,
          baseScale: scale,
          // Levitation: unique phase/freq per particle for organic movement
          phaseX: Math.random() * Math.PI * 2,
          phaseY: Math.random() * Math.PI * 2,
          freqX: baseSpeed * (0.75 + Math.random() * 0.5),  // ±25% variation
          freqY: baseSpeed * (0.6 + Math.random() * 0.4),   // ±20% variation
          ampX: baseAmp * (0.4 + Math.random() * 0.8),      // 40-120% of base
          ampY: baseAmp * (0.5 + Math.random() * 1.0)       // 50-150% of base
        };
        
        ball._parallaxSizeMul = (varFrac <= 1e-6) ? 1.0 : (1 + (Math.random() * 2 - 1) * varFrac);
        ball._isParallax = true; // Skip all standard physics
        idx++;
      }
    }
  }
}

// Update smoothed mouse position (call once per frame, not per ball)
export function updateParallaxFloatMouse(dt) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  
  // Target mouse position (normalized -1 to 1), or 0 if mouse outside
  let targetX = 0, targetY = 0;
  if (g.mouseInCanvas) {
    targetX = Math.max(-1, Math.min(1, (g.mouseX - cx) / (canvas.width * 0.5)));
    targetY = Math.max(-1, Math.min(1, (g.mouseY - cy) / (canvas.height * 0.5)));
  }

  // Mouse easing factor (higher = snappier, lower = smoother)
  const easing = Math.max(0.5, Math.min(20, g.parallaxFloatMouseEasing ?? g.parallaxLinearMouseEasing ?? 4));
  const easeFactor = 1 - Math.exp(-easing * dt);

  // Initialize smoothed position on first frame to avoid jump
  if (!_mouseInitialized) {
    _smoothMouseX = targetX;
    _smoothMouseY = targetY;
    _mouseInitialized = true;
  } else {
    // Smooth interpolation toward target
    _smoothMouseX += (targetX - _smoothMouseX) * easeFactor;
    _smoothMouseY += (targetY - _smoothMouseY) * easeFactor;
  }
}

export function applyParallaxFloatForces(ball, dt) {
  if (!ball._parallax3D) return;

  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  const p = ball._parallax3D;

  // Advance levitation phase (continuous animation)
  p.phaseX += p.freqX * dt * Math.PI * 2;
  p.phaseY += p.freqY * dt * Math.PI * 2;

  // Calculate levitation drift
  const driftX = Math.sin(p.phaseX) * p.ampX;
  const driftY = Math.sin(p.phaseY) * p.ampY;

  // 3D position = base + levitation drift
  const x3d = p.x + driftX;
  const y3d = p.y + driftY;
  const z3d = p.z;

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;

  // Use smoothed mouse position
  const mx = _smoothMouseX;
  const my = _smoothMouseY;

  // Camera parameters (fall back to linear params if float-specific not set)
  const focalLength = Math.max(100, g.parallaxFloatFocalLength ?? g.parallaxLinearFocalLength ?? 400);
  const parallaxStrength = Math.max(0, g.parallaxFloatParallaxStrength ?? g.parallaxLinearParallaxStrength ?? 120);

  // Parallax offset (simulates camera pan)
  const offsetX = mx * parallaxStrength;
  const offsetY = my * parallaxStrength;

  // Project 3D position to 2D with parallax
  const scale = focalLength / (focalLength + z3d);
  const targetX = cx + (x3d + offsetX) * scale;
  const targetY = cy + (y3d + offsetY) * scale;

  // Update size based on depth
  const dotSizeMul = Math.max(0.1, Math.min(6.0, g.parallaxFloatDotSizeMul ?? g.parallaxLinearDotSizeMul ?? 1.8));
  const sizeMul = Number.isFinite(ball._parallaxSizeMul) ? ball._parallaxSizeMul : 1.0;
  const rawR = (g.R_MED || 20) * 0.32 * 2.4 * (g.DPR || 1) * dotSizeMul * sizeMul * scale;
  ball.r = clampRadiusToGlobalBounds(g, rawR);

  // Snap to smoothed position
  ball.x = targetX;
  ball.y = targetY;
  ball.vx = 0;
  ball.vy = 0;
}
