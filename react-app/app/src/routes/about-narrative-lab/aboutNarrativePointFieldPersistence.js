import {
  ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
  loadAboutNarrativePointFieldSource,
  migrateAboutNarrativeVersion5To6,
  projectAboutNarrativePointFieldDocumentToVersion5,
  serializeAboutNarrativePointFieldDocument,
} from './aboutNarrativePointFieldSchema.js';
import {
  compileAboutNarrativePointFieldRuntime,
} from './aboutNarrativePointFieldRuntime.js';
import {
  ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
} from './aboutNarrativeTrackSchema.js';
import {
  createAboutNarrativeTrackLegacySelectionMap,
  loadAboutNarrativeTrackSource,
  migrateAboutNarrativeTrackEnvelope,
  normalizeAboutNarrativeTrackEnvelopeSelection,
} from './aboutNarrativeTrackPersistence.js';

const PREFLIGHT_LAYOUT_PROFILES = Object.freeze(['desktop', 'tablet', 'mobile']);
const PREFLIGHT_MOTION_PROFILES = Object.freeze(['full', 'reduced']);
const POINT_FIELD_TYPES = Object.freeze({
  'point-field-state': 'stateDefinitions',
  'point-field-key': 'keys',
  'point-field-segment': 'segments',
});
const TRACK_IDS = new Set(['camera', 'visibility', 'point-field', 'text', 'interaction']);
const TYPE_TO_TRACK = Object.freeze({
  'camera-key': 'camera',
  'visibility-key': 'visibility',
  'point-field-state': 'point-field',
  'point-field-key': 'point-field',
  'point-field-segment': 'point-field',
  'text-field': 'text',
  interaction: 'interaction',
});

const clone = (value) => (value === undefined ? undefined : structuredClone(value));

function makeDiagnostic(code, path, message) {
  return Object.freeze({ level: 'error', code, path, message });
}

function applyPreflight(result, preflight) {
  if (!result.valid || typeof preflight !== 'function') return result;
  try {
    const preflightResult = preflight(clone(result.document));
    if (preflightResult !== false && preflightResult?.valid !== false) return result;
    const diagnostics = Array.isArray(preflightResult?.diagnostics)
      ? clone(preflightResult.diagnostics)
      : [makeDiagnostic(
        'preflight-failed',
        'document',
        preflightResult?.message || 'The point-field document could not compile.',
      )];
    return Object.freeze({
      ...result,
      status: 'invalid',
      valid: false,
      readOnly: false,
      document: null,
      diagnostics: Object.freeze(diagnostics),
      message: preflightResult?.message || diagnostics[0]?.message || 'The document could not compile.',
    });
  } catch (error) {
    const diagnostics = clone(error?.diagnostics || [makeDiagnostic(
      'preflight-threw',
      'document',
      error?.message || 'The point-field document preflight failed.',
    )]);
    return Object.freeze({
      ...result,
      status: 'invalid',
      valid: false,
      readOnly: false,
      document: null,
      diagnostics: Object.freeze(diagnostics),
      message: error?.message || 'The point-field document preflight failed.',
    });
  }
}

export function preflightAboutNarrativePointFieldRuntimePlans(document) {
  const diagnostics = [];
  PREFLIGHT_LAYOUT_PROFILES.forEach((layoutProfile) => {
    PREFLIGHT_MOTION_PROFILES.forEach((motionProfile) => {
      const profile = `${layoutProfile}/${motionProfile}`;
      let plan;
      try {
        plan = compileAboutNarrativePointFieldRuntime(document, { layoutProfile, motionProfile });
      } catch (error) {
        diagnostics.push({
          ...makeDiagnostic(
            'point-field-runtime-plan-threw',
            'document',
            error?.message || `The ${profile} point-field runtime plan threw during compilation.`,
          ),
          profile,
        });
        return;
      }
      if (plan.valid) return;
      (plan.diagnostics.length ? plan.diagnostics : [makeDiagnostic(
        'point-field-runtime-plan',
        'document',
        `The ${profile} point-field runtime plan did not compile.`,
      )]).forEach((item) => diagnostics.push({ ...clone(item), profile }));
    });
  });
  return Object.freeze({
    valid: diagnostics.length === 0,
    diagnostics: Object.freeze(diagnostics),
    message: diagnostics.length
      ? 'The point-field document did not compile for every preview profile.'
      : '',
  });
}

export function loadAboutNarrativePointFieldPersistenceSource(input, { preflight = null } = {}) {
  let sourceVersion;
  try {
    const parsed = typeof input === 'string' ? JSON.parse(input) : input;
    sourceVersion = Number(parsed?.schemaVersion ?? 1);
  } catch {
    return Object.freeze({
      ...loadAboutNarrativePointFieldSource(input),
      migrations: Object.freeze([]),
    });
  }

  if (sourceVersion >= ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION
    || sourceVersion < 1
    || !Number.isInteger(sourceVersion)) {
    const loaded = loadAboutNarrativePointFieldSource(input);
    return applyPreflight(Object.freeze({
      ...loaded,
      migrations: Object.freeze([]),
    }), preflight);
  }

  const legacy = loadAboutNarrativeTrackSource(input);
  if (!legacy.valid) return legacy;
  let migrated;
  try {
    migrated = migrateAboutNarrativeVersion5To6(legacy.document);
  } catch (error) {
    return Object.freeze({
      status: 'invalid',
      valid: false,
      readOnly: false,
      document: null,
      original: legacy.original,
      sourceVersion,
      migrations: legacy.migrations,
      diagnostics: Object.freeze(clone(error?.diagnostics || [makeDiagnostic(
        'point-field-migration-failed',
        'document',
        error?.message || 'Point-field migration failed.',
      )])),
      message: error?.message || 'Point-field migration failed.',
    });
  }
  const loaded = loadAboutNarrativePointFieldSource(migrated);
  const result = Object.freeze({
    ...loaded,
    status: 'migrated',
    original: legacy.original,
    sourceVersion,
    migrations: Object.freeze([...legacy.migrations, '5->6']),
  });
  return applyPreflight(result, preflight);
}

function persistenceError(result, message = result.message) {
  const error = new Error(message || 'The About point-field document is not persistable.');
  error.name = 'AboutNarrativePointFieldPersistenceError';
  error.result = result;
  error.diagnostics = result.diagnostics;
  error.original = result.original;
  return error;
}

export function serializeAboutNarrativePointFieldSource(input, { preflight = null } = {}) {
  const loaded = loadAboutNarrativePointFieldPersistenceSource(input, { preflight });
  if (!loaded.valid) throw persistenceError(loaded);
  if (loaded.sourceVersion !== ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION) {
    throw persistenceError(
      loaded,
      `Only an explicitly migrated schema v${ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION} document can be serialized.`,
    );
  }
  return serializeAboutNarrativePointFieldDocument(loaded.document);
}

function pointFieldObjectExists(document, selection) {
  const collection = POINT_FIELD_TYPES[selection?.type];
  if (collection) {
    return document.tracks.pointField[collection].some((item) => item.id === selection.id);
  }
  const collections = {
    'camera-key': document.tracks.camera.keys,
    'visibility-key': document.tracks.visibility.keys,
    'text-field': document.tracks.text.fields,
    interaction: document.tracks.interactions.clips,
  };
  return collections[selection?.type]?.some((item) => item.id === selection.id) || false;
}

function mapSelectionToPointField(selection, document) {
  if (!selection) return null;
  if (selection.type === 'track') {
    const id = selection.id === 'world' ? 'point-field' : selection.id;
    return { type: 'track', id: TRACK_IDS.has(id) ? id : 'point-field' };
  }
  const type = selection.type === 'world' ? 'point-field-state' : selection.type;
  const candidate = { type, id: selection.id };
  if (!pointFieldObjectExists(document, candidate)) {
    return { type: 'track', id: TYPE_TO_TRACK[type] || 'point-field' };
  }
  const members = (Array.isArray(selection.members) ? selection.members : [])
    .map((member) => ({
      type: member.type === 'world' ? 'point-field-state' : member.type,
      id: member.id,
    }))
    .filter((member) => member.type === type && pointFieldObjectExists(document, member));
  const unique = new Map([[candidate.id, candidate]]);
  members.forEach((member) => unique.set(member.id, member));
  return unique.size > 1 ? { ...candidate, members: [...unique.values()] } : candidate;
}

export function normalizeAboutNarrativePointFieldEnvelopeSelection(selection, {
  document,
  rawDocument,
  legacySelectionMap = null,
}) {
  if (!selection) return null;
  if (selection.type === 'track' || POINT_FIELD_TYPES[selection.type]) {
    return mapSelectionToPointField(selection, document);
  }

  let v5Document;
  const rawVersion = Number(rawDocument?.schemaVersion ?? 1);
  if (rawVersion <= ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
    const loaded = loadAboutNarrativeTrackSource(rawDocument);
    if (loaded.valid) v5Document = loaded.document;
  } else {
    try {
      v5Document = projectAboutNarrativePointFieldDocumentToVersion5(document);
    } catch {
      v5Document = null;
    }
  }
  if (!v5Document) return { type: 'track', id: 'point-field' };
  const selectionMap = createAboutNarrativeTrackLegacySelectionMap(
    rawDocument,
    v5Document,
    legacySelectionMap,
  );
  const normalized = normalizeAboutNarrativeTrackEnvelopeSelection(
    selection,
    v5Document,
    selectionMap,
  );
  return mapSelectionToPointField(normalized, document);
}

export function migrateAboutNarrativePointFieldEnvelope(input, options = {}) {
  return migrateAboutNarrativeTrackEnvelope(input, {
    ...options,
    sourceLoader: loadAboutNarrativePointFieldPersistenceSource,
    selectionNormalizer: normalizeAboutNarrativePointFieldEnvelopeSelection,
  });
}

export function migrateAboutNarrativePointFieldRecoveryEnvelope(input, options = {}) {
  return migrateAboutNarrativePointFieldEnvelope(input, { ...options, kind: 'recovery' });
}

export function migrateAboutNarrativePointFieldCheckpointEnvelope(input, options = {}) {
  return migrateAboutNarrativePointFieldEnvelope(input, { ...options, kind: 'checkpoint' });
}
