#!/usr/bin/env node

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const forbiddenFiles = [
  'react-app/app/src/legacy/modules/visual/ball-rim.js',
  'react-app/app/public/depth-test-a.html',
  'react-app/app/public/depth-test-b.html',
];

const circleRendererFiles = [
  'react-app/app/src/legacy/modules/physics/Ball.js',
  'react-app/app/src/legacy/modules/physics/engine.js',
  'react-app/app/src/legacy/modules/visual/pebble-body.js',
  'react-app/app/src/legacy/modules/portfolio/pit-mode.js',
  'react-app/app/src/routes/contact/contactRippleRenderer.js',
  'react-app/app/src/routes/concept-simulations/conceptSimulationRenderer.js',
  'react-app/app/src/routes/flock-of-birds/flockOfBirdsRenderer.js',
  'react-app/app/src/routes/mineral-growth/mineralGrowthRenderer.js',
  'react-app/app/src/routes/repel-room/repelRoomRenderer.js',
  'react-app/app/src/legacy/modules/modes/pressure-crucible.js',
];

const forbiddenSourcePatterns = [
  { label: 'circle rim renderer', pattern: /draw(?:Ball|PebbleBody|PortfolioBody|ContactBall)Rim/gi },
  { label: 'circle rim feature flag', pattern: /PORTFOLIO_BODY_RIM/gi },
  { label: 'obsolete rim render option', pattern: /skipRims/gi },
  { label: 'canvas shadow property', pattern: /\bshadow(?:Color|Blur|OffsetX|OffsetY)\b/g },
  { label: 'directional rim wording', pattern: /directional (?:depth )?(?:edge|rim)/gi },
];

const forbiddenDocumentationPatterns = [
  /Screen-Locked Rim Lighting/gi,
  /highlight\/shadow rim/gi,
  /world-locked gradient rim/gi,
  /soft but readable edge lighting/gi,
  /readable light edge and dark edge/gi,
];

function lineNumberFor(source, index) {
  return source.slice(0, index).split('\n').length;
}

function reportMatches(relativePath, source, patterns) {
  for (const entry of patterns) {
    const pattern = entry.pattern || entry;
    pattern.lastIndex = 0;
    let match = pattern.exec(source);
    while (match) {
      failures.push(`${relativePath}:${lineNumberFor(source, match.index)}: ${entry.label || 'stale rim documentation'}`);
      if (match[0].length === 0) pattern.lastIndex += 1;
      match = pattern.exec(source);
    }
  }
}

function walkMarkdown(directory) {
  const entries = readdirSync(directory, { withFileTypes: true });
  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      walkMarkdown(absolutePath);
    } else if (extname(entry.name) === '.md') {
      const relativePath = absolutePath.slice(root.length + 1);
      reportMatches(relativePath, readFileSync(absolutePath, 'utf8'), forbiddenDocumentationPatterns);
    }
  }
}

for (const relativePath of forbiddenFiles) {
  if (existsSync(resolve(root, relativePath))) {
    failures.push(`${relativePath}: obsolete shaded-circle asset must stay removed`);
  }
}

for (const relativePath of circleRendererFiles) {
  const absolutePath = resolve(root, relativePath);
  if (!existsSync(absolutePath)) {
    failures.push(`${relativePath}: expected circle renderer is missing`);
    continue;
  }
  reportMatches(relativePath, readFileSync(absolutePath, 'utf8'), forbiddenSourcePatterns);
}

const beachBallRuntime = readFileSync(
  resolve(root, 'react-app/app/src/routes/beach-ball-room/BeachBallRoomRuntime.jsx'),
  'utf8',
);
if (/Mesh(?:Standard|Physical|Phong|Lambert)Material/.test(beachBallRuntime)) {
  failures.push('react-app/app/src/routes/beach-ball-room/BeachBallRoomRuntime.jsx: shaded Three.js material is forbidden');
}
if (!/renderer\.shadowMap\.enabled\s*=\s*false/.test(beachBallRuntime)) {
  failures.push('react-app/app/src/routes/beach-ball-room/BeachBallRoomRuntime.jsx: shadow maps must remain disabled');
}

const flockOpacityFiles = [
  'react-app/app/public/config/flock-of-birds-demo.json',
  'react-app/app/src/routes/flock-of-birds/flockOfBirdsControls.js',
  'react-app/app/src/routes/flock-of-birds/flockOfBirdsRenderer.js',
];
for (const relativePath of flockOpacityFiles) {
  const source = readFileSync(resolve(root, relativePath), 'utf8');
  reportMatches(relativePath, source, [
    { label: 'Convergence must use direct opaque palette fills', pattern: /\b(?:colorOpacity|depthOpacity|mutedAmount)\b/g },
  ]);
}

const pressureField = readFileSync(
  resolve(root, 'react-app/app/src/legacy/modules/modes/pressure-crucible.js'),
  'utf8',
);
reportMatches('react-app/app/src/legacy/modules/modes/pressure-crucible.js', pressureField, [
  { label: 'Pressure Field bodies must remain opaque', pattern: /\b(?:ball\.alpha|globalAlpha)\b/g },
]);

const opaqueDefaultFiles = [
  'react-app/app/public/config/design-system.json',
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
  reportMatches(relativePath, readFileSync(resolve(root, relativePath), 'utf8'), softDefaultPatterns);
}

walkMarkdown(resolve(root, 'docs'));

if (failures.length) {
  console.error('FAIL: flat circle material contract violated');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('PASS: all circle and pebble renderers use clean, flat materials');
