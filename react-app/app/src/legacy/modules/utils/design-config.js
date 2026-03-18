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
  'innerWallShineEnabled',
  'innerWallShineBlur',
  'innerWallShineOvershoot',
  'innerWallShineSpread',
  'innerWallShineOpacityLight',
  'innerWallShineOpacityDark',
  'innerWallShineColor',
  'uiIconFramePx',
  'uiIconGlyphPx',
  'frameInnerRadius',
  'frameInnerSurface',
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
  return clone(normalizeDesignSystemConfig(designSystem).runtime);
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
    runtime: clone(normalized.runtime),
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
