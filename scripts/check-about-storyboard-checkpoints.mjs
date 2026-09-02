import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ABOUT_STORYBOARD_BEAT_RANGES,
  createAboutStoryboardCheckpoints,
} from './lib/about-recovery-audit-helpers.mjs';

test('frozen storyboard resolves to eight ordered entry/key/exit triplets', () => {
  const checkpoints = createAboutStoryboardCheckpoints(200);
  assert.equal(checkpoints.length, 24);
  assert.equal(new Set(checkpoints.map(({ id }) => id)).size, 24);
  const roundTunnel = checkpoints.filter(({ beatId }) => beatId === 'round-tunnel');
  assert.deepEqual(roundTunnel.map(({ phase }) => phase), ['entry', 'key', 'exit']);
  assert.deepEqual(
    roundTunnel.map(({ normalizedPercent }) => Number(normalizedPercent.toFixed(2))),
    [23.15, 33.5, 43.85],
  );
  const clients = checkpoints.filter(({ beatId }) => beatId === 'clients');
  assert.deepEqual(clients.map(({ normalizedPercent }) => Number(normalizedPercent.toFixed(3))),
    [46.775, 49.25, 51.725]);
  assert.ok(clients.every(({ rangeRelationship }) => rangeRelationship === 'nested'));
  assert.ok(clients.every(({ nestedWithin }) => nestedWithin === 'landscape'));
  assert.equal(checkpoints[0].storyWU, 1.1);
  assert.equal(checkpoints.at(-1).storyWU, 199.5);
  assert.deepEqual(
    checkpoints.filter(({ beatId }) => beatId === 'finale').map(({ phase }) => phase),
    ['entry', 'key', 'exit'],
  );
});

test('client constellation is explicitly nested inside the living landscape range', () => {
  const landscape = ABOUT_STORYBOARD_BEAT_RANGES.find(({ id }) => id === 'landscape');
  const clients = ABOUT_STORYBOARD_BEAT_RANGES.find(({ id }) => id === 'clients');
  assert.deepEqual(
    [landscape.startPercent, clients.startPercent, clients.endPercent, landscape.endPercent],
    [45, 46.5, 52, 59],
  );
  assert.equal(clients.relationship, 'nested');
  assert.equal(clients.nestedWithin, 'landscape');
});

test('every frozen storyboard sample falls strictly inside its declared range', () => {
  const checkpoints = createAboutStoryboardCheckpoints(137.25);
  for (const beat of ABOUT_STORYBOARD_BEAT_RANGES) {
    const frames = checkpoints.filter(({ beatId }) => beatId === beat.id);
    assert.equal(frames.length, 3);
    for (const frame of frames) {
      assert.ok(frame.normalizedPercent > beat.startPercent);
      assert.ok(frame.normalizedPercent < beat.endPercent);
      assert.ok(frame.storyWU > 137.25 * beat.startPercent / 100);
      assert.ok(frame.storyWU < 137.25 * beat.endPercent / 100);
    }
  }
});
