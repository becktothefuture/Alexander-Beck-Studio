// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                  BROWSER ↔ FRAME CHROME HARMONY                              ║
// ║     When desktop browsers ignore theme-color, adapt the frame to the UI      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import {
  applyFrameChromePalette,
  applyShellPalette,
  getShellConfig,
  resolveSafariFramePalette,
  resolveBrowserFramePalette,
  resolveShellPalette,
  resolveSiteFramePalette,
} from './site-shell.js';

const CHROMIUM_LOCKED_LIGHT_FALLBACK = "var(--color-detected-f1f3f4)";
const CHROMIUM_LOCKED_DARK_FALLBACK = "var(--color-detected-202124)";
const FIREFOX_LOCKED_LIGHT_FALLBACK = "var(--color-detected-f9f9fb)";
const FIREFOX_LOCKED_DARK_FALLBACK = "var(--color-detected-1c1b22)";

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

function applyThemeAwareFrameColor(lightHex, darkHex, isDark) {
  const active = isDark ? darkHex : lightHex;
  applyFrameChromePalette({ light: lightHex, dark: darkHex, active });
}

function applyFrameColor(hex, isDark) {
  applyThemeAwareFrameColor(hex, hex, isDark);
}

function normalizeHarmonyMode(value) {
  const mode = String(value || '').trim().toLowerCase();
  if (mode === 'browser') return 'browser';
  if (mode === 'site') return 'site';
  if (mode === 'auto' || mode === 'adaptive') return 'auto';
  return '';
}

function resolveHarmonyMode(globals, shellConfig) {
  const runtimeMode = normalizeHarmonyMode(globals?.chromeHarmonyMode);
  const shellMode = normalizeHarmonyMode(shellConfig?.theme?.chromeHarmonyMode);
  if (runtimeMode === 'browser' || runtimeMode === 'site' || runtimeMode === 'auto') return runtimeMode;
  if (shellMode === 'browser' || shellMode === 'site' || shellMode === 'auto') return shellMode;
  return 'auto';
}

function restoreSiteFrameColor(isDark) {
  const palette = resolveSiteFramePalette(isDark);
  applyThemeAwareFrameColor(palette.light, palette.dark, isDark);
}

function applyBrowserFrameColor(isDark, family) {
  if (family.isFirefox) {
    const palette = resolveBrowserFramePalette(getShellConfig(), isDark);
    applyFrameColor(isDark ? (palette.dark || FIREFOX_LOCKED_DARK_FALLBACK) : (palette.light || FIREFOX_LOCKED_LIGHT_FALLBACK), isDark);
    return;
  }

  const palette = resolveBrowserFramePalette(getShellConfig(), isDark);
  applyFrameColor(isDark ? (palette.dark || CHROMIUM_LOCKED_DARK_FALLBACK) : (palette.light || CHROMIUM_LOCKED_LIGHT_FALLBACK), isDark);
}

function applySafariFrameColor(isDark) {
  const palette = resolveSafariFramePalette(getShellConfig(), isDark);
  applyThemeAwareFrameColor(palette.light, palette.dark, isDark);
}

/**
 * Decide whether to adapt the frame color to browser UI defaults.
 * The shell wall palette is restored separately so UI contrast stays stable.
 */
export function applyChromeHarmony(isDark) {
  const g = getGlobals();
  const shellConfig = getShellConfig();
  const mode = resolveHarmonyMode(g, shellConfig);
  const family = detectBrowserFamily();
  const themeColorLikelyApplied = detectThemeColorLikelyApplied(family);

  applyShellPalette(resolveShellPalette(shellConfig, isDark));

  if (mode === 'site') {
    restoreSiteFrameColor(isDark);
    return { mode, family, themeColorLikelyApplied };
  }

  if (mode === 'browser') {
    if (family.isSafari) {
      applySafariFrameColor(isDark);
      return { mode, family, themeColorLikelyApplied };
    }
    applyBrowserFrameColor(isDark, family);
    return { mode, family, themeColorLikelyApplied };
  }

  // auto
  if (family.isSafari) {
    applySafariFrameColor(isDark);
    return { mode, family, themeColorLikelyApplied };
  }

  // Locked-header browsers: if the browser chrome likely won't respect theme-color,
  // adapt only the frame to the browser's native UI palette.
  const isLockedHeaderFamily = family.isChromium || family.isFirefox;
  if (isLockedHeaderFamily && !themeColorLikelyApplied) {
    applyBrowserFrameColor(isDark, family);
    return { mode, family, themeColorLikelyApplied };
  }

  // Firefox + others: stay on site frame unless explicitly forced.
  restoreSiteFrameColor(isDark);
  return { mode, family, themeColorLikelyApplied };
}
