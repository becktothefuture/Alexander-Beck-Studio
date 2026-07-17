import {
  CONTACT_RIPPLE_CONTROL_COUNT,
  DEFAULT_CONTACT_RIPPLE_CONFIG,
  normalizeContactRippleConfig,
} from "/src/routes/contact/contactRippleConfig.js";

const TAU = Math.PI * 2;
const REDUCED_BURST_MS = 620;
const MAX_DPR = 1.5;
const IDLE_ROTATION_SPEED = 0.045;
const MAX_ACTIVE_BURSTS = 8;
const BURST_RING_ALPHA_PEAK = 1;
const KALEIDOSCOPE_DOT_SIZE_VH = 0.6;
const KALEIDOSCOPE_DOT_AREA_MUL = 1.15;
const KALEIDOSCOPE_DOT_SIZE_VARIANCE = 0.38;
const CONFIRMATION_GREEN = '#22c55e';
const COLOR_WAVE_PEAK = 0.94;
const DEFAULT_PALETTE = ['#a7afb0', '#c6cecf', '#f5f8f6', '#00a5a0', '#031210', '#d7ff2f', '#2c96ff', '#ff7e4a'];
const DEFAULT_DISTRIBUTION = [
  { colorIndex: 0, weight: 31 },
  { colorIndex: 3, weight: 13 },
  { colorIndex: 2, weight: 16 },
  { colorIndex: 6, weight: 20 },
  { colorIndex: 7, weight: 10 },
  { colorIndex: 5, weight: 10 },
];

let rendererInstanceId = 0;

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
  const palette = Array.isArray(theme?.palette)
    ? theme.palette.filter(isHexColor)
    : [];
  return palette.length ? palette : DEFAULT_PALETTE;
}

function resolveColorSequence(theme, paletteLength) {
  const distribution = Array.isArray(theme?.colorDistribution)
    ? theme.colorDistribution
    : DEFAULT_DISTRIBUTION;
  const sequence = [];

  for (const role of distribution) {
    const colorIndex = Number(role?.colorIndex);
    if (!Number.isInteger(colorIndex) || colorIndex < 0 || colorIndex >= paletteLength) continue;
    const repeats = Math.round(clamp(Number(role?.weight) || 10, 5, 40) / 8);
    for (let index = 0; index < repeats; index += 1) sequence.push(colorIndex);
  }

  if (sequence.length) return sequence;
  return Array.from({ length: paletteLength }, (_, index) => index);
}

function createSpriteSet(theme) {
  const palette = resolvePalette(theme);
  return {
    key: getThemeKey(theme, palette),
    palette,
    sequence: resolveColorSequence(theme, palette.length),
    sprites: palette.map(createBallSprite),
    confirmationSprite: createBallSprite(CONFIRMATION_GREEN),
  };
}

function getThemeKey(theme, resolvedPalette = resolvePalette(theme)) {
  const distribution = Array.isArray(theme?.colorDistribution)
    ? theme.colorDistribution
    : DEFAULT_DISTRIBUTION;
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
  let bodies = [];
  let layoutKey = '';
  let lastMotionFrameAt = 0;
  let driftRotation = 0;

  stage.dataset.contactRippleState = reducedMotion ? 'reduced-idle' : 'idle';
  stage.dataset.contactRippleBurstCount = '0';
  stage.dataset.contactRippleActiveBurstCount = '0';
  stage.dataset.contactRippleMaxActiveBursts = '0';
  stage.dataset.contactRippleInstance = String(instanceId);
  stage.dataset.contactRippleBurstMode = 'additive-wavefronts';
  stage.dataset.contactRippleBurstColor = CONFIRMATION_GREEN;
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

  function getKaleidoscopeRadiusMetrics(height) {
    const base = Math.max(
      1,
      (KALEIDOSCOPE_DOT_SIZE_VH * 0.01) * height * Math.sqrt(KALEIDOSCOPE_DOT_AREA_MUL),
    );
    const variance = clamp(KALEIDOSCOPE_DOT_SIZE_VARIANCE * 0.5, 0, 0.2);
    return {
      base: clamp(base, config.minBodyRadius, config.maxBodyRadius),
      min: clamp(base * (1 - variance), config.minBodyRadius, config.maxBodyRadius),
      max: clamp(base * (1 + variance), config.minBodyRadius, config.maxBodyRadius),
      variance,
    };
  }

  function syncTheme() {
    const theme = getTheme?.();
    stage.dataset.contactRippleSurface = String(theme?.active || '');
    const nextKey = getThemeKey(theme);
    if (nextKey === spriteSet.key) return;
    spriteSet = createSpriteSet(theme);
    stage.dataset.contactRipplePaletteSize = String(spriteSet.palette.length);
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

    const radiusMetrics = getKaleidoscopeRadiusMetrics(height);
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
      spriteSet.key,
    ].join(':');
    if (nextLayoutKey !== layoutKey) {
      layoutKey = nextLayoutKey;
      rebuildBodies();
    }
    needsRender = needsRender || resized;
  }

  function getBodyColorIndex(ringIndex, beadIndex, beadCount) {
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
        nextBodies.push({
          angle,
          baseRadius: ringRadius,
          ringIndex,
          ringDirection: ringIndex % 2 === 0 ? 1 : -1,
          colorIndex: getBodyColorIndex(ringIndex, beadIndex, beadCount),
          radius: getBodyRadius(ringIndex, beadIndex),
          phase: ringIndex * 0.12,
        });
      }
      ringIndex += 1;
    }

    bodies = nextBodies;
    stage.dataset.contactRippleBodyCount = String(bodies.length);
    stage.dataset.contactRippleBodyRadius = bodyRadius.toFixed(2);
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
        body.radius || metrics.bodyRadius,
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
    if (destroyed || frameId || document.hidden) return;
    frameId = window.requestAnimationFrame(step);
  }

  function step() {
    frameId = 0;
    if (destroyed || document.hidden) return;
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

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(handleResize)
    : null;
  resizeObserver?.observe(stage);
  const quietZoneElement = getQuietZoneElement?.();
  if (quietZoneElement) resizeObserver?.observe(quietZoneElement);
  window.addEventListener('resize', handleResize, { passive: true });
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return {
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
      destroyed = true;
      activeBursts = [];
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      resizeObserver?.disconnect();
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbnRhY3RSaXBwbGVSZW5kZXJlci5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBDT05UQUNUX1JJUFBMRV9DT05UUk9MX0NPVU5ULFxuICBERUZBVUxUX0NPTlRBQ1RfUklQUExFX0NPTkZJRyxcbiAgbm9ybWFsaXplQ29udGFjdFJpcHBsZUNvbmZpZyxcbn0gZnJvbSBcIi9zcmMvcm91dGVzL2NvbnRhY3QvY29udGFjdFJpcHBsZUNvbmZpZy5qc1wiO1xuXG5jb25zdCBUQVUgPSBNYXRoLlBJICogMjtcbmNvbnN0IFJFRFVDRURfQlVSU1RfTVMgPSA2MjA7XG5jb25zdCBNQVhfRFBSID0gMS41O1xuY29uc3QgSURMRV9ST1RBVElPTl9TUEVFRCA9IDAuMDQ1O1xuY29uc3QgTUFYX0FDVElWRV9CVVJTVFMgPSA4O1xuY29uc3QgQlVSU1RfUklOR19BTFBIQV9QRUFLID0gMTtcbmNvbnN0IEtBTEVJRE9TQ09QRV9ET1RfU0laRV9WSCA9IDAuNjtcbmNvbnN0IEtBTEVJRE9TQ09QRV9ET1RfQVJFQV9NVUwgPSAxLjE1O1xuY29uc3QgS0FMRUlET1NDT1BFX0RPVF9TSVpFX1ZBUklBTkNFID0gMC4zODtcbmNvbnN0IENPTkZJUk1BVElPTl9HUkVFTiA9ICcjMjJjNTVlJztcbmNvbnN0IENPTE9SX1dBVkVfUEVBSyA9IDAuOTQ7XG5jb25zdCBERUZBVUxUX1BBTEVUVEUgPSBbJyNhN2FmYjAnLCAnI2M2Y2VjZicsICcjZjVmOGY2JywgJyMwMGE1YTAnLCAnIzAzMTIxMCcsICcjZDdmZjJmJywgJyMyYzk2ZmYnLCAnI2ZmN2U0YSddO1xuY29uc3QgREVGQVVMVF9ESVNUUklCVVRJT04gPSBbXG4gIHsgY29sb3JJbmRleDogMCwgd2VpZ2h0OiAzMSB9LFxuICB7IGNvbG9ySW5kZXg6IDMsIHdlaWdodDogMTMgfSxcbiAgeyBjb2xvckluZGV4OiAyLCB3ZWlnaHQ6IDE2IH0sXG4gIHsgY29sb3JJbmRleDogNiwgd2VpZ2h0OiAyMCB9LFxuICB7IGNvbG9ySW5kZXg6IDcsIHdlaWdodDogMTAgfSxcbiAgeyBjb2xvckluZGV4OiA1LCB3ZWlnaHQ6IDEwIH0sXG5dO1xuXG5sZXQgcmVuZGVyZXJJbnN0YW5jZUlkID0gMDtcblxuZnVuY3Rpb24gY2xhbXAodmFsdWUsIG1pbiwgbWF4KSB7XG4gIHJldHVybiBNYXRoLm1pbihtYXgsIE1hdGgubWF4KG1pbiwgdmFsdWUpKTtcbn1cblxuZnVuY3Rpb24gc21vb3Roc3RlcCh2YWx1ZSkge1xuICBjb25zdCB0ID0gY2xhbXAodmFsdWUsIDAsIDEpO1xuICByZXR1cm4gdCAqIHQgKiAoMyAtICgyICogdCkpO1xufVxuXG5mdW5jdGlvbiBsZXJwKGEsIGIsIHQpIHtcbiAgcmV0dXJuIGEgKyAoKGIgLSBhKSAqIHQpO1xufVxuXG5mdW5jdGlvbiBpc0hleENvbG9yKHZhbHVlKSB7XG4gIHJldHVybiAvXiNbMC05YS1mXXs2fSQvaS50ZXN0KFN0cmluZyh2YWx1ZSB8fCAnJykudHJpbSgpKTtcbn1cblxuZnVuY3Rpb24gZ2V0RGlhZ25vc3RpY3MoKSB7XG4gIGlmICh0eXBlb2Ygd2luZG93ID09PSAndW5kZWZpbmVkJykgcmV0dXJuIG51bGw7XG4gIGlmICghd2luZG93Ll9fQUJTX0NPTlRBQ1RfUklQUExFX0RJQUdOT1NUSUNTX18pIHtcbiAgICB3aW5kb3cuX19BQlNfQ09OVEFDVF9SSVBQTEVfRElBR05PU1RJQ1NfXyA9IHtcbiAgICAgIGFjdGl2ZUluc3RhbmNlczogMCxcbiAgICAgIGNyZWF0ZWRJbnN0YW5jZXM6IDAsXG4gICAgICBkZXN0cm95ZWRJbnN0YW5jZXM6IDAsXG4gICAgICB0b3RhbEJ1cnN0czogMCxcbiAgICAgIGxhc3RTdGF0ZTogJ3VubW91bnRlZCcsXG4gICAgfTtcbiAgfVxuICByZXR1cm4gd2luZG93Ll9fQUJTX0NPTlRBQ1RfUklQUExFX0RJQUdOT1NUSUNTX187XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUJhbGxTcHJpdGUoY29sb3IpIHtcbiAgY29uc3Qgc2l6ZSA9IDY0O1xuICBjb25zdCBjZW50ZXIgPSBzaXplICogMC41O1xuICBjb25zdCByYWRpdXMgPSAyNztcbiAgY29uc3Qgc3ByaXRlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJyk7XG4gIHNwcml0ZS53aWR0aCA9IHNpemU7XG4gIHNwcml0ZS5oZWlnaHQgPSBzaXplO1xuICBjb25zdCBjb250ZXh0ID0gc3ByaXRlLmdldENvbnRleHQoJzJkJyk7XG4gIGlmICghY29udGV4dCkgcmV0dXJuIHNwcml0ZTtcblxuICBjb250ZXh0LmZpbGxTdHlsZSA9IGNvbG9yO1xuICBjb250ZXh0LmJlZ2luUGF0aCgpO1xuICBjb250ZXh0LmFyYyhjZW50ZXIsIGNlbnRlciwgcmFkaXVzLCAwLCBUQVUpO1xuICBjb250ZXh0LmZpbGwoKTtcbiAgcmV0dXJuIHNwcml0ZTtcbn1cblxuZnVuY3Rpb24gcmVzb2x2ZVBhbGV0dGUodGhlbWUpIHtcbiAgY29uc3QgcGFsZXR0ZSA9IEFycmF5LmlzQXJyYXkodGhlbWU/LnBhbGV0dGUpXG4gICAgPyB0aGVtZS5wYWxldHRlLmZpbHRlcihpc0hleENvbG9yKVxuICAgIDogW107XG4gIHJldHVybiBwYWxldHRlLmxlbmd0aCA/IHBhbGV0dGUgOiBERUZBVUxUX1BBTEVUVEU7XG59XG5cbmZ1bmN0aW9uIHJlc29sdmVDb2xvclNlcXVlbmNlKHRoZW1lLCBwYWxldHRlTGVuZ3RoKSB7XG4gIGNvbnN0IGRpc3RyaWJ1dGlvbiA9IEFycmF5LmlzQXJyYXkodGhlbWU/LmNvbG9yRGlzdHJpYnV0aW9uKVxuICAgID8gdGhlbWUuY29sb3JEaXN0cmlidXRpb25cbiAgICA6IERFRkFVTFRfRElTVFJJQlVUSU9OO1xuICBjb25zdCBzZXF1ZW5jZSA9IFtdO1xuXG4gIGZvciAoY29uc3Qgcm9sZSBvZiBkaXN0cmlidXRpb24pIHtcbiAgICBjb25zdCBjb2xvckluZGV4ID0gTnVtYmVyKHJvbGU/LmNvbG9ySW5kZXgpO1xuICAgIGlmICghTnVtYmVyLmlzSW50ZWdlcihjb2xvckluZGV4KSB8fCBjb2xvckluZGV4IDwgMCB8fCBjb2xvckluZGV4ID49IHBhbGV0dGVMZW5ndGgpIGNvbnRpbnVlO1xuICAgIGNvbnN0IHJlcGVhdHMgPSBNYXRoLnJvdW5kKGNsYW1wKE51bWJlcihyb2xlPy53ZWlnaHQpIHx8IDEwLCA1LCA0MCkgLyA4KTtcbiAgICBmb3IgKGxldCBpbmRleCA9IDA7IGluZGV4IDwgcmVwZWF0czsgaW5kZXggKz0gMSkgc2VxdWVuY2UucHVzaChjb2xvckluZGV4KTtcbiAgfVxuXG4gIGlmIChzZXF1ZW5jZS5sZW5ndGgpIHJldHVybiBzZXF1ZW5jZTtcbiAgcmV0dXJuIEFycmF5LmZyb20oeyBsZW5ndGg6IHBhbGV0dGVMZW5ndGggfSwgKF8sIGluZGV4KSA9PiBpbmRleCk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVNwcml0ZVNldCh0aGVtZSkge1xuICBjb25zdCBwYWxldHRlID0gcmVzb2x2ZVBhbGV0dGUodGhlbWUpO1xuICByZXR1cm4ge1xuICAgIGtleTogZ2V0VGhlbWVLZXkodGhlbWUsIHBhbGV0dGUpLFxuICAgIHBhbGV0dGUsXG4gICAgc2VxdWVuY2U6IHJlc29sdmVDb2xvclNlcXVlbmNlKHRoZW1lLCBwYWxldHRlLmxlbmd0aCksXG4gICAgc3ByaXRlczogcGFsZXR0ZS5tYXAoY3JlYXRlQmFsbFNwcml0ZSksXG4gICAgY29uZmlybWF0aW9uU3ByaXRlOiBjcmVhdGVCYWxsU3ByaXRlKENPTkZJUk1BVElPTl9HUkVFTiksXG4gIH07XG59XG5cbmZ1bmN0aW9uIGdldFRoZW1lS2V5KHRoZW1lLCByZXNvbHZlZFBhbGV0dGUgPSByZXNvbHZlUGFsZXR0ZSh0aGVtZSkpIHtcbiAgY29uc3QgZGlzdHJpYnV0aW9uID0gQXJyYXkuaXNBcnJheSh0aGVtZT8uY29sb3JEaXN0cmlidXRpb24pXG4gICAgPyB0aGVtZS5jb2xvckRpc3RyaWJ1dGlvblxuICAgIDogREVGQVVMVF9ESVNUUklCVVRJT047XG4gIGNvbnN0IGRpc3RyaWJ1dGlvbktleSA9IGRpc3RyaWJ1dGlvblxuICAgIC5tYXAoKHJvbGUpID0+IGAke051bWJlcihyb2xlPy5jb2xvckluZGV4KSB8fCAwfToke051bWJlcihyb2xlPy53ZWlnaHQpIHx8IDB9YClcbiAgICAuam9pbignLCcpO1xuICByZXR1cm4gYCR7cmVzb2x2ZWRQYWxldHRlLmpvaW4oJ3wnKX06OiR7ZGlzdHJpYnV0aW9uS2V5fWA7XG59XG5cbmZ1bmN0aW9uIGdldFF1aWV0Wm9uZShjYW52YXMsIGVsZW1lbnQpIHtcbiAgaWYgKCFlbGVtZW50KSByZXR1cm4gbnVsbDtcbiAgY29uc3QgY2FudmFzUmVjdCA9IGNhbnZhcy5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKTtcbiAgY29uc3QgY29udGVudFJlY3QgPSBlbGVtZW50LmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICBpZiAoY29udGVudFJlY3Qud2lkdGggPD0gMCB8fCBjb250ZW50UmVjdC5oZWlnaHQgPD0gMCkgcmV0dXJuIG51bGw7XG5cbiAgY29uc3QgaG9yaXpvbnRhbFBhZCA9IGNsYW1wKGNhbnZhc1JlY3Qud2lkdGggKiAwLjAzNSwgMjQsIDYyKTtcbiAgY29uc3QgdmVydGljYWxQYWQgPSBjbGFtcChjYW52YXNSZWN0LmhlaWdodCAqIDAuMDM1LCAyNCwgNTIpO1xuICByZXR1cm4ge1xuICAgIGNlbnRlclg6IGNvbnRlbnRSZWN0LmxlZnQgLSBjYW52YXNSZWN0LmxlZnQgKyAoY29udGVudFJlY3Qud2lkdGggKiAwLjUpLFxuICAgIGNlbnRlclk6IGNvbnRlbnRSZWN0LnRvcCAtIGNhbnZhc1JlY3QudG9wICsgKGNvbnRlbnRSZWN0LmhlaWdodCAqIDAuNSksXG4gICAgaGFsZldpZHRoOiAoY29udGVudFJlY3Qud2lkdGggKiAwLjUpICsgaG9yaXpvbnRhbFBhZCxcbiAgICBoYWxmSGVpZ2h0OiAoY29udGVudFJlY3QuaGVpZ2h0ICogMC41KSArIHZlcnRpY2FsUGFkLFxuICAgIGZlYXRoZXI6IGNsYW1wKE1hdGgubWluKGNhbnZhc1JlY3Qud2lkdGgsIGNhbnZhc1JlY3QuaGVpZ2h0KSAqIDAuMDksIDM4LCA4NiksXG4gIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBjcmVhdGVDb250YWN0UmlwcGxlUmVuZGVyZXIoe1xuICBjYW52YXMsXG4gIHN0YWdlLFxuICBnZXRUaGVtZSxcbiAgZ2V0UXVpZXRab25lRWxlbWVudCxcbiAgZ2V0Q29uZmlnLFxuICByZWR1Y2VkTW90aW9uID0gZmFsc2UsXG59KSB7XG4gIGNvbnN0IGNvbnRleHQgPSBjYW52YXM/LmdldENvbnRleHQoJzJkJywgeyBhbHBoYTogdHJ1ZSB9KTtcbiAgaWYgKCFjYW52YXMgfHwgIXN0YWdlIHx8ICFjb250ZXh0KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXJ0KCkge30sXG4gICAgICBidXJzdCgpIHt9LFxuICAgICAgdXBkYXRlQ29uZmlnKCkge30sXG4gICAgICBkZXN0cm95KCkge30sXG4gICAgfTtcbiAgfVxuXG4gIGNvbnN0IGluc3RhbmNlSWQgPSArK3JlbmRlcmVySW5zdGFuY2VJZDtcbiAgY29uc3QgZGlhZ25vc3RpY3MgPSBnZXREaWFnbm9zdGljcygpO1xuICBpZiAoZGlhZ25vc3RpY3MpIHtcbiAgICBkaWFnbm9zdGljcy5hY3RpdmVJbnN0YW5jZXMgKz0gMTtcbiAgICBkaWFnbm9zdGljcy5jcmVhdGVkSW5zdGFuY2VzICs9IDE7XG4gICAgZGlhZ25vc3RpY3MubGFzdFN0YXRlID0gJ2NyZWF0ZWQnO1xuICB9XG5cbiAgbGV0IGRlc3Ryb3llZCA9IGZhbHNlO1xuICBsZXQgZnJhbWVJZCA9IDA7XG4gIGxldCBzdGFydGVkQXQgPSAwO1xuICBsZXQgYnVyc3RTdGFydGVkQXQgPSAtSW5maW5pdHk7XG4gIGxldCBhY3RpdmVCdXJzdHMgPSBbXTtcbiAgbGV0IGJ1cnN0Q291bnQgPSAwO1xuICBsZXQgbWF4Q29uY3VycmVudEJ1cnN0cyA9IDA7XG4gIGxldCBuZWVkc1JlbmRlciA9IHRydWU7XG4gIGxldCBjb25maWcgPSBub3JtYWxpemVDb250YWN0UmlwcGxlQ29uZmlnKGdldENvbmZpZz8uKCkgfHwgREVGQVVMVF9DT05UQUNUX1JJUFBMRV9DT05GSUcpO1xuICBsZXQgbWV0cmljcyA9IHtcbiAgICB3aWR0aDogMSxcbiAgICBoZWlnaHQ6IDEsXG4gICAgY2VudGVyWDogMC41LFxuICAgIGNlbnRlclk6IDAuNSxcbiAgICBtYXhSYWRpdXM6IDEsXG4gICAgYm9keVJhZGl1czogY29uZmlnLm1pbkJvZHlSYWRpdXMsXG4gICAgY29yZUZhZGVTdGFydDogY29uZmlnLm1pbkJvZHlSYWRpdXMgKiA0LjI1LFxuICAgIGNvcmVGYWRlRW5kOiBjb25maWcubWluQm9keVJhZGl1cyAqIDEyLFxuICAgIGRwcjogMSxcbiAgfTtcbiAgbGV0IHNwcml0ZVNldCA9IGNyZWF0ZVNwcml0ZVNldChnZXRUaGVtZT8uKCkpO1xuICBsZXQgYm9kaWVzID0gW107XG4gIGxldCBsYXlvdXRLZXkgPSAnJztcbiAgbGV0IGxhc3RNb3Rpb25GcmFtZUF0ID0gMDtcbiAgbGV0IGRyaWZ0Um90YXRpb24gPSAwO1xuXG4gIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZVN0YXRlID0gcmVkdWNlZE1vdGlvbiA/ICdyZWR1Y2VkLWlkbGUnIDogJ2lkbGUnO1xuICBzdGFnZS5kYXRhc2V0LmNvbnRhY3RSaXBwbGVCdXJzdENvdW50ID0gJzAnO1xuICBzdGFnZS5kYXRhc2V0LmNvbnRhY3RSaXBwbGVBY3RpdmVCdXJzdENvdW50ID0gJzAnO1xuICBzdGFnZS5kYXRhc2V0LmNvbnRhY3RSaXBwbGVNYXhBY3RpdmVCdXJzdHMgPSAnMCc7XG4gIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZUluc3RhbmNlID0gU3RyaW5nKGluc3RhbmNlSWQpO1xuICBzdGFnZS5kYXRhc2V0LmNvbnRhY3RSaXBwbGVCdXJzdE1vZGUgPSAnYWRkaXRpdmUtd2F2ZWZyb250cyc7XG4gIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZUJ1cnN0Q29sb3IgPSBDT05GSVJNQVRJT05fR1JFRU47XG4gIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZUJ1cnN0T3JpZ2luID0gJ2NlbnRlcic7XG4gIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZVBvaW50ZXJNb2RlID0gcmVkdWNlZE1vdGlvbiA/ICdkaXNhYmxlZC1yZWR1Y2VkLW1vdGlvbicgOiAnYXV0b25vbW91cy1kcmlmdCc7XG4gIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZVJpbmdEaXJlY3Rpb25zID0gJ2FsdGVybmF0aW5nJztcbiAgc3RhZ2UuZGF0YXNldC5jb250YWN0UmlwcGxlUG9pbnRlck1heERlZ3JlZXMgPSAnMC4wMCc7XG4gIGlmIChkaWFnbm9zdGljcykge1xuICAgIGRpYWdub3N0aWNzLnBvaW50ZXJBY3RpdmUgPSBmYWxzZTtcbiAgICBkaWFnbm9zdGljcy5wb2ludGVyUm90YXRpb24gPSAwO1xuICAgIGRpYWdub3N0aWNzLnBvaW50ZXJUYXJnZXQgPSAwO1xuICAgIGRpYWdub3N0aWNzLnBvaW50ZXJTcGVlZEJvb3N0ID0gMDtcbiAgICBkaWFnbm9zdGljcy5kcmlmdFJvdGF0aW9uID0gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIHNldFN0YXRlKG5leHRTdGF0ZSkge1xuICAgIGlmIChzdGFnZS5kYXRhc2V0LmNvbnRhY3RSaXBwbGVTdGF0ZSA9PT0gbmV4dFN0YXRlKSByZXR1cm47XG4gICAgc3RhZ2UuZGF0YXNldC5jb250YWN0UmlwcGxlU3RhdGUgPSBuZXh0U3RhdGU7XG4gICAgaWYgKGRpYWdub3N0aWNzKSBkaWFnbm9zdGljcy5sYXN0U3RhdGUgPSBuZXh0U3RhdGU7XG4gIH1cblxuICBmdW5jdGlvbiBnZXRJZGxlQWxwaGFSYW5nZSgpIHtcbiAgICBjb25zdCBpbm5lciA9IGNsYW1wKGNvbmZpZy5pbm5lclJpbmdBbHBoYSwgMCwgMSk7XG4gICAgY29uc3Qgb3V0ZXIgPSBjbGFtcChjb25maWcub3V0ZXJSaW5nQWxwaGEsIGlubmVyLCAxKTtcbiAgICByZXR1cm4geyBpbm5lciwgb3V0ZXIgfTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEthbGVpZG9zY29wZVJhZGl1c01ldHJpY3MoaGVpZ2h0KSB7XG4gICAgY29uc3QgYmFzZSA9IE1hdGgubWF4KFxuICAgICAgMSxcbiAgICAgIChLQUxFSURPU0NPUEVfRE9UX1NJWkVfVkggKiAwLjAxKSAqIGhlaWdodCAqIE1hdGguc3FydChLQUxFSURPU0NPUEVfRE9UX0FSRUFfTVVMKSxcbiAgICApO1xuICAgIGNvbnN0IHZhcmlhbmNlID0gY2xhbXAoS0FMRUlET1NDT1BFX0RPVF9TSVpFX1ZBUklBTkNFICogMC41LCAwLCAwLjIpO1xuICAgIHJldHVybiB7XG4gICAgICBiYXNlOiBjbGFtcChiYXNlLCBjb25maWcubWluQm9keVJhZGl1cywgY29uZmlnLm1heEJvZHlSYWRpdXMpLFxuICAgICAgbWluOiBjbGFtcChiYXNlICogKDEgLSB2YXJpYW5jZSksIGNvbmZpZy5taW5Cb2R5UmFkaXVzLCBjb25maWcubWF4Qm9keVJhZGl1cyksXG4gICAgICBtYXg6IGNsYW1wKGJhc2UgKiAoMSArIHZhcmlhbmNlKSwgY29uZmlnLm1pbkJvZHlSYWRpdXMsIGNvbmZpZy5tYXhCb2R5UmFkaXVzKSxcbiAgICAgIHZhcmlhbmNlLFxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBzeW5jVGhlbWUoKSB7XG4gICAgY29uc3QgdGhlbWUgPSBnZXRUaGVtZT8uKCk7XG4gICAgc3RhZ2UuZGF0YXNldC5jb250YWN0UmlwcGxlU3VyZmFjZSA9IFN0cmluZyh0aGVtZT8uYWN0aXZlIHx8ICcnKTtcbiAgICBjb25zdCBuZXh0S2V5ID0gZ2V0VGhlbWVLZXkodGhlbWUpO1xuICAgIGlmIChuZXh0S2V5ID09PSBzcHJpdGVTZXQua2V5KSByZXR1cm47XG4gICAgc3ByaXRlU2V0ID0gY3JlYXRlU3ByaXRlU2V0KHRoZW1lKTtcbiAgICBzdGFnZS5kYXRhc2V0LmNvbnRhY3RSaXBwbGVQYWxldHRlU2l6ZSA9IFN0cmluZyhzcHJpdGVTZXQucGFsZXR0ZS5sZW5ndGgpO1xuICAgIG5lZWRzUmVuZGVyID0gdHJ1ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN5bmNNZXRyaWNzKCkge1xuICAgIGNvbnN0IHJlY3QgPSBjYW52YXMuZ2V0Qm91bmRpbmdDbGllbnRSZWN0KCk7XG4gICAgY29uc3Qgd2lkdGggPSBNYXRoLm1heCgxLCByZWN0LndpZHRoKTtcbiAgICBjb25zdCBoZWlnaHQgPSBNYXRoLm1heCgxLCByZWN0LmhlaWdodCk7XG4gICAgY29uc3QgZHByID0gY2xhbXAod2luZG93LmRldmljZVBpeGVsUmF0aW8gfHwgMSwgMSwgTUFYX0RQUik7XG4gICAgY29uc3QgYnVmZmVyV2lkdGggPSBNYXRoLm1heCgxLCBNYXRoLnJvdW5kKHdpZHRoICogZHByKSk7XG4gICAgY29uc3QgYnVmZmVySGVpZ2h0ID0gTWF0aC5tYXgoMSwgTWF0aC5yb3VuZChoZWlnaHQgKiBkcHIpKTtcbiAgICBjb25zdCByZXNpemVkID0gY2FudmFzLndpZHRoICE9PSBidWZmZXJXaWR0aCB8fCBjYW52YXMuaGVpZ2h0ICE9PSBidWZmZXJIZWlnaHQ7XG5cbiAgICBpZiAocmVzaXplZCkge1xuICAgICAgY2FudmFzLndpZHRoID0gYnVmZmVyV2lkdGg7XG4gICAgICBjYW52YXMuaGVpZ2h0ID0gYnVmZmVySGVpZ2h0O1xuICAgIH1cbiAgICBjb250ZXh0LnNldFRyYW5zZm9ybShkcHIsIDAsIDAsIGRwciwgMCwgMCk7XG5cbiAgICBjb25zdCByYWRpdXNNZXRyaWNzID0gZ2V0S2FsZWlkb3Njb3BlUmFkaXVzTWV0cmljcyhoZWlnaHQpO1xuICAgIGNvbnN0IGJvZHlSYWRpdXMgPSByYWRpdXNNZXRyaWNzLmJhc2U7XG4gICAgY29uc3QgY29udGVudFpvbmUgPSBnZXRRdWlldFpvbmUoY2FudmFzLCBnZXRRdWlldFpvbmVFbGVtZW50Py4oKSk7XG4gICAgY29uc3QgY29udGVudENvcmVSYWRpdXMgPSBjb250ZW50Wm9uZVxuICAgICAgPyAoTWF0aC5tYXgoY29udGVudFpvbmUuaGFsZldpZHRoLCBjb250ZW50Wm9uZS5oYWxmSGVpZ2h0KSAqIDAuOTYpXG4gICAgICAgICsgKGJvZHlSYWRpdXMgKiBjb25maWcucmluZ0dhcFNjYWxlICogMC43NSlcbiAgICAgIDogTWF0aC5taW4od2lkdGgsIGhlaWdodCkgKiAwLjM7XG4gICAgY29uc3QgY29yZUZhZGVFbmQgPSBjbGFtcChjb250ZW50Q29yZVJhZGl1cywgYm9keVJhZGl1cyAqIDE4LCBib2R5UmFkaXVzICogMzgpO1xuICAgIG1ldHJpY3MgPSB7XG4gICAgICB3aWR0aCxcbiAgICAgIGhlaWdodCxcbiAgICAgIGNlbnRlclg6IHdpZHRoICogMC41LFxuICAgICAgY2VudGVyWTogaGVpZ2h0ICogMC41LFxuICAgICAgbWF4UmFkaXVzOiBNYXRoLmh5cG90KHdpZHRoICogMC41LCBoZWlnaHQgKiAwLjUpICsgKGNvbmZpZy5tYXhCb2R5UmFkaXVzICogMiksXG4gICAgICBib2R5UmFkaXVzLFxuICAgICAgbWluQm9keVJhZGl1czogcmFkaXVzTWV0cmljcy5taW4sXG4gICAgICBtYXhCb2R5UmFkaXVzOiByYWRpdXNNZXRyaWNzLm1heCxcbiAgICAgIHNpemVWYXJpYW5jZTogcmFkaXVzTWV0cmljcy52YXJpYW5jZSxcbiAgICAgIGNvcmVGYWRlU3RhcnQ6IE1hdGgubWF4KGJvZHlSYWRpdXMgKiA0LjI1LCBjb3JlRmFkZUVuZCAtIChib2R5UmFkaXVzICogY29uZmlnLnJpbmdHYXBTY2FsZSAqIDEuMjUpKSxcbiAgICAgIGNvcmVGYWRlRW5kLFxuICAgICAgZHByLFxuICAgIH07XG5cbiAgICBjYW52YXMuZGF0YXNldC5jb250YWN0UmlwcGxlQnVmZmVyID0gYCR7YnVmZmVyV2lkdGh9eCR7YnVmZmVySGVpZ2h0fWA7XG4gICAgY2FudmFzLmRhdGFzZXQuY29udGFjdFJpcHBsZURwciA9IGRwci50b0ZpeGVkKDIpO1xuICAgIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZVBhbGV0dGVTaXplID0gU3RyaW5nKHNwcml0ZVNldC5wYWxldHRlLmxlbmd0aCk7XG4gICAgc3RhZ2UuZGF0YXNldC5jb250YWN0UmlwcGxlSW5uZXJBbHBoYSA9IGNvbmZpZy5pbm5lclJpbmdBbHBoYS50b0ZpeGVkKDIpO1xuICAgIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZU91dGVyQWxwaGEgPSBjb25maWcub3V0ZXJSaW5nQWxwaGEudG9GaXhlZCgyKTtcbiAgICBjb25zdCBpZGxlQWxwaGFSYW5nZSA9IGdldElkbGVBbHBoYVJhbmdlKCk7XG4gICAgc3RhZ2UuZGF0YXNldC5jb250YWN0UmlwcGxlSWRsZUlubmVyQWxwaGEgPSBpZGxlQWxwaGFSYW5nZS5pbm5lci50b0ZpeGVkKDIpO1xuICAgIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZUlkbGVPdXRlckFscGhhID0gaWRsZUFscGhhUmFuZ2Uub3V0ZXIudG9GaXhlZCgyKTtcbiAgICBzdGFnZS5kYXRhc2V0LmNvbnRhY3RSaXBwbGVCdXJzdFBlYWtBbHBoYSA9IEJVUlNUX1JJTkdfQUxQSEFfUEVBSy50b0ZpeGVkKDIpO1xuICAgIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZUNvcmVGYWRlUmFkaXVzID0gbWV0cmljcy5jb3JlRmFkZUVuZC50b0ZpeGVkKDIpO1xuICAgIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZUJ1cnN0UmVsZWFzZSA9ICdzbW9vdGhzdGVwLXRhaWwnO1xuICAgIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZUJhbGxGaW5pc2ggPSAnZmxhdC1maWxsJztcbiAgICBzdGFnZS5kYXRhc2V0LmNvbnRhY3RSaXBwbGVDb25maWdDb250cm9scyA9IFN0cmluZyhDT05UQUNUX1JJUFBMRV9DT05UUk9MX0NPVU5UKTtcbiAgICBzdGFnZS5kYXRhc2V0LmNvbnRhY3RSaXBwbGVJbm5lclJpbmdzUmVtb3ZlZCA9IFN0cmluZyhjb25maWcuaW5uZXJSaW5nU2tpcENvdW50KTtcbiAgICBjb25zdCBuZXh0TGF5b3V0S2V5ID0gW1xuICAgICAgYCR7TWF0aC5yb3VuZCh3aWR0aCl9eCR7TWF0aC5yb3VuZChoZWlnaHQpfWAsXG4gICAgICBtZXRyaWNzLmJvZHlSYWRpdXMudG9GaXhlZCgyKSxcbiAgICAgIGNvbmZpZy5ib2R5R2FwU2NhbGUudG9GaXhlZCgyKSxcbiAgICAgIGNvbmZpZy5yaW5nR2FwU2NhbGUudG9GaXhlZCgyKSxcbiAgICAgIGNvbmZpZy5pbm5lclJpbmdTa2lwQ291bnQsXG4gICAgICBzcHJpdGVTZXQua2V5LFxuICAgIF0uam9pbignOicpO1xuICAgIGlmIChuZXh0TGF5b3V0S2V5ICE9PSBsYXlvdXRLZXkpIHtcbiAgICAgIGxheW91dEtleSA9IG5leHRMYXlvdXRLZXk7XG4gICAgICByZWJ1aWxkQm9kaWVzKCk7XG4gICAgfVxuICAgIG5lZWRzUmVuZGVyID0gbmVlZHNSZW5kZXIgfHwgcmVzaXplZDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEJvZHlDb2xvckluZGV4KHJpbmdJbmRleCwgYmVhZEluZGV4LCBiZWFkQ291bnQpIHtcbiAgICBjb25zdCBzZWdtZW50Q291bnQgPSBNYXRoLm1pbigxMiwgTWF0aC5tYXgoNiwgTWF0aC5yb3VuZChiZWFkQ291bnQgLyA5KSkpO1xuICAgIGNvbnN0IHNlZ21lbnQgPSBNYXRoLmZsb29yKChiZWFkSW5kZXggLyBNYXRoLm1heCgxLCBiZWFkQ291bnQpKSAqIHNlZ21lbnRDb3VudCk7XG4gICAgY29uc3Qgc2VxdWVuY2VJbmRleCA9IChzZWdtZW50ICsgKHJpbmdJbmRleCAqIDMpKSAlIHNwcml0ZVNldC5zZXF1ZW5jZS5sZW5ndGg7XG4gICAgcmV0dXJuIHNwcml0ZVNldC5zZXF1ZW5jZVtzZXF1ZW5jZUluZGV4XTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEJvZHlSYWRpdXMocmluZ0luZGV4LCBiZWFkSW5kZXgpIHtcbiAgICBjb25zdCBzZWVkID0gTWF0aC5zaW4oKHJpbmdJbmRleCAqIDEyNy4xKSArIChiZWFkSW5kZXggKiAzMTEuNykpICogNDM3NTguNTQ1MzEyMztcbiAgICBjb25zdCB0ID0gc2VlZCAtIE1hdGguZmxvb3Ioc2VlZCk7XG4gICAgcmV0dXJuIGxlcnAobWV0cmljcy5taW5Cb2R5UmFkaXVzLCBtZXRyaWNzLm1heEJvZHlSYWRpdXMsIHQpO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVidWlsZEJvZGllcygpIHtcbiAgICBjb25zdCBuZXh0Qm9kaWVzID0gW107XG4gICAgY29uc3QgYm9keVJhZGl1cyA9IG1ldHJpY3MuYm9keVJhZGl1cztcbiAgICBjb25zdCBzcGFjaW5nUmFkaXVzID0gbWV0cmljcy5tYXhCb2R5UmFkaXVzIHx8IGJvZHlSYWRpdXM7XG4gICAgY29uc3QgcmluZ0dhcCA9IHNwYWNpbmdSYWRpdXMgKiBjb25maWcucmluZ0dhcFNjYWxlO1xuICAgIGNvbnN0IGZpcnN0UmluZ1JhZGl1cyA9IChzcGFjaW5nUmFkaXVzICogNC4yNSkgKyAocmluZ0dhcCAqIGNvbmZpZy5pbm5lclJpbmdTa2lwQ291bnQpO1xuICAgIGxldCByaW5nSW5kZXggPSBjb25maWcuaW5uZXJSaW5nU2tpcENvdW50O1xuXG4gICAgZm9yIChsZXQgcmluZ1JhZGl1cyA9IGZpcnN0UmluZ1JhZGl1czsgcmluZ1JhZGl1cyA8PSBtZXRyaWNzLm1heFJhZGl1czsgcmluZ1JhZGl1cyArPSByaW5nR2FwKSB7XG4gICAgICBjb25zdCBjaXJjdW1mZXJlbmNlID0gVEFVICogcmluZ1JhZGl1cztcbiAgICAgIGNvbnN0IG1pbmltdW1TcGFjaW5nID0gc3BhY2luZ1JhZGl1cyAqIDIgKiBjb25maWcuYm9keUdhcFNjYWxlO1xuICAgICAgY29uc3QgYmVhZENvdW50ID0gY2xhbXAoTWF0aC5mbG9vcihjaXJjdW1mZXJlbmNlIC8gbWluaW11bVNwYWNpbmcpLCA2LCAxNjQpO1xuICAgICAgY29uc3QgYW5nbGVPZmZzZXQgPSAocmluZ0luZGV4ICUgMiA9PT0gMCA/IDAgOiBNYXRoLlBJIC8gYmVhZENvdW50KSArIChyaW5nSW5kZXggKiAwLjA3MSk7XG5cbiAgICAgIGZvciAobGV0IGJlYWRJbmRleCA9IDA7IGJlYWRJbmRleCA8IGJlYWRDb3VudDsgYmVhZEluZGV4ICs9IDEpIHtcbiAgICAgICAgY29uc3QgYW5nbGUgPSBhbmdsZU9mZnNldCArICgoYmVhZEluZGV4IC8gYmVhZENvdW50KSAqIFRBVSk7XG4gICAgICAgIG5leHRCb2RpZXMucHVzaCh7XG4gICAgICAgICAgYW5nbGUsXG4gICAgICAgICAgYmFzZVJhZGl1czogcmluZ1JhZGl1cyxcbiAgICAgICAgICByaW5nSW5kZXgsXG4gICAgICAgICAgcmluZ0RpcmVjdGlvbjogcmluZ0luZGV4ICUgMiA9PT0gMCA/IDEgOiAtMSxcbiAgICAgICAgICBjb2xvckluZGV4OiBnZXRCb2R5Q29sb3JJbmRleChyaW5nSW5kZXgsIGJlYWRJbmRleCwgYmVhZENvdW50KSxcbiAgICAgICAgICByYWRpdXM6IGdldEJvZHlSYWRpdXMocmluZ0luZGV4LCBiZWFkSW5kZXgpLFxuICAgICAgICAgIHBoYXNlOiByaW5nSW5kZXggKiAwLjEyLFxuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICAgIHJpbmdJbmRleCArPSAxO1xuICAgIH1cblxuICAgIGJvZGllcyA9IG5leHRCb2RpZXM7XG4gICAgc3RhZ2UuZGF0YXNldC5jb250YWN0UmlwcGxlQm9keUNvdW50ID0gU3RyaW5nKGJvZGllcy5sZW5ndGgpO1xuICAgIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZUJvZHlSYWRpdXMgPSBib2R5UmFkaXVzLnRvRml4ZWQoMik7XG4gIH1cblxuICBmdW5jdGlvbiBkcmF3QmFsbCh4LCB5LCByYWRpdXMsIGFscGhhLCBjb2xvckluZGV4LCB3YXZlTWl4ID0gMCkge1xuICAgIGlmIChhbHBoYSA8PSAwLjAwMyB8fCByYWRpdXMgPD0gMC4xKSByZXR1cm47XG4gICAgY29uc3Qgc3ByaXRlID0gc3ByaXRlU2V0LnNwcml0ZXNbY29sb3JJbmRleCAlIHNwcml0ZVNldC5zcHJpdGVzLmxlbmd0aF07XG4gICAgaWYgKCFzcHJpdGUpIHJldHVybjtcbiAgICBjb25zdCBkaWFtZXRlciA9IHJhZGl1cyAqIDIuMzY7XG4gICAgY29udGV4dC5nbG9iYWxBbHBoYSA9IGNsYW1wKGFscGhhLCAwLCAxKTtcbiAgICBjb250ZXh0LmRyYXdJbWFnZShzcHJpdGUsIHggLSAoZGlhbWV0ZXIgKiAwLjUpLCB5IC0gKGRpYW1ldGVyICogMC41KSwgZGlhbWV0ZXIsIGRpYW1ldGVyKTtcbiAgICBpZiAod2F2ZU1peCA+IDAuMDAzICYmIHNwcml0ZVNldC5jb25maXJtYXRpb25TcHJpdGUpIHtcbiAgICAgIGNvbnRleHQuZ2xvYmFsQWxwaGEgPSBjbGFtcCh3YXZlTWl4ICogYWxwaGEsIDAsIDEpO1xuICAgICAgY29udGV4dC5kcmF3SW1hZ2Uoc3ByaXRlU2V0LmNvbmZpcm1hdGlvblNwcml0ZSwgeCAtIChkaWFtZXRlciAqIDAuNSksIHkgLSAoZGlhbWV0ZXIgKiAwLjUpLCBkaWFtZXRlciwgZGlhbWV0ZXIpO1xuICAgIH1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEJ1cnN0RW5lcmd5KGRpc3RhbmNlRnJvbU9yaWdpbiwgcHJvZ3Jlc3MsIG1heERpc3RhbmNlKSB7XG4gICAgaWYgKHByb2dyZXNzIDwgMCB8fCBwcm9ncmVzcyA+PSAxKSByZXR1cm4gMDtcbiAgICBjb25zdCBmcm9udFJhZGl1cyA9IE1hdGgucG93KHByb2dyZXNzLCAwLjcyKSAqIG1heERpc3RhbmNlICogY29uZmlnLmJ1cnN0VHJhdmVsU2NhbGU7XG4gICAgY29uc3QgZnJvbnRXaWR0aCA9IGNsYW1wKChtZXRyaWNzLm1heEJvZHlSYWRpdXMgfHwgbWV0cmljcy5ib2R5UmFkaXVzKSAqIDcuNSwgMzQsIDY0KTtcbiAgICBsZXQgZW5lcmd5ID0gMDtcblxuICAgIGZvciAobGV0IGZyb250SW5kZXggPSAwOyBmcm9udEluZGV4IDwgY29uZmlnLmJ1cnN0RnJvbnRDb3VudDsgZnJvbnRJbmRleCArPSAxKSB7XG4gICAgICBjb25zdCBlY2hvUmFkaXVzID0gZnJvbnRSYWRpdXMgLSAoZnJvbnRJbmRleCAqIGZyb250V2lkdGggKiAxLjE4KTtcbiAgICAgIGNvbnN0IGRpc3RhbmNlID0gZGlzdGFuY2VGcm9tT3JpZ2luIC0gZWNob1JhZGl1cztcbiAgICAgIGNvbnN0IHdpZHRoID0gZnJvbnRXaWR0aCAqICgxICsgKGZyb250SW5kZXggKiAwLjE4KSk7XG4gICAgICBjb25zdCBmcm9udEVuZXJneSA9IE1hdGguZXhwKC0wLjUgKiAoKGRpc3RhbmNlIC8gd2lkdGgpICoqIDIpKTtcbiAgICAgIGVuZXJneSArPSBmcm9udEVuZXJneSAqICgxIC0gKGZyb250SW5kZXggKiAwLjIyKSk7XG4gICAgfVxuXG4gICAgY29uc3QgcmVsZWFzZVByb2dyZXNzID0gKHByb2dyZXNzIC0gY29uZmlnLmJ1cnN0UmVsZWFzZVN0YXJ0KSAvICgxIC0gY29uZmlnLmJ1cnN0UmVsZWFzZVN0YXJ0KTtcbiAgICBjb25zdCByZWxlYXNlID0gMSAtIHNtb290aHN0ZXAocmVsZWFzZVByb2dyZXNzKTtcbiAgICByZXR1cm4gY2xhbXAoZW5lcmd5ICogcmVsZWFzZSwgMCwgMS4zNSk7XG4gIH1cblxuICBmdW5jdGlvbiBzeW5jQWN0aXZlQnVyc3RzKG5vdywgZHVyYXRpb25Ncykge1xuICAgIGFjdGl2ZUJ1cnN0cyA9IGFjdGl2ZUJ1cnN0cy5maWx0ZXIoKHN0YXJ0ZWQpID0+IHtcbiAgICAgIGNvbnN0IGVsYXBzZWQgPSBub3cgLSBzdGFydGVkLnN0YXJ0ZWRBdDtcbiAgICAgIHJldHVybiBlbGFwc2VkID49IDAgJiYgZWxhcHNlZCA8IGR1cmF0aW9uTXM7XG4gICAgfSk7XG4gICAgY29uc3QgYWN0aXZlQ291bnQgPSBhY3RpdmVCdXJzdHMubGVuZ3RoO1xuICAgIGlmIChhY3RpdmVDb3VudCA+IG1heENvbmN1cnJlbnRCdXJzdHMpIG1heENvbmN1cnJlbnRCdXJzdHMgPSBhY3RpdmVDb3VudDtcbiAgICBzdGFnZS5kYXRhc2V0LmNvbnRhY3RSaXBwbGVBY3RpdmVCdXJzdENvdW50ID0gU3RyaW5nKGFjdGl2ZUNvdW50KTtcbiAgICBzdGFnZS5kYXRhc2V0LmNvbnRhY3RSaXBwbGVNYXhBY3RpdmVCdXJzdHMgPSBTdHJpbmcobWF4Q29uY3VycmVudEJ1cnN0cyk7XG4gICAgaWYgKGRpYWdub3N0aWNzKSB7XG4gICAgICBkaWFnbm9zdGljcy5hY3RpdmVCdXJzdENvdW50ID0gYWN0aXZlQ291bnQ7XG4gICAgICBkaWFnbm9zdGljcy5tYXhDb25jdXJyZW50QnVyc3RzID0gbWF4Q29uY3VycmVudEJ1cnN0cztcbiAgICB9XG4gICAgcmV0dXJuIGFjdGl2ZUNvdW50ID4gMDtcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEJ1cnN0RmllbGQoeCwgeSwgbm93KSB7XG4gICAgaWYgKGFjdGl2ZUJ1cnN0cy5sZW5ndGggPT09IDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIGFjdGl2ZTogZmFsc2UsXG4gICAgICAgIGVuZXJneTogMCxcbiAgICAgICAgcmFkaWFsU2lnbmFsOiAwLFxuICAgICAgICB0YW5nZW50aWFsU2lnbmFsOiAwLFxuICAgICAgICBjb2xvclNpZ25hbDogMCxcbiAgICAgICAgZGlyZWN0aW9uWDogMCxcbiAgICAgICAgZGlyZWN0aW9uWTogMCxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgbGV0IGVuZXJneVN1bSA9IDA7XG4gICAgbGV0IHJhZGlhbFNpZ25hbCA9IDA7XG4gICAgbGV0IHRhbmdlbnRpYWxTaWduYWwgPSAwO1xuICAgIGxldCBjb2xvclNpZ25hbCA9IDA7XG4gICAgbGV0IGRpcmVjdGlvblggPSAwO1xuICAgIGxldCBkaXJlY3Rpb25ZID0gMDtcbiAgICBmb3IgKGNvbnN0IHN0YXJ0ZWQgb2YgYWN0aXZlQnVyc3RzKSB7XG4gICAgICBjb25zdCBwcm9ncmVzcyA9IChub3cgLSBzdGFydGVkLnN0YXJ0ZWRBdCkgLyBjb25maWcuYnVyc3REdXJhdGlvbk1zO1xuICAgICAgY29uc3QgZHggPSB4IC0gc3RhcnRlZC54O1xuICAgICAgY29uc3QgZHkgPSB5IC0gc3RhcnRlZC55O1xuICAgICAgY29uc3QgZGlzdGFuY2UgPSBNYXRoLmh5cG90KGR4LCBkeSk7XG4gICAgICBjb25zdCBlbmVyZ3kgPSBnZXRCdXJzdEVuZXJneShkaXN0YW5jZSwgcHJvZ3Jlc3MsIHN0YXJ0ZWQubWF4RGlzdGFuY2UpO1xuICAgICAgaWYgKGVuZXJneSA8PSAwKSBjb250aW51ZTtcbiAgICAgIGNvbnN0IHNhZmVEaXN0YW5jZSA9IE1hdGgubWF4KDEsIGRpc3RhbmNlKTtcbiAgICAgIGNvbnN0IHV4ID0gZHggLyBzYWZlRGlzdGFuY2U7XG4gICAgICBjb25zdCB1eSA9IGR5IC8gc2FmZURpc3RhbmNlO1xuICAgICAgY29uc3QgcmVib3VuZFBoYXNlID0gTWF0aC5zaW4oKHByb2dyZXNzICogVEFVICogMS44KSAtIChkaXN0YW5jZSAqIDAuMDE4KSk7XG4gICAgICBlbmVyZ3lTdW0gKz0gZW5lcmd5O1xuICAgICAgcmFkaWFsU2lnbmFsICs9IGVuZXJneSAqICgwLjc4ICsgKHJlYm91bmRQaGFzZSAqIDAuMjIpKTtcbiAgICAgIHRhbmdlbnRpYWxTaWduYWwgKz0gZW5lcmd5ICogTWF0aC5zaW4oKE1hdGguYXRhbjIoZHksIGR4KSAqIDUpICsgKHByb2dyZXNzICogVEFVKSk7XG4gICAgICBjb2xvclNpZ25hbCArPSBlbmVyZ3kgKiAoMSAtIHNtb290aHN0ZXAocHJvZ3Jlc3MgKiAwLjcyKSk7XG4gICAgICBkaXJlY3Rpb25YICs9IHV4ICogZW5lcmd5O1xuICAgICAgZGlyZWN0aW9uWSArPSB1eSAqIGVuZXJneTtcbiAgICB9XG5cbiAgICBjb25zdCBkaXJlY3Rpb25MZW5ndGggPSBNYXRoLmh5cG90KGRpcmVjdGlvblgsIGRpcmVjdGlvblkpO1xuICAgIHJldHVybiB7XG4gICAgICBhY3RpdmU6IHRydWUsXG4gICAgICBlbmVyZ3k6IGNsYW1wKGVuZXJneVN1bSwgMCwgMS44NSksXG4gICAgICByYWRpYWxTaWduYWw6IGNsYW1wKHJhZGlhbFNpZ25hbCwgMCwgMS44NSksXG4gICAgICB0YW5nZW50aWFsU2lnbmFsOiBjbGFtcCh0YW5nZW50aWFsU2lnbmFsLCAtMS42NSwgMS42NSksXG4gICAgICBjb2xvclNpZ25hbDogY2xhbXAoY29sb3JTaWduYWwsIDAsIDEuNDUpLFxuICAgICAgZGlyZWN0aW9uWDogZGlyZWN0aW9uTGVuZ3RoID4gMCA/IGRpcmVjdGlvblggLyBkaXJlY3Rpb25MZW5ndGggOiAwLFxuICAgICAgZGlyZWN0aW9uWTogZGlyZWN0aW9uTGVuZ3RoID4gMCA/IGRpcmVjdGlvblkgLyBkaXJlY3Rpb25MZW5ndGggOiAwLFxuICAgIH07XG4gIH1cblxuICBmdW5jdGlvbiBnZXRSaW5nQWxwaGEoYmFzZVJhZGl1cywgZW5lcmd5KSB7XG4gICAgY29uc3QgZmFkZVNwYW4gPSBNYXRoLm1heCgxLCBtZXRyaWNzLmNvcmVGYWRlRW5kIC0gbWV0cmljcy5jb3JlRmFkZVN0YXJ0KTtcbiAgICBjb25zdCBjb3JlUHJvZ3Jlc3MgPSBzbW9vdGhzdGVwKChiYXNlUmFkaXVzIC0gbWV0cmljcy5jb3JlRmFkZVN0YXJ0KSAvIGZhZGVTcGFuKTtcbiAgICBjb25zdCBpZGxlQWxwaGFSYW5nZSA9IGdldElkbGVBbHBoYVJhbmdlKCk7XG4gICAgY29uc3QgaWRsZUFscGhhID0gaWRsZUFscGhhUmFuZ2UuaW5uZXJcbiAgICAgICsgKChpZGxlQWxwaGFSYW5nZS5vdXRlciAtIGlkbGVBbHBoYVJhbmdlLmlubmVyKSAqIGNvcmVQcm9ncmVzcyk7XG4gICAgY29uc3QgYnVyc3RMaWZ0ID0gY2xhbXAoZW5lcmd5ICogMC4yLCAwLCAxKTtcbiAgICByZXR1cm4gaWRsZUFscGhhICsgKChCVVJTVF9SSU5HX0FMUEhBX1BFQUsgLSBpZGxlQWxwaGEpICogYnVyc3RMaWZ0KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHVwZGF0ZVJpbmdSb3RhdGlvbihub3csIGlzUmVkdWNlZCkge1xuICAgIGNvbnN0IGR0ID0gbGFzdE1vdGlvbkZyYW1lQXRcbiAgICAgID8gY2xhbXAoKG5vdyAtIGxhc3RNb3Rpb25GcmFtZUF0KSAvIDEwMDAsIDEgLyAyNDAsIDEgLyAyMClcbiAgICAgIDogMSAvIDYwO1xuICAgIGxhc3RNb3Rpb25GcmFtZUF0ID0gbm93O1xuICAgIGlmICghaXNSZWR1Y2VkKSBkcmlmdFJvdGF0aW9uID0gKGRyaWZ0Um90YXRpb24gKyAoSURMRV9ST1RBVElPTl9TUEVFRCAqIGR0KSkgJSBUQVU7XG4gICAgaWYgKGRpYWdub3N0aWNzKSB7XG4gICAgICBkaWFnbm9zdGljcy5wb2ludGVyQWN0aXZlID0gZmFsc2U7XG4gICAgICBkaWFnbm9zdGljcy5wb2ludGVyUm90YXRpb24gPSAwO1xuICAgICAgZGlhZ25vc3RpY3MucG9pbnRlclRhcmdldCA9IDA7XG4gICAgICBkaWFnbm9zdGljcy5wb2ludGVyU3BlZWRCb29zdCA9IDA7XG4gICAgICBkaWFnbm9zdGljcy5kcmlmdFJvdGF0aW9uID0gZHJpZnRSb3RhdGlvbjtcbiAgICB9XG4gICAgcmV0dXJuIGRyaWZ0Um90YXRpb247XG4gIH1cblxuICBmdW5jdGlvbiBkcmF3RmllbGQobm93LCByZWR1Y2VkRW1waGFzaXMgPSBudWxsKSB7XG4gICAgY29uc3QgZWxhcHNlZCA9IG5vdyAtIHN0YXJ0ZWRBdDtcbiAgICBjb25zdCBpc1JlZHVjZWQgPSByZWR1Y2VkRW1waGFzaXMgIT09IG51bGw7XG4gICAgY29uc3QgcmluZ1JvdGF0aW9uID0gdXBkYXRlUmluZ1JvdGF0aW9uKG5vdywgaXNSZWR1Y2VkKTtcbiAgICBjb25zdCBidXJzdEFjdGl2ZSA9IGlzUmVkdWNlZCA/IHJlZHVjZWRFbXBoYXNpcyA+IDAgOiBzeW5jQWN0aXZlQnVyc3RzKG5vdywgY29uZmlnLmJ1cnN0RHVyYXRpb25Ncyk7XG5cbiAgICBmb3IgKGxldCBib2R5SW5kZXggPSAwOyBib2R5SW5kZXggPCBib2RpZXMubGVuZ3RoOyBib2R5SW5kZXggKz0gMSkge1xuICAgICAgY29uc3QgYm9keSA9IGJvZGllc1tib2R5SW5kZXhdO1xuICAgICAgY29uc3QgaWRsZVBoYXNlID0gKChib2R5LmJhc2VSYWRpdXMgLyBjb25maWcuaWRsZVdhdmVMZW5ndGgpICogVEFVKVxuICAgICAgICAtIChpc1JlZHVjZWQgPyAwIDogZWxhcHNlZCAqIGNvbmZpZy5pZGxlV2F2ZVNwZWVkKVxuICAgICAgICArIGJvZHkucGhhc2U7XG4gICAgICBjb25zdCBwcmltYXJ5U3dlbGwgPSBNYXRoLnNpbihpZGxlUGhhc2UpO1xuICAgICAgY29uc3Qgc2Vjb25kYXJ5U3dlbGwgPSBNYXRoLnNpbihcbiAgICAgICAgKGlkbGVQaGFzZSAqIDAuNTIpIC0gKGlzUmVkdWNlZCA/IDAgOiBlbGFwc2VkICogY29uZmlnLmlkbGVTZWNvbmRhcnlTcGVlZCkgKyAxLjE1LFxuICAgICAgKTtcbiAgICAgIGNvbnN0IGlkbGVXYXZlID0gKHByaW1hcnlTd2VsbCAqIDAuNzYpICsgKHNlY29uZGFyeVN3ZWxsICogMC4yNCk7XG4gICAgICBjb25zdCBpZGxlT2Zmc2V0ID0gaXNSZWR1Y2VkID8gMCA6IGlkbGVXYXZlICogY29uZmlnLmlkbGVEaXNwbGFjZW1lbnQ7XG4gICAgICBjb25zdCByaW5nRGVwdGggPSBjbGFtcChib2R5LmJhc2VSYWRpdXMgLyBtZXRyaWNzLm1heFJhZGl1cywgMCwgMSk7XG4gICAgICBjb25zdCByZW5kZXJlZEFuZ2xlID0gYm9keS5hbmdsZVxuICAgICAgICArIChyaW5nUm90YXRpb24gKiBib2R5LnJpbmdEaXJlY3Rpb24gKiAoMC41OCArIChyaW5nRGVwdGggKiAwLjQyKSkpO1xuICAgICAgY29uc3QgY29zID0gTWF0aC5jb3MocmVuZGVyZWRBbmdsZSk7XG4gICAgICBjb25zdCBzaW4gPSBNYXRoLnNpbihyZW5kZXJlZEFuZ2xlKTtcbiAgICAgIGNvbnN0IGJhc2VSYWRpdXMgPSBib2R5LmJhc2VSYWRpdXMgKyBpZGxlT2Zmc2V0O1xuICAgICAgY29uc3QgYmFzZVggPSBtZXRyaWNzLmNlbnRlclggKyAoY29zICogYmFzZVJhZGl1cyk7XG4gICAgICBjb25zdCBiYXNlWSA9IG1ldHJpY3MuY2VudGVyWSArIChzaW4gKiBiYXNlUmFkaXVzKTtcbiAgICAgIGNvbnN0IGJ1cnN0RmllbGQgPSBpc1JlZHVjZWRcbiAgICAgICAgPyB7IGVuZXJneTogcmVkdWNlZEVtcGhhc2lzLCByYWRpYWxTaWduYWw6IDAsIHRhbmdlbnRpYWxTaWduYWw6IDAsIGNvbG9yU2lnbmFsOiByZWR1Y2VkRW1waGFzaXMgfVxuICAgICAgICA6IGdldEJ1cnN0RmllbGQoYmFzZVgsIGJhc2VZLCBub3cpO1xuICAgICAgY29uc3QgZW5lcmd5ID0gIWlzUmVkdWNlZCA/IGJ1cnN0RmllbGQuZW5lcmd5IDogcmVkdWNlZEVtcGhhc2lzO1xuXG4gICAgICBjb25zdCByYWRpYWxLaWNrID0gaXNSZWR1Y2VkXG4gICAgICAgID8gMFxuICAgICAgICA6IGJ1cnN0RmllbGQucmFkaWFsU2lnbmFsICogY29uZmlnLmJ1cnN0RGlzcGxhY2VtZW50O1xuICAgICAgY29uc3QgdGFuZ2VudGlhbEtpY2sgPSAhaXNSZWR1Y2VkICYmIGVuZXJneSA+IDBcbiAgICAgICAgPyBidXJzdEZpZWxkLnRhbmdlbnRpYWxTaWduYWwgKiBjb25maWcuYnVyc3RUd2lzdFxuICAgICAgICA6IDA7XG4gICAgICBjb25zdCBkaXJlY3Rpb25YID0gYnVyc3RGaWVsZC5kaXJlY3Rpb25YIHx8IGNvcztcbiAgICAgIGNvbnN0IGRpcmVjdGlvblkgPSBidXJzdEZpZWxkLmRpcmVjdGlvblkgfHwgc2luO1xuICAgICAgY29uc3QgeCA9IGJhc2VYICsgKGRpcmVjdGlvblggKiByYWRpYWxLaWNrKSAtIChkaXJlY3Rpb25ZICogdGFuZ2VudGlhbEtpY2spO1xuICAgICAgY29uc3QgeSA9IGJhc2VZICsgKGRpcmVjdGlvblkgKiByYWRpYWxLaWNrKSArIChkaXJlY3Rpb25YICogdGFuZ2VudGlhbEtpY2spO1xuICAgICAgZHJhd0JhbGwoXG4gICAgICAgIHgsXG4gICAgICAgIHksXG4gICAgICAgIGJvZHkucmFkaXVzIHx8IG1ldHJpY3MuYm9keVJhZGl1cyxcbiAgICAgICAgZ2V0UmluZ0FscGhhKGJvZHkuYmFzZVJhZGl1cywgZW5lcmd5KSxcbiAgICAgICAgYm9keS5jb2xvckluZGV4LFxuICAgICAgICBjbGFtcCgoYnVyc3RGaWVsZC5jb2xvclNpZ25hbCB8fCAwKSAqIENPTE9SX1dBVkVfUEVBSywgMCwgQ09MT1JfV0FWRV9QRUFLKSxcbiAgICAgICk7XG4gICAgfVxuXG4gICAgcmV0dXJuIGJ1cnN0QWN0aXZlO1xuICB9XG5cbiAgZnVuY3Rpb24gZHJhd1JlZHVjZWQobm93KSB7XG4gICAgc3luY0FjdGl2ZUJ1cnN0cyhub3csIFJFRFVDRURfQlVSU1RfTVMpO1xuICAgIGxldCBlbXBoYXNpcyA9IDA7XG4gICAgZm9yIChjb25zdCBzdGFydGVkIG9mIGFjdGl2ZUJ1cnN0cykge1xuICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBjbGFtcCgobm93IC0gc3RhcnRlZC5zdGFydGVkQXQpIC8gUkVEVUNFRF9CVVJTVF9NUywgMCwgMSk7XG4gICAgICBlbXBoYXNpcyArPSAoMSAtIHNtb290aHN0ZXAocHJvZ3Jlc3MpKSAqIDAuNDQ7XG4gICAgfVxuICAgIGVtcGhhc2lzID0gY2xhbXAoZW1waGFzaXMsIDAsIDAuNzIpO1xuICAgIGNvbnN0IGJ1cnN0QWN0aXZlID0gYWN0aXZlQnVyc3RzLmxlbmd0aCA+IDA7XG4gICAgZHJhd0ZpZWxkKG5vdywgZW1waGFzaXMpO1xuICAgIHJldHVybiBidXJzdEFjdGl2ZTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHJlbmRlcihub3cpIHtcbiAgICBpZiAobmVlZHNSZW5kZXIpIHtcbiAgICAgIHN5bmNUaGVtZSgpO1xuICAgICAgc3luY01ldHJpY3MoKTtcbiAgICB9XG4gICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgbWV0cmljcy53aWR0aCwgbWV0cmljcy5oZWlnaHQpO1xuICAgIGNvbnRleHQuZ2xvYmFsQWxwaGEgPSAxO1xuXG4gICAgbGV0IGFuaW1hdGlvbkFjdGl2ZSA9IHRydWU7XG4gICAgaWYgKHJlZHVjZWRNb3Rpb24pIHtcbiAgICAgIGFuaW1hdGlvbkFjdGl2ZSA9IGRyYXdSZWR1Y2VkKG5vdyk7XG4gICAgICBzZXRTdGF0ZShhbmltYXRpb25BY3RpdmUgPyAncmVkdWNlZC1idXJzdCcgOiAncmVkdWNlZC1pZGxlJyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbnN0IGJ1cnN0QWN0aXZlID0gZHJhd0ZpZWxkKG5vdyk7XG4gICAgICBzZXRTdGF0ZShidXJzdEFjdGl2ZSA/ICdidXJzdCcgOiAnaWRsZScpO1xuICAgIH1cblxuICAgIGNvbnRleHQuZ2xvYmFsQWxwaGEgPSAxO1xuICAgIG5lZWRzUmVuZGVyID0gYm9kaWVzLmxlbmd0aCA9PT0gMDtcbiAgICByZXR1cm4gYW5pbWF0aW9uQWN0aXZlO1xuICB9XG5cbiAgZnVuY3Rpb24gcmVxdWVzdEZyYW1lKCkge1xuICAgIGlmIChkZXN0cm95ZWQgfHwgZnJhbWVJZCB8fCBkb2N1bWVudC5oaWRkZW4pIHJldHVybjtcbiAgICBmcmFtZUlkID0gd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZShzdGVwKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIHN0ZXAoKSB7XG4gICAgZnJhbWVJZCA9IDA7XG4gICAgaWYgKGRlc3Ryb3llZCB8fCBkb2N1bWVudC5oaWRkZW4pIHJldHVybjtcbiAgICBjb25zdCBub3cgPSBwZXJmb3JtYW5jZS5ub3coKTtcbiAgICBpZiAoIXN0YXJ0ZWRBdCkgc3RhcnRlZEF0ID0gbm93O1xuICAgIGNvbnN0IGFuaW1hdGlvbkFjdGl2ZSA9IHJlbmRlcihub3cpO1xuICAgIGlmICghcmVkdWNlZE1vdGlvbiB8fCBhbmltYXRpb25BY3RpdmUgfHwgbmVlZHNSZW5kZXIpIHJlcXVlc3RGcmFtZSgpO1xuICB9XG5cbiAgZnVuY3Rpb24gaGFuZGxlUmVzaXplKCkge1xuICAgIG5lZWRzUmVuZGVyID0gdHJ1ZTtcbiAgICByZXF1ZXN0RnJhbWUoKTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGhhbmRsZVZpc2liaWxpdHlDaGFuZ2UoKSB7XG4gICAgaWYgKGRvY3VtZW50LmhpZGRlbikge1xuICAgICAgaWYgKGZyYW1lSWQpIHdpbmRvdy5jYW5jZWxBbmltYXRpb25GcmFtZShmcmFtZUlkKTtcbiAgICAgIGZyYW1lSWQgPSAwO1xuICAgICAgc2V0U3RhdGUoJ3BhdXNlZCcpO1xuICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBuZWVkc1JlbmRlciA9IHRydWU7XG4gICAgcmVxdWVzdEZyYW1lKCk7XG4gIH1cblxuICBjb25zdCByZXNpemVPYnNlcnZlciA9IHR5cGVvZiBSZXNpemVPYnNlcnZlciA9PT0gJ2Z1bmN0aW9uJ1xuICAgID8gbmV3IFJlc2l6ZU9ic2VydmVyKGhhbmRsZVJlc2l6ZSlcbiAgICA6IG51bGw7XG4gIHJlc2l6ZU9ic2VydmVyPy5vYnNlcnZlKHN0YWdlKTtcbiAgY29uc3QgcXVpZXRab25lRWxlbWVudCA9IGdldFF1aWV0Wm9uZUVsZW1lbnQ/LigpO1xuICBpZiAocXVpZXRab25lRWxlbWVudCkgcmVzaXplT2JzZXJ2ZXI/Lm9ic2VydmUocXVpZXRab25lRWxlbWVudCk7XG4gIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdyZXNpemUnLCBoYW5kbGVSZXNpemUsIHsgcGFzc2l2ZTogdHJ1ZSB9KTtcbiAgZG9jdW1lbnQuYWRkRXZlbnRMaXN0ZW5lcigndmlzaWJpbGl0eWNoYW5nZScsIGhhbmRsZVZpc2liaWxpdHlDaGFuZ2UpO1xuXG4gIHJldHVybiB7XG4gICAgc3RhcnQoKSB7XG4gICAgICBpZiAoZGVzdHJveWVkKSByZXR1cm47XG4gICAgICBuZWVkc1JlbmRlciA9IHRydWU7XG4gICAgICByZXF1ZXN0RnJhbWUoKTtcbiAgICB9LFxuICAgIGJ1cnN0KG9yaWdpbiA9IG51bGwpIHtcbiAgICAgIGlmIChkZXN0cm95ZWQpIHJldHVybjtcbiAgICAgIGJ1cnN0Q291bnQgKz0gMTtcbiAgICAgIGJ1cnN0U3RhcnRlZEF0ID0gcGVyZm9ybWFuY2Uubm93KCk7XG4gICAgICBjb25zdCByZWN0ID0gY2FudmFzLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuICAgICAgY29uc3Qgb3JpZ2luWCA9IE51bWJlci5pc0Zpbml0ZShvcmlnaW4/LngpXG4gICAgICAgID8gY2xhbXAob3JpZ2luLnggLSByZWN0LmxlZnQsIDAsIG1ldHJpY3Mud2lkdGgpXG4gICAgICAgIDogbWV0cmljcy5jZW50ZXJYO1xuICAgICAgY29uc3Qgb3JpZ2luWSA9IE51bWJlci5pc0Zpbml0ZShvcmlnaW4/LnkpXG4gICAgICAgID8gY2xhbXAob3JpZ2luLnkgLSByZWN0LnRvcCwgMCwgbWV0cmljcy5oZWlnaHQpXG4gICAgICAgIDogbWV0cmljcy5jZW50ZXJZO1xuICAgICAgY29uc3QgbWF4RGlzdGFuY2UgPSBNYXRoLm1heChcbiAgICAgICAgTWF0aC5oeXBvdChvcmlnaW5YLCBvcmlnaW5ZKSxcbiAgICAgICAgTWF0aC5oeXBvdChtZXRyaWNzLndpZHRoIC0gb3JpZ2luWCwgb3JpZ2luWSksXG4gICAgICAgIE1hdGguaHlwb3Qob3JpZ2luWCwgbWV0cmljcy5oZWlnaHQgLSBvcmlnaW5ZKSxcbiAgICAgICAgTWF0aC5oeXBvdChtZXRyaWNzLndpZHRoIC0gb3JpZ2luWCwgbWV0cmljcy5oZWlnaHQgLSBvcmlnaW5ZKSxcbiAgICAgICkgKyAoKG1ldHJpY3MubWF4Qm9keVJhZGl1cyB8fCBtZXRyaWNzLmJvZHlSYWRpdXMpICogNCk7XG4gICAgICBhY3RpdmVCdXJzdHMucHVzaCh7XG4gICAgICAgIHN0YXJ0ZWRBdDogYnVyc3RTdGFydGVkQXQsXG4gICAgICAgIHg6IG9yaWdpblgsXG4gICAgICAgIHk6IG9yaWdpblksXG4gICAgICAgIG1heERpc3RhbmNlLFxuICAgICAgfSk7XG4gICAgICBpZiAoYWN0aXZlQnVyc3RzLmxlbmd0aCA+IE1BWF9BQ1RJVkVfQlVSU1RTKSB7XG4gICAgICAgIGFjdGl2ZUJ1cnN0cyA9IGFjdGl2ZUJ1cnN0cy5zbGljZShhY3RpdmVCdXJzdHMubGVuZ3RoIC0gTUFYX0FDVElWRV9CVVJTVFMpO1xuICAgICAgfVxuICAgICAgaWYgKGFjdGl2ZUJ1cnN0cy5sZW5ndGggPiBtYXhDb25jdXJyZW50QnVyc3RzKSBtYXhDb25jdXJyZW50QnVyc3RzID0gYWN0aXZlQnVyc3RzLmxlbmd0aDtcbiAgICAgIHN0YWdlLmRhdGFzZXQuY29udGFjdFJpcHBsZUJ1cnN0Q291bnQgPSBTdHJpbmcoYnVyc3RDb3VudCk7XG4gICAgICBzdGFnZS5kYXRhc2V0LmNvbnRhY3RSaXBwbGVBY3RpdmVCdXJzdENvdW50ID0gU3RyaW5nKGFjdGl2ZUJ1cnN0cy5sZW5ndGgpO1xuICAgICAgc3RhZ2UuZGF0YXNldC5jb250YWN0UmlwcGxlTWF4QWN0aXZlQnVyc3RzID0gU3RyaW5nKG1heENvbmN1cnJlbnRCdXJzdHMpO1xuICAgICAgc3RhZ2UuZGF0YXNldC5jb250YWN0UmlwcGxlTGFzdEJ1cnN0T3JpZ2luID0gYCR7b3JpZ2luWC50b0ZpeGVkKDIpfSwke29yaWdpblkudG9GaXhlZCgyKX1gO1xuICAgICAgc2V0U3RhdGUocmVkdWNlZE1vdGlvbiA/ICdyZWR1Y2VkLWJ1cnN0JyA6ICdidXJzdCcpO1xuICAgICAgaWYgKGRpYWdub3N0aWNzKSB7XG4gICAgICAgIGRpYWdub3N0aWNzLnRvdGFsQnVyc3RzICs9IDE7XG4gICAgICAgIGRpYWdub3N0aWNzLmFjdGl2ZUJ1cnN0Q291bnQgPSBhY3RpdmVCdXJzdHMubGVuZ3RoO1xuICAgICAgICBkaWFnbm9zdGljcy5tYXhDb25jdXJyZW50QnVyc3RzID0gbWF4Q29uY3VycmVudEJ1cnN0cztcbiAgICAgIH1cbiAgICAgIG5lZWRzUmVuZGVyID0gdHJ1ZTtcbiAgICAgIHJlcXVlc3RGcmFtZSgpO1xuICAgIH0sXG4gICAgdXBkYXRlQ29uZmlnKG5leHRDb25maWcpIHtcbiAgICAgIGlmIChkZXN0cm95ZWQpIHJldHVybjtcbiAgICAgIGNvbmZpZyA9IG5vcm1hbGl6ZUNvbnRhY3RSaXBwbGVDb25maWcobmV4dENvbmZpZyk7XG4gICAgICBsYXlvdXRLZXkgPSAnJztcbiAgICAgIG5lZWRzUmVuZGVyID0gdHJ1ZTtcbiAgICAgIHJlcXVlc3RGcmFtZSgpO1xuICAgIH0sXG4gICAgZGVzdHJveSgpIHtcbiAgICAgIGlmIChkZXN0cm95ZWQpIHJldHVybjtcbiAgICAgIGRlc3Ryb3llZCA9IHRydWU7XG4gICAgICBhY3RpdmVCdXJzdHMgPSBbXTtcbiAgICAgIGlmIChmcmFtZUlkKSB3aW5kb3cuY2FuY2VsQW5pbWF0aW9uRnJhbWUoZnJhbWVJZCk7XG4gICAgICBmcmFtZUlkID0gMDtcbiAgICAgIHJlc2l6ZU9ic2VydmVyPy5kaXNjb25uZWN0KCk7XG4gICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcigncmVzaXplJywgaGFuZGxlUmVzaXplKTtcbiAgICAgIGRvY3VtZW50LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Zpc2liaWxpdHljaGFuZ2UnLCBoYW5kbGVWaXNpYmlsaXR5Q2hhbmdlKTtcbiAgICAgIGNvbnRleHQuc2V0VHJhbnNmb3JtKDEsIDAsIDAsIDEsIDAsIDApO1xuICAgICAgY29udGV4dC5jbGVhclJlY3QoMCwgMCwgY2FudmFzLndpZHRoLCBjYW52YXMuaGVpZ2h0KTtcbiAgICAgIHNldFN0YXRlKCdkZXN0cm95ZWQnKTtcbiAgICAgIGlmIChkaWFnbm9zdGljcykge1xuICAgICAgICBkaWFnbm9zdGljcy5hY3RpdmVJbnN0YW5jZXMgPSBNYXRoLm1heCgwLCBkaWFnbm9zdGljcy5hY3RpdmVJbnN0YW5jZXMgLSAxKTtcbiAgICAgICAgZGlhZ25vc3RpY3MuZGVzdHJveWVkSW5zdGFuY2VzICs9IDE7XG4gICAgICAgIGRpYWdub3N0aWNzLmxhc3RTdGF0ZSA9ICdkZXN0cm95ZWQnO1xuICAgICAgICBkaWFnbm9zdGljcy5wb2ludGVyQWN0aXZlID0gZmFsc2U7XG4gICAgICAgIGRpYWdub3N0aWNzLnBvaW50ZXJSb3RhdGlvbiA9IDA7XG4gICAgICAgIGRpYWdub3N0aWNzLnBvaW50ZXJUYXJnZXQgPSAwO1xuICAgICAgICBkaWFnbm9zdGljcy5wb2ludGVyU3BlZWRCb29zdCA9IDA7XG4gICAgICAgIGRpYWdub3N0aWNzLmFjdGl2ZUJ1cnN0Q291bnQgPSAwO1xuICAgICAgfVxuICAgIH0sXG4gIH07XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFDO0FBQ1AsQ0FBQyxDQUFDLDRCQUE0QjtBQUM5QixDQUFDLENBQUMsNkJBQTZCO0FBQy9CLENBQUMsQ0FBQyw0QkFBNEI7QUFDOUIsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsbUJBQW1CLENBQUMsRUFBRSxDQUFDOztBQUVuRCxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLEtBQUssQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUM1QixLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuQixLQUFLLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ2pDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQixLQUFLLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQyxLQUFLLENBQUMseUJBQXlCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ3RDLEtBQUssQ0FBQyw4QkFBOEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDM0MsS0FBSyxDQUFDLGtCQUFrQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ3BDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQzVCLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ2hILEtBQUssQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDL0IsQ0FBQzs7QUFFRCxHQUFHLENBQUMsa0JBQWtCLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRTFCLFFBQVEsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDNUM7O0FBRUEsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlCOztBQUVBLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUI7O0FBRUEsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDM0Q7O0FBRUEsUUFBUSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDaEQsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGtDQUFrQyxDQUFDLENB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QUMsS0FBSyxDQUFDO0FBQ1osQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsb0JBQW9CO0FBQzFCLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRXJCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxZQUFZLENBQUMsQ0FBQztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxVQUFVLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLFFBQVE7QUFDaEcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1RSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO0FBQzlFLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsRUFBRSxD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QUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTs7QUFFcEUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQy9ELENBQUMsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM5RCxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ1QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYTtBQUN4RCxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMs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LENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDOztBQUUvRixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ25FLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVTtBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVM7QUFDbkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDeEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUNqQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUM7QUFDaEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLHVCQUF1QixDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztBQUNqRSxDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQztBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTTtBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxNQUFN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QUN0RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDO0FBQzFELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN2RCxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVKLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGlCQUFpQixDQUFDO0FBQ2xHLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsZUFBZSxDQUFDO0FBQ25ELENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDM0MsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxRQUFRLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUM7QUFDN0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxTQUFTO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsVUFBVTtBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLE1BQU07QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsbUJBQW1CLENBQUMsQ0FBQyxDQUFDLFdBQVc7QUFDNUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLDZCQUE2QixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDO0FBQ3JFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDO0FBQzVFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxXQUFXO0FBQ2hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLENBQUMsbUJBQW1CO0FBQzNELENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsWUFBWSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO0FBQ2pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNQLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDLFlBQVksQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxlQUFlO0FBQ3pFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUN6QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLFdBQVcsQ0FBQztBQUM1RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFlBQVk7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxZQUFZO0FBQ2xDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ2hGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUM3RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3hGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDL0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNO0FBQy9CLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQztBQUM5RCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUNYLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLElBQUk7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDaEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxLQUFLLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzVELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0wsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxRQUFRLENBQUMsWUFBWSxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO0FBQzdFLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQztBQUNwRixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQztBQUN0RSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDeEUsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxRQUFRLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQztBQUNmLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQy9ELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ3RGLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDckIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGFBQWE7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNKLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGFBQWE7QUFDeEIsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDbEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFNBQVM7QUFDbkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsa0JBQWtCLENBQUMsR0FBRyxDQUFDLENBQUMsU0FBUyxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLGVBQWUsQ0FBQzs7QUFFdkcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQztBQUNwQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ3hFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsYUFBYTtBQUN6RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsU0FBUyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHO0FBQ3JDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUN6RixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDdEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLGdCQUFnQjtBQUMzRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxhQUFhLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVTtBQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDO0FBQ3hELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7QUFDeEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsZUFBZSxDQUFDLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxlQUFlLENBQUM7QUFDeEcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxlQUFlOztBQUVyRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1YsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsWUFBWSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsaUJBQWlCO0FBQzVELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDcEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsZ0JBQWdCLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDWCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDckQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDO0FBQ2pGLENBQUMsQ0FB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QUMsQ0FBQyxJQUFJLENBQUMsR0FBRztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDcEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsT0FBTyxDQUFDO0FBQ3BELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQztBQUNyRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDckUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLGFBQWEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsSUFBSSxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxjQUFjO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPO0FBQ2xCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FB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