#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { watch } from 'node:fs';
import {
  copyFile,
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..', '..');
const SOURCE_BLEND = join(
  REPO_ROOT,
  'source-assets',
  'about-v2-blender-current',
  'about-v2-track-working.blend',
);
const EXPORTER = join(SCRIPT_DIR, 'export-edited-about-v2-point-world.py');
const STAGE_ROOT = join(REPO_ROOT, '.cache', 'about-v2-blender-preview');
const OUTPUT_DIR = join(STAGE_ROOT, 'current');
const UPDATE_LOCK = join(STAGE_ROOT, '.updating');
const BLENDER_BIN = process.env.ABS_BLENDER_BIN
  || '/Applications/Blender.app/Contents/MacOS/Blender';
const WATCH_INTERVAL_MS = 750;
const STABLE_INTERVAL_MS = 350;
const PROMOTED_FILES = Object.freeze(['surfels.bin', 'camera-track.json', 'meta.json']);
const once = process.argv.includes('--once');
const initial = once || process.argv.includes('--initial');

function run(command, args) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: REPO_ROOT,
      env: process.env,
      stdio: 'inherit',
      shell: false,
    });
    child.once('error', rejectRun);
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      const detail = signal ? `signal ${signal}` : `exit code ${code}`;
      rejectRun(new Error(`${basename(command)} failed with ${detail}.`));
    });
  });
}

const wait = (milliseconds) => new Promise((resolveWait) => {
  setTimeout(resolveWait, milliseconds);
});

async function fileSignature() {
  const source = await stat(SOURCE_BLEND);
  return `${source.size}:${source.mtimeMs}`;
}

async function stableSignature() {
  let previous = await fileSignature();
  for (let attempt = 0; attempt < 8; attempt += 1) {
    await wait(STABLE_INTERVAL_MS);
    const current = await fileSignature();
    if (current === previous) return current;
    previous = current;
  }
  throw new Error('The Blender source did not settle after saving.');
}

async function promoteFile(stageDir, fileName) {
  const source = join(stageDir, fileName);
  const temporary = join(OUTPUT_DIR, `.${fileName}.${process.pid}.tmp`);
  await copyFile(source, temporary);
  await rename(temporary, join(OUTPUT_DIR, fileName));
}

const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');

async function validatePreviewBundle(stageDir) {
  const metadata = JSON.parse(await readFile(join(stageDir, 'meta.json'), 'utf8'));
  if (metadata.schema !== 'about-point-scene' || metadata.version !== 2) {
    throw new Error('The preview export has an unsupported point-scene contract.');
  }
  if (!metadata.source?.sha256 || metadata.source?.semanticFallbacks?.length) {
    throw new Error('The preview export has no source hash or contains semantic fallbacks.');
  }
  if (metadata.models?.length !== 7 || metadata.layout?.strideBytes !== 32) {
    throw new Error('The preview export does not contain the complete seven-model point world.');
  }
  const cameraBytes = await readFile(join(stageDir, 'camera-track.json'));
  const camera = JSON.parse(cameraBytes.toString('utf8'));
  if (camera.schema !== 'about-camera-track' || camera.samples?.length < 2) {
    throw new Error('The preview export has no usable Blender camera track.');
  }
  for (const key of ['surfels', 'cameraTrack']) {
    const record = metadata.files?.[key];
    if (!record?.file || !Number.isInteger(record.bytes) || !record.sha256) {
      throw new Error(`The preview export has no complete ${key} file record.`);
    }
    const bytes = key === 'cameraTrack'
      ? cameraBytes
      : await readFile(join(stageDir, record.file));
    if (bytes.length !== record.bytes || sha256(bytes) !== record.sha256) {
      throw new Error(`The preview export failed its ${key} integrity check.`);
    }
  }
  const controlValues = metadata.source?.authoring?.controlValues;
  if (!controlValues || Object.values(controlValues).some((value) => !Number.isFinite(value))) {
    throw new Error('The preview export has no finite Blender control mirror.');
  }
}

async function exportSavedBlend(trigger) {
  const signature = await stableSignature();
  await mkdir(STAGE_ROOT, { recursive: true });
  await mkdir(OUTPUT_DIR, { recursive: true });
  const stageDir = await mkdtemp(join(STAGE_ROOT, 'stage-'));
  console.log(`\n[About Blender] ${trigger}: exporting the saved canonical scene…`);
  try {
    await run(BLENDER_BIN, [
      '--background',
      SOURCE_BLEND,
      '--python',
      EXPORTER,
      '--',
      '--candidate-output-dir',
      stageDir,
    ]);
    await validatePreviewBundle(stageDir);
    await writeFile(UPDATE_LOCK, `${process.pid}\n`, 'utf8');
    try {
      // Promote the manifest last. The dev page treats a changed source hash in
      // meta.json as the signal that the binary and camera track are complete.
      for (const fileName of PROMOTED_FILES) await promoteFile(stageDir, fileName);
    } finally {
      await rm(UPDATE_LOCK, { force: true });
    }
    console.log('[About Blender] Preview updated. The dev About page will reload at the same scroll position.');
    return signature;
  } finally {
    await rm(stageDir, { recursive: true, force: true });
  }
}

let publishedSignature = '';
let handledSignature = '';
let exportRunning = false;
let exportQueued = false;
let stopped = false;

async function requestExport(trigger) {
  if (stopped) return;
  const current = await fileSignature();
  if (current === handledSignature) return;
  if (exportRunning) {
    exportQueued = true;
    return;
  }
  exportRunning = true;
  try {
    publishedSignature = await exportSavedBlend(trigger);
    handledSignature = publishedSignature;
  } catch (error) {
    console.error(`[About Blender] Export failed: ${error.message}`);
    console.error('[About Blender] Keeping the last good preview. Save the Blender file again after correcting the scene.');
    handledSignature = await fileSignature().catch(() => current);
    if (once) process.exitCode = 1;
  } finally {
    exportRunning = false;
    if (exportQueued && !once) {
      exportQueued = false;
      void requestExport('newer save detected');
    }
  }
}

await stat(SOURCE_BLEND);
await stat(BLENDER_BIN);

if (initial) await requestExport('initial sync');
if (once) process.exit(process.exitCode || 0);

if (!initial) {
  publishedSignature = await fileSignature();
  handledSignature = publishedSignature;
}
console.log(`[About Blender] Watching ${SOURCE_BLEND}`);
console.log('[About Blender] Keep http://localhost:8012/about.html open and save in Blender to refresh it.');

const directoryWatcher = watch(dirname(SOURCE_BLEND), { persistent: true }, (event, fileName) => {
  if (fileName && String(fileName) !== basename(SOURCE_BLEND)) return;
  void requestExport(`Blender ${event}`);
});
const interval = setInterval(() => {
  void requestExport('saved file changed');
}, WATCH_INTERVAL_MS);

function stop() {
  if (stopped) return;
  stopped = true;
  clearInterval(interval);
  directoryWatcher.close();
  console.log('\n[About Blender] Watcher stopped.');
}

process.once('SIGINT', () => {
  stop();
  process.exit(0);
});
process.once('SIGTERM', () => {
  stop();
  process.exit(0);
});
