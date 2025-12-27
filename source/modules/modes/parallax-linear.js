// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          PARALLAX (LINEAR) MODE                               ║
// ║              Perfect 3D cubic grid projected into 2D space                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { spawnBall } from '../physics/spawn.js';
import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { pickRandomColor } from '../visual/colors.js';
import { MODES } from '../core/constants.js';
import { getModeSizeVarianceFrac, clampRadiusToGlobalBounds } from '../utils/ball-sizing.js';

export function initializeParallaxLinear() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

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
  const spanX = Math.max(0.2, Math.min(3.0, g.parallaxLinearSpanX ?? 1.35));
  const spanY = Math.max(0.2, Math.min(3.0, g.parallaxLinearSpanY ?? 1.35));
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
        idx++;
      }
    }
  }
}

export function applyParallaxLinearForces(ball, dt) {
  if (!ball._parallax3D) return;

  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // Mouse offset (normalized -1 to 1)
  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  let mx = 0, my = 0;
  
  if (g.mouseInCanvas) {
    mx = Math.max(-1, Math.min(1, (g.mouseX - cx) / (canvas.width * 0.5)));
    my = Math.max(-1, Math.min(1, (g.mouseY - cy) / (canvas.height * 0.5)));
  }

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

  // No easing: snap directly to cursor-driven projection
  ball.x = targetX;
  ball.y = targetY;
  ball.vx = 0;
  ball.vy = 0;
}
