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
const sceneSource = await readSource('react-app/app/src/routes/about-narrative-lab/aboutBlenderPointScene.js');
const footprintBody = sceneSource.match(/float separatedSurfelRadius\([\s\S]*?\) \{([\s\S]*?)\n  \}/u)?.[1];
assert.ok(footprintBody, 'Exercise the actual bounded footprint used by the vertex shader.');
// This scalar GLSL helper uses only arithmetic shared with JS. Run its actual
// body so tests cannot pass against a separately maintained reference formula.
const sampleFootprint = new Function('clamp', 'min', 'max', 'sqrt', 'abs', 'mix', 'smoothstep', `
  return function (physicalRadiusPx, surfaceFacing, coverage, minimumRadiusPx, maximumRadiusPx) {
    ${footprintBody.replace(/\bfloat\b/gu, 'const')}
  };
`)(
  (value, minimum, maximum) => Math.max(minimum, Math.min(maximum, value)),
  Math.min, Math.max, Math.sqrt, Math.abs,
  (left, right, weight) => left + (right - left) * weight,
  (start, end, value) => {
    const progress = Math.max(0, Math.min(1, (value - start) / (end - start)));
    return progress * progress * (3 - 2 * progress);
  },
);

test('projected surfel footprints preserve front-facing circles and separate grazing surfaces', () => {
  const front = sampleFootprint(4, 1, 0.7, 1.15, 6);
  const grazing = sampleFootprint(4, 0.05, 0.7, 1.15, 6);
  assert.ok(Math.abs(front - 2.8) < 1e-9);
  assert.ok(grazing >= 1 && grazing <= 1.2,
    'The local grazing correction must retain the visible weight of the material.');
  assert.ok(grazing * grazing < front * front * 0.2,
    'Oblique source rows must not retain their face-on billboard coverage.');
  assert.equal(sampleFootprint(4, -0.05, 0.7, 1.15, 6), grazing,
    'Back and front surfaces retain the same circular footprint.');
  for (const facing of [0.16, 0.3, 0.7, 1]) {
    const before = sampleFootprint(4, facing - 0.000001, 0.7, 1.15, 6);
    const after = sampleFootprint(4, facing + 0.000001, 0.7, 1.15, 6);
    assert.ok(Math.abs(after - before) < 0.0001, 'Angle changes must not pop between sizes.');
  }
  assert.match(sceneSource, /float radiusPx = separatedSurfelRadius\(/u);
});

test('distant surfels shrink continuously below the preferred pixel floor without a hard depth cut', () => {
  let previous = Infinity;
  for (const physicalRadius of [8, 4, 2, 1, 0.5, 0.25, 0.125, 0.0625]) {
    const radius = sampleFootprint(physicalRadius, 0.1, 0.7, 1.15, 6);
    assert.ok(Number.isFinite(radius) && radius > 0);
    assert.ok(radius < previous);
    previous = radius;
  }
  assert.ok(sampleFootprint(0.5, 1, 0.7, 1.15, 6) < 1.15,
    'The pixel floor must not inflate distant surfaces into a solid band.');
  assert.ok(sampleFootprint(100, 1, 0.7, 1.15, 6) <= 6);
  assert.ok(sampleFootprint(2, 0.4, 1.2, 4, 18) < 4,
    'Even a large saved size target remains subordinate to projected spacing.');
});

test('dispersion keeps opaque colour, point retention and the existing scene controls', () => {
  assert.match(sceneSource, /radii\[index\] = decodeRadius[\s\S]*?radiusScaleByObject\[partKey\]/u);
  assert.doesNotMatch(footprintBody, /iPreserve|iLodRank|visibility|fog|position|palette|discard|motion/iu,
    'The footprint must not change point retention, placement, colour, visibility or motion.');
  assert.match(sceneSource, /gl_FragColor = vec4\(shaded, 1\.0\)/u);
  assert.match(sceneSource, /transparent: false,[\s\S]*?alphaToCoverage: true,[\s\S]*?depthWrite: true/u);
  const sizeTarget = ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.flatMap((group) => group.controls)
    .find((entry) => entry.path.join('.') === 'pointMaterial.minPointSize');
  assert.equal(sizeTarget.control.label, 'Distant size target');
});

test('parameter surface contains the compact whole-scene controls', () => {
  const entries = ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.flatMap((group) => group.controls);
  const keys = entries.map((entry) => `${entry.scope}:${entry.path.join('.')}`);
  assert.deepEqual(
    ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.map((group) => [group.label, group.controls.length]),
    [['Point cloud', 9], ['Atmosphere', 6], ['Emergence and motion', 6], ['Camera and flow', 3]],
  );
  assert.deepEqual(keys, [
    'session:qualityTier',
    'long-assembly:density',
    'globals:pointMaterial.opacity',
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
    'long-assembly:structureManifestationAmount',
    'long-assembly:structureAmbientAmount',
    'long-assembly:structureAmbientScaleWU',
    'long-assembly:structureAmbientSpeed',
    'long-assembly:structureMotionCoherence',
    'long-assembly:finaleMotionGain',
    'globals:scrollSmoothing',
    'globals:camera.pointerPanDegrees',
    'globals:camera.pointerPanResponseMs',
  ]);
  const quality = entries[0].control;
  assert.equal(quality.type, 'select');
  assert.deepEqual(quality.options.map((option) => option.value), ['auto', 'desktop', 'mobile', 'master']);
  assert.match(panelSource, /Blender owns rail shape, gates, roll, and 65° FOV/);
});

test('new surfel controls are canonical and schema-valid', () => {
  assert.equal(document.globals.pointMaterial.surfelCoverage, 0.7);
  assert.equal(document.globals.pointMaterial.backfaceRetention, 1);
  assert.equal(document.globals.pointMaterial.minPointSize, 1.15);
  assert.equal(document.globals.pointMaterial.atmosphereStrength, 1);
  assert.equal(document.globals.camera.distanceFogCurve, 1.2);
  assert.equal(document.globals.camera.distanceFogEndWU, 150);
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
  const invalidFog = structuredClone(document);
  invalidFog.globals.camera.distanceFogEndWU = 241;
  assert(validateAboutNarrativePointFieldDocument(invalidFog).some(
    (item) => item.code.endsWith('camera-fog-end'),
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
  assert.equal(look.manifestationSpread, 0.24);
  assert.equal(look.motionScaleWU, 20);
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
