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
import { migrateAboutNarrativeVersion2To3 } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackSchema.js';

const canonical = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const legacy = JSON.parse(await readFile(
  new URL('./fixtures/about-narrative/contents-about-v2.json', import.meta.url),
  'utf8',
));

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

test('runtime plan migrates v2 or accepts strict v3 without authored Section state', () => {
  const fromV2 = compileAboutNarrativeRuntimePlan(legacy, { layoutProfile: 'desktop' });
  const migratedV3 = migrateAboutNarrativeVersion2To3(legacy);
  const fromMigratedV3 = compileAboutNarrativeRuntimePlan(migratedV3, { layoutProfile: 'desktop' });
  const fromCanonicalV3 = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });

  assert.equal(fromV2.valid, true);
  assert.equal(fromMigratedV3.valid, true);
  assert.equal(fromCanonicalV3.valid, true);
  assert.equal(fromV2.model.schemaVersion, 3);
  assert.equal(fromV2.layoutProfile, 'desktop');
  assert.equal(fromV2.pointProfile, 'desktop');
  assert.equal(fromV2.motionProfile, 'full');
  assert.equal(fromV2.durationWU, fromV2.maxStoryWU);
  assert.equal(fromV2.resolver.contentExtentWU, fromV2.resolver.scrollDurationWU + 1);
  assert.deepEqual(fromV2.cameraKeys, fromMigratedV3.cameraKeys);
  assert.deepEqual(fromV2.worlds, fromMigratedV3.worlds);
  assert.equal('sections' in fromV2, false);
  assert.equal('sections' in fromCanonicalV3, false);
  assert.equal('sectionIndex' in sampleAboutNarrativeRuntimePlan(fromV2, 0), false);
  assert.equal('localProgress' in sampleAboutNarrativeRuntimePlan(fromV2, 0), false);
});

test('compiled Worlds derive endWU and anchorRailZ and preparation uses stable World IDs', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  assert.equal(plan.valid, true);
  plan.worlds.forEach((world, index) => {
    assert.equal(world.endWU, plan.worlds[index + 1]?.startWU ?? plan.durationWU);
    assertClose(
      world.anchorRailZ,
      plan.model.globals.camera.startZ - (world.anchorWU * plan.model.globals.camera.cadence),
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

test('desktop Camera and World sampling matches legacy over randomized and boundary-epsilon WU', () => {
  const legacyPlan = compileAboutNarrativeDocument(legacy, { profile: 'desktop' });
  const plan = compileAboutNarrativeRuntimePlan(legacy, { layoutProfile: 'desktop' });
  const samples = [...seededStorySamples(plan.durationWU), ...boundarySamples(plan)];

  samples.forEach((storyWU) => {
    const legacy = sampleAboutNarrativePlan(legacyPlan, storyWU);
    const frame = sampleAboutNarrativeRuntimePlan(plan, storyWU);
    assertVectorClose(frame.camera.position, legacy.camera.position, `camera.position @ ${storyWU}`);
    assertVectorClose(frame.camera.target, legacy.camera.target, `camera.target @ ${storyWU}`);
    assertClose(frame.camera.fov, legacy.camera.fov, `camera.fov @ ${storyWU}`);
    assertClose(frame.camera.roll, legacy.camera.roll, `camera.roll @ ${storyWU}`);
    assert.equal(frame.world.to.id, `world-${legacy.world.to.sectionId}`);
    assert.equal(frame.world.from.id, `world-${legacy.world.from.sectionId}`);
    assertClose(frame.world.transitionProgress, legacy.world.transitionProgress, `transition @ ${storyWU}`);
  });
});

test('absolute title windows match migrated legacy Cue timing with half-open ends', () => {
  const legacyPlan = compileAboutNarrativeDocument(legacy, { profile: 'desktop' });
  const plan = compileAboutNarrativeRuntimePlan(legacy, { layoutProfile: 'desktop' });
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
  const plan = compileAboutNarrativeRuntimePlan(legacy, { layoutProfile: 'desktop' });
  const textMotion = legacy.globals.textMotion;
  const target = createAboutNarrativeTitleFieldSample();
  let randomState = 0x243f6a88;
  const random = () => {
    randomState = ((1103515245 * randomState) + 12345) >>> 0;
    return randomState / 0x100000000;
  };

  legacyPlan.sections.forEach((section) => {
    (section.text.cues || [])
      .filter((cue) => cue.motion?.mode !== 'vertical')
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

test('interaction activation is absolute, targeted, and half-open', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  const clip = plan.interactionClips[0];
  const before = sampleAboutNarrativeRuntimePlan(plan, clip.activationWU - 0.000001);
  const at = sampleAboutNarrativeRuntimePlan(plan, clip.activationWU);
  const after = sampleAboutNarrativeRuntimePlan(plan, clip.activationWU + 0.000001);
  assert.equal(before.interactions.activeInteraction, clip);
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

test('Discipline reveal exposes absolute WU choreography and extended effect checkpoints', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  const reveal = plan.disciplineReveal;
  assert.ok(reveal);
  assert.ok(reveal.staggerWU > 0);
  assert.ok(reveal.backgroundFadeWU > 0);
  assert.ok(reveal.labelDurationWU > 0);
  assert.ok(reveal.holdWU > 0);
  assert.ok(reveal.labelSequenceEndWU <= reveal.endWU + 0.000001);

  const travel = sampleAboutNarrativeRuntimePlan(plan, reveal.fieldTravelStartWU + 0.000001).disciplineReveal;
  const labels = sampleAboutNarrativeRuntimePlan(plan, reveal.startWU + reveal.staggerWU).disciplineReveal;
  const handoff = sampleAboutNarrativeRuntimePlan(plan, reveal.endWU + 0.000001).disciplineReveal;
  assert.equal(travel.active, true);
  assert.equal(labels.labelActive, true);
  assertClose(labels.elapsedWU, reveal.staggerWU, 'discipline elapsed');
  assert.equal(handoff.labelActive, false);
  assert.equal(handoff.active, reveal.endWU + 0.000001 < reveal.effectEndWU);
});

test('Reduced Motion settles Camera, transitions, and ambient time without dropping Text', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, {
    layoutProfile: 'desktop',
    motionProfile: 'reduced',
  });
  const world = plan.worlds[1];
  const firstWU = world.startWU + 0.1;
  const secondWU = Math.min(world.endWU - 0.1, world.startWU + 0.4);
  const first = sampleAboutNarrativeRuntimePlan(plan, firstWU, { ambientSeconds: 10 });
  const second = sampleAboutNarrativeRuntimePlan(plan, secondWU, { ambientSeconds: 20 });
  assert.equal(first.reducedMotion, true);
  assert.equal(first.ambientTime, 0);
  assert.equal(first.world.transitionProgress, 1);
  assert.deepEqual(first.camera.position, second.camera.position);
  assert.deepEqual(first.camera.target, second.camera.target);

  const title = plan.textFields.find((field) => field.kind === 'title' && field.startWU < field.focusWU);
  const semanticFrame = sampleAboutNarrativeRuntimePlan(plan, title.focusWU);
  assert.equal(semanticFrame.text.activeFieldIds.includes(title.id), true);
});

test('layout profile overrides apply completely by stable object ID without source mutation', () => {
  const model = structuredClone(canonical);
  const original = structuredClone(model);
  const camera = model.tracks.camera.keys[1];
  const world = model.tracks.worlds.objects[0];
  const text = model.tracks.text.fields.find((field) => field.kind === 'title' && !field.protected);
  const clip = model.tracks.interactions.clips[0];
  model.profiles.mobile.overrides.camera[camera.id] = {
    offset: [2, 3, 4],
    lookAtOffset: [0.1, 0.2, -2],
    fov: 44,
    roll: 0.1,
    easing: 'ease-in-out',
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
  assert.deepEqual(plan.cameraKeys.find((item) => item.id === camera.id).offset, [2, 3, 4]);
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
    cameraTarget: target.camera.target,
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
    assert.equal(sampled.camera.target, identities.cameraTarget);
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
