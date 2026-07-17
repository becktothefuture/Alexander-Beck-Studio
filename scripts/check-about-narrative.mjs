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
  getAboutNarrativeCueTimingBounds,
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
import {
  applyAboutNarrativePermutation,
  createAboutNarrativeCorrespondence,
  createAboutNarrativeSequenceCorrespondence,
  validateAboutNarrativePermutation,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCorrespondence.js';
import {
  ABOUT_NARRATIVE_DISCIPLINE_ANCHORS,
  resolveAboutNarrativeSwarmMotion,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';

const configPath = resolve('react-app/app/public/config/contents-about.json');
const canonical = normalizeAboutNarrativeDocument(JSON.parse(await readFile(configPath, 'utf8')));

function createPointFixture(points, {
  presence = null,
  size = null,
  attributes = {},
} = {}) {
  const count = points.length;
  return {
    positions: new Float32Array(points.flatMap((point) => point.length === 3 ? point : [point[0], 0, 0])),
    presence: new Float32Array(presence || new Array(count).fill(1)),
    size: new Float32Array(size || new Array(count).fill(1)),
    attributes: Object.fromEntries(Object.entries(attributes).map(([name, values]) => [name, new Float32Array(values)])),
    bounds: { min: [0, 0, 0], max: [0, 0, 0] },
  };
}

test('canonical About document validates and serializes deterministically', () => {
  assert.deepEqual(validateAboutNarrativeDocument(canonical).filter((item) => item.level === 'error'), []);
  assert.equal(serializeAboutNarrativeDocument(JSON.parse(serializeAboutNarrativeDocument(canonical))), serializeAboutNarrativeDocument(canonical));
});

test('future schema versions stay read-only', () => {
  const future = structuredClone(canonical);
  future.schemaVersion = canonical.schemaVersion + 1;
  assert.equal(migrateAboutNarrativeDocument(future).readOnly, true);
});

test('raw unsupported correspondence is rejected before serialization can normalize it away', () => {
  const invalid = structuredClone(canonical);
  invalid.sections[1].world.transitionIn.correspondence = 'mystery-mapper';
  assert.throws(() => serializeAboutNarrativeDocument(invalid), /Unknown transition setting/);
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
    ['cluster-v1', 'turbulent-field-v1', 'calm-field-v1', 'discipline-grid-v1', 'continue', 'living-field-v1', 'continue', 'bust-v1'],
  );
  assert.equal(canonical.sections[0].text.cues[0].text, 'I help shape complex ideas into emotionally compelling experiences.');
  assert.equal(canonical.sections[2].text.blocks[0].text, 'Perhaps that is why I have always been drawn to the space between aesthetics and technology.');
  assert.equal(canonical.sections[3].text.disciplineReveal.items.length, 6);
  assert.equal(canonical.sections[3].text.cues, undefined);
  assert.equal(canonical.sections[4].text.blocks.some((block) => block.kind === 'disciplines'), false);
  const disciplineLabels = canonical.sections[3].text.disciplineReveal.items.map((item) => item.label);
  const disciplineEditorialCopy = canonical.sections[4].text.blocks.map((block) => block.text || '').join(' ');
  disciplineLabels.forEach((label) => assert.equal(disciplineEditorialCopy.includes(label), false));
  assert.equal(canonical.sections[4].text.blocks.at(-1).worldInfluence, true);
  assert.equal(canonical.sections[6].text.blocks.length, 1);
  assert.equal(canonical.sections[7].text.cues[0].text, 'If you are building something new, let’s talk.');
  assert.equal(canonical.sections[7].text.profile, undefined);
  assert.equal(canonical.sections[7].text.prompt, undefined);
});

test('canonical sequence opts exactly five inter-Shape transitions into local travel', () => {
  const setWorlds = canonical.sections.filter((section) => section.world.mode === 'set');
  assert.equal(setWorlds[0].world.transitionIn.correspondence, 'index-v1');
  assert.deepEqual(
    setWorlds.slice(1).map((section) => section.world.transitionIn.correspondence),
    new Array(5).fill('spatial-nearest-v1'),
  );
  const plan = compileAboutNarrativeDocument(canonical);
  assert.deepEqual(plan.worldSequence.map((world) => world.sectionId), setWorlds.map((section) => section.id));
  assert.deepEqual(sampleAboutNarrativePlan(plan, 0).world.sequence, plan.worldSequence);
});

test('discipline reveal owns one clip, a top-down camera handoff, and six editorially spaced anchors', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const background = plan.sections[2];
  const practice = plan.sections[3];
  const disciplines = plan.sections[4];
  assert.equal(plan.disciplineReveal.sectionId, practice.id);
  assert.deepEqual(background.camera.keys.at(-1).offset, [0, 9, 0]);
  assert.deepEqual(background.camera.keys.at(-1).lookAtOffset, [0, -9, -0.55]);
  assert.deepEqual(practice.camera.keys[0].offset, background.camera.keys.at(-1).offset);
  assert.deepEqual(disciplines.camera.keys[0].offset, practice.camera.keys.at(-1).offset);
  assert.ok(Math.abs(practice.world.transform.rotation[0] + (Math.PI / 2)) < 0.0001);
  assert.equal(practice.world.transitionIn.end < practice.text.disciplineReveal.start, true);
  const revealFrame = sampleAboutNarrativePlan(
    plan,
    practice.startWU + (practice.travelWU * 0.7),
  );
  assert.equal(revealFrame.disciplineReveal.sectionIndex, 3);
  assert.ok(Math.abs(revealFrame.disciplineReveal.localProgress - 0.7) < 1e-9);
  const verticalPositions = ABOUT_NARRATIVE_DISCIPLINE_ANCHORS.map((anchor) => anchor.y);
  assert.equal(new Set(verticalPositions).size, 6);
  verticalPositions.slice(1).forEach((value, index) => assert.ok(value - verticalPositions[index] >= 0.14));
});

test('cluster turbulence stays shared and tapers into the calm field', () => {
  const worlds = canonical.sections.slice(0, 3).map((section) => section.world);
  const strengths = worlds.map((world) => world.modifiers.find((modifier) => modifier.id === 'swarm-life-v1')?.parameters.strength);
  assert.deepEqual(strengths, [1, 1, 0.18]);
  const clusterMotion = resolveAboutNarrativeSwarmMotion({ strength: strengths[0] }, canonical.globals.swarmTurbulence);
  const turbulentMotion = resolveAboutNarrativeSwarmMotion({ strength: strengths[1] }, canonical.globals.swarmTurbulence);
  const calmMotion = resolveAboutNarrativeSwarmMotion({ strength: strengths[2] }, canonical.globals.swarmTurbulence);
  assert.deepEqual(clusterMotion, turbulentMotion);
  assert.equal(calmMotion.amplitude, clusterMotion.amplitude * 0.18);
  assert.equal(calmMotion.speed, clusterMotion.speed);
  assert.equal(clusterMotion.storyMix, 0);
});

test('editorial emphasis stays structured, sparse, and attached to authored copy', () => {
  const blocks = canonical.sections.flatMap((section) => section.text.blocks || []);
  const emphasis = blocks.flatMap((block) => (block.emphasis || []).map((item) => ({ block, item })));
  assert.ok(emphasis.length >= 12);
  emphasis.forEach(({ block, item }) => {
    assert.ok(block.text.includes(item.text), `${block.id} should contain highlighted phrase “${item.text}”`);
    assert.ok(['blue', 'green', 'orange'].includes(item.tone));
  });
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
  assert.deepEqual(getAboutNarrativeCueTimingBounds(cue), {
    min: 0,
    max: 1,
    lead: cue.hold - cue.enter,
    trail: cue.exit - cue.hold,
  });
  const atStart = moveAboutNarrativeCueTiming(cue, 0);
  const atEnd = moveAboutNarrativeCueTiming(atStart, 1);
  assert.equal(atStart.hold, 0);
  assert.ok(atStart.enter < 0);
  assert.equal(atEnd.hold, 1);
  assert.ok(atEnd.exit > 1);
  assert.ok(Math.abs((atEnd.hold - atEnd.enter) - (cue.hold - cue.enter)) < 1e-9);
  assert.ok(Math.abs((atEnd.exit - atEnd.hold) - (cue.exit - cue.hold)) < 1e-9);
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
  extended.sections[5].world.transitionIn.start = 1.4;
  extended.sections[5].world.transitionIn.end = 1.8;
  const plan = compileAboutNarrativeDocument(extended);
  assert.equal(plan.valid, true);
  const origin = plan.sections[5];
  const halfwayWU = origin.startWU + (1.6 * origin.travelWU);
  const sample = sampleAboutNarrativePlan(plan, halfwayWU);
  assert.equal(sample.section.id, extended.sections[6].id);
  assert.ok(Math.abs(sample.world.transitionProgress - 0.5) < 1e-9);
  assert.equal(sample.world.from.shapeId, extended.sections[3].world.shapeId);
  assert.equal(sample.world.to.shapeId, extended.sections[5].world.shapeId);
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
  assert.deepEqual(canonical.sections[0].text.cues.map((cue) => cue.id), ['promise-main', 'complexity-idea']);
  assert.ok(canonical.sections[0].text.cues.every((cue) => getAboutNarrativeCueMovement(cue) === 'spatial'));
  assert.ok(canonical.sections[1].text.cues.every((cue) => getAboutNarrativeCueMovement(cue) === 'spatial'));
  assert.equal(canonical.sections[1].text.cues.some((cue) => cue.id === 'complexity-idea'), false);
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
  const cues = canonical.sections[0].text.cues;
  const motion = canonical.globals.textMotion;
  const firstInterval = getAboutNarrativeCueMotionInterval(cues[0], motion);
  const firstFrame = sampleAboutNarrativeCue(cues[0], firstInterval.start, motion, false);
  const movingFrame = sampleAboutNarrativeCue(cues[0], firstInterval.start + ((firstInterval.end - firstInterval.start) * 0.5), motion, false);
  const laterCue = canonical.sections[1].text.cues[0];
  const laterInterval = getAboutNarrativeCueMotionInterval(laterCue, motion);
  const approachingFrame = sampleAboutNarrativeCue(
    laterCue,
    laterInterval.start + ((laterInterval.end - laterInterval.start) * (motion.readableStart * 0.5)),
    motion,
    false,
  );
  const lastInterval = getAboutNarrativeCueMotionInterval(cues.at(-1), motion);
  const lastFrame = sampleAboutNarrativeCue(cues.at(-1), lastInterval.end, motion, false);
  assert.equal(firstInterval.start, 0);
  assert.equal(firstFrame.opacity, 1);
  assert.equal(firstFrame.blur, 0);
  assert.equal(firstFrame.y, motion.openerStartY);
  assert.ok(movingFrame.y > firstFrame.y);
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

test('discipline grid preserves exactly six visible semantic anchor points', async () => {
  const pointCount = 5000;
  const output = await generateAboutNarrativeShape({
    shapeId: 'discipline-grid-v1',
    pointCount,
    seeds: createAboutNarrativeSeeds(pointCount, 506832829),
    quality: 'mobile',
    parameters: { width: 12.5, height: 7.5, depthJitter: 0.04, density: 0.18 },
  });
  const groups = [];
  output.attributes.disciplineGroup.forEach((group, index) => {
    if (group > 0) groups.push({ group, presence: output.presence[index] });
  });
  assert.deepEqual(groups.map((item) => item.group), [1, 2, 3, 4, 5, 6]);
  assert.ok(groups.every((item) => item.presence === 1));
});

test('turbulent field creates uneven volumetric density rather than a uniform random fill', async () => {
  const pointCount = 4000;
  const output = await generateAboutNarrativeShape({
    shapeId: 'turbulent-field-v1',
    pointCount,
    seeds: createAboutNarrativeSeeds(pointCount, 506832829),
    quality: 'desktop',
    parameters: {
      width: 10,
      height: 7,
      depth: 9,
      chunkCount: 7,
      chunkSize: 1.55,
      scatter: 0.14,
      turbulence: 0.52,
      density: 1,
    },
  });
  const bins = new Array(64).fill(0);
  for (let index = 0; index < pointCount; index += 1) {
    const offset = index * 3;
    const coordinates = [0, 1, 2].map((axis) => Math.min(3, Math.floor(
      ((output.positions[offset + axis] - output.bounds.min[axis])
        / (output.bounds.max[axis] - output.bounds.min[axis])) * 4,
    )));
    bins[coordinates[0] + (coordinates[1] * 4) + (coordinates[2] * 16)] += 1;
  }
  const mean = pointCount / bins.length;
  const deviation = Math.sqrt(bins.reduce((sum, value) => sum + ((value - mean) ** 2), 0) / bins.length);
  assert.ok(deviation / mean > 1, 'Turbulent field should contain visibly dense chunks and sparse pockets.');
  assert.ok(Math.max(...bins) > mean * 5);
});

test('spatial correspondence resolves a reversed line with a deterministic bijection', () => {
  const from = createPointFixture([[0], [1], [2], [3]]);
  const to = createPointFixture([[3], [2], [1], [0]], {
    size: [10, 20, 30, 40],
    attributes: { sentinel: [103, 102, 101, 100] },
  });
  const first = createAboutNarrativeCorrespondence(from, to, 'spatial-nearest-v1');
  const second = createAboutNarrativeCorrespondence(from, to, 'spatial-nearest-v1');
  assert.deepEqual(first.permutation, new Uint32Array([3, 2, 1, 0]));
  assert.deepEqual(first.permutation, second.permutation);
  assert.equal(first.metrics.weightedRmsDistance, 0);
  validateAboutNarrativePermutation(first.permutation, 4);
  const mapped = applyAboutNarrativePermutation(to, first.permutation);
  assert.deepEqual([...mapped.positions], [...from.positions]);
  assert.deepEqual([...mapped.size], [40, 30, 20, 10]);
  assert.deepEqual([...mapped.attributes.sentinel], [100, 101, 102, 103]);
  assert.deepEqual([...to.positions], [3, 0, 0, 2, 0, 0, 1, 0, 0, 0, 0, 0]);
});

test('spatial correspondence measures rest positions after World transforms', () => {
  const from = createPointFixture([[0], [10]]);
  const to = createPointFixture([[0], [10]]);
  const reflected = [
    -1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1,
  ];
  const result = createAboutNarrativeCorrespondence(from, to, 'spatial-nearest-v1', { toMatrix: reflected });
  assert.deepEqual(result.permutation, new Uint32Array([1, 0]));
  assert.ok(result.metrics.weightedRmsDistance < result.baselineMetrics.weightedRmsDistance);
});

test('spatial correspondence preserves target-only groups and fractional density', () => {
  const from = createPointFixture([[0], [10], [20], [30]], { presence: [1, 0.0005, 0.5, 0] });
  const to = createPointFixture([[30], [20], [10], [0]], {
    presence: [1, 0, 0.5, 0.0005],
    size: [4, 3, 2, 1],
    attributes: { disciplineGroup: [6, 0, 0, 0], sentinel: [60, 20, 10, 0] },
  });
  const result = createAboutNarrativeCorrespondence(from, to, 'spatial-nearest-v1');
  validateAboutNarrativePermutation(result.permutation, 4);
  const mapped = applyAboutNarrativePermutation(to, result.permutation);
  const groupOwner = [...mapped.attributes.disciplineGroup].findIndex((group) => group === 6);
  assert.equal(groupOwner, 2, 'The nearest eligible visible source should own the target-only anchor.');
  assert.equal(mapped.attributes.sentinel[groupOwner], 60);
  assert.deepEqual([...mapped.presence].sort(), [...to.presence].sort());
});

test('sequence correspondence carries each mapped endpoint into the next pair', () => {
  const a = createPointFixture([[0], [1], [2], [3]]);
  const b = createPointFixture([[3], [2], [1], [0]], { attributes: { sentinel: [3, 2, 1, 0] } });
  const c = createPointFixture([[1], [3], [0], [2]], { attributes: { sentinel: [10, 30, 0, 20] } });
  const entries = [
    { id: 'a', mode: 'index-v1', output: a },
    { id: 'b', mode: 'spatial-nearest-v1', output: b },
    { id: 'c', mode: 'spatial-nearest-v1', output: c },
  ];
  const first = createAboutNarrativeSequenceCorrespondence(entries);
  const second = createAboutNarrativeSequenceCorrespondence(entries);
  assert.deepEqual(first.map((pair) => pair.permutation), second.map((pair) => pair.permutation));
  const mappedB = applyAboutNarrativePermutation(b, first[1].permutation);
  const directSecondPair = createAboutNarrativeCorrespondence(mappedB, c, 'spatial-nearest-v1');
  assert.deepEqual(first[2].permutation, directSecondPair.permutation);
  assert.deepEqual([...mappedB.positions], [...a.positions]);
  assert.deepEqual([...mappedB.attributes.sentinel], [0, 1, 2, 3]);
});

test('12,000-point spatial correspondence stays bounded and improves the production cluster pair', async () => {
  const pointCount = 12000;
  const seeds = createAboutNarrativeSeeds(pointCount, 506832829);
  const [cluster, turbulent] = await Promise.all([
    generateAboutNarrativeShape({
      shapeId: 'cluster-v1', pointCount, seeds, quality: 'desktop', parameters: { radius: 2.7, density: 1 },
    }),
    generateAboutNarrativeShape({
      shapeId: 'turbulent-field-v1', pointCount, seeds, quality: 'desktop',
      parameters: { width: 10, height: 7, depth: 15, chunkCount: 7, chunkSize: 1.55, scatter: 0.14, turbulence: 0.52, density: 1 },
    }),
  ]);
  const startedAt = performance.now();
  const result = createAboutNarrativeCorrespondence(cluster, turbulent, 'spatial-nearest-v1');
  const duration = performance.now() - startedAt;
  assert.equal(result.installedStrategy, 'spatial-nearest-v1');
  assert.ok(result.metrics.weightedRmsDistance < result.baselineMetrics.weightedRmsDistance);
  assert.ok(Math.abs(
    result.metrics.improvement
      - (1 - (result.metrics.weightedRmsDistance / result.baselineMetrics.weightedRmsDistance)),
  ) < 1e-10);
  assert.ok(result.metrics.p95Distance <= result.baselineMetrics.p95Distance);
  assert.ok(result.metrics.maxDistance <= result.baselineMetrics.maxDistance);
  assert.ok(duration < 1500, `Correspondence smoke test took ${duration.toFixed(1)}ms.`);
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

test('editor correspondence changes survive serialization and undo cleanly', () => {
  const store = createAboutNarrativeEditorStore(canonical);
  const sectionIndex = store.getSnapshot().document.sections.findIndex((section) => section.world?.shapeId === 'calm-field-v1');
  const previous = store.getSnapshot().document.sections[sectionIndex].world.transitionIn.correspondence;
  store.commit('Change correspondence', (draft) => {
    draft.sections[sectionIndex].world.transitionIn.correspondence = 'stable-seed';
  });
  const serialized = JSON.parse(serializeAboutNarrativeDocument(store.getSnapshot().document));
  assert.equal(serialized.sections[sectionIndex].world.transitionIn.correspondence, 'stable-seed');
  store.undo();
  assert.equal(store.getSnapshot().document.sections[sectionIndex].world.transitionIn.correspondence, previous);
});
