export const LONDON_WEATHER_PALETTES = [
  {
    id: 'riverMist',
    slug: 'river-mist',
    label: 'River Mist',
    weather: 'Soft Drizzle',
    personality: 'Quiet, tactile, river-facing.',
    story:
      'A damp Thames morning where concrete, oxidised railings, and wet stone mute the city into a soft instrument. It is the London of embankments, gallery foyers, and umbrellas catching light instead of colour.',
    words: [
      'embankment',
      'drizzle',
      'tide-mark',
      'sage railing',
      'wet stone',
      'museum glass',
      'soft traffic',
      'umbrella',
      'breath',
      'quay',
      'hush',
      'river air',
    ],
    light: ['#a4aba8', '#c9cfcb', '#f7f5ef', '#5e857f', '#121416', '#d36e4b', '#5c7c96', '#d2ad62'],
    dark: ['#6f7875', '#414947', '#d7d5ce', '#87b3ad', '#ece5da', '#ea8762', '#86abc8', '#e4c27b'],
    screenshot: '/images/palette-review/river-mist.png',
  },
  {
    id: 'portlandHaze',
    slug: 'portland-haze',
    label: 'Portland Haze',
    weather: 'Bright Overcast',
    personality: 'Architectural, calm, exacting.',
    story:
      'This is the pale noon London that turns stone into a screen. Portland façades, gallery walls, and soft zinc skies flatten the city into planes, then let a disciplined red or brass note do all the talking.',
    words: [
      'portland stone',
      'cornice',
      'zinc sky',
      'gallery wall',
      'tube map',
      'diffused noon',
      'marble foyer',
      'restraint',
      'silver traffic',
      'drafting table',
      'museum hush',
      'civic blue',
    ],
    light: ['#9ea3a7', '#cfd3d4', '#f6f4ef', '#677a8d', '#101214', '#c6523a', '#2f6270', '#c9b072'],
    dark: ['#71767a', '#474b4e', '#dbd8d1', '#91a5b8', '#ece7df', '#e07358', '#6b95a0', '#ddc38a'],
    screenshot: '/images/palette-review/portland-haze.png',
  },
  {
    id: 'blueBreak',
    slug: 'blue-break',
    label: 'Blue Break',
    weather: 'Sun Between Showers',
    personality: 'Electric, optimistic, wind-cut.',
    story:
      'A sudden clearing after rain. Glass towers pick up a blue shard, puddles turn metallic, and the whole city seems to inhale. It is London in its brief, improbable moments of velocity and lift.',
    words: [
      'clearing',
      'cobalt shard',
      'river flash',
      'wet rail',
      'sun edge',
      'opening',
      'windscreen',
      'quick warmth',
      'tower reflection',
      'brass glare',
      'lift',
      'after-rain',
    ],
    light: ['#a8b0b4', '#d2d8db', '#f8f7f2', '#2f68c8', '#101418', '#ff6c3c', '#2b9fa3', '#ebc349'],
    dark: ['#727d83', '#445056', '#dde3df', '#7cb4ff', '#ece8df', '#ff9062', '#59d1d2', '#f6d56c'],
    screenshot: '/images/palette-review/blue-break.png',
  },
  {
    id: 'sodiumRain',
    slug: 'sodium-rain',
    label: 'Sodium Rain',
    weather: 'Rain After Dusk',
    personality: 'Nocturnal, cinematic, slightly dangerous.',
    story:
      'The London of wet asphalt and orange streetlamps. Night buses, tail lights, fox shadows, and the glow from a late gallery event or basement bar. Reflections do the work; colour arrives in streaks and signals.',
    words: [
      'night bus',
      'wet asphalt',
      'tail light',
      'amber lamp',
      'fox shadow',
      'alley steam',
      'signal red',
      'cctv glow',
      'refraction',
      'late gallery',
      'pooled light',
      'after-dark',
    ],
    light: ['#9c9a9a', '#cac4c0', '#f6f1ea', '#5c639b', '#111215', '#ff722e', '#c54040', '#7aa39c'],
    dark: ['#6b6768', '#423f42', '#ddd2c5', '#8e95d8', '#ece1d4', '#ff9a4b', '#ff6969', '#97c6bf'],
    screenshot: '/images/palette-review/sodium-rain.png',
  },
];

export const DEFAULT_LONDON_WEATHER_PALETTE_ID = LONDON_WEATHER_PALETTES[0].id;

export const LONDON_WEATHER_PALETTE_MAP = Object.freeze(
  LONDON_WEATHER_PALETTES.reduce((acc, palette) => {
    acc[palette.id] = palette;
    return acc;
  }, {})
);

export function resolveLondonWeatherPaletteId(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const byId = LONDON_WEATHER_PALETTE_MAP[raw];
  if (byId) return byId.id;
  const bySlug = LONDON_WEATHER_PALETTES.find((palette) => palette.slug === raw);
  return bySlug ? bySlug.id : null;
}

export function getLondonWeatherPalette(paletteId) {
  const resolvedId = resolveLondonWeatherPaletteId(paletteId) || DEFAULT_LONDON_WEATHER_PALETTE_ID;
  return LONDON_WEATHER_PALETTE_MAP[resolvedId];
}
