const DESIGN_SYSTEM_PATHS = [
  'config/design-system.json',
  '../config/design-system.json',
  'js/design-system.json',
  '../js/design-system.json',
];

const LEGACY_RUNTIME_PATHS = [
  'config/default-config.json',
  '../config/default-config.json',
  'js/config.json',
  '../js/config.json',
  '../dist/js/config.json',
];

const LEGACY_SHELL_PATHS = [
  'config/shell-config.json',
  '../config/shell-config.json',
  'js/shell-config.json',
  '../js/shell-config.json',
];

const LEGACY_PORTFOLIO_PATHS = [
  'config/portfolio-config.json',
  '../config/portfolio-config.json',
  'js/portfolio-config.json',
  '../js/portfolio-config.json',
  '../dist/js/portfolio-config.json',
];

const LEGACY_CV_PATHS = [
  'config/cv-config.json',
  '../config/cv-config.json',
  'js/cv-config.json',
  '../js/cv-config.json',
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
  sceneDepth: 0.14,
  sceneSoftness: 0.45,
  edgeCaptionDistanceMin: 8,
  edgeCaptionDistanceMax: 48,
};

let designSystemPromise = null;

const RETIRED_RUNTIME_KEYS = new Set([
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
  'edgeCaptionDistanceMinPx',
  'edgeCaptionDistanceMaxPx',
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
  'wallInset',
  'mobileWallThicknessXFactor',
  'mobileEdgeLabelsVisible',
  'mobileEdgeLabelSizeFactor',
  'mobileEdgeLabelOpacity',
  'logoBlurInactive',
  'logoBlurActive',
  'autoDarkNightStartHour',
  'autoDarkNightEndHour',
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
]);

const RETIRED_SHELL_THEME_KEYS = new Set([
  'lockedHeaderLight',
  'lockedHeaderDark',
]);

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return isPlainObject(value) ? JSON.parse(JSON.stringify(value)) : {};
}

function pruneRuntimeConfig(runtime = {}) {
  const nextRuntime = clone(runtime);
  for (const key of RETIRED_RUNTIME_KEYS) {
    delete nextRuntime[key];
  }
  return nextRuntime;
}

function pruneShellConfig(shell = {}) {
  const nextShell = clone(shell);
  if (!isPlainObject(nextShell.theme)) return nextShell;
  for (const key of RETIRED_SHELL_THEME_KEYS) {
    delete nextShell.theme[key];
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
  const edgeBlur = parseNumericToken(theme.frameVignetteEdgeBlur, 30);

  return {
    edgeStrength: clamp(surface.edgeOpacityLight, 0, 0.45, DEFAULT_STUDIO_SURFACE_CONFIG.edgeStrength),
    edgeWidth: clamp(parseNumericToken(surface.edgeWidth, surface.lightEdgeInset), 0, 2.5, DEFAULT_STUDIO_SURFACE_CONFIG.edgeWidth),
    fillOpacity: clamp(surface.fillOpacityLight, 0, 0.12, DEFAULT_STUDIO_SURFACE_CONFIG.fillOpacity),
    glowOpacity: clamp(surface.glowOpacityDark ?? surface.shadowOpacityDark, 0, 0.6, DEFAULT_STUDIO_SURFACE_CONFIG.glowOpacity),
    sceneHighlight: clamp(surface.sceneHighlight, 0, 0.6, clamp(parseNumericToken(theme.frameBorderMidOpacity, 0.054) / 0.18, 0, 0.6, DEFAULT_STUDIO_SURFACE_CONFIG.sceneHighlight)),
    sceneDepth: clamp(surface.sceneDepth, 0, 0.28, clamp(parseNumericToken(theme.frameVignetteEdgeOpacity, 0.14), 0, 0.28, DEFAULT_STUDIO_SURFACE_CONFIG.sceneDepth)),
    sceneSoftness: clamp(surface.sceneSoftness, 0, 1, clamp((edgeBlur - 10) / 70, 0, 1, DEFAULT_STUDIO_SURFACE_CONFIG.sceneSoftness)),
    edgeCaptionDistanceMin: clamp(parseNumericToken(layout.edgeCaptionDistanceMin, 8), 0, 24, DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMin),
    edgeCaptionDistanceMax: clamp(parseNumericToken(layout.edgeCaptionDistanceMax, 48), 24, 80, DEFAULT_STUDIO_SURFACE_CONFIG.edgeCaptionDistanceMax),
  };
}

function applyDerivedStudioRuntime(runtime = {}, shell = {}) {
  const studio = deriveStudioSurfaceFromShell(shell);
  const nextRuntime = clone(runtime);

  nextRuntime.hoverEdgeEnabled = studio.edgeStrength > 0;
  nextRuntime.hoverEdgeWidth = studio.edgeWidth;
  nextRuntime.hoverEdgeBottomEnabled = studio.edgeStrength > 0;
  nextRuntime.hoverEdgeBottomOpacity = Number((studio.edgeStrength * 0.78).toFixed(3));
  nextRuntime.hoverEdgeTopEnabled = studio.edgeStrength > 0;
  nextRuntime.hoverEdgeTopOpacity = Number((studio.edgeStrength * 0.46).toFixed(3));
  nextRuntime.frameBorderGradientEdgeOpacity = Number((studio.sceneHighlight * 0.029).toFixed(3));
  nextRuntime.frameBorderGradientMidOpacity = Number((studio.sceneHighlight * 0.058).toFixed(3));
  nextRuntime.frameVignetteEdgeOpacity = studio.sceneDepth;
  nextRuntime.frameVignetteAmbientOpacity = Number((studio.sceneDepth * 0.64).toFixed(3));
  nextRuntime.frameVignetteEdgeBlur = Math.round(10 + (studio.sceneSoftness * 70));
  nextRuntime.frameVignetteAmbientBlur = Math.round(80 + (studio.sceneSoftness * 260));
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

  const cv = isPlainObject(source.cv)
    ? clone(source.cv)
    : (looksLikeCvConfig(source) ? clone(source) : clone(DEFAULT_CV_CONFIG));

  const version = Number.isFinite(Number(source.version)) ? Number(source.version) : 1;

  return { version, runtime, shell, portfolio, cv };
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
