#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import {
  normalizeSimulationAtmosphereConfig,
  resolveSimulationAtmosphereRenderProfile,
  isSimulationAtmosphereFrameDue,
  shouldRenderSimulationAtmosphereFrame,
} from '../react-app/app/src/legacy/modules/rendering/atmosphere/simulation-atmosphere-config.js';
import {
  resolveAtmosphereMaximumOutputAgeMs,
  shouldDeferAtmosphereFrame,
} from '../react-app/app/src/legacy/modules/rendering/atmosphere/atmosphere-frame-budget.js';
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
  isPitPhysicsActive,
  PIT_ACTIVE_CADENCE_HOLD_SECONDS,
  resolvePhysicsStepSeconds,
  shouldSkipSleepingBodyStep,
} from '../react-app/app/src/legacy/modules/physics/mode-physics-policy.js';
import {
  consumeWarmupFrameSlice,
  resolveWarmupFrameCount,
} from '../react-app/app/src/legacy/modules/physics/warmup-frame-scheduler.js';
import {
  disposePointerGeometryObserver,
  observePointerGeometry,
} from '../react-app/app/src/legacy/modules/input/pointer-geometry-observer.js';

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
  assert.ok(Math.abs(
    normalizePerStepMultiplier(0.32, 1 / 60, 120) - (0.32 * 0.32),
  ) < 1e-12);
  assert.ok(Math.abs(
    normalizePerStepMultiplier(0.7, 1 / 60, 120) - (0.7 * 0.7),
  ) < 1e-12);
  assert.equal(resolveReferenceStepHz({ isMobileViewport: false }), 120);
  assert.equal(resolveReferenceStepHz({ isMobileViewport: true }), 60);
  assert.equal(resolveReferenceStepHz({ currentMode: 'kaleidoscope' }), 60);
  assert.equal(resolveReferenceStepHz({ currentMode: 'kaleidoscope-rift' }), 60);
});

test('physics cadence is mode-aware and adapts Pit only after measured calm', () => {
  assert.equal(resolvePhysicsStepSeconds('pit', {}), 1 / 120);
  assert.equal(resolvePhysicsStepSeconds('water', {}), 1 / 60);
  assert.equal(resolvePhysicsStepSeconds('magnetic', {}), 1 / 60);
  assert.equal(resolvePhysicsStepSeconds('elastic-center', {}), 1 / 60);
  assert.equal(resolvePhysicsStepSeconds('pit', { isMobileViewport: true }), 1 / 60);

  const calmPit = {
    balls: Array.from({ length: 300 }, () => ({})),
    DPR: 1,
    pitSleepingBodyCount: 300,
    pitAwakeBodyCount: 0,
    pitMaxAwakeSpeedSq: 0,
    pitMaxAwakeAngularSpeed: 0,
    pitLastOverlapDebt: 0,
    pitCadenceHoldSeconds: 0,
  };
  assert.equal(isPitPhysicsActive(calmPit, 1000), false);
  assert.equal(resolvePhysicsStepSeconds('pit', calmPit, 1 / 60, 1000), 1 / 60);

  for (const metric of [
    'pitSleepingBodyCount',
    'pitAwakeBodyCount',
    'pitMaxAwakeSpeedSq',
    'pitMaxAwakeAngularSpeed',
    'pitLastOverlapDebt',
  ]) {
    const measuredValue = calmPit[metric];
    calmPit[metric] = null;
    assert.equal(
      isPitPhysicsActive(calmPit, 1000),
      true,
      `missing ${metric} keeps the Pit on its authored 120 Hz path`,
    );
    calmPit[metric] = measuredValue;
  }

  calmPit.pitAwakeBodyCount = 26;
  assert.equal(isPitPhysicsActive(calmPit, 1000), false, 'stationary bookkeeping-awake bodies stay calm');
  calmPit.pitMaxAwakeSpeedSq = 25;
  assert.equal(isPitPhysicsActive(calmPit, 1000), true, 'visible awake motion restores 120 Hz');
  calmPit.pitAwakeBodyCount = 0;
  calmPit.pitMaxAwakeSpeedSq = 0;

  calmPit.pitMaxAwakeAngularSpeed = 0.1;
  assert.equal(isPitPhysicsActive(calmPit, 1000), true, 'visible pebble rotation retains 120 Hz');
  calmPit.pitMaxAwakeAngularSpeed = 0;

  calmPit.pointerActive = true;
  assert.equal(resolvePhysicsStepSeconds('pit', calmPit, 1 / 60, 1016), 1 / 120);
  assert.equal(calmPit.pitCadenceHoldSeconds, PIT_ACTIVE_CADENCE_HOLD_SECONDS);
  calmPit.pointerActive = false;
  assert.equal(resolvePhysicsStepSeconds('pit', calmPit, 0.1, 1116), 1 / 120);
  assert.equal(resolvePhysicsStepSeconds('pit', calmPit, 0.1, 1216), 1 / 120);
  assert.equal(resolvePhysicsStepSeconds('pit', calmPit, 0.1, 1316), 1 / 60);

  calmPit.lastPointerMoveMs = 1400;
  calmPit.pointerInCanvas = true;
  assert.equal(isPitPhysicsActive(calmPit, 1500), true);
  calmPit.lastPointerMoveMs = 0;
  calmPit.pointerLastEventMs = 1600;
  assert.equal(isPitPhysicsActive(calmPit, 1650), true, 'first pointer entry restores 120 Hz');
  assert.equal(resolvePhysicsStepSeconds('portfolio-pit', calmPit, 1 / 60, 1500), 1 / 120);
  assert.equal(shouldSkipSleepingBodyStep('pit', { physicsSkipSleepingSteps: false }), true);
  assert.equal(shouldSkipSleepingBodyStep('portfolio-pit', { physicsSkipSleepingSteps: false }), true);
  assert.equal(shouldSkipSleepingBodyStep('water', { physicsSkipSleepingSteps: false }), false);
});

test('warm-up work is deterministic but split by a bounded wall-clock budget', async () => {
  assert.equal(resolveWarmupFrameCount(10, 0), 0);
  assert.equal(resolveWarmupFrameCount(10, 300), 10);

  let clockMs = 0;
  let executed = 0;
  const first = consumeWarmupFrameSlice({
    remainingFrames: 5,
    now: () => clockMs,
    runFrame: () => {
      executed += 1;
      clockMs += 1.1;
    },
  });
  assert.deepEqual(first, {
    consumedFrames: 2,
    remainingFrames: 3,
    elapsedMs: 2.2,
    exceededHardLimit: false,
  });

  const second = consumeWarmupFrameSlice({
    remainingFrames: first.remainingFrames,
    now: () => clockMs,
    runFrame: () => {
      executed += 1;
      clockMs += 1.1;
    },
  });
  assert.equal(second.consumedFrames, 2);
  assert.equal(second.remainingFrames, 1);
  const third = consumeWarmupFrameSlice({
    remainingFrames: second.remainingFrames,
    now: () => clockMs,
    runFrame: () => {
      executed += 1;
      clockMs += 1.1;
    },
  });
  assert.equal(third.remainingFrames, 0);
  assert.equal(executed, 5);

  const engineSource = await readFile(new URL(
    '../react-app/app/src/legacy/modules/physics/engine.js',
    import.meta.url,
  ), 'utf8');
  assert.match(engineSource, /consumeWarmupFrameSlice\(/);
  assert.doesNotMatch(engineSource, /for \(let i = 0; i < warmupFrames; i\+\+\)/);
});

test('atmosphere deferral keeps first and overdue publications mandatory', () => {
  const schedule = { nextFrameAt: 100 };
  assert.equal(isSimulationAtmosphereFrameDue(schedule, 90, 24), false);
  assert.equal(isSimulationAtmosphereFrameDue(schedule, 100, 24), true);
  assert.equal(shouldRenderSimulationAtmosphereFrame(schedule, 100, 24), true);
  assert.ok(schedule.nextFrameAt > 100);

  const frameBudget = {
    allowAtmosphereDeferral: true,
    deadlineMs: 116.7,
    targetFps: 60,
  };
  assert.equal(shouldDeferAtmosphereFrame({
    frameBudget,
    nowMs: 115.8,
    lastCompositeAt: 75,
    cadenceFps: 24,
    costEstimateMs: 1.5,
  }), true);
  assert.equal(shouldDeferAtmosphereFrame({
    frameBudget,
    nowMs: 115.8,
    lastCompositeAt: 0,
    cadenceFps: 24,
    costEstimateMs: 1.5,
  }), false);
  assert.equal(shouldDeferAtmosphereFrame({
    frameBudget,
    nowMs: 150,
    lastCompositeAt: 75,
    cadenceFps: 24,
    costEstimateMs: 1.5,
  }), false);
  assert.equal(shouldDeferAtmosphereFrame({
    frameBudget,
    nowMs: 132,
    lastCompositeAt: 75,
    cadenceFps: 24,
    costEstimateMs: 1.5,
  }), false, 'projected next-frame age must stay inside the retained-output limit');
  assert.ok(Math.abs(resolveAtmosphereMaximumOutputAgeMs(24, 60) - 58.333333333333336) < 1e-9);
});

test('SPA pointer geometry setup replaces and disposes its observer ownership', async () => {
  const observerState = { created: 0, active: 0, disconnected: 0 };
  class FakeResizeObserver {
    constructor() {
      observerState.created += 1;
    }

    observe() {
      observerState.active += 1;
    }

    disconnect() {
      observerState.active -= 1;
      observerState.disconnected += 1;
    }
  }
  const listenerState = { added: [], removed: [] };
  const fakeWindow = {
    addEventListener(type) { listenerState.added.push(type); },
    removeEventListener(type) { listenerState.removed.push(type); },
  };
  const options = { ResizeObserverClass: FakeResizeObserver, windowTarget: fakeWindow };
  observePointerGeometry({}, () => {}, options);
  assert.deepEqual(observerState, { created: 1, active: 1, disconnected: 0 });
  observePointerGeometry({}, () => {}, options);
  assert.deepEqual(observerState, { created: 2, active: 1, disconnected: 1 });
  assert.deepEqual(listenerState.removed, ['resize', 'orientationchange']);
  disposePointerGeometryObserver();
  assert.deepEqual(observerState, { created: 2, active: 0, disconnected: 2 });
  assert.deepEqual(listenerState.added, [
    'resize', 'orientationchange', 'resize', 'orientationchange',
  ]);
  assert.deepEqual(listenerState.removed, [
    'resize', 'orientationchange', 'resize', 'orientationchange',
  ]);

  const rendererSource = await readFile(new URL(
    '../react-app/app/src/legacy/modules/rendering/renderer.js',
    import.meta.url,
  ), 'utf8');
  assert.match(rendererSource, /disposePointerGeometryCache\(\)/);
});
