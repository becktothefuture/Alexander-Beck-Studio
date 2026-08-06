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
  loadAboutNarrativePointFieldPersistenceSource,
  migrateAboutNarrativePointFieldCheckpointEnvelope,
  migrateAboutNarrativePointFieldRecoveryEnvelope,
  preflightAboutNarrativePointFieldRuntimePlans,
  serializeAboutNarrativePointFieldSource,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';

const canonicalV2 = JSON.parse(await readFile(
  new URL('./fixtures/about-narrative/contents-about-v2.json', import.meta.url),
  'utf8',
));
const canonicalV5Source = await readFile(
  new URL('./fixtures/about-narrative/contents-about-v5.json', import.meta.url),
  'utf8',
);
const canonicalV5 = JSON.parse(canonicalV5Source);
const clone = (value) => structuredClone(value);

test('the v6 boundary migrates legacy v1-v5 sources in memory without changing the exact input', () => {
  for (const source of [{ ...clone(canonicalV2), schemaVersion: 1 }, canonicalV2, canonicalV5]) {
    const before = JSON.stringify(source);
    const loaded = loadAboutNarrativePointFieldPersistenceSource(source, {
      preflight: preflightAboutNarrativePointFieldRuntimePlans,
    });
    assert.equal(loaded.valid, true);
    assert.equal(loaded.status, 'migrated');
    assert.equal(loaded.document.schemaVersion, 6);
    assert.equal(loaded.migrations.at(-1), '5->6');
    assert.equal(JSON.stringify(source), before);
  }

  const legacy = loadAboutNarrativePointFieldPersistenceSource(canonicalV2, {
    preflight: preflightAboutNarrativePointFieldRuntimePlans,
  });
  const interaction = legacy.document.tracks.interactions.clips.find((clip) => (
    clip.id === 'interaction-epilogue'
  ));
  const targetDeparture = legacy.document.tracks.pointField.keys.find((key) => (
    key.id === 'key-world-epilogue-departure'
  ));
  assert.ok(interaction.startWU < targetDeparture.atWU);
  assert.ok(interaction.endWU > targetDeparture.atWU);
});

test('v6 serialization is deterministic and never projects an authored document back to v5', () => {
  const migrated = loadAboutNarrativePointFieldPersistenceSource(canonicalV5).document;
  const first = serializeAboutNarrativePointFieldSource(migrated, {
    preflight: preflightAboutNarrativePointFieldRuntimePlans,
  });
  const second = serializeAboutNarrativePointFieldSource(JSON.parse(first), {
    preflight: preflightAboutNarrativePointFieldRuntimePlans,
  });
  assert.equal(second, first);
  assert.equal(JSON.parse(first).schemaVersion, 6);
  assert.equal('worlds' in JSON.parse(first).tracks, false);
  assert.throws(
    () => serializeAboutNarrativePointFieldSource(canonicalV5),
    /explicitly migrated schema v6/i,
  );
});

test('discipline formation position survives the v6 save and reload boundary', () => {
  const document = loadAboutNarrativePointFieldPersistenceSource(canonicalV5).document;
  const reveal = document.tracks.interactions.clips.find((clip) => (
    clip.type === 'discipline-reveal'
  ));
  reveal.parameters.formationColumn = 64;
  reveal.parameters.formationRow = 22;

  const serialized = serializeAboutNarrativePointFieldSource(document, {
    preflight: preflightAboutNarrativePointFieldRuntimePlans,
  });
  const reloaded = loadAboutNarrativePointFieldPersistenceSource(serialized, {
    preflight: preflightAboutNarrativePointFieldRuntimePlans,
  });
  const persistedReveal = reloaded.document.tracks.interactions.clips.find((clip) => (
    clip.id === reveal.id
  ));

  assert.equal(reloaded.valid, true);
  assert.equal(persistedReveal.parameters.formationColumn, 64);
  assert.equal(persistedReveal.parameters.formationRow, 22);
});

test('invalid, future, and failed-preflight point-field sources preserve exact recovery input', () => {
  const invalid = loadAboutNarrativePointFieldPersistenceSource('{“schemaVersion”:6');
  assert.equal(invalid.valid, false);
  assert.equal(invalid.original, '{“schemaVersion”:6');
  assert.equal(invalid.diagnostics[0].code, 'json-parse');

  const futureSource = '{\n  "schemaVersion": 7,\n  "futureSpacing": true\n}\n';
  const future = loadAboutNarrativePointFieldPersistenceSource(futureSource);
  assert.equal(future.status, 'future');
  assert.equal(future.readOnly, true);
  assert.equal(future.original, futureSource);

  const source = loadAboutNarrativePointFieldPersistenceSource(canonicalV5).document;
  const before = JSON.stringify(source);
  let preflightCandidate;
  const failed = loadAboutNarrativePointFieldPersistenceSource(source, {
    preflight(candidate) {
      preflightCandidate = candidate;
      candidate.tracks.pointField.keys[0].atWU = 99;
      return {
        valid: false,
        diagnostics: [{
          level: 'error',
          code: 'forced-v6-preflight',
          path: 'profiles.mobile',
          message: 'Forced v6 preflight failure.',
        }],
      };
    },
  });
  assert.equal(failed.valid, false);
  assert.equal(failed.diagnostics[0].code, 'forced-v6-preflight');
  assert.equal(JSON.stringify(source), before);
  assert.notEqual(preflightCandidate, source);
  assert.deepEqual(failed.original, source);

  const outOfBounds = clone(source);
  outOfBounds.tracks.interactions.clips[0].endWU = (
    outOfBounds.profiles.desktop.storyDurationWU + 1
  );
  const rejectedDuration = loadAboutNarrativePointFieldPersistenceSource(outOfBounds);
  assert.equal(rejectedDuration.valid, false);
  assert.ok(rejectedDuration.diagnostics.some((item) => (
    item.code === 'interaction-time'
  )));

  const invalidProfileTiming = clone(source);
  const clip = invalidProfileTiming.tracks.interactions.clips[0];
  invalidProfileTiming.profiles.mobile.overrides.interactions[clip.id] = {
    startWU: clip.activationWU + 0.25,
  };
  const rejectedProfile = loadAboutNarrativePointFieldPersistenceSource(invalidProfileTiming);
  assert.equal(rejectedProfile.valid, false);
  assert.ok(rejectedProfile.diagnostics.some((item) => (
    item.code === 'profile-interaction-time'
  )));

  const neverParticipating = clone(source);
  const isolated = neverParticipating.tracks.interactions.clips.find((item) => (
    item.id === 'interaction-emergent-ripple'
  ));
  isolated.startWU = 0.1;
  isolated.activationWU = 0.15;
  isolated.endWU = 0.2;
  const rejectedParticipation = loadAboutNarrativePointFieldPersistenceSource(
    neverParticipating,
  );
  assert.equal(rejectedParticipation.valid, false);
  assert.equal(rejectedParticipation.diagnostics.filter((item) => (
    item.code === 'profile-interaction-participation'
  )).length, 3);
});

test('v6 recovery and checkpoint envelopes normalize point-field and legacy World selections', () => {
  const migrated = loadAboutNarrativePointFieldPersistenceSource(canonicalV5).document;
  const recovery = migrateAboutNarrativePointFieldRecoveryEnvelope({
    envelopeVersion: 1,
    kind: 'recovery',
    baseSourceHash: 'base',
    timestamp: 123,
    selection: { type: 'point-field-key', id: 'key-world-grid-arrival' },
    document: migrated,
  });
  assert.equal(recovery.valid, true);
  assert.deepEqual(recovery.envelope.selection, {
    type: 'point-field-key',
    id: 'key-world-grid-arrival',
  });

  const checkpoint = migrateAboutNarrativePointFieldCheckpointEnvelope({
    id: 'checkpoint-legacy',
    name: 'Grid state',
    timestamp: 234,
    selection: { type: 'world', id: 'world-grid' },
    document: canonicalV5,
  });
  assert.equal(checkpoint.valid, true);
  assert.deepEqual(checkpoint.envelope.selection, {
    type: 'point-field-state',
    id: 'world-grid',
  });
  assert.equal(checkpoint.envelope.document.schemaVersion, 6);

  const legacyCheckpoint = migrateAboutNarrativePointFieldCheckpointEnvelope({
    id: 'checkpoint-section',
    name: 'Practice reveal',
    timestamp: 345,
    selection: { type: 'section', sectionId: 'practice-reveal' },
    document: canonicalV2,
  });
  assert.equal(legacyCheckpoint.valid, true);
  assert.deepEqual(legacyCheckpoint.envelope.selection, {
    type: 'point-field-state',
    id: 'world-background',
  });

  const malformedMembersEnvelope = {
    envelopeVersion: 1,
    kind: 'recovery',
    baseSourceHash: 'malformed-members',
    timestamp: 456,
    selection: {
      type: 'point-field-key',
      id: 'key-world-grid-arrival',
      members: { unexpected: true },
    },
    document: migrated,
  };
  const malformedMembers = migrateAboutNarrativePointFieldRecoveryEnvelope(
    malformedMembersEnvelope,
  );
  assert.equal(malformedMembers.valid, true);
  assert.deepEqual(malformedMembers.envelope.selection, {
    type: 'point-field-key',
    id: 'key-world-grid-arrival',
  });
  assert.deepEqual(malformedMembers.original, malformedMembersEnvelope);
  assert.deepEqual(malformedMembers.original.selection.members, { unexpected: true });

});

test('the explicit v6 server boundary migrates on read and atomically persists v6 on save', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'about-narrative-v6-persistence-'));
  const configPath = join(directory, 'contents-about-test.json');
  await writeFile(configPath, canonicalV5Source, 'utf8');
  try {
    const service = createAboutNarrativePersistenceService({ configPath, targetVersion: 6 });
    const loaded = await service.read();
    assert.equal(loaded.status, 'migrated');
    assert.equal(loaded.sourceVersion, 5);
    assert.equal(loaded.document.schemaVersion, 6);
    assert.equal(await readFile(configPath, 'utf8'), canonicalV5Source, 'read must not cut over disk');

    const changed = clone(loaded.document);
    changed.globals.readingWidthRem += 0.25;
    const saved = await service.save(changed, loaded.hash);
    assert.equal(saved.document.schemaVersion, 6);
    assert.equal(JSON.parse(await readFile(configPath, 'utf8')).schemaVersion, 6);
    assert.deepEqual(await readdir(directory), ['contents-about-test.json']);

    const restarted = createAboutNarrativePersistenceService({ configPath, targetVersion: 6 });
    const reloaded = await restarted.read();
    assert.equal(reloaded.status, 'current');
    assert.equal(reloaded.hash, saved.hash);
    assert.deepEqual(reloaded.document, saved.document);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test('the v6 server boundary rejects v5, invalid, future, and failed-preflight writes without disk changes', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'about-narrative-v6-rejection-'));
  const configPath = join(directory, 'contents-about-test.json');
  await writeFile(configPath, canonicalV5Source, 'utf8');
  try {
    const service = createAboutNarrativePersistenceService({ configPath, targetVersion: 6 });
    const loaded = await service.read();
    const initial = await readFile(configPath, 'utf8');
    await assert.rejects(service.save(canonicalV5, loaded.hash), (error) => (
      error.name === 'AboutNarrativeValidationError'
      && error.diagnostics.some((item) => item.code === 'schema-version-write')
    ));
    assert.equal(await readFile(configPath, 'utf8'), initial);

    const invalid = clone(loaded.document);
    invalid.tracks.pointField.keys[0].atWU = 1;
    await assert.rejects(service.save(invalid, loaded.hash), (error) => (
      error.name === 'AboutNarrativeValidationError'
      && error.diagnostics.some((item) => item.code === 'key-origin')
    ));
    assert.equal(await readFile(configPath, 'utf8'), initial);

    await assert.rejects(service.save({ schemaVersion: 7, future: true }, loaded.hash), /future/i);
    assert.equal(await readFile(configPath, 'utf8'), initial);

    const preflightFailure = createAboutNarrativePersistenceService({
      configPath,
      targetVersion: 6,
      preflight: () => ({
        valid: false,
        diagnostics: [{
          level: 'error',
          code: 'forced-v6-preflight',
          path: 'profiles.mobile',
          message: 'Forced v6 preflight failure.',
        }],
      }),
    });
    const locked = await preflightFailure.read();
    assert.equal(locked.readOnly, true);
    await assert.rejects(preflightFailure.save(loaded.document, locked.hash), (error) => (
      error.diagnostics.some((item) => item.code === 'forced-v6-preflight')
    ));
    assert.equal(await readFile(configPath, 'utf8'), initial);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
