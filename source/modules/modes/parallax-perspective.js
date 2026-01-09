// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                       PARALLAX (PERSPECTIVE) MODE                             ║
// ║              3D grid with randomness (jittered cubic lattice)                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { pickRandomColor } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { getModeSizeVarianceFrac, clampRadiusToGlobalBounds } from '../utils/ball-sizing.js';

// NOTE: Preset applier is in control-registry.js to avoid circular dependency

export function initializeParallaxPerspective() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  clearBalls();

  const w = canvas.width;
  const h = canvas.height;

  // Grid dimensions
  const gridX = getMobileAdjustedCount(Math.max(0, Math.min(50, Math.round(g.parallaxPerspectiveGridX ?? 16))));
  const gridY = getMobileAdjustedCount(Math.max(0, Math.min(50, Math.round(g.parallaxPerspectiveGridY ?? 12))));
  const gridZ = getMobileAdjustedCount(Math.max(0, Math.min(25, Math.round(g.parallaxPerspectiveGridZ ?? 8))));
  if (gridX <= 0 || gridY <= 0 || gridZ <= 0) return;

  // Grid span (viewport fill in world space)
  const spanX = Math.max(0.2, Math.min(3.0, g.parallaxPerspectiveSpanX ?? 1.45));
  const spanY = Math.max(0.2, Math.min(3.0, g.parallaxPerspectiveSpanY ?? 1.45));
  const xMin = -0.5 * w * spanX;
  const yMin = -0.5 * h * spanY;
  const xStep = (w * spanX) / Math.max(1, gridX - 1);
  const yStep = (h * spanY) / Math.max(1, gridY - 1);

  // Z-depth range
  const zNear = Math.max(10, g.parallaxPerspectiveZNear ?? 40);
  const zFar = Math.max(zNear + 100, g.parallaxPerspectiveZFar ?? 1200);
  const zStep = (zFar - zNear) / Math.max(1, gridZ - 1);

  // Randomness factor (0 = perfect grid, 1 = full jitter)
  const randomness = Math.max(0, Math.min(1, g.parallaxPerspectiveRandomness ?? 0.6));

  // Camera
  const focalLength = Math.max(80, g.parallaxPerspectiveFocalLength ?? 420);

  const dotSizeMul = Math.max(0.1, Math.min(6.0, g.parallaxPerspectiveDotSizeMul ?? 1.8));
  const baseR = (g.R_MED || 20) * 0.30 * 2.0 * (g.DPR || 1) * dotSizeMul;
  const varFrac = getModeSizeVarianceFrac(g, MODES.PARALLAX_PERSPECTIVE);
  const centerX = w * 0.5;
  const centerY = h * 0.5;

  let idx = 0;
  // Render back-to-front: start with far (iz=gridZ-1) so near dots draw last (on top)
  for (let iz = gridZ - 1; iz >= 0; iz--) {
    const zBase = zNear + iz * zStep;
    const depthFactor = iz / Math.max(1, gridZ - 1);
    
    for (let iy = 0; iy < gridY; iy++) {
      for (let ix = 0; ix < gridX; ix++) {
        // Perfect grid position
        const x3dGrid = xMin + ix * xStep;
        const y3dGrid = yMin + iy * yStep;
        const z3dGrid = zBase;

        // Apply randomness jitter
        const jitterX = (Math.random() - 0.5) * xStep * randomness;
        const jitterY = (Math.random() - 0.5) * yStep * randomness;
        const jitterZ = (Math.random() - 0.5) * zStep * randomness * 0.5;

        const x3d = x3dGrid + jitterX;
        const y3d = y3dGrid + jitterY;
        const z3d = z3dGrid + jitterZ;

        // Perspective projection
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
        ball._parallax3D = { x: x3d, y: y3d, z: z3d, baseScale: scale };
        ball._parallaxSizeMul = (varFrac <= 1e-6) ? 1.0 : (1 + (Math.random() * 2 - 1) * varFrac);
        ball._isParallax = true; // Skip all standard physics
        ball._idlePhase = Math.random() * TAU;
        ball._idleSpeed = 0.35 + Math.random() * 0.25;
        idx++;
      }
    }
  }
}

export function applyParallaxPerspectiveForces(ball, dt) {
  if (!ball._parallax3D) return;

  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // Mouse offset
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  let mx = 0, my = 0;
  
  if (g.mouseInCanvas) {
    mx = Math.max(-1, Math.min(1, (g.mouseX - cx) / (canvas.width * 0.5)));
    my = Math.max(-1, Math.min(1, (g.mouseY - cy) / (canvas.height * 0.5)));
  }

  // Camera
  const focalLength = Math.max(100, g.parallaxPerspectiveFocalLength ?? 400);
  const parallaxStrength = Math.max(0, g.parallaxPerspectiveParallaxStrength ?? 150);
  const idleJitter = g.prefersReducedMotion ? 0 : Math.max(0, g.parallaxPerspectiveIdleJitter ?? 0);

  // Parallax offset
  const { x, y, z } = ball._parallax3D;
  const offsetX = mx * parallaxStrength;
  const offsetY = my * parallaxStrength;

  const now = performance.now() * 0.001;
  const idleSpeed = Number.isFinite(ball._idleSpeed) ? ball._idleSpeed : 0.4;
  const phase = ball._idlePhase || 0;
  const idleX = idleJitter ? Math.cos(now * idleSpeed + phase) * idleJitter : 0;
  const idleY = idleJitter ? Math.sin(now * (idleSpeed * 0.9) + phase * 1.3) * idleJitter * 0.85 : 0;

  // Project with parallax
  const scale = focalLength / (focalLength + z);
  const targetX = cx + (x + offsetX + idleX) * scale;
  const targetY = cy + (y + offsetY + idleY) * scale;

  // Update size
  const dotSizeMul = Math.max(0.1, Math.min(6.0, g.parallaxPerspectiveDotSizeMul ?? 1.8));
  const sizeMul = Number.isFinite(ball._parallaxSizeMul) ? ball._parallaxSizeMul : 1.0;
  const rawR = (g.R_MED || 20) * 0.30 * 2.0 * (g.DPR || 1) * dotSizeMul * sizeMul * scale;
  ball.r = clampRadiusToGlobalBounds(g, rawR);

  // No easing: snap directly to cursor-driven projection
  ball.x = targetX;
  ball.y = targetY;
  ball.vx = 0;
  ball.vy = 0;
}
