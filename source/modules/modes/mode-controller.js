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
import { initializePulseGrid } from './pulse-grid.js';
import { updatePulseGrid } from './pulse-grid.js';
import { announceToScreenReader } from '../utils/accessibility.js';

export { MODES };

export function initModeSystem() {
  // Initialize mode system
}

export function setMode(mode) {
  const globals = getGlobals();
  setModeState(mode);
  
  console.log(`Switching to mode: ${mode}`);
  const modeNames = { pit: 'Ball Pit', flies: 'Flies to Light', weightless: 'Zero Gravity', 'pulse-grid': 'Pulse Grid' };
  announceToScreenReader(`Switched to ${modeNames[mode] || mode} mode`);
  
  // Update container class for mode-specific styling
  if (globals.container) {
    globals.container.className = '';
    if (mode === MODES.PIT) {
      globals.container.classList.add('mode-pit');
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
  } else if (mode === MODES.PULSE_GRID) {
    globals.gravityMultiplier = 0.0;
    globals.G = 0;
    globals.repellerEnabled = false;
    initializePulseGrid();
  }
  
  console.log(`Mode ${mode} initialized with ${globals.balls.length} balls`);
}

export function getForceApplicator() {
  const globals = getGlobals();
  if (globals.currentMode === MODES.FLIES) {
    return applyFliesForces;
  } else if (globals.currentMode === MODES.PIT) {
    return applyBallPitForces;
  }
  return null;
}
