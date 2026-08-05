const createProfile = (values) => Object.freeze(values);
const GLOW_RADIUS_MIN_CSS_PX = 36;
const GLOW_RADIUS_MAX_CSS_PX = 180;
const SMALL_GLOW_RADIUS_MIN_CSS_PX = 12;
const SMALL_GLOW_RADIUS_MAX_CSS_PX = 72;

const LIGHT_PROFILE = createProfile({
  intensity: 0.42,
  colourStrength: 1.3,
});

const DARK_PROFILE = createProfile({
  intensity: 0.56,
  colourStrength: 1.35,
});

export const DEFAULT_SIMULATION_ATMOSPHERE_CADENCE_FPS = 24;

export const DEFAULT_SIMULATION_ATMOSPHERE_CONFIG = Object.freeze({
  enabled: true,
  lowQualityMode: 'canvas',
  largeSpread: 0.15,
  smallSpread: 0.051,
  memoryMs: 100,
  edgeStrength: 0.35,
  edgeWidthPx: 1.5,
  edgeInsetPx: 0,
  light: LIGHT_PROFILE,
  dark: DARK_PROFILE,
});

export const SIMULATION_ATMOSPHERE_CONTROL_GROUPS = Object.freeze([
  Object.freeze({
    title: 'Material',
    initiallyOpen: true,
    scope: 'themeProfile',
    controls: Object.freeze([
      { id: 'enabled', label: 'Enabled', type: 'checkbox', scope: 'common' },
      {
        id: 'lowQualityMode',
        label: 'Low-quality mode',
        type: 'select',
        options: ['canvas', 'css-static'],
        scope: 'common',
      },
      { id: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 1, step: 0.01, display: 'percent' },
      { id: 'colourStrength', label: 'Colour', type: 'range', min: 0, max: 1.6, step: 0.02, display: 'percent' },
    ]),
  }),
  Object.freeze({
    title: 'Field',
    initiallyOpen: true,
    scope: 'common',
    controls: Object.freeze([
      { id: 'largeSpread', label: 'Large Spread', type: 'range', min: 0.06, max: 0.2, step: 0.005, display: 'percent' },
      { id: 'smallSpread', label: 'Small Spread', type: 'range', min: 0.02, max: 0.1, step: 0.001, display: 'percent' },
      { id: 'memoryMs', label: 'Memory', type: 'range', min: 0, max: 600, step: 25, display: 'ms' },
      { id: 'edgeStrength', label: 'Edge', type: 'range', min: 0, max: 1.5, step: 0.05, display: 'percent' },
      { id: 'edgeWidthPx', label: 'Thickness', type: 'range', min: 0.5, max: 4, step: 0.25, display: 'subpx' },
      { id: 'edgeInsetPx', label: 'Inset', type: 'range', min: 0, max: 24, step: 1, display: 'px' },
    ]),
  }),
]);

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function normalizeThemeProfile(profile, defaults) {
  const source = profile && typeof profile === 'object' ? profile : {};
  return {
    intensity: clampNumber(source.intensity, 0, 1, defaults.intensity),
    colourStrength: clampNumber(source.colourStrength, 0, 1.6, defaults.colourStrength),
  };
}

function normalizeLowQualityMode(value) {
  return ['canvas', 'css-static'].includes(String(value)) ? String(value) : 'canvas';
}

export function normalizeSimulationAtmosphereConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const largeSpread = clampNumber(
    source.largeSpread ?? source.spread,
    0.06,
    0.2,
    DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.largeSpread,
  );
  const legacySmallSpread = clampNumber(
    largeSpread * 0.34,
    0.02,
    0.1,
    DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.smallSpread,
  );
  return {
    enabled: source.enabled !== false,
    lowQualityMode: normalizeLowQualityMode(source.lowQualityMode),
    largeSpread,
    smallSpread: clampNumber(source.smallSpread, 0.02, 0.1, legacySmallSpread),
    memoryMs: clampNumber(
      source.memoryMs,
      0,
      600,
      DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.memoryMs,
    ),
    edgeStrength: clampNumber(
      source.edgeStrength,
      0,
      1.5,
      DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.edgeStrength,
    ),
    edgeWidthPx: clampNumber(
      source.edgeWidthPx,
      0.5,
      4,
      DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.edgeWidthPx,
    ),
    edgeInsetPx: clampNumber(
      source.edgeInsetPx,
      0,
      24,
      DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.edgeInsetPx,
    ),
    light: normalizeThemeProfile(source.light, DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.light),
    dark: normalizeThemeProfile(source.dark, DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.dark),
  };
}

export function resolveSimulationAtmosphereThemeProfile(config, theme = 'light') {
  const normalized = normalizeSimulationAtmosphereConfig(config);
  return normalized[theme === 'dark' ? 'dark' : 'light'];
}

export function resolveSimulationAtmosphereRenderProfile(config, theme = 'light') {
  const normalized = normalizeSimulationAtmosphereConfig(config);
  const visual = normalized[theme === 'dark' ? 'dark' : 'light'];
  return {
    enabled: normalized.enabled,
    lowQualityMode: normalized.lowQualityMode,
    largeSpread: normalized.largeSpread,
    smallSpread: normalized.smallSpread,
    memoryMs: normalized.memoryMs,
    edgeStrength: normalized.edgeStrength,
    edgeWidthPx: normalized.edgeWidthPx,
    edgeInsetPx: normalized.edgeInsetPx,
    intensity: visual.intensity,
    colourStrength: visual.colourStrength,
  };
}

export function resolveSimulationAtmosphereQualityScale(qualityMode = 'auto') {
  let resolved = qualityMode;
  if (resolved === 'auto') {
    const constrainedCpu = Number(globalThis.navigator?.hardwareConcurrency || 8) <= 4;
    const coarse = globalThis.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches === true;
    const narrow = Number(globalThis.innerWidth || 1440) < 760;
    const short = Number(globalThis.innerHeight || 900) < 560;
    resolved = constrainedCpu || coarse || narrow || short ? 'low' : 'balanced';
  }
  if (resolved === 'high') return { id: 'high', scale: 0.5 };
  if (resolved === 'low') return { id: 'low', scale: 0.25 };
  return { id: 'balanced', scale: 0.375 };
}

export function resolveSimulationAtmosphereBlurGeometry({
  widthCss,
  heightCss,
  backingWidth,
  backingHeight,
  largeSpread,
  smallSpread,
} = {}) {
  const width = Math.max(1, Number(widthCss) || 1);
  const height = Math.max(1, Number(heightCss) || 1);
  const shortestSide = Math.min(width, height);
  const largeRadiusCss = Math.max(
    GLOW_RADIUS_MIN_CSS_PX,
    Math.min(GLOW_RADIUS_MAX_CSS_PX, shortestSide * (Number(largeSpread) || 0)),
  );
  const smallRadiusCss = Math.max(
    SMALL_GLOW_RADIUS_MIN_CSS_PX,
    Math.min(SMALL_GLOW_RADIUS_MAX_CSS_PX, shortestSide * (Number(smallSpread) || 0)),
  );
  const backingScaleX = Math.max(1, Number(backingWidth) || 1) / width;
  const backingScaleY = Math.max(1, Number(backingHeight) || 1) / height;
  const backingScale = Math.sqrt(backingScaleX * backingScaleY);
  return {
    largeRadiusCss,
    smallRadiusCss,
    largeResponsiveScale: largeRadiusCss / shortestSide,
    smallResponsiveScale: smallRadiusCss / shortestSide,
    largeRadiusBackingPx: largeRadiusCss * backingScale,
    smallRadiusBackingPx: smallRadiusCss * backingScale,
  };
}

export function resolveSimulationAtmosphereCadence(cadenceMode = 'auto') {
  if (['60', '30', '24', '20'].includes(String(cadenceMode))) return Number(cadenceMode);
  return DEFAULT_SIMULATION_ATMOSPHERE_CADENCE_FPS;
}

/** Keep a target deadline so display-frame rounding cannot alias the glow cadence. */
export function shouldRenderSimulationAtmosphereFrame(schedule, nowMs, cadenceFps) {
  const now = Number(nowMs) || 0;
  const interval = 1000 / Math.max(
    1,
    Number(cadenceFps) || DEFAULT_SIMULATION_ATMOSPHERE_CADENCE_FPS,
  );
  const tolerance = Math.min(2, interval * 0.2);
  const deadline = Number(schedule?.nextFrameAt) || 0;
  if (deadline > 0 && now + tolerance < deadline) return false;

  let nextFrameAt = deadline > 0 ? deadline + interval : now + interval;
  if (nextFrameAt < now) nextFrameAt = now + interval;
  schedule.nextFrameAt = nextFrameAt;
  return true;
}
