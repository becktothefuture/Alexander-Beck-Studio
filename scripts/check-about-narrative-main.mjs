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
import { createAboutSurfelPaletteRoles } from '../react-app/app/src/routes/about-narrative-lab/aboutSurfelPalette.js';
import {
  createAboutNarrativeCameraSteadycamController,
  createAboutNarrativeCameraSteadycamSample,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraSteadycam.js';
import {
  SIMULATION_MATERIAL_ROLE_COUNT,
} from '../react-app/app/src/palette/simulationPaletteContract.js';

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
  assert.equal(document.tracks.text.fields.length, 13);
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
  assert.equal(document.globals.scrollSmoothing, 0);
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
  assert.deepEqual(
    new Set(assetMeta.models.map((model) => model.key)),
    new Set(['about.00', 'about.01', 'about.02', 'about.03', 'about.04', 'about.05']),
  );
  const expectedVisibilityCues = new Map([
    ['about.00', ['opening', 'inciting-question']],
    ['about.01', ['inciting-question', 'portal-entry']],
    ['about.02', ['portal-entry', 'portal-exit']],
    ['about.03', ['portal-exit', 'gate-entry']],
    ['about.04', ['gate-entry', 'gate-exit']],
    ['about.05', ['gate-exit', 'terminal-hold']],
  ]);
  for (const model of assetMeta.models) {
    assert(model.surfelRange.count > 0, `${model.id} has no master surfels`);
    assert(assetMeta.profiles.desktop.perModelCounts[model.key] > 0, `${model.key} has no desktop surfels`);
    assert(assetMeta.profiles.mobile.perModelCounts[model.key] > 0, `${model.key} has no mobile surfels`);
    assert(Number.isFinite(model.visibilityStartWU), `${model.key} has no visibility start`);
    assert(Number.isFinite(model.visibilityEndWU), `${model.key} has no visibility end`);
    assert(model.visibilityHandoffWU > 0 && model.visibilityHandoffWU <= 0.2);
    assert.deepEqual(
      [model.visibilityStartCue, model.visibilityEndCue],
      expectedVisibilityCues.get(model.key),
      `${model.key} is not bound to its semantic story interval`,
    );
    assert(Number.isFinite(model.visibilityStartOffsetWU));
    assert(Number.isFinite(model.visibilityEndOffsetWU));
  }
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
    'iVisibilityHandoffWU',
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
  assert.match(sceneSource, /revealRanks\[index\] = view\.getUint16\(offset \+ 18, true\)/);
  assert.match(sceneSource, /InstancedBufferAttribute\(decoded\.revealRanks, 1, true\)/);
  assert.match(sceneSource, /octDecodeNormal\(iNormalOct\)/);
  assert.match(sceneSource, /surfaceFacing < -clamp\(uBackfaceRetention/);
  assert.match(sceneSource, /revealVisibility = min\([\s\S]*?fogVisibility[\s\S]*?uSceneVisibility[\s\S]*?uEntranceScale[\s\S]*?uOpacity/);
  assert.match(sceneSource, /revealProgress = smoothstep\([\s\S]*?revealRank \+ 0\.08/);
  assert.match(sceneSource, /float manifestationSpread = clamp\(uManifestationSpread \* materialScale\.x, 0\.0, 0\.8\)/);
  assert.match(sceneSource, /revealRank = min\([\s\S]*?iRevealRank \* manifestationSpread[\s\S]*?manifestationSpread - 0\.001/);
  assert.match(sceneSource, /uniforms\.uManifestationSpread\.value = controls\.manifestationSpread/);
  assert.match(sceneSource, /revealProgress <= 0\.0[\s\S]*?gl_Position = vec4\(2\.0, 2\.0, 2\.0, 1\.0\)/);
  assert.match(sceneSource, /stageRevealProgress = smoothstep\(/);
  assert.match(sceneSource, /uniforms\.uStoryWU\.value = journeySample\.sceneStoryWU/);
  assert.match(sceneSource, /stageVisibilityMode: latestFrame\?\.reducedMotion[\s\S]*?'authored-settled-cuts' : 'authored-bounded-whole-surfel-handoff'/);
  assert.match(sceneSource, /radiusPx \*= mix\(0\.64, 1\.0, revealProgress\)/);
  assert.doesNotMatch(sceneSource, /radiusPx \*= clamp\(uEntranceScale/);
  assert.match(sceneSource, /float circleRadius = length\(vCircle\);[\s\S]*?if \(circleRadius > 1\.0\) discard;/);
  assert.doesNotMatch(sceneSource, /vFogVisibility|vVisibility|visibility \* edge/);
  assert.match(sceneSource, /float edge = 1\.0 - smoothstep\(/);
  assert.match(sceneSource, /if \(uDepthCorePass > 0\.5\)[\s\S]*?circleRadius > 0\.96[\s\S]*?vec4\(shaded, 1\.0\)/);
  assert.match(sceneSource, /if \(circleRadius <= 0\.96\) discard;[\s\S]*?float alpha = edge;[\s\S]*?vec4\(shaded, alpha\)/);
  assert.match(sceneSource, /transparent: false,[\s\S]*?alphaToCoverage: true,[\s\S]*?depthWrite: true,[\s\S]*?blending: THREE\.NoBlending/);
  assert.match(sceneSource, /antialias: true/);
  assert.match(sceneSource, /sceneGroup\.add\(surfelCore, surfelSoft\)/);
  assert.match(sceneSource, /drawCalls = renderer\.info\.render\.calls/);
  assert.match(sceneSource, /occlusionMode: 'depth-owned-whole-surfel-reveal'/);
});

test('every Blender material keeps its semantic structure inside the Home palette', () => {
  const sampleCount = 1_000;
  const roles = createAboutSurfelPaletteRoles(sampleCount, {
    modelId: 2,
    partId: 4,
    semanticRole: 5,
  });
  const counts = new Array(SIMULATION_MATERIAL_ROLE_COUNT).fill(0);
  roles.forEach((role) => { counts[role] += 1; });
  assert.ok(counts[5] >= 700, 'the authored material role must remain dominant');
  assert.ok(new Set(roles).size >= 4, 'the material must retain multicolour Home accents');
  const structuralRoles = createAboutSurfelPaletteRoles(sampleCount, { semanticRole: 2 });
  assert.ok(
    structuralRoles.filter((role) => role === 1).length >= 700,
    'structural shells must avoid a pale-on-pale dominant role',
  );

  for (const model of assetMeta.models) {
    model.objectKeys.forEach((objectKey, partId) => {
      const objectCount = assetMeta.profiles.mobile.perObjectCounts[objectKey];
      const objectRoles = createAboutSurfelPaletteRoles(objectCount, {
        modelId: model.id,
        partId,
        semanticRole: partId,
      });
      assert.equal(objectRoles.length, objectCount, `${objectKey} lost palette assignments`);
      if (objectCount >= 4) {
        assert.ok(
          new Set(objectRoles).size >= 2,
          `${objectKey} does not retain a multicolour Home material rhythm`,
        );
      }
    });
  }

  assert.match(sceneSource, /materialPaletteKey = `\$\{partKey\}:\$\{semanticRole\}`/);
  assert.match(sceneSource, /createAboutSurfelPaletteRoles\(partCount,/);
  assert.match(sceneSource, /sourceObjects\.get\(objectKey\)\?\.role === 'path-tunnel'/);
  assert.match(sceneSource, /semanticRole % PALETTE_ROLE_COUNT/);
  assert.match(sceneSource, /vec3 shaded = paletteColor\(vPalette\);/);
  assert.doesNotMatch(sceneSource, /normalLight|depthLight/);
});

test('all About circles subscribe to the shared scheduled palette', () => {
  assert.match(sceneSource, /subscribeSimulationPalette\(\(snapshot\) =>/);
  assert.match(sceneSource, /syncPalette\(uniforms, snapshot\)/);
  assert.match(sceneSource, /distribution\[index\]\?\.colorIndex/);
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
  assert.match(sceneSource, /activeCount = count/);
  assert.match(sceneSource, /surfelGeometry\.instanceCount = activeCount/);
  assert.match(sceneSource, /uniforms\.uCoverage\.value = controls\.surfelCoverage/);
  assert.match(sceneSource, /uniforms\.uBackfaceRetention\.value = controls\.backfaceRetention/);
  assert.match(sceneSource, /uniforms\.uDetailBias\.value = controls\.detailBias/);
  assert.match(sceneSource, /uniforms\.uFogStartWU\.value = controls\.fogStartWU/);
  assert.match(sceneSource, /uniforms\.uFogEndWU\.value = Math\.max\(controls\.fogStartWU \+ 0\.001, controls\.fogEndWU\)/);
  assert.match(sceneSource, /uniforms\.uMotionAmountWU\.value = controls\.motionAmountWU/);
  assert.match(sceneSource, /writeAboutSceneLook\(controls, frame, entranceScale, journeySample\)/);
  assert.match(sceneSource, /stableAttributeIdentities\(surfelGeometry\)/);
  assert.match(sceneSource, /lodRadiusScaleMode: 'per-object'/);
  assert.match(sceneSource, /Math\.sqrt\(masterCount \/ Math\.max\(1, profileCount\)\)/);
  assert.match(sceneSource, /view\.getUint16\(offset \+ 22, true\)/);
  assert.doesNotMatch(sceneSource, /new THREE\.Quaternion\(\)[\s\S]{0,200}?quaternion\.slerp/);
  assert.match(sceneSource, /gpuBufferIdentityStable:/);
  assert.match(sceneSource, /drawCalls,/);
  assert.match(sceneSource, /frameTimeMs,/);
});

test('the exported Blender camera has one sparse roll control and a level ending', () => {
  assert.equal(cameraTrack.version, 5);
  assert.equal(cameraTrack.source, 'ABS_CAMERA');
  assert.equal(cameraTrack.projection.type, 'perspective');
  assert.equal(cameraTrack.projection.fovAxis, 'horizontal');
  assert.equal(cameraTrack.projection.horizontalFov, 65);
  assert.equal(cameraTrack.sampleCount, cameraTrack.frameEnd - cameraTrack.frameStart + 1);
  assert.equal(cameraTrack.rollControl.keyframes.length, 9);
  assert.deepEqual(
    cameraTrack.rollControl.keyframes.slice(0, 4).map((keyframe) => keyframe.degrees),
    [0, -8, 8, 0],
  );
  assert.deepEqual(
    cameraTrack.rollControl.keyframes.slice(-5).map((keyframe) => keyframe.degrees),
    [0, -6, 8, -4, 0],
  );
  const finalQuaternion = cameraTrack.samples.at(-1).slice(3);
  assert(Math.abs(finalQuaternion[0]) < 0.002);
  assert(Math.abs(finalQuaternion[1]) < 0.002);
  assert(Math.abs(finalQuaternion[2]) < 0.002);
  assert(Math.abs(Math.hypot(...finalQuaternion) - 1) < 0.00001);
  assert.equal(cameraTrack.orientation.steadycam.lookAheadMetres, 17.73);
  assert.match(sceneSource, /sampleCameraTrack\([\s\S]{0,160}?cameraTrack,[\s\S]{0,80}?progress,[\s\S]{0,80}?cameraAuthoredPosition,[\s\S]{0,80}?cameraAuthoredQuaternion,[\s\S]{0,80}?cameraTargetQuaternion/);
  assert.match(sceneSource, /steadycamController\.sampleInto\([\s\S]{0,220}?steadycamSample/);
  assert.match(sceneSource, /camera\.position\.set\([\s\S]{0,180}?steadycamSample\.position/);
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

test('canonical titles retain their fast entrance, fade floor, and opaque finale', () => {
  assert.equal(document.globals.textMotion.titleDrawDurationMs, 90);
  assert.equal(document.globals.textMotion.titleColorCount, 5);
  assert.equal(document.globals.textMotion.titleLineStaggerMs, 70);
  assert.equal(document.globals.textMotion.titleExitOpacity, 0.2);
  const opener = document.tracks.text.fields.find((field) => field.preset === 'opener-v1');
  const sample = createAboutNarrativeTitleFieldSample();
  const start = sampleAboutNarrativeTitleFieldInto(
    opener,
    opener.startWU,
    document.globals.textMotion,
    false,
    sample,
  );
  assert.deepEqual({ opacity: start.opacity, y: start.y, z: start.z }, { opacity: 1, y: 0, z: 0 });
  assert.match(timelineSource, /field\.preset === 'finale-v1'[\s\S]*?glyph\.style\.opacity = '1'/);
  assert.match(experienceSource, /<CopyEmailAction[\s\S]*?onActivate=\{onFinaleEmailPress\}/);
  assert.match(experienceSource, /<LinkedInAction[\s\S]*?href=\{ABOUT_NARRATIVE_CONTACT\.linkedin\}/);
});

test('discipline markers retain complete copy and live scene palette roles', () => {
  const disciplines = document.tracks.text.fields.find((field) => field.block?.kind === 'disciplines');
  assert(disciplines?.block.items.length > 0);
  assert(disciplines.block.items.every((item) => item.id && item.label && item.description));
  assert.match(experienceSource, /data-material-role=\{materialRole\}/);
  assert.match(stylesSource, /--simulation-role-product-design/);
  assert.match(stylesSource, /--simulation-role-motion-3d/);
  assert.match(stylesSource, /clip-path:\s*circle\(50%\)/);
  assert.match(sceneSource, /vec3 paletteColor\(float role\)[\s\S]*?return uPalette5;/);
});
