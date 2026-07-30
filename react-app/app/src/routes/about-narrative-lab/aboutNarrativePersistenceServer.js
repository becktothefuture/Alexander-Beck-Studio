import { createHash, randomBytes } from 'node:crypto';
import { open, readFile, readdir, rename, unlink } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import process from 'node:process';
import {
  loadAboutNarrativeTrackSource,
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
  preflightAboutNarrativePointFieldRuntimePlans,
  serializeAboutNarrativePointFieldSource,
} from './aboutNarrativePointFieldPersistence.js';

function hash(serialized) {
  return createHash('sha256').update(serialized).digest('hex');
}

function validationError(message, result = null, diagnostics = null) {
  const error = new Error(message);
  error.name = 'AboutNarrativeValidationError';
  error.diagnostics = diagnostics || result?.diagnostics || [];
  error.original = result?.original;
  error.result = result;
  return error;
}

function lockedSourceError(current) {
  const message = current.status === 'future'
    ? 'The canonical About document uses a newer schema and cannot be overwritten by this editor.'
    : 'The canonical About document is invalid and cannot be overwritten. Export or repair the exact source first.';
  const fallbackDiagnostic = {
    level: 'error',
    code: current.status === 'future' ? 'future-schema' : 'invalid-source',
    path: 'document',
    message,
  };
  return validationError(
    message,
    current.source,
    current.diagnostics?.length ? current.diagnostics : [fallbackDiagnostic],
  );
}

export function createAboutNarrativePersistenceService({
  configPath,
  preflight = null,
  targetVersion = ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
}) {
  if (![ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION, ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION]
    .includes(Number(targetVersion))) {
    throw new TypeError('About Narrative persistence targetVersion must be 5 or 6.');
  }
  const pointFieldActive = Number(targetVersion) === ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION;
  const loadSource = pointFieldActive
    ? loadAboutNarrativePointFieldPersistenceSource
    : loadAboutNarrativeTrackSource;
  const serializeSource = pointFieldActive
    ? serializeAboutNarrativePointFieldSource
    : serializeAboutNarrativeTrackSource;
  const runPreflight = preflight || (pointFieldActive
    ? preflightAboutNarrativePointFieldRuntimePlans
    : preflightAboutNarrativeTrackRuntimePlans);
  const canonicalPath = resolve(configPath);
  let queue = Promise.resolve();

  const read = async () => {
    const raw = await readFile(canonicalPath, 'utf8');
    const loaded = loadSource(raw, { preflight: runPreflight });
    if (!loaded.valid) {
      return Object.freeze({
        document: raw,
        serialized: raw,
        hash: hash(raw),
        readOnly: true,
        status: loaded.status,
        diagnostics: loaded.diagnostics,
        original: raw,
        source: loaded,
      });
    }
    const serialized = serializeSource(loaded.document, { preflight: runPreflight });
    return Object.freeze({
      document: JSON.parse(serialized),
      serialized,
      hash: hash(serialized),
      readOnly: false,
      status: loaded.status,
      migrations: loaded.migrations,
      sourceVersion: loaded.sourceVersion,
    });
  };

  const saveNow = async (candidate, ifMatch) => {
    const current = await read();
    if (current.readOnly) throw lockedSourceError(current);

    const expected = String(ifMatch || '').replaceAll('"', '');
    if (!expected || expected !== current.hash) {
      const error = new Error('The source changed on disk. Reload it or export your draft before retrying.');
      error.statusCode = 409;
      error.currentHash = current.hash;
      throw error;
    }

    const loaded = loadSource(candidate, { preflight: runPreflight });
    if (!loaded.valid) {
      throw validationError(
        loaded.readOnly
          ? 'A future About document cannot be saved by this editor.'
          : loaded.message || 'The About document is invalid.',
        loaded,
      );
    }
    if (loaded.sourceVersion !== Number(targetVersion)) {
      throw validationError(
        `Only a schema v${targetVersion} About document can be saved. Reload the source to migrate it before saving.`,
        loaded,
        [{
          level: 'error',
          code: 'schema-version-write',
          path: 'schemaVersion',
          message: `Persistence accepts only the active schema v${targetVersion} document model.`,
        }],
      );
    }

    const serialized = serializeSource(loaded.document, { preflight: runPreflight });
    const document = JSON.parse(serialized);
    const temporaryPath = `${canonicalPath}.tmp-${process.pid}-${randomBytes(6).toString('hex')}`;
    let fileHandle;
    try {
      fileHandle = await open(temporaryPath, 'wx');
      await fileHandle.writeFile(serialized, 'utf8');
      await fileHandle.sync();
      await fileHandle.close();
      fileHandle = null;
      await rename(temporaryPath, canonicalPath);
      const directoryHandle = await open(dirname(canonicalPath), 'r');
      try {
        await directoryHandle.sync();
      } finally {
        await directoryHandle.close();
      }
    } catch (error) {
      await fileHandle?.close().catch(() => {});
      await unlink(temporaryPath).catch(() => {});
      throw error;
    }
    return Object.freeze({ document, serialized, hash: hash(serialized) });
  };

  const save = (candidate, ifMatch) => {
    const task = () => saveNow(candidate, ifMatch);
    const operation = queue.then(task, task);
    queue = operation.catch(() => {});
    return operation;
  };

  const cleanup = async () => {
    const directory = dirname(canonicalPath);
    const prefix = `${basename(canonicalPath)}.tmp-`;
    const files = await readdir(directory);
    await Promise.all(files
      .filter((name) => name.startsWith(prefix))
      .map((name) => unlink(resolve(directory, name)).catch(() => {})));
  };

  return Object.freeze({ canonicalPath, cleanup, read, save });
}
