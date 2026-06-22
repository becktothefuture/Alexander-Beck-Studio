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
  const distribution = source
    .map((row) => ({ colorIndex: Math.round(Number(row?.colorIndex)), weight: Number(row?.weight) }))
    .filter((row) => row.colorIndex >= 0 && row.colorIndex < paletteLength && row.weight > 0);
  return distribution.length ? distribution : DEFAULT_THEME.colorDistribution;
}

function pickWeightedColor(random, theme) {
  const palette = resolvePalette(theme);
  const distribution = resolveColorDistribution(theme, palette.length);
  const total = distribution.reduce((sum, row) => sum + row.weight, 0);
  let sample = random() * total;
  for (const row of distribution) {
    sample -= row.weight;
    if (sample <= 0) return palette[row.colorIndex] || palette[0];
  }
  return palette[0];
}

function resolveDpr(config) {
  const deviceDpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const configuredMax = clamp(Number(config.maxDpr) || 1.5, 0.75, 2);
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth || 1024;
  const mobileMax = viewportWidth < 520 ? 1.1 : (viewportWidth < 820 ? 1.25 : configuredMax);
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

function getAreaScale(metrics) {
  return clamp(Math.sqrt((metrics.cssWidth * metrics.cssHeight) / REFERENCE_AREA), 0.58, 1.18);
}

function getRadiusRange(config, metrics) {
  const areaScale = getAreaScale(metrics);
  const mobileScale = metrics.cssWidth < 680 ? Number(config.mobileRadiusScale || 0.9) : 1;
  const minRadius = clamp(Number(config.minRadius || 4.8) * areaScale * mobileScale, 3, 8.5);
  const maxRadius = clamp(Number(config.maxRadius || 8.6) * areaScale * mobileScale, minRadius + 0.8, 12.5);
  return { minRadius, maxRadius };
}

function getEffectiveCount(config, metrics) {
  const areaRatio = clamp((metrics.cssWidth * metrics.cssHeight) / REFERENCE_AREA, 0.48, 1.18);
  const mobileScale = metrics.cssWidth < 680 ? Number(config.mobileDensityScale || 0.58) : 1;
  return Math.round(clamp(Number(config.count || 360) * areaRatio * mobileScale, 96, 620));
}

function buildTargets(count, metrics, averageRadius) {
  const cx = metrics.cssWidth * 0.5;
  const cy = metrics.cssHeight * 0.53;
  const isMobile = metrics.cssWidth < 680;
  const rx = metrics.cssWidth * (isMobile ? 0.41 : 0.43);
  const ry = metrics.cssHeight * (isMobile ? 0.34 : 0.37);
  const columnGap = averageRadius * 2.14;
  const rowGap = averageRadius * 1.86;
  const rows = Math.ceil((ry * 2) / rowGap) + 6;
  const columns = Math.ceil((rx * 2) / columnGap) + 8;
  const targets = [];

  for (let row = -rows; row <= rows; row += 1) {
    const y = cy + row * rowGap;
    const offset = row % 2 === 0 ? 0 : columnGap * 0.5;
    for (let column = -columns; column <= columns; column += 1) {
      const x = cx + column * columnGap + offset;
      const nx = (x - cx) / rx;
      const ny = (y - cy) / ry;
      const distance = Math.sqrt(nx * nx + ny * ny);
      if (distance > 1) continue;
      const angle = Math.atan2(ny, nx);
      targets.push({
        x,
        y,
        row,
        column,
        distance,
        domain: Math.floor((((angle + Math.PI) / TAU) * 6) + distance * 1.8) % 6,
      });
    }
  }

  targets.sort((a, b) => a.distance - b.distance);
  return targets.slice(0, count);
}

function makeBody(random, theme, target, radiusRange, metrics, index) {
  const r = radiusRange.minRadius + random() * (radiusRange.maxRadius - radiusRange.minRadius);
  const edgeBias = smoothstep(target.distance);
  const centreX = metrics.cssWidth * 0.5;
  const centreY = metrics.cssHeight * 0.53;
  const angle = Math.atan2(target.y - centreY, target.x - centreX) + (random() - 0.5) * 1.4;
  const powderDistance = 18 + edgeBias * 46 + random() * 38;
  const looseX = target.x + Math.cos(angle) * powderDistance;
  const looseY = target.y + Math.sin(angle) * powderDistance;
  const order = clamp(0.94 - edgeBias * 0.46 + random() * 0.08, 0.42, 1);

  return {
    bodyIndex: index,
    x: looseX + (target.x - looseX) * smoothstep(order),
    y: looseY + (target.y - looseY) * smoothstep(order),
    vx: 0,
    vy: 0,
    r,
    color: pickWeightedColor(random, theme),
    targetX: target.x,
    targetY: target.y,
    looseX,
    looseY,
    domain: target.domain,
    phase: random() * TAU,
    restOrder: order,
    order,
    heat: 0,
  };
}

function buildBodies(random, config, theme, metrics) {
  const count = getEffectiveCount(config, metrics);
  const radiusRange = getRadiusRange(config, metrics);
  const averageRadius = (radiusRange.minRadius + radiusRange.maxRadius) * 0.5;
  return buildTargets(count, metrics, averageRadius).map((target, index) => (
    makeBody(random, theme, target, radiusRange, metrics, index)
  ));
}

function applyPointer(body, pointer, config, dt) {
  if (!pointer.active) return;
  const radius = Math.max(1, Number(config.influenceRadius || 168));
  const dx = body.x - pointer.x;
  const dy = body.y - pointer.y;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const influence = smoothstep(1 - distance / radius);
  if (influence <= 0) return;

  const speed = clamp(Math.hypot(pointer.vx, pointer.vy) / 900, 0, 1.5);
  const strength = Number(config.interactionStrength || 0.74);
  const heat = influence * strength * (0.72 + speed * 0.58);
  const nx = dx / distance;
  const ny = dy / distance;
  body.heat = Math.max(body.heat, heat);
  body.vx += nx * heat * 34 * dt - ny * pointer.vx * heat * 0.18 * speed * dt;
  body.vy += ny * heat * 34 * dt + nx * pointer.vy * heat * 0.18 * speed * dt;

  if (pointer.down && config.dragBehavior === 'crystallize') {
    const crystallize = influence * Number(config.dragStrength || 1.15) * dt;
    body.order = clamp(body.order + crystallize * 1.55, 0, 1);
    body.heat *= 0.78;
    body.vx += (body.targetX - body.x) * crystallize * 0.48;
    body.vy += (body.targetY - body.y) * crystallize * 0.48;
  }
}

function applyRelease(body, pointer, config, dt) {
  if (pointer.releaseEnergy <= 0.001) return;
  const radius = Math.max(1, Number(config.influenceRadius || 168) * 1.25);
  const dx = body.x - pointer.releaseX;
  const dy = body.y - pointer.releaseY;
  const distance = Math.max(1, Math.hypot(dx, dy));
  const influence = smoothstep(1 - distance / radius) * pointer.releaseEnergy;
  if (influence <= 0) return;
  const settle = influence * Number(config.dragStrength || 1.15) * dt;
  body.order = clamp(body.order + settle * 0.92, 0, 1);
  body.vx += (body.targetX - body.x) * settle * 0.16;
  body.vy += (body.targetY - body.y) * settle * 0.16;
}

function updateBody(body, config, pointer, dt, metrics, reducedMotion) {
  const speed = Number(config.animationSpeed || 0.86) * (reducedMotion ? 0.48 : 1);
  const pulse = Math.sin(pointer.time * 0.32 * speed + body.phase + body.domain * 0.48) * 0.5 + 0.5;
  const idleOrder = clamp(body.restOrder + pulse * 0.035, 0.38, 1);
  applyPointer(body, pointer, config, dt);
  applyRelease(body, pointer, config, dt);
  body.heat *= Math.pow(0.018, dt * speed);
  body.order += (idleOrder - body.order) * clamp(dt * speed * 0.34, 0, 1);
  body.order = clamp(body.order - body.heat * dt * 0.18, 0.28, 1);

  const mix = smoothstep(body.order);
  const loose = 1 - mix;
  const homeX = body.looseX * loose + body.targetX * mix
    + Math.cos(pointer.time * 0.22 * speed + body.domain) * loose * body.r * 1.6;
  const homeY = body.looseY * loose + body.targetY * mix
    + Math.sin(pointer.time * 0.2 * speed + body.domain * 1.7) * loose * body.r * 1.2;
  const spring = (0.018 + mix * 0.075) * speed;
  body.vx += (homeX - body.x) * spring;
  body.vy += (homeY - body.y) * spring;

  const damping = Math.pow(Number(config.damping || 0.82), dt * 60);
  body.vx *= damping;
  body.vy *= damping;
  body.x += body.vx * dt * 60;
  body.y += body.vy * dt * 60;

  const margin = Math.max(10, Math.min(metrics.cssWidth, metrics.cssHeight) * 0.018);
  if (body.x < margin + body.r) {
    body.x = margin + body.r;
    body.vx = Math.abs(body.vx) * 0.24;
  } else if (body.x > metrics.cssWidth - margin - body.r) {
    body.x = metrics.cssWidth - margin - body.r;
    body.vx = -Math.abs(body.vx) * 0.24;
  }
  if (body.y < margin + body.r) {
    body.y = margin + body.r;
    body.vy = Math.abs(body.vy) * 0.24;
  } else if (body.y > metrics.cssHeight - margin - body.r) {
    body.y = metrics.cssHeight - margin - body.r;
    body.vy = -Math.abs(body.vy) * 0.24;
  }
}

function applyCollisionPair(a, b, config) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const minDistance = (a.r + b.r) * Number(config.collisionRadius || 1.06);
  const distanceSq = dx * dx + dy * dy;
  if (distanceSq <= 0.0001 || distanceSq >= minDistance * minDistance) return;
  const distance = Math.sqrt(distanceSq);
  const push = (minDistance - distance) * 0.5;
  const nx = dx / distance;
  const ny = dy / distance;
  a.x -= nx * push;
  a.y -= ny * push;
  b.x += nx * push;
  b.y += ny * push;
  const relativeVelocity = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (relativeVelocity < 0) {
    const impulse = relativeVelocity * -0.09;
    a.vx -= nx * impulse;
    a.vy -= ny * impulse;
    b.vx += nx * impulse;
    b.vy += ny * impulse;
  }
}

function applyCollisions(bodies, config) {
  const maxRadius = bodies.reduce((max, body) => Math.max(max, body.r), 0);
  const cellSize = Math.max(12, maxRadius * 2.8);
  const grid = new Map();
  for (const body of bodies) {
    const key = `${Math.floor(body.x / cellSize)}:${Math.floor(body.y / cellSize)}`;
    const list = grid.get(key);
    if (list) list.push(body);
    else grid.set(key, [body]);
  }

  for (const [key, cellBodies] of grid.entries()) {
    const [cellX, cellY] = key.split(':').map(Number);
    for (let ox = -1; ox <= 1; ox += 1) {
      for (let oy = -1; oy <= 1; oy += 1) {
        const neighbor = grid.get(`${cellX + ox}:${cellY + oy}`);
        if (!neighbor) continue;
        for (const a of cellBodies) {
          for (const b of neighbor) {
            if (a.bodyIndex >= b.bodyIndex) continue;
            applyCollisionPair(a, b, config);
          }
        }
      }
    }
  }
}

function shouldPauseForVisibility(config) {
  return config.pauseWhenHidden !== false
    && typeof document !== 'undefined'
    && document.hidden;
}

export function createPhaseForgeRenderer({ canvas, reducedMotion = false, getConfig, getTheme }) {
  const ctx = canvas.getContext('2d', { alpha: true });
  const pointer = {
    x: 0,
    y: 0,
    lastX: 0,
    lastY: 0,
    vx: 0,
    vy: 0,
    active: false,
    down: false,
    releaseX: 0,
    releaseY: 0,
    releaseEnergy: 0,
    time: 0,
  };
  let metrics = null;
  let bodies = [];
  let frameId = 0;
  let started = false;
  let lastTime = 0;
  let lastStepTime = 0;
  let layoutKey = '';
  let seed = 42137;

  function getLayoutKey(config, theme) {
    return [
      Math.round(metrics?.cssWidth || 0),
      Math.round(metrics?.cssHeight || 0),
      Number(config.count || 0),
      Number(config.minRadius || 0).toFixed(3),
      Number(config.maxRadius || 0).toFixed(3),
      Number(config.mobileDensityScale || 0).toFixed(3),
      Number(config.mobileRadiusScale || 0).toFixed(3),
      config.palette,
      resolvePalette(theme).join(','),
    ].join(':');
  }

  function rebuildBodies(config, theme) {
    bodies = buildBodies(mulberry32(seed), config, theme, metrics);
  }

  function syncLayout() {
    const config = getConfig();
    const theme = getTheme() || DEFAULT_THEME;
    metrics = resizeCanvasToDisplaySize(canvas, resolveDpr(config));
    if (!pointer.x && !pointer.y) {
      pointer.x = metrics.cssWidth * 0.5;
      pointer.y = metrics.cssHeight * 0.5;
      pointer.lastX = pointer.x;
      pointer.lastY = pointer.y;
    }

    const nextLayoutKey = getLayoutKey(config, theme);
    if (metrics.changed || nextLayoutKey !== layoutKey) {
      layoutKey = nextLayoutKey;
      rebuildBodies(config, theme);
    }
  }

  function render() {
    if (!ctx || !metrics) return;
    const theme = getTheme() || DEFAULT_THEME;
    ctx.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = theme.active || DEFAULT_THEME.active;
    ctx.fillRect(0, 0, metrics.cssWidth, metrics.cssHeight);

    for (const body of bodies) {
      const mix = smoothstep(body.order);
      ctx.globalAlpha = 0.74 + mix * 0.26;
      ctx.beginPath();
      ctx.arc(body.x, body.y, body.r * (0.92 + mix * 0.08), 0, TAU);
      ctx.fillStyle = body.color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function step(now) {
    frameId = window.requestAnimationFrame(step);
    const config = getConfig();
    if (!ctx || !config.enabled || shouldPauseForVisibility(config)) return;

    const targetInterval = 1000 / clamp(Number(config.targetFps || 60), 24, 60);
    if (lastStepTime && now - lastStepTime < targetInterval - 1) return;
    lastStepTime = now;

    syncLayout();
    const rawDt = lastTime ? (now - lastTime) / 1000 : 1 / 60;
    lastTime = now;
    const dt = clamp(rawDt, 1 / 120, 1 / 24);
    pointer.time = now / 1000;
    pointer.releaseEnergy *= Math.pow(0.06, dt);

    for (const body of bodies) {
      updateBody(body, config, pointer, dt, metrics, reducedMotion);
    }
    applyCollisions(bodies, config);
    applyCollisions(bodies, config);
    render();
  }

  function start() {
    syncLayout();
    render();
    if (started) return;
    started = true;
    lastTime = 0;
    lastStepTime = 0;
    frameId = window.requestAnimationFrame(step);
  }

  function updatePointerFromEvent(event) {
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    pointer.vx = x - pointer.lastX;
    pointer.vy = y - pointer.lastY;
    pointer.lastX = x;
    pointer.lastY = y;
    pointer.x = x;
    pointer.y = y;
    pointer.active = true;
  }

  function handlePointerMove(event) {
    updatePointerFromEvent(event);
    if (pointer.down) event.preventDefault();
  }

  function handlePointerDown(event) {
    updatePointerFromEvent(event);
    pointer.down = true;
    pointer.releaseEnergy = 0;
    try {
      canvas.setPointerCapture?.(event.pointerId);
    } catch {
      // Pointer capture can fail for synthetic events; move/up handling still works.
    }
    event.preventDefault();
  }

  function handlePointerUp(event) {
    updatePointerFromEvent(event);
    pointer.down = false;
    pointer.releaseX = pointer.x;
    pointer.releaseY = pointer.y;
    pointer.releaseEnergy = clamp(Math.hypot(pointer.vx, pointer.vy) / 36, 0.16, 1.2);
    pointer.vx *= 0.2;
    pointer.vy *= 0.2;
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
    pointer.vx = 0;
    pointer.vy = 0;
  }

  function handlePointerCancel(event) {
    pointer.active = false;
    pointer.down = false;
    pointer.vx = 0;
    pointer.vy = 0;
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

  function resetSeed(nextSeed = 42137) {
    seed = Number.isFinite(Number(nextSeed)) ? Number(nextSeed) : 42137;
    layoutKey = '';
    syncLayout();
    render();
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
    resetSeed,
    renderOnce: () => {
      syncLayout();
      render();
    },
    getMetrics: () => {
      const crystallineCount = bodies.filter((body) => body.order > 0.72).length;
      return {
        ...metrics,
        bodyCount: bodies.length,
        crystallineRatio: bodies.length ? crystallineCount / bodies.length : 0,
        dragging: pointer.down,
        dragAction: pointer.down ? 'crystallize' : 'none',
        pointerActive: pointer.active,
        releaseEnergy: pointer.releaseEnergy,
      };
    },
  };
}
