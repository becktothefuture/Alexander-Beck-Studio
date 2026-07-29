import {
  SIMULATION_ATMOSPHERE_CONTROL_GROUPS,
  resolveSimulationAtmosphereRenderProfile,
} from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere-config.js';

export { ATMOSPHERE_LAB_VARIANTS } from './atmosphereLabRoutes.js';
export {
  DEFAULT_SIMULATION_ATMOSPHERE_CONFIG,
  SIMULATION_ATMOSPHERE_CONTROL_GROUPS,
  normalizeSimulationAtmosphereConfig,
  resolveSimulationAtmosphereCadence as resolveAtmosphereCadence,
  resolveSimulationAtmosphereQualityScale as resolveAtmosphereQualityScale,
  resolveSimulationAtmosphereThemeProfile,
} from '../../legacy/modules/rendering/atmosphere/simulation-atmosphere-config.js';

const createProfile = (values) => Object.freeze(values);

export const DEFAULT_ATMOSPHERE_LAB_CONFIG = Object.freeze({
  version: 10,
  common: Object.freeze({
    enabled: true,
    qualityMode: 'auto',
    hazeCadence: 'auto',
  }),
  profiles: Object.freeze({
    webglPost: createProfile({
      emissionGain: 1.8,
      fogDensity: 0.9,
      haloSpread: 2.5,
      accentLift: 1.25,
      particlesPerBall: 6,
      particleSpread: 5,
      particleSize: 0.8,
      particleEnergy: 0.35,
      bodyEnergy: 0.9,
      bodySize: 4.8,
      lightSoftness: 0.86,
      lightDefinition: 0.48,
      particleShimmer: 0.14,
      afterglowHalfLifeMs: 1200,
      driftSpeedPxPerSec: 3.5,
      turbulence: 0.28,
      titleClearance: 0.58,
      bloomLevels: 3,
      emissionThreshold: 0.02,
      extinction: 0.36,
      whitePoint: 0.65,
      colourSeparation: 1.3,
      opacityCeiling: 0.78,
    }),
    density: createProfile({
      emissionGain: 1.3,
      fogDensity: 0.67,
      haloSpread: 1.15,
      accentLift: 1.4,
      particlesPerBall: 14,
      particleSpread: 1,
      particleSize: 0.75,
      particleEnergy: 0.32,
      bodyEnergy: 0.86,
      bodySize: 4.4,
      lightSoftness: 0.86,
      lightDefinition: 0.46,
      particleShimmer: 0.1,
      afterglowHalfLifeMs: 250,
      driftSpeedPxPerSec: 23.5,
      turbulence: 0.4,
      titleClearance: 0.35,
      densityCurve: 1.09,
      whitePoint: 0.55,
      colourSeparation: 2,
      opacityCeiling: 0.95,
    }),
    canvasFeedback: createProfile({
      emissionGain: 2,
      fogDensity: 0.4,
      haloSpread: 0.95,
      accentLift: 1.5,
      particlesPerBall: 2,
      particleSpread: 1.4,
      particleSize: 1.25,
      particleEnergy: 0.27,
      bodyEnergy: 0.9,
      bodySize: 6,
      lightSoftness: 0.9,
      lightDefinition: 0.46,
      particleShimmer: 0.15,
      afterglowHalfLifeMs: 1500,
      driftSpeedPxPerSec: 40,
      turbulence: 1,
      titleClearance: 0.37,
      blurRadiusFxPx: 23,
      diffusionPasses: 1,
      sourceGain: 0.48,
      blendMode: 'add',
    }),
  }),
});

const COMMON_GROUPS = Object.freeze([
  {
    title: 'Material',
    initiallyOpen: true,
    scope: 'profile',
    controls: [
      { id: 'enabled', label: 'Atmosphere', type: 'checkbox', scope: 'common' },
      { id: 'emissionGain', label: 'Emission', type: 'range', min: 0.25, max: 2, step: 0.05 },
      { id: 'fogDensity', label: 'Fog Density', type: 'range', min: 0, max: 1.2, step: 0.01 },
      { id: 'haloSpread', label: 'Halo Spread', type: 'range', min: 0.5, max: 3, step: 0.05 },
      { id: 'accentLift', label: 'Colour Lift', type: 'range', min: 0, max: 1.5, step: 0.05 },
    ],
  },
  {
    title: 'Particle Lights',
    initiallyOpen: true,
    scope: 'profile',
    controls: [
      { id: 'particlesPerBall', label: 'Lights / Ball', type: 'range', min: 2, max: 16, step: 1, display: 'integer' },
      { id: 'particleSpread', label: 'Cloud Radius', type: 'range', min: 1, max: 10, step: 0.1 },
      { id: 'particleSize', label: 'Light Size', type: 'range', min: 0.3, max: 2.5, step: 0.05 },
      { id: 'particleEnergy', label: 'Light Energy', type: 'range', min: 0.05, max: 1, step: 0.01 },
      { id: 'bodyEnergy', label: 'Colour Body', type: 'range', min: 0, max: 1, step: 0.01, display: 'percent' },
      { id: 'bodySize', label: 'Body Size', type: 'range', min: 0.75, max: 6, step: 0.05 },
      { id: 'lightSoftness', label: 'Softness', type: 'range', min: 0.2, max: 1, step: 0.01, display: 'percent' },
      { id: 'lightDefinition', label: 'Light Presence', type: 'range', min: 0, max: 0.75, step: 0.01, display: 'percent' },
      { id: 'particleShimmer', label: 'Shimmer', type: 'range', min: 0, max: 0.6, step: 0.01, display: 'percent' },
    ],
  },
  {
    title: 'Memory + Air',
    initiallyOpen: true,
    scope: 'profile',
    controls: [
      { id: 'afterglowHalfLifeMs', label: 'Afterglow', type: 'range', min: 0, max: 2000, step: 25, display: 'ms' },
      { id: 'driftSpeedPxPerSec', label: 'Fog Drift', type: 'range', min: 0, max: 40, step: 0.5, display: 'pxs' },
      { id: 'turbulence', label: 'Turbulence', type: 'range', min: 0, max: 1, step: 0.01, display: 'percent' },
      { id: 'titleClearance', label: 'Title Air', type: 'range', min: 0, max: 0.75, step: 0.01, display: 'percent' },
    ],
  },
  {
    title: 'Performance',
    initiallyOpen: true,
    scope: 'common',
    controls: [
      { id: 'qualityMode', label: 'Quality', type: 'select', options: ['auto', 'high', 'balanced', 'low'] },
      { id: 'hazeCadence', label: 'Haze FPS', type: 'select', options: ['auto', '60', '30', '20'] },
    ],
  },
]);

const WEBGL_TONE_CONTROLS = Object.freeze([
  { id: 'whitePoint', label: 'Highlight Roll-off', type: 'range', min: 0.55, max: 2.5, step: 0.05 },
  { id: 'colourSeparation', label: 'Colour Separation', type: 'range', min: 0, max: 2, step: 0.05 },
  { id: 'opacityCeiling', label: 'Fog Ceiling', type: 'range', min: 0.2, max: 0.95, step: 0.01, display: 'percent' },
]);

const PROFILE_GROUPS = Object.freeze({
  webglPost: Object.freeze({
    title: 'Post Process',
    initiallyOpen: true,
    scope: 'profile',
    controls: [
      { id: 'bloomLevels', label: 'Bloom Taps', type: 'range', min: 1, max: 4, step: 1, display: 'integer' },
      { id: 'emissionThreshold', label: 'Threshold', type: 'range', min: 0, max: 0.6, step: 0.01 },
      { id: 'extinction', label: 'Extinction', type: 'range', min: 0, max: 1, step: 0.01, display: 'percent' },
      ...WEBGL_TONE_CONTROLS,
    ],
  }),
  density: Object.freeze({
    title: 'Density Field',
    initiallyOpen: true,
    scope: 'profile',
    controls: [
      { id: 'densityCurve', label: 'Density Curve', type: 'range', min: 0.35, max: 2, step: 0.01 },
      ...WEBGL_TONE_CONTROLS,
    ],
  }),
  canvasFeedback: Object.freeze({
    title: 'Canvas Diffusion',
    initiallyOpen: true,
    scope: 'profile',
    controls: [
      { id: 'blurRadiusFxPx', label: 'Blur Radius', type: 'range', min: 4, max: 36, step: 1, display: 'px' },
      { id: 'diffusionPasses', label: 'Diffusion', type: 'range', min: 1, max: 4, step: 1, display: 'integer' },
      { id: 'sourceGain', label: 'Source Energy', type: 'range', min: 0.05, max: 0.8, step: 0.01 },
      { id: 'blendMode', label: 'Blend', type: 'select', options: ['normal', 'screen', 'add'] },
    ],
  }),
});

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

function normalizeChoice(value, choices, fallback) {
  const normalized = String(value ?? '');
  return choices.includes(normalized) ? normalized : fallback;
}

function profileValue(profile, legacyCommon, key) {
  return profile?.[key] ?? legacyCommon?.[key];
}

function normalizeBaseProfile(profile, legacyCommon, defaults) {
  return {
    emissionGain: clampNumber(profileValue(profile, legacyCommon, 'emissionGain'), 0.25, 2, defaults.emissionGain),
    fogDensity: clampNumber(profileValue(profile, legacyCommon, 'fogDensity'), 0, 1.2, defaults.fogDensity),
    haloSpread: clampNumber(profileValue(profile, legacyCommon, 'haloSpread'), 0.5, 3, defaults.haloSpread),
    accentLift: clampNumber(profileValue(profile, legacyCommon, 'accentLift'), 0, 1.5, defaults.accentLift),
    particlesPerBall: Math.round(clampNumber(profileValue(profile, legacyCommon, 'particlesPerBall'), 2, 16, defaults.particlesPerBall)),
    particleSpread: clampNumber(profileValue(profile, legacyCommon, 'particleSpread'), 1, 10, defaults.particleSpread),
    particleSize: clampNumber(profileValue(profile, legacyCommon, 'particleSize'), 0.3, 2.5, defaults.particleSize),
    particleEnergy: clampNumber(profileValue(profile, legacyCommon, 'particleEnergy'), 0.05, 1, defaults.particleEnergy),
    bodyEnergy: clampNumber(profileValue(profile, legacyCommon, 'bodyEnergy'), 0, 1, defaults.bodyEnergy),
    bodySize: clampNumber(profileValue(profile, legacyCommon, 'bodySize'), 0.75, 6, defaults.bodySize),
    lightSoftness: clampNumber(profileValue(profile, legacyCommon, 'lightSoftness'), 0.2, 1, defaults.lightSoftness),
    lightDefinition: clampNumber(profileValue(profile, legacyCommon, 'lightDefinition'), 0, 0.75, defaults.lightDefinition),
    particleShimmer: clampNumber(profileValue(profile, legacyCommon, 'particleShimmer'), 0, 0.6, defaults.particleShimmer),
    afterglowHalfLifeMs: clampNumber(profileValue(profile, legacyCommon, 'afterglowHalfLifeMs'), 0, 2000, defaults.afterglowHalfLifeMs),
    driftSpeedPxPerSec: clampNumber(profileValue(profile, legacyCommon, 'driftSpeedPxPerSec'), 0, 40, defaults.driftSpeedPxPerSec),
    turbulence: clampNumber(profileValue(profile, legacyCommon, 'turbulence'), 0, 1, defaults.turbulence),
    titleClearance: clampNumber(profileValue(profile, legacyCommon, 'titleClearance'), 0, 0.75, defaults.titleClearance),
  };
}

export function getAtmosphereControlGroups(variant) {
  if (variant === 'crispGlow') return SIMULATION_ATMOSPHERE_CONTROL_GROUPS;
  const profileGroup = PROFILE_GROUPS[variant] || PROFILE_GROUPS.webglPost;
  return [...COMMON_GROUPS, profileGroup];
}

export function normalizeAtmosphereLabConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const common = source.common && typeof source.common === 'object' ? source.common : {};
  const profiles = source.profiles && typeof source.profiles === 'object' ? source.profiles : {};
  const defaults = DEFAULT_ATMOSPHERE_LAB_CONFIG;
  const webglPost = normalizeBaseProfile(profiles.webglPost, common, defaults.profiles.webglPost);
  const density = normalizeBaseProfile(profiles.density, common, defaults.profiles.density);
  const canvasFeedback = normalizeBaseProfile(profiles.canvasFeedback, common, defaults.profiles.canvasFeedback);
  return {
    version: 10,
    common: {
      enabled: common.enabled !== false,
      qualityMode: normalizeChoice(common.qualityMode, ['auto', 'high', 'balanced', 'low'], defaults.common.qualityMode),
      hazeCadence: normalizeChoice(common.hazeCadence, ['auto', '60', '30', '20'], defaults.common.hazeCadence),
    },
    profiles: {
      webglPost: {
        ...webglPost,
        bloomLevels: Math.round(clampNumber(profiles.webglPost?.bloomLevels, 1, 4, defaults.profiles.webglPost.bloomLevels)),
        emissionThreshold: clampNumber(profiles.webglPost?.emissionThreshold, 0, 0.6, defaults.profiles.webglPost.emissionThreshold),
        extinction: clampNumber(profiles.webglPost?.extinction, 0, 1, defaults.profiles.webglPost.extinction),
        whitePoint: clampNumber(profiles.webglPost?.whitePoint, 0.55, 2.5, defaults.profiles.webglPost.whitePoint),
        colourSeparation: clampNumber(profiles.webglPost?.colourSeparation, 0, 2, defaults.profiles.webglPost.colourSeparation),
        opacityCeiling: clampNumber(profiles.webglPost?.opacityCeiling, 0.2, 0.95, defaults.profiles.webglPost.opacityCeiling),
      },
      density: {
        ...density,
        densityCurve: clampNumber(profiles.density?.densityCurve, 0.35, 2, defaults.profiles.density.densityCurve),
        whitePoint: clampNumber(profiles.density?.whitePoint, 0.55, 2.5, defaults.profiles.density.whitePoint),
        colourSeparation: clampNumber(profiles.density?.colourSeparation, 0, 2, defaults.profiles.density.colourSeparation),
        opacityCeiling: clampNumber(profiles.density?.opacityCeiling, 0.2, 0.95, defaults.profiles.density.opacityCeiling),
      },
      canvasFeedback: {
        ...canvasFeedback,
        blurRadiusFxPx: clampNumber(profiles.canvasFeedback?.blurRadiusFxPx, 4, 36, defaults.profiles.canvasFeedback.blurRadiusFxPx),
        diffusionPasses: Math.round(clampNumber(profiles.canvasFeedback?.diffusionPasses, 1, 4, defaults.profiles.canvasFeedback.diffusionPasses)),
        sourceGain: clampNumber(profiles.canvasFeedback?.sourceGain, 0.05, 0.8, defaults.profiles.canvasFeedback.sourceGain),
        blendMode: normalizeChoice(profiles.canvasFeedback?.blendMode, ['normal', 'screen', 'add'], defaults.profiles.canvasFeedback.blendMode),
      },
    },
  };
}

export function resolveAtmosphereProfile(config, variant, theme = 'light') {
  if (variant === 'crispGlow') {
    const legacyProfile = config?.profiles?.crispGlow;
    const productionConfig = legacyProfile
      ? { ...(config.common || {}), light: legacyProfile.light, dark: legacyProfile.dark }
      : config;
    return resolveSimulationAtmosphereRenderProfile(productionConfig, theme);
  }
  const normalized = normalizeAtmosphereLabConfig(config);
  return {
    ...normalized.common,
    ...normalized.profiles[variant],
  };
}
