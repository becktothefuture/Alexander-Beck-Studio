// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                     CENTRALIZED CONTROL REGISTRY                             ║
// ║        Single source of truth for all panel controls                         ║
// ║        Supports visibility toggling and dynamic HTML generation              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { applyLayoutCSSVars, applyLayoutFromVwToPx, getGlobals } from '../core/state.js';
import {
  DEV_ONLY_MODES,
  NARRATIVE_MODE_SEQUENCE,
  NARRATIVE_CHAPTER_TITLES,
  MODES,
  isPitLikeMode,
} from '../core/constants.js';
import { getReloadSimulationId } from '../../../data/simulationCatalog.js';
import { resetCurrentMode, setMode } from '../modes/mode-controller.js';
import { resize } from '../rendering/renderer.js';
import { updateCursorSize } from '../rendering/cursor.js';
import { invalidateHomepageCanvasTitleGeometry } from '../rendering/title-depth.js';
import { getCurrentTheme, setTheme } from '../visual/dark-mode-v2.js';
import { applyNoiseSystem } from '../visual/noise-system.js';
import { updateWallShadowCSS, hexToRgb, hexToRgbString } from '../visual/wall-shadow.js';
import { initQuotePuck } from './quote-puck.js';
import { destroyQuoteDisplay, initQuoteDisplay } from './quote-display.js';
import { forEachPanelUiDocument, registerPanelUiDocument, resolvePanelUiDocument } from './panel-ui-context.js';
import {
  BUTTON_BAR_CONTROL_GROUPS,
  BUTTON_BAR_DEFAULTS,
  applyButtonBarCssVars,
  formatButtonBarControlValue,
} from '../../../lib/buttonBarControls.js';
import { CUBE_3D_DEFAULTS, CUBE_3D_LIMITS } from '../modes/cube3d-config.js';
// The color-distribution leaf owns configureSimulationPalette publication.
import { bindColorDistributionControl, generateColorDistributionControlHTML } from './color-distribution-control.js';
import {
  SIMULATION_ATMOSPHERE_CONTROL_SECTIONS,
  buildSimulationAtmosphereConfigFromControlState,
  hydrateSimulationAtmosphereControlState,
} from './control-definitions/simulation-atmosphere-controls.js';

export {
  buildSimulationAtmosphereConfigFromControlState,
  hydrateSimulationAtmosphereControlState,
};



// Will be set by main.js to avoid circular dependency
let applyVisualCSSVars = null;
export function setApplyVisualCSSVars(fn) {
  applyVisualCSSVars = fn;
}

// Will be set by main.js
let updateTactileLayerFn = null;
export function setUpdateTactileLayer(fn) {
  updateTactileLayerFn = fn;
}

function getUiDocument(uiDocument) {
  return resolvePanelUiDocument(uiDocument);
}

function getUiElementById(id, uiDocument) {
  const doc = getUiDocument(uiDocument);
  return doc ? doc.getElementById(id) : null;
}

function forEachUiElementById(id, callback) {
  if (!id || typeof callback !== 'function') return;
  forEachPanelUiDocument((uiDocument) => {
    const element = uiDocument.getElementById(id);
    if (element) callback(element, uiDocument);
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL SHADOW CSS UPDATE
// Legacy note: wall depth is now carried by .inner-wall-gradient-edge.
// ═══════════════════════════════════════════════════════════════════════════════

// Export for initialization
export { updateWallShadowCSS };

// ═══════════════════════════════════════════════════════════════════════════════
// CONTROL VISIBILITY STATE
// Which controls are visible in the panel (persisted to localStorage)
// ═══════════════════════════════════════════════════════════════════════════════

const VISIBILITY_STORAGE_KEY = 'panel_control_visibility';

let controlVisibility = {};

const DEFAULT_HIDDEN_CONTROL_IDS = new Set([
  // Superseded by the shared Studio surface system.
  'hoverEdgeEnabled',
  'hoverEdgeWidth',
  'hoverEdgeInset',
  'hoverEdgeBottomEnabled',
  'hoverEdgeBottomRadius',
  'hoverEdgeBottomOpacity',
  'hoverEdgeBottomColorMix',
  'hoverEdgeTopEnabled',
  'hoverEdgeTopRadius',
  'hoverEdgeTopOpacity',
  'hoverEdgeTopColorMix',
  'frameBorderGradientEdgeOpacity',
  'frameBorderGradientMidOpacity',
  'frameVignetteEdgeOffsetY',
  'frameVignetteEdgeBlur',
  'frameVignetteEdgeOpacity',
  'frameVignetteAmbientBlur',
  'frameVignetteAmbientOpacity',

  // Keep browser wall tuning focused on the higher-level atmosphere sliders.
  'outerWallShineEnabled',
  'wallLightFluctuationEnabled',
  'wallAOSpread',
  'wallSpecularEnabled',
  'wallSpecularWidth',
  'wallAOOpacityLight',
  'wallSpecularOpacityLight',
  'outerWallShineBlurLight',
  'outerWallShineSpreadLight',
  'outerWallShineOvershootLight',
  'outerWallShineOpacityLight',
  'outerWallShineColorLight',
  'wallAOOpacityDark',
  'wallSpecularOpacityDark',
  'outerWallShineBlurDark',
  'outerWallShineSpreadDark',
  'outerWallShineOvershootDark',
  'outerWallShineOpacityDark',
  'outerWallShineColorDark',
  'innerWallShineEnabled',
  'innerWallShineBlur',
  'innerWallShineOvershoot',
  'innerWallShineSpread',
  'innerWallShineOpacityLight',
  'innerWallShineOpacityDark',
  'innerWallShineColor',

  // Low-signal modal micro-timing controls stay out of the primary tuning flow.
  'modalOverlayTransitionOutMs',
  'modalOverlayContentDelayMs',
  'modalDepthTranslateY',

  // Shared shell controls now own these values.
  'edgeCaptionDistanceMinPx',
  'edgeCaptionDistanceMaxPx',

  // Secondary polish dials stay available in code, not in the default tuning surface.
  'logoBlurInactive',
  'logoBlurActive',
]);

const RETIRED_CONTROL_IDS = new Set([
  'hoverEdgeEnabled',
  'hoverEdgeWidth',
  'hoverEdgeInset',
  'hoverEdgeBottomEnabled',
  'hoverEdgeBottomRadius',
  'hoverEdgeBottomOpacity',
  'hoverEdgeBottomColorMix',
  'hoverEdgeTopEnabled',
  'hoverEdgeTopRadius',
  'hoverEdgeTopOpacity',
  'hoverEdgeTopColorMix',
  'frameBorderGradientEdgeOpacity',
  'frameBorderGradientMidOpacity',
  'frameVignetteEdgeOffsetY',
  'frameVignetteEdgeBlur',
  'frameVignetteEdgeOpacity',
  'frameVignetteAmbientBlur',
  'frameVignetteAmbientOpacity',
  'edgeCaptionDistanceMinPx',
  'edgeCaptionDistanceMaxPx',
  'outerWallShineEnabled',
  'wallLightFluctuationEnabled',
  'wallAOSpread',
  'wallSpecularEnabled',
  'wallSpecularWidth',
  'wallAOOpacityLight',
  'wallSpecularOpacityLight',
  'outerWallShineBlurLight',
  'outerWallShineSpreadLight',
  'outerWallShineOvershootLight',
  'outerWallShineOpacityLight',
  'outerWallShineColorLight',
  'wallAOOpacityDark',
  'wallSpecularOpacityDark',
  'outerWallShineBlurDark',
  'outerWallShineSpreadDark',
  'outerWallShineOvershootDark',
  'outerWallShineOpacityDark',
  'outerWallShineColorDark',
  'innerWallShineEnabled',
  'innerWallShineBlur',
  'innerWallShineOvershoot',
  'innerWallShineSpread',
  'innerWallShineOpacityLight',
  'innerWallShineOpacityDark',
  'innerWallShineColor',
  'uiIconFramePx',
  'uiIconGlyphPx',
  'frameInnerRadius',
  'frameInnerSurface',
  'logoBlurInactive',
  'logoBlurActive',
  'tactileEnabled',
  'tactileProjectId',
  'tactileScale',
  'tactileDpi',
  'tactileOpacity',
  'tactileBlendMode',
  'tactilePointerEvents',
  'noiseSeed',
  'noiseTextureSize',
  'noiseDistribution',
  'noiseMonochrome',
  'noiseChroma',
  'noiseColorLight',
  'noiseColorDark',
  'noiseMotionAmount',
  'noiseSpeedMs',
  'noiseSpeedVariance',
  'noiseFlicker',
  'noiseFlickerSpeedMs',
  'noiseBlurPx',
  'noiseContrast',
  'noiseBrightness',
  'noiseSaturation',
  'noiseHue',
]);

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
  if (RETIRED_CONTROL_IDS.has(id)) {
    return false;
  }
  if (Object.prototype.hasOwnProperty.call(controlVisibility, id)) {
    return controlVisibility[id] !== false;
  }

  return !DEFAULT_HIDDEN_CONTROL_IDS.has(id);
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
    id: 'palette',
    title: 'Colour & Theme',
    icon: '🎨',
    sections: [
      'colors',
      'colorDistribution'
    ]
  },
  {
    id: 'finish',
    title: 'Surface Finish',
    icon: '✨',
    sections: [
      'atmosphereEdge',
      'noise'
    ]
  },
  {
    id: 'atmosphere',
    title: 'Background Atmosphere',
    icon: '🌫️',
    sections: [
      'atmosphereCommon',
      'atmosphereLight',
      'atmosphereDark'
    ]
  },
  {
    id: 'structure',
    title: 'Wall & Frame',
    icon: '🖼️',
    sections: [
      'wallGeometry'
    ]
  },
  {
    id: 'layout',
    title: 'Layout & Content',
    icon: '📐',
    sections: [
      'uiSpacing'
    ]
  },
  {
    id: 'simulations',
    title: 'Simulation Setup',
    icon: '🎛️',
    sections: []
  },
  {
    id: 'physics',
    title: 'Physics',
    icon: '⚖️',
    sections: [
      'physics'
    ]
  },
  {
    id: 'balls',
    title: 'Ball Material',
    icon: '🎱',
    sections: [
      'balls'
    ]
  },
  {
    id: 'simulationModes',
    title: 'Simulation Modes',
    icon: '⚡',
    sections: []
  },
  {
    id: 'puck',
    title: 'Quote Puck',
    icon: '🔘',
    sections: [
      'puckLight'
    ]
  },
  {
    id: 'interaction',
    title: 'Input & Links',
    icon: '🖐️',
    sections: [
      'cursor',
      'links'
    ]
  },
  {
    id: 'motion',
    title: 'Motion & Layers',
    icon: '🎭',
    sections: [
      'scene',
      'overlay',
      'entrance'
    ]
  },
  {
    id: 'runtime',
    title: 'Browser & Performance',
    icon: '🧭',
    sections: [
      'environment',
      'liteMode'
    ]
  },
  {
    id: 'audio',
    title: 'Audio',
    icon: '🔊',
    sections: []
  }
];

export const MASTER_SECTION_KEYS = MASTER_GROUPS.flatMap(group => group.sections);

function renderMasterGroupSummary(group) {
  return `
    <summary class="panel-master-group-header">
      ${group.icon ? `<span class="panel-master-group-icon">${group.icon}</span>` : ''}
      <span class="panel-master-group-title">${escapeAttr(group.title)}</span>
    </summary>`;
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

function normalizeHexColor(value) {
  const raw = String(value ?? '').trim();
  const longHex = raw.match(/^#([0-9a-f]{6})$/i);
  if (longHex) return `#${longHex[1]}`;

  const shortHex = raw.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (shortHex) {
    return `#${shortHex[1]}${shortHex[1]}${shortHex[2]}${shortHex[2]}${shortHex[3]}${shortHex[3]}`;
  }

  const rgb = raw.match(/^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/i);
  if (rgb) {
    const toHex = (channel) => Math.max(0, Math.min(255, Number(channel) || 0))
      .toString(16)
      .padStart(2, '0');
    return `#${toHex(rgb[1])}${toHex(rgb[2])}${toHex(rgb[3])}`;
  }

  return null;
}

function getColorInputValue(value, uiDocument = null) {
  const raw = String(value ?? '').trim();
  const direct = normalizeHexColor(raw);
  if (direct) return direct;

  const detected = raw.match(/^var\(--color-detected-([0-9a-f]{6})\)$/i);
  if (detected) return `#${detected[1]}`;

  const cssVar = raw.match(/^var\((--[^,\s)]+)(?:,\s*([^)]+))?\)$/);
  if (cssVar) {
    const [, varName, fallback] = cssVar;
    try {
      const doc = uiDocument || document;
      const view = doc.defaultView || window;
      const resolved = view.getComputedStyle(doc.documentElement).getPropertyValue(varName).trim();
      const resolvedHex = normalizeHexColor(resolved);
      if (resolvedHex) return resolvedHex;
    } catch (e) {}

    const fallbackHex = normalizeHexColor(fallback);
    if (fallbackHex) return fallbackHex;

    if (varName === '--color-brand-white') return '#ffffff';
    if (varName === '--color-brand-black') return '#000000';
  }

  return '#000000';
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

function createButtonBarControls() {
  return BUTTON_BAR_CONTROL_GROUPS.flatMap((group) => [
    { type: 'divider', label: `Button Bar · ${group.title}` },
    ...group.controls.map((control) => ({
      id: control.id,
      label: control.label,
      stateKey: control.id,
      type: control.type || 'range',
      min: control.min,
      max: control.max,
      step: control.step,
      default: BUTTON_BAR_DEFAULTS[control.id],
      format: (value) => formatButtonBarControlValue(value, control),
      parse: control.type === 'checkbox' ? (value) => Boolean(value) : parseFloat,
      hint: control.hint || `Button Bar: ${control.label.toLowerCase()}.`,
      onChange: (g) => {
        applyButtonBarCssVars(g);
      },
    })),
  ]);
}

export const CONTROL_SECTIONS = {
  ...SIMULATION_ATMOSPHERE_CONTROL_SECTIONS,
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
          setMode(g.currentMode);
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
        id: 'cornerShapeSquircleEnabled',
        label: 'Squircle corners',
        stateKey: 'cornerShapeSquircleEnabled',
        type: 'toggle',
        default: true,
        format: v => (v ? 'On' : 'Off'),
        parse: v => !!v,
        hint: 'iOS-style continuous corner curves via CSS corner-shape (supported browsers only). Applied site-wide from <html> class; matches design-system runtime.cornerShapeSquircleEnabled.',
        onChange: () => {
          applyLayoutCSSVars();
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
      { type: 'divider', label: 'Material' },
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
        min: 0, max: 1, step: 0.01,
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
        min: 0, max: 1, step: 0.001,
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
        id: 'ballSizeMin',
        label: 'Size Min',
        stateKey: 'ballSizeMin',
        type: 'range',
        min: 8, max: 40, step: 1,
        default: 12,
        format: v => v + 'px',
        parse: parseFloat,
        hint: 'Ball radius at smallest viewport (var(--size-320))',
        onChange: (g, val) => {
          g.ballSizeMin = val;
          import('../core/state.js').then(({ updateBallSizes }) => {
            updateBallSizes();
            const newSize = g.R_MED;
            if (g.currentMode !== MODES.PORTFOLIO_PIT && g.balls && g.balls.length) {
              g.balls.forEach(b => { b.r = newSize; b.rBase = newSize; });
            }
          });
          updateCursorSize();
        }
      },
      {
        id: 'ballSizeMax',
        label: 'Size Max',
        stateKey: 'ballSizeMax',
        type: 'range',
        min: 10, max: 60, step: 1,
        default: 12,
        format: v => v + 'px',
        parse: parseFloat,
        hint: 'Ball radius at largest viewport (var(--size-1920))',
        onChange: (g, val) => {
          g.ballSizeMax = val;
          import('../core/state.js').then(({ updateBallSizes }) => {
            updateBallSizes();
            const newSize = g.R_MED;
            if (g.currentMode !== MODES.PORTFOLIO_PIT && g.balls && g.balls.length) {
              g.balls.forEach(b => { b.r = newSize; b.rBase = newSize; });
            }
          });
          updateCursorSize();
        }
      },
      {
        id: 'ballSizeCurve',
        label: 'Size Curve',
        stateKey: 'ballSizeCurve',
        type: 'range',
        min: 0.2, max: 5, step: 0.1,
        default: 1.6,
        format: v => v.toFixed(1),
        parse: parseFloat,
        hint: 'Easing curve (1=linear, >1=smaller longer, <1=grows faster)',
        onChange: (g, val) => {
          g.ballSizeCurve = val;
          import('../core/state.js').then(({ updateBallSizes }) => {
            updateBallSizes();
            const newSize = g.R_MED;
            if (g.currentMode !== MODES.PORTFOLIO_PIT && g.balls && g.balls.length) {
              g.balls.forEach(b => { b.r = newSize; b.rBase = newSize; });
            }
          });
          updateCursorSize();
        }
      },
      {
        id: 'mobileObjectReductionFactor',
        label: 'Mobile Density',
        stateKey: 'mobileObjectReductionFactor',
        type: 'range',
        min: 0, max: 1.0, step: 0.05,
        default: 1.0,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Scales object counts on mobile (0% = none). Resets the current mode.',
        onChange: (g, _val) => {
          setMode(g.currentMode);
        }
      },
      {
        id: 'mobileSimulationBodyScale',
        label: 'Mobile Body Size',
        stateKey: 'mobileSimulationBodyScale',
        type: 'range',
        min: 0.5, max: 1, step: 0.05,
        default: 0.65,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Scales simulation body radii on mobile after responsive sizing. Resets the current mode.',
        onChange: (g, _val) => {
          import('../core/state.js').then(({ updateBallSizes }) => {
            updateBallSizes();
            setMode(g.currentMode);
          });
          updateCursorSize();
        }
      },
      {
        id: 'ballSoftnessGlobal',
        label: 'Softness',
        stateKey: 'ballSoftness',
        type: 'range',
        min: 0, max: 100, step: 1,
        default: 29,
        format: v => String(v),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'pebbleBlend',
        label: 'Pebble Blend',
        stateKey: 'pebbleBlend',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.86,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Circle-to-pebble amount. Phase 1 is render-only; collisions stay circular.'
      },
      {
        id: 'pebbleStretch',
        label: 'Pebble Stretch',
        stateKey: 'pebbleStretch',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.30,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Long-axis pressure for ovals and slight squeezes. Phase 1 is render-only.'
      },
      {
        id: 'pebbleOrganic',
        label: 'Pebble Organic',
        stateKey: 'pebbleOrganic',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.24,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Asymmetry and contour drift. Higher values feel less geometric.'
      },
      {
        id: 'pebbleBulge',
        label: 'Pebble Bulge',
        stateKey: 'pebbleBulge',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.42,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Fullness versus pinch. Higher values feel thicker and softer.'
      },
      {
        id: 'ballSpacing',
        label: 'Spacing',
        stateKey: 'ballSpacing',
        type: 'range',
        min: 0, max: 1, step: 0.01,
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
        min: 0, max: 1, step: 0.01,
        default: 0.66,
        format: v => Math.round(v * 100) + '%',
        parse: parseFloat,
        hint: 'Max radius deviation from medium (100% = ±100% of cap scale)',
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
        default: 7,
        format: v => `${v.toFixed(1)}vw`,
        parse: parseFloat,
        hint: 'Universal cursor interaction zone (scales with viewport width).'
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
         min: -0.05, max: 1, step: 0.001,
         default: 0.015,
         format: v => `${(Number(v) * 100).toFixed(1)}%`,
         parse: parseFloat,
         hint: 'Additive padding on top of the frame-clear inset, as a fraction of layout width. Back-compat: old px values are auto-converted.',
         onChange: (g, val) => {
           const valueToSync = val !== undefined ? val : (g.contentPaddingRatio !== undefined ? g.contentPaddingRatio : 0);
           
           import('../core/state.js').then(({ applyLayoutFromVwToPx, applyLayoutCSSVars, getLayoutViewportWidthPx }) => {
             applyLayoutFromVwToPx();
             applyLayoutCSSVars();
             try {
               const frac = Number(valueToSync) || 0;
               const layoutWidth = (() => {
                 try {
                   const v = getComputedStyle(document.documentElement).getPropertyValue('--layout-viewport-width-px').trim();
                   const n = parseFloat(v);
                   return Number.isFinite(n) ? n : Math.max(1, getLayoutViewportWidthPx());
                 } catch (e) { return Math.max(1, getLayoutViewportWidthPx()); }
               })();
               const addPx = Math.round(layoutWidth * frac);
               const total = Math.round(g.contentPadding || 0);
               const text = `${(frac >= 0 ? '+' : '')}${(frac * 100).toFixed(1)}% (${addPx >= 0 ? '+' : ''}${addPx}px) → ${total}px`;
               forEachUiElementById('contentPaddingRatioVal', (el) => {
                 el.textContent = text;
               });
             } catch (e) {}
             try { document.dispatchEvent(new CustomEvent('layout-updated')); } catch (e) {}
           }).catch(() => {});
           try { resize(); } catch (e) {}
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
              const ratio = Number(g.contentPaddingHorizontalRatio || 1.0);
              const text = `${ratio.toFixed(2)}× → ${Math.round(g.contentPaddingX || g.contentPadding)}px`;
              forEachUiElementById('contentPaddingHorizontalRatioVal', (el) => {
                el.textContent = text;
              });
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
           import('../core/state.js').then(({ applyLayoutFromVwToPx, applyLayoutCSSVars, getGlobals }) => {
             getGlobals().contentPaddingBottomRatio = ratio;
             applyLayoutFromVwToPx();
             applyLayoutCSSVars();
           }).catch(() => {});
       }
       },

      { type: 'divider', label: 'Hit Areas' },
      {
        id: 'uiHitAreaMul',
        label: 'Hit Area Mul',
        stateKey: 'uiHitAreaMul',
        type: 'range',
        min: 0.5, max: 2.5, step: 0.05,
        default: 0.9,
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
        default: 0.4,
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
        default: 44.5,
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
      ...createButtonBarControls(),
      {
        id: 'homeMainLinksBelowLogoPx',
        label: 'Links Offset',
        stateKey: 'homeMainLinksBelowLogoPx',
        type: 'range',
        min: -120, max: 240, step: 1,
        default: 96,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Index: move the main links up/down below the logo.',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--home-main-links-below-logo-px', val + 'px');
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
        default: 9,
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
      { type: 'divider', label: 'Hover Motion', group: 'Motion' },
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
      },
      {
        id: 'linkHoverNudge',
        label: 'Hover Nudge',
        stateKey: 'linkHoverNudge',
        type: 'range',
        min: 0, max: 4, step: 0.25,
        default: 1,
        format: v => `${v.toFixed(2)}px`,
        parse: parseFloat,
        hint: 'Vertical translation applied to hover/focus/active states for corner links.',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--link-nudge', `${val}px`);
        }
      },
      { type: 'divider', label: 'Hover Color', group: 'Color' },
      {
        id: 'linkHoverIntensityLight',
        label: 'Tint (Light)',
        stateKey: 'linkHoverIntensityLight',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.34,
        format: v => `${(v * 100).toFixed(1)}%`,
        parse: parseFloat,
        hint: 'Cursor color mix percentage for hover backgrounds in light mode.',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--abs-hover-intensity-light', `${(Math.max(0, Math.min(1, val)) * 100).toFixed(1)}%`);
        }
      },
      {
        id: 'linkHoverIntensityDark',
        label: 'Tint (Dark)',
        stateKey: 'linkHoverIntensityDark',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.24,
        format: v => `${(v * 100).toFixed(1)}%`,
        parse: parseFloat,
        hint: 'Cursor color mix percentage for hover backgrounds in dark mode.',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--abs-hover-intensity-dark', `${(Math.max(0, Math.min(1, val)) * 100).toFixed(1)}%`);
        }
      },
      {
        id: 'linkHoverIntensityActive',
        label: 'Tint (Active)',
        stateKey: 'linkHoverIntensityActive',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.18,
        format: v => `${(v * 100).toFixed(1)}%`,
        parse: parseFloat,
        hint: 'Cursor color mix percentage while a link/button is active.',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--abs-hover-intensity-active', `${(Math.max(0, Math.min(1, val)) * 100).toFixed(1)}%`);
        }
      },
      
      // ─── HOVER EDGE LIGHTING ───
      // Radial gradient strokes on hover backgrounds - mirrors wall gradient stroke system
      { type: 'divider', label: 'Edge Lighting', group: 'Edge Lighting' },
      {
        id: 'hoverEdgeEnabled',
        label: 'Enabled',
        stateKey: 'hoverEdgeEnabled',
        type: 'checkbox',
        default: true,
        format: v => (v ? 'On' : 'Off'),
        parse: v => !!v,
        group: 'Edge Lighting',
        hint: 'Master toggle for hover edge lighting effect',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--hover-edge-enabled', val ? '1' : '0');
        }
      },
      {
        id: 'hoverEdgeWidth',
        label: 'Stroke Width',
        stateKey: 'hoverEdgeWidth',
        type: 'range',
        min: 0.1, max: 3, step: 0.1,
        default: 1,
        format: v => `${v.toFixed(1)}px`,
        parse: parseFloat,
        group: 'Edge Lighting',
        hint: 'Width of the edge lighting stroke',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--hover-edge-width', `${val}px`);
        }
      },
      {
        id: 'hoverEdgeInset',
        label: 'Inset',
        stateKey: 'hoverEdgeInset',
        type: 'range',
        min: 0, max: 4, step: 0.5,
        default: 0,
        format: v => `${v.toFixed(1)}px`,
        parse: parseFloat,
        group: 'Edge Lighting',
        hint: 'How far inside the element edge to draw',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--hover-edge-inset', `${val}px`);
        }
      },
      
      // ─── BOTTOM LIGHT ───
      { type: 'divider', label: 'Bottom Light', group: 'Edge Lighting' },
      {
        id: 'hoverEdgeBottomEnabled',
        label: 'Enabled',
        stateKey: 'hoverEdgeBottomEnabled',
        type: 'checkbox',
        default: true,
        format: v => (v ? 'On' : 'Off'),
        parse: v => !!v,
        group: 'Edge Lighting',
        hint: 'Primary upward light source',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--hover-edge-bottom-enabled', val ? '1' : '0');
        }
      },
      {
        id: 'hoverEdgeBottomRadius',
        label: 'Size',
        stateKey: 'hoverEdgeBottomRadius',
        type: 'range',
        min: 0.5, max: 3, step: 0.05,
        default: 1.2,
        format: v => `${v.toFixed(2)}×`,
        parse: parseFloat,
        group: 'Edge Lighting',
        hint: 'Gradient radius (1.0 = element height)',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--hover-edge-bottom-radius', String(val));
        }
      },
      {
        id: 'hoverEdgeBottomOpacity',
        label: 'Opacity',
        stateKey: 'hoverEdgeBottomOpacity',
        type: 'range',
        min: 0, max: 1, step: 0.02,
        default: 0.6,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Edge Lighting',
        hint: 'Light intensity at center',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--hover-edge-bottom-opacity', String(val));
        }
      },
      {
        id: 'hoverEdgeBottomColorMix',
        label: 'Color Mix',
        stateKey: 'hoverEdgeBottomColorMix',
        type: 'range',
        min: 0, max: 100, step: 5,
        default: 70,
        format: v => `${Math.round(v)}%`,
        parse: parseFloat,
        group: 'Edge Lighting',
        hint: 'How much cursor color vs white',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--hover-edge-bottom-color-mix', `${val}%`);
        }
      },
      
      // ─── TOP LIGHT ───
      { type: 'divider', label: 'Top Light', group: 'Edge Lighting' },
      {
        id: 'hoverEdgeTopEnabled',
        label: 'Enabled',
        stateKey: 'hoverEdgeTopEnabled',
        type: 'checkbox',
        default: true,
        format: v => (v ? 'On' : 'Off'),
        parse: v => !!v,
        group: 'Edge Lighting',
        hint: 'Ambient downward light source',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--hover-edge-top-enabled', val ? '1' : '0');
        }
      },
      {
        id: 'hoverEdgeTopRadius',
        label: 'Size',
        stateKey: 'hoverEdgeTopRadius',
        type: 'range',
        min: 0.5, max: 3, step: 0.05,
        default: 1.0,
        format: v => `${v.toFixed(2)}×`,
        parse: parseFloat,
        group: 'Edge Lighting',
        hint: 'Gradient radius (1.0 = element height)',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--hover-edge-top-radius', String(val));
        }
      },
      {
        id: 'hoverEdgeTopOpacity',
        label: 'Opacity',
        stateKey: 'hoverEdgeTopOpacity',
        type: 'range',
        min: 0, max: 1, step: 0.02,
        default: 0.3,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Edge Lighting',
        hint: 'Light intensity at center',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--hover-edge-top-opacity', String(val));
        }
      },
      {
        id: 'hoverEdgeTopColorMix',
        label: 'Color Mix',
        stateKey: 'hoverEdgeTopColorMix',
        type: 'range',
        min: 0, max: 100, step: 5,
        default: 50,
        format: v => `${Math.round(v)}%`,
        parse: parseFloat,
        group: 'Edge Lighting',
        hint: 'How much cursor color vs white',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--hover-edge-top-color-mix', `${val}%`);
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
        min: 0.0, max: 1, step: 0.001,
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
        min: 0.0, max: 1, step: 0.01,
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
        min: 0, max: 1, step: 0.001,
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
        default: 13.2,
        format: v => `${v.toFixed(1)}px`,
        parse: parseFloat,
        hint: 'Desktop backdrop blur strength (0 = off)',
        onChange: (g, val) => {
          import('./modal-overlay.js').then(({ updateOverlayBlur }) => {
            updateOverlayBlur(val);
          });
        }
      },
      {
        id: 'modalOverlayMobileBlurPx',
        label: 'Mobile Blur',
        stateKey: 'modalOverlayMobileBlurPx',
        type: 'range',
        min: 0, max: 30, step: 0.5,
        default: 24,
        format: v => `${v.toFixed(1)}px`,
        parse: parseFloat,
        hint: 'Touch/mobile backdrop blur strength (0 = off)',
        onChange: (g, val) => {
          import('./modal-overlay.js').then(({ updateOverlayMobileBlur }) => {
            updateOverlayMobileBlur(val);
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
        hint: 'Logo blur when gate is active (var(--radius-md) = soft blur)',
        onChange: (g, val) => {
          import('./modal-overlay.js').then(({ updateLogoBlurActive }) => {
            updateLogoBlurActive(val);
          });
        }
      }
    ]
  },

  // TACTILE LAYER - Unicorn Studio
  // ═══════════════════════════════════════════════════════════════════════════
  tactileLayer: {
    title: 'Tactile Layer',
    icon: '🦄',
    defaultOpen: false,
    controls: [
      {
        id: 'tactileEnabled',
        label: 'Enabled',
        stateKey: 'tactileEnabled',
        type: 'checkbox',
        default: false,
        hint: 'Enable Unicorn Studio WebGL layer',
        onChange: (g, val) => {
          if (updateTactileLayerFn) updateTactileLayerFn(g);
        }
      },
      {
        id: 'tactileProjectId',
        label: 'Project ID',
        stateKey: 'tactileProjectId',
        type: 'text',
        default: 'qBFxB3kkFBqgLxFNFleF',
        hint: 'Unicorn Studio Project ID',
        onChange: (g, val) => {
          if (updateTactileLayerFn) updateTactileLayerFn(g);
        }
      },
      {
        id: 'tactileScale',
        label: 'Scale',
        stateKey: 'tactileScale',
        type: 'range',
        min: 0.1, max: 1, step: 0.1,
        default: 1.0,
        hint: 'Resolution scale (lower for performance)',
        onChange: (g, val) => {
           if (updateTactileLayerFn) updateTactileLayerFn(g);
        }
      },
      {
        id: 'tactileDpi',
        label: 'DPI',
        stateKey: 'tactileDpi',
        type: 'range',
        min: 0.5, max: 2, step: 0.1,
        default: 1.0,
        hint: 'Device Pixel Ratio (Keep low for performance)',
        onChange: (g, val) => {
           if (updateTactileLayerFn) updateTactileLayerFn(g);
        }
      },
      {
        id: 'tactileOpacity',
        label: 'Opacity',
        stateKey: 'tactileOpacity',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 1.0,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        onChange: (g, val) => {
           if (updateTactileLayerFn) updateTactileLayerFn(g);
        }
      },
      {
        id: 'tactileBlendMode',
        label: 'Blend Mode',
        stateKey: 'tactileBlendMode',
        type: 'select',
        options: ['normal', 'overlay', 'screen', 'multiply', 'color-burn', 'linear-burn', 'soft-light', 'hard-light', 'lighten', 'difference'],
        default: 'overlay',
        onChange: (g, val) => {
           if (updateTactileLayerFn) updateTactileLayerFn(g);
        }
      },
      {
        id: 'tactilePointerEvents',
        label: 'Interactive',
        stateKey: 'tactilePointerEvents',
        type: 'checkbox',
        default: false,
        hint: 'If true, blocks underlying elements. Enable if visual requires direct interaction.',
        onChange: (g, val) => {
           if (updateTactileLayerFn) updateTactileLayerFn(g);
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
    defaultOpen: true,
    controls: [
      // ─── BACKGROUNDS ─────────────────────────────────────────────────────
      { type: 'divider', label: 'Backgrounds' },
      {
        id: 'bgLight',
        label: 'Light Mode',
        stateKey: 'bgLight',
        type: 'color',
        default: "var(--color-detected-efefef)",
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
        default: "var(--color-detected-181818)",
        hint: 'Background color for dark mode',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--bg-dark', val);
        }
      },
      { type: 'divider', label: 'Outer Shell' },
      {
        id: 'wallBase',
        label: 'Wall',
        stateKey: 'wallBase',
        designScope: 'shellTheme',
        type: 'color',
        default: "var(--color-detected-141414)",
        hint: 'Stable dark wall around the themeable studio window.',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--abs-wall-base-light', val);
          root.style.setProperty('--abs-wall-base-dark', val);
          root.style.setProperty('--abs-wall-base', val);
          root.style.setProperty('--shell-wall-bg', val);
          g.wallBase = val;
          g.frameInnerSurface = 'var(--studio-window-bg)';
          import('../visual/site-shell.js').then((mod) => {
            mod.patchShellTheme?.({ wallBase: val });
          }).catch(() => {});
          root.style.setProperty('--frame-inner-surface', 'var(--studio-window-bg)');
          applyLayoutCSSVars();
        }
      },
      {
        id: 'frameColor',
        label: 'Authored Frame',
        stateKey: 'frameColor',
        designScope: 'shellTheme',
        type: 'color',
        default: "var(--color-detected-000000)",
        hint: 'Opaque true black across themes, browsers, and display gamuts.',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--frame-color-site', val);
          root.style.setProperty('--frame-color-site-light', val);
          root.style.setProperty('--frame-color-site-dark', val);
          g.frameColor = val;
          import('../visual/site-shell.js').then((mod) => {
            mod.patchShellTheme?.({ siteFrame: val });
          }).catch(() => {});
          setTheme(getCurrentTheme());
        }
      },
      { type: 'divider', label: 'Quote Puck' },
      {
        id: 'quoteButtonColorLight',
        label: 'Light',
        stateKey: 'quoteButtonColorLight',
        designScope: 'shellTheme',
        type: 'color',
        default: "var(--color-detected-efefef)",
        puckOnly: true,
        hint: 'Puck background in light mode.',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--quote-button-color-light', val);
          g.quoteButtonColorLight = val;
          import('../visual/site-shell.js').then((mod) => {
            mod.patchShellTheme?.({ quoteButtonColorLight: val });
          }).catch(() => {});
          if (!document.body.classList.contains('dark-mode')) {
            root.style.setProperty('--quote-button-color', val);
          }
          applyLayoutCSSVars();
        }
      },
      {
        id: 'quoteButtonColorDark',
        label: 'Dark',
        stateKey: 'quoteButtonColorDark',
        designScope: 'shellTheme',
        type: 'color',
        default: "var(--color-detected-181818)",
        puckOnly: true,
        hint: 'Puck background in dark mode.',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--quote-button-color-dark', val);
          g.quoteButtonColorDark = val;
          import('../visual/site-shell.js').then((mod) => {
            mod.patchShellTheme?.({ quoteButtonColorDark: val });
          }).catch(() => {});
          if (document.body.classList.contains('dark-mode')) {
            root.style.setProperty('--quote-button-color', val);
          }
          applyLayoutCSSVars();
        }
      },
      // ─── TEXT (LIGHT MODE) ───────────────────────────────────────────────
      { type: 'divider', label: 'Text · Light Mode' },
      {
        id: 'textColorLight',
        label: 'Primary',
        stateKey: 'textColorLight',
        type: 'color',
        default: "var(--color-detected-161616)",
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
        default: "var(--color-detected-2f2f2f)",
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
        default: "var(--color-detected-f0f0f0)",
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
        default: "var(--color-detected-c8c8c8)",
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
        default: "var(--color-detected-f03030)",
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
      {
        id: 'brandLogoSecondaryOpacity',
        label: 'Role Lines',
        stateKey: 'brandLogoSecondaryOpacity',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        default: 0.58,
        format: (v) => Number(v).toFixed(2),
        parse: parseFloat,
        hint: 'Shared opacity for the Home title role lines (1 = match the name).',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--brand-logo-secondary-opacity', String(val));
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
          'Product Design',
          'Experience Design',
          'Art Direction',
          'Motion & 3D',
          'Creative Engineering',
          'Parametric Systems'
        ],
        hint: 'Assign each discipline to a palette color, then set weights that sum to 100%. Used for all ball spawns across modes.'
      }
    ]
  },

  // Inner shadow removed

  // ═══════════════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════════════
  // WALL GEOMETRY - Basic wall structure and frame
  // ═══════════════════════════════════════════════════════════════════════════
  wallGeometry: {
    title: 'Wall · Frame',
    icon: '🖼️',
    defaultOpen: false,
    controls: [
      { type: 'divider', label: 'Wall Layout' },
      {
        id: 'restitution',
        label: 'Bounce',
        stateKey: 'restitution',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.70,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Wall Material',
        hint: 'Energy kept on bounce. 100% = elastic, 30% = soft'
      },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // PUCK LIGHT — quote button disk shadow, rim, and edge
  // ═══════════════════════════════════════════════════════════════════════════
  puckLight: {
    title: 'Puck',
    icon: '⚫',
    defaultOpen: false,
    controls: [
      {
        id: 'quotePuckEnabled',
        label: 'Quote Puck',
        stateKey: 'quotePuckEnabled',
        type: 'toggle',
        default: false,
        format: v => (v ? 'On' : 'Off'),
        parse: v => !!v,
        hint: 'Mounts the draggable quote puck on the home route.',
        onChange: (_g, enabled) => {
          if (!enabled) {
            destroyQuoteDisplay();
            return;
          }
          initQuoteDisplay();
          initQuotePuck();
        }
      },
      {
        id: 'puckShadowOpacity',
        label: 'Drop Shadow',
        stateKey: 'puckShadowOpacity',
        type: 'range',
        min: 0, max: 1, step: 0.005,
        default: 0.14,
        format: v => v.toFixed(3),
        parse: parseFloat,
        hint: 'Puck disk drop shadow strength',
        onChange: () => {
          applyLayoutCSSVars();
        }
      },
      {
        id: 'puckEdgeWidth',
        label: 'Edge Width',
        stateKey: 'puckEdgeWidth',
        type: 'range',
        min: 0, max: 4, step: 0.5,
        default: 1,
        format: v => `${v}px`,
        parse: parseFloat,
        hint: 'Thickness of the puck rim/edge',
        onChange: () => {
          applyLayoutCSSVars();
        }
      },
      {
        id: 'puckEdgeLightOpacity',
        label: 'Edge Light',
        stateKey: 'puckEdgeLightOpacity',
        type: 'range',
        min: 0, max: 1, step: 0.02,
        default: 0.3,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Top rim light on the puck edge',
        onChange: () => {
          applyLayoutCSSVars();
        }
      },
      {
        id: 'puckEdgeShadowOpacity',
        label: 'Edge Shadow',
        stateKey: 'puckEdgeShadowOpacity',
        type: 'range',
        min: 0, max: 1, step: 0.02,
        default: 0.15,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Bottom rim shadow on the puck edge',
        onChange: () => {
          applyLayoutCSSVars();
        }
      },
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOISE — Background grain (under simulation canvas; see #simulations > .scene-effects)
  // ═══════════════════════════════════════════════════════════════════════════
  noise: {
    title: 'Background grain',
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
        group: 'Overview',
        hint: 'Film grain in the wall, behind the balls (CSS + procedural tile).',
        onChange: (_g, val) => applyNoiseSystem({ noiseEnabled: val })
      },
      { type: 'divider', label: 'Light mode' },
      {
        id: 'noiseOpacityLight',
        label: 'Opacity',
        stateKey: 'noiseOpacityLight',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.15,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Light mode',
        hint: 'Dark alpha grain strength when the site is in light theme.',
        onChange: (_g, val) => applyNoiseSystem({ noiseOpacityLight: val })
      },
      {
        id: 'noiseColorLight',
        label: 'Ink',
        stateKey: 'noiseColorLight',
        type: 'color',
        default: '#202023',
        format: v => String(v),
        parse: v => String(v),
        group: 'Light mode',
        hint: 'Dark ink color for the alpha grain; bright colors are clamped dark.',
        onChange: (_g, val) => applyNoiseSystem({ noiseColorLight: val })
      },
      { type: 'divider', label: 'Dark mode' },
      {
        id: 'noiseOpacityDark',
        label: 'Opacity',
        stateKey: 'noiseOpacityDark',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.48,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Dark mode',
        hint: 'Dark alpha grain strength when the site is in dark theme.',
        onChange: (_g, val) => applyNoiseSystem({ noiseOpacityDark: val })
      },
      {
        id: 'noiseColorDark',
        label: 'Ink',
        stateKey: 'noiseColorDark',
        type: 'color',
        default: '#202023',
        format: v => String(v),
        parse: v => String(v),
        group: 'Dark mode',
        hint: 'Dark ink color for the alpha grain; this will not brighten dark walls.',
        onChange: (_g, val) => applyNoiseSystem({ noiseColorDark: val })
      },
      { type: 'divider', label: 'Placement' },
      {
        id: 'noiseOffsetY',
        label: 'Vertical offset',
        stateKey: 'noiseOffsetY',
        type: 'range',
        min: -50, max: 50, step: 1,
        default: 0,
        format: v => `${v}px`,
        parse: parseFloat,
        group: 'Placement',
        hint: 'Move grain up (negative) or down (positive).',
        onChange: (_g, val) => applyNoiseSystem({ noiseOffsetY: val })
      },
      {
        id: 'noiseSize',
        label: 'Grain size',
        stateKey: 'noiseSize',
        type: 'range',
        min: 20, max: 600, step: 5,
        default: 85,
        format: v => `${Math.round(v)} px`,
        parse: v => parseInt(v, 10),
        group: 'Placement',
        onChange: (_g, val) => applyNoiseSystem({ noiseSize: val })
      },
      { type: 'divider', label: 'Texture' },
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
        label: 'Tile size',
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
        id: 'noiseStructureStrength',
        label: 'Structure',
        stateKey: 'noiseStructureStrength',
        type: 'range',
        min: 0, max: 0.45, step: 0.01,
        default: 0.3,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Texture',
        hint: 'Low-frequency dark-alpha texture blended into the same grain image.',
        onChange: (_g, val) => applyNoiseSystem({ noiseStructureStrength: val })
      },
      {
        id: 'noiseStructureScale',
        label: 'Structure scale',
        stateKey: 'noiseStructureScale',
        type: 'range',
        min: 0.18, max: 0.75, step: 0.01,
        default: 0.38,
        format: v => `${v.toFixed(2)}x`,
        parse: parseFloat,
        group: 'Texture',
        hint: 'Lower values make the second field broader; higher values make it finer.',
        onChange: (_g, val) => applyNoiseSystem({ noiseStructureScale: val })
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
        default: 0.75,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Texture',
        hint: 'How different R/G/B channels are (ignored when Monochrome is on).',
        onChange: (_g, val) => applyNoiseSystem({ noiseChroma: val })
      },
      { type: 'divider', label: 'Motion' },
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
        default: 1.2,
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
      { type: 'divider', label: 'Fine-tune' },
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
        default: 1.45,
        format: v => `${v.toFixed(2)}x`,
        parse: parseFloat,
        group: 'Look',
        hint: 'Raises ink texture separation without brightening the wall.',
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
        hint: 'Keep neutral for non-brightening grain; use opacity and contrast for strength.',
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
    title: 'Critter Swarm',
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
        min: 0, max: 1, step: 0.01,
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
        min: 0, max: 1, step: 0.001,
        default: 0.018,
        format: v => v.toFixed(3),
        parse: parseFloat,
        hint: 'Mode-only override',
        onChange: (g, val) => {
          if (g.currentMode === 'critters') g.FRICTION = val;
        }
      },
      // ─────────────────────────────────────────────────────────────────────────
      // CRITTER SWARM PARAMETERS
      // ─────────────────────────────────────────────────────────────────────────
      { type: 'divider', label: 'Critter Swarm Parameters' },
      {
        id: 'critterHiveStirInterval',
        label: 'Stir Interval',
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
        label: 'Stir Strength',
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
        label: 'Wave Speed',
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
        min: 0, max: 1, step: 0.01,
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
        default: 2.75,
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
      warmupFramesControl('crittersWarmupFrames')
    ]
  },

  pit: {
    title: 'Foundation',
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
          if (isPitLikeMode(g.currentMode)) g.G = g.GE * val;
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
    title: 'Attention',
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
    title: 'Weightless Drift',
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
        min: 0, max: 1, step: 0.05,
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
    title: 'Flow',
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
        id: 'waterMobileCountScale',
        label: 'Mobile Count',
        stateKey: 'waterMobileCountScale',
        type: 'range',
        min: 0.25, max: 1, step: 0.01,
        default: 0.8,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        reinitMode: true,
        hint: 'Flow-only mobile count multiplier applied after the shared mobile performance reduction.'
      },
      {
        id: 'waterDrag',
        label: 'Water Resistance',
        stateKey: 'waterDrag',
        type: 'range',
        min: 0.001, max: 1, step: 0.001,
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

  magnetic: {
    title: 'Magnetic Field',
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
        min: 0, max: 1, step: 0.001,
        default: 0.998,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      warmupFramesControl('magneticWarmupFrames')
    ]
  },

  bubbles: {
    title: 'Emergence',
    icon: '🫧',
    mode: 'bubbles',
    defaultOpen: false,
    controls: [
      {
        id: 'bubblesSpeed',
        label: 'Rise Speed',
        stateKey: 'bubblesRiseSpeed',
        type: 'range',
        min: 50, max: 900, step: 25,
        default: 360,
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
        id: 'bubblesVerticalExtent',
        label: 'Vertical Extent',
        stateKey: 'bubblesVerticalExtent',
        type: 'range',
        min: 0.15, max: 1, step: 0.05,
        default: 1,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Height of the bubble band inside the wall (1 = full height).'
      },
      {
        id: 'bubblesDepthSpan',
        label: 'Depth Span',
        stateKey: 'bubblesDepthSpan',
        type: 'range',
        min: 0.1, max: 1, step: 0.05,
        default: 0.8,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Z range around the logo depth (1 = full depth).'
      },
      {
        id: 'bubblesMax',
        label: 'Max Bubbles',
        stateKey: 'bubblesMaxCount',
        type: 'range',
        min: 50, max: 300, step: 10,
        default: 200,
        format: v => String(v),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'bubblesDensity',
        label: 'Density',
        stateKey: 'bubblesDensity',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.8,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'bubblesMobileDensity',
        label: 'Mobile Density',
        stateKey: 'bubblesMobileDensityMul',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.75,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Extra mobile-only multiplier applied before the shared mobile performance reduction.'
      },
      warmupFramesControl('bubblesWarmupFrames')
    ]
  },

  kaleidoscope: {
    title: 'Refraction',
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
        default: 240,
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
        default: 1.45,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'kaleiIdleDrift',
        label: 'Idle Drift',
        stateKey: 'kaleidoscopeIdleDrift',
        type: 'range',
        min: 0, max: 1, step: 0.002,
        default: 0.012,
        format: v => `${(v * 100).toFixed(1)}%`,
        parse: parseFloat,
        hint: 'Subtle movement when idle; respects prefers-reduced-motion.'
      },
      {
        id: 'kaleiDotSizeVh',
        label: 'Dot Size (vh)',
        stateKey: 'kaleidoscope3DotSizeVh',
        type: 'range',
        min: 0.2, max: 2.5, step: 0.05,
        default: 0.82,
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
        default: 0.9,
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
        default: 0.6,
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
        default: 0.45,
        format: v => (v * 100).toFixed(0) + '%',
        parse: parseFloat,
        reinitMode: true
      },
      warmupFramesControl('kaleidoscope3WarmupFrames')
    ]
  },
  kaleidoscopeRift: {
    title: 'Multiplicity',
    icon: '✣',
    mode: 'kaleidoscope-rift',
    defaultOpen: false,
    controls: [
      {
        id: 'kaleidoscopeRiftBallCount',
        label: 'Desktop Sources',
        stateKey: 'kaleidoscopeRiftBallCount',
        type: 'range',
        min: 8, max: 120, step: 1,
        default: 28,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'kaleidoscopeRiftMobileBallCount',
        label: 'Mobile Sources',
        stateKey: 'kaleidoscopeRiftMobileBallCount',
        type: 'range',
        min: 8, max: 160, step: 1,
        default: 32,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'kaleidoscopeRiftDotSizeVh',
        label: 'Desktop Dot Size',
        stateKey: 'kaleidoscopeRiftDotSizeVh',
        type: 'range',
        min: 0.1, max: 4, step: 0.05,
        default: 0.82,
        format: v => `${v.toFixed(2)}vh`,
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kaleidoscopeRiftMobileDotSizeVh',
        label: 'Mobile Dot Size',
        stateKey: 'kaleidoscopeRiftMobileDotSizeVh',
        type: 'range',
        min: 0.1, max: 4, step: 0.05,
        default: 1.15,
        format: v => `${v.toFixed(2)}vh`,
        parse: parseFloat,
        reinitMode: true
      }
    ]
  },
  starfield3d: {
    title: 'Perspective',
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
        id: 'starfieldMobileSpanMultiplier',
        label: 'Mobile Field Span',
        stateKey: 'starfieldMobileSpanMultiplier',
        type: 'range',
        min: 1, max: 4, step: 0.05,
        default: 2.6,
        format: v => `${v.toFixed(2)}×`,
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
        default: 0.9,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat
      },
      {
        id: 'starfieldFogStart',
        label: 'Fog Start',
        stateKey: 'starfieldFogStart',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.86,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Normalized depth where far-space fog begins clearing toward the viewer.'
      },
      {
        id: 'starfieldFogMin',
        label: 'Fog Floor',
        stateKey: 'starfieldFogMin',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.16,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Minimum opacity for stars deepest in the distance fog.'
      },
      {
        id: 'starfieldMobileFogMin',
        label: 'Mobile Fog Floor',
        stateKey: 'starfieldMobileFogMin',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.3,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        hint: 'Mobile-only minimum opacity for stars deepest in the distance fog.'
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

  flubberBlob: {
    title: 'Cohesion',
    icon: '🫠',
    mode: 'flubber-blob',
    defaultOpen: false,
    controls: [
      {
        id: 'flubberBlobBallCount',
        label: 'Density',
        stateKey: 'flubberBlobBallCount',
        type: 'range',
        min: 56, max: 180, step: 4,
        default: 120,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true,
        hint: 'How many fixed-size beads make up the gel body. Lower values are lighter on performance.'
      },
      {
        id: 'flubberBlobCohesion',
        label: 'Body Tension',
        stateKey: 'flubberBlobCohesion',
        type: 'range',
        min: 0.8, max: 6, step: 0.05,
        default: 2.35,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Overall gel-network tightness. Lower values feel looser and more deformable.'
      },
      {
        id: 'flubberBlobStretch',
        label: 'Deformation',
        stateKey: 'flubberBlobStretch',
        type: 'range',
        min: 0.35, max: 1.2, step: 0.01,
        default: 1.2,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'How far the body can elongate before the soft gel network reins it in.'
      },
      {
        id: 'flubberBlobViscosity',
        label: 'Damping',
        stateKey: 'flubberBlobViscosity',
        type: 'range',
        min: 0.02, max: 2.5, step: 0.02,
        default: 0.45,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Internal gel damping. Whole-body floor resistance stays intentionally very low.'
      },
      {
        id: 'flubberBlobInternalCurrent',
        label: 'Internal Motion',
        stateKey: 'flubberBlobInternalCurrent',
        type: 'range',
        min: 0, max: 0.35, step: 0.01,
        default: 0.1,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Idle gel circulation that keeps the body alive without forcing a round rest shape.'
      },
      {
        id: 'flubberBlobInfluenceRadius',
        label: 'Drag Radius',
        stateKey: 'flubberBlobInfluenceRadius',
        type: 'range',
        min: 120, max: 420, step: 4,
        default: 320,
        format: v => Math.round(v) + 'px',
        parse: v => parseInt(v, 10),
        hint: 'How much local material is grabbed around the cursor when dragging.'
      },
      {
        id: 'flubberBlobMousePush',
        label: 'Drag Strength',
        stateKey: 'flubberBlobMousePush',
        type: 'range',
        min: 0, max: 3, step: 0.01,
        default: 2.1,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'How directly the grabbed material follows the cursor.'
      },
      {
        id: 'flubberBlobClickRepulsion',
        label: 'Release Throw',
        stateKey: 'flubberBlobClickRepulsion',
        type: 'range',
        min: 0, max: 3, step: 0.01,
        default: 1.25,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'How much cursor velocity transfers into the body when you let go.'
      },
      {
        id: 'flubberBlobWallBounce',
        label: 'Wall Bounce',
        stateKey: 'flubberBlobWallBounce',
        type: 'range',
        min: 0, max: 0.75, step: 0.01,
        default: 0.24,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Soft rebound strength when the gel body hits the inner wall.'
      },
      {
        id: 'flubberBlobMaxSpeed',
        label: 'Energy Cap',
        stateKey: 'flubberBlobMaxSpeed',
        type: 'range',
        min: 360, max: 1800, step: 20,
        default: 1400,
        format: v => Math.round(v) + 'px/s',
        parse: v => parseInt(v, 10),
        hint: 'Maximum material speed after drags, release throws, and wall rebounds.'
      }
    ]
  },

  weaveField: {
    title: 'Juxtaposition',
    icon: '🧵',
    mode: 'weave-field',
    defaultOpen: false,
    controls: [
      {
        id: 'weaveFieldBallCount',
        label: 'Ball Count',
        stateKey: 'weaveFieldBallCount',
        type: 'range',
        min: 48, max: 260, step: 4,
        default: 132,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true,
        hint: 'Total woven bodies. Mobile/lite budgets can still reduce the effective count.'
      },
      {
        id: 'weaveFieldBallSizeMul',
        label: 'Ball Size',
        stateKey: 'weaveFieldBallSizeMul',
        type: 'range',
        min: 0.2, max: 1.5, step: 0.05,
        default: 0.6,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        reinitMode: true,
        hint: 'Radius multiplier for Juxtaposition balls relative to the shared responsive ball size.'
      },
      {
        id: 'weaveFieldLaneCount',
        label: 'Lane Count',
        stateKey: 'weaveFieldLaneCount',
        type: 'range',
        min: 3, max: 9, step: 1,
        default: 4,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true,
        hint: 'Number of horizontal and vertical discipline streams.'
      },
      {
        id: 'weaveFieldFlowSpeed',
        label: 'Flow Speed',
        stateKey: 'weaveFieldFlowSpeed',
        type: 'range',
        min: 0, max: 180, step: 2,
        default: 118,
        format: v => `${Math.round(v)}px/s`,
        parse: parseFloat,
        hint: 'How fast balls travel along their stream paths.'
      },
      {
        id: 'weaveFieldWeaveStrength',
        label: 'Weave Strength',
        stateKey: 'weaveFieldWeaveStrength',
        type: 'range',
        min: 0, max: 1.2, step: 0.02,
        default: 0.9,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'How strongly straight streams cross into the woven lattice.'
      },
      {
        id: 'weaveFieldLaneTension',
        label: 'Lane Tension',
        stateKey: 'weaveFieldLaneTension',
        type: 'range',
        min: 0, max: 18, step: 0.2,
        default: 14,
        format: v => v.toFixed(1),
        parse: parseFloat,
        hint: 'How tightly each ball follows its moving path target.'
      },
      {
        id: 'weaveFieldProgressSeconds',
        label: 'Build Time',
        stateKey: 'weaveFieldProgressSeconds',
        type: 'range',
        min: 4, max: 40, step: 1,
        default: 9,
        format: v => `${Math.round(v)}s`,
        parse: parseFloat,
        hint: 'Seconds from straight streams to full weave.'
      },
      {
        id: 'weaveFieldPointerRadius',
        label: 'Pointer Radius',
        stateKey: 'weaveFieldPointerRadius',
        type: 'range',
        min: 40, max: 420, step: 5,
        default: 260,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Desktop cursor or mobile touch radius that opens space in the weave.'
      },
      {
        id: 'weaveFieldPointerRepelStrength',
        label: 'Pointer Repel',
        stateKey: 'weaveFieldPointerRepelStrength',
        type: 'range',
        min: 0, max: 60000, step: 1000,
        default: 22000,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        hint: 'Strength of the temporary opening around cursor/touch.'
      },
      {
        id: 'weaveFieldDamping',
        label: 'Damping',
        stateKey: 'weaveFieldDamping',
        type: 'range',
        min: 0.7, max: 0.995, step: 0.005,
        default: 0.965,
        format: v => v.toFixed(3),
        parse: parseFloat,
        hint: 'Velocity damping. Lower values feel calmer and less elastic.'
      },
      {
        id: 'weaveFieldMaxSpeed',
        label: 'Energy Cap',
        stateKey: 'weaveFieldMaxSpeed',
        type: 'range',
        min: 220, max: 2200, step: 20,
        default: 1920,
        format: v => `${Math.round(v)}px/s`,
        parse: v => parseInt(v, 10),
        hint: 'Maximum speed after path pull, collisions, pointer repulsion, and walls.'
      },
      {
        id: 'weaveFieldCollisionIterations',
        label: 'Contact Passes',
        stateKey: 'weaveFieldCollisionIterations',
        type: 'range',
        min: 0, max: 6, step: 1,
        default: 1,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        hint: 'Ball-on-ball solver passes. Lower values keep the weave fast while walls still contain it.'
      },
      warmupFramesControl('weaveFieldWarmupFrames')
    ]
  },


  pressureCrucible: {
    title: 'Pressure Field',
    icon: '◉',
    mode: 'pressure-crucible',
    defaultOpen: false,
    controls: [
      {
        id: 'pressureCrucibleBallCount',
        label: 'Particle Count',
        stateKey: 'pressureCrucibleBallCount',
        type: 'range',
        min: 48, max: 220, step: 4,
        default: 144,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true,
        hint: 'Total field samples. Compact and mobile budgets reduce the effective count.'
      },
      {
        id: 'pressureCrucibleFluxStrength',
        label: 'Flux Strength',
        stateKey: 'pressureCrucibleFluxStrength',
        type: 'range',
        min: 0, max: 180000, step: 4000,
        default: 92000,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        hint: 'Magnetic field force that bends particles between the virtual poles.'
      },
      {
        id: 'pressureCrucibleWakeStrength',
        label: 'Mouse Wake',
        stateKey: 'pressureCrucibleWakeStrength',
        type: 'range',
        min: 0, max: 3, step: 0.05,
        default: 1,
        format: v => Number(v).toFixed(2),
        parse: parseFloat,
        hint: 'Extra split energy created by fast cursor passes.'
      },
      {
        id: 'pressureCruciblePolaritySeparation',
        label: 'Pole Separation',
        stateKey: 'pressureCruciblePolaritySeparation',
        type: 'range',
        min: 40, max: 420, step: 5,
        default: 170,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Distance between the two virtual cursor poles.'
      },
      {
        id: 'pressureCrucibleIdleFluxStrength',
        label: 'Idle Flux',
        stateKey: 'pressureCrucibleIdleFluxStrength',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.05,
        format: v => Number(v).toFixed(2),
        parse: parseFloat,
        hint: 'Subtle autonomous field strength when the cursor is outside the wall.'
      },
      {
        id: 'pressureCrucibleParticleSize',
        label: 'Particle Size',
        stateKey: 'pressureCrucibleParticleSize',
        type: 'range',
        min: 1.5, max: 10, step: 0.1,
        default: 5.9,
        format: v => `${Number(v).toFixed(1)}px`,
        parse: parseFloat,
        hint: 'Bead size for the flux samples.'
      },
      {
        id: 'pressureCruciblePointerRadius',
        label: 'Mouse Radius',
        stateKey: 'pressureCruciblePointerRadius',
        type: 'range',
        min: 120, max: 760, step: 10,
        default: 330,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Hover radius where cursor proximity splits and energizes the field.'
      },
      {
        id: 'pressureCrucibleDamping',
        label: 'Damping',
        stateKey: 'pressureCrucibleDamping',
        type: 'range',
        min: 0.88, max: 0.996, step: 0.001,
        default: 0.968,
        format: v => Number(v).toFixed(3),
        parse: parseFloat,
        hint: 'Velocity damping. Lower values calm particles faster after cursor passes.'
      },
      {
        id: 'pressureCrucibleMaxSpeed',
        label: 'Energy Cap',
        stateKey: 'pressureCrucibleMaxSpeed',
        type: 'range',
        min: 300, max: 5200, step: 50,
        default: 3800,
        format: v => `${Math.round(v)}px/s`,
        parse: v => parseInt(v, 10),
        hint: 'Maximum particle speed after flux, wake, recentering, and walls.'
      },
      warmupFramesControl('pressureCrucibleWarmupFrames')
    ]
  },

  particleFountain: {
    title: 'Fountain A',
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
        min: 0.01, max: 1, step: 0.01,
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
    title: 'Continuity',
    icon: '🌐',
    mode: '3d-sphere',
    defaultOpen: false,
    controls: [
      {
        id: 'sphere3dRadiusVw',
        label: 'Radius',
        stateKey: 'sphere3dRadiusVw',
        type: 'range',
        min: 5, max: 80, step: 0.5,
        default: 72,
        format: v => v.toFixed(1) + 'vmin',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'sphere3dDensity',
        label: 'Point Count',
        stateKey: 'sphere3dDensity',
        type: 'range',
        min: 30, max: 600, step: 10,
        default: 94,
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
        default: 1.0,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat
      },
      {
        id: 'sphere3dIdleSpeed',
        label: 'Idle Spin',
        stateKey: 'sphere3dIdleSpeed',
        type: 'range',
        min: 0, max: 1.5, step: 0.02,
        default: 0.15,
        format: v => v.toFixed(2) + ' rad/s',
        parse: parseFloat
      },
      {
        id: 'sphere3dOrbitRadiusVw',
        label: 'Orbit Radius',
        stateKey: 'sphere3dOrbitRadiusVw',
        type: 'range',
        min: 0, max: 16, step: 0.25,
        default: 4.5,
        format: v => v.toFixed(2) + 'vmin',
        parse: parseFloat
      },
      {
        id: 'sphere3dOrbitSpeed',
        label: 'Orbit Speed',
        stateKey: 'sphere3dOrbitSpeed',
        type: 'range',
        min: 0, max: 1.5, step: 0.01,
        default: 0.12,
        format: v => v.toFixed(2) + ' rad/s',
        parse: parseFloat
      },
      {
        id: 'sphere3dDragGain',
        label: 'Drag Spin Gain',
        stateKey: 'sphere3dDragGain',
        type: 'range',
        min: 0, max: 4, step: 0.05,
        default: 1.25,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'How strongly press-drag movement turns into sphere angular velocity.'
      },
      {
        id: 'sphere3dReleaseSpinGain',
        label: 'Release Spin',
        stateKey: 'sphere3dReleaseSpinGain',
        type: 'range',
        min: 0, max: 2, step: 0.05,
        default: 1.05,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Release multiplier for flicked angular velocity.'
      },
      {
        id: 'sphere3dAngularDampingPerSec',
        label: 'Spin Drag',
        stateKey: 'sphere3dAngularDampingPerSec',
        type: 'range',
        min: 0, max: 8, step: 0.05,
        default: 0.55,
        format: v => v.toFixed(2) + '/s',
        parse: parseFloat
      },
      {
        id: 'sphere3dMaxAngularVelocity',
        label: 'Max Spin',
        stateKey: 'sphere3dMaxAngularVelocity',
        type: 'range',
        min: 0.2, max: 16, step: 0.1,
        default: 8,
        format: v => v.toFixed(1) + ' rad/s',
        parse: parseFloat
      },
      {
        id: 'sphere3dAlphaMax',
        label: 'Front Opacity',
        stateKey: 'sphere3dAlphaMax',
        type: 'range',
        min: 0.2, max: 1, step: 0.01,
        default: 1,
        format: v => Math.round(v * 100) + '%',
        parse: parseFloat
      },
      {
        id: 'sphere3dFogMin',
        label: 'Rear Opacity',
        stateKey: 'sphere3dFogMin',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.42,
        format: v => Math.round(v * 100) + '%',
        parse: parseFloat
      },
      {
        id: 'sphere3dSpinStrainMax',
        label: 'Spin Deform',
        stateKey: 'sphere3dSpinStrainMax',
        type: 'range',
        min: 0, max: 0.12, step: 0.005,
        default: 0.055,
        format: v => Math.round(v * 1000) / 10 + '%',
        parse: parseFloat
      },
      warmupFramesControl('sphere3dWarmupFrames')
    ]
  },

  cube3d: {
    title: 'Scaffold',
    icon: '🧊',
    mode: '3d-cube',
    defaultOpen: false,
    controls: [
      {
        id: 'cube3dSizeVw',
        label: 'Size',
        stateKey: 'cube3dSizeVw',
        type: 'range',
        min: CUBE_3D_LIMITS.cube3dSizeVw.min, max: CUBE_3D_LIMITS.cube3dSizeVw.max, step: 0.5,
        default: CUBE_3D_DEFAULTS.cube3dSizeVw,
        format: v => v.toFixed(1) + 'vw',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'cube3dEdgeDensity',
        label: 'Edge Density',
        stateKey: 'cube3dEdgeDensity',
        type: 'range',
        min: CUBE_3D_LIMITS.cube3dEdgeDensity.min, max: CUBE_3D_LIMITS.cube3dEdgeDensity.max, step: 1,
        default: CUBE_3D_DEFAULTS.cube3dEdgeDensity,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'cube3dFaceGrid',
        label: 'Face Grid',
        stateKey: 'cube3dFaceGrid',
        type: 'range',
        min: CUBE_3D_LIMITS.cube3dFaceGrid.min, max: CUBE_3D_LIMITS.cube3dFaceGrid.max, step: 1,
        default: CUBE_3D_DEFAULTS.cube3dFaceGrid,
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
        min: CUBE_3D_LIMITS.cube3dIdleSpeed.min, max: CUBE_3D_LIMITS.cube3dIdleSpeed.max, step: 0.02,
        default: CUBE_3D_DEFAULTS.cube3dIdleSpeed,
        format: v => v.toFixed(2) + ' rad/s',
        parse: parseFloat
      },
      {
        id: 'cube3dCursorInfluence',
        label: 'Cursor Influence',
        stateKey: 'cube3dCursorInfluence',
        type: 'range',
        min: CUBE_3D_LIMITS.cube3dCursorInfluence.min, max: CUBE_3D_LIMITS.cube3dCursorInfluence.max, step: 0.05,
        default: CUBE_3D_DEFAULTS.cube3dCursorInfluence,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'cube3dTumbleSpeed',
        label: 'Tumble Speed',
        stateKey: 'cube3dTumbleSpeed',
        type: 'range',
        min: CUBE_3D_LIMITS.cube3dTumbleSpeed.min, max: CUBE_3D_LIMITS.cube3dTumbleSpeed.max, step: 0.1,
        default: CUBE_3D_DEFAULTS.cube3dTumbleSpeed,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      {
        id: 'cube3dTumbleDamping',
        label: 'Tumble Damping',
        stateKey: 'cube3dTumbleDamping',
        type: 'range',
        min: CUBE_3D_LIMITS.cube3dTumbleDamping.min, max: CUBE_3D_LIMITS.cube3dTumbleDamping.max, step: 0.005,
        default: CUBE_3D_DEFAULTS.cube3dTumbleDamping,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      {
        id: 'cube3dFocalLength',
        label: 'Focal Length',
        stateKey: 'cube3dFocalLength',
        type: 'range',
        min: CUBE_3D_LIMITS.cube3dFocalLength.min, max: CUBE_3D_LIMITS.cube3dFocalLength.max, step: 10,
        default: CUBE_3D_DEFAULTS.cube3dFocalLength,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10)
      },
      {
        id: 'cube3dDotSizeMul',
        label: 'Dot Size',
        stateKey: 'cube3dDotSizeMul',
        type: 'range',
        min: CUBE_3D_LIMITS.cube3dDotSizeMul.min, max: CUBE_3D_LIMITS.cube3dDotSizeMul.max, step: 0.05,
        default: CUBE_3D_DEFAULTS.cube3dDotSizeMul,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat
      },
      {
        id: 'cube3dFogStart',
        label: 'Fog Start',
        stateKey: 'cube3dFogStart',
        type: 'range',
        min: CUBE_3D_LIMITS.cube3dFogStart.min, max: CUBE_3D_LIMITS.cube3dFogStart.max, step: 0.05,
        default: CUBE_3D_DEFAULTS.cube3dFogStart,
        format: v => Math.round(v * 100) + '%',
        parse: parseFloat,
        hint: 'Normalized cube depth where rear fog starts; higher values pull fog forward through more circles.'
      },
      {
        id: 'cube3dFogMin',
        label: 'Fog Min Opacity',
        stateKey: 'cube3dFogMin',
        type: 'range',
        min: CUBE_3D_LIMITS.cube3dFogMin.min, max: CUBE_3D_LIMITS.cube3dFogMin.max, step: 0.05,
        default: CUBE_3D_DEFAULTS.cube3dFogMin,
        format: v => Math.round(v * 100) + '%',
        parse: parseFloat,
        hint: 'Minimum opacity for the furthest cube circles in the background fog.'
      },
      {
        id: 'cube3dReducedMotionScale',
        label: 'Reduced Motion Input',
        stateKey: 'cube3dReducedMotionScale',
        type: 'range',
        min: CUBE_3D_LIMITS.cube3dReducedMotionScale.min,
        max: CUBE_3D_LIMITS.cube3dReducedMotionScale.max,
        step: 0.01,
        default: CUBE_3D_DEFAULTS.cube3dReducedMotionScale,
        format: v => Math.round(v * 100) + '%',
        parse: parseFloat,
        hint: 'Scales direct pointer response when reduced motion is requested; idle rotation is disabled.'
      },
      warmupFramesControl('cube3dWarmupFrames')
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
        default: 0.4,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        reinitMode: true,
        hint: '0 = perfect grid, 1 = fully scattered'
      },
      { type: 'divider', label: 'Grid' },
      {
        id: 'parallaxFloatGridX',
        label: 'Grid X',
        stateKey: 'parallaxFloatGridX',
        type: 'range',
        min: 4, max: 30, step: 1,
        default: 14,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxFloatGridY',
        label: 'Grid Y',
        stateKey: 'parallaxFloatGridY',
        type: 'range',
        min: 4, max: 30, step: 1,
        default: 10,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxFloatGridZ',
        label: 'Grid Z (Depth)',
        stateKey: 'parallaxFloatGridZ',
        type: 'range',
        min: 2, max: 15, step: 1,
        default: 7,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      { type: 'divider', label: 'Spread & Depth' },
      {
        id: 'parallaxFloatSpanX',
        label: 'Span X',
        stateKey: 'parallaxFloatSpanX',
        type: 'range',
        min: 1.0, max: 12.0, step: 0.1,
        default: 5.0,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        reinitMode: true,
        hint: 'How far the grid extends horizontally'
      },
      {
        id: 'parallaxFloatSpanY',
        label: 'Span Y',
        stateKey: 'parallaxFloatSpanY',
        type: 'range',
        min: 1.0, max: 12.0, step: 0.1,
        default: 2.6,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        reinitMode: true,
        hint: 'How far the grid extends vertically'
      },
      {
        id: 'parallaxFloatZNear',
        label: 'Z Near',
        stateKey: 'parallaxFloatZNear',
        type: 'range',
        min: 10, max: 200, step: 5,
        default: 50,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxFloatZFar',
        label: 'Z Far',
        stateKey: 'parallaxFloatZFar',
        type: 'range',
        min: 200, max: 3000, step: 50,
        default: 2800,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxFloatFogStart',
        label: 'Fog Start',
        stateKey: 'parallaxFloatFogStart',
        type: 'range',
        min: 0.5, max: 0.98, step: 0.01,
        default: 0.9,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        reinitMode: true,
        hint: 'Depth point where the far-plane fade begins'
      },
      { type: 'divider', label: 'Camera' },
      {
        id: 'parallaxFloatFocalLength',
        label: 'Focal Length',
        stateKey: 'parallaxFloatFocalLength',
        type: 'range',
        min: 100, max: 1000, step: 10,
        default: 420,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10)
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
        min: 0.05, max: 1, step: 0.02,
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
        default: 1.1,
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
      if (RETIRED_CONTROL_IDS.has(control.id)) continue;
      all.push({ ...control, section: section.title });
    }
  }
  return all;
}

export function getControlById(id) {
  if (RETIRED_CONTROL_IDS.has(id)) return null;
  for (const section of Object.values(CONTROL_SECTIONS)) {
    const found = section.controls.find(c => c.id === id);
    if (found) return found;
  }
  return null;
}

/** Returns HTML for puck color controls (Light/Dark) for injection into the Puck section. */
export function getPuckColorControlsHTML() {
  const section = CONTROL_SECTIONS.colors;
  if (!section?.controls) return '';
  const puckColorControls = section.controls.filter(c => c.puckOnly && c.type === 'color');
  return puckColorControls.map(c => generateControlHTML(c)).join('');
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
    return generateColorDistributionControlHTML(control);
  }
  
  // Color picker type
  if (control.type === 'color') {
    const colorInputValue = getColorInputValue(control.default);
    return `
      <label class="${rowClass}" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label"${hintTitleAttr}>${control.label}</span>
          <span class="control-value" id="${valId}">${control.default}</span>
        </div>
        <input type="color" id="${pickerId}" value="${escapeAttr(colorInputValue)}" aria-label="${control.label}" />
      </label>
      ${control.hint ? `<p class="control-hint">${control.hint}</p>` : ''}`;
  }

  // Select type
  if (control.type === 'select') {
    const opts = Array.isArray(control.options) ? control.options : [];
    const optionsHtml = opts.map((o) => {
      if (typeof o === 'string' || typeof o === 'number' || typeof o === 'boolean') {
        const value = String(o);
        const selectedAttr = String(control.default) === value ? 'selected' : '';
        return `<option value="${value}" ${selectedAttr}>${value}</option>`;
      }
      const v = String(o?.value ?? '');
      const label = String(o?.label ?? o?.value ?? '');
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
  if (key === 'outerWall' || key === 'innerWall') {
    return generateWallSectionHTML(key, section);
  }

  const visibleControls = section.controls.filter(c => isControlVisible(c.id) && !c.puckOnly);
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
      html += `<div class="section-title">${control.group}</div><div class="group ${groupLayout}">`;
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
        <details class="panel-section-accordion" data-section-key="${key}" ${detailsAttrs}>
          ${header}
          ${body}
        </details>
      </div>`;
  }

  return `
    <details class="panel-section-accordion" data-section-key="${key}" ${detailsAttrs}>
      ${header}
      ${body}
    </details>`;
}

const WALL_GROUP_LABELS = {
  shine: 'Shine',
  shadow: 'Shadow',
  innerGlow: 'Inner Glow',
  innerShadow: 'Inner Shadow',
  micro: 'Micro-details',
  geometry: 'Geometry'
};

const WALL_GROUP_DESCRIPTIONS = {
  shine: 'Continuous border light around the edge (bright, dim, shadow points).',
  shadow: 'Inner or outward shadow (depth, overhang, cast shadow).',
  innerGlow: 'Soft top light inside the inner wall.',
  innerShadow: 'Inner shadow behind the wall (creates depth).',
  micro: 'Ambient occlusion and specular highlight on the edge.',
  geometry: 'Corner roundness and shape.'
};

function renderWallControlsWithGroupLabels(controls) {
  let html = '';
  let currentGroup = null;
  let chunkOpen = false;
  for (const control of controls) {
    const group = control.wallGroup || null;
    if (group !== currentGroup) {
      if (chunkOpen) html += '</div>';
      chunkOpen = false;
    if (group && WALL_GROUP_LABELS[group]) {
        const label = WALL_GROUP_LABELS[group];
        const desc = WALL_GROUP_DESCRIPTIONS[group] || '';
      html += `<div class="wall-chunk" data-wall-group="${escapeAttr(group)}"><div class="wall-chunk-header"><span class="wall-chunk-label">${escapeAttr(label)}</span><p class="wall-chunk-desc">${escapeAttr(desc)}</p></div>`;
        chunkOpen = true;
      }
      currentGroup = group;
    }
    html += generateControlHTML(control);
  }
  if (chunkOpen) html += '</div>';
  return html;
}

function generateWallSectionHTML(sectionKey, section) {
  const visibleControls = section.controls.filter(c => c.type !== 'divider' && c.id && isControlVisible(c.id));
  if (visibleControls.length === 0) return '';

  const shared = visibleControls.filter(c => c.theme == null);
  const lightControls = visibleControls.filter(c => c.theme === 'light');
  const darkControls = visibleControls.filter(c => c.theme === 'dark');

  const isDark = typeof document !== 'undefined' && document.body.classList.contains('dark-mode');
  const defaultTab = isDark ? 'dark' : 'light';

  const getGroupRank = (group, sectionKey) => {
    if (sectionKey === 'outerWall') {
      return { shadow: 1, micro: 2, shine: 3, geometry: 4 }[group] ?? 99;
    }
    if (sectionKey === 'innerWall') {
      return { innerShadow: 1, shine: 2, innerGlow: 3, shadow: 4, micro: 5, geometry: 6 }[group] ?? 99;
    }
    return 99;
  };

  const sortByGroupOrder = (controls) => {
    return [...controls].sort((a, b) => {
      const aRank = getGroupRank(a.wallGroup, sectionKey);
      const bRank = getGroupRank(b.wallGroup, sectionKey);
      if (aRank !== bRank) return aRank - bRank;
      return 0;
    });
  };

  const sharedHtml = renderWallControlsWithGroupLabels(sortByGroupOrder(shared));
  const lightHtml = renderWallControlsWithGroupLabels(sortByGroupOrder(lightControls));
  const darkHtml = renderWallControlsWithGroupLabels(sortByGroupOrder(darkControls));

  const lightTabActive = defaultTab === 'light' ? ' active' : '';
  const darkTabActive = defaultTab === 'dark' ? ' active' : '';
  const lightPanelActive = defaultTab === 'light' ? ' active' : '';
  const darkPanelActive = defaultTab === 'dark' ? ' active' : '';

  const tabStrip = `
    <div class="wall-theme-tabs" role="tablist" aria-label="Light or dark theme">
      <button type="button" class="wall-theme-tab${lightTabActive}" data-wall-section="${sectionKey}" data-theme="light" role="tab" aria-selected="${defaultTab === 'light'}">Light</button>
      <button type="button" class="wall-theme-tab${darkTabActive}" data-wall-section="${sectionKey}" data-theme="dark" role="tab" aria-selected="${defaultTab === 'dark'}">Dark</button>
    </div>`;
  const lightPanel = `<div id="${sectionKey}LightPanel" class="wall-tab-panel${lightPanelActive}" role="tabpanel" data-theme="light">${lightHtml}</div>`;
  const darkPanel = `<div id="${sectionKey}DarkPanel" class="wall-tab-panel${darkPanelActive}" role="tabpanel" data-theme="dark">${darkHtml}</div>`;

  const body = `<div class="panel-section-content wall-section-with-tabs">
    ${sharedHtml}
    ${tabStrip}
    ${lightPanel}
    ${darkPanel}
  </div>`;

  const detailsAttrs = `${section.defaultOpen ? 'open' : ''}`;
  const header = `
    <summary class="panel-section-header">
      ${section.icon ? `<span class="section-icon">${section.icon}</span>` : ''}
      <span class="section-label">${section.title}</span>
    </summary>`;

  return `
    <details class="panel-section-accordion" data-section-key="${sectionKey}" ${detailsAttrs}>
      ${header}
      ${body}
    </details>`;
}

// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    WALL STACK DIAGRAM — ISOMETRIC VIEW                       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝
export function generateWallStackDiagramHTML() {
  return `
    <div class="wall-stack-diagram-sticky">
    <div class="wall-stack-iso" role="img" aria-label="Wall layer stack, top to bottom">
      <div class="wall-stack-iso__caption">Wall stack (top → bottom)</div>
      <div class="wall-stack-iso__groups">
        <div class="wall-stack-iso__group" data-wall="inner">
          <div class="wall-stack-iso__group-label">Inner Wall</div>
          <div class="wall-stack-iso__group-body">
            <div class="wall-stack-iso__row" data-layer="inner-shine" data-section="innerWall" data-group="shine">
              <div class="wall-stack-iso__layer" data-layer="inner-shine"></div>
              <div class="wall-stack-iso__label">Inner Shine <span class="wall-stack-iso__z">Z:35</span></div>
            </div>
            <div class="wall-stack-iso__row" data-layer="inner-glow" data-section="innerWall" data-group="innerGlow">
              <div class="wall-stack-iso__layer" data-layer="inner-glow"></div>
              <div class="wall-stack-iso__label">Inner Glow <span class="wall-stack-iso__z">Z:30</span></div>
            </div>
            <div class="wall-stack-iso__row" data-layer="inner-shadow" data-section="innerWall" data-group="innerShadow">
              <div class="wall-stack-iso__layer" data-layer="inner-shadow"></div>
              <div class="wall-stack-iso__label">Inner Shadow <span class="wall-stack-iso__z">Z:25</span></div>
            </div>
          </div>
        </div>
        <div class="wall-stack-iso__group" data-wall="outer">
          <div class="wall-stack-iso__group-label">Outer Wall</div>
          <div class="wall-stack-iso__group-body">
            <div class="wall-stack-iso__row" data-layer="outer-shine" data-section="outerWall" data-group="shine">
              <div class="wall-stack-iso__layer" data-layer="outer-shine"></div>
              <div class="wall-stack-iso__label">Outer Shine <span class="wall-stack-iso__z">Z:25</span></div>
            </div>
            <div class="wall-stack-iso__row" data-layer="outer-shadow" data-section="outerWall" data-group="shadow">
              <div class="wall-stack-iso__layer" data-layer="outer-shadow"></div>
              <div class="wall-stack-iso__label">Outer Shadow <span class="wall-stack-iso__z">Z:25</span></div>
            </div>
            <div class="wall-stack-iso__row" data-layer="outer-micro" data-section="outerWall" data-group="micro">
              <div class="wall-stack-iso__layer" data-layer="outer-micro"></div>
              <div class="wall-stack-iso__label">Outer Micro <span class="wall-stack-iso__z">Z:25</span></div>
            </div>
          </div>
        </div>
        <div class="wall-stack-iso__group" data-wall="shared">
          <div class="wall-stack-iso__group-label">Shared</div>
          <div class="wall-stack-iso__group-body">
            <div class="wall-stack-iso__row" data-layer="geometry" data-section="outerWall" data-group="geometry">
              <div class="wall-stack-iso__layer" data-layer="geometry"></div>
              <div class="wall-stack-iso__label">Geometry <span class="wall-stack-iso__z">Z:25</span></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </div>
  `;
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
            <span class="control-label">Scheduled Palette</span>
            <span class="control-value"></span>
          </div>
          <select id="colorSelect" aria-label="Current scheduled palette" disabled></select>
        </label>
      </div>
    </details>`;
}

/**
 * Generate master panel sections with optional custom content injections.
 * @param {Object} options - Injection options
 * @param {Object} options.prepend - HTML to prepend to each group { groupId: htmlString }
 * @param {Object} options.append - HTML to append to each group { groupId: htmlString }
 * @param {Object} options.replace - Completely replace group content { groupId: htmlString }
 * @returns {string} Complete master groups HTML
 */
export function generateMasterSectionsHTML(options = {}) {
  const {
    prepend = {},
    append = {},
    replace = {},
    groupIds = null,
    includeRegisteredSections = true,
  } = options;
  const groups = Array.isArray(groupIds) && groupIds.length > 0
    ? MASTER_GROUPS.filter((group) => groupIds.includes(group.id))
    : MASTER_GROUPS;
  let html = '';

  for (const group of groups) {
    const openAttr = group.defaultOpen ? 'open' : '';

    // Check if this group has replacement content
    if (replace[group.id]) {
      html += `
      <details class="panel-master-group" data-group-id="${escapeAttr(group.id)}" ${openAttr}>
        ${renderMasterGroupSummary(group)}
        <div class="panel-master-group-content">
          ${replace[group.id]}
        </div>
      </details>`;
      continue;
    }

    // Build standard group content
    let groupContent = '';

    // Prepend custom content
    if (prepend[group.id]) {
      groupContent += prepend[group.id];
    }

    // Add registered sections (optional — dev panel can omit all sliders)
    if (includeRegisteredSections) {
      for (const key of group.sections) {
        if (!CONTROL_SECTIONS[key]) continue;
        groupContent += generateSectionHTML(key, CONTROL_SECTIONS[key]);
      }
    }

    // Append custom content
    if (append[group.id]) {
      groupContent += append[group.id];
    }

    if (!groupContent) continue;

    html += `
      <details class="panel-master-group" data-group-id="${escapeAttr(group.id)}" ${openAttr}>
        ${renderMasterGroupSummary(group)}
        <div class="panel-master-group-content">
          ${groupContent}
        </div>
      </details>`;
  }

  return html;
}

// Generate sections for GLOBAL group only
export function generateGlobalSectionsHTML() {
  const globalSections = ['colors', 'colorDistribution', 'uiSpacing', 'cursor', 'links', 'scene'];
  let html = '';
  for (const key of globalSections) {
    if (!CONTROL_SECTIONS[key]) continue;
    html += generateSectionHTML(key, CONTROL_SECTIONS[key]);
  }
  return html;
}

// Generate sections for SIMULATIONS group only
export function generateSimulationsSectionsHTML() {
  const simSections = ['liteMode', 'physics', 'balls'];
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

/**
 * Generate just the mode switcher buttons (no mode-specific sections).
 * Used by panel-dock.js to embed in the Simulations group.
 */
export function generateModeSwitcherHTML() {
  const modeIcons = {
    'pit': '🎯',
    'bubbles': '🫧',
    'critters': '🐝',
    'flies': '🕊️',
    'water': '🌊',
    'magnetic': '🧲',
    'weightless': '🌌',
    'kaleidoscope-3': '🪞',
    'kaleidoscope-rift': '✳',
    'rift-rings': '◎',
    'parallax-float': '🌫️',
    '3d-sphere': '🌐',
    '3d-cube': '🧊',
    'starfield-3d': '✨',
    'elastic-center': '◇',
    'flock-of-birds': '🕊️',
    'repel-room': '↔',
    'wall-repel': '↔',
    'aperture-bloom': '◎',
    'flubber-blob': '🫠',
    'weave-field': '🧵',
    'pressure-crucible': '◉',
    'particle-fountain': '⛲',
    'particle-fountain-b': '⛲',
    'napoleon-point-cloud': '●',
    'beach-ball-room': '◍'
  };
  const modeLabels = {
    'pit': 'Foundation',
    'bubbles': 'Emergence',
    'critters': 'Critter Swarm',
    'flies': 'Attention',
    'water': 'Flow',
    'magnetic': 'Magnetic Field',
    'weightless': 'Weightless Drift',
    'kaleidoscope-3': 'Refraction',
    'kaleidoscope-rift': 'Multiplicity',
    'rift-rings': 'Depth',
    'parallax-float': 'Parallax Drift',
    '3d-sphere': 'Continuity',
    '3d-cube': 'Scaffold',
    'starfield-3d': 'Perspective',
    'elastic-center': 'Elastic Loom',
    'flock-of-birds': 'Convergence',
    'repel-room': 'Tension',
    'wall-repel': 'Tension',
    'aperture-bloom': 'Aperture Bloom',
    'flubber-blob': 'Cohesion',
    'weave-field': 'Juxtaposition',
    'pressure-crucible': 'Pressure Field',
    'particle-fountain': 'Fountain A',
    'particle-fountain-b': 'Fountain B',
    'napoleon-point-cloud': 'Impression',
    'beach-ball-room': 'Beach Ball Room'
  };
  
  const dailyMode = getReloadSimulationId();
  
  let buttons = '';
  NARRATIVE_MODE_SEQUENCE.forEach((mode, idx) => {
    const icon = modeIcons[mode] || '⚪';
    const label = modeLabels[mode] || mode;
    const number = String(idx + 1).padStart(2, '0');
    const isDailyMode = mode === dailyMode;
    const dailyBadge = isDailyMode ? '<span class="daily-badge" title="Current Daily Simulation">↻</span>' : '';
    const ariaLabel = `${number} · ${(NARRATIVE_CHAPTER_TITLES[mode] || label)} mode${isDailyMode ? ' (Current Daily Simulation)' : ''}`;
    buttons += `<button class="mode-button${isDailyMode ? ' is-daily-mode' : ''}" data-mode="${mode}" aria-label="${ariaLabel}"><span class="mode-button-number">${number}</span><span class="mode-button-label">${icon} ${label}${dailyBadge}</span></button>`;
  });
  DEV_ONLY_MODES.forEach((mode, idx) => {
    const icon = modeIcons[mode] || '⚪';
    const label = modeLabels[mode] || mode;
    const number = `D${idx + 1}`;
    const ariaLabel = `${number} · ${(NARRATIVE_CHAPTER_TITLES[mode] || label)} dev mode`;
    buttons += `<button class="mode-button mode-button--dev-only" data-mode="${mode}" aria-label="${ariaLabel}"><span class="mode-button-number">${number}</span><span class="mode-button-label">${icon} ${label}</span></button>`;
  });

  return `
    <details class="panel-section-accordion" id="modeSwitcherSection" open>
      <summary class="panel-section-header">
        <span class="section-icon">🎛️</span>
        <span class="section-label">Mode</span>
      </summary>
      <div class="panel-section-content">
        <div class="mode-switcher" role="group" aria-label="Simulation mode selector">
          ${buttons}
        </div>
      </div>
    </details>`;
}

/**
 * Generate mode-specific sections HTML (only modes in narrative sequence).
 * Only narrative-sequence simulations are included.
 */
export function generateModeSpecificSectionsHTML(options = {}) {
  const showAllModes = options.showAllModes === true;
  const currentMode = getGlobals()?.currentMode;
  let allowedModes;
  if (showAllModes || !currentMode) {
    allowedModes = new Set(NARRATIVE_MODE_SEQUENCE);
  } else if (currentMode === MODES.PORTFOLIO_PIT) {
    // Portfolio uses pit physics tuning (gravity sleep, etc.) but `currentMode` is not `pit`.
    allowedModes = new Set([MODES.PIT]);
  } else {
    allowedModes = new Set([currentMode]);
  }
  let html = '';
  for (const [key, section] of Object.entries(CONTROL_SECTIONS)) {
    if (section?.mode && allowedModes.has(section.mode)) {
      html += generateSectionHTML(key, section);
    }
  }
  return html;
}

function generateHomeModeSectionHTML() {
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
              'magnetic': '🧲',
              'weightless': '🌌',
              'kaleidoscope-3': '🪞',
              'kaleidoscope-rift': '✳',
              'rift-rings': '◎',
              'parallax-float': '🌫️',
              '3d-sphere': '🌐',
              '3d-cube': '🧊',
              'starfield-3d': '✨',
              'elastic-center': '◇',
              'flock-of-birds': '🕊️',
              'repel-room': '↔',
              'wall-repel': '↔',
              'aperture-bloom': '◎',
              'flubber-blob': '🫠',
              'weave-field': '🧵',
              'pressure-crucible': '◉',
              'particle-fountain': '⛲',
              'particle-fountain-b': '⛲',
              'napoleon-point-cloud': '●',
              'beach-ball-room': '◍'
            };
            const modeLabels = {
              'pit': 'Foundation',
              'bubbles': 'Emergence',
              'critters': 'Critter Swarm',
              'flies': 'Attention',
              'water': 'Flow',
              'magnetic': 'Magnetic Field',
              'weightless': 'Weightless Drift',
              'kaleidoscope-3': 'Refraction',
              'kaleidoscope-rift': 'Multiplicity',
              'rift-rings': 'Depth',
              'parallax-float': 'Parallax Drift',
              '3d-sphere': 'Continuity',
              '3d-cube': 'Scaffold',
              'starfield-3d': 'Perspective',
              'elastic-center': 'Elastic Loom',
              'flock-of-birds': 'Convergence',
              'repel-room': 'Tension',
              'wall-repel': 'Tension',
              'aperture-bloom': 'Aperture Bloom',
              'flubber-blob': 'Cohesion',
              'weave-field': 'Juxtaposition',
              'pressure-crucible': 'Pressure Field',
              'particle-fountain': 'Fountain A',
              'particle-fountain-b': 'Fountain B',
              'napoleon-point-cloud': 'Impression',
              'beach-ball-room': 'Beach Ball Room'
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
            DEV_ONLY_MODES.forEach((mode, idx) => {
              const icon = modeIcons[mode] || '⚪';
              const label = modeLabels[mode] || mode;
              const number = `D${idx + 1}`;
              const ariaLabel = `${number} · ${(NARRATIVE_CHAPTER_TITLES[mode] || label)} dev mode`;
              buttons += `<button class="mode-button mode-button--dev-only" data-mode="${mode}" aria-label="${ariaLabel}"><span class="mode-button-number">${number}</span><span class="mode-button-label">${icon} ${label}</span></button>`;
            });
            return buttons;
          })()}
        </div>
        ${generateModeSpecificSectionsHTML({ showAllModes: true })}
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
      if (n < 4) console.warn(`[panel] Mode "${section.mode}" has only ${n} controls; add at least 4 parameters.`);
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

export function bindRegisteredControls(options = {}) {
  const g = getGlobals();
  const uiDocument = getUiDocument(options.uiDocument);
  if (!uiDocument) return;
  registerPanelUiDocument(uiDocument);
  hydrateSimulationAtmosphereControlState(g);

  for (const [sectionKey, section] of Object.entries(CONTROL_SECTIONS)) {
    for (const control of section.controls) {
      const valId = control.id + 'Val';
      const valEl = uiDocument.getElementById(valId);

      // Color distribution binding (custom)
      if (control.type === 'colorDistribution') {
        bindColorDistributionControl(control, g, uiDocument);
        continue;
      }
      
      // Color picker binding
      if (control.type === 'color') {
        const pickerId = control.id + 'Picker';
        const pickerEl = uiDocument.getElementById(pickerId);
        
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
        const el = uiDocument.getElementById(selectId);
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
        const el = uiDocument.getElementById(checkboxId);
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
            resetCurrentMode();
          }
        });

        continue;
      }

      // Default: Range slider binding
      const sliderId = control.id + 'Slider';
      const el = uiDocument.getElementById(sliderId);
      
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
          resetCurrentMode();
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

  const syncIntoDocument = (uiDocument) => {
    if (!uiDocument) return;
    registerPanelUiDocument(uiDocument);

    for (const section of Object.values(CONTROL_SECTIONS)) {
      for (const control of section.controls) {
        if (control.type === 'colorDistribution') {
          continue;
        }

        const elementId = control.type === 'color' ? (control.id + 'Picker') : (control.id + 'Slider');
        const valId = control.id + 'Val';
        const el = uiDocument.getElementById(elementId);
        const valEl = uiDocument.getElementById(valId);

        if (!el || !control.stateKey) continue;

        const stateVal = g[control.stateKey];
        if (stateVal === undefined) continue;

        if (control.type === 'checkbox' || control.type === 'toggle') {
          el.checked = !!stateVal;
          if (valEl) valEl.textContent = stateVal ? 'On' : 'Off';
        } else if (control.type === 'color') {
          el.value = getColorInputValue(stateVal, uiDocument);
          if (valEl) valEl.textContent = stateVal;
        } else {
          el.value = stateVal;
          if (valEl) valEl.textContent = control.format ? control.format(stateVal) : String(stateVal);
        }

        if (runOnChange && control.onChange && control.id !== 'entranceEnabled' && control.id !== 'contentFadeInDuration') {
          control.onChange(g, stateVal);
        }
      }
    }
  };

  if (options.uiDocument) {
    const explicitDocument = getUiDocument(options.uiDocument);
    if (explicitDocument) {
      syncIntoDocument(explicitDocument);
      return;
    }
  }

  let synced = false;
  forEachPanelUiDocument((uiDocument) => {
    syncIntoDocument(uiDocument);
    synced = true;
  });
  if (!synced) {
    const fallbackDocument = getUiDocument();
    if (fallbackDocument) syncIntoDocument(fallbackDocument);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// WALL SECTION TABS (Light/Dark) – bind tab clicks and sync to page theme
// ═══════════════════════════════════════════════════════════════════════════════

export function setupWallSectionTabs(uiDocument = null) {
  const panelDocument = getUiDocument(uiDocument);
  if (!panelDocument) return;
  registerPanelUiDocument(panelDocument);

  panelDocument.querySelectorAll('.wall-theme-tab').forEach(btn => {
    if (btn._wallTabBound) return;
    btn._wallTabBound = true;
    btn.addEventListener('click', () => {
      const sectionKey = btn.getAttribute('data-wall-section');
      const theme = btn.getAttribute('data-theme');
      if (!sectionKey || !theme) return;
      const container = btn.closest('.wall-section-with-tabs');
      if (!container) return;
      container.querySelectorAll('.wall-theme-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
      container.querySelectorAll('.wall-tab-panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');
      const panel = panelDocument.getElementById(sectionKey + (theme === 'light' ? 'LightPanel' : 'DarkPanel'));
      if (panel) panel.classList.add('active');
    });
  });
}

export function syncWallPanelTabsToTheme() {
  const isDark = document.body.classList.contains('dark-mode');
  const theme = isDark ? 'dark' : 'light';
  forEachPanelUiDocument((panelDocument) => {
    panelDocument.querySelectorAll('.wall-section-with-tabs').forEach(container => {
      const sectionKey = container.querySelector('.wall-theme-tab')?.getAttribute('data-wall-section');
      if (!sectionKey) return;
      const tab = container.querySelector(`.wall-theme-tab[data-theme="${theme}"]`);
      const panel = panelDocument.getElementById(sectionKey + (theme === 'light' ? 'LightPanel' : 'DarkPanel'));
      if (tab && panel) {
        container.querySelectorAll('.wall-theme-tab').forEach(t => { t.classList.remove('active'); t.setAttribute('aria-selected', 'false'); });
        container.querySelectorAll('.wall-tab-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        tab.setAttribute('aria-selected', 'true');
        panel.classList.add('active');
      }
    });
  });
}
