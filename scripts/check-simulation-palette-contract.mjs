import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  DEFAULT_SIMULATION_COLOR_DISTRIBUTION,
  FALLBACK_SIMULATION_PALETTE_COLORS,
  SIMULATION_MATERIAL_ROLE_COUNT,
  SIMULATION_PALETTE_SIZE,
  createSimulationColorThresholds,
  createSimulationMaterialSequence,
  resolveSimulationMaterialColorIndex,
  resolveSimulationColorDistribution,
  resolveSimulationPaletteColors,
  selectSimulationMaterialRole,
} from '../react-app/app/src/palette/simulationPaletteContract.js';
import { createSimulationPaletteController } from '../react-app/app/src/palette/simulationPaletteController.js';
import { LONDON_WEATHER_PALETTES } from '../react-app/app/src/palette/londonPalettes.js';
import { getNextTimeOfDayPaletteBoundary } from '../react-app/app/src/palette/timeOfDayPalette.js';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const designSystem = JSON.parse(readFileSync(
  resolve(repoRoot, 'react-app/app/public/config/design-system.json'),
  'utf8',
));

function compactDistribution(distribution) {
  return distribution.map(({ roleId, label, colorIndex, weight }) => ({
    roleId,
    label,
    colorIndex,
    weight,
  }));
}

const authoredDistribution = designSystem.runtime?.colorDistribution || [];
assert.equal(authoredDistribution.length, SIMULATION_MATERIAL_ROLE_COUNT);
assert.deepEqual(
  compactDistribution(DEFAULT_SIMULATION_COLOR_DISTRIBUTION),
  compactDistribution(authoredDistribution),
  'The emergency fallback must be byte-equivalent to the canonical authored distribution.',
);

const resolvedDistribution = resolveSimulationColorDistribution(authoredDistribution);
assert.deepEqual(compactDistribution(resolvedDistribution), compactDistribution(authoredDistribution));
assert.equal(new Set(resolvedDistribution.map((row) => row.roleId)).size, SIMULATION_MATERIAL_ROLE_COUNT);

const thresholds = createSimulationColorThresholds(authoredDistribution);
assert.equal(thresholds.at(-1)?.threshold, 1);
for (let index = 1; index < thresholds.length; index += 1) {
  assert.ok(thresholds[index].threshold > thresholds[index - 1].threshold);
}
assert.equal(selectSimulationMaterialRole(0, resolvedDistribution)?.roleId, 'product-design');
assert.equal(selectSimulationMaterialRole(1, resolvedDistribution)?.roleId, 'parametric-systems');
assert.equal(resolveSimulationMaterialColorIndex('motion-3d', resolvedDistribution), 6);
assert.equal(resolveSimulationMaterialColorIndex(4, resolvedDistribution), 7);
const reorderedDistribution = resolveSimulationColorDistribution([
  ...authoredDistribution.slice(1),
  authoredDistribution[0],
]);
assert.equal(
  resolveSimulationMaterialColorIndex(5, reorderedDistribution),
  0,
  'Palette index zero must remain a valid material mapping regardless of role order.',
);

const sequence = createSimulationMaterialSequence(100, { distribution: authoredDistribution });
const actualCounts = new Map();
sequence.forEach((role) => actualCounts.set(role.roleId, (actualCounts.get(role.roleId) || 0) + 1));
resolvedDistribution.forEach((row) => assert.equal(actualCounts.get(row.roleId), row.weight));
assert.equal(new Set(sequence.slice(0, 12).map((role) => role.roleId)).size, SIMULATION_MATERIAL_ROLE_COUNT);
assert.deepEqual(
  createSimulationMaterialSequence(0, { distribution: authoredDistribution }),
  [],
  'A zero-length material request must remain empty.',
);

assert.deepEqual(
  compactDistribution(resolveSimulationColorDistribution(authoredDistribution.slice(0, 2))),
  compactDistribution(DEFAULT_SIMULATION_COLOR_DISTRIBUTION),
  'An incomplete distribution must fail atomically to the shared fallback.',
);
assert.deepEqual(
  compactDistribution(resolveSimulationColorDistribution([
    ...authoredDistribution,
    { roleId: 'invalid-extra', label: 'Invalid Extra', colorIndex: 0, weight: 1 },
  ])),
  compactDistribution(DEFAULT_SIMULATION_COLOR_DISTRIBUTION),
  'An over-complete distribution must fail atomically to the shared fallback.',
);
assert.deepEqual(
  compactDistribution(resolveSimulationColorDistribution(authoredDistribution.map((row, index) => (
    index === 1 ? { ...row, roleId: authoredDistribution[0].roleId } : row
  )))),
  compactDistribution(DEFAULT_SIMULATION_COLOR_DISTRIBUTION),
  'A distribution with duplicate role IDs must fail atomically to the shared fallback.',
);
assert.strictEqual(
  resolveSimulationPaletteColors(['#ffffff']),
  FALLBACK_SIMULATION_PALETTE_COLORS,
  'An incomplete palette must fail atomically without a partial array.',
);

LONDON_WEATHER_PALETTES.forEach((palette) => {
  const resolvedPalette = resolveSimulationPaletteColors(palette.light);
  assert.equal(resolvedPalette.length, SIMULATION_PALETTE_SIZE);
  assert.deepEqual(resolvedPalette, palette.light);
});

for (const startHour of [0, 3, 6, 9, 12, 15, 18, 21]) {
  let clock = new Date(2026, 6, 18, startHour, 0, 0, 0);
  const projections = [];
  const controller = createSimulationPaletteController({
    now: () => new Date(clock.getTime()),
    project: (snapshot) => projections.push(snapshot),
  });
  const initial = controller.getSnapshot();
  assert.equal(initial.colors.length, 8);
  assert.equal(initial.distribution.length, 6);
  assert.ok(Object.isFrozen(initial));
  assert.ok(Object.isFrozen(initial.colors));
  assert.ok(Object.isFrozen(initial.distribution));

  const notifications = [];
  const unsubscribe = controller.subscribe((snapshot) => notifications.push(snapshot.generation));
  assert.deepEqual(notifications, [initial.generation], 'Subscriptions must emit the current snapshot immediately.');
  clock = new Date(clock.getTime() + (3 * 60 * 60 * 1000) + 100);
  const next = controller.reconcile();
  assert.equal(next.generation, initial.generation + 1);
  assert.deepEqual(notifications, [initial.generation, next.generation]);
  assert.equal(projections.at(-1)?.generation, next.generation);
  unsubscribe();
}

let delayedClock = new Date(2026, 6, 18, 22, 15, 0, 0);
const delayedController = createSimulationPaletteController({
  now: () => new Date(delayedClock.getTime()),
  project: () => {},
});
const delayedInitial = delayedController.getSnapshot();
delayedClock = new Date(2026, 6, 19, 6, 20, 0, 0);
const delayedNext = delayedController.reconcile();
assert.equal(delayedNext.periodId, 'morning');
assert.equal(delayedNext.generation, delayedInitial.generation + 1, 'Resume commits only the current generation.');

const originalWindow = globalThis.window;
const originalDocument = globalThis.document;
const originalCustomEvent = globalThis.CustomEvent;
const lifecycleClock = { value: new Date(2026, 6, 18, 8, 59, 59, 900) };
const lifecycleWindow = new EventTarget();
const lifecycleDocument = new EventTarget();
const cssValues = new Map();
const timers = new Map();
let nextTimerId = 1;
Object.assign(lifecycleDocument, {
  visibilityState: 'visible',
  documentElement: {
    dataset: {},
    style: { setProperty: (name, value) => cssValues.set(name, value) },
  },
});
if (typeof globalThis.CustomEvent !== 'function') {
  globalThis.CustomEvent = class CustomEvent extends Event {
    constructor(type, options = {}) {
      super(type);
      this.detail = options.detail;
    }
  };
}
globalThis.window = lifecycleWindow;
globalThis.document = lifecycleDocument;
try {
  const lifecycleController = createSimulationPaletteController({
    now: () => new Date(lifecycleClock.value.getTime()),
    setTimer: (callback, delay) => {
      const id = nextTimerId++;
      timers.set(id, { callback, delay });
      return id;
    },
    clearTimer: (id) => timers.delete(id),
  });
  lifecycleController.start();
  assert.equal(timers.size, 1, 'The shell controller must own exactly one boundary timer.');
  assert.equal([...timers.values()][0]?.delay, 132, 'The boundary timer must not be delayed by a coarse minimum clamp.');
  assert.equal(cssValues.size, SIMULATION_PALETTE_SIZE);
  const diagnosticDescriptor = Object.getOwnPropertyDescriptor(
    lifecycleWindow,
    '__ABS_SIMULATION_PALETTE__',
  );
  assert.equal(typeof diagnosticDescriptor?.get, 'function');
  assert.equal(diagnosticDescriptor?.set, undefined, 'Production diagnostics must be getter-only.');

  const beforeBoundary = lifecycleController.getSnapshot();
  lifecycleClock.value = new Date(2026, 6, 18, 9, 0, 0, 50);
  lifecycleWindow.dispatchEvent(new Event('focus'));
  const afterBoundary = lifecycleController.getSnapshot();
  assert.equal(afterBoundary.generation, beforeBoundary.generation + 1);
  assert.equal(timers.size, 1, 'Lifecycle reconciliation must replace, not duplicate, the timer.');
  assert.equal(lifecycleDocument.documentElement.dataset.absSimulationPaletteGeneration, String(afterBoundary.generation));
  afterBoundary.colors.forEach((color, index) => {
    assert.equal(cssValues.get(`--ball-${index + 1}`), color);
  });

  lifecycleController.stop();
  assert.equal(timers.size, 0, 'Stopping the shell controller must clear its boundary timer.');
  lifecycleClock.value = new Date(2026, 6, 18, 12, 0, 0, 50);
  lifecycleWindow.dispatchEvent(new Event('focus'));
  assert.equal(lifecycleController.getSnapshot(), afterBoundary, 'Stopped lifecycle listeners must not reconcile.');
} finally {
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
  if (originalDocument === undefined) delete globalThis.document;
  else globalThis.document = originalDocument;
  if (originalCustomEvent === undefined) delete globalThis.CustomEvent;
  else globalThis.CustomEvent = originalCustomEvent;
}

const previousTimezone = process.env.TZ;
process.env.TZ = 'Europe/London';
const springNow = new Date(2026, 2, 29, 0, 30, 0, 0);
const springBoundary = getNextTimeOfDayPaletteBoundary(springNow);
assert.equal(springBoundary.getHours(), 3);
assert.equal(springBoundary.getTime() - springNow.getTime(), 90 * 60 * 1000);
const autumnNow = new Date(2026, 9, 25, 0, 30, 0, 0);
const autumnBoundary = getNextTimeOfDayPaletteBoundary(autumnNow);
assert.equal(autumnBoundary.getHours(), 3);
assert.equal(autumnBoundary.getTime() - autumnNow.getTime(), 210 * 60 * 1000);
if (previousTimezone === undefined) delete process.env.TZ;
else process.env.TZ = previousTimezone;

const productionConsumers = [
  'react-app/app/src/components/app/SiteApp.jsx',
  'react-app/app/src/hooks/useTimeOfDayPaletteSync.js',
  'react-app/app/src/routes/daily-focus/dailyFocusTheme.js',
  'react-app/app/src/routes/beach-ball-room/BeachBallRoomRuntime.jsx',
  'react-app/app/src/routes/concept-simulations/conceptSimulationRenderer.js',
  'react-app/app/src/routes/flock-of-birds/flockOfBirdsRenderer.js',
  'react-app/app/src/routes/mineral-growth/mineralGrowthRenderer.js',
  'react-app/app/src/routes/repel-room/repelRoomRenderer.js',
  'react-app/app/src/legacy/modules/portfolio/portfolio-speed-field.js',
  'react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx',
  'react-app/app/src/routes/contact/contactRippleRenderer.js',
  'react-app/app/src/legacy/modules/rendering/atmosphere/simulation-atmosphere.js',
];

const forbiddenPatterns = [
  { pattern: /from\s+['"][^'"]*timeOfDayPalette\.js['"]/, reason: 'imports the schedule directly' },
  { pattern: /(?:DEFAULT_COLOR_DISTRIBUTION|DEFAULT_DISTRIBUTION)\s*=/, reason: 'declares a local distribution fallback' },
  { pattern: /colorDistribution\s*:\s*\[/, reason: 'declares a local distribution array' },
  { pattern: /searchParams[^\n]*(?:palette|colorTemplate)|params\.get\(['"](?:palette|colorTemplate)/i, reason: 'reads a palette URL override' },
];

productionConsumers.forEach((relativePath) => {
  const source = readFileSync(resolve(repoRoot, relativePath), 'utf8');
  forbiddenPatterns.forEach(({ pattern, reason }) => {
    assert.doesNotMatch(source, pattern, `${relativePath} ${reason}.`);
  });
});

const requiredRegistrations = [
  'react-app/app/src/hooks/useTimeOfDayPaletteSync.js',
  'react-app/app/src/routes/daily-focus/dailyFocusTheme.js',
  'react-app/app/src/legacy/modules/portfolio/portfolio-speed-field.js',
  'react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx',
  'react-app/app/src/routes/contact/contactRippleRenderer.js',
  'react-app/app/src/legacy/modules/rendering/atmosphere/simulation-atmosphere.js',
];
requiredRegistrations.forEach((relativePath) => {
  const source = readFileSync(resolve(repoRoot, relativePath), 'utf8');
  assert.match(
    source,
    /(?:simulationPaletteController|useSimulationPalette|dailyFocusTheme)\.js/,
    `${relativePath} must register with the controller or approved adapter.`,
  );
});

const aboutSource = readFileSync(resolve(
  repoRoot,
  'react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx',
), 'utf8');
assert.match(aboutSource, /#include <tonemapping_fragment>[\s\S]*#include <colorspace_fragment>/);
assert.match(aboutSource, /renderer\.outputColorSpace\s*=\s*THREE\.SRGBColorSpace/);
assert.match(aboutSource, /getHexString\(THREE\.SRGBColorSpace\)/);
const aboutThemeSync = aboutSource.match(/const updateTheme = \(\) => \{[\s\S]*?\n  \};/)?.[0] || '';
assert.doesNotMatch(
  aboutThemeSync,
  /refreshInstalledDisciplineGroups/,
  'About palette commits must update uniforms without rewriting discipline buffers.',
);

const contactSource = readFileSync(resolve(
  repoRoot,
  'react-app/app/src/routes/contact/contactRippleRenderer.js',
), 'utf8');
const contactLayoutKey = contactSource.match(/const nextLayoutKey = \[[\s\S]*?\]\.join\(': '\);/)?.[0]
  || contactSource.match(/const nextLayoutKey = \[[\s\S]*?\]\.join\(':'\);/)?.[0]
  || '';
assert.doesNotMatch(
  contactLayoutKey,
  /spriteSet\.key/,
  'Contact palette generations must not participate in the ring geometry key.',
);
for (const diagnosticField of ['paletteGeneration', 'distribution', 'ringCount', 'activeBurstCount']) {
  assert.match(contactSource, new RegExp(`diagnostics\\.${diagnosticField}`));
}

const portfolioSource = readFileSync(resolve(
  repoRoot,
  'react-app/app/src/legacy/modules/portfolio/portfolio-speed-field.js',
), 'utf8');
assert.match(portfolioSource, /roleCounts/);
assert.match(portfolioSource, /roleId:\s*row\.roleId/);

for (const relativePath of [
  'react-app/app/src/routes/repel-room/repelRoomRenderer.js',
  'react-app/app/src/routes/flock-of-birds/flockOfBirdsRenderer.js',
  'react-app/app/src/routes/mineral-growth/mineralGrowthRenderer.js',
]) {
  const source = readFileSync(resolve(repoRoot, relativePath), 'utf8');
  assert.match(source, /materialRoleIndex/, `${relativePath} must retain stable material-role indices.`);
  assert.match(source, /resolveSimulationMaterialColorIndex/, `${relativePath} must resolve role colours from the current snapshot.`);
}
const mineralSource = readFileSync(resolve(
  repoRoot,
  'react-app/app/src/routes/mineral-growth/mineralGrowthRenderer.js',
), 'utf8');
const mineralThemeKey = mineralSource.match(/function getThemeKey\(theme\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.doesNotMatch(
  mineralThemeKey,
  /resolvePalette/,
  'Mineral Growth geometry identity must not include palette colours.',
);

const controlRegistrySource = readFileSync(resolve(
  repoRoot,
  'react-app/app/src/legacy/modules/ui/control-registry.js',
), 'utf8');
assert.match(controlRegistrySource, /configureSimulationPalette/);
assert.doesNotMatch(
  controlRegistrySource,
  /balls\[i\]\.color\s*=\s*pickRandomColor/,
  'Distribution authoring must preserve existing Home material roles.',
);

console.log('PASS: one immutable palette generation owns Home, Daily, Work, About, Contact, and atmosphere.');
