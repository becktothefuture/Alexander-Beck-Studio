import assert from 'node:assert/strict';
import test from 'node:test';
import {
  boardSceneActivity,
  boardShouldKeepMachineWarm,
  boardOwnsMountedSurface,
  createBoardFramePacer,
} from '../react-app/app/src/routes/about-game-board/boardSceneLifecycle.js';

const scene = {
  viewportHeight: 800,
  worldBottom: 8600,
  stageTop: 8000,
  stageHeight: 4160,
  spatialReady: true,
};

test('queued work rejects detached route refs but accepts a mounted keyed canvas', () => {
  const route = { isConnected: true };
  const originalCanvas = { isConnected: true };
  assert.equal(boardOwnsMountedSurface(route, route, originalCanvas), true);

  // Unmount clears refs before passive effect cleanup. A queued frame must
  // stop here rather than replace its captured canvas with null and measure it.
  assert.equal(boardOwnsMountedSurface(route, null, null), false);
  assert.equal(boardOwnsMountedSurface(route, route, null), false);
  assert.equal(boardOwnsMountedSurface(route, route, { isConnected: false }), false);
  assert.equal(boardOwnsMountedSurface(route, { isConnected: true }, originalCanvas), false);

  const replacementCanvas = { isConnected: true };
  assert.equal(boardOwnsMountedSurface(route, route, replacementCanvas), true,
    'the mounted route must accept its new keyed surface after spatial retirement');
  route.isConnected = false;
  assert.equal(boardOwnsMountedSurface(route, route, replacementCanvas), false);
});

test('only an opaque spatial stage hides the overlapped machine', () => {
  assert.equal(boardSceneActivity({ ...scene, scrollTop: 7999 }).machineVisible, true);
  assert.equal(boardSceneActivity({ ...scene, scrollTop: 8000 }).machineVisible, false);
  assert.equal(boardSceneActivity({ ...scene, scrollTop: 8000, spatialReady: false })
    .machineVisible, true);
  assert.equal(boardSceneActivity({ ...scene, scrollTop: 9400 }).spatialCovered, true);
});

test('separate preparation and release margins prevent repeated spatial loading', () => {
  assert.equal(boardSceneActivity({ ...scene, scrollTop: 5600 }).shouldPrepare, true);
  assert.equal(boardSceneActivity({ ...scene, scrollTop: 5000 }).shouldPrepare, false);
  assert.equal(boardSceneActivity({ ...scene, scrollTop: 5000 }).shouldRelease, false);
  assert.equal(boardSceneActivity({ ...scene, scrollTop: 4700 }).shouldRelease, true);
  assert.equal(boardSceneActivity({ ...scene, scrollTop: 4700 }).machineVisible, true);
});

test('reverse prewarming restores once and remains warm while scrubbing the seam', () => {
  const base = { stageTop: 8000, viewportHeight: 800, suspended: true, prewarmed: false };
  assert.equal(boardShouldKeepMachineWarm({ ...base,
    scrollTop: 8801, previousScrollTop: 9000 }), false);
  assert.equal(boardShouldKeepMachineWarm({ ...base,
    scrollTop: 8800, previousScrollTop: 9000 }), true);
  assert.equal(boardShouldKeepMachineWarm({ ...base,
    scrollTop: 8800, previousScrollTop: 8700 }), false);
  assert.equal(boardShouldKeepMachineWarm({ ...base,
    scrollTop: 8800, previousScrollTop: 8800 }), false);
  assert.equal(boardShouldKeepMachineWarm({ ...base,
    scrollTop: 0, previousScrollTop: 9000 }), true);
  assert.equal(boardShouldKeepMachineWarm({ ...base, suspended: false,
    scrollTop: 8000, previousScrollTop: 9000 }), false);

  const restored = { ...base, suspended: false, prewarmed: true };
  for (const [previousScrollTop, scrollTop] of [[8100, 7950], [7950, 8100], [9100, 9200]]) {
    assert.equal(boardShouldKeepMachineWarm({ ...restored, previousScrollTop, scrollTop }), true);
  }
  assert.equal(boardShouldKeepMachineWarm({ ...restored,
    previousScrollTop: 9200, scrollTop: 9201 }), false);
});

/** A ten-second display trace keeps cadence tests deterministic. Jitter changes
 * RAF arrival time, not the nominal refresh rate or the total capture length. */
function presentationTrace(refreshHz, { reducedMotion = false, jitter = false } = {}) {
  const pacer = createBoardFramePacer(reducedMotion);
  const painted = [];
  for (let index = 0; index < refreshHz * 10; index += 1) {
    const offset = jitter && index > 0
      ? (Math.sin(index * 1.31) + Math.sin(index * .39)) * .9 : 0;
    const now = index * 1000 / refreshHz + offset;
    if (pacer.takeFrame(now)) painted.push(now);
  }
  return painted;
}

test('60 Hz and 120 Hz displays both present 600 frames over ten seconds', () => {
  assert.equal(presentationTrace(60).length, 600);
  assert.equal(presentationTrace(120).length, 600);
});

test('120 Hz RAF jitter does not reduce the 60 Hz presentation cadence', () => {
  const painted = presentationTrace(120, { jitter: true });
  assert.ok(painted.length >= 599 && painted.length <= 601,
    `expected about 600 presentations, received ${painted.length}`);
  const intervals = painted.slice(1).map((now, index) => now - painted[index]);
  assert.ok(Math.max(...intervals) < 28, 'RAF jitter must not accumulate into missed presentation slots');
});

test('reduced motion keeps a stable 30 Hz limit on both refresh rates', () => {
  assert.equal(presentationTrace(60, { reducedMotion: true }).length, 300);
  assert.equal(presentationTrace(120, { reducedMotion: true }).length, 300);
  const jittered = presentationTrace(120, { reducedMotion: true, jitter: true });
  assert.ok(jittered.length >= 299 && jittered.length <= 301);
});

test('late callbacks retain their phase and drop missed slots without catch-up draws', () => {
  const pacer = createBoardFramePacer();
  assert.equal(pacer.takeFrame(0), true);
  assert.equal(pacer.takeFrame(8), false);
  assert.equal(pacer.takeFrame(60), true);
  assert.equal(pacer.takeFrame(60), false, 'one callback cannot consume more than one presentation');
  assert.equal(pacer.takeFrame(66.667), true, 'a late callback must preserve the next phase deadline');
  assert.equal(pacer.takeFrame(1000), true);
  assert.equal(pacer.takeFrame(1000), false, 'a long pause must drop its missed slots');
  assert.equal(pacer.takeFrame(1008), false);
  assert.equal(pacer.takeFrame(1016.667), true);
});

test('resuming an idle or hidden scene starts a fresh presentation clock', () => {
  const pacer = createBoardFramePacer();
  assert.equal(pacer.takeFrame(100), true);
  assert.equal(pacer.takeFrame(108), false);
  pacer.reset();
  assert.equal(pacer.takeFrame(108), true);
  assert.equal(pacer.takeFrame(116), false);
  assert.equal(pacer.takeFrame(124.667), true);
});
