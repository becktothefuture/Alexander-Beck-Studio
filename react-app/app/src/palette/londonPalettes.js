export const LONDON_WEATHER_PALETTES = [
  {
    id: 'riverMist',
    slug: 'river-mist',
    label: 'Signal Rain',
    weather: 'Rain Front',
    personality: 'Wet, humane, neon at the edges.',
    story:
      'Rain turns the city into a screen: black pavement, pale stone, cyan transit reflections, amber windows. It feels technical but never cold, as if the city is being powered by infrastructure and small acts of kindness at the same time.',
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
    light: ['#949da5', '#ccd4db', '#f2f4f4', '#14a9e3', '#12161a', '#ff8557', '#6bb6ff', '#f1cb55'],
    dark: ['#5d666f', '#373d44', '#dbe1e2', '#62dcff', '#edf1f0', '#ff9d72', '#94cbff', '#ffdf74'],
    screenshot: '/images/palette-review/river-mist.png',
  },
  {
    id: 'portlandHaze',
    slug: 'portland-haze',
    label: 'High Cloud',
    weather: 'Bright Overcast',
    personality: 'Controlled, lucid, quietly electric.',
    story:
      'High cloud over London makes everything legible: facades, interfaces, meeting rooms, gallery walls. Then a clean blue and a tempered ember cut through the neutrality and give the city a pulse without losing discipline.',
    words: [
      'portland stone',
      'zinc noon',
      'screen white',
      'civic blue',
      'soft chrome',
      'drafting table',
      'elevator glow',
      'glass lobby',
      'measured warmth',
      'quiet power',
      'human systems',
      'clarity',
      'museum hush',
    ],
    light: ['#adb2b6', '#d9dcde', '#f7f5ef', '#5f7fc2', '#101317', '#ff7348', '#90c8ff', '#e3c66c'],
    dark: ['#7b8085', '#4d5358', '#e1ddd5', '#95b4ff', '#ece8df', '#ff9b6d', '#bee0ff', '#efd47f'],
    screenshot: '/images/palette-review/portland-haze.png',
  },
  {
    id: 'blueBreak',
    slug: 'blue-break',
    label: 'Blue Break',
    weather: 'Sun Between Showers',
    personality: 'Open, fast, optimistic.',
    story:
      'Sun breaks through after rain and the city switches on. Cobalt hits glass, pavements brighten, and warm signal colour keeps the optimism grounded in people rather than spectacle.',
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
    light: ['#b3b9be', '#dbe0e3', '#f8f6ef', '#366ed8', '#11151a', '#ff6e34', '#64aaf2', '#f3ca49'],
    dark: ['#788189', '#47515a', '#e2e5e0', '#83b8ff', '#ece9e1', '#ff945c', '#92cdff', '#ffe06b'],
    screenshot: '/images/palette-review/blue-break.png',
  },
  {
    id: 'sodiumRain',
    slug: 'sodium-rain',
    label: 'Pressure Glow',
    weather: 'Charged Haze',
    personality: 'Pressurised, warm, anticipatory.',
    story:
      'The air thickens before a storm or a hot evening shower. Screens feel brighter, concrete feels warmer, and the whole city holds a charged softness, half weather, half circuitry.',
    words: [
      'storm pressure',
      'humid glass',
      'soft voltage',
      'warm concrete',
      'monitor glow',
      'tube heat',
      'amber cloud',
      'indigo air',
      'held breath',
      'charged dusk',
      'quiet static',
      'summer threat',
    ],
    light: ['#a39ea3', '#d2c8c2', '#f5eee6', '#5b6de0', '#101216', '#ff7a2f', '#ff5d5d', '#9bc4c7'],
    dark: ['#6f6a70', '#444146', '#e0d4ca', '#909cff', '#ece1d6', '#ffa155', '#ff7676', '#b6d9da'],
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
