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
const FOUNDATION_MODE_PATH = 'react-app/app/src/legacy/modules/modes/ball-pit.js';
const CORE_STATE_PATH = 'react-app/app/src/legacy/modules/core/state.js';
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

const primaryRouteSemanticCoverage = Object.freeze({
  Home: Object.freeze([
    {
      path: 'react-app/app/src/legacy/modules/physics/engine.js',
      renderer: 'canvas',
      imports: [
        'getSimulationBodyMaterialConfig',
        'prewarmSimulationBodyMaterial',
        'subscribeSimulationBodyMaterial',
      ],
    },
    {
      path: 'react-app/app/src/legacy/modules/visual/pebble-body.js',
      renderer: 'canvas',
      imports: ['drawSimulationBodyMaterial', 'drawClippedSimulationBodyMaterial'],
    },
    ...[
      '3d-sphere.js',
      '3d-cube.js',
      'starfield-3d.js',
      'flubber-blob.js',
      'pressure-crucible.js',
    ].map((fileName) => ({
      path: `react-app/app/src/legacy/modules/modes/${fileName}`,
      renderer: 'canvas',
      imports: ['drawSimulationBodyMaterial'],
    })),
    ...[
      'react-app/app/src/routes/flock-of-birds/flockOfBirdsRenderer.js',
      'react-app/app/src/routes/repel-room/repelRoomRenderer.js',
      'react-app/app/src/routes/concept-simulations/conceptSimulationRenderer.js',
    ].map((path) => ({
      path,
      renderer: 'canvas',
      imports: ['drawSimulationBodyMaterial', 'getSimulationBodyMaterialSprite'],
    })),
    ...[
      'react-app/app/src/routes/napoleon-point-cloud/NapoleonPointCloud.jsx',
      'react-app/app/src/routes/spatial-scan/SpatialScanPointCloud.jsx',
      BEACH_BALL_PATH,
    ].map((path) => ({
      path,
      renderer: 'webgl',
      imports: ['getSimulationBodyMaterialAtlas'],
    })),
    {
      path: 'react-app/app/src/legacy/modules/ui/quote-display.js',
      renderer: 'canvas',
      imports: [
        'getSimulationBodyMaterialSprite',
        'subscribeSimulationBodyMaterial',
      ],
    },
  ]),
  'Work / Portfolio': Object.freeze([
    {
      path: 'react-app/app/src/legacy/modules/portfolio/portfolio-speed-field.js',
      renderer: 'canvas',
      imports: [
        'getSimulationBodyMaterialConfig',
        'getSimulationBodyMaterialSprite',
        'subscribeSimulationBodyMaterial',
      ],
    },
    {
      path: 'react-app/app/src/legacy/modules/portfolio/pit-mode.js',
      renderer: 'canvas',
      imports: ['drawClippedSimulationBodyMaterial'],
    },
  ]),
  About: Object.freeze([
    {
      path: 'react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx',
      renderer: 'webgl',
      imports: ['getSimulationBodyMaterialAtlas', 'subscribeSimulationBodyMaterial'],
    },
  ]),
  Contact: Object.freeze([
    {
      path: 'react-app/app/src/routes/contact/contactRippleRenderer.js',
      renderer: 'canvas',
      imports: [
        'getSimulationBodyMaterialConfig',
        'getSimulationBodyMaterialSprite',
        'subscribeSimulationBodyMaterial',
      ],
    },
  ]),
});

const rendererContracts = Object.entries(primaryRouteSemanticCoverage).flatMap(
  ([route, contracts]) => contracts.map((contract) => ({ ...contract, route })),
);
const canvasRendererContracts = rendererContracts.filter(({ renderer }) => renderer === 'canvas');
const webglRendererContracts = rendererContracts.filter(({ renderer }) => renderer === 'webgl');

const allowedCanvasGradientOwners = new Map([
  ['react-app/app/src/routes/flock-of-birds/flockOfBirdsRenderer.js', [
    { owner: 'drawBackground' },
  ]],
  ['react-app/app/src/routes/repel-room/repelRoomRenderer.js', [
    { owner: 'drawState', before: /\bconst materialTheme\b/ },
  ]],
  ['react-app/app/src/legacy/modules/portfolio/portfolio-speed-field.js', [
    { owner: 'buildMaskGradient' },
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

function assertRequiredSourcePatterns(relativePath, requirements) {
  const source = readSource(relativePath);
  if (!source) return;
  for (const { label, pattern } of requirements) {
    pattern.lastIndex = 0;
    if (!pattern.test(source)) {
      addFailure(`${relativePath}: ${label}`);
    }
  }
}

function assertPrimaryRouteSemanticContracts() {
  const expectedRoutes = ['Home', 'Work / Portfolio', 'About', 'Contact'];
  if (JSON.stringify(Object.keys(primaryRouteSemanticCoverage)) !== JSON.stringify(expectedRoutes)) {
    addFailure('primary route sphere coverage must explicitly include Home, Work / Portfolio, About, and Contact');
  }

  assertRequiredSourcePatterns(
    'react-app/app/src/legacy/modules/physics/engine.js',
    [
      {
        label: 'Home legacy bodies must prewarm the active palette outside the render loop',
        pattern: /function\s+prewarmSharedMaterialPalette[\s\S]{0,520}?prewarmSimulationBodyMaterial\s*\(\s*colors/,
      },
      {
        label: 'Home legacy material invalidation must immediately prewarm the current palette',
        pattern: /subscribeSimulationBodyMaterial\s*\([\s\S]{0,240}?prewarmSharedMaterialThemes\s*\(\s*\)/,
      },
      {
        label: 'Home legacy palette changes must prewarm before ordinary body frames',
        pattern: /subscribeSimulationPalette\s*\([\s\S]{0,180}?prewarmSharedMaterialThemes\s*\(\s*\)/,
      },
    ],
  );

  assertRequiredSourcePatterns(
    'react-app/app/src/legacy/modules/ui/quote-display.js',
    [
      {
        label: 'Home quote puck must request a shared cached sphere sprite',
        pattern: /\bconst\s+sprite\s*=\s*getSimulationBodyMaterialSprite\s*\(/,
      },
      {
        label: 'Home quote puck must draw the shared sprite Canvas',
        pattern: /\bcontext\.drawImage\s*\(\s*sprite\.canvas\b/,
      },
      {
        label: 'Home quote puck flat fill must be guarded by a missing shared sprite',
        pattern: /if\s*\(\s*!sprite\?\.canvas\s*\)\s*\{[\s\S]{0,260}?ballFinish\s*=\s*['"]flat-fill['"][\s\S]{0,100}?\breturn\b/,
      },
      {
        label: 'Home quote puck must expose cached-sphere-sticker after a successful draw',
        pattern: /ballFinish\s*=\s*['"]cached-sphere-sticker['"]/,
      },
      {
        label: 'Home quote puck must rebuild its cached material when the shared palette changes',
        pattern: /paletteChangedCleanup\s*=\s*subscribeSimulationPalette\s*\(\s*syncQuoteMaterial\s*\)/,
      },
      {
        label: 'Home quote puck must release its palette subscription on route teardown',
        pattern: /paletteChangedCleanup\?\.\(\s*\);[\s\S]{0,80}?paletteChangedCleanup\s*=\s*null/,
      },
    ],
  );

  assertRequiredSourcePatterns(
    'react-app/app/src/legacy/modules/portfolio/portfolio-speed-field.js',
    [
      {
        label: 'Portfolio speed field must cache shared sprites for the active palette',
        pattern: /bodyMaterialSprites\s*=\s*this\.bodyMaterialEnabled\s*\?[\s\S]{0,180}?\.map\(\s*\(color\)\s*=>\s*getSimulationBodyMaterialSprite\s*\(/,
      },
      {
        label: 'Portfolio speed field must guard sphere drawing with enabled, populated shared sprites',
        pattern: /const\s+materialEnabled\s*=\s*this\.bodyMaterialEnabled\s*&&\s*this\.bodyMaterialSprites\.length\s*>\s*0/,
      },
      {
        label: 'Portfolio speed field must draw shared sprite Canvases when material is available',
        pattern: /if\s*\(materialEnabled\)\s*\{[\s\S]{0,1200}?\.drawImage\s*\([\s\S]{0,100}?sprite\.canvas/,
      },
      {
        label: 'Portfolio speed field flat circles must remain the guarded material fallback',
        pattern: /if\s*\(materialEnabled\)\s*\{[\s\S]{0,1800}?\}\s*else\s*\{[\s\S]{0,1000}?\.arc\s*\(/,
      },
      {
        label: 'Portfolio speed field must identify cached and flat fallback finishes',
        pattern: /portfolioParticleFinish\s*=\s*materialEnabled\s*\?\s*['"]cached-sphere-sticker['"]\s*:\s*['"]flat-fill['"]/,
      },
    ],
  );

  assertRequiredSourcePatterns(
    'react-app/app/src/legacy/modules/portfolio/pit-mode.js',
    [
      {
        label: 'Portfolio pit fallback must render its pebble path through the shared clipped material API',
        pattern: /const\s+materialDrawn\s*=\s*drawClippedSimulationBodyMaterial\s*\(/,
      },
      {
        label: 'Portfolio pit flat pebble fill must be guarded by a failed shared material draw',
        pattern: /if\s*\(\s*!materialDrawn\s*\)\s*\{[\s\S]{0,320}?fillStyle\s*=\s*ball\.color[\s\S]{0,220}?\.fill\s*\(\s*\)/,
      },
    ],
  );

  assertRequiredSourcePatterns(
    'react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx',
    [
      {
        label: 'About points must request the shared material atlas',
        pattern: /\bgetSimulationBodyMaterialAtlas\s*\(\s*materialColors\b/,
      },
      {
        label: 'About discipline balls must upload the shared atlas Canvas to WebGL',
        pattern: /new\s+THREE\.CanvasTexture\s*\(\s*atlas\.canvas\s*\)/,
      },
      {
        label: 'About sphere atlas must preserve Canvas top-to-bottom orientation for gl_PointCoord',
        pattern: /new\s+THREE\.CanvasTexture\s*\(\s*atlas\.canvas\s*\)[\s\S]{0,240}?texture\.flipY\s*=\s*false/,
      },
      {
        label: 'About must sample the atlas only for readable circles',
        pattern: /uUseMaterialAtlas\s*>\s*0\.5\s*&&\s*pointMaterialWeight\s*>\s*0\.001[\s\S]{0,720}?texture2D\s*\(\s*uMaterialAtlas\b/,
      },
      {
        label: 'About meaningful circles must cross one fixed 10 CSS pixel threshold',
        pattern: /const\s+MATERIAL_POINT_THRESHOLD_PX\s*=\s*10;/,
      },
      {
        label: 'About meaningful circles must cross that threshold through a soft two-pixel band',
        pattern: /readableMaterialWeight\s*=\s*smoothstep\([\s\S]{0,180}?uMaterialPointThresholdPx\s*-\s*1\.0[\s\S]{0,180}?uMaterialPointThresholdPx\s*\+\s*1\.0/,
      },
      {
        label: 'About microscopic point material must remain the guarded flat fallback',
        pattern: /if\s*\(uUseMaterialAtlas[\s\S]{0,1600}?\breturn;[\s\S]{0,180}?gl_FragColor\s*=\s*vec4\(pointTint\b/,
      },
      {
        label: 'About must identify cached, thresholded, and flat point finishes',
        pattern: /aboutPointMaterialFinish\s*=\s*nextAtlas\s*\?\s*['"]cached-sphere-sticker['"]\s*:\s*['"]flat-fill['"][\s\S]{0,180}?aboutPointMaterialPolicy\s*=\s*nextAtlas\s*\?\s*['"]meaningful-size-threshold['"]\s*:\s*['"]flat-fill['"]/,
      },
    ],
  );

  assertRequiredSourcePatterns(
    'react-app/app/src/routes/playground/spatial/dotFieldRenderer.js',
    [
      {
        label: 'Playground grid must remain a neutral direct flat fill',
        pattern: /fillStyle\s*=\s*neutralColor;[\s\S]{0,180}?drawNeutralDots\s*\(/,
      },
    ],
  );

  assertRequiredSourcePatterns(
    'react-app/app/src/routes/contact/contactRippleRenderer.js',
    [
      {
        label: 'Contact ripple balls must request the shared cached sphere sprite',
        pattern: /\bconst\s+material\s*=\s*getSimulationBodyMaterialSprite\s*\(/,
      },
      {
        label: 'Contact ripple balls must draw the shared sprite Canvas when it is available',
        pattern: /if\s*\(material\?\.canvas\)\s*\{[\s\S]{0,260}?\.drawImage\s*\([\s\S]{0,100}?material\.canvas/,
      },
      {
        label: 'Contact flat circles must remain the guarded missing-sprite fallback',
        pattern: /if\s*\(material\?\.canvas\)\s*\{[\s\S]{0,420}?\breturn\s+sprite;[\s\S]{0,180}?\.arc\s*\(/,
      },
      {
        label: 'Contact frame drawing must use the cached local sprite instead of rebuilding ball shading',
        pattern: /function\s+drawBall\s*\([\s\S]{0,360}?\.drawImage\s*\(\s*sprite\b/,
      },
      {
        label: 'Contact must identify cached and flat fallback finishes',
        pattern: /contactRippleBallFinish\s*=\s*bodyMaterialEnabled\s*\?\s*['"]cached-sphere-sticker['"]\s*:\s*['"]flat-fill['"]/,
      },
    ],
  );
}

function nearestDeclaredFunctionName(source, index) {
  const prefix = source.slice(0, index);
  const pattern = /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(|^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^;{}]*\)\s*\{/gm;
  const controlKeywords = new Set(['if', 'for', 'while', 'switch', 'catch']);
  let nearest = null;
  let match = pattern.exec(prefix);
  while (match) {
    const name = match[1] || match[2];
    if (!controlKeywords.has(name)) nearest = name;
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
  if (!/\bMAX_SPHERE_CHROMA_SCALE\s*=\s*1\s*;/.test(materialSource)) {
    addFailure(`${SHARED_MATERIAL_PATH}: sphere lighting must not amplify canonical palette chroma`);
  }
  if (!/\bMAX_SPHERE_HUE_SHIFT_DEGREES\s*=\s*1\.5\s*;/.test(materialSource)) {
    addFailure(`${SHARED_MATERIAL_PATH}: sphere lighting hue drift must remain capped at 1.5 degrees`);
  }
}

function assertFoundationMobileDensityContract() {
  const modeSource = readSource(FOUNDATION_MODE_PATH);
  const stateSource = readSource(CORE_STATE_PATH);
  if (!/\bFOUNDATION_MOBILE_COUNT_MULTIPLIER\s*=\s*2\s*;/.test(modeSource)) {
    addFailure(`${FOUNDATION_MODE_PATH}: mobile Foundation must request twice the base body count`);
  }
  if (!/\[MODES\.PIT\]\s*:\s*\{\s*desktop:\s*320,\s*mobile:\s*440\s*\}/.test(stateSource)) {
    addFailure(`${CORE_STATE_PATH}: the mobile Foundation budget must allow the doubled body field`);
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
assertFoundationMobileDensityContract();
await assertConfigContract();

for (const contract of [...canvasRendererContracts, ...webglRendererContracts]) {
  assertRendererAdoption(contract);
}
assertPrimaryRouteSemanticContracts();
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
