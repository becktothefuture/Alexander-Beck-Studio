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
  'text-selected-clients',
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
  ['about.00', 'opening', 0, 'portal-entry', 0.3],
  ['about.02', 'portal-entry', -0.9, 'personal-origin', 0.3],
  ['about.03', 'personal-origin', -0.3, 'gate-entry', 0.3],
  ['about.04', 'gate-entry', -0.3, 'split-lattice-entry', 0.3],
  ['about.05', 'method', -0.3, 'terminal-hold', 0.9],
  ['about.06', 'method', -0.3, 'terminal-hold', 0.3],
]);
// Blender owns this physical order. The square passage crosses the about.04
// titles and about.05 prose before its exit coincides with the finale entry.
const PHYSICAL_CUES = Object.freeze([
  'ABS_STAGE_00',
  'ABS_STAGE_01',
  'ABS_STAGE_02',
  'ABS_ROUND_PORTALS_EXIT',
  'ABS_ROUND_PORTALS_CLEAR',
  'ABS_PERSONAL_ORIGIN',
  'ABS_TERRAIN_THESIS',
  'ABS_CANYON_CLEAR',
  'ABS_ROLL_GATE_START',
  'ABS_METHOD_RELEASE',
  'ABS_LATTICE_APPROACH',
  'ABS_ROLL_GATE_END',
  'ABS_GATE_PASSAGE_CLEAR',
  'ABS_SPLIT_LATTICE_ENTRY',
  'ABS_FINALE_DECEL',
  'ABS_INVITATION',
  'ABS_CAMERA_LOCK',
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
  const steps = Math.max(32, Math.ceil((endWU - startWU) / map.durationWU * 2048));
  for (let index = 0; index <= steps; index += 1) {
    sampleAboutNarrativeJourneyMapInto(map, startWU + (endWU - startWU) * index / steps, sample);
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
  // Content-paced chapters map their semantic boundaries to the same Blender
  // cues even when responsive measurement changes each chapter's duration.
  for (const measuredScreens of [null, 0.3, 1.8]) {
    test(`${profileId} maps ${measuredScreens ?? 'estimated'}-screen content to Blender cues`, () => {
      const responsivePlan = compileResponsivePlan(inlineSize, blockSize, measuredScreens);
      assert.equal(responsivePlan.valid, true, JSON.stringify(responsivePlan.diagnostics));
      assert.deepEqual(responsivePlan.textFields.map((field) => field.id), STORY_FIELD_IDS);
      const map = resolveAboutNarrativeJourneyMap(responsivePlan.journeyMap, cameraTrack);
      assert.equal(map.valid, true, JSON.stringify(map.diagnostics));
      assert.equal(map.durationWU, responsivePlan.durationWU);
      assert.equal(map.lockStoryWU, map.durationWU, 'No stationary scroll tail before the page end.');
      const byId = new Map(map.anchors.map((item) => [item.id, item]));
      assert.equal(responsivePlan.storyLayout.sections.length, 7);
      const breathingGap = responsivePlan.storyLayout.gaps
        .find((gap) => gap.fromFieldId === 'text-complexity-conditions');
      closeWU(
        responsivePlan.resolver.scrollWUFromStoryWU(breathingGap.endWU)
          - responsivePlan.resolver.scrollWUFromStoryWU(breathingGap.startWU),
        1.32,
        'Second title to background prose breathing gap',
      );
      const methodGap = responsivePlan.storyLayout.gaps
        .find((gap) => gap.fromFieldId === 'text-life-momentum');
      closeWU(
        responsivePlan.resolver.scrollWUFromStoryWU(methodGap.endWU)
          - responsivePlan.resolver.scrollWUFromStoryWU(methodGap.startWU),
        1.32,
        'Second working-method title to prose breathing gap',
      );
      const roundExitGap = responsivePlan.storyLayout.gaps
        .find((gap) => gap.fromFieldId === 'text-complexity-listen');
      closeWU(
        responsivePlan.resolver.scrollWUFromStoryWU(roundExitGap.endWU)
          - responsivePlan.resolver.scrollWUFromStoryWU(roundExitGap.startWU),
        1.32,
        'Round-tunnel titles to terrain prose breathing gap',
      );
      assert.ok(responsivePlan.storyLayout.gaps
        .filter((gap) => gap !== breathingGap && gap !== methodGap && gap !== roundExitGap)
        .every((gap) => gap.durationWU === 0));
      // Each semantic camera cue is placed inside the same seven sections as
      // its corresponding text. Content now determines those chapter boundaries.
      for (const role of ABOUT_NARRATIVE_JOURNEY_ROLES) {
        const section = responsivePlan.storyLayout.sections
          .find((item) => item.id === role.stageId);
        closeWU(
          byId.get(role.id).storyWU,
          section.sceneStartWU + (section.sceneEndWU - section.sceneStartWU) * role.stageProgress,
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
      for (const item of map.anchors) {
        sampleAboutNarrativeJourneyMapInto(map, item.cameraStoryWU, sample);
        const actual = cameraPositionAtProgress(sample.progress);
        const expected = cameraPositionAtProgress(Math.min(item.journeyProgress, map.lockProgress));
        actual.forEach((value, axis) => closeWU(value, expected[axis], `${item.id} physical cue`));
        closeWU(sample.sceneStoryWU, item.storyWU, `${item.id} visibility clock`);
      }
      for (let index = 1; index < map.interpolationAnchors.length; index += 1) {
        const from = map.interpolationAnchors[index - 1];
        const to = map.interpolationAnchors[index];
        const middleWU = (from.storyWU + to.storyWU) * 0.5;
        sampleAboutNarrativeJourneyMapInto(map, middleWU, sample);
        assert.ok(sample.cameraDistanceWU >= from.cameraDistanceWU - 0.000001
          && sample.cameraDistanceWU <= to.cameraDistanceWU + 0.000001,
        `${from.id} to ${to.id}: easing must stay inside the authored interval.`);
      }
      sampleAboutNarrativeJourneyMapInto(map, map.durationWU + 10, sample);
      assert.equal(sample.progress, map.lockProgress);
      assert.equal(cameraTravelBetween(map, map.durationWU, map.durationWU + 10), 0);
    });
  }
}

test('real model windows follow semantic passages and preserve the finale composition', () => {
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
    const windowByKey = new Map(windows.map((window) => [window.key, window]));
    windows.forEach((window, index) => {
      assert.ok(window.endWU > window.startWU);
      const passagePositions = [
        window.startWU + window.handoffWU,
        (window.startWU + window.endWU) / 2,
        window.endWU - window.handoffWU,
      ];
      for (const position of passagePositions) {
        assert.ok(isFullyScheduled(window, position), `${window.key} vanished during its visibility window.`);
      }
    });
    const gates = windowByKey.get('about.04');
    for (const cueId of ['gate-entry', 'method', 'lattice-approach', 'gate-exit']) {
      assert.ok(isFullyScheduled(gates, byId.get(cueId).storyWU),
        `The square passage must remain visible at ${cueId}.`);
    }
    assert.equal(windowByKey.has('about.01'), false, 'The removed cluster has no render window.');
    assert.ok(isFullyScheduled(windowByKey.get('about.00'), byId.get('inciting-question').storyWU),
      'The opening field continues behind the background and experience reading stage.');
    closeWU(windowByKey.get('about.05').startWU,
      byId.get('method').storyWU - 0.3, 'about.05 restored platform approach');
    closeWU(windowByKey.get('about.06').startWU,
      byId.get('method').storyWU - 0.3, 'about.06 restored bust reveal');
    assert.ok(windowByKey.get('about.06').endWU <= windowByKey.get('about.05').endWU);
    for (let index = 0; index <= 500; index += 1) {
      const storyWU = map.durationWU * index / 500;
      assert.ok(windows.some((window) => isFullyScheduled(window, storyWU)), `Empty scene at ${storyWU}.`);
      const active = windows.filter((window) => storyWU >= window.startWU && storyWU < window.endWU);
      assert.ok(active.length <= 3, 'The restored finale may combine the platform and bust with outgoing gates.');
    }
  }
});

test('uneven and duplicate camera samples retain monotone semantic mapping', () => {
  const track = { ...cameraTrack, sampleCount: 5, samples: [
    [0, 0, 0, 0, 0, 0, 1], [0, 0, -1, 0, 0, 0, 1],
    [0, 0, -1, 0, 0, 0, 1], [0, 0, -9, 0, 0, 0, 1], [0, 0, -9, 0, 0, 0, 1],
  ] };
  const map = resolveAboutNarrativeJourneyMap(plan.journeyMap, track);
  assert.equal(map.valid, true);
  for (let index = 1; index < map.interpolationAnchors.length; index += 1) {
    const from = map.interpolationAnchors[index - 1];
    const to = map.interpolationAnchors[index];
    const sample = sampleAboutNarrativeJourneyMapInto(
      map,
      (from.storyWU + to.storyWU) * 0.5,
    );
    assert.ok(sample.cameraDistanceWU >= from.cameraDistanceWU - 0.000001
      && sample.cameraDistanceWU <= to.cameraDistanceWU + 0.000001,
    `Irregular rail ${from.id} to ${to.id} must not overshoot.`);
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
  for (const [exitId, readingId] of [['portal-exit', 'personal-origin'], ['gate-entry', 'method']]) {
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

test('the shared title entry guard applies in reduced motion', () => {
  assert.match(timelineSource, /if \(storyWU < Number\(field\.startWU\)\) return false;/);
  assert.match(timelineSource, /const visible = fieldActive;/);
  for (const [inlineSize, blockSize] of [[1440, 900], [900, 1024], [390, 844]]) {
    const reduced = compileAboutNarrativeComposerPlan(loaded.document, {
      inlineSize, blockSize, prefersReducedMotion: true,
    });
    assert.equal(reduced.valid, true);
    assert.equal(reduced.reducedMotion, true);
    const map = resolveAboutNarrativeJourneyMap(reduced.journeyMap, cameraTrack);
    assert.equal(map.valid, true);
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

test('missing passage cues invalidate the Blender-authored journey without inventing positions', () => {
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
    assert.equal(map.valid, false, cueName);
    assert.ok(map.diagnostics.some((item) => item.path === `cameraTrack.journeyCues.${cueName}`));
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
  const incomplete = resolveAboutNarrativeJourneyMap(plan.journeyMap, noCueTrack);
  assert.equal(incomplete.valid, false);
  for (const role of ABOUT_NARRATIVE_JOURNEY_ROLES) {
    assert.equal(incomplete.anchors.find((item) => item.id === role.id).journeyProgress, null);
  }
  const currentExport = resolveAboutNarrativeJourneyMap(plan.journeyMap, cameraTrack);
  assert.equal(currentExport.valid, true, JSON.stringify(currentExport.diagnostics));
});

test('the selected real camera bundle preserves the authored physical cue order and source hashes', async () => {
  const cameraBytes = await readFile(resolve(ASSET_DIRECTORY, 'camera-track.json'));
  assert.equal(createHash('sha256').update(cameraBytes).digest('hex'),
    assetMeta.files.cameraTrack.sha256, 'Camera bytes and metadata must come from one export.');
  const sourceBytes = await readFile(resolve(fileURLToPath(ROOT), assetMeta.source.file));
  assert.equal(createHash('sha256').update(sourceBytes).digest('hex'),
    assetMeta.source.sha256, 'The export metadata must identify the exact canonical Blender source.');
  assert.equal(cameraTrack.samples.length, cameraTrack.sampleCount);
  assert.equal(cameraTrack.frameEnd - cameraTrack.frameStart + 1, cameraTrack.sampleCount);
  const frameSpan = cameraTrack.frameEnd - cameraTrack.frameStart;
  let previousFrame = cameraTrack.frameStart;
  for (const name of PHYSICAL_CUES) {
    const cue = cameraTrack.journeyCues.find((item) => item.name === name);
    assert.ok(cue, `${name} must exist in the real selected bundle; no supplied success cues.`);
    assert.ok(cue.frame >= previousFrame, `${name} must preserve the intended physical order.`);
    previousFrame = cue.frame;
    closeWU(cue.progress, (cue.frame - cameraTrack.frameStart) / frameSpan, `${name} frame quantization`);
    const resolved = journeyMap.anchors.filter((item) => item.cueName === name);
    assert.ok(resolved.length > 0, `${name} must actually drive a story anchor.`);
    for (const item of resolved) closeWU(item.journeyProgress, cue.progress, `${item.id} exported cue`);
  }
});

test('the real selected export drives the canonical story from Blender cues', () => {
  assert.deepEqual(canonical.tracks.text.fields.map((field) => field.id), STORY_FIELD_IDS);
  assert.equal(journeyMap.valid, true,
    `The real bundle at ${ASSET_DIRECTORY} is not ready: ${JSON.stringify(journeyMap.diagnostics)}`);
  assert.equal(
    journeyMap.diagnostics.some((item) => item.code === 'journey-camera-cue-missing'),
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
      'method',
      'lattice-approach',
      'gate-exit',
      'gate-release',
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
  assert.equal(semanticMap.valid, true);
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
    assert.equal(incompleteMap.valid, false, 'A physical marker must not replace a missing semantic cue.');
    const reading = incompleteMap.anchors.find((item) => item.id === roleId);
    assert.equal(reading.cueName, requiredCue);
    assert.equal(reading.journeyProgress, null);
    assert.ok(incompleteMap.diagnostics.some((item) => (
      item.code === 'journey-camera-cue-missing'
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

test('the camera travels through the invitation and stops only at the page end', () => {
  const sample = createAboutNarrativeJourneySample();
  const invitation = anchor('invitation');
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
  assert.match(sceneSource, /cameraMotionSource: 'shared-scroll-sample'/);
  assert.match(sceneSource, /camera\.position\.copy\(cameraAuthoredPosition\)/);
  assert.doesNotMatch(sceneSource, /steadycamController|pointerPanController/);
  assert.match(sceneSource,
    /writeAboutSceneLook\(controls, frame, entranceScale, journeySample(?:, authoredCameraFog)?\)/);
  assert.match(timelineSource, /if \(!finaleContinuation \|\| !plan\) return null;/);
  assert.doesNotMatch(timelineSource, /V2 continues its outgoing material current/);
});

test('the camera lock preserves continuous ambient motion without changing its phase or gain', () => {
  const frame = {
    storyWU: plan.durationWU,
    durationWU: plan.durationWU,
    reducedMotion: false,
    globals: { ...plan.globals, sceneMotion: { masterIntensity: 1.5, masterSpeed: 2 } },
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
  closeWU(controls.motionAmountWU, 0.075, 'Shared ambient intensity remains active at the endpoint');
  assert.equal(controls.motionSpeed, 0.72);
  assert.equal(controls.masterMotionIntensity, 1.5);
  assert.equal(controls.masterMotionSpeed, 2);
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

test('fog retains one owner throughout reading, passages, and the finale', () => {
  const authoredFog = { startWU: 30, endWU: 240, curve: 1.6 };
  const camera = { distanceFogOverride: 0, distanceFogStartWU: 14, distanceFogEndWU: 70, distanceFogCurve: 1.2 };
  const frame = {
    storyWU: anchor('split-lattice-entry').storyWU,
    durationWU: plan.durationWU,
    globals: { camera },
    world: { to: { shapeParameters: { finaleFogStartWU: 220, finaleFogEndWU: 560 } } },
  };
  for (const progress of [0, 0.25, 0.5, 1]) {
    const journey = { valid: true, finaleProgress: progress, runwayProgress: progress, runwayApproachProgress: progress };
    camera.distanceFogOverride = 0;
    const inherited = writeAboutSceneLook({}, frame, 1, journey, authoredFog);
    assert.deepEqual([inherited.fogSource, inherited.fogStartWU, inherited.fogEndWU, inherited.fogCurve],
      ['blender', 30, 240, 1.6]);
    camera.distanceFogOverride = 1;
    const overridden = writeAboutSceneLook({}, frame, 1, journey, authoredFog);
    assert.deepEqual([overridden.fogSource, overridden.fogStartWU, overridden.fogEndWU, overridden.fogCurve],
      ['website', 14, 70, 1.2]);
    assert.equal(overridden.fogProgress, 0, 'Scene progress cannot replace the selected viewing distance.');
  }
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
    for (const key of ['ruleScale', 'descriptionOpacity', 'actionOpacity']) {
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
    assert.equal(sample.ruleScale, 1);
    assert.equal(sample.descriptionOpacity, 1);
    assert.equal(sample.actionOpacity, 1);
    assert.equal(sample.y, 0);
  }
});

test('oversized content is rejected before compiling an unbounded story rail', () => {
  const plan = compileResponsivePlan(1440, 900, 6);
  assert.equal(plan.valid, false);
  assert.ok(plan.diagnostics.some((item) => (
    item.code === 'parameter-range'
      && item.path.endsWith('.storyDurationWU')
  )), JSON.stringify(plan.diagnostics));
});


test('camera speed joins continuously across reading and passage cues and settles at the end', () => {
  for (const [, inlineSize, blockSize] of RESPONSIVE_PROFILES) {
    const responsivePlan = compileResponsivePlan(inlineSize, blockSize, 1.8);
    const map = resolveAboutNarrativeJourneyMap(responsivePlan.journeyMap, cameraTrack);
    const sample = createAboutNarrativeJourneySample();
    const distance = (time) => sampleAboutNarrativeJourneyMapInto(map, time, sample).cameraDistanceWU;
    for (const item of map.interpolationAnchors) {
      const step = 0.000001;
      const beforeRate = (distance(item.storyWU) - distance(item.storyWU - step)) / step;
      const afterRate = (distance(item.storyWU + step) - distance(item.storyWU)) / step;
      assert.ok(Math.abs(beforeRate - afterRate) < 0.02,
        `${item.id}: camera speed jumps from ${beforeRate} to ${afterRate}.`);
    }
    assert.equal(map.interpolationAnchors.at(-1).cameraRate, 0);
  }
});


test('scene reading cues arrive at the first visible prose pixel rather than its later timeline marker', () => {
  for (const [, inlineSize, blockSize] of RESPONSIVE_PROFILES) {
    const responsivePlan = compileResponsivePlan(inlineSize, blockSize, 1.8);
    const map = resolveAboutNarrativeJourneyMap(responsivePlan.journeyMap, cameraTrack);
    for (const [cueId, fieldId] of [
      ['inciting-question', 'text-background-unit'],
      ['personal-origin', 'text-discipline-labels'],
      ['method', 'text-life-character'],
    ]) {
      const cue = map.anchors.find((item) => item.id === cueId);
      const field = responsivePlan.textFields.find((item) => item.id === fieldId);
      const firstVisibleScrollWU = responsivePlan.resolver.scrollWUFromStoryWU(field.startWU)
        + responsivePlan.globals.editorialRevealThreshold - 1;
      closeWU(responsivePlan.resolver.scrollWUFromStoryWU(cue.storyWU), firstVisibleScrollWU,
        `${cueId}: scene handoff must match actual prose entry`);
    }
  }
});
