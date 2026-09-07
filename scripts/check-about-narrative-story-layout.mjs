import { compileAboutNarrativeComposerPlan } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js';
import { loadAboutNarrativePointFieldPersistenceSource } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';
import { createAboutNarrativeLongRideStoryMapper } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeLongRideTrack.js';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ABOUT_NARRATIVE_STORY_GAP_PRESETS,
  ABOUT_NARRATIVE_TITLE_TRAVEL_SCREENS,
  compileAboutNarrativeStoryLayout,
  materializeAboutNarrativeStoryLayout,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeStoryLayout.js';
import {
  createAboutNarrativeTitleFieldSample,
  sampleAboutNarrativeTitleFieldInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';
import { ABOUT_BLENDER_STAGE_IDS } from '../react-app/app/src/routes/about-narrative-lab/aboutBlenderStages.js';
import {
  resolveAboutNarrativeMomentTriggerWU,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeMoments.js';

const ROOT = new URL('../', import.meta.url);
const canonical = JSON.parse(await readFile(
  new URL('react-app/app/public/config/contents-about.json', ROOT),
  'utf8',
));

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
  const legacy = structuredClone(canonical);
  legacy.tracks.text.fields.forEach((item) => delete item.flow);
  const layout = compileAboutNarrativeStoryLayout(legacy, { profileId: 'desktop' });
  assert.equal(layout.mode, 'legacy');
  assert.equal(layout.durationWU, legacy.profiles.desktop.storyDurationWU);
  assert.deepEqual(
    layout.fields.map(({ id, startWU, focusWU, endWU }) => ({ id, startWU, focusWU, endWU })),
    legacy.tracks.text.fields.map(({ id, startWU, focusWU, endWU }) => ({ id, startWU, focusWU, endWU })),
  );
});

test('the canonical story uses seven contiguous content-paced Blender sections', () => {
  for (const profileId of ['desktop', 'tablet', 'mobile']) {
    const layout = compileAboutNarrativeStoryLayout(canonical, { profileId });
    const expectedBreathingGapWU = 1.32 * 35 / 8.8;
    const expectedTunnelExitGapWU = 1.32 * 35 / 8.8;
    const expectedMethodGapWU = 1.32 * 35 / 8.8;
    assert.equal(layout.sectionMode, 'content-paced');
    assert.ok(Math.abs(layout.durationWU - (
      35 + expectedBreathingGapWU + expectedTunnelExitGapWU + expectedMethodGapWU
    )) < 0.00001);
    const breathingGap = layout.gaps.find((gap) => gap.fromFieldId === 'text-complexity-conditions');
    const tunnelExitGap = layout.gaps.find((gap) => gap.fromFieldId === 'text-complexity-listen');
    const methodGap = layout.gaps.find((gap) => gap.fromFieldId === 'text-life-momentum');
    assert.ok(Math.abs(breathingGap.durationWU - expectedBreathingGapWU) < 0.00001);
    assert.equal(breathingGap.toFieldId, 'text-background-unit');
    assert.ok(Math.abs(tunnelExitGap.durationWU - expectedTunnelExitGapWU) < 0.00001);
    assert.equal(tunnelExitGap.toFieldId, 'text-discipline-labels');
    assert.ok(Math.abs(methodGap.durationWU - expectedMethodGapWU) < 0.00001);
    assert.equal(methodGap.toFieldId, 'text-life-character');
    assert.ok(layout.gaps.filter((gap) => (
      gap !== breathingGap && gap !== tunnelExitGap && gap !== methodGap
    )).every((gap) => gap.durationWU === 0));
    assert.deepEqual(layout.sections.map((section) => section.id), ABOUT_BLENDER_STAGE_IDS);
    assert.deepEqual(
      layout.sections.map((section) => [section.id, section.fieldIds]),
      [
        ['about.00', ['text-promise-main', 'text-complexity-idea', 'text-complexity-conditions']],
        ['about.01', ['text-background-unit']],
        ['about.02', ['text-complexity-curiosity', 'text-complexity-listen']],
        ['about.03', ['text-discipline-labels', 'text-selected-clients']],
        ['about.04', ['text-disciplines-title', 'text-life-momentum']],
        ['about.05', ['text-life-character']],
        ['about.06', ['text-epilogue-shaping', 'text-epilogue-thinking', 'text-epilogue-invitation']],
      ],
    );
    layout.sections.forEach((section, index) => {
      assert.equal(section.startWU, index ? layout.sections[index - 1].endWU : 0);
      assert.ok(section.endWU > section.startWU);
      assert.ok(section.fieldIds.length > 0, `${section.id} must contain text.`);
    });
    assert.deepEqual(
      layout.fields.map((item) => item.stageId),
      canonical.tracks.text.fields.map((item) => item.stageId),
    );
  }
});

test('oversized copy adds reading space without padding every other chapter', () => {
  const measurements = {
    'text-background-unit': { contentHeightPx: 6_000, viewportHeightPx: 1_000 },
  };
  const layout = compileAboutNarrativeStoryLayout(canonical, {
    profileId: 'desktop',
    measurements,
  });
  const backgroundSection = layout.sections.find((section) => section.id === 'about.01');
  const openingSection = layout.sections.find((section) => section.id === 'about.00');
  assert.ok(backgroundSection.durationWU >= 6 * 35 / 8.8);
  assert.equal(layout.gaps.filter(gap => gap.durationWU > 0).length, 3);
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
  const document = structuredClone(canonical);
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
    const layout = compileAboutNarrativeStoryLayout(canonical, {
      profileId,
      measurements: { 'text-background-unit': { contentHeightPx: 12000, viewportHeightPx: 1000 } },
    });
    const runtime = materializeAboutNarrativeStoryLayout(canonical, layout);
    assert.ok(layout.durationWU > 35);
    assert.ok(Math.abs(runtime.profiles[profileId].scrollDurationWU / layout.durationWU - 8.8 / 35) < 0.000001);
    const breathingGap = layout.gaps.find((gap) => gap.fromFieldId === 'text-complexity-conditions');
    const tunnelExitGap = layout.gaps.find((gap) => gap.fromFieldId === 'text-complexity-listen');
    const methodGap = layout.gaps.find((gap) => gap.fromFieldId === 'text-life-momentum');
    assert.ok(Math.abs(runtime.profiles[profileId].scrollDurationWU
      * breathingGap.durationWU / layout.durationWU - 1.32) < 0.000001);
    assert.ok(Math.abs(runtime.profiles[profileId].scrollDurationWU
      * tunnelExitGap.durationWU / layout.durationWU - 1.32) < 0.000001);
    assert.ok(Math.abs(runtime.profiles[profileId].scrollDurationWU
      * methodGap.durationWU / layout.durationWU - 1.32) < 0.000001);
    assert.ok(layout.gaps.filter((gap) => (
      gap !== breathingGap && gap !== tunnelExitGap && gap !== methodGap
    )).every((gap) => gap.durationWU === 0));
  }
});

test('narrow reading pressure beyond 48 WU installs a complete plan and matching finale', () => {
  const document = loadAboutNarrativePointFieldPersistenceSource(canonical).document;
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


test('every statement keeps the reference scroll travel regardless of wrapping and reading allocation', () => {
  for (const profileId of ['desktop', 'tablet', 'mobile']) {
    const document = structuredClone(canonical);
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
    assert.equal(statements.length, 8);
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

test('title-to-prose clearance measures first viewport entry and respects reveal-threshold changes', () => {
  for (const threshold of [0.18, 0.8, 1.5]) {
    const document = structuredClone(canonical);
    document.globals.editorialRevealThreshold = threshold;
    document.globals.storyPacing = { titleToProseGapScreens: 0.5 };
    const layout = compileAboutNarrativeStoryLayout(document);
    const ratio = document.profiles.desktop.scrollDurationWU / document.profiles.desktop.storyDurationWU;
    for (let index = 1; index < layout.fields.length; index += 1) {
      const previous = layout.fields[index - 1];
      const incoming = layout.fields[index];
      if (previous.kind !== 'title' || incoming.kind !== 'scroll-block') continue;
      const firstVisibleAfterTitleScreens = (incoming.startWU - previous.endWU) * ratio + threshold - 1;
      assert.ok(firstVisibleAfterTitleScreens >= 0.5 - 0.000001,
        `${incoming.id}: first prose pixel needs half a viewport after the preceding title exits.`);
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
