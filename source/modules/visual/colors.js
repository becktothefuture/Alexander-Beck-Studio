// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                        COLOR PALETTE SYSTEM (COMPLETE)                       ║
// ║              Extracted from balls-source.html lines 1405-1558                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

export const COLOR_TEMPLATES = {
  industrialTeal: { 
    label: 'Industrial Teal',
    light: ['#b7bcb7', '#d0d0d0', '#ffffff', '#00695c', '#000000', '#ff4013', '#0d5cb6', '#ffa000'],
    dark: ['#6b726b', '#3d453d', '#8a928a', '#00e6c3', '#d5d5d5', '#ff6b47', '#5b9aff', '#ffb84d']
  },
  sunsetCoral: { 
    label: 'Sunset Coral', 
    light: ['#bdbbb8', '#e8e6e3', '#ffffff', '#ff3b3b', '#000000', '#00f5d4', '#1e40af', '#fb923c'],
    dark: ['#716f6b', '#3f3d3a', '#8e8c88', '#ff6b6b', '#d8d8d8', '#00ffe7', '#6ba3ff', '#ffb570']
  },
  violetPunch: { 
    label: 'Violet Punch', 
    light: ['#b8b7c2', '#e6e5ed', '#ffffff', '#9333ea', '#000000', '#dc2626', '#0ea5e9', '#facc15'],
    dark: ['#6d6c7a', '#3a3845', '#8b8a98', '#c266ff', '#dad6e8', '#ff5c5c', '#42d4ff', '#fff066']
  },
  citrusBlast: { 
    label: 'Citrus Blast', 
    light: ['#bfbdb5', '#eae8df', '#ffffff', '#ea580c', '#000000', '#e11d48', '#2563eb', '#059669'],
    dark: ['#74726a', '#403e38', '#918f87', '#ff8c4d', '#dbd9d1', '#ff5c7a', '#6ba3ff', '#00d699']
  },
  cobaltSpark: { 
    label: 'Cobalt Spark', 
    light: ['#b5b8be', '#e3e6eb', '#ffffff', '#1d4ed8', '#000000', '#ea580c', '#db2777', '#d97706'],
    dark: ['#696d75', '#3a3e45', '#878b93', '#6b9dff', '#d6dae2', '#ff8c5c', '#ff66b3', '#ffc266']
  }
};

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
  for (const [key, template] of Object.entries(COLOR_TEMPLATES)) {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = template.label;
    select.appendChild(option);
  }
  
  const globals = getGlobals();
  select.value = globals.currentTemplate;
}


