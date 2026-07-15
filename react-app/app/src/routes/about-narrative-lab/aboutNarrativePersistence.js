import {
  ABOUT_NARRATIVE_EDITOR_HEADER,
} from './aboutNarrativeDefinitions.js';
import {
  assertValidAboutNarrativeDocument,
  serializeAboutNarrativeDocument,
} from './aboutNarrativeSchema.js';
import {
  ABOUT_NARRATIVE_CHECKPOINTS_KEY,
  ABOUT_NARRATIVE_RECOVERY_KEY,
} from './aboutNarrativeLabData.js';

const ENDPOINT = '/api/about-narrative/config';

export async function loadAboutNarrativeSource() {
  const response = await fetch(ENDPOINT, {
    headers: { 'X-ABS-Editor': ABOUT_NARRATIVE_EDITOR_HEADER },
    cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Could not load the canonical document (${response.status}).`);
  const payload = await response.json();
  assertValidAboutNarrativeDocument(payload.document);
  return {
    document: payload.document,
    hash: payload.hash || response.headers.get('ETag')?.replaceAll('"', '') || '',
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
    throw error;
  }
  return { document, hash: payload.hash || '' };
}

export function exportAboutNarrativeDocument(document, name = 'contents-about.json') {
  const url = URL.createObjectURL(new Blob([serializeAboutNarrativeDocument(document)], { type: 'application/json' }));
  const link = window.document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function readAboutNarrativeRecoveryDraft() {
  try {
    const draft = JSON.parse(localStorage.getItem(ABOUT_NARRATIVE_RECOVERY_KEY) || 'null');
    return draft?.document ? draft : null;
  } catch {
    return null;
  }
}

export function writeAboutNarrativeRecoveryDraft(document, baselineHash) {
  const draft = {
    schemaVersion: document.schemaVersion,
    baseSourceHash: baselineHash,
    timestamp: Date.now(),
    document,
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
