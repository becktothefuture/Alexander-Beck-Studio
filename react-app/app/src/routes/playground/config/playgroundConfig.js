export const PLAYGROUND_CONFIG_EVENT = 'abs:playground-config';

export const PLAYGROUND_LAYOUT_PRESETS = Object.freeze([
  'balanced',
  'loose',
  'clustered',
]);

export const DEFAULT_PLAYGROUND_CONFIG = Object.freeze({
  layoutPreset: 'balanced',
  layoutSeed: 271828,
  gridSpacingPx: 28,
  minimumWorldColumns: 80,
  minimumWorldRows: 56,
  worldPaddingCells: 1,
  projectSpacing: 1.5,
  itemGapCells: 3,
  itemScale: 1.5,
  sizeVariation: 0.28,
  labelGapPx: 8,
  dotRadiusPx: 2.25,
  dotOpacity: 0.28,
  colorWakeRadiusPx: 168,
  colorWakePersistenceMs: 1000,
  colorWakeFadeMs: 2000,
  colorWakeOpacity: 0.88,
  colorWakeDensity: 1,
  colorWakeEdgeSoftness: 0,
  colorWakeDotScale: 1,
  wheelSensitivity: 0.82,
  dragMomentum: 0.88,
});

export const PLAYGROUND_CONFIG_BOUNDS = Object.freeze({
  layoutSeed: Object.freeze({ min: 0, max: 0xffffffff, step: 1, integer: true }),
  gridSpacingPx: Object.freeze({ min: 24, max: 72, step: 4 }),
  minimumWorldColumns: Object.freeze({ min: 56, max: 160, step: 8, integer: true }),
  minimumWorldRows: Object.freeze({ min: 40, max: 112, step: 8, integer: true }),
  worldPaddingCells: Object.freeze({ min: 1, max: 20, step: 1, integer: true }),
  projectSpacing: Object.freeze({ min: 1, max: 2.5, step: 0.05 }),
  itemGapCells: Object.freeze({ min: 1, max: 6, step: 1, integer: true }),
  itemScale: Object.freeze({ min: 0.75, max: 2, step: 0.01 }),
  sizeVariation: Object.freeze({ min: 0, max: 0.5, step: 0.01 }),
  labelGapPx: Object.freeze({ min: 4, max: 16, step: 1, integer: true }),
  dotRadiusPx: Object.freeze({ min: 2, max: 7, step: 0.25 }),
  dotOpacity: Object.freeze({ min: 0.12, max: 0.6, step: 0.01 }),
  colorWakeRadiusPx: Object.freeze({ min: 56, max: 360, step: 8, integer: true }),
  colorWakePersistenceMs: Object.freeze({ min: 1000, max: 3000, step: 100, integer: true }),
  colorWakeFadeMs: Object.freeze({ min: 500, max: 4000, step: 100, integer: true }),
  colorWakeOpacity: Object.freeze({ min: 0.25, max: 1, step: 0.01 }),
  colorWakeDensity: Object.freeze({ min: 0.15, max: 1, step: 0.05 }),
  colorWakeEdgeSoftness: Object.freeze({ min: 0, max: 1, step: 0.05 }),
  colorWakeDotScale: Object.freeze({ min: 0.5, max: 1.5, step: 0.05 }),
  wheelSensitivity: Object.freeze({ min: 0.5, max: 1.6, step: 0.01 }),
  dragMomentum: Object.freeze({ min: 0, max: 0.96, step: 0.01 }),
});

const subscribers = new Set();

function clampNumber(value, bounds, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const clamped = Math.min(bounds.max, Math.max(bounds.min, numeric));
  return bounds.integer ? Math.round(clamped) : clamped;
}

function cloneConfig(config) {
  return { ...config };
}

function configsMatch(left, right) {
  return Object.keys(DEFAULT_PLAYGROUND_CONFIG).every((key) => left[key] === right[key]);
}

export function normalizePlaygroundConfig(input = {}) {
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const normalized = {
    layoutPreset: PLAYGROUND_LAYOUT_PRESETS.includes(source.layoutPreset)
      ? source.layoutPreset
      : DEFAULT_PLAYGROUND_CONFIG.layoutPreset,
  };

  for (const [key, bounds] of Object.entries(PLAYGROUND_CONFIG_BOUNDS)) {
    normalized[key] = clampNumber(source[key], bounds, DEFAULT_PLAYGROUND_CONFIG[key]);
  }

  return normalized;
}

let currentPlaygroundConfig = normalizePlaygroundConfig(DEFAULT_PLAYGROUND_CONFIG);

function publishPlaygroundConfig(reason) {
  const config = getPlaygroundConfigSnapshot();

  for (const subscriber of subscribers) {
    try {
      subscriber(config, { reason });
    } catch {
      // One dev-panel listener must not block the route runtime or other hosts.
    }
  }

  if (typeof window !== 'undefined') {
    window.__ABS_PLAYGROUND_CONFIG__ = config;
    window.dispatchEvent(new CustomEvent(PLAYGROUND_CONFIG_EVENT, {
      detail: { config, reason },
    }));
  }
}

if (typeof window !== 'undefined') {
  window.__ABS_PLAYGROUND_CONFIG__ = getPlaygroundConfigSnapshot();
}

export function getPlaygroundConfigSnapshot() {
  return cloneConfig(currentPlaygroundConfig);
}

export function buildPlaygroundCanonicalSnapshot(input = currentPlaygroundConfig) {
  return normalizePlaygroundConfig(input);
}

export function setPlaygroundConfig(input = {}, { emit = true, reason = 'set' } = {}) {
  const nextConfig = normalizePlaygroundConfig(input);
  const changed = !configsMatch(currentPlaygroundConfig, nextConfig);
  currentPlaygroundConfig = nextConfig;

  if (emit && (changed || reason === 'reset' || reason === 'new-seed')) {
    publishPlaygroundConfig(reason);
  } else if (typeof window !== 'undefined') {
    window.__ABS_PLAYGROUND_CONFIG__ = getPlaygroundConfigSnapshot();
  }

  return getPlaygroundConfigSnapshot();
}

export function updatePlaygroundConfig(patch = {}, options = {}) {
  const source = patch && typeof patch === 'object' && !Array.isArray(patch) ? patch : {};
  return setPlaygroundConfig({
    ...currentPlaygroundConfig,
    ...source,
  }, {
    ...options,
    reason: options.reason || 'update',
  });
}

export function resetPlaygroundConfig(options = {}) {
  return setPlaygroundConfig(DEFAULT_PLAYGROUND_CONFIG, {
    ...options,
    reason: 'reset',
  });
}

export function subscribePlaygroundConfig(listener, { emitInitial = false } = {}) {
  if (typeof listener !== 'function') return () => {};
  subscribers.add(listener);
  if (emitInitial) listener(getPlaygroundConfigSnapshot(), { reason: 'initial' });
  return () => subscribers.delete(listener);
}

function getGeneratedSeedValue(randomSource) {
  if (typeof randomSource === 'function') return randomSource();

  const source = randomSource?.getRandomValues
    ? randomSource
    : globalThis?.crypto;
  if (source?.getRandomValues) {
    const values = new Uint32Array(1);
    source.getRandomValues(values);
    return values[0];
  }

  return (Date.now() ^ Math.floor((globalThis?.performance?.now?.() || 0) * 1000)) >>> 0;
}

export function generatePlaygroundLayoutSeed(randomSource = null) {
  const generated = Number(getGeneratedSeedValue(randomSource));
  const scaled = generated >= 0 && generated < 1
    ? Math.floor(generated * (PLAYGROUND_CONFIG_BOUNDS.layoutSeed.max + 1))
    : generated;
  return clampNumber(
    scaled,
    PLAYGROUND_CONFIG_BOUNDS.layoutSeed,
    DEFAULT_PLAYGROUND_CONFIG.layoutSeed,
  );
}

export function generateAndApplyPlaygroundLayoutSeed(randomSource = null, options = {}) {
  let layoutSeed = generatePlaygroundLayoutSeed(randomSource);
  if (layoutSeed === currentPlaygroundConfig.layoutSeed) {
    layoutSeed = (layoutSeed + 1) % (PLAYGROUND_CONFIG_BOUNDS.layoutSeed.max + 1);
  }
  return updatePlaygroundConfig({ layoutSeed }, {
    ...options,
    reason: 'new-seed',
  });
}
