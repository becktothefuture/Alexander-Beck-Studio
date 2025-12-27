// Portfolio config loader and applicator.
// Keeps the carousel tunables in a dedicated file while preserving wall tuning on index only.

const DEFAULT_WHEEL_CONFIG = {
  sensitivity: 1.8,
  ease: 0.22,
  lineHeightFallback: 16,
  pageScale: 0.9,
};

const DEFAULT_SOUND_CONFIG = {
  // Center-cross click (one per project when it passes center)
  centerClickEnabled: true,
  centerClickGain: 8, // Stored as percentage (0-100)
  centerClickFilterHz: 1600,
  centerClickMinSpeed: 120, // px/s (derived wheel speed proxy)
  centerClickDebounceMs: 70,

  // Continuous wheel ticks/swish (legacy; off by default)
  continuousWheelEnabled: false,
  continuousTickGainMul: 100, // percentage multiplier (0-200)
  continuousSwishGainMul: 100, // percentage multiplier (0-200)

  // Snap click (wheel settles). Off by default to avoid double-clicking with center clicks.
  snapEnabled: false,
  snapGain: 12, // Stored as percentage (0-100) for UI consistency
  openGain: 12,
  openFilterHz: 1800,
  closeGain: 10,
  closeFilterHz: 1600,
  snapDebounceMs: 300,
};

const DEFAULT_MOUSE_TILT_CONFIG = {
  enabled: true,
  sensitivity: 0.8,
  ease: 0.15,
  invertX: false,
  invertY: false,
};

const DEFAULT_CYLINDER_CONFIG = {
  enabled: true,
  ringCount: 12,
  dotsPerRing: 24,
  depthRange: 1000,
  radiusMin: 100,
  radiusMax: 500,
  radiusStep: 80,
  radiusRings: 5,
  verticalSpacing: 60,
  randomness: 0.2,
  dotSize: 3,
  opacityMin: 0.15,
  opacityMax: 0.9,
  rotationSync: 1.0,
  gridPattern: 'even',
};

const WALL_CSS_VARS = new Set([
  '--bg-light',
  '--bg-dark',
  '--chrome-bg-light',
  '--chrome-bg-dark',
  '--frame-color-light',
  '--frame-color-dark',
  '--wall-color',
  '--container-border-vw',
  '--container-border-x-vw',
  '--wall-thickness-vw',
  '--wall-radius-vw',
  '--layout-min-wall-radius',
  '--layout-min-content-padding',
  '--container-border',
  '--container-border-x',
  '--container-border-y',
  '--wall-radius',
  '--wall-thickness',
  '--container-radius',
  '--bg-color',
]);

// Vars that are now token-controlled and should not be user-configurable.
// (We ignore them even if they exist in older saved configs.)
const LOCKED_CSS_VARS = new Set([
  '--text-client-size',
  '--text-title-size',
  '--text-tags-size',
  '--close-button-font-size',
]);

export function normalizePortfolioRuntime(runtime = {}) {
  const wheel = (runtime && runtime.wheel && typeof runtime.wheel === 'object')
    ? runtime.wheel
    : {};
  const sound = (runtime && runtime.sound && typeof runtime.sound === 'object')
    ? runtime.sound
    : {};
  const mouseTilt = (runtime && runtime.mouseTilt && typeof runtime.mouseTilt === 'object')
    ? runtime.mouseTilt
    : {};
  const cylinder = (runtime && runtime.cylinder && typeof runtime.cylinder === 'object')
    ? runtime.cylinder
    : {};

  const toNumber = (value, fallback) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
  };

  const toBoolean = (value, fallback) => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number' && Number.isFinite(value)) return value !== 0;
    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower === 'true' || lower === '1') return true;
      if (lower === 'false' || lower === '0') return false;
    }
    return fallback;
  };

  return {
    wheel: {
      sensitivity: toNumber(wheel.sensitivity, DEFAULT_WHEEL_CONFIG.sensitivity),
      ease: toNumber(wheel.ease, DEFAULT_WHEEL_CONFIG.ease),
      lineHeightFallback: toNumber(wheel.lineHeightFallback, DEFAULT_WHEEL_CONFIG.lineHeightFallback),
      pageScale: toNumber(wheel.pageScale, DEFAULT_WHEEL_CONFIG.pageScale),
    },
    sound: {
      centerClickEnabled: toBoolean(sound.centerClickEnabled, DEFAULT_SOUND_CONFIG.centerClickEnabled),
      centerClickGain: toNumber(sound.centerClickGain, DEFAULT_SOUND_CONFIG.centerClickGain),
      centerClickFilterHz: toNumber(sound.centerClickFilterHz, DEFAULT_SOUND_CONFIG.centerClickFilterHz),
      centerClickMinSpeed: toNumber(sound.centerClickMinSpeed, DEFAULT_SOUND_CONFIG.centerClickMinSpeed),
      centerClickDebounceMs: toNumber(sound.centerClickDebounceMs, DEFAULT_SOUND_CONFIG.centerClickDebounceMs),

      continuousWheelEnabled: toBoolean(sound.continuousWheelEnabled, DEFAULT_SOUND_CONFIG.continuousWheelEnabled),
      continuousTickGainMul: toNumber(sound.continuousTickGainMul, DEFAULT_SOUND_CONFIG.continuousTickGainMul),
      continuousSwishGainMul: toNumber(sound.continuousSwishGainMul, DEFAULT_SOUND_CONFIG.continuousSwishGainMul),

      snapEnabled: toBoolean(sound.snapEnabled, DEFAULT_SOUND_CONFIG.snapEnabled),
      snapGain: toNumber(sound.snapGain, DEFAULT_SOUND_CONFIG.snapGain),
      openGain: toNumber(sound.openGain, DEFAULT_SOUND_CONFIG.openGain),
      openFilterHz: toNumber(sound.openFilterHz, DEFAULT_SOUND_CONFIG.openFilterHz),
      closeGain: toNumber(sound.closeGain, DEFAULT_SOUND_CONFIG.closeGain),
      closeFilterHz: toNumber(sound.closeFilterHz, DEFAULT_SOUND_CONFIG.closeFilterHz),
      snapDebounceMs: toNumber(sound.snapDebounceMs, DEFAULT_SOUND_CONFIG.snapDebounceMs),
    },
    mouseTilt: {
      enabled: toBoolean(mouseTilt.enabled, DEFAULT_MOUSE_TILT_CONFIG.enabled),
      sensitivity: toNumber(mouseTilt.sensitivity, DEFAULT_MOUSE_TILT_CONFIG.sensitivity),
      ease: toNumber(mouseTilt.ease, DEFAULT_MOUSE_TILT_CONFIG.ease),
      invertX: toBoolean(mouseTilt.invertX, DEFAULT_MOUSE_TILT_CONFIG.invertX),
      invertY: toBoolean(mouseTilt.invertY, DEFAULT_MOUSE_TILT_CONFIG.invertY),
    },
    cylinder: {
      enabled: toBoolean(cylinder.enabled, DEFAULT_CYLINDER_CONFIG.enabled),
      ringCount: toNumber(cylinder.ringCount, DEFAULT_CYLINDER_CONFIG.ringCount),
      dotsPerRing: toNumber(cylinder.dotsPerRing, DEFAULT_CYLINDER_CONFIG.dotsPerRing),
      depthRange: toNumber(cylinder.depthRange, DEFAULT_CYLINDER_CONFIG.depthRange),
      radiusMin: toNumber(cylinder.radiusMin, DEFAULT_CYLINDER_CONFIG.radiusMin),
      radiusMax: toNumber(cylinder.radiusMax, DEFAULT_CYLINDER_CONFIG.radiusMax),
      radiusStep: toNumber(cylinder.radiusStep, DEFAULT_CYLINDER_CONFIG.radiusStep),
      radiusRings: toNumber(cylinder.radiusRings, DEFAULT_CYLINDER_CONFIG.radiusRings),
      verticalSpacing: toNumber(cylinder.verticalSpacing, DEFAULT_CYLINDER_CONFIG.verticalSpacing),
      randomness: toNumber(cylinder.randomness, DEFAULT_CYLINDER_CONFIG.randomness),
      dotSize: toNumber(cylinder.dotSize, DEFAULT_CYLINDER_CONFIG.dotSize),
      opacityMin: toNumber(cylinder.opacityMin, DEFAULT_CYLINDER_CONFIG.opacityMin),
      opacityMax: toNumber(cylinder.opacityMax, DEFAULT_CYLINDER_CONFIG.opacityMax),
      rotationSync: toNumber(cylinder.rotationSync, DEFAULT_CYLINDER_CONFIG.rotationSync),
      gridPattern: String(cylinder.gridPattern || DEFAULT_CYLINDER_CONFIG.gridPattern),
    },
  };
}

export function normalizePortfolioConfig(raw) {
  const base = raw && typeof raw === 'object' ? raw : {};
  const cssVars = (base.cssVars && typeof base.cssVars === 'object')
    ? { ...base.cssVars }
    : {};

  return {
    cssVars,
    runtime: normalizePortfolioRuntime(base.runtime),
  };
}

export async function loadPortfolioConfig() {
  try {
    try {
      if (typeof window !== 'undefined' && window.__PORTFOLIO_CONFIG__ && typeof window.__PORTFOLIO_CONFIG__ === 'object') {
        return normalizePortfolioConfig(window.__PORTFOLIO_CONFIG__);
      }
    } catch (e) {}

    const paths = [
      'config/portfolio-config.json',
      'js/portfolio-config.json',
      '../public/js/portfolio-config.json',
    ];

    for (const path of paths) {
      try {
        const res = await fetch(path, { cache: 'no-cache' });
        if (res.ok) return normalizePortfolioConfig(await res.json());
      } catch (e) {
        // Try next path
      }
    }

    throw new Error('No portfolio config found');
  } catch (e) {
    console.warn('Portfolio config load failed, using defaults');
    return normalizePortfolioConfig(null);
  }
}

export function applyPortfolioConfig(config) {
  const normalized = normalizePortfolioConfig(config);
  const root = document.documentElement;
  const cssVars = normalized.cssVars || {};

  // Only apply carousel-specific vars; wall tuning stays on the index config.
  for (const [key, value] of Object.entries(cssVars)) {
    if (!key || WALL_CSS_VARS.has(key) || LOCKED_CSS_VARS.has(key)) continue;
    if (value === undefined || value === null || value === '') continue;
    root.style.setProperty(key, String(value));
  }

  return normalized;
}

export const DEFAULT_PORTFOLIO_RUNTIME = normalizePortfolioRuntime();
