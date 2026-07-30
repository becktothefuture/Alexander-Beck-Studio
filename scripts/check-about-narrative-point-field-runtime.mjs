import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import './check-about-narrative-point-field-motion.mjs';
import './check-about-narrative-point-field-renderer-bridge.mjs';

import {
  applyAboutNarrativeTrackEasing,
  applyAboutNarrativeWorldTransitionEasing,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeMotionMath.js';
import {
  compileAboutNarrativePointFieldRuntime,
  createAboutNarrativePointFieldFrameSample,
  sampleAboutNarrativePointFieldRuntime,
  sampleAboutNarrativePointFieldRuntimeInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldRuntime.js';
import {
  migrateAboutNarrativeVersion5To6,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';
import {
  compileAboutNarrativeRuntimePlan,
  sampleAboutNarrativeRuntimePlan,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';

const canonicalV5 = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));
const canonicalV6 = migrateAboutNarrativeVersion5To6(canonicalV5);

function assertClose(actual, expected, label, tolerance = 0.00001) {
  assert.ok(
    Math.abs(Number(actual) - Number(expected)) <= tolerance,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

function seededSamples(durationWU, count = 250) {
  const samples = [0, durationWU];
  let state = 0xa341316c;
  for (let index = 0; index < count; index += 1) {
    state = ((1664525 * state) + 1013904223) >>> 0;
    samples.push((state / 0x100000000) * durationWU);
  }
  return samples;
}

function boundarySamples(keys, durationWU) {
  return keys.flatMap((key) => [key.atWU - 0.000001, key.atWU, key.atWU + 0.000001])
    .concat(durationWU)
    .map((value) => Math.max(0, Math.min(durationWU, value)));
}

test('v6 point-field compiler produces immutable states and interpolated preparation edges', () => {
  const plan = compileAboutNarrativePointFieldRuntime(canonicalV6);

  assert.equal(plan.valid, true);
  assert.equal(Object.isFrozen(plan), true);
  assert.equal(plan.keys.length, 8);
  assert.equal(plan.segments.length, 7);
  assert.deepEqual(
    plan.states.map((state) => state.stateId),
    ['world-promise', 'world-complexity', 'world-grid', 'world-emergent'],
  );
  assert.equal(plan.preparationGraph.stateNodes.length, 4);
  assert.equal(plan.preparationGraph.segmentOccurrences.length, 3);
  assert.equal(
    plan.preparationGraph.segmentOccurrences.some((occurrence) => occurrence.type === 'hold'),
    false,
  );
  assert.equal(new Set(plan.preparationGraph.stateNodes.map((node) => node.stateId)).size, 4);
  assert.equal(plan.rendererStates[0].id, plan.states[0].stateId);
  assert.equal(plan.rendererStates[0].anchorWU, plan.states[0].railAnchorWU);
  assert.equal('endWU' in plan.rendererStates[0], false);
});

test('v6 point-field sampling preserves canonical v5 destination and visual progress', () => {
  const legacyPlan = compileAboutNarrativeRuntimePlan(canonicalV5);
  const plan = compileAboutNarrativePointFieldRuntime(canonicalV6);
  assert.equal(legacyPlan.valid, true);
  assert.equal(plan.valid, true);

  const samples = [
    ...seededSamples(plan.durationWU),
    ...boundarySamples(plan.keys, plan.durationWU),
  ];
  samples.forEach((storyWU) => {
    const legacy = sampleAboutNarrativeRuntimePlan(legacyPlan, storyWU);
    const current = sampleAboutNarrativePointFieldRuntime(plan, storyWU);
    assert.equal(current.world.to.id, legacy.world.to.id, `destination at ${storyWU}`);
    if (current.world.from.stateId !== current.world.to.stateId) {
      assertClose(
        current.world.visualProgress,
        legacy.world.transitionProgress,
        `visual progress at ${storyWU}`,
      );
    }
  });

  const morph = plan.segments.find((segment) => segment.fromStateId !== segment.toStateId);
  const storyWU = morph.startWU + (morph.durationWU * 0.25);
  const sample = sampleAboutNarrativePointFieldRuntime(plan, storyWU);
  assertClose(sample.world.rawProgress, 0.25, 'raw progress');
  assertClose(
    sample.world.easedProgress,
    applyAboutNarrativeTrackEasing(morph.transition.easing, 0.25),
    'authored easing',
  );
  assertClose(
    sample.world.visualProgress,
    applyAboutNarrativeWorldTransitionEasing(morph.transition.easing, 0.25),
    'single composed visual easing',
  );
});

test('reduced motion settles each active destination and disables ambient time', () => {
  const plan = compileAboutNarrativePointFieldRuntime(canonicalV6, { motionProfile: 'reduced' });
  const transitionStarts = plan.segments
    .filter((segment) => segment.fromStateId !== segment.toStateId)
    .map((segment) => segment.startWU);

  transitionStarts.forEach((storyWU) => {
    const sample = sampleAboutNarrativePointFieldRuntime(plan, storyWU, { ambientSeconds: 42 });
    assert.equal(sample.world.to.stateId, plan.segments.find(
      (segment) => segment.startWU === storyWU,
    ).toStateId);
    assert.equal(sample.world.rawProgress, 1);
    assert.equal(sample.world.easedProgress, 1);
    assert.equal(sample.world.visualProgress, 1);
    assert.equal(sample.ambientTime, 0);
  });
});

test('equal-time keys select the outgoing destination deterministically', () => {
  const source = structuredClone(canonicalV6);
  const departure = source.tracks.pointField.keys.find(
    (key) => key.id === 'key-world-complexity-departure',
  );
  const arrival = source.tracks.pointField.keys.find(
    (key) => key.id === 'key-world-complexity-arrival',
  );
  arrival.atWU = departure.atWU;

  const plan = compileAboutNarrativePointFieldRuntime(source);
  assert.equal(plan.valid, true);
  const zeroLengthSegment = plan.segments.find((item) => item.toKeyId === arrival.id);
  assert.equal(zeroLengthSegment.zeroLength, true);
  assert.equal(
    plan.preparationGraph.segmentOccurrences.some((item) => item.id === zeroLengthSegment.id),
    false,
  );
  const before = sampleAboutNarrativePointFieldRuntime(plan, departure.atWU - 0.000001);
  const exact = sampleAboutNarrativePointFieldRuntime(plan, departure.atWU);
  assert.equal(before.world.to.stateId, 'world-promise');
  assert.equal(exact.world.to.stateId, 'world-complexity');
  assert.equal(exact.world.rawProgress, 1);
});

test('step-end keeps the source until the exact target key', () => {
  const source = structuredClone(canonicalV6);
  const segment = source.tracks.pointField.segments.find(
    (item) => item.id.includes('complexity-departure-to-key-world-complexity-arrival'),
  );
  segment.transition.type = 'step-end';
  const plan = compileAboutNarrativePointFieldRuntime(source);
  assert.equal(plan.valid, true);
  assert.equal(
    plan.preparationGraph.segmentOccurrences.some((item) => item.id === segment.id),
    false,
  );

  const compiledSegment = plan.segments.find((item) => item.id === segment.id);
  const midpoint = compiledSegment.startWU + (compiledSegment.durationWU * 0.5);
  const beforeTarget = sampleAboutNarrativePointFieldRuntime(plan, midpoint);
  const atTarget = sampleAboutNarrativePointFieldRuntime(plan, compiledSegment.endWU);
  assert.equal(beforeTarget.world.from.stateId, 'world-promise');
  assert.equal(beforeTarget.world.to.stateId, 'world-complexity');
  assert.equal(beforeTarget.world.visualProgress, 0);
  assert.equal(atTarget.world.from.stateId, 'world-complexity');
  assert.equal(atTarget.world.to.stateId, 'world-complexity');
  assert.equal(atTarget.world.visualProgress, 1);
});

test('layout profiles resolve point-field overrides without mutating the source', () => {
  const source = structuredClone(canonicalV6);
  source.profiles.mobile.overrides.pointField.stateDefinitions['world-grid'] = {
    railAnchorWU: 4.75,
  };
  const before = structuredClone(source);
  const plan = compileAboutNarrativePointFieldRuntime(source, { layoutProfile: 'mobile' });

  assert.equal(plan.valid, true);
  assert.equal(plan.states.find((state) => state.stateId === 'world-grid').railAnchorWU, 4.75);
  assert.deepEqual(source, before);
});

test('final hold and final frame remain settled without inferring a World end', () => {
  const plan = compileAboutNarrativePointFieldRuntime(canonicalV6);
  const holdStart = plan.keys.at(-2).atWU;
  const atHold = sampleAboutNarrativePointFieldRuntime(plan, holdStart, { ambientSeconds: 9 });
  const atFinal = sampleAboutNarrativePointFieldRuntime(plan, plan.durationWU, { ambientSeconds: 9 });

  assert.equal(atHold.world.from.stateId, 'world-emergent');
  assert.equal(atHold.world.to.stateId, 'world-emergent');
  assert.equal(atHold.world.transition.type, 'hold');
  assert.equal(atHold.world.transition.correspondence, null);
  assert.equal(atHold.world.visualProgress, 1);
  assert.equal(atFinal.world.from.stateId, 'world-emergent');
  assert.equal(atFinal.world.to.stateId, 'world-emergent');
  assert.equal(atFinal.world.segmentId, '');
  assert.equal(atFinal.world.visualProgress, 1);
  assert.equal(atFinal.ambientTime, 9);
  assert.equal('endWU' in atFinal.world.to, false);
});

test('incoming emergent segment owns its absolute-target interaction', () => {
  const plan = compileAboutNarrativePointFieldRuntime(canonicalV6);
  const atStart = sampleAboutNarrativePointFieldRuntime(plan, 16.15);
  const afterActivation = sampleAboutNarrativePointFieldRuntime(plan, 16.25);

  assert.equal(atStart.world.to.stateId, 'world-emergent');
  assert.equal(atStart.interactions.activeInteraction?.id, 'interaction-emergent-ripple');
  assert.equal(atStart.interactions.interactionActivated, false);
  assert.equal(afterActivation.interactions.activeInteraction?.targetStateId, 'world-emergent');
  assert.equal(afterActivation.interactions.interactionActivated, true);
});

test('absolute interactions may begin before their target state becomes the segment destination', () => {
  const source = structuredClone(canonicalV6);
  const interaction = source.tracks.interactions.clips.find((clip) => (
    clip.id === 'interaction-emergent-ripple'
  ));
  interaction.startWU = 15.5;
  const plan = compileAboutNarrativePointFieldRuntime(source);
  assert.equal(plan.valid, true);

  const preparedEarly = sampleAboutNarrativePointFieldRuntime(plan, 15.75);
  assert.ok(preparedEarly.interactions.activeClipIds.includes(interaction.id));
  assert.notEqual(preparedEarly.interactions.activeInteraction?.id, interaction.id);

  const targetIncoming = sampleAboutNarrativePointFieldRuntime(plan, 16.15);
  assert.equal(targetIncoming.world.to.stateId, interaction.targetStateId);
  assert.equal(targetIncoming.interactions.activeInteraction?.id, interaction.id);
});

test('sampleInto reuses the complete caller-owned frame graph', () => {
  const plan = compileAboutNarrativePointFieldRuntime(canonicalV6);
  const target = createAboutNarrativePointFieldFrameSample();
  const identities = {
    frame: target,
    world: target.world,
    transition: target.world.transition,
    stagger: target.world.transition.stagger,
    path: target.world.transition.path,
    flatten: target.world.transition.flatten,
    interactions: target.interactions,
    active: target.interactions.activeClipIds,
    activated: target.interactions.activatedClipIds,
  };

  seededSamples(plan.durationWU, 600).forEach((storyWU, index) => {
    const result = sampleAboutNarrativePointFieldRuntimeInto(
      plan,
      storyWU,
      target,
      { ambientSeconds: index / 60 },
    );
    assert.equal(result, identities.frame);
    assert.equal(result.world, identities.world);
    assert.equal(result.world.transition, identities.transition);
    assert.equal(result.world.transition.stagger, identities.stagger);
    assert.equal(result.world.transition.path, identities.path);
    assert.equal(result.world.transition.flatten, identities.flatten);
    assert.equal(result.interactions, identities.interactions);
    assert.equal(result.interactions.activeClipIds, identities.active);
    assert.equal(result.interactions.activatedClipIds, identities.activated);
  });
});

test('compiler rejects missing targets and discipline-incompatible destination states', () => {
  const missing = structuredClone(canonicalV6);
  missing.tracks.interactions.clips[0].targetStateId = 'missing-state';
  const missingPlan = compileAboutNarrativePointFieldRuntime(missing);
  assert.equal(missingPlan.valid, false);
  assert.equal(missingPlan.diagnostics.some((item) => item.code === 'interaction-target'), true);

  const incompatible = structuredClone(canonicalV6);
  const discipline = incompatible.tracks.interactions.clips[0];
  discipline.startWU = 18.5;
  discipline.activationWU = 18.5;
  discipline.endWU = 18.8;
  discipline.targetStateId = 'world-emergent';
  const incompatiblePlan = compileAboutNarrativePointFieldRuntime(incompatible);
  assert.equal(incompatiblePlan.valid, false);
  assert.equal(
    incompatiblePlan.diagnostics.some((item) => (
      item.code === 'point-field-discipline-capability'
      || item.code === 'v5-projection-discipline-motion-world'
    )),
    true,
  );
});
