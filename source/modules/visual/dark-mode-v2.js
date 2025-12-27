// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    MODERN DARK MODE SYSTEM (Best Practices)                 ║
// ║          Native feel with prefers-color-scheme + manual override            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { applyColorTemplate } from './colors.js';
import { syncChromeColor } from '../physics/engine.js';
import { log as devLog } from '../utils/logger.js';
import { applyChromeHarmony } from './chrome-harmony.js';
import { readTokenVar } from '../utils/tokens.js';

// Theme states: 'auto', 'light', 'dark'
let currentTheme = 'auto'; // Default to auto (system + night heuristic)
let systemPreference = 'light';
let isDarkModeInitialized = false;

/**
 * Get background colors from globals (config-driven) with CSS fallback
 */
function getBackgroundColors() {
  const g = getGlobals();
  return {
    light: g?.bgLight || readTokenVar('--bg-light', '#f5f5f5'),
    dark: g?.bgDark || readTokenVar('--bg-dark', '#0a0a0a')
  };
}

/**
 * Sync CSS variables from config values (called at init)
 * This ensures config-driven colors override CSS defaults
 */
function syncCssVarsFromConfig() {
  const g = getGlobals();
  const root = document.documentElement;
  
  // Backgrounds
  if (g?.bgLight) {
    root.style.setProperty('--bg-light', g.bgLight);
    root.style.setProperty('--chrome-bg-light', g.bgLight);
  }
  if (g?.bgDark) {
    root.style.setProperty('--bg-dark', g.bgDark);
    root.style.setProperty('--chrome-bg-dark', g.bgDark);
  }
  // Frame colors: separate light and dark mode wall colors
  // IMPORTANT: Only use frameColorLight/frameColorDark - do NOT fallback to frameColor
  // as it would override the separate light/dark colors set by the control panel
  if (g?.frameColorLight) {
    root.style.setProperty('--frame-color-light', g.frameColorLight);
  }
  if (g?.frameColorDark) {
    root.style.setProperty('--frame-color-dark', g.frameColorDark);
  }
  // Wall colors automatically point to frameColor via CSS (--wall-color-light: var(--frame-color-light))
  // Update browser chrome with the appropriate color for current mode
  const chromeColor = g.isDarkMode ? g?.frameColorDark : g?.frameColorLight;
  if (chromeColor) {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = chromeColor;
    root.style.setProperty('--chrome-bg', chromeColor);
  }
  
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
  if (g?.edgeLabelColorLight) {
    root.style.setProperty('--edge-label-color-light', g.edgeLabelColorLight);
  }
  if (g?.edgeLabelColorDark) {
    root.style.setProperty('--edge-label-color-dark', g.edgeLabelColorDark);
  }
  if (Number.isFinite(g?.edgeLabelInsetAdjustPx)) {
    root.style.setProperty('--edge-label-inset-adjust', `${g.edgeLabelInsetAdjustPx}px`);
  }
  
  // Link colors
  if (g?.linkHoverColor) {
    root.style.setProperty('--link-hover-color', g.linkHoverColor);
  }
  
  // Logo colors
  if (g?.logoColorLight) {
    root.style.setProperty('--logo-color-light', g.logoColorLight);
  }
  if (g?.logoColorDark) {
    root.style.setProperty('--logo-color-dark', g.logoColorDark);
  }
  
  // Portfolio logo colors (separate from index)
  if (g?.portfolioLogoColorLight) {
    root.style.setProperty('--portfolio-logo-color-light', g.portfolioLogoColorLight);
  }
  if (g?.portfolioLogoColorDark) {
    root.style.setProperty('--portfolio-logo-color-dark', g.portfolioLogoColorDark);
  }
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

/**
 * Update browser chrome/theme color for Safari and Chrome
 * Uses wall colors (frame colors) for browser chrome to match the wall appearance
 */
function updateThemeColor(isDark) {
  const g = getGlobals();
  // Use wall colors (frame colors) for browser chrome - matches the wall appearance
  const lightColor = g?.frameColorLight || readTokenVar('--frame-color-light', '#0a0a0a');
  const darkColor = g?.frameColorDark || readTokenVar('--frame-color-dark', '#0a0a0a');
  const currentColor = isDark ? darkColor : lightColor;
  
  // Update existing meta tag or create new one
  let metaTheme = document.querySelector('meta[name="theme-color"]');
  if (!metaTheme) {
    metaTheme = document.createElement('meta');
    metaTheme.name = 'theme-color';
    document.head.appendChild(metaTheme);
  }
  metaTheme.content = currentColor;
  
  // Safari-specific: Update for both light and dark modes
  let metaThemeLight = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: light)"]');
  if (!metaThemeLight) {
    metaThemeLight = document.createElement('meta');
    metaThemeLight.name = 'theme-color';
    metaThemeLight.media = '(prefers-color-scheme: light)';
    document.head.appendChild(metaThemeLight);
  }
  metaThemeLight.content = lightColor;
  
  let metaThemeDark = document.querySelector('meta[name="theme-color"][media="(prefers-color-scheme: dark)"]');
  if (!metaThemeDark) {
    metaThemeDark = document.createElement('meta');
    metaThemeDark.name = 'theme-color';
    metaThemeDark.media = '(prefers-color-scheme: dark)';
    document.head.appendChild(metaThemeDark);
  }
  metaThemeDark.content = darkColor;
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
  
  // 1) If the browser ignores theme-color (desktop Chrome tabs), adapt the wall to match the browser UI.
  // 2) Then update meta theme-color from the (possibly updated) CSS vars.
  applyChromeHarmony(isDark);
  updateThemeColor(isDark);
  
  // Sync chrome color for rubbery walls
  syncChromeColor();
  
  // Switch color palette variant
  applyColorTemplate(globals.currentTemplate);
  
  // Update UI
  updateSegmentControl();
}

/**
 * Update segment control UI
 */
function updateSegmentControl() {
  const autoBtn = document.getElementById('themeAuto');
  const lightBtn = document.getElementById('themeLight');
  const darkBtn = document.getElementById('themeDark');
  
  if (!autoBtn || !lightBtn || !darkBtn) return;
  
  // Remove active class from all
  [autoBtn, lightBtn, darkBtn].forEach(btn => btn.classList.remove('active'));
  
  // Add active to current
  if (currentTheme === 'auto') {
    autoBtn.classList.add('active');
  } else if (currentTheme === 'light') {
    lightBtn.classList.add('active');
  } else {
    darkBtn.classList.add('active');
  }
  
  // Update status text
  const status = document.getElementById('themeStatus');
  if (status) {
    const globals = getGlobals();
    if (currentTheme === 'auto') {
      status.textContent = globals.isDarkMode ? '🌙 Auto (Dark)' : '☀️ Auto (Light)';
    } else if (currentTheme === 'light') {
      status.textContent = '☀️ Light Mode';
    } else {
      status.textContent = '🌙 Dark Mode';
    }
  }
}

/**
 * Set theme (auto, light, or dark)
 */
export function setTheme(theme) {
  currentTheme = theme;
  
  let shouldBeDark = false;
  
  if (theme === 'auto') {
    shouldBeDark = (systemPreference === 'dark') || isNightByLocalClock();
  } else if (theme === 'dark') {
    shouldBeDark = true;
  } else {
    shouldBeDark = false;
  }
  
  applyDarkModeToDOM(shouldBeDark);
  
  // Save preference
  try {
    localStorage.setItem('theme-preference', theme);
  } catch (e) {
    // localStorage unavailable
  }
  
  devLog(`🎨 Theme set to: ${theme} (rendering: ${shouldBeDark ? 'dark' : 'light'})`);
}

/**
 * Initialize dark mode system
 */
export function initializeDarkMode() {
  if (isDarkModeInitialized) return;
  isDarkModeInitialized = true;

  // Sync CSS variables from config FIRST (before theme application)
  syncCssVarsFromConfig();

  // Detect system preference (for auto mode later)
  systemPreference = detectSystemPreference();
  devLog(`🖥️ System prefers: ${systemPreference}`);
  
  // Restore saved preference if available; otherwise default to Auto.
  let initial = 'auto';
  try {
    const saved = localStorage.getItem('theme-preference');
    if (saved === 'auto' || saved === 'light' || saved === 'dark') initial = saved;
  } catch (e) {}
  setTheme(initial);
  
  // Setup segment control listeners
  const autoBtn = document.getElementById('themeAuto');
  const lightBtn = document.getElementById('themeLight');
  const darkBtn = document.getElementById('themeDark');
  
  if (autoBtn) autoBtn.addEventListener('click', () => setTheme('auto'));
  if (lightBtn) lightBtn.addEventListener('click', () => setTheme('light'));
  if (darkBtn) darkBtn.addEventListener('click', () => setTheme('dark'));
  
  // Listen for system preference changes
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      systemPreference = e.matches ? 'dark' : 'light';
      devLog(`🖥️ System preference changed to: ${systemPreference}`);
      
      // If in auto mode, update
      if (currentTheme === 'auto') {
        setTheme('auto');
      }
    });
  }

  // Night-window re-evaluation (privacy-first heuristic; only applies in Auto mode)
  window.setInterval(() => {
    if (currentTheme !== 'auto') return;
    setTheme('auto');
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
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  setTheme(newTheme);
}
