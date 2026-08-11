import {
  applyLayoutCSSVars,
  applyLayoutFromVwToPx,
  getGlobals,
} from '../core/state.js';
import {
  applyShellLayoutVars,
  getShellRouteTransitionConfig,
  patchShellLayout,
  patchShellMotion,
  patchShellSurface,
  syncShellToDocument,
} from '../visual/site-shell.js';
import { resize } from '../rendering/renderer.js';

export const DEFAULT_STUDIO_SURFACE_CONFIG = {
  scriptMaxWidth: 431,
  scriptPaddingX: 0,
  scriptPaddingY: 0,
  quoteButtonSize: 224,
  quotePaddingX: 28,
  quotePaddingY: 24,
  routeTitleDescriptionGap: 16,
  edgeCaptionDistanceMin: 8,
  edgeCaptionDistanceMax: 48,
  frameInsetMobilePx: 10,
  frameInsetDesktopPx: 16,
  frameRadiusMobilePx: 32,
  frameRadiusDesktopPx: 72,
  innerWallRimSize: 8,
  innerWallRimBlur: 18,
  innerWallRimOpacityLight: 0.16,
  innerWallRimOpacityDark: 0.07,
  outerWallGlowNearSize: 0,
  outerWallGlowNearBlur: 14,
  outerWallGlowNearOpacityLight: 0.18,
  outerWallGlowNearOpacityDark: 0.055,
  outerWallGlowFarSize: 8,
  outerWallGlowFarBlur: 48,
  outerWallGlowFarSizeMobile: 4,
  outerWallGlowFarBlurMobile: 10,
  outerWallGlowFarOpacityLight: 0.055,
  outerWallGlowFarOpacityDark: 0.018,
  menuEdgeNearSize: 0,
  menuEdgeNearBlur: 14,
  menuEdgeNearShift: 0,
  menuEdgeNearOpacityLight: 0.18,
  menuEdgeNearOpacityDark: 0.055,
  menuEdgeFarSize: 8,
  menuEdgeFarBlur: 48,
  menuEdgeFarShift: 0,
  menuEdgeFarOpacityLight: 0.055,
  menuEdgeFarOpacityDark: 0.018,
  materialDurationMs: 1200,
  materialStaggerMs: 720,
  materialDelayMs: 80,
  typographyDelayMs: 1100,
  routeBookendDurationMs: 196,
  materialExitDurationMs: 140,
  materialExitStaggerMs: 70,
  typographyExitDurationMs: 100,
  cardTravelPx: 16,
  cardTiltDeg: 1.2,
};

const SHELL_OBJECT_CONTROL_SECTIONS = [
  {
    key: 'routeEntrance',
    title: 'View Entrances',
    icon: '🎬',
    defaultOpen: true,
    controls: [
      { id: 'materialDurationMs', label: 'Scene Grow', min: 300, max: 1800, step: 10, unit: 'ms' },
      { id: 'materialStaggerMs', label: 'Scene Cascade', min: 0, max: 1200, step: 10, unit: 'ms' },
      { id: 'materialDelayMs', label: 'Scene Delay', min: 0, max: 600, step: 10, unit: 'ms' },
      { id: 'typographyDelayMs', label: 'Type Start', min: 200, max: 1800, step: 10, unit: 'ms' },
      { id: 'routeBookendDurationMs', label: 'Title Reveal', min: 120, max: 1200, step: 10, unit: 'ms' },
      { id: 'materialExitDurationMs', label: 'Circle Exit', min: 60, max: 500, step: 10, unit: 'ms' },
      { id: 'materialExitStaggerMs', label: 'Exit Cascade', min: 0, max: 300, step: 10, unit: 'ms' },
      { id: 'typographyExitDurationMs', label: 'Type Exit', min: 40, max: 400, step: 10, unit: 'ms' },
      { id: 'cardTravelPx', label: 'Card Lift', min: 0, max: 48, step: 1, unit: 'px' },
      { id: 'cardTiltDeg', label: 'Card Tilt', min: 0, max: 4, step: 0.1, unit: '°' },
    ],
  },
  {
    key: 'frame',
    title: 'Wall Shape',
    icon: '📐',
    defaultOpen: true,
    controls: [
      { id: 'frameInsetMobilePx', label: 'Mobile Size', min: 4, max: 32, step: 1, unit: 'px' },
      { id: 'frameInsetDesktopPx', label: 'Desktop Size', min: 8, max: 48, step: 1, unit: 'px' },
      { id: 'frameRadiusMobilePx', label: 'Mobile Radius', min: 16, max: 64, step: 1, unit: 'px' },
      { id: 'frameRadiusDesktopPx', label: 'Desktop Radius', min: 32, max: 120, step: 1, unit: 'px' },
    ],
  },
  {
    key: 'wallEdge',
    title: 'Inner Window Edge',
    icon: '✦',
    defaultOpen: true,
    controls: [
      { id: 'innerWallRimSize', label: 'Edge Size', min: 0, max: 64, step: 1, unit: 'px' },
      { id: 'innerWallRimBlur', label: 'Softness', min: 0, max: 160, step: 1, unit: 'px' },
      { id: 'innerWallRimOpacityLight', label: 'Light Strength', min: 0, max: 1, step: 0.01, format: (value) => `${Math.round(value * 100)}%` },
      { id: 'innerWallRimOpacityDark', label: 'Dark Strength', min: 0, max: 1, step: 0.01, format: (value) => `${Math.round(value * 100)}%` },
    ],
  },
  {
    key: 'outerWallGlow',
    title: 'Outer Wall Glow',
    icon: '✧',
    defaultOpen: true,
    controls: [
      { id: 'outerWallGlowNearSize', label: 'Near Size', min: 0, max: 48, step: 1, unit: 'px' },
      { id: 'outerWallGlowNearBlur', label: 'Near Softness', min: 0, max: 160, step: 1, unit: 'px' },
      { id: 'outerWallGlowNearOpacityLight', label: 'Near Light', min: 0, max: 1, step: 0.001, format: (value) => `${Number((value * 100).toFixed(1))}%` },
      { id: 'outerWallGlowNearOpacityDark', label: 'Near Dark', min: 0, max: 1, step: 0.001, format: (value) => `${Number((value * 100).toFixed(1))}%` },
      { id: 'outerWallGlowFarSize', label: 'Far Size', min: 0, max: 96, step: 1, unit: 'px' },
      { id: 'outerWallGlowFarBlur', label: 'Far Softness', min: 0, max: 240, step: 1, unit: 'px' },
      { id: 'outerWallGlowFarSizeMobile', label: 'Far Mobile Size', min: 0, max: 48, step: 1, unit: 'px' },
      { id: 'outerWallGlowFarBlurMobile', label: 'Far Mobile Softness', min: 0, max: 160, step: 1, unit: 'px' },
      { id: 'outerWallGlowFarOpacityLight', label: 'Far Light', min: 0, max: 1, step: 0.001, format: (value) => `${Number((value * 100).toFixed(1))}%` },
      { id: 'outerWallGlowFarOpacityDark', label: 'Far Dark', min: 0, max: 1, step: 0.001, format: (value) => `${Number((value * 100).toFixed(1))}%` },
    ],
  },
  {
    key: 'menuEdge',
    title: 'Menu Inner Edge',
    icon: '▰',
    defaultOpen: true,
    controls: [
      { id: 'menuEdgeNearSize', label: 'Near Size', min: 0, max: 48, step: 1, unit: 'px' },
      { id: 'menuEdgeNearBlur', label: 'Near Softness', min: 0, max: 160, step: 1, unit: 'px' },
      { id: 'menuEdgeNearShift', label: 'Near Shift', min: -208, max: 208, step: 1, unit: 'px' },
      { id: 'menuEdgeNearOpacityLight', label: 'Near Light', min: 0, max: 1, step: 0.001, format: (value) => `${Number((value * 100).toFixed(1))}%` },
      { id: 'menuEdgeNearOpacityDark', label: 'Near Dark', min: 0, max: 1, step: 0.001, format: (value) => `${Number((value * 100).toFixed(1))}%` },
      { id: 'menuEdgeFarSize', label: 'Far Size', min: 0, max: 96, step: 1, unit: 'px' },
      { id: 'menuEdgeFarBlur', label: 'Far Softness', min: 0, max: 240, step: 1, unit: 'px' },
      { id: 'menuEdgeFarShift', label: 'Far Shift', min: -336, max: 336, step: 1, unit: 'px' },
      { id: 'menuEdgeFarOpacityLight', label: 'Far Light', min: 0, max: 1, step: 0.001, format: (value) => `${Number((value * 100).toFixed(1))}%` },
      { id: 'menuEdgeFarOpacityDark', label: 'Far Dark', min: 0, max: 1, step: 0.001, format: (value) => `${Number((value * 100).toFixed(1))}%` },
    ],
  },
  {
    key: 'quoteSystem',
    title: 'Shell Elements',
    icon: '💬',
    defaultOpen: false,
    controls: [
      { id: 'scriptMaxWidth', label: 'Script Width', min: 240, max: 520, step: 4, unit: 'px' },
      { id: 'scriptPaddingX', label: 'Script Pad X', min: 0, max: 32, step: 1, unit: 'px' },
      { id: 'scriptPaddingY', label: 'Script Pad Y', min: 0, max: 24, step: 1, unit: 'px' },
      { id: 'routeTitleDescriptionGap', label: 'Title / Copy Gap', min: 4, max: 40, step: 1, unit: 'px' },
      { id: 'edgeCaptionDistanceMin', label: 'Caption Near', min: 0, max: 24, step: 1, unit: 'px' },
      { id: 'edgeCaptionDistanceMax', label: 'Caption Far', min: 24, max: 80, step: 1, unit: 'px' },
    ],
  },
  {
    key: 'puck',
    title: 'Quote Puck',
    icon: '🔘',
    defaultOpen: true,
    prependHTML: '', // Injected by panel-dock (puck color controls)
    controls: [
      { id: 'quoteButtonSize', label: 'Size', min: 120, max: 400, step: 4, unit: 'px' },
      { id: 'quotePaddingX', label: 'Pad X', min: 8, max: 48, step: 1, unit: 'px' },
      { id: 'quotePaddingY', label: 'Pad Y', min: 6, max: 40, step: 1, unit: 'px' },
    ],
  },
];

const ALL_CONTROL_SECTIONS = SHELL_OBJECT_CONTROL_SECTIONS;

const OBSOLETE_SURFACE_KEYS = [
  'sceneHighlight',
  'contrastVeilOpacityLight',
  'contrastVeilOpacityDark',
  'contrastVeilReachX',
  'contrastVeilReachY',
  'contrastVeilBlurVmax',
  'contrastVeilDitherOpacity',
  'contrastVeilDitherSize',
  'edgeWidth',
  'fillOpacityLight',
  'fillOpacityDark',
  'edgeOpacityLight',
  'edgeOpacityDark',
  'innerShadowOpacityLight',
  'innerShadowOpacityDark',
  'shadowOpacityLight',
  'shadowOpacityDark',
  'glowOpacityLight',
  'glowOpacityDark',
  'lightEdgeInset',
  'lightEdgeBlur',
  'lightEdgeTopOpacityLight',
  'lightEdgeTopOpacityDark',
  'lightEdgeBottomOpacityLight',
  'lightEdgeBottomOpacityDark',
  'innerWallRimWidth',
  'innerWallRimBottomOpacityLight',
  'innerWallRimBottomOpacityDark',
  'innerWallRimSideOpacityLight',
  'innerWallRimSideOpacityDark',
  'innerWallRimTopShadowOpacityLight',
  'innerWallRimTopShadowOpacityDark',
];

const OBSOLETE_THEME_KEYS = [
  'frameBorderEdgeOpacity',
  'frameBorderMidOpacity',
];

const OBSOLETE_RUNTIME_KEYS = [
  'hoverEdgeEnabled',
  'hoverEdgeWidth',
  'hoverEdgeBottomEnabled',
  'hoverEdgeBottomOpacity',
  'hoverEdgeTopEnabled',
  'hoverEdgeTopOpacity',
  'frameBorderGradientEdgeOpacity',
  'frameBorderGradientMidOpacity',
  'innerWallGradientEdgeTopOpacity',
  'innerWallGradientEdgeTopShadowOpacity',
  'innerWallGradientEdgeWidth',
  'simulationContrastVeilOpacityLight',
  'simulationContrastVeilOpacityDark',
  'simulationContrastVeilReachX',
  'simulationContrastVeilReachY',
  'simulationContrastVeilBlurVmax',
  'simulationContrastVeilDitherOpacity',
  'simulationContrastVeilDitherSize',
];

function clamp(value, min, max, fallback) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.min(max, Math.max(min, numeric));
}

function readNumber(rootStyle, name, fallback) {
  try {
    const raw = rootStyle.getPropertyValue(name).trim();
    const numeric = Number.parseFloat(raw);
    return Number.isFinite(numeric) ? numeric : fallback;
  } catch (e) {
    return fallback;
  }
}

function readCurrentConfig() {
  const rootStyle = getComputedStyle(document.documentElement);
  const routeTransition = getShellRouteTransitionConfig();

  return {
    scriptMaxWidth: readNumber(rootStyle, '--decorative-script-max-width', DEFAULT_STUDIO_SURFACE_CONFIG.scriptMaxWidth),
    scriptPaddingX: readNumber(rootStyle, '--decorative-script-padding-left', DEFAULT_STUDIO_SURFACE_CONFIG.scriptPaddingX),
    scriptPaddingY: readNumber(rootStyle, '--decorative-script-padding-vertical', DEFAULT_STUDIO_SURFACE_CONFIG.scriptPaddingY),
    quoteButtonSize: readNumber(rootStyle, '--abs-quote-button-size', DEFAULT_STUDIO_SURFACE_CONFIG.quoteButtonSize),
    quotePaddingX: readNumber(rootStyle, '--abs-quote-pad-x', DEFAULT_STUDIO_SURFACE_CONFIG.quotePaddingX),
    quotePaddingY: readNumber(rootStyle, '--abs-quote-pad-y', DEFAULT_STUDIO_SURFACE_CONFIG.quotePaddingY),
    routeTitleDescriptionGap: readNumber(rootStyle, '--route-title-description-gap', DEFAULT_STUDIO_SURFACE_CONFIG.routeTitleDescriptionGap),
    edgeCaptionDistanceMin: readNumber(rootStyle, '--edge-caption-distance-min', DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMin),
    edgeCaptionDistanceMax: readNumber(rootStyle, '--edge-caption-distance-max', DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMax),
    frameInsetMobilePx: (() => {
      const g = getGlobals();
      const v = g?.frameInsetMobilePx;
      return Number.isFinite(v) && v >= 0 ? v : DEFAULT_STUDIO_SURFACE_CONFIG.frameInsetMobilePx;
    })(),
    frameInsetDesktopPx: (() => {
      const g = getGlobals();
      const v = g?.frameInsetDesktopPx;
      return Number.isFinite(v) && v >= 0 ? v : DEFAULT_STUDIO_SURFACE_CONFIG.frameInsetDesktopPx;
    })(),
    frameRadiusMobilePx: (() => {
      const g = getGlobals();
      const v = g?.frameRadiusMobilePx;
      return Number.isFinite(v) && v >= 0 ? v : DEFAULT_STUDIO_SURFACE_CONFIG.frameRadiusMobilePx;
    })(),
    frameRadiusDesktopPx: (() => {
      const g = getGlobals();
      const v = g?.frameRadiusDesktopPx;
      return Number.isFinite(v) && v >= 0 ? v : DEFAULT_STUDIO_SURFACE_CONFIG.frameRadiusDesktopPx;
    })(),
    innerWallRimSize: readNumber(rootStyle, '--inner-wall-rim-size', DEFAULT_STUDIO_SURFACE_CONFIG.innerWallRimSize),
    innerWallRimBlur: readNumber(rootStyle, '--inner-wall-rim-blur', DEFAULT_STUDIO_SURFACE_CONFIG.innerWallRimBlur),
    innerWallRimOpacityLight: readNumber(rootStyle, '--inner-wall-rim-opacity-light', DEFAULT_STUDIO_SURFACE_CONFIG.innerWallRimOpacityLight),
    innerWallRimOpacityDark: readNumber(rootStyle, '--inner-wall-rim-opacity-dark', DEFAULT_STUDIO_SURFACE_CONFIG.innerWallRimOpacityDark),
    outerWallGlowNearSize: readNumber(rootStyle, '--outer-wall-glow-near-size', DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowNearSize),
    outerWallGlowNearBlur: readNumber(rootStyle, '--outer-wall-glow-near-blur', DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowNearBlur),
    outerWallGlowNearOpacityLight: readNumber(rootStyle, '--outer-wall-glow-near-opacity-light', DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowNearOpacityLight),
    outerWallGlowNearOpacityDark: readNumber(rootStyle, '--outer-wall-glow-near-opacity-dark', DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowNearOpacityDark),
    outerWallGlowFarSize: readNumber(rootStyle, '--outer-wall-glow-far-size', DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarSize),
    outerWallGlowFarBlur: readNumber(rootStyle, '--outer-wall-glow-far-blur', DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarBlur),
    outerWallGlowFarSizeMobile: readNumber(rootStyle, '--outer-wall-glow-far-size-mobile', DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarSizeMobile),
    outerWallGlowFarBlurMobile: readNumber(rootStyle, '--outer-wall-glow-far-blur-mobile', DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarBlurMobile),
    outerWallGlowFarOpacityLight: readNumber(rootStyle, '--outer-wall-glow-far-opacity-light', DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarOpacityLight),
    outerWallGlowFarOpacityDark: readNumber(rootStyle, '--outer-wall-glow-far-opacity-dark', DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarOpacityDark),
    menuEdgeNearSize: readNumber(rootStyle, '--menu-edge-near-size', DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearSize),
    menuEdgeNearBlur: readNumber(rootStyle, '--menu-edge-near-blur', DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearBlur),
    menuEdgeNearShift: readNumber(rootStyle, '--menu-edge-near-shift', DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearShift),
    menuEdgeNearOpacityLight: readNumber(rootStyle, '--menu-edge-near-opacity-light', DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearOpacityLight),
    menuEdgeNearOpacityDark: readNumber(rootStyle, '--menu-edge-near-opacity-dark', DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearOpacityDark),
    menuEdgeFarSize: readNumber(rootStyle, '--menu-edge-far-size', DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarSize),
    menuEdgeFarBlur: readNumber(rootStyle, '--menu-edge-far-blur', DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarBlur),
    menuEdgeFarShift: readNumber(rootStyle, '--menu-edge-far-shift', DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarShift),
    menuEdgeFarOpacityLight: readNumber(rootStyle, '--menu-edge-far-opacity-light', DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarOpacityLight),
    menuEdgeFarOpacityDark: readNumber(rootStyle, '--menu-edge-far-opacity-dark', DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarOpacityDark),
    materialDurationMs: routeTransition.materialDurationMs,
    materialStaggerMs: routeTransition.materialStaggerMs,
    materialDelayMs: routeTransition.materialDelayMs,
    typographyDelayMs: routeTransition.typographyDelayMs,
    routeBookendDurationMs: routeTransition.routeBookendDurationMs,
    materialExitDurationMs: routeTransition.materialExitDurationMs,
    materialExitStaggerMs: routeTransition.materialExitStaggerMs,
    typographyExitDurationMs: routeTransition.typographyExitDurationMs,
    cardTravelPx: routeTransition.cardTravelPx,
    cardTiltDeg: routeTransition.cardTiltDeg,
  };
}

function normalizeResponsiveEndpoints(config, {
  mobileId,
  desktopId,
  mobileMin,
  mobileMax,
  desktopMin,
  desktopMax,
  changedId = null,
}) {
  let mobile = Math.round(clamp(config[mobileId], mobileMin, mobileMax, DEFAULT_STUDIO_SURFACE_CONFIG[mobileId]));
  let desktop = Math.round(clamp(config[desktopId], desktopMin, desktopMax, DEFAULT_STUDIO_SURFACE_CONFIG[desktopId]));

  if (mobile > desktop) {
    if (changedId === mobileId) mobile = desktop;
    else desktop = mobile;
  }

  config[mobileId] = mobile;
  config[desktopId] = desktop;
  return { mobile, desktop };
}

function normalizeFrameInsetEndpoints(config, changedId = null) {
  return normalizeResponsiveEndpoints(config, {
    mobileId: 'frameInsetMobilePx',
    desktopId: 'frameInsetDesktopPx',
    mobileMin: 4,
    mobileMax: 32,
    desktopMin: 8,
    desktopMax: 48,
    changedId,
  });
}

function normalizeFrameRadiusEndpoints(config, changedId = null) {
  return normalizeResponsiveEndpoints(config, {
    mobileId: 'frameRadiusMobilePx',
    desktopId: 'frameRadiusDesktopPx',
    mobileMin: 16,
    mobileMax: 64,
    desktopMin: 32,
    desktopMax: 120,
    changedId,
  });
}

function formatValue(control, value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return String(value ?? '');
  if (typeof control.format === 'function') return control.format(numeric);
  if (!control.unit) return numeric.toFixed(control.step < 0.01 ? 3 : 2).replace(/\.00$/, '');
  return `${numeric.toFixed(control.step < 1 ? 1 : 0).replace(/\.0$/, '')}${control.unit}`;
}

function syncStudioRuntimeState(config) {
  const globals = getGlobals();
  if (!globals || typeof globals !== 'object') return;

  globals.edgeCaptionDistanceMinPx = Math.round(config.edgeCaptionDistanceMin);
  globals.edgeCaptionDistanceMaxPx = Math.round(config.edgeCaptionDistanceMax);

  applyLayoutCSSVars();
}

export function applyStudioSurfaceConfig(config, { refreshGeometry = false } = {}) {
  const root = document.documentElement;
  const scriptMaxWidth = clamp(config.scriptMaxWidth, 240, 520, DEFAULT_STUDIO_SURFACE_CONFIG.scriptMaxWidth);
  const scriptPaddingX = clamp(config.scriptPaddingX, 0, 32, DEFAULT_STUDIO_SURFACE_CONFIG.scriptPaddingX);
  const scriptPaddingY = clamp(config.scriptPaddingY, 0, 24, DEFAULT_STUDIO_SURFACE_CONFIG.scriptPaddingY);
  const quoteButtonSize = clamp(config.quoteButtonSize, 120, 400, DEFAULT_STUDIO_SURFACE_CONFIG.quoteButtonSize);
  const quotePaddingX = clamp(config.quotePaddingX, 8, 48, DEFAULT_STUDIO_SURFACE_CONFIG.quotePaddingX);
  const quotePaddingY = clamp(config.quotePaddingY, 6, 40, DEFAULT_STUDIO_SURFACE_CONFIG.quotePaddingY);
  const routeTitleDescriptionGap = clamp(config.routeTitleDescriptionGap, 4, 40, DEFAULT_STUDIO_SURFACE_CONFIG.routeTitleDescriptionGap);
  const edgeCaptionDistanceMin = clamp(config.edgeCaptionDistanceMin, 0, 24, DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMin);
  const edgeCaptionDistanceMax = clamp(config.edgeCaptionDistanceMax, 24, 80, DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMax);
  const frameInset = normalizeFrameInsetEndpoints(config);
  const frameRadius = normalizeFrameRadiusEndpoints(config);
  const innerWallRimSize = Math.round(clamp(config.innerWallRimSize, 0, 64, DEFAULT_STUDIO_SURFACE_CONFIG.innerWallRimSize));
  const innerWallRimBlur = Math.round(clamp(config.innerWallRimBlur, 0, 160, DEFAULT_STUDIO_SURFACE_CONFIG.innerWallRimBlur));
  const innerWallRimOpacityLight = clamp(config.innerWallRimOpacityLight, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.innerWallRimOpacityLight);
  const innerWallRimOpacityDark = clamp(config.innerWallRimOpacityDark, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.innerWallRimOpacityDark);
  const outerWallGlowNearSize = Math.round(clamp(config.outerWallGlowNearSize, 0, 48, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowNearSize));
  const outerWallGlowNearBlur = Math.round(clamp(config.outerWallGlowNearBlur, 0, 160, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowNearBlur));
  const outerWallGlowNearOpacityLight = clamp(config.outerWallGlowNearOpacityLight, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowNearOpacityLight);
  const outerWallGlowNearOpacityDark = clamp(config.outerWallGlowNearOpacityDark, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowNearOpacityDark);
  const outerWallGlowFarSize = Math.round(clamp(config.outerWallGlowFarSize, 0, 96, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarSize));
  const outerWallGlowFarBlur = Math.round(clamp(config.outerWallGlowFarBlur, 0, 240, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarBlur));
  const outerWallGlowFarSizeMobile = Math.round(clamp(config.outerWallGlowFarSizeMobile, 0, 48, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarSizeMobile));
  const outerWallGlowFarBlurMobile = Math.round(clamp(config.outerWallGlowFarBlurMobile, 0, 160, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarBlurMobile));
  const outerWallGlowFarOpacityLight = clamp(config.outerWallGlowFarOpacityLight, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarOpacityLight);
  const outerWallGlowFarOpacityDark = clamp(config.outerWallGlowFarOpacityDark, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarOpacityDark);
  const menuEdgeNearSize = Math.round(clamp(config.menuEdgeNearSize, 0, 48, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearSize));
  const menuEdgeNearBlur = Math.round(clamp(config.menuEdgeNearBlur, 0, 160, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearBlur));
  const menuEdgeNearShift = Math.round(clamp(config.menuEdgeNearShift, -208, 208, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearShift));
  const menuEdgeNearOpacityLight = clamp(config.menuEdgeNearOpacityLight, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearOpacityLight);
  const menuEdgeNearOpacityDark = clamp(config.menuEdgeNearOpacityDark, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearOpacityDark);
  const menuEdgeFarSize = Math.round(clamp(config.menuEdgeFarSize, 0, 96, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarSize));
  const menuEdgeFarBlur = Math.round(clamp(config.menuEdgeFarBlur, 0, 240, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarBlur));
  const menuEdgeFarShift = Math.round(clamp(config.menuEdgeFarShift, -336, 336, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarShift));
  const menuEdgeFarOpacityLight = clamp(config.menuEdgeFarOpacityLight, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarOpacityLight);
  const menuEdgeFarOpacityDark = clamp(config.menuEdgeFarOpacityDark, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarOpacityDark);
  const materialDurationMs = Math.round(clamp(config.materialDurationMs, 300, 1800, DEFAULT_STUDIO_SURFACE_CONFIG.materialDurationMs));
  const materialStaggerMs = Math.round(clamp(config.materialStaggerMs, 0, 1200, DEFAULT_STUDIO_SURFACE_CONFIG.materialStaggerMs));
  const materialDelayMs = Math.round(clamp(config.materialDelayMs, 0, 600, DEFAULT_STUDIO_SURFACE_CONFIG.materialDelayMs));
  const typographyDelayMs = Math.round(clamp(config.typographyDelayMs, 200, 1800, DEFAULT_STUDIO_SURFACE_CONFIG.typographyDelayMs));
  const routeBookendDurationMs = Math.round(clamp(config.routeBookendDurationMs, 120, 1200, DEFAULT_STUDIO_SURFACE_CONFIG.routeBookendDurationMs));
  const materialExitDurationMs = Math.round(clamp(config.materialExitDurationMs, 60, 500, DEFAULT_STUDIO_SURFACE_CONFIG.materialExitDurationMs));
  const materialExitStaggerMs = Math.round(clamp(config.materialExitStaggerMs, 0, 300, DEFAULT_STUDIO_SURFACE_CONFIG.materialExitStaggerMs));
  const typographyExitDurationMs = Math.round(clamp(config.typographyExitDurationMs, 40, 400, DEFAULT_STUDIO_SURFACE_CONFIG.typographyExitDurationMs));
  const cardTravelPx = clamp(config.cardTravelPx, 0, 48, DEFAULT_STUDIO_SURFACE_CONFIG.cardTravelPx);
  const cardTiltDeg = clamp(config.cardTiltDeg, 0, 4, DEFAULT_STUDIO_SURFACE_CONFIG.cardTiltDeg);

  syncStudioRuntimeState({
    edgeCaptionDistanceMin,
    edgeCaptionDistanceMax,
  });

  const studioSurfaceSnapshot = {
    scriptMaxWidth,
    scriptPaddingX,
    scriptPaddingY,
    quoteButtonSize,
    quotePaddingX,
    quotePaddingY,
    routeTitleDescriptionGap,
    edgeCaptionDistanceMin,
    edgeCaptionDistanceMax,
    frameInsetMobilePx: frameInset.mobile,
    frameInsetDesktopPx: frameInset.desktop,
    frameRadiusMobilePx: frameRadius.mobile,
    frameRadiusDesktopPx: frameRadius.desktop,
    innerWallRimSize,
    innerWallRimBlur,
    innerWallRimOpacityLight,
    innerWallRimOpacityDark,
    outerWallGlowNearSize,
    outerWallGlowNearBlur,
    outerWallGlowNearOpacityLight,
    outerWallGlowNearOpacityDark,
    outerWallGlowFarSize,
    outerWallGlowFarBlur,
    outerWallGlowFarSizeMobile,
    outerWallGlowFarBlurMobile,
    outerWallGlowFarOpacityLight,
    outerWallGlowFarOpacityDark,
    menuEdgeNearSize,
    menuEdgeNearBlur,
    menuEdgeNearShift,
    menuEdgeNearOpacityLight,
    menuEdgeNearOpacityDark,
    menuEdgeFarSize,
    menuEdgeFarBlur,
    menuEdgeFarShift,
    menuEdgeFarOpacityLight,
    menuEdgeFarOpacityDark,
    materialDurationMs,
    materialStaggerMs,
    materialDelayMs,
    typographyDelayMs,
    routeBookendDurationMs,
    materialExitDurationMs,
    materialExitStaggerMs,
    typographyExitDurationMs,
    cardTravelPx,
    cardTiltDeg,
  };
  window.__ABS_STUDIO_SURFACE_CONFIG__ = studioSurfaceSnapshot;
  patchShellSurface({
    innerWallRimSize: `${innerWallRimSize}px`,
    innerWallRimBlur: `${innerWallRimBlur}px`,
    innerWallRimOpacityLight,
    innerWallRimOpacityDark,
    outerWallGlowNearSize: `${outerWallGlowNearSize}px`,
    outerWallGlowNearBlur: `${outerWallGlowNearBlur}px`,
    outerWallGlowNearOpacityLight,
    outerWallGlowNearOpacityDark,
    outerWallGlowFarSize: `${outerWallGlowFarSize}px`,
    outerWallGlowFarBlur: `${outerWallGlowFarBlur}px`,
    outerWallGlowFarSizeMobile: `${outerWallGlowFarSizeMobile}px`,
    outerWallGlowFarBlurMobile: `${outerWallGlowFarBlurMobile}px`,
    outerWallGlowFarOpacityLight,
    outerWallGlowFarOpacityDark,
    menuEdgeNearSize: `${menuEdgeNearSize}px`,
    menuEdgeNearBlur: `${menuEdgeNearBlur}px`,
    menuEdgeNearShift: `${menuEdgeNearShift}px`,
    menuEdgeNearOpacityLight,
    menuEdgeNearOpacityDark,
    menuEdgeFarSize: `${menuEdgeFarSize}px`,
    menuEdgeFarBlur: `${menuEdgeFarBlur}px`,
    menuEdgeFarShift: `${menuEdgeFarShift}px`,
    menuEdgeFarOpacityLight,
    menuEdgeFarOpacityDark,
  });
  syncShellToDocument();

  const g = getGlobals();
  if (g) {
    g.frameInsetMobilePx = frameInset.mobile;
    g.frameInsetDesktopPx = frameInset.desktop;
    g.frameRadiusMobilePx = frameRadius.mobile;
    g.frameRadiusDesktopPx = frameRadius.desktop;
    patchShellLayout({
      frameInsetMobile: `${frameInset.mobile}px`,
      frameInsetDesktop: `${frameInset.desktop}px`,
      frameRadiusMobile: `${frameRadius.mobile}px`,
      frameRadiusDesktop: `${frameRadius.desktop}px`,
      routeTitleDescriptionGap: `${routeTitleDescriptionGap}px`,
    });
    patchShellMotion({
      routeTransition: {
        materialDurationMs,
        materialStaggerMs,
        materialDelayMs,
        typographyDelayMs,
        routeBookendDurationMs,
        materialExitDurationMs,
        materialExitStaggerMs,
        typographyExitDurationMs,
        cardTravelPx,
        cardTiltDeg,
      },
    });
    applyShellLayoutVars();
    applyLayoutFromVwToPx();
    applyLayoutCSSVars();
    if (refreshGeometry) resize();
  }

  root.style.setProperty('--decorative-script-max-width', `${scriptMaxWidth}px`);
  root.style.setProperty('--decorative-script-padding-left', `${scriptPaddingX}px`);
  root.style.setProperty('--decorative-script-padding-vertical', `${scriptPaddingY}px`);
  root.style.setProperty('--abs-quote-button-size', `${quoteButtonSize}px`);
  root.style.setProperty('--abs-quote-pad-x', `${quotePaddingX}px`);
  root.style.setProperty('--abs-quote-pad-y', `${quotePaddingY}px`);
  root.style.setProperty('--route-title-description-gap', `${routeTitleDescriptionGap}px`);
  root.style.setProperty('--edge-caption-distance-min', `${edgeCaptionDistanceMin}px`);
  root.style.setProperty('--edge-caption-distance-max', `${edgeCaptionDistanceMax}px`);

  syncStudioRuntimeState({
    edgeCaptionDistanceMin,
    edgeCaptionDistanceMax,
  });
}

function generateControlHTML(control, value) {
  return `
    <label class="control-row" data-control-id="studioSurface.${control.id}">
      <div class="control-row-header">
        <span class="control-label">${control.label}</span>
        <span class="control-value" id="studioSurface_${control.id}Val">${formatValue(control, value)}</span>
      </div>
      <input
        type="range"
        id="studioSurface_${control.id}Slider"
        min="${control.min}"
        max="${control.max}"
        step="${control.step}"
        value="${value}"
        aria-label="${control.label}"
      />
    </label>
  `;
}

function generateSectionSetHTML(sections, options = {}) {
  const config = readCurrentConfig();

  return sections.map((section) => {
    const controlsHTML = section.controls
      .map((control) => generateControlHTML(control, config[control.id] ?? DEFAULT_STUDIO_SURFACE_CONFIG[control.id]))
      .join('');
    const prependHTML = section.key === 'puck' ? (options.puckPrependHTML || section.prependHTML || '') : (section.prependHTML || '');
    const openAttr = section.defaultOpen ? 'open' : '';
    return `
      <details class="panel-section-accordion" data-section-key="${section.key}" data-studio-surface-section="${section.key}" ${openAttr}>
        <summary class="panel-section-header">
          <span class="section-icon">${section.icon}</span>
          <span class="section-label">${section.title}</span>
        </summary>
        <div class="panel-section-content">
          ${prependHTML}
          ${controlsHTML}
        </div>
      </details>
    `;
  }).join('');
}

function getShellObjectSections(options = {}) {
  const sectionKeys = Array.isArray(options.sectionKeys) ? options.sectionKeys : null;
  if (!sectionKeys || sectionKeys.length === 0) return SHELL_OBJECT_CONTROL_SECTIONS;
  return SHELL_OBJECT_CONTROL_SECTIONS.filter((section) => sectionKeys.includes(section.key));
}

export function generateStudioShellControlsHTML(options = {}) {
  return generateSectionSetHTML(getShellObjectSections(options), options);
}

export function bindStudioSurfaceControls(options = {}) {
  const uiDocument = options.uiDocument || document;
  const config = {
    ...DEFAULT_STUDIO_SURFACE_CONFIG,
    ...readCurrentConfig(),
    ...(window.__ABS_STUDIO_SURFACE_CONFIG__ || {}),
  };

  for (const section of ALL_CONTROL_SECTIONS) {
    for (const control of section.controls) {
      const input = uiDocument.getElementById(`studioSurface_${control.id}Slider`);
      const output = uiDocument.getElementById(`studioSurface_${control.id}Val`);
      if (!input || input.dataset.boundStudioSurface === 'true') continue;

      input.dataset.boundStudioSurface = 'true';
      input.addEventListener('input', () => {
        config[control.id] = clamp(input.value, control.min, control.max, DEFAULT_STUDIO_SURFACE_CONFIG[control.id]);
        const endpointIds = control.id.startsWith('frameInset')
          ? ['frameInsetMobilePx', 'frameInsetDesktopPx']
          : control.id.startsWith('frameRadius')
            ? ['frameRadiusMobilePx', 'frameRadiusDesktopPx']
            : null;
        if (endpointIds) {
          if (control.id.startsWith('frameInset')) normalizeFrameInsetEndpoints(config, control.id);
          else normalizeFrameRadiusEndpoints(config, control.id);
          for (const endpointId of endpointIds) {
            const endpointControl = section.controls.find((candidate) => candidate.id === endpointId);
            const endpointInput = uiDocument.getElementById(`studioSurface_${endpointId}Slider`);
            const endpointOutput = uiDocument.getElementById(`studioSurface_${endpointId}Val`);
            if (endpointInput) endpointInput.value = String(config[endpointId]);
            if (endpointOutput && endpointControl) endpointOutput.textContent = formatValue(endpointControl, config[endpointId]);
          }
        } else if (output) {
          output.textContent = formatValue(control, config[control.id]);
        }
        applyStudioSurfaceConfig(config, { refreshGeometry: Boolean(endpointIds) });
      });
    }
  }

  applyStudioSurfaceConfig(config);
}

export function buildStudioSurfaceSnapshot() {
  return {
    ...DEFAULT_STUDIO_SURFACE_CONFIG,
    ...readCurrentConfig(),
    ...(window.__ABS_STUDIO_SURFACE_CONFIG__ || {}),
  };
}

export function buildStudioShellPatch(snapshot, baseShell = {}) {
  const config = {
    ...DEFAULT_STUDIO_SURFACE_CONFIG,
    ...(snapshot || {}),
  };

  const nextShell = {
    ...(baseShell || {}),
    theme: { ...(baseShell?.theme || {}) },
    layout: { ...(baseShell?.layout || {}) },
    surface: { ...(baseShell?.surface || {}) },
  };

  for (const key of OBSOLETE_SURFACE_KEYS) delete nextShell.surface[key];
  for (const key of OBSOLETE_THEME_KEYS) delete nextShell.theme[key];
  nextShell.layout.decorativeScriptMaxWidth = `${Math.round(config.scriptMaxWidth)}px`;
  nextShell.layout.decorativeScriptPaddingX = `${Math.round(config.scriptPaddingX)}px`;
  nextShell.layout.decorativeScriptPaddingY = `${Math.round(config.scriptPaddingY)}px`;
  nextShell.layout.quoteButtonSize = `${Math.round(config.quoteButtonSize ?? DEFAULT_STUDIO_SURFACE_CONFIG.quoteButtonSize)}px`;
  nextShell.layout.quotePaddingX = `${Math.round(config.quotePaddingX)}px`;
  nextShell.layout.quotePaddingY = `${Math.round(config.quotePaddingY)}px`;
  nextShell.layout.routeTitleDescriptionGap = `${Math.round(config.routeTitleDescriptionGap)}px`;
  nextShell.layout.edgeCaptionDistanceMin = `${Math.round(config.edgeCaptionDistanceMin)}px`;
  nextShell.layout.edgeCaptionDistanceMax = `${Math.round(config.edgeCaptionDistanceMax)}px`;
  const frameInset = normalizeFrameInsetEndpoints(config);
  nextShell.layout.frameInsetMobile = `${frameInset.mobile}px`;
  nextShell.layout.frameInsetDesktop = `${frameInset.desktop}px`;
  delete nextShell.layout.frameInsetTablet;
  const frameRadius = normalizeFrameRadiusEndpoints(config);
  nextShell.layout.frameRadiusMobile = `${frameRadius.mobile}px`;
  nextShell.layout.frameRadiusDesktop = `${frameRadius.desktop}px`;
  delete nextShell.layout.frameRadiusTablet;
  delete nextShell.layout.quoteMaxWidth;
  delete nextShell.surface.quoteButtonFillOpacity;
  nextShell.surface.innerWallRimSize = `${Math.round(clamp(config.innerWallRimSize, 0, 64, DEFAULT_STUDIO_SURFACE_CONFIG.innerWallRimSize))}px`;
  nextShell.surface.innerWallRimBlur = `${Math.round(clamp(config.innerWallRimBlur, 0, 160, DEFAULT_STUDIO_SURFACE_CONFIG.innerWallRimBlur))}px`;
  nextShell.surface.innerWallRimOpacityLight = Number(clamp(config.innerWallRimOpacityLight, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.innerWallRimOpacityLight).toFixed(2));
  nextShell.surface.innerWallRimOpacityDark = Number(clamp(config.innerWallRimOpacityDark, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.innerWallRimOpacityDark).toFixed(2));
  nextShell.surface.outerWallGlowNearSize = `${Math.round(clamp(config.outerWallGlowNearSize, 0, 48, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowNearSize))}px`;
  nextShell.surface.outerWallGlowNearBlur = `${Math.round(clamp(config.outerWallGlowNearBlur, 0, 160, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowNearBlur))}px`;
  nextShell.surface.outerWallGlowNearOpacityLight = Number(clamp(config.outerWallGlowNearOpacityLight, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowNearOpacityLight).toFixed(3));
  nextShell.surface.outerWallGlowNearOpacityDark = Number(clamp(config.outerWallGlowNearOpacityDark, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowNearOpacityDark).toFixed(3));
  nextShell.surface.outerWallGlowFarSize = `${Math.round(clamp(config.outerWallGlowFarSize, 0, 96, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarSize))}px`;
  nextShell.surface.outerWallGlowFarBlur = `${Math.round(clamp(config.outerWallGlowFarBlur, 0, 240, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarBlur))}px`;
  nextShell.surface.outerWallGlowFarSizeMobile = `${Math.round(clamp(config.outerWallGlowFarSizeMobile, 0, 48, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarSizeMobile))}px`;
  nextShell.surface.outerWallGlowFarBlurMobile = `${Math.round(clamp(config.outerWallGlowFarBlurMobile, 0, 160, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarBlurMobile))}px`;
  nextShell.surface.outerWallGlowFarOpacityLight = Number(clamp(config.outerWallGlowFarOpacityLight, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarOpacityLight).toFixed(3));
  nextShell.surface.outerWallGlowFarOpacityDark = Number(clamp(config.outerWallGlowFarOpacityDark, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.outerWallGlowFarOpacityDark).toFixed(3));
  nextShell.surface.menuEdgeNearSize = `${Math.round(clamp(config.menuEdgeNearSize, 0, 48, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearSize))}px`;
  nextShell.surface.menuEdgeNearBlur = `${Math.round(clamp(config.menuEdgeNearBlur, 0, 160, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearBlur))}px`;
  nextShell.surface.menuEdgeNearShift = `${Math.round(clamp(config.menuEdgeNearShift, -208, 208, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearShift))}px`;
  nextShell.surface.menuEdgeNearOpacityLight = Number(clamp(config.menuEdgeNearOpacityLight, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearOpacityLight).toFixed(3));
  nextShell.surface.menuEdgeNearOpacityDark = Number(clamp(config.menuEdgeNearOpacityDark, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeNearOpacityDark).toFixed(3));
  nextShell.surface.menuEdgeFarSize = `${Math.round(clamp(config.menuEdgeFarSize, 0, 96, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarSize))}px`;
  nextShell.surface.menuEdgeFarBlur = `${Math.round(clamp(config.menuEdgeFarBlur, 0, 240, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarBlur))}px`;
  nextShell.surface.menuEdgeFarShift = `${Math.round(clamp(config.menuEdgeFarShift, -336, 336, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarShift))}px`;
  nextShell.surface.menuEdgeFarOpacityLight = Number(clamp(config.menuEdgeFarOpacityLight, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarOpacityLight).toFixed(3));
  nextShell.surface.menuEdgeFarOpacityDark = Number(clamp(config.menuEdgeFarOpacityDark, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.menuEdgeFarOpacityDark).toFixed(3));
  nextShell.motion = { ...(baseShell?.motion || {}) };
  nextShell.motion.routeTransition = {
    ...(baseShell?.motion?.routeTransition || {}),
    materialDurationMs: Math.round(config.materialDurationMs),
    materialStaggerMs: Math.round(config.materialStaggerMs),
    materialDelayMs: Math.round(config.materialDelayMs),
    typographyDelayMs: Math.round(config.typographyDelayMs),
    routeBookendDurationMs: Math.round(config.routeBookendDurationMs),
    materialExitDurationMs: Math.round(config.materialExitDurationMs),
    materialExitStaggerMs: Math.round(config.materialExitStaggerMs),
    typographyExitDurationMs: Math.round(config.typographyExitDurationMs),
    cardTravelPx: Number(config.cardTravelPx),
    cardTiltDeg: Number(config.cardTiltDeg),
  };
  delete nextShell.motion.puckRestitution;
  delete nextShell.motion.puckFriction;
  delete nextShell.motion.puckWallInset;
  delete nextShell.motion.puckMaxSpeed;
  delete nextShell.motion.puckSpinGain;
  delete nextShell.motion.puckSpinFriction;
  delete nextShell.motion.puckWallSquash;
  delete nextShell.motion.puckSoundIntensity;

  return nextShell;
}

export function buildStudioRuntimePatch(snapshot, baseRuntime = {}) {
  const config = {
    ...DEFAULT_STUDIO_SURFACE_CONFIG,
    ...(snapshot || {}),
  };

  const nextRuntime = {
    ...(baseRuntime || {}),
  };

  for (const key of OBSOLETE_RUNTIME_KEYS) delete nextRuntime[key];
  nextRuntime.edgeCaptionDistanceMinPx = Math.round(config.edgeCaptionDistanceMin);
  nextRuntime.edgeCaptionDistanceMaxPx = Math.round(config.edgeCaptionDistanceMax);

  return nextRuntime;
}
