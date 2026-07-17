// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                           MODE CONTROLLER                                   ║
// ║     Daily-mode-first runtime with lazy-loaded simulation modules             ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { MODES, isPitLikeMode } from "/src/legacy/modules/core/constants.js";
import {
  ROUTE_BACKED_DAILY_HREFS,
  getSimulationName,
  writeManualSimulationFocus,
} from "/src/data/simulationCatalog.js";
import {
  createIndexedSimulationVisualTransition,
  getInitialSimulationVisualScale,
  registerSimulationVisualTransition,
} from "/src/lib/simulationVisualTransition.js";
import { setMode as setModeState, getGlobals } from "/src/legacy/modules/core/state.js";
import { resize } from "/src/legacy/modules/rendering/renderer.js";
import { announceToScreenReader } from "/src/legacy/modules/utils/accessibility.js";
import { maybeAutoPickCursorColor, resetColorDistributionCoverage } from "/src/legacy/modules/visual/colors.js";
import { resetPhysicsAccumulator } from "/src/legacy/modules/physics/engine.js";
import { resetAdaptiveThrottle } from "/src/legacy/modules/rendering/loop.js";

export { MODES };

const MODE_NAMES = {
  pit: 'Foundation',
  'portfolio-pit': 'Portfolio Pit',
  flies: 'Attention',
  weightless: 'Weightless Drift',
  water: 'Flow',
  magnetic: 'Magnetic Field',
  bubbles: 'Emergence',
  'kaleidoscope-3': 'Refraction',
  'kaleidoscope-rift': 'Multiplicity',
  'rift-rings': 'Depth',
  critters: 'Critter Swarm',
  'parallax-float': 'Parallax Drift',
  '3d-sphere': 'Continuity',
  '3d-cube': 'Scaffold',
  'starfield-3d': 'Perspective',
  'elastic-center': 'Elastic Loom',
  'flock-of-birds': 'Convergence',
  'repel-room': 'Tension',
  'wall-repel': 'Tension',
  'aperture-bloom': 'Aperture Bloom',
  'mineral-growth': 'Formation',
  'flubber-blob': 'Cohesion',
  'weave-field': 'Juxtaposition',
  shapes: 'Assembly',
  'pressure-crucible': 'Pressure Field',
  'particle-fountain': 'Particle Fountain',
  'napoleon-point-cloud': 'Impression',
  'beach-ball-room': 'Beach Ball Room'
};

const ROUTE_BACKED_MODE_HREFS = ROUTE_BACKED_DAILY_HREFS;

const MODE_REGISTRY = {
  [MODES.PIT]: {
    load: () => import("/src/legacy/modules/modes/ball-pit.js"),
    hooks: { initialize: 'initializeBallPit', force: 'applyBallPitForces' }
  },
  [MODES.PORTFOLIO_PIT]: {
    load: () => import("/src/legacy/modules/portfolio/pit-mode.js"),
    hooks: {
      initialize: 'initializePortfolioPit',
      force: 'applyPortfolioPitForces',
      render: 'renderPortfolioPit'
    }
  },
  [MODES.FLIES]: {
    load: () => import("/src/legacy/modules/modes/flies.js"),
    hooks: { initialize: 'initializeFlies', force: 'applyFliesForces' }
  },
  [MODES.WEIGHTLESS]: {
    load: () => import("/src/legacy/modules/modes/weightless.js"),
    hooks: { initialize: 'initializeWeightless', force: 'applyWeightlessForces' }
  },
  [MODES.WATER]: {
    load: () => import("/src/legacy/modules/modes/water.js"),
    hooks: {
      initialize: 'initializeWater',
      force: 'applyWaterForces',
      update: 'updateWaterRipples'
    }
  },
  [MODES.MAGNETIC]: {
    load: () => import("/src/legacy/modules/modes/magnetic.js"),
    hooks: {
      initialize: 'initializeMagnetic',
      force: 'applyMagneticForces',
      update: 'updateMagnetic'
    }
  },
  [MODES.BUBBLES]: {
    load: () => import("/src/legacy/modules/modes/bubbles.js"),
    hooks: {
      initialize: 'initializeBubbles',
      force: 'applyBubblesForces',
      update: 'updateBubbles'
    }
  },
  [MODES.KALEIDOSCOPE]: {
    load: () => import("/src/legacy/modules/modes/kaleidoscope.js"),
    hooks: {
      initialize: 'initializeKaleidoscope',
      force: 'applyKaleidoscopeForces',
      render: 'renderKaleidoscope',
      bounds: 'applyKaleidoscopeBounds'
    }
  },
  [MODES.KALEIDOSCOPE_RIFT]: {
    load: () => import("/src/legacy/modules/modes/kaleidoscope.js"),
    hooks: {
      initialize: 'initializeKaleidoscopeRift',
      force: 'applyKaleidoscopeRiftForces',
      render: 'renderKaleidoscopeRift',
      bounds: 'applyKaleidoscopeBounds'
    }
  },
  [MODES.CRITTERS]: {
    load: () => import("/src/legacy/modules/modes/critters.js"),
    hooks: {
      initialize: 'initializeCritters',
      force: 'applyCrittersForces',
      update: 'updateCrittersGrid',
      preRender: 'renderCrittersWaypoints'
    }
  },
  [MODES.PARALLAX_FLOAT]: {
    load: () => import("/src/legacy/modules/modes/parallax-float.js"),
    hooks: {
      initialize: 'initializeParallaxFloat',
      force: 'applyParallaxFloatForces',
      update: 'updateParallaxFloatMouse'
    }
  },
  [MODES.SPHERE_3D]: {
    load: () => import("/src/legacy/modules/modes/3d-sphere.js"),
    hooks: {
      initialize: 'initialize3DSphere',
      force: 'apply3DSphereForces',
      depthRender: 'render3DSphereDepthLayer'
    }
  },
  [MODES.CUBE_3D]: {
    load: () => import("/src/legacy/modules/modes/3d-cube.js"),
    hooks: {
      initialize: 'initialize3DCube',
      force: 'apply3DCubeForces',
      depthRender: 'render3DCubeDepthLayer'
    }
  },
  [MODES.STARFIELD_3D]: {
    load: () => import("/src/legacy/modules/modes/starfield-3d.js"),
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
    load: () => import("/src/legacy/modules/modes/elastic-center.js"),
    hooks: {
      initialize: 'initializeElasticCenter',
      force: 'applyElasticCenterForces',
      update: 'updateElasticCenter'
    }
  },
  [MODES.FLUBBER_BLOB]: {
    load: () => import("/src/legacy/modules/modes/flubber-blob.js"),
    hooks: {
      initialize: 'initializeFlubberBlob',
      customStep: 'stepFlubberBlob',
      render: 'renderFlubberBlob'
    }
  },
  [MODES.WEAVE_FIELD]: {
    load: () => import("/src/legacy/modules/modes/weave-field.js"),
    hooks: {
      initialize: 'initializeWeaveField',
      force: 'applyWeaveFieldForces'
    }
  },
  [MODES.SHAPES]: {
    load: () => import("/src/legacy/modules/modes/shapes.js"),
    hooks: {
      initialize: 'initializeShapes',
      cleanup: 'cleanupShapes',
      force: 'applyShapesForces',
      customStep: 'stepShapes'
    }
  },
  [MODES.PRESSURE_CRUCIBLE]: {
    load: () => import("/src/legacy/modules/modes/pressure-crucible.js"),
    hooks: {
      initialize: 'initializePressureCrucible',
      force: 'applyPressureCrucibleForces',
      render: 'renderPressureCrucible'
    }
  },
  [MODES.PARTICLE_FOUNTAIN]: {
    load: () => import("/src/legacy/modules/modes/particle-fountain.js"),
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
  const configuredFrames = (() => {
    switch (mode) {
    case MODES.PIT: return globals.pitWarmupFrames ?? 10;
    case MODES.PORTFOLIO_PIT: return globals.portfolioPitWarmupFrames ?? 0;
    case MODES.FLIES: return globals.fliesWarmupFrames ?? 10;
    case MODES.WEIGHTLESS: return globals.weightlessWarmupFrames ?? 10;
    case MODES.WATER: return globals.waterWarmupFrames ?? 10;
    case MODES.MAGNETIC: return globals.magneticWarmupFrames ?? 10;
    case MODES.BUBBLES: return globals.bubblesWarmupFrames ?? 10;
    case MODES.KALEIDOSCOPE: return globals.kaleidoscope3WarmupFrames ?? globals.kaleidoscopeWarmupFrames ?? 10;
    case MODES.KALEIDOSCOPE_RIFT: return globals.kaleidoscopeRiftWarmupFrames ?? 45;
    case MODES.CRITTERS: return globals.crittersWarmupFrames ?? 10;
    case MODES.SPHERE_3D: return globals.sphere3dWarmupFrames ?? 10;
    case MODES.CUBE_3D: return globals.cube3dWarmupFrames ?? 10;
    case MODES.PARALLAX_FLOAT: return globals.parallaxFloatWarmupFrames ?? 10;
    case MODES.STARFIELD_3D: return globals.starfield3dWarmupFrames ?? 10;
    case MODES.ELASTIC_CENTER: return globals.tensionLoomWarmupFrames ?? 8;
    case MODES.FLUBBER_BLOB: return globals.flubberBlobWarmupFrames ?? 10;
    case MODES.WEAVE_FIELD: return globals.weaveFieldWarmupFrames ?? 0;
    case MODES.SHAPES: return globals.shapesWarmupFrames ?? 0;
    case MODES.PRESSURE_CRUCIBLE: return globals.pressureCrucibleWarmupFrames ?? 0;
    case MODES.PARTICLE_FOUNTAIN: return globals.particleFountainWarmupFrames ?? 0;
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
    MODES.BUBBLES,
    MODES.KALEIDOSCOPE,
    MODES.KALEIDOSCOPE_RIFT,
    MODES.SPHERE_3D,
    MODES.CUBE_3D,
    MODES.CRITTERS,
    MODES.PARALLAX_FLOAT,
    MODES.STARFIELD_3D,
    MODES.ELASTIC_CENTER,
    MODES.FLUBBER_BLOB,
    MODES.WEAVE_FIELD,
    MODES.SHAPES,
    MODES.PRESSURE_CRUCIBLE
  ]);

  if (isPitLikeMode(mode)) {
    globals.gravityMultiplier = globals.gravityMultiplierPit;
    globals.G = globals.GE * globals.gravityMultiplier;
    globals.repellerEnabled = mode === MODES.PIT;
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
    modeRuntimeCache.get(currentMode)?.cleanup?.();
  } catch (e) {}
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
    modeRuntimeCache.get(previousMode)?.cleanup?.();
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

export function getModeDepthRenderer() {
  const runtime = getRuntimeForCurrentMode();
  return runtime?.depthRender || null;
}

export function getModeCustomStep() {
  const runtime = getRuntimeForCurrentMode();
  return runtime?.customStep || null;
}

export function getModeBoundsHandler() {
  const runtime = getRuntimeForCurrentMode();
  return runtime?.bounds || null;
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm1vZGUtY29udHJvbGxlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyIvLyDilZTilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZDilZdcbi8vIOKVkSAgICAgICAgICAgICAgICAgICAgICAgICAgIE1PREUgQ09OVFJPTExFUiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAg4pWRXG4vLyDilZEgICAgIERhaWx5LW1vZGUtZmlyc3QgcnVudGltZSB3aXRoIGxhenktbG9hZGVkIHNpbXVsYXRpb24gbW9kdWxlcyAgICAgICAgICAgICDilZFcbi8vIOKVmuKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVkOKVnVxuXG5pbXBvcnQgeyBNT0RFUywgaXNQaXRMaWtlTW9kZSB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL2NvcmUvY29uc3RhbnRzLmpzXCI7XG5pbXBvcnQge1xuICBST1VURV9CQUNLRURfREFJTFlfSFJFRlMsXG4gIGdldFNpbXVsYXRpb25OYW1lLFxuICB3cml0ZU1hbnVhbFNpbXVsYXRpb25Gb2N1cyxcbn0gZnJvbSBcIi9zcmMvZGF0YS9zaW11bGF0aW9uQ2F0YWxvZy5qc1wiO1xuaW1wb3J0IHtcbiAgY3JlYXRlSW5kZXhlZFNpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uLFxuICBnZXRJbml0aWFsU2ltdWxhdGlvblZpc3VhbFNjYWxlLFxuICByZWdpc3RlclNpbXVsYXRpb25WaXN1YWxUcmFuc2l0aW9uLFxufSBmcm9tIFwiL3NyYy9saWIvc2ltdWxhdGlvblZpc3VhbFRyYW5zaXRpb24uanNcIjtcbmltcG9ydCB7IHNldE1vZGUgYXMgc2V0TW9kZVN0YXRlLCBnZXRHbG9iYWxzIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvY29yZS9zdGF0ZS5qc1wiO1xuaW1wb3J0IHsgcmVzaXplIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvcmVuZGVyaW5nL3JlbmRlcmVyLmpzXCI7XG5pbXBvcnQgeyBhbm5vdW5jZVRvU2NyZWVuUmVhZGVyIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvdXRpbHMvYWNjZXNzaWJpbGl0eS5qc1wiO1xuaW1wb3J0IHsgbWF5YmVBdXRvUGlja0N1cnNvckNvbG9yLCByZXNldENvbG9yRGlzdHJpYnV0aW9uQ292ZXJhZ2UgfSBmcm9tIFwiL3NyYy9sZWdhY3kvbW9kdWxlcy92aXN1YWwvY29sb3JzLmpzXCI7XG5pbXBvcnQgeyByZXNldFBoeXNpY3NBY2N1bXVsYXRvciB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3BoeXNpY3MvZW5naW5lLmpzXCI7XG5pbXBvcnQgeyByZXNldEFkYXB0aXZlVGhyb3R0bGUgfSBmcm9tIFwiL3NyYy9sZWdhY3kvbW9kdWxlcy9yZW5kZXJpbmcvbG9vcC5qc1wiO1xuXG5leHBvcnQgeyBNT0RFUyB9O1xuXG5jb25zdCBNT0RFX05BTUVTID0ge1xuICBwaXQ6ICdGb3VuZGF0aW9uJyxcbiAgJ3BvcnRmb2xpby1waXQnOiAnUG9ydGZvbGlvIFBpdCcsXG4gIGZsaWVzOiAnQXR0ZW50aW9uJyxcbiAgd2VpZ2h0bGVzczogJ1dlaWdodGxlc3MgRHJpZnQnLFxuICB3YXRlcjogJ0Zsb3cnLFxuICBtYWduZXRpYzogJ01hZ25ldGljIEZpZWxkJyxcbiAgYnViYmxlczogJ0VtZXJnZW5jZScsXG4gICdrYWxlaWRvc2NvcGUtMyc6ICdSZWZyYWN0aW9uJyxcbiAgJ2thbGVpZG9zY29wZS1yaWZ0JzogJ011bHRpcGxpY2l0eScsXG4gICdyaWZ0LXJpbmdzJzogJ0RlcHRoJyxcbiAgY3JpdHRlcnM6ICdDcml0dGVyIFN3YXJtJyxcbiAgJ3BhcmFsbGF4LWZsb2F0JzogJ1BhcmFsbGF4IERyaWZ0JyxcbiAgJzNkLXNwaGVyZSc6ICdDb250aW51aXR5JyxcbiAgJzNkLWN1YmUnOiAnU2NhZmZvbGQnLFxuICAnc3RhcmZpZWxkLTNkJzogJ1BlcnNwZWN0aXZlJyxcbiAgJ2VsYXN0aWMtY2VudGVyJzogJ0VsYXN0aWMgTG9vbScsXG4gICdmbG9jay1vZi1iaXJkcyc6ICdDb252ZXJnZW5jZScsXG4gICdyZXBlbC1yb29tJzogJ1RlbnNpb24nLFxuICAnd2FsbC1yZXBlbCc6ICdUZW5zaW9uJyxcbiAgJ2FwZXJ0dXJlLWJsb29tJzogJ0FwZXJ0dXJlIEJsb29tJyxcbiAgJ21pbmVyYWwtZ3Jvd3RoJzogJ0Zvcm1hdGlvbicsXG4gICdmbHViYmVyLWJsb2InOiAnQ29oZXNpb24nLFxuICAnd2VhdmUtZmllbGQnOiAnSnV4dGFwb3NpdGlvbicsXG4gIHNoYXBlczogJ0Fzc2VtYmx5JyxcbiAgJ3ByZXNzdXJlLWNydWNpYmxlJzogJ1ByZXNzdXJlIEZpZWxkJyxcbiAgJ3BhcnRpY2xlLWZvdW50YWluJzogJ1BhcnRpY2xlIEZvdW50YWluJyxcbiAgJ25hcG9sZW9uLXBvaW50LWNsb3VkJzogJ0ltcHJlc3Npb24nLFxuICAnYmVhY2gtYmFsbC1yb29tJzogJ0JlYWNoIEJhbGwgUm9vbSdcbn07XG5cbmNvbnN0IFJPVVRFX0JBQ0tFRF9NT0RFX0hSRUZTID0gUk9VVEVfQkFDS0VEX0RBSUxZX0hSRUZTO1xuXG5jb25zdCBNT0RFX1JFR0lTVFJZID0ge1xuICBbTU9ERVMuUElUXToge1xuICAgIGxvYWQ6ICgpID0+IGltcG9ydChcIi9zcmMvbGVnYWN5L21vZHVsZXMvbW9kZXMvYmFsbC1waXQuanNcIiksXG4gICAgaG9va3M6IHsgaW5pdGlhbGl6ZTogJ2luaXRpYWxpemVCYWxsUGl0JywgZm9yY2U6ICdhcHBseUJhbGxQaXRGb3JjZXMnIH1cbiAgfSxcbiAgW01PREVTLlBPUlRGT0xJT19QSVRdOiB7XG4gICAgbG9hZDogKCkgPT4gaW1wb3J0KFwiL3NyYy9sZWdhY3kvbW9kdWxlcy9wb3J0Zm9saW8vcGl0LW1vZGUuanNcIiksXG4gICAgaG9va3M6IHtcbiAgICAgIGluaXRpYWxpemU6ICdpbml0aWFsaXplUG9ydGZvbGlvUGl0JyxcbiAgICAgIGZvcmNlOiAnYXBwbHlQb3J0Zm9saW9QaXRGb3JjZXMnLFxuICAgICAgcmVuZGVyOiAncmVuZGVyUG9ydGZvbGlvUGl0J1xuICAgIH1cbiAgfSxcbiAgW01PREVTLkZMSUVTXToge1xuICAgIGxvYWQ6ICgpID0+IGltcG9ydChcIi9zcmMvbGVnYWN5L21vZHVsZXMvbW9kZXMvZmxpZXMuanNcIiksXG4gICAgaG9va3M6IHsgaW5pdGlhbGl6ZTogJ2luaXRpYWxpemVGbGllcycsIGZvcmNlOiAnYXBwbHlGbGllc0ZvcmNlcycgfVxuICB9LFxuICBbTU9ERVMuV0VJR0hUTEVTU106IHtcbiAgICBsb2FkOiAoKSA9PiBpbXBvcnQoXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL21vZGVzL3dlaWdodGxlc3MuanNcIiksXG4gICAgaG9va3M6IHsgaW5pdGlhbGl6ZTogJ2luaXRpYWxpemVXZWlnaHRsZXNzJywgZm9yY2U6ICdhcHBseVdlaWdodGxlc3NGb3JjZXMnIH1cbiAgfSxcbiAgW01PREVTLldBVEVSXToge1xuICAgIGxvYWQ6ICgpID0+IGltcG9ydChcIi9zcmMvbGVnYWN5L21vZHVsZXMvbW9kZXMvd2F0ZXIuanNcIiksXG4gICAgaG9va3M6IHtcbiAgICAgIGluaXRpYWxpemU6ICdpbml0aWFsaXplV2F0ZXInLFxuICAgICAgZm9yY2U6ICdhcHBseVdhdGVyRm9yY2VzJyxcbiAgICAgIHVwZGF0ZTogJ3VwZGF0ZVdhdGVyUmlwcGxlcydcbiAgICB9XG4gIH0sXG4gIFtNT0RFUy5NQUdORVRJQ106IHtcbiAgICBsb2FkOiAoKSA9PiBpbXBvcnQoXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL21vZGVzL21hZ25ldGljLmpzXCIpLFxuICAgIGhvb2tzOiB7XG4gICAgICBpbml0aWFsaXplOiAnaW5pdGlhbGl6ZU1hZ25ldGljJyxcbiAgICAgIGZvcmNlOiAnYXBwbHlNYWduZXRpY0ZvcmNlcycsXG4gICAgICB1cGRhdGU6ICd1cGRhdGVNYWduZXRpYydcbiAgICB9XG4gIH0sXG4gIFtNT0RFUy5CVUJCTEVTXToge1xuICAgIGxvYWQ6ICgpID0+IGltcG9ydChcIi9zcmMvbGVnYWN5L21vZHVsZXMvbW9kZXMvYnViYmxlcy5qc1wiKSxcbiAgICBob29rczoge1xuICAgICAgaW5pdGlhbGl6ZTogJ2luaXRpYWxpemVCdWJibGVzJyxcbiAgICAgIGZvcmNlOiAnYXBwbHlCdWJibGVzRm9yY2VzJyxcbiAgICAgIHVwZGF0ZTogJ3VwZGF0ZUJ1YmJsZXMnXG4gICAgfVxuICB9LFxuICBbTU9ERVMuS0FMRUlET1NDT1BFXToge1xuICAgIGxvYWQ6ICgpID0+IGltcG9ydChcIi9zcmMvbGVnYWN5L21vZHVsZXMvbW9kZXMva2FsZWlkb3Njb3BlLmpzXCIpLFxuICAgIGhvb2tzOiB7XG4gICAgICBpbml0aWFsaXplOiAnaW5pdGlhbGl6ZUthbGVpZG9zY29wZScsXG4gICAgICBmb3JjZTogJ2FwcGx5S2FsZWlkb3Njb3BlRm9yY2VzJyxcbiAgICAgIHJlbmRlcjogJ3JlbmRlckthbGVpZG9zY29wZScsXG4gICAgICBib3VuZHM6ICdhcHBseUthbGVpZG9zY29wZUJvdW5kcydcbiAgICB9XG4gIH0sXG4gIFtNT0RFUy5LQUxFSURPU0NPUEVfUklGVF06IHtcbiAgICBsb2FkOiAoKSA9PiBpbXBvcnQoXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL21vZGVzL2thbGVpZG9zY29wZS5qc1wiKSxcbiAgICBob29rczoge1xuICAgICAgaW5pdGlhbGl6ZTogJ2luaXRpYWxpemVLYWxlaWRvc2NvcGVSaWZ0JyxcbiAgICAgIGZvcmNlOiAnYXBwbHlLYWxlaWRvc2NvcGVSaWZ0Rm9yY2VzJyxcbiAgICAgIHJlbmRlcjogJ3JlbmRlckthbGVpZG9zY29wZVJpZnQnLFxuICAgICAgYm91bmRzOiAnYXBwbHlLYWxlaWRvc2NvcGVCb3VuZHMnXG4gICAgfVxuICB9LFxuICBbTU9ERVMuQ1JJVFRFUlNdOiB7XG4gICAgbG9hZDogKCkgPT4gaW1wb3J0KFwiL3NyYy9sZWdhY3kvbW9kdWxlcy9tb2Rlcy9jcml0dGVycy5qc1wiKSxcbiAgICBob29rczoge1xuICAgICAgaW5pdGlhbGl6ZTogJ2luaXRpYWxpemVDcml0dGVycycsXG4gICAgICBmb3JjZTogJ2FwcGx5Q3JpdHRlcnNGb3JjZXMnLFxuICAgICAgdXBkYXRlOiAndXBkYXRlQ3JpdHRlcnNHcmlkJyxcbiAgICAgIHByZVJlbmRlcjogJ3JlbmRlckNyaXR0ZXJzV2F5cG9pbnRzJ1xuICAgIH1cbiAgfSxcbiAgW01PREVTLlBBUkFMTEFYX0ZMT0FUXToge1xuICAgIGxvYWQ6ICgpID0+IGltcG9ydChcIi9zcmMvbGVnYWN5L21vZHVsZXMvbW9kZXMvcGFyYWxsYXgtZmxvYXQuanNcIiksXG4gICAgaG9va3M6IHtcbiAgICAgIGluaXRpYWxpemU6ICdpbml0aWFsaXplUGFyYWxsYXhGbG9hdCcsXG4gICAgICBmb3JjZTogJ2FwcGx5UGFyYWxsYXhGbG9hdEZvcmNlcycsXG4gICAgICB1cGRhdGU6ICd1cGRhdGVQYXJhbGxheEZsb2F0TW91c2UnXG4gICAgfVxuICB9LFxuICBbTU9ERVMuU1BIRVJFXzNEXToge1xuICAgIGxvYWQ6ICgpID0+IGltcG9ydChcIi9zcmMvbGVnYWN5L21vZHVsZXMvbW9kZXMvM2Qtc3BoZXJlLmpzXCIpLFxuICAgIGhvb2tzOiB7XG4gICAgICBpbml0aWFsaXplOiAnaW5pdGlhbGl6ZTNEU3BoZXJlJyxcbiAgICAgIGZvcmNlOiAnYXBwbHkzRFNwaGVyZUZvcmNlcycsXG4gICAgICBkZXB0aFJlbmRlcjogJ3JlbmRlcjNEU3BoZXJlRGVwdGhMYXllcidcbiAgICB9XG4gIH0sXG4gIFtNT0RFUy5DVUJFXzNEXToge1xuICAgIGxvYWQ6ICgpID0+IGltcG9ydChcIi9zcmMvbGVnYWN5L21vZHVsZXMvbW9kZXMvM2QtY3ViZS5qc1wiKSxcbiAgICBob29rczoge1xuICAgICAgaW5pdGlhbGl6ZTogJ2luaXRpYWxpemUzREN1YmUnLFxuICAgICAgZm9yY2U6ICdhcHBseTNEQ3ViZUZvcmNlcycsXG4gICAgICBkZXB0aFJlbmRlcjogJ3JlbmRlcjNEQ3ViZURlcHRoTGF5ZXInXG4gICAgfVxuICB9LFxuICBbTU9ERVMuU1RBUkZJRUxEXzNEXToge1xuICAgIGxvYWQ6ICgpID0+IGltcG9ydChcIi9zcmMvbGVnYWN5L21vZHVsZXMvbW9kZXMvc3RhcmZpZWxkLTNkLmpzXCIpLFxuICAgIGhvb2tzOiB7XG4gICAgICBpbml0aWFsaXplOiAnaW5pdGlhbGl6ZVN0YXJmaWVsZDNEJyxcbiAgICAgIGZvcmNlOiAnYXBwbHlTdGFyZmllbGQzREZvcmNlcycsXG4gICAgICB1cGRhdGU6ICd1cGRhdGVTdGFyZmllbGQzRCcsXG4gICAgICBwcmVSZW5kZXI6ICdyZW5kZXJTdGFyZmllbGQzRCcsXG4gICAgICB2aXN1YWxUcmFuc2l0aW9uQ291bnQ6ICdnZXRTdGFyZmllbGRWaXN1YWxUcmFuc2l0aW9uQ291bnQnLFxuICAgICAgc2V0VmlzdWFsVHJhbnNpdGlvblNjYWxlOiAnc2V0U3RhcmZpZWxkVmlzdWFsVHJhbnNpdGlvblNjYWxlJ1xuICAgIH1cbiAgfSxcbiAgW01PREVTLkVMQVNUSUNfQ0VOVEVSXToge1xuICAgIGxvYWQ6ICgpID0+IGltcG9ydChcIi9zcmMvbGVnYWN5L21vZHVsZXMvbW9kZXMvZWxhc3RpYy1jZW50ZXIuanNcIiksXG4gICAgaG9va3M6IHtcbiAgICAgIGluaXRpYWxpemU6ICdpbml0aWFsaXplRWxhc3RpY0NlbnRlcicsXG4gICAgICBmb3JjZTogJ2FwcGx5RWxhc3RpY0NlbnRlckZvcmNlcycsXG4gICAgICB1cGRhdGU6ICd1cGRhdGVFbGFzdGljQ2VudGVyJ1xuICAgIH1cbiAgfSxcbiAgW01PREVTLkZMVUJCRVJfQkxPQl06IHtcbiAgICBsb2FkOiAoKSA9PiBpbXBvcnQoXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL21vZGVzL2ZsdWJiZXItYmxvYi5qc1wiKSxcbiAgICBob29rczoge1xuICAgICAgaW5pdGlhbGl6ZTogJ2luaXRpYWxpemVGbHViYmVyQmxvYicsXG4gICAgICBjdXN0b21TdGVwOiAnc3RlcEZsdWJiZXJCbG9iJyxcbiAgICAgIHJlbmRlcjogJ3JlbmRlckZsdWJiZXJCbG9iJ1xuICAgIH1cbiAgfSxcbiAgW01PREVTLldFQVZFX0ZJRUxEXToge1xuICAgIGxvYWQ6ICgpID0+IGltcG9ydChcIi9zcmMvbGVnYWN5L21vZHVsZXMvbW9kZXMvd2VhdmUtZmllbGQuanNcIiksXG4gICAgaG9va3M6IHtcbiAgICAgIGluaXRpYWxpemU6ICdpbml0aWFsaXplV2VhdmVGaWVsZCcsXG4gICAgICBmb3JjZTogJ2FwcGx5V2VhdmVGaWVsZEZvcmNlcydcbiAgICB9XG4gIH0sXG4gIFtNT0RFUy5TSEFQRVNdOiB7XG4gICAgbG9hZDogKCkgPT4gaW1wb3J0KFwiL3NyYy9sZWdhY3kvbW9kdWxlcy9tb2Rlcy9zaGFwZXMuanNcIiksXG4gICAgaG9va3M6IHtcbiAgICAgIGluaXRpYWxpemU6ICdpbml0aWFsaXplU2hhcGVzJyxcbiAgICAgIGNsZWFudXA6ICdjbGVhbnVwU2hhcGVzJyxcbiAgICAgIGZvcmNlOiAnYXBwbHlTaGFwZXNGb3JjZXMnLFxuICAgICAgY3VzdG9tU3RlcDogJ3N0ZXBTaGFwZXMnXG4gICAgfVxuICB9LFxuICBbTU9ERVMuUFJFU1NVUkVfQ1JVQ0lCTEVdOiB7XG4gICAgbG9hZDogKCkgPT4gaW1wb3J0KFwiL3NyYy9sZWdhY3kvbW9kdWxlcy9tb2Rlcy9wcmVzc3VyZS1jcnVjaWJsZS5qc1wiKSxcbiAgICBob29rczoge1xuICAgICAgaW5pdGlhbGl6ZTogJ2luaXRpYWxpemVQcmVzc3VyZUNydWNpYmxlJyxcbiAgICAgIGZvcmNlOiAnYXBwbHlQcmVzc3VyZUNydWNpYmxlRm9yY2VzJyxcbiAgICAgIHJlbmRlcjogJ3JlbmRlclByZXNzdXJlQ3J1Y2libGUnXG4gICAgfVxuICB9LFxuICBbTU9ERVMuUEFSVElDTEVfRk9VTlRBSU5dOiB7XG4gICAgbG9hZDogKCkgPT4gaW1wb3J0KFwiL3NyYy9sZWdhY3kvbW9kdWxlcy9tb2Rlcy9wYXJ0aWNsZS1mb3VudGFpbi5qc1wiKSxcbiAgICBob29rczoge1xuICAgICAgaW5pdGlhbGl6ZTogJ2luaXRpYWxpemVQYXJ0aWNsZUZvdW50YWluJyxcbiAgICAgIGZvcmNlOiAnYXBwbHlQYXJ0aWNsZUZvdW50YWluRm9yY2VzJyxcbiAgICAgIHVwZGF0ZTogJ3VwZGF0ZVBhcnRpY2xlRm91bnRhaW4nXG4gICAgfVxuICB9XG59O1xuXG5jb25zdCBtb2RlUnVudGltZUNhY2hlID0gbmV3IE1hcCgpO1xuY29uc3QgbW9kZUxvYWRQcm9taXNlcyA9IG5ldyBNYXAoKTtcbmxldCBwcmVsb2FkQWxsU3RhcnRlZCA9IGZhbHNlO1xubGV0IG1vZGVDaGFuZ2VUb2tlbiA9IDA7XG5sZXQgbGVnYWN5VmlzdWFsVHJhbnNpdGlvbiA9IG51bGw7XG5sZXQgdW5yZWdpc3RlckxlZ2FjeVZpc3VhbFRyYW5zaXRpb24gPSBudWxsO1xuXG5mdW5jdGlvbiB0b0ZuKG1vZHVsZSwga2V5KSB7XG4gIGlmICgha2V5KSByZXR1cm4gbnVsbDtcbiAgY29uc3QgY2FuZGlkYXRlID0gbW9kdWxlPy5ba2V5XTtcbiAgcmV0dXJuIHR5cGVvZiBjYW5kaWRhdGUgPT09ICdmdW5jdGlvbicgPyBjYW5kaWRhdGUgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBidWlsZE1vZGVSdW50aW1lKG1vZHVsZSwgaG9va3MgPSB7fSkge1xuICByZXR1cm4ge1xuICAgIGluaXRpYWxpemU6IHRvRm4obW9kdWxlLCBob29rcy5pbml0aWFsaXplKSxcbiAgICBjbGVhbnVwOiB0b0ZuKG1vZHVsZSwgaG9va3MuY2xlYW51cCksXG4gICAgZm9yY2U6IHRvRm4obW9kdWxlLCBob29rcy5mb3JjZSksXG4gICAgdXBkYXRlOiB0b0ZuKG1vZHVsZSwgaG9va3MudXBkYXRlKSxcbiAgICBwcmVSZW5kZXI6IHRvRm4obW9kdWxlLCBob29rcy5wcmVSZW5kZXIpLFxuICAgIHBvc3RSZW5kZXI6IHRvRm4obW9kdWxlLCBob29rcy5wb3N0UmVuZGVyKSxcbiAgICBjdXN0b21SZW5kZXI6IHRvRm4obW9kdWxlLCBob29rcy5yZW5kZXIpLFxuICAgIGRlcHRoUmVuZGVyOiB0b0ZuKG1vZHVsZSwgaG9va3MuZGVwdGhSZW5kZXIpLFxuICAgIGN1c3RvbVN0ZXA6IHRvRm4obW9kdWxlLCBob29rcy5jdXN0b21TdGVwKSxcbiAgICBib3VuZHM6IHRvRm4obW9kdWxlLCBob29rcy5ib3VuZHMpLFxuICAgIHZpc3VhbFRyYW5zaXRpb25Db3VudDogdG9Gbihtb2R1bGUsIGhvb2tzLnZpc3VhbFRyYW5zaXRpb25Db3VudCksXG4gICAgc2V0VmlzdWFsVHJhbnNpdGlvblNjYWxlOiB0b0ZuKG1vZHVsZSwgaG9va3Muc2V0VmlzdWFsVHJhbnNpdGlvblNjYWxlKVxuICB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBlbnN1cmVNb2RlUnVudGltZShtb2RlKSB7XG4gIGNvbnN0IGVudHJ5ID0gTU9ERV9SRUdJU1RSWVttb2RlXTtcbiAgaWYgKCFlbnRyeSkgcmV0dXJuIG51bGw7XG5cbiAgaWYgKG1vZGVSdW50aW1lQ2FjaGUuaGFzKG1vZGUpKSB7XG4gICAgcmV0dXJuIG1vZGVSdW50aW1lQ2FjaGUuZ2V0KG1vZGUpO1xuICB9XG5cbiAgaWYgKG1vZGVMb2FkUHJvbWlzZXMuaGFzKG1vZGUpKSB7XG4gICAgcmV0dXJuIG1vZGVMb2FkUHJvbWlzZXMuZ2V0KG1vZGUpO1xuICB9XG5cbiAgY29uc3QgbG9hZFByb21pc2UgPSBlbnRyeS5sb2FkKClcbiAgICAudGhlbigobW9kdWxlKSA9PiB7XG4gICAgICBjb25zdCBydW50aW1lID0gYnVpbGRNb2RlUnVudGltZShtb2R1bGUsIGVudHJ5Lmhvb2tzKTtcbiAgICAgIG1vZGVSdW50aW1lQ2FjaGUuc2V0KG1vZGUsIHJ1bnRpbWUpO1xuICAgICAgbW9kZUxvYWRQcm9taXNlcy5kZWxldGUobW9kZSk7XG4gICAgICByZXR1cm4gcnVudGltZTtcbiAgICB9KVxuICAgIC5jYXRjaCgoZXJyb3IpID0+IHtcbiAgICAgIG1vZGVMb2FkUHJvbWlzZXMuZGVsZXRlKG1vZGUpO1xuICAgICAgY29uc29sZS53YXJuKGBbTW9kZUxvYWRlcl0gRmFpbGVkIHRvIGxvYWQgXCIke21vZGV9XCJgLCBlcnJvcik7XG4gICAgICByZXR1cm4gbnVsbDtcbiAgICB9KTtcblxuICBtb2RlTG9hZFByb21pc2VzLnNldChtb2RlLCBsb2FkUHJvbWlzZSk7XG4gIHJldHVybiBsb2FkUHJvbWlzZTtcbn1cblxuZnVuY3Rpb24gbWF5YmVQcmVsb2FkQWxsTW9kZXMoKSB7XG4gIGNvbnN0IGdsb2JhbHMgPSBnZXRHbG9iYWxzKCk7XG4gIGlmIChnbG9iYWxzLmZlYXR1cmVMYXp5TW9kZUxvYWRpbmdFbmFibGVkICE9PSBmYWxzZSB8fCBwcmVsb2FkQWxsU3RhcnRlZCkgcmV0dXJuO1xuICBwcmVsb2FkQWxsU3RhcnRlZCA9IHRydWU7XG5cbiAgY29uc3QgbW9kZXMgPSBPYmplY3Qua2V5cyhNT0RFX1JFR0lTVFJZKTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBtb2Rlcy5sZW5ndGg7IGkrKykge1xuICAgIGNvbnN0IG1vZGUgPSBtb2Rlc1tpXTtcbiAgICB2b2lkIGVuc3VyZU1vZGVSdW50aW1lKG1vZGUpO1xuICB9XG59XG5cbmZ1bmN0aW9uIGdldFdhcm11cEZyYW1lc0Zvck1vZGUobW9kZSwgZ2xvYmFscykge1xuICAvLyBQZXItc2ltdWxhdGlvbiB3YXJtdXAgZnJhbWVzIChyZW5kZXItZnJhbWUgdW5pdHMpLlxuICAvLyBEZWZhdWx0IGlzIDEwIGV2ZXJ5d2hlcmUgdW5sZXNzIG92ZXJyaWRkZW4gdmlhIGNvbmZpZy9wYW5lbC5cbiAgY29uc3QgY29uZmlndXJlZEZyYW1lcyA9ICgoKSA9PiB7XG4gICAgc3dpdGNoIChtb2RlKSB7XG4gICAgY2FzZSBNT0RFUy5QSVQ6IHJldHVybiBnbG9iYWxzLnBpdFdhcm11cEZyYW1lcyA/PyAxMDtcbiAgICBjYXNlIE1PREVTLlBPUlRGT0xJT19QSVQ6IHJldHVybiBnbG9iYWxzLnBvcnRmb2xpb1BpdFdhcm11cEZyYW1lcyA/PyAwO1xuICAgIGNhc2UgTU9ERVMuRkxJRVM6IHJldHVybiBnbG9iYWxzLmZsaWVzV2FybXVwRnJhbWVzID8/IDEwO1xuICAgIGNhc2UgTU9ERVMuV0VJR0hUTEVTUzogcmV0dXJuIGdsb2JhbHMud2VpZ2h0bGVzc1dhcm11cEZyYW1lcyA/PyAxMDtcbiAgICBjYXNlIE1PREVTLldBVEVSOiByZXR1cm4gZ2xvYmFscy53YXRlcldhcm11cEZyYW1lcyA/PyAxMDtcbiAgICBjYXNlIE1PREVTLk1BR05FVElDOiByZXR1cm4gZ2xvYmFscy5tYWduZXRpY1dhcm11cEZyYW1lcyA/PyAxMDtcbiAgICBjYXNlIE1PREVTLkJVQkJMRVM6IHJldHVybiBnbG9iYWxzLmJ1YmJsZXNXYXJtdXBGcmFtZXMgPz8gMTA7XG4gICAgY2FzZSBNT0RFUy5LQUxFSURPU0NPUEU6IHJldHVybiBnbG9iYWxzLmthbGVpZG9zY29wZTNXYXJtdXBGcmFtZXMgPz8gZ2xvYmFscy5rYWxlaWRvc2NvcGVXYXJtdXBGcmFtZXMgPz8gMTA7XG4gICAgY2FzZSBNT0RFUy5LQUxFSURPU0NPUEVfUklGVDogcmV0dXJuIGdsb2JhbHMua2FsZWlkb3Njb3BlUmlmdFdhcm11cEZyYW1lcyA/PyA0NTtcbiAgICBjYXNlIE1PREVTLkNSSVRURVJTOiByZXR1cm4gZ2xvYmFscy5jcml0dGVyc1dhcm11cEZyYW1lcyA/PyAxMDtcbiAgICBjYXNlIE1PREVTLlNQSEVSRV8zRDogcmV0dXJuIGdsb2JhbHMuc3BoZXJlM2RXYXJtdXBGcmFtZXMgPz8gMTA7XG4gICAgY2FzZSBNT0RFUy5DVUJFXzNEOiByZXR1cm4gZ2xvYmFscy5jdWJlM2RXYXJtdXBGcmFtZXMgPz8gMTA7XG4gICAgY2FzZSBNT0RFUy5QQVJBTExBWF9GTE9BVDogcmV0dXJuIGdsb2JhbHMucGFyYWxsYXhGbG9hdFdhcm11cEZyYW1lcyA/PyAxMDtcbiAgICBjYXNlIE1PREVTLlNUQVJGSUVMRF8zRDogcmV0dXJuIGdsb2JhbHMuc3RhcmZpZWxkM2RXYXJtdXBGcmFtZXMgPz8gMTA7XG4gICAgY2FzZSBNT0RFUy5FTEFTVElDX0NFTlRFUjogcmV0dXJuIGdsb2JhbHMudGVuc2lvbkxvb21XYXJtdXBGcmFtZXMgPz8gODtcbiAgICBjYXNlIE1PREVTLkZMVUJCRVJfQkxPQjogcmV0dXJuIGdsb2JhbHMuZmx1YmJlckJsb2JXYXJtdXBGcmFtZXMgPz8gMTA7XG4gICAgY2FzZSBNT0RFUy5XRUFWRV9GSUVMRDogcmV0dXJuIGdsb2JhbHMud2VhdmVGaWVsZFdhcm11cEZyYW1lcyA/PyAwO1xuICAgIGNhc2UgTU9ERVMuU0hBUEVTOiByZXR1cm4gZ2xvYmFscy5zaGFwZXNXYXJtdXBGcmFtZXMgPz8gMDtcbiAgICBjYXNlIE1PREVTLlBSRVNTVVJFX0NSVUNJQkxFOiByZXR1cm4gZ2xvYmFscy5wcmVzc3VyZUNydWNpYmxlV2FybXVwRnJhbWVzID8/IDA7XG4gICAgY2FzZSBNT0RFUy5QQVJUSUNMRV9GT1VOVEFJTjogcmV0dXJuIGdsb2JhbHMucGFydGljbGVGb3VudGFpbldhcm11cEZyYW1lcyA/PyAwO1xuICAgIGRlZmF1bHQ6IHJldHVybiAxMDtcbiAgICB9XG4gIH0pKCk7XG5cbiAgLy8gV2FybXVwIHJ1bnMgc3luY2hyb25vdXNseSBiZWZvcmUgdGhlIGZpcnN0IHZpc2libGUgZnJhbWUuIEtlZXAgYSB0aW55XG4gIC8vIHNldHRsaW5nIGFsbG93YW5jZSBvbiBtb2JpbGUgd2l0aG91dCBibG9ja2luZyB0aGUgcm91dGUvdGl0bGUgZW50cmFuY2UuXG4gIGlmIChnbG9iYWxzLmlzTW9iaWxlIHx8IGdsb2JhbHMuaXNNb2JpbGVWaWV3cG9ydCkge1xuICAgIHJldHVybiBNYXRoLm1pbihjb25maWd1cmVkRnJhbWVzLCAyKTtcbiAgfVxuICByZXR1cm4gY29uZmlndXJlZEZyYW1lcztcbn1cblxuZnVuY3Rpb24gYXBwbHlNb2RlUGh5c2ljc1N0YXRlKG1vZGUsIGdsb2JhbHMpIHtcbiAgY29uc3QgemVyb0dyYXZpdHlNb2RlcyA9IG5ldyBTZXQoW1xuICAgIE1PREVTLkZMSUVTLFxuICAgIE1PREVTLldFSUdIVExFU1MsXG4gICAgTU9ERVMuV0FURVIsXG4gICAgTU9ERVMuTUFHTkVUSUMsXG4gICAgTU9ERVMuQlVCQkxFUyxcbiAgICBNT0RFUy5LQUxFSURPU0NPUEUsXG4gICAgTU9ERVMuS0FMRUlET1NDT1BFX1JJRlQsXG4gICAgTU9ERVMuU1BIRVJFXzNELFxuICAgIE1PREVTLkNVQkVfM0QsXG4gICAgTU9ERVMuQ1JJVFRFUlMsXG4gICAgTU9ERVMuUEFSQUxMQVhfRkxPQVQsXG4gICAgTU9ERVMuU1RBUkZJRUxEXzNELFxuICAgIE1PREVTLkVMQVNUSUNfQ0VOVEVSLFxuICAgIE1PREVTLkZMVUJCRVJfQkxPQixcbiAgICBNT0RFUy5XRUFWRV9GSUVMRCxcbiAgICBNT0RFUy5TSEFQRVMsXG4gICAgTU9ERVMuUFJFU1NVUkVfQ1JVQ0lCTEVcbiAgXSk7XG5cbiAgaWYgKGlzUGl0TGlrZU1vZGUobW9kZSkpIHtcbiAgICBnbG9iYWxzLmdyYXZpdHlNdWx0aXBsaWVyID0gZ2xvYmFscy5ncmF2aXR5TXVsdGlwbGllclBpdDtcbiAgICBnbG9iYWxzLkcgPSBnbG9iYWxzLkdFICogZ2xvYmFscy5ncmF2aXR5TXVsdGlwbGllcjtcbiAgICBnbG9iYWxzLnJlcGVsbGVyRW5hYmxlZCA9IG1vZGUgPT09IE1PREVTLlBJVDtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAobW9kZSA9PT0gTU9ERVMuUEFSVElDTEVfRk9VTlRBSU4pIHtcbiAgICBnbG9iYWxzLmdyYXZpdHlNdWx0aXBsaWVyID0gZ2xvYmFscy5wYXJ0aWNsZUZvdW50YWluR3Jhdml0eU11bHRpcGxpZXIgfHwgMS4wO1xuICAgIGdsb2JhbHMuRyA9IGdsb2JhbHMuR0UgKiBnbG9iYWxzLmdyYXZpdHlNdWx0aXBsaWVyO1xuICAgIGdsb2JhbHMucmVwZWxsZXJFbmFibGVkID0gdHJ1ZTtcbiAgICByZXR1cm47XG4gIH1cblxuICBpZiAoemVyb0dyYXZpdHlNb2Rlcy5oYXMobW9kZSkpIHtcbiAgICBnbG9iYWxzLmdyYXZpdHlNdWx0aXBsaWVyID0gMC4wO1xuICAgIGdsb2JhbHMuRyA9IDA7XG4gICAgZ2xvYmFscy5yZXBlbGxlckVuYWJsZWQgPSBmYWxzZTtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXN0b3JlQ3JpdHRlcnNPdmVycmlkZXNJZk5lZWRlZChnbG9iYWxzLCBuZXh0TW9kZSkge1xuICBpZiAoZ2xvYmFscy5jdXJyZW50TW9kZSAhPT0gTU9ERVMuQ1JJVFRFUlMgfHwgbmV4dE1vZGUgPT09IE1PREVTLkNSSVRURVJTKSByZXR1cm47XG5cbiAgaWYgKGdsb2JhbHMuX3Jlc3RCZWZvcmVDcml0dGVycyAhPT0gdW5kZWZpbmVkKSB7XG4gICAgZ2xvYmFscy5SRVNUID0gZ2xvYmFscy5fcmVzdEJlZm9yZUNyaXR0ZXJzO1xuICAgIGRlbGV0ZSBnbG9iYWxzLl9yZXN0QmVmb3JlQ3JpdHRlcnM7XG4gIH1cbiAgaWYgKGdsb2JhbHMuX2ZyaWN0aW9uQmVmb3JlQ3JpdHRlcnMgIT09IHVuZGVmaW5lZCkge1xuICAgIGdsb2JhbHMuRlJJQ1RJT04gPSBnbG9iYWxzLl9mcmljdGlvbkJlZm9yZUNyaXR0ZXJzO1xuICAgIGRlbGV0ZSBnbG9iYWxzLl9mcmljdGlvbkJlZm9yZUNyaXR0ZXJzO1xuICB9XG4gIGlmIChnbG9iYWxzLl9iYWxsU3BhY2luZ0JlZm9yZUNyaXR0ZXJzICE9PSB1bmRlZmluZWQpIHtcbiAgICBnbG9iYWxzLmJhbGxTcGFjaW5nID0gZ2xvYmFscy5fYmFsbFNwYWNpbmdCZWZvcmVDcml0dGVycztcbiAgICBkZWxldGUgZ2xvYmFscy5fYmFsbFNwYWNpbmdCZWZvcmVDcml0dGVycztcbiAgfVxufVxuXG5mdW5jdGlvbiBhcHBseUNyaXR0ZXJzT3ZlcnJpZGVzSWZOZWVkZWQoZ2xvYmFscywgbW9kZSkge1xuICBpZiAobW9kZSAhPT0gTU9ERVMuQ1JJVFRFUlMpIHJldHVybjtcbiAgaWYgKGdsb2JhbHMuX3Jlc3RCZWZvcmVDcml0dGVycyA9PT0gdW5kZWZpbmVkKSBnbG9iYWxzLl9yZXN0QmVmb3JlQ3JpdHRlcnMgPSBnbG9iYWxzLlJFU1Q7XG4gIGlmIChnbG9iYWxzLl9mcmljdGlvbkJlZm9yZUNyaXR0ZXJzID09PSB1bmRlZmluZWQpIGdsb2JhbHMuX2ZyaWN0aW9uQmVmb3JlQ3JpdHRlcnMgPSBnbG9iYWxzLkZSSUNUSU9OO1xuICBpZiAoZ2xvYmFscy5fYmFsbFNwYWNpbmdCZWZvcmVDcml0dGVycyA9PT0gdW5kZWZpbmVkKSBnbG9iYWxzLl9iYWxsU3BhY2luZ0JlZm9yZUNyaXR0ZXJzID0gZ2xvYmFscy5iYWxsU3BhY2luZztcblxuICBnbG9iYWxzLlJFU1QgPSBnbG9iYWxzLmNyaXR0ZXJSZXN0aXR1dGlvbiA/PyBnbG9iYWxzLlJFU1Q7XG4gIGdsb2JhbHMuRlJJQ1RJT04gPSBnbG9iYWxzLmNyaXR0ZXJGcmljdGlvbiA/PyBnbG9iYWxzLkZSSUNUSU9OO1xuICBnbG9iYWxzLmJhbGxTcGFjaW5nID0gTWF0aC5taW4oZ2xvYmFscy5iYWxsU3BhY2luZyB8fCAwLCAxLjApO1xufVxuXG5mdW5jdGlvbiBnZXRSdW50aW1lRm9yQ3VycmVudE1vZGUoKSB7XG4gIGNvbnN0IGdsb2JhbHMgPSBnZXRHbG9iYWxzKCk7XG4gIGNvbnN0IG1vZGUgPSBnbG9iYWxzLmN1cnJlbnRNb2RlO1xuICBjb25zdCBydW50aW1lID0gbW9kZVJ1bnRpbWVDYWNoZS5nZXQobW9kZSk7XG4gIGlmIChydW50aW1lKSByZXR1cm4gcnVudGltZTtcblxuICBpZiAoIW1vZGVMb2FkUHJvbWlzZXMuaGFzKG1vZGUpKSB7XG4gICAgdm9pZCBlbnN1cmVNb2RlUnVudGltZShtb2RlKTtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZnVuY3Rpb24gZW5zdXJlTGVnYWN5VmlzdWFsVHJhbnNpdGlvbigpIHtcbiAgaWYgKCFsZWdhY3lWaXN1YWxUcmFuc2l0aW9uKSB7XG4gICAgbGVnYWN5VmlzdWFsVHJhbnNpdGlvbiA9IGNyZWF0ZUluZGV4ZWRTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvbih7XG4gICAgICBzb3VyY2VJZDogJ2hvbWUtY2FudmFzJyxcbiAgICAgIGdldENvdW50OiAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGdsb2JhbHMgPSBnZXRHbG9iYWxzKCk7XG4gICAgICAgIGNvbnN0IHJ1bnRpbWUgPSBnZXRSdW50aW1lRm9yQ3VycmVudE1vZGUoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBydW50aW1lPy52aXN1YWxUcmFuc2l0aW9uQ291bnQgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICByZXR1cm4gcnVudGltZS52aXN1YWxUcmFuc2l0aW9uQ291bnQoKTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gQXJyYXkuaXNBcnJheShnbG9iYWxzLmJhbGxzKSA/IGdsb2JhbHMuYmFsbHMubGVuZ3RoIDogMDtcbiAgICAgIH0sXG4gICAgICBzZXRTY2FsZUF0OiAoaW5kZXgsIHNjYWxlKSA9PiB7XG4gICAgICAgIGNvbnN0IGdsb2JhbHMgPSBnZXRHbG9iYWxzKCk7XG4gICAgICAgIGNvbnN0IHJ1bnRpbWUgPSBnZXRSdW50aW1lRm9yQ3VycmVudE1vZGUoKTtcbiAgICAgICAgaWYgKHR5cGVvZiBydW50aW1lPy5zZXRWaXN1YWxUcmFuc2l0aW9uU2NhbGUgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgICBydW50aW1lLnNldFZpc3VhbFRyYW5zaXRpb25TY2FsZShpbmRleCwgc2NhbGUpO1xuICAgICAgICAgIHJldHVybjtcbiAgICAgICAgfVxuICAgICAgICBjb25zdCBiYWxsID0gQXJyYXkuaXNBcnJheShnbG9iYWxzLmJhbGxzKSA/IGdsb2JhbHMuYmFsbHNbaW5kZXhdIDogbnVsbDtcbiAgICAgICAgaWYgKGJhbGwpIGJhbGwudmlzdWFsU2NhbGUgPSBzY2FsZTtcbiAgICAgIH0sXG4gICAgICBnZXRTZWVkOiAoKSA9PiB7XG4gICAgICAgIGNvbnN0IGdsb2JhbHMgPSBnZXRHbG9iYWxzKCk7XG4gICAgICAgIGNvbnN0IG1vZGUgPSBTdHJpbmcoZ2xvYmFscy5jdXJyZW50TW9kZSB8fCAnJyk7XG4gICAgICAgIGxldCBoYXNoID0gMjE2NjEzNjI2MTtcbiAgICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBtb2RlLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgICAgICAgaGFzaCBePSBtb2RlLmNoYXJDb2RlQXQoaSk7XG4gICAgICAgICAgaGFzaCA9IE1hdGguaW11bChoYXNoLCAxNjc3NzYxOSk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIGhhc2ggPj4+IDA7XG4gICAgICB9LFxuICAgIH0pO1xuICB9XG5cbiAgaWYgKCF1bnJlZ2lzdGVyTGVnYWN5VmlzdWFsVHJhbnNpdGlvbikge1xuICAgIHVucmVnaXN0ZXJMZWdhY3lWaXN1YWxUcmFuc2l0aW9uID0gcmVnaXN0ZXJTaW11bGF0aW9uVmlzdWFsVHJhbnNpdGlvbignaG9tZS1jYW52YXMnLCBsZWdhY3lWaXN1YWxUcmFuc2l0aW9uKTtcbiAgfVxuXG4gIHJldHVybiBsZWdhY3lWaXN1YWxUcmFuc2l0aW9uO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gaW5pdE1vZGVTeXN0ZW0oKSB7XG4gIGVuc3VyZUxlZ2FjeVZpc3VhbFRyYW5zaXRpb24oKTtcbiAgbWF5YmVQcmVsb2FkQWxsTW9kZXMoKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRpc3Bvc2VNb2RlU3lzdGVtKCkge1xuICBtb2RlQ2hhbmdlVG9rZW4gKz0gMTtcbiAgdHJ5IHtcbiAgICBjb25zdCBjdXJyZW50TW9kZSA9IGdldEdsb2JhbHMoKT8uY3VycmVudE1vZGU7XG4gICAgbW9kZVJ1bnRpbWVDYWNoZS5nZXQoY3VycmVudE1vZGUpPy5jbGVhbnVwPy4oKTtcbiAgfSBjYXRjaCAoZSkge31cbiAgaWYgKHVucmVnaXN0ZXJMZWdhY3lWaXN1YWxUcmFuc2l0aW9uKSB7XG4gICAgdW5yZWdpc3RlckxlZ2FjeVZpc3VhbFRyYW5zaXRpb24oKTtcbiAgICB1bnJlZ2lzdGVyTGVnYWN5VmlzdWFsVHJhbnNpdGlvbiA9IG51bGw7XG4gIH1cbiAgbGVnYWN5VmlzdWFsVHJhbnNpdGlvbj8uZGVzdHJveT8uKCk7XG4gIGxlZ2FjeVZpc3VhbFRyYW5zaXRpb24gPSBudWxsO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gc2V0TW9kZShpbnB1dE1vZGUpIHtcbiAgY29uc3QgZ2xvYmFscyA9IGdldEdsb2JhbHMoKTtcbiAgbGV0IG1vZGUgPSBpbnB1dE1vZGU7XG4gIGNvbnN0IHByZXZpb3VzTW9kZSA9IGdsb2JhbHMuY3VycmVudE1vZGU7XG5cbiAgY29uc3Qgcm91dGVCYWNrZWRIcmVmID0gUk9VVEVfQkFDS0VEX01PREVfSFJFRlNbbW9kZV07XG4gIGlmIChyb3V0ZUJhY2tlZEhyZWYpIHtcbiAgICBhbm5vdW5jZVRvU2NyZWVuUmVhZGVyKGBTd2l0Y2hlZCB0byAke01PREVfTkFNRVNbbW9kZV0gfHwgZ2V0U2ltdWxhdGlvbk5hbWUobW9kZSl9IG1vZGVgKTtcbiAgICB3cml0ZU1hbnVhbFNpbXVsYXRpb25Gb2N1cyhtb2RlKTtcbiAgICByZXR1cm4gdHJ1ZTtcbiAgfVxuXG4gIG1heWJlUHJlbG9hZEFsbE1vZGVzKCk7XG5cbiAgY29uc3QgYWN0aXZlVG9rZW4gPSArK21vZGVDaGFuZ2VUb2tlbjtcbiAgY29uc3QgcnVudGltZSA9IGF3YWl0IGVuc3VyZU1vZGVSdW50aW1lKG1vZGUpO1xuICBpZiAoYWN0aXZlVG9rZW4gIT09IG1vZGVDaGFuZ2VUb2tlbikgcmV0dXJuIGZhbHNlO1xuXG4gIGlmICghcnVudGltZSB8fCB0eXBlb2YgcnVudGltZS5pbml0aWFsaXplICE9PSAnZnVuY3Rpb24nKSB7XG4gICAgY29uc29sZS53YXJuKGBbTW9kZUxvYWRlcl0gUnVudGltZSBmb3IgXCIke21vZGV9XCIgbWlzc2luZyBpbml0aWFsaXplIGhvb2suYCk7XG4gICAgY29uc3QgcmVjb3ZlcnlNb2RlID0gcHJldmlvdXNNb2RlICYmIHByZXZpb3VzTW9kZSAhPT0gbW9kZSA/IHByZXZpb3VzTW9kZSA6IE1PREVTLlBJVDtcbiAgICBpZiAocmVjb3ZlcnlNb2RlICE9PSBtb2RlKSBhd2FpdCBzZXRNb2RlKHJlY292ZXJ5TW9kZSk7XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG5cbiAgY29uc3QgcHJldk1vZGUgPSBwcmV2aW91c01vZGU7XG4gIHRyeSB7XG4gICAgLy8gUmVzZXQgc3RhdGVmdWwgc3lzdGVtcyBvbiBtb2RlIHN3aXRjaCB0byBwcmV2ZW50IGFjY3VtdWxhdGlvbiBhcnRpZmFjdHMuXG4gICAgbW9kZVJ1bnRpbWVDYWNoZS5nZXQocHJldmlvdXNNb2RlKT8uY2xlYW51cD8uKCk7XG4gICAgcmVzZXRQaHlzaWNzQWNjdW11bGF0b3IoKTtcbiAgICByZXNldEFkYXB0aXZlVGhyb3R0bGUoKTtcbiAgICByZXN0b3JlQ3JpdHRlcnNPdmVycmlkZXNJZk5lZWRlZChnbG9iYWxzLCBtb2RlKTtcblxuICAgIHNldE1vZGVTdGF0ZShtb2RlKTtcblxuICAgIC8vIEN1cnNvciBjb2xvcjogb25seSBhdXRvLWN5Y2xlIHdoZW4gc3dpdGNoaW5nIHRvIGEgZGlmZmVyZW50IG1vZGUuXG4gICAgaWYgKG1vZGUgIT09IHByZXZNb2RlKSB7XG4gICAgICB0cnkgeyBtYXliZUF1dG9QaWNrQ3Vyc29yQ29sb3I/LignbW9kZScpOyB9IGNhdGNoIChlKSB7fVxuICAgIH1cblxuICAgIGNvbnNvbGUubG9nKGBTd2l0Y2hpbmcgdG8gbW9kZTogJHttb2RlfWApO1xuICAgIGFubm91bmNlVG9TY3JlZW5SZWFkZXIoYFN3aXRjaGVkIHRvICR7TU9ERV9OQU1FU1ttb2RlXSB8fCBtb2RlfSBtb2RlYCk7XG5cbiAgICAvLyBVcGRhdGUgY29udGFpbmVyIGNsYXNzIGZvciBtb2RlLXNwZWNpZmljIHN0eWxpbmcuXG4gICAgLy8gUHJlc2VydmUgZGFyay1tb2RlIGNsYXNzIHdoZW4gc3dpdGNoaW5nIG1vZGVzLlxuICAgIGlmIChnbG9iYWxzLmNvbnRhaW5lcikge1xuICAgICAgY29uc3Qgd2FzRGFyayA9IGdsb2JhbHMuY29udGFpbmVyLmNsYXNzTGlzdC5jb250YWlucygnZGFyay1tb2RlJyk7XG4gICAgICBnbG9iYWxzLmNvbnRhaW5lci5jbGFzc05hbWUgPSAnJztcbiAgICAgIGlmIChpc1BpdExpa2VNb2RlKG1vZGUpKSB7XG4gICAgICAgIGdsb2JhbHMuY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoJ21vZGUtcGl0Jyk7XG4gICAgICB9XG4gICAgICBpZiAod2FzRGFyayB8fCBnbG9iYWxzLmlzRGFya01vZGUpIHtcbiAgICAgICAgZ2xvYmFscy5jb250YWluZXIuY2xhc3NMaXN0LmFkZCgnZGFyay1tb2RlJyk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gUmVzaXplIGNhbnZhcyB0byBtYXRjaCBtb2RlIGdlb21ldHJ5LlxuICAgIHJlc2l6ZSgpO1xuXG4gICAgYXBwbHlNb2RlUGh5c2ljc1N0YXRlKG1vZGUsIGdsb2JhbHMpO1xuICAgIGFwcGx5Q3JpdHRlcnNPdmVycmlkZXNJZk5lZWRlZChnbG9iYWxzLCBtb2RlKTtcbiAgICByZXNldENvbG9yRGlzdHJpYnV0aW9uQ292ZXJhZ2UoKTtcbiAgICBydW50aW1lLmluaXRpYWxpemUoKTtcbiAgICBlbnN1cmVMZWdhY3lWaXN1YWxUcmFuc2l0aW9uKCkuc2V0VmlzdWFsU2NhbGUoZ2V0SW5pdGlhbFNpbXVsYXRpb25WaXN1YWxTY2FsZSgpKTtcblxuICAgIGNvbnNvbGUubG9nKGBNb2RlICR7bW9kZX0gaW5pdGlhbGl6ZWQgd2l0aCAke2dsb2JhbHMuYmFsbHMubGVuZ3RofSBiYWxsc2ApO1xuXG4gICAgLy8gU3luYyBsZWdlbmQgZmlsdGVyIHN5c3RlbSB3aXRoIG5ldyBiYWxscy5cbiAgICBpZiAodHlwZW9mIHdpbmRvdyAhPT0gJ3VuZGVmaW5lZCcgJiYgd2luZG93LmxlZ2VuZEZpbHRlciAmJiB3aW5kb3cubGVnZW5kRmlsdGVyLnN5bmNBbGxCYWxscykge1xuICAgICAgdHJ5IHtcbiAgICAgICAgd2luZG93LmxlZ2VuZEZpbHRlci5zeW5jQWxsQmFsbHMoKTtcbiAgICAgIH0gY2F0Y2ggKGUpIHtcbiAgICAgICAgY29uc29sZS53YXJuKCdMZWdlbmQgZmlsdGVyIHN5bmMgZmFpbGVkOicsIGUpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNjaGVkdWxlIHdhcm11cCBjb25zdW1wdGlvbiAobm8gcmVuZGVyaW5nIGR1cmluZyB3YXJtdXApLlxuICAgIGNvbnN0IHdhcm11cEZyYW1lcyA9IE1hdGgubWF4KDAsIE1hdGgucm91bmQoZ2V0V2FybXVwRnJhbWVzRm9yTW9kZShtb2RlLCBnbG9iYWxzKSB8fCAwKSk7XG4gICAgZ2xvYmFscy53YXJtdXBGcmFtZXNSZW1haW5pbmcgPSB3YXJtdXBGcmFtZXM7XG5cbiAgICAvLyBCcm9hZGNhc3QgbW9kZSBjaGFuZ2VzIGZvciBsaWdodHdlaWdodCBVSSBtaWNyby1pbnRlcmFjdGlvbnMuXG4gICAgaWYgKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmIG1vZGUgIT09IHByZXZNb2RlKSB7XG4gICAgICB0cnkge1xuICAgICAgICB3aW5kb3cuZGlzcGF0Y2hFdmVudChuZXcgQ3VzdG9tRXZlbnQoJ2JiOm1vZGVDaGFuZ2VkJywgeyBkZXRhaWw6IHsgcHJldk1vZGUsIG1vZGUgfSB9KSk7XG4gICAgICB9IGNhdGNoIChlKSB7fVxuICAgIH1cblxuICAgIHJldHVybiB0cnVlO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUud2FybihgW01vZGVMb2FkZXJdIEZhaWxlZCB3aGlsZSBhcHBseWluZyBtb2RlIFwiJHttb2RlfVwiYCwgZXJyb3IpO1xuICAgIGdsb2JhbHMubGFzdE1vZGVGYWlsdXJlID0ge1xuICAgICAgbW9kZSxcbiAgICAgIHByZXZpb3VzTW9kZTogcHJldk1vZGUsXG4gICAgICBtZXNzYWdlOiBlcnJvcj8ubWVzc2FnZSB8fCBTdHJpbmcoZXJyb3IpLFxuICAgICAgYXQ6IHR5cGVvZiBwZXJmb3JtYW5jZSAhPT0gJ3VuZGVmaW5lZCcgPyBwZXJmb3JtYW5jZS5ub3coKSA6IERhdGUubm93KCksXG4gICAgfTtcbiAgICB0cnkge1xuICAgICAgd2luZG93LmRpc3BhdGNoRXZlbnQobmV3IEN1c3RvbUV2ZW50KCdiYjptb2RlRmFpbGVkJywge1xuICAgICAgICBkZXRhaWw6IGdsb2JhbHMubGFzdE1vZGVGYWlsdXJlLFxuICAgICAgfSkpO1xuICAgIH0gY2F0Y2gge1xuICAgICAgLy8gUnVudGltZSByZXN0b3JhdGlvbiBpcyBtb3JlIGltcG9ydGFudCB0aGFuIGRpYWdub3N0aWNzLlxuICAgIH1cbiAgICBjb25zdCByZWNvdmVyeU1vZGUgPSBwcmV2TW9kZSAmJiBwcmV2TW9kZSAhPT0gbW9kZSA/IHByZXZNb2RlIDogTU9ERVMuUElUO1xuICAgIGlmIChyZWNvdmVyeU1vZGUgIT09IG1vZGUpIHtcbiAgICAgIGF3YWl0IHNldE1vZGUocmVjb3ZlcnlNb2RlKTtcbiAgICB9XG4gICAgcmV0dXJuIGZhbHNlO1xuICB9XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNldEN1cnJlbnRNb2RlKCkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICB0cnkgeyBtYXliZUF1dG9QaWNrQ3Vyc29yQ29sb3I/LigncmVzZXQnKTsgfSBjYXRjaCAoZSkge31cbiAgcmV0dXJuIHNldE1vZGUoZ2xvYmFscy5jdXJyZW50TW9kZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRGb3JjZUFwcGxpY2F0b3IoKSB7XG4gIGNvbnN0IHJ1bnRpbWUgPSBnZXRSdW50aW1lRm9yQ3VycmVudE1vZGUoKTtcbiAgcmV0dXJuIHJ1bnRpbWU/LmZvcmNlIHx8IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlVXBkYXRlcigpIHtcbiAgY29uc3QgcnVudGltZSA9IGdldFJ1bnRpbWVGb3JDdXJyZW50TW9kZSgpO1xuICByZXR1cm4gcnVudGltZT8udXBkYXRlIHx8IG51bGw7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRNb2RlUmVuZGVyZXIoKSB7XG4gIGNvbnN0IHJ1bnRpbWUgPSBnZXRSdW50aW1lRm9yQ3VycmVudE1vZGUoKTtcbiAgaWYgKCFydW50aW1lPy5wcmVSZW5kZXIgJiYgIXJ1bnRpbWU/LnBvc3RSZW5kZXIpIHJldHVybiBudWxsO1xuICByZXR1cm4ge1xuICAgIHByZVJlbmRlcjogcnVudGltZS5wcmVSZW5kZXIgfHwgbnVsbCxcbiAgICBwb3N0UmVuZGVyOiBydW50aW1lLnBvc3RSZW5kZXIgfHwgbnVsbFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kZUN1c3RvbVJlbmRlcmVyKCkge1xuICBjb25zdCBydW50aW1lID0gZ2V0UnVudGltZUZvckN1cnJlbnRNb2RlKCk7XG4gIHJldHVybiBydW50aW1lPy5jdXN0b21SZW5kZXIgfHwgbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVEZXB0aFJlbmRlcmVyKCkge1xuICBjb25zdCBydW50aW1lID0gZ2V0UnVudGltZUZvckN1cnJlbnRNb2RlKCk7XG4gIHJldHVybiBydW50aW1lPy5kZXB0aFJlbmRlciB8fCBudWxsO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0TW9kZUN1c3RvbVN0ZXAoKSB7XG4gIGNvbnN0IHJ1bnRpbWUgPSBnZXRSdW50aW1lRm9yQ3VycmVudE1vZGUoKTtcbiAgcmV0dXJuIHJ1bnRpbWU/LmN1c3RvbVN0ZXAgfHwgbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldE1vZGVCb3VuZHNIYW5kbGVyKCkge1xuICBjb25zdCBydW50aW1lID0gZ2V0UnVudGltZUZvckN1cnJlbnRNb2RlKCk7XG4gIHJldHVybiBydW50aW1lPy5ib3VuZHMgfHwgbnVsbDtcbn1cbiJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFD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LENBQUMsSUFBSTtBQUMzRDs7QUFFQSxRQUFRLENBQUMsZ0JBQWdCLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDVCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDO0FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUM7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQztB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T0FBTyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyx3QkFBd0IsQ0FBQyxDQUFDO0FBQ2xELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDckUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsd0JBQXdCLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDO0FBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNoQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDL0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLEtBQUs7QUFDMUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVU7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUNwQyxDQUFD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QUFDLENBQUMsd0JBQXdCLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdELENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUM3QyxDQUFDLENBQUMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsUUFBUSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDOztBQUUxRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU87QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLO0FBQ3BELENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUN2RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7O0FBRVosQ0FBQyxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxJQUFJLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQywrQkFBK0IsQ0FBQyxDQUFDLENBQUM7O0FBRXBGLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsV0FBVyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQzs7QUFFOUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLO0FBQy9DLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ2xHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsWUFBWSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxFQUFFLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDL0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsc0JBQXNCLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLFlBQVk7O0FBRWhELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLFlBQVk7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDVixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsRUFBRSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9GLENBQUMs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