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
    light: ['#a7afb0', '#c6cecf', '#f5f8f6', '#00a5a0', '#031210', '#d7ff2f', '#2c96ff', '#ff7e4a'],
    dark: ['#a7afb0', '#c6cecf', '#f5f8f6', '#00a5a0', '#031210', '#d7ff2f', '#2c96ff', '#ff7e4a'],
    screenshot: '/images/palette-review/river-mist.png',
  },
  {
    id: 'portlandHaze',
    slug: 'portland-haze',
    label: 'High Cloud',
    weather: 'Bright Overcast',
    personality: 'Exact parity with the original runtime.',
    story:
      'This is the original system untouched: the balanced industrial teal chapter that held the site together before we started changing anything. It stays here as the control specimen.',
    words: [
      'original',
      'industrial teal',
      'control',
      'default',
      'teal chapter',
      'amber note',
      'signal red',
      'cobalt accent',
      'familiar',
      'baseline',
      'parity',
      'as-was',
    ],
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#00695c', '#000000', '#f03030', '#0d5cb6', '#ffa000'],
    dark: ['#b5b7b6', '#bbbdbd', '#ffffff', '#00695c', '#000000', '#f03030', '#0d5cb6', '#ffa000'],
    screenshot: '/images/palette-review/portland-haze.png',
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
    light: ['#b6bcc0', '#dbe3e6', '#fffdf6', '#1768ff', '#07111b', '#ff6a00', '#53b9ff', '#d8ff38'],
    dark: ['#b6bcc0', '#dbe3e6', '#fffdf6', '#1768ff', '#07111b', '#ff6a00', '#53b9ff', '#d8ff38'],
    screenshot: '/images/palette-review/blue-break.png',
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
    light: ['#aca1ab', '#d8cdd2', '#fbf0e8', '#8a52ff', '#18081a', '#ff7a12', '#dfff2a', '#88efff'],
    dark: ['#aca1ab', '#d8cdd2', '#fbf0e8', '#8a52ff', '#18081a', '#ff7a12', '#dfff2a', '#88efff'],
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
