import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compileAboutNarrativeRuntimePlan } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';
import { validateAboutNarrativeTrackDocument } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackSchema.js';
import { ABOUT_NARRATIVE_DISCIPLINE_ANCHORS } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const canonicalSource = await read('../react-app/app/public/config/contents-about.json');
const canonical = JSON.parse(canonicalSource);
const legacy = JSON.parse(await read('./fixtures/about-narrative/contents-about-v2.json'));
const liveSources = Object.fromEntries(await Promise.all([
  ['experience', '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx'],
  ['timeline', '../react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js'],
  ['world', '../react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx'],
  ['editor', '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx'],
].map(async ([key, path]) => [key, await read(path)])));

function collectForbiddenContainers(value, path = 'document', results = []) {
  if (!value || typeof value !== 'object') return results;
  Object.entries(value).forEach(([key, child]) => {
    if (['sections', 'groups', 'bands', 'chapters'].includes(key)) results.push(`${path}.${key}`);
    collectForbiddenContainers(child, `${path}.${key}`, results);
  });
  return results;
}

test('canonical About source is deterministic native v3 with no authored containers', () => {
  assert.equal(canonical.schemaVersion, 3);
  assert.equal(legacy.schemaVersion, 2, 'The frozen parity fixture must remain legacy v2.');
  assert.deepEqual(collectForbiddenContainers(canonical), []);
  assert.equal(validateAboutNarrativeTrackDocument(canonical).filter((item) => item.level === 'error').length, 0);
  assert.match(canonicalSource, /"tracks": \{/);
  assert.doesNotMatch(canonicalSource, /"sections"\s*:/);
});

test('every profile compiles one semantic span per publishable field', () => {
  for (const layoutProfile of ['desktop', 'tablet', 'mobile']) {
    for (const motionProfile of ['full', 'reduced']) {
      const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile, motionProfile });
      assert.equal(plan.valid, true, `${layoutProfile}/${motionProfile}`);
      const publishable = plan.textFields.filter((field) => field.publishable === true);
      assert.equal(plan.renderSpans.length, publishable.length);
      assert.equal(new Set(plan.renderSpans.flatMap((span) => span.fieldIds)).size, publishable.length);
      assert.equal(plan.renderSpans.some((span) => span.fieldIds.some((id) => (
        plan.textFields.find((field) => field.id === id)?.kind === 'stub'
      ))), false);
    }
  }
});

test('live renderer, timeline, and 3D frame contain no Section contract', () => {
  assert.doesNotMatch(liveSources.experience, /sections\.map|sectionRefs|data-narrative-section|data-section-index/);
  assert.doesNotMatch(liveSources.timeline, /frame\.(?:section|sectionIndex|localProgress)\b|sectionRefs|aboutNarrativeCompiler/);
  assert.doesNotMatch(liveSources.world, /frame\.(?:section|sectionIndex|localProgress)\b|\.sectionId\b|matchMedia\(/);
  assert.match(liveSources.experience, /runtimePlan\?\.renderSpans/);
  assert.match(liveSources.experience, /data-text-field-id/);
  assert.match(liveSources.experience, /role="progressbar"/);
  assert.match(liveSources.experience, /pointProfile=\{runtimePlan\?\.pointProfile\}/);
});

test('the grid and discipline-isolation moments share one fixed World surface', () => {
  const background = canonical.tracks.worlds.objects.find((world) => world.id === 'world-background');
  const isolation = canonical.tracks.worlds.objects.find((world) => world.id === 'world-discipline-isolation');
  assert.ok(background);
  assert.ok(isolation);
  assert.deepEqual(background.modifiers, []);
  assert.equal(isolation.startWU, 9.602);
  assert.equal(isolation.anchorWU, background.anchorWU);
  assert.equal(isolation.shapeId, background.shapeId);
  assert.equal(isolation.seed, background.seed);
  assert.equal(isolation.entryDistanceWU, background.entryDistanceWU);
  assert.deepEqual(isolation.transform, background.transform);
  assert.deepEqual(isolation.shapeParameters, background.shapeParameters);
  assert.equal(isolation.transitionIn.correspondence, 'index-v1');
  assert.deepEqual(isolation.modifiers, [{
    id: 'discipline-isolation-v1',
    enabled: true,
    parameters: {
      strength: 1,
      backgroundOpacity: 0.2,
      backgroundScale: 0.58,
    },
  }]);
  assert.doesNotMatch(liveSources.world, /worldDisciplineRise|resolveDisciplineStoryOffset|storyOffset/);
  assert.match(liveSources.world, /camera\.position\.fromArray\(frame\.camera\.position\)/);
});

test('editor World labels use the sequential taxonomy without derived-span copy', () => {
  assert.deepEqual(
    canonical.tracks.worlds.objects.map((world) => world.label),
    ['A', 'B', 'C', 'D', 'E', 'F'],
  );
  assert.doesNotMatch(liveSources.editor, /Derived to next World Start|World width is derived/);
});

test('discipline isolation bookends the grid and the Camera owns the handoff', () => {
  const keys = new Map(canonical.tracks.camera.keys.map((key) => [key.id, key]));
  const bookend = keys.get('camera-grid-bookend-0');
  const reveal = keys.get('camera-practice-reveal-0');
  const editorial = keys.get('camera-disciplines-0');
  assert.equal(bookend.atWU, 9.602);
  assert.deepEqual(bookend.offset, [0, 0, 0]);
  assert.deepEqual(bookend.lookAtOffset, [0, 0, -1]);
  assert.equal(reveal.atWU, 10.45);
  assert.deepEqual(reveal.offset, [0, 6.4, -0.25]);
  assert.deepEqual(editorial.offset, [0, 6.4, 0.75]);
  const revealCameraZ = canonical.globals.camera.startZ - reveal.atWU + reveal.offset[2];
  const editorialCameraZ = canonical.globals.camera.startZ - editorial.atWU + editorial.offset[2];
  assert.ok(Math.abs(revealCameraZ - editorialCameraZ) < 0.000001, 'Camera holds the discipline band during its reveal.');

  const verticalPositions = ABOUT_NARRATIVE_DISCIPLINE_ANCHORS.map((anchor) => anchor.y);
  assert.equal(new Set(verticalPositions).size, 6);
  assert.ok(verticalPositions[0] <= 0.25);
  assert.ok(verticalPositions.at(-1) - verticalPositions[0] >= 0.189);

  const fields = canonical.tracks.text.fields;
  const editorialIds = [
    'text-disciplines-title',
    'text-disciplines-practice',
    'text-disciplines-ai',
    'text-disciplines-synthesis',
  ];
  const editorialFields = editorialIds.map((id) => fields.find((field) => field.id === id));
  editorialFields.forEach((field) => assert.ok(field));
  editorialFields.slice(1).forEach((field, index) => {
    assert.equal(editorialFields[index].endWU, field.startWU);
    assert.equal(editorialFields[index].presentation.layout, field.presentation.layout);
  });
  assert.equal(editorialFields.at(-1).block.worldInfluence, undefined);

  const mobileCamera = canonical.profiles.mobile.overrides.camera;
  assert.equal(mobileCamera['camera-practice-reveal-0'].fov, 55);
  assert.deepEqual(mobileCamera['camera-practice-reveal-0'].offset, [0, 4.3, 2.2]);
  assert.deepEqual(mobileCamera['camera-disciplines-0'].offset, [0, 4.3, 3.2]);
  const tabletCamera = canonical.profiles.tablet.overrides.camera;
  assert.deepEqual(tabletCamera['camera-practice-reveal-0'].offset, [0, 6.4, 2.2]);
  assert.deepEqual(tabletCamera['camera-disciplines-0'].offset, [0, 6.4, 3.2]);
});

test('editor exposes exactly four independent lanes and all Text creation kinds', () => {
  const trackDeclaration = liveSources.editor.slice(
    liveSources.editor.indexOf('const TRACKS'),
    liveSources.editor.indexOf('const TRACK_BY_ID'),
  );
  assert.deepEqual(
    [...trackDeclaration.matchAll(/id: '([^']+)'/g)].map((match) => match[1]),
    ['camera', 'world', 'text', 'interaction'],
  );
  assert.doesNotMatch(liveSources.editor, /sectionId|sectionRefs|data-narrative-section|['"]section['"]\s*,\s*label/i);
  assert.match(liveSources.editor, /createAtPlayhead\('text', 'title'\)/);
  assert.match(liveSources.editor, /createAtPlayhead\('text', 'scroll-block'\)/);
  assert.match(liveSources.editor, /createAtPlayhead\('text', 'stub'\)/);
  assert.match(liveSources.editor, /Draft · Not published/);
  assert.match(liveSources.editor, /Reduced Motion/);
});
