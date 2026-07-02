// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    MODERN DARK MODE SYSTEM (Best Practices)                 ║
// ║          Native feel with prefers-color-scheme + manual override            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { applyLayoutCSSVars, getGlobals } from '../core/state.js';
import { applyColorTemplate } from './colors.js';
import { syncChromeColor } from '../physics/engine.js';
import { log as devLog } from '../utils/logger.js';
import { applyChromeHarmony } from './chrome-harmony.js';
import { readTokenVar } from '../utils/tokens.js';
import { invalidateDepthWashCache } from './depth-wash.js';
import { applyShellLayoutVars, syncShellToDocument, syncThemeColorMeta } from './site-shell.js';
import { applyWallShadowPlateSystem } from './wall-shadow-plate.js';
import { forEachPanelUiDocument, resolvePanelUiDocument } from '../ui/panel-ui-context.js';

const THEME_STORAGE_KEY = 'theme-preference-v2';
const LEGACY_THEME_STORAGE_KEY = 'theme-preference';

// Theme states: 'auto', 'light', 'dark'
let currentTheme = 'auto'; // Default to auto (system + night heuristic)
let systemPreference = 'light';

let isDarkModeInitialized = false;

function syncWallPanelTabsToTheme() {
  const isDark = document.body.classList.contains('dark-mode');
  const theme = isDark ? 'dark' : 'light';
  forEachPanelUiDocument((uiDocument) => {
    uiDocument.querySelectorAll('.wall-section-with-tabs').forEach((container) => {
      const sectionKey = container.querySelector('.wall-theme-tab')?.getAttribute('data-wall-section');
      if (!sectionKey) return;
      const tab = container.querySelector(`.wall-theme-tab[data-theme="${theme}"]`);
      const panel = uiDocument.getElementById(sectionKey + (theme === 'light' ? 'LightPanel' : 'DarkPanel'));
      if (!tab || !panel) return;
      container.querySelectorAll('.wall-theme-tab').forEach((t) => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      container.querySelectorAll('.wall-tab-panel').forEach((p) => p.classList.remove('active'));
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      panel.classList.add('active');
    });
  });
}

function readStoredThemePreference() {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'auto' || saved === 'light' || saved === 'dark') return saved;
    // Legacy key: treat any stored value as stale and migrate to auto.
    const legacy = localStorage.getItem(LEGACY_THEME_STORAGE_KEY);
    if (legacy === 'auto' || legacy === 'light' || legacy === 'dark') {
      localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
      localStorage.setItem(THEME_STORAGE_KEY, 'auto');
    }
  } catch (e) {}
  return 'auto';
}

function writeStoredThemePreference(theme) {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    localStorage.removeItem(LEGACY_THEME_STORAGE_KEY);
  } catch (e) {
    // localStorage unavailable
  }
}

/**
 * Get background colors from globals (config-driven) with CSS fallback
 */
function getBackgroundColors() {
  const g = getGlobals();
  return {
    light: g?.bgLight || readTokenVar('--bg-light', "var(--color-detected-efefef)"),
    dark: g?.bgDark || readTokenVar('--bg-dark', "var(--color-detected-181818)")
  };
}

/**
 * Sync CSS variables from config values (called at init)
 * This ensures config-driven colors override CSS defaults
 */
function syncCssVarsFromConfig() {
  const g = getGlobals();
  const root = document.documentElement;
  applyShellLayoutVars();
  
  // Scene interior backgrounds (used only for #simulations container, not browser chrome)
  if (g?.bgLight) {
    root.style.setProperty('--bg-light', g.bgLight);
  }
  if (g?.bgDark) {
    root.style.setProperty('--bg-dark', g.bgDark);
  }
  syncShellToDocument({
    isDark: document.documentElement.classList.contains('dark-mode')
  });
  
  // Text colors
  if (g?.textColorLight) {
    root.style.setProperty('--text-color-light', g.textColorLight);
  }
  if (g?.textColorLightMuted) {
    root.style.setProperty('--text-color-light-muted', g.textColorLightMuted);
  }
  if (g?.textColorDark) {
    root.style.setProperty('--text-color-dark', g.textColorDark);
  }
  if (g?.textColorDarkMuted) {
    root.style.setProperty('--text-color-dark-muted', g.textColorDarkMuted);
  }

  // Edge labels (vertical chapter/copyright)
  if (Number.isFinite(g?.edgeLabelInsetAdjustPx)) {
    root.style.setProperty('--edge-label-inset-adjust', `${g.edgeLabelInsetAdjustPx}px`);
  }
  
  // Link colors
  if (g?.linkHoverColor) {
    root.style.setProperty('--link-hover-color', g.linkHoverColor);
  }
  
  // Logo + edge label colors are now derived from the core text tokens in CSS.
}

/**
 * Detect system color scheme preference
 */
function detectSystemPreference() {
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function isNightByLocalClock() {
  const g = getGlobals();
  if (!g.autoDarkModeEnabled) return false;
  const start = Number.isFinite(g.autoDarkNightStartHour) ? g.autoDarkNightStartHour : 18;
  const end = Number.isFinite(g.autoDarkNightEndHour) ? g.autoDarkNightEndHour : 6;
  const h = new Date().getHours();
  // Handles windows that cross midnight (e.g., 18 → 6).
  if (start === end) return false;
  if (start < end) return h >= start && h < end;
  return h >= start || h < end;
}

function resolveShouldBeDark(theme) {
  if (theme === 'auto') {
    return (systemPreference === 'dark') || isNightByLocalClock();
  }
  return theme === 'dark';
}

function isRenderedDarkMode() {
  return document.documentElement.classList.contains('dark-mode')
    || document.body.classList.contains('dark-mode');
}

/**
 * Update browser chrome/theme color tags from currently-active wall CSS vars.
 */
function updateThemeColor(isDark) {
  const g = getGlobals();
  const cssActive = readTokenVar('--frame-color', '');
  const cssLight = readTokenVar('--frame-color-light', '');
  const cssDark = readTokenVar('--frame-color-dark', '');
  const fallback = g?.frameColor || g?.frameColorLight || g?.frameColorDark || "var(--color-detected-242529)";
  const activeColor = cssActive || (isDark ? (cssDark || cssLight) : (cssLight || cssDark)) || fallback;
  const lightColor = cssLight || activeColor || fallback;
  const darkColor = cssDark || activeColor || fallback;
  
  syncThemeColorMeta({
    active: activeColor,
    light: lightColor,
    dark: darkColor
  });
}

/**
 * Apply dark mode to DOM
 */
function applyDarkModeToDOM(isDark) {
  const globals = getGlobals();
  globals.isDarkMode = isDark;
  
  // Set color-scheme for native form controls (Safari)
  document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  
  // Apply dark-mode class
  if (isDark) {
    globals.container?.classList.add('dark-mode');
    document.body.classList.add('dark-mode');
    document.documentElement.classList.add('dark-mode');
  } else {
    globals.container?.classList.remove('dark-mode');
    document.body.classList.remove('dark-mode');
    document.documentElement.classList.remove('dark-mode');
  }

  syncShellToDocument({ isDark });
  applyLayoutCSSVars();

  // Establish the authored palette before adapting the wall/frame to browser chrome.
  applyColorTemplate(globals.currentTemplate);

  // 1) If the browser ignores theme-color (desktop Chrome tabs), adapt the wall to match the browser UI.
  // 2) Then update meta theme-color from the (possibly updated) CSS vars.
  applyChromeHarmony(isDark);
  updateThemeColor(isDark);
  
  // Sync chrome color for rubbery walls
  syncChromeColor();
  
  // Invalidate depth wash cache on theme change
  invalidateDepthWashCache();

  // Re-apply noise system so SVG noise can re-tint to the active theme.
  try {
    import('./noise-system.js').then(({ applyNoiseSystem }) => applyNoiseSystem({}));
  } catch (e) {}

  try {
    applyWallShadowPlateSystem({});
  } catch (e) {}
  try {
    import('../portfolio/pit-mode.js').then((m) => {
      if (typeof m.syncPortfolioAccentCircleColors === 'function') {
        m.syncPortfolioAccentCircleColors();
      }
    });
  } catch (e) { /* ignore */ }
  
  // Update UI
  updateSegmentControl();
  syncWallPanelTabsToTheme();
}

/**
 * Update segment control UI
 */
function updateSegmentControl() {
  const globals = getGlobals();
  const nextStatusText = currentTheme === 'auto'
    ? (globals.isDarkMode ? '🌙 Auto (Dark)' : '☀️ Auto (Light)')
    : (currentTheme === 'light' ? '☀️ Light Mode' : '🌙 Dark Mode');

  forEachPanelUiDocument((uiDocument) => {
    const autoBtn = uiDocument.getElementById('themeAuto');
    const lightBtn = uiDocument.getElementById('themeLight');
    const darkBtn = uiDocument.getElementById('themeDark');
    if (!autoBtn || !lightBtn || !darkBtn) return;

    [autoBtn, lightBtn, darkBtn].forEach(btn => btn.classList.remove('active'));

    if (currentTheme === 'auto') {
      autoBtn.classList.add('active');
    } else if (currentTheme === 'light') {
      lightBtn.classList.add('active');
    } else {
      darkBtn.classList.add('active');
    }

    const status = uiDocument.getElementById('themeStatus');
    if (status) status.textContent = nextStatusText;
  });
}

export function bindThemeSegmentControls(uiDocument) {
  const panelDocument = resolvePanelUiDocument(uiDocument);
  if (!panelDocument) return;

  const autoBtn = panelDocument.getElementById('themeAuto');
  const lightBtn = panelDocument.getElementById('themeLight');
  const darkBtn = panelDocument.getElementById('themeDark');

  if (autoBtn && autoBtn.dataset.themeBound !== 'true') {
    autoBtn.dataset.themeBound = 'true';
    autoBtn.addEventListener('click', () => setTheme('auto'));
  }
  if (lightBtn && lightBtn.dataset.themeBound !== 'true') {
    lightBtn.dataset.themeBound = 'true';
    lightBtn.addEventListener('click', () => setTheme('light'));
  }
  if (darkBtn && darkBtn.dataset.themeBound !== 'true') {
    darkBtn.dataset.themeBound = 'true';
    darkBtn.addEventListener('click', () => setTheme('dark'));
  }

  updateSegmentControl();
}

/**
 * Set theme (auto, light, or dark)
 */
export function setTheme(theme) {
  currentTheme = theme;
  const shouldBeDark = resolveShouldBeDark(theme);
  
  applyDarkModeToDOM(shouldBeDark);
  
  // Save preference
  writeStoredThemePreference(theme);

  try {
    window.dispatchEvent(new CustomEvent('abs:theme-changed', {
      detail: {
        theme,
        isDark: shouldBeDark,
      },
    }));
  } catch (e) {}
  
  devLog(`🎨 Theme set to: ${theme} (rendering: ${shouldBeDark ? 'dark' : 'light'})`);
}

/**
 * Clear color-related localStorage cache
 * Called when wall color system changes to prevent stale color values
 */
function clearColorCache() {
  try {
    // Keep the explicit theme choice; only clear derived palette caches.
    localStorage.removeItem('abs_palette_chapter');
    devLog('🗑️ Cleared color-related localStorage cache');
  } catch (e) {
    // localStorage unavailable or error
  }
}

/**
 * Initialize dark mode system
 */
export function initializeDarkMode() {
  if (isDarkModeInitialized) return;
  isDarkModeInitialized = true;

  // Clear color cache to prevent stale wall color values
  clearColorCache();

  // Sync CSS variables from config FIRST (before theme application)
  syncCssVarsFromConfig();

  // Detect system preference (for auto mode later)
  systemPreference = detectSystemPreference();
  devLog(`🖥️ System prefers: ${systemPreference}`);
  
  // Restore saved preference if available; otherwise default to Auto.
  const initial = readStoredThemePreference();
  setTheme(initial);
  
  bindThemeSegmentControls(document);
  
  // Listen for system preference changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      systemPreference = e.matches ? 'dark' : 'light';
      devLog(`🖥️ System preference changed to: ${systemPreference}`);
      
      // If in auto mode, update
      if (currentTheme === 'auto' && resolveShouldBeDark('auto') !== isRenderedDarkMode()) {
        setTheme('auto');
      }
    });
  }

  // Night-window re-evaluation (privacy-first heuristic; only applies in Auto mode)
  window.setInterval(() => {
    if (currentTheme !== 'auto') return;
    if (resolveShouldBeDark('auto') !== isRenderedDarkMode()) {
      setTheme('auto');
    }
  }, 60_000);

  devLog('✓ Modern dark mode initialized');
}

/**
 * Get current theme
 */
export function getCurrentTheme() {
  return currentTheme;
}

/**
 * Toggle between light and dark mode manually
 */
export function toggleDarkMode() {
  const isCurrentlyDark = isRenderedDarkMode();
  const newTheme = isCurrentlyDark ? 'light' : 'dark';
  setTheme(newTheme);
}
