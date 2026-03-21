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
    '--portfolio-hero-image-gutter': 'clamp(12px, 8px + 0.9vw, 24px)',
    '--portfolio-hero-image-radius': 'max(0px, calc(var(--portfolio-drawer-radius) - var(--portfolio-hero-image-gutter)))',
    '--portfolio-scroll-hint-offset': 'clamp(26px, 18px + 1.2vw, 52px)',
    '--portfolio-drawer-seat-inset': '0px',
    '--portfolio-drawer-edge-width': '2px',
    '--portfolio-drawer-top-light-opacity': '0.32',
    '--portfolio-drawer-rim-shadow-opacity': '0.3',
  },
  runtime: {
    layout: {
      heroTopOffset: 0,
      spawnInsetViewport: 0.1,
      spawnBandWidthRatio: 0.78,
      spawnHeightViewport: 0.62,
      bodyCountPolicy: 'one-per-project',
      headerTopSpacing: 24,
      wallInset: 0,
    },
    bodies: {
      minDiameterViewport: 0.105,
      maxDiameterViewport: 0.22,
      diameterScale: 1,
      squircleLameExponent: 4,
      ballSpacing: 0,
      ballBallSurfaceGapPx: 1,
      collisionPairSlopPx: null,
      wallPaddingViewport: 0.03,
    },
    labeling: {
      fontDesktopPx: 28,
      fontMobilePx: 20,
      titleLineHeight: 0.76,
      innerPaddingRatio: 0.18,
      blockRotationRangeDeg: 3.5,
    },
    motion: {
      gravityScale: 0.82,
      massMultiplier: 1,
      wallRestitution: 0.3,
      collisionRestitution: 0.35,
      contactFriction: 0.55,
      contactStaticFriction: 1.0,
      contactStaticSlipPx: 18,
      dragMaxSpeedPx: 2200,
      maxAngularSpeed: 6.5,
      wakeVelocityThreshold: 26,
      supportNormalThreshold: 0.18,
      restingContactHoldMs: 220,
      groundedVerticalSnapPx: 10,
      supportVerticalSnapPx: 14,
      restingLateralSnapPx: 10,
      restingAngularSnap: 0.08,
      maxFrameDt: 0.05,
      maxPhysicsSteps: 6,
      accumulatorResetThreshold: 8,
      sleepVelocityThreshold: 20,
      sleepAngularThreshold: 0.24,
      timeToSleep: 0.14,
      neighborImpulse: 0,
      dragThrowMultiplier: 1.05,
      openDurationMs: 546,
      colorFloodHoldMs: 120,
      imageFadeMs: 220,
      titleRevealDelayMs: 480,
      heroKenBurnsDurationMs: 28000,
      heroKenBurnsPanPx: 18,
      heroKenBurnsZoomPct: 18,
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
    if (runtime.labeling.titleLineHeight === undefined && Number.isFinite(Number(runtime.labeling.lineHeight))) {
      runtime.labeling.titleLineHeight = Number(runtime.labeling.lineHeight);
    }
    delete runtime.labeling.lineHeight;
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
