// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      MODE CONTROLLER (COMPLETE)                              ║
// ║         Extracted from balls-source.html lines 3999-4085                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { MODES, CONSTANTS } from '../core/constants.js';
import { setMode as setModeState, getGlobals } from '../core/state.js';
import { initializeFlies, applyFliesForces } from './flies.js';
import { initializeBallPit, applyBallPitForces } from './ball-pit.js';
import { initializeWeightless, applyWeightlessForces } from './weightless.js';
import { resize } from '../rendering/renderer.js';
import { initializeWater, applyWaterForces, updateWaterRipples } from './water.js';
import { initializeVortex, applyVortexForces } from './vortex.js';

import { initializeMagnetic, applyMagneticForces, updateMagnetic } from './magnetic.js';
import { initializeBubbles, applyBubblesForces, updateBubbles } from './bubbles.js';
import { initializeKaleidoscope, applyKaleidoscopeForces } from './kaleidoscope.js';
import { initializeCritters, applyCrittersForces, updateCrittersGrid, renderCrittersWaypoints } from './critters.js';
import { initializeNeural, applyNeuralForces, preRenderNeural, updateNeural } from './neural.js';
import { initializeParallaxLinear, applyParallaxLinearForces, updateParallaxLinearMouse } from './parallax-linear.js';
import { initializeParallaxFloat, applyParallaxFloatForces, updateParallaxFloatMouse } from './parallax-float.js';
import { initialize3DSphere, apply3DSphereForces } from './3d-sphere.js';
import { initialize3DCube, apply3DCubeForces } from './3d-cube.js';
import { initializeStarfield3D, applyStarfield3DForces, updateStarfield3D, renderStarfield3D } from './starfield-3d.js';
import { initializeElasticCenter, applyElasticCenterForces, updateElasticCenter } from './elastic-center.js';
import { initializeDvdLogo, applyDvdLogoForces, updateDvdLogo } from './dvd-logo.js';

import { initializeParticleFountain, applyParticleFountainForces, updateParticleFountain } from './particle-fountain.js';
import { initializeShootingStars, applyShootingStarsForces, updateShootingStars, renderShootingStars } from './shooting-stars.js';
import { announceToScreenReader } from '../utils/accessibility.js';
import { maybeAutoPickCursorColor } from '../visual/colors.js';
import { resetPhysicsAccumulator } from '../physics/engine.js';
import { resetAdaptiveThrottle } from '../rendering/loop.js';

export { MODES };

export function initModeSystem() {
  // Initialize mode system
}

function getWarmupFramesForMode(mode, globals) {
  // Per-simulation warmup frames (render-frame units).
  // Default is 10 everywhere unless overridden via config/panel.
  switch (mode) {
    case MODES.PIT: return globals.pitWarmupFrames ?? 10;
    case MODES.FLIES: return globals.fliesWarmupFrames ?? 10;
    case MODES.WEIGHTLESS: return globals.weightlessWarmupFrames ?? 10;
    case MODES.WATER: return globals.waterWarmupFrames ?? 10;
    case MODES.VORTEX: return globals.vortexWarmupFrames ?? 10;

    case MODES.MAGNETIC: return globals.magneticWarmupFrames ?? 10;
    case MODES.BUBBLES: return globals.bubblesWarmupFrames ?? 10;
    case MODES.KALEIDOSCOPE: return globals.kaleidoscope3WarmupFrames ?? globals.kaleidoscopeWarmupFrames ?? 10;
    case MODES.CRITTERS: return globals.crittersWarmupFrames ?? 10;
    case MODES.NEURAL: return globals.neuralWarmupFrames ?? 10;
    case MODES.SPHERE_3D: return globals.sphere3dWarmupFrames ?? 10;
    case MODES.CUBE_3D: return globals.cube3dWarmupFrames ?? 10;
    case MODES.PARALLAX_LINEAR: return globals.parallaxLinearWarmupFrames ?? 10;
    case MODES.PARALLAX_FLOAT: return globals.parallaxFloatWarmupFrames ?? 10;
    case MODES.STARFIELD_3D: return globals.starfield3dWarmupFrames ?? 10;
    case MODES.ELASTIC_CENTER: return globals.elasticCenterWarmupFrames ?? 10;
    case MODES.DVD_LOGO: return globals.dvdLogoWarmupFrames ?? 10;

    case MODES.PARTICLE_FOUNTAIN: return globals.particleFountainWarmupFrames ?? 0;
    case MODES.SHOOTING_STARS: return globals.shootingStarsWarmupFrames ?? 10;
    default: return 10;
  }
}

export function setMode(mode) {
  const globals = getGlobals();
  const prevMode = globals.currentMode;
  
  // ════════════════════════════════════════════════════════════════════════════════
  // PERFORMANCE: Reset all stateful systems on mode switch to prevent accumulation
  // This fixes the "slower and slower" bug when switching through modes
  // ════════════════════════════════════════════════════════════════════════════════
  resetPhysicsAccumulator();
  resetAdaptiveThrottle();
  
  // Restore physics overrides when leaving Critters mode
  if (globals.currentMode === MODES.CRITTERS && mode !== MODES.CRITTERS) {
    if (globals._restBeforeCritters !== undefined) {
      globals.REST = globals._restBeforeCritters;
      delete globals._restBeforeCritters;
    }
    if (globals._frictionBeforeCritters !== undefined) {
      globals.FRICTION = globals._frictionBeforeCritters;
      delete globals._frictionBeforeCritters;
    }
    // Critters-only spacing override cleanup
    if (globals._ballSpacingBeforeCritters !== undefined) {
      globals.ballSpacing = globals._ballSpacingBeforeCritters;
      delete globals._ballSpacingBeforeCritters;
    }
  }
  
  
  // Kaleidoscope no longer overrides global spacing (keeps parameters config-driven).
  
  setModeState(mode);
  
  // Cursor color: only auto-cycle when switching to a different mode.
  if (mode !== prevMode) {
    try { maybeAutoPickCursorColor?.('mode'); } catch (e) {}
  }
  
  console.log(`Switching to mode: ${mode}`);
  const modeNames = { 
    pit: 'Ball Pit', 
    flies: 'Flies to Light', 
    weightless: 'Zero Gravity', 
    water: 'Water Swimming',
    vortex: 'Vortex Sheets',

    magnetic: 'Magnetic',
    bubbles: 'Carbonated Bubbles',
    'kaleidoscope-3': 'Kaleidoscope',
    critters: 'Hive',
    neural: 'Neural Network',
    'parallax-linear': 'Parallax (Linear)',
    'parallax-float': 'Parallax (Float)',
    '3d-sphere': '3D Sphere',
    '3d-cube': '3D Cube',
    'starfield-3d': '3D Starfield',
    'elastic-center': 'Elastic Center',
    'dvd-logo': 'DVD Logo',

    'particle-fountain': 'Particle Fountain',
    'shooting-stars': 'Shooting Stars'
  };
  announceToScreenReader(`Switched to ${modeNames[mode] || mode} mode`);
  
  // NOTE: UI button updates are handled by the caller (controls.js, keyboard.js)
  // to avoid circular dependencies
  
  // Update container class for mode-specific styling
  // PRESERVE dark-mode class when switching modes!
  if (globals.container) {
    const wasDark = globals.container.classList.contains('dark-mode');
    globals.container.className = '';
    if (mode === MODES.PIT) {
      globals.container.classList.add('mode-pit');
    }
    // Restore dark mode class if it was set
    if (wasDark || globals.isDarkMode) {
      globals.container.classList.add('dark-mode');
    }
  }
  
  // Resize canvas to match mode height
  resize();
  
  // Set physics parameters and initialize scene
  if (mode === MODES.PIT) {
    globals.gravityMultiplier = globals.gravityMultiplierPit;
    globals.G = globals.GE * globals.gravityMultiplier;
    globals.repellerEnabled = true;
    initializeBallPit();
  } else if (mode === MODES.FLIES) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeFlies();
  } else if (mode === MODES.WEIGHTLESS) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeWeightless();
  } else if (mode === MODES.WATER) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeWater();
  } else if (mode === MODES.VORTEX) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeVortex();
  } else if (mode === MODES.MAGNETIC) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeMagnetic();
  } else if (mode === MODES.BUBBLES) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeBubbles();
  } else if (mode === MODES.KALEIDOSCOPE) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeKaleidoscope();
  } else if (mode === MODES.SPHERE_3D) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initialize3DSphere();
  } else if (mode === MODES.CUBE_3D) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initialize3DCube();
  } else if (mode === MODES.CRITTERS) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;

    // Critters are “crawl-y”: lower restitution + higher drag (mode-only overrides).
    if (globals._restBeforeCritters === undefined) globals._restBeforeCritters = globals.REST;
    if (globals._frictionBeforeCritters === undefined) globals._frictionBeforeCritters = globals.FRICTION;
    globals.REST = globals.critterRestitution ?? globals.REST;
    globals.FRICTION = globals.critterFriction ?? globals.FRICTION;

    // Critters should feel more “clumpy” than the global default spacing.
    // Keep this mode-local so other modes retain their tuned spacing.
    if (globals._ballSpacingBeforeCritters === undefined) {
      globals._ballSpacingBeforeCritters = globals.ballSpacing;
    }
    globals.ballSpacing = Math.min(globals.ballSpacing || 0, 1.0);

    initializeCritters();
  } else if (mode === MODES.NEURAL) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = true;
    initializeNeural();
  } else if (mode === MODES.PARALLAX_LINEAR) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeParallaxLinear();
  } else if (mode === MODES.PARALLAX_FLOAT) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeParallaxFloat();
  } else if (mode === MODES.STARFIELD_3D) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeStarfield3D();
  } else if (mode === MODES.ELASTIC_CENTER) {
    // Disable gravity for elastic center mode
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeElasticCenter();
  } else if (mode === MODES.DVD_LOGO) {
    // Disable gravity for linear screensaver movement
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeDvdLogo();
  } else if (mode === MODES.PARTICLE_FOUNTAIN) {
    // Enable gravity for particle fountain (particles fall after rising)
    globals.gravityMultiplier = globals.particleFountainGravityMultiplier || 1.0;
    globals.G = globals.GE * globals.gravityMultiplier;
    globals.repellerEnabled = true; // Enable mouse repulsion for particles
    initializeParticleFountain();
  } else if (mode === MODES.SHOOTING_STARS) {
    // Disable gravity for magical arcing motion
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializeShootingStars();
  }
  
  console.log(`Mode ${mode} initialized with ${globals.balls.length} balls`);

  // Sync legend filter system with new balls
  if (typeof window !== 'undefined' && window.legendFilter && window.legendFilter.syncAllBalls) {
    try {
      window.legendFilter.syncAllBalls();
    } catch (e) {
      console.warn('Legend filter sync failed:', e);
    }
  }

  // Schedule warmup consumption (no rendering during warmup).
  // The physics engine will consume this before the first render after mode init.
  const warmupFrames = Math.max(0, Math.round(getWarmupFramesForMode(mode, globals) || 0));
  globals.warmupFramesRemaining = warmupFrames;

  // Broadcast mode changes for lightweight UI micro-interactions (e.g., logo pulse).
  // Keep this decoupled from UI modules to avoid circular dependencies.
  if (typeof window !== 'undefined' && mode !== prevMode) {
    try {
      window.dispatchEvent(new CustomEvent('bb:modeChanged', { detail: { prevMode, mode } }));
    } catch (e) {}
  }
}

export function resetCurrentMode() {
  const globals = getGlobals();
  // Cursor color: auto-cycle on explicit resets (even though mode stays the same).
  try { maybeAutoPickCursorColor?.('reset'); } catch (e) {}
  setMode(globals.currentMode);
}

export function getForceApplicator() {
  const globals = getGlobals();
  if (globals.currentMode === MODES.FLIES) {
    return applyFliesForces;
  } else if (globals.currentMode === MODES.PIT) {
    return applyBallPitForces;
  } else if (globals.currentMode === MODES.WEIGHTLESS) {
    return applyWeightlessForces;
  } else if (globals.currentMode === MODES.WATER) {
    return applyWaterForces;
  } else if (globals.currentMode === MODES.VORTEX) {
    return applyVortexForces;
  } else if (globals.currentMode === MODES.MAGNETIC) {
    return applyMagneticForces;
  } else if (globals.currentMode === MODES.BUBBLES) {
    return applyBubblesForces;
  } else if (globals.currentMode === MODES.KALEIDOSCOPE) {
    return applyKaleidoscopeForces;
  } else if (globals.currentMode === MODES.SPHERE_3D) {
    return apply3DSphereForces;
  } else if (globals.currentMode === MODES.CUBE_3D) {
    return apply3DCubeForces;
  } else if (globals.currentMode === MODES.CRITTERS) {
    return applyCrittersForces;
  } else if (globals.currentMode === MODES.NEURAL) {
    return applyNeuralForces;
  } else if (globals.currentMode === MODES.PARALLAX_LINEAR) {
    return applyParallaxLinearForces;
  } else if (globals.currentMode === MODES.PARALLAX_FLOAT) {
    return applyParallaxFloatForces;
  } else if (globals.currentMode === MODES.STARFIELD_3D) {
    return applyStarfield3DForces;
  } else if (globals.currentMode === MODES.ELASTIC_CENTER) {
    return applyElasticCenterForces;
  } else if (globals.currentMode === MODES.DVD_LOGO) {
    return applyDvdLogoForces;
  } else if (globals.currentMode === MODES.PARTICLE_FOUNTAIN) {
    return applyParticleFountainForces;
  } else if (globals.currentMode === MODES.SHOOTING_STARS) {
    return applyShootingStarsForces;
  }
  return null;
}

export function getModeUpdater() {
  const globals = getGlobals();
  if (globals.currentMode === MODES.WATER) {
    return updateWaterRipples;
  } else if (globals.currentMode === MODES.MAGNETIC) {
    return updateMagnetic;
  } else if (globals.currentMode === MODES.BUBBLES) {
    return updateBubbles;
  } else if (globals.currentMode === MODES.STARFIELD_3D) {
    return updateStarfield3D;
  } else if (globals.currentMode === MODES.ELASTIC_CENTER) {
    return updateElasticCenter;
  } else if (globals.currentMode === MODES.DVD_LOGO) {
    return updateDvdLogo;
  } else if (globals.currentMode === MODES.NEURAL) {
    return updateNeural;
  } else if (globals.currentMode === MODES.PARTICLE_FOUNTAIN) {
    return updateParticleFountain;
  } else if (globals.currentMode === MODES.PARALLAX_FLOAT) {
    return updateParallaxFloatMouse;
  } else if (globals.currentMode === MODES.PARALLAX_LINEAR) {
    return updateParallaxLinearMouse;
  } else if (globals.currentMode === MODES.CRITTERS) {
    return updateCrittersGrid;
  } else if (globals.currentMode === MODES.SHOOTING_STARS) {
    return updateShootingStars;
  }
  return null;
}

export function getModeRenderer() {
  const globals = getGlobals();
  if (globals.currentMode === MODES.NEURAL) {
    return {
      preRender: preRenderNeural
    };
  } else if (globals.currentMode === MODES.STARFIELD_3D) {
    return {
      preRender: renderStarfield3D
    };
  } else if (globals.currentMode === MODES.CRITTERS) {
    return {
      preRender: renderCrittersWaypoints
    };
  } else if (globals.currentMode === MODES.SHOOTING_STARS) {
    return {
      preRender: renderShootingStars
    };
  }
  return null;
}
