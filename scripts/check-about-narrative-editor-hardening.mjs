import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { resolveAboutNarrativeCapabilities } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCapabilities.js';
import {
  compileAboutNarrativeDocument,
  sampleAboutNarrativePlan,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCompiler.js';
import { createAboutNarrativeEditorStore } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeEditorStore.js';
import { createAboutNarrativePersistenceService } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePersistenceServer.js';
import {
  classifyAboutNarrativeRecoveryDraft,
  compareAboutNarrativeDocuments,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeEditorHardening.js';
import { resolveAboutNarrativePairStatus } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePairStatus.js';
import {
  cloneAboutNarrativeDocument,
  migrateAboutNarrativeDocument,
  serializeAboutNarrativeDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeSchema.js';

const repoConfigPath = new URL('../react-app/app/public/config/contents-about.json', import.meta.url);
const canonical = JSON.parse(await readFile(repoConfigPath, 'utf8'));

test('schema v1 migrates sequentially without reinterpreting legacy hold playback', () => {
  const legacy = cloneAboutNarrativeDocument(canonical);
  legacy.schemaVersion = 1;
  const world = legacy.sections.find((section, index) => index > 0 && section.world.mode === 'set').world;
  world.transitionIn.type = 'hold';
  world.transitionIn.easing = 'linear';
  const migrated = migrateAboutNarrativeDocument(legacy);
  assert.equal(migrated.document.schemaVersion, 2);
  assert.deepEqual(migrated.migrations, ['1->2']);
  assert.equal(migrated.document.sections.find((section, index) => index > 0 && section.world.mode === 'set').world.transitionIn.type, 'morph');
  assert.equal(legacy.sections.find((section, index) => index > 0 && section.world.mode === 'set').world.transitionIn.type, 'hold');
});

test('raw explicit invalid registry IDs fail before normalization and retain the original', () => {
  const invalid = cloneAboutNarrativeDocument(canonical);
  invalid.sections.find((section) => section.world.mode === 'set').world.transitionIn.correspondence = 'invented-strategy';
  assert.throws(() => migrateAboutNarrativeDocument(invalid), (error) => {
    assert.equal(error.name, 'AboutNarrativeValidationError');
    assert.equal(error.original.sections[0].world.transitionIn.correspondence, 'invented-strategy');
    return true;
  });
});

test('future documents remain untouched and read-only', () => {
  const future = { schemaVersion: 99, customFutureField: { retained: true } };
  const loaded = migrateAboutNarrativeDocument(future);
  assert.equal(loaded.readOnly, true);
  assert.deepEqual(loaded.original, future);
  assert.deepEqual(loaded.document, future);
});

test('one capability resolver supports point morphs and rejects current crossfades', () => {
  const common = {
    sourceAdapterId: 'point-field-v1',
    targetAdapterId: 'point-field-v1',
    sourceShapeId: 'cluster-v1',
    targetShapeId: 'calm-field-v1',
    correspondenceId: 'spatial-nearest-v1',
    rendererProfile: { maximumConcurrentGroups: 1, maximumDrawCalls: 1, pointPoolContract: 'fixed-point-pool-v1' },
  };
  assert.equal(resolveAboutNarrativeCapabilities({ ...common, transitionType: 'morph' }).supported, true);
  const crossfade = resolveAboutNarrativeCapabilities({ ...common, transitionType: 'crossfade' });
  assert.equal(crossfade.supported, false);
  assert(crossfade.reasons.some((reason) => reason.code === 'crossfade-unsupported'));
  assert(crossfade.alternatives.includes('morph'));
});

test('cut and hold sample deterministic authored boundaries in both directions', () => {
  const document = cloneAboutNarrativeDocument(canonical);
  const sectionIndex = document.sections.findIndex((section, index) => index > 0 && section.world.mode === 'set');
  const transition = document.sections[sectionIndex].world.transitionIn;
  transition.start = 0.2;
  transition.end = 0.6;
  transition.type = 'hold';
  const holdPlan = compileAboutNarrativeDocument(document);
  assert.equal(holdPlan.valid, true);
  const compiled = holdPlan.sections[sectionIndex];
  const startWU = compiled.startWU + (0.2 * compiled.travelWU);
  const endWU = compiled.startWU + (0.6 * compiled.travelWU);
  assert.equal(sampleAboutNarrativePlan(holdPlan, startWU + 0.001).world.transitionProgress, 0);
  assert.equal(sampleAboutNarrativePlan(holdPlan, endWU).world.transitionProgress, 1);
  assert.equal(sampleAboutNarrativePlan(holdPlan, startWU - 0.001).world.transitionProgress, 0);
  transition.type = 'cut';
  const cutPlan = compileAboutNarrativeDocument(document);
  assert.equal(sampleAboutNarrativePlan(cutPlan, startWU - 0.001).world.transitionProgress, 0);
  assert.equal(sampleAboutNarrativePlan(cutPlan, startWU).world.transitionProgress, 1);
});

test('save reconciliation preserves commands made after submission', () => {
  const store = createAboutNarrativeEditorStore(canonical, { baselineHash: 'base' });
  const submission = store.createSaveSubmission();
  store.commit('Newer edit', (draft) => { draft.globals.readingWidthRem += 1; });
  const result = store.markSaved(submission.document, 'persisted', submission.revision);
  assert.equal(result.newerEditsExist, true);
  assert.equal(result.clean, false);
  assert.equal(store.getSnapshot().dirty, true);
  assert.equal(store.getSnapshot().baselineHash, 'persisted');
  assert.equal(store.getSnapshot().saveState.status, 'draft');
});

test('recovery classification distinguishes current, stale, expired, invalid, future, and unreadable', () => {
  const now = 10_000_000;
  const envelope = { schemaVersion: 2, baseSourceHash: 'base', timestamp: now, document: canonical };
  assert.equal(classifyAboutNarrativeRecoveryDraft(envelope, { baselineHash: 'base', now }).status, 'current');
  assert.equal(classifyAboutNarrativeRecoveryDraft(envelope, { baselineHash: 'remote', now }).status, 'stale');
  assert.equal(classifyAboutNarrativeRecoveryDraft(envelope, { now: now + 1000, maximumAgeMs: 10 }).status, 'expired');
  assert.equal(classifyAboutNarrativeRecoveryDraft({ ...envelope, document: { ...canonical, sections: [] } }, { now }).status, 'invalid');
  assert.equal(classifyAboutNarrativeRecoveryDraft({ ...envelope, schemaVersion: 99 }, { now }).status, 'future');
  assert.equal(classifyAboutNarrativeRecoveryDraft('{broken', { now }).status, 'unreadable');
});

test('conflict comparison reports stable-ID local and remote fields without merging', () => {
  const local = cloneAboutNarrativeDocument(canonical);
  const remote = cloneAboutNarrativeDocument(canonical);
  local.sections[0].label = 'Local label';
  remote.sections[1].world.shapeParameters.width += 1;
  const comparison = compareAboutNarrativeDocuments({ baseline: canonical, local, remote });
  assert(comparison.localChanges.some((path) => path.includes('[id=promise].label')));
  assert(comparison.remoteChanges.some((path) => path.includes('[id=complexity].world.shapeParameters.width')));
  assert.equal(local.sections[1].world.shapeParameters.width, canonical.sections[1].world.shapeParameters.width);
});

test('pair status requires the exact pair ID and input fingerprint', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const descriptor = plan.worldPreparationDescriptor.pairs[1];
  const stale = resolveAboutNarrativePairStatus({
    plan,
    sectionId: descriptor.toWorldId,
    diagnostics: { pairs: [{ pairId: descriptor.id, inputFingerprint: 'stale', state: 'ready' }] },
  });
  assert.equal(stale.state, 'idle');
  const exact = resolveAboutNarrativePairStatus({
    plan,
    sectionId: descriptor.toWorldId,
    diagnostics: { pairs: [{ pairId: descriptor.id, inputFingerprint: descriptor.inputFingerprint, state: 'ready', source: 'cache' }] },
  });
  assert.equal(exact.state, 'ready');
  assert.equal(exact.exact, true);
  assert.match(exact.message, /cache/i);
});

test('development persistence writes only the injected temp path and returns exact canonical bytes', async () => {
  const canonicalBefore = await readFile(repoConfigPath, 'utf8');
  const directory = await mkdtemp(join(tmpdir(), 'about-narrative-persistence-'));
  const configPath = join(directory, 'contents-about-test.json');
  await writeFile(configPath, serializeAboutNarrativeDocument(canonical), 'utf8');
  const persistence = createAboutNarrativePersistenceService({ configPath });
  try {
    await persistence.cleanup();
    const current = await persistence.read();
    const changed = cloneAboutNarrativeDocument(current.document);
    changed.globals.readingWidthRem += 1;
    const saved = await persistence.save(changed, current.hash);
    assert.deepEqual(JSON.parse(await readFile(configPath, 'utf8')), saved.document);
    await assert.rejects(persistence.save(changed, current.hash), (error) => error.statusCode === 409);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
  assert.equal(await readFile(repoConfigPath, 'utf8'), canonicalBefore);
});
