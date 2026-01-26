// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                     CENTRALIZED CONTROL REGISTRY                             ║
// ║        Single source of truth for all panel controls                         ║
// ║        Supports visibility toggling and dynamic HTML generation              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { PARALLAX_LINEAR_PRESETS, NARRATIVE_MODE_SEQUENCE, NARRATIVE_CHAPTER_TITLES, MODES } from '../core/constants.js';
import { applyNoiseSystem } from '../visual/noise-system.js';
import { resetWallRumble } from '../physics/wall-state.js';

// Will be set by main.js to avoid circular dependency
let applyVisualCSSVars = null;
export function setApplyVisualCSSVars(fn) {
  applyVisualCSSVars = fn;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL SHADOW CSS UPDATE
// Dynamically updates box-shadow on #bravia-balls::after via CSS custom properties
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (e.g., '#ffffff' or '#fff')
 * @returns {{r: number, g: number, b: number}} RGB values (0-255)
 */
function hexToRgb(hex) {
  // Remove # if present
  hex = hex.replace(/^#/, '');
  
  // Handle 3-character hex
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  
  const num = parseInt(hex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function updateWallShadowCSS(g) {
  const container = document.getElementById('bravia-balls');
  if (!container) return;
  
  // ═══ CORE PARAMETERS ═══
  const angle = g.wallShadowAngle ?? 160;
  const distance = g.wallShadowDistance ?? 10;
  const layers = Math.max(1, Math.min(12, Math.round(g.wallShadowLayers ?? 5)));
  
  // ═══ OUTSET (external shadow) PARAMETERS ═══
  const outsetIntensity = g.wallShadowOutsetIntensity ?? 1.0;
  const outsetOpacityBase = g.wallShadowOutsetOpacity ?? 0.25;
  const outsetBlurMin = g.wallShadowOutsetBlurMin ?? 4;
  const outsetBlurMax = g.wallShadowOutsetBlurMax ?? 120;
  const outsetSpreadMin = g.wallShadowOutsetSpreadMin ?? 0;
  const outsetSpreadMax = g.wallShadowOutsetSpreadMax ?? 30;
  
  // ═══ INSET (vignette) PARAMETERS ═══
  const insetIntensity = g.wallShadowInsetIntensity ?? 0.8;
  const insetOpacityBase = g.wallShadowInsetOpacity ?? 0.15;
  const insetBlurMin = g.wallShadowInsetBlurMin ?? 8;
  const insetBlurMax = g.wallShadowInsetBlurMax ?? 100;
  const insetSpreadMin = g.wallShadowInsetSpreadMin ?? 0;
  const insetSpreadMax = g.wallShadowInsetSpreadMax ?? 20;
  const insetLayerRatio = g.wallShadowInsetLayerRatio ?? 0.6;
  
  // ═══ FALLOFF CURVE ═══
  const falloffCurve = g.wallShadowFalloffCurve ?? 2.0;
  const falloffFactor = g.wallShadowFalloffFactor ?? 0.7;
  
  // Calculate directional offset from angle
  const angleRad = (angle + 180) * Math.PI / 180;
  const offsetX = Math.sin(angleRad) * distance;
  const offsetY = -Math.cos(angleRad) * distance;
  
  // Check if dark mode and get shadow color
  const isDark = document.body.classList.contains('dark-mode');
  const colorHex = isDark 
    ? (g.wallShadowColorDark ?? '#000000')
    : (g.wallShadowColorLight ?? '#ffffff');
  const rgb = hexToRgb(colorHex);
  const rgbStr = `${rgb.r},${rgb.g},${rgb.b}`;
  
  // ═══ MODE-SPECIFIC INTENSITY ═══
  // Light mode needs higher opacity because light-on-light has low contrast
  // Dark mode shadows are naturally visible (dark-on-dark creates depth)
  const lightModeBoost = g.wallShadowLightModeBoost ?? 3.0;
  const modeMultiplier = isDark ? 1.0 : lightModeBoost;
  
  const shadows = [];
  
  // ═══ OUTSET SHADOWS (projected onto wall) ═══
  for (let i = 0; i < layers; i++) {
    const t = layers === 1 ? 0 : i / (layers - 1); // 0 to 1 progress
    
    // Progressive offset (closer layers have less offset)
    const layerOffset = 0.15 + (t * 0.85);
    const ox = (offsetX * layerOffset).toFixed(1);
    const oy = (offsetY * layerOffset).toFixed(1);
    
    // Progressive blur (exponential growth)
    const blurRange = outsetBlurMax - outsetBlurMin;
    const layerBlur = (outsetBlurMin + (t * t * blurRange)).toFixed(1);
    
    // Progressive spread
    const spreadRange = outsetSpreadMax - outsetSpreadMin;
    const layerSpread = (outsetSpreadMin + (t * spreadRange)).toFixed(1);
    
    // Configurable opacity falloff with mode-specific boost
    const falloffMult = Math.pow(1 - t * falloffFactor, falloffCurve);
    const rawOpacity = outsetOpacityBase * falloffMult * outsetIntensity * modeMultiplier;
    const layerOpacity = Math.min(1, rawOpacity).toFixed(4); // Clamp to max 1.0
    
    shadows.push(`${ox}px ${oy}px ${layerBlur}px ${layerSpread}px rgba(${rgbStr}, ${layerOpacity})`);
  }
  
  // ═══ INSET SHADOWS (interior vignette) ═══
  const insetLayers = Math.max(1, Math.round(layers * insetLayerRatio));
  for (let i = 0; i < insetLayers; i++) {
    const t = insetLayers === 1 ? 0 : i / (insetLayers - 1);
    
    // Inset offset (subtle directional)
    const layerOffset = 0.1 + (t * 0.4);
    const ox = (offsetX * layerOffset).toFixed(1);
    const oy = (offsetY * layerOffset).toFixed(1);
    
    // Progressive blur
    const blurRange = insetBlurMax - insetBlurMin;
    const layerBlur = (insetBlurMin + (t * t * blurRange)).toFixed(1);
    
    // Progressive spread
    const spreadRange = insetSpreadMax - insetSpreadMin;
    const layerSpread = (insetSpreadMin + (t * spreadRange)).toFixed(1);
    
    // Configurable opacity falloff with mode-specific boost
    const falloffMult = Math.pow(1 - t * falloffFactor * 0.85, falloffCurve);
    const rawOpacity = insetOpacityBase * falloffMult * insetIntensity * modeMultiplier;
    const layerOpacity = Math.min(1, rawOpacity).toFixed(4); // Clamp to max 1.0
    
    shadows.push(`inset ${ox}px ${oy}px ${layerBlur}px ${layerSpread}px rgba(${rgbStr}, ${layerOpacity})`);
  }
  
  const shadowStr = shadows.join(', ');
  
  // Apply to the ::after pseudo-element via a style override
  container.style.setProperty('--wall-shadow-override', shadowStr);
  
  // Add a style tag if not exists to use the override
  let styleTag = document.getElementById('wall-shadow-override-style');
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = 'wall-shadow-override-style';
    styleTag.textContent = `
      #bravia-balls::after {
        box-shadow: var(--wall-shadow-override) !important;
      }
    `;
    document.head.appendChild(styleTag);
  }
}

// Export for initialization
export { updateWallShadowCSS };

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL VISIBILITY STATE
// Which controls are visible in the panel (persisted to localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

const VISIBILITY_STORAGE_KEY = 'panel_control_visibility';

let controlVisibility = {};

function loadVisibility() {
  try {
    const stored = localStorage.getItem(VISIBILITY_STORAGE_KEY);
    if (stored) controlVisibility = JSON.parse(stored);
  } catch (e) {
    controlVisibility = {};
  }
}

function saveVisibility() {
  try {
    localStorage.setItem(VISIBILITY_STORAGE_KEY, JSON.stringify(controlVisibility));
  } catch (e) {}
}

export function setControlVisible(id, visible) {
  controlVisibility[id] = visible;
  saveVisibility();
}

export function isControlVisible(id) {
  // Default to true if not specified
  return controlVisibility[id] !== false;
}

export function getVisibilityState() {
  return { ...controlVisibility };
}

export function resetVisibility() {
  controlVisibility = {};
  saveVisibility();
}

// Initialize visibility state
loadVisibility();

// ═══════════════════════════════════════════════════════════════════════════════
// PANEL SCOPES (MASTER vs HOME)
// ═══════════════════════════════════════════════════════════════════════════════

export const MASTER_GROUPS = [
  {
    id: 'global',
    title: 'Global',
    icon: '🌐',
    sections: [
      'colors',
      'colorDistribution',
      'noise',
      'uiSpacing',
      'cursor',
      'trail',
      'links',
      'scene'
    ]
  },
  {
    id: 'simulations',
    title: 'Simulations',
    icon: '🧪',
    sections: [
      'liteMode',
      'physics',
      'balls',
      'wall',
      'simulationOverlay',
      'critters',
      'pit',
      'flies',
      'water',
      'vortex',
      'magnetic',
      'bubbles',
      'kaleidoscope3',
      'sphere3d',
      'cube3d',
      'neural',
      'parallaxLinear',
      'parallaxFloat',
      'starfield3d',
      'elasticCenter',
      'dvdLogo',
      'particleFountain',
      'weightless'
    ]
  },
  {
    id: 'browserTransition',
    title: 'Browser & Transition',
    icon: '🧭',
    sections: [
      'environment',
      'entrance',
      'overlay'
    ]
  }
];

export const MASTER_SECTION_KEYS = MASTER_GROUPS.flatMap(group => group.sections);

// Category groupings for visual chunking in the panel
const SECTION_CATEGORIES = {
  'liteMode': 'PERFORMANCE',
  'physics': 'MATERIAL WORLD',
  'wall': 'MATERIAL WORLD',
  'balls': 'MATERIAL WORLD',

  'colorDistribution': 'LOOK & PALETTE',
  'colors': 'LOOK & PALETTE',
  'noise': 'LOOK & PALETTE',

  'cursor': 'INTERACTION',
  'trail': 'INTERACTION',
  'links': 'INTERACTION',

  'scene': 'MOTION',
  'sphere3d': 'MOTION',
  'cube3d': 'MOTION',
  'starfield3d': 'MOTION',
  'cloudHelix': 'MOTION',
  'entrance': 'MOTION',

  'overlay': 'DEPTH & LAYOUT',
  'simulationOverlay': 'DEPTH & LAYOUT',
  'layout': 'DEPTH & LAYOUT',
  'uiSpacing': 'DEPTH & LAYOUT',

  'sound': 'SOUND',
  'environment': 'ENVIRONMENT'
};

// ═══════════════════════════════════════════════════════════════════════════════
// PRESET APPLIERS (avoid circular dependencies by keeping them here)
// ═══════════════════════════════════════════════════════════════════════════════

export function applyParallaxLinearPreset(presetName, reinit = true) {
  const preset = PARALLAX_LINEAR_PRESETS[presetName];
  if (!preset) return;

  const g = getGlobals();
  for (const [key, val] of Object.entries(preset)) {
    if (key === 'label') continue;
    if (g[key] !== undefined) g[key] = val;
  }
  g.parallaxLinearPreset = presetName;

  if (reinit) {
    import('../modes/mode-controller.js').then(({ resetCurrentMode }) => resetCurrentMode());
  }

  try { syncSlidersToState(); } catch (e) {}
  console.log(`Applied parallax linear preset: ${preset.label}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL SHADOW PRESETS - Realistic shadow configurations
// High layer counts + smooth falloff curves = no banding
// Progressive blur increases naturally with distance from edge
// ═══════════════════════════════════════════════════════════════════════════════

export const WALL_SHADOW_PRESETS = {
  // 1. Barely-there ambient occlusion
  subtle: {
    label: 'Subtle Ambient',
    wallShadowLayers: 6,
    wallShadowAngle: 160,
    wallShadowDistance: 4,
    wallShadowFalloffCurve: 2.5,
    wallShadowFalloffFactor: 0.85,
    wallShadowOutsetIntensity: 0.4,
    wallShadowOutsetOpacity: 0.08,
    wallShadowOutsetBlurMin: 2,
    wallShadowOutsetBlurMax: 40,
    wallShadowOutsetSpreadMin: 0,
    wallShadowOutsetSpreadMax: 8,
    wallShadowInsetIntensity: 0.3,
    wallShadowInsetOpacity: 0.06,
    wallShadowInsetLayerRatio: 0.5,
    wallShadowInsetBlurMin: 4,
    wallShadowInsetBlurMax: 50,
    wallShadowInsetSpreadMin: 0,
    wallShadowInsetSpreadMax: 10,
    wallShadowLightModeBoost: 5.0  // High boost for subtle effect to be visible
  },

  // 2. Soft diffuse light (overcast day)
  softDiffuse: {
    label: 'Soft Diffuse',
    wallShadowLayers: 8,
    wallShadowAngle: 180,
    wallShadowDistance: 6,
    wallShadowFalloffCurve: 2.2,
    wallShadowFalloffFactor: 0.75,
    wallShadowOutsetIntensity: 0.7,
    wallShadowOutsetOpacity: 0.12,
    wallShadowOutsetBlurMin: 6,
    wallShadowOutsetBlurMax: 80,
    wallShadowOutsetSpreadMin: 0,
    wallShadowOutsetSpreadMax: 15,
    wallShadowInsetIntensity: 0.6,
    wallShadowInsetOpacity: 0.10,
    wallShadowInsetLayerRatio: 0.6,
    wallShadowInsetBlurMin: 8,
    wallShadowInsetBlurMax: 70,
    wallShadowInsetSpreadMin: 0,
    wallShadowInsetSpreadMax: 12,
    wallShadowLightModeBoost: 4.0
  },

  // 3. Natural window light (realistic daylight)
  naturalDaylight: {
    label: 'Natural Daylight',
    wallShadowLayers: 10,
    wallShadowAngle: 135,
    wallShadowDistance: 12,
    wallShadowFalloffCurve: 2.0,
    wallShadowFalloffFactor: 0.70,
    wallShadowOutsetIntensity: 1.0,
    wallShadowOutsetOpacity: 0.18,
    wallShadowOutsetBlurMin: 4,
    wallShadowOutsetBlurMax: 100,
    wallShadowOutsetSpreadMin: 0,
    wallShadowOutsetSpreadMax: 25,
    wallShadowInsetIntensity: 0.8,
    wallShadowInsetOpacity: 0.12,
    wallShadowInsetLayerRatio: 0.6,
    wallShadowInsetBlurMin: 6,
    wallShadowInsetBlurMax: 80,
    wallShadowInsetSpreadMin: 0,
    wallShadowInsetSpreadMax: 18,
    wallShadowLightModeBoost: 3.0
  },

  // 4. Dramatic directional (strong single source)
  dramatic: {
    label: 'Dramatic',
    wallShadowLayers: 12,
    wallShadowAngle: 145,
    wallShadowDistance: 20,
    wallShadowFalloffCurve: 1.8,
    wallShadowFalloffFactor: 0.65,
    wallShadowOutsetIntensity: 1.4,
    wallShadowOutsetOpacity: 0.28,
    wallShadowOutsetBlurMin: 3,
    wallShadowOutsetBlurMax: 140,
    wallShadowOutsetSpreadMin: 0,
    wallShadowOutsetSpreadMax: 35,
    wallShadowInsetIntensity: 1.2,
    wallShadowInsetOpacity: 0.20,
    wallShadowInsetLayerRatio: 0.7,
    wallShadowInsetBlurMin: 5,
    wallShadowInsetBlurMax: 100,
    wallShadowInsetSpreadMin: 0,
    wallShadowInsetSpreadMax: 25,
    wallShadowLightModeBoost: 2.5
  },

  // 5. Floating / levitation effect (object lifted off surface)
  floating: {
    label: 'Floating',
    wallShadowLayers: 10,
    wallShadowAngle: 180,
    wallShadowDistance: 25,
    wallShadowFalloffCurve: 2.8,
    wallShadowFalloffFactor: 0.80,
    wallShadowOutsetIntensity: 1.1,
    wallShadowOutsetOpacity: 0.15,
    wallShadowOutsetBlurMin: 8,
    wallShadowOutsetBlurMax: 180,
    wallShadowOutsetSpreadMin: -5,
    wallShadowOutsetSpreadMax: 40,
    wallShadowInsetIntensity: 0.4,
    wallShadowInsetOpacity: 0.08,
    wallShadowInsetLayerRatio: 0.4,
    wallShadowInsetBlurMin: 10,
    wallShadowInsetBlurMax: 60,
    wallShadowInsetSpreadMin: 0,
    wallShadowInsetSpreadMax: 8,
    wallShadowLightModeBoost: 3.5
  },

  // 6. Deep recess (object sunk into surface)
  deepRecess: {
    label: 'Deep Recess',
    wallShadowLayers: 10,
    wallShadowAngle: 160,
    wallShadowDistance: 8,
    wallShadowFalloffCurve: 2.2,
    wallShadowFalloffFactor: 0.70,
    wallShadowOutsetIntensity: 0.5,
    wallShadowOutsetOpacity: 0.10,
    wallShadowOutsetBlurMin: 4,
    wallShadowOutsetBlurMax: 60,
    wallShadowOutsetSpreadMin: 0,
    wallShadowOutsetSpreadMax: 12,
    wallShadowInsetIntensity: 1.8,
    wallShadowInsetOpacity: 0.25,
    wallShadowInsetLayerRatio: 1.0,
    wallShadowInsetBlurMin: 4,
    wallShadowInsetBlurMax: 120,
    wallShadowInsetSpreadMin: 0,
    wallShadowInsetSpreadMax: 30,
    wallShadowLightModeBoost: 2.5
  },

  // 7. Spotlight (sharp theatrical lighting)
  spotlight: {
    label: 'Spotlight',
    wallShadowLayers: 12,
    wallShadowAngle: 135,
    wallShadowDistance: 30,
    wallShadowFalloffCurve: 1.5,
    wallShadowFalloffFactor: 0.55,
    wallShadowOutsetIntensity: 1.6,
    wallShadowOutsetOpacity: 0.35,
    wallShadowOutsetBlurMin: 2,
    wallShadowOutsetBlurMax: 200,
    wallShadowOutsetSpreadMin: -2,
    wallShadowOutsetSpreadMax: 50,
    wallShadowInsetIntensity: 1.0,
    wallShadowInsetOpacity: 0.18,
    wallShadowInsetLayerRatio: 0.5,
    wallShadowInsetBlurMin: 3,
    wallShadowInsetBlurMax: 90,
    wallShadowInsetSpreadMin: 0,
    wallShadowInsetSpreadMax: 20,
    wallShadowLightModeBoost: 2.0  // Lower boost - already strong
  },

  // 8. Overcast (very soft, almost directionless)
  overcast: {
    label: 'Overcast',
    wallShadowLayers: 8,
    wallShadowAngle: 180,
    wallShadowDistance: 3,
    wallShadowFalloffCurve: 3.0,
    wallShadowFalloffFactor: 0.90,
    wallShadowOutsetIntensity: 0.6,
    wallShadowOutsetOpacity: 0.10,
    wallShadowOutsetBlurMin: 10,
    wallShadowOutsetBlurMax: 100,
    wallShadowOutsetSpreadMin: 2,
    wallShadowOutsetSpreadMax: 20,
    wallShadowInsetIntensity: 0.5,
    wallShadowInsetOpacity: 0.08,
    wallShadowInsetLayerRatio: 0.6,
    wallShadowInsetBlurMin: 12,
    wallShadowInsetBlurMax: 80,
    wallShadowInsetSpreadMin: 2,
    wallShadowInsetSpreadMax: 15,
    wallShadowLightModeBoost: 4.5
  },

  // 9. Golden hour (warm, long shadows)
  goldenHour: {
    label: 'Golden Hour',
    wallShadowLayers: 12,
    wallShadowAngle: 110,
    wallShadowDistance: 35,
    wallShadowFalloffCurve: 1.8,
    wallShadowFalloffFactor: 0.60,
    wallShadowOutsetIntensity: 1.2,
    wallShadowOutsetOpacity: 0.22,
    wallShadowOutsetBlurMin: 3,
    wallShadowOutsetBlurMax: 180,
    wallShadowOutsetSpreadMin: 0,
    wallShadowOutsetSpreadMax: 45,
    wallShadowInsetIntensity: 0.9,
    wallShadowInsetOpacity: 0.15,
    wallShadowInsetLayerRatio: 0.6,
    wallShadowInsetBlurMin: 5,
    wallShadowInsetBlurMax: 100,
    wallShadowInsetSpreadMin: 0,
    wallShadowInsetSpreadMax: 22,
    wallShadowLightModeBoost: 2.5
  },

  // 10. Studio (professional photography, balanced)
  studio: {
    label: 'Studio',
    wallShadowLayers: 10,
    wallShadowAngle: 150,
    wallShadowDistance: 15,
    wallShadowFalloffCurve: 2.0,
    wallShadowFalloffFactor: 0.70,
    wallShadowOutsetIntensity: 1.0,
    wallShadowOutsetOpacity: 0.20,
    wallShadowOutsetBlurMin: 4,
    wallShadowOutsetBlurMax: 120,
    wallShadowOutsetSpreadMin: 0,
    wallShadowOutsetSpreadMax: 28,
    wallShadowInsetIntensity: 0.8,
    wallShadowInsetOpacity: 0.14,
    wallShadowInsetLayerRatio: 0.6,
    wallShadowInsetBlurMin: 6,
    wallShadowInsetBlurMax: 90,
    wallShadowInsetSpreadMin: 0,
    wallShadowInsetSpreadMax: 18,
    wallShadowLightModeBoost: 3.0
  }
};

export function applyWallShadowPreset(presetName) {
  const preset = WALL_SHADOW_PRESETS[presetName];
  if (!preset) return;

  const g = getGlobals();
  for (const [key, val] of Object.entries(preset)) {
    if (key === 'label') continue;
    if (g[key] !== undefined) g[key] = val;
  }
  g.wallShadowPreset = presetName;

  // Update the shadow CSS
  updateWallShadowCSS(g);
  
  // Sync sliders to reflect new values
  try { syncSlidersToState(); } catch (e) {}
  console.log(`Applied wall shadow preset: ${preset.label}`);
}

function warmupFramesControl(stateKey) {
  return {
    id: stateKey,
    label: 'Warmup Frames',
    stateKey,
    type: 'range',
    min: 0, max: 240, step: 1,
    default: 10,
    format: v => String(Math.round(v)),
    parse: v => parseInt(v, 10),
    reinitMode: true,
    hint: 'Pre-runs physics before first render to avoid visible settling on mode start.'
  };
}

function safeFormat(control, value) {
  try {
    if (typeof control?.format === 'function') return control.format(value);
  } catch (e) {}
  return String(value ?? '');
}

function escapeAttr(value) {
  // Minimal attribute escaping for safe HTML string generation.
  // (We only use this for titles/tooltips coming from known strings.)
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL REGISTRY
// Complete definition of ALL controls with metadata
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Control definition schema:
 * {
 *   id: string,           // Unique identifier (matches slider ID without 'Slider' suffix)
 *   label: string,        // Display label
 *   stateKey: string,     // Key in global state to read/write
 *   type: 'range' | 'checkbox' | 'toggle' | 'select',
 *   min?: number,         // For range inputs
 *   max?: number,
 *   step?: number,
 *   default: number,      // Default value
 *   format: (v) => string, // Format value for display
 *   parse: (v) => number,  // Parse input value
 *   onChange?: (g, val) => void, // Custom handler after state update
 * }
 */

export const CONTROL_SECTIONS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // LITE MODE — Global performance toggle
  // ═══════════════════════════════════════════════════════════════════════════
  liteMode: {
    title: 'Lite Mode',
    icon: '⚡',
    defaultOpen: true,
    controls: [
      {
        id: 'liteModeEnabled',
        label: 'Lite Mode',
        stateKey: 'liteModeEnabled',
        type: 'toggle',
        default: false,
        format: v => (v ? 'On' : 'Off'),
        parse: v => !!v,
        hint: 'Reduces simulation density for smoother 90fps targets.',
        isHero: true,
        onChange: (g) => {
          import('../modes/mode-controller.js').then(({ setMode }) => {
            setMode(g.currentMode);
          }).catch(() => {});
        }
      }
    ]
  },
  // ═══════════════════════════════════════════════════════════════════════════
  // BROWSER / THEME ENVIRONMENT
  // ═══════════════════════════════════════════════════════════════════════════
  environment: {
    title: 'Browser',
    icon: '🧭',
    defaultOpen: false,
    controls: [
      {
        id: 'chromeHarmonyMode',
        label: 'Chrome Harmony',
        stateKey: 'chromeHarmonyMode',
        type: 'select',
        options: [
          { value: 'auto', label: 'Auto (adapt only when needed)' },
          { value: 'site', label: 'Site (benchmark)' },
          { value: 'browser', label: 'Browser (force adapt)' }
        ],
        default: 'site',
        format: v => String(v),
        parse: v => String(v),
        hint: 'If desktop browsers ignore theme-color, the wall adapts to match the browser UI palette.',
        onChange: (g) => {
          import('../visual/dark-mode-v2.js').then(({ getCurrentTheme, setTheme }) => {
            setTheme(getCurrentTheme());
          }).catch(() => {});
        }
      },
      {
        id: 'autoDarkModeEnabled',
        label: 'Auto Dark (Night)',
        stateKey: 'autoDarkModeEnabled',
        type: 'checkbox',
        default: true,
        format: v => (v ? 'On' : 'Off'),
        parse: v => !!v,
        hint: 'In Auto theme, prefer Dark during the night window (privacy-first: local clock only).',
        onChange: () => {
          import('../visual/dark-mode-v2.js').then(({ getCurrentTheme, setTheme }) => {
            if (getCurrentTheme() === 'auto') setTheme('auto');
          }).catch(() => {});
        }
      },
      {
        id: 'autoDarkNightStartHour',
        label: 'Night Starts',
        stateKey: 'autoDarkNightStartHour',
        type: 'range',
        min: 0, max: 23, step: 1,
        default: 18,
        format: v => `${Math.round(v)}:00`,
        parse: v => parseInt(v, 10),
        onChange: () => {
          import('../visual/dark-mode-v2.js').then(({ getCurrentTheme, setTheme }) => {
            if (getCurrentTheme() === 'auto') setTheme('auto');
          }).catch(() => {});
        }
      },
      {
        id: 'autoDarkNightEndHour',
        label: 'Night Ends',
        stateKey: 'autoDarkNightEndHour',
        type: 'range',
        min: 0, max: 23, step: 1,
        default: 6,
        format: v => `${Math.round(v)}:00`,
        parse: v => parseInt(v, 10),
        onChange: () => {
          import('../visual/dark-mode-v2.js').then(({ getCurrentTheme, setTheme }) => {
            if (getCurrentTheme() === 'auto') setTheme('auto');
          }).catch(() => {});
        }
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PHYSICS (GLOBAL) — shared material world across physics-based simulations
  // ═══════════════════════════════════════════════════════════════════════════
  physics: {
    title: 'Material World',
    icon: '⚖️',
    defaultOpen: false,
    controls: [
      {
        id: 'ballMassKg',
        label: 'Ball Mass',
        stateKey: 'ballMassKg',
        type: 'range',
        min: 20, max: 400, step: 1,
        default: 91,
        format: v => `${Math.round(v)} kg`,
        parse: v => parseInt(v, 10),
        hint: 'Heavier = snooker feel (more inertia, less jitter).',
        onChange: (g, val) => {
          // Apply immediately to existing balls
          const m = Number(val);
          if (!Number.isFinite(m)) return;
          if (Array.isArray(g.balls)) {
            for (let i = 0; i < g.balls.length; i++) {
              const b = g.balls[i];
              if (b) b.m = m;
            }
          }
        }
      },
      {
        id: 'REST',
        label: 'Restitution',
        stateKey: 'REST',
        type: 'range',
        min: 0, max: 0.95, step: 0.01,
        default: 0.42,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Global bounciness for collisions (modes may override).'
      },
      {
        id: 'FRICTION',
        label: 'Friction',
        stateKey: 'FRICTION',
        type: 'range',
        min: 0, max: 0.06, step: 0.001,
        default: 0.018,
        format: v => v.toFixed(3),
        parse: parseFloat,
        hint: 'Global drag/energy loss (modes may override).'
      },

      // Performance + stability controls
      {
        id: 'physicsCollisionIterations',
        label: 'Collision Iterations',
        stateKey: 'physicsCollisionIterations',
        type: 'range',
        min: 3, max: 20, step: 1,
        default: 10,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        group: 'Performance',
        groupCollapsed: true,
        hint: 'How many times per frame we resolve collisions. Lower = faster, higher = tighter stacks.'
      },
      {
        id: 'physicsSkipSleepingCollisions',
        label: 'Skip Sleeping Pairs',
        stateKey: 'physicsSkipSleepingCollisions',
        type: 'toggle',
        default: true,
        group: 'Performance',
        hint: 'When enabled, collisions between two sleeping balls are skipped until something wakes them. Big CPU win with piles.'
      },
      {
        id: 'physicsSpatialGridOptimization',
        label: 'Grid Reuse',
        stateKey: 'physicsSpatialGridOptimization',
        type: 'toggle',
        default: true,
        group: 'Performance',
        hint: 'Reuses the spatial grid data structures to reduce allocations/GC. Keep on unless debugging.'
      },
      {
        id: 'physicsSleepThreshold',
        label: 'Sleep Threshold',
        stateKey: 'physicsSleepThreshold',
        type: 'range',
        min: 0, max: 30, step: 1,
        default: 12,
        format: v => `${Math.round(v)} px/s`,
        parse: v => parseInt(v, 10),
        group: 'Performance',
        hint: 'Velocity below which a ball is considered “at rest” (non‑Pit modes). 0 disables sleeping.'
      },
      {
        id: 'physicsSleepTime',
        label: 'Sleep Time',
        stateKey: 'physicsSleepTime',
        type: 'range',
        min: 0, max: 1.0, step: 0.05,
        default: 0.25,
        format: v => `${v.toFixed(2)}s`,
        parse: parseFloat,
        group: 'Performance',
        hint: 'How long a ball must stay under the Sleep Threshold before it sleeps. Higher = more stability + more performance.'
      },
      {
        id: 'physicsSkipSleepingSteps',
        label: 'Skip Sleeping Steps',
        stateKey: 'physicsSkipSleepingSteps',
        type: 'toggle',
        default: true,
        group: 'Performance',
        hint: 'When enabled, sleeping balls don’t run physics integration each tick. Improves performance; tiny motions may be delayed until wake.'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // BALLS - Size, softness, spacing
  // ═══════════════════════════════════════════════════════════════════════════
  balls: {
    title: 'Balls',
    icon: '🎱',
    defaultOpen: false,
    controls: [
      {
        id: 'ballSizeDesktop',
        label: 'Desktop Size',
        stateKey: 'ballSizeDesktop',
        type: 'range',
        min: 2, max: 40, step: 1,
        default: 18,
        format: v => v + 'px',
        parse: parseFloat,
        hint: 'Ball radius in pixels for desktop',
        onChange: (g, val) => {
          g.ballSizeDesktop = val;
          import('../core/state.js').then(({ updateBallSizes }) => {
            updateBallSizes();
            const newSize = g.R_MED;
            if (g.balls && g.balls.length) {
              g.balls.forEach(b => { b.r = newSize; b.rBase = newSize; });
            }
          });
          import('../rendering/cursor.js').then(({ updateCursorSize }) => {
            updateCursorSize();
          });
        }
      },
      {
        id: 'ballSizeMobile',
        label: 'Mobile Size',
        stateKey: 'ballSizeMobile',
        type: 'range',
        min: 2, max: 30, step: 1,
        default: 6,
        format: v => v + 'px',
        parse: parseFloat,
        hint: 'Ball radius in pixels for mobile devices',
        onChange: (g, val) => {
          g.ballSizeMobile = val;
          import('../core/state.js').then(({ updateBallSizes }) => {
            updateBallSizes();
            const newSize = g.R_MED;
            if (g.balls && g.balls.length) {
              g.balls.forEach(b => { b.r = newSize; b.rBase = newSize; });
            }
          });
        }
      },
      {
        id: 'mobileObjectReductionFactor',
        label: 'Mobile Density',
        stateKey: 'mobileObjectReductionFactor',
        type: 'range',
        min: 0, max: 1.0, step: 0.05,
        default: 0.7,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Scales object counts on mobile (0% = none). Resets the current mode.',
        onChange: (g, _val) => {
          import('../modes/mode-controller.js').then(({ setMode }) => {
            setMode(g.currentMode);
          }).catch(() => {});
        }
      },
      {
        id: 'ballSoftnessGlobal',
        label: 'Softness',
        stateKey: 'ballSoftness',
        type: 'range',
        min: 0, max: 100, step: 1,
        default: 20,
        format: v => String(v),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'ballSpacing',
        label: 'Spacing',
        stateKey: 'ballSpacing',
        type: 'range',
        min: 0, max: 0.5, step: 0.01,
        default: 0.08,
        format: v => Math.round(v * 100) + '%',
        parse: parseFloat,
        hint: 'Collision gap as % of ball radius (affects physics)'
      },
      {
        id: 'sizeVariationGlobalMul',
        label: 'Variation Scale',
        stateKey: 'sizeVariationGlobalMul',
        type: 'range',
        min: 0, max: 2.0, step: 0.05,
        default: 1.0,
        format: v => v.toFixed(2) + 'x',
        parse: parseFloat,
        hint: 'Global multiplier for per-mode size variation',
        onChange: (g, _val) => {
          import('../core/state.js').then(({ updateBallSizes }) => {
            updateBallSizes();
          });
        }
      },
      {
        id: 'sizeVariationCap',
        label: 'Variation Cap',
        stateKey: 'sizeVariationCap',
        type: 'range',
        min: 0, max: 0.2, step: 0.01,
        default: 0.2,
        format: v => Math.round(v * 100) + '%',
        parse: parseFloat,
        hint: 'Max radius deviation from medium (20% = ±20%)',
        onChange: (g, _val) => {
          import('../core/state.js').then(({ updateBallSizes }) => {
            updateBallSizes();
          });
        }
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CURSOR
  // ═══════════════════════════════════════════════════════════════════════════
  cursor: {
    title: 'Hand',
    icon: '🖐️',
    defaultOpen: false,
    controls: [
      {
        id: 'cursorInfluenceRadiusVw',
        label: 'Influence Radius',
        stateKey: 'cursorInfluenceRadiusVw',
        type: 'range',
        min: 0, max: 80, step: 0.5,
        default: 14,
        format: v => `${v.toFixed(1)}vw`,
        parse: parseFloat,
        hint: 'Universal cursor interaction zone (scales with viewport width).'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // TRAIL - Mouse cursor and trail controls (consolidated)
  // ═══════════════════════════════════════════════════════════════════════════
  trail: {
    title: 'Mouse & Trail',
    icon: '🖐️',
    defaultOpen: false,
    controls: [
      {
        id: 'cursorSize',
        label: 'Cursor Size',
        stateKey: 'cursorSize',
        type: 'range',
        min: 0.1, max: 3.0, step: 0.05,
        default: 1.0,
        format: v => v.toFixed(2),
        parse: parseFloat,
        onChange: (g, val) => {
          import('../rendering/cursor.js').then(({ updateCursorSize }) => {
            updateCursorSize();
          });
        }
      },
      {
        id: 'mouseTrailEnabled',
        label: 'Trail Enabled',
        stateKey: 'mouseTrailEnabled',
        type: 'checkbox',
        default: true
      },
      {
        id: 'mouseTrailLength',
        label: 'Trail Length',
        stateKey: 'mouseTrailLength',
        type: 'range',
        min: 4, max: 96, step: 1,
        default: 18,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        hint: 'Max samples kept (higher = smoother, slightly more work)'
      },
      {
        id: 'mouseTrailSize',
        label: 'Trail Size',
        stateKey: 'mouseTrailSize',
        type: 'range',
        min: 0.5, max: 10, step: 0.1,
        default: 1.3,
        format: v => v.toFixed(1) + 'px',
        parse: parseFloat
      },
      {
        id: 'mouseTrailFadeMs',
        label: 'Trail Fade',
        stateKey: 'mouseTrailFadeMs',
        type: 'range',
        min: 40, max: 1200, step: 10,
        default: 220,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10)
      },
      {
        id: 'mouseTrailOpacity',
        label: 'Trail Opacity',
        stateKey: 'mouseTrailOpacity',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.35,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      { type: 'divider', label: 'Cursor Explosion' },
      {
        id: 'cursorExplosionEnabled',
        label: 'Explosion Enabled',
        stateKey: 'cursorExplosionEnabled',
        type: 'checkbox',
        default: true,
        hint: 'Particle dispersion when cursor enters button areas'
      },
      {
        id: 'cursorExplosionParticleCount',
        label: 'Particle Count',
        stateKey: 'cursorExplosionParticleCount',
        type: 'range',
        min: 4, max: 32, step: 1,
        default: 16,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        hint: 'Base particle count (scales with velocity)'
      },
      {
        id: 'cursorExplosionSpeed',
        label: 'Particle Speed',
        stateKey: 'cursorExplosionSpeed',
        type: 'range',
        min: 100, max: 1000, step: 50,
        default: 400,
        format: v => `${Math.round(v)}px/s`,
        parse: v => parseInt(v, 10),
        hint: 'Base particle velocity (scales with impact)'
      },
      {
        id: 'cursorExplosionSpreadDeg',
        label: 'Spread Angle',
        stateKey: 'cursorExplosionSpreadDeg',
        type: 'range',
        min: 180, max: 360, step: 10,
        default: 360,
        format: v => `${Math.round(v)}°`,
        parse: v => parseInt(v, 10),
        hint: 'Particle dispersion angle (360 = full circle)'
      },
      {
        id: 'cursorExplosionLifetime',
        label: 'Lifetime',
        stateKey: 'cursorExplosionLifetime',
        type: 'range',
        min: 0.3, max: 1.5, step: 0.1,
        default: 0.8,
        format: v => `${v.toFixed(1)}s`,
        parse: parseFloat,
        hint: 'How long particles live before fading'
      },
      {
        id: 'cursorExplosionFadeStartRatio',
        label: 'Fade Start',
        stateKey: 'cursorExplosionFadeStartRatio',
        type: 'range',
        min: 0.3, max: 0.9, step: 0.05,
        default: 0.6,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'When to start fading (0.6 = fade at 60% lifetime)'
      },
      {
        id: 'cursorExplosionDrag',
        label: 'Drag',
        stateKey: 'cursorExplosionDrag',
        type: 'range',
        min: 0.85, max: 0.99, step: 0.01,
        default: 0.95,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Velocity decay per frame (lower = faster slowdown)'
      },
      {
        id: 'cursorExplosionShrinkEnabled',
        label: 'Shrink Over Time',
        stateKey: 'cursorExplosionShrinkEnabled',
        type: 'checkbox',
        default: true,
        hint: 'Particles shrink as they age (cartoony character)'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CURSOR EXPLOSION IMPACT - How mouse velocity affects explosion strength
  // ═══════════════════════════════════════════════════════════════════════════
  cursorExplosionImpact: {
    title: 'Cursor Explosion Impact',
    controls: [
      {
        id: 'cursorExplosionImpactMinFactor',
        label: 'Min Impact',
        stateKey: 'cursorExplosionImpactMinFactor',
        type: 'range',
        min: 0.1, max: 2.0, step: 0.1,
        default: 0.5,
        format: v => `${v.toFixed(1)}x`,
        parse: parseFloat,
        hint: 'Impact multiplier for slow hover (0.5 = half intensity)'
      },
      {
        id: 'cursorExplosionImpactMaxFactor',
        label: 'Max Impact',
        stateKey: 'cursorExplosionImpactMaxFactor',
        type: 'range',
        min: 1.0, max: 8.0, step: 0.5,
        default: 4.0,
        format: v => `${v.toFixed(1)}x`,
        parse: parseFloat,
        hint: 'Impact multiplier for fast impact (4.0 = 4x intensity)'
      },
      {
        id: 'cursorExplosionImpactSensitivity',
        label: 'Impact Sensitivity',
        stateKey: 'cursorExplosionImpactSensitivity',
        type: 'range',
        min: 100, max: 1000, step: 50,
        default: 400,
        format: v => `${Math.round(v)}px/ms`,
        parse: v => parseInt(v, 10),
        hint: 'Velocity threshold for scaling (higher = less sensitive)'
      },
      { type: 'divider', label: 'Lifetime Impact' },
      {
        id: 'cursorExplosionLifetimeImpactMin',
        label: 'Min Lifetime Scale',
        stateKey: 'cursorExplosionLifetimeImpactMin',
        type: 'range',
        min: 0.3, max: 1.5, step: 0.1,
        default: 0.7,
        format: v => `${v.toFixed(1)}x`,
        parse: parseFloat,
        hint: 'Lifetime multiplier for slow hover (particles fade quickly)'
      },
      {
        id: 'cursorExplosionLifetimeImpactMax',
        label: 'Max Lifetime Scale',
        stateKey: 'cursorExplosionLifetimeImpactMax',
        type: 'range',
        min: 1.0, max: 3.0, step: 0.1,
        default: 1.8,
        format: v => `${v.toFixed(1)}x`,
        parse: parseFloat,
        hint: 'Lifetime multiplier for fast impact (particles travel farther)'
      },
      {
        id: 'cursorExplosionLifetimeImpactSensitivity',
        label: 'Lifetime Sensitivity',
        stateKey: 'cursorExplosionLifetimeImpactSensitivity',
        type: 'range',
        min: 200, max: 1500, step: 50,
        default: 600,
        format: v => `${Math.round(v)}px/ms`,
        parse: v => parseInt(v, 10),
        hint: 'Velocity threshold for lifetime scaling (higher = less sensitive)'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // UI SPACING - Consolidated spacing/padding for most text UI (no duplicates)
  // ═══════════════════════════════════════════════════════════════════════════
  uiSpacing: {
    title: 'UI Spacing',
    icon: '📏',
    defaultOpen: false,
    controls: [
      { type: 'divider', label: 'Content' },
       {
         id: 'contentPaddingRatio',
         label: 'Padding Additive',
         stateKey: 'contentPaddingRatio',
         type: 'range',
         min: -0.05, max: 0.10, step: 0.001,
         default: 0,
         format: v => `${(Number(v) * 100).toFixed(1)}%`,
         parse: parseFloat,
         hint: 'Additive padding as a fraction of viewport size (sqrt(w*h)). Back-compat: old px values are auto-converted.',
         onChange: (g, val) => {
           const valueToSync = val !== undefined ? val : (g.contentPaddingRatio !== undefined ? g.contentPaddingRatio : 0);
           
           import('../core/state.js').then(({ applyLayoutFromVwToPx, applyLayoutCSSVars }) => {
             applyLayoutFromVwToPx();
             applyLayoutCSSVars();
             try {
               const el = document.getElementById('contentPaddingRatioVal');
               if (el) {
                 const frac = Number(valueToSync) || 0;
                 const viewportSize = (() => {
                   try {
                     const v = getComputedStyle(document.documentElement).getPropertyValue('--layout-viewport-size-px').trim();
                     const n = parseFloat(v);
                     return Number.isFinite(n) ? n : 0;
                   } catch (e) { return 0; }
                 })();
                 const addPx = Math.round(viewportSize * frac);
                 const total = Math.round(g.contentPadding || 0);
                 el.textContent = `${(frac >= 0 ? '+' : '')}${(frac * 100).toFixed(1)}% (${addPx >= 0 ? '+' : ''}${addPx}px) → ${total}px`;
               }
             } catch (e) {}
             try { document.dispatchEvent(new CustomEvent('layout-updated')); } catch (e) {}
           }).catch(() => {});
           import('../rendering/renderer.js').then(({ resize }) => { try { resize(); } catch (e) {} }).catch(() => {});
         }
       },
       {
         id: 'contentPaddingHorizontalRatio',
         label: 'Horizontal Ratio',
         stateKey: 'contentPaddingHorizontalRatio',
         type: 'range',
         min: 0.5, max: 2.5, step: 0.05,
         default: 1.0,
         format: v => `${Number(v).toFixed(2)}×`,
         parse: parseFloat,
         hint: 'Horizontal padding = base × ratio.',
         onChange: (g) => {
           import('../core/state.js').then(({ applyLayoutFromVwToPx, applyLayoutCSSVars }) => {
             applyLayoutFromVwToPx();
             applyLayoutCSSVars();
             try {
               const el = document.getElementById('contentPaddingHorizontalRatioVal');
               if (el) {
                 const ratio = Number(g.contentPaddingHorizontalRatio || 1.0);
                 el.textContent = `${ratio.toFixed(2)}× → ${Math.round(g.contentPaddingX || g.contentPadding)}px`;
               }
             } catch (e) {}
           }).catch(() => {});
         }
       },
       {
         id: 'contentPaddingBottomRatio',
         label: 'Bottom Padding Ratio',
         stateKey: 'contentPaddingBottomRatio',
         type: 'range',
         min: 0.5, max: 2.5, step: 0.05,
         default: 1.3,
         format: v => `${Number(v).toFixed(2)}×`,
         parse: parseFloat,
         hint: 'Bottom padding multiplier (applied to vertical padding).',
         onChange: (_g, val) => {
           const ratio = Number(val) || 1.3;
           document.documentElement.style.setProperty('--abs-content-pad-mul-bottom', String(ratio));
         }
       },

      { type: 'divider', label: 'Hit Areas' },
      {
        id: 'uiHitAreaMul',
        label: 'Hit Area Mul',
        stateKey: 'uiHitAreaMul',
        type: 'range',
        min: 0.5, max: 2.5, step: 0.05,
        default: 0.7,
        format: v => `${Number(v).toFixed(2)}×`,
        parse: parseFloat,
        hint: 'Scales most UI button/link hit areas (drives --ui-hit-area-mul).',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--ui-hit-area-mul', String(val));
        }
      },

      { type: 'divider', label: 'Icon Buttons' },
      {
        id: 'uiIconFramePx',
        label: 'Icon Frame Size',
        stateKey: 'uiIconFramePx',
        type: 'range',
        min: 0, max: 120, step: 1,
        default: 0,
        format: v => (Number(v) <= 0 ? 'Auto' : `${Math.round(v)}px`),
        parse: v => parseInt(v, 10),
        hint: 'Square icon button frame size (height/width). 0 = auto (derived from icon padding tokens).',
        onChange: (_g, val) => {
          const root = document.documentElement;
          if (Number(val) <= 0) root.style.removeProperty('--ui-icon-frame-size');
          else root.style.setProperty('--ui-icon-frame-size', `${Math.round(val)}px`);
        }
      },
      {
        id: 'uiIconGlyphPx',
        label: 'Icon Glyph Size',
        stateKey: 'uiIconGlyphPx',
        type: 'range',
        min: 0, max: 64, step: 1,
        default: 0,
        format: v => (Number(v) <= 0 ? 'Auto' : `${Math.round(v)}px`),
        parse: v => parseInt(v, 10),
        hint: 'Icon glyph size inside the square frame. 0 = auto (uses token defaults).',
        onChange: (_g, val) => {
          const root = document.documentElement;
          if (Number(val) <= 0) root.style.removeProperty('--ui-icon-glyph-size');
          else root.style.setProperty('--ui-icon-glyph-size', `${Math.round(val)}px`);
        }
      },
      {
        id: 'uiIconGroupMarginPx',
        label: 'Icon Group Margin',
        stateKey: 'uiIconGroupMarginPx',
        type: 'range',
        min: -60, max: 60, step: 1,
        default: 0,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Margin applied to the social icon group. Use negative values to push icons outward.',
        onChange: (_g, val) => {
          const root = document.documentElement;
          if (Number(val) === 0) root.style.removeProperty('--ui-icon-group-margin');
          else root.style.setProperty('--ui-icon-group-margin', `${Math.round(val)}px`);
        }
      },
      {
        id: 'uiIconCornerRadiusMul',
        label: 'Corner Radius',
        stateKey: 'uiIconCornerRadiusMul',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.4,
        format: v => `${Math.round(Number(v) * 100)}% of wall`,
        parse: parseFloat,
        hint: 'Icon button corner radius as a fraction of wall radius (drives --ui-icon-corner-radius-mul).',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--ui-icon-corner-radius-mul', String(val));
        }
      },

      {
        id: 'uiIconFramePx',
        label: 'Frame Size',
        stateKey: 'uiIconFramePx',
        type: 'range',
        min: 0, max: 140, step: 1,
        default: 0,
        format: v => (Math.round(Number(v)) <= 0 ? 'Auto' : `${Math.round(Number(v))}px`),
        parse: v => parseInt(v, 10),
        hint: 'Square icon button frame size (px). 0 = use token-derived default (--ui-icon-frame-size).',
        onChange: (_g, val) => {
          try {
            const root = document.documentElement;
            const n = Math.round(Number(val || 0));
            if (n > 0) root.style.setProperty('--ui-icon-frame-size', `${n}px`);
            else root.style.removeProperty('--ui-icon-frame-size');
          } catch (e) {}
        }
      },
      {
        id: 'uiIconGlyphPx',
        label: 'Glyph Size',
        stateKey: 'uiIconGlyphPx',
        type: 'range',
        min: 0, max: 80, step: 1,
        default: 0,
        format: v => (Math.round(Number(v)) <= 0 ? 'Auto' : `${Math.round(Number(v))}px`),
        parse: v => parseInt(v, 10),
        hint: 'Icon glyph size (px). 0 = use token-derived default (--ui-icon-glyph-size).',
        onChange: (_g, val) => {
          try {
            const root = document.documentElement;
            const n = Math.round(Number(val || 0));
            if (n > 0) root.style.setProperty('--ui-icon-glyph-size', `${n}px`);
            else root.style.removeProperty('--ui-icon-glyph-size');
          } catch (e) {}
        }
      },

      { type: 'divider', label: 'Links' },
      {
        id: 'linkTextPadding',
        label: 'Text Link Padding',
        stateKey: 'linkTextPadding',
        type: 'range',
        min: 4, max: 40, step: 1,
        default: 30,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Padding for text links (main links, CV links).',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--link-text-padding', `${val}px`);
          document.documentElement.style.setProperty('--link-text-margin', `${-val}px`);
        }
      },
      {
        id: 'linkIconPadding',
        label: 'Icon Link Padding',
        stateKey: 'linkIconPadding',
        type: 'range',
        min: 4, max: 40, step: 1,
        default: 24,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Legacy: used to derive auto icon button sizing when Icon Frame Size is set to Auto.',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--link-icon-padding', `${val}px`);
          document.documentElement.style.setProperty('--link-icon-margin', `${-val}px`);
        }
      },

      { type: 'divider', label: 'Main Links + Labels' },
      {
        id: 'footerNavBarTopVh',
        label: 'Nav Bar Position',
        stateKey: 'footerNavBarTopVh',
        type: 'range',
        min: 0, max: 100, step: 0.5,
        default: 50,
        format: v => `${Number(v).toFixed(1)}vh`,
        parse: v => parseFloat(v),
        hint: 'Vertical position of main links nav bar from top of viewport.',
        onChange: (_g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--footer-nav-bar-top', `${val}vh`);
          root.style.setProperty('--footer-nav-bar-top-svh', `${val}svh`);
          root.style.setProperty('--footer-nav-bar-top-dvh', `${val}dvh`);
        }
      },
      {
        id: 'footerNavBarGapVw',
        label: 'Nav Link Gap',
        stateKey: 'footerNavBarGapVw',
        type: 'range',
        min: 0, max: 10, step: 0.1,
        default: 2.5,
        format: v => `${Number(v).toFixed(1)}vw`,
        parse: v => parseFloat(v),
        hint: 'Horizontal gap between nav bar links (vw → clamp).',
        onChange: (_g, val) => {
          const vw = Number(val);
          if (!Number.isFinite(vw)) return;
          const minPx = Math.round(vw * 9.6);
          const maxPx = Math.round(minPx * 1.67);
          document.documentElement.style.setProperty('--footer-nav-bar-gap', `clamp(${minPx}px, ${vw}vw, ${maxPx}px)`);
        }
      },
      {
        id: 'homeMainLinksBelowLogoPx',
        label: 'Links Offset',
        stateKey: 'homeMainLinksBelowLogoPx',
        type: 'range',
        min: -120, max: 240, step: 1,
        default: 40,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Index: move the main links up/down below the logo.',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--home-main-links-below-logo-px', String(val));
        }
      },
      {
        id: 'edgeLabelInsetAdjustPx',
        label: 'Edge Label Inset',
        stateKey: 'edgeLabelInsetAdjustPx',
        type: 'range',
        min: -120, max: 240, step: 1,
        default: 0,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Adjusts edge label inset relative to wall. Higher = inward; lower = outward.',
        onChange: () => {
          import('../core/state.js').then(mod => {
            mod.applyLayoutCSSVars();
          }).catch(() => {});
        }
      },
      {
        id: 'edgeCaptionDistanceMinPx',
        label: 'Caption Distance Min',
        stateKey: 'edgeCaptionDistanceMinPx',
        type: 'range',
        min: 0, max: 80, step: 2,
        default: 8,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Padding from bottom inner edge of wall (0 = flush). Index, portfolio, cv.',
        onChange: () => {
          import('../core/state.js').then(mod => { mod.applyLayoutCSSVars(); }).catch(() => {});
        }
      },
      {
        id: 'edgeCaptionDistanceMaxPx',
        label: 'Caption Distance Max',
        stateKey: 'edgeCaptionDistanceMaxPx',
        type: 'range',
        min: 16, max: 200, step: 2,
        default: 48,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Maximum distance; at largest breakpoint does not grow further.',
        onChange: () => {
          import('../core/state.js').then(mod => { mod.applyLayoutCSSVars(); }).catch(() => {});
        }
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SIMULATION OVERLAY - Gradient on top of the simulation (viewport ::before + depth-wash)
  // ═══════════════════════════════════════════════════════════════════════════
  simulationOverlay: {
    title: 'Simulation Overlay',
    icon: '🔆',
    defaultOpen: false,
    controls: [
      {
        id: 'simulationOverlayIntensity',
        label: 'CSS Gradient',
        stateKey: 'simulationOverlayIntensity',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 1,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Intensity of the soft gradient overlay on the simulation (viewport ::before).',
        onChange: () => {
          import('../core/state.js').then(mod => { mod.applyLayoutCSSVars(); }).catch(() => {});
        }
      },
      { type: 'divider', label: 'Depth Wash (Canvas)' },
      {
        id: 'depthWashOpacity',
        label: 'Opacity',
        stateKey: 'depthWashOpacity',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.65,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Master opacity of the radial depth overlay'
      },
      {
        id: 'depthWashCenterY',
        label: 'Center Y',
        stateKey: 'depthWashCenterY',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.3,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Vertical center of gradient (0=top, 100%=bottom)'
      },
      {
        id: 'depthWashRadiusScale',
        label: 'Radius',
        stateKey: 'depthWashRadiusScale',
        type: 'range',
        min: 0.2, max: 3, step: 0.1,
        default: 1.0,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        hint: 'Size of the gradient'
      },
      { type: 'divider', label: 'Light Mode' },
      {
        id: 'depthWashBlendModeLight',
        label: 'Blend Mode',
        stateKey: 'depthWashBlendModeLight',
        type: 'select',
        options: [
          { value: 'source-over', label: 'Normal' },
          { value: 'multiply', label: 'Multiply' },
          { value: 'screen', label: 'Screen' },
          { value: 'overlay', label: 'Overlay' },
          { value: 'darken', label: 'Darken' },
          { value: 'lighten', label: 'Lighten' },
          { value: 'color-dodge', label: 'Color Dodge' },
          { value: 'color-burn', label: 'Color Burn' },
          { value: 'hard-light', label: 'Hard Light' },
          { value: 'soft-light', label: 'Soft Light' },
          { value: 'difference', label: 'Difference' },
          { value: 'exclusion', label: 'Exclusion' }
        ],
        default: 'color-dodge',
        format: v => String(v),
        parse: v => String(v)
      },
      {
        id: 'depthWashCenterColorLight',
        label: 'Center Color',
        stateKey: 'depthWashCenterColorLight',
        type: 'color',
        default: '#ffffff',
        format: v => String(v),
        parse: v => String(v)
      },
      {
        id: 'depthWashCenterAlphaLight',
        label: 'Center Alpha',
        stateKey: 'depthWashCenterAlphaLight',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.3,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat
      },
      {
        id: 'depthWashEdgeColorLight',
        label: 'Edge Color',
        stateKey: 'depthWashEdgeColorLight',
        type: 'color',
        default: '#142b48',
        format: v => String(v),
        parse: v => String(v)
      },
      {
        id: 'depthWashEdgeAlphaLight',
        label: 'Edge Alpha',
        stateKey: 'depthWashEdgeAlphaLight',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.4,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat
      },
      { type: 'divider', label: 'Dark Mode' },
      {
        id: 'depthWashBlendModeDark',
        label: 'Blend Mode',
        stateKey: 'depthWashBlendModeDark',
        type: 'select',
        options: [
          { value: 'source-over', label: 'Normal' },
          { value: 'multiply', label: 'Multiply' },
          { value: 'screen', label: 'Screen' },
          { value: 'overlay', label: 'Overlay' },
          { value: 'darken', label: 'Darken' },
          { value: 'lighten', label: 'Lighten' },
          { value: 'color-dodge', label: 'Color Dodge' },
          { value: 'color-burn', label: 'Color Burn' },
          { value: 'hard-light', label: 'Hard Light' },
          { value: 'soft-light', label: 'Soft Light' },
          { value: 'difference', label: 'Difference' },
          { value: 'exclusion', label: 'Exclusion' }
        ],
        default: 'multiply',
        format: v => String(v),
        parse: v => String(v)
      },
      {
        id: 'depthWashCenterColorDark',
        label: 'Center Color',
        stateKey: 'depthWashCenterColorDark',
        type: 'color',
        default: '#1a1e23',
        format: v => String(v),
        parse: v => String(v)
      },
      {
        id: 'depthWashCenterAlphaDark',
        label: 'Center Alpha',
        stateKey: 'depthWashCenterAlphaDark',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat
      },
      {
        id: 'depthWashEdgeColorDark',
        label: 'Edge Color',
        stateKey: 'depthWashEdgeColorDark',
        type: 'color',
        default: '#05020f',
        format: v => String(v),
        parse: v => String(v)
      },
      {
        id: 'depthWashEdgeAlphaDark',
        label: 'Edge Alpha',
        stateKey: 'depthWashEdgeAlphaDark',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.8,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LINKS - Link styling (color influence + impact motion)
  // ═══════════════════════════════════════════════════════════════════════════
  links: {
    title: 'Links',
    icon: '🔗',
    defaultOpen: false,
    controls: [
      {
        id: 'linkColorInfluence',
        label: 'Color Influence',
        stateKey: 'linkColorInfluence',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 1,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'How much cursor color affects link colors (0 = none, 1 = full)',
        onChange: (g, val) => {
          document.documentElement.style.setProperty('--link-color-influence', String(val));
        }
      },
      {
        id: 'linkImpactScale',
        label: 'Impact Scale',
        stateKey: 'linkImpactScale',
        type: 'range',
        min: 0.7, max: 1.0, step: 0.01,
        default: 0.95,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Scale when link is pressed (lower = more dramatic press)',
        onChange: (g, val) => {
          document.documentElement.style.setProperty('--link-impact-scale', String(val));
        }
      },
      {
        id: 'linkImpactBlur',
        label: 'Impact Blur',
        stateKey: 'linkImpactBlur',
        type: 'range',
        min: 0, max: 20, step: 0.5,
        default: 10,
        format: v => `${v.toFixed(1)}px`,
        parse: parseFloat,
        hint: 'Blur amount when link is pressed (creates depth effect)',
        onChange: (g, val) => {
          document.documentElement.style.setProperty('--link-impact-blur', `${val}px`);
        }
      },
      {
        id: 'linkImpactDuration',
        label: 'Impact Duration',
        stateKey: 'linkImpactDuration',
        type: 'range',
        min: 50, max: 300, step: 10,
        default: 150,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10),
        hint: 'Duration of press animation (fast and subtle)',
        onChange: (g, val) => {
          document.documentElement.style.setProperty('--link-impact-duration', `${val}ms`);
        }
      },
      {
        id: 'hoverSnapEnabled',
        label: 'Hover Snap',
        stateKey: 'hoverSnapEnabled',
        type: 'checkbox',
        default: true,
        hint: 'Hover targets: a tiny “snap onto” bounce on hover entry (scale-only; color stays instant).',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--abs-hover-snap-enabled', val ? '1' : '0');
        }
      },
      {
        id: 'hoverSnapDuration',
        label: 'Snap Duration',
        stateKey: 'hoverSnapDuration',
        type: 'range',
        min: 0, max: 1200, step: 10,
        default: 450,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10),
        hint: 'Total duration of the hover snap bounce (ms).',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--abs-hover-snap-duration', `${Math.max(0, Math.round(val))}ms`);
        }
      },
      {
        id: 'hoverSnapOvershoot',
        label: 'Snap Overshoot',
        stateKey: 'hoverSnapOvershoot',
        type: 'range',
        min: 1.0, max: 1.25, step: 0.005,
        default: 1.08,
        format: v => v.toFixed(3),
        parse: parseFloat,
        hint: 'Peak scale during hover snap (>= 1.0).',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--abs-hover-snap-overshoot', String(val));
        }
      },
      {
        id: 'hoverSnapUndershoot',
        label: 'Snap Recoil',
        stateKey: 'hoverSnapUndershoot',
        type: 'range',
        min: 0.8, max: 1.0, step: 0.005,
        default: 0.98,
        format: v => v.toFixed(3),
        parse: parseFloat,
        hint: 'Small recoil scale before settling back to 1.0 (<= 1.0).',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--abs-hover-snap-undershoot', String(val));
        }
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCENE - Mode change "click-in" micro-interaction tuning
  // ═══════════════════════════════════════════════════════════════════════════
  scene: {
    title: 'Scene Impact',
    icon: '🎬',
    defaultOpen: false,
    controls: [
      {
        id: 'sceneImpactEnabled',
        label: 'Enabled',
        stateKey: 'sceneImpactEnabled',
        type: 'checkbox',
        default: true,
        hint: 'If disabled, mode changes will not animate the scene.'
      },
      {
        id: 'sceneImpactMul',
        label: 'Click Depth',
        stateKey: 'sceneImpactMul',
        type: 'range',
        min: 0.0, max: 0.05, step: 0.001,
        default: 0.010,
        format: (v) => v.toFixed(3),
        parse: parseFloat,
        hint: 'How far the entire scene “presses in” on simulation change.',
        onChange: (_g, val) => {
          const el = document.getElementById('abs-scene');
          if (!el) return;
          const g = _g || {};
          const f = Number(g.sceneImpactMobileMulFactor);
          const factor = (Number.isFinite(f) && f > 0) ? f : 1.0;
          const isMobile = Boolean(g.isMobile || g.isMobileViewport);
          const eff = Number(val) * (isMobile ? factor : 1.0);
          el.style.setProperty('--abs-scene-impact-mul', String(eff));
        }
      },
      {
        id: 'sceneImpactLogoCompMul',
        label: 'Logo Comp',
        stateKey: 'sceneImpactLogoCompMul',
        type: 'range',
        min: 0.25, max: 6.0, step: 0.05,
        default: 3.6,
        format: (v) => v.toFixed(2) + 'x',
        parse: parseFloat,
        hint: 'How strongly the logo counter-scales against the scene press (higher = logo feels more "anchored").',
        onChange: (_g, val) => {
          const el = document.getElementById('abs-scene');
          if (!el) return;
          const v = Number(val);
          const safe = (Number.isFinite(v) && v > 0) ? v : 1.0;
          el.style.setProperty('--abs-scene-impact-logo-comp-mul', String(safe));
        }
      },
      {
        id: 'sceneImpactMobileMulFactor',
        label: 'Mobile Depth ×',
        stateKey: 'sceneImpactMobileMulFactor',
        type: 'range',
        min: 0.25, max: 3.0, step: 0.05,
        default: 1.0,
        format: (v) => v.toFixed(2) + 'x',
        parse: parseFloat,
        hint: 'Multiplier applied to Click Depth on mobile-sized viewports.',
        onChange: (_g, val) => {
          const el = document.getElementById('abs-scene');
          if (!el) return;
          const g = _g || {};
          const base = Number(g.sceneImpactMul);
          const baseMul = Number.isFinite(base) ? base : 0;
          const f = Number(val);
          const factor = (Number.isFinite(f) && f > 0) ? f : 1.0;
          const isMobile = Boolean(g.isMobile || g.isMobileViewport);
          const eff = baseMul * (isMobile ? factor : 1.0);
          el.style.setProperty('--abs-scene-impact-mul', String(eff));
        }
      },
      {
        id: 'sceneImpactPressMs',
        label: 'Press',
        stateKey: 'sceneImpactPressMs',
        type: 'range',
        min: 20, max: 300, step: 5,
        default: 90,
        format: (v) => `${Math.round(v)}ms`,
        parse: (v) => parseInt(v, 10),
        hint: 'Press-in duration.'
      },
      {
        id: 'sceneImpactReleaseMs',
        label: 'Release',
        stateKey: 'sceneImpactReleaseMs',
        type: 'range',
        min: 40, max: 1200, step: 10,
        default: 310,
        format: (v) => `${Math.round(v)}ms`,
        parse: (v) => parseInt(v, 10),
        hint: 'Release duration (“bounce out” length).'
      },
      {
        id: 'sceneImpactAnticipation',
        label: 'Anticipation',
        stateKey: 'sceneImpactAnticipation',
        type: 'range',
        min: 0.0, max: 0.6, step: 0.01,
        default: 0.0,
        format: (v) => v.toFixed(2),
        parse: parseFloat,
        hint: 'Micro pre-pop before the click-in (0 = off).'
      },
      {
        id: 'sceneChangeSoundEnabled',
        label: 'Scene Sound',
        stateKey: 'sceneChangeSoundEnabled',
        type: 'checkbox',
        default: true,
        hint: 'Plays a soft “pebble-like” tick when switching simulations (only if sound is enabled).'
      },
      {
        id: 'sceneChangeSoundIntensity',
        label: 'Scene Sound Intensity',
        stateKey: 'sceneChangeSoundIntensity',
        type: 'range',
        min: 0.0, max: 1.0, step: 0.01,
        default: 0.35,
        format: (v) => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'sceneChangeSoundRadius',
        label: 'Scene Sound Pitch',
        stateKey: 'sceneChangeSoundRadius',
        type: 'range',
        min: 6, max: 60, step: 1,
        default: 18,
        format: (v) => `${Math.round(v)}`,
        parse: (v) => parseInt(v, 10),
        hint: 'Higher = lower pitch (maps like “ball size”).'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // OVERLAY - Blur, Depth Effect
  // ═══════════════════════════════════════════════════════════════════════════
  overlay: {
    title: 'Depth & Blur',
    icon: '🌫️',
    defaultOpen: false,
    controls: [
      {
        id: 'modalOverlayEnabled',
        label: 'Enabled',
        stateKey: 'modalOverlayEnabled',
        type: 'checkbox',
        default: true
      },
      {
        id: 'modalOverlayOpacity',
        label: 'White Wash',
        stateKey: 'modalOverlayOpacity',
        type: 'range',
        min: 0, max: 0.1, step: 0.001,
        default: 0.01,
        format: v => v.toFixed(3),
        parse: parseFloat,
        onChange: (g, val) => {
          import('./modal-overlay.js').then(({ updateOverlayOpacity }) => {
            updateOverlayOpacity(val);
          });
        }
      },
      {
        id: 'modalOverlayBlurPx',
        label: 'Blur Amount',
        stateKey: 'modalOverlayBlurPx',
        type: 'range',
        min: 0, max: 30, step: 0.5,
        default: 8,
        format: v => `${v.toFixed(1)}px`,
        parse: parseFloat,
        hint: 'Backdrop blur strength (0 = off)',
        onChange: (g, val) => {
          import('./modal-overlay.js').then(({ updateOverlayBlur }) => {
            updateOverlayBlur(val);
          });
        }
      },
      {
        id: 'modalOverlayTransitionMs',
        label: 'Anim In Speed',
        stateKey: 'modalOverlayTransitionMs',
        type: 'range',
        min: 200, max: 1500, step: 50,
        default: 800,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10),
        hint: 'Duration for blur & depth zoom when opening',
        onChange: (g, val) => {
          import('./modal-overlay.js').then(({ updateOverlayTransition }) => {
            updateOverlayTransition(val);
          });
        }
      },
      {
        id: 'modalOverlayTransitionOutMs',
        label: 'Anim Out Speed',
        stateKey: 'modalOverlayTransitionOutMs',
        type: 'range',
        min: 200, max: 1200, step: 50,
        default: 600,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10),
        hint: 'Duration for blur & depth zoom when closing',
        onChange: (g, val) => {
          import('./modal-overlay.js').then(({ updateOverlayTransitionOut }) => {
            updateOverlayTransitionOut(val);
          });
        }
      },
      {
        id: 'modalOverlayContentDelayMs',
        label: 'Content Delay',
        stateKey: 'modalOverlayContentDelayMs',
        type: 'range',
        min: 0, max: 1000, step: 50,
        default: 200,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10),
        hint: 'Wait before showing dialog content',
        onChange: (g, val) => {
          import('./modal-overlay.js').then(({ updateGateContentDelay }) => {
            updateGateContentDelay(val);
          });
        }
      },
      {
        id: 'modalDepthScale',
        label: 'Depth Scale',
        stateKey: 'modalDepthScale',
        type: 'range',
        min: 0.9, max: 1.0, step: 0.001,
        default: 0.96,
        format: v => v.toFixed(3),
        parse: parseFloat,
        hint: 'Scene scale when gate opens (0.9-1.0)',
        onChange: (g, val) => {
          import('./modal-overlay.js').then(({ updateGateDepthScale }) => {
            updateGateDepthScale(val);
          });
        }
      },
      {
        id: 'gateDepthTranslateY',
        label: 'Depth Shift',
        stateKey: 'modalDepthTranslateY',
        type: 'range',
        min: 0, max: 30, step: 1,
        default: 8,
        format: v => `${Math.round(v)}px`,
        parse: parseInt,
        hint: 'Vertical shift when gate opens',
        onChange: (g, val) => {
          import('./modal-overlay.js').then(({ updateGateDepthTranslateY }) => {
            updateGateDepthTranslateY(val);
          });
        }
      },
      {
        id: 'logoBlurInactive',
        label: 'Logo Blur Closed',
        stateKey: 'logoBlurInactive',
        type: 'range',
        min: 0, max: 20, step: 0.5,
        default: 0,
        format: v => `${v.toFixed(1)}px`,
        parse: parseFloat,
        hint: 'Logo blur when gate is closed (0 = sharp)',
        onChange: (g, val) => {
          import('./modal-overlay.js').then(({ updateLogoBlurInactive }) => {
            updateLogoBlurInactive(val);
          });
        }
      },
      {
        id: 'logoBlurActive',
        label: 'Logo Blur Open',
        stateKey: 'logoBlurActive',
        type: 'range',
        min: 0, max: 30, step: 0.5,
        default: 12,
        format: v => `${v.toFixed(1)}px`,
        parse: parseFloat,
        hint: 'Logo blur when gate is active (12px = soft blur)',
        onChange: (g, val) => {
          import('./modal-overlay.js').then(({ updateLogoBlurActive }) => {
            updateLogoBlurActive(val);
          });
        }
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // COLORS - Full color system (backgrounds, text, links, logo)
  // ═══════════════════════════════════════════════════════════════════════════
  colors: {
    title: 'Color & Surface',
    icon: '🎨',
    defaultOpen: false,
    controls: [
      // ─── BACKGROUNDS ─────────────────────────────────────────────────────
      { type: 'divider', label: 'Backgrounds' },
      {
        id: 'bgLight',
        label: 'Light Mode',
        stateKey: 'bgLight',
        type: 'color',
        default: '#f5f5f5',
        hint: 'Background color for light mode',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--bg-light', val);
        }
      },
      {
        id: 'bgDark',
        label: 'Dark Mode',
        stateKey: 'bgDark',
        type: 'color',
        default: '#0a0a0a',
        hint: 'Background color for dark mode',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--bg-dark', val);
        }
      },
      // ─── TEXT (LIGHT MODE) ───────────────────────────────────────────────
      { type: 'divider', label: 'Text · Light Mode' },
      {
        id: 'textColorLight',
        label: 'Primary',
        stateKey: 'textColorLight',
        type: 'color',
        default: '#161616',
        hint: 'Main text color in light mode',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--text-color-light', val);
        }
      },
      {
        id: 'textColorLightMuted',
        label: 'Muted',
        stateKey: 'textColorLightMuted',
        type: 'color',
        default: '#2f2f2f',
        hint: 'Secondary/muted text in light mode',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--text-color-light-muted', val);
        }
      },
      
      // ─── TEXT (DARK MODE) ────────────────────────────────────────────────
      { type: 'divider', label: 'Text · Dark Mode' },
      {
        id: 'textColorDark',
        label: 'Primary',
        stateKey: 'textColorDark',
        type: 'color',
        default: '#b3b3b3',
        hint: 'Main text color in dark mode',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--text-color-dark', val);
        }
      },
      {
        id: 'textColorDarkMuted',
        label: 'Muted',
        stateKey: 'textColorDarkMuted',
        type: 'color',
        default: '#808080',
        hint: 'Secondary/muted text in dark mode',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--text-color-dark-muted', val);
        }
      },

      // ─── LINKS ───────────────────────────────────────────────────────────
      { type: 'divider', label: 'Links' },
      {
        id: 'linkHoverColor',
        label: 'Hover Accent',
        stateKey: 'linkHoverColor',
        type: 'color',
        default: '#ff4013',
        hint: 'Link hover color (accent)',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--link-hover-color', val);
        }
      },
      
      // ─── LOGO ────────────────────────────────────────────────────────────
      { type: 'divider', label: 'Logo' },
      {
        id: 'topLogoWidthVw',
        label: 'Logo Size',
        stateKey: 'topLogoWidthVw',
        type: 'range',
        min: 15, max: 45, step: 0.25,
        default: 35,
        format: (v) => `${parseFloat(v).toFixed(2)}vw`,
        parse: parseFloat,
        hint: 'Top-center logo width (clamped by min/max tokens).',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--top-logo-width-vw', String(val));
        }
      },
    ]
  },


  // ═══════════════════════════════════════════════════════════════════════════
  // PORTFOLIO PAGE - Controls removed to protect main page regression
  // (Controls should be implemented within the portfolio page if needed)
  // ═══════════════════════════════════════════════════════════════════════════
  /*
  portfolio: {
    ...
  },
  */

  // ═══════════════════════════════════════════════════════════════════════════
  colorDistribution: {
    title: 'Palette Mix',
    icon: '🧩',
    defaultOpen: false,
    controls: [
      {
        id: 'colorDistribution',
        label: 'Disciplines',
        stateKey: 'colorDistribution',
        type: 'colorDistribution',
        // Labels are fixed; you assign which palette slot + weight each label gets.
        labels: [
          'Product & Systems',
          'Interaction & Motion',
          'Creative Technology',
          'AI-Driven Design',
          'Experience Direction',
          'Art & Visual Direction',
          'Prototyping'
        ],
        hint: 'Assign each discipline to a palette color, then set weights that sum to 100%. Used for all ball spawns across modes.'
      }
    ]
  },

  // Inner shadow removed

  // ═══════════════════════════════════════════════════════════════════════════
  // WALL - Unified Frame & Physics
  // ═══════════════════════════════════════════════════════════════════════════
  wall: {
    title: 'WALL',
    icon: '🫧',
    defaultOpen: false,
    controls: [
      {
        id: 'frameColorLight',
        label: 'Color · Light Mode',
        stateKey: 'frameColorLight',
        type: 'color',
        default: '#242529',
        hint: 'Wall color (unified across all modes, also used for browser chrome)',
        onChange: (g, val) => {
          const root = document.documentElement;
          // Unified wall color: set all variants to the same value
          root.style.setProperty('--frame-color', val);
          root.style.setProperty('--frame-color-light', val);
          root.style.setProperty('--frame-color-dark', val);
          root.style.setProperty('--wall-color', val);
          root.style.setProperty('--wall-color-light', val);
          root.style.setProperty('--wall-color-dark', val);
          root.style.setProperty('--chrome-bg', val);
          root.style.setProperty('--chrome-bg-light', val);
          root.style.setProperty('--chrome-bg-dark', val);
          g.frameColor = val;
          g.frameColorLight = val;
          g.frameColorDark = val;
          // Update browser chrome meta tags (all use unified color)
          const meta = document.querySelector('meta[name="theme-color"]:not([media])');
          if (meta) meta.content = val;
          const metaLight = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
          if (metaLight) metaLight.content = val;
          const metaDark = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
          if (metaDark) metaDark.content = val;
          // Invalidate wall color cache so it picks up the new color immediately
          import('../physics/engine.js').then(mod => {
            mod.syncChromeColor();
          });
        }
      },
      {
        id: 'frameColorDark',
        label: 'Color · Dark Mode',
        stateKey: 'frameColorDark',
        type: 'color',
        default: '#242529',
        hint: 'Wall color (unified across all modes, also used for browser chrome)',
        onChange: (g, val) => {
          const root = document.documentElement;
          // Unified wall color: set all variants to the same value
          root.style.setProperty('--frame-color', val);
          root.style.setProperty('--frame-color-light', val);
          root.style.setProperty('--frame-color-dark', val);
          root.style.setProperty('--wall-color', val);
          root.style.setProperty('--wall-color-light', val);
          root.style.setProperty('--wall-color-dark', val);
          root.style.setProperty('--chrome-bg', val);
          root.style.setProperty('--chrome-bg-light', val);
          root.style.setProperty('--chrome-bg-dark', val);
          g.frameColor = val;
          g.frameColorLight = val;
          g.frameColorDark = val;
          // Update browser chrome meta tags (all use unified color)
          const meta = document.querySelector('meta[name="theme-color"]:not([media])');
          if (meta) meta.content = val;
          const metaLight = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
          if (metaLight) metaLight.content = val;
          const metaDark = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
          if (metaDark) metaDark.content = val;
          // Invalidate wall color cache so it picks up the new color immediately
          import('../physics/engine.js').then(mod => {
            mod.syncChromeColor();
          });
        }
      },
      {
        id: 'wallThicknessVw',
        label: 'Wall Thickness',
        stateKey: 'wallThicknessVw',
        type: 'range',
        min: 0, max: 8, step: 0.1,
        default: 1.3,
        format: v => `${v.toFixed(1)}vw`,
        parse: parseFloat,
        hint: 'Wall tube thickness (content padding is layout-only)',
        onChange: (g, val) => {
          import('../core/state.js').then(mod => {
            mod.applyLayoutFromVwToPx();
            mod.applyLayoutCSSVars();
            // Update overlay blur which depends on wall thickness
            import('./modal-overlay.js').then(({ updateBlurFromWallThickness }) => {
              updateBlurFromWallThickness();
            });
          });
        }
      },
      {
        id: 'wallThicknessAreaMultiplier',
        label: 'Area Scaling',
        stateKey: 'wallThicknessAreaMultiplier',
        type: 'range',
        min: 0, max: 2, step: 0.01,
        default: 0.0,
        format: v => `${v.toFixed(2)}×`,
        parse: parseFloat,
        hint: 'Area-based scaling multiplier (0.0 = vw-only, 1.0 = full area scaling, >1.0 = exaggerated)',
        onChange: (g, val) => {
          import('../core/state.js').then(mod => {
            mod.applyLayoutFromVwToPx();
            mod.applyLayoutCSSVars();
            // Update overlay blur which depends on wall thickness
            import('./modal-overlay.js').then(({ updateBlurFromWallThickness }) => {
              updateBlurFromWallThickness();
            });
          });
        }
      },
      {
        id: 'wallRadiusVw',
        label: 'Corner Radius',
        stateKey: 'wallRadiusVw',
        type: 'range',
        min: 0, max: 12, step: 0.1,
        default: 3.7,
        format: v => `${v.toFixed(1)}vw`,
        parse: parseFloat,
        onChange: (g, val) => {
          import('../core/state.js').then(mod => {
            mod.applyLayoutFromVwToPx();
            mod.applyLayoutCSSVars();
          });
        }
      },
      {
        id: 'wallInset',
        label: 'Collision Inset',
        stateKey: 'wallInset',
        type: 'range',
        min: 0, max: 20, step: 1,
        default: 2,
        format: v => `${v}px`,
        parse: v => parseInt(v, 10),
        hint: 'Physics padding inside the visual wall'
      },
      {
        id: 'mobileWallThicknessXFactor',
        label: 'Mobile L/R Thickness',
        stateKey: 'mobileWallThicknessXFactor',
        type: 'range',
        min: 0.5, max: 3.0, step: 0.05,
        default: 1.4,
        format: v => `${v.toFixed(2)}×`,
        parse: parseFloat,
        hint: 'Wall thickness multiplier for LEFT/RIGHT sides on mobile',
        onChange: (g, val) => {
          import('../core/state.js').then(mod => {
            mod.applyLayoutFromVwToPx();
            mod.applyLayoutCSSVars();
          });
        }
      },
      {
        id: 'mobileEdgeLabelsVisible',
        label: 'Mobile Edge Labels',
        stateKey: 'mobileEdgeLabelsVisible',
        type: 'toggle',
        default: true,
        hint: 'Show side edge labels on mobile (chapter/copyright)',
        onChange: (g, val) => {
          import('../core/state.js').then(mod => {
            mod.applyLayoutCSSVars();
          });
        }
      },
      {
        id: 'mobileEdgeLabelSizeFactor',
        label: 'Mobile Label Size',
        stateKey: 'mobileEdgeLabelSizeFactor',
        type: 'range',
        min: 0.3, max: 2.0, step: 0.05,
        default: 0.85,
        format: v => `${v.toFixed(2)}×`,
        parse: parseFloat,
        hint: 'Font size multiplier for edge labels on mobile',
        onChange: (g, val) => {
          import('../core/state.js').then(mod => {
            mod.applyLayoutCSSVars();
          });
        }
      },
      {
        id: 'mobileEdgeLabelOpacity',
        label: 'Mobile Label Opacity',
        stateKey: 'mobileEdgeLabelOpacity',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.5,
        format: v => `${(v * 100).toFixed(0)}%`,
        parse: parseFloat,
        hint: 'Opacity for edge labels on mobile',
        onChange: (g, val) => {
          import('../core/state.js').then(mod => {
            mod.applyLayoutCSSVars();
          });
        }
      },
      
      // ═══════════════════════════════════════════════════════════════════
      // WALL RUMBLE - Viewport shake on impacts (pit, flies, weightless, fountain only)
      // ═══════════════════════════════════════════════════════════════════
      {
        id: 'wallRumbleEnabled',
        label: 'Rumble',
        stateKey: 'wallRumbleEnabled',
        type: 'toggle',
        default: true,
        group: 'Wall Rumble',
        hint: 'Viewport shake on impacts (pit, flies, zero-g, fountain only)'
      },
      {
        id: 'wallRumblePreset',
        label: 'Preset',
        stateKey: 'wallRumblePreset',
        type: 'select',
        options: [
          { value: 'subtle', label: 'Subtle — barely perceptible' },
          { value: 'rubber', label: 'Rubber — thick absorption (default)' },
          { value: 'soft', label: 'Soft — gentle cushion' },
          { value: 'responsive', label: 'Responsive — more feedback' }
        ],
        default: 'rubber',
        format: v => String(v),
        parse: v => String(v),
        group: 'Wall Rumble',
        hint: 'Thick rubber wall feel',
        onChange: (g, value) => {
          import('../physics/wall-state.js').then(({ applyRumblePreset }) => {
            applyRumblePreset(value);
          });
        }
      },
      {
        id: 'wallRumbleThreshold',
        label: 'Threshold',
        stateKey: 'wallRumbleThreshold',
        type: 'range',
        min: 100, max: 400, step: 10,
        default: 350,
        format: v => `${v} px/s`,
        parse: v => parseInt(v, 10),
        group: 'Wall Rumble',
        hint: 'Impact force needed (higher = less sensitive)'
      },
      {
        id: 'wallRumbleMax',
        label: 'Max Wobble',
        stateKey: 'wallRumbleMax',
        type: 'range',
        min: 0.5, max: 5, step: 0.1,
        default: 1.5,
        format: v => `${v}px`,
        parse: parseFloat,
        group: 'Wall Rumble',
        hint: 'Maximum displacement (thick rubber = small)'
      },
      {
        id: 'wallRumbleDecay',
        label: 'Absorption',
        stateKey: 'wallRumbleDecay',
        type: 'range',
        min: 0.70, max: 0.92, step: 0.01,
        default: 0.75,
        format: v => v.toFixed(2),
        parse: parseFloat,
        group: 'Wall Rumble',
        hint: 'Lower = faster absorption, higher = longer wobble'
      },
      
      // ═══════════════════════════════════════════════════════════════════
      // WALL SHADOW - Full control depth effect system
      // ═══════════════════════════════════════════════════════════════════
      {
        id: 'wallShadowPreset',
        label: 'Preset',
        stateKey: 'wallShadowPreset',
        type: 'select',
        options: Object.keys(WALL_SHADOW_PRESETS).map(k => ({ value: k, label: WALL_SHADOW_PRESETS[k].label })),
        default: 'naturalDaylight',
        format: v => WALL_SHADOW_PRESETS[v]?.label || v,
        group: 'Wall Shadow',
        hint: 'Realistic shadow configurations',
        onChange: (g, value) => {
          applyWallShadowPreset(value);
        }
      },
      
      // ─── CORE ───
      { type: 'divider', label: 'Core', group: 'Wall Shadow' },
      {
        id: 'wallShadowLayers',
        label: 'Layers',
        stateKey: 'wallShadowLayers',
        type: 'range',
        min: 1, max: 12, step: 1,
        default: 5,
        format: v => `${Math.round(v)}`,
        parse: v => parseInt(v, 10),
        group: 'Wall Shadow',
        hint: 'Total shadow layers (more = smoother, heavier)',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowAngle',
        label: 'Light Angle',
        stateKey: 'wallShadowAngle',
        type: 'range',
        min: 0, max: 360, step: 1,
        default: 160,
        format: v => `${v}°`,
        parse: v => parseInt(v, 10),
        group: 'Wall Shadow',
        hint: 'Light source direction (0° = top, 90° = right)',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowDistance',
        label: 'Distance',
        stateKey: 'wallShadowDistance',
        type: 'range',
        min: 0, max: 80, step: 1,
        default: 10,
        format: v => `${v}px`,
        parse: v => parseInt(v, 10),
        group: 'Wall Shadow',
        hint: 'Shadow offset from light source',
        onChange: (g) => updateWallShadowCSS(g)
      },
      
      // ─── FALLOFF CURVE ───
      { type: 'divider', label: 'Falloff', group: 'Wall Shadow' },
      {
        id: 'wallShadowFalloffCurve',
        label: 'Curve',
        stateKey: 'wallShadowFalloffCurve',
        type: 'range',
        min: 0.5, max: 4, step: 0.1,
        default: 2.0,
        format: v => v.toFixed(1),
        parse: parseFloat,
        group: 'Wall Shadow',
        hint: 'Opacity falloff power (1=linear, 2=quadratic, 3=cubic)',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowFalloffFactor',
        label: 'Factor',
        stateKey: 'wallShadowFalloffFactor',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.7,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Wall Shadow',
        hint: 'How quickly opacity fades (0=none, 100%=full decay)',
        onChange: (g) => updateWallShadowCSS(g)
      },
      
      // ─── OUTSET (EXTERNAL SHADOW) ───
      { type: 'divider', label: 'Outset Shadow', group: 'Wall Shadow' },
      {
        id: 'wallShadowOutsetIntensity',
        label: 'Intensity',
        stateKey: 'wallShadowOutsetIntensity',
        type: 'range',
        min: 0, max: 3, step: 0.05,
        default: 1.0,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Wall Shadow',
        hint: 'Overall outset shadow strength',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowOutsetOpacity',
        label: 'Base Opacity',
        stateKey: 'wallShadowOutsetOpacity',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.25,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Wall Shadow',
        hint: 'Starting opacity for closest layer',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowOutsetBlurMin',
        label: 'Blur Min',
        stateKey: 'wallShadowOutsetBlurMin',
        type: 'range',
        min: 0, max: 50, step: 1,
        default: 4,
        format: v => `${v}px`,
        parse: v => parseInt(v, 10),
        group: 'Wall Shadow',
        hint: 'Blur for closest layer',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowOutsetBlurMax',
        label: 'Blur Max',
        stateKey: 'wallShadowOutsetBlurMax',
        type: 'range',
        min: 10, max: 300, step: 5,
        default: 120,
        format: v => `${v}px`,
        parse: v => parseInt(v, 10),
        group: 'Wall Shadow',
        hint: 'Blur for furthest layer',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowOutsetSpreadMin',
        label: 'Spread Min',
        stateKey: 'wallShadowOutsetSpreadMin',
        type: 'range',
        min: -20, max: 20, step: 1,
        default: 0,
        format: v => `${v}px`,
        parse: v => parseInt(v, 10),
        group: 'Wall Shadow',
        hint: 'Spread for closest layer (negative = shrink)',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowOutsetSpreadMax',
        label: 'Spread Max',
        stateKey: 'wallShadowOutsetSpreadMax',
        type: 'range',
        min: 0, max: 100, step: 1,
        default: 30,
        format: v => `${v}px`,
        parse: v => parseInt(v, 10),
        group: 'Wall Shadow',
        hint: 'Spread for furthest layer',
        onChange: (g) => updateWallShadowCSS(g)
      },
      
      // ─── INSET (VIGNETTE) ───
      { type: 'divider', label: 'Inset Vignette', group: 'Wall Shadow' },
      {
        id: 'wallShadowInsetIntensity',
        label: 'Intensity',
        stateKey: 'wallShadowInsetIntensity',
        type: 'range',
        min: 0, max: 3, step: 0.05,
        default: 0.8,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Wall Shadow',
        hint: 'Overall inset vignette strength',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowInsetOpacity',
        label: 'Base Opacity',
        stateKey: 'wallShadowInsetOpacity',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.15,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Wall Shadow',
        hint: 'Starting opacity for inner vignette',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowInsetLayerRatio',
        label: 'Layer Ratio',
        stateKey: 'wallShadowInsetLayerRatio',
        type: 'range',
        min: 0, max: 1.5, step: 0.1,
        default: 0.6,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Wall Shadow',
        hint: 'Inset layers as % of outset layers',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowInsetBlurMin',
        label: 'Blur Min',
        stateKey: 'wallShadowInsetBlurMin',
        type: 'range',
        min: 0, max: 50, step: 1,
        default: 8,
        format: v => `${v}px`,
        parse: v => parseInt(v, 10),
        group: 'Wall Shadow',
        hint: 'Blur for inner edge',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowInsetBlurMax',
        label: 'Blur Max',
        stateKey: 'wallShadowInsetBlurMax',
        type: 'range',
        min: 10, max: 250, step: 5,
        default: 100,
        format: v => `${v}px`,
        parse: v => parseInt(v, 10),
        group: 'Wall Shadow',
        hint: 'Blur for outer vignette edge',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowInsetSpreadMin',
        label: 'Spread Min',
        stateKey: 'wallShadowInsetSpreadMin',
        type: 'range',
        min: -20, max: 20, step: 1,
        default: 0,
        format: v => `${v}px`,
        parse: v => parseInt(v, 10),
        group: 'Wall Shadow',
        hint: 'Spread for inner edge',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowInsetSpreadMax',
        label: 'Spread Max',
        stateKey: 'wallShadowInsetSpreadMax',
        type: 'range',
        min: 0, max: 80, step: 1,
        default: 20,
        format: v => `${v}px`,
        parse: v => parseInt(v, 10),
        group: 'Wall Shadow',
        hint: 'Spread for outer vignette edge',
        onChange: (g) => updateWallShadowCSS(g)
      },
      
      // ─── COLORS ───
      { type: 'divider', label: 'Colors', group: 'Wall Shadow' },
      {
        id: 'wallShadowColorLight',
        label: 'Light Mode',
        stateKey: 'wallShadowColorLight',
        type: 'color',
        default: '#ffffff',
        group: 'Wall Shadow',
        hint: 'Glow/highlight color (lighter than background)',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowColorDark',
        label: 'Dark Mode',
        stateKey: 'wallShadowColorDark',
        type: 'color',
        default: '#000000',
        group: 'Wall Shadow',
        hint: 'Shadow color (darker than background)',
        onChange: (g) => updateWallShadowCSS(g)
      },
      {
        id: 'wallShadowLightModeBoost',
        label: 'Light Mode Boost',
        stateKey: 'wallShadowLightModeBoost',
        type: 'range',
        min: 1.0, max: 8.0, step: 0.25,
        default: 3.0,
        format: v => `${v.toFixed(1)}×`,
        parse: parseFloat,
        group: 'Wall Shadow',
        hint: 'Opacity multiplier for light mode (compensates for low contrast)',
        onChange: (g) => updateWallShadowCSS(g)
      },
      
      {
        id: 'restitution',
        label: 'Bounce',
        stateKey: 'restitution',
        type: 'range',
        min: 0.3, max: 0.95, step: 0.05,
        default: 0.70,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Wall Material',
        hint: 'Energy kept on bounce. 100% = elastic, 30% = soft'
      },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOISE - Texture overlay
  // ═══════════════════════════════════════════════════════════════════════════
  noise: {
    title: 'Grain',
    icon: '🧂',
    defaultOpen: false,
    controls: [
      {
        id: 'noiseEnabled',
        label: 'Enabled',
        stateKey: 'noiseEnabled',
        type: 'checkbox',
        default: true,
        format: v => (v ? 'On' : 'Off'),
        parse: v => !!v,
        group: 'Render',
        hint: 'Procedural noise texture (no GIF).',
        onChange: (_g, val) => applyNoiseSystem({ noiseEnabled: val })
      },
      {
        id: 'noiseSeed',
        label: 'Seed',
        stateKey: 'noiseSeed',
        type: 'range',
        min: 0, max: 999999, step: 1,
        default: 1337,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        group: 'Texture',
        hint: 'Changes the generated grain pattern.',
        onChange: (_g, val) => applyNoiseSystem({ noiseSeed: val })
      },
      {
        id: 'noiseTextureSize',
        label: 'Tile Size',
        stateKey: 'noiseTextureSize',
        type: 'range',
        min: 64, max: 512, step: 32,
        default: 256,
        format: v => `${Math.round(v)} px`,
        parse: v => parseInt(v, 10),
        group: 'Texture',
        hint: 'Bigger tiles reduce repetition but cost more memory.',
        onChange: (_g, val) => applyNoiseSystem({ noiseTextureSize: val })
      },
      {
        id: 'noiseDistribution',
        label: 'Distribution',
        stateKey: 'noiseDistribution',
        type: 'select',
        options: [
          { value: 'gaussian', label: 'Gaussian (filmic)' },
          { value: 'uniform', label: 'Uniform (flat)' }
        ],
        default: 'gaussian',
        format: v => String(v),
        parse: v => String(v),
        group: 'Texture',
        onChange: (_g, val) => applyNoiseSystem({ noiseDistribution: val })
      },
      {
        id: 'noiseMonochrome',
        label: 'Monochrome',
        stateKey: 'noiseMonochrome',
        type: 'checkbox',
        default: true,
        format: v => (v ? 'On' : 'Off'),
        parse: v => !!v,
        group: 'Texture',
        hint: 'Off = subtle RGB grain.',
        onChange: (_g, val) => applyNoiseSystem({ noiseMonochrome: val })
      },
      {
        id: 'noiseChroma',
        label: 'Chroma',
        stateKey: 'noiseChroma',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.9,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Texture',
        hint: 'How different R/G/B channels are (ignored when Monochrome is on).',
        onChange: (_g, val) => applyNoiseSystem({ noiseChroma: val })
      },
      {
        id: 'noiseSize',
        label: 'Grain Size',
        stateKey: 'noiseSize',
        type: 'range',
        min: 20, max: 600, step: 5,
        default: 85,
        format: v => `${Math.round(v)} px`,
        parse: v => parseInt(v, 10),
        group: 'Layer',
        onChange: (_g, val) => applyNoiseSystem({ noiseSize: val })
      },
      {
        id: 'noiseOpacityLight',
        label: 'Opacity (Light)',
        stateKey: 'noiseOpacityLight',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.08,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Layer',
        onChange: (_g, val) => applyNoiseSystem({ noiseOpacityLight: val })
      },
      {
        id: 'noiseOpacityDark',
        label: 'Opacity (Dark)',
        stateKey: 'noiseOpacityDark',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.12,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Layer',
        onChange: (_g, val) => applyNoiseSystem({ noiseOpacityDark: val })
      },
      {
        id: 'noiseBlendMode',
        label: 'Blend Mode',
        stateKey: 'noiseBlendMode',
        type: 'select',
        options: [
          { value: 'normal', label: 'Normal (Off)' },
          { value: 'multiply', label: 'Multiply' },
          { value: 'screen', label: 'Screen' },
          { value: 'overlay', label: 'Overlay' },
          { value: 'darken', label: 'Darken' },
          { value: 'lighten', label: 'Lighten' },
          { value: 'color-dodge', label: 'Color Dodge' },
          { value: 'color-burn', label: 'Color Burn' },
          { value: 'hard-light', label: 'Hard Light' },
          { value: 'soft-light', label: 'Soft Light' },
          { value: 'difference', label: 'Difference' },
          { value: 'exclusion', label: 'Exclusion' }
        ],
        default: 'normal',
        format: v => String(v),
        parse: v => String(v),
        group: 'Layer',
        onChange: (_g, val) => applyNoiseSystem({ noiseBlendMode: val })
      },
      {
        id: 'noiseColorLight',
        label: 'Color (Light)',
        stateKey: 'noiseColorLight',
        type: 'color',
        default: '#ffffff',
        format: v => String(v),
        parse: v => String(v),
        group: 'Layer',
        onChange: (_g, val) => applyNoiseSystem({ noiseColorLight: val })
      },
      {
        id: 'noiseColorDark',
        label: 'Color (Dark)',
        stateKey: 'noiseColorDark',
        type: 'color',
        default: '#ffffff',
        format: v => String(v),
        parse: v => String(v),
        group: 'Layer',
        onChange: (_g, val) => applyNoiseSystem({ noiseColorDark: val })
      },
      {
        id: 'noiseMotion',
        label: 'Motion',
        stateKey: 'noiseMotion',
        type: 'select',
        options: [
          { value: 'jitter', label: 'Jitter (film grain)' },
          { value: 'drift', label: 'Drift (slow pan)' },
          { value: 'static', label: 'Static' }
        ],
        default: 'jitter',
        format: v => String(v),
        parse: v => String(v),
        group: 'Motion',
        onChange: (_g, val) => applyNoiseSystem({ noiseMotion: val })
      },
      {
        id: 'noiseMotionAmount',
        label: 'Motion Amount',
        stateKey: 'noiseMotionAmount',
        type: 'range',
        min: 0, max: 2.5, step: 0.01,
        default: 1.0,
        format: v => `${v.toFixed(2)}x`,
        parse: parseFloat,
        group: 'Motion',
        onChange: (_g, val) => applyNoiseSystem({ noiseMotionAmount: val })
      },
      {
        id: 'noiseSpeedMs',
        label: 'Speed',
        stateKey: 'noiseSpeedMs',
        type: 'range',
        min: 0, max: 10000, step: 50,
        default: 1100,
        format: v => `${Math.round(v)} ms`,
        parse: v => parseInt(v, 10),
        group: 'Motion',
        onChange: (_g, val) => applyNoiseSystem({ noiseSpeedMs: val })
      },
      {
        id: 'noiseSpeedVariance',
        label: 'Timing Variance',
        stateKey: 'noiseSpeedVariance',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Motion',
        hint: 'Adds randomness to animation timing (0 = no variance, 1 = max variance)',
        onChange: (_g, val) => applyNoiseSystem({ noiseSpeedVariance: val })
      },
      {
        id: 'noiseFlicker',
        label: 'Flicker',
        stateKey: 'noiseFlicker',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.12,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Motion',
        onChange: (_g, val) => applyNoiseSystem({ noiseFlicker: val })
      },
      {
        id: 'noiseFlickerSpeedMs',
        label: 'Flicker Speed',
        stateKey: 'noiseFlickerSpeedMs',
        type: 'range',
        min: 0, max: 5000, step: 20,
        default: 220,
        format: v => `${Math.round(v)} ms`,
        parse: v => parseInt(v, 10),
        group: 'Motion',
        onChange: (_g, val) => applyNoiseSystem({ noiseFlickerSpeedMs: val })
      },
      {
        id: 'noiseBlurPx',
        label: 'Blur',
        stateKey: 'noiseBlurPx',
        type: 'range',
        min: 0, max: 6, step: 0.05,
        default: 0,
        format: v => `${v.toFixed(2)} px`,
        parse: parseFloat,
        group: 'Look',
        onChange: (_g, val) => applyNoiseSystem({ noiseBlurPx: val })
      },
      {
        id: 'noiseContrast',
        label: 'Contrast',
        stateKey: 'noiseContrast',
        type: 'range',
        min: 0.25, max: 3, step: 0.05,
        default: 1.35,
        format: v => `${v.toFixed(2)}x`,
        parse: parseFloat,
        group: 'Look',
        onChange: (_g, val) => applyNoiseSystem({ noiseContrast: val })
      },
      {
        id: 'noiseBrightness',
        label: 'Brightness',
        stateKey: 'noiseBrightness',
        type: 'range',
        min: 0.25, max: 2.0, step: 0.01,
        default: 1.0,
        format: v => `${v.toFixed(2)}x`,
        parse: parseFloat,
        group: 'Look',
        onChange: (_g, val) => applyNoiseSystem({ noiseBrightness: val })
      },
      {
        id: 'noiseSaturation',
        label: 'Saturation',
        stateKey: 'noiseSaturation',
        type: 'range',
        min: 0, max: 3, step: 0.01,
        default: 1.0,
        format: v => `${v.toFixed(2)}x`,
        parse: parseFloat,
        group: 'Look',
        onChange: (_g, val) => applyNoiseSystem({ noiseSaturation: val })
      },
      {
        id: 'noiseHue',
        label: 'Hue Rotate',
        stateKey: 'noiseHue',
        type: 'range',
        min: 0, max: 360, step: 1,
        default: 0,
        format: v => `${Math.round(v)}°`,
        parse: v => parseInt(v, 10),
        group: 'Look',
        onChange: (_g, val) => applyNoiseSystem({ noiseHue: val })
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE-SPECIFIC CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  critters: {
    title: 'Hive',
    icon: '🐝',
    mode: 'critters',
    defaultOpen: false,
    controls: [
      // ─────────────────────────────────────────────────────────────────────────
      // POPULATION
      // ─────────────────────────────────────────────────────────────────────────
      { type: 'divider', label: 'Population' },
      {
        id: 'critterCount',
        label: 'Count',
        stateKey: 'critterCount',
        type: 'range',
        min: 10, max: 260, step: 5,
        default: 90,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      // ─────────────────────────────────────────────────────────────────────────
      // MOVEMENT
      // ─────────────────────────────────────────────────────────────────────────
      { type: 'divider', label: 'Movement' },
      {
        id: 'critterSpeed',
        label: 'Speed',
        stateKey: 'critterSpeed',
        type: 'range',
        min: 0, max: 1800, step: 10,
        default: 680,
        format: v => `${Math.round(v)}`
        ,
        parse: parseFloat
      },
      {
        id: 'critterMaxSpeed',
        label: 'Max Speed',
        stateKey: 'critterMaxSpeed',
        type: 'range',
        min: 200, max: 4000, step: 25,
        default: 1400,
        format: v => `${Math.round(v)}`
        ,
        parse: parseFloat
      },
      {
        id: 'critterStepHz',
        label: 'Step Rate',
        stateKey: 'critterStepHz',
        type: 'range',
        min: 0, max: 16, step: 0.1,
        default: 5.0,
        format: v => v.toFixed(1) + ' Hz',
        parse: parseFloat
      },
      {
        id: 'critterStepSharpness',
        label: 'Step Sharpness',
        stateKey: 'critterStepSharpness',
        type: 'range',
        min: 0.5, max: 6.0, step: 0.1,
        default: 2.4,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      {
        id: 'critterTurnNoise',
        label: 'Wander',
        stateKey: 'critterTurnNoise',
        type: 'range',
        min: 0, max: 8, step: 0.1,
        default: 2.2,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      {
        id: 'critterTurnDamp',
        label: 'Turn Inertia',
        stateKey: 'critterTurnDamp',
        type: 'range',
        min: 0.5, max: 30, step: 0.5,
        default: 10.0,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      {
        id: 'critterTurnSeek',
        label: 'Steering',
        stateKey: 'critterTurnSeek',
        type: 'range',
        min: 0, max: 30, step: 0.5,
        default: 10.0,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      // ─────────────────────────────────────────────────────────────────────────
      // AVOIDANCE
      // ─────────────────────────────────────────────────────────────────────────
      { type: 'divider', label: 'Avoidance' },
      {
        id: 'critterAvoidRadius',
        label: 'Avoid Radius',
        stateKey: 'critterAvoidRadius',
        type: 'range',
        min: 0, max: 260, step: 5,
        default: 90,
        format: v => `${Math.round(v)}px`,
        parse: parseFloat
      },
      {
        id: 'critterAvoidForce',
        label: 'Avoid Force',
        stateKey: 'critterAvoidForce',
        type: 'range',
        min: 0, max: 25000, step: 250,
        default: 9500,
        format: v => String(Math.round(v)),
        parse: parseFloat
      },
      {
        id: 'critterEdgeAvoid',
        label: 'Edge Avoid',
        stateKey: 'critterEdgeAvoid',
        type: 'range',
        min: 0, max: 3, step: 0.05,
        default: 1.0,
        format: v => v.toFixed(2) + 'x',
        parse: parseFloat
      },
      // ─────────────────────────────────────────────────────────────────────────
      // MOUSE INTERACTION
      // ─────────────────────────────────────────────────────────────────────────
      { type: 'divider', label: 'Mouse Interaction' },
      {
        id: 'critterMousePull',
        label: 'Mouse Fear',
        stateKey: 'critterMousePull',
        type: 'range',
        min: 0, max: 4, step: 0.05,
        default: 1.0,
        format: v => v.toFixed(2) + 'x',
        parse: parseFloat,
        hint: 'Flee strength inside the mouse zone'
      },
      {
        id: 'critterMouseRadiusVw',
        label: 'Mouse Zone',
        stateKey: 'critterMouseRadiusVw',
        type: 'range',
        min: 0, max: 80, step: 1,
        default: 30,
        format: v => `${Math.round(v)}vw`,
        parse: parseFloat
      },
      // ─────────────────────────────────────────────────────────────────────────
      // PHYSICS
      // ─────────────────────────────────────────────────────────────────────────
      { type: 'divider', label: 'Physics' },
      {
        id: 'critterRestitution',
        label: 'Bounciness',
        stateKey: 'critterRestitution',
        type: 'range',
        min: 0, max: 0.6, step: 0.01,
        default: 0.18,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Mode-only override',
        onChange: (g, val) => {
          if (g.currentMode === 'critters') g.REST = val;
        }
      },
      {
        id: 'critterFriction',
        label: 'Friction',
        stateKey: 'critterFriction',
        type: 'range',
        min: 0, max: 0.06, step: 0.001,
        default: 0.018,
        format: v => v.toFixed(3),
        parse: parseFloat,
        hint: 'Mode-only override',
        onChange: (g, val) => {
          if (g.currentMode === 'critters') g.FRICTION = val;
        }
      },
      // ─────────────────────────────────────────────────────────────────────────
      // HIVE BEHAVIOR
      // ─────────────────────────────────────────────────────────────────────────
      { type: 'divider', label: 'Hive Behavior' },
      {
        id: 'critterHiveStirInterval',
        label: 'Hive Stir Interval',
        stateKey: 'critterHiveStirInterval',
        type: 'range',
        min: 1, max: 15, step: 0.5,
        default: 5.0,
        format: v => v.toFixed(1) + 's',
        parse: parseFloat,
        hint: 'Seconds between activity waves'
      },
      {
        id: 'critterHiveStirStrength',
        label: 'Hive Stir Strength',
        stateKey: 'critterHiveStirStrength',
        type: 'range',
        min: 0, max: 6, step: 0.1,
        default: 2.5,
        format: v => v.toFixed(1) + 'x',
        parse: parseFloat,
        hint: 'Force of activity waves'
      },
      {
        id: 'critterHiveWaveSpeed',
        label: 'Hive Wave Speed',
        stateKey: 'critterHiveWaveSpeed',
        type: 'range',
        min: 0.1, max: 1.0, step: 0.05,
        default: 0.4,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'How fast stir wave expands'
      },
      // ─────────────────────────────────────────────────────────────────────────
      // CHARACTER TRAITS
      // ─────────────────────────────────────────────────────────────────────────
      { type: 'divider', label: 'Character Traits' },
      {
        id: 'critterNervousnessMin',
        label: 'Nervousness (Min)',
        stateKey: 'critterNervousnessMin',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.4,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Minimum startle sensitivity',
        reinitMode: true
      },
      {
        id: 'critterNervousnessMax',
        label: 'Nervousness (Max)',
        stateKey: 'critterNervousnessMax',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 1.0,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Maximum startle sensitivity',
        reinitMode: true
      },
      {
        id: 'critterCuriosityBias',
        label: 'Curiosity Bias',
        stateKey: 'critterCuriosityBias',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.5,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: '0=stay put, 1=explore edges',
        reinitMode: true
      },
      // ─────────────────────────────────────────────────────────────────────────
      // JOURNEY POINTS
      // ─────────────────────────────────────────────────────────────────────────
      { type: 'divider', label: 'Journey Points' },
      {
        id: 'hiveJourneyPointCount',
        label: 'Point Count',
        stateKey: 'hiveJourneyPointCount',
        type: 'range',
        min: 1, max: 8, step: 1,
        default: 4,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        hint: 'Number of goal destinations scattered across viewport',
        reinitMode: true
      },
      {
        id: 'hiveJourneyPointMargin',
        label: 'Point Margin',
        stateKey: 'hiveJourneyPointMargin',
        type: 'range',
        min: 0, max: 0.2, step: 0.01,
        default: 0.05,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Margin from edges for journey point placement',
        reinitMode: true
      },
      {
        id: 'hiveGoalAttractionStrength',
        label: 'Goal Attraction',
        stateKey: 'hiveGoalAttractionStrength',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.25,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'How strongly critters steer toward goals'
      },
      {
        id: 'hiveGoalSwitchMinS',
        label: 'Goal Switch (Min)',
        stateKey: 'hiveGoalSwitchMinS',
        type: 'range',
        min: 1, max: 20, step: 0.5,
        default: 4,
        format: v => v.toFixed(1) + 's',
        parse: parseFloat,
        hint: 'Minimum seconds before switching to new goal'
      },
      {
        id: 'hiveGoalSwitchMaxS',
        label: 'Goal Switch (Max)',
        stateKey: 'hiveGoalSwitchMaxS',
        type: 'range',
        min: 5, max: 30, step: 0.5,
        default: 14,
        format: v => v.toFixed(1) + 's',
        parse: parseFloat,
        hint: 'Maximum seconds before switching to new goal'
      },
      {
        id: 'hiveGoalReachedRadius',
        label: 'Goal Reached Radius',
        stateKey: 'hiveGoalReachedRadius',
        type: 'range',
        min: 10, max: 200, step: 5,
        default: 50,
        format: v => `${Math.round(v)}px`,
        parse: parseFloat,
        hint: 'Distance threshold to consider goal reached'
      },
      {
        id: 'hivePathAdherence',
        label: 'Path Adherence',
        stateKey: 'hivePathAdherence',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.5,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Probability to pick next sequential point vs random'
      },
      // ─────────────────────────────────────────────────────────────────────────
      // WAYPOINT APPEARANCE
      // ─────────────────────────────────────────────────────────────────────────
      { type: 'divider', label: 'Waypoint Appearance' },
      {
        id: 'hiveWaypointVisible',
        label: 'Show Waypoints',
        stateKey: 'hiveWaypointVisible',
        type: 'checkbox',
        default: true,
        hint: 'Display colored balls at journey point locations'
      },
      {
        id: 'hiveWaypointSizeMul',
        label: 'Waypoint Size',
        stateKey: 'hiveWaypointSizeMul',
        type: 'range',
        min: 0.5, max: 3, step: 0.1,
        default: 1.5,
        format: v => `${v.toFixed(1)}×`,
        parse: parseFloat,
        hint: 'Size multiplier for waypoint balls (relative to base ball size)'
      },
      {
        id: 'hiveWaypointOpacity',
        label: 'Waypoint Opacity',
        stateKey: 'hiveWaypointOpacity',
        type: 'range',
        min: 0.1, max: 1, step: 0.05,
        default: 0.9,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Opacity of waypoint balls'
      },
      {
        id: 'hiveCritterSaturation',
        label: 'Critter Saturation',
        stateKey: 'hiveCritterSaturation',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.3,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Color saturation for critters (low = faint, high = vibrant)',
        reinitMode: true
      },
      warmupFramesControl('crittersWarmupFrames')
    ]
  },

  pit: {
    title: 'Ball Pit',
    icon: '🎯',
    mode: 'pit',
    defaultOpen: false,
    controls: [
      {
        id: 'gravityPit',
        label: 'Gravity',
        stateKey: 'gravityMultiplierPit',
        type: 'range',
        min: 0, max: 2, step: 0.05,
        default: 1.1,
        format: v => v.toFixed(2),
        parse: parseFloat,
        onChange: (g, val) => {
          if (g.currentMode === 'pit') g.G = g.GE * val;
        }
      },
      // NOTE: Ball mass / restitution / friction are global now (see Physics section).
      // Pit remains responsible for gravity + interaction tuning.
      {
        id: 'repelPower',
        label: 'Repel Power',
        stateKey: 'repelPower',
        type: 'range',
        min: 0, max: 10000, step: 100,
        default: 8500,
        format: v => Math.round(v).toString(),
        parse: parseFloat,
        // Custom exponential mapping
        onChange: (g, sliderVal) => {
          const s = Math.max(0, Math.min(10000, sliderVal)) / 10000;
          g.repelPower = Math.pow(2, (s - 0.5) * 12) * 12000 * 2.0;
        }
      },
      {
        id: 'sleepVelocityThreshold',
        label: 'Sleep Speed',
        stateKey: 'sleepVelocityThreshold',
        type: 'range',
        min: 0, max: 40, step: 0.5,
        default: 12,
        format: v => `${Number(v).toFixed(1)} px/s`,
        parse: parseFloat,
        hint: 'Pit modes only. Higher = settles sooner.'
      },
      {
        id: 'sleepAngularThreshold',
        label: 'Sleep Spin',
        stateKey: 'sleepAngularThreshold',
        type: 'range',
        min: 0, max: 1.0, step: 0.01,
        default: 0.18,
        format: v => `${Number(v).toFixed(2)} rad/s`,
        parse: parseFloat,
        hint: 'Pit modes only. Higher = stops spinning sooner.'
      },
      {
        id: 'timeToSleep',
        label: 'Sleep Time',
        stateKey: 'timeToSleep',
        type: 'range',
        min: 0.05, max: 2.0, step: 0.05,
        default: 0.25,
        format: v => `${Number(v).toFixed(2)}s`,
        parse: parseFloat,
        hint: 'Pit modes only. Lower = sleeps faster.'
      },
      warmupFramesControl('pitWarmupFrames')
    ]
  },

  flies: {
    title: 'Flies',
    icon: '🕊️',
    mode: 'flies',
    defaultOpen: false,
    controls: [
      {
        id: 'fliesBallCount',
        label: 'Ball Count',
        stateKey: 'fliesBallCount',
        type: 'range',
        min: 20, max: 150, step: 5,
        default: 60,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'attractPower',
        label: 'Attraction',
        stateKey: 'attractionPower',
        type: 'range',
        min: 100, max: 8000, step: 50,
        default: 5000,
        format: v => Math.round(v).toString(),
        parse: parseFloat
      },
      {
        id: 'swarmSpeed',
        label: 'Swarm Speed',
        stateKey: 'swarmSpeed',
        type: 'range',
        min: 0.2, max: 5, step: 0.1,
        default: 0.4,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      {
        id: 'fliesSeparation',
        label: 'Separation',
        stateKey: 'fliesSeparation',
        type: 'range',
        min: 5000, max: 30000, step: 1000,
        default: 15000,
        format: v => Math.round(v).toString(),
        parse: parseFloat
      },
      warmupFramesControl('fliesWarmupFrames')
    ]
  },

  weightless: {
    title: 'Zero-G',
    icon: '🌌',
    mode: 'weightless',
    defaultOpen: false,
    controls: [
      {
        id: 'weightlessCount',
        label: 'Ball Count',
        stateKey: 'weightlessCount',
        type: 'range',
        min: 20, max: 200, step: 10,
        default: 66,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'weightlessSpeed',
        label: 'Initial Speed',
        stateKey: 'weightlessInitialSpeed',
        type: 'range',
        min: 100, max: 600, step: 25,
        default: 250,
        format: v => v.toFixed(0),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'weightlessBounce',
        label: 'Bounce',
        stateKey: 'weightlessBounce',
        type: 'range',
        min: 0.5, max: 1, step: 0.05,
        default: 0.70,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'weightlessRepelPower',
        label: 'Cursor Blast Power',
        stateKey: 'weightlessRepelPower',
        type: 'range',
        min: 0, max: 600000, step: 10000,
        default: 50000,
        format: v => Math.round(v).toString(),
        parse: parseFloat
      },
      {
        id: 'weightlessRepelSoft',
        label: 'Cursor Blast Falloff',
        stateKey: 'weightlessRepelSoft',
        type: 'range',
        min: 0.5, max: 6.0, step: 0.1,
        default: 5.4,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      warmupFramesControl('weightlessWarmupFrames')
    ]
  },

  water: {
    title: 'Water',
    icon: '🌊',
    mode: 'water',
    defaultOpen: false,
    controls: [
      {
        id: 'waterBallCount',
        label: 'Ball Count',
        stateKey: 'waterBallCount',
        type: 'range',
        min: 200, max: 1800, step: 10,
        default: 1000,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'waterDrag',
        label: 'Water Resistance',
        stateKey: 'waterDrag',
        type: 'range',
        min: 0.001, max: 0.15, step: 0.001,
        default: 0.12,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      {
        id: 'waterRippleStrength',
        label: 'Ripple Strength',
        stateKey: 'waterRippleStrength',
        type: 'range',
        min: 1000, max: 15000, step: 500,
        default: 6000,
        format: v => v.toFixed(0),
        parse: parseFloat
      },
      {
        id: 'waterMotion',
        label: 'Drift Strength',
        stateKey: 'waterDriftStrength',
        type: 'range',
        min: 0, max: 80, step: 1,
        default: 40,
        format: v => v.toFixed(0),
        parse: parseFloat,
        onChange: (g, val) => {
          g.waterInitialVelocity = val * 5;
        },
        reinitMode: true
      },
      warmupFramesControl('waterWarmupFrames')
    ]
  },

  vortex: {
    title: 'Electrons',
    icon: '⚛️',
    mode: 'vortex',
    defaultOpen: false,
    controls: [
      {
        id: 'vortexBallCount',
        label: 'Ball Count',
        stateKey: 'vortexBallCount',
        type: 'range',
        min: 50, max: 500, step: 10,
        default: 180,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'vortexSwirl',
        label: 'Orbital Strength',
        stateKey: 'vortexSwirlStrength',
        type: 'range',
        min: 100, max: 3000, step: 50,
        default: 420,
        format: v => v.toFixed(0),
        parse: parseFloat,
        tooltip: 'Electromagnetic force strength binding electrons to nucleus'
      },
      {
        id: 'vortexRadius',
        label: 'Shell Radius',
        stateKey: 'vortexRadius',
        type: 'range',
        min: 0, max: 800, step: 20,
        default: 300,
        format: v => v === 0 ? 'Auto-scale' : v.toFixed(0) + 'px',
        parse: parseFloat,
        tooltip: 'Base radius for electron orbital shells (like atomic energy levels)'
      },
      {
        id: 'vortexSpeedMultiplier',
        label: 'Speed Multiplier',
        stateKey: 'vortexSpeedMultiplier',
        type: 'range',
        min: 0.1, max: 3.0, step: 0.1,
        default: 1.0,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      {
        id: 'vortexDepthVariation',
        label: 'Depth Variation',
        stateKey: 'vortexDepthVariation',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.6,
        format: v => (v * 100).toFixed(0) + '%',
        parse: parseFloat,
        tooltip: 'How much ball size changes with 3D depth (0 = no change, 1 = max variation)'
      },
      {
        id: 'vortexSpiralTightness',
        label: 'Spiral Tightness',
        stateKey: 'vortexSpiralTightness',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.5,
        format: v => (v * 100).toFixed(0) + '%',
        parse: parseFloat,
        tooltip: 'How tightly balls spiral in 3D space (0 = flat orbit, 1 = tight spiral)'
      },
      {
        id: 'vortexRotationDirection',
        label: 'Rotation Direction',
        stateKey: 'vortexRotationDirection',
        type: 'range',
        min: -1, max: 1, step: 2,
        default: 1,
        format: v => v === 1 ? 'Counterclockwise' : 'Clockwise',
        parse: parseFloat
      },
      {
        id: 'vortexDrag',
        label: 'Drag',
        stateKey: 'vortexDrag',
        type: 'range',
        min: 0.001, max: 0.05, step: 0.001,
        default: 0.01,
        format: v => v.toFixed(3),
        parse: parseFloat,
        tooltip: 'Damping to stabilize orbital motion'
      },
      warmupFramesControl('vortexWarmupFrames')
    ]
  },

  magnetic: {
    title: 'Magnetic',
    icon: '🧲',
    mode: 'magnetic',
    defaultOpen: false,
    controls: [
      {
        id: 'magneticBallCount',
        label: 'Ball Count',
        stateKey: 'magneticBallCount',
        type: 'range',
        min: 50, max: 300, step: 10,
        default: 180,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'magneticStrength',
        label: 'Strength',
        stateKey: 'magneticStrength',
        type: 'range',
        min: 10000, max: 100000, step: 5000,
        default: 65000,
        format: v => v.toFixed(0),
        parse: parseFloat,
        hint: 'Magnetic attraction strength to cursor'
      },
      {
        id: 'magneticRadius',
        label: 'Magnetic Radius',
        stateKey: 'magneticRadius',
        type: 'range',
        min: 0, max: 600, step: 20,
        default: 0,
        format: v => v === 0 ? 'Unlimited' : Math.round(v) + 'px',
        parse: parseFloat,
        hint: 'Maximum distance for magnetic effect (0 = unlimited)'
      },
      {
        id: 'magneticVelocity',
        label: 'Max Velocity',
        stateKey: 'magneticMaxVelocity',
        type: 'range',
        min: 500, max: 4000, step: 100,
        default: 2800,
        format: v => v.toFixed(0),
        parse: parseFloat
      },
      {
        id: 'magneticDamping',
        label: 'Damping',
        stateKey: 'magneticDamping',
        type: 'range',
        min: 0.8, max: 0.999, step: 0.001,
        default: 0.998,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      warmupFramesControl('magneticWarmupFrames')
    ]
  },

  bubbles: {
    title: 'Bubbles',
    icon: '🫧',
    mode: 'bubbles',
    defaultOpen: false,
    controls: [
      {
        id: 'bubblesRate',
        label: 'Bubble Rate',
        stateKey: 'bubblesSpawnRate',
        type: 'range',
        min: 1, max: 20, step: 1,
        default: 16,
        format: v => String(v),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'bubblesSpeed',
        label: 'Rise Speed',
        stateKey: 'bubblesRiseSpeed',
        type: 'range',
        min: 50, max: 900, step: 25,
        default: 650,
        format: v => v.toFixed(0),
        parse: parseFloat
      },
      {
        id: 'bubblesWobble',
        label: 'Wobble',
        stateKey: 'bubblesWobble',
        type: 'range',
        min: 0, max: 100, step: 5,
        default: 65,
        format: v => v.toFixed(0),
        parse: parseFloat
      },
      {
        id: 'bubblesMax',
        label: 'Max Bubbles',
        stateKey: 'bubblesMaxCount',
        type: 'range',
        min: 50, max: 300, step: 10,
        default: 150,
        format: v => String(v),
        parse: v => parseInt(v, 10)
      },
      warmupFramesControl('bubblesWarmupFrames')
    ]
  },

  tilt: {
    title: 'Tilt',
    icon: '⚖️',
    mode: 'tilt',
    defaultOpen: false,
    controls: [
      {
        id: 'tiltBallCount',
        label: 'Particle Count',
        stateKey: 'tiltBallCount',
        type: 'range',
        min: 100, max: 500, step: 10,
        default: 300,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'tiltMaxAngle',
        label: 'Max Angle',
        stateKey: 'tiltMaxAngle',
        type: 'range',
        min: 0.5, max: 10, step: 0.5,
        default: 2,
        format: v => v.toFixed(1) + '°',
        parse: parseFloat
      },
      {
        id: 'tiltLerpSpeed',
        label: 'Smoothness',
        stateKey: 'tiltLerpSpeed',
        type: 'range',
        min: 0.01, max: 0.5, step: 0.01,
        default: 0.08,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'tiltGlassMass',
        label: 'Particle Mass',
        stateKey: 'tiltGlassBallMass',
        type: 'range',
        min: 0.02, max: 0.3, step: 0.01,
        default: 0.08,
        format: v => v.toFixed(2) + 'x',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'tiltFriction',
        label: 'Friction',
        stateKey: 'tiltFriction',
        type: 'range',
        min: 0.002, max: 0.02, step: 0.001,
        default: 0.008,
        format: v => v.toFixed(3),
        parse: parseFloat
      }
    ]
  },

  kaleidoscope: {
    title: 'Kaleidoscope',
    icon: '🪞',
    mode: 'kaleidoscope-3',
    defaultOpen: false,
    controls: [
      {
        id: 'kaleiBallCount',
        label: 'Ball Count',
        stateKey: 'kaleidoscope3BallCount',
        type: 'range',
        min: 12, max: 300, step: 3,
        default: 150,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'kaleiWedges',
        label: 'Wedges',
        stateKey: 'kaleidoscope3Wedges',
        type: 'range',
        min: 3, max: 24, step: 1,
        default: 10,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'kaleiMirror',
        label: 'Mirror',
        type: 'range',
        min: 0, max: 1, step: 1,
        default: 1,
        format: v => (v ? 'On' : 'Off'),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'kaleiSpeed',
        label: 'Speed',
        stateKey: 'kaleidoscope3Speed',
        type: 'range',
        min: 0.2, max: 2.0, step: 0.05,
        default: 1.2,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'kaleiIdleDrift',
        label: 'Idle Drift',
        stateKey: 'kaleidoscopeIdleDrift',
        type: 'range',
        min: 0, max: 0.05, step: 0.002,
        default: 0.012,
        format: v => (v * 1000).toFixed(0) + '‰',
        parse: parseFloat,
        hint: 'Subtle movement when idle; respects prefers-reduced-motion.'
      },
      {
        id: 'kaleiDotSizeVh',
        label: 'Dot Size (vh)',
        stateKey: 'kaleidoscope3DotSizeVh',
        type: 'range',
        min: 0.2, max: 2.5, step: 0.05,
        default: 1.05,
        format: v => v.toFixed(2) + 'vh',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kaleiDotAreaMul',
        label: 'Dot Area',
        stateKey: 'kaleidoscope3DotAreaMul',
        type: 'range',
        min: 0.3, max: 1.5, step: 0.05,
        default: 0.75,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kaleiSpawnArea',
        label: 'Spawn Density',
        stateKey: 'kaleidoscope3SpawnAreaMul',
        type: 'range',
        min: 0.2, max: 2.0, step: 0.05,
        default: 1.05,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kaleiSizeVar',
        label: 'Size Variance',
        stateKey: 'kaleidoscope3SizeVariance',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.5,
        format: v => (v * 100).toFixed(0) + '%',
        parse: parseFloat,
        reinitMode: true
      },
      warmupFramesControl('kaleidoscope3WarmupFrames')
    ]
  },


  // ═══════════════════════════════════════════════════════════════════════════
  // NEURAL — Connectivity expressed through motion only (no lines)
  // ═══════════════════════════════════════════════════════════════════════════
  neural: {
    title: 'Neural Network',
    icon: '🧠',
    mode: 'neural',
    defaultOpen: false,
    controls: [
      {
        id: 'neuralBallCount',
        label: 'Ball Count',
        stateKey: 'neuralBallCount',
        type: 'range',
        min: 8, max: 400, step: 1,
        default: 311,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'neuralLinkDistanceVw',
        label: 'Link Distance',
        stateKey: 'neuralLinkDistanceVw',
        type: 'range',
        min: 5, max: 40, step: 0.5,
        default: 5.0,
        format: v => v.toFixed(1) + 'vw',
        parse: parseFloat,
        tooltip: 'Maximum distance for connections between nodes'
      },
      {
        id: 'neuralLineOpacity',
        label: 'Link Opacity',
        stateKey: 'neuralLineOpacity',
        type: 'range',
        min: 0, max: 0.8, step: 0.02,
        default: 0.06,
        format: v => v.toFixed(2),
        parse: parseFloat,
        tooltip: 'Opacity of connector balls (legacy - now using connector density)'
      },
      {
        id: 'neuralConnectorDensity',
        label: 'Connector Density',
        stateKey: 'neuralConnectorDensity',
        type: 'range',
        min: 0, max: 10, step: 1,
        default: 3,
        format: v => String(Math.round(v)) + ' balls',
        parse: v => parseInt(v, 10),
        tooltip: 'Number of connector balls per connection (0 = no connectors)'
      },
      {
        id: 'sizeVariationNeural',
        label: 'Size Variation',
        stateKey: 'sizeVariationNeural',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.05,
        format: v => v.toFixed(2),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'neuralWanderStrength',
        label: 'Wander Strength',
        stateKey: 'neuralWanderStrength',
        type: 'range',
        min: 0, max: 2000, step: 10,
        default: 1000,
        format: v => String(Math.round(v)),
        parse: parseFloat
      },
      {
        id: 'neuralMouseStrength',
        label: 'Mouse Attraction',
        stateKey: 'neuralMouseStrength',
        type: 'range',
        min: 0, max: 150000, step: 5000,
        default: 150000,
        format: v => String(Math.round(v / 1000)) + 'k',
        parse: parseFloat
      },
      {
        id: 'neuralSeparationStrength',
        label: 'Separation',
        stateKey: 'neuralSeparationStrength',
        type: 'range',
        min: 0, max: 30000, step: 500,
        default: 11000,
        format: v => String(Math.round(v / 1000)) + 'k',
        parse: parseFloat,
        tooltip: 'How strongly balls avoid each other (subtle spacing)'
      },
      {
        id: 'neuralDamping',
        label: 'Damping',
        stateKey: 'neuralDamping',
        type: 'range',
        min: 0.9, max: 1.0, step: 0.002,
        default: 0.900,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      warmupFramesControl('neuralWarmupFrames')
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOTE: “Warmup Frames” is appended per mode below to avoid visible settling
  // on mode switches (no pop-in / no flash). It is consumed by the physics engine
  // before the first render after init.
  // ═══════════════════════════════════════════════════════════════════════════

  parallaxLinear: {
    title: 'Parallax (Linear)',
    icon: '🫧',
    mode: 'parallax-linear',
    defaultOpen: false,
    controls: [
      {
        id: 'parallaxLinearPreset',
        label: 'Preset',
        stateKey: 'parallaxLinearPreset',
        type: 'select',
        options: Object.keys(PARALLAX_LINEAR_PRESETS).map(k => ({ value: k, label: PARALLAX_LINEAR_PRESETS[k].label })),
        default: 'default',
        format: v => PARALLAX_LINEAR_PRESETS[v]?.label || v,
        onChange: (value) => {
          applyParallaxLinearPreset(value, true);
        }
      },
      {
        id: 'parallaxLinearDotSizeMul',
        label: 'Dot Size',
        stateKey: 'parallaxLinearDotSizeMul',
        type: 'range',
        min: 0.2, max: 6.0, step: 0.1,
        default: 1.8,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'sizeVariationParallaxLinear',
        label: 'Size Variation',
        stateKey: 'sizeVariationParallaxLinear',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0,
        format: v => v.toFixed(2),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'parallaxLinearGridX',
        label: 'Grid X (Cols)',
        stateKey: 'parallaxLinearGridX',
        type: 'range',
        min: 3, max: 40, step: 1,
        default: 14,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxLinearGridY',
        label: 'Grid Y (Rows)',
        stateKey: 'parallaxLinearGridY',
        type: 'range',
        min: 3, max: 40, step: 1,
        default: 10,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxLinearGridZ',
        label: 'Grid Z (Layers)',
        stateKey: 'parallaxLinearGridZ',
        type: 'range',
        min: 2, max: 20, step: 1,
        default: 7,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxLinearSpanX',
        label: 'Span X',
        stateKey: 'parallaxLinearSpanX',
        type: 'range',
        min: 0.2, max: 8.0, step: 0.05,
        default: 5,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true,
        hint: 'World-space width as a multiple of the viewport width. Use >1 to fill edge-to-edge.'
      },
      {
        id: 'parallaxLinearSpanY',
        label: 'Span Y',
        stateKey: 'parallaxLinearSpanY',
        type: 'range',
        min: 0.2, max: 3.0, step: 0.05,
        default: 2.6,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true,
        hint: 'World-space height as a multiple of the viewport height.'
      },
      {
        id: 'parallaxLinearZNear',
        label: 'Z Near',
        stateKey: 'parallaxLinearZNear',
        type: 'range',
        min: 10, max: 1200, step: 10,
        default: 50,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxLinearZFar',
        label: 'Z Far',
        stateKey: 'parallaxLinearZFar',
        type: 'range',
        min: 50, max: 3000, step: 25,
        default: 900,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxLinearFocalLength',
        label: 'Focal Length',
        stateKey: 'parallaxLinearFocalLength',
        type: 'range',
        min: 80, max: 2000, step: 10,
        default: 420,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10)
      },
      {
        id: 'parallaxLinearParallaxStrength',
        label: 'Parallax Strength',
        stateKey: 'parallaxLinearParallaxStrength',
        type: 'range',
        min: 0, max: 2000, step: 10,
        default: 260,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'parallaxLinearMouseEasing',
        label: 'Mouse Smoothing',
        stateKey: 'parallaxLinearMouseEasing',
        type: 'range',
        min: 0.5, max: 50, step: 0.5,
        default: 20,
        format: v => v.toFixed(1),
        parse: parseFloat,
        hint: 'Higher = snappier, lower = smoother camera pan (20 = near-instant)'
      },
      warmupFramesControl('parallaxLinearWarmupFrames')
    ]
  },

  parallaxFloat: {
    title: 'Parallax (Float)',
    icon: '🫧',
    mode: 'parallax-float',
    defaultOpen: false,
    controls: [
      {
        id: 'parallaxFloatRandomize',
        label: 'Randomness',
        stateKey: 'parallaxFloatRandomize',
        type: 'range',
        min: 0, max: 100, step: 1,
        default: 50,
        format: v => `${Math.round(v)}%`,
        parse: v => parseInt(v, 10),
        reinitMode: true,
        hint: '0% = perfect grid, 100% = fully random positions'
      },
      {
        id: 'parallaxFloatLevitationAmp',
        label: 'Levitation Amplitude',
        stateKey: 'parallaxFloatLevitationAmp',
        type: 'range',
        min: 0, max: 100, step: 1,
        default: 25,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        reinitMode: true,
        hint: 'How far particles drift during levitation'
      },
      {
        id: 'parallaxFloatLevitationSpeed',
        label: 'Levitation Speed',
        stateKey: 'parallaxFloatLevitationSpeed',
        type: 'range',
        min: 0.01, max: 1.0, step: 0.01,
        default: 0.25,
        format: v => v.toFixed(2),
        parse: parseFloat,
        reinitMode: true,
        hint: 'How fast particles oscillate'
      },
      {
        id: 'parallaxFloatMouseEasing',
        label: 'Mouse Smoothing',
        stateKey: 'parallaxFloatMouseEasing',
        type: 'range',
        min: 0.5, max: 20, step: 0.5,
        default: 5,
        format: v => v.toFixed(1),
        parse: parseFloat,
        hint: 'Higher = snappier, lower = smoother camera pan'
      },
      {
        id: 'parallaxFloatDotSizeMul',
        label: 'Dot Size',
        stateKey: 'parallaxFloatDotSizeMul',
        type: 'range',
        min: 0.2, max: 6.0, step: 0.1,
        default: 1.4,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'sizeVariationParallaxFloat',
        label: 'Size Variation',
        stateKey: 'sizeVariationParallaxFloat',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0,
        format: v => v.toFixed(2),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'parallaxFloatGridX',
        label: 'Grid X (Cols)',
        stateKey: 'parallaxFloatGridX',
        type: 'range',
        min: 3, max: 40, step: 1,
        default: 15,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxFloatGridY',
        label: 'Grid Y (Rows)',
        stateKey: 'parallaxFloatGridY',
        type: 'range',
        min: 3, max: 40, step: 1,
        default: 10,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxFloatGridZ',
        label: 'Grid Z (Layers)',
        stateKey: 'parallaxFloatGridZ',
        type: 'range',
        min: 2, max: 20, step: 1,
        default: 12,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxFloatSpanX',
        label: 'Span X',
        stateKey: 'parallaxFloatSpanX',
        type: 'range',
        min: 0.2, max: 10.0, step: 0.1,
        default: 4,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        reinitMode: true,
        hint: 'World-space width as a multiple of the viewport width'
      },
      {
        id: 'parallaxFloatSpanY',
        label: 'Span Y',
        stateKey: 'parallaxFloatSpanY',
        type: 'range',
        min: 0.2, max: 10.0, step: 0.1,
        default: 3,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        reinitMode: true,
        hint: 'World-space height as a multiple of the viewport height'
      },
      {
        id: 'parallaxFloatZNear',
        label: 'Z Near',
        stateKey: 'parallaxFloatZNear',
        type: 'range',
        min: 10, max: 1200, step: 10,
        default: 100,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxFloatZFar',
        label: 'Z Far',
        stateKey: 'parallaxFloatZFar',
        type: 'range',
        min: 200, max: 4000, step: 50,
        default: 2500,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxFloatFocalLength',
        label: 'Focal Length',
        stateKey: 'parallaxFloatFocalLength',
        type: 'range',
        min: 80, max: 2000, step: 10,
        default: 500,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10)
      },
      {
        id: 'parallaxFloatParallaxStrength',
        label: 'Parallax Strength',
        stateKey: 'parallaxFloatParallaxStrength',
        type: 'range',
        min: 0, max: 2000, step: 10,
        default: 350,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10)
      },
      warmupFramesControl('parallaxFloatWarmupFrames')
    ]
  },

  starfield3d: {
    title: '3D Starfield',
    icon: '✨',
    mode: 'starfield-3d',
    defaultOpen: false,
    controls: [
      {
        id: 'starfieldCount',
        label: 'Star Count',
        stateKey: 'starfieldCount',
        type: 'range',
        min: 20, max: 320, step: 2,
        default: 150,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'starfieldSpanX',
        label: 'Span X',
        stateKey: 'starfieldSpanX',
        type: 'range',
        min: 0.4, max: 3.5, step: 0.05,
        default: 2.45,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'starfieldSpanY',
        label: 'Span Y',
        stateKey: 'starfieldSpanY',
        type: 'range',
        min: 0.4, max: 3.5, step: 0.05,
        default: 2.05,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'starfieldZNear',
        label: 'Z Near',
        stateKey: 'starfieldZNear',
        type: 'range',
        min: 40, max: 800, step: 10,
        default: 70,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'starfieldZFar',
        label: 'Z Far',
        stateKey: 'starfieldZFar',
        type: 'range',
        min: 400, max: 4000, step: 50,
        default: 4000,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'starfieldFocalLength',
        label: 'Focal Length',
        stateKey: 'starfieldFocalLength',
        type: 'range',
        min: 120, max: 2000, step: 10,
        default: 310,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10)
      },
      {
        id: 'starfieldParallaxStrength',
        label: 'Parallax Strength',
        stateKey: 'starfieldParallaxStrength',
        type: 'range',
        min: 0, max: 1200, step: 10,
        default: 320,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'starfieldSpeed',
        label: 'Flow Speed',
        stateKey: 'starfieldSpeed',
        type: 'range',
        min: 60, max: 1600, step: 10,
        default: 390,
        format: v => `${Math.round(v)}px/s`,
        parse: v => parseInt(v, 10)
      },
      {
        id: 'starfieldDotSizeMul',
        label: 'Dot Size',
        stateKey: 'starfieldDotSizeMul',
        type: 'range',
        min: 0.2, max: 4.0, step: 0.05,
        default: 0.35,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat
      },
      {
        id: 'starfieldIdleJitter',
        label: 'Idle Drift',
        stateKey: 'starfieldIdleJitter',
        type: 'range',
        min: 0, max: 20, step: 0.5,
        default: 20.0,
        format: v => v.toFixed(1) + 'px',
        parse: parseFloat,
        hint: 'Subtle twinkle when idle; disabled for reduced-motion.'
      },
      {
        id: 'starfieldFadeDuration',
        label: 'Fade Duration',
        stateKey: 'starfieldFadeDuration',
        type: 'range',
        min: 0, max: 3, step: 0.1,
        default: 0.5,
        format: v => v.toFixed(1) + 's',
        parse: parseFloat,
        hint: 'Duration of fade in/out when stars appear and disappear.'
      },
      warmupFramesControl('starfield3dWarmupFrames')
    ]
  },

  elasticCenter: {
    title: 'Elastic Center',
    icon: '⭕',
    mode: 'elastic-center',
    defaultOpen: false,
    controls: [
      {
        id: 'elasticCenterBallCount',
        label: 'Ball Count',
        stateKey: 'elasticCenterBallCount',
        type: 'range',
        min: 20, max: 120, step: 5,
        default: 60,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'elasticCenterMassMultiplier',
        label: 'Mass Multiplier',
        stateKey: 'elasticCenterMassMultiplier',
        type: 'range',
        min: 0.5, max: 5.0, step: 0.1,
        default: 2.0,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        hint: 'Mass of individual dots'
      },
      {
        id: 'elasticCenterElasticStrength',
        label: 'Elastic Strength',
        stateKey: 'elasticCenterElasticStrength',
        type: 'range',
        min: 0, max: 15000, step: 250,
        default: 2000,
        format: v => v.toFixed(0) + 'px/s²',
        parse: parseFloat,
        hint: 'Force pulling dots back to center position (0 = no elastic force, circle moves freely)'
      },
      {
        id: 'elasticCenterMouseRepelStrength',
        label: 'Mouse Repel Strength',
        stateKey: 'elasticCenterMouseRepelStrength',
        type: 'range',
        min: 3000, max: 25000, step: 500,
        default: 12000,
        format: v => v.toFixed(0) + 'px/s²',
        parse: parseFloat,
        hint: 'Force pushing dots away from mouse cursor'
      },
      {
        id: 'elasticCenterMouseRadius',
        label: 'Mouse Influence Radius',
        stateKey: 'elasticCenterMouseRadius',
        type: 'range',
        min: 50, max: 400, step: 10,
        default: 200,
        format: v => v.toFixed(0) + 'px',
        parse: parseFloat,
        hint: 'Distance from cursor where mouse affects dots'
      },
      {
        id: 'elasticCenterDamping',
        label: 'Damping',
        stateKey: 'elasticCenterDamping',
        type: 'range',
        min: 0.85, max: 0.99, step: 0.01,
        default: 0.94,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Velocity damping for stability (higher = less damping)'
      },
      warmupFramesControl('elasticCenterWarmupFrames')
    ]
  },

  dvdLogo: {
    title: 'DVD Logo',
    icon: '📀',
    mode: 'dvd-logo',
    defaultOpen: false,
    controls: [
      {
        id: 'dvdLogoSpeed',
        label: 'Speed',
        stateKey: 'dvdLogoSpeed',
        type: 'range',
        min: 200, max: 800, step: 50,
        default: 200,
        format: v => v.toFixed(0) + 'px/s',
        parse: parseFloat,
        hint: 'Movement speed of the DVD logo'
      },
      {
        id: 'dvdLogoSize',
        label: 'Logo Size',
        stateKey: 'dvdLogoSize',
        type: 'range',
        min: 0.5, max: 2.0, step: 0.1,
        default: 1.0,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        hint: 'Scale multiplier for logo size',
        reinitMode: true
      },
      {
        id: 'dvdLogoBallCount',
        label: 'Ball Count',
        stateKey: 'dvdLogoBallCount',
        type: 'range',
        min: 30, max: 120, step: 5,
        default: 60,
        format: v => v.toFixed(0) + ' balls',
        parse: parseFloat,
        hint: 'Total balls forming the DVD letters',
        reinitMode: true
      },
      {
        id: 'dvdLogoBallSpacing',
        label: 'Ball Spacing',
        stateKey: 'dvdLogoBallSpacing',
        type: 'range',
        min: 1.0, max: 2.0, step: 0.1,
        default: 1.3,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        hint: 'Spacing between balls (higher = larger gaps)',
        reinitMode: true
      },
      {
        id: 'dvdLogoLetterSpacing',
        label: 'Letter Spacing',
        stateKey: 'dvdLogoLetterSpacing',
        type: 'range',
        min: 0.5, max: 2.0, step: 0.1,
        default: 1.0,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        hint: 'Spacing between D-V-D letters',
        reinitMode: true
      },
      warmupFramesControl('dvdLogoWarmupFrames')
    ]
  },

  particleFountain: {
    title: 'Particle Fountain',
    icon: '⛲',
    mode: 'particle-fountain',
    defaultOpen: false,
    controls: [
      {
        id: 'particleFountainEmissionRate',
        label: 'Emission Rate',
        stateKey: 'particleFountainEmissionRate',
        type: 'range',
        min: 5, max: 100, step: 1,
        default: 29,
        format: v => v.toFixed(0) + ' particles/s',
        parse: v => parseInt(v, 10),
        hint: 'Number of particles emitted per second'
      },
      {
        id: 'particleFountainInitialVelocity',
        label: 'Initial Velocity',
        stateKey: 'particleFountainInitialVelocity',
        type: 'range',
        min: 200, max: 10000, step: 100,
        default: 4700,
        format: v => v.toFixed(0) + 'px/s',
        parse: v => parseInt(v, 10),
        hint: 'Initial upward velocity of particles'
      },
      {
        id: 'particleFountainSpreadAngle',
        label: 'Spread Angle',
        stateKey: 'particleFountainSpreadAngle',
        type: 'range',
        min: 10, max: 120, step: 5,
        default: 20,
        format: v => v.toFixed(0) + '°',
        parse: v => parseInt(v, 10),
        hint: 'How wide the fountain spreads (degrees)'
      },
      {
        id: 'particleFountainWaterDrag',
        label: 'Water Drag',
        stateKey: 'particleFountainWaterDrag',
        type: 'range',
        min: 0.01, max: 0.2, step: 0.01,
        default: 0.02,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Water-like drag for smooth fluid motion (lower = more natural water, higher = more resistance)'
      },
      {
        id: 'particleFountainGravityMultiplier',
        label: 'Gravity',
        stateKey: 'particleFountainGravityMultiplier',
        type: 'range',
        min: 0, max: 2.0, step: 0.1,
        default: 1.7,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        hint: 'Gravity strength (particles fall after rising, 0 = no gravity)'
      },
      {
        id: 'particleFountainUpwardForce',
        label: 'Upward Force',
        stateKey: 'particleFountainUpwardForce',
        type: 'range',
        min: 0, max: 800, step: 50,
        default: 300,
        format: v => v.toFixed(0) + 'px/s²',
        parse: v => parseInt(v, 10),
        hint: 'Optional upward force (buoyancy), 0 = disabled'
      },
      {
        id: 'particleFountainMaxParticles',
        label: 'Max Particles',
        stateKey: 'particleFountainMaxParticles',
        type: 'range',
        min: 20, max: 300, step: 10,
        default: 230,
        format: v => v.toFixed(0) + ' particles',
        parse: v => parseInt(v, 10),
        hint: 'Maximum active particles'
      },
      {
        id: 'particleFountainLifetime',
        label: 'Lifetime',
        stateKey: 'particleFountainLifetime',
        type: 'range',
        min: 1.0, max: 30.0, step: 0.5,
        default: 8.0,
        format: v => v.toFixed(1) + 's',
        parse: parseFloat,
        hint: 'How long particles live before fading out (2s fade animation)'
      },
      {
        id: 'particleFountainMouseRepelStrength',
        label: 'Mouse Repel Strength',
        stateKey: 'particleFountainMouseRepelStrength',
        type: 'range',
        min: 10000, max: 100000, step: 5000,
        default: 50000,
        format: v => v.toFixed(0) + 'px/s²',
        parse: v => parseInt(v, 10),
        hint: 'Force pushing particles away from mouse cursor'
      },
      {
        id: 'particleFountainMouseRepelRadiusVw',
        label: 'Mouse Repel Radius',
        stateKey: 'particleFountainMouseRepelRadiusVw',
        type: 'range',
        min: 1.0, max: 20.0, step: 0.5,
        default: 5.0,
        format: v => v.toFixed(1) + 'vw',
        parse: parseFloat,
        hint: 'Radius of mouse repulsion (viewport width percentage)',
        onChange: (g) => {
          // Update derived px value when vw changes
          import('../core/state.js').then(({ applyLayoutFromVwToPx }) => {
            applyLayoutFromVwToPx();
          }).catch(() => {});
        }
      }
    ]
  },

  sphere3d: {
    title: '3D Sphere',
    icon: '🌐',
    mode: '3d-sphere',
    defaultOpen: false,
    controls: [
      {
        id: 'sphere3dRadiusVw',
        label: 'Radius',
        stateKey: 'sphere3dRadiusVw',
        type: 'range',
        min: 5, max: 40, step: 0.5,
        default: 18,
        format: v => v.toFixed(1) + 'vw',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'sphere3dDensity',
        label: 'Point Count',
        stateKey: 'sphere3dDensity',
        type: 'range',
        min: 30, max: 600, step: 10,
        default: 140,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'sphere3dFocalLength',
        label: 'Focal Length',
        stateKey: 'sphere3dFocalLength',
        type: 'range',
        min: 80, max: 2000, step: 10,
        default: 600,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10)
      },
      {
        id: 'sphere3dDotSizeMul',
        label: 'Dot Size',
        stateKey: 'sphere3dDotSizeMul',
        type: 'range',
        min: 0.2, max: 4.0, step: 0.05,
        default: 1.5,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat
      },
      {
        id: 'sphere3dIdleSpeed',
        label: 'Idle Rotation',
        stateKey: 'sphere3dIdleSpeed',
        type: 'range',
        min: 0, max: 1, step: 0.02,
        default: 0.15,
        format: v => v.toFixed(2) + ' rad/s',
        parse: parseFloat
      },
      {
        id: 'sphere3dTumbleSpeed',
        label: 'Spin Sensitivity',
        stateKey: 'sphere3dTumbleSpeed',
        type: 'range',
        min: 0, max: 10, step: 0.1,
        default: 2.5,
        format: v => v.toFixed(1),
        parse: parseFloat,
        hint: 'How much dragging the mouse over the sphere spins it. Higher = more sensitive.'
      },
      {
        id: 'sphere3dTumbleDamping',
        label: 'Tumble Damping',
        stateKey: 'sphere3dTumbleDamping',
        type: 'range',
        min: 0.8, max: 0.99, step: 0.005,
        default: 0.94,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      warmupFramesControl('sphere3dWarmupFrames')
    ]
  },

  cube3d: {
    title: '3D Cube',
    icon: '🧊',
    mode: '3d-cube',
    defaultOpen: false,
    controls: [
      {
        id: 'cube3dSizeVw',
        label: 'Size',
        stateKey: 'cube3dSizeVw',
        type: 'range',
        min: 10, max: 50, step: 0.5,
        default: 50,
        format: v => v.toFixed(1) + 'vw',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'cube3dEdgeDensity',
        label: 'Edge Density',
        stateKey: 'cube3dEdgeDensity',
        type: 'range',
        min: 2, max: 30, step: 1,
        default: 8,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'cube3dFaceGrid',
        label: 'Face Grid',
        stateKey: 'cube3dFaceGrid',
        type: 'range',
        min: 0, max: 10, step: 1,
        default: 0,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true,
        hint: '0 = edges only. >0 adds face lattice points.'
      },
      {
        id: 'cube3dIdleSpeed',
        label: 'Idle Rotation',
        stateKey: 'cube3dIdleSpeed',
        type: 'range',
        min: 0, max: 1, step: 0.02,
        default: 0.2,
        format: v => v.toFixed(2) + ' rad/s',
        parse: parseFloat
      },
      {
        id: 'cube3dCursorInfluence',
        label: 'Cursor Influence',
        stateKey: 'cube3dCursorInfluence',
        type: 'range',
        min: 0, max: 4, step: 0.05,
        default: 1.5,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'cube3dTumbleSpeed',
        label: 'Tumble Speed',
        stateKey: 'cube3dTumbleSpeed',
        type: 'range',
        min: 0, max: 10, step: 0.1,
        default: 3,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      {
        id: 'cube3dTumbleDamping',
        label: 'Tumble Damping',
        stateKey: 'cube3dTumbleDamping',
        type: 'range',
        min: 0.8, max: 0.99, step: 0.005,
        default: 0.95,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      {
        id: 'cube3dFocalLength',
        label: 'Focal Length',
        stateKey: 'cube3dFocalLength',
        type: 'range',
        min: 80, max: 2000, step: 10,
        default: 500,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10)
      },
      {
        id: 'cube3dDotSizeMul',
        label: 'Dot Size',
        stateKey: 'cube3dDotSizeMul',
        type: 'range',
        min: 0.2, max: 4.0, step: 0.05,
        default: 1.5,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat
      },
      warmupFramesControl('cube3dWarmupFrames')
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PARALLAX LINEAR — 3D grid with mouse-driven camera pan
  // ═══════════════════════════════════════════════════════════════════════════
  parallaxLinear: {
    title: 'Parallax (Linear)',
    icon: '📐',
    mode: 'parallax-linear',
    defaultOpen: false,
    controls: [
      {
        id: 'parallaxLinearGridX',
        label: 'Grid X',
        stateKey: 'parallaxLinearGridX',
        type: 'range',
        min: 4, max: 30, step: 1,
        default: 14,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxLinearGridY',
        label: 'Grid Y',
        stateKey: 'parallaxLinearGridY',
        type: 'range',
        min: 4, max: 30, step: 1,
        default: 10,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxLinearGridZ',
        label: 'Grid Z (Depth)',
        stateKey: 'parallaxLinearGridZ',
        type: 'range',
        min: 2, max: 15, step: 1,
        default: 7,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      { type: 'divider', label: 'Spread & Depth' },
      {
        id: 'parallaxLinearSpanX',
        label: 'Span X',
        stateKey: 'parallaxLinearSpanX',
        type: 'range',
        min: 1.0, max: 12.0, step: 0.1,
        default: 5.4,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        reinitMode: true,
        hint: 'How far the grid extends horizontally'
      },
      {
        id: 'parallaxLinearSpanY',
        label: 'Span Y',
        stateKey: 'parallaxLinearSpanY',
        type: 'range',
        min: 1.0, max: 12.0, step: 0.1,
        default: 5.4,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        reinitMode: true,
        hint: 'How far the grid extends vertically'
      },
      {
        id: 'parallaxLinearZNear',
        label: 'Z Near',
        stateKey: 'parallaxLinearZNear',
        type: 'range',
        min: 10, max: 200, step: 5,
        default: 50,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxLinearZFar',
        label: 'Z Far',
        stateKey: 'parallaxLinearZFar',
        type: 'range',
        min: 200, max: 2000, step: 50,
        default: 800,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      { type: 'divider', label: 'Camera & Mouse' },
      {
        id: 'parallaxLinearFocalLength',
        label: 'Focal Length',
        stateKey: 'parallaxLinearFocalLength',
        type: 'range',
        min: 100, max: 1000, step: 10,
        default: 420,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10)
      },
      {
        id: 'parallaxLinearParallaxStrength',
        label: 'Parallax Strength',
        stateKey: 'parallaxLinearParallaxStrength',
        type: 'range',
        min: 0, max: 500, step: 10,
        default: 120,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'How much the view shifts with mouse movement'
      },
      {
        id: 'parallaxLinearMouseEasing',
        label: 'Mouse Smoothing',
        stateKey: 'parallaxLinearMouseEasing',
        type: 'range',
        min: 0.5, max: 15, step: 0.5,
        default: 4,
        format: v => v.toFixed(1),
        parse: parseFloat,
        hint: 'Lower = smoother/slower, higher = snappier'
      },
      { type: 'divider', label: 'Appearance' },
      {
        id: 'parallaxLinearDotSizeMul',
        label: 'Dot Size',
        stateKey: 'parallaxLinearDotSizeMul',
        type: 'range',
        min: 0.5, max: 4.0, step: 0.1,
        default: 1.8,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat
      },
      warmupFramesControl('parallaxLinearWarmupFrames')
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PARALLAX FLOAT — Organic variant with random positions + levitation
  // ═══════════════════════════════════════════════════════════════════════════
  parallaxFloat: {
    title: 'Parallax (Float)',
    icon: '🫧',
    mode: 'parallax-float',
    defaultOpen: false,
    controls: [
      {
        id: 'parallaxFloatRandomize',
        label: 'Randomize',
        stateKey: 'parallaxFloatRandomize',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.5,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        reinitMode: true,
        hint: '0 = perfect grid, 1 = fully scattered'
      },
      { type: 'divider', label: 'Levitation' },
      {
        id: 'parallaxFloatLevitationAmp',
        label: 'Amplitude',
        stateKey: 'parallaxFloatLevitationAmp',
        type: 'range',
        min: 0, max: 60, step: 2,
        default: 20,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'How far particles drift'
      },
      {
        id: 'parallaxFloatLevitationSpeed',
        label: 'Speed',
        stateKey: 'parallaxFloatLevitationSpeed',
        type: 'range',
        min: 0.05, max: 0.5, step: 0.02,
        default: 0.2,
        format: v => v.toFixed(2) + ' Hz',
        parse: parseFloat,
        hint: 'How fast particles drift'
      },
      { type: 'divider', label: 'Mouse' },
      {
        id: 'parallaxFloatParallaxStrength',
        label: 'Parallax Strength',
        stateKey: 'parallaxFloatParallaxStrength',
        type: 'range',
        min: 0, max: 500, step: 10,
        default: 120,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'How much the view shifts with mouse'
      },
      {
        id: 'parallaxFloatMouseEasing',
        label: 'Mouse Smoothing',
        stateKey: 'parallaxFloatMouseEasing',
        type: 'range',
        min: 0.5, max: 15, step: 0.5,
        default: 4,
        format: v => v.toFixed(1),
        parse: parseFloat,
        hint: 'Lower = smoother/slower, higher = snappier'
      },
      { type: 'divider', label: 'Appearance' },
      {
        id: 'parallaxFloatDotSizeMul',
        label: 'Dot Size',
        stateKey: 'parallaxFloatDotSizeMul',
        type: 'range',
        min: 0.5, max: 4.0, step: 0.1,
        default: 1.8,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat
      },
      warmupFramesControl('parallaxFloatWarmupFrames')
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // ENTRANCE ANIMATION — Dramatic page entrance orchestration
  // ═══════════════════════════════════════════════════════════════════════════
  entrance: {
    title: 'Entrance',
    icon: '🎭',
    defaultOpen: false,
    controls: [
      {
        id: 'entranceEnabled',
        label: 'Enabled',
        stateKey: 'entranceEnabled',
        type: 'checkbox',
        default: true,
        format: v => (v ? 'On' : 'Off'),
        parse: v => !!v,
        hint: 'Enable dramatic entrance animation (browser default → wall-state)',
        onChange: () => {
          // Reload page to apply changes
          if (typeof window !== 'undefined') {
            setTimeout(() => window.location.reload(), 300);
          }
        }
      },
      {
        id: 'entranceWallTransitionDelay',
        label: 'Wall Transition Delay',
        stateKey: 'entranceWallTransitionDelay',
        type: 'range',
        min: 0, max: 2000, step: 50,
        default: 300,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10),
        hint: 'Delay before wall background transition starts'
      },
      {
        id: 'entranceWallTransitionDuration',
        label: 'Wall Growth Duration',
        stateKey: 'entranceWallTransitionDuration',
        type: 'range',
        min: 200, max: 2000, step: 50,
        default: 800,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10),
        hint: 'Duration of wall scaling down into viewport animation'
      },
      {
        id: 'entranceWallInitialScale',
        label: 'Initial Scale',
        stateKey: 'entranceWallInitialScale',
        type: 'range',
        min: 1.05, max: 1.5, step: 0.05,
        default: 1.1,
        format: v => v.toFixed(2),
        parse: v => parseFloat(v),
        hint: 'Starting scale (wall starts slightly larger, scales down to 1.0)'
      },
      {
        id: 'entranceWallEasing',
        label: 'Wall Growth Easing',
        stateKey: 'entranceWallEasing',
        type: 'select',
        options: [
          { value: 'cubic-bezier(0.16, 1, 0.3, 1)', label: 'Organic (default)' },
          { value: 'ease-out', label: 'Ease Out' },
          { value: 'ease-in-out', label: 'Ease In Out' },
          { value: 'cubic-bezier(0.34, 1.56, 0.64, 1)', label: 'Bounce' },
          { value: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)', label: 'Overshoot' }
        ],
        default: 'cubic-bezier(0.16, 1, 0.3, 1)',
        format: v => String(v),
        parse: v => String(v),
        hint: 'Easing function for wall growth animation'
      },
      {
        id: 'entranceElementDuration',
        label: 'Element Duration',
        stateKey: 'entranceElementDuration',
        type: 'range',
        min: 100, max: 1000, step: 50,
        default: 800,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10),
        hint: 'Duration for individual element animations'
      },
      {
        id: 'entranceElementScaleStart',
        label: 'Element Scale Start',
        stateKey: 'entranceElementScaleStart',
        type: 'range',
        min: 0.5, max: 1.0, step: 0.01,
        default: 0.95,
        format: v => v.toFixed(2),
        parse: v => parseFloat(v),
        hint: 'Initial scale for elements (0-1)'
      },
      {
        id: 'entranceElementTranslateZStart',
        label: 'Element Z Start',
        stateKey: 'entranceElementTranslateZStart',
        type: 'range',
        min: -100, max: 0, step: 5,
        default: -20,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Initial z-axis position (negative = back in 3D space)'
      },
      {
        id: 'entrancePerspectiveLandscape',
        label: 'Perspective (Landscape)',
        stateKey: 'entrancePerspectiveLandscape',
        type: 'range',
        min: 500, max: 3000, step: 50,
        default: 1200,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: '3D perspective for landscape aspect ratio',
        onChange: () => {
          import('../visual/entrance-animation.js').then(({ applyPerspectiveCSS }) => {
            applyPerspectiveCSS();
          }).catch(() => {});
        }
      },
      {
        id: 'entrancePerspectiveSquare',
        label: 'Perspective (Square)',
        stateKey: 'entrancePerspectiveSquare',
        type: 'range',
        min: 500, max: 3000, step: 50,
        default: 1000,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: '3D perspective for square aspect ratio',
        onChange: () => {
          import('../visual/entrance-animation.js').then(({ applyPerspectiveCSS }) => {
            applyPerspectiveCSS();
          }).catch(() => {});
        }
      },
      {
        id: 'entrancePerspectivePortrait',
        label: 'Perspective (Portrait)',
        stateKey: 'entrancePerspectivePortrait',
        type: 'range',
        min: 500, max: 3000, step: 50,
        default: 800,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: '3D perspective for portrait aspect ratio',
        onChange: () => {
          import('../visual/entrance-animation.js').then(({ applyPerspectiveCSS }) => {
            applyPerspectiveCSS();
          }).catch(() => {});
        }
      },
      {
        id: 'contentFadeInDelay',
        label: 'Content Fade-In Delay',
        stateKey: 'contentFadeInDelay',
        type: 'range',
        min: 0, max: 2000, step: 50,
        default: 500,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10),
        hint: 'Delay before content fade-in animation starts (excludes background/wall color)',
        onChange: () => {
          // Reload page to apply changes
          if (typeof window !== 'undefined') {
            setTimeout(() => window.location.reload(), 300);
          }
        }
      },
      {
        id: 'contentFadeInDuration',
        label: 'Content Fade-In Duration',
        stateKey: 'contentFadeInDuration',
        type: 'range',
        min: 100, max: 3000, step: 50,
        default: 1000,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10),
        hint: 'Duration of content fade-in animation (excludes background/wall color)',
        onChange: () => {
          // Reload page to apply changes
          if (typeof window !== 'undefined') {
            setTimeout(() => window.location.reload(), 300);
          }
        }
      }
    ]
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// FLAT LIST OF ALL CONTROLS (for iteration)
// ═══════════════════════════════════════════════════════════════════════════════

export function getAllControls() {
  const all = [];
  for (const section of Object.values(CONTROL_SECTIONS)) {
    for (const control of section.controls) {
      all.push({ ...control, section: section.title });
    }
  }
  return all;
}

export function getControlById(id) {
  for (const section of Object.values(CONTROL_SECTIONS)) {
    const found = section.controls.find(c => c.id === id);
    if (found) return found;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HTML GENERATION
// ═══════════════════════════════════════════════════════════════════════════════

function generateControlHTML(control) {
  // Divider type - section separator within a category
  if (control.type === 'divider') {
    return `<div class="control-divider"><span class="control-divider-label">${control.label || ''}</span></div>`;
  }
  
  if (!isControlVisible(control.id)) return '';
  
  const sliderId = control.id + 'Slider';
  const valId = control.id + 'Val';
  const pickerId = control.id + 'Picker';
  const hintTitleAttr = control.hint ? ` title="${escapeAttr(control.hint)}"` : '';
  const rowClass = control.isHero ? 'control-row control-row--hero' : 'control-row';

  // Color distribution (custom control)
  if (control.type === 'colorDistribution') {
    const labels = Array.isArray(control.labels) ? control.labels : [];
    const rowsHtml = labels.map((label, i) => {
      const safeLabel = String(label || '').trim();
      const swatchId = `colorDistSwatch${i}`;
      const selectId = `colorDistColor${i}`;
      const weightId = `colorDistWeight${i}`;
      const weightValId = `colorDistWeightVal${i}`;
      return `
        <div class="color-dist-row" data-color-dist-row="${i}">
          <div class="color-dist-row-label">${safeLabel}</div>
          <div class="color-dist-row-controls">
            <span class="color-dist-swatch" id="${swatchId}" aria-hidden="true"></span>
            <select id="${selectId}" class="control-select color-dist-select" aria-label="${safeLabel} color"></select>
            <input type="range" id="${weightId}" min="0" max="100" step="1" value="0" aria-label="${safeLabel} weight">
            <span class="color-dist-weight" id="${weightValId}">0%</span>
          </div>
        </div>`;
    }).join('');
    return `
      <div class="${rowClass}" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
          <span class="control-value" id="colorDistTotalVal">100%</span>
        </div>
        <div class="color-dist-grid" id="colorDistGrid">
          ${rowsHtml}
        </div>
        <div class="color-dist-actions">
          <button type="button" class="secondary" id="colorDistResetBtn" aria-label="Reset color distribution to defaults">Reset Defaults</button>
        </div>
      </div>
      ${control.hint ? `<p class="control-hint">${control.hint}</p>` : ''}`;
  }
  
  // Color picker type
  if (control.type === 'color') {
    return `
      <label class="${rowClass}" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label"${hintTitleAttr}>${control.label}</span>
          <span class="control-value" id="${valId}">${control.default}</span>
        </div>
        <input type="color" id="${pickerId}" value="${control.default}" aria-label="${control.label}" />
      </label>
      ${control.hint ? `<p class="control-hint">${control.hint}</p>` : ''}`;
  }

  // Select type
  if (control.type === 'select') {
    const opts = Array.isArray(control.options) ? control.options : [];
    const optionsHtml = opts.map((o) => {
      const v = String(o.value);
      const label = String(o.label ?? o.value);
      const selectedAttr = String(control.default) === v ? 'selected' : '';
      return `<option value="${v}" ${selectedAttr}>${label}</option>`;
    }).join('');
    const hintHtml = control.hint ? `<p class="control-hint">${control.hint}</p>` : '';
    return `
      <label class="${rowClass}" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label"${hintTitleAttr}>${control.label}</span>
          <span class="control-value" id="${valId}">${safeFormat(control, control.default)}</span>
        </div>
        <select id="${sliderId}" class="control-select" aria-label="${control.label}">
          ${optionsHtml}
        </select>
      </label>
      ${hintHtml}`;
  }

  // Boolean type (checkbox / toggle alias)
  if (control.type === 'checkbox' || control.type === 'toggle') {
    const checkedAttr = control.default ? 'checked' : '';
    return `
      <label class="${rowClass}" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label"${hintTitleAttr}>${control.label}</span>
          <span class="control-value" id="${valId}">${control.default ? 'On' : 'Off'}</span>
        </div>
        <input type="checkbox" id="${sliderId}" ${checkedAttr} aria-label="${control.label}">
      </label>
      ${control.hint ? `<p class="control-hint">${control.hint}</p>` : ''}`;
  }
  
  // Default: range slider
  const hintHtml = control.hint ? `<p class="control-hint">${control.hint}</p>` : '';
  
  return `
      <label class="${rowClass}" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label"${hintTitleAttr}>${control.label}</span>
          <span class="control-value" id="${valId}">${safeFormat(control, control.default)}</span>
        </div>
        <input type="range" id="${sliderId}" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.default}">
      </label>
      ${hintHtml}`;
}

function generateSectionHTML(key, section) {
  const visibleControls = section.controls.filter(c => isControlVisible(c.id));
  if (visibleControls.length === 0) return '';
  
  // Group controls by 'group' property
  let currentGroup = null;
  let currentGroupLayout = null;
  let html = '';
  
  for (const control of visibleControls) {
    // Insert group header if new group
    if (control.group && control.group !== currentGroup) {
      if (currentGroup !== null) html += '</div>'; // Close previous group content
      const groupLayout = control.groupLayout || '';
      html += `<div class="section-title" style="margin-top: 12px;">${control.group}</div><div class="group ${groupLayout}">`;
      currentGroup = control.group;
      currentGroupLayout = groupLayout;
    } else if (!control.group && currentGroup !== null) {
      html += '</div>'; // Close group content
      currentGroup = null;
      currentGroupLayout = null;
    }
    
    html += generateControlHTML(control);
  }
  
  // Close any open group
  if (currentGroup !== null) html += '</div>';
  
  // Wrap in the unified accordion style used by the master panel
  // (single scroll container in `.panel-content`, no nested overflow traps)
  const detailsAttrs = `${section.defaultOpen ? 'open' : ''}`;
  const header = `
    <summary class="panel-section-header">
      ${section.icon ? `<span class="section-icon">${section.icon}</span>` : ''}
      <span class="section-label">${section.title}</span>
    </summary>`;
  const body = `<div class="panel-section-content">${html}</div>`;

  if (section.mode) {
    return `
      <div id="${section.mode}Controls" class="mode-controls">
        <details class="panel-section-accordion" ${detailsAttrs}>
          ${header}
          ${body}
        </details>
      </div>`;
  }

  return `
    <details class="panel-section-accordion" ${detailsAttrs}>
      ${header}
      ${body}
    </details>`;
}

export function generateThemeSectionHTML({ open = true } = {}) {
  return `
    <details class="panel-section-accordion" ${open ? 'open' : ''}>
      <summary class="panel-section-header">
        <span class="section-icon">🎨</span>
        <span class="section-label">Theme</span>
      </summary>
      <div class="panel-section-content">
        <div class="theme-segment-control" role="group" aria-label="Theme selector">
          <button id="themeAuto" class="theme-segment-btn" aria-label="Auto theme">Auto</button>
          <button id="themeLight" class="theme-segment-btn active" aria-label="Light theme">Light</button>
          <button id="themeDark" class="theme-segment-btn" aria-label="Dark theme">Dark</button>
        </div>
        <div id="themeStatus" class="panel-status">☀️ Light Mode</div>
      </div>
    </details>`;
}

export function generateColorTemplateSectionHTML({ open = false } = {}) {
  return `
    <details class="panel-section-accordion" ${open ? 'open' : ''}>
      <summary class="panel-section-header">
        <span class="section-icon">🌈</span>
        <span class="section-label">Palette</span>
      </summary>
      <div class="panel-section-content">
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Color Template</span>
            <span class="control-value"></span>
          </div>
          <select id="colorSelect"></select>
        </label>
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Rotate on Reload</span>
            <span class="control-value"></span>
          </div>
          <input id="paletteRotateOnReload" type="checkbox" />
        </label>
      </div>
    </details>`;
}

export function generateMasterSectionsHTML() {
  let html = '';

  for (const group of MASTER_GROUPS) {
    let groupContent = '';

    for (const key of group.sections) {
      if (!CONTROL_SECTIONS[key]) continue;
      groupContent += generateSectionHTML(key, CONTROL_SECTIONS[key]);
    }

    if (!groupContent) continue;

    html += `
      <details class="panel-master-group" open>
        <summary class="panel-master-group-header">
          ${group.icon ? `<span class="panel-master-group-icon">${group.icon}</span>` : ''}
          <span class="panel-master-group-title">${group.title}</span>
        </summary>
        <div class="panel-master-group-content">
          ${groupContent}
        </div>
      </details>`;
  }

  return html;
}

// Generate sections for GLOBAL group only
export function generateGlobalSectionsHTML() {
  const globalSections = ['colors', 'colorDistribution', 'noise', 'uiSpacing', 'cursor', 'trail', 'links', 'scene'];
  let html = '';
  for (const key of globalSections) {
    if (!CONTROL_SECTIONS[key]) continue;
    html += generateSectionHTML(key, CONTROL_SECTIONS[key]);
  }
  return html;
}

// Generate sections for SIMULATIONS group only
export function generateSimulationsSectionsHTML() {
  const simSections = ['liteMode', 'physics', 'balls', 'wall', 'simulationOverlay'];
  let html = '';
  for (const key of simSections) {
    if (!CONTROL_SECTIONS[key]) continue;
    html += generateSectionHTML(key, CONTROL_SECTIONS[key]);
  }
  // Add all mode-specific sections
  for (const [key, section] of Object.entries(CONTROL_SECTIONS)) {
    if (section?.mode) {
      html += generateSectionHTML(key, section);
    }
  }
  return html;
}

// Generate sections for BROWSER & TRANSITION group only
export function generateBrowserTransitionSectionsHTML() {
  const browserSections = ['environment', 'entrance', 'overlay'];
  let html = '';
  for (const key of browserSections) {
    if (!CONTROL_SECTIONS[key]) continue;
    html += generateSectionHTML(key, CONTROL_SECTIONS[key]);
  }
  return html;
}

function generateHomeModeSectionHTML() {
  // Mode-specific options should appear directly under the mode selector.
  const modeControlsHtml = Object.entries(CONTROL_SECTIONS)
    .filter(([, section]) => section?.mode)
    .map(([key, section]) => generateSectionHTML(key, section))
    .join('');

  return `
    <details class="panel-section-accordion" open>
      <summary class="panel-section-header">
        <span class="section-icon">🎛️</span>
        <span class="section-label">Mode</span>
      </summary>
      <div class="panel-section-content">
        <div class="mode-switcher" role="group" aria-label="Simulation mode selector">
          ${(() => {
            const modeIcons = {
              'pit': '🎯',
              'bubbles': '🫧',
              'critters': '🐝',
              'flies': '🕊️',
              'water': '🌊',
              'vortex': '⚛️',
              'magnetic': '🧲',
              'dvd-logo': '📀',
              'weightless': '🌌',
              'kaleidoscope-3': '🪞',
              'neural': '🧠',
            'parallax-linear': '🎚️',
              '3d-sphere': '🌐',
              '3d-cube': '🧊',
              'starfield-3d': '✨',
              'elastic-center': '⭕'
            };
            const modeLabels = {
              'pit': 'Pit',
              'bubbles': 'Bubbles',
              'critters': 'Hive',
              'flies': 'Flies',
              'water': 'Water',
              'vortex': 'Electrons',
              'magnetic': 'Magnet',
              'dvd-logo': 'DVD',
              'weightless': 'Zero-G',
              'kaleidoscope-3': 'Kalei',
              'neural': 'Neural',
            'parallax-linear': 'Parallax Lin',
              '3d-sphere': 'Sphere 3D',
              '3d-cube': 'Cube 3D',
              'starfield-3d': 'Starfield 3D',
              'elastic-center': 'Elastic Center'
            };
            let buttons = '';
            NARRATIVE_MODE_SEQUENCE.forEach((mode, idx) => {
              const modeKey = mode;
              const icon = modeIcons[modeKey] || '⚪';
              const label = modeLabels[modeKey] || modeKey;
              const number = String(idx + 1).padStart(2, '0');
              const ariaLabel = `${number} · ${(NARRATIVE_CHAPTER_TITLES[mode] || label)} mode`;
              buttons += `<button class="mode-button" data-mode="${modeKey}" aria-label="${ariaLabel}"><span class="mode-button-number">${number}</span><span class="mode-button-label">${icon} ${label}</span></button>`;
            });
            return buttons;
          })()}
        </div>
        ${modeControlsHtml}
      </div>
    </details>`;
}

export function generateHomePanelHTML() {
  // NOTE: Don't wrap in .panel-content here - panel-dock.js creates that wrapper
  let html = `
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only" id="announcer"></div>
    ${generateHomeModeSectionHTML()}
  `;

  for (const [key, section] of Object.entries(CONTROL_SECTIONS)) {
    if (section?.mode) continue;
    if (MASTER_SECTION_KEYS.includes(key)) continue;
    html += generateSectionHTML(key, section);
  }

  return html;
}

export function generatePanelHTML() {
  // NOTE: Don't wrap in .panel-content here - panel-dock.js creates that wrapper

  // Rule: every simulation must have at least 4 configurable parameters.
  // We enforce this in dev as a warning to keep production resilient.
  try {
    for (const [, section] of Object.entries(CONTROL_SECTIONS)) {
      if (!section?.mode) continue;
      const n = Array.isArray(section.controls) ? section.controls.length : 0;
      if (n < 4) console.warn(`[panel] Mode \"${section.mode}\" has only ${n} controls; add at least 4 parameters.`);
    }
  } catch (e) {}

  // Backwards compatibility: preserve the original full-panel HTML for any legacy code paths.
  return `
    ${generateThemeSectionHTML({ open: true })}
    ${generateMasterSectionsHTML()}
    ${generateHomePanelHTML()}
    ${generateColorTemplateSectionHTML({ open: false })}
    <div class="panel-footer">
      <kbd>R</kbd> reset · <kbd>/</kbd> panel · <kbd>←</kbd><kbd>→</kbd> switch modes
    </div>
  `;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL BINDING (wire sliders to state)
// ═══════════════════════════════════════════════════════════════════════════════

export function bindRegisteredControls() {
  const g = getGlobals();
  
  for (const [sectionKey, section] of Object.entries(CONTROL_SECTIONS)) {
    for (const control of section.controls) {
      const valId = control.id + 'Val';
      const valEl = document.getElementById(valId);

      // Color distribution binding (custom)
      if (control.type === 'colorDistribution') {
        const labels = Array.isArray(control.labels) ? control.labels : [];
        const resetBtn = document.getElementById('colorDistResetBtn');

        function normalizeLabel(s) {
          return String(s || '').trim().toLowerCase();
        }

        function clampIntLocal(v, min, max, fallback = min) {
          const n = Number(v);
          if (!Number.isFinite(n)) return fallback;
          const i = Math.floor(n);
          return i < min ? min : i > max ? max : i;
        }

        function buildPaletteOptions(usedByIndex) {
          // Palette indices are stable (0..7), colors vary by template.
          const out = [];
          for (let idx = 0; idx < 8; idx++) {
            const labelSuffix = usedByIndex[idx] ? ` — ${usedByIndex[idx]}` : '';
            out.push({ value: String(idx), label: `Ball ${idx + 1}${labelSuffix}` });
          }
          return out;
        }

        function sanitizeDistribution(src) {
          const base = Array.isArray(g.colorDistribution) ? g.colorDistribution : [];
          const map = new Map();
          for (const row of base) {
            map.set(normalizeLabel(row?.label), row);
          }
          // Backward compat: label rename(s). Key is the NEW label, value is the LEGACY label.
          const legacyLabelFor = new Map([
            ['art & visual direction', 'frontend craft'],
          ]);
          // Start from src if valid, otherwise base.
          const raw = Array.isArray(src) ? src : base;
          const out = [];
          const used = new Set();

          // Collect preferred indices in order.
          for (let i = 0; i < labels.length; i++) {
            const label = String(labels[i] || '').trim();
            const key = normalizeLabel(label);
            const legacyKey = legacyLabelFor.get(key);
            const incoming = raw.find(r => normalizeLabel(r?.label) === key)
              || (legacyKey ? raw.find(r => normalizeLabel(r?.label) === legacyKey) : null)
              || map.get(key)
              || (legacyKey ? map.get(legacyKey) : null)
              || { label };
            let idx = clampIntLocal(incoming?.colorIndex, 0, 7, clampIntLocal(map.get(key)?.colorIndex, 0, 7, 0));
            // Enforce uniqueness: if already used, pick the first free palette slot.
            if (used.has(idx)) {
              for (let j = 0; j < 8; j++) {
                if (!used.has(j)) { idx = j; break; }
              }
            }
            used.add(idx);
            const w = clampIntLocal(incoming?.weight, 0, 100, clampIntLocal(map.get(key)?.weight, 0, 100, 0));
            out.push({ label, colorIndex: idx, weight: w });
          }
          return out;
        }

        function normalizeWeightsTo100(weights, preferredIdx = 0) {
          // Integer weights, clamp 0..100, then fix rounding drift to sum exactly 100.
          const w = weights.map(x => clampIntLocal(x, 0, 100, 0));
          let sum = 0;
          for (let i = 0; i < w.length; i++) sum += w[i];
          if (sum === 100) return w;
          if (sum === 0) {
            w[preferredIdx] = 100;
            return w;
          }
          // Scale to 100, then distribute remainder.
          const scaled = new Array(w.length).fill(0);
          let scaledSum = 0;
          for (let i = 0; i < w.length; i++) {
            const v = Math.round((w[i] / sum) * 100);
            scaled[i] = v;
            scaledSum += v;
          }
          let drift = 100 - scaledSum;
          // Fix drift by adding/subtracting 1s.
          while (drift !== 0) {
            if (drift > 0) {
              // Add to the largest (prefer the edited index if tie).
              let best = 0;
              for (let i = 1; i < scaled.length; i++) {
                if (scaled[i] > scaled[best]) best = i;
              }
              scaled[best] += 1;
              drift -= 1;
            } else {
              // Subtract from the largest positive.
              let best = -1;
              for (let i = 0; i < scaled.length; i++) {
                if (scaled[i] > 0 && (best === -1 || scaled[i] > scaled[best])) best = i;
              }
              if (best === -1) break;
              scaled[best] -= 1;
              drift += 1;
            }
          }
          return scaled.map(x => clampIntLocal(x, 0, 100, 0));
        }

        function rebalanceWeights(dist, changedRow, newWeight) {
          const weights = dist.map(r => clampIntLocal(r?.weight, 0, 100, 0));
          weights[changedRow] = clampIntLocal(newWeight, 0, 100, weights[changedRow]);
          const sum = weights.reduce((a, b) => a + b, 0);
          if (sum === 100) return weights;
          // Normalize to 100 while preserving relative proportions as much as possible.
          return normalizeWeightsTo100(weights, changedRow);
        }

        function getModeBallCountApprox() {
          // Best-effort: show an approximate per-mode ball count for “≈N balls” readouts.
          const mode = g.currentMode;
          const map = {
            pit: null,
            flies: g.fliesBallCount,
            weightless: g.weightlessCount,
            water: g.waterBallCount,
            vortex: g.vortexBallCount,
            magnetic: g.magneticBallCount,
            bubbles: g.bubblesMaxCount,
            'kaleidoscope-3': g.kaleidoscope3BallCount,
            critters: g.critterCount,
            neural: g.neuralBallCount
          };
          const v = map[mode];
          return Number.isFinite(Number(v)) ? Number(v) : null;
        }

        function applyDistributionSideEffects() {
          // 1) Update legend classes (label → palette slot)
          import('./legend-colors.js')
            .then(({ applyExpertiseLegendColors }) => applyExpertiseLegendColors?.())
            .catch(() => {});
          // 2) Recolor existing balls for immediate feedback (event-driven; not hot path)
          import('../visual/colors.js')
            .then(({ pickRandomColor }) => {
              if (typeof pickRandomColor !== 'function') return;
              const balls = g.balls || [];
              for (let i = 0; i < balls.length; i++) {
                balls[i].color = pickRandomColor();
              }
            })
            .catch(() => {});
        }

        function syncColorDistributionUI() {
          // Ensure state is sane + unique.
          const sanitized = sanitizeDistribution(g.colorDistribution);
          // Ensure sum to 100.
          const weights = normalizeWeightsTo100(sanitized.map(r => r.weight), 0);
          for (let i = 0; i < sanitized.length; i++) sanitized[i].weight = weights[i];
          g.colorDistribution = sanitized;

          // Used colors map (for disabling dropdown options).
          const usedByIndex = {};
          for (let i = 0; i < sanitized.length; i++) {
            usedByIndex[sanitized[i].colorIndex] = sanitized[i].label;
          }

          const options = buildPaletteOptions(usedByIndex);
          const modeCount = getModeBallCountApprox();

          // Update each row UI.
          for (let i = 0; i < labels.length; i++) {
            const row = sanitized[i] || { colorIndex: 0, weight: 0, label: labels[i] };
            const swatch = document.getElementById(`colorDistSwatch${i}`);
            const select = document.getElementById(`colorDistColor${i}`);
            const weight = document.getElementById(`colorDistWeight${i}`);
            const weightVal = document.getElementById(`colorDistWeightVal${i}`);
            if (select) {
              // Rebuild options with disabled selections (except your own current selection).
              select.innerHTML = '';
              for (const o of options) {
                const opt = document.createElement('option');
                opt.value = o.value;
                opt.textContent = o.label;
                const idx = clampIntLocal(o.value, 0, 7, 0);
                const takenBy = usedByIndex[idx];
                const isMine = idx === row.colorIndex;
                if (takenBy && !isMine) opt.disabled = true;
                select.appendChild(opt);
              }
              select.value = String(row.colorIndex);
            }
            if (weight) {
              weight.value = String(clampIntLocal(row.weight, 0, 100, 0));
            }
            if (weightVal) {
              const pct = clampIntLocal(row.weight, 0, 100, 0);
              const approx = (modeCount != null) ? Math.round((pct / 100) * modeCount) : null;
              weightVal.textContent = approx != null ? `${pct}% (≈${approx})` : `${pct}%`;
            }
            if (swatch) {
              const idx = clampIntLocal(row.colorIndex, 0, 7, 0);
              // We use CSS vars to stay aligned with the current template + dark mode.
              swatch.style.backgroundColor = `var(--ball-${idx + 1})`;
            }
          }

          // Total
          const totalEl = document.getElementById('colorDistTotalVal');
          if (totalEl) {
            let total = 0;
            for (let i = 0; i < sanitized.length; i++) total += sanitized[i].weight;
            totalEl.textContent = `${total}%`;
          }
        }

        // Initial sync (panel just mounted)
        try { syncColorDistributionUI(); } catch (e) {}

        // Reset defaults
        if (resetBtn) {
          resetBtn.addEventListener('click', () => {
            const defaults = g?.config?.colorDistribution;
            g.colorDistribution = sanitizeDistribution(defaults);
            const weights = normalizeWeightsTo100(g.colorDistribution.map(r => r.weight), 0);
            for (let i = 0; i < g.colorDistribution.length; i++) g.colorDistribution[i].weight = weights[i];
            syncColorDistributionUI();
            applyDistributionSideEffects();
          });
        }

        // Wire per-row events
        for (let i = 0; i < labels.length; i++) {
          const select = document.getElementById(`colorDistColor${i}`);
          const weight = document.getElementById(`colorDistWeight${i}`);

          if (select) {
            select.addEventListener('change', () => {
              const idx = clampIntLocal(select.value, 0, 7, 0);
              const dist = sanitizeDistribution(g.colorDistribution);
              dist[i].colorIndex = idx;
              g.colorDistribution = dist;
              syncColorDistributionUI();
              applyDistributionSideEffects();
            });
          }

          if (weight) {
            weight.addEventListener('input', () => {
              const val = clampIntLocal(weight.value, 0, 100, 0);
              const dist = sanitizeDistribution(g.colorDistribution);
              const newWeights = rebalanceWeights(dist, i, val);
              for (let j = 0; j < dist.length; j++) dist[j].weight = newWeights[j];
              g.colorDistribution = dist;
              syncColorDistributionUI();
              applyDistributionSideEffects();
            });
          }
        }

        continue;
      }
      
      // Color picker binding
      if (control.type === 'color') {
        const pickerId = control.id + 'Picker';
        const pickerEl = document.getElementById(pickerId);
        
        if (!pickerEl) continue;
        
        pickerEl.addEventListener('input', () => {
          const colorVal = pickerEl.value;
          
          // Update state
          if (control.stateKey) {
            g[control.stateKey] = colorVal;
          }
          
          // Custom handler (most color pickers use this for multi-var updates)
          if (control.onChange) {
            control.onChange(g, colorVal);
          }
          
          // Update display value
          if (valEl) {
            valEl.textContent = colorVal;
          }
          
        });
        
        continue;
      }

      // Select binding
      if (control.type === 'select') {
        const selectId = control.id + 'Slider';
        const el = document.getElementById(selectId);
        if (!el) continue;
        
        el.addEventListener('change', () => {
          const rawVal = control.parse ? control.parse(el.value) : el.value;
          
          if (control.stateKey) {
            g[control.stateKey] = rawVal;
          }
          
          if (control.onChange) {
            control.onChange(g, rawVal);
          }
          
          if (valEl) {
            const displayVal = control.stateKey ? g[control.stateKey] : rawVal;
            valEl.textContent = control.format ? control.format(displayVal) : String(displayVal);
          }
        });
        
        continue;
      }

      // Boolean binding (checkbox / toggle alias)
      if (control.type === 'checkbox' || control.type === 'toggle') {
        const checkboxId = control.id + 'Slider';
        const el = document.getElementById(checkboxId);
        if (!el) continue;

        el.addEventListener('change', () => {
          const rawVal = !!el.checked;

          if (control.stateKey) {
            g[control.stateKey] = rawVal;
          }

          if (control.onChange) {
            control.onChange(g, rawVal);
          }

          if (valEl) {
            valEl.textContent = rawVal ? 'On' : 'Off';
          }

          // Re-init mode if needed
          // IMPORTANT: Do NOT import per-mode module files by name (e.g. `kaleidoscope-1.js` doesn't exist).
          // Always reset via the mode controller so variants that share a module re-init correctly.
          if (control.reinitMode && g.currentMode === section.mode) {
            import('../modes/mode-controller.js')
              .then(({ resetCurrentMode }) => resetCurrentMode?.())
              .catch(() => {});
          }
        });

        continue;
      }

      // Default: Range slider binding
      const sliderId = control.id + 'Slider';
      const el = document.getElementById(sliderId);
      
      if (!el) continue;
      
      el.addEventListener('input', () => {
        const hasParse = typeof control?.parse === 'function';
        const rawVal = hasParse ? control.parse(el.value) : Number.parseFloat(el.value);
        
        // Update state (ALWAYS if stateKey exists)
        if (control.stateKey) {
          g[control.stateKey] = rawVal;
        }
        
        // Custom handler (AFTER state update)
        if (control.onChange) {
          control.onChange(g, rawVal);
        }
        
        // Update display value
        if (valEl) {
          const displayVal = control.stateKey ? g[control.stateKey] : rawVal;
          valEl.textContent = control.format(displayVal);
        }
        
        // Apply CSS variable if defined
        if (control.cssVar && applyVisualCSSVars) {
          // Map control key to CSS var config object
          const cssConfig = {};
          const cssKey = control.cssVar.replace('--', '').replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          cssConfig[cssKey] = rawVal;
          applyVisualCSSVars(cssConfig);
        }
        
        // Re-init mode if needed (see note above)
        if (control.reinitMode && g.currentMode === section.mode) {
          import('../modes/mode-controller.js')
            .then(({ resetCurrentMode }) => resetCurrentMode?.())
            .catch(() => {});
        }
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC SLIDERS TO STATE (after loading saved settings)
// ═══════════════════════════════════════════════════════════════════════════════

export function syncSlidersToState(options = {}) {
  const g = getGlobals();
  const runOnChange = options.runOnChange !== false;
  
  for (const section of Object.values(CONTROL_SECTIONS)) {
    for (const control of section.controls) {
      // Custom: color distribution UI is synced in bindRegisteredControls (it needs to build options).
      if (control.type === 'colorDistribution') {
        // No-op here.
        continue;
      }
      
      // Color pickers use 'Picker' suffix, others use 'Slider'
      const elementId = control.type === 'color' ? (control.id + 'Picker') : (control.id + 'Slider');
      const valId = control.id + 'Val';
      const el = document.getElementById(elementId);
      const valEl = document.getElementById(valId);
      
      if (!el || !control.stateKey) continue;
      
      const stateVal = g[control.stateKey];
      if (stateVal !== undefined) {
        if (control.type === 'checkbox' || control.type === 'toggle') {
          el.checked = !!stateVal;
          if (valEl) valEl.textContent = stateVal ? 'On' : 'Off';
        } else if (control.type === 'color') {
          el.value = stateVal;
          if (valEl) valEl.textContent = stateVal;
        } else {
          el.value = stateVal;
          if (valEl) valEl.textContent = control.format ? control.format(stateVal) : String(stateVal);
        }
        
        // Call onChange handler to initialize CSS variables / apply side effects.
        // IMPORTANT: Avoid re-entrant loops for preset selectors that themselves call `syncSlidersToState()`.
        // (e.g. wallPreset → applyWallPreset → syncSlidersToState → wallPreset.onChange → ...)
        if (runOnChange && control.onChange && control.id !== 'wallPreset') {
          control.onChange(g, stateVal);
        }
      }
    }
  }
}
