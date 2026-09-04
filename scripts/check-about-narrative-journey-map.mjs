import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ABOUT_NARRATIVE_FINALE_PHASES,
  ABOUT_NARRATIVE_ARRIVAL_DURATION_MS,
  compileAboutNarrativeComposerPlan,
  createAboutNarrativeComposerContextSample,
  sampleAboutNarrativeComposerContextInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js';
import {
  ABOUT_NARRATIVE_JOURNEY_ROLES,
  compileAboutNarrativeJourneyMap,
  createAboutNarrativeJourneySample,
  resolveAboutNarrativeJourneyMap,
  sampleAboutNarrativeJourneyMapInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeJourneyMap.js';
import {
  loadAboutNarrativePointFieldPersistenceSource,
  preflightAboutNarrativePointFieldRuntimePlans,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';
import {
  createAboutNarrativeTitleFieldSample,
  sampleAboutNarrativeTitleFieldInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';
import { writeAboutSceneLook } from '../react-app/app/src/routes/about-narrative-lab/aboutSceneLook.js';

const ROOT = new URL('../', import.meta.url);
const readSource = (path) => readFile(new URL(path, ROOT), 'utf8');
const ASSET_DIRECTORY = resolve(
  fileURLToPath(ROOT),
  process.env.ABS_ABOUT_ASSET_DIR || 'react-app/app/public/models/about-v2-edited-world',
);
const readAsset = (name) => readFile(resolve(ASSET_DIRECTORY, name), 'utf8').then(JSON.parse);
const [canonical, cameraTrack, assetMeta, sceneSource, timelineSource, stylesheetSource] = await Promise.all([
  readSource('react-app/app/public/config/contents-about.json').then(JSON.parse),
  readAsset('camera-track.json'),
  readAsset('meta.json'),
  readSource('react-app/app/src/routes/about-narrative-lab/aboutBlenderPointScene.js'),
  readSource('react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js'),
  readSource('react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css'),
]);
const loaded = loadAboutNarrativePointFieldPersistenceSource(canonical, {
  preflight: preflightAboutNarrativePointFieldRuntimePlans,
});
assert.equal(loaded.valid, true, loaded.message);
const plan = compileAboutNarrativeComposerPlan(loaded.document, {
  inlineSize: 1440,
  blockSize: 900,
});
assert.equal(plan.valid, true, plan.diagnostics?.map((item) => item.message).join('\n'));
// Read one real bundle. A candidate can be selected explicitly; missing cues
// must fail integration rather than being supplied by a successful fixture.
const journeyMap = resolveAboutNarrativeJourneyMap(plan.journeyMap, cameraTrack);
const anchor = (id) => journeyMap.anchors.find((candidate) => candidate.id === id);
const closeWU = (actual, expected, message) => assert.ok(
  Math.abs(actual - expected) <= 0.000001,
  `${message}: expected ${expected}, got ${actual}`,
);
const closeCameraWU = (actual, expected, message) => assert.ok(
  Math.abs(actual - expected) <= 0.001,
  `${message}: expected ${expected}, got ${actual}`,
);
const STORY_FIELD_IDS = Object.freeze([
  'text-promise-main',
  'text-complexity-idea',
  'text-complexity-conditions',
  'text-background-unit',
  'text-complexity-curiosity',
  'text-complexity-listen',
  'text-discipline-labels',
  'text-disciplines-title',
  'text-life-momentum',
  'text-life-character',
  'text-epilogue-shaping',
  'text-epilogue-thinking',
  'text-epilogue-invitation',
]);
const RESPONSIVE_PROFILES = Object.freeze([
  ['desktop', 1440, 900],
  ['tablet', 900, 1024],
  ['mobile', 390, 844],
]);
const VISIBILITY_BINDINGS = Object.freeze([
  ['about.00', 'opening', 0, 'inciting-question', 0.3],
  ['about.01', 'inciting-question', -0.3, 'portal-entry', 0.3],
  ['about.02', 'portal-entry', -0.3, 'personal-origin', 0.3],
  ['about.03', 'personal-origin', -0.3, 'gate-entry', 0.3],
  ['about.04', 'gate-entry', -0.3, 'method', 0.3],
  ['about.05', 'method', -0.3, 'split-lattice-entry', 0.3],
  ['about.06', 'split-lattice-entry', -0.3, 'terminal-hold', 0.3],
]);
// Blender owns the physical cue position inside each equal section. The
// camera moves through frames 1-901, then holds through frame 1001.
const PHYSICAL_CUES = Object.freeze([
  ['ABS_STAGE_00', 0, 0],
  ['ABS_STAGE_01', 1, 0],
  ['ABS_STAGE_02', 2, 0],
  ['ABS_ROUND_PORTALS_EXIT', 2, 1],
  ['ABS_ROUND_PORTALS_CLEAR', 2, 1],
  ['ABS_PERSONAL_ORIGIN', 3, 0],
  ['ABS_TERRAIN_THESIS', 3, 0.33],
  ['ABS_CANYON_CLEAR', 3, 0.9],
  ['ABS_ROLL_GATE_START', 4, 0],
  ['ABS_ROLL_GATE_END', 4, 1],
  ['ABS_GATE_PASSAGE_CLEAR', 4, 1],
  ['ABS_METHOD_RELEASE', 5, 0],
  ['ABS_LATTICE_APPROACH', 5, 0.5],
  ['ABS_SPLIT_LATTICE_ENTRY', 6, 0],
  ['ABS_FINALE_DECEL', 6, 0.3],
  ['ABS_INVITATION', 6, 0.7],
  ['ABS_CAMERA_LOCK', 7, 0],
]);

function cameraPositionAtProgress(progress) {
  const cursor = Math.min(1, Math.max(0, progress)) * (cameraTrack.samples.length - 1);
  const lower = Math.floor(cursor);
  const upper = Math.min(cameraTrack.samples.length - 1, lower + 1);
  const mix = cursor - lower;
  return cameraTrack.samples[lower].slice(0, 3).map((value, index) => (
    value + (cameraTrack.samples[upper][index] - value) * mix
  ));
}

function cameraTravelBetween(map, startWU, endWU) {
  const sample = createAboutNarrativeJourneySample();
  let previous;
  let distance = 0;
  for (let index = 0; index <= 32; index += 1) {
    sampleAboutNarrativeJourneyMapInto(map, startWU + (endWU - startWU) * index / 32, sample);
    const position = cameraPositionAtProgress(sample.progress);
    if (previous) distance += Math.hypot(...position.map((value, axis) => value - previous[axis]));
    previous = position;
  }
  return distance;
}

function compileResponsivePlan(inlineSize, blockSize, measuredScreens = null) {
  const storyLayoutMeasurements = measuredScreens == null ? null : Object.fromEntries(
    loaded.document.tracks.text.fields
      .filter((field) => field.kind === 'scroll-block')
      .map((field) => [field.id, {
        contentHeightPx: measuredScreens * blockSize,
        viewportHeightPx: blockSize,
      }]),
  );
  return compileAboutNarrativeComposerPlan(loaded.document, {
    inlineSize, blockSize, storyLayoutMeasurements,
  });
}

function resolveExportedWindows(map) {
  const byId = new Map(map.anchors.map((item) => [item.id, item]));
  return assetMeta.models.map((model) => {
    const start = byId.get(model.visibilityStartCue);
    const end = byId.get(model.visibilityEndCue);
    assert.ok(start && end, `${model.key} must bind to real journey anchors.`);
    assert.ok(Number.isFinite(model.visibilityStartOffsetWU));
    assert.ok(Number.isFinite(model.visibilityEndOffsetWU));
    return {
      key: model.key,
      modelId: model.id,
      startWU: Math.max(0, start.cameraStoryWU + model.visibilityStartOffsetWU),
      endWU: end.cameraStoryWU + model.visibilityEndOffsetWU,
      handoffWU: model.visibilityHandoffWU,
    };
  });
}

function isFullyScheduled(window, storyWU) {
  const fullStartWU = window.startWU <= 0 ? 0 : window.startWU + window.handoffWU;
  return storyWU >= fullStartWU - 0.000001
    && storyWU <= window.endWU - window.handoffWU + 0.000001;
}

for (const [profileId, inlineSize, blockSize] of RESPONSIVE_PROFILES) {
  for (const measuredScreens of [null, 0.3, 3]) {
    test(`${profileId} keeps constant physical speed across ${measuredScreens ?? 'estimated'}-screen content`, () => {
      const responsivePlan = compileResponsivePlan(inlineSize, blockSize, measuredScreens);
      assert.equal(responsivePlan.valid, true, JSON.stringify(responsivePlan.diagnostics));
      assert.deepEqual(responsivePlan.textFields.map((field) => field.id), STORY_FIELD_IDS);
      const map = resolveAboutNarrativeJourneyMap(responsivePlan.journeyMap, cameraTrack);
      assert.equal(map.certifiable, true, JSON.stringify(map.diagnostics));
      assert.equal(map.durationWU, responsivePlan.durationWU);
      assert.equal(map.lockStoryWU, map.durationWU, 'No stationary scroll tail before the page end.');
      const byId = new Map(map.anchors.map((item) => [item.id, item]));
      assert.equal(responsivePlan.storyLayout.sections.length, 7);
      assert.equal(new Set(responsivePlan.storyLayout.sections
        .map((section) => section.durationWU)).size, 1);
      // Each semantic camera cue is placed inside the same seven sections as
      // its corresponding text. Copy length cannot move a section boundary.
      for (const role of ABOUT_NARRATIVE_JOURNEY_ROLES) {
        const section = responsivePlan.storyLayout.sections
          .find((item) => item.id === role.stageId);
        closeWU(
          byId.get(role.id).storyWU,
          section.startWU + section.durationWU * role.stageProgress,
          role.id,
        );
      }
      const sample = createAboutNarrativeJourneySample();
      const forward = [];
      for (let index = 0; index <= 2500; index += 1) {
        sampleAboutNarrativeJourneyMapInto(map, map.durationWU * index / 2500, sample);
        assert.equal(sample.locked, index === 2500);
        if (index) assert.ok(sample.progress >= forward[index - 1]);
        forward.push(sample.progress);
      }
      for (let index = 2500; index >= 0; index -= 1) {
        sampleAboutNarrativeJourneyMapInto(map, map.durationWU * index / 2500, sample);
        assert.equal(sample.progress, forward[index], 'Reverse must retrace the exact physical rail.');
      }
      // Measure XYZ travel from the real exported camera, not the new distance
      // metric, across section boundaries, bends and the old deceleration tail.
      const sliceWU = map.durationWU / 80;
      const expectedTravel = map.pathLengthWU / 80;
      for (let index = 0; index < 80; index += 1) {
        const actual = cameraTravelBetween(map, index * sliceWU, (index + 1) * sliceWU);
        assert.ok(Math.abs(actual - expectedTravel) / expectedTravel < 0.002,
          `Unequal camera travel at slice ${index}: ${actual} versus ${expectedTravel}.`);
      }
      const stageTravel = responsivePlan.storyLayout.sections.map((section) => (
        cameraTravelBetween(map, section.startWU, section.endWU)
      ));
      stageTravel.forEach((distance, index) => {
        assert.ok(Math.abs(distance - map.pathLengthWU / 7) / (map.pathLengthWU / 7) < 0.002,
          `Section ${index} must travel one seventh of the camera path.`);
      });
      for (const item of map.anchors) {
        sampleAboutNarrativeJourneyMapInto(map, item.cameraStoryWU, sample);
        const actual = cameraPositionAtProgress(sample.progress);
        const expected = cameraPositionAtProgress(Math.min(item.journeyProgress, map.lockProgress));
        actual.forEach((value, axis) => closeWU(value, expected[axis], `${item.id} physical cue`));
      }
      sampleAboutNarrativeJourneyMapInto(map, map.durationWU + 10, sample);
      assert.equal(sample.progress, map.lockProgress);
      assert.equal(cameraTravelBetween(map, map.durationWU, map.durationWU + 10), 0);
    });
  }
}

test('real model windows follow camera distance and keep every physical passage visible', () => {
  assert.deepEqual(assetMeta.models.map((model) => model.key), VISIBILITY_BINDINGS.map(([key]) => key));
  for (const [key, startCue, startOffset, endCue, endOffset] of VISIBILITY_BINDINGS) {
    const model = assetMeta.models.find((item) => item.key === key);
    assert.deepEqual([model.visibilityStartCue, model.visibilityEndCue], [startCue, endCue]);
    closeWU(model.visibilityStartOffsetWU, startOffset, `${key} visibility start`);
    closeWU(model.visibilityEndOffsetWU, endOffset, `${key} visibility end`);
  }
  for (const [, inlineSize, blockSize] of RESPONSIVE_PROFILES) {
    const responsivePlan = compileResponsivePlan(inlineSize, blockSize);
    const map = resolveAboutNarrativeJourneyMap(responsivePlan.journeyMap, cameraTrack);
    const windows = resolveExportedWindows(map);
    const byId = new Map(map.anchors.map((item) => [item.id, item]));
    windows.forEach((window, index) => {
      assert.ok(window.endWU > window.startWU);
      if (index) {
        // Admit the interest field before its title and the square gates
        // early enough to frame the first opening on approach.
        const adjacentGapWU = window.startWU - windows[index - 1].endWU;
        closeWU(adjacentGapWU, -0.6, 'Adjacent overlap');
      }
      const model = assetMeta.models[index];
      const startWU = byId.get(model.visibilityStartCue).cameraStoryWU;
      const endWU = byId.get(model.visibilityEndCue).cameraStoryWU;
      const passagePositions = [startWU, (startWU + endWU) / 2, endWU];
      for (const position of passagePositions) {
        assert.ok(isFullyScheduled(window, position), `${model.key} vanished during its physical passage.`);
      }
    });
    for (let index = 0; index <= 500; index += 1) {
      const storyWU = map.durationWU * index / 500;
      assert.ok(windows.some((window) => isFullyScheduled(window, storyWU)), `Empty scene at ${storyWU}.`);
      const active = windows.filter((window) => storyWU >= window.startWU && storyWU < window.endWU);
      assert.ok(active.length <= 3, 'At most three adjacent handoff stages may overlap.');
      active.forEach((window, activeIndex) => {
        if (!activeIndex) return;
        assert.equal(window.modelId, active[activeIndex - 1].modelId + 1,
          'Only directly adjacent authored stages may overlap.');
      });
    }
  }
});

test('uneven and duplicate camera samples cannot alter scroll speed', () => {
  const track = { ...cameraTrack, sampleCount: 5, samples: [
    [0, 0, 0, 0, 0, 0, 1], [0, 0, -1, 0, 0, 0, 1],
    [0, 0, -1, 0, 0, 0, 1], [0, 0, -9, 0, 0, 0, 1], [0, 0, -9, 0, 0, 0, 1],
  ] };
  const map = resolveAboutNarrativeJourneyMap(plan.journeyMap, track);
  assert.equal(map.valid, true);
  for (const fraction of [0, 0.1, 0.25, 0.5, 0.9, 1]) {
    const sample = sampleAboutNarrativeJourneyMapInto(map, fraction * map.durationWU);
    const cursor = sample.progress * 4;
    const lower = Math.floor(cursor), upper = Math.min(4, lower + 1);
    const z = track.samples[lower][2]
      + (track.samples[upper][2] - track.samples[lower][2]) * (cursor - lower);
    closeWU(z, -9 * fraction, `Irregular rail at ${fraction}`);
  }
});

test('reduced motion cuts between authored poses while retaining the endpoint', () => {
  const unique = [...new Map(journeyMap.anchors.map((item) => [item.cameraStoryWU, item])).values()];
  for (let index = 0; index < unique.length - 1; index += 1) {
    const start = unique[index].cameraStoryWU, end = unique[index + 1].cameraStoryWU;
    const first = sampleAboutNarrativeJourneyMapInto(journeyMap, start + (end - start) * 0.2, undefined, true);
    const second = sampleAboutNarrativeJourneyMapInto(journeyMap, start + (end - start) * 0.8, undefined, true);
    assert.equal(first.progress, second.progress, 'Reduced motion must not fly between cues.');
    assert.ok(journeyMap.anchors.some((anchor) => anchor.cameraStoryWU === first.sceneStoryWU),
      'Material visibility must use an existing authored camera cue.');
    assert.equal(second.sceneStoryWU, first.sceneStoryWU);
    assert.equal(second.finaleProgress, first.finaleProgress, 'Fog must not change between cuts.');
    assert.equal(second.runwayApproachProgress, first.runwayApproachProgress);
  }
  const end = sampleAboutNarrativeJourneyMapInto(journeyMap, journeyMap.durationWU, undefined, true);
  assert.equal(end.progress, journeyMap.lockProgress);
});

test('reduced motion settles after passages and never steps backwards through reading', () => {
  for (const [exitId, readingId] of [['portal-exit', 'personal-origin'], ['gate-exit', 'lattice-approach']]) {
    const exit = journeyMap.anchors.find((anchor) => anchor.id === exitId);
    const reading = journeyMap.anchors.find((anchor) => anchor.id === readingId);
    const sample = sampleAboutNarrativeJourneyMapInto(journeyMap, exit.cameraStoryWU + 0.001, undefined, true);
    assert.equal(sample.cameraDistanceWU, reading.cameraDistanceWU);
    assert.equal(sample.sceneStoryWU, reading.cameraStoryWU);
  }
  let previous = 0;
  for (let index = 0; index <= 1000; index += 1) {
    const sample = sampleAboutNarrativeJourneyMapInto(journeyMap, journeyMap.durationWU * index / 1000, undefined, true);
    assert.ok(sample.cameraDistanceWU >= previous);
    previous = sample.cameraDistanceWU;
  }
});

test('a stationary camera rail fails before a partial distance map can render', () => {
  const stationary = { ...cameraTrack, sampleCount: 2,
    samples: [[0, 0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0, 1]] };
  const map = resolveAboutNarrativeJourneyMap(plan.journeyMap, stationary);
  assert.equal(map.valid, false);
  assert.ok(map.diagnostics.some((item) => item.code === 'journey-camera-distance-invalid'));
  const sample = sampleAboutNarrativeJourneyMapInto(map, plan.durationWU * 0.5);
  assert.equal(sample.valid, false);
  assert.ok(Number.isFinite(sample.progress));
});

test('the solid-title entry guard also applies before reduced-motion glyphs', () => {
  assert.match(timelineSource, /if \(storyWU < Number\(field\.startWU\)\) return false;/);
  assert.match(timelineSource, /const visible = solidTitles \? fieldActive : !reducedMotion \|\| fieldActive;/);
  for (const [inlineSize, blockSize] of [[1440, 900], [900, 1024], [390, 844]]) {
    const reduced = compileAboutNarrativeComposerPlan(loaded.document, {
      inlineSize, blockSize, prefersReducedMotion: true,
    });
    assert.equal(reduced.valid, true);
    assert.equal(reduced.reducedMotion, true);
    const map = resolveAboutNarrativeJourneyMap(reduced.journeyMap, cameraTrack);
    assert.equal(map.certifiable, true);
    assert.deepEqual(reduced.textFields.map((field) => field.id), STORY_FIELD_IDS);
    for (const title of reduced.textFields.filter((field) => field.kind === 'title')) {
      const sample = createAboutNarrativeTitleFieldSample();
      sampleAboutNarrativeTitleFieldInto(
        title, title.startWU, reduced.globals.textMotion, true, sample,
      );
      assert.equal(sample.opacity, 1);
      assert.equal(sample.blur, 0);
      assert.equal(sample.y, 0);
      assert.equal(sample.z, 0);
    }
  }
});

test('missing passage cues retain a monotonic degraded runtime but cannot certify', () => {
  for (const cueName of [
    'ABS_ROUND_PORTALS_EXIT', 'ABS_ROUND_PORTALS_CLEAR', 'ABS_PERSONAL_ORIGIN',
    'ABS_TERRAIN_THESIS', 'ABS_CANYON_CLEAR', 'ABS_GATE_PASSAGE_CLEAR',
    'ABS_METHOD_RELEASE', 'ABS_LATTICE_APPROACH',
  ]) {
    assert.ok(cameraTrack.journeyCues.some((cue) => cue.name === cueName),
      `${cueName} must exist in the real bundle before testing its removal.`);
    const incompleteTrack = structuredClone(cameraTrack);
    incompleteTrack.journeyCues = incompleteTrack.journeyCues.filter((cue) => cue.name !== cueName);
    const map = resolveAboutNarrativeJourneyMap(plan.journeyMap, incompleteTrack);
    assert.equal(map.certifiable, false, cueName);
    assert.ok(map.diagnostics.some((item) => item.path === `cameraTrack.journeyCues.${cueName}`));
    if (!map.valid) {
      assert.ok(map.diagnostics.some((item) => item.code === 'journey-camera-order'),
        `${cueName} can invalidate an obsolete fallback only through strict camera-order validation.`);
    }
    const sample = createAboutNarrativeJourneySample();
    let previous = 0;
    for (let index = 0; index <= 250; index += 1) {
      sampleAboutNarrativeJourneyMapInto(map, map.durationWU * index / 250, sample);
      assert.ok(sample.progress >= previous && sample.progress <= 1,
        `${cueName} removal must retain bounded forward progress.`);
      previous = sample.progress;
    }
  }
  const noCueTrack = structuredClone(cameraTrack);
  noCueTrack.journeyCues = [];
  const fallback = resolveAboutNarrativeJourneyMap(plan.journeyMap, noCueTrack);
  assert.equal(fallback.valid, true);
  assert.equal(fallback.certifiable, false);
  for (const role of ABOUT_NARRATIVE_JOURNEY_ROLES) {
    closeWU(
      fallback.anchors.find((item) => item.id === role.id).journeyProgress,
      role.fallbackProgress,
      `${role.id} degraded fallback`,
    );
  }
  const currentExport = resolveAboutNarrativeJourneyMap(plan.journeyMap, cameraTrack);
  assert.equal(currentExport.valid, true, JSON.stringify(currentExport.diagnostics));
});

test('the selected real camera bundle preserves equal physical sections and source hashes', async () => {
  const cameraBytes = await readFile(resolve(ASSET_DIRECTORY, 'camera-track.json'));
  assert.equal(createHash('sha256').update(cameraBytes).digest('hex'),
    assetMeta.files.cameraTrack.sha256, 'Camera bytes and metadata must come from one export.');
  const sourceBytes = await readFile(resolve(fileURLToPath(ROOT), assetMeta.source.file));
  assert.equal(createHash('sha256').update(sourceBytes).digest('hex'),
    assetMeta.source.sha256, 'The export metadata must identify the exact canonical Blender source.');
  assert.equal(cameraTrack.samples.length, cameraTrack.sampleCount);
  assert.equal(cameraTrack.frameEnd - cameraTrack.frameStart + 1, cameraTrack.sampleCount);
  const frameSpan = cameraTrack.frameEnd - cameraTrack.frameStart;
  const cameraLock = cameraTrack.journeyCues.find((item) => item.name === 'ABS_CAMERA_LOCK');
  const travelFrameSpan = cameraLock.frame - cameraTrack.frameStart;
  for (const [name, stageIndex, stageProgress] of PHYSICAL_CUES) {
    const cue = cameraTrack.journeyCues.find((item) => item.name === name);
    assert.ok(cue, `${name} must exist in the real selected bundle; no supplied success cues.`);
    const expectedFrame = Math.round(
      cameraTrack.frameStart + travelFrameSpan * (stageIndex + stageProgress) / 7,
    );
    assert.equal(cue.frame, expectedFrame, `${name} must retain its equal-section position.`);
    closeWU(cue.progress, (cue.frame - cameraTrack.frameStart) / frameSpan, `${name} frame quantization`);
    const resolved = journeyMap.anchors.filter((item) => item.cueName === name);
    assert.ok(resolved.length > 0, `${name} must actually drive a story anchor.`);
    for (const item of resolved) closeWU(item.journeyProgress, cue.progress, `${item.id} exported cue`);
  }
});

test('the real selected export certifies the canonical thirteen-field story without supplied cues', () => {
  assert.deepEqual(canonical.tracks.text.fields.map((field) => field.id), STORY_FIELD_IDS);
  assert.equal(journeyMap.valid, true, journeyMap.diagnostics?.map((item) => item.message).join('\n'));
  assert.equal(journeyMap.certifiable, true,
    `The real bundle at ${ASSET_DIRECTORY} is not ready: ${JSON.stringify(journeyMap.diagnostics)}`);
  assert.ok(journeyMap.anchors.every((item) => item.cueSource !== 'fallback'));
  assert.equal(
    journeyMap.diagnostics.some((item) => item.code === 'journey-required-camera-cue-missing'),
    false,
  );
  assert.deepEqual(
    journeyMap.anchors.map((item) => item.id),
    [
      'opening',
      'inciting-question',
      'portal-entry',
      'portal-exit',
      'portal-release',
      'personal-origin',
      'earned-thesis',
      'landscape-release',
      'gate-entry',
      'gate-exit',
      'gate-release',
      'method',
      'lattice-approach',
      'split-lattice-entry',
      'finale-deceleration',
      'invitation',
      'camera-lock',
      'terminal-hold',
    ],
  );
  for (let index = 1; index < journeyMap.anchors.length; index += 1) {
    assert.ok(journeyMap.anchors[index].storyWU >= journeyMap.anchors[index - 1].storyWU);
    assert.ok(
      journeyMap.anchors[index].journeyProgress
        >= journeyMap.anchors[index - 1].journeyProgress,
    );
  }
});

test('the real semantic reading cues do not need physical stage markers', () => {
  const semanticOnlyTrack = structuredClone(cameraTrack);
  semanticOnlyTrack.journeyCues = semanticOnlyTrack.journeyCues
    .filter((cue) => cue.name !== 'ABS_STAGE_03' && cue.name !== 'ABS_STAGE_05');
  const semanticMap = resolveAboutNarrativeJourneyMap(plan.journeyMap, semanticOnlyTrack);
  assert.equal(semanticMap.certifiable, true);
  for (const [roleId, cueName] of [
    ['earned-thesis', 'ABS_TERRAIN_THESIS'],
    ['split-lattice-entry', 'ABS_SPLIT_LATTICE_ENTRY'],
  ]) {
    assert.equal(semanticMap.anchors.find((item) => item.id === roleId).journeyProgress,
      cameraTrack.journeyCues.find((cue) => cue.name === cueName).progress);
  }
});

test('physical set boundaries cannot substitute for missing required reading cues', () => {
  for (const [roleId, requiredCue, physicalCue] of [
    ['earned-thesis', 'ABS_TERRAIN_THESIS', 'ABS_STAGE_03'],
    ['split-lattice-entry', 'ABS_SPLIT_LATTICE_ENTRY', 'ABS_STAGE_06'],
  ]) {
    assert.ok(cameraTrack.journeyCues.some((cue) => cue.name === requiredCue));
    assert.ok(cameraTrack.journeyCues.some((cue) => cue.name === physicalCue));
    const incompleteTrack = structuredClone(cameraTrack);
    incompleteTrack.journeyCues = incompleteTrack.journeyCues.filter((cue) => cue.name !== requiredCue);
    const incompleteMap = resolveAboutNarrativeJourneyMap(plan.journeyMap, incompleteTrack);
    assert.equal(incompleteMap.certifiable, false, 'A physical marker must not certify a missing semantic cue.');
    const reading = incompleteMap.anchors.find((item) => item.id === roleId);
    assert.equal(reading.cueName, '');
    assert.equal(reading.cueSource, 'fallback');
    const role = ABOUT_NARRATIVE_JOURNEY_ROLES.find((item) => item.id === roleId);
    closeWU(reading.journeyProgress, role.fallbackProgress, `${roleId} bounded fallback`);
    assert.notEqual(reading.journeyProgress,
      cameraTrack.journeyCues.find((cue) => cue.name === physicalCue).progress);
    assert.ok(incompleteMap.diagnostics.some((item) => (
      item.code === 'journey-required-camera-cue-missing'
        && item.path === `cameraTrack.journeyCues.${requiredCue}`
    )));
    const sample = createAboutNarrativeJourneySample();
    let previous = 0;
    for (let index = 0; index <= 100; index += 1) {
      sampleAboutNarrativeJourneyMapInto(
        incompleteMap,
        incompleteMap.durationWU * index / 100,
        sample,
      );
      assert.ok(sample.progress >= previous && sample.progress <= 1,
        'A missing semantic cue must retain bounded monotonic diagnostic playback.');
      previous = sample.progress;
    }
  }
});

test('drafts missing an equal section remain bounded but cannot render', () => {
  const legacyLayout = {
    ...plan.storyLayout,
    sections: plan.storyLayout.sections.filter((section) => section.id !== 'about.06'),
  };
  const legacyMap = compileAboutNarrativeJourneyMap(legacyLayout);
  assert.equal(legacyMap.valid, false);
  assert.ok(legacyMap.diagnostics.length > 0);
  assert.ok(legacyMap.diagnostics.every((item) => item.path === 'storyLayout.sections.about.06'));
  assert.ok(legacyMap.diagnostics.every((item) => item.level === 'warning'));
  const sample = sampleAboutNarrativeJourneyMapInto(
    resolveAboutNarrativeJourneyMap(legacyMap, cameraTrack),
    legacyLayout.durationWU / 2,
    createAboutNarrativeJourneySample(),
  );
  assert.equal(sample.valid, false);
  assert.ok(sample.progress > 0 && sample.progress < 1);
});

test('the camera travels through the invitation at the same rate and stops only at the page end', () => {
  const sample = createAboutNarrativeJourneySample();
  const invitation = anchor('invitation');
  const windowWU = 0.1;
  const middle = cameraTravelBetween(journeyMap, journeyMap.durationWU / 2, journeyMap.durationWU / 2 + windowWU);
  const last = cameraTravelBetween(journeyMap, journeyMap.durationWU - windowWU, journeyMap.durationWU);
  assert.ok(Math.abs(last - middle) / middle < 0.002, 'No independent finale deceleration.');
  for (const fraction of [0, 0.1, 0.25, 0.5, 0.9]) {
    sampleAboutNarrativeJourneyMapInto(journeyMap,
      invitation.storyWU + (journeyMap.durationWU - invitation.storyWU) * fraction, sample);
    assert.equal(sample.atInvitation, true);
    assert.equal(sample.locked, false, 'Native scroll still has distance left.');
    assert.ok(sample.progress < journeyMap.lockProgress);
  }
  sampleAboutNarrativeJourneyMapInto(journeyMap, journeyMap.durationWU, sample);
  assert.equal(sample.locked, true);
  assert.equal(sample.progress, journeyMap.lockProgress);
  const lastSample = cameraTrack.samples.at(-1);
  cameraPositionAtProgress(sample.progress).forEach((value, index) => closeCameraWU(value, lastSample[index], 'Saved endpoint'));
});

test('runtime camera progress follows the journey map and V2 has no post-page continuation', () => {
  assert.match(sceneSource, /sampleAboutNarrativeJourneyMapInto\(/);
  assert.match(sceneSource, /frame\?\.reducedMotion \|\| cameraLocked/);
  assert.match(sceneSource, /writeAboutSceneLook\(controls, frame, entranceScale, journeySample\)/);
  assert.match(timelineSource, /if \(!finaleContinuation \|\| !plan\) return null;/);
  assert.doesNotMatch(timelineSource, /V2 continues its outgoing material current/);
});

test('the camera lock preserves continuous ambient motion without changing its phase or gain', () => {
  const frame = {
    storyWU: plan.durationWU,
    durationWU: plan.durationWU,
    reducedMotion: false,
    globals: plan.globals,
    simulation: { visibility: 1 },
    world: {
      to: {
        shapeParameters: {
          density: 1,
          structureAmbientAmount: 0.15,
          structureAmbientSpeed: 0.44,
          structureAmbientScaleWU: 20,
          structureMotionCoherence: 0.72,
          finaleMotionGain: 1.5,
          finaleFogStartWU: 220,
          finaleFogEndWU: 560,
        },
      },
    },
  };
  const controls = writeAboutSceneLook({}, frame, 1, {
    valid: true,
    finaleProgress: 1,
    locked: true,
  });
  assert.equal(controls.finaleProgress, 1);
  closeWU(controls.motionAmountWU, 0.225, 'Finale motion remains active');
  assert.equal(controls.motionSpeed, 0.44);
  for (const finaleProgress of [0, 0.25, 0.75, 1]) {
    const beforeLock = writeAboutSceneLook({}, frame, 1, { valid: true, finaleProgress, locked: false });
    const afterLock = writeAboutSceneLook({}, frame, 1, { valid: true, finaleProgress, locked: true });
    assert.deepEqual(afterLock, beforeLock, 'Camera lock must not snap the material back into its resting pose.');
  }
  const reduced = writeAboutSceneLook({}, { ...frame, reducedMotion: true }, 1, {
    valid: true, finaleProgress: 1, locked: true,
  });
  assert.equal(reduced.motionAmountWU, 0, 'Reduced Motion keeps a static final scene.');
});

test('the lattice fog is prepared before the first closing title', () => {
  const frame = {
    storyWU: anchor('split-lattice-entry').storyWU,
    durationWU: plan.durationWU,
    globals: { camera: { distanceFogStartWU: 14, distanceFogEndWU: 70 } },
    world: { to: { shapeParameters: { finaleFogStartWU: 220, finaleFogEndWU: 560 } } },
  };
  const journey = { valid: true, finaleProgress: 0, runwayProgress: 0, runwayApproachProgress: 0 };
  const before = writeAboutSceneLook({}, frame, 1, journey);
  const threshold = writeAboutSceneLook({}, frame, 1, { ...journey, runwayApproachProgress: 1 });
  assert.equal(before.fogProgress, 0);
  assert.equal(before.fogEndWU, 70);
  assert.equal(threshold.fogProgress, 0.35);
  assert.equal(threshold.fogEndWU, 241.5);
  assert.equal(threshold.finaleProgress, 0);
  assert.equal(threshold.runwayProgress, 0);
});

test('invitation phases use elapsed milliseconds inside the local 900ms budget', () => {
  const field = plan.textFields.find((candidate) => candidate.id === 'text-epilogue-invitation');
  const storyWU = field.startWU + (field.endWU - field.startWU) * 0.1;
  assert.equal(ABOUT_NARRATIVE_ARRIVAL_DURATION_MS, 900);
  for (const [key, phase] of Object.entries(ABOUT_NARRATIVE_FINALE_PHASES)) {
    const property = key === 'actions' ? 'actionOpacity' : key === 'rule' ? 'ruleScale' : `${key}Opacity`;
    assert.ok(phase.end <= ABOUT_NARRATIVE_ARRIVAL_DURATION_MS);
    const sample = createAboutNarrativeComposerContextSample();
    sampleAboutNarrativeComposerContextInto(field, storyWU, false, sample, { timestampMs: 0 });
    sampleAboutNarrativeComposerContextInto(field, storyWU, false, sample, { timestampMs: phase.start });
    assert.equal(sample[property], 0, `${key} begins at its elapsed start.`);
    sampleAboutNarrativeComposerContextInto(field, storyWU, false, sample, { timestampMs: phase.end });
    assert.equal(sample[property], 1, `${key} finishes without another scroll gesture.`);
    assert.equal(sample.y, 0, 'Readable contact content must already occupy its final position.');
  }
});

for (const fraction of [0.1, 0.25, 0.5]) {
  test(`stopping at ${fraction * 100}% of the invitation completes every action`, () => {
    const field = plan.textFields.find((candidate) => candidate.id === 'text-epilogue-invitation');
    const storyWU = field.startWU + (field.endWU - field.startWU) * fraction;
    const sample = createAboutNarrativeComposerContextSample();
    sampleAboutNarrativeComposerContextInto(field, storyWU, false, sample, { timestampMs: 1000 });
    assert.equal(sample.actionOpacity, 0);
    sampleAboutNarrativeComposerContextInto(field, storyWU, false, sample, { timestampMs: 1900 });
    assert.equal(sample.complete, true);
    for (const key of ['titleOpacity', 'ruleScale', 'descriptionOpacity', 'actionOpacity']) {
      assert.equal(sample[key], 1, key);
    }
  });
}

test('arrival does not require an early camera lock, resets on reverse, and suspends while hidden', () => {
  const field = plan.textFields.find((candidate) => candidate.id === 'text-epilogue-invitation');
  const storyWU = field.startWU + 0.1;
  const sample = createAboutNarrativeComposerContextSample();
  const update = (time, story = storyWU, options = {}) => sampleAboutNarrativeComposerContextInto(
    field, story, false, sample, { timestampMs: time, ...options },
  );
  update(4000, storyWU, { cameraLocked: false });
  assert.equal(sample.visible, true);
  assert.equal(sample.actionOpacity, 0);
  update(4300);
  assert.equal(sample.elapsedMs, 300);
  update(4400, storyWU, { visible: false });
  update(100000, storyWU, { visible: false });
  update(100010);
  assert.equal(sample.elapsedMs, 300, 'Hidden time must not advance arrival.');
  update(100610);
  assert.equal(sample.complete, true);
  update(100700, field.startWU - 0.01);
  assert.equal(sample.visible, false);
  assert.equal(sample.actionOpacity, 0);
  update(101000);
  assert.equal(sample.elapsedMs, 0, 'Re-entry starts a fresh local sequence.');
  update(101900);
  assert.equal(sample.complete, true);
  update(1000000);
  assert.equal(sample.elapsedMs, 900, 'The arrival clock remains bounded.');
});

test('direct end and reduced motion expose a complete invitation immediately', () => {
  const field = plan.textFields.find((candidate) => candidate.id === 'text-epilogue-invitation');
  for (const [storyWU, reduced] of [[field.endWU, false], [field.startWU + 0.01, true]]) {
    const sample = createAboutNarrativeComposerContextSample();
    sampleAboutNarrativeComposerContextInto(field, storyWU, reduced, sample);
    assert.equal(sample.visible, true);
    assert.equal(sample.complete, true);
    assert.equal(sample.titleOpacity, 1);
    assert.equal(sample.ruleScale, 1);
    assert.equal(sample.descriptionOpacity, 1);
    assert.equal(sample.actionOpacity, 1);
    assert.equal(sample.y, 0);
  }
});
