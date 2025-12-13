// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                    MODERN DARK MODE SYSTEM (Best Practices)                 ║
// ║          Native feel with prefers-color-scheme + manual override            ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { applyColorTemplate } from './colors.js';
import { syncChromeColor } from '../physics/engine.js';

// Theme states: 'auto', 'light', 'dark'
let currentTheme = 'light'; // Default to light mode
let systemPreference = 'light';

// Fallback colors if CSS vars not available
// MUST match --frame-color-light / --frame-color-dark in main.css
const FALLBACK_COLORS = {
  light: '#0a0a0a',  // Dark frame even in light mode
  dark: '#0a0a0a'    // Dark frame in dark mode (seamless)
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
  
  // Update browser chrome color
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
    shouldBeDark = systemPreference === 'dark';
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
  
  console.log(`🎨 Theme set to: ${theme} (rendering: ${shouldBeDark ? 'dark' : 'light'})`);
}

/**
 * Initialize dark mode system
 */
export function initializeDarkMode() {
  // Detect system preference (for auto mode later)
  systemPreference = detectSystemPreference();
  console.log(`🖥️ System prefers: ${systemPreference}`);
  
  // FORCE START IN LIGHT MODE (ignore saved preference on initial load)
  // User can still switch modes via the theme buttons
  setTheme('light');
  
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
      console.log(`🖥️ System preference changed to: ${systemPreference}`);
      
      // If in auto mode, update
      if (currentTheme === 'auto') {
        setTheme('auto');
      }
    });
  }
  
  console.log('✓ Modern dark mode initialized');
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
