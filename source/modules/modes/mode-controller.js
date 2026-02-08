// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           MODE CONTROLLER                                   ║
// ║     Daily-mode-first runtime with lazy-loaded simulation modules             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { MODES, NARRATIVE_MODE_SEQUENCE } from '../core/constants.js';
import { setMode as setModeState, getGlobals } from '../core/state.js';
import { resize } from '../rendering/renderer.js';
import { announceToScreenReader } from '../utils/accessibility.js';
import { maybeAutoPickCursorColor } from '../visual/colors.js';
import { resetPhysicsAccumulator } from '../physics/engine.js';
import { resetAdaptiveThrottle } from '../rendering/loop.js';

export { MODES };

const MODE_NAMES = {
  pit: 'Ball Pit',
  flies: 'Flies to Light',
  weightless: 'Zero Gravity',
  water: 'Water Swimming',
  magnetic: 'Magnetic',
  bubbles: 'Carbonated Bubbles',
  'kaleidoscope-3': 'Kaleidoscope',
  critters: 'Hive',
  'parallax-linear': 'Parallax (Linear)',
  'parallax-float': 'Parallax (Float)',
  '3d-sphere': '3D Sphere',
  '3d-cube': '3D Cube',
  'starfield-3d': '3D Starfield',
  'elastic-center': 'Elastic Center',
  'particle-fountain': 'Particle Fountain'
};

const MODE_REGISTRY = {
  [MODES.PIT]: {
    load: () => import('./ball-pit.js'),
    hooks: { initialize: 'initializeBallPit', force: 'applyBallPitForces' }
  },
  [MODES.FLIES]: {
    load: () => import('./flies.js'),
    hooks: { initialize: 'initializeFlies', force: 'applyFliesForces' }
  },
  [MODES.WEIGHTLESS]: {
    load: () => import('./weightless.js'),
    hooks: { initialize: 'initializeWeightless', force: 'applyWeightlessForces' }
  },
  [MODES.WATER]: {
    load: () => import('./water.js'),
    hooks: {
      initialize: 'initializeWater',
      force: 'applyWaterForces',
      update: 'updateWaterRipples'
    }
  },
  [MODES.MAGNETIC]: {
    load: () => import('./magnetic.js'),
    hooks: {
      initialize: 'initializeMagnetic',
      force: 'applyMagneticForces',
      update: 'updateMagnetic'
    }
  },
  [MODES.BUBBLES]: {
    load: () => import('./bubbles.js'),
    hooks: {
      initialize: 'initializeBubbles',
      force: 'applyBubblesForces',
      update: 'updateBubbles'
    }
  },
  [MODES.KALEIDOSCOPE]: {
    load: () => import('./kaleidoscope.js'),
    hooks: {
      initialize: 'initializeKaleidoscope',
      force: 'applyKaleidoscopeForces',
      render: 'renderKaleidoscope',
      bounds: 'applyKaleidoscopeBounds'
    }
  },
  [MODES.CRITTERS]: {
    load: () => import('./critters.js'),
    hooks: {
      initialize: 'initializeCritters',
      force: 'applyCrittersForces',
      update: 'updateCrittersGrid',
      preRender: 'renderCrittersWaypoints'
    }
  },
  [MODES.PARALLAX_LINEAR]: {
    load: () => import('./parallax-linear.js'),
    hooks: {
      initialize: 'initializeParallaxLinear',
      force: 'applyParallaxLinearForces',
      update: 'updateParallaxLinearMouse'
    }
  },
  [MODES.PARALLAX_FLOAT]: {
    load: () => import('./parallax-float.js'),
    hooks: {
      initialize: 'initializeParallaxFloat',
      force: 'applyParallaxFloatForces',
      update: 'updateParallaxFloatMouse'
    }
  },
  [MODES.SPHERE_3D]: {
    load: () => import('./3d-sphere.js'),
    hooks: { initialize: 'initialize3DSphere', force: 'apply3DSphereForces' }
  },
  [MODES.CUBE_3D]: {
    load: () => import('./3d-cube.js'),
    hooks: { initialize: 'initialize3DCube', force: 'apply3DCubeForces' }
  },
  [MODES.STARFIELD_3D]: {
    load: () => import('./starfield-3d.js'),
    hooks: {
      initialize: 'initializeStarfield3D',
      force: 'applyStarfield3DForces',
      update: 'updateStarfield3D',
      preRender: 'renderStarfield3D'
    }
  },
  [MODES.ELASTIC_CENTER]: {
    load: () => import('./elastic-center.js'),
    hooks: {
      initialize: 'initializeElasticCenter',
      force: 'applyElasticCenterForces',
      update: 'updateElasticCenter'
    }
  },
  [MODES.PARTICLE_FOUNTAIN]: {
    load: () => import('./particle-fountain.js'),
    hooks: {
      initialize: 'initializeParticleFountain',
      force: 'applyParticleFountainForces',
      update: 'updateParticleFountain'
    }
  }
};

const modeRuntimeCache = new Map();
const modeLoadPromises = new Map();
let preloadAllStarted = false;
let modeChangeToken = 0;

function toFn(module, key) {
  if (!key) return null;
  const candidate = module?.[key];
  return typeof candidate === 'function' ? candidate : null;
}

function buildModeRuntime(module, hooks = {}) {
  return {
    initialize: toFn(module, hooks.initialize),
    force: toFn(module, hooks.force),
    update: toFn(module, hooks.update),
    preRender: toFn(module, hooks.preRender),
    postRender: toFn(module, hooks.postRender),
    customRender: toFn(module, hooks.render),
    bounds: toFn(module, hooks.bounds)
  };
}

async function ensureModeRuntime(mode) {
  const entry = MODE_REGISTRY[mode];
  if (!entry) return null;

  if (modeRuntimeCache.has(mode)) {
    return modeRuntimeCache.get(mode);
  }

  if (modeLoadPromises.has(mode)) {
    return modeLoadPromises.get(mode);
  }

  const loadPromise = entry.load()
    .then((module) => {
      const runtime = buildModeRuntime(module, entry.hooks);
      modeRuntimeCache.set(mode, runtime);
      modeLoadPromises.delete(mode);
      return runtime;
    })
    .catch((error) => {
      modeLoadPromises.delete(mode);
      console.warn(`[ModeLoader] Failed to load "${mode}"`, error);
      return null;
    });

  modeLoadPromises.set(mode, loadPromise);
  return loadPromise;
}

function maybePreloadAllModes() {
  const globals = getGlobals();
  if (globals.featureLazyModeLoadingEnabled !== false || preloadAllStarted) return;
  preloadAllStarted = true;

  const modes = Object.keys(MODE_REGISTRY);
  for (let i = 0; i < modes.length; i++) {
    const mode = modes[i];
    void ensureModeRuntime(mode);
  }
}

function getWarmupFramesForMode(mode, globals) {
  // Per-simulation warmup frames (render-frame units).
  // Default is 10 everywhere unless overridden via config/panel.
  switch (mode) {
    case MODES.PIT: return globals.pitWarmupFrames ?? 10;
    case MODES.FLIES: return globals.fliesWarmupFrames ?? 10;
    case MODES.WEIGHTLESS: return globals.weightlessWarmupFrames ?? 10;
    case MODES.WATER: return globals.waterWarmupFrames ?? 10;
    case MODES.MAGNETIC: return globals.magneticWarmupFrames ?? 10;
    case MODES.BUBBLES: return globals.bubblesWarmupFrames ?? 10;
    case MODES.KALEIDOSCOPE: return globals.kaleidoscope3WarmupFrames ?? globals.kaleidoscopeWarmupFrames ?? 10;
    case MODES.CRITTERS: return globals.crittersWarmupFrames ?? 10;
    case MODES.SPHERE_3D: return globals.sphere3dWarmupFrames ?? 10;
    case MODES.CUBE_3D: return globals.cube3dWarmupFrames ?? 10;
    case MODES.PARALLAX_LINEAR: return globals.parallaxLinearWarmupFrames ?? 10;
    case MODES.PARALLAX_FLOAT: return globals.parallaxFloatWarmupFrames ?? 10;
    case MODES.STARFIELD_3D: return globals.starfield3dWarmupFrames ?? 10;
    case MODES.ELASTIC_CENTER: return globals.elasticCenterWarmupFrames ?? 10;
    case MODES.PARTICLE_FOUNTAIN: return globals.particleFountainWarmupFrames ?? 0;
    default: return 10;
  }
}

function applyModePhysicsState(mode, globals) {
  const zeroGravityModes = new Set([
    MODES.FLIES,
    MODES.WEIGHTLESS,
    MODES.WATER,
    MODES.MAGNETIC,
    MODES.BUBBLES,
    MODES.KALEIDOSCOPE,
    MODES.SPHERE_3D,
    MODES.CUBE_3D,
    MODES.CRITTERS,
    MODES.PARALLAX_LINEAR,
    MODES.PARALLAX_FLOAT,
    MODES.STARFIELD_3D,
    MODES.ELASTIC_CENTER
  ]);

  if (mode === MODES.PIT) {
    globals.gravityMultiplier = globals.gravityMultiplierPit;
    globals.G = globals.GE * globals.gravityMultiplier;
    globals.repellerEnabled = true;
    return;
  }

  if (mode === MODES.PARTICLE_FOUNTAIN) {
    globals.gravityMultiplier = globals.particleFountainGravityMultiplier || 1.0;
    globals.G = globals.GE * globals.gravityMultiplier;
    globals.repellerEnabled = true;
    return;
  }

  if (zeroGravityModes.has(mode)) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
  }
}

function restoreCrittersOverridesIfNeeded(globals, nextMode) {
  if (globals.currentMode !== MODES.CRITTERS || nextMode === MODES.CRITTERS) return;

  if (globals._restBeforeCritters !== undefined) {
    globals.REST = globals._restBeforeCritters;
    delete globals._restBeforeCritters;
  }
  if (globals._frictionBeforeCritters !== undefined) {
    globals.FRICTION = globals._frictionBeforeCritters;
    delete globals._frictionBeforeCritters;
  }
  if (globals._ballSpacingBeforeCritters !== undefined) {
    globals.ballSpacing = globals._ballSpacingBeforeCritters;
    delete globals._ballSpacingBeforeCritters;
  }
}

function applyCrittersOverridesIfNeeded(globals, mode) {
  if (mode !== MODES.CRITTERS) return;
  if (globals._restBeforeCritters === undefined) globals._restBeforeCritters = globals.REST;
  if (globals._frictionBeforeCritters === undefined) globals._frictionBeforeCritters = globals.FRICTION;
  if (globals._ballSpacingBeforeCritters === undefined) globals._ballSpacingBeforeCritters = globals.ballSpacing;

  globals.REST = globals.critterRestitution ?? globals.REST;
  globals.FRICTION = globals.critterFriction ?? globals.FRICTION;
  globals.ballSpacing = Math.min(globals.ballSpacing || 0, 1.0);
}

function getRuntimeForCurrentMode() {
  const globals = getGlobals();
  const mode = globals.currentMode;
  const runtime = modeRuntimeCache.get(mode);
  if (runtime) return runtime;

  if (!modeLoadPromises.has(mode)) {
    void ensureModeRuntime(mode);
  }
  return null;
}

export function initModeSystem() {
  maybePreloadAllModes();
}

export async function setMode(inputMode) {
  const globals = getGlobals();
  let mode = inputMode;

  // Parallax-linear simulation disabled: redirect to first narrative mode.
  if (mode === MODES.PARALLAX_LINEAR) {
    mode = NARRATIVE_MODE_SEQUENCE[0] ?? MODES.PIT;
  }

  maybePreloadAllModes();

  const activeToken = ++modeChangeToken;
  const runtime = await ensureModeRuntime(mode);
  if (activeToken !== modeChangeToken) return false;

  if (!runtime || typeof runtime.initialize !== 'function') {
    console.warn(`[ModeLoader] Runtime for "${mode}" missing initialize hook.`);
    if (mode !== MODES.PIT) return setMode(MODES.PIT);
    return false;
  }

  const prevMode = globals.currentMode;
  try {
    // Reset stateful systems on mode switch to prevent accumulation artifacts.
    resetPhysicsAccumulator();
    resetAdaptiveThrottle();
    restoreCrittersOverridesIfNeeded(globals, mode);

    setModeState(mode);

    // Cursor color: only auto-cycle when switching to a different mode.
    if (mode !== prevMode) {
      try { maybeAutoPickCursorColor?.('mode'); } catch (e) {}
    }

    console.log(`Switching to mode: ${mode}`);
    announceToScreenReader(`Switched to ${MODE_NAMES[mode] || mode} mode`);

    // Update container class for mode-specific styling.
    // Preserve dark-mode class when switching modes.
    if (globals.container) {
      const wasDark = globals.container.classList.contains('dark-mode');
      globals.container.className = '';
      if (mode === MODES.PIT) {
        globals.container.classList.add('mode-pit');
      }
      if (wasDark || globals.isDarkMode) {
        globals.container.classList.add('dark-mode');
      }
    }

    // Resize canvas to match mode geometry.
    resize();

    applyModePhysicsState(mode, globals);
    applyCrittersOverridesIfNeeded(globals, mode);
    runtime.initialize();

    console.log(`Mode ${mode} initialized with ${globals.balls.length} balls`);

    // Sync legend filter system with new balls.
    if (typeof window !== 'undefined' && window.legendFilter && window.legendFilter.syncAllBalls) {
      try {
        window.legendFilter.syncAllBalls();
      } catch (e) {
        console.warn('Legend filter sync failed:', e);
      }
    }

    // Schedule warmup consumption (no rendering during warmup).
    const warmupFrames = Math.max(0, Math.round(getWarmupFramesForMode(mode, globals) || 0));
    globals.warmupFramesRemaining = warmupFrames;

    // Broadcast mode changes for lightweight UI micro-interactions.
    if (typeof window !== 'undefined' && mode !== prevMode) {
      try {
        window.dispatchEvent(new CustomEvent('bb:modeChanged', { detail: { prevMode, mode } }));
      } catch (e) {}
    }

    return true;
  } catch (error) {
    console.warn(`[ModeLoader] Failed while applying mode "${mode}"`, error);
    if (mode !== MODES.PIT) return setMode(MODES.PIT);
    return false;
  }
}

export function resetCurrentMode() {
  const globals = getGlobals();
  try { maybeAutoPickCursorColor?.('reset'); } catch (e) {}
  return setMode(globals.currentMode);
}

export function getForceApplicator() {
  const runtime = getRuntimeForCurrentMode();
  return runtime?.force || null;
}

export function getModeUpdater() {
  const runtime = getRuntimeForCurrentMode();
  return runtime?.update || null;
}

export function getModeRenderer() {
  const runtime = getRuntimeForCurrentMode();
  if (!runtime?.preRender && !runtime?.postRender) return null;
  return {
    preRender: runtime.preRender || null,
    postRender: runtime.postRender || null
  };
}

export function getModeCustomRenderer() {
  const runtime = getRuntimeForCurrentMode();
  return runtime?.customRender || null;
}

export function getModeBoundsHandler() {
  const runtime = getRuntimeForCurrentMode();
  return runtime?.bounds || null;
}
