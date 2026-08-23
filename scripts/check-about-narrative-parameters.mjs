import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';
import {
  createAboutNarrativeParameterStore,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeParameterStore.js';
import {
  validateAboutNarrativePointFieldDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';
import { writeAboutSceneLook } from '../react-app/app/src/routes/about-narrative-lab/aboutSceneLook.js';

const ROOT = new URL('../', import.meta.url);
const readSource = (path) => readFile(new URL(path, ROOT), 'utf8');
const document = JSON.parse(await readSource('react-app/app/public/config/contents-about.json'));
const [panelSource, experienceSource, routeTransitionSource] = await Promise.all([
  readSource('react-app/app/src/routes/about-narrative-lab/AboutNarrativeParameterPanel.jsx'),
  readSource('react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx'),
  readSource('react-app/app/src/hooks/useShellRouteTransition.js'),
]);

test('parameter surface contains the compact whole-scene controls', () => {
  const entries = ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.flatMap((group) => group.controls);
  const keys = entries.map((entry) => `${entry.scope}:${entry.path.join('.')}`);
  assert.deepEqual(
    ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.map((group) => [group.label, group.controls.length]),
    [['Point cloud', 8], ['Atmosphere', 6], ['Living motion', 4]],
  );
  assert.deepEqual(keys, [
    'session:qualityTier',
    'long-assembly:density',
    'globals:pointMaterial.surfelCoverage',
    'globals:pointMaterial.backfaceRetention',
    'globals:pointMaterial.minPointSize',
    'globals:pointMaterial.pointSize',
    'globals:pointMaterial.perspectiveResponse',
    'globals:pointMaterial.edgeSoftness',
    'globals:pointMaterial.atmosphereStrength',
    'globals:camera.distanceFogStartWU',
    'globals:camera.distanceFogEndWU',
    'globals:camera.distanceFogCurve',
    'long-assembly:finaleFogClearStartWU',
    'long-assembly:finaleFogClearEndWU',
    'long-assembly:structureAmbientAmount',
    'long-assembly:structureAmbientSpeed',
    'long-assembly:structureMotionCoherence',
    'long-assembly:finaleMotionGain',
  ]);
  const quality = entries[0].control;
  assert.equal(quality.type, 'select');
  assert.deepEqual(quality.options.map((option) => option.value), ['auto', 'desktop', 'mobile', 'master']);
  assert.match(panelSource, /Camera path, roll, and geometry stay Blender-authored/);
});

test('new surfel controls are canonical and schema-valid', () => {
  assert.equal(document.globals.pointMaterial.surfelCoverage, 0.7);
  assert.equal(document.globals.pointMaterial.backfaceRetention, 0);
  assert.equal(document.globals.pointMaterial.minPointSize, 1.15);
  assert.equal(document.globals.pointMaterial.atmosphereStrength, 1);
  assert.equal(document.globals.camera.distanceFogCurve, 1);
  assert.equal(
    document.tracks.pointField.stateDefinitions[0].shapeParameters.structureAmbientScaleWU,
    20,
  );
  const diagnostics = validateAboutNarrativePointFieldDocument(document);
  assert.equal(
    diagnostics.filter((item) => item.level === 'error').length,
    0,
    JSON.stringify(diagnostics, null, 2),
  );
  const invalid = structuredClone(document);
  invalid.globals.pointMaterial.surfelCoverage = 1.4;
  assert(validateAboutNarrativePointFieldDocument(invalid).some(
    (item) => item.code.endsWith('point-material-surfel-coverage'),
  ));
});

test('one scene-look resolver keeps density, fog, and coherent motion bounded', () => {
  const frame = {
    storyWU: 21.5,
    durationWU: 22,
    globals: document.globals,
    world: { to: document.tracks.pointField.stateDefinitions[0] },
    simulation: { visibility: 1 },
    reducedMotion: false,
  };
  const look = writeAboutSceneLook({}, frame, 1);
  assert.equal(look.detailBias, 1);
  assert.equal(look.minPointSizePx, 1.15);
  assert(look.fogStartWU > document.globals.camera.distanceFogStartWU);
  assert(look.motionAmountWU > 0);
  const reduced = writeAboutSceneLook({}, { ...frame, reducedMotion: true }, 1);
  assert.equal(reduced.motionAmountWU, 0);
});

test('quality changes are session-only and preserve the current story position', () => {
  const store = createAboutNarrativeParameterStore(document, { baselineHash: 'baseline' });
  store.setTransport({ owner: 'scroll', storyWU: 12.75 });
  const before = store.getSnapshot();
  store.setQualityTier('mobile');
  const after = store.getSnapshot();
  assert.equal(after.document, before.document);
  assert.equal(after.revision, before.revision);
  assert.equal(after.dirty, false);
  assert.equal(after.transport.storyWU, 12.75);
  assert.equal(after.qualityTier, 'mobile');
  assert.equal(store.getSaveEligibility().code, 'clean');
  store.setQualityTier('master');
  assert.equal(store.getSnapshot().qualityTier, 'master');
});

test('About runtime no longer loads the full editor store or preserves edit mode', () => {
  assert.match(experienceSource, /aboutNarrativeParameterStore\.js/);
  assert.doesNotMatch(experienceSource, /aboutNarrativePointFieldEditorStore|AboutNarrativeEditor/);
  assert.doesNotMatch(routeTransitionSource, /searchParams\.get\('edit'\)/);
});
