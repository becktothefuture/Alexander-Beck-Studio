import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  createAboutPreviewResolver,
  createBlenderSourceReader,
  publishAboutPreviewBundle,
  readAboutPreviewBundle,
} from './lib/about-blender-preview.mjs';

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
const modelKeys = ['about.00', 'about.02', 'about.03', 'about.04', 'about.05', 'about.06'];

async function writeBundle(directory, sourceSha, { cameraVersion = 1, corrupt = false } = {}) {
  await mkdir(directory, { recursive: true });
  const camera = JSON.stringify({ schema: 'about-camera-track', samples: [[0, cameraVersion], [1, cameraVersion]] });
  const points = Buffer.alloc(32, cameraVersion);
  const metadata = {
    schema: 'about-point-scene', version: 2,
    source: { sha256: sourceSha, authoring: { controlValues: { density: 1 } } },
    models: modelKeys.map((key, id) => ({ key, id })),
    layout: { strideBytes: 32 },
    files: {
      cameraTrack: { file: 'camera-track.json', sha256: hash(camera), bytes: Buffer.byteLength(camera) },
      surfels: { file: 'surfels.bin', sha256: hash(points), bytes: points.length },
    },
  };
  await Promise.all([
    writeFile(join(directory, 'meta.json'), JSON.stringify(metadata)),
    writeFile(join(directory, 'camera-track.json'), camera),
    writeFile(join(directory, 'surfels.bin'), corrupt ? Buffer.alloc(32, 99) : points),
  ]);
}

async function setup(t) {
  const directory = await mkdtemp(join(tmpdir(), 'about-preview-test-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const sourcePath = join(directory, 'scene.blend');
  const canonicalDirectory = join(directory, 'canonical');
  const previewDirectory = join(directory, 'preview');
  await writeFile(sourcePath, 'saved-scene');
  const sourceSha = hash('saved-scene');
  await writeBundle(canonicalDirectory, sourceSha);
  await mkdir(previewDirectory, { recursive: true });
  return { directory, sourcePath, sourceSha, canonicalDirectory, previewDirectory };
}

test('stale cached preview selects the validated canonical bundle and explains its source', async (t) => {
  const files = await setup(t);
  await writeBundle(join(files.previewDirectory, 'current'), hash('older-scene'));
  const resolver = createAboutPreviewResolver(files);
  const selected = await resolver.resolve();
  assert.equal(selected.source.sha256, files.sourceSha);
  assert.equal(selected.preview.activeSource, 'canonical');
  assert.equal(selected.preview.status, 'stale');
  assert.equal(selected.preview.sourceMatches, true);
  assert.match(selected.preview.message, /Cached preview is stale/u);
  assert.ok(resolver.getBundle(selected.preview.bundleHash).buffers['surfels.bin']);
});

test('corrupt and missing cached exports never displace a validated canonical scene', async (t) => {
  const files = await setup(t);
  const resolver = createAboutPreviewResolver(files);
  assert.equal((await resolver.resolve()).preview.status, 'ready');
  await writeBundle(join(files.previewDirectory, 'current'), files.sourceSha, { corrupt: true });
  assert.equal((await resolver.resolve()).preview.activeSource, 'canonical');
  await writeFile(join(files.previewDirectory, '.exporting'), String(process.pid));
  const exporting = await resolver.resolve();
  assert.equal(exporting.preview.status, 'exporting');
  assert.equal(exporting.source.sha256, files.sourceSha);
});

test('source hashes are reused until the file signature changes', async (t) => {
  const files = await setup(t);
  let reads = 0;
  const readSource = createBlenderSourceReader({ read: (path) => { reads += 1; return readFile(path); } });
  const resolver = createAboutPreviewResolver({ ...files, readSource });
  await resolver.resolve();
  await resolver.resolve();
  assert.equal(reads, 1);
  await writeFile(files.sourcePath, 'newer-scene');
  const stale = await resolver.resolve();
  assert.equal(reads, 2);
  assert.equal(stale.preview.sourceMatches, false);
  assert.equal(stale.preview.expectedSourceSha, hash('newer-scene'));
  assert.equal(stale.preview.status, 'stale');
});

test('the same Blender hash with new camera and point data has a different immutable identity', async (t) => {
  const files = await setup(t);
  const resolver = createAboutPreviewResolver(files);
  const before = await resolver.resolve();
  const originalCamera = resolver.getBundle(before.preview.bundleHash).buffers['camera-track.json'];
  await writeBundle(files.canonicalDirectory, files.sourceSha, { cameraVersion: 2 });
  const after = await resolver.resolve();
  assert.equal(before.source.sha256, after.source.sha256);
  assert.notEqual(before.preview.bundleHash, after.preview.bundleHash);
  assert.notEqual(before.preview.assetRoot, after.preview.assetRoot);
  assert.deepEqual(resolver.getBundle(before.preview.bundleHash).buffers['camera-track.json'], originalCamera);
  assert.notDeepEqual(resolver.getBundle(after.preview.bundleHash).buffers['camera-track.json'], originalCamera);
});

test('a save during export cannot publish against a different source identity', async (t) => {
  const files = await setup(t);
  const readIdentity = createBlenderSourceReader();
  const readSource = () => readIdentity(files.sourcePath);
  const sourceBefore = await readSource();
  const stageDirectory = join(files.directory, 'staged');
  await writeBundle(stageDirectory, files.sourceSha);
  await writeFile(files.sourcePath, 'changed-during-export');
  await assert.rejects(publishAboutPreviewBundle({
    stageDirectory, previewDirectory: files.previewDirectory, sourceBefore, readSource,
  }), { code: 'ABOUT_SOURCE_CHANGED' });
  await assert.rejects(readFile(join(files.previewDirectory, 'current.json')), { code: 'ENOENT' });
});

test('publication keeps the prior complete bundle until the new pointer is installed', async (t) => {
  const files = await setup(t);
  const readIdentity = createBlenderSourceReader();
  const readSource = () => readIdentity(files.sourcePath);
  const sourceBefore = await readSource();
  const resolver = createAboutPreviewResolver(files);
  const firstStage = join(files.directory, 'first-stage');
  await writeBundle(firstStage, files.sourceSha);
  const first = await publishAboutPreviewBundle({
    stageDirectory: firstStage, previewDirectory: files.previewDirectory, sourceBefore, readSource,
  });
  assert.equal((await resolver.resolve()).preview.bundleHash, first.bundleHash);
  const secondStage = join(files.directory, 'second-stage');
  await writeBundle(secondStage, files.sourceSha, { cameraVersion: 2 });
  let reads = 0;
  await assert.rejects(publishAboutPreviewBundle({
    stageDirectory: secondStage, previewDirectory: files.previewDirectory, sourceBefore,
    readSource: async () => {
      reads += 1;
      if (reads === 2) await writeFile(files.sourcePath, 'saved-at-promotion');
      return readSource();
    },
  }), { code: 'ABOUT_SOURCE_CHANGED' });
  const pointer = JSON.parse(await readFile(join(files.previewDirectory, 'current.json')));
  assert.equal(pointer.bundleHash, first.bundleHash);
  const active = await readAboutPreviewBundle(join(files.previewDirectory, 'bundles', pointer.bundleHash));
  assert.equal(active.bundleHash, first.bundleHash);
  assert.equal(resolver.getBundle(first.bundleHash).metadata.source.sha256, files.sourceSha);
});

test('a successful publication switches all assets together and keeps an in-flight older bundle readable', async (t) => {
  const files = await setup(t);
  const readIdentity = createBlenderSourceReader();
  const readSource = () => readIdentity(files.sourcePath);
  const sourceBefore = await readSource();
  const resolver = createAboutPreviewResolver(files);
  const before = await resolver.resolve();
  const stageDirectory = join(files.directory, 'next-stage');
  await writeBundle(stageDirectory, files.sourceSha, { cameraVersion: 2 });
  const published = await publishAboutPreviewBundle({
    stageDirectory, previewDirectory: files.previewDirectory, sourceBefore, readSource,
  });
  const after = await resolver.resolve();
  assert.equal(after.preview.activeSource, 'preview');
  assert.equal(after.preview.status, 'ready');
  assert.equal(after.preview.bundleHash, published.bundleHash);
  assert.notEqual(after.preview.bundleHash, before.preview.bundleHash);
  for (const name of ['meta.json', 'camera-track.json', 'surfels.bin']) {
    assert.deepEqual(resolver.getBundle(published.bundleHash).buffers[name], published.buffers[name]);
    assert.ok(resolver.getBundle(before.preview.bundleHash).buffers[name]);
  }
});
