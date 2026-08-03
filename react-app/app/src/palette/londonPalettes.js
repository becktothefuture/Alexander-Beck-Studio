export const LONDON_WEATHER_PALETTE_COLORS = Object.freeze({
  sohoInk: Object.freeze(['#8a9196', '#c3c8ca', '#f2eee6', '#0057b8', '#101214', '#f2c500', '#e3482e', '#007f96']),
  thamesWeather: Object.freeze(['#788a94', '#b7c3c8', '#e9ece7', '#0a5268', '#10191f', '#d56b2c', '#2f7f9d', '#b58b2b']),
  brickLaneSaffron: Object.freeze(['#a18170', '#d1b293', '#f4e5cf', '#b54425', '#211713', '#e39a06', '#7b2e1d', '#245b86']),
  barbicanConcrete: Object.freeze(['#858781', '#b7b7af', '#e7e3d8', '#425f1f', '#151613', '#d4aa00', '#1f568f', '#b6632d']),
});

function createPaletteTheme(colors) {
  return Object.freeze({
    linkHoverColor: colors[5],
    colorAccent: colors[3],
    heroRoleAccent: colors[7],
    panelBrand: colors[6],
  });
}

export const LONDON_WEATHER_PALETTES = [
  {
    id: 'sohoInk',
    slug: 'soho-ink',
    label: 'Soho Ink',
    weather: 'City After Rain',
    personality: 'Black lacquer, electric blue, taxi amber, vermilion.',
    story:
      'A sharp London graphic language drawn from black shopfronts, blue enamel signs, taxi amber, and vermilion reflected on wet pavement. The chrome and paper neutrals keep its energy adult and editorial.',
    words: [
      'Soho',
      'black lacquer',
      'electric blue',
      'taxi amber',
      'vermilion',
      'chrome type',
      'wet pavement',
      'late edition',
      'neon reflection',
      'paper white',
      'city pulse',
      'sharp ink',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.sohoInk,
    dark: LONDON_WEATHER_PALETTE_COLORS.sohoInk,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.sohoInk),
  },
  {
    id: 'thamesWeather',
    slug: 'thames-weather',
    label: 'Thames Weather',
    weather: 'River Front',
    personality: 'Tidal blue, wet stone, copper light.',
    story:
      'Cold river blues sit against rain-dark stone and pale cloud. Copper and old brass bring the warmth of lamps, bridges, and working metal without turning the field quaint.',
    words: [
      'Thames',
      'tidal blue',
      'wet stone',
      'river fog',
      'copper light',
      'old brass',
      'bridge steel',
      'cold cloud',
      'embankment',
      'weather front',
      'deep water',
      'working metal',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.thamesWeather,
    dark: LONDON_WEATHER_PALETTE_COLORS.thamesWeather,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.thamesWeather),
  },
  {
    id: 'brickLaneSaffron',
    slug: 'brick-lane-saffron',
    label: 'Brick Lane Saffron',
    weather: 'Market Light',
    personality: 'Terracotta, saffron, parchment, ink blue.',
    story:
      'Terracotta, oxblood, and saffron carry the warmth of brick, painted shutters, kitchens, and evening light. Parchment and a single ink-blue note keep it rich rather than festive.',
    words: [
      'Brick Lane',
      'terracotta',
      'saffron',
      'parchment',
      'oxblood',
      'ink blue',
      'painted shutter',
      'market light',
      'warm brick',
      'late table',
      'paper menu',
      'East London',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.brickLaneSaffron,
    dark: LONDON_WEATHER_PALETTE_COLORS.brickLaneSaffron,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.brickLaneSaffron),
  },
  {
    id: 'barbicanConcrete',
    slug: 'barbican-concrete',
    label: 'Barbican Concrete',
    weather: 'Civic Overcast',
    personality: 'Raw concrete, service olive, safety yellow, hard blue.',
    story:
      'Raw concrete and chalky aggregate form a severe civic base. Service-door olive, safety yellow, hard blue, and rust make it feel infrastructural and unmistakably Barbican.',
    words: [
      'Barbican',
      'raw concrete',
      'aggregate',
      'service olive',
      'safety yellow',
      'hard blue',
      'rust plate',
      'civic deck',
      'loading bay',
      'brutalist',
      'hard shadow',
      'public realm',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.barbicanConcrete,
    dark: LONDON_WEATHER_PALETTE_COLORS.barbicanConcrete,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.barbicanConcrete),
  },
];

export const DEFAULT_LONDON_WEATHER_PALETTE_ID = LONDON_WEATHER_PALETTES.find(
  (palette) => palette.id === 'thamesWeather',
)?.id || LONDON_WEATHER_PALETTES[0].id;

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

export function getLondonWeatherPaletteAccents(paletteId) {
  return getLondonWeatherPalette(paletteId)?.theme || null;
}
