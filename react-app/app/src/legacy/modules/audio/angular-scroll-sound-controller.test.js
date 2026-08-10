import assert from 'node:assert/strict';
import test from 'node:test';
import { createAngularScrollSoundController } from './angular-scroll-sound-controller.js';

function createRecorder(options = {}) {
  const events = [];
  const controller = createAngularScrollSoundController({
    source: 'continuity-rotation',
    ...options,
    playDetent: (event) => {
      events.push(event);
      return true;
    },
  });
  return { controller, events };
}

test('angular travel uses the Scroll Crystal speed response', () => {
  const slow = createRecorder();
  const fast = createRecorder();

  for (let step = 1; step <= 30; step += 1) {
    slow.controller.sampleAngularDelta(0.02, step * 40);
    fast.controller.sampleAngularDelta(0.16, step * 40);
  }

  assert.ok(slow.events.length > 0);
  assert.ok(fast.events.length > slow.events.length);
  assert.ok(fast.events.at(-1).speedNorm > slow.events.at(-1).speedNorm);
  assert.equal(fast.events.at(-1).source, 'continuity-rotation');
});

test('reset prevents a new spin gesture from sounding on its first sample', () => {
  const { controller, events } = createRecorder();
  controller.sampleAngularDelta(0.1, 100);
  controller.sampleAngularDelta(0.4, 160);
  assert.equal(events.length, 1);

  controller.reset();
  controller.sampleAngularDelta(1.2, 220);
  assert.equal(events.length, 1);
});

test('invalid or stationary samples remain silent', () => {
  const { controller, events } = createRecorder();
  assert.equal(controller.sampleAngularDelta(Number.NaN, 100), false);
  assert.equal(controller.sampleAngularDelta(0, 120), false);
  assert.equal(events.length, 0);
});
