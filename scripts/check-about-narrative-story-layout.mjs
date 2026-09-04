import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ABOUT_NARRATIVE_STAGE_IDS,
  ABOUT_NARRATIVE_STORY_GAP_PRESETS,
  compileAboutNarrativeStoryLayout,
  materializeAboutNarrativeStoryLayout,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeStoryLayout.js';
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

test('the canonical story uses seven equal Blender sections', () => {
  for (const profileId of ['desktop', 'tablet', 'mobile']) {
    const layout = compileAboutNarrativeStoryLayout(canonical, { profileId });
    assert.equal(layout.sectionMode, 'equal-camera-distance');
    assert.equal(layout.stageDurationWU, 5);
    assert.equal(layout.durationWU, 35);
    assert.deepEqual(layout.sections.map((section) => section.id), ABOUT_NARRATIVE_STAGE_IDS);
    layout.sections.forEach((section, index) => {
      assert.equal(section.startWU, index * layout.stageDurationWU);
      assert.equal(section.endWU, (index + 1) * layout.stageDurationWU);
      assert.equal(section.durationWU, layout.stageDurationWU);
      assert.ok(section.fieldIds.length > 0, `${section.id} must contain text.`);
    });
    assert.deepEqual(
      layout.fields.map((item) => item.stageId),
      canonical.tracks.text.fields.map((item) => item.stageId),
    );
  }
});

test('oversized copy expands all seven sections by the same amount', () => {
  const measurements = {
    'text-background-unit': { contentHeightPx: 6_000, viewportHeightPx: 1_000 },
  };
  const layout = compileAboutNarrativeStoryLayout(canonical, {
    profileId: 'desktop',
    measurements,
  });
  assert.ok(layout.stageDurationWU > 5);
  assert.equal(new Set(layout.sections.map((section) => section.durationWU)).size, 1);
  assert.equal(layout.durationWU, layout.stageDurationWU * ABOUT_NARRATIVE_STAGE_IDS.length);
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
  assert.equal(runtime.profiles.mobile.scrollDurationWU, layout.durationWU);
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
