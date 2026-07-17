import {
  deriveShellConfig,
  loadDesignSystemConfig,
  loadLegacyShellConfig,
  shouldUseCanonicalDesignConfig,
} from "/src/legacy/modules/utils/design-config.js";
import {
  applyLayoutCSSVars,
  applyLayoutFromVwToPx,
  getGlobals,
} from "/src/legacy/modules/core/state.js";
import { isDarkThemeDocument } from "/src/lib/theme-state.js";
import {
  buildResponsiveFrameRadiusCss,
  resolveFrameRadiusEndpoints,
} from "/src/legacy/modules/visual/frame-radius.js";
import {
  buildResponsiveFrameInsetCss,
  resolveFrameInsetEndpoints,
} from "/src/legacy/modules/visual/frame-inset.js";

const DEFAULT_SHELL_CONFIG = {
  theme: {
    wallBaseLight: '#efefef',
    wallBaseDark: '#141414',
    quoteButtonColorLight: '#efefef',
    quoteButtonColorDark: '#141414',
    siteFrameLight: '#141414',
    siteFrameDark: '#141414',
    chromeHarmonyMode: 'adaptive',
    frameBorderEdgeOpacity: 0.03,
    frameBorderMidOpacity: 0.06
  },
  layout: {
    frameInsetDesktop: '16px',
    frameInsetMobile: '10px',
    contentInsetDesktop: '28px',
    contentInsetTablet: '22px',
    contentInsetMobile: '16px',
    frameRadiusDesktop: '72px',
    frameRadiusMobile: '32px',
    decorativeScriptMaxWidth: '431px',
    decorativeScriptPaddingX: '0px',
    decorativeScriptPaddingY: '0px',
    quoteButtonSize: '200px',
    quotePaddingX: '28px',
    quotePaddingY: '24px',
    edgeCaptionDistanceMin: '8px',
    edgeCaptionDistanceMax: '48px'
  },
  surface: {
    radius: '18px',
    blur: '8px',
    saturation: 1.12,
    controlMaterialDarkenPercent: 5,
    controlMaterialFillOpacity: 0.72,
    controlMaterialOutlineOpacity: 0.12,
    controlMaterialOutlineActiveOpacity: 0.15,
    controlMaterialEmphasisOpacityLight: 0.86,
    controlMaterialEmphasisOpacityDark: 0.72,
    controlMaterialEdgeWidth: '0.5px',
    controlMaterialBlur: '18px',
    controlMaterialSaturation: 1.08,
    indicatorLineThickness: '3px',
    sceneHighlight: 0.3,
    contrastVeilOpacityLight: 0.216,
    contrastVeilOpacityDark: 0.348,
    contrastVeilReachX: 25,
    contrastVeilReachY: 25,
    contrastVeilBlurVmax: 7,
    contrastVeilDitherOpacity: 0.035,
    contrastVeilDitherSize: 96,
    edgeWidth: '0.5px',
    fillOpacityLight: 0.018,
    fillOpacityDark: 0.028,
    sheenTopOpacityLight: 0.03,
    sheenTopOpacityDark: 0.045,
    sheenMidOpacityLight: 0.01,
    sheenMidOpacityDark: 0.018,
    edgeOpacityLight: 0.06,
    edgeOpacityDark: 0.084,
    innerShadowOpacityLight: 0.015,
    innerShadowOpacityDark: 0.023,
    shadowOpacityLight: 0.104,
    shadowOpacityDark: 0.18,
    glowOpacityLight: 0.104,
    glowOpacityDark: 0.18,
    shadowBlur: '18px',
    shadowOffsetY: '6px',
    lightEdgeInset: '0.5px',
    lightEdgeBlur: '4px',
    lightEdgeTopOpacityLight: 0.028,
    lightEdgeTopOpacityDark: 0.035,
    lightEdgeBottomOpacityLight: 0.007,
    lightEdgeBottomOpacityDark: 0.012
  },
  motion: {
    shellRevealMs: 180,
    contentRevealMs: 420,
    simulationWarmupFrames: 90,
    allowScaleEntrance: false,
    modalOverlayOpacity: 0,
    modalOverlayBlurPx: 13.2,
    modalOverlayMobileBlurPx: 24,
    modalOverlayTransitionMs: 700,
    modalOverlayTransitionOutMs: 500,
    modalOverlayContentDelayMs: 200,
    modalDepthScale: 0.943,
    modalDepthTranslateY: 1
  },
  hero: {
    startupMode: '',
    desktopLogoWidthVw: 52,
    desktopLogoMinPx: 340,
    desktopLogoMaxPx: 640,
    mobileLogoWidthVw: 64,
    mobileLogoMinPx: 220,
    mobileLogoMaxPx: 320,
    mobileLogoHeightRatio: 0.3,
    mobileNavBottomOffset: '118px',
    centerKeepClearWidthRatio: 0.58,
    centerKeepClearHeightRatio: 0.28,
    navKeepClearWidthRatio: 0.44,
    navKeepClearHeightRatio: 0.1,
    navKeepClearOffsetRatio: 0.15,
    centerKeepClearForce: 900,
    pitSpawnBiasX: 0.74,
    pitSpawnBandWidthRatio: 0.18
  }
};

let currentShellConfig = DEFAULT_SHELL_CONFIG;
let shellConfigPromise = null;

function mergeShellConfig(base, override) {
  return {
    theme: { ...base.theme, ...(override?.theme || {}) },
    layout: { ...base.layout, ...(override?.layout || {}) },
    surface: { ...base.surface, ...(override?.surface || {}) },
    motion: { ...base.motion, ...(override?.motion || {}) },
    hero: { ...base.hero, ...(override?.hero || {}) }
  };
}

export function getShellConfig() {
  return currentShellConfig;
}

export function patchShellTheme(themePatch = {}) {
  currentShellConfig = mergeShellConfig(currentShellConfig, {
    theme: themePatch,
  });
  return currentShellConfig;
}

export function patchShellLayout(layoutPatch = {}) {
  currentShellConfig = mergeShellConfig(currentShellConfig, {
    layout: layoutPatch,
  });
  return currentShellConfig;
}

export async function loadShellConfig() {
  if (shellConfigPromise) return shellConfigPromise;

  shellConfigPromise = (async () => {
    if (shouldUseCanonicalDesignConfig()) {
      const designSystem = await loadDesignSystemConfig();
      currentShellConfig = mergeShellConfig(DEFAULT_SHELL_CONFIG, deriveShellConfig(designSystem));
      return currentShellConfig;
    }

    const legacyShell = await loadLegacyShellConfig();
    if (legacyShell && typeof legacyShell === 'object') {
      currentShellConfig = mergeShellConfig(DEFAULT_SHELL_CONFIG, legacyShell);
      return currentShellConfig;
    }

    const designSystem = await loadDesignSystemConfig();
    currentShellConfig = mergeShellConfig(DEFAULT_SHELL_CONFIG, deriveShellConfig(designSystem));
    return currentShellConfig;
  })().catch(() => {
    currentShellConfig = DEFAULT_SHELL_CONFIG;
    return currentShellConfig;
  });

  return shellConfigPromise;
}

export function detectBrowserFamily() {
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

  return { isFirefox, isSafari, isChromium, isSamsungInternet };
}

export function detectThemeColorLikelyApplied(family = detectBrowserFamily()) {
  const ua = navigator.userAgent || '';
  const isAndroid = /Android/.test(ua);
  const isIOS = /iPhone|iPad|iPod/.test(ua) || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
  const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches)
    || (navigator.standalone === true);

  if (family.isFirefox) return false;
  if (isStandalone) return true;
  if (family.isSafari) return true;
  if (family.isChromium) return isAndroid || family.isSamsungInternet;
  return isAndroid || isIOS;
}

export function resolveShellPalette(config = currentShellConfig, isDark = isDarkThemeDocument()) {
  const family = detectBrowserFamily();
  const themeColorLikelyApplied = detectThemeColorLikelyApplied(family);

  const stableWallBase = config?.theme?.wallBase || '';
  const light = config?.theme?.wallBaseLight
    || stableWallBase
    || DEFAULT_SHELL_CONFIG.theme.wallBaseLight;
  const dark = config?.theme?.wallBaseDark
    || stableWallBase
    || DEFAULT_SHELL_CONFIG.theme.wallBaseDark;
  const active = isDark ? dark : light;

  return {
    light,
    dark,
    active,
    family,
    themeColorLikelyApplied,
    usesLockedPalette: false
  };
}

function getDefaultFrameColor() {
  return '#202124';
}

function readCssVar(name) {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  return styles.getPropertyValue(name).trim();
}

export function resolveSiteFramePalette(isDark = isDarkThemeDocument()) {
  const light = readCssVar('--frame-color-site-light')
    || readCssVar('--frame-color-light')
    || getDefaultFrameColor();
  const dark = readCssVar('--frame-color-site-dark')
    || readCssVar('--frame-color-dark')
    || light
    || getDefaultFrameColor();
  const active = isDark ? dark : light;

  return { light, dark, active };
}

export function resolveBrowserFramePalette(isDark = isDarkThemeDocument()) {
  const family = detectBrowserFamily();
  let light = DEFAULT_SHELL_CONFIG.theme.siteFrameLight;
  let dark = DEFAULT_SHELL_CONFIG.theme.siteFrameDark;

  if (family.isFirefox) {
    light = '#f9f9fb';
    dark = '#1c1b22';
  } else {
    light = '#f1f3f4';
    dark = '#202124';
  }

  const active = isDark ? dark : light;

  return { light, dark, active };
}

export function applySiteFramePalette({ light, dark }) {
  const root = document.documentElement;
  const nextLight = light || getDefaultFrameColor();
  const nextDark = dark || nextLight;

  root.style.setProperty('--frame-color-site-light', nextLight);
  root.style.setProperty('--frame-color-site-dark', nextDark);
}

export function applyFrameChromePalette({ light, dark, active }) {
  const root = document.documentElement;
  const nextLight = light || active || getDefaultFrameColor();
  const nextDark = dark || active || nextLight;
  const nextActive = active || nextDark || nextLight;
  const outerInk = resolveOuterShellInk(nextActive);

  root.style.setProperty('--abs-browser-chrome', nextActive);
  root.style.setProperty('--frame-color-light', nextLight);
  root.style.setProperty('--frame-color-dark', nextDark);
  root.style.setProperty('--frame-color', nextActive);
  root.style.setProperty('--wall-color-light', nextLight);
  root.style.setProperty('--wall-color-dark', nextDark);
  root.style.setProperty('--wall-color', nextActive);
  root.style.setProperty('--chrome-bg-light', nextLight);
  root.style.setProperty('--chrome-bg-dark', nextDark);
  root.style.setProperty('--chrome-bg', nextActive);
  root.style.setProperty('--button-bar-outer-ink', outerInk.primary);
  root.style.setProperty('--button-bar-outer-ink-muted', outerInk.muted);
}

function colorToRgbString(color, fallback = '0, 0, 0') {
  const value = String(color || '').trim();
  if (!value) return fallback;

  const hex = value[0] === '#' ? value.slice(1) : value;
  if (hex.length === 3 || hex.length === 6) {
    const full = hex.length === 3
      ? hex.split('').map((c) => c + c).join('')
      : hex;
    const n = parseInt(full, 16);
    if (Number.isFinite(n)) {
      return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
    }
  }

  const rgb = value.match(/^rgba?\(\s*([\d.]+)(?:,|\s+)\s*([\d.]+)(?:,|\s+)\s*([\d.]+)/i);
  if (rgb) {
    return `${Math.round(Number(rgb[1]))}, ${Math.round(Number(rgb[2]))}, ${Math.round(Number(rgb[3]))}`;
  }

  return fallback;
}

function resolveOuterShellInk(color) {
  const rgb = colorToRgbString(color, '').split(',').map((part) => Number(part.trim()));
  const hasRgb = rgb.length === 3 && rgb.every(Number.isFinite);
  const isLight = hasRgb
    ? ((rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722) >= 150)
    : !window.matchMedia?.('(prefers-color-scheme: dark)').matches;

  return isLight
    ? { primary: 'rgba(0, 0, 0, 0.82)', muted: 'rgba(0, 0, 0, 0.62)' }
    : { primary: 'rgba(255, 255, 255, 0.88)', muted: 'rgba(255, 255, 255, 0.64)' };
}

function numberInRange(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function applyShellPalette({ light, dark, active }) {
  const root = document.documentElement;
  const nextActive = active || dark || light || DEFAULT_SHELL_CONFIG.theme.wallBaseDark;
  const nextLight = light || nextActive;
  const nextDark = dark || nextActive;

  root.style.setProperty('--abs-wall-base-light', nextLight);
  root.style.setProperty('--abs-wall-base-dark', nextDark);
  root.style.setProperty('--abs-wall-base', nextActive);
  root.style.setProperty('--shell-wall-bg', nextActive);
}

export function resolveWindowPalette(isDark = isDarkThemeDocument()) {
  const globals = getGlobals();
  const light = readCssVar('--bg-light') || globals?.bgLight || '#f5f5f5';
  const dark = readCssVar('--bg-dark') || globals?.bgDark || '#141414';
  return { light, dark, active: isDark ? dark : light };
}

export function applyWindowPalette({ light, dark, active }) {
  const root = document.documentElement;
  const nextLight = light || active || '#f5f5f5';
  const nextDark = dark || active || '#141414';
  const nextActive = active || nextLight;

  root.style.setProperty('--studio-window-bg-light', nextLight);
  root.style.setProperty('--studio-window-bg-dark', nextDark);
  root.style.setProperty('--studio-window-bg', nextActive);
  root.style.setProperty('--frame-inner-surface', 'var(--studio-window-bg)');
  root.style.setProperty('--simulation-contrast-veil-rgb', colorToRgbString(nextActive));
}

export function applyShellLayoutVars(config = currentShellConfig) {
  const root = document.documentElement;
  const layout = config?.layout || DEFAULT_SHELL_CONFIG.layout;
  const motion = config?.motion || DEFAULT_SHELL_CONFIG.motion;
  const hero = config?.hero || DEFAULT_SHELL_CONFIG.hero;

  const frameInset = resolveFrameInsetEndpoints(layout);
  root.style.setProperty('--abs-frame-inset-desktop', `${frameInset.desktop}px`);
  root.style.setProperty('--abs-frame-inset-mobile', `${frameInset.mobile}px`);
  root.style.setProperty('--abs-frame-inset-value', buildResponsiveFrameInsetCss(frameInset));
  root.style.setProperty('--abs-frame-inset', 'var(--abs-frame-inset-value)');
  root.style.removeProperty('--abs-frame-inset-tablet');
  root.style.setProperty('--abs-content-inset-desktop', layout.contentInsetDesktop);
  root.style.setProperty('--abs-content-inset-tablet', layout.contentInsetTablet);
  root.style.setProperty('--abs-content-inset-mobile', layout.contentInsetMobile);
  const frameRadius = resolveFrameRadiusEndpoints(layout);
  root.style.setProperty('--abs-frame-radius-desktop', `${frameRadius.desktop}px`);
  root.style.setProperty('--abs-frame-radius-mobile', `${frameRadius.mobile}px`);
  root.style.setProperty('--abs-frame-radius-value', buildResponsiveFrameRadiusCss(frameRadius));
  root.style.removeProperty('--abs-frame-radius-tablet');
  try {
    const globals = getGlobals();
    globals.frameInsetMobilePx = frameInset.mobile;
    globals.frameInsetDesktopPx = frameInset.desktop;
    globals.frameRadiusMobilePx = frameRadius.mobile;
    globals.frameRadiusDesktopPx = frameRadius.desktop;
    // Keep every JS geometry consumer synchronized when authored shell values
    // arrive asynchronously. Home's renderer also does this on resize, but
    // non-rendering routes otherwise retained the previous/default radius.
    applyLayoutFromVwToPx();
    applyLayoutCSSVars();
  } catch (e) {}
  root.style.setProperty('--decorative-script-max-width', layout.decorativeScriptMaxWidth);
  root.style.setProperty('--decorative-script-padding-left', layout.decorativeScriptPaddingX);
  root.style.setProperty('--decorative-script-padding-vertical', layout.decorativeScriptPaddingY);
  root.style.setProperty('--abs-quote-button-size', layout.quoteButtonSize || DEFAULT_SHELL_CONFIG.layout.quoteButtonSize);
  root.style.setProperty('--abs-quote-pad-x', layout.quotePaddingX);
  root.style.setProperty('--abs-quote-pad-y', layout.quotePaddingY);
  root.style.setProperty('--edge-caption-distance-min', layout.edgeCaptionDistanceMin);
  root.style.setProperty('--edge-caption-distance-max', layout.edgeCaptionDistanceMax);
  root.style.setProperty('--abs-shell-reveal-ms', `${motion.shellRevealMs}ms`);
  root.style.setProperty('--abs-content-reveal-ms', `${motion.contentRevealMs}ms`);
  root.style.setProperty('--modal-overlay-opacity', String(motion.modalOverlayOpacity));
  root.style.setProperty('--modal-overlay-blur', `${motion.modalOverlayBlurPx}px`);
  root.style.setProperty('--modal-overlay-mobile-blur', `${motion.modalOverlayMobileBlurPx ?? motion.modalOverlayBlurPx}px`);
  root.style.setProperty('--modal-overlay-transition-duration', `${motion.modalOverlayTransitionMs}ms`);
  root.style.setProperty('--modal-overlay-transition-out-duration', `${motion.modalOverlayTransitionOutMs}ms`);
  root.style.setProperty('--modal-content-delay', `${motion.modalOverlayContentDelayMs}ms`);
  root.style.setProperty('--modal-depth-scale', String(motion.modalDepthScale));
  root.style.setProperty('--modal-depth-translate-y', `${motion.modalDepthTranslateY}px`);
  root.style.setProperty('--abs-home-mobile-nav-bottom-offset', hero.mobileNavBottomOffset);
  root.style.setProperty('--abs-home-logo-width-vw', String(Number.isFinite(Number(hero.desktopLogoWidthVw)) ? hero.desktopLogoWidthVw : 52));
  root.style.setProperty('--abs-home-logo-min-px', `${Number.isFinite(Number(hero.desktopLogoMinPx)) ? hero.desktopLogoMinPx : 340}px`);
  root.style.setProperty('--abs-home-logo-max-px', `${Number.isFinite(Number(hero.desktopLogoMaxPx)) ? hero.desktopLogoMaxPx : 640}px`);
  root.style.setProperty('--abs-home-mobile-logo-width-vw', String(Number.isFinite(Number(hero.mobileLogoWidthVw)) ? hero.mobileLogoWidthVw : 64));
  root.style.setProperty('--abs-home-mobile-logo-min-px', `${Number.isFinite(Number(hero.mobileLogoMinPx)) ? hero.mobileLogoMinPx : 220}px`);
  root.style.setProperty('--abs-home-mobile-logo-max-px', `${Number.isFinite(Number(hero.mobileLogoMaxPx)) ? hero.mobileLogoMaxPx : 320}px`);
  root.style.setProperty('--abs-safe-top', 'env(safe-area-inset-top, 0px)');
  root.style.setProperty('--abs-safe-right', 'env(safe-area-inset-right, 0px)');
  root.style.setProperty('--abs-safe-bottom', 'env(safe-area-inset-bottom, 0px)');
  root.style.setProperty('--abs-safe-left', 'env(safe-area-inset-left, 0px)');
}

function applyShellSurfaceVars(config = currentShellConfig, isDark = isDarkThemeDocument()) {
  const root = document.documentElement;
  const theme = config?.theme || DEFAULT_SHELL_CONFIG.theme;
  const surface = config?.surface || DEFAULT_SHELL_CONFIG.surface;
  const sceneHighlight = Number.isFinite(Number(surface.sceneHighlight))
    ? Number(surface.sceneHighlight)
    : DEFAULT_SHELL_CONFIG.surface.sceneHighlight;
  const contrastVeilOpacityLight = numberInRange(
    surface.contrastVeilOpacityLight,
    0,
    0.6,
    DEFAULT_SHELL_CONFIG.surface.contrastVeilOpacityLight
  );
  const contrastVeilOpacityDark = numberInRange(
    surface.contrastVeilOpacityDark,
    0,
    0.6,
    DEFAULT_SHELL_CONFIG.surface.contrastVeilOpacityDark
  );
  const contrastVeilReachX = numberInRange(
    surface.contrastVeilReachX,
    0,
    50,
    DEFAULT_SHELL_CONFIG.surface.contrastVeilReachX
  );
  const contrastVeilReachY = numberInRange(
    surface.contrastVeilReachY,
    0,
    50,
    DEFAULT_SHELL_CONFIG.surface.contrastVeilReachY
  );
  const contrastVeilBlurVmax = numberInRange(
    surface.contrastVeilBlurVmax,
    2,
    16,
    DEFAULT_SHELL_CONFIG.surface.contrastVeilBlurVmax
  );
  const contrastVeilDitherOpacity = numberInRange(
    surface.contrastVeilDitherOpacity,
    0,
    0.12,
    DEFAULT_SHELL_CONFIG.surface.contrastVeilDitherOpacity
  );
  const contrastVeilDitherSize = numberInRange(
    surface.contrastVeilDitherSize,
    24,
    240,
    DEFAULT_SHELL_CONFIG.surface.contrastVeilDitherSize
  );
  const controlMaterialDarkenPercent = numberInRange(
    surface.controlMaterialDarkenPercent,
    0,
    5,
    DEFAULT_SHELL_CONFIG.surface.controlMaterialDarkenPercent
  );
  const controlMaterialFillOpacity = numberInRange(
    surface.controlMaterialFillOpacity,
    0,
    1,
    DEFAULT_SHELL_CONFIG.surface.controlMaterialFillOpacity
  );
  const controlMaterialOutlineOpacity = numberInRange(
    surface.controlMaterialOutlineOpacity,
    0,
    0.15,
    DEFAULT_SHELL_CONFIG.surface.controlMaterialOutlineOpacity
  );
  const controlMaterialOutlineActiveOpacity = numberInRange(
    surface.controlMaterialOutlineActiveOpacity,
    controlMaterialOutlineOpacity,
    0.15,
    DEFAULT_SHELL_CONFIG.surface.controlMaterialOutlineActiveOpacity
  );
  const controlMaterialEmphasisOpacity = numberInRange(
    isDark
      ? surface.controlMaterialEmphasisOpacityDark
      : surface.controlMaterialEmphasisOpacityLight,
    0,
    1,
    isDark
      ? DEFAULT_SHELL_CONFIG.surface.controlMaterialEmphasisOpacityDark
      : DEFAULT_SHELL_CONFIG.surface.controlMaterialEmphasisOpacityLight
  );
  const controlMaterialSaturation = numberInRange(
    surface.controlMaterialSaturation,
    1,
    1.5,
    DEFAULT_SHELL_CONFIG.surface.controlMaterialSaturation
  );

  const fillOpacity = isDark ? surface.fillOpacityDark : surface.fillOpacityLight;
  const sheenTopOpacity = isDark ? surface.sheenTopOpacityDark : surface.sheenTopOpacityLight;
  const sheenMidOpacity = isDark ? surface.sheenMidOpacityDark : surface.sheenMidOpacityLight;
  const edgeOpacity = isDark ? surface.edgeOpacityDark : surface.edgeOpacityLight;
  const innerShadowOpacity = isDark ? surface.innerShadowOpacityDark : surface.innerShadowOpacityLight;
  const shadowOpacity = isDark ? surface.shadowOpacityDark : surface.shadowOpacityLight;
  const glowOpacity = isDark
    ? (surface.glowOpacityDark ?? surface.shadowOpacityDark)
    : (surface.glowOpacityLight ?? surface.shadowOpacityLight);
  const topEdgeOpacity = isDark ? surface.lightEdgeTopOpacityDark : surface.lightEdgeTopOpacityLight;
  const bottomEdgeOpacity = isDark ? surface.lightEdgeBottomOpacityDark : surface.lightEdgeBottomOpacityLight;
  const edgeWidth = surface.edgeWidth || surface.lightEdgeInset || DEFAULT_SHELL_CONFIG.surface.edgeWidth;

  /* Quote button color (per-mode); fallback to inner wall if not set */
  const quoteBtnLight = theme.quoteButtonColorLight ?? theme.wallBaseLight ?? DEFAULT_SHELL_CONFIG.theme.wallBaseLight;
  const quoteBtnDark = theme.quoteButtonColorDark ?? theme.wallBaseDark ?? DEFAULT_SHELL_CONFIG.theme.wallBaseDark;
  root.style.setProperty('--quote-button-color-light', quoteBtnLight);
  root.style.setProperty('--quote-button-color-dark', quoteBtnDark);
  root.style.setProperty('--quote-button-color', isDark ? quoteBtnDark : quoteBtnLight);
  try {
    const g = getGlobals();
    if (g) {
      g.quoteButtonColorLight = quoteBtnLight;
      g.quoteButtonColorDark = quoteBtnDark;
    }
  } catch (e) {}

  root.style.setProperty('--frame-color-site-light', theme.siteFrameLight || getDefaultFrameColor());
  root.style.setProperty('--frame-color-site-dark', theme.siteFrameDark || theme.siteFrameLight || getDefaultFrameColor());
  root.style.setProperty('--frame-border-gradient-edge-opacity', String(theme.frameBorderEdgeOpacity));
  root.style.setProperty('--frame-border-gradient-mid-opacity', String(theme.frameBorderMidOpacity));

  root.style.setProperty('--abs-surface-radius', surface.radius);
  root.style.setProperty('--abs-surface-blur', surface.blur);
  root.style.setProperty('--abs-surface-saturation', String(surface.saturation));
  root.style.setProperty('--abs-surface-edge-width', edgeWidth);
  root.style.setProperty('--abs-surface-fill-opacity', String(fillOpacity));
  root.style.setProperty('--abs-surface-sheen-top-opacity', String(sheenTopOpacity));
  root.style.setProperty('--abs-surface-sheen-mid-opacity', String(sheenMidOpacity));
  root.style.setProperty('--abs-surface-edge-opacity', String(edgeOpacity));
  root.style.setProperty('--abs-surface-inner-shadow-opacity', String(innerShadowOpacity));
  root.style.setProperty('--abs-surface-shadow-opacity', String(shadowOpacity));
  root.style.setProperty('--abs-surface-glow-opacity', String(glowOpacity));
  root.style.setProperty('--abs-surface-shadow-blur', surface.shadowBlur);
  root.style.setProperty('--abs-surface-shadow-offset-y', surface.shadowOffsetY);
  root.style.setProperty('--abs-surface-light-edge-inset', surface.lightEdgeInset);
  root.style.setProperty('--abs-surface-light-edge-blur', surface.lightEdgeBlur);
  root.style.setProperty('--abs-surface-light-edge-top-opacity', String(topEdgeOpacity));
  root.style.setProperty('--abs-surface-light-edge-bottom-opacity', String(bottomEdgeOpacity));
  root.style.setProperty('--abs-soft-control-darken', `${controlMaterialDarkenPercent}%`);
  root.style.setProperty('--abs-soft-control-fill-opacity', `${controlMaterialFillOpacity * 100}%`);
  root.style.setProperty('--abs-soft-control-outline-opacity', `${controlMaterialOutlineOpacity * 100}%`);
  root.style.setProperty('--abs-soft-control-outline-active-opacity', `${controlMaterialOutlineActiveOpacity * 100}%`);
  root.style.setProperty('--abs-soft-control-emphasis-opacity', `${controlMaterialEmphasisOpacity * 100}%`);
  root.style.setProperty(
    '--abs-soft-control-edge-width',
    surface.controlMaterialEdgeWidth || DEFAULT_SHELL_CONFIG.surface.controlMaterialEdgeWidth
  );
  root.style.setProperty(
    '--abs-soft-control-blur',
    surface.controlMaterialBlur || DEFAULT_SHELL_CONFIG.surface.controlMaterialBlur
  );
  root.style.setProperty('--abs-soft-control-saturation', String(controlMaterialSaturation));
  root.style.setProperty(
    '--abs-indicator-line-thickness',
    surface.indicatorLineThickness || DEFAULT_SHELL_CONFIG.surface.indicatorLineThickness
  );
  root.style.setProperty('--hover-edge-width', edgeWidth);
  root.style.setProperty('--hover-edge-top-opacity', String(topEdgeOpacity));
  root.style.setProperty('--hover-edge-bottom-opacity', String(Math.max(bottomEdgeOpacity, edgeOpacity * 0.28)));

  root.style.setProperty('--quote-glass-blur', surface.blur);
  root.style.setProperty('--quote-glass-saturation', String(surface.saturation));
  root.style.setProperty('--quote-glass-fill-opacity', String(fillOpacity));
  root.style.setProperty('--quote-glass-sheen-top-opacity', String(sheenTopOpacity));
  root.style.setProperty('--quote-glass-sheen-mid-opacity', String(sheenMidOpacity));
  root.style.setProperty('--quote-glass-edge-opacity', String(edgeOpacity));
  root.style.setProperty('--quote-glass-inner-shadow-opacity', String(innerShadowOpacity));
  root.style.setProperty('--quote-glass-shadow-opacity', String(glowOpacity));
  root.style.setProperty('--quote-glass-shadow-blur', surface.shadowBlur);
  root.style.setProperty('--quote-glass-shadow-offset-y', surface.shadowOffsetY);
  root.style.setProperty('--quote-glass-bottom-edge-opacity', String(Math.max(bottomEdgeOpacity, edgeOpacity * 0.28)));

  root.style.setProperty('--abs-scene-highlight', String(sceneHighlight));
  root.style.setProperty('--simulation-contrast-veil-opacity', String(isDark ? contrastVeilOpacityDark : contrastVeilOpacityLight));
  root.style.setProperty('--simulation-contrast-veil-reach-x', `${contrastVeilReachX}vw`);
  root.style.setProperty('--simulation-contrast-veil-reach-y', `${contrastVeilReachY}vh`);
  root.style.setProperty('--simulation-contrast-veil-blur-vmax', String(contrastVeilBlurVmax));
  root.style.setProperty('--simulation-contrast-veil-blur', `clamp(42px, ${contrastVeilBlurVmax}vmax, 120px)`);
  root.style.setProperty('--simulation-contrast-veil-dither-opacity', String(contrastVeilDitherOpacity));
  root.style.setProperty('--simulation-contrast-veil-dither-size', `${contrastVeilDitherSize}px`);
  root.style.setProperty('--inner-wall-top-light-opacity', String(isDark
    ? Math.min(0.82, Number((sceneHighlight * 1.33).toFixed(3)))
    : sceneHighlight));
  root.style.setProperty('--inner-wall-top-light-opacity-dark', String(Math.min(0.82, Number((sceneHighlight * 1.33).toFixed(3)))));

  try {
    const globals = getGlobals();
    globals.simulationContrastVeilOpacityLight = contrastVeilOpacityLight;
    globals.simulationContrastVeilOpacityDark = contrastVeilOpacityDark;
    globals.simulationContrastVeilReachX = contrastVeilReachX;
    globals.simulationContrastVeilReachY = contrastVeilReachY;
    globals.simulationContrastVeilBlurVmax = contrastVeilBlurVmax;
    globals.simulationContrastVeilDitherOpacity = contrastVeilDitherOpacity;
    globals.simulationContrastVeilDitherSize = contrastVeilDitherSize;
  } catch (e) {}
}

export function syncThemeColorMeta() {
  const { light, dark, active } = applyFramePaletteReadback();
  const entries = [
    { media: '(prefers-color-scheme: light)', color: light || active },
    { media: '(prefers-color-scheme: dark)', color: dark || active }
  ];

  entries.forEach(({ media, color }) => {
    let tag = document.querySelector(`meta[name="theme-color"][media="${media}"]`);
    if (!tag) {
      tag = document.createElement('meta');
      tag.name = 'theme-color';
      tag.media = media;
      document.head.appendChild(tag);
    }
    tag.content = color;
  });

  let fallback = document.querySelector('meta[name="theme-color"]:not([media])');
  if (!fallback) {
    fallback = document.createElement('meta');
    fallback.name = 'theme-color';
    document.head.appendChild(fallback);
  }
  fallback.content = active || dark || light;
}

function applyFramePaletteReadback(isDark = isDarkThemeDocument()) {
  const light = readCssVar('--frame-color-light') || getDefaultFrameColor();
  const dark = readCssVar('--frame-color-dark') || light || getDefaultFrameColor();
  const active = readCssVar('--frame-color') || (isDark ? dark : light);

  return { light, dark, active };
}

export function syncShellToDocument(options = {}) {
  const config = options.config || currentShellConfig;
  const isDark = options.isDark ?? isDarkThemeDocument();
  const innerPalette = resolveShellPalette(config, isDark);

  applyShellLayoutVars(config);
  applyShellPalette(innerPalette);
  applyWindowPalette(resolveWindowPalette(isDark));
  applyShellSurfaceVars(config, isDark);
  const siteFramePalette = resolveSiteFramePalette(isDark);
  applySiteFramePalette(siteFramePalette);

  return innerPalette;
}

export function getModalChromeConfig(config = currentShellConfig) {
  const motion = config?.motion || DEFAULT_SHELL_CONFIG.motion;
  return {
    modalOverlayOpacity: motion.modalOverlayOpacity,
    modalOverlayBlurPx: motion.modalOverlayBlurPx,
    modalOverlayMobileBlurPx: motion.modalOverlayMobileBlurPx,
    modalOverlayTransitionMs: motion.modalOverlayTransitionMs,
    modalOverlayTransitionOutMs: motion.modalOverlayTransitionOutMs,
    modalOverlayContentDelayMs: motion.modalOverlayContentDelayMs,
    modalDepthScale: motion.modalDepthScale,
    modalDepthTranslateY: motion.modalDepthTranslateY,
  };
}

export function getSimulationWarmupMs(config = currentShellConfig) {
  const frames = Number(config?.motion?.simulationWarmupFrames) || 0;
  return Math.max(0, Math.round((frames / 60) * 1000));
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbInNpdGUtc2hlbGwuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgZGVyaXZlU2hlbGxDb25maWcsXG4gIGxvYWREZXNpZ25TeXN0ZW1Db25maWcsXG4gIGxvYWRMZWdhY3lTaGVsbENvbmZpZyxcbiAgc2hvdWxkVXNlQ2Fub25pY2FsRGVzaWduQ29uZmlnLFxufSBmcm9tIFwiL3NyYy9sZWdhY3kvbW9kdWxlcy91dGlscy9kZXNpZ24tY29uZmlnLmpzXCI7XG5pbXBvcnQge1xuICBhcHBseUxheW91dENTU1ZhcnMsXG4gIGFwcGx5TGF5b3V0RnJvbVZ3VG9QeCxcbiAgZ2V0R2xvYmFscyxcbn0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvY29yZS9zdGF0ZS5qc1wiO1xuaW1wb3J0IHsgaXNEYXJrVGhlbWVEb2N1bWVudCB9IGZyb20gXCIvc3JjL2xpYi90aGVtZS1zdGF0ZS5qc1wiO1xuaW1wb3J0IHtcbiAgYnVpbGRSZXNwb25zaXZlRnJhbWVSYWRpdXNDc3MsXG4gIHJlc29sdmVGcmFtZVJhZGl1c0VuZHBvaW50cyxcbn0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvdmlzdWFsL2ZyYW1lLXJhZGl1cy5qc1wiO1xuaW1wb3J0IHtcbiAgYnVpbGRSZXNwb25zaXZlRnJhbWVJbnNldENzcyxcbiAgcmVzb2x2ZUZyYW1lSW5zZXRFbmRwb2ludHMsXG59IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3Zpc3VhbC9mcmFtZS1pbnNldC5qc1wiO1xuXG5jb25zdCBERUZBVUxUX1NIRUxMX0NPTkZJRyA9IHtcbiAgdGhlbWU6IHtcbiAgICB3YWxsQmFzZUxpZ2h0OiAnI2VmZWZlZicsXG4gICAgd2FsbEJhc2VEYXJrOiAnIzE0MTQxNCcsXG4gICAgcXVvdGVCdXR0b25Db2xvckxpZ2h0OiAnI2VmZWZlZicsXG4gICAgcXVvdGVCdXR0b25Db2xvckRhcms6ICcjMTQxNDE0JyxcbiAgICBzaXRlRnJhbWVMaWdodDogJyMxNDE0MTQnLFxuICAgIHNpdGVGcmFtZURhcms6ICcjMTQxNDE0JyxcbiAgICBjaHJvbWVIYXJtb255TW9kZTogJ2FkYXB0aXZlJyxcbiAgICBmcmFtZUJvcmRlckVkZ2VPcGFjaXR5OiAwLjAzLFxuICAgIGZyYW1lQm9yZGVyTWlkT3BhY2l0eTogMC4wNlxuICB9LFxuICBsYXlvdXQ6IHtcbiAgICBmcmFtZUluc2V0RGVza3RvcDogJzE2cHgnLFxuICAgIGZyYW1lSW5zZXRNb2JpbGU6ICcxMHB4JyxcbiAgICBjb250ZW50SW5zZXREZXNrdG9wOiAnMjhweCcsXG4gICAgY29udGVudEluc2V0VGFibGV0OiAnMjJweCcsXG4gICAgY29udGVudEluc2V0TW9iaWxlOiAnMTZweCcsXG4gICAgZnJhbWVSYWRpdXNEZXNrdG9wOiAnNzJweCcsXG4gICAgZnJhbWVSYWRpdXNNb2JpbGU6ICczMnB4JyxcbiAgICBkZWNvcmF0aXZlU2NyaXB0TWF4V2lkdGg6ICc0MzFweCcsXG4gICAgZGVjb3JhdGl2ZVNjcmlwdFBhZGRpbmdYOiAnMHB4JyxcbiAgICBkZWNvcmF0aXZlU2NyaXB0UGFkZGluZ1k6ICcwcHgnLFxuICAgIHF1b3RlQnV0dG9uU2l6ZTogJzIwMHB4JyxcbiAgICBxdW90ZVBhZGRpbmdYOiAnMjhweCcsXG4gICAgcXVvdGVQYWRkaW5nWTogJzI0cHgnLFxuICAgIGVkZ2VDYXB0aW9uRGlzdGFuY2VNaW46ICc4cHgnLFxuICAgIGVkZ2VDYXB0aW9uRGlzdGFuY2VNYXg6ICc0OHB4J1xuICB9LFxuICBzdXJmYWNlOiB7XG4gICAgcmFkaXVzOiAnMThweCcsXG4gICAgYmx1cjogJzhweCcsXG4gICAgc2F0dXJhdGlvbjogMS4xMixcbiAgICBjb250cm9sTWF0ZXJpYWxEYXJrZW5QZXJjZW50OiA1LFxuICAgIGNvbnRyb2xNYXRlcmlhbEZpbGxPcGFjaXR5OiAwLjcyLFxuICAgIGNvbnRyb2xNYXRlcmlhbE91dGxpbmVPcGFjaXR5OiAwLjEyLFxuICAgIGNvbnRyb2xNYXRlcmlhbE91dGxpbmVBY3RpdmVPcGFjaXR5OiAwLjE1LFxuICAgIGNvbnRyb2xNYXRlcmlhbEVtcGhhc2lzT3BhY2l0eUxpZ2h0OiAwLjg2LFxuICAgIGNvbnRyb2xNYXRlcmlhbEVtcGhhc2lzT3BhY2l0eURhcms6IDAuNzIsXG4gICAgY29udHJvbE1hdGVyaWFsRWRnZVdpZHRoOiAnMC41cHgnLFxuICAgIGNvbnRyb2xNYXRlcmlhbEJsdXI6ICcxOHB4JyxcbiAgICBjb250cm9sTWF0ZXJpYWxTYXR1cmF0aW9uOiAxLjA4LFxuICAgIGluZGljYXRvckxpbmVUaGlja25lc3M6ICczcHgnLFxuICAgIHNjZW5lSGlnaGxpZ2h0OiAwLjMsXG4gICAgY29udHJhc3RWZWlsT3BhY2l0eUxpZ2h0OiAwLjIxNixcbiAgICBjb250cmFzdFZlaWxPcGFjaXR5RGFyazogMC4zNDgsXG4gICAgY29udHJhc3RWZWlsUmVhY2hYOiAyNSxcbiAgICBjb250cmFzdFZlaWxSZWFjaFk6IDI1LFxuICAgIGNvbnRyYXN0VmVpbEJsdXJWbWF4OiA3LFxuICAgIGNvbnRyYXN0VmVpbERpdGhlck9wYWNpdHk6IDAuMDM1LFxuICAgIGNvbnRyYXN0VmVpbERpdGhlclNpemU6IDk2LFxuICAgIGVkZ2VXaWR0aDogJzAuNXB4JyxcbiAgICBmaWxsT3BhY2l0eUxpZ2h0OiAwLjAxOCxcbiAgICBmaWxsT3BhY2l0eURhcms6IDAuMDI4LFxuICAgIHNoZWVuVG9wT3BhY2l0eUxpZ2h0OiAwLjAzLFxuICAgIHNoZWVuVG9wT3BhY2l0eURhcms6IDAuMDQ1LFxuICAgIHNoZWVuTWlkT3BhY2l0eUxpZ2h0OiAwLjAxLFxuICAgIHNoZWVuTWlkT3BhY2l0eURhcms6IDAuMDE4LFxuICAgIGVkZ2VPcGFjaXR5TGlnaHQ6IDAuMDYsXG4gICAgZWRnZU9wYWNpdHlEYXJrOiAwLjA4NCxcbiAgICBpbm5lclNoYWRvd09wYWNpdHlMaWdodDogMC4wMTUsXG4gICAgaW5uZXJTaGFkb3dPcGFjaXR5RGFyazogMC4wMjMsXG4gICAgc2hhZG93T3BhY2l0eUxpZ2h0OiAwLjEwNCxcbiAgICBzaGFkb3dPcGFjaXR5RGFyazogMC4xOCxcbiAgICBnbG93T3BhY2l0eUxpZ2h0OiAwLjEwNCxcbiAgICBnbG93T3BhY2l0eURhcms6IDAuMTgsXG4gICAgc2hhZG93Qmx1cjogJzE4cHgnLFxuICAgIHNoYWRvd09mZnNldFk6ICc2cHgnLFxuICAgIGxpZ2h0RWRnZUluc2V0OiAnMC41cHgnLFxuICAgIGxpZ2h0RWRnZUJsdXI6ICc0cHgnLFxuICAgIGxpZ2h0RWRnZVRvcE9wYWNpdHlMaWdodDogMC4wMjgsXG4gICAgbGlnaHRFZGdlVG9wT3BhY2l0eURhcms6IDAuMDM1LFxuICAgIGxpZ2h0RWRnZUJvdHRvbU9wYWNpdHlMaWdodDogMC4wMDcsXG4gICAgbGlnaHRFZGdlQm90dG9tT3BhY2l0eURhcms6IDAuMDEyXG4gIH0sXG4gIG1vdGlvbjoge1xuICAgIHNoZWxsUmV2ZWFsTXM6IDE4MCxcbiAgICBjb250ZW50UmV2ZWFsTXM6IDQyMCxcbiAgICBzaW11bGF0aW9uV2FybXVwRnJhbWVzOiA5MCxcbiAgICBhbGxvd1NjYWxlRW50cmFuY2U6IGZhbHNlLFxuICAgIG1vZGFsT3ZlcmxheU9wYWNpdHk6IDAsXG4gICAgbW9kYWxPdmVybGF5Qmx1clB4OiAxMy4yLFxuICAgIG1vZGFsT3ZlcmxheU1vYmlsZUJsdXJQeDogMjQsXG4gICAgbW9kYWxPdmVybGF5VHJhbnNpdGlvbk1zOiA3MDAsXG4gICAgbW9kYWxPdmVybGF5VHJhbnNpdGlvbk91dE1zOiA1MDAsXG4gICAgbW9kYWxPdmVybGF5Q29udGVudERlbGF5TXM6IDIwMCxcbiAgICBtb2RhbERlcHRoU2NhbGU6IDAuOTQzLFxuICAgIG1vZGFsRGVwdGhUcmFuc2xhdGVZOiAxXG4gIH0sXG4gIGhlcm86IHtcbiAgICBzdGFydHVwTW9kZTogJycsXG4gICAgZGVza3RvcExvZ29XaWR0aFZ3OiA1MixcbiAgICBkZXNrdG9wTG9nb01pblB4OiAzNDAsXG4gICAgZGVza3RvcExvZ29NYXhQeDogNjQwLFxuICAgIG1vYmlsZUxvZ29XaWR0aFZ3OiA2NCxcbiAgICBtb2JpbGVMb2dvTWluUHg6IDIyMCxcbiAgICBtb2JpbGVMb2dvTWF4UHg6IDMyMCxcbiAgICBtb2JpbGVMb2dvSGVpZ2h0UmF0aW86IDAuMyxcbiAgICBtb2JpbGVOYXZCb3R0b21PZmZzZXQ6ICcxMThweCcsXG4gICAgY2VudGVyS2VlcENsZWFyV2lkdGhSYXRpbzogMC41OCxcbiAgICBjZW50ZXJLZWVwQ2xlYXJIZWlnaHRSYXRpbzogMC4yOCxcbiAgICBuYXZLZWVwQ2xlYXJXaWR0aFJhdGlvOiAwLjQ0LFxuICAgIG5hdktlZXBDbGVhckhlaWdodFJhdGlvOiAwLjEsXG4gICAgbmF2S2VlcENsZWFyT2Zmc2V0UmF0aW86IDAuMTUsXG4gICAgY2VudGVyS2VlcENsZWFyRm9yY2U6IDkwMCxcbiAgICBwaXRTcGF3bkJpYXNYOiAwLjc0LFxuICAgIHBpdFNwYXduQmFuZFdpZHRoUmF0aW86IDAuMThcbiAgfVxufTtcblxubGV0IGN1cnJlbnRTaGVsbENvbmZpZyA9IERFRkFVTFRfU0hFTExfQ09ORklHO1xubGV0IHNoZWxsQ29uZmlnUHJvbWlzZSA9IG51bGw7XG5cbmZ1bmN0aW9uIG1lcmdlU2hlbGxDb25maWcoYmFzZSwgb3ZlcnJpZGUpIHtcbiAgcmV0dXJuIHtcbiAgICB0aGVtZTogeyAuLi5iYXNlLnRoZW1lLCAuLi4ob3ZlcnJpZGU/LnRoZW1lIHx8IHt9KSB9LFxuICAgIGxheW91dDogeyAuLi5iYXNlLmxheW91dCwgLi4uKG92ZXJyaWRlPy5sYXlvdXQgfHwge30pIH0sXG4gICAgc3VyZmFjZTogeyAuLi5iYXNlLnN1cmZhY2UsIC4uLihvdmVycmlkZT8uc3VyZmFjZSB8fCB7fSkgfSxcbiAgICBtb3Rpb246IHsgLi4uYmFzZS5tb3Rpb24sIC4uLihvdmVycmlkZT8ubW90aW9uIHx8IHt9KSB9LFxuICAgIGhlcm86IHsgLi4uYmFzZS5oZXJvLCAuLi4ob3ZlcnJpZGU/Lmhlcm8gfHwge30pIH1cbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFNoZWxsQ29uZmlnKCkge1xuICByZXR1cm4gY3VycmVudFNoZWxsQ29uZmlnO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcGF0Y2hTaGVsbFRoZW1lKHRoZW1lUGF0Y2ggPSB7fSkge1xuICBjdXJyZW50U2hlbGxDb25maWcgPSBtZXJnZVNoZWxsQ29uZmlnKGN1cnJlbnRTaGVsbENvbmZpZywge1xuICAgIHRoZW1lOiB0aGVtZVBhdGNoLFxuICB9KTtcbiAgcmV0dXJuIGN1cnJlbnRTaGVsbENvbmZpZztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhdGNoU2hlbGxMYXlvdXQobGF5b3V0UGF0Y2ggPSB7fSkge1xuICBjdXJyZW50U2hlbGxDb25maWcgPSBtZXJnZVNoZWxsQ29uZmlnKGN1cnJlbnRTaGVsbENvbmZpZywge1xuICAgIGxheW91dDogbGF5b3V0UGF0Y2gsXG4gIH0pO1xuICByZXR1cm4gY3VycmVudFNoZWxsQ29uZmlnO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZFNoZWxsQ29uZmlnKCkge1xuICBpZiAoc2hlbGxDb25maWdQcm9taXNlKSByZXR1cm4gc2hlbGxDb25maWdQcm9taXNlO1xuXG4gIHNoZWxsQ29uZmlnUHJvbWlzZSA9IChhc3luYyAoKSA9PiB7XG4gICAgaWYgKHNob3VsZFVzZUNhbm9uaWNhbERlc2lnbkNvbmZpZygpKSB7XG4gICAgICBjb25zdCBkZXNpZ25TeXN0ZW0gPSBhd2FpdCBsb2FkRGVzaWduU3lzdGVtQ29uZmlnKCk7XG4gICAgICBjdXJyZW50U2hlbGxDb25maWcgPSBtZXJnZVNoZWxsQ29uZmlnKERFRkFVTFRfU0hFTExfQ09ORklHLCBkZXJpdmVTaGVsbENvbmZpZyhkZXNpZ25TeXN0ZW0pKTtcbiAgICAgIHJldHVybiBjdXJyZW50U2hlbGxDb25maWc7XG4gICAgfVxuXG4gICAgY29uc3QgbGVnYWN5U2hlbGwgPSBhd2FpdCBsb2FkTGVnYWN5U2hlbGxDb25maWcoKTtcbiAgICBpZiAobGVnYWN5U2hlbGwgJiYgdHlwZW9mIGxlZ2FjeVNoZWxsID09PSAnb2JqZWN0Jykge1xuICAgICAgY3VycmVudFNoZWxsQ29uZmlnID0gbWVyZ2VTaGVsbENvbmZpZyhERUZBVUxUX1NIRUxMX0NPTkZJRywgbGVnYWN5U2hlbGwpO1xuICAgICAgcmV0dXJuIGN1cnJlbnRTaGVsbENvbmZpZztcbiAgICB9XG5cbiAgICBjb25zdCBkZXNpZ25TeXN0ZW0gPSBhd2FpdCBsb2FkRGVzaWduU3lzdGVtQ29uZmlnKCk7XG4gICAgY3VycmVudFNoZWxsQ29uZmlnID0gbWVyZ2VTaGVsbENvbmZpZyhERUZBVUxUX1NIRUxMX0NPTkZJRywgZGVyaXZlU2hlbGxDb25maWcoZGVzaWduU3lzdGVtKSk7XG4gICAgcmV0dXJuIGN1cnJlbnRTaGVsbENvbmZpZztcbiAgfSkoKS5jYXRjaCgoKSA9PiB7XG4gICAgY3VycmVudFNoZWxsQ29uZmlnID0gREVGQVVMVF9TSEVMTF9DT05GSUc7XG4gICAgcmV0dXJuIGN1cnJlbnRTaGVsbENvbmZpZztcbiAgfSk7XG5cbiAgcmV0dXJuIHNoZWxsQ29uZmlnUHJvbWlzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRldGVjdEJyb3dzZXJGYW1pbHkoKSB7XG4gIGNvbnN0IHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudCB8fCAnJztcbiAgY29uc3QgdmVuZG9yID0gbmF2aWdhdG9yLnZlbmRvciB8fCAnJztcbiAgY29uc3QgaXNGaXJlZm94ID0gL0ZpcmVmb3hcXC8vLnRlc3QodWEpIHx8IC9GeGlPU1xcLy8udGVzdCh1YSk7XG4gIGNvbnN0IGlzU2FmYXJpID0gL1NhZmFyaVxcLy8udGVzdCh1YSlcbiAgICAmJiAvQXBwbGUvLnRlc3QodmVuZG9yKVxuICAgICYmICEvQ2hyb21lXFwvLy50ZXN0KHVhKVxuICAgICYmICEvQ2hyb21pdW1cXC8vLnRlc3QodWEpXG4gICAgJiYgIS9DcmlPU1xcLy8udGVzdCh1YSlcbiAgICAmJiAhL0Z4aU9TXFwvLy50ZXN0KHVhKVxuICAgICYmICEvRWRnXFwvLy50ZXN0KHVhKVxuICAgICYmICEvRWRnaU9TXFwvLy50ZXN0KHVhKVxuICAgICYmICEvT1BSXFwvLy50ZXN0KHVhKVxuICAgICYmICEvT1BpT1NcXC8vLnRlc3QodWEpO1xuICBjb25zdCBpc1NhbXN1bmdJbnRlcm5ldCA9IC9TYW1zdW5nQnJvd3NlclxcLy8udGVzdCh1YSk7XG4gIGNvbnN0IGlzQ2hyb21pdW0gPSAvQ2hyb21lXFwvLy50ZXN0KHVhKVxuICAgIHx8IC9DaHJvbWl1bVxcLy8udGVzdCh1YSlcbiAgICB8fCAvQ3JpT1NcXC8vLnRlc3QodWEpXG4gICAgfHwgL0VkZ1xcLy8udGVzdCh1YSlcbiAgICB8fCAvRWRnaU9TXFwvLy50ZXN0KHVhKVxuICAgIHx8IC9PUFJcXC8vLnRlc3QodWEpXG4gICAgfHwgL09QaU9TXFwvLy50ZXN0KHVhKVxuICAgIHx8IC9CcmF2ZVxcLy8udGVzdCh1YSlcbiAgICB8fCBpc1NhbXN1bmdJbnRlcm5ldDtcblxuICByZXR1cm4geyBpc0ZpcmVmb3gsIGlzU2FmYXJpLCBpc0Nocm9taXVtLCBpc1NhbXN1bmdJbnRlcm5ldCB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGV0ZWN0VGhlbWVDb2xvckxpa2VseUFwcGxpZWQoZmFtaWx5ID0gZGV0ZWN0QnJvd3NlckZhbWlseSgpKSB7XG4gIGNvbnN0IHVhID0gbmF2aWdhdG9yLnVzZXJBZ2VudCB8fCAnJztcbiAgY29uc3QgaXNBbmRyb2lkID0gL0FuZHJvaWQvLnRlc3QodWEpO1xuICBjb25zdCBpc0lPUyA9IC9pUGhvbmV8aVBhZHxpUG9kLy50ZXN0KHVhKSB8fCAoL01hYy8udGVzdCh1YSkgJiYgbmF2aWdhdG9yLm1heFRvdWNoUG9pbnRzID4gMSk7XG4gIGNvbnN0IGlzU3RhbmRhbG9uZSA9ICh3aW5kb3cubWF0Y2hNZWRpYSAmJiB3aW5kb3cubWF0Y2hNZWRpYSgnKGRpc3BsYXktbW9kZTogc3RhbmRhbG9uZSknKS5tYXRjaGVzKVxuICAgIHx8ICh3aW5kb3cubWF0Y2hNZWRpYSAmJiB3aW5kb3cubWF0Y2hNZWRpYSgnKGRpc3BsYXktbW9kZTogbWluaW1hbC11aSknKS5tYXRjaGVzKVxuICAgIHx8IChuYXZpZ2F0b3Iuc3RhbmRhbG9uZSA9PT0gdHJ1ZSk7XG5cbiAgaWYgKGZhbWlseS5pc0ZpcmVmb3gpIHJldHVybiBmYWxzZTtcbiAgaWYgKGlzU3RhbmRhbG9uZSkgcmV0dXJuIHRydWU7XG4gIGlmIChmYW1pbHkuaXNTYWZhcmkpIHJldHVybiB0cnVlO1xuICBpZiAoZmFtaWx5LmlzQ2hyb21pdW0pIHJldHVybiBpc0FuZHJvaWQgfHwgZmFtaWx5LmlzU2Ftc3VuZ0ludGVybmV0O1xuICByZXR1cm4gaXNBbmRyb2lkIHx8IGlzSU9TO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzb2x2ZVNoZWxsUGFsZXR0ZShjb25maWcgPSBjdXJyZW50U2hlbGxDb25maWcsIGlzRGFyayA9IGlzRGFya1RoZW1lRG9jdW1lbnQoKSkge1xuICBjb25zdCBmYW1pbHkgPSBkZXRlY3RCcm93c2VyRmFtaWx5KCk7XG4gIGNvbnN0IHRoZW1lQ29sb3JMaWtlbHlBcHBsaWVkID0gZGV0ZWN0VGhlbWVDb2xvckxpa2VseUFwcGxpZWQoZmFtaWx5KTtcblxuICBjb25zdCBzdGFibGVXYWxsQmFzZSA9IGNvbmZpZz8udGhlbWU/LndhbGxCYXNlIHx8ICcnO1xuICBjb25zdCBsaWdodCA9IGNvbmZpZz8udGhlbWU/LndhbGxCYXNlTGlnaHRcbiAgICB8fCBzdGFibGVXYWxsQmFzZVxuICAgIHx8IERFRkFVTFRfU0hFTExfQ09ORklHLnRoZW1lLndhbGxCYXNlTGlnaHQ7XG4gIGNvbnN0IGRhcmsgPSBjb25maWc/LnRoZW1lPy53YWxsQmFzZURhcmtcbiAgICB8fCBzdGFibGVXYWxsQmFzZVxuICAgIHx8IERFRkFVTFRfU0hFTExfQ09ORklHLnRoZW1lLndhbGxCYXNlRGFyaztcbiAgY29uc3QgYWN0aXZlID0gaXNEYXJrID8gZGFyayA6IGxpZ2h0O1xuXG4gIHJldHVybiB7XG4gICAgbGlnaHQsXG4gICAgZGFyayxcbiAgICBhY3RpdmUsXG4gICAgZmFtaWx5LFxuICAgIHRoZW1lQ29sb3JMaWtlbHlBcHBsaWVkLFxuICAgIHVzZXNMb2NrZWRQYWxldHRlOiBmYWxzZVxuICB9O1xufVxuXG5mdW5jdGlvbiBnZXREZWZhdWx0RnJhbWVDb2xvcigpIHtcbiAgcmV0dXJuICcjMjAyMTI0Jztcbn1cblxuZnVuY3Rpb24gcmVhZENzc1ZhcihuYW1lKSB7XG4gIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGNvbnN0IHN0eWxlcyA9IGdldENvbXB1dGVkU3R5bGUocm9vdCk7XG4gIHJldHVybiBzdHlsZXMuZ2V0UHJvcGVydHlWYWx1ZShuYW1lKS50cmltKCk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlU2l0ZUZyYW1lUGFsZXR0ZShpc0RhcmsgPSBpc0RhcmtUaGVtZURvY3VtZW50KCkpIHtcbiAgY29uc3QgbGlnaHQgPSByZWFkQ3NzVmFyKCctLWZyYW1lLWNvbG9yLXNpdGUtbGlnaHQnKVxuICAgIHx8IHJlYWRDc3NWYXIoJy0tZnJhbWUtY29sb3ItbGlnaHQnKVxuICAgIHx8IGdldERlZmF1bHRGcmFtZUNvbG9yKCk7XG4gIGNvbnN0IGRhcmsgPSByZWFkQ3NzVmFyKCctLWZyYW1lLWNvbG9yLXNpdGUtZGFyaycpXG4gICAgfHwgcmVhZENzc1ZhcignLS1mcmFtZS1jb2xvci1kYXJrJylcbiAgICB8fCBsaWdodFxuICAgIHx8IGdldERlZmF1bHRGcmFtZUNvbG9yKCk7XG4gIGNvbnN0IGFjdGl2ZSA9IGlzRGFyayA/IGRhcmsgOiBsaWdodDtcblxuICByZXR1cm4geyBsaWdodCwgZGFyaywgYWN0aXZlIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlQnJvd3NlckZyYW1lUGFsZXR0ZShpc0RhcmsgPSBpc0RhcmtUaGVtZURvY3VtZW50KCkpIHtcbiAgY29uc3QgZmFtaWx5ID0gZGV0ZWN0QnJvd3NlckZhbWlseSgpO1xuICBsZXQgbGlnaHQgPSBERUZBVUxUX1NIRUxMX0NPTkZJRy50aGVtZS5zaXRlRnJhbWVMaWdodDtcbiAgbGV0IGRhcmsgPSBERUZBVUxUX1NIRUxMX0NPTkZJRy50aGVtZS5zaXRlRnJhbWVEYXJrO1xuXG4gIGlmIChmYW1pbHkuaXNGaXJlZm94KSB7XG4gICAgbGlnaHQgPSAnI2Y5ZjlmYic7XG4gICAgZGFyayA9ICcjMWMxYjIyJztcbiAgfSBlbHNlIHtcbiAgICBsaWdodCA9ICcjZjFmM2Y0JztcbiAgICBkYXJrID0gJyMyMDIxMjQnO1xuICB9XG5cbiAgY29uc3QgYWN0aXZlID0gaXNEYXJrID8gZGFyayA6IGxpZ2h0O1xuXG4gIHJldHVybiB7IGxpZ2h0LCBkYXJrLCBhY3RpdmUgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5U2l0ZUZyYW1lUGFsZXR0ZSh7IGxpZ2h0LCBkYXJrIH0pIHtcbiAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgY29uc3QgbmV4dExpZ2h0ID0gbGlnaHQgfHwgZ2V0RGVmYXVsdEZyYW1lQ29sb3IoKTtcbiAgY29uc3QgbmV4dERhcmsgPSBkYXJrIHx8IG5leHRMaWdodDtcblxuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWZyYW1lLWNvbG9yLXNpdGUtbGlnaHQnLCBuZXh0TGlnaHQpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWZyYW1lLWNvbG9yLXNpdGUtZGFyaycsIG5leHREYXJrKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5RnJhbWVDaHJvbWVQYWxldHRlKHsgbGlnaHQsIGRhcmssIGFjdGl2ZSB9KSB7XG4gIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGNvbnN0IG5leHRMaWdodCA9IGxpZ2h0IHx8IGFjdGl2ZSB8fCBnZXREZWZhdWx0RnJhbWVDb2xvcigpO1xuICBjb25zdCBuZXh0RGFyayA9IGRhcmsgfHwgYWN0aXZlIHx8IG5leHRMaWdodDtcbiAgY29uc3QgbmV4dEFjdGl2ZSA9IGFjdGl2ZSB8fCBuZXh0RGFyayB8fCBuZXh0TGlnaHQ7XG4gIGNvbnN0IG91dGVySW5rID0gcmVzb2x2ZU91dGVyU2hlbGxJbmsobmV4dEFjdGl2ZSk7XG5cbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtYnJvd3Nlci1jaHJvbWUnLCBuZXh0QWN0aXZlKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1mcmFtZS1jb2xvci1saWdodCcsIG5leHRMaWdodCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tZnJhbWUtY29sb3ItZGFyaycsIG5leHREYXJrKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1mcmFtZS1jb2xvcicsIG5leHRBY3RpdmUpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLXdhbGwtY29sb3ItbGlnaHQnLCBuZXh0TGlnaHQpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLXdhbGwtY29sb3ItZGFyaycsIG5leHREYXJrKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS13YWxsLWNvbG9yJywgbmV4dEFjdGl2ZSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tY2hyb21lLWJnLWxpZ2h0JywgbmV4dExpZ2h0KTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1jaHJvbWUtYmctZGFyaycsIG5leHREYXJrKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1jaHJvbWUtYmcnLCBuZXh0QWN0aXZlKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1idXR0b24tYmFyLW91dGVyLWluaycsIG91dGVySW5rLnByaW1hcnkpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWJ1dHRvbi1iYXItb3V0ZXItaW5rLW11dGVkJywgb3V0ZXJJbmsubXV0ZWQpO1xufVxuXG5mdW5jdGlvbiBjb2xvclRvUmdiU3RyaW5nKGNvbG9yLCBmYWxsYmFjayA9ICcwLCAwLCAwJykge1xuICBjb25zdCB2YWx1ZSA9IFN0cmluZyhjb2xvciB8fCAnJykudHJpbSgpO1xuICBpZiAoIXZhbHVlKSByZXR1cm4gZmFsbGJhY2s7XG5cbiAgY29uc3QgaGV4ID0gdmFsdWVbMF0gPT09ICcjJyA/IHZhbHVlLnNsaWNlKDEpIDogdmFsdWU7XG4gIGlmIChoZXgubGVuZ3RoID09PSAzIHx8IGhleC5sZW5ndGggPT09IDYpIHtcbiAgICBjb25zdCBmdWxsID0gaGV4Lmxlbmd0aCA9PT0gM1xuICAgICAgPyBoZXguc3BsaXQoJycpLm1hcCgoYykgPT4gYyArIGMpLmpvaW4oJycpXG4gICAgICA6IGhleDtcbiAgICBjb25zdCBuID0gcGFyc2VJbnQoZnVsbCwgMTYpO1xuICAgIGlmIChOdW1iZXIuaXNGaW5pdGUobikpIHtcbiAgICAgIHJldHVybiBgJHsobiA+PiAxNikgJiAyNTV9LCAkeyhuID4+IDgpICYgMjU1fSwgJHtuICYgMjU1fWA7XG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmdiID0gdmFsdWUubWF0Y2goL15yZ2JhP1xcKFxccyooW1xcZC5dKykoPzosfFxccyspXFxzKihbXFxkLl0rKSg/Oix8XFxzKylcXHMqKFtcXGQuXSspL2kpO1xuICBpZiAocmdiKSB7XG4gICAgcmV0dXJuIGAke01hdGgucm91bmQoTnVtYmVyKHJnYlsxXSkpfSwgJHtNYXRoLnJvdW5kKE51bWJlcihyZ2JbMl0pKX0sICR7TWF0aC5yb3VuZChOdW1iZXIocmdiWzNdKSl9YDtcbiAgfVxuXG4gIHJldHVybiBmYWxsYmFjaztcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZU91dGVyU2hlbGxJbmsoY29sb3IpIHtcbiAgY29uc3QgcmdiID0gY29sb3JUb1JnYlN0cmluZyhjb2xvciwgJycpLnNwbGl0KCcsJykubWFwKChwYXJ0KSA9PiBOdW1iZXIocGFydC50cmltKCkpKTtcbiAgY29uc3QgaGFzUmdiID0gcmdiLmxlbmd0aCA9PT0gMyAmJiByZ2IuZXZlcnkoTnVtYmVyLmlzRmluaXRlKTtcbiAgY29uc3QgaXNMaWdodCA9IGhhc1JnYlxuICAgID8gKChyZ2JbMF0gKiAwLjIxMjYgKyByZ2JbMV0gKiAwLjcxNTIgKyByZ2JbMl0gKiAwLjA3MjIpID49IDE1MClcbiAgICA6ICF3aW5kb3cubWF0Y2hNZWRpYT8uKCcocHJlZmVycy1jb2xvci1zY2hlbWU6IGRhcmspJykubWF0Y2hlcztcblxuICByZXR1cm4gaXNMaWdodFxuICAgID8geyBwcmltYXJ5OiAncmdiYSgwLCAwLCAwLCAwLjgyKScsIG11dGVkOiAncmdiYSgwLCAwLCAwLCAwLjYyKScgfVxuICAgIDogeyBwcmltYXJ5OiAncmdiYSgyNTUsIDI1NSwgMjU1LCAwLjg4KScsIG11dGVkOiAncmdiYSgyNTUsIDI1NSwgMjU1LCAwLjY0KScgfTtcbn1cblxuZnVuY3Rpb24gbnVtYmVySW5SYW5nZSh2YWx1ZSwgbWluLCBtYXgsIGZhbGxiYWNrKSB7XG4gIGNvbnN0IG51bWVyaWMgPSBOdW1iZXIodmFsdWUpO1xuICBpZiAoIU51bWJlci5pc0Zpbml0ZShudW1lcmljKSkgcmV0dXJuIGZhbGxiYWNrO1xuICByZXR1cm4gTWF0aC5taW4obWF4LCBNYXRoLm1heChtaW4sIG51bWVyaWMpKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5U2hlbGxQYWxldHRlKHsgbGlnaHQsIGRhcmssIGFjdGl2ZSB9KSB7XG4gIGNvbnN0IHJvb3QgPSBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQ7XG4gIGNvbnN0IG5leHRBY3RpdmUgPSBhY3RpdmUgfHwgZGFyayB8fCBsaWdodCB8fCBERUZBVUxUX1NIRUxMX0NPTkZJRy50aGVtZS53YWxsQmFzZURhcms7XG4gIGNvbnN0IG5leHRMaWdodCA9IGxpZ2h0IHx8IG5leHRBY3RpdmU7XG4gIGNvbnN0IG5leHREYXJrID0gZGFyayB8fCBuZXh0QWN0aXZlO1xuXG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXdhbGwtYmFzZS1saWdodCcsIG5leHRMaWdodCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXdhbGwtYmFzZS1kYXJrJywgbmV4dERhcmspO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy13YWxsLWJhc2UnLCBuZXh0QWN0aXZlKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1zaGVsbC13YWxsLWJnJywgbmV4dEFjdGl2ZSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiByZXNvbHZlV2luZG93UGFsZXR0ZShpc0RhcmsgPSBpc0RhcmtUaGVtZURvY3VtZW50KCkpIHtcbiAgY29uc3QgZ2xvYmFscyA9IGdldEdsb2JhbHMoKTtcbiAgY29uc3QgbGlnaHQgPSByZWFkQ3NzVmFyKCctLWJnLWxpZ2h0JykgfHwgZ2xvYmFscz8uYmdMaWdodCB8fCAnI2Y1ZjVmNSc7XG4gIGNvbnN0IGRhcmsgPSByZWFkQ3NzVmFyKCctLWJnLWRhcmsnKSB8fCBnbG9iYWxzPy5iZ0RhcmsgfHwgJyMxNDE0MTQnO1xuICByZXR1cm4geyBsaWdodCwgZGFyaywgYWN0aXZlOiBpc0RhcmsgPyBkYXJrIDogbGlnaHQgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5V2luZG93UGFsZXR0ZSh7IGxpZ2h0LCBkYXJrLCBhY3RpdmUgfSkge1xuICBjb25zdCByb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICBjb25zdCBuZXh0TGlnaHQgPSBsaWdodCB8fCBhY3RpdmUgfHwgJyNmNWY1ZjUnO1xuICBjb25zdCBuZXh0RGFyayA9IGRhcmsgfHwgYWN0aXZlIHx8ICcjMTQxNDE0JztcbiAgY29uc3QgbmV4dEFjdGl2ZSA9IGFjdGl2ZSB8fCBuZXh0TGlnaHQ7XG5cbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1zdHVkaW8td2luZG93LWJnLWxpZ2h0JywgbmV4dExpZ2h0KTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1zdHVkaW8td2luZG93LWJnLWRhcmsnLCBuZXh0RGFyayk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tc3R1ZGlvLXdpbmRvdy1iZycsIG5leHRBY3RpdmUpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWZyYW1lLWlubmVyLXN1cmZhY2UnLCAndmFyKC0tc3R1ZGlvLXdpbmRvdy1iZyknKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1zaW11bGF0aW9uLWNvbnRyYXN0LXZlaWwtcmdiJywgY29sb3JUb1JnYlN0cmluZyhuZXh0QWN0aXZlKSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBhcHBseVNoZWxsTGF5b3V0VmFycyhjb25maWcgPSBjdXJyZW50U2hlbGxDb25maWcpIHtcbiAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgY29uc3QgbGF5b3V0ID0gY29uZmlnPy5sYXlvdXQgfHwgREVGQVVMVF9TSEVMTF9DT05GSUcubGF5b3V0O1xuICBjb25zdCBtb3Rpb24gPSBjb25maWc/Lm1vdGlvbiB8fCBERUZBVUxUX1NIRUxMX0NPTkZJRy5tb3Rpb247XG4gIGNvbnN0IGhlcm8gPSBjb25maWc/Lmhlcm8gfHwgREVGQVVMVF9TSEVMTF9DT05GSUcuaGVybztcblxuICBjb25zdCBmcmFtZUluc2V0ID0gcmVzb2x2ZUZyYW1lSW5zZXRFbmRwb2ludHMobGF5b3V0KTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtZnJhbWUtaW5zZXQtZGVza3RvcCcsIGAke2ZyYW1lSW5zZXQuZGVza3RvcH1weGApO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1mcmFtZS1pbnNldC1tb2JpbGUnLCBgJHtmcmFtZUluc2V0Lm1vYmlsZX1weGApO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1mcmFtZS1pbnNldC12YWx1ZScsIGJ1aWxkUmVzcG9uc2l2ZUZyYW1lSW5zZXRDc3MoZnJhbWVJbnNldCkpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1mcmFtZS1pbnNldCcsICd2YXIoLS1hYnMtZnJhbWUtaW5zZXQtdmFsdWUpJyk7XG4gIHJvb3Quc3R5bGUucmVtb3ZlUHJvcGVydHkoJy0tYWJzLWZyYW1lLWluc2V0LXRhYmxldCcpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1jb250ZW50LWluc2V0LWRlc2t0b3AnLCBsYXlvdXQuY29udGVudEluc2V0RGVza3RvcCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLWNvbnRlbnQtaW5zZXQtdGFibGV0JywgbGF5b3V0LmNvbnRlbnRJbnNldFRhYmxldCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLWNvbnRlbnQtaW5zZXQtbW9iaWxlJywgbGF5b3V0LmNvbnRlbnRJbnNldE1vYmlsZSk7XG4gIGNvbnN0IGZyYW1lUmFkaXVzID0gcmVzb2x2ZUZyYW1lUmFkaXVzRW5kcG9pbnRzKGxheW91dCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLWZyYW1lLXJhZGl1cy1kZXNrdG9wJywgYCR7ZnJhbWVSYWRpdXMuZGVza3RvcH1weGApO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1mcmFtZS1yYWRpdXMtbW9iaWxlJywgYCR7ZnJhbWVSYWRpdXMubW9iaWxlfXB4YCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLWZyYW1lLXJhZGl1cy12YWx1ZScsIGJ1aWxkUmVzcG9uc2l2ZUZyYW1lUmFkaXVzQ3NzKGZyYW1lUmFkaXVzKSk7XG4gIHJvb3Quc3R5bGUucmVtb3ZlUHJvcGVydHkoJy0tYWJzLWZyYW1lLXJhZGl1cy10YWJsZXQnKTtcbiAgdHJ5IHtcbiAgICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICAgIGdsb2JhbHMuZnJhbWVJbnNldE1vYmlsZVB4ID0gZnJhbWVJbnNldC5tb2JpbGU7XG4gICAgZ2xvYmFscy5mcmFtZUluc2V0RGVza3RvcFB4ID0gZnJhbWVJbnNldC5kZXNrdG9wO1xuICAgIGdsb2JhbHMuZnJhbWVSYWRpdXNNb2JpbGVQeCA9IGZyYW1lUmFkaXVzLm1vYmlsZTtcbiAgICBnbG9iYWxzLmZyYW1lUmFkaXVzRGVza3RvcFB4ID0gZnJhbWVSYWRpdXMuZGVza3RvcDtcbiAgICAvLyBLZWVwIGV2ZXJ5IEpTIGdlb21ldHJ5IGNvbnN1bWVyIHN5bmNocm9uaXplZCB3aGVuIGF1dGhvcmVkIHNoZWxsIHZhbHVlc1xuICAgIC8vIGFycml2ZSBhc3luY2hyb25vdXNseS4gSG9tZSdzIHJlbmRlcmVyIGFsc28gZG9lcyB0aGlzIG9uIHJlc2l6ZSwgYnV0XG4gICAgLy8gbm9uLXJlbmRlcmluZyByb3V0ZXMgb3RoZXJ3aXNlIHJldGFpbmVkIHRoZSBwcmV2aW91cy9kZWZhdWx0IHJhZGl1cy5cbiAgICBhcHBseUxheW91dEZyb21Wd1RvUHgoKTtcbiAgICBhcHBseUxheW91dENTU1ZhcnMoKTtcbiAgfSBjYXRjaCAoZSkge31cbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1kZWNvcmF0aXZlLXNjcmlwdC1tYXgtd2lkdGgnLCBsYXlvdXQuZGVjb3JhdGl2ZVNjcmlwdE1heFdpZHRoKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1kZWNvcmF0aXZlLXNjcmlwdC1wYWRkaW5nLWxlZnQnLCBsYXlvdXQuZGVjb3JhdGl2ZVNjcmlwdFBhZGRpbmdYKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1kZWNvcmF0aXZlLXNjcmlwdC1wYWRkaW5nLXZlcnRpY2FsJywgbGF5b3V0LmRlY29yYXRpdmVTY3JpcHRQYWRkaW5nWSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXF1b3RlLWJ1dHRvbi1zaXplJywgbGF5b3V0LnF1b3RlQnV0dG9uU2l6ZSB8fCBERUZBVUxUX1NIRUxMX0NPTkZJRy5sYXlvdXQucXVvdGVCdXR0b25TaXplKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtcXVvdGUtcGFkLXgnLCBsYXlvdXQucXVvdGVQYWRkaW5nWCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXF1b3RlLXBhZC15JywgbGF5b3V0LnF1b3RlUGFkZGluZ1kpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWVkZ2UtY2FwdGlvbi1kaXN0YW5jZS1taW4nLCBsYXlvdXQuZWRnZUNhcHRpb25EaXN0YW5jZU1pbik7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tZWRnZS1jYXB0aW9uLWRpc3RhbmNlLW1heCcsIGxheW91dC5lZGdlQ2FwdGlvbkRpc3RhbmNlTWF4KTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtc2hlbGwtcmV2ZWFsLW1zJywgYCR7bW90aW9uLnNoZWxsUmV2ZWFsTXN9bXNgKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtY29udGVudC1yZXZlYWwtbXMnLCBgJHttb3Rpb24uY29udGVudFJldmVhbE1zfW1zYCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbW9kYWwtb3ZlcmxheS1vcGFjaXR5JywgU3RyaW5nKG1vdGlvbi5tb2RhbE92ZXJsYXlPcGFjaXR5KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbW9kYWwtb3ZlcmxheS1ibHVyJywgYCR7bW90aW9uLm1vZGFsT3ZlcmxheUJsdXJQeH1weGApO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLW1vZGFsLW92ZXJsYXktbW9iaWxlLWJsdXInLCBgJHttb3Rpb24ubW9kYWxPdmVybGF5TW9iaWxlQmx1clB4ID8/IG1vdGlvbi5tb2RhbE92ZXJsYXlCbHVyUHh9cHhgKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1tb2RhbC1vdmVybGF5LXRyYW5zaXRpb24tZHVyYXRpb24nLCBgJHttb3Rpb24ubW9kYWxPdmVybGF5VHJhbnNpdGlvbk1zfW1zYCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbW9kYWwtb3ZlcmxheS10cmFuc2l0aW9uLW91dC1kdXJhdGlvbicsIGAke21vdGlvbi5tb2RhbE92ZXJsYXlUcmFuc2l0aW9uT3V0TXN9bXNgKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1tb2RhbC1jb250ZW50LWRlbGF5JywgYCR7bW90aW9uLm1vZGFsT3ZlcmxheUNvbnRlbnREZWxheU1zfW1zYCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbW9kYWwtZGVwdGgtc2NhbGUnLCBTdHJpbmcobW90aW9uLm1vZGFsRGVwdGhTY2FsZSkpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLW1vZGFsLWRlcHRoLXRyYW5zbGF0ZS15JywgYCR7bW90aW9uLm1vZGFsRGVwdGhUcmFuc2xhdGVZfXB4YCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLWhvbWUtbW9iaWxlLW5hdi1ib3R0b20tb2Zmc2V0JywgaGVyby5tb2JpbGVOYXZCb3R0b21PZmZzZXQpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1ob21lLWxvZ28td2lkdGgtdncnLCBTdHJpbmcoTnVtYmVyLmlzRmluaXRlKE51bWJlcihoZXJvLmRlc2t0b3BMb2dvV2lkdGhWdykpID8gaGVyby5kZXNrdG9wTG9nb1dpZHRoVncgOiA1MikpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1ob21lLWxvZ28tbWluLXB4JywgYCR7TnVtYmVyLmlzRmluaXRlKE51bWJlcihoZXJvLmRlc2t0b3BMb2dvTWluUHgpKSA/IGhlcm8uZGVza3RvcExvZ29NaW5QeCA6IDM0MH1weGApO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1ob21lLWxvZ28tbWF4LXB4JywgYCR7TnVtYmVyLmlzRmluaXRlKE51bWJlcihoZXJvLmRlc2t0b3BMb2dvTWF4UHgpKSA/IGhlcm8uZGVza3RvcExvZ29NYXhQeCA6IDY0MH1weGApO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1ob21lLW1vYmlsZS1sb2dvLXdpZHRoLXZ3JywgU3RyaW5nKE51bWJlci5pc0Zpbml0ZShOdW1iZXIoaGVyby5tb2JpbGVMb2dvV2lkdGhWdykpID8gaGVyby5tb2JpbGVMb2dvV2lkdGhWdyA6IDY0KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLWhvbWUtbW9iaWxlLWxvZ28tbWluLXB4JywgYCR7TnVtYmVyLmlzRmluaXRlKE51bWJlcihoZXJvLm1vYmlsZUxvZ29NaW5QeCkpID8gaGVyby5tb2JpbGVMb2dvTWluUHggOiAyMjB9cHhgKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtaG9tZS1tb2JpbGUtbG9nby1tYXgtcHgnLCBgJHtOdW1iZXIuaXNGaW5pdGUoTnVtYmVyKGhlcm8ubW9iaWxlTG9nb01heFB4KSkgPyBoZXJvLm1vYmlsZUxvZ29NYXhQeCA6IDMyMH1weGApO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1zYWZlLXRvcCcsICdlbnYoc2FmZS1hcmVhLWluc2V0LXRvcCwgMHB4KScpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1zYWZlLXJpZ2h0JywgJ2VudihzYWZlLWFyZWEtaW5zZXQtcmlnaHQsIDBweCknKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtc2FmZS1ib3R0b20nLCAnZW52KHNhZmUtYXJlYS1pbnNldC1ib3R0b20sIDBweCknKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtc2FmZS1sZWZ0JywgJ2VudihzYWZlLWFyZWEtaW5zZXQtbGVmdCwgMHB4KScpO1xufVxuXG5mdW5jdGlvbiBhcHBseVNoZWxsU3VyZmFjZVZhcnMoY29uZmlnID0gY3VycmVudFNoZWxsQ29uZmlnLCBpc0RhcmsgPSBpc0RhcmtUaGVtZURvY3VtZW50KCkpIHtcbiAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgY29uc3QgdGhlbWUgPSBjb25maWc/LnRoZW1lIHx8IERFRkFVTFRfU0hFTExfQ09ORklHLnRoZW1lO1xuICBjb25zdCBzdXJmYWNlID0gY29uZmlnPy5zdXJmYWNlIHx8IERFRkFVTFRfU0hFTExfQ09ORklHLnN1cmZhY2U7XG4gIGNvbnN0IHNjZW5lSGlnaGxpZ2h0ID0gTnVtYmVyLmlzRmluaXRlKE51bWJlcihzdXJmYWNlLnNjZW5lSGlnaGxpZ2h0KSlcbiAgICA/IE51bWJlcihzdXJmYWNlLnNjZW5lSGlnaGxpZ2h0KVxuICAgIDogREVGQVVMVF9TSEVMTF9DT05GSUcuc3VyZmFjZS5zY2VuZUhpZ2hsaWdodDtcbiAgY29uc3QgY29udHJhc3RWZWlsT3BhY2l0eUxpZ2h0ID0gbnVtYmVySW5SYW5nZShcbiAgICBzdXJmYWNlLmNvbnRyYXN0VmVpbE9wYWNpdHlMaWdodCxcbiAgICAwLFxuICAgIDAuNixcbiAgICBERUZBVUxUX1NIRUxMX0NPTkZJRy5zdXJmYWNlLmNvbnRyYXN0VmVpbE9wYWNpdHlMaWdodFxuICApO1xuICBjb25zdCBjb250cmFzdFZlaWxPcGFjaXR5RGFyayA9IG51bWJlckluUmFuZ2UoXG4gICAgc3VyZmFjZS5jb250cmFzdFZlaWxPcGFjaXR5RGFyayxcbiAgICAwLFxuICAgIDAuNixcbiAgICBERUZBVUxUX1NIRUxMX0NPTkZJRy5zdXJmYWNlLmNvbnRyYXN0VmVpbE9wYWNpdHlEYXJrXG4gICk7XG4gIGNvbnN0IGNvbnRyYXN0VmVpbFJlYWNoWCA9IG51bWJlckluUmFuZ2UoXG4gICAgc3VyZmFjZS5jb250cmFzdFZlaWxSZWFjaFgsXG4gICAgMCxcbiAgICA1MCxcbiAgICBERUZBVUxUX1NIRUxMX0NPTkZJRy5zdXJmYWNlLmNvbnRyYXN0VmVpbFJlYWNoWFxuICApO1xuICBjb25zdCBjb250cmFzdFZlaWxSZWFjaFkgPSBudW1iZXJJblJhbmdlKFxuICAgIHN1cmZhY2UuY29udHJhc3RWZWlsUmVhY2hZLFxuICAgIDAsXG4gICAgNTAsXG4gICAgREVGQVVMVF9TSEVMTF9DT05GSUcuc3VyZmFjZS5jb250cmFzdFZlaWxSZWFjaFlcbiAgKTtcbiAgY29uc3QgY29udHJhc3RWZWlsQmx1clZtYXggPSBudW1iZXJJblJhbmdlKFxuICAgIHN1cmZhY2UuY29udHJhc3RWZWlsQmx1clZtYXgsXG4gICAgMixcbiAgICAxNixcbiAgICBERUZBVUxUX1NIRUxMX0NPTkZJRy5zdXJmYWNlLmNvbnRyYXN0VmVpbEJsdXJWbWF4XG4gICk7XG4gIGNvbnN0IGNvbnRyYXN0VmVpbERpdGhlck9wYWNpdHkgPSBudW1iZXJJblJhbmdlKFxuICAgIHN1cmZhY2UuY29udHJhc3RWZWlsRGl0aGVyT3BhY2l0eSxcbiAgICAwLFxuICAgIDAuMTIsXG4gICAgREVGQVVMVF9TSEVMTF9DT05GSUcuc3VyZmFjZS5jb250cmFzdFZlaWxEaXRoZXJPcGFjaXR5XG4gICk7XG4gIGNvbnN0IGNvbnRyYXN0VmVpbERpdGhlclNpemUgPSBudW1iZXJJblJhbmdlKFxuICAgIHN1cmZhY2UuY29udHJhc3RWZWlsRGl0aGVyU2l6ZSxcbiAgICAyNCxcbiAgICAyNDAsXG4gICAgREVGQVVMVF9TSEVMTF9DT05GSUcuc3VyZmFjZS5jb250cmFzdFZlaWxEaXRoZXJTaXplXG4gICk7XG4gIGNvbnN0IGNvbnRyb2xNYXRlcmlhbERhcmtlblBlcmNlbnQgPSBudW1iZXJJblJhbmdlKFxuICAgIHN1cmZhY2UuY29udHJvbE1hdGVyaWFsRGFya2VuUGVyY2VudCxcbiAgICAwLFxuICAgIDUsXG4gICAgREVGQVVMVF9TSEVMTF9DT05GSUcuc3VyZmFjZS5jb250cm9sTWF0ZXJpYWxEYXJrZW5QZXJjZW50XG4gICk7XG4gIGNvbnN0IGNvbnRyb2xNYXRlcmlhbEZpbGxPcGFjaXR5ID0gbnVtYmVySW5SYW5nZShcbiAgICBzdXJmYWNlLmNvbnRyb2xNYXRlcmlhbEZpbGxPcGFjaXR5LFxuICAgIDAsXG4gICAgMSxcbiAgICBERUZBVUxUX1NIRUxMX0NPTkZJRy5zdXJmYWNlLmNvbnRyb2xNYXRlcmlhbEZpbGxPcGFjaXR5XG4gICk7XG4gIGNvbnN0IGNvbnRyb2xNYXRlcmlhbE91dGxpbmVPcGFjaXR5ID0gbnVtYmVySW5SYW5nZShcbiAgICBzdXJmYWNlLmNvbnRyb2xNYXRlcmlhbE91dGxpbmVPcGFjaXR5LFxuICAgIDAsXG4gICAgMC4xNSxcbiAgICBERUZBVUxUX1NIRUxMX0NPTkZJRy5zdXJmYWNlLmNvbnRyb2xNYXRlcmlhbE91dGxpbmVPcGFjaXR5XG4gICk7XG4gIGNvbnN0IGNvbnRyb2xNYXRlcmlhbE91dGxpbmVBY3RpdmVPcGFjaXR5ID0gbnVtYmVySW5SYW5nZShcbiAgICBzdXJmYWNlLmNvbnRyb2xNYXRlcmlhbE91dGxpbmVBY3RpdmVPcGFjaXR5LFxuICAgIGNvbnRyb2xNYXRlcmlhbE91dGxpbmVPcGFjaXR5LFxuICAgIDAuMTUsXG4gICAgREVGQVVMVF9TSEVMTF9DT05GSUcuc3VyZmFjZS5jb250cm9sTWF0ZXJpYWxPdXRsaW5lQWN0aXZlT3BhY2l0eVxuICApO1xuICBjb25zdCBjb250cm9sTWF0ZXJpYWxFbXBoYXNpc09wYWNpdHkgPSBudW1iZXJJblJhbmdlKFxuICAgIGlzRGFya1xuICAgICAgPyBzdXJmYWNlLmNvbnRyb2xNYXRlcmlhbEVtcGhhc2lzT3BhY2l0eURhcmtcbiAgICAgIDogc3VyZmFjZS5jb250cm9sTWF0ZXJpYWxFbXBoYXNpc09wYWNpdHlMaWdodCxcbiAgICAwLFxuICAgIDEsXG4gICAgaXNEYXJrXG4gICAgICA/IERFRkFVTFRfU0hFTExfQ09ORklHLnN1cmZhY2UuY29udHJvbE1hdGVyaWFsRW1waGFzaXNPcGFjaXR5RGFya1xuICAgICAgOiBERUZBVUxUX1NIRUxMX0NPTkZJRy5zdXJmYWNlLmNvbnRyb2xNYXRlcmlhbEVtcGhhc2lzT3BhY2l0eUxpZ2h0XG4gICk7XG4gIGNvbnN0IGNvbnRyb2xNYXRlcmlhbFNhdHVyYXRpb24gPSBudW1iZXJJblJhbmdlKFxuICAgIHN1cmZhY2UuY29udHJvbE1hdGVyaWFsU2F0dXJhdGlvbixcbiAgICAxLFxuICAgIDEuNSxcbiAgICBERUZBVUxUX1NIRUxMX0NPTkZJRy5zdXJmYWNlLmNvbnRyb2xNYXRlcmlhbFNhdHVyYXRpb25cbiAgKTtcblxuICBjb25zdCBmaWxsT3BhY2l0eSA9IGlzRGFyayA/IHN1cmZhY2UuZmlsbE9wYWNpdHlEYXJrIDogc3VyZmFjZS5maWxsT3BhY2l0eUxpZ2h0O1xuICBjb25zdCBzaGVlblRvcE9wYWNpdHkgPSBpc0RhcmsgPyBzdXJmYWNlLnNoZWVuVG9wT3BhY2l0eURhcmsgOiBzdXJmYWNlLnNoZWVuVG9wT3BhY2l0eUxpZ2h0O1xuICBjb25zdCBzaGVlbk1pZE9wYWNpdHkgPSBpc0RhcmsgPyBzdXJmYWNlLnNoZWVuTWlkT3BhY2l0eURhcmsgOiBzdXJmYWNlLnNoZWVuTWlkT3BhY2l0eUxpZ2h0O1xuICBjb25zdCBlZGdlT3BhY2l0eSA9IGlzRGFyayA/IHN1cmZhY2UuZWRnZU9wYWNpdHlEYXJrIDogc3VyZmFjZS5lZGdlT3BhY2l0eUxpZ2h0O1xuICBjb25zdCBpbm5lclNoYWRvd09wYWNpdHkgPSBpc0RhcmsgPyBzdXJmYWNlLmlubmVyU2hhZG93T3BhY2l0eURhcmsgOiBzdXJmYWNlLmlubmVyU2hhZG93T3BhY2l0eUxpZ2h0O1xuICBjb25zdCBzaGFkb3dPcGFjaXR5ID0gaXNEYXJrID8gc3VyZmFjZS5zaGFkb3dPcGFjaXR5RGFyayA6IHN1cmZhY2Uuc2hhZG93T3BhY2l0eUxpZ2h0O1xuICBjb25zdCBnbG93T3BhY2l0eSA9IGlzRGFya1xuICAgID8gKHN1cmZhY2UuZ2xvd09wYWNpdHlEYXJrID8/IHN1cmZhY2Uuc2hhZG93T3BhY2l0eURhcmspXG4gICAgOiAoc3VyZmFjZS5nbG93T3BhY2l0eUxpZ2h0ID8/IHN1cmZhY2Uuc2hhZG93T3BhY2l0eUxpZ2h0KTtcbiAgY29uc3QgdG9wRWRnZU9wYWNpdHkgPSBpc0RhcmsgPyBzdXJmYWNlLmxpZ2h0RWRnZVRvcE9wYWNpdHlEYXJrIDogc3VyZmFjZS5saWdodEVkZ2VUb3BPcGFjaXR5TGlnaHQ7XG4gIGNvbnN0IGJvdHRvbUVkZ2VPcGFjaXR5ID0gaXNEYXJrID8gc3VyZmFjZS5saWdodEVkZ2VCb3R0b21PcGFjaXR5RGFyayA6IHN1cmZhY2UubGlnaHRFZGdlQm90dG9tT3BhY2l0eUxpZ2h0O1xuICBjb25zdCBlZGdlV2lkdGggPSBzdXJmYWNlLmVkZ2VXaWR0aCB8fCBzdXJmYWNlLmxpZ2h0RWRnZUluc2V0IHx8IERFRkFVTFRfU0hFTExfQ09ORklHLnN1cmZhY2UuZWRnZVdpZHRoO1xuXG4gIC8qIFF1b3RlIGJ1dHRvbiBjb2xvciAocGVyLW1vZGUpOyBmYWxsYmFjayB0byBpbm5lciB3YWxsIGlmIG5vdCBzZXQgKi9cbiAgY29uc3QgcXVvdGVCdG5MaWdodCA9IHRoZW1lLnF1b3RlQnV0dG9uQ29sb3JMaWdodCA/PyB0aGVtZS53YWxsQmFzZUxpZ2h0ID8/IERFRkFVTFRfU0hFTExfQ09ORklHLnRoZW1lLndhbGxCYXNlTGlnaHQ7XG4gIGNvbnN0IHF1b3RlQnRuRGFyayA9IHRoZW1lLnF1b3RlQnV0dG9uQ29sb3JEYXJrID8/IHRoZW1lLndhbGxCYXNlRGFyayA/PyBERUZBVUxUX1NIRUxMX0NPTkZJRy50aGVtZS53YWxsQmFzZURhcms7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tcXVvdGUtYnV0dG9uLWNvbG9yLWxpZ2h0JywgcXVvdGVCdG5MaWdodCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tcXVvdGUtYnV0dG9uLWNvbG9yLWRhcmsnLCBxdW90ZUJ0bkRhcmspO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLXF1b3RlLWJ1dHRvbi1jb2xvcicsIGlzRGFyayA/IHF1b3RlQnRuRGFyayA6IHF1b3RlQnRuTGlnaHQpO1xuICB0cnkge1xuICAgIGNvbnN0IGcgPSBnZXRHbG9iYWxzKCk7XG4gICAgaWYgKGcpIHtcbiAgICAgIGcucXVvdGVCdXR0b25Db2xvckxpZ2h0ID0gcXVvdGVCdG5MaWdodDtcbiAgICAgIGcucXVvdGVCdXR0b25Db2xvckRhcmsgPSBxdW90ZUJ0bkRhcms7XG4gICAgfVxuICB9IGNhdGNoIChlKSB7fVxuXG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tZnJhbWUtY29sb3Itc2l0ZS1saWdodCcsIHRoZW1lLnNpdGVGcmFtZUxpZ2h0IHx8IGdldERlZmF1bHRGcmFtZUNvbG9yKCkpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWZyYW1lLWNvbG9yLXNpdGUtZGFyaycsIHRoZW1lLnNpdGVGcmFtZURhcmsgfHwgdGhlbWUuc2l0ZUZyYW1lTGlnaHQgfHwgZ2V0RGVmYXVsdEZyYW1lQ29sb3IoKSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tZnJhbWUtYm9yZGVyLWdyYWRpZW50LWVkZ2Utb3BhY2l0eScsIFN0cmluZyh0aGVtZS5mcmFtZUJvcmRlckVkZ2VPcGFjaXR5KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tZnJhbWUtYm9yZGVyLWdyYWRpZW50LW1pZC1vcGFjaXR5JywgU3RyaW5nKHRoZW1lLmZyYW1lQm9yZGVyTWlkT3BhY2l0eSkpO1xuXG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXN1cmZhY2UtcmFkaXVzJywgc3VyZmFjZS5yYWRpdXMpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1zdXJmYWNlLWJsdXInLCBzdXJmYWNlLmJsdXIpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1zdXJmYWNlLXNhdHVyYXRpb24nLCBTdHJpbmcoc3VyZmFjZS5zYXR1cmF0aW9uKSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXN1cmZhY2UtZWRnZS13aWR0aCcsIGVkZ2VXaWR0aCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXN1cmZhY2UtZmlsbC1vcGFjaXR5JywgU3RyaW5nKGZpbGxPcGFjaXR5KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXN1cmZhY2Utc2hlZW4tdG9wLW9wYWNpdHknLCBTdHJpbmcoc2hlZW5Ub3BPcGFjaXR5KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXN1cmZhY2Utc2hlZW4tbWlkLW9wYWNpdHknLCBTdHJpbmcoc2hlZW5NaWRPcGFjaXR5KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXN1cmZhY2UtZWRnZS1vcGFjaXR5JywgU3RyaW5nKGVkZ2VPcGFjaXR5KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXN1cmZhY2UtaW5uZXItc2hhZG93LW9wYWNpdHknLCBTdHJpbmcoaW5uZXJTaGFkb3dPcGFjaXR5KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXN1cmZhY2Utc2hhZG93LW9wYWNpdHknLCBTdHJpbmcoc2hhZG93T3BhY2l0eSkpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1zdXJmYWNlLWdsb3ctb3BhY2l0eScsIFN0cmluZyhnbG93T3BhY2l0eSkpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1zdXJmYWNlLXNoYWRvdy1ibHVyJywgc3VyZmFjZS5zaGFkb3dCbHVyKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtc3VyZmFjZS1zaGFkb3ctb2Zmc2V0LXknLCBzdXJmYWNlLnNoYWRvd09mZnNldFkpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1zdXJmYWNlLWxpZ2h0LWVkZ2UtaW5zZXQnLCBzdXJmYWNlLmxpZ2h0RWRnZUluc2V0KTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtc3VyZmFjZS1saWdodC1lZGdlLWJsdXInLCBzdXJmYWNlLmxpZ2h0RWRnZUJsdXIpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWFicy1zdXJmYWNlLWxpZ2h0LWVkZ2UtdG9wLW9wYWNpdHknLCBTdHJpbmcodG9wRWRnZU9wYWNpdHkpKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtc3VyZmFjZS1saWdodC1lZGdlLWJvdHRvbS1vcGFjaXR5JywgU3RyaW5nKGJvdHRvbUVkZ2VPcGFjaXR5KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXNvZnQtY29udHJvbC1kYXJrZW4nLCBgJHtjb250cm9sTWF0ZXJpYWxEYXJrZW5QZXJjZW50fSVgKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtc29mdC1jb250cm9sLWZpbGwtb3BhY2l0eScsIGAke2NvbnRyb2xNYXRlcmlhbEZpbGxPcGFjaXR5ICogMTAwfSVgKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtc29mdC1jb250cm9sLW91dGxpbmUtb3BhY2l0eScsIGAke2NvbnRyb2xNYXRlcmlhbE91dGxpbmVPcGFjaXR5ICogMTAwfSVgKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtc29mdC1jb250cm9sLW91dGxpbmUtYWN0aXZlLW9wYWNpdHknLCBgJHtjb250cm9sTWF0ZXJpYWxPdXRsaW5lQWN0aXZlT3BhY2l0eSAqIDEwMH0lYCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXNvZnQtY29udHJvbC1lbXBoYXNpcy1vcGFjaXR5JywgYCR7Y29udHJvbE1hdGVyaWFsRW1waGFzaXNPcGFjaXR5ICogMTAwfSVgKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eShcbiAgICAnLS1hYnMtc29mdC1jb250cm9sLWVkZ2Utd2lkdGgnLFxuICAgIHN1cmZhY2UuY29udHJvbE1hdGVyaWFsRWRnZVdpZHRoIHx8IERFRkFVTFRfU0hFTExfQ09ORklHLnN1cmZhY2UuY29udHJvbE1hdGVyaWFsRWRnZVdpZHRoXG4gICk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoXG4gICAgJy0tYWJzLXNvZnQtY29udHJvbC1ibHVyJyxcbiAgICBzdXJmYWNlLmNvbnRyb2xNYXRlcmlhbEJsdXIgfHwgREVGQVVMVF9TSEVMTF9DT05GSUcuc3VyZmFjZS5jb250cm9sTWF0ZXJpYWxCbHVyXG4gICk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tYWJzLXNvZnQtY29udHJvbC1zYXR1cmF0aW9uJywgU3RyaW5nKGNvbnRyb2xNYXRlcmlhbFNhdHVyYXRpb24pKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eShcbiAgICAnLS1hYnMtaW5kaWNhdG9yLWxpbmUtdGhpY2tuZXNzJyxcbiAgICBzdXJmYWNlLmluZGljYXRvckxpbmVUaGlja25lc3MgfHwgREVGQVVMVF9TSEVMTF9DT05GSUcuc3VyZmFjZS5pbmRpY2F0b3JMaW5lVGhpY2tuZXNzXG4gICk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0taG92ZXItZWRnZS13aWR0aCcsIGVkZ2VXaWR0aCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0taG92ZXItZWRnZS10b3Atb3BhY2l0eScsIFN0cmluZyh0b3BFZGdlT3BhY2l0eSkpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWhvdmVyLWVkZ2UtYm90dG9tLW9wYWNpdHknLCBTdHJpbmcoTWF0aC5tYXgoYm90dG9tRWRnZU9wYWNpdHksIGVkZ2VPcGFjaXR5ICogMC4yOCkpKTtcblxuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLXF1b3RlLWdsYXNzLWJsdXInLCBzdXJmYWNlLmJsdXIpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLXF1b3RlLWdsYXNzLXNhdHVyYXRpb24nLCBTdHJpbmcoc3VyZmFjZS5zYXR1cmF0aW9uKSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tcXVvdGUtZ2xhc3MtZmlsbC1vcGFjaXR5JywgU3RyaW5nKGZpbGxPcGFjaXR5KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tcXVvdGUtZ2xhc3Mtc2hlZW4tdG9wLW9wYWNpdHknLCBTdHJpbmcoc2hlZW5Ub3BPcGFjaXR5KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tcXVvdGUtZ2xhc3Mtc2hlZW4tbWlkLW9wYWNpdHknLCBTdHJpbmcoc2hlZW5NaWRPcGFjaXR5KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tcXVvdGUtZ2xhc3MtZWRnZS1vcGFjaXR5JywgU3RyaW5nKGVkZ2VPcGFjaXR5KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tcXVvdGUtZ2xhc3MtaW5uZXItc2hhZG93LW9wYWNpdHknLCBTdHJpbmcoaW5uZXJTaGFkb3dPcGFjaXR5KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tcXVvdGUtZ2xhc3Mtc2hhZG93LW9wYWNpdHknLCBTdHJpbmcoZ2xvd09wYWNpdHkpKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1xdW90ZS1nbGFzcy1zaGFkb3ctYmx1cicsIHN1cmZhY2Uuc2hhZG93Qmx1cik7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tcXVvdGUtZ2xhc3Mtc2hhZG93LW9mZnNldC15Jywgc3VyZmFjZS5zaGFkb3dPZmZzZXRZKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1xdW90ZS1nbGFzcy1ib3R0b20tZWRnZS1vcGFjaXR5JywgU3RyaW5nKE1hdGgubWF4KGJvdHRvbUVkZ2VPcGFjaXR5LCBlZGdlT3BhY2l0eSAqIDAuMjgpKSk7XG5cbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1hYnMtc2NlbmUtaGlnaGxpZ2h0JywgU3RyaW5nKHNjZW5lSGlnaGxpZ2h0KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tc2ltdWxhdGlvbi1jb250cmFzdC12ZWlsLW9wYWNpdHknLCBTdHJpbmcoaXNEYXJrID8gY29udHJhc3RWZWlsT3BhY2l0eURhcmsgOiBjb250cmFzdFZlaWxPcGFjaXR5TGlnaHQpKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1zaW11bGF0aW9uLWNvbnRyYXN0LXZlaWwtcmVhY2gteCcsIGAke2NvbnRyYXN0VmVpbFJlYWNoWH12d2ApO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLXNpbXVsYXRpb24tY29udHJhc3QtdmVpbC1yZWFjaC15JywgYCR7Y29udHJhc3RWZWlsUmVhY2hZfXZoYCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tc2ltdWxhdGlvbi1jb250cmFzdC12ZWlsLWJsdXItdm1heCcsIFN0cmluZyhjb250cmFzdFZlaWxCbHVyVm1heCkpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLXNpbXVsYXRpb24tY29udHJhc3QtdmVpbC1ibHVyJywgYGNsYW1wKDQycHgsICR7Y29udHJhc3RWZWlsQmx1clZtYXh9dm1heCwgMTIwcHgpYCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tc2ltdWxhdGlvbi1jb250cmFzdC12ZWlsLWRpdGhlci1vcGFjaXR5JywgU3RyaW5nKGNvbnRyYXN0VmVpbERpdGhlck9wYWNpdHkpKTtcbiAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1zaW11bGF0aW9uLWNvbnRyYXN0LXZlaWwtZGl0aGVyLXNpemUnLCBgJHtjb250cmFzdFZlaWxEaXRoZXJTaXplfXB4YCk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0taW5uZXItd2FsbC10b3AtbGlnaHQtb3BhY2l0eScsIFN0cmluZyhpc0RhcmtcbiAgICA/IE1hdGgubWluKDAuODIsIE51bWJlcigoc2NlbmVIaWdobGlnaHQgKiAxLjMzKS50b0ZpeGVkKDMpKSlcbiAgICA6IHNjZW5lSGlnaGxpZ2h0KSk7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0taW5uZXItd2FsbC10b3AtbGlnaHQtb3BhY2l0eS1kYXJrJywgU3RyaW5nKE1hdGgubWluKDAuODIsIE51bWJlcigoc2NlbmVIaWdobGlnaHQgKiAxLjMzKS50b0ZpeGVkKDMpKSkpKTtcblxuICB0cnkge1xuICAgIGNvbnN0IGdsb2JhbHMgPSBnZXRHbG9iYWxzKCk7XG4gICAgZ2xvYmFscy5zaW11bGF0aW9uQ29udHJhc3RWZWlsT3BhY2l0eUxpZ2h0ID0gY29udHJhc3RWZWlsT3BhY2l0eUxpZ2h0O1xuICAgIGdsb2JhbHMuc2ltdWxhdGlvbkNvbnRyYXN0VmVpbE9wYWNpdHlEYXJrID0gY29udHJhc3RWZWlsT3BhY2l0eURhcms7XG4gICAgZ2xvYmFscy5zaW11bGF0aW9uQ29udHJhc3RWZWlsUmVhY2hYID0gY29udHJhc3RWZWlsUmVhY2hYO1xuICAgIGdsb2JhbHMuc2ltdWxhdGlvbkNvbnRyYXN0VmVpbFJlYWNoWSA9IGNvbnRyYXN0VmVpbFJlYWNoWTtcbiAgICBnbG9iYWxzLnNpbXVsYXRpb25Db250cmFzdFZlaWxCbHVyVm1heCA9IGNvbnRyYXN0VmVpbEJsdXJWbWF4O1xuICAgIGdsb2JhbHMuc2ltdWxhdGlvbkNvbnRyYXN0VmVpbERpdGhlck9wYWNpdHkgPSBjb250cmFzdFZlaWxEaXRoZXJPcGFjaXR5O1xuICAgIGdsb2JhbHMuc2ltdWxhdGlvbkNvbnRyYXN0VmVpbERpdGhlclNpemUgPSBjb250cmFzdFZlaWxEaXRoZXJTaXplO1xuICB9IGNhdGNoIChlKSB7fVxufVxuXG5leHBvcnQgZnVuY3Rpb24gc3luY1RoZW1lQ29sb3JNZXRhKCkge1xuICBjb25zdCB7IGxpZ2h0LCBkYXJrLCBhY3RpdmUgfSA9IGFwcGx5RnJhbWVQYWxldHRlUmVhZGJhY2soKTtcbiAgY29uc3QgZW50cmllcyA9IFtcbiAgICB7IG1lZGlhOiAnKHByZWZlcnMtY29sb3Itc2NoZW1lOiBsaWdodCknLCBjb2xvcjogbGlnaHQgfHwgYWN0aXZlIH0sXG4gICAgeyBtZWRpYTogJyhwcmVmZXJzLWNvbG9yLXNjaGVtZTogZGFyayknLCBjb2xvcjogZGFyayB8fCBhY3RpdmUgfVxuICBdO1xuXG4gIGVudHJpZXMuZm9yRWFjaCgoeyBtZWRpYSwgY29sb3IgfSkgPT4ge1xuICAgIGxldCB0YWcgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKGBtZXRhW25hbWU9XCJ0aGVtZS1jb2xvclwiXVttZWRpYT1cIiR7bWVkaWF9XCJdYCk7XG4gICAgaWYgKCF0YWcpIHtcbiAgICAgIHRhZyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ21ldGEnKTtcbiAgICAgIHRhZy5uYW1lID0gJ3RoZW1lLWNvbG9yJztcbiAgICAgIHRhZy5tZWRpYSA9IG1lZGlhO1xuICAgICAgZG9jdW1lbnQuaGVhZC5hcHBlbmRDaGlsZCh0YWcpO1xuICAgIH1cbiAgICB0YWcuY29udGVudCA9IGNvbG9yO1xuICB9KTtcblxuICBsZXQgZmFsbGJhY2sgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdtZXRhW25hbWU9XCJ0aGVtZS1jb2xvclwiXTpub3QoW21lZGlhXSknKTtcbiAgaWYgKCFmYWxsYmFjaykge1xuICAgIGZhbGxiYWNrID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnbWV0YScpO1xuICAgIGZhbGxiYWNrLm5hbWUgPSAndGhlbWUtY29sb3InO1xuICAgIGRvY3VtZW50LmhlYWQuYXBwZW5kQ2hpbGQoZmFsbGJhY2spO1xuICB9XG4gIGZhbGxiYWNrLmNvbnRlbnQgPSBhY3RpdmUgfHwgZGFyayB8fCBsaWdodDtcbn1cblxuZnVuY3Rpb24gYXBwbHlGcmFtZVBhbGV0dGVSZWFkYmFjayhpc0RhcmsgPSBpc0RhcmtUaGVtZURvY3VtZW50KCkpIHtcbiAgY29uc3QgbGlnaHQgPSByZWFkQ3NzVmFyKCctLWZyYW1lLWNvbG9yLWxpZ2h0JykgfHwgZ2V0RGVmYXVsdEZyYW1lQ29sb3IoKTtcbiAgY29uc3QgZGFyayA9IHJlYWRDc3NWYXIoJy0tZnJhbWUtY29sb3ItZGFyaycpIHx8IGxpZ2h0IHx8IGdldERlZmF1bHRGcmFtZUNvbG9yKCk7XG4gIGNvbnN0IGFjdGl2ZSA9IHJlYWRDc3NWYXIoJy0tZnJhbWUtY29sb3InKSB8fCAoaXNEYXJrID8gZGFyayA6IGxpZ2h0KTtcblxuICByZXR1cm4geyBsaWdodCwgZGFyaywgYWN0aXZlIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBzeW5jU2hlbGxUb0RvY3VtZW50KG9wdGlvbnMgPSB7fSkge1xuICBjb25zdCBjb25maWcgPSBvcHRpb25zLmNvbmZpZyB8fCBjdXJyZW50U2hlbGxDb25maWc7XG4gIGNvbnN0IGlzRGFyayA9IG9wdGlvbnMuaXNEYXJrID8/IGlzRGFya1RoZW1lRG9jdW1lbnQoKTtcbiAgY29uc3QgaW5uZXJQYWxldHRlID0gcmVzb2x2ZVNoZWxsUGFsZXR0ZShjb25maWcsIGlzRGFyayk7XG5cbiAgYXBwbHlTaGVsbExheW91dFZhcnMoY29uZmlnKTtcbiAgYXBwbHlTaGVsbFBhbGV0dGUoaW5uZXJQYWxldHRlKTtcbiAgYXBwbHlXaW5kb3dQYWxldHRlKHJlc29sdmVXaW5kb3dQYWxldHRlKGlzRGFyaykpO1xuICBhcHBseVNoZWxsU3VyZmFjZVZhcnMoY29uZmlnLCBpc0RhcmspO1xuICBjb25zdCBzaXRlRnJhbWVQYWxldHRlID0gcmVzb2x2ZVNpdGVGcmFtZVBhbGV0dGUoaXNEYXJrKTtcbiAgYXBwbHlTaXRlRnJhbWVQYWxldHRlKHNpdGVGcmFtZVBhbGV0dGUpO1xuXG4gIHJldHVybiBpbm5lclBhbGV0dGU7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRNb2RhbENocm9tZUNvbmZpZyhjb25maWcgPSBjdXJyZW50U2hlbGxDb25maWcpIHtcbiAgY29uc3QgbW90aW9uID0gY29uZmlnPy5tb3Rpb24gfHwgREVGQVVMVF9TSEVMTF9DT05GSUcubW90aW9uO1xuICByZXR1cm4ge1xuICAgIG1vZGFsT3ZlcmxheU9wYWNpdHk6IG1vdGlvbi5tb2RhbE92ZXJsYXlPcGFjaXR5LFxuICAgIG1vZGFsT3ZlcmxheUJsdXJQeDogbW90aW9uLm1vZGFsT3ZlcmxheUJsdXJQeCxcbiAgICBtb2RhbE92ZXJsYXlNb2JpbGVCbHVyUHg6IG1vdGlvbi5tb2RhbE92ZXJsYXlNb2JpbGVCbHVyUHgsXG4gICAgbW9kYWxPdmVybGF5VHJhbnNpdGlvbk1zOiBtb3Rpb24ubW9kYWxPdmVybGF5VHJhbnNpdGlvbk1zLFxuICAgIG1vZGFsT3ZlcmxheVRyYW5zaXRpb25PdXRNczogbW90aW9uLm1vZGFsT3ZlcmxheVRyYW5zaXRpb25PdXRNcyxcbiAgICBtb2RhbE92ZXJsYXlDb250ZW50RGVsYXlNczogbW90aW9uLm1vZGFsT3ZlcmxheUNvbnRlbnREZWxheU1zLFxuICAgIG1vZGFsRGVwdGhTY2FsZTogbW90aW9uLm1vZGFsRGVwdGhTY2FsZSxcbiAgICBtb2RhbERlcHRoVHJhbnNsYXRlWTogbW90aW9uLm1vZGFsRGVwdGhUcmFuc2xhdGVZLFxuICB9O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0U2ltdWxhdGlvbldhcm11cE1zKGNvbmZpZyA9IGN1cnJlbnRTaGVsbENvbmZpZykge1xuICBjb25zdCBmcmFtZXMgPSBOdW1iZXIoY29uZmlnPy5tb3Rpb24/LnNpbXVsYXRpb25XYXJtdXBGcmFtZXMpIHx8IDA7XG4gIHJldHVybiBNYXRoLm1heCgwLCBNYXRoLnJvdW5kKChmcmFtZXMgLyA2MCkgKiAxMDAwKSk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFDO0FBQ1AsQ0FBQyxDQUFDLGlCQUFpQjtBQUNuQixDQUFDLENBQUMsc0JBQXNCO0FBQ3hCLENBQUMsQ0FBQyxxQkFBcUI7QUFDdkIsQ0FBQyxDQUFDLDhCQUE4QjtBQUNoQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7QUFDbkQsTUFBTSxDQUFDO0FBQ1AsQ0FBQyxDQUFDLGtCQUFrQjtBQUNwQixDQUFDLENBQUMscUJBQXFCO0FBQ3ZCLENBQUMsQ0FBQyxVQUFVO0FBQ1osQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7QUFDMUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO0FBQzdELE1BQU0sQ0FBQztBQUNQLENBQUMsQ0FBQyw2QkFBNkI7QUFDL0IsQ0FBQyxDQUFDLDJCQUEyQjtBQUM3QixDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUM7QUFDbkQsTUFBTSxDQUFDO0FBQ1AsQ0FBQyxDQUFDLDRCQUE0QjtBQUM5QixDQUFDLENBQUMsMEJBQTBCO0FBQzVCLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsT0FBTyxD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LENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDOUQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTTtBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUMxQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7QUFDMUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztBQUN2RCxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUU7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRTtBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFB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LENBQUMsTUFBTSxDQUFDOztBQUV2RSxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0RCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLGFBQWE7QUFDL0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxZQUFZO0FBQzlDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSzs7QUFFdEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSTtBQUNSLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUNWLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQztBQUNIOztBQUVBLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxD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S0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBQzdELENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7QUFDOUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUztBQUNwRCxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsVUFBVSxDQUFDOztBQUVuRCxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztBQUM1RCxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUMxRCxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUN4RCxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO0FBQ3JELENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQ3pELENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQ3ZELENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7QUFDcEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDeEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDdEQsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztBQUNuRCxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDO0FBQ3BFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO0FBQ3hFOztBQUVBLFFBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFROztBQUU3QixDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUN2RCxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNoRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pGLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hHLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVE7QUFDakI7O0FBRUEsUUFBUSxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDO0FBQy9ELENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNsQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTzs7QUFFbEUsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBQ3JFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEY7O0FBRUEsUUFBUSxDQUFDLGFBQWEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUNsRCxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQztBQUMvQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVE7QUFDaEQsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUM7O0FBRUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZTtBQUN2QyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CLENBQUMsS0FBSyxDQUFDLFlBQVk7QUFDdkYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVO0FBQ3ZDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVTs7QUFFckMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQzVELENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUMxRCxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztBQUN2RCxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztBQUN2RDs7QUFFQSxNQUFNLENBQUMsUUFBUSxDQUFDLG9CQUFvQixDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDekUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUN0RSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDdkQ7O0FBRUEsTUFBTSxDQUFDLFFBQVEsQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVELENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZTtBQUN2QyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ2hELENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDOUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTOztBQUV4QyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDL0QsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsRUFBRSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDO0FBQzdELENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO0FBQzFE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QUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxxQkFBcUIsQ0FBQztBQUMzRixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDN0ksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN2SSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsaUJBQWlCLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQ2xKLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM1SSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDNUksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzNFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUMvRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDakYsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzdFOztBQUVBLFFBQVEsQ0FBQyxxQkFBcUIsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGtCQUFrQixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1RixDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWU7QUFDdkMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLO0FBQzNELENBQUMsQ0FBQyxL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SSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUM7QUFDbkUsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDO0FBQ3ZGLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLGFBQWE7QUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLENBQUMsQ0FBQyxZQUFZO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWYsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7QUFDcEcsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLElBQUks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SyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUMzRSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDO0FBQ3pFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO0FBQ2hGLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsY0FBYyxDQUFDO0FBQ2xGLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO0FBQ2hGLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDO0FBQ3hGLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEtB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QUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3BGLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDcEYsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQzNFLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsa0JBQWtCLENBQUMsQ0FBQztBQUMxRixDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDN0UsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFVBQVUsQ0FBQztBQUN6RSxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FB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