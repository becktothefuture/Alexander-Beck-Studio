const TAU = Math.PI * 2;
const SPEED_BUCKET_COUNT = 18;
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

function smoothStep(value) {
  const t = clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function resolveVerticalTarget(rawVerticalLoad) {
  const verticalDeadband = 0.055;
  if (rawVerticalLoad > verticalDeadband) {
    return clamp((rawVerticalLoad - verticalDeadband) / 0.76, 0, 1);
  }
  if (rawVerticalLoad < -verticalDeadband) {
    return -clamp((-rawVerticalLoad - verticalDeadband) / 0.72, 0, 1);
  }
  return 0;
}

function resolveEnergyTargetSpeed(
  cruiseSpeed,
  minSpeed,
  maxSpeed,
  depth,
  verticalLoad,
  diveAcceleration,
  climbSlowdown,
  carryEnergy,
) {
  const descent = smoothStep(Math.max(0, verticalLoad));
  const ascent = smoothStep(Math.max(0, -verticalLoad));
  const depthFactor = 0.94 + depth * 0.08;
  const energyFactor = 1 + diveAcceleration * descent - climbSlowdown * ascent + carryEnergy;
  return clamp(
    cruiseSpeed * depthFactor * energyFactor,
    Math.min(maxSpeed, minSpeed * 1.15),
    maxSpeed,
  );
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

function mixColor(a, b, amount) {
  const t = clamp(amount, 0, 1);
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

function rgbString(color, alpha = 1) {
  return `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
}

function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value || '').trim());
}

function resolvePalette(theme) {
  const source = Array.isArray(theme?.palette) ? theme.palette : DEFAULT_THEME.palette;
  const palette = source.filter(isHexColor);
  return palette.length > 0 ? palette : DEFAULT_THEME.palette;
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

  return distribution.length > 0 ? distribution : DEFAULT_THEME.colorDistribution;
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

function resolveDpr(config) {
  const deviceDpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  return clamp(Math.min(deviceDpr, Number(config.maxDpr) || 1.5), 0.75, 2);
}

function resizeCanvasToDisplaySize(canvas, dpr) {
  const rect = canvas.getBoundingClientRect();
  const width = Math.max(1, Math.round(rect.width * dpr));
  const height = Math.max(1, Math.round(rect.height * dpr));
  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }
  return {
    cssWidth: Math.max(1, rect.width),
    cssHeight: Math.max(1, rect.height),
    width,
    height,
    dpr,
  };
}

function shouldPauseForVisibility(config) {
  return config.pauseWhenHidden !== false
    && typeof document !== 'undefined'
    && document.hidden;
}

function resolveTargetFps(config, reducedMotion) {
  const target = Math.round(clamp(Number(config.targetFps) || 60, 24, 60));
  return reducedMotion ? Math.min(target, 30) : target;
}

function resolveBirdCount(config, metrics, reducedMotion) {
  const baseCount = clamp(Math.round(Number(config.birdCount) || 180), 40, 360);
  const mobileScale = metrics.cssWidth < 720 ? clamp(Number(config.mobileCountScale) || 0.72, 0.35, 1) : 1;
  const motionScale = reducedMotion ? 0.74 : 1;
  return Math.max(24, Math.round(baseCount * mobileScale * motionScale));
}

function drawBackground(ctx, metrics, theme, config) {
  const active = parseHexColor(theme.active || DEFAULT_THEME.active);
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  const lift = theme.active === theme.light ? black : white;
  const liftAmount = clamp(Number(config.backgroundLift) || 0, 0, 0.7);
  const high = mixColor(active, lift, 0.02 + liftAmount * 0.08);
  const low = mixColor(active, lift, 0.05 + liftAmount * 0.16);
  const gradient = ctx.createLinearGradient(0, 0, metrics.cssWidth, metrics.cssHeight);

  gradient.addColorStop(0, rgbString(high, 1));
  gradient.addColorStop(0.55, rgbString(active, 1));
  gradient.addColorStop(1, rgbString(low, 1));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, metrics.cssWidth, metrics.cssHeight);
}

function createBirdColorCache(theme, config) {
  const active = parseHexColor(theme.active || DEFAULT_THEME.active);
  const white = { r: 255, g: 255, b: 255 };
  const shade = theme.active === theme.light ? active : white;
  const mutedAmount = theme.active === theme.light ? 0.12 : 0.04;
  const alpha = clamp(Number(config.colorOpacity) || 0.9, 0.2, 1);
  const palette = resolvePalette(theme);

  return palette.map((hex) => ({
    rgb: mixColor(parseHexColor(hex), shade, mutedAmount),
    alpha,
  }));
}

export function createFlockOfBirdsRenderer({
  canvas,
  getConfig,
  getTheme,
  reducedMotion = false,
} = {}) {
  const ctx = canvas.getContext('2d', { alpha: false });
  const rand = mulberry32(0x7f4a9c21);
  const pointer = {
    x: 0,
    y: 0,
    px: 0,
    py: 0,
    vx: 0,
    vy: 0,
    active: false,
    lastAt: 0,
  };
  const forceScratch = { ax: 0, ay: 0 };
  const state = {
    count: 0,
    x: new Float32Array(0),
    y: new Float32Array(0),
    vx: new Float32Array(0),
    vy: new Float32Array(0),
    phase: new Float32Array(0),
    depth: new Float32Array(0),
    verticalLoad: new Float32Array(0),
    bankLoad: new Float32Array(0),
    signedBankLoad: new Float32Array(0),
    speedBuckets: new Uint16Array(SPEED_BUCKET_COUNT),
    colorIndex: new Uint8Array(0),
    gridHead: new Int32Array(0),
    gridNext: new Int32Array(0),
    gridCols: 0,
    gridRows: 0,
    gridCellSize: 1,
    gridMinX: 0,
    initWidth: 0,
    initHeight: 0,
    initialized: false,
    warmed: false,
  };
  let metrics = {
    cssWidth: 1,
    cssHeight: 1,
    width: 1,
    height: 1,
    dpr: 1,
    birdCount: 0,
    neighborChecks: 0,
    avgSpeed: 0,
    avgVerticalLoad: 0,
    avgBankLoad: 0,
    avgDiveLoad: 0,
    avgClimbLoad: 0,
    avgDiveSpeed: 0,
    avgClimbSpeed: 0,
    p90Speed: 0,
    diveClimbSpeedDelta: 0,
    flockCenterX: 0,
    flockCenterY: 0,
    flockSpreadX: 0,
    flockMinY: 0,
    flockMaxY: 0,
    flightBandTop: 0,
    flightBandBottom: 0,
    verticalBandViolations: 0,
    offscreenBirds: 0,
    warmupFrames: 0,
    lastFrameMs: 0,
    targetFps: 60,
  };
  let rafId = 0;
  let timeoutId = 0;
  let destroyed = false;
  let lastTime = 0;

  function cancelScheduledFrame() {
    if (rafId) window.cancelAnimationFrame(rafId);
    if (timeoutId) window.clearTimeout(timeoutId);
    rafId = 0;
    timeoutId = 0;
  }

  function syncMetrics(config) {
    metrics = {
      ...metrics,
      ...resizeCanvasToDisplaySize(canvas, resolveDpr(config)),
    };
    ctx.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);
  }

  function resolveFlightBand(config, height, groundY) {
    const radius = Math.max(1, Number(config.birdRadius) || 10);
    const hardTop = config.topMargin + radius * 2.5;
    const hardBottom = groundY - radius * 4.2;
    const top = clamp(
      Math.max(config.topMargin + radius * 5.5, height * 0.18),
      hardTop,
      Math.max(hardTop, hardBottom - 96),
    );
    const minimumBand = Math.min(
      Math.max(96, height * 0.24),
      Math.max(64, hardBottom - top),
    );
    const naturalBottom = Math.min(
      groundY - Math.max(config.groundAvoidDistance * 0.98, radius * 10),
      height * 0.76,
    );
    const bottom = clamp(naturalBottom, top + minimumBand, hardBottom);

    return {
      top,
      bottom,
      center: (top + bottom) * 0.5,
      span: Math.max(1, bottom - top),
    };
  }

  function resolveInitialFlockCenterY(config, height, groundY) {
    const band = resolveFlightBand(config, height, groundY);
    return clamp(height * 0.4, band.top + band.span * 0.22, band.bottom - band.span * 0.22);
  }

  function initializeBirds(config, theme) {
    const count = resolveBirdCount(config, metrics, reducedMotion);
    const width = metrics.cssWidth;
    const height = metrics.cssHeight;
    const sizeChanged = Math.abs(width - state.initWidth) > 32 || Math.abs(height - state.initHeight) > 32;
    if (count === state.count && state.initialized && !sizeChanged) return false;

    state.count = count;
    state.x = new Float32Array(count);
    state.y = new Float32Array(count);
    state.vx = new Float32Array(count);
    state.vy = new Float32Array(count);
    state.phase = new Float32Array(count);
    state.depth = new Float32Array(count);
    state.verticalLoad = new Float32Array(count);
    state.bankLoad = new Float32Array(count);
    state.signedBankLoad = new Float32Array(count);
    state.speedBuckets = new Uint16Array(SPEED_BUCKET_COUNT);
    state.colorIndex = new Uint8Array(count);
    state.gridNext = new Int32Array(count);

    const groundY = height * config.groundLine;
    const flockCenterX = width * 0.5;
    const flockCenterY = resolveInitialFlockCenterY(config, height, groundY);
    const spreadX = Math.min(config.flockSpread * 0.7, width * 0.34);
    const spreadY = Math.min(config.flockSpread * 0.15, height * 0.11);
    const baseHeadingX = Math.cos(-0.08);
    const baseHeadingY = Math.sin(-0.08);

    for (let i = 0; i < count; i += 1) {
      const speed = config.cruiseSpeed * (0.76 + rand() * 0.42);
      const lane = (rand() + rand() + rand() - 1.5) / 1.5;
      const cloudX = (rand() + rand() + rand() + rand() - 2) * 0.5;
      const cloudY = (rand() + rand() + rand() + rand() - 2) * 0.5;
      const clusterPick = rand();
      const clusterX = clusterPick < 0.38
        ? -0.22 + rand() * 0.14
        : clusterPick < 0.72
          ? 0.18 + rand() * 0.16
          : -0.02 + rand() * 0.1;
      const clusterY = clusterPick < 0.38
        ? -0.04 + rand() * 0.08
        : clusterPick < 0.72
          ? 0.02 + rand() * 0.1
          : -0.08 + rand() * 0.08;
      const wake = Math.sin(cloudX * 3.2 + lane * 1.7) * 0.09
        + Math.sin(i * 0.37) * 0.04;
      const taper = 0.58 + Math.abs(cloudX) * 0.22;

      state.x[i] = clamp(
        flockCenterX
          + (cloudX * 0.78 + clusterX + lane * 0.11) * spreadX,
        16,
        width - 16,
      );
      state.y[i] = clamp(
        flockCenterY
          + (cloudY * taper + clusterY + wake) * spreadY,
        config.topMargin + 12,
        groundY - 22,
      );
      const relativeX = (state.x[i] - flockCenterX) / Math.max(1, spreadX);
      const relativeY = (state.y[i] - flockCenterY) / Math.max(1, spreadY);
      let tangentX = baseHeadingX + relativeY * -0.08 + lane * 0.08;
      let tangentY = baseHeadingY + relativeX * 0.08 + wake * 0.1;
      const tangentMag = Math.hypot(tangentX, tangentY);
      if (tangentMag > 0.0001) {
        tangentX /= tangentMag;
        tangentY /= tangentMag;
      } else {
        tangentX = baseHeadingX;
        tangentY = baseHeadingY;
      }
      const headingX = tangentX * 0.74 + baseHeadingX * 0.26 + lane * 0.08 + (rand() - 0.5) * 0.16;
      const headingY = tangentY * 0.74 + baseHeadingY * 0.26 + (rand() - 0.5) * 0.12;
      const headingMag = Math.max(0.0001, Math.hypot(headingX, headingY));
      state.vx[i] = (headingX / headingMag) * speed;
      state.vy[i] = (headingY / headingMag) * speed;
      state.phase[i] = rand() * TAU;
      state.depth[i] = (rand() * 2 - 1) * 0.65;
      state.colorIndex[i] = pickWeightedPaletteIndex(rand, theme);
    }

    state.initialized = true;
    state.warmed = false;
    state.initWidth = width;
    state.initHeight = height;
    return true;
  }

  function ensureGrid(config) {
    const cellSize = Math.max(20, Number(config.neighborRadius) || 86);
    const gridMinX = -metrics.cssWidth * 0.5;
    const gridWidth = metrics.cssWidth * 2;
    const cols = Math.max(1, Math.ceil(gridWidth / cellSize));
    const rows = Math.max(1, Math.ceil(metrics.cssHeight / cellSize));
    if (
      cols !== state.gridCols
      || rows !== state.gridRows
      || cellSize !== state.gridCellSize
      || gridMinX !== state.gridMinX
    ) {
      state.gridCols = cols;
      state.gridRows = rows;
      state.gridCellSize = cellSize;
      state.gridMinX = gridMinX;
      state.gridHead = new Int32Array(cols * rows);
    }
    state.gridHead.fill(-1);
  }

  function getCellIndex(x, y) {
    const col = clamp(Math.floor((x - state.gridMinX) / state.gridCellSize), 0, state.gridCols - 1);
    const row = clamp(Math.floor(y / state.gridCellSize), 0, state.gridRows - 1);
    return row * state.gridCols + col;
  }

  function rebuildGrid() {
    for (let i = 0; i < state.count; i += 1) {
      const cellIndex = getCellIndex(state.x[i], state.y[i]);
      state.gridNext[i] = state.gridHead[cellIndex];
      state.gridHead[cellIndex] = i;
    }
  }

  function addSoftBoundaryForces(config, i, ax, ay, time) {
    const x = state.x[i];
    const y = state.y[i];
    const vy = state.vy[i];
    const groundY = metrics.cssHeight * config.groundLine;
    const band = resolveFlightBand(config, metrics.cssHeight, groundY);
    const containment = config.skyContainment * 300;
    const topAvoidDistance = clamp(band.span * 0.34, 86, 220);
    const bottomAvoidDistance = clamp(Math.max(band.span * 0.42, config.groundAvoidDistance * 0.72), 110, 300);
    const predictedTopY = y + Math.min(vy, 0) * config.groundLookahead * 0.95;
    const predictedBottomY = y + Math.max(vy, 0) * config.groundLookahead * 1.05;
    const topStart = band.top + topAvoidDistance;
    const bottomStart = band.bottom - bottomAvoidDistance;

    if (predictedTopY < topStart) {
      const t = smoothStep((topStart - predictedTopY) / Math.max(1, topAvoidDistance));
      const lateral = Math.sin(state.phase[i] + time * 1.1 + x * 0.006);
      ay += containment * 1.12 * t;
      ax += lateral * containment * 0.16 * t;
      if (vy < 0) ay += -vy * 1.06 * t;
    }

    if (predictedBottomY > bottomStart) {
      const t = smoothStep((predictedBottomY - bottomStart) / Math.max(1, bottomAvoidDistance));
      const lateral = Math.sin(state.phase[i] + time * 1.45 + x * 0.008);
      ay -= config.groundAvoidance * 315 * t;
      ax += lateral * config.groundAvoidance * 84 * t;
      if (vy > 0) ay -= vy * 1.16 * t;
    }

    const bandOffset = (y - band.center) / Math.max(1, band.span * 0.5);
    const bandPressure = smoothStep((Math.abs(bandOffset) - 0.55) / 0.45);
    if (bandPressure > 0) {
      ay -= Math.sign(bandOffset) * containment * 0.22 * bandPressure;
    }

    forceScratch.ax = ax;
    forceScratch.ay = ay;
    return forceScratch;
  }

  function addMouseForces(config, i, ax, ay, allowPointer) {
    if (!allowPointer || !pointer.active) {
      forceScratch.ax = ax;
      forceScratch.ay = ay;
      return forceScratch;
    }

    const radius = Math.max(1, config.mouseRadius);
    const futureX = pointer.x + pointer.vx * 0.08;
    const futureY = pointer.y + pointer.vy * 0.08;
    const dx = state.x[i] - futureX;
    const dy = state.y[i] - futureY;
    const d2 = dx * dx + dy * dy;
    const r2 = radius * radius;
    if (d2 >= r2 || d2 < 0.0001) {
      forceScratch.ax = ax;
      forceScratch.ay = ay;
      return forceScratch;
    }

    const distance = Math.sqrt(d2);
    const awayX = dx / distance;
    const awayY = dy / distance;
    const falloff = smoothStep(1 - distance / radius);
    const split = ((i & 1) === 0 ? 1 : -1) * config.mouseLateral;
    const lateralX = -awayY * split;
    const lateralY = awayX * split;
    const strength = config.mouseAvoidance * 340 * falloff;

    ax += awayX * strength + lateralX * strength * 0.3;
    ay += awayY * strength * 0.82 + lateralY * strength * 0.18;
    forceScratch.ax = ax;
    forceScratch.ay = ay;
    return forceScratch;
  }

  function updateBirds(config, dt, now, allowPointer = true) {
    const time = now * 0.001;
    const motionScale = reducedMotion ? 0.42 : 1;
    const count = state.count;
    const width = metrics.cssWidth;
    const height = metrics.cssHeight;
    const flightLeft = -width * 0.5;
    const flightRight = width * 1.5;
    const flightCenterX = width * 0.5;
    const horizontalTurnBand = clamp(width * 0.26 + Math.min(config.edgeMargin, width * 0.18), 120, 560);
    const groundY = height * config.groundLine;
    const responsiveSpreadLimit = width < 720 ? width * 0.56 : width * 0.64;
    const effectiveFlockSpread = Math.min(config.flockSpread, Math.max(150, responsiveSpreadLimit));
    const homeHalfWidth = Math.min(width * 0.36, Math.max(width * 0.24, effectiveFlockSpread * 0.46));
    const neighborRadius = config.neighborRadius;
    const separationRadius = Math.min(config.separationRadius, neighborRadius - 4);
    const neighborR2 = neighborRadius * neighborRadius;
    const separationR2 = separationRadius * separationRadius;
    const cruiseSpeed = reducedMotion ? config.cruiseSpeed * 0.62 : config.cruiseSpeed;
    const minSpeed = reducedMotion ? config.minSpeed * 0.56 : config.minSpeed;
    const maxSpeed = reducedMotion ? config.maxSpeed * 0.72 : config.maxSpeed;
    const forceLimit = config.maxForce * config.turnAgility * motionScale;
    const energyWeight = clamp(Number(config.weight) || 0, 0, 1) * (reducedMotion ? 0.42 : 1);
    const inertiaControl = clamp(((Number(config.inertia) || 1.22) - 0.6) / 1.8, 0, 1);
    const diveAcceleration = clamp(Number(config.diveAcceleration) || 0, 0, 0.9) * energyWeight;
    const climbSlowdown = clamp(Number(config.climbSlowdown) || 0, 0, 0.75) * energyWeight;
    const speedResponse = clamp(Number(config.speedResponse) || 0.62, 0.15, 1.5) * (reducedMotion ? 0.55 : 1);
    const liftRecovery = clamp(Number(config.liftRecovery) || 0, 0, 0.7) * energyWeight;
    const bankLift = clamp(Number(config.bankLift) || 0, 0, 0.6) * energyWeight;
    const flightBand = resolveFlightBand(config, height, groundY);
    const courseSkyTop = flightBand.top;
    const courseSkyBottom = flightBand.bottom;
    const courseBandSpan = flightBand.span;
    const topPressureBand = clamp(courseBandSpan * 0.28, 68, 190);
    const bottomPressureBand = clamp(courseBandSpan * 0.34, 84, 240);
    const orbitCenterX = flightCenterX;
    const orbitCenterY = clamp(
      height * 0.46 + Math.sin(time * 0.093) * height * 0.035,
      courseSkyTop,
      courseSkyBottom,
    );
    const orbitRadius = clamp(
      Number(config.orbitRadius) || 220,
      Math.min(width, height) * 0.12,
      Math.min(width, height) * 0.38,
    );
    const orbitRx = clamp(orbitRadius * 1.08, width * 0.16, Math.min(width * 0.44, effectiveFlockSpread * 0.86));
    const orbitRy = clamp(orbitRadius * 0.52, height * 0.12, Math.max(36, (courseSkyBottom - courseSkyTop) * 0.52));
    const localCirculation = clamp(Number(config.orbitLocality) || 0, 0, 1);
    let centerX = 0;
    let centerY = 0;
    let flockVx = 0;
    let flockVy = 0;
    let neighborChecks = 0;
    let speedSum = 0;
    let verticalLoadSum = 0;
    let bankLoadSum = 0;
    let diveLoadSum = 0;
    let climbLoadSum = 0;
    let diveSpeedSum = 0;
    let climbSpeedSum = 0;
    let diveCount = 0;
    let climbCount = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    let offscreenBirds = 0;
    let verticalBandViolations = 0;

    ensureGrid(config);
    rebuildGrid();
    state.speedBuckets.fill(0);

    for (let i = 0; i < count; i += 1) {
      centerX += state.x[i];
      centerY += state.y[i];
      flockVx += state.vx[i];
      flockVy += state.vy[i];
    }
    centerX /= Math.max(1, count);
    centerY /= Math.max(1, count);
    flockVx /= Math.max(1, count);
    flockVy /= Math.max(1, count);

    const guideAngle = time * 0.18;
    const guideX = orbitCenterX
      + Math.cos(guideAngle) * orbitRx * 0.28
      + Math.sin(time * 0.051) * orbitRx * 0.05;
    const guideY = orbitCenterY
      + Math.sin(guideAngle * 0.86 + 0.7) * orbitRy * 0.32
      + Math.sin(time * 0.037 + 1.8) * orbitRy * 0.12;
    const guideDx = guideX - centerX;
    const guideDy = guideY - centerY;
    const guideDistance = Math.max(0.0001, Math.hypot(guideDx, guideDy));
    const guidePull = smoothStep(guideDistance / Math.max(1, orbitRadius * 0.9));
    const centerTangentX = -Math.sin(guideAngle) * 0.42;
    const centerTangentY = Math.cos(guideAngle) * 0.52;
    const centerCourseX = centerTangentX + (guideDx / guideDistance) * guidePull * 0.7;
    const centerCourseY = centerTangentY + (guideDy / guideDistance) * guidePull * 0.86;

    for (let i = 0; i < count; i += 1) {
      const xi = state.x[i];
      const yi = state.y[i];
      const vxi = state.vx[i];
      const vyi = state.vy[i];
      const phase = state.phase[i];
      const cellCol = clamp(Math.floor((xi - state.gridMinX) / state.gridCellSize), 0, state.gridCols - 1);
      const cellRow = clamp(Math.floor(yi / state.gridCellSize), 0, state.gridRows - 1);
      let avgX = 0;
      let avgY = 0;
      let avgVx = 0;
      let avgVy = 0;
      let sepX = 0;
      let sepY = 0;
      let neighbors = 0;
      let crowdPressure = 0;
      const currentSpeed = Math.max(0.0001, Math.hypot(vxi, vyi));
      const depth = clamp(state.depth[i], -1, 1);
      const topBias = yi < courseSkyTop + topPressureBand
        ? smoothStep((courseSkyTop + topPressureBand - yi) / Math.max(1, topPressureBand)) * 0.48
        : 0;
      const lowBias = yi > courseSkyBottom - bottomPressureBand
        ? -smoothStep((yi - (courseSkyBottom - bottomPressureBand)) / Math.max(1, bottomPressureBand)) * 0.64
        : 0;
      const previousLoad = state.verticalLoad[i];
      const previewVerticalTarget = resolveVerticalTarget((vyi / Math.max(1, cruiseSpeed)) + topBias + lowBias);
      const previewLoad = previousLoad
        + (previewVerticalTarget - previousLoad) * Math.min(1, dt * (1.3 + speedResponse));
      const speedPressure = smoothStep((currentSpeed - cruiseSpeed) / Math.max(1, maxSpeed - cruiseSpeed));
      const carryEnergy = smoothStep(Math.max(0, previousLoad))
        * smoothStep(Math.max(0, -previewLoad))
        * speedPressure
        * diveAcceleration
        * 0.26;
      const energyTargetSpeed = resolveEnergyTargetSpeed(
        cruiseSpeed,
        minSpeed,
        maxSpeed,
        depth,
        previewLoad,
        diveAcceleration,
        climbSlowdown,
        carryEnergy,
      );

      for (let gy = Math.max(0, cellRow - 1); gy <= Math.min(state.gridRows - 1, cellRow + 1); gy += 1) {
        for (let gx = Math.max(0, cellCol - 1); gx <= Math.min(state.gridCols - 1, cellCol + 1); gx += 1) {
          let j = state.gridHead[gy * state.gridCols + gx];
          while (j !== -1) {
            if (j !== i) {
              const dx = state.x[j] - xi;
              const dy = state.y[j] - yi;
              const d2 = dx * dx + dy * dy;
              neighborChecks += 1;
              if (d2 > 0.0001 && d2 < neighborR2) {
                const d = Math.sqrt(d2);
                neighbors += 1;
                avgX += state.x[j];
                avgY += state.y[j];
                avgVx += state.vx[j];
                avgVy += state.vy[j];
                if (d2 < separationR2) {
                  const t = 1 - d / separationRadius;
                  const w = t * t;
                  sepX -= (dx / d) * w;
                  sepY -= (dy / d) * w;
                }
              }
            }
            j = state.gridNext[j];
          }
        }
      }

      let ax = 0;
      let ay = 0;

      if (neighbors > 0) {
        crowdPressure = neighbors > 8 ? smoothStep((neighbors - 8) / 12) : 0;
        const inv = 1 / neighbors;
        avgX *= inv;
        avgY *= inv;
        avgVx *= inv;
        avgVy *= inv;

        let mag = Math.hypot(avgVx, avgVy);
        if (mag > 0.0001) {
          const desiredX = (avgVx / mag) * energyTargetSpeed;
          const desiredY = (avgVy / mag) * energyTargetSpeed;
          ax += (desiredX - vxi) * config.alignment;
          ay += (desiredY - vyi) * config.alignment;
        }

        mag = Math.hypot(avgX - xi, avgY - yi);
        if (mag > 0.0001) {
          const desiredX = ((avgX - xi) / mag) * energyTargetSpeed * 0.82;
          const desiredY = ((avgY - yi) / mag) * energyTargetSpeed * 0.82;
          const cohesionWeight = config.cohesion * (1 - crowdPressure * 0.72);
          ax += (desiredX - vxi) * cohesionWeight;
          ay += (desiredY - vyi) * cohesionWeight;
        }
      }

      let mag = Math.hypot(sepX, sepY);
      if (mag > 0.0001) {
        const desiredX = (sepX / mag) * maxSpeed;
        const desiredY = (sepY / mag) * maxSpeed;
        const separationWeight = config.separation * (1 + crowdPressure * 0.48);
        ax += (desiredX - vxi) * separationWeight;
        ay += (desiredY - vyi) * separationWeight;
      }

      let orbitNormX = (xi - orbitCenterX) / orbitRx;
      let orbitNormY = (yi - orbitCenterY) / orbitRy;
      let ellipseDistance = Math.hypot(orbitNormX, orbitNormY);
      if (ellipseDistance < 0.0001) {
        const seededAngle = phase + time * 0.31;
        orbitNormX = Math.cos(seededAngle);
        orbitNormY = Math.sin(seededAngle);
        ellipseDistance = 1;
      }
      const orbitNx = orbitNormX / ellipseDistance;
      const orbitNy = orbitNormY / ellipseDistance;
      let tangentX = -orbitNy * orbitRx;
      let tangentY = orbitNx * orbitRy;
      let tangentMag = Math.hypot(tangentX, tangentY);
      if (tangentMag > 0.0001) {
        tangentX /= tangentMag;
        tangentY /= tangentMag;
      }
      let radialX = orbitNx * orbitRx;
      let radialY = orbitNy * orbitRy;
      let radialMag = Math.hypot(radialX, radialY);
      if (radialMag > 0.0001) {
        radialX /= radialMag;
        radialY /= radialMag;
      }
      const radialCorrection = ellipseDistance > 1.24
        ? -smoothStep((ellipseDistance - 1.24) / 0.62) * 0.68
        : ellipseDistance < 0.26
          ? smoothStep((0.26 - ellipseDistance) / 0.26) * 0.38
          : ellipseDistance > 1
            ? -(ellipseDistance - 1) * 0.12
            : 0;
      const wobble = Math.sin(time * 0.13 + phase * 0.17) * 0.18
        + Math.sin(time * 0.041 + phase * 0.37 + 1.2) * 0.11;
      const localCourseX = tangentX + radialX * radialCorrection + orbitNy * wobble;
      const localCourseY = tangentY + radialY * radialCorrection - orbitNx * wobble;
      const localCourseBlend = localCirculation * smoothStep((ellipseDistance - 0.55) / 0.72);
      let courseVx = (centerCourseX * (1 - localCourseBlend) + localCourseX * localCourseBlend) * energyTargetSpeed;
      let courseVy = (centerCourseY * (1 - localCourseBlend) + localCourseY * localCourseBlend) * energyTargetSpeed;
      const verticalBias = yi < courseSkyTop + topPressureBand
        ? smoothStep((courseSkyTop + topPressureBand - yi) / Math.max(1, topPressureBand)) * energyTargetSpeed * 1.05
        : yi > courseSkyBottom - bottomPressureBand
          ? -smoothStep((yi - (courseSkyBottom - bottomPressureBand)) / Math.max(1, bottomPressureBand)) * energyTargetSpeed * 1.38
          : 0;
      courseVy += verticalBias;
      const courseMag = Math.hypot(courseVx, courseVy);
      const edgeCorrection = ellipseDistance > 1.08 ? smoothStep((ellipseDistance - 1.08) / 0.52) : 0;
      const courseWeight = config.courseStrength * (0.72 + edgeCorrection * 0.45 + (neighbors === 0 ? 0.24 : 0));

      if (courseMag > 0.0001) {
        const desiredX = (courseVx / courseMag) * energyTargetSpeed;
        const desiredY = (courseVy / courseMag) * energyTargetSpeed;
        ax += (desiredX - vxi) * courseWeight;
        ay += (desiredY - vyi) * courseWeight;
      }

      mag = Math.hypot(centerX - xi, centerY - yi);
      if (mag > effectiveFlockSpread * 0.36) {
        const t = smoothStep((mag - effectiveFlockSpread * 0.36) / Math.max(1, effectiveFlockSpread * 0.64));
        const desiredX = ((centerX - xi) / mag) * energyTargetSpeed * 0.5;
        const desiredY = ((centerY - yi) / mag) * energyTargetSpeed * 0.5;
        ax += (desiredX - vxi) * config.centerPull * t;
        ay += (desiredY - vyi) * config.centerPull * t;
      }

      const strayStart = effectiveFlockSpread * (neighbors > 0 ? 0.54 : 0.32);
      if (mag > strayStart || neighbors === 0) {
        const t = neighbors === 0
          ? 1
          : smoothStep((mag - strayStart) / Math.max(1, effectiveFlockSpread * 0.58));
        const flockSpeed = Math.hypot(flockVx, flockVy);
        const orbitFollowX = courseMag > 0.0001 ? (courseVx / courseMag) * energyTargetSpeed : energyTargetSpeed;
        const orbitFollowY = courseMag > 0.0001 ? (courseVy / courseMag) * energyTargetSpeed : 0;
        const flockFollowX = flockSpeed > 0.0001 ? (flockVx / flockSpeed) * energyTargetSpeed : orbitFollowX;
        const flockFollowY = flockSpeed > 0.0001 ? (flockVy / flockSpeed) * energyTargetSpeed : orbitFollowY;
        const followX = orbitFollowX * 0.72 + flockFollowX * 0.28;
        const followY = orbitFollowY * 0.72 + flockFollowY * 0.28;
        const gatherX = mag > 0.0001 ? ((centerX - xi) / mag) * energyTargetSpeed * 0.78 : 0;
        const gatherY = mag > 0.0001 ? ((centerY - yi) / mag) * energyTargetSpeed * 0.78 : 0;
        const desiredX = gatherX + followX * 0.46;
        const desiredY = gatherY + followY * 0.46;
        const recovery = config.strayRecovery * t * (neighbors === 0 ? 1.28 : 1);
        ax += (desiredX - vxi) * recovery;
        ay += (desiredY - vyi) * recovery;
      }

      const wanderAngle = phase
        + Math.sin(time * config.wanderFrequency + phase) * 1.4
        + Math.sin(time * config.wanderFrequency * 0.37 + phase * 1.7) * 0.65;
      ax += Math.cos(wanderAngle) * config.wander * 58;
      ay += Math.sin(wanderAngle) * config.wander * 40;

      const flow = Math.sin((xi + time * 42) * config.flowScale + phase * 0.2)
        + Math.cos((yi - time * 35) * config.flowScale * 1.37 + phase * 0.31);
      const flowAngle = flow * 1.2 + time * config.flowSpeed + phase * 0.04;
      ax += Math.cos(flowAngle) * config.flowWeight * 82;
      ay += Math.sin(flowAngle) * config.flowWeight * 52;

      const gust = Math.sin(time * 0.21 + phase * 2.3) * Math.cos(time * 0.09 + yi * 0.003);
      ax += gust * config.gust * 44;
      ay += Math.sin(time * 0.13 + phase) * config.gust * 18;

      const safeSky = smoothStep((yi - courseSkyTop) / topPressureBand)
        * smoothStep((courseSkyBottom - yi) / bottomPressureBand);
      const liftSpeed = smoothStep((currentSpeed - minSpeed) / Math.max(1, maxSpeed - minSpeed));
      const climbLoadPreview = smoothStep(Math.max(0, -previewLoad));
      const slowFlight = 1 - liftSpeed;
      ay += safeSky * energyWeight * (8 + climbLoadPreview * 18 + slowFlight * 14);

      const forwardX = vxi / currentSpeed;
      const forwardY = vyi / currentSpeed;
      const lateralX = -forwardY;
      const lateralY = forwardX;
      const forwardAccel = ax * forwardX + ay * forwardY;
      const rawLateralAccel = ax * lateralX + ay * lateralY;
      let lateralAccel = rawLateralAccel;
      const ascentLoad = smoothStep(Math.max(0, -previousLoad));
      const lateralDamping = clamp(
        1 - energyWeight * (0.26 + inertiaControl * 0.62 + ascentLoad * 0.24 + speedPressure * 0.26),
        0.22,
        0.96,
      );
      const signedBankTarget = clamp(rawLateralAccel / Math.max(1, forceLimit), -1, 1);
      state.signedBankLoad[i] += (signedBankTarget - state.signedBankLoad[i]) * Math.min(1, dt * 2.7);
      lateralAccel *= lateralDamping;
      const bankTarget = Math.abs(state.signedBankLoad[i]);
      state.bankLoad[i] += (bankTarget - state.bankLoad[i]) * Math.min(1, dt * 2.6);
      ax = forwardX * forwardAccel + lateralX * lateralAccel;
      ay = forwardY * forwardAccel + lateralY * lateralAccel;

      const lift = safeSky
        * liftSpeed
        * (liftRecovery * 260 + state.bankLoad[i] * bankLift * 320);
      const bankArc = safeSky * liftSpeed * state.signedBankLoad[i] * bankLift * 92;
      ax += lateralX * bankArc;
      ay += lateralY * bankArc * 0.22;
      ay -= lift;

      addSoftBoundaryForces(config, i, ax, ay, time);
      ax = forceScratch.ax;
      ay = forceScratch.ay;
      addMouseForces(config, i, ax, ay, allowPointer);
      ax = forceScratch.ax;
      ay = forceScratch.ay;

      let homePressure = 0;
      const homeDx = xi - flightCenterX;
      const homeExcess = Math.abs(homeDx) - homeHalfWidth;
      if (homeExcess > 0) {
        const side = homeDx < 0 ? 1 : -1;
        const outsideVisible = xi < 0
          ? -xi
          : xi > width
            ? xi - width
            : 0;
        const t = smoothStep(homeExcess / Math.max(1, width * 0.16));
        const offscreenT = smoothStep(outsideVisible / Math.max(1, width * 0.14));
        homePressure = Math.max(t, offscreenT);
        const targetVx = side * Math.max(minSpeed, energyTargetSpeed * (0.62 + offscreenT * 0.18));
        ax += (targetVx - vxi) * (0.52 + t * 1.1 + offscreenT * 1.25) * homePressure;
        ax += (flightCenterX - xi) * (0.1 + offscreenT * 0.22) * homePressure;
        ay += Math.sin(phase + time * 0.72) * (12 + cruiseSpeed * 0.07) * homePressure;
      }

      const centerOffset = centerX - flightCenterX;
      const centerReturnPressure = smoothStep(
        (Math.abs(centerOffset) - width * 0.08) / Math.max(1, width * 0.2),
      );
      if (centerReturnPressure > 0) {
        const side = centerOffset < 0 ? 1 : -1;
        const targetVx = side * Math.max(minSpeed * 0.72, energyTargetSpeed * 0.34);
        ax += (targetVx - vxi) * (0.18 + centerReturnPressure * 0.42) * centerReturnPressure;
        ax += (flightCenterX - xi) * 0.035 * centerReturnPressure;
        homePressure = Math.max(homePressure, centerReturnPressure * 0.72);
      }

      let corridorPressure = 0;
      const corridorLead = clamp(0.92 + currentSpeed / Math.max(1, maxSpeed) * 0.72, 0.92, 1.64);
      const predictedX = xi + vxi * corridorLead;
      if (predictedX < flightLeft + horizontalTurnBand) {
        const t = smoothStep((flightLeft + horizontalTurnBand - predictedX) / horizontalTurnBand);
        corridorPressure = t;
        const targetVx = Math.max(minSpeed, energyTargetSpeed * (0.58 + t * 0.28));
        ax += (targetVx - vxi) * (0.42 + t * 0.88) * t;
        ay += Math.sin(phase + time * 0.9) * (18 + cruiseSpeed * 0.12) * t;
      } else if (predictedX > flightRight - horizontalTurnBand) {
        const t = smoothStep((predictedX - (flightRight - horizontalTurnBand)) / horizontalTurnBand);
        corridorPressure = t;
        const targetVx = -Math.max(minSpeed, energyTargetSpeed * (0.58 + t * 0.28));
        ax += (targetVx - vxi) * (0.42 + t * 0.88) * t;
        ay += Math.sin(phase + time * 0.9 + Math.PI) * (18 + cruiseSpeed * 0.12) * t;
      }

      mag = Math.hypot(ax, ay);
      const localForceLimit = forceLimit * (1 + Math.max(corridorPressure, homePressure) * 2.8);
      if (mag > localForceLimit && mag > 0.0001) {
        const scale = localForceLimit / mag;
        ax *= scale;
        ay *= scale;
      }

      let nextVx = (vxi + ax * dt) * Math.max(0, 1 - config.drag * dt);
      let nextVy = (vyi + ay * dt) * Math.max(0, 1 - config.drag * dt);
      let speed = Math.hypot(nextVx, nextVy);
      if (speed < 0.0001) {
        nextVx = cruiseSpeed;
        nextVy = 0;
        speed = cruiseSpeed;
      }

      const depthTarget = clamp(
        Math.sin(time * 0.17 + phase * 1.23) * 0.72 + ((yi / Math.max(1, groundY)) - 0.5) * 0.18,
        -1,
        1,
      );
      state.depth[i] += (depthTarget - state.depth[i]) * Math.min(1, dt * 0.32);

      const rawVerticalLoad = nextVy / Math.max(1, cruiseSpeed);
      const verticalTarget = resolveVerticalTarget(rawVerticalLoad);
      state.verticalLoad[i] += (verticalTarget - state.verticalLoad[i]) * Math.min(1, dt * (1.7 + speedResponse * 1.25));
      const finalCarryEnergy = smoothStep(Math.max(0, previousLoad))
        * smoothStep(Math.max(0, -state.verticalLoad[i]))
        * smoothStep((speed - cruiseSpeed) / Math.max(1, maxSpeed - cruiseSpeed))
        * diveAcceleration
        * 0.26;
      const desiredSpeed = resolveEnergyTargetSpeed(
        cruiseSpeed,
        minSpeed,
        maxSpeed,
        state.depth[i],
        state.verticalLoad[i],
        diveAcceleration,
        climbSlowdown,
        finalCarryEnergy,
      );
      const responseScale = desiredSpeed > speed ? 1.08 : 1.32;
      const speedCorrection = (desiredSpeed - speed) * speedResponse * responseScale * dt;
      nextVx += (nextVx / speed) * speedCorrection;
      nextVy += (nextVy / speed) * speedCorrection;
      speed = Math.hypot(nextVx, nextVy);

      const diveLoad = smoothStep(Math.max(0, state.verticalLoad[i]));
      const recoveryPressure = Math.max(corridorPressure, homePressure);
      const maneuverAllowance = clamp(
        diveLoad * 0.52 + state.bankLoad[i] * 0.14 + recoveryPressure * 0.34,
        0,
        1,
      );
      const softSpeedCeiling = clamp(
        cruiseSpeed * (0.86 + maneuverAllowance * 0.28),
        minSpeed * 1.12,
        maxSpeed * (0.78 + maneuverAllowance * 0.18),
      );
      if (speed > softSpeedCeiling) {
        const overspeed = speed - softSpeedCeiling;
        const overspeedPressure = smoothStep(overspeed / Math.max(1, maxSpeed - softSpeedCeiling));
        const envelopePull = Math.min(1, dt * (1.8 + speedResponse * 1.6 + overspeedPressure * 2.8));
        const envelopeSpeed = speed - overspeed * envelopePull;
        const scale = envelopeSpeed / Math.max(0.0001, speed);
        nextVx *= scale;
        nextVy *= scale;
        speed = envelopeSpeed;
      }

      if (speed < minSpeed) {
        const scale = minSpeed / Math.max(0.0001, speed);
        nextVx *= scale;
        nextVy *= scale;
      } else if (speed > maxSpeed) {
        const scale = maxSpeed / speed;
        nextVx *= scale;
        nextVy *= scale;
      }

      let nextX = xi + nextVx * dt * motionScale;
      let nextY = yi + nextVy * dt * motionScale;
      const radius = config.birdRadius * (1 + state.depth[i] * config.depthSize);
      const hardMargin = Math.max(radius * 4, width * 0.08);
      if (nextX < flightLeft - hardMargin) {
        nextX = flightLeft - hardMargin;
        nextVx = Math.abs(nextVx) * 0.36 + minSpeed * 0.28;
      } else if (nextX > flightRight + hardMargin) {
        nextX = flightRight + hardMargin;
        nextVx = -Math.abs(nextVx) * 0.36 - minSpeed * 0.28;
      }
      if (nextY < courseSkyTop) {
        nextY = courseSkyTop + radius * 0.6;
        nextVy = Math.abs(nextVy) * 0.08 + minSpeed * 0.22;
      } else if (nextY > courseSkyBottom) {
        nextY = courseSkyBottom - radius * 0.8;
        nextVy = -Math.abs(nextVy) * 0.1 - minSpeed * 0.24;
      }

      if (nextX < minX) minX = nextX;
      if (nextX > maxX) maxX = nextX;
      if (nextY < minY) minY = nextY;
      if (nextY > maxY) maxY = nextY;
      if (nextY < courseSkyTop || nextY > courseSkyBottom) verticalBandViolations += 1;
      if (nextX < 0 || nextX > width) offscreenBirds += 1;

      const finalSpeed = Math.hypot(nextVx, nextVy);
      const bucketIndex = Math.min(
        SPEED_BUCKET_COUNT - 1,
        Math.max(0, Math.floor((finalSpeed / Math.max(1, maxSpeed)) * SPEED_BUCKET_COUNT)),
      );
      const load = state.verticalLoad[i];

      state.speedBuckets[bucketIndex] += 1;
      speedSum += finalSpeed;
      verticalLoadSum += state.verticalLoad[i];
      bankLoadSum += state.bankLoad[i];
      if (load > 0.04) {
        diveLoadSum += load;
        diveSpeedSum += finalSpeed;
        diveCount += 1;
      } else if (load < -0.04) {
        climbLoadSum += -load;
        climbSpeedSum += finalSpeed;
        climbCount += 1;
      }
      state.vx[i] = nextVx;
      state.vy[i] = nextVy;
      state.x[i] = nextX;
      state.y[i] = nextY;
    }

    let cumulativeSpeedCount = 0;
    let p90Speed = 0;
    const p90Threshold = count * 0.9;
    for (let bucket = 0; bucket < SPEED_BUCKET_COUNT; bucket += 1) {
      cumulativeSpeedCount += state.speedBuckets[bucket];
      if (cumulativeSpeedCount >= p90Threshold) {
        p90Speed = ((bucket + 0.5) / SPEED_BUCKET_COUNT) * maxSpeed;
        break;
      }
    }

    const avgDiveSpeed = diveCount > 0 ? diveSpeedSum / diveCount : 0;
    const avgClimbSpeed = climbCount > 0 ? climbSpeedSum / climbCount : 0;

    metrics.neighborChecks = neighborChecks;
    metrics.avgSpeed = count > 0 ? speedSum / count : 0;
    metrics.avgVerticalLoad = count > 0 ? verticalLoadSum / count : 0;
    metrics.avgBankLoad = count > 0 ? bankLoadSum / count : 0;
    metrics.avgDiveLoad = diveCount > 0 ? diveLoadSum / diveCount : 0;
    metrics.avgClimbLoad = climbCount > 0 ? climbLoadSum / climbCount : 0;
    metrics.avgDiveSpeed = avgDiveSpeed;
    metrics.avgClimbSpeed = avgClimbSpeed;
    metrics.p90Speed = p90Speed;
    metrics.diveClimbSpeedDelta = avgDiveSpeed && avgClimbSpeed ? avgDiveSpeed - avgClimbSpeed : 0;
    metrics.flockCenterX = centerX;
    metrics.flockCenterY = centerY;
    metrics.flockSpreadX = Number.isFinite(minX) && Number.isFinite(maxX) ? maxX - minX : 0;
    metrics.flockMinY = Number.isFinite(minY) ? minY : 0;
    metrics.flockMaxY = Number.isFinite(maxY) ? maxY : 0;
    metrics.flightBandTop = courseSkyTop;
    metrics.flightBandBottom = courseSkyBottom;
    metrics.verticalBandViolations = verticalBandViolations;
    metrics.offscreenBirds = offscreenBirds;
  }

  function frameWarmFlockForFirstDraw(config) {
    const count = state.count;
    if (count <= 0) return;

    const width = metrics.cssWidth;
    const height = metrics.cssHeight;
    const groundY = height * config.groundLine;
    const targetCenterX = width * 0.5;
    const targetCenterY = resolveInitialFlockCenterY(config, height, groundY);
    const maxSpanX = Math.min(config.flockSpread * 0.92, width * 0.5);
    const maxSpanY = Math.min(config.flockSpread * 0.36, height * 0.28);
    let centerX = 0;
    let centerY = 0;
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    for (let i = 0; i < count; i += 1) {
      const x = state.x[i];
      const y = state.y[i];
      centerX += x;
      centerY += y;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }

    centerX /= count;
    centerY /= count;
    const spanX = Math.max(1, maxX - minX);
    const spanY = Math.max(1, maxY - minY);
    const scaleX = spanX > maxSpanX ? maxSpanX / spanX : 1;
    const scaleY = spanY > maxSpanY ? maxSpanY / spanY : 1;
    const minSafeY = config.topMargin + config.birdRadius * 1.5;
    const maxSafeY = groundY - config.birdRadius * 2.2;

    for (let i = 0; i < count; i += 1) {
      state.x[i] = clamp(targetCenterX + (state.x[i] - centerX) * scaleX, 16, width - 16);
      state.y[i] = clamp(targetCenterY + (state.y[i] - centerY) * scaleY, minSafeY, maxSafeY);
    }
  }

  function runStartupWarmup(config, now) {
    if (state.warmed || config.enabled === false) {
      state.warmed = true;
      return;
    }

    const frames = Math.round(clamp(Number(config.startupWarmupFrames) || 0, 0, 240));
    metrics.warmupFrames = frames;
    if (frames <= 0) {
      state.warmed = true;
      return;
    }

    const warmupDt = 1 / 60;
    let warmupNow = now - frames * (1000 / 60);
    for (let frame = 0; frame < frames; frame += 1) {
      updateBirds(config, warmupDt, warmupNow, false);
      warmupNow += 1000 / 60;
    }
    frameWarmFlockForFirstDraw(config);
    state.warmed = true;
  }

  function drawBirds(config, theme) {
    const colors = createBirdColorCache(theme, config);
    const baseRadius = config.birdRadius;
    const depthSize = config.depthSize;
    const depthOpacity = config.depthOpacity;

    for (let i = 0; i < state.count; i += 1) {
      const depth = clamp(state.depth[i], -1, 1);
      const radius = Math.max(1, baseRadius * (1 + depth * depthSize));
      const color = colors[state.colorIndex[i] % colors.length];
      const alpha = clamp(color.alpha * (1 + depth * depthOpacity), 0.08, 1);

      ctx.beginPath();
      ctx.arc(state.x[i], state.y[i], radius, 0, TAU);
      ctx.fillStyle = rgbString(color.rgb, alpha);
      ctx.fill();
    }
  }

  function drawFrame(now = performance.now(), force = false) {
    rafId = 0;
    if (destroyed) return;

    const config = getConfig();
    const theme = getTheme() || DEFAULT_THEME;
    if (!force && shouldPauseForVisibility(config)) return;

    const frameStart = performance.now();
    const dt = lastTime > 0 ? clamp((now - lastTime) / 1000, 1 / 120, 1 / 30) : 1 / 60;
    lastTime = now;

    syncMetrics(config);
    initializeBirds(config, theme);
    metrics.birdCount = state.count;
    metrics.targetFps = resolveTargetFps(config, reducedMotion);
    const needsWarmup = config.enabled !== false && !state.warmed;
    if (needsWarmup) {
      runStartupWarmup(config, now);
      lastTime = performance.now();
    }

    drawBackground(ctx, metrics, theme, config);
    if (config.enabled !== false) {
      updateBirds(config, needsWarmup ? 1 / 60 : dt, now, true);
    }
    drawBirds(config, theme);
    metrics.lastFrameMs = performance.now() - frameStart;

    if (!destroyed && config.enabled !== false && !shouldPauseForVisibility(config)) {
      const targetFps = resolveTargetFps(config, reducedMotion);
      const frameInterval = 1000 / targetFps;
      const timeoutDelay = Math.max(0, frameInterval - (1000 / 60));
      timeoutId = window.setTimeout(() => {
        timeoutId = 0;
        rafId = window.requestAnimationFrame(drawFrame);
      }, timeoutDelay);
    }
  }

  function handlePointerMove(event) {
    const rect = canvas.getBoundingClientRect();
    const now = performance.now();
    const nextX = event.clientX - rect.left;
    const nextY = event.clientY - rect.top;
    const dt = Math.max(1 / 120, (now - pointer.lastAt) / 1000 || 1 / 60);

    pointer.px = pointer.x;
    pointer.py = pointer.y;
    pointer.x = nextX;
    pointer.y = nextY;
    pointer.vx = clamp((nextX - pointer.px) / dt, -1200, 1200);
    pointer.vy = clamp((nextY - pointer.py) / dt, -1200, 1200);
    pointer.active = true;
    pointer.lastAt = now;
  }

  function handlePointerEnter(event) {
    const rect = canvas.getBoundingClientRect();
    pointer.x = event.clientX - rect.left;
    pointer.y = event.clientY - rect.top;
    pointer.px = pointer.x;
    pointer.py = pointer.y;
    pointer.vx = 0;
    pointer.vy = 0;
    pointer.active = true;
    pointer.lastAt = performance.now();
  }

  function handlePointerLeave() {
    pointer.active = false;
    pointer.vx = 0;
    pointer.vy = 0;
  }

  function handleVisibilityChange() {
    if (!document.hidden) {
      lastTime = 0;
      drawFrame(performance.now(), true);
    }
  }

  canvas.addEventListener('pointermove', handlePointerMove, { passive: true });
  canvas.addEventListener('pointerenter', handlePointerEnter, { passive: true });
  canvas.addEventListener('pointerleave', handlePointerLeave, { passive: true });
  document.addEventListener('visibilitychange', handleVisibilityChange);

  return {
    start() {
      if (destroyed) return;
      cancelScheduledFrame();
      lastTime = 0;
      drawFrame(performance.now(), true);
    },
    renderOnce() {
      drawFrame(performance.now(), true);
    },
    getMetrics() {
      return { ...metrics };
    },
    destroy() {
      destroyed = true;
      cancelScheduledFrame();
      canvas.removeEventListener('pointermove', handlePointerMove);
      canvas.removeEventListener('pointerenter', handlePointerEnter);
      canvas.removeEventListener('pointerleave', handlePointerLeave);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    },
  };
}
