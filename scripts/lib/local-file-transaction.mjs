import { randomBytes } from 'node:crypto';
import {
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
} from 'node:fs/promises';
import { basename, dirname, relative, resolve } from 'node:path';
import process from 'node:process';

export const LOCAL_FILE_TRANSACTION_IO = Object.freeze({
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  rename,
  rm,
});

const TRANSACTION_DIRECTORY_PREFIX = '.abs-local-file-transaction-';

// Recovery protocol: state.json maps every staged/quarantined path. Once the
// COMMITTED file itself is fsynced after installation, commit is irrevocable;
// later directory-sync or cleanup failures leave the installed targets intact.
// ROLLED_BACK is fsynced only after every original is restored. Either marker
// means cleanup only. With neither marker, recovery must inspect state.json and
// quarantine without assuming state.

let localFileOperationQueue = Promise.resolve();

export function runSerializedLocalFileOperation(task) {
  const operation = localFileOperationQueue.then(task, task);
  localFileOperationQueue = operation.catch(() => {});
  return operation;
}

function isWithinPath(rootPath, targetPath) {
  const targetRelativePath = relative(rootPath, targetPath);
  return targetRelativePath === ''
    || (!targetRelativePath.startsWith('..') && !targetRelativePath.startsWith('/'));
}

async function resolveRealContainmentPath(io, filePath) {
  const absolutePath = resolve(filePath);
  let existingAncestor = absolutePath;
  while (true) {
    try {
      await io.lstat(existingAncestor);
      break;
    } catch (error) {
      if (error?.code !== 'ENOENT') throw error;
    }
    const parentPath = dirname(existingAncestor);
    if (parentPath === existingAncestor) {
      throw new Error(`No existing ancestor is available for transaction path: ${absolutePath}`);
    }
    existingAncestor = parentPath;
  }
  const realAncestor = await io.realpath(existingAncestor);
  return resolve(realAncestor, relative(existingAncestor, absolutePath));
}

async function assertNoOrphanTransactions(io, rootPath) {
  const entries = await io.readdir(rootPath, { withFileTypes: true });
  const orphans = entries
    .filter((entry) => entry.isDirectory() && entry.name.startsWith(TRANSACTION_DIRECTORY_PREFIX))
    .map((entry) => entry.name);
  if (orphans.length > 0) {
    const error = new Error(`Refusing a new local file transaction while orphan state exists: ${orphans.join(', ')}. Inspect state.json, COMMITTED, and ROLLED_BACK before recovery.`);
    error.code = 'ABS_LOCAL_FILE_TRANSACTION_ORPHAN';
    error.orphans = orphans;
    throw error;
  }
}

async function pathExists(io, filePath) {
  try {
    await io.lstat(filePath);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function syncDirectory(io, directoryPath) {
  const handle = await io.open(directoryPath, 'r');
  try {
    await handle.sync();
  } finally {
    await handle.close();
  }
}

async function writeStagedFile(io, filePath, content, encoding) {
  let handle;
  try {
    handle = await io.open(filePath, 'wx');
    await handle.writeFile(content, encoding);
    await handle.sync();
    await handle.close();
    handle = null;
  } catch (error) {
    await handle?.close().catch(() => {});
    throw error;
  }
}

async function normalizeTransaction(io, { rootPath, replacements = [], deletions = [] }) {
  const root = resolve(rootPath);
  const normalizedReplacements = replacements.map((replacement) => ({
    ...replacement,
    path: resolve(replacement.path),
    encoding: replacement.encoding || 'utf8',
  }));
  const normalizedDeletions = deletions.map((deletion) => ({
    ...deletion,
    path: resolve(deletion.path),
  }));
  const targets = [
    ...normalizedReplacements.map(({ path }) => path),
    ...normalizedDeletions.map(({ path }) => path),
  ];

  const realRoot = await io.realpath(root);
  const realTargets = await Promise.all(targets.map((targetPath) => (
    resolveRealContainmentPath(io, targetPath)
  )));

  for (const [index, targetPath] of targets.entries()) {
    if (targetPath === root
      || !isWithinPath(root, targetPath)
      || realTargets[index] === realRoot
      || !isWithinPath(realRoot, realTargets[index])) {
      throw new Error(`Refusing a local file transaction target outside its root: ${targetPath}`);
    }
  }
  if (new Set(targets).size !== targets.length || new Set(realTargets).size !== realTargets.length) {
    throw new Error('Local file transaction targets must be unique.');
  }
  for (let index = 0; index < targets.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < targets.length; otherIndex += 1) {
      if (isWithinPath(targets[index], targets[otherIndex])
        || isWithinPath(targets[otherIndex], targets[index])
        || isWithinPath(realTargets[index], realTargets[otherIndex])
        || isWithinPath(realTargets[otherIndex], realTargets[index])) {
        throw new Error('Local file transaction targets must not contain one another.');
      }
    }
  }

  return { root, replacements: normalizedReplacements, deletions: normalizedDeletions };
}

export async function applyLocalFileTransaction(transaction, {
  io = LOCAL_FILE_TRANSACTION_IO,
} = {}) {
  const { root, replacements, deletions } = await normalizeTransaction(io, transaction);
  if (replacements.length === 0 && deletions.length === 0) return;

  await assertNoOrphanTransactions(io, root);

  const transactionId = `${process.pid}-${randomBytes(8).toString('hex')}`;
  const transactionDirectory = resolve(root, `${TRANSACTION_DIRECTORY_PREFIX}${transactionId}`);
  const stagedDirectory = resolve(transactionDirectory, 'staged');
  const quarantineDirectory = resolve(transactionDirectory, 'quarantine');
  const statePath = resolve(transactionDirectory, 'state.json');
  const committedPath = resolve(transactionDirectory, 'COMMITTED');
  const rolledBackPath = resolve(transactionDirectory, 'ROLLED_BACK');
  const quarantined = [];
  const installed = [];
  let commitMarkerWritten = false;

  await io.mkdir(stagedDirectory, { recursive: true });
  await io.mkdir(quarantineDirectory, { recursive: true });

  try {
    const targets = [
      ...replacements.map((replacement) => ({ ...replacement, replacement: true })),
      ...deletions.map((deletion) => ({ ...deletion, replacement: false })),
    ];
    await writeStagedFile(io, statePath, `${JSON.stringify({
      version: 1,
      phase: 'prepared',
      targets: targets.map((target, index) => ({
        path: target.path,
        replacement: target.replacement,
        stagedPath: target.replacement
          ? resolve(stagedDirectory, `${index}-${basename(target.path)}`)
          : null,
        quarantinePath: resolve(quarantineDirectory, `${index}-${basename(target.path)}`),
      })),
    }, null, 2)}\n`, 'utf8');
    await syncDirectory(io, transactionDirectory);
    await syncDirectory(io, root);

    for (const [index, replacement] of replacements.entries()) {
      const stagedPath = resolve(stagedDirectory, `${index}-${basename(replacement.path)}`);
      await writeStagedFile(io, stagedPath, replacement.content, replacement.encoding);
      replacement.stagedPath = stagedPath;
    }
    await syncDirectory(io, stagedDirectory);

    for (const [index, target] of targets.entries()) {
      if (!await pathExists(io, target.path)) continue;
      const quarantinePath = resolve(quarantineDirectory, `${index}-${basename(target.path)}`);
      await io.rename(target.path, quarantinePath);
      quarantined.push({ path: target.path, quarantinePath });
      await syncDirectory(io, dirname(target.path));
    }
    await syncDirectory(io, quarantineDirectory);

    for (const replacement of replacements) {
      await io.rename(replacement.stagedPath, replacement.path);
      installed.push(replacement.path);
      await syncDirectory(io, dirname(replacement.path));
    }

    await writeStagedFile(io, committedPath, 'committed\n', 'utf8');
    commitMarkerWritten = true;
    await syncDirectory(io, transactionDirectory);
  } catch (error) {
    if (commitMarkerWritten) {
      return {
        committed: true,
        cleanupPending: true,
        cleanupError: error,
        transactionDirectory,
      };
    }
    const rollbackErrors = [];
    for (const installedPath of installed.reverse()) {
      try {
        await io.rm(installedPath, { recursive: true, force: true });
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    for (const item of quarantined.reverse()) {
      try {
        await io.rename(item.quarantinePath, item.path);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length === 0) {
      try {
        await writeStagedFile(io, rolledBackPath, 'rolled-back\n', 'utf8');
        await syncDirectory(io, transactionDirectory);
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length === 0) {
      try {
        await io.rm(quarantineDirectory, { recursive: true, force: true });
        await io.rm(stagedDirectory, { recursive: true, force: true });
        await io.rm(transactionDirectory, { recursive: true, force: true });
      } catch (rollbackError) {
        rollbackErrors.push(rollbackError);
      }
    }
    if (rollbackErrors.length > 0) {
      error.rollbackErrors = rollbackErrors;
      error.transactionDirectory = transactionDirectory;
    }
    throw error;
  }

  try {
    await io.rm(quarantineDirectory, { recursive: true, force: true });
    await io.rm(stagedDirectory, { recursive: true, force: true });
    await io.rm(transactionDirectory, { recursive: true, force: true });
    await syncDirectory(io, root);
    return { committed: true, cleanupPending: false };
  } catch (cleanupError) {
    return {
      committed: true,
      cleanupPending: true,
      cleanupError,
      transactionDirectory,
    };
  }
}

export function runLocalFileTransaction(transaction, options) {
  return runSerializedLocalFileOperation(() => applyLocalFileTransaction(transaction, options));
}
