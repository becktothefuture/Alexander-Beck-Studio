export const MINERAL_GROWTH_PRESETS = ['thicket', 'fern', 'bramble', 'creeper'];
export const MINERAL_GROWTH_SEED_PLACEMENTS = ['mixed', 'ground', 'sidewalls'];

export const DEFAULT_MINERAL_GROWTH_CONFIG = {
  version: 2,
  enabled: true,
  preset: 'thicket',
  bodyCount: 820,
  bodyScale: 1,
  seedCount: 4,
  seedPlacement: 'mixed',
  growthDuration: 28,
  forkRate: 0.72,
  wallFollow: 0.78,
  openSpaceBias: 0.64,
  branchClearance: 0.62,
  packingGap: 5.5,
  curlStrength: 0.42,
  leafletDensity: 0.48,
  colorSpread: 1,
  swayStrength: 0.32,
  pointerBend: 0.28,
  targetFps: 60,
  maxDpr: 1.5,
  pauseWhenHidden: true,
};

export const MINERAL_GROWTH_CONTROL_GROUPS = [
  {
    title: 'Material',
    initiallyOpen: true,
    controls: [
      {
        id: 'preset',
        label: 'Growth',
        type: 'select',
        options: MINERAL_GROWTH_PRESETS,
      },
      {
        id: 'bodyCount',
        label: 'Bodies',
        type: 'range',
        min: 180,
        max: 1200,
        step: 5,
        display: 'integer',
      },
      {
        id: 'bodyScale',
        label: 'Size',
        type: 'range',
        min: 0.8,
        max: 1.8,
        step: 0.05,
      },
      {
        id: 'seedCount',
        label: 'Seeds',
        type: 'range',
        min: 1,
        max: 4,
        step: 1,
        display: 'integer',
      },
      {
        id: 'seedPlacement',
        label: 'Edges',
        type: 'select',
        options: MINERAL_GROWTH_SEED_PLACEMENTS,
      },
      {
        id: 'packingGap',
        label: 'Gap',
        type: 'range',
        min: 2,
        max: 10,
        step: 0.1,
      },
      {
        id: 'colorSpread',
        label: 'Colour',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    title: 'Growth',
    initiallyOpen: true,
    controls: [
      {
        id: 'enabled',
        label: 'Motion',
        type: 'checkbox',
      },
      {
        id: 'growthDuration',
        label: 'Duration',
        type: 'range',
        min: 20,
        max: 48,
        step: 1,
        display: 'integer',
      },
      {
        id: 'forkRate',
        label: 'Fork',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'wallFollow',
        label: 'Wall',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'openSpaceBias',
        label: 'Space',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'branchClearance',
        label: 'Clearance',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'curlStrength',
        label: 'Curl',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'leafletDensity',
        label: 'Leaflets',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'swayStrength',
        label: 'Sway',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
      },
      {
        id: 'pointerBend',
        label: 'Touch',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
      },
    ],
  },
  {
    title: 'Performance',
    initiallyOpen: false,
    controls: [
      {
        id: 'targetFps',
        label: 'FPS',
        type: 'range',
        min: 24,
        max: 60,
        step: 1,
        display: 'integer',
      },
      {
        id: 'maxDpr',
        label: 'Max DPR',
        type: 'range',
        min: 0.75,
        max: 2,
        step: 0.05,
      },
      {
        id: 'pauseWhenHidden',
        label: 'Pause Hidden',
        type: 'checkbox',
      },
    ],
  },
];

function clampNumber(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function clampInteger(value, min, max, fallback) {
  return Math.round(clampNumber(value, min, max, fallback));
}

function normalizeControlValue(source, control, fallback) {
  if (control.type === 'checkbox') return source[control.id] !== false;
  if (control.type === 'select') {
    return control.options.includes(source[control.id]) ? source[control.id] : fallback;
  }
  if (control.display === 'integer' || control.step === 1) {
    return clampInteger(source[control.id], control.min, control.max, fallback);
  }
  return clampNumber(source[control.id], control.min, control.max, fallback);
}

export function normalizeMineralGrowthConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const next = { version: 2 };

  for (const group of MINERAL_GROWTH_CONTROL_GROUPS) {
    for (const control of group.controls) {
      next[control.id] = normalizeControlValue(
        source,
        control,
        DEFAULT_MINERAL_GROWTH_CONFIG[control.id],
      );
    }
  }

  return next;
}

export function resolveMineralGrowthControlPatch(control, value, checked) {
  if (control.type === 'checkbox') return { [control.id]: Boolean(checked) };
  if (control.type === 'select') return { [control.id]: value };
  return { [control.id]: Number(value) };
}

export function formatMineralGrowthControlValue(value, control = {}) {
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (control.type === 'select') return String(value);
  if (typeof value === 'number') {
    if (control.display === 'integer' || control.step === 1) return String(Math.round(value));
    if (value === 0) return '0';
    return value.toFixed(value < 0.1 ? 3 : 2);
  }
  return String(value ?? '');
}
