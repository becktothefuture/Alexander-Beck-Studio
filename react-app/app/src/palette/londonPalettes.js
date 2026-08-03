export const LONDON_WEATHER_PALETTE_COLORS = Object.freeze({
  riverMist: Object.freeze(['#939c99', '#c2c9c4', '#edf0e8', '#006b4b', '#0c1512', '#e4bd16', '#3d8c76', '#d95c3d']),
  portlandHaze: Object.freeze(['#a1a5a3', '#c7cac4', '#f1efe7', '#00685d', '#131816', '#f04430', '#4b9185', '#d99716']),
  blueBreak: Object.freeze(['#9fa8ab', '#cad3d3', '#f3f0e7', '#1557d6', '#0e1822', '#ff5a1f', '#4d9fd6', '#e6a80f']),
  sodiumRain: Object.freeze(['#9d9a92', '#c9c2b6', '#eee8db', '#a63d1f', '#161413', '#e5d20a', '#d2652f', '#008d8d']),
  ryeLaneRush: Object.freeze(['#9a948c', '#c7beb0', '#f0e4d1', '#00704a', '#18120f', '#f2381c', '#2d8e68', '#e3a316']),
  nightTube2049: Object.freeze(['#8f9799', '#c3caca', '#eef1ed', '#007c83', '#0c1114', '#e4472e', '#33b7b2', '#dfa624']),
  barbicanWarning: Object.freeze(['#999790', '#c4c0b5', '#eee8dc', '#d84315', '#171715', '#f2d400', '#ad2e17', '#0057b8']),
  nightBusStatic: Object.freeze(['#96999a', '#c3c7c8', '#edf0ef', '#a60732', '#111416', '#00a88c', '#e23242', '#0868d7']),
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
    id: 'riverMist',
    slug: 'river-mist',
    label: 'Signal Rain',
    weather: 'Rain Front',
    personality: 'Bottle green, traffic amber, wet stone.',
    story:
      'Bottle green and deep teal move through rain-softened stone. Traffic amber gives the field its signal; a restrained rust-red counterpoint keeps it human.',
    words: [
      'wet stone',
      'bottle green',
      'traffic amber',
      'bus glass',
      'crosswalk signal',
      'deep teal',
      'rust red',
      'river skin',
      'station light',
      'soft asphalt',
      'rain front',
      'window warmth',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.riverMist,
    dark: LONDON_WEATHER_PALETTE_COLORS.riverMist,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.riverMist),
  },
  {
    id: 'portlandHaze',
    slug: 'portland-haze',
    label: 'High Cloud',
    weather: 'Bright Overcast',
    personality: 'Architectural, balanced, quietly vivid.',
    story:
      'A clear overcast field built from warm mineral neutrals, enamel teal, and vermilion. Amber adds a precise final note without turning the palette fluorescent.',
    words: [
      'high cloud',
      'enamel teal',
      'vermilion',
      'mineral white',
      'warm concrete',
      'amber marker',
      'clear edge',
      'architectural',
      'balanced field',
      'quiet signal',
      'morning light',
      'measured colour',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.portlandHaze,
    dark: LONDON_WEATHER_PALETTE_COLORS.portlandHaze,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.portlandHaze),
  },
  {
    id: 'blueBreak',
    slug: 'blue-break',
    label: 'Blue Break',
    weather: 'Sun Between Showers',
    personality: 'Open, crisp, confidently bright.',
    story:
      'Sun breaks through after rain in a decisive ultramarine field. Burnt orange and ochre add warmth while a softer blue keeps the scheme open rather than synthetic.',
    words: [
      'ultramarine',
      'after-rain light',
      'river flash',
      'sun on glass',
      'burnt orange',
      'ochre marker',
      'soft blue',
      'warm metal',
      'clear edge',
      'open sky',
      'fast air',
      'blue break',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.blueBreak,
    dark: LONDON_WEATHER_PALETTE_COLORS.blueBreak,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.blueBreak),
  },
  {
    id: 'sodiumRain',
    slug: 'sodium-rain',
    label: 'Heat Veil',
    weather: 'Heat Haze',
    personality: 'Mineral heat, sulfur signal, storm teal.',
    story:
      'The air thickens before summer rain. Iron oxide and hot clay carry the heat, sulfur yellow cuts through the haze, and one storm-teal counterpoint cools the field.',
    words: [
      'heat shimmer',
      'humid glass',
      'iron oxide',
      'hot clay',
      'warm concrete',
      'tube heat',
      'sulfur signal',
      'storm teal',
      'held breath',
      'haze line',
      'summer build',
      'mineral air',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.sodiumRain,
    dark: LONDON_WEATHER_PALETTE_COLORS.sodiumRain,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.sodiumRain),
  },
  {
    id: 'ryeLaneRush',
    slug: 'rye-lane-rush',
    label: 'Rye Lane Rush',
    weather: 'Market After Rain',
    personality: 'Wet concrete, bus brakes, shutters, takeaway amber.',
    story:
      'South London at full volume: market awnings after rain, brake lights catching wet concrete, green shopfronts, shutter red, and takeaway amber holding the street together.',
    words: [
      'Rye Lane',
      'wet concrete',
      'market awning',
      'bus brakes',
      'shopfront green',
      'takeaway amber',
      'shutter red',
      'pavement rush',
      'South London',
      'street rhythm',
      'after rain',
      'painted steel',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.ryeLaneRush,
    dark: LONDON_WEATHER_PALETTE_COLORS.ryeLaneRush,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.ryeLaneRush),
  },
  {
    id: 'nightTube2049',
    slug: 'night-tube-2049',
    label: 'Night Tube',
    weather: 'Platform Afterimage',
    personality: 'Petrol blue, brake light, platform amber.',
    story:
      'Petrol blue and oxidised teal sit against near-black infrastructure. Brake-light red and platform amber provide the signal, with cool glass keeping the night field legible.',
    words: [
      'night tube',
      'live rail',
      'platform glass',
      'petrol blue',
      'oxidised teal',
      'brake light',
      'platform amber',
      'tunnel black',
      'afterimage',
      'late service',
      'station pulse',
      'cool glass',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.nightTube2049,
    dark: LONDON_WEATHER_PALETTE_COLORS.nightTube2049,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.nightTube2049),
  },
  {
    id: 'barbicanWarning',
    slug: 'barbican-warning',
    label: 'Barbican Warning',
    weather: 'Civic Signal',
    personality: 'Raw concrete, fire doors, safety vinyl, wayfinding blue.',
    story:
      'Brutalist civic London reduced to concrete neutrals and uncompromising wayfinding: fire-door red-orange, civic yellow, oxide red, and hard blue.',
    words: [
      'Barbican',
      'raw concrete',
      'fire door',
      'safety vinyl',
      'wayfinding blue',
      'civic signal',
      'service core',
      'loading bay',
      'hard shadow',
      'public realm',
      'oxide red',
      'brutalist calm',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.barbicanWarning,
    dark: LONDON_WEATHER_PALETTE_COLORS.barbicanWarning,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.barbicanWarning),
  },
  {
    id: 'nightBusStatic',
    slug: 'night-bus-static',
    label: 'Night Bus Static',
    weather: 'Transit Glow',
    personality: 'Oxblood, station mint, LED blue, wet asphalt.',
    story:
      'Late London seen through a bus window: oxblood bodywork, red tail-light drag, station mint, and LED blue moving across wet asphalt.',
    words: [
      'night bus',
      'oxblood',
      'tail lights',
      'LED board',
      'wet asphalt',
      'station mint',
      'window static',
      'late interchange',
      'blue display',
      'red drag',
      'empty upper deck',
      'transit glow',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.nightBusStatic,
    dark: LONDON_WEATHER_PALETTE_COLORS.nightBusStatic,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.nightBusStatic),
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

export function getLondonWeatherPaletteAccents(paletteId) {
  return getLondonWeatherPalette(paletteId)?.theme || null;
}
