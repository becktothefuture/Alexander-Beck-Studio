// Authored defaults and control schema for this isolated study. Production
// design-system.json remains the owner of the ordinary site's design values.
import { FANCY_SHAPES } from './fancyPatterns.js';
import { FANCY_PALETTE_MODES, FANCY_PATTERN_FAMILIES } from './fancyStyles.js';

export const FANCY_GROUPS = [
  { id: 'material', label: 'Material' },
  { id: 'patterns', label: 'Patterns' },
  { id: 'ripples', label: 'Ripples' },
];

export const FANCY_CONTROLS = [
  { id: 'cell', label: 'Cell size', group: 'material', default: 0, min: 6, max: 24, step: 1, unit: 'px', help: 'Grid spacing in screen pixels, independent of pixel density.' },
  { id: 'fill', label: 'Cell fill', group: 'material', default: 1, min: 0.5, max: 1, step: 0.05, unit: '%', help: 'The size of each mark within its cell.' },
  { id: 'coverage', label: 'Coverage', group: 'material', default: 1.45, min: 0.85, max: 2.2, step: 0.05, unit: '×', help: 'How far each particle spreads into nearby cells.' },
  { id: 'opacity', label: 'Opacity', group: 'material', default: 1, min: 0.25, max: 1, step: 0.05, unit: '%', help: 'Overall strength of the flat pigment.' },
  { id: 'adaptSimulation', label: 'Adapt to simulation', group: 'material', type: 'boolean', default: false, help: 'Tune coverage and trails for each simulation. Physics and colours stay the same.' },
  { id: 'paletteMode', label: 'Colour mode', group: 'patterns', type: 'select', default: -1, options: [
    { value: -1, label: 'Automatic · local time' }, ...FANCY_PALETTE_MODES,
  ], help: 'Preview the four existing palettes, or follow their local-time schedule. This selection stays in the separate study.' },
  { id: 'followPalette', label: 'Follow colours', group: 'patterns', type: 'boolean', default: false, help: 'Change the pattern variation with the palette. Selecting a pattern manually switches this off.' },
  { id: 'family', label: 'Pattern family', group: 'patterns', type: 'select', default: 0, options: FANCY_PATTERN_FAMILIES,
    help: 'Four versions of the same six expertise patterns. Choosing one pins it; Follow colours restores the palette pairings.' },
  { id: 'shape', label: 'Shapes', group: 'patterns', type: 'select', default: -1, options: [
    { value: -1, label: 'By expertise' }, ...FANCY_SHAPES,
  ], help: 'Match the six legend patterns, or apply one shape to every category.' },
  { id: 'gridLock', label: 'Grid alignment', group: 'patterns', default: 1, min: 0, max: 1, step: 0.05, unit: '%', help: 'At 100% marks stay centred on the grid. Lower values let them follow the nearby particles slightly.' },
  { id: 'patternScale', label: 'Pattern scale', group: 'patterns', default: 1, min: 0.5, max: 2, step: 0.05, unit: '×', help: 'The size of coherent bands in transitions and empty-space ripples.' },
  { id: 'richness', label: 'Richness', group: 'patterns', default: 0.85, min: 0.2, max: 1.4, step: 0.05, unit: '%', help: 'How strongly the occasional discs resolve into their expertise pattern.' },
  { id: 'wake', label: 'Wake duration', group: 'patterns', default: 1, min: 0, max: 3, step: 0.1, unit: '×', help: 'How long marks linger after the particles move. Zero removes the wake.' },
  { id: 'motionResponse', label: 'Motion response', group: 'patterns', default: 1, min: 0, max: 2, step: 0.1, unit: '×', help: 'How much particle movement activates the patterns.' },
  { id: 'titleClearance', label: 'Title clearance', group: 'patterns', default: 0.9, min: 0, max: 1, step: 0.05, unit: '%', help: 'Reduces marks behind the title. Lower values can make it harder to read.' },
  { id: 'copyClearance', label: 'Copy protection', group: 'patterns', default: 0.8, min: 0, max: 0.8, step: 0.05, unit: '%', help: 'Home uses soft shadows behind the legend, introduction and footer. Capped at 80% so particles remain visible. Other views reduce nearby marks.' },
  { id: 'touchRipples', label: 'Touch ripples', group: 'ripples', type: 'boolean', default: true, help: 'Create ripples from touch or pen taps and drags. Particle interaction stays active.' },
  { id: 'mouseRipples', label: 'Mouse ripples', group: 'ripples', type: 'boolean', default: true, help: 'Create ripples from mouse movement and clicks.' },
  { id: 'introRipple', label: 'Opening ripple', group: 'ripples', type: 'boolean', default: true, help: 'Play the single introduction ripple when a simulation opens.' },
  { id: 'rippleStrength', label: 'Strength', group: 'ripples', default: 1, min: 0, max: 2, step: 0.05, unit: '×', help: 'How strongly each wave reveals and changes the cells.' },
  { id: 'rippleSpeed', label: 'Speed', group: 'ripples', default: 185, min: 80, max: 360, step: 5, unit: 'px/s', help: 'How quickly the wave travels outward.' },
  { id: 'rippleWidth', label: 'Width', group: 'ripples', default: 64, min: 24, max: 128, step: 4, unit: 'px', help: 'The width of the moving band of active cells.' },
  { id: 'rippleLife', label: 'Lifespan', group: 'ripples', default: 4.8, min: 1, max: 8, step: 0.2, unit: 's', help: 'How long a ripple lasts before it disappears.' },
  { id: 'reveal', label: 'Empty space', group: 'ripples', default: 0.32, min: 0, max: 0.7, step: 0.02, unit: '%', help: 'How much a ripple reveals where there are no particles.' },
];

export const FANCY_DEFAULT_CONFIG = Object.freeze({
  fancy: true, dark: true, artwork: false,
  ...Object.fromEntries(FANCY_CONTROLS.map((control) => [control.id, control.default])),
});

// A second authored starting point for the full Home study. The original
// three-simulation study keeps its defaults, including its finer adaptive grid.
export const FANCY_HOME_DEFAULT_CONFIG = Object.freeze({
  ...FANCY_DEFAULT_CONFIG,
  cell: 15, fill: 1, coverage: 0.85, family: 1, followPalette: true, gridLock: 1,
  patternScale: 2, richness: 1.4, wake: 0.3, motionResponse: 2,
  adaptSimulation: true, copyClearance: 0.8,
  touchRipples: true, mouseRipples: true, introRipple: true,
  rippleStrength: 0, rippleWidth: 76, rippleLife: 8,
});

export function normalizeFancyConfig(input = {}) {
  const config = { ...FANCY_DEFAULT_CONFIG };
  for (const key of ['fancy', 'dark', 'artwork']) {
    if (typeof input[key] === 'boolean') config[key] = input[key];
  }
  for (const control of FANCY_CONTROLS) {
    const raw = input[control.id];
    if (raw === undefined || raw === null || raw === '') continue;
    if (control.type === 'boolean') {
      if (typeof raw === 'boolean') config[control.id] = raw;
      continue;
    }
    const value = Number(raw);
    if (!Number.isFinite(value)) continue;
    if (control.type === 'select') {
      if (control.options.some((option) => option.value === value)) config[control.id] = value;
    } else if (control.id === 'cell' && value === 0) {
      config.cell = 0;
    } else {
      const bounded = Math.max(control.min, Math.min(control.max, value));
      config[control.id] = Number((control.min + Math.round((bounded - control.min) / control.step) * control.step).toFixed(4));
    }
  }
  return config;
}

export function readFancyConfig(params, defaults = FANCY_DEFAULT_CONFIG) {
  const values = {
    ...defaults,
    fancy: params.get('finish') !== 'normal',
    dark: params.get('ground') !== 'white',
    artwork: params.get('artwork') === '1',
  };
  for (const control of FANCY_CONTROLS) {
    if (!params.has(control.id)) continue;
    const raw = params.get(control.id);
    if (control.type !== 'boolean') values[control.id] = raw;
    else if (raw === '0' || raw === '1') values[control.id] = raw === '1';
  }
  return normalizeFancyConfig(values);
}

export function fancySearchParams(config, simulation, defaults = FANCY_DEFAULT_CONFIG) {
  const values = normalizeFancyConfig(config);
  const params = new URLSearchParams({ mode: simulation, finish: values.fancy ? 'fancy' : 'normal', ground: values.dark ? 'black' : 'white' });
  for (const control of FANCY_CONTROLS) {
    if (values[control.id] === defaults[control.id]) continue;
    params.set(control.id, control.type === 'boolean' ? (values[control.id] ? '1' : '0') : String(values[control.id]));
  }
  if (values.artwork) params.set('artwork', '1');
  return params;
}

export function fancyControlValue(control, value) {
  if (control.unit === '%') return `${Math.round(value * 100)}%`;
  return `${Number(value.toFixed(2))}${control.unit === '×' ? '×' : ` ${control.unit}`}`;
}
