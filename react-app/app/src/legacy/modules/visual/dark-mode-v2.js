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
import { applyShellLayoutVars, syncShellToDocument, syncThemeColorMeta } from './site-shell.js';
import { forEachPanelUiDocument, resolvePanelUiDocument } from '../ui/panel-ui-context.js';
import {
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  applyThemeState,
  isDarkThemeDocument,
  normalizeThemePreference,
  readThemePreference,
  resolveThemeIsDark,
  writeThemePreference,
} from '../../../lib/theme-state.js';

// Theme states: 'auto', 'light', 'dark'
let currentTheme = 'auto';
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

function refreshSystemPreference() {
  systemPreference = detectSystemPreference();
  if (currentTheme === 'auto' && resolveShouldBeDark('auto') !== isRenderedDarkMode()) {
    applyTheme('auto', { persist: false });
    return;
  }
  applyChromeHarmony();
  updateThemeColor(isRenderedDarkMode());
}

function resolveShouldBeDark(theme) {
  return resolveThemeIsDark(theme, systemPreference === 'dark');
}

function isRenderedDarkMode() {
  return isDarkThemeDocument();
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
  
  applyThemeState(isDark, { container: globals.container });

  applyLayoutCSSVars();

  // Establish the authored palette before adapting frame chrome.
  applyColorTemplate(globals.currentTemplate);
  syncShellToDocument({ isDark });

  // 1) If the browser ignores theme-color (desktop Chrome tabs), adapt the frame to match the browser UI.
  // 2) Then update meta theme-color from the (possibly updated) CSS vars.
  applyChromeHarmony();
  updateThemeColor(isDark);
  
  // Sync chrome color for rubbery walls
  syncChromeColor();
  
  // Re-apply noise system so SVG noise can re-tint to the active theme.
  try {
    import('./noise-system.js').then(({ applyNoiseSystem }) => applyNoiseSystem({}));
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
    const panelThemeToggle = uiDocument.querySelector('.panel-theme-toggle');
    if (panelThemeToggle) {
      panelThemeToggle.textContent = globals.isDarkMode ? '☀️' : '🌙';
      panelThemeToggle.dataset.state = globals.isDarkMode ? 'dark' : 'light';
    }

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
function applyTheme(theme, { persist = true } = {}) {
  currentTheme = normalizeThemePreference(theme);
  const shouldBeDark = resolveShouldBeDark(currentTheme);
  
  applyDarkModeToDOM(shouldBeDark);
  
  // Save preference
  if (persist) writeThemePreference(currentTheme);

  try {
    window.dispatchEvent(new CustomEvent(THEME_CHANGE_EVENT, {
      detail: {
        theme: currentTheme,
        isDark: shouldBeDark,
      },
    }));
  } catch (e) {}
  
  devLog(`🎨 Theme set to: ${currentTheme} (rendering: ${shouldBeDark ? 'dark' : 'light'})`);
}

export function setTheme(theme) {
  applyTheme(theme);
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
  if (isDarkModeInitialized) {
    // Other route runtimes may restamp shell variables after the shared shell has
    // initialized. Re-project the canonical preference without binding listeners
    // a second time so theme and browser-frame state cannot drift during boot.
    systemPreference = detectSystemPreference();
    applyTheme(readThemePreference(), { persist: false });
    bindThemeSegmentControls(document);
    return;
  }
  isDarkModeInitialized = true;

  // Clear color cache to prevent stale wall color values
  clearColorCache();

  // Sync CSS variables from config FIRST (before theme application)
  syncCssVarsFromConfig();

  // Detect system preference (for auto mode later)
  systemPreference = detectSystemPreference();
  devLog(`🖥️ System prefers: ${systemPreference}`);
  
  // Restore the same preference at every viewport width.
  applyTheme(readThemePreference(), { persist: false });
  
  bindThemeSegmentControls(document);
  
  // Listen for system preference changes
  if (window.matchMedia) {
    const colorSchemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
    const handleColorSchemeChange = (e) => {
      systemPreference = e.matches ? 'dark' : 'light';
      devLog(`🖥️ System preference changed to: ${systemPreference}`);
      
      // If in auto mode, update
      if (currentTheme === 'auto' && resolveShouldBeDark('auto') !== isRenderedDarkMode()) {
        applyTheme('auto', { persist: false });
      } else {
        applyChromeHarmony();
        updateThemeColor(isRenderedDarkMode());
      }
    };
    if (typeof colorSchemeMedia.addEventListener === 'function') {
      colorSchemeMedia.addEventListener('change', handleColorSchemeChange);
    } else {
      colorSchemeMedia.addListener?.(handleColorSchemeChange);
    }
  }

  // localStorage events fire in the other tab, keeping all open tabs in sync.
  window.addEventListener('storage', (event) => {
    if (event.key !== THEME_STORAGE_KEY && event.key !== null) return;
    const nextTheme = readThemePreference();
    if (nextTheme === currentTheme && resolveShouldBeDark(nextTheme) === isRenderedDarkMode()) return;
    applyTheme(nextTheme, { persist: false });
  });

  // Re-check restored BFCache tabs before they become visible again.
  window.addEventListener('pageshow', () => {
    currentTheme = readThemePreference();
    refreshSystemPreference();
  });

  // iOS Safari can resume a backgrounded tab without replaying the media-query
  // event. Reconcile Auto whenever the document becomes visible again.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible') return;
    currentTheme = readThemePreference();
    refreshSystemPreference();
  });

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
