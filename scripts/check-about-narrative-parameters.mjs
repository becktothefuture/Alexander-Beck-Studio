import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';
import {
  ABOUT_SCENE_CONTROL_REGISTRY,
  ABOUT_SCENE_CONTROL_DEFAULTS,
  getAboutSceneControlValue,
  normalizeAboutSceneControls,
  writeAboutSceneParameter,
  resetAboutSceneParameterGroup,
} from '../react-app/app/src/routes/about-narrative-lab/aboutSceneControlRegistry.js';
import {
  createAboutNarrativeParameterStore,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeParameterStore.js';
import {
  validateAboutNarrativePointFieldDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';
import { resolveAboutSurfelRadiusPx } from '../react-app/app/src/routes/about-narrative-lab/aboutSurfelProjection.js';
import {
  resolveAboutCameraFog,
  writeAboutSceneLook,
} from '../react-app/app/src/routes/about-narrative-lab/aboutSceneLook.js';

const ROOT = new URL('../', import.meta.url);
const readSource = (path) => readFile(new URL(path, ROOT), 'utf8');
const document = JSON.parse(await readSource('react-app/app/public/config/contents-about.json'));
const [panelSource, experienceSource, routeTransitionSource, blenderRefreshSource] = await Promise.all([
  readSource('react-app/app/src/routes/about-narrative-lab/AboutNarrativeParameterPanel.jsx'),
  readSource('react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx'),
  readSource('react-app/app/src/hooks/useShellRouteTransition.js'),
  readSource('react-app/app/src/routes/about-narrative-lab/useAboutBlenderDevRefresh.js'),
]);
const typographySource = await readSource('react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css');
const sceneSource = await readSource('react-app/app/src/routes/about-narrative-lab/aboutBlenderPointScene.js');
const footprintBody = sceneSource.match(/float separatedSurfelRadius\([\s\S]*?\) \{([\s\S]*?)\n  \}/u)?.[1];
assert.ok(footprintBody, 'Exercise the actual bounded footprint used by the vertex shader.');
// This scalar GLSL helper uses only arithmetic shared with JS. Run its actual
// body so tests cannot pass against a separately maintained reference formula.
const sampleFootprint = new Function('clamp', 'min', 'max', 'sqrt', 'abs', 'mix', 'smoothstep', `
  return function (physicalRadiusPx, surfaceFacing, coverage, minimumRadiusPx, maximumRadiusPx,
    profile = 0, uSolidCoverage = 1.15, uBustCoverage = 0.85, uPointDensity = 1) {
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

test('atmospheric point footprints preserve front-facing circles and separate grazing surfaces', () => {
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

test('distant atmospheric surfels shrink continuously below the preferred pixel floor without a hard depth cut', () => {
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
  assert.match(
    sceneSource,
    /radii\[destinationIndex\] = decodeRadius[\s\S]*?radiusScaleByObject\[partKey\]/u,
    'Model-contiguous decode must retain the per-object authored radius scale.',
  );
  assert.doesNotMatch(footprintBody, /iPreserve|iLodRank|visibility|fog|position|palette|discard|motion/iu,
    'The footprint must not change point retention, placement, colour, visibility or motion.');
  assert.match(sceneSource, /getSimulationBodyMaterialAtlas/u);
  assert.match(sceneSource, /gl_FragColor = vec4\(shaded, 1\.0\)/u);
  assert.match(sceneSource, /transparent: false,[\s\S]*?alphaToCoverage: true,[\s\S]*?depthWrite: true/u);
  const sizeTarget = ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.flatMap((group) => group.controls)
    .find((entry) => entry.path.join('.') === 'pointMaterial.pointSize');
  assert.equal(sizeTarget.control.label, 'Point size');
});

test('page controls expose active global systems and clearly session-only detail', () => {
  const entries = ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.flatMap((group) => group.controls);
  const keys = entries.map((entry) => `${entry.scope}:${entry.path.join('.')}`);
  assert.equal(new Set(keys).size, keys.length, 'One control must have one owner.');
  assert.equal(entries.filter((entry) => entry.scope === 'long-assembly').length, 0,
    'The page panel must not expose obsolete procedural ride knobs.');
  for (const owner of ['typography', 'textMotion', 'storyPacing', 'sceneMotion']) {
    assert.deepEqual(entries.filter((entry) => entry.path[0] === owner).map((entry) => entry.control.id),
      ABOUT_SCENE_CONTROL_REGISTRY[owner].map((control) => control.id));
  }
  for (const key of ['readableStart', 'readableEnd', 'maxBlur', 'titleShadowOpacity', 'titleShadowBlurPx', 'titleExitLineStagger']) {
    assert.ok(!keys.includes(`globals:textMotion.${key}`), `${key} is a compatibility field, not an active page control.`);
  }
  for (const entry of entries.filter((entry) => entry.scope !== 'session')) {
    assert.notEqual(entry.control.defaultValue, undefined, `${entry.control.id} needs a reset value.`);
  }
  const quality = entries.find((entry) => entry.scope === 'session').control;
  assert.equal(quality.type, 'select');
  assert.deepEqual(quality.options.map((option) => option.value), ['auto', 'desktop', 'mobile', 'master']);
  assert.match(panelSource, /Blender owns visible geometry/);
  assert.match(panelSource, /Moving a distance slider enables the override/);
  assert.match(panelSource, /writeAboutSceneParameter\(/);
  assert.match(panelSource, /resetAboutSceneParameterGroup\(/);
  assert.match(panelSource, /Reset to Blender/);
  assert.match(panelSource, /data-about-effective-fog/);
  assert.match(experienceSource, /key=\{blenderPreview\.bundleHash \|\| blenderPreview\.sourceSha/);
  assert.match(experienceSource, /data-about-blender-bundle/);
  assert.doesNotMatch(blenderRefreshSource, /window\.location\.reload\(\)/);
});

test('central controls validate bounds and persist without creating another store', () => {
  const normalized = normalizeAboutSceneControls({});
  assert.deepEqual(normalized.sceneMotion, ABOUT_SCENE_CONTROL_DEFAULTS.sceneMotion);
  assert.deepEqual(normalized.storyPacing, ABOUT_SCENE_CONTROL_DEFAULTS.storyPacing);
  for (const owner of ['storyPacing', 'sceneMotion']) {
    for (const control of ABOUT_SCENE_CONTROL_REGISTRY[owner]) {
      for (const value of [control.min, control.max]) {
        const edited = structuredClone(document);
        edited.globals[owner][control.id] = value;
        assert.equal(validateAboutNarrativePointFieldDocument(edited).filter((item) => item.level === 'error').length, 0,
          `${owner}.${control.id} must accept its advertised endpoint.`);
        assert.equal(normalizeAboutSceneControls(JSON.parse(JSON.stringify(edited.globals)))[owner][control.id], value);
      }
      const invalid = structuredClone(document);
      invalid.globals[owner][control.id] = control.max + control.step;
      assert.ok(validateAboutNarrativePointFieldDocument(invalid).some((item) => item.path === `globals.${owner}.${control.id}`));
      assert.equal(getAboutSceneControlValue(invalid.globals, owner, control.id), control.max);
    }
  }
  const store = createAboutNarrativeParameterStore(document, { baselineHash: 'baseline' });
  store.commit('Adjust scene turn', (draft) => { draft.globals.sceneMotion.bustTurnAmount = 1.5; }, { requireValid: true });
  assert.equal(store.getSnapshot().document.globals.sceneMotion.bustTurnAmount, 1.5);
  assert.equal(store.getSnapshot().dirty, true);
  store.restoreBaseline();
  assert.equal(store.getSnapshot().document.globals.sceneMotion.bustTurnAmount, 1);
});

test('all five reader-facing text sizes and the main text-layer controls are live and canonical', () => {
  assert.deepEqual(document.globals.typography, {
    bodySizeScale: 1,
    smallBodySizeScale: 1,
    eyebrowSizeScale: 1,
    mainTitleSizeScale: 1,
    inbetweenTitleSizeScale: 1,
    bodyLineHeightScale: 1,
    smallBodyLineHeightScale: 1,
    eyebrowLineHeightScale: 1,
    mainTitleLineHeightScale: 1,
    inbetweenTitleLineHeightScale: 1,
    paragraphSpacingScale: 1,
    listingSeparationScale: 1,
    rowSpacingScale: 1,
    clientRowGapScale: 1,
    clientColumnGapScale: 1,
  });
  [
    'body',
    'small-body',
    'eyebrow',
    'main-title',
    'inbetween-title',
  ].forEach((role) => {
    assert.match(typographySource, new RegExp(`--about-${role}-size-scale`));
  });
  [
    'bodySizeScale',
    'smallBodySizeScale',
    'eyebrowSizeScale',
    'mainTitleSizeScale',
    'inbetweenTitleSizeScale',
    'paragraphSpacingScale',
    'listingSeparationScale',
    'rowSpacingScale',
    'clientRowGapScale',
    'clientColumnGapScale',
  ].forEach((key) => {
    assert.match(experienceSource, new RegExp(`typography\\.${key}`));
  });
  assert.match(experienceSource, /data-about-finale-scene-zone/);
  assert.match(experienceSource, /data-about-finale-copy/);
  assert.match(typographySource, /grid-template-rows: minmax\(0, 1fr\) auto/);
  const invalid = structuredClone(document);
  invalid.globals.typography.bodySizeScale = 1.81;
  assert(validateAboutNarrativePointFieldDocument(invalid).some(
    (item) => item.path === 'globals.typography.bodySizeScale',
  ));
});

test('new surfel controls are canonical and schema-valid', () => {
  assert.equal(document.globals.pointMaterial.surfelCoverage, 0.7);
  assert.equal(document.globals.pointMaterial.backfaceRetention, 0);
  assert.equal(document.globals.pointMaterial.minPointSize, 1.15);
  assert.equal(document.globals.pointMaterial.atmosphereStrength, 1.2);
  assert.equal(document.globals.pointMaterial.pixelRatioCap, 2);
  assert.equal(document.globals.camera.distanceFogOverride, 0);
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
  invalid.globals.pointMaterial.surfelCoverage = 2.6;
  assert(validateAboutNarrativePointFieldDocument(invalid).some(
    (item) => item.code.endsWith('point-material-surfel-coverage'),
  ));
  const invalidFog = structuredClone(document);
  invalidFog.globals.camera.distanceFogEndWU = 561;
  assert(validateAboutNarrativePointFieldDocument(invalidFog).some(
    (item) => item.code.endsWith('camera-fog-end'),
  ));
});

test('website viewing distance overrides Blender only when enabled', () => {
  const blenderFog = { startWU: 18, endWU: 210, curve: 1.5 };
  assert.deepEqual(resolveAboutCameraFog(document.globals.camera, blenderFog), {
    source: 'blender', startWU: 18, endWU: 210, curve: 1.5,
  });
  const websiteCamera = { ...document.globals.camera, distanceFogOverride: 1 };
  assert.deepEqual(resolveAboutCameraFog(websiteCamera, blenderFog), {
    source: 'website', startWU: 14, endWU: 150, curve: 1.2,
  });
  assert.match(sceneSource, /writeAboutSceneLook\(controls, frame, entranceScale, journeySample, authoredCameraFog\)/);
  assert.doesNotMatch(sceneSource, /controls\.fogStartWU = authoredCameraFog\.startWU/);
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
  assert.equal(look.fogStartWU, document.globals.camera.distanceFogStartWU);
  assert.equal(look.fogEndWU, document.globals.camera.distanceFogEndWU);
  assert.equal(look.pointDensity, document.globals.pointMaterial.pointDensity);
  assert.equal(look.masterMotionIntensity, document.globals.sceneMotion.masterIntensity);
  assert.equal(look.masterMotionSpeed, document.globals.sceneMotion.masterSpeed);
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

test('saved backface setting culls rear surfaces and restores them without changing front surfaces', () => {
  const point = { radiusWU: 1, cameraDepthWU: 20, projectionScalePx: 500,
    surfaceFacing: -0.8, lodRank: 0, featureClass: 0, preserve: true, revealProgress: 1 };
  const hidden = writeAboutSceneLook({}, { globals: document.globals });
  assert.equal(resolveAboutSurfelRadiusPx(point, hidden), 0);
  const enabledGlobals = structuredClone(document.globals);
  enabledGlobals.pointMaterial.backfaceRetention = 1;
  const restored = writeAboutSceneLook({}, { globals: JSON.parse(JSON.stringify(enabledGlobals)) });
  assert.ok(resolveAboutSurfelRadiusPx(point, restored) > 0);
  point.surfaceFacing = 0.8;
  assert.equal(resolveAboutSurfelRadiusPx(point, restored), resolveAboutSurfelRadiusPx(point, hidden));
  assert.equal(writeAboutSceneLook({}, { globals: {} }).backfaceRetention, 0);
});


test('solid and bust profiles preserve coverage at grazing angles with independent population control', () => {
  const front = sampleFootprint(4, 1, 0.7, 1.15, 12, 1);
  for (const facing of [0.01, 0.05, 0.3, 0.7, 1]) {
    assert.equal(sampleFootprint(4, facing, 0.7, 1.15, 12, 1), front,
      'Solid surfaces must not open holes when viewed at an oblique angle.');
  }
  const sparse = sampleFootprint(4, 1, 0.7, 1.15, 12, 1, 1.15, 0.85, 0.25);
  assert.equal(sparse, front * 2, 'Reduced point population preserves material coverage within the pixel limit.');
  assert.equal(sampleFootprint(4, 1, 0.7, 1.15, 6, 1, 1.15, 0.85, 0.25), 6);
  assert.equal(sampleFootprint(4, 1, 0.7, 1.15, 12, 2), 3.4,
    'The bust has its own centrally controlled coverage profile.');
  assert.equal(sampleFootprint(4, 1, 0.2, 1.15, 12, 1), front,
    'Atmospheric coverage must not override the solid-surface profile.');
});

test('CPU visibility diagnostics match the actual shader footprints for every rendering profile', () => {
  for (const profile of [0, 1, 2]) {
    for (const density of [0.25, 0.5, 1]) {
      const controls = writeAboutSceneLook({}, { globals: { pointMaterial: { pointDensity: density } } });
      for (const radius of [0.05, 0.5, 4, 100]) {
        for (const facing of [0.01, 0.3, 1]) {
          const shader = sampleFootprint(radius, facing, controls.surfelCoverage,
            controls.minPointSizePx, controls.maxPointSizePx, profile,
            controls.solidCoverage, controls.bustCoverage, density);
          const cpu = resolveAboutSurfelRadiusPx({ radiusWU: radius, cameraDepthWU: 100,
            projectionScalePx: 100, surfaceFacing: facing, lodRank: 0, featureClass: 0,
            revealProgress: 1, renderingProfile: profile }, controls);
          assert.ok(Math.abs(shader - cpu) < 0.000001,
            `Profile ${profile}, density ${density}, radius ${radius}, facing ${facing}: diagnostics differ from shader.`);
        }
      }
    }
  }
});


test('editing viewing distance starts from the active Blender values and resets ownership on reload', () => {
  const draft = structuredClone(document);
  const group = ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.find((entry) => entry.id === 'page-viewing-distance');
  const endControl = group.controls.find((entry) => entry.control.id === 'distanceFogEndWU');
  const startControl = group.controls.find((entry) => entry.control.id === 'distanceFogStartWU');
  const blenderFog = { startWU: 44, endWU: 223, curve: 1.6 };
  writeAboutSceneParameter(draft, endControl, 260, blenderFog);
  assert.deepEqual(resolveAboutCameraFog(draft.globals.camera, blenderFog),
    { source: 'website', startWU: 44, endWU: 260, curve: 1.6 });
  writeAboutSceneParameter(draft, startControl, 12, { startWU: 20, endWU: 200, curve: 1.2 });
  const reloaded = JSON.parse(JSON.stringify(draft));
  assert.deepEqual(resolveAboutCameraFog(reloaded.globals.camera, blenderFog),
    { source: 'website', startWU: 12, endWU: 260, curve: 1.6 });
  resetAboutSceneParameterGroup(reloaded, group);
  assert.deepEqual(resolveAboutCameraFog(reloaded.globals.camera, blenderFog),
    { source: 'blender', startWU: 44, endWU: 223, curve: 1.6 });
});
