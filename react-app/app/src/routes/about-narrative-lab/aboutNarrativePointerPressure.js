const REFERENCE_VIEWPORT = Object.freeze({ width: 1024, height: 700 });
const MINIMUM_SPATIAL_SCALE = 0.5;
const MINIMUM_FORCE_SCALE = 0.85;
const MAXIMUM_POINTER_SPEED_PX_PER_SECOND = 1600;
const POINTER_SAMPLE_EXPIRY_MS = 90;
const VELOCITY_RESPONSE_MS = 140;

export const ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS = Object.freeze({
  radiusPx: 174,
  forcePx: 76,
  variation: 0.52,
  responseMs: 70,
  returnMs: 640,
});

const clamp = (value, minimum, maximum) => Math.min(maximum, Math.max(minimum, value));

function finiteOr(value, fallback) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

function damp(current, target, deltaSeconds, durationMs) {
  if (durationMs <= 0) return target;
  // Treat the control duration as the perceptual 99% response time.
  const alpha = 1 - Math.exp((-4.60517 * deltaSeconds) / (durationMs / 1000));
  return current + ((target - current) * alpha);
}

function smoothstep01(value) {
  const progress = clamp(value, 0, 1);
  return progress * progress * (3 - (2 * progress));
}

function clearSample(target) {
  target.active = false;
  target.settling = false;
  target.strength = 0;
  target.releaseProgress = 1;
  target.releaseStrength = 0;
  target.velocityX = 0;
  target.velocityY = 0;
  target.releaseVelocityX = 0;
  target.releaseVelocityY = 0;
  return target;
}

export function createAboutNarrativePointerPressureSample() {
  return {
    active: false,
    settling: false,
    x: 0,
    y: 0,
    trailX: 0,
    trailY: 0,
    velocityX: 0,
    velocityY: 0,
    releaseVelocityX: 0,
    releaseVelocityY: 0,
    radiusPx: ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS.radiusPx,
    forcePx: ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS.forcePx,
    variation: ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS.variation,
    strength: 0,
    releaseProgress: 1,
    releaseStrength: 0,
  };
}

/**
 * Stores the pointer's small amount of shared pressure memory. The point pool
 * itself never moves on the CPU; this controller only supplies uniforms to the
 * existing shader and is sampled by the existing About animation frame.
 */
export function createAboutNarrativePointerPressureController({
  initialNowMs = 0,
} = {}) {
  let viewportLeft = 0;
  let viewportTop = 0;
  let viewportWidth = 1;
  let viewportHeight = 1;
  let responsiveSpatialScale = MINIMUM_SPATIAL_SCALE;
  let responsiveForceScale = MINIMUM_FORCE_SCALE;
  let radiusPx = ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS.radiusPx;
  let forcePx = ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS.forcePx;
  let variation = ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS.variation;
  let responseMs = ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS.responseMs;
  let returnMs = ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS.returnMs;
  let pointerType = '';
  let pointerInside = false;
  let directManipulation = false;
  let hadPointer = false;
  let targetX = 0;
  let targetY = 0;
  let currentX = 0;
  let currentY = 0;
  let trailX = 0;
  let trailY = 0;
  let lastPointerSampleMs = 0;
  let lastPointerSampleX = 0;
  let lastPointerSampleY = 0;
  let targetVelocityX = 0;
  let targetVelocityY = 0;
  let pointerVelocityX = 0;
  let pointerVelocityY = 0;
  let releaseVelocityX = 0;
  let releaseVelocityY = 0;
  let pressureStrength = 0;
  let releaseActive = false;
  let releaseProgress = 1;
  let releaseStartedAtMs = 0;
  let releaseStartStrength = 0;
  let wasEligible = false;
  let lastUpdateMs = finiteOr(initialNowMs, 0);

  const updateResponsiveProfile = () => {
    const widthScale = viewportWidth / REFERENCE_VIEWPORT.width;
    const heightScale = viewportHeight / REFERENCE_VIEWPORT.height;
    responsiveSpatialScale = clamp(
      Math.min(widthScale, heightScale),
      MINIMUM_SPATIAL_SCALE,
      1,
    );
    const scaleProgress = (
      responsiveSpatialScale - MINIMUM_SPATIAL_SCALE
    ) / (1 - MINIMUM_SPATIAL_SCALE);
    responsiveForceScale = MINIMUM_FORCE_SCALE
      + ((1 - MINIMUM_FORCE_SCALE) * scaleProgress);
  };

  const resetMotion = () => {
    targetVelocityX = 0;
    targetVelocityY = 0;
    pointerVelocityX = 0;
    pointerVelocityY = 0;
    releaseVelocityX = 0;
    releaseVelocityY = 0;
    pressureStrength = 0;
    releaseActive = false;
    releaseProgress = 1;
    releaseStartedAtMs = 0;
    releaseStartStrength = 0;
    trailX = currentX;
    trailY = currentY;
    wasEligible = false;
  };

  const setViewport = (left, top, width, height) => {
    viewportLeft = finiteOr(left, 0);
    viewportTop = finiteOr(top, 0);
    viewportWidth = Math.max(1, finiteOr(width, 1));
    viewportHeight = Math.max(1, finiteOr(height, 1));
    updateResponsiveProfile();
  };

  const configure = (pointMaterial = {}) => {
    radiusPx = clamp(
      finiteOr(pointMaterial.pointerRadiusPx, ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS.radiusPx),
      20,
      2000,
    );
    forcePx = clamp(
      finiteOr(pointMaterial.pointerForcePx, ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS.forcePx),
      0,
      1000,
    );
    variation = clamp(
      finiteOr(pointMaterial.pointerVariation, ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS.variation),
      0,
      5,
    );
    responseMs = clamp(
      finiteOr(pointMaterial.pointerResponseMs, ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS.responseMs),
      20,
      5000,
    );
    returnMs = clamp(
      finiteOr(pointMaterial.pointerReturnMs, ABOUT_NARRATIVE_POINTER_PRESSURE_DEFAULTS.returnMs),
      80,
      20000,
    );
  };

  const setPointerNdc = (
    x,
    y,
    nextPointerType = 'mouse',
    buttons = 0,
    nowMs = lastUpdateMs,
  ) => {
    pointerType = String(nextPointerType || '');
    pointerInside = true;
    directManipulation = Number(buttons) !== 0;
    targetX = clamp(finiteOr(x, 0), -1, 1);
    targetY = clamp(finiteOr(y, 0), -1, 1);
    const sampleNowMs = finiteOr(nowMs, lastUpdateMs);
    const sampleAgeMs = sampleNowMs - lastPointerSampleMs;
    if (hadPointer && sampleAgeMs > 0 && sampleAgeMs <= POINTER_SAMPLE_EXPIRY_MS * 2) {
      const sampleSeconds = Math.max(1 / 240, sampleAgeMs / 1000);
      const rawVelocityX = ((targetX - lastPointerSampleX) * 0.5 * viewportWidth) / sampleSeconds;
      const rawVelocityY = ((targetY - lastPointerSampleY) * 0.5 * viewportHeight) / sampleSeconds;
      const rawSpeed = Math.hypot(rawVelocityX, rawVelocityY);
      const velocityScale = rawSpeed > MAXIMUM_POINTER_SPEED_PX_PER_SECOND
        ? MAXIMUM_POINTER_SPEED_PX_PER_SECOND / rawSpeed
        : 1;
      targetVelocityX = rawVelocityX * velocityScale;
      targetVelocityY = rawVelocityY * velocityScale;
    } else {
      targetVelocityX = 0;
      targetVelocityY = 0;
    }
    lastPointerSampleMs = sampleNowMs;
    lastPointerSampleX = targetX;
    lastPointerSampleY = targetY;
    if (!hadPointer) {
      currentX = targetX;
      currentY = targetY;
      trailX = targetX;
      trailY = targetY;
      hadPointer = true;
    }
  };

  const setPointerFromClient = (
    clientX,
    clientY,
    nextPointerType = 'mouse',
    buttons = 0,
    nowMs = lastUpdateMs,
  ) => {
    const x = finiteOr(clientX, viewportLeft - 1);
    const y = finiteOr(clientY, viewportTop - 1);
    const inside = x >= viewportLeft
      && x <= viewportLeft + viewportWidth
      && y >= viewportTop
      && y <= viewportTop + viewportHeight;
    if (!inside) {
      pointerInside = false;
      directManipulation = false;
      targetVelocityX = 0;
      targetVelocityY = 0;
      return false;
    }
    setPointerNdc(
      (((x - viewportLeft) / viewportWidth) * 2) - 1,
      1 - (((y - viewportTop) / viewportHeight) * 2),
      nextPointerType,
      buttons,
      nowMs,
    );
    return true;
  };

  const setPointerOutside = (nextPointerType = pointerType) => {
    pointerType = String(nextPointerType || pointerType);
    pointerInside = false;
    directManipulation = false;
    targetVelocityX = 0;
    targetVelocityY = 0;
  };

  const setDirectManipulation = (active) => {
    directManipulation = Boolean(active);
  };

  const sampleInto = (
    target,
    nowMs,
    reducedMotion = false,
    materialVisible = true,
    documentHidden = false,
    finePointerAvailable = true,
  ) => {
    const sampleNowMs = finiteOr(nowMs, lastUpdateMs);
    const deltaSeconds = clamp((sampleNowMs - lastUpdateMs) / 1000, 0, 0.1);
    lastUpdateMs = sampleNowMs;

    currentX = damp(currentX, targetX, deltaSeconds, responseMs);
    currentY = damp(currentY, targetY, deltaSeconds, responseMs);
    trailX = damp(trailX, currentX, deltaSeconds, Math.max(80, returnMs));
    trailY = damp(trailY, currentY, deltaSeconds, Math.max(80, returnMs));
    const velocitySampleIsFresh = pointerInside
      && sampleNowMs - lastPointerSampleMs <= POINTER_SAMPLE_EXPIRY_MS;
    pointerVelocityX = damp(
      pointerVelocityX,
      velocitySampleIsFresh ? targetVelocityX : 0,
      deltaSeconds,
      VELOCITY_RESPONSE_MS,
    );
    pointerVelocityY = damp(
      pointerVelocityY,
      velocitySampleIsFresh ? targetVelocityY : 0,
      deltaSeconds,
      VELOCITY_RESPONSE_MS,
    );

    const hardDisabled = documentHidden
      || reducedMotion
      || !materialVisible
      || !finePointerAvailable
      || directManipulation
      || (pointerInside && pointerType !== 'mouse');
    const eligible = !hardDisabled
      && pointerInside
      && pointerType === 'mouse';

    if (hardDisabled) {
      resetMotion();
    } else if (eligible) {
      releaseActive = false;
      releaseProgress = 0;
      releaseStartStrength = 0;
      pressureStrength = damp(pressureStrength, 1, deltaSeconds, responseMs);
      if (pressureStrength > 0.9995) pressureStrength = 1;
    } else {
      if (wasEligible) {
        releaseActive = true;
        releaseProgress = 0;
        releaseStartedAtMs = sampleNowMs;
        releaseStartStrength = pressureStrength;
        releaseVelocityX = pointerVelocityX;
        releaseVelocityY = pointerVelocityY;
      }
      if (releaseActive) {
        releaseProgress = clamp(
          (sampleNowMs - releaseStartedAtMs) / Math.max(1, returnMs),
          0,
          1,
        );
        pressureStrength = releaseStartStrength * (1 - smoothstep01(releaseProgress));
        if (releaseProgress >= 1) resetMotion();
      } else {
        pressureStrength = 0;
        releaseProgress = 1;
      }
    }
    wasEligible = eligible;

    target.active = eligible;
    target.settling = releaseActive;
    target.x = currentX;
    target.y = currentY;
    target.trailX = trailX;
    target.trailY = trailY;
    target.velocityX = pointerVelocityX;
    target.velocityY = pointerVelocityY;
    target.releaseVelocityX = releaseVelocityX;
    target.releaseVelocityY = releaseVelocityY;
    target.radiusPx = radiusPx * responsiveSpatialScale;
    target.forcePx = forcePx * responsiveForceScale;
    target.variation = variation;
    target.strength = pressureStrength;
    target.releaseProgress = releaseProgress;
    target.releaseStrength = releaseStartStrength;
    return target;
  };

  const clear = (target) => {
    pointerInside = false;
    directManipulation = false;
    resetMotion();
    return target ? clearSample(target) : undefined;
  };

  const getSnapshot = () => Object.freeze({
    active: wasEligible,
    settling: releaseActive,
    pointerInside,
    pointerType,
    directManipulation,
    strength: pressureStrength,
    releaseProgress,
    effectiveRadiusPx: radiusPx * responsiveSpatialScale,
    effectiveForcePx: forcePx * responsiveForceScale,
    responsiveSpatialScale,
    exactRest: pressureStrength === 0 && releaseStartStrength === 0,
  });

  updateResponsiveProfile();
  return Object.freeze({
    clear,
    configure,
    getSnapshot,
    sampleInto,
    setDirectManipulation,
    setPointerFromClient,
    setPointerNdc,
    setPointerOutside,
    setViewport,
  });
}
