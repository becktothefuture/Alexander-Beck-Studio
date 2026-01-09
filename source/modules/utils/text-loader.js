// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          TEXT LOADER (SOURCE OF TRUTH)                       ║
// ║  Loads `source/config/contents-home.json` (dev) or reads `window.__TEXT__`    ║
// ║                 Guarantee: no dialog/text pop-in once visible                ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

let cachedText = null;

function isObject(v) {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function readWindowText() {
  try {
    const t = (typeof window !== 'undefined') ? window.__TEXT__ : null;
    return isObject(t) ? t : null;
  } catch (e) {
    return null;
  }
}

async function fetchTextJSON() {
  const paths = [
    'config/contents-home.json',
    'js/contents-home.json',
    '../public/js/contents-home.json',
  ];

  for (const path of paths) {
    try {
      const res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) continue;
      const json = await res.json();
      if (isObject(json)) return json;
    } catch (e) {
      // Try next path
    }
  }
  throw new Error('No contents-home.json found');
}

/**
 * Load the runtime text dictionary.
 * - Production: already inlined at build-time as window.__TEXT__ (zero fetch)
 * - Dev: fetched once at startup, cached and installed on window.__TEXT__
 */
export async function loadRuntimeText() {
  if (cachedText) return cachedText;

  const fromWindow = readWindowText();
  if (fromWindow) {
    cachedText = fromWindow;
    return cachedText;
  }

  const fetched = await fetchTextJSON();
  cachedText = fetched;
  try {
    if (typeof window !== 'undefined') window.__TEXT__ = fetched;
  } catch (e) {}
  return cachedText;
}

/**
 * Sync getter (for modules that already run after loadRuntimeText()).
 */
export function getRuntimeTextSync() {
  return cachedText || readWindowText();
}

/**
 * Read a nested key path from the loaded text dictionary.
 * Example: getText('gates.cv.title', 'Fallback')
 */
export function getText(path, fallback = '') {
  const root = getRuntimeTextSync();
  if (!root) return fallback;
  if (!path) return fallback;

  const parts = String(path).split('.').filter(Boolean);
  let cur = root;
  for (const p of parts) {
    if (!isObject(cur) && !Array.isArray(cur)) return fallback;
    cur = cur?.[p];
    if (cur === undefined || cur === null) return fallback;
  }
  return cur;
}

