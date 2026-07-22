import {
  deriveShellConfig,
  loadDesignSystemConfig,
  loadLegacyShellConfig,
  shouldUseCanonicalDesignConfig,
} from '../utils/design-config.js';
import {
  applyLayoutCSSVars,
  applyLayoutFromVwToPx,
  getGlobals,
} from '../core/state.js';
import { isDarkThemeDocument } from '../../../lib/theme-state.js';
import {
  buildResponsiveFrameRadiusCss,
  resolveFrameRadiusEndpoints,
} from './frame-radius.js';
import {
  buildResponsiveFrameInsetCss,
  resolveFrameInsetEndpoints,
} from './frame-inset.js';

const DEFAULT_SHELL_CONFIG = {
  theme: {
    wallBase: '#141414',
    quoteButtonColorLight: '#efefef',
    quoteButtonColorDark: '#141414',
    siteFrame: '#000000',
    chromeHarmonyMode: 'auto',
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
    modalDepthTranslateY: 1,
    routeTransition: {
      exitDurationMs: 130,
      loaderEnterDurationMs: 70,
      loaderFirstMinimumMs: 160,
      loaderRepeatMinimumMs: 110,
      readinessTimeoutMs: 4500,
      spinnerExitDurationMs: 160,
      plateExitDelayMs: 40,
      plateExitDurationMs: 160,
      surfaceEnterDurationMs: 220,
      routeBookendDurationMs: 220,
      routeBookendStepMs: 8,
      routeBookendBlurPx: 4,
      routeBookendDriftEm: -0.05,
      contextDurationMs: 240,
      actionDurationMs: 220,
      supportDurationMs: 240,
      itemStepMs: 22,
      repeatTimingScale: 0.78,
      repeatStaggerScale: 0.65
    }
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
  const baseMotion = base.motion || {};
  const overrideMotion = override?.motion || {};
  return {
    theme: { ...base.theme, ...(override?.theme || {}) },
    layout: { ...base.layout, ...(override?.layout || {}) },
    surface: { ...base.surface, ...(override?.surface || {}) },
    motion: {
      ...baseMotion,
      ...overrideMotion,
      routeTransition: {
        ...(baseMotion.routeTransition || {}),
        ...(overrideMotion.routeTransition || {})
      }
    },
    hero: { ...base.hero, ...(override?.hero || {}) }
  };
}

export function getShellConfig() {
  return currentShellConfig;
}

function roundedNumberInRange(value, min, max, fallback) {
  return Math.round(numberInRange(value, min, max, fallback));
}

export function getShellRouteTransitionConfig(config = currentShellConfig) {
  const defaults = DEFAULT_SHELL_CONFIG.motion.routeTransition;
  const source = config?.motion?.routeTransition || {};

  return {
    exitDurationMs: roundedNumberInRange(source.exitDurationMs, 0, 2000, defaults.exitDurationMs),
    loaderEnterDurationMs: roundedNumberInRange(source.loaderEnterDurationMs, 0, 2000, defaults.loaderEnterDurationMs),
    loaderFirstMinimumMs: roundedNumberInRange(source.loaderFirstMinimumMs, 0, 5000, defaults.loaderFirstMinimumMs),
    loaderRepeatMinimumMs: roundedNumberInRange(source.loaderRepeatMinimumMs, 0, 5000, defaults.loaderRepeatMinimumMs),
    readinessTimeoutMs: roundedNumberInRange(source.readinessTimeoutMs, 250, 30000, defaults.readinessTimeoutMs),
    spinnerExitDurationMs: roundedNumberInRange(source.spinnerExitDurationMs, 0, 2000, defaults.spinnerExitDurationMs),
    plateExitDelayMs: roundedNumberInRange(source.plateExitDelayMs, 0, 2000, defaults.plateExitDelayMs),
    plateExitDurationMs: roundedNumberInRange(source.plateExitDurationMs, 0, 2000, defaults.plateExitDurationMs),
    surfaceEnterDurationMs: roundedNumberInRange(source.surfaceEnterDurationMs, 0, 3000, defaults.surfaceEnterDurationMs),
    routeBookendDurationMs: roundedNumberInRange(source.routeBookendDurationMs, 0, 3000, defaults.routeBookendDurationMs),
    routeBookendStepMs: roundedNumberInRange(source.routeBookendStepMs, 0, 500, defaults.routeBookendStepMs),
    routeBookendBlurPx: numberInRange(source.routeBookendBlurPx, 0, 40, defaults.routeBookendBlurPx),
    routeBookendDriftEm: numberInRange(source.routeBookendDriftEm, -1, 1, defaults.routeBookendDriftEm),
    contextDurationMs: roundedNumberInRange(source.contextDurationMs, 0, 3000, defaults.contextDurationMs),
    actionDurationMs: roundedNumberInRange(source.actionDurationMs, 0, 3000, defaults.actionDurationMs),
    supportDurationMs: roundedNumberInRange(source.supportDurationMs, 0, 3000, defaults.supportDurationMs),
    itemStepMs: roundedNumberInRange(source.itemStepMs, 0, 500, defaults.itemStepMs),
    repeatTimingScale: numberInRange(source.repeatTimingScale, 0.1, 2, defaults.repeatTimingScale),
    repeatStaggerScale: numberInRange(source.repeatStaggerScale, 0.1, 2, defaults.repeatStaggerScale)
  };
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
  const isIOS = /iPhone|iPad|iPod/.test(ua)
    || (/Mac/.test(ua) && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/.test(ua);
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

  return { isFirefox, isSafari, isChromium, isSamsungInternet, isIOS, isAndroid };
}

export function detectThemeColorLikelyApplied(family = detectBrowserFamily()) {
  const isStandalone = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches)
    || (window.matchMedia && window.matchMedia('(display-mode: minimal-ui)').matches)
    || (navigator.standalone === true);

  if (isStandalone) return true;
  if (family.isIOS) return true;
  if (family.isFirefox) return false;
  if (family.isSafari) return true;
  if (family.isChromium) return family.isAndroid || family.isSamsungInternet;
  return family.isAndroid || family.isIOS;
}

export function resolveShellPalette(config = currentShellConfig) {
  const family = detectBrowserFamily();
  const themeColorLikelyApplied = detectThemeColorLikelyApplied(family);
  const active = config?.theme?.wallBase || DEFAULT_SHELL_CONFIG.theme.wallBase;

  return {
    light: active,
    dark: active,
    active,
    family,
    themeColorLikelyApplied,
    usesLockedPalette: true
  };
}

function getDefaultFrameColor() {
  return DEFAULT_SHELL_CONFIG.theme.siteFrame;
}

function readCssVar(name) {
  const root = document.documentElement;
  const styles = getComputedStyle(root);
  return styles.getPropertyValue(name).trim();
}

export function resolveSiteFramePalette() {
  const active = readCssVar('--frame-color-site')
    || readCssVar('--frame-color-site-dark')
    || readCssVar('--frame-color-site-light')
    || getDefaultFrameColor();

  return { light: active, dark: active, active };
}

export function applySiteFramePalette({ active, light, dark }) {
  const root = document.documentElement;
  const nextActive = active || dark || light || getDefaultFrameColor();

  root.style.setProperty('--frame-color-site', nextActive);
  root.style.setProperty('--frame-color-site-light', nextActive);
  root.style.setProperty('--frame-color-site-dark', nextActive);
}

export function applyFrameChromePalette({ active, light, dark }) {
  const root = document.documentElement;
  const nextActive = active || dark || light || getDefaultFrameColor();
  const outerInk = resolveOuterShellInk(nextActive);

  root.style.setProperty('--abs-browser-chrome', nextActive);
  root.style.setProperty('--frame-color-light', nextActive);
  root.style.setProperty('--frame-color-dark', nextActive);
  root.style.setProperty('--frame-color', nextActive);
  root.style.setProperty('--wall-color-light', nextActive);
  root.style.setProperty('--wall-color-dark', nextActive);
  root.style.setProperty('--wall-color', nextActive);
  root.style.setProperty('--chrome-bg-light', nextActive);
  root.style.setProperty('--chrome-bg-dark', nextActive);
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
    : false;

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
  const nextActive = active || dark || light || DEFAULT_SHELL_CONFIG.theme.wallBase;

  root.style.setProperty('--abs-wall-base-light', nextActive);
  root.style.setProperty('--abs-wall-base-dark', nextActive);
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
  const routeTransition = getShellRouteTransitionConfig(config);
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
  root.style.setProperty('--abs-route-exit-duration', `${routeTransition.exitDurationMs}ms`);
  root.style.setProperty('--abs-route-loader-enter-duration', `${routeTransition.loaderEnterDurationMs}ms`);
  root.style.setProperty('--abs-route-loader-first-minimum', `${routeTransition.loaderFirstMinimumMs}ms`);
  root.style.setProperty('--abs-route-loader-repeat-minimum', `${routeTransition.loaderRepeatMinimumMs}ms`);
  root.style.setProperty('--abs-route-readiness-timeout', `${routeTransition.readinessTimeoutMs}ms`);
  root.style.setProperty('--abs-route-spinner-exit-duration', `${routeTransition.spinnerExitDurationMs}ms`);
  root.style.setProperty('--abs-route-plate-exit-delay', `${routeTransition.plateExitDelayMs}ms`);
  root.style.setProperty('--abs-route-plate-exit-duration', `${routeTransition.plateExitDurationMs}ms`);
  root.style.setProperty('--abs-route-surface-enter-duration', `${routeTransition.surfaceEnterDurationMs}ms`);
  root.style.setProperty('--abs-route-bookend-duration', `${routeTransition.routeBookendDurationMs}ms`);
  root.style.setProperty('--abs-route-bookend-step', `${routeTransition.routeBookendStepMs}ms`);
  root.style.setProperty('--abs-route-bookend-blur', `${routeTransition.routeBookendBlurPx}px`);
  root.style.setProperty('--abs-route-bookend-drift', `${routeTransition.routeBookendDriftEm}em`);
  root.style.setProperty('--abs-route-context-duration', `${routeTransition.contextDurationMs}ms`);
  root.style.setProperty('--abs-route-action-duration', `${routeTransition.actionDurationMs}ms`);
  root.style.setProperty('--abs-route-support-duration', `${routeTransition.supportDurationMs}ms`);
  root.style.setProperty('--abs-route-item-step', `${routeTransition.itemStepMs}ms`);
  root.style.setProperty('--abs-route-repeat-timing-scale', String(routeTransition.repeatTimingScale));
  root.style.setProperty('--abs-route-repeat-stagger-scale', String(routeTransition.repeatStaggerScale));
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

  /* Quote button color (per-mode); fallback to the stable outer wall if unset. */
  const quoteBtnLight = theme.quoteButtonColorLight ?? theme.wallBase ?? DEFAULT_SHELL_CONFIG.theme.wallBase;
  const quoteBtnDark = theme.quoteButtonColorDark ?? theme.wallBase ?? DEFAULT_SHELL_CONFIG.theme.wallBase;
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

  applySiteFramePalette({ active: theme.siteFrame || getDefaultFrameColor() });
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
  const { active } = applyFramePaletteReadback();
  const entries = [
    { media: '(prefers-color-scheme: light)', color: active },
    { media: '(prefers-color-scheme: dark)', color: active }
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
  fallback.content = active;
}

function applyFramePaletteReadback() {
  const active = readCssVar('--frame-color') || getDefaultFrameColor();

  return { light: active, dark: active, active };
}

export function syncShellToDocument(options = {}) {
  const config = options.config || currentShellConfig;
  const isDark = options.isDark ?? isDarkThemeDocument();
  const shellPalette = resolveShellPalette(config);

  applyShellLayoutVars(config);
  applyShellPalette(shellPalette);
  applyWindowPalette(resolveWindowPalette(isDark));
  applyShellSurfaceVars(config, isDark);
  const siteFramePalette = resolveSiteFramePalette();
  applySiteFramePalette(siteFramePalette);

  return shellPalette;
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
