// Stable production source for every simulation colour scheme.
export const LONDON_PALETTE_STATUS = 'stable';

export const LONDON_PALETTE_COLORS = Object.freeze({
  bowWornSignal: Object.freeze(['#7b746e', '#704835', '#ffffff', '#00866b', '#0d0b10', '#7147c6', '#ff4b00', '#0067c5']),
  silvertownCobaltVoltage: Object.freeze(['#74777a', '#86503a', '#ffffff', '#008f4d', '#0a131a', '#bd9530', '#1852ff', '#a34b43']),
  ryeAfterClosing: Object.freeze(['#666666', '#00744a', '#ffffff', '#3344d7', '#07100d', '#f2bd00', '#ff6500', '#9a637f']),
  ryeAfterClosingTurmeric: Object.freeze(['#78716c', '#31543f', '#ffffff', '#0067a5', '#0b100c', '#ffcf00', '#e2231a', '#6942a2']),
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
    id: 'bowWornSignal',
    slug: 'bow-worn-signal',
    label: 'Bow / Worn Signal',
    facet: 'Refined Broadcast',
    personality: 'Signal orange, bottle green, violet ink, council blue, weathered copper.',
    story:
      'Signal orange remains the lead. Bottle green, violet ink, council blue, and weathered copper create a sharper civic-industrial tension.',
    words: [
      'Bow',
      'worn signal',
      'bottle green',
      'violet ink',
      'council blue',
      'weathered copper',
      'signal orange',
      'warm concrete',
      'black ink',
      'rubbed sticker',
      'late broadcast',
      'refined interference',
    ],
    light: LONDON_PALETTE_COLORS.bowWornSignal,
    dark: LONDON_PALETTE_COLORS.bowWornSignal,
    screenshot: null,
    theme: createPaletteTheme(LONDON_PALETTE_COLORS.bowWornSignal),
  },
  {
    id: 'silvertownCobaltVoltage',
    slug: 'silvertown-cobalt-voltage',
    label: 'Silvertown / Cobalt Voltage',
    facet: 'Refined Cobalt',
    personality: 'Electric cobalt, transit green, oxide rust, old brass, kiln red.',
    story:
      'Cobalt remains the signal. Transit green cuts through oxide rust, old brass, and kiln red without becoming a second neon.',
    words: [
      'Silvertown',
      'cobalt voltage',
      'electric blue',
      'transit green',
      'oxide rust',
      'old brass',
      'kiln red',
      'industrial grey',
      'night black',
      'loading bay',
      'cold metal',
      'controlled signal',
    ],
    light: LONDON_PALETTE_COLORS.silvertownCobaltVoltage,
    dark: LONDON_PALETTE_COLORS.silvertownCobaltVoltage,
    screenshot: null,
    theme: createPaletteTheme(LONDON_PALETTE_COLORS.silvertownCobaltVoltage),
  },
  {
    id: 'ryeAfterClosing',
    slug: 'rye-after-closing',
    label: 'Rye / After Closing',
    facet: 'Handled Market Cloth',
    personality: 'Signal orange, cobalt, turmeric, market green, dusty mulberry.',
    story:
      'Hot pink wears down to dusty mulberry, while cobalt, turmeric, market green, and signal orange remain purposefully mismatched.',
    words: [
      'Rye Lane',
      'after closing',
      'handled cloth',
      'market green',
      'cobalt',
      'turmeric',
      'signal orange',
      'dusty mulberry',
      'shutter grey',
      'ink black',
      'worn sportswear',
      'mismatched stock',
    ],
    light: LONDON_PALETTE_COLORS.ryeAfterClosing,
    dark: LONDON_PALETTE_COLORS.ryeAfterClosing,
    screenshot: null,
    theme: createPaletteTheme(LONDON_PALETTE_COLORS.ryeAfterClosing),
  },
  {
    id: 'ryeAfterClosingTurmeric',
    slug: 'rye-after-closing-turmeric',
    label: 'Rye / After Closing',
    facet: 'Refined Market Cloth',
    personality: 'Bus red, enamel blue, turmeric, bottle green, bruised violet.',
    story:
      'Bus red becomes the signal lead. Enamel blue, turmeric, bottle green, and bruised violet keep the mismatched-cloth character without a light-green note.',
    words: [
      'Rye Lane',
      'after closing',
      'refined market cloth',
      'bus red',
      'enamel blue',
      'turmeric',
      'bottle green',
      'bruised violet',
      'warm grey',
      'ink black',
      'quiet friction',
      'edited mismatch',
    ],
    light: LONDON_PALETTE_COLORS.ryeAfterClosingTurmeric,
    dark: LONDON_PALETTE_COLORS.ryeAfterClosingTurmeric,
    screenshot: null,
    theme: createPaletteTheme(LONDON_PALETTE_COLORS.ryeAfterClosingTurmeric),
  },
];

export const DEFAULT_LONDON_PALETTE_ID = LONDON_PALETTES.find(
  (palette) => palette.id === 'silvertownCobaltVoltage',
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
