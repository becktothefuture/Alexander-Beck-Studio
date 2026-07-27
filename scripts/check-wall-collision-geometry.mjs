import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { resolveInteriorWallViolation } from '../react-app/app/src/legacy/modules/physics/wall-collision-geometry.js';
import { resolveSimulationCornerShape } from '../react-app/app/src/legacy/modules/utils/frame-geometry.js';

function resolve(localX, localY, margin, useSquircle) {
  const target = {};
  const violated = resolveInteriorWallViolation(
    target,
    localX,
    localY,
    500,
    300,
    100,
    margin,
    useSquircle,
  );
  return { ...target, violated };
}

test('straight floor contact remains exact for round and squircle walls', () => {
  for (const useSquircle of [false, true]) {
    const touching = resolve(0, 290, 10, useSquircle);
    assert.equal(touching.violated, false);
    assert.ok(Math.abs(touching.penetration) < 1e-9);

    const penetrating = resolve(0, 291, 10, useSquircle);
    assert.equal(penetrating.violated, true);
    assert.ok(Math.abs(penetrating.penetration - 1) < 1e-9);
    assert.equal(penetrating.normalX, 0);
    assert.equal(penetrating.normalY, 1);
  }
});

test('squircle diagonal follows the CSS exponent-4 contour', () => {
  const diagonalBoundary = 100 * Math.pow(0.5, 0.25);
  const normalInset = 10 * Math.SQRT1_2;
  const local = 400 + diagonalBoundary - normalInset;
  const touching = resolve(local, 200 + diagonalBoundary - normalInset, 10, true);
  assert.equal(touching.violated, false);
  assert.ok(Math.abs(touching.penetration) < 0.08);

  const outward = resolve(
    local + Math.SQRT1_2,
    200 + diagonalBoundary - normalInset + Math.SQRT1_2,
    10,
    true,
  );
  assert.equal(outward.violated, true);
  assert.ok(Math.abs(outward.penetration - 1) < 0.08);
  assert.ok(Math.abs(outward.normalX - Math.SQRT1_2) < 0.01);
  assert.ok(Math.abs(outward.normalY - Math.SQRT1_2) < 0.01);
});

test('round fallback retains the conventional circular corner', () => {
  const roundBoundary = 100 * Math.SQRT1_2;
  const localX = 400 + roundBoundary;
  const localY = 200 + roundBoundary;
  const round = resolve(localX, localY, 0, false);
  assert.equal(round.violated, false);
  assert.ok(Math.abs(round.penetration) < 1e-9);

  const squircle = resolve(localX, localY, 0, true);
  assert.equal(squircle.violated, false);
  assert.ok(squircle.penetration < -10);
});

test('physics follows the browser-resolved wall corner family', () => {
  assert.equal(resolveSimulationCornerShape({ cornerTopLeftShape: 'squircle' }), 'squircle');
  assert.equal(resolveSimulationCornerShape({ cornerShape: 'squircle round round round' }), 'squircle');
  assert.equal(resolveSimulationCornerShape({ cornerShape: 'superellipse(2)' }), 'squircle');
  assert.equal(resolveSimulationCornerShape({ cornerShape: 'round' }), 'round');
  assert.equal(resolveSimulationCornerShape({}), 'round');
});

test('the production wall collision boundary is locked to the visible wall', async () => {
  const designSystem = JSON.parse(await readFile(
    new URL('../react-app/app/public/config/design-system.json', import.meta.url),
    'utf8',
  ));
  assert.equal(designSystem.runtime.simulationCollisionInsetPx, 0);

  const controls = await readFile(
    new URL('../react-app/app/src/legacy/modules/ui/control-registry.js', import.meta.url),
    'utf8',
  );
  assert.doesNotMatch(controls, /id:\s*['"]simulationCollisionInsetPx['"]/);
});
