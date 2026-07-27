import {
  derivePortfolioConfig,
  loadDesignSystemConfig,
  loadLegacyPortfolioConfig,
  shouldUseCanonicalDesignConfig,
} from '../utils/design-config.js';

const DEFAULT_PORTFOLIO_CONFIG = {
  cssVars: {
    '--portfolio-nav-top': '0px',
    '--portfolio-stage-pad': 'clamp(var(--size-18), var(--size-2.1), var(--space-2xl))',
    '--portfolio-hero-title-max': '14ch',
    '--portfolio-image-veil-opacity': '0.14',
    '--portfolio-hero-image-gutter': '0px',
    '--portfolio-hero-image-radius': 'max(0px, calc(var(--portfolio-drawer-radius) - var(--portfolio-hero-image-gutter)))',
    '--portfolio-scroll-hint-offset': 'clamp(var(--size-26), var(--size-18) + var(--font-size-1.2), var(--size-52))',
    '--portfolio-drawer-seat-inset': '3px',
    '--portfolio-drawer-inner-radius-shrink': "var(--size-border-default)",
    '--portfolio-drawer-insert-contact-opacity': '0.24',
    '--portfolio-drawer-insert-top-light-opacity': '0.14',
    '--portfolio-drawer-insert-lip-opacity': '0.16',
    '--portfolio-drawer-outline-width': "var(--size-border-default)",
    '--portfolio-drawer-outline-opacity': '0.28',
  },
  runtime: {
    entrance: {
      cardStepMs: 52,
      cardOpacityDurationMs: 440,
      mediaBlurDurationMs: 560,
      mediaBlurPx: 4,
      cardStartDelayMs: 80,
      indicatorDurationMs: 240,
      indicatorDelayMs: 140,
      completionTimeoutMs: 1500,
    },
    layout: {
      heroTopOffset: 0,
      spawnInsetViewport: 0.1,
      spawnBandWidthRatio: 0.78,
      spawnHeightViewport: 0.62,
      bodyCountPolicy: 'one-per-project',
      headerTopSpacing: 24,
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
      titleLineHeight: 0.84,
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
      openDurationMs: 700,
      closeDurationMs: 520,
      colorFloodHoldMs: 120,
      heroKenBurnsDurationMs: 28000,
      heroKenBurnsPanPx: 18,
      heroKenBurnsZoomPct: 18,
    },
    carousel: {
      scrollSensitivity: 1,
      scrollPixelsPerProject: 520,
      inputCapProjects: 0.32,
      inputCommitThresholdProjects: 0.18,
      inputIntentWindowMs: 180,
      maxLeadProjects: 2,
      followSmoothing: 0.18,
      settleIdleMs: 150,
      settleStrength: 0.15,
      cardWidthPercent: 24,
      cardMaxWidthPx: 316,
      cardHeightCqh: 58,
      cardMaxHeightPx: 461,
      largeViewportWidthStartPx: 1440,
      largeViewportWidthEndPx: 2560,
      largeViewportHeightStartPx: 900,
      largeViewportHeightEndPx: 1440,
      largeViewportCardScaleMax: 1.75,
      largeViewportContentScaleMax: 1.45,
      mobileCardWidthPercent: 64,
      mobileCardMaxWidthPx: 300,
      mobileCardHeightCqh: 58,
      mobileCardMaxHeightPx: 500,
      centerYPercent: 50,
      mobileCenterYPercent: 58,
      sliderYOffsetDvh: 0,
      introYOffsetDvh: 0,
      desktopViewportYOffsetDvh: 3,
      largeViewportOrbitCapStartProgress: 0.6,
      largeViewportTitleCardGapDvh: 8,
      largeViewportGroupOffsetHeightEndPx: 1800,
      largeViewportGroupOffsetMaxDvh: 6,
      perspectivePx: 1600,
      pathRadiusPx: 2600,
      mobilePathRadiusPx: 820,
      angleStepDeg: 10.25,
      mobileAngleStepDeg: 13.5,
      sideRotationDeg: 10,
      farRotationDeg: 22,
      sideScale: 0.985,
      mobileSideScale: 0.78,
      farScale: 0.9,
      minCardGapPx: 18,
      dotDialRadiusPx: 2050,
      mobileDotDialRadiusPx: 900,
      dotDensity: 5,
      dotActiveScale: 1,
      dotParallaxRatio: 1,
      dotArcSpanDeg: 18,
      contactShadowOpacity: 0.12,
      particleField: {
        idleOpacity: 0,
        fastOpacity: 0.26,
        quietBandHeight: 0.42,
        quietBandOpacity: 0.3,
        densityScale: 1,
        minRadiusPx: 1.8,
        maxRadiusPx: 18,
        motionResponse: 1,
        parallaxDepth: 1,
      },
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
  const rawCarousel = isObject(rawConfig?.runtime?.carousel) ? rawConfig.runtime.carousel : {};
  if (!isObject(rawCarousel.particleField) && isObject(rawCarousel.speedField)) {
    const legacyField = rawCarousel.speedField;
    const legacyFastOpacity = Number(legacyField.maxOpacity);
    runtime.carousel.particleField = merge(DEFAULT_PORTFOLIO_CONFIG.runtime.carousel.particleField, {
      idleOpacity: Number.isFinite(legacyFastOpacity)
        ? Math.min(1, Math.max(0, legacyFastOpacity * 0.34))
        : DEFAULT_PORTFOLIO_CONFIG.runtime.carousel.particleField.idleOpacity,
      fastOpacity: Number.isFinite(legacyFastOpacity)
        ? legacyFastOpacity
        : DEFAULT_PORTFOLIO_CONFIG.runtime.carousel.particleField.fastOpacity,
      ...(Number.isFinite(Number(legacyField.densityScale))
        ? { densityScale: Number(legacyField.densityScale) }
        : {}),
    });
  }
  if (runtime?.carousel) delete runtime.carousel.speedField;
  if (isObject(runtime?.carousel?.particleField)) {
    const field = runtime.carousel.particleField;
    field.idleOpacity = Math.min(1, Math.max(0, Number(field.idleOpacity) || 0));
    field.fastOpacity = Math.min(1, Math.max(field.idleOpacity, Number(field.fastOpacity) || 0.26));
    field.quietBandHeight = Math.min(0.72, Math.max(0.18, Number(field.quietBandHeight) || 0.42));
    field.quietBandOpacity = Math.min(1, Math.max(0.05, Number(field.quietBandOpacity) || 0.3));
    field.densityScale = Math.min(2, Math.max(0.25, Number(field.densityScale) || 1));
    field.minRadiusPx = Math.min(6, Math.max(0.75, Number(field.minRadiusPx) || 1.8));
    field.maxRadiusPx = Math.min(36, Math.max(field.minRadiusPx + 1, Number(field.maxRadiusPx) || 18));
    field.motionResponse = Math.min(2.5, Math.max(0.25, Number(field.motionResponse) || 1));
    field.parallaxDepth = Math.min(2, Math.max(0.25, Number(field.parallaxDepth) || 1));
  }
  if (isObject(runtime?.carousel)) {
    const sliderYOffsetDvh = Number(runtime.carousel.sliderYOffsetDvh);
    const introYOffsetDvh = Number(runtime.carousel.introYOffsetDvh);
    runtime.carousel.sliderYOffsetDvh = Number.isFinite(sliderYOffsetDvh)
      ? Math.min(12, Math.max(-12, sliderYOffsetDvh))
      : 0;
    runtime.carousel.introYOffsetDvh = Number.isFinite(introYOffsetDvh)
      ? Math.min(12, Math.max(-12, introYOffsetDvh))
      : 0;
  }
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
  if (runtime?.motion) {
    delete runtime.motion.imageFadeMs;
    delete runtime.motion.titleRevealDelayMs;
    delete runtime.motion.openGhostDurationMs;
  }
  if (runtime?.entrance) {
    const entrance = runtime.entrance;
    entrance.cardStepMs = Math.min(160, Math.max(0, Number(entrance.cardStepMs) || 52));
    entrance.cardOpacityDurationMs = Math.min(1200, Math.max(1, Number(entrance.cardOpacityDurationMs) || 440));
    entrance.mediaBlurDurationMs = Math.min(1400, Math.max(1, Number(entrance.mediaBlurDurationMs) || 560));
    entrance.mediaBlurPx = Math.min(16, Math.max(0, Number(entrance.mediaBlurPx) || 4));
    entrance.cardStartDelayMs = Math.min(600, Math.max(0, Number(entrance.cardStartDelayMs) || 80));
    entrance.indicatorDurationMs = Math.min(900, Math.max(1, Number(entrance.indicatorDurationMs) || 240));
    entrance.indicatorDelayMs = Math.min(900, Math.max(0, Number(entrance.indicatorDelayMs) || 140));
    entrance.completionTimeoutMs = Math.min(3000, Math.max(600, Number(entrance.completionTimeoutMs) || 1500));
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
