import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  compileAboutNarrativeRuntimePlan,
  sampleAboutNarrativeRuntimePlan,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';
import {
  getAboutNarrativeEditorialReveal,
} from '../react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js';
import { validateAboutNarrativeTrackDocument } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackSchema.js';
import {
  ABOUT_NARRATIVE_CAMERA_TRACK_CONTROL_GROUPS,
  ABOUT_NARRATIVE_DISCIPLINE_ANCHORS,
  ABOUT_NARRATIVE_GLOBAL_CONTROLS,
  ABOUT_NARRATIVE_INTERACTION_DEFINITIONS,
  ABOUT_NARRATIVE_MODIFIER_DEFINITIONS,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
  ABOUT_NARRATIVE_TEXT_TRACK_CONTROL_GROUPS,
  ABOUT_NARRATIVE_WORLD_CONTROL_GROUPS,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const canonicalSource = await read('../react-app/app/public/config/contents-about.json');
const canonical = JSON.parse(canonicalSource);
const legacy = JSON.parse(await read('./fixtures/about-narrative/contents-about-v2.json'));
const liveSources = Object.fromEntries(await Promise.all([
  ['experience', '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx'],
  ['timeline', '../react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js'],
  ['world', '../react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx'],
  ['editor', '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx'],
  ['styles', '../react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css'],
  ['editorStyles', '../react-app/app/src/routes/about-narrative-lab/about-narrative-editor.css'],
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

test('C owns one fixed grid World and D is expressed only as Motion', () => {
  const background = canonical.tracks.worlds.objects.find((world) => world.id === 'world-background');
  const reveal = canonical.tracks.interactions.clips.find((clip) => clip.type === 'discipline-reveal');
  assert.ok(background);
  assert.ok(reveal);
  assert.deepEqual(background.modifiers, []);
  assert.equal(canonical.tracks.worlds.objects.some((world) => world.id === 'world-discipline-isolation'), false);
  assert.equal(reveal.targetWorldId, background.id);
  assert.equal(reveal.startWU, 8.686);
  assert.equal(reveal.activationWU, 10.45);
  assert.equal(reveal.endWU, 14.145);
  assert.equal(reveal.parameters.backgroundOpacity, 0.2);
  assert.equal(reveal.parameters.backgroundScale, 0.58);
  assert.equal(canonical.tracks.text.fields.some((field) => field.kind === 'discipline-reveal'), false);
  assert.doesNotMatch(liveSources.world, /worldDisciplineRise|resolveDisciplineStoryOffset|storyOffset/);
  assert.match(liveSources.world, /camera\.position\.fromArray\(frame\.camera\.position\)/);
  assert.match(liveSources.world, /uniforms\.fromDisciplineIsolation\.value = isolationWeight/);
  assert.match(liveSources.world, /writeDisciplineSide/);
  assert.match(liveSources.experience, /data-motion-clip-id/);
  assert.match(liveSources.styles, /data-label-side='left'/);
  assert.match(liveSources.editorStyles, /\.about-narrative-motion-layer/);
});

test('editor World labels reserve D for Motion without derived-span copy', () => {
  assert.deepEqual(
    canonical.tracks.worlds.objects.map((world) => world.label),
    ['A', 'B', 'C', 'E', 'F'],
  );
  assert.doesNotMatch(liveSources.editor, /Derived to next World Start|World width is derived/);
});

test('every World exposes grouped live sliders instead of raw Shape and Modifier JSON', () => {
  assert.equal(ABOUT_NARRATIVE_WORLD_CONTROL_GROUPS.length, 9);
  assert.equal(new Set(ABOUT_NARRATIVE_WORLD_CONTROL_GROUPS.map((group) => group.id)).size, 9);
  canonical.tracks.worlds.objects.forEach((world) => {
    const shape = ABOUT_NARRATIVE_SHAPE_DEFINITIONS[world.shapeId];
    const parameterGroups = new Set(shape.parameters.map((control) => control.group));
    world.modifiers.forEach((modifier) => {
      const definition = ABOUT_NARRATIVE_MODIFIER_DEFINITIONS[modifier.id];
      definition.parameters.forEach((control) => parameterGroups.add(control.group));
    });
    assert.ok(3 + parameterGroups.size >= 5, `${world.label} should expose at least five purposeful inspector groups.`);
  });
  Object.values(ABOUT_NARRATIVE_SHAPE_DEFINITIONS).forEach((definition) => {
    definition.parameters.forEach((control) => {
      assert.equal(control.type, 'range');
      assert.match(control.group, /^shape-/);
    });
  });
  Object.values(ABOUT_NARRATIVE_MODIFIER_DEFINITIONS).forEach((definition) => {
    definition.parameters.filter((control) => control.type === 'range').forEach((control) => {
      assert.match(control.group, /^modifier-/);
    });
  });
  assert.ok(ABOUT_NARRATIVE_SHAPE_DEFINITIONS['turbulent-field-v1'].parameters.find((control) => control.id === 'width').max >= 48);
  assert.ok(ABOUT_NARRATIVE_MODIFIER_DEFINITIONS['ambient-drift-v1'].parameters.find((control) => control.id === 'amplitude').max >= 1.5);
  assert.doesNotMatch(liveSources.editor, /<JsonField label="(?:Shape parameters|Modifier stack)"/);
  assert.match(liveSources.editor, /store\.beginGesture\(label/);
  assert.match(liveSources.editor, /store\.updateGesture/);
  assert.match(liveSources.editor, /store\.commitGesture/);
  assert.match(liveSources.editorStyles, /\.about-track-editor-folder/);
  assert.match(liveSources.editorStyles, /\.about-track-editor-parameter__slider/);
});

test('the Text row header exposes only native-v3 global animation controls', () => {
  assert.deepEqual(
    ABOUT_NARRATIVE_TEXT_TRACK_CONTROL_GROUPS.map((group) => group.id),
    ['text-path', 'text-clarity', 'text-depth', 'text-editorial'],
  );
  const exposedControls = ABOUT_NARRATIVE_GLOBAL_CONTROLS.flatMap((group) => group.controls)
    .filter((control) => control.group?.startsWith('text-'));
  assert.deepEqual(
    exposedControls.map((control) => control.id),
    [
      'readingWidthRem',
      'editorialRevealThreshold',
      'startY',
      'openerStartY',
      'endY',
      'readableStart',
      'readableEnd',
      'maxBlur',
      'perspective',
      'entryDepth',
      'exitDepth',
    ],
  );
  const durationScale = ABOUT_NARRATIVE_GLOBAL_CONTROLS
    .find((group) => group.id === 'textMotion').controls
    .find((control) => control.id === 'durationScale');
  assert.equal(durationScale.group, '');
  assert.match(liveSources.editor, /selection\.type === 'track' && selection\.id === 'text'/);
  assert.match(liveSources.editor, /<TextTrackInspector snapshot=\{snapshot\} store=\{store\}/);
  assert.match(liveSources.editor, /data-track-settings="text"/);
  assert.match(liveSources.editor, /Each Title’s duration remains its start–end width on the timeline/);
});

test('the Camera row exposes global distance fog and protected boundary poses remain editable', () => {
  assert.deepEqual(
    ABOUT_NARRATIVE_CAMERA_TRACK_CONTROL_GROUPS.map((group) => group.id),
    ['camera-travel', 'camera-fog'],
  );
  const controls = ABOUT_NARRATIVE_GLOBAL_CONTROLS
    .find((group) => group.id === 'camera').controls;
  assert.deepEqual(
    controls.map((control) => control.id),
    ['cadence', 'fov', 'distanceFogStartWU', 'distanceFogEndWU'],
  );
  assert.equal(canonical.globals.camera.distanceFogStartWU, 8);
  assert.equal(canonical.globals.camera.distanceFogEndWU, 18);
  assert.ok(canonical.globals.camera.distanceFogStartWU < canonical.globals.camera.distanceFogEndWU);
  const previousDraft = structuredClone(canonical);
  delete previousDraft.globals.camera.distanceFogStartWU;
  delete previousDraft.globals.camera.distanceFogEndWU;
  assert.equal(
    validateAboutNarrativeTrackDocument(previousDraft).some((item) => item.level === 'error'),
    false,
  );
  const invalidFog = structuredClone(canonical);
  invalidFog.globals.camera.distanceFogStartWU = invalidFog.globals.camera.distanceFogEndWU;
  assert.ok(validateAboutNarrativeTrackDocument(invalidFog).some(
    (item) => item.code === 'global-camera-fog-order',
  ));
  assert.match(liveSources.editor, /data-track-settings="camera"/);
  assert.match(liveSources.editor, /Global camera &amp; depth fog/);
  assert.match(liveSources.editor, /protected start\/end keys keep their timing fixed but their pose remains editable/);
  assert.match(liveSources.world, /float cameraDepth = max\(0\.0, -viewPoint\.z\)/);
  assert.match(liveSources.world, /presence \*= 1\.0 - distanceFog/);
});

test('B forms a denser moving field and the Camera flies straight through it', () => {
  const complexity = canonical.tracks.worlds.objects.find((world) => world.id === 'world-complexity');
  assert.deepEqual(complexity.shapeParameters, {
    width: 9.2,
    height: 6.4,
    depth: 16,
    chunkCount: 11,
    chunkSize: 2.3,
    scatter: 0.14,
    turbulence: 0.42,
    density: 0.38,
  });
  assert.equal(complexity.modifiers[0].id, 'swarm-life-v1');
  assert.equal(complexity.modifiers[0].parameters.strength, 1.5);

  const keys = new Map(canonical.tracks.camera.keys.map((key) => [key.id, key]));
  const flyThrough = [
    'camera-promise-0',
    'camera-complexity-0',
    'camera-complexity-1',
  ].map((id) => keys.get(id));
  flyThrough.forEach((key) => {
    assert.equal(key.offset[0], 0);
    assert.deepEqual(key.lookAtOffset, [0, 0, -1]);
  });
  const cameraZ = (key) => canonical.globals.camera.startZ
    - (key.atWU * canonical.globals.camera.cadence)
    + key.offset[2];
  const flyThroughZ = flyThrough.map(cameraZ);
  assert.ok(flyThroughZ.every((value, index) => index === 0 || value < flyThroughZ[index - 1]));
  assert.deepEqual(flyThrough[0].offset, [0, 0, -2.4]);
  assert.equal(flyThrough[0].easing, 'linear');
  const openingPlan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  let previousZ = Number.POSITIVE_INFINITY;
  for (let storyWU = 0; storyWU <= flyThrough.at(-1).atWU; storyWU += 0.005) {
    const frame = sampleAboutNarrativeRuntimePlan(openingPlan, storyWU);
    assert.ok(frame.camera.position[2] <= previousZ + 0.000001, `Opening Camera reversed at ${storyWU.toFixed(3)} WU.`);
    previousZ = frame.camera.position[2];
  }
});

test('C and D keep one top-down grid while the Camera moves continuously across it', () => {
  const keys = new Map(canonical.tracks.camera.keys.map((key) => [key.id, key]));
  const background = canonical.tracks.worlds.objects.find((world) => world.id === 'world-background');
  const bookend = keys.get('camera-grid-bookend-0');
  const reveal = keys.get('camera-practice-reveal-0');
  const editorial = keys.get('camera-disciplines-0');
  assert.equal(bookend.atWU, 9.602);
  assert.equal(reveal.atWU, 10.45);
  assert.deepEqual(editorial.offset, [0, 0.9, 6.35]);
  const downwardKeys = [
    'camera-background-1-2',
    'camera-grid-bookend-0',
    'camera-practice-reveal-0',
    'camera-disciplines-0',
    'camera-disciplines-exit',
  ].map((id) => keys.get(id));
  downwardKeys.forEach((key) => {
    assert.equal(key.offset[1], 0.9);
    assert.deepEqual(key.lookAtOffset, [0, -90, -6]);
  });
  downwardKeys.slice(0, -1).forEach((key) => assert.equal(key.easing, 'linear'));
  const cameraZ = (key) => canonical.globals.camera.startZ
    - (key.atWU * canonical.globals.camera.cadence)
    + key.offset[2];
  const downwardZ = downwardKeys.map(cameraZ);
  assert.ok(downwardZ.every((value, index) => index === 0 || value > downwardZ[index - 1]));
  assert.ok(downwardKeys.every((key, index) => index === 0 || key.fov >= downwardKeys[index - 1].fov));

  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  let previousZ = Number.NEGATIVE_INFINITY;
  let previousFov = Number.NEGATIVE_INFINITY;
  for (let storyWU = downwardKeys[0].atWU; storyWU <= downwardKeys.at(-1).atWU; storyWU += 0.005) {
    const frame = sampleAboutNarrativeRuntimePlan(plan, storyWU);
    assert.ok(frame.camera.position[2] >= previousZ - 0.000001, `Camera reversed at ${storyWU.toFixed(3)} WU.`);
    assert.ok(frame.camera.fov >= previousFov - 0.000001, `Camera FOV tightened at ${storyWU.toFixed(3)} WU.`);
    previousZ = frame.camera.position[2];
    previousFov = frame.camera.fov;
  }

  const verticalPositions = ABOUT_NARRATIVE_DISCIPLINE_ANCHORS.map((anchor) => anchor.y);
  assert.equal(new Set(verticalPositions).size, 6);
  assert.ok(verticalPositions[0] >= 0.918);
  assert.ok(verticalPositions.at(-1) - verticalPositions[0] >= 0.08);

  const mobileCamera = canonical.profiles.mobile.overrides.camera;
  assert.deepEqual(mobileCamera, {});
  assert.deepEqual(canonical.profiles.tablet.overrides.camera, {});
  assert.equal(background.transform.mobileZOffset, 2.4);
  for (const layoutProfile of ['tablet', 'mobile']) {
    const compactPlan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile });
    const compactBackground = compactPlan.worlds.find((world) => world.id === 'world-background');
    assert.equal(compactPlan.pointProfile, 'mobile');
    assert.equal(compactBackground.transform.mobileZOffset, 2.4);
    if (layoutProfile === 'mobile') assert.equal(compactBackground.transform.mobileXScale, 0.18);
  }
  assert.equal(canonical.profiles.mobile.overrides.worlds['world-discipline-isolation'], undefined);
});

test('D is a dedicated Discipline reveal Motion and the ripple starts only in E', () => {
  const reveal = canonical.tracks.interactions.clips.find((item) => item.type === 'discipline-reveal');
  const clip = canonical.tracks.interactions.clips.find((item) => item.id === 'interaction-grid-ripple');
  const world = canonical.tracks.worlds.objects.find((item) => item.id === clip?.targetWorldId);
  const nextWorld = canonical.tracks.worlds.objects.find((item) => item.startWU > world?.startWU);
  assert.ok(ABOUT_NARRATIVE_INTERACTION_DEFINITIONS['discipline-reveal']);
  assert.ok(ABOUT_NARRATIVE_INTERACTION_DEFINITIONS['grid-ripple']);
  assert.ok(reveal);
  assert.ok(clip);
  assert.equal(reveal.targetWorldId, 'world-background');
  assert.equal(reveal.parameters.items.length, 6);
  assert.equal(reveal.parameters.fieldFogStrength, 0.12);
  assert.equal(clip.type, 'grid-ripple');
  assert.equal(clip.targetWorldId, 'world-bringing-life');
  assert.equal(clip.startWU, 15.05);
  assert.equal(clip.activationWU, 15.65);
  assert.ok(clip.startWU >= world.startWU);
  assert.ok(clip.endWU <= nextWorld.startWU);
  assert.ok(clip.startWU <= clip.activationWU && clip.activationWU < clip.endWU);
  assert.ok(clip.parameters.amplitude > 0);
  assert.ok(clip.parameters.speed > 0);
  assert.match(liveSources.world, /gridRippleWeight/);
  assert.match(liveSources.world, /worldPoint\.y \+= gridRippleWeight \* gridRippleAmplitude/);
  assert.match(liveSources.editor, /getGridRippleStartControl\(snapshot\.document, object\)/);
  assert.match(liveSources.editor, /ariaLabel="Ripple starts"/);
  assert.match(liveSources.editor, /Move ripple start/);
  assert.match(liveSources.editor, /Number\(value\) \+ attackWU/);
});

test('every title uses one timeline duration and title sets use one gap', () => {
  const fieldsById = new Map(canonical.tracks.text.fields.map((field) => [field.id, field]));
  const titles = canonical.tracks.text.fields.filter((field) => field.kind === 'title');
  titles.forEach((field) => {
    assert.equal(Number((field.endWU - field.startWU).toFixed(4)), 0.8, `${field.id} duration`);
    assert.equal(Number((field.focusWU - field.startWU).toFixed(4)), 0.4, `${field.id} entry timing`);
    assert.equal(Number((field.endWU - field.focusWU).toFixed(4)), 0.4, `${field.id} exit timing`);
    assert.equal(field.movement, 'spatial', `${field.id} movement`);
  });

  const titleSets = [
    ['text-complexity-idea', 'text-complexity-conditions', 'text-complexity-direction'],
    ['text-complexity-curiosity', 'text-complexity-listen', 'text-complexity-focus'],
    ['text-life-momentum', 'text-life-form'],
  ];
  titleSets.forEach((ids) => ids.slice(1).forEach((id, index) => {
    const previous = fieldsById.get(ids[index]);
    const current = fieldsById.get(id);
    assert.equal(Number((current.startWU - previous.endWU).toFixed(4)), 0.3, `${id} gap`);
  }));
});

test('the narrative uses the approved A-E title, editorial, logo, and discipline structure', () => {
  const fields = canonical.tracks.text.fields;
  assert.deepEqual(
    fields.map((field) => [field.id, field.kind]),
    [
      ['text-promise-main', 'title'],
      ['text-complexity-idea', 'title'],
      ['text-complexity-conditions', 'title'],
      ['text-complexity-direction', 'title'],
      ['text-background-editorial', 'scroll-block'],
      ['text-background-clients', 'scroll-block'],
      ['text-complexity-curiosity', 'title'],
      ['text-complexity-listen', 'title'],
      ['text-complexity-focus', 'title'],
      ['text-disciplines-title', 'scroll-block'],
      ['text-life-momentum', 'title'],
      ['text-life-form', 'title'],
      ['text-role-highlight', 'scroll-block'],
      ['text-epilogue-invitation', 'title'],
    ],
  );

  const passages = [
    ['reading', 'text-background-editorial', 6],
    ['disciplines', 'text-disciplines-title', 4],
    ['exit', 'text-role-highlight', 3],
  ];
  passages.forEach(([layout, id, lineCount]) => {
    const field = fields.find((candidate) => candidate.id === id);
    assert.equal(field.presentation?.layout, layout);
    assert.equal(field.kind, 'scroll-block');
    assert.equal(field.block.text.split('\n').length, lineCount);
    const emphasizedWords = field.block.emphasis
      .flatMap((item) => item.text.trim().split(/\s+/));
    assert.equal(emphasizedWords.length, 2);
    field.block.emphasis.forEach((item) => {
      assert.ok(field.block.text.includes(item.text));
    });
  });
  assert.equal(fields.filter((field) => field.block?.id?.endsWith('-passage')).length, 3);
  assert.doesNotMatch(liveSources.experience, /data-emphasis-tone/);
  assert.match(liveSources.experience, /<p[\s\S]*about-narrative-editorial-copy about-narrative-editorial-passage/);
  assert.match(liveSources.experience, /<span data-editorial-line/);
  assert.doesNotMatch(liveSources.styles, /--about-emphasis-(?:blue|green|orange)/);
  assert.match(liveSources.styles, /--about-editorial-ink:/);
  assert.match(liveSources.styles, /--about-editorial-strong-ink: var\(--text-primary\)/);
  assert.equal(canonical.globals.editorialRevealThreshold, 0.8);
  assert.match(liveSources.timeline, /getAboutNarrativeEditorialReveal\(/);
  assert.match(liveSources.timeline, /Number\(record\.startScrollWU\) \+ threshold - scrollWU/);
  assert.doesNotMatch(liveSources.timeline, /Number\(record\.field\.(?:startWU|focusWU)\) \+ threshold - scrollWU/);
  assert.match(liveSources.timeline, /startScrollWU: Number\(span\.scrollBounds\.startWU\)/);
  assert.match(liveSources.timeline, /viewportHeight \* 0\.08/);
  assert.match(liveSources.timeline, /editorialNode\.offsetTop - node\.offsetTop/);
  assert.match(liveSources.timeline, /scrollWUFromStoryWU\(frame\.storyWU\)/);
  assert.doesNotMatch(liveSources.timeline, /sequentialPassage/);
  assert.match(liveSources.styles, /gap: 1\.1em/);
  assert.match(liveSources.styles, /var\(--render-span-start-wu, 0\) \+ var\(--about-editorial-reveal-threshold, 0\.8\)/);
  assert.doesNotMatch(liveSources.styles, /var\(--render-span-focus-wu, 0\) \+ var\(--about-editorial-reveal-threshold, 0\.8\)/);
  assert.match(liveSources.styles, /--about-editorial-type-size: clamp\(1\.4375rem/);
});

test('editorial markers own first reveal onset in every responsive Scroll WU profile', () => {
  for (const layoutProfile of ['desktop', 'tablet', 'mobile']) {
    const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile });
    const logos = plan.renderSpans.find((span) => span.fieldIds.includes('text-background-clients'));
    const startScrollWU = logos.scrollBounds.startWU;
    const record = { startScrollWU, layoutOffsetPx: 0 };
    const viewportHeight = layoutProfile === 'mobile' ? 844 : 900;
    const atMarker = getAboutNarrativeEditorialReveal(
      record,
      startScrollWU,
      viewportHeight,
      canonical.globals.editorialRevealThreshold,
      false,
    );
    const entering = getAboutNarrativeEditorialReveal(
      record,
      startScrollWU + 0.04,
      viewportHeight,
      canonical.globals.editorialRevealThreshold,
      false,
    );
    assert.ok(atMarker <= 0.000001, `${layoutProfile} marker must begin the reveal`);
    assert.ok(entering > 0 && entering < 1, `${layoutProfile} must reveal immediately after its marker`);
  }
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
