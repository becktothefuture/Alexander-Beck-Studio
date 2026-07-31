#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getForceApplicator,
  getModeBoundsHandler,
  getModeCustomRenderer,
  getModeCustomStep,
  getModeDepthRenderer,
  getModeRenderer,
  getModeUpdater,
  registerCurrentModeReader,
  registerModeRuntimeLoader,
  removeModeRuntime,
  writeModeRuntime,
} from '../react-app/app/src/legacy/modules/modes/mode-runtime-bridge.js';

test('mode-runtime bridge publishes every frame hook without controller coupling', () => {
  const mode = '__mode-runtime-bridge-fixture__';
  const hooks = {
    force() {},
    update() {},
    preRender() {},
    postRender() {},
    customRender() {},
    depthRender() {},
    customStep() {},
    bounds() {},
  };
  const disposeReader = registerCurrentModeReader(() => mode);
  writeModeRuntime(mode, hooks);

  assert.equal(getForceApplicator(), hooks.force);
  assert.equal(getModeUpdater(), hooks.update);
  assert.deepEqual(getModeRenderer(), {
    preRender: hooks.preRender,
    postRender: hooks.postRender,
  });
  assert.equal(getModeCustomRenderer(), hooks.customRender);
  assert.equal(getModeDepthRenderer(), hooks.depthRender);
  assert.equal(getModeCustomStep(), hooks.customStep);
  assert.equal(getModeBoundsHandler(), hooks.bounds);

  removeModeRuntime(mode);
  disposeReader();
});

test('mode-runtime bridge requests a missing runtime and disposes loaders by identity', () => {
  const mode = '__mode-runtime-loader-fixture__';
  const requested = [];
  const disposeReader = registerCurrentModeReader(() => mode);

  const disposeFirst = registerModeRuntimeLoader(() => requested.push('first'));
  const disposeSecond = registerModeRuntimeLoader((requestedMode) => requested.push(requestedMode));
  disposeFirst();
  assert.equal(getModeUpdater(), null);
  assert.deepEqual(requested, [mode]);

  disposeSecond();
  assert.equal(getModeUpdater(), null);
  assert.deepEqual(requested, [mode]);
  disposeReader();
});
