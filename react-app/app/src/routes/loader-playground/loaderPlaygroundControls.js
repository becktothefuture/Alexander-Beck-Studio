export const LOADER_DOT_COLORS = [
  'var(--ball-1, #708591)',
  'var(--ball-4, #005c78)',
  'var(--ball-2, #b7c7ce)',
  'var(--ball-7, #3f72c8)',
  'var(--ball-8, #d5b23a)',
  'var(--ball-6, #c95332)',
];

const FIXED_ORBIT_RADIUS = 14.25;
const FIXED_DOT_SIZE = 4.8;

const BASE_SWEEP_SETTINGS = {
  durationMs: 2300,
  colorCycleMs: 2300,
  colorMode: 'cycle',
  colorPhaseDirection: 1,
  colorPhaseStepMs: 383,
  colorSyncDelayMs: 80,
  radius: FIXED_ORBIT_RADIUS,
  dotSize: FIXED_DOT_SIZE,
};

function withMotionSync(durationMs, overrides = {}) {
  return {
    ...BASE_SWEEP_SETTINGS,
    durationMs,
    colorCycleMs: durationMs,
    colorPhaseStepMs: Math.round(durationMs / 60) * 10,
    ...overrides,
  };
}

export const LOADER_PLAYGROUND_VARIANTS = [
  {
    id: 'fluid-sweep',
    label: 'Fluid Sweep',
    shortLabel: 'Fluid',
    summary: 'Continuous easing with a gentle pull through the back half of the orbit.',
    defaults: withMotionSync(2240),
  },
  {
    id: 'long-ease',
    label: 'Long Ease',
    shortLabel: 'Long',
    summary: 'A wider, smoother acceleration curve with no held beat.',
    defaults: withMotionSync(2460),
  },
  {
    id: 'rubber-pull',
    label: 'Rubber Pull',
    shortLabel: 'Rubber',
    summary: 'A stretched cadence that snaps forward, then keeps rolling.',
    defaults: withMotionSync(2260),
  },
  {
    id: 'spring-arc',
    label: 'Spring Arc',
    shortLabel: 'Spring',
    summary: 'Three elastic pulls, all moving in the same direction.',
    defaults: withMotionSync(2320),
  },
  {
    id: 'rolling-wave',
    label: 'Rolling Wave',
    shortLabel: 'Wave',
    summary: 'A rolling fast-slow-fast pattern without a visible pause.',
    defaults: withMotionSync(2380),
  },
  {
    id: 'slipstream',
    label: 'Slipstream',
    shortLabel: 'Slip',
    summary: 'Fast entry, gliding middle, and an eased push into the loop.',
    defaults: withMotionSync(2180),
  },
  {
    id: 'elastic-loop',
    label: 'Elastic Loop',
    shortLabel: 'Elastic',
    summary: 'Rubber-like compression and release without reversing direction.',
    defaults: withMotionSync(2360),
  },
  {
    id: 'buoyant-arc',
    label: 'Buoyant Arc',
    shortLabel: 'Buoy',
    summary: 'A floating drift that still keeps angular pressure alive.',
    defaults: withMotionSync(2440),
  },
  {
    id: 'braided-sweep',
    label: 'Braided Sweep',
    shortLabel: 'Braid',
    summary: 'Alternating soft pulls that feel woven rather than segmented.',
    defaults: withMotionSync(2300),
  },
  {
    id: 'fixed-flow',
    label: 'Fixed Flow',
    shortLabel: 'Fixed',
    summary: 'A smooth sweep with each dot keeping its own colour.',
    defaults: withMotionSync(2320, { colorMode: 'fixed' }),
  },
  {
    id: 'fixed-rubber',
    label: 'Fixed Rubber',
    shortLabel: 'No Cycle',
    summary: 'A rubber cadence with no colour switching.',
    defaults: withMotionSync(2260, { colorMode: 'fixed' }),
  },
  {
    id: 'fixed-drift',
    label: 'Fixed Drift',
    shortLabel: 'Drift',
    summary: 'A calmer fixed-colour option with continuous orbital easing.',
    defaults: withMotionSync(2520, { colorMode: 'fixed' }),
  },
];

export const LOADER_PLAYGROUND_VARIANT_IDS = LOADER_PLAYGROUND_VARIANTS.map((variant) => variant.id);

export const DEFAULT_LOADER_PLAYGROUND_CONFIG = {
  version: 2,
  selectedVariant: LOADER_PLAYGROUND_VARIANTS[0].id,
  variants: Object.fromEntries(
    LOADER_PLAYGROUND_VARIANTS.map((variant) => [variant.id, { ...variant.defaults }]),
  ),
};

export const LOADER_PLAYGROUND_CONTROL_GROUPS = [
  {
    title: 'Target',
    initiallyOpen: true,
    controls: [
      {
        id: 'selectedVariant',
        label: 'Variant',
        type: 'select',
        scope: 'root',
        options: LOADER_PLAYGROUND_VARIANTS.map((variant) => ({
          value: variant.id,
          label: variant.shortLabel,
        })),
      },
    ],
  },
  {
    title: 'Motion',
    initiallyOpen: true,
    controls: [
      {
        id: 'durationMs',
        label: 'Speed',
        type: 'range',
        min: 1700,
        max: 2900,
        step: 20,
        display: 'ms',
      },
    ],
  },
  {
    title: 'Colour',
    initiallyOpen: true,
    controls: [
      {
        id: 'colorMode',
        label: 'Mode',
        type: 'select',
        options: [
          { value: 'cycle', label: 'Cycle' },
          { value: 'fixed', label: 'Fixed' },
        ],
      },
      {
        id: 'colorCycleMs',
        label: 'Pace',
        type: 'range',
        min: 1400,
        max: 3200,
        step: 20,
        display: 'ms',
      },
      {
        id: 'colorPhaseStepMs',
        label: 'Step',
        type: 'range',
        min: 120,
        max: 560,
        step: 10,
        display: 'ms',
      },
      {
        id: 'colorSyncDelayMs',
        label: 'Sync',
        type: 'range',
        min: 0,
        max: 180,
        step: 10,
        display: 'ms',
      },
    ],
  },
];

export function getLoaderVariantDefinition(id) {
  return LOADER_PLAYGROUND_VARIANTS.find((variant) => variant.id === id)
    || LOADER_PLAYGROUND_VARIANTS[0];
}

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function normalizeVariantSettings(source, defaults = BASE_SWEEP_SETTINGS) {
  const input = source && typeof source === 'object' ? source : {};
  const colorMode = input.colorMode || defaults.colorMode;
  return {
    durationMs: Math.round(clampNumber(input.durationMs, 1700, 2900, defaults.durationMs)),
    colorCycleMs: Math.round(clampNumber(input.colorCycleMs, 1400, 3200, defaults.colorCycleMs)),
    colorMode: colorMode === 'fixed' ? 'fixed' : 'cycle',
    colorPhaseDirection: Number(input.colorPhaseDirection) < 0 ? -1 : 1,
    colorPhaseStepMs: Math.round(clampNumber(input.colorPhaseStepMs, 120, 560, defaults.colorPhaseStepMs)),
    colorSyncDelayMs: Math.round(clampNumber(input.colorSyncDelayMs, 0, 180, defaults.colorSyncDelayMs)),
    radius: FIXED_ORBIT_RADIUS,
    dotSize: FIXED_DOT_SIZE,
  };
}

export function normalizeLoaderPlaygroundConfig(source) {
  const input = source && typeof source === 'object' ? source : {};
  const selectedVariant = LOADER_PLAYGROUND_VARIANT_IDS.includes(input.selectedVariant)
    ? input.selectedVariant
    : DEFAULT_LOADER_PLAYGROUND_CONFIG.selectedVariant;

  return {
    version: 2,
    selectedVariant,
    variants: Object.fromEntries(
      LOADER_PLAYGROUND_VARIANTS.map((variant) => [
        variant.id,
        normalizeVariantSettings(input.variants?.[variant.id], variant.defaults),
      ]),
    ),
  };
}

export function getSelectedLoaderVariantConfig(config) {
  const normalized = normalizeLoaderPlaygroundConfig(config);
  return normalized.variants[normalized.selectedVariant] || LOADER_PLAYGROUND_VARIANTS[0].defaults;
}

export function resolveLoaderPlaygroundControlValue(control, config) {
  const normalized = normalizeLoaderPlaygroundConfig(config);
  if (control.scope === 'root') return normalized[control.id];
  return normalized.variants[normalized.selectedVariant]?.[control.id];
}

export function resolveLoaderPlaygroundControlPatch(control, value, checked, config) {
  const normalized = normalizeLoaderPlaygroundConfig(config);
  if (control.scope === 'root') {
    const nextVariant = LOADER_PLAYGROUND_VARIANT_IDS.includes(value)
      ? value
      : normalized.selectedVariant;
    return { selectedVariant: nextVariant };
  }

  const selectedVariant = normalized.selectedVariant;
  const currentVariant = normalized.variants[selectedVariant];
  let nextValue = Number(value);
  if (control.type === 'checkbox') {
    nextValue = Boolean(checked);
  } else if (control.type === 'select') {
    nextValue = value;
  }

  return {
    variants: {
      ...normalized.variants,
      [selectedVariant]: normalizeVariantSettings({
        ...currentVariant,
        [control.id]: nextValue,
      }, getLoaderVariantDefinition(selectedVariant).defaults),
    },
  };
}

export function formatLoaderPlaygroundControlValue(value, control = {}) {
  if (control.type === 'select') {
    const option = control.options?.find((candidate) => candidate.value === value);
    return option?.label || String(value);
  }
  if (control.type === 'checkbox') return value ? 'on' : 'off';
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return '';
  if (control.display === 'ms') return `${Math.round(numeric)}ms`;
  if (control.display === 'percent') return `${Math.round(numeric * 100)}%`;
  return numeric.toFixed(2);
}
