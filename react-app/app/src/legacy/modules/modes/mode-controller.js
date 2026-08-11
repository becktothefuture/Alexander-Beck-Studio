// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           MODE CONTROLLER                                   ║
// ║     Daily-mode-first runtime with lazy-loaded simulation modules             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { MODES, isPitLikeMode } from '../core/constants.js';
import {
  ROUTE_BACKED_DAILY_HREFS,
  getSimulationName,
  writeManualSimulationFocus,
} from '../../../data/simulationCatalog.js';
import {
  createIndexedSimulationVisualTransition,
  getInitialSimulationVisualScale,
  registerSimulationVisualTransition,
} from '../../../lib/simulationVisualTransition.js';
import { setMode as setModeState, getGlobals } from '../core/state.js';
import { resize } from '../rendering/renderer.js';
import { announceToScreenReader } from '../utils/accessibility.js';
import { maybeAutoPickCursorColor, resetColorDistributionCoverage } from '../visual/colors.js';
import { resetPhysicsAccumulator } from '../physics/engine.js';
import { resolveWarmupFrameCount } from '../physics/warmup-frame-scheduler.js';
import { resetAdaptiveThrottle } from '../rendering/loop.js';
import { CUBE_3D_DEFAULTS } from './cube3d-config.js';
import {
  getForceApplicator,
  getModeBoundsHandler,
  getModeCustomRenderer,
  getModeCustomStep,
  getModeDepthRenderer,
  getModeRenderer,
  getModeUpdater,
  getRuntimeForCurrentMode,
  hasModeRuntime,
  readModeRuntime,
  registerCurrentModeReader,
  registerModeRuntimeLoader,
  writeModeRuntime,
} from './mode-runtime-bridge.js';

export { MODES };

const MODE_NAMES = {
  pit: 'Foundation',
  'portfolio-pit': 'Portfolio Pit',
  flies: 'Attention',
  weightless: 'Weightless Drift',
  water: 'Flow',
  magnetic: 'Magnetic',
  'kaleidoscope-3': 'Refraction',
  'kaleidoscope-rift': 'Multiplicity',
  'rift-rings': 'Depth',
  critters: 'Critter Swarm',
  '3d-sphere': 'Continuity',
  '3d-cube': 'Scaffold',
  'starfield-3d': 'Perspective',
  'elastic-center': 'Elastic Loom',
  'flock-of-birds': 'Convergence',
  'repel-room': 'Tension',
  'wall-repel': 'Tension',
  'aperture-bloom': 'Aperture Bloom',
  'flubber-blob': 'Cohesion',
  'pressure-crucible': 'Pressure Field',
  'particle-fountain': 'Fountain A',
  'particle-fountain-b': 'Cadence',
  'napoleon-point-cloud': 'Impression',
  'beach-ball-room': 'Beach Ball Room'
};

const ROUTE_BACKED_MODE_HREFS = ROUTE_BACKED_DAILY_HREFS;

const MODE_REGISTRY = {
  [MODES.PIT]: {
    load: () => import('./ball-pit.js'),
    hooks: { initialize: 'initializeBallPit', force: 'applyBallPitForces' }
  },
  [MODES.PORTFOLIO_PIT]: {
    load: () => import('../portfolio/pit-mode.js'),
    hooks: {
      initialize: 'initializePortfolioPit',
      force: 'applyPortfolioPitForces',
      render: 'renderPortfolioPit'
    }
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
  [MODES.KALEIDOSCOPE]: {
    load: () => import('./kaleidoscope.js'),
    hooks: {
      initialize: 'initializeKaleidoscope',
      force: 'applyKaleidoscopeForces',
      render: 'renderKaleidoscope',
      bounds: 'applyKaleidoscopeBounds'
    }
  },
  [MODES.KALEIDOSCOPE_RIFT]: {
    load: () => import('./kaleidoscope.js'),
    hooks: {
      initialize: 'initializeKaleidoscopeRift',
      force: 'applyKaleidoscopeRiftForces',
      render: 'renderKaleidoscopeRift',
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
  [MODES.SPHERE_3D]: {
    load: () => import('./3d-sphere.js'),
    hooks: {
      initialize: 'initialize3DSphere',
      force: 'apply3DSphereForces',
      customStep: 'step3DSphere',
      depthRender: 'render3DSphereDepthLayer'
    }
  },
  [MODES.CUBE_3D]: {
    load: () => import('./3d-cube.js'),
    hooks: {
      initialize: 'initialize3DCube',
      force: 'apply3DCubeForces',
      customStep: 'step3DCube',
      depthRender: 'render3DCubeDepthLayer'
    }
  },
  [MODES.STARFIELD_3D]: {
    load: () => import('./starfield-3d.js'),
    hooks: {
      initialize: 'initializeStarfield3D',
      force: 'applyStarfield3DForces',
      update: 'updateStarfield3D',
      preRender: 'renderStarfield3D',
      visualTransitionCount: 'getStarfieldVisualTransitionCount',
      setVisualTransitionScale: 'setStarfieldVisualTransitionScale'
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
  [MODES.FLUBBER_BLOB]: {
    load: () => import('./flubber-blob.js'),
    hooks: {
      initialize: 'initializeFlubberBlob',
      customStep: 'stepFlubberBlob',
      render: 'renderFlubberBlob'
    }
  },
  [MODES.PRESSURE_CRUCIBLE]: {
    load: () => import('./pressure-crucible.js'),
    hooks: {
      initialize: 'initializePressureCrucible',
      force: 'applyPressureCrucibleForces',
      render: 'renderPressureCrucible'
    }
  },
  [MODES.PARTICLE_FOUNTAIN]: {
    load: () => import('./particle-fountain.js'),
    hooks: {
      initialize: 'initializeParticleFountain',
      force: 'applyParticleFountainForces',
      update: 'updateParticleFountain'
    }
  },
  [MODES.PARTICLE_FOUNTAIN_B]: {
    load: () => import('./particle-fountain-b.js'),
    hooks: {
      initialize: 'initializeParticleFountainB',
      force: 'applyParticleFountainBForces',
      update: 'updateParticleFountainB'
    }
  }
};

const modeLoadPromises = new Map();
let preloadAllStarted = false;
let modeChangeToken = 0;
let legacyVisualTransition = null;
let unregisterLegacyVisualTransition = null;

function toFn(module, key) {
  if (!key) return null;
  const candidate = module?.[key];
  return typeof candidate === 'function' ? candidate : null;
}

function buildModeRuntime(module, hooks = {}) {
  return {
    initialize: toFn(module, hooks.initialize),
    cleanup: toFn(module, hooks.cleanup),
    force: toFn(module, hooks.force),
    update: toFn(module, hooks.update),
    preRender: toFn(module, hooks.preRender),
    postRender: toFn(module, hooks.postRender),
    customRender: toFn(module, hooks.render),
    depthRender: toFn(module, hooks.depthRender),
    customStep: toFn(module, hooks.customStep),
    bounds: toFn(module, hooks.bounds),
    visualTransitionCount: toFn(module, hooks.visualTransitionCount),
    setVisualTransitionScale: toFn(module, hooks.setVisualTransitionScale)
  };
}

async function ensureModeRuntime(mode) {
  const entry = MODE_REGISTRY[mode];
  if (!entry) return null;

  if (hasModeRuntime(mode)) {
    return readModeRuntime(mode);
  }

  if (modeLoadPromises.has(mode)) {
    return modeLoadPromises.get(mode);
  }

  const loadPromise = entry.load()
    .then((module) => {
      const runtime = buildModeRuntime(module, entry.hooks);
      writeModeRuntime(mode, runtime);
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

registerModeRuntimeLoader((mode) => {
  void ensureModeRuntime(mode);
});
registerCurrentModeReader(() => getGlobals().currentMode);

export async function prewarmModeRuntime(mode) {
  return ensureModeRuntime(mode);
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
  const configuredFrames = (() => {
    switch (mode) {
    case MODES.PIT: return globals.pitWarmupFrames ?? 10;
    case MODES.PORTFOLIO_PIT: return globals.portfolioPitWarmupFrames ?? 0;
    case MODES.FLIES: return globals.fliesWarmupFrames ?? 10;
    case MODES.WEIGHTLESS: return globals.weightlessWarmupFrames ?? 10;
    case MODES.WATER: return globals.waterWarmupFrames ?? 10;
    case MODES.MAGNETIC: return globals.magneticWarmupFrames ?? 10;
    case MODES.KALEIDOSCOPE: return globals.kaleidoscope3WarmupFrames ?? globals.kaleidoscopeWarmupFrames ?? 10;
    case MODES.KALEIDOSCOPE_RIFT: return globals.kaleidoscopeRiftWarmupFrames ?? 45;
    case MODES.CRITTERS: return globals.crittersWarmupFrames ?? 10;
    case MODES.SPHERE_3D: return globals.sphere3dWarmupFrames ?? 10;
    case MODES.CUBE_3D: return globals.cube3dWarmupFrames ?? CUBE_3D_DEFAULTS.cube3dWarmupFrames;
    case MODES.STARFIELD_3D: return globals.starfield3dWarmupFrames ?? 10;
    case MODES.ELASTIC_CENTER: return globals.tensionLoomWarmupFrames ?? 8;
    case MODES.FLUBBER_BLOB: return globals.flubberBlobWarmupFrames ?? 10;
    case MODES.PRESSURE_CRUCIBLE: return globals.pressureCrucibleWarmupFrames ?? 0;
    case MODES.PARTICLE_FOUNTAIN: return globals.particleFountainWarmupFrames ?? 0;
    case MODES.PARTICLE_FOUNTAIN_B: return 0;
    default: return 10;
    }
  })();

  // Warmup runs synchronously before the first visible frame. Keep a tiny
  // settling allowance on mobile without blocking the route/title entrance.
  if (globals.isMobile || globals.isMobileViewport) {
    return Math.min(configuredFrames, 2);
  }
  return configuredFrames;
}

function applyModePhysicsState(mode, globals) {
  const zeroGravityModes = new Set([
    MODES.FLIES,
    MODES.WEIGHTLESS,
    MODES.WATER,
    MODES.MAGNETIC,
    MODES.KALEIDOSCOPE,
    MODES.KALEIDOSCOPE_RIFT,
    MODES.SPHERE_3D,
    MODES.CUBE_3D,
    MODES.CRITTERS,
    MODES.STARFIELD_3D,
    MODES.ELASTIC_CENTER,
    MODES.FLUBBER_BLOB,
    MODES.PRESSURE_CRUCIBLE
  ]);

  if (isPitLikeMode(mode)) {
    globals.gravityMultiplier = globals.gravityMultiplierPit;
    globals.G = globals.GE * globals.gravityMultiplier;
    globals.repellerEnabled = mode === MODES.PIT;
    return;
  }

  if (mode === MODES.PARTICLE_FOUNTAIN || mode === MODES.PARTICLE_FOUNTAIN_B) {
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

function ensureLegacyVisualTransition() {
  if (!legacyVisualTransition) {
    legacyVisualTransition = createIndexedSimulationVisualTransition({
      sourceId: 'home-canvas',
      getCount: () => {
        const globals = getGlobals();
        const runtime = getRuntimeForCurrentMode();
        if (typeof runtime?.visualTransitionCount === 'function') {
          return runtime.visualTransitionCount();
        }
        return Array.isArray(globals.balls) ? globals.balls.length : 0;
      },
      setScaleAt: (index, scale) => {
        const globals = getGlobals();
        const runtime = getRuntimeForCurrentMode();
        if (typeof runtime?.setVisualTransitionScale === 'function') {
          runtime.setVisualTransitionScale(index, scale);
          return;
        }
        const ball = Array.isArray(globals.balls) ? globals.balls[index] : null;
        if (ball) ball.visualScale = scale;
      },
      getSeed: () => {
        const globals = getGlobals();
        const mode = String(globals.currentMode || '');
        let hash = 2166136261;
        for (let i = 0; i < mode.length; i += 1) {
          hash ^= mode.charCodeAt(i);
          hash = Math.imul(hash, 16777619);
        }
        return hash >>> 0;
      },
    });
  }

  if (!unregisterLegacyVisualTransition) {
    unregisterLegacyVisualTransition = registerSimulationVisualTransition('home-canvas', legacyVisualTransition);
  }

  return legacyVisualTransition;
}

export function initModeSystem() {
  ensureLegacyVisualTransition();
  maybePreloadAllModes();
}

export function disposeModeSystem() {
  modeChangeToken += 1;
  try {
    const currentMode = getGlobals()?.currentMode;
    readModeRuntime(currentMode)?.cleanup?.();
  } catch (e) {
    // Mode cleanup is optional during teardown.
  }
  if (unregisterLegacyVisualTransition) {
    unregisterLegacyVisualTransition();
    unregisterLegacyVisualTransition = null;
  }
  legacyVisualTransition?.destroy?.();
  legacyVisualTransition = null;
}

export async function setMode(inputMode) {
  const globals = getGlobals();
  let mode = inputMode;
  const previousMode = globals.currentMode;

  const routeBackedHref = ROUTE_BACKED_MODE_HREFS[mode];
  if (routeBackedHref) {
    announceToScreenReader(`Switched to ${MODE_NAMES[mode] || getSimulationName(mode)} mode`);
    writeManualSimulationFocus(mode);
    return true;
  }

  maybePreloadAllModes();

  const activeToken = ++modeChangeToken;
  const runtime = await ensureModeRuntime(mode);
  if (activeToken !== modeChangeToken) return false;

  if (!runtime || typeof runtime.initialize !== 'function') {
    console.warn(`[ModeLoader] Runtime for "${mode}" missing initialize hook.`);
    const recoveryMode = previousMode && previousMode !== mode ? previousMode : MODES.PIT;
    if (recoveryMode !== mode) await setMode(recoveryMode);
    return false;
  }

  const prevMode = previousMode;
  try {
    // Reset stateful systems on mode switch to prevent accumulation artifacts.
    readModeRuntime(previousMode)?.cleanup?.();
    resetPhysicsAccumulator();
    resetAdaptiveThrottle();
    restoreCrittersOverridesIfNeeded(globals, mode);

    setModeState(mode);

    // Cursor color: only auto-cycle when switching to a different mode.
    if (mode !== prevMode) {
      try { maybeAutoPickCursorColor?.('mode'); } catch (e) { /* Cursor colour is optional. */ }
    }

    console.log(`Switching to mode: ${mode}`);
    announceToScreenReader(`Switched to ${MODE_NAMES[mode] || mode} mode`);

    // Update container class for mode-specific styling.
    // Preserve dark-mode class when switching modes.
    if (globals.container) {
      const wasDark = globals.container.classList.contains('dark-mode');
      globals.container.className = '';
      if (isPitLikeMode(mode)) {
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
    resetColorDistributionCoverage();
    runtime.initialize();
    ensureLegacyVisualTransition().setVisualScale(getInitialSimulationVisualScale());

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
    // Custom-rendered modes can intentionally own no Ball bodies. Their legacy
    // startup path never consumed body warm-up steps, so keep that visible
    // behaviour while avoiding a readiness wait that can never complete.
    const warmupFrames = resolveWarmupFrameCount(
      getWarmupFramesForMode(mode, globals),
      globals.balls?.length,
    );
    globals.warmupFramesRemaining = warmupFrames;
    globals.warmupSubstepsRemaining = mode === MODES.PIT
      && !globals.isMobile
      && !globals.isMobileViewport
      ? warmupFrames * 2
      : 0;
    globals.warmupSliceCount = 0;
    globals.warmupConsumedFrameCount = 0;
    globals.warmupMaxSliceMs = 0;
    globals.warmupHardLimitExceededCount = 0;
    globals.pitCadenceHoldSeconds = 0;
    globals.pitPhysicsStepHz = isPitLikeMode(mode) ? 120 : null;
    globals.pitSleepingBodyCount = null;
    globals.pitAwakeBodyCount = null;
    globals.pitMaxAwakeSpeedSq = null;
    globals.pitMaxAwakeAngularSpeed = null;
    globals.pitLastOverlapDebt = null;

    // Broadcast mode changes for lightweight UI micro-interactions.
    if (typeof window !== 'undefined' && mode !== prevMode) {
      try {
        window.dispatchEvent(new CustomEvent('bb:modeChanged', { detail: { prevMode, mode } }));
      } catch (e) {
        // The compatibility event is optional.
      }
    }

    return true;
  } catch (error) {
    console.warn(`[ModeLoader] Failed while applying mode "${mode}"`, error);
    globals.lastModeFailure = {
      mode,
      previousMode: prevMode,
      message: error?.message || String(error),
      at: typeof performance !== 'undefined' ? performance.now() : Date.now(),
    };
    try {
      window.dispatchEvent(new CustomEvent('bb:modeFailed', {
        detail: globals.lastModeFailure,
      }));
    } catch {
      // Runtime restoration is more important than diagnostics.
    }
    const recoveryMode = prevMode && prevMode !== mode ? prevMode : MODES.PIT;
    if (recoveryMode !== mode) {
      await setMode(recoveryMode);
    }
    return false;
  }
}

export function resetCurrentMode() {
  const globals = getGlobals();
  try { maybeAutoPickCursorColor?.('reset'); } catch (e) { /* Cursor colour is optional. */ }
  return setMode(globals.currentMode);
}

export {
  getForceApplicator,
  getModeBoundsHandler,
  getModeCustomRenderer,
  getModeCustomStep,
  getModeDepthRenderer,
  getModeRenderer,
  getModeUpdater,
};
