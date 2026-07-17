import {
  ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES,
  ABOUT_NARRATIVE_EDITOR_HEADER,
} from './aboutNarrativeDefinitions.js';
import {
  cloneAboutNarrativeDocument,
  migrateAboutNarrativeDocument,
  serializeAboutNarrativeDocument,
} from './aboutNarrativeSchema.js';
import {
  ABOUT_NARRATIVE_CHECKPOINTS_KEY,
  ABOUT_NARRATIVE_RECOVERY_KEY,
} from './aboutNarrativeLabData.js';
import {
  classifyAboutNarrativeRecoveryDraft,
} from './aboutNarrativeEditorHardening.js';

export {
  ABOUT_NARRATIVE_RECOVERY_MAX_AGE_MS,
  classifyAboutNarrativeRecoveryDraft,
  compareAboutNarrativeDocuments,
} from './aboutNarrativeEditorHardening.js';

const ENDPOINT = '/api/about-narrative/config';

function parseHash(response, payload) {
  return payload.hash || response.headers.get('ETag')?.replaceAll('"', '') || '';
}

function parseAuthoredPayload(payload) {
  const result = migrateAboutNarrativeDocument(payload);
  if (result.readOnly) return result;
  return { ...result, document: cloneAboutNarrativeDocument(result.document) };
}

export async function loadAboutNarrativeSource() {
  const response = await fetch(ENDPOINT, {
    headers: { 'X-ABS-Editor': ABOUT_NARRATIVE_EDITOR_HEADER },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Could not load the canonical document (${response.status}).`);
  const payload = await response.json();
  const loaded = parseAuthoredPayload(payload.document);
  if (loaded.readOnly) {
    const error = new Error('The canonical document uses a newer schema and is read-only in this editor.');
    error.code = 'future-schema';
    error.original = loaded.original;
    throw error;
  }
  return {
    document: loaded.document,
    original: loaded.original,
    migrations: loaded.migrations,
    hash: parseHash(response, payload),
  };
}

export async function saveAboutNarrativeSource(document, baselineHash) {
  const serialized = serializeAboutNarrativeDocument(document);
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
  if (persisted.readOnly) throw new Error('The development server returned an unsupported future document.');
  return { document: persisted.document, hash: parseHash(response, payload) };
}

export function exportAboutNarrativeDocument(document, name = 'contents-about.json', { preserveOriginal = false } = {}) {
  let serialized;
  if (preserveOriginal && typeof document === 'string') serialized = document;
  else if (preserveOriginal) serialized = `${JSON.stringify(document, null, 2)}\n`;
  else serialized = serializeAboutNarrativeDocument(document);
  const url = URL.createObjectURL(new Blob([serialized], { type: 'application/json' }));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function readAboutNarrativeRecoveryDraft(options = {}) {
  const raw = localStorage.getItem(ABOUT_NARRATIVE_RECOVERY_KEY);
  if (raw == null) return null;
  return classifyAboutNarrativeRecoveryDraft(raw, options);
}

export function writeAboutNarrativeRecoveryDraft(document, baselineHash, metadata = {}) {
  const serializedDocument = JSON.stringify(document);
  if (new TextEncoder().encode(serializedDocument).byteLength > ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES) {
    throw new Error('Draft storage failed: the About document exceeds 1MiB.');
  }
  const draft = {
    schemaVersion: document.schemaVersion,
    baseSourceHash: baselineHash,
    timestamp: Date.now(),
    document: cloneAboutNarrativeDocument(document),
    ...(metadata.selection ? { selection: cloneAboutNarrativeDocument(metadata.selection) } : {}),
    ...(Number.isFinite(metadata.storyWU) ? { storyWU: Number(metadata.storyWU) } : {}),
  };
  localStorage.setItem(ABOUT_NARRATIVE_RECOVERY_KEY, JSON.stringify(draft));
  return draft;
}

export function clearAboutNarrativeRecoveryDraft() {
  localStorage.removeItem(ABOUT_NARRATIVE_RECOVERY_KEY);
}

export function readAboutNarrativeCheckpoints() {
  try {
    const checkpoints = JSON.parse(localStorage.getItem(ABOUT_NARRATIVE_CHECKPOINTS_KEY) || '[]');
    return Array.isArray(checkpoints) ? checkpoints : [];
  } catch {
    return [];
  }
}

export function writeAboutNarrativeCheckpoint(checkpoint) {
  const checkpoints = readAboutNarrativeCheckpoints();
  checkpoints.unshift(checkpoint);
  localStorage.setItem(ABOUT_NARRATIVE_CHECKPOINTS_KEY, JSON.stringify(checkpoints.slice(0, 20)));
  return checkpoints.slice(0, 20);
}
