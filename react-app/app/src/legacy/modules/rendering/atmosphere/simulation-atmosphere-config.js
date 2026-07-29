const createProfile = (values) => Object.freeze(values);

const LIGHT_PROFILE = createProfile({
  intensity: 0.34,
  colourStrength: 1.1,
});

const DARK_PROFILE = createProfile({
  intensity: 0.52,
  colourStrength: 1.25,
});

export const DEFAULT_SIMULATION_ATMOSPHERE_CONFIG = Object.freeze({
  enabled: true,
  spread: 0.15,
  contentClearance: 0.5,
  edgeStrength: 0.35,
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
      { id: 'intensity', label: 'Intensity', type: 'range', min: 0, max: 0.8, step: 0.01, display: 'percent' },
      { id: 'colourStrength', label: 'Colour', type: 'range', min: 0, max: 1.6, step: 0.02, display: 'percent' },
    ]),
  }),
  Object.freeze({
    title: 'Field',
    initiallyOpen: true,
    scope: 'common',
    controls: Object.freeze([
      { id: 'spread', label: 'Spread', type: 'range', min: 0.06, max: 0.2, step: 0.005, display: 'percent' },
      { id: 'contentClearance', label: 'Clearance', type: 'range', min: 0, max: 1, step: 0.01, display: 'percent' },
      { id: 'edgeStrength', label: 'Edge', type: 'range', min: 0, max: 1.5, step: 0.05, display: 'percent' },
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
    intensity: clampNumber(source.intensity, 0, 0.8, defaults.intensity),
    colourStrength: clampNumber(source.colourStrength, 0, 1.6, defaults.colourStrength),
  };
}

export function normalizeSimulationAtmosphereConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    enabled: source.enabled !== false,
    spread: clampNumber(source.spread, 0.06, 0.2, DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.spread),
    contentClearance: clampNumber(
      source.contentClearance,
      0,
      1,
      DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.contentClearance,
    ),
    edgeStrength: clampNumber(
      source.edgeStrength,
      0,
      1.5,
      DEFAULT_SIMULATION_ATMOSPHERE_CONFIG.edgeStrength,
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
    spread: normalized.spread,
    contentClearance: normalized.contentClearance,
    edgeStrength: normalized.edgeStrength,
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

export function resolveSimulationAtmosphereCadence(cadenceMode = 'auto') {
  if (['60', '30', '20'].includes(String(cadenceMode))) return Number(cadenceMode);
  if (cadenceMode !== 'auto') return 30;
  return 30;
}
