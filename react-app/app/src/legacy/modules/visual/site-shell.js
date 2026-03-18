import {
  deriveShellConfig,
  loadDesignSystemConfig,
  loadLegacyShellConfig,
  shouldUseCanonicalDesignConfig,
} from '../utils/design-config.js';

const DEFAULT_SHELL_CONFIG = {
  theme: {
    wallBaseLight: '#f1f3f4',
    wallBaseDark: '#202124',
    siteFrameLight: '#202124',
    siteFrameDark: '#202124',
    chromeHarmonyMode: 'adaptive',
    lockedHeaderLight: '#f1f3f4',
    lockedHeaderDark: '#3c3c3c',
    frameBorderEdgeOpacity: 0.03,
    frameBorderMidOpacity: 0.06,
    frameVignetteEdgeBlur: '30px',
    frameVignetteEdgeOpacity: 0.18,
    frameVignetteAmbientOpacity: 0.12
  },
  layout: {
    frameInsetDesktop: '16px',
    frameInsetTablet: '14px',
    frameInsetMobile: '10px',
    contentInsetDesktop: '28px',
    contentInsetTablet: '22px',
    contentInsetMobile: '16px',
    frameRadiusDesktop: '32px',
    frameRadiusTablet: '28px',
    frameRadiusMobile: '24px',
    decorativeScriptMaxWidth: '355px',
    decorativeScriptPaddingX: '16px',
    decorativeScriptPaddingY: '10px',
    quoteMaxWidth: '200px',
    quotePaddingX: '16px',
    quotePaddingY: '12px',
    edgeCaptionDistanceMin: '8px',
    edgeCaptionDistanceMax: '48px'
  },
  surface: {
    radius: '18px',
    blur: '8px',
    saturation: 1.12,
    edgeWidth: '0.5px',
    fillOpacityLight: 0.018,
    fillOpacityDark: 0.028,
    sheenTopOpacityLight: 0.03,
    sheenTopOpacityDark: 0.045,
    sheenMidOpacityLight: 0.01,
    sheenMidOpacityDark: 0.018,
    edgeOpacityLight: 0.08,
    edgeOpacityDark: 0.12,
    innerShadowOpacityLight: 0.06,
    innerShadowOpacityDark: 0.1,
    shadowOpacityLight: 0.14,
    shadowOpacityDark: 0.24,
    glowOpacityLight: 0.14,
    glowOpacityDark: 0.24,
    shadowBlur: '18px',
    shadowOffsetY: '6px',
    lightEdgeInset: '0.5px',
    lightEdgeBlur: '4px',
    lightEdgeTopOpacityLight: 0.16,
    lightEdgeTopOpacityDark: 0.22,
    lightEdgeBottomOpacityLight: 0.06,
    lightEdgeBottomOpacityDark: 0.12
  },
  motion: {
    shellRevealMs: 180,
    contentRevealMs: 420,
    simulationWarmupFrames: 90,
    allowScaleEntrance: false,
    modalOverlayOpacity: 0,
    modalOverlayBlurPx: 5.5,
    modalOverlayTransitionMs: 700,
    modalOverlayTransitionOutMs: 500,
    modalOverlayContentDelayMs: 200,
    modalDepthScale: 0.943,
    modalDepthTranslateY: 1
  },
  hero: {
    startupMode: 'pit',
    mobileLogoWidthVw: 50,
    mobileLogoMinPx: 170,
    mobileLogoMaxPx: 220,
    mobileLogoHeightRatio: 0.24,
    mobileNavBottomOffset: '118px'
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

export function resolveShellPalette(config = currentShellConfig, isDark = document.documentElement.classList.contains('dark-mode')) {
  const family = detectBrowserFamily();
  const themeColorLikelyApplied = detectThemeColorLikelyApplied(family);

  const siteLight = config?.theme?.wallBaseLight || DEFAULT_SHELL_CONFIG.theme.wallBaseLight;
  const siteDark = config?.theme?.wallBaseDark || DEFAULT_SHELL_CONFIG.theme.wallBaseDark;
  const light = siteLight;
  const dark = siteDark;
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

export function resolveSiteFramePalette(isDark = document.documentElement.classList.contains('dark-mode')) {
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

export function resolveBrowserFramePalette(config = currentShellConfig, isDark = document.documentElement.classList.contains('dark-mode')) {
  const light = config?.theme?.lockedHeaderLight || DEFAULT_SHELL_CONFIG.theme.lockedHeaderLight;
  const dark = config?.theme?.lockedHeaderDark || DEFAULT_SHELL_CONFIG.theme.lockedHeaderDark;
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
}

export function applyShellPalette({ light, dark, active }) {
  const root = document.documentElement;
  const nextActive = active || dark || light || DEFAULT_SHELL_CONFIG.theme.wallBaseDark;
  const nextLight = light || nextActive;
  const nextDark = dark || nextActive;

  root.style.setProperty('--abs-wall-base-light', nextLight);
  root.style.setProperty('--abs-wall-base-dark', nextDark);
  root.style.setProperty('--abs-wall-base', nextActive);
}

export function applyShellLayoutVars(config = currentShellConfig) {
  const root = document.documentElement;
  const layout = config?.layout || DEFAULT_SHELL_CONFIG.layout;
  const motion = config?.motion || DEFAULT_SHELL_CONFIG.motion;
  const hero = config?.hero || DEFAULT_SHELL_CONFIG.hero;

  root.style.setProperty('--abs-frame-inset-desktop', layout.frameInsetDesktop);
  root.style.setProperty('--abs-frame-inset-tablet', layout.frameInsetTablet);
  root.style.setProperty('--abs-frame-inset-mobile', layout.frameInsetMobile);
  root.style.setProperty('--abs-content-inset-desktop', layout.contentInsetDesktop);
  root.style.setProperty('--abs-content-inset-tablet', layout.contentInsetTablet);
  root.style.setProperty('--abs-content-inset-mobile', layout.contentInsetMobile);
  root.style.setProperty('--abs-frame-radius-desktop', layout.frameRadiusDesktop);
  root.style.setProperty('--abs-frame-radius-tablet', layout.frameRadiusTablet);
  root.style.setProperty('--abs-frame-radius-mobile', layout.frameRadiusMobile);
  root.style.setProperty('--decorative-script-max-width', layout.decorativeScriptMaxWidth);
  root.style.setProperty('--decorative-script-padding-left', layout.decorativeScriptPaddingX);
  root.style.setProperty('--decorative-script-padding-vertical', layout.decorativeScriptPaddingY);
  root.style.setProperty('--abs-quote-max-width', layout.quoteMaxWidth);
  root.style.setProperty('--abs-quote-pad-x', layout.quotePaddingX);
  root.style.setProperty('--abs-quote-pad-y', layout.quotePaddingY);
  root.style.setProperty('--edge-caption-distance-min', layout.edgeCaptionDistanceMin);
  root.style.setProperty('--edge-caption-distance-max', layout.edgeCaptionDistanceMax);
  root.style.setProperty('--abs-shell-reveal-ms', `${motion.shellRevealMs}ms`);
  root.style.setProperty('--abs-content-reveal-ms', `${motion.contentRevealMs}ms`);
  root.style.setProperty('--modal-overlay-opacity', String(motion.modalOverlayOpacity));
  root.style.setProperty('--modal-overlay-blur', `${motion.modalOverlayBlurPx}px`);
  root.style.setProperty('--modal-overlay-transition-duration', `${motion.modalOverlayTransitionMs}ms`);
  root.style.setProperty('--modal-overlay-transition-out-duration', `${motion.modalOverlayTransitionOutMs}ms`);
  root.style.setProperty('--modal-content-delay', `${motion.modalOverlayContentDelayMs}ms`);
  root.style.setProperty('--modal-depth-scale', String(motion.modalDepthScale));
  root.style.setProperty('--modal-depth-translate-y', `${motion.modalDepthTranslateY}px`);
  root.style.setProperty('--abs-home-mobile-nav-bottom-offset', hero.mobileNavBottomOffset);
  root.style.setProperty('--abs-safe-top', 'env(safe-area-inset-top, 0px)');
  root.style.setProperty('--abs-safe-right', 'env(safe-area-inset-right, 0px)');
  root.style.setProperty('--abs-safe-bottom', 'env(safe-area-inset-bottom, 0px)');
  root.style.setProperty('--abs-safe-left', 'env(safe-area-inset-left, 0px)');
}

function applyShellSurfaceVars(config = currentShellConfig, isDark = document.documentElement.classList.contains('dark-mode')) {
  const root = document.documentElement;
  const theme = config?.theme || DEFAULT_SHELL_CONFIG.theme;
  const surface = config?.surface || DEFAULT_SHELL_CONFIG.surface;

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

  root.style.setProperty('--frame-color-site-light', theme.siteFrameLight || getDefaultFrameColor());
  root.style.setProperty('--frame-color-site-dark', theme.siteFrameDark || theme.siteFrameLight || getDefaultFrameColor());
  root.style.setProperty('--frame-border-gradient-edge-opacity', String(theme.frameBorderEdgeOpacity));
  root.style.setProperty('--frame-border-gradient-mid-opacity', String(theme.frameBorderMidOpacity));
  root.style.setProperty('--frame-vignette-edge-blur', theme.frameVignetteEdgeBlur);
  root.style.setProperty('--frame-vignette-edge-opacity', String(theme.frameVignetteEdgeOpacity));
  root.style.setProperty('--frame-vignette-ambient-opacity', String(theme.frameVignetteAmbientOpacity));

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

function applyFramePaletteReadback(isDark = document.documentElement.classList.contains('dark-mode')) {
  const light = readCssVar('--frame-color-light') || getDefaultFrameColor();
  const dark = readCssVar('--frame-color-dark') || light || getDefaultFrameColor();
  const active = readCssVar('--frame-color') || (isDark ? dark : light);

  return { light, dark, active };
}

export function syncShellToDocument(options = {}) {
  const config = options.config || currentShellConfig;
  const isDark = options.isDark ?? document.documentElement.classList.contains('dark-mode');
  const innerPalette = resolveShellPalette(config, isDark);

  applyShellLayoutVars(config);
  applyShellPalette(innerPalette);
  applyShellSurfaceVars(config, isDark);
  const siteFramePalette = resolveSiteFramePalette(isDark);
  applySiteFramePalette(siteFramePalette);
  applyFrameChromePalette(siteFramePalette);
  syncThemeColorMeta();

  return innerPalette;
}

export function getModalChromeConfig(config = currentShellConfig) {
  const motion = config?.motion || DEFAULT_SHELL_CONFIG.motion;
  return {
    modalOverlayOpacity: motion.modalOverlayOpacity,
    modalOverlayBlurPx: motion.modalOverlayBlurPx,
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
