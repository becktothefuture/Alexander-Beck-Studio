export const GEOMETRY_DEVICE_PIXEL_TOLERANCE = 1;

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function median(values) {
  const ordered = values.map(finiteNumber).filter((value) => value !== null).sort((a, b) => a - b);
  if (!ordered.length) return null;
  const middle = Math.floor(ordered.length / 2);
  return ordered.length % 2 ? ordered[middle] : (ordered[middle - 1] + ordered[middle]) / 2;
}

export function aggregateGeometrySamples(samples = [], baselineSamples = [], options = {}) {
  const toleranceDevicePx = finiteNumber(options.toleranceDevicePx) ?? GEOMETRY_DEVICE_PIXEL_TOLERANCE;
  const validBaseline = baselineSamples.filter((sample) => sample?.rect && finiteNumber(sample.devicePixelRatio) > 0);
  const validSamples = samples.filter((sample) => sample?.rect && finiteNumber(sample.devicePixelRatio) > 0);
  const baseline = {
    centerX: median(validBaseline.map((sample) => sample.rect.centerX)),
    centerY: median(validBaseline.map((sample) => sample.rect.centerY)),
  };
  const measurements = validSamples.map((sample) => {
    const dpr = Number(sample.devicePixelRatio);
    const rawCssDelta = Math.max(
      Math.abs(Number(sample.rect.centerX) - baseline.centerX),
      Math.abs(Number(sample.rect.centerY) - baseline.centerY),
    );
    const snappedDeviceDelta = Math.max(
      Math.abs(Math.round(Number(sample.rect.centerX) * dpr) - Math.round(baseline.centerX * dpr)),
      Math.abs(Math.round(Number(sample.rect.centerY) * dpr) - Math.round(baseline.centerY * dpr)),
    );
    return {
      at: finiteNumber(sample.at),
      dpr,
      rawCssDelta,
      rawDeviceDelta: rawCssDelta * dpr,
      snappedDeviceDelta,
      transform: String(sample.transform || 'none'),
    };
  });
  const dprs = [...new Set([...validBaseline, ...validSamples].map((sample) => Number(sample.devicePixelRatio)))];
  const transforms = [...new Set([...validBaseline, ...validSamples].map((sample) => String(sample.transform || 'none')))];
  const maxRawCssDelta = measurements.reduce((max, sample) => Math.max(max, sample.rawCssDelta), 0);
  const maxRawDeviceDelta = measurements.reduce((max, sample) => Math.max(max, sample.rawDeviceDelta), 0);
  const maxSnappedDeviceDelta = measurements.reduce((max, sample) => Math.max(max, sample.snappedDeviceDelta), 0);
  const valid = validBaseline.length >= 3 && validSamples.length >= 3 && dprs.length === 1;
  return {
    valid,
    baselineSampleCount: validBaseline.length,
    sampleCount: validSamples.length,
    baseline,
    devicePixelRatios: dprs,
    computedTransforms: transforms,
    toleranceDevicePx,
    maxRawCssDelta,
    maxRawDeviceDelta,
    maxSnappedDeviceDelta,
    pass: valid && maxSnappedDeviceDelta <= toleranceDevicePx,
    measurements,
  };
}

export function analyzeFaultEvidence({ fault, injection, trace, finalRuntimeId, finalTransaction } = {}) {
  const issues = [];
  const interceptionCount = Number(injection?.interceptionCount || 0);
  const activationCount = Number(injection?.activationCount || 0);
  const injected = fault === 'preload' ? interceptionCount > 0 : activationCount > 0;
  const runtimeEvents = Array.isArray(trace?.runtimeEvents) ? trace.runtimeEvents : [];
  const runtimeStatuses = runtimeEvents.map((event) => event?.detail?.status).filter(Boolean);
  const transactionEvents = Array.isArray(trace?.switchEvents) ? trace.switchEvents : [];
  const transactionTimeline = transactionEvents.map((event) => ({ at: event.at, ...event.detail }));
  const expectedEndpoint = fault === 'atmosphere-first-frame' ? 'settle-incoming' : (
    Number(finalTransaction?.commitCount || 0) > 0 ? 'restore-previous' : 'restore-outgoing'
  );

  if (!injected) issues.push(`invalid-test:fault-not-injected:${fault}`);
  if (fault === 'preload') {
    for (const requiredStatus of ['loading', 'retrying', 'failed']) {
      if (!runtimeStatuses.includes(requiredStatus)) issues.push(`invalid-test:runtime-load-state-missing:${requiredStatus}`);
    }
    if (finalRuntimeId !== 'pit') issues.push(`product-failure:outgoing-runtime-not-restored:${finalRuntimeId || 'none'}`);
    if (Number(finalTransaction?.commitCount || 0) !== 0) issues.push(`product-failure:precommit-commit-count:${finalTransaction?.commitCount}`);
    if (Number(finalTransaction?.publicationCount || 0) !== 0) issues.push(`product-failure:precommit-publication-count:${finalTransaction?.publicationCount}`);
    if (finalTransaction?.status !== 'failed') issues.push(`product-failure:precommit-settlement-status:${finalTransaction?.status || 'none'}`);
  } else if (fault === 'runtime-readiness') {
    if (finalRuntimeId !== 'pit') issues.push(`product-failure:previous-runtime-not-restored:${finalRuntimeId || 'none'}`);
    if (Number(finalTransaction?.commitCount || 0) !== 1) issues.push(`product-failure:recovery-commit-count:${finalTransaction?.commitCount}`);
    if (Number(finalTransaction?.publicationCount || 0) !== 0) issues.push(`product-failure:recovery-publication-count:${finalTransaction?.publicationCount}`);
    if (finalTransaction?.status !== 'recovered') issues.push(`product-failure:recovery-settlement-status:${finalTransaction?.status || 'none'}`);
  } else if (fault === 'atmosphere-first-frame') {
    if (finalRuntimeId !== 'repel-room') issues.push(`product-failure:fail-open-target-not-preserved:${finalRuntimeId || 'none'}`);
    if (Number(finalTransaction?.publicationCount || 0) !== 1) issues.push(`product-failure:fail-open-publication-count:${finalTransaction?.publicationCount}`);
    if (finalTransaction?.status !== 'ready') issues.push(`product-failure:fail-open-settlement-status:${finalTransaction?.status || 'none'}`);
  }
  if (!finalTransaction) issues.push('invalid-test:missing-final-transaction');
  else if (finalTransaction.busy || finalTransaction.phase !== 'idle') issues.push('product-failure:transaction-not-settled');

  return {
    validInjection: injected,
    classification: issues.some((issue) => issue.startsWith('invalid-test:'))
      ? 'invalid-test'
      : (issues.some((issue) => issue.startsWith('product-failure:')) ? 'product-failure' : 'pass'),
    expectedEndpoint,
    runtimeStatuses,
    transactionTimeline,
    finalTransaction: finalTransaction || null,
    rollbackDiagnostics: {
      expectedEndpoint,
      terminalStatus: finalTransaction?.status || '',
      phaseHistory: finalTransaction?.phaseHistory || [],
      commitCount: Number(finalTransaction?.commitCount || 0),
      publicationCount: Number(finalTransaction?.publicationCount || 0),
      error: finalTransaction?.error || '',
      recoveringStatuses: transactionTimeline
        .filter((event) => event.status === 'recovering' || event.status === 'failed')
        .map((event) => event.status),
    },
    issues,
  };
}
