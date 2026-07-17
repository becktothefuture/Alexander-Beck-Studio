import { getGlobals } from "/src/legacy/modules/core/state.js";
import { forEachPanelUiDocument } from "/src/legacy/modules/ui/panel-ui-context.js";
import {
  DEFAULT_LONDON_WEATHER_PALETTE_ID,
  LONDON_WEATHER_PALETTES,
  getLondonWeatherPaletteAccents,
  resolveLondonWeatherPaletteId,
} from "/src/palette/londonPalettes.js";
import { getTimeOfDayPaletteId } from "/src/palette/timeOfDayPalette.js";

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

function hexToRgbaString(hex, alpha = 1) {
  const rgb = hexToRgb255(hex);
  if (!rgb) return alpha >= 1 ? '#ffffff' : `rgba(255, 255, 255, ${alpha})`;
  if (alpha >= 1) return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
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
let distributionCoverageKey = '';
let distributionCoverageCursor = 0;
let distributionCoverageOrder = [];

// Shared palette roles across simulation modes:
// neutrals dominate, chromatic accents are secondary, and the hottest accents are rare.
export const PALETTE_NEUTRAL_INDICES = [0, 1, 2, 4];
export const PALETTE_CHROMATIC_INDICES = [3, 6];
export const PALETTE_BRIGHT_ACCENT_INDICES = [5, 7];

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

function getDistributionCoverageKey(dist) {
  let key = '';
  for (let i = 0; i < dist.length; i++) {
    const row = dist[i];
    const w = Number(row?.weight);
    if (!Number.isFinite(w) || w <= 0) continue;
    key += `${i}:${row?.label || ''}:${row?.colorIndex}:${w}|`;
  }
  return key;
}

function getCoverageDistributionIndex(dist) {
  const key = getDistributionCoverageKey(dist);
  if (key !== distributionCoverageKey) {
    distributionCoverageKey = key;
    distributionCoverageCursor = 0;
    distributionCoverageOrder = [];
    for (let i = 0; i < dist.length; i++) {
      const w = Number(dist[i]?.weight);
      if (Number.isFinite(w) && w > 0) distributionCoverageOrder.push(i);
    }
  }
  if (distributionCoverageCursor >= distributionCoverageOrder.length) return null;
  const idx = distributionCoverageOrder[distributionCoverageCursor];
  distributionCoverageCursor += 1;
  return idx;
}

export function resetColorDistributionCoverage() {
  distributionCoverageKey = '';
  distributionCoverageCursor = 0;
  distributionCoverageOrder = [];
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

export function getTimeOfDayPaletteTemplate() {
  return resolveLondonWeatherPaletteId(getTimeOfDayPaletteId()) || DEFAULT_LONDON_WEATHER_PALETTE_ID;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CURSOR COLOR (contrasty-only palette selection)
// - Single source of truth for cursor dot + trail
// - Event-driven (mode switch / reset / startup / palette change), not in hot paths
// ═══════════════════════════════════════════════════════════════════════════════

const CURSOR_SAFE_FALLBACK_INDICES = [3, 5, 6, 7];
const CURSOR_SAT_MIN = 0.18; // exclude greys/white/black; keep “ball color” feel
const ROUTE_CURSOR_ACCENT_INDEXES = Object.freeze({
  home: 3,
  portfolio: 5,
  about: 6,
  contact: 7,
});

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

function resolveCssColorToHex(colorExpression) {
  if (typeof document === 'undefined') return null;
  try {
    const probe = document.createElement('div');
    probe.style.cssText =
      `position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;color:${colorExpression};`;
    document.documentElement.appendChild(probe);
    const cssColor = getComputedStyle(probe).color;
    probe.remove();
    return parseComputedCssColorToHex(cssColor);
  } catch (_) {
    return null;
  }
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

export function getRouteCursorAccentHex(routeId) {
  if (!Object.prototype.hasOwnProperty.call(ROUTE_CURSOR_ACCENT_INDEXES, routeId)) return null;
  return resolveCssColorToHex(`var(--button-bar-accent-${routeId})`);
}

function getActiveProductionRouteId() {
  if (typeof document === 'undefined') return null;
  try {
    const routeId = document.documentElement?.dataset?.shellRoute;
    if (Object.prototype.hasOwnProperty.call(ROUTE_CURSOR_ACCENT_INDEXES, routeId)) return routeId;
    if (routeId) return null;

    const activeTab = document.querySelector('[data-route-tab][aria-current="page"]');
    const activeTabRoute = activeTab?.getAttribute('data-route-tab');
    if (Object.prototype.hasOwnProperty.call(ROUTE_CURSOR_ACCENT_INDEXES, activeTabRoute)) {
      return activeTabRoute;
    }

    if (document.body?.classList?.contains('portfolio-page')) return 'portfolio';
    if (document.body?.classList?.contains('about-page')) return 'about';
    if (document.body?.classList?.contains('contact-page')) return 'contact';
    if (
      document.body
      && !document.body.classList.contains('styleguide-page')
      && !document.body.classList.contains('simulation-dashboard-page')
      && !document.body.classList.contains('palette-lab-page')
      && !document.body.classList.contains('daily-focus-page')
      && !document.body.classList.contains('concept-simulation-page')
    ) {
      return 'home';
    }
  } catch (_) {
    return null;
  }
  return null;
}

export function applyRouteCursorColor(routeId) {
  if (!Object.prototype.hasOwnProperty.call(ROUTE_CURSOR_ACCENT_INDEXES, routeId)) return null;
  const hex = getRouteCursorAccentHex(routeId);
  if (!hex) return null;

  const g = getGlobals();
  g.cursorColorMode = 'route';
  g.cursorColorIndex = ROUTE_CURSOR_ACCENT_INDEXES[routeId];
  g.cursorColorHex = hex;
  g.cursorRouteId = routeId;
  stampCursorCSSVar(hex);

  try {
    document.documentElement.dataset.cursorRoute = routeId;
    document.documentElement.style.setProperty('--cursor-route-color', hex);
  } catch (_) { /* no-op */ }

  return { routeId, index: g.cursorColorIndex, hex };
}

export function applyActiveRouteCursorColor(routeId = getActiveProductionRouteId()) {
  return applyRouteCursorColor(routeId);
}

export function maybeAutoPickCursorColor(reason = 'auto') {
  const g = getGlobals();
  const routePick = applyActiveRouteCursorColor();
  if (routePick) return true;

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

export function getCurrentPalette(templateName, isDarkOverride) {
  const globals = getGlobals();
  const template = COLOR_TEMPLATES[resolveColorTemplateName(templateName)];
  if (!template) return COLOR_TEMPLATES[DEFAULT_LONDON_WEATHER_PALETTE_ID].light;

  const isDarkMode = typeof isDarkOverride === 'boolean'
    ? isDarkOverride
    : Boolean(globals.isDarkMode);
  const rawPalette = isDarkMode ? template.dark : template.light;
  
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
  
  // Primary: use the runtime color distribution (legend labels → distinct palette indices).
  // Hot-path safe: O(7) work, zero allocations.
  const dist = getDistribution(globals);
  if (dist && dist.length) {
    let total = 0;
    for (let i = 0; i < dist.length; i++) {
      const w = Number(dist[i]?.weight);
      if (Number.isFinite(w) && w > 0) total += w;
    }
    if (total > 0) {
      const coverageIndex = getCoverageDistributionIndex(dist);
      if (coverageIndex != null) {
        const row = dist[coverageIndex];
        const idx = clampIntFallback(row?.colorIndex, 0, 7, 0);
        return { color: colors[idx] || colors[0] || '#ffffff', distributionIndex: coverageIndex };
      }
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

  if (!colors.length) {
    const out = [];
    for (let i = 0; i < projectCount; i += 1) {
      out.push(getGeneratedPortfolioFallbackColor(i));
    }
    return out;
  }

  const out = [];
  const seen = new Set();
  const dist = getDistribution(globals);
  if (dist && dist.length) {
    for (let i = 0; i < dist.length; i += 1) {
      const paletteIndex = clampIntFallback(dist[i]?.colorIndex, 0, colors.length - 1, 0);
      addUniquePortfolioProjectColor(out, seen, colors[paletteIndex]);
      if (out.length >= projectCount) return out;
    }
  }

  for (let i = 0; i < colors.length; i += 1) {
    addUniquePortfolioProjectColor(out, seen, colors[i]);
    if (out.length >= projectCount) return out;
  }

  for (let i = 0; i < PORTFOLIO_GREY_FALLBACKS.length; i += 1) {
    addUniquePortfolioProjectColor(out, seen, PORTFOLIO_GREY_FALLBACKS[i]);
    if (out.length >= projectCount) return out;
  }

  let fallbackIndex = 0;
  while (out.length < projectCount) {
    addUniquePortfolioProjectColor(out, seen, getGeneratedPortfolioFallbackColor(fallbackIndex));
    fallbackIndex += 1;
  }
  return out;
}

function addUniquePortfolioProjectColor(out, seen, color) {
  if (!color) return false;
  const key = normalizeHexKey(color);
  if (seen.has(key)) return false;
  seen.add(key);
  out.push(color);
  return true;
}

function getGeneratedPortfolioFallbackColor(index) {
  const hue = ((Math.abs(Math.floor(index)) * 137.508) + 24) % 360;
  const rgb = hsvToRgb01({ h: hue, s: 0.58, v: 0.7 });
  return rgb255ToHex({
    r: Math.round(rgb.r * 255),
    g: Math.round(rgb.g * 255),
    b: Math.round(rgb.b * 255),
  });
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

function applyPaletteTheme(templateName) {
  const globals = getGlobals();
  const root = document.documentElement;
  const isDark = Boolean(globals.isDarkMode);
  const accents = getLondonWeatherPaletteAccents(templateName);
  if (!accents || !root) return;

  globals.frameColor = isDark ? globals.frameColorDark : globals.frameColorLight;
  globals.linkHoverColor = accents.linkHoverColor || globals.linkHoverColor;

  root.style.setProperty('--link-hover-color', globals.linkHoverColor);
  root.style.setProperty('--color-accent', accents.colorAccent || globals.linkHoverColor);
  root.style.setProperty('--hero-role-accent', accents.heroRoleAccent || globals.linkHoverColor);

  const panelFg = isDark ? globals.textColorDark : globals.textColorLight;
  const panelBrand = accents.panelBrand || accents.colorAccent || globals.linkHoverColor;
  const panelAccent = globals.linkHoverColor;
  const panelActionFg = computeSafeTextOnCursorColor(panelBrand) || panelFg;

  const panelVars = {
    '--panel-accent': hexToRgbaString(panelAccent, isDark ? 0.2 : 0.14),
    '--panel-accent-foreground': panelFg,
    '--panel-ring': panelAccent,
    '--panel-primary': panelAccent,
    '--panel-primary-foreground': computeSafeTextOnCursorColor(panelAccent) || panelFg,
    '--panel-brand': panelBrand,
    '--panel-brand-foreground': panelActionFg,
  };

  Object.entries(panelVars).forEach(([name, value]) => {
    root.style.setProperty(name, value);
    if (document.body) document.body.style.setProperty(name, value);
  });

}

export function applyColorTemplate(templateName) {
  const globals = getGlobals();
  const resolvedTemplateName = resolveColorTemplateName(templateName);
  globals.currentTemplate = resolvedTemplateName;
  applyPaletteTheme(resolvedTemplateName);
  globals.currentColors = getCurrentPalette(resolvedTemplateName);

  // Persist for chapter rotation and keep any UI selects in sync.
  try {
    localStorage.setItem(PALETTE_ROTATION_STORAGE_KEY, String(resolvedTemplateName || ''));
  } catch (_) { /* no-op */ }
  try {
    forEachPanelUiDocument((uiDocument) => {
      const select = uiDocument.getElementById('colorSelect');
      if (select) select.value = resolvedTemplateName;
    });
  } catch (_) { /* no-op */ }
  
  // Cursor color must remain valid across template + theme changes.
  // Route colour wins on production routes; non-production surfaces keep the legacy cursor mode.
  if (globals.cursorColorMode !== 'auto' && globals.cursorColorMode !== 'manual') {
    globals.cursorColorMode = 'auto';
  }
  
  // Update existing ball colors
  updateExistingBallColors();
  
  // Sync CSS variables
  syncPaletteVars(globals.currentColors);

  const routePick = applyActiveRouteCursorColor();
  if (!routePick) {
    applyCursorColorIndex(globals.cursorColorIndex, { forceMode: globals.cursorColorMode });
  }
  
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

  for (let i = 0; i < balls.length; i++) {
    if (balls[i]?._preserveColor) continue;
    balls[i].color = pickRandomColor();
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

    const routeAccentIndexes = {
      home: 3,
      portfolio: 5,
      about: 6,
      contact: 7,
      sound: 3,
    };
    Object.entries(routeAccentIndexes).forEach(([routeId, colorIndex]) => {
      const hex = list[colorIndex] || '#ffffff';
      root.style.setProperty(`--button-bar-accent-${routeId}`, hex);
      root.style.setProperty(`--button-bar-accent-${routeId}-ink`, computeSafeTextOnCursorColor(hex) || '#ffffff');
    });
  } catch (_) { /* no-op */ }
}

function updateColorPickersUI() {
  const globals = getGlobals();
  const colors = globals.currentColors;

  forEachPanelUiDocument((uiDocument) => {
    for (let i = 1; i <= 8; i++) {
      const picker = uiDocument.getElementById(`color${i}`);
      const display = uiDocument.getElementById(`color${i}Val`);
      if (picker && colors[i - 1]) {
        picker.value = colors[i - 1];
        if (display) display.textContent = colors[i - 1].toUpperCase();
      }
    }
  });
}

export function populateColorSelect() {
  const globals = getGlobals();
  forEachPanelUiDocument((uiDocument) => {
    const select = uiDocument.getElementById('colorSelect');
    if (!select) return;

    select.innerHTML = '';
    for (const key of PALETTE_CHAPTER_ORDER) {
      const template = COLOR_TEMPLATES[key];
      if (!template) continue;
      const option = uiDocument.createElement('option');
      option.value = key;
      option.textContent = template.label;
      select.appendChild(option);
    }

    select.value = resolveColorTemplateName(globals.currentTemplate);
  });
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

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImNvbG9ycy5qcyJdLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBnZXRHbG9iYWxzIH0gZnJvbSBcIi9zcmMvbGVnYWN5L21vZHVsZXMvY29yZS9zdGF0ZS5qc1wiO1xuaW1wb3J0IHsgZm9yRWFjaFBhbmVsVWlEb2N1bWVudCB9IGZyb20gXCIvc3JjL2xlZ2FjeS9tb2R1bGVzL3VpL3BhbmVsLXVpLWNvbnRleHQuanNcIjtcbmltcG9ydCB7XG4gIERFRkFVTFRfTE9ORE9OX1dFQVRIRVJfUEFMRVRURV9JRCxcbiAgTE9ORE9OX1dFQVRIRVJfUEFMRVRURVMsXG4gIGdldExvbmRvbldlYXRoZXJQYWxldHRlQWNjZW50cyxcbiAgcmVzb2x2ZUxvbmRvbldlYXRoZXJQYWxldHRlSWQsXG59IGZyb20gXCIvc3JjL3BhbGV0dGUvbG9uZG9uUGFsZXR0ZXMuanNcIjtcbmltcG9ydCB7IGdldFRpbWVPZkRheVBhbGV0dGVJZCB9IGZyb20gXCIvc3JjL3BhbGV0dGUvdGltZU9mRGF5UGFsZXR0ZS5qc1wiO1xuXG5mdW5jdGlvbiBjbGFtcDAxKHQpIHtcbiAgY29uc3QgbiA9IE51bWJlcih0KTtcbiAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobikpIHJldHVybiAwO1xuICByZXR1cm4gbiA8IDAgPyAwIDogbiA+IDEgPyAxIDogbjtcbn1cblxuZnVuY3Rpb24gaGV4VG9SZ2IyNTUoaGV4KSB7XG4gIGNvbnN0IGggPSBTdHJpbmcoaGV4IHx8ICcnKS50cmltKCk7XG4gIGlmICghaCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IHMgPSBoWzBdID09PSAnIycgPyBoLnNsaWNlKDEpIDogaDtcbiAgaWYgKCEocy5sZW5ndGggPT09IDMgfHwgcy5sZW5ndGggPT09IDYpKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgZnVsbCA9IHMubGVuZ3RoID09PSAzXG4gICAgPyAoc1swXSArIHNbMF0gKyBzWzFdICsgc1sxXSArIHNbMl0gKyBzWzJdKVxuICAgIDogcztcbiAgY29uc3QgbiA9IHBhcnNlSW50KGZ1bGwsIDE2KTtcbiAgaWYgKCFOdW1iZXIuaXNGaW5pdGUobikpIHJldHVybiBudWxsO1xuICByZXR1cm4geyByOiAobiA+PiAxNikgJiAyNTUsIGc6IChuID4+IDgpICYgMjU1LCBiOiBuICYgMjU1IH07XG59XG5cbmZ1bmN0aW9uIHJnYjI1NVRvSGV4KHsgciwgZywgYiB9KSB7XG4gIGNvbnN0IHJyID0gKHIgfCAwKSAmIDI1NTtcbiAgY29uc3QgZ2cgPSAoZyB8IDApICYgMjU1O1xuICBjb25zdCBiYiA9IChiIHwgMCkgJiAyNTU7XG4gIGNvbnN0IG4gPSAocnIgPDwgMTYpIHwgKGdnIDw8IDgpIHwgYmI7XG4gIHJldHVybiBgIyR7bi50b1N0cmluZygxNikucGFkU3RhcnQoNiwgJzAnKX1gO1xufVxuXG5mdW5jdGlvbiBoZXhUb1JnYmFTdHJpbmcoaGV4LCBhbHBoYSA9IDEpIHtcbiAgY29uc3QgcmdiID0gaGV4VG9SZ2IyNTUoaGV4KTtcbiAgaWYgKCFyZ2IpIHJldHVybiBhbHBoYSA+PSAxID8gJyNmZmZmZmYnIDogYHJnYmEoMjU1LCAyNTUsIDI1NSwgJHthbHBoYX0pYDtcbiAgaWYgKGFscGhhID49IDEpIHJldHVybiBgcmdiKCR7cmdiLnJ9LCAke3JnYi5nfSwgJHtyZ2IuYn0pYDtcbiAgcmV0dXJuIGByZ2JhKCR7cmdiLnJ9LCAke3JnYi5nfSwgJHtyZ2IuYn0sICR7YWxwaGF9KWA7XG59XG5cbmZ1bmN0aW9uIHJnYjAxVG9Ic3YoeyByLCBnLCBiIH0pIHtcbiAgY29uc3QgcnIgPSBjbGFtcDAxKHIpO1xuICBjb25zdCBnZyA9IGNsYW1wMDEoZyk7XG4gIGNvbnN0IGJiID0gY2xhbXAwMShiKTtcblxuICBjb25zdCBtYXggPSBNYXRoLm1heChyciwgZ2csIGJiKTtcbiAgY29uc3QgbWluID0gTWF0aC5taW4ocnIsIGdnLCBiYik7XG4gIGNvbnN0IGQgPSBtYXggLSBtaW47XG5cbiAgbGV0IGggPSAwO1xuICBpZiAoZCA+IDApIHtcbiAgICBpZiAobWF4ID09PSBycikgaCA9ICgoZ2cgLSBiYikgLyBkKSAlIDY7XG4gICAgZWxzZSBpZiAobWF4ID09PSBnZykgaCA9IChiYiAtIHJyKSAvIGQgKyAyO1xuICAgIGVsc2UgaCA9IChyciAtIGdnKSAvIGQgKyA0O1xuICAgIGggKj0gNjA7XG4gICAgaWYgKGggPCAwKSBoICs9IDM2MDtcbiAgfVxuXG4gIGNvbnN0IHMgPSBtYXggPD0gMCA/IDAgOiAoZCAvIG1heCk7XG4gIGNvbnN0IHYgPSBtYXg7XG4gIHJldHVybiB7IGgsIHMsIHYgfTtcbn1cblxuZnVuY3Rpb24gaHN2VG9SZ2IwMSh7IGgsIHMsIHYgfSkge1xuICBjb25zdCBoaCA9ICgoTnVtYmVyKGgpICUgMzYwKSArIDM2MCkgJSAzNjA7XG4gIGNvbnN0IHNzID0gY2xhbXAwMShzKTtcbiAgY29uc3QgdnYgPSBjbGFtcDAxKHYpO1xuXG4gIGNvbnN0IGMgPSB2diAqIHNzO1xuICBjb25zdCB4ID0gYyAqICgxIC0gTWF0aC5hYnMoKChoaCAvIDYwKSAlIDIpIC0gMSkpO1xuICBjb25zdCBtID0gdnYgLSBjO1xuXG4gIGxldCByciA9IDAsIGdnID0gMCwgYmIgPSAwO1xuICBpZiAoaGggPCA2MCkgeyByciA9IGM7IGdnID0geDsgYmIgPSAwOyB9XG4gIGVsc2UgaWYgKGhoIDwgMTIwKSB7IHJyID0geDsgZ2cgPSBjOyBiYiA9IDA7IH1cbiAgZWxzZSBpZiAoaGggPCAxODApIHsgcnIgPSAwOyBnZyA9IGM7IGJiID0geDsgfVxuICBlbHNlIGlmIChoaCA8IDI0MCkgeyByciA9IDA7IGdnID0geDsgYmIgPSBjOyB9XG4gIGVsc2UgaWYgKGhoIDwgMzAwKSB7IHJyID0geDsgZ2cgPSAwOyBiYiA9IGM7IH1cbiAgZWxzZSB7IHJyID0gYzsgZ2cgPSAwOyBiYiA9IHg7IH1cblxuICByZXR1cm4geyByOiByciArIG0sIGc6IGdnICsgbSwgYjogYmIgKyBtIH07XG59XG5cbmZ1bmN0aW9uIGxlcnAyNTUoYSwgYiwgdCkge1xuICByZXR1cm4gTWF0aC5yb3VuZChhICsgKGIgLSBhKSAqIHQpO1xufVxuXG5mdW5jdGlvbiBjbGFtcDI1NShuKSB7XG4gIGNvbnN0IHggPSBOdW1iZXIobik7XG4gIGlmICghTnVtYmVyLmlzRmluaXRlKHgpKSByZXR1cm4gMDtcbiAgcmV0dXJuIHggPCAwID8gMCA6IHggPiAyNTUgPyAyNTUgOiB4O1xufVxuXG5leHBvcnQgY29uc3QgQ09MT1JfVEVNUExBVEVTID0ge1xuICAuLi5MT05ET05fV0VBVEhFUl9QQUxFVFRFUy5yZWR1Y2UoKGFjYywgcGFsZXR0ZSkgPT4ge1xuICAgIGFjY1twYWxldHRlLmlkXSA9IHtcbiAgICAgIGxhYmVsOiBwYWxldHRlLmxhYmVsLFxuICAgICAgbGlnaHQ6IHBhbGV0dGUubGlnaHQuc2xpY2UoKSxcbiAgICAgIGRhcms6IHBhbGV0dGUuZGFyay5zbGljZSgpLFxuICAgIH07XG4gICAgcmV0dXJuIGFjYztcbiAgfSwge30pXG59O1xuXG5leHBvcnQgY29uc3QgUEFMRVRURV9DSEFQVEVSX09SREVSID0gTE9ORE9OX1dFQVRIRVJfUEFMRVRURVMubWFwKChwYWxldHRlKSA9PiBwYWxldHRlLmlkKTtcblxuY29uc3QgUEFMRVRURV9ST1RBVElPTl9TVE9SQUdFX0tFWSA9ICdhYnNfcGFsZXR0ZV9jaGFwdGVyJztcblxuLy8gTGVnYWN5IGZhbGxiYWNrIHdlaWdodHMgKG9ubHkgdXNlZCBpZiBubyB2YWxpZCBgY29sb3JEaXN0cmlidXRpb25gIGlzIHByZXNlbnQpLlxuY29uc3QgTEVHQUNZX0NPTE9SX1dFSUdIVFMgPSBbMC41MCwgMC4yNSwgMC4xMiwgMC4wNiwgMC4wMywgMC4wMiwgMC4wMSwgMC4wMV07XG5sZXQgZGlzdHJpYnV0aW9uQ292ZXJhZ2VLZXkgPSAnJztcbmxldCBkaXN0cmlidXRpb25Db3ZlcmFnZUN1cnNvciA9IDA7XG5sZXQgZGlzdHJpYnV0aW9uQ292ZXJhZ2VPcmRlciA9IFtdO1xuXG4vLyBTaGFyZWQgcGFsZXR0ZSByb2xlcyBhY3Jvc3Mgc2ltdWxhdGlvbiBtb2Rlczpcbi8vIG5ldXRyYWxzIGRvbWluYXRlLCBjaHJvbWF0aWMgYWNjZW50cyBhcmUgc2Vjb25kYXJ5LCBhbmQgdGhlIGhvdHRlc3QgYWNjZW50cyBhcmUgcmFyZS5cbmV4cG9ydCBjb25zdCBQQUxFVFRFX05FVVRSQUxfSU5ESUNFUyA9IFswLCAxLCAyLCA0XTtcbmV4cG9ydCBjb25zdCBQQUxFVFRFX0NIUk9NQVRJQ19JTkRJQ0VTID0gWzMsIDZdO1xuZXhwb3J0IGNvbnN0IFBBTEVUVEVfQlJJR0hUX0FDQ0VOVF9JTkRJQ0VTID0gWzUsIDddO1xuXG5mdW5jdGlvbiBjbGFtcEludEZhbGxiYWNrKHYsIG1pbiwgbWF4LCBmYWxsYmFjayA9IG1pbikge1xuICBjb25zdCBuID0gTnVtYmVyKHYpO1xuICBpZiAoIU51bWJlci5pc0Zpbml0ZShuKSkgcmV0dXJuIGZhbGxiYWNrO1xuICBjb25zdCBpID0gTWF0aC5mbG9vcihuKTtcbiAgcmV0dXJuIGkgPCBtaW4gPyBtaW4gOiBpID4gbWF4ID8gbWF4IDogaTtcbn1cblxuZnVuY3Rpb24gZ2V0RGlzdHJpYnV0aW9uKGcpIHtcbiAgY29uc3QgZGlzdCA9IGc/LmNvbG9yRGlzdHJpYnV0aW9uO1xuICByZXR1cm4gQXJyYXkuaXNBcnJheShkaXN0KSA/IGRpc3QgOiBudWxsO1xufVxuXG5mdW5jdGlvbiBnZXREaXN0cmlidXRpb25Db3ZlcmFnZUtleShkaXN0KSB7XG4gIGxldCBrZXkgPSAnJztcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgY29uc3Qgcm93ID0gZGlzdFtpXTtcbiAgICBjb25zdCB3ID0gTnVtYmVyKHJvdz8ud2VpZ2h0KTtcbiAgICBpZiAoIU51bWJlci5pc0Zpbml0ZSh3KSB8fCB3IDw9IDApIGNvbnRpbnVlO1xuICAgIGtleSArPSBgJHtpfToke3Jvdz8ubGFiZWwgfHwgJyd9OiR7cm93Py5jb2xvckluZGV4fToke3d9fGA7XG4gIH1cbiAgcmV0dXJuIGtleTtcbn1cblxuZnVuY3Rpb24gZ2V0Q292ZXJhZ2VEaXN0cmlidXRpb25JbmRleChkaXN0KSB7XG4gIGNvbnN0IGtleSA9IGdldERpc3RyaWJ1dGlvbkNvdmVyYWdlS2V5KGRpc3QpO1xuICBpZiAoa2V5ICE9PSBkaXN0cmlidXRpb25Db3ZlcmFnZUtleSkge1xuICAgIGRpc3RyaWJ1dGlvbkNvdmVyYWdlS2V5ID0ga2V5O1xuICAgIGRpc3RyaWJ1dGlvbkNvdmVyYWdlQ3Vyc29yID0gMDtcbiAgICBkaXN0cmlidXRpb25Db3ZlcmFnZU9yZGVyID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB3ID0gTnVtYmVyKGRpc3RbaV0/LndlaWdodCk7XG4gICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHcpICYmIHcgPiAwKSBkaXN0cmlidXRpb25Db3ZlcmFnZU9yZGVyLnB1c2goaSk7XG4gICAgfVxuICB9XG4gIGlmIChkaXN0cmlidXRpb25Db3ZlcmFnZUN1cnNvciA+PSBkaXN0cmlidXRpb25Db3ZlcmFnZU9yZGVyLmxlbmd0aCkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGlkeCA9IGRpc3RyaWJ1dGlvbkNvdmVyYWdlT3JkZXJbZGlzdHJpYnV0aW9uQ292ZXJhZ2VDdXJzb3JdO1xuICBkaXN0cmlidXRpb25Db3ZlcmFnZUN1cnNvciArPSAxO1xuICByZXR1cm4gaWR4O1xufVxuXG5leHBvcnQgZnVuY3Rpb24gcmVzZXRDb2xvckRpc3RyaWJ1dGlvbkNvdmVyYWdlKCkge1xuICBkaXN0cmlidXRpb25Db3ZlcmFnZUtleSA9ICcnO1xuICBkaXN0cmlidXRpb25Db3ZlcmFnZUN1cnNvciA9IDA7XG4gIGRpc3RyaWJ1dGlvbkNvdmVyYWdlT3JkZXIgPSBbXTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHJlc29sdmVDb2xvclRlbXBsYXRlTmFtZSh0ZW1wbGF0ZU5hbWUpIHtcbiAgcmV0dXJuIHJlc29sdmVMb25kb25XZWF0aGVyUGFsZXR0ZUlkKHRlbXBsYXRlTmFtZSkgfHwgREVGQVVMVF9MT05ET05fV0VBVEhFUl9QQUxFVFRFX0lEO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0UGFsZXR0ZVRlbXBsYXRlT3ZlcnJpZGVGcm9tVXJsKCkge1xuICBpZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIGNvbnN0IHJhdyA9IG5ldyBVUkxTZWFyY2hQYXJhbXMod2luZG93LmxvY2F0aW9uLnNlYXJjaCkuZ2V0KCdwYWxldHRlJyk7XG4gICAgcmV0dXJuIHJlc29sdmVMb25kb25XZWF0aGVyUGFsZXR0ZUlkKHJhdyk7XG4gIH0gY2F0Y2ggKF8pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0VGltZU9mRGF5UGFsZXR0ZVRlbXBsYXRlKCkge1xuICByZXR1cm4gcmVzb2x2ZUxvbmRvbldlYXRoZXJQYWxldHRlSWQoZ2V0VGltZU9mRGF5UGFsZXR0ZUlkKCkpIHx8IERFRkFVTFRfTE9ORE9OX1dFQVRIRVJfUEFMRVRURV9JRDtcbn1cblxuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG4vLyBDVVJTT1IgQ09MT1IgKGNvbnRyYXN0eS1vbmx5IHBhbGV0dGUgc2VsZWN0aW9uKVxuLy8gLSBTaW5nbGUgc291cmNlIG9mIHRydXRoIGZvciBjdXJzb3IgZG90ICsgdHJhaWxcbi8vIC0gRXZlbnQtZHJpdmVuIChtb2RlIHN3aXRjaCAvIHJlc2V0IC8gc3RhcnR1cCAvIHBhbGV0dGUgY2hhbmdlKSwgbm90IGluIGhvdCBwYXRoc1xuLy8g4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQ4pWQXG5cbmNvbnN0IENVUlNPUl9TQUZFX0ZBTExCQUNLX0lORElDRVMgPSBbMywgNSwgNiwgN107XG5jb25zdCBDVVJTT1JfU0FUX01JTiA9IDAuMTg7IC8vIGV4Y2x1ZGUgZ3JleXMvd2hpdGUvYmxhY2s7IGtlZXAg4oCcYmFsbCBjb2xvcuKAnSBmZWVsXG5jb25zdCBST1VURV9DVVJTT1JfQUNDRU5UX0lOREVYRVMgPSBPYmplY3QuZnJlZXplKHtcbiAgaG9tZTogMyxcbiAgcG9ydGZvbGlvOiA1LFxuICBhYm91dDogNixcbiAgY29udGFjdDogNyxcbn0pO1xuXG5mdW5jdGlvbiBjbGFtcEludCh2LCBtaW4sIG1heCkge1xuICBjb25zdCBuID0gTnVtYmVyKHYpO1xuICBpZiAoIU51bWJlci5pc0Zpbml0ZShuKSkgcmV0dXJuIG1pbjtcbiAgY29uc3QgaSA9IE1hdGguZmxvb3Iobik7XG4gIHJldHVybiBpIDwgbWluID8gbWluIDogaSA+IG1heCA/IG1heCA6IGk7XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXlPZk51bWJlcnModikge1xuICByZXR1cm4gQXJyYXkuaXNBcnJheSh2KSAmJiB2LmV2ZXJ5KHggPT4gTnVtYmVyLmlzRmluaXRlKE51bWJlcih4KSkpO1xufVxuXG5mdW5jdGlvbiBoZXhUb1JnYjAxKGhleCkge1xuICBjb25zdCBoID0gU3RyaW5nKGhleCB8fCAnJykudHJpbSgpO1xuICBpZiAoIWgpIHJldHVybiBudWxsO1xuICBjb25zdCBzID0gaFswXSA9PT0gJyMnID8gaC5zbGljZSgxKSA6IGg7XG4gIGlmICghKHMubGVuZ3RoID09PSAzIHx8IHMubGVuZ3RoID09PSA2KSkgcmV0dXJuIG51bGw7XG4gIGNvbnN0IGZ1bGwgPSBzLmxlbmd0aCA9PT0gM1xuICAgID8gKHNbMF0gKyBzWzBdICsgc1sxXSArIHNbMV0gKyBzWzJdICsgc1syXSlcbiAgICA6IHM7XG4gIGNvbnN0IG4gPSBwYXJzZUludChmdWxsLCAxNik7XG4gIGlmICghTnVtYmVyLmlzRmluaXRlKG4pKSByZXR1cm4gbnVsbDtcbiAgY29uc3QgciA9IChuID4+IDE2KSAmIDI1NTtcbiAgY29uc3QgZyA9IChuID4+IDgpICYgMjU1O1xuICBjb25zdCBiID0gbiAmIDI1NTtcbiAgcmV0dXJuIHsgcjogciAvIDI1NSwgZzogZyAvIDI1NSwgYjogYiAvIDI1NSB9O1xufVxuXG5mdW5jdGlvbiBzcmdiVG9MaW5lYXIoYykge1xuICByZXR1cm4gYyA8PSAwLjA0MDQ1ID8gKGMgLyAxMi45MikgOiBNYXRoLnBvdygoYyArIDAuMDU1KSAvIDEuMDU1LCAyLjQpO1xufVxuXG5mdW5jdGlvbiByZWxhdGl2ZUx1bWluYW5jZShoZXgpIHtcbiAgY29uc3QgcmdiID0gaGV4VG9SZ2IwMShoZXgpO1xuICBpZiAoIXJnYikgcmV0dXJuIDE7XG4gIGNvbnN0IHIgPSBzcmdiVG9MaW5lYXIocmdiLnIpO1xuICBjb25zdCBnID0gc3JnYlRvTGluZWFyKHJnYi5nKTtcbiAgY29uc3QgYiA9IHNyZ2JUb0xpbmVhcihyZ2IuYik7XG4gIHJldHVybiAwLjIxMjYgKiByICsgMC43MTUyICogZyArIDAuMDcyMiAqIGI7XG59XG5cbmZ1bmN0aW9uIGhzdlNhdHVyYXRpb24oaGV4KSB7XG4gIGNvbnN0IHJnYiA9IGhleFRvUmdiMDEoaGV4KTtcbiAgaWYgKCFyZ2IpIHJldHVybiAwO1xuICBjb25zdCBtYXggPSBNYXRoLm1heChyZ2IuciwgcmdiLmcsIHJnYi5iKTtcbiAgY29uc3QgbWluID0gTWF0aC5taW4ocmdiLnIsIHJnYi5nLCByZ2IuYik7XG4gIGNvbnN0IGQgPSBtYXggLSBtaW47XG4gIGlmIChtYXggPD0gMCkgcmV0dXJuIDA7XG4gIHJldHVybiBkIC8gbWF4O1xufVxuXG5jb25zdCBXQ0FHX0FBX1JBVElPID0gNC41O1xuXG4vKipcbiAqIENvbXB1dGUgYSBXQ0FHIEFBICg0LjU6MSkgdGV4dCBjb2xvciBmb3IgdXNlIG9uIGEgc29saWQgY3Vyc29yLWNvbG9yIGJhY2tncm91bmQuXG4gKiBVc2VkIGJ5IHRoZSBxdW90ZSBidXR0b24gaG92ZXIgc3RhdGUgKGZ1bGwgY3Vyc29yIGZpbGwpLiBSZXR1cm5zIHdoaXRlIG9yIGJsYWNrXG4gKiAoYXMgcmdiKCkgc3RyaW5nKSBkZXBlbmRpbmcgb24gY3Vyc29yIGx1bWluYW5jZSBzbyBib3RoIGxpZ2h0IGFuZCBkYXJrIGN1cnNvcnMgZ2V0IHJlYWRhYmxlIHRleHQuXG4gKi9cbmZ1bmN0aW9uIGNvbXB1dGVTYWZlVGV4dE9uQ3Vyc29yQ29sb3IoY3Vyc29ySGV4KSB7XG4gIGNvbnN0IGN1cnNvclJnYiA9IGhleFRvUmdiMjU1KGN1cnNvckhleCk7XG4gIGlmICghY3Vyc29yUmdiKSByZXR1cm4gbnVsbDtcbiAgY29uc3Qgd2hpdGUgPSB7IHI6IDI1NSwgZzogMjU1LCBiOiAyNTUgfTtcbiAgY29uc3QgYmxhY2sgPSB7IHI6IDAsIGc6IDAsIGI6IDAgfTtcbiAgY29uc3Qgd2hpdGVDciA9IGNvbXB1dGVDb250cmFzdFJhdGlvKHdoaXRlLCBjdXJzb3JSZ2IpO1xuICBjb25zdCBibGFja0NyID0gY29tcHV0ZUNvbnRyYXN0UmF0aW8oYmxhY2ssIGN1cnNvclJnYik7XG4gIGNvbnN0IGN1cnNvckx1bWEgPSByZWxhdGl2ZUx1bWluYW5jZShjdXJzb3JIZXgpO1xuICBpZiAod2hpdGVDciA+PSBXQ0FHX0FBX1JBVElPICYmIGJsYWNrQ3IgPj0gV0NBR19BQV9SQVRJTykge1xuICAgIHJldHVybiBjdXJzb3JMdW1hID4gMC41ID8gYHJnYigke2JsYWNrLnJ9ICR7YmxhY2suZ30gJHtibGFjay5ifSlgIDogYHJnYigke3doaXRlLnJ9ICR7d2hpdGUuZ30gJHt3aGl0ZS5ifSlgO1xuICB9XG4gIGlmICh3aGl0ZUNyID49IFdDQUdfQUFfUkFUSU8pIHJldHVybiBgcmdiKCR7d2hpdGUucn0gJHt3aGl0ZS5nfSAke3doaXRlLmJ9KWA7XG4gIGlmIChibGFja0NyID49IFdDQUdfQUFfUkFUSU8pIHJldHVybiBgcmdiKCR7YmxhY2sucn0gJHtibGFjay5nfSAke2JsYWNrLmJ9KWA7XG4gIHJldHVybiBjdXJzb3JMdW1hID4gMC41ID8gYHJnYigke2JsYWNrLnJ9ICR7YmxhY2suZ30gJHtibGFjay5ifSlgIDogYHJnYigke3doaXRlLnJ9ICR7d2hpdGUuZ30gJHt3aGl0ZS5ifSlgO1xufVxuXG4vKipcbiAqIFdDQUcgY29udHJhc3QgcmF0aW8gYmV0d2VlbiB0d28gUkdCIGNvbG9yc1xuICovXG5mdW5jdGlvbiBjb21wdXRlQ29udHJhc3RSYXRpbyhyZ2IxLCByZ2IyKSB7XG4gIGNvbnN0IGx1bWExID0gY29tcHV0ZVJlbGF0aXZlTHVtaW5hbmNlKHJnYjEpO1xuICBjb25zdCBsdW1hMiA9IGNvbXB1dGVSZWxhdGl2ZUx1bWluYW5jZShyZ2IyKTtcbiAgY29uc3QgaGkgPSBNYXRoLm1heChsdW1hMSwgbHVtYTIpO1xuICBjb25zdCBsbyA9IE1hdGgubWluKGx1bWExLCBsdW1hMik7XG4gIHJldHVybiAoaGkgKyAwLjA1KSAvIChsbyArIDAuMDUpO1xufVxuXG4vKipcbiAqIFJlbGF0aXZlIGx1bWluYW5jZSBmb3IgUkdCMjU1IHZhbHVlc1xuICovXG5mdW5jdGlvbiBjb21wdXRlUmVsYXRpdmVMdW1pbmFuY2UoeyByLCBnLCBiIH0pIHtcbiAgY29uc3QgdG9MaW5lYXIgPSAoYykgPT4ge1xuICAgIGNvbnN0IHZhbCA9IGMgLyAyNTU7XG4gICAgcmV0dXJuIHZhbCA8PSAwLjA0MDQ1ID8gdmFsIC8gMTIuOTIgOiBNYXRoLnBvdygodmFsICsgMC4wNTUpIC8gMS4wNTUsIDIuNCk7XG4gIH07XG4gIHJldHVybiAwLjIxMjYgKiB0b0xpbmVhcihyKSArIDAuNzE1MiAqIHRvTGluZWFyKGcpICsgMC4wNzIyICogdG9MaW5lYXIoYik7XG59XG5cbi8qKlxuICogRGVzYXR1cmF0ZSBncmV5cyAoaW5kaWNlcyAwLCAxKSBhbmQgYWxpZ24gdGhlbSB3aXRoIGJhY2tncm91bmQgaHVlXG4gKiBUaGlzIG1ha2VzIGdyZXlzIGxlc3MgY29sb3JlZCBhbmQgbW9yZSBoYXJtb25pb3VzIHdpdGggdGhlIGJhY2tncm91bmRcbiAqIEluIGRhcmsgbW9kZSwgYWxzbyBkYXJrZW5zIHRoZSBncmV5cyBmb3IgYmV0dGVyIGNvbnRyYXN0XG4gKi9cbmZ1bmN0aW9uIGRlc2F0dXJhdGVHcmV5c1RvQmFja2dyb3VuZChwYWxldHRlLCBiZ0hleCwgaXNEYXJrTW9kZSA9IGZhbHNlKSB7XG4gIGlmICghcGFsZXR0ZSB8fCAhQXJyYXkuaXNBcnJheShwYWxldHRlKSkgcmV0dXJuIHBhbGV0dGU7XG4gIGNvbnN0IG91dCA9IFsuLi5wYWxldHRlXTtcbiAgXG4gIC8vIEV4dHJhY3QgaHVlIGZyb20gYmFja2dyb3VuZCBjb2xvclxuICBjb25zdCBiZ1JnYiA9IGhleFRvUmdiMDEoYmdIZXgpO1xuICBpZiAoIWJnUmdiKSByZXR1cm4gb3V0O1xuICBjb25zdCBiZ0hzdiA9IHJnYjAxVG9Ic3YoYmdSZ2IpO1xuICBcbiAgLy8gSWYgYmFja2dyb3VuZCBpcyB0b28gZGVzYXR1cmF0ZWQgKHB1cmUgZ3JleSksIHVzZSBhIG5ldXRyYWwgaHVlICgwKVxuICAvLyBPdGhlcndpc2UgdXNlIHRoZSBiYWNrZ3JvdW5kJ3MgaHVlIGZvciBoYXJtb255XG4gIGNvbnN0IGJnSHVlID0gYmdIc3YucyA8IDAuMDUgPyAwIDogYmdIc3YuaDtcbiAgXG4gIC8vIFByb2Nlc3MgZ3JleSBpbmRpY2VzICgwLCAxKSAtIHNraXAgbmV1dHJhbHMgKDIgPSB3aGl0ZSwgNCA9IGJsYWNrKVxuICBjb25zdCBncmV5SW5kaWNlcyA9IFswLCAxXTtcbiAgZm9yIChjb25zdCBpZHggb2YgZ3JleUluZGljZXMpIHtcbiAgICBjb25zdCBncmV5SGV4ID0gb3V0W2lkeF07XG4gICAgaWYgKCFncmV5SGV4KSBjb250aW51ZTtcbiAgICBcbiAgICBjb25zdCBncmV5UmdiID0gaGV4VG9SZ2IwMShncmV5SGV4KTtcbiAgICBpZiAoIWdyZXlSZ2IpIGNvbnRpbnVlO1xuICAgIGNvbnN0IGdyZXlIc3YgPSByZ2IwMVRvSHN2KGdyZXlSZ2IpO1xuICAgIFxuICAgIC8vIERlc2F0dXJhdGUgc2lnbmlmaWNhbnRseSAocmVkdWNlIHRvIDUtMTAlIG9mIG9yaWdpbmFsIHNhdHVyYXRpb24pXG4gICAgLy8gYnV0IHNoaWZ0IGh1ZSB0byBtYXRjaCBiYWNrZ3JvdW5kIGZvciBoYXJtb255XG4gICAgY29uc3QgZGVzYXR1cmF0ZWRTYXQgPSBNYXRoLm1heCgwLCBNYXRoLm1pbigwLjE1LCBncmV5SHN2LnMgKiAwLjEpKTtcbiAgICBcbiAgICAvLyBJbiBkYXJrIG1vZGUsIGRhcmtlbiB0aGUgZ3JleXMgKHJlZHVjZSB2YWx1ZS9saWdodG5lc3MgYnkgfjQwLTQ1JSlcbiAgICAvLyBUaGlzIG1ha2VzIHRoZW0gbW9yZSBzdWJ0bGUgYW5kIGJldHRlciBpbnRlZ3JhdGVkIHdpdGggZGFyayBiYWNrZ3JvdW5kc1xuICAgIGxldCBhZGp1c3RlZFZhbHVlID0gZ3JleUhzdi52O1xuICAgIGlmIChpc0RhcmtNb2RlKSB7XG4gICAgICAvLyBEYXJrZW46IHJlZHVjZSB2YWx1ZSBieSB+NDUlIChtdWx0aXBseSBieSAwLjU1KVxuICAgICAgLy8gS2VlcCBhIG1pbmltdW0gdmFsdWUgdG8gZW5zdXJlIHRoZXkncmUgc3RpbGwgdmlzaWJsZVxuICAgICAgYWRqdXN0ZWRWYWx1ZSA9IE1hdGgubWF4KDAuMTUsIGdyZXlIc3YudiAqIDAuNTUpO1xuICAgIH1cbiAgICBcbiAgICAvLyBDb252ZXJ0IGJhY2sgdG8gUkdCIHdpdGggZGVzYXR1cmF0ZWQgc2F0dXJhdGlvbiBhbmQgYmFja2dyb3VuZCBodWVcbiAgICBjb25zdCBkZXNhdHVyYXRlZEhzdiA9IHtcbiAgICAgIGg6IGJnSHVlLFxuICAgICAgczogZGVzYXR1cmF0ZWRTYXQsXG4gICAgICB2OiBhZGp1c3RlZFZhbHVlXG4gICAgfTtcbiAgICBcbiAgICBjb25zdCBkZXNhdHVyYXRlZFJnYiA9IGhzdlRvUmdiMDEoZGVzYXR1cmF0ZWRIc3YpO1xuICAgIG91dFtpZHhdID0gcmdiMjU1VG9IZXgoe1xuICAgICAgcjogTWF0aC5yb3VuZChkZXNhdHVyYXRlZFJnYi5yICogMjU1KSxcbiAgICAgIGc6IE1hdGgucm91bmQoZGVzYXR1cmF0ZWRSZ2IuZyAqIDI1NSksXG4gICAgICBiOiBNYXRoLnJvdW5kKGRlc2F0dXJhdGVkUmdiLmIgKiAyNTUpXG4gICAgfSk7XG4gIH1cbiAgXG4gIHJldHVybiBvdXQ7XG59XG5cbmZ1bmN0aW9uIGFwcGx5Q3Vyc29ySG92ZXJGZ1ZhcnMoY3Vyc29ySGV4KSB7XG4gIGNvbnN0IGZnT25DdXJzb3IgPSBjb21wdXRlU2FmZVRleHRPbkN1cnNvckNvbG9yKGN1cnNvckhleCk7XG4gIGlmICghZmdPbkN1cnNvcikgcmV0dXJuO1xuICB0cnkge1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1jdXJzb3ItaG92ZXItZmcnLCBmZ09uQ3Vyc29yKTtcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoJy0tcXVvdGUtaG92ZXItZmcnLCBmZ09uQ3Vyc29yKTtcbiAgfSBjYXRjaCAoXykgeyAvKiBuby1vcCAqLyB9XG59XG5cbmZ1bmN0aW9uIHBhcnNlQ29tcHV0ZWRDc3NDb2xvclRvSGV4KGNzc0NvbG9yKSB7XG4gIGNvbnN0IHMgPSBTdHJpbmcoY3NzQ29sb3IgfHwgJycpLnRyaW0oKTtcbiAgaWYgKCFzIHx8IHMgPT09ICd0cmFuc3BhcmVudCcpIHJldHVybiBudWxsO1xuICBjb25zdCByZ2JhMCA9IHMubWF0Y2goL15yZ2JhP1xcKFxccyooW1xcZC5dKylcXHMqLFxccyooW1xcZC5dKylcXHMqLFxccyooW1xcZC5dKykvaSk7XG4gIGlmIChyZ2JhMCkge1xuICAgIHJldHVybiByZ2IyNTVUb0hleCh7XG4gICAgICByOiBjbGFtcDI1NShwYXJzZUZsb2F0KHJnYmEwWzFdKSksXG4gICAgICBnOiBjbGFtcDI1NShwYXJzZUZsb2F0KHJnYmEwWzJdKSksXG4gICAgICBiOiBjbGFtcDI1NShwYXJzZUZsb2F0KHJnYmEwWzNdKSksXG4gICAgfSk7XG4gIH1cbiAgY29uc3QgcmdiYTEgPSBzLm1hdGNoKC9ecmdiYT9cXChcXHMqKFtcXGQuXSspXFxzKyhbXFxkLl0rKVxccysoW1xcZC5dKykoPzpcXHMqXFwvfFxccyosfFxccyokKS9pKTtcbiAgaWYgKHJnYmExKSB7XG4gICAgcmV0dXJuIHJnYjI1NVRvSGV4KHtcbiAgICAgIHI6IGNsYW1wMjU1KHBhcnNlRmxvYXQocmdiYTFbMV0pKSxcbiAgICAgIGc6IGNsYW1wMjU1KHBhcnNlRmxvYXQocmdiYTFbMl0pKSxcbiAgICAgIGI6IGNsYW1wMjU1KHBhcnNlRmxvYXQocmdiYTFbM10pKSxcbiAgICB9KTtcbiAgfVxuICBpZiAoc1swXSA9PT0gJyMnKSB7XG4gICAgY29uc3QgcmdiID0gaGV4VG9SZ2IyNTUocyk7XG4gICAgcmV0dXJuIHJnYiA/IHJnYjI1NVRvSGV4KHJnYikgOiBudWxsO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG4vKipcbiAqIFJlc29sdmUgdGhlIHRoZW1lJ3MgYC0tY3Vyc29yLWNvbG9yYCAoaW5jbHVkaW5nIGB2YXIoLS1iYWxsLSopYCBjaGFpbnMpIHRvIGEgaGV4IHNhbXBsZSBhbmRcbiAqIHN0YW1wIGAtLWN1cnNvci1ob3Zlci1mZ2AgLyBgLS1xdW90ZS1ob3Zlci1mZ2AuIFVzZSBvbiByb3V0ZXMgdGhhdCBza2lwIGBtYXliZUF1dG9QaWNrQ3Vyc29yQ29sb3JgXG4gKiAoZS5nLiBzdHlsZWd1aWRlKSBzbyBzb2xpZCBgOjpiZWZvcmVgIGhvdmVycyBzdGF5IFdDQUctcmVhZGFibGUuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBzdGFtcEN1cnNvckNvbnRyYXN0RnJvbVRoZW1lKCkge1xuICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJykgcmV0dXJuO1xuICB0cnkge1xuICAgIGNvbnN0IHByb2JlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgcHJvYmUuc3R5bGUuY3NzVGV4dCA9XG4gICAgICAncG9zaXRpb246Zml4ZWQ7bGVmdDotOTk5OXB4O3RvcDowO3Zpc2liaWxpdHk6aGlkZGVuO3BvaW50ZXItZXZlbnRzOm5vbmU7Y29sb3I6dmFyKC0tY3Vyc29yLWNvbG9yKTsnO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5hcHBlbmRDaGlsZChwcm9iZSk7XG4gICAgY29uc3QgY3NzQ29sb3IgPSBnZXRDb21wdXRlZFN0eWxlKHByb2JlKS5jb2xvcjtcbiAgICBwcm9iZS5yZW1vdmUoKTtcbiAgICBjb25zdCBoZXggPSBwYXJzZUNvbXB1dGVkQ3NzQ29sb3JUb0hleChjc3NDb2xvcik7XG4gICAgaWYgKGhleCkgYXBwbHlDdXJzb3JIb3ZlckZnVmFycyhoZXgpO1xuICB9IGNhdGNoIChfKSB7IC8qIG5vLW9wICovIH1cbn1cblxuZnVuY3Rpb24gc3RhbXBDdXJzb3JDU1NWYXIoaGV4KSB7XG4gIHRyeSB7XG4gICAgY29uc3QgY3Vyc29ySGV4ID0gU3RyaW5nKGhleCB8fCAnJykudHJpbSgpIHx8ICcjMDAwMDAwJztcbiAgICBkb2N1bWVudC5kb2N1bWVudEVsZW1lbnQuc3R5bGUuc2V0UHJvcGVydHkoJy0tY3Vyc29yLWNvbG9yJywgY3Vyc29ySGV4KTtcbiAgICBhcHBseUN1cnNvckhvdmVyRmdWYXJzKGN1cnNvckhleCk7XG4gIH0gY2F0Y2ggKF8pIHsgLyogbm8tb3AgKi8gfVxufVxuXG5mdW5jdGlvbiByZXNvbHZlQ3NzQ29sb3JUb0hleChjb2xvckV4cHJlc3Npb24pIHtcbiAgaWYgKHR5cGVvZiBkb2N1bWVudCA9PT0gJ3VuZGVmaW5lZCcpIHJldHVybiBudWxsO1xuICB0cnkge1xuICAgIGNvbnN0IHByb2JlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnZGl2Jyk7XG4gICAgcHJvYmUuc3R5bGUuY3NzVGV4dCA9XG4gICAgICBgcG9zaXRpb246Zml4ZWQ7bGVmdDotOTk5OXB4O3RvcDowO3Zpc2liaWxpdHk6aGlkZGVuO3BvaW50ZXItZXZlbnRzOm5vbmU7Y29sb3I6JHtjb2xvckV4cHJlc3Npb259O2A7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmFwcGVuZENoaWxkKHByb2JlKTtcbiAgICBjb25zdCBjc3NDb2xvciA9IGdldENvbXB1dGVkU3R5bGUocHJvYmUpLmNvbG9yO1xuICAgIHByb2JlLnJlbW92ZSgpO1xuICAgIHJldHVybiBwYXJzZUNvbXB1dGVkQ3NzQ29sb3JUb0hleChjc3NDb2xvcik7XG4gIH0gY2F0Y2ggKF8pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxufVxuXG5mdW5jdGlvbiByZXNvbHZlQ3Vyc29ySGV4RnJvbUluZGV4KGNvbG9ycywgaWR4KSB7XG4gIGNvbnN0IGxpc3QgPSBjb2xvcnMgJiYgY29sb3JzLmxlbmd0aCA/IGNvbG9ycyA6IFtdO1xuICBjb25zdCBpID0gY2xhbXBJbnQoaWR4LCAwLCBNYXRoLm1heCgwLCBNYXRoLm1pbig3LCBsaXN0Lmxlbmd0aCAtIDEpKSk7XG4gIHJldHVybiBsaXN0W2ldIHx8ICcjMDAwMDAwJztcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldEN1cnNvckNhbmRpZGF0ZUluZGljZXMoY29sb3JzLCBnbG9iYWxzT3ZlcnJpZGUpIHtcbiAgY29uc3QgZyA9IGdsb2JhbHNPdmVycmlkZSB8fCBnZXRHbG9iYWxzKCk7XG4gIGNvbnN0IGxpc3QgPSBjb2xvcnMgJiYgY29sb3JzLmxlbmd0aCA/IGNvbG9ycyA6IFtdO1xuICBjb25zdCBtYXhJZHggPSBNYXRoLm1pbig3LCBsaXN0Lmxlbmd0aCAtIDEpO1xuICBpZiAobWF4SWR4IDwgMCkgcmV0dXJuIFtdO1xuXG4gIGNvbnN0IGx1bWFNYXggPSBOdW1iZXIuaXNGaW5pdGUoTnVtYmVyKGcuY3Vyc29yQ29sb3JMdW1hTWF4KSkgPyBOdW1iZXIoZy5jdXJzb3JDb2xvckx1bWFNYXgpIDogMC42MjtcbiAgY29uc3QgYWxsb3cgPSBpc0FycmF5T2ZOdW1iZXJzKGcuY3Vyc29yQ29sb3JBbGxvd0luZGljZXMpXG4gICAgPyBnLmN1cnNvckNvbG9yQWxsb3dJbmRpY2VzLm1hcCh4ID0+IGNsYW1wSW50KHgsIDAsIDcpKVxuICAgIDogW107XG4gIGNvbnN0IGRlbnkgPSBpc0FycmF5T2ZOdW1iZXJzKGcuY3Vyc29yQ29sb3JEZW55SW5kaWNlcylcbiAgICA/IGcuY3Vyc29yQ29sb3JEZW55SW5kaWNlcy5tYXAoeCA9PiBjbGFtcEludCh4LCAwLCA3KSlcbiAgICA6IFtdO1xuXG4gIGNvbnN0IGRlbnlTZXQgPSBuZXcgU2V0KGRlbnkpO1xuICBjb25zdCBhbGxvd1NldCA9IGFsbG93Lmxlbmd0aCA/IG5ldyBTZXQoYWxsb3cpIDogbnVsbDtcblxuICBjb25zdCBvdXQgPSBbXTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPD0gbWF4SWR4OyBpKyspIHtcbiAgICBpZiAoZGVueVNldC5oYXMoaSkpIGNvbnRpbnVlO1xuICAgIGlmIChhbGxvd1NldCAmJiAhYWxsb3dTZXQuaGFzKGkpKSBjb250aW51ZTtcbiAgICBjb25zdCBoZXggPSBsaXN0W2ldO1xuICAgIGlmICghaGV4KSBjb250aW51ZTtcbiAgICBjb25zdCBsdW1hID0gcmVsYXRpdmVMdW1pbmFuY2UoaGV4KTtcbiAgICBpZiAobHVtYSA+IGx1bWFNYXgpIGNvbnRpbnVlOyAgICAgICAgICAvLyB0b28gbGlnaHRcbiAgICBjb25zdCBzYXQgPSBoc3ZTYXR1cmF0aW9uKGhleCk7XG4gICAgaWYgKHNhdCA8IENVUlNPUl9TQVRfTUlOKSBjb250aW51ZTsgICAgLy8gdG9vIGdyZXkvbmV1dHJhbFxuICAgIG91dC5wdXNoKGkpO1xuICB9XG5cbiAgaWYgKG91dC5sZW5ndGgpIHJldHVybiBvdXQ7XG5cbiAgLy8gSGFyZCBmYWxsYmFjazogYWx3YXlzIHRyeSB0aGUg4oCcbmljZeKAnSBpbmRpY2VzIGZpcnN0LlxuICBjb25zdCBzYWZlID0gW107XG4gIGZvciAoY29uc3QgaSBvZiBDVVJTT1JfU0FGRV9GQUxMQkFDS19JTkRJQ0VTKSB7XG4gICAgaWYgKGkgPD0gbWF4SWR4ICYmICFkZW55U2V0LmhhcyhpKSAmJiAoIWFsbG93U2V0IHx8IGFsbG93U2V0LmhhcyhpKSkpIHNhZmUucHVzaChpKTtcbiAgfVxuICBpZiAoc2FmZS5sZW5ndGgpIHJldHVybiBzYWZlO1xuXG4gIC8vIExhc3QgcmVzb3J0OiBhbnkgZXhpc3RpbmcgaW5kZXggbm90IGRlbmllZC5cbiAgZm9yIChsZXQgaSA9IDA7IGkgPD0gbWF4SWR4OyBpKyspIHtcbiAgICBpZiAoIWRlbnlTZXQuaGFzKGkpICYmICghYWxsb3dTZXQgfHwgYWxsb3dTZXQuaGFzKGkpKSkgc2FmZS5wdXNoKGkpO1xuICB9XG4gIHJldHVybiBzYWZlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlDdXJzb3JDb2xvckluZGV4KGluZGV4LCB7IGZvcmNlTW9kZSB9ID0ge30pIHtcbiAgY29uc3QgZyA9IGdldEdsb2JhbHMoKTtcbiAgY29uc3QgY29sb3JzID0gZy5jdXJyZW50Q29sb3JzO1xuICBjb25zdCBjYW5kaWRhdGVzID0gZ2V0Q3Vyc29yQ2FuZGlkYXRlSW5kaWNlcyhjb2xvcnMsIGcpO1xuXG4gIC8vIElmIHRoZSBkZXNpcmVkIGluZGV4IGlzIG5vdCBhIGNhbmRpZGF0ZSwgc25hcCB0byBmaXJzdCBjYW5kaWRhdGUuXG4gIGNvbnN0IGRlc2lyZWQgPSBjbGFtcEludChpbmRleCwgMCwgNyk7XG4gIGNvbnN0IGZpbmFsSWR4ID0gY2FuZGlkYXRlcy5pbmNsdWRlcyhkZXNpcmVkKSA/IGRlc2lyZWQgOiAoY2FuZGlkYXRlc1swXSA/PyBkZXNpcmVkKTtcbiAgY29uc3QgaGV4ID0gcmVzb2x2ZUN1cnNvckhleEZyb21JbmRleChjb2xvcnMsIGZpbmFsSWR4KTtcblxuICBpZiAoZm9yY2VNb2RlKSBnLmN1cnNvckNvbG9yTW9kZSA9IGZvcmNlTW9kZTtcbiAgZy5jdXJzb3JDb2xvckluZGV4ID0gZmluYWxJZHg7XG4gIGcuY3Vyc29yQ29sb3JIZXggPSBoZXg7XG4gIHN0YW1wQ3Vyc29yQ1NTVmFyKGhleCk7XG4gIHJldHVybiB7IGluZGV4OiBmaW5hbElkeCwgaGV4IH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBnZXRSb3V0ZUN1cnNvckFjY2VudEhleChyb3V0ZUlkKSB7XG4gIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKFJPVVRFX0NVUlNPUl9BQ0NFTlRfSU5ERVhFUywgcm91dGVJZCkpIHJldHVybiBudWxsO1xuICByZXR1cm4gcmVzb2x2ZUNzc0NvbG9yVG9IZXgoYHZhcigtLWJ1dHRvbi1iYXItYWNjZW50LSR7cm91dGVJZH0pYCk7XG59XG5cbmZ1bmN0aW9uIGdldEFjdGl2ZVByb2R1Y3Rpb25Sb3V0ZUlkKCkge1xuICBpZiAodHlwZW9mIGRvY3VtZW50ID09PSAndW5kZWZpbmVkJykgcmV0dXJuIG51bGw7XG4gIHRyeSB7XG4gICAgY29uc3Qgcm91dGVJZCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudD8uZGF0YXNldD8uc2hlbGxSb3V0ZTtcbiAgICBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKFJPVVRFX0NVUlNPUl9BQ0NFTlRfSU5ERVhFUywgcm91dGVJZCkpIHJldHVybiByb3V0ZUlkO1xuICAgIGlmIChyb3V0ZUlkKSByZXR1cm4gbnVsbDtcblxuICAgIGNvbnN0IGFjdGl2ZVRhYiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLXJvdXRlLXRhYl1bYXJpYS1jdXJyZW50PVwicGFnZVwiXScpO1xuICAgIGNvbnN0IGFjdGl2ZVRhYlJvdXRlID0gYWN0aXZlVGFiPy5nZXRBdHRyaWJ1dGUoJ2RhdGEtcm91dGUtdGFiJyk7XG4gICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChST1VURV9DVVJTT1JfQUNDRU5UX0lOREVYRVMsIGFjdGl2ZVRhYlJvdXRlKSkge1xuICAgICAgcmV0dXJuIGFjdGl2ZVRhYlJvdXRlO1xuICAgIH1cblxuICAgIGlmIChkb2N1bWVudC5ib2R5Py5jbGFzc0xpc3Q/LmNvbnRhaW5zKCdwb3J0Zm9saW8tcGFnZScpKSByZXR1cm4gJ3BvcnRmb2xpbyc7XG4gICAgaWYgKGRvY3VtZW50LmJvZHk/LmNsYXNzTGlzdD8uY29udGFpbnMoJ2Fib3V0LXBhZ2UnKSkgcmV0dXJuICdhYm91dCc7XG4gICAgaWYgKGRvY3VtZW50LmJvZHk/LmNsYXNzTGlzdD8uY29udGFpbnMoJ2NvbnRhY3QtcGFnZScpKSByZXR1cm4gJ2NvbnRhY3QnO1xuICAgIGlmIChcbiAgICAgIGRvY3VtZW50LmJvZHlcbiAgICAgICYmICFkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5jb250YWlucygnc3R5bGVndWlkZS1wYWdlJylcbiAgICAgICYmICFkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5jb250YWlucygnc2ltdWxhdGlvbi1kYXNoYm9hcmQtcGFnZScpXG4gICAgICAmJiAhZG9jdW1lbnQuYm9keS5jbGFzc0xpc3QuY29udGFpbnMoJ3BhbGV0dGUtbGFiLXBhZ2UnKVxuICAgICAgJiYgIWRvY3VtZW50LmJvZHkuY2xhc3NMaXN0LmNvbnRhaW5zKCdkYWlseS1mb2N1cy1wYWdlJylcbiAgICAgICYmICFkb2N1bWVudC5ib2R5LmNsYXNzTGlzdC5jb250YWlucygnY29uY2VwdC1zaW11bGF0aW9uLXBhZ2UnKVxuICAgICkge1xuICAgICAgcmV0dXJuICdob21lJztcbiAgICB9XG4gIH0gY2F0Y2ggKF8pIHtcbiAgICByZXR1cm4gbnVsbDtcbiAgfVxuICByZXR1cm4gbnVsbDtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5Um91dGVDdXJzb3JDb2xvcihyb3V0ZUlkKSB7XG4gIGlmICghT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKFJPVVRFX0NVUlNPUl9BQ0NFTlRfSU5ERVhFUywgcm91dGVJZCkpIHJldHVybiBudWxsO1xuICBjb25zdCBoZXggPSBnZXRSb3V0ZUN1cnNvckFjY2VudEhleChyb3V0ZUlkKTtcbiAgaWYgKCFoZXgpIHJldHVybiBudWxsO1xuXG4gIGNvbnN0IGcgPSBnZXRHbG9iYWxzKCk7XG4gIGcuY3Vyc29yQ29sb3JNb2RlID0gJ3JvdXRlJztcbiAgZy5jdXJzb3JDb2xvckluZGV4ID0gUk9VVEVfQ1VSU09SX0FDQ0VOVF9JTkRFWEVTW3JvdXRlSWRdO1xuICBnLmN1cnNvckNvbG9ySGV4ID0gaGV4O1xuICBnLmN1cnNvclJvdXRlSWQgPSByb3V0ZUlkO1xuICBzdGFtcEN1cnNvckNTU1ZhcihoZXgpO1xuXG4gIHRyeSB7XG4gICAgZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50LmRhdGFzZXQuY3Vyc29yUm91dGUgPSByb3V0ZUlkO1xuICAgIGRvY3VtZW50LmRvY3VtZW50RWxlbWVudC5zdHlsZS5zZXRQcm9wZXJ0eSgnLS1jdXJzb3Itcm91dGUtY29sb3InLCBoZXgpO1xuICB9IGNhdGNoIChfKSB7IC8qIG5vLW9wICovIH1cblxuICByZXR1cm4geyByb3V0ZUlkLCBpbmRleDogZy5jdXJzb3JDb2xvckluZGV4LCBoZXggfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGFwcGx5QWN0aXZlUm91dGVDdXJzb3JDb2xvcihyb3V0ZUlkID0gZ2V0QWN0aXZlUHJvZHVjdGlvblJvdXRlSWQoKSkge1xuICByZXR1cm4gYXBwbHlSb3V0ZUN1cnNvckNvbG9yKHJvdXRlSWQpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbWF5YmVBdXRvUGlja0N1cnNvckNvbG9yKHJlYXNvbiA9ICdhdXRvJykge1xuICBjb25zdCBnID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCByb3V0ZVBpY2sgPSBhcHBseUFjdGl2ZVJvdXRlQ3Vyc29yQ29sb3IoKTtcbiAgaWYgKHJvdXRlUGljaykgcmV0dXJuIHRydWU7XG5cbiAgaWYgKGcuY3Vyc29yQ29sb3JNb2RlICE9PSAnYXV0bycpIHtcbiAgICAvLyBTdGlsbCBlbnN1cmUgQ1NTIHZhciBpcyBhbGlnbmVkIHdpdGggY3VycmVudCBwYWxldHRlIHZhcmlhbnQuXG4gICAgYXBwbHlDdXJzb3JDb2xvckluZGV4KGcuY3Vyc29yQ29sb3JJbmRleCwgeyBmb3JjZU1vZGU6IGcuY3Vyc29yQ29sb3JNb2RlIH0pO1xuICAgIHJldHVybiBmYWxzZTtcbiAgfVxuXG4gIGNvbnN0IGNvbG9ycyA9IGcuY3VycmVudENvbG9ycztcbiAgY29uc3QgY2FuZGlkYXRlcyA9IGdldEN1cnNvckNhbmRpZGF0ZUluZGljZXMoY29sb3JzLCBnKTtcbiAgaWYgKCFjYW5kaWRhdGVzLmxlbmd0aCkgcmV0dXJuIGZhbHNlO1xuXG4gIGNvbnN0IGxhc3QgPSBOdW1iZXIuaXNGaW5pdGUoTnVtYmVyKGcuX2xhc3RDdXJzb3JDb2xvckluZGV4KSkgPyBOdW1iZXIoZy5fbGFzdEN1cnNvckNvbG9ySW5kZXgpIDogLTE7XG4gIGxldCBwaWNrID0gY2FuZGlkYXRlc1soTWF0aC5yYW5kb20oKSAqIGNhbmRpZGF0ZXMubGVuZ3RoKSB8IDBdO1xuICBpZiAoY2FuZGlkYXRlcy5sZW5ndGggPiAxICYmIHBpY2sgPT09IGxhc3QpIHtcbiAgICAvLyBBdm9pZCBpbW1lZGlhdGUgcmVwZWF0cyB3aGVuIHBvc3NpYmxlLlxuICAgIHBpY2sgPSBjYW5kaWRhdGVzWyhNYXRoLnJhbmRvbSgpICogY2FuZGlkYXRlcy5sZW5ndGgpIHwgMF07XG4gICAgaWYgKHBpY2sgPT09IGxhc3QpIHBpY2sgPSBjYW5kaWRhdGVzWyhjYW5kaWRhdGVzLmluZGV4T2YobGFzdCkgKyAxKSAlIGNhbmRpZGF0ZXMubGVuZ3RoXTtcbiAgfVxuICBnLl9sYXN0Q3Vyc29yQ29sb3JJbmRleCA9IHBpY2s7XG5cbiAgYXBwbHlDdXJzb3JDb2xvckluZGV4KHBpY2ssIHsgZm9yY2VNb2RlOiAnYXV0bycgfSk7XG4gIHJldHVybiB0cnVlO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q3VycmVudFBhbGV0dGUodGVtcGxhdGVOYW1lLCBpc0RhcmtPdmVycmlkZSkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCB0ZW1wbGF0ZSA9IENPTE9SX1RFTVBMQVRFU1tyZXNvbHZlQ29sb3JUZW1wbGF0ZU5hbWUodGVtcGxhdGVOYW1lKV07XG4gIGlmICghdGVtcGxhdGUpIHJldHVybiBDT0xPUl9URU1QTEFURVNbREVGQVVMVF9MT05ET05fV0VBVEhFUl9QQUxFVFRFX0lEXS5saWdodDtcblxuICBjb25zdCBpc0RhcmtNb2RlID0gdHlwZW9mIGlzRGFya092ZXJyaWRlID09PSAnYm9vbGVhbidcbiAgICA/IGlzRGFya092ZXJyaWRlXG4gICAgOiBCb29sZWFuKGdsb2JhbHMuaXNEYXJrTW9kZSk7XG4gIGNvbnN0IHJhd1BhbGV0dGUgPSBpc0RhcmtNb2RlID8gdGVtcGxhdGUuZGFyayA6IHRlbXBsYXRlLmxpZ2h0O1xuICBcbiAgLy8gRGVzYXR1cmF0ZSBncmV5cyB0byBhbGlnbiB3aXRoIGJhY2tncm91bmQgaHVlIChhbGwgcGFsZXR0ZXMpXG4gIC8vIEluIGRhcmsgbW9kZSwgYWxzbyBkYXJrZW4gdGhlIGdyZXlzIGZvciBiZXR0ZXIgY29udHJhc3RcbiAgY29uc3QgYmdDb2xvciA9IGlzRGFya01vZGUgPyAoZ2xvYmFscy5iZ0RhcmsgfHwgJyMxODE4MTgnKSA6IChnbG9iYWxzLmJnTGlnaHQgfHwgJyNlZmVmZWYnKTtcbiAgcmV0dXJuIGRlc2F0dXJhdGVHcmV5c1RvQmFja2dyb3VuZChyYXdQYWxldHRlLCBiZ0NvbG9yLCBpc0RhcmtNb2RlKTtcbn1cblxuLyoqXG4gKiBQaWNrIGEgcmFuZG9tIGNvbG9yIGFuZCByZXR1cm4gYm90aCB0aGUgY29sb3IgaGV4IGFuZCB0aGUgZGlzdHJpYnV0aW9uIGluZGV4XG4gKiBAcmV0dXJucyB7eyBjb2xvcjogc3RyaW5nLCBkaXN0cmlidXRpb25JbmRleDogbnVtYmVyIH19IENvbG9yIGFuZCBpdHMgZGlzdHJpYnV0aW9uIGluZGV4ICgwLTYpXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiBwaWNrUmFuZG9tQ29sb3JXaXRoSW5kZXgoKSB7XG4gIGNvbnN0IGdsb2JhbHMgPSBnZXRHbG9iYWxzKCk7XG4gIGNvbnN0IGNvbG9ycyA9IGdsb2JhbHMuY3VycmVudENvbG9ycztcbiAgXG4gIGlmICghY29sb3JzIHx8IGNvbG9ycy5sZW5ndGggPT09IDApIHtcbiAgICBjb25zb2xlLndhcm4oJ05vIGNvbG9ycyBhdmFpbGFibGUsIHVzaW5nIGZhbGxiYWNrJyk7XG4gICAgcmV0dXJuIHsgY29sb3I6ICcjZmZmZmZmJywgZGlzdHJpYnV0aW9uSW5kZXg6IDAgfTtcbiAgfVxuICBcbiAgLy8gUHJpbWFyeTogdXNlIHRoZSBydW50aW1lIGNvbG9yIGRpc3RyaWJ1dGlvbiAobGVnZW5kIGxhYmVscyDihpIgZGlzdGluY3QgcGFsZXR0ZSBpbmRpY2VzKS5cbiAgLy8gSG90LXBhdGggc2FmZTogTyg3KSB3b3JrLCB6ZXJvIGFsbG9jYXRpb25zLlxuICBjb25zdCBkaXN0ID0gZ2V0RGlzdHJpYnV0aW9uKGdsb2JhbHMpO1xuICBpZiAoZGlzdCAmJiBkaXN0Lmxlbmd0aCkge1xuICAgIGxldCB0b3RhbCA9IDA7XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCB3ID0gTnVtYmVyKGRpc3RbaV0/LndlaWdodCk7XG4gICAgICBpZiAoTnVtYmVyLmlzRmluaXRlKHcpICYmIHcgPiAwKSB0b3RhbCArPSB3O1xuICAgIH1cbiAgICBpZiAodG90YWwgPiAwKSB7XG4gICAgICBjb25zdCBjb3ZlcmFnZUluZGV4ID0gZ2V0Q292ZXJhZ2VEaXN0cmlidXRpb25JbmRleChkaXN0KTtcbiAgICAgIGlmIChjb3ZlcmFnZUluZGV4ICE9IG51bGwpIHtcbiAgICAgICAgY29uc3Qgcm93ID0gZGlzdFtjb3ZlcmFnZUluZGV4XTtcbiAgICAgICAgY29uc3QgaWR4ID0gY2xhbXBJbnRGYWxsYmFjayhyb3c/LmNvbG9ySW5kZXgsIDAsIDcsIDApO1xuICAgICAgICByZXR1cm4geyBjb2xvcjogY29sb3JzW2lkeF0gfHwgY29sb3JzWzBdIHx8ICcjZmZmZmZmJywgZGlzdHJpYnV0aW9uSW5kZXg6IGNvdmVyYWdlSW5kZXggfTtcbiAgICAgIH1cbiAgICAgIGxldCByID0gTWF0aC5yYW5kb20oKSAqIHRvdGFsO1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkaXN0Lmxlbmd0aDsgaSsrKSB7XG4gICAgICAgIGNvbnN0IHJvdyA9IGRpc3RbaV07XG4gICAgICAgIGNvbnN0IHcgPSBOdW1iZXIocm93Py53ZWlnaHQpO1xuICAgICAgICBpZiAoIU51bWJlci5pc0Zpbml0ZSh3KSB8fCB3IDw9IDApIGNvbnRpbnVlO1xuICAgICAgICByIC09IHc7XG4gICAgICAgIGlmIChyIDw9IDApIHtcbiAgICAgICAgICBjb25zdCBpZHggPSBjbGFtcEludEZhbGxiYWNrKHJvdz8uY29sb3JJbmRleCwgMCwgNywgMCk7XG4gICAgICAgICAgcmV0dXJuIHsgY29sb3I6IGNvbG9yc1tpZHhdIHx8IGNvbG9yc1swXSB8fCAnI2ZmZmZmZicsIGRpc3RyaWJ1dGlvbkluZGV4OiBpIH07XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIC8vIE51bWVyaWMgZWRnZSBjYXNlOiBmYWxsIHRocm91Z2ggdG8gYSBkZXRlcm1pbmlzdGljIHJvdy5cbiAgICAgIGNvbnN0IGxhc3QgPSBkaXN0W2Rpc3QubGVuZ3RoIC0gMV07XG4gICAgICBjb25zdCBpZHggPSBjbGFtcEludEZhbGxiYWNrKGxhc3Q/LmNvbG9ySW5kZXgsIDAsIDcsIDApO1xuICAgICAgcmV0dXJuIHsgY29sb3I6IGNvbG9yc1tpZHhdIHx8IGNvbG9yc1swXSB8fCAnI2ZmZmZmZicsIGRpc3RyaWJ1dGlvbkluZGV4OiBkaXN0Lmxlbmd0aCAtIDEgfTtcbiAgICB9XG4gIH1cblxuICAvLyBGYWxsYmFjazogbGVnYWN5IHdlaWdodHMgb3ZlciB0aGUgZmlyc3QgOCBwYWxldHRlIGVudHJpZXMuXG4gIGNvbnN0IHJhbmRvbSA9IE1hdGgucmFuZG9tKCk7XG4gIGxldCBjdW11bGF0aXZlV2VpZ2h0ID0gMDtcbiAgY29uc3QgbWF4SWR4ID0gTWF0aC5taW4oY29sb3JzLmxlbmd0aCwgTEVHQUNZX0NPTE9SX1dFSUdIVFMubGVuZ3RoLCA4KTtcbiAgZm9yIChsZXQgaSA9IDA7IGkgPCBtYXhJZHg7IGkrKykge1xuICAgIGN1bXVsYXRpdmVXZWlnaHQgKz0gTEVHQUNZX0NPTE9SX1dFSUdIVFNbaV07XG4gICAgaWYgKHJhbmRvbSA8PSBjdW11bGF0aXZlV2VpZ2h0KSByZXR1cm4geyBjb2xvcjogY29sb3JzW2ldLCBkaXN0cmlidXRpb25JbmRleDogaSB9O1xuICB9XG4gIHJldHVybiB7IGNvbG9yOiBjb2xvcnNbTWF0aC5taW4oY29sb3JzLmxlbmd0aCAtIDEsIDcpXSB8fCAnI2ZmZmZmZicsIGRpc3RyaWJ1dGlvbkluZGV4OiAwIH07XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwaWNrUmFuZG9tQ29sb3IoKSB7XG4gIHJldHVybiBwaWNrUmFuZG9tQ29sb3JXaXRoSW5kZXgoKS5jb2xvcjtcbn1cblxuLyoqXG4gKiBHZXQgYSBzcGVjaWZpYyBjb2xvciBieSBpbmRleCAoMC03KVxuICogRW5zdXJlcyBhbGwgOCBjb2xvcnMgYXJlIGFjY2Vzc2libGUgZm9yIGd1YXJhbnRlZWQgcmVwcmVzZW50YXRpb25cbiAqL1xuZXhwb3J0IGZ1bmN0aW9uIGdldENvbG9yQnlJbmRleChpbmRleCkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCBjb2xvcnMgPSBnbG9iYWxzLmN1cnJlbnRDb2xvcnM7XG4gIFxuICBpZiAoIWNvbG9ycyB8fCBjb2xvcnMubGVuZ3RoID09PSAwKSB7XG4gICAgY29uc29sZS53YXJuKCdObyBjb2xvcnMgYXZhaWxhYmxlLCB1c2luZyBmYWxsYmFjaycpO1xuICAgIHJldHVybiAnI2ZmZmZmZic7XG4gIH1cbiAgXG4gIGNvbnN0IGNsYW1wZWRJbmRleCA9IE1hdGgubWF4KDAsIE1hdGgubWluKDcsIE1hdGguZmxvb3IoaW5kZXgpKSk7XG4gIHJldHVybiBjb2xvcnNbY2xhbXBlZEluZGV4XSB8fCAnI2ZmZmZmZic7XG59XG5cbmZ1bmN0aW9uIGlzUHJvamVjdE5ldXRyYWxDb2xvcihoZXgpIHtcbiAgY29uc3Qgc2F0dXJhdGlvbiA9IGhzdlNhdHVyYXRpb24oaGV4KTtcbiAgY29uc3QgbHVtaW5hbmNlID0gcmVsYXRpdmVMdW1pbmFuY2UoaGV4KTtcbiAgcmV0dXJuIHNhdHVyYXRpb24gPCAwLjE2IHx8IGx1bWluYW5jZSA8IDAuMDQ1IHx8IGx1bWluYW5jZSA+IDAuOTQ7XG59XG5cbmZ1bmN0aW9uIG5vcm1hbGl6ZUhleEtleShoZXgpIHtcbiAgY29uc3QgcmdiID0gaGV4VG9SZ2IyNTUoaGV4KTtcbiAgaWYgKCFyZ2IpIHJldHVybiBTdHJpbmcoaGV4IHx8ICcnKS50cmltKCkudG9Mb3dlckNhc2UoKTtcbiAgcmV0dXJuIHJnYjI1NVRvSGV4KHJnYikudG9Mb3dlckNhc2UoKTtcbn1cblxuLyoqIERpc3RpbmN0IGdyZXlzIHdoZW4gdGhlIGxpdmUgcGFsZXR0ZSBydW5zIG91dCBvZiB1bmlxdWUgbmV1dHJhbHMgKHBvcnRmb2xpbyBwaXQgb25seSkuICovXG5jb25zdCBQT1JURk9MSU9fR1JFWV9GQUxMQkFDS1MgPSBbXG4gICcjNmI3NjcwJyxcbiAgJyM4YTkzOTAnLFxuICAnIzRhNTU1MCcsXG4gICcjYTNhYmE3JyxcbiAgJyMzZDQ3NDMnLFxuICAnI2I4YzBiYydcbl07XG5cbi8qKlxuICogT25lIHVuaXF1ZSBmaWxsIHBlciBwb3J0Zm9saW8gcHJvamVjdDogY2hyb21hdGljIHBhbGV0dGUgc2xvdHMgZmlyc3QsIHRoZW4gbmV1dHJhbHMvZ3JleXNcbiAqIGZyb20gdGhlIHNhbWUgcGFsZXR0ZSAoZGVkdXBlZCksIHRoZW4gc3RlcHBlZCBncmV5cy4gQXZvaWRzIHJlcGVhdGluZyB0aGUgc2FtZSBhY2NlbnQgaHVlLlxuICovXG5leHBvcnQgZnVuY3Rpb24gZ2V0UG9ydGZvbGlvUHJvamVjdFBhbGV0dGVDb2xvcihpbmRleCwgcHJvamVjdENvdW50KSB7XG4gIGNvbnN0IG4gPSBNYXRoLm1heCgxLCBNYXRoLmZsb29yKE51bWJlcihwcm9qZWN0Q291bnQpKSB8fCAxKTtcbiAgY29uc3Qgc2VxID0gYnVpbGRQb3J0Zm9saW9Qcm9qZWN0Q29sb3JTZXF1ZW5jZShuKTtcbiAgY29uc3QgaSA9IE1hdGguYWJzKE1hdGguZmxvb3IoaW5kZXgpKTtcbiAgcmV0dXJuIHNlcVtpICUgc2VxLmxlbmd0aF0gfHwgc2VxWzBdO1xufVxuXG5mdW5jdGlvbiBidWlsZFBvcnRmb2xpb1Byb2plY3RDb2xvclNlcXVlbmNlKHByb2plY3RDb3VudCkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCBjb2xvcnMgPSBBcnJheS5pc0FycmF5KGdsb2JhbHMuY3VycmVudENvbG9ycykgPyBnbG9iYWxzLmN1cnJlbnRDb2xvcnMuZmlsdGVyKEJvb2xlYW4pIDogW107XG5cbiAgaWYgKCFjb2xvcnMubGVuZ3RoKSB7XG4gICAgY29uc3Qgb3V0ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwcm9qZWN0Q291bnQ7IGkgKz0gMSkge1xuICAgICAgb3V0LnB1c2goZ2V0R2VuZXJhdGVkUG9ydGZvbGlvRmFsbGJhY2tDb2xvcihpKSk7XG4gICAgfVxuICAgIHJldHVybiBvdXQ7XG4gIH1cblxuICBjb25zdCBvdXQgPSBbXTtcbiAgY29uc3Qgc2VlbiA9IG5ldyBTZXQoKTtcbiAgY29uc3QgZGlzdCA9IGdldERpc3RyaWJ1dGlvbihnbG9iYWxzKTtcbiAgaWYgKGRpc3QgJiYgZGlzdC5sZW5ndGgpIHtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRpc3QubGVuZ3RoOyBpICs9IDEpIHtcbiAgICAgIGNvbnN0IHBhbGV0dGVJbmRleCA9IGNsYW1wSW50RmFsbGJhY2soZGlzdFtpXT8uY29sb3JJbmRleCwgMCwgY29sb3JzLmxlbmd0aCAtIDEsIDApO1xuICAgICAgYWRkVW5pcXVlUG9ydGZvbGlvUHJvamVjdENvbG9yKG91dCwgc2VlbiwgY29sb3JzW3BhbGV0dGVJbmRleF0pO1xuICAgICAgaWYgKG91dC5sZW5ndGggPj0gcHJvamVjdENvdW50KSByZXR1cm4gb3V0O1xuICAgIH1cbiAgfVxuXG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29sb3JzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgYWRkVW5pcXVlUG9ydGZvbGlvUHJvamVjdENvbG9yKG91dCwgc2VlbiwgY29sb3JzW2ldKTtcbiAgICBpZiAob3V0Lmxlbmd0aCA+PSBwcm9qZWN0Q291bnQpIHJldHVybiBvdXQ7XG4gIH1cblxuICBmb3IgKGxldCBpID0gMDsgaSA8IFBPUlRGT0xJT19HUkVZX0ZBTExCQUNLUy5sZW5ndGg7IGkgKz0gMSkge1xuICAgIGFkZFVuaXF1ZVBvcnRmb2xpb1Byb2plY3RDb2xvcihvdXQsIHNlZW4sIFBPUlRGT0xJT19HUkVZX0ZBTExCQUNLU1tpXSk7XG4gICAgaWYgKG91dC5sZW5ndGggPj0gcHJvamVjdENvdW50KSByZXR1cm4gb3V0O1xuICB9XG5cbiAgbGV0IGZhbGxiYWNrSW5kZXggPSAwO1xuICB3aGlsZSAob3V0Lmxlbmd0aCA8IHByb2plY3RDb3VudCkge1xuICAgIGFkZFVuaXF1ZVBvcnRmb2xpb1Byb2plY3RDb2xvcihvdXQsIHNlZW4sIGdldEdlbmVyYXRlZFBvcnRmb2xpb0ZhbGxiYWNrQ29sb3IoZmFsbGJhY2tJbmRleCkpO1xuICAgIGZhbGxiYWNrSW5kZXggKz0gMTtcbiAgfVxuICByZXR1cm4gb3V0O1xufVxuXG5mdW5jdGlvbiBhZGRVbmlxdWVQb3J0Zm9saW9Qcm9qZWN0Q29sb3Iob3V0LCBzZWVuLCBjb2xvcikge1xuICBpZiAoIWNvbG9yKSByZXR1cm4gZmFsc2U7XG4gIGNvbnN0IGtleSA9IG5vcm1hbGl6ZUhleEtleShjb2xvcik7XG4gIGlmIChzZWVuLmhhcyhrZXkpKSByZXR1cm4gZmFsc2U7XG4gIHNlZW4uYWRkKGtleSk7XG4gIG91dC5wdXNoKGNvbG9yKTtcbiAgcmV0dXJuIHRydWU7XG59XG5cbmZ1bmN0aW9uIGdldEdlbmVyYXRlZFBvcnRmb2xpb0ZhbGxiYWNrQ29sb3IoaW5kZXgpIHtcbiAgY29uc3QgaHVlID0gKChNYXRoLmFicyhNYXRoLmZsb29yKGluZGV4KSkgKiAxMzcuNTA4KSArIDI0KSAlIDM2MDtcbiAgY29uc3QgcmdiID0gaHN2VG9SZ2IwMSh7IGg6IGh1ZSwgczogMC41OCwgdjogMC43IH0pO1xuICByZXR1cm4gcmdiMjU1VG9IZXgoe1xuICAgIHI6IE1hdGgucm91bmQocmdiLnIgKiAyNTUpLFxuICAgIGc6IE1hdGgucm91bmQocmdiLmcgKiAyNTUpLFxuICAgIGI6IE1hdGgucm91bmQocmdiLmIgKiAyNTUpLFxuICB9KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGdldFByb2plY3RQYWxldHRlQ29sb3IoaW5kZXgpIHtcbiAgY29uc3QgZ2xvYmFscyA9IGdldEdsb2JhbHMoKTtcbiAgY29uc3QgY29sb3JzID0gQXJyYXkuaXNBcnJheShnbG9iYWxzLmN1cnJlbnRDb2xvcnMpID8gZ2xvYmFscy5jdXJyZW50Q29sb3JzLmZpbHRlcihCb29sZWFuKSA6IFtdO1xuICBpZiAoIWNvbG9ycy5sZW5ndGgpIHJldHVybiAnIzFiN2Y2ZSc7XG5cbiAgY29uc3QgY2hyb21hdGljID0gW107XG4gIGNvbnN0IG5ldXRyYWxzID0gW107XG4gIGZvciAobGV0IGkgPSAwOyBpIDwgY29sb3JzLmxlbmd0aDsgaSArPSAxKSB7XG4gICAgY29uc3QgY29sb3IgPSBjb2xvcnNbaV07XG4gICAgaWYgKGlzUHJvamVjdE5ldXRyYWxDb2xvcihjb2xvcikpIG5ldXRyYWxzLnB1c2goY29sb3IpO1xuICAgIGVsc2UgY2hyb21hdGljLnB1c2goY29sb3IpO1xuICB9XG5cbiAgaWYgKGNocm9tYXRpYy5sZW5ndGgpIHtcbiAgICByZXR1cm4gY2hyb21hdGljW01hdGguYWJzKE1hdGguZmxvb3IoaW5kZXgpKSAlIGNocm9tYXRpYy5sZW5ndGhdIHx8IGNocm9tYXRpY1swXTtcbiAgfVxuXG4gIGNvbnN0IGxpbWl0ZWROZXV0cmFscyA9IG5ldXRyYWxzLnNsaWNlKDAsIDIpO1xuICBpZiAobGltaXRlZE5ldXRyYWxzLmxlbmd0aCkge1xuICAgIHJldHVybiBsaW1pdGVkTmV1dHJhbHNbTWF0aC5hYnMoTWF0aC5mbG9vcihpbmRleCkpICUgbGltaXRlZE5ldXRyYWxzLmxlbmd0aF0gfHwgbGltaXRlZE5ldXRyYWxzWzBdO1xuICB9XG5cbiAgcmV0dXJuIGNvbG9yc1tNYXRoLmFicyhNYXRoLmZsb29yKGluZGV4KSkgJSBjb2xvcnMubGVuZ3RoXSB8fCBjb2xvcnNbMF07XG59XG5cbmZ1bmN0aW9uIGFwcGx5UGFsZXR0ZVRoZW1lKHRlbXBsYXRlTmFtZSkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCByb290ID0gZG9jdW1lbnQuZG9jdW1lbnRFbGVtZW50O1xuICBjb25zdCBpc0RhcmsgPSBCb29sZWFuKGdsb2JhbHMuaXNEYXJrTW9kZSk7XG4gIGNvbnN0IGFjY2VudHMgPSBnZXRMb25kb25XZWF0aGVyUGFsZXR0ZUFjY2VudHModGVtcGxhdGVOYW1lKTtcbiAgaWYgKCFhY2NlbnRzIHx8ICFyb290KSByZXR1cm47XG5cbiAgZ2xvYmFscy5mcmFtZUNvbG9yID0gaXNEYXJrID8gZ2xvYmFscy5mcmFtZUNvbG9yRGFyayA6IGdsb2JhbHMuZnJhbWVDb2xvckxpZ2h0O1xuICBnbG9iYWxzLmxpbmtIb3ZlckNvbG9yID0gYWNjZW50cy5saW5rSG92ZXJDb2xvciB8fCBnbG9iYWxzLmxpbmtIb3ZlckNvbG9yO1xuXG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0tbGluay1ob3Zlci1jb2xvcicsIGdsb2JhbHMubGlua0hvdmVyQ29sb3IpO1xuICByb290LnN0eWxlLnNldFByb3BlcnR5KCctLWNvbG9yLWFjY2VudCcsIGFjY2VudHMuY29sb3JBY2NlbnQgfHwgZ2xvYmFscy5saW5rSG92ZXJDb2xvcik7XG4gIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoJy0taGVyby1yb2xlLWFjY2VudCcsIGFjY2VudHMuaGVyb1JvbGVBY2NlbnQgfHwgZ2xvYmFscy5saW5rSG92ZXJDb2xvcik7XG5cbiAgY29uc3QgcGFuZWxGZyA9IGlzRGFyayA/IGdsb2JhbHMudGV4dENvbG9yRGFyayA6IGdsb2JhbHMudGV4dENvbG9yTGlnaHQ7XG4gIGNvbnN0IHBhbmVsQnJhbmQgPSBhY2NlbnRzLnBhbmVsQnJhbmQgfHwgYWNjZW50cy5jb2xvckFjY2VudCB8fCBnbG9iYWxzLmxpbmtIb3ZlckNvbG9yO1xuICBjb25zdCBwYW5lbEFjY2VudCA9IGdsb2JhbHMubGlua0hvdmVyQ29sb3I7XG4gIGNvbnN0IHBhbmVsQWN0aW9uRmcgPSBjb21wdXRlU2FmZVRleHRPbkN1cnNvckNvbG9yKHBhbmVsQnJhbmQpIHx8IHBhbmVsRmc7XG5cbiAgY29uc3QgcGFuZWxWYXJzID0ge1xuICAgICctLXBhbmVsLWFjY2VudCc6IGhleFRvUmdiYVN0cmluZyhwYW5lbEFjY2VudCwgaXNEYXJrID8gMC4yIDogMC4xNCksXG4gICAgJy0tcGFuZWwtYWNjZW50LWZvcmVncm91bmQnOiBwYW5lbEZnLFxuICAgICctLXBhbmVsLXJpbmcnOiBwYW5lbEFjY2VudCxcbiAgICAnLS1wYW5lbC1wcmltYXJ5JzogcGFuZWxBY2NlbnQsXG4gICAgJy0tcGFuZWwtcHJpbWFyeS1mb3JlZ3JvdW5kJzogY29tcHV0ZVNhZmVUZXh0T25DdXJzb3JDb2xvcihwYW5lbEFjY2VudCkgfHwgcGFuZWxGZyxcbiAgICAnLS1wYW5lbC1icmFuZCc6IHBhbmVsQnJhbmQsXG4gICAgJy0tcGFuZWwtYnJhbmQtZm9yZWdyb3VuZCc6IHBhbmVsQWN0aW9uRmcsXG4gIH07XG5cbiAgT2JqZWN0LmVudHJpZXMocGFuZWxWYXJzKS5mb3JFYWNoKChbbmFtZSwgdmFsdWVdKSA9PiB7XG4gICAgcm9vdC5zdHlsZS5zZXRQcm9wZXJ0eShuYW1lLCB2YWx1ZSk7XG4gICAgaWYgKGRvY3VtZW50LmJvZHkpIGRvY3VtZW50LmJvZHkuc3R5bGUuc2V0UHJvcGVydHkobmFtZSwgdmFsdWUpO1xuICB9KTtcblxufVxuXG5leHBvcnQgZnVuY3Rpb24gYXBwbHlDb2xvclRlbXBsYXRlKHRlbXBsYXRlTmFtZSkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCByZXNvbHZlZFRlbXBsYXRlTmFtZSA9IHJlc29sdmVDb2xvclRlbXBsYXRlTmFtZSh0ZW1wbGF0ZU5hbWUpO1xuICBnbG9iYWxzLmN1cnJlbnRUZW1wbGF0ZSA9IHJlc29sdmVkVGVtcGxhdGVOYW1lO1xuICBhcHBseVBhbGV0dGVUaGVtZShyZXNvbHZlZFRlbXBsYXRlTmFtZSk7XG4gIGdsb2JhbHMuY3VycmVudENvbG9ycyA9IGdldEN1cnJlbnRQYWxldHRlKHJlc29sdmVkVGVtcGxhdGVOYW1lKTtcblxuICAvLyBQZXJzaXN0IGZvciBjaGFwdGVyIHJvdGF0aW9uIGFuZCBrZWVwIGFueSBVSSBzZWxlY3RzIGluIHN5bmMuXG4gIHRyeSB7XG4gICAgbG9jYWxTdG9yYWdlLnNldEl0ZW0oUEFMRVRURV9ST1RBVElPTl9TVE9SQUdFX0tFWSwgU3RyaW5nKHJlc29sdmVkVGVtcGxhdGVOYW1lIHx8ICcnKSk7XG4gIH0gY2F0Y2ggKF8pIHsgLyogbm8tb3AgKi8gfVxuICB0cnkge1xuICAgIGZvckVhY2hQYW5lbFVpRG9jdW1lbnQoKHVpRG9jdW1lbnQpID0+IHtcbiAgICAgIGNvbnN0IHNlbGVjdCA9IHVpRG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2NvbG9yU2VsZWN0Jyk7XG4gICAgICBpZiAoc2VsZWN0KSBzZWxlY3QudmFsdWUgPSByZXNvbHZlZFRlbXBsYXRlTmFtZTtcbiAgICB9KTtcbiAgfSBjYXRjaCAoXykgeyAvKiBuby1vcCAqLyB9XG4gIFxuICAvLyBDdXJzb3IgY29sb3IgbXVzdCByZW1haW4gdmFsaWQgYWNyb3NzIHRlbXBsYXRlICsgdGhlbWUgY2hhbmdlcy5cbiAgLy8gUm91dGUgY29sb3VyIHdpbnMgb24gcHJvZHVjdGlvbiByb3V0ZXM7IG5vbi1wcm9kdWN0aW9uIHN1cmZhY2VzIGtlZXAgdGhlIGxlZ2FjeSBjdXJzb3IgbW9kZS5cbiAgaWYgKGdsb2JhbHMuY3Vyc29yQ29sb3JNb2RlICE9PSAnYXV0bycgJiYgZ2xvYmFscy5jdXJzb3JDb2xvck1vZGUgIT09ICdtYW51YWwnKSB7XG4gICAgZ2xvYmFscy5jdXJzb3JDb2xvck1vZGUgPSAnYXV0byc7XG4gIH1cbiAgXG4gIC8vIFVwZGF0ZSBleGlzdGluZyBiYWxsIGNvbG9yc1xuICB1cGRhdGVFeGlzdGluZ0JhbGxDb2xvcnMoKTtcbiAgXG4gIC8vIFN5bmMgQ1NTIHZhcmlhYmxlc1xuICBzeW5jUGFsZXR0ZVZhcnMoZ2xvYmFscy5jdXJyZW50Q29sb3JzKTtcblxuICBjb25zdCByb3V0ZVBpY2sgPSBhcHBseUFjdGl2ZVJvdXRlQ3Vyc29yQ29sb3IoKTtcbiAgaWYgKCFyb3V0ZVBpY2spIHtcbiAgICBhcHBseUN1cnNvckNvbG9ySW5kZXgoZ2xvYmFscy5jdXJzb3JDb2xvckluZGV4LCB7IGZvcmNlTW9kZTogZ2xvYmFscy5jdXJzb3JDb2xvck1vZGUgfSk7XG4gIH1cbiAgXG4gIC8vIFVwZGF0ZSBVSSBjb2xvciBwaWNrZXJzXG4gIHVwZGF0ZUNvbG9yUGlja2Vyc1VJKCk7XG4gIFxuICAvLyBOb3RpZnkgb3B0aW9uYWwgVUkgY29uc3VtZXJzIChlLmcuLCBkZXYgY29udHJvbCBwYW5lbCBzd2F0Y2hlcykuXG4gIC8vIEV2ZW50LWRyaXZlbjsgbm90IHVzZWQgaW4gaG90IHBhdGhzLlxuICB0cnkge1xuICAgIHdpbmRvdy5kaXNwYXRjaEV2ZW50KG5ldyBDdXN0b21FdmVudCgnYmI6cGFsZXR0ZUNoYW5nZWQnLCB7IGRldGFpbDogeyB0ZW1wbGF0ZTogcmVzb2x2ZWRUZW1wbGF0ZU5hbWUgfSB9KSk7XG4gIH0gY2F0Y2ggKF8pIHsgLyogbm8tb3AgKi8gfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVFeGlzdGluZ0JhbGxDb2xvcnMoKSB7XG4gIGNvbnN0IGdsb2JhbHMgPSBnZXRHbG9iYWxzKCk7XG4gIGNvbnN0IGJhbGxzID0gZ2xvYmFscy5iYWxscztcblxuICBmb3IgKGxldCBpID0gMDsgaSA8IGJhbGxzLmxlbmd0aDsgaSsrKSB7XG4gICAgaWYgKGJhbGxzW2ldPy5fcHJlc2VydmVDb2xvcikgY29udGludWU7XG4gICAgYmFsbHNbaV0uY29sb3IgPSBwaWNrUmFuZG9tQ29sb3IoKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBzeW5jUGFsZXR0ZVZhcnMoY29sb3JzKSB7XG4gIHRyeSB7XG4gICAgY29uc3Qgcm9vdCA9IGRvY3VtZW50LmRvY3VtZW50RWxlbWVudDtcbiAgICBjb25zdCBsaXN0ID0gKGNvbG9ycyAmJiBjb2xvcnMubGVuZ3RoID8gY29sb3JzIDogW10pLnNsaWNlKDAsIDgpO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgODsgaSsrKSB7XG4gICAgICBjb25zdCBoZXggPSBsaXN0W2ldIHx8ICcjZmZmZmZmJztcbiAgICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoYC0tYmFsbC0ke2krMX1gLCBoZXgpO1xuICAgIH1cblxuICAgIGNvbnN0IHJvdXRlQWNjZW50SW5kZXhlcyA9IHtcbiAgICAgIGhvbWU6IDMsXG4gICAgICBwb3J0Zm9saW86IDUsXG4gICAgICBhYm91dDogNixcbiAgICAgIGNvbnRhY3Q6IDcsXG4gICAgICBzb3VuZDogMyxcbiAgICB9O1xuICAgIE9iamVjdC5lbnRyaWVzKHJvdXRlQWNjZW50SW5kZXhlcykuZm9yRWFjaCgoW3JvdXRlSWQsIGNvbG9ySW5kZXhdKSA9PiB7XG4gICAgICBjb25zdCBoZXggPSBsaXN0W2NvbG9ySW5kZXhdIHx8ICcjZmZmZmZmJztcbiAgICAgIHJvb3Quc3R5bGUuc2V0UHJvcGVydHkoYC0tYnV0dG9uLWJhci1hY2NlbnQtJHtyb3V0ZUlkfWAsIGhleCk7XG4gICAgICByb290LnN0eWxlLnNldFByb3BlcnR5KGAtLWJ1dHRvbi1iYXItYWNjZW50LSR7cm91dGVJZH0taW5rYCwgY29tcHV0ZVNhZmVUZXh0T25DdXJzb3JDb2xvcihoZXgpIHx8ICcjZmZmZmZmJyk7XG4gICAgfSk7XG4gIH0gY2F0Y2ggKF8pIHsgLyogbm8tb3AgKi8gfVxufVxuXG5mdW5jdGlvbiB1cGRhdGVDb2xvclBpY2tlcnNVSSgpIHtcbiAgY29uc3QgZ2xvYmFscyA9IGdldEdsb2JhbHMoKTtcbiAgY29uc3QgY29sb3JzID0gZ2xvYmFscy5jdXJyZW50Q29sb3JzO1xuXG4gIGZvckVhY2hQYW5lbFVpRG9jdW1lbnQoKHVpRG9jdW1lbnQpID0+IHtcbiAgICBmb3IgKGxldCBpID0gMTsgaSA8PSA4OyBpKyspIHtcbiAgICAgIGNvbnN0IHBpY2tlciA9IHVpRG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGNvbG9yJHtpfWApO1xuICAgICAgY29uc3QgZGlzcGxheSA9IHVpRG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoYGNvbG9yJHtpfVZhbGApO1xuICAgICAgaWYgKHBpY2tlciAmJiBjb2xvcnNbaSAtIDFdKSB7XG4gICAgICAgIHBpY2tlci52YWx1ZSA9IGNvbG9yc1tpIC0gMV07XG4gICAgICAgIGlmIChkaXNwbGF5KSBkaXNwbGF5LnRleHRDb250ZW50ID0gY29sb3JzW2kgLSAxXS50b1VwcGVyQ2FzZSgpO1xuICAgICAgfVxuICAgIH1cbiAgfSk7XG59XG5cbmV4cG9ydCBmdW5jdGlvbiBwb3B1bGF0ZUNvbG9yU2VsZWN0KCkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBmb3JFYWNoUGFuZWxVaURvY3VtZW50KCh1aURvY3VtZW50KSA9PiB7XG4gICAgY29uc3Qgc2VsZWN0ID0gdWlEb2N1bWVudC5nZXRFbGVtZW50QnlJZCgnY29sb3JTZWxlY3QnKTtcbiAgICBpZiAoIXNlbGVjdCkgcmV0dXJuO1xuXG4gICAgc2VsZWN0LmlubmVySFRNTCA9ICcnO1xuICAgIGZvciAoY29uc3Qga2V5IG9mIFBBTEVUVEVfQ0hBUFRFUl9PUkRFUikge1xuICAgICAgY29uc3QgdGVtcGxhdGUgPSBDT0xPUl9URU1QTEFURVNba2V5XTtcbiAgICAgIGlmICghdGVtcGxhdGUpIGNvbnRpbnVlO1xuICAgICAgY29uc3Qgb3B0aW9uID0gdWlEb2N1bWVudC5jcmVhdGVFbGVtZW50KCdvcHRpb24nKTtcbiAgICAgIG9wdGlvbi52YWx1ZSA9IGtleTtcbiAgICAgIG9wdGlvbi50ZXh0Q29udGVudCA9IHRlbXBsYXRlLmxhYmVsO1xuICAgICAgc2VsZWN0LmFwcGVuZENoaWxkKG9wdGlvbik7XG4gICAgfVxuXG4gICAgc2VsZWN0LnZhbHVlID0gcmVzb2x2ZUNvbG9yVGVtcGxhdGVOYW1lKGdsb2JhbHMuY3VycmVudFRlbXBsYXRlKTtcbiAgfSk7XG59XG5cbi8qKlxuICogUm90YXRlIHRvIHRoZSBuZXh0IHBhbGV0dGUgY2hhcHRlci5cbiAqIC0gSW50ZW5kZWQgdG8gYmUgY2FsbGVkIG9uY2Ugb24gZWFjaCBwYWdlIGxvYWQgKGJlZm9yZSBpbml0aWFsaXplRGFya01vZGUoKSkuXG4gKiAtIEFwcGxpZXMgb25seSB0byBjdXJzb3IgKyBiYWxscyAodmlhIGFwcGx5Q29sb3JUZW1wbGF0ZSBpbiBkYXJrLW1vZGUgaW5pdCkuXG4gKi9cbmV4cG9ydCBmdW5jdGlvbiByb3RhdGVQYWxldHRlQ2hhcHRlck9uUmVsb2FkKCkge1xuICBjb25zdCBnbG9iYWxzID0gZ2V0R2xvYmFscygpO1xuICBjb25zdCBvcmRlciA9IEFycmF5LmlzQXJyYXkoUEFMRVRURV9DSEFQVEVSX09SREVSKSAmJiBQQUxFVFRFX0NIQVBURVJfT1JERVIubGVuZ3RoXG4gICAgPyBQQUxFVFRFX0NIQVBURVJfT1JERVJcbiAgICA6IE9iamVjdC5rZXlzKENPTE9SX1RFTVBMQVRFUyk7XG4gIGlmICghb3JkZXIubGVuZ3RoKSByZXR1cm4gbnVsbDtcblxuICBsZXQgbGFzdEtleSA9IG51bGw7XG4gIHRyeSB7IGxhc3RLZXkgPSBsb2NhbFN0b3JhZ2UuZ2V0SXRlbShQQUxFVFRFX1JPVEFUSU9OX1NUT1JBR0VfS0VZKTsgfSBjYXRjaCAoXykge31cblxuICBjb25zdCBsYXN0SW5kZXggPSB0eXBlb2YgbGFzdEtleSA9PT0gJ3N0cmluZycgPyBvcmRlci5pbmRleE9mKGxhc3RLZXkpIDogLTE7XG4gIC8vIEZpcnN0IHZpc2l0IChvciBpbnZhbGlkIHN0b3JlZCBrZXkpOiBzdGFydCBvbiBhIHJhbmRvbSBjaGFwdGVyIGZvciBzdXJwcmlzZSxcbiAgLy8gdGhlbiBjb250aW51ZSByb3RhdGluZyBpbiBzdG9yeSBvcmRlciBvbiBzdWJzZXF1ZW50IHJlbG9hZHMuXG4gIGNvbnN0IG5leHRJbmRleCA9IGxhc3RJbmRleCA+PSAwXG4gICAgPyAobGFzdEluZGV4ICsgMSkgJSBvcmRlci5sZW5ndGhcbiAgICA6ICgoTWF0aC5yYW5kb20oKSAqIG9yZGVyLmxlbmd0aCkgfCAwKTtcbiAgY29uc3QgbmV4dEtleSA9IG9yZGVyW25leHRJbmRleF07XG5cbiAgZ2xvYmFscy5jdXJyZW50VGVtcGxhdGUgPSBuZXh0S2V5O1xuICB0cnkgeyBsb2NhbFN0b3JhZ2Uuc2V0SXRlbShQQUxFVFRFX1JPVEFUSU9OX1NUT1JBR0VfS0VZLCBuZXh0S2V5KTsgfSBjYXRjaCAoXykge31cbiAgcmV0dXJuIG5leHRLZXk7XG59XG4iXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUM7QUFDOUQsTUFBTSxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsRUFBRSxDQUFDO0FBQ25GLE1BQU0sQ0FBQztBQUNQLENBQUMsQ0FBQyxpQ0FBaUM7QUFDbkMsQ0FBQyxDQUFDLHVCQUF1QjtBQUN6QixDQUFDLENBQUMsOEJBQThCO0FBQ2hDLENBQUMsQ0FBQyw2QkFBNkI7QUFDL0IsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxjQUFjLENBQUMsRUFBRSxDQUFDO0FBQ3ZDLE1BQU0sQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxnQkFBZ0IsQ0FBQyxFQUFFLENBQUM7O0FBRXhFLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDckIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ25DLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNsQzs7QUFFQSxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzFCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDckIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQ3RELENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1AsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDOUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQ3RDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUM5RDs7QUFFQSxRQUFRLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDbEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUMxQixDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQzFCLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDMUIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtBQUN2QyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUM7O0FBRUEsUUFBUSxDQUFDLGVBQWUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQzNFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVELENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDdkQ7O0FBRUEsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDOztBQUV2QixDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDbEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ2xDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUc7O0FBRXJCLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1gsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDYixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO0FBQ1gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ3ZCLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ2YsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEI7O0FBRUEsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDNUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7O0FBRXZCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUU7QUFDbkIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNuRCxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVsQixDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQy9DLENBQUMsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRWpDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVDOztBQUVBLFFBQVEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDcEM7O0FBRUEsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUNyQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RDOztBQUVBLE1BQU0sQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsdUJBQXVCLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN0QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FB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LElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQzs7QUFFQSxRQUFRLENBQUMsZUFBZSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUI7QUFDbkMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDMUM7O0FBRUEsUUFBUSxDQUFDLDBCQUEwQixDQUFDLElBQUksQ0FBQyxDQUFDO0FBQzFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3hDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFD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QUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pGLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxTQUFTO0FBQ2pELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDO0FBQy9FLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUVqRixLQUFLLENBQUMsNEJBQTRCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pELEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDN0UsS0FBSyxDQUFDLDJCQUEyQixDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDO0FBQ2xELENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDO0FBQ1QsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUNWLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO0FBQ1osQ0FBQyxDQUFDOztBQUVGLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDckIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHO0FBQ3JDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUN6QixDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUM7O0FBRUEsUUFBUSxDQUFDLGdCQUFnQixDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3JFOztBQUVBLFFBQVEsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUNwQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTtBQUNyQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN6QyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDdEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDUCxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUM5QixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDdEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQzNCLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUMxQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ25CLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQy9DOztBQUVBLFFBQVEsQ0FBQyxZQUFZLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekIsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN4RTs7QUFFQSxRQUFRLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUM7QUFDN0IsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDcEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDO0FBQy9CLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxZQUFZLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsWUFBWSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3Qzs7QUFFQSxRQUFRLENBQUMsYUFBYSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUM7QUFDM0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsR0FBRztBQUNyQixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQ3hCLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQ2hCOztBQUVBLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDOztBQUV6QixDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLFVBQVU7QUFDbEYsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDO0FBQzdFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsSUFBSTtBQUNuRyxDQUFDLENBQUM7QUFDRixRQUFRLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDLENBQUM7QUFDakQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxTQUFTLENBQUM7QUFDMUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDN0IsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUMxQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxvQkFBb0IsQ0FBQyxLQUFLLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDeEQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLG9CQUFvQixDQUFDLEtBQUssQ0FBQyxDQUFDLFNBQVMsQ0FBQztBQUN4RCxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsaUJBQWlCLENBQUMsU0FBUyxDQUFDO0FBQ2pELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQztBQUM1RCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMvRyxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsYUFBYSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM3Rzs7QUFFQSxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQztBQUN2QyxDQUFDLENBQUM7QUFDRixRQUFRLENBQUMsb0JBQW9CLENBQUMsSUFBSSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDMUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLHdCQUF3QixDQUFDLElBQUksQ0FBQztBQUM5QyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsd0JBQXdCLENBQUMsSUFBSSxDQUFDO0FBQzlDLENBQUMsQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUssQ0FBQztBQUNuQyxDQUFDLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDbkMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUNsQzs7QUFFQSxDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUM7QUFDakMsQ0FBQyxDQUFDO0FBQ0YsUUFBUSxDQUFDLHdCQUF3QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUc7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RSxDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7QUFDM0U7O0FBRUEsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDO0FBQ2xFLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQztBQUM5RCxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0FBQ25ELENBQUMsQ0FBQztBQUNGLFFBQVEsQ0FBQywyQkFBMkIsQ0FBQyxPQUFPLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ3pFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTztBQUN6RCxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDMUIsQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUM7QUFDakMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7QUFDakMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUc7QUFDeEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUM7QUFDakMsQ0FBQztBQUNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsV0FBVyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQztBQUN2RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzVDLENBQUM7QUFDRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxL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LENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDO0FBQ3RELENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDSixDQUFDLENBQUMsQ0FBQztBQUNILENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUM7QUFDdEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLO0FBQ2QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNULENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDM0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHO0FBQzFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDO0FBQ0YsQ0FBQztBQUNELENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRztBQUNaOztBQUVBLFFBQVEsQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsNEJBQTRCLENBQUMsU0FBUyxDQUFDO0FBQzVELENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLE1BQU07QUFDekIsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWUsQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUM7QUFDL0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsZUFBZSxDQUFDLEtBQUssQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQztBQUM5RSxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVCOztBQUVBLFFBQVEsQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDO0FBQ3pDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDNUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdFLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFdBQVcsQ0FBQztBQUN2QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNOLENBQUMsQ0FBQztBQUNGLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDeEYsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQ2IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsV0FBVyxDQUFDO0FBQ3ZCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxVQUFVLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLFVBQVUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUN2QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsVUFBVSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwQixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUk7QUFDeEMsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQ2I7O0FBRUEsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDO0FBQzNGLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLHdCQUF3QjtBQUNwRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxFQUFFLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLFFBQVE7QUFDbEUsQ0FBQyxDQUFDO0FBQ0YsTUFBTSxDQUFDLFFBQVEsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTTtBQUM3QyxDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsYUFBYSxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQztBQUN4QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUMxRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEtBQUssQ0FBQyxDQUFDLEtBQUs7QUFDbEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQywwQkFBMEIsQ0FBQyxRQUFRLENBQUM7QUFDcEQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxHQUFHLENBQUM7QUFDeEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1Qjs7QUFFQSxRQUFRLENBQUMsaUJBQWlCLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUMzRCxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDM0UsQ0FBQyxDQUFDLENBQUMsQ0FBQyxzQkFBc0IsQ0FBQyxTQUFTLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1Qjs7QUFFQSxRQUFRLENBQUMsb0JBQW9CLENBQUMsZUFBZSxDQUFDLENBQUM7QUFDL0MsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDbEQsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGFBQWEs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QUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdkIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLFFBQVE7QUFDdEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxHQUFHLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNsRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGFBQWEsQ0FBQyxHQUFHLENBQUM7QUFDbEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUM7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNmLENBQUMsQ0FBQzs7QUFFRixDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHOztBQUU1QixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsT0FBTyxDQUFDLEtBQUs7QUFDdkQsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsNEJBQTRCLENBQUMsQ0FBQztBQUNoRCxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDdEYsQ0FBQyxDQUFDO0FBQ0YsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSTs7QUFFOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsTUFBTTtBQUMvQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFD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QUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQ2xELENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxlQUFlLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxVQUFVO0FBQ2pFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsSUFBSSxDQUFDLDJCQUEyQixDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTztBQUNsRyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJOztBQUU1QixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyRixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLFlBQVksQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDcEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGNBQWMsQ0FBQyxJQUFJLENBQUMsMkJBQTJCLENBQUMsQ0FBQyxjQUFjLENBQUMsQ0FBQyxDQUFDO0FBQzNGLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxjQUFjO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUM7O0FBRUosQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxTQUFTLENBQUM7QUFDaEYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxLQUFLLENBQUM7QUFDeEUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxPQUFPLENBQUM7QUFDNUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7QUFDUCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUM7QUFDZixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxJQUFJLENBQUM7QUFDNUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxVQUFVLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQztBQUN0RSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLE9BQU8sQ0FB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S0FBSzs7QUFFdEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxxQkFBcUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMscUJBQXFCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3RHLENBQUMsQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDaEUsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUM5QyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLElBQUksQ0FBQyxRQUFRO0FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDOUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFD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QUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBQzNCLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqQixDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ3ZDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNqRCxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ0osQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ25CLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLDRCQUE0QixDQUFDLElBQUksQ0FBQztBQUM5RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUM7QUFDdkMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLGdCQUFnQixDQUFDLEdBQUcsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM5RCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsYUFBYSxDQUFDLENBQUM7QUFDakcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSztBQUNuQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUM7QUFDM0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUM7QUFDckMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtBQUNuRCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3BCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsZ0JBQWdCLENBQUMsR0FBRyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hFLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLGlCQUFpQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdkYsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ1IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLElBQUksQ0FB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UyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDdEIsQ0FBQyxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNyQixDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLHFCQUFxQixDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDMUQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUM7QUFDOUIsQ0FBQyxDQUFDOztBQUVGLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDeEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLElBQUksQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztBQUNwRixDQUFDLENBQUM7O0FBRUYsQ0FBQyxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzlDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7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Q0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDNUIsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsc0JBQXNCLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMzQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsY0FBYyxDQUFDLENBQUMsV0FBVyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsb0JBQW9CO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUM1QixDQUFDO0FBQ0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU87QUFDbkUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUMsR0FBRyxDQUFDLFVBQVUsQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDaEcsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxlQUFlLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFD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QyxDQUFDLGVBQWUsQ0FBQyxDQUFDO0FBQ3RDLENBQUMsQ0FBQztBQUNGOztBQUVBLFFBQVEsQ0FBQyxlQUFlLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDakMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNOLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLGVBQWU7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNwRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2hDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDO0FBQ3RDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUM7QUFDbEQsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFSixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQztBQUNiLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUM7QUFDbEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDaEIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztBQUNkLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQztBQUMxRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQztBQUMvQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztBQUNuRSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyw0QkFBNEIsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUM7QUFDbEgsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDTixDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzVCOztBQUVBLFFBQVEsQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDO0FBQzlCLENBQUMsQ0FBQyxLQUFLLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYTs7QUFFdEMsQ0FBQyxDQUFDLHNCQUFzQixDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2pDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzNELENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxjQUFjLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDL0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENB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