// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                KEYBOARD INPUT                                ║
// ║              Panel dock toggle and mode switching (1-9)                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { setMode, MODES, resetCurrentMode } from '../modes/mode-controller.js';
import { NARRATIVE_MODE_SEQUENCE } from '../core/constants.js';
import { getGlobals } from '../core/state.js';
import { updateModeButtonsUI } from './controls.js';
import { isDev } from '../utils/logger.js';

let isKeyboardWired = false;

function navigateNarrative(delta) {
  const g = getGlobals();
  const mode = g?.currentMode || MODES.PIT;
  const seq = NARRATIVE_MODE_SEQUENCE;
  if (!seq || !seq.length) return;
  const idx = seq.indexOf(mode);
  const base = (idx >= 0) ? idx : 0;
  const next = (base + delta + seq.length) % seq.length;
  const nextMode = seq[next];
  setMode(nextMode);
  updateModeButtonsUI(nextMode);
}

export function setupKeyboardShortcuts() {
  if (isKeyboardWired) return;
  isKeyboardWired = true;

  window.addEventListener('keydown', (e) => {
    // Skip if typing in an input
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;
    
    const k = e.key.toLowerCase();
    
    // Toggle dock with /
    if (k === '/' || e.code === 'Slash') {
      e.preventDefault();
      // DEV-ONLY: The config panel is a dev tool and must never ship/appear in production.
      // Avoid a static import so Rollup can drop panel-dock from production bundles.
      if (!isDev()) return;
      import('./panel-dock.js')
        .then((mod) => {
          try { mod.toggleDock?.(); } catch (err) {}
        })
        .catch(() => {});
      return;
    }

    // Reset current simulation with R
    if (k === 'r') {
      e.preventDefault();
      resetCurrentMode();
      try {
        const g = getGlobals();
        updateModeButtonsUI(g.currentMode);
      } catch (e) {}
      return;
    }

    // Navigation disabled in Daily Simulation mode
    // The simulation is locked to the daily mode and cannot be manually switched
  });

  // Right-click navigation disabled in Daily Simulation mode
}
