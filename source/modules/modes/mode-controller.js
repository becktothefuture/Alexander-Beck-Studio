// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      MODE CONTROLLER (COMPLETE)                              ║
// ║         Extracted from balls-source.html lines 3999-4085                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { MODES, CONSTANTS } from '../core/constants.js';
import { setMode as setModeState, getGlobals } from '../core/state.js';
import { initializeFlies, applyFliesForces } from './flies.js';
import { initializeBallPit, applyBallPitForces } from './ball-pit.js';
import { initializePitThrows, updatePitThrows } from './pit-throws.js';
import { initializeWeightless } from './weightless.js';
import { resize } from '../rendering/renderer.js';
import { initializeWater, applyWaterForces, updateWaterRipples } from './water.js';
import { initializeVortex, applyVortexForces } from './vortex.js';
import { initializePingPong, applyPingPongForces } from './ping-pong.js';
import { initializeMagnetic, applyMagneticForces, updateMagnetic } from './magnetic.js';
import { initializeBubbles, applyBubblesForces, updateBubbles } from './bubbles.js';
import { initializeKaleidoscope, applyKaleidoscopeForces } from './kaleidoscope.js';
import { initializeCritters, applyCrittersForces } from './critters.js';
import { announceToScreenReader } from '../utils/accessibility.js';

export { MODES };

export function initModeSystem() {
  // Initialize mode system
}

export function setMode(mode) {
  const globals = getGlobals();
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
  
  // Clean up Kaleidoscope spacing override when leaving the mode
  if (globals.currentMode === MODES.KALEIDOSCOPE && mode !== MODES.KALEIDOSCOPE) {
    if (globals._ballSpacingBeforeKaleidoscope !== undefined) {
      globals.ballSpacing = globals._ballSpacingBeforeKaleidoscope;
      delete globals._ballSpacingBeforeKaleidoscope;
    }
  }
  
  setModeState(mode);
  
  console.log(`Switching to mode: ${mode}`);
  const modeNames = { 
    pit: 'Ball Pit', 
    'pit-throws': 'Ball Pit (Throws)',
    flies: 'Flies to Light', 
    weightless: 'Zero Gravity', 
    water: 'Water Swimming',
    vortex: 'Vortex Sheets',
    'ping-pong': 'Ping Pong',
    magnetic: 'Magnetic',
    bubbles: 'Carbonated Bubbles',
    kaleidoscope: 'Kaleidoscope',
    critters: 'Critters'
  };
  announceToScreenReader(`Switched to ${modeNames[mode] || mode} mode`);
  
  // NOTE: UI button updates are handled by the caller (controls.js, keyboard.js)
  // to avoid circular dependencies
  
  // Update container class for mode-specific styling
  // PRESERVE dark-mode class when switching modes!
  if (globals.container) {
    const wasDark = globals.container.classList.contains('dark-mode');
    globals.container.className = '';
    if (mode === MODES.PIT || mode === MODES.PIT_THROWS) {
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
  } else if (mode === MODES.PIT_THROWS) {
    globals.gravityMultiplier = globals.gravityMultiplierPit;
    globals.G = globals.GE * globals.gravityMultiplier;
    globals.repellerEnabled = true;
    initializePitThrows();
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
  } else if (mode === MODES.PING_PONG) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializePingPong();
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

    // Mode-only spacing: keep Kaleidoscope airy without changing other modes.
    if (globals._ballSpacingBeforeKaleidoscope === undefined) {
      globals._ballSpacingBeforeKaleidoscope = globals.ballSpacing;
    }
    // Interpret kaleidoscopeBallSpacing as “px at 1000px min viewport dimension” for mobile consistency.
    const canvas = globals.canvas;
    const unit = canvas ? Math.max(0.35, Math.min(3.0, Math.min(canvas.width, canvas.height) / 1000)) : 1;
    const spacingBase = globals.kaleidoscopeBallSpacing ?? globals.ballSpacing;
    globals.ballSpacing = spacingBase * unit;

    initializeKaleidoscope();
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
  }
  
  console.log(`Mode ${mode} initialized with ${globals.balls.length} balls`);
}

export function getForceApplicator() {
  const globals = getGlobals();
  if (globals.currentMode === MODES.FLIES) {
    return applyFliesForces;
  } else if (globals.currentMode === MODES.PIT || globals.currentMode === MODES.PIT_THROWS) {
    return applyBallPitForces;
  } else if (globals.currentMode === MODES.WATER) {
    return applyWaterForces;
  } else if (globals.currentMode === MODES.VORTEX) {
    return applyVortexForces;
  } else if (globals.currentMode === MODES.PING_PONG) {
    return applyPingPongForces;
  } else if (globals.currentMode === MODES.MAGNETIC) {
    return applyMagneticForces;
  } else if (globals.currentMode === MODES.BUBBLES) {
    return applyBubblesForces;
  } else if (globals.currentMode === MODES.KALEIDOSCOPE) {
    return applyKaleidoscopeForces;
  } else if (globals.currentMode === MODES.CRITTERS) {
    return applyCrittersForces;
  }
  return null;
}

export function getModeUpdater() {
  const globals = getGlobals();
  if (globals.currentMode === MODES.WATER) {
    return updateWaterRipples;
  } else if (globals.currentMode === MODES.PIT_THROWS) {
    return updatePitThrows;
  } else if (globals.currentMode === MODES.MAGNETIC) {
    return updateMagnetic;
  } else if (globals.currentMode === MODES.BUBBLES) {
    return updateBubbles;
  }
  return null;
}
