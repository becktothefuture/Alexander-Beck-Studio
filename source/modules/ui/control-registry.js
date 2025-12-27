// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                     CENTRALIZED CONTROL REGISTRY                             ║
// ║        Single source of truth for all panel controls                         ║
// ║        Supports visibility toggling and dynamic HTML generation              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { autoSaveSettings } from '../utils/storage.js';
import { WALL_PRESETS, ORBIT3D_PRESETS, PARALLAX_LINEAR_PRESETS, PARALLAX_PERSPECTIVE_PRESETS, NARRATIVE_MODE_SEQUENCE, NARRATIVE_CHAPTER_TITLES, MODES } from '../core/constants.js';
import { applyOrbit3DPreset } from '../modes/orbit-3d.js';
import { applyNoiseSystem } from '../visual/noise-system.js';
import { applyWallPreset } from '../physics/wall-state.js';

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
// PANEL SCOPES (MASTER vs HOME)
// ═══════════════════════════════════════════════════════════════════════════════

export const MASTER_SECTION_KEYS = [
  // Artist-first order: start with the physical world, then look/texture, then interaction.
  'physics',            // global material world (mass, bounce, drag, perf)
  'wall',               // boundary feel + wobble
  'balls',              // ball material + spacing
  'colorDistribution',  // what's inside (palette mix)
  'colors',             // surface + text + frame
  'noise',              // grain/texture
  'cursor',             // interaction feel
  'trail',              // motion styling
  'links',              // link styling, padding, color, impact motion
  'scene',              // global scene motion
  'overlay',            // gate/overlays
  'entrance',           // dramatic page entrance animation
  'environment'         // browser/theme behavior
];

// Category groupings for visual chunking in the panel
const SECTION_CATEGORIES = {
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
  'entrance': 'MOTION',

  'overlay': 'DEPTH & LAYOUT',
  'layout': 'DEPTH & LAYOUT',

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

export function applyParallaxPerspectivePreset(presetName, reinit = true) {
  const preset = PARALLAX_PERSPECTIVE_PRESETS[presetName];
  if (!preset) return;

  const g = getGlobals();
  for (const [key, val] of Object.entries(preset)) {
    if (key === 'label') continue;
    if (g[key] !== undefined) g[key] = val;
  }
  g.parallaxPerspectivePreset = presetName;

  if (reinit) {
    import('../modes/mode-controller.js').then(({ resetCurrentMode }) => resetCurrentMode());
  }

  try { syncSlidersToState(); } catch (e) {}
  console.log(`Applied parallax perspective preset: ${preset.label}`);
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
        hint: 'Lower = faster, higher = tighter stacks.'
      },
      {
        id: 'physicsSkipSleepingCollisions',
        label: 'Skip Sleeping Pairs',
        stateKey: 'physicsSkipSleepingCollisions',
        type: 'toggle',
        default: true,
        group: 'Performance'
      },
      {
        id: 'physicsSpatialGridOptimization',
        label: 'Grid Reuse',
        stateKey: 'physicsSpatialGridOptimization',
        type: 'toggle',
        default: true,
        group: 'Performance'
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
        hint: 'Global sleep threshold for non-Pit physics modes. 0 disables.'
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
        group: 'Performance'
      },
      {
        id: 'physicsSkipSleepingSteps',
        label: 'Skip Sleeping Steps',
        stateKey: 'physicsSkipSleepingSteps',
        type: 'toggle',
        default: true,
        group: 'Performance'
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
      },
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
  // TRAIL - Mouse trail tuning (performance-first)
  // ═══════════════════════════════════════════════════════════════════════════
  trail: {
    title: 'Motion Trail',
    icon: '💨',
    defaultOpen: false,
    controls: [
      {
        id: 'mouseTrailEnabled',
        label: 'Enabled',
        stateKey: 'mouseTrailEnabled',
        type: 'checkbox',
        default: true
      },
      {
        id: 'mouseTrailLength',
        label: 'Length',
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
        label: 'Size',
        stateKey: 'mouseTrailSize',
        type: 'range',
        min: 0.5, max: 10, step: 0.1,
        default: 1.3,
        format: v => v.toFixed(1) + 'px',
        parse: parseFloat
      },
      {
        id: 'mouseTrailFadeMs',
        label: 'Fade',
        stateKey: 'mouseTrailFadeMs',
        type: 'range',
        min: 40, max: 1200, step: 10,
        default: 220,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10)
      },
      {
        id: 'mouseTrailOpacity',
        label: 'Opacity',
        stateKey: 'mouseTrailOpacity',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.35,
        format: v => v.toFixed(2),
        parse: parseFloat
      }
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LINKS - Text and icon link styling, padding, color influence, impact motion
  // ═══════════════════════════════════════════════════════════════════════════
  links: {
    title: 'Links',
    icon: '🔗',
    defaultOpen: false,
    controls: [
      {
        id: 'linkTextPadding',
        label: 'Text Link Padding',
        stateKey: 'linkTextPadding',
        type: 'range',
        min: 4, max: 40, step: 1,
        default: 30,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Padding for text links (footer links, CV links)',
        onChange: (g, val) => {
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
        hint: 'Padding for icon links (social media icons)',
        onChange: (g, val) => {
          document.documentElement.style.setProperty('--link-icon-padding', `${val}px`);
          document.documentElement.style.setProperty('--link-icon-margin', `${-val}px`);
        }
      },
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
        hint: 'How strongly the logo counter-scales against the scene press (higher = logo feels more “anchored”).',
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
        id: 'gateOverlayEnabled',
        label: 'Enabled',
        stateKey: 'gateOverlayEnabled',
        type: 'checkbox',
        default: true
      },
      {
        id: 'gateOverlayOpacity',
        label: 'White Wash',
        stateKey: 'gateOverlayOpacity',
        type: 'range',
        min: 0, max: 0.1, step: 0.001,
        default: 0.01,
        format: v => v.toFixed(3),
        parse: parseFloat,
        onChange: (g, val) => {
          import('./gate-overlay.js').then(({ updateOverlayOpacity }) => {
            updateOverlayOpacity(val);
          });
        }
      },
      {
        id: 'gateOverlayTransitionMs',
        label: 'Anim In Speed',
        stateKey: 'gateOverlayTransitionMs',
        type: 'range',
        min: 200, max: 1500, step: 50,
        default: 800,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10),
        hint: 'Duration for blur & depth zoom when opening',
        onChange: (g, val) => {
          import('./gate-overlay.js').then(({ updateOverlayTransition }) => {
            updateOverlayTransition(val);
          });
        }
      },
      {
        id: 'gateOverlayTransitionOutMs',
        label: 'Anim Out Speed',
        stateKey: 'gateOverlayTransitionOutMs',
        type: 'range',
        min: 200, max: 1200, step: 50,
        default: 600,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10),
        hint: 'Duration for blur & depth zoom when closing',
        onChange: (g, val) => {
          import('./gate-overlay.js').then(({ updateOverlayTransitionOut }) => {
            updateOverlayTransitionOut(val);
          });
        }
      },
      {
        id: 'gateOverlayContentDelayMs',
        label: 'Content Delay',
        stateKey: 'gateOverlayContentDelayMs',
        type: 'range',
        min: 0, max: 1000, step: 50,
        default: 200,
        format: v => `${Math.round(v)}ms`,
        parse: v => parseInt(v, 10),
        hint: 'Wait before showing dialog content',
        onChange: (g, val) => {
          import('./gate-overlay.js').then(({ updateGateContentDelay }) => {
            updateGateContentDelay(val);
          });
        }
      },
      {
        id: 'gateDepthScale',
        label: 'Depth Scale',
        stateKey: 'gateDepthScale',
        type: 'range',
        min: 0.9, max: 1.0, step: 0.001,
        default: 0.96,
        format: v => v.toFixed(3),
        parse: parseFloat,
        hint: 'Scene scale when gate opens (0.9-1.0)',
        onChange: (g, val) => {
          import('./gate-overlay.js').then(({ updateGateDepthScale }) => {
            updateGateDepthScale(val);
          });
        }
      },
      {
        id: 'gateDepthTranslateY',
        label: 'Depth Shift',
        stateKey: 'gateDepthTranslateY',
        type: 'range',
        min: 0, max: 30, step: 1,
        default: 8,
        format: v => `${Math.round(v)}px`,
        parse: parseInt,
        hint: 'Vertical shift when gate opens',
        onChange: (g, val) => {
          import('./gate-overlay.js').then(({ updateGateDepthTranslateY }) => {
            updateGateDepthTranslateY(val);
          });
        }
      },
      {
        id: 'logoOpacityInactive',
        label: 'Logo Opacity Closed',
        stateKey: 'logoOpacityInactive',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 1,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Logo opacity when gate is closed (1 = fully visible)',
        onChange: (g, val) => {
          import('./gate-overlay.js').then(({ updateLogoOpacityInactive }) => {
            updateLogoOpacityInactive(val);
          });
        }
      },
      {
        id: 'logoOpacityActive',
        label: 'Logo Opacity Open',
        stateKey: 'logoOpacityActive',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.2,
        format: v => v.toFixed(2),
        parse: parseFloat,
        hint: 'Logo opacity when gate is active (0.2 = more faded)',
        onChange: (g, val) => {
          import('./gate-overlay.js').then(({ updateLogoOpacityActive }) => {
            updateLogoOpacityActive(val);
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
          import('./gate-overlay.js').then(({ updateLogoBlurInactive }) => {
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
          import('./gate-overlay.js').then(({ updateLogoBlurActive }) => {
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
          if (!g.isDarkMode) {
            root.style.setProperty('--chrome-bg', val);
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.content = val;
          }
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
          if (g.isDarkMode) {
            root.style.setProperty('--chrome-bg', val);
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.content = val;
          }
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

      // ─── EDGE LABELS (CHAPTER + COPYRIGHT) ─────────────────────────────────
      { type: 'divider', label: 'Edge Labels' },
      {
        id: 'edgeLabelColorLight',
        label: 'Light Mode',
        stateKey: 'edgeLabelColorLight',
        type: 'color',
        default: '#2f2f2f',
        hint: 'Color for the vertical edge labels in light mode',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--edge-label-color-light', val);
        }
      },
      {
        id: 'edgeLabelColorDark',
        label: 'Dark Mode',
        stateKey: 'edgeLabelColorDark',
        type: 'color',
        default: '#b3b3b3',
        hint: 'Color for the vertical edge labels in dark mode',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--edge-label-color-dark', val);
        }
      },
      {
        id: 'edgeLabelInsetAdjustPx',
        label: 'Inset',
        stateKey: 'edgeLabelInsetAdjustPx',
        type: 'range',
        min: -120, max: 240, step: 1,
        default: 0,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10),
        hint: 'Adjusts edge label inset relative to wall. Higher = inward; lower = outward.',
        onChange: (_g, val) => {
          // Recalculate edge label inset (relative to wall)
          import('../core/state.js').then(mod => {
            mod.applyLayoutCSSVars();
          });
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
        id: 'logoColorLight',
        label: 'Light Mode',
        stateKey: 'logoColorLight',
        type: 'color',
        default: '#161616',
        hint: 'Logo color in light mode',
        onChange: (_g, val) => {
          // Only set CSS variable - let CSS handle mode switching
          document.documentElement.style.setProperty('--logo-color-light', val);
        }
      },
      {
        id: 'logoColorDark',
        label: 'Dark Mode',
        stateKey: 'logoColorDark',
        type: 'color',
        default: '#d5d5d5',
        hint: 'Logo color in dark mode',
        onChange: (_g, val) => {
          // Only set CSS variable - let CSS handle mode switching
          document.documentElement.style.setProperty('--logo-color-dark', val);
        }
      },
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
      { type: 'divider', label: 'Portfolio Logo' },
      {
        id: 'portfolioLogoColorLight',
        label: 'Light Mode',
        stateKey: 'portfolioLogoColorLight',
        type: 'color',
        default: '#161616',
        hint: 'Portfolio logo color in light mode (separate from index)',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--portfolio-logo-color-light', val);
        }
      },
      {
        id: 'portfolioLogoColorDark',
        label: 'Dark Mode',
        stateKey: 'portfolioLogoColorDark',
        type: 'color',
        default: '#d5d5d5',
        hint: 'Portfolio logo color in dark mode (separate from index)',
        onChange: (_g, val) => {
          document.documentElement.style.setProperty('--portfolio-logo-color-dark', val);
        }
      }
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
          'AI Integration',
          'UI/UX Design',
          'Creative Strategy',
          'Frontend Development',
          'Brand Identity',
          '3D Design',
          'Art Direction'
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
        default: '#0a0a0a',
        hint: 'Wall color in light mode (also used for browser chrome)',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--frame-color-light', val);
          // Wall colors automatically updated via CSS: --wall-color-light: var(--frame-color-light)
          // Update browser chrome if in light mode
          if (!g.isDarkMode) {
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.content = val;
            root.style.setProperty('--chrome-bg', val);
          }
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
        default: '#0a0a0a',
        hint: 'Wall color in dark mode (also used for browser chrome)',
        onChange: (g, val) => {
          const root = document.documentElement;
          root.style.setProperty('--frame-color-dark', val);
          // Wall colors automatically updated via CSS: --wall-color-dark: var(--frame-color-dark)
          // Update browser chrome if in dark mode
          if (g.isDarkMode) {
            const meta = document.querySelector('meta[name="theme-color"]');
            if (meta) meta.content = val;
            root.style.setProperty('--chrome-bg', val);
          }
          // Invalidate wall color cache so it picks up the new color immediately
          import('../physics/engine.js').then(mod => {
            mod.syncChromeColor();
          });
        }
      },
      {
        id: 'wallPreset',
        label: 'Wall Preset',
        stateKey: 'wallPreset',
        type: 'select',
        // Preserve insertion order from WALL_PRESETS (curated order in constants.js)
        options: Object.entries(WALL_PRESETS).map(([key, preset]) => ({
          value: key,
          label: preset?.label ? preset.label : key
        })),
        default: 'pudding',
        format: v => String(v),
        onChange: (g, val) => {
          applyWallPreset(String(val), g);
          // UI sync only (no control side-effects like full page reloads).
          syncSlidersToState({ runOnChange: false });

          // Re-init the simulation so the new wall parameters take effect immediately.
          // This resets the current mode without navigating/reloading the page.
          import('../modes/mode-controller.js')
            .then(({ resetCurrentMode }) => resetCurrentMode?.())
            .catch(() => {});

          // IMPORTANT UX: After interacting with a <select>, keyboard mode switching (ArrowLeft/ArrowRight)
          // is intentionally ignored because the key handler skips INPUT/TEXTAREA/SELECT targets.
          // Blur so mode switching resumes immediately after choosing a preset.
          try {
            const el = document.getElementById('wallPresetSelect');
            if (el && typeof el.blur === 'function') el.blur();
            else if (document.activeElement && typeof document.activeElement.blur === 'function') document.activeElement.blur();
          } catch (e) {}
        },
        hint: 'Curated wall “types” that set multiple wall sliders at once.'
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
            import('./gate-overlay.js').then(({ updateBlurFromWallThickness }) => {
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
      
      // Wall Material (Advanced)
      {
        id: 'wallWobbleMaxDeform',
        label: 'Softness (Max Deform)',
        stateKey: 'wallWobbleMaxDeform',
        type: 'range',
        min: 0, max: 150, step: 1,
        default: 45,
        format: v => `${v}px`,
        parse: v => parseInt(v, 10),
        group: 'Material (Advanced)',
        groupCollapsed: true
      },
      {
        id: 'wallWobbleStiffness',
        label: 'Elasticity (Stiffness)',
        stateKey: 'wallWobbleStiffness',
        type: 'range',
        min: 50, max: 3000, step: 10,
        default: 2200,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        group: 'Material (Advanced)'
      },
      {
        id: 'wallWobbleDamping',
        label: 'Damping (Viscosity)',
        stateKey: 'wallWobbleDamping',
        type: 'range',
        min: 0, max: 80, step: 1,
        default: 35,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        group: 'Material (Advanced)'
      },
      {
        id: 'wallWobbleSigma',
        label: 'Blob Size (Spread)',
        stateKey: 'wallWobbleSigma',
        type: 'range',
        min: 0.5, max: 6.0, step: 0.1,
        default: 2.0,
        format: v => v.toFixed(1),
        parse: parseFloat,
        group: 'Material (Advanced)',
        hint: 'Higher = larger, slower blobs (pudding/cloth). Lower = sharp ripples (rubber).'
      },
      {
        id: 'wallWobbleCornerClamp',
        label: 'Corner Grip',
        stateKey: 'wallWobbleCornerClamp',
        type: 'range',
        min: 0.0, max: 1.0, step: 0.01,
        default: 0.6,
        format: v => v.toFixed(2),
        parse: parseFloat,
        group: 'Material (Advanced)'
      },
      {
        id: 'wallWobbleImpactThreshold',
        label: 'Impact Gate',
        stateKey: 'wallWobbleImpactThreshold',
        type: 'range',
        min: 20, max: 200, step: 1,
        default: 140,
        format: v => `${v} px/s`,
        parse: v => parseInt(v, 10),
        group: 'Material (Advanced)',
        hint: 'Minimum impact speed to move the wall.'
      },
      {
        id: 'wallWobbleSettlingSpeed',
        label: 'Settle Speed',
        stateKey: 'wallWobbleSettlingSpeed',
        type: 'range',
        min: 0, max: 100, step: 1,
        default: 75,
        format: v => `${v}%`,
        parse: v => parseInt(v, 10),
        group: 'Material (Advanced)',
        hint: 'How quickly the wall comes to rest (higher = more "thick").'
      },
      {
        id: 'wallDeformPhysicsPrecision',
        label: 'Deformation Physics',
        stateKey: 'wallDeformPhysicsPrecision',
        type: 'range',
        min: 0, max: 100, step: 5,
        default: 50,
        format: v => `${v}%`,
        parse: v => parseInt(v, 10),
        group: 'Material (Advanced)',
        hint: 'How precisely balls interact with deformed wall (0=off, 100=most accurate but slower).'
      },
      {
        id: 'wallWobbleMaxVel',
        label: 'Max Wall Speed (Clamp)',
        stateKey: 'wallWobbleMaxVel',
        type: 'range',
        min: 100, max: 2000, step: 10,
        default: 800,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        group: 'Material (Advanced)',
        hint: 'Caps wobble velocity to prevent erratic spikes (lower = heavier goo).'
      },
      {
        id: 'wallWobbleMaxImpulse',
        label: 'Max Impulse (Clamp)',
        stateKey: 'wallWobbleMaxImpulse',
        type: 'range',
        min: 20, max: 600, step: 5,
        default: 220,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        group: 'Material (Advanced)',
        hint: 'Caps per-sample impact injection (lower = smoother, less bottom chaos).'
      },
      {
        id: 'wallWobbleMaxEnergyPerStep',
        label: 'Max Energy / Tick',
        stateKey: 'wallWobbleMaxEnergyPerStep',
        type: 'range',
        min: 1000, max: 80000, step: 500,
        default: 20000,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        group: 'Material (Advanced)',
        hint: 'Last-resort safety budget to prevent rare runaway spikes (higher = less limiting).'
      },

      // Wall Performance
      {
        id: 'wallPhysicsSamples',
        label: 'Physics Samples',
        stateKey: 'wallPhysicsSamples',
        type: 'range',
        min: 8, max: 96, step: 1,
        default: 48,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        group: 'Performance',
        groupCollapsed: true,
        hint: 'Visual-only. Lower = faster, higher = smoother blobs.'
      },
      {
        id: 'wallPhysicsSkipInactive',
        label: 'Skip When Still',
        stateKey: 'wallPhysicsSkipInactive',
        type: 'toggle',
        default: true,
        group: 'Performance',
        hint: 'Stops integrating the wall when it\'s already at rest.'
      },
      {
        id: 'wallRenderDecimation',
        label: 'Render Detail',
        stateKey: 'wallRenderDecimation',
        type: 'range',
        min: 1, max: 12, step: 1,
        default: 2,
        format: v => `${Math.round(v)}`,
        parse: v => parseInt(v, 10),
        group: 'Performance',
        hint: '1=ultra smooth, 2=default, 4=faster, 12=very fast/polygonal (rendering only).'
      }
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
        default: 0.35,
        format: v => `${Math.round(v * 100)}%`,
        parse: parseFloat,
        group: 'Texture',
        hint: 'How different R/G/B channels are (ignored when Monochrome is on).',
        onChange: (_g, val) => applyNoiseSystem({ noiseChroma: val })
      },
      {
        id: 'noiseSizeBase',
        label: 'Back Scale',
        stateKey: 'noiseSizeBase',
        type: 'range',
        min: 20, max: 400, step: 5,
        default: 100,
        format: v => `${Math.round(v)} px`,
        parse: v => parseInt(v, 10),
        group: 'Layers',
        onChange: (_g, val) => applyNoiseSystem({ noiseSizeBase: val })
      },
      {
        id: 'noiseSizeTop',
        label: 'Front Scale',
        stateKey: 'noiseSizeTop',
        type: 'range',
        min: 20, max: 600, step: 5,
        default: 150,
        format: v => `${Math.round(v)} px`,
        parse: v => parseInt(v, 10),
        group: 'Layers',
        onChange: (_g, val) => applyNoiseSystem({ noiseSizeTop: val })
      },
      {
        id: 'noiseTopOpacity',
        label: 'Top Opacity',
        stateKey: 'noiseTopOpacity',
        type: 'range',
        min: 0, max: 0.25, step: 0.005,
        default: 0.01,
        format: v => v.toFixed(3),
        parse: parseFloat,
        group: 'Layers',
        hint: 'Extra subtle layer (used by .noise-3).',
        onChange: (_g, val) => applyNoiseSystem({ noiseTopOpacity: val })
      },
      {
        id: 'noiseBackOpacity',
        label: 'Back Opacity (Light)',
        stateKey: 'noiseBackOpacity',
        type: 'range',
        min: 0, max: 0.3, step: 0.005,
        default: 0.025,
        format: v => v.toFixed(3),
        parse: parseFloat,
        group: 'Layers',
        onChange: (_g, val) => applyNoiseSystem({ noiseBackOpacity: val })
      },
      {
        id: 'noiseFrontOpacity',
        label: 'Front Opacity (Light)',
        stateKey: 'noiseFrontOpacity',
        type: 'range',
        min: 0, max: 0.3, step: 0.005,
        default: 0.055,
        format: v => v.toFixed(3),
        parse: parseFloat,
        group: 'Layers',
        onChange: (_g, val) => applyNoiseSystem({ noiseFrontOpacity: val })
      },
      {
        id: 'noiseBackOpacityDark',
        label: 'Back Opacity (Dark)',
        stateKey: 'noiseBackOpacityDark',
        type: 'range',
        min: 0, max: 0.5, step: 0.005,
        default: 0.12,
        format: v => v.toFixed(3),
        parse: parseFloat,
        group: 'Layers',
        onChange: (_g, val) => applyNoiseSystem({ noiseBackOpacityDark: val })
      },
      {
        id: 'noiseFrontOpacityDark',
        label: 'Front Opacity (Dark)',
        stateKey: 'noiseFrontOpacityDark',
        type: 'range',
        min: 0, max: 0.5, step: 0.005,
        default: 0.08,
        format: v => v.toFixed(3),
        parse: parseFloat,
        group: 'Layers',
        onChange: (_g, val) => applyNoiseSystem({ noiseFrontOpacityDark: val })
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
        id: 'noiseSpeedBackMs',
        label: 'Back Speed',
        stateKey: 'noiseSpeedBackMs',
        type: 'range',
        min: 0, max: 10000, step: 50,
        default: 1800,
        format: v => `${Math.round(v)} ms`,
        parse: v => parseInt(v, 10),
        group: 'Motion',
        onChange: (_g, val) => applyNoiseSystem({ noiseSpeedBackMs: val })
      },
      {
        id: 'noiseSpeedFrontMs',
        label: 'Front Speed',
        stateKey: 'noiseSpeedFrontMs',
        type: 'range',
        min: 0, max: 10000, step: 50,
        default: 1100,
        format: v => `${Math.round(v)} ms`,
        parse: v => parseInt(v, 10),
        group: 'Motion',
        onChange: (_g, val) => applyNoiseSystem({ noiseSpeedFrontMs: val })
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
    title: 'Critters',
    icon: '🪲',
    mode: 'critters',
    defaultOpen: false,
    controls: [
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

  pitThrows: {
    title: 'Ball Pit (Throws)',
    icon: '🎯',
    mode: 'pit-throws',
    defaultOpen: false,
    controls: [
      {
        id: 'gravityPitThrows',
        label: 'Gravity',
        stateKey: 'gravityMultiplierPit',
        type: 'range',
        min: 0, max: 2, step: 0.05,
        default: 1.1,
        format: v => v.toFixed(2),
        parse: parseFloat,
        onChange: (g, val) => {
          if (g.currentMode === 'pit-throws') g.G = g.GE * val;
        }
      },
      {
        id: 'pitThrowsSpeed',
        label: 'Throw Speed',
        stateKey: 'pitThrowSpeed',
        type: 'range',
        min: 100, max: 2000, step: 25,
        default: 650,
        format: v => String(Math.round(v)),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'pitThrowsSpeedVar',
        label: 'Speed Variance',
        stateKey: 'pitThrowSpeedVar',
        type: 'range',
        min: 0, max: 0.6, step: 0.01,
        default: 0.18,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'sleepVelocityThresholdThrows',
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
        id: 'sleepAngularThresholdThrows',
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
        id: 'timeToSleepThrows',
        label: 'Sleep Time',
        stateKey: 'timeToSleep',
        type: 'range',
        min: 0.05, max: 2.0, step: 0.05,
        default: 0.25,
        format: v => `${Number(v).toFixed(2)}s`,
        parse: parseFloat,
        hint: 'Pit modes only. Lower = sleeps faster.'
      },
      {
        id: 'pitThrowsInterval',
        label: 'Throw Interval',
        stateKey: 'pitThrowIntervalMs',
        type: 'range',
        min: 10, max: 500, step: 5,
        default: 70,
        format: v => `${Math.round(v)}ms`,
        parse: parseFloat
      },
      {
        id: 'pitThrowsColorPause',
        label: 'Color Pause',
        stateKey: 'pitThrowColorPauseMs',
        type: 'range',
        min: 0, max: 1200, step: 10,
        default: 180,
        format: v => `${Math.round(v)}ms`,
        parse: parseFloat
      },
      {
        id: 'pitThrowsPairChance',
        label: 'Pair Chance',
        stateKey: 'pitThrowPairChance',
        type: 'range',
        min: 0, max: 1, step: 0.01,
        default: 0.35,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'pitThrowsPairStagger',
        label: 'Pair Stagger',
        stateKey: 'pitThrowPairStaggerMs',
        type: 'range',
        min: 0, max: 120, step: 1,
        default: 18,
        format: v => `${Math.round(v)}ms`,
        parse: parseFloat
      },
      {
        id: 'pitThrowsBatchSize',
        label: 'Batch Size',
        stateKey: 'pitThrowBatchSize',
        type: 'range',
        min: 1, max: 60, step: 1,
        default: 18,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'pitThrowsTargetYFrac',
        label: 'Throw Aim (Y)',
        stateKey: 'pitThrowTargetYFrac',
        type: 'range',
        min: 0.12, max: 0.7, step: 0.01,
        default: 0.36,
        format: v => v.toFixed(2),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'pitThrowsAngleJitter',
        label: 'Angle Jitter',
        stateKey: 'pitThrowAngleJitter',
        type: 'range',
        min: 0, max: 0.6, step: 0.01,
        default: 0.16,
        format: v => v.toFixed(2),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'pitThrowsSpreadVar',
        label: 'Spread Variance',
        stateKey: 'pitThrowSpreadVar',
        type: 'range',
        min: 0, max: 0.8, step: 0.01,
        default: 0.25,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'pitThrowsSpeedJitter',
        label: 'Speed Jitter',
        stateKey: 'pitThrowSpeedJitter',
        type: 'range',
        min: 0, max: 0.8, step: 0.01,
        default: 0.22,
        format: v => v.toFixed(2),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'pitThrowsInletInset',
        label: 'Inlet Inset',
        stateKey: 'pitThrowInletInset',
        type: 'range',
        min: 0, max: 0.2, step: 0.005,
        default: 0.06,
        format: v => v.toFixed(3),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'pitThrowsSpawnSpread',
        label: 'Spawn Spread',
        stateKey: 'pitThrowSpawnSpread',
        type: 'range',
        min: 0, max: 0.12, step: 0.0025,
        default: 0.02,
        format: v => v.toFixed(4),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'pitThrowsAimJitter',
        label: 'Aim Jitter',
        stateKey: 'pitThrowAimJitter',
        type: 'range',
        min: 0, max: 0.2, step: 0.005,
        default: 0.04,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      {
        id: 'pitThrowsCrossBias',
        label: 'Cross Aim',
        stateKey: 'pitThrowCrossBias',
        type: 'range',
        min: 0, max: 0.3, step: 0.005,
        default: 0.12,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      warmupFramesControl('pitThrowsWarmupFrames')
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
      },
      {
        id: 'weightlessRepelPower',
        label: 'Cursor Blast Power',
        stateKey: 'weightlessRepelPower',
        type: 'range',
        min: 0, max: 600000, step: 10000,
        default: 220000,
        format: v => Math.round(v).toString(),
        parse: parseFloat
      },
      {
        id: 'weightlessRepelSoft',
        label: 'Cursor Blast Falloff',
        stateKey: 'weightlessRepelSoft',
        type: 'range',
        min: 0.5, max: 6.0, step: 0.1,
        default: 2.2,
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
        min: 50, max: 400, step: 10,
        default: 300,
        format: v => String(v),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'waterDrag',
        label: 'Water Resistance',
        stateKey: 'waterDrag',
        type: 'range',
        min: 0.001, max: 0.05, step: 0.001,
        default: 0.015,
        format: v => v.toFixed(3),
        parse: parseFloat
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
        min: 50, max: 500, step: 10,
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
        min: 100, max: 3000, step: 50,
        default: 420,
        format: v => v.toFixed(0),
        parse: parseFloat
      },
      {
        id: 'vortexPull',
        label: 'Radial Pull',
        stateKey: 'vortexRadialPull',
        type: 'range',
        min: 0, max: 2000, step: 20,
        default: 180,
        format: v => v.toFixed(0),
        parse: parseFloat
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
        id: 'vortexRadius',
        label: 'Vortex Radius',
        stateKey: 'vortexRadius',
        type: 'range',
        min: 0, max: 800, step: 20,
        default: 0,
        format: v => v === 0 ? 'Unlimited' : v.toFixed(0) + 'px',
        parse: parseFloat,
        tooltip: 'Maximum effective radius (0 = unlimited, uses distance falloff)'
      },
      {
        id: 'vortexFalloffCurve',
        label: 'Falloff Curve',
        stateKey: 'vortexFalloffCurve',
        type: 'range',
        min: 0.3, max: 3.0, step: 0.1,
        default: 1.0,
        format: v => v.toFixed(1),
        parse: parseFloat,
        tooltip: 'Falloff shape: 1.0 = linear, 2.0 = quadratic (sharper), 0.5 = gentle'
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
        id: 'vortexCoreStrength',
        label: 'Core Strength',
        stateKey: 'vortexCoreStrength',
        type: 'range',
        min: 0.5, max: 3.0, step: 0.1,
        default: 1.0,
        format: v => v.toFixed(1) + 'x',
        parse: parseFloat,
        tooltip: 'Strength multiplier at vortex center'
      },
      {
        id: 'vortexAccelerationZone',
        label: 'Acceleration Zone',
        stateKey: 'vortexAccelerationZone',
        type: 'range',
        min: 0, max: 400, step: 20,
        default: 0,
        format: v => v === 0 ? 'Disabled' : v.toFixed(0) + 'px',
        parse: parseFloat,
        tooltip: 'Radius where extra acceleration occurs (0 = disabled)'
      },
      {
        id: 'vortexOutwardPush',
        label: 'Outward Push',
        stateKey: 'vortexOutwardPush',
        type: 'range',
        min: 0, max: 1000, step: 20,
        default: 0,
        format: v => v === 0 ? 'Disabled' : v.toFixed(0),
        parse: parseFloat,
        tooltip: 'Outward force at edges (only when radius is set)'
      },
      {
        id: 'vortexDrag',
        label: 'Drag',
        stateKey: 'vortexDrag',
        type: 'range',
        min: 0.001, max: 0.05, step: 0.001,
        default: 0.005,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      warmupFramesControl('vortexWarmupFrames')
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
        min: 200, max: 1600, step: 50,
        default: 800,
        format: v => v.toFixed(0),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'pingPongVerticalDamp',
        label: 'Vertical Damping',
        stateKey: 'pingPongVerticalDamp',
        type: 'range',
        min: 0.8, max: 0.999, step: 0.001,
        default: 0.995,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      warmupFramesControl('pingPongWarmupFrames')
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
      },
      {
        id: 'magneticDamping',
        label: 'Damping',
        stateKey: 'magneticDamping',
        type: 'range',
        min: 0.8, max: 0.999, step: 0.001,
        default: 0.98,
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
    mode: 'kaleidoscope',
    defaultOpen: false,
    controls: [
      {
        id: 'kaleiBallCount',
        label: 'Ball Count',
        stateKey: 'kaleidoscopeBallCount',
        type: 'range',
        min: 15, max: 120, step: 1,
        default: 23,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'kaleiWedges',
        label: 'Wedges',
        stateKey: 'kaleidoscopeWedges',
        type: 'range',
        min: 4, max: 16, step: 1,
        default: 12,
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
        stateKey: 'kaleidoscopeSpeed',
        type: 'range',
        min: 0.2, max: 2.0, step: 0.05,
        default: 1.0,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'kaleiDotSizeVh',
        label: 'Dot Size (vh)',
        stateKey: 'kaleidoscopeDotSizeVh',
        type: 'range',
        min: 0.2, max: 2.5, step: 0.05,
        default: 0.95,
        format: v => v.toFixed(2) + 'vh',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kaleiDotAreaMul',
        label: 'Dot Area',
        stateKey: 'kaleidoscopeDotAreaMul',
        type: 'range',
        min: 0.3, max: 1.5, step: 0.05,
        default: 0.7,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kaleiSpawnArea',
        label: 'Spawn Density',
        stateKey: 'kaleidoscopeSpawnAreaMul',
        type: 'range',
        min: 0.2, max: 2.0, step: 0.05,
        default: 1.0,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kaleiSizeVar',
        label: 'Size Variance',
        stateKey: 'kaleidoscopeSizeVariance',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.3,
        format: v => (v * 100).toFixed(0) + '%',
        parse: parseFloat,
        reinitMode: true
      },
      warmupFramesControl('kaleidoscopeWarmupFrames')
    ]
  },

  kaleidoscope1: {
    title: 'Kaleidoscope I (Variant)',
    icon: '🪞',
    mode: 'kaleidoscope-1',
    defaultOpen: false,
    controls: [
      {
        id: 'kalei1BallCount',
        label: 'Ball Count',
        stateKey: 'kaleidoscope1BallCount',
        type: 'range',
        min: 6, max: 180, step: 1,
        default: 18,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'kalei1Wedges',
        label: 'Wedges',
        stateKey: 'kaleidoscope1Wedges',
        type: 'range',
        min: 3, max: 24, step: 1,
        default: 8,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'kalei1Speed',
        label: 'Speed',
        stateKey: 'kaleidoscope1Speed',
        type: 'range',
        min: 0.2, max: 2.0, step: 0.05,
        default: 0.8,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'kalei1DotSizeVh',
        label: 'Dot Size (vh)',
        stateKey: 'kaleidoscope1DotSizeVh',
        type: 'range',
        min: 0.2, max: 2.5, step: 0.05,
        default: 0.95,
        format: v => v.toFixed(2) + 'vh',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kalei1DotAreaMul',
        label: 'Dot Area',
        stateKey: 'kaleidoscope1DotAreaMul',
        type: 'range',
        min: 0.3, max: 1.5, step: 0.05,
        default: 0.7,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kalei1SpawnArea',
        label: 'Spawn Density',
        stateKey: 'kaleidoscope1SpawnAreaMul',
        type: 'range',
        min: 0.2, max: 2.0, step: 0.05,
        default: 1.0,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kalei1SizeVar',
        label: 'Size Variance',
        stateKey: 'kaleidoscope1SizeVariance',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.3,
        format: v => (v * 100).toFixed(0) + '%',
        parse: parseFloat,
        reinitMode: true
      },
      warmupFramesControl('kaleidoscope1WarmupFrames')
    ]
  },

  kaleidoscope2: {
    title: 'Kaleidoscope II (Variant)',
    icon: '🪞',
    mode: 'kaleidoscope-2',
    defaultOpen: false,
    controls: [
      {
        id: 'kalei2BallCount',
        label: 'Ball Count',
        stateKey: 'kaleidoscope2BallCount',
        type: 'range',
        min: 10, max: 260, step: 2,
        default: 36,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'kalei2Wedges',
        label: 'Wedges',
        stateKey: 'kaleidoscope2Wedges',
        type: 'range',
        min: 3, max: 24, step: 1,
        default: 8,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'kalei2Speed',
        label: 'Speed',
        stateKey: 'kaleidoscope2Speed',
        type: 'range',
        min: 0.2, max: 2.0, step: 0.05,
        default: 1.15,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'kalei2DotSizeVh',
        label: 'Dot Size (vh)',
        stateKey: 'kaleidoscope2DotSizeVh',
        type: 'range',
        min: 0.2, max: 2.5, step: 0.05,
        default: 0.95,
        format: v => v.toFixed(2) + 'vh',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kalei2DotAreaMul',
        label: 'Dot Area',
        stateKey: 'kaleidoscope2DotAreaMul',
        type: 'range',
        min: 0.3, max: 1.5, step: 0.05,
        default: 0.7,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kalei2SpawnArea',
        label: 'Spawn Density',
        stateKey: 'kaleidoscope2SpawnAreaMul',
        type: 'range',
        min: 0.2, max: 2.0, step: 0.05,
        default: 1.0,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kalei2SizeVar',
        label: 'Size Variance',
        stateKey: 'kaleidoscope2SizeVariance',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.3,
        format: v => (v * 100).toFixed(0) + '%',
        parse: parseFloat,
        reinitMode: true
      },
      warmupFramesControl('kaleidoscope2WarmupFrames')
    ]
  },

  kaleidoscope3: {
    title: 'Kaleidoscope III (Variant)',
    icon: '🪞',
    mode: 'kaleidoscope-3',
    defaultOpen: false,
    controls: [
      {
        id: 'kalei3BallCount',
        label: 'Ball Count',
        stateKey: 'kaleidoscope3BallCount',
        type: 'range',
        min: 12, max: 300, step: 3,
        default: 54,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'kalei3Wedges',
        label: 'Wedges',
        stateKey: 'kaleidoscope3Wedges',
        type: 'range',
        min: 3, max: 24, step: 1,
        default: 8,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10)
      },
      {
        id: 'kalei3Speed',
        label: 'Speed',
        stateKey: 'kaleidoscope3Speed',
        type: 'range',
        min: 0.2, max: 2.0, step: 0.05,
        default: 1.55,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'kalei3DotSizeVh',
        label: 'Dot Size (vh)',
        stateKey: 'kaleidoscope3DotSizeVh',
        type: 'range',
        min: 0.2, max: 2.5, step: 0.05,
        default: 0.95,
        format: v => v.toFixed(2) + 'vh',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kalei3DotAreaMul',
        label: 'Dot Area',
        stateKey: 'kaleidoscope3DotAreaMul',
        type: 'range',
        min: 0.3, max: 1.5, step: 0.05,
        default: 0.7,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kalei3SpawnArea',
        label: 'Spawn Density',
        stateKey: 'kaleidoscope3SpawnAreaMul',
        type: 'range',
        min: 0.2, max: 2.0, step: 0.05,
        default: 1.0,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'kalei3SizeVar',
        label: 'Size Variance',
        stateKey: 'kaleidoscope3SizeVariance',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0.3,
        format: v => (v * 100).toFixed(0) + '%',
        parse: parseFloat,
        reinitMode: true
      },
      warmupFramesControl('kaleidoscope3WarmupFrames')
    ]
  },

  orbit3d: {
    title: 'Orbit 3D: Zero Gravity',
    icon: '🌪️',
    mode: 'orbit-3d',
    defaultOpen: false,
    controls: [
      {
        id: 'orbit3dMoonCount',
        label: 'Body Count',
        stateKey: 'orbit3dMoonCount',
        type: 'range',
        min: 10, max: 200, step: 10,
        default: 80,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'orbit3dGravity',
        label: 'Gravity Pull',
        stateKey: 'orbit3dGravity',
        type: 'range',
        min: 1000, max: 10000, step: 500,
        default: 5000,
        format: v => Math.round(v),
        parse: parseFloat
      },
      {
        id: 'orbit3dVelocityMult',
        label: 'Orbital Speed',
        stateKey: 'orbit3dVelocityMult',
        type: 'range',
        min: 50, max: 300, step: 10,
        default: 150,
        format: v => Math.round(v),
        parse: parseFloat
      },
      {
        id: 'orbit3dDepthScale',
        label: 'Depth Effect',
        stateKey: 'orbit3dDepthScale',
        type: 'range',
        min: 0, max: 1.5, step: 0.1,
        default: 0.8,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      {
        id: 'orbit3dDamping',
        label: 'Stability',
        stateKey: 'orbit3dDamping',
        type: 'range',
        min: 0.005, max: 0.05, step: 0.005,
        default: 0.02,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      {
        id: 'sizeVariationOrbit3d',
        label: 'Size Variation',
        stateKey: 'sizeVariationOrbit3d',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0,
        format: v => v.toFixed(2),
        parse: parseFloat,
        reinitMode: true
      },
      warmupFramesControl('orbit3dWarmupFrames')
    ]
  },
  orbit3d2: {
    title: 'Orbit 3D (Tight Swarm)',
    icon: '🌪️',
    mode: 'orbit-3d-2',
    defaultOpen: false,
    controls: [
      {
        id: 'orbit3d2MoonCount',
        label: 'Moon Count',
        stateKey: 'orbit3d2MoonCount',
        type: 'range',
        min: 20, max: 200, step: 10,
        default: 100,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'orbit3d2Gravity',
        label: 'Gravity (G×M)',
        stateKey: 'orbit3d2Gravity',
        type: 'range',
        min: 10000, max: 300000, step: 10000,
        default: 80000,
        format: v => `${Math.round(v / 1000)}k`,
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'orbit3d2VelocityMult',
        label: 'Initial Velocity',
        stateKey: 'orbit3d2VelocityMult',
        type: 'range',
        min: 0.5, max: 1.5, step: 0.05,
        default: 1.1,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'orbit3d2MinOrbit',
        label: 'Min Orbit (vw)',
        stateKey: 'orbit3d2MinOrbit',
        type: 'range',
        min: 2, max: 15, step: 1,
        default: 4,
        format: v => v + 'vw',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'orbit3d2MaxOrbit',
        label: 'Max Orbit (vw)',
        stateKey: 'orbit3d2MaxOrbit',
        type: 'range',
        min: 3, max: 25, step: 1,
        default: 12,
        format: v => v + 'vw',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'orbit3d2DepthScale',
        label: 'Depth Effect',
        stateKey: 'orbit3d2DepthScale',
        type: 'range',
        min: 0, max: 0.8, step: 0.05,
        default: 0.6,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'orbit3d2Damping',
        label: 'Damping',
        stateKey: 'orbit3d2Damping',
        type: 'range',
        min: 0, max: 0.2, step: 0.005,
        default: 0.01,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      {
        id: 'orbit3d2FollowSmoothing',
        label: 'Cursor Follow Speed',
        stateKey: 'orbit3d2FollowSmoothing',
        type: 'range',
        min: 1, max: 200, step: 1,
        default: 40,
        format: v => Math.round(v),
        parse: parseFloat
      },
      {
        id: 'orbit3d2Softening',
        label: 'Gravity Softening',
        stateKey: 'orbit3d2Softening',
        type: 'range',
        min: 1, max: 100, step: 1,
        default: 15,
        format: v => Math.round(v),
        parse: parseFloat
      },
      {
        id: 'sizeVariationOrbit3d2',
        label: 'Size Variation',
        stateKey: 'sizeVariationOrbit3d2',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0,
        format: v => v.toFixed(2),
        parse: parseFloat,
        reinitMode: true
      },
      warmupFramesControl('orbit3d2WarmupFrames')
    ]
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // LATTICE — Crystal structure from chaos
  // ═══════════════════════════════════════════════════════════════════════════
  lattice: {
    title: 'Crystal Lattice',
    icon: '💎',
    mode: 'lattice',
    defaultOpen: false,
    controls: [
      {
        id: 'sizeVariationLattice',
        label: 'Size Variation',
        stateKey: 'sizeVariationLattice',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0,
        format: v => v.toFixed(2),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'latticeSpacingVw',
        label: 'Spacing (vw)',
        stateKey: 'latticeSpacingVw',
        type: 'range',
        min: 1, max: 20, step: 0.25,
        default: 8.5,
        format: v => v.toFixed(2) + 'vw',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'latticeStiffness',
        label: 'Stiffness',
        stateKey: 'latticeStiffness',
        type: 'range',
        min: 0, max: 10, step: 0.1,
        default: 2.2,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      {
        id: 'latticeDamping',
        label: 'Damping',
        stateKey: 'latticeDamping',
        type: 'range',
        min: 0.5, max: 1.0, step: 0.01,
        default: 0.92,
        format: v => v.toFixed(2),
        parse: parseFloat
      },
      {
        id: 'latticeDisruptRadius',
        label: 'Mesh Stretch Radius',
        stateKey: 'latticeDisruptRadius',
        type: 'range',
        min: 50, max: 1000, step: 25,
        default: 600,
        format: v => String(Math.round(v)) + 'px',
        parse: parseFloat
      },
      {
        id: 'latticeDisruptPower',
        label: 'Mesh Stretch Power',
        stateKey: 'latticeDisruptPower',
        type: 'range',
        min: 0, max: 50, step: 1,
        default: 25.0,
        format: v => v.toFixed(1),
        parse: parseFloat
      },
      {
        id: 'latticeMeshWaveStrength',
        label: 'Wave Amplitude',
        stateKey: 'latticeMeshWaveStrength',
        type: 'range',
        min: 0, max: 50, step: 1,
        default: 12.0,
        format: v => String(Math.round(v)) + 'px',
        parse: parseFloat
      },
      {
        id: 'latticeMeshWaveSpeed',
        label: 'Wave Speed',
        stateKey: 'latticeMeshWaveSpeed',
        type: 'range',
        min: 0, max: 3.0, step: 0.1,
        default: 0.8,
        format: v => v.toFixed(1) + 'x',
        parse: parseFloat
      },
      {
        id: 'latticeAlignment',
        label: 'Grid Alignment',
        stateKey: 'latticeAlignment',
        type: 'select',
        options: [
          { value: 'center', label: 'Center (Fill)' },
          { value: 'top-left', label: 'Top-Left' },
          { value: 'top-center', label: 'Top-Center' },
          { value: 'top-right', label: 'Top-Right' }
        ],
        default: 'center',
        format: v => String(v),
        parse: v => String(v),
        reinitMode: true
      },
      warmupFramesControl('latticeWarmupFrames')
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
        min: 8, max: 260, step: 1,
        default: 80,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'sizeVariationNeural',
        label: 'Size Variation',
        stateKey: 'sizeVariationNeural',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0,
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
        default: 420,
        format: v => String(Math.round(v)),
        parse: parseFloat
      },
      {
        id: 'neuralDamping',
        label: 'Damping',
        stateKey: 'neuralDamping',
        type: 'range',
        min: 0.8, max: 1.0, step: 0.005,
        default: 0.985,
        format: v => v.toFixed(3),
        parse: parseFloat
      },
      {
        id: 'neuralCohesion',
        label: 'Cohesion',
        stateKey: 'neuralCohesion',
        type: 'range',
        min: 0, max: 1.0, step: 0.01,
        default: 0.18,
        format: v => v.toFixed(2),
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
        min: 0.2, max: 3.0, step: 0.05,
        default: 1.35,
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
        default: 1.35,
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
      warmupFramesControl('parallaxLinearWarmupFrames')
    ]
  },

  parallaxPerspective: {
    title: 'Parallax (Perspective)',
    icon: '🫧',
    mode: 'parallax-perspective',
    defaultOpen: false,
    controls: [
      {
        id: 'parallaxPerspectivePreset',
        label: 'Preset',
        stateKey: 'parallaxPerspectivePreset',
        type: 'select',
        options: Object.keys(PARALLAX_PERSPECTIVE_PRESETS).map(k => ({ value: k, label: PARALLAX_PERSPECTIVE_PRESETS[k].label })),
        default: 'default',
        format: v => PARALLAX_PERSPECTIVE_PRESETS[v]?.label || v,
        onChange: (value) => {
          applyParallaxPerspectivePreset(value, true);
        }
      },
      {
        id: 'parallaxPerspectiveRandomness',
        label: 'Randomness',
        stateKey: 'parallaxPerspectiveRandomness',
        type: 'range',
        min: 0, max: 1.0, step: 0.05,
        default: 0.6,
        format: v => v.toFixed(2),
        parse: parseFloat,
        reinitMode: true,
        hint: '0 = perfect grid. 1 = full jitter from grid vertices.'
      },
      {
        id: 'parallaxPerspectiveDotSizeMul',
        label: 'Dot Size',
        stateKey: 'parallaxPerspectiveDotSizeMul',
        type: 'range',
        min: 0.2, max: 6.0, step: 0.1,
        default: 1.8,
        format: v => v.toFixed(1) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'sizeVariationParallaxPerspective',
        label: 'Size Variation',
        stateKey: 'sizeVariationParallaxPerspective',
        type: 'range',
        min: 0, max: 1, step: 0.05,
        default: 0,
        format: v => v.toFixed(2),
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'parallaxPerspectiveGridX',
        label: 'Grid X (Cols)',
        stateKey: 'parallaxPerspectiveGridX',
        type: 'range',
        min: 3, max: 50, step: 1,
        default: 16,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxPerspectiveGridY',
        label: 'Grid Y (Rows)',
        stateKey: 'parallaxPerspectiveGridY',
        type: 'range',
        min: 3, max: 50, step: 1,
        default: 12,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxPerspectiveGridZ',
        label: 'Grid Z (Layers)',
        stateKey: 'parallaxPerspectiveGridZ',
        type: 'range',
        min: 2, max: 25, step: 1,
        default: 8,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxPerspectiveSpanX',
        label: 'Span X',
        stateKey: 'parallaxPerspectiveSpanX',
        type: 'range',
        min: 0.2, max: 3.0, step: 0.05,
        default: 1.45,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'parallaxPerspectiveSpanY',
        label: 'Span Y',
        stateKey: 'parallaxPerspectiveSpanY',
        type: 'range',
        min: 0.2, max: 3.0, step: 0.05,
        default: 1.45,
        format: v => v.toFixed(2) + '×',
        parse: parseFloat,
        reinitMode: true
      },
      {
        id: 'parallaxPerspectiveZNear',
        label: 'Z Near',
        stateKey: 'parallaxPerspectiveZNear',
        type: 'range',
        min: 10, max: 1200, step: 10,
        default: 40,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxPerspectiveZFar',
        label: 'Z Far',
        stateKey: 'parallaxPerspectiveZFar',
        type: 'range',
        min: 50, max: 4000, step: 50,
        default: 1200,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10),
        reinitMode: true
      },
      {
        id: 'parallaxPerspectiveFocalLength',
        label: 'Focal Length',
        stateKey: 'parallaxPerspectiveFocalLength',
        type: 'range',
        min: 80, max: 2000, step: 10,
        default: 420,
        format: v => `${Math.round(v)}px`,
        parse: v => parseInt(v, 10)
      },
      {
        id: 'parallaxPerspectiveParallaxStrength',
        label: 'Parallax Strength',
        stateKey: 'parallaxPerspectiveParallaxStrength',
        type: 'range',
        min: 0, max: 2000, step: 10,
        default: 280,
        format: v => String(Math.round(v)),
        parse: v => parseInt(v, 10)
      },
      warmupFramesControl('parallaxPerspectiveWarmupFrames')
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
        default: 200,
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
      <div class="control-row" data-control-id="${control.id}">
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
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
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
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
          <span class="control-value" id="${valId}">${safeFormat(control, control.default)}</span>
        </div>
        <select id="${sliderId}" class="control-select" aria-label="${control.label}">
          ${optionsHtml}
        </select>
      </label>
      ${hintHtml}`;
  }

  // Checkbox type
  if (control.type === 'checkbox') {
    const checkedAttr = control.default ? 'checked' : '';
    return `
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
          <span class="control-value" id="${valId}">${control.default ? 'On' : 'Off'}</span>
        </div>
        <input type="checkbox" id="${sliderId}" ${checkedAttr} aria-label="${control.label}">
      </label>
      ${control.hint ? `<p class="control-hint">${control.hint}</p>` : ''}`;
  }
  
  // Default: range slider
  const hintHtml = control.hint ? `<p class="control-hint">${control.hint}</p>` : '';
  
  return `
      <label class="control-row" data-control-id="${control.id}">
        <div class="control-row-header">
          <span class="control-label">${control.label}</span>
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
  let lastCategory = null;
  
  for (const key of MASTER_SECTION_KEYS) {
    if (!CONTROL_SECTIONS[key]) continue;
    
    const currentCategory = SECTION_CATEGORIES[key] || null;
    
    // Add category label and separator if category changed
    if (currentCategory && currentCategory !== lastCategory) {
      if (lastCategory !== null) {
        // Close previous category group with separator
        html += '</div>';
      }
      // Open new category group with label
      html += `
        <div class="panel-category-group">
          <div class="panel-category-label">${currentCategory}</div>`;
      lastCategory = currentCategory;
    } else if (!currentCategory && lastCategory !== null) {
      // Close category group if transitioning to uncategorized
      html += '</div>';
      lastCategory = null;
    }
    
    html += generateSectionHTML(key, CONTROL_SECTIONS[key]);
  }
  
  // Close final category group if open
  if (lastCategory !== null) {
    html += '</div>';
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
              'critters': '🪲',
              'flies': '🕊️',
              'pit-throws': '🎯',
              'water': '🌊',
              'vortex': '🌀',
              'magnetic': '🧲',
              'ping-pong': '🏓',
              'weightless': '🌌',
              'kaleidoscope': '🪞',
              'kaleidoscope-1': '🪞',
              'kaleidoscope-2': '🪞',
              'kaleidoscope-3': '🪞',
              'orbit-3d': '🌪️',
              'orbit-3d-2': '🌪️',
              'lattice': '💎',
              'neural': '🧠'
            };
            const modeLabels = {
              'pit': 'Pit',
              'bubbles': 'Bubbles',
              'critters': 'Critters',
              'flies': 'Flies',
              'pit-throws': 'Throws',
              'water': 'Water',
              'vortex': 'Vortex',
              'magnetic': 'Magnet',
              'ping-pong': 'Pong',
              'weightless': 'Zero-G',
              'kaleidoscope': 'Kalei',
              'kaleidoscope-1': 'Kalei I',
              'kaleidoscope-2': 'Kalei II',
              'kaleidoscope-3': 'Kalei III',
              'orbit-3d': 'Orbit',
              'orbit-3d-2': 'Swarm',
              'lattice': 'Lattice',
              'neural': 'Neural'
            };
            let buttons = '';
            NARRATIVE_MODE_SEQUENCE.forEach((mode) => {
              const modeKey = mode;
              const icon = modeIcons[modeKey] || '⚪';
              const label = modeLabels[modeKey] || modeKey;
              buttons += `<button class="mode-button" data-mode="${modeKey}" aria-label="${NARRATIVE_CHAPTER_TITLES[mode] || label} mode">${icon} ${label}</button>`;
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
    <div class="panel-section panel-section--action">
      <button id="saveRuntimeConfigBtn" class="primary">💾 Save Config</button>
    </div>
    <div class="panel-footer">
      <kbd>R</kbd> reset · <kbd>/</kbd> panel · <kbd>9</kbd> kalei · Critters + Throws have no key (yet)
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
          // Start from src if valid, otherwise base.
          const raw = Array.isArray(src) ? src : base;
          const out = [];
          const used = new Set();

          // Collect preferred indices in order.
          for (let i = 0; i < labels.length; i++) {
            const label = String(labels[i] || '').trim();
            const key = normalizeLabel(label);
            const incoming = raw.find(r => normalizeLabel(r?.label) === key) || map.get(key) || { label };
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
            'pit-throws': null,
            flies: g.fliesBallCount,
            weightless: g.weightlessCount,
            water: g.waterBallCount,
            vortex: g.vortexBallCount,
            'ping-pong': g.pingPongBallCount,
            magnetic: g.magneticBallCount,
            bubbles: g.bubblesMaxCount,
            kaleidoscope: g.kaleidoscopeBallCount,
            'kaleidoscope-1': g.kaleidoscope1BallCount,
            'kaleidoscope-2': g.kaleidoscope2BallCount,
            'kaleidoscope-3': g.kaleidoscope3BallCount,
            critters: g.critterCount,
            neural: g.neuralBallCount,
            lattice: g.latticeBallCount,
            orbit3d: g.orbit3dMoonCount,
            orbit3d2: g.orbit3d2MoonCount
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
            autoSaveSettings();
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
              autoSaveSettings();
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
              autoSaveSettings();
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
          
          autoSaveSettings();
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
          
          autoSaveSettings();
        });
        
        continue;
      }

      // Checkbox binding
      if (control.type === 'checkbox') {
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
        
        // Re-init mode if needed (see note above)
        if (control.reinitMode && g.currentMode === section.mode) {
          import('../modes/mode-controller.js')
            .then(({ resetCurrentMode }) => resetCurrentMode?.())
            .catch(() => {});
        }
        
        autoSaveSettings();
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
        if (control.type === 'checkbox') {
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
