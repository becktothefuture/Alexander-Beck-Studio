import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getScrollElementProgress,
  resolveScrollProgressIndicatorState,
  SCROLL_PROGRESS_INDICATOR_ACTIVE_TICK_COUNT,
  SCROLL_PROGRESS_INDICATOR_TICK_COUNT,
} from './scroll-progress-indicator.js';

test('the shared About and Portfolio tracker moves two active ticks across eighteen positions', () => {
  assert.equal(SCROLL_PROGRESS_INDICATOR_TICK_COUNT, 18);
  assert.equal(SCROLL_PROGRESS_INDICATOR_ACTIVE_TICK_COUNT, 2);
  assert.deepEqual(resolveScrollProgressIndicatorState(0), {
    progress: 0,
    progressValue: 0,
    activeStartIndex: 0,
    tickCount: 18,
    activeTickCount: 2,
  });
  assert.equal(resolveScrollProgressIndicatorState(0.5).activeStartIndex, 8);
  assert.equal(resolveScrollProgressIndicatorState(1).activeStartIndex, 16);
});

test('project progress is normalized to each drawer scroll extent', () => {
  assert.equal(getScrollElementProgress({ scrollTop: 0, scrollHeight: 2400, clientHeight: 800 }), 0);
  assert.equal(getScrollElementProgress({ scrollTop: 800, scrollHeight: 2400, clientHeight: 800 }), 0.5);
  assert.equal(getScrollElementProgress({ scrollTop: 1600, scrollHeight: 2400, clientHeight: 800 }), 1);
  assert.equal(getScrollElementProgress({ scrollTop: 200, scrollHeight: 800, clientHeight: 800 }), 1);
  assert.equal(getScrollElementProgress({ scrollTop: 200, scrollHeight: 0, clientHeight: 0 }), 0);
});
