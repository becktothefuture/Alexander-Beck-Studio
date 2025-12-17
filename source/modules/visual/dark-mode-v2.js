// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    MODERN DARK MODE SYSTEM (Best Practices)                 ║
// ║          Native feel with prefers-color-scheme + manual override            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { applyColorTemplate } from './colors.js';
import { syncChromeColor } from '../physics/engine.js';
import { log as devLog } from '../utils/logger.js';
import { applyChromeHarmony } from './chrome-harmony.js';

// Theme states: 'auto', 'light', 'dark'
let currentTheme = 'auto'; // Default to auto (system + night heuristic)
let systemPreference = 'light';
let isDarkModeInitialized = false;

// Fallback colors if CSS vars not available
// MUST match --bg-light / --bg-dark in main.css
const FALLBACK_COLORS = {
  light: '#f5f5f5',
  dark: '#0a0a0a'
};

/**
 * Read CSS variable from :root, with fallback
 */
function readCssVar(name, fallback) {
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
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
 * Reads from CSS variables (--chrome-bg*) for unified color management
 */
function updateThemeColor(isDark) {
  // Read colors from CSS variables (single source of truth)
  const lightColor = readCssVar('--chrome-bg-light', FALLBACK_COLORS.light);
  const darkColor = readCssVar('--chrome-bg-dark', FALLBACK_COLORS.dark);
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
