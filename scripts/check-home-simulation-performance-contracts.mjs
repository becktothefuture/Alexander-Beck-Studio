#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  normalizeSimulationAtmosphereConfig,
  resolveSimulationAtmosphereRenderProfile,
} from '../react-app/app/src/legacy/modules/rendering/atmosphere/simulation-atmosphere-config.js';
import {
  resolveFlatCircleBatchingStrategy,
  shouldBatchFlatCircleBodies,
} from '../react-app/app/src/legacy/modules/rendering/simulation-render-strategy.js';
import {
  resolveCollisionConvergenceThreshold,
  shouldStopCollisionIterations,
  shouldVisitForwardGridNeighbour,
} from '../react-app/app/src/legacy/modules/physics/collision-policy.js';
import {
  normalizePerStepMultiplier,
  resolveReferenceStepHz,
} from '../react-app/app/src/legacy/modules/utils/time-normalization.js';
import {
  resolvePhysicsStepSeconds,
  shouldSkipSleepingBodyStep,
} from '../react-app/app/src/legacy/modules/physics/mode-physics-policy.js';

test('canonical Home atmosphere keeps the broad field and disables the tight field', async () => {
  const designSystem = JSON.parse(await readFile(
    new URL('../react-app/app/public/config/design-system.json', import.meta.url),
    'utf8',
  ));
  const authored = designSystem.shell.surface.simulationAtmosphere;
  const normalized = normalizeSimulationAtmosphereConfig(authored);
  const profile = resolveSimulationAtmosphereRenderProfile(authored, 'light');
  assert.equal(authored.largeSpread, 0.08);
  assert.equal(authored.fieldMode, 'broad');
  assert.equal(normalized.fieldMode, 'broad');
  assert.equal(profile.fieldMode, 'broad');
  assert.equal(profile.largeSpread, 0.08);
});

test('legacy atmosphere configs remain combined unless they explicitly choose a field', () => {
  assert.equal(normalizeSimulationAtmosphereConfig({}).fieldMode, 'both');
  assert.equal(normalizeSimulationAtmosphereConfig({ fieldMode: 'tight' }).fieldMode, 'tight');
  assert.equal(normalizeSimulationAtmosphereConfig({ fieldMode: 'invalid' }).fieldMode, 'both');
});

test('flat-circle batching follows visible geometry capability, not viewport class', () => {
  assert.equal(shouldBatchFlatCircleBodies(0), true);
  assert.equal(shouldBatchFlatCircleBodies(0.02), true);
  assert.equal(shouldBatchFlatCircleBodies(0.021), false);
  assert.equal(shouldBatchFlatCircleBodies(undefined), false);
  assert.equal(resolveFlatCircleBatchingStrategy(0, false), 'exact-exceptions');
  assert.equal(resolveFlatCircleBatchingStrategy(0, true), 'mobile-simple');
  assert.equal(resolveFlatCircleBatchingStrategy(0.5, false), 'none');
});

test('collision grid visits each cell pair once and stops below subpixel correction', () => {
  const visited = [];
  for (let y = -1; y <= 1; y += 1) {
    for (let x = -1; x <= 1; x += 1) {
      if (shouldVisitForwardGridNeighbour(x, y)) visited.push(`${x},${y}`);
    }
  }
  assert.deepEqual(visited, ['0,0', '1,0', '-1,1', '0,1', '1,1']);
  assert.equal(resolveCollisionConvergenceThreshold(1), 0.05);
  assert.equal(resolveCollisionConvergenceThreshold(2), 0.1);
  assert.equal(shouldStopCollisionIterations(0.04, 0.05), true);
  assert.equal(shouldStopCollisionIterations(0.06, 0.05), false);
});

test('step-dependent decay preserves the current endpoint and composes across cadence', () => {
  assert.equal(normalizePerStepMultiplier(0.96, 1 / 60, 60), 0.96);
  assert.equal(normalizePerStepMultiplier(0.98, 1 / 120, 120), 0.98);
  assert.ok(Math.abs(
    normalizePerStepMultiplier(0.98, 1 / 60, 120) - (0.98 * 0.98),
  ) < 1e-12);
  assert.equal(resolveReferenceStepHz({ isMobileViewport: false }), 120);
  assert.equal(resolveReferenceStepHz({ isMobileViewport: true }), 60);
  assert.equal(resolveReferenceStepHz({ currentMode: 'kaleidoscope' }), 60);
  assert.equal(resolveReferenceStepHz({ currentMode: 'kaleidoscope-rift' }), 60);
});

test('physics cadence is mode-aware and keeps collision-dense Pit at 120 Hz', () => {
  assert.equal(resolvePhysicsStepSeconds('pit', {}), 1 / 120);
  assert.equal(resolvePhysicsStepSeconds('water', {}), 1 / 60);
  assert.equal(resolvePhysicsStepSeconds('magnetic', {}), 1 / 60);
  assert.equal(resolvePhysicsStepSeconds('elastic-center', {}), 1 / 60);
  assert.equal(resolvePhysicsStepSeconds('pit', { isMobileViewport: true }), 1 / 60);
  assert.equal(shouldSkipSleepingBodyStep('pit', { physicsSkipSleepingSteps: false }), true);
  assert.equal(shouldSkipSleepingBodyStep('portfolio-pit', { physicsSkipSleepingSteps: false }), true);
  assert.equal(shouldSkipSleepingBodyStep('water', { physicsSkipSleepingSteps: false }), false);
});

test('SPA renderer teardown disposes the pointer geometry observer and window listeners', async () => {
  const [pointerSource, rendererSource] = await Promise.all([
    readFile(new URL(
      '../react-app/app/src/legacy/modules/input/pointer.js',
      import.meta.url,
    ), 'utf8'),
    readFile(new URL(
      '../react-app/app/src/legacy/modules/rendering/renderer.js',
      import.meta.url,
    ), 'utf8'),
  ]);
  assert.match(pointerSource, /export function disposePointerGeometryCache\(\)/);
  assert.match(pointerSource, /canvasResizeObserver\?\.disconnect\(\)/);
  assert.match(pointerSource, /removeEventListener\('resize', invalidateCanvasRect\)/);
  assert.match(pointerSource, /removeEventListener\('orientationchange', invalidateCanvasRect\)/);
  assert.match(rendererSource, /disposePointerGeometryCache\(\)/);
});
