import { getGlobals } from '../core/state.js';
import { forEachPanelUiDocument } from '../ui/panel-ui-context.js';
import {
  DEFAULT_LONDON_WEATHER_PALETTE_ID,
  LONDON_WEATHER_PALETTES,
  getLondonWeatherPaletteAccents,
  resolveLondonWeatherPaletteId,
} from '../../../palette/londonPalettes.js';
import {
  TIME_OF_DAY_PALETTE_PERIODS,
} from '../../../palette/timeOfDayPalette.js';
import { resolveSimulationColorDistribution } from '../../../palette/simulationPaletteContract.js';
import {
  createSimulationMaterialSequence,
  getSimulationPaletteSnapshot,
  selectSimulationMaterialRole,
} from '../../../palette/simulationPaletteController.js';

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

function hsvToRgb01({ h, s, v }) {
  const hh = ((Number(h) % 360) + 360) % 360;
  const ss = clamp01(s);
  const vv = clamp01(v);

  const c = vv * ss;
  const x = c * (1 - Math.abs(((hh / 60) % 2) - 1));
  const m = vv - c;

  let rr, gg, bb;
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

export const PALETTE_CHAPTER_ORDER = TIME_OF_DAY_PALETTE_PERIODS.map(
  (period) => period.paletteId,
);

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
  return resolveSimulationColorDistribution(
    g?.colorDistribution,
    Array.isArray(g?.currentColors) ? g.currentColors.length : 8,
  );
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

export function getTimeOfDayPaletteTemplate() {
  return resolveLondonWeatherPaletteId(getSimulationPaletteSnapshot().paletteId)
    || DEFAULT_LONDON_WEATHER_PALETTE_ID;
}

// ═══════════════════════════════════════════════════════════════════════════════
// LEGACY INTERACTION ACCENT (contrasty-only palette selection)
// - Shared by accent-led UI and the deprecated mouse trail; the cursor lens is neutral
// - Event-driven (mode switch / reset / startup / palette change), not in hot paths
// ═══════════════════════════════════════════════════════════════════════════════

const CURSOR_SAFE_FALLBACK_INDICES = [3, 5, 6, 7];
const CURSOR_SAT_MIN = 0.18; // exclude greys/white/black; keep “ball color” feel
const ROUTE_CURSOR_ACCENT_INDEXES = Object.freeze({
  home: 3,
  portfolio: 5,
  about: 6,
  contact: 7,
  playground: 2,
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
  const template = COLOR_TEMPLATES[resolveColorTemplateName(templateName)];
  if (!template) return COLOR_TEMPLATES[DEFAULT_LONDON_WEATHER_PALETTE_ID].light.slice();

  const isDarkMode = typeof isDarkOverride === 'boolean'
    ? isDarkOverride
    : Boolean(getGlobals().isDarkMode);
  const rawPalette = isDarkMode ? template.dark : template.light;
  return rawPalette.slice();
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
    const coverageIndex = getCoverageDistributionIndex(dist);
    if (coverageIndex != null) {
      const row = dist[coverageIndex];
      const idx = clampIntFallback(row?.colorIndex, 0, 7, 0);
      return { color: colors[idx] || colors[0] || '#ffffff', distributionIndex: coverageIndex };
    }
    const role = selectSimulationMaterialRole(Math.random(), getSimulationPaletteSnapshot());
    const idx = clampIntFallback(role?.colorIndex, 0, 7, 0);
    return {
      color: colors[idx] || colors[0] || '#ffffff',
      distributionIndex: clampIntFallback(role?.distributionIndex, 0, dist.length - 1, 0),
    };
  }

  return { color: colors[0] || '#ffffff', distributionIndex: 0 };
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

  // Keep any development UI selects in sync with the shared schedule.
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

export function applySimulationPaletteSnapshot(snapshot) {
  const globals = getGlobals();
  if (!snapshot || snapshot.generation === globals.simulationPaletteGeneration) return;

  globals.currentTemplate = snapshot.paletteId;
  globals.currentColors = snapshot.colors.slice();
  globals.colorDistribution = snapshot.distribution.map((row) => ({ ...row }));
  globals.simulationPaletteGeneration = snapshot.generation;
  globals.simulationPaletteEffectiveAt = snapshot.effectiveAt;
  if (globals.canvas?.dataset) {
    globals.canvas.dataset.simulationPaletteGeneration = String(snapshot.generation);
    globals.canvas.dataset.simulationPaletteId = snapshot.paletteId;
  }
  applyPaletteTheme(snapshot.paletteId);

  try {
    forEachPanelUiDocument((uiDocument) => {
      const select = uiDocument.getElementById('colorSelect');
      if (select) select.value = snapshot.paletteId;
    });
  } catch (_) { /* no-op */ }

  updateExistingBallColors(snapshot);
  const routePick = applyActiveRouteCursorColor();
  if (!routePick) {
    applyCursorColorIndex(globals.cursorColorIndex, { forceMode: globals.cursorColorMode });
  }
  updateColorPickersUI();
}

function updateExistingBallColors(snapshot = getSimulationPaletteSnapshot()) {
  const globals = getGlobals();
  const balls = globals.balls;
  const distribution = getDistribution(globals);
  const materialSequence = balls.length
    ? createSimulationMaterialSequence(balls.length, {}, snapshot)
    : [];

  for (let i = 0; i < balls.length; i++) {
    const ball = balls[i];
    if (!ball) continue;
    const distributionIndex = Number(ball.distributionIndex);
    const paletteIndex = Number.isInteger(distributionIndex)
      ? Number(distribution?.[distributionIndex]?.colorIndex)
      : NaN;
    if (Number.isInteger(paletteIndex) && globals.currentColors[paletteIndex]) {
      ball.color = globals.currentColors[paletteIndex];
      continue;
    }
    const role = materialSequence[i] || distribution[0];
    ball.distributionIndex = Number(role?.distributionIndex) || 0;
    ball.color = globals.currentColors[role?.colorIndex] || globals.currentColors[0] || '#ffffff';
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
