import { ABOUT_NARRATIVE_SCHEMA_VERSION } from './aboutNarrativeDefinitions.js';
import {
  cloneAboutNarrativeDocument,
  migrateAboutNarrativeDocument,
} from './aboutNarrativeSchema.js';

export const ABOUT_NARRATIVE_RECOVERY_MAX_AGE_MS = 14 * 86400000;

export function classifyAboutNarrativeRecoveryDraft(raw, {
  baselineHash = '',
  now = Date.now(),
  maximumAgeMs = ABOUT_NARRATIVE_RECOVERY_MAX_AGE_MS,
} = {}) {
  let envelope;
  try {
    envelope = typeof raw === 'string' ? JSON.parse(raw) : cloneAboutNarrativeDocument(raw);
  } catch (error) {
    return Object.freeze({ status: 'unreadable', available: true, original: raw, reason: error.message });
  }
  if (!envelope || typeof envelope !== 'object' || Array.isArray(envelope) || !envelope.document) {
    return Object.freeze({ status: 'unreadable', available: true, original: envelope, reason: 'The recovery envelope is incomplete.' });
  }
  const timestamp = Number(envelope.timestamp);
  if (!Number.isFinite(timestamp)) {
    return Object.freeze({ status: 'invalid', available: true, envelope, original: envelope.document, reason: 'The recovery timestamp is invalid.' });
  }
  if (now - timestamp > maximumAgeMs) {
    return Object.freeze({ status: 'expired', available: true, envelope, original: envelope.document, reason: 'This recovery draft is older than 14 days.' });
  }
  if (Number(envelope.schemaVersion) > ABOUT_NARRATIVE_SCHEMA_VERSION
    || Number(envelope.document.schemaVersion) > ABOUT_NARRATIVE_SCHEMA_VERSION) {
    return Object.freeze({ status: 'future', available: true, envelope, original: envelope.document, reason: 'This draft was created by a newer editor.' });
  }
  try {
    const migrated = migrateAboutNarrativeDocument(envelope.document);
    if (migrated.readOnly) {
      return Object.freeze({ status: 'future', available: true, envelope, original: envelope.document, reason: 'This draft was created by a newer editor.' });
    }
    return Object.freeze({
      status: baselineHash && envelope.baseSourceHash !== baselineHash ? 'stale' : 'current',
      available: true,
      envelope,
      document: cloneAboutNarrativeDocument(migrated.document),
      original: envelope.document,
      migrations: migrated.migrations,
      reason: baselineHash && envelope.baseSourceHash !== baselineHash
        ? 'The canonical source changed after this draft was created.'
        : '',
    });
  } catch (error) {
    return Object.freeze({
      status: 'invalid',
      available: true,
      envelope,
      original: error.original || envelope.document,
      diagnostics: error.diagnostics || [],
      reason: error.message,
    });
  }
}
function stableValueMap(value, path = '', target = new Map()) {
  if (Array.isArray(value)) {
    const hasStableIds = value.every((item) => item && typeof item === 'object' && typeof item.id === 'string');
    value.forEach((item, index) => stableValueMap(item, `${path}[${hasStableIds ? `id=${item.id}` : index}]`, target));
    if (!value.length) target.set(path, '[]');
    return target;
  }
  if (value && typeof value === 'object') {
    const keys = Object.keys(value).sort();
    keys.forEach((key) => stableValueMap(value[key], path ? `${path}.${key}` : key, target));
    if (!keys.length) target.set(path, '{}');
    return target;
  }
  target.set(path, JSON.stringify(value));
  return target;
}

function changedFields(baseline, candidate) {
  const before = stableValueMap(baseline);
  const after = stableValueMap(candidate);
  return [...new Set([...before.keys(), ...after.keys()])]
    .filter((path) => before.get(path) !== after.get(path))
    .sort();
}

export function compareAboutNarrativeDocuments({ baseline, local, remote }) {
  return Object.freeze({
    localChanges: Object.freeze(changedFields(baseline, local)),
    remoteChanges: Object.freeze(changedFields(baseline, remote)),
  });
}
