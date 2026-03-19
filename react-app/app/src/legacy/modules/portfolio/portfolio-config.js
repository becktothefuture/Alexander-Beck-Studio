import {
  derivePortfolioConfig,
  loadDesignSystemConfig,
  loadLegacyPortfolioConfig,
  shouldUseCanonicalDesignConfig,
} from '../utils/design-config.js';

const DEFAULT_PORTFOLIO_CONFIG = {
  cssVars: {
    '--portfolio-nav-top': '0px',
    '--portfolio-stage-pad': 'clamp(18px, 2.1vw, 32px)',
    '--portfolio-hero-title-max': '14ch',
    '--portfolio-image-veil-opacity': '0.14',
    '--portfolio-scroll-hint-offset': 'clamp(34px, 6vh, 68px)',
  },
  runtime: {
    layout: {
      heroTopOffset: 0,
      spawnInsetViewport: 0.1,
      spawnBandWidthRatio: 0.78,
      spawnHeightViewport: 0.62,
      bodyCountPolicy: 'one-per-project',
      headerTopSpacing: 24,
    },
    bodies: {
      minDiameterViewport: 0.22,
      maxDiameterViewport: 0.32,
      diameterScale: 1.2,
      blockWidthMultiplier: 0.92,
      blockHeightRatio: 0.68,
      blockCornerRadius: 40,
      wallPaddingViewport: 0.06,
    },
    labeling: {
      fontDesktopPx: 28,
      fontMobilePx: 20,
      lineHeight: 0.94,
      innerPaddingRatio: 0.18,
      blockRotationRangeDeg: 3.5,
    },
    motion: {
      gravityScale: 0.52,
      massMultiplier: 1,
      neighborImpulse: 0,
      dragThrowMultiplier: 1.05,
      openDurationMs: 420,
      colorFloodHoldMs: 120,
      imageFadeMs: 220,
      titleRevealDelayMs: 480,
    },
    openHero: {
      imageVeilOpacity: 0.14,
      titleMaxWidthCh: 14,
      scrollHintOffsetVh: 7,
    },
    behavior: {
      passiveMouseReaction: false,
      reducedMotionDurationMs: 320,
    },
  },
};

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function merge(target, source) {
  const base = isObject(target) ? { ...target } : {};
  if (!isObject(source)) return base;

  for (const [key, value] of Object.entries(source)) {
    if (isObject(value) && isObject(base[key])) {
      base[key] = merge(base[key], value);
      continue;
    }
    base[key] = value;
  }
  return base;
}

export function normalizePortfolioConfig(rawConfig) {
  const merged = merge(DEFAULT_PORTFOLIO_CONFIG, rawConfig);
  const runtime = merge(DEFAULT_PORTFOLIO_CONFIG.runtime, merged.runtime);
  if (runtime?.labeling) {
    if (runtime.labeling.fontDesktopPx === undefined && Number.isFinite(Number(runtime.labeling.fontMaxPx))) {
      runtime.labeling.fontDesktopPx = Number(runtime.labeling.fontMaxPx);
    }
    if (runtime.labeling.fontMobilePx === undefined && Number.isFinite(Number(runtime.labeling.fontMinPx))) {
      runtime.labeling.fontMobilePx = Number(runtime.labeling.fontMinPx);
    }
  }
  if (runtime?.motion && runtime.motion.gravityScale === undefined && Number.isFinite(Number(runtime.motion.settleGravityScale))) {
    runtime.motion.gravityScale = Number(runtime.motion.settleGravityScale);
  }
  return {
    cssVars: isObject(merged.cssVars) ? { ...merged.cssVars } : { ...DEFAULT_PORTFOLIO_CONFIG.cssVars },
    runtime,
  };
}

export async function loadPortfolioConfig() {
  try {
    if (shouldUseCanonicalDesignConfig()) {
      const designSystem = await loadDesignSystemConfig();
      return normalizePortfolioConfig(derivePortfolioConfig(designSystem));
    }

    const legacyConfig = await loadLegacyPortfolioConfig();
    if (legacyConfig && typeof legacyConfig === 'object') {
      return normalizePortfolioConfig(legacyConfig);
    }

    const designSystem = await loadDesignSystemConfig();
    return normalizePortfolioConfig(derivePortfolioConfig(designSystem));
  } catch (error) {
    console.warn('Portfolio config load failed, using defaults', error);
    return normalizePortfolioConfig(null);
  }
}

export function applyPortfolioConfig(config) {
  const normalized = normalizePortfolioConfig(config);
  const root = document.documentElement;

  for (const [key, value] of Object.entries(normalized.cssVars)) {
    if (!key || value === undefined || value === null || value === '') continue;
    root.style.setProperty(key, String(value));
  }

  return normalized;
}

export const DEFAULT_PORTFOLIO_RUNTIME = normalizePortfolioConfig(null).runtime;
