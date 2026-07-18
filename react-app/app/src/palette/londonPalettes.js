export const LONDON_WEATHER_PALETTE_COLORS = Object.freeze({
  riverMist: Object.freeze(['#a7afb0', '#c6cecf', '#f5f8f6', '#007a4d', '#031210', '#d7ff2f', '#2c96ff', '#ff7e4a']),
  portlandHaze: Object.freeze(['#b5b7b6', '#bbbdbd', '#ffffff', '#00695c', '#000000', '#d7ff2f', '#0d5cb6', '#ffa000']),
  blueBreak: Object.freeze(['#b6bcc0', '#dbe3e6', '#fffdf6', '#1768ff', '#07111b', '#ff6a00', '#53b9ff', '#d8ff38']),
  sodiumRain: Object.freeze(['#aeb2b3', '#d0d4d4', '#f8f8f5', '#8a52ff', '#0b0d0f', '#ff7a12', '#dfff2a', '#88efff']),
  ryeLaneRush: Object.freeze(['#a9a49e', '#d3cec4', '#fff7e8', '#087a55', '#120e0c', '#ff3b12', '#6448ff', '#ffc400']),
  nightTube2049: Object.freeze(['#9da6ad', '#d8e1e5', '#f8ffff', '#00ddeb', '#050611', '#ff2bc2', '#6547ff', '#d6ff00']),
  barbicanWarning: Object.freeze(['#a7a59f', '#d0cec7', '#f6f2e8', '#ff4b00', '#111110', '#f5ff00', '#075cff', '#f0b400']),
  nightBusStatic: Object.freeze(['#a8a5aa', '#d9d3dc', '#fcf7ff', '#c4003b', '#100c15', '#00f0b5', '#2457ff', '#ffb800']),
});

export const LONDON_WEATHER_PALETTES = [
  {
    id: 'riverMist',
    slug: 'river-mist',
    label: 'Signal Rain',
    weather: 'Rain Front',
    personality: 'Wet, charged, humane.',
    story:
      'Rain turns the city into a live interface: soaked pavement, bus glass, crosswalk reflections, and one neon-citrus note cutting through the grey. The warmth comes from windows and people, not nostalgia.',
    words: [
      'wet signal',
      'bus glass',
      'crosswalk glare',
      'umbrella black',
      'window amber',
      'transit blue',
      'river skin',
      'late kindness',
      'station light',
      'soft asphalt',
      'phone glow',
      'rain code',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.riverMist,
    dark: LONDON_WEATHER_PALETTE_COLORS.riverMist,
    screenshot: null,
    theme: {
      linkHoverColor: '#d7ff2f',
      colorAccent: '#ff7e4a',
      heroRoleAccent: '#ff7e4a',
      panelBrand: '#ff7e4a',
    },
  },
  {
    id: 'portlandHaze',
    slug: 'portland-haze',
    label: 'High Cloud',
    weather: 'Bright Overcast',
    personality: 'Neutral, balanced, slightly brighter.',
    story:
      'This keeps the balanced industrial teal chapter that held the site together, with a cleaner light surface for small screens. It stays here as the neutral control specimen.',
    words: [
      'original',
      'industrial teal',
      'control',
      'default',
      'teal chapter',
      'amber note',
      'signal yellow',
      'cobalt accent',
      'familiar',
      'baseline',
      'parity',
      'as-was',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.portlandHaze,
    dark: LONDON_WEATHER_PALETTE_COLORS.portlandHaze,
    screenshot: null,
    theme: {
      linkHoverColor: '#f03030',
      colorAccent: '#f03030',
      heroRoleAccent: '#e10600',
      panelBrand: '#ffa000',
    },
  },
  {
    id: 'blueBreak',
    slug: 'blue-break',
    label: 'Blue Break',
    weather: 'Sun Between Showers',
    personality: 'Spring light, open and electric.',
    story:
      'Sun breaks through after rain and London suddenly feels lighter, faster, more future-facing. This one pushes the optimistic end of the system: hard cobalt, clean sky, warm signal orange, and one acid-citrus spark.',
    words: [
      'cobalt break',
      'after-rain light',
      'river flash',
      'sun on glass',
      'signal orange',
      'warm metal',
      'lift',
      'clear edge',
      'open sky',
      'spring pulse',
      'studio window',
      'fast air',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.blueBreak,
    dark: LONDON_WEATHER_PALETTE_COLORS.blueBreak,
    screenshot: null,
    theme: {
      linkHoverColor: '#ff6a00',
      colorAccent: '#1768ff',
      heroRoleAccent: '#1768ff',
      panelBrand: '#1768ff',
    },
  },
  {
    id: 'sodiumRain',
    slug: 'sodium-rain',
    label: 'Heat Veil',
    weather: 'Heat Haze',
    personality: 'Sulfur-lit, ultraviolet, suspended.',
    story:
      'The air goes thick and bright before summer rain arrives. Pavement lightens, edges shimmer, and colour feels slightly unreal: ultraviolet bruising into chartreuse, with hot metal orange holding the human temperature in the frame.',
    words: [
      'heat shimmer',
      'humid glass',
      'soft voltage',
      'warm concrete',
      'monitor bruise',
      'tube heat',
      'sulfur flash',
      'plum air',
      'held breath',
      'haze line',
      'quiet static',
      'summer build',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.sodiumRain,
    dark: LONDON_WEATHER_PALETTE_COLORS.sodiumRain,
    screenshot: null,
    theme: {
      linkHoverColor: '#ff7a12',
      colorAccent: '#8a52ff',
      heroRoleAccent: '#dfff2a',
      panelBrand: '#dfff2a',
    },
  },
  {
    id: 'ryeLaneRush',
    slug: 'rye-lane-rush',
    label: 'Rye Lane Rush',
    weather: 'Market After Rain',
    personality: 'Wet concrete, bus brakes, shutters, takeaway amber.',
    story:
      'South London at full volume: market awnings after rain, brake lights catching wet concrete, green shopfronts, violet flyers, and takeaway amber holding the street together.',
    words: [
      'Rye Lane',
      'wet concrete',
      'market awning',
      'bus brakes',
      'shopfront green',
      'takeaway amber',
      'violet flyer',
      'shutter red',
      'pavement rush',
      'South London',
      'street rhythm',
      'after rain',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.ryeLaneRush,
    dark: LONDON_WEATHER_PALETTE_COLORS.ryeLaneRush,
    screenshot: null,
    theme: {
      linkHoverColor: '#ff3b12',
      colorAccent: '#087a55',
      heroRoleAccent: '#6448ff',
      panelBrand: '#ffc400',
    },
  },
  {
    id: 'nightTube2049',
    slug: 'night-tube-2049',
    label: 'Night Tube 2049',
    weather: 'Platform Afterimage',
    personality: 'Live rails, platform glass, magenta signal, acid edge.',
    story:
      'A future-facing Night Tube chapter built from cyan platform glass, magenta signal light, ultraviolet afterimage, and one acid edge against near-black infrastructure.',
    words: [
      'night tube',
      'live rail',
      'platform glass',
      'magenta signal',
      'cyan voltage',
      'acid edge',
      'tunnel black',
      'afterimage',
      'future London',
      'late service',
      'screen glow',
      'station pulse',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.nightTube2049,
    dark: LONDON_WEATHER_PALETTE_COLORS.nightTube2049,
    screenshot: null,
    theme: {
      linkHoverColor: '#ff2bc2',
      colorAccent: '#00ddeb',
      heroRoleAccent: '#6547ff',
      panelBrand: '#d6ff00',
    },
  },
  {
    id: 'barbicanWarning',
    slug: 'barbican-warning',
    label: 'Barbican Warning',
    weather: 'Civic Signal',
    personality: 'Raw concrete, fire doors, safety vinyl, wayfinding blue.',
    story:
      'Brutalist civic London reduced to concrete neutrals and uncompromising wayfinding: fire-door orange, safety yellow, hard blue, and an industrial amber marker.',
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
      'warning amber',
      'brutalist calm',
    ],
    light: LONDON_WEATHER_PALETTE_COLORS.barbicanWarning,
    dark: LONDON_WEATHER_PALETTE_COLORS.barbicanWarning,
    screenshot: null,
    theme: {
      linkHoverColor: '#f5ff00',
      colorAccent: '#ff4b00',
      heroRoleAccent: '#075cff',
      panelBrand: '#f0b400',
    },
  },
  {
    id: 'nightBusStatic',
    slug: 'night-bus-static',
    label: 'Night Bus Static',
    weather: 'Transit Glow',
    personality: 'Tail lights, LED boards, wet asphalt, station mint.',
    story:
      'Late London seen through a bus window: red tail-light drag, blue LED boards, station mint, amber stops, and soft lilac reflections moving across wet asphalt.',
    words: [
      'night bus',
      'tail lights',
      'LED board',
      'wet asphalt',
      'station mint',
      'amber stop',
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
    theme: {
      linkHoverColor: '#00f0b5',
      colorAccent: '#c4003b',
      heroRoleAccent: '#2457ff',
      panelBrand: '#ffb800',
    },
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
