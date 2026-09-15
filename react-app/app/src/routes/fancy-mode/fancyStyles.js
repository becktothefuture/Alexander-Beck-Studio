import { LONDON_PALETTES } from '../../palette/londonPalettes.js';
import { TIME_OF_DAY_PALETTE_PERIODS, getTimeOfDayPalettePeriod } from '../../palette/timeOfDayPalette.js';

export const FANCY_PATTERN_FAMILIES = Object.freeze([
  { value: 0, label: 'Geometric', description: 'Solid squares, clean crosses, open rings and three straight bars.' },
  { value: 1, label: 'Rounded', description: 'Soft blocks, rounded crosses and broad pill-shaped bars.' },
  { value: 2, label: 'Diagonal', description: 'The same simple marks, turned: diamonds, diagonal crosses and slanted bars.' },
  { value: 3, label: 'Bold', description: 'Broader crosses and rings, two bars and fuller dots.' },
]);

export const FANCY_PALETTE_MODES = Object.freeze(LONDON_PALETTES.map((palette, index) => ({
  value: index,
  paletteId: palette.id,
  label: palette.id === 'ryeAfterClosingTurmeric' ? 'Rye / Turmeric' : palette.label,
  shortLabel: ['Bow', 'Silvertown', 'Rye', 'Turmeric'][index],
  family: index,
  colors: palette.light,
  periods: TIME_OF_DAY_PALETTE_PERIODS.filter((period) => period.paletteId === palette.id),
})));

// Atlas updates consult this on every frame. Keep the lookup allocation-free.
const PALETTE_FAMILIES = new Map(FANCY_PALETTE_MODES.map((mode) => [mode.paletteId, mode.family]));

export function getFancyPaletteOverride(config) {
  return FANCY_PALETTE_MODES.find((mode) => mode.value === config.paletteMode)?.paletteId || null;
}

export function resolveFancyPatternFamily(family, followPalette, paletteId) {
  return followPalette ? PALETTE_FAMILIES.get(paletteId) ?? family : family;
}

export function getFancyStyleState(config, metrics, date = new Date()) {
  const period = getTimeOfDayPalettePeriod(date);
  const manual = FANCY_PALETTE_MODES.find((mode) => mode.value === config.paletteMode);
  const palette = manual || FANCY_PALETTE_MODES.find((mode) => mode.paletteId === (metrics?.palette || period.paletteId));
  const family = FANCY_PATTERN_FAMILIES[resolveFancyPatternFamily(config.family, config.followPalette, palette.paletteId)];
  return { palette, family, period, automatic: !manual };
}
