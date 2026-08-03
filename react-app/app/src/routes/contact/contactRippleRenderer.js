import {
  CONTACT_RIPPLE_CONTROL_COUNT,
  DEFAULT_CONTACT_RIPPLE_CONFIG,
  normalizeContactRippleConfig,
} from './contactRippleConfig.js';
import { resolveMobileSimulationBodyScale } from '../../lib/mobileSimulationSizing.js';
import {
  resolveSimulationColorDistribution,
  resolveSimulationPaletteColors,
} from '../../palette/simulationPaletteContract.js';
import { createSimulationMaterialSequence } from '../../palette/simulationPaletteController.js';
import {
  getTransitionPhase,
  TRANSITION_PHASES,
} from '../../lib/transition-phase.js';
import { createRouteMaterialEntranceController } from '../../lib/motion/route-material-entrance.js';

const TAU = Math.PI * 2;
const REDUCED_BURST_MS = 620;
const MAX_DPR = 1.5;
const IDLE_ROTATION_SPEED = 0.045;
const MAX_ACTIVE_BURSTS = 8;
const BURST_RING_ALPHA_PEAK = 1;
const KALEIDOSCOPE_DOT_SIZE_VH = 0.6;
const KALEIDOSCOPE_DOT_AREA_MUL = 1.15;
const KALEIDOSCOPE_DOT_SIZE_VARIANCE = 0.38;
const CONFIRMATION_PALETTE_INDEX = 7;
const COLOR_WAVE_PEAK = 0.94;
let rendererInstanceId = 0;

function shouldPauseForRouteTransition() {
  const phase = getTransitionPhase();
  return phase === TRANSITION_PHASES.ROUTE_OUT
    || phase === TRANSITION_PHASES.ROUTE_LOADING;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - (2 * t));
}

function lerp(a, b, t) {
  return a + ((b - a) * t);
}

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '').trim());
}

function getDiagnostics() {
  if (typeof window === 'undefined') return null;
  if (!window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__) {
    window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__ = {
      activeInstances: 0,
      createdInstances: 0,
      destroyedInstances: 0,
      totalBursts: 0,
      lastState: 'unmounted',
    };
  }
  return window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__;
}

function createBallSprite(color) {
  const size = 64;
  const center = size * 0.5;
  const radius = 27;
  const sprite = document.createElement('canvas');
  sprite.width = size;
  sprite.height = size;
  const context = sprite.getContext('2d');
  if (!context) return sprite;

  context.fillStyle = color;
  context.beginPath();
  context.arc(center, center, radius, 0, TAU);
  context.fill();
  return sprite;
}

function resolvePalette(theme) {
  const palette = Array.isArray(theme?.palette) ? theme.palette.filter(isHexColor) : [];
  return resolveSimulationPaletteColors(palette);
}

function resolveMaterialSequence(theme, paletteLength) {
  const snapshot = theme?.paletteSnapshot || {
    colors: resolvePalette(theme),
    distribution: resolveSimulationColorDistribution(theme?.colorDistribution, paletteLength),
  };
  return createSimulationMaterialSequence(100, {}, snapshot);
}

function createSpriteSet(theme) {
  const palette = resolvePalette(theme);
  const confirmationColor = palette[CONFIRMATION_PALETTE_INDEX]
    || palette[palette.length - 1]
    || '#ffffff';
  return {
    key: getThemeKey(theme, palette),
    palette,
    sequence: resolveMaterialSequence(theme, palette.length),
    sprites: palette.map(createBallSprite),
    confirmationColor,
    confirmationSprite: createBallSprite(confirmationColor),
  };
}

function getThemeKey(theme, resolvedPalette = resolvePalette(theme)) {
  const distribution = resolveSimulationColorDistribution(
    theme?.colorDistribution,
    resolvedPalette.length,
  );
  const distributionKey = distribution
    .map((role) => `${Number(role?.colorIndex) || 0}:${Number(role?.weight) || 0}`)
    .join(',');
  return `${resolvedPalette.join('|')}::${distributionKey}`;
}

function getQuietZone(canvas, element) {
  if (!element) return null;
  const canvasRect = canvas.getBoundingClientRect();
  const contentRect = element.getBoundingClientRect();
  if (contentRect.width <= 0 || contentRect.height <= 0) return null;

  const horizontalPad = clamp(canvasRect.width * 0.035, 24, 62);
  const verticalPad = clamp(canvasRect.height * 0.035, 24, 52);
  return {
    centerX: contentRect.left - canvasRect.left + (contentRect.width * 0.5),
    centerY: contentRect.top - canvasRect.top + (contentRect.height * 0.5),
    halfWidth: (contentRect.width * 0.5) + horizontalPad,
    halfHeight: (contentRect.height * 0.5) + verticalPad,
    feather: clamp(Math.min(canvasRect.width, canvasRect.height) * 0.09, 38, 86),
  };
}

export function createContactRippleRenderer({
  canvas,
  stage,
  getTheme,
  getQuietZoneElement,
  getConfig,
  reducedMotion = false,
}) {
  const context = canvas?.getContext('2d', { alpha: true });
  if (!canvas || !stage || !context) {
    return {
      prepareRouteEntrance() { return false; },
      enterRoute() { return Promise.resolve(false); },
      exitRoute() { return Promise.resolve(false); },
      settleRouteEntrance() { return false; },
      start() {},
      burst() {},
      updateConfig() {},
      destroy() {},
    };
  }

  const instanceId = ++rendererInstanceId;
  const diagnostics = getDiagnostics();
  if (diagnostics) {
    diagnostics.activeInstances += 1;
    diagnostics.createdInstances += 1;
    diagnostics.lastState = 'created';
  }

  let destroyed = false;
  let frameId = 0;
  let startedAt = 0;
  let burstStartedAt = -Infinity;
  let activeBursts = [];
  let burstCount = 0;
  let maxConcurrentBursts = 0;
  let needsRender = true;
  let config = normalizeContactRippleConfig(getConfig?.() || DEFAULT_CONTACT_RIPPLE_CONFIG);
  let metrics = {
    width: 1,
    height: 1,
    centerX: 0.5,
    centerY: 0.5,
    maxRadius: 1,
    bodyRadius: config.minBodyRadius,
    coreFadeStart: config.minBodyRadius * 4.25,
    coreFadeEnd: config.minBodyRadius * 12,
    dpr: 1,
  };
  let spriteSet = createSpriteSet(getTheme?.());
  let spriteBuildCount = 1;
  let bodyBuildCount = 0;
  let bodies = [];
  let layoutKey = '';
  let lastMotionFrameAt = 0;
  let driftRotation = 0;
  let routeEntrance = null;

  stage.dataset.contactRippleState = reducedMotion ? 'reduced-idle' : 'idle';
  stage.dataset.contactRippleBurstCount = '0';
  stage.dataset.contactRippleActiveBurstCount = '0';
  stage.dataset.contactRippleMaxActiveBursts = '0';
  stage.dataset.contactRippleInstance = String(instanceId);
  stage.dataset.contactRippleBurstMode = 'additive-wavefronts';
  stage.dataset.contactRippleBurstColor = spriteSet.confirmationColor;
  stage.dataset.contactRippleBurstOrigin = 'center';
  stage.dataset.contactRipplePointerMode = reducedMotion ? 'disabled-reduced-motion' : 'autonomous-drift';
  stage.dataset.contactRippleRingDirections = 'alternating';
  stage.dataset.contactRipplePointerMaxDegrees = '0.00';
  if (diagnostics) {
    diagnostics.pointerActive = false;
    diagnostics.pointerRotation = 0;
    diagnostics.pointerTarget = 0;
    diagnostics.pointerSpeedBoost = 0;
    diagnostics.driftRotation = 0;
  }

  function setState(nextState) {
    if (stage.dataset.contactRippleState === nextState) return;
    stage.dataset.contactRippleState = nextState;
    if (diagnostics) diagnostics.lastState = nextState;
  }

  function getIdleAlphaRange() {
    const inner = clamp(config.innerRingAlpha, 0, 1);
    const outer = clamp(config.outerRingAlpha, inner, 1);
    return { inner, outer };
  }

  function getKaleidoscopeRadiusMetrics(width, height) {
    const base = Math.max(
      1,
      (KALEIDOSCOPE_DOT_SIZE_VH * 0.01) * height * Math.sqrt(KALEIDOSCOPE_DOT_AREA_MUL),
    );
    const variance = clamp(KALEIDOSCOPE_DOT_SIZE_VARIANCE * 0.5, 0, 0.2);
    const mobileBodyScale = resolveMobileSimulationBodyScale(
      getTheme?.()?.mobileSimulationBodyScale,
      { width, height },
    );
    return {
      base: clamp(base, config.minBodyRadius, config.maxBodyRadius) * mobileBodyScale,
      min: clamp(base * (1 - variance), config.minBodyRadius, config.maxBodyRadius) * mobileBodyScale,
      max: clamp(base * (1 + variance), config.minBodyRadius, config.maxBodyRadius) * mobileBodyScale,
      variance,
      mobileBodyScale,
    };
  }

  function syncTheme() {
    const theme = getTheme?.();
    const nextPalette = resolvePalette(theme);
    stage.dataset.contactRippleSurface = String(theme?.active || '');
    stage.dataset.contactRipplePaletteId = String(theme?.paletteId || '');
    stage.dataset.simulationPaletteGeneration = String(theme?.paletteGeneration || '');
    stage.dataset.contactRipplePalette = nextPalette.join(',');
    stage.dataset.contactRippleBurstColor = nextPalette[CONFIRMATION_PALETTE_INDEX]
      || nextPalette[nextPalette.length - 1]
      || '';
    const nextKey = getThemeKey(theme, nextPalette);
    if (diagnostics) {
      diagnostics.paletteId = String(theme?.paletteId || '');
      diagnostics.paletteGeneration = Number(theme?.paletteGeneration || 0);
      diagnostics.colors = nextPalette.slice();
      diagnostics.distribution = (theme?.paletteSnapshot?.distribution || []).map((role) => ({
        roleId: role.roleId,
        label: role.label,
        colorIndex: role.colorIndex,
        weight: role.weight,
      }));
    }
    if (nextKey === spriteSet.key) return;
    spriteSet = createSpriteSet(theme);
    spriteBuildCount += 1;
    const roleById = new Map(
      (theme?.paletteSnapshot?.distribution || []).map((role) => [role.roleId, role]),
    );
    for (let index = 0; index < bodies.length; index += 1) {
      const body = bodies[index];
      const role = roleById.get(body.roleId)
        || theme?.paletteSnapshot?.distribution?.[body.distributionIndex];
      if (role) body.colorIndex = role.colorIndex;
    }
    stage.dataset.contactRipplePaletteSize = String(spriteSet.palette.length);
    if (diagnostics) diagnostics.spriteBuildCount = spriteBuildCount;
    needsRender = true;
  }

  function syncMetrics() {
    const rect = canvas.getBoundingClientRect();
    const width = Math.max(1, rect.width);
    const height = Math.max(1, rect.height);
    const dpr = clamp(window.devicePixelRatio || 1, 1, MAX_DPR);
    const bufferWidth = Math.max(1, Math.round(width * dpr));
    const bufferHeight = Math.max(1, Math.round(height * dpr));
    const resized = canvas.width !== bufferWidth || canvas.height !== bufferHeight;

    if (resized) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
    }
    context.setTransform(dpr, 0, 0, dpr, 0, 0);

    const radiusMetrics = getKaleidoscopeRadiusMetrics(width, height);
    const bodyRadius = radiusMetrics.base;
    const contentZone = getQuietZone(canvas, getQuietZoneElement?.());
    const contentCoreRadius = contentZone
      ? (Math.max(contentZone.halfWidth, contentZone.halfHeight) * 0.96)
        + (bodyRadius * config.ringGapScale * 0.75)
      : Math.min(width, height) * 0.3;
    const coreFadeEnd = clamp(contentCoreRadius, bodyRadius * 18, bodyRadius * 38);
    metrics = {
      width,
      height,
      centerX: width * 0.5,
      centerY: height * 0.5,
      maxRadius: Math.hypot(width * 0.5, height * 0.5) + (config.maxBodyRadius * 2),
      bodyRadius,
      minBodyRadius: radiusMetrics.min,
      maxBodyRadius: radiusMetrics.max,
      sizeVariance: radiusMetrics.variance,
      coreFadeStart: Math.max(bodyRadius * 4.25, coreFadeEnd - (bodyRadius * config.ringGapScale * 1.25)),
      coreFadeEnd,
      dpr,
      mobileSimulationBodyScale: radiusMetrics.mobileBodyScale,
    };

    canvas.dataset.contactRippleBuffer = `${bufferWidth}x${bufferHeight}`;
    canvas.dataset.contactRippleDpr = dpr.toFixed(2);
    stage.dataset.contactRipplePaletteSize = String(spriteSet.palette.length);
    stage.dataset.contactRippleInnerAlpha = config.innerRingAlpha.toFixed(2);
    stage.dataset.contactRippleOuterAlpha = config.outerRingAlpha.toFixed(2);
    const idleAlphaRange = getIdleAlphaRange();
    stage.dataset.contactRippleIdleInnerAlpha = idleAlphaRange.inner.toFixed(2);
    stage.dataset.contactRippleIdleOuterAlpha = idleAlphaRange.outer.toFixed(2);
    stage.dataset.contactRippleBurstPeakAlpha = BURST_RING_ALPHA_PEAK.toFixed(2);
    stage.dataset.contactRippleCoreFadeRadius = metrics.coreFadeEnd.toFixed(2);
    stage.dataset.mobileSimulationBodyScale = metrics.mobileSimulationBodyScale.toFixed(2);
    stage.dataset.contactRippleBurstRelease = 'smoothstep-tail';
    stage.dataset.contactRippleBallFinish = 'flat-fill';
    stage.dataset.contactRippleConfigControls = String(CONTACT_RIPPLE_CONTROL_COUNT);
    stage.dataset.contactRippleInnerRingsRemoved = String(config.innerRingSkipCount);
    const nextLayoutKey = [
      `${Math.round(width)}x${Math.round(height)}`,
      metrics.bodyRadius.toFixed(2),
      config.bodyGapScale.toFixed(2),
      config.ringGapScale.toFixed(2),
      config.innerRingSkipCount,
    ].join(':');
    if (nextLayoutKey !== layoutKey) {
      layoutKey = nextLayoutKey;
      rebuildBodies();
    }
    needsRender = needsRender || resized;
  }

  function getBodyMaterial(ringIndex, beadIndex, beadCount) {
    const segmentCount = Math.min(12, Math.max(6, Math.round(beadCount / 9)));
    const segment = Math.floor((beadIndex / Math.max(1, beadCount)) * segmentCount);
    const sequenceIndex = (segment + (ringIndex * 3)) % spriteSet.sequence.length;
    return spriteSet.sequence[sequenceIndex];
  }

  function getBodyRadius(ringIndex, beadIndex) {
    const seed = Math.sin((ringIndex * 127.1) + (beadIndex * 311.7)) * 43758.5453123;
    const t = seed - Math.floor(seed);
    return lerp(metrics.minBodyRadius, metrics.maxBodyRadius, t);
  }

  function rebuildBodies() {
    bodyBuildCount += 1;
    const nextBodies = [];
    const bodyRadius = metrics.bodyRadius;
    const spacingRadius = metrics.maxBodyRadius || bodyRadius;
    const ringGap = spacingRadius * config.ringGapScale;
    const firstRingRadius = (spacingRadius * 4.25) + (ringGap * config.innerRingSkipCount);
    let ringIndex = config.innerRingSkipCount;

    for (let ringRadius = firstRingRadius; ringRadius <= metrics.maxRadius; ringRadius += ringGap) {
      const circumference = TAU * ringRadius;
      const minimumSpacing = spacingRadius * 2 * config.bodyGapScale;
      const beadCount = clamp(Math.floor(circumference / minimumSpacing), 6, 164);
      const angleOffset = (ringIndex % 2 === 0 ? 0 : Math.PI / beadCount) + (ringIndex * 0.071);

      for (let beadIndex = 0; beadIndex < beadCount; beadIndex += 1) {
        const angle = angleOffset + ((beadIndex / beadCount) * TAU);
        const material = getBodyMaterial(ringIndex, beadIndex, beadCount);
        nextBodies.push({
          angle,
          baseRadius: ringRadius,
          ringIndex,
          ringDirection: ringIndex % 2 === 0 ? 1 : -1,
          roleId: material?.roleId || '',
          distributionIndex: material?.distributionIndex || 0,
          colorIndex: material?.colorIndex || 0,
          radius: getBodyRadius(ringIndex, beadIndex),
          routeEntranceScale: 1,
          phase: ringIndex * 0.12,
        });
      }
      ringIndex += 1;
    }

    bodies = nextBodies;
    // A resize or live configuration save can rebuild the field while its
    // route entrance is running. Adopt the new bodies at the current timeline
    // position before this frame paints, so they never appear at full scale.
    routeEntrance?.refreshTargets({ requestPaint: false });
    stage.dataset.contactRippleBodyCount = String(bodies.length);
    stage.dataset.contactRippleRingCount = String(
      Math.max(0, ringIndex - config.innerRingSkipCount),
    );
    stage.dataset.contactRippleBodyRadius = bodyRadius.toFixed(2);
    if (diagnostics) {
      diagnostics.bodyCount = bodies.length;
      diagnostics.ringCount = Math.max(0, ringIndex - config.innerRingSkipCount);
      diagnostics.rendererInstanceId = instanceId;
      diagnostics.bodyBuildCount = bodyBuildCount;
      diagnostics.spriteBuildCount = spriteBuildCount;
    }
  }

  function drawBall(x, y, radius, alpha, colorIndex, waveMix = 0) {
    if (alpha <= 0.003 || radius <= 0.1) return;
    const sprite = spriteSet.sprites[colorIndex % spriteSet.sprites.length];
    if (!sprite) return;
    const diameter = radius * 2.36;
    context.globalAlpha = clamp(alpha, 0, 1);
    context.drawImage(sprite, x - (diameter * 0.5), y - (diameter * 0.5), diameter, diameter);
    if (waveMix > 0.003 && spriteSet.confirmationSprite) {
      context.globalAlpha = clamp(waveMix * alpha, 0, 1);
      context.drawImage(spriteSet.confirmationSprite, x - (diameter * 0.5), y - (diameter * 0.5), diameter, diameter);
    }
  }

  function getBurstEnergy(distanceFromOrigin, progress, maxDistance) {
    if (progress < 0 || progress >= 1) return 0;
    const frontRadius = Math.pow(progress, 0.72) * maxDistance * config.burstTravelScale;
    const frontWidth = clamp((metrics.maxBodyRadius || metrics.bodyRadius) * 7.5, 34, 64);
    let energy = 0;

    for (let frontIndex = 0; frontIndex < config.burstFrontCount; frontIndex += 1) {
      const echoRadius = frontRadius - (frontIndex * frontWidth * 1.18);
      const distance = distanceFromOrigin - echoRadius;
      const width = frontWidth * (1 + (frontIndex * 0.18));
      const frontEnergy = Math.exp(-0.5 * ((distance / width) ** 2));
      energy += frontEnergy * (1 - (frontIndex * 0.22));
    }

    const releaseProgress = (progress - config.burstReleaseStart) / (1 - config.burstReleaseStart);
    const release = 1 - smoothstep(releaseProgress);
    return clamp(energy * release, 0, 1.35);
  }

  function syncActiveBursts(now, durationMs) {
    activeBursts = activeBursts.filter((started) => {
      const elapsed = now - started.startedAt;
      return elapsed >= 0 && elapsed < durationMs;
    });
    const activeCount = activeBursts.length;
    if (activeCount > maxConcurrentBursts) maxConcurrentBursts = activeCount;
    stage.dataset.contactRippleActiveBurstCount = String(activeCount);
    stage.dataset.contactRippleMaxActiveBursts = String(maxConcurrentBursts);
    if (diagnostics) {
      diagnostics.activeBurstCount = activeCount;
      diagnostics.maxConcurrentBursts = maxConcurrentBursts;
    }
    return activeCount > 0;
  }

  function getBurstField(x, y, now) {
    if (activeBursts.length === 0) {
      return {
        active: false,
        energy: 0,
        radialSignal: 0,
        tangentialSignal: 0,
        colorSignal: 0,
        directionX: 0,
        directionY: 0,
      };
    }

    let energySum = 0;
    let radialSignal = 0;
    let tangentialSignal = 0;
    let colorSignal = 0;
    let directionX = 0;
    let directionY = 0;
    for (const started of activeBursts) {
      const progress = (now - started.startedAt) / config.burstDurationMs;
      const dx = x - started.x;
      const dy = y - started.y;
      const distance = Math.hypot(dx, dy);
      const energy = getBurstEnergy(distance, progress, started.maxDistance);
      if (energy <= 0) continue;
      const safeDistance = Math.max(1, distance);
      const ux = dx / safeDistance;
      const uy = dy / safeDistance;
      const reboundPhase = Math.sin((progress * TAU * 1.8) - (distance * 0.018));
      energySum += energy;
      radialSignal += energy * (0.78 + (reboundPhase * 0.22));
      tangentialSignal += energy * Math.sin((Math.atan2(dy, dx) * 5) + (progress * TAU));
      colorSignal += energy * (1 - smoothstep(progress * 0.72));
      directionX += ux * energy;
      directionY += uy * energy;
    }

    const directionLength = Math.hypot(directionX, directionY);
    return {
      active: true,
      energy: clamp(energySum, 0, 1.85),
      radialSignal: clamp(radialSignal, 0, 1.85),
      tangentialSignal: clamp(tangentialSignal, -1.65, 1.65),
      colorSignal: clamp(colorSignal, 0, 1.45),
      directionX: directionLength > 0 ? directionX / directionLength : 0,
      directionY: directionLength > 0 ? directionY / directionLength : 0,
    };
  }

  function getRingAlpha(baseRadius, energy) {
    const fadeSpan = Math.max(1, metrics.coreFadeEnd - metrics.coreFadeStart);
    const coreProgress = smoothstep((baseRadius - metrics.coreFadeStart) / fadeSpan);
    const idleAlphaRange = getIdleAlphaRange();
    const idleAlpha = idleAlphaRange.inner
      + ((idleAlphaRange.outer - idleAlphaRange.inner) * coreProgress);
    const burstLift = clamp(energy * 0.2, 0, 1);
    return idleAlpha + ((BURST_RING_ALPHA_PEAK - idleAlpha) * burstLift);
  }

  function updateRingRotation(now, isReduced) {
    const dt = lastMotionFrameAt
      ? clamp((now - lastMotionFrameAt) / 1000, 1 / 240, 1 / 20)
      : 1 / 60;
    lastMotionFrameAt = now;
    if (!isReduced) driftRotation = (driftRotation + (IDLE_ROTATION_SPEED * dt)) % TAU;
    if (diagnostics) {
      diagnostics.pointerActive = false;
      diagnostics.pointerRotation = 0;
      diagnostics.pointerTarget = 0;
      diagnostics.pointerSpeedBoost = 0;
      diagnostics.driftRotation = driftRotation;
    }
    return driftRotation;
  }

  function drawField(now, reducedEmphasis = null) {
    const elapsed = now - startedAt;
    const isReduced = reducedEmphasis !== null;
    const ringRotation = updateRingRotation(now, isReduced);
    const burstActive = isReduced ? reducedEmphasis > 0 : syncActiveBursts(now, config.burstDurationMs);

    for (let bodyIndex = 0; bodyIndex < bodies.length; bodyIndex += 1) {
      const body = bodies[bodyIndex];
      const idlePhase = ((body.baseRadius / config.idleWaveLength) * TAU)
        - (isReduced ? 0 : elapsed * config.idleWaveSpeed)
        + body.phase;
      const primarySwell = Math.sin(idlePhase);
      const secondarySwell = Math.sin(
        (idlePhase * 0.52) - (isReduced ? 0 : elapsed * config.idleSecondarySpeed) + 1.15,
      );
      const idleWave = (primarySwell * 0.76) + (secondarySwell * 0.24);
      const idleOffset = isReduced ? 0 : idleWave * config.idleDisplacement;
      const ringDepth = clamp(body.baseRadius / metrics.maxRadius, 0, 1);
      const renderedAngle = body.angle
        + (ringRotation * body.ringDirection * (0.58 + (ringDepth * 0.42)));
      const cos = Math.cos(renderedAngle);
      const sin = Math.sin(renderedAngle);
      const baseRadius = body.baseRadius + idleOffset;
      const baseX = metrics.centerX + (cos * baseRadius);
      const baseY = metrics.centerY + (sin * baseRadius);
      const burstField = isReduced
        ? { energy: reducedEmphasis, radialSignal: 0, tangentialSignal: 0, colorSignal: reducedEmphasis }
        : getBurstField(baseX, baseY, now);
      const energy = !isReduced ? burstField.energy : reducedEmphasis;

      const radialKick = isReduced
        ? 0
        : burstField.radialSignal * config.burstDisplacement;
      const tangentialKick = !isReduced && energy > 0
        ? burstField.tangentialSignal * config.burstTwist
        : 0;
      const directionX = burstField.directionX || cos;
      const directionY = burstField.directionY || sin;
      const x = baseX + (directionX * radialKick) - (directionY * tangentialKick);
      const y = baseY + (directionY * radialKick) + (directionX * tangentialKick);
      drawBall(
        x,
        y,
        (body.radius || metrics.bodyRadius) * body.routeEntranceScale,
        getRingAlpha(body.baseRadius, energy),
        body.colorIndex,
        clamp((burstField.colorSignal || 0) * COLOR_WAVE_PEAK, 0, COLOR_WAVE_PEAK),
      );
    }

    return burstActive;
  }

  function drawReduced(now) {
    syncActiveBursts(now, REDUCED_BURST_MS);
    let emphasis = 0;
    for (const started of activeBursts) {
      const progress = clamp((now - started.startedAt) / REDUCED_BURST_MS, 0, 1);
      emphasis += (1 - smoothstep(progress)) * 0.44;
    }
    emphasis = clamp(emphasis, 0, 0.72);
    const burstActive = activeBursts.length > 0;
    drawField(now, emphasis);
    return burstActive;
  }

  function render(now) {
    if (needsRender) {
      syncTheme();
      syncMetrics();
    }
    context.clearRect(0, 0, metrics.width, metrics.height);
    context.globalAlpha = 1;

    let animationActive = true;
    if (reducedMotion) {
      animationActive = drawReduced(now);
      setState(animationActive ? 'reduced-burst' : 'reduced-idle');
    } else {
      const burstActive = drawField(now);
      setState(burstActive ? 'burst' : 'idle');
    }

    context.globalAlpha = 1;
    needsRender = bodies.length === 0;
    return animationActive;
  }

  function requestFrame() {
    if (destroyed || frameId || document.hidden || shouldPauseForRouteTransition()) return;
    frameId = window.requestAnimationFrame(step);
  }

  function step() {
    frameId = 0;
    if (destroyed || document.hidden || shouldPauseForRouteTransition()) {
      if (!destroyed && !document.hidden) setState('paused');
      return;
    }
    const now = performance.now();
    if (!startedAt) startedAt = now;
    const animationActive = render(now);
    if (!reducedMotion || animationActive || needsRender) requestFrame();
  }

  function handleResize() {
    needsRender = true;
    requestFrame();
  }

  function handleVisibilityChange() {
    if (document.hidden) {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      setState('paused');
      return;
    }
    needsRender = true;
    requestFrame();
  }

  function handleRouteTransitionChange() {
    if (shouldPauseForRouteTransition()) {
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      setState('paused');
      return;
    }
    needsRender = true;
    requestFrame();
  }

  routeEntrance = createRouteMaterialEntranceController({
    id: 'contact-ripple-material',
    routeId: 'contact',
    diagnosticRoot: stage,
    getTargets: () => bodies,
    setTargetScale: (body, scale) => {
      body.routeEntranceScale = scale;
    },
    getDelayRatio: (body) => {
      const span = Math.max(1, metrics.maxRadius - metrics.coreFadeEnd);
      return clamp((body.baseRadius - metrics.coreFadeEnd) / span, 0, 1);
    },
    requestRender: () => {
      needsRender = true;
      // The normal loop pauses during route-out. Draw the scale-only exit
      // frames synchronously so the shrinking material remains visible.
      if (shouldPauseForRouteTransition()) render(performance.now());
      else requestFrame();
    },
    getReducedMotion: () => reducedMotion,
  });

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(handleResize)
    : null;
  resizeObserver?.observe(stage);
  const quietZoneElement = getQuietZoneElement?.();
  if (quietZoneElement) resizeObserver?.observe(quietZoneElement);
  window.addEventListener('resize', handleResize, { passive: true });
  document.addEventListener('visibilitychange', handleVisibilityChange);
  const transitionObserver = typeof MutationObserver === 'function'
    ? new MutationObserver(handleRouteTransitionChange)
    : null;
  transitionObserver?.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-abs-transition-phase'],
  });

  return {
    prepareRouteEntrance(options = {}) {
      if (destroyed) return false;
      syncTheme();
      syncMetrics();
      return routeEntrance.prepare(options);
    },
    enterRoute(options = {}) {
      if (destroyed) return Promise.resolve(false);
      return routeEntrance.enter(options);
    },
    exitRoute(options = {}) {
      if (destroyed) return Promise.resolve(false);
      return routeEntrance.exit(options);
    },
    settleRouteEntrance(reason = 'settled') {
      if (destroyed) return false;
      return routeEntrance.settle(reason);
    },
    start() {
      if (destroyed) return;
      needsRender = true;
      requestFrame();
    },
    burst(origin = null) {
      if (destroyed) return;
      burstCount += 1;
      burstStartedAt = performance.now();
      const rect = canvas.getBoundingClientRect();
      const originX = Number.isFinite(origin?.x)
        ? clamp(origin.x - rect.left, 0, metrics.width)
        : metrics.centerX;
      const originY = Number.isFinite(origin?.y)
        ? clamp(origin.y - rect.top, 0, metrics.height)
        : metrics.centerY;
      const maxDistance = Math.max(
        Math.hypot(originX, originY),
        Math.hypot(metrics.width - originX, originY),
        Math.hypot(originX, metrics.height - originY),
        Math.hypot(metrics.width - originX, metrics.height - originY),
      ) + ((metrics.maxBodyRadius || metrics.bodyRadius) * 4);
      activeBursts.push({
        startedAt: burstStartedAt,
        x: originX,
        y: originY,
        maxDistance,
      });
      if (activeBursts.length > MAX_ACTIVE_BURSTS) {
        activeBursts = activeBursts.slice(activeBursts.length - MAX_ACTIVE_BURSTS);
      }
      if (activeBursts.length > maxConcurrentBursts) maxConcurrentBursts = activeBursts.length;
      stage.dataset.contactRippleBurstCount = String(burstCount);
      stage.dataset.contactRippleActiveBurstCount = String(activeBursts.length);
      stage.dataset.contactRippleMaxActiveBursts = String(maxConcurrentBursts);
      stage.dataset.contactRippleLastBurstOrigin = `${originX.toFixed(2)},${originY.toFixed(2)}`;
      setState(reducedMotion ? 'reduced-burst' : 'burst');
      if (diagnostics) {
        diagnostics.totalBursts += 1;
        diagnostics.activeBurstCount = activeBursts.length;
        diagnostics.maxConcurrentBursts = maxConcurrentBursts;
      }
      needsRender = true;
      requestFrame();
    },
    updateConfig(nextConfig) {
      if (destroyed) return;
      config = normalizeContactRippleConfig(nextConfig);
      layoutKey = '';
      needsRender = true;
      requestFrame();
    },
    destroy() {
      if (destroyed) return;
      routeEntrance.destroy({ settleTargets: false });
      destroyed = true;
      activeBursts = [];
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      resizeObserver?.disconnect();
      transitionObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      setState('destroyed');
      if (diagnostics) {
        diagnostics.activeInstances = Math.max(0, diagnostics.activeInstances - 1);
        diagnostics.destroyedInstances += 1;
        diagnostics.lastState = 'destroyed';
        diagnostics.pointerActive = false;
        diagnostics.pointerRotation = 0;
        diagnostics.pointerTarget = 0;
        diagnostics.pointerSpeedBoost = 0;
        diagnostics.activeBurstCount = 0;
      }
    },
  };
}
