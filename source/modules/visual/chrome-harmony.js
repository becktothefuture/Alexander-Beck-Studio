// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                  BROWSER ↔ WALL CHROME HARMONY                               ║
// ║     When desktop browsers ignore theme-color, adapt the wall to the UI       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

function readCssVar(name, fallback) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

let _siteFrameLight = null;
let _siteFrameDark = null;

function captureSiteFrameColorsIfNeeded() {
  if (_siteFrameLight && _siteFrameDark) return;
  _siteFrameLight = readCssVar('--frame-color-light', '#0a0a0a');
  _siteFrameDark = readCssVar('--frame-color-dark', '#0a0a0a');
}

function detectBrowserFamily() {
  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';

  const isFirefox = /Firefox\//.test(ua);
  const isSafari = /Safari\//.test(ua) && /Apple/.test(vendor) && !/Chrome\//.test(ua) && !/Chromium\//.test(ua);
  const isChromium = /Chrome\//.test(ua) || /Chromium\//.test(ua) || /Edg\//.test(ua);

  return {
    isFirefox,
    isSafari,
    isChromium,
    ua
  };
}

function detectThemeColorLikelyApplied() {
  // Heuristic: theme-color is reliably applied on mobile address bars, and on installed PWAs.
  // On desktop Chrome/Edge normal tabs, theme-color is often ignored.
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/.test(ua);
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
  const isMobile = isAndroid || isIOS;

  const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches)
    // iOS Safari standalone flag
    || (navigator.standalone === true);

  return isMobile || isStandalone;
}

function applyWallColor(hex) {
  const root = document.documentElement;
  // Keep the system unified: wall + frame should agree when we are adapting.
  root.style.setProperty('--wall-color', hex);
  root.style.setProperty('--frame-color-light', hex);
  root.style.setProperty('--frame-color-dark', hex);
}

function restoreSiteWallColor(isDark) {
  // If we've previously adapted the wall/frame, restore to the captured site values.
  if (_siteFrameLight && _siteFrameDark) {
    const root = document.documentElement;
    root.style.setProperty('--frame-color-light', _siteFrameLight);
    root.style.setProperty('--frame-color-dark', _siteFrameDark);
    root.style.setProperty('--wall-color', isDark ? _siteFrameDark : _siteFrameLight);
    return;
  }
  // Otherwise, treat the current frame colors as the site baseline.
  const site = readCssVar(isDark ? '--frame-color-dark' : '--frame-color-light', '#0a0a0a');
  applyWallColor(site);
}

function applyBrowserWallColor(isDark, family) {
  captureSiteFrameColorsIfNeeded();
  // Default uses a Chrome-like Material palette; can be extended per family later.
  // CSS vars allow art-direction without touching JS.
  const fallback = readCssVar(isDark ? '--wall-color-browser-dark' : '--wall-color-browser-light', isDark ? '#202124' : '#f1f3f4');
  applyWallColor(fallback);
}

/**
 * Decide whether to adapt the wall color to browser UI defaults.
 * This is the "clever approach": when we can't tint chrome, we tint the wall.
 */
export function applyChromeHarmony(isDark) {
  const g = getGlobals();
  const mode = String(g.chromeHarmonyMode || 'auto');
  const family = detectBrowserFamily();

  if (mode === 'site') {
    restoreSiteWallColor(isDark);
    return { mode, family, themeColorLikelyApplied: detectThemeColorLikelyApplied() };
  }

  if (mode === 'browser') {
    applyBrowserWallColor(isDark, family);
    return { mode, family, themeColorLikelyApplied: detectThemeColorLikelyApplied() };
  }

  // auto
  const themeColorLikelyApplied = detectThemeColorLikelyApplied();

  // Preserve the Safari benchmark: we don't force wall adaptation there.
  if (family.isSafari) {
    restoreSiteWallColor(isDark);
    return { mode, family, themeColorLikelyApplied };
  }

  // Desktop Chromium tabs are the primary mismatch case: chrome can't be tinted -> adapt wall.
  if (family.isChromium && !themeColorLikelyApplied) {
    applyBrowserWallColor(isDark, family);
    return { mode, family, themeColorLikelyApplied };
  }

  // Firefox + others: stay on site wall unless explicitly forced.
  restoreSiteWallColor(isDark);
  return { mode, family, themeColorLikelyApplied };
}


