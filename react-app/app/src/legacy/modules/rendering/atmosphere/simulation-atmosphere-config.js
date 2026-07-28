const createProfile = (values) => Object.freeze(values);

const LIGHT_PROFILE = createProfile({
  ballPresence: 0.95,
  glowAmount: 0.83,
  glowRadiusFxPx: 78,
  colourStrength: 1.5,
  glowBlendMode: 'add',
  hazeStrength: 1,
  grainStrength: 1,
  afterglowHalfLifeMs: 700,
  driftSpeedPxPerSec: 5.75,
  titleClearance: 0.49,
  edgeLight: 1.4,
  edgeWidthPx: 1.25,
});

const DARK_PROFILE = createProfile({
  ballPresence: 1,
  glowAmount: 0.36,
  glowRadiusFxPx: 80,
  colourStrength: 1.5,
  glowBlendMode: 'normal',
  hazeStrength: 2,
  grainStrength: 2,
  afterglowHalfLifeMs: 2000,
  driftSpeedPxPerSec: 8,
  titleClearance: 0.75,
  edgeLight: 2.5,
  edgeWidthPx: 2,
});

export const DEFAULT_SIMULATION_ATMOSPHERE_CONFIG = Object.freeze({
  enabled: true,
  qualityMode: 'auto',
  hazeCadence: 'auto',
  glowHoldMs: 2000,
  glowFadeOutMs: 3000,
  light: LIGHT_PROFILE,
  dark: DARK_PROFILE,
});

export const DEFAULT_SIMULATION_ATMOSPHERE_TITLE_Y_OFFSET_VH = 0;

const PERFORMANCE_CONTROLS = Object.freeze({
  title: 'Performance',
  initiallyOpen: true,
  scope: 'common',
  controls: Object.freeze([
    { id: 'qualityMode', label: 'Quality', type: 'select', options: ['auto', 'high', 'balanced', 'low'] },
    { id: 'hazeCadence', label: 'Atmosphere FPS', type: 'select', options: ['auto', '60', '30', '20'] },
  ]),
});

export const SIMULATION_ATMOSPHERE_CONTROL_GROUPS = Object.freeze([
  Object.freeze({
    title: 'Material',
    initiallyOpen: true,
    scope: 'themeProfile',
    controls: Object.freeze([
      { id: 'enabled', label: 'Enabled', type: 'checkbox', scope: 'common' },
      { id: 'ballPresence', label: 'Balls', type: 'range', min: 0, max: 1, step: 0.01, display: 'percent' },
      { id: 'glowAmount', label: 'Atmosphere', type: 'range', min: 0, max: 2, step: 0.01, display: 'percent' },
      { id: 'glowRadiusFxPx', label: 'Radius', type: 'range', min: 0, max: 420, step: 2, display: 'px' },
      { id: 'colourStrength', label: 'Colour', type: 'range', min: 0, max: 3, step: 0.05 },
      { id: 'glowBlendMode', label: 'Blend', type: 'select', options: ['normal', 'screen', 'add'] },
    ]),
  }),
  Object.freeze({
    title: 'Environment',
    initiallyOpen: true,
    scope: 'themeProfile',
    controls: Object.freeze([
      { id: 'edgeLight', label: 'Edge Strength', type: 'range', min: 0, max: 5, step: 0.05, display: 'percent' },
      { id: 'edgeWidthPx', label: 'Edge Width', type: 'range', min: 0, max: 8, step: 0.25, display: 'subpx' },
      { id: 'hazeStrength', label: 'Haze', type: 'range', min: 0, max: 4, step: 0.01, display: 'percent' },
      { id: 'grainStrength', label: 'Grain', type: 'range', min: 0, max: 4, step: 0.01, display: 'percent' },
    ]),
  }),
  Object.freeze({
    title: 'Title',
    initiallyOpen: true,
    scope: 'themeProfile',
    controls: Object.freeze([
      { id: 'titleClearance', label: 'Legibility', type: 'range', min: 0, max: 1, step: 0.01, display: 'percent' },
      { id: 'titleYOffsetVh', label: 'Title Y', type: 'range', min: -24, max: 24, step: 0.25, display: 'vh', scope: 'common' },
    ]),
  }),
  Object.freeze({
    title: 'Motion',
    initiallyOpen: true,
    scope: 'themeProfile',
    controls: Object.freeze([
      { id: 'glowHoldMs', label: 'Glow Hold', type: 'range', min: 0, max: 10000, step: 250, display: 'ms', scope: 'common' },
      { id: 'glowFadeOutMs', label: 'Glow Fade', type: 'range', min: 0, max: 10000, step: 250, display: 'ms', scope: 'common' },
      { id: 'afterglowHalfLifeMs', label: 'Memory', type: 'range', min: 0, max: 6000, step: 25, display: 'ms' },
      { id: 'driftSpeedPxPerSec', label: 'Drift', type: 'range', min: 0, max: 60, step: 0.25, display: 'pxs' },
    ]),
  }),
  PERFORMANCE_CONTROLS,
]);

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function normalizeChoice(value, choices, fallback) {
  const normalized = String(value ?? '');
  return choices.includes(normalized) ? normalized : fallback;
}

function normalizeThemeProfile(profile, defaults) {
  const source = profile && typeof profile === 'object' ? profile : {};
  return {
    ballPresence: clampNumber(source.ballPresence, 0, 1, defaults.ballPresence),
    glowAmount: clampNumber(source.glowAmount, 0, 2, defaults.glowAmount),
    glowRadiusFxPx: clampNumber(source.glowRadiusFxPx, 0, 420, defaults.glowRadiusFxPx),
    colourStrength: clampNumber(source.colourStrength, 0, 3, defaults.colourStrength),
    glowBlendMode: normalizeChoice(source.glowBlendMode, ['normal', 'screen', 'add'], defaults.glowBlendMode),
    hazeStrength: clampNumber(source.hazeStrength, 0, 4, defaults.hazeStrength),
    grainStrength: clampNumber(source.grainStrength, 0, 4, defaults.grainStrength),
    afterglowHalfLifeMs: clampNumber(source.afterglowHalfLifeMs, 0, 6000, defaults.afterglowHalfLifeMs),
    driftSpeedPxPerSec: clampNumber(source.driftSpeedPxPerSec, 0, 60, defaults.driftSpeedPxPerSec),
    titleClearance: clampNumber(source.titleClearance, 0, 1, defaults.titleClearance),
    edgeLight: clampNumber(source.edgeLight, 0, 5, defaults.edgeLight),
    edgeWidthPx: clampNumber(source.edgeWidthPx, 0, 8, defaults.edgeWidthPx),
  };
}

export function normalizeSimulationAtmosphereConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    enabled: source.enabled !== false,
    qualityMode: normalizeChoice(
      source.qualityMode,
      ['auto', 'high', 'balanced', 'low'],
      DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.qualityMode,
    ),
    hazeCadence: normalizeChoice(
      source.hazeCadence,
      ['auto', '60', '30', '20'],
      DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.hazeCadence,
    ),
    glowHoldMs: clampNumber(
      source.glowHoldMs,
      0,
      10000,
      DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.glowHoldMs,
    ),
    glowFadeOutMs: clampNumber(
      source.glowFadeOutMs,
      0,
      10000,
      DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.glowFadeOutMs,
    ),
    light: normalizeThemeProfile(source.light, DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.light),
    dark: normalizeThemeProfile(source.dark, DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.dark),
  };
}

export function normalizeSimulationAtmosphereTitleYOffsetVh(value) {
  return clampNumber(
    value,
    -24,
    24,
    DEFAULT_SIMULATION_ATMOSPHERE_TITLE_Y_OFFSET_VH,
  );
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
    qualityMode: normalized.qualityMode,
    hazeCadence: normalized.hazeCadence,
    glowHoldMs: normalized.glowHoldMs,
    glowFadeOutMs: normalized.glowFadeOutMs,
    emissionGain: 1,
    fogDensity: visual.glowAmount,
    haloSpread: 1,
    accentLift: visual.colourStrength,
    particlesPerBall: 1,
    particleSpread: 0,
    particleSize: 0.5,
    particleEnergy: 0,
    bodyEnergy: 0.9,
    bodySize: 6,
    lightSoftness: 1,
    lightDefinition: 0,
    particleShimmer: 0,
    afterglowHalfLifeMs: visual.afterglowHalfLifeMs,
    driftSpeedPxPerSec: visual.driftSpeedPxPerSec,
    turbulence: 0.04,
    titleClearance: visual.titleClearance,
    edgeLight: visual.edgeLight,
    edgeWidthPx: visual.edgeWidthPx,
    ballPresence: visual.ballPresence,
    hazeStrength: visual.hazeStrength,
    grainStrength: visual.grainStrength,
    blurRadiusFxPx: visual.glowRadiusFxPx,
    diffusionPasses: 2,
    sourceGain: 0.64,
    blendMode: visual.glowBlendMode,
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

export function resolveSimulationAtmosphereCadence(hazeCadence = 'auto') {
  if (['60', '30', '20'].includes(String(hazeCadence))) return Number(hazeCadence);
  if (hazeCadence !== 'auto') return 30;
  const coarse = globalThis.matchMedia?.('(hover: none) and (pointer: coarse)')?.matches === true;
  const compact = Number(globalThis.innerWidth || 1440) < 760
    || Number(globalThis.innerHeight || 900) < 560;
  return coarse || compact ? 20 : 30;
}
