import { CONCEPT_SIMULATION_IDS } from './conceptSimulationConfigs.js';
import {
  createContinuousSimulationVisualTransition,
  registerSimulationVisualTransition,
} from '../../lib/simulationVisualTransition.js';
import {
  triggerDetent,
  triggerPressure,
  triggerRelease,
} from '../../legacy/modules/audio/simulation-audio-adapter.js';
import {
  isMobileSimulationViewport,
  resolveMobileSimulationBodyScale,
} from '../../lib/mobileSimulationSizing.js';
import {
  DEFAULT_SIMULATION_COLOR_DISTRIBUTION,
  FALLBACK_SIMULATION_PALETTE_COLORS,
  resolveSimulationMaterialColorIndex,
  resolveSimulationPaletteColors,
} from '../../palette/simulationPaletteContract.js';
import { selectSimulationMaterialRole } from '../../palette/simulationPaletteController.js';
import { notifySimulationAtmosphereSourceFrame } from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';
import { advanceFrameScheduler } from '../../lib/frame-cadence.js';
import { syncCanvasDisplayMetrics } from '../../lib/canvas-display-metrics.js';
import { normalizeHomeSimulationBodyRadius } from '../../lib/homeSimulationSizing.js';

const TAU = Math.PI * 2;
const REFERENCE_AREA = 1440 * 900;
const DEFAULT_TARGET_FPS = 60;
const REDUCED_MOTION_TARGET_FPS = 30;
const DEFAULT_THEME = {
  active: '#202020',
  palette: FALLBACK_SIMULATION_PALETTE_COLORS,
  colorDistribution: DEFAULT_SIMULATION_COLOR_DISTRIBUTION,
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function markAuditFrame(canvas) {
  if (!canvas || globalThis.__ABS_ROUTE_PERF_AUDIT__ !== true) return;
  canvas.__absAuditFrameCount = (Number(canvas.__absAuditFrameCount) || 0) + 1;
}

function smoothstep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - (2 * t));
}

function mulberry32(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let next = state;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '').trim());
}

function resolvePalette(theme) {
  const source = Array.isArray(theme?.palette) ? theme.palette : DEFAULT_THEME.palette;
  return resolveSimulationPaletteColors(source.filter(isHexColor));
}

function pickWeightedColor(random, theme) {
  const palette = resolvePalette(theme);
  const role = selectSimulationMaterialRole(random(), theme?.paletteSnapshot || theme);
  return { color: palette[role?.colorIndex || 0] || palette[0], role };
}

function resolveDpr(config) {
  const deviceDpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const configuredMax = clamp(Number(config.maxDpr) || 1.5, 0.75, 2);
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth || 1024;
  const mobileMax = viewportWidth < 520 ? 1.15 : (viewportWidth < 820 ? 1.3 : configuredMax);
  return clamp(Math.min(deviceDpr, configuredMax, mobileMax), 0.75, 2);
}

function getScaledRadius(config, metrics, theme, configuredRadius = null) {
  if (Number.isFinite(Number(configuredRadius))) {
    return normalizeHomeSimulationBodyRadius(configuredRadius)
      * resolveMobileSimulationBodyScale(theme?.mobileSimulationBodyScale, metrics);
  }
  const areaScale = Math.sqrt((metrics.cssWidth * metrics.cssHeight) / REFERENCE_AREA);
  const mobileScale = metrics.cssWidth < 680 ? Number(config.mobileRadiusScale || 0.86) : 1;
  const minRadius = metrics.cssWidth < 680 ? 6.2 : 5.8;
  const responsiveRadius = clamp(
    Number(config.bodyRadius || 9) * areaScale * mobileScale,
    minRadius,
    17,
  );
  return responsiveRadius * resolveMobileSimulationBodyScale(
    theme?.mobileSimulationBodyScale,
    metrics,
  );
}

function getScaledRadiusRange(config, metrics, theme) {
  const areaScale = Math.sqrt((metrics.cssWidth * metrics.cssHeight) / REFERENCE_AREA);
  const mobileScale = metrics.cssWidth < 680 ? Number(config.mobileRadiusScale || 0.86) : 1;
  const responsiveMinRadius = clamp(Number(config.minRadius || 6.8) * areaScale * mobileScale, 4.8, 13);
  const responsiveMaxRadius = clamp(
    Number(config.maxRadius || 11.8) * areaScale * mobileScale,
    responsiveMinRadius + 0.8,
    18,
  );
  const mobileBodyScale = resolveMobileSimulationBodyScale(
    theme?.mobileSimulationBodyScale,
    metrics,
  );

  return {
    minRadius: responsiveMinRadius * mobileBodyScale,
    maxRadius: responsiveMaxRadius * mobileBodyScale,
  };
}

function getMobileDensityScale(config, metrics) {
  if (metrics.cssWidth >= 680) return 1;
  return clamp(Number(config.mobileDensityScale || 0.64), 0.36, 1);
}

function getTitleReserveZone(config, metrics) {
  const width = metrics.cssWidth * clamp(Number(config.titleReserveWidth) || 0.56, 0.24, 0.9);
  const height = metrics.cssHeight * clamp(Number(config.titleReserveHeight) || 0.24, 0.12, 0.42);
  const centerY = metrics.cssHeight * clamp(Number(config.titleReserveY) || 0.5, 0.28, 0.68);

  return {
    cx: metrics.cssWidth * 0.5,
    cy: centerY,
    rx: width * 0.5,
    ry: height * 0.5,
  };
}

function isInsideTitleReserve(x, y, radius, reserve) {
  const safeRx = Math.max(1, reserve.rx + radius);
  const safeRy = Math.max(1, reserve.ry + radius);
  const nx = (x - reserve.cx) / safeRx;
  const ny = (y - reserve.cy) / safeRy;
  return (nx * nx) + (ny * ny) < 1;
}

function getOuterSimulationZone(metrics, reserve) {
  return {
    cx: reserve.cx,
    cy: reserve.cy,
    rx: metrics.cssWidth * (metrics.cssWidth < 680 ? 0.43 : 0.42),
    ry: metrics.cssHeight * (metrics.cssWidth < 680 ? 0.34 : 0.36),
  };
}

function getEllipseCircumference(rx, ry) {
  return Math.PI * (3 * (rx + ry) - Math.sqrt((3 * rx + ry) * (rx + 3 * ry)));
}

function pushPointOutsideTitleReserve(x, y, radius, reserve, padding = 1.018) {
  const safeRx = Math.max(1, reserve.rx + radius);
  const safeRy = Math.max(1, reserve.ry + radius);
  const dx = x - reserve.cx;
  const dy = y - reserve.cy;
  const nx = dx / safeRx;
  const ny = dy / safeRy;
  const distance = Math.hypot(nx, ny);

  if (distance >= 1) {
    return { x, y, pushed: false };
  }

  if (distance < 0.0001) {
    return {
      x: reserve.cx + (safeRx * padding),
      y: reserve.cy,
      pushed: true,
    };
  }

  const scale = padding / distance;
  return {
    x: reserve.cx + (dx * scale),
    y: reserve.cy + (dy * scale),
    pushed: true,
  };
}

function pushOutsideTitleReserve(body, reserve) {
  const next = pushPointOutsideTitleReserve(body.x, body.y, body.r, reserve);
  if (!next.pushed) return;

  body.x = next.x;
  body.y = next.y;
  body.vx *= 0.24;
  body.vy *= 0.24;
}

function pushHomeOutsideTitleReserve(body, reserve) {
  const next = pushPointOutsideTitleReserve(body.homeX, body.homeY, body.r, reserve, 1.04);
  if (!next.pushed) return;

  body.homeX = next.x;
  body.homeY = next.y;
}

function createPebbleShape(random) {
  const pointCount = 14;
  const points = [];
  for (let i = 0; i < pointCount; i += 1) {
    const angle = (i / pointCount) * TAU;
    const radius = 0.93 + (random() * 0.14);
    points.push({ angle, radius });
  }
  return points;
}

function drawPebble(ctx, body, visualScale = 1) {
  const points = body.shape;
  const radius = body.r * visualScale;
  if (radius <= 0.05) return;
  const previousAlpha = ctx.globalAlpha;
  const opacity = clamp(Number(body.opacity ?? 1), 0, 1);
  if (opacity <= 0.001) return;
  if (opacity < 1) ctx.globalAlpha = previousAlpha * opacity;
  ctx.save();
  ctx.translate(body.x, body.y);
  ctx.rotate(body.rotation);
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const x = Math.cos(current.angle) * current.radius * radius;
    const y = Math.sin(current.angle) * current.radius * radius;
    const nextX = Math.cos(next.angle) * next.radius * radius;
    const nextY = Math.sin(next.angle) * next.radius * radius;
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.quadraticCurveTo(x, y, (x + nextX) * 0.5, (y + nextY) * 0.5);
    }
  }
  ctx.closePath();
  ctx.fillStyle = body.color;
  ctx.fill();
  ctx.restore();
  ctx.globalAlpha = previousAlpha;
}

function drawCircle(ctx, body, visualScale = 1) {
  const radius = body.r * visualScale;
  if (radius <= 0.05) return;
  const previousAlpha = ctx.globalAlpha;
  const opacity = clamp(Number(body.opacity ?? 1), 0, 1);
  if (opacity <= 0.001) return;
  if (opacity < 1) ctx.globalAlpha = previousAlpha * opacity;
  ctx.beginPath();
  ctx.arc(body.x, body.y, radius, 0, TAU);
  ctx.fillStyle = body.color;
  ctx.fill();
  ctx.globalAlpha = previousAlpha;
}

function drawBody(ctx, body, visualScale = 1) {
  if (body.shapeKind === 'circle') {
    drawCircle(ctx, body, visualScale);
    return;
  }

  drawPebble(ctx, body, visualScale);
}

function makeBody(random, theme, x, y, r, extra = {}) {
  const shapeKind = extra.shapeKind || 'pebble';
  const material = pickWeightedColor(random, theme);
  return {
    x,
    y,
    homeX: x,
    homeY: y,
    vx: 0,
    vy: 0,
    r: r * (0.9 + random() * 0.18),
    color: material.color,
    roleId: material.role?.roleId || '',
    distributionIndex: material.role?.distributionIndex || 0,
    colorIndex: material.role?.colorIndex || 0,
    rotation: random() * TAU,
    spin: (random() - 0.5) * 0.018,
    shape: shapeKind === 'circle' ? null : createPebbleShape(random),
    shapeKind,
    phase: random() * TAU,
    ...extra,
  };
}

function buildApertureBodies(random, config, theme, metrics) {
  const bodies = [];
  const cx = metrics.cssWidth * 0.5;
  const cy = metrics.cssHeight * 0.5;
  const r = getScaledRadius(config, metrics, theme);
  const reserve = getTitleReserveZone(config, metrics);
  const outer = getOuterSimulationZone(metrics, reserve);
  const rings = Math.round(config.rings || 6);
  const ringStepX = Math.max(1, (outer.rx - reserve.rx) / (rings + 0.35));
  const ringStepY = Math.max(1, (outer.ry - reserve.ry) / (rings + 0.35));

  for (let ring = 1; ring <= rings; ring += 1) {
    const rx = reserve.rx + (ringStepX * ring);
    const ry = reserve.ry + (ringStepY * ring);
    const spacing = r * Number(config.ringSpacing || 2.85) * 1.9;
    let count = Math.max(18, Math.round(getEllipseCircumference(rx, ry) / spacing));
    if (count % 2 !== 0) count += 1;
    const ringOffset = ring % 2 === 0 ? TAU / (count * 2) : 0;
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * TAU + ringOffset;
      const x = cx + (Math.cos(angle) * rx);
      const y = cy + (Math.sin(angle) * ry);
      if (isInsideTitleReserve(x, y, r * 1.15, reserve)) continue;
      bodies.push(makeBody(
        random,
        theme,
        x,
        y,
        r,
        { ring, angle, baseRx: rx, baseRy: ry, ringDirection: ring % 2 === 0 ? 1 : -1, shapeKind: 'circle' },
      ));
    }
  }

  return bodies;
}

function buildConfluenceBridgeBodies(random, config, theme, metrics) {
  const bodies = [];
  const outerHubCount = Math.round(clamp(Number(config.hubCount || 5), 3, 7));
  const densityScale = getMobileDensityScale(config, metrics);
  const requestedCount = Math.round(clamp(Number(config.ballCount || 112), 36, 180));
  const bridgeCount = Math.max(outerHubCount * 7, Math.round((requestedCount - outerHubCount - 1) * densityScale));
  const { minRadius, maxRadius } = getScaledRadiusRange(config, metrics, theme);
  const cx = metrics.cssWidth * 0.5;
  const cy = metrics.cssHeight * (metrics.cssWidth < 680 ? 0.49 : 0.48);
  const isMobile = metrics.cssWidth < 680;
  const orbitRx = metrics.cssWidth * (isMobile ? 0.29 : 0.34);
  const orbitRy = metrics.cssHeight * (isMobile ? 0.31 : 0.28);
  const hubRadiusBase = maxRadius * Number(config.hubRadiusScale || 1.82);

  bodies.push(makeBody(random, theme, cx, cy, hubRadiusBase * 1.18, {
    kind: 'hub',
    hubIndex: 0,
    isCenterHub: true,
    baseX: cx,
    baseY: cy,
    weight: 1.18,
    spin: 0.004,
    shapeKind: 'circle',
  }));

  for (let index = 0; index < outerHubCount; index += 1) {
    const angle = (-Math.PI / 2) + ((index / outerHubCount) * TAU);
    const weight = 0.82 + (random() * 0.48) + (index === 0 ? 0.28 : 0);
    const x = cx + Math.cos(angle) * orbitRx;
    const y = cy + Math.sin(angle) * orbitRy;
    bodies.push(makeBody(random, theme, x, y, hubRadiusBase * weight, {
      kind: 'hub',
      hubIndex: index + 1,
      baseAngle: angle,
      orbitRx,
      orbitRy,
      weight,
      orbitSpeed: (index % 2 === 0 ? 1 : -1) * (0.024 + random() * 0.018),
      spin: (index % 2 === 0 ? 1 : -1) * 0.006,
      shapeKind: 'circle',
    }));
  }

  const perBridge = Math.ceil(bridgeCount / outerHubCount);
  for (let index = 0; index < bridgeCount; index += 1) {
    const bridgeIndex = index % outerHubCount;
    const outerIndex = bridgeIndex + 1;
    const bridgeSlot = Math.floor(index / outerHubCount);
    const uBase = (bridgeSlot + 1) / (perBridge + 1);
    const u = clamp(uBase + ((random() - 0.5) * 0.018), 0.04, 0.96);
    const maturity = smoothstep(1 - Math.abs((u * 2) - 1));
    const r = minRadius + ((maxRadius - minRadius) * (0.18 + maturity * 0.5 + random() * 0.22));
    const a = bodies[outerIndex];
    const b = bodies[0];
    const x = a.x + ((b.x - a.x) * u);
    const y = a.y + ((b.y - a.y) * u);

    bodies.push(makeBody(random, theme, x, y, r, {
      kind: 'bridge',
      bridgeIndex,
      aIndex: outerIndex,
      bIndex: 0,
      u,
      bow: (bridgeIndex % 2 === 0 ? 1 : -1) * (0.42 + random() * 0.38),
      maturity,
      spin: (random() - 0.5) * 0.012,
      shapeKind: 'circle',
    }));
  }

  return bodies;
}

function buildRiftRingBodies(random, config, theme, metrics, configuredRadius = null) {
  const bodies = [];
  const isMobile = isMobileSimulationViewport(metrics);
  const ringCount = Math.round(clamp(Number(
    isMobile ? config.mobileRings : config.rings,
  ) || (isMobile ? 10 : 11), 6, 18));
  const density = clamp(Number(config.ringDensity || 0.82), 0.32, 1.2);
  const densityScale = isMobile
    ? clamp(Number(config.mobileDensityScale || 0.58), 0.32, 0.9)
    : 1;
  const cx = metrics.cssWidth * 0.5;
  const cy = metrics.cssHeight * 0.5;
  const responsiveBaseRadius = getScaledRadius(config, metrics, theme, configuredRadius);
  const baseRadius = isMobile
    ? Math.max(
      responsiveBaseRadius,
      clamp(Number(config.mobileBaseRadiusMin ?? 6.2), 4, 12),
    )
    : responsiveBaseRadius;
  const minDim = Math.min(metrics.cssWidth, metrics.cssHeight);
  const innerRadius = minDim * (isMobile ? 0.18 : 0.14);
  const outerRadius = isMobile
    ? minDim * clamp(Number(config.mobileOuterRadiusScale || 0.62), 0.4, 1.1)
    : Math.hypot(metrics.cssWidth, metrics.cssHeight)
      * 0.5
      * clamp(Number(config.outerRadiusScale || 1.08), 0.9, 1.95);
  const ringSpacing = clamp(Number(config.ringSpacing || 1.42), 0.9, 2.1);
  const centerRadiusScale = clamp(Number(
    isMobile ? config.mobileCenterRadiusScale : config.centerRadiusScale,
  ) || (isMobile ? 0.55 : 0.46), 0.24, 0.9);
  const centerFogMin = clamp(Number(
    (isMobile ? config.mobileCenterFogMin : config.centerFogMin)
      ?? (isMobile ? 0.3 : 0.24),
  ), 0.08, 1);
  const centerFogStart = clamp(Number(config.centerFogStart ?? 0.82), 0, 1);
  const centerFogRingCount = Math.round(clamp(Number(
    (isMobile ? config.mobileCenterFogRingCount : config.centerFogRingCount) ?? 2,
  ), 0, 4));

  for (let ring = 0; ring < ringCount; ring += 1) {
    const ringT = ringCount <= 1 ? 0 : ring / (ringCount - 1);
    const easedT = Math.pow(ringT, 0.86);
    const depthT = smoothstep(ringT);
    const depthRadius = Number.isFinite(Number(configuredRadius))
      ? baseRadius
      : baseRadius * (centerRadiusScale + ((1 - centerRadiusScale) * depthT));
    const fogT = centerFogRingCount <= 0 ? 1 : ring / Math.max(1, centerFogRingCount);
    const depthOpacity = ring < centerFogRingCount
      ? centerFogMin + ((1 - centerFogMin) * smoothstep(fogT * centerFogStart))
      : 1;
    const radiusBase = innerRadius + ((outerRadius - innerRadius) * easedT);
    const circumference = Math.max(1, TAU * radiusBase);
    const bodySpacing = baseRadius * 2 * ringSpacing * 1.86;
    let count = Math.max(14, Math.round(circumference / Math.max(1, bodySpacing) * density * densityScale));
    if (count % 2 !== 0) count += 1;
    count = Math.min(isMobile ? 96 : 164, count);
    const ringOffset = ring % 2 === 0 ? 0 : TAU / (count * 2);
    const direction = ring % 2 === 0 ? 1 : -1;
    const ringPhase = ring * 0.73;

    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * TAU + ringOffset;
      const x = cx + Math.cos(angle) * radiusBase;
      const y = cy + Math.sin(angle) * radiusBase;
      bodies.push(makeBody(random, theme, x, y, depthRadius, {
        kind: 'rift-ring',
        r: depthRadius,
        ring,
        ringT,
        ringDirection: direction,
        ringAngle: angle,
        ringRadiusBase: radiusBase,
        ringPhase,
        opacity: depthOpacity,
        spin: direction * 0.004,
        shapeKind: 'circle',
      }));
    }
  }

  return bodies;
}

function applySeparation(bodies, iterations = 1, scale = 1.08) {
  for (let pass = 0; pass < iterations; pass += 1) {
    for (let i = 0; i < bodies.length; i += 1) {
      const a = bodies[i];
      for (let j = i + 1; j < bodies.length; j += 1) {
        const b = bodies[j];
        const maxDistance = Math.max(a.r, b.r) * 2.8;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        if (Math.abs(dx) > maxDistance || Math.abs(dy) > maxDistance) continue;
        const minDistance = (a.r + b.r) * scale;
        const distSq = (dx * dx) + (dy * dy);
        if (distSq <= 0.0001 || distSq >= minDistance * minDistance) continue;
        const distance = Math.sqrt(distSq);
        const push = (minDistance - distance) * 0.52;
        const nx = dx / distance;
        const ny = dy / distance;
        a.x -= nx * push;
        a.y -= ny * push;
        b.x += nx * push;
        b.y += ny * push;
      }
    }
  }
}

function updateAperture(body, config, metrics, pointer, t) {
  const cx = metrics.cssWidth * 0.5;
  const cy = metrics.cssHeight * 0.5;
  const maxRadius = Math.max(1, Math.min(metrics.cssWidth, metrics.cssHeight) * 0.42);
  const pointerDistance = pointer.active
    ? Math.hypot(pointer.x - cx, pointer.y - cy)
    : Number.POSITIVE_INFINITY;
  const aperture = pointer.active
    ? smoothstep(1 - (pointerDistance / (maxRadius * 1.05)))
    : 0;
  const ringScale = body.ring / Math.max(1, Number(config.rings || 6));
  const open = aperture * Number(config.openStrength || 0.28) * maxRadius * (1 - (ringScale * 0.58));
  const rotation = t * Number(config.speed || 0.58) * 0.16 * body.ringDirection;
  const twist = aperture * Number(config.twistStrength || 0.52) * (1.2 - ringScale) * body.ringDirection;
  const baseRx = body.baseRx || body.baseRadius || maxRadius;
  const baseRy = body.baseRy || body.baseRadius || maxRadius;
  const breathe = Math.sin(t * 0.52 + body.ring * 0.62) * Math.min(baseRx, baseRy) * 0.018;
  const angle = body.angle + rotation + twist;
  const radiusX = baseRx + open + breathe;
  const radiusY = baseRy + (open * 0.82) + breathe;

  body.homeX = cx + Math.cos(angle) * radiusX;
  body.homeY = cy + Math.sin(angle) * radiusY;
}

function updateConfluenceBridge(body, bodies, config, metrics, pointer, t) {
  const speed = Number(config.animationSpeed || 0.72);
  const interactionStrength = Number(config.interactionStrength || 58);
  const influenceRadius = Math.max(1, Number(config.influenceRadius || 235));
  const cx = metrics.cssWidth * 0.5;
  const cy = metrics.cssHeight * 0.5;

  if (body.kind === 'hub') {
    let targetX;
    let targetY;

    if (body.isCenterHub) {
      targetX = body.baseX + (Math.sin(t * speed * 0.38 + body.phase) * body.r * 0.42);
      targetY = body.baseY + (Math.cos(t * speed * 0.32 + body.phase) * body.r * 0.32);
    } else {
      const wobble = Math.sin(t * speed * 0.34 + body.phase) * 0.035;
      const angle = body.baseAngle + wobble + (t * body.orbitSpeed * speed);
      targetX = cx + (Math.cos(angle) * body.orbitRx);
      targetY = cy + (Math.sin(angle) * body.orbitRy);
    }

    if (pointer.active) {
      const dx = targetX - pointer.x;
      const dy = targetY - pointer.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const pressure = smoothstep(1 - (distance / influenceRadius));
      const push = pressure * interactionStrength * (body.isCenterHub ? 0.18 : 0.32);
      targetX += (dx / distance) * push;
      targetY += (dy / distance) * push;
    }

    if (pointer.down && pointer.dragBodyIndex === body.bodyIndex) {
      targetX += (pointer.x - targetX) * Number(config.dragStrength || 0.38);
      targetY += (pointer.y - targetY) * Number(config.dragStrength || 0.38);
    }

    body.homeX = targetX;
    body.homeY = targetY;
    return;
  }

  const a = bodies[body.aIndex];
  const b = bodies[body.bIndex];
  if (!a || !b) return;

  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / length;
  const ny = dx / length;
  const u = body.u;
  const arc = Math.sin(Math.PI * u) * length * Number(config.bridgeArc || 0.28) * body.bow;
  const pulse = Math.sin(t * speed * 1.2 + body.phase) * body.r * 0.8;
  let targetX = a.x + (dx * u) + (nx * (arc + pulse));
  let targetY = a.y + (dy * u) + (ny * (arc + pulse));

  if (pointer.active) {
    const pointerDx = targetX - pointer.x;
    const pointerDy = targetY - pointer.y;
    const distance = Math.max(1, Math.hypot(pointerDx, pointerDy));
    const pressure = smoothstep(1 - (distance / influenceRadius));
    const pullSign = pointer.down && pointer.dragBodyIndex < 0 ? -1 : 1;
    const push = pressure * interactionStrength * (pointer.down ? 0.64 : 0.42) * pullSign;
    targetX += (pointerDx / distance) * push;
    targetY += (pointerDy / distance) * push;
  }

  body.homeX = targetX;
  body.homeY = targetY;
}

function updateRiftRingMotionState(state, config, metrics, pointer, dt) {
  const now = performance.now();
  const pointerFresh = pointer.active && now - pointer.lastAt < 680;
  const pointerXNorm = pointerFresh
    ? clamp(((pointer.x / Math.max(1, metrics.cssWidth)) - 0.5) * 2, -1, 1)
    : 0;
  const pointerYNorm = pointerFresh
    ? clamp(((pointer.y / Math.max(1, metrics.cssHeight)) - 0.5) * 2, -1, 1)
    : 0;
  const pointerVelocityX = pointerFresh
    ? clamp(pointer.vx / Math.max(520, metrics.cssWidth * 1.2), -0.9, 0.9)
    : 0;
  const dragBoost = pointer.down ? 1.12 : 1;
  const pointerStrength = Number(config.pointerStrength || 0.78);
  const verticalTravel = pointerYNorm < 0
    ? pointerYNorm * 1.18
    : pointerYNorm * 1.06;
  const targetShear = (pointerXNorm * 0.66 + pointerVelocityX * 0.34)
    * Number(config.shearStrength || 0.58)
    * pointerStrength
    * dragBoost;
  const targetExpansion = verticalTravel
    * Number(config.expansionStrength || 0.34)
    * pointerStrength
    * dragBoost;
  const response = pointerFresh
    ? (pointer.down ? 5.2 : 4.2)
    : 1.65;
  const expansionResponse = pointerFresh
    ? (pointer.down ? 4.2 : 3.35)
    : 1.45;
  const shearAlpha = 1 - Math.exp(-dt * response);
  const expansionAlpha = 1 - Math.exp(-dt * expansionResponse);
  const previousShear = state.shear || 0;
  const previousExpansion = state.expansion || 0;

  state.shear += (targetShear - state.shear) * shearAlpha;
  state.expansion += (targetExpansion - state.expansion) * expansionAlpha;
  state.shearVelocity = (state.shear - previousShear) / Math.max(0.001, dt);
  state.expansionVelocity = (state.expansion - previousExpansion) / Math.max(0.001, dt);
  state.audioAngle = (state.audioAngle || 0)
    + (Math.abs(state.shearVelocity) * 0.018)
    + (Math.abs(state.expansionVelocity) * 0.012)
    + (Math.abs(pointerVelocityX) * 0.08);
  return state;
}

function updateRiftRing(body, config, metrics, motion, t) {
  const cx = metrics.cssWidth * 0.5;
  const cy = metrics.cssHeight * 0.5;
  const ringT = clamp(Number(body.ringT || 0), 0, 1);
  const direction = body.ringDirection || 1;
  const drift = Number(config.driftSpeed || 0.46);
  const idle = Number(config.idleMotion || 0.32);
  const shear = motion?.shear || 0;
  const expansion = motion?.expansion || 0;
  const idleBreathe = Math.sin(t * (0.34 + ringT * 0.14) + body.ringPhase) * idle * 0.046;
  const ringShear = shear * direction * (0.24 + ringT * 1.35);
  const angle = body.ringAngle
    + direction * t * drift * (0.09 + ringT * 0.13)
    + ringShear;
  const baseRadius = Number(body.ringRadiusBase || 0);
  const radiusScale = 1
    + (expansion * (0.3 + ringT * 0.98))
    + idleBreathe;
  const radius = Math.max(1, baseRadius * radiusScale);
  const ringShiftX = shear * direction * metrics.cssWidth * (0.012 + ringT * 0.03);
  const ringShiftY = shear * metrics.cssHeight * 0.006 * Math.sin(body.ringPhase);

  body.homeX = cx + Math.cos(angle) * radius + ringShiftX;
  body.homeY = cy + Math.sin(angle) * radius + ringShiftY;
}

function containBody(body, metrics) {
  const margin = body.r + 3;
  const minX = margin;
  const maxX = metrics.cssWidth - margin;
  const minY = margin;
  const maxY = metrics.cssHeight - margin;

  if (body.x < minX) {
    body.x = minX;
    body.vx = Math.abs(body.vx) * 0.28;
  } else if (body.x > maxX) {
    body.x = maxX;
    body.vx = -Math.abs(body.vx) * 0.28;
  }

  if (body.y < minY) {
    body.y = minY;
    body.vy = Math.abs(body.vy) * 0.28;
  } else if (body.y > maxY) {
    body.y = maxY;
    body.vy = -Math.abs(body.vy) * 0.28;
  }
}

function updateBody(body, config, pointer, dt, reserve = null) {
  if (pointer.active) {
    const dx = body.x - pointer.x;
    const dy = body.y - pointer.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const pressure = smoothstep(1 - (distance / Math.max(1, Number(config.pointerRadius || 220))));
    const push = pressure * Number(config.pointerPush || 0) * dt;
    body.vx += (dx / distance) * push;
    body.vy += (dy / distance) * push;
  }

  body.vx += (body.homeX - body.x) * Number(config.spring || 0.12);
  body.vy += (body.homeY - body.y) * Number(config.spring || 0.12);
  body.vx *= Number(config.damping || 0.82);
  body.vy *= Number(config.damping || 0.82);
  body.x += body.vx;
  body.y += body.vy;
  if (reserve) {
    pushOutsideTitleReserve(body, reserve);
  }
  body.rotation += body.spin + (body.vx * 0.0008);
}

function renderBackground(ctx, metrics, theme, config, pointer, simulationId, transparentBackground) {
  if (transparentBackground) {
    ctx.clearRect(0, 0, metrics.cssWidth, metrics.cssHeight);
    return;
  }

  ctx.fillStyle = theme?.active || DEFAULT_THEME.active;
  ctx.fillRect(0, 0, metrics.cssWidth, metrics.cssHeight);

  if (simulationId !== CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES) return;

  const response = Number(config.backgroundResponse || 0);
  if (response <= 0) return;

  const pressure = pointer.active ? 1 : 0.32;
  ctx.fillStyle = `rgba(255, 255, 255, ${clamp(response * pressure * 0.035, 0, 0.018)})`;
  ctx.fillRect(0, 0, metrics.cssWidth, metrics.cssHeight);
}

function shouldPauseForVisibility(config) {
  return config.pauseWhenHidden !== false
    && typeof document !== 'undefined'
    && document.hidden;
}

export function createConceptSimulationRenderer({
  canvas,
  simulationId,
  reducedMotion = false,
  getConfig,
  getTheme,
  transparentBackground = false,
  useHomeSimulationBodyRadius = false,
}) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const pointer = {
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    vx: 0,
    vy: 0,
    active: false,
    down: false,
    pointerId: null,
    dragBodyIndex: -1,
    lastAt: -Infinity,
  };
  const metrics = {
    changed: true,
    cssWidth: 1,
    cssHeight: 1,
    width: 1,
    height: 1,
    dpr: 1,
    mobileSimulationBodyScale: 1,
    simulationBodyRadius: 0,
  };
  let metricsReady = false;
  let bodies = [];
  let frameId = 0;
  let lastFrameTime = 0;
  let lastTime = 0;
  let started = false;
  let layoutKey = '';
  let lastConfigSource = null;
  let lastThemeSource = null;
  let layoutSyncRequested = true;
  let paletteGeneration = 0;
  let stateBuildCount = 0;
  let riftMotionState = {
    shear: 0,
    expansion: 0,
    shearVelocity: 0,
    expansionVelocity: 0,
    audioAngle: 0,
  };
  let unregisterVisualTransition = null;
  const visualTransition = createContinuousSimulationVisualTransition({
    sourceId: simulationId,
    getCount: () => bodies.length,
    getSeed: () => {
      const seedMap = {
        [CONCEPT_SIMULATION_IDS.APERTURE_BLOOM]: 11021,
        [CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES]: 41071,
        [CONCEPT_SIMULATION_IDS.RIFT_RINGS]: 53087,
      };
      return seedMap[simulationId] || 51061;
    },
  });
  unregisterVisualTransition = registerSimulationVisualTransition(simulationId, visualTransition);

  function getLayoutKey(config, theme) {
    const mobileBodyScale = resolveMobileSimulationBodyScale(
      theme?.mobileSimulationBodyScale,
      metrics,
    );
    return [
      simulationId,
      Math.round(metrics?.cssWidth || 0),
      Math.round(metrics?.cssHeight || 0),
      Number(config.bodyRadius).toFixed(3),
      useHomeSimulationBodyRadius
        ? normalizeHomeSimulationBodyRadius(theme?.homeSimulationBodyRadiusPx).toFixed(3)
        : 'authored',
      Number(config.mobileRadiusScale).toFixed(3),
      Number(config.rings || 0),
      Number(config.mobileRings || 0),
      Number(config.ringDensity || 0).toFixed(3),
      Number(config.ringSpacing || 0).toFixed(3),
      Number(config.outerRadiusScale || 0).toFixed(3),
      Number(config.mobileOuterRadiusScale || 0).toFixed(3),
      Number(config.mobileBaseRadiusMin || 0).toFixed(3),
      Number(config.centerRadiusScale || 0).toFixed(3),
      Number(config.mobileCenterRadiusScale || 0).toFixed(3),
      Number(config.centerFogMin || 0).toFixed(3),
      Number(config.centerFogStart || 0).toFixed(3),
      Number(config.centerFogRingCount || 0),
      Number(config.mobileCenterFogMin || 0).toFixed(3),
      Number(config.mobileCenterFogRingCount || 0),
      Number(config.spacing || 0).toFixed(3),
      Number(config.rowDensity || 0).toFixed(3),
      Number(config.ballCount || 0),
      Number(config.hubCount || 0),
      Number(config.minRadius || 0).toFixed(3),
      Number(config.maxRadius || 0).toFixed(3),
      Number(config.mobileDensityScale || 0).toFixed(3),
      Number(config.bridgeArc || 0).toFixed(3),
      Number(config.titleReserveWidth || 0).toFixed(3),
      Number(config.titleReserveHeight || 0).toFixed(3),
      Number(config.titleReserveY || 0).toFixed(3),
      mobileBodyScale.toFixed(2),
    ].join(':');
  }

  function rebuildBodies(config, theme) {
    const seedMap = {
      [CONCEPT_SIMULATION_IDS.APERTURE_BLOOM]: 11021,
      [CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES]: 41071,
      [CONCEPT_SIMULATION_IDS.RIFT_RINGS]: 53087,
    };
    const random = mulberry32(seedMap[simulationId] || 51061);
    if (simulationId === CONCEPT_SIMULATION_IDS.APERTURE_BLOOM) {
      bodies = buildApertureBodies(random, config, theme, metrics);
    } else if (simulationId === CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES) {
      bodies = buildConfluenceBridgeBodies(random, config, theme, metrics);
    } else if (simulationId === CONCEPT_SIMULATION_IDS.RIFT_RINGS) {
      const configuredRadius = useHomeSimulationBodyRadius
        ? normalizeHomeSimulationBodyRadius(theme?.homeSimulationBodyRadiusPx)
        : null;
      bodies = buildRiftRingBodies(random, config, theme, metrics, configuredRadius);
    } else {
      bodies = [];
    }
    bodies.forEach((body, index) => {
      body.bodyIndex = index;
    });
    stateBuildCount += 1;
    let radiusTotal = 0;
    for (const body of bodies) radiusTotal += Number(body.r) || 0;
    metrics.simulationBodyRadius = bodies.length ? radiusTotal / bodies.length : 0;
    canvas.dataset.simulationBodyRadius = metrics.simulationBodyRadius.toFixed(2);
    canvas.dataset.simulationBodyCount = String(bodies.length);
    canvas.dataset.simulationStateBuildCount = String(stateBuildCount);
  }

  function syncLayout() {
    const config = getConfig();
    const theme = getTheme() || DEFAULT_THEME;
    let metricsChanged = false;
    if (!metricsReady || layoutSyncRequested) {
      syncCanvasDisplayMetrics(canvas, resolveDpr(config), metrics);
      metricsReady = true;
      metricsChanged = metrics.changed;
    }
    metrics.mobileSimulationBodyScale = resolveMobileSimulationBodyScale(
      theme?.mobileSimulationBodyScale,
      metrics,
    );
    canvas.dataset.mobileSimulationBodyScale = metrics.mobileSimulationBodyScale.toFixed(2);
    if (!pointer.x && !pointer.y) {
      pointer.x = metrics.cssWidth * 0.5;
      pointer.y = metrics.cssHeight * 0.5;
    }

    const sourcesChanged = config !== lastConfigSource || theme !== lastThemeSource;
    if (layoutSyncRequested || metricsChanged || sourcesChanged || !layoutKey) {
      const nextLayoutKey = getLayoutKey(config, theme);
      if (metricsChanged || nextLayoutKey !== layoutKey) {
        layoutKey = nextLayoutKey;
        rebuildBodies(config, theme);
      }
      lastConfigSource = config;
      lastThemeSource = theme;
      layoutSyncRequested = false;
    }
    if (paletteGeneration !== Number(theme?.paletteGeneration || 0)) {
      paletteGeneration = Number(theme?.paletteGeneration || 0);
      const palette = resolvePalette(theme);
      for (const body of bodies) {
        const colorIndex = resolveSimulationMaterialColorIndex(
          body,
          theme?.paletteSnapshot || theme?.colorDistribution,
        );
        body.colorIndex = colorIndex;
        body.color = palette[colorIndex] || palette[0];
      }
      canvas.dataset.simulationPaletteGeneration = String(paletteGeneration);
      canvas.dataset.simulationPaletteId = String(theme?.paletteId || '');
    }
  }

  function step(now) {
    frameId = window.requestAnimationFrame(step);
    const config = getConfig();
    if (!ctx || !config.enabled || shouldPauseForVisibility(config)) return;

    const targetFps = reducedMotion ? REDUCED_MOTION_TARGET_FPS : DEFAULT_TARGET_FPS;
    const nextFrameTime = advanceFrameScheduler(lastFrameTime, now, targetFps);
    if (nextFrameTime === null) return;
    lastFrameTime = nextFrameTime;

    syncLayout();
    const rawDt = lastTime ? (now - lastTime) / 1000 : 1 / 60;
    lastTime = now;
    const dt = clamp(rawDt, 1 / 120, 1 / 30) * (reducedMotion ? 0.45 : 1);
    const isConfluence = simulationId === CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES;
    const isRiftRings = simulationId === CONCEPT_SIMULATION_IDS.RIFT_RINGS;
    const t = (now / 1000) * (reducedMotion && (isConfluence || isRiftRings) ? 0.45 : 1);
    const reserve = simulationId === CONCEPT_SIMULATION_IDS.APERTURE_BLOOM
      ? getTitleReserveZone(config, metrics)
      : null;
    const riftMotion = isRiftRings
      ? updateRiftRingMotionState(riftMotionState, config, metrics, pointer, dt)
      : null;

    for (const body of bodies) {
      if (simulationId === CONCEPT_SIMULATION_IDS.APERTURE_BLOOM) {
        updateAperture(body, config, metrics, pointer, t);
      } else if (isConfluence) {
        updateConfluenceBridge(body, bodies, config, metrics, pointer, t);
      } else if (isRiftRings) {
        updateRiftRing(body, config, metrics, riftMotion, t);
      }
      if (reserve) {
        pushHomeOutsideTitleReserve(body, reserve);
      }
      updateBody(body, config, pointer, dt, reserve);
      if (isConfluence) {
        containBody(body, metrics);
      }
    }
    applySeparation(
      bodies,
      isRiftRings ? 0 : (isConfluence ? 2 : 1),
      isConfluence ? Number(config.separationScale || 1.08) : 1.08,
    );
    if (isConfluence) {
      for (const body of bodies) {
        containBody(body, metrics);
      }
    }
    if (reserve) {
      for (const body of bodies) {
        pushOutsideTitleReserve(body, reserve);
      }
    }
    const pointerSpeed = Math.hypot(pointer.vx, pointer.vy);
    const pointerFresh = pointer.active && now - pointer.lastAt < 180;
    if (simulationId === CONCEPT_SIMULATION_IDS.APERTURE_BLOOM && pointerFresh) {
      triggerDetent({
        id: 'aperture-bloom:lens-ring',
        value: (t * Number(config.speed || 0.58)) + (pointer.x * 0.006),
        step: Math.PI / 22,
        velocity: pointerSpeed / 480,
        minVelocity: 0.13,
        minIntervalMs: 34,
        gain: 0.046,
        filterHz: 3350,
      });
    } else if (isConfluence && pointerFresh && pointerSpeed > 260) {
      triggerPressure({
        id: 'confluence-bridges:tension',
        intensity: clamp(pointerSpeed / 1200, 0.62, 0.9),
        x: clamp(pointer.x / Math.max(1, metrics.cssWidth), 0, 1),
        radius: 22,
        minIntervalMs: 160,
      });
    } else if (isRiftRings && pointerFresh) {
      const shearVelocity = Math.abs(riftMotion?.shearVelocity || 0);
      const expansionVelocity = Math.abs(riftMotion?.expansionVelocity || 0);
      const motionVelocity = shearVelocity + (expansionVelocity * 0.82) + (pointerSpeed / 900);
      triggerDetent({
        id: 'rift-rings:orbit',
        value: riftMotion?.audioAngle || 0,
        step: Math.PI / 24,
        velocity: motionVelocity,
        minVelocity: 0.12,
        minIntervalMs: 32,
        gain: 0.046,
        filterHz: 3300,
      });
      if (expansionVelocity > 0.85 && pointerSpeed > 260) {
        triggerPressure({
          id: 'rift-rings:radial-travel',
          intensity: clamp(expansionVelocity / 3.2, 0.56, 0.78),
          x: clamp(pointer.x / Math.max(1, metrics.cssWidth), 0, 1),
          radius: 21,
          minIntervalMs: 280,
        });
      }
    }
    render();
  }

  function render() {
    if (!ctx || !metrics) return;
    const theme = getTheme() || DEFAULT_THEME;
    const config = getConfig();
    ctx.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);
    renderBackground(ctx, metrics, theme, config, pointer, simulationId, transparentBackground);
    if (simulationId === CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES) {
      for (const body of bodies) {
        if (body.kind !== 'hub') drawBody(ctx, body, visualTransition.getScaleAt(body.bodyIndex));
      }
      for (const body of bodies) {
        if (body.kind === 'hub') drawBody(ctx, body, visualTransition.getScaleAt(body.bodyIndex));
      }
    } else {
      for (const body of bodies) {
        drawBody(ctx, body, visualTransition.getScaleAt(body.bodyIndex));
      }
    }
    markAuditFrame(canvas);
    notifySimulationAtmosphereSourceFrame(simulationId);
  }

  function start() {
    layoutSyncRequested = true;
    syncLayout();
    render();
    if (started) return;
    started = true;
    lastFrameTime = 0;
    lastTime = 0;
    frameId = window.requestAnimationFrame(step);
  }

  function updatePointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const now = performance.now();
    const nextX = event.clientX - rect.left;
    const nextY = event.clientY - rect.top;
    const dt = Math.max(16, now - pointer.lastAt);
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    pointer.vx = (nextX - pointer.px) / dt * 1000;
    pointer.vy = (nextY - pointer.py) / dt * 1000;
    pointer.x = nextX;
    pointer.y = nextY;
    pointer.active = true;
    pointer.lastAt = now;
  }

  function findNearestDraggableBodyIndex(config) {
    const dragRadius = Number(config.dragRadius || 185);
    let nearestIndex = -1;
    let nearestDistanceSq = dragRadius * dragRadius;

    for (const body of bodies) {
      if (body.kind !== 'hub') continue;
      const dx = body.x - pointer.x;
      const dy = body.y - pointer.y;
      const distanceSq = (dx * dx) + (dy * dy);
      if (distanceSq < nearestDistanceSq) {
        nearestDistanceSq = distanceSq;
        nearestIndex = body.bodyIndex;
      }
    }

    return nearestIndex;
  }

  function handlePointerMove(event) {
    updatePointerFromEvent(event);
    if (pointer.down) {
      event.preventDefault();
    }
  }

  function handlePointerDown(event) {
    updatePointerFromEvent(event);
    pointer.down = true;
    pointer.pointerId = event.pointerId;
    pointer.dragBodyIndex = simulationId === CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES
      ? findNearestDraggableBodyIndex(getConfig())
      : -1;
    if (simulationId === CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES && pointer.dragBodyIndex >= 0) {
      triggerPressure({
        id: 'confluence-bridges:hub-grab',
        intensity: 0.76,
        x: clamp(pointer.x / Math.max(1, metrics.cssWidth), 0, 1),
        radius: 24,
        minIntervalMs: 120,
      });
    }
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture can fail for synthetic events; normal move/up handling still works.
    }
    event.preventDefault();
  }

  function handlePointerUp(event) {
    updatePointerFromEvent(event);
    if (simulationId === CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES && pointer.dragBodyIndex >= 0) {
      triggerRelease({
        id: 'confluence-bridges:release',
        intensity: clamp(Math.hypot(pointer.vx, pointer.vy) / 1000, 0.64, 0.9),
        x: clamp(pointer.x / Math.max(1, metrics.cssWidth), 0, 1),
        radius: 26,
        minIntervalMs: 140,
      });
    }
    pointer.down = false;
    pointer.pointerId = null;
    pointer.dragBodyIndex = -1;
    try {
      if (canvas.hasPointerCapture?.(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore stale capture release after browser-cancelled interactions.
    }
  }

  function handlePointerLeave() {
    if (pointer.down) return;
    pointer.active = false;
  }

  function handlePointerCancel(event) {
    pointer.active = false;
    pointer.down = false;
    pointer.pointerId = null;
    pointer.dragBodyIndex = -1;
    try {
      if (canvas.hasPointerCapture?.(event.pointerId)) {
        canvas.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Ignore stale capture release after browser-cancelled interactions.
    }
  }

  function destroy() {
    if (frameId) {
      window.cancelAnimationFrame(frameId);
      frameId = 0;
    }
    started = false;
    lastFrameTime = 0;
    unregisterVisualTransition?.();
    unregisterVisualTransition = null;
    visualTransition.destroy?.();
    canvas.removeEventListener('pointermove', handlePointerMove);
    canvas.removeEventListener('pointerdown', handlePointerDown);
    canvas.removeEventListener('pointerup', handlePointerUp);
    canvas.removeEventListener('lostpointercapture', handlePointerUp);
    canvas.removeEventListener('pointerleave', handlePointerLeave);
    canvas.removeEventListener('pointercancel', handlePointerCancel);
  }

  canvas.addEventListener('pointermove', handlePointerMove);
  canvas.addEventListener('pointerdown', handlePointerDown);
  canvas.addEventListener('pointerup', handlePointerUp);
  canvas.addEventListener('lostpointercapture', handlePointerUp);
  canvas.addEventListener('pointerleave', handlePointerLeave);
  canvas.addEventListener('pointercancel', handlePointerCancel);

  return {
    start,
    destroy,
    renderOnce: () => {
      syncLayout();
      render();
    },
    getMetrics: () => ({
      ...metrics,
      bodyCount: bodies.length,
      dragging: pointer.down && pointer.dragBodyIndex >= 0,
      pointerActive: pointer.active,
      simulationId,
    }),
  };
}
