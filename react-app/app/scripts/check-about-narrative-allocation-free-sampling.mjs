import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  compileAboutNarrativeDocument,
  createAboutNarrativeFrameSample,
  sampleAboutNarrativePlan,
  sampleAboutNarrativePlanInto,
} from '../src/routes/about-narrative-lab/aboutNarrativeCompiler.js';
import {
  compileAboutNarrativeTrackModel,
  createAboutNarrativeTrackFrameSample,
  sampleAboutNarrativeTrackPlan,
  sampleAboutNarrativeTrackPlanInto,
} from '../src/routes/about-narrative-lab/aboutNarrativeTrackModel.js';
import {
  compileAboutNarrativeRuntimePlan,
  createAboutNarrativeRuntimeFrameSample,
  sampleAboutNarrativeRuntimePlanInto,
} from '../src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';

const canonical = JSON.parse(await readFile(
  new URL('../public/config/contents-about.json', import.meta.url),
  'utf8',
));
const legacy = JSON.parse(await readFile(
  new URL('../../../scripts/fixtures/about-narrative/contents-about-v2.json', import.meta.url),
  'utf8',
));

function comparableFrame(frame) {
  return {
    globals: frame.globals,
    storyWU: frame.storyWU,
    storyTime: frame.storyTime,
    ambientTime: frame.ambientTime,
    reducedMotion: frame.reducedMotion,
    sectionIndex: frame.sectionIndex,
    section: frame.section,
    localProgress: frame.localProgress,
    camera: {
      position: [...frame.camera.position],
      target: [...frame.camera.target],
      fov: frame.camera.fov,
      roll: frame.camera.roll,
      cadence: frame.camera.cadence,
    },
    world: {
      from: frame.world.from,
      to: frame.world.to,
      sequence: frame.world.sequence,
      sequenceKey: frame.world.sequenceKey,
      preparationDescriptor: frame.world.preparationDescriptor,
      changes: frame.world.changes,
      transitionProgress: frame.world.transitionProgress,
      transition: { ...frame.world.transition },
    },
    disciplineReveal: frame.disciplineReveal ? { ...frame.disciplineReveal } : null,
  };
}

function comparableTrackFrame(frame) {
  return {
    storyWU: frame.storyWU,
    durationWU: frame.durationWU,
    globals: frame.globals,
    camera: {
      position: [...frame.camera.position],
      target: [...frame.camera.target],
      fov: frame.camera.fov,
      roll: frame.camera.roll,
      cadence: frame.camera.cadence,
    },
    world: {
      from: frame.world.from,
      to: frame.world.to,
      transitionProgress: frame.world.transitionProgress,
      transition: frame.world.transition,
    },
    text: {
      activeFieldIds: [...frame.text.activeFieldIds],
    },
    interactions: {
      activeClipIds: [...frame.interactions.activeClipIds],
      activatedClipIds: [...frame.interactions.activatedClipIds],
    },
  };
}

test('sampleInto preserves allocating sampler values across story states', () => {
  const plan = compileAboutNarrativeDocument(legacy);
  const target = createAboutNarrativeFrameSample();
  const options = { ambientSeconds: 12.5, reducedMotion: false, liveAmbient: true };
  const checkpoints = [0, 0.7, 2.1, 5.4, 9.8, plan.maxStoryWU];
  checkpoints.forEach((storyWU) => {
    const expected = sampleAboutNarrativePlan(plan, storyWU, options);
    const actual = sampleAboutNarrativePlanInto(plan, storyWU, target, options);
    assert.deepEqual(comparableFrame(actual), comparableFrame(expected));
  });
});

test('600 warmed samples retain every runtime-owned container and array identity', () => {
  const plan = compileAboutNarrativeDocument(legacy);
  const target = createAboutNarrativeFrameSample();
  const options = { ambientSeconds: 0, reducedMotion: false, liveAmbient: true };
  sampleAboutNarrativePlanInto(plan, 0, target, options);
  const identities = {
    frame: target,
    camera: target.camera,
    cameraPosition: target.camera.position,
    cameraTarget: target.camera.target,
    world: target.world,
    transition: target.world.transition,
    disciplineReveal: target.disciplineReveal,
    editorialSignals: target.editorialSignals,
  };

  for (let index = 0; index < 600; index += 1) {
    options.ambientSeconds = index / 60;
    const storyWU = (index / 599) * plan.maxStoryWU;
    const sampled = sampleAboutNarrativePlanInto(plan, storyWU, target, options);
    assert.equal(sampled, identities.frame);
    assert.equal(sampled.camera, identities.camera);
    assert.equal(sampled.camera.position, identities.cameraPosition);
    assert.equal(sampled.camera.target, identities.cameraTarget);
    assert.equal(sampled.world, identities.world);
    assert.equal(sampled.world.transition, identities.transition);
    assert.equal(sampled.disciplineReveal, identities.disciplineReveal);
    assert.equal(sampled.editorialSignals, identities.editorialSignals);
  }
});

test('sampleInto rejects arbitrary targets and invalid plans without mutating ownership', () => {
  assert.throws(
    () => sampleAboutNarrativePlanInto(
      compileAboutNarrativeDocument(legacy),
      0,
      {},
    ),
    /createAboutNarrativeFrameSample/,
  );
  const target = createAboutNarrativeFrameSample();
  assert.equal(sampleAboutNarrativePlanInto({ valid: false, sections: [] }, 0, target), null);
});

test('sectionless track sampleInto preserves allocating sampler values across story states', () => {
  const plan = compileAboutNarrativeTrackModel(canonical);
  const target = createAboutNarrativeTrackFrameSample();
  const checkpoints = [0, 0.7, 2.1, 5.4, 9.8, plan.durationWU];
  checkpoints.forEach((storyWU) => {
    const expected = sampleAboutNarrativeTrackPlan(plan, storyWU);
    const actual = sampleAboutNarrativeTrackPlanInto(plan, storyWU, target);
    assert.deepEqual(comparableTrackFrame(actual), comparableTrackFrame(expected));
  });
});

test('sectionless track sampleInto retains every runtime-owned container and array identity', () => {
  const plan = compileAboutNarrativeTrackModel(canonical);
  const target = createAboutNarrativeTrackFrameSample();
  sampleAboutNarrativeTrackPlanInto(plan, 0, target);
  const identities = {
    frame: target,
    camera: target.camera,
    cameraPosition: target.camera.position,
    cameraTarget: target.camera.target,
    world: target.world,
    text: target.text,
    textIds: target.text.activeFieldIds,
    interactions: target.interactions,
    activeClipIds: target.interactions.activeClipIds,
    activatedClipIds: target.interactions.activatedClipIds,
  };

  for (let index = 0; index < 600; index += 1) {
    const storyWU = (index / 599) * plan.durationWU;
    const sampled = sampleAboutNarrativeTrackPlanInto(plan, storyWU, target);
    assert.equal(sampled, identities.frame);
    assert.equal(sampled.camera, identities.camera);
    assert.equal(sampled.camera.position, identities.cameraPosition);
    assert.equal(sampled.camera.target, identities.cameraTarget);
    assert.equal(sampled.world, identities.world);
    assert.equal(sampled.text, identities.text);
    assert.equal(sampled.text.activeFieldIds, identities.textIds);
    assert.equal(sampled.interactions, identities.interactions);
    assert.equal(sampled.interactions.activeClipIds, identities.activeClipIds);
    assert.equal(sampled.interactions.activatedClipIds, identities.activatedClipIds);
  }
});

test('sectionless track sampleInto rejects arbitrary targets and invalid plans without mutating ownership', () => {
  assert.throws(
    () => sampleAboutNarrativeTrackPlanInto(
      compileAboutNarrativeTrackModel(canonical),
      0,
      {},
    ),
    /createAboutNarrativeTrackFrameSample/,
  );
  const target = createAboutNarrativeTrackFrameSample();
  assert.equal(sampleAboutNarrativeTrackPlanInto({ valid: false, cameraKeys: [] }, 0, target), null);
});

test('sectionless runtime sampleInto retains stable responsive profile fields', () => {
  const plan = compileAboutNarrativeRuntimePlan(canonical, {
    inlineSize: 768,
    blockSize: 1024,
  });
  const target = createAboutNarrativeRuntimeFrameSample();
  for (let index = 0; index < 600; index += 1) {
    const sampled = sampleAboutNarrativeRuntimePlanInto(
      plan,
      (index / 599) * plan.durationWU,
      target,
    );
    assert.equal(sampled, target);
    assert.equal(sampled.layoutProfile, 'tablet');
    assert.equal(sampled.pointProfile, 'mobile');
  }
});
