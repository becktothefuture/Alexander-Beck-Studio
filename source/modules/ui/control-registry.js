// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                     CENTRALIZED CONTROL REGISTRY                             ║
// ║        Single source of truth for all panel controls                         ║
// ║        Supports visibility toggling and dynamic HTML generation              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { autoSaveSettings } from '../utils/storage.js';
import { resize } from '../rendering/renderer.js';

// Will be set by main.js to avoid circular dependency
let applyVisualCSSVars = null;
export function setApplyVisualCSSVars(fn) {
  applyVisualCSSVars = fn;
}

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
// CONTROL REGISTRY
// Complete definition of ALL controls with metadata
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Control definition schema:
 * {
 *   id: string,           // Unique identifier (matches slider ID without 'Slider' suffix)
 *   label: string,        // Display label
 *   stateKey: string,     // Key in global state to read/write
 *   type: 'range' | 'checkbox' | 'select',
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
  // GLOBAL PROPERTIES
  // ═══════════════════════════════════════════════════════════════════════════
  global: {
    title: 'Global Properties',
    icon: '🎱',
    defaultOpen: true,
    controls: [
      {
        id: 'sizeGlobal',
        label: 'Size',
        stateKey: 'sizeScale',
        type: 'range',
        min: 0.1, max: 6.0, step: 0.05,
        default: 1.2,
        format: v => v.toFixed(2),
        parse: parseFloat,
        onChange: (g, val) => {
          const base = (g.R_MIN_BASE + g.R_MAX_BASE) / 2;
          g.R_MIN = base * val * 0.75;
          g.R_MAX = base * val * 1.25;
          const newSize = (g.R_MIN + g.R_MAX) / 2;
          g.balls.forEach(b => { b.r = newSize; b.rBase = newSize; });
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
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FRAME & WALLS - Unified frame system (browser chrome + walls + border)
  // ═══════════════════════════════════════════════════════════════════════════
  walls: {
    title: 'Frame & Walls',
    icon: '🖼️',
    defaultOpen: false,
    controls: [
      // Frame color picker - controls ALL frame-related colors
      {
        id: 'frameColor',
        label: 'Frame Color',
        stateKey: 'frameColor',
        type: 'color',
        default: '#0a0a0a',
        hint: 'Browser chrome + walls + border (debug)',
        onChange: (g, val) => {
          const root = document.documentElement;
          // Update all unified frame colors
          root.style.setProperty('--frame-color-light', val);
          root.style.setProperty('--frame-color-dark', val);
          root.style.setProperty('--wall-color', val);
          root.style.setProperty('--chrome-bg', val);
          root.style.setProperty('--chrome-bg-light', val);
          root.style.setProperty('--chrome-bg-dark', val);
          // Update meta theme-color for browser chrome
          const meta = document.querySelector('meta[name="theme-color"]');
          if (meta) meta.content = val;
        }
      },
      // Frame thickness - controls both wall thickness AND container border
      {
        id: 'wallThickness',
        label: 'Frame Thickness',
        stateKey: 'wallThickness',
        type: 'range',
        min: 0, max: 60, step: 1,
        default: 20,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        hint: 'Unified: wall tubes + body border',
        onChange: (g, val) => {
          const root = document.documentElement;
          // Update both CSS vars - they're the same "frame"
          root.style.setProperty('--wall-thickness', val + 'px');
          root.style.setProperty('--container-border', val + 'px');
          // Resize canvas to fit new wall thickness
          resize();
        }
      },
      {
        id: 'wallSoftness',
        label: 'Glow Softness',
        stateKey: 'wallSoftness',
        type: 'range',
        min: 0, max: 60, step: 1,
        default: 20,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        cssVar: '--wall-softness'
      },
      {
        id: 'wallRadius',
        label: 'Corner Radius',
        stateKey: 'wallRadius',
        type: 'range',
        min: 0, max: 80, step: 2,
        default: 42,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        cssVar: '--wall-radius',
        onChange: (g, val) => { g.cornerRadius = val; }
      },
      {
        id: 'wallBounceHighlight',
        label: 'Bounce Flash',
        stateKey: 'wallBounceHighlightMax',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.3,
        format: v => v.toFixed(2),
        parse: parseFloat
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // VISUAL EFFECTS
  // ═══════════════════════════════════════════════════════════════════════════
  effects: {
    title: 'Effects',
    icon: '🎭',
    defaultOpen: false,
    controls: [
      // Noise
      {
        id: 'noiseSizeBase',
        label: 'Noise Back Size',
        stateKey: 'noiseSizeBase',
        group: 'Noise Texture',
        type: 'range',
        min: 50, max: 200, step: 5,
        default: 100,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        cssVar: '--noise-size-base'
      },
      {
        id: 'noiseSizeTop',
        label: 'Noise Front Size',
        stateKey: 'noiseSizeTop',
        type: 'range',
        min: 40, max: 150, step: 5,
        default: 80,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        cssVar: '--noise-size-top'
      },
      {
        id: 'noiseBackOpacity',
        label: 'Noise Back Opacity',
        stateKey: 'noiseBackOpacity',
        type: 'range',
        min: 0, max: 0.1, step: 0.001,
        default: 0.015,
        format: v => v.toFixed(3),
        parse: parseFloat,
        cssVar: '--noise-back-opacity'
      },
      {
        id: 'noiseFrontOpacity',
        label: 'Noise Front Opacity',
        stateKey: 'noiseFrontOpacity',
        type: 'range',
        min: 0, max: 0.05, step: 0.001,
        default: 0.01,
        format: v => v.toFixed(3),
        parse: parseFloat,
        cssVar: '--noise-front-opacity'
      },
      // Vignette
      {
        id: 'vignetteLightIntensity',
        label: 'Light Intensity',
        stateKey: 'vignetteLightIntensity',
        group: 'Vignette',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.08,
        format: v => v.toFixed(2),
        parse: parseFloat,
        cssVar: '--vignette-light-intensity'
      },
      {
        id: 'vignetteDarkIntensity',
        label: 'Dark Intensity',
        stateKey: 'vignetteDarkIntensity',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.05,
        format: v => v.toFixed(2),
        parse: parseFloat,
        cssVar: '--vignette-dark-intensity'
      },
      {
        id: 'vignetteBlurOuter',
        label: 'Outer Blur',
        stateKey: 'vignetteBlurOuter',
        type: 'range',
        min: 0, max: 400, step: 10,
        default: 180,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        cssVar: '--vignette-blur-outer'
      },
      {
        id: 'vignetteBlurMid',
        label: 'Mid Blur',
        stateKey: 'vignetteBlurMid',
        type: 'range',
        min: 0, max: 300, step: 10,
        default: 100,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        cssVar: '--vignette-blur-mid'
      },
      {
        id: 'vignetteBlurInner',
        label: 'Inner Blur',
        stateKey: 'vignetteBlurInner',
        type: 'range',
        min: 0, max: 200, step: 5,
        default: 40,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        cssVar: '--vignette-blur-inner'
      },
      {
        id: 'vignetteSpread',
        label: 'Spread',
        stateKey: 'vignetteSpread',
        type: 'range',
        min: -50, max: 50, step: 1,
        default: 0,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        cssVar: '--vignette-spread'
      },
      {
        id: 'vignetteX',
        label: 'Offset X',
        stateKey: 'vignetteX',
        type: 'range',
        min: -100, max: 100, step: 1,
        default: 0,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        cssVar: '--vignette-x'
      },
      {
        id: 'vignetteY',
        label: 'Offset Y',
        stateKey: 'vignetteY',
        type: 'range',
        min: -100, max: 100, step: 1,
        default: 0,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        cssVar: '--vignette-y'
      },
      {
        id: 'vignetteTransition',
        label: 'Animation',
        stateKey: 'vignetteTransition',
        type: 'range',
        min: 0, max: 2000, step: 50,
        default: 800,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        cssVar: '--vignette-transition'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE-SPECIFIC CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  pit: {
    title: 'Ball Pit Settings',
    icon: '🎯',
    mode: 'pit',
    defaultOpen: true,
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
      {
        id: 'weightPit',
        label: 'Weight',
        stateKey: 'ballMassKg',
        type: 'range',
        min: 10, max: 200, step: 1,
        default: 129,
        format: v => v.toFixed(0),
        parse: parseFloat,
        onChange: (g, val) => {
          g.balls.forEach(b => { b.m = val; });
        }
      },
      {
        id: 'restitution',
        label: 'Bounciness',
        stateKey: 'REST',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.69,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'friction',
        label: 'Air Friction',
        stateKey: 'FRICTION',
        type: 'range',
        min: 0, max: 0.01, step: 0.0005,
        default: 0.006,
        format: v => v.toFixed(4),
        parse: parseFloat
      },
      {
        id: 'repelSize',
        label: 'Repel Size',
        stateKey: 'repelRadius',
        type: 'range',
        min: 50, max: 1000, step: 5,
        default: 120,
        format: v => v.toFixed(0),
        parse: parseFloat
      },
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
      }
    ]
  },

  flies: {
    title: 'Flies Settings',
    icon: '🕊️',
    mode: 'flies',
    defaultOpen: true,
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
      }
    ]
  },

  weightless: {
    title: 'Zero-G Settings',
    icon: '🌌',
    mode: 'weightless',
    defaultOpen: true,
    controls: [
      {
        id: 'weightlessCount',
        label: 'Ball Count',
        stateKey: 'weightlessBallCount',
        type: 'range',
        min: 20, max: 200, step: 10,
        default: 80,
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
        default: 0.95,
        format: v => v.toFixed(2),
        parse: parseFloat
      }
    ]
  },

  water: {
    title: 'Water Settings',
    icon: '🌊',
    mode: 'water',
    defaultOpen: true,
    controls: [
      {
        id: 'waterBallCount',
        label: 'Ball Count',
        stateKey: 'waterBallCount',
        type: 'range',
        min: 50, max: 400, step: 10,
        default: 300,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'waterRippleStrength',
        label: 'Ripple Strength',
        stateKey: 'waterRippleStrength',
        type: 'range',
        min: 5000, max: 30000, step: 1000,
        default: 18000,
        format: v => v.toFixed(0),
        parse: parseFloat
      },
      {
        id: 'waterMotion',
        label: 'Motion',
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
      }
    ]
  },

  vortex: {
    title: 'Vortex Settings',
    icon: '🌀',
    mode: 'vortex',
    defaultOpen: true,
    controls: [
      {
        id: 'vortexBallCount',
        label: 'Ball Count',
        stateKey: 'vortexBallCount',
        type: 'range',
        min: 50, max: 300, step: 10,
        default: 180,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'vortexSwirl',
        label: 'Swirl Strength',
        stateKey: 'vortexSwirlStrength',
        type: 'range',
        min: 100, max: 800, step: 20,
        default: 420,
        format: v => v.toFixed(0),
        parse: parseFloat
      },
      {
        id: 'vortexPull',
        label: 'Radial Pull',
        stateKey: 'vortexRadialPull',
        type: 'range',
        min: 0, max: 400, step: 10,
        default: 180,
        format: v => v.toFixed(0),
        parse: parseFloat
      }
    ]
  },

  'ping-pong': {
    title: 'Ping Pong Settings',
    icon: '🏓',
    mode: 'ping-pong',
    defaultOpen: true,
    controls: [
      {
        id: 'pingPongBallCount',
        label: 'Ball Count',
        stateKey: 'pingPongBallCount',
        type: 'range',
        min: 10, max: 100, step: 5,
        default: 35,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'pingPongSpeed',
        label: 'Ball Speed',
        stateKey: 'pingPongSpeed',
        type: 'range',
        min: 200, max: 1200, step: 50,
        default: 800,
        format: v => v.toFixed(0),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'pingPongCursor',
        label: 'Cursor Size',
        stateKey: 'pingPongCursorRadius',
        type: 'range',
        min: 20, max: 200, step: 10,
        default: 50,
        format: v => v.toFixed(0),
        parse: parseFloat
      }
    ]
  },

  magnetic: {
    title: 'Magnetic Settings',
    icon: '🧲',
    mode: 'magnetic',
    defaultOpen: true,
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
        parse: parseFloat
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
      }
    ]
  },

  bubbles: {
    title: 'Bubbles Settings',
    icon: '🫧',
    mode: 'bubbles',
    defaultOpen: true,
    controls: [
      {
        id: 'bubblesRate',
        label: 'Bubble Rate',
        stateKey: 'bubblesSpawnRate',
        type: 'range',
        min: 1, max: 20, step: 1,
        default: 8,
        format: v => String(v),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'bubblesSpeed',
        label: 'Rise Speed',
        stateKey: 'bubblesRiseSpeed',
        type: 'range',
        min: 50, max: 400, step: 25,
        default: 150,
        format: v => v.toFixed(0),
        parse: parseFloat
      },
      {
        id: 'bubblesWobble',
        label: 'Wobble',
        stateKey: 'bubblesWobble',
        type: 'range',
        min: 0, max: 100, step: 5,
        default: 40,
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
      {
        id: 'bubblesDeflect',
        label: 'Cursor Deflection',
        stateKey: 'bubblesDeflectRadius',
        type: 'range',
        min: 20, max: 150, step: 10,
        default: 80,
        format: v => v.toFixed(0),
        parse: parseFloat
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
  if (!isControlVisible(control.id)) return '';
  
  const sliderId = control.id + 'Slider';
  const valId = control.id + 'Val';
  const pickerId = control.id + 'Picker';
  
  // Color picker type
  if (control.type === 'color') {
    return `
      <label data-control-id="${control.id}" style="flex-direction: row; align-items: center; gap: 8px;">
        <span style="flex: 1;">${control.label}</span>
        <input type="color" id="${pickerId}" value="${control.default}" style="width: 32px; height: 20px; border: 1px solid rgba(0,255,136,0.4); cursor: pointer;">
        <span class="val" id="${valId}" style="min-width: 60px; font-size: 7px;">${control.default}</span>
      </label>${control.hint ? `<div style="font-size: 7px; opacity: 0.5; margin: -6px 0 8px;">${control.hint}</div>` : ''}`;
  }
  
  // Default: range slider
  const hintHtml = control.hint ? `<div style="font-size: 7px; opacity: 0.5; margin: -6px 0 8px;">${control.hint}</div>` : '';
  
  return `
      <label data-control-id="${control.id}">
        <span>${control.label}<span class="val" id="${valId}">${control.format(control.default)}</span></span>
        <input type="range" id="${sliderId}" min="${control.min}" max="${control.max}" step="${control.step}" value="${control.default}">
      </label>${hintHtml}`;
}

function generateSectionHTML(key, section) {
  const visibleControls = section.controls.filter(c => isControlVisible(c.id));
  if (visibleControls.length === 0) return '';
  
  // Group controls by 'group' property
  let currentGroup = null;
  let html = '';
  
  for (const control of visibleControls) {
    // Insert group header if new group
    if (control.group && control.group !== currentGroup) {
      if (currentGroup !== null) html += '</div>'; // Close previous group
      html += `<div class="section-title" style="margin-top: 12px;">${control.group}</div><div class="group">`;
      currentGroup = control.group;
    } else if (!control.group && currentGroup !== null) {
      html += '</div>'; // Close group, back to ungrouped
      currentGroup = null;
    }
    
    html += generateControlHTML(control);
  }
  
  // Close any open group
  if (currentGroup !== null) html += '</div>';
  
  // Wrap in accordion/details if not mode-specific
  if (section.mode) {
    return `
  <div id="${section.mode}Controls" class="mode-controls${section.mode === 'flies' ? ' active' : ''}">
    <details ${section.defaultOpen ? 'open' : ''}>
      <summary>${section.title}</summary>
      <div class="group">${html}</div>
    </details>
  </div>`;
  }
  
  return `
  <details ${section.defaultOpen ? 'open' : ''}>
    <summary>${section.title}</summary>
    <div class="group">${html}</div>
  </details>`;
}

export function generatePanelHTML() {
  let html = `
  <!-- Screen reader announcements -->
  <div role="status" aria-live="polite" aria-atomic="true" class="sr-only" id="announcer"></div>
  
  <div class="panel-content">
  
  <!-- Theme Segment Control -->
  <div class="panel-section">
    <div class="section-title">🎨 Theme</div>
    <div class="theme-segment-control" role="group" aria-label="Theme selector">
      <button id="themeAuto" class="theme-segment-btn" aria-label="Auto theme">Auto</button>
      <button id="themeLight" class="theme-segment-btn active" aria-label="Light theme">Light</button>
      <button id="themeDark" class="theme-segment-btn" aria-label="Dark theme">Dark</button>
    </div>
    <div id="themeStatus" class="panel-status">☀️ Light Mode</div>
  </div>
  
  <!-- Mode Switcher -->
  <div class="panel-section">
    <div class="section-title">Mode</div>
    <div class="mode-switcher" role="group" aria-label="Simulation mode selector">
      <button class="mode-button" data-mode="pit" aria-label="Ball Pit mode">🎯 Pit</button>
      <button class="mode-button active" data-mode="flies" aria-label="Flies mode">🕊️ Flies</button>
      <button class="mode-button" data-mode="weightless" aria-label="Zero-G mode">🌌 Zero-G</button>
      <button class="mode-button" data-mode="water" aria-label="Water mode">🌊 Water</button>
      <button class="mode-button" data-mode="vortex" aria-label="Vortex mode">🌀 Vortex</button>
      <button class="mode-button" data-mode="ping-pong" aria-label="Ping Pong mode">🏓 Pong</button>
      <button class="mode-button" data-mode="magnetic" aria-label="Magnetic mode">🧲 Magnet</button>
      <button class="mode-button" data-mode="bubbles" aria-label="Bubbles mode">🫧 Bubbles</button>
    </div>
  </div>`;

  // Non-mode sections
  for (const [key, section] of Object.entries(CONTROL_SECTIONS)) {
    if (!section.mode) {
      html += generateSectionHTML(key, section);
    }
  }
  
  // Colors (special handling)
  html += `
  <details>
    <summary>Colors</summary>
    <div class="group">
      <label>
        <span>Color Template</span>
        <select id="colorSelect"></select>
      </label>
    </div>
  </details>`;
  
  // Mode-specific sections
  for (const [key, section] of Object.entries(CONTROL_SECTIONS)) {
    if (section.mode) {
      html += generateSectionHTML(key, section);
    }
  }
  
  // Footer
  html += `
  <!-- Save Config -->
  <div class="panel-section panel-section--action">
    <button id="saveConfigBtn" class="primary">💾 Save Config</button>
  </div>
  
  <!-- Keyboard shortcuts -->
  <div class="panel-footer">
    <kbd>R</kbd> reset · <kbd>/</kbd> panel · click cycles modes
  </div>
  
  </div>`;
  
  return html;
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
          
          autoSaveSettings();
        });
        
        continue;
      }
      
      // Default: Range slider binding
      const sliderId = control.id + 'Slider';
      const el = document.getElementById(sliderId);
      
      if (!el) continue;
      
      el.addEventListener('input', () => {
        const rawVal = control.parse(el.value);
        
        // Update state
        if (control.stateKey && !control.onChange) {
          g[control.stateKey] = rawVal;
        }
        
        // Custom handler
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
          
          // Special case: wall thickness triggers resize
          if (control.id === 'wallThickness') {
            resize();
          }
        }
        
        // Re-init mode if needed
        if (control.reinitMode && g.currentMode === section.mode) {
          const modeName = section.mode.replace('-', '');
          import(`../modes/${section.mode}.js`).then(mod => {
            const initFn = Object.values(mod).find(fn => 
              typeof fn === 'function' && fn.name.toLowerCase().includes('initialize')
            );
            if (initFn) initFn();
          }).catch(() => {});
        }
        
        autoSaveSettings();
      });
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SYNC SLIDERS TO STATE (after loading saved settings)
// ═══════════════════════════════════════════════════════════════════════════════

export function syncSlidersToState() {
  const g = getGlobals();
  
  for (const section of Object.values(CONTROL_SECTIONS)) {
    for (const control of section.controls) {
      const sliderId = control.id + 'Slider';
      const valId = control.id + 'Val';
      const el = document.getElementById(sliderId);
      const valEl = document.getElementById(valId);
      
      if (!el || !control.stateKey) continue;
      
      const stateVal = g[control.stateKey];
      if (stateVal !== undefined) {
        el.value = stateVal;
        if (valEl) valEl.textContent = control.format(stateVal);
      }
    }
  }
}

