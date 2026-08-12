import {
  ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES,
  ABOUT_NARRATIVE_EDITOR_HEADER,
} from './aboutNarrativeDefinitions.js';
import {
  ABOUT_NARRATIVE_TRACK_ENVELOPE_VERSION,
  loadAboutNarrativeTrackSource,
  migrateAboutNarrativeTrackCheckpointEnvelope,
  migrateAboutNarrativeTrackRecoveryEnvelope,
  preflightAboutNarrativeTrackRuntimePlans,
  serializeAboutNarrativeTrackSource,
} from './aboutNarrativeTrackPersistence.js';
import {
  ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
} from './aboutNarrativeTrackSchema.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
} from './aboutNarrativePointFieldSchema.js';
import {
  loadAboutNarrativePointFieldPersistenceSource,
  migrateAboutNarrativePointFieldCheckpointEnvelope,
  migrateAboutNarrativePointFieldRecoveryEnvelope,
  preflightAboutNarrativePointFieldRuntimePlans,
  serializeAboutNarrativePointFieldSource,
} from './aboutNarrativePointFieldPersistence.js';

export {
  compareAboutNarrativeDocuments,
} from './aboutNarrativeEditorHardening.js';

export const ABOUT_NARRATIVE_RECOVERY_MAX_AGE_MS = 14 * 86400000;
export const ABOUT_NARRATIVE_RECOVERY_KEY = 'abs:about-narrative:recovery:v1';
export const ABOUT_NARRATIVE_CHECKPOINTS_KEY = 'abs:about-narrative:checkpoints:v1';
export const ABOUT_NARRATIVE_LOCAL_SAVE_KEY = 'abs:about-narrative:local-save:v1';

const ENDPOINT = '/api/about-narrative/config';
const MAX_CHECKPOINTS = 20;
const ACTIVE_SCHEMA_VERSION = ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION;

const clone = (value) => (value === undefined ? undefined : structuredClone(value));

function resolvePersistenceBoundary(targetVersion = ACTIVE_SCHEMA_VERSION) {
  if (Number(targetVersion) === ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
    return {
      load: loadAboutNarrativeTrackSource,
      migrateCheckpoint: migrateAboutNarrativeTrackCheckpointEnvelope,
      migrateRecovery: migrateAboutNarrativeTrackRecoveryEnvelope,
      preflight: preflightAboutNarrativeTrackRuntimePlans,
      serialize: serializeAboutNarrativeTrackSource,
    };
  }
  if (Number(targetVersion) === ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION) {
    return {
      load: loadAboutNarrativePointFieldPersistenceSource,
      migrateCheckpoint: migrateAboutNarrativePointFieldCheckpointEnvelope,
      migrateRecovery: migrateAboutNarrativePointFieldRecoveryEnvelope,
      preflight: preflightAboutNarrativePointFieldRuntimePlans,
      serialize: serializeAboutNarrativePointFieldSource,
    };
  }
  throw new TypeError(`About Narrative persistence targetVersion must be ${ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION} or ${ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION}.`);
}

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

function parseAuthoredPayload(source, boundary) {
  const loaded = boundary.load(source, {
    preflight: boundary.preflight,
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

function resolveStorage(storage) {
  const resolved = storage ?? globalThis.localStorage;
  if (!resolved) throw new Error('Local draft storage is unavailable.');
  return resolved;
}

function storageFailure(operation, error) {
  const wrapped = new Error(`${operation} failed: ${error?.message || String(error)}`);
  wrapped.name = 'AboutNarrativeStorageError';
  wrapped.code = error?.name === 'QuotaExceededError'
    ? 'quota'
    : error?.name === 'SecurityError'
      ? 'security'
      : 'storage';
  wrapped.cause = error;
  return wrapped;
}

function hashLocalDocument(serialized, targetVersion) {
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash = Math.imul(hash ^ serialized.charCodeAt(index), 16777619) >>> 0;
  }
  return `local-v${targetVersion}:${hash.toString(16).padStart(8, '0')}`;
}

export async function loadAboutNarrativeSource({
  targetVersion = ACTIVE_SCHEMA_VERSION,
} = {}) {
  const boundary = resolvePersistenceBoundary(targetVersion);
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
  const loaded = parseAuthoredPayload(payload.document, boundary);
  return {
    document: loaded.document,
    original: loaded.original,
    migrations: loaded.migrations,
    hash: parseHash(response, payload),
  };
}

export async function saveAboutNarrativeSource(document, baselineHash, {
  targetVersion = ACTIVE_SCHEMA_VERSION,
} = {}) {
  const boundary = resolvePersistenceBoundary(targetVersion);
  const serialized = boundary.serialize(document, {
    preflight: boundary.preflight,
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
  const persisted = parseAuthoredPayload(payload.document, boundary);
  return { document: persisted.document, hash: parseHash(response, payload) };
}

export function exportAboutNarrativeDocument(document, name = 'contents-about.json', {
  preserveOriginal = false,
  targetVersion = ACTIVE_SCHEMA_VERSION,
} = {}) {
  const serialized = serializeAboutNarrativeDocumentForExport(document, {
    preserveOriginal,
    targetVersion,
  });
  const url = URL.createObjectURL(new Blob([serialized], { type: 'application/json' }));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function serializeAboutNarrativeDocumentForExport(document, {
  preserveOriginal = false,
  targetVersion = ACTIVE_SCHEMA_VERSION,
} = {}) {
  const boundary = resolvePersistenceBoundary(targetVersion);
  if (preserveOriginal && typeof document === 'string') return document;
  if (preserveOriginal) return `${JSON.stringify(document, null, 2)}\n`;
  return boundary.serialize(document, {
    preflight: boundary.preflight,
  });
}

export function readAboutNarrativeLocalSave({
  targetVersion = ACTIVE_SCHEMA_VERSION,
  storage = null,
} = {}) {
  try {
    const raw = resolveStorage(storage).getItem(ABOUT_NARRATIVE_LOCAL_SAVE_KEY);
    if (raw == null) return Object.freeze({ status: 'none', available: false });
    const envelope = JSON.parse(raw);
    if (!envelope || envelope.kind !== 'local-save' || !envelope.document) {
      throw new Error('The saved local document is invalid.');
    }
    const boundary = resolvePersistenceBoundary(targetVersion);
    const loaded = parseAuthoredPayload(envelope.document, boundary);
    const serialized = boundary.serialize(loaded.document, {
      preflight: boundary.preflight,
    });
    assertDocumentSize(serialized);
    return Object.freeze({
      status: 'saved',
      available: true,
      document: clone(loaded.document),
      hash: hashLocalDocument(serialized, targetVersion),
      savedAt: Number(envelope.savedAt) || null,
      migrations: Object.freeze(clone(loaded.migrations || [])),
    });
  } catch (error) {
    const failure = error?.name === 'AboutNarrativeValidationError'
      ? error
      : storageFailure('Local save read', error);
    return Object.freeze({
      status: failure.code === 'future-schema' ? 'future' : 'failed',
      available: true,
      reason: failure.message,
      error: failure,
    });
  }
}

export function writeAboutNarrativeLocalSave(document, {
  targetVersion = ACTIVE_SCHEMA_VERSION,
  storage = null,
  savedAt = Date.now(),
} = {}) {
  const boundary = resolvePersistenceBoundary(targetVersion);
  const serialized = boundary.serialize(document, {
    preflight: boundary.preflight,
  });
  assertDocumentSize(serialized);
  const normalized = JSON.parse(serialized);
  const envelope = {
    envelopeVersion: ABOUT_NARRATIVE_TRACK_ENVELOPE_VERSION,
    kind: 'local-save',
    savedAt: Number(savedAt),
    document: normalized,
  };
  try {
    resolveStorage(storage).setItem(
      ABOUT_NARRATIVE_LOCAL_SAVE_KEY,
      JSON.stringify(envelope),
    );
  } catch (error) {
    throw storageFailure('Local save write', error);
  }
  return Object.freeze({
    status: 'saved',
    document: clone(normalized),
    hash: hashLocalDocument(serialized, targetVersion),
    savedAt: envelope.savedAt,
  });
}

export function classifyAboutNarrativeRecoveryDraft(raw, {
  baselineHash = '',
  now = Date.now(),
  maximumAgeMs = ABOUT_NARRATIVE_RECOVERY_MAX_AGE_MS,
  targetVersion = ACTIVE_SCHEMA_VERSION,
} = {}) {
  const boundary = resolvePersistenceBoundary(targetVersion);
  const displayEnvelope = parseEnvelopeForDisplay(raw);
  const migrated = boundary.migrateRecovery(raw, {
    preflight: boundary.preflight,
  });
  if (!migrated.valid) {
    const unreadable = migrated.diagnostics?.some((item) => (
      item.code === 'json-parse' || item.code === 'envelope'
    ));
    return Object.freeze({
      status: migrated.readOnly ? 'future' : unreadable ? 'unreadable' : 'invalid',
      available: true,
      envelope: displayEnvelope,
      originalEnvelope: clone(migrated.original),
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
      originalEnvelope: clone(migrated.original),
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
    originalEnvelope: clone(migrated.original),
    document: clone(envelope.document),
    original: clone(migrated.source.original),
    migrations: clone(migrated.migrations || []),
    diagnostics: [],
    reason: stale ? 'The canonical source changed after this draft was created.' : '',
  });
}

export function readAboutNarrativeRecoveryDraft(options = {}) {
  const { storage, ...classificationOptions } = options;
  try {
    const raw = resolveStorage(storage).getItem(ABOUT_NARRATIVE_RECOVERY_KEY);
    if (raw == null) return null;
    return classifyAboutNarrativeRecoveryDraft(raw, classificationOptions);
  } catch (error) {
    const failure = storageFailure('Recovery read', error);
    return Object.freeze({
      status: 'failed',
      available: true,
      reason: failure.message,
      error: failure,
    });
  }
}

export function writeAboutNarrativeRecoveryDraft(document, baselineHash, metadata = {}) {
  const storage = resolveStorage(metadata.storage);
  const boundary = resolvePersistenceBoundary(
    metadata.targetVersion ?? ACTIVE_SCHEMA_VERSION,
  );
  const serializedDocument = boundary.serialize(document, {
    preflight: boundary.preflight,
  });
  assertDocumentSize(serializedDocument);

  let existingRaw;
  try {
    existingRaw = storage.getItem(ABOUT_NARRATIVE_RECOVERY_KEY);
  } catch (error) {
    throw storageFailure('Recovery read', error);
  }
  if (existingRaw != null) {
    const existing = boundary.migrateRecovery(existingRaw, {
      preflight: boundary.preflight,
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
  const migrated = boundary.migrateRecovery(candidate, {
    preflight: boundary.preflight,
  });
  if (!migrated.valid) throw createPersistenceError(migrated, 'The recovery draft is invalid.');
  try {
    storage.setItem(ABOUT_NARRATIVE_RECOVERY_KEY, JSON.stringify(migrated.envelope));
  } catch (error) {
    throw storageFailure('Recovery write', error);
  }
  return migrated.envelope;
}

export function flushAboutNarrativeRecoveryDraft({
  document,
  baselineHash,
  selection = null,
  storyWU = null,
  targetVersion = ACTIVE_SCHEMA_VERSION,
  storage = null,
} = {}) {
  try {
    const envelope = writeAboutNarrativeRecoveryDraft(document, baselineHash, {
      selection,
      storyWU,
      targetVersion,
      storage,
    });
    return Object.freeze({ status: 'current', available: true, envelope });
  } catch (error) {
    return Object.freeze({
      status: 'failed',
      available: true,
      reason: error?.message || String(error),
      error,
    });
  }
}

export function clearAboutNarrativeRecoveryDraft({ storage = null } = {}) {
  try {
    resolveStorage(storage).removeItem(ABOUT_NARRATIVE_RECOVERY_KEY);
    return Object.freeze({ status: 'none', available: false });
  } catch (error) {
    const failure = storageFailure('Recovery clear', error);
    return Object.freeze({
      status: 'failed',
      available: true,
      reason: failure.message,
      error: failure,
    });
  }
}

function parseStoredCheckpoints(storage) {
  const raw = resolveStorage(storage).getItem(ABOUT_NARRATIVE_CHECKPOINTS_KEY);
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

function migrateStoredCheckpoints({
  strict = false,
  targetVersion = ACTIVE_SCHEMA_VERSION,
  storage = null,
} = {}) {
  const inspected = inspectStoredCheckpoints({ targetVersion, storage });
  if (strict && inspected.protectedItems.length) {
    throw new Error('Checkpoint storage is protected because it contains invalid or newer-editor data.');
  }
  return inspected.items;
}

function inspectStoredCheckpoints({
  targetVersion = ACTIVE_SCHEMA_VERSION,
  storage = null,
} = {}) {
  const boundary = resolvePersistenceBoundary(targetVersion);
  const checkpoints = parseStoredCheckpoints(storage);
  const resolved = [];
  const protectedItems = [];
  checkpoints.forEach((checkpoint, index) => {
    const migrated = boundary.migrateCheckpoint(checkpoint, {
      preflight: boundary.preflight,
    });
    if (migrated.valid) resolved.push(migrated.envelope);
    else protectedItems.push(Object.freeze({
      storageKey: `protected-${index}`,
      id: typeof checkpoint?.id === 'string' ? checkpoint.id : '',
      name: typeof checkpoint?.name === 'string' ? checkpoint.name : `Protected checkpoint ${index + 1}`,
      status: migrated.readOnly ? 'future' : 'invalid',
      message: migrated.message || 'This checkpoint is not readable by the current editor.',
      diagnostics: Object.freeze(clone(migrated.diagnostics || [])),
      original: clone(checkpoint),
    }));
  });
  return { items: resolved, protectedItems, rawItems: checkpoints };
}

export function readAboutNarrativeCheckpoints({
  targetVersion = ACTIVE_SCHEMA_VERSION,
  storage = null,
} = {}) {
  return readAboutNarrativeCheckpointState({ targetVersion, storage }).items;
}

export function readAboutNarrativeCheckpointState({
  targetVersion = ACTIVE_SCHEMA_VERSION,
  storage = null,
} = {}) {
  try {
    const inspected = inspectStoredCheckpoints({ targetVersion, storage });
    const protectedState = inspected.protectedItems.length > 0;
    return Object.freeze({
      status: protectedState ? 'protected' : 'ready',
      items: Object.freeze(inspected.items),
      protectedItems: Object.freeze(inspected.protectedItems),
      message: protectedState
        ? 'Some checkpoints were created by a newer editor or contain invalid data. Export or delete them before creating another checkpoint.'
        : '',
    });
  } catch (error) {
    return Object.freeze({
      status: 'failed',
      items: Object.freeze([]),
      message: error?.message || String(error),
      original: clone(error?.original),
      error,
    });
  }
}

export function writeAboutNarrativeCheckpoint(checkpoint, {
  targetVersion = ACTIVE_SCHEMA_VERSION,
  storage = null,
} = {}) {
  const resolvedStorage = resolveStorage(storage);
  const boundary = resolvePersistenceBoundary(targetVersion);
  const serializedDocument = boundary.serialize(checkpoint?.document, {
    preflight: boundary.preflight,
  });
  assertDocumentSize(serializedDocument);
  const candidate = {
    ...clone(checkpoint),
    envelopeVersion: ABOUT_NARRATIVE_TRACK_ENVELOPE_VERSION,
    kind: 'checkpoint',
    document: JSON.parse(serializedDocument),
  };
  const migrated = boundary.migrateCheckpoint(candidate, {
    preflight: boundary.preflight,
  });
  if (!migrated.valid) throw createPersistenceError(migrated, 'The checkpoint is invalid.');
  const checkpoints = [migrated.envelope, ...migrateStoredCheckpoints({
    strict: true,
    targetVersion,
    storage: resolvedStorage,
  })]
    .slice(0, MAX_CHECKPOINTS);
  try {
    resolvedStorage.setItem(ABOUT_NARRATIVE_CHECKPOINTS_KEY, JSON.stringify(checkpoints));
  } catch (error) {
    throw storageFailure('Checkpoint write', error);
  }
  return checkpoints;
}

export function deleteAboutNarrativeCheckpoint(id, {
  targetVersion = ACTIVE_SCHEMA_VERSION,
  storage = null,
} = {}) {
  const resolvedStorage = resolveStorage(storage);
  const checkpoints = parseStoredCheckpoints(resolvedStorage);
  const protectedIndex = /^protected-(\d+)$/.exec(String(id || ''));
  const next = checkpoints.filter((checkpoint, index) => (
    protectedIndex ? index !== Number(protectedIndex[1]) : checkpoint?.id !== id
  ));
  if (next.length === checkpoints.length) {
    return migrateStoredCheckpoints({ targetVersion, storage: resolvedStorage });
  }
  try {
    resolvedStorage.setItem(ABOUT_NARRATIVE_CHECKPOINTS_KEY, JSON.stringify(next));
  } catch (error) {
    throw storageFailure('Checkpoint delete', error);
  }
  return migrateStoredCheckpoints({ targetVersion, storage: resolvedStorage });
}
