export const RAIN_PRISM_BLEND_MODES = ['auto', 'normal', 'screen', 'plus-lighter', 'overlay', 'color-dodge', 'multiply'];
export const RAIN_PRISM_SITE_SCOPES = ['home', 'core', 'all'];

export const DEFAULT_RAIN_PRISM_CONFIG = {
  version: 4,
  theme: 'dark',
  enabled: true,
  blendMode: 'auto',
  siteBlendMode: 'auto',
  siteScope: 'home',
  dropDensity: 3650,
  pixelSize: 1,
  pixelAlpha: 0.19,
  spectrumBoost: 2.67,
  displayColor: 0.81,
  displayContrast: 1.63,
  lightBoost: 3.78,
  darkBoost: 1.8,
  redStrength: 1.04,
  greenStrength: 1.04,
  blueStrength: 1,
  motion: 3,
  cycleSpread: 1.22,
  phaseJitter: 1.18,
  targetFps: 30,
  maxDpr: 1.5,
  pauseWhenHidden: true,
  adaptiveDensity: true,
};

export const RAIN_PRISM_CONTROL_GROUPS = [
  {
    title: 'Behavior',
    controls: [
      {
        id: 'theme',
        label: 'Chrome',
        type: 'select',
        options: ['light', 'dark'],
      },
      {
        id: 'enabled',
        label: 'Effect',
        type: 'checkbox',
      },
      {
        id: 'blendMode',
        label: 'Blend',
        type: 'select',
        options: RAIN_PRISM_BLEND_MODES,
      },
      {
        id: 'siteBlendMode',
        label: 'Site blend',
        type: 'select',
        options: RAIN_PRISM_BLEND_MODES,
      },
    ],
  },
  {
    title: 'Pixels',
    controls: [
      {
        id: 'dropDensity',
        label: 'Pixels',
        type: 'range',
        min: 100,
        max: 20000,
        step: 50,
      },
      {
        id: 'pixelSize',
        label: 'Size',
        type: 'range',
        min: 1,
        max: 3,
        step: 1,
      },
      {
        id: 'pixelAlpha',
        label: 'Opacity',
        type: 'range',
        min: 0.05,
        max: 2.5,
        step: 0.01,
      },
      {
        id: 'spectrumBoost',
        label: 'Bright',
        type: 'range',
        min: 0.05,
        max: 5,
        step: 0.01,
      },
    ],
  },
  {
    title: 'Theme gain',
    controls: [
      {
        id: 'lightBoost',
        label: 'Light amp',
        type: 'range',
        min: 0.25,
        max: 8,
        step: 0.01,
      },
      {
        id: 'darkBoost',
        label: 'Dark amp',
        type: 'range',
        min: 0.25,
        max: 4,
        step: 0.01,
      },
      {
        id: 'displayColor',
        label: 'Bg wash',
        type: 'range',
        min: 0,
        max: 2,
        step: 0.01,
      },
      {
        id: 'displayContrast',
        label: 'Bg lift',
        type: 'range',
        min: 0,
        max: 3,
        step: 0.01,
      },
    ],
  },
  {
    title: 'Channels',
    controls: [
      {
        id: 'redStrength',
        label: 'Red',
        type: 'range',
        min: 0,
        max: 3,
        step: 0.01,
      },
      {
        id: 'greenStrength',
        label: 'Green',
        type: 'range',
        min: 0,
        max: 3,
        step: 0.01,
      },
      {
        id: 'blueStrength',
        label: 'Blue',
        type: 'range',
        min: 0,
        max: 3,
        step: 0.01,
      },
    ],
  },
  {
    title: 'Motion',
    controls: [
      {
        id: 'motion',
        label: 'Cycle',
        type: 'range',
        min: 0,
        max: 3,
        step: 0.01,
      },
      {
        id: 'cycleSpread',
        label: 'Spread',
        type: 'range',
        min: 0,
        max: 3,
        step: 0.01,
      },
      {
        id: 'phaseJitter',
        label: 'Phase',
        type: 'range',
        min: 0,
        max: 3,
        step: 0.01,
      },
    ],
  },
  {
    title: 'Performance',
    controls: [
      {
        id: 'targetFps',
        label: 'FPS',
        type: 'range',
        min: 1,
        max: 60,
        step: 1,
      },
      {
        id: 'maxDpr',
        label: 'Max DPR',
        type: 'range',
        min: 0.75,
        max: 2.5,
        step: 0.05,
      },
      {
        id: 'adaptiveDensity',
        label: 'Adaptive',
        type: 'checkbox',
      },
      {
        id: 'pauseWhenHidden',
        label: 'Pause hidden',
        type: 'checkbox',
      },
      {
        id: 'siteScope',
        label: 'Site routes',
        type: 'select',
        options: RAIN_PRISM_SITE_SCOPES,
      },
    ],
  },
];

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function normalizeRainPrismConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const defaults = DEFAULT_RAIN_PRISM_CONFIG;
  const pixelSizeSource = source.pixelSize ?? source.dropScale;

  return {
    version: 4,
    theme: source.theme === 'light' ? 'light' : 'dark',
    enabled: source.enabled !== false,
    blendMode: RAIN_PRISM_BLEND_MODES.includes(source.blendMode) ? source.blendMode : defaults.blendMode,
    siteBlendMode: RAIN_PRISM_BLEND_MODES.includes(source.siteBlendMode) ? source.siteBlendMode : defaults.siteBlendMode,
    siteScope: RAIN_PRISM_SITE_SCOPES.includes(source.siteScope) ? source.siteScope : defaults.siteScope,
    dropDensity: Math.round(clampNumber(source.dropDensity, 100, 20000, defaults.dropDensity)),
    pixelSize: Math.round(clampNumber(pixelSizeSource, 1, 3, defaults.pixelSize)),
    pixelAlpha: clampNumber(source.pixelAlpha, 0.05, 2.5, defaults.pixelAlpha),
    spectrumBoost: clampNumber(source.spectrumBoost, 0.05, 5, defaults.spectrumBoost),
    displayColor: clampNumber(source.displayColor, 0, 2, defaults.displayColor),
    displayContrast: clampNumber(source.displayContrast, 0, 3, defaults.displayContrast),
    lightBoost: clampNumber(source.lightBoost, 0.25, 8, defaults.lightBoost),
    darkBoost: clampNumber(source.darkBoost, 0.25, 4, defaults.darkBoost),
    redStrength: clampNumber(source.redStrength, 0, 3, defaults.redStrength),
    greenStrength: clampNumber(source.greenStrength, 0, 3, defaults.greenStrength),
    blueStrength: clampNumber(source.blueStrength, 0, 3, defaults.blueStrength),
    motion: clampNumber(source.motion, 0, 3, defaults.motion),
    cycleSpread: clampNumber(source.cycleSpread, 0, 3, defaults.cycleSpread),
    phaseJitter: clampNumber(source.phaseJitter, 0, 3, defaults.phaseJitter),
    targetFps: Math.round(clampNumber(source.targetFps, 1, 60, defaults.targetFps)),
    maxDpr: clampNumber(source.maxDpr, 0.75, 2.5, defaults.maxDpr),
    pauseWhenHidden: source.pauseWhenHidden !== false,
    adaptiveDensity: source.adaptiveDensity !== false,
  };
}

export function formatControlValue(value) {
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(2);
  }
  return String(value);
}
