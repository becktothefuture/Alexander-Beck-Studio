import {
  createIndexedSimulationVisualTransition,
  registerSimulationVisualTransition,
} from '../../lib/simulationVisualTransition.js';
import {
  isMobileSimulationViewport,
  resolveMobileSimulationBodyScale,
  resolveMobileSimulationMultiplier,
} from '../../lib/mobileSimulationSizing.js';
import {
  triggerImpact,
  triggerPressure,
} from '../../legacy/modules/audio/simulation-audio-adapter.js';
import { notifySimulationAtmosphereSourceFrame } from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere.js';
import {
  DEFAULT_SIMULATION_COLOR_DISTRIBUTION,
  FALLBACK_SIMULATION_PALETTE_COLORS,
  resolveSimulationMaterialColorIndex,
  resolveSimulationPaletteColors,
} from '../../palette/simulationPaletteContract.js';
import { selectSimulationMaterialRole } from '../../palette/simulationPaletteController.js';

const TAU = Math.PI * 2;
const REFERENCE_AREA = 1440 * 900;
const DEFAULT_THEME = {
  light: '#efefef',
  dark: '#202020',
  active: '#202020',
  palette: FALLBACK_SIMULATION_PALETTE_COLORS,
  colorDistribution: DEFAULT_SIMULATION_COLOR_DISTRIBUTION,
};

const BODY_KIND_STEM = 0;
const BODY_KIND_LEAFLET = 1;
const MOBILE_GROWTH_BIRTH_EXPONENT = 1.45;

const SOURCE_BOTTOM = 0;
const SOURCE_LEFT = 1;
const SOURCE_RIGHT = 2;

const ELIXIR_POINTER_MAX_AGE_MS = 700;
const ELIXIR_GROWTH_STRENGTH = 5.6;
const ELIXIR_MAX_DURATION_SHARE = 0.34;
const ELIXIR_MIN_PARENT_GROWTH = 0.12;
const ELIXIR_CONTACT_GROWTH = 0.18;
const ELIXIR_ACTIVATION_SCALE = 1.42;
const ELIXIR_IMPACT_INTERVAL_MS = 180;
const ELIXIR_IMPACT_DURATION_SHARE = 0.052;
const ELIXIR_FALLOFF_FLOOR = 0.38;
const ELIXIR_JOLT_DECAY = 8.5;
const GROWTH_SOUND_THRESHOLD = 0.18;
const GROWTH_SOUND_MIN_INTERVAL_MS = 310;
const GROWTH_SOUND_COMPANION_INTERVAL_MS = 620;

const PRESET_PROFILES = {
  thicket: {
    fan: 1.02,
    fork: 1.08,
    branchAngle: 0.68,
    curl: 0.82,
    primaryMin: 3,
    primaryMax: 4,
    energy: 1.02,
    leaflet: 1,
    wall: 1,
  },
  fern: {
    fan: 0.72,
    fork: 0.86,
    branchAngle: 0.48,
    curl: 0.42,
    primaryMin: 2,
    primaryMax: 3,
    energy: 0.9,
    leaflet: 1.24,
    wall: 0.82,
  },
  bramble: {
    fan: 1.18,
    fork: 1.24,
    branchAngle: 0.78,
    curl: 0.95,
    primaryMin: 3,
    primaryMax: 4,
    energy: 1.1,
    leaflet: 0.92,
    wall: 1.06,
  },
  creeper: {
    fan: 0.88,
    fork: 0.82,
    branchAngle: 0.44,
    curl: 1.08,
    primaryMin: 2,
    primaryMax: 4,
    energy: 1.16,
    leaflet: 0.78,
    wall: 1.26,
  },
};

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function numberOr(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
}

function smoothstep(edge0, edge1, value) {
  if (edge0 === edge1) return value >= edge1 ? 1 : 0;
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function angleMix(from, to, amount) {
  return from + Math.atan2(Math.sin(to - from), Math.cos(to - from)) * clamp(amount, 0, 1);
}

function angleDistance(a, b) {
  return Math.atan2(Math.sin(a - b), Math.cos(a - b));
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

function hash01(seed) {
  let x = (seed | 0) >>> 0;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  return (x >>> 0) / 4294967295;
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

function resolvePalette(theme) {
  const source = Array.isArray(theme?.palette) ? theme.palette : DEFAULT_THEME.palette;
  return resolveSimulationPaletteColors(source.filter(isHexColor));
}

function pickWeightedMaterialRoleIndex(random, theme) {
  return selectSimulationMaterialRole(random(), theme?.paletteSnapshot || theme)?.distributionIndex || 0;
}

function pickStemMaterialRoleIndex(random, theme) {
  return pickWeightedMaterialRoleIndex(random, theme, 0.24);
}

function pickLeafletMaterialRoleIndex(random, theme, config) {
  const spread = clamp(Number(config.colorSpread ?? 1), 0, 1);
  const lightNeutralScale = 0.18 + (1 - spread) * 0.18;
  return pickWeightedMaterialRoleIndex(random, theme, lightNeutralScale);
}

function getThemeKey(theme) {
  return [
    theme?.active,
    theme?.light,
    theme?.dark,
  ].join(':');
}

function getPresetProfile(config) {
  return PRESET_PROFILES[config.preset] || PRESET_PROFILES.thicket;
}

function resolveDpr(config) {
  const deviceDpr = typeof window === 'undefined' ? 1 : window.devicePixelRatio || 1;
  const mobileCap = isMobileRuntime() ? 1.15 : 2;
  return clamp(Math.min(deviceDpr, numberOr(config.maxDpr, 1.5), mobileCap), 0.75, 2);
}

function isMobileRuntime() {
  if (typeof window === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(window.navigator?.userAgent || '')
    || window.matchMedia?.('(hover: none) and (pointer: coarse)').matches === true;
}

function markAuditFrame(canvas) {
  if (!canvas || globalThis.__ABS_ROUTE_PERF_AUDIT__ !== true) return;
  canvas.__absAuditFrameCount = (Number(canvas.__absAuditFrameCount) || 0) + 1;
}

function resolveTargetFps(config, reducedMotion) {
  const target = Math.round(clamp(numberOr(config.targetFps, 60), 24, 60));
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
    cssWidth: Math.max(1, rect.width),
    cssHeight: Math.max(1, rect.height),
    width,
    height,
    dpr,
  };
}

function readSeedFromUrl() {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('seed');
  if (raw === null || raw === '') return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isFinite(parsed) ? parsed >>> 0 : null;
}

function createRandomSeed() {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const values = new Uint32Array(1);
    window.crypto.getRandomValues(values);
    return values[0] >>> 0;
  }
  return Math.floor((Date.now() + Math.random() * 4294967295)) >>> 0;
}

function resolveBodyCount(config, metrics, reducedMotion) {
  const baseCount = clamp(Math.round(numberOr(config.bodyCount, 820)), 180, 1200);
  const areaScale = clamp(Math.sqrt((metrics.cssWidth * metrics.cssHeight) / REFERENCE_AREA), 0.68, 1.14);
  const widthScale = metrics.cssWidth < 560 ? 0.58 : metrics.cssWidth < 900 ? 0.76 : 1;
  const motionScale = reducedMotion ? 0.58 : 1;
  const dprScale = clamp(1.5 / Math.max(metrics.dpr, 0.75), 0.82, 1.08);
  return Math.max(120, Math.round(baseCount * areaScale * widthScale * motionScale * dprScale));
}

function resolveSeedCount(config, metrics, countLimit, reducedMotion) {
  const requested = clamp(Math.round(numberOr(config.seedCount, 4)), 1, 4);
  const isMobile = isMobileSimulationViewport(metrics);
  const viewportMax = isMobile
    ? clamp(Math.round(numberOr(config.mobileSeedCap, 3)), 1, 4)
    : metrics.cssWidth < 980 ? 3 : 4;
  const motionMax = reducedMotion ? Math.min(3, viewportMax) : viewportMax;
  const bodiesPerSeed = isMobile ? 110 : 130;
  const countMax = Math.max(1, Math.min(4, Math.floor(countLimit / bodiesPerSeed)));
  return Math.max(1, Math.min(requested, motionMax, countMax));
}

function resolveRadius(
  random,
  config,
  reducedMotion,
  mobileBodyScale,
  mobileBodyCompensation,
  kind = BODY_KIND_STEM,
  isRoot = false,
) {
  const scale = clamp(numberOr(config.bodyScale, 1), 0.8, 1.8);
  const base = 7.5 + (random() - 0.5) * 0.62;
  const kindScale = kind === BODY_KIND_LEAFLET ? 0.72 + random() * 0.1 : 1;
  const rootScale = isRoot ? 1.08 : 1;
  return base
    * scale
    * mobileBodyScale
    * mobileBodyCompensation
    * kindScale
    * rootScale
    * (reducedMotion ? 0.96 : 1);
}

function getFormationKey(config, theme, metrics, seed, reducedMotion) {
  const mobileBodyScale = resolveMobileSimulationBodyScale(
    theme?.mobileSimulationBodyScale,
    metrics,
  );
  const mobileBodyCompensation = resolveMobileSimulationMultiplier(
    config.mobileBodyScaleCompensation,
    metrics,
    { fallback: 1, min: 1, max: 1.25 },
  );
  return [
    seed,
    Math.round(metrics.cssWidth),
    Math.round(metrics.cssHeight),
    reducedMotion ? 1 : 0,
    config.preset,
    config.seedPlacement,
    Math.round(numberOr(config.bodyCount, 0)),
    numberOr(config.bodyScale, 1).toFixed(3),
    mobileBodyCompensation.toFixed(3),
    Math.round(numberOr(config.seedCount, 0)),
    Math.round(numberOr(config.mobileSeedCap, 0)),
    numberOr(config.forkRate, 0).toFixed(3),
    numberOr(config.wallFollow, 0).toFixed(3),
    numberOr(config.openSpaceBias, 0).toFixed(3),
    numberOr(config.curlStrength, 0).toFixed(3),
    numberOr(config.branchClearance, 0).toFixed(3),
    numberOr(config.leafletDensity, 0).toFixed(3),
    numberOr(config.packingGap, 0).toFixed(3),
    numberOr(config.mobilePackingGap, 0).toFixed(3),
    numberOr(config.colorSpread, 0).toFixed(3),
    mobileBodyScale.toFixed(2),
    getThemeKey(theme),
  ].join(':');
}

function drawEnvelopeRadius(radius) {
  return radius * 1.08 + Math.max(0.7, radius * 0.065);
}

function computeMinGap(state) {
  let minGap = Infinity;
  for (let i = 0; i < state.count; i += 1) {
    for (let j = i + 1; j < state.count; j += 1) {
      const dx = state.x[i] - state.x[j];
      const dy = state.y[i] - state.y[j];
      const gap = Math.hypot(dx, dy) - drawEnvelopeRadius(state.radius[i]) - drawEnvelopeRadius(state.radius[j]);
      if (gap < minGap) minGap = gap;
    }
  }
  return Number.isFinite(minGap) ? minGap : 0;
}

function seedSlot(index, total, placement, seed) {
  if (placement === 'ground') return { source: SOURCE_BOTTOM, ordinal: index, total };
  if (placement === 'sidewalls') {
    return {
      source: index % 2 === 0 ? SOURCE_LEFT : SOURCE_RIGHT,
      ordinal: Math.floor(index / 2),
      total: Math.ceil(total / 2),
    };
  }

  if (total <= 1) return { source: SOURCE_BOTTOM, ordinal: 0, total: 1 };
  if (total === 2) {
    return index === 0
      ? { source: SOURCE_BOTTOM, ordinal: 0, total: 1 }
      : { source: hash01(seed + 97) < 0.5 ? SOURCE_LEFT : SOURCE_RIGHT, ordinal: 0, total: 1 };
  }
  if (total === 3) {
    return index === 0
      ? { source: SOURCE_BOTTOM, ordinal: 0, total: 1 }
      : { source: index === 1 ? SOURCE_LEFT : SOURCE_RIGHT, ordinal: 0, total: 1 };
  }

  if (index < 2) return { source: SOURCE_BOTTOM, ordinal: index, total: 2 };
  return { source: index === 2 ? SOURCE_LEFT : SOURCE_RIGHT, ordinal: 0, total: 1 };
}

function rootPlacement(index, total, random, metrics, config, seed) {
  const placement = ['mixed', 'ground', 'sidewalls'].includes(config.seedPlacement)
    ? config.seedPlacement
    : 'mixed';
  const slot = seedSlot(index, total, placement, seed);
  const width = metrics.cssWidth;
  const height = metrics.cssHeight;
  const sideJitter = (random() - 0.5) * height * 0.09;
  const bottomJitter = (random() - 0.5) * width * 0.055;

  if (slot.source === SOURCE_LEFT) {
    const yBase = slot.total <= 1 ? 0.44 + random() * 0.28 : 0.30 + slot.ordinal * 0.24;
    return {
      source: SOURCE_LEFT,
      x: width * (0.035 + random() * 0.018),
      y: height * clamp(yBase, 0.22, 0.82) + sideJitter,
      angle: -0.34 + (random() - 0.5) * 0.42,
    };
  }

  if (slot.source === SOURCE_RIGHT) {
    const yBase = slot.total <= 1 ? 0.44 + random() * 0.28 : 0.34 + slot.ordinal * 0.23;
    return {
      source: SOURCE_RIGHT,
      x: width * (0.965 - random() * 0.018),
      y: height * clamp(yBase, 0.22, 0.82) + sideJitter,
      angle: Math.PI + 0.34 + (random() - 0.5) * 0.42,
    };
  }

  const t = slot.total <= 1 ? 0.5 : slot.ordinal / Math.max(1, slot.total - 1);
  return {
    source: SOURCE_BOTTOM,
    x: width * (0.24 + 0.52 * t) + bottomJitter,
    y: height * (0.952 + random() * 0.018),
    angle: -Math.PI * 0.5 + (random() - 0.5) * 0.36,
  };
}

function boundaryInfo(x, y, metrics) {
  const width = metrics.cssWidth;
  const height = metrics.cssHeight;
  const near = Math.min(width, height) * 0.105;
  const info = {
    side: null,
    amount: 0,
    inward: -Math.PI * 0.5,
    tangentA: 0,
    tangentB: 0,
  };
  const left = x;
  const right = width - x;
  const top = y;
  const bottom = height - y;
  const min = Math.min(left, right, top, bottom);
  if (min > near) return info;

  info.amount = 1 - clamp(min / near, 0, 1);
  if (min === left) {
    info.side = 'left';
    info.inward = 0;
    info.tangentA = -Math.PI * 0.5;
    info.tangentB = Math.PI * 0.5;
  } else if (min === right) {
    info.side = 'right';
    info.inward = Math.PI;
    info.tangentA = -Math.PI * 0.5;
    info.tangentB = Math.PI * 0.5;
  } else if (min === top) {
    info.side = 'top';
    info.inward = Math.PI * 0.5;
    info.tangentA = 0;
    info.tangentB = Math.PI;
  } else {
    info.side = 'bottom';
    info.inward = -Math.PI * 0.5;
    info.tangentA = 0;
    info.tangentB = Math.PI;
  }
  return info;
}

function centralReserve(metrics) {
  const width = metrics.cssWidth;
  const height = metrics.cssHeight;
  const minSide = Math.min(width, height);
  return {
    cx: width * 0.5,
    cy: height * 0.54,
    rx: clamp(width * (width < 640 ? 0.42 : 0.26), 152, 382),
    ry: clamp(height * (width < 640 ? 0.27 : 0.22), 150, 238),
    margin: clamp(minSide * 0.035, 24, 46),
  };
}

function reserveNormalizedDistance(x, y, reserve, padding = 0) {
  const rx = Math.max(1, reserve.rx + padding);
  const ry = Math.max(1, reserve.ry + padding);
  const dx = (x - reserve.cx) / rx;
  const dy = (y - reserve.cy) / ry;
  return Math.hypot(dx, dy);
}

function isOutsideCentralReserve(x, y, radius, reserve) {
  const envelope = drawEnvelopeRadius(radius) + reserve.margin;
  return reserveNormalizedDistance(x, y, reserve, envelope) >= 1;
}

function branchBaseAngle(source, slot, total, profile, random) {
  const center = (total - 1) * 0.5;
  const spreadT = total <= 1 ? 0 : (slot - center) / center;
  const fan = profile.fan * (0.74 + random() * 0.28);
  if (source === SOURCE_LEFT) {
    return spreadT * fan * 0.55 + (random() - 0.5) * 0.2;
  }
  if (source === SOURCE_RIGHT) {
    return Math.PI - spreadT * fan * 0.55 + (random() - 0.5) * 0.2;
  }
  return -Math.PI * 0.5 + spreadT * fan + (random() - 0.5) * 0.22;
}

function buildFormation(metrics, theme, config, seed, reducedMotion) {
  const random = mulberry32(seed || 1);
  const isMobile = isMobileSimulationViewport(metrics);
  const countLimit = resolveBodyCount(config, metrics, reducedMotion);
  const rootLimit = resolveSeedCount(config, metrics, countLimit, reducedMotion);
  const profile = getPresetProfile(config);
  const gap = clamp(numberOr(
    isMobile ? config.mobilePackingGap : config.packingGap,
    isMobile ? 4.5 : 5.5,
  ), 2, 10);
  const forkRate = clamp(numberOr(config.forkRate, 0.72), 0, 1);
  const wallFollow = clamp(numberOr(config.wallFollow, 0.78), 0, 1);
  const openSpaceBias = clamp(numberOr(config.openSpaceBias, 0.64), 0, 1);
  const curlStrength = clamp(numberOr(config.curlStrength, 0.46), 0, 1);
  const branchClearance = clamp(numberOr(config.branchClearance, 0.62), 0, 1);
  const leafletDensity = reducedMotion
    ? clamp(numberOr(config.leafletDensity, 0.48), 0, 0.34)
    : clamp(numberOr(config.leafletDensity, 0.48), 0, 1);
  const paletteLength = resolvePalette(theme).length;
  const mobileBodyScale = resolveMobileSimulationBodyScale(
    theme?.mobileSimulationBodyScale,
    metrics,
  );
  const mobileBodyCompensation = resolveMobileSimulationMultiplier(
    config.mobileBodyScaleCompensation,
    metrics,
    { fallback: 1, min: 1, max: 1.25 },
  );
  const maxRadius = drawEnvelopeRadius(
    8.7
      * clamp(numberOr(config.bodyScale, 1), 0.8, 1.8)
      * mobileBodyScale
      * mobileBodyCompensation,
  );
  const nominalBodyRadius = 7.5
    * clamp(numberOr(config.bodyScale, 1), 0.8, 1.8)
    * mobileBodyScale
    * mobileBodyCompensation
    * (reducedMotion ? 0.96 : 1);
  const cellSize = Math.max(28, maxRadius * 2 + gap + 16);
  const gridCols = Math.max(1, Math.ceil(metrics.cssWidth / cellSize));
  const gridRows = Math.max(1, Math.ceil(metrics.cssHeight / cellSize));
  const wallGap = Math.max(9, gap * 1.45);
  const textReserve = centralReserve(metrics);
  const minCoverageCount = Math.min(countLimit, Math.max(rootLimit + 16, Math.round(countLimit * 0.84)));
  const state = {
    count: 0,
    rootCount: 0,
    seed,
    x: new Float32Array(countLimit),
    y: new Float32Array(countLimit),
    radius: new Float32Array(countLimit),
    birth: new Float32Array(countLimit),
    growthBoost: new Float32Array(countLimit),
    growthScale: new Float32Array(countLimit),
    phase: new Float32Array(countLimit),
    angle: new Float32Array(countLimit),
    stiffness: new Float32Array(countLimit),
    offsetX: new Float32Array(countLimit),
    offsetY: new Float32Array(countLimit),
    velocityX: new Float32Array(countLimit),
    velocityY: new Float32Array(countLimit),
    impactJolt: new Float32Array(countLimit),
    stretchX: new Float32Array(countLimit),
    stretchY: new Float32Array(countLimit),
    rotation: new Float32Array(countLimit),
    materialRoleIndex: new Uint8Array(countLimit),
    soundPlayed: new Uint8Array(countLimit),
    kind: new Uint8Array(countLimit),
    root: new Uint16Array(countLimit),
    parent: new Int32Array(countLimit),
    depth: new Uint16Array(countLimit),
    branchId: new Uint16Array(countLimit),
    childCount: new Uint8Array(countLimit),
    next: new Int32Array(countLimit),
    head: new Int32Array(gridCols * gridRows),
    gridCols,
    gridRows,
    cellSize,
    maxRadius,
    nominalBodyRadius,
    mobileSimulationBodyScale: mobileBodyScale,
    minGapPx: 0,
    formationMinX: Infinity,
    formationMaxX: 0,
    formationMinY: Infinity,
    formationMaxY: 0,
    rootBottomCount: 0,
    rootLeftCount: 0,
    rootRightCount: 0,
    paletteSize: paletteLength,
    paletteUsed: 0,
    colorUsage: new Uint16Array(paletteLength),
    leafletCount: 0,
    forkCount: 0,
    wallTurnCount: 0,
    peakActiveTips: 0,
    retiredTips: 0,
    minCoverageCount,
    lastElixirImpactAt: -Infinity,
    lastElixirImpactRoot: -1,
    lastOrganicCompanionSoundAt: -Infinity,
    growthSoundSlot: 0,
    configKey: getFormationKey(config, theme, metrics, seed, reducedMotion),
  };
  const tips = [];
  const retiredEndpoints = [];
  let branchIdCursor = 1;

  state.head.fill(-1);
  state.parent.fill(-1);
  state.next.fill(-1);

  function cellIndexFor(x, y) {
    const cx = clamp(Math.floor(x / state.cellSize), 0, state.gridCols - 1);
    const cy = clamp(Math.floor(y / state.cellSize), 0, state.gridRows - 1);
    return cy * state.gridCols + cx;
  }

  function isInsideTerrarium(x, y, radius) {
    const envelope = drawEnvelopeRadius(radius);
    return (
      x >= envelope + wallGap
      && y >= envelope + wallGap
      && x <= metrics.cssWidth - envelope - wallGap
      && y <= metrics.cssHeight - envelope - wallGap
    );
  }

  function clearanceAt(x, y, radius, candidateBranchId, candidateKind, parentIndex = -1) {
    if (!isInsideTerrarium(x, y, radius)) return -1;
    if (!isOutsideCentralReserve(x, y, radius, textReserve)) return -1;

    let minGap = Infinity;
    const range = Math.ceil((radius + state.maxRadius + gap + branchClearance * 10) / state.cellSize);
    const cx = clamp(Math.floor(x / state.cellSize), 0, state.gridCols - 1);
    const cy = clamp(Math.floor(y / state.cellSize), 0, state.gridRows - 1);
    for (let gy = Math.max(0, cy - range); gy <= Math.min(state.gridRows - 1, cy + range); gy += 1) {
      for (let gx = Math.max(0, cx - range); gx <= Math.min(state.gridCols - 1, cx + range); gx += 1) {
        let current = state.head[gy * state.gridCols + gx];
        while (current !== -1) {
          const dx = x - state.x[current];
          const dy = y - state.y[current];
          const distance = Math.hypot(dx, dy);
          const differentBranch = (
            current !== parentIndex
            && state.branchId[current] !== candidateBranchId
            && state.kind[current] === BODY_KIND_STEM
            && candidateKind === BODY_KIND_STEM
          );
          const corridorGap = differentBranch ? branchClearance * (4.5 + radius * 0.34) : 0;
          const materialGap = (
            candidateKind === BODY_KIND_LEAFLET
            || state.kind[current] === BODY_KIND_LEAFLET
          ) ? gap * 0.28 : gap;
          const required = drawEnvelopeRadius(radius) + drawEnvelopeRadius(state.radius[current]) + materialGap + corridorGap;
          if (distance < required) return -1;
          minGap = Math.min(minGap, distance - radius - state.radius[current]);
          current = state.next[current];
        }
      }
    }
    return Number.isFinite(minGap) ? minGap : radius + gap;
  }

  function insertGrid(index) {
    const cell = cellIndexFor(state.x[index], state.y[index]);
    state.next[index] = state.head[cell];
    state.head[cell] = index;
  }

  function markColorUsed(index) {
    const colorIndex = resolveSimulationMaterialColorIndex(
      state.materialRoleIndex[index],
      theme?.paletteSnapshot || theme?.colorDistribution,
    ) % Math.max(1, paletteLength);
    if (state.colorUsage[colorIndex] === 0) state.paletteUsed += 1;
    state.colorUsage[colorIndex] += 1;
  }

  function addBody({
    x,
    y,
    radius,
    parentIndex,
    rootIndex,
    angle,
    depth,
    kind = BODY_KIND_STEM,
    branchId = 0,
    source = SOURCE_BOTTOM,
  }) {
    if (state.count >= countLimit) return -1;
    const index = state.count;
    const pebbleSeed = (seed + index * 2654435761) | 0;
    state.x[index] = x;
    state.y[index] = y;
    state.radius[index] = radius;
    state.parent[index] = parentIndex;
    state.root[index] = rootIndex;
    state.depth[index] = depth;
    state.angle[index] = angle;
    state.kind[index] = kind;
    state.branchId[index] = branchId;
    state.phase[index] = random() * TAU;
    state.stiffness[index] = clamp(0.24 + depth * 0.028 + random() * 0.22, 0.2, 0.88);
    state.stretchX[index] = 0.96 + hash01(pebbleSeed + 17) * 0.08;
    state.stretchY[index] = 0.95 + hash01(pebbleSeed + 31) * 0.09;
    state.rotation[index] = hash01(pebbleSeed + 47) * TAU;
    state.materialRoleIndex[index] = kind === BODY_KIND_LEAFLET
      ? pickLeafletMaterialRoleIndex(random, theme, config)
      : pickStemMaterialRoleIndex(random, theme, rootIndex, depth);
    markColorUsed(index);

    state.formationMinX = Math.min(state.formationMinX, x);
    state.formationMaxX = Math.max(state.formationMaxX, x);
    state.formationMinY = Math.min(state.formationMinY, y);
    state.formationMaxY = Math.max(state.formationMaxY, y);

    if (kind === BODY_KIND_LEAFLET) state.leafletCount += 1;
    if (parentIndex < 0) {
      state.rootCount += 1;
      if (source === SOURCE_LEFT) state.rootLeftCount += 1;
      else if (source === SOURCE_RIGHT) state.rootRightCount += 1;
      else state.rootBottomCount += 1;
    }

    state.count += 1;
    insertGrid(index);
    return index;
  }

  function pushTip(tip) {
    if (tips.length > 104) return;
    tips.push(tip);
    state.peakActiveTips = Math.max(state.peakActiveTips, tips.length);
  }

  function createTip(parentIndex, rootIndex, source, angle, generation, energy, branchId) {
    return {
      parent: parentIndex,
      root: rootIndex,
      source,
      angle,
      generation,
      energy,
      age: 0,
      failures: 0,
      branchId,
      lastWallSide: null,
    };
  }

  for (let rootSlot = 0; rootSlot < rootLimit; rootSlot += 1) {
    let rootIndex = -1;
    let placement = null;
    for (let attempt = 0; attempt < 24 && rootIndex < 0; attempt += 1) {
      placement = rootPlacement(rootSlot, rootLimit, random, metrics, config, seed + attempt * 101);
      const radius = resolveRadius(
        random,
        config,
        reducedMotion,
        mobileBodyScale,
        mobileBodyCompensation,
        BODY_KIND_STEM,
        true,
      );
      const envelope = drawEnvelopeRadius(radius);
      const x = clamp(placement.x, envelope + wallGap, metrics.cssWidth - envelope - wallGap);
      const y = clamp(placement.y, envelope + wallGap, metrics.cssHeight - envelope - wallGap);
      if (clearanceAt(x, y, radius, branchIdCursor, BODY_KIND_STEM) < 0) continue;
      rootIndex = addBody({
        x,
        y,
        radius,
        parentIndex: -1,
        rootIndex: state.count,
        angle: placement.angle,
        depth: 0,
        kind: BODY_KIND_STEM,
        branchId: branchIdCursor,
        source: placement.source,
      });
    }
    if (rootIndex < 0) continue;

    const primaryCount = Math.round(
      clamp(profile.primaryMin + forkRate * 1.35 + random() * 1.1, profile.primaryMin, profile.primaryMax),
    );
    for (let slot = 0; slot < primaryCount; slot += 1) {
      const branchId = branchIdCursor;
      branchIdCursor += 1;
      const angle = branchBaseAngle(placement.source, slot, primaryCount, profile, random);
      const perTipBudget = countLimit / Math.max(1, rootLimit * primaryCount);
      const energy = Math.round(clamp(18 + perTipBudget * 0.40 * profile.energy + random() * 16, 16, 74));
      pushTip(createTip(rootIndex, rootIndex, placement.source, angle, 0, energy, branchId));
    }
  }

  function coverageBonus(x, y, angle) {
    let score = 0;
    const leftGap = state.formationMinX > metrics.cssWidth * 0.10;
    const rightGap = state.formationMaxX < metrics.cssWidth * 0.90;
    const topGap = state.formationMinY > metrics.cssHeight * 0.08;
    if (leftGap) score += (1 - x / metrics.cssWidth) * 0.42;
    if (rightGap) score += (x / metrics.cssWidth) * 0.42;
    if (topGap) score += (1 - y / metrics.cssHeight) * 0.58;
    score += Math.max(0, Math.cos(angle + Math.PI * 0.5)) * 0.12;
    const reserveDistance = reserveNormalizedDistance(x, y, textReserve, textReserve.margin);
    if (reserveDistance < 1.58) {
      score += smoothstep(1, 1.42, reserveDistance) * 0.22;
      score -= (1 - smoothstep(1.18, 1.58, reserveDistance)) * 0.18;
    }
    return score * openSpaceBias;
  }

  function candidateAngles(tip, parentX, parentY) {
    const boundary = boundaryInfo(parentX, parentY, metrics);
    const organicCurl = Math.sin(
      tip.age * 0.63
      + tip.branchId * 1.71
      + seed * 0.000002
    ) * curlStrength * profile.curl * (0.20 + tip.generation * 0.025);
    const outwardDrift = tip.source === SOURCE_LEFT
      ? -0.03
      : tip.source === SOURCE_RIGHT
      ? 0.03
      : 0;
    const base = tip.angle + organicCurl + outwardDrift + (random() - 0.5) * 0.12;
    const angles = [
      base,
      base - 0.24,
      base + 0.24,
      base - 0.52,
      base + 0.52,
      base - 0.86,
      base + 0.86,
      base - 1.18,
      base + 1.18,
    ];

    if (boundary.side) {
      const follow = wallFollow * profile.wall * boundary.amount;
      const tangent = Math.cos(angleDistance(base, boundary.tangentA)) > Math.cos(angleDistance(base, boundary.tangentB))
        ? boundary.tangentA
        : boundary.tangentB;
      angles.unshift(
        angleMix(base, tangent, clamp(0.42 + follow * 0.46, 0, 0.92)),
        angleMix(base, boundary.inward, clamp(0.30 + follow * 0.38, 0, 0.82)),
        tangent,
      );
    }

    return { angles, base, boundary };
  }

  function placeTipBody(tip) {
    if (state.count >= countLimit) return -1;
    const parentIndex = tip.parent;
    const parentX = state.x[parentIndex];
    const parentY = state.y[parentIndex];
    const { angles, base, boundary } = candidateAngles(tip, parentX, parentY);
    const radius = resolveRadius(
      random,
      config,
      reducedMotion,
      mobileBodyScale,
      mobileBodyCompensation,
      BODY_KIND_STEM,
      false,
    );
    const step = (
      state.radius[parentIndex]
      + radius
      + gap
      + 0.8
      + random() * (1.4 + gap * 0.34)
    );
    let best = null;

    for (const angle of angles) {
      const x = parentX + Math.cos(angle) * step;
      const y = parentY + Math.sin(angle) * step;
      const clearance = clearanceAt(x, y, radius, tip.branchId, BODY_KIND_STEM, parentIndex);
      if (clearance < 0) continue;
      const directionScore = Math.cos(angleDistance(angle, base)) * 0.36;
      const clearanceScore = clamp(clearance / (radius + gap + 12), 0, 1) * (0.46 + branchClearance * 0.48);
      const wallScore = boundary.side
        ? wallFollow * boundary.amount * (
          Math.max(0, Math.cos(angleDistance(angle, boundary.tangentA)))
          + Math.max(0, Math.cos(angleDistance(angle, boundary.tangentB)))
        ) * 0.42
        : 0;
      const score = directionScore + clearanceScore + coverageBonus(x, y, angle) + wallScore + random() * 0.08;
      if (!best || score > best.score) {
        best = { x, y, radius, angle, score, wallSide: boundary.side };
      }
    }

    if (!best) return -1;
    const index = addBody({
      x: best.x,
      y: best.y,
      radius: best.radius,
      parentIndex,
      rootIndex: tip.root,
      angle: best.angle,
      depth: state.depth[parentIndex] + 1,
      kind: BODY_KIND_STEM,
      branchId: tip.branchId,
      source: tip.source,
    });
    if (index < 0) return -1;
    state.childCount[parentIndex] += 1;
    if (best.wallSide && best.wallSide !== tip.lastWallSide) {
      state.wallTurnCount += 1;
      tip.lastWallSide = best.wallSide;
    }
    return index;
  }

  function placeLeaflet(parentIndex, tip, side, distanceBoost = 0) {
    if (state.count >= countLimit) return false;
    const parentAngle = state.angle[parentIndex];
    const radius = resolveRadius(
      random,
      config,
      reducedMotion,
      mobileBodyScale,
      mobileBodyCompensation,
      BODY_KIND_LEAFLET,
      false,
    );

    for (let attempt = 0; attempt < 7; attempt += 1) {
      const leafAngle = parentAngle
        + side * (Math.PI * 0.5 + 0.12 + random() * 0.34)
        + (random() - 0.5) * 0.22;
      const distance = state.radius[parentIndex]
        + radius
        + gap * 0.62
        + 1.2
        + distanceBoost
        + attempt * (1.4 + gap * 0.16)
        + random() * 1.6;
      const x = state.x[parentIndex] + Math.cos(leafAngle) * distance;
      const y = state.y[parentIndex] + Math.sin(leafAngle) * distance;
      if (clearanceAt(x, y, radius, tip.branchId, BODY_KIND_LEAFLET, parentIndex) < 0) continue;
      addBody({
        x,
        y,
        radius,
        parentIndex,
        rootIndex: tip.root,
        angle: leafAngle,
        depth: state.depth[parentIndex] + 1,
        kind: BODY_KIND_LEAFLET,
        branchId: tip.branchId,
        source: tip.source,
      });
      state.childCount[parentIndex] += 1;
      return true;
    }

    return false;
  }

  function addLeafletCluster(parentIndex, tip) {
    if (leafletDensity <= 0 || state.count >= countLimit - 1) return;
    const clusterChance = leafletDensity
      * profile.leaflet
      * (0.42 + Math.min(0.28, tip.generation * 0.065))
      * smoothstep(2, 8, tip.age);
    if (random() > clusterChance) return;
    if (state.leafletCount > countLimit * 0.34) return;

    const pairCount = random() < 0.28 + leafletDensity * 0.22 ? 3 : 2;
    const sideStart = random() < 0.5 ? -1 : 1;
    for (let slot = 0; slot < pairCount && state.count < countLimit; slot += 1) {
      const side = slot === 2 ? (random() < 0.5 ? -1 : 1) : sideStart * (slot === 0 ? 1 : -1);
      placeLeaflet(parentIndex, tip, side);
    }
  }

  function maybeForkTip(tip, newParent) {
    const generationLimit = profile === PRESET_PROFILES.fern ? 4 : 5;
    if (tip.generation >= generationLimit || tips.length > 98 || tip.energy < 7) return;
    const earlyBoost = tip.age < 8 ? 1.28 : 1;
    const forkChance = (0.045 + forkRate * 0.145) * profile.fork * earlyBoost;
    const cadence = tip.generation <= 1 ? 2 : 3;
    if (tip.age < 2 || tip.age % cadence !== 0 || random() > forkChance) return;

    const sign = random() < 0.5 ? -1 : 1;
    const angle = tip.angle
      + sign * profile.branchAngle * (0.66 + random() * 0.72)
      + (random() - 0.5) * curlStrength * 0.32;
    const energy = Math.round(clamp(tip.energy * (0.34 + random() * 0.38), 5, 34));
    const branchId = branchIdCursor;
    branchIdCursor += 1;
    state.forkCount += 1;
    pushTip(createTip(newParent, tip.root, tip.source, angle, tip.generation + 1, energy, branchId));
  }

  function retireTip(index) {
    const [tip] = tips.splice(index, 1);
    if (tip) {
      state.retiredTips += 1;
      retiredEndpoints.push({ parent: tip.parent, source: tip.source });
    }
  }

  function reviveTip() {
    if (retiredEndpoints.length === 0 || tips.length > 36 || state.count >= countLimit * 0.9) return false;
    for (let attempt = 0; attempt < 32; attempt += 1) {
      const endpoint = retiredEndpoints[Math.floor(random() * retiredEndpoints.length)];
      const parent = endpoint?.parent;
      if (parent < 0 || state.kind[parent] !== BODY_KIND_STEM || state.depth[parent] < 3) continue;
      const boundary = boundaryInfo(state.x[parent], state.y[parent], metrics);
      const baseAngle = boundary.side
        ? angleMix(boundary.inward, boundary.tangentA, random() < 0.5 ? 0.56 : -0.56)
        : state.angle[parent] + (random() < 0.5 ? -1 : 1) * (0.62 + random() * 0.5);
      const branchId = branchIdCursor;
      branchIdCursor += 1;
      state.forkCount += 1;
      pushTip(createTip(
        parent,
        state.root[parent],
        endpoint.source,
        baseAngle,
        Math.min(5, state.depth[parent]),
        8 + Math.round(random() * 18),
        branchId,
      ));
      return true;
    }
    return false;
  }

  let cursor = 0;
  let misses = 0;
  let steps = 0;
  const missLimit = Math.max(260, countLimit * 2.6);
  const stepLimit = countLimit * 42;

  while (
    state.count < countLimit
    && steps < stepLimit
    && misses < missLimit
    && (tips.length > 0 || reviveTip())
  ) {
    steps += 1;
    if (tips.length === 0) continue;
    const tipIndex = cursor % tips.length;
    const tip = tips[tipIndex];
    cursor += 1;

    if (!tip || tip.energy <= 0 || tip.failures > 18) {
      retireTip(tipIndex);
      continue;
    }

    const index = placeTipBody(tip);
    if (index < 0) {
      tip.failures += 1;
      tip.angle += (random() < 0.5 ? -1 : 1) * (0.12 + random() * 0.18);
      misses += 1;
      continue;
    }

    tip.parent = index;
    tip.angle = angleMix(tip.angle, state.angle[index], 0.72);
    tip.age += 1;
    tip.energy -= 1;
    tip.failures = 0;
    misses = 0;

    addLeafletCluster(index, tip);
    maybeForkTip(tip, index);

    if (tips.length < Math.max(5, rootLimit * 2) && state.count < minCoverageCount) {
      reviveTip();
    }
  }

  if (leafletDensity > 0 && state.count < countLimit) {
    const targetLeaflets = Math.min(
      Math.round(countLimit * leafletDensity * profile.leaflet * 0.16),
      Math.max(4, countLimit - state.count),
    );
    let attempts = 0;
    let cursorIndex = state.count - 1;
    while (state.leafletCount < targetLeaflets && state.count < countLimit && attempts < countLimit * 8) {
      attempts += 1;
      cursorIndex -= 1;
      if (cursorIndex < state.rootCount) cursorIndex = state.count - 1;
      const parentIndex = cursorIndex;
      if (state.kind[parentIndex] !== BODY_KIND_STEM || state.depth[parentIndex] < 4) continue;
      if (state.childCount[parentIndex] > (random() < 0.72 ? 1 : 2)) continue;
      const side = random() < 0.5 ? -1 : 1;
      placeLeaflet(
        parentIndex,
        {
          branchId: state.branchId[parentIndex],
          root: state.root[parentIndex],
          source: state.x[parentIndex] < metrics.cssWidth * 0.28
            ? SOURCE_LEFT
            : state.x[parentIndex] > metrics.cssWidth * 0.72
            ? SOURCE_RIGHT
            : SOURCE_BOTTOM,
        },
        side,
        random() * gap * 0.5,
      );
    }
  }

  const bodyCount = Math.max(1, state.count - state.rootCount);
  const birthExponent = isMobile ? MOBILE_GROWTH_BIRTH_EXPONENT : 0.82;
  for (let i = 0; i < state.count; i += 1) {
    if (state.parent[i] < 0) {
      state.birth[i] = 0;
      continue;
    }
    const normalized = clamp((i - state.rootCount) / bodyCount, 0, 1);
    const leafDelay = state.kind[i] === BODY_KIND_LEAFLET ? 0.018 : 0;
    state.birth[i] = clamp(
      0.018 + Math.pow(normalized, birthExponent) * 0.962 + leafDelay,
      0,
      0.995,
    );
  }

  state.minGapPx = computeMinGap(state);
  return state;
}

function resolveGrowthDuration(config, reducedMotion, metrics) {
  if (config.enabled === false || reducedMotion) return 0;
  const isMobile = isMobileSimulationViewport(metrics);
  return clamp(numberOr(
    isMobile ? config.mobileGrowthDuration : config.growthDuration,
    isMobile ? 14 : 28,
  ), isMobile ? 8 : 20, 48);
}

function updateGrowthScales(state, elapsed, duration) {
  if (!state) return 0;
  let visibleCount = 0;
  for (let i = 0; i < state.count; i += 1) {
    const grow = duration <= 0
      ? 1
      : smoothstep(0, 0.95, elapsed + state.growthBoost[i] - state.birth[i] * duration);
    state.growthScale[i] = grow;
    if (grow > 0.002) visibleCount += 1;
  }
  return visibleCount;
}

function isGrowthConnected(state, index) {
  const parentIndex = state.parent[index];
  if (parentIndex < 0) return true;
  if (state.growthScale[parentIndex] >= ELIXIR_MIN_PARENT_GROWTH) return true;
  const rootIndex = state.root[index];
  return rootIndex >= 0 && state.growthScale[rootIndex] >= ELIXIR_MIN_PARENT_GROWTH;
}

function applyElixirGrowth(state, metrics, pointer, now, dt, elapsed, duration, reducedMotion) {
  if (!state || duration <= 0 || reducedMotion) return 0;
  const pointerAge = now - pointer.lastAt;
  if (!pointer.inside || pointerAge < 0 || pointerAge > ELIXIR_POINTER_MAX_AGE_MS) return 0;

  const minSide = Math.min(metrics.cssWidth, metrics.cssHeight);
  const contactRadius = clamp(124 + minSide * 0.06, 142, 230);
  let contactStrength = 0;
  let contactRoot = -1;

  for (let i = 0; i < state.count; i += 1) {
    const grow = state.growthScale[i];
    if (grow < ELIXIR_CONTACT_GROWTH) continue;
    const dx = state.x[i] - pointer.x;
    const dy = state.y[i] - pointer.y;
    const distance = Math.hypot(dx, dy);
    const contactReach = contactRadius + drawEnvelopeRadius(state.radius[i]) * grow;
    if (distance >= contactReach) continue;
    const proximity = 1 - distance / contactReach;
    const nextStrength = proximity * proximity * grow;
    if (nextStrength > contactStrength) {
      contactStrength = nextStrength;
      contactRoot = state.root[i];
    }
  }

  if (contactStrength <= 0 || contactRoot < 0) return 0;

  const maxBoost = duration * ELIXIR_MAX_DURATION_SHARE;
  const sustainBoost = dt * ELIXIR_GROWTH_STRENGTH * contactStrength;
  const canPulse = now - state.lastElixirImpactAt >= ELIXIR_IMPACT_INTERVAL_MS
    || state.lastElixirImpactRoot !== contactRoot;
  const impactBoost = canPulse
    ? duration * ELIXIR_IMPACT_DURATION_SHARE * (0.64 + contactStrength * 0.36)
    : 0;
  const activationRadius = contactRadius * ELIXIR_ACTIVATION_SCALE;
  let affectedCount = 0;

  for (let i = 0; i < state.count; i += 1) {
    if (state.growthScale[i] >= 0.995) continue;
    if (state.root[i] !== contactRoot && i !== contactRoot) continue;
    if (!isGrowthConnected(state, i)) continue;
    const dx = state.x[i] - pointer.x;
    const dy = state.y[i] - pointer.y;
    const distance = Math.hypot(dx, dy);
    if (distance >= activationRadius) continue;
    const proximity = 1 - distance / activationRadius;
    const falloff = ELIXIR_FALLOFF_FLOOR + (1 - ELIXIR_FALLOFF_FLOOR) * proximity;
    const nextBoost = Math.min(maxBoost, state.growthBoost[i] + (sustainBoost + impactBoost) * falloff);
    if (nextBoost <= state.growthBoost[i]) continue;
    state.growthBoost[i] = nextBoost;
    if (impactBoost > 0 && state.growthScale[i] > 0.08) {
      state.impactJolt[i] = Math.max(state.impactJolt[i], falloff * (0.65 + contactStrength * 0.35));
    }
    affectedCount += 1;
  }

  if (affectedCount > 0) {
    if (impactBoost > 0) {
      state.lastElixirImpactAt = now;
      state.lastElixirImpactRoot = contactRoot;
    }
    updateGrowthScales(state, elapsed, duration);
  }
  return affectedCount;
}

function drawPebble(ctx, state, index, radius, color) {
  const x = state.x[index] + state.offsetX[index];
  const y = state.y[index] + state.offsetY[index];
  const rx = radius * state.stretchX[index];
  const ry = radius * state.stretchY[index];
  const rotation = state.rotation[index] + state.offsetX[index] * 0.006;

  ctx.beginPath();
  ctx.ellipse(x, y, rx, ry, rotation, 0, TAU);
  ctx.fillStyle = rgbString(color, 1);
  ctx.fill();
}

function playGrowthAccretionSound(state, metrics) {
  let newCount = 0;
  let xTotal = 0;
  let radiusTotal = 0;
  let strongestGrow = 0;
  let widestX = -Infinity;
  let narrowestX = Infinity;
  let seedMix = state.seed >>> 0;

  for (let i = 0; i < state.count; i += 1) {
    const grow = state.growthScale[i];
    if (grow < GROWTH_SOUND_THRESHOLD || state.soundPlayed[i]) continue;
    state.soundPlayed[i] = 1;
    newCount += 1;
    xTotal += state.x[i];
    radiusTotal += state.radius[i];
    strongestGrow = Math.max(strongestGrow, grow);
    widestX = Math.max(widestX, state.x[i]);
    narrowestX = Math.min(narrowestX, state.x[i]);
    seedMix = (seedMix ^ Math.imul(i + 1, 2654435761)) >>> 0;
  }

  if (newCount <= 0) return false;

  state.growthSoundSlot = (state.growthSoundSlot + 1) >>> 0;
  const avgRadius = radiusTotal / newCount;
  const organicA = hash01((seedMix + state.growthSoundSlot * 1013904223) | 0);
  const organicB = hash01((seedMix ^ (state.growthSoundSlot * 1664525)) | 0);
  const clusterWidth = Math.max(0, widestX - narrowestX);
  const batchEnergy = clamp(newCount / 18, 0, 1);
  const panDrift = (organicA - 0.5) * clamp(clusterWidth / Math.max(1, metrics.cssWidth), 0.015, 0.12);
  const pan = clamp(xTotal / newCount / Math.max(1, metrics.cssWidth) + panDrift, 0, 1);
  const radius = clamp(9 + avgRadius * (1.15 + organicA * 2.3), 10, 38);
  const intensity = clamp(0.735 + batchEnergy * 0.105 + strongestGrow * 0.035 + organicB * 0.025, 0.72, 0.88);
  const didPlayMain = triggerImpact({
    id: 'mineral-growth:organic-accretion',
    radius,
    intensity,
    x: pan,
    minIntervalMs: GROWTH_SOUND_MIN_INTERVAL_MS,
  });

  const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const shouldPlayCompanion = didPlayMain
    && newCount >= 2
    && (organicA > 0.18 || state.growthSoundSlot % 3 === 0)
    && now - state.lastOrganicCompanionSoundAt >= GROWTH_SOUND_COMPANION_INTERVAL_MS;
  if (shouldPlayCompanion) {
    state.lastOrganicCompanionSoundAt = now;
    const companionPayload = {
      id: 'mineral-growth:organic-accretion-companion',
      radius: clamp(radius * (0.56 + organicB * 0.28), 7, 24),
      intensity: clamp(intensity - 0.055 - organicA * 0.045, 0.705, 0.78),
      x: clamp(pan + (organicB - 0.5) * 0.18, 0, 1),
      minIntervalMs: GROWTH_SOUND_COMPANION_INTERVAL_MS,
    };
    const companionDelayMs = 26 + organicA * 54;
    if (typeof window !== 'undefined' && typeof window.setTimeout === 'function') {
      window.setTimeout(() => triggerImpact(companionPayload), companionDelayMs);
    } else {
      triggerImpact(companionPayload);
    }
  }

  return didPlayMain;
}

function updateSway(state, config, metrics, pointer, now, dt, growthProgress, reducedMotion) {
  const pointerBend = reducedMotion ? 0.08 : clamp(numberOr(config.pointerBend, 0), 0, 1);
  const swayStrength = reducedMotion ? 0.06 : clamp(numberOr(config.swayStrength, 0), 0, 1);
  const pointerAge = now - pointer.lastAt;
  const pointerLive = pointer.inside && pointerBend > 0 && pointerAge >= 0 && pointerAge < 1000;
  const minSide = Math.min(metrics.cssWidth, metrics.cssHeight);
  const reach = clamp(88 + pointerBend * minSide * 0.22, 78, 260);
  const pointerSpeed = Math.hypot(pointer.vx, pointer.vy);
  const motionLen = pointerSpeed > 30 ? pointerSpeed : 0;
  const motionX = motionLen > 0 ? pointer.vx / motionLen : 0;
  const motionY = motionLen > 0 ? pointer.vy / motionLen : 0;
  const idleAmount = (0.16 + Math.pow(1 - growthProgress, 1.45) * 0.84) * swayStrength;

  pointer.vx *= Math.exp(-dt * 4.2);
  pointer.vy *= Math.exp(-dt * 4.2);

  for (let i = 0; i < state.count; i += 1) {
    const grow = state.growthScale[i];
    if (grow <= 0.002) continue;
    const depthFlex = clamp(state.depth[i] / 16, 0, 1);
    const rootFlex = state.parent[i] < 0 ? 0.05 : 0.24 + depthFlex * 0.86;
    const kindFlex = state.kind[i] === BODY_KIND_LEAFLET ? 1.36 : 1;
    const normal = state.angle[i] + Math.PI * 0.5;
    const impactJolt = state.impactJolt[i];
    let targetX = Math.cos(normal) * Math.sin(now * 0.0015 + state.phase[i]) * idleAmount * state.radius[i] * rootFlex * kindFlex * grow;
    let targetY = Math.sin(normal) * Math.sin(now * 0.0015 + state.phase[i]) * idleAmount * state.radius[i] * rootFlex * kindFlex * grow;

    if (pointerLive) {
      const dx = state.x[i] - pointer.x;
      const dy = state.y[i] - pointer.y;
      const distance = Math.hypot(dx, dy);
      if (distance < reach) {
        const radialX = distance > 0.001 ? dx / distance : 0;
        const radialY = distance > 0.001 ? dy / distance : -1;
        const directionX = motionLen > 0 ? motionX : radialX;
        const directionY = motionLen > 0 ? motionY : radialY;
        const influence = Math.pow(1 - distance / reach, 2) * pointerBend * rootFlex * kindFlex;
        const amplitude = influence * (12 + state.radius[i] * 2.7) * (1 + clamp(pointerSpeed / 850, 0, 1.35));
        targetX += directionX * amplitude;
        targetY += directionY * amplitude;
      }

      if (impactJolt > 0.001) {
        const dx = state.x[i] - pointer.x;
        const dy = state.y[i] - pointer.y;
        const distance = Math.hypot(dx, dy);
        const radialX = distance > 0.001 ? dx / distance : 0;
        const radialY = distance > 0.001 ? dy / distance : -1;
        const joltAmplitude = impactJolt * (2.6 + state.radius[i] * 0.32) * rootFlex * kindFlex;
        targetX += radialX * joltAmplitude;
        targetY += radialY * joltAmplitude;
      }
    }

    const stiffness = 17 + state.stiffness[i] * 25;
    const damping = 8 + state.stiffness[i] * 7;
    state.velocityX[i] += (targetX - state.offsetX[i]) * stiffness * dt;
    state.velocityY[i] += (targetY - state.offsetY[i]) * stiffness * dt;
    const decay = Math.exp(-damping * dt);
    state.velocityX[i] *= decay;
    state.velocityY[i] *= decay;
    state.impactJolt[i] *= Math.exp(-dt * ELIXIR_JOLT_DECAY);
    state.offsetX[i] += state.velocityX[i] * dt;
    state.offsetY[i] += state.velocityY[i] * dt;
    const maxOffset = reducedMotion ? 0.6 : clamp(state.minGapPx * (0.22 + impactJolt * 0.24), 0.8, 3.4);
    const offsetLength = Math.hypot(state.offsetX[i], state.offsetY[i]);
    if (offsetLength > maxOffset) {
      const scale = maxOffset / offsetLength;
      state.offsetX[i] *= scale;
      state.offsetY[i] *= scale;
      state.velocityX[i] *= 0.35;
      state.velocityY[i] *= 0.35;
    }

    if (!pointerLive && growthProgress >= 1 && Math.abs(state.offsetX[i]) + Math.abs(state.offsetY[i]) < 0.02) {
      state.offsetX[i] = 0;
      state.offsetY[i] = 0;
      state.velocityX[i] = 0;
      state.velocityY[i] = 0;
    }
  }
}

function renderState(ctx, state, metrics, theme, now, elapsed, duration, options = {}) {
  const palette = resolvePalette(theme).map((color) => parseHexColor(color));
  const surface = isHexColor(theme?.active) ? theme.active : DEFAULT_THEME.active;
  const getVisualScaleAt = options.getVisualScaleAt || (() => 1);
  let visibleCount = 0;
  ctx.setTransform(metrics.dpr, 0, 0, metrics.dpr, 0, 0);
  ctx.clearRect(0, 0, metrics.cssWidth, metrics.cssHeight);
  markAuditFrame(ctx.canvas);
  if (!options.transparentBackground) {
    ctx.fillStyle = surface;
    ctx.fillRect(0, 0, metrics.cssWidth, metrics.cssHeight);
  }

  for (let i = 0; i < state.count; i += 1) {
    const grow = state.growthScale[i];
    if (grow <= 0) continue;
    visibleCount += 1;
    const colorIndex = resolveSimulationMaterialColorIndex(
      state.materialRoleIndex[i],
      theme?.paletteSnapshot || theme?.colorDistribution,
    );
    const color = palette[colorIndex % palette.length] || parseHexColor(DEFAULT_THEME.palette[0]);
    const radius = state.radius[i] * (0.38 + grow * 0.62) * getVisualScaleAt(i);
    if (radius <= 0.05) continue;
    drawPebble(ctx, state, i, radius, color);
  }

  ctx.globalAlpha = 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const growthProgress = duration <= 0 ? 1 : clamp(elapsed / duration, 0, 1);
  const settled = visibleCount >= state.count && elapsed >= duration + 1.2;
  const coverageWidth = (state.formationMaxX - state.formationMinX) / Math.max(1, metrics.cssWidth);
  const coverageHeight = (state.formationMaxY - state.formationMinY) / Math.max(1, metrics.cssHeight);
  return {
    activeCount: visibleCount,
    targetCount: state.count,
    resolvedSeedCount: state.rootCount,
    growthProgress,
    settled,
    seed: state.seed,
    dpr: metrics.dpr,
    minGapPx: state.minGapPx,
    activeTips: Math.max(0, Math.round(state.peakActiveTips * (1 - smoothstep(0.18, 1, growthProgress)))),
    retiredTips: state.retiredTips,
    forkCount: state.forkCount,
    leafletCount: state.leafletCount,
    wallTurnCount: state.wallTurnCount,
    coverageWidth,
    coverageHeight,
    formationMinX: state.formationMinX / Math.max(1, metrics.cssWidth),
    formationMaxX: state.formationMaxX / Math.max(1, metrics.cssWidth),
    formationMinY: state.formationMinY / Math.max(1, metrics.cssHeight),
    formationMaxY: state.formationMaxY / Math.max(1, metrics.cssHeight),
    rootBottomCount: state.rootBottomCount,
    rootLeftCount: state.rootLeftCount,
    rootRightCount: state.rootRightCount,
    paletteUsed: state.paletteUsed,
    paletteSize: state.paletteSize,
    frameAt: now,
  };
}

export function createMineralGrowthRenderer({
  canvas,
  reducedMotion = false,
  getConfig,
  getTheme,
  transparentBackground = false,
}) {
  const ctx = canvas.getContext('2d', { alpha: Boolean(transparentBackground) });
  let rafId = 0;
  let state = null;
  let metrics = null;
  let lastFrameAt = 0;
  let lastRenderAt = 0;
  let startedAt = 0;
  let running = false;
  let frameMs = 0;
  let stateBuildCount = 0;
  let lastMetrics = {
    activeCount: 0,
    targetCount: 0,
    resolvedSeedCount: 0,
    growthProgress: 0,
    settled: false,
    seed: 0,
    dpr: 1,
    frameMs: 0,
    minGapPx: 0,
    activeTips: 0,
    retiredTips: 0,
    forkCount: 0,
    leafletCount: 0,
    wallTurnCount: 0,
    coverageWidth: 0,
    coverageHeight: 0,
    formationMinX: 0,
    formationMaxX: 0,
    formationMinY: 0,
    formationMaxY: 0,
    rootBottomCount: 0,
    rootLeftCount: 0,
    rootRightCount: 0,
    paletteUsed: 0,
    paletteSize: 0,
  };
  let currentSeed = readSeedFromUrl() ?? createRandomSeed();
  const pointer = {
    x: -10000,
    y: -10000,
    vx: 0,
    vy: 0,
    lastAt: -Infinity,
    inside: false,
  };
  let unregisterVisualTransition = null;
  const visualTransition = createIndexedSimulationVisualTransition({
    sourceId: 'mineral-growth',
    getCount: () => state?.count || 0,
    requestRender: () => paintCurrentState(performance.now()),
    getSeed: () => currentSeed,
  });
  unregisterVisualTransition = registerSimulationVisualTransition('mineral-growth', visualTransition);

  function updatePointer(event) {
    const rect = canvas.getBoundingClientRect();
    const now = performance.now();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const dt = Math.max(16, now - pointer.lastAt);
    pointer.vx = (x - pointer.x) / dt * 1000;
    pointer.vy = (y - pointer.y) / dt * 1000;
    pointer.x = x;
    pointer.y = y;
    pointer.lastAt = now;
    pointer.inside = true;
  }

  function handlePointerLeave() {
    pointer.inside = false;
  }

  canvas.addEventListener('pointerenter', updatePointer);
  canvas.addEventListener('pointermove', updatePointer);
  canvas.addEventListener('pointerleave', handlePointerLeave);
  canvas.addEventListener('pointercancel', handlePointerLeave);

  function ensureState() {
    const config = getConfig?.() || {};
    const theme = getTheme?.() || DEFAULT_THEME;
    const dpr = resolveDpr(config);
    metrics = resizeCanvasToDisplaySize(canvas, dpr);
    const key = getFormationKey(config, theme, metrics, currentSeed, reducedMotion);
    if (!state || state.configKey !== key) {
      state = buildFormation(metrics, theme, config, currentSeed, reducedMotion);
      stateBuildCount += 1;
      startedAt = performance.now();
      lastFrameAt = 0;
      lastRenderAt = 0;
    }
    canvas.dataset.mobileSimulationBodyScale = state.mobileSimulationBodyScale.toFixed(2);
    canvas.dataset.simulationBodyRadius = state.nominalBodyRadius.toFixed(2);
    canvas.dataset.simulationPaletteGeneration = String(theme?.paletteGeneration || '');
    canvas.dataset.simulationPaletteId = String(theme?.paletteId || '');
    canvas.dataset.simulationStateBuildCount = String(stateBuildCount);
    canvas.dataset.simulationBodyCount = String(state.count);
    canvas.dataset.simulationSeedCount = String(state.rootCount);
    return { config, theme };
  }

  function resolveRenderFrame(now = performance.now()) {
    const { config, theme } = ensureState();
    const duration = resolveGrowthDuration(config, reducedMotion, metrics);
    canvas.dataset.simulationGrowthDuration = duration.toFixed(1);
    const elapsed = duration <= 0 ? duration + 2 : (now - startedAt) / 1000;
    const activeCount = updateGrowthScales(state, elapsed, duration);
    const growthProgress = duration <= 0 ? 1 : clamp(elapsed / duration, 0, 1);
    return { config, theme, duration, elapsed, activeCount, growthProgress };
  }

  function writeRenderMetrics(rendered, started) {
    frameMs = frameMs ? frameMs * 0.86 + (performance.now() - started) * 0.14 : performance.now() - started;
    lastMetrics = {
      activeCount: rendered.activeCount,
      targetCount: rendered.targetCount,
      resolvedSeedCount: rendered.resolvedSeedCount,
      growthProgress: rendered.growthProgress,
      settled: rendered.settled,
      seed: rendered.seed,
      dpr: rendered.dpr,
      frameMs,
      minGapPx: rendered.minGapPx,
      activeTips: rendered.activeTips,
      retiredTips: rendered.retiredTips,
      forkCount: rendered.forkCount,
      leafletCount: rendered.leafletCount,
      wallTurnCount: rendered.wallTurnCount,
      coverageWidth: rendered.coverageWidth,
      coverageHeight: rendered.coverageHeight,
      formationMinX: rendered.formationMinX,
      formationMaxX: rendered.formationMaxX,
      formationMinY: rendered.formationMinY,
      formationMaxY: rendered.formationMaxY,
      rootBottomCount: rendered.rootBottomCount,
      rootLeftCount: rendered.rootLeftCount,
      rootRightCount: rendered.rootRightCount,
      paletteUsed: rendered.paletteUsed,
      paletteSize: rendered.paletteSize,
      simulationBodyRadius: state?.nominalBodyRadius || 0,
      mobileSimulationBodyScale: state?.mobileSimulationBodyScale || 1,
    };
    return lastMetrics;
  }

  function paintCurrentState(now = performance.now()) {
    const started = performance.now();
    const { theme, duration, elapsed } = resolveRenderFrame(now);
    const rendered = renderState(ctx, state, metrics, theme, now, elapsed, duration, {
      transparentBackground,
      getVisualScaleAt: visualTransition.getScaleAt,
    });
    notifySimulationAtmosphereSourceFrame('mineral-growth');
    return writeRenderMetrics(rendered, started);
  }

  function draw(now = performance.now()) {
    const started = performance.now();
    const { config, theme, duration, elapsed, growthProgress } = resolveRenderFrame(now);
    const dt = lastFrameAt ? clamp((now - lastFrameAt) / 1000, 0.001, 0.05) : 0.016;
    lastFrameAt = now;

    applyElixirGrowth(state, metrics, pointer, now, dt, elapsed, duration, reducedMotion);

    updateSway(state, config, metrics, pointer, now, dt, growthProgress, reducedMotion);
    playGrowthAccretionSound(state, metrics);
    const pointerSpeed = Math.hypot(pointer.vx, pointer.vy);
    if (pointer.inside && pointerSpeed > 300) {
      triggerPressure({
        id: 'mineral-growth:pointer-bend',
        intensity: clamp(pointerSpeed / 1200, 0.58, 0.82),
        x: clamp(pointer.x / Math.max(1, metrics.cssWidth), 0, 1),
        radius: 16,
        minIntervalMs: 220,
      });
    }
    const rendered = renderState(ctx, state, metrics, theme, now, elapsed, duration, {
      transparentBackground,
      getVisualScaleAt: visualTransition.getScaleAt,
    });
    notifySimulationAtmosphereSourceFrame('mineral-growth');
    return writeRenderMetrics(rendered, started);
  }

  function frame(now) {
    if (!running) return;
    const config = getConfig?.() || {};
    const targetFps = resolveTargetFps(config, reducedMotion);
    const minFrameMs = 1000 / targetFps;
    if (!shouldPauseForVisibility(config) && (!lastRenderAt || now - lastRenderAt >= minFrameMs * 0.94)) {
      lastRenderAt = lastRenderAt
        ? Math.min(now, lastRenderAt + minFrameMs)
        : now;
      draw(now);
    }
    rafId = window.requestAnimationFrame(frame);
  }

  function start() {
    running = true;
    ensureState();
    if (!rafId) rafId = window.requestAnimationFrame(frame);
  }

  function destroy() {
    running = false;
    if (rafId) window.cancelAnimationFrame(rafId);
    rafId = 0;
    unregisterVisualTransition?.();
    unregisterVisualTransition = null;
    visualTransition.destroy?.();
    canvas.removeEventListener('pointerenter', updatePointer);
    canvas.removeEventListener('pointermove', updatePointer);
    canvas.removeEventListener('pointerleave', handlePointerLeave);
    canvas.removeEventListener('pointercancel', handlePointerLeave);
  }

  function resetSeed(seed) {
    const parsed = Number.parseInt(seed, 10);
    currentSeed = Number.isFinite(parsed) ? parsed >>> 0 : createRandomSeed();
    state = null;
    start();
  }

  return {
    start,
    destroy,
    renderOnce: () => draw(performance.now()),
    resetSeed,
    getMetrics: () => lastMetrics,
  };
}
