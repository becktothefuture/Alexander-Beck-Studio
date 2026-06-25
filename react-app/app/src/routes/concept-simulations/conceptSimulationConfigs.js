import { isSimulationInDailyRotation } from '../../data/simulationCatalog.js';

export const CONCEPT_SIMULATION_IDS = Object.freeze({
  APERTURE_BLOOM: 'aperture-bloom',
  PRESSURE_MOSAIC: 'pressure-mosaic',
  CONFLUENCE_BRIDGES: 'confluence-bridges',
  NAPOLEON_POINT_CLOUD: 'napoleon-point-cloud',
  SPATIAL_SCAN: 'spatial-scan',
});

export const CONCEPT_SIMULATION_REGISTRY = Object.freeze({
  [CONCEPT_SIMULATION_IDS.APERTURE_BLOOM]: {
    id: CONCEPT_SIMULATION_IDS.APERTURE_BLOOM,
    name: 'Aperture Bloom',
    chapter: 'APERTURE BLOOM',
    path: '/lab/aperture-bloom.html',
    configPath: '/config/aperture-bloom-demo.json',
    ariaLabel: 'A radial circle aperture opening and settling under pointer pressure',
    enabledInRotation: isSimulationInDailyRotation(CONCEPT_SIMULATION_IDS.APERTURE_BLOOM),
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
    enabledInRotation: isSimulationInDailyRotation(CONCEPT_SIMULATION_IDS.PRESSURE_MOSAIC),
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
  [CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES]: {
    id: CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES,
    name: 'Confluence Bridges',
    chapter: 'CONFLUENCE BRIDGES',
    path: '/lab/confluence-bridges.html',
    configPath: '/config/confluence-bridges-demo.json',
    ariaLabel: 'Weighted discipline circles connected by shifting circle bridges',
    enabledInRotation: isSimulationInDailyRotation(CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES),
    defaults: {
      version: 1,
      enabled: true,
      ballCount: 112,
      hubCount: 5,
      colorPalette: 'site-weather',
      bodyRadius: 8.8,
      minRadius: 6.8,
      maxRadius: 11.8,
      mobileRadiusScale: 0.86,
      hubRadiusScale: 1.82,
      interactionStrength: 58,
      dragStrength: 0.38,
      dragRadius: 185,
      damping: 0.84,
      spring: 0.096,
      influenceRadius: 235,
      separationScale: 1.08,
      mobileDensityScale: 0.64,
      animationSpeed: 0.72,
      bridgeArc: 0.28,
      backgroundResponse: 0.1,
      maxDpr: 1.5,
      pauseWhenHidden: true,
    },
  },
  [CONCEPT_SIMULATION_IDS.NAPOLEON_POINT_CLOUD]: {
    id: CONCEPT_SIMULATION_IDS.NAPOLEON_POINT_CLOUD,
    name: 'Napoleon Point Cloud',
    chapter: 'NAPOLEON POINT CLOUD',
    path: '/lab/napoleon-point-cloud.html',
    configPath: '/config/napoleon-point-cloud-demo.json',
    ariaLabel: 'A dot-only surface-sampled point cloud of The bust of Napoleon Bonaparte',
    enabledInRotation: isSimulationInDailyRotation(CONCEPT_SIMULATION_IDS.NAPOLEON_POINT_CLOUD),
    defaults: {
      version: 1,
      enabled: true,
      quality: 'low',
      mobileQuality: 'low',
      pointDensity: 0.28,
      dotSize: 23.4,
      dotOpacity: 0.94,
      colourMode: 'surface-bands',
      autoRotate: true,
      rotationSpeed: 0.085,
      interactionStrength: 0.72,
      spread: 0.045,
      focus: 1,
      breathingMotion: 0.42,
      maxDpr: 1.5,
      pauseWhenHidden: true,
    },
  },
  [CONCEPT_SIMULATION_IDS.SPATIAL_SCAN]: {
    id: CONCEPT_SIMULATION_IDS.SPATIAL_SCAN,
    name: 'Spatial Scan',
    chapter: 'SPATIAL SCAN',
    path: '/lab/spatial-scan.html',
    configPath: '/config/spatial-scan-demo.json',
    ariaLabel: 'A flat-circle point-cloud scan route with a baked camera path',
    enabledInRotation: isSimulationInDailyRotation(CONCEPT_SIMULATION_IDS.SPATIAL_SCAN),
    defaults: {
      version: 1,
      enabled: true,
      quality: 'medium',
      mobileQuality: 'low',
      pointDensity: 0.74,
      dotSize: 5.8,
      dotOpacity: 0.92,
      colourMode: 'surface-bands',
      cameraMode: 'loop',
      loopDuration: 18,
      scrollSmoothing: 0.12,
      interactionStrength: 0.42,
      erosionStrength: 0.04,
      spread: 0.025,
      breathingMotion: 0.16,
      maxDpr: 1.4,
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

  if (simulationId === CONCEPT_SIMULATION_IDS.CONFLUENCE_BRIDGES) {
    next.ballCount = Math.round(clampNumber(next.ballCount, 36, 180, defaults.ballCount));
    next.hubCount = Math.round(clampNumber(next.hubCount, 3, 7, defaults.hubCount));
    next.minRadius = clampNumber(next.minRadius, 4, 13, defaults.minRadius);
    next.maxRadius = clampNumber(next.maxRadius, next.minRadius + 0.8, 18, defaults.maxRadius);
    next.hubRadiusScale = clampNumber(next.hubRadiusScale, 1.15, 2.45, defaults.hubRadiusScale);
    next.interactionStrength = clampNumber(next.interactionStrength, 0, 150, defaults.interactionStrength);
    next.dragStrength = clampNumber(next.dragStrength, 0.1, 0.8, defaults.dragStrength);
    next.dragRadius = clampNumber(next.dragRadius, 80, 360, defaults.dragRadius);
    next.influenceRadius = clampNumber(next.influenceRadius, 90, 420, defaults.influenceRadius);
    next.separationScale = clampNumber(next.separationScale, 0.95, 1.32, defaults.separationScale);
    next.mobileDensityScale = clampNumber(next.mobileDensityScale, 0.36, 1, defaults.mobileDensityScale);
    next.animationSpeed = clampNumber(next.animationSpeed, 0, 1.4, defaults.animationSpeed);
    next.bridgeArc = clampNumber(next.bridgeArc, 0, 0.62, defaults.bridgeArc);
    next.backgroundResponse = clampNumber(next.backgroundResponse, 0, 0.28, defaults.backgroundResponse);
    next.colorPalette = String(next.colorPalette || defaults.colorPalette);
  }

  if (simulationId === CONCEPT_SIMULATION_IDS.NAPOLEON_POINT_CLOUD) {
    next.quality = ['low', 'medium', 'high'].includes(next.quality) ? next.quality : defaults.quality;
    next.mobileQuality = ['low', 'medium', 'high'].includes(next.mobileQuality) ? next.mobileQuality : defaults.mobileQuality;
    next.pointDensity = clampNumber(next.pointDensity, 0.12, 1, defaults.pointDensity);
    next.dotSize = clampNumber(next.dotSize, 4, 50, defaults.dotSize);
    next.dotOpacity = clampNumber(next.dotOpacity, 0.2, 1, defaults.dotOpacity);
    next.colourMode = ['surface-bands', 'dominant'].includes(next.colourMode) ? next.colourMode : defaults.colourMode;
    next.autoRotate = Boolean(next.autoRotate);
    next.rotationSpeed = clampNumber(next.rotationSpeed, 0, 0.24, defaults.rotationSpeed);
    next.interactionStrength = clampNumber(next.interactionStrength, 0, 1.4, defaults.interactionStrength);
    next.spread = clampNumber(next.spread, 0, 0.18, defaults.spread);
    next.focus = clampNumber(next.focus, 0.72, 1.35, defaults.focus);
    next.breathingMotion = clampNumber(next.breathingMotion, 0, 0.9, defaults.breathingMotion);
  }

  if (simulationId === CONCEPT_SIMULATION_IDS.SPATIAL_SCAN) {
    next.quality = ['low', 'medium', 'high'].includes(next.quality) ? next.quality : defaults.quality;
    next.mobileQuality = ['low', 'medium', 'high'].includes(next.mobileQuality) ? next.mobileQuality : defaults.mobileQuality;
    next.pointDensity = clampNumber(next.pointDensity, 0.08, 1, defaults.pointDensity);
    next.dotSize = clampNumber(next.dotSize, 3, 42, defaults.dotSize);
    next.dotOpacity = clampNumber(next.dotOpacity, 0.18, 1, defaults.dotOpacity);
    next.colourMode = ['surface-bands', 'dominant'].includes(next.colourMode) ? next.colourMode : defaults.colourMode;
    next.cameraMode = ['loop', 'scroll', 'orbit'].includes(next.cameraMode) ? next.cameraMode : defaults.cameraMode;
    next.loopDuration = clampNumber(next.loopDuration, 6, 60, defaults.loopDuration);
    next.scrollSmoothing = clampNumber(next.scrollSmoothing, 0.02, 0.42, defaults.scrollSmoothing);
    next.interactionStrength = clampNumber(next.interactionStrength, 0, 1.4, defaults.interactionStrength);
    next.erosionStrength = clampNumber(next.erosionStrength, 0, 0.72, defaults.erosionStrength);
    next.spread = clampNumber(next.spread, 0, 0.24, defaults.spread);
    next.breathingMotion = clampNumber(next.breathingMotion, 0, 0.9, defaults.breathingMotion);
  }

  return next;
}
