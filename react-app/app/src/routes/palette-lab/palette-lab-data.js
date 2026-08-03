import { LONDON_WEATHER_PALETTES as BASE_PALETTES } from '../../palette/londonPalettes.js';
import { TIME_OF_DAY_PALETTE_PERIODS } from '../../palette/timeOfDayPalette.js';

const STRAPLINES_BY_ID = {
  sohoSignal: 'Electric signage, wet-screen cyan, and taxi amber cut through zinc and screen black.',
  thamesData: 'Cold river steel and data cyan move through mist, glass, and one sodium signal.',
  barbicanProtocol: 'Brutalist concrete meets protocol blue, safety lime, and interface aqua.',
  nightBusMesh: 'Transit red connects link blue, LED cyan, and pixel aqua across night glass.',
};

export const LONDON_WEATHER_PALETTES = BASE_PALETTES.map((palette) => ({
  id: palette.id,
  slug: palette.slug,
  name: palette.label,
  weather: palette.weather,
  personality: palette.personality,
  strapline: STRAPLINES_BY_ID[palette.id],
  schedule: TIME_OF_DAY_PALETTE_PERIODS.filter((period) => period.paletteId === palette.id),
  story: palette.story,
  words: palette.words,
  palette: {
    light: palette.light,
    dark: palette.dark,
  },
  screenshot: palette.screenshot,
}));
