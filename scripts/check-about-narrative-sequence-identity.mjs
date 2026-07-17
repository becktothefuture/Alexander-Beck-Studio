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
import {
  findAboutNarrativeWorldById,
  getAboutNarrativeWorldId,
  getAboutNarrativeWorldPairId,
  resolveAboutNarrativeWorldAnchorRailZ,
  resolveAboutNarrativeWorldAnchorWU,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeWorldIdentity.js';

const configPath = resolve('scripts/fixtures/about-narrative/contents-about-v2.json');
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

test('World identity prefers stable ids and contains the legacy fallback at one boundary', () => {
  const stable = { id: 'world-stable', worldId: 'world-runtime', sectionId: 'legacy-section' };
  const runtime = { worldId: 'world-runtime', sectionId: 'legacy-section' };
  const legacy = { sectionId: 'legacy-section' };
  assert.equal(getAboutNarrativeWorldId(stable), 'world-stable');
  assert.equal(getAboutNarrativeWorldId(runtime), 'world-runtime');
  assert.equal(getAboutNarrativeWorldId(legacy), 'legacy-section');
  assert.equal(findAboutNarrativeWorldById([legacy, stable], 'world-stable'), stable);
  assert.equal(findAboutNarrativeWorldById([legacy], 'missing'), null);
  assert.equal(getAboutNarrativeWorldPairId(legacy, stable), 'legacy-section->world-stable');
  assert.throws(() => getAboutNarrativeWorldPairId({}, stable), /stable World id/);
  assert.equal(resolveAboutNarrativeWorldAnchorWU({ anchorWU: 4, startWU: 8 }), 4);
  assert.equal(resolveAboutNarrativeWorldAnchorWU({ startWU: 8 }), 8);
  assert.equal(resolveAboutNarrativeWorldAnchorRailZ(
    { anchorRailZ: -20, anchorWU: 4 },
    { camera: { startZ: 8, cadence: 1 } },
  ), -20);
  assert.equal(resolveAboutNarrativeWorldAnchorRailZ(
    { anchorWU: 4 },
    { worldRail: { originZ: 10, unitsPerWU: 2 }, camera: { startZ: 8, cadence: 1 } },
  ), 2);
  assert.equal(resolveAboutNarrativeWorldAnchorRailZ(
    { startWU: 4 },
    { camera: { startZ: 8, cadence: 1 } },
  ), 4);
  assert.throws(() => resolveAboutNarrativeWorldAnchorRailZ({}, {}), /finite World rail/);
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
      `${worlds[Math.max(0, index - 1)].id}->${world.id}`
    )),
  );
  assert.deepEqual(
    first.worldPreparationDescriptor.worlds.map((world) => world.id),
    first.worldSequence.map((world) => world.sectionId),
  );
  assert.equal(first.worldPreparationDescriptor.worlds.some((world) => 'sectionId' in world), false);
  assert.equal(new Set(first.worldPreparationDescriptor.pairs.map((pair) => pair.inputFingerprint)).size, first.worldSequence.length);
});

test('layout profiles select explicit point-resource descriptors', () => {
  const desktop = compileAboutNarrativeDocument(canonical, { profile: 'desktop' });
  const tablet = compileAboutNarrativeDocument(canonical, { profile: 'tablet' });
  const mobile = compileAboutNarrativeDocument(canonical, { profile: 'mobile' });

  assert.equal(desktop.worldPreparationDescriptor.profile, 'desktop');
  assert.equal(desktop.worldPreparationDescriptor.quality, 'desktop');
  assert.equal(desktop.worldPreparationDescriptor.pointCount, 12000);
  assert.equal(tablet.worldPreparationDescriptor.profile, 'mobile');
  assert.equal(tablet.worldPreparationDescriptor.quality, 'mobile');
  assert.equal(tablet.worldPreparationDescriptor.pointCount, 5000);
  assert.equal(mobile.worldPreparationDescriptor.profile, 'mobile');
  assert.equal(mobile.worldPreparationDescriptor.quality, 'mobile');
  assert.equal(mobile.worldPreparationDescriptor.pointCount, 5000);
  assert.throws(() => createAboutNarrativeWorldPreparationDescriptor({
    worldSequence: desktop.worldSequence,
    globals: canonical.globals,
    profile: 'reduced-motion',
  }), /layout profile must be one of/u);
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

  const cameraKeyEdit = structuredClone(canonical);
  cameraKeyEdit.sections[0].camera.keys[0].offset[0] += 4;
  cameraKeyEdit.sections[0].camera.keys[0].fov += 3;
  cameraKeyEdit.sections[0].camera.keys[0].roll += 0.2;
  assert.equal(compileAboutNarrativeDocument(cameraKeyEdit).worldSequenceKey, baseline.worldSequenceKey);

  const cameraFovEdit = structuredClone(canonical);
  cameraFovEdit.globals.camera.fov += 4;
  assert.equal(compileAboutNarrativeDocument(cameraFovEdit).worldSequenceKey, baseline.worldSequenceKey);

  const interactionEdit = structuredClone(canonical);
  const interactionSection = interactionEdit.sections.find((section) => section.interaction?.type !== 'none');
  interactionSection.interaction.activationStart += 0.03;
  assert.equal(compileAboutNarrativeDocument(interactionEdit).worldSequenceKey, baseline.worldSequenceKey);

  const transitionTimingEdit = structuredClone(canonical);
  const transitionSection = transitionTimingEdit.sections.find((section) => (
    section.world.mode === 'set' && section.world.transitionIn.type !== 'cut'
  ));
  transitionSection.world.transitionIn.start += 0.01;
  transitionSection.world.transitionIn.end += 0.01;
  assert.equal(compileAboutNarrativeDocument(transitionTimingEdit).worldSequenceKey, baseline.worldSequenceKey);

  const mobile = compileAboutNarrativeDocument(canonical, { profile: 'mobile' });
  assert.notEqual(mobile.worldSequenceKey, baseline.worldSequenceKey);
  assert.equal(mobile.worldPreparationDescriptor.pointCount, 5000);
});

test('stable World and anchor inputs supersede legacy Section metadata', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const stableWorlds = plan.worldSequence.map((world) => ({
    ...world,
    id: `world-${world.sectionId}`,
    anchorWU: world.startWU,
  }));
  const baseline = createAboutNarrativeWorldPreparationDescriptor({
    worldSequence: stableWorlds,
    globals: canonical.globals,
  });

  const legacyMetadataEdit = stableWorlds.map((world, index) => ({
    ...world,
    sectionId: `legacy-${index}`,
    sectionIndex: index + 100,
    travelWU: world.travelWU + 50,
  }));
  const metadataDescriptor = createAboutNarrativeWorldPreparationDescriptor({
    worldSequence: legacyMetadataEdit,
    globals: canonical.globals,
  });
  assert.equal(metadataDescriptor.worldSequenceKey, baseline.worldSequenceKey);

  const anchorEdit = stableWorlds.map((world, index) => (
    index === 1 ? { ...world, anchorWU: world.anchorWU + 0.1 } : world
  ));
  assert.notEqual(createAboutNarrativeWorldPreparationDescriptor({
    worldSequence: anchorEdit,
    globals: canonical.globals,
  }).worldSequenceKey, baseline.worldSequenceKey);

  const resolvedAnchorEdit = stableWorlds.map((world, index) => (
    index === 1 ? { ...world, anchorRailZ: 123.45 } : world
  ));
  assert.notEqual(createAboutNarrativeWorldPreparationDescriptor({
    worldSequence: resolvedAnchorEdit,
    globals: canonical.globals,
  }).worldSequenceKey, baseline.worldSequenceKey);

  const renamedWorld = stableWorlds.map((world, index) => (
    index === 1 ? { ...world, id: `${world.id}-renamed` } : world
  ));
  assert.notEqual(createAboutNarrativeWorldPreparationDescriptor({
    worldSequence: renamedWorld,
    globals: canonical.globals,
  }).worldSequenceKey, baseline.worldSequenceKey);

  const duplicateIds = stableWorlds.map((world, index) => (
    index === 1 ? { ...world, id: stableWorlds[0].id } : world
  ));
  assert.throws(
    () => createAboutNarrativeWorldPreparationDescriptor({
      worldSequence: duplicateIds,
      globals: canonical.globals,
    }),
    /unique stable World ids/,
  );
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

test('PointWorld contains legacy identity and placement fallbacks behind the shared World boundary', async () => {
  const source = await readFile(
    resolve('react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx'),
    'utf8',
  );
  assert.doesNotMatch(source, /\.sectionId\b/);
  assert.match(source, /requireAboutNarrativeWorldId\(world, 'Worker World'\)/);
  assert.match(source, /findAboutNarrativeWorldById\(sequence, targetWorldId\)/);
  assert.match(source, /resolveAboutNarrativeWorldAnchorRailZ\(world, globals\)/);
});
