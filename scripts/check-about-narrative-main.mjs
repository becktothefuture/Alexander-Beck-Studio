import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  loadAboutNarrativePointFieldPersistenceSource,
  preflightAboutNarrativePointFieldRuntimePlans,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';
import {
  createAboutNarrativeTitleFieldSample,
  sampleAboutNarrativeTitleFieldInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';
import {
  ABOUT_BLENDER_PALETTE_ROLES,
  ABOUT_HOME_ROLE_BY_BLENDER_ROLE,
  resolveAboutSurfelPaletteColors,
} from '../react-app/app/src/routes/about-narrative-lab/aboutSurfelPalette.js';
import {
  createAboutNarrativeCameraSteadycamController,
  createAboutNarrativeCameraSteadycamSample,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraSteadycam.js';
import {
  DEFAULT_SIMULATION_COLOR_DISTRIBUTION,
  SIMULATION_MATERIAL_ROLE_COUNT,
} from '../react-app/app/src/palette/simulationPaletteContract.js';
import { getAboutNarrativeEditorialFocusOpacity, getAboutNarrativeSharedRevealProgress } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeReveal.js';
import { ABOUT_BLENDER_STAGE_IDS } from '../react-app/app/src/routes/about-narrative-lab/aboutBlenderStages.js';

const ROOT = new URL('../', import.meta.url);
const SHAPE_ID = 'long-assembly-corridor-v1';
const STATE_ID = 'v2-long-assembly';
const SURFEL_STRIDE_BYTES = 32;
const TIME_EPSILON = 1e-9;
const FORBIDDEN_REJECTED_TOKENS = Object.freeze([
  'connected-circle-world-v1',
  'material-score-v2',
  'material-essay-v2',
  'seed-vault',
  'split-gorge',
  'vaulted-causeway',
  'braided-delta',
  'planetary-caldera',
]);

const readSource = (path) => readFile(new URL(path, ROOT), 'utf8');

const [
  document,
  experienceSource,
  pointWorldSource,
  sceneSource,
  stylesSource,
  timelineSource,
  assetMeta,
  cameraTrack,
] = await Promise.all([
  readSource('react-app/app/public/config/contents-about.json').then(JSON.parse),
  readSource('react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx'),
  readSource('react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx'),
  readSource('react-app/app/src/routes/about-narrative-lab/aboutBlenderPointScene.js'),
  readSource('react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css'),
  readSource('react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js'),
  readSource('react-app/app/public/models/about-v2-edited-world/meta.json').then(JSON.parse),
  readSource('react-app/app/public/models/about-v2-edited-world/camera-track.json').then(JSON.parse),
]);

function phaseTime(field, phase) {
  if (phase === 'enter') return Number(field.startWU);
  if (phase === 'focus') return Number(field.focusWU);
  if (phase === 'exit') return Number(field.endWU);
  return Number.NaN;
}

function assertMomentBound(items, textById, laneLabel, timeKey = 'atWU') {
  for (const item of items) {
    const trigger = item.trigger;
    assert(trigger?.momentId, `${laneLabel} “${item.id}” must target a Text moment`);
    const field = textById.get(trigger.momentId);
    assert(field, `${laneLabel} “${item.id}” targets missing Text moment “${trigger.momentId}”`);
    const boundWU = phaseTime(field, trigger.phase) + Number(trigger.offsetWU || 0);
    assert(Number.isFinite(boundWU), `${laneLabel} “${item.id}” has an invalid Text phase`);
    assert(
      Math.abs(Number(item[timeKey]) - boundWU) <= TIME_EPSILON,
      `${laneLabel} “${item.id}” timing must be derived from its Text trigger`,
    );
  }
}

test('the canonical About source preserves the complete authored text spine and validates', () => {
  const loaded = loadAboutNarrativePointFieldPersistenceSource(document, {
    preflight: preflightAboutNarrativePointFieldRuntimePlans,
  });
  assert.equal(loaded.valid, true, loaded.message);
  const textById = new Map(document.tracks.text.fields.map((field) => [field.id, field]));
  assert.equal(document.tracks.text.fields.length, 14);
  assert.deepEqual(
    document.tracks.text.fields.map((field) => [field.id, field.stageId]),
    [
      ['text-promise-main', 'about.00'],
      ['text-complexity-idea', 'about.00'],
      ['text-complexity-conditions', 'about.00'],
      ['text-background-unit', 'about.01'],
      ['text-complexity-curiosity', 'about.02'],
      ['text-complexity-listen', 'about.02'],
      ['text-discipline-labels', 'about.03'],
      ['text-selected-clients', 'about.03'],
      ['text-disciplines-title', 'about.04'],
      ['text-life-momentum', 'about.04'],
      ['text-life-character', 'about.05'],
      ['text-epilogue-shaping', 'about.06'],
      ['text-epilogue-thinking', 'about.06'],
      ['text-epilogue-invitation', 'about.06'],
    ],
  );
  assert(document.tracks.text.fields.every((field) => field.flow));
  assertMomentBound(document.tracks.pointField.keys, textById, 'Point-field key');
  assertMomentBound(document.tracks.visibility.keys, textById, 'Visibility key');
  assertMomentBound(document.tracks.camera.moveKeys, textById, 'Camera move key');
  assertMomentBound(document.tracks.camera.lookKeys, textById, 'Camera look key');
  assertMomentBound(document.tracks.camera.lensKeys, textById, 'Camera lens key');
  assertMomentBound(document.tracks.interactions.clips, textById, 'Living activation', 'activationWU');
});

test('the canonical graph keeps one permanent Blender-backed world', () => {
  const states = document.tracks.pointField.stateDefinitions;
  assert.deepEqual(states.map((state) => [state.id, state.shapeId]), [[STATE_ID, SHAPE_ID]]);
  assert.equal(states[0].protected, true);
  assert.equal(document.tracks.pointField.keys.length, 2);
  assert(document.tracks.pointField.keys.every((key) => key.stateId === STATE_ID && key.protected));
  assert.equal(document.tracks.pointField.segments.length, 1);
  assert.equal(document.tracks.pointField.segments[0].transition.type, 'hold');
  assert.equal(document.tracks.camera.orbit, undefined);
  assert.equal(document.globals.pointMaterial.opacity, 1);
  assert.equal(document.globals.pointMaterial.pointerForcePx, 0);
  assert.equal(document.globals.camera.steadycamResponseMs, 0);
  assert.equal(document.globals.camera.pointerPanDegrees, 0);
  assert.equal(document.globals.scrollSmoothing, 0.64);
  assert(document.tracks.visibility.keys.every((key) => key.visibility === 1));
  const activeGraph = JSON.stringify({
    camera: document.tracks.camera,
    pointField: document.tracks.pointField,
    interactions: document.tracks.interactions,
    library: document.library,
  });
  FORBIDDEN_REJECTED_TOKENS.forEach((token) => {
    assert.equal(activeGraph.includes(token), false, `active graph contains rejected token “${token}”`);
  });
});

test('the React seam is a thin adapter over the Blender surfel scene', () => {
  assert.match(pointWorldSource, /import \{ createBlenderPointScene \} from '\.\/aboutBlenderPointScene\.js';/);
  assert.match(pointWorldSource, /const scene = createBlenderPointScene\(/);
  assert.match(pointWorldSource, /adapterId: scene\.adapterId/);
  assert.match(pointWorldSource, /getDiagnosticsSnapshot: scene\.getDiagnosticsSnapshot/);
  assert.match(pointWorldSource, /getMetrics: scene\.getMetrics/);
  assert.match(sceneSource, /const ADAPTER_ID = 'blender-surfel-v2';/);
  assert.doesNotMatch(pointWorldSource, /aboutNarrativePointShapes|aboutNarrativeCorrespondence|WebWorker|new Worker/);
  assert.doesNotMatch(experienceSource, /AboutNarrativeEditor|aboutNarrativePointFieldEditorStore|PointFieldLane/);
  assert.match(experienceSource, /import\('\.\/AboutNarrativeParameterPanel\.jsx'\)/);
  assert.match(experienceSource, /event\.stopImmediatePropagation\(\)/);
  assert.match(pointWorldSource, /let entranceStarted = entranceAlreadyComplete;/);
  assert.match(pointWorldSource, /if \(entranceStarted\) return Promise\.resolve\(true\);/);
  assert.doesNotMatch(
    pointWorldSource,
    /if \(!entranceAlreadyComplete\) \{\s*void routeMaterial\.enter/,
    'The direct-load adapter must not start once before the shell releases it and then restart.',
  );
});

test('the runtime consumes the v2 progressive surfel manifest without procedural regeneration', () => {
  assert.equal(assetMeta.schema, 'about-point-scene');
  assert.equal(assetMeta.version, 2);
  assert.equal(assetMeta.layout.strideBytes, SURFEL_STRIDE_BYTES);
  assert.equal(assetMeta.profiles.desktop.surfelCount, 90_000);
  assert.equal(assetMeta.profiles.mobile.surfelCount, 30_000);
  assert(assetMeta.profiles.mobile.surfelCount <= assetMeta.profiles.desktop.surfelCount);
  assert.equal(assetMeta.profiles.master.surfelCount, assetMeta.files.surfels.count);
  assert.equal(assetMeta.models.length, 6);
  assert.equal(ABOUT_BLENDER_STAGE_IDS.length, 7, 'Reading keeps its own stage without exporting the removed body cluster.');
  assert.deepEqual(
    new Set(assetMeta.models.map((model) => model.key)),
    new Set(['about.00', 'about.02', 'about.03', 'about.04', 'about.05', 'about.06']),
  );
  const expectedVisibilityCues = new Map([
    ['about.00', ['opening', 'portal-entry']],
    ['about.02', ['portal-entry', 'personal-origin']],
    ['about.03', ['personal-origin', 'gate-entry']],
    ['about.04', ['gate-entry', 'split-lattice-entry']],
    ['about.05', ['method', 'terminal-hold']],
    ['about.06', ['method', 'terminal-hold']],
  ]);
  for (const model of assetMeta.models) {
    assert(model.surfelRange.count > 0, `${model.id} has no master surfels`);
    assert(assetMeta.profiles.desktop.perModelCounts[model.key] > 0, `${model.key} has no desktop surfels`);
    assert(assetMeta.profiles.mobile.perModelCounts[model.key] > 0, `${model.key} has no mobile surfels`);
    assert(Number.isFinite(model.visibilityStartWU), `${model.key} has no visibility start`);
    assert(Number.isFinite(model.visibilityEndWU), `${model.key} has no visibility end`);
    assert(model.visibilityHandoffWU > 0 && model.visibilityHandoffWU <= 0.35);
    assert.deepEqual(
      [model.visibilityStartCue, model.visibilityEndCue],
      expectedVisibilityCues.get(model.key),
      `${model.key} is not bound to its semantic story interval`,
    );
    assert(Number.isFinite(model.visibilityStartOffsetWU));
    assert(Number.isFinite(model.visibilityEndOffsetWU));
  }
  assert.deepEqual(assetMeta.source.authoring.cameraFog, {
    startWU: assetMeta.source.authoring.controlValues['About Controls / 02 Fog Start'],
    endWU: assetMeta.source.authoring.controlValues['About Controls / 03 Fog End'],
    curve: assetMeta.source.authoring.controlValues['About Controls / 04 Fog Curve'],
    source: 'about.controls',
  });
  assert.match(sceneSource, /writeAboutSceneLook\(controls, frame, entranceScale, journeySample, authoredCameraFog\)/);
  assert.doesNotMatch(sceneSource, /controls\.fogStartWU = authoredCameraFog\.startWU/);
  assert.equal(assetMeta.source.objects.some((object) => object.objectKey === 'gn.lens.chamber'), false);
  assert.match(sceneSource, /const SURFEL_STRIDE_BYTES = 32;/);
  assert.match(sceneSource, /createProgressiveSourceOrder\(meta, qualityTier, totalCount\)/);
  assert.match(sceneSource, /new THREE\.InstancedBufferGeometry\(\)/);
  assert.match(sceneSource, /function finiteNumberOrNull\(value\)/);
  assert.match(sceneSource, /value === null \|\| value === undefined \|\| value === ''/);
  assert.match(sceneSource, /resolveAboutBlenderSceneContract\(/);
  assert.match(sceneSource, /validateAboutBlenderSceneBundle\(/);
  assert.doesNotMatch(sceneSource, /unbounded-fallback/);
  assert.match(sceneSource, /applyResolvedVisibilityWindows\(/);
  assert.match(sceneSource, /attribute\.needsUpdate = true/);
  assert.match(sceneSource, /visibilityWindows/);
  for (const attribute of [
    'iPosition',
    'iNormalOct',
    'iRadius',
    'iPalette',
    'iLodRank',
    'iRevealRank',
    'iMotionGroup',
    'iFeatureClass',
    'iPreserve',
    'iVisibilityStartWU',
    'iVisibilityEndWU',
    'iVisibilityEntranceHandoffWU',
    'iVisibilityExitHandoffWU',
  ]) {
    assert(sceneSource.includes(`setAttribute('${attribute}'`), `runtime omits ${attribute}`);
  }
  for (const retiredAttribute of ['iModel', 'iMotion', 'iFeature']) {
    assert(!sceneSource.includes(`setAttribute('${retiredAttribute}'`), `runtime retains ${retiredAttribute}`);
  }
  assert.doesNotMatch(sceneSource, /generateAboutNarrativeShape|createAboutNarrativeSeeds/);
});

test('the shared-buffer surfel shader reveals whole, fully coloured circles from fog', () => {
  assert.doesNotMatch(sceneSource, /createDepthProxy|depthProxy|proxyReady|proxyTriangles/);
  assert.match(sceneSource, /const destinationIndex = modelRanges\[modelId\]\.start \+ modelCursors\[modelId\]/);
  assert.match(sceneSource, /revealRanks\[destinationIndex\] = view\.getUint16\(offset \+ 18, true\)/);
  assert.match(sceneSource, /InstancedBufferAttribute\(view\(decoded\.revealRanks\), 1, true\)/);
  assert.match(sceneSource, /octDecodeNormal\(iNormalOct\)/);
  assert.match(sceneSource, /surfaceFacing < -clamp\(uBackfaceRetention/);
  assert.match(sceneSource, /revealVisibility = min\([\s\S]*?fogVisibility[\s\S]*?uSceneVisibility[\s\S]*?uOpacity/);
  assert.match(sceneSource, /revealProgress = smoothstep\([\s\S]*?revealRank \+ 0\.08/);
  assert.match(sceneSource, /float manifestationSpread = clamp\(uManifestationSpread \* materialScale\.x, 0\.0, 0\.8\)/);
  assert.match(sceneSource, /revealRank = min\([\s\S]*?iRevealRank \* manifestationSpread[\s\S]*?manifestationSpread - 0\.001/);
  assert.match(sceneSource, /uniforms\.uManifestationSpread\.value = controls\.manifestationSpread/);
  assert.match(sceneSource, /revealProgress <= 0\.0[\s\S]*?gl_Position = vec4\(2\.0, 2\.0, 2\.0, 1\.0\)/);
  assert.doesNotMatch(sceneSource, /stageRevealProgress|stageRevealRank/);
  assert.match(sceneSource, /uniforms\.uStoryWU\.value = journeySample\.sceneStoryWU/);
  assert.match(sceneSource, /float stageEntrance = iVisibilityStartWU <= 0\.0[\s\S]*?iVisibilityStartWU \+ entranceHandoffWU,[\s\S]*?uStoryWU/);
  assert.match(sceneSource, /float stageExit = 1\.0 - smoothstep\([\s\S]*?iVisibilityEndWU - exitHandoffWU[\s\S]*?iVisibilityEndWU,[\s\S]*?uStoryWU/);
  assert.match(sceneSource, /const entrance = startWU <= 0 \? 1 : smoothstep\([\s\S]*?startWU \+ entranceHandoffWU,[\s\S]*?storyWU/);
  assert.match(sceneSource, /const exit = 1 - smoothstep\([\s\S]*?endWU - exitHandoffWU[\s\S]*?endWU,[\s\S]*?storyWU/);
  assert.match(sceneSource, /stageVisibilityMode: latestFrame\?\.reducedMotion[\s\S]*?'authored-settled-cuts' : 'authored-bounded-whole-surfel-handoff'/);
  assert.match(sceneSource, /presentationScale <= 0\.0[\s\S]*?gl_Position = vec4\(2\.0, 2\.0, 2\.0, 1\.0\)/);
  assert.match(sceneSource, /radiusPx \*= revealProgress \* clamp\(uEntranceScale, 0\.0, 1\.0\)/);
  assert.doesNotMatch(sceneSource, /radiusPx \*= revealProgress \* stageVisibility/);
  assert.match(sceneSource, /fogVolumeOffsetWU = fogVolumeField \* min\(3\.5, fogSpanWU \* 0\.025\)/);
  assert.match(sceneSource, /cameraDepth \+ fogVolumeOffsetWU/);
  assert.doesNotMatch(sceneSource, /mix\(0\.64, 1\.0, revealProgress\)/);
  assert.match(sceneSource, /float circleRadius = length\(vCircle\);[\s\S]*?if \(circleRadius > 1\.0\) discard;/);
  assert.doesNotMatch(sceneSource, /vFogVisibility|vVisibility|visibility \* edge/);
  assert.match(sceneSource, /float edge = 1\.0 - smoothstep\(/);
  assert.match(sceneSource, /if \(uDepthCorePass > 0\.5\)[\s\S]*?circleRadius > 0\.96[\s\S]*?vec4\(shaded, 1\.0\)/);
  assert.match(sceneSource, /if \(circleRadius <= 0\.96\) discard;[\s\S]*?float alpha = edge \* materialAlpha;[\s\S]*?vec4\(shaded, alpha\)/);
  assert.match(sceneSource, /transparent: false,[\s\S]*?alphaToCoverage: true,[\s\S]*?depthWrite: true,[\s\S]*?blending: THREE\.NoBlending/);
  assert.match(sceneSource, /antialias: true/);
  assert.match(sceneSource, /sceneGroup\.add\(core, soft\)/);
  assert.match(sceneSource, /drawCalls = renderer\.info\.render\.calls/);
  assert.match(sceneSource, /occlusionMode: 'depth-owned-whole-surfel-reveal'/);
});

test('Blender role assignments remain intact and resolve through the Home palette', () => {
  assert.equal(ABOUT_BLENDER_PALETTE_ROLES.length, SIMULATION_MATERIAL_ROLE_COUNT);
  assert.deepEqual(ABOUT_HOME_ROLE_BY_BLENDER_ROLE, {
    atmosphere: 'product-design',
    stone: 'experience-design',
    steel: 'art-direction',
    glass: 'motion-3d',
    signal: 'creative-engineering',
    organic: 'parametric-systems',
  });
  const colors = [
    '#101010', '#202020', '#303030', '#404040',
    '#505050', '#606060', '#707070', '#808080',
  ];
  assert.deepEqual(
    resolveAboutSurfelPaletteColors({
      colors,
      distribution: DEFAULT_SIMULATION_COLOR_DISTRIBUTION,
    }),
    ['#101010', '#404040', '#303030', '#707070', '#808080', '#606060'],
  );
  assert.deepEqual(assetMeta.palette.roles, ABOUT_BLENDER_PALETTE_ROLES);
  assert.equal(assetMeta.palette.assignment.owner, 'Blender object properties and semantic materials');
  assert.equal(assetMeta.palette.assignment.defaultMode, 'mixed');
  assert.deepEqual(assetMeta.palette.assignment.modes, ['mixed', 'single', 'authored-faces']);
  for (const object of assetMeta.source.objects) {
    assert.ok(['mixed', 'single', 'authored-faces'].includes(object.paletteMode));
    assert.ok(Number.isInteger(object.paletteSeed) && object.paletteSeed >= 0);
    if (object.paletteMode === 'single') {
      assert.ok(ABOUT_BLENDER_PALETTE_ROLES.includes(object.paletteRole));
    } else {
      assert.equal(object.paletteRole, null);
    }
  }
  for (const model of assetMeta.models) {
    const roles = new Set(assetMeta.source.objects
      .filter((object) => object.modelKey === model.key)
      .flatMap((object) => object.paletteRoles));
    const expectedRoles = model.key === 'about.05'
      ? new Set([0, 1, 3, 4, 5])
      : new Set([0, 1, 2, 3, 4, 5]);
    assert.deepEqual(roles, expectedRoles, `${model.key} lost its authored palette mixture`);
  }

  assert.match(sceneSource, /paletteRoles\[destinationIndex\] = view\.getUint8\(offset \+ 28\)/);
  assert.doesNotMatch(sceneSource, /createAboutSurfelPaletteRoles|materialPaletteKey/);
  assert.match(sceneSource, /vec3 shaded = paletteColor\(vPalette\);/);
  assert.match(sceneSource, /texture2D\(uMaterialAtlas, atlasUv\)/);
  assert.match(sceneSource, /getSimulationBodyMaterialAtlas/);
  assert.doesNotMatch(sceneSource, /normalLight|depthLight/);
});

test('all About circles subscribe to the shared scheduled palette', () => {
  assert.match(sceneSource, /subscribeSimulationPalette\(\(snapshot\) =>/);
  assert.match(sceneSource, /syncPalette\(uniforms, snapshot\)/);
  assert.match(sceneSource, /resolveAboutSurfelPaletteColors\(snapshot\)/);
  assert.match(sceneSource, /paletteUniformUpdates \+= 1/);
  assert.match(stylesSource, /--simulation-role-product-design/);
  assert.match(stylesSource, /--simulation-role-experience-design/);
  assert.match(stylesSource, /--simulation-role-art-direction/);
  assert.match(stylesSource, /--simulation-role-motion-3d/);
  assert.match(stylesSource, /--simulation-role-creative-engineering/);
  assert.match(stylesSource, /--simulation-role-parametric-systems/);
});

test('the public About finale has no model-credit disclosure', () => {
  assert.doesNotMatch(experienceSource, /3D model credit|ABOUT_SCENE_MODEL_CREDITS/);
  assert.doesNotMatch(stylesSource, /about-narrative-model-credits/);
});

test('runtime controls change projected detail, coverage, fog, and coherent motion without rebuilding buffers', () => {
  assert.match(sceneSource, /surfelGeometries = decoded\.modelRanges\.map\(\(range\) => createSurfelGeometry\(decoded, range\)\)/);
  assert.match(sceneSource, /modelRenderBatches = surfelGeometries\.map\(\(geometry, modelId\) =>/);
  assert.match(sceneSource, /geometry\.instanceCount = 0/);
  assert.match(sceneSource, /batch\.geometry\.instanceCount = active \? batch\.count : 0/);
  assert.match(sceneSource, /batch\.core\.visible = active/);
  assert.match(sceneSource, /batch\.soft\.visible = active/);
  assert.match(sceneSource, /if \(active\) activeCount \+= batch\.count/);
  assert.match(sceneSource, /uniforms\.uCoverage\.value = controls\.surfelCoverage/);
  assert.match(sceneSource, /uniforms\.uBackfaceRetention\.value = controls\.backfaceRetention/);
  assert.match(sceneSource, /uniforms\.uDetailBias\.value = controls\.detailBias/);
  assert.match(sceneSource, /uniforms\.uFogStartWU\.value = controls\.fogStartWU/);
  assert.match(sceneSource, /uniforms\.uFogEndWU\.value = Math\.max\(controls\.fogStartWU \+ 0\.001, controls\.fogEndWU\)/);
  assert.match(sceneSource, /uniforms\.uMotionAmountWU\.value = controls\.motionAmountWU/);
  assert.match(sceneSource, /writeAboutSceneLook\(controls, frame, entranceScale, journeySample, authoredCameraFog\)/);
  assert.match(sceneSource, /stableAttributeIdentities\(surfelGeometries\)/);
  assert.match(sceneSource, /lodRadiusScaleMode: 'per-object'/);
  assert.match(sceneSource, /Math\.sqrt\(masterCount \/ Math\.max\(1, profileCount\)\)/);
  assert.match(sceneSource, /view\.getUint16\(offset \+ 22, true\)/);
  assert.doesNotMatch(sceneSource, /new THREE\.Quaternion\(\)[\s\S]{0,200}?quaternion\.slerp/);
  assert.match(sceneSource, /gpuBufferIdentityStable:/);
  assert.match(sceneSource, /drawCalls,/);
  assert.match(sceneSource, /frameTimeMs,/);
});

test('the recovered Blender camera keeps its authored projection, bounded curved travel, and a late hold', () => {
  assert.equal(cameraTrack.version, 5);
  assert.equal(cameraTrack.source, 'about.camera');
  assert.equal(cameraTrack.displayName, 'Scene Camera');
  assert.equal(cameraTrack.projection.type, 'perspective');
  assert.equal(cameraTrack.projection.fovAxis, 'horizontal');
  assert.equal(
    cameraTrack.projection.horizontalFov,
    assetMeta.source.authoring.controlValues['About Controls / 01 Camera FOV'],
  );
  assert.equal(cameraTrack.projection.sensorFit, 'HORIZONTAL');
  assert.equal(cameraTrack.sampleCount, cameraTrack.frameEnd - cameraTrack.frameStart + 1);
  assert.equal(cameraTrack.rollControl, undefined);
  assert.equal(cameraTrack.orientation.path, 'about.camera-path');
  assert.equal(cameraTrack.orientation.pathDisplayName, 'Camera Path');
  assert.equal(cameraTrack.orientation.pathTwistMode, 'Z_UP');
  assert.equal(cameraTrack.orientation.neutralHorizon, 'Z_UP');
  assert.equal(cameraTrack.orientation.rollControl, 'about.controls.roll_00_degrees..roll_09_degrees');
  const lockCue = cameraTrack.journeyCues.find((cue) => cue.name === 'ABS_CAMERA_LOCK');
  const lockIndex = lockCue.frame - cameraTrack.frameStart;
  const movingSteps = [];
  const rotationSteps = [];
  for (let index = 1; index <= lockIndex; index += 1) {
    const from = cameraTrack.samples[index - 1];
    const to = cameraTrack.samples[index];
    movingSteps.push(Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]));
    const quaternionDot = Math.abs(from.slice(3).reduce((sum, value, axis) => (
      sum + value * to[axis + 3]
    ), 0));
    rotationSteps.push(2 * Math.acos(Math.min(1, quaternionDot)) * 180 / Math.PI);
  }
  assert.ok(movingSteps.every((step) => step > 0.01 && step < 10),
    'Every pre-lock frame must advance through a bounded authored camera cadence.');
  assert.ok(Math.max(...rotationSteps) < 1.65, 'Authored rotation must remain continuous between frames.');
  assert.ok(Math.max(...rotationSteps) > 0.05, 'The accepted path must retain its authored curvature.');
  assert.ok(Math.max(...cameraTrack.samples.slice(0, lockIndex + 1).map((sample) => Math.abs(sample[0]))) > 5,
    'The camera path must retain its lateral rollercoaster sweep.');
  for (let index = lockIndex + 1; index < cameraTrack.samples.length; index += 1) {
    assert.deepEqual(cameraTrack.samples[index], cameraTrack.samples[lockIndex]);
  }
  const finalQuaternion = cameraTrack.samples.at(-1).slice(3);
  assert(Math.abs(Math.hypot(...finalQuaternion) - 1) < 0.00001);
  assert.match(sceneSource, /sampleCameraTrack\([\s\S]{0,160}?cameraTrack,[\s\S]{0,80}?progress,[\s\S]{0,80}?cameraAuthoredPosition,[\s\S]{0,80}?cameraAuthoredQuaternion,[\s\S]{0,80}?cameraTargetQuaternion/);
  assert.match(sceneSource, /camera\.position\.copy\(cameraAuthoredPosition\)/);
  assert.match(sceneSource, /camera\.quaternion\.copy\(cameraAuthoredQuaternion\)/);
  assert.match(sceneSource, /cameraMotionSource: 'shared-scroll-sample'/);
  assert.doesNotMatch(sceneSource, /steadycamController|pointerPanController/);
  assert.match(sceneSource, /sampleAuthoredRollDegrees\(cameraTrack, progress\)/);
});

test('the canonical camera directly follows each scroll sample without drift or settling', () => {
  const controller = createAboutNarrativeCameraSteadycamController({ initialNowMs: 0 });
  const sample = createAboutNarrativeCameraSteadycamSample();
  controller.configure({ steadycamResponseMs: document.globals.camera.steadycamResponseMs });
  controller.sampleInto(sample, [0, 0, 0], [0, 0, 0, 1], 0, true);
  controller.sampleInto(sample, [10, 0, 0], [0, 0, 1, 0], 16, false);
  assert.deepEqual(sample.position, [10, 0, 0]);
  assert.deepEqual(sample.quaternion, [0, 0, 1, 0]);
  controller.sampleInto(sample, [10, 0, 0], [0, 0, 1, 0], 1000, false);
  assert.deepEqual(sample.position, [10, 0, 0], 'Stopping scroll leaves no camera catch-up.');
  controller.sampleInto(sample, [20, 1, -4], [0, 0, 0, 1], 32, true);
  assert.deepEqual(sample.position, [20, 1, -4]);
  assert.deepEqual(sample.quaternion, [0, 0, 0, 1]);
});

test('titles restore reversible vertical and depth travel behind the colour draw', () => {
  const titles = document.tracks.text.fields.filter(field => field.kind === 'title');
  for (const field of titles) {
    const sample = createAboutNarrativeTitleFieldSample();
    const values = [0, 0.09, 0.18, 0.5, 0.82, 0.91, 1];
    const states = values.map(progress => ({ ...sampleAboutNarrativeTitleFieldInto(
      field, field.startWU + (field.endWU - field.startWU) * progress,
      document.globals.textMotion, false, sample,
    ) }));
    states.forEach(state => assert.deepEqual([state.x, state.blur], [0, 0]));
    assert.notDeepEqual([states[0].y, states[0].z], [states.at(-1).y, states.at(-1).z]);
    assert.equal(states[0].opacity, 1);
    assert.equal(states[3].opacity, 1);
    assert.equal(states.at(-1).opacity, field.preset === 'finale-v1' ? 1 : 0);
    values.toReversed().forEach((progress, index) => {
      assert.deepEqual({ ...sampleAboutNarrativeTitleFieldInto(field,
        field.startWU + (field.endWU - field.startWU) * progress,
        document.globals.textMotion, false, sample) }, states[states.length - 1 - index]);
    });
    sampleAboutNarrativeTitleFieldInto(field, field.focusWU, document.globals.textMotion, true, sample);
    assert.equal(sample.opacity, 1);
    assert.deepEqual([sample.y, sample.z], [0, 0]);
  }
  assert.doesNotMatch(timelineSource, /applyAboutTitleLineExit/);
  assert.match(timelineSource, /syncTitleEntrance/);
  assert.match(experienceSource, /<CopyEmailAction[\s\S]*?onActivate=\{onFinaleEmailPress\}/);
});

test('statement titles share the centrally controlled viewport anchor with an explicit opener variant', () => {
  document.tracks.text.fields.filter(field => field.kind === 'title').forEach(field => {
    assert.equal(field.presentation?.viewportY, undefined);
  });
  assert.equal(document.globals.textMotion.standardViewportY, 50);
  assert.equal(document.globals.textMotion.bookendViewportY, 50);
  assert.match(experienceSource, /const viewportY = Number\(textMotion\?\.\[isOpener \? 'bookendViewportY' : 'standardViewportY'\] \?\? 50\)/);
  assert.match(experienceSource, /'--about-title-viewport-y': `\$\{viewportY\}%`/);
  assert.doesNotMatch(experienceSource, /responsiveViewportY|field\.presentation\?\.viewportY/);
});

test('mobile client logos remain a two-column grid in short and tall viewports', () => {
  const mobileGridDeclarations = [...stylesSource.matchAll(
    /\.about-narrative-lab\[data-about-layout-profile='mobile'\] \.about-narrative-client-logos\s*\{[\s\S]*?grid-template-columns:\s*repeat\((\d),/g,
  )];
  assert.ok(mobileGridDeclarations.length > 0);
  assert(mobileGridDeclarations.every((match) => match[1] === '2'));
  assert.doesNotMatch(
    stylesSource,
    /@media \(max-height: 600px\)[\s\S]*?\.about-narrative-client-logos\s*\{[\s\S]*?grid-template-columns/,
  );
});

test('tablet client logos use the same two-column small-space layout', () => {
  assert.match(
    stylesSource,
    /data-about-layout-profile='tablet'[\s\S]*?\.about-narrative-client-logos[\s\S]*?grid-template-columns:\s*repeat\(2,/,
  );
});

test('discipline markers retain complete copy and live scene palette roles', () => {
  const disciplines = document.tracks.text.fields.find((field) => field.block?.kind === 'disciplines');
  assert(disciplines?.block.items.length > 0);
  assert(disciplines.block.items.every((item) => item.id && item.label && item.description));
  assert.match(experienceSource, /data-material-role=\{materialRole\}/);
  assert.match(stylesSource, /--simulation-role-product-design/);
  assert.match(stylesSource, /--simulation-role-motion-3d/);
  assert.match(stylesSource, /\.about-narrative-discipline-list li\s*\{[\s\S]*?border:\s*0;/);
  assert.match(stylesSource, /\.about-narrative-discipline-list__copy\s*\{[\s\S]*?gap:\s*0;/);
  assert.match(stylesSource, /clip-path:\s*circle\(50%\)/);
  assert.match(stylesSource, /margin-top:\s*calc\(\(1lh - var\(--discipline-marker-size\)\) \/ 2\)/);
  assert.match(sceneSource, /vec3 paletteColor\(float role\)[\s\S]*?return uPalette5;/);
});

test('editorial lines and atomic rows use the same reversible middle-band focus', () => {
  const positions = [0.9, 0.72, 0.6, 0.5, 0.3, 0.1];
  const sample = y => getAboutNarrativeEditorialFocusOpacity(getAboutNarrativeSharedRevealProgress(y), y);
  const forward = positions.map(sample);
  assert.equal(forward[0], 0.2);
  assert.equal(forward[3], 1);
  assert.equal(forward.at(-1), 0.2);
  assert.deepEqual(positions.toReversed().map(sample), forward.toReversed());
});


test('editorial focus snaps at both boundaries without intermediate opacity', () => {
  for (const resting of [0.2, 0.35]) {
    const samples = Array.from({ length: 1001 }, (_, index) => {
      const y = 1 - index / 1000;
      return getAboutNarrativeEditorialFocusOpacity(getAboutNarrativeSharedRevealProgress(y), y, false, resting);
    });
    assert.deepEqual([...new Set(samples)].sort(), [resting, 1]);
    assert.equal(samples.filter((value, index) => index > 0 && value !== samples[index - 1]).length, 2);
    assert.deepEqual(samples.toReversed(), Array.from({ length: 1001 }, (_, index) => {
      const y = index / 1000;
      return getAboutNarrativeEditorialFocusOpacity(getAboutNarrativeSharedRevealProgress(y), y, false, resting);
    }));
    assert.equal(getAboutNarrativeEditorialFocusOpacity(0.4999, 0.6, false, resting), resting);
    assert.equal(getAboutNarrativeEditorialFocusOpacity(0.5, 0.6, false, resting), 1);
    assert.equal(getAboutNarrativeEditorialFocusOpacity(1, 0.2199, false, resting), resting);
    assert.equal(getAboutNarrativeEditorialFocusOpacity(1, 0.2201, false, resting), 1);
  }
});


test('the active finale contains the platform and upright bounded-turn bust without the added body cluster', () => {
  assert.ok(assetMeta.source.objects.every((object) => object.modelKey !== 'about.01'));
  assert.ok(assetMeta.source.objects.every((object) => !object.objectKey.startsWith('director.form-body.')));
  const platform = assetMeta.source.objects.find((object) => object.objectKey === 'director.finale-platform');
  const bust = assetMeta.source.objects.find((object) => object.objectKey === 'director.finale-surface');
  assert.equal(platform?.modelKey, 'about.05');
  assert.equal(bust?.modelKey, 'about.06');
  const motion = assetMeta.motionGroups.find((group) => group.key === bust.motionKey)?.motion;
  assert.equal(motion?.behavior, 'bounded-rotation');
  assert.deepEqual(motion.axis, [0, 1, 0]);
  assert.equal(motion.timeSource, 'ambient-seconds');
  assert.equal(motion.periodSeconds, 32);
  assert.ok(Math.abs(motion.amplitudeRadians - 8 * Math.PI / 180) < 0.000001);
  assert.equal(motion.pivotWU.length, 3);
  assert.ok(motion.pivotWU.every(Number.isFinite));
  assert.match(experienceSource, /data-about-finale-scene-zone/);
  assert.match(experienceSource, /data-about-finale-copy/);
});
