export const RUNTIME_PERFORMANCE_SCHEMA_VERSION = 5;
export const MINIMUM_SAMPLE_MS = 5_000;
export const MINIMUM_REPEAT_COUNT = 3;
export const DEFAULT_PROFILES = Object.freeze(['cold', 'warm']);

const PROFILE_NAMES = new Set(DEFAULT_PROFILES);

export function resolveCertificationSurface(env = process.env) {
  const externalUrl = String(env.ABS_DEV_URL || '').trim().replace(/\/+$/, '');
  if (externalUrl) {
    let url;
    try {
      url = new URL(externalUrl);
    } catch {
      throw new Error(`ABS_DEV_URL must be an absolute HTTP(S) URL; received ${externalUrl}.`);
    }
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new Error(`ABS_DEV_URL must use HTTP(S); received ${url.protocol}`);
    }
    return {
      type: 'external-url-diagnostic',
      baseUrl: externalUrl,
      owned: false,
      buildRequired: false,
    };
  }
  return {
    type: 'owned-production-preview',
    baseUrl: null,
    owned: true,
    buildRequired: env.ABS_PERF_SKIP_BUILD !== '1',
  };
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

export function median(values) {
  const sorted = values.map(finiteNumber).filter((value) => value !== null).sort((a, b) => a - b);
  if (!sorted.length) return null;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function medianAbsoluteDeviation(values) {
  const centre = median(values);
  if (centre === null) return null;
  return median(values.map((value) => Math.abs(Number(value) - centre)));
}

export function normalizeCadence({ measuredFps, targetFps, observedRefreshHz }) {
  const rawMeasuredFps = finiteNumber(measuredFps);
  const target = finiteNumber(targetFps);
  const refresh = finiteNumber(observedRefreshHz);
  const ceilings = [target, refresh].filter((value) => value !== null && value > 0);
  const cadenceCeilingFps = ceilings.length ? Math.min(...ceilings) : null;
  const cappedMeasuredFps = rawMeasuredFps === null
    ? null
    : (cadenceCeilingFps === null ? rawMeasuredFps : Math.min(rawMeasuredFps, cadenceCeilingFps));
  return {
    rawMeasuredFps,
    cadenceCeilingFps,
    cappedMeasuredFps,
    overRenderFps: rawMeasuredFps !== null && cadenceCeilingFps !== null
      ? Math.max(0, rawMeasuredFps - cadenceCeilingFps)
      : null,
  };
}

export function parsePerformanceContract(env = process.env) {
  const profiles = String(env.ABS_PERF_PROFILES || DEFAULT_PROFILES.join(','))
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const unknownProfiles = profiles.filter((profile) => !PROFILE_NAMES.has(profile));
  if (unknownProfiles.length) {
    throw new Error(`Unsupported ABS_PERF_PROFILES values: ${unknownProfiles.join(', ')}; use cold,warm.`);
  }
  if (!profiles.length) throw new Error('ABS_PERF_PROFILES must select at least one profile.');

  const requestedSampleMs = finiteNumber(env.ABS_PERF_SAMPLE_MS) ?? 5_000;
  const requestedRepeatCount = finiteNumber(env.ABS_PERF_REPEAT_COUNT) ?? 3;
  if (requestedSampleMs < MINIMUM_SAMPLE_MS) {
    throw new Error(`ABS_PERF_SAMPLE_MS must be at least ${MINIMUM_SAMPLE_MS}ms; received ${requestedSampleMs}.`);
  }
  if (!Number.isInteger(requestedRepeatCount) || requestedRepeatCount < MINIMUM_REPEAT_COUNT) {
    throw new Error(`ABS_PERF_REPEAT_COUNT must be an integer of at least ${MINIMUM_REPEAT_COUNT}; received ${requestedRepeatCount}.`);
  }

  const coldSettleMs = Math.max(500, finiteNumber(env.ABS_PERF_COLD_SETTLE_MS ?? env.ABS_PERF_SETTLE_MS) ?? 2_000);
  const warmupMs = Math.max(coldSettleMs, finiteNumber(env.ABS_PERF_WARMUP_MS) ?? 10_000);
  const localControlSampleMs = Math.max(1_000, finiteNumber(env.ABS_PERF_LOCAL_CONTROL_SAMPLE_MS) ?? 2_000);
  const localControlSettleMs = Math.max(0, finiteNumber(env.ABS_PERF_LOCAL_CONTROL_SETTLE_MS) ?? 250);
  return {
    profiles: [...new Set(profiles)],
    sampleMs: requestedSampleMs,
    repeatCount: requestedRepeatCount,
    profileDefinitions: {
      cold: {
        context: 'fresh browser context and page for every repeat',
        start: `sample ${coldSettleMs}ms after the owned runtime reports ready`,
        preSampleDelayMs: coldSettleMs,
      },
      warm: {
        context: 'fresh browser context and page for every repeat',
        start: `sample ${warmupMs}ms after the owned runtime reports ready`,
        preSampleDelayMs: warmupMs,
      },
    },
    localEnvironmentControls: {
      surface: 'about:blank static requestAnimationFrame control',
      placement: 'one fresh-context control immediately before and after each mode block',
      sampleMs: localControlSampleMs,
      preSampleDelayMs: localControlSettleMs,
      thresholds: 'same refresh, p95, p99, and browser-error thresholds as the certification contract',
    },
    thresholds: {
      minimumFps: Math.max(1, finiteNumber(env.ABS_PERF_MIN_FPS) ?? 58),
      maximumP95Ms: Math.max(1, finiteNumber(env.ABS_PERF_MAX_P95_MS) ?? 20),
      maximumP99Ms: Math.max(1, finiteNumber(env.ABS_PERF_MAX_P99_MS) ?? 33.4),
      maximumWarmDecayPercent: Math.max(0, finiteNumber(env.ABS_PERF_MAX_DECAY_PERCENT) ?? 5),
      minimumObservedRefreshHz: Math.max(1, finiteNumber(env.ABS_PERF_MIN_REFRESH_HZ) ?? 50),
    },
    selectedBaseline: {
      id: String(env.ABS_PERF_BASELINE_ID || 'mobile-emulation-60hz-v1'),
      source: env.ABS_PERF_BASELINE_ID ? 'environment override' : 'repository audit default',
      gateStatistic: 'median across independent repeats',
      variabilityStatistic: 'median absolute deviation',
      cadenceNormalization: 'min(raw measured cadence, target FPS, observed refresh Hz)',
      renderCounterSemantic: 'render invocations, not presented frames',
      requiredProfiles: [...new Set(profiles)],
    },
  };
}

export function evaluateRepeat(sample, contract, { requiresContinuousFrames }) {
  const failures = [];
  const add = (predicate, actual, expected, reason) => failures.push({ predicate, actual, expected, reason });
  const refreshHz = finiteNumber(sample.observedRefreshHz);
  const measuredFps = finiteNumber(sample.cappedMeasuredFps);

  if (sample.actualDurationMs < contract.sampleMs) {
    add('minimum-sample-duration', sample.actualDurationMs, `>= ${contract.sampleMs}`, 'The measured interval was shorter than the certified minimum.');
  }
  if (sample.ownership?.matched !== true || sample.ownership?.candidateCount !== 1) {
    add('exact-runtime-ownership', sample.ownership, 'one owned canvas and its declared runtime hook', 'The audit could not prove unique canvas/runtime ownership.');
  }
  if (refreshHz === null || refreshHz < contract.thresholds.minimumObservedRefreshHz) {
    add('refresh-calibration', refreshHz, `>= ${contract.thresholds.minimumObservedRefreshHz}Hz`, 'Observed rAF cadence cannot support a trustworthy 60Hz performance certification.');
  }
  if (measuredFps === null || measuredFps < contract.thresholds.minimumFps) {
    add('minimum-fps', measuredFps, `>= ${contract.thresholds.minimumFps}`, 'Refresh-normalized renderer cadence is below the selected baseline.');
  }
  if (sample.p95Ms === null || sample.p95Ms > contract.thresholds.maximumP95Ms) {
    add('p95-frame-time', sample.p95Ms, `<= ${contract.thresholds.maximumP95Ms}ms`, 'The slowest five percent of rAF intervals exceed the selected baseline.');
  }
  if (sample.p99Ms === null || sample.p99Ms > contract.thresholds.maximumP99Ms) {
    add('p99-frame-time', sample.p99Ms, `<= ${contract.thresholds.maximumP99Ms}ms`, 'The slowest one percent of rAF intervals exceed the selected baseline.');
  }
  if (sample.throttleLevel !== null && sample.throttleLevel !== undefined && Number(sample.throttleLevel) !== 0) {
    add('no-adaptive-throttle', sample.throttleLevel, '0 or null', 'The runtime reduced quality during the sample.');
  }
  if (requiresContinuousFrames && sample.renderInvocationFps === null) {
    add('continuous-render-invocation-evidence', sample.renderInvocationFps, 'finite render-invocation FPS', 'The owned canvas did not expose a usable render-invocation counter.');
  }
  if ((sample.consoleErrors?.length || 0) > 0) {
    add('no-console-errors', sample.consoleErrors, '[]', 'The page emitted console errors during this repeat.');
  }
  if ((sample.pageErrors?.length || 0) > 0) {
    add('no-page-errors', sample.pageErrors, '[]', 'The page raised uncaught errors during this repeat.');
  }
  return { passed: failures.length === 0, failures };
}

export function aggregateProfile(repeats, contract) {
  const metrics = [
    'measuredFps',
    'rawMeasuredFps',
    'cappedMeasuredFps',
    'cadenceCeilingFps',
    'renderInvocationFps',
    'renderedFps',
    'rafFps',
    'runtimeFps',
    'p95Ms',
    'p99Ms',
    'longestGapMs',
    'observedRefreshHz',
  ];
  const aggregate = {};
  for (const metric of metrics) {
    const values = repeats.map((repeat) => repeat[metric]).filter((value) => finiteNumber(value) !== null);
    aggregate[metric] = median(values);
    aggregate[`${metric}Mad`] = medianAbsoluteDeviation(values);
  }

  const failures = [];
  const add = (predicate, actual, expected, reason) => failures.push({ predicate, actual, expected, reason });
  if (repeats.length < contract.repeatCount) {
    add('minimum-repeat-count', repeats.length, `>= ${contract.repeatCount}`, 'The profile has too few independent repeats.');
  }
  const failedRepeatNumbers = repeats
    .map((repeat, index) => repeat.passed === true ? null : index + 1)
    .filter((value) => value !== null);
  if (failedRepeatNumbers.length > 0) {
    add(
      'all-repeats-pass',
      failedRepeatNumbers,
      'every repeat passes every predicate',
      'Release certification does not discard or excuse a failed repeat as an outlier.',
    );
  }
  if (repeats.some((repeat) => repeat.ownership?.matched !== true || repeat.ownership?.candidateCount !== 1)) {
    add('exact-runtime-ownership-all-repeats', 'not satisfied', 'one owned canvas per repeat', 'At least one repeat had missing or ambiguous canvas/runtime ownership.');
  }
  if (repeats.some((repeat) => repeat.actualDurationMs < contract.sampleMs)) {
    add('minimum-sample-duration-all-repeats', 'not satisfied', `>= ${contract.sampleMs}ms`, 'At least one repeat was shorter than the contract.');
  }
  if (repeats.some((repeat) => repeat.requiresContinuousFrames && repeat.renderInvocationFps === null)) {
    add('continuous-render-invocation-evidence-all-repeats', 'not satisfied', 'finite render-invocation FPS in every repeat', 'At least one continuous renderer lacked owned canvas render-invocation evidence.');
  }
  if (repeats.some((repeat) => repeat.throttleLevel !== null
    && repeat.throttleLevel !== undefined
    && Number(repeat.throttleLevel) !== 0)) {
    add('no-adaptive-throttle-all-repeats', 'not satisfied', '0 or null in every repeat', 'At least one repeat reduced runtime quality.');
  }
  if (aggregate.observedRefreshHz === null || aggregate.observedRefreshHz < contract.thresholds.minimumObservedRefreshHz) {
    add('median-refresh-calibration', aggregate.observedRefreshHz, `>= ${contract.thresholds.minimumObservedRefreshHz}Hz`, 'Median observed rAF cadence cannot support certification.');
  }
  if (aggregate.cappedMeasuredFps === null || aggregate.cappedMeasuredFps < contract.thresholds.minimumFps) {
    add('median-minimum-fps', aggregate.cappedMeasuredFps, `>= ${contract.thresholds.minimumFps}`, 'Median refresh-normalized renderer cadence is below the selected baseline.');
  }
  if (aggregate.p95Ms === null || aggregate.p95Ms > contract.thresholds.maximumP95Ms) {
    add('median-p95-frame-time', aggregate.p95Ms, `<= ${contract.thresholds.maximumP95Ms}ms`, 'Median p95 frame time exceeds the selected baseline.');
  }
  if (aggregate.p99Ms === null || aggregate.p99Ms > contract.thresholds.maximumP99Ms) {
    add('median-p99-frame-time', aggregate.p99Ms, `<= ${contract.thresholds.maximumP99Ms}ms`, 'Median p99 frame time exceeds the selected baseline.');
  }
  if (repeats.some((repeat) => (repeat.consoleErrors?.length || 0) > 0 || (repeat.pageErrors?.length || 0) > 0)) {
    add('error-free-all-repeats', 'not satisfied', 'no browser errors', 'At least one repeat emitted a console or page error.');
  }
  return { repeatCount: repeats.length, aggregate, passed: failures.length === 0, failures };
}

export function evaluateMode(profiles, contract, environmentCalibration = null, localEnvironmentCalibration = null) {
  if (environmentCalibration?.valid === false) {
    return {
      passed: false,
      classification: 'environment-invalid',
      warmDecayPercent: null,
      failures: [{
        predicate: 'environment-calibration',
        actual: environmentCalibration.failures,
        expected: 'valid static rAF control for every selected profile',
        reason: 'The host/browser cadence was invalid, so the audit does not attribute a performance failure to the mode.',
      }],
      overRenderFollowUp: null,
    };
  }
  if (localEnvironmentCalibration?.valid !== true) {
    return {
      passed: false,
      classification: 'environment-invalid',
      warmDecayPercent: null,
      failures: [{
        predicate: 'local-environment-calibration',
        actual: localEnvironmentCalibration?.failures || 'missing',
        expected: 'valid pre and post static rAF controls adjacent to this mode block',
        reason: 'The local host/browser cadence was invalid, so the audit does not attribute a performance failure to the mode.',
      }],
      overRenderFollowUp: null,
    };
  }
  const failures = [];
  for (const requiredProfile of contract.selectedBaseline.requiredProfiles) {
    const profile = profiles[requiredProfile];
    if (!profile) {
      failures.push({
        predicate: `required-profile-${requiredProfile}`,
        actual: 'missing',
        expected: 'present and passing',
        reason: `The selected baseline requires the ${requiredProfile} profile.`,
      });
    } else if (!profile.passed) {
      failures.push({
        predicate: `required-profile-${requiredProfile}`,
        actual: 'failed',
        expected: 'passing',
        reason: `The ${requiredProfile} profile failed one or more aggregate predicates.`,
      });
    }
  }
  const coldFps = profiles.cold?.aggregate?.cappedMeasuredFps;
  const warmFps = profiles.warm?.aggregate?.cappedMeasuredFps;
  const warmDecayPercent = coldFps > 0 && warmFps !== null && warmFps !== undefined
    ? Math.max(0, (coldFps - warmFps) / coldFps * 100)
    : null;
  if (warmDecayPercent !== null && warmDecayPercent > contract.thresholds.maximumWarmDecayPercent) {
    failures.push({
      predicate: 'cold-to-warm-decay',
      actual: warmDecayPercent,
      expected: `<= ${contract.thresholds.maximumWarmDecayPercent}%`,
      reason: 'Warm median cadence decayed beyond the selected baseline relative to cold cadence.',
    });
  }
  const overRenderProfiles = Object.entries(profiles).flatMap(([profileName, profile]) => {
    const raw = profile?.aggregate?.renderInvocationFps;
    const capped = profile?.aggregate?.cappedMeasuredFps;
    return raw !== null && raw !== undefined && capped !== null && capped !== undefined && raw > capped
      ? [{ profile: profileName, rawRenderInvocationFps: raw, cappedMeasuredFps: capped, excessFps: raw - capped }]
      : [];
  });
  return {
    passed: failures.length === 0,
    classification: failures.length === 0 ? 'mode-pass' : 'mode-failure',
    warmDecayPercent,
    failures,
    overRenderFollowUp: overRenderProfiles.length ? {
      classification: 'non-gating-render-invocation-follow-up',
      reason: 'Canvas counters measure render invocations, which can exceed the target or display cadence and do not prove extra presented frames.',
      profiles: overRenderProfiles,
    } : null,
  };
}

export function evaluateRafControlRepeat(sample, contract, { minimumDurationMs = contract.sampleMs } = {}) {
  const failures = [];
  const add = (predicate, actual, expected, reason) => failures.push({ predicate, actual, expected, reason });
  if (sample.actualDurationMs < minimumDurationMs) {
    add('control-minimum-sample-duration', sample.actualDurationMs, `>= ${minimumDurationMs}`, 'The static rAF control was shorter than its declared measurement window.');
  }
  if (sample.observedRefreshHz === null || sample.observedRefreshHz < contract.thresholds.minimumObservedRefreshHz) {
    add('control-refresh-calibration', sample.observedRefreshHz, `>= ${contract.thresholds.minimumObservedRefreshHz}Hz`, 'Static rAF cadence cannot support certification.');
  }
  if (sample.p95Ms === null || sample.p95Ms > contract.thresholds.maximumP95Ms) {
    add('control-p95-frame-time', sample.p95Ms, `<= ${contract.thresholds.maximumP95Ms}ms`, 'Static rAF p95 exceeds the unchanged cadence threshold.');
  }
  if (sample.p99Ms === null || sample.p99Ms > contract.thresholds.maximumP99Ms) {
    add('control-p99-frame-time', sample.p99Ms, `<= ${contract.thresholds.maximumP99Ms}ms`, 'Static rAF p99 exceeds the unchanged cadence threshold.');
  }
  if ((sample.consoleErrors?.length || 0) > 0 || (sample.pageErrors?.length || 0) > 0) {
    add('control-error-free', { consoleErrors: sample.consoleErrors, pageErrors: sample.pageErrors }, 'no browser errors', 'The static rAF control emitted a browser error.');
  }
  return { passed: failures.length === 0, failures };
}

export function evaluateLocalEnvironmentCalibration(controls) {
  const failures = [];
  for (const phase of ['pre', 'post']) {
    const control = controls?.[phase];
    if (!control || control.passed !== true) {
      failures.push({
        predicate: `local-static-raf-${phase}`,
        actual: control?.failures || 'missing',
        expected: 'passing',
        reason: `The ${phase}-mode static rAF control did not establish a valid local environment.`,
      });
    }
  }
  return {
    valid: failures.length === 0,
    classification: failures.length ? 'environment-invalid' : 'environment-valid',
    failures,
  };
}

export function aggregateRafControlProfile(repeats, contract) {
  const aggregate = {};
  for (const metric of ['rafFps', 'observedRefreshHz', 'p95Ms', 'p99Ms', 'longestGapMs']) {
    const values = repeats.map((repeat) => repeat[metric]).filter((value) => finiteNumber(value) !== null);
    aggregate[metric] = median(values);
    aggregate[`${metric}Mad`] = medianAbsoluteDeviation(values);
  }
  const failedRepeats = repeats.map((repeat, index) => repeat.passed ? null : index + 1).filter(Boolean);
  const failures = [];
  if (repeats.length < contract.repeatCount) failures.push({ predicate: 'control-minimum-repeat-count', actual: repeats.length, expected: `>= ${contract.repeatCount}`, reason: 'Static rAF control has too few repeats.' });
  if (failedRepeats.length) failures.push({ predicate: 'control-all-repeats-pass', actual: failedRepeats, expected: 'every control repeat passes', reason: 'An invalid control repeat makes this profile environment-invalid.' });
  return { repeatCount: repeats.length, aggregate, passed: failures.length === 0, failures };
}

export function evaluateEnvironmentCalibration(profiles, contract) {
  const failures = [];
  for (const profileName of contract.profiles) {
    const profile = profiles[profileName];
    if (!profile || !profile.passed) {
      failures.push({
        predicate: `static-raf-${profileName}`,
        actual: profile?.failures || 'missing',
        expected: 'passing',
        reason: `The ${profileName} static rAF control did not establish a valid environment.`,
      });
    }
  }
  return { valid: failures.length === 0, classification: failures.length ? 'environment-invalid' : 'environment-valid', failures };
}
