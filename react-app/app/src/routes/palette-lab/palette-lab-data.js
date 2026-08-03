import { LONDON_WEATHER_PALETTES as BASE_PALETTES } from '../../palette/londonPalettes.js';
import { TIME_OF_DAY_PALETTE_PERIODS } from '../../palette/timeOfDayPalette.js';

const STRAPLINES_BY_ID = {
  riverMist: 'Bottle green and traffic amber moving through rain-softened stone.',
  portlandHaze: 'Enamel teal and vermilion held inside a clear architectural neutral field.',
  blueBreak: 'Ultramarine after rain, warmed by burnt orange and ochre.',
  sodiumRain: 'Iron oxide and sulfur heat, cut by a single storm-teal counterpoint.',
  ryeLaneRush: 'Shopfront green, shutter red, wet concrete, and takeaway amber.',
  nightTube2049: 'Petrol blue infrastructure with brake-light red and platform amber.',
  barbicanWarning: 'Concrete, fire-door red-orange, civic yellow, and wayfinding blue.',
  nightBusStatic: 'Oxblood and tail-light red against station mint and LED blue.',
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
