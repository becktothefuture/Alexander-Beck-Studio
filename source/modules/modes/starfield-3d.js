// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             3D STARFIELD MODE                                 ║
// ║         Direct canvas rendering - bypasses ball system entirely               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls } from '../core/state.js';
import { pickRandomColor } from '../visual/colors.js';

// Module-level star array (not balls, just data)
let _stars = [];
let _lastTime = 0;
const SPAN_MULTIPLIER = 4;

function createStar(w, h, zNear, zFar, spanX, spanY) {
  return {
    x: (Math.random() * 2 - 1) * w * spanX * 0.5,
    y: (Math.random() * 2 - 1) * h * spanY * 0.5,
    z: zNear + Math.random() * (zFar - zNear),
    color: pickRandomColor(),
    alpha: 0, // Start invisible for fade-in
    fadeState: 'fadingIn' // 'fadingIn', 'visible', 'fadingOut'
  };
}

export function initializeStarfield3D() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // Clear any existing balls (we don't use them)
  clearBalls();

  const w = canvas.width;
  const h = canvas.height;
  const count = Math.max(50, Math.min(500, Math.round(g.starfieldCount ?? 200)));
  const baseSpanX = Math.max(0.5, Math.min(4.0, g.starfieldSpanX ?? 1.5));
  const baseSpanY = Math.max(0.5, Math.min(4.0, g.starfieldSpanY ?? 1.2));
  const spanX = baseSpanX * SPAN_MULTIPLIER;
  const spanY = baseSpanY * SPAN_MULTIPLIER;
  const zNear = Math.max(20, g.starfieldZNear ?? 100);
  const zFar = Math.max(zNear + 200, g.starfieldZFar ?? 2000);

  // Create stars array (not balls)
  _stars = [];
  for (let i = 0; i < count; i++) {
    const star = createStar(w, h, zNear, zFar, spanX, spanY);
    star.fadeTimer = 0;
    _stars.push(star);
  }

  _lastTime = performance.now();
}

// Custom renderer - draws stars directly to canvas
export function renderStarfield3D(ctx) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas || _stars.length === 0) return;

  const now = performance.now();
  const dt = Math.min(0.1, (now - _lastTime) / 1000);
  _lastTime = now;

  const w = canvas.width;
  const h = canvas.height;
  const cx = w * 0.5;
  const cy = h * 0.5;

  // Config
  const baseSpanX = Math.max(0.5, Math.min(4.0, g.starfieldSpanX ?? 1.5));
  const baseSpanY = Math.max(0.5, Math.min(4.0, g.starfieldSpanY ?? 1.2));
  const spanX = baseSpanX * SPAN_MULTIPLIER;
  const spanY = baseSpanY * SPAN_MULTIPLIER;
  const zNear = Math.max(20, g.starfieldZNear ?? 100);
  const zFar = Math.max(zNear + 200, g.starfieldZFar ?? 2000);
  const focalLength = Math.max(100, g.starfieldFocalLength ?? 500);
  const speed = Math.max(10, g.starfieldSpeed ?? 400);
  const dotSizeMul = Math.max(0.2, Math.min(4.0, g.starfieldDotSizeMul ?? 1.0));
  const baseR = (g.R_MED || 20) * dotSizeMul * 2; // 2× base size requested

  // Vanishing point stays fixed at center (cursor ignored)
  const centerX = cx;
  const centerY = cy;

  // Fade duration from config (in seconds)
  const fadeDuration = Math.max(0, g.starfieldFadeDuration ?? 0.5);

  // Update and draw each star
  for (let i = 0; i < _stars.length; i++) {
    const star = _stars[i];
    const wasRecycled = star.z < zNear;

    // Advance toward camera
    star.z -= speed * dt;

    // Recycle when past camera
    if (star.z < zNear) {
      star.z = zFar + Math.random() * (zFar - zNear) * 0.3;
      star.x = (Math.random() * 2 - 1) * w * spanX * 0.5;
      star.y = (Math.random() * 2 - 1) * h * spanY * 0.5;
      star.color = pickRandomColor();
      star.alpha = 0;
      star.fadeState = 'fadingIn';
      star.fadeTimer = 0;
    }

    // Update fade state
    if (fadeDuration > 0) {
      // Initialize fade state if not set
      if (!star.fadeState) {
        star.fadeState = 'fadingIn';
        star.fadeTimer = 0;
      }
      if (star.fadeTimer === undefined) star.fadeTimer = 0;
      
      if (star.fadeState === 'fadingIn') {
        star.fadeTimer += dt;
        if (star.fadeTimer >= fadeDuration) {
          star.alpha = 1;
          star.fadeState = 'visible';
          star.fadeTimer = 0;
        } else {
          star.alpha = star.fadeTimer / fadeDuration;
        }
      } else if (star.fadeState === 'visible') {
        // Check if approaching recycle point (start fading out)
        const fadeOutStart = zNear + (zFar - zNear) * 0.1; // Start fading 10% before recycle
        if (star.z < fadeOutStart) {
          star.fadeState = 'fadingOut';
          star.fadeTimer = 0;
        } else {
          star.alpha = 1;
        }
      } else if (star.fadeState === 'fadingOut') {
        star.fadeTimer += dt;
        if (star.fadeTimer >= fadeDuration) {
          star.alpha = 0;
          star.fadeTimer = 0;
        } else {
          star.alpha = 1 - (star.fadeTimer / fadeDuration);
        }
      }
    } else {
      // No fade - instant visibility
      star.alpha = 1;
    }

    // Perspective projection with fixed center (mouse ignored)
    const scale = focalLength / (focalLength + star.z);
    const x2d = centerX + star.x * scale;
    const y2d = centerY + star.y * scale;
    // Keep radius constant regardless of distance (don't scale with perspective)
    const r = baseR;

    // Draw circle with alpha
    if (star.alpha > 0) {
      ctx.globalAlpha = star.alpha;
      ctx.beginPath();
      ctx.arc(x2d, y2d, r, 0, Math.PI * 2);
      ctx.fillStyle = star.color;
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
}

// No-op force applicator (we don't use balls)
export function applyStarfield3DForces(ball, dt) {}

// No-op updater
export function updateStarfield3D(renderDt) {}
