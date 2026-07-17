import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import {
  compileAboutNarrativeDocument,
  getAboutNarrativePreparationRequest,
  sampleAboutNarrativePlan,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCompiler.js';
import {
  createAboutNarrativeWorldPreparationDescriptor,
  serializeAboutNarrativeSequenceIdentity,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeSequenceIdentity.js';

const configPath = resolve('react-app/app/public/config/contents-about.json');
const canonical = JSON.parse(await readFile(configPath, 'utf8'));

test('canonical identity is independent of object key insertion order', () => {
  const first = serializeAboutNarrativeSequenceIdentity({
    z: [{ beta: 2, alpha: 1 }],
    a: true,
  });
  const second = serializeAboutNarrativeSequenceIdentity({
    a: true,
    z: [{ alpha: 1, beta: 2 }],
  });
  assert.equal(first, second);
  assert.throws(() => serializeAboutNarrativeSequenceIdentity(Number.NaN), /finite numbers/);
});

test('sub-pixel layout hydration noise does not restart preparation identity', () => {
  const baseline = compileAboutNarrativeDocument(canonical, {
    measurements: {
      complexity: { topWU: 1.6999931917, extentWU: 2.95 },
    },
  });
  const hydrated = compileAboutNarrativeDocument(canonical, {
    measurements: {
      complexity: { topWU: 1.6999965996, extentWU: 2.95 },
    },
  });
  const meaningful = compileAboutNarrativeDocument(canonical, {
    measurements: {
      complexity: { topWU: 1.702, extentWU: 2.95 },
    },
  });

  assert.equal(hydrated.worldSequenceKey, baseline.worldSequenceKey);
  assert.notEqual(meaningful.worldSequenceKey, baseline.worldSequenceKey);
});

test('cumulative end-of-story hydration jitter stays inside one preparation key', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const createSequence = (epilogueStartWU) => plan.worldSequence.map((world) => ({
    ...world,
    startWU: world.sectionId === 'epilogue' ? epilogueStartWU : world.startWU,
  }));
  const beforeBoundary = createAboutNarrativeWorldPreparationDescriptor({
    worldSequence: createSequence(16.99994),
    globals: canonical.globals,
  });
  const afterBoundary = createAboutNarrativeWorldPreparationDescriptor({
    worldSequence: createSequence(17.00001),
    globals: canonical.globals,
  });

  assert.equal(beforeBoundary.worldSequenceKey, afterBoundary.worldSequenceKey);
});

test('compiler creates one deterministic immutable preparation descriptor', () => {
  const first = compileAboutNarrativeDocument(canonical, { profile: 'desktop' });
  const second = compileAboutNarrativeDocument(structuredClone(canonical), { profile: 'desktop' });
  assert.equal(first.valid, true);
  assert.equal(first.worldSequenceKey, second.worldSequenceKey);
  assert.deepEqual(first.worldPreparationDescriptor, second.worldPreparationDescriptor);
  assert.equal(Object.isFrozen(first.worldPreparationDescriptor), true);
  assert.equal(Object.isFrozen(first.worldPreparationDescriptor.worlds), true);
  assert.equal(Object.isFrozen(first.worldPreparationDescriptor.worlds[0].shapeParameters), true);
  assert.equal(Object.isFrozen(first.worldPreparationDescriptor.pairs), true);
  assert.equal(first.worldPreparationDescriptor.pointCount, 12000);
  assert.equal(first.worldPreparationDescriptor.worlds.length, first.worldSequence.length);
  assert.equal(first.worldPreparationDescriptor.pairs.length, first.worldSequence.length);
  assert.equal(first.worldPreparationDescriptor.pairs[0].requestedStrategy, 'index-v1');
  assert.deepEqual(
    first.worldPreparationDescriptor.pairs.map((pair) => pair.id),
    first.worldPreparationDescriptor.worlds.map((world, index, worlds) => (
      `${worlds[Math.max(0, index - 1)].sectionId}->${world.sectionId}`
    )),
  );
  assert.equal(new Set(first.worldPreparationDescriptor.pairs.map((pair) => pair.inputFingerprint)).size, first.worldSequence.length);
});

test('preparation identity changes only when preparation inputs change', () => {
  const baseline = compileAboutNarrativeDocument(canonical, { profile: 'desktop' });
  const shapeEdit = structuredClone(canonical);
  const shapeSection = shapeEdit.sections.find((section) => section.world.mode === 'set');
  shapeSection.world.shapeParameters.radius += 0.05;
  assert.notEqual(compileAboutNarrativeDocument(shapeEdit).worldSequenceKey, baseline.worldSequenceKey);

  const transformEdit = structuredClone(canonical);
  transformEdit.sections.find((section) => section.world.mode === 'set').world.transform.position[0] += 0.1;
  assert.notEqual(compileAboutNarrativeDocument(transformEdit).worldSequenceKey, baseline.worldSequenceKey);

  const extentEdit = structuredClone(canonical);
  extentEdit.sections[0].extentWU += 0.1;
  assert.notEqual(compileAboutNarrativeDocument(extentEdit).worldSequenceKey, baseline.worldSequenceKey);

  const copyEdit = structuredClone(canonical);
  copyEdit.sections[0].text.cues[0].text += ' Copy-only change.';
  assert.equal(compileAboutNarrativeDocument(copyEdit).worldSequenceKey, baseline.worldSequenceKey);

  const mobile = compileAboutNarrativeDocument(canonical, { profile: 'mobile' });
  assert.notEqual(mobile.worldSequenceKey, baseline.worldSequenceKey);
  assert.equal(mobile.worldPreparationDescriptor.pointCount, 5000);
});

test('sampling reuses compiled sequence identity and descriptor references without rebuilding', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const descriptor = plan.worldPreparationDescriptor;
  const sequenceKey = plan.worldSequenceKey;
  for (let index = 0; index < 1000; index += 1) {
    const frame = sampleAboutNarrativePlan(plan, (index / 999) * plan.maxStoryWU);
    assert.equal(frame.world.sequenceKey, sequenceKey);
    assert.equal(frame.world.preparationDescriptor, descriptor);
  }
  const source = sampleAboutNarrativePlan.toString();
  assert.doesNotMatch(source, /JSON\.stringify|serializeAboutNarrativeSequenceIdentity|createAboutNarrativeWorldPreparationDescriptor/);
});

test('preparation requests select the sampled target and retain compiled references', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  plan.sections.forEach((section) => {
    const request = getAboutNarrativePreparationRequest(plan, section.startWU + 0.001);
    assert.equal(request.sequenceKey, plan.worldSequenceKey);
    assert.equal(request.descriptor, plan.worldPreparationDescriptor);
    assert.equal(request.targetWorldId, section.worldState.activeWorld.sectionId);
  });
  assert.equal(getAboutNarrativePreparationRequest({ valid: false, sections: [] }, 0), null);
});

test('timeline never initiates preparation from its renderFrame callback', async () => {
  const source = await readFile(
    resolve('react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js'),
    'utf8',
  );
  const renderFrame = source.slice(
    source.indexOf('const renderFrame ='),
    source.indexOf('const rebuildLenis ='),
  );
  assert.doesNotMatch(renderFrame, /preparePlan|handoffPreparation|schedulePreparationHandoff|\bmeasure\(/);
  assert.match(source, /runtime\.preparePlan\(request\)/);
  assert.match(source, /scroll.*handleScrollPreparation/);
  assert.match(source, /visibilitychange/);
});
