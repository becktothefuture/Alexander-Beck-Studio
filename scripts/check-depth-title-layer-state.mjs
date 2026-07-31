#!/usr/bin/env node

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DEPTH_TITLE_LAYER_ACTIVE_CLASS,
  removeDepthTitleLayerClass,
} from '../react-app/app/src/legacy/modules/rendering/depth-title-layer-state.js';

function createClassList(active) {
  const classes = new Set(active ? [DEPTH_TITLE_LAYER_ACTIVE_CLASS] : []);
  let removeCalls = 0;
  return {
    contains: (value) => classes.has(value),
    remove: (value) => {
      removeCalls += 1;
      classes.delete(value);
    },
    get removeCalls() {
      return removeCalls;
    },
  };
}

test('absent depth-title state causes no DOM mutation', () => {
  const classList = createClassList(false);
  assert.equal(removeDepthTitleLayerClass({ classList }), false);
  assert.equal(classList.removeCalls, 0);
});

test('active depth-title state is removed exactly once', () => {
  const classList = createClassList(true);
  assert.equal(removeDepthTitleLayerClass({ classList }), true);
  assert.equal(removeDepthTitleLayerClass({ classList }), false);
  assert.equal(classList.removeCalls, 1);
});

test('missing containers remain a safe no-op', () => {
  assert.equal(removeDepthTitleLayerClass(null), false);
  assert.equal(removeDepthTitleLayerClass({}), false);
});
