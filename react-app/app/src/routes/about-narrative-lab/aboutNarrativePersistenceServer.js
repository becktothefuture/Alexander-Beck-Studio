import { createHash, randomBytes } from 'node:crypto';
import { open, readFile, readdir, rename, unlink } from 'node:fs/promises';
import { basename, dirname, resolve } from 'node:path';
import process from 'node:process';
import {
  assertValidAboutNarrativeDocument,
  migrateAboutNarrativeDocument,
  serializeAboutNarrativeDocument,
} from './aboutNarrativeSchema.js';

function hash(serialized) {
  return createHash('sha256').update(serialized).digest('hex');
}
export function createAboutNarrativePersistenceService({ configPath }) {
  const canonicalPath = resolve(configPath);
  let queue = Promise.resolve();

  const read = async () => {
    const raw = await readFile(canonicalPath, 'utf8');
    const migrated = migrateAboutNarrativeDocument(JSON.parse(raw));
    if (migrated.readOnly) throw new Error('The canonical About document uses a newer schema.');
    const serialized = serializeAboutNarrativeDocument(migrated.document);
    return Object.freeze({ document: JSON.parse(serialized), serialized, hash: hash(serialized) });
  };

  const saveNow = async (candidate, ifMatch) => {
    const current = await read();
    const expected = String(ifMatch || '').replaceAll('"', '');
    if (!expected || expected !== current.hash) {
      const error = new Error('The source changed on disk. Reload it or export your draft before retrying.');
      error.statusCode = 409;
      error.currentHash = current.hash;
      throw error;
    }
    const migrated = migrateAboutNarrativeDocument(candidate);
    if (migrated.readOnly) {
      const error = new Error('A future About document cannot be saved by this editor.');
      error.name = 'AboutNarrativeValidationError';
      error.diagnostics = [{ level: 'error', code: 'future-schema', path: 'schemaVersion', message: error.message }];
      throw error;
    }
    assertValidAboutNarrativeDocument(migrated.document);
    const serialized = serializeAboutNarrativeDocument(migrated.document);
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
