import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createAboutNarrativeCameraPointerPanController,
  createAboutNarrativeCameraPointerPanSample,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraPointerPan.js';
import {
  createAboutNarrativeCameraSteadycamController,
  createAboutNarrativeCameraSteadycamSample,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraSteadycam.js';

function sampleRepeatedly(controller, sample, startMs, count, stepMs, options = {}) {
  for (let index = 1; index <= count; index += 1) {
    const returned = controller.sampleInto(
      sample,
      startMs + (index * stepMs),
      Boolean(options.reducedMotion),
      Boolean(options.hidden),
      options.finePointer !== false,
    );
    assert.equal(returned, sample, 'Sampling must preserve the caller-owned object.');
  }
}

test('mouse position produces a small, damped local look offset', () => {
  const controller = createAboutNarrativeCameraPointerPanController({ initialNowMs: 0 });
  const sample = createAboutNarrativeCameraPointerPanSample();
  controller.setViewport(0, 0, 1000, 500);
  controller.configure({ pointerPanDegrees: 4, pointerPanResponseMs: 620 });
  controller.setPointerFromClient(1000, 250, 'mouse', 0);
  controller.sampleInto(sample, 100, false, false, true);
  assert(sample.active);
  assert(sample.x > 0 && sample.x < 1);
  assert(sample.yawDegrees < 0 && sample.yawDegrees > -4);
  assert.equal(sample.pitchDegrees, 0);
  sampleRepeatedly(controller, sample, 100, 12, 100);
  assert(sample.x > 0.99);
  assert(Math.abs(sample.yawDegrees + 4) < 0.04);
});

test('upward mouse travel pitches up and pointer exit returns gently to centre', () => {
  const controller = createAboutNarrativeCameraPointerPanController({ initialNowMs: 0 });
  const sample = createAboutNarrativeCameraPointerPanSample();
  controller.setViewport(100, 50, 800, 400);
  controller.configure({ pointerPanDegrees: 3, pointerPanResponseMs: 400 });
  controller.setPointerFromClient(500, 50, 'mouse', 0);
  sampleRepeatedly(controller, sample, 0, 8, 100);
  assert(sample.pitchDegrees > 2.9);
  controller.setPointerOutside('mouse');
  controller.sampleInto(sample, 900, false, false, true);
  assert(sample.pitchDegrees > 0 && sample.pitchDegrees < 2.9);
  sampleRepeatedly(controller, sample, 900, 8, 100);
  assert(Math.abs(sample.pitchDegrees) < 0.001);
});

test('response control changes settling speed', () => {
  const fast = createAboutNarrativeCameraPointerPanController({ initialNowMs: 0 });
  const slow = createAboutNarrativeCameraPointerPanController({ initialNowMs: 0 });
  const fastSample = createAboutNarrativeCameraPointerPanSample();
  const slowSample = createAboutNarrativeCameraPointerPanSample();
  for (const controller of [fast, slow]) {
    controller.setViewport(0, 0, 1000, 500);
    controller.setPointerNdc(1, 0, 'mouse', 0);
  }
  fast.configure({ pointerPanDegrees: 4, pointerPanResponseMs: 80 });
  slow.configure({ pointerPanDegrees: 4, pointerPanResponseMs: 2000 });
  fast.sampleInto(fastSample, 50, false, false, true);
  slow.sampleInto(slowSample, 50, false, false, true);
  assert(Math.abs(fastSample.yawDegrees) > Math.abs(slowSample.yawDegrees) * 4);
});

test('mouse-down holds the current pan without moving the camera', () => {
  const controller = createAboutNarrativeCameraPointerPanController({ initialNowMs: 0 });
  const sample = createAboutNarrativeCameraPointerPanSample();
  controller.configure({ pointerPanDegrees: 4, pointerPanResponseMs: 400 });
  controller.setPointerNdc(1, 0, 'mouse', 0);
  sampleRepeatedly(controller, sample, 0, 8, 100);
  const heldYaw = sample.yawDegrees;
  const heldPitch = sample.pitchDegrees;

  controller.setPointerNdc(-1, 1, 'mouse', 1);
  sampleRepeatedly(controller, sample, 800, 4, 100);
  assert.equal(sample.yawDegrees, heldYaw);
  assert.equal(sample.pitchDegrees, heldPitch);

  controller.setPointerNdc(-1, 1, 'mouse', 0);
  controller.sampleInto(sample, 1300, false, false, true);
  assert(sample.yawDegrees > heldYaw);
  assert(sample.pitchDegrees > heldPitch);
});

test('reduced motion, hidden pages, coarse pointers, touch, and dragging resolve to zero', () => {
  const cases = [
    { reducedMotion: true },
    { hidden: true },
    { finePointer: false },
  ];
  for (const options of cases) {
    const controller = createAboutNarrativeCameraPointerPanController({ initialNowMs: 0 });
    const sample = createAboutNarrativeCameraPointerPanSample();
    controller.configure({ pointerPanDegrees: 4, pointerPanResponseMs: 620 });
    controller.setPointerNdc(1, 1, 'mouse', 0);
    controller.sampleInto(
      sample,
      100,
      Boolean(options.reducedMotion),
      Boolean(options.hidden),
      options.finePointer !== false,
    );
    assert.deepEqual(sample, {
      active: false,
      x: 0,
      y: 0,
      yawDegrees: 0,
      pitchDegrees: 0,
    });
  }

  const controller = createAboutNarrativeCameraPointerPanController({ initialNowMs: 0 });
  const sample = createAboutNarrativeCameraPointerPanSample();
  controller.configure({ pointerPanDegrees: 4, pointerPanResponseMs: 620 });
  controller.setPointerNdc(1, 1, 'touch', 0);
  controller.sampleInto(sample, 100, false, false, true);
  assert.equal(sample.active, false);
  controller.setPointerNdc(1, 1, 'mouse', 1);
  controller.sampleInto(sample, 200, false, false, true);
  assert.equal(sample.active, false);
});

test('steadycam damps position and orientation with one coherent response', () => {
  const controller = createAboutNarrativeCameraSteadycamController({ initialNowMs: 0 });
  const sample = createAboutNarrativeCameraSteadycamSample();
  controller.configure({ steadycamResponseMs: 400 });
  controller.sampleInto(sample, [0, 0, 0], [0, 0, 0, 1], 0);
  const returned = controller.sampleInto(
    sample,
    [10, 4, -20],
    [0, Math.SQRT1_2, 0, Math.SQRT1_2],
    50,
  );
  assert.equal(returned, sample, 'Sampling must preserve the caller-owned object.');
  assert(sample.position[0] > 0 && sample.position[0] < 10);
  assert(sample.position[1] > 0 && sample.position[1] < 4);
  assert(sample.position[2] < 0 && sample.position[2] > -20);
  assert(sample.quaternion[1] > 0 && sample.quaternion[1] < Math.SQRT1_2);
  assert(sample.quaternion[3] > Math.SQRT1_2 && sample.quaternion[3] < 1);
});

test('steadycam response is configurable and reduced motion snaps to the authored camera', () => {
  const fast = createAboutNarrativeCameraSteadycamController({ initialNowMs: 0 });
  const slow = createAboutNarrativeCameraSteadycamController({ initialNowMs: 0 });
  const fastSample = createAboutNarrativeCameraSteadycamSample();
  const slowSample = createAboutNarrativeCameraSteadycamSample();
  const startPosition = [0, 0, 0];
  const startQuaternion = [0, 0, 0, 1];
  const endPosition = [10, 0, -10];
  const endQuaternion = [0, Math.SQRT1_2, 0, Math.SQRT1_2];
  fast.configure({ steadycamResponseMs: 80 });
  slow.configure({ steadycamResponseMs: 1200 });
  fast.sampleInto(fastSample, startPosition, startQuaternion, 0);
  slow.sampleInto(slowSample, startPosition, startQuaternion, 0);
  fast.sampleInto(fastSample, endPosition, endQuaternion, 50);
  slow.sampleInto(slowSample, endPosition, endQuaternion, 50);
  assert(fastSample.position[0] > slowSample.position[0] * 4);
  assert(fastSample.quaternion[1] > slowSample.quaternion[1] * 4);

  slow.sampleInto(slowSample, endPosition, endQuaternion, 100, true);
  assert.deepEqual(slowSample.position, endPosition);
  assert.deepEqual(slowSample.quaternion, endQuaternion);
});
