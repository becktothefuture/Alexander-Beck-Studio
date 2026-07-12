const TAU = Math.PI * 2;
const IDLE_WAVE_LENGTH = 128;
const IDLE_WAVE_SPEED = 0.00030;
const IDLE_SECONDARY_SPEED = 0.00012;
const IDLE_DISPLACEMENT = 1.65;
const BURST_DURATION_MS = 1650;
const BURST_FRONT_COUNT = 3;
const BURST_DISPLACEMENT = 56;
const BURST_TRAVEL_SCALE = 1.12;
const BURST_RELEASE_START = 0.72;
const REDUCED_BURST_MS = 620;
const MAX_DPR = 1.5;
const MIN_BODY_RADIUS = 8.6;
const MAX_BODY_RADIUS = 10.4;
const BODY_GAP_SCALE = 2.3;
const RING_GAP_SCALE = 4.65;
const INNER_RING_ALPHA = 0.06;
const OUTER_RING_ALPHA = 1;
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

function hexToRgb(color) {
  const value = Number.parseInt(color.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function drawContactBallRim(context, center, radius, color) {
  const [red, green, blue] = hexToRgb(color);
  const lineWidth = radius * 0.12;
  const gradient = context.createLinearGradient(
    center - (radius * 0.1),
    center - (radius * 0.15),
    center + (radius * 0.1),
    center + (radius * 0.15),
  );
  const light = `${red + ((255 - red) * 0.35) | 0},${green + ((255 - green) * 0.35) | 0},${blue + ((255 - blue) * 0.35) | 0}`;
  const shadow = `${(red * 0.65) | 0},${(green * 0.65) | 0},${(blue * 0.65) | 0}`;
  const base = `${red},${green},${blue}`;

  gradient.addColorStop(0, `rgba(${light}, 0.6)`);
  gradient.addColorStop(0.33, `rgba(${base}, 0)`);
  gradient.addColorStop(0.83, `rgba(${base}, 0)`);
  gradient.addColorStop(1, `rgba(${shadow}, 0.4)`);
  context.strokeStyle = gradient;
  context.lineWidth = lineWidth;
  context.beginPath();
  context.arc(center, center, radius - (lineWidth * 0.55), 0, TAU);
  context.stroke();
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
  drawContactBallRim(context, center, radius, color);
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
  reducedMotion = false,
}) {
  const context = canvas?.getContext('2d', { alpha: true });
  if (!canvas || !stage || !context) {
    return {
      start() {},
      burst() {},
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
  let metrics = {
    width: 1,
    height: 1,
    centerX: 0.5,
    centerY: 0.5,
    maxRadius: 1,
    bodyRadius: MIN_BODY_RADIUS,
    coreFadeStart: MIN_BODY_RADIUS * 4.25,
    coreFadeEnd: MIN_BODY_RADIUS * 12,
    dpr: 1,
  };
  let spriteSet = createSpriteSet(getTheme?.());
  let bodies = [];
  let layoutKey = '';

  stage.dataset.contactRippleState = reducedMotion ? 'reduced-idle' : 'idle';
  stage.dataset.contactRippleBurstCount = '0';
  stage.dataset.contactRippleInstance = String(instanceId);

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
    const bodyRadius = clamp(minSide * 0.0135, MIN_BODY_RADIUS, MAX_BODY_RADIUS);
    const contentZone = getQuietZone(canvas, getQuietZoneElement?.());
    const contentCoreRadius = contentZone
      ? (Math.max(contentZone.halfWidth, contentZone.halfHeight) * 0.96)
        + (bodyRadius * RING_GAP_SCALE * 0.75)
      : minSide * 0.3;
    const coreFadeEnd = clamp(contentCoreRadius, bodyRadius * 18, bodyRadius * 38);
    metrics = {
      width,
      height,
      centerX: width * 0.5,
      centerY: height * 0.5,
      maxRadius: Math.hypot(width * 0.5, height * 0.5) + (MAX_BODY_RADIUS * 2),
      bodyRadius,
      coreFadeStart: Math.max(bodyRadius * 4.25, coreFadeEnd - (bodyRadius * RING_GAP_SCALE * 1.25)),
      coreFadeEnd,
      dpr,
    };

    canvas.dataset.contactRippleBuffer = `${bufferWidth}x${bufferHeight}`;
    canvas.dataset.contactRippleDpr = dpr.toFixed(2);
    stage.dataset.contactRipplePaletteSize = String(spriteSet.palette.length);
    stage.dataset.contactRippleInnerAlpha = INNER_RING_ALPHA.toFixed(2);
    stage.dataset.contactRippleOuterAlpha = OUTER_RING_ALPHA.toFixed(2);
    stage.dataset.contactRippleCoreFadeRadius = metrics.coreFadeEnd.toFixed(2);
    stage.dataset.contactRippleBurstRelease = 'smoothstep-tail';
    const nextLayoutKey = `${Math.round(width)}x${Math.round(height)}:${metrics.bodyRadius.toFixed(2)}:${spriteSet.key}`;
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
    const ringGap = bodyRadius * RING_GAP_SCALE;
    const firstRingRadius = bodyRadius * 4.25;
    let ringIndex = 0;

    for (let ringRadius = firstRingRadius; ringRadius <= metrics.maxRadius; ringRadius += ringGap) {
      const circumference = TAU * ringRadius;
      const minimumSpacing = bodyRadius * 2 * BODY_GAP_SCALE;
      const beadCount = clamp(Math.floor(circumference / minimumSpacing), 6, 164);
      const angleOffset = (ringIndex % 2 === 0 ? 0 : Math.PI / beadCount) + (ringIndex * 0.071);

      for (let beadIndex = 0; beadIndex < beadCount; beadIndex += 1) {
        const angle = angleOffset + ((beadIndex / beadCount) * TAU);
        nextBodies.push({
          angle,
          baseRadius: ringRadius,
          ringIndex,
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
    const frontRadius = Math.pow(progress, 0.72) * metrics.maxRadius * BURST_TRAVEL_SCALE;
    const frontWidth = clamp(metrics.bodyRadius * 4.8, 38, 58);
    let energy = 0;

    for (let frontIndex = 0; frontIndex < BURST_FRONT_COUNT; frontIndex += 1) {
      const echoRadius = frontRadius - (frontIndex * frontWidth * 1.18);
      const distance = baseRadius - echoRadius;
      const width = frontWidth * (1 + (frontIndex * 0.18));
      const frontEnergy = Math.exp(-0.5 * ((distance / width) ** 2));
      energy += frontEnergy * (1 - (frontIndex * 0.22));
    }

    const releaseProgress = (progress - BURST_RELEASE_START) / (1 - BURST_RELEASE_START);
    const release = 1 - smoothstep(releaseProgress);
    return clamp(energy * release, 0, 1.35);
  }

  function getRingAlpha(baseRadius, energy) {
    const fadeSpan = Math.max(1, metrics.coreFadeEnd - metrics.coreFadeStart);
    const coreProgress = smoothstep((baseRadius - metrics.coreFadeStart) / fadeSpan);
    const idleAlpha = INNER_RING_ALPHA + ((OUTER_RING_ALPHA - INNER_RING_ALPHA) * coreProgress);
    const burstLift = clamp(energy * 0.9, 0, 1);
    return idleAlpha + ((OUTER_RING_ALPHA - idleAlpha) * burstLift);
  }

  function drawField(now, reducedEmphasis = null) {
    const elapsed = now - startedAt;
    const isReduced = reducedEmphasis !== null;
    const burstElapsed = now - burstStartedAt;
    const burstProgress = burstElapsed / BURST_DURATION_MS;
    const burstActive = burstElapsed >= 0 && burstProgress < 1;

    for (let bodyIndex = 0; bodyIndex < bodies.length; bodyIndex += 1) {
      const body = bodies[bodyIndex];
      const idlePhase = ((body.baseRadius / IDLE_WAVE_LENGTH) * TAU)
        - (isReduced ? 0 : elapsed * IDLE_WAVE_SPEED)
        + body.phase;
      const primarySwell = Math.sin(idlePhase);
      const secondarySwell = Math.sin(
        (idlePhase * 0.52) - (isReduced ? 0 : elapsed * IDLE_SECONDARY_SPEED) + 1.15,
      );
      const idleWave = (primarySwell * 0.76) + (secondarySwell * 0.24);
      const idleOffset = isReduced ? 0 : idleWave * IDLE_DISPLACEMENT;
      let energy = !isReduced
        ? getBurstEnergy(body.baseRadius, burstProgress)
        : reducedEmphasis;
      if (!burstActive && !isReduced) energy = 0;

      const reboundPhase = energy > 0
        ? Math.sin((burstProgress * TAU * 1.8) - (body.baseRadius * 0.012))
        : 0;
      const radialKick = isReduced ? 0 : energy * BURST_DISPLACEMENT * (0.78 + (reboundPhase * 0.22));
      const tangentialKick = !isReduced && energy > 0
        ? energy * Math.sin((body.angle * 5) + (burstProgress * TAU)) * 4.5
        : 0;
      const renderedRadius = body.baseRadius + idleOffset + radialKick;
      const cos = Math.cos(body.angle);
      const sin = Math.sin(body.angle);
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
    destroy() {
      if (destroyed) return;
      destroyed = true;
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
      }
    },
  };
}
