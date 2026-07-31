#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  emitScenePointer,
  subscribeScenePointer,
} from '../react-app/app/src/legacy/modules/input/scene-pointer.js';

test('scene-pointer port preserves order, isolates failures, and disposes exactly', () => {
  const received = [];
  const disposeFirst = subscribeScenePointer((type, detail) => {
    received.push(['first', type, detail.sequence]);
  });
  const disposeBroken = subscribeScenePointer(() => {
    throw new Error('fixture failure');
  });
  const disposeLast = subscribeScenePointer((type, detail) => {
    received.push(['last', type, detail.sequence]);
  });

  emitScenePointer('move', { sequence: 1 });
  assert.deepEqual(received, [
    ['first', 'move', 1],
    ['last', 'move', 1],
  ]);

  disposeFirst();
  disposeFirst();
  emitScenePointer('down', { sequence: 2 });
  assert.deepEqual(received, [
    ['first', 'move', 1],
    ['last', 'move', 1],
    ['last', 'down', 2],
  ]);

  disposeBroken();
  disposeLast();
  emitScenePointer('cancel', { sequence: 3 });
  assert.equal(received.length, 3);
});

test('scene-pointer port ignores non-function subscribers', () => {
  const dispose = subscribeScenePointer(null);
  assert.equal(typeof dispose, 'function');
  assert.doesNotThrow(() => dispose());
});
