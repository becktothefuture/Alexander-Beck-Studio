// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                             3D STARFIELD MODE                                 ║
// ║         Direct canvas rendering - bypasses ball system entirely               ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals, clearBalls, getMobileAdjustedCount } from '../core/state.js';
import { getColorByIndex, pickRandomColorWithIndex } from '../visual/colors.js';
import { resolveDistanceFogOpacity } from '../visual/depth-fog.js';
import { resolveSimulationMaterialColorIndex } from '../../../palette/simulationPaletteContract.js';
import { drawSimulationBodyMaterial } from '../rendering/materials/simulation-body-material.js';

// Module-level star array (not balls, just data)
let _stars = [];
let _lastTime = 0;
let _paletteGeneration = -1;
const SPAN_MULTIPLIER = 1.7;
const STARFIELD_BASE_SIZE_MULTIPLIER = 1;
const STARFIELD_FAR_SIZE_RATIO = 0.68;
const STARFIELD_NEAR_SIZE_RATIO = 1;

function isMobileStarfield(g) {
  return Boolean(g.isMobile || g.isMobileViewport);
}

function resolveSpanMultiplier(g) {
  if (!isMobileStarfield(g)) return SPAN_MULTIPLIER;
  return Math.max(1, Math.min(3, Number(g.starfieldMobileSpanMultiplier ?? SPAN_MULTIPLIER)));
}

// Smoothed mouse state for parallax panning
let _smoothMouseX = 0;
let _smoothMouseY = 0;
let _mouseInitialized = false;
let _lastPointerSequence = null;

function createStar(w, h, zNear, zFar, spanX, spanY) {
  const { color, distributionIndex } = pickRandomColorWithIndex();
  return {
    x: (Math.random() * 2 - 1) * w * spanX * 0.5,
    y: (Math.random() * 2 - 1) * h * spanY * 0.5,
    z: zNear + Math.random() * (zFar - zNear),
    color,
    distributionIndex,
    visualScale: 1,
    alpha: 0, // Start invisible for fade-in
    fadeState: 'fadingIn' // 'fadingIn', 'visible', 'fadingOut'
  };
}

function syncStarfieldPalette(g) {
  const generation = Number(g.simulationPaletteGeneration) || 0;
  if (_paletteGeneration === generation) return;

  for (let index = 0; index < _stars.length; index += 1) {
    const star = _stars[index];
    const colorIndex = resolveSimulationMaterialColorIndex(
      star.distributionIndex,
      g.colorDistribution,
    );
    star.color = getColorByIndex(colorIndex);
  }
  _paletteGeneration = generation;
  if (g.canvas?.dataset) {
    g.canvas.dataset.starfieldPaletteGeneration = String(generation);
    g.canvas.dataset.starfieldPaletteColors = [...new Set(_stars.map((star) => star.color))].join(',');
  }
}

export function getStarfieldVisualTransitionCount() {
  return _stars.length;
}

export function setStarfieldVisualTransitionScale(index, scale) {
  const star = _stars[index];
  if (!star) return;
  star.visualScale = Math.max(0, Math.min(1, Number(scale) || 0));
}

export function initializeStarfield3D() {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas) return;

  // Clear any existing balls (we don't use them)
  clearBalls();

  const w = canvas.width;
  const h = canvas.height;
  const baseCount = Math.max(50, Math.min(500, Math.round(g.starfieldCount ?? 320)));
  const count = getMobileAdjustedCount(baseCount);
  const baseSpanX = Math.max(0.5, Math.min(4.0, g.starfieldSpanX ?? 1.5));
  const baseSpanY = Math.max(0.5, Math.min(4.0, g.starfieldSpanY ?? 1.2));
  const spanMultiplier = resolveSpanMultiplier(g);
  const spanX = baseSpanX * spanMultiplier;
  const spanY = baseSpanY * spanMultiplier;
  const zNear = Math.max(20, g.starfieldZNear ?? 100);
  const zFar = Math.max(zNear + 200, g.starfieldZFar ?? 2000);

  // Create stars array (not balls)
  _stars = [];
  for (let i = 0; i < count; i++) {
    const star = createStar(w, h, zNear, zFar, spanX, spanY);
    star.fadeTimer = 0;
    _stars.push(star);
  }
  _paletteGeneration = -1;
  syncStarfieldPalette(g);

  canvas.dataset.simulationBodyCount = String(count);
  canvas.dataset.starfieldSpanMultiplier = spanMultiplier.toFixed(2);

  _lastTime = performance.now();
  
  // Reset mouse state
  _smoothMouseX = 0;
  _smoothMouseY = 0;
  _mouseInitialized = false;
  _lastPointerSequence = null;
}

// Custom renderer - draws stars directly to canvas
export function renderStarfield3D(ctx) {
  const g = getGlobals();
  const canvas = g.canvas;
  if (!canvas || _stars.length === 0) return;
  syncStarfieldPalette(g);

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
  const spanMultiplier = resolveSpanMultiplier(g);
  const spanX = baseSpanX * spanMultiplier;
  const spanY = baseSpanY * spanMultiplier;
  const zNear = Math.max(20, g.starfieldZNear ?? 100);
  const zFar = Math.max(zNear + 200, g.starfieldZFar ?? 2000);
  const focalLength = Math.max(100, g.starfieldFocalLength ?? 500);
  const speed = Math.max(10, g.starfieldSpeed ?? 400);
  const baseR = (g.R_MED || 8.9) * STARFIELD_BASE_SIZE_MULTIPLIER;
  const fogStart = Math.max(0, Math.min(1, g.starfieldFogStart ?? 0.86));
  const fogMin = Math.max(0, Math.min(1, isMobileStarfield(g)
    ? g.starfieldMobileFogMin ?? g.starfieldFogMin ?? 0.16
    : g.starfieldFogMin ?? 0.16));

  // Mouse parallax panning
  const parallaxStrength = Math.max(0, g.starfieldParallaxStrength ?? 320);
  
  // Target mouse position (normalized -1 to 1)
  let targetX = 0, targetY = 0;
  const pointerInCanvas = g.pointerInCanvas ?? g.mouseInCanvas;
  const inputX = Number.isFinite(g.pointerX) ? g.pointerX : g.mouseX;
  const inputY = Number.isFinite(g.pointerY) ? g.pointerY : g.mouseY;
  const pointerSequence = g.pointerSequence || 0;
  const pointerValid = pointerInCanvas && Number.isFinite(inputX) && Number.isFinite(inputY);
  const mouseEasing = pointerValid ? 8 : 2.5;
  if (pointerValid) {
    targetX = Math.max(-1, Math.min(1, (inputX - cx) / (w * 0.5)));
    targetY = Math.max(-1, Math.min(1, (inputY - cy) / (h * 0.5)));
  }
  
  // Smooth mouse interpolation
  const easeFactor = 1 - Math.exp(-mouseEasing * dt);
  const shouldSeedPointer = pointerValid && (
    !_mouseInitialized
    || (g.pointerType === 'touch' && _lastPointerSequence !== pointerSequence)
  );
  if (shouldSeedPointer) {
    _smoothMouseX = targetX;
    _smoothMouseY = targetY;
    _mouseInitialized = true;
  } else {
    _smoothMouseX += (targetX - _smoothMouseX) * easeFactor;
    _smoothMouseY += (targetY - _smoothMouseY) * easeFactor;
  }
  if (pointerValid) _lastPointerSequence = pointerSequence;

  // Fade duration from config (in seconds)
  const fadeDuration = Math.max(0, g.starfieldFadeDuration ?? 0.5);

  // Update and draw each star
  for (let i = 0; i < _stars.length; i++) {
    const star = _stars[i];

    // Advance toward camera
    star.z -= speed * dt;

    // Recycle when past camera
    if (star.z < zNear) {
      star.z = zFar + Math.random() * (zFar - zNear) * 0.3;
      star.x = (Math.random() * 2 - 1) * w * spanX * 0.5;
      star.y = (Math.random() * 2 - 1) * h * spanY * 0.5;
      const { color, distributionIndex } = pickRandomColorWithIndex();
      star.color = color;
      star.distributionIndex = distributionIndex;
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

    // Perspective projection with mouse parallax offset
    const scale = focalLength / (focalLength + star.z);
    const offsetX = _smoothMouseX * parallaxStrength * scale;
    const offsetY = _smoothMouseY * parallaxStrength * scale;
    const x2d = cx + (star.x + offsetX) * scale;
    const y2d = cy + (star.y + offsetY) * scale;
    const depthRatio = Math.max(0, Math.min(1, 1 - ((star.z - zNear) / Math.max(1, zFar - zNear))));
    const sizeRatio = STARFIELD_FAR_SIZE_RATIO + (STARFIELD_NEAR_SIZE_RATIO - STARFIELD_FAR_SIZE_RATIO) * depthRatio;
    const visualScale = Math.max(0, Math.min(1, star.visualScale ?? 1));
    const r = baseR * sizeRatio * visualScale;
    const fogOpacity = resolveDistanceFogOpacity(depthRatio, { fogStart, fogMin });
    const drawAlpha = star.alpha * fogOpacity;

    // Draw circle with alpha
    if (r > 0.05 && drawAlpha > 0.001) {
      ctx.globalAlpha = drawAlpha;
      if (!drawSimulationBodyMaterial(
        ctx,
        star.color,
        x2d,
        y2d,
        r,
        g.isDarkMode ? 'dark' : 'light',
      )) {
        ctx.beginPath();
        ctx.arc(x2d, y2d, r, 0, Math.PI * 2);
        ctx.fillStyle = star.color;
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
  }
}

// No-op force applicator (we don't use balls)
export function applyStarfield3DForces(ball, dt) {
  void ball;
  void dt;
}

// No-op updater
export function updateStarfield3D(renderDt) {
  void renderDt;
}
