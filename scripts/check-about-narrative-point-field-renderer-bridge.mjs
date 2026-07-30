import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  applyAboutNarrativePointFieldMotionToPosition,
  compileAboutNarrativeRendererRuntimePlan,
  createAboutNarrativeRendererFrameSample,
  getAboutNarrativeRendererPreparationRequest,
  resolveAboutNarrativePointFieldSeededPhase,
  sampleAboutNarrativeRendererRuntimePlanInto,
  writeAboutNarrativePointFieldSeedPhases,
  writeAboutNarrativePointFieldSpatialPhases,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldRendererBridge.js';
import {
  createAboutNarrativePointFieldMotionSample,
  sampleAboutNarrativePointFieldMotionInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldMotion.js';
import {
  migrateAboutNarrativeVersion5To6,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';
import {
  compileAboutNarrativeRuntimePlan,
  createAboutNarrativeRuntimeFrameSample,
  sampleAboutNarrativeRuntimePlanInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';

const canonicalV5 = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const canonicalV6 = migrateAboutNarrativeVersion5To6(canonicalV5);

function firstMorph(document) {
  return document.tracks.pointField.segments.find((segment) => segment.transition.type === 'morph');
}

function seededStorySamples(durationWU, count = 300) {
  const values = [0, durationWU];
  let state = 0x243f6a88;
  for (let index = 0; index < count; index += 1) {
    state = ((1664525 * state) + 1013904223) >>> 0;
    values.push((state / 0x100000000) * durationWU);
  }
  return values;
}

test('renderer bridge delegates schema v5 compilation and sampling without changing legacy values', () => {
  const legacyPlan = compileAboutNarrativeRuntimePlan(canonicalV5);
  const bridgePlan = compileAboutNarrativeRendererRuntimePlan(canonicalV5);
  assert.equal(bridgePlan.valid, legacyPlan.valid);
  assert.equal(bridgePlan.durationWU, legacyPlan.durationWU);
  assert.deepEqual(bridgePlan.worlds, legacyPlan.worlds);
  assert.deepEqual(bridgePlan.interactionClips, legacyPlan.interactionClips);
  const legacyFrame = createAboutNarrativeRuntimeFrameSample();
  const bridgeFrame = createAboutNarrativeRendererFrameSample();
  seededStorySamples(legacyPlan.durationWU).forEach((storyWU) => {
    sampleAboutNarrativeRuntimePlanInto(legacyPlan, storyWU, legacyFrame);
    sampleAboutNarrativeRendererRuntimePlanInto(bridgePlan, storyWU, bridgeFrame);
    assert.equal(bridgeFrame.world.from?.id, legacyFrame.world.from?.id);
    assert.equal(bridgeFrame.world.to?.id, legacyFrame.world.to?.id);
    assert.equal(bridgeFrame.world.transitionProgress, legacyFrame.world.transitionProgress);
    assert.equal(bridgeFrame.world.transition.type, legacyFrame.world.transition.type);
    assert.deepEqual(bridgeFrame.camera.position, legacyFrame.camera.position);
    assert.equal(bridgeFrame.simulation.visibility, legacyFrame.simulation.visibility);
    assert.equal(bridgeFrame.world.parametricMotion, false);
  });
});

test('v6 bridge combines the legacy non-point frame with native point-field sampling', () => {
  const plan = compileAboutNarrativeRendererRuntimePlan(canonicalV6);
  assert.equal(plan.valid, true);
  assert.equal(plan.sourceSchemaVersion, 6);
  assert.equal(plan.worlds.length, 4);
  assert.equal(plan.worldPreparationDescriptor.pairs.length, 4);
  assert.equal(plan.worldSequenceKey, plan.worldPreparationDescriptor.preparationFingerprint);

  const frame = createAboutNarrativeRendererFrameSample();
  sampleAboutNarrativeRendererRuntimePlanInto(plan, 16.2, frame, { ambientSeconds: 7 });
  assert.equal(frame.sourceSchemaVersion, 6);
  assert.equal(frame.world.from.stateId, 'world-grid');
  assert.equal(frame.world.to.stateId, 'world-emergent');
  assert.equal(frame.world.parametricMotion, true);
  assert.equal(frame.world.visualProgress, frame.world.transitionProgress);
  assert.equal(frame.camera.position.length, 3);
  assert.equal(frame.globals, plan.basePlan.model.globals);
  assert.equal(frame.interactions.activeInteraction?.targetStateId, 'world-emergent');
  assert.equal(frame.interactions.activeInteraction?.targetWorldId, 'world-emergent');

  const request = getAboutNarrativeRendererPreparationRequest(plan, 16.2);
  assert.equal(request.targetWorldId, 'world-emergent');
  assert.equal(request.sequenceKey, plan.worldSequenceKey);
});

test('timing, easing, and parametric motion do not invalidate prepared geometry', () => {
  const baseline = compileAboutNarrativeRendererRuntimePlan(canonicalV6);
  const changed = structuredClone(canonicalV6);
  const segment = firstMorph(changed);
  segment.transition.easing = 'ease-in-out';
  segment.transition.path = {
    mode: 'curl', amount: 0.7, axis: 'z', frequency: 2.5, seed: 17,
  };
  const arrival = changed.tracks.pointField.keys.find((key) => key.id === segment.toKeyId);
  arrival.atWU -= 0.05;
  const changedPlan = compileAboutNarrativeRendererRuntimePlan(changed);
  assert.equal(changedPlan.valid, true);
  assert.equal(changedPlan.worldSequenceKey, baseline.worldSequenceKey);

  const geometryChanged = structuredClone(canonicalV6);
  geometryChanged.tracks.pointField.stateDefinitions[0].shapeParameters.width += 0.2;
  const geometryPlan = compileAboutNarrativeRendererRuntimePlan(geometryChanged);
  assert.equal(geometryPlan.valid, true);
  assert.notEqual(geometryPlan.worldSequenceKey, baseline.worldSequenceKey);
});

test('v6 step-end becomes renderer cut only at the bridge boundary', () => {
  const source = structuredClone(canonicalV6);
  const segment = firstMorph(source);
  segment.transition.type = 'step-end';
  const plan = compileAboutNarrativeRendererRuntimePlan(source);
  assert.equal(plan.valid, true);
  assert.equal(plan.pointFieldPlan.segments.find((item) => item.id === segment.id).transition.type, 'step-end');
  const compiled = plan.pointFieldPlan.segments.find((item) => item.id === segment.id);
  const frame = createAboutNarrativeRendererFrameSample();
  sampleAboutNarrativeRendererRuntimePlanInto(
    plan,
    compiled.startWU + (compiled.durationWU * 0.5),
    frame,
  );
  assert.equal(frame.world.transition.type, 'cut');
  assert.equal(frame.world.transitionProgress, 0);
});

test('v6 bridge sampling retains every caller-owned hot-frame container', () => {
  const plan = compileAboutNarrativeRendererRuntimePlan(canonicalV6);
  const frame = createAboutNarrativeRendererFrameSample();
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
  };
  seededStorySamples(plan.durationWU, 600).forEach((storyWU) => {
    const sampled = sampleAboutNarrativeRendererRuntimePlanInto(plan, storyWU, frame);
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
  });
});

test('renderer phase buffers and anchor motion use deterministic shared point motion', () => {
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
  const radial = [spatialPhases[0], spatialPhases[4], spatialPhases[8]];
  const x = [spatialPhases[1], spatialPhases[5], spatialPhases[9]];
  const y = [spatialPhases[2], spatialPhases[6], spatialPhases[10]];
  const z = [spatialPhases[3], spatialPhases[7], spatialPhases[11]];
  assert.deepEqual([...x], [0, 0.5, 1]);
  assert.deepEqual([...y], [0, 0.5, 1]);
  assert.ok([...radial, ...z].every((value) => value >= 0 && value <= 1));

  const transition = {
    type: 'morph',
    stagger: { mode: 'random', amount: 0.4, axis: 'y', seed: 11 },
    path: { mode: 'noise', amount: 0.8, axis: 'z', frequency: 2, seed: 17 },
    flatten: { mode: 'toward-plane', amount: 0.6, axis: 'y', offset: -0.5 },
  };
  const motion = createAboutNarrativePointFieldMotionSample();
  sampleAboutNarrativePointFieldMotionInto(
    transition,
    0.7,
    { seed: seeds[1], radialPhase: radial[1], xPhase: x[1], yPhase: y[1], zPhase: z[1] },
    motion,
  );
  const position = { x: 1, y: 2, z: 3 };
  const result = applyAboutNarrativePointFieldMotionToPosition(position, motion);
  assert.equal(result, position);
  assert.ok([position.x, position.y, position.z].every(Number.isFinite));
});
