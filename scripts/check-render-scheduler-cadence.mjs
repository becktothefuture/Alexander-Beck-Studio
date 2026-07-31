#!/usr/bin/env node

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  advanceFrameScheduler,
  FRAME_INTERVAL_TOLERANCE_MS,
} from '../react-app/app/src/legacy/modules/rendering/frame-scheduler.js';

const TARGET_FPS = 60;

function simulateCadence({ durationMs, intervals, targetFps = TARGET_FPS }) {
  let accepted = 0;
  let callbackCount = 0;
  let lastFrameTime = 0;
  let nowMs = 0;

  while (nowMs < durationMs) {
    nowMs += intervals[callbackCount % intervals.length];
    callbackCount += 1;
    const nextFrameTime = advanceFrameScheduler(lastFrameTime, nowMs, targetFps);
    if (nextFrameTime !== null) {
      lastFrameTime = nextFrameTime;
      accepted += 1;
    }
  }

  return { accepted, callbackCount, durationMs: nowMs };
}

test('120 Hz callbacks with deterministic jitter stay bounded near a 60 FPS target', () => {
  const sample = simulateCadence({
    durationMs: 5000,
    intervals: [8.15, 8.5, 8.22, 8.46],
  });
  const idealAccepted = sample.durationMs / (1000 / TARGET_FPS);

  assert.ok(sample.callbackCount >= 599, `expected about 600 callbacks, got ${sample.callbackCount}`);
  assert.ok(sample.accepted >= Math.floor(idealAccepted) - 1, `accepted cadence fell too low: ${sample.accepted}`);
  assert.ok(sample.accepted <= Math.ceil(idealAccepted) + 1, `accepted cadence exceeded target: ${sample.accepted}`);
});

test('an early callback accepted by tolerance cannot make the next 120 Hz callback eligible', () => {
  const interval = 1000 / TARGET_FPS;
  const earlyNow = interval - (FRAME_INTERVAL_TOLERANCE_MS / 2);
  const early = advanceFrameScheduler(0, earlyNow, TARGET_FPS);
  const next = advanceFrameScheduler(early, earlyNow + (interval / 2), TARGET_FPS);

  assert.equal(early, earlyNow, 'early acceptance must consume the tolerance credit');
  assert.equal(next, null, 'the following half-interval callback must be rejected');
});

test('ordinary 60 Hz callbacks do not collapse to 30 FPS', () => {
  const sample = simulateCadence({
    durationMs: 5000,
    intervals: [16.2, 17.1, 16.6, 16.75],
  });

  assert.ok(sample.accepted >= 299, `expected about 300 accepted frames, got ${sample.accepted}`);
  assert.equal(sample.accepted, sample.callbackCount, 'normal 60 Hz jitter should not reject alternating callbacks');
});

test('a truly late callback carries its remainder to prevent drift', () => {
  const interval = 1000 / TARGET_FPS;
  const late = advanceFrameScheduler(0, 20, TARGET_FPS);
  const recovered = advanceFrameScheduler(late, (interval * 2) + 0.05, TARGET_FPS);

  assert.ok(Math.abs(late - interval) < 1e-9, `late remainder was not carried: ${late}`);
  assert.notEqual(recovered, null, 'carried remainder should preserve the target cadence after a late frame');
});

test('dynamic target changes use the current interval without stale tolerance credit', () => {
  const sixtyInterval = 1000 / 60;
  const first = advanceFrameScheduler(0, sixtyInterval - 0.25, 60);
  const slowerRejected = advanceFrameScheduler(first, first + 17, 30);
  const slowerAccepted = advanceFrameScheduler(first, first + (1000 / 30) - 0.25, 30);
  const fasterAccepted = advanceFrameScheduler(
    slowerAccepted,
    slowerAccepted + sixtyInterval - 0.25,
    60,
  );

  assert.notEqual(first, null);
  assert.equal(slowerRejected, null);
  assert.notEqual(slowerAccepted, null);
  assert.notEqual(fasterAccepted, null);
});

const sixtyHz = simulateCadence({ durationMs: 5000, intervals: [16.2, 17.1, 16.6, 16.75] });
const highRefresh = simulateCadence({ durationMs: 5000, intervals: [8.15, 8.5, 8.22, 8.46] });
const lateFrames = simulateCadence({ durationMs: 5000, intervals: [20] });

console.log(JSON.stringify({
  acceptedCounts: {
    sixtyHz: sixtyHz.accepted,
    highRefresh120HzJitter: highRefresh.accepted,
    late50HzCallbacks: lateFrames.accepted,
  },
}, null, 2));
