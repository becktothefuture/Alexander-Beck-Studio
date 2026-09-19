import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, open, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import {
  ROLLERCOASTER_SCHEMA,
  validateRollercoasterBundle,
  validateRollercoasterMeta,
  validateRollercoasterStoryBeats,
} from '../../react-app/app/src/routes/about-rollercoaster/rollercoasterContract.js';

import { preflightRollercoasterField } from '../../react-app/app/src/routes/about-rollercoaster/rollercoasterField.js';

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
// Retire the old payload inside the same transaction; the manifest is last.
const FILES = ['geometry.json', 'camera.json', 'points.bin', 'meta.json'];
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const signature = value => `${value.dev}:${value.ino}:${value.size}:${value.mtimeNs}:${value.ctimeNs}`;

export function assertRollercoasterPublishContract(schema) {
  if (schema !== ROLLERCOASTER_SCHEMA) throw new Error(`Unsupported publish contract ${JSON.stringify(schema)}; expected ${ROLLERCOASTER_SCHEMA}.`);
  return ROLLERCOASTER_SCHEMA;
}

async function sourceIdentity(path) {
  const before = signature(await stat(path, { bigint: true }));
  const hash = sha256(await readFile(path));
  const after = signature(await stat(path, { bigint: true }));
  if (before !== after) throw new Error('The saved Blender source changed while its identity was read.');
  return { hash, signature: after };
}

async function previousBytes(path) {
  try {
    if (!(await lstat(path)).isFile()) throw new Error(`Refusing to replace a non-file bundle target: ${path}`);
    return await readFile(path);
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error;
  }
}

/** Validate immutable byte snapshots before creating or changing the destination. */
export async function publishRollercoasterBundle({ stagingDir, destinationDir, repoRoot = REPO_ROOT }) {
  if (!stagingDir || !destinationDir) throw new Error('Both staging and destination directories are required.');
  const stage = resolve(stagingDir), destination = resolve(destinationDir);
  if (stage === destination) throw new Error('Staging and destination directories must be different.');
  const metaBytes = await readFile(join(stage, 'meta.json'));
  const meta = JSON.parse(metaBytes.toString('utf8'));
  assertRollercoasterPublishContract(meta?.schema);
  validateRollercoasterMeta(meta);
  validateRollercoasterStoryBeats(meta.beats);
  const [cameraBytes, geometryBytes] = await Promise.all([
    readFile(join(stage, meta.camera.file)), readFile(join(stage, meta.geometry.file)),
  ]);
  const bundle = await validateRollercoasterBundle({ meta, cameraBytes, geometryBytes, digestSha256: sha256 });
  // A hash-valid mesh must also fit the browser-owned sampling budget.
  // This shares the sampler plan without allocating circle/GPU buffers.
  preflightRollercoasterField(bundle.geometry);
  const sourcePath = resolve(repoRoot, meta.source.file);
  const source = await sourceIdentity(sourcePath);
  if (source.hash !== meta.source.sha256.toLowerCase()) throw new Error('The export does not match the saved Blender source hash.');
  const assertSourceUnchanged = async () => {
    if (signature(await stat(sourcePath, { bigint: true })) !== source.signature) {
      throw new Error('The saved Blender source changed before publication.');
    }
  };

  // A second exporter must not interleave the three manifest-controlled files.
  await mkdir(destination, { recursive: true });
  const lockPath = join(destination, '.about-rollercoaster-publish.lock');
  const lock = await open(lockPath, 'wx').catch(error => {
    if (error.code === 'EEXIST') throw new Error('Another About bundle publication is in progress; retry after it finishes.');
    throw error;
  });
  let temporary;
  const installed = [];
  const previous = new Map();
  try {
    for (const file of FILES) previous.set(file, await previousBytes(join(destination, file)));
    temporary = await mkdtemp(join(destination, '.about-rollercoaster-publish-'));
    const buffers = { 'geometry.json': geometryBytes, 'camera.json': cameraBytes, 'points.bin': null, 'meta.json': metaBytes };
    for (const file of FILES) {
      if (buffers[file] !== null) await writeFile(join(temporary, file), buffers[file], { flag: 'wx' });
      if (previous.get(file) !== null) await writeFile(join(temporary, `previous-${file}`), previous.get(file), { flag: 'wx' });
    }
    await assertSourceUnchanged();
    for (const file of FILES) {
      if (file === 'meta.json') await assertSourceUnchanged();
      if (buffers[file] === null) await rm(join(destination, file), { force: true });
      else await rename(join(temporary, file), join(destination, file));
      installed.push(file);
    }
  } catch (error) {
    const rollbackErrors = [];
    // Restore data first and the previous manifest last if a filesystem step fails.
    for (const file of FILES) {
      if (!installed.includes(file)) continue;
      try {
        if (previous.get(file) === null) await rm(join(destination, file), { force: true });
        else await rename(join(temporary, `previous-${file}`), join(destination, file));
      } catch (rollbackError) { rollbackErrors.push(rollbackError); }
    }
    if (rollbackErrors.length) {
      error.rollbackErrors = rollbackErrors;
      error.recoveryDirectory = temporary;
      temporary = null; // Preserve the previous bytes for explicit recovery.
    }
    throw error;
  } finally {
    try { if (temporary) await rm(temporary, { recursive: true, force: true }); }
    finally { await lock.close(); await rm(lockPath, { force: true }); }
  }
  return { published: true, schema: meta.schema, sourceSha256: source.hash,
    objectCount: meta.geometry.objectCount, destination };
}

async function main(args) {
  if (args[0] === '--check-contract' && args.length === 2) {
    console.log(JSON.stringify({ schema: assertRollercoasterPublishContract(args[1]) }));
    return;
  }
  if (args.length !== 2 || args.some(argument => argument.startsWith('--'))) {
    throw new Error('Usage: node scripts/lib/about-rollercoaster-publish.mjs <staging-dir> <destination-dir>\n       node scripts/lib/about-rollercoaster-publish.mjs --check-contract about-rollercoaster-world/v2');
  }
  console.log(JSON.stringify(await publishRollercoasterBundle({ stagingDir: args[0], destinationDir: args[1] })));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    if (error.recoveryDirectory) console.error(`Previous bundle recovery files: ${error.recoveryDirectory}`);
    process.exitCode = 1;
  });
}
