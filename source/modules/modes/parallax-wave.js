// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          PARALLAX (WAVE) MODE                                 ║
// ║       Dots arranged in a sine-wave pattern with depth and mouse parallax     ║
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

// Animation time accumulator
let _waveTime = 0;

export function initializeParallaxWave() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // Reset smoothed mouse state
  _smoothMouseX = 0;
  _smoothMouseY = 0;
  _mouseInitialized = false;
  _waveTime = 0;

  clearBalls();

  const w = canvas.width;
  const h = canvas.height;

  // Grid dimensions (number of dots in X and Z)
  const gridX = getMobileAdjustedCount(Math.max(4, Math.min(50, Math.round(g.parallaxWaveGridX ?? 20))));
  const gridZ = getMobileAdjustedCount(Math.max(2, Math.min(15, Math.round(g.parallaxWaveGridZ ?? 6))));
  if (gridX <= 0 || gridZ <= 0) return;

  // Grid span in world space
  const spanX = Math.max(1, Math.min(20.0, g.parallaxWaveSpanX ?? 12));
  const xMin = -0.5 * w * spanX;
  const xStep = (w * spanX) / Math.max(1, gridX - 1);

  // Z-depth range
  const zNear = Math.max(10, g.parallaxWaveZNear ?? 50);
  const zFar = Math.max(zNear + 100, g.parallaxWaveZFar ?? 600);
  const zStep = (zFar - zNear) / Math.max(1, gridZ - 1);

  // Wave parameters
  const waveAmplitude = Math.max(10, g.parallaxWaveAmplitude ?? 150);
  const waveFrequency = Math.max(0.1, g.parallaxWaveFrequency ?? 2.0);

  // Camera/projection
  const focalLength = Math.max(80, g.parallaxWaveFocalLength ?? 420);

  const dotSizeMul = Math.max(0.1, Math.min(6.0, g.parallaxWaveDotSizeMul ?? 2.0));
  const baseR = (g.R_MED || 20) * 0.32 * 2.4 * (g.DPR || 1) * dotSizeMul;
  const varFrac = getModeSizeVarianceFrac(g, MODES.PARALLAX_WAVE);

  const centerX = w * 0.5;
  const centerY = h * 0.5;

  let idx = 0;
  // Render back-to-front
  for (let iz = gridZ - 1; iz >= 0; iz--) {
    const z = zNear + iz * zStep;
    
    for (let ix = 0; ix < gridX; ix++) {
      // X position in world space
      const x3d = xMin + ix * xStep;
      
      // Y position follows a sine wave based on X
      const phase = (ix / Math.max(1, gridX - 1)) * Math.PI * 2 * waveFrequency;
      const y3d = Math.sin(phase) * waveAmplitude;
      
      const z3d = z;

      // Project to 2D
      const scale = focalLength / (focalLength + z3d);
      const x2d = centerX + x3d * scale;
      const y2d = centerY + y3d * scale;

      const r = baseR * scale;

      const color = pickRandomColor();
      const ball = spawnBall(x2d, y2d, color);
      ball.r = clampRadiusToGlobalBounds(g, r);
      ball.vx = 0;
      ball.vy = 0;
      ball.alpha = 1.0;
      
      // Store 3D position + wave parameters
      ball._parallax3D = {
        x: x3d,
        y: y3d,
        z: z3d,
        baseScale: scale,
        wavePhase: phase,
        wavePhaseOffset: Math.random() * Math.PI * 0.5  // Slight per-dot variation
      };
      
      ball._parallaxSizeMul = (varFrac <= 1e-6) ? 1.0 : (1 + (Math.random() * 2 - 1) * varFrac);
      ball._isParallax = true;
      idx++;
    }
  }
}

// Update smoothed mouse position and wave animation (call once per frame)
export function updateParallaxWaveMouse(dt) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // Advance wave animation time
  const waveSpeed = Math.max(0.1, g.parallaxWaveSpeed ?? 1.0);
  _waveTime += dt * waveSpeed;

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;
  
  // Target mouse position (normalized -1 to 1)
  let targetX = 0, targetY = 0;
  if (g.mouseInCanvas) {
    targetX = Math.max(-1, Math.min(1, (g.mouseX - cx) / (canvas.width * 0.5)));
    targetY = Math.max(-1, Math.min(1, (g.mouseY - cy) / (canvas.height * 0.5)));
  }

  // Mouse easing
  const easing = Math.max(0.5, Math.min(20, g.parallaxWaveMouseEasing ?? 4));
  const easeFactor = 1 - Math.exp(-easing * dt);

  if (!_mouseInitialized) {
    _smoothMouseX = targetX;
    _smoothMouseY = targetY;
    _mouseInitialized = true;
  } else {
    _smoothMouseX += (targetX - _smoothMouseX) * easeFactor;
    _smoothMouseY += (targetY - _smoothMouseY) * easeFactor;
  }
}

export function applyParallaxWaveForces(ball, dt) {
  if (!ball._parallax3D) return;

  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  const p = ball._parallax3D;

  // Wave parameters
  const waveAmplitude = Math.max(10, g.parallaxWaveAmplitude ?? 150);

  // Calculate animated Y position based on wave
  const animatedPhase = p.wavePhase + _waveTime * Math.PI * 2 + p.wavePhaseOffset;
  const y3d = Math.sin(animatedPhase) * waveAmplitude;

  const cx = canvas.width * 0.5;
  const cy = canvas.height * 0.5;

  // Use smoothed mouse position
  const mx = _smoothMouseX;
  const my = _smoothMouseY;

  // Camera parameters
  const focalLength = Math.max(100, g.parallaxWaveFocalLength ?? 420);
  const parallaxStrength = Math.max(0, g.parallaxWaveParallaxStrength ?? 200);

  // Parallax offset
  const offsetX = mx * parallaxStrength;
  const offsetY = my * parallaxStrength;

  // Project 3D position to 2D with parallax
  const scale = focalLength / (focalLength + p.z);
  const targetX = cx + (p.x + offsetX) * scale;
  const targetY = cy + (y3d + offsetY) * scale;

  // Update size
  const dotSizeMul = Math.max(0.1, Math.min(6.0, g.parallaxWaveDotSizeMul ?? 2.0));
  const sizeMul = Number.isFinite(ball._parallaxSizeMul) ? ball._parallaxSizeMul : 1.0;
  const rawR = (g.R_MED || 20) * 0.32 * 2.4 * (g.DPR || 1) * dotSizeMul * sizeMul * scale;
  ball.r = clampRadiusToGlobalBounds(g, rawR);

  // Snap to smoothed position
  ball.x = targetX;
  ball.y = targetY;
  ball.vx = 0;
  ball.vy = 0;
}
