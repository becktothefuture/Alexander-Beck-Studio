import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';
import {
  compileAboutNarrativeDocument,
  getAboutNarrativeCueMovement,
  getAboutNarrativeCueMotionInterval,
  sampleAboutNarrativeCue,
  sampleAboutNarrativePlan,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCompiler.js';
import { createAboutNarrativeEditorStore } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeEditorStore.js';
import {
  getAboutNarrativeCameraKeyTimingBounds,
  moveAboutNarrativeCueTiming,
  resolveAboutNarrativeCameraKeyDrop,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTimeline.js';
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

test('canonical document preserves the approved eight-part storyboard allocation', () => {
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

test('spatial copy is authored as single-sentence beats', () => {
  canonical.sections.forEach((section) => {
    (section.text.cues || []).forEach((cue) => {
      const sentenceBreaks = cue.text.match(/[.!?][…”’"')\]]*\s+(?=[\p{L}\p{N}])/gu) || [];
      assert.equal(sentenceBreaks.length, 0, `${cue.id} should contain no more than one sentence`);
    });
  });
});

test('every Section has protected camera boundary keyframes', () => {
  canonical.sections.forEach((section) => {
    assert.ok(section.camera.keys.length >= 2, `${section.id} should have at least two camera keys`);
    assert.equal(section.camera.keys[0].at, 0);
    assert.equal(section.camera.keys.at(-1).at, 1);
  });
});

test('camera timing keeps boundary keys fixed and interior keys ordered', () => {
  const keys = canonical.sections.find((section) => section.camera.keys.length > 2).camera.keys;
  assert.equal(getAboutNarrativeCameraKeyTimingBounds(keys, 0).locked, true);
  assert.equal(getAboutNarrativeCameraKeyTimingBounds(keys, keys.length - 1).locked, true);
  const interior = getAboutNarrativeCameraKeyTimingBounds(keys, 1);
  assert.equal(interior.locked, false);
  assert.ok(interior.min > keys[0].at);
  assert.ok(interior.max < keys[2].at);
});

test('camera key drops use global story position and change owning Section safely', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const destinationIndex = 4;
  const destination = plan.sections[destinationIndex];
  const drop = resolveAboutNarrativeCameraKeyDrop({
    document: canonical,
    plan,
    sourceSectionIndex: 3,
    sourceKeyIndex: 1,
    storyWU: destination.startWU + (destination.travelWU * 0.42),
  });
  assert.equal(drop.valid, true);
  assert.equal(drop.sectionId, canonical.sections[destinationIndex].id);
  assert.equal(drop.at, 0.42);
  assert.equal(drop.keyIndex, 1);

  const nearStart = resolveAboutNarrativeCameraKeyDrop({
    document: canonical,
    plan,
    sourceSectionIndex: 3,
    sourceKeyIndex: 1,
    storyWU: destination.startWU,
  });
  assert.equal(nearStart.valid, true);
  assert.equal(nearStart.at, 0.005);
});

test('one text timing marker moves the complete Cue envelope', () => {
  const cue = canonical.sections[1].text.cues[1];
  const moved = moveAboutNarrativeCueTiming(cue, 0.5);
  assert.equal(moved.hold, 0.5);
  assert.ok(Math.abs((moved.hold - moved.enter) - (cue.hold - cue.enter)) < 1e-9);
  assert.ok(Math.abs((moved.exit - moved.hold) - (cue.exit - cue.hold)) < 1e-9);
});

test('protected base camera advances at constant cadence', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const first = sampleAboutNarrativePlan(plan, 2.1);
  const second = sampleAboutNarrativePlan(plan, 2.6);
  assert.ok(Math.abs((first.camera.position[2] - second.camera.position[2]) - 0.5) < 1e-9);
  assert.equal(first.camera.cadence, canonical.globals.camera.cadence);
});

test('compiled camera inherits mismatched boundary poses without a jump', () => {
  const mismatched = structuredClone(canonical);
  mismatched.sections[0].camera.keys.at(-1).offset[1] = 1.8;
  mismatched.sections[1].camera.keys[0].offset[1] = -2.4;
  const plan = compileAboutNarrativeDocument(mismatched);
  const boundary = plan.sections[1].startWU;
  const before = sampleAboutNarrativePlan(plan, boundary - 0.0001);
  const at = sampleAboutNarrativePlan(plan, boundary);
  const after = sampleAboutNarrativePlan(plan, boundary + 0.0001);
  assert.ok(plan.diagnostics.some((item) => item.code === 'camera-position-gap'));
  assert.equal(plan.sections[1].camera.keys[0].offset[1], 1.8);
  assert.ok(Math.abs(before.camera.position[1] - at.camera.position[1]) < 0.001);
  assert.ok(Math.abs(after.camera.position[1] - at.camera.position[1]) < 0.001);
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

test('authored title movement resolves to vertical or spatial', () => {
  const allCues = canonical.sections.flatMap((section) => section.text.cues || []);
  assert.ok(allCues.every((cue) => ['spatial', 'vertical'].includes(getAboutNarrativeCueMovement(cue))));
  assert.equal(getAboutNarrativeCueMovement(canonical.sections[0].text.cues[0]), 'vertical');
  assert.equal(getAboutNarrativeCueMovement(canonical.sections[1].text.cues[0]), 'vertical');
  assert.ok(canonical.sections[1].text.cues.slice(1).every((cue) => getAboutNarrativeCueMovement(cue) === 'spatial'));
});

test('spatial Cues move continuously through their focus point', () => {
  const cue = canonical.sections[1].text.cues[1];
  const motion = canonical.globals.textMotion;
  const before = sampleAboutNarrativeCue(cue, cue.hold - 0.01, motion, false);
  const focus = sampleAboutNarrativeCue(cue, cue.hold, motion, false);
  const after = sampleAboutNarrativeCue(cue, cue.hold + 0.01, motion, false);
  assert.ok(before.y < focus.y && focus.y < after.y);
  assert.ok(before.z < focus.z && focus.z < after.z);
  assert.notEqual(before.scale, focus.scale);
  assert.notEqual(focus.scale, after.scale);
});

test('travelling Cues visibly blur in and blur out within their Section', () => {
  const cues = canonical.sections[1].text.cues;
  const motion = canonical.globals.textMotion;
  const firstInterval = getAboutNarrativeCueMotionInterval(cues[0], motion);
  const firstFrame = sampleAboutNarrativeCue(cues[0], firstInterval.start, motion, false);
  const approachingFrame = sampleAboutNarrativeCue(
    cues[0],
    firstInterval.start + ((firstInterval.end - firstInterval.start) * (motion.readableStart * 0.5)),
    motion,
    false,
  );
  const lastInterval = getAboutNarrativeCueMotionInterval(cues.at(-1), motion);
  const lastFrame = sampleAboutNarrativeCue(cues.at(-1), lastInterval.end, motion, false);
  assert.equal(firstInterval.start, 0);
  assert.equal(firstFrame.opacity, 0);
  assert.equal(firstFrame.blur, motion.maxBlur);
  assert.ok(approachingFrame.opacity > 0 && approachingFrame.opacity < 1);
  assert.ok(approachingFrame.blur > 0 && approachingFrame.blur < motion.maxBlur);
  assert.equal(lastInterval.end, 1);
  assert.equal(lastFrame.opacity, 0);
  assert.equal(lastFrame.blur, motion.maxBlur);
});

test('global title duration closes large gaps between narrative beats', () => {
  canonical.sections.forEach((section) => {
    const cues = (section.text.cues || []).filter((cue) => getAboutNarrativeCueMovement(cue) === 'spatial');
    for (let index = 1; index < cues.length; index += 1) {
      const previous = getAboutNarrativeCueMotionInterval(cues[index - 1], canonical.globals.textMotion);
      const current = getAboutNarrativeCueMotionInterval(cues[index], canonical.globals.textMotion);
      assert.ok(current.start - previous.end <= 0.04, `${section.id} has too much space before ${cues[index].id}`);
    }
  });
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
