export const PHASE_FORGE_PALETTE_MODES = ['discipline'];
export const PHASE_FORGE_DRAG_BEHAVIOURS = ['crystallize'];

export const DEFAULT_PHASE_FORGE_CONFIG = {
  version: 1,
  enabled: true,
  count: 360,
  palette: 'discipline',
  minRadius: 4.8,
  maxRadius: 8.6,
  interactionStrength: 0.74,
  dragBehavior: 'crystallize',
  dragStrength: 1.15,
  damping: 0.82,
  influenceRadius: 168,
  collisionRadius: 1.06,
  mobileDensityScale: 0.58,
  mobileRadiusScale: 0.9,
  animationSpeed: 0.86,
  targetFps: 60,
  maxDpr: 1.5,
  pauseWhenHidden: true,
};

export const PHASE_FORGE_CONTROL_GROUPS = [
  {
    title: 'Material',
    initiallyOpen: true,
    controls: [
      {
        id: 'count',
        label: 'Bodies',
        type: 'range',
        min: 140,
        max: 620,
        step: 5,
        display: 'integer',
      },
      {
        id: 'palette',
        label: 'Palette',
        type: 'select',
        options: PHASE_FORGE_PALETTE_MODES,
      },
      {
        id: 'minRadius',
        label: 'Min size',
        type: 'range',
        min: 3,
        max: 8,
        step: 0.1,
      },
      {
        id: 'maxRadius',
        label: 'Max size',
        type: 'range',
        min: 5,
        max: 12,
        step: 0.1,
      },
      {
        id: 'mobileDensityScale',
        label: 'Mobile density',
        type: 'range',
        min: 0.3,
        max: 1,
        step: 0.01,
      },
      {
        id: 'mobileRadiusScale',
        label: 'Mobile size',
        type: 'range',
        min: 0.65,
        max: 1.1,
        step: 0.01,
      },
    ],
  },
  {
    title: 'Phase',
    initiallyOpen: true,
    controls: [
      {
        id: 'enabled',
        label: 'Motion',
        type: 'checkbox',
      },
      {
        id: 'interactionStrength',
        label: 'Hover heat',
        type: 'range',
        min: 0,
        max: 1.4,
        step: 0.01,
      },
      {
        id: 'dragBehavior',
        label: 'Drag',
        type: 'select',
        options: PHASE_FORGE_DRAG_BEHAVIOURS,
      },
      {
        id: 'dragStrength',
        label: 'Crystallize',
        type: 'range',
        min: 0,
        max: 2,
        step: 0.01,
      },
      {
        id: 'influenceRadius',
        label: 'Influence',
        type: 'range',
        min: 80,
        max: 320,
        step: 1,
        display: 'integer',
      },
      {
        id: 'collisionRadius',
        label: 'Contact gap',
        type: 'range',
        min: 0.92,
        max: 1.24,
        step: 0.01,
      },
      {
        id: 'damping',
        label: 'Damping',
        type: 'range',
        min: 0.62,
        max: 0.94,
        step: 0.01,
      },
      {
        id: 'animationSpeed',
        label: 'Speed',
        type: 'range',
        min: 0.2,
        max: 1.6,
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

export function normalizePhaseForgeConfig(input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const next = { version: 1 };

  for (const group of PHASE_FORGE_CONTROL_GROUPS) {
    for (const control of group.controls) {
      next[control.id] = normalizeControlValue(
        source,
        control,
        DEFAULT_PHASE_FORGE_CONFIG[control.id],
      );
    }
  }

  if (next.maxRadius < next.minRadius + 0.8) {
    next.maxRadius = Math.min(12, next.minRadius + 0.8);
  }

  return next;
}

export function resolvePhaseForgeControlPatch(control, value, checked) {
  if (control.type === 'checkbox') return { [control.id]: Boolean(checked) };
  if (control.type === 'select') return { [control.id]: value };
  return { [control.id]: Number(value) };
}

export function formatPhaseForgeControlValue(value, control = {}) {
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (control.type === 'select') return String(value);
  if (typeof value === 'number') {
    if (control.display === 'integer' || control.step === 1) return String(Math.round(value));
    if (value === 0) return '0';
    return value.toFixed(value < 0.1 ? 3 : 2);
  }
  return String(value ?? '');
}
