#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, extname, relative, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const SHARED_MATERIAL_PATH = 'react-app/app/src/legacy/modules/rendering/materials/simulation-body-material.js';
const SHARED_CONFIG_PATH = 'react-app/app/src/legacy/modules/rendering/materials/simulation-body-material-config.js';
const DESIGN_CONFIG_PATH = 'react-app/app/public/config/design-system.json';
const BEACH_BALL_PATH = 'react-app/app/src/routes/beach-ball-room/BeachBallRoomRuntime.jsx';
const PROFILE_KEYS = [
  'keyLevel',
  'keyReach',
  'ambientLevel',
  'ambientReach',
  'rimBounceLevel',
  'rimBounceReach',
  'shadowDepth',
  'shadowArea',
];
const TOP_LEVEL_CONFIG_KEYS = ['enabled', 'cacheDetailPx', 'light', 'dark'];
const CACHE_DETAIL_OPTIONS = [24, 32, 48];

const canvasRendererContracts = [
  {
    path: 'react-app/app/src/legacy/modules/physics/engine.js',
    imports: ['getSimulationBodyMaterialConfig', 'subscribeSimulationBodyMaterial'],
  },
  {
    path: 'react-app/app/src/legacy/modules/visual/pebble-body.js',
    imports: ['drawSimulationBodyMaterial', 'drawClippedSimulationBodyMaterial'],
  },
  {
    path: 'react-app/app/src/legacy/modules/modes/3d-sphere.js',
    imports: ['drawSimulationBodyMaterial'],
  },
  {
    path: 'react-app/app/src/legacy/modules/modes/3d-cube.js',
    imports: ['drawSimulationBodyMaterial'],
  },
  {
    path: 'react-app/app/src/legacy/modules/modes/starfield-3d.js',
    imports: ['drawSimulationBodyMaterial'],
  },
  {
    path: 'react-app/app/src/legacy/modules/modes/flubber-blob.js',
    imports: ['drawSimulationBodyMaterial'],
  },
  {
    path: 'react-app/app/src/legacy/modules/modes/pressure-crucible.js',
    imports: ['drawSimulationBodyMaterial'],
  },
  {
    path: 'react-app/app/src/routes/flock-of-birds/flockOfBirdsRenderer.js',
    imports: ['drawSimulationBodyMaterial', 'getSimulationBodyMaterialSprite'],
  },
  {
    path: 'react-app/app/src/routes/repel-room/repelRoomRenderer.js',
    imports: ['drawSimulationBodyMaterial', 'getSimulationBodyMaterialSprite'],
  },
  {
    path: 'react-app/app/src/routes/concept-simulations/conceptSimulationRenderer.js',
    imports: ['drawSimulationBodyMaterial', 'getSimulationBodyMaterialSprite'],
  },
];

const webglRendererContracts = [
  {
    path: 'react-app/app/src/routes/napoleon-point-cloud/NapoleonPointCloud.jsx',
    imports: ['getSimulationBodyMaterialAtlas'],
  },
  {
    path: 'react-app/app/src/routes/spatial-scan/SpatialScanPointCloud.jsx',
    imports: ['getSimulationBodyMaterialAtlas'],
  },
  {
    path: BEACH_BALL_PATH,
    imports: ['getSimulationBodyMaterialAtlas'],
  },
];

const allowedCanvasGradientOwners = new Map([
  ['react-app/app/src/routes/flock-of-birds/flockOfBirdsRenderer.js', [
    { owner: 'drawBackground' },
  ]],
  ['react-app/app/src/routes/repel-room/repelRoomRenderer.js', [
    { owner: 'drawState', before: /\bconst materialTheme\b/ },
  ]],
]);

function addFailure(message) {
  failures.push(message);
}

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function readSource(relativePath) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    addFailure(`${relativePath}: expected file is missing`);
    return '';
  }
  return readFileSync(absolutePath, 'utf8');
}

function readJson(relativePath) {
  const source = readSource(relativePath);
  if (!source) return null;
  try {
    return JSON.parse(source);
  } catch (error) {
    addFailure(`${relativePath}: invalid JSON (${error.message})`);
    return null;
  }
}

function sortedKeys(value) {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? Object.keys(value).sort()
    : [];
}

function hasExactKeys(value, expectedKeys) {
  return JSON.stringify(sortedKeys(value)) === JSON.stringify([...expectedKeys].sort());
}

function reportMatches(relativePath, source, entries) {
  for (const entry of entries) {
    entry.pattern.lastIndex = 0;
    let match = entry.pattern.exec(source);
    while (match) {
      addFailure(`${relativePath}:${lineNumberFor(source, match.index)}: ${entry.label}`);
      if (match[0].length === 0) entry.pattern.lastIndex += 1;
      match = entry.pattern.exec(source);
    }
  }
}

function walkSourceFiles(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkSourceFiles(absolutePath));
    } else if (['.js', '.jsx'].includes(extname(entry.name))) {
      files.push(absolutePath);
    }
  }
  return files;
}

function getCanonicalNamedImports(relativePath, source, targetRelativePath) {
  const importedNames = new Set();
  const importPattern = /import\s*\{([\s\S]*?)\}\s*from\s*['"]([^'"]+)['"]/g;
  let match = importPattern.exec(source);
  while (match) {
    const resolvedImport = resolve(root, dirname(relativePath), match[2]);
    if (resolvedImport === resolve(root, targetRelativePath)) {
      for (const importEntry of match[1].split(',')) {
        const importedName = importEntry.trim().split(/\s+as\s+/)[0];
        if (importedName) importedNames.add(importedName);
      }
    }
    match = importPattern.exec(source);
  }
  return importedNames;
}

function assertRendererAdoption(contract) {
  const source = readSource(contract.path);
  if (!source) return;
  const imports = getCanonicalNamedImports(contract.path, source, SHARED_MATERIAL_PATH);
  for (const requiredImport of contract.imports) {
    if (!imports.has(requiredImport)) {
      addFailure(`${contract.path}: must import ${requiredImport} from the shared sphere material baker`);
      continue;
    }
    const usageCount = source.match(new RegExp(`\\b${requiredImport}\\b`, 'g'))?.length || 0;
    if (usageCount < 2) {
      addFailure(`${contract.path}: must use imported sphere material API ${requiredImport}`);
    }
  }
}

function nearestDeclaredFunctionName(source, index) {
  const prefix = source.slice(0, index);
  const pattern = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/g;
  let nearest = null;
  let match = pattern.exec(prefix);
  while (match) {
    nearest = match[1];
    match = pattern.exec(prefix);
  }
  return nearest;
}

function assertNoPerBodyCanvasEffects(relativePath) {
  const source = readSource(relativePath);
  if (!source) return;
  reportMatches(relativePath, source, [
    {
      label: 'per-body Canvas radial gradients are forbidden outside the shared baker',
      pattern: /\.\s*createRadialGradient\s*\(/g,
    },
    {
      label: 'per-body Canvas shadow state is forbidden outside the shared baker',
      pattern: /\.\s*shadow(?:Color|Blur|OffsetX|OffsetY)\b/g,
    },
    {
      label: 'per-body Canvas pixel baking is forbidden outside the shared baker',
      pattern: /(?:\bnew\s+ImageData\s*\(|\.\s*(?:createImageData|getImageData|putImageData)\s*\()/g,
    },
  ]);

  const linearGradientPattern = /\.\s*createLinearGradient\s*\(/g;
  let match = linearGradientPattern.exec(source);
  while (match) {
    const owner = nearestDeclaredFunctionName(source, match.index);
    const rules = allowedCanvasGradientOwners.get(relativePath) || [];
    const isBackgroundGradient = rules.some((rule) => {
      if (rule.owner !== owner) return false;
      if (!rule.before) return true;
      const boundary = rule.before.exec(source);
      return boundary && match.index < boundary.index;
    });
    if (!isBackgroundGradient) {
      addFailure(
        `${relativePath}:${lineNumberFor(source, match.index)}: Canvas gradients are allowed only in declared background renderers`,
      );
    }
    match = linearGradientPattern.exec(source);
  }
}

function assertSingleSharedModulePaths(sourceFiles) {
  const materialAbsolutePath = resolve(root, SHARED_MATERIAL_PATH);
  const configAbsolutePath = resolve(root, SHARED_CONFIG_PATH);
  const pathExpectations = new Map([
    ['simulation-body-material.js', materialAbsolutePath],
    ['simulation-body-material-config.js', configAbsolutePath],
  ]);
  for (const [expectedBasename, expectedPath] of pathExpectations) {
    const matchingFiles = sourceFiles.filter((sourceFile) => basename(sourceFile) === expectedBasename);
    if (matchingFiles.length !== 1 || matchingFiles[0] !== expectedPath) {
      addFailure(`${relative(root, expectedPath)}: must be the only ${expectedBasename} implementation`);
    }
  }
  const importPattern = /\bfrom\s*['"]([^'"]*simulation-body-material(?:-config)?\.js)['"]/g;

  for (const absolutePath of sourceFiles) {
    const relativePath = relative(root, absolutePath);
    const source = readFileSync(absolutePath, 'utf8');
    let match = importPattern.exec(source);
    while (match) {
      const expectedPath = pathExpectations.get(match[1].split('/').at(-1));
      const importedPath = resolve(dirname(absolutePath), match[1]);
      if (importedPath !== expectedPath) {
        addFailure(`${relativePath}:${lineNumberFor(source, match.index)}: sphere material import must resolve to the single shared module`);
      }
      match = importPattern.exec(source);
    }
  }

  const definitionOwners = [
    ['drawSimulationBodyMaterial', materialAbsolutePath],
    ['getSimulationBodyMaterialSprite', materialAbsolutePath],
    ['getSimulationBodyMaterialAtlas', materialAbsolutePath],
    ['normalizeSimulationBodyMaterialConfig', configAbsolutePath],
  ];
  for (const [functionName, expectedOwner] of definitionOwners) {
    const definitionPattern = new RegExp(`\\b(?:export\\s+)?function\\s+${functionName}\\b`);
    for (const absolutePath of sourceFiles) {
      if (absolutePath === expectedOwner) continue;
      const source = readFileSync(absolutePath, 'utf8');
      const match = definitionPattern.exec(source);
      if (match) {
        addFailure(`${relative(root, absolutePath)}:${lineNumberFor(source, match.index)}: ${functionName} must have one shared implementation`);
      }
    }
  }
}

function assertCanonicalProfile(profile, location) {
  if (!hasExactKeys(profile, PROFILE_KEYS)) {
    addFailure(`${location}: must contain exactly ${PROFILE_KEYS.join(', ')}`);
    return;
  }
  for (const key of PROFILE_KEYS) {
    if (!Number.isFinite(profile[key])) {
      addFailure(`${location}.${key}: must be a finite number`);
    }
  }
}

async function assertConfigContract() {
  const configAbsolutePath = resolve(root, SHARED_CONFIG_PATH);
  if (!existsSync(configAbsolutePath)) {
    addFailure(`${SHARED_CONFIG_PATH}: expected file is missing`);
    return;
  }

  let configModule;
  try {
    configModule = await import(pathToFileURL(configAbsolutePath).href);
  } catch (error) {
    addFailure(`${SHARED_CONFIG_PATH}: could not load config normalizer (${error.message})`);
    return;
  }

  const {
    DEFAULT_SIMULATION_BODY_MATERIAL_CONFIG: defaultConfig,
    SIMULATION_BODY_MATERIAL_CACHE_DETAIL_OPTIONS: detailOptions,
    SIMULATION_BODY_MATERIAL_PROFILE_KEYS: exportedProfileKeys,
    normalizeSimulationBodyMaterialConfig: normalize,
  } = configModule;

  if (typeof normalize !== 'function') {
    addFailure(`${SHARED_CONFIG_PATH}: normalizeSimulationBodyMaterialConfig must be exported`);
    return;
  }
  if (JSON.stringify(exportedProfileKeys) !== JSON.stringify(PROFILE_KEYS)) {
    addFailure(`${SHARED_CONFIG_PATH}: profile key export must contain the canonical eight macro controls`);
  }
  if (JSON.stringify(detailOptions) !== JSON.stringify(CACHE_DETAIL_OPTIONS)) {
    addFailure(`${SHARED_CONFIG_PATH}: cache detail options must be exactly 24, 32, and 48`);
  }
  if (!hasExactKeys(defaultConfig, TOP_LEVEL_CONFIG_KEYS)) {
    addFailure(`${SHARED_CONFIG_PATH}: default config must use the canonical top-level shape`);
  }
  if (defaultConfig?.cacheDetailPx !== 24) {
    addFailure(`${SHARED_CONFIG_PATH}: default cache detail must be 24px`);
  }
  assertCanonicalProfile(defaultConfig?.light, `${SHARED_CONFIG_PATH}: default light profile`);
  assertCanonicalProfile(defaultConfig?.dark, `${SHARED_CONFIG_PATH}: default dark profile`);

  for (const option of CACHE_DETAIL_OPTIONS) {
    const normalized = normalize({ cacheDetailPx: option });
    if (normalized.cacheDetailPx !== option) {
      addFailure(`${SHARED_CONFIG_PATH}: normalizer must preserve the allowed ${option}px detail option`);
    }
  }
  for (const unsupportedOption of [0, 16, 25, 64, 96]) {
    const normalized = normalize({ cacheDetailPx: unsupportedOption });
    if (normalized.cacheDetailPx !== 24) {
      addFailure(`${SHARED_CONFIG_PATH}: normalizer must reject unsupported ${unsupportedOption}px detail`);
    }
  }

  const normalized = normalize({
    enabled: false,
    cacheDetailPx: 32,
    cacheDebounceMs: 999,
    spriteFastPath: false,
    light: { ...Object.fromEntries(PROFILE_KEYS.map((key) => [key, 1])), extraCue: 1 },
    dark: { ...Object.fromEntries(PROFILE_KEYS.map((key) => [key, 1])), extraCue: 1 },
  });
  if (!hasExactKeys(normalized, TOP_LEVEL_CONFIG_KEYS)) {
    addFailure(`${SHARED_CONFIG_PATH}: normalizer must strip non-canonical top-level settings`);
  }
  assertCanonicalProfile(normalized.light, `${SHARED_CONFIG_PATH}: normalized light profile`);
  assertCanonicalProfile(normalized.dark, `${SHARED_CONFIG_PATH}: normalized dark profile`);
  if ('cacheDebounceMs' in normalized || 'spriteFastPath' in normalized) {
    addFailure(`${SHARED_CONFIG_PATH}: cache debounce and sprite fast path must not persist in config`);
  }

  const designSystem = readJson(DESIGN_CONFIG_PATH);
  const authoredConfig = designSystem?.shell?.surface?.simulationBodyMaterial;
  if (!authoredConfig) {
    addFailure(`${DESIGN_CONFIG_PATH}: shell.surface.simulationBodyMaterial is required`);
    return;
  }
  if (!hasExactKeys(authoredConfig, TOP_LEVEL_CONFIG_KEYS)) {
    addFailure(`${DESIGN_CONFIG_PATH}: sphere material config must use the canonical top-level shape`);
  }
  if (authoredConfig.cacheDetailPx !== 24) {
    addFailure(`${DESIGN_CONFIG_PATH}: canonical cache detail must default to 24px`);
  }
  assertCanonicalProfile(authoredConfig.light, `${DESIGN_CONFIG_PATH}: light profile`);
  assertCanonicalProfile(authoredConfig.dark, `${DESIGN_CONFIG_PATH}: dark profile`);
  if (!isDeepStrictEqual(normalize(authoredConfig), authoredConfig)) {
    addFailure(`${DESIGN_CONFIG_PATH}: sphere material config must already be normalized`);
  }
}

function assertSharedBakerContract() {
  const materialSource = readSource(SHARED_MATERIAL_PATH);
  if (!materialSource) return;
  const configImports = getCanonicalNamedImports(SHARED_MATERIAL_PATH, materialSource, SHARED_CONFIG_PATH);
  for (const requiredImport of [
    'DEFAULT_SIMULATION_BODY_MATERIAL_CONFIG',
    'SIMULATION_BODY_MATERIAL_CACHE_DEBOUNCE_MS',
    'normalizeSimulationBodyMaterialConfig',
    'resolveSimulationBodyMaterialThemeProfile',
  ]) {
    if (!configImports.has(requiredImport)) {
      addFailure(`${SHARED_MATERIAL_PATH}: must import ${requiredImport} from the shared config module`);
    }
  }
  for (const requiredApi of [
    'drawSimulationBodyMaterial',
    'drawClippedSimulationBodyMaterial',
    'getSimulationBodyMaterialSprite',
    'getSimulationBodyMaterialAtlas',
  ]) {
    const apiPattern = new RegExp(`\\bexport\\s+function\\s+${requiredApi}\\b`);
    if (!apiPattern.test(materialSource)) {
      addFailure(`${SHARED_MATERIAL_PATH}: must export ${requiredApi}`);
    }
  }
  if (!/\bcreateImageData\s*\(/.test(materialSource) || !/\bputImageData\s*\(/.test(materialSource)) {
    addFailure(`${SHARED_MATERIAL_PATH}: shared baker must own the sphere pixel bake`);
  }
  if (!/\bspriteCache\b/.test(materialSource) || !/\batlasCache\b/.test(materialSource)) {
    addFailure(`${SHARED_MATERIAL_PATH}: shared baker must retain sprite and atlas caches`);
  }
}

function preserveOpacityAndMaterialContracts() {
  const flockOpacityFiles = [
    'react-app/app/public/config/flock-of-birds-demo.json',
    'react-app/app/src/routes/flock-of-birds/flockOfBirdsControls.js',
    'react-app/app/src/routes/flock-of-birds/flockOfBirdsRenderer.js',
  ];
  for (const relativePath of flockOpacityFiles) {
    const source = readSource(relativePath);
    reportMatches(relativePath, source, [{
      label: 'Convergence must use direct opaque palette fills',
      pattern: /\b(?:colorOpacity|depthOpacity|mutedAmount)\b/g,
    }]);
  }

  const pressurePath = 'react-app/app/src/legacy/modules/modes/pressure-crucible.js';
  reportMatches(pressurePath, readSource(pressurePath), [{
    label: 'Pressure Field bodies must remain opaque',
    pattern: /\b(?:ball\.alpha|globalAlpha)\b/g,
  }]);

  const opaqueDefaultFiles = [
    'react-app/app/public/config/napoleon-point-cloud-demo.json',
    'react-app/app/public/config/spatial-scan-demo.json',
    'react-app/app/src/legacy/modules/core/state.js',
    'react-app/app/src/legacy/modules/modes/3d-sphere.js',
    'react-app/app/src/legacy/modules/ui/control-registry.js',
    'react-app/app/src/routes/concept-simulations/conceptSimulationConfigs.js',
    'react-app/app/src/routes/napoleon-point-cloud/NapoleonPointCloud.jsx',
    'react-app/app/src/routes/spatial-scan/SpatialScanPointCloud.jsx',
  ];
  const softDefaultPatterns = [
    { label: 'point-cloud front/default opacity must be 1', pattern: /\bdotOpacity["']?\s*[:=]\s*0\./g },
    { label: 'point-cloud material opacity must initialize at 1', pattern: /\buOpacity\s*:\s*\{\s*value\s*:\s*0\./g },
    { label: 'Continuity front opacity must default to 1', pattern: /\bsphere3dAlphaMax["']?\s*[:=]\s*0\./g },
    { label: 'Continuity front opacity fallback must be 1', pattern: /\bDEFAULT_ALPHA_MAX\s*=\s*0\./g },
  ];
  for (const relativePath of opaqueDefaultFiles) {
    reportMatches(relativePath, readSource(relativePath), softDefaultPatterns);
  }

  const designSystemSource = readSource(DESIGN_CONFIG_PATH);
  reportMatches(
    DESIGN_CONFIG_PATH,
    designSystemSource,
    softDefaultPatterns.filter(({ label }) => label !== 'point-cloud front/default opacity must be 1'),
  );

  const beachBallSource = readSource(BEACH_BALL_PATH);
  if (/\bMesh(?:Standard|Physical|Phong|Lambert)Material\b/.test(beachBallSource)) {
    addFailure(`${BEACH_BALL_PATH}: lit Three.js mesh materials are forbidden; use the shared matte atlas`);
  }
  if (!/\brenderer\.shadowMap\.enabled\s*=\s*false\b/.test(beachBallSource)) {
    addFailure(`${BEACH_BALL_PATH}: shadow maps must remain disabled`);
  }
}

const sourceFiles = walkSourceFiles(resolve(root, 'react-app/app/src'));
assertSingleSharedModulePaths(sourceFiles);
assertSharedBakerContract();
await assertConfigContract();

for (const contract of [...canvasRendererContracts, ...webglRendererContracts]) {
  assertRendererAdoption(contract);
}
for (const { path: relativePath } of canvasRendererContracts) {
  assertNoPerBodyCanvasEffects(relativePath);
}
preserveOpacityAndMaterialContracts();

if (failures.length) {
  console.error('FAIL: sphere body material contract violated');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PASS: renderers use the shared cached matte sphere body material');
