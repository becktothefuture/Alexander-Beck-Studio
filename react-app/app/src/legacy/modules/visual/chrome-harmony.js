// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                  BROWSER ↔ FRAME CHROME HARMONY                              ║
// ║     Browser/OS scheme owns the exposed page band, frame, and Button Bar      ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';
import {
  applyFrameChromePalette,
  applyShellPalette,
  detectBrowserFamily,
  getShellConfig,
  resolveBrowserFramePalette,
  resolveShellPalette,
  resolveSiteFramePalette,
} from './site-shell.js';

const CHROMIUM_BROWSER_LIGHT_FALLBACK = "var(--color-detected-f1f3f4)";
const CHROMIUM_BROWSER_DARK_FALLBACK = "var(--color-detected-202124)";
const FIREFOX_BROWSER_LIGHT_FALLBACK = "var(--color-detected-f9f9fb)";
const FIREFOX_BROWSER_DARK_FALLBACK = "var(--color-detected-1c1b22)";

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
    const palette = resolveBrowserFramePalette(isDark);
    applyFrameColor(isDark ? (palette.dark || FIREFOX_BROWSER_DARK_FALLBACK) : (palette.light || FIREFOX_BROWSER_LIGHT_FALLBACK), isDark);
    return;
  }

  const palette = resolveBrowserFramePalette(isDark);
  applyFrameColor(isDark ? (palette.dark || CHROMIUM_BROWSER_DARK_FALLBACK) : (palette.light || CHROMIUM_BROWSER_LIGHT_FALLBACK), isDark);
}

/**
 * Decide whether to adapt the frame color to browser UI defaults.
 * The shell wall palette is restored separately so UI contrast stays stable.
 */
export function resolveBrowserChromeIsDark() {
  return Boolean(window.matchMedia?.('(prefers-color-scheme: dark)').matches);
}

export function applyChromeHarmony() {
  const g = getGlobals();
  const shellConfig = getShellConfig();
  const mode = resolveHarmonyMode(g, shellConfig);
  const family = detectBrowserFamily();
  const browserIsDark = resolveBrowserChromeIsDark();
  const usesLightBrowserChrome = !browserIsDark && mode !== 'site';

  document.documentElement.toggleAttribute('data-abs-light-browser-chrome', usesLightBrowserChrome);

  applyShellPalette(resolveShellPalette(shellConfig));

  if (mode === 'site') {
    restoreSiteFrameColor(browserIsDark);
    return { mode, family, browserIsDark };
  }

  if (mode === 'browser') {
    applyBrowserFrameColor(browserIsDark, family);
    return { mode, family, browserIsDark };
  }

  // auto: browser/OS scheme owns the exposed frame in every browser family.
  applyBrowserFrameColor(browserIsDark, family);
  return { mode, family, browserIsDark };
}
