// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                     CENTRALIZED CONTROL REGISTRY                             ║
// ║        Single source of truth for all panel controls                         ║
// ║        Supports visibility toggling and dynamic HTML generation              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { autoSaveSettings } from '../utils/storage.js';

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
  // BALLS - Size, softness, spacing
  // ═══════════════════════════════════════════════════════════════════════════
  balls: {
    title: 'Balls',
    icon: '🎱',
    defaultOpen: false,
    controls: [
      {
        id: 'sizeGlobal',
        label: 'Size',
        stateKey: 'sizeScale',
        type: 'range',
        min: 0.1, max: 6.0, step: 0.05,
        default: 0.8,
        format: v => v.toFixed(2),
        parse: parseFloat,
        onChange: (g, val) => {
          // Use updateBallSizes to apply both sizeScale and responsiveScale
          import('../core/state.js').then(({ updateBallSizes }) => {
            updateBallSizes();
            const newSize = (g.R_MIN + g.R_MAX) / 2;
            g.balls.forEach(b => { b.r = newSize; b.rBase = newSize; });
          });
          import('../rendering/cursor.js').then(({ updateCursorSize }) => {
            updateCursorSize();
          });
        }
      },
      {
        id: 'responsiveScaleMobile',
        label: 'Mobile Scale',
        stateKey: 'responsiveScaleMobile',
        type: 'range',
        min: 0.5, max: 1.5, step: 0.05,
        default: 0.75,
        format: v => v.toFixed(2) + 'x',
        parse: parseFloat,
        hint: 'Ball size multiplier for iPad/iPhone (requires reload)',
        onChange: (g, val) => {
          // Refresh responsive scale detection
          import('../core/state.js').then(({ detectResponsiveScale }) => {
            detectResponsiveScale();
            const newSize = (g.R_MIN + g.R_MAX) / 2;
            g.balls.forEach(b => { b.r = newSize; b.rBase = newSize; });
          });
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
        min: 0, max: 10, step: 0.5,
        default: 2.5,
        format: v => v.toFixed(1) + 'px',
        parse: parseFloat
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CURSOR
  // ═══════════════════════════════════════════════════════════════════════════
  cursor: {
    title: 'Cursor',
    icon: '👆',
    defaultOpen: false,
    controls: [
      {
        id: 'cursorSize',
        label: 'Size',
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
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FRAME - Color only (thickness/radius controlled via Layout section)
  // ═══════════════════════════════════════════════════════════════════════════
  frame: {
    title: 'Frame',
    icon: '🖼️',
    defaultOpen: false,
    controls: [
      {
        id: 'frameColor',
        label: 'Color',
        stateKey: 'frameColor',
        type: 'color',
        default: '#0a0a0a',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--frame-color-light', val);
          root.style.setProperty('--frame-color-dark', val);
          root.style.setProperty('--wall-color', val);
          root.style.setProperty('--chrome-bg', val);
          root.style.setProperty('--chrome-bg-light', val);
          root.style.setProperty('--chrome-bg-dark', val);
          const meta = document.querySelector('meta[name="theme-color"]');
          if (meta) meta.content = val;
        }
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SHADOW - Inner shadow on container
  // ═══════════════════════════════════════════════════════════════════════════
  shadow: {
    title: 'Inner Shadow',
    icon: '🌑',
    defaultOpen: false,
    controls: [
      {
        id: 'containerInnerShadowOpacity',
        label: 'Strength',
        stateKey: 'containerInnerShadowOpacity',
        type: 'range',
        min: 0.0, max: 0.4, step: 0.01,
        default: 0.12,
        format: v => v.toFixed(2),
        parse: parseFloat,
        cssVar: '--container-inner-shadow-opacity'
      },
      {
        id: 'containerInnerShadowBlur',
        label: 'Blur',
        stateKey: 'containerInnerShadowBlur',
        type: 'range',
        min: 0, max: 250, step: 5,
        default: 80,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        cssVar: '--container-inner-shadow-blur'
      },
      {
        id: 'containerInnerShadowSpread',
        label: 'Spread',
        stateKey: 'containerInnerShadowSpread',
        type: 'range',
        min: -50, max: 50, step: 1,
        default: -10,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        cssVar: '--container-inner-shadow-spread'
      },
      {
        id: 'containerInnerShadowOffsetY',
        label: 'Offset Y',
        stateKey: 'containerInnerShadowOffsetY',
        type: 'range',
        min: -60, max: 60, step: 1,
        default: 0,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        cssVar: '--container-inner-shadow-offset-y'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // WOBBLE - Rubber wall physics
  // ═══════════════════════════════════════════════════════════════════════════
  wobble: {
    title: 'Wall Wobble',
    icon: '〰️',
    defaultOpen: false,
    controls: [
      {
        id: 'wallWobbleMaxDeform',
        label: 'Strength',
        stateKey: 'wallWobbleMaxDeform',
        type: 'range',
        min: 0, max: 150, step: 1,
        default: 148,
        format: v => `${v}px`,
        parse: v => parseInt(v, 10)
      },
      {
        id: 'wallWobbleStiffness',
        label: 'Return Speed',
        stateKey: 'wallWobbleStiffness',
        type: 'range',
        min: 50, max: 3000, step: 10,
        default: 1300,
        format: v => String(v),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'wallWobbleDamping',
        label: 'Damping',
        stateKey: 'wallWobbleDamping',
        type: 'range',
        min: 0, max: 80, step: 1,
        default: 34,
        format: v => String(v),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'wallWobbleSigma',
        label: 'Impact Spread',
        stateKey: 'wallWobbleSigma',
        type: 'range',
        min: 0.5, max: 4.0, step: 0.1,
        default: 4.0,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      {
        id: 'wallWobbleCornerClamp',
        label: 'Corner Stickiness',
        stateKey: 'wallWobbleCornerClamp',
        type: 'range',
        min: 0.0, max: 1.0, step: 0.01,
        default: 1.00,
        format: v => v.toFixed(2),
        parse: parseFloat
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // NOISE - Texture overlay
  // ═══════════════════════════════════════════════════════════════════════════
  noise: {
    title: 'Noise',
    icon: '📺',
    defaultOpen: false,
    controls: [
      {
        id: 'noiseSizeBase',
        label: 'Back Size',
        stateKey: 'noiseSizeBase',
        type: 'range',
        min: 50, max: 200, step: 5,
        default: 100,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        cssVar: '--noise-size-base'
      },
      {
        id: 'noiseSizeTop',
        label: 'Front Size',
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
        label: 'Back Opacity (Light)',
        stateKey: 'noiseBackOpacity',
        type: 'range',
        min: 0, max: 0.15, step: 0.001,
        default: 0.020,
        format: v => v.toFixed(3),
        parse: parseFloat,
        cssVar: '--noise-back-opacity'
      },
      {
        id: 'noiseFrontOpacity',
        label: 'Front Opacity (Light)',
        stateKey: 'noiseFrontOpacity',
        type: 'range',
        min: 0, max: 0.15, step: 0.001,
        default: 0.050,
        format: v => v.toFixed(3),
        parse: parseFloat,
        cssVar: '--noise-front-opacity'
      },
      {
        id: 'noiseBackOpacityDark',
        label: 'Back Opacity (Dark)',
        stateKey: 'noiseBackOpacityDark',
        type: 'range',
        min: 0, max: 0.15, step: 0.001,
        default: 0.06,
        format: v => v.toFixed(3),
        parse: parseFloat,
        cssVar: '--noise-back-opacity-dark'
      },
      {
        id: 'noiseFrontOpacityDark',
        label: 'Front Opacity (Dark)',
        stateKey: 'noiseFrontOpacityDark',
        type: 'range',
        min: 0, max: 0.15, step: 0.001,
        default: 0.04,
        format: v => v.toFixed(3),
        parse: parseFloat,
        cssVar: '--noise-front-opacity-dark'
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // MODE-SPECIFIC CONTROLS
  // ═══════════════════════════════════════════════════════════════════════════
  worms: {
    title: 'Worms',
    icon: '🪱',
    mode: 'worms',
    defaultOpen: false,
    controls: [
      // Population
      {
        id: 'wormPopulation',
        label: 'Population',
        stateKey: 'wormPopulation',
        type: 'range',
        min: 1, max: 200, step: 1,
        default: 28,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'wormSingleChance',
        label: 'Dot Chance',
        stateKey: 'wormSingleChance',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.42,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'wormDotSpeedMul',
        label: 'Dot Speed',
        stateKey: 'wormDotSpeedMul',
        type: 'range',
        min: 0.1, max: 6, step: 0.05,
        default: 2.5,
        format: v => v.toFixed(2) + 'x',
        parse: parseFloat
      },

      // Movement
      {
        id: 'wormBaseSpeed',
        label: 'Speed',
        stateKey: 'wormBaseSpeed',
        type: 'range',
        min: 0, max: 2000, step: 10,
        default: 900,
        format: v => `${Math.round(v)} px/s`,
        parse: parseFloat
      },
      {
        id: 'wormDamping',
        label: 'Damping',
        stateKey: 'wormDamping',
        type: 'range',
        min: 0.6, max: 0.99, step: 0.001,
        default: 0.885,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      {
        id: 'wormStepHz',
        label: 'Step Rate',
        stateKey: 'wormStepHz',
        type: 'range',
        min: 0, max: 12, step: 0.1,
        default: 1.7,
        format: v => v.toFixed(1) + ' Hz',
        parse: parseFloat
      },

      // Turning / personality
      {
        id: 'wormTurnNoise',
        label: 'Wander',
        stateKey: 'wormTurnNoise',
        type: 'range',
        min: 0, max: 12, step: 0.1,
        default: 4.6,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      {
        id: 'wormTurnDamp',
        label: 'Turn Inertia',
        stateKey: 'wormTurnDamp',
        type: 'range',
        min: 0, max: 40, step: 0.5,
        default: 5,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      {
        id: 'wormTurnSeek',
        label: 'Steering',
        stateKey: 'wormTurnSeek',
        type: 'range',
        min: 0, max: 40, step: 0.25,
        default: 16,
        format: v => v.toFixed(2),
        parse: parseFloat
      },

      // Mouse avoidance
      {
        id: 'wormMousePull',
        label: 'Mouse Pull',
        stateKey: 'wormMousePull',
        type: 'range',
        min: 0, max: 4, step: 0.05,
        default: 1.0,
        format: v => v.toFixed(2) + 'x',
        parse: parseFloat,
        hint: 'Attraction strength inside the mouse zone'
      },
      {
        id: 'wormMouseRadiusVw',
        label: 'Mouse Zone',
        stateKey: 'wormMouseRadiusVw',
        type: 'range',
        min: 0, max: 80, step: 1,
        default: 30,
        format: v => `${Math.round(v)}vw`,
        parse: parseFloat,
        hint: 'Radius of the attraction circle (viewport width units)'
      },
      {
        id: 'wormEdgeAvoid',
        label: 'Edge Avoid',
        stateKey: 'wormEdgeAvoid',
        type: 'range',
        min: 0, max: 3, step: 0.05,
        default: 1.0,
        format: v => v.toFixed(2) + 'x',
        parse: parseFloat,
        hint: 'Keeps heads off the walls (reduces edge-clumping)'
      },

      // Social interaction
      {
        id: 'wormSenseRadius',
        label: 'Sense Radius',
        stateKey: 'wormSenseRadius',
        type: 'range',
        min: 0, max: 2000, step: 10,
        default: 450,
        format: v => `${Math.round(v)}px`,
        parse: parseFloat
      },
      {
        id: 'wormAvoidForce',
        label: 'Avoid',
        stateKey: 'wormAvoidForce',
        type: 'range',
        min: 0, max: 8, step: 0.05,
        default: 2.5,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'wormAvoidSwirl',
        label: 'Swirl',
        stateKey: 'wormAvoidSwirl',
        type: 'range',
        min: 0, max: 3, step: 0.05,
        default: 0.35,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'wormCrowdBoost',
        label: 'Crowd Boost',
        stateKey: 'wormCrowdBoost',
        type: 'range',
        min: 0, max: 6, step: 0.05,
        default: 1.3,
        format: v => v.toFixed(2) + 'x',
        parse: parseFloat
      },

      // Squash & stretch
      {
        id: 'wormSquashDecay',
        label: 'Squash Decay',
        stateKey: 'wormSquashDecay',
        type: 'range',
        min: 0.6, max: 0.99, step: 0.001,
        default: 0.86,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      {
        id: 'wormStretchGain',
        label: 'Stretch Gain',
        stateKey: 'wormStretchGain',
        type: 'range',
        min: 0.0, max: 0.01, step: 0.0001,
        default: 0.0011,
        format: v => v.toFixed(4),
        parse: parseFloat
      },
      {
        id: 'wormStretchMax',
        label: 'Stretch Max',
        stateKey: 'wormStretchMax',
        type: 'range',
        min: 0.0, max: 2.0, step: 0.01,
        default: 0.38,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'wormContactSquashX',
        label: 'Contact Squash X',
        stateKey: 'wormContactSquashX',
        type: 'range',
        min: 0.0, max: 1.0, step: 0.01,
        default: 0.22,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'wormContactSquashY',
        label: 'Contact Squash Y',
        stateKey: 'wormContactSquashY',
        type: 'range',
        min: 0.0, max: 2.0, step: 0.01,
        default: 0.35,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'wormTurnSquashGain',
        label: 'Turn Squash',
        stateKey: 'wormTurnSquashGain',
        type: 'range',
        min: 0.0, max: 2.0, step: 0.01,
        default: 0.28,
        format: v => v.toFixed(2),
        parse: parseFloat
      }
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
      }
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
    title: 'Vortex',
    icon: '🌀',
    mode: 'vortex',
    defaultOpen: false,
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
    title: 'Ping Pong',
    icon: '🏓',
    mode: 'ping-pong',
    defaultOpen: false,
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
    mode: 'kaleidoscope',
    defaultOpen: false,
    controls: [
      {
        id: 'kaleiBallCount',
        label: 'Ball Count',
        stateKey: 'kaleidoscopeBallCount',
        type: 'range',
        min: 10, max: 200, step: 1,
        default: 23,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'kaleiSegments',
        label: 'Wedges',
        stateKey: 'kaleidoscopeSegments',
        type: 'range',
        min: 3, max: 24, step: 1,
        default: 12,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'kaleiMirror',
        label: 'Mirror',
        stateKey: 'kaleidoscopeMirror',
        type: 'range',
        min: 0, max: 1, step: 1,
        default: 1,
        format: v => (v ? 'On' : 'Off'),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'kaleiSpacing',
        label: 'Spacing',
        stateKey: 'kaleidoscopeBallSpacing',
        type: 'range',
        min: 0, max: 20, step: 0.5,
        default: 9,
        format: v => v.toFixed(1) + 'px',
        parse: parseFloat,
        onChange: (g, val) => {
          // Apply immediately only in Kaleidoscope, otherwise it would affect all modes.
          if (g.currentMode === 'kaleidoscope') {
            const canvas = g.canvas;
            const unit = canvas ? Math.max(0.35, Math.min(3.0, Math.min(canvas.width, canvas.height) / 1000)) : 1;
            g.ballSpacing = val * unit;
          }
        }
      },
      {
        id: 'kaleiSwirl',
        label: 'Swirl',
        stateKey: 'kaleidoscopeSwirlStrength',
        type: 'range',
        min: 0, max: 800, step: 5,
        default: 52,
        format: v => String(Math.round(v)),
        parse: parseFloat
      },
      {
        id: 'kaleiPull',
        label: 'Pull',
        stateKey: 'kaleidoscopeRadialPull',
        type: 'range',
        min: 0, max: 800, step: 10,
        default: 260,
        format: v => String(Math.round(v)),
        parse: parseFloat
      },
      {
        id: 'kaleiRotFollow',
        label: 'Rotation Follow',
        stateKey: 'kaleidoscopeRotationFollow',
        type: 'range',
        min: 0, max: 3, step: 0.05,
        default: 1.0,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'kaleiPan',
        label: 'Pan',
        stateKey: 'kaleidoscopePanStrength',
        type: 'range',
        min: 0, max: 2, step: 0.05,
        default: 0.75,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'kaleiEase',
        label: 'Easing',
        stateKey: 'kaleidoscopeEase',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.18,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'kaleiWander',
        label: 'Organic',
        stateKey: 'kaleidoscopeWander',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.25,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'kaleiMaxSpeed',
        label: 'Speed Clamp',
        stateKey: 'kaleidoscopeMaxSpeed',
        type: 'range',
        min: 300, max: 8000, step: 100,
        default: 2600,
        format: v => String(Math.round(v)),
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
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
          <span class="control-value" id="${valId}">${control.default}</span>
        </div>
        <input type="color" id="${pickerId}" value="${control.default}" aria-label="${control.label}" />
      </label>
      ${control.hint ? `<p class="control-hint">${control.hint}</p>` : ''}`;
  }
  
  // Default: range slider
  const hintHtml = control.hint ? `<p class="control-hint">${control.hint}</p>` : '';
  
  return `
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
          <span class="control-value" id="${valId}">${control.format(control.default)}</span>
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

export function generatePanelHTML() {
  // NOTE: Don't wrap in .panel-content here - panel-dock.js creates that wrapper

  let html = `
    <!-- Screen reader announcements -->
    <div role="status" aria-live="polite" aria-atomic="true" class="sr-only" id="announcer"></div>

    <!-- Theme -->
    <details class="panel-section-accordion" open>
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
    </details>

    <!-- Mode -->
    <details class="panel-section-accordion" open>
      <summary class="panel-section-header">
        <span class="section-icon">🎛️</span>
        <span class="section-label">Mode</span>
      </summary>
      <div class="panel-section-content">
        <div class="mode-switcher" role="group" aria-label="Simulation mode selector">
          <button class="mode-button active" data-mode="worms" aria-label="Worms mode">🪱 Worms</button>
          <button class="mode-button" data-mode="pit" aria-label="Ball Pit mode">🎯 Pit</button>
          <button class="mode-button" data-mode="flies" aria-label="Flies mode">🕊️ Flies</button>
          <button class="mode-button" data-mode="weightless" aria-label="Zero-G mode">🌌 Zero-G</button>
          <button class="mode-button" data-mode="water" aria-label="Water mode">🌊 Water</button>
          <button class="mode-button" data-mode="vortex" aria-label="Vortex mode">🌀 Vortex</button>
          <button class="mode-button" data-mode="ping-pong" aria-label="Ping Pong mode">🏓 Pong</button>
          <button class="mode-button" data-mode="magnetic" aria-label="Magnetic mode">🧲 Magnet</button>
          <button class="mode-button" data-mode="bubbles" aria-label="Bubbles mode">🫧 Bubbles</button>
          <button class="mode-button" data-mode="kaleidoscope" aria-label="Kaleidoscope mode">🪞 Kalei</button>
        </div>
      </div>
    </details>`;

  // Non-mode sections
  for (const [key, section] of Object.entries(CONTROL_SECTIONS)) {
    if (!section.mode) {
      html += generateSectionHTML(key, section);
    }
  }
  
  // Colors (special handling)
  html += `
    <details class="panel-section-accordion">
      <summary class="panel-section-header">
        <span class="section-icon">🌈</span>
        <span class="section-label">Colors</span>
      </summary>
      <div class="panel-section-content">
        <label class="control-row">
          <div class="control-row-header">
            <span class="control-label">Color Template</span>
            <span class="control-value"></span>
          </div>
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
    <div class="panel-section panel-section--action">
      <button id="saveConfigBtn" class="primary">💾 Save Config</button>
    </div>
    <div class="panel-footer">
      <kbd>R</kbd> reset · <kbd>/</kbd> panel · <kbd>9</kbd> kalei · Worms has no key (yet)
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

