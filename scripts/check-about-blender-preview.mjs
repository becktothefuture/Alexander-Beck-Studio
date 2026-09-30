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
import { attachInstanceVisibility } from './lib/about-instance-visibility-fixture.mjs';
import { ABOUT_BLENDER_MAX_MODELS, ABOUT_CONNECTED_WORLD_TYPE } from '../react-app/app/src/routes/about-narrative-lab/aboutBlenderSceneContract.js';

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

async function writeConnectedBundle(directory, sourceSha, { revision = 1, mutate = () => {} } = {}) {
  await mkdir(directory, { recursive: true });
  const camera = {
    schema: 'about-camera-track', version: 5, routeId: 'sculptural-connected-world', sampleCount: 3,
    projection: { type: 'perspective', fovAxis: 'horizontal', horizontalFov: 70, portraitMaxVerticalFov: 90 },
    samples: [[0, 0, 0, 0, 0, 0, 1], [4, -3, -12, 0, 0, Math.sin(0.2), Math.cos(0.2)],
      [10 + revision, 0, -20, 0, 0, 0, 1]],
  };
  const points = Buffer.alloc(3 * 32);
  for (let index = 0; index < 3; index += 1) {
    points.writeFloatLE(index + revision, index * 32);
    points.writeFloatLE(-20, index * 32 + 8);
    points.writeUInt16LE(450, index * 32 + 16);
  }
  const metadata = {
    schema: 'about-point-scene', version: 2,
    source: {
      sha256: sourceSha, worldType: ABOUT_CONNECTED_WORLD_TYPE,
      circleField: { version: 1, spacingWU: 0.225, radiusWU: 0.045,
        qualitySpacingScale: { master: 1, desktop: Math.sqrt(1.5), mobile: Math.sqrt(27000 / 6500) } },
      authoring: { controlValues: { density: 1 }, cameraFog: {
        startWU: 12, endWU: 95, curve: 1, source: 'about.controls',
      } },
    },
    models: [{ id: 0, key: 'world.connected', renderingProfile: 'solid',
      visibilitySpace: 'camera-distance-wu', visibilityStartWU: 0,
      visibilityEndWU: 100, visibilityHandoffWU: 1 }],
    motionGroups: [{ id: 0, key: 'world.connected.rigid' }],
    layout: { strideBytes: 32 }, quantization: { radiusWU: { step: 0.0001 } },
    files: { surfels: { count: 3 } },
  };
  mutate({ metadata, camera, points });
  const cameraBytes = JSON.stringify(camera);
  Object.assign(metadata.files.surfels, { file: 'surfels.bin', bytes: points.length, sha256: hash(points) });
  metadata.files.cameraTrack = { file: 'camera-track.json', bytes: Buffer.byteLength(cameraBytes), sha256: hash(cameraBytes) };
  await Promise.all([
    writeFile(join(directory, 'meta.json'), JSON.stringify(metadata)),
    writeFile(join(directory, 'camera-track.json'), cameraBytes),
    writeFile(join(directory, 'surfels.bin'), points),
  ]);
  return { metadata, camera, points };
}

test('connected worlds use the same atomic preview and immutable bundle delivery as legacy scenes', async (t) => {
  const files = await setup(t);
  await writeConnectedBundle(files.canonicalDirectory, files.sourceSha);
  const resolver = createAboutPreviewResolver(files);
  const before = await resolver.resolve();
  assert.equal(before.preview.status, 'ready');
  assert.equal(before.source.worldType, ABOUT_CONNECTED_WORLD_TYPE);
  assert.deepEqual(before.models.map(model => model.key), ['world.connected']);
  const original = resolver.getBundle(before.preview.bundleHash);
  const originalCamera = Buffer.from(original.buffers['camera-track.json']);
  const stageDirectory = join(files.directory, 'connected-next');
  await writeConnectedBundle(stageDirectory, files.sourceSha, { revision: 2 });
  const reader = createBlenderSourceReader();
  const readSource = () => reader(files.sourcePath);
  const published = await publishAboutPreviewBundle({
    stageDirectory, previewDirectory: files.previewDirectory, sourceBefore: await readSource(), readSource,
  });
  const after = await resolver.resolve();
  assert.equal(after.preview.status, 'ready');
  assert.equal(after.preview.activeSource, 'preview');
  assert.notEqual(after.preview.bundleHash, before.preview.bundleHash);
  assert.equal(after.preview.bundleHash, published.bundleHash);
  assert.deepEqual(resolver.getBundle(before.preview.bundleHash).buffers['camera-track.json'], originalCamera);
  for (const file of ['meta.json', 'camera-track.json', 'surfels.bin']) {
    assert.deepEqual(resolver.getBundle(after.preview.bundleHash).buffers[file], published.buffers[file]);
  }
});

test('connected preview validation rejects unsafe source contracts without accepting legacy model shortcuts', async (t) => {
  const files = await setup(t);
  const cases = [
    [/unsupported connected world/, f => { f.metadata.source.worldType = 'connected-circle-world-v2'; }],
    [/active scene models/, f => { delete f.metadata.source.worldType; }],
    [/renderer capacity/, f => { f.metadata.models = []; }],
    [/renderer capacity/, f => { f.metadata.models = Array.from({ length: ABOUT_BLENDER_MAX_MODELS + 1 },
      (_, id) => ({ ...f.metadata.models[0], id, key: `region.${id}` })); }],
    [/renderer capacity/, f => { f.metadata.models[0].id = 1; }],
    [/renderer capacity/, f => { f.metadata.models[0].renderingProfile = 'scan'; }],
    [/fixed source geometry/, f => { f.metadata.motionGroups[0].motion = {
      behavior: 'continuous-rotation', axis: [0, 1, 0], pivotWU: [0, 0, 0],
      radiansPerSecond: 0.1, timeSource: 'ambient-seconds',
    }; }],
    [/geography/, f => { f.metadata.source.geography = {}; }],
    [/component visibility/, f => { f.metadata.terminalStudy = {}; }],
    [/[Ii]nstance/, f => { f.metadata.instanceVisibility = {}; }],
    [/circle field/, f => { delete f.metadata.source.circleField; }],
    [/circleField/, f => { f.metadata.source.circleField.radiusWU = 0.2; }],
    [/circleField.radiusWU/, f => { f.points.writeUInt16LE(449, f.points.length - 16); }],
    [/packed records/, f => { f.metadata.files.surfels.count = 2; }],
    [/complete rail/, f => { f.metadata.models[0].visibilityStartWU = 0.1; }],
    [/complete rail/, f => { f.metadata.models[0].visibilityEndWU = 20; }],
    [/complete rail/, f => { f.metadata.models[0].visibilityHandoffWU = 0; }],
    [/complete rail/, f => { delete f.metadata.models[0].visibilitySpace; }],
    [/sculptural-connected-world/, f => { f.camera.routeId = 'legacy-city'; }],
  ];
  for (const [message, mutate] of cases) {
    await writeConnectedBundle(files.canonicalDirectory, files.sourceSha, { mutate });
    await assert.rejects(readAboutPreviewBundle(files.canonicalDirectory), message);
  }
});

test('connected previews retain point hashes and reject source saves during publication', async (t) => {
  const files = await setup(t);
  await writeConnectedBundle(files.canonicalDirectory, files.sourceSha);
  await writeFile(join(files.canonicalDirectory, 'surfels.bin'), Buffer.alloc(96));
  await assert.rejects(readAboutPreviewBundle(files.canonicalDirectory), /surfels integrity check/);
  const reader = createBlenderSourceReader();
  const readSource = () => reader(files.sourcePath);
  const sourceBefore = await readSource();
  const stageDirectory = join(files.directory, 'connected-stage');
  await writeConnectedBundle(stageDirectory, files.sourceSha);
  await writeFile(files.sourcePath, 'changed-connected-world');
  await assert.rejects(publishAboutPreviewBundle({
    stageDirectory, previewDirectory: files.previewDirectory, sourceBefore, readSource,
  }), { code: 'ABOUT_SOURCE_CHANGED' });
  await assert.rejects(readFile(join(files.previewDirectory, 'current.json')), { code: 'ENOENT' });
});

async function writeInstanceBundle(directory, sourceSha) {
  await writeBundle(directory, sourceSha);
  const meta = JSON.parse(await readFile(join(directory, 'meta.json'), 'utf8'));
  meta.models = Array.from({ length: 7 }, (_, id) => ({ id, key: `about.0${id}` }));
  const surfelBytes = new Uint8Array(3 * 32);
  const points = new DataView(surfelBytes.buffer);
  [0, 5, 5].forEach((id, index) => points.setUint16(index * 32 + 20, id, true));
  meta.files.surfels = { file: 'surfels.bin', count: 3, bytes: surfelBytes.byteLength, sha256: hash(surfelBytes) };
  const fixture = attachInstanceVisibility({ meta, surfelBytes,
    cameraTrackBytes: await readFile(join(directory, 'camera-track.json')) }, {
    startWU: 2, endWU: 20,
    windows: [
      { apertureId: 1, startWU: 2, endWU: 20, entranceHandoffWU: 1, exitHandoffWU: 1 },
      { apertureId: 2, startWU: 8, endWU: 20, entranceHandoffWU: 4, exitHandoffWU: 1 },
    ],
  });
  await Promise.all([
    writeFile(join(directory, 'meta.json'), JSON.stringify(meta)),
    writeFile(join(directory, 'surfels.bin'), surfelBytes),
    writeFile(join(directory, 'camera-track.json'), new Uint8Array(fixture.cameraTrackBytes)),
    writeFile(join(directory, 'instance-visibility.bin'), new Uint8Array(fixture.instanceVisibilityBytes)),
  ]);
  return fixture;
}

test('optional sidecar participates in complete bundle delivery, identity and cache signatures', async (t) => {
  const files = await setup(t);
  const fixture = await writeInstanceBundle(files.canonicalDirectory, files.sourceSha);
  const resolver = createAboutPreviewResolver(files);
  const initial = await resolver.resolve();
  assert.equal(initial.preview.status, 'ready');
  const previous = resolver.getBundle(initial.preview.bundleHash);
  const originalBytes = Buffer.from(previous.buffers['instance-visibility.bin']);
  assert.equal(originalBytes.length, fixture.meta.files.instanceVisibility.bytes);
  const sidecar = new Uint8Array(fixture.instanceVisibilityBytes);
  // Change valid component ownership bytes without changing source or surfels.
  new DataView(sidecar.buffer).setUint16(2, 1, true);
  new DataView(sidecar.buffer).setUint16(4, 0, true);
  await writeFile(join(files.canonicalDirectory, 'instance-visibility.bin'), sidecar);
  await assert.rejects(readAboutPreviewBundle(files.canonicalDirectory), /instanceVisibility integrity check/);
  const corrupted = await resolver.resolve();
  assert.equal(corrupted.preview.status, 'unavailable', 'A sidecar signature change must invalidate the cached validation.');
  assert.match(corrupted.preview.message, /instanceVisibility integrity check/);
  assert.deepEqual(previous.buffers['instance-visibility.bin'], originalBytes,
    'Previously delivered immutable buffers cannot become a mixed bundle.');
  fixture.meta.files.instanceVisibility.sha256 = hash(sidecar);
  await writeFile(join(files.canonicalDirectory, 'meta.json'), JSON.stringify(fixture.meta));
  const refreshed = await resolver.resolve();
  assert.equal(refreshed.preview.status, 'ready');
  assert.notEqual(refreshed.preview.bundleHash, initial.preview.bundleHash);
  assert.deepEqual(resolver.getBundle(refreshed.preview.bundleHash).buffers['instance-visibility.bin'], Buffer.from(sidecar));
  await rm(join(files.canonicalDirectory, 'instance-visibility.bin'));
  assert.equal((await resolver.resolve()).preview.status, 'unavailable');
});

test('preview publication refuses malformed or partially declared instance bundles', async (t) => {
  const files = await setup(t);
  const fixture = await writeInstanceBundle(files.canonicalDirectory, files.sourceSha);
  for (const mutation of [
    (meta) => { delete meta.instanceVisibility; },
    (meta) => { meta.files.instanceVisibility.bytes += 2; },
    (meta) => { meta.instanceVisibility.bindings[1].objectKey = 'other-host'; },
  ]) {
    const malformed = structuredClone(fixture.meta);
    mutation(malformed);
    await writeFile(join(files.canonicalDirectory, 'meta.json'), JSON.stringify(malformed));
    await assert.rejects(readAboutPreviewBundle(files.canonicalDirectory), /[Ii]nstance|child/);
  }
});

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
