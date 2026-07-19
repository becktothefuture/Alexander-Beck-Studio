import assert from 'node:assert/strict';
import {
  mkdtemp,
  readFile,
  readdir,
  rm,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  createAboutNarrativePersistenceService,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePersistenceServer.js';
import {
  ABOUT_NARRATIVE_TRACK_ENVELOPE_VERSION,
  loadAboutNarrativeTrackSource,
  migrateAboutNarrativeTrackCheckpointEnvelope,
  migrateAboutNarrativeTrackRecoveryEnvelope,
  serializeAboutNarrativeTrackSource,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackPersistence.js';
import {
  migrateAboutNarrativeVersion2To3,
  migrateAboutNarrativeVersion2To4,
  migrateAboutNarrativeVersion3To4,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackSchema.js';

const canonicalPath = new URL('./fixtures/about-narrative/contents-about-v2.json', import.meta.url);
const canonicalV2 = JSON.parse(await readFile(canonicalPath, 'utf8'));
const clone = (value) => structuredClone(value);

test('raw schema v1 migrates through the established semantics into deterministic v4', () => {
  const v1 = clone(canonicalV2);
  v1.schemaVersion = 1;
  const result = loadAboutNarrativeTrackSource(v1);
  assert.equal(result.valid, true);
  assert.equal(result.status, 'migrated');
  assert.equal(result.sourceVersion, 1);
  assert.deepEqual(result.migrations, ['1->2', '2->3', '3->4']);
  assert.equal(result.document.schemaVersion, 4);
  assert.equal(result.document.sections, undefined);
  assert.deepEqual(v1, { ...canonicalV2, schemaVersion: 1 }, 'migration must not mutate raw v1 input');
});

test('raw schema v2 migrates directly and leaves the exact source untouched', () => {
  const source = clone(canonicalV2);
  const before = JSON.stringify(source);
  const result = loadAboutNarrativeTrackSource(source);
  assert.equal(result.valid, true);
  assert.deepEqual(result.migrations, ['2->3', '3->4']);
  assert.deepEqual(result.document, migrateAboutNarrativeVersion2To4(canonicalV2));
  assert.equal(JSON.stringify(source), before);
  assert.deepEqual(result.original, source);
  assert.notEqual(result.original, source);
});

test('valid schema v4 is validated raw, normalized, and serialized byte-deterministically', () => {
  const v3 = migrateAboutNarrativeVersion2To3(canonicalV2);
  const v4 = migrateAboutNarrativeVersion3To4(v3);
  const migrated = loadAboutNarrativeTrackSource(v3);
  assert.equal(migrated.status, 'migrated');
  assert.deepEqual(migrated.migrations, ['3->4']);
  assert.deepEqual(migrated.document, v4);
  const loaded = loadAboutNarrativeTrackSource(v4);
  assert.equal(loaded.valid, true);
  assert.equal(loaded.status, 'current');
  assert.deepEqual(loaded.migrations, []);
  const first = serializeAboutNarrativeTrackSource(v4);
  const second = serializeAboutNarrativeTrackSource(JSON.parse(first));
  assert.equal(second, first);
  assert.deepEqual(JSON.parse(first), loaded.document);
  assert.throws(() => serializeAboutNarrativeTrackSource(canonicalV2), /explicitly migrated schema v4/);
});

test('future documents stay read-only with their exact original representation preserved', () => {
  const future = { schemaVersion: 9, customFutureData: { retained: true } };
  const objectResult = loadAboutNarrativeTrackSource(future);
  assert.equal(objectResult.status, 'future');
  assert.equal(objectResult.readOnly, true);
  assert.deepEqual(objectResult.original, future);
  assert.deepEqual(objectResult.document, future);

  const futureJson = '{"schemaVersion":9, "customSpacing":true}\n';
  const stringResult = loadAboutNarrativeTrackSource(futureJson);
  assert.equal(stringResult.readOnly, true);
  assert.equal(stringResult.original, futureJson);
});

test('invalid raw input is never normalized and remains available for exact recovery export', () => {
  const invalidV2 = clone(canonicalV2);
  invalidV2.sections[1].world.transitionIn.correspondence = 'invalid-strategy';
  const v2Result = loadAboutNarrativeTrackSource(invalidV2);
  assert.equal(v2Result.status, 'invalid');
  assert.equal(v2Result.document, null);
  assert.deepEqual(v2Result.original, invalidV2);
  assert.equal(v2Result.original.sections[1].world.transitionIn.correspondence, 'invalid-strategy');

  const invalidV3 = migrateAboutNarrativeVersion2To3(canonicalV2);
  invalidV3.tracks.camera.keys[0].legacySectionId = 'promise';
  const v3Result = loadAboutNarrativeTrackSource(invalidV3);
  assert.equal(v3Result.valid, false);
  assert.ok(v3Result.diagnostics.some((item) => item.code === 'unknown-key'));
  assert.equal(v3Result.original.tracks.camera.keys[0].legacySectionId, 'promise');

  const malformed = '{"schemaVersion":3';
  const malformedResult = loadAboutNarrativeTrackSource(malformed);
  assert.equal(malformedResult.valid, false);
  assert.equal(malformedResult.original, malformed);
  assert.equal(malformedResult.diagnostics[0].code, 'json-parse');
});

test('recovery envelopes migrate document and selection metadata on independent versions', () => {
  const legacyEnvelope = {
    schemaVersion: 2,
    baseSourceHash: 'source-hash',
    timestamp: 123456,
    storyWU: 3.25,
    selection: { type: 'cue', sectionId: 'promise', cueId: 'promise-main' },
    document: clone(canonicalV2),
  };
  const result = migrateAboutNarrativeTrackRecoveryEnvelope(legacyEnvelope);
  assert.equal(result.valid, true);
  assert.equal(result.envelope.envelopeVersion, ABOUT_NARRATIVE_TRACK_ENVELOPE_VERSION);
  assert.equal(result.envelope.kind, 'recovery');
  assert.equal(result.envelope.schemaVersion, undefined);
  assert.equal(result.envelope.document.schemaVersion, 4);
  assert.deepEqual(result.envelope.selection, { type: 'text-field', id: 'text-promise-main' });
  assert.equal(result.envelope.storyWU, 3.25);
  assert.equal(result.envelope.baseSourceHash, 'source-hash');
  assert.deepEqual(result.migrations, ['legacy-envelope->1', '2->3', '3->4']);
  assert.deepEqual(result.original, legacyEnvelope);
});

test('checkpoint envelopes normalize selections for former continue passages', () => {
  const checkpoint = {
    id: 'checkpoint-1',
    name: 'Practice reveal',
    timestamp: 234567,
    baseSourceHash: 'base',
    storyWU: 9,
    selection: { type: 'section', sectionId: 'practice-reveal' },
    document: clone(canonicalV2),
  };
  const result = migrateAboutNarrativeTrackCheckpointEnvelope(checkpoint);
  assert.equal(result.valid, true);
  assert.equal(result.envelope.kind, 'checkpoint');
  assert.equal(result.envelope.id, checkpoint.id);
  assert.equal(result.envelope.name, checkpoint.name);
  assert.deepEqual(result.envelope.selection, { type: 'world', id: 'world-background' });
  assert.equal(result.envelope.document.sections, undefined);
});

test('preflight failures reject candidates without mutating source or migrated output', () => {
  const source = migrateAboutNarrativeVersion2To4(canonicalV2);
  const before = JSON.stringify(source);
  let preflightCandidate = null;
  const result = loadAboutNarrativeTrackSource(source, {
    preflight(candidate) {
      preflightCandidate = candidate;
      candidate.tracks.camera.keys[0].position[0] = 999;
      return {
        valid: false,
        message: 'Profile compile failed.',
        diagnostics: [{ level: 'error', code: 'profile-compile', path: 'profiles.mobile', message: 'Profile compile failed.' }],
      };
    },
  });
  assert.equal(result.valid, false);
  assert.equal(result.status, 'invalid');
  assert.equal(result.diagnostics[0].code, 'profile-compile');
  assert.equal(JSON.stringify(source), before);
  assert.notEqual(preflightCandidate, source);
  assert.deepEqual(result.original, source);

  const accepted = loadAboutNarrativeTrackSource(source, { preflight: () => ({ valid: true }) });
  assert.equal(accepted.valid, true);
});

test('development persistence migrates v2 in memory and atomically roundtrips v4 across restart', async () => {
  const canonicalBefore = await readFile(canonicalPath, 'utf8');
  const directory = await mkdtemp(join(tmpdir(), 'about-narrative-v3-persistence-'));
  const configPath = join(directory, 'contents-about-test.json');
  await writeFile(configPath, canonicalBefore, 'utf8');
  try {
    const service = createAboutNarrativePersistenceService({ configPath });
    const loaded = await service.read();
    assert.equal(loaded.readOnly, false);
    assert.equal(loaded.status, 'migrated');
    assert.equal(loaded.sourceVersion, 2);
    assert.deepEqual(loaded.migrations, ['2->3', '3->4']);
    assert.equal(loaded.document.schemaVersion, 4);
    assert.equal(loaded.document.sections, undefined);

    const changed = clone(loaded.document);
    changed.globals.readingWidthRem += 1;
    const saved = await service.save(changed, `"${loaded.hash}"`);
    assert.equal(await readFile(configPath, 'utf8'), saved.serialized);
    assert.deepEqual(await readdir(directory), ['contents-about-test.json']);

    const restarted = createAboutNarrativePersistenceService({ configPath });
    const reloaded = await restarted.read();
    assert.equal(reloaded.status, 'current');
    assert.equal(reloaded.hash, saved.hash);
    assert.deepEqual(reloaded.document, saved.document);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  assert.equal(await readFile(canonicalPath, 'utf8'), canonicalBefore);
});

test('development persistence rejects conflicts, invalid candidates, future candidates, and preflight failures without writes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'about-narrative-v3-rejection-'));
  const configPath = join(directory, 'contents-about-test.json');
  const v4 = migrateAboutNarrativeVersion2To4(canonicalV2);
  const initial = serializeAboutNarrativeTrackSource(v4);
  await writeFile(configPath, initial, 'utf8');
  try {
    const service = createAboutNarrativePersistenceService({ configPath });
    const loaded = await service.read();
    const changed = clone(loaded.document);
    changed.globals.readingWidthRem += 1;

    await assert.rejects(service.save(changed, 'stale-hash'), (error) => error.statusCode === 409);
    assert.equal(await readFile(configPath, 'utf8'), initial);

    const invalid = clone(changed);
    invalid.tracks.camera.keys[0].legacySectionId = 'promise';
    await assert.rejects(service.save(invalid, loaded.hash), (error) => (
      error.name === 'AboutNarrativeValidationError'
      && error.diagnostics.some((item) => item.code === 'unknown-key')
    ));
    assert.equal(await readFile(configPath, 'utf8'), initial);

    await assert.rejects(service.save({ schemaVersion: 99, future: true }, loaded.hash), (error) => (
      error.name === 'AboutNarrativeValidationError'
      && /future/i.test(error.message)
    ));
    assert.equal(await readFile(configPath, 'utf8'), initial);

    const preflightFailure = createAboutNarrativePersistenceService({
      configPath,
      preflight: () => ({
        valid: false,
        diagnostics: [{ level: 'error', code: 'forced-preflight', path: 'profiles.mobile', message: 'Forced preflight failure.' }],
      }),
    });
    const locked = await preflightFailure.read();
    assert.equal(locked.readOnly, true);
    assert.equal(locked.status, 'invalid');
    await assert.rejects(preflightFailure.save(changed, locked.hash), (error) => (
      error.name === 'AboutNarrativeValidationError'
      && error.diagnostics.some((item) => item.code === 'forced-preflight')
    ));
    assert.equal(await readFile(configPath, 'utf8'), initial);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('invalid and future canonical sources remain exact read-only recovery payloads', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'about-narrative-v3-recovery-'));
  const configPath = join(directory, 'contents-about-test.json');
  const replacement = migrateAboutNarrativeVersion2To4(canonicalV2);
  try {
    const futureRaw = '{\n  "schemaVersion": 99,\n  "futureSpacing": true\n}\n';
    await writeFile(configPath, futureRaw, 'utf8');
    const futureService = createAboutNarrativePersistenceService({ configPath });
    const future = await futureService.read();
    assert.equal(future.readOnly, true);
    assert.equal(future.status, 'future');
    assert.equal(future.document, futureRaw);
    await assert.rejects(futureService.save(replacement, future.hash), /cannot be overwritten/i);
    assert.equal(await readFile(configPath, 'utf8'), futureRaw);

    const invalidRaw = '{"schemaVersion":3,"broken":';
    await writeFile(configPath, invalidRaw, 'utf8');
    const invalidService = createAboutNarrativePersistenceService({ configPath });
    const invalid = await invalidService.read();
    assert.equal(invalid.readOnly, true);
    assert.equal(invalid.status, 'invalid');
    assert.equal(invalid.document, invalidRaw);
    await assert.rejects(invalidService.save(replacement, invalid.hash), /cannot be overwritten/i);
    assert.equal(await readFile(configPath, 'utf8'), invalidRaw);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
