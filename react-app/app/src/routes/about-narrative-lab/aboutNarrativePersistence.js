import {
  ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES,
  ABOUT_NARRATIVE_EDITOR_HEADER,
} from './aboutNarrativeDefinitions.js';
import {
  ABOUT_NARRATIVE_CHECKPOINTS_KEY,
  ABOUT_NARRATIVE_RECOVERY_KEY,
} from './aboutNarrativeLabData.js';
import {
  ABOUT_NARRATIVE_TRACK_ENVELOPE_VERSION,
  loadAboutNarrativeTrackSource,
  migrateAboutNarrativeTrackCheckpointEnvelope,
  migrateAboutNarrativeTrackRecoveryEnvelope,
  preflightAboutNarrativeTrackRuntimePlans,
  serializeAboutNarrativeTrackSource,
} from './aboutNarrativeTrackPersistence.js';

export {
  compareAboutNarrativeDocuments,
} from './aboutNarrativeEditorHardening.js';

export const ABOUT_NARRATIVE_RECOVERY_MAX_AGE_MS = 14 * 86400000;

const ENDPOINT = '/api/about-narrative/config';
const MAX_CHECKPOINTS = 20;

const clone = (value) => (value === undefined ? undefined : structuredClone(value));

function parseHash(response, payload) {
  return payload.hash || response.headers.get('ETag')?.replaceAll('"', '') || '';
}

function createPersistenceError(result, fallback) {
  const error = new Error(result?.message || fallback || 'The About Narrative source is not usable.');
  error.name = 'AboutNarrativeValidationError';
  error.code = result?.readOnly ? 'future-schema' : 'invalid-source';
  error.diagnostics = clone(result?.diagnostics || []);
  error.original = clone(result?.original);
  error.result = result;
  return error;
}

function parseAuthoredPayload(source) {
  const loaded = loadAboutNarrativeTrackSource(source, {
    preflight: preflightAboutNarrativeTrackRuntimePlans,
  });
  if (!loaded.valid) {
    throw createPersistenceError(
      loaded,
      loaded.readOnly
        ? 'The canonical document uses a newer schema and is read-only in this editor.'
        : 'The canonical document is invalid and cannot be edited.',
    );
  }
  return loaded;
}

function parseEnvelopeForDisplay(raw) {
  try {
    return typeof raw === 'string' ? JSON.parse(raw) : clone(raw);
  } catch {
    return null;
  }
}

function assertDocumentSize(serialized) {
  if (new TextEncoder().encode(serialized).byteLength > ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES) {
    throw new Error('Draft storage failed: the About document exceeds 1MiB.');
  }
}

export async function loadAboutNarrativeSource() {
  const response = await fetch(ENDPOINT, {
    headers: { 'X-ABS-Editor': ABOUT_NARRATIVE_EDITOR_HEADER },
    cache: 'no-store',
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Could not load the canonical document (${response.status}).`);
    error.status = response.status;
    error.diagnostics = payload.diagnostics || [];
    throw error;
  }
  const loaded = parseAuthoredPayload(payload.document);
  return {
    document: loaded.document,
    original: loaded.original,
    migrations: loaded.migrations,
    hash: parseHash(response, payload),
  };
}

export async function saveAboutNarrativeSource(document, baselineHash) {
  const serialized = serializeAboutNarrativeTrackSource(document, {
    preflight: preflightAboutNarrativeTrackRuntimePlans,
  });
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-ABS-Editor': ABOUT_NARRATIVE_EDITOR_HEADER,
      'If-Match': baselineHash,
    },
    body: serialized,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.message || `Save failed (${response.status}).`);
    error.status = response.status;
    error.diagnostics = payload.diagnostics || [];
    error.currentHash = payload.currentHash || '';
    throw error;
  }
  const persisted = parseAuthoredPayload(payload.document);
  return { document: persisted.document, hash: parseHash(response, payload) };
}

export function exportAboutNarrativeDocument(document, name = 'contents-about.json', { preserveOriginal = false } = {}) {
  let serialized;
  if (preserveOriginal && typeof document === 'string') serialized = document;
  else if (preserveOriginal) serialized = `${JSON.stringify(document, null, 2)}\n`;
  else serialized = serializeAboutNarrativeTrackSource(document, {
    preflight: preflightAboutNarrativeTrackRuntimePlans,
  });
  const url = URL.createObjectURL(new Blob([serialized], { type: 'application/json' }));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function classifyAboutNarrativeRecoveryDraft(raw, {
  baselineHash = '',
  now = Date.now(),
  maximumAgeMs = ABOUT_NARRATIVE_RECOVERY_MAX_AGE_MS,
} = {}) {
  const displayEnvelope = parseEnvelopeForDisplay(raw);
  const migrated = migrateAboutNarrativeTrackRecoveryEnvelope(raw, {
    preflight: preflightAboutNarrativeTrackRuntimePlans,
  });
  if (!migrated.valid) {
    const unreadable = migrated.diagnostics?.some((item) => (
      item.code === 'json-parse' || item.code === 'envelope'
    ));
    return Object.freeze({
      status: migrated.readOnly ? 'future' : unreadable ? 'unreadable' : 'invalid',
      available: true,
      envelope: displayEnvelope,
      original: clone(migrated.source?.original ?? displayEnvelope?.document ?? migrated.original),
      diagnostics: clone(migrated.diagnostics || []),
      reason: migrated.message,
    });
  }
  const { envelope } = migrated;
  if (Number(now) - envelope.timestamp > maximumAgeMs) {
    return Object.freeze({
      status: 'expired',
      available: true,
      envelope,
      original: clone(migrated.source.original),
      diagnostics: [],
      reason: 'This recovery draft is older than 14 days.',
    });
  }
  const stale = Boolean(baselineHash && envelope.baseSourceHash !== baselineHash);
  return Object.freeze({
    status: stale ? 'stale' : 'current',
    available: true,
    envelope,
    document: clone(envelope.document),
    original: clone(migrated.source.original),
    migrations: clone(migrated.migrations || []),
    diagnostics: [],
    reason: stale ? 'The canonical source changed after this draft was created.' : '',
  });
}

export function readAboutNarrativeRecoveryDraft(options = {}) {
  const raw = localStorage.getItem(ABOUT_NARRATIVE_RECOVERY_KEY);
  if (raw == null) return null;
  return classifyAboutNarrativeRecoveryDraft(raw, options);
}

export function writeAboutNarrativeRecoveryDraft(document, baselineHash, metadata = {}) {
  const serializedDocument = serializeAboutNarrativeTrackSource(document, {
    preflight: preflightAboutNarrativeTrackRuntimePlans,
  });
  assertDocumentSize(serializedDocument);

  const existingRaw = localStorage.getItem(ABOUT_NARRATIVE_RECOVERY_KEY);
  if (existingRaw != null) {
    const existing = migrateAboutNarrativeTrackRecoveryEnvelope(existingRaw, {
      preflight: preflightAboutNarrativeTrackRuntimePlans,
    });
    if (!existing.valid) {
      throw new Error('Draft storage is protected because the existing recovery source is invalid or from a newer editor. Export or discard it first.');
    }
  }

  const candidate = {
    envelopeVersion: ABOUT_NARRATIVE_TRACK_ENVELOPE_VERSION,
    kind: 'recovery',
    baseSourceHash: String(baselineHash || ''),
    timestamp: Number(metadata.timestamp ?? Date.now()),
    document: JSON.parse(serializedDocument),
    ...(metadata.selection ? { selection: clone(metadata.selection) } : {}),
    ...(Number.isFinite(metadata.storyWU) ? { storyWU: Number(metadata.storyWU) } : {}),
  };
  const migrated = migrateAboutNarrativeTrackRecoveryEnvelope(candidate, {
    preflight: preflightAboutNarrativeTrackRuntimePlans,
  });
  if (!migrated.valid) throw createPersistenceError(migrated, 'The recovery draft is invalid.');
  localStorage.setItem(ABOUT_NARRATIVE_RECOVERY_KEY, JSON.stringify(migrated.envelope));
  return migrated.envelope;
}

export function clearAboutNarrativeRecoveryDraft() {
  localStorage.removeItem(ABOUT_NARRATIVE_RECOVERY_KEY);
}

function parseStoredCheckpoints() {
  const raw = localStorage.getItem(ABOUT_NARRATIVE_CHECKPOINTS_KEY);
  if (raw == null) return [];
  let checkpoints;
  try {
    checkpoints = JSON.parse(raw);
  } catch (error) {
    const wrapped = new Error(`Checkpoint storage is unreadable: ${error.message}`);
    wrapped.original = raw;
    throw wrapped;
  }
  if (!Array.isArray(checkpoints)) {
    const error = new Error('Checkpoint storage is invalid: expected an array.');
    error.original = clone(checkpoints);
    throw error;
  }
  return checkpoints;
}

function migrateStoredCheckpoints({ strict = false } = {}) {
  const checkpoints = parseStoredCheckpoints();
  const resolved = [];
  checkpoints.forEach((checkpoint) => {
    const migrated = migrateAboutNarrativeTrackCheckpointEnvelope(checkpoint, {
      preflight: preflightAboutNarrativeTrackRuntimePlans,
    });
    if (migrated.valid) resolved.push(migrated.envelope);
    else if (strict) {
      throw new Error('Checkpoint storage is protected because it contains invalid or newer-editor data.');
    }
  });
  return resolved;
}

export function readAboutNarrativeCheckpoints() {
  try {
    return migrateStoredCheckpoints();
  } catch {
    return [];
  }
}

export function writeAboutNarrativeCheckpoint(checkpoint) {
  const serializedDocument = serializeAboutNarrativeTrackSource(checkpoint?.document, {
    preflight: preflightAboutNarrativeTrackRuntimePlans,
  });
  assertDocumentSize(serializedDocument);
  const candidate = {
    ...clone(checkpoint),
    envelopeVersion: ABOUT_NARRATIVE_TRACK_ENVELOPE_VERSION,
    kind: 'checkpoint',
    document: JSON.parse(serializedDocument),
  };
  const migrated = migrateAboutNarrativeTrackCheckpointEnvelope(candidate, {
    preflight: preflightAboutNarrativeTrackRuntimePlans,
  });
  if (!migrated.valid) throw createPersistenceError(migrated, 'The checkpoint is invalid.');
  const checkpoints = [migrated.envelope, ...migrateStoredCheckpoints({ strict: true })]
    .slice(0, MAX_CHECKPOINTS);
  localStorage.setItem(ABOUT_NARRATIVE_CHECKPOINTS_KEY, JSON.stringify(checkpoints));
  return checkpoints;
}
