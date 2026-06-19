export const DEFAULT_WALL_REPEL_CONFIG = {
  version: 1,
  enabled: true,
  ballCount: 220,
  mobileCountScale: 0.62,
  ballRadius: 12.4,
  sizeVariation: 0.12,
  wallStrength: 7200,
  wallRange: 210,
  wallCurve: 1.35,
  wallKick: 1.25,
  mouseStrength: 3000,
  mouseRadius: 210,
  mouseCurve: 2,
  mouseWakeDecay: 1180,
  initialSpeed: 820,
  directionalBias: 0.72,
  spinBias: 0.25,
  idleDrift: 0.18,
  drag: 0.002,
  momentumFloor: 420,
  maxSpeed: 1600,
  collisionPush: 0.88,
  collisionIterations: 2,
  targetFps: 60,
  maxDpr: 1.5,
  pauseWhenHidden: true,
};

export const WALL_REPEL_CONTROL_GROUPS = [
  {
    title: 'Material',
    initiallyOpen: true,
    controls: [
      {
        id: 'enabled',
        label: 'Motion',
        type: 'checkbox',
      },
      {
        id: 'ballCount',
        label: 'Balls',
        type: 'range',
        min: 40,
        max: 520,
        step: 1,
        display: 'integer',
      },
      {
        id: 'ballRadius',
        label: 'Radius',
        type: 'range',
        min: 6,
        max: 22,
        step: 0.1,
      },
      {
        id: 'sizeVariation',
        label: 'Variation',
        type: 'range',
        min: 0,
        max: 0.28,
        step: 0.01,
        display: 'percent',
      },
    ],
  },
  {
    title: 'Forces',
    initiallyOpen: true,
    controls: [
      {
        id: 'wallStrength',
        label: 'Wall',
        type: 'range',
        min: 0,
        max: 9000,
        step: 25,
        display: 'integer',
      },
      {
        id: 'wallRange',
        label: 'Wall Range',
        type: 'range',
        min: 40,
        max: 520,
        step: 1,
        display: 'integer',
      },
      {
        id: 'wallCurve',
        label: 'Wall Curve',
        type: 'range',
        min: 0.65,
        max: 4,
        step: 0.01,
      },
      {
        id: 'wallKick',
        label: 'Wall Kick',
        type: 'range',
        min: 0,
        max: 1.5,
        step: 0.01,
      },
      {
        id: 'mouseStrength',
        label: 'Mouse',
        type: 'range',
        min: 0,
        max: 5200,
        step: 10,
        display: 'integer',
      },
      {
        id: 'mouseRadius',
        label: 'Mouse Radius',
        type: 'range',
        min: 50,
        max: 420,
        step: 1,
        display: 'integer',
      },
      {
        id: 'mouseCurve',
        label: 'Mouse Curve',
        type: 'range',
        min: 0.65,
        max: 4,
        step: 0.01,
      },
      {
        id: 'mouseWakeDecay',
        label: 'Wake',
        type: 'range',
        min: 120,
        max: 2600,
        step: 10,
        display: 'ms',
      },
    ],
  },
  {
    title: 'Motion',
    initiallyOpen: true,
    controls: [
      {
        id: 'initialSpeed',
        label: 'Initial',
        type: 'range',
        min: 0,
        max: 1800,
        step: 1,
        display: 'integer',
      },
      {
        id: 'directionalBias',
        label: 'Direction',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        display: 'percent',
      },
      {
        id: 'spinBias',
        label: 'Spin Bias',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        display: 'percent',
      },
      {
        id: 'idleDrift',
        label: 'Idle Drift',
        type: 'range',
        min: 0,
        max: 0.5,
        step: 0.01,
      },
      {
        id: 'drag',
        label: 'Drag',
        type: 'range',
        min: 0,
        max: 0.18,
        step: 0.001,
      },
      {
        id: 'momentumFloor',
        label: 'Momentum',
        type: 'range',
        min: 0,
        max: 720,
        step: 1,
        display: 'integer',
      },
      {
        id: 'maxSpeed',
        label: 'Speed Cap',
        type: 'range',
        min: 80,
        max: 2200,
        step: 1,
        display: 'integer',
      },
      {
        id: 'collisionPush',
        label: 'Contact',
        type: 'range',
        min: 0.1,
        max: 1.2,
        step: 0.01,
      },
      {
        id: 'collisionIterations',
        label: 'Passes',
        type: 'range',
        min: 1,
        max: 4,
        step: 1,
        display: 'integer',
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
        id: 'mobileCountScale',
        label: 'Mobile Count',
        type: 'range',
        min: 0.25,
        max: 1,
        step: 0.01,
        display: 'percent',
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
  if (control.display === 'integer' || control.step === 1) {
    return clampInteger(source[control.id], control.min, control.max, fallback);
  }
  return clampNumber(source[control.id], control.min, control.max, fallback);
}

export function normalizeWallRepelConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const next = { version: 1 };

  for (const group of WALL_REPEL_CONTROL_GROUPS) {
    for (const control of group.controls) {
      next[control.id] = normalizeControlValue(
        source,
        control,
        DEFAULT_WALL_REPEL_CONFIG[control.id],
      );
    }
  }

  return next;
}

export function resolveWallRepelControlPatch(control, value, checked) {
  if (control.type === 'checkbox') return { [control.id]: Boolean(checked) };
  return { [control.id]: Number(value) };
}

export function formatWallRepelControlValue(value, control = {}) {
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (typeof value === 'number') {
    if (control.display === 'integer' || control.step === 1) return String(Math.round(value));
    if (control.display === 'percent') return `${Math.round(value * 100)}%`;
    if (control.display === 'ms') return `${Math.round(value)}ms`;
    if (value === 0) return '0';
    return value.toFixed(value < 0.1 ? 3 : 2);
  }
  return String(value ?? '');
}
