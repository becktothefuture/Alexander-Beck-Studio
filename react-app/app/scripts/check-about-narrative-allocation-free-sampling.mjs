import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  compileAboutNarrativeDocument,
  createAboutNarrativeFrameSample,
  sampleAboutNarrativePlan,
  sampleAboutNarrativePlanInto,
} from '../src/routes/about-narrative-lab/aboutNarrativeCompiler.js';

const canonical = JSON.parse(await readFile(
  new URL('../public/config/contents-about.json', import.meta.url),
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

test('sampleInto preserves allocating sampler values across story states', () => {
  const plan = compileAboutNarrativeDocument(canonical);
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
  const plan = compileAboutNarrativeDocument(canonical);
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
      compileAboutNarrativeDocument(canonical),
      0,
      {},
    ),
    /createAboutNarrativeFrameSample/,
  );
  const target = createAboutNarrativeFrameSample();
  assert.equal(sampleAboutNarrativePlanInto({ valid: false, sections: [] }, 0, target), null);
});
