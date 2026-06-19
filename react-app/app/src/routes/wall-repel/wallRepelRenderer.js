const TAU = Math.PI * 2;
const REFERENCE_AREA = 1440 * 900;
const DEFAULT_THEME = {
  light: '#efefef',
  dark: '#202020',
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

function parseHexColor(value, fallback = '#202020') {
  const source = String(value || fallback).trim();
  const match = /^#?([0-9a-f]{6})$/i.exec(source);
  const hex = match ? match[1] : fallback.replace('#', '');
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function rgbString(color, alpha = 1) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function mixColor(a, b, amount) {
  const t = clamp(amount, 0, 1);
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
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

function pickWeightedPaletteIndex(random, theme) {
  const palette = resolvePalette(theme);
  const distribution = resolveColorDistribution(theme, palette.length);
  let total = 0;

  for (const row of distribution) total += row.weight;
  if (total <= 0) return 0;

  let sample = random() * total;
  for (const row of distribution) {
    sample -= row.weight;
    if (sample <= 0) return row.colorIndex;
  }
  return distribution[distribution.length - 1]?.colorIndex || 0;
}

function getThemeKey(theme) {
  return [
    theme?.active,
    theme?.light,
    theme?.dark,
    resolvePalette(theme).join(','),
  ].join(':');
}

function getConfigKey(config, count, theme, metrics) {
  return [
    count,
    Math.round(metrics?.cssWidth || 0),
    Math.round(metrics?.cssHeight || 0),
    Number(config.ballRadius).toFixed(3),
    Number(config.sizeVariation).toFixed(3),
    Number(config.initialSpeed).toFixed(3),
    Number(config.directionalBias).toFixed(3),
    Number(config.spinBias).toFixed(3),
    getThemeKey(theme),
  ].join(':');
}

function resolveDpr(config) {
  const deviceDpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const configuredMax = clamp(Number(config.maxDpr) || 1.5, 0.75, 2);
  const viewportWidth = typeof window === 'undefined' ? 1024 : window.innerWidth || 1024;
  const mobileMax = viewportWidth < 520 ? 1.2 : (viewportWidth < 820 ? 1.35 : configuredMax);
  return clamp(Math.min(deviceDpr, configuredMax, mobileMax), 0.75, 2);
}

function resolveTargetFps(config, reducedMotion) {
  const target = Math.round(clamp(Number(config.targetFps) || 60, 24, 60));
  return reducedMotion ? Math.min(target, 30) : target;
}

function shouldPauseForVisibility(config) {
  return config.pauseWhenHidden !== false
    && typeof document !== 'undefined'
    && document.hidden;
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

function resolveBallCount(config, metrics, reducedMotion) {
  const baseCount = clamp(Math.round(Number(config.ballCount) || 220), 40, 520);
  const areaScale = clamp((metrics.cssWidth * metrics.cssHeight) / REFERENCE_AREA, 0.35, 1);
  const mobileScale = metrics.cssWidth < 720 ? clamp(Number(config.mobileCountScale) || 0.62, 0.25, 1) : 1;
  const motionScale = reducedMotion ? 0.72 : 1;
  const dprScale = clamp(1.5 / Math.max(metrics.dpr, 0.75), 0.78, 1.08);
  return Math.max(28, Math.round(baseCount * areaScale * mobileScale * motionScale * dprScale));
}

function resolveWallRange(config, metrics) {
  const configuredRange = clamp(Number(config.wallRange) || 210, 40, 520);
  const shortSide = Math.max(1, Math.min(metrics.cssWidth, metrics.cssHeight));
  const mobileLimit = metrics.cssWidth < 720
    ? shortSide * 0.48
    : shortSide * 0.72;
  return clamp(Math.min(configuredRange, mobileLimit), 40, 520);
}

function createState(count, metrics, theme, config) {
  const random = mulberry32(0x43f17a91);
  const baseRadius = clamp(Number(config.ballRadius) || 12.4, 6, 22);
  const sizeVariation = clamp(Number(config.sizeVariation) || 0, 0, 0.28);
  const initialSpeed = clamp(Number(config.initialSpeed) || 820, 0, 1800);
  const directionalBias = clamp(Number(config.directionalBias) || 0, 0, 1);
  const spinBias = clamp(Number(config.spinBias) || 0, 0, 1);
  const maxRadius = baseRadius * (1 + sizeVariation);
  const cellSize = Math.max(26, maxRadius * 3.25);
  const gridCols = Math.max(1, Math.ceil(metrics.cssWidth / cellSize));
  const gridRows = Math.max(1, Math.ceil(metrics.cssHeight / cellSize));
  const state = {
    count,
    x: new Float32Array(count),
    y: new Float32Array(count),
    vx: new Float32Array(count),
    vy: new Float32Array(count),
    radius: new Float32Array(count),
    phase: new Float32Array(count),
    colorIndex: new Uint8Array(count),
    next: new Int32Array(count),
    head: new Int32Array(gridCols * gridRows),
    gridCols,
    gridRows,
    cellSize,
    configKey: getConfigKey(config, count, theme, metrics),
  };
  const centerX = metrics.cssWidth * 0.5;
  const centerY = metrics.cssHeight * 0.5;
  const marginBase = maxRadius + 12;
  const minX = marginBase;
  const maxX = Math.max(minX, metrics.cssWidth - marginBase);
  const minY = marginBase;
  const maxY = Math.max(minY, metrics.cssHeight - marginBase);

  for (let i = 0; i < count; i += 1) {
    const radius = baseRadius * (1 + (random() * 2 - 1) * sizeVariation);
    const x = minX + random() * Math.max(1, maxX - minX);
    const y = minY + random() * Math.max(1, maxY - minY);
    const outwardXRaw = x - centerX;
    const outwardYRaw = y - centerY;
    const outwardLength = Math.hypot(outwardXRaw, outwardYRaw) || 1;
    const outwardX = outwardXRaw / outwardLength;
    const outwardY = outwardYRaw / outwardLength;
    const spinSign = random() < 0.5 ? -1 : 1;
    const tangentX = -outwardY * spinSign;
    const tangentY = outwardX * spinSign;
    const randomAngle = random() * TAU;
    let dirX = Math.cos(randomAngle);
    let dirY = Math.sin(randomAngle);
    dirX += outwardX * directionalBias + tangentX * spinBias;
    dirY += outwardY * directionalBias + tangentY * spinBias;
    const dirLength = Math.hypot(dirX, dirY) || 1;
    const speed = initialSpeed * (0.78 + random() * 0.84);

    state.radius[i] = radius;
    state.x[i] = x;
    state.y[i] = y;
    state.vx[i] = (dirX / dirLength) * speed;
    state.vy[i] = (dirY / dirLength) * speed;
    state.phase[i] = random() * TAU;
    state.colorIndex[i] = pickWeightedPaletteIndex(random, theme);
  }

  return state;
}

function getPointerPower(pointer, now, config, reducedMotion) {
  if (reducedMotion) return 0;
  const strength = clamp(Number(config.mouseStrength) || 0, 0, 5200);
  if (strength <= 0) return 0;
  const age = now - pointer.lastAt;
  if (!Number.isFinite(age) || age < 0) return 0;
  if (pointer.inBounds || pointer.active) return 1;
  const decay = clamp(Number(config.mouseWakeDecay) || 1180, 120, 2600);
  return Math.exp(-age / decay);
}

function rebuildGrid(state) {
  state.head.fill(-1);
  for (let i = 0; i < state.count; i += 1) {
    const col = clamp(Math.floor(state.x[i] / state.cellSize), 0, state.gridCols - 1);
    const row = clamp(Math.floor(state.y[i] / state.cellSize), 0, state.gridRows - 1);
    const cell = row * state.gridCols + col;
    state.next[i] = state.head[cell];
    state.head[cell] = i;
  }
}

function applyWallForce(state, index, metrics, config, force) {
  const x = state.x[index];
  const y = state.y[index];
  const r = state.radius[index];
  const range = resolveWallRange(config, metrics);
  const strength = clamp(Number(config.wallStrength) || 7200, 0, 9000);
  const curve = clamp(Number(config.wallCurve) || 1.35, 0.65, 4);
  const wallKick = clamp(Number(config.wallKick) || 0, 0, 1.5);
  if (strength <= 0 || range <= 0) return;

  const left = x - r;
  const right = metrics.cssWidth - r - x;
  const top = y - r;
  const bottom = metrics.cssHeight - r - y;

  if (left < range) {
    const q = Math.pow(1 - clamp(left / range, 0, 1), curve);
    const kick = state.vx[index] < 0 ? wallKick * strength * 1.45 : wallKick * strength * 0.42;
    force.ax += q * (strength + kick);
  }
  if (right < range) {
    const q = Math.pow(1 - clamp(right / range, 0, 1), curve);
    const kick = state.vx[index] > 0 ? wallKick * strength * 1.45 : wallKick * strength * 0.42;
    force.ax -= q * (strength + kick);
  }
  if (top < range) {
    const q = Math.pow(1 - clamp(top / range, 0, 1), curve);
    const kick = state.vy[index] < 0 ? wallKick * strength * 1.1 : wallKick * strength * 0.32;
    force.ay += q * (strength + kick);
  }
  if (bottom < range) {
    const q = Math.pow(1 - clamp(bottom / range, 0, 1), curve);
    const kick = state.vy[index] > 0 ? wallKick * strength * 1.1 : wallKick * strength * 0.32;
    force.ay -= q * (strength + kick);
  }
}

function applyPointerForce(state, index, config, pointer, pointerPower, force) {
  if (pointerPower <= 0) return;
  const radius = clamp(Number(config.mouseRadius) || 210, 50, 420);
  const strength = clamp(Number(config.mouseStrength) || 3000, 0, 5200);
  const curve = clamp(Number(config.mouseCurve) || 2, 0.65, 4);
  if (strength <= 0 || radius <= 0) return;

  const dx = state.x[index] - pointer.x;
  const dy = state.y[index] - pointer.y;
  const distSq = dx * dx + dy * dy;
  if (distSq <= 0.001 || distSq >= radius * radius) return;

  const dist = Math.sqrt(distSq);
  const influence = Math.pow(1 - dist / radius, curve) * strength * pointerPower;
  force.ax += (dx / dist) * influence;
  force.ay += (dy / dist) * influence;
}

function applyIdleDrift(state, index, config, nowSeconds, reducedMotion, force) {
  const drift = reducedMotion
    ? Math.min(clamp(Number(config.idleDrift) || 0, 0, 0.5), 0.08)
    : clamp(Number(config.idleDrift) || 0, 0, 0.5);
  if (drift <= 0) return;

  const phase = state.phase[index];
  const driftForce = 280 * drift;
  force.ax += Math.sin(nowSeconds * 0.83 + phase * 1.7) * driftForce;
  force.ay += Math.cos(nowSeconds * 0.71 + phase * 1.3) * driftForce;
}

function constrainToBounds(state, index, metrics) {
  const radius = state.radius[index];
  const bounce = 0.42;

  if (state.x[index] < radius) {
    state.x[index] = radius;
    if (state.vx[index] < 0) state.vx[index] = -state.vx[index] * bounce;
  } else if (state.x[index] > metrics.cssWidth - radius) {
    state.x[index] = metrics.cssWidth - radius;
    if (state.vx[index] > 0) state.vx[index] = -state.vx[index] * bounce;
  }

  if (state.y[index] < radius) {
    state.y[index] = radius;
    if (state.vy[index] < 0) state.vy[index] = -state.vy[index] * bounce;
  } else if (state.y[index] > metrics.cssHeight - radius) {
    state.y[index] = metrics.cssHeight - radius;
    if (state.vy[index] > 0) state.vy[index] = -state.vy[index] * bounce;
  }
}

function resolveCollisions(state, metrics, config) {
  const iterations = Math.round(clamp(Number(config.collisionIterations) || 2, 1, 4));
  const push = clamp(Number(config.collisionPush) || 0.76, 0.1, 1.2);
  const restitution = 0.16;

  for (let iteration = 0; iteration < iterations; iteration += 1) {
    rebuildGrid(state);
    for (let row = 0; row < state.gridRows; row += 1) {
      for (let col = 0; col < state.gridCols; col += 1) {
        const startRow = Math.max(0, row - 1);
        const endRow = Math.min(state.gridRows - 1, row + 1);
        const startCol = Math.max(0, col - 1);
        const endCol = Math.min(state.gridCols - 1, col + 1);

        for (let i = state.head[row * state.gridCols + col]; i !== -1; i = state.next[i]) {
          for (let otherRow = startRow; otherRow <= endRow; otherRow += 1) {
            for (let otherCol = startCol; otherCol <= endCol; otherCol += 1) {
              for (
                let j = state.head[otherRow * state.gridCols + otherCol];
                j !== -1;
                j = state.next[j]
              ) {
                if (j <= i) continue;
                const dx = state.x[j] - state.x[i];
                const dy = state.y[j] - state.y[i];
                const minDistance = state.radius[i] + state.radius[j] + 1.2;
                const distSq = dx * dx + dy * dy;
                if (distSq <= 0.0001 || distSq >= minDistance * minDistance) continue;

                const dist = Math.sqrt(distSq);
                const nx = dx / dist;
                const ny = dy / dist;
                const overlap = minDistance - dist;
                const correction = overlap * 0.5 * push;
                state.x[i] -= nx * correction;
                state.y[i] -= ny * correction;
                state.x[j] += nx * correction;
                state.y[j] += ny * correction;
                constrainToBounds(state, i, metrics);
                constrainToBounds(state, j, metrics);

                const relVx = state.vx[j] - state.vx[i];
                const relVy = state.vy[j] - state.vy[i];
                const relNormal = relVx * nx + relVy * ny;
                if (relNormal < 0) {
                  const impulse = -(1 + restitution) * relNormal * 0.5;
                  state.vx[i] -= nx * impulse;
                  state.vy[i] -= ny * impulse;
                  state.vx[j] += nx * impulse;
                  state.vy[j] += ny * impulse;
                }
              }
            }
          }
        }
      }
    }
  }
}

function updateState(state, metrics, config, pointer, now, deltaSeconds, reducedMotion) {
  if (config.enabled === false) return;

  const nowSeconds = now / 1000;
  const pointerPower = getPointerPower(pointer, now, config, reducedMotion);
  const drag = clamp(Number(config.drag) || 0, 0, 0.18);
  const damping = Math.exp(-drag * 10 * deltaSeconds);
  const momentumFloor = reducedMotion
    ? Math.min(clamp(Number(config.momentumFloor) || 0, 0, 620), 90)
    : clamp(Number(config.momentumFloor) || 0, 0, 620);
  const maxSpeed = reducedMotion
    ? Math.min(clamp(Number(config.maxSpeed) || 1600, 80, 2200), 240)
    : clamp(Number(config.maxSpeed) || 1600, 80, 2200);
  const force = { ax: 0, ay: 0 };

  for (let i = 0; i < state.count; i += 1) {
    force.ax = 0;
    force.ay = 0;
    applyWallForce(state, i, metrics, config, force);
    applyPointerForce(state, i, config, pointer, pointerPower, force);
    applyIdleDrift(state, i, config, nowSeconds, reducedMotion, force);

    state.vx[i] = (state.vx[i] + force.ax * deltaSeconds) * damping;
    state.vy[i] = (state.vy[i] + force.ay * deltaSeconds) * damping;

    let speed = Math.hypot(state.vx[i], state.vy[i]);
    if (momentumFloor > 0 && speed < momentumFloor) {
      if (speed > 0.001) {
        const lift = (momentumFloor - speed) * (1 - Math.exp(-4.8 * deltaSeconds));
        state.vx[i] += (state.vx[i] / speed) * lift;
        state.vy[i] += (state.vy[i] / speed) * lift;
      } else {
        const phase = state.phase[i];
        state.vx[i] = Math.cos(phase) * momentumFloor;
        state.vy[i] = Math.sin(phase) * momentumFloor;
      }
      speed = Math.hypot(state.vx[i], state.vy[i]);
    }
    if (speed > maxSpeed && speed > 0.0001) {
      const scale = maxSpeed / speed;
      state.vx[i] *= scale;
      state.vy[i] *= scale;
    }

    state.x[i] += state.vx[i] * deltaSeconds;
    state.y[i] += state.vy[i] * deltaSeconds;
    constrainToBounds(state, i, metrics);
  }

  resolveCollisions(state, metrics, config);

  if (momentumFloor > 0) {
    const liftFactor = 1 - Math.exp(-7.2 * deltaSeconds);
    for (let i = 0; i < state.count; i += 1) {
      const speed = Math.hypot(state.vx[i], state.vy[i]);
      if (speed >= momentumFloor) continue;
      if (speed > 0.001) {
        const lift = (momentumFloor - speed) * liftFactor;
        state.vx[i] += (state.vx[i] / speed) * lift;
        state.vy[i] += (state.vy[i] / speed) * lift;
      } else {
        const phase = state.phase[i];
        state.vx[i] = Math.cos(phase) * momentumFloor;
        state.vy[i] = Math.sin(phase) * momentumFloor;
      }
    }
  }
}

function createColorCache(theme) {
  const palette = resolvePalette(theme);
  const active = parseHexColor(theme?.active || DEFAULT_THEME.active);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  const lift = theme?.active === theme?.light ? black : white;
  return {
    active,
    backgroundTop: mixColor(active, lift, 0.025),
    backgroundBottom: mixColor(active, lift, 0.07),
    shadow: rgbString(black, theme?.active === theme?.light ? 0.13 : 0.2),
    body: palette.map((color) => parseHexColor(color)),
    highlight: palette.map((color) => mixColor(parseHexColor(color), white, 0.3)),
  };
}

function drawState(ctx, state, metrics, theme) {
  const colors = createColorCache(theme);
  ctx.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  const gradient = ctx.createLinearGradient(0, 0, metrics.cssWidth, metrics.cssHeight);
  gradient.addColorStop(0, rgbString(colors.backgroundTop, 1));
  gradient.addColorStop(0.55, rgbString(colors.active, 1));
  gradient.addColorStop(1, rgbString(colors.backgroundBottom, 1));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, metrics.cssWidth, metrics.cssHeight);

  ctx.fillStyle = colors.shadow;
  ctx.beginPath();
  for (let i = 0; i < state.count; i += 1) {
    const radius = state.radius[i];
    ctx.moveTo(state.x[i] + radius + 1.5, state.y[i] + 2.4);
    ctx.arc(state.x[i] + 1.5, state.y[i] + 2.4, radius * 1.01, 0, TAU);
  }
  ctx.fill();

  for (let colorIndex = 0; colorIndex < colors.body.length; colorIndex += 1) {
    ctx.fillStyle = rgbString(colors.body[colorIndex], 0.92);
    ctx.beginPath();
    for (let i = 0; i < state.count; i += 1) {
      if (state.colorIndex[i] !== colorIndex) continue;
      ctx.moveTo(state.x[i] + state.radius[i], state.y[i]);
      ctx.arc(state.x[i], state.y[i], state.radius[i], 0, TAU);
    }
    ctx.fill();

    ctx.fillStyle = rgbString(colors.highlight[colorIndex], 0.12);
    ctx.beginPath();
    for (let i = 0; i < state.count; i += 1) {
      if (state.colorIndex[i] !== colorIndex) continue;
      const radius = state.radius[i] * 0.28;
      ctx.moveTo(state.x[i] - state.radius[i] * 0.2 + radius, state.y[i] - state.radius[i] * 0.24);
      ctx.arc(state.x[i] - state.radius[i] * 0.2, state.y[i] - state.radius[i] * 0.24, radius, 0, TAU);
    }
    ctx.fill();
  }
}

function isEventOnPanel(target) {
  return Boolean(target?.closest?.('.wall-repel-panel'));
}

export function createWallRepelRenderer({
  canvas,
  reducedMotion = false,
  getConfig,
  getTheme,
}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const pointer = {
    x: 0,
    y: 0,
    active: false,
    inBounds: false,
    lastAt: -Infinity,
  };
  let state = null;
  let metrics = null;
  let rafId = 0;
  let running = false;
  let lastFrameAt = 0;
  let lastUpdateAt = 0;
  let lastRenderMs = 0;

  function readPointer(event) {
    if (isEventOnPanel(event.target)) return;
    const rect = canvas.getBoundingClientRect();
    const nextX = event.clientX - rect.left;
    const nextY = event.clientY - rect.top;
    const inBounds = (
      event.clientX >= rect.left
      && event.clientX <= rect.right
      && event.clientY >= rect.top
      && event.clientY <= rect.bottom
    );
    if (!inBounds) {
      pointer.inBounds = false;
      return;
    }
    pointer.x = nextX;
    pointer.y = nextY;
    pointer.inBounds = true;
    pointer.lastAt = performance.now();
  }

  function ensureState(config, theme) {
    const count = resolveBallCount(config, metrics, reducedMotion);
    const key = getConfigKey(config, count, theme, metrics);
    if (!state || state.configKey !== key) {
      state = createState(count, metrics, theme, config);
    }
  }

  function render(now = performance.now()) {
    const config = getConfig();
    const theme = getTheme();
    const dpr = resolveDpr(config);
    metrics = resizeCanvasToDisplaySize(canvas, dpr);
    ensureState(config, theme);

    const deltaSeconds = lastUpdateAt > 0
      ? clamp((now - lastUpdateAt) / 1000, 0.001, 0.045)
      : 1 / 60;
    lastUpdateAt = now;

    const startedAt = performance.now();
    updateState(state, metrics, config, pointer, now, deltaSeconds, reducedMotion);
    drawState(ctx, state, metrics, theme);
    lastRenderMs = performance.now() - startedAt;
  }

  function tick(now) {
    rafId = 0;
    if (!running) return;
    const config = getConfig();

    if (!shouldPauseForVisibility(config)) {
      const targetFps = resolveTargetFps(config, reducedMotion);
      const frameInterval = 1000 / targetFps;
      if (!lastFrameAt || now - lastFrameAt >= frameInterval - 1) {
        lastFrameAt = now;
        render(now);
      }
    }

    rafId = window.requestAnimationFrame(tick);
  }

  function start() {
    const config = getConfig();
    metrics = resizeCanvasToDisplaySize(canvas, resolveDpr(config));
    if (!running) {
      running = true;
      lastFrameAt = 0;
      lastUpdateAt = 0;
      rafId = window.requestAnimationFrame(tick);
    }
  }

  function destroyLoop() {
    running = false;
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
    state = null;
  }

  function handlePointerDown(event) {
    pointer.active = true;
    readPointer(event);
  }

  function handlePointerUp(event) {
    pointer.active = false;
    readPointer(event);
  }

  function handlePointerCancel() {
    pointer.active = false;
    pointer.inBounds = false;
  }

  function handlePointerLeave() {
    pointer.active = false;
    pointer.inBounds = false;
  }

  window.addEventListener('pointermove', readPointer, { passive: true });
  window.addEventListener('pointerdown', handlePointerDown, { passive: true });
  window.addEventListener('pointerup', handlePointerUp, { passive: true });
  window.addEventListener('pointercancel', handlePointerCancel, { passive: true });
  window.addEventListener('pointerleave', handlePointerLeave, { passive: true });

  return {
    start,
    destroy() {
      destroyLoop();
      window.removeEventListener('pointermove', readPointer);
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
      window.removeEventListener('pointerleave', handlePointerLeave);
    },
    renderOnce: () => render(performance.now()),
    getMetrics: () => {
      let meanSpeed = 0;
      let meanCenterDistance = 0;
      let minX = Number.POSITIVE_INFINITY;
      let maxX = Number.NEGATIVE_INFINITY;
      let minY = Number.POSITIVE_INFINITY;
      let maxY = Number.NEGATIVE_INFINITY;
      const count = state?.count || 0;
      const centerX = (metrics?.cssWidth || 1) * 0.5;
      const centerY = (metrics?.cssHeight || 1) * 0.5;

      if (state && count > 0) {
        for (let i = 0; i < count; i += 1) {
          meanSpeed += Math.hypot(state.vx[i], state.vy[i]);
          meanCenterDistance += Math.hypot(state.x[i] - centerX, state.y[i] - centerY);
          minX = Math.min(minX, state.x[i]);
          maxX = Math.max(maxX, state.x[i]);
          minY = Math.min(minY, state.y[i]);
          maxY = Math.max(maxY, state.y[i]);
        }
        meanSpeed /= count;
        meanCenterDistance /= count;
      }

      return {
        ...metrics,
        count,
        dpr: metrics?.dpr || 1,
        lastRenderMs,
        targetFps: resolveTargetFps(getConfig(), reducedMotion),
        meanSpeed,
        meanCenterDistance,
        bounds: count > 0
          ? { minX, maxX, minY, maxY }
          : null,
      };
    },
  };
}
