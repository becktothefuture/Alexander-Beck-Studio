import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  compileAboutNarrativeDocument,
  getAboutNarrativeCueMotionInterval,
  sampleAboutNarrativeCue,
  sampleAboutNarrativePlan,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCompiler.js';
import {
  compileAboutNarrativeRuntimePlan,
  createAboutNarrativeRuntimeFrameSample,
  createAboutNarrativeTitleFieldSample,
  getAboutNarrativeRuntimePreparationRequest,
  sampleAboutNarrativeRuntimePlan,
  sampleAboutNarrativeRuntimePlanInto,
  sampleAboutNarrativeTitleFieldInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';
import {
  ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
  migrateAboutNarrativeVersion2To3,
  migrateAboutNarrativeVersion3To4,
  validateAboutNarrativeTrackDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackSchema.js';
import {
  projectAboutNarrativePointFieldDocumentToVersion5,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';
import { loadAboutNarrativeTrackSource } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackPersistence.js';
import {
  migrateLegacyAboutNarrativeCameraPose,
  writeAboutNarrativeCameraOrbitPosition,
  writeAboutNarrativeCameraQuaternion,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraRig.js';
import { applyAboutNarrativeCameraEasing } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraEasing.js';
import {
  applyAboutNarrativeWorldTransitionEasing,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeMotionMath.js';
import '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeMotionMath.test.js';
const canonicalPointFieldSource = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const canonicalSource = projectAboutNarrativePointFieldDocumentToVersion5(canonicalPointFieldSource);
const legacy = JSON.parse(await readFile(
  new URL('./fixtures/about-narrative/contents-about-v2.json', import.meta.url),
  'utf8',
));
const loadCurrent = (source) => {
  const loaded = loadAboutNarrativeTrackSource(source);
  assert.equal(loaded.valid, true);
  return loaded.document;
};
const canonical = loadCurrent(canonicalSource);

function assertClose(actual, expected, label, tolerance = 0.00001) {
  assert.ok(
    Math.abs(Number(actual) - Number(expected)) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

function assertVectorClose(actual, expected, label) {
  assert.equal(actual.length, expected.length, `${label} length`);
  actual.forEach((value, index) => assertClose(value, expected[index], `${label}.${index}`));
}

function cleanWU(value) {
  return Number(Number(value).toFixed(6));
}

function seededStorySamples(durationWU, count = 500) {
  let state = 0x5f3759df;
  const values = [0, durationWU];
  for (let index = 0; index < count; index += 1) {
    state = ((1664525 * state) + 1013904223) >>> 0;
    values.push((state / 0x100000000) * durationWU);
  }
  return values;
}

function boundarySamples(plan) {
  const boundaries = [0, plan.durationWU];
  plan.cameraKeys.forEach((key) => boundaries.push(key.atWU));
  plan.visibilityKeys.forEach((key) => boundaries.push(key.atWU));
  plan.worlds.forEach((world) => boundaries.push(
    world.startWU,
    world.transitionIn.startWU,
    world.transitionIn.endWU,
  ));
  plan.interactionClips.forEach((clip) => boundaries.push(
    clip.startWU,
    clip.activationWU,
    clip.endWU,
  ));
  return boundaries.flatMap((value) => [value - 0.000001, value, value + 0.000001])
    .map((value) => Math.max(0, Math.min(plan.durationWU, value)));
}

test('camera orbit preserves height and radius around the authored focus target', () => {
  const target = [0, 0, 0];
  const position = [1, -0.74, -1.22];
  const focus = [0, -0.5, -7.035];
  const originalRadius = Math.hypot(position[0] - focus[0], position[2] - focus[2]);
  const result = writeAboutNarrativeCameraOrbitPosition(target, position, focus, Math.PI / 2);
  assert.equal(result, target);
  assertClose(target[1], position[1], 'orbit height');
  assertClose(Math.hypot(target[0] - focus[0], target[2] - focus[2]), originalRadius, 'orbit radius');
  assertVectorClose(target, [5.815, -0.74, -8.035], 'quarter orbit');
});

test('runtime accepts schema v5 only after legacy input crosses the persistence boundary', () => {
  const rejectedV2 = compileAboutNarrativeRuntimePlan(legacy, { layoutProfile: 'desktop' });
  const migratedV3 = migrateAboutNarrativeVersion2To3(legacy);
  const rejectedV3 = compileAboutNarrativeRuntimePlan(migratedV3, { layoutProfile: 'desktop' });
  const rejectedV4 = compileAboutNarrativeRuntimePlan(
    migrateAboutNarrativeVersion3To4(migratedV3),
    { layoutProfile: 'desktop' },
  );
  const fromV2 = compileAboutNarrativeRuntimePlan(loadCurrent(legacy), { layoutProfile: 'desktop' });
  const fromMigratedV3 = compileAboutNarrativeRuntimePlan(loadCurrent(migratedV3), { layoutProfile: 'desktop' });
  const fromCanonicalV5 = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });

  assert.equal(rejectedV2.valid, false);
  assert.equal(rejectedV3.valid, false);
  assert.equal(rejectedV4.valid, false);
  assert.equal(fromV2.valid, true);
  assert.equal(fromMigratedV3.valid, true);
  assert.equal(fromCanonicalV5.valid, true);
  assert.equal(fromV2.model.schemaVersion, ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION);
  assert.equal(fromV2.layoutProfile, 'desktop');
  assert.equal(fromV2.pointProfile, 'desktop');
  assert.equal(fromV2.motionProfile, 'full');
  assert.equal(fromV2.durationWU, fromV2.maxStoryWU);
  assert.equal(fromV2.resolver.contentExtentWU, fromV2.resolver.scrollDurationWU + 1);
  assert.deepEqual(fromV2.cameraKeys, fromMigratedV3.cameraKeys);
  assert.deepEqual(fromV2.worlds, fromMigratedV3.worlds);
  assert.equal('sections' in fromV2, false);
  assert.equal('sections' in fromCanonicalV5, false);
  assert.equal('sectionIndex' in sampleAboutNarrativeRuntimePlan(fromV2, 0), false);
  assert.equal('localProgress' in sampleAboutNarrativeRuntimePlan(fromV2, 0), false);
});

test('World sampling publishes the composed visual transition progress once', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  const world = plan.worlds[1];
  const rawProgress = 0.25;
  const storyWU = world.transitionIn.startWU
    + ((world.transitionIn.endWU - world.transitionIn.startWU) * rawProgress);
  const sample = sampleAboutNarrativeRuntimePlan(plan, storyWU);
  assertClose(
    sample.world.transitionProgress,
    applyAboutNarrativeWorldTransitionEasing(world.transitionIn.easing, rawProgress),
    'composed World transition progress',
  );

  const unsupported = structuredClone(canonical);
  unsupported.tracks.worlds.objects[1].transitionIn.type = 'crossfade';
  const compatibleV5 = compileAboutNarrativeRuntimePlan(unsupported, { layoutProfile: 'desktop' });
  assert.equal(compatibleV5.valid, true, 'schema v5 keeps legacy crossfade documents readable');
});

test('compiled Worlds derive endWU and anchorRailZ and preparation uses stable World IDs', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  assert.equal(plan.valid, true);
  plan.worlds.forEach((world, index) => {
    assert.equal(world.endWU, plan.worlds[index + 1]?.startWU ?? plan.durationWU);
    assertClose(
      world.anchorRailZ,
      plan.model.globals.worldRail.originZ - (world.anchorWU * plan.model.globals.worldRail.unitsPerWU),
      `${world.id}.anchorRailZ`,
    );
    assert.equal('sectionId' in world, false);
  });
  assert.deepEqual(
    plan.worldPreparationDescriptor.worlds.map((world) => world.id),
    plan.worlds.map((world) => world.id),
  );
  const epilogue = plan.worlds.at(-1);
  const request = getAboutNarrativeRuntimePreparationRequest(plan, epilogue.startWU);
  assert.equal(request.sequenceKey, plan.worldSequenceKey);
  assert.equal(request.descriptor, plan.worldPreparationDescriptor);
  assert.equal(request.targetWorldId, epilogue.id);
});

test('legacy Camera migration preserves every authored key pose and World boundary', () => {
  const legacyPlan = compileAboutNarrativeDocument(legacy, { profile: 'desktop' });
  const migratedV3 = migrateAboutNarrativeVersion2To3(legacy);
  const plan = compileAboutNarrativeRuntimePlan(loadCurrent(legacy), { layoutProfile: 'desktop' });
  const samples = migratedV3.tracks.camera.keys.map((key) => key.atWU);

  samples.forEach((storyWU) => {
    const legacyFrame = sampleAboutNarrativePlan(legacyPlan, storyWU);
    const legacyKey = migratedV3.tracks.camera.keys.find((key) => key.atWU === storyWU);
    const migratedPose = migrateLegacyAboutNarrativeCameraPose(legacyKey, migratedV3.globals);
    const expectedQuaternion = writeAboutNarrativeCameraQuaternion([0, 0, 0, 1], migratedPose.rotation);
    const frame = sampleAboutNarrativeRuntimePlan(plan, storyWU);
    assertVectorClose(frame.camera.position, legacyFrame.camera.position, `camera.position @ ${storyWU}`);
    assertVectorClose(frame.camera.quaternion, expectedQuaternion, `camera.quaternion @ ${storyWU}`);
    assertClose(frame.camera.fov, legacyFrame.camera.fov, `camera.fov @ ${storyWU}`);
    assert.equal(frame.world.to.id, `world-${legacyFrame.world.to.sectionId}`);
  });
});

test('Camera fog is one global pair and never interpolates per key', () => {
  const document = structuredClone(canonical);
  const [from, to] = document.tracks.camera.keys;
  from.easing = 'linear';
  document.globals.camera.distanceFogStartWU = 4;
  document.globals.camera.distanceFogEndWU = 22;
  const plan = compileAboutNarrativeRuntimePlan(document, { layoutProfile: 'desktop' });
  const midpoint = (Number(from.atWU) + Number(to.atWU)) / 2;

  assert.equal(plan.valid, true);
  [Number(from.atWU), midpoint, Number(to.atWU)].forEach((storyWU) => {
    const frame = sampleAboutNarrativeRuntimePlan(plan, storyWU);
    assertClose(frame.globals.camera.distanceFogStartWU, 4, `fog start at ${storyWU}`);
    assertClose(frame.globals.camera.distanceFogEndWU, 22, `fog end at ${storyWU}`);
    assert.equal('distanceFogStartWU' in frame.camera, false);
    assert.equal('distanceFogEndWU' in frame.camera, false);
  });
  assert.deepEqual(Object.keys(from).sort(), [
    'aimEnabled',
    'atWU',
    'easing',
    'fov',
    'id',
    'locked',
    'lookAtRoll',
    'lookAtTarget',
    'position',
    'rotation',
  ]);
});

test('camera focus owns orientation while preserving smooth manual-to-focus handoffs', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  const manualKey = plan.cameraKeys.find((key) => key.aimEnabled === false);
  const aimedKey = plan.cameraKeys.find((key) => key.aimEnabled === true);
  assert.ok(manualKey);
  assert.ok(aimedKey);

  const transitionIndex = plan.cameraKeys.findIndex((key, index) => (
    key.aimEnabled === false && plan.cameraKeys[index + 1]?.aimEnabled === true
  ));
  assert.ok(transitionIndex >= 0);
  const from = plan.cameraKeys[transitionIndex];
  const to = plan.cameraKeys[transitionIndex + 1];
  const midpoint = sampleAboutNarrativeRuntimePlan(plan, (from.atWU + to.atWU) / 2);
  assert.ok(midpoint.camera.aimWeight > 0 && midpoint.camera.aimWeight < 1);
  assert.equal(midpoint.camera.targeted, true);
  assert.equal(midpoint.camera.lookAtTarget.length, 3);
  const manualFrame = sampleAboutNarrativeRuntimePlan(plan, from.atWU);
  assert.equal(manualFrame.camera.targeted, false);
  assertVectorClose(manualFrame.camera.lookAtTarget, from.lookAtTarget, 'manual camera target');
  const easedMidpoint = applyAboutNarrativeCameraEasing(from.easingCurve, 0.5);
  midpoint.camera.lookAtTarget.forEach((value, axis) => {
    assertClose(
      value,
      from.lookAtTarget[axis]
        + ((to.lookAtTarget[axis] - from.lookAtTarget[axis]) * easedMidpoint),
      `World anchor axis ${axis}`,
    );
  });

  const aimedSegmentIndex = plan.cameraKeys.findIndex((key, index) => (
    key.aimEnabled === true && plan.cameraKeys[index + 1]?.aimEnabled === true
  ));
  assert.ok(aimedSegmentIndex >= 0);
  const aimedFrom = plan.cameraKeys[aimedSegmentIndex];
  const aimedTo = plan.cameraKeys[aimedSegmentIndex + 1];
  for (const progress of [0, 0.25, 0.5, 0.75, 1]) {
    const frame = sampleAboutNarrativeRuntimePlan(
      plan,
      aimedFrom.atWU + ((aimedTo.atWU - aimedFrom.atWU) * progress),
    );
    const [x, y, z, w] = frame.camera.quaternion;
    const forward = [
      -2 * ((x * z) + (w * y)),
      -2 * ((y * z) - (w * x)),
      -(1 - (2 * ((x * x) + (y * y)))),
    ];
    const direction = frame.camera.lookAtTarget.map(
      (value, axis) => value - frame.camera.position[axis],
    );
    const length = Math.hypot(...direction);
    const dot = direction.reduce(
      (sum, value, axis) => sum + ((value / length) * forward[axis]),
      0,
    );
    assert.ok(dot > 0.99999, `Aim must own orientation at ${progress}: ${dot}`);
    assert.equal(frame.camera.aimWeight, 1);
  }
});

test('absolute title windows match migrated legacy Cue timing with half-open ends', () => {
  const legacyPlan = compileAboutNarrativeDocument(legacy, { profile: 'desktop' });
  const plan = compileAboutNarrativeRuntimePlan(loadCurrent(legacy), { layoutProfile: 'desktop' });
  const titleIds = new Set(plan.textFields.filter((field) => field.kind === 'title').map((field) => field.id));
  const titleWindows = legacyPlan.sections.flatMap((section) => (
    (section.text.cues || []).map((cue) => {
      const interval = cue.motion?.mode === 'vertical'
        ? { start: cue.enter, end: cue.exit }
        : getAboutNarrativeCueMotionInterval(cue, legacy.globals.textMotion);
      return {
        id: `text-${cue.id}`,
        startWU: cleanWU(section.startWU + (interval.start * section.travelWU)),
        endWU: cleanWU(section.startWU + (interval.end * section.travelWU)),
      };
    })
  ));
  const samples = [
    ...seededStorySamples(plan.durationWU, 200),
    ...titleWindows.flatMap((field) => [field.startWU, field.endWU - 0.000001, field.endWU]),
  ];

  samples.forEach((storyWU) => {
    const clamped = Math.max(0, Math.min(plan.durationWU, storyWU));
    const expected = titleWindows
      .filter((field) => clamped >= field.startWU && (
        clamped < field.endWU
        || (clamped === plan.durationWU && Math.abs(field.endWU - plan.durationWU) <= 0.000001)
      ))
      .map((field) => field.id)
      .sort();
    const actual = sampleAboutNarrativeRuntimePlan(plan, clamped).text.activeFieldIds
      .filter((id) => titleIds.has(id))
      .sort();
    assert.deepEqual(actual, expected, `active titles @ ${clamped}`);
  });
});

test('absolute spatial Title sampling matches legacy motion at randomized and boundary WU', () => {
  const legacyPlan = compileAboutNarrativeDocument(legacy, { profile: 'desktop' });
  const plan = compileAboutNarrativeRuntimePlan(loadCurrent(legacy), { layoutProfile: 'desktop' });
  const textMotion = legacy.globals.textMotion;
  const target = createAboutNarrativeTitleFieldSample();
  let randomState = 0x243f6a88;
  const random = () => {
    randomState = ((1103515245 * randomState) + 12345) >>> 0;
    return randomState / 0x100000000;
  };

  legacyPlan.sections.forEach((section) => {
    (section.text.cues || [])
      .filter((cue) => cue.motion?.mode !== 'vertical' && cue.preset !== 'finale-v1')
      .forEach((cue) => {
        const field = plan.textFields.find((item) => item.id === `text-${cue.id}`);
        assert.ok(field, `missing migrated field for ${cue.id}`);
        const interval = getAboutNarrativeCueMotionInterval(cue, textMotion);
        const localSamples = [
          0,
          1,
          interval.start - 0.000001,
          interval.start,
          interval.start + 0.000001,
          interval.focus,
          interval.end - 0.000001,
          interval.end,
          interval.end + 0.000001,
          ...Array.from({ length: 40 }, random),
        ].map((value) => Math.max(0, Math.min(1, value)));
        localSamples.forEach((localProgress) => {
          const storyWU = section.startWU + (localProgress * section.travelWU);
          const expected = sampleAboutNarrativeCue(cue, localProgress, textMotion, false);
          const actual = sampleAboutNarrativeTitleFieldInto(
            field,
            storyWU,
            textMotion,
            false,
            target,
          );
          assert.equal(actual, target);
          ['opacity', 'blur', 'x', 'y', 'z'].forEach((key) => {
            assertClose(actual[key], expected[key], `${cue.id}.${key} @ ${storyWU}`, 0.001);
          });
        });

        const reducedExpected = sampleAboutNarrativeCue(cue, interval.focus, textMotion, true);
        const reduced = sampleAboutNarrativeTitleFieldInto(
          field,
          section.startWU + (interval.focus * section.travelWU),
          textMotion,
          true,
          target,
        );
        assert.equal(reduced, target);
        assert.deepEqual(
          { opacity: reduced.opacity, blur: reduced.blur, x: reduced.x, y: reduced.y, z: reduced.z },
          reducedExpected,
        );
      });
  });
});

test('the finale title resolves once and remains visible through the final frame', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  const field = plan.textFields.find((item) => item.id === 'text-epilogue-invitation');
  const target = createAboutNarrativeTitleFieldSample();
  assert.ok(field);
  assert.equal(field.preset, 'finale-v1');
  assert.equal(field.endWU, plan.durationWU);

  const before = sampleAboutNarrativeTitleFieldInto(
    field,
    field.startWU - 0.001,
    canonical.globals.textMotion,
    false,
    target,
  );
  assert.equal(before.opacity, 0);

  const settled = sampleAboutNarrativeTitleFieldInto(
    field,
    field.focusWU,
    canonical.globals.textMotion,
    false,
    target,
  );
  assert.deepEqual(
    { opacity: settled.opacity, blur: settled.blur, x: settled.x, y: settled.y, z: settled.z },
    { opacity: 1, blur: 0, x: 0, y: 0, z: 0 },
  );

  const finalFrame = sampleAboutNarrativeTitleFieldInto(
    field,
    plan.durationWU,
    canonical.globals.textMotion,
    false,
    target,
  );
  assert.deepEqual(
    { opacity: finalFrame.opacity, blur: finalFrame.blur, x: finalFrame.x, y: finalFrame.y, z: finalFrame.z },
    { opacity: 1, blur: 0, x: 0, y: 0, z: 0 },
  );
});

test('the opener exits upward as one clear scroll-linked unit', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'mobile' });
  const field = plan.textFields.find((item) => item.id === 'text-promise-main');
  const target = createAboutNarrativeTitleFieldSample();
  const start = sampleAboutNarrativeTitleFieldInto(
    field,
    field.startWU,
    canonical.globals.textMotion,
    false,
    target,
  );
  assert.deepEqual(
    { opacity: start.opacity, blur: start.blur, y: start.y, z: start.z },
    { opacity: 1, blur: 0, y: 0, z: 0 },
  );

  const middle = sampleAboutNarrativeTitleFieldInto(
    field,
    (field.startWU + field.endWU) * 0.5,
    canonical.globals.textMotion,
    false,
    target,
  );
  assert.ok(middle.opacity > 0 && middle.opacity < 1);
  assert.ok(middle.y < 0);
  assert.equal(middle.blur, 0);
  assert.equal(middle.z, 0);

  const end = sampleAboutNarrativeTitleFieldInto(
    field,
    field.endWU,
    canonical.globals.textMotion,
    false,
    target,
  );
  assert.deepEqual(
    { opacity: end.opacity, blur: end.blur, y: end.y, z: end.z },
    { opacity: 0, blur: 0, y: canonical.globals.textMotion.endY, z: 0 },
  );
});

test('interaction activation is absolute, targeted, and half-open', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  const clip = plan.interactionClips.find((item) => item.type === 'discipline-reveal');
  assert.ok(clip);
  const before = sampleAboutNarrativeRuntimePlan(plan, clip.startWU - 0.000001);
  const at = sampleAboutNarrativeRuntimePlan(plan, clip.activationWU);
  const after = sampleAboutNarrativeRuntimePlan(plan, clip.activationWU + 0.000001);
  assert.equal(before.interactions.activeInteraction, null);
  assert.equal(before.interactions.interactionActivated, false);
  assert.equal(at.interactions.activeInteraction, clip);
  assert.equal(at.interactions.interactionActivated, true);
  assert.equal(after.interactions.activatedClipIds.includes(clip.id), true);

  if (clip.endWU < plan.durationWU) {
    const end = sampleAboutNarrativeRuntimePlan(plan, clip.endWU);
    assert.equal(end.interactions.activeClipIds.includes(clip.id), false);
  } else {
    const end = sampleAboutNarrativeRuntimePlan(plan, plan.durationWU);
    assert.equal(end.interactions.activeClipIds.includes(clip.id), true);
  }
});

test('grid ripple starts immediately, sustains through the scroll-authored passage, releases into the bust, and settles for Reduced Motion', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  const clip = plan.interactionClips.find((item) => item.id === 'interaction-grid-ripple');
  const emergentClip = plan.interactionClips.find((item) => item.id === 'interaction-emergent-ripple');
  assert.ok(clip);
  assert.ok(emergentClip);
  const before = sampleAboutNarrativeRuntimePlan(plan, clip.startWU - 0.000001);
  const activated = sampleAboutNarrativeRuntimePlan(plan, clip.activationWU);
  const sustain = sampleAboutNarrativeRuntimePlan(plan, (clip.activationWU + clip.endWU) / 2);
  const boundaryBefore = sampleAboutNarrativeRuntimePlan(plan, clip.endWU - 0.000001);
  const boundary = sampleAboutNarrativeRuntimePlan(plan, emergentClip.startWU);
  const platformGather = sampleAboutNarrativeRuntimePlan(plan, emergentClip.activationWU);
  const releaseStartWU = emergentClip.endWU - emergentClip.parameters.releaseWU;
  const beforeRelease = sampleAboutNarrativeRuntimePlan(plan, releaseStartWU - 0.000001);
  const releasing = sampleAboutNarrativeRuntimePlan(
    plan,
    releaseStartWU + (emergentClip.parameters.releaseWU * 0.5),
  );
  const end = sampleAboutNarrativeRuntimePlan(plan, emergentClip.endWU);
  assert.equal(before.interactions.effectWeight, 0);
  assert.equal(activated.interactions.effectWeight, 1);
  assert.equal(sustain.interactions.effectWeight, 1);
  assert.ok(boundaryBefore.interactions.effectWeight < 0.001);
  assert.equal(boundary.interactions.activeInteraction.id, emergentClip.id);
  assert.equal(boundary.interactions.effectWeight, 0);
  assert.equal(platformGather.interactions.activeInteraction.id, emergentClip.id);
  assert.equal(platformGather.interactions.effectWeight, 1);
  assert.equal(beforeRelease.interactions.effectWeight, 1);
  assert.ok(releasing.interactions.effectWeight > 0);
  assert.ok(releasing.interactions.effectWeight < 1);
  assert.equal(end.interactions.effectWeight, 0);

  const reducedPlan = compileAboutNarrativeRuntimePlan(canonical, {
    layoutProfile: 'desktop',
    motionProfile: 'reduced',
  });
  const reduced = sampleAboutNarrativeRuntimePlan(reducedPlan, emergentClip.activationWU);
  assert.equal(reduced.interactions.effectWeight, 0);
});

test('Visibility uses outgoing-key easing, profile overrides, and Reduced Motion step sampling', () => {
  const document = structuredClone(canonical);
  const durationWU = document.profiles.desktop.storyDurationWU;
  const middleWU = durationWU / 2;
  document.tracks.visibility.keys = [
    { id: 'visibility-start', atWU: 0, visibility: 0, easing: 'smoothstep', locked: true },
    { id: 'visibility-middle', atWU: middleWU, visibility: 1, easing: 'ease-in-out', locked: false },
    { id: 'visibility-end', atWU: durationWU, visibility: 0, easing: 'linear', locked: true },
  ];
  document.profiles.mobile.overrides.visibility['visibility-middle'] = { visibility: 0.6 };

  const full = compileAboutNarrativeRuntimePlan(document, { layoutProfile: 'desktop' });
  assert.equal(full.valid, true);
  assertClose(
    sampleAboutNarrativeRuntimePlan(full, middleWU * 0.25).simulation.visibility,
    0.15625,
    'outgoing smoothstep visibility',
  );
  assert.equal(sampleAboutNarrativeRuntimePlan(full, middleWU).simulation.visibility, 1);

  const mobile = compileAboutNarrativeRuntimePlan(document, { layoutProfile: 'mobile' });
  assert.equal(mobile.valid, true);
  assert.equal(sampleAboutNarrativeRuntimePlan(mobile, middleWU).simulation.visibility, 0.6);

  const reduced = compileAboutNarrativeRuntimePlan(document, {
    layoutProfile: 'desktop',
    motionProfile: 'reduced',
  });
  assert.equal(sampleAboutNarrativeRuntimePlan(reduced, middleWU - 0.000001).simulation.visibility, 0);
  assert.equal(sampleAboutNarrativeRuntimePlan(reduced, middleWU).simulation.visibility, 1);
});

test('Discipline grid compiles three cumulative paired-row beats', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  const reveal = plan.disciplineReveal;
  assert.ok(reveal);
  assert.equal(reveal.sourceType, 'motion');
  assert.equal(reveal.motion.type, 'discipline-reveal');
  assert.equal(plan.textFields.some((field) => field.kind === 'discipline-reveal'), false);
  assert.equal(reveal.motion.targetWorldId, 'world-grid');
  assert.equal(reveal.settleDurationWU, 0.3);
  assert.equal(reveal.beatDurationWU, 0.32);
  assert.equal(reveal.itemsPerBeat, 2);
  assert.equal(reveal.formationColumn, 43);
  assert.equal(reveal.formationRow, 54);
  assert.equal(reveal.beatCount, 3);
  assert.equal(reveal.sequenceStartWU, 9);
  assertClose(reveal.sequenceEndWU, 9.96, 'discipline sequence end');
  assertClose(reveal.restoreStartWU, 10.85, 'discipline restore start');
  assert.equal(reveal.effectEndWU, 11.15);
  assert.equal(reveal.items.length, 6);
  reveal.items.forEach((item) => {
    assert.equal('position' in item, false);
    assert.equal('mobilePosition' in item, false);
  });
  ['reconnectOpacity', 'labelOffsetPx', 'labelScale'].forEach((key) => {
    assert.equal(key in reveal.motion.parameters, false, `${key} must be removed`);
  });

  const settling = sampleAboutNarrativeRuntimePlan(plan, 8.85).disciplineReveal;
  assert.equal(settling.active, true);
  assert.equal(settling.activeIndex, -1);
  assert.ok(settling.backgroundProgress > 0 && settling.backgroundProgress < 1);

  for (let beatIndex = 0; beatIndex < reveal.beatCount; beatIndex += 1) {
    const activeIndex = beatIndex * reveal.itemsPerBeat;
    const midpointWU = reveal.sequenceStartWU + ((beatIndex + 0.5) * reveal.beatDurationWU);
    const frame = sampleAboutNarrativeRuntimePlan(plan, midpointWU).disciplineReveal;
    assert.equal(frame.activeIndex, activeIndex);
    assert.equal(frame.activeGroup, reveal.items[activeIndex].group);
    assert.equal(frame.activeReveal, 1);
    assert.ok(frame.beatProgress > 0.49 && frame.beatProgress < 0.51);
    const held = sampleAboutNarrativeRuntimePlan(
      plan,
      reveal.sequenceStartWU + ((beatIndex + 0.95) * reveal.beatDurationWU),
    ).disciplineReveal;
    assert.equal(held.activeIndex, activeIndex);
    assert.equal(held.activeReveal, 1);
    assert.equal(held.copyOffsetY, 0);
  }

  const readingHold = sampleAboutNarrativeRuntimePlan(plan, 10.15).disciplineReveal;
  const restoring = sampleAboutNarrativeRuntimePlan(plan, 11).disciplineReveal;
  const restored = sampleAboutNarrativeRuntimePlan(plan, 11.149999).disciplineReveal;
  const handoff = sampleAboutNarrativeRuntimePlan(plan, 11.150001).disciplineReveal;
  assert.equal(readingHold.activeIndex, -1);
  assert.equal(readingHold.restoreProgress, 0);
  assert.equal(restoring.activeIndex, -1);
  assert.ok(restoring.restoreProgress > 0 && restoring.restoreProgress < 1);
  assert.ok(restored.restoreProgress > 0.999);
  assert.equal(handoff.active, false);
});

test('Reduced Motion switches disciplines at the same beat boundaries without spatial travel', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, {
    layoutProfile: 'desktop',
    motionProfile: 'reduced',
  });
  const reveal = plan.disciplineReveal;
  const first = sampleAboutNarrativeRuntimePlan(plan, reveal.sequenceStartWU + 0.16).disciplineReveal;
  const second = sampleAboutNarrativeRuntimePlan(plan, reveal.sequenceStartWU + 0.48).disciplineReveal;
  assert.equal(first.activeIndex, 0);
  assert.equal(second.activeIndex, 2);
  assert.equal(first.activeReveal, 1);
  assert.equal(second.activeReveal, 1);
  assert.equal(first.copyOffsetY, 0);
  assert.equal(second.copyOffsetY, 0);
});

test('Discipline sequence timing must fit inside the Motion clip', () => {
  const invalid = structuredClone(canonical);
  const clip = invalid.tracks.interactions.clips.find((item) => item.type === 'discipline-reveal');
  clip.parameters.beatDurationWU = 1;
  assert.ok(validateAboutNarrativeTrackDocument(invalid).some((item) => (
    item.code === 'discipline-sequence-window'
  )));
});

test('Reduced Motion keeps the discipline clip active without a separate restore clock', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, {
    layoutProfile: 'desktop',
    motionProfile: 'reduced',
  });
  const reveal = plan.disciplineReveal;
  const restoreStartWU = reveal.effectEndWU - reveal.restoreDurationWU;
  const held = sampleAboutNarrativeRuntimePlan(
    plan,
    restoreStartWU + (reveal.restoreDurationWU * 0.5),
  ).disciplineReveal;
  assert.equal(held.active, true);
  assert.equal(held.restoreProgress, 0);
});

test('Reduced Motion step-samples the current authored Camera FOV and full roll', () => {
  const document = structuredClone(canonical);
  document.tracks.camera.keys[0].rotation = [12, -18, 37];
  document.tracks.camera.keys[0].fov = 39;
  const plan = compileAboutNarrativeRuntimePlan(document, {
    layoutProfile: 'desktop',
    motionProfile: 'reduced',
  });
  const [firstKey, secondKey] = plan.cameraKeys;
  const firstWU = (firstKey.atWU + secondKey.atWU) / 2;
  const first = sampleAboutNarrativeRuntimePlan(plan, firstWU, { ambientSeconds: 10 });
  const second = sampleAboutNarrativeRuntimePlan(plan, secondKey.atWU, { ambientSeconds: 20 });
  assert.equal(first.reducedMotion, true);
  assert.equal(first.ambientTime, 0);
  assert.equal(first.world.transitionProgress, 1);
  assert.deepEqual(first.camera.position, firstKey.position);
  assert.deepEqual(first.camera.quaternion, firstKey.quaternion);
  assert.equal(first.camera.fov, 39);
  assert.deepEqual(second.camera.position, secondKey.position);
  assert.deepEqual(second.camera.quaternion, secondKey.quaternion);
  assert.equal(second.camera.fov, secondKey.fov);

  const title = plan.textFields.find((field) => field.kind === 'title' && field.startWU < field.focusWU);
  const semanticFrame = sampleAboutNarrativeRuntimePlan(plan, title.focusWU);
  assert.equal(semanticFrame.text.activeFieldIds.includes(title.id), true);
});

test('layout profile overrides apply completely by stable object ID without source mutation', () => {
  const model = structuredClone(canonical);
  const original = structuredClone(model);
  const camera = model.tracks.camera.keys[1];
  const visibility = model.tracks.visibility.keys[1] || model.tracks.visibility.keys[0];
  const world = model.tracks.worlds.objects[0];
  const text = model.tracks.text.fields.find((field) => field.kind === 'title' && !field.protected);
  const clip = model.tracks.interactions.clips[0];
  model.profiles.mobile.overrides.camera[camera.id] = {
    position: [2, 3, 4],
    rotation: [10, 20, 30],
    lookAtTarget: [2, 3, 3],
    fov: 44,
    easing: 'ease-in-out',
  };
  model.profiles.mobile.overrides.visibility[visibility.id] = {
    visibility: 0.35,
    easing: 'linear',
  };
  model.profiles.mobile.overrides.worlds[world.id] = {
    anchorWU: world.anchorWU + 0.1,
    transform: { position: [1, 2, 3] },
  };
  model.profiles.mobile.overrides.text[text.id] = {
    startWU: text.startWU + 0.01,
    focusWU: text.focusWU + 0.01,
    endWU: text.endWU + 0.01,
  };
  model.profiles.mobile.overrides.interactions[clip.id] = {
    activationWU: clip.activationWU + 0.01,
  };
  const candidateBeforeCompile = structuredClone(model);
  const plan = compileAboutNarrativeRuntimePlan(model, { layoutProfile: 'mobile' });

  assert.equal(plan.valid, true);
  assert.equal(plan.layoutProfile, 'mobile');
  assert.equal(plan.pointProfile, 'mobile');
  assert.deepEqual(model, candidateBeforeCompile);
  assert.deepEqual(plan.cameraKeys.find((item) => item.id === camera.id).position, [2, 3, 4]);
  assert.deepEqual(plan.cameraKeys.find((item) => item.id === camera.id).rotation, [10, 20, 30]);
  assert.equal(plan.cameraKeys.find((item) => item.id === camera.id).aimEnabled, true);
  assert.deepEqual(plan.cameraKeys.find((item) => item.id === camera.id).lookAtTarget, [2, 3, 3]);
  assert.equal(plan.visibilityKeys.find((item) => item.id === visibility.id).visibility, 0.35);
  const resolvedWorld = plan.worlds.find((item) => item.id === world.id);
  assert.deepEqual(resolvedWorld.transform.position, [1, 2, 3]);
  assert.deepEqual(resolvedWorld.transform.rotation, world.transform.rotation);
  assert.equal(resolvedWorld.anchorWU, world.anchorWU + 0.1);
  assert.equal(plan.textFields.find((item) => item.id === text.id).focusWU, text.focusWU + 0.01);
  assert.equal(plan.interactionClips.find((item) => item.id === clip.id).activationWU, clip.activationWU + 0.01);
  assert.notDeepEqual(model, original);
});

test('render spans are unique and content pressure remains diagnostic-only', () => {
  const base = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'tablet' });
  const field = base.textFields.find((item) => item.publishable);
  const pressured = compileAboutNarrativeRuntimePlan(canonical, {
    layoutProfile: 'tablet',
    contentPressure: { [field.id]: { requiredScrollWU: 99 } },
  });
  assert.equal(pressured.valid, true);
  assert.deepEqual(pressured.renderSpans, base.renderSpans);
  assert.equal(new Set(base.renderSpans.flatMap((span) => span.fieldIds)).size, base.renderSpans.length);
  assert.ok(pressured.diagnostics.some((item) => item.code === 'content-pressure'));
});

test('runtime sampling retains every caller-owned container identity', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  const target = createAboutNarrativeRuntimeFrameSample();
  sampleAboutNarrativeRuntimePlanInto(plan, 0, target);
  const identities = {
    frame: target,
    layoutProfile: target.layoutProfile,
    pointProfile: target.pointProfile,
    camera: target.camera,
    cameraPosition: target.camera.position,
    cameraQuaternion: target.camera.quaternion,
    simulation: target.simulation,
    world: target.world,
    transition: target.world.transition,
    text: target.text,
    textIds: target.text.activeFieldIds,
    interactions: target.interactions,
    activeIds: target.interactions.activeClipIds,
    activatedIds: target.interactions.activatedClipIds,
    disciplineReveal: target.disciplineReveal,
    editorialSignals: target.editorialSignals,
  };
  for (let index = 0; index < 600; index += 1) {
    const sampled = sampleAboutNarrativeRuntimePlanInto(
      plan,
      (index / 599) * plan.durationWU,
      target,
      { ambientSeconds: index / 60, deltaSeconds: 1 / 60 },
    );
    assert.equal(sampled, identities.frame);
    assert.equal(sampled.layoutProfile, identities.layoutProfile);
    assert.equal(sampled.pointProfile, identities.pointProfile);
    assert.equal(sampled.camera, identities.camera);
    assert.equal(sampled.camera.position, identities.cameraPosition);
    assert.equal(sampled.camera.quaternion, identities.cameraQuaternion);
    assert.equal(sampled.simulation, identities.simulation);
    assert.equal(sampled.world, identities.world);
    assert.equal(sampled.world.transition, identities.transition);
    assert.equal(sampled.text, identities.text);
    assert.equal(sampled.text.activeFieldIds, identities.textIds);
    assert.equal(sampled.interactions, identities.interactions);
    assert.equal(sampled.interactions.activeClipIds, identities.activeIds);
    assert.equal(sampled.interactions.activatedClipIds, identities.activatedIds);
    assert.equal(sampled.disciplineReveal, identities.disciplineReveal);
    assert.equal(sampled.editorialSignals, identities.editorialSignals);
  }
});

test('invalid candidates return invalid plans without freezing caller-owned input', () => {
  const invalid = structuredClone(canonical);
  invalid.tracks.camera.keys[1].atWU = invalid.tracks.camera.keys[0].atWU;
  const plan = compileAboutNarrativeRuntimePlan(invalid, { layoutProfile: 'desktop' });
  assert.equal(plan.valid, false);
  assert.equal(Object.isFrozen(invalid), false);
  invalid.globals.readingWidthRem += 1;
  assert.ok(plan.diagnostics.some((item) => item.level === 'error'));
  assert.equal(sampleAboutNarrativeRuntimePlanInto(plan, 0, createAboutNarrativeRuntimeFrameSample()), null);
});
