// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                                KEYBOARD INPUT                                ║
// ║              Panel dock toggle and mode switching (1-9)                      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { resetCurrentMode } from '../modes/mode-controller.js';
import { getGlobals } from '../core/state.js';
import { updateModeButtonsUI } from './mode-buttons.js';

let isKeyboardWired = false;

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
      // Wired from home bootstrap and from `DevConfigPanelBridge` so SPA routes still get `/`.
      if (!import.meta.env.DEV) return;
      import('./panel-popup-manager.js')
        .then((mod) => {
          try { mod.toggleDevPanelSurface?.(); } catch (err) { /* The dev panel is optional to keyboard control. */ }
        })
        .catch(() => {});
      return;
    }

    // Reset current simulation with R
    if (k === 'r') {
      e.preventDefault();
      resetCurrentMode();
      updateModeButtonsUI(getGlobals().currentMode);
      return;
    }

    // Navigation disabled in Daily Simulation mode
    // The simulation is locked to the daily mode and cannot be manually switched
  });

  // Right-click navigation disabled in Daily Simulation mode
}
