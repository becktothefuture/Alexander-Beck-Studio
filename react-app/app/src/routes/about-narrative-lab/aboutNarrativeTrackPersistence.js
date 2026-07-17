import {
  migrateAboutNarrativeDocument,
} from './aboutNarrativeSchema.js';
import {
  ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
  migrateAboutNarrativeVersion2To3,
  normalizeAboutNarrativeTrackDocument,
  serializeAboutNarrativeTrackDocument,
  validateAboutNarrativeTrackDocument,
} from './aboutNarrativeTrackSchema.js';
import {
  normalizeAboutNarrativeTrackSelection,
} from './aboutNarrativeTrackEditing.js';
import {
  compileAboutNarrativeRuntimePlan,
} from './aboutNarrativeRuntimePlan.js';

export const ABOUT_NARRATIVE_TRACK_ENVELOPE_VERSION = 1;

const PREFLIGHT_LAYOUT_PROFILES = Object.freeze(['desktop', 'tablet', 'mobile']);
const PREFLIGHT_MOTION_PROFILES = Object.freeze(['full', 'reduced']);

function clone(value) {
  return value === undefined ? undefined : structuredClone(value);
}

function parseRawInput(input) {
  const original = clone(input);
  if (typeof input !== 'string') return { original, parsed: clone(input) };
  try {
    return { original, parsed: JSON.parse(input) };
  } catch (error) {
    return { original, error };
  }
}

function makeDiagnostic(code, path, message) {
  return Object.freeze({ level: 'error', code, path, message });
}

function invalidResult({ original, sourceVersion = null, diagnostics = [], message, migrations = [] }) {
  return Object.freeze({
    status: 'invalid',
    valid: false,
    readOnly: false,
    document: null,
    original,
    sourceVersion,
    migrations: Object.freeze([...migrations]),
    diagnostics: Object.freeze([...diagnostics]),
    message,
  });
}

function futureResult({ original, document, sourceVersion }) {
  return Object.freeze({
    status: 'future',
    valid: false,
    readOnly: true,
    document,
    original,
    sourceVersion,
    migrations: Object.freeze([]),
    diagnostics: Object.freeze([]),
    message: 'This document was created by a newer editor and is read-only here.',
  });
}

function preflightDocument(document, preflight) {
  if (typeof preflight !== 'function') return { valid: true };
  try {
    const result = preflight(clone(document));
    if (result === false || result?.valid === false) {
      const diagnostics = Array.isArray(result?.diagnostics)
        ? clone(result.diagnostics)
        : [makeDiagnostic('preflight-failed', 'document', result?.message || 'The document could not compile.')];
      return { valid: false, diagnostics, message: result?.message || diagnostics[0]?.message || 'The document could not compile.' };
    }
    return { valid: true };
  } catch (error) {
    return {
      valid: false,
      diagnostics: clone(error?.diagnostics || [makeDiagnostic('preflight-threw', 'document', error?.message || 'The document preflight failed.')]),
      message: error?.message || 'The document preflight failed.',
    };
  }
}

/**
 * Compiles every supported layout and motion combination before a document is
 * allowed across a persistence boundary. This keeps save, sync, recovery, and
 * module boot on the same deterministic runtime contract.
 */
export function preflightAboutNarrativeTrackRuntimePlans(document) {
  const diagnostics = [];
  PREFLIGHT_LAYOUT_PROFILES.forEach((layoutProfile) => {
    PREFLIGHT_MOTION_PROFILES.forEach((motionProfile) => {
      const profile = `${layoutProfile}/${motionProfile}`;
      let plan;
      try {
        plan = compileAboutNarrativeRuntimePlan(document, {
          layoutProfile,
          motionProfile,
        });
      } catch (error) {
        diagnostics.push({
          ...makeDiagnostic(
            'runtime-plan-threw',
            'document',
            error?.message || `The ${profile} runtime plan threw during compilation.`,
          ),
          profile,
        });
        return;
      }
      if (plan.valid) return;
      (plan.diagnostics.length ? plan.diagnostics : [makeDiagnostic(
        'runtime-plan',
        'document',
        `The ${profile} runtime plan did not compile.`,
      )]).forEach((item) => diagnostics.push({
        ...clone(item),
        profile,
      }));
    });
  });
  return Object.freeze({
    valid: diagnostics.length === 0,
    diagnostics: Object.freeze(diagnostics),
    message: diagnostics.length
      ? 'The About Narrative document did not compile for every preview profile.'
      : '',
  });
}

/**
 * Classifies and migrates raw authored input without ever normalizing invalid
 * source first. `original` retains the caller's exact JSON-compatible value so
 * invalid and future sources can be exported unchanged.
 */
export function loadAboutNarrativeTrackSource(input, { preflight = null } = {}) {
  const parsedInput = parseRawInput(input);
  if (parsedInput.error) {
    return invalidResult({
      original: parsedInput.original,
      diagnostics: [makeDiagnostic('json-parse', 'document', parsedInput.error.message)],
      message: parsedInput.error.message,
    });
  }
  const { original, parsed } = parsedInput;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return invalidResult({
      original,
      diagnostics: [makeDiagnostic('document-envelope', 'document', 'The About document must be a JSON object.')],
      message: 'The About document must be a JSON object.',
    });
  }

  const sourceVersion = Number(parsed.schemaVersion ?? 1);
  if (!Number.isInteger(sourceVersion) || sourceVersion < 1) {
    return invalidResult({
      original,
      sourceVersion,
      diagnostics: [makeDiagnostic('schema-version', 'schemaVersion', 'The document schema version must be a positive integer.')],
      message: 'The document schema version must be a positive integer.',
    });
  }
  if (sourceVersion > ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
    return futureResult({ original, document: clone(parsed), sourceVersion });
  }

  let document;
  let migrations = [];
  try {
    if (sourceVersion === 1) {
      const legacy = migrateAboutNarrativeDocument(parsed);
      document = migrateAboutNarrativeVersion2To3(legacy.document);
      migrations = [...legacy.migrations, '2->3'];
    } else if (sourceVersion === 2) {
      document = migrateAboutNarrativeVersion2To3(parsed);
      migrations = ['2->3'];
    } else {
      const diagnostics = validateAboutNarrativeTrackDocument(parsed);
      const errors = diagnostics.filter((item) => item.level === 'error');
      if (errors.length) {
        return invalidResult({
          original,
          sourceVersion,
          diagnostics,
          message: errors.map((item) => `${item.path}: ${item.message}`).join('\n'),
        });
      }
      document = normalizeAboutNarrativeTrackDocument(parsed);
    }
  } catch (error) {
    return invalidResult({
      original,
      sourceVersion,
      diagnostics: clone(error?.diagnostics || [makeDiagnostic('migration-failed', 'document', error?.message || 'Document migration failed.')]),
      message: error?.message || 'Document migration failed.',
      migrations,
    });
  }

  const preflightResult = preflightDocument(document, preflight);
  if (!preflightResult.valid) {
    return invalidResult({
      original,
      sourceVersion,
      diagnostics: preflightResult.diagnostics,
      message: preflightResult.message,
      migrations,
    });
  }
  return Object.freeze({
    status: migrations.length ? 'migrated' : 'current',
    valid: true,
    readOnly: false,
    document,
    original,
    sourceVersion,
    migrations: Object.freeze([...migrations]),
    diagnostics: Object.freeze([]),
    message: '',
  });
}

function persistenceError(result, message = result.message) {
  const error = new Error(message || 'The About document is not persistable.');
  error.name = 'AboutNarrativeTrackPersistenceError';
  error.result = result;
  error.diagnostics = result.diagnostics;
  error.original = result.original;
  return error;
}

/** Serializes v3 only. Legacy input must be migrated explicitly first. */
export function serializeAboutNarrativeTrackSource(input, { preflight = null } = {}) {
  const loaded = loadAboutNarrativeTrackSource(input, { preflight });
  if (!loaded.valid) throw persistenceError(loaded);
  if (loaded.sourceVersion !== ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
    throw persistenceError(loaded, 'Only an explicitly migrated schema v3 document can be serialized.');
  }
  return serializeAboutNarrativeTrackDocument(loaded.document);
}

function mergeLegacySelectionMap(target, source) {
  if (source instanceof Map) source.forEach((value, key) => target.set(key, value));
  else if (source && typeof source === 'object') Object.entries(source).forEach(([key, value]) => target.set(key, value));
  return target;
}

function createLegacySelectionMap(rawDocument, model, suppliedMap) {
  const map = new Map();
  if (Number(rawDocument?.schemaVersion ?? 1) <= 2 && Array.isArray(rawDocument?.sections)) {
    let activeWorld = model.tracks.worlds.objects[0] || null;
    rawDocument.sections.forEach((section) => {
      const directWorld = model.tracks.worlds.objects.find((world) => world.id === `world-${section.id}`);
      if (directWorld) activeWorld = directWorld;
      if (activeWorld) {
        map.set(`section:${section.id}`, { type: 'world', id: activeWorld.id });
        map.set(`world:${section.id}`, { type: 'world', id: activeWorld.id });
      }
      (section.camera?.keys || []).forEach((key, index) => {
        map.set(`camera-key:${section.id}:${index}`, { type: 'camera-key', id: `camera-${section.id}-${index}` });
      });
      (section.text?.cues || []).forEach((cue) => {
        map.set(`cue:${section.id}:${cue.id}`, { type: 'text-field', id: `text-${cue.id}` });
      });
      if (section.text?.disciplineReveal) {
        map.set(`discipline-reveal:${section.id}`, { type: 'text-field', id: `text-${section.text.disciplineReveal.id}` });
      }
      if (section.interaction?.type && section.interaction.type !== 'none') {
        map.set(`interaction:${section.id}`, { type: 'interaction', id: `interaction-${section.id}` });
      }
    });
  }
  return mergeLegacySelectionMap(map, suppliedMap);
}

function normalizeEnvelopeSelection(selection, model, legacySelectionMap) {
  if (!selection) return null;
  const { members, ...primarySource } = selection;
  const primary = normalizeAboutNarrativeTrackSelection(primarySource, model, { legacySelectionMap });
  if (!Array.isArray(members) || !members.length || primary.type === 'track') return primary;
  const normalizedMembers = members.map((member) => normalizeAboutNarrativeTrackSelection({
    ...member,
    type: member?.type || selection.type,
  }, model, { legacySelectionMap })).filter((member) => member.type === primary.type && member.id);
  const unique = new Map([[primary.id, { type: primary.type, id: primary.id }]]);
  normalizedMembers.forEach((member) => unique.set(member.id, { type: member.type, id: member.id }));
  return unique.size > 1 ? { ...primary, members: [...unique.values()] } : primary;
}

function invalidEnvelopeResult(original, message, diagnostics, source = null) {
  return Object.freeze({
    status: 'invalid',
    valid: false,
    readOnly: false,
    envelope: null,
    original,
    source,
    diagnostics: Object.freeze([...diagnostics]),
    message,
  });
}

export function migrateAboutNarrativeTrackEnvelope(input, {
  kind,
  preflight = null,
  legacySelectionMap = null,
} = {}) {
  const parsedInput = parseRawInput(input);
  if (parsedInput.error) {
    return invalidEnvelopeResult(parsedInput.original, parsedInput.error.message, [makeDiagnostic('json-parse', 'envelope', parsedInput.error.message)]);
  }
  const { original, parsed } = parsedInput;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed) || !parsed.document) {
    return invalidEnvelopeResult(original, 'The recovery envelope is incomplete.', [makeDiagnostic('envelope', 'envelope', 'The recovery envelope must contain a document.')]);
  }
  const envelopeVersion = parsed.envelopeVersion == null ? 0 : Number(parsed.envelopeVersion);
  if (!Number.isInteger(envelopeVersion) || envelopeVersion < 0) {
    return invalidEnvelopeResult(original, 'The envelope version is invalid.', [makeDiagnostic('envelope-version', 'envelopeVersion', 'Envelope version must be a non-negative integer.')]);
  }
  if (envelopeVersion > ABOUT_NARRATIVE_TRACK_ENVELOPE_VERSION) {
    return Object.freeze({
      status: 'future', valid: false, readOnly: true, envelope: clone(parsed), original,
      diagnostics: Object.freeze([]), message: 'This recovery envelope was created by a newer editor.',
    });
  }
  const resolvedKind = kind || parsed.kind || (parsed.id || parsed.name ? 'checkpoint' : 'recovery');
  if (!['recovery', 'checkpoint'].includes(resolvedKind)) {
    return invalidEnvelopeResult(original, 'Unknown envelope kind.', [makeDiagnostic('envelope-kind', 'kind', 'Envelope kind must be recovery or checkpoint.')]);
  }
  if (!Number.isFinite(Number(parsed.timestamp))) {
    return invalidEnvelopeResult(original, 'The recovery timestamp is invalid.', [makeDiagnostic('envelope-timestamp', 'timestamp', 'Envelope timestamp must be finite.')]);
  }
  if (parsed.storyWU != null && !Number.isFinite(Number(parsed.storyWU))) {
    return invalidEnvelopeResult(original, 'The recovery playhead is invalid.', [makeDiagnostic('envelope-story-wu', 'storyWU', 'Envelope Story WU must be finite.')]);
  }
  if (resolvedKind === 'checkpoint' && (typeof parsed.id !== 'string' || !parsed.id || typeof parsed.name !== 'string' || !parsed.name)) {
    return invalidEnvelopeResult(original, 'The checkpoint identity is incomplete.', [makeDiagnostic('checkpoint-identity', 'envelope', 'Checkpoints require non-empty id and name strings.')]);
  }

  const source = loadAboutNarrativeTrackSource(parsed.document, { preflight });
  if (!source.valid) {
    if (source.readOnly) {
      return Object.freeze({
        status: 'future', valid: false, readOnly: true, envelope: null, original, source,
        diagnostics: source.diagnostics, message: source.message,
      });
    }
    return invalidEnvelopeResult(original, source.message, source.diagnostics, source);
  }

  const selectionMap = createLegacySelectionMap(parsed.document, source.document, legacySelectionMap);
  const selection = normalizeEnvelopeSelection(parsed.selection, source.document, selectionMap);
  const envelope = {
    envelopeVersion: ABOUT_NARRATIVE_TRACK_ENVELOPE_VERSION,
    kind: resolvedKind,
    ...(resolvedKind === 'checkpoint' ? { id: parsed.id, name: parsed.name } : {}),
    timestamp: Number(parsed.timestamp),
    baseSourceHash: typeof parsed.baseSourceHash === 'string' ? parsed.baseSourceHash : '',
    document: source.document,
    ...(selection ? { selection } : {}),
    ...(parsed.storyWU != null ? { storyWU: Number(parsed.storyWU) } : {}),
  };
  return Object.freeze({
    status: envelopeVersion === ABOUT_NARRATIVE_TRACK_ENVELOPE_VERSION && !source.migrations.length ? 'current' : 'migrated',
    valid: true,
    readOnly: false,
    envelope,
    original,
    source,
    migrations: Object.freeze([
      ...(envelopeVersion === 0 ? ['legacy-envelope->1'] : []),
      ...source.migrations,
    ]),
    diagnostics: Object.freeze([]),
    message: '',
  });
}

export function migrateAboutNarrativeTrackRecoveryEnvelope(input, options = {}) {
  return migrateAboutNarrativeTrackEnvelope(input, { ...options, kind: 'recovery' });
}

export function migrateAboutNarrativeTrackCheckpointEnvelope(input, options = {}) {
  return migrateAboutNarrativeTrackEnvelope(input, { ...options, kind: 'checkpoint' });
}
