export const ABOUT_INTERACTIVE_STACK_KIND = 'interactive-stack';
export const ABOUT_INTERACTIVE_STACK_MIN_ITEMS = 1;
export const ABOUT_INTERACTIVE_STACK_MAX_ITEMS = 40;
export const ABOUT_INTERACTIVE_STACK_VISIBLE_COUNT = 7;

export const ABOUT_INTERACTIVE_STACK_ITEM_TYPES = Object.freeze(['image', 'video']);
export const ABOUT_INTERACTIVE_STACK_FITS = Object.freeze(['cover', 'contain']);

export const ABOUT_INTERACTIVE_STACK_DEFAULTS = Object.freeze({
  seed: 240721,
  stagePaddingPct: 10,
  cardWidthPct: 62,
  spreadXPct: 12,
  spreadYPct: 9,
  rotationDeg: 6,
  scaleJitter: 0.12,
  transitionMs: 420,
});

export const ABOUT_INTERACTIVE_STACK_CONTROLS = Object.freeze([
  Object.freeze({ id: 'stagePaddingPct', label: 'Stage padding', min: 4, max: 22, step: 1, unit: '%' }),
  Object.freeze({ id: 'cardWidthPct', label: 'Card size', min: 45, max: 78, step: 0.5, unit: '%' }),
  Object.freeze({ id: 'spreadXPct', label: 'Horizontal spread', min: 0, max: 25, step: 1, unit: '%' }),
  Object.freeze({ id: 'spreadYPct', label: 'Vertical spread', min: 0, max: 20, step: 1, unit: '%' }),
  Object.freeze({ id: 'rotationDeg', label: 'Rotation', min: 0, max: 15, step: 0.5, unit: 'deg' }),
  Object.freeze({ id: 'scaleJitter', label: 'Size variation', min: 0, max: 0.25, step: 0.01, unit: '' }),
  Object.freeze({ id: 'transitionMs', label: 'Move speed', min: 180, max: 700, step: 10, unit: 'ms' }),
]);

export const ABOUT_INTERACTIVE_STACK_SEED_CONTROL = Object.freeze({
  id: 'seed',
  label: 'Seed',
  min: 0,
  max: 2147483647,
  step: 1,
  unit: '',
});

const CONTROL_BY_ID = new Map([
  ABOUT_INTERACTIVE_STACK_SEED_CONTROL,
  ...ABOUT_INTERACTIVE_STACK_CONTROLS,
].map((control) => [control.id, control]));

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function resolveAboutInteractiveStackParameters(parameters = {}) {
  return Object.fromEntries(Object.entries(ABOUT_INTERACTIVE_STACK_DEFAULTS).map(([id, fallback]) => {
    const control = CONTROL_BY_ID.get(id);
    const numeric = Number(parameters[id]);
    const value = Number.isFinite(numeric) ? numeric : fallback;
    const clamped = clamp(value, control.min, control.max);
    return [id, id === 'seed' ? Math.round(clamped) : clamped];
  }));
}
