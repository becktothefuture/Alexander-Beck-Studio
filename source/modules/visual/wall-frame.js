// Wall frame helpers shared across pages.
// Applies the studio "wall" layout variables from the runtime config without booting the simulation.

import {
  initState,
  applyLayoutCSSVars,
  applyLayoutFromVwToPx,
  detectResponsiveScale,
} from '../core/state.js';

function syncWallFrameColors(config) {
  const root = document.documentElement;

  // Backgrounds (inner surface uses --bg-light / --bg-dark like the studio index).
  if (config.bgLight) {
    root.style.setProperty('--bg-light', config.bgLight);
    root.style.setProperty('--chrome-bg-light', config.bgLight);
  }
  if (config.bgDark) {
    root.style.setProperty('--bg-dark', config.bgDark);
    root.style.setProperty('--chrome-bg-dark', config.bgDark);
  }

  // Frame + wall color (single source of truth on the index page).
  if (config.frameColor) {
    root.style.setProperty('--frame-color-light', config.frameColor);
    root.style.setProperty('--frame-color-dark', config.frameColor);
    root.style.setProperty('--wall-color', config.frameColor);
  }
}

export function applyWallFrameFromConfig(config) {
  if (!config) return;

  // Seed layout + mobile logic from the shared config/state system.
  initState(config);
  syncWallFrameColors(config);
  applyWallFrameLayout();
}

export function applyWallFrameLayout() {
  // Keep vw-based layout vars synced to the current viewport.
  try { detectResponsiveScale(); } catch (e) {}
  try { applyLayoutFromVwToPx(); } catch (e) {}
  try { applyLayoutCSSVars(); } catch (e) {}
}
