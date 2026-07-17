import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ABOUT_NARRATIVE_BUST_STATES,
  createAboutNarrativeBustController,
} from '../src/routes/about-narrative-lab/aboutNarrativeBustController.js';
import {
  ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT,
  ABOUT_NARRATIVE_ANCHOR_SAMPLING_UNSUPPORTED,
  getAboutNarrativeAnchorSamplingCapability,
  inspectAboutNarrativeAnchorSampling,
  sampleAboutNarrativeAnchorPosition,
} from '../src/routes/about-narrative-lab/aboutNarrativeModifierSampling.js';

const identity = [
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
];

function createSamplingInput(overrides = {}) {
  return {
    fromPosition: [0, 0, 0],
    toPosition: [0, 0, 0],
    fromTransform: identity,
    toTransform: identity,
    fromWorldScratch: { x: 0, y: 0, z: 0 },
    toWorldScratch: { x: 0, y: 0, z: 0 },
    fromDrift: {},
    toDrift: {},
    fromWave: {},
    toWave: {},
    ...overrides,
  };
}

test('bust holds one yaw through forward and reverse formation boundaries', () => {
  const controller = createAboutNarrativeBustController();
  controller.sample({ active: true, transitionProgress: 1, liveAmbient: true });
  controller.sample({ active: true, transitionProgress: 1, liveAmbient: true, deltaSeconds: 2, speed: 0.1 });
  assert.equal(controller.state, ABOUT_NARRATIVE_BUST_STATES.AUTO_ROTATING);
  assert.equal(controller.yaw, 0.2);

  controller.sample({ active: true, transitionProgress: 0.8, liveAmbient: true });
  const capturedYaw = controller.yaw;
  assert.equal(controller.state, ABOUT_NARRATIVE_BUST_STATES.FORMING);
  controller.sample({ active: true, transitionProgress: 0.2, liveAmbient: true, deltaSeconds: 4, speed: 1 });
  assert.equal(controller.yaw, capturedYaw);
  controller.sample({ active: true, transitionProgress: 1, liveAmbient: true, resumeDelay: 0 });
  assert.ok(Math.abs(controller.yaw - capturedYaw) <= 0.003);
});

test('cold direct seek is front-facing and deterministic scrubbing never advances yaw', () => {
  const controller = createAboutNarrativeBustController();
  controller.sample({ active: true, transitionProgress: 1, deltaSeconds: 8, speed: 1 });
  assert.equal(controller.state, ABOUT_NARRATIVE_BUST_STATES.SETTLED);
  assert.equal(controller.yaw, 0);
  controller.sample({
    active: true,
    transitionProgress: 1,
    deltaSeconds: 8,
    speed: 1,
    deterministicScrub: true,
  });
  assert.equal(controller.yaw, 0);
});

test('auto rotation, hidden pages, reduced motion, and resume delay are separated', () => {
  const controller = createAboutNarrativeBustController();
  controller.sample({ active: true, transitionProgress: 0.8 });
  controller.sample({ active: true, transitionProgress: 1, resumeDelay: 1 });
  assert.equal(controller.state, ABOUT_NARRATIVE_BUST_STATES.RESUME_DELAY);
  controller.sample({ active: true, transitionProgress: 1, resumeDelay: 1, deltaSeconds: 0.5, speed: 0.2 });
  assert.equal(controller.yaw, 0);
  controller.sample({ active: true, transitionProgress: 1, resumeDelay: 1, deltaSeconds: 0.5, speed: 0.2 });
  assert.equal(controller.state, ABOUT_NARRATIVE_BUST_STATES.AUTO_ROTATING);
  assert.equal(controller.yaw, 0.1);

  controller.sample({ active: true, transitionProgress: 1, hidden: true, deltaSeconds: 10, speed: 1 });
  assert.equal(controller.state, ABOUT_NARRATIVE_BUST_STATES.SETTLED);
  assert.equal(controller.yaw, 0.1);
  controller.sample({ active: true, transitionProgress: 1, reducedMotion: true, deltaSeconds: 10, speed: 1 });
  assert.equal(controller.state, ABOUT_NARRATIVE_BUST_STATES.SETTLED);
  assert.equal(controller.yaw, 0.1);
});

test('settled bust supports drag and keyboard while leaving clears interaction state', () => {
  const controller = createAboutNarrativeBustController();
  controller.sample({ active: true, transitionProgress: 1, reducedMotion: true, resumeDelay: 1 });
  assert.equal(controller.beginDrag({ pointerId: 7, x: 100, width: 400, sensitivity: 1 }), true);
  assert.equal(controller.state, ABOUT_NARRATIVE_BUST_STATES.DRAGGING);
  assert.equal(controller.dragTo({ pointerId: 7, x: 200 }), true);
  assert.ok(Math.abs(controller.yaw - (Math.PI / 2)) < 1e-12);
  assert.equal(controller.endDrag({ pointerId: 7 }), true);
  assert.equal(controller.rotateByKeyboard('left'), true);
  assert.ok(Math.abs(controller.yaw - ((Math.PI / 2) - 0.16)) < 1e-12);
  controller.leave();
  assert.equal(controller.state, ABOUT_NARRATIVE_BUST_STATES.OUTSIDE);
  assert.equal(controller.yaw, 0);
  assert.equal(controller.dragTo({ pointerId: 7, x: 300 }), false);
});

test('modifier capability inspection declares exact and unsupported behavior', () => {
  assert.equal(
    getAboutNarrativeAnchorSamplingCapability('living-wave-v1'),
    ABOUT_NARRATIVE_ANCHOR_SAMPLING_EXACT,
  );
  assert.equal(
    getAboutNarrativeAnchorSamplingCapability('future-unknown-v1'),
    ABOUT_NARRATIVE_ANCHOR_SAMPLING_UNSUPPORTED,
  );
  const target = { capability: '', unsupportedCount: 0, unsupported: [] };
  inspectAboutNarrativeAnchorSampling([
    { id: 'ambient-drift-v1', enabled: true },
    { id: 'future-unknown-v1', enabled: true },
    { id: 'ignored-v1', enabled: false },
  ], target);
  assert.equal(target.capability, ABOUT_NARRATIVE_ANCHOR_SAMPLING_UNSUPPORTED);
  assert.equal(target.unsupportedCount, 1);
  assert.deepEqual(target.unsupported, ['future-unknown-v1']);
});

test('anchor sampler mirrors morph, transforms, and bust yaw order', () => {
  const target = { x: 0, y: 0, z: 0 };
  const translated = [...identity];
  translated[12] = 10;
  sampleAboutNarrativeAnchorPosition(createSamplingInput({
    fromPosition: [1, 2, 0],
    toPosition: [0, 4, 2],
    toTransform: translated,
    morphProgress: 0.5,
    bustYaw: Math.PI / 2,
    fromBust: 1,
    toBust: 0,
  }), target);
  // smoothstep(0.5) = 0.5; rotated from [1,2,0] is [0,2,-1].
  assert.ok(Math.abs(target.x - 5) < 1e-12);
  assert.ok(Math.abs(target.y - 3) < 1e-12);
  assert.ok(Math.abs(target.z - 0.5) < 1e-12);
});

test('anchor sampler mirrors drift, wave, and grid displacement formulas', () => {
  const target = { x: 0, y: 0, z: 0 };
  const input = createSamplingInput({
    fromPosition: [1, 2, 3],
    toPosition: [1, 2, 3],
    pointSeed: 0,
    storyTime: 0,
    ambientTime: 0,
    fromDrift: {
      amplitude: 0.5,
      speed: 1,
      irregularity: 0,
      individuality: 0,
      axisSpread: 1,
      storyMix: 0,
    },
    toDrift: {
      amplitude: 0.5,
      speed: 1,
      irregularity: 0,
      individuality: 0,
      axisSpread: 1,
      storyMix: 0,
    },
    fromWave: { weight: 1, amplitude: 0.25, speed: 0, frequencyX: 1, frequencyZ: 1 },
    toWave: { weight: 1, amplitude: 0.25, speed: 0, frequencyX: 1, frequencyZ: 1 },
    fromGroupStrength: 1,
    toGroupStrength: 1,
    gridInfluence: 0.5,
  });
  sampleAboutNarrativeAnchorPosition(input, target);

  // seed/time zero: smooth drift = [0, 0, 1]. Wave and grid then use displaced coordinates.
  const expectedX = 1;
  const expectedY = 2 + (0.25 * Math.sin(1 + 3.5));
  const expectedZ = 3.5 + (0.5 * 0.22 * Math.sin((expectedX * 0.82) + (expectedY * 0.54)));
  assert.ok(Math.abs(target.x - expectedX) < 1e-12);
  assert.ok(Math.abs(target.y - expectedY) < 1e-12);
  assert.ok(Math.abs(target.z - expectedZ) < 1e-12);
});

test('anchor sampler requires caller-owned scratch and output targets', () => {
  assert.throws(() => sampleAboutNarrativeAnchorPosition({}, null), /caller-owned target/i);
  assert.throws(
    () => sampleAboutNarrativeAnchorPosition({ fromPosition: [0, 0, 0] }, { x: 0, y: 0, z: 0 }),
    /scratch targets/i,
  );
});
