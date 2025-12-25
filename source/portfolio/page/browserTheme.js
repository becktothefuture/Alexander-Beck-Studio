/**
 * Browser Theme System
 *
 * This module handles browser-specific theming and color matching.
 * It detects the user's browser and applies appropriate colors to match
 * the browser's native appearance in both light and dark modes.
 */

// Cache DOM elements and media query
const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)');
const root = document.documentElement;

// Browser-specific background colors
const BROWSER_BACKGROUNDS = {
  chrome: {
    light: '#ffffff',
    dark: '#3c3c3c',
  },
  safari: {
    light: '#f3f3f2',
    dark: '#242424',
  },
  firefox: {
    light: '#f5f5f5',
    dark: '#2e2e2e',
  },
  edge: {
    light: '#f3f2f1',
    dark: '#323130',
  },
  opera: {
    light: '#fafafa',
    dark: '#3b3b3b',
  },
  brave: {
    light: '#ffffff',
    dark: '#2d2d2d',
  },
  arc: {
    light: '#e8e8e8',
    dark: '#292a2b',
  },
  default: {
    light: '#ffffff',
    dark: '#1b1c1c',
  },
};

// Universal UI theme colors (same for all browsers)
const UI_THEME = {
  light: {
    text: '#202124',
    textSecondary: '#5f6368',
    buttonFill: '#ffffff',
    buttonOutline: '#dadce0',
    buttonText: '#202124',
    spine: '#f1f3f4',
    commentaryBg: 'rgba(255, 255, 255, 0.95)',
    commentaryText: 'rgba(32, 33, 36, 0.8)',
  },
  dark: {
    text: '#e8eaed',
    textSecondary: '#9aa0a6',
    buttonFill: '#444746',
    buttonOutline: '#5f6368',
    buttonText: '#e8eaed',
    spine: '#2d2d2d',
    commentaryBg: 'rgba(60, 60, 60, 0.95)',
    commentaryText: 'rgba(232, 234, 237, 0.8)',
  },
};

/**
 * Detect user's browser with improved accuracy
 * @returns {string} Browser identifier
 */
function detectBrowser() {
  const userAgent = navigator.userAgent.toLowerCase();

  // Check for Brave first as it can be detected via API
  if (navigator.brave && typeof navigator.brave.isBrave === 'function') {
    return 'brave';
  }

  // Check for Arc
  if (userAgent.includes('arc')) {
    return 'arc';
  }

  // Check for Edge (must be before Chrome as Edge includes Chrome in UA)
  if (userAgent.includes('edg')) {
    return 'edge';
  }

  // Check for Opera (must be before Chrome as Opera includes Chrome in UA)
  if (userAgent.includes('opera') || userAgent.includes('opr')) {
    return 'opera';
  }

  // Check for Chrome (must be after Edge and Opera)
  if (userAgent.includes('chrome')) {
    return 'chrome';
  }

  // Check for Safari (must be after Chrome as Safari includes Chrome in UA)
  if (userAgent.includes('safari')) {
    return 'safari';
  }

  // Check for Firefox
  if (userAgent.includes('firefox')) {
    return 'firefox';
  }

  return 'default';
}

/**
 * Apply browser-specific color settings with smooth transitions
 */
function applyBrowserColors() {
  const browser = detectBrowser();
  const mode = prefersDarkMode.matches ? 'dark' : 'light';
  const browserBg = BROWSER_BACKGROUNDS[browser] || BROWSER_BACKGROUNDS.default;
  const uiColors = UI_THEME[mode];

  // Add transition class
  root.classList.add('theme-transitioning');

  // Apply browser-specific background color
  root.style.setProperty('--browser-color', browserBg[mode]);

  // Apply universal UI theme colors
  root.style.setProperty('--browser-text', uiColors.text);
  root.style.setProperty('--browser-text-secondary', uiColors.textSecondary);
  root.style.setProperty('--browser-button-fill', uiColors.buttonFill);
  root.style.setProperty('--browser-button-outline', uiColors.buttonOutline);
  root.style.setProperty('--browser-button-text', uiColors.buttonText);
  root.style.setProperty('--browser-spine', uiColors.spine);
  root.style.setProperty('--browser-commentary-bg', uiColors.commentaryBg);
  root.style.setProperty('--browser-commentary-text', uiColors.commentaryText);

  // Apply noise overlay settings based on theme
  const noiseIntensity = mode === 'dark' ? '0.08' : '0.15';
  const noiseIntensityMobile = mode === 'dark' ? '0.04' : '0.08';
  root.style.setProperty('--noise-intensity', noiseIntensity);
  root.style.setProperty('--noise-intensity-mobile', noiseIntensityMobile);

  // Update theme-color meta tag
  const metaThemeColor = document.querySelector('meta[name="theme-color"]');
  if (metaThemeColor) {
    metaThemeColor.setAttribute('content', browserBg[mode]);
  }

  // Remove transition class after animation completes
  setTimeout(() => {
    root.classList.remove('theme-transitioning');
  }, 300);
}

/**
 * Initialize theme settings
 */
export function initBrowserTheme() {
  // Apply colors immediately before page shows
  applyBrowserColors();

  // Listen for theme changes
  prefersDarkMode.addEventListener('change', applyBrowserColors);

  // Listen for visibility changes to handle theme updates when tab becomes visible
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      applyBrowserColors();
    }
  });
}

/**
 * Control noise overlay intensity
 * @param {number} intensity - Noise intensity (0-1)
 * @param {number} mobileIntensity - Mobile noise intensity (0-1)
 */
export function setNoiseIntensity(intensity = 0.15, mobileIntensity = 0.08) {
  root.style.setProperty('--noise-intensity', intensity.toString());
  root.style.setProperty('--noise-intensity-mobile', mobileIntensity.toString());
}

/**
 * Toggle noise overlay on/off
 * @param {boolean} enabled - Whether noise should be enabled
 */
export function toggleNoise(enabled = true) {
  const noiseOverlay = document.querySelector('.noise-overlay');
  if (noiseOverlay) {
    noiseOverlay.style.display = enabled ? 'block' : 'none';
  }
}
