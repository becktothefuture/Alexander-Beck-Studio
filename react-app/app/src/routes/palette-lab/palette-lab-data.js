import { LONDON_WEATHER_PALETTES as BASE_PALETTES } from '../../palette/londonPalettes.js';
import { TIME_OF_DAY_PALETTE_PERIODS } from '../../palette/timeOfDayPalette.js';

const STRAPLINES_BY_ID = {
  riverMist: 'Rain with a neon-citrus interrupt: wet glass, green-black depth, and transit cyan.',
  portlandHaze: 'Exact parity with the original Industrial Teal runtime palette.',
  blueBreak: 'Spring sun after rain: cobalt, signal orange, sky blue, and an acid-citrus spark.',
  sodiumRain: 'Summer air before rain: heat shimmer, ultraviolet, hot metal orange, and sulfur-citrus.',
  ryeLaneRush: 'South London market energy: wet concrete, hard red, violet print, and takeaway amber.',
  nightTube2049: 'Future Night Tube voltage: platform cyan, magenta signal, ultraviolet, and acid light.',
  barbicanWarning: 'Brutalist civic signal: concrete, fire-door orange, safety yellow, and hard blue.',
  nightBusStatic: 'Late transit through wet glass: tail-light red, display blue, station mint, and amber.',
};

export const LONDON_WEATHER_PALETTES = BASE_PALETTES.map((palette) => ({
  id: palette.id,
  slug: palette.slug,
  name: palette.label,
  weather: palette.weather,
  personality: palette.personality,
  strapline: STRAPLINES_BY_ID[palette.id],
  schedule: TIME_OF_DAY_PALETTE_PERIODS.find((period) => period.paletteId === palette.id),
  story: palette.story,
  words: palette.words,
  palette: {
    light: palette.light,
    dark: palette.dark,
  },
  screenshot: palette.screenshot,
}));
