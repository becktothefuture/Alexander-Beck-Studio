import { LONDON_WEATHER_PALETTES as BASE_PALETTES } from '../../palette/londonPalettes.js';

const STRAPLINES_BY_ID = {
  riverMist: 'Rain with a neon-citrus interrupt: wet glass, green-black depth, and transit cyan.',
  portlandHaze: 'Exact parity with the original Industrial Teal runtime palette.',
  blueBreak: 'Spring sun after rain: cobalt, signal orange, sky blue, and an acid-citrus spark.',
  sodiumRain: 'Summer air before rain: heat shimmer, ultraviolet, hot metal orange, and sulfur-citrus.',
};

export const LONDON_WEATHER_PALETTES = BASE_PALETTES.map((palette) => ({
  id: palette.id,
  slug: palette.slug,
  name: palette.label,
  weather: palette.weather,
  personality: palette.personality,
  strapline: STRAPLINES_BY_ID[palette.id],
  story: palette.story,
  words: palette.words,
  palette: {
    light: palette.light,
    dark: palette.dark,
  },
  screenshot: palette.screenshot,
}));
