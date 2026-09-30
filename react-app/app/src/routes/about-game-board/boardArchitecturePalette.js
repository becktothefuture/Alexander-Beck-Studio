const HEX_COLOR = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

export const BOARD_ARCHITECTURE_PALETTE_DEFAULTS = Object.freeze({
  light: Object.freeze({
    static: '#d3d3d3',
    moving: '#ffffff',
  }),
  dark: Object.freeze({
    static: '#424242',
    moving: '#ffffff',
  }),
});

function normalizeHexColor(value, fallback) {
  const candidate = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!HEX_COLOR.test(candidate)) return fallback;
  if (candidate.length === 4) {
    return `#${candidate.slice(1).split('').map(character => character.repeat(2)).join('')}`;
  }
  return candidate;
}

export function boardArchitecturePaletteFromRuntimeConfig(runtime = {}) {
  const moving = normalizeHexColor(runtime.aboutArchitectureMoving,
    BOARD_ARCHITECTURE_PALETTE_DEFAULTS.light.moving);
  return {
    light: {
      static: normalizeHexColor(runtime.aboutArchitectureStaticLight,
        BOARD_ARCHITECTURE_PALETTE_DEFAULTS.light.static),
      moving,
    },
    dark: {
      static: normalizeHexColor(runtime.aboutArchitectureStaticDark,
        BOARD_ARCHITECTURE_PALETTE_DEFAULTS.dark.static),
      moving,
    },
  };
}

export function boardArchitectureCssVariables(palette = BOARD_ARCHITECTURE_PALETTE_DEFAULTS) {
  return {
    '--about-architecture-static-light': palette.light.static,
    '--about-architecture-static-dark': palette.dark.static,
    '--about-architecture-moving': palette.light.moving,
  };
}
