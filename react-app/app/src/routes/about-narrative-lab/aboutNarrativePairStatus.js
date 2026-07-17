const STATES = new Set(['idle', 'preparing', 'ready', 'fallback', 'failed']);

function normalizeState(record) {
  if (!record) return 'idle';
  if (record.state === 'ready' && record.fallbackReason) return 'fallback';
  return STATES.has(record.state) ? record.state : 'idle';
}
export function getAboutNarrativePairDescriptor(plan, worldId) {
  return plan?.worldPreparationDescriptor?.pairs?.find((pair) => pair.toWorldId === worldId) || null;
}

export function resolveAboutNarrativePairStatus({ plan, worldId, sectionId, diagnostics }) {
  const descriptor = getAboutNarrativePairDescriptor(plan, worldId || sectionId);
  if (!descriptor) return Object.freeze({ state: 'idle', descriptor: null, record: null, exact: false });
  const records = Array.isArray(diagnostics?.pairs) ? diagnostics.pairs : [];
  const record = records.find((candidate) => (
    candidate.pairId === descriptor.id
    && candidate.inputFingerprint === descriptor.inputFingerprint
  )) || null;
  if (!record) {
    return Object.freeze({
      state: 'idle',
      descriptor,
      record: null,
      exact: false,
      message: 'Not prepared for this exact World pair.',
    });
  }
  const state = normalizeState(record);
  return Object.freeze({
    state,
    descriptor,
    record,
    exact: true,
    message: state === 'fallback'
      ? `Compatible fallback installed: ${record.fallbackReason}`
      : state === 'failed'
        ? record.message || 'Preparation failed for this World pair.'
        : state === 'preparing'
          ? 'Preparing this World pair.'
          : state === 'ready'
            ? record.source === 'cache' ? 'Ready from cache.' : 'Ready.'
            : 'Waiting to prepare this World pair.',
  });
}

export function createAboutNarrativeDiagnosticExport(status, { includeDetail = false } = {}) {
  const record = status?.record || {};
  const payload = {
    pairId: status?.descriptor?.id || record.pairId || '',
    inputFingerprint: status?.descriptor?.inputFingerprint || record.inputFingerprint || '',
    state: status?.state || 'idle',
    generation: Number(record.generation || 0),
    requestedStrategy: record.requestedStrategy || '',
    installedStrategy: record.installedStrategy || '',
    fallbackReason: record.fallbackReason || '',
    attempts: Number(record.attempts || 0),
    durationMs: Number(record.durationMs || 0),
    source: record.source || '',
    cacheTier: record.cacheTier || '',
    diagnosticIds: Array.isArray(record.diagnosticIds) ? record.diagnosticIds.slice(0, 100) : [],
    ...(includeDetail && record.detail ? { detail: record.detail } : {}),
  };
  const serialized = JSON.stringify(payload, null, 2);
  if (new TextEncoder().encode(serialized).byteLength > 256 * 1024) {
    throw new Error('The bounded diagnostic export exceeds 256KiB.');
  }
  return `${serialized}\n`;
}
