import { compileAboutNarrativeComposerPlan } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js';
import { loadAboutNarrativePointFieldPersistenceSource, serializeAboutNarrativePointFieldSource } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';
import {
  ABOUT_NARRATIVE_LONG_RIDE_MAX_DURATION_WU,
  createAboutNarrativeLongRideStoryMapper,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeLongRideTrack.js';
import {
  validateAboutNarrativePointFieldDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ABOUT_NARRATIVE_STORY_GAP_PRESETS,
  ABOUT_NARRATIVE_TITLE_TRAVEL_SCREENS,
  ABOUT_NARRATIVE_RIVER_TRAVEL_SHARE,
  compileAboutNarrativeStoryLayout,
  materializeAboutNarrativeStoryLayout,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeStoryLayout.js';
import {
  createAboutNarrativeTitleFieldSample,
  sampleAboutNarrativeTitleFieldInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';
import { ABOUT_BLENDER_STAGE_IDS } from '../react-app/app/src/routes/about-narrative-lab/aboutBlenderStages.js';
import { ABOUT_NARRATIVE_PHYSICAL_STAGE_BOUNDARIES } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';
import {
  resolveAboutNarrativeMomentTriggerWU,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeMoments.js';

const ROOT = new URL('../', import.meta.url);
const canonical = JSON.parse(await readFile(
  new URL('react-app/app/public/config/contents-about.json', ROOT),
  'utf8',
));
// Keep the pre-connected document as a fallback fixture. New source documents
// opt into the physical flight contract below without rewriting old projects.
const legacyCanonical = structuredClone(canonical);
delete legacyCanonical.globals.storyPacing.connectedFlight;
const legacyStages = {
  'text-complexity-curiosity': 'about.02',
  'text-complexity-listen': 'about.02',
  'text-life-character': 'about.05',
};
legacyCanonical.tracks.text.fields.forEach((item) => {
  if (legacyStages[item.id]) item.stageId = legacyStages[item.id];
  if (item.preset === 'finale-v1') item.flow.sceneLeadScreens = 2.4;
});

const measuredLayouts = JSON.parse(await readFile(
  new URL('scripts/fixtures/about-editorial-measured-layouts.json', ROOT), 'utf8',
)).layouts;

function field(id, text, flow = {}) {
  return {
    id,
    kind: 'title',
    publishable: true,
    text,
    startWU: 90,
    focusWU: 91,
    endWU: 92,
    flow: {
      minScreens: 0.6,
      gapAfter: 'tight',
      focusMode: 'middle',
      ...flow,
    },
  };
}

test('documents without Story Stack flow preserve their authored timing', () => {
  const legacy = structuredClone(legacyCanonical);
  legacy.tracks.text.fields.forEach((item) => delete item.flow);
  const layout = compileAboutNarrativeStoryLayout(legacy, { profileId: 'desktop' });
  assert.equal(layout.mode, 'legacy');
  assert.equal(layout.durationWU, legacy.profiles.desktop.storyDurationWU);
  assert.deepEqual(
    layout.fields.map(({ id, startWU, focusWU, endWU }) => ({ id, startWU, focusWU, endWU })),
    legacy.tracks.text.fields.map(({ id, startWU, focusWU, endWU }) => ({ id, startWU, focusWU, endWU })),
  );
});

test('legacy staged stories preserve seven sections and give the river the final third', () => {
  for (const profileId of ['desktop', 'tablet', 'mobile']) {
    const layout = compileAboutNarrativeStoryLayout(legacyCanonical, { profileId });
    assert.equal(layout.sectionMode, 'content-paced');
    assert.ok(Math.abs(layout.riverStartWU / layout.durationWU
      - (1 - ABOUT_NARRATIVE_RIVER_TRAVEL_SHARE)) < 0.000001);
    const breathingGap = layout.gaps.find((gap) => gap.fromFieldId === 'text-promise-main');
    const tunnelExitGap = layout.gaps.find((gap) => gap.fromFieldId === 'text-complexity-listen');
    const methodGap = layout.gaps.find((gap) => gap.fromFieldId === 'text-life-momentum');
    assert.ok(breathingGap.durationWU > 0);
    assert.equal(breathingGap.toFieldId, 'text-background-unit');
    assert.ok(tunnelExitGap.durationWU > 0);
    assert.equal(tunnelExitGap.toFieldId, 'text-discipline-labels');
    assert.ok(methodGap.durationWU > 0);
    assert.equal(methodGap.toFieldId, 'text-life-character');
    assert.ok(layout.gaps.filter(gap => layout.fields.find(field => field.id === gap.fromFieldId).stageId
      === layout.fields.find(field => field.id === gap.toFieldId).stageId)
      .every(gap => gap.durationWU <= 0.000001));
    assert.deepEqual(layout.sections.map((section) => section.id), ABOUT_BLENDER_STAGE_IDS);
    assert.deepEqual(
      layout.sections.map((section) => [section.id, section.fieldIds]),
      [
        ['about.00', ['text-promise-main']],
        ['about.01', ['text-background-unit']],
        ['about.02', ['text-complexity-curiosity', 'text-complexity-listen']],
        ['about.03', ['text-discipline-labels', 'text-selected-clients']],
        ['about.04', ['text-disciplines-title', 'text-life-momentum']],
        ['about.05', ['text-life-character']],
        ['about.06', ['text-epilogue-invitation']],
      ],
    );
    layout.sections.forEach((section, index) => {
      assert.equal(section.startWU, index ? layout.sections[index - 1].endWU : 0);
      assert.ok(section.endWU > section.startWU);
      assert.ok(section.fieldIds.length > 0, `${section.id} must contain text.`);
    });
    assert.deepEqual(
      layout.fields.map((item) => item.stageId),
      legacyCanonical.tracks.text.fields.map((item) => item.stageId),
    );
  }
});

test('oversized copy lengthens the complete rail while preserving the physical stage allocation', () => {
  const measurements = {
    'text-background-unit': { contentHeightPx: 6_000, viewportHeightPx: 1_000 },
  };
  const layout = compileAboutNarrativeStoryLayout(legacyCanonical, {
    profileId: 'desktop',
    measurements,
  });
  const backgroundSection = layout.sections.find((section) => section.id === 'about.01');
  const openingSection = layout.sections.find((section) => section.id === 'about.00');
  assert.ok(backgroundSection.durationWU >= 6 * 35 / 8.8);
  for (const [index, section] of layout.sections.entries()) {
    assert.ok(Math.abs(section.sceneStartWU / layout.durationWU
      - ABOUT_NARRATIVE_PHYSICAL_STAGE_BOUNDARIES[index]) < 0.000001);
  }
  assert.ok(openingSection.durationWU < backgroundSection.durationWU);
});

test('content order and named gaps replace stale authored timeline positions', () => {
  const document = {
    tracks: {
      text: {
        fields: [
          field('first', 'First', { gapAfter: 'chapter' }),
          field('second', 'Second', { gapAfter: 'finale' }),
          field('third', 'Third', { gapAfter: 'none' }),
        ],
      },
    },
  };
  const layout = compileAboutNarrativeStoryLayout(document, { profileId: 'desktop' });
  assert.equal(layout.mode, 'content-flow');
  assert.equal(layout.valid, true);
  assert.deepEqual(layout.fields.map((item) => item.id), ['first', 'second', 'third']);
  assert.equal(layout.fields[0].startWU, 0);
  assert.equal(
    layout.fields[1].startWU - layout.fields[0].endWU,
    ABOUT_NARRATIVE_STORY_GAP_PRESETS.chapter.desktop,
  );
  assert.equal(
    layout.fields[2].startWU - layout.fields[1].endWU,
    ABOUT_NARRATIVE_STORY_GAP_PRESETS.finale.desktop,
  );
});

test('measured copy length expands and contracts every downstream anchor', () => {
  const document = {
    tracks: {
      text: {
        fields: [
          field('first', 'First'),
          field('second', 'Second'),
        ],
      },
    },
  };
  const compact = compileAboutNarrativeStoryLayout(document, {
    profileId: 'desktop',
    measurements: {
      first: { measuredHeightPx: 300, viewportHeightPx: 1_000 },
      second: { measuredHeightPx: 300, viewportHeightPx: 1_000 },
    },
  });
  const expanded = compileAboutNarrativeStoryLayout(document, {
    profileId: 'desktop',
    measurements: {
      first: { measuredHeightPx: 1_900, viewportHeightPx: 1_000 },
      second: { measuredHeightPx: 300, viewportHeightPx: 1_000 },
    },
  });
  assert(expanded.fields[0].durationWU > compact.fields[0].durationWU);
  assert(expanded.fields[1].startWU > compact.fields[1].startWU);
  assert(expanded.durationWU > compact.durationWU);
});

test('materialization updates the Text spine, page length, and semantic motion caches', () => {
  const document = structuredClone(legacyCanonical);
  document.tracks.text.fields.forEach((item, index) => {
    item.flow = {
      minScreens: item.kind === 'scroll-block' ? 1.4 : 0.7,
      gapAfter: index === document.tracks.text.fields.length - 2 ? 'finale' : 'tight',
      focusMode: item.kind === 'scroll-block' ? 'reading-start' : 'middle',
    };
  });
  const layout = compileAboutNarrativeStoryLayout(document, { profileId: 'desktop' });
  const runtime = materializeAboutNarrativeStoryLayout(document, layout);
  assert.equal(runtime.profiles.desktop.storyDurationWU, layout.durationWU);
  assert.equal(runtime.profiles.mobile.scrollDurationWU, Number((layout.durationWU * 8.8 / 35).toFixed(6)));
  assert.deepEqual(
    runtime.tracks.text.fields.map((item) => item.startWU),
    layout.fields.map((item) => item.startWU),
  );
  const cameraKey = runtime.tracks.camera.moveKeys[1];
  assert.equal(
    cameraKey.atWU,
    resolveAboutNarrativeMomentTriggerWU(runtime, cameraKey.trigger),
  );
});

test('the finale gap is bounded and can never recreate the old three-screen void', () => {
  for (const profileId of ['desktop', 'tablet', 'mobile']) {
    assert(ABOUT_NARRATIVE_STORY_GAP_PRESETS.finale[profileId] <= 1.05);
  }
});

test('measured Story growth preserves the authored physical scroll ratio', () => {
  for (const profileId of ['desktop', 'tablet', 'mobile']) {
    const layout = compileAboutNarrativeStoryLayout(legacyCanonical, {
      profileId,
      measurements: { 'text-background-unit': { contentHeightPx: 12000, viewportHeightPx: 1000 } },
    });
    const runtime = materializeAboutNarrativeStoryLayout(legacyCanonical, layout);
    assert.ok(layout.durationWU > 35);
    assert.ok(Math.abs(runtime.profiles[profileId].scrollDurationWU / layout.durationWU - 8.8 / 35) < 0.000001);
    const breathingGap = layout.gaps.find((gap) => gap.fromFieldId === 'text-promise-main');
    const tunnelExitGap = layout.gaps.find((gap) => gap.fromFieldId === 'text-complexity-listen');
    const methodGap = layout.gaps.find((gap) => gap.fromFieldId === 'text-life-momentum');
    for (const gap of [breathingGap, tunnelExitGap, methodGap]) {
      const gapScreens = runtime.profiles[profileId].scrollDurationWU * gap.durationWU / layout.durationWU;
      assert.ok(Number.isFinite(gapScreens) && gapScreens > 0,
        'Measured lower handoffs must remain positive and finite when the complete ride grows.');
    }
    assert.ok(layout.gaps.filter(gap => layout.fields.find(field => field.id === gap.fromFieldId).stageId
      === layout.fields.find(field => field.id === gap.toFieldId).stageId)
      .every(gap => gap.durationWU <= 0.000001));
  }
});

test('narrow reading pressure beyond 48 WU installs a complete plan and matching finale', () => {
  const document = loadAboutNarrativePointFieldPersistenceSource(legacyCanonical).document;
  const contentPressure = Object.fromEntries(document.tracks.text.fields.map(field => [field.id, {
    measuredHeightPx: field.id === 'text-background-unit' ? 3000 : field.kind === 'title' ? 150 : 1500,
    viewportHeightPx: 675,
  }]));
  const plan = compileAboutNarrativeComposerPlan(document, { inlineSize: 300, blockSize: 675, contentPressure });
  assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics));
  assert.ok(plan.durationWU > 48);
  const mapper = createAboutNarrativeLongRideStoryMapper({ storyDurationWU: plan.durationWU });
  assert.equal(mapper.storyDurationWU, plan.durationWU);
});

test('all eight measured layouts finish prose before the final river passage and install without clamping', () => {
  const document = loadAboutNarrativePointFieldPersistenceSource(legacyCanonical).document;
  assert.deepEqual(measuredLayouts.map(layout => layout.id).sort(), [
    'desktop', 'desktop-200', 'mobile', 'mobile-200', 'short-landscape',
    'short-landscape-200', 'tablet', 'tablet-200',
  ]);
  for (const measured of measuredLayouts) {
    const plan = compileAboutNarrativeComposerPlan(document, {
      inlineSize: measured.inlineSize,
      blockSize: measured.blockSize,
      contentPressure: measured.measurements,
    });
    assert.equal(plan.valid, true, `${measured.id}: ${JSON.stringify(plan.diagnostics)}`);
    const layout = plan.storyLayout;
    const ratio = document.profiles[measured.profileId].scrollDurationWU
      / document.profiles[measured.profileId].storyDurationWU;
    const screens = layout.durationWU * ratio;
    if (measured.id === 'desktop') assert.ok(screens >= 12 && screens <= 14);
    assert.deepEqual(layout.sections.map(section => section.id), ABOUT_BLENDER_STAGE_IDS);
    layout.sections.forEach((section, index) => {
      assert.ok(Math.abs(section.sceneStartWU / layout.durationWU
        - ABOUT_NARRATIVE_PHYSICAL_STAGE_BOUNDARIES[index]) < 0.000001,
      `${measured.id}: ${section.id} must use the source's physical stage boundary.`);
      assert.ok(Math.abs(section.sceneEndWU / layout.durationWU
        - ABOUT_NARRATIVE_PHYSICAL_STAGE_BOUNDARIES[index + 1]) < 0.000001);
    });
    assert.ok(Math.abs(layout.riverStartWU / layout.durationWU - 0.68) < 0.000001);
    const finalProse = layout.fields.find(field => field.id === 'text-life-character');
    const lastPaintedLineScreens = finalProse.startWU * ratio
      + document.globals.editorialRevealThreshold
      + measured.measurements[finalProse.id].measuredHeightPx / measured.blockSize;
    assert.ok(layout.riverStartWU * ratio - lastPaintedLineScreens >= 0.19,
      `${measured.id}: the complete last prose line must clear before the river starts.`);
    for (let index = 1; index < layout.fields.length; index += 1) {
      const title = layout.fields[index - 1];
      const prose = layout.fields[index];
      if (title.kind !== 'title' || prose.kind !== 'scroll-block') continue;
      const titleBottom = 0.5 + measured.measurements[title.id].protectedHeightPx / measured.blockSize / 2;
      const proseTopAtExit = (prose.startWU - title.endWU) * ratio
        + document.globals.editorialRevealThreshold;
      assert.ok(proseTopAtExit - titleBottom
        >= document.globals.storyPacing.titleToProseGapScreens - 0.000001,
      `${measured.id}: ${title.id} must keep the complete title/group clear through exit.`);
    }
    const mapper = createAboutNarrativeLongRideStoryMapper({ storyDurationWU: plan.durationWU });
    assert.equal(mapper.storyDurationWU, plan.durationWU, 'Measured layouts must not be silently clamped.');
    assert.equal(plan.textFields.at(-1).endWU, plan.durationWU);
    if (measured.id === 'mobile-200') {
      assert.ok(plan.durationWU > 96 && plan.durationWU < ABOUT_NARRATIVE_LONG_RIDE_MAX_DURATION_WU,
        'Exact200% mobile must install its full measured plan beyond the former96WU limit.');
    }
    if (measured.id === 'short-landscape-200') {
      assert.ok(plan.durationWU > 170 && plan.durationWU < ABOUT_NARRATIVE_LONG_RIDE_MAX_DURATION_WU,
        'Enlarged short text must install its full reading rail, not retain a normal or portrait plan.');
      assert.ok(measured.measurements['text-promise-main'].protectedHeightPx < measured.blockSize,
        'The complete enlarged opener must fit the short viewport before allocating physical travel.');
    }
  }
});

test('the expanded duration allowance remains finite and rejects values outside the shared bound', () => {
  assert.equal(ABOUT_NARRATIVE_LONG_RIDE_MAX_DURATION_WU, 384);
  for (const key of ['storyDurationWU', 'finaleAnchorWU']) {
    const path = `tracks.pointField.stateDefinitions.0.shapeParameters.${key}`;
    for (const value of [384, 385, Infinity, NaN, -1]) {
      const document = structuredClone(legacyCanonical);
      document.tracks.pointField.stateDefinitions[0].shapeParameters[key] = value;
      const diagnostic = validateAboutNarrativePointFieldDocument(document).find(item => item.path === path);
      if (value === 384) assert.equal(diagnostic, undefined, `${key}: the shared maximum remains valid.`);
      else assert.equal(diagnostic?.code, 'parameter-range', `${key}=${value}: ${JSON.stringify(diagnostic)}`);
    }
  }
});


test('every statement keeps the reference scroll travel regardless of wrapping and reading allocation', () => {
  for (const profileId of ['desktop', 'tablet', 'mobile']) {
    const document = structuredClone(legacyCanonical);
    document.globals.textMotion.durationScale = 1;
    const measurements = Object.fromEntries(document.tracks.text.fields.map((item, index) => [item.id, {
      contentHeightPx: item.kind === 'title' ? 140 + index * 53 : 1800,
      viewportHeightPx: 900,
    }]));
    const layout = compileAboutNarrativeStoryLayout(document, { profileId, measurements });
    const ratio = document.profiles[profileId].scrollDurationWU / document.profiles[profileId].storyDurationWU;
    const statements = layout.fields.filter((item) => document.tracks.text.fields.find(
      (source) => source.id === item.id,
    ).preset === 'travelling-title-v1');
    assert.equal(statements.length, 4);
    const reference = statements[0];
    const sample = createAboutNarrativeTitleFieldSample();
    for (const statement of statements) {
      assert.ok(Math.abs(statement.durationWU * ratio - ABOUT_NARRATIVE_TITLE_TRAVEL_SCREENS[profileId]) < 0.000001);
      for (const fraction of [0, 0.2, 0.5, 0.83, 0.92, 1]) {
        const actual = { ...sampleAboutNarrativeTitleFieldInto(statement,
          statement.startWU + statement.durationWU * fraction, document.globals.textMotion, false, sample) };
        const expected = sampleAboutNarrativeTitleFieldInto(reference,
          reference.startWU + reference.durationWU * fraction, document.globals.textMotion, false, sample);
        for (const key of ['y', 'z', 'opacity']) {
          assert.ok(Math.abs(actual[key] - expected[key]) < 0.001, `${statement.id} ${key} at ${fraction}`);
        }
      }
    }
    document.globals.textMotion.durationScale = 1.5;
    document.globals.storyPacing = { readingSpaceScale: 1.5, passageScale: 1.5, titleToProseGapScreens: 0.5 };
    const expanded = compileAboutNarrativeStoryLayout(document, { profileId, measurements });
    for (const statement of statements) {
      const next = expanded.fields.find((item) => item.id === statement.id);
      assert.ok(Math.abs(next.durationWU / statement.durationWU - 1.5) < 0.000002);
    }
    assert.ok(expanded.durationWU > layout.durationWU);
  }
});

test('incoming prose stays below complete title bounds through exit at every reveal threshold', () => {
  for (const threshold of [0.18, 0.8, 1.5]) {
    const document = structuredClone(legacyCanonical);
    document.globals.editorialRevealThreshold = threshold;
    document.globals.storyPacing = { titleToProseGapScreens: 0.06 };
    const measurements = Object.fromEntries(document.tracks.text.fields.map(item => [item.id, {
      measuredHeightPx: item.kind === 'title' ? 240 : 900,
      protectedHeightPx: item.preset === 'opener-v1' ? 520 : 280,
      viewportHeightPx: 900,
    }]));
    const layout = compileAboutNarrativeStoryLayout(document, { measurements });
    const ratio = document.profiles.desktop.scrollDurationWU / document.profiles.desktop.storyDurationWU;
    for (let index = 1; index < layout.fields.length; index += 1) {
      const previous = layout.fields[index - 1];
      const incoming = layout.fields[index];
      if (previous.kind !== 'title' || incoming.kind !== 'scroll-block') continue;
      const proseTopAtExitScreens = (incoming.startWU - previous.endWU) * ratio + threshold;
      const titleBottomScreens = 0.5 + measurements[previous.id].protectedHeightPx / 900 / 2;
      assert.ok(proseTopAtExitScreens - titleBottomScreens >= 0.06 - 0.000001,
        `${incoming.id}: incoming prose must remain below the complete held title, including enlarged opening context.`);
    }
  }
});

test('explicit title exit fraction takes precedence without changing its spatial travel', () => {
  const field = { kind: 'title', preset: 'travelling-title-v1', startWU: 1, endWU: 2 };
  const sample = createAboutNarrativeTitleFieldSample();
  const legacy = { ...sampleAboutNarrativeTitleFieldInto(field, 1.85, { readableStart: 0.18 }, false, sample) };
  const adjusted = sampleAboutNarrativeTitleFieldInto(field, 1.85,
    { readableStart: 0.18, exitFraction: 0.4 }, false, sample);
  assert.ok(adjusted.opacity < legacy.opacity);
  assert.equal(adjusted.z, legacy.z);
  assert.equal(adjusted.y, legacy.y);
});

test('connected flight keeps the complete copy in five calm regions and reserves two travel passages', () => {
  const pacing = canonical.globals.storyPacing.connectedFlight;
  assert.deepEqual(pacing.physicalStageBoundaries, [0, 16, 55, 81, 134, 159, 191, 210].map(value => value / 210));
  assert.equal(pacing.openingReadEndFraction, 8 / 210);
  assert.deepEqual(pacing.travelOnlyStageIds, ['about.02', 'about.05']);
  const layout = compileAboutNarrativeStoryLayout(canonical);
  assert.equal(layout.valid, true, JSON.stringify(layout.diagnostics));
  assert.equal(layout.pacingMode, 'connected-flight');
  assert.deepEqual(layout.sections.map(({ id, fieldIds }) => [id, fieldIds]), [
    ['about.00', ['text-promise-main']],
    ['about.01', ['text-background-unit', 'text-complexity-curiosity']],
    ['about.02', []],
    ['about.03', ['text-complexity-listen', 'text-discipline-labels', 'text-selected-clients']],
    ['about.04', ['text-disciplines-title', 'text-life-momentum', 'text-life-character']],
    ['about.05', []],
    ['about.06', ['text-epilogue-invitation']],
  ]);
  assert.deepEqual(layout.fields.map(item => item.id), canonical.tracks.text.fields.map(item => item.id));
});

test('connected flight fits every measured layout inside its physical reading regions without text in travel', () => {
  const document = loadAboutNarrativePointFieldPersistenceSource(canonical).document;
  const pacing = document.globals.storyPacing.connectedFlight;
  for (const measured of measuredLayouts) {
    const plan = compileAboutNarrativeComposerPlan(document, {
      inlineSize: measured.inlineSize,
      blockSize: measured.blockSize,
      contentPressure: measured.measurements,
    });
    assert.equal(plan.valid, true, `${measured.id}: ${JSON.stringify(plan.diagnostics)}`);
    const layout = plan.storyLayout;
    const ratio = document.profiles[measured.profileId].scrollDurationWU
      / document.profiles[measured.profileId].storyDurationWU;
    const screens = layout.durationWU * ratio;
    if (measured.id === 'desktop') assert.ok(screens > 17.9 && screens < 18.1);
    if (measured.id === 'short-landscape-200') assert.ok(screens > 74 && screens < 75);
    assert.ok(layout.durationWU < ABOUT_NARRATIVE_LONG_RIDE_MAX_DURATION_WU);
    const mapper = createAboutNarrativeLongRideStoryMapper({ storyDurationWU: plan.durationWU });
    assert.equal(mapper.storyDurationWU, plan.durationWU, `${measured.id}: no duration clamp`);
    assert.equal(plan.textFields.at(-1).endWU, plan.durationWU);
    assert.ok(layout.fields[0].endWU / layout.durationWU <= pacing.openingReadEndFraction + 0.000001,
      `${measured.id}: opening copy must clear before the descent`);
    layout.sections.forEach((section, index) => {
      assert.ok(Math.abs(section.sceneStartWU / layout.durationWU - pacing.physicalStageBoundaries[index]) < 0.000001);
      assert.ok(Math.abs(section.sceneEndWU / layout.durationWU - pacing.physicalStageBoundaries[index + 1]) < 0.000001);
      assert.equal(section.travelOnly, pacing.travelOnlyStageIds.includes(section.id));
      if (section.travelOnly) assert.equal(section.fieldIds.length, 0);
    });
    for (const field of layout.fields) {
      const source = document.tracks.text.fields.find(item => item.id === field.id);
      const section = layout.sections.find(item => item.id === field.stageId);
      const heightScreens = measured.measurements[field.id].measuredHeightPx / measured.blockSize;
      const firstPixelScreens = field.startWU * ratio
        + (field.kind === 'scroll-block' ? document.globals.editorialRevealThreshold - 1 : 0);
      const lastPixelScreens = field.kind === 'scroll-block'
        ? field.startWU * ratio + document.globals.editorialRevealThreshold + heightScreens
        : field.endWU * ratio;
      assert.ok(firstPixelScreens >= section.sceneStartWU * ratio - 0.000001,
        `${measured.id}: ${field.id} must enter inside its calm region`);
      assert.ok(lastPixelScreens <= section.sceneEndWU * ratio + 0.000001,
        `${measured.id}: ${field.id} must fully clear inside its calm region`);
      for (const travel of layout.sections.filter(item => item.travelOnly)) {
        assert.ok(lastPixelScreens <= travel.sceneStartWU * ratio + 0.000001
          || firstPixelScreens >= travel.sceneEndWU * ratio - 0.000001,
        `${measured.id}: ${field.id} must not paint into ${travel.id}`);
      }
      if (source.preset === 'travelling-title-v1') {
        assert.ok(Math.abs(field.durationWU * ratio
          - ABOUT_NARRATIVE_TITLE_TRAVEL_SCREENS[measured.profileId] * document.globals.textMotion.durationScale) < 0.000001,
        `${measured.id}: statements retain their shared lifecycle`);
      }
    }
    for (let index = 1; index < layout.fields.length; index += 1) {
      const title = layout.fields[index - 1];
      const prose = layout.fields[index];
      if (title.kind !== 'title' || prose.kind !== 'scroll-block') continue;
      const titleBottom = 0.5 + measured.measurements[title.id].protectedHeightPx / measured.blockSize / 2;
      const proseTopAtExit = (prose.startWU - title.endWU) * ratio + document.globals.editorialRevealThreshold;
      assert.ok(proseTopAtExit - titleBottom >= document.globals.storyPacing.titleToProseGapScreens - 0.000001,
        `${measured.id}: prose must clear the complete held title`);
    }
  }
});

test('connected pacing survives normalization, live controls, canonical save and reload with all copy intact', () => {
  const loaded = loadAboutNarrativePointFieldPersistenceSource(canonical);
  assert.equal(loaded.valid, true, loaded.message);
  const document = structuredClone(loaded.document);
  document.globals.storyPacing.readingSpaceScale = 1.2;
  const before = compileAboutNarrativeStoryLayout(document, { measurements: measuredLayouts[0].measurements });
  const saved = serializeAboutNarrativePointFieldSource(document);
  const reloaded = loadAboutNarrativePointFieldPersistenceSource(saved);
  assert.equal(reloaded.valid, true, reloaded.message);
  assert.deepEqual(reloaded.document.globals.storyPacing.connectedFlight, canonical.globals.storyPacing.connectedFlight);
  const after = compileAboutNarrativeStoryLayout(reloaded.document, { measurements: measuredLayouts[0].measurements });
  assert.equal(after.signature, before.signature);
  const runtime = materializeAboutNarrativeStoryLayout(reloaded.document, after);
  const copy = value => value.tracks.text.fields.map(({ id, text, description, block }) => ({ id, text, description, block }));
  assert.deepEqual(copy(runtime), copy(loaded.document));
});

test('malformed connected pacing and text assigned to a travel passage fail explicitly', () => {
  for (const mutate of [
    value => { value.schema = 'unknown'; },
    value => { value.physicalStageBoundaries[3] = value.physicalStageBoundaries[2]; },
    value => { value.physicalStageBoundaries[0] = 0.1; },
    value => { value.physicalStageBoundaries[4] = '0.5'; },
    value => { value.openingReadEndFraction = 0.9; },
    value => { value.travelOnlyStageIds.push('about.02'); },
    value => { value.travelOnlyStageIds.push('about.06'); },
  ]) {
    const document = structuredClone(canonical);
    mutate(document.globals.storyPacing.connectedFlight);
    assert.ok(validateAboutNarrativePointFieldDocument(document)
      .some(item => item.code === 'v5-projection-connected-flight-pacing'));
    assert.equal(compileAboutNarrativeStoryLayout(document).valid, false);
  }
  const document = structuredClone(canonical);
  document.tracks.text.fields.find(item => item.id === 'text-complexity-curiosity').stageId = 'about.02';
  const layout = compileAboutNarrativeStoryLayout(document);
  assert.equal(layout.valid, false);
  assert.ok(layout.diagnostics.some(item => item.code === 'story-travel-has-text'));
});
