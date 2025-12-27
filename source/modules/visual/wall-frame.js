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
    root.style.setProperty('--chrome-bg-light', config.bgLight);
  }
  if (config.bgDark) {
    root.style.setProperty('--bg-dark', config.bgDark);
    root.style.setProperty('--chrome-bg-dark', config.bgDark);
  }

  // Frame colors: separate light and dark mode wall colors
  // --wall-color-light and --wall-color-dark point to frameColorLight/frameColorDark via CSS tokens
  // Always set both light and dark colors (use frameColor as fallback if separate values not provided)
  const frameLight = config.frameColorLight || config.frameColor;
  const frameDark = config.frameColorDark || config.frameColor;
  if (frameLight) {
    root.style.setProperty('--frame-color-light', frameLight);
  }
  if (frameDark) {
    root.style.setProperty('--frame-color-dark', frameDark);
  }
  // Wall colors automatically point to frameColor via CSS (--wall-color-light: var(--frame-color-light))
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
