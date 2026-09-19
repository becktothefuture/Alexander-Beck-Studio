import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fsPromises, { mkdtemp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { publishRollercoasterBundle } from './lib/about-rollercoaster-publish.mjs';
import {
  ROLLERCOASTER_SCHEMA, ROLLERCOASTER_SOURCE_FILE, validateRollercoasterBundle,
} from '../react-app/app/src/routes/about-rollercoaster/rollercoasterContract.js';

const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const cli = fileURLToPath(new URL('./lib/about-rollercoaster-publish.mjs', import.meta.url));

async function snapshot(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const result = {};
  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    result[entry.name] = entry.isDirectory() ? await snapshot(join(directory, entry.name)) : await readFile(join(directory, entry.name));
  }
  return result;
}

async function fixture(t) {
  const repoRoot = await mkdtemp(join(tmpdir(), 'about-publish-test-'));
  t.after(() => rm(repoRoot, { recursive: true, force: true }));
  const stagingDir = join(repoRoot, 'staging'), destinationDir = join(repoRoot, 'current');
  await mkdir(stagingDir);
  await mkdir(destinationDir);
  const sourceBytes = Buffer.from('isolated saved Blender source fixture');
  const sourcePath = join(repoRoot, ROLLERCOASTER_SOURCE_FILE);
  await mkdir(dirname(sourcePath), { recursive: true });
  await writeFile(sourcePath, sourceBytes);
  const cameraBytes = Buffer.from(JSON.stringify({ samples: [[0, 0, 0, 0, 0, 0, 0, 1], [1, 0, 0, -10, 0, 0, 0, 1]] }));
  const geometry = { objects: [{ id: 'test-wall', name: 'Test wall',
    positions: [-2, -2, -4, 2, -2, -4, 2, 2, -4, -2, 2, -4],
    faces: [[0, 1, 2, 3]], paletteRole: 6, motionGroup: 0 }] };
  let geometryBytes = Buffer.from(JSON.stringify(geometry));
  const boundaries = [0, 0.04, 0.16, 0.20, 0.40, 0.44, 0.59, 0.64, 0.72, 0.90, 0.97, 1];
  const beats = [
    ['departure', 'title'], ['background', 'prose'], ['curiosity', 'title'], ['tunnel-a', 'travel'],
    ['release', 'title'], ['disciplines', 'prose'], ['statements', 'title'], ['method', 'prose'],
    ['tunnel-b', 'travel'], ['approach', 'travel'], ['ending', 'ending'],
  ].map(([id, kind], index) => ({ id, kind, start: boundaries[index], end: boundaries[index + 1],
    scrollScreens: (boundaries[index + 1] - boundaries[index]) * 32 }));
  const meta = {
    schema: ROLLERCOASTER_SCHEMA, source: { file: ROLLERCOASTER_SOURCE_FILE, sha256: hash(sourceBytes) },
    camera: { file: 'camera.json', horizontalFov: 70, portraitVerticalFov: 90 }, cameraSha256: hash(cameraBytes),
    geometry: { file: 'geometry.json', objectCount: 1, sha256: hash(geometryBytes) },
    beats,
    motionGroups: [{ id: 0, kind: 'static', clock: 'ambient' }],
  };
  const save = async () => {
    geometryBytes = Buffer.from(JSON.stringify(geometry));
    await writeFile(join(stagingDir, 'meta.json'), JSON.stringify(meta));
    await writeFile(join(stagingDir, 'camera.json'), cameraBytes);
    await writeFile(join(stagingDir, 'geometry.json'), geometryBytes);
  };
  await save();
  const previousGeometry = Buffer.from(JSON.stringify({ objects: [{ ...geometry.objects[0], paletteRole: 2 }] }));
  const previousMeta = { ...meta, source: { ...meta.source, sha256: hash('previous saved source') },
    geometry: { ...meta.geometry, sha256: hash(previousGeometry) } };
  await writeFile(join(destinationDir, 'geometry.json'), previousGeometry);
  await writeFile(join(destinationDir, 'camera.json'), cameraBytes);
  await writeFile(join(destinationDir, 'meta.json'), JSON.stringify(previousMeta));
  await writeFile(join(destinationDir, 'keep.txt'), 'unrelated destination content');
  await writeFile(join(destinationDir, 'points.bin'), 'retired v1 point payload');
  return { repoRoot, stagingDir, destinationDir, sourcePath, meta, cameraBytes, geometry, save };
}

for (const [name, mutate, message] of [
  ['exported point density', f => { f.meta.circleField = { radius: 0.075, spacing: 0.23 }; }, /circleField|density|points/],
  ['exported point payload', f => { f.meta.points = { file: 'points.bin', count: 1 }; }, /circleField|density|points/],
  ['legacy source fog', f => { f.meta.fog = { near: 6, far: 9 }; }, /browser-owned/],
  ['legacy final-wall fog', f => { f.meta.fog = { near: 6, far: 9, finalWall: { near: 18, far: 48 } }; }, /browser-owned/],
  ['null source fog', f => { f.meta.fog = null; }, /browser-owned/],
  ['legacy visibility control', f => { f.meta.controls = [{ key: 'fogNear', binding: 'fogNear', baseline: 6 }]; }, /browser-owned/],
  ['legacy visibility binding alias', f => { f.meta.controls = [{ key: 'oldAlias', binding: 'fog.finalWall.far', baseline: 48 }]; }, /browser-owned/],
  ['legacy visibility key alias', f => { f.meta.controls = [{ key: 'fog.far', binding: 'oldAlias', baseline: 9 }]; }, /browser-owned/],
  ['unsupported clock', f => { f.meta.motionGroups[0].clock = 'progress'; }, /motion clock/],
  ['wrong geometry hash', f => { f.meta.geometry.sha256 = '0'.repeat(64); }, /geometry hash/],
  ['wrong camera hash', f => { f.meta.cameraSha256 = '0'.repeat(64); }, /camera hash/],
  ['stale saved-source hash', f => { f.meta.source.sha256 = '0'.repeat(64); }, /saved Blender source hash/],
  ['wrong source identity', f => { f.meta.source.file = 'source-assets/rejected.blend'; }, /source identity/],
  ['unsupported schema version', f => { f.meta.schema = 'about-rollercoaster-world/v1'; }, /publish contract/],
  ['unknown story beat ID', f => { f.meta.beats[2].id = 'unknown-title'; }, /Invalid About scene beat/],
  ['incorrect story beat order', f => {
    f.meta.beats[1].id = 'curiosity'; f.meta.beats[2].id = 'background';
  }, /Invalid About scene beat/],
  ['missing story beat with otherwise contiguous timing', f => {
    f.meta.beats[2].end = f.meta.beats[3].end;
    f.meta.beats.splice(3, 1);
  }, /complete editorial beat sequence/],
  ['old two-beat-only fixture', f => {
    f.meta.beats = [{ ...f.meta.beats[0], end: 0.97 }, f.meta.beats.at(-1)];
  }, /complete editorial beat sequence/],
  ['timing gap outside the story tolerance', f => { f.meta.beats[3].start += 5e-7; }, /Invalid About scene beat/],
]) {
  test(`${name} leaves every destination byte unchanged`, async t => {
    const f = await fixture(t);
    const before = await snapshot(f.destinationDir);
    mutate(f); await f.save();
    await assert.rejects(publishRollercoasterBundle(f), message);
    assert.deepEqual(await snapshot(f.destinationDir), before);
  });
}

for (const [name, mutate] of [
  ['invalid mesh coordinate', geometry => { geometry.objects[0].positions[0] = null; }],
  ['out-of-range face index', geometry => { geometry.objects[0].faces[0][0] = 99; }],
  ['unsupported material role', geometry => { geometry.objects[0].paletteRole = 7; }],
  ['unknown motion group', geometry => { geometry.objects[0].motionGroup = 9; }],
]) {
  test(`correct hashes cannot bypass ${name} validation`, async t => {
    const f = await fixture(t), before = await snapshot(f.destinationDir);
    mutate(f.geometry);
    f.meta.geometry.sha256 = hash(Buffer.from(JSON.stringify(f.geometry)));
    await f.save();
    await assert.rejects(publishRollercoasterBundle(f), /geometry|surface|mesh|face|role|motion|coordinate/i);
    assert.deepEqual(await snapshot(f.destinationDir), before);
  });
}

test('schema fast failure does not read missing data or create a destination', async t => {
  const f = await fixture(t);
  f.meta.schema = 'about-rollercoaster-world/v1';
  await f.save();
  await rm(join(f.stagingDir, 'geometry.json'));
  const destinationDir = join(f.repoRoot, 'never-created');
  await assert.rejects(publishRollercoasterBundle({ ...f, destinationDir }), /publish contract/);
  await assert.rejects(readdir(destinationDir), { code: 'ENOENT' });
});

test('valid publication writes the exact validated bytes and preserves unrelated files', async t => {
  const f = await fixture(t), staged = await snapshot(f.stagingDir);
  const result = await publishRollercoasterBundle(f);
  assert.equal(result.published, true);
  assert.equal(result.sourceSha256, f.meta.source.sha256);
  assert.deepEqual(await snapshot(f.destinationDir), { ...staged, 'keep.txt': Buffer.from('unrelated destination content') });
  await validateRollercoasterBundle({ meta: JSON.parse(staged['meta.json']), cameraBytes: staged['camera.json'], geometryBytes: staged['geometry.json'] });
});

test('valid first publication creates the destination only after validation', async t => {
  const f = await fixture(t), destinationDir = join(f.repoRoot, 'new', 'current');
  await publishRollercoasterBundle({ ...f, destinationDir });
  assert.deepEqual(await snapshot(destinationDir), await snapshot(f.stagingDir));
});

test('an active publisher lock prevents interleaving and retains every current byte', async t => {
  const f = await fixture(t);
  await writeFile(join(f.destinationDir, '.about-rollercoaster-publish.lock'), 'another publisher');
  const before = await snapshot(f.destinationDir);
  await assert.rejects(publishRollercoasterBundle(f), /publication is in progress/);
  assert.deepEqual(await snapshot(f.destinationDir), before);
});

test('CLI preflight checks the exact contract from any working directory', () => {
  const accepted = spawnSync(process.execPath, [cli, '--check-contract', ROLLERCOASTER_SCHEMA], { cwd: tmpdir(), encoding: 'utf8' });
  assert.equal(accepted.status, 0, accepted.stderr);
  assert.deepEqual(JSON.parse(accepted.stdout), { schema: ROLLERCOASTER_SCHEMA });
  const rejected = spawnSync(process.execPath, [cli, '--check-contract', 'about-rollercoaster-world/v1'], { cwd: tmpdir(), encoding: 'utf8' });
  assert.equal(rejected.status, 1);
  assert.match(rejected.stderr, /Unsupported publish contract/);
});

test('failed manifest replacement restores prior geometry, camera and retired points', async t => {
  const f = await fixture(t), before = await snapshot(f.destinationDir);
  const originalRename = fsPromises.rename;
  const installed = [];
  fsPromises.rename = async (source, destination) => {
    if (source.endsWith('/meta.json') && destination === join(f.destinationDir, 'meta.json')) {
      assert.deepEqual(installed, ['geometry.json', 'camera.json']);
      await assert.rejects(readFile(join(f.destinationDir, 'points.bin')), { code: 'ENOENT' });
      assert.deepEqual(await readFile(join(f.destinationDir, 'meta.json')), before['meta.json'],
        'The previous manifest stays installed until all new payload steps complete.');
      throw new Error('Injected manifest rename failure');
    }
    const result = await originalRename(source, destination);
    if (source.endsWith('/geometry.json')) installed.push('geometry.json');
    if (source.endsWith('/camera.json')) installed.push('camera.json');
    return result;
  };
  syncBuiltinESMExports();
  try {
    await assert.rejects(publishRollercoasterBundle(f), /Injected manifest rename failure/);
  } finally {
    fsPromises.rename = originalRename;
    syncBuiltinESMExports();
  }
  assert.deepEqual(await snapshot(f.destinationDir), before);
});

test('a saved source change during installation rolls back every payload before the manifest', async t => {
  const f = await fixture(t), before = await snapshot(f.destinationDir);
  const originalRename = fsPromises.rename;
  fsPromises.rename = async (source, destination) => {
    const result = await originalRename(source, destination);
    if (source.endsWith('/geometry.json')) await writeFile(f.sourcePath, 'source edited during publication');
    return result;
  };
  syncBuiltinESMExports();
  try {
    await assert.rejects(publishRollercoasterBundle(f), /source changed before publication/);
  } finally {
    fsPromises.rename = originalRename;
    syncBuiltinESMExports();
  }
  assert.deepEqual(await snapshot(f.destinationDir), before);
});

test('a non-file legacy payload target is never removed by v2 publication', async t => {
  const f = await fixture(t);
  await rm(join(f.destinationDir, 'points.bin'));
  await mkdir(join(f.destinationDir, 'points.bin'));
  await writeFile(join(f.destinationDir, 'points.bin', 'keep.txt'), 'not a retired point payload');
  const before = await snapshot(f.destinationDir);
  await assert.rejects(publishRollercoasterBundle(f), /non-file bundle target/);
  assert.deepEqual(await snapshot(f.destinationDir), before);
});

test('a hash-valid oversized surface cannot replace the last renderable bundle', async t => {
  const f = await fixture(t), before = await snapshot(f.destinationDir);
  f.geometry.objects[0].positions = [0, 0, -4, 1000, 0, -4, 1000, 1000, -4, 0, 1000, -4];
  f.meta.geometry.sha256 = hash(Buffer.from(JSON.stringify(f.geometry)));
  await f.save();
  await assert.rejects(publishRollercoasterBundle(f), /candidate|allocation|sampling|complexity/i);
  assert.deepEqual(await snapshot(f.destinationDir), before);
});

test('a surface below the candidate cap but above the circle-output cap preserves the current bundle', async t => {
  const f = await fixture(t), before = await snapshot(f.destinationDir);
  f.geometry.objects[0].positions = [0, 0, -4, 200, 0, -4, 200, 200, -4, 0, 200, -4];
  f.meta.geometry.sha256 = hash(Buffer.from(JSON.stringify(f.geometry)));
  await f.save();
  await assert.rejects(publishRollercoasterBundle(f), /point|output|allocation/i);
  assert.deepEqual(await snapshot(f.destinationDir), before);
});
