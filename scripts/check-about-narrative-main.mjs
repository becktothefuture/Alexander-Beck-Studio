import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  loadAboutNarrativePointFieldPersistenceSource,
  preflightAboutNarrativePointFieldRuntimePlans,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';
import {
  compileAboutNarrativeComposerPlan,
  createAboutNarrativeComposerFrameSample,
  getAboutNarrativeComposerPreparationRequest,
  sampleAboutNarrativeComposerPlanInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js';
import {
  ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS,
  getAboutNarrativeShapeDefinition,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';
import {
  createAboutNarrativePointFieldEditorStore,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldEditorStore.js';
import {
  createAboutNarrativeSeeds,
  generateAboutNarrativeShape,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointShapes.js';
import {
  ABOUT_NARRATIVE_LONG_ASSEMBLY,
  createAboutNarrativeLongAssemblyBlueprint,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeLongAssembly.js';
import {
  ABOUT_NARRATIVE_LONG_RIDE,
  ABOUT_NARRATIVE_LONG_RIDE_CAMERA_FOV,
  ABOUT_NARRATIVE_LONG_RIDE_LOOK_AHEAD_WU,
  compileAboutNarrativeLongRideTrack,
  sampleAboutNarrativeLongRideBank,
  sampleAboutNarrativeLongRidePositionInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeLongRideTrack.js';
import {
  compileAboutNarrativeStoryLayout,
  materializeAboutNarrativeStoryLayout,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeStoryLayout.js';
import {
  createAboutNarrativeWorldTransformSample,
  resolveAboutNarrativeWorldTransformInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeWorldTransform.js';
import {
  createAboutNarrativeTitleFieldSample,
  sampleAboutNarrativeTitleFieldInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';

const ROOT = new URL('../', import.meta.url);
const SHAPE_ID = 'long-assembly-corridor-v1';
const STATE_ID = 'v2-long-assembly';
const SHARED_SEED = 506832829;
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

const readConfig = async (name) => JSON.parse(await readFile(
  new URL(`react-app/app/public/config/${name}`, ROOT),
  'utf8',
));

function rotateVectorByQuaternion(vector, quaternion) {
  const [x, y, z] = vector;
  const [qx, qy, qz, qw] = quaternion;
  const ix = (qw * x) + (qy * z) - (qz * y);
  const iy = (qw * y) + (qz * x) - (qx * z);
  const iz = (qw * z) + (qx * y) - (qy * x);
  const iw = (-qx * x) - (qy * y) - (qz * z);
  return [
    (ix * qw) + (iw * -qx) + (iy * -qz) - (iz * -qy),
    (iy * qw) + (iw * -qy) + (iz * -qx) - (ix * -qz),
    (iz * qw) + (iw * -qz) + (ix * -qy) - (iy * -qx),
  ];
}
const [
  v2,
  editorSource,
  definitionsSource,
  experienceSource,
  rendererSource,
  stylesSource,
  timelineSource,
] = await Promise.all([
  readConfig('contents-about.json'),
  readFile(new URL(
    'react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx',
    ROOT,
  ), 'utf8'),
  readFile(new URL(
    'react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js',
    ROOT,
  ), 'utf8'),
  readFile(new URL(
    'react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx',
    ROOT,
  ), 'utf8'),
  readFile(new URL(
    'react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx',
    ROOT,
  ), 'utf8'),
  readFile(new URL(
    'react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css',
    ROOT,
  ), 'utf8'),
  readFile(new URL(
    'react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js',
    ROOT,
  ), 'utf8'),
]);

test('the canonical Director keeps only the high-signal camera controls', () => {
  assert.match(editorSource, /Steadicam response/);
  assert.match(editorSource, /Camera track glide/);
  assert.match(definitionsSource, /Track settling/);
  assert.match(definitionsSource, /Mouse pan amount/);
  assert.match(editorSource, /Field of view stays fixed at 85°/);
});

test('the canonical experience exposes one grouped whole-page parameter surface', () => {
  const entries = ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.flatMap((group) => (
    group.controls.map((entry) => ({ ...entry, groupId: group.id }))
  ));
  const entryKeys = entries.map((entry) => `${entry.scope}:${entry.path.join('.')}`);

  assert.equal(ABOUT_NARRATIVE_V2_PAGE_PARAMETER_GROUPS.length, 5);
  assert.equal(entries.length, 19);
  assert.equal(new Set(entryKeys).size, entries.length);
  assert(entries.every((entry) => entry.control.type === 'range'));
  assert(!entryKeys.includes('long-assembly:cameraLookAheadWU'));
  assert(!entryKeys.includes('globals:camera.pointerPanResponseMs'));
  assert(!entryKeys.some((key) => key.startsWith('globals:swarmTurbulence.')));
  assert.match(editorSource, /data-director-page-parameters/);
  assert.match(editorSource, />Parameters<\/button>/);
});

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

function assertHoldContract(segment) {
  assert.equal(segment.transition.type, 'hold');
  assert.equal(segment.transition.easing, 'linear');
  assert.equal(segment.transition.correspondence, null);
  assert.equal(segment.transition.progress, 1);
  assert.deepEqual(segment.transition.stagger, { mode: 'uniform', amount: 0 });
  assert.deepEqual(segment.transition.path, { mode: 'direct', amount: 0 });
  assert.deepEqual(segment.transition.flatten, { mode: 'none', amount: 0 });
}

function zBounds(output) {
  let minimum = Number.POSITIVE_INFINITY;
  let maximum = Number.NEGATIVE_INFINITY;
  for (let index = 2; index < output.positions.length; index += 3) {
    minimum = Math.min(minimum, output.positions[index]);
    maximum = Math.max(maximum, output.positions[index]);
  }
  return { minimum, maximum };
}

test('the canonical About source preserves the complete authored text spine and validates', () => {
  const loaded = loadAboutNarrativePointFieldPersistenceSource(v2, {
    preflight: preflightAboutNarrativePointFieldRuntimePlans,
  });
  assert.equal(loaded.valid, true, loaded.message);
  const textById = new Map(v2.tracks.text.fields.map((field) => [field.id, field]));
  assert.equal(v2.tracks.text.fields.length, 12);
  assert(v2.tracks.text.fields.every((field) => field.flow));
  assertMomentBound(v2.tracks.pointField.keys, textById, 'Point-field key');
  assertMomentBound(v2.tracks.visibility.keys, textById, 'Visibility key');
  assertMomentBound(v2.tracks.camera.moveKeys, textById, 'Camera move key');
  assertMomentBound(v2.tracks.camera.lookKeys, textById, 'Camera look key');
  assertMomentBound(v2.tracks.camera.lensKeys, textById, 'Camera lens key');
  assertMomentBound(v2.tracks.interactions.clips, textById, 'Living activation', 'activationWU');
});

test('the canonical experience contains one permanent corridor and none of the rejected simulations', () => {
  const states = v2.tracks.pointField.stateDefinitions;
  assert.equal(states.length, 1);
  assert.equal(states[0].id, STATE_ID);
  assert.equal(states[0].shapeId, SHAPE_ID);
  assert.equal(states[0].protected, true);
  assert.equal(states[0].shapeParameters.storyDurationWU, 22);
  assert.equal(states[0].shapeParameters.density, 1);
  assert.deepEqual(
    {
      background: states[0].shapeParameters.backgroundAnchorWU,
      intersection: states[0].shapeParameters.intersectionAnchorWU,
      disciplines: states[0].shapeParameters.disciplinesAnchorWU,
      city: states[0].shapeParameters.cityAnchorWU,
      finale: states[0].shapeParameters.finaleAnchorWU,
    },
    ABOUT_NARRATIVE_LONG_ASSEMBLY.baseStoryAnchors,
  );
  assert.equal(states[0].railAnchorWU, 0);
  assert.equal(states[0].entryDistanceWU, v2.globals.worldRail.originZ);

  assert(getAboutNarrativeShapeDefinition(SHAPE_ID));
  assert(getAboutNarrativeShapeDefinition(SHAPE_ID).parameters.some((control) => (
    control.id === 'loopRollDegrees'
  )));
  FORBIDDEN_REJECTED_TOKENS.forEach((shapeId) => {
    assert.equal(getAboutNarrativeShapeDefinition(shapeId), null);
  });
  const activeGraph = JSON.stringify({
    camera: v2.tracks.camera,
    pointField: v2.tracks.pointField,
    interactions: v2.tracks.interactions,
    library: v2.library,
  });
  FORBIDDEN_REJECTED_TOKENS.forEach((token) => {
    assert.equal(activeGraph.includes(token), false, `the active canonical graph still contains “${token}”`);
  });
  assert.equal(v2.tracks.camera.orbit, undefined);
  assert.equal(v2.globals.pointMaterial.opacity, 1);
  assert.equal(v2.globals.pointMaterial.pointerForcePx, 0);
  assert(v2.tracks.visibility.keys.every((key) => key.visibility === 1));
  assert(Object.values(v2.globals.swarmTurbulence).every((value) => value === 0));
  assert.deepEqual(
    v2.library.presets.map(({ id, label }) => ({ id, label })),
    [{ id: 'long-assembly-v1', label: 'The Long Assembly' }],
  );
});

test('the approved world stays sparse, circular, centred, and open at both ends', () => {
  const state = v2.tracks.pointField.stateDefinitions[0];
  assert.equal('supportSpacingWU' in state.shapeParameters, false);
  const blueprint = createAboutNarrativeLongAssemblyBlueprint(state.shapeParameters);
  const signal = blueprint.primitives.find((primitive) => primitive.role === 'opening-signal-ring');
  assert(signal);
  assert.equal(signal.kind, 'torus');
  assert.equal(state.shapeParameters.signalRadius, 2.59);
  assert.equal(signal.radiusX, 2.59);
  assert(Math.abs(signal.radiusX - signal.radiusY) <= TIME_EPSILON);
  assert.equal(signal.materialCycle.length, 6);

  const hoops = blueprint.primitives.filter((primitive) => primitive.role === 'centered-hoop');
  assert.equal(hoops.length, state.shapeParameters.hoopCount);
  assert(hoops.every((hoop) => Math.abs(hoop.radiusX - hoop.radiusY) <= TIME_EPSILON));
  assert(hoops.every((hoop) => hoop.materialCycle.length === 6));

  const loopGates = blueprint.primitives.filter((primitive) => primitive.role === 'rotating-loop-gate');
  assert.equal(loopGates.length, state.shapeParameters.loopGateCount);
  assert(loopGates.at(-1).baseWU - loopGates[0].baseWU > 5.5);
  assert.equal(new Set(loopGates.map((gate) => gate.material)).size, 6);
  assert(loopGates.every((gate) => gate.includeSill));
  for (const gate of loopGates) {
    const centre = sampleAboutNarrativeLongRidePositionInto(
      blueprint.track,
      gate.runtimeWU,
      [0, 0, 0],
    );
    assert(Math.hypot(...centre.map((value, axis) => value - gate.frame.position[axis])) < 0.000001);
  }

  assert.equal(
    blueprint.primitives.some((primitive) => primitive.role === 'converging-current'),
    false,
  );
  assert.equal(
    blueprint.primitives.some((primitive) => (
      primitive.beat === 'rail'
      || ['continuous-deck', 'continuous-rail', 'track-ties', 'signal-conduit', 'ground-support']
        .includes(primitive.role)
    )),
    false,
  );
  assert(blueprint.primitives
    .filter((primitive) => primitive.kind === 'gate')
    .every((gate) => gate.baseWU < blueprint.track.baseStages.living.startWU));
  assert(blueprint.terminalWU > blueprint.track.storyDurationWU + 0.8);
});

test('canonical titles share one fast line-aware colour entrance and a 0.2 fade floor', () => {
  assert.equal(v2.globals.textMotion.titleDrawDurationMs, 90);
  assert.equal(v2.globals.textMotion.titleColorCount, 5);
  assert.equal(v2.globals.textMotion.titleLineStaggerMs, 70);
  assert.equal(v2.globals.textMotion.readableEnd, 0.72);
  assert.equal(v2.globals.textMotion.titleExitOpacity, 0.2);
  assert.equal(v2.globals.textMotion.titleExitLineStagger, 0.16);
  assert.equal(v2.globals.textMotion.bookendViewportY, 50);
  const bookends = v2.tracks.text.fields.filter((field) => (
    field.preset === 'opener-v1' || field.preset === 'finale-v1'
  ));
  assert.equal(bookends.length, 2);
  assert(bookends.every((field) => field.titleStyle === 'display'));

  const opener = bookends.find((field) => field.preset === 'opener-v1');
  const sample = createAboutNarrativeTitleFieldSample();
  const start = sampleAboutNarrativeTitleFieldInto(
    opener,
    opener.startWU,
    v2.globals.textMotion,
    false,
    sample,
  );
  assert.deepEqual(
    { opacity: start.opacity, y: start.y, z: start.z },
    { opacity: 1, y: 0, z: 0 },
  );
  const late = sampleAboutNarrativeTitleFieldInto(
    opener,
    opener.startWU + ((opener.endWU - opener.startWU) * 0.86),
    v2.globals.textMotion,
    false,
    sample,
  );
  assert(late.opacity > 0 && late.opacity < 1);
  assert(late.y < 0);
  assert(late.z > 0);
  const end = sampleAboutNarrativeTitleFieldInto(
    opener,
    opener.endWU,
    v2.globals.textMotion,
    false,
    sample,
  );
  assert.deepEqual(
    { opacity: end.opacity, y: end.y, z: end.z },
    {
      opacity: 0,
      y: v2.globals.textMotion.endY,
      z: v2.globals.textMotion.exitDepth * 0.4,
    },
  );
  assert.match(timelineSource, /field\.preset === 'opener-v1'[\s\S]*?glyph\.style\.opacity = '1'/);
  assert.match(timelineSource, /solidTitles && !usesUnitExit/);
  assert.match(timelineSource, /drawLineStaggerMs \/ Math\.max\(1, drawLineCount - 1\)/);
  assert.match(stylesSource, /about-narrative-opening-copy[\s\S]*?var\(--fragment-z, 0px\)/);
});

test('the canonical finale stays centred and opaque above the shared email and LinkedIn actions', () => {
  const finale = v2.tracks.text.fields.find((field) => field.preset === 'finale-v1');
  assert.equal(v2.globals.textMotion.bookendViewportY, 50);
  assert.equal(finale.presentation.layout, 'text-finale-cta');
  assert.match(stylesSource, /data-about-experience-version='v2'\] \{[\s\S]*?--about-finale-lockup-y: 50%/);
  assert.match(experienceSource, /<CopyEmailAction[\s\S]*?onActivate=\{onFinaleEmailPress\}/);
  assert.match(experienceSource, /<LinkedInAction[\s\S]*?href=\{ABOUT_NARRATIVE_CONTACT\.linkedin\}/);
  assert.match(experienceSource, /worldRuntimeRef\.current\?\.triggerOceanImpulse\?\.\(\)/);
  assert.match(timelineSource, /field\.preset === 'finale-v1'[\s\S]*?glyph\.style\.opacity = '1'/);
});

test('the narrative scrollport uses its progress rail instead of a window-sized focus ring', () => {
  assert.match(
    stylesSource,
    /\.about-narrative-scrollport:focus-visible \{[\s\S]*?outline: none;[\s\S]*?box-shadow: none;/,
  );
  assert.match(
    stylesSource,
    /html:has\(\.about-narrative-scrollport:focus-visible\)[\s\S]*?\.about-narrative-indicator__line\.is-active/,
  );
});

test('the finale email press starts one GPU ocean impulse at the near edge', () => {
  const oceanParameters = v2.tracks.pointField.stateDefinitions.find(
    (state) => state.shapeId === SHAPE_ID,
  ).shapeParameters;
  assert.equal(oceanParameters.oceanHeight, -6.2);
  assert.equal(oceanParameters.oceanDensity, 0.9);
  assert.equal(oceanParameters.oceanAmplitude, 2.05);
  assert.equal(oceanParameters.oceanSpeed, 1.04);
  assert.equal(oceanParameters.oceanChop, 1.08);
  assert.equal(oceanParameters.oceanSplashAmount, 1.2);
  assert.equal(oceanParameters.oceanSplashHeight, 4.4);
  assert.match(rendererSource, /float oceanBackwashPhase =/);
  assert.match(rendererSource, /float oceanGust =/);
  assert.match(rendererSource, /float oceanCrestEnergy = smoothstep\(/);
  assert.equal(oceanParameters.oceanFogDistanceScale, 24);
  assert.match(definitionsSource, /numberControl\('oceanHeight', 'Ocean height', -8, 2/);
  assert.match(definitionsSource, /numberControl\('oceanDensity', 'Ocean density', 0\.1, 1/);
  assert.match(editorSource, /label="Ocean height"[\s\S]*?value=\{state\.shapeParameters\?\.oceanHeight \?\? -6\.2\}[\s\S]*?min=\{-8\}/);
  assert.match(editorSource, /label="Ocean density"[\s\S]*?value=\{state\.shapeParameters\?\.oceanDensity \?\? 0\.9\}/);
  assert.match(editorSource, /label="Ocean horizon depth"[\s\S]*?value=\{state\.shapeParameters\?\.oceanFogDistanceScale \?\? 24\}[\s\S]*?max=\{32\}/);
  assert.match(rendererSource, /float oceanDepthDensity = mix\(/);
  assert.match(rendererSource, /oceanDensity \* 0\.22/);
  assert.match(rendererSource, /OCEAN_DENSITY_RAMP_DEPTH_WU = 140/);
  assert.match(rendererSource, /presence \*= mix\(1\.0, oceanDensityPresence, oceanWeight\)/);
  assert.match(rendererSource, /uniform float oceanImpulseProgress;/);
  assert.match(rendererSource, /uniform float oceanImpulseAmplitude;/);
  assert.match(rendererSource, /sampleOceanImpulse\(oceanLocalCoordinate\)/);
  assert.match(rendererSource, /triggerOceanImpulse: \(\) => \{/);
  assert.match(rendererSource, /oceanImpulseStartedAt = performance\.now\(\)/);
  assert.match(rendererSource, /OCEAN_IMPULSE_NEAR_Z = -395\.5/);
  assert.match(rendererSource, /OCEAN_IMPULSE_DEPTH_WU = 1800/);
  assert.match(rendererSource, /OCEAN_REVEAL_DEPTH_WU = 1100/);
  assert.match(rendererSource, /OCEAN_REVEAL_FEATHER_WU = 300/);
  assert.match(rendererSource, /POINT_WORLD_CAMERA_FAR_WU = 2400/);
  assert.match(
    rendererSource,
    /PerspectiveCamera\(48, 1, 0\.08, POINT_WORLD_CAMERA_FAR_WU\)/,
  );
  assert.match(rendererSource, /float oceanSpatialReveal = 1\.0 - smoothstep\(/);
  assert.match(rendererSource, /presence \*= mix\(1\.0, oceanSpatialReveal, oceanWeight\);/);
  assert.match(rendererSource, /const oceanRevealLeadWU = Math\.max\([\s\S]*?3\.2/);
});

test('two keys hold the same fixed geometry for the complete journey', () => {
  const { keys, segments } = v2.tracks.pointField;
  assert.equal(keys.length, 2);
  assert.equal(segments.length, 1);
  assert.deepEqual(keys.map((key) => key.stateId), [STATE_ID, STATE_ID]);
  assert.equal(keys[0].atWU, 0);
  assert.equal(keys[1].atWU, v2.profiles.desktop.storyDurationWU);
  assert(keys.every((key) => key.protected));
  assert.equal(segments[0].fromKeyId, keys[0].id);
  assert.equal(segments[0].toKeyId, keys[1].id);
  assertHoldContract(segments[0]);
});

test('the camera follows one long, banked ride through local fog', () => {
  const { moveKeys, lookKeys, lensKeys } = v2.tracks.camera;
  const state = v2.tracks.pointField.stateDefinitions[0];
  const track = compileAboutNarrativeLongRideTrack(state.shapeParameters);
  assert.equal(moveKeys.length, 13);
  assert.equal(lookKeys.length, moveKeys.length);
  assert.equal(lensKeys.length, 1);
  assert.equal(lensKeys[0].fov, ABOUT_NARRATIVE_LONG_RIDE_CAMERA_FOV);
  assert.equal(moveKeys[0].position[2], v2.globals.worldRail.originZ);
  assert.equal(moveKeys.at(-1).atWU, v2.profiles.desktop.storyDurationWU);
  assert(moveKeys.every((key) => key.velocityMode === 'fluid'));
  for (const key of moveKeys) {
    const expected = sampleAboutNarrativeLongRidePositionInto(track, key.atWU, [0, 0, 0]);
    key.position.forEach((value, axis) => {
      assert(Math.abs(value - expected[axis]) <= 0.001);
    });
  }
  const positions = Array.from({ length: 221 }, (_, index) => (
    sampleAboutNarrativeLongRidePositionInto(track, index / 10, [0, 0, 0])
  ));
  const xValues = positions.map((position) => position[0]);
  const yValues = positions.map((position) => position[1]);
  const zValues = positions.map((position) => position[2]);
  assert(Math.max(...xValues) - Math.min(...xValues) > 18);
  assert(Math.max(...yValues) - Math.min(...yValues) > 16);
  for (let index = 1; index < zValues.length; index += 1) {
    assert(zValues[index] < zValues[index - 1]);
  }
  const banks = Array.from({ length: 221 }, (_, index) => (
    sampleAboutNarrativeLongRideBank(track, index / 10)
  ));
  assert(Math.max(...banks.map(Math.abs)) >= 359);
  assert.equal(state.shapeParameters.loopRollDegrees, 360);
  assert(lookKeys.every((key) => (key.rollOffset ?? 0) === 0));
  const reverseRollTrack = compileAboutNarrativeLongRideTrack({
    ...state.shapeParameters,
    loopRollDegrees: -360,
  });
  assert(sampleAboutNarrativeLongRideBank(reverseRollTrack, 14.5) <= -359);
  const finalApproachX = positions.slice(180).map((position) => position[0]);
  assert(Math.max(...finalApproachX) - Math.min(...finalApproachX) < 0.12);
  assert.equal(v2.globals.camera.distanceFogStartWU, 7);
  assert.equal(v2.globals.camera.distanceFogEndWU, 34);
  assert.equal(v2.globals.camera.forwardSpeedWU, ABOUT_NARRATIVE_LONG_RIDE.forwardUnitsPerWU);
  assert(v2.globals.scrollSmoothing >= 0.9 && v2.globals.scrollSmoothing <= 1);
  assert(v2.globals.camera.steadycamResponseMs >= 200);
  assert(v2.globals.camera.pointerPanDegrees >= 0 && v2.globals.camera.pointerPanDegrees <= 8);
  assert(v2.globals.camera.pointerPanResponseMs >= 80);
  assert.equal(track.lookAheadWU, state.shapeParameters.cameraLookAheadWU);
  assert.equal(track.lookAheadWU, ABOUT_NARRATIVE_LONG_RIDE_LOOK_AHEAD_WU);
  assert.equal(v2.globals.worldRail.unitsPerWU, ABOUT_NARRATIVE_LONG_RIDE.forwardUnitsPerWU);
  assert(ABOUT_NARRATIVE_LONG_RIDE.estimatedTrackLength >= 400);
  assert(track.tailEndWU > track.storyDurationWU);
  const finaleCameraPosition = sampleAboutNarrativeLongRidePositionInto(
    track,
    track.storyDurationWU,
    [0, 0, 0],
  );
  const finaleLookPosition = sampleAboutNarrativeLongRidePositionInto(
    track,
    Math.min(track.tailEndWU, track.storyDurationWU + track.lookAheadWU),
    [0, 0, 0],
  );
  assert(finaleLookPosition[1] - finaleCameraPosition[1] > 0.55);
  assert(finaleLookPosition[1] - finaleCameraPosition[1] < 0.85);
  assert(Math.abs(finaleLookPosition[0] - finaleCameraPosition[0]) < 0.01);

  const derivativeDeltaWU = 0.0001;
  for (const control of track.controls.filter((entry) => entry.atWU > 7.9 && entry.atWU < 13.85)) {
    const at = Number(control.atWU);
    const center = sampleAboutNarrativeLongRideBank(track, at);
    const incoming = (center - sampleAboutNarrativeLongRideBank(
      track,
      at - derivativeDeltaWU,
    )) / derivativeDeltaWU;
    const outgoing = (sampleAboutNarrativeLongRideBank(
      track,
      at + derivativeDeltaWU,
    ) - center) / derivativeDeltaWU;
    assert(Math.abs(incoming - outgoing) < 0.05, `bank derivative continuity @ ${at}`);
  }

  for (const storyDurationWU of [11, 33]) {
    const resizedTrack = compileAboutNarrativeLongRideTrack({
      ...state.shapeParameters,
      storyDurationWU,
    });
    for (let index = 1; index < resizedTrack.controls.length; index += 1) {
      assert(resizedTrack.controls[index].atWU > resizedTrack.controls[index - 1].atWU);
    }
    const atEnd = sampleAboutNarrativeLongRidePositionInto(
      resizedTrack,
      storyDurationWU,
      [0, 0, 0],
    );
    const afterEnd = sampleAboutNarrativeLongRidePositionInto(
      resizedTrack,
      storyDurationWU + 0.0001,
      [0, 0, 0],
    );
    assert(Math.hypot(
      afterEnd[0] - atEnd[0],
      afterEnd[1] - atEnd[1],
      afterEnd[2] - atEnd[2],
    ) < 0.01);
  }
});

test('rectangle gates and camera share one local track frame', () => {
  const plan = compileAboutNarrativeComposerPlan(v2, {
    inlineSize: 1440,
    blockSize: 1000,
    previewMotionProfile: 'full',
  });
  const rideWorld = plan.worlds.find((world) => world.shapeId === SHAPE_ID);
  const blueprint = createAboutNarrativeLongAssemblyBlueprint(rideWorld.shapeParameters);
  const gates = blueprint.primitives.filter((primitive) => primitive.kind === 'gate');
  const frame = createAboutNarrativeComposerFrameSample();
  assert(gates.length >= 20);
  gates.forEach((gate) => {
    const cameraWU = gate.runtimeWU - plan.camera.ride.lookAheadWU;
    assert(sampleAboutNarrativeComposerPlanInto(plan, cameraWU, frame));
    const expectedGateCenter = sampleAboutNarrativeLongRidePositionInto(
      plan.camera.ride,
      gate.runtimeWU,
      [0, 0, 0],
    );
    const cameraForward = frame.camera.lookAtTarget.map((value, axis) => (
      value - frame.camera.position[axis]
    ));
    const cameraForwardLength = Math.hypot(...cameraForward) || 1;
    const alignment = gate.frame.forward.reduce((sum, value, axis) => (
      sum + (value * (cameraForward[axis] / cameraForwardLength))
    ), 0);
    assert(alignment > 0.999999, `${gate.role} alignment ${alignment}`);
    const cameraRight = rotateVectorByQuaternion([1, 0, 0], frame.camera.quaternion);
    const cameraUp = rotateVectorByQuaternion([0, 1, 0], frame.camera.quaternion);
    assert(gate.frame.right.reduce((sum, value, axis) => (
      sum + (value * cameraRight[axis])
    ), 0) > 0.999999);
    assert(gate.frame.up.reduce((sum, value, axis) => (
      sum + (value * cameraUp[axis])
    ), 0) > 0.999999);
    assert(Math.hypot(...frame.camera.lookAtTarget.map((value, axis) => (
      value - expectedGateCenter[axis]
    ))) <= 0.000001);
    assert(Math.abs(
      frame.camera.lookAtRoll
      - sampleAboutNarrativeLongRideBank(plan.camera.ride, cameraWU),
    ) <= 0.000001);
  });
});

test('camera beat roll is a smooth additive curve on top of the physical loop', () => {
  const rolled = structuredClone(v2);
  rolled.tracks.camera.lookKeys.forEach((key) => {
    key.rollOffset = 30;
  });
  const basePlan = compileAboutNarrativeComposerPlan(v2, {
    inlineSize: 1440,
    blockSize: 1000,
    previewMotionProfile: 'full',
  });
  const rolledPlan = compileAboutNarrativeComposerPlan(rolled, {
    inlineSize: 1440,
    blockSize: 1000,
    previewMotionProfile: 'full',
  });
  assert.equal(basePlan.valid, true);
  assert.equal(rolledPlan.valid, true);
  const baseFrame = createAboutNarrativeComposerFrameSample();
  const rolledFrame = createAboutNarrativeComposerFrameSample();
  assert(sampleAboutNarrativeComposerPlanInto(basePlan, 10.25, baseFrame));
  assert(sampleAboutNarrativeComposerPlanInto(rolledPlan, 10.25, rolledFrame));
  assert(Math.abs((rolledFrame.camera.lookAtRoll - baseFrame.camera.lookAtRoll) - 30) <= 0.000001);
});

test('renderer and ride camera share responsive landscape transform inputs', () => {
  const landscape = structuredClone(v2);
  const transform = landscape.tracks.pointField.stateDefinitions[0].transform;
  Object.assign(transform, {
    mobileLandscapeScale: 0.8,
    mobileLandscapeXScale: 0.4,
    mobileLandscapeXOffset: 0.7,
    mobileLandscapeYOffset: -0.3,
    mobileLandscapeZOffset: 1.2,
  });
  const plan = compileAboutNarrativeComposerPlan(landscape, {
    inlineSize: 844,
    blockSize: 390,
    previewMotionProfile: 'full',
  });
  assert.equal(plan.valid, true, plan.diagnostics?.map((item) => item.message).join('\n'));
  assert.equal(plan.pointProfile, 'mobile');
  const world = plan.worlds[0];
  const resolved = resolveAboutNarrativeWorldTransformInto(
    world,
    {
      inlineSize: 844,
      compact: true,
      shortLandscape: true,
      anchorRailZ: world.anchorRailZ,
    },
    createAboutNarrativeWorldTransformSample(),
  );
  const localTrack = compileAboutNarrativeLongRideTrack(world.shapeParameters);
  const localStart = sampleAboutNarrativeLongRidePositionInto(localTrack, 0, [0, 0, 0]);
  const cameraStart = plan.camera.ride.controls[0];
  assert(Math.abs(cameraStart.x - (resolved.position[0] + (localStart[0] * resolved.xScale))) <= 0.000001);
  assert(Math.abs(cameraStart.y - (resolved.position[1] + (localStart[1] * resolved.scale))) <= 0.000001);
  assert(Math.abs(cameraStart.z - (resolved.position[2] + (localStart[2] * resolved.scale))) <= 0.000001);

  const rotated = structuredClone(v2);
  rotated.tracks.pointField.stateDefinitions[0].transform.rotation = [0, 0.1, 0];
  const loaded = loadAboutNarrativePointFieldPersistenceSource(rotated);
  assert.equal(loaded.valid, false);
  assert(loaded.diagnostics.some((item) => item.code === 'long-ride-world-rotation'));
});

test('dense ride sampling preserves continuous travel, roll, and fixed 85 degree FOV', () => {
  for (const entry of [
    { label: 'desktop', options: { inlineSize: 1440, blockSize: 1000 }, minimumRoll: 359, minimumDistance: 360 },
    { label: 'mobile', options: { inlineSize: 390, blockSize: 844 }, minimumRoll: 359, minimumDistance: 300 },
  ]) {
    const plan = compileAboutNarrativeComposerPlan(v2, {
      ...entry.options,
      previewMotionProfile: 'full',
    });
    assert.equal(plan.valid, true);
    const frame = createAboutNarrativeComposerFrameSample();
    const previousPosition = [0, 0, 0];
    const previousQuaternion = [0, 0, 0, 1];
    let distance = 0;
    let maximumRoll = 0;
    let minimumFov = Number.POSITIVE_INFINITY;
    let maximumFov = Number.NEGATIVE_INFINITY;
    const sampleCount = 2_200;
    for (let index = 0; index <= sampleCount; index += 1) {
      const storyWU = plan.durationWU * (index / sampleCount);
      assert(sampleAboutNarrativeComposerPlanInto(plan, storyWU, frame));
      assert(frame.camera.position.every(Number.isFinite), `${entry.label} position ${index}`);
      assert(frame.camera.quaternion.every(Number.isFinite), `${entry.label} quaternion ${index}`);
      maximumRoll = Math.max(maximumRoll, Math.abs(frame.camera.lookAtRoll));
      minimumFov = Math.min(minimumFov, frame.camera.fov);
      maximumFov = Math.max(maximumFov, frame.camera.fov);
      if (index > 0) {
        assert(frame.camera.position[2] < previousPosition[2]);
        const stepDistance = Math.hypot(
          frame.camera.position[0] - previousPosition[0],
          frame.camera.position[1] - previousPosition[1],
          frame.camera.position[2] - previousPosition[2],
        );
        assert(stepDistance < 1.5, `${entry.label} camera step ${index} jumped ${stepDistance}`);
        distance += stepDistance;
        const quaternionAgreement = Math.abs(
          frame.camera.quaternion[0] * previousQuaternion[0]
          + frame.camera.quaternion[1] * previousQuaternion[1]
          + frame.camera.quaternion[2] * previousQuaternion[2]
          + frame.camera.quaternion[3] * previousQuaternion[3]
        );
        assert(quaternionAgreement > 0.995, `${entry.label} quaternion step ${index}`);
      }
      previousPosition.splice(0, 3, ...frame.camera.position);
      previousQuaternion.splice(0, 4, ...frame.camera.quaternion);
    }
    assert(distance > entry.minimumDistance);
    assert(maximumRoll >= entry.minimumRoll);
    assert(Math.abs(minimumFov - ABOUT_NARRATIVE_LONG_RIDE_CAMERA_FOV) <= 0.05);
    assert(Math.abs(maximumFov - ABOUT_NARRATIVE_LONG_RIDE_CAMERA_FOV) <= 0.05);
  }

  const reducedPlan = compileAboutNarrativeComposerPlan(v2, {
    inlineSize: 390,
    blockSize: 844,
    previewMotionProfile: 'reduced',
  });
  const reducedFrame = createAboutNarrativeComposerFrameSample();
  for (let index = 0; index <= 220; index += 1) {
    assert(sampleAboutNarrativeComposerPlanInto(
      reducedPlan,
      reducedPlan.durationWU * (index / 220),
      reducedFrame,
    ));
    assert.equal(reducedFrame.camera.lookAtRoll, 0);
    assert(reducedFrame.camera.position.every(Number.isFinite));
  }
});

test('desktop, mobile, and reduced plans resolve the same permanent corridor', () => {
  const cases = [
    {
      label: 'desktop/full',
      options: { inlineSize: 1440, blockSize: 1000, previewMotionProfile: 'full' },
      layoutProfile: 'desktop',
      reduced: false,
    },
    {
      label: 'mobile/full',
      options: { inlineSize: 390, blockSize: 844, previewMotionProfile: 'full' },
      layoutProfile: 'mobile',
      reduced: false,
    },
    {
      label: 'desktop/reduced',
      options: { inlineSize: 1440, blockSize: 1000, previewMotionProfile: 'reduced' },
      layoutProfile: 'desktop',
      reduced: true,
    },
    {
      label: 'mobile/reduced',
      options: { inlineSize: 390, blockSize: 844, previewMotionProfile: 'reduced' },
      layoutProfile: 'mobile',
      reduced: true,
    },
  ];

  for (const entry of cases) {
    const plan = compileAboutNarrativeComposerPlan(v2, entry.options);
    assert.equal(
      plan.valid,
      true,
      `${entry.label}: ${plan.diagnostics?.map((item) => item.message).join('\n')}`,
    );
    assert.equal(plan.layoutProfile, entry.layoutProfile);
    assert.equal(plan.reducedMotion, entry.reduced);
    assert.deepEqual(plan.worlds.map((world) => world.stateId), [STATE_ID]);
    assert.equal(plan.worlds[0].shapeId, SHAPE_ID);
    assert(plan.camera.ride);
    assert.equal(plan.camera.orbit, null);

    const request = getAboutNarrativeComposerPreparationRequest(plan, plan.durationWU);
    assert.equal(request?.targetWorldId, STATE_ID);
    const frame = createAboutNarrativeComposerFrameSample();
    assert(sampleAboutNarrativeComposerPlanInto(plan, plan.durationWU, frame));
    assert.equal(frame.world.from?.stateId, STATE_ID);
    assert.equal(frame.world.to?.stateId, STATE_ID);
    assert.equal(frame.world.transition.type, 'hold');
    assert(frame.camera.position.every(Number.isFinite));
    assert(frame.camera.quaternion.every(Number.isFinite));
    if (entry.reduced) assert.equal(frame.camera.lookAtRoll, 0);
    const effectIndex = frame.composerEffects.active.findIndex(
      (clip) => clip.parameters?.effectId === 'living-wave-v1',
    );
    if (entry.reduced) {
      assert(effectIndex < 0 || frame.composerEffects.weight[effectIndex] === 0);
    } else {
      assert(effectIndex >= 0);
      assert(frame.composerEffects.weight[effectIndex] > 0);
    }
  }
});

test('the corridor generates finite 12k and 5k geometry at the approved budgets', async () => {
  const state = v2.tracks.pointField.stateDefinitions[0];
  for (const [pointCount, quality, layoutProfile] of [
    [12_000, 'desktop', 'desktop'],
    [5_000, 'mobile', 'mobile'],
  ]) {
    const seeds = createAboutNarrativeSeeds(pointCount, SHARED_SEED);
    const output = await generateAboutNarrativeShape({
      shapeId: state.shapeId,
      pointCount,
      seeds,
      quality,
      layoutProfile,
      parameters: state.shapeParameters,
    });
    assert.equal(output.positions.length, pointCount * 3);
    assert.equal(output.size.length, pointCount);
    assert.equal(output.presence.length, pointCount);
    assert(output.positions.every(Number.isFinite));
    assert(output.size.every((value) => Number.isFinite(value) && value > 0));
    assert(output.presence.every((value) => value === 1));
    const bounds = zBounds(output);
    assert(bounds.minimum < -115);
    assert(bounds.maximum > -1);
    if (pointCount === 12_000) {
      for (const materialCode of ABOUT_NARRATIVE_LONG_ASSEMBLY.materialSizeCodes) {
        assert(
          output.size.some((value) => Math.abs(value - materialCode) <= 0.000001),
          `missing semantic material code ${materialCode}`,
        );
      }
    }
  }
});

test('measured text length compresses or extends the same corridor and camera rail', async () => {
  const state = v2.tracks.pointField.stateDefinitions[0];
  const pointCount = 2_000;
  const seeds = createAboutNarrativeSeeds(pointCount, SHARED_SEED);
  const outputs = [];
  for (const storyDurationWU of [11, 22, 33]) {
    outputs.push(await generateAboutNarrativeShape({
      shapeId: state.shapeId,
      pointCount,
      seeds,
      quality: 'desktop',
      layoutProfile: 'desktop',
      parameters: { ...state.shapeParameters, storyDurationWU },
    }));
  }
  const [shortBounds, baseBounds, longBounds] = outputs.map(zBounds);
  assert(shortBounds.minimum > baseBounds.minimum);
  assert(longBounds.minimum < baseBounds.minimum);

  const compactMeasurements = Object.fromEntries(v2.tracks.text.fields.map((field) => [
    field.id,
    { measuredHeightPx: 240, viewportHeightPx: 1_000 },
  ]));
  const expandedMeasurements = Object.fromEntries(v2.tracks.text.fields.map((field) => [
    field.id,
    { measuredHeightPx: field.kind === 'scroll-block' ? 2_200 : 900, viewportHeightPx: 1_000 },
  ]));
  const compactLayout = compileAboutNarrativeStoryLayout(v2, {
    profileId: 'desktop',
    measurements: compactMeasurements,
  });
  const expandedLayout = compileAboutNarrativeStoryLayout(v2, {
    profileId: 'desktop',
    measurements: expandedMeasurements,
  });
  assert(expandedLayout.durationWU > compactLayout.durationWU);
  const compactRuntime = materializeAboutNarrativeStoryLayout(v2, compactLayout);
  const expandedRuntime = materializeAboutNarrativeStoryLayout(v2, expandedLayout);
  assert.equal(
    compactRuntime.tracks.pointField.stateDefinitions[0].shapeParameters.storyDurationWU,
    compactLayout.durationWU,
  );
  assert.equal(
    expandedRuntime.tracks.pointField.stateDefinitions[0].shapeParameters.storyDurationWU,
    expandedLayout.durationWU,
  );
  assert.equal(compactRuntime.profiles.desktop.storyDurationWU, compactLayout.durationWU);
  assert.equal(expandedRuntime.profiles.desktop.storyDurationWU, expandedLayout.durationWU);
  for (const [runtime, layout] of [
    [compactRuntime, compactLayout],
    [expandedRuntime, expandedLayout],
  ]) {
    const fieldById = new Map(layout.fields.map((field) => [field.id, field]));
    const parameters = runtime.tracks.pointField.stateDefinitions[0].shapeParameters;
    assert.equal(parameters.backgroundAnchorWU, fieldById.get('text-background-unit').startWU);
    assert.equal(parameters.intersectionAnchorWU, fieldById.get('text-complexity-listen').startWU);
    assert.equal(parameters.disciplinesAnchorWU, fieldById.get('text-disciplines-title').startWU);
    assert.equal(parameters.cityAnchorWU, fieldById.get('text-life-character').startWU);
    assert.equal(parameters.finaleAnchorWU, fieldById.get('text-epilogue-invitation').startWU);
  }
  for (const runtime of [compactRuntime, expandedRuntime]) {
    const parameters = runtime.tracks.pointField.stateDefinitions[0].shapeParameters;
    const track = compileAboutNarrativeLongRideTrack(parameters);
    for (const key of runtime.tracks.camera.moveKeys) {
      const expected = sampleAboutNarrativeLongRidePositionInto(track, key.atWU, [0, 0, 0]);
      key.position.forEach((value, axis) => {
        assert(Math.abs(value - expected[axis]) <= 0.000001);
      });
    }
    assert.equal(track.storyDurationWU, runtime.profiles.desktop.storyDurationWU);
    assert(Math.abs(
      track.tailEndWU
      - (track.storyDurationWU + parameters.terminalDistanceWU + 0.25),
    ) <= 0.000001);
  }
  const compactCity = compactRuntime.tracks.camera.moveKeys.find((key) => key.id === 'move-ride-city');
  const expandedCity = expandedRuntime.tracks.camera.moveKeys.find((key) => key.id === 'move-ride-city');
  assert(compactCity.position[2] > expandedCity.position[2]);
  assert(Math.abs(compactCity.position[0] - expandedCity.position[0]) <= 0.000001);
});

test('the fixed canonical editor preserves topology while allowing corridor tuning', () => {
  const store = createAboutNarrativePointFieldEditorStore(v2, {
    fixedPointFieldStructure: true,
  });
  store.setSelection({ type: 'track', id: 'effects' });
  assert.deepEqual(store.getSnapshot().selection, { type: 'track', id: 'effects' });
  assert.equal(store.getSnapshot().document.tracks.pointField.stateDefinitions.length, 1);
  assert.equal(store.pointField.duplicateState({ stateId: STATE_ID }), false);
  assert.equal(store.pointField.patchState({
    id: STATE_ID,
    scope: 'base',
    patch: { shapeId: 'cluster-v1' },
  }), false);
  assert.equal(store.pointField.patchState({
    id: STATE_ID,
    scope: 'base',
    patch: { shapeParameters: { widthScale: 1.08 } },
  }), true);
  assert.equal(
    store.getSnapshot().document.tracks.pointField.stateDefinitions[0].shapeParameters.widthScale,
    1.08,
  );
  assert.equal(store.pointField.patchState({
    id: STATE_ID,
    scope: 'base',
    patch: { shapeParameters: { loopRollDegrees: 540 } },
  }), true);
  assert.equal(
    store.getSnapshot().document.tracks.pointField.stateDefinitions[0].shapeParameters.loopRollDegrees,
    540,
  );
  store.commit('Edit camera roll', (draft) => {
    draft.tracks.camera.lookKeys[6].rollOffset = 15;
    draft.globals.camera.distanceFogEndWU = 36;
    draft.globals.camera.steadycamResponseMs = 340;
  }, { requireValid: true });
  const roundTrip = loadAboutNarrativePointFieldPersistenceSource(
    store.getSnapshot().document,
  );
  assert.equal(roundTrip.valid, true, roundTrip.message);
  assert.equal(roundTrip.document.tracks.camera.lookKeys[6].rollOffset, 15);
  assert.equal(roundTrip.document.globals.camera.distanceFogEndWU, 36);
  assert.equal(roundTrip.document.globals.camera.steadycamResponseMs, 340);
});

test('the Director exposes ride progression, roll, and fog controls', () => {
  const controlSource = `${editorSource}\n${definitionsSource}`;
  assert.equal(controlSource.includes('Support spacing'), false);
  for (const label of [
    'Opening signal',
    'Round hoop curve',
    'Pass-by yard',
    'Long gate loop',
    'System ignition',
    'Living field',
    'Open approach',
    'Portrait arrival',
    'Additional camera roll',
    'Physical loop roll',
    'Ocean arrival distance',
    'Ocean density',
    'Ocean wave height',
    'Ocean horizon depth',
    'Splash activity',
    'Splash height',
    'Fog begins',
    'Fully faded',
  ]) {
    assert(controlSource.includes(label), `missing canonical Director control “${label}”`);
  }
});

test('the canonical experience retains complete discipline labels and descriptions', () => {
  const disciplines = v2.tracks.text.fields.find(
    (field) => field.block?.kind === 'disciplines',
  );
  assert(disciplines?.block.items.length > 0);
  assert(disciplines.block.items.every((item) => (
    item.id && item.label && item.description
  )));
  assert.match(
    stylesSource,
    /\.about-narrative-discipline-list__label \{[\s\S]*?font-size: calc\(var\(--about-editorial-type-size\) \* 0\.94\);/,
  );
  assert.match(
    stylesSource,
    /\.about-narrative-discipline-list__description \{[\s\S]*?font-size: calc\(var\(--about-editorial-type-size\) \* 0\.82\);/,
  );
});

test('discipline markers are circular and inherit their live scene material colours', () => {
  assert.match(experienceSource, /data-material-role=\{materialRole\}/);
  assert.match(stylesSource, /--simulation-role-product-design/);
  assert.match(stylesSource, /--simulation-role-motion-3d/);
  assert.match(stylesSource, /width:\s*var\(--discipline-marker-size\)/);
  assert.match(stylesSource, /height:\s*var\(--discipline-marker-size\)/);
  assert.match(stylesSource, /clip-path:\s*circle\(50%\)/);
  assert.match(
    rendererSource,
    /vec3 longAssemblyMaterialColor\(float materialClass\)[\s\S]*?if \(materialClass < 4\.5\) return materialColor4;[\s\S]*?return materialColor6;/,
  );
});
