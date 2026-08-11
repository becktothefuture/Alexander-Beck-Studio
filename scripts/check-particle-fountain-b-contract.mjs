#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';

import { updatePhysics } from '../react-app/app/src/legacy/modules/physics/engine.js';
import { getGlobals } from '../react-app/app/src/legacy/modules/core/state.js';
import {
  registerCurrentModeReader,
  removeModeRuntime,
  writeModeRuntime,
} from '../react-app/app/src/legacy/modules/modes/mode-runtime-bridge.js';
import { resolveParticleFountainBLaunchVelocity } from '../react-app/app/src/legacy/modules/modes/particle-fountain-b.js';

test('empty body scenes keep their mode updater alive', () => {
  const mode = '__empty-emitter-fixture__';
  const globals = getGlobals();
  const previousCanvas = globals.canvas;
  const previousBalls = globals.balls;
  let updates = 0;
  const disposeReader = registerCurrentModeReader(() => mode);

  globals.canvas = {};
  globals.balls = [];
  writeModeRuntime(mode, { update: () => { updates += 1; } });

  try {
    updatePhysics(1 / 60, null);
    assert.equal(updates, 1);
  } finally {
    globals.canvas = previousCanvas;
    globals.balls = previousBalls;
    removeModeRuntime(mode);
    disposeReader();
  }
});

test('launch solver compensates for desktop and mobile physics cadence', () => {
  const shared = {
    gravity: 3332,
    friction: 0.018,
    massScale: 1,
    waterDrag: 0.02,
    upwardAcceleration: 180,
    dpr: 1,
  };
  const desktopVelocity = resolveParticleFountainBLaunchVelocity(600, {
    ...shared,
    dt: 1 / 120,
  });
  const mobileVelocity = resolveParticleFountainBLaunchVelocity(600, {
    ...shared,
    dt: 1 / 60,
  });

  assert.ok(desktopVelocity > mobileVelocity);
  assert.ok(desktopVelocity > 4000 && desktopVelocity < 4500);
  assert.ok(mobileVelocity > 2900 && mobileVelocity < 3200);
});
