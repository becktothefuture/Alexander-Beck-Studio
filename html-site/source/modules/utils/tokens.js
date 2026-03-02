// Token helpers: read resolved CSS custom properties with safe fallbacks.

function getTokenSnapshot() {
  try {
    if (typeof window === 'undefined') return null;
    const snapshot = window.__TOKENS__;
    if (!snapshot || typeof snapshot !== 'object') return null;
    return snapshot;
  } catch (e) {
    return null;
  }
}

function readComputedVar(name) {
  try {
    if (typeof document === 'undefined') return '';
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  } catch (e) {
    return '';
  }
}

function resolveWithSnapshot(value, snapshot) {
  const src = String(value || '');
  if (!src.includes('var(')) return src.trim();
  if (!snapshot) return src.trim();
  const varRegex = /var\((--[a-z0-9-_]+)(?:\s*,\s*([^)]+))?\)/gi;
  let out = src;
  let guard = 0;
  while (out.includes('var(') && guard < 8) {
    out = out.replace(varRegex, (_match, name, fallback) => {
      const resolved = snapshot.resolved?.[name] ?? snapshot.cssVars?.[name];
      if (resolved !== undefined && resolved !== null) return String(resolved).trim();
      if (fallback) return String(fallback).trim();
      return '';
    });
    guard += 1;
  }
  return out.trim();
}

export function readTokenVar(name, fallback = '') {
  const varName = String(name).startsWith('--') ? name : `--${name}`;
  const snapshot = getTokenSnapshot();
  const computed = readComputedVar(varName);

  if (computed && !computed.includes('var(')) return computed;

  if (snapshot) {
    const direct = snapshot.resolved?.[varName] ?? snapshot.cssVars?.[varName];
    const resolved = resolveWithSnapshot(direct ?? computed, snapshot);
    if (resolved && !resolved.includes('var(')) return resolved;
  }

  if (computed && !computed.includes('var(')) return computed;
  return fallback;
}

export function readTokenNumber(name, fallback) {
  const value = readTokenVar(name, '');
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : fallback;
}

export function readTokenPx(name, fallback) {
  const value = readTokenVar(name, '');
  if (!value) return fallback;
  const n = parseFloat(String(value).replace(/px$/i, ''));
  return Number.isFinite(n) ? n : fallback;
}

export function readTokenMs(name, fallback) {
  const value = readTokenVar(name, '');
  if (!value) return fallback;
  const raw = String(value).trim().toLowerCase();
  const n = parseFloat(raw);
  if (!Number.isFinite(n)) return fallback;
  if (raw.endsWith('ms')) return n;
  if (raw.endsWith('s')) return n * 1000;
  return n;
}
