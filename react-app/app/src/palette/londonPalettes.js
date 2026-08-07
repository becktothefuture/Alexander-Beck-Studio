// Stable production source for every simulation colour scheme.
export const LONDON_PALETTE_STATUS = 'stable';

export const LONDON_PALETTE_COLORS = Object.freeze({
  bowWornSignal: Object.freeze(['#747474', '#553875', '#ffffff', '#1aae7d', '#0b090c', '#87915a', '#ff4b00', '#cf287c']),
  silvertownCobaltVoltage: Object.freeze(['#747474', '#71463a', '#ffffff', '#556a64', '#0c1118', '#8e764d', '#1557ff', '#695a74']),
  ryeAfterClosing: Object.freeze(['#666666', '#00744a', '#ffffff', '#3344d7', '#07100d', '#f2bd00', '#ff6500', '#9a637f']),
  ryeAfterClosingTurmeric: Object.freeze(['#747474', '#246147', '#ffffff', '#3b4ed8', '#08100c', '#a67847', '#ffd000', '#99647f']),
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
    personality: 'Signal orange, broadcast green, lichen, softened violet, worn fuchsia.',
    story:
      'Signal orange remains the lead. Broadcast green, lichen, softened violet, and worn fuchsia keep the selected tension without synthetic glare.',
    words: [
      'Bow',
      'worn signal',
      'broadcast green',
      'lichen',
      'soft violet',
      'worn fuchsia',
      'signal orange',
      'concrete grey',
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
    personality: 'Electric cobalt, juniper, burnt copper, old brass, bruised violet.',
    story:
      'Cobalt stays almost untouched. Juniper, burnt copper, old brass, and bruised violet provide a quieter industrial field around the electric signal.',
    words: [
      'Silvertown',
      'cobalt voltage',
      'electric blue',
      'juniper',
      'burnt copper',
      'old brass',
      'bruised violet',
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
    personality: 'Signal turmeric, cobalt, market green, bronze, dusty mulberry.',
    story:
      'Turmeric becomes the signal lead. Cobalt, market green, bronze, and dusty mulberry preserve the mismatched-cloth character without a second orange primary.',
    words: [
      'Rye Lane',
      'after closing',
      'refined market cloth',
      'signal turmeric',
      'cobalt',
      'market green',
      'bronze',
      'dusty mulberry',
      'neutral grey',
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
