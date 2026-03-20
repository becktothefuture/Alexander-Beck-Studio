import { getGlobals } from '../core/state.js';
import {
  DEFAULT_LONDON_WEATHER_PALETTE_ID,
  LONDON_WEATHER_PALETTES,
  resolveLondonWeatherPaletteId,
} from '../../../palette/londonPalettes.js';

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

function lerp255(a, b, t) {
  return Math.round(a + (b - a) * t);
}

function clamp255(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return x < 0 ? 0 : x > 255 ? 255 : x;
}

export const COLOR_TEMPLATES = {
  ...LONDON_WEATHER_PALETTES.reduce((acc, palette) => {
    acc[palette.id] = {
      label: palette.label,
      light: palette.light.slice(),
      dark: palette.dark.slice(),
    };
    return acc;
  }, {})
};

export const PALETTE_CHAPTER_ORDER = LONDON_WEATHER_PALETTES.map((palette) => palette.id);

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

export function resolveColorTemplateName(templateName) {
  return resolveLondonWeatherPaletteId(templateName) || DEFAULT_LONDON_WEATHER_PALETTE_ID;
}

export function getPaletteTemplateOverrideFromUrl() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = new URLSearchParams(window.location.search).get('palette');
    return resolveLondonWeatherPaletteId(raw);
  } catch (_) {
    return null;
  }
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

const WCAG_AA_RATIO = 4.5;

/**
 * Compute a WCAG AA (4.5:1) text color for use on a solid cursor-color background.
 * Used by the quote button hover state (full cursor fill). Returns white or black
 * (as rgb() string) depending on cursor luminance so both light and dark cursors get readable text.
 */
function computeSafeTextOnCursorColor(cursorHex) {
  const cursorRgb = hexToRgb255(cursorHex);
  if (!cursorRgb) return null;
  const white = { r: 255, g: 255, b: 255 };
  const black = { r: 0, g: 0, b: 0 };
  const whiteCr = computeContrastRatio(white, cursorRgb);
  const blackCr = computeContrastRatio(black, cursorRgb);
  const cursorLuma = relativeLuminance(cursorHex);
  if (whiteCr >= WCAG_AA_RATIO && blackCr >= WCAG_AA_RATIO) {
    return cursorLuma > 0.5 ? `rgb(${black.r} ${black.g} ${black.b})` : `rgb(${white.r} ${white.g} ${white.b})`;
  }
  if (whiteCr >= WCAG_AA_RATIO) return `rgb(${white.r} ${white.g} ${white.b})`;
  if (blackCr >= WCAG_AA_RATIO) return `rgb(${black.r} ${black.g} ${black.b})`;
  return cursorLuma > 0.5 ? `rgb(${black.r} ${black.g} ${black.b})` : `rgb(${white.r} ${white.g} ${white.b})`;
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

function applyCursorHoverFgVars(cursorHex) {
  const fgOnCursor = computeSafeTextOnCursorColor(cursorHex);
  if (!fgOnCursor) return;
  try {
    document.documentElement.style.setProperty('--cursor-hover-fg', fgOnCursor);
    document.documentElement.style.setProperty('--quote-hover-fg', fgOnCursor);
  } catch (_) { /* no-op */ }
}

function parseComputedCssColorToHex(cssColor) {
  const s = String(cssColor || '').trim();
  if (!s || s === 'transparent') return null;
  const rgba0 = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (rgba0) {
    return rgb255ToHex({
      r: clamp255(parseFloat(rgba0[1])),
      g: clamp255(parseFloat(rgba0[2])),
      b: clamp255(parseFloat(rgba0[3])),
    });
  }
  const rgba1 = s.match(/^rgba?\(\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/|\s*,|\s*$)/i);
  if (rgba1) {
    return rgb255ToHex({
      r: clamp255(parseFloat(rgba1[1])),
      g: clamp255(parseFloat(rgba1[2])),
      b: clamp255(parseFloat(rgba1[3])),
    });
  }
  if (s[0] === '#') {
    const rgb = hexToRgb255(s);
    return rgb ? rgb255ToHex(rgb) : null;
  }
  return null;
}

/**
 * Resolve the theme's `--cursor-color` (including `var(--ball-*)` chains) to a hex sample and
 * stamp `--cursor-hover-fg` / `--quote-hover-fg`. Use on routes that skip `maybeAutoPickCursorColor`
 * (e.g. styleguide) so solid `::before` hovers stay WCAG-readable.
 */
export function stampCursorContrastFromTheme() {
  if (typeof document === 'undefined') return;
  try {
    const probe = document.createElement('div');
    probe.style.cssText =
      'position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;color:var(--cursor-color);';
    document.documentElement.appendChild(probe);
    const cssColor = getComputedStyle(probe).color;
    probe.remove();
    const hex = parseComputedCssColorToHex(cssColor);
    if (hex) applyCursorHoverFgVars(hex);
  } catch (_) { /* no-op */ }
}

function stampCursorCSSVar(hex) {
  try {
    const cursorHex = String(hex || '').trim() || '#000000';
    document.documentElement.style.setProperty('--cursor-color', cursorHex);
    applyCursorHoverFgVars(cursorHex);
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
  const template = COLOR_TEMPLATES[resolveColorTemplateName(templateName)];
  if (!template) return COLOR_TEMPLATES[DEFAULT_LONDON_WEATHER_PALETTE_ID].light;
  
  const rawPalette = globals.isDarkMode ? template.dark : template.light;
  const isDarkMode = globals.isDarkMode || false;
  
  // Desaturate greys to align with background hue (all palettes)
  // In dark mode, also darken the greys for better contrast
  const bgColor = isDarkMode ? (globals.bgDark || '#181818') : (globals.bgLight || '#efefef');
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

function isProjectNeutralColor(hex) {
  const saturation = hsvSaturation(hex);
  const luminance = relativeLuminance(hex);
  return saturation < 0.16 || luminance < 0.045 || luminance > 0.94;
}

function normalizeHexKey(hex) {
  const rgb = hexToRgb255(hex);
  if (!rgb) return String(hex || '').trim().toLowerCase();
  return rgb255ToHex(rgb).toLowerCase();
}

/** Distinct greys when the live palette runs out of unique neutrals (portfolio pit only). */
const PORTFOLIO_GREY_FALLBACKS = [
  '#6b7670',
  '#8a9390',
  '#4a5550',
  '#a3aba7',
  '#3d4743',
  '#b8c0bc'
];

/**
 * One unique fill per portfolio project: chromatic palette slots first, then neutrals/greys
 * from the same palette (deduped), then stepped greys. Avoids repeating the same accent hue.
 */
export function getPortfolioProjectPaletteColor(index, projectCount) {
  const n = Math.max(1, Math.floor(Number(projectCount)) || 1);
  const seq = buildPortfolioProjectColorSequence(n);
  const i = Math.abs(Math.floor(index));
  return seq[i % seq.length] || seq[0];
}

function buildPortfolioProjectColorSequence(projectCount) {
  const globals = getGlobals();
  const colors = Array.isArray(globals.currentColors) ? globals.currentColors.filter(Boolean) : [];
  const out = [];
  const seen = new Set();
  const pushUnique = (c) => {
    const key = normalizeHexKey(c);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(c);
  };

  if (!colors.length) {
    for (let k = 0; k < PORTFOLIO_GREY_FALLBACKS.length && out.length < projectCount; k += 1) {
      out.push(PORTFOLIO_GREY_FALLBACKS[k]);
    }
    let step = 0;
    while (out.length < projectCount && step < 128) {
      step += 1;
      const b = 42 + ((step * 19 + projectCount * 3) % 156);
      out.push(rgb255ToHex({ r: b, g: clamp255(b + 4), b: clamp255(b + 2) }));
    }
    return out.slice(0, projectCount);
  }

  const chromatic = [];
  const neutralGreys = [];
  const neutralWhites = [];
  const neutralBlacks = [];
  for (let i = 0; i < colors.length; i += 1) {
    const color = colors[i];
    if (!isProjectNeutralColor(color)) {
      chromatic.push(color);
      continue;
    }
    const key = normalizeHexKey(color);
    if (key === '#ffffff') {
      neutralWhites.push(color);
    } else if (key === '#000000') {
      neutralBlacks.push(color);
    } else {
      neutralGreys.push(color);
    }
  }

  for (let i = 0; i < chromatic.length && out.length < Math.min(projectCount, 3); i += 1) {
    pushUnique(chromatic[i]);
  }
  for (let i = 0; i < neutralGreys.length; i += 1) pushUnique(neutralGreys[i]);
  for (let i = 0; i < neutralWhites.length; i += 1) pushUnique(neutralWhites[i]);
  for (let i = 3; i < chromatic.length; i += 1) pushUnique(chromatic[i]);
  for (let i = 0; i < neutralBlacks.length; i += 1) pushUnique(neutralBlacks[i]);
  for (let i = 0; i < PORTFOLIO_GREY_FALLBACKS.length && out.length < projectCount; i += 1) {
    pushUnique(PORTFOLIO_GREY_FALLBACKS[i]);
  }

  if (out.length < projectCount) {
    pushUnique('#ffffff');
  }

  let guard = 0;
  while (out.length < projectCount && guard < 96) {
    guard += 1;
    const before = out.length;
    const t = out.length / (projectCount + 3);
    pushUnique(rgb255ToHex({
      r: lerp255(58, 140, t),
      g: lerp255(62, 148, t),
      b: lerp255(60, 144, t)
    }));
    if (out.length === before) {
      const b = 48 + ((guard + out.length * 11 + projectCount) % 152);
      out.push(rgb255ToHex({ r: b, g: clamp255(b + 3), b: clamp255(b + 1) }));
    }
  }

  return out.slice(0, projectCount);
}

export function getProjectPaletteColor(index) {
  const globals = getGlobals();
  const colors = Array.isArray(globals.currentColors) ? globals.currentColors.filter(Boolean) : [];
  if (!colors.length) return '#1b7f6e';

  const chromatic = [];
  const neutrals = [];
  for (let i = 0; i < colors.length; i += 1) {
    const color = colors[i];
    if (isProjectNeutralColor(color)) neutrals.push(color);
    else chromatic.push(color);
  }

  if (chromatic.length) {
    return chromatic[Math.abs(Math.floor(index)) % chromatic.length] || chromatic[0];
  }

  const limitedNeutrals = neutrals.slice(0, 2);
  if (limitedNeutrals.length) {
    return limitedNeutrals[Math.abs(Math.floor(index)) % limitedNeutrals.length] || limitedNeutrals[0];
  }

  return colors[Math.abs(Math.floor(index)) % colors.length] || colors[0];
}

export function applyColorTemplate(templateName) {
  const globals = getGlobals();
  const resolvedTemplateName = resolveColorTemplateName(templateName);
  globals.currentTemplate = resolvedTemplateName;
  globals.currentColors = getCurrentPalette(resolvedTemplateName);

  // Persist for chapter rotation and keep any UI selects in sync.
  try {
    localStorage.setItem(PALETTE_ROTATION_STORAGE_KEY, String(resolvedTemplateName || ''));
  } catch (_) { /* no-op */ }
  try {
    const select = document.getElementById('colorSelect');
    if (select) select.value = resolvedTemplateName;
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
    window.dispatchEvent(new CustomEvent('bb:paletteChanged', { detail: { template: resolvedTemplateName } }));
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
    if (balls[i]?._preserveColor) continue;
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
  select.value = resolveColorTemplateName(globals.currentTemplate);
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
