const DEFAULT_SHELL_CONFIG = {
  theme: {
    wallBaseLight: '#f1f3f4',
    wallBaseDark: '#202124',
    chromeHarmonyMode: 'adaptive',
    lockedHeaderLight: '#f1f3f4',
    lockedHeaderDark: '#3c3c3c'
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
    frameRadiusMobile: '24px'
  },
  motion: {
    shellRevealMs: 180,
    contentRevealMs: 420,
    simulationWarmupFrames: 90,
    allowScaleEntrance: false
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
    motion: { ...base.motion, ...(override?.motion || {}) },
    hero: { ...base.hero, ...(override?.hero || {}) }
  };
}

export function getShellConfig() {
  return currentShellConfig;
}

export async function loadShellConfig() {
  if (shellConfigPromise) return shellConfigPromise;

  shellConfigPromise = fetch('/config/shell-config.json', { cache: 'no-cache' })
    .then((response) => response.ok ? response.json() : null)
    .then((payload) => {
      currentShellConfig = mergeShellConfig(DEFAULT_SHELL_CONFIG, payload || {});
      return currentShellConfig;
    })
    .catch(() => {
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
  const mode = String(config?.theme?.chromeHarmonyMode || 'adaptive');

  const siteLight = config?.theme?.wallBaseLight || DEFAULT_SHELL_CONFIG.theme.wallBaseLight;
  const siteDark = config?.theme?.wallBaseDark || DEFAULT_SHELL_CONFIG.theme.wallBaseDark;
  const lockedLight = config?.theme?.lockedHeaderLight || DEFAULT_SHELL_CONFIG.theme.lockedHeaderLight;
  const lockedDark = config?.theme?.lockedHeaderDark || DEFAULT_SHELL_CONFIG.theme.lockedHeaderDark;

  const useLockedPalette = mode === 'browser'
    || (mode === 'adaptive' && !family.isSafari && !themeColorLikelyApplied);

  const light = useLockedPalette ? lockedLight : siteLight;
  const dark = useLockedPalette ? lockedDark : siteDark;
  const active = isDark ? dark : light;

  return {
    light,
    dark,
    active,
    family,
    themeColorLikelyApplied,
    usesLockedPalette: useLockedPalette
  };
}

export function applyShellPalette({ light, dark, active }) {
  const root = document.documentElement;
  const nextActive = active || dark || light || DEFAULT_SHELL_CONFIG.theme.wallBaseDark;
  const nextLight = light || nextActive;
  const nextDark = dark || nextActive;

  root.style.setProperty('--abs-wall-base-light', nextLight);
  root.style.setProperty('--abs-wall-base-dark', nextDark);
  root.style.setProperty('--abs-wall-base', nextActive);
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
  root.style.setProperty('--abs-shell-reveal-ms', `${motion.shellRevealMs}ms`);
  root.style.setProperty('--abs-content-reveal-ms', `${motion.contentRevealMs}ms`);
  root.style.setProperty('--abs-home-mobile-nav-bottom-offset', hero.mobileNavBottomOffset);
  root.style.setProperty('--abs-safe-top', 'env(safe-area-inset-top, 0px)');
  root.style.setProperty('--abs-safe-right', 'env(safe-area-inset-right, 0px)');
  root.style.setProperty('--abs-safe-bottom', 'env(safe-area-inset-bottom, 0px)');
  root.style.setProperty('--abs-safe-left', 'env(safe-area-inset-left, 0px)');
}

export function syncThemeColorMeta({ light, dark, active }) {
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

export function syncShellToDocument(options = {}) {
  const config = options.config || currentShellConfig;
  const isDark = options.isDark ?? document.documentElement.classList.contains('dark-mode');
  const palette = resolveShellPalette(config, isDark);

  applyShellLayoutVars(config);
  applyShellPalette(palette);
  syncThemeColorMeta(palette);

  return palette;
}

export function getSimulationWarmupMs(config = currentShellConfig) {
  const frames = Number(config?.motion?.simulationWarmupFrames) || 0;
  return Math.max(0, Math.round((frames / 60) * 1000));
}
