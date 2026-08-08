const createFrozenProfile = (values) => Object.freeze({ ...values });

const DEFAULT_MACRO_PROFILE = createFrozenProfile({
  keyLevel: 1,
  keyReach: 1,
  ambientLevel: 1,
  ambientReach: 1,
  rimBounceLevel: 1,
  rimBounceReach: 1,
  shadowDepth: 1,
  shadowArea: 1,
});

export const SIMULATION_BODY_MATERIAL_PROFILE_KEYS = Object.freeze(
  Object.keys(DEFAULT_MACRO_PROFILE),
);

export const SIMULATION_BODY_MATERIAL_REFERENCE_PROFILES = Object.freeze({
  light: createFrozenProfile({
    keyStrength: 0.54,
    keyX: -0.38,
    keyY: -0.5,
    keySpread: 0.75,
    matteRolloff: 1,
    ambientStrength: 0.5,
    ambientCoverage: 0.65,
    skyFillStrength: 0.54,
    horizonFillStrength: 0.69,
    fillStrength: 0.63,
    terminatorStrength: 0.54,
    reflectionBandStrength: 1.2,
    surfaceTooth: 0.36,
    rimLightStrength: 1.01,
    rimWidth: 0.59,
    bounceStrength: 1.2,
    edgeShadowStrength: 0.25,
    shadowStrength: 0.32,
    contrast: 0.42,
    highlightVibrance: 0.82,
    shadowVibrance: 0.92,
    temperature: 0.1,
  }),
  dark: createFrozenProfile({
    keyStrength: 0.78,
    keyX: -0.38,
    keyY: -0.5,
    keySpread: 0.46,
    matteRolloff: 0.68,
    ambientStrength: 0.2,
    ambientCoverage: 0.44,
    skyFillStrength: 0.18,
    horizonFillStrength: 0.08,
    fillStrength: 0.12,
    terminatorStrength: 0.62,
    reflectionBandStrength: 0.08,
    surfaceTooth: 0.22,
    rimLightStrength: 0.2,
    rimWidth: 0.28,
    bounceStrength: 0.14,
    edgeShadowStrength: 0.84,
    shadowStrength: 0.96,
    contrast: 0.62,
    highlightVibrance: 0.84,
    shadowVibrance: 1.05,
    temperature: -0.08,
  }),
});

export const DEFAULT_SIMULATION_BODY_MATERIAL_CONFIG = Object.freeze({
  enabled: false,
  cacheDetailPx: 24,
  light: DEFAULT_MACRO_PROFILE,
  dark: DEFAULT_MACRO_PROFILE,
});

export const SIMULATION_BODY_MATERIAL_CACHE_DETAIL_OPTIONS = Object.freeze([24, 32, 48]);
export const SIMULATION_BODY_MATERIAL_CACHE_DEBOUNCE_MS = 36;

export const SIMULATION_BODY_MATERIAL_CONTROL_GROUPS = Object.freeze([
  Object.freeze({
    title: 'Material',
    scope: 'common',
    initiallyOpen: true,
    controls: Object.freeze([
      { id: 'enabled', label: 'Sphere Effects', type: 'checkbox' },
      {
        id: 'cacheDetailPx',
        label: 'Cache Detail',
        type: 'select',
        options: SIMULATION_BODY_MATERIAL_CACHE_DETAIL_OPTIONS,
      },
    ]),
  }),
  Object.freeze({
    title: 'Lighting',
    scope: 'themeProfile',
    initiallyOpen: true,
    controls: Object.freeze([
      { id: 'keyLevel', label: 'Key Strength', type: 'range', min: 0, max: 1.5, step: 0.01 },
      { id: 'keyReach', label: 'Key Reach', type: 'range', min: 0.5, max: 1.5, step: 0.01 },
      { id: 'ambientLevel', label: 'Ambient Strength', type: 'range', min: 0, max: 1.5, step: 0.01 },
      { id: 'ambientReach', label: 'Ambient Reach', type: 'range', min: 0.5, max: 1.5, step: 0.01 },
      { id: 'rimBounceLevel', label: 'Rim + Bounce', type: 'range', min: 0, max: 1.5, step: 0.01 },
      { id: 'rimBounceReach', label: 'Rim Reach', type: 'range', min: 0.5, max: 1.5, step: 0.01 },
      { id: 'shadowDepth', label: 'Shadow Depth', type: 'range', min: 0, max: 1.5, step: 0.01 },
      { id: 'shadowArea', label: 'Shadow Area', type: 'range', min: 0.5, max: 1.5, step: 0.01 },
    ]),
  }),
]);

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.min(max, Math.max(min, numeric)) : fallback;
}

function normalizeProfile(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    keyLevel: clampNumber(source.keyLevel, 0, 1.5, 1),
    keyReach: clampNumber(source.keyReach, 0.5, 1.5, 1),
    ambientLevel: clampNumber(source.ambientLevel, 0, 1.5, 1),
    ambientReach: clampNumber(source.ambientReach, 0.5, 1.5, 1),
    rimBounceLevel: clampNumber(source.rimBounceLevel, 0, 1.5, 1),
    rimBounceReach: clampNumber(source.rimBounceReach, 0.5, 1.5, 1),
    shadowDepth: clampNumber(source.shadowDepth, 0, 1.5, 1),
    shadowArea: clampNumber(source.shadowArea, 0.5, 1.5, 1),
  };
}
export function normalizeSimulationBodyMaterialConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const requestedDetail = Number(source.cacheDetailPx ?? source.spriteDetail);
  const cacheDetailPx = SIMULATION_BODY_MATERIAL_CACHE_DETAIL_OPTIONS.includes(requestedDetail)
    ? requestedDetail
    : DEFAULT_SIMULATION_BODY_MATERIAL_CONFIG.cacheDetailPx;
  const enabled = source.enabled ?? source.effectsEnabled
    ?? DEFAULT_SIMULATION_BODY_MATERIAL_CONFIG.enabled;
  return {
    enabled: enabled === true,
    cacheDetailPx,
    light: normalizeProfile(source.light || source.profiles?.light),
    dark: normalizeProfile(source.dark || source.profiles?.dark),
  };
}

export function resolveSimulationBodyMaterialThemeProfile(config, theme = 'light') {
  const normalized = normalizeSimulationBodyMaterialConfig(config);
  const themeId = theme === 'dark' ? 'dark' : 'light';
  const macro = normalized[themeId];
  const reference = SIMULATION_BODY_MATERIAL_REFERENCE_PROFILES[themeId];
  const reachDelta = macro.keyReach - 1;
  const ambientReachDelta = macro.ambientReach - 1;
  const rimReachDelta = macro.rimBounceReach - 1;
  const shadowAreaDelta = macro.shadowArea - 1;
  const clamp01 = (value) => Math.min(1, Math.max(0, value));
  return {
    ...reference,
    keyStrength: reference.keyStrength * macro.keyLevel,
    keySpread: Math.max(0.05, reference.keySpread * macro.keyReach),
    matteRolloff: clamp01(reference.matteRolloff + reachDelta * 0.42),
    ambientStrength: reference.ambientStrength * macro.ambientLevel,
    ambientCoverage: clamp01(reference.ambientCoverage + ambientReachDelta * 0.42),
    skyFillStrength: reference.skyFillStrength * macro.ambientLevel,
    horizonFillStrength: reference.horizonFillStrength * macro.ambientLevel,
    fillStrength: reference.fillStrength * macro.ambientLevel,
    reflectionBandStrength: reference.reflectionBandStrength * macro.ambientLevel,
    ambientReach: macro.ambientReach,
    rimLightStrength: reference.rimLightStrength * macro.rimBounceLevel,
    rimWidth: clamp01(reference.rimWidth + rimReachDelta * 0.46),
    bounceStrength: reference.bounceStrength * macro.rimBounceLevel,
    bounceReach: macro.rimBounceReach,
    edgeShadowStrength: reference.edgeShadowStrength * macro.shadowDepth,
    shadowStrength: reference.shadowStrength * macro.shadowDepth,
    terminatorStrength: reference.terminatorStrength * macro.shadowDepth,
    shadowArea: Math.max(0.5, Math.min(1.5, macro.shadowArea)),
    shadowAreaBias: shadowAreaDelta,
    macro,
    theme: themeId,
    enabled: normalized.enabled,
    cacheDetailPx: normalized.cacheDetailPx,
  };
}
