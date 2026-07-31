// Wall frame helpers shared across pages.
// Applies the studio "wall" layout variables from the runtime config without booting the simulation.

import {
  initState,
  applyLayoutCSSVars,
  applyLayoutFromVwToPx,
  detectResponsiveScale,
} from '../core/state.js';

export function syncWallFrameColors(config) {
  const root = document.documentElement;

  // Brand logo sizing (shared across pages).
  if (config.topLogoWidthVw !== undefined) {
    root.style.setProperty('--top-logo-width-vw', String(config.topLogoWidthVw));
  }

  // Backgrounds (inner surface uses --bg-light / --bg-dark like the studio index).
  if (config.bgLight) {
    root.style.setProperty('--bg-light', config.bgLight);
  }
  if (config.bgDark) {
    root.style.setProperty('--bg-dark', config.bgDark);
  }

  // The authored true-black frame is stable across browsers and display gamuts.
  const frame = config.frameColor || config.frameColorDark || config.frameColorLight;
  if (frame) {
    root.style.setProperty('--frame-color-site', frame);
    root.style.setProperty('--frame-color-site-light', frame);
    root.style.setProperty('--frame-color-site-dark', frame);
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
  try { detectResponsiveScale(); } catch (e) { /* Optional responsive state is best effort. */ }
  try { applyLayoutFromVwToPx(); } catch (e) { /* Optional viewport conversion is best effort. */ }
  try { applyLayoutCSSVars(); } catch (e) { /* Optional layout publication is best effort. */ }
}
