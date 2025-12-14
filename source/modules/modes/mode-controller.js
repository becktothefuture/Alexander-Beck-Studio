// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                      MODE CONTROLLER (COMPLETE)                              ║
// ║         Extracted from balls-source.html lines 3999-4085                     ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { MODES, CONSTANTS } from '../core/constants.js';
import { setMode as setModeState, getGlobals } from '../core/state.js';
import { initializeFlies, applyFliesForces } from './flies.js';
import { initializeBallPit, applyBallPitForces } from './ball-pit.js';
import { initializeWeightless } from './weightless.js';
import { resize } from '../rendering/renderer.js';
import { initializeWater, applyWaterForces, updateWaterRipples } from './water.js';
import { initializeVortex, applyVortexForces } from './vortex.js';
import { initializePingPong, applyPingPongForces } from './ping-pong.js';
import { initializeMagnetic, applyMagneticForces, updateMagnetic } from './magnetic.js';
import { initializeBubbles, applyBubblesForces, updateBubbles } from './bubbles.js';
import { initializeKaleidoscope, applyKaleidoscopeForces } from './kaleidoscope.js';
import { announceToScreenReader } from '../utils/accessibility.js';

export { MODES };

export function initModeSystem() {
  // Initialize mode system
}

export function setMode(mode) {
  const globals = getGlobals();
  
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
    flies: 'Flies to Light', 
    weightless: 'Zero Gravity', 
    water: 'Water Swimming',
    vortex: 'Vortex Sheets',
    'ping-pong': 'Ping Pong',
    magnetic: 'Magnetic',
    bubbles: 'Carbonated Bubbles',
    kaleidoscope: 'Kaleidoscope'
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
  }
  
  console.log(`Mode ${mode} initialized with ${globals.balls.length} balls`);
}

export function getForceApplicator() {
  const globals = getGlobals();
  if (globals.currentMode === MODES.FLIES) {
    return applyFliesForces;
  } else if (globals.currentMode === MODES.PIT) {
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
  }
  return null;
}
