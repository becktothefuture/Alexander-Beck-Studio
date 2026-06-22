import { CONCEPT_SIMULATION_IDS } from './conceptSimulationConfigs.js';

const TAU = Math.PI * 2;
const REFERENCE_AREA = 1440 * 900;
const DEFAULT_THEME = {
  active: '#202020',
  palette: ['#a7afb0', '#c6cecf', '#f5f8f6', '#00a5a0', '#031210', '#d7ff2f', '#2c96ff', '#ff7e4a'],
  colorDistribution: [
    { colorIndex: 0, weight: 31 },
    { colorIndex: 3, weight: 13 },
    { colorIndex: 2, weight: 16 },
    { colorIndex: 6, weight: 20 },
    { colorIndex: 7, weight: 10 },
    { colorIndex: 5, weight: 10 },
  ],
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
  const palette = source.filter(isHexColor);
  return palette.length ? palette : DEFAULT_THEME.palette;
}

function resolveColorDistribution(theme, paletteLength) {
  const source = Array.isArray(theme?.colorDistribution)
    ? theme.colorDistribution
    : DEFAULT_THEME.colorDistribution;
  const distribution = [];

  for (const row of source) {
    const colorIndex = Math.round(Number(row?.colorIndex));
    const weight = Number(row?.weight);
    if (
      Number.isFinite(colorIndex)
      && colorIndex >= 0
      && colorIndex < paletteLength
      && Number.isFinite(weight)
      && weight > 0
    ) {
      distribution.push({ colorIndex, weight });
    }
  }

  return distribution.length ? distribution : DEFAULT_THEME.colorDistribution;
}

function pickWeightedColor(random, theme) {
  const palette = resolvePalette(theme);
  const distribution = resolveColorDistribution(theme, palette.length);
  let total = 0;
  for (const row of distribution) total += row.weight;
  if (total <= 0) return palette[0];

  let sample = random() * total;
  for (const row of distribution) {
    sample -= row.weight;
    if (sample <= 0) return palette[row.colorIndex] || palette[0];
  }
  return palette[distribution[distribution.length - 1]?.colorIndex || 0] || palette[0];
}

function resolveDpr(config) {
  const deviceDpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const configuredMax = clamp(Number(config.maxDpr) || 1.5, 0.75, 2);
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth || 1024;
  const mobileMax = viewportWidth < 520 ? 1.15 : (viewportWidth < 820 ? 1.3 : configuredMax);
  return clamp(Math.min(deviceDpr, configuredMax, mobileMax), 0.75, 2);
}

function resizeCanvasToDisplaySize(canvas, dpr) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  const changed = canvas.width !== width || canvas.height !== height;
  if (changed) {
    canvas.width = width;
    canvas.height = height;
  }
  return {
    changed,
    cssWidth: Math.max(1, rect.width),
    cssHeight: Math.max(1, rect.height),
    width,
    height,
    dpr,
  };
}

function getScaledRadius(config, metrics) {
  const areaScale = Math.sqrt((metrics.cssWidth * metrics.cssHeight) / REFERENCE_AREA);
  const mobileScale = metrics.cssWidth < 680 ? Number(config.mobileRadiusScale || 0.86) : 1;
  const minRadius = metrics.cssWidth < 680 ? 6.2 : 5.8;
  return clamp(Number(config.bodyRadius || 9) * areaScale * mobileScale, minRadius, 17);
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

function isInsideEllipseBoundary(x, y, radius, zone) {
  const safeRx = Math.max(1, zone.rx - radius);
  const safeRy = Math.max(1, zone.ry - radius);
  const nx = (x - zone.cx) / safeRx;
  const ny = (y - zone.cy) / safeRy;
  return (nx * nx) + (ny * ny) <= 1;
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

function drawPebble(ctx, body) {
  const points = body.shape;
  ctx.save();
  ctx.translate(body.x, body.y);
  ctx.rotate(body.rotation);
  ctx.beginPath();
  for (let i = 0; i < points.length; i += 1) {
    const current = points[i];
    const next = points[(i + 1) % points.length];
    const x = Math.cos(current.angle) * current.radius * body.r;
    const y = Math.sin(current.angle) * current.radius * body.r;
    const nextX = Math.cos(next.angle) * next.radius * body.r;
    const nextY = Math.sin(next.angle) * next.radius * body.r;
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
}

function drawCircle(ctx, body) {
  ctx.beginPath();
  ctx.arc(body.x, body.y, body.r, 0, TAU);
  ctx.fillStyle = body.color;
  ctx.fill();
}

function drawBody(ctx, body) {
  if (body.shapeKind === 'circle') {
    drawCircle(ctx, body);
    return;
  }

  drawPebble(ctx, body);
}

function makeBody(random, theme, x, y, r, extra = {}) {
  const shapeKind = extra.shapeKind || 'pebble';
  return {
    x,
    y,
    homeX: x,
    homeY: y,
    vx: 0,
    vy: 0,
    r: r * (0.9 + random() * 0.18),
    color: pickWeightedColor(random, theme),
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
  const r = getScaledRadius(config, metrics);
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

function buildPressureMosaicBodies(random, config, theme, metrics) {
  const bodies = [];
  const r = getScaledRadius(config, metrics);
  const reserve = getTitleReserveZone(config, metrics);
  const outer = getOuterSimulationZone(metrics, reserve);
  const spacing = r * Number(config.spacing || 2.68);
  const rowGap = spacing * 0.86;
  const fieldWidth = outer.rx * 2;
  const fieldHeight = outer.ry * 2;
  const rows = Math.ceil(fieldHeight / rowGap);
  const columns = Math.max(6, Math.ceil(fieldWidth / spacing));
  const startX = outer.cx - (((columns - 1) * spacing) * 0.5);
  const startY = outer.cy - (((rows - 1) * rowGap) * 0.5);

  for (let row = 0; row < rows; row += 1) {
    const y = startY + (row * rowGap);
    const isOffsetRow = row % 2 === 1;
    const rowColumns = isOffsetRow ? columns - 1 : columns;
    const rowOffset = isOffsetRow ? spacing * 0.5 : 0;
    for (let col = 0; col < rowColumns; col += 1) {
      const x = startX + rowOffset + (col * spacing);
      if (!isInsideEllipseBoundary(x, y, r * 0.6, outer)) continue;
      if (isInsideTitleReserve(x, y, r * 1.15, reserve)) continue;
      bodies.push(makeBody(random, theme, x, y, r, {
        row,
        col,
        baseX: x,
        baseY: y,
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

function updatePressureMosaic(body, config, metrics, pointer, t) {
  const centerX = metrics.cssWidth * 0.5;
  const centerY = metrics.cssHeight * 0.5;
  const centerDx = body.baseX - centerX;
  const centerDy = body.baseY - centerY;
  const centerDist = Math.max(1, Math.hypot(centerDx, centerDy));
  const breathe = Math.sin(t * 0.42 + body.phase) * Number(config.breathe || 0.1) * body.r;
  let offsetX = (centerDx / centerDist) * breathe;
  let offsetY = (centerDy / centerDist) * breathe;

  if (pointer.active) {
    const dx = body.baseX - pointer.x;
    const dy = body.baseY - pointer.y;
    const distance = Math.max(1, Math.hypot(dx, dy));
    const pressure = smoothstep(1 - (distance / Math.max(1, Number(config.pointerRadius || 230))));
    const push = pressure * Number(config.pressureStrength || 96);
    offsetX += (dx / distance) * push;
    offsetY += (dy / distance) * push;
  }

  body.homeX = body.baseX + offsetX;
  body.homeY = body.baseY + offsetY;
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

function renderBackground(ctx, metrics, theme) {
  ctx.fillStyle = theme?.active || DEFAULT_THEME.active;
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
}) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const pointer = {
    x: 0,
    y: 0,
    active: false,
    down: false,
    pointerId: null,
    dragBodyIndex: -1,
  };
  let metrics = null;
  let bodies = [];
  let frameId = 0;
  let lastTime = 0;
  let started = false;
  let layoutKey = '';

  function getLayoutKey(config, theme) {
    return [
      simulationId,
      Math.round(metrics?.cssWidth || 0),
      Math.round(metrics?.cssHeight || 0),
      Number(config.bodyRadius).toFixed(3),
      Number(config.mobileRadiusScale).toFixed(3),
      Number(config.rings || 0),
      Number(config.ringSpacing || 0).toFixed(3),
      Number(config.spacing || 0).toFixed(3),
      Number(config.titleReserveWidth || 0).toFixed(3),
      Number(config.titleReserveHeight || 0).toFixed(3),
      Number(config.titleReserveY || 0).toFixed(3),
      resolvePalette(theme).join(','),
    ].join(':');
  }

  function rebuildBodies(config, theme) {
    const seedMap = {
      [CONCEPT_SIMULATION_IDS.APERTURE_BLOOM]: 11021,
      [CONCEPT_SIMULATION_IDS.PRESSURE_MOSAIC]: 31041,
    };
    const random = mulberry32(seedMap[simulationId] || 51061);
    if (simulationId === CONCEPT_SIMULATION_IDS.APERTURE_BLOOM) {
      bodies = buildApertureBodies(random, config, theme, metrics);
    } else {
      bodies = buildPressureMosaicBodies(random, config, theme, metrics);
    }
    bodies.forEach((body, index) => {
      body.bodyIndex = index;
    });
  }

  function syncLayout() {
    const config = getConfig();
    const theme = getTheme() || DEFAULT_THEME;
    const dpr = resolveDpr(config);
    metrics = resizeCanvasToDisplaySize(canvas, dpr);
    if (!pointer.x && !pointer.y) {
      pointer.x = metrics.cssWidth * 0.5;
      pointer.y = metrics.cssHeight * 0.5;
    }

    const nextLayoutKey = getLayoutKey(config, theme);
    if (metrics.changed || nextLayoutKey !== layoutKey) {
      layoutKey = nextLayoutKey;
      rebuildBodies(config, theme);
    }
  }

  function step(now) {
    frameId = window.requestAnimationFrame(step);
    const config = getConfig();
    if (!ctx || !config.enabled || shouldPauseForVisibility(config)) return;

    syncLayout();
    const rawDt = lastTime ? (now - lastTime) / 1000 : 1 / 60;
    lastTime = now;
    const dt = clamp(rawDt, 1 / 120, 1 / 30) * (reducedMotion ? 0.45 : 1);
    const t = (now / 1000) * (reducedMotion ? 0.45 : 1);
    const reserve = simulationId === CONCEPT_SIMULATION_IDS.APERTURE_BLOOM
      || simulationId === CONCEPT_SIMULATION_IDS.PRESSURE_MOSAIC
      ? getTitleReserveZone(config, metrics)
      : null;

    for (const body of bodies) {
      if (simulationId === CONCEPT_SIMULATION_IDS.APERTURE_BLOOM) {
        updateAperture(body, config, metrics, pointer, t);
      } else {
        updatePressureMosaic(body, config, metrics, pointer, t);
      }
      if (reserve) {
        pushHomeOutsideTitleReserve(body, reserve);
      }
      updateBody(body, config, pointer, dt, reserve);
    }
    applySeparation(
      bodies,
      simulationId === CONCEPT_SIMULATION_IDS.PRESSURE_MOSAIC ? 2 : 1,
      1.08,
    );
    if (reserve) {
      for (const body of bodies) {
        pushOutsideTitleReserve(body, reserve);
      }
    }
    render();
  }

  function render() {
    if (!ctx || !metrics) return;
    const theme = getTheme() || DEFAULT_THEME;
    const config = getConfig();
    ctx.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);
    renderBackground(ctx, metrics, theme);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.16)';
    ctx.shadowBlur = Math.max(5, Math.min(16, metrics.cssWidth * 0.006));
    ctx.shadowOffsetY = 1.5;
    for (const body of bodies) {
      drawBody(ctx, body);
    }
    ctx.shadowColor = 'transparent';
  }

  function start() {
    syncLayout();
    render();
    if (started) return;
    started = true;
    lastTime = 0;
    frameId = window.requestAnimationFrame(step);
  }

  function updatePointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.active = true;
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
    pointer.dragBodyIndex = -1;
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture can fail for synthetic events; normal move/up handling still works.
    }
    event.preventDefault();
  }

  function handlePointerUp(event) {
    updatePointerFromEvent(event);
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
