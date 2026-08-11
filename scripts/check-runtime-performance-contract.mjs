#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  aggregateProfile,
  aggregateRafControlProfile,
  countMissedRenderDeadlines,
  evaluateEnvironmentCalibration,
  evaluateLocalEnvironmentCalibration,
  evaluateMode,
  evaluateRafControlRepeat,
  evaluateRepeat,
  median,
  medianAbsoluteDeviation,
  parsePerformanceContract,
  resolveCertificationSurface,
  normalizeCadence,
} from './lib/runtime-performance-contract.mjs';

test('median and MAD provide robust repeat aggregation', () => {
  assert.equal(median([59, 60, 10]), 59);
  assert.equal(median([58, 60]), 59);
  assert.equal(medianAbsoluteDeviation([59, 60, 10]), 1);
});

test('contract rejects contradictory short or single-sample configurations', () => {
  assert.throws(() => parsePerformanceContract({ ABS_PERF_SAMPLE_MS: '1000' }), /at least 5000ms/);
  assert.throws(() => parsePerformanceContract({ ABS_PERF_REPEAT_COUNT: '1' }), /at least 3/);
  assert.throws(() => parsePerformanceContract({ ABS_PERF_PROFILES: 'mystery' }), /cold,warm/);
});

test('contract declares short adjacent controls without changing performance thresholds', () => {
  const contract = parsePerformanceContract({});
  assert.deepEqual(contract.localEnvironmentControls, {
    surface: 'about:blank static requestAnimationFrame control',
    placement: 'one fresh-context control immediately before and after each mode block',
    sampleMs: 2_000,
    preSampleDelayMs: 250,
    thresholds: 'same refresh, p95, p99, and browser-error thresholds as the certification contract',
  });
  assert.equal(contract.thresholds.maximumP95Ms, 20);
  assert.equal(contract.thresholds.maximumP99Ms, 33.4);
  assert.equal(contract.thresholds.maximumLongestGapMs, 50);
  assert.equal(contract.thresholds.maximumRenderInvocationP95Ms, 20);
  assert.equal(contract.thresholds.maximumRenderInvocationP99Ms, 33.4);
  assert.equal(contract.thresholds.maximumConsecutiveMisses, 2);
  assert.equal(contract.thresholds.maximumInputToRenderP95Ms, 33.4);
});

test('certification defaults to an owned production preview', () => {
  assert.deepEqual(resolveCertificationSurface({}), {
    type: 'owned-production-preview',
    baseUrl: null,
    owned: true,
    buildRequired: true,
  });
  assert.deepEqual(resolveCertificationSurface({ ABS_PERF_SKIP_BUILD: '1' }), {
    type: 'owned-production-preview',
    baseUrl: null,
    owned: true,
    buildRequired: false,
  });
});

test('ABS_DEV_URL is an explicit external diagnostic surface', () => {
  assert.deepEqual(resolveCertificationSurface({ ABS_DEV_URL: 'https://example.test/' }), {
    type: 'external-url-diagnostic',
    baseUrl: 'https://example.test',
    owned: false,
    buildRequired: false,
  });
  assert.throws(() => resolveCertificationSurface({ ABS_DEV_URL: 'file:///tmp/site' }), /HTTP\(S\)/);
});

function passingRepeat(overrides = {}) {
  return {
    actualDurationMs: 5_020,
    ownership: { matched: true, candidateCount: 1 },
    observedRefreshHz: 60,
    measuredFps: 59,
    rawMeasuredFps: 59,
    cappedMeasuredFps: 59,
    cadenceCeilingFps: 60,
    rafFps: 60,
    renderInvocationFps: 59,
    renderedFps: 59,
    runtimeFps: 59,
    p95Ms: 17,
    p99Ms: 20,
    longestGapMs: 21,
    renderInvocationP95Ms: 17,
    renderInvocationP99Ms: 20,
    maximumConsecutiveMisses: 0,
    inputProfile: 'idle',
    inputToRenderP95Ms: null,
    throttleLevel: 0,
    consoleErrors: [],
    pageErrors: [],
    ...overrides,
  };
}

function passingLocalControl(contract, overrides = {}) {
  const control = {
    actualDurationMs: contract.localEnvironmentControls.sampleMs + 10,
    observedRefreshHz: 60,
    rafFps: 60,
    p95Ms: 17,
    p99Ms: 20,
    longestGapMs: 22,
    consoleErrors: [],
    pageErrors: [],
    ...overrides,
  };
  return Object.assign(control, evaluateRafControlRepeat(control, contract, {
    minimumDurationMs: contract.localEnvironmentControls.sampleMs,
  }));
}

function passingProfiles() {
  return {
    cold: { passed: true, aggregate: { cappedMeasuredFps: 59, renderInvocationFps: 59 } },
    warm: { passed: true, aggregate: { cappedMeasuredFps: 59, renderInvocationFps: 59 } },
  };
}

function passingLocalEnvironment(contract) {
  return evaluateLocalEnvironmentCalibration({
    pre: passingLocalControl(contract),
    post: passingLocalControl(contract),
  });
}

test('repeat failures name every failed predicate and reason', () => {
  const contract = parsePerformanceContract({});
  const result = evaluateRepeat(passingRepeat({
    actualDurationMs: 1_000,
    ownership: { matched: false, candidateCount: 2 },
    measuredFps: 30,
    cappedMeasuredFps: 30,
    p95Ms: 40,
  }), contract, { requiresContinuousFrames: true });
  assert.equal(result.passed, false);
  assert.deepEqual(result.failures.map((failure) => failure.predicate), [
    'minimum-sample-duration',
    'exact-runtime-ownership',
    'minimum-fps',
    'p95-frame-time',
  ]);
  assert.ok(result.failures.every((failure) => failure.reason));
});

test('repeat rejects visible stalls and clustered missed render deadlines', () => {
  const contract = parsePerformanceContract({});
  const result = evaluateRepeat(passingRepeat({
    longestGapMs: 80,
    renderInvocationP95Ms: 24,
    renderInvocationP99Ms: 41,
    maximumConsecutiveMisses: 3,
  }), contract, { requiresContinuousFrames: true });
  assert.equal(result.passed, false);
  assert.deepEqual(result.failures.map((failure) => failure.predicate), [
    'maximum-frame-gap',
    'render-invocation-p95',
    'render-invocation-p99',
    'maximum-consecutive-missed-deadlines',
  ]);
});

test('active input profile gates interaction to next owned render latency', () => {
  const contract = parsePerformanceContract({});
  const result = evaluateRepeat(passingRepeat({
    inputProfile: 'pointer-sweep',
    inputToRenderP95Ms: 40,
  }), contract, { requiresContinuousFrames: true });
  assert.equal(result.passed, false);
  assert.deepEqual(result.failures.map((failure) => failure.predicate), ['input-to-render-p95']);
});

test('target and refresh ceiling caps raw render-invocation cadence', () => {
  assert.deepEqual(normalizeCadence({ measuredFps: 70.58, targetFps: 60, observedRefreshHz: 120.07 }), {
    rawMeasuredFps: 70.58,
    cadenceCeilingFps: 60,
    cappedMeasuredFps: 60,
    overRenderFps: 10.579999999999998,
  });
  assert.deepEqual(normalizeCadence({ measuredFps: 63.57, targetFps: 60, observedRefreshHz: 70.56 }), {
    rawMeasuredFps: 63.57,
    cadenceCeilingFps: 60,
    cappedMeasuredFps: 60,
    overRenderFps: 3.5700000000000003,
  });
});

test('missed deadline counting ignores lateness until a full render opportunity is skipped', () => {
  assert.equal(countMissedRenderDeadlines(18, 60), 0);
  assert.equal(countMissedRenderDeadlines(33.4, 60), 1);
  assert.equal(countMissedRenderDeadlines(50.1, 60), 2);
});

test('profile records robust aggregates but rejects any failed repeat', () => {
  const contract = parsePerformanceContract({});
  const repeats = [
    passingRepeat(),
    passingRepeat({ measuredFps: 58, cappedMeasuredFps: 58 }),
    passingRepeat({ measuredFps: 12, cappedMeasuredFps: 12 }),
  ];
  repeats.forEach((repeat) => Object.assign(repeat, evaluateRepeat(repeat, contract, { requiresContinuousFrames: true })));
  const profile = aggregateProfile(repeats, contract);
  assert.equal(profile.aggregate.measuredFps, 58);
  assert.equal(profile.passed, false);
  assert.equal(repeats[2].passed, false);
  assert.equal(repeats[2].failures[0].predicate, 'minimum-fps');
  assert.deepEqual(profile.failures[0], {
    predicate: 'all-repeats-pass',
    actual: [3],
    expected: 'every repeat passes every predicate',
    reason: 'Release certification does not discard or excuse a failed repeat as an outlier.',
  });
});

test('mode gate requires named profiles and catches warm decay', () => {
  const contract = parsePerformanceContract({});
  const certify = (repeat) => Object.assign(repeat, evaluateRepeat(repeat, contract, { requiresContinuousFrames: true }));
  const cold = aggregateProfile([passingRepeat(), passingRepeat(), passingRepeat()].map(certify), contract);
  const warmRepeats = [
    passingRepeat({ measuredFps: 55, cappedMeasuredFps: 55 }),
    passingRepeat({ measuredFps: 55, cappedMeasuredFps: 55 }),
    passingRepeat({ measuredFps: 55, cappedMeasuredFps: 55 }),
  ];
  const warm = aggregateProfile(warmRepeats.map(certify), contract);
  const result = evaluateMode({ cold, warm }, contract, { valid: true }, passingLocalEnvironment(contract));
  assert.equal(result.passed, false);
  assert.ok(result.failures.some((failure) => failure.predicate === 'required-profile-warm'));
  assert.ok(result.failures.some((failure) => failure.predicate === 'cold-to-warm-decay'));
});

test('cold 70.58 to warm 60.17 at target 60 normalizes to zero decay and passes', () => {
  const contract = parsePerformanceContract({});
  const coldCadence = normalizeCadence({ measuredFps: 70.58, targetFps: 60, observedRefreshHz: 120.07 });
  const warmCadence = normalizeCadence({ measuredFps: 60.17, targetFps: 60, observedRefreshHz: 120.07 });
  const result = evaluateMode({
    cold: { passed: true, aggregate: { ...coldCadence, renderInvocationFps: 70.58 } },
    warm: { passed: true, aggregate: { ...warmCadence, renderInvocationFps: 60.17 } },
  }, contract, { valid: true }, passingLocalEnvironment(contract));
  assert.equal(result.warmDecayPercent, 0);
  assert.equal(result.passed, true);
  assert.equal(result.overRenderFollowUp.classification, 'non-gating-render-invocation-follow-up');
});

test('cold 60 to warm 55 remains 8.33 percent decay and fails', () => {
  const contract = parsePerformanceContract({});
  const result = evaluateMode({
    cold: { passed: true, aggregate: { cappedMeasuredFps: 60, renderInvocationFps: 60 } },
    warm: { passed: true, aggregate: { cappedMeasuredFps: 55, renderInvocationFps: 55 } },
  }, contract, { valid: true }, passingLocalEnvironment(contract));
  assert.equal(Number(result.warmDecayPercent.toFixed(2)), 8.33);
  assert.equal(result.passed, false);
  assert.ok(result.failures.some((failure) => failure.predicate === 'cold-to-warm-decay'));
});

test('failed static rAF control classifies the environment instead of the mode', () => {
  const contract = parsePerformanceContract({ ABS_PERF_PROFILES: 'cold' });
  const controlRepeat = { actualDurationMs: 5_010, observedRefreshHz: 30, rafFps: 30, p95Ms: 40, p99Ms: 60, longestGapMs: 70, consoleErrors: [], pageErrors: [] };
  Object.assign(controlRepeat, evaluateRafControlRepeat(controlRepeat, contract));
  const cold = aggregateRafControlProfile([controlRepeat, { ...controlRepeat }, { ...controlRepeat }], contract);
  const environment = evaluateEnvironmentCalibration({ cold }, contract);
  const result = evaluateMode({}, contract, environment);
  assert.equal(environment.valid, false);
  assert.equal(result.classification, 'environment-invalid');
  assert.deepEqual(result.failures.map((failure) => failure.predicate), ['environment-calibration']);
  assert.ok(!result.failures.some((failure) => failure.predicate.startsWith('required-profile-')));
});

test('valid adjacent controls permit normal mode evaluation', () => {
  const contract = parsePerformanceContract({});
  const localEnvironment = evaluateLocalEnvironmentCalibration({
    pre: passingLocalControl(contract),
    post: passingLocalControl(contract),
  });
  const result = evaluateMode(passingProfiles(), contract, { valid: true }, localEnvironment);
  assert.equal(localEnvironment.valid, true);
  assert.equal(result.classification, 'mode-pass');
  assert.equal(result.passed, true);
});

test('missing adjacent controls fail closed as an invalid environment', () => {
  const contract = parsePerformanceContract({});
  const result = evaluateMode(passingProfiles(), contract, { valid: true });
  assert.equal(result.passed, false);
  assert.equal(result.classification, 'environment-invalid');
  assert.deepEqual(result.failures.map((failure) => failure.predicate), ['local-environment-calibration']);
  assert.equal(result.failures[0].actual, 'missing');
});

test('an invalid adjacent pre or post control makes the mode window environment-invalid', () => {
  const contract = parsePerformanceContract({});
  for (const phase of ['pre', 'post']) {
    const controls = {
      pre: passingLocalControl(contract),
      post: passingLocalControl(contract),
    };
    controls[phase] = passingLocalControl(contract, { p99Ms: 40 });
    const localEnvironment = evaluateLocalEnvironmentCalibration(controls);
    const result = evaluateMode(passingProfiles(), contract, { valid: true }, localEnvironment);
    assert.equal(localEnvironment.valid, false);
    assert.equal(result.classification, 'environment-invalid');
    assert.deepEqual(result.failures.map((failure) => failure.predicate), ['local-environment-calibration']);
    assert.ok(!result.failures.some((failure) => failure.predicate.startsWith('required-profile-')));
  }
});

test('real mode failures remain product failures when adjacent controls pass', () => {
  const contract = parsePerformanceContract({});
  const localEnvironment = evaluateLocalEnvironmentCalibration({
    pre: passingLocalControl(contract),
    post: passingLocalControl(contract),
  });
  const profiles = passingProfiles();
  profiles.warm = { passed: false, aggregate: { cappedMeasuredFps: 40, renderInvocationFps: 40 } };
  const result = evaluateMode(profiles, contract, { valid: true }, localEnvironment);
  assert.equal(result.classification, 'mode-failure');
  assert.ok(result.failures.some((failure) => failure.predicate === 'required-profile-warm'));
  assert.ok(result.failures.some((failure) => failure.predicate === 'cold-to-warm-decay'));
});
