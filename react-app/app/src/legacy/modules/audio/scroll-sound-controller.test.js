import assert from 'node:assert/strict';
import test from 'node:test';
import { createScrollSoundController } from './scroll-sound-controller.js';

function createRecorder(options = {}) {
  const events = [];
  const controller = createScrollSoundController({
    ...options,
    playDetent: (event) => {
      events.push(event);
      return true;
    },
  });
  return { controller, events };
}

test('primes silently and ignores movement below the audible speed threshold', () => {
  const { controller, events } = createRecorder();
  controller.samplePosition(0, 0, 100);
  controller.samplePosition(0, 1, 200);
  controller.samplePosition(0, 2, 300);
  assert.equal(events.length, 0);
});

test('stays silent when a route does not provide an audio renderer', () => {
  const controller = createScrollSoundController({ playDetent: null });
  controller.samplePosition(0, 0, 100);
  assert.doesNotThrow(() => controller.samplePosition(0, 100, 160));
});

test('fast movement creates denser, brighter detents than slow movement', () => {
  const slow = createRecorder();
  const fast = createRecorder();
  slow.controller.samplePosition(0, 0, 100);
  fast.controller.samplePosition(0, 0, 100);

  for (let step = 1; step <= 30; step += 1) {
    const at = 100 + (step * 40);
    slow.controller.samplePosition(0, step * 5, at);
    fast.controller.samplePosition(0, step * 40, at);
  }

  assert.ok(slow.events.length > 0);
  assert.ok(fast.events.length > slow.events.length * 2);
  assert.ok(fast.events.at(-1).speedNorm > slow.events.at(-1).speedNorm);
  assert.ok(fast.events.every((event) => event.speedNorm >= 0 && event.speedNorm <= 1));
});

test('caps dense input to one detent per sample and respects the interval', () => {
  const { controller, events } = createRecorder();
  controller.samplePosition(0, 0, 100);
  for (let step = 1; step <= 20; step += 1) {
    controller.samplePosition(0, step * 100, 100 + (step * 5));
  }
  assert.ok(events.length <= 3);
});

test('reset prevents a route or modal jump from becoming a detent', () => {
  const { controller, events } = createRecorder();
  controller.samplePosition(0, 0, 100);
  controller.samplePosition(0, 80, 160);
  assert.equal(events.length, 1);
  controller.reset();
  controller.samplePosition(0, 1200, 220);
  assert.equal(events.length, 1);
});
