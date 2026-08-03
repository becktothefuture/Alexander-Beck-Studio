export const LONDON_WEATHER_PALETTE_COLORS = Object.freeze({
  sohoSignal: Object.freeze(['#87919a', '#c7ced2', '#f3f1e9', '#0067ff', '#0c1117', '#ffd000', '#ff4b2b', '#008fa8']),
  thamesData: Object.freeze(['#708591', '#b7c7ce', '#eef2ef', '#005c78', '#071820', '#00b8d4', '#2d82a6', '#e2b42b']),
  barbicanProtocol: Object.freeze(['#858a87', '#b8bcb8', '#eceae1', '#2368ff', '#101411', '#d8f500', '#00a6a0', '#ff6a00']),
  nightBusMesh: Object.freeze(['#7e8991', '#bcc5ca', '#f0eee8', '#d7193f', '#0d1116', '#00a7ff', '#285ddb', '#30c6d2']),
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
    id: 'sohoSignal',
    slug: 'soho-signal',
    label: 'Soho Signal',
    weather: 'Network After Rain',
    personality: 'Electric blue, taxi amber, vermilion, wet-screen cyan.',
    story:
      'Zinc, chrome, paper, and screen black ground a sharp field of electric blue, taxi amber, vermilion, and wet-screen cyan. It reads like Soho signage reflected through a live network after rain.',
    words: [
      'Soho',
      'network signal',
      'electric blue',
      'taxi amber',
      'vermilion',
      'zinc',
      'chrome',
      'wet screen',
      'city data',
      'paper white',
      'city pulse',
      'after rain',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.sohoSignal,
    dark: LONDON_WEATHER_PALETTE_COLORS.sohoSignal,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.sohoSignal),
  },
  {
    id: 'thamesData',
    slug: 'thames-data',
    label: 'Thames Data',
    weather: 'River Network',
    personality: 'Cold river steel, data cyan, tidal blue, sodium brass.',
    story:
      'Cold river steel, mist, cloud, and deep water carry the quiet base. Data cyan and river blue make the Thames feel connected and contemporary, with one restrained sodium-brass signal.',
    words: [
      'Thames',
      'river network',
      'data cyan',
      'tidal blue',
      'river steel',
      'deep water',
      'mist',
      'bridge steel',
      'cold cloud',
      'embankment',
      'sodium brass',
      'glass towers',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.thamesData,
    dark: LONDON_WEATHER_PALETTE_COLORS.thamesData,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.thamesData),
  },
  {
    id: 'barbicanProtocol',
    slug: 'barbican-protocol',
    label: 'Barbican Protocol',
    weather: 'Civic Systems',
    personality: 'Concrete, protocol blue, safety lime, interface aqua.',
    story:
      'Concrete, aggregate, chalk, and control black establish a hard civic base. Protocol blue, safety lime, interface aqua, and one service-orange note turn the Barbican into an active control system.',
    words: [
      'Barbican',
      'civic protocol',
      'raw concrete',
      'aggregate',
      'protocol blue',
      'safety lime',
      'interface aqua',
      'service orange',
      'control room',
      'civic deck',
      'public system',
      'hard signal',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.barbicanProtocol,
    dark: LONDON_WEATHER_PALETTE_COLORS.barbicanProtocol,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.barbicanProtocol),
  },
  {
    id: 'nightBusMesh',
    slug: 'night-bus-mesh',
    label: 'Night Bus Mesh',
    weather: 'Transit After Dark',
    personality: 'Bus red, link blue, LED cyan, pixel aqua.',
    story:
      'Road steel, LED haze, ticket paper, and night glass carry a cool transit base. Bus red connects to link blue, LED cyan, and pixel aqua like a moving London network after dark.',
    words: [
      'night bus',
      'transit mesh',
      'bus red',
      'link blue',
      'LED cyan',
      'pixel aqua',
      'road steel',
      'ticket paper',
      'night glass',
      'moving network',
      'route map',
      'London after dark',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.nightBusMesh,
    dark: LONDON_WEATHER_PALETTE_COLORS.nightBusMesh,
    screenshot: null,
    theme: createPaletteTheme(LONDON_WEATHER_PALETTE_COLORS.nightBusMesh),
  },
];

export const DEFAULT_LONDON_WEATHER_PALETTE_ID = LONDON_WEATHER_PALETTES.find(
  (palette) => palette.id === 'thamesData',
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
