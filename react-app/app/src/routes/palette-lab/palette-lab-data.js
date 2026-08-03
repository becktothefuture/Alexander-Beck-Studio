import { LONDON_WEATHER_PALETTES as BASE_PALETTES } from '../../palette/londonPalettes.js';
import { TIME_OF_DAY_PALETTE_PERIODS } from '../../palette/timeOfDayPalette.js';

const STRAPLINES_BY_ID = {
  sohoInk: 'Electric blue, taxi amber, and vermilion cut through black London lacquer.',
  thamesWeather: 'Tidal blue and copper light moving through wet stone and river fog.',
  brickLaneSaffron: 'Terracotta and saffron held down by parchment, oxblood, and ink blue.',
  barbicanConcrete: 'Raw concrete with service olive, safety yellow, hard blue, and rust.',
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
