import {
  DEFAULT_CONTACT_RIPPLE_CONFIG,
  normalizeContactRippleConfig,
} from './contactRippleConfig.js';

const TAU = Math.PI * 2;
const REDUCED_BURST_MS = 620;
const MAX_DPR = 1.5;
const POINTER_FRESH_MS = 720;
const POINTER_MAX_ROTATION = Math.PI / 30;
const POINTER_ACTIVE_RESPONSE = 3.2;
const POINTER_RETURN_RESPONSE = 1.35;
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
  let burstCount = 0;
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
  const pointerMotion = {
    active: false,
    target: 0,
    rotation: 0,
    lastAt: -Infinity,
    lastInputAt: -Infinity,
    lastX: 0,
  };

  stage.dataset.contactRippleState = reducedMotion ? 'reduced-idle' : 'idle';
  stage.dataset.contactRippleBurstCount = '0';
  stage.dataset.contactRippleInstance = String(instanceId);
  stage.dataset.contactRipplePointerMode = reducedMotion ? 'disabled-reduced-motion' : 'alternating-soft';
  stage.dataset.contactRippleRingDirections = 'alternating';
  stage.dataset.contactRipplePointerMaxDegrees = (POINTER_MAX_ROTATION * (180 / Math.PI)).toFixed(2);
  if (diagnostics) {
    diagnostics.pointerActive = false;
    diagnostics.pointerRotation = 0;
    diagnostics.pointerTarget = 0;
  }

  function setState(nextState) {
    if (stage.dataset.contactRippleState === nextState) return;
    stage.dataset.contactRippleState = nextState;
    if (diagnostics) diagnostics.lastState = nextState;
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

    const minSide = Math.min(width, height);
    const bodyRadius = clamp(minSide * 0.0135, config.minBodyRadius, config.maxBodyRadius);
    const contentZone = getQuietZone(canvas, getQuietZoneElement?.());
    const contentCoreRadius = contentZone
      ? (Math.max(contentZone.halfWidth, contentZone.halfHeight) * 0.96)
        + (bodyRadius * config.ringGapScale * 0.75)
      : minSide * 0.3;
    const coreFadeEnd = clamp(contentCoreRadius, bodyRadius * 18, bodyRadius * 38);
    metrics = {
      width,
      height,
      centerX: width * 0.5,
      centerY: height * 0.5,
      maxRadius: Math.hypot(width * 0.5, height * 0.5) + (config.maxBodyRadius * 2),
      bodyRadius,
      coreFadeStart: Math.max(bodyRadius * 4.25, coreFadeEnd - (bodyRadius * config.ringGapScale * 1.25)),
      coreFadeEnd,
      dpr,
    };

    canvas.dataset.contactRippleBuffer = `${bufferWidth}x${bufferHeight}`;
    canvas.dataset.contactRippleDpr = dpr.toFixed(2);
    stage.dataset.contactRipplePaletteSize = String(spriteSet.palette.length);
    stage.dataset.contactRippleInnerAlpha = config.innerRingAlpha.toFixed(2);
    stage.dataset.contactRippleOuterAlpha = config.outerRingAlpha.toFixed(2);
    stage.dataset.contactRippleCoreFadeRadius = metrics.coreFadeEnd.toFixed(2);
    stage.dataset.contactRippleBurstRelease = 'smoothstep-tail';
    stage.dataset.contactRippleBallFinish = 'flat-fill';
    stage.dataset.contactRippleConfigControls = '16';
    const nextLayoutKey = [
      `${Math.round(width)}x${Math.round(height)}`,
      metrics.bodyRadius.toFixed(2),
      config.bodyGapScale.toFixed(2),
      config.ringGapScale.toFixed(2),
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

  function rebuildBodies() {
    const nextBodies = [];
    const bodyRadius = metrics.bodyRadius;
    const ringGap = bodyRadius * config.ringGapScale;
    const firstRingRadius = bodyRadius * 4.25;
    let ringIndex = 0;

    for (let ringRadius = firstRingRadius; ringRadius <= metrics.maxRadius; ringRadius += ringGap) {
      const circumference = TAU * ringRadius;
      const minimumSpacing = bodyRadius * 2 * config.bodyGapScale;
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
          phase: ringIndex * 0.12,
        });
      }
      ringIndex += 1;
    }

    bodies = nextBodies;
    stage.dataset.contactRippleBodyCount = String(bodies.length);
    stage.dataset.contactRippleBodyRadius = bodyRadius.toFixed(2);
  }

  function drawBall(x, y, radius, alpha, colorIndex) {
    if (alpha <= 0.003 || radius <= 0.1) return;
    const sprite = spriteSet.sprites[colorIndex % spriteSet.sprites.length];
    if (!sprite) return;
    const diameter = radius * 2.36;
    context.globalAlpha = clamp(alpha, 0, 1);
    context.drawImage(sprite, x - (diameter * 0.5), y - (diameter * 0.5), diameter, diameter);
  }

  function getBurstEnergy(baseRadius, progress) {
    if (progress < 0 || progress >= 1) return 0;
    const frontRadius = Math.pow(progress, 0.72) * metrics.maxRadius * config.burstTravelScale;
    const frontWidth = clamp(metrics.bodyRadius * 4.8, 38, 58);
    let energy = 0;

    for (let frontIndex = 0; frontIndex < config.burstFrontCount; frontIndex += 1) {
      const echoRadius = frontRadius - (frontIndex * frontWidth * 1.18);
      const distance = baseRadius - echoRadius;
      const width = frontWidth * (1 + (frontIndex * 0.18));
      const frontEnergy = Math.exp(-0.5 * ((distance / width) ** 2));
      energy += frontEnergy * (1 - (frontIndex * 0.22));
    }

    const releaseProgress = (progress - config.burstReleaseStart) / (1 - config.burstReleaseStart);
    const release = 1 - smoothstep(releaseProgress);
    return clamp(energy * release, 0, 1.35);
  }

  function getRingAlpha(baseRadius, energy) {
    const fadeSpan = Math.max(1, metrics.coreFadeEnd - metrics.coreFadeStart);
    const coreProgress = smoothstep((baseRadius - metrics.coreFadeStart) / fadeSpan);
    const idleAlpha = config.innerRingAlpha
      + ((config.outerRingAlpha - config.innerRingAlpha) * coreProgress);
    const burstLift = clamp(energy * 0.9, 0, 1);
    return idleAlpha + ((config.outerRingAlpha - idleAlpha) * burstLift);
  }

  function updatePointerRotation(now, isReduced) {
    const dt = lastMotionFrameAt
      ? clamp((now - lastMotionFrameAt) / 1000, 1 / 240, 1 / 20)
      : 1 / 60;
    lastMotionFrameAt = now;
    const pointerFresh = !isReduced
      && pointerMotion.active
      && now - pointerMotion.lastAt < POINTER_FRESH_MS;
    const target = pointerFresh ? pointerMotion.target : 0;
    const response = pointerFresh ? POINTER_ACTIVE_RESPONSE : POINTER_RETURN_RESPONSE;
    const alpha = 1 - Math.exp(-dt * response);
    pointerMotion.rotation += (target - pointerMotion.rotation) * alpha;
    if (!pointerFresh && Math.abs(pointerMotion.rotation) < 0.00005) pointerMotion.rotation = 0;
    if (diagnostics) {
      diagnostics.pointerActive = pointerFresh;
      diagnostics.pointerRotation = pointerMotion.rotation;
      diagnostics.pointerTarget = target;
    }
    return pointerMotion.rotation;
  }

  function drawField(now, reducedEmphasis = null) {
    const elapsed = now - startedAt;
    const isReduced = reducedEmphasis !== null;
    const pointerRotation = updatePointerRotation(now, isReduced);
    const burstElapsed = now - burstStartedAt;
    const burstProgress = burstElapsed / config.burstDurationMs;
    const burstActive = burstElapsed >= 0 && burstProgress < 1;

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
      let energy = !isReduced
        ? getBurstEnergy(body.baseRadius, burstProgress)
        : reducedEmphasis;
      if (!burstActive && !isReduced) energy = 0;

      const reboundPhase = energy > 0
        ? Math.sin((burstProgress * TAU * 1.8) - (body.baseRadius * 0.012))
        : 0;
      const radialKick = isReduced
        ? 0
        : energy * config.burstDisplacement * (0.78 + (reboundPhase * 0.22));
      const tangentialKick = !isReduced && energy > 0
        ? energy * Math.sin((body.angle * 5) + (burstProgress * TAU)) * config.burstTwist
        : 0;
      const renderedRadius = body.baseRadius + idleOffset + radialKick;
      const ringDepth = clamp(body.baseRadius / metrics.maxRadius, 0, 1);
      const renderedAngle = body.angle
        + (pointerRotation * body.ringDirection * (0.58 + (ringDepth * 0.42)));
      const cos = Math.cos(renderedAngle);
      const sin = Math.sin(renderedAngle);
      const x = metrics.centerX + (cos * renderedRadius) - (sin * tangentialKick);
      const y = metrics.centerY + (sin * renderedRadius) + (cos * tangentialKick);
      drawBall(
        x,
        y,
        metrics.bodyRadius,
        getRingAlpha(body.baseRadius, energy),
        body.colorIndex,
      );
    }

    return burstActive;
  }

  function drawReduced(now) {
    const burstProgress = clamp((now - burstStartedAt) / REDUCED_BURST_MS, 0, 1);
    const burstActive = now - burstStartedAt >= 0 && burstProgress < 1;
    const emphasis = burstActive ? (1 - smoothstep(burstProgress)) * 0.44 : 0;
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

  function resetPointerMotion() {
    pointerMotion.active = false;
    pointerMotion.target = 0;
    pointerMotion.lastInputAt = -Infinity;
    requestFrame();
  }

  function handlePointerMove(event) {
    if (reducedMotion || (event.pointerType && event.pointerType !== 'mouse')) return;
    const rect = stage.getBoundingClientRect();
    const localX = event.clientX - rect.left;
    const localY = event.clientY - rect.top;
    const inside = localX >= 0 && localX <= rect.width && localY >= 0 && localY <= rect.height;
    if (!inside || rect.width <= 0 || rect.height <= 0) {
      resetPointerMotion();
      return;
    }

    const now = performance.now();
    const xNorm = clamp(((localX / rect.width) - 0.5) * 2, -1, 1);
    const yNorm = clamp(((localY / rect.height) - 0.5) * 2, -1, 1);
    const inputDt = Number.isFinite(pointerMotion.lastInputAt)
      ? clamp((now - pointerMotion.lastInputAt) / 1000, 1 / 240, 0.1)
      : 1 / 60;
    const velocityX = Number.isFinite(pointerMotion.lastInputAt)
      ? clamp((localX - pointerMotion.lastX) / Math.max(1, rect.width) / inputDt, -0.9, 0.9)
      : 0;
    const influence = (xNorm * 0.72) + (yNorm * 0.10) + (velocityX * 0.18);
    pointerMotion.active = true;
    pointerMotion.target = clamp(influence * POINTER_MAX_ROTATION, -POINTER_MAX_ROTATION, POINTER_MAX_ROTATION);
    pointerMotion.lastAt = now;
    pointerMotion.lastInputAt = now;
    pointerMotion.lastX = localX;
    requestFrame();
  }

  function handlePointerOut(event) {
    if (event.relatedTarget) return;
    resetPointerMotion();
  }

  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(handleResize)
    : null;
  resizeObserver?.observe(stage);
  const quietZoneElement = getQuietZoneElement?.();
  if (quietZoneElement) resizeObserver?.observe(quietZoneElement);
  window.addEventListener('resize', handleResize, { passive: true });
  document.addEventListener('visibilitychange', handleVisibilityChange);
  if (!reducedMotion) {
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerout', handlePointerOut, { passive: true });
    window.addEventListener('blur', resetPointerMotion);
  }

  return {
    start() {
      if (destroyed) return;
      needsRender = true;
      requestFrame();
    },
    burst() {
      if (destroyed) return;
      burstCount += 1;
      burstStartedAt = performance.now();
      stage.dataset.contactRippleBurstCount = String(burstCount);
      setState(reducedMotion ? 'reduced-burst' : 'burst');
      if (diagnostics) diagnostics.totalBursts += 1;
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
      if (frameId) window.cancelAnimationFrame(frameId);
      frameId = 0;
      resizeObserver?.disconnect();
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerout', handlePointerOut);
      window.removeEventListener('blur', resetPointerMotion);
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
      }
    },
  };
}
