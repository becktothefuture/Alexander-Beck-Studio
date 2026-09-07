import assert from 'node:assert/strict';
import { test } from 'node:test';
import { writeAboutSceneLook } from '../react-app/app/src/routes/about-narrative-lab/aboutSceneLook.js';
import { createAboutAuthoredMotion, advanceAboutAuthoredMotion, applyAboutAuthoredMotion } from '../react-app/app/src/routes/about-narrative-lab/aboutAuthoredMotion.js';
import { resolveAboutSurfelRadiusPx } from '../react-app/app/src/routes/about-narrative-lab/aboutSurfelProjection.js';

const vector = (x, y, z) => ({ x, y, z, set(a, b, c) { this.x = a; this.y = b; this.z = c; return this; } });
const motion = { behavior: 'bounded-rotation', axis: [0, 1, 0], pivotWU: [3, 10, 4], amplitudeRadians: Math.PI * 8 / 180, periodSeconds: 32 };

test('website distance override stays exact through every scene and resets to Blender', () => {
  const authored = { startWU: 44, endWU: 223, curve: 1 };
  const frame = { globals: { camera: { distanceFogOverride: 1, distanceFogStartWU: 10, distanceFogEndWU: 100, distanceFogCurve: 2 } },
    world: { to: { shapeParameters: { finaleFogStartWU: 900, finaleFogEndWU: 1000 } } } };
  const target = {};
  for (const progress of [0, 0.2, 0.5, 0.8, 1]) {
    assert.equal(writeAboutSceneLook(target, frame, 1, { finaleProgress: progress, runwayProgress: progress }, authored), target);
    assert.deepEqual([target.fogSource, target.fogStartWU, target.fogEndWU, target.fogCurve], ['website', 10, 100, 2]);
  }
  frame.globals.camera.distanceFogOverride = 0;
  writeAboutSceneLook(target, frame, 1, { finaleProgress: 1 }, authored);
  assert.deepEqual([target.fogSource, target.fogStartWU, target.fogEndWU, target.fogCurve], ['blender', 44, 223, 1]);
});

test('bounded bust cycle preserves contact, height, radial distance, and its eight-degree limit', () => {
  const state = createAboutAuthoredMotion([{ id: 0, motion }]);
  const controls = writeAboutSceneLook({}, { globals: {} });
  for (let second = 0; second <= 64; second += 0.25) {
    advanceAboutAuthoredMotion(state, second, controls, false);
    const point = applyAboutAuthoredMotion(vector(5, 10, 4), 0, state);
    assert.equal(point.y, 10);
    assert.ok(Math.abs(Math.hypot(point.x - 3, point.z - 4) - 2) < 1e-7);
    assert.ok(Math.abs(state.vectors[3]) <= motion.amplitudeRadians + 1e-7);
    const up = applyAboutAuthoredMotion(vector(0, 1, 0), 0, state, true);
    assert.deepEqual([up.x, up.y, up.z], [0, 1, 0]);
  }
  assert.ok(Math.abs(state.vectors[3]) < 1e-6);
});

test('speed edits and paused ambient time do not restart the bust phase', () => {
  const state = createAboutAuthoredMotion([{ id: 0, motion }]);
  const controls = writeAboutSceneLook({}, { globals: {} });
  advanceAboutAuthoredMotion(state, 4, controls, false);
  const phase = state.vectors[3];
  controls.bustTurnSpeed = 0;
  advanceAboutAuthoredMotion(state, 20, controls, false);
  assert.equal(state.vectors[3], phase);
  controls.bustTurnSpeed = 2;
  advanceAboutAuthoredMotion(state, 20, controls, false);
  assert.equal(state.vectors[3], phase);
  advanceAboutAuthoredMotion(state, 20.1, controls, false);
  assert.ok(Math.abs(state.vectors[3] - phase) < 0.01);
});

test('reduced motion settles rotation and deformation without changing source geometry', () => {
  const state = createAboutAuthoredMotion([{ id: 0, motion }, { id: 1, motion: {
    behavior: 'terrain-wave', axis: [0, 1, 0], amplitudeWU: 2.4, wavelengthWU: 96, secondaryScale: 0.46, radiansPerSecond: 0.3,
  } }]);
  advanceAboutAuthoredMotion(state, 8, writeAboutSceneLook({}, { globals: {} }), true);
  for (const group of [0, 1]) {
    const point = applyAboutAuthoredMotion(vector(4, 10, 9), group, state);
    assert.deepEqual([point.x, point.y, point.z], [4, 10, 9]);
  }
});

test('point population and surface coverage control different visible properties', () => {
  const controls = writeAboutSceneLook({}, { globals: {} });
  const point = { radiusWU: 1, cameraDepthWU: 100, projectionScalePx: 100, surfaceFacing: 0.1,
    lodRank: 0.8, featureClass: 0, preserve: true, revealProgress: 1, renderingProfile: 1 };
  const full = resolveAboutSurfelRadiusPx(point, controls);
  assert.ok(full > 0);
  controls.pointDensity = 0.5;
  assert.equal(resolveAboutSurfelRadiusPx(point, controls), 0);
  point.lodRank = 0.2;
  const sparse = resolveAboutSurfelRadiusPx(point, controls);
  assert.ok(sparse >= full);
  controls.solidCoverage = 2;
  assert.ok(resolveAboutSurfelRadiusPx(point, controls) > sparse);
  point.surfaceFacing = -0.1;
  assert.equal(resolveAboutSurfelRadiusPx(point, controls), 0);
  controls.backfaceRetention = 1;
  assert.ok(resolveAboutSurfelRadiusPx(point, controls) > 0);
});
