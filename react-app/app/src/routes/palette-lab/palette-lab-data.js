import { LONDON_PALETTES } from '../../palette/londonPalettes.js';
import { TIME_OF_DAY_PALETTE_PERIODS } from '../../palette/timeOfDayPalette.js';

export const PALETTE_ROLE_DISTRIBUTION = Object.freeze([
  Object.freeze({ label: 'Product Design', shortLabel: 'PD', colorIndex: 0, weight: 31 }),
  Object.freeze({ label: 'Experience Design', shortLabel: 'XD', colorIndex: 3, weight: 13 }),
  Object.freeze({ label: 'Art Direction', shortLabel: 'AD', colorIndex: 2, weight: 16 }),
  Object.freeze({ label: 'Motion & 3D', shortLabel: 'M3', colorIndex: 6, weight: 20 }),
  Object.freeze({ label: 'Creative Engineering', shortLabel: 'CE', colorIndex: 7, weight: 10 }),
  Object.freeze({ label: 'Parametric Systems', shortLabel: 'PS', colorIndex: 5, weight: 10 }),
]);

export const PALETTE_MATERIAL_LABELS = Object.freeze([
  'Product Design',
  'Material echo',
  'Art Direction',
  'Experience Design',
  'Ground',
  'Parametric Systems',
  'Motion & 3D',
  'Creative Engineering',
]);

function formatSchedule(paletteId) {
  return TIME_OF_DAY_PALETTE_PERIODS
    .filter((period) => period.paletteId === paletteId)
    .map((period) => period.hours)
    .join(' / ');
}

export const PRODUCTION_PALETTE_CARDS = Object.freeze(LONDON_PALETTES.map((palette, index) => (
  Object.freeze({
    id: palette.id,
    name: palette.label,
    facet: palette.facet,
    designer: `Production palette ${String(index + 1).padStart(2, '0')}`,
    note: palette.story,
    kind: 'live',
    lifecycle: 'STABLE',
    schedule: formatSchedule(palette.id),
    palette: Object.freeze({
      light: palette.light,
      dark: palette.dark,
    }),
  })
)));
