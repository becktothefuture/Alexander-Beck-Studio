export const TITLE_ENTRANCE_LAB_DEFAULTS = Object.freeze({
  theme: 'light',
  colorCount: 5,
  letterDurationMs: 280,
  overlapPercent: 84,
  lineOverlapMs: 0,
  lineDurationMs: 520,
  descriptionDelayMs: 260,
  descriptionDurationMs: 900,
  descriptionLineStaggerMs: 180,
  movementEnabled: true,
  travelPercent: 10,
});

export const TITLE_ENTRANCE_LAB_CONTROLS = Object.freeze([
  Object.freeze({
    id: 'theme',
    label: 'Theme',
    type: 'select',
    options: Object.freeze([
      Object.freeze({ value: 'light', label: 'Light' }),
      Object.freeze({ value: 'dark', label: 'Dark' }),
    ]),
  }),
  Object.freeze({
    id: 'colorCount',
    label: 'Colour count',
    type: 'range',
    min: 2,
    max: 8,
    step: 1,
  }),
  Object.freeze({
    id: 'letterDurationMs',
    label: 'Letter duration',
    type: 'range',
    min: 120,
    max: 720,
    step: 10,
    unit: 'ms',
    group: 'Timing',
  }),
  Object.freeze({
    id: 'overlapPercent',
    label: 'Letter overlap',
    type: 'range',
    min: 0,
    max: 96,
    step: 1,
    unit: '%',
    group: 'Timing',
  }),
  Object.freeze({
    id: 'lineOverlapMs',
    label: 'Line overlap',
    type: 'range',
    min: 0,
    max: 180,
    step: 10,
    unit: 'ms',
    group: 'Timing',
  }),
  Object.freeze({
    id: 'lineDurationMs',
    label: 'Line duration',
    type: 'range',
    min: 160,
    max: 600,
    step: 10,
    unit: 'ms',
    group: 'Timing',
  }),
  Object.freeze({
    id: 'descriptionDelayMs',
    label: 'Description delay',
    type: 'range',
    min: 0,
    max: 600,
    step: 10,
    unit: 'ms',
    group: 'Timing',
  }),
  Object.freeze({
    id: 'descriptionDurationMs',
    label: 'Fade duration',
    type: 'range',
    min: 160,
    max: 1400,
    step: 10,
    unit: 'ms',
    group: 'Timing',
  }),
  Object.freeze({
    id: 'descriptionLineStaggerMs',
    label: 'Line stagger',
    type: 'range',
    min: 0,
    max: 320,
    step: 10,
    unit: 'ms',
    group: 'Timing',
  }),
  Object.freeze({
    id: 'movementEnabled',
    label: 'Movement',
    type: 'boolean',
    group: 'Movement',
  }),
  Object.freeze({
    id: 'travelPercent',
    label: 'Travel distance',
    type: 'range',
    min: 0,
    max: 12,
    step: 0.5,
    unit: '%',
    group: 'Movement',
  }),
]);

const QUERY_KEYS = Object.freeze({
  theme: 'theme',
  colorCount: 'colors',
  letterDurationMs: 'duration',
  overlapPercent: 'overlap',
  lineOverlapMs: 'lineOverlap',
  lineDurationMs: 'lineDuration',
  descriptionDelayMs: 'descriptionDelay',
  descriptionDurationMs: 'descriptionDuration',
  descriptionLineStaggerMs: 'descriptionStagger',
  movementEnabled: 'movement',
  travelPercent: 'travel',
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function resolveNumber(value, fallback, min, max) {
  if (value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? clamp(parsed, min, max) : fallback;
}

export function resolveTitleEntranceLabConfig(search = '') {
  const params = new URLSearchParams(search);
  return {
    theme: params.get(QUERY_KEYS.theme) === 'dark' ? 'dark' : TITLE_ENTRANCE_LAB_DEFAULTS.theme,
    colorCount: Math.round(resolveNumber(
      params.get(QUERY_KEYS.colorCount),
      TITLE_ENTRANCE_LAB_DEFAULTS.colorCount,
      2,
      8,
    )),
    letterDurationMs: resolveNumber(
      params.get(QUERY_KEYS.letterDurationMs),
      TITLE_ENTRANCE_LAB_DEFAULTS.letterDurationMs,
      120,
      720,
    ),
    overlapPercent: resolveNumber(
      params.get(QUERY_KEYS.overlapPercent),
      TITLE_ENTRANCE_LAB_DEFAULTS.overlapPercent,
      0,
      96,
    ),
    lineOverlapMs: resolveNumber(
      params.get(QUERY_KEYS.lineOverlapMs),
      TITLE_ENTRANCE_LAB_DEFAULTS.lineOverlapMs,
      0,
      180,
    ),
    lineDurationMs: resolveNumber(
      params.get(QUERY_KEYS.lineDurationMs),
      TITLE_ENTRANCE_LAB_DEFAULTS.lineDurationMs,
      160,
      600,
    ),
    descriptionDelayMs: resolveNumber(
      params.get(QUERY_KEYS.descriptionDelayMs),
      TITLE_ENTRANCE_LAB_DEFAULTS.descriptionDelayMs,
      0,
      600,
    ),
    descriptionDurationMs: resolveNumber(
      params.get(QUERY_KEYS.descriptionDurationMs),
      TITLE_ENTRANCE_LAB_DEFAULTS.descriptionDurationMs,
      160,
      1400,
    ),
    descriptionLineStaggerMs: resolveNumber(
      params.get(QUERY_KEYS.descriptionLineStaggerMs),
      TITLE_ENTRANCE_LAB_DEFAULTS.descriptionLineStaggerMs,
      0,
      320,
    ),
    movementEnabled: params.get(QUERY_KEYS.movementEnabled) === null
      ? TITLE_ENTRANCE_LAB_DEFAULTS.movementEnabled
      : params.get(QUERY_KEYS.movementEnabled) !== '0',
    travelPercent: resolveNumber(
      params.get(QUERY_KEYS.travelPercent) ?? params.get('rise'),
      TITLE_ENTRANCE_LAB_DEFAULTS.travelPercent,
      0,
      12,
    ),
  };
}

export function createTitleEntranceLabSearch(config) {
  const params = new URLSearchParams();
  Object.entries(QUERY_KEYS).forEach(([id, key]) => {
    const value = config[id];
    const defaultValue = TITLE_ENTRANCE_LAB_DEFAULTS[id];
    if (value === defaultValue) return;
    params.set(key, typeof value === 'boolean' ? (value ? '1' : '0') : String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : '';
}
