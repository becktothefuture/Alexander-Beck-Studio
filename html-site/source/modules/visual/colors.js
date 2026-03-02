// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        COLOR PALETTE SYSTEM (COMPLETE)                       ║
// ║              Extracted from balls-source.html lines 1405-1558                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

function clamp01(t) {
  const n = Number(t);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : n > 1 ? 1 : n;
}

function hexToRgb255(hex) {
  const h = String(hex || '').trim();
  if (!h) return null;
  const s = h[0] === '#' ? h.slice(1) : h;
  if (!(s.length === 3 || s.length === 6)) return null;
  const full = s.length === 3
    ? (s[0] + s[0] + s[1] + s[1] + s[2] + s[2])
    : s;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return null;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

function rgb255ToHex({ r, g, b }) {
  const rr = (r | 0) & 255;
  const gg = (g | 0) & 255;
  const bb = (b | 0) & 255;
  const n = (rr << 16) | (gg << 8) | bb;
  return `#${n.toString(16).padStart(6, '0')}`;
}

function rgb01ToHsv({ r, g, b }) {
  const rr = clamp01(r);
  const gg = clamp01(g);
  const bb = clamp01(b);

  const max = Math.max(rr, gg, bb);
  const min = Math.min(rr, gg, bb);
  const d = max - min;

  let h = 0;
  if (d > 0) {
    if (max === rr) h = ((gg - bb) / d) % 6;
    else if (max === gg) h = (bb - rr) / d + 2;
    else h = (rr - gg) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }

  const s = max <= 0 ? 0 : (d / max);
  const v = max;
  return { h, s, v };
}

function hsvToRgb01({ h, s, v }) {
  const hh = ((Number(h) % 360) + 360) % 360;
  const ss = clamp01(s);
  const vv = clamp01(v);

  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;

  let rr = 0, gg = 0, bb = 0;
  if (hh < 60) { rr = c; gg = x; bb = 0; }
  else if (hh < 120) { rr = x; gg = c; bb = 0; }
  else if (hh < 180) { rr = 0; gg = c; bb = x; }
  else if (hh < 240) { rr = 0; gg = x; bb = c; }
  else if (hh < 300) { rr = x; gg = 0; bb = c; }
  else { rr = c; gg = 0; bb = x; }

  return { r: rr + m, g: gg + m, b: bb + m };
}

function clampHsvSat(s) {
  // Keep "alive" but still industrial (no neon).
  return Math.max(0, Math.min(0.88, Number(s) || 0));
}

function energizeHex(hex, { satMul = 0, valMul = 0 } = {}) {
  const rgb = hexToRgb255(hex);
  if (!rgb) return String(hex || '').trim() || '#ffffff';

  const hsv = rgb01ToHsv({ r: rgb.r / 255, g: rgb.g / 255, b: rgb.b / 255 });
  const s = clampHsvSat(hsv.s * (1 + (Number(satMul) || 0)));
  const v = clamp01(hsv.v * (1 + (Number(valMul) || 0)));
  const out = hsvToRgb01({ h: hsv.h, s, v });

  return rgb255ToHex({
    r: Math.round(out.r * 255),
    g: Math.round(out.g * 255),
    b: Math.round(out.b * 255)
  });
}

function lerp255(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function mixHex(a, b, t) {
  const tt = clamp01(t);
  const ra = hexToRgb255(a);
  const rb = hexToRgb255(b);
  if (!ra && !rb) return '#ffffff';
  if (!ra) return String(b);
  if (!rb) return String(a);
  const r = lerp255(ra.r, rb.r, tt);
  const g = lerp255(ra.g, rb.g, tt);
  const bb = lerp255(ra.b, rb.b, tt);
  return rgb255ToHex({ r, g, b: bb });
}

function clamp255(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 255 ? 255 : x;
}

/**
 * Push a color away from an anchor by a factor (>= 1).
 * Example: factor=1.25 makes the color 25% more "radical" vs the anchor.
 * This is used only at palette-build time (not in hot paths).
 */
function pushAwayHex(anchorHex, colorHex, factor = 1) {
  const f = Math.max(1, Number(factor) || 1);
  const a = hexToRgb255(anchorHex);
  const c = hexToRgb255(colorHex);
  if (!a && !c) return '#ffffff';
  if (!a) return String(colorHex);
  if (!c) return String(colorHex);
  const r = clamp255(a.r + (c.r - a.r) * f);
  const g = clamp255(a.g + (c.g - a.g) * f);
  const b = clamp255(a.b + (c.b - a.b) * f);
  return rgb255ToHex({ r, g, b });
}

function blendPalette(base, variant, variantWeight = 0.5) {
  const t = clamp01(variantWeight);
  const out = new Array(8);
  for (let i = 0; i < 8; i++) {
    out[i] = mixHex(base?.[i], variant?.[i], t);
  }
  return out;
}

function radicalizeVariant(tealBase, variant, factor = 1.25) {
  const out = new Array(8);
  for (let i = 0; i < 8; i++) out[i] = variant?.[i];
  // Only push the "character" slots: primary + accents.
  // Keep neutrals/white/black stable so overall contrast stays familiar.
  const idx = [3, 5, 6, 7];
  for (let k = 0; k < idx.length; k++) {
    const i = idx[k];
    out[i] = pushAwayHex(tealBase?.[i], variant?.[i], factor);
  }
  return out;
}

function energizePalette(palette, energizeOpts) {
  const out = new Array(8);
  for (let i = 0; i < 8; i++) out[i] = palette?.[i];

  // Accent-only: keep neutrals stable so UI + contrast remains consistent.
  const idx = [3, 5, 6, 7];
  for (let k = 0; k < idx.length; k++) {
    const i = idx[k];
    out[i] = energizeHex(out[i], energizeOpts);
  }
  return out;
}

function boostMostSaturatedInPalette(palette, satMul = 0.2) {
  const out = new Array(8);
  for (let i = 0; i < 8; i++) out[i] = palette?.[i];

  let bestIdx = -1;
  let bestSat = -1;
  for (let i = 0; i < 8; i++) {
    const hex = out[i];
    if (!hex) continue;
    const s = hsvSaturation(hex);
    if (s > bestSat) {
      bestSat = s;
      bestIdx = i;
    }
  }

  if (bestIdx >= 0) {
    out[bestIdx] = energizeHex(out[bestIdx], { satMul, valMul: 0 });
  }
  return out;
}

const BASE_PALETTES = {
  industrialTeal: {
    label: 'Industrial Teal',
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#00695c', '#000000', '#ff4013', '#0d5cb6', '#ffa000'],
    dark: ['#5b8378', '#345d51', '#8a928a', '#00e6c3', '#d5d5d5', '#ff6b47', '#5b9aff', '#ffb84d']
  },
  industrialRust: {
    label: 'Industrial Rust',
    // Warm copper + cobalt: distinct from teal chapter while still “industrial”.
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#a33a22', '#000000', '#00695c', '#1f4bb8', '#ff8a1f'],
    dark: ['#7f6f64', '#54433a', '#b6b1aa', '#ff6a3d', '#d5d5d5', '#00e6c3', '#6aa0ff', '#ffb15a']
  },
  industrialSlate: {
    label: 'Industrial Slate',
    // Cold slate + cyan/violet/orange: more chromatic “chapter” separation.
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#1f2937', '#000000', '#00a8cc', '#7c3aed', '#ff5d2e'],
    dark: ['#6f7780', '#3f4851', '#98a2b3', '#7dd3fc', '#d5d5d5', '#22d3ee', '#c084fc', '#ff7a45']
  },
  industrialAmber: {
    label: 'Industrial Amber',
    // Amber + violet + red: keeps industrial warmth but avoids “all teal-adjacent”.
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#d97706', '#000000', '#00695c', '#6b46c1', '#ff4013'],
    dark: ['#82745d', '#5a4b35', '#a9a193', '#fbbf24', '#d5d5d5', '#00e6c3', '#c4b5fd', '#ff6b47']
  },
  industrialViolet: {
    label: 'Industrial Violet',
    // Violet + muted chartreuse + rose: a clear “alt chapter” while staying restrained.
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#6b46c1', '#000000', '#00695c', '#7fbf2a', '#d94666'],
    dark: ['#7a6f83', '#52475b', '#a7a0b0', '#c084fc', '#d5d5d5', '#00e6c3', '#bef264', '#fb7185']
  },
  industrialForest: {
    label: 'Industrial Forest',
    // Forest + amber + violet: richer, less monotone “green-on-green”.
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#166534', '#000000', '#00695c', '#f59e0b', '#7c3aed'],
    dark: ['#637563', '#3d4f3f', '#98a593', '#4ade80', '#d5d5d5', '#00e6c3', '#fcd34d', '#c4b5fd']
  },
  industrialSteel: {
    label: 'Industrial Steel',
    // Steel + cyan + copper + olive: more contrast vs slate/teal.
    light: ['#b5b7b6', '#bbbdbd', '#ffffff', '#334155', '#000000', '#0ea5e9', '#c2410c', '#65a30d'],
    dark: ['#6f737a', '#464a52', '#98a2ab', '#94a3b8', '#d5d5d5', '#38bdf8', '#fb923c', '#a3e635']
  }
};

// NOTE: The base palettes carry the “industrial teal psychology” via:
// - shared neutral roles (grey/white/black slots)
// - a recurring teal accent slot (index 5)
// We still add a *small* teal bias to keep chapters related, but let each chapter read clearly.
const TEAL_ANCHOR_WEIGHT_VARIANT = 0.85;
const TEAL_BASE = BASE_PALETTES.industrialTeal;
const RADICAL_FACTOR = 1.35; // push accents further from teal so chapters don’t collapse into the same hue band

// Make all chapters feel as "alive" (variance + vibrance) as Industrial Teal without shifting the core palette roles.
// Applied only at palette-build time (not hot paths).
const VARIANT_ENERGIZE_LIGHT = { satMul: 0.10, valMul: 0.03 };
const VARIANT_ENERGIZE_DARK = { satMul: 0.14, valMul: 0.07 };

export const COLOR_TEMPLATES = {
  industrialTeal: {
    label: TEAL_BASE.label,
    light: boostMostSaturatedInPalette(TEAL_BASE.light, 0.2),
    dark: boostMostSaturatedInPalette(TEAL_BASE.dark, 0.2)
  },
  industrialRust: {
    label: BASE_PALETTES.industrialRust.label,
    light: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.light,
          radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialRust.light, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_LIGHT
      ),
      0.2
    ),
    dark: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.dark,
          radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialRust.dark, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_DARK
      ),
      0.2
    )
  },
  industrialSlate: {
    label: BASE_PALETTES.industrialSlate.label,
    light: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.light,
          radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialSlate.light, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_LIGHT
      ),
      0.2
    ),
    dark: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.dark,
          radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialSlate.dark, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_DARK
      ),
      0.2
    )
  },
  industrialAmber: {
    label: BASE_PALETTES.industrialAmber.label,
    light: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.light,
          radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialAmber.light, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_LIGHT
      ),
      0.2
    ),
    dark: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.dark,
          radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialAmber.dark, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_DARK
      ),
      0.2
    )
  },
  industrialViolet: {
    label: BASE_PALETTES.industrialViolet.label,
    light: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.light,
          radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialViolet.light, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_LIGHT
      ),
      0.2
    ),
    dark: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.dark,
          radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialViolet.dark, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_DARK
      ),
      0.2
    )
  },
  industrialForest: {
    label: BASE_PALETTES.industrialForest.label,
    light: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.light,
          radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialForest.light, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_LIGHT
      ),
      0.2
    ),
    dark: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.dark,
          radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialForest.dark, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_DARK
      ),
      0.2
    )
  },
  industrialSteel: {
    label: BASE_PALETTES.industrialSteel.label,
    light: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.light,
          radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialSteel.light, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_LIGHT
      ),
      0.2
    ),
    dark: boostMostSaturatedInPalette(
      energizePalette(
        blendPalette(
          TEAL_BASE.dark,
          radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialSteel.dark, RADICAL_FACTOR),
          TEAL_ANCHOR_WEIGHT_VARIANT
        ),
        VARIANT_ENERGIZE_DARK
      ),
      0.2
    )
  }
};

// Story order for "chapters" (used by the template select + reload rotation).
export const PALETTE_CHAPTER_ORDER = [
  'industrialTeal',
  'industrialRust',
  'industrialSlate',
  'industrialAmber',
  'industrialViolet',
  'industrialForest',
  'industrialSteel'
];

const PALETTE_ROTATION_STORAGE_KEY = 'abs_palette_chapter';

// Legacy fallback weights (only used if no valid `colorDistribution` is present).
const LEGACY_COLOR_WEIGHTS = [0.50, 0.25, 0.12, 0.06, 0.03, 0.02, 0.01, 0.01];

function clampIntFallback(v, min, max, fallback = min) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  const i = Math.floor(n);
  return i < min ? min : i > max ? max : i;
}

function getDistribution(g) {
  const dist = g?.colorDistribution;
  return Array.isArray(dist) ? dist : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CURSOR COLOR (contrasty-only palette selection)
// - Single source of truth for cursor dot + trail
// - Event-driven (mode switch / reset / startup / palette change), not in hot paths
// ═══════════════════════════════════════════════════════════════════════════════

const CURSOR_SAFE_FALLBACK_INDICES = [3, 5, 6, 7];
const CURSOR_SAT_MIN = 0.18; // exclude greys/white/black; keep “ball color” feel

function clampInt(v, min, max) {
  const n = Number(v);
  if (!Number.isFinite(n)) return min;
  const i = Math.floor(n);
  return i < min ? min : i > max ? max : i;
}

function isArrayOfNumbers(v) {
  return Array.isArray(v) && v.every(x => Number.isFinite(Number(x)));
}

function hexToRgb01(hex) {
  const h = String(hex || '').trim();
  if (!h) return null;
  const s = h[0] === '#' ? h.slice(1) : h;
  if (!(s.length === 3 || s.length === 6)) return null;
  const full = s.length === 3
    ? (s[0] + s[0] + s[1] + s[1] + s[2] + s[2])
    : s;
  const n = parseInt(full, 16);
  if (!Number.isFinite(n)) return null;
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return { r: r / 255, g: g / 255, b: b / 255 };
}

function srgbToLinear(c) {
  return c <= 0.04045 ? (c / 12.92) : Math.pow((c + 0.055) / 1.055, 2.4);
}

function relativeLuminance(hex) {
  const rgb = hexToRgb01(hex);
  if (!rgb) return 1;
  const r = srgbToLinear(rgb.r);
  const g = srgbToLinear(rgb.g);
  const b = srgbToLinear(rgb.b);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function hsvSaturation(hex) {
  const rgb = hexToRgb01(hex);
  if (!rgb) return 0;
  const max = Math.max(rgb.r, rgb.g, rgb.b);
  const min = Math.min(rgb.r, rgb.g, rgb.b);
  const d = max - min;
  if (max <= 0) return 0;
  return d / max;
}

/**
 * Compute a WCAG-safe hover text color based on cursor color and background.
 * This is computed once when cursor color changes (not per-hover).
 * Returns a CSS rgb() string.
 */
function computeSafeHoverTextColor(cursorHex) {
  const globals = getGlobals();
  const isDark = globals?.isDarkMode || false;
  
  // Parse cursor color
  const cursorRgb = hexToRgb255(cursorHex);
  if (!cursorRgb) return null;
  
  // Get background color
  const bgHex = isDark ? (globals.bgDark || '#0a0a0a') : (globals.bgLight || '#f5f5f5');
  const baseBgRgb = hexToRgb255(bgHex);
  if (!baseBgRgb) return null;
  
  // Mix cursor color with background at 12% alpha (simulating the pill background)
  const bgAlpha = 0.12;
  const mixedBgRgb = {
    r: Math.round(baseBgRgb.r + (cursorRgb.r - baseBgRgb.r) * bgAlpha),
    g: Math.round(baseBgRgb.g + (cursorRgb.g - baseBgRgb.g) * bgAlpha),
    b: Math.round(baseBgRgb.b + (cursorRgb.b - baseBgRgb.b) * bgAlpha)
  };
  
  // Compute accessible text color
  const mixedLuma = relativeLuminance(rgb255ToHex(mixedBgRgb));
  const preferDirection = mixedLuma > 0.45 ? 'black' : 'white';
  const safeRgb = computeAccessibleColor(cursorRgb, mixedBgRgb, preferDirection);
  
  return `rgb(${safeRgb.r} ${safeRgb.g} ${safeRgb.b})`;
}

/**
 * Compute a WCAG AA-compliant color (4.5:1 contrast ratio).
 * Mixes the cursor color toward white or black until contrast is safe.
 */
function computeAccessibleColor(cursorRgb, bgRgb, preferDirection = null) {
  const target = 4.5; // WCAG AA for normal text
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  
  const tryDirection = (toward) => {
    for (let i = 0; i <= 20; i++) {
      const t = i / 20;
      const candidate = {
        r: Math.round(cursorRgb.r + (toward.r - cursorRgb.r) * t),
        g: Math.round(cursorRgb.g + (toward.g - cursorRgb.g) * t),
        b: Math.round(cursorRgb.b + (toward.b - cursorRgb.b) * t)
      };
      const cr = computeContrastRatio(candidate, bgRgb);
      if (cr >= target) return { rgb: candidate, t, cr };
    }
    return null;
  };
  
  const towardWhite = tryDirection(white);
  const towardBlack = tryDirection(black);
  
  // Prefer direction based on background luminance
  if (towardWhite && towardBlack) {
    if (preferDirection === 'black') return towardBlack.rgb;
    if (preferDirection === 'white') return towardWhite.rgb;
    // Default: smallest adjustment
    return towardWhite.t <= towardBlack.t ? towardWhite.rgb : towardBlack.rgb;
  }
  if (towardWhite) return towardWhite.rgb;
  if (towardBlack) return towardBlack.rgb;
  
  // Final fallback
  const whiteCr = computeContrastRatio(white, bgRgb);
  const blackCr = computeContrastRatio(black, bgRgb);
  return whiteCr >= blackCr ? white : black;
}

/**
 * WCAG contrast ratio between two RGB colors
 */
function computeContrastRatio(rgb1, rgb2) {
  const luma1 = computeRelativeLuminance(rgb1);
  const luma2 = computeRelativeLuminance(rgb2);
  const hi = Math.max(luma1, luma2);
  const lo = Math.min(luma1, luma2);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Relative luminance for RGB255 values
 */
function computeRelativeLuminance({ r, g, b }) {
  const toLinear = (c) => {
    const val = c / 255;
    return val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Desaturate greys (indices 0, 1) and align them with background hue
 * This makes greys less colored and more harmonious with the background
 * In dark mode, also darkens the greys for better contrast
 */
function desaturateGreysToBackground(palette, bgHex, isDarkMode = false) {
  if (!palette || !Array.isArray(palette)) return palette;
  const out = [...palette];
  
  // Extract hue from background color
  const bgRgb = hexToRgb01(bgHex);
  if (!bgRgb) return out;
  const bgHsv = rgb01ToHsv(bgRgb);
  
  // If background is too desaturated (pure grey), use a neutral hue (0)
  // Otherwise use the background's hue for harmony
  const bgHue = bgHsv.s < 0.05 ? 0 : bgHsv.h;
  
  // Process grey indices (0, 1) - skip neutrals (2 = white, 4 = black)
  const greyIndices = [0, 1];
  for (const idx of greyIndices) {
    const greyHex = out[idx];
    if (!greyHex) continue;
    
    const greyRgb = hexToRgb01(greyHex);
    if (!greyRgb) continue;
    const greyHsv = rgb01ToHsv(greyRgb);
    
    // Desaturate significantly (reduce to 5-10% of original saturation)
    // but shift hue to match background for harmony
    const desaturatedSat = Math.max(0, Math.min(0.15, greyHsv.s * 0.1));
    
    // In dark mode, darken the greys (reduce value/lightness by ~40-45%)
    // This makes them more subtle and better integrated with dark backgrounds
    let adjustedValue = greyHsv.v;
    if (isDarkMode) {
      // Darken: reduce value by ~45% (multiply by 0.55)
      // Keep a minimum value to ensure they're still visible
      adjustedValue = Math.max(0.15, greyHsv.v * 0.55);
    }
    
    // Convert back to RGB with desaturated saturation and background hue
    const desaturatedHsv = {
      h: bgHue,
      s: desaturatedSat,
      v: adjustedValue
    };
    
    const desaturatedRgb = hsvToRgb01(desaturatedHsv);
    out[idx] = rgb255ToHex({
      r: Math.round(desaturatedRgb.r * 255),
      g: Math.round(desaturatedRgb.g * 255),
      b: Math.round(desaturatedRgb.b * 255)
    });
  }
  
  return out;
}

function stampCursorCSSVar(hex) {
  try {
    document.documentElement.style.setProperty('--cursor-color', String(hex || '').trim() || '#000000');
    
    // Compute and set a WCAG-safe hover text color (once per cursor color change)
    const hoverFg = computeSafeHoverTextColor(hex);
    if (hoverFg) {
      document.documentElement.style.setProperty('--cursor-hover-fg', hoverFg);
    }
  } catch (_) { /* no-op */ }
}

function resolveCursorHexFromIndex(colors, idx) {
  const list = colors && colors.length ? colors : [];
  const i = clampInt(idx, 0, Math.max(0, Math.min(7, list.length - 1)));
  return list[i] || '#000000';
}

export function getCursorCandidateIndices(colors, globalsOverride) {
  const g = globalsOverride || getGlobals();
  const list = colors && colors.length ? colors : [];
  const maxIdx = Math.min(7, list.length - 1);
  if (maxIdx < 0) return [];

  const lumaMax = Number.isFinite(Number(g.cursorColorLumaMax)) ? Number(g.cursorColorLumaMax) : 0.62;
  const allow = isArrayOfNumbers(g.cursorColorAllowIndices)
    ? g.cursorColorAllowIndices.map(x => clampInt(x, 0, 7))
    : [];
  const deny = isArrayOfNumbers(g.cursorColorDenyIndices)
    ? g.cursorColorDenyIndices.map(x => clampInt(x, 0, 7))
    : [];

  const denySet = new Set(deny);
  const allowSet = allow.length ? new Set(allow) : null;

  const out = [];
  for (let i = 0; i <= maxIdx; i++) {
    if (denySet.has(i)) continue;
    if (allowSet && !allowSet.has(i)) continue;
    const hex = list[i];
    if (!hex) continue;
    const luma = relativeLuminance(hex);
    if (luma > lumaMax) continue;          // too light
    const sat = hsvSaturation(hex);
    if (sat < CURSOR_SAT_MIN) continue;    // too grey/neutral
    out.push(i);
  }

  if (out.length) return out;

  // Hard fallback: always try the “nice” indices first.
  const safe = [];
  for (const i of CURSOR_SAFE_FALLBACK_INDICES) {
    if (i <= maxIdx && !denySet.has(i) && (!allowSet || allowSet.has(i))) safe.push(i);
  }
  if (safe.length) return safe;

  // Last resort: any existing index not denied.
  for (let i = 0; i <= maxIdx; i++) {
    if (!denySet.has(i) && (!allowSet || allowSet.has(i))) safe.push(i);
  }
  return safe;
}

export function applyCursorColorIndex(index, { forceMode } = {}) {
  const g = getGlobals();
  const colors = g.currentColors;
  const candidates = getCursorCandidateIndices(colors, g);

  // If the desired index is not a candidate, snap to first candidate.
  const desired = clampInt(index, 0, 7);
  const finalIdx = candidates.includes(desired) ? desired : (candidates[0] ?? desired);
  const hex = resolveCursorHexFromIndex(colors, finalIdx);

  if (forceMode) g.cursorColorMode = forceMode;
  g.cursorColorIndex = finalIdx;
  g.cursorColorHex = hex;
  stampCursorCSSVar(hex);
  return { index: finalIdx, hex };
}

export function maybeAutoPickCursorColor(reason = 'auto') {
  const g = getGlobals();
  if (g.cursorColorMode !== 'auto') {
    // Still ensure CSS var is aligned with current palette variant.
    applyCursorColorIndex(g.cursorColorIndex, { forceMode: g.cursorColorMode });
    return false;
  }

  const colors = g.currentColors;
  const candidates = getCursorCandidateIndices(colors, g);
  if (!candidates.length) return false;

  const last = Number.isFinite(Number(g._lastCursorColorIndex)) ? Number(g._lastCursorColorIndex) : -1;
  let pick = candidates[(Math.random() * candidates.length) | 0];
  if (candidates.length > 1 && pick === last) {
    // Avoid immediate repeats when possible.
    pick = candidates[(Math.random() * candidates.length) | 0];
    if (pick === last) pick = candidates[(candidates.indexOf(last) + 1) % candidates.length];
  }
  g._lastCursorColorIndex = pick;

  applyCursorColorIndex(pick, { forceMode: 'auto' });
  return true;
}

export function getCurrentPalette(templateName) {
  const globals = getGlobals();
  const template = COLOR_TEMPLATES[templateName];
  if (!template) return COLOR_TEMPLATES.industrialTeal.light;
  
  const rawPalette = globals.isDarkMode ? template.dark : template.light;
  const isDarkMode = globals.isDarkMode || false;
  
  // Desaturate greys to align with background hue (all palettes)
  // In dark mode, also darken the greys for better contrast
  const bgColor = isDarkMode ? (globals.bgDark || '#0a0a0a') : (globals.bgLight || '#f5f5f5');
  return desaturateGreysToBackground(rawPalette, bgColor, isDarkMode);
}

/**
 * Pick a random color and return both the color hex and the distribution index
 * @returns {{ color: string, distributionIndex: number }} Color and its distribution index (0-6)
 */
export function pickRandomColorWithIndex() {
  const globals = getGlobals();
  const colors = globals.currentColors;
  
  if (!colors || colors.length === 0) {
    console.warn('No colors available, using fallback');
    return { color: '#ffffff', distributionIndex: 0 };
  }
  
  // Primary: use the runtime color distribution (7 labels → 7 distinct palette indices).
  // Hot-path safe: O(7) work, zero allocations.
  const dist = getDistribution(globals);
  if (dist && dist.length) {
    let total = 0;
    for (let i = 0; i < dist.length; i++) {
      const w = Number(dist[i]?.weight);
      if (Number.isFinite(w) && w > 0) total += w;
    }
    if (total > 0) {
      let r = Math.random() * total;
      for (let i = 0; i < dist.length; i++) {
        const row = dist[i];
        const w = Number(row?.weight);
        if (!Number.isFinite(w) || w <= 0) continue;
        r -= w;
        if (r <= 0) {
          const idx = clampIntFallback(row?.colorIndex, 0, 7, 0);
          return { color: colors[idx] || colors[0] || '#ffffff', distributionIndex: i };
        }
      }
      // Numeric edge case: fall through to a deterministic row.
      const last = dist[dist.length - 1];
      const idx = clampIntFallback(last?.colorIndex, 0, 7, 0);
      return { color: colors[idx] || colors[0] || '#ffffff', distributionIndex: dist.length - 1 };
    }
  }

  // Fallback: legacy weights over the first 8 palette entries.
  const random = Math.random();
  let cumulativeWeight = 0;
  const maxIdx = Math.min(colors.length, LEGACY_COLOR_WEIGHTS.length, 8);
  for (let i = 0; i < maxIdx; i++) {
    cumulativeWeight += LEGACY_COLOR_WEIGHTS[i];
    if (random <= cumulativeWeight) return { color: colors[i], distributionIndex: i };
  }
  return { color: colors[Math.min(colors.length - 1, 7)] || '#ffffff', distributionIndex: 0 };
}

export function pickRandomColor() {
  return pickRandomColorWithIndex().color;
}

/**
 * Get a specific color by index (0-7)
 * Ensures all 8 colors are accessible for guaranteed representation
 */
export function getColorByIndex(index) {
  const globals = getGlobals();
  const colors = globals.currentColors;
  
  if (!colors || colors.length === 0) {
    console.warn('No colors available, using fallback');
    return '#ffffff';
  }
  
  const clampedIndex = Math.max(0, Math.min(7, Math.floor(index)));
  return colors[clampedIndex] || '#ffffff';
}

export function applyColorTemplate(templateName) {
  const globals = getGlobals();
  globals.currentTemplate = templateName;
  globals.currentColors = getCurrentPalette(templateName);

  // Persist for chapter rotation and keep any UI selects in sync.
  try {
    localStorage.setItem(PALETTE_ROTATION_STORAGE_KEY, String(templateName || ''));
  } catch (_) { /* no-op */ }
  try {
    const select = document.getElementById('colorSelect');
    if (select) select.value = templateName;
  } catch (_) { /* no-op */ }
  
  // Cursor color must remain valid across template + theme changes.
  // Do NOT auto-rotate here; only re-resolve to the new palette variant (or snap if invalid).
  if (globals.cursorColorMode !== 'auto' && globals.cursorColorMode !== 'manual') {
    globals.cursorColorMode = 'auto';
  }
  applyCursorColorIndex(globals.cursorColorIndex, { forceMode: globals.cursorColorMode });
  
  // Update existing ball colors
  updateExistingBallColors();
  
  // Sync CSS variables
  syncPaletteVars(globals.currentColors);
  
  // Update UI color pickers
  updateColorPickersUI();
  
  // Notify optional UI consumers (e.g., dev control panel swatches).
  // Event-driven; not used in hot paths.
  try {
    window.dispatchEvent(new CustomEvent('bb:paletteChanged', { detail: { template: templateName } }));
  } catch (_) { /* no-op */ }
}

function updateExistingBallColors() {
  const globals = getGlobals();
  const balls = globals.balls;
  
  // For critters mode, use only grey colors (indices 0, 1)
  // Otherwise use standard weighted distribution
  const isCrittersMode = globals.currentMode === 'critters';
  const critterColorIndices = [0, 1];

  for (let i = 0; i < balls.length; i++) {
    if (isCrittersMode) {
      // Critters get greys only
      const colorIndex = critterColorIndices[Math.floor(Math.random() * critterColorIndices.length)];
      balls[i].color = getColorByIndex(colorIndex);
    } else {
      balls[i].color = pickRandomColor();
    }
  }
}

function syncPaletteVars(colors) {
  try {
    const root = document.documentElement;
    const list = (colors && colors.length ? colors : []).slice(0, 8);
    for (let i = 0; i < 8; i++) {
      const hex = list[i] || '#ffffff';
      root.style.setProperty(`--ball-${i+1}`, hex);
    }
  } catch (_) { /* no-op */ }
}

function updateColorPickersUI() {
  const globals = getGlobals();
  const colors = globals.currentColors;
  
  for (let i = 1; i <= 8; i++) {
    const picker = document.getElementById(`color${i}`);
    const display = document.getElementById(`color${i}Val`);
    if (picker && colors[i-1]) {
      picker.value = colors[i-1];
      if (display) display.textContent = colors[i-1].toUpperCase();
    }
  }
}

export function populateColorSelect() {
  const select = document.getElementById('colorSelect');
  if (!select) return;
  
  select.innerHTML = '';
  for (const key of PALETTE_CHAPTER_ORDER) {
    const template = COLOR_TEMPLATES[key];
    if (!template) continue;
    const option = document.createElement('option');
    option.value = key;
    option.textContent = template.label;
    select.appendChild(option);
  }
  
  const globals = getGlobals();
  select.value = globals.currentTemplate;
}

/**
 * Rotate to the next palette chapter.
 * - Intended to be called once on each page load (before initializeDarkMode()).
 * - Applies only to cursor + balls (via applyColorTemplate in dark-mode init).
 */
export function rotatePaletteChapterOnReload() {
  const globals = getGlobals();
  const order = Array.isArray(PALETTE_CHAPTER_ORDER) && PALETTE_CHAPTER_ORDER.length
    ? PALETTE_CHAPTER_ORDER
    : Object.keys(COLOR_TEMPLATES);
  if (!order.length) return null;

  let lastKey = null;
  try { lastKey = localStorage.getItem(PALETTE_ROTATION_STORAGE_KEY); } catch (_) {}

  const lastIndex = typeof lastKey === 'string' ? order.indexOf(lastKey) : -1;
  // First visit (or invalid stored key): start on a random chapter for surprise,
  // then continue rotating in story order on subsequent reloads.
  const nextIndex = lastIndex >= 0
    ? (lastIndex + 1) % order.length
    : ((Math.random() * order.length) | 0);
  const nextKey = order[nextIndex];

  globals.currentTemplate = nextKey;
  try { localStorage.setItem(PALETTE_ROTATION_STORAGE_KEY, nextKey); } catch (_) {}
  return nextKey;
}
