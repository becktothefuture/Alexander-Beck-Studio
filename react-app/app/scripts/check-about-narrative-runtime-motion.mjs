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

test('bust sampling reuses caller input and one stable snapshot for 600 hot frames', () => {
  const controller = createAboutNarrativeBustController();
  const input = {
    active: true,
    transitionProgress: 1,
    deltaSeconds: 0,
    speed: 0.04,
    resumeDelay: 0,
    liveAmbient: false,
    deterministicScrub: true,
    reducedMotion: false,
    hidden: false,
  };
  const snapshot = controller.sample(input);
  for (let index = 0; index < 600; index += 1) {
    assert.equal(controller.sample(input), snapshot);
  }
  assert.equal(controller.yaw, 0);
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

test('bust correspondence resolves progressively from its lowest points upward', () => {
  const low = { x: 0, y: 0, z: 0 };
  const high = { x: 0, y: 0, z: 0 };
  const base = {
    fromPosition: [0, 0, 0],
    morphProgress: 0.42,
    fromBust: 0,
    toBust: 1,
  };
  sampleAboutNarrativeAnchorPosition(createSamplingInput({
    ...base,
    toPosition: [1, -0.75, 0],
  }), low);
  sampleAboutNarrativeAnchorPosition(createSamplingInput({
    ...base,
    toPosition: [1, 0.75, 0],
  }), high);
  assert.ok(low.x > high.x, 'Lower bust points must advance before upper points.');
  assert.ok(Math.abs(low.y + 0.75) < Math.abs(high.y - 0.75));
});

test('anchor sampler mirrors drift and wave without moving the grid', () => {
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

  // seed/time zero: smooth drift = [0, 0, 1]. Wave uses the displaced position.
  const expectedX = 1;
  const expectedY = 2 + (0.25 * Math.sin(1 + 3.5));
  const expectedZ = 3.5;
  assert.ok(Math.abs(target.x - expectedX) < 1e-12);
  assert.ok(Math.abs(target.y - expectedY) < 1e-12);
  assert.ok(Math.abs(target.z - expectedZ) < 1e-12);
});

test('grid displacement remains still when ambient time advances at a fixed story position', () => {
  const input = createSamplingInput({
    fromPosition: [1, 2, 3],
    toPosition: [1, 2, 3],
    fromGroupStrength: 1,
    toGroupStrength: 1,
    gridInfluence: 0.5,
    storyTime: 4,
  });
  const before = { x: 0, y: 0, z: 0 };
  const after = { x: 0, y: 0, z: 0 };
  input.ambientTime = 0;
  sampleAboutNarrativeAnchorPosition(input, before);
  input.ambientTime = 120;
  sampleAboutNarrativeAnchorPosition(input, after);
  assert.deepEqual(after, before);
});

test('grid ripple perpetually radiates from its center on ambient time alone', () => {
  const first = { x: 0, y: 0, z: 0 };
  const second = { x: 0, y: 0, z: 0 };
  const input = createSamplingInput({
    fromPosition: [1, 2, 3],
    toPosition: [1, 2, 3],
    gridRipple: {
      weight: 1,
      amplitude: 1.5,
      speed: 4,
      frequency: 2,
      centerX: -4,
      centerZ: 5,
      storyMix: 0,
      progress: 0,
    },
    storyTime: 0.75,
    ambientTime: 12,
  });
  sampleAboutNarrativeAnchorPosition(input, first);
  const ripplePointX = 1 - input.gridRipple.centerX;
  const ripplePointZ = 3 - input.gridRipple.centerZ;
  const rippleDistance = Math.hypot(ripplePointX, ripplePointZ);
  const ripplePhase = input.ambientTime * input.gridRipple.speed * 6.2831853;
  const radialRipple = Math.sin((rippleDistance * input.gridRipple.frequency) - ripplePhase);
  const harmonicRipple = Math.sin(
    (rippleDistance * input.gridRipple.frequency * 0.52) - (ripplePhase * 0.72),
  );
  const centerPulse = Math.cos(ripplePhase) * Math.exp(-rippleDistance * 0.42);
  const rippleFalloff = 1 / (1 + (rippleDistance * 0.035));
  const rippleStrength = input.gridRipple.weight * input.gridRipple.amplitude;
  const radialDisplacement = rippleStrength * radialRipple * rippleFalloff * 0.34;
  assert.ok(Math.abs(first.x - (1 + ((ripplePointX / rippleDistance) * radialDisplacement))) < 1e-9);
  assert.ok(Math.abs(first.y - (2 + (rippleStrength * (
    ((radialRipple * 0.72) + (harmonicRipple * 0.2) + (centerPulse * 0.34)) * rippleFalloff
  )))) < 1e-9);
  assert.ok(Math.abs(first.z - (3 + ((ripplePointZ / rippleDistance) * radialDisplacement))) < 1e-9);
  input.storyTime = 8.1;
  sampleAboutNarrativeAnchorPosition(input, second);
  assert.deepEqual(second, first, 'Story progress must not move an ambient ripple.');
  input.ambientTime = 12.15;
  sampleAboutNarrativeAnchorPosition(input, second);
  assert.notEqual(first.x, 1);
  assert.notEqual(first.z, 3);
  assert.notEqual(second.x, first.x);
  assert.notEqual(second.z, first.z);
  assert.notEqual(first.y, 2);
  assert.notEqual(second.y, first.y);

  input.gridRipple.weight = 0;
  sampleAboutNarrativeAnchorPosition(input, second);
  assert.deepEqual(second, { x: 1, y: 2, z: 3 });
});

test('anchor sampler requires caller-owned scratch and output targets', () => {
  assert.throws(() => sampleAboutNarrativeAnchorPosition({}, null), /caller-owned target/i);
  assert.throws(
    () => sampleAboutNarrativeAnchorPosition({ fromPosition: [0, 0, 0] }, { x: 0, y: 0, z: 0 }),
    /scratch targets/i,
  );
});
