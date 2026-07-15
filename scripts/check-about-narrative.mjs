import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';
import {
  compileAboutNarrativeDocument,
  sampleAboutNarrativeCue,
  sampleAboutNarrativePlan,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCompiler.js';
import { createAboutNarrativeEditorStore } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeEditorStore.js';
import {
  migrateAboutNarrativeDocument,
  normalizeAboutNarrativeDocument,
  serializeAboutNarrativeDocument,
  validateAboutNarrativeDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeSchema.js';
import {
  createAboutNarrativeSeeds,
  generateAboutNarrativeShape,
  validateAboutNarrativeShapeOutput,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointShapes.js';

const configPath = resolve('react-app/app/public/config/contents-about.json');
const canonical = normalizeAboutNarrativeDocument(JSON.parse(await readFile(configPath, 'utf8')));

test('canonical About document validates and serializes deterministically', () => {
  assert.deepEqual(validateAboutNarrativeDocument(canonical).filter((item) => item.level === 'error'), []);
  assert.equal(serializeAboutNarrativeDocument(JSON.parse(serializeAboutNarrativeDocument(canonical))), serializeAboutNarrativeDocument(canonical));
});

test('future schema versions stay read-only', () => {
  const future = structuredClone(canonical);
  future.schemaVersion = canonical.schemaVersion + 1;
  assert.equal(migrateAboutNarrativeDocument(future).readOnly, true);
});

test('compiler derives a single ordered WU sequence', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  assert.equal(plan.valid, true);
  plan.sections.forEach((section, index) => {
    if (index === 0) assert.equal(section.startWU, 0);
    else assert.equal(section.startWU, plan.sections[index - 1].endWU);
    assert.ok(section.travelWU > 0);
  });
  assert.equal(plan.totalExtentWU, canonical.sections.reduce((sum, section) => sum + section.extentWU, 0));
});

test('canonical document follows the approved V7 storyboard allocation', () => {
  assert.deepEqual(
    canonical.sections.map((section) => section.id),
    ['promise', 'complexity', 'background', 'practice-reveal', 'disciplines', 'bringing-life', 'role', 'epilogue'],
  );
  assert.deepEqual(
    canonical.sections.map((section) => section.world.mode === 'set' ? section.world.shapeId : 'continue'),
    ['cluster-v1', 'calm-field-v1', 'continue', 'discipline-grid-v1', 'continue', 'living-field-v1', 'continue', 'bust-v1'],
  );
  assert.equal(canonical.sections[0].text.cues[0].text, 'I help shape complex ideas into emotionally compelling experiences.');
  assert.equal(canonical.sections[2].text.blocks[0].text, 'Perhaps that is why I have always been drawn to the space between aesthetics and technology.');
  assert.equal(canonical.sections[4].text.blocks[1].items.length, 6);
  assert.equal(canonical.sections[6].text.blocks.length, 1);
  assert.equal(canonical.sections[7].text.cues[0].text, 'If you are building something new, let’s talk.');
  assert.equal(canonical.sections[7].text.profile, undefined);
  assert.equal(canonical.sections[7].text.prompt, undefined);
});

test('every Section has protected camera boundary keyframes', () => {
  canonical.sections.forEach((section) => {
    assert.ok(section.camera.keys.length >= 2, `${section.id} should have at least two camera keys`);
    assert.equal(section.camera.keys[0].at, 0);
    assert.equal(section.camera.keys.at(-1).at, 1);
  });
});

test('protected base camera advances at constant cadence', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const first = sampleAboutNarrativePlan(plan, 2.1);
  const second = sampleAboutNarrativePlan(plan, 2.6);
  assert.ok(Math.abs((first.camera.position[2] - second.camera.position[2]) - 0.5) < 1e-9);
  assert.equal(first.camera.cadence, canonical.globals.camera.cadence);
});

test('World transitions can continue through inherited Sections', () => {
  const extended = structuredClone(canonical);
  extended.sections[1].world.transitionIn.start = 1.4;
  extended.sections[1].world.transitionIn.end = 2.2;
  const plan = compileAboutNarrativeDocument(extended);
  assert.equal(plan.valid, true);
  const origin = plan.sections[1];
  const halfwayWU = origin.startWU + (1.8 * origin.travelWU);
  const sample = sampleAboutNarrativePlan(plan, halfwayWU);
  assert.equal(sample.section.id, extended.sections[2].id);
  assert.ok(Math.abs(sample.world.transitionProgress - 0.5) < 1e-9);
  assert.equal(sample.world.from.shapeId, extended.sections[0].world.shapeId);
  assert.equal(sample.world.to.shapeId, extended.sections[1].world.shapeId);
});

test('World transition cuts remove interpolation without removing the World', () => {
  const cut = structuredClone(canonical);
  cut.sections[1].world.transitionIn.type = 'cut';
  cut.sections[1].world.transitionIn.start = 0;
  cut.sections[1].world.transitionIn.end = 0;
  const plan = compileAboutNarrativeDocument(cut);
  assert.equal(plan.valid, true);
  const sample = sampleAboutNarrativePlan(plan, plan.sections[1].startWU);
  assert.equal(sample.world.transitionProgress, 1);
  assert.equal(sample.world.to.shapeId, cut.sections[1].world.shapeId);
});

test('reduced-motion camera stays settled within a Section', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const first = sampleAboutNarrativePlan(plan, 2.1, { reducedMotion: true });
  const second = sampleAboutNarrativePlan(plan, 2.6, { reducedMotion: true });
  assert.deepEqual(first.camera.position, second.camera.position);
  assert.equal(first.camera.roll, 0);
});

test('opening Cue is readable at the initial frame', () => {
  const cue = canonical.sections[0].text.cues[0];
  const sample = sampleAboutNarrativeCue(cue, 0, canonical.globals.textMotion, false);
  assert.equal(sample.opacity, 1);
  assert.equal(sample.blur, 0);
});

test('procedural Shape density preserves the fixed point pool', async () => {
  const pointCount = 500;
  const seeds = createAboutNarrativeSeeds(pointCount, 42);
  const sparse = await generateAboutNarrativeShape({
    shapeId: 'cluster-v1',
    pointCount,
    seeds,
    quality: 'mobile',
    parameters: { radius: 2.7, density: 0.25 },
  });
  validateAboutNarrativeShapeOutput(sparse, pointCount);
  assert.equal(sparse.positions.length, pointCount * 3);
  assert.equal(sparse.presence.length, pointCount);
  assert.ok(sparse.presence.reduce((sum, value) => sum + value, 0) < pointCount);
});

test('editor commands are atomic and undoable', () => {
  const store = createAboutNarrativeEditorStore(canonical);
  const previous = store.getSnapshot().document.sections[0].label;
  store.commit('Rename Section', (draft) => { draft.sections[0].label = 'Temporary'; });
  assert.equal(store.getSnapshot().document.sections[0].label, 'Temporary');
  store.undo();
  assert.equal(store.getSnapshot().document.sections[0].label, previous);
  store.redo();
  assert.equal(store.getSnapshot().document.sections[0].label, 'Temporary');
});
