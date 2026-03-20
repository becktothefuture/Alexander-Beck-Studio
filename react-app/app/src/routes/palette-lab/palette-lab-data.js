import { LONDON_WEATHER_PALETTES as BASE_PALETTES } from '../../palette/londonPalettes.js';

const STRAPLINES_BY_ID = {
  riverMist: 'Soft drizzle over the Thames. Wet stone, sage railings, and brass hiding in the fog.',
  portlandHaze: 'Bright overcast on Portland stone. Gallery whites, civic blue, and a disciplined red note.',
  blueBreak: 'A shard of blue after rain. Glass, brass, and fresh signal colour moving through the city.',
  sodiumRain: 'Rain after dusk. Sodium amber, wet asphalt, tail lights, and surveillance blue.',
};

export const PALETTE_SLOT_LABELS = [
  'Steel',
  'Mist',
  'Paper',
  'Primary',
  'Ink',
  'Accent A',
  'Accent B',
  'Accent C',
];

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

export const CURRENT_SYSTEM_NOTES = [
  'The live engine still expects 8 stable palette slots per chapter, so the weather palettes keep the same slot structure.',
  'Seven discipline labels in design-system.json still map to 7 unique slot indices with weights that sum to 100 for ball spawning.',
  'Cursor colour is still chosen from contrast-safe chromatic slots only, not from paper white or quiet greys.',
  'Palette chapter selection remains runtime-authored in visual/colors.js; design-system.json governs distribution and shared colour tokens, not the chapter list.',
];
