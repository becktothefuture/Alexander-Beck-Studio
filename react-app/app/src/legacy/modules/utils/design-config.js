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

const DEFAULT_CV_CONFIG = {
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

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function clone(value) {
  return isPlainObject(value) ? JSON.parse(JSON.stringify(value)) : {};
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
    if (port === '8012') return true;
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
    ? clone(source.runtime)
    : (looksLikeRuntimeConfig(source) ? clone(source) : {});

  const shell = isPlainObject(source.shell)
    ? clone(source.shell)
    : (looksLikeShellConfig(source) ? clone(source) : {});

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
  const [runtime, shell, portfolio] = await Promise.all([
    loadFirstJson(LEGACY_RUNTIME_PATHS),
    loadFirstJson(LEGACY_SHELL_PATHS),
    loadFirstJson(LEGACY_PORTFOLIO_PATHS),
  ]);

  return normalizeDesignSystemConfig({
    version: 1,
    runtime: runtime || {},
    shell: shell || {},
    portfolio: portfolio || {},
    cv: DEFAULT_CV_CONFIG,
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
