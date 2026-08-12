import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  compileAboutNarrativeComposerPlan,
  createAboutNarrativeComposerFrameSample,
  getAboutNarrativeComposerPreparationRequest,
  sampleAboutNarrativeComposerPlanInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js';
import {
  applyAboutNarrativePointFieldMotionToPosition,
  createAboutNarrativePointFieldMotionSample,
  resolveAboutNarrativePointFieldSeededPhase,
  sampleAboutNarrativePointFieldMotionInto,
  writeAboutNarrativePointFieldSeedPhases,
  writeAboutNarrativePointFieldSpatialPhases,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldMotion.js';

const canonical = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const composerSource = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js',
  import.meta.url,
), 'utf8');

function compile(layoutProfile = 'desktop') {
  const plan = compileAboutNarrativeComposerPlan(canonical, {
    previewLayoutProfile: layoutProfile,
    previewMotionProfile: 'full',
    inlineSize: layoutProfile === 'mobile' ? 390 : layoutProfile === 'tablet' ? 1024 : 1440,
    blockSize: layoutProfile === 'mobile' ? 844 : 1000,
  });
  assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics, null, 2));
  return plan;
}

test('the production Composer has no legacy renderer bridge or v5 runtime delegation', () => {
  assert.doesNotMatch(composerSource, /PointFieldRendererBridge/);
  assert.doesNotMatch(composerSource, /compileAboutNarrativeRuntimePlan/);
  assert.doesNotMatch(composerSource, /sampleAboutNarrativeRuntimePlanInto/);
  const plan = compile();
  assert.equal(plan.sourceSchemaVersion, 7);
  assert.equal('rendererPlan' in plan, false);
  assert.equal('basePlan' in plan, false);
});

test('Composer preparation and sampling retain caller-owned hot-frame containers', () => {
  const plan = compile();
  const frame = createAboutNarrativeComposerFrameSample();
  const identities = {
    frame,
    world: frame.world,
    transition: frame.world.transition,
    stagger: frame.world.transition.stagger,
    path: frame.world.transition.path,
    flatten: frame.world.transition.flatten,
    interactions: frame.interactions,
    active: frame.interactions.activeClipIds,
    activated: frame.interactions.activatedClipIds,
    pointField: frame._pointFieldFrame,
    disciplineWeights: frame._disciplineReveal.weights,
  };
  for (let storyWU = 0; storyWU <= plan.durationWU; storyWU += 0.025) {
    const sampled = sampleAboutNarrativeComposerPlanInto(plan, storyWU, frame);
    assert.equal(sampled, identities.frame);
    assert.equal(sampled.world, identities.world);
    assert.equal(sampled.world.transition, identities.transition);
    assert.equal(sampled.world.transition.stagger, identities.stagger);
    assert.equal(sampled.world.transition.path, identities.path);
    assert.equal(sampled.world.transition.flatten, identities.flatten);
    assert.equal(sampled.interactions, identities.interactions);
    assert.equal(sampled.interactions.activeClipIds, identities.active);
    assert.equal(sampled.interactions.activatedClipIds, identities.activated);
    assert.equal(sampled._pointFieldFrame, identities.pointField);
    assert.equal(sampled._disciplineReveal.weights, identities.disciplineWeights);
  }
  const request = getAboutNarrativeComposerPreparationRequest(plan, 9.5);
  assert.equal(request.targetWorldId, 'world-grid');
  assert.equal(request.sequenceKey, plan.worldSequenceKey);
});

test('renderer phase buffers and anchor motion use the shared deterministic point-motion module', () => {
  const seeds = new Float32Array([0.1, 0.4, 0.9]);
  const seedPhases = new Float32Array(6);
  writeAboutNarrativePointFieldSeedPhases(seeds, 11, 17, seedPhases);
  seeds.forEach((seed, index) => {
    assert.equal(seedPhases[index * 2], Math.fround(
      resolveAboutNarrativePointFieldSeededPhase(seed, 11),
    ));
    assert.equal(seedPhases[(index * 2) + 1], Math.fround(
      resolveAboutNarrativePointFieldSeededPhase(seed, 17),
    ));
  });

  const positions = new Float32Array([-2, -1, 0, 0, 1, 2, 2, 3, -2]);
  const spatialPhases = new Float32Array(12);
  writeAboutNarrativePointFieldSpatialPhases(positions, spatialPhases);
  spatialPhases.forEach((value) => assert(value >= 0 && value <= 1));

  const transition = {
    type: 'morph',
    stagger: { mode: 'random', amount: 0.3, axis: 'y', seed: 11 },
    path: { mode: 'arc', amount: 0.8, axis: 'z', frequency: 1, seed: 17 },
    flatten: { mode: 'toward-plane', amount: 0.5, axis: 'y', offset: -1 },
  };
  const motion = sampleAboutNarrativePointFieldMotionInto(
    transition,
    0.5,
    { seed: 0.4, radialPhase: 0.5, xPhase: 0.5, yPhase: 0.5, zPhase: 0.5 },
    createAboutNarrativePointFieldMotionSample(),
  );
  const point = applyAboutNarrativePointFieldMotionToPosition({ x: 0, y: 0, z: 0 }, motion);
  assert.deepEqual(Object.keys(point), ['x', 'y', 'z']);
  assert(Object.values(point).every(Number.isFinite));
});
