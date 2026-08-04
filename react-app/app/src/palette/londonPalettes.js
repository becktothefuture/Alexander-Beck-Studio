// Stable production source for every simulation colour scheme.
export const LONDON_PALETTE_STATUS = 'stable';

export const LONDON_PALETTE_COLORS = Object.freeze({
  sohoSignal: Object.freeze(['#87919a', '#c7ced2', '#f3f1e9', '#0067ff', '#0c1117', '#ffd000', '#ff4b2b', '#008fa8']),
  thamesData: Object.freeze(['#708591', '#b7c7ce', '#eef2ef', '#005c78', '#071820', '#c95332', '#3f72c8', '#d5b23a']),
  barbicanProtocol: Object.freeze(['#858a87', '#b8bcb8', '#eceae1', '#245fda', '#101411', '#d8e316', '#bd4936', '#f28a22']),
  nightBusMesh: Object.freeze(['#7e8991', '#bcc5ca', '#f0eee8', '#d7193f', '#0d1116', '#00a7ff', '#e3a21a', '#36b7a0']),
});

function createPaletteTheme(colors) {
  return Object.freeze({
    linkHoverColor: colors[5],
    colorAccent: colors[3],
    heroRoleAccent: colors[7],
    panelBrand: colors[6],
  });
}

export const LONDON_PALETTES = [
  {
    id: 'sohoSignal',
    slug: 'soho-signal',
    label: 'Soho Signal',
    facet: 'Network After Rain',
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
    light: LONDON_PALETTE_COLORS.sohoSignal,
    dark: LONDON_PALETTE_COLORS.sohoSignal,
    screenshot: null,
    theme: createPaletteTheme(LONDON_PALETTE_COLORS.sohoSignal),
  },
  {
    id: 'thamesData',
    slug: 'thames-data',
    label: 'Thames Data',
    facet: 'River Network',
    personality: 'Tidal teal, signal copper, bridge blue, sodium brass.',
    story:
      'River steel, mist, cloud, and deep water carry the quiet base. Signal copper, bridge blue, and sodium brass cross the cooler field like moving infrastructure reflected on the Thames.',
    words: [
      'Thames',
      'river network',
      'tidal teal',
      'signal copper',
      'bridge blue',
      'river steel',
      'deep water',
      'mist',
      'cold cloud',
      'embankment',
      'sodium brass',
      'glass towers',
    ],
    light: LONDON_PALETTE_COLORS.thamesData,
    dark: LONDON_PALETTE_COLORS.thamesData,
    screenshot: null,
    theme: createPaletteTheme(LONDON_PALETTE_COLORS.thamesData),
  },
  {
    id: 'barbicanProtocol',
    slug: 'barbican-protocol',
    label: 'Barbican Protocol',
    facet: 'Civic Systems',
    personality: 'Concrete, protocol blue, safety lime, oxide red, service orange.',
    story:
      'Concrete, aggregate, chalk, and control black establish a hard civic base. Protocol blue, safety lime, fire-door oxide, and service orange make the Barbican feel inhabited as well as infrastructural.',
    words: [
      'Barbican',
      'civic protocol',
      'raw concrete',
      'aggregate',
      'protocol blue',
      'safety lime',
      'fire-door oxide',
      'service orange',
      'control room',
      'civic deck',
      'public system',
      'hard signal',
    ],
    light: LONDON_PALETTE_COLORS.barbicanProtocol,
    dark: LONDON_PALETTE_COLORS.barbicanProtocol,
    screenshot: null,
    theme: createPaletteTheme(LONDON_PALETTE_COLORS.barbicanProtocol),
  },
  {
    id: 'nightBusMesh',
    slug: 'night-bus-mesh',
    label: 'Night Bus Mesh',
    facet: 'Transit After Dark',
    personality: 'Bus red, LED blue, sodium amber, ticket-machine teal.',
    story:
      'Road steel, LED haze, ticket paper, and night glass carry the base. Bus red, display blue, sodium amber, and ticket-machine teal cross it like different layers of London moving after dark.',
    words: [
      'night bus',
      'transit mesh',
      'bus red',
      'LED blue',
      'sodium amber',
      'ticket-machine teal',
      'road steel',
      'ticket paper',
      'night glass',
      'moving network',
      'route map',
      'London after dark',
    ],
    light: LONDON_PALETTE_COLORS.nightBusMesh,
    dark: LONDON_PALETTE_COLORS.nightBusMesh,
    screenshot: null,
    theme: createPaletteTheme(LONDON_PALETTE_COLORS.nightBusMesh),
  },
];

export const DEFAULT_LONDON_PALETTE_ID = LONDON_PALETTES.find(
  (palette) => palette.id === 'thamesData',
)?.id || LONDON_PALETTES[0].id;

export const LONDON_PALETTE_MAP = Object.freeze(
  LONDON_PALETTES.reduce((acc, palette) => {
    acc[palette.id] = palette;
    return acc;
  }, {})
);

export function resolveLondonPaletteId(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const byId = LONDON_PALETTE_MAP[raw];
  if (byId) return byId.id;
  const bySlug = LONDON_PALETTES.find((palette) => palette.slug === raw);
  return bySlug ? bySlug.id : null;
}

export function getLondonPalette(paletteId) {
  const resolvedId = resolveLondonPaletteId(paletteId) || DEFAULT_LONDON_PALETTE_ID;
  return LONDON_PALETTE_MAP[resolvedId];
}

export function getLondonPaletteAccents(paletteId) {
  return getLondonPalette(paletteId)?.theme || null;
}
