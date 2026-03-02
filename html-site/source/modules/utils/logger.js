// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         DEV/PROD CONSOLE LOGGER                               ║
// ║            Dev: structured, ordered logs | Prod: banner only                  ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

import { getGlobals } from '../core/state.js';

/**
 * Design goals:
 * - DEV: make initialization legible + provable (sequence + timings)
 * - PROD: keep console quiet for visitors (banner + ASCII only), but allow errors
 * - Safety: never throw, never allocate in hot paths (bootstrap only)
 */

const rawConsole = (() => {
  // Capture early, in case prod stubs console methods.
  try {
    return {
      log: console.log?.bind(console) ?? (() => {}),
      info: console.info?.bind(console) ?? (() => {}),
      warn: console.warn?.bind(console) ?? (() => {}),
      error: console.error?.bind(console) ?? (() => {}),
      debug: console.debug?.bind(console) ?? (() => {}),
      groupCollapsed: console.groupCollapsed?.bind(console) ?? (() => {}),
      groupEnd: console.groupEnd?.bind(console) ?? (() => {}),
      table: console.table?.bind(console) ?? (() => {}),
    };
  } catch (e) {
    return {
      log: () => {},
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      groupCollapsed: () => {},
      groupEnd: () => {},
      table: () => {},
    };
  }
})();

let devMode = null;
let seq = 0;
let t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
let bannerPrinted = false;

function detectDevMode() {
  // Bundled builds can inject __DEV__ (boolean literal) via Rollup replace.
  // In unbundled dev (native modules), fall back to documented detection rules.
  try {
    if (typeof __DEV__ === 'boolean') return __DEV__;
  } catch (e) {
    // __DEV__ not defined
  }

  try {
    const port = String(globalThis?.location?.port ?? '');
    if (port === '8001') return true;
  } catch (e) {}

  try {
    // Docs: DEV if page contains `<script type="module" src="main.js">`
    const scripts = Array.from(document.scripts || []);
    const hasModuleMain = scripts.some((s) => {
      const type = (s.getAttribute('type') || '').toLowerCase();
      if (type !== 'module') return false;
      const src = s.getAttribute('src') || '';
      return /(^|\/)main\.js(\?|#|$)/.test(src);
    });
    if (hasModuleMain) return true;
  } catch (e) {}

  return false;
}

export function isDev() {
  if (devMode === null) devMode = detectDevMode();
  return devMode;
}

// Fallback color palette (Industrial Teal light mode) - used if currentColors not available
// Weights: 50%, 25%, 12%, 6%, 3%, 2%, 1%, 1%
const FALLBACK_CONSOLE_COLORS = [
  '#b7bcb7', // gray (dominant)
  '#d0d0d0', // light gray
  '#ffffff', // white
  '#00695c', // teal (accent)
  '#1a1a1a', // near-black (readable)
  '#ff4013', // orange
  '#0d5cb6', // blue
  '#ffa000', // amber
];
const COLOR_WEIGHTS = [0.50, 0.25, 0.12, 0.06, 0.03, 0.02, 0.01, 0.01];

/**
 * Get current color scheme colors from globals, with fallback to hardcoded palette
 * This ensures terminal text matches the ball colors
 */
function getConsoleColors() {
  try {
    const globals = getGlobals();
    const colors = globals?.currentColors;
    if (Array.isArray(colors) && colors.length >= 8) {
      return colors.slice(0, 8);
    }
  } catch (e) {
    // If getGlobals fails or colors not available, use fallback
  }
  return FALLBACK_CONSOLE_COLORS;
}

function pickWeightedColor(colors) {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < COLOR_WEIGHTS.length; i++) {
    cumulative += COLOR_WEIGHTS[i];
    if (r <= cumulative) return colors[i];
  }
  return colors[0];
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildColorMap(ascii, clusterSize = 3) {
  // Get current color scheme (matches ball colors)
  // Wrap in try-catch to ensure we always have valid colors
  let colors;
  try {
    colors = getConsoleColors();
    // Ensure we have exactly 8 colors
    if (!Array.isArray(colors) || colors.length < 8) {
      colors = FALLBACK_CONSOLE_COLORS;
    }
  } catch (e) {
    colors = FALLBACK_CONSOLE_COLORS;
  }
  
  // Count total visible clusters (non-whitespace-only)
  const clusters = [];
  for (let row = 0; row < ascii.length; row++) {
    const line = ascii[row];
    for (let i = 0; i < line.length; i += clusterSize) {
      const chunk = line.slice(i, i + clusterSize);
      clusters.push({ row, col: i, visible: chunk.trim().length > 0 });
    }
  }
  
  const visibleIndices = clusters
    .map((c, i) => (c.visible ? i : -1))
    .filter((i) => i >= 0);
  
  // Guarantee all 8 colors appear at least once
  const colorAssignments = new Array(clusters.length).fill(null);
  const shuffledVisible = shuffle([...visibleIndices]);
  
  // Assign one of each color to the first 8 visible clusters
  for (let i = 0; i < Math.min(8, shuffledVisible.length); i++) {
    const colorIndex = Math.min(i, colors.length - 1);
    colorAssignments[shuffledVisible[i]] = colors[colorIndex] || FALLBACK_CONSOLE_COLORS[colorIndex];
  }
  
  // Fill remaining visible clusters with weighted random
  for (const idx of visibleIndices) {
    if (colorAssignments[idx] === null) {
      colorAssignments[idx] = pickWeightedColor(colors);
    }
  }
  
  // Non-visible clusters get transparent
  for (let i = 0; i < clusters.length; i++) {
    if (colorAssignments[i] === null) {
      colorAssignments[i] = 'transparent';
    }
  }
  
  return { clusters, colorAssignments };
}

function colorizeAsciiLines(ascii, clusterSize = 3) {
  const { clusters, colorAssignments } = buildColorMap(ascii, clusterSize);
  const results = [];
  let clusterIdx = 0;
  
  // Base style applied to all chunks to ensure consistent width
  const baseStyle = 'font-family: monospace; font-weight: bold; font-size: 12px; letter-spacing: 0;';
  
  for (const line of ascii) {
    let format = '';
    const styles = [];
    for (let i = 0; i < line.length; i += clusterSize) {
      const chunk = line.slice(i, i + clusterSize);
      format += '%c' + chunk;
      const color = colorAssignments[clusterIdx];
      styles.push(`color: ${color}; ${baseStyle}`);
      clusterIdx++;
    }
    results.push([format, ...styles]);
  }
  
  return results;
}

export function printConsoleBanner({
  sentence = 'Curious mind detected. Design meets engineering at 60fps.',
  ascii = [
    '██████  ███████  ██████ ██   ██',
    '██   ██ ██      ██      ██  ██ ',
    '██████  █████   ██      █████  ',
    '██   ██ ██      ██      ██  ██ ',
    '██████  ███████  ██████ ██   ██',
  ],
  silence = false,
} = {}) {
  // Print only once per page load (dev or prod).
  if (bannerPrinted) return;
  bannerPrinted = true;

  try {
    // Sentence (subtle styling)
    rawConsole.log('%c' + sentence, 'color: #888; font-style: italic;');
    rawConsole.log(''); // spacer

    // ASCII (distributed colors; all 8 guaranteed to appear)
    // Wrap in try-catch to ensure banner always prints even if colorization fails
    try {
      const coloredLines = colorizeAsciiLines(ascii, 3);
      for (const args of coloredLines) rawConsole.log(...args);
    } catch (colorError) {
      // Fallback: print ASCII without colors if colorization fails
      for (const line of ascii) {
        rawConsole.log(line);
      }
    }
    rawConsole.log(''); // spacer

    // Copyright notice
    const year = new Date().getFullYear();
    rawConsole.log(
      '%c© ' + year + ' Alexander Beck Studio. All rights reserved. Unauthorized reproduction prohibited.',
      'color: #555; font-size: 10px;'
    );
  } catch (e) {
    // If console is not writable, ignore.
  }

  if (!silence) return;

  try {
    // Keep console.error intact for real failures; silence everything else.
    console.log = () => {};
    console.info = () => {};
    console.warn = () => {};
    console.debug = () => {};
    console.table = () => {};
    console.group = () => {};
    console.groupCollapsed = () => {};
    console.groupEnd = () => {};
  } catch (e) {}
}

export function initConsolePolicy({
  sentence = 'Curious mind detected. Design meets engineering at 60fps.',
  ascii = [
    '██████  ███████  ██████ ██   ██',
    '██   ██ ██      ██      ██  ██ ',
    '██████  █████   ██      █████  ',
    '██   ██ ██      ██      ██  ██ ',
    '██████  ███████  ██████ ██   ██',
  ],
} = {}) {
  const dev = isDev();
  if (dev) return;

  // Production: banner + multi-colored ASCII, then silence non-error logs.
  printConsoleBanner({ sentence, ascii, silence: true });
}

export function group(label) {
  if (!isDev()) return;
  rawConsole.groupCollapsed(label);
}

export function groupEnd() {
  if (!isDev()) return;
  rawConsole.groupEnd();
}

export function log(message, data) {
  if (!isDev()) return;
  const dt = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0;
  seq += 1;
  if (typeof data === 'undefined') {
    rawConsole.log(`[${String(seq).padStart(2, '0')}] +${dt.toFixed(1)}ms ${message}`);
  } else {
    rawConsole.log(`[${String(seq).padStart(2, '0')}] +${dt.toFixed(1)}ms ${message}`, data);
  }
}

export function warn(message, data) {
  if (!isDev()) return;
  const dt = ((typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now()) - t0;
  seq += 1;
  if (typeof data === 'undefined') {
    rawConsole.warn(`[${String(seq).padStart(2, '0')}] +${dt.toFixed(1)}ms ${message}`);
  } else {
    rawConsole.warn(`[${String(seq).padStart(2, '0')}] +${dt.toFixed(1)}ms ${message}`, data);
  }
}

export function mark(name) {
  if (!isDev()) return;
  try {
    performance.mark(name);
  } catch (e) {}
}

export function measure(name, startMark, endMark) {
  if (!isDev()) return null;
  try {
    performance.measure(name, startMark, endMark);
    const entries = performance.getEntriesByName(name);
    const last = entries && entries.length ? entries[entries.length - 1] : null;
    return last ? last.duration : null;
  } catch (e) {
    return null;
  }
}

export function table(rows) {
  if (!isDev()) return;
  try {
    rawConsole.table(rows);
  } catch (e) {}
}


