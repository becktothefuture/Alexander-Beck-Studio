const DEFAULT_RECORD_LIMIT = 64;

function freezeRecord(record) {
  return Object.freeze({ ...record });
}

function changed(current, patch) {
  return Object.entries(patch).some(([key, value]) => current[key] !== value);
}

export function createAboutNarrativeRuntimeDiagnostics({
  initial = {},
  maxRecords = DEFAULT_RECORD_LIMIT,
  now = () => Date.now(),
} = {}) {
  if (!Number.isInteger(maxRecords) || maxRecords < 1) {
    throw new TypeError('Runtime diagnostics maxRecords must be a positive integer.');
  }

  const listeners = new Set();
  const lifecycle = { ...initial };
  const metrics = {};
  const records = [];
  let revision = 0;
  let recordId = 0;
  let cachedSnapshot = null;
  let disposed = false;

  const invalidate = () => {
    revision += 1;
    cachedSnapshot = null;
  };

  const emit = () => {
    [...listeners].forEach((listener) => listener());
  };

  const getSnapshot = () => {
    if (cachedSnapshot) return cachedSnapshot;
    cachedSnapshot = Object.freeze({
      ...lifecycle,
      disposed,
      metrics: Object.freeze({ ...metrics }),
      records: Object.freeze(records.map(freezeRecord)),
      revision,
    });
    return cachedSnapshot;
  };

  const recordLifecycle = (type, patch = {}) => {
    if (disposed) return false;
    const nextPatch = { ...patch };
    const stateChanged = changed(lifecycle, nextPatch);
    Object.assign(lifecycle, nextPatch);
    records.push({ id: ++recordId, type, at: now(), ...nextPatch });
    while (records.length > maxRecords) records.shift();
    invalidate();
    emit();
    return stateChanged;
  };

  const recordMetrics = (patch = {}) => {
    if (disposed || !changed(metrics, patch)) return false;
    Object.assign(metrics, patch);
    invalidate();
    return true;
  };

  const subscribe = (listener) => {
    if (typeof listener !== 'function') throw new TypeError('Runtime diagnostic subscribers must be functions.');
    if (disposed) return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const dispose = ({ emit: shouldEmit = true } = {}) => {
    if (disposed) return;
    disposed = true;
    invalidate();
    if (shouldEmit) emit();
    listeners.clear();
  };

  return Object.freeze({
    dispose,
    getSnapshot,
    recordLifecycle,
    recordMetrics,
    subscribe,
  });
}

export function projectAboutNarrativeRuntimeMetrics(snapshot = {}) {
  const metrics = snapshot.metrics || {};
  return {
    correspondenceSequenceState: snapshot.state || 'idle',
    correspondencePairId: snapshot.installedPairId || '',
    correspondenceToWorldId: snapshot.installedWorldId || '',
    correspondenceRequestedStrategy: snapshot.requestedStrategy || '',
    correspondenceInstalledStrategy: snapshot.installedStrategy || '',
    correspondenceFallback: snapshot.fallbackReason || '',
    correspondencePreparationDurationMs: Number(metrics.preparationDurationMs || 0),
    correspondenceMainThreadApplicationMs: Number(metrics.installDurationMs || 0),
    correspondenceWorkerDurationMs: Number(metrics.workerDurationMs || 0),
    cacheEntries: Number(snapshot.shapeCacheEntries || 0),
    sequenceCacheEntries: Number(snapshot.sequenceCacheEntries || 0),
    bufferRebuilds: Number(snapshot.installCount || 0),
  };
}
