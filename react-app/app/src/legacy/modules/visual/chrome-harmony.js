// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                  BROWSER ↔ WALL CHROME HARMONY                               ║
// ║     When desktop browsers ignore theme-color, adapt the wall to the UI       ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import { applyFrameChromePalette, getShellConfig } from './site-shell.js';

let _siteFrameLight = null;
let _siteFrameDark = null;

const CHROMIUM_LOCKED_LIGHT_FALLBACK = '#f1f3f4';
const CHROMIUM_LOCKED_DARK_FALLBACK = '#202124';
const FIREFOX_LOCKED_LIGHT_FALLBACK = '#f9f9fb';
const FIREFOX_LOCKED_DARK_FALLBACK = '#1c1b22';

function captureSiteFrameColorsIfNeeded() {
  if (_siteFrameLight && _siteFrameDark) return;
  const g = getGlobals();
  _siteFrameLight = g?.frameColorLight || g?.frameColor || CHROMIUM_LOCKED_DARK_FALLBACK;
  _siteFrameDark = g?.frameColorDark || g?.frameColor || CHROMIUM_LOCKED_DARK_FALLBACK;
}

function detectBrowserFamily() {
  const ua = navigator.userAgent || '';
  const vendor = navigator.vendor || '';

  const isFirefox = /Firefox\//.test(ua) || /FxiOS\//.test(ua);
  const isSafari = /Safari\//.test(ua)
    && /Apple/.test(vendor)
    && !/Chrome\//.test(ua)
    && !/Chromium\//.test(ua)
    && !/CriOS\//.test(ua)
    && !/FxiOS\//.test(ua)
    && !/Edg\//.test(ua)
    && !/EdgiOS\//.test(ua)
    && !/OPR\//.test(ua)
    && !/OPiOS\//.test(ua);
  const isSamsungInternet = /SamsungBrowser\//.test(ua);
  const isChromium = /Chrome\//.test(ua)
    || /Chromium\//.test(ua)
    || /CriOS\//.test(ua)
    || /Edg\//.test(ua)
    || /EdgiOS\//.test(ua)
    || /OPR\//.test(ua)
    || /OPiOS\//.test(ua)
    || /Brave\//.test(ua)
    || isSamsungInternet;

  return {
    isFirefox,
    isSafari,
    isSamsungInternet,
    isChromium,
    ua
  };
}

function detectThemeColorLikelyApplied(family) {
  // Heuristic: theme-color is reliably applied on mobile address bars, and on installed PWAs.
  // On desktop Chrome/Edge normal tabs, theme-color is often ignored.
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/.test(ua);
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);

  const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches)
    // iOS Safari standalone flag
    || (navigator.standalone === true);

  // Firefox still does not apply <meta name="theme-color"> in browser chrome.
  if (family.isFirefox) return false;
  if (isStandalone) return true;
  if (family.isSafari) return true;
  if (family.isChromium) return isAndroid || family.isSamsungInternet;
  return isAndroid || isIOS;
}

function applyThemeAwareWallColor(lightHex, darkHex, isDark) {
  const active = isDark ? darkHex : lightHex;
  applyFrameChromePalette({ light: lightHex, dark: darkHex, active });
}

function applyWallColor(hex, isDark) {
  applyThemeAwareWallColor(hex, hex, isDark);
}

function restoreSiteWallColor(isDark) {
  // If we've previously adapted the wall/frame, restore to the captured site values.
  if (_siteFrameLight && _siteFrameDark) {
    applyThemeAwareWallColor(_siteFrameLight, _siteFrameDark, isDark);
    return;
  }
  const shell = getShellConfig();
  const g = getGlobals();
  const light = g?.frameColorLight || g?.frameColor || CHROMIUM_LOCKED_DARK_FALLBACK;
  const dark = g?.frameColorDark || g?.frameColor || CHROMIUM_LOCKED_DARK_FALLBACK;
  applyThemeAwareWallColor(light, dark, isDark);
}

function applyBrowserWallColor(isDark, family) {
  captureSiteFrameColorsIfNeeded();
  const shell = getShellConfig();
  if (family.isFirefox) {
    const firefoxFallback = isDark
      ? (shell?.theme?.lockedHeaderDark || FIREFOX_LOCKED_DARK_FALLBACK)
      : (shell?.theme?.lockedHeaderLight || FIREFOX_LOCKED_LIGHT_FALLBACK);
    applyWallColor(firefoxFallback, isDark);
    return;
  }

  const chromiumFallback = isDark
    ? (shell?.theme?.lockedHeaderDark || CHROMIUM_LOCKED_DARK_FALLBACK)
    : (shell?.theme?.lockedHeaderLight || CHROMIUM_LOCKED_LIGHT_FALLBACK);
  applyWallColor(chromiumFallback, isDark);
}

/**
 * Decide whether to adapt the wall color to browser UI defaults.
 * This is the "clever approach": when we can't tint chrome, we tint the wall.
 */
export function applyChromeHarmony(isDark) {
  const g = getGlobals();
  const mode = String(g.chromeHarmonyMode || 'auto');
  const family = detectBrowserFamily();
  const themeColorLikelyApplied = detectThemeColorLikelyApplied(family);

  if (mode === 'site') {
    restoreSiteWallColor(isDark);
    return { mode, family, themeColorLikelyApplied };
  }

  if (mode === 'browser') {
    applyBrowserWallColor(isDark, family);
    return { mode, family, themeColorLikelyApplied };
  }

  // auto
  // Preserve the Safari benchmark: we don't force wall adaptation there.
  if (family.isSafari) {
    restoreSiteWallColor(isDark);
    return { mode, family, themeColorLikelyApplied };
  }

  // Locked-header browsers: if the browser chrome likely won't respect theme-color,
  // adapt the wall to the browser's native UI palette.
  const isLockedHeaderFamily = family.isChromium || family.isFirefox;
  if (isLockedHeaderFamily && !themeColorLikelyApplied) {
    applyBrowserWallColor(isDark, family);
    return { mode, family, themeColorLikelyApplied };
  }

  // Firefox + others: stay on site wall unless explicitly forced.
  restoreSiteWallColor(isDark);
  return { mode, family, themeColorLikelyApplied };
}
