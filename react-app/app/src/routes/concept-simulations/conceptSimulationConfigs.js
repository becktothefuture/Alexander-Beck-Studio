export const CONCEPT_SIMULATION_IDS = Object.freeze({
  APERTURE_BLOOM: 'aperture-bloom',
  PRESSURE_MOSAIC: 'pressure-mosaic',
});

export const CONCEPT_SIMULATION_REGISTRY = Object.freeze({
  [CONCEPT_SIMULATION_IDS.APERTURE_BLOOM]: {
    id: CONCEPT_SIMULATION_IDS.APERTURE_BLOOM,
    name: 'Aperture Bloom',
    chapter: 'APERTURE BLOOM',
    path: '/lab/aperture-bloom.html',
    configPath: '/config/aperture-bloom-demo.json',
    ariaLabel: 'A radial circle aperture opening and settling under pointer pressure',
    enabledInRotation: true,
    defaults: {
      version: 1,
      enabled: true,
      rings: 6,
      ringSpacing: 2.85,
      bodyRadius: 9.6,
      mobileRadiusScale: 0.84,
      speed: 0.58,
      openStrength: 0.28,
      twistStrength: 0.52,
      pointerRadius: 260,
      pointerPush: 42,
      titleReserveWidth: 0.6,
      titleReserveHeight: 0.27,
      titleReserveY: 0.5,
      damping: 0.84,
      spring: 0.094,
      maxDpr: 1.5,
      pauseWhenHidden: true,
    },
  },
  [CONCEPT_SIMULATION_IDS.PRESSURE_MOSAIC]: {
    id: CONCEPT_SIMULATION_IDS.PRESSURE_MOSAIC,
    name: 'Pressure Mosaic',
    chapter: 'PRESSURE MOSAIC',
    path: '/lab/pressure-mosaic.html',
    configPath: '/config/pressure-mosaic-demo.json',
    ariaLabel: 'A packed circle mosaic opening temporary pressure gaps around the pointer',
    enabledInRotation: true,
    defaults: {
      version: 1,
      enabled: true,
      bodyRadius: 14.6,
      mobileRadiusScale: 0.84,
      spacing: 3.18,
      pressureStrength: 62,
      pointerRadius: 205,
      breathe: 0.1,
      titleReserveWidth: 0.6,
      titleReserveHeight: 0.27,
      titleReserveY: 0.5,
      damping: 0.8,
      spring: 0.13,
      maxDpr: 1.5,
      pauseWhenHidden: true,
    },
  },
});

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function normalizeConceptSimulationConfig(simulationId, input = {}) {
  const entry = CONCEPT_SIMULATION_REGISTRY[simulationId];
  const defaults = entry?.defaults || {};
  const source = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const next = { ...defaults };

  for (const key of Object.keys(defaults)) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) continue;
    if (typeof defaults[key] === 'boolean') {
      next[key] = Boolean(source[key]);
    } else if (typeof defaults[key] === 'number') {
      next[key] = Number(source[key]);
    } else {
      next[key] = source[key];
    }
  }

  next.version = 1;
  next.bodyRadius = clampNumber(next.bodyRadius, 4, 18, defaults.bodyRadius);
  next.mobileRadiusScale = clampNumber(next.mobileRadiusScale, 0.55, 1.1, defaults.mobileRadiusScale);
  next.pointerRadius = clampNumber(next.pointerRadius, 80, 520, defaults.pointerRadius);
  next.pointerPush = clampNumber(next.pointerPush, 0, 180, defaults.pointerPush || 0);
  next.damping = clampNumber(next.damping, 0.45, 0.96, defaults.damping);
  next.spring = clampNumber(next.spring, 0.03, 0.24, defaults.spring);
  next.maxDpr = clampNumber(next.maxDpr, 0.75, 2, defaults.maxDpr);

  if (simulationId === CONCEPT_SIMULATION_IDS.APERTURE_BLOOM) {
    next.rings = Math.round(clampNumber(next.rings, 3, 9, defaults.rings));
    next.ringSpacing = clampNumber(next.ringSpacing, 2.2, 3.8, defaults.ringSpacing);
    next.speed = clampNumber(next.speed, 0, 1.4, defaults.speed);
    next.openStrength = clampNumber(next.openStrength, 0, 0.55, defaults.openStrength);
    next.twistStrength = clampNumber(next.twistStrength, 0, 1.2, defaults.twistStrength);
    next.titleReserveWidth = clampNumber(next.titleReserveWidth, 0.24, 0.9, defaults.titleReserveWidth);
    next.titleReserveHeight = clampNumber(next.titleReserveHeight, 0.12, 0.42, defaults.titleReserveHeight);
    next.titleReserveY = clampNumber(next.titleReserveY, 0.28, 0.68, defaults.titleReserveY);
  }

  if (simulationId === CONCEPT_SIMULATION_IDS.PRESSURE_MOSAIC) {
    next.spacing = clampNumber(next.spacing, 2.2, 3.4, defaults.spacing);
    next.pressureStrength = clampNumber(next.pressureStrength, 0, 180, defaults.pressureStrength);
    next.breathe = clampNumber(next.breathe, 0, 0.28, defaults.breathe);
    next.titleReserveWidth = clampNumber(next.titleReserveWidth, 0.24, 0.9, defaults.titleReserveWidth);
    next.titleReserveHeight = clampNumber(next.titleReserveHeight, 0.12, 0.42, defaults.titleReserveHeight);
    next.titleReserveY = clampNumber(next.titleReserveY, 0.28, 0.68, defaults.titleReserveY);
  }

  return next;
}
