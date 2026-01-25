// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          PARALLAX (LINEAR) MODE                               ║
// ║              Perfect 3D cubic grid projected into 2D space                   ║
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

export function initializeParallaxLinear() {
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
  const gridX = getMobileAdjustedCount(Math.max(0, Math.min(40, Math.round(g.parallaxLinearGridX ?? 14))));
  const gridY = getMobileAdjustedCount(Math.max(0, Math.min(40, Math.round(g.parallaxLinearGridY ?? 10))));
  const gridZ = getMobileAdjustedCount(Math.max(0, Math.min(20, Math.round(g.parallaxLinearGridZ ?? 7))));
  if (gridX <= 0 || gridY <= 0 || gridZ <= 0) return;

  // Grid span: how much of the viewport the grid occupies in world space.
  // Use >1 to counter perspective shrink and visually reach the edges.
  const spanX = Math.max(0.2, Math.min(8.0, g.parallaxLinearSpanX ?? 1.35));
  const spanY = Math.max(0.2, Math.min(8.0, g.parallaxLinearSpanY ?? 1.35));
  const xMin = -0.5 * w * spanX;
  const yMin = -0.5 * h * spanY;
  const xStep = (w * spanX) / Math.max(1, gridX - 1);
  const yStep = (h * spanY) / Math.max(1, gridY - 1);

  // Z-depth range (how far back the grid extends)
  const zNear = Math.max(10, g.parallaxLinearZNear ?? 50);
  const zFar = Math.max(zNear + 100, g.parallaxLinearZFar ?? 800);
  const zStep = (zFar - zNear) / Math.max(1, gridZ - 1);

  // Camera/projection
  const focalLength = Math.max(80, g.parallaxLinearFocalLength ?? 420);

  const dotSizeMul = Math.max(0.1, Math.min(6.0, g.parallaxLinearDotSizeMul ?? 1.8));
  const baseR = (g.R_MED || 20) * 0.32 * 2.4 * (g.DPR || 1) * dotSizeMul;
  const varFrac = getModeSizeVarianceFrac(g, MODES.PARALLAX_LINEAR);

  // Create perfect 3D grid
  const centerX = w * 0.5;
  const centerY = h * 0.5;

  let idx = 0;
  // Render back-to-front: start with far (iz=gridZ-1) so near dots draw last (on top)
  for (let iz = gridZ - 1; iz >= 0; iz--) {
    const z = zNear + iz * zStep;
    const depthFactor = iz / Math.max(1, gridZ - 1); // 0 (near) to 1 (far)
    
    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        // 3D grid position (centered)
        const x3d = xMin + ix * xStep;
        const y3d = yMin + iy * yStep;
        const z3d = z;

        // Project to 2D (perspective projection)
        const scale = focalLength / (focalLength + z3d);
        const x2d = centerX + x3d * scale;
        const y2d = centerY + y3d * scale;

        // Size and depth-based opacity (fade over last ¼ of depth)
        const r = baseR * scale;
        const fadeStart = 0.75;
        const fadeRamp = depthFactor > fadeStart ? (depthFactor - fadeStart) / (1 - fadeStart) : 0;
        const alpha = 1.0 - fadeRamp * 0.85; // Opaque until 75% depth, then fade to 0.15

        const color = pickRandomColor();
        const ball = spawnBall(x2d, y2d, color);
        ball.r = clampRadiusToGlobalBounds(g, r);
        ball.vx = 0;
        ball.vy = 0;
        ball.alpha = alpha;
        ball._parallax3D = { x: x3d, y: y3d, z: z3d, baseScale: scale };
        ball._parallaxSizeMul = (varFrac <= 1e-6) ? 1.0 : (1 + (Math.random() * 2 - 1) * varFrac);
        ball._isParallax = true; // Skip all standard physics
        idx++;
      }
    }
  }
}

// Update smoothed mouse position (call once per frame, not per ball)
export function updateParallaxLinearMouse(dt) {
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
  // Default to 20 (very snappy) for linear mode to preserve original feel
  const easing = Math.max(0.5, Math.min(50, g.parallaxLinearMouseEasing ?? 20));
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

export function applyParallaxLinearForces(ball, dt) {
  if (!ball._parallax3D) return;

  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;

  // Use smoothed mouse position
  const mx = _smoothMouseX;
  const my = _smoothMouseY;

  // Camera parameters
  const focalLength = Math.max(100, g.parallaxLinearFocalLength ?? 400);
  const parallaxStrength = Math.max(0, g.parallaxLinearParallaxStrength ?? 120);

  // Apply mouse-driven camera rotation/pan
  const { x, y, z } = ball._parallax3D;
  
  // Parallax offset (simulates camera pan)
  const offsetX = mx * parallaxStrength;
  const offsetY = my * parallaxStrength;

  // Project 3D position to 2D with parallax
  const scale = focalLength / (focalLength + z);
  const targetX = cx + (x + offsetX) * scale;
  const targetY = cy + (y + offsetY) * scale;

  // Update size based on depth
  const dotSizeMul = Math.max(0.1, Math.min(6.0, g.parallaxLinearDotSizeMul ?? 1.8));
  const sizeMul = Number.isFinite(ball._parallaxSizeMul) ? ball._parallaxSizeMul : 1.0;
  const rawR = (g.R_MED || 20) * 0.32 * 2.4 * (g.DPR || 1) * dotSizeMul * sizeMul * scale;
  ball.r = clampRadiusToGlobalBounds(g, rawR);

  // Snap to smoothed position
  ball.x = targetX;
  ball.y = targetY;
  ball.vx = 0;
  ball.vy = 0;
}
