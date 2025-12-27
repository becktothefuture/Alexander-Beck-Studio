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

const BASE_PALETTES = {
  industrialTeal: {
    label: 'Industrial Teal',
    light: ['#9cb0a9', '#b1c1bf', '#ffffff', '#00695c', '#000000', '#ff4013', '#0d5cb6', '#ffa000'],
    dark: ['#5b8378', '#345d51', '#8a928a', '#00e6c3', '#d5d5d5', '#ff6b47', '#5b9aff', '#ffb84d']
  },
  industrialRust: {
    label: 'Industrial Rust',
    light: ['#b0a49b', '#c6bbb4', '#ffffff', '#8B4513', '#000000', '#00695c', '#FF8C42', '#D4A574'],
    dark: ['#81695f', '#5a4238', '#8a8886', '#FF6B35', '#d5d5d5', '#00e6c3', '#FFA366', '#E8C4A0']
  },
  industrialSlate: {
    label: 'Industrial Slate',
    light: ['#a5a8ae', '#bcbec0', '#ffffff', '#4A5568', '#000000', '#00A8CC', '#718096', '#2D3748'],
    dark: ['#6d7880', '#46525a', '#86888b', '#90CDF4', '#d5d5d5', '#00D4FF', '#A0AEC0', '#4A5568']
  },
  industrialAmber: {
    label: 'Industrial Amber',
    light: ['#bcab96', '#d1c3b2', '#ffffff', '#D97706', '#000000', '#00695c', '#F59E0B', '#FCD34D'],
    dark: ['#80755a', '#594e33', '#8a8883', '#FBBF24', '#d5d5d5', '#00e6c3', '#FCD34D', '#FDE68A']
  },
  industrialViolet: {
    label: 'Industrial Violet',
    light: ['#aba4bb', '#c0bbcd', '#ffffff', '#6B46C1', '#000000', '#00A8CC', '#9333EA', '#A78BFA'],
    dark: ['#776d85', '#50465d', '#8a888f', '#C084FC', '#d5d5d5', '#00D4FF', '#A78BFA', '#C4B5FD']
  },
  industrialForest: {
    label: 'Industrial Forest',
    light: ['#9daba0', '#b4c0b8', '#ffffff', '#166534', '#000000', '#00695c', '#22C55E', '#4ADE80'],
    dark: ['#627a68', '#3c5441', '#868883', '#4ADE80', '#d5d5d5', '#00e6c3', '#86EFAC', '#BBF7D0']
  },
  industrialSteel: {
    label: 'Industrial Steel',
    light: ['#a4a8ad', '#bbbdc0', '#ffffff', '#475569', '#000000', '#0EA5E9', '#64748B', '#334155'],
    dark: ['#6d7177', '#474b51', '#86888b', '#94A3B8', '#d5d5d5', '#38BDF8', '#94A3B8', '#CBD5E1']
  }
};

const TEAL_ANCHOR_WEIGHT_VARIANT = 0.6; // variant may differ, but must retain >=60% Industrial Teal spirit
const TEAL_BASE = BASE_PALETTES.industrialTeal;
const RADICAL_FACTOR = 1.2; // 20% more character to maintain color variety while staying teal-anchored

export const COLOR_TEMPLATES = {
  industrialTeal: TEAL_BASE,
  industrialRust: {
    label: BASE_PALETTES.industrialRust.label,
    light: blendPalette(
      TEAL_BASE.light,
      radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialRust.light, RADICAL_FACTOR),
      TEAL_ANCHOR_WEIGHT_VARIANT
    ),
    dark: blendPalette(
      TEAL_BASE.dark,
      radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialRust.dark, RADICAL_FACTOR),
      TEAL_ANCHOR_WEIGHT_VARIANT
    )
  },
  industrialSlate: {
    label: BASE_PALETTES.industrialSlate.label,
    light: blendPalette(
      TEAL_BASE.light,
      radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialSlate.light, RADICAL_FACTOR),
      TEAL_ANCHOR_WEIGHT_VARIANT
    ),
    dark: blendPalette(
      TEAL_BASE.dark,
      radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialSlate.dark, RADICAL_FACTOR),
      TEAL_ANCHOR_WEIGHT_VARIANT
    )
  },
  industrialAmber: {
    label: BASE_PALETTES.industrialAmber.label,
    light: blendPalette(
      TEAL_BASE.light,
      radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialAmber.light, RADICAL_FACTOR),
      TEAL_ANCHOR_WEIGHT_VARIANT
    ),
    dark: blendPalette(
      TEAL_BASE.dark,
      radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialAmber.dark, RADICAL_FACTOR),
      TEAL_ANCHOR_WEIGHT_VARIANT
    )
  },
  industrialViolet: {
    label: BASE_PALETTES.industrialViolet.label,
    light: blendPalette(
      TEAL_BASE.light,
      radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialViolet.light, RADICAL_FACTOR),
      TEAL_ANCHOR_WEIGHT_VARIANT
    ),
    dark: blendPalette(
      TEAL_BASE.dark,
      radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialViolet.dark, RADICAL_FACTOR),
      TEAL_ANCHOR_WEIGHT_VARIANT
    )
  },
  industrialForest: {
    label: BASE_PALETTES.industrialForest.label,
    light: blendPalette(
      TEAL_BASE.light,
      radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialForest.light, RADICAL_FACTOR),
      TEAL_ANCHOR_WEIGHT_VARIANT
    ),
    dark: blendPalette(
      TEAL_BASE.dark,
      radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialForest.dark, RADICAL_FACTOR),
      TEAL_ANCHOR_WEIGHT_VARIANT
    )
  },
  industrialSteel: {
    label: BASE_PALETTES.industrialSteel.label,
    light: blendPalette(
      TEAL_BASE.light,
      radicalizeVariant(TEAL_BASE.light, BASE_PALETTES.industrialSteel.light, RADICAL_FACTOR),
      TEAL_ANCHOR_WEIGHT_VARIANT
    ),
    dark: blendPalette(
      TEAL_BASE.dark,
      radicalizeVariant(TEAL_BASE.dark, BASE_PALETTES.industrialSteel.dark, RADICAL_FACTOR),
      TEAL_ANCHOR_WEIGHT_VARIANT
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

function stampCursorCSSVar(hex) {
  try {
    document.documentElement.style.setProperty('--cursor-color', String(hex || '').trim() || '#000000');
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
  return globals.isDarkMode ? template.dark : template.light;
}

export function pickRandomColor() {
  const globals = getGlobals();
  const colors = globals.currentColors;
  
  if (!colors || colors.length === 0) {
    console.warn('No colors available, using fallback');
    return '#ffffff';
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
          return colors[idx] || colors[0] || '#ffffff';
        }
      }
      // Numeric edge case: fall through to a deterministic row.
      const last = dist[dist.length - 1];
      const idx = clampIntFallback(last?.colorIndex, 0, 7, 0);
      return colors[idx] || colors[0] || '#ffffff';
    }
  }

  // Fallback: legacy weights over the first 8 palette entries.
  const random = Math.random();
  let cumulativeWeight = 0;
  const maxIdx = Math.min(colors.length, LEGACY_COLOR_WEIGHTS.length, 8);
  for (let i = 0; i < maxIdx; i++) {
    cumulativeWeight += LEGACY_COLOR_WEIGHTS[i];
    if (random <= cumulativeWeight) return colors[i];
  }
  return colors[Math.min(colors.length - 1, 7)] || '#ffffff';
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

  for (let i = 0; i < balls.length; i++) {
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
