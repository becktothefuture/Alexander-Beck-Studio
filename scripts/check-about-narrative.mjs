import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolve } from 'node:path';
import {
  compileAboutNarrativeDocument,
  getAboutNarrativeCueMovement,
  getAboutNarrativeCueMotionInterval,
  getAboutNarrativeReducedCueIndex,
  sampleAboutNarrativeCue,
  sampleAboutNarrativePlan,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCompiler.js';
import { createAboutNarrativeEditorStore } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeEditorStore.js';
import {
  captureAboutNarrativePlayheadContext,
  createAboutNarrativeCueClipboardPayload,
  createAboutNarrativeDuplicateId,
  deriveAboutNarrativeLoopRange,
  duplicateAboutNarrativeCueGroup,
  duplicateAboutNarrativeSection,
  getAboutNarrativeCameraKeyTimingBounds,
  getAboutNarrativeCueTimingBounds,
  getAboutNarrativeExtentField,
  getAboutNarrativeSelectionMembers,
  moveAboutNarrativeCueTiming,
  remapAboutNarrativePlayheadContext,
  resolveAboutNarrativeCameraKeyDrop,
  resolveAboutNarrativeCueDistribution,
  resolveAboutNarrativeCueExactGap,
  resolveAboutNarrativeCueGroupAlign,
  resolveAboutNarrativeCueGroupMove,
  resolveAboutNarrativeCueGroupPaste,
  stitchAboutNarrativeCameraBoundaries,
  toggleAboutNarrativeCueSelection,
  validateAboutNarrativeCueClipboardPayload,
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
  ABOUT_NARRATIVE_DISCIPLINE_BALL_TOKENS,
  ABOUT_NARRATIVE_DISCIPLINE_ANCHORS,
  resolveAboutNarrativeSwarmMotion,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';

const configPath = resolve('react-app/app/public/config/contents-about.json');
const designSystemPath = resolve('react-app/app/public/config/design-system.json');
const canonical = normalizeAboutNarrativeDocument(JSON.parse(await readFile(configPath, 'utf8')));
const designSystem = JSON.parse(await readFile(designSystemPath, 'utf8'));

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
  const serialized = serializeAboutNarrativeDocument(canonical);
  assert.equal(serializeAboutNarrativeDocument(JSON.parse(serialized)), serialized);
  assert.equal(serialized.includes('farScale'), false);
  assert.equal(serialized.includes('nearScale'), false);
  assert.equal(JSON.parse(serialized).globals.textMotion.perspective, 1600);
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

test('discipline reveal owns one extended clip, a paced top-down camera handoff, and six editorially spaced anchors', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const background = plan.sections[2];
  const practice = plan.sections[3];
  const disciplines = plan.sections[4];
  assert.equal(plan.disciplineReveal.sectionId, practice.id);
  assert.deepEqual(background.camera.keys.map((key) => key.at), [0, 0.5, 0.74, 1]);
  assert.deepEqual(background.camera.keys.at(-1).offset, [0, 6.4, 0]);
  assert.deepEqual(background.camera.keys.at(-1).lookAtOffset, [0, -6.4, -0.45]);
  assert.equal(background.camera.keys.at(-1).fov, 48);
  assert.deepEqual(practice.camera.keys[0].offset, background.camera.keys.at(-1).offset);
  assert.deepEqual(disciplines.camera.keys[0].offset, practice.camera.keys.at(-1).offset);
  assert.ok(Math.abs(practice.world.transform.rotation[0] + (Math.PI / 2)) < 0.0001);
  assert.equal(practice.world.transitionIn.end < practice.text.disciplineReveal.start, true);
  assert.equal(practice.world.transform.mobileScale, 0.15);
  assert.equal(practice.text.disciplineReveal.backgroundOpacity, 0.1);
  assert.equal(practice.text.disciplineReveal.reconnectOpacity, 0.24);
  const revealFrame = sampleAboutNarrativePlan(
    plan,
    practice.startWU + (practice.travelWU * 0.7),
  );
  assert.equal(revealFrame.disciplineReveal.sectionIndex, 3);
  assert.ok(Math.abs(revealFrame.disciplineReveal.localProgress - 0.7) < 1e-9);
  assert.ok(practice.text.disciplineReveal.end > 1);
  const editorialHandoffFrame = sampleAboutNarrativePlan(plan, disciplines.startWU + 0.08);
  assert.ok(editorialHandoffFrame.disciplineReveal.localProgress > 1);
  assert.ok(editorialHandoffFrame.disciplineReveal.localProgress < practice.text.disciplineReveal.end);
  const verticalPositions = ABOUT_NARRATIVE_DISCIPLINE_ANCHORS.map((anchor) => anchor.y);
  assert.equal(new Set(verticalPositions).size, 6);
  verticalPositions.slice(1).forEach((value, index) => assert.ok(value - verticalPositions[index] >= 0.14));
});

test('discipline colours follow the canonical Home simulation distribution', () => {
  const distributionTokens = designSystem.runtime.colorDistribution.map(({ colorIndex }) => `--ball-${colorIndex + 1}`);
  assert.deepEqual(ABOUT_NARRATIVE_DISCIPLINE_BALL_TOKENS, distributionTokens);
  assert.deepEqual(
    canonical.sections[3].text.disciplineReveal.items.map(({ label }) => label),
    designSystem.runtime.colorDistribution.map(({ label }) => label),
  );
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
  const disciplineBlocks = canonical.sections.find((section) => section.id === 'disciplines').text.blocks;
  assert.equal(disciplineBlocks.flatMap((block) => block.emphasis || []).length, 1);
  assert.deepEqual(disciplineBlocks[0].emphasis.map((item) => item.text), ['different way of thinking']);
  assert.ok(disciplineBlocks.slice(1).every((block) => !block.emphasis?.length));
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

test('Section extent fields follow the active preview profile', () => {
  assert.equal(getAboutNarrativeExtentField('desktop'), 'extentWU');
  assert.equal(getAboutNarrativeExtentField('reduced-motion'), 'extentWU');
  assert.equal(getAboutNarrativeExtentField('mobile'), 'mobileExtentWU');
});

test('Section resizing preserves the semantic playhead context', () => {
  const before = compileAboutNarrativeDocument(canonical);
  const resizedDocument = structuredClone(canonical);
  resizedDocument.sections[1].extentWU = 1.8;
  const after = compileAboutNarrativeDocument(resizedDocument);
  const resizedSection = before.sections[1];
  const laterSection = before.sections[4];

  const beforeContext = captureAboutNarrativePlayheadContext({
    plan: before,
    storyWU: before.sections[0].startWU + 0.2,
    resizedSectionId: resizedSection.id,
  });
  assert.equal(beforeContext.mode, 'absolute');
  assert.equal(remapAboutNarrativePlayheadContext(beforeContext, after), beforeContext.storyWU);

  const insideContext = captureAboutNarrativePlayheadContext({
    plan: before,
    storyWU: resizedSection.startWU + (resizedSection.travelWU * 0.37),
    resizedSectionId: resizedSection.id,
  });
  const remappedInside = remapAboutNarrativePlayheadContext(insideContext, after);
  assert.equal(insideContext.sectionId, resizedSection.id);
  assert.ok(Math.abs(
    remappedInside - (after.sections[1].startWU + (after.sections[1].travelWU * 0.37)),
  ) < 0.000001);

  const laterContext = captureAboutNarrativePlayheadContext({
    plan: before,
    storyWU: laterSection.startWU + (laterSection.travelWU * 0.62),
    resizedSectionId: resizedSection.id,
  });
  const remappedLater = remapAboutNarrativePlayheadContext(laterContext, after);
  assert.equal(laterContext.sectionId, laterSection.id);
  assert.ok(Math.abs(
    remappedLater - (after.sections[4].startWU + (after.sections[4].travelWU * 0.62)),
  ) < 0.000001);
});

test('Cue multi-selection remains backward-compatible and toggles deterministically', () => {
  const first = { type: 'cue', sectionId: 'promise', cueId: 'promise-main', keyPart: 'focus' };
  const second = { type: 'cue', sectionId: 'complexity', cueId: 'complexity-fragmented', keyPart: 'focus' };
  assert.deepEqual(getAboutNarrativeSelectionMembers(first), [first]);

  const combined = toggleAboutNarrativeCueSelection(first, second);
  assert.equal(combined.cueId, second.cueId);
  assert.deepEqual(getAboutNarrativeSelectionMembers(combined), [second, first]);

  const withoutSecond = toggleAboutNarrativeCueSelection(combined, second);
  assert.deepEqual(withoutSecond, first);
  assert.deepEqual(getAboutNarrativeSelectionMembers({
    ...combined,
    members: [first, first, { type: 'section', sectionId: 'promise' }],
  }), [second, first]);
});

test('Cue groups move in global WU, clamp as one group, and preserve envelopes', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const members = [
    { type: 'cue', sectionId: 'promise', cueId: 'complexity-idea', keyPart: 'focus' },
    { type: 'cue', sectionId: 'complexity', cueId: 'complexity-fragmented', keyPart: 'focus' },
  ];
  const result = resolveAboutNarrativeCueGroupMove({
    document: canonical,
    plan,
    members,
    primary: members[0],
    deltaWU: 0.5,
  });
  assert.equal(result.valid, true);
  assert.equal(result.deltaWU, result.maxDeltaWU);
  assert.ok(result.deltaWU < 0.5);
  assert.equal(result.moves[0].sectionId, members[0].sectionId);
  assert.equal(result.moves[1].sectionId, members[1].sectionId);

  const originalGlobalWU = members.map((member) => {
    const section = canonical.sections.find((item) => item.id === member.sectionId);
    const compiled = plan.sections.find((item) => item.id === member.sectionId);
    const cue = section.text.cues.find((item) => item.id === member.cueId);
    return compiled.startWU + (cue.hold * compiled.travelWU);
  });
  const movedGlobalWU = result.moves.map((move) => {
    const compiled = plan.sections.find((item) => item.id === move.sectionId);
    return compiled.startWU + (move.hold * compiled.travelWU);
  });
  assert.ok(Math.abs(
    (movedGlobalWU[1] - movedGlobalWU[0]) - (originalGlobalWU[1] - originalGlobalWU[0]),
  ) < 0.00001);
  result.moves.forEach((move) => {
    const section = canonical.sections.find((item) => item.id === move.sectionId);
    const cue = section.text.cues.find((item) => item.id === move.cueId);
    assert.ok(Math.abs((move.hold - move.enter) - (cue.hold - cue.enter)) < 0.00001);
    assert.ok(Math.abs((move.exit - move.hold) - (cue.exit - cue.hold)) < 0.00001);
  });
});

test('Cue rhythm distribution is even in global WU and preserves envelopes and ownership', () => {
  const document = structuredClone(canonical);
  const section = document.sections.find((item) => item.id === 'complexity');
  section.text.cues[1] = moveAboutNarrativeCueTiming(section.text.cues[1], 0.48, { snap: false });
  const plan = compileAboutNarrativeDocument(document);
  const members = [0, 1, 2].map((cueIndex) => ({
    type: 'cue',
    sectionId: section.id,
    cueId: section.text.cues[cueIndex].id,
    keyPart: 'focus',
  }));
  const result = resolveAboutNarrativeCueDistribution({
    document,
    plan,
    members,
    primary: members[1],
  });
  assert.equal(result.valid, true);
  assert.equal(result.moves.length, 3);
  const gaps = result.moves.slice(1).map((move, index) => (
    move.storyWU - result.moves[index].storyWU
  ));
  assert.ok(Math.abs(gaps[0] - gaps[1]) < 0.000001);
  result.moves.forEach((move, index) => {
    const cue = section.text.cues[index];
    assert.equal(move.sectionId, section.id);
    assert.ok(Math.abs((move.hold - move.enter) - (cue.hold - cue.enter)) < 0.000001);
    assert.ok(Math.abs((move.exit - move.hold) - (cue.exit - cue.hold)) < 0.000001);
  });
});

test('exact Cue gaps honour primary, first, and last anchors and report boundary limits', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const members = [
    { type: 'cue', sectionId: 'complexity', cueId: 'complexity-conditions', keyPart: 'focus' },
    { type: 'cue', sectionId: 'complexity', cueId: 'complexity-fragmented', keyPart: 'focus' },
    { type: 'cue', sectionId: 'complexity', cueId: 'complexity-curiosity', keyPart: 'focus' },
  ];
  ['primary', 'first', 'last'].forEach((anchor) => {
    const result = resolveAboutNarrativeCueExactGap({
      document: canonical,
      plan,
      members,
      primary: members[1],
      gapWU: 0.2,
      anchor,
    });
    assert.equal(result.valid, true, `${anchor} should produce a valid exact gap`);
    const gaps = result.moves.slice(1).map((move, index) => move.storyWU - result.moves[index].storyWU);
    gaps.forEach((gap) => assert.ok(Math.abs(gap - 0.2) < 0.000001));
    const anchorCueId = anchor === 'first'
      ? members[0].cueId
      : anchor === 'last'
        ? members[2].cueId
        : members[1].cueId;
    assert.equal(result.anchorCueId, anchorCueId);
  });

  const tooWide = resolveAboutNarrativeCueExactGap({
    document: canonical,
    plan,
    members,
    primary: members[0],
    gapWU: 10,
    anchor: 'first',
  });
  assert.equal(tooWide.valid, false);
  assert.ok(Number.isFinite(tooWide.maximumValidGapWU));
  assert.ok(tooWide.maximumValidGapWU < 10);
  assert.match(tooWide.reason, /Section boundaries/);

  const tooNarrow = resolveAboutNarrativeCueExactGap({
    document: canonical,
    plan,
    members: [
      { type: 'cue', sectionId: 'promise', cueId: 'complexity-idea', keyPart: 'focus' },
      members[0],
    ],
    primary: { type: 'cue', sectionId: 'promise', cueId: 'complexity-idea', keyPart: 'focus' },
    gapWU: 0.1,
    anchor: 'first',
  });
  assert.equal(tooNarrow.valid, false);
  assert.ok(tooNarrow.minimumValidGapWU > 0.1);
});

test('aligning a primary Cue to the playhead moves its complete group atomically', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const members = [
    { type: 'cue', sectionId: 'complexity', cueId: 'complexity-fragmented', keyPart: 'focus' },
    { type: 'cue', sectionId: 'complexity', cueId: 'complexity-curiosity', keyPart: 'focus' },
  ];
  const compiled = plan.sections.find((section) => section.id === 'complexity');
  const playheadWU = compiled.startWU + (0.62 * compiled.travelWU);
  const aligned = resolveAboutNarrativeCueGroupAlign({
    document: canonical,
    plan,
    members,
    primary: members[0],
    playheadWU,
  });
  assert.equal(aligned.valid, true);
  assert.equal(aligned.aligned, true);
  assert.ok(Math.abs(aligned.moves[0].storyWU - playheadWU) < 0.000001);
  const beforeGap = (0.575 - 0.405) * compiled.travelWU;
  const afterGap = aligned.moves[1].storyWU - aligned.moves[0].storyWU;
  assert.ok(Math.abs(afterGap - beforeGap) < 0.000001);

  const clamped = resolveAboutNarrativeCueGroupAlign({
    document: canonical,
    plan,
    members,
    primary: members[0],
    playheadWU: plan.maxStoryWU + 20,
  });
  assert.equal(clamped.valid, true);
  assert.equal(clamped.aligned, false);
  assert.equal(clamped.deltaWU, clamped.maxDeltaWU);
});

test('Cue duplication allocates deterministic IDs, remaps group references, and preserves unrelated tracks', () => {
  const document = structuredClone(canonical);
  const section = document.sections.find((item) => item.id === 'complexity');
  section.text.cues[1].anchor = section.text.cues[0].id;
  const members = section.text.cues.slice(0, 2).map((cue) => ({
    type: 'cue',
    sectionId: section.id,
    cueId: cue.id,
    keyPart: 'focus',
  }));
  assert.equal(createAboutNarrativeDuplicateId(document, 'complexity-conditions'), 'complexity-conditions-2');
  assert.equal(createAboutNarrativeDuplicateId(document, 'complexity-conditions', {
    reservedIds: ['complexity-conditions-2'],
  }), 'complexity-conditions-3');

  const result = duplicateAboutNarrativeCueGroup({
    document,
    members,
    primary: members[1],
  });
  assert.equal(result.valid, true);
  assert.deepEqual(
    result.items.map((item) => item.cueId),
    ['complexity-conditions-2', 'complexity-fragmented-2'],
  );
  assert.equal(result.items[1].cue.anchor, 'complexity-conditions-2');
  assert.equal(result.selection.cueId, 'complexity-fragmented-2');
  assert.deepEqual(result.document.sections[5].world, document.sections[5].world);
  assert.deepEqual(result.document.sections[5].camera, document.sections[5].camera);
  assert.deepEqual(validateAboutNarrativeDocument(result.document).filter((item) => item.level === 'error'), []);
});

test('Section duplication remaps internal IDs, stitches only new boundaries, and rejects protected sources', () => {
  const document = structuredClone(canonical);
  const source = document.sections.find((section) => section.id === 'complexity');
  source.text.cues[1].anchor = source.text.cues[0].id;
  const unrelatedSection = structuredClone(document.sections[5]);
  const result = duplicateAboutNarrativeSection({ document, sectionId: source.id });
  assert.equal(result.valid, true);
  assert.equal(result.sectionIndex, 2);
  assert.equal(result.sectionId, 'complexity-2');
  assert.equal(result.document.sections[1].id, 'complexity');
  assert.equal(result.document.sections[2].id, 'complexity-2');
  assert.equal(result.document.sections[3].id, 'background');
  assert.equal(result.section.text.cues[0].id, 'complexity-conditions-2');
  assert.equal(result.section.text.cues[1].anchor, 'complexity-conditions-2');
  ['offset', 'lookAtOffset', 'fov', 'roll'].forEach((field) => {
    assert.deepEqual(result.section.camera.keys[0][field], source.camera.keys.at(-1)[field]);
  });
  assert.deepEqual(result.document.sections[6], unrelatedSection);
  assert.deepEqual(validateAboutNarrativeDocument(result.document).filter((item) => item.level === 'error'), []);

  const protectedResult = duplicateAboutNarrativeSection({
    document,
    sectionId: 'epilogue',
  });
  assert.equal(protectedResult.valid, false);
  assert.match(protectedResult.reason, /Unlock|finale/);

  const mismatched = structuredClone(canonical);
  mismatched.sections[1].camera.keys[0].offset[0] = 11;
  mismatched.sections[2].camera.keys[0].offset[0] = 22;
  const stitched = stitchAboutNarrativeCameraBoundaries(mismatched, { boundaryIndexes: [2] });
  assert.equal(stitched.sections[1].camera.keys[0].offset[0], 11);
  ['offset', 'lookAtOffset', 'fov', 'roll'].forEach((field) => {
    assert.deepEqual(stitched.sections[2].camera.keys[0][field], mismatched.sections[1].camera.keys.at(-1)[field]);
  });
  assert.equal(mismatched.sections[2].camera.keys[0].offset[0], 22);
});

test('session Cue clipboard validates and pastes relative WU offsets into compatible Sections', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const members = [
    { type: 'cue', sectionId: 'complexity', cueId: 'complexity-conditions', keyPart: 'focus' },
    { type: 'cue', sectionId: 'complexity', cueId: 'complexity-fragmented', keyPart: 'focus' },
  ];
  const payload = createAboutNarrativeCueClipboardPayload({
    document: canonical,
    plan,
    members,
    primary: members[0],
  });
  assert.equal(payload.version, 1);
  assert.equal(payload.kind, 'cue-group');
  assert.equal(validateAboutNarrativeCueClipboardPayload(payload).valid, true);
  assert.equal(validateAboutNarrativeCueClipboardPayload({ ...payload, version: 2 }).valid, false);
  assert.equal(validateAboutNarrativeCueClipboardPayload({
    ...payload,
    items: [{ ...payload.items[0], cue: { ...payload.items[0].cue, unexpected: true } }],
  }).valid, false);
  assert.equal(validateAboutNarrativeCueClipboardPayload({
    ...payload,
    items: payload.items.map((item) => ({ ...item, offsetWU: item.offsetWU + 1 })),
  }).valid, false);

  const compiled = plan.sections.find((section) => section.id === 'complexity');
  const pasted = resolveAboutNarrativeCueGroupPaste({
    document: canonical,
    plan,
    payload,
    destinationSectionId: 'complexity',
    playheadWU: compiled.startWU + compiled.travelWU,
  });
  assert.equal(pasted.valid, true);
  assert.equal(pasted.clamped, true);
  assert.equal(pasted.items.length, 2);
  assert.ok(Math.abs(
    (pasted.items[1].storyWU - pasted.items[0].storyWU) - payload.items[1].offsetWU,
  ) < 0.000001);
  assert.deepEqual(validateAboutNarrativeDocument(pasted.document).filter((item) => item.level === 'error'), []);
  assert.deepEqual(pasted.document.sections[5].world, canonical.sections[5].world);

  const before = structuredClone(canonical);
  const incompatible = resolveAboutNarrativeCueGroupPaste({
    document: canonical,
    plan,
    payload,
    destinationSectionId: 'background',
    playheadWU: plan.sections[2].startWU,
  });
  assert.equal(incompatible.valid, false);
  assert.match(incompatible.reason, /does not contain a title Cue track/);
  assert.deepEqual(canonical, before);
});

test('one loop range derives from Sections, Cue groups, World transitions, and Camera keys with roll', () => {
  const plan = compileAboutNarrativeDocument(canonical);
  const section = deriveAboutNarrativeLoopRange({
    document: canonical,
    plan,
    source: { type: 'section', sectionId: 'complexity' },
    preRollWU: 0.2,
    postRollWU: 0.3,
  });
  assert.deepEqual(section, {
    valid: true,
    startWU: 1.5,
    endWU: 4.95,
    sourceType: 'section',
    sourceId: 'complexity',
  });

  const cueMembers = [
    { type: 'cue', sectionId: 'complexity', cueId: 'complexity-conditions', keyPart: 'focus' },
    { type: 'cue', sectionId: 'complexity', cueId: 'complexity-fragmented', keyPart: 'focus' },
  ];
  const cues = deriveAboutNarrativeLoopRange({
    document: canonical,
    plan,
    source: { type: 'cue-group', members: cueMembers, primary: cueMembers[0] },
    preRollWU: 0.1,
    postRollWU: 0.2,
  });
  assert.equal(cues.valid, true);
  assert.equal(cues.sourceType, 'cue-group');
  assert.ok(cues.startWU < cues.endWU);

  const world = deriveAboutNarrativeLoopRange({
    document: canonical,
    plan,
    source: { type: 'world', sectionId: 'complexity' },
    preRollWU: 0.05,
    postRollWU: 0.1,
  });
  const transition = plan.sections[1].worldState.transition;
  assert.equal(world.valid, true);
  assert.equal(world.startWU, Number((transition.startWU - 0.05).toFixed(6)));
  assert.equal(world.endWU, Number((transition.endWU + 0.1).toFixed(6)));

  const camera = deriveAboutNarrativeLoopRange({
    document: canonical,
    plan,
    source: { type: 'camera-key', sectionId: 'background', keyIndex: 1 },
    cameraKeyWindowWU: 0.25,
    preRollWU: 0.1,
    postRollWU: 0.2,
  });
  assert.equal(camera.valid, true);
  assert.equal(camera.sourceType, 'camera-key');
  assert.ok(Math.abs((camera.endWU - camera.startWU) - 0.8) < 0.000001);

  const noDuration = deriveAboutNarrativeLoopRange({
    document: canonical,
    plan,
    source: { type: 'world', sectionId: 'promise' },
  });
  assert.equal(noDuration.valid, false);
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

test('reduced-motion title selection follows the same travel intervals as the timeline', () => {
  const cues = canonical.sections[0].text.cues;
  const motion = canonical.globals.textMotion;
  const first = getAboutNarrativeCueMotionInterval(cues[0], motion);
  const second = getAboutNarrativeCueMotionInterval(cues[1], motion);
  const gap = first.end + ((second.start - first.end) * 0.5);

  assert.equal(getAboutNarrativeReducedCueIndex(cues, 0.1, motion), 0);
  assert.equal(getAboutNarrativeReducedCueIndex(cues, first.end, motion), 0);
  assert.equal(getAboutNarrativeReducedCueIndex(cues, gap, motion), -1);
  assert.equal(getAboutNarrativeReducedCueIndex(cues, second.start, motion), 1);
});

test('spatial Cues move continuously through their focus point', () => {
  const cue = canonical.sections[1].text.cues[1];
  const motion = canonical.globals.textMotion;
  const before = sampleAboutNarrativeCue(cue, cue.hold - 0.01, motion, false);
  const focus = sampleAboutNarrativeCue(cue, cue.hold, motion, false);
  const after = sampleAboutNarrativeCue(cue, cue.hold + 0.01, motion, false);
  assert.ok(before.y < focus.y && focus.y < after.y);
  assert.ok(before.z < focus.z && focus.z < after.z);
  assert.equal('scale' in before, false);
  assert.equal('scale' in focus, false);
  assert.equal('scale' in after, false);
  assert.equal(motion.perspective, 1600);
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

test('editor previews commit one history entry and cancel back to their starting state', () => {
  const store = createAboutNarrativeEditorStore(canonical);
  const originalExtent = store.getSnapshot().document.sections[0].extentWU;
  const originalTransport = structuredClone(store.getSnapshot().transport);

  assert.equal(store.beginPreview('Resize Intro'), true);
  assert.equal(store.updatePreview((draft) => {
    draft.sections[0].extentWU = 1.45;
  }, { owner: 'timeline', storyWU: 0.3 }), true);
  assert.equal(store.getSnapshot().document.sections[0].extentWU, 1.45);
  assert.equal(store.getSnapshot().transport.storyWU, 0.3);
  assert.equal(store.commitPreview({ type: 'section', sectionId: 'promise' }), true);
  assert.equal(store.getSnapshot().previewState, null);
  store.undo();
  assert.equal(store.getSnapshot().document.sections[0].extentWU, originalExtent);
  assert.equal(store.getSnapshot().history.canUndo, false, 'One Undo should consume the complete preview gesture.');
  store.redo();
  assert.equal(store.getSnapshot().document.sections[0].extentWU, 1.45);

  assert.equal(store.beginPreview('Resize Intro again'), true);
  store.updatePreview((draft) => {
    draft.sections[0].extentWU = 1.2;
  }, { storyWU: 0.1 });
  assert.equal(store.cancelPreview(), true);
  assert.equal(store.getSnapshot().document.sections[0].extentWU, 1.45);
  assert.equal(store.getSnapshot().transport.storyWU, 0.3);
  assert.equal(store.getSnapshot().transport.owner, 'timeline');
  assert.notDeepEqual(store.getSnapshot().transport, originalTransport);
});

test('invalid editor previews keep the last-known-good plan and cannot commit', () => {
  const store = createAboutNarrativeEditorStore(canonical);
  const approvedPlan = store.getSnapshot().compiledPlan;
  store.beginPreview('Invalid resize');
  assert.equal(store.updatePreview((draft) => {
    draft.sections[0].extentWU = 0;
  }), false);
  assert.equal(store.getSnapshot().compiledPlan, approvedPlan);
  assert.ok(store.getSnapshot().diagnostics.some((item) => item.level === 'error'));
  assert.equal(store.commitPreview(), false);
  assert.equal(store.cancelPreview(), true);
  assert.equal(store.getSnapshot().document.sections[0].extentWU, canonical.sections[0].extentWU);
  assert.equal(store.getSnapshot().compiledPlan, approvedPlan);
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
