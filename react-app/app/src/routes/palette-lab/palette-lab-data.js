import { LONDON_WEATHER_PALETTES as BASE_PALETTES } from '../../palette/londonPalettes.js';

const STRAPLINES_BY_ID = {
  riverMist: 'Rain made luminous: wet streets, cyan reflections, amber windows, and a city that still feels kind.',
  portlandHaze: 'High cloud over stone and glass. Calm neutrals cut by civic blue and a measured ember note.',
  blueBreak: 'Sun between showers. Cobalt, warm signal orange, and a cleaner kind of optimism.',
  sodiumRain: 'Charged haze before weather turns. Indigo air, warm concrete, soft voltage, and held breath.',
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
