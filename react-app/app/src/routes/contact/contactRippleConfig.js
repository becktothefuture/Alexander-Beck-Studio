export const CONTACT_RIPPLE_CONFIG_EVENT = 'abs:contact-ripple-config';

export const DEFAULT_CONTACT_RIPPLE_CONFIG = Object.freeze({
  minBodyRadius: 8.6,
  maxBodyRadius: 10.4,
  bodyGapScale: 2.3,
  ringGapScale: 4.65,
  innerRingSkipCount: 4,
  innerRingAlpha: 0.06,
  outerRingAlpha: 1,
  idleWaveLength: 128,
  idleWaveSpeed: 0.0003,
  idleSecondarySpeed: 0.00012,
  idleDisplacement: 1.65,
  burstDurationMs: 1650,
  burstFrontCount: 3,
  burstDisplacement: 56,
  burstTravelScale: 1.12,
  burstReleaseStart: 0.72,
  burstTwist: 4.5,
});

export const CONTACT_RIPPLE_CONTROL_GROUPS = Object.freeze([
  {
    title: 'Material',
    initiallyOpen: true,
    controls: [
      { id: 'minBodyRadius', label: 'Min Radius', min: 6, max: 14, step: 0.1, unit: 'px' },
      { id: 'maxBodyRadius', label: 'Max Radius', min: 8, max: 18, step: 0.1, unit: 'px' },
      { id: 'bodyGapScale', label: 'Ball Gap', min: 1.5, max: 3.8, step: 0.05, unit: '×' },
      { id: 'ringGapScale', label: 'Ring Gap', min: 2.5, max: 7, step: 0.05, unit: '×' },
      { id: 'innerRingSkipCount', label: 'Remove Inner Rings', min: 0, max: 12, step: 1, integer: true },
      { id: 'innerRingAlpha', label: 'Inner Opacity', min: 0, max: 0.5, step: 0.01, display: 'percent' },
      { id: 'outerRingAlpha', label: 'Outer Opacity', min: 0.3, max: 1, step: 0.01, display: 'percent' },
    ],
  },
  {
    title: 'Idle Motion',
    initiallyOpen: false,
    controls: [
      { id: 'idleWaveLength', label: 'Wave Length', min: 48, max: 260, step: 1, unit: 'px' },
      { id: 'idleWaveSpeed', label: 'Primary Speed', min: 0.00005, max: 0.001, step: 0.00001, digits: 5 },
      { id: 'idleSecondarySpeed', label: 'Secondary Speed', min: 0, max: 0.0006, step: 0.00001, digits: 5 },
      { id: 'idleDisplacement', label: 'Wave Travel', min: 0, max: 8, step: 0.05, unit: 'px' },
    ],
  },
  {
    title: 'Burst',
    initiallyOpen: false,
    controls: [
      { id: 'burstDurationMs', label: 'Duration', min: 500, max: 4000, step: 25, unit: 'ms', integer: true },
      { id: 'burstFrontCount', label: 'Wave Fronts', min: 1, max: 6, step: 1, integer: true },
      { id: 'burstDisplacement', label: 'Push', min: 0, max: 120, step: 1, unit: 'px' },
      { id: 'burstTravelScale', label: 'Travel', min: 0.5, max: 1.8, step: 0.01, unit: '×' },
      { id: 'burstReleaseStart', label: 'Release Point', min: 0.3, max: 0.95, step: 0.01, display: 'percent' },
      { id: 'burstTwist', label: 'Twist', min: 0, max: 16, step: 0.1, unit: 'px' },
    ],
  },
]);

export const CONTACT_RIPPLE_CONTROL_COUNT = CONTACT_RIPPLE_CONTROL_GROUPS.reduce(
  (total, group) => total + group.controls.length,
  0,
);

function clamp(value, min, max, fallback) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

export function normalizeContactRippleConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const normalized = {};

  for (const group of CONTACT_RIPPLE_CONTROL_GROUPS) {
    for (const control of group.controls) {
      const fallback = DEFAULT_CONTACT_RIPPLE_CONFIG[control.id];
      const value = clamp(source[control.id], control.min, control.max, fallback);
      normalized[control.id] = control.integer ? Math.round(value) : value;
    }
  }

  normalized.maxBodyRadius = Math.max(normalized.minBodyRadius, normalized.maxBodyRadius);
  normalized.outerRingAlpha = Math.max(normalized.innerRingAlpha, normalized.outerRingAlpha);
  return normalized;
}

let currentContactRippleConfig = normalizeContactRippleConfig(DEFAULT_CONTACT_RIPPLE_CONFIG);

export function getContactRippleConfig() {
  return { ...currentContactRippleConfig };
}

export function setContactRippleConfig(input = {}, { emit = true } = {}) {
  currentContactRippleConfig = normalizeContactRippleConfig(input);

  if (typeof window !== 'undefined') {
    window.__ABS_CONTACT_RIPPLE_CONFIG__ = getContactRippleConfig();
    if (emit) {
      window.dispatchEvent(new CustomEvent(CONTACT_RIPPLE_CONFIG_EVENT, {
        detail: { config: getContactRippleConfig() },
      }));
    }
  }

  return getContactRippleConfig();
}

export function buildContactRippleSnapshot() {
  return getContactRippleConfig();
}
