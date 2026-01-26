// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          STATIC WALL RENDERING                              ║
// ║                                                                              ║
// ║  Simplified wall system - static rounded rectangle, no deformation.         ║
// ║  Wall impacts trigger CSS-based rumble on the container instead.            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { MODES } from '../core/constants.js';

// ═══════════════════════════════════════════════════════════════════════════════
// RUMBLE PRESETS - Different feel options for viewport shake
// Designed to feel like thick rubber walls absorbing impact
// ═══════════════════════════════════════════════════════════════════════════════
export const RUMBLE_PRESETS = {
  subtle: {
    label: 'Subtle',
    description: 'Barely perceptible micro-wobble',
    wallRumbleMax: 1.2,
    wallRumbleThreshold: 280,
    wallRumbleScale: 0.008,
    wallRumbleDecay: 0.82,
    wallRumbleImpactScale: 600
  },
  rubber: {
    label: 'Rubber',
    description: 'Thick rubber absorption (default)',
    wallRumbleMax: 1.8,
    wallRumbleThreshold: 220,
    wallRumbleScale: 0.012,
    wallRumbleDecay: 0.85,
    wallRumbleImpactScale: 700
  },
  soft: {
    label: 'Soft',
    description: 'Gentle cushioned feel',
    wallRumbleMax: 2.5,
    wallRumbleThreshold: 180,
    wallRumbleScale: 0.015,
    wallRumbleDecay: 0.88,
    wallRumbleImpactScale: 850
  },
  responsive: {
    label: 'Responsive',
    description: 'More noticeable feedback',
    wallRumbleMax: 3.5,
    wallRumbleThreshold: 140,
    wallRumbleScale: 0.02,
    wallRumbleDecay: 0.86,
    wallRumbleImpactScale: 1000
  }
};

// Modes that support viewport rumble
const RUMBLE_ENABLED_MODES = new Set([
  MODES.PIT,
  MODES.FLIES,
  MODES.WEIGHTLESS,
  MODES.PARTICLE_FOUNTAIN
]);

// Cached wall fill color (avoid per-frame getComputedStyle)
let CACHED_WALL_COLOR = null;

// ═══════════════════════════════════════════════════════════════════════════════
// WALL RENDERING - Static rounded rectangle
// ═══════════════════════════════════════════════════════════════════════════════
export function drawWalls(ctx, w, h) {
  const g = getGlobals();
  if (!ctx) return;

  const chromeColor = CACHED_WALL_COLOR || getChromeColorFromCSS();
  const DPR = g.DPR || 1;

  const rCssPx = (typeof g.getCanvasCornerRadius === 'function')
    ? g.getCanvasCornerRadius()
    : (g.cornerRadius ?? g.wallRadius ?? 0);
  const rCanvasPx = Math.max(0, (Number(rCssPx) || 0) * DPR);
  
  // Wall inset rule:
  // The wall inner edge (collision boundary) is defined ONLY by wall thickness.
  const wallThicknessPx = Math.max(0, (Number(g.wallThickness) || 0) * DPR);
  const insetPx = wallThicknessPx;
  
  const innerW = Math.max(1, w - (insetPx * 2));
  const innerH = Math.max(1, h - (insetPx * 2));
  const innerR = Math.max(0, Math.min(rCanvasPx, innerW * 0.5, innerH * 0.5));
  
  // Small padding beyond canvas edges for sub-pixel path rounding safety
  const pad = Math.max(2, 2 * DPR);

  ctx.save();
  ctx.fillStyle = chromeColor;
  ctx.beginPath();

  // Outer path (CW): canvas edges
  ctx.moveTo(-pad, -pad);
  ctx.lineTo(w + pad, -pad);
  ctx.lineTo(w + pad, h + pad);
  ctx.lineTo(-pad, h + pad);
  ctx.closePath();

  // Inner path (CCW): static rounded rectangle
  const x = insetPx;
  const y = insetPx;
  const r = innerR;
  
  ctx.moveTo(x + r, y + innerH);
  ctx.lineTo(x + innerW - r, y + innerH);
  ctx.arcTo(x + innerW, y + innerH, x + innerW, y + innerH - r, r);
  ctx.lineTo(x + innerW, y + r);
  ctx.arcTo(x + innerW, y, x + innerW - r, y, r);
  ctx.lineTo(x + r, y);
  ctx.arcTo(x, y, x, y + r, r);
  ctx.lineTo(x, y + innerH - r);
  ctx.arcTo(x, y + innerH, x + r, y + innerH, r);
  ctx.closePath();
  
  try {
    ctx.fill('evenodd');
  } catch (e) {
    ctx.fill();
  }

  ctx.restore();
}

// ═══════════════════════════════════════════════════════════════════════════════
// VIEWPORT RUMBLE SYSTEM - CSS-based full-page shake on wall impacts
// ═══════════════════════════════════════════════════════════════════════════════
// Applies transform to document.body so the entire viewport shakes.
// Only active in specific modes: pit, flies, weightless, particle-fountain.
// Uses smooth ease-out decay for natural stopping (no abrupt end).
// ═══════════════════════════════════════════════════════════════════════════════

// Rumble state
let currentRumbleIntensity = 0;
let targetRumbleIntensity = 0;  // For smooth interpolation
let rumbleDecayRAF = null;
let rumbleStartTime = 0;

/**
 * Check if current mode supports rumble.
 */
function isRumbleEnabledForCurrentMode() {
  const g = getGlobals();
  return RUMBLE_ENABLED_MODES.has(g.currentMode);
}

/**
 * Trigger viewport rumble on high-velocity wall impact.
 * Only triggers in modes that support it (pit, flies, weightless, particle-fountain).
 * 
 * @param {number} impactVelocity - Velocity of the impact (px/s)
 */
export function triggerWallRumble(impactVelocity) {
  const g = getGlobals();
  
  // Check if rumble is globally enabled
  if (g.wallRumbleEnabled === false) {
    return;
  }
  
  // Check if current mode supports rumble
  if (!isRumbleEnabledForCurrentMode()) {
    return;
  }
  
  const threshold = g.wallRumbleThreshold ?? 150;
  const maxRumble = g.wallRumbleMax ?? 3;
  const velocityScale = g.wallRumbleScale ?? 0.02;
  
  if (impactVelocity < threshold) {
    return;
  }
  
  // Calculate rumble intensity (0 to maxRumble)
  const excess = impactVelocity - threshold;
  const intensity = Math.min(maxRumble, excess * velocityScale);
  
  // Set target intensity (accumulate for rapid impacts, capped)
  targetRumbleIntensity = Math.min(maxRumble, targetRumbleIntensity + intensity);
  rumbleStartTime = performance.now();
  
  // Immediately jump toward target for responsiveness
  currentRumbleIntensity = Math.max(currentRumbleIntensity, targetRumbleIntensity * 0.7);
  
  applyRumble();
  scheduleRumbleDecay();
}

/**
 * Apply current rumble intensity to document.body via inline transform.
 * Uses smooth random direction changes for organic feel.
 */
let lastAngle = Math.random() * Math.PI * 2;

function applyRumble() {
  if (!document.body) return;
  
  // Smooth angle drift for organic feel (not jarring random jumps)
  lastAngle += (Math.random() - 0.5) * 1.2;
  const offsetX = Math.cos(lastAngle) * currentRumbleIntensity;
  const offsetY = Math.sin(lastAngle) * currentRumbleIntensity;
  
  // Apply transform directly to body
  document.body.style.transform = `translate(${offsetX.toFixed(2)}px, ${offsetY.toFixed(2)}px)`;
}

/**
 * Smooth ease-out function for natural decay.
 * @param {number} t - Progress 0-1
 * @returns {number} - Eased value 0-1
 */
function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

/**
 * Schedule rumble decay animation.
 * Uses smooth ease-out curve for natural stopping (no abrupt end).
 */
function scheduleRumbleDecay() {
  if (rumbleDecayRAF) return; // Already scheduled
  
  const g = getGlobals();
  const decayRate = g.wallRumbleDecay ?? 0.94;
  
  const decay = () => {
    // Decay target intensity
    targetRumbleIntensity *= decayRate;
    
    // Smooth interpolation toward target (ease-out feel)
    const smoothFactor = 0.15; // Lower = smoother transition
    currentRumbleIntensity += (targetRumbleIntensity - currentRumbleIntensity) * smoothFactor;
    
    // Very low threshold for smooth fade to zero
    if (currentRumbleIntensity < 0.02 && targetRumbleIntensity < 0.02) {
      // Smooth final fade
      currentRumbleIntensity = 0;
      targetRumbleIntensity = 0;
      if (document.body) {
        document.body.style.transform = '';
      }
      rumbleDecayRAF = null;
      return;
    }
    
    applyRumble();
    rumbleDecayRAF = requestAnimationFrame(decay);
  };
  
  rumbleDecayRAF = requestAnimationFrame(decay);
}

/**
 * Reset rumble state (call on mode change, etc.)
 */
export function resetWallRumble() {
  currentRumbleIntensity = 0;
  targetRumbleIntensity = 0;
  if (rumbleDecayRAF) {
    cancelAnimationFrame(rumbleDecayRAF);
    rumbleDecayRAF = null;
  }
  if (document.body) {
    document.body.style.transform = '';
  }
}

/**
 * Apply a rumble preset by name.
 * @param {string} presetName - One of: 'subtle', 'gentle', 'punchy', 'dramatic'
 * @param {Function} [updateConfig] - Optional callback to persist config changes
 */
export function applyRumblePreset(presetName, updateConfig) {
  const preset = RUMBLE_PRESETS[presetName];
  if (!preset) {
    console.warn(`[RUMBLE] Unknown preset: ${presetName}`);
    return;
  }
  
  const g = getGlobals();
  
  // Apply preset values to globals
  g.wallRumbleMax = preset.wallRumbleMax;
  g.wallRumbleThreshold = preset.wallRumbleThreshold;
  g.wallRumbleScale = preset.wallRumbleScale;
  g.wallRumbleDecay = preset.wallRumbleDecay;
  g.wallRumbleImpactScale = preset.wallRumbleImpactScale;
  
  // Call config update callback if provided
  if (typeof updateConfig === 'function') {
    updateConfig(preset);
  }
  
  console.log(`[RUMBLE] Applied preset: ${preset.label}`);
}

/**
 * Get list of available rumble presets.
 * @returns {Array<{id: string, label: string, description: string}>}
 */
export function getRumblePresets() {
  return Object.entries(RUMBLE_PRESETS).map(([id, preset]) => ({
    id,
    label: preset.label,
    description: preset.description
  }));
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
function getChromeColorFromCSS() {
  try {
    const root = document.documentElement;
    const body = document.body;
    const container = document.getElementById('bravia-balls');

    const read = (el, name) => {
      if (!el) return '';
      try {
        const value = getComputedStyle(el).getPropertyValue(name).trim();
        if (!value) {
          const resolved = getComputedStyle(el).getPropertyValue(name).trim();
          return resolved;
        }
        return value;
      } catch (e) {
        return '';
      }
    };

    // Try --wall-color first (theme-aware)
    let color = read(root, '--wall-color');
    if (!color) {
      const isDark = root.classList.contains('dark-mode') || body.classList.contains('dark-mode');
      if (isDark) {
        color = read(root, '--wall-color-dark') || read(root, '--frame-color-dark');
      } else {
        color = read(root, '--wall-color-light') || read(root, '--frame-color-light');
      }
    }
    
    if (!color) {
      color = read(body, '--wall-color') || read(container, '--wall-color');
    }
    
    return color || '#0a0a0a';
  } catch {
    return '#0a0a0a';
  }
}

export function updateChromeColor() {
  CACHED_WALL_COLOR = getChromeColorFromCSS();
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY STUBS - For backwards compatibility during transition
// These do nothing but prevent errors if called from other modules
// ═══════════════════════════════════════════════════════════════════════════════
export const wallState = {
  reset() {},
  step() {},
  hasAnyDeformation() { return false; },
  resetStepBudgets() {},
  clearPressureFrame() {},
  ringPhysics: { reset() {}, ensureGeometry() {} },
  ringRender: { reset() {}, ensureGeometry() {} }
};

export function registerWallImpact(wall, normalizedPos, intensity) {
  // Trigger rumble instead of deformation
  const g = getGlobals();
  const baseVel = (intensity || 0) * (g.wallRumbleImpactScale ?? 1000);
  triggerWallRumble(baseVel);
}

export function registerWallImpactAtPoint(x, y, intensity) {
  const g = getGlobals();
  const scale = g.wallRumbleImpactScale ?? 1000;
  const baseVel = (intensity || 0) * scale;
  triggerWallRumble(baseVel);
}

export function registerWallPressure() {}
export function registerWallPressureAtPoint() {}
export function applyWallPreset() {}
export function deriveWallParamsFromHighLevel() { return {}; }
