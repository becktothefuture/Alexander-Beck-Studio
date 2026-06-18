export const DEFAULT_FLOCK_OF_BIRDS_CONFIG = {
  version: 1,
  enabled: true,
  birdCount: 104,
  mobileCountScale: 0.62,
  birdRadius: 10.4,
  colorOpacity: 0.86,
  depthSize: 0.02,
  depthOpacity: 0.05,
  neighborRadius: 148,
  separationRadius: 32,
  alignment: 1.12,
  cohesion: 0.13,
  separation: 0.78,
  centerPull: 0.032,
  strayRecovery: 0.72,
  flockSpread: 440,
  orbitRadius: 220,
  orbitLocality: 0.03,
  startupWarmupFrames: 168,
  minSpeed: 64,
  cruiseSpeed: 176,
  maxSpeed: 332,
  maxForce: 188,
  turnAgility: 0.44,
  drag: 0.038,
  weight: 0.62,
  inertia: 2.08,
  diveAcceleration: 0.64,
  climbSlowdown: 0.38,
  speedResponse: 1.02,
  liftRecovery: 0.26,
  bankLift: 0.22,
  wander: 0.42,
  wanderFrequency: 0.12,
  gust: 0.2,
  flowWeight: 0.28,
  flowScale: 0.0012,
  flowSpeed: 0.035,
  courseStrength: 0.24,
  edgeMargin: 155,
  topMargin: 74,
  skyContainment: 0.78,
  groundLine: 0.88,
  groundAvoidDistance: 235,
  groundAvoidance: 1.32,
  groundLookahead: 0.92,
  mouseRadius: 170,
  mouseAvoidance: 0.92,
  mouseLateral: 0.26,
  backgroundLift: 0.2,
  targetFps: 60,
  maxDpr: 1.5,
  pauseWhenHidden: true,
};

function lerp(min, max, value) {
  return min + (max - min) * value;
}

function unlerp(min, max, value) {
  if (max === min) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

function average(...values) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function macroTightness(config) {
  return average(
    1 - unlerp(320, 640, config.flockSpread),
    unlerp(0.06, 0.22, config.cohesion),
    1 - unlerp(0.48, 1.35, config.separation),
  );
}

function patchTightness(value) {
  const t = clampNumber(value, 0, 1, macroTightness(DEFAULT_FLOCK_OF_BIRDS_CONFIG));
  return {
    flockSpread: Math.round(lerp(640, 320, t)),
    cohesion: lerp(0.06, 0.22, t),
    separation: lerp(1.35, 0.48, t),
    neighborRadius: Math.round(lerp(128, 164, t)),
    separationRadius: Math.round(lerp(42, 26, t)),
  };
}

function macroRange(config) {
  return average(
    unlerp(150, 310, config.orbitRadius),
    1 - unlerp(0.014, 0.07, config.centerPull),
    1 - unlerp(0.48, 0.98, config.strayRecovery),
  );
}

function patchRange(value) {
  const t = clampNumber(value, 0, 1, macroRange(DEFAULT_FLOCK_OF_BIRDS_CONFIG));
  return {
    orbitRadius: Math.round(lerp(150, 310, t)),
    centerPull: lerp(0.07, 0.014, t),
    strayRecovery: lerp(0.98, 0.48, t),
    edgeMargin: Math.round(lerp(80, 180, t)),
    orbitLocality: lerp(0.012, 0.06, t),
  };
}

function macroPace(config) {
  return average(
    unlerp(92, 220, config.cruiseSpeed),
    unlerp(190, 390, config.maxSpeed),
  );
}

function patchPace(value) {
  const t = clampNumber(value, 0, 1, macroPace(DEFAULT_FLOCK_OF_BIRDS_CONFIG));
  return {
    minSpeed: Math.round(lerp(36, 78, t)),
    cruiseSpeed: Math.round(lerp(92, 220, t)),
    maxSpeed: Math.round(lerp(190, 390, t)),
    maxForce: Math.round(lerp(140, 230, t)),
    speedResponse: lerp(0.72, 1.18, t),
  };
}

function macroWeight(config) {
  return average(
    unlerp(0.25, 0.88, config.weight),
    unlerp(0.9, 2.35, config.inertia),
    unlerp(0.25, 0.8, config.diveAcceleration),
    unlerp(0.18, 0.55, config.climbSlowdown),
  );
}

function patchWeight(value) {
  const t = clampNumber(value, 0, 1, macroWeight(DEFAULT_FLOCK_OF_BIRDS_CONFIG));
  return {
    weight: lerp(0.25, 0.88, t),
    inertia: lerp(0.9, 2.35, t),
    diveAcceleration: lerp(0.25, 0.8, t),
    climbSlowdown: lerp(0.18, 0.55, t),
    liftRecovery: lerp(0.1, 0.36, t),
    bankLift: lerp(0.08, 0.3, t),
    drag: lerp(0.02, 0.07, t),
  };
}

function macroAir(config) {
  return average(
    unlerp(0.12, 0.85, config.wander),
    unlerp(0.05, 0.5, config.gust),
    unlerp(0.08, 0.55, config.flowWeight),
  );
}

function patchAir(value) {
  const t = clampNumber(value, 0, 1, macroAir(DEFAULT_FLOCK_OF_BIRDS_CONFIG));
  return {
    wander: lerp(0.12, 0.85, t),
    wanderFrequency: lerp(0.07, 0.22, t),
    gust: lerp(0.05, 0.5, t),
    flowWeight: lerp(0.08, 0.55, t),
    flowScale: lerp(0.0008, 0.0022, t),
    flowSpeed: lerp(0.015, 0.09, t),
    courseStrength: lerp(0.18, 0.34, t),
  };
}

function macroMouse(config) {
  return average(
    unlerp(70, 260, config.mouseRadius),
    unlerp(0.25, 2.4, config.mouseAvoidance),
  );
}

function patchMouse(value) {
  const t = clampNumber(value, 0, 1, macroMouse(DEFAULT_FLOCK_OF_BIRDS_CONFIG));
  return {
    mouseRadius: Math.round(lerp(70, 260, t)),
    mouseAvoidance: lerp(0.25, 2.4, t),
    mouseLateral: lerp(0.08, 0.6, t),
  };
}

export const FLOCK_OF_BIRDS_CONFIG_CONTROLS = [
  { id: 'enabled', type: 'checkbox' },
  { id: 'birdCount', type: 'range', min: 40, max: 360, step: 1 },
  { id: 'mobileCountScale', type: 'range', min: 0.35, max: 1, step: 0.01 },
  { id: 'birdRadius', type: 'range', min: 5, max: 14.4, step: 0.1 },
  { id: 'colorOpacity', type: 'range', min: 0.2, max: 1, step: 0.01 },
  { id: 'depthSize', type: 'range', min: 0, max: 0.14, step: 0.005 },
  { id: 'depthOpacity', type: 'range', min: 0, max: 0.35, step: 0.01 },
  { id: 'neighborRadius', type: 'range', min: 36, max: 180, step: 1 },
  { id: 'separationRadius', type: 'range', min: 10, max: 70, step: 1 },
  { id: 'alignment', type: 'range', min: 0, max: 3.4, step: 0.01 },
  { id: 'cohesion', type: 'range', min: 0, max: 0.7, step: 0.01 },
  { id: 'separation', type: 'range', min: 0, max: 4, step: 0.01 },
  { id: 'centerPull', type: 'range', min: 0, max: 0.45, step: 0.01 },
  { id: 'strayRecovery', type: 'range', min: 0, max: 2.2, step: 0.01 },
  { id: 'flockSpread', type: 'range', min: 120, max: 760, step: 1 },
  { id: 'orbitRadius', type: 'range', min: 70, max: 560, step: 1 },
  { id: 'orbitLocality', type: 'range', min: 0, max: 1, step: 0.01 },
  { id: 'startupWarmupFrames', type: 'range', min: 0, max: 240, step: 1 },
  { id: 'minSpeed', type: 'range', min: 8, max: 120, step: 1 },
  { id: 'cruiseSpeed', type: 'range', min: 24, max: 230, step: 1 },
  { id: 'maxSpeed', type: 'range', min: 50, max: 420, step: 1 },
  { id: 'maxForce', type: 'range', min: 40, max: 420, step: 1 },
  { id: 'turnAgility', type: 'range', min: 0.25, max: 2.4, step: 0.01 },
  { id: 'drag', type: 'range', min: 0, max: 0.35, step: 0.005 },
  { id: 'weight', type: 'range', min: 0, max: 1, step: 0.01 },
  { id: 'inertia', type: 'range', min: 0.6, max: 2.4, step: 0.01 },
  { id: 'diveAcceleration', type: 'range', min: 0, max: 0.9, step: 0.01 },
  { id: 'climbSlowdown', type: 'range', min: 0, max: 0.75, step: 0.01 },
  { id: 'speedResponse', type: 'range', min: 0.15, max: 1.5, step: 0.01 },
  { id: 'liftRecovery', type: 'range', min: 0, max: 0.7, step: 0.01 },
  { id: 'bankLift', type: 'range', min: 0, max: 0.6, step: 0.01 },
  { id: 'wander', type: 'range', min: 0, max: 2, step: 0.01 },
  { id: 'wanderFrequency', type: 'range', min: 0.03, max: 0.8, step: 0.01 },
  { id: 'gust', type: 'range', min: 0, max: 1.6, step: 0.01 },
  { id: 'flowWeight', type: 'range', min: 0, max: 1.4, step: 0.01 },
  { id: 'flowScale', type: 'range', min: 0.0005, max: 0.008, step: 0.0001 },
  { id: 'flowSpeed', type: 'range', min: 0.005, max: 0.18, step: 0.001 },
  { id: 'courseStrength', type: 'range', min: 0, max: 1.8, step: 0.01 },
  { id: 'edgeMargin', type: 'range', min: 20, max: 180, step: 1 },
  { id: 'topMargin', type: 'range', min: 8, max: 160, step: 1 },
  { id: 'skyContainment', type: 'range', min: 0, max: 1.4, step: 0.01 },
  { id: 'groundLine', type: 'range', min: 0.62, max: 0.96, step: 0.01 },
  { id: 'groundAvoidDistance', type: 'range', min: 40, max: 300, step: 1 },
  { id: 'groundAvoidance', type: 'range', min: 0, max: 4, step: 0.01 },
  { id: 'groundLookahead', type: 'range', min: 0, max: 1.6, step: 0.01 },
  { id: 'mouseRadius', type: 'range', min: 40, max: 360, step: 1 },
  { id: 'mouseAvoidance', type: 'range', min: 0, max: 4, step: 0.01 },
  { id: 'mouseLateral', type: 'range', min: 0, max: 2.4, step: 0.01 },
  { id: 'backgroundLift', type: 'range', min: 0, max: 0.7, step: 0.01 },
  { id: 'targetFps', type: 'range', min: 24, max: 60, step: 1 },
  { id: 'maxDpr', type: 'range', min: 0.75, max: 2, step: 0.05 },
  { id: 'pauseWhenHidden', type: 'checkbox' },
];

export const FLOCK_OF_BIRDS_CONTROL_GROUPS = [
  {
    title: 'Flock',
    initiallyOpen: true,
    controls: [
      { id: 'enabled', label: 'Motion', type: 'checkbox' },
      { id: 'birdCount', label: 'Birds', type: 'range', min: 40, max: 360, step: 1 },
      {
        id: 'macroTightness',
        label: 'Tightness',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        display: 'percent',
        getValue: macroTightness,
        toPatch: patchTightness,
      },
      {
        id: 'macroRange',
        label: 'Range',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        display: 'percent',
        getValue: macroRange,
        toPatch: patchRange,
      },
    ],
  },
  {
    title: 'Motion',
    initiallyOpen: true,
    controls: [
      {
        id: 'macroPace',
        label: 'Pace',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        display: 'percent',
        getValue: macroPace,
        toPatch: patchPace,
      },
      {
        id: 'macroWeight',
        label: 'Weight',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        display: 'percent',
        getValue: macroWeight,
        toPatch: patchWeight,
      },
      {
        id: 'macroAir',
        label: 'Air',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        display: 'percent',
        getValue: macroAir,
        toPatch: patchAir,
      },
    ],
  },
  {
    title: 'World',
    initiallyOpen: true,
    controls: [
      {
        id: 'macroMouse',
        label: 'Mouse',
        type: 'range',
        min: 0,
        max: 1,
        step: 0.01,
        display: 'percent',
        getValue: macroMouse,
        toPatch: patchMouse,
      },
      { id: 'groundLine', label: 'Ground', type: 'range', min: 0.62, max: 0.96, step: 0.01, display: 'percent' },
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

function normalizeFromControl(source, control, fallback) {
  if (control.type === 'checkbox') {
    return source[control.id] !== false;
  }
  if (control.step === 1) {
    return clampInteger(source[control.id], control.min, control.max, fallback);
  }
  return clampNumber(source[control.id], control.min, control.max, fallback);
}

function withConfigDefaults(config) {
  return {
    ...DEFAULT_FLOCK_OF_BIRDS_CONFIG,
    ...(config && typeof config === 'object' ? config : {}),
  };
}

export function normalizeFlockOfBirdsConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const next = { version: 1 };

  for (const control of FLOCK_OF_BIRDS_CONFIG_CONTROLS) {
    next[control.id] = normalizeFromControl(source, control, DEFAULT_FLOCK_OF_BIRDS_CONFIG[control.id]);
  }

  next.maxSpeed = Math.max(next.cruiseSpeed + 10, next.maxSpeed);
  next.minSpeed = Math.min(next.minSpeed, next.cruiseSpeed);
  next.separationRadius = Math.min(next.separationRadius, next.neighborRadius - 4);
  return next;
}

export function resolveFlockControlValue(control, config) {
  if (typeof control.getValue === 'function') {
    const resolvedValue = control.getValue(withConfigDefaults(config));
    if (Number.isFinite(resolvedValue)) return resolvedValue;
    return control.getValue(DEFAULT_FLOCK_OF_BIRDS_CONFIG);
  }
  return config?.[control.id] ?? DEFAULT_FLOCK_OF_BIRDS_CONFIG[control.id];
}

export function resolveFlockControlPatch(control, value, checked) {
  if (control.type === 'checkbox') return { [control.id]: Boolean(checked) };
  const numeric = Number(value);
  if (typeof control.toPatch === 'function') return control.toPatch(numeric);
  return { [control.id]: numeric };
}

export function formatFlockControlValue(value, control = {}) {
  if (typeof value === 'boolean') return value ? 'on' : 'off';
  if (typeof value === 'number') {
    if (control.display === 'percent') return `${Math.round(value * 100)}%`;
    if (Number.isInteger(value)) return String(value);
    return value.toFixed(value < 1 ? 3 : 2);
  }
  return String(value);
}
