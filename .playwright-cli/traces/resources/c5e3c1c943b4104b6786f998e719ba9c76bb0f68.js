import { withBasePath } from "/src/lib/base-path.js";

const DESIGN_SYSTEM_PATHS = [
  withBasePath('/config/design-system.json'),
  withBasePath('/js/design-system.json'),
];

const LEGACY_RUNTIME_PATHS = [
  withBasePath('/config/default-config.json'),
  withBasePath('/js/config.json'),
  withBasePath('/dist/js/config.json'),
];

const LEGACY_SHELL_PATHS = [
  withBasePath('/config/shell-config.json'),
  withBasePath('/js/shell-config.json'),
];

const LEGACY_PORTFOLIO_PATHS = [
  withBasePath('/config/portfolio-config.json'),
  withBasePath('/js/portfolio-config.json'),
  withBasePath('/dist/js/portfolio-config.json'),
];

const LEGACY_CV_PATHS = [
  withBasePath('/config/cv-config.json'),
  withBasePath('/js/cv-config.json'),
];

export const DEFAULT_CV_CONFIG = {
  leftWidth: 32,
  leftPaddingTop: 10,
  leftPaddingBottom: 10,
  leftGap: 2.5,
  photoAspectRatio: 0.75,
  photoSize: 115,
  photoBorderRadius: 1,
  rightPaddingTop: 20,
  rightPaddingBottom: 20,
  rightPaddingX: 2.5,
  rightMaxWidth: 42,
  nameSize: 2.2,
  titleSize: 0.9,
  sectionTitleSize: 0.75,
  bodySize: 0.9,
  sectionGap: 3.5,
  paragraphGap: 1.5,
  mutedOpacity: 0.6,
};

const DEFAULT_STUDIO_SURFACE_CONFIG = {
  edgeStrength: 0.06,
  edgeWidth: 0.5,
  fillOpacity: 0.018,
  glowOpacity: 0.18,
  sceneHighlight: 0.3,
  contrastVeilOpacityLight: 0.216,
  contrastVeilOpacityDark: 0.348,
  contrastVeilReachX: 25,
  contrastVeilReachY: 25,
  contrastVeilBlurVmax: 7,
  contrastVeilDitherOpacity: 0.035,
  contrastVeilDitherSize: 96,
  edgeCaptionDistanceMin: 8,
  edgeCaptionDistanceMax: 48,
};

let designSystemPromise = null;

const RETIRED_RUNTIME_KEYS = new Set([
  'frameRadiusPx',
  'frameRadiusMobilePx',
  'frameRadiusDesktopPx',
  'frameInsetMobilePx',
  'frameInsetDesktopPx',
  'containerBorderVw',
  'wallThicknessVw',
  'wallThicknessAreaMultiplier',
  'wallThicknessMinPx',
  'wallThicknessMaxPx',
  'mobileWallThicknessXFactor',
  'desktopWallThicknessFactor',
  'frameBorderWidth',
  'frameBorderWidthMobile',
  'wallInset',
  'outerWallCastShadowOpacityLight',
  'outerWallCastShadowOpacityDark',
  'outerWallCastShadowBlur',
  'outerWallCastShadowOffset',
  'outerWallCastShadowSpread',
  'autoDarkModeEnabled',
  'autoDarkNightStartHour',
  'autoDarkNightEndHour',
  'hoverEdgeEnabled',
  'hoverEdgeWidth',
  'hoverEdgeInset',
  'hoverEdgeBottomEnabled',
  'hoverEdgeBottomRadius',
  'hoverEdgeBottomOpacity',
  'hoverEdgeBottomColorMix',
  'hoverEdgeTopEnabled',
  'hoverEdgeTopRadius',
  'hoverEdgeTopOpacity',
  'hoverEdgeTopColorMix',
  'frameBorderGradientEdgeOpacity',
  'frameBorderGradientMidOpacity',
  'frameVignetteEdgeOffsetY',
  'frameVignetteEdgeBlur',
  'frameVignetteEdgeOpacity',
  'frameVignetteAmbientBlur',
  'frameVignetteAmbientOpacity',
  'depthWashOpacity',
  'depthWashCenterY',
  'depthWashRadiusScale',
  'depthWashBlendModeLight',
  'depthWashCenterColorLight',
  'depthWashCenterAlphaLight',
  'depthWashEdgeColorLight',
  'depthWashEdgeAlphaLight',
  'depthWashBlendModeDark',
  'depthWashCenterColorDark',
  'depthWashCenterAlphaDark',
  'depthWashEdgeColorDark',
  'depthWashEdgeAlphaDark',
  'wallShadowPlateEnabled',
  'wallShadowDitherStrength',
  'edgeCaptionDistanceMinPx',
  'edgeCaptionDistanceMaxPx',
  'elasticCenterRingCount',
  'elasticCenterBandRows',
  'elasticCenterMassMultiplier',
  'elasticCenterSpacingMultiplier',
  'elasticCenterElasticStrength',
  'elasticCenterMouseRepelStrength',
  'elasticCenterMouseRadius',
  'elasticCenterDamping',
  'elasticCenterWarmupFrames',
  'outerWallShineEnabled',
  'wallLightFluctuationEnabled',
  'wallAOSpread',
  'wallSpecularEnabled',
  'wallSpecularWidth',
  'wallAOOpacityLight',
  'wallSpecularOpacityLight',
  'outerWallShineBlurLight',
  'outerWallShineSpreadLight',
  'outerWallShineOvershootLight',
  'outerWallShineOpacityLight',
  'outerWallShineColorLight',
  'wallAOOpacityDark',
  'wallSpecularOpacityDark',
  'outerWallShineBlurDark',
  'outerWallShineSpreadDark',
  'outerWallShineOvershootDark',
  'outerWallShineOpacityDark',
  'outerWallShineColorDark',
  'uiIconFramePx',
  'uiIconGlyphPx',
  'frameInnerRadius',
  'frameInnerSurface',
  'frameOuterRadius',
  'outerWallRadiusAdjust',
  'wallThicknessAreaMultiplier',
  'wallThicknessMinPx',
  'wallThicknessMaxPx',
  'mobileWallThicknessXFactor',
  'mobileEdgeLabelsVisible',
  'mobileEdgeLabelSizeFactor',
  'mobileEdgeLabelOpacity',
  'logoBlurInactive',
  'logoBlurActive',
  'tactileEnabled',
  'tactileProjectId',
  'tactileScale',
  'tactileDpi',
  'tactileOpacity',
  'tactileBlendMode',
  'tactilePointerEvents',
  'noiseSeed',
  'noiseTextureSize',
  'noiseDistribution',
  'noiseMonochrome',
  'noiseChroma',
  'noiseColorLight',
  'noiseColorDark',
  'noiseMotionAmount',
  'noiseSpeedMs',
  'noiseSpeedVariance',
  'noiseFlicker',
  'noiseFlickerSpeedMs',
  'noiseBlurPx',
  'noiseContrast',
  'noiseBrightness',
  'noiseSaturation',
  'noiseHue',
  'topLogoWidthVw',
  'borderWidth',
  'borderColor',
  'slideGradientIntensityLight',
  'slideGradientIntensityDark',
  'metaPadding',
  'wheelPageScale',
  'mouseTiltPivotZ',
  'cylinderRadiusRings',
  'cylinderRadiusMin',
  'cylinderRadiusStep',
  'cylinderVerticalSpacing',
  'closeButtonTop',
  'closeButtonLeft',
  'closeButtonWidth',
  'closeButtonHeight',
  'closeButtonIconSize',
  'detailFadeMs',
  'detailFadeDelay',
  'detailContentPopDuration',
  'detailContentPopOvershoot',
  'detailContentPopStartScale',
  'detailContentPopDelayHero',
  'detailContentPopDelayBody',
  'detailContentPopEase',
  'wheelLineHeight',
  'slideSpeed',
  'perspective',
  'mouseTiltPreset',
  'mouseTiltEnabled',
  'mouseTiltInvertX',
  'mouseTiltInvertY',
  'mouseTiltSensitivity',
  'mouseTiltEase',
  'mouseTiltLeft',
  'mouseTiltRight',
  'mouseTiltUp',
  'mouseTiltDown',
  'simulationCanvasShadowOpacity',
  'simulationCanvasShadowBlurPx',
  'simulationCanvasShadowOffsetYPx',
]);

const BUTTON_BAR_RUNTIME_KEY_ALIASES = Object.freeze({
  shellBottomBandHeightPx: 'buttonBarHeightPx',
  shellBottomTabsGapPx: 'buttonBarInsetPx',
  shellTabNavWidthPx: 'buttonBarWidthPx',
  shellTabGapPx: 'buttonBarGapPx',
  shellTabHeightPx: 'buttonBarButtonHeightPx',
  shellTabPaddingXPx: 'buttonBarButtonPaddingXPx',
  shellTabRadiusPx: 'buttonBarButtonRadiusPx',
  shellTabFontSizeRem: 'buttonBarFontSizeRem',
  shellTabBgWallMixPct: 'buttonBarButtonBgWindowMixPct',
  shellTabBgWhiteMixPct: 'buttonBarButtonBgWhiteMixPct',
  shellTabHoverWhiteMixPct: 'buttonBarButtonHoverWhiteMixPct',
  shellTabActiveWallMixPct: 'buttonBarButtonActiveWindowMixPct',
  shellTabActiveWhiteMixPct: 'buttonBarButtonActiveWhiteMixPct',
  shellTabIndicatorOpacity: 'buttonBarIndicatorOpacity',
  shellTabShadowOpacity: 'buttonBarShadowOpacity',
  shellTabGrooveLightOpacity: 'buttonBarGrooveLightOpacity',
  shellTabActiveGlowPx: 'buttonBarActiveGlowPx',
  shellTabActiveDropPx: 'buttonBarActiveDropPx',
  shellTabTransitionMs: 'buttonBarTransitionMs',
});

const RETIRED_SHELL_THEME_KEYS = new Set([
  'lockedHeaderLight',
  'lockedHeaderDark',
  'safariFrameLight',
  'safariFrameDark',
  'frameVignetteEdgeBlur',
  'frameVignetteEdgeOpacity',
  'frameVignetteAmbientOpacity',
]);

const RETIRED_SHELL_LAYOUT_KEYS = new Set([
  'quoteMaxWidth',
  'frameInsetTablet',
  'frameRadiusTablet',
]);

const RETIRED_SHELL_SURFACE_KEYS = new Set([
  'quoteButtonFillOpacity',
  'sceneDepth',
  'sceneSoftness',
]);

const RETIRED_SHELL_MOTION_KEYS = new Set([
  'puckRestitution',
  'puckFriction',
  'puckWallInset',
  'puckMaxSpeed',
  'puckSpinGain',
  'puckSpinFriction',
  'puckWallSquash',
  'puckSoundIntensity',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return isPlainObject(value) ? JSON.parse(JSON.stringify(value)) : {};
}

function pruneRuntimeConfig(runtime = {}) {
  const nextRuntime = clone(runtime);
  Object.entries(BUTTON_BAR_RUNTIME_KEY_ALIASES).forEach(([legacyKey, canonicalKey]) => {
    if (
      Object.prototype.hasOwnProperty.call(nextRuntime, legacyKey)
      && !Object.prototype.hasOwnProperty.call(nextRuntime, canonicalKey)
    ) {
      nextRuntime[canonicalKey] = nextRuntime[legacyKey];
    }
    delete nextRuntime[legacyKey];
  });
  for (const key of RETIRED_RUNTIME_KEYS) {
    delete nextRuntime[key];
  }
  return nextRuntime;
}

function pruneShellConfig(shell = {}) {
  const nextShell = clone(shell);
  if (isPlainObject(nextShell.theme)) {
    for (const key of RETIRED_SHELL_THEME_KEYS) {
      delete nextShell.theme[key];
    }
  }
  if (isPlainObject(nextShell.layout)) {
    for (const key of RETIRED_SHELL_LAYOUT_KEYS) {
      delete nextShell.layout[key];
    }
  }
  if (isPlainObject(nextShell.surface)) {
    for (const key of RETIRED_SHELL_SURFACE_KEYS) {
      delete nextShell.surface[key];
    }
  }
  if (isPlainObject(nextShell.motion)) {
    for (const key of RETIRED_SHELL_MOTION_KEYS) {
      delete nextShell.motion[key];
    }
  }
  return nextShell;
}

function parseNumericToken(value, fallback) {
  const numeric = Number.parseFloat(String(value ?? '').trim());
  return Number.isFinite(numeric) ? numeric : fallback;
}

function clamp(value, min, max, fallback) {
  const numeric = Number.isFinite(Number(value)) ? Number(value) : fallback;
  return Math.min(max, Math.max(min, numeric));
}

function deriveStudioSurfaceFromShell(shell = {}) {
  const theme = isPlainObject(shell.theme) ? shell.theme : {};
  const layout = isPlainObject(shell.layout) ? shell.layout : {};
  const surface = isPlainObject(shell.surface) ? shell.surface : {};

  return {
    edgeStrength: clamp(surface.edgeOpacityLight, 0, 0.45, DEFAULT_STUDIO_SURFACE_CONFIG.edgeStrength),
    edgeWidth: clamp(parseNumericToken(surface.edgeWidth, surface.lightEdgeInset), 0, 2.5, DEFAULT_STUDIO_SURFACE_CONFIG.edgeWidth),
    fillOpacity: clamp(surface.fillOpacityLight, 0, 0.12, DEFAULT_STUDIO_SURFACE_CONFIG.fillOpacity),
    glowOpacity: clamp(surface.glowOpacityDark ?? surface.shadowOpacityDark, 0, 0.6, DEFAULT_STUDIO_SURFACE_CONFIG.glowOpacity),
    sceneHighlight: clamp(surface.sceneHighlight, 0, 0.6, clamp(parseNumericToken(theme.frameBorderMidOpacity, 0.054) / 0.18, 0, 0.6, DEFAULT_STUDIO_SURFACE_CONFIG.sceneHighlight)),
    contrastVeilOpacityLight: clamp(surface.contrastVeilOpacityLight, 0, 0.6, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilOpacityLight),
    contrastVeilOpacityDark: clamp(surface.contrastVeilOpacityDark, 0, 0.6, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilOpacityDark),
    contrastVeilReachX: clamp(surface.contrastVeilReachX, 0, 50, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilReachX),
    contrastVeilReachY: clamp(surface.contrastVeilReachY, 0, 50, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilReachY),
    contrastVeilBlurVmax: clamp(surface.contrastVeilBlurVmax, 2, 16, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilBlurVmax),
    contrastVeilDitherOpacity: clamp(surface.contrastVeilDitherOpacity, 0, 0.12, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilDitherOpacity),
    contrastVeilDitherSize: clamp(surface.contrastVeilDitherSize, 24, 240, DEFAULT_STUDIO_SURFACE_CONFIG.contrastVeilDitherSize),
    edgeCaptionDistanceMin: clamp(parseNumericToken(layout.edgeCaptionDistanceMin, 8), 0, 24, DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMin),
    edgeCaptionDistanceMax: clamp(parseNumericToken(layout.edgeCaptionDistanceMax, 48), 24, 80, DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMax),
  };
}

function applyDerivedStudioRuntime(runtime = {}, shell = {}) {
  const studio = deriveStudioSurfaceFromShell(shell);
  const theme = isPlainObject(shell.theme) ? shell.theme : {};
  const nextRuntime = clone(runtime);

  if (theme.wallBaseLight !== undefined && nextRuntime.wallBaseLight === undefined) {
    nextRuntime.wallBaseLight = theme.wallBaseLight;
  }
  if (theme.wallBaseDark !== undefined && nextRuntime.wallBaseDark === undefined) {
    nextRuntime.wallBaseDark = theme.wallBaseDark;
  }
  nextRuntime.hoverEdgeEnabled = studio.edgeStrength > 0;
  nextRuntime.hoverEdgeWidth = studio.edgeWidth;
  nextRuntime.hoverEdgeBottomEnabled = studio.edgeStrength > 0;
  nextRuntime.hoverEdgeBottomOpacity = Number((studio.edgeStrength * 0.78).toFixed(3));
  nextRuntime.hoverEdgeTopEnabled = studio.edgeStrength > 0;
  nextRuntime.hoverEdgeTopOpacity = Number((studio.edgeStrength * 0.46).toFixed(3));
  nextRuntime.frameBorderGradientEdgeOpacity = Number((studio.sceneHighlight * 0.029).toFixed(3));
  nextRuntime.frameBorderGradientMidOpacity = Number((studio.sceneHighlight * 0.058).toFixed(3));
  nextRuntime.simulationContrastVeilOpacityLight = studio.contrastVeilOpacityLight;
  nextRuntime.simulationContrastVeilOpacityDark = studio.contrastVeilOpacityDark;
  nextRuntime.simulationContrastVeilReachX = studio.contrastVeilReachX;
  nextRuntime.simulationContrastVeilReachY = studio.contrastVeilReachY;
  nextRuntime.simulationContrastVeilBlurVmax = studio.contrastVeilBlurVmax;
  nextRuntime.simulationContrastVeilDitherOpacity = studio.contrastVeilDitherOpacity;
  nextRuntime.simulationContrastVeilDitherSize = studio.contrastVeilDitherSize;
  nextRuntime.edgeCaptionDistanceMinPx = Math.round(studio.edgeCaptionDistanceMin);
  nextRuntime.edgeCaptionDistanceMaxPx = Math.round(studio.edgeCaptionDistanceMax);

  return nextRuntime;
}

function readInlineObject(key) {
  try {
    const value = globalThis?.[key];
    return isPlainObject(value) ? clone(value) : null;
  } catch (e) {
    return null;
  }
}

function detectDevConfigMode() {
  try {
    if (typeof __DEV__ === 'boolean') return __DEV__;
  } catch (e) {}

  try {
    const port = String(globalThis?.location?.port ?? '');
    if (port === '8012' || port === '8013') return true;
    const host = String(globalThis?.location?.hostname ?? '');
    if ((host === 'localhost' || host === '127.0.0.1') && port !== '') return true;
  } catch (e) {}

  return false;
}

async function fetchJson(path) {
  try {
    const response = await fetch(path, { cache: 'no-cache' });
    if (response.ok) return await response.json();
  } catch (e) {}
  return null;
}

async function loadFirstJson(paths) {
  for (const path of paths) {
    const payload = await fetchJson(path);
    if (payload) return payload;
  }
  return null;
}

function looksLikeRuntimeConfig(raw) {
  return isPlainObject(raw) && (
    'featureRenderSchedulerEnabled' in raw ||
    'gravityMultiplier' in raw ||
    'ballMassKg' in raw ||
    'modalOverlayEnabled' in raw ||
    'topLogoWidthVw' in raw ||
    'colorDistribution' in raw
  ) && !('runtime' in raw) && !('shell' in raw) && !('portfolio' in raw);
}

function looksLikeShellConfig(raw) {
  return isPlainObject(raw) && (
    isPlainObject(raw.theme) ||
    isPlainObject(raw.layout) ||
    isPlainObject(raw.motion) ||
    isPlainObject(raw.hero)
  ) && !('runtime' in raw) && !('portfolio' in raw);
}

function looksLikePortfolioConfig(raw) {
  return isPlainObject(raw) && (
    isPlainObject(raw.cssVars) ||
    isPlainObject(raw.runtime)
  ) && !('shell' in raw) && !('cv' in raw);
}

function looksLikeCvConfig(raw) {
  return isPlainObject(raw) && (
    'leftWidth' in raw ||
    'photoAspectRatio' in raw ||
    'rightPaddingTop' in raw ||
    'mutedOpacity' in raw
  );
}

export function normalizeDesignSystemConfig(raw = {}) {
  const source = isPlainObject(raw) ? raw : {};

  const runtime = isPlainObject(source.runtime)
    ? pruneRuntimeConfig(source.runtime)
    : (looksLikeRuntimeConfig(source) ? pruneRuntimeConfig(source) : {});

  const shell = isPlainObject(source.shell)
    ? pruneShellConfig(source.shell)
    : (looksLikeShellConfig(source) ? pruneShellConfig(source) : {});

  const portfolio = isPlainObject(source.portfolio)
    ? clone(source.portfolio)
    : (looksLikePortfolioConfig(source) ? clone(source) : {});

  const contact = isPlainObject(source.contact) ? clone(source.contact) : {};

  const cv = isPlainObject(source.cv)
    ? clone(source.cv)
    : (looksLikeCvConfig(source) ? clone(source) : clone(DEFAULT_CV_CONFIG));

  const version = Number.isFinite(Number(source.version)) ? Number(source.version) : 1;

  return { version, runtime, shell, portfolio, contact, cv };
}

async function loadFallbackDesignSystem() {
  const [runtime, shell, portfolio, cv] = await Promise.all([
    loadFirstJson(LEGACY_RUNTIME_PATHS),
    loadFirstJson(LEGACY_SHELL_PATHS),
    loadFirstJson(LEGACY_PORTFOLIO_PATHS),
    loadFirstJson(LEGACY_CV_PATHS),
  ]);

  return normalizeDesignSystemConfig({
    version: 1,
    runtime: runtime || {},
    shell: shell || {},
    portfolio: portfolio || {},
    contact: {},
    cv: cv || DEFAULT_CV_CONFIG,
  });
}

export async function loadDesignSystemConfig() {
  if (designSystemPromise) return designSystemPromise;

  const inline = readInlineObject('__DESIGN_SYSTEM_CONFIG__');
  if (inline) {
    designSystemPromise = Promise.resolve(normalizeDesignSystemConfig(inline));
    return designSystemPromise;
  }

  designSystemPromise = (async () => {
    const canonical = await loadFirstJson(DESIGN_SYSTEM_PATHS);
    if (canonical) return normalizeDesignSystemConfig(canonical);
    return loadFallbackDesignSystem();
  })();

  return designSystemPromise;
}

export function deriveRuntimeConfig(designSystem = {}) {
  const normalized = normalizeDesignSystemConfig(designSystem);
  return applyDerivedStudioRuntime(normalized.runtime, normalized.shell);
}

export function deriveShellConfig(designSystem = {}) {
  return clone(normalizeDesignSystemConfig(designSystem).shell);
}

export function derivePortfolioConfig(designSystem = {}) {
  return clone(normalizeDesignSystemConfig(designSystem).portfolio);
}

export function deriveContactConfig(designSystem = {}) {
  return clone(normalizeDesignSystemConfig(designSystem).contact);
}

export function deriveCvConfig(designSystem = {}) {
  return clone(normalizeDesignSystemConfig(designSystem).cv);
}

export function deriveLegacyConfigFiles(designSystem = {}) {
  const normalized = normalizeDesignSystemConfig(designSystem);
  return {
    runtime: applyDerivedStudioRuntime(normalized.runtime, normalized.shell),
    shell: clone(normalized.shell),
    portfolio: clone(normalized.portfolio),
    cv: clone(normalized.cv),
  };
}

export function shouldUseCanonicalDesignConfig() {
  return Boolean(readInlineObject('__DESIGN_SYSTEM_CONFIG__')) || detectDevConfigMode();
}

export async function loadLegacyRuntimeConfig() {
  const inline = readInlineObject('__RUNTIME_CONFIG__');
  if (inline) return inline;
  return loadFirstJson(LEGACY_RUNTIME_PATHS);
}

export async function loadLegacyShellConfig() {
  const inline = readInlineObject('__SHELL_CONFIG__');
  if (inline) return inline;
  return loadFirstJson(LEGACY_SHELL_PATHS);
}

export async function loadLegacyPortfolioConfig() {
  const inline = readInlineObject('__PORTFOLIO_CONFIG__');
  if (inline) return inline;
  return loadFirstJson(LEGACY_PORTFOLIO_PATHS);
}

export async function loadLegacyCvConfig() {
  const inline = readInlineObject('__CV_CONFIG__');
  if (inline) return inline;
  return loadFirstJson(LEGACY_CV_PATHS);
}

//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImRlc2lnbi1jb25maWcuanMiXSwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgd2l0aEJhc2VQYXRoIH0gZnJvbSBcIi9zcmMvbGliL2Jhc2UtcGF0aC5qc1wiO1xuXG5jb25zdCBERVNJR05fU1lTVEVNX1BBVEhTID0gW1xuICB3aXRoQmFzZVBhdGgoJy9jb25maWcvZGVzaWduLXN5c3RlbS5qc29uJyksXG4gIHdpdGhCYXNlUGF0aCgnL2pzL2Rlc2lnbi1zeXN0ZW0uanNvbicpLFxuXTtcblxuY29uc3QgTEVHQUNZX1JVTlRJTUVfUEFUSFMgPSBbXG4gIHdpdGhCYXNlUGF0aCgnL2NvbmZpZy9kZWZhdWx0LWNvbmZpZy5qc29uJyksXG4gIHdpdGhCYXNlUGF0aCgnL2pzL2NvbmZpZy5qc29uJyksXG4gIHdpdGhCYXNlUGF0aCgnL2Rpc3QvanMvY29uZmlnLmpzb24nKSxcbl07XG5cbmNvbnN0IExFR0FDWV9TSEVMTF9QQVRIUyA9IFtcbiAgd2l0aEJhc2VQYXRoKCcvY29uZmlnL3NoZWxsLWNvbmZpZy5qc29uJyksXG4gIHdpdGhCYXNlUGF0aCgnL2pzL3NoZWxsLWNvbmZpZy5qc29uJyksXG5dO1xuXG5jb25zdCBMRUdBQ1lfUE9SVEZPTElPX1BBVEhTID0gW1xuICB3aXRoQmFzZVBhdGgoJy9jb25maWcvcG9ydGZvbGlvLWNvbmZpZy5qc29uJyksXG4gIHdpdGhCYXNlUGF0aCgnL2pzL3BvcnRmb2xpby1jb25maWcuanNvbicpLFxuICB3aXRoQmFzZVBhdGgoJy9kaXN0L2pzL3BvcnRmb2xpby1jb25maWcuanNvbicpLFxuXTtcblxuY29uc3QgTEVHQUNZX0NWX1BBVEhTID0gW1xuICB3aXRoQmFzZVBhdGgoJy9jb25maWcvY3YtY29uZmlnLmpzb24nKSxcbiAgd2l0aEJhc2VQYXRoKCcvanMvY3YtY29uZmlnLmpzb24nKSxcbl07XG5cbmV4cG9ydCBjb25zdCBERUZBVUxUX0NWX0NPTkZJRyA9IHtcbiAgbGVmdFdpZHRoOiAzMixcbiAgbGVmdFBhZGRpbmdUb3A6IDEwLFxuICBsZWZ0UGFkZGluZ0JvdHRvbTogMTAsXG4gIGxlZnRHYXA6IDIuNSxcbiAgcGhvdG9Bc3BlY3RSYXRpbzogMC43NSxcbiAgcGhvdG9TaXplOiAxMTUsXG4gIHBob3RvQm9yZGVyUmFkaXVzOiAxLFxuICByaWdodFBhZGRpbmdUb3A6IDIwLFxuICByaWdodFBhZGRpbmdCb3R0b206IDIwLFxuICByaWdodFBhZGRpbmdYOiAyLjUsXG4gIHJpZ2h0TWF4V2lkdGg6IDQyLFxuICBuYW1lU2l6ZTogMi4yLFxuICB0aXRsZVNpemU6IDAuOSxcbiAgc2VjdGlvblRpdGxlU2l6ZTogMC43NSxcbiAgYm9keVNpemU6IDAuOSxcbiAgc2VjdGlvbkdhcDogMy41LFxuICBwYXJhZ3JhcGhHYXA6IDEuNSxcbiAgbXV0ZWRPcGFjaXR5OiAwLjYsXG59O1xuXG5jb25zdCBERUZBVUxUX1NUVURJT19TVVJGQUNFX0NPTkZJRyA9IHtcbiAgZWRnZVN0cmVuZ3RoOiAwLjA2LFxuICBlZGdlV2lkdGg6IDAuNSxcbiAgZmlsbE9wYWNpdHk6IDAuMDE4LFxuICBnbG93T3BhY2l0eTogMC4xOCxcbiAgc2NlbmVIaWdobGlnaHQ6IDAuMyxcbiAgY29udHJhc3RWZWlsT3BhY2l0eUxpZ2h0OiAwLjIxNixcbiAgY29udHJhc3RWZWlsT3BhY2l0eURhcms6IDAuMzQ4LFxuICBjb250cmFzdFZlaWxSZWFjaFg6IDI1LFxuICBjb250cmFzdFZlaWxSZWFjaFk6IDI1LFxuICBjb250cmFzdFZlaWxCbHVyVm1heDogNyxcbiAgY29udHJhc3RWZWlsRGl0aGVyT3BhY2l0eTogMC4wMzUsXG4gIGNvbnRyYXN0VmVpbERpdGhlclNpemU6IDk2LFxuICBlZGdlQ2FwdGlvbkRpc3RhbmNlTWluOiA4LFxuICBlZGdlQ2FwdGlvbkRpc3RhbmNlTWF4OiA0OCxcbn07XG5cbmxldCBkZXNpZ25TeXN0ZW1Qcm9taXNlID0gbnVsbDtcblxuY29uc3QgUkVUSVJFRF9SVU5USU1FX0tFWVMgPSBuZXcgU2V0KFtcbiAgJ2ZyYW1lUmFkaXVzUHgnLFxuICAnZnJhbWVSYWRpdXNNb2JpbGVQeCcsXG4gICdmcmFtZVJhZGl1c0Rlc2t0b3BQeCcsXG4gICdmcmFtZUluc2V0TW9iaWxlUHgnLFxuICAnZnJhbWVJbnNldERlc2t0b3BQeCcsXG4gICdjb250YWluZXJCb3JkZXJWdycsXG4gICd3YWxsVGhpY2tuZXNzVncnLFxuICAnd2FsbFRoaWNrbmVzc0FyZWFNdWx0aXBsaWVyJyxcbiAgJ3dhbGxUaGlja25lc3NNaW5QeCcsXG4gICd3YWxsVGhpY2tuZXNzTWF4UHgnLFxuICAnbW9iaWxlV2FsbFRoaWNrbmVzc1hGYWN0b3InLFxuICAnZGVza3RvcFdhbGxUaGlja25lc3NGYWN0b3InLFxuICAnZnJhbWVCb3JkZXJXaWR0aCcsXG4gICdmcmFtZUJvcmRlcldpZHRoTW9iaWxlJyxcbiAgJ3dhbGxJbnNldCcsXG4gICdvdXRlcldhbGxDYXN0U2hhZG93T3BhY2l0eUxpZ2h0JyxcbiAgJ291dGVyV2FsbENhc3RTaGFkb3dPcGFjaXR5RGFyaycsXG4gICdvdXRlcldhbGxDYXN0U2hhZG93Qmx1cicsXG4gICdvdXRlcldhbGxDYXN0U2hhZG93T2Zmc2V0JyxcbiAgJ291dGVyV2FsbENhc3RTaGFkb3dTcHJlYWQnLFxuICAnYXV0b0RhcmtNb2RlRW5hYmxlZCcsXG4gICdhdXRvRGFya05pZ2h0U3RhcnRIb3VyJyxcbiAgJ2F1dG9EYXJrTmlnaHRFbmRIb3VyJyxcbiAgJ2hvdmVyRWRnZUVuYWJsZWQnLFxuICAnaG92ZXJFZGdlV2lkdGgnLFxuICAnaG92ZXJFZGdlSW5zZXQnLFxuICAnaG92ZXJFZGdlQm90dG9tRW5hYmxlZCcsXG4gICdob3ZlckVkZ2VCb3R0b21SYWRpdXMnLFxuICAnaG92ZXJFZGdlQm90dG9tT3BhY2l0eScsXG4gICdob3ZlckVkZ2VCb3R0b21Db2xvck1peCcsXG4gICdob3ZlckVkZ2VUb3BFbmFibGVkJyxcbiAgJ2hvdmVyRWRnZVRvcFJhZGl1cycsXG4gICdob3ZlckVkZ2VUb3BPcGFjaXR5JyxcbiAgJ2hvdmVyRWRnZVRvcENvbG9yTWl4JyxcbiAgJ2ZyYW1lQm9yZGVyR3JhZGllbnRFZGdlT3BhY2l0eScsXG4gICdmcmFtZUJvcmRlckdyYWRpZW50TWlkT3BhY2l0eScsXG4gICdmcmFtZVZpZ25ldHRlRWRnZU9mZnNldFknLFxuICAnZnJhbWVWaWduZXR0ZUVkZ2VCbHVyJyxcbiAgJ2ZyYW1lVmlnbmV0dGVFZGdlT3BhY2l0eScsXG4gICdmcmFtZVZpZ25ldHRlQW1iaWVudEJsdXInLFxuICAnZnJhbWVWaWduZXR0ZUFtYmllbnRPcGFjaXR5JyxcbiAgJ2RlcHRoV2FzaE9wYWNpdHknLFxuICAnZGVwdGhXYXNoQ2VudGVyWScsXG4gICdkZXB0aFdhc2hSYWRpdXNTY2FsZScsXG4gICdkZXB0aFdhc2hCbGVuZE1vZGVMaWdodCcsXG4gICdkZXB0aFdhc2hDZW50ZXJDb2xvckxpZ2h0JyxcbiAgJ2RlcHRoV2FzaENlbnRlckFscGhhTGlnaHQnLFxuICAnZGVwdGhXYXNoRWRnZUNvbG9yTGlnaHQnLFxuICAnZGVwdGhXYXNoRWRnZUFscGhhTGlnaHQnLFxuICAnZGVwdGhXYXNoQmxlbmRNb2RlRGFyaycsXG4gICdkZXB0aFdhc2hDZW50ZXJDb2xvckRhcmsnLFxuICAnZGVwdGhXYXNoQ2VudGVyQWxwaGFEYXJrJyxcbiAgJ2RlcHRoV2FzaEVkZ2VDb2xvckRhcmsnLFxuICAnZGVwdGhXYXNoRWRnZUFscGhhRGFyaycsXG4gICd3YWxsU2hhZG93UGxhdGVFbmFibGVkJyxcbiAgJ3dhbGxTaGFkb3dEaXRoZXJTdHJlbmd0aCcsXG4gICdlZGdlQ2FwdGlvbkRpc3RhbmNlTWluUHgnLFxuICAnZWRnZUNhcHRpb25EaXN0YW5jZU1heFB4JyxcbiAgJ2VsYXN0aWNDZW50ZXJSaW5nQ291bnQnLFxuICAnZWxhc3RpY0NlbnRlckJhbmRSb3dzJyxcbiAgJ2VsYXN0aWNDZW50ZXJNYXNzTXVsdGlwbGllcicsXG4gICdlbGFzdGljQ2VudGVyU3BhY2luZ011bHRpcGxpZXInLFxuICAnZWxhc3RpY0NlbnRlckVsYXN0aWNTdHJlbmd0aCcsXG4gICdlbGFzdGljQ2VudGVyTW91c2VSZXBlbFN0cmVuZ3RoJyxcbiAgJ2VsYXN0aWNDZW50ZXJNb3VzZVJhZGl1cycsXG4gICdlbGFzdGljQ2VudGVyRGFtcGluZycsXG4gICdlbGFzdGljQ2VudGVyV2FybXVwRnJhbWVzJyxcbiAgJ291dGVyV2FsbFNoaW5lRW5hYmxlZCcsXG4gICd3YWxsTGlnaHRGbHVjdHVhdGlvbkVuYWJsZWQnLFxuICAnd2FsbEFPU3ByZWFkJyxcbiAgJ3dhbGxTcGVjdWxhckVuYWJsZWQnLFxuICAnd2FsbFNwZWN1bGFyV2lkdGgnLFxuICAnd2FsbEFPT3BhY2l0eUxpZ2h0JyxcbiAgJ3dhbGxTcGVjdWxhck9wYWNpdHlMaWdodCcsXG4gICdvdXRlcldhbGxTaGluZUJsdXJMaWdodCcsXG4gICdvdXRlcldhbGxTaGluZVNwcmVhZExpZ2h0JyxcbiAgJ291dGVyV2FsbFNoaW5lT3ZlcnNob290TGlnaHQnLFxuICAnb3V0ZXJXYWxsU2hpbmVPcGFjaXR5TGlnaHQnLFxuICAnb3V0ZXJXYWxsU2hpbmVDb2xvckxpZ2h0JyxcbiAgJ3dhbGxBT09wYWNpdHlEYXJrJyxcbiAgJ3dhbGxTcGVjdWxhck9wYWNpdHlEYXJrJyxcbiAgJ291dGVyV2FsbFNoaW5lQmx1ckRhcmsnLFxuICAnb3V0ZXJXYWxsU2hpbmVTcHJlYWREYXJrJyxcbiAgJ291dGVyV2FsbFNoaW5lT3ZlcnNob290RGFyaycsXG4gICdvdXRlcldhbGxTaGluZU9wYWNpdHlEYXJrJyxcbiAgJ291dGVyV2FsbFNoaW5lQ29sb3JEYXJrJyxcbiAgJ3VpSWNvbkZyYW1lUHgnLFxuICAndWlJY29uR2x5cGhQeCcsXG4gICdmcmFtZUlubmVyUmFkaXVzJyxcbiAgJ2ZyYW1lSW5uZXJTdXJmYWNlJyxcbiAgJ2ZyYW1lT3V0ZXJSYWRpdXMnLFxuICAnb3V0ZXJXYWxsUmFkaXVzQWRqdXN0JyxcbiAgJ3dhbGxUaGlja25lc3NBcmVhTXVsdGlwbGllcicsXG4gICd3YWxsVGhpY2tuZXNzTWluUHgnLFxuICAnd2FsbFRoaWNrbmVzc01heFB4JyxcbiAgJ21vYmlsZVdhbGxUaGlja25lc3NYRmFjdG9yJyxcbiAgJ21vYmlsZUVkZ2VMYWJlbHNWaXNpYmxlJyxcbiAgJ21vYmlsZUVkZ2VMYWJlbFNpemVGYWN0b3InLFxuICAnbW9iaWxlRWRnZUxhYmVsT3BhY2l0eScsXG4gICdsb2dvQmx1ckluYWN0aXZlJyxcbiAgJ2xvZ29CbHVyQWN0aXZlJyxcbiAgJ3RhY3RpbGVFbmFibGVkJyxcbiAgJ3RhY3RpbGVQcm9qZWN0SWQnLFxuICAndGFjdGlsZVNjYWxlJyxcbiAgJ3RhY3RpbGVEcGknLFxuICAndGFjdGlsZU9wYWNpdHknLFxuICAndGFjdGlsZUJsZW5kTW9kZScsXG4gICd0YWN0aWxlUG9pbnRlckV2ZW50cycsXG4gICdub2lzZVNlZWQnLFxuICAnbm9pc2VUZXh0dXJlU2l6ZScsXG4gICdub2lzZURpc3RyaWJ1dGlvbicsXG4gICdub2lzZU1vbm9jaHJvbWUnLFxuICAnbm9pc2VDaHJvbWEnLFxuICAnbm9pc2VDb2xvckxpZ2h0JyxcbiAgJ25vaXNlQ29sb3JEYXJrJyxcbiAgJ25vaXNlTW90aW9uQW1vdW50JyxcbiAgJ25vaXNlU3BlZWRNcycsXG4gICdub2lzZVNwZWVkVmFyaWFuY2UnLFxuICAnbm9pc2VGbGlja2VyJyxcbiAgJ25vaXNlRmxpY2tlclNwZWVkTXMnLFxuICAnbm9pc2VCbHVyUHgnLFxuICAnbm9pc2VDb250cmFzdCcsXG4gICdub2lzZUJyaWdodG5lc3MnLFxuICAnbm9pc2VTYXR1cmF0aW9uJyxcbiAgJ25vaXNlSHVlJyxcbiAgJ3RvcExvZ29XaWR0aFZ3JyxcbiAgJ2JvcmRlcldpZHRoJyxcbiAgJ2JvcmRlckNvbG9yJyxcbiAgJ3NsaWRlR3JhZGllbnRJbnRlbnNpdHlMaWdodCcsXG4gICdzbGlkZUdyYWRpZW50SW50ZW5zaXR5RGFyaycsXG4gICdtZXRhUGFkZGluZycsXG4gICd3aGVlbFBhZ2VTY2FsZScsXG4gICdtb3VzZVRpbHRQaXZvdFonLFxuICAnY3lsaW5kZXJSYWRpdXNSaW5ncycsXG4gICdjeWxpbmRlclJhZGl1c01pbicsXG4gICdjeWxpbmRlclJhZGl1c1N0ZXAnLFxuICAnY3lsaW5kZXJWZXJ0aWNhbFNwYWNpbmcnLFxuICAnY2xvc2VCdXR0b25Ub3AnLFxuICAnY2xvc2VCdXR0b25MZWZ0JyxcbiAgJ2Nsb3NlQnV0dG9uV2lkdGgnLFxuICAnY2xvc2VCdXR0b25IZWlnaHQnLFxuICAnY2xvc2VCdXR0b25JY29uU2l6ZScsXG4gICdkZXRhaWxGYWRlTXMnLFxuICAnZGV0YWlsRmFkZURlbGF5JyxcbiAgJ2RldGFpbENvbnRlbnRQb3BEdXJhdGlvbicsXG4gICdkZXRhaWxDb250ZW50UG9wT3ZlcnNob290JyxcbiAgJ2RldGFpbENvbnRlbnRQb3BTdGFydFNjYWxlJyxcbiAgJ2RldGFpbENvbnRlbnRQb3BEZWxheUhlcm8nLFxuICAnZGV0YWlsQ29udGVudFBvcERlbGF5Qm9keScsXG4gICdkZXRhaWxDb250ZW50UG9wRWFzZScsXG4gICd3aGVlbExpbmVIZWlnaHQnLFxuICAnc2xpZGVTcGVlZCcsXG4gICdwZXJzcGVjdGl2ZScsXG4gICdtb3VzZVRpbHRQcmVzZXQnLFxuICAnbW91c2VUaWx0RW5hYmxlZCcsXG4gICdtb3VzZVRpbHRJbnZlcnRYJyxcbiAgJ21vdXNlVGlsdEludmVydFknLFxuICAnbW91c2VUaWx0U2Vuc2l0aXZpdHknLFxuICAnbW91c2VUaWx0RWFzZScsXG4gICdtb3VzZVRpbHRMZWZ0JyxcbiAgJ21vdXNlVGlsdFJpZ2h0JyxcbiAgJ21vdXNlVGlsdFVwJyxcbiAgJ21vdXNlVGlsdERvd24nLFxuICAnc2ltdWxhdGlvbkNhbnZhc1NoYWRvd09wYWNpdHknLFxuICAnc2ltdWxhdGlvbkNhbnZhc1NoYWRvd0JsdXJQeCcsXG4gICdzaW11bGF0aW9uQ2FudmFzU2hhZG93T2Zmc2V0WVB4Jyxcbl0pO1xuXG5jb25zdCBCVVRUT05fQkFSX1JVTlRJTUVfS0VZX0FMSUFTRVMgPSBPYmplY3QuZnJlZXplKHtcbiAgc2hlbGxCb3R0b21CYW5kSGVpZ2h0UHg6ICdidXR0b25CYXJIZWlnaHRQeCcsXG4gIHNoZWxsQm90dG9tVGFic0dhcFB4OiAnYnV0dG9uQmFySW5zZXRQeCcsXG4gIHNoZWxsVGFiTmF2V2lkdGhQeDogJ2J1dHRvbkJhcldpZHRoUHgnLFxuICBzaGVsbFRhYkdhcFB4OiAnYnV0dG9uQmFyR2FwUHgnLFxuICBzaGVsbFRhYkhlaWdodFB4OiAnYnV0dG9uQmFyQnV0dG9uSGVpZ2h0UHgnLFxuICBzaGVsbFRhYlBhZGRpbmdYUHg6ICdidXR0b25CYXJCdXR0b25QYWRkaW5nWFB4JyxcbiAgc2hlbGxUYWJSYWRpdXNQeDogJ2J1dHRvbkJhckJ1dHRvblJhZGl1c1B4JyxcbiAgc2hlbGxUYWJGb250U2l6ZVJlbTogJ2J1dHRvbkJhckZvbnRTaXplUmVtJyxcbiAgc2hlbGxUYWJCZ1dhbGxNaXhQY3Q6ICdidXR0b25CYXJCdXR0b25CZ1dpbmRvd01peFBjdCcsXG4gIHNoZWxsVGFiQmdXaGl0ZU1peFBjdDogJ2J1dHRvbkJhckJ1dHRvbkJnV2hpdGVNaXhQY3QnLFxuICBzaGVsbFRhYkhvdmVyV2hpdGVNaXhQY3Q6ICdidXR0b25CYXJCdXR0b25Ib3ZlcldoaXRlTWl4UGN0JyxcbiAgc2hlbGxUYWJBY3RpdmVXYWxsTWl4UGN0OiAnYnV0dG9uQmFyQnV0dG9uQWN0aXZlV2luZG93TWl4UGN0JyxcbiAgc2hlbGxUYWJBY3RpdmVXaGl0ZU1peFBjdDogJ2J1dHRvbkJhckJ1dHRvbkFjdGl2ZVdoaXRlTWl4UGN0JyxcbiAgc2hlbGxUYWJJbmRpY2F0b3JPcGFjaXR5OiAnYnV0dG9uQmFySW5kaWNhdG9yT3BhY2l0eScsXG4gIHNoZWxsVGFiU2hhZG93T3BhY2l0eTogJ2J1dHRvbkJhclNoYWRvd09wYWNpdHknLFxuICBzaGVsbFRhYkdyb292ZUxpZ2h0T3BhY2l0eTogJ2J1dHRvbkJhckdyb292ZUxpZ2h0T3BhY2l0eScsXG4gIHNoZWxsVGFiQWN0aXZlR2xvd1B4OiAnYnV0dG9uQmFyQWN0aXZlR2xvd1B4JyxcbiAgc2hlbGxUYWJBY3RpdmVEcm9wUHg6ICdidXR0b25CYXJBY3RpdmVEcm9wUHgnLFxuICBzaGVsbFRhYlRyYW5zaXRpb25NczogJ2J1dHRvbkJhclRyYW5zaXRpb25NcycsXG59KTtcblxuY29uc3QgUkVUSVJFRF9TSEVMTF9USEVNRV9LRVlTID0gbmV3IFNldChbXG4gICdsb2NrZWRIZWFkZXJMaWdodCcsXG4gICdsb2NrZWRIZWFkZXJEYXJrJyxcbiAgJ3NhZmFyaUZyYW1lTGlnaHQnLFxuICAnc2FmYXJpRnJhbWVEYXJrJyxcbiAgJ2ZyYW1lVmlnbmV0dGVFZGdlQmx1cicsXG4gICdmcmFtZVZpZ25ldHRlRWRnZU9wYWNpdHknLFxuICAnZnJhbWVWaWduZXR0ZUFtYmllbnRPcGFjaXR5Jyxcbl0pO1xuXG5jb25zdCBSRVRJUkVEX1NIRUxMX0xBWU9VVF9LRVlTID0gbmV3IFNldChbXG4gICdxdW90ZU1heFdpZHRoJyxcbiAgJ2ZyYW1lSW5zZXRUYWJsZXQnLFxuICAnZnJhbWVSYWRpdXNUYWJsZXQnLFxuXSk7XG5cbmNvbnN0IFJFVElSRURfU0hFTExfU1VSRkFDRV9LRVlTID0gbmV3IFNldChbXG4gICdxdW90ZUJ1dHRvbkZpbGxPcGFjaXR5JyxcbiAgJ3NjZW5lRGVwdGgnLFxuICAnc2NlbmVTb2Z0bmVzcycsXG5dKTtcblxuY29uc3QgUkVUSVJFRF9TSEVMTF9NT1RJT05fS0VZUyA9IG5ldyBTZXQoW1xuICAncHVja1Jlc3RpdHV0aW9uJyxcbiAgJ3B1Y2tGcmljdGlvbicsXG4gICdwdWNrV2FsbEluc2V0JyxcbiAgJ3B1Y2tNYXhTcGVlZCcsXG4gICdwdWNrU3BpbkdhaW4nLFxuICAncHVja1NwaW5GcmljdGlvbicsXG4gICdwdWNrV2FsbFNxdWFzaCcsXG4gICdwdWNrU291bmRJbnRlbnNpdHknLFxuXSk7XG5cbmZ1bmN0aW9uIGlzUGxhaW5PYmplY3QodmFsdWUpIHtcbiAgcmV0dXJuIHZhbHVlICE9PSBudWxsICYmIHR5cGVvZiB2YWx1ZSA9PT0gJ29iamVjdCcgJiYgIUFycmF5LmlzQXJyYXkodmFsdWUpO1xufVxuXG5mdW5jdGlvbiBjbG9uZSh2YWx1ZSkge1xuICByZXR1cm4gaXNQbGFpbk9iamVjdCh2YWx1ZSkgPyBKU09OLnBhcnNlKEpTT04uc3RyaW5naWZ5KHZhbHVlKSkgOiB7fTtcbn1cblxuZnVuY3Rpb24gcHJ1bmVSdW50aW1lQ29uZmlnKHJ1bnRpbWUgPSB7fSkge1xuICBjb25zdCBuZXh0UnVudGltZSA9IGNsb25lKHJ1bnRpbWUpO1xuICBPYmplY3QuZW50cmllcyhCVVRUT05fQkFSX1JVTlRJTUVfS0VZX0FMSUFTRVMpLmZvckVhY2goKFtsZWdhY3lLZXksIGNhbm9uaWNhbEtleV0pID0+IHtcbiAgICBpZiAoXG4gICAgICBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobmV4dFJ1bnRpbWUsIGxlZ2FjeUtleSlcbiAgICAgICYmICFPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwobmV4dFJ1bnRpbWUsIGNhbm9uaWNhbEtleSlcbiAgICApIHtcbiAgICAgIG5leHRSdW50aW1lW2Nhbm9uaWNhbEtleV0gPSBuZXh0UnVudGltZVtsZWdhY3lLZXldO1xuICAgIH1cbiAgICBkZWxldGUgbmV4dFJ1bnRpbWVbbGVnYWN5S2V5XTtcbiAgfSk7XG4gIGZvciAoY29uc3Qga2V5IG9mIFJFVElSRURfUlVOVElNRV9LRVlTKSB7XG4gICAgZGVsZXRlIG5leHRSdW50aW1lW2tleV07XG4gIH1cbiAgcmV0dXJuIG5leHRSdW50aW1lO1xufVxuXG5mdW5jdGlvbiBwcnVuZVNoZWxsQ29uZmlnKHNoZWxsID0ge30pIHtcbiAgY29uc3QgbmV4dFNoZWxsID0gY2xvbmUoc2hlbGwpO1xuICBpZiAoaXNQbGFpbk9iamVjdChuZXh0U2hlbGwudGhlbWUpKSB7XG4gICAgZm9yIChjb25zdCBrZXkgb2YgUkVUSVJFRF9TSEVMTF9USEVNRV9LRVlTKSB7XG4gICAgICBkZWxldGUgbmV4dFNoZWxsLnRoZW1lW2tleV07XG4gICAgfVxuICB9XG4gIGlmIChpc1BsYWluT2JqZWN0KG5leHRTaGVsbC5sYXlvdXQpKSB7XG4gICAgZm9yIChjb25zdCBrZXkgb2YgUkVUSVJFRF9TSEVMTF9MQVlPVVRfS0VZUykge1xuICAgICAgZGVsZXRlIG5leHRTaGVsbC5sYXlvdXRba2V5XTtcbiAgICB9XG4gIH1cbiAgaWYgKGlzUGxhaW5PYmplY3QobmV4dFNoZWxsLnN1cmZhY2UpKSB7XG4gICAgZm9yIChjb25zdCBrZXkgb2YgUkVUSVJFRF9TSEVMTF9TVVJGQUNFX0tFWVMpIHtcbiAgICAgIGRlbGV0ZSBuZXh0U2hlbGwuc3VyZmFjZVtrZXldO1xuICAgIH1cbiAgfVxuICBpZiAoaXNQbGFpbk9iamVjdChuZXh0U2hlbGwubW90aW9uKSkge1xuICAgIGZvciAoY29uc3Qga2V5IG9mIFJFVElSRURfU0hFTExfTU9USU9OX0tFWVMpIHtcbiAgICAgIGRlbGV0ZSBuZXh0U2hlbGwubW90aW9uW2tleV07XG4gICAgfVxuICB9XG4gIHJldHVybiBuZXh0U2hlbGw7XG59XG5cbmZ1bmN0aW9uIHBhcnNlTnVtZXJpY1Rva2VuKHZhbHVlLCBmYWxsYmFjaykge1xuICBjb25zdCBudW1lcmljID0gTnVtYmVyLnBhcnNlRmxvYXQoU3RyaW5nKHZhbHVlID8/ICcnKS50cmltKCkpO1xuICByZXR1cm4gTnVtYmVyLmlzRmluaXRlKG51bWVyaWMpID8gbnVtZXJpYyA6IGZhbGxiYWNrO1xufVxuXG5mdW5jdGlvbiBjbGFtcCh2YWx1ZSwgbWluLCBtYXgsIGZhbGxiYWNrKSB7XG4gIGNvbnN0IG51bWVyaWMgPSBOdW1iZXIuaXNGaW5pdGUoTnVtYmVyKHZhbHVlKSkgPyBOdW1iZXIodmFsdWUpIDogZmFsbGJhY2s7XG4gIHJldHVybiBNYXRoLm1pbihtYXgsIE1hdGgubWF4KG1pbiwgbnVtZXJpYykpO1xufVxuXG5mdW5jdGlvbiBkZXJpdmVTdHVkaW9TdXJmYWNlRnJvbVNoZWxsKHNoZWxsID0ge30pIHtcbiAgY29uc3QgdGhlbWUgPSBpc1BsYWluT2JqZWN0KHNoZWxsLnRoZW1lKSA/IHNoZWxsLnRoZW1lIDoge307XG4gIGNvbnN0IGxheW91dCA9IGlzUGxhaW5PYmplY3Qoc2hlbGwubGF5b3V0KSA/IHNoZWxsLmxheW91dCA6IHt9O1xuICBjb25zdCBzdXJmYWNlID0gaXNQbGFpbk9iamVjdChzaGVsbC5zdXJmYWNlKSA/IHNoZWxsLnN1cmZhY2UgOiB7fTtcblxuICByZXR1cm4ge1xuICAgIGVkZ2VTdHJlbmd0aDogY2xhbXAoc3VyZmFjZS5lZGdlT3BhY2l0eUxpZ2h0LCAwLCAwLjQ1LCBERUZBVUxUX1NUVURJT19TVVJGQUNFX0NPTkZJRy5lZGdlU3RyZW5ndGgpLFxuICAgIGVkZ2VXaWR0aDogY2xhbXAocGFyc2VOdW1lcmljVG9rZW4oc3VyZmFjZS5lZGdlV2lkdGgsIHN1cmZhY2UubGlnaHRFZGdlSW5zZXQpLCAwLCAyLjUsIERFRkFVTFRfU1RVRElPX1NVUkZBQ0VfQ09ORklHLmVkZ2VXaWR0aCksXG4gICAgZmlsbE9wYWNpdHk6IGNsYW1wKHN1cmZhY2UuZmlsbE9wYWNpdHlMaWdodCwgMCwgMC4xMiwgREVGQVVMVF9TVFVESU9fU1VSRkFDRV9DT05GSUcuZmlsbE9wYWNpdHkpLFxuICAgIGdsb3dPcGFjaXR5OiBjbGFtcChzdXJmYWNlLmdsb3dPcGFjaXR5RGFyayA/PyBzdXJmYWNlLnNoYWRvd09wYWNpdHlEYXJrLCAwLCAwLjYsIERFRkFVTFRfU1RVRElPX1NVUkZBQ0VfQ09ORklHLmdsb3dPcGFjaXR5KSxcbiAgICBzY2VuZUhpZ2hsaWdodDogY2xhbXAoc3VyZmFjZS5zY2VuZUhpZ2hsaWdodCwgMCwgMC42LCBjbGFtcChwYXJzZU51bWVyaWNUb2tlbih0aGVtZS5mcmFtZUJvcmRlck1pZE9wYWNpdHksIDAuMDU0KSAvIDAuMTgsIDAsIDAuNiwgREVGQVVMVF9TVFVESU9fU1VSRkFDRV9DT05GSUcuc2NlbmVIaWdobGlnaHQpKSxcbiAgICBjb250cmFzdFZlaWxPcGFjaXR5TGlnaHQ6IGNsYW1wKHN1cmZhY2UuY29udHJhc3RWZWlsT3BhY2l0eUxpZ2h0LCAwLCAwLjYsIERFRkFVTFRfU1RVRElPX1NVUkZBQ0VfQ09ORklHLmNvbnRyYXN0VmVpbE9wYWNpdHlMaWdodCksXG4gICAgY29udHJhc3RWZWlsT3BhY2l0eURhcms6IGNsYW1wKHN1cmZhY2UuY29udHJhc3RWZWlsT3BhY2l0eURhcmssIDAsIDAuNiwgREVGQVVMVF9TVFVESU9fU1VSRkFDRV9DT05GSUcuY29udHJhc3RWZWlsT3BhY2l0eURhcmspLFxuICAgIGNvbnRyYXN0VmVpbFJlYWNoWDogY2xhbXAoc3VyZmFjZS5jb250cmFzdFZlaWxSZWFjaFgsIDAsIDUwLCBERUZBVUxUX1NUVURJT19TVVJGQUNFX0NPTkZJRy5jb250cmFzdFZlaWxSZWFjaFgpLFxuICAgIGNvbnRyYXN0VmVpbFJlYWNoWTogY2xhbXAoc3VyZmFjZS5jb250cmFzdFZlaWxSZWFjaFksIDAsIDUwLCBERUZBVUxUX1NUVURJT19TVVJGQUNFX0NPTkZJRy5jb250cmFzdFZlaWxSZWFjaFkpLFxuICAgIGNvbnRyYXN0VmVpbEJsdXJWbWF4OiBjbGFtcChzdXJmYWNlLmNvbnRyYXN0VmVpbEJsdXJWbWF4LCAyLCAxNiwgREVGQVVMVF9TVFVESU9fU1VSRkFDRV9DT05GSUcuY29udHJhc3RWZWlsQmx1clZtYXgpLFxuICAgIGNvbnRyYXN0VmVpbERpdGhlck9wYWNpdHk6IGNsYW1wKHN1cmZhY2UuY29udHJhc3RWZWlsRGl0aGVyT3BhY2l0eSwgMCwgMC4xMiwgREVGQVVMVF9TVFVESU9fU1VSRkFDRV9DT05GSUcuY29udHJhc3RWZWlsRGl0aGVyT3BhY2l0eSksXG4gICAgY29udHJhc3RWZWlsRGl0aGVyU2l6ZTogY2xhbXAoc3VyZmFjZS5jb250cmFzdFZlaWxEaXRoZXJTaXplLCAyNCwgMjQwLCBERUZBVUxUX1NUVURJT19TVVJGQUNFX0NPTkZJRy5jb250cmFzdFZlaWxEaXRoZXJTaXplKSxcbiAgICBlZGdlQ2FwdGlvbkRpc3RhbmNlTWluOiBjbGFtcChwYXJzZU51bWVyaWNUb2tlbihsYXlvdXQuZWRnZUNhcHRpb25EaXN0YW5jZU1pbiwgOCksIDAsIDI0LCBERUZBVUxUX1NUVURJT19TVVJGQUNFX0NPTkZJRy5lZGdlQ2FwdGlvbkRpc3RhbmNlTWluKSxcbiAgICBlZGdlQ2FwdGlvbkRpc3RhbmNlTWF4OiBjbGFtcChwYXJzZU51bWVyaWNUb2tlbihsYXlvdXQuZWRnZUNhcHRpb25EaXN0YW5jZU1heCwgNDgpLCAyNCwgODAsIERFRkFVTFRfU1RVRElPX1NVUkZBQ0VfQ09ORklHLmVkZ2VDYXB0aW9uRGlzdGFuY2VNYXgpLFxuICB9O1xufVxuXG5mdW5jdGlvbiBhcHBseURlcml2ZWRTdHVkaW9SdW50aW1lKHJ1bnRpbWUgPSB7fSwgc2hlbGwgPSB7fSkge1xuICBjb25zdCBzdHVkaW8gPSBkZXJpdmVTdHVkaW9TdXJmYWNlRnJvbVNoZWxsKHNoZWxsKTtcbiAgY29uc3QgdGhlbWUgPSBpc1BsYWluT2JqZWN0KHNoZWxsLnRoZW1lKSA/IHNoZWxsLnRoZW1lIDoge307XG4gIGNvbnN0IG5leHRSdW50aW1lID0gY2xvbmUocnVudGltZSk7XG5cbiAgaWYgKHRoZW1lLndhbGxCYXNlTGlnaHQgIT09IHVuZGVmaW5lZCAmJiBuZXh0UnVudGltZS53YWxsQmFzZUxpZ2h0ID09PSB1bmRlZmluZWQpIHtcbiAgICBuZXh0UnVudGltZS53YWxsQmFzZUxpZ2h0ID0gdGhlbWUud2FsbEJhc2VMaWdodDtcbiAgfVxuICBpZiAodGhlbWUud2FsbEJhc2VEYXJrICE9PSB1bmRlZmluZWQgJiYgbmV4dFJ1bnRpbWUud2FsbEJhc2VEYXJrID09PSB1bmRlZmluZWQpIHtcbiAgICBuZXh0UnVudGltZS53YWxsQmFzZURhcmsgPSB0aGVtZS53YWxsQmFzZURhcms7XG4gIH1cbiAgbmV4dFJ1bnRpbWUuaG92ZXJFZGdlRW5hYmxlZCA9IHN0dWRpby5lZGdlU3RyZW5ndGggPiAwO1xuICBuZXh0UnVudGltZS5ob3ZlckVkZ2VXaWR0aCA9IHN0dWRpby5lZGdlV2lkdGg7XG4gIG5leHRSdW50aW1lLmhvdmVyRWRnZUJvdHRvbUVuYWJsZWQgPSBzdHVkaW8uZWRnZVN0cmVuZ3RoID4gMDtcbiAgbmV4dFJ1bnRpbWUuaG92ZXJFZGdlQm90dG9tT3BhY2l0eSA9IE51bWJlcigoc3R1ZGlvLmVkZ2VTdHJlbmd0aCAqIDAuNzgpLnRvRml4ZWQoMykpO1xuICBuZXh0UnVudGltZS5ob3ZlckVkZ2VUb3BFbmFibGVkID0gc3R1ZGlvLmVkZ2VTdHJlbmd0aCA+IDA7XG4gIG5leHRSdW50aW1lLmhvdmVyRWRnZVRvcE9wYWNpdHkgPSBOdW1iZXIoKHN0dWRpby5lZGdlU3RyZW5ndGggKiAwLjQ2KS50b0ZpeGVkKDMpKTtcbiAgbmV4dFJ1bnRpbWUuZnJhbWVCb3JkZXJHcmFkaWVudEVkZ2VPcGFjaXR5ID0gTnVtYmVyKChzdHVkaW8uc2NlbmVIaWdobGlnaHQgKiAwLjAyOSkudG9GaXhlZCgzKSk7XG4gIG5leHRSdW50aW1lLmZyYW1lQm9yZGVyR3JhZGllbnRNaWRPcGFjaXR5ID0gTnVtYmVyKChzdHVkaW8uc2NlbmVIaWdobGlnaHQgKiAwLjA1OCkudG9GaXhlZCgzKSk7XG4gIG5leHRSdW50aW1lLnNpbXVsYXRpb25Db250cmFzdFZlaWxPcGFjaXR5TGlnaHQgPSBzdHVkaW8uY29udHJhc3RWZWlsT3BhY2l0eUxpZ2h0O1xuICBuZXh0UnVudGltZS5zaW11bGF0aW9uQ29udHJhc3RWZWlsT3BhY2l0eURhcmsgPSBzdHVkaW8uY29udHJhc3RWZWlsT3BhY2l0eURhcms7XG4gIG5leHRSdW50aW1lLnNpbXVsYXRpb25Db250cmFzdFZlaWxSZWFjaFggPSBzdHVkaW8uY29udHJhc3RWZWlsUmVhY2hYO1xuICBuZXh0UnVudGltZS5zaW11bGF0aW9uQ29udHJhc3RWZWlsUmVhY2hZID0gc3R1ZGlvLmNvbnRyYXN0VmVpbFJlYWNoWTtcbiAgbmV4dFJ1bnRpbWUuc2ltdWxhdGlvbkNvbnRyYXN0VmVpbEJsdXJWbWF4ID0gc3R1ZGlvLmNvbnRyYXN0VmVpbEJsdXJWbWF4O1xuICBuZXh0UnVudGltZS5zaW11bGF0aW9uQ29udHJhc3RWZWlsRGl0aGVyT3BhY2l0eSA9IHN0dWRpby5jb250cmFzdFZlaWxEaXRoZXJPcGFjaXR5O1xuICBuZXh0UnVudGltZS5zaW11bGF0aW9uQ29udHJhc3RWZWlsRGl0aGVyU2l6ZSA9IHN0dWRpby5jb250cmFzdFZlaWxEaXRoZXJTaXplO1xuICBuZXh0UnVudGltZS5lZGdlQ2FwdGlvbkRpc3RhbmNlTWluUHggPSBNYXRoLnJvdW5kKHN0dWRpby5lZGdlQ2FwdGlvbkRpc3RhbmNlTWluKTtcbiAgbmV4dFJ1bnRpbWUuZWRnZUNhcHRpb25EaXN0YW5jZU1heFB4ID0gTWF0aC5yb3VuZChzdHVkaW8uZWRnZUNhcHRpb25EaXN0YW5jZU1heCk7XG5cbiAgcmV0dXJuIG5leHRSdW50aW1lO1xufVxuXG5mdW5jdGlvbiByZWFkSW5saW5lT2JqZWN0KGtleSkge1xuICB0cnkge1xuICAgIGNvbnN0IHZhbHVlID0gZ2xvYmFsVGhpcz8uW2tleV07XG4gICAgcmV0dXJuIGlzUGxhaW5PYmplY3QodmFsdWUpID8gY2xvbmUodmFsdWUpIDogbnVsbDtcbiAgfSBjYXRjaCAoZSkge1xuICAgIHJldHVybiBudWxsO1xuICB9XG59XG5cbmZ1bmN0aW9uIGRldGVjdERldkNvbmZpZ01vZGUoKSB7XG4gIHRyeSB7XG4gICAgaWYgKHR5cGVvZiBfX0RFVl9fID09PSAnYm9vbGVhbicpIHJldHVybiBfX0RFVl9fO1xuICB9IGNhdGNoIChlKSB7fVxuXG4gIHRyeSB7XG4gICAgY29uc3QgcG9ydCA9IFN0cmluZyhnbG9iYWxUaGlzPy5sb2NhdGlvbj8ucG9ydCA/PyAnJyk7XG4gICAgaWYgKHBvcnQgPT09ICc4MDEyJyB8fCBwb3J0ID09PSAnODAxMycpIHJldHVybiB0cnVlO1xuICAgIGNvbnN0IGhvc3QgPSBTdHJpbmcoZ2xvYmFsVGhpcz8ubG9jYXRpb24/Lmhvc3RuYW1lID8/ICcnKTtcbiAgICBpZiAoKGhvc3QgPT09ICdsb2NhbGhvc3QnIHx8IGhvc3QgPT09ICcxMjcuMC4wLjEnKSAmJiBwb3J0ICE9PSAnJykgcmV0dXJuIHRydWU7XG4gIH0gY2F0Y2ggKGUpIHt9XG5cbiAgcmV0dXJuIGZhbHNlO1xufVxuXG5hc3luYyBmdW5jdGlvbiBmZXRjaEpzb24ocGF0aCkge1xuICB0cnkge1xuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgZmV0Y2gocGF0aCwgeyBjYWNoZTogJ25vLWNhY2hlJyB9KTtcbiAgICBpZiAocmVzcG9uc2Uub2spIHJldHVybiBhd2FpdCByZXNwb25zZS5qc29uKCk7XG4gIH0gY2F0Y2ggKGUpIHt9XG4gIHJldHVybiBudWxsO1xufVxuXG5hc3luYyBmdW5jdGlvbiBsb2FkRmlyc3RKc29uKHBhdGhzKSB7XG4gIGZvciAoY29uc3QgcGF0aCBvZiBwYXRocykge1xuICAgIGNvbnN0IHBheWxvYWQgPSBhd2FpdCBmZXRjaEpzb24ocGF0aCk7XG4gICAgaWYgKHBheWxvYWQpIHJldHVybiBwYXlsb2FkO1xuICB9XG4gIHJldHVybiBudWxsO1xufVxuXG5mdW5jdGlvbiBsb29rc0xpa2VSdW50aW1lQ29uZmlnKHJhdykge1xuICByZXR1cm4gaXNQbGFpbk9iamVjdChyYXcpICYmIChcbiAgICAnZmVhdHVyZVJlbmRlclNjaGVkdWxlckVuYWJsZWQnIGluIHJhdyB8fFxuICAgICdncmF2aXR5TXVsdGlwbGllcicgaW4gcmF3IHx8XG4gICAgJ2JhbGxNYXNzS2cnIGluIHJhdyB8fFxuICAgICdtb2RhbE92ZXJsYXlFbmFibGVkJyBpbiByYXcgfHxcbiAgICAndG9wTG9nb1dpZHRoVncnIGluIHJhdyB8fFxuICAgICdjb2xvckRpc3RyaWJ1dGlvbicgaW4gcmF3XG4gICkgJiYgISgncnVudGltZScgaW4gcmF3KSAmJiAhKCdzaGVsbCcgaW4gcmF3KSAmJiAhKCdwb3J0Zm9saW8nIGluIHJhdyk7XG59XG5cbmZ1bmN0aW9uIGxvb2tzTGlrZVNoZWxsQ29uZmlnKHJhdykge1xuICByZXR1cm4gaXNQbGFpbk9iamVjdChyYXcpICYmIChcbiAgICBpc1BsYWluT2JqZWN0KHJhdy50aGVtZSkgfHxcbiAgICBpc1BsYWluT2JqZWN0KHJhdy5sYXlvdXQpIHx8XG4gICAgaXNQbGFpbk9iamVjdChyYXcubW90aW9uKSB8fFxuICAgIGlzUGxhaW5PYmplY3QocmF3Lmhlcm8pXG4gICkgJiYgISgncnVudGltZScgaW4gcmF3KSAmJiAhKCdwb3J0Zm9saW8nIGluIHJhdyk7XG59XG5cbmZ1bmN0aW9uIGxvb2tzTGlrZVBvcnRmb2xpb0NvbmZpZyhyYXcpIHtcbiAgcmV0dXJuIGlzUGxhaW5PYmplY3QocmF3KSAmJiAoXG4gICAgaXNQbGFpbk9iamVjdChyYXcuY3NzVmFycykgfHxcbiAgICBpc1BsYWluT2JqZWN0KHJhdy5ydW50aW1lKVxuICApICYmICEoJ3NoZWxsJyBpbiByYXcpICYmICEoJ2N2JyBpbiByYXcpO1xufVxuXG5mdW5jdGlvbiBsb29rc0xpa2VDdkNvbmZpZyhyYXcpIHtcbiAgcmV0dXJuIGlzUGxhaW5PYmplY3QocmF3KSAmJiAoXG4gICAgJ2xlZnRXaWR0aCcgaW4gcmF3IHx8XG4gICAgJ3Bob3RvQXNwZWN0UmF0aW8nIGluIHJhdyB8fFxuICAgICdyaWdodFBhZGRpbmdUb3AnIGluIHJhdyB8fFxuICAgICdtdXRlZE9wYWNpdHknIGluIHJhd1xuICApO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gbm9ybWFsaXplRGVzaWduU3lzdGVtQ29uZmlnKHJhdyA9IHt9KSB7XG4gIGNvbnN0IHNvdXJjZSA9IGlzUGxhaW5PYmplY3QocmF3KSA/IHJhdyA6IHt9O1xuXG4gIGNvbnN0IHJ1bnRpbWUgPSBpc1BsYWluT2JqZWN0KHNvdXJjZS5ydW50aW1lKVxuICAgID8gcHJ1bmVSdW50aW1lQ29uZmlnKHNvdXJjZS5ydW50aW1lKVxuICAgIDogKGxvb2tzTGlrZVJ1bnRpbWVDb25maWcoc291cmNlKSA/IHBydW5lUnVudGltZUNvbmZpZyhzb3VyY2UpIDoge30pO1xuXG4gIGNvbnN0IHNoZWxsID0gaXNQbGFpbk9iamVjdChzb3VyY2Uuc2hlbGwpXG4gICAgPyBwcnVuZVNoZWxsQ29uZmlnKHNvdXJjZS5zaGVsbClcbiAgICA6IChsb29rc0xpa2VTaGVsbENvbmZpZyhzb3VyY2UpID8gcHJ1bmVTaGVsbENvbmZpZyhzb3VyY2UpIDoge30pO1xuXG4gIGNvbnN0IHBvcnRmb2xpbyA9IGlzUGxhaW5PYmplY3Qoc291cmNlLnBvcnRmb2xpbylcbiAgICA/IGNsb25lKHNvdXJjZS5wb3J0Zm9saW8pXG4gICAgOiAobG9va3NMaWtlUG9ydGZvbGlvQ29uZmlnKHNvdXJjZSkgPyBjbG9uZShzb3VyY2UpIDoge30pO1xuXG4gIGNvbnN0IGNvbnRhY3QgPSBpc1BsYWluT2JqZWN0KHNvdXJjZS5jb250YWN0KSA/IGNsb25lKHNvdXJjZS5jb250YWN0KSA6IHt9O1xuXG4gIGNvbnN0IGN2ID0gaXNQbGFpbk9iamVjdChzb3VyY2UuY3YpXG4gICAgPyBjbG9uZShzb3VyY2UuY3YpXG4gICAgOiAobG9va3NMaWtlQ3ZDb25maWcoc291cmNlKSA/IGNsb25lKHNvdXJjZSkgOiBjbG9uZShERUZBVUxUX0NWX0NPTkZJRykpO1xuXG4gIGNvbnN0IHZlcnNpb24gPSBOdW1iZXIuaXNGaW5pdGUoTnVtYmVyKHNvdXJjZS52ZXJzaW9uKSkgPyBOdW1iZXIoc291cmNlLnZlcnNpb24pIDogMTtcblxuICByZXR1cm4geyB2ZXJzaW9uLCBydW50aW1lLCBzaGVsbCwgcG9ydGZvbGlvLCBjb250YWN0LCBjdiB9O1xufVxuXG5hc3luYyBmdW5jdGlvbiBsb2FkRmFsbGJhY2tEZXNpZ25TeXN0ZW0oKSB7XG4gIGNvbnN0IFtydW50aW1lLCBzaGVsbCwgcG9ydGZvbGlvLCBjdl0gPSBhd2FpdCBQcm9taXNlLmFsbChbXG4gICAgbG9hZEZpcnN0SnNvbihMRUdBQ1lfUlVOVElNRV9QQVRIUyksXG4gICAgbG9hZEZpcnN0SnNvbihMRUdBQ1lfU0hFTExfUEFUSFMpLFxuICAgIGxvYWRGaXJzdEpzb24oTEVHQUNZX1BPUlRGT0xJT19QQVRIUyksXG4gICAgbG9hZEZpcnN0SnNvbihMRUdBQ1lfQ1ZfUEFUSFMpLFxuICBdKTtcblxuICByZXR1cm4gbm9ybWFsaXplRGVzaWduU3lzdGVtQ29uZmlnKHtcbiAgICB2ZXJzaW9uOiAxLFxuICAgIHJ1bnRpbWU6IHJ1bnRpbWUgfHwge30sXG4gICAgc2hlbGw6IHNoZWxsIHx8IHt9LFxuICAgIHBvcnRmb2xpbzogcG9ydGZvbGlvIHx8IHt9LFxuICAgIGNvbnRhY3Q6IHt9LFxuICAgIGN2OiBjdiB8fCBERUZBVUxUX0NWX0NPTkZJRyxcbiAgfSk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkRGVzaWduU3lzdGVtQ29uZmlnKCkge1xuICBpZiAoZGVzaWduU3lzdGVtUHJvbWlzZSkgcmV0dXJuIGRlc2lnblN5c3RlbVByb21pc2U7XG5cbiAgY29uc3QgaW5saW5lID0gcmVhZElubGluZU9iamVjdCgnX19ERVNJR05fU1lTVEVNX0NPTkZJR19fJyk7XG4gIGlmIChpbmxpbmUpIHtcbiAgICBkZXNpZ25TeXN0ZW1Qcm9taXNlID0gUHJvbWlzZS5yZXNvbHZlKG5vcm1hbGl6ZURlc2lnblN5c3RlbUNvbmZpZyhpbmxpbmUpKTtcbiAgICByZXR1cm4gZGVzaWduU3lzdGVtUHJvbWlzZTtcbiAgfVxuXG4gIGRlc2lnblN5c3RlbVByb21pc2UgPSAoYXN5bmMgKCkgPT4ge1xuICAgIGNvbnN0IGNhbm9uaWNhbCA9IGF3YWl0IGxvYWRGaXJzdEpzb24oREVTSUdOX1NZU1RFTV9QQVRIUyk7XG4gICAgaWYgKGNhbm9uaWNhbCkgcmV0dXJuIG5vcm1hbGl6ZURlc2lnblN5c3RlbUNvbmZpZyhjYW5vbmljYWwpO1xuICAgIHJldHVybiBsb2FkRmFsbGJhY2tEZXNpZ25TeXN0ZW0oKTtcbiAgfSkoKTtcblxuICByZXR1cm4gZGVzaWduU3lzdGVtUHJvbWlzZTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlcml2ZVJ1bnRpbWVDb25maWcoZGVzaWduU3lzdGVtID0ge30pIHtcbiAgY29uc3Qgbm9ybWFsaXplZCA9IG5vcm1hbGl6ZURlc2lnblN5c3RlbUNvbmZpZyhkZXNpZ25TeXN0ZW0pO1xuICByZXR1cm4gYXBwbHlEZXJpdmVkU3R1ZGlvUnVudGltZShub3JtYWxpemVkLnJ1bnRpbWUsIG5vcm1hbGl6ZWQuc2hlbGwpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVyaXZlU2hlbGxDb25maWcoZGVzaWduU3lzdGVtID0ge30pIHtcbiAgcmV0dXJuIGNsb25lKG5vcm1hbGl6ZURlc2lnblN5c3RlbUNvbmZpZyhkZXNpZ25TeXN0ZW0pLnNoZWxsKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlcml2ZVBvcnRmb2xpb0NvbmZpZyhkZXNpZ25TeXN0ZW0gPSB7fSkge1xuICByZXR1cm4gY2xvbmUobm9ybWFsaXplRGVzaWduU3lzdGVtQ29uZmlnKGRlc2lnblN5c3RlbSkucG9ydGZvbGlvKTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlcml2ZUNvbnRhY3RDb25maWcoZGVzaWduU3lzdGVtID0ge30pIHtcbiAgcmV0dXJuIGNsb25lKG5vcm1hbGl6ZURlc2lnblN5c3RlbUNvbmZpZyhkZXNpZ25TeXN0ZW0pLmNvbnRhY3QpO1xufVxuXG5leHBvcnQgZnVuY3Rpb24gZGVyaXZlQ3ZDb25maWcoZGVzaWduU3lzdGVtID0ge30pIHtcbiAgcmV0dXJuIGNsb25lKG5vcm1hbGl6ZURlc2lnblN5c3RlbUNvbmZpZyhkZXNpZ25TeXN0ZW0pLmN2KTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIGRlcml2ZUxlZ2FjeUNvbmZpZ0ZpbGVzKGRlc2lnblN5c3RlbSA9IHt9KSB7XG4gIGNvbnN0IG5vcm1hbGl6ZWQgPSBub3JtYWxpemVEZXNpZ25TeXN0ZW1Db25maWcoZGVzaWduU3lzdGVtKTtcbiAgcmV0dXJuIHtcbiAgICBydW50aW1lOiBhcHBseURlcml2ZWRTdHVkaW9SdW50aW1lKG5vcm1hbGl6ZWQucnVudGltZSwgbm9ybWFsaXplZC5zaGVsbCksXG4gICAgc2hlbGw6IGNsb25lKG5vcm1hbGl6ZWQuc2hlbGwpLFxuICAgIHBvcnRmb2xpbzogY2xvbmUobm9ybWFsaXplZC5wb3J0Zm9saW8pLFxuICAgIGN2OiBjbG9uZShub3JtYWxpemVkLmN2KSxcbiAgfTtcbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHNob3VsZFVzZUNhbm9uaWNhbERlc2lnbkNvbmZpZygpIHtcbiAgcmV0dXJuIEJvb2xlYW4ocmVhZElubGluZU9iamVjdCgnX19ERVNJR05fU1lTVEVNX0NPTkZJR19fJykpIHx8IGRldGVjdERldkNvbmZpZ01vZGUoKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRMZWdhY3lSdW50aW1lQ29uZmlnKCkge1xuICBjb25zdCBpbmxpbmUgPSByZWFkSW5saW5lT2JqZWN0KCdfX1JVTlRJTUVfQ09ORklHX18nKTtcbiAgaWYgKGlubGluZSkgcmV0dXJuIGlubGluZTtcbiAgcmV0dXJuIGxvYWRGaXJzdEpzb24oTEVHQUNZX1JVTlRJTUVfUEFUSFMpO1xufVxuXG5leHBvcnQgYXN5bmMgZnVuY3Rpb24gbG9hZExlZ2FjeVNoZWxsQ29uZmlnKCkge1xuICBjb25zdCBpbmxpbmUgPSByZWFkSW5saW5lT2JqZWN0KCdfX1NIRUxMX0NPTkZJR19fJyk7XG4gIGlmIChpbmxpbmUpIHJldHVybiBpbmxpbmU7XG4gIHJldHVybiBsb2FkRmlyc3RKc29uKExFR0FDWV9TSEVMTF9QQVRIUyk7XG59XG5cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBsb2FkTGVnYWN5UG9ydGZvbGlvQ29uZmlnKCkge1xuICBjb25zdCBpbmxpbmUgPSByZWFkSW5saW5lT2JqZWN0KCdfX1BPUlRGT0xJT19DT05GSUdfXycpO1xuICBpZiAoaW5saW5lKSByZXR1cm4gaW5saW5lO1xuICByZXR1cm4gbG9hZEZpcnN0SnNvbihMRUdBQ1lfUE9SVEZPTElPX1BBVEhTKTtcbn1cblxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIGxvYWRMZWdhY3lDdkNvbmZpZygpIHtcbiAgY29uc3QgaW5saW5lID0gcmVhZElubGluZU9iamVjdCgnX19DVl9DT05GSUdfXycpO1xuICBpZiAoaW5saW5lKSByZXR1cm4gaW5saW5lO1xuICByZXR1cm4gbG9hZEZpcnN0SnNvbihMRUdBQ1lfQ1ZfUEFUSFMpO1xufVxuIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJB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Q0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJO0FBQ3JELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDZCxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQ2YsQ0FBQyxDQUFDO0FBQ0Y7O0FBRUEsUUFBUSxDQUFDLG1CQUFtQixDQUFDLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxPQUFPO0FBQ3BELENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFZixDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ3pELENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDdkQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxNQUFNLENBQUMsVUFBVSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQzdELENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQ2xGLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQzs7QUFFZixDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUs7QUFDZDs7QUFFQSxLQUFLLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsQ0FBQztBQUMvQixDQUFDLENBQUMsR0FBRyxDQUFDO0FBQ04sQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDN0QsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxRQUFRLENBQUMsRUFBRSxDQUFDLENBQUMsTUFBTSxDQUFDLEtBQUssQ0FBQyxRQUFRLENBQUMsSUFBSSxDQUFDLENBQUM7QUFDakQsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0FBQ2YsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxJQUFJO0FBQ2I7O0FBRUEsS0FBSyxDQUFDLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUM7QUFDcEMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLEtBQUssQ0FBQyxDQUFDO0FBQzVCLENBQUMsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUM7QUFDekMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxNQUFNLENBQUMsT0FBTztBQUMvQixDQUFDLENBQUM7QUFDRixDQUFDLENBQUMsTUFBTSxDQUFDLElBQUk7QUFDYjs7QUFFQSxRQUFRLENBQUMsc0JBQXNCLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDckMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLDZCQUE2QixDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzVDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNoQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsVUFBVSxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQ3pCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQztBQUNsQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsY0FBYyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxDQUFDO0FBQzdCLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLEVBQUUsQ0FBQztBQUMzQixDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLEVBQUUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQztBQUN4RTs7QUFFQSxRQUFRLENBQUMsb0JBQW9CLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDbkMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUM7QUFDOUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLElBQUk7QUFDMUIsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxDQUFDLEdBQUcsQ0FBQztBQUNuRDs7QUFFQSxRQUFRLENBQUMsd0JBQXdCLENBQUMsR0FBRyxDQUFDLENBQUM7QUFDdkMsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUM7QUFDL0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7QUFDaEMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLE9BQU87QUFDN0IsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENB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