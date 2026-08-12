import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  compileAboutNarrativeRuntimePlan,
  sampleAboutNarrativeRuntimePlan,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';
import {
  getAboutNarrativeEditorialReveal,
  getAboutNarrativeOpeningScrollCueOpacity,
} from '../react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js';
import {
  getAboutNarrativeReadingOrderRevealMetrics,
  getAboutNarrativeSharedRevealProgress,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeReveal.js';
import { validateAboutNarrativeTrackDocument } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackSchema.js';
import { loadAboutNarrativeTrackSource } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackPersistence.js';
import {
  projectAboutNarrativePointFieldDocumentToVersion5,
  validateAboutNarrativePointFieldDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';
import {
  ABOUT_NARRATIVE_CAMERA_KEY_CONTROLS,
  ABOUT_NARRATIVE_CAMERA_RIG_CONTROLS,
  ABOUT_NARRATIVE_CAMERA_TRACK_CONTROL_GROUPS,
  ABOUT_NARRATIVE_DISCIPLINE_ANCHORS,
  ABOUT_NARRATIVE_DISCIPLINE_MOBILE_ANCHORS,
  ABOUT_NARRATIVE_GLOBAL_CONTROLS,
  ABOUT_NARRATIVE_INTERACTION_DEFINITIONS,
  ABOUT_NARRATIVE_MODIFIER_DEFINITIONS,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
  ABOUT_NARRATIVE_TEXT_TRACK_CONTROL_GROUPS,
  ABOUT_NARRATIVE_WORLD_CONTROL_GROUPS,
  getAboutNarrativeDisciplineAnchors,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const canonicalSource = await read('../react-app/app/public/config/contents-about.json');
const canonicalV6 = JSON.parse(canonicalSource);
const loadedCanonical = loadAboutNarrativeTrackSource(
  projectAboutNarrativePointFieldDocumentToVersion5(canonicalV6),
);
assert.equal(loadedCanonical.valid, true);
const canonical = loadedCanonical.document;
const acceptedScriptSource = await read('../docs/research/about-page-direction/preparation/ABOUT-NARRATIVE-SPOKEN-DRAFT-v4-CURRENT.md');
const legacy = JSON.parse(await read('./fixtures/about-narrative/contents-about-v2.json'));
const liveSources = Object.fromEntries(await Promise.all([
  ['experience', '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx'],
  ['timeline', '../react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js'],
  ['reveal', '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeReveal.js'],
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

function assertCameraValue(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) < 0.00001,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

test('discipline formation controls reposition desktop semantic dots without moving mobile', () => {
  const controls = ABOUT_NARRATIVE_INTERACTION_DEFINITIONS['discipline-reveal'].parameters
    .filter((control) => control.group === 'modifier-placement');
  assert.deepEqual(controls.map((control) => control.id), [
    'formationColumn',
    'formationRow',
  ]);
  assert.ok(controls.every((control) => control.step === 1));

  const moved = getAboutNarrativeDisciplineAnchors('desktop', {
    formationColumn: 64,
    formationRow: 22,
  });
  assert.deepEqual(moved.map((anchor) => Math.round(anchor.x * 126)), [
    64, 73, 64, 73, 64, 73,
  ]);
  assert.deepEqual(moved.map((anchor) => Math.round(anchor.y * 94)), [
    22, 22, 24, 24, 26, 26,
  ]);
  assert.equal(
    getAboutNarrativeDisciplineAnchors('mobile', {
      formationColumn: 64,
      formationRow: 22,
    }),
    ABOUT_NARRATIVE_DISCIPLINE_MOBILE_ANCHORS,
  );

  const reveal = canonicalV6.tracks.interactions.clips.find((clip) => (
    clip.type === 'discipline-reveal'
  ));
  assert.equal(reveal.parameters.formationColumn, 43);
  assert.equal(reveal.parameters.formationRow, 54);
});

test('canonical About source is native v6 with a valid v5 compatibility projection', () => {
  assert.equal(canonicalV6.schemaVersion, 6);
  assert.equal(canonical.schemaVersion, 5);
  assert.deepEqual(loadedCanonical.migrations, []);
  assert.equal(legacy.schemaVersion, 2, 'The frozen parity fixture must remain legacy v2.');
  assert.deepEqual(collectForbiddenContainers(canonicalV6), []);
  assert.deepEqual(collectForbiddenContainers(canonical), []);
  assert.equal(validateAboutNarrativePointFieldDocument(canonicalV6).filter((item) => item.level === 'error').length, 0);
  assert.equal(validateAboutNarrativeTrackDocument(canonical).filter((item) => item.level === 'error').length, 0);
  assert.match(canonicalSource, /"tracks": \{/);
  assert.doesNotMatch(canonicalSource, /"sections"\s*:/);
  const bookends = canonical.tracks.text.fields.filter((field) => (
    ['opener-v1', 'finale-v1'].includes(field.preset)
  ));
  assert.equal(canonical.globals.textMotion.bookendViewportY, 70);
  bookends.forEach((field) => {
    assert.equal(field.presentation.viewportY, undefined);
  });
});

test('canonical About source authors one consolidated camera, visibility, and four-World bust sequence', () => {
  const cameraKeys = canonical.tracks.camera.keys;
  const visibilityKeys = canonical.tracks.visibility.keys;
  const worlds = canonical.tracks.worlds.objects;
  const reveal = canonical.tracks.interactions.clips.find((clip) => clip.type === 'discipline-reveal');
  const ripple = canonical.tracks.interactions.clips.find((clip) => clip.type === 'grid-ripple');
  const grid = worlds.find((world) => world.id === ripple?.targetWorldId);
  const emergent = worlds.find((world) => world.id === 'world-emergent');

  assert.ok(reveal);
  assert.ok(ripple);
  assert.equal(cameraKeys.length, 9);
  [
    'orb-establish',
    'complexity-exit',
    'grid-birds-eye-2',
    'discipline-travel-start',
    'discipline-hold',
    'grid-return-centered',
    'ripple-overhead-hold',
    'finale-resolved-hold',
    'finale-hold',
  ].forEach((id) => assert.ok(cameraKeys.some((key) => key.id === id), `Missing authored camera key ${id}`));
  assert.deepEqual(
    canonical.tracks.camera.orientationKeys.map((key) => key.id),
    ['discipline-tilt-start', 'discipline-tilt-end', 'discipline-tilt-hold'],
  );
  [
    'complexity-exit-2',
    'emergent-orbit-quarter',
    'emergent-orbit-rear',
    'emergent-orbit-three-quarter',
  ].forEach((id) => assert.equal(cameraKeys.some((key) => key.id === id), false));
  const finaleHold = cameraKeys.find((key) => key.id === 'finale-hold');
  const finalWorldKeyWU = canonicalV6.tracks.pointField.keys.at(-1).atWU;
  assert.ok(finaleHold);
  assert.equal(finaleHold.aimEnabled, true);
  assert.equal(finaleHold.atWU, finalWorldKeyWU);
  assert.equal(finaleHold.atWU, canonical.profiles.desktop.storyDurationWU);
  assert.equal(cameraKeys.some((key) => /orbital|bust/.test(key.id)), false);
  cameraKeys.forEach((key) => {
    ['aimEnabled', 'atWU', 'easing', 'fov', 'id', 'locked', 'lookAtRoll', 'lookAtTarget', 'position', 'rotation']
      .forEach((field) => assert.equal(Object.hasOwn(key, field), true));
    assert.equal(typeof key.aimEnabled, 'boolean');
    assert.equal(key.lookAtTarget.length, 3);
    assert.equal(Number.isFinite(key.lookAtRoll), true);
  });
  assert.equal(visibilityKeys.length, 10);
  assert.equal(visibilityKeys[0].atWU, 0);
  assert.equal(visibilityKeys.at(-1).atWU, finalWorldKeyWU);
  assert.ok(visibilityKeys.some((key) => key.visibility === 0));
  assert.ok(visibilityKeys.some((key) => key.visibility === 1));
  const returnedVisibility = visibilityKeys.find((key) => key.id === 'visibility-returned');
  const endVisibility = visibilityKeys.find((key) => key.id === 'visibility-end');
  assert.equal(visibilityKeys.some((key) => (
    key.atWU > returnedVisibility.atWU && key.atWU < endVisibility.atWU
  )), false);
  assert.deepEqual(
    visibilityKeys.find((key) => key.id === 'visibility-discipline-read'),
    {
      id: 'visibility-discipline-read',
      atWU: 10.85,
      visibility: 1,
      easing: 'smoothstep',
      locked: false,
    },
  );
  assert.equal(visibilityKeys.at(-1).visibility, 1);
  visibilityKeys.forEach((key) => {
    assert.deepEqual(
      Object.keys(key).sort(),
      ['atWU', 'easing', 'id', 'locked', 'visibility'],
    );
  });

  assert.deepEqual(
    worlds.map((world) => [world.id, world.shapeId]),
    [
      ['world-promise', 'cluster-v1'],
      ['world-complexity', 'turbulent-field-v1'],
      ['world-grid', 'calm-field-v1'],
      ['world-emergent', 'bust-v1'],
    ],
  );
  assert.ok(grid);
  assert.ok(emergent);
  assert.ok(ripple.endWU <= emergent.startWU);
  assert.ok(emergent.startWU - ripple.endWU <= 0.5);
  assert.equal(emergent.transitionIn.correspondence, 'radial-emergence-v1');
  assert.equal(emergent.modifiers.some((modifier) => modifier.id === 'ambient-drift-v1'), true);
  assert.equal(emergent.modifiers.some((modifier) => modifier.id === 'bust-yaw-v1'), true);
  assert.equal(emergent.protected, true);
  assert.equal(worlds.some((world) => /orbital/.test(world.shapeId)), false);

  assert.deepEqual(
    Object.keys(canonical.globals.camera).sort(),
    ['distanceFogEndWU', 'distanceFogStartWU'],
  );
  assert.equal('fov' in canonical.globals.camera, false);
  assert.equal('centerX' in ripple.parameters, false);
  assert.equal('centerZ' in ripple.parameters, false);
  assert.equal(ripple.targetWorldId, grid.id);

  const retiredDisciplineFields = [
    'fieldTravelStartWU',
    'fieldTravelEndWU',
    'fieldTravelDurationWU',
    'fieldTravelWU',
    'fieldFogStartWU',
    'fieldFogEndWU',
    'fieldFogStrength',
    'backgroundScale',
  ];
  retiredDisciplineFields.forEach((field) => {
    assert.equal(field in (reveal?.parameters || {}), false);
    canonical.tracks.text.fields
      .filter((item) => item.kind === 'discipline-reveal')
      .forEach((item) => {
        assert.equal(field in item, false);
        assert.equal(field in (item.choreography || {}), false);
      });
  });
});

test('bust stays a single protected World across responsive profiles', () => {
  const authored = canonical.tracks.worlds.objects.find((world) => world.id === 'world-emergent');
  const grid = canonical.tracks.worlds.objects.find((world) => world.id === 'world-grid');
  const pulse = canonical.tracks.interactions.clips.find((clip) => clip.type === 'grid-ripple');
  assert.ok(authored);
  assert.ok(grid);
  assert.ok(pulse);
  assert.equal(authored.shapeId, 'bust-v1');
  assert.ok(authored.startWU >= pulse.endWU);
  assert.ok(authored.startWU - pulse.endWU <= 0.5);
  assert.equal(authored.transitionIn.startWU, authored.startWU);
  assert.ok(authored.transitionIn.endWU > authored.transitionIn.startWU);
  assert.equal(authored.transitionIn.correspondence, 'radial-emergence-v1');
  assert.equal(authored.modifiers.length, 3);
  assert.equal(authored.modifiers[0].id, 'ambient-drift-v1');
  assert.equal(authored.modifiers[1].id, 'bust-assembly-v1');
  assert.equal(authored.modifiers[2].id, 'bust-yaw-v1');
  assert.ok(authored.modifiers[2].parameters.speed > 0);
  assert.ok(authored.modifiers[2].parameters.speed <= 0.05);
  assert.deepEqual(
    Object.keys(authored.modifiers[1].parameters).sort(),
    [
      'baseStart',
      'formationMode',
      'fragmentFade',
      'fragmentFall',
      'fragmentHeight',
      'fragmentPresence',
      'fragmentReveal',
      'fragmentSpread',
      'headStart',
      'layerSoftness',
      'platformScale',
      'platformSettle',
      'submergeDepth',
      'surfaceCarry',
      'surfaceHeight',
      'waterlineSoftness',
    ],
  );
  assert.ok(authored.modifiers[1].parameters.headStart - authored.modifiers[1].parameters.baseStart >= 0.4);
  assert.ok(authored.modifiers[1].parameters.platformScale >= 2);
  assert.ok(authored.modifiers[1].parameters.platformScale <= 3);
  assert.ok(authored.modifiers[1].parameters.platformSettle <= 0.3);
  assert.equal(authored.modifiers[1].parameters.formationMode, 'surface-rise');
  assert.ok(authored.modifiers[1].parameters.submergeDepth >= 3);
  assert.equal(authored.seed, grid.seed);
  assert.equal(authored.shapeParameters.density, 0.26);
  assert.ok(authored.shapeParameters.density < grid.shapeParameters.density);
  assert.equal(authored.modifiers[1].parameters.surfaceCarry, 1);
  assert.equal(authored.modifiers[1].parameters.fragmentPresence, 0.5);
  assert.equal(authored.protected, true);
  assert.deepEqual(authored.transform.position, [0.6, 0, 0]);
  assert.deepEqual(
    canonicalV6.profiles.mobile.overrides.pointField.stateDefinitions['world-emergent'],
    {
      transform: {
        position: [0.32, 0, 0],
      },
    },
  );

  for (const layoutProfile of ['desktop', 'tablet', 'mobile']) {
    const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile });
    const resolved = plan.worlds.find((world) => world.id === authored.id);
    assert.ok(resolved, `${layoutProfile} must retain the bust World.`);
    assert.equal(resolved.shapeId, 'bust-v1');
    assert.equal(resolved.transitionIn.correspondence, 'radial-emergence-v1');
    assert.ok(Number(resolved.transform.scale) > 0);
    if (layoutProfile === 'mobile') {
      assert.deepEqual(resolved.transform.position, [0.32, 0, 0]);
      assert.ok(Number(resolved.transform.mobileScale) > 0);
      assert.ok(Number(resolved.transform.mobileScale) < Number(resolved.transform.scale));
    } else {
      assert.deepEqual(resolved.transform.position, [0.6, 0, 0]);
    }
    for (const storyWU of [authored.startWU, authored.transitionIn.endWU, 14.85, 15.2]) {
      const frame = sampleAboutNarrativeRuntimePlan(plan, storyWU);
      assert.ok(frame.camera.position.every(Number.isFinite));
      assert.ok(frame.camera.quaternion.every(Number.isFinite));
      assert.ok(Number.isFinite(frame.camera.fov));
    }
  }
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
  assert.match(liveSources.experience, /\{runtimePlan \? \(/);
  assert.match(liveSources.experience, /pointProfile=\{runtimePlan\.pointProfile\}/);
});

test('C owns one fixed grid World and D is expressed only as Motion', () => {
  const background = canonical.tracks.worlds.objects.find((world) => world.label === 'C');
  const reveal = canonical.tracks.interactions.clips.find((clip) => clip.type === 'discipline-reveal');
  const ripple = canonical.tracks.interactions.clips.find((clip) => clip.type === 'grid-ripple');
  assert.ok(background);
  assert.ok(reveal);
  assert.ok(ripple);
  const nextWorld = canonical.tracks.worlds.objects.find((world) => world.startWU > background.startWU);
  assert.ok(nextWorld);
  assert.equal(background.shapeId, 'calm-field-v1');
  assert.equal(background.shapeParameters.width, 48);
  assert.equal(background.shapeParameters.depth, 56);
  assert.equal(background.shapeParameters.jitter, 0);
  assert.equal(background.transform.mobileScale, 1);
  assert.equal(background.transform.mobileXScale, 1);
  assert.deepEqual(background.modifiers, [{
    id: 'ambient-drift-v1',
    enabled: true,
    parameters: {
      amplitude: 0.028,
      speed: 0.55,
      timeMode: 'ambient',
    },
  }]);
  assert.equal(canonical.tracks.worlds.objects.some((world) => world.label === 'D'), false);
  assert.equal(reveal.targetWorldId, background.id);
  assert.equal(ripple.targetWorldId, background.id);
  assert.ok(reveal.startWU >= background.startWU && reveal.endWU <= ripple.startWU);
  assert.ok(ripple.endWU <= nextWorld.startWU);
  assert.ok(reveal.parameters.backgroundOpacity > 0);
  assert.equal(reveal.parameters.settleDurationWU, 0.45);
  assert.equal(reveal.parameters.beatDurationWU, 0.32);
  assert.equal(reveal.parameters.itemsPerBeat, 2);
  assert.ok(reveal.parameters.restoreDurationWU > 0);
  assert.equal(canonical.tracks.text.fields.some((field) => field.kind === 'discipline-reveal'), false);
  assert.doesNotMatch(liveSources.world, /worldDisciplineRise|resolveDisciplineStoryOffset|storyOffset/);
  assert.match(liveSources.world, /camera\.position\.fromArray\(frame\.camera\.position\)/);
  assert.match(liveSources.world, /uniforms\.fromDisciplineIsolation\.value = backgroundWeight/);
  assert.doesNotMatch(liveSources.world, /writeDisciplineSide|packDisciplineOrder|projectDisciplineAnchors/);
  assert.match(liveSources.experience, /data-motion-clip-id/);
  assert.doesNotMatch(liveSources.styles, /data-label-side='left'/);
  assert.match(liveSources.editorStyles, /\.about-narrative-motion-layer/);
});

test('editor World labels reserve D for Motion without derived-span copy', () => {
  assert.deepEqual(
    canonical.tracks.worlds.objects.map((world) => world.label),
    ['A', 'B', 'C', 'E'],
  );
  assert.doesNotMatch(liveSources.editor, /Derived to next World Start|World width is derived/);
});

test('every World exposes grouped live sliders instead of raw Shape and Modifier JSON', () => {
  assert.equal(ABOUT_NARRATIVE_WORLD_CONTROL_GROUPS.length, 11);
  assert.equal(new Set(ABOUT_NARRATIVE_WORLD_CONTROL_GROUPS.map((group) => group.id)).size, 11);
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

test('the Text row header exposes the global width and animation controls', () => {
  assert.deepEqual(
    ABOUT_NARRATIVE_TEXT_TRACK_CONTROL_GROUPS.map((group) => group.id),
    ['text-widths', 'text-layout', 'text-path', 'text-clarity', 'text-shadow', 'text-depth', 'text-editorial'],
  );
  const exposedControls = ABOUT_NARRATIVE_GLOBAL_CONTROLS.flatMap((group) => group.controls)
    .filter((control) => control.group?.startsWith('text-'));
  assert.deepEqual(
    exposedControls.map((control) => control.id),
    [
      'readingWidthRem',
      'editorialRevealThreshold',
      'fadeDurationWU',
      'standardMaxWidthCh',
      'displayMaxWidthCh',
      'standardViewportY',
      'bookendViewportY',
      'startY',
      'openerStartY',
      'endY',
      'readableStart',
      'readableEnd',
      'maxBlur',
      'titleShadowOpacity',
      'titleShadowBlurPx',
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
  assert.match(liveSources.editor, /Text windows move independently/);
  assert.match(liveSources.editor, /read-only Motion reservation/);
  assert.equal(exposedControls.find((control) => control.id === 'titleShadowOpacity')?.label, 'Background shadow opacity');
  assert.equal(exposedControls.find((control) => control.id === 'titleShadowBlurPx')?.label, 'Background shadow blur');
  assert.equal(canonical.globals.textMotion.titleShadowOpacity, 0.3);
  assert.equal(canonical.globals.textMotion.titleShadowBlurPx, 28);
  assert.match(liveSources.experience, /--about-title-shadow-opacity/);
  assert.match(liveSources.experience, /--about-title-shadow-blur/);
  assert.match(liveSources.styles, /--about-title-shadow:\s*0 0 var\(--about-title-shadow-blur, 28px\) var\(--about-title-shadow-color\);/);
  assert.equal((liveSources.styles.match(/text-shadow: var\(--about-title-shadow\)/g) || []).length, 2);
  assert.match(liveSources.editor, /data-text-flow-reservation/);
  assert.match(liveSources.editor, /object\.kind !== 'title'/);
});

test('the Camera row exposes global distance fog and every Camera key remains fully editable', () => {
  assert.deepEqual(
    ABOUT_NARRATIVE_CAMERA_TRACK_CONTROL_GROUPS.map((group) => group.id),
    ['camera-fog'],
  );
  const controls = ABOUT_NARRATIVE_GLOBAL_CONTROLS
    .find((group) => group.id === 'camera').controls;
  assert.deepEqual(
    controls.map((control) => control.id),
    ['distanceFogStartWU', 'distanceFogEndWU'],
  );
  assert.deepEqual(
    ABOUT_NARRATIVE_CAMERA_RIG_CONTROLS.map((control) => control.id),
    ['position.0', 'position.1', 'position.2', 'rotation.0', 'rotation.1', 'rotation.2', 'lookAtTarget.0', 'lookAtTarget.1', 'lookAtTarget.2', 'lookAtRoll', 'fov'],
  );
  assert.deepEqual(
    ABOUT_NARRATIVE_CAMERA_KEY_CONTROLS.map((control) => control.id),
    ['distanceFogStartWU', 'distanceFogEndWU'],
  );
  assert.ok(Number.isFinite(canonical.globals.camera.distanceFogStartWU));
  assert.ok(Number.isFinite(canonical.globals.camera.distanceFogEndWU));
  assert.ok(canonical.globals.camera.distanceFogStartWU < canonical.globals.camera.distanceFogEndWU);
  canonical.tracks.camera.keys.forEach((key) => {
    assert.equal(Object.hasOwn(key, 'distanceFogStartWU'), false);
    assert.equal(Object.hasOwn(key, 'distanceFogEndWU'), false);
    assert.equal(typeof key.aimEnabled, 'boolean');
    assert.equal(key.lookAtTarget.length, 3);
  });
  const invalidFog = structuredClone(canonical);
  invalidFog.globals.camera.distanceFogStartWU = invalidFog.globals.camera.distanceFogEndWU;
  assert.ok(validateAboutNarrativeTrackDocument(invalidFog).some(
    (item) => item.code === 'camera-fog-order',
  ));
  assert.match(liveSources.editor, /data-track-settings="camera"/);
  assert.match(liveSources.editor, /Distance fog/);
  assert.match(liveSources.editor, /Essentials/);
  assert.doesNotMatch(liveSources.editor, /Depth offset|Frame origin/);
  assert.match(liveSources.editor, /Focus anchor|Focus on 3D anchor/);
  assert.match(liveSources.editor, /Camera orbit angle/);
  assert.match(liveSources.world, /about-narrative-camera-focus-anchor/);
  assert.match(liveSources.world, /new THREE\.LineSegments/);
  assert.doesNotMatch(liveSources.world, /about-narrative-camera-target/);
  assert.doesNotMatch(liveSources.editorStyles, /\.about-narrative-camera-target/);
  assert.match(liveSources.editor, /Distance fog is global across the sequence/);
  assert.doesNotMatch(liveSources.editor, /Timing fixed · Pose editable/);
  assert.match(liveSources.editor, /CAMERA_SELECTION_TYPES/);
  assert.match(liveSources.world, /float cameraDepth = max\(0\.0, -viewPoint\.z\)/);
  assert.match(liveSources.world, /presence \*= 1\.0 - distanceFog/);
});

test('B forms a denser moving field before the saved grid flyover', () => {
  const complexity = canonical.tracks.worlds.objects.find((world) => world.id === 'world-complexity');
  assert.deepEqual(complexity.shapeParameters, {
    width: 10.5,
    height: 13.8,
    depth: 38.6,
    chunkCount: 30,
    chunkSize: 7.55,
    scatter: 0.14,
    turbulence: 0.42,
    density: 0.33,
  });
  assert.equal(complexity.modifiers[0].id, 'swarm-life-v1');
  assert.equal(complexity.modifiers[0].parameters.strength, 1.5);

  const keys = new Map(canonical.tracks.camera.keys.map((key) => [key.id, key]));
  const flyThrough = [
    'orb-establish',
    'complexity-exit',
  ].map((id) => keys.get(id));
  flyThrough.forEach((key) => {
    assert.ok(key);
    assert.equal(key.position[0], 0);
    [...key.position, ...key.rotation].forEach((value) => assert.ok(Number.isFinite(value)));
  });
  const cameraZ = (key) => key.position[2];
  const flyThroughZ = flyThrough.map(cameraZ);
  assert.ok(flyThroughZ[1] < flyThroughZ[0]);
  assert.ok(flyThrough[0].position[2] > 0);
  assert.ok(flyThrough.at(-1).position[2] < 0);
  const gridFlyover = [keys.get('grid-birds-eye-2'), keys.get('discipline-travel-start')];
  assert.deepEqual(gridFlyover.map((key) => key.position), [
    [-5, 0.2, -40],
    [-5, 3.14, -4.51],
  ]);
  assert.ok(gridFlyover[1].position[2] > gridFlyover[0].position[2]);
  const openingPlan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  for (let storyWU = 0; storyWU <= flyThrough.at(-1).atWU; storyWU += 0.005) {
    const frame = sampleAboutNarrativeRuntimePlan(openingPlan, storyWU);
    assert.ok(Number.isFinite(frame.camera.position[2]), `Opening Camera is invalid at ${storyWU.toFixed(3)} WU.`);
  }
  const mobileOpeningPlan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'mobile' });
  const mobileOrb = mobileOpeningPlan.cameraKeys.find((key) => key.id === 'orb-establish');
  assert.equal(mobileOrb.aimEnabled, false);
  assert.deepEqual(mobileOrb.position, [0, 0.98, 5.2]);
});

test('Camera keys retain clean finite authored transforms', () => {
  canonical.tracks.camera.keys.forEach((key) => {
    assert.equal(key.rotation[2], 0, `${key.id} Rotation Z should keep a level horizon`);
    [...key.position, ...key.rotation].forEach((value) => assert.ok(Number.isFinite(value)));
    assert.equal('offset' in key, false);
    assert.equal('lookAtOffset' in key, false);
    assert.equal('roll' in key, false);
  });
});

test('World C keeps one backward flyover through the floor turn and Discipline reading pass', () => {
  const keys = new Map(canonical.tracks.camera.keys.map((key) => [key.id, key]));
  const background = canonical.tracks.worlds.objects.find((world) => world.label === 'C');
  assert.ok(background);
  const rippleCenter = [
    background.transform.position[0],
    background.transform.position[1]
      + (background.shapeParameters.height * background.transform.scale),
    canonical.globals.worldRail.originZ
      - (background.anchorWU * canonical.globals.worldRail.unitsPerWU)
      - background.entryDistanceWU
      + background.transform.position[2],
  ];
  const gridFlyoverIds = [
    'grid-birds-eye-2',
    'discipline-travel-start',
  ];
  const disciplineTravelIds = [
    'discipline-travel-start',
    'discipline-hold',
  ];
  const targetedIds = [
    'grid-return-centered',
    'ripple-overhead-hold',
    'finale-resolved-hold',
    'finale-hold',
  ];
  const gridFlyoverKeys = gridFlyoverIds.map((id) => keys.get(id));
  gridFlyoverKeys.forEach((key) => {
    assert.ok(key);
    assert.equal(key.aimEnabled, false);
    assert.equal(key.rotation[1], 0);
    assert.equal(key.rotation[2], 0);
    assert.equal(key.lookAtRoll, 0);
  });
  assert.deepEqual(gridFlyoverKeys.map((key) => key.position), [
    [-5, 0.2, -40],
    [-5, 3.14, -4.51],
  ]);
  assert.deepEqual(gridFlyoverKeys.map((key) => key.rotation), [
    [-2.3, 0, 0],
    [-2.3, 0, 0],
  ]);
  assert.equal(gridFlyoverKeys[0].easing, 'cubic-bezier(0.32, 0, 0.18, 1)');
  assert.equal(gridFlyoverKeys[1].easing, 'linear');
  const disciplineTravelKeys = disciplineTravelIds.map((id) => keys.get(id));
  disciplineTravelKeys.forEach((key) => {
    assert.ok(key);
    assert.equal(key.aimEnabled, false);
    assert.equal(key.lookAtRoll, 0);
  });
  assert.deepEqual(disciplineTravelKeys.map((key) => key.position), [
    [-5, 3.14, -4.51],
    [-5, 3.14, -1.75],
  ]);
  assert.ok(keys.get('discipline-hold').position[2] > keys.get('discipline-travel-start').position[2]);
  assert.equal(keys.has('editorial-camera-hold'), false);
  const orientationKeys = new Map(canonical.tracks.camera.orientationKeys.map((key) => [key.id, key]));
  const travelStart = keys.get('discipline-travel-start');
  const pitchStart = orientationKeys.get('discipline-tilt-start');
  const shift = orientationKeys.get('discipline-tilt-end');
  assert.deepEqual(pitchStart.rotation, [-2.3, 0, 0]);
  assert.deepEqual(shift.rotation, [-90, 0, 0]);
  assert.ok(travelStart.atWU < pitchStart.atWU, 'Constant travel must be established before the tilt begins.');
  const reveal = canonical.tracks.interactions.clips.find((clip) => clip.type === 'discipline-reveal');
  const disciplineBeatStartWU = reveal.startWU + reveal.parameters.settleDurationWU;
  assertCameraValue(shift.atWU, disciplineBeatStartWU, 'Discipline beat start');
  assert.ok(shift.atWU > reveal.startWU);
  assert.ok(shift.atWU < reveal.endWU);
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  const firstFrame = sampleAboutNarrativeRuntimePlan(plan, shift.atWU);
  const disciplineHold = keys.get('discipline-hold');
  let previousDisciplineCameraZ = travelStart.position[2];
  for (let storyWU = travelStart.atWU; storyWU <= disciplineHold.atWU + 0.000001; storyWU += 0.025) {
    const frame = sampleAboutNarrativeRuntimePlan(plan, storyWU);
    assert.equal(frame.camera.targeted, false);
    assertCameraValue(frame.camera.aimWeight, 0, 'Discipline camera aim weight');
    assertCameraValue(frame.camera.position[0], -5, 'Discipline camera X');
    assert.ok(
      frame.camera.position[2] >= previousDisciplineCameraZ - 0.000001,
      'Discipline camera must continue backward without a Z reversal.',
    );
    if (storyWU >= shift.atWU - 0.000001) {
      assertCameraValue(frame.camera.position[1], travelStart.position[1], 'Top-down Discipline camera Y');
      assert.deepEqual(frame.camera.quaternion, firstFrame.camera.quaternion);
    }
    previousDisciplineCameraZ = frame.camera.position[2];
  }
  assert.equal(disciplineHold.position[1], travelStart.position[1]);
  assert.ok(disciplineHold.position[2] > travelStart.position[2]);
  const gridReturn = keys.get('grid-return-centered');
  const hiddenReframeMidpoint = sampleAboutNarrativeRuntimePlan(
    plan,
    disciplineHold.atWU + ((gridReturn.atWU - disciplineHold.atWU) * 0.5),
  );
  assert.equal(sampleAboutNarrativeRuntimePlan(plan, disciplineHold.atWU).simulation.visibility, 0);
  assert.equal(hiddenReframeMidpoint.simulation.visibility, 0);
  assert.notDeepEqual(hiddenReframeMidpoint.camera.position, disciplineHold.position);

  const getCameraRadius = (position, target) => Math.hypot(
    position[0] - target[0],
    position[1] - target[1],
    position[2] - target[2],
  );
  const getCameraOrbitAngle = (position, origin, target) => {
    const originOffset = origin.map((value, index) => value - target[index]);
    const positionOffset = position.map((value, index) => value - target[index]);
    const denominator = Math.hypot(...originOffset) * Math.hypot(...positionOffset);
    const dot = originOffset.reduce((sum, value, index) => (
      sum + (value * positionOffset[index])
    ), 0);
    return Math.acos(Math.min(1, Math.max(-1, dot / denominator)));
  };
  const assertConstantOrbit = (layoutProfile) => {
    const orbitPlan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile });
    const orbitKeys = new Map(orbitPlan.cameraKeys.map((key) => [key.id, key]));
    const orbitKeyList = targetedIds.map((id) => orbitKeys.get(id));
    const expectedTarget = layoutProfile === 'mobile'
      ? [-0.23, -0.95, -7.035]
      : [0, -1.8, -7.035];
    orbitKeyList.forEach((key) => {
      assert.ok(key);
      assert.equal(key.aimEnabled, true);
      assert.equal(key.lookAtRoll, 0);
      assert.equal(key.easing, key.id === 'finale-resolved-hold' ? 'smoothstep' : 'linear');
      assert.deepEqual(key.lookAtTarget, expectedTarget);
    });

    const orbitStart = orbitKeyList[0];
    const orbitEnd = orbitKeyList.at(-1);
    const orbitRadius = getCameraRadius(orbitStart.position, expectedTarget);
    const totalOrbitAngle = getCameraOrbitAngle(
      orbitEnd.position,
      orbitStart.position,
      expectedTarget,
    );
    assert.ok(totalOrbitAngle > 0, `${layoutProfile} orbit must travel sideways.`);
    let previousKeyAngle = -1;
    orbitKeyList.forEach((key) => {
      const angle = getCameraOrbitAngle(key.position, orbitStart.position, expectedTarget);
      assertCameraValue(
        getCameraRadius(key.position, expectedTarget),
        orbitRadius,
        `${layoutProfile} orbit radius at ${key.id}`,
      );
      assert.ok(
        angle + 0.000001 >= previousKeyAngle,
        `${layoutProfile} orbit angle must not reverse at ${key.id}`,
      );
      previousKeyAngle = angle;
    });
    assert.deepEqual(orbitKeyList.at(-2).position, orbitEnd.position);

    let previousSampleAngle = -1;
    for (let storyWU = orbitStart.atWU; storyWU <= orbitEnd.atWU; storyWU += 0.05) {
      const frame = sampleAboutNarrativeRuntimePlan(orbitPlan, storyWU);
      assert.equal(frame.camera.targeted, true);
      assert.equal(frame.camera.aimWeight, 1);
      frame.camera.lookAtTarget.forEach((value, index) => {
        assertCameraValue(value, expectedTarget[index], `${layoutProfile} orbit target ${index}`);
      });
      assertCameraValue(
        getCameraRadius(frame.camera.position, expectedTarget),
        orbitRadius,
        `${layoutProfile} sampled orbit radius`,
      );
      const sampleAngle = getCameraOrbitAngle(
        frame.camera.position,
        orbitStart.position,
        expectedTarget,
      );
      assert.ok(sampleAngle + 0.000001 >= previousSampleAngle, `${layoutProfile} sampled orbit must not reverse`);
      assert.ok(sampleAngle <= totalOrbitAngle + 0.000001, `${layoutProfile} sampled orbit must not overshoot`);
      previousSampleAngle = sampleAngle;
    }
    return { orbitKeys, orbitPlan };
  };
  ['desktop', 'tablet', 'mobile'].forEach(assertConstantOrbit);

  const rippleBoundaryWU = keys.get('ripple-overhead-hold').atWU;
  const beforeRippleBoundary = sampleAboutNarrativeRuntimePlan(plan, rippleBoundaryWU - 0.005);
  const afterRippleBoundary = sampleAboutNarrativeRuntimePlan(plan, rippleBoundaryWU + 0.005);
  const rippleBoundaryQuaternionDot = beforeRippleBoundary.camera.quaternion.reduce(
    (sum, value, index) => sum + (value * afterRippleBoundary.camera.quaternion[index]),
    0,
  );
  assert.ok(
    Math.abs(rippleBoundaryQuaternionDot) > 0.999999,
    'The sideways orbit must remain smooth across its midpoint.',
  );
  const finaleFrame = sampleAboutNarrativeRuntimePlan(plan, keys.get('finale-hold').atWU);
  assert.notDeepEqual(finaleFrame.camera.quaternion, firstFrame.camera.quaternion);
  assert.ok(finaleFrame.camera.position[0] > keys.get('ripple-overhead-hold').position[0]);
  assert.ok(finaleFrame.camera.position[2] > keys.get('ripple-overhead-hold').position[2]);

  const visibility = new Map(canonical.tracks.visibility.keys.map((key) => [key.id, key]));
  const gridRise = visibility.get('visibility-grid-rise');
  const gridVisible = visibility.get('visibility-grid-visible');
  const editorialOff = visibility.get('visibility-editorial-off');
  const returnStart = visibility.get('visibility-return-start');
  const returned = visibility.get('visibility-returned');
  assert.equal(editorialOff.visibility, 0);
  assert.equal(returnStart.visibility, 0);
  assert.equal(returned.visibility, 1);
  assert.ok(gridVisible.atWU <= keys.get('discipline-travel-start').atWU);
  assert.equal(Number((gridVisible.atWU - gridRise.atWU).toFixed(4)), 0.15);
  assert.equal(Number((returned.atWU - returnStart.atWU).toFixed(4)), 0.15);
  const flyoverVisibility = sampleAboutNarrativeRuntimePlan(
    plan,
    (gridRise.atWU + gridVisible.atWU) * 0.5,
  ).simulation.visibility;
  assert.ok(flyoverVisibility > 0 && flyoverVisibility < 1);
  assert.equal(sampleAboutNarrativeRuntimePlan(
    plan,
    (editorialOff.atWU + returnStart.atWU) * 0.5,
  ).simulation.visibility, 0);
  assert.equal(sampleAboutNarrativeRuntimePlan(plan, returnStart.atWU).simulation.visibility, 0);
  assert.equal(sampleAboutNarrativeRuntimePlan(plan, returned.atWU).simulation.visibility, 1);
  const rippleClip = canonical.tracks.interactions.clips.find((clip) => clip.id === 'interaction-grid-ripple');
  assert.equal(rippleClip.startWU, keys.get('grid-return-centered').atWU);
  assert.equal(rippleClip.activationWU, returned.atWU);
  assert.ok(rippleClip.startWU > editorialOff.atWU);

  const bustBottomY = canonical.tracks.worlds.objects.find((world) => world.id === 'world-emergent').transform.position[1]
    - (0.858 * canonical.tracks.worlds.objects.find((world) => world.id === 'world-emergent').transform.scale);
  assert.ok(Math.abs(bustBottomY - rippleCenter[1]) < 0.6);

  const verticalPositions = ABOUT_NARRATIVE_DISCIPLINE_ANCHORS.map((anchor) => anchor.y);
  const horizontalPositions = ABOUT_NARRATIVE_DISCIPLINE_ANCHORS.map((anchor) => anchor.x);
  assert.equal(new Set(verticalPositions).size, 3);
  assert.equal(new Set(horizontalPositions).size, 2);
  assert.deepEqual(horizontalPositions.map((value) => Math.round(value * 126)), [43, 52, 43, 52, 43, 52]);
  assert.deepEqual(verticalPositions.map((value) => Math.round(value * 94)), [54, 54, 56, 56, 58, 58]);
  const movedDisciplineAnchors = getAboutNarrativeDisciplineAnchors('desktop', {
    formationColumn: 64,
    formationRow: 22,
  });
  assert.deepEqual(
    movedDisciplineAnchors.map((anchor) => Math.round(anchor.x * 126)),
    [64, 73, 64, 73, 64, 73],
  );
  assert.deepEqual(
    movedDisciplineAnchors.map((anchor) => Math.round(anchor.y * 94)),
    [22, 22, 24, 24, 26, 26],
  );
  assert.equal(
    getAboutNarrativeDisciplineAnchors('mobile', {
      formationColumn: 64,
      formationRow: 22,
    }),
    ABOUT_NARRATIVE_DISCIPLINE_MOBILE_ANCHORS,
  );

  const disciplineReveal = canonical.tracks.interactions.clips.find((clip) => (
    clip.type === 'discipline-reveal'
  ));
  const acceptedDescriptions = new Map([
    ['Product Design', 'Understanding what people actually need before deciding what should be built.'],
    ['Experience Design', 'Looking at the whole journey, including the awkward gaps between teams, systems and touchpoints.'],
    ['Art Direction', 'Finding a visual idea that gives the work its own personality.'],
    ['Motion & 3D', 'Using movement and space when static design isn’t enough.'],
    ['Creative Engineering', 'Building ideas in code so they can be tested instead of imagined.'],
    ['Parametric Systems', 'Creating flexible systems that stay coherent as they grow.'],
  ]);
  disciplineReveal.parameters.items.forEach((item) => {
    assert.equal(item.description, acceptedDescriptions.get(item.label));
    assert.equal(item.position, undefined);
    assert.equal(item.mobilePosition, undefined);
  });
  assert.equal(disciplineReveal.parameters.settleDurationWU, 0.45);
  assert.equal(disciplineReveal.parameters.beatDurationWU, 0.32);
  assert.equal(disciplineReveal.parameters.itemsPerBeat, 2);
  assert.equal(disciplineReveal.parameters.formationColumn, 43);
  assert.equal(disciplineReveal.parameters.formationRow, 54);
  assert.deepEqual(
    ABOUT_NARRATIVE_INTERACTION_DEFINITIONS['discipline-reveal'].parameters
      .filter((control) => control.group === 'modifier-placement')
      .map((control) => control.id),
    ['formationColumn', 'formationRow'],
  );
  assertCameraValue(
    disciplineReveal.startWU
      + disciplineReveal.parameters.settleDurationWU
      + (Math.ceil(
        disciplineReveal.parameters.items.length / disciplineReveal.parameters.itemsPerBeat,
      ) * disciplineReveal.parameters.beatDurationWU),
    10.11,
    'Discipline sequence end',
  );
  const gridHold = keys.get('discipline-travel-start');
  const gridHoldFrame = sampleAboutNarrativeRuntimePlan(plan, shift.atWU);
  let previousBeatCameraZ = gridHold.position[2];
  for (let beatIndex = 0; beatIndex < 3; beatIndex += 1) {
    const leftAnchor = ABOUT_NARRATIVE_DISCIPLINE_ANCHORS[beatIndex * 2];
    const rightAnchor = ABOUT_NARRATIVE_DISCIPLINE_ANCHORS[(beatIndex * 2) + 1];
    const beatMidpointWU = disciplineReveal.startWU
      + disciplineReveal.parameters.settleDurationWU
      + ((beatIndex + 0.5) * disciplineReveal.parameters.beatDurationWU);
    const frame = sampleAboutNarrativeRuntimePlan(plan, beatMidpointWU);
    assert.ok(leftAnchor.x < rightAnchor.x);
    assert.equal(leftAnchor.y, rightAnchor.y);
    if (beatIndex > 0) {
      assert.ok(leftAnchor.y > ABOUT_NARRATIVE_DISCIPLINE_ANCHORS[(beatIndex - 1) * 2].y);
    }
    assertCameraValue(frame.camera.position[0], gridHold.position[0], `Discipline row ${beatIndex + 1} camera X`);
    assertCameraValue(frame.camera.position[1], gridHold.position[1], `Discipline row ${beatIndex + 1} camera Y`);
    assert.ok(frame.camera.position[2] > previousBeatCameraZ, `Discipline row ${beatIndex + 1} camera should keep moving backward.`);
    assert.deepEqual(frame.camera.quaternion, gridHoldFrame.camera.quaternion);
    previousBeatCameraZ = frame.camera.position[2];
  }
  const disciplineHoldKey = keys.get('discipline-hold');
  assert.equal(disciplineReveal.parameters.restoreDurationWU, 0.5);
  assert.equal(disciplineHoldKey.atWU, 11.15);
  assert.equal(disciplineHoldKey.position[0], gridHold.position[0]);
  assert.equal(disciplineHoldKey.position[1], gridHold.position[1]);
  assert.ok(disciplineHoldKey.position[2] > gridHold.position[2]);
  assert.equal(disciplineHoldKey.fov, gridHold.fov);
  assert.equal(keys.has('editorial-camera-hold'), false);
  [
    'labelWindowWU',
    'staggerWU',
    'labelDurationWU',
    'holdWU',
    'readingLineY',
    'mobileReadingLineY',
    'approachBandY',
    'exitLineY',
    'labelOffsetPx',
    'labelScale',
    'reconnectOpacity',
  ].forEach((key) => assert.equal(key in disciplineReveal.parameters, false));
  const mobileRippleCenter = [
    rippleCenter[0],
    Number((background.transform.position[1]
      + background.transform.mobileYOffset
      + (background.shapeParameters.height * background.transform.mobileScale)).toFixed(6)),
    rippleCenter[2],
  ];
  for (const profileId of ['tablet', 'mobile']) {
    const compactPlan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: profileId });
    const compactKeys = new Map(compactPlan.cameraKeys.map((key) => [key.id, key]));
    const compactTarget = profileId === 'mobile'
      ? [-0.23, -0.95, -7.035]
      : [0, -1.8, -7.035];
    disciplineTravelIds.forEach((id) => assert.equal(compactKeys.get(id).aimEnabled, false));
    const compactGridHold = compactKeys.get('discipline-travel-start');
    const compactDisciplineHold = compactKeys.get('discipline-hold');
    assert.equal(compactGridHold.position[1], 4);
    assert.equal(compactDisciplineHold.position[1], 4);
    assert.equal(compactGridHold.fov, 60);
    assert.equal(compactDisciplineHold.fov, 60);
    assert.ok(
      compactDisciplineHold.position[2] - compactGridHold.position[2] >= 2,
      `${profileId} Discipline camera must travel visibly down the grid.`,
    );
    targetedIds.forEach((id) => {
      const key = compactKeys.get(id);
      assert.equal(key.aimEnabled, true);
      assert.deepEqual(key.lookAtTarget, compactTarget);
    });
    const compactBackground = compactPlan.worlds.find((world) => world.id === background.id);
    assert.equal(compactPlan.pointProfile, 'mobile');
    assert.equal(compactBackground.shapeId, 'calm-field-v1');
  }
  const emergentWorld = canonical.tracks.worlds.objects.find((world) => world.id === 'world-emergent');
  assert.equal(emergentWorld.transform.mobileLandscapeScale, 1.8);
  assert.equal(emergentWorld.transform.mobileLandscapeXScale, 1.8);
  assert.equal(emergentWorld.transform.mobileLandscapeXOffset, 3.48);
  assert.equal(emergentWorld.transform.mobileLandscapeYOffset, -2);
  const mobilePlan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'mobile' });
  const mobileEmergentWorld = mobilePlan.worlds.find((world) => world.id === 'world-emergent');
  assertCameraValue(
    mobileEmergentWorld.transform.position[0]
      + mobileEmergentWorld.transform.mobileLandscapeXOffset,
    3.8,
    'Short-landscape bust X composition',
  );
  const mobileBustBottomY = emergentWorld.transform.position[1]
    + emergentWorld.transform.mobileYOffset
    - (0.858 * emergentWorld.transform.mobileScale);
  assert.ok(mobileBustBottomY > mobileRippleCenter[1]);
  assert.ok(mobileBustBottomY - mobileRippleCenter[1] < 0.6);
});

test('D is a dedicated Discipline reveal Motion and E sustains a scroll-authored wave generator', () => {
  const reveal = canonical.tracks.interactions.clips.find((item) => item.type === 'discipline-reveal');
  const clip = canonical.tracks.interactions.clips.find((item) => item.id === 'interaction-grid-ripple');
  const emergentClip = canonical.tracks.interactions.clips.find((item) => item.id === 'interaction-emergent-ripple');
  const world = canonical.tracks.worlds.objects.find((item) => item.id === clip?.targetWorldId);
  const nextWorld = canonical.tracks.worlds.objects.find((item) => item.startWU > world?.startWU);
  assert.ok(ABOUT_NARRATIVE_INTERACTION_DEFINITIONS['discipline-reveal']);
  assert.ok(ABOUT_NARRATIVE_INTERACTION_DEFINITIONS['grid-ripple']);
  assert.ok(reveal);
  assert.ok(clip);
  assert.ok(emergentClip);
  assert.equal(reveal.targetWorldId, world.id);
  assert.equal(reveal.parameters.items.length, 6);
  assert.equal(Object.hasOwn(reveal.parameters, 'fieldFogStrength'), false);
  assert.equal(clip.type, 'grid-ripple');
  assert.equal(clip.targetWorldId, world.id);
  assert.ok(clip.startWU >= reveal.endWU);
  assert.ok(clip.startWU >= world.startWU);
  assert.ok(clip.endWU <= nextWorld.startWU);
  assert.ok(clip.activationWU > clip.startWU);
  assert.equal(Number((clip.activationWU - clip.startWU).toFixed(4)), 0.15);
  assert.ok(clip.parameters.amplitude > 0);
  assert.ok(clip.parameters.speed > 0);
  assert.equal(clip.parameters.timeMode, 'story');
  assert.ok(clip.parameters.releaseWU > 0);
  assert.equal(emergentClip.startWU, clip.endWU);
  assert.ok(emergentClip.activationWU > emergentClip.startWU);
  assert.equal(emergentClip.targetWorldId, nextWorld.id);
  assert.ok(emergentClip.parameters.releaseWU > 0);
  assert.ok(clip.parameters.amplitude > emergentClip.parameters.amplitude);
  assert.ok(clip.parameters.speed > emergentClip.parameters.speed);
  assert.ok(clip.parameters.frequency < emergentClip.parameters.frequency);
  assert.match(liveSources.world, /gridRippleWeight/);
  assert.match(liveSources.world, /float radialRipple = sin\(/);
  assert.match(liveSources.world, /float harmonicRipple = sin\(/);
  assert.match(liveSources.world, /float undertowRipple = cos\(/);
  assert.match(liveSources.world, /float centerPulse = cos\(/);
  assert.match(liveSources.world, /float surfaceRippleMix = 1\.0 - \(/);
  assert.match(liveSources.world, /worldPoint\.y \+= gatheringWeight \* perpetualRipple/);
  assert.match(liveSources.world, /worldPoint\.xz \+= rippleDirection[\s\S]*?radialRipple/);
  assert.doesNotMatch(liveSources.world, /rippleScale/);
  assert.match(liveSources.world, /const backgroundWeight = effectAvailable[\s\S]*?revealState\.backgroundProgress[\s\S]*?restoreWeight/);
  assert.match(liveSources.world, /const cumulativeReveal = sequenceComplete \|\| index < activeIndex/);
  assert.doesNotMatch(liveSources.world, /disciplineReadingAnchor/);
  assert.match(liveSources.world, /worldAnchorSampling = 'native-grid-cell'/);
  assert.match(liveSources.world, /float disciplineRevealForGroup\(float group\)/);
  assert.match(liveSources.world, /float revealedGroupWeight = groupExists \* disciplineRevealForGroup\(group\)/);
  assert.match(liveSources.world, /const disciplineAnchors = getAboutNarrativeDisciplineAnchors\(quality, \{/);
  assert.match(liveSources.world, /refreshInstalledDisciplineGroups\(installedPair, \{ formationColumn, formationRow \}\)/);
  assert.match(liveSources.world, /label\.style\.setProperty\('--discipline-reveal'/);
  assert.match(liveSources.world, /label\.style\.setProperty\('--discipline-x'/);
  assert.match(liveSources.world, /const projectDisciplineLabels = \(\) =>/);
  assert.doesNotMatch(liveSources.world, /querySelector\(DISCIPLINE_LABEL|disciplineLabelResizeObserver|getAboutNarrativeDisciplineLabelNudge|projectDisciplineAnchors/);
  assert.doesNotMatch(liveSources.world, /activeLabelIndex|departureReveal|disciplineSpatialReveal/);
  assert.doesNotMatch(liveSources.world, /disciplineArrivalHold/);
  assert.match(liveSources.world, /float disciplineMonochrome = disciplineIsolation \* \(1\.0 - revealedGroupWeight\)/);
  assert.doesNotMatch(liveSources.world, /packDisciplineOrder|preferredSide/);
  assert.match(liveSources.editor, /getGridRippleStartControl\(snapshot\.document, object\)/);
  assert.match(liveSources.editor, /ariaLabel="Ripple starts"/);
  assert.match(liveSources.editor, /Move ripple start/);
  assert.match(liveSources.editor, /Number\(value\) \+ attackWU/);
  assert.doesNotMatch(liveSources.world, /discipline-(?:blur|shift)/);
  assert.doesNotMatch(liveSources.styles, /data-label-side='left'/);
  assert.match(liveSources.styles, /about-narrative-discipline-reveal__label \{[\s\S]*?filter: none;[\s\S]*?text-shadow: none;[\s\S]*?transform: none;/);
});

test('E begins after the C-grid pulse and resolves to one bust World in every layout', () => {
  const fixedGrid = canonical.tracks.worlds.objects.find((world) => world.label === 'C');
  const emergent = canonical.tracks.worlds.objects.find((world) => world.label === 'E');
  const clip = canonical.tracks.interactions.clips.find((item) => item.type === 'grid-ripple');
  assert.ok(fixedGrid);
  assert.ok(emergent);
  assert.ok(clip);
  assert.equal(clip.targetWorldId, fixedGrid.id);
  assert.ok(clip.endWU <= emergent.startWU);
  assert.ok(emergent.startWU - clip.endWU <= 0.5);
  assert.equal(emergent.shapeId, 'bust-v1');

  for (const layoutProfile of ['desktop', 'tablet', 'mobile']) {
    const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile });
    const resolvedFixedGrid = plan.worlds.find((world) => world.id === fixedGrid.id);
    const resolvedEmergent = plan.worlds.find((world) => world.id === emergent.id);
    assert.equal(resolvedFixedGrid.shapeId, 'calm-field-v1');
    assert.equal(resolvedEmergent.shapeId, 'bust-v1');
    assert.equal(resolvedEmergent.startWU, emergent.startWU);
  }
});

test('every travelling title shares one timing while the finale holds through the last frame', () => {
  const fieldsById = new Map(canonical.tracks.text.fields.map((field) => [field.id, field]));
  const titles = canonical.tracks.text.fields.filter((field) => field.kind === 'title');
  titles.filter((field) => field.preset === 'travelling-title-v1').forEach((field) => {
    assert.ok(Number((field.endWU - field.startWU).toFixed(4)) >= 0.6, `${field.id} duration`);
    assert.ok(Number((field.focusWU - field.startWU).toFixed(4)) >= 0.3, `${field.id} entry timing`);
    assert.ok(Number((field.endWU - field.focusWU).toFixed(4)) >= 0.3, `${field.id} exit timing`);
    assert.equal(field.movement, 'spatial', `${field.id} movement`);
  });
  const opener = fieldsById.get('text-promise-main');
  assert.equal(Number((opener.focusWU - opener.startWU).toFixed(4)), 0.35);
  assert.equal(Number((opener.endWU - opener.startWU).toFixed(4)), 0.7);
  const finale = fieldsById.get('text-epilogue-invitation');
  assert.equal(Number((finale.focusWU - finale.startWU).toFixed(4)), 0.45);
  assert.equal(finale.endWU, canonical.profiles.desktop.storyDurationWU);
  assert.equal(finale.preset, 'finale-v1');
  assert.match(liveSources.styles, /opacity: var\(--fragment-opacity, 0\);/);
  assert.match(liveSources.styles, /var\(--spatial-description-opacity, var\(--spatial-context-opacity, 0\)\)/);
  assert.doesNotMatch(liveSources.experience, /data-route-enter-trigger="deferred"/);
  assert.doesNotMatch(liveSources.experience, /createEntranceSequence/);
});

test('spatial title hierarchy reserves display type for the opening and finale bookends', () => {
  const titles = canonical.tracks.text.fields.filter((field) => field.kind === 'title');
  const opener = titles.find((field) => field.id === 'text-promise-main');
  assert.equal(opener.text, 'About Me');
  assert.equal(
    opener.description,
    'Hi, I’m Alex. I’m a designer because I’m endlessly curious about how things work.',
  );
  assert.deepEqual(
    titles.filter((field) => field.titleStyle === 'display').map((field) => field.id),
    ['text-promise-main', 'text-epilogue-invitation'],
  );
  assert.equal(titles.filter((field) => field.titleStyle === 'standard').length, 7);
  assert.match(liveSources.experience, /data-title-style=\{titleStyle\}/);
  assert.match(liveSources.styles, /data-title-style='display'/);
  assert.match(liveSources.experience, /route-centered-page__title/);
  assert.match(liveSources.experience, /route-centered-page__description route-intro-description/);
  assert.match(liveSources.experience, /data-route-enter="identity"/);
  assert.match(liveSources.experience, /data-route-enter="context"/);
  assert.match(liveSources.experience, /data-route-enter="action"/);
});

test('opening scroll cue uses an editorial label and fades once scrolling begins', () => {
  assert.match(liveSources.experience, />\s*Scroll\s*</);
  assert.match(liveSources.experience, /about-narrative-opening-scroll-cue__line/);
  assert.doesNotMatch(liveSources.experience, /about-narrative-opening-scroll-cue__icon/);
  assert.match(liveSources.styles, /--about-opening-scroll-cue-opacity/);
  assert.match(liveSources.styles, /bottom: max\(clamp\(2rem, 4svh, 2\.75rem\), env\(safe-area-inset-bottom\)\)/);
  assert.match(liveSources.styles, /max-height: 600px[\s\S]*?about-narrative-opening-scroll-cue \{\s*display: none/);
  assert.match(liveSources.styles, /letter-spacing: 0\.28em/);
  assert.match(liveSources.timeline, /root\.dataset\.openingScrollCue = openingScrollCueState/);
  assert.equal(getAboutNarrativeOpeningScrollCueOpacity(0, 1000), 1);
  assert.equal(getAboutNarrativeOpeningScrollCueOpacity(36, 1000), 0.5);
  assert.equal(getAboutNarrativeOpeningScrollCueOpacity(72, 1000), 0);
});

test('only the opener and finale Titles may carry supporting descriptions', () => {
  const invalid = structuredClone(canonical);
  invalid.tracks.text.fields.find((field) => field.id === 'text-complexity-idea').description = 'Not allowed';
  assert.ok(validateAboutNarrativeTrackDocument(invalid).some((item) => (
    item.code === 'title-description-preset'
    && item.path.endsWith('.description')
  )));
});

test('mobile title roles retain their exact twenty-percent width reductions', () => {
  assert.match(
    liveSources.styles,
    /data-about-layout-profile='mobile'\] \.about-narrative-spatial-title:not\(\.route-centered-page__title\) \{\s*max-width:\s*min\(14\.08ch, var\(--about-title-standard-max-width/,
  );
  assert.match(
    liveSources.styles,
    /data-about-layout-profile='mobile'\] \.about-narrative-spatial-copy\[data-title-style='display'\] \.about-narrative-spatial-title:not\(\.route-centered-page__title\) \{\s*max-width:\s*min\(10\.88ch, var\(--about-title-display-max-width/,
  );
  assert.match(
    liveSources.styles,
    /@media \(max-height: 600px\)[\s\S]*?data-title-style='display'[\s\S]*?max-width:\s*min\(12\.16ch, var\(--about-title-display-max-width/,
  );
});

test('A to B keeps its expanded travel and authored title pacing', () => {
  const fieldsById = new Map(canonical.tracks.text.fields.map((field) => [field.id, field]));
  const complexity = canonical.tracks.worlds.objects.find((world) => world.id === 'world-complexity');
  const titles = [
    fieldsById.get('text-complexity-idea'),
    fieldsById.get('text-complexity-conditions'),
  ];
  assert.equal(Number((complexity.transitionIn.endWU - complexity.transitionIn.startWU).toFixed(6)), 2.05);
  assert.deepEqual(titles.map((title) => Number((title.endWU - title.startWU).toFixed(6))), [0.8, 0.8]);
  assert.deepEqual(
    titles.map((title) => [title.startWU, title.focusWU, title.endWU]),
    [[1.3, 1.7, 2.1], [2.42, 2.82, 3.22]],
  );
});

test('later title groups retain their authored breathing gaps', () => {
  const fieldsById = new Map(canonical.tracks.text.fields.map((field) => [field.id, field]));
  const titleSets = [
    {
      ids: ['text-complexity-curiosity', 'text-complexity-listen'],
      gaps: [0.1],
    },
    {
      ids: ['text-life-momentum', 'text-life-form', 'text-life-character'],
      gaps: [0.25, 0.22],
    },
  ];
  titleSets.forEach(({ ids, gaps }) => ids.slice(1).forEach((id, index) => {
    const previous = fieldsById.get(ids[index]);
    const current = fieldsById.get(id);
    assert.ok(current.startWU > previous.endWU, `${id} must follow the previous title without overlap`);
    assert.ok(
      Math.abs((current.startWU - previous.endWU) - gaps[index]) <= 0.000001,
      `${id} must preserve its authored breathing gap`,
    );
  }));
});

test('editorial reading windows keep the point world hidden while camera reframes run', () => {
  const cameraKeys = new Map(canonical.tracks.camera.keys.map((key) => [key.id, key]));
  const visibilityKeys = new Map(canonical.tracks.visibility.keys.map((key) => [key.id, key]));
  const hiddenWindows = [
    [visibilityKeys.get('visibility-void-off').atWU, visibilityKeys.get('visibility-grid-rise').atWU],
    [visibilityKeys.get('visibility-editorial-off').atWU, visibilityKeys.get('visibility-return-start').atWU],
  ];

  ['desktop', 'tablet', 'mobile'].forEach((layoutProfile) => {
    const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile });
    hiddenWindows.forEach(([startWU, endWU]) => {
      for (let storyWU = startWU; storyWU <= endWU + 0.000001; storyWU += 0.05) {
        assert.equal(
          sampleAboutNarrativeRuntimePlan(plan, Math.min(storyWU, endWU)).simulation.visibility,
          0,
          `${layoutProfile} editorial reading must hide the point world at ${storyWU.toFixed(3)} WU`,
        );
      }
    });
    assert.equal(sampleAboutNarrativeRuntimePlan(plan, 5.25).simulation.visibility, 0);
    assert.equal(sampleAboutNarrativeRuntimePlan(plan, 13.5).simulation.visibility, 0);
    assert.equal(sampleAboutNarrativeRuntimePlan(plan, visibilityKeys.get('visibility-grid-visible').atWU).simulation.visibility, 1);
    assert.equal(sampleAboutNarrativeRuntimePlan(plan, visibilityKeys.get('visibility-returned').atWU).simulation.visibility, 1);
  });

  assert.equal(visibilityKeys.get('visibility-void-off').atWU, 3.72);
  assert.equal(visibilityKeys.get('visibility-grid-rise').atWU, 6.715);
  assert.equal(visibilityKeys.get('visibility-editorial-off').atWU, 11.1);
  assert.equal(visibilityKeys.get('visibility-return-start').atWU, 14.1);
  assert.equal(cameraKeys.get('grid-return-centered').atWU, 14.1);
});

test('semantic handoffs keep deliberate breaths without empty scroll runs', () => {
  const fields = new Map(canonical.tracks.text.fields.map((field) => [field.id, field]));
  const reveal = canonical.tracks.interactions.clips.find((clip) => clip.type === 'discipline-reveal');
  const emergent = canonical.tracks.worlds.objects.find((world) => world.id === 'world-emergent');
  const pointKeys = new Map(canonicalV6.tracks.pointField.keys.map((key) => [key.id, key]));
  const visibilityKeys = new Map(canonicalV6.tracks.visibility.keys.map((key) => [key.id, key]));
  const cameraKeys = new Map(canonicalV6.tracks.camera.keys.map((key) => [key.id, key]));
  const finale = fields.get('text-epilogue-invitation');
  const handoffs = [
    [fields.get('text-promise-main').endWU, fields.get('text-complexity-idea').startWU],
    [fields.get('text-complexity-conditions').endWU, fields.get('text-background-unit').startWU],
    [fields.get('text-background-unit').endWU, fields.get('text-complexity-curiosity').startWU],
    [fields.get('text-complexity-listen').endWU, reveal.startWU],
    [fields.get('text-disciplines-title').endWU, fields.get('text-life-momentum').startWU],
    [fields.get('text-life-character').endWU, emergent.startWU],
  ];
  handoffs.forEach(([outgoingEndWU, incomingStartWU]) => {
    assert.ok(incomingStartWU - outgoingEndWU <= 0.65);
  });
  assert.ok(fields.get('text-disciplines-title').startWU < reveal.endWU);
  assert.equal(fields.get('text-disciplines-title').startWU, 10.85);
  assert.ok(reveal.endWU - fields.get('text-disciplines-title').startWU <= 0.3 + Number.EPSILON * 8);
  assert.equal(cameraKeys.get('grid-return-centered').atWU, 14.1);
  assert.equal(visibilityKeys.get('visibility-return-start').atWU, 14.1);
  assert.equal(visibilityKeys.get('visibility-returned').atWU, 14.25);
  assert.ok(finale.startWU < emergent.transitionIn.endWU);
  assert.ok(finale.focusWU > emergent.transitionIn.endWU);
  assert.equal(Number((emergent.transitionIn.endWU - finale.startWU).toFixed(4)), 0.4);
  assert.ok(
    visibilityKeys.get('visibility-grid-visible').atWU
      <= reveal.startWU + reveal.parameters.settleDurationWU,
  );
  assert.equal(pointKeys.get('key-world-emergent-arrival').atWU, 20.55);
  assert.equal(canonical.profiles.desktop.storyDurationWU, 22.795);
});

test('Text, transitions, and Motion cover the Story without large inactive gaps', () => {
  const pointKeys = new Map(canonicalV6.tracks.pointField.keys.map((key) => [key.id, key]));
  const activeIntervals = [
    ...canonicalV6.tracks.text.fields.map((field) => ({
      startWU: field.startWU,
      endWU: field.endWU,
      id: field.id,
    })),
    ...canonicalV6.tracks.interactions.clips.map((clip) => ({
      startWU: clip.startWU,
      endWU: clip.endWU,
      id: clip.id,
    })),
    ...canonicalV6.tracks.pointField.segments.flatMap((segment) => (
      segment.transition.type === 'hold' ? [] : [{
        startWU: pointKeys.get(segment.fromKeyId).atWU,
        endWU: pointKeys.get(segment.toKeyId).atWU,
        id: segment.id,
      }]
    )),
    {
      startWU: canonicalV6.tracks.interactions.clips
        .find((clip) => clip.id === 'interaction-emergent-ripple').endWU,
      endWU: canonicalV6.tracks.text.fields
        .find((field) => field.id === 'text-epilogue-invitation').startWU,
      id: 'resolved-bust-hold',
    },
  ].sort((left, right) => left.startWU - right.startWU || left.endWU - right.endWU);

  let coveredUntilWU = 0;
  activeIntervals.forEach((interval) => {
    assert.ok(
      interval.startWU - coveredUntilWU <= 0.25,
      `${interval.id} leaves ${(interval.startWU - coveredUntilWU).toFixed(3)} WU inactive`,
    );
    coveredUntilWU = Math.max(coveredUntilWU, interval.endWU);
  });
  assert.equal(coveredUntilWU, canonicalV6.profiles.desktop.storyDurationWU);
});

test('the narrative uses the approved A-E title, editorial, logo, and discipline structure', () => {
  const fields = canonical.tracks.text.fields;
  assert.deepEqual(
    fields.map((field) => [field.id, field.kind]),
    [
      ['text-promise-main', 'title'],
      ['text-complexity-idea', 'title'],
      ['text-complexity-conditions', 'title'],
      ['text-background-unit', 'scroll-block'],
      ['text-complexity-curiosity', 'title'],
      ['text-complexity-listen', 'title'],
      ['text-disciplines-title', 'scroll-block'],
      ['text-life-momentum', 'title'],
      ['text-life-form', 'title'],
      ['text-life-character', 'title'],
      ['text-epilogue-invitation', 'title'],
    ],
  );

  const backgroundUnit = fields.find((field) => field.id === 'text-background-unit');
  const disciplineEditorial = fields.find((field) => field.id === 'text-disciplines-title');
  assert.equal(backgroundUnit.presentation.layout, 'reading');
  assert.equal(backgroundUnit.block.kind, 'stack');
  assert.ok(backgroundUnit.block.moduleGapRem >= 2);
  assert.equal(backgroundUnit.block.modules.filter((module) => module.kind === 'prose').length, 4);
  assert.equal(backgroundUnit.block.modules.filter((module) => module.kind === 'list').length, 1);
  const logoGrid = backgroundUnit.block.modules.find((module) => module.kind === 'logo-grid');
  assert.equal(logoGrid.items.length, 14);
  assert.equal(
    logoGrid.label,
    'Selected work from across my career.',
  );
  logoGrid.items.forEach((item) => {
    assert.ok(item.id && item.label);
    assert.match(item.src, /^\/images\/about\/client-logos\/.+\.(?:svg|png)$/);
    assert.equal(typeof item.alt, 'string');
    assert.equal(item.scale, undefined);
  });
  assert.equal(logoGrid.items.filter((item) => item.src.endsWith('.svg')).length, 13);
  assert.equal(disciplineEditorial.presentation.layout, 'disciplines');
  assert.equal(disciplineEditorial.block.kind, 'stack');
  assert.equal(disciplineEditorial.block.modules.filter((module) => module.kind === 'prose').length, 6);
  assert.equal(disciplineEditorial.block.modules.filter((module) => module.kind === 'list').length, 1);
  assert.equal(
    disciplineEditorial.block.modules.some((module) => module.kind === 'media-deck'),
    false,
  );
  assert.ok(canonical.globals.editorialMotion.fadeDurationWU > 0);
  assert.deepEqual(Object.keys(canonical.globals.editorialMotion), [
    'fadeDurationWU',
    'maxBlurPx',
    'travelPx',
  ]);
  assert.equal(backgroundUnit.reveal, undefined);
  assert.equal(disciplineEditorial.reveal, undefined);
  const disciplineReveal = canonical.tracks.interactions.clips.find((clip) => (
    clip.type === 'discipline-reveal'
  ));
  assert.equal(canonical.globals.textMotion.standardViewportY, 50);
  assert.equal(disciplineReveal.activationWU, disciplineReveal.startWU);
  assert.equal(disciplineReveal.parameters.items.length, 6);
  assert.equal(disciplineReveal.endWU, 11.15);
  disciplineReveal.parameters.items.forEach((item) => {
    assert.equal(item.position, undefined);
    assert.equal(item.mobilePosition, undefined);
  });
  assert.ok(disciplineEditorial.startWU < disciplineReveal.endWU);
  assert.ok(disciplineEditorial.focusWU > disciplineReveal.endWU);
  const boundaryTitleIds = new Set(['text-promise-main', 'text-epilogue-invitation']);
  fields
    .filter((field) => field.kind === 'title' && !boundaryTitleIds.has(field.id))
    .forEach((field) => assert.equal(field.presentation?.layout, 'center'));
  assert.deepEqual(canonical.profiles.mobile.overrides.text, {});
  assert.doesNotMatch(liveSources.experience, /data-emphasis-tone/);
  assert.match(liveSources.experience, /about-narrative-editorial-list/);
  assert.match(liveSources.experience, /about-narrative-discipline-list/);
  assert.match(liveSources.experience, /EditorialStack/);
  assert.match(liveSources.experience, /EditorialMediaDeck/);
  assert.doesNotMatch(liveSources.styles, /--about-emphasis-(?:blue|green|orange)/);
  assert.match(liveSources.styles, /--about-editorial-ink:\s*var\(--text-primary\);/);
  assert.doesNotMatch(liveSources.styles, /about-narrative-editorial-emphasis|about-editorial-strong-ink/);
  assert.equal(canonicalSource.includes('"emphasis"'), true);
  assert.equal(canonical.globals.editorialRevealThreshold, 0.8);
  assert.equal(canonical.globals.editorialMotion.fadeDurationWU, 0.2);
  assert.equal(canonical.globals.editorialMotion.maxBlurPx, 0);
  assert.equal(canonical.globals.editorialMotion.travelPx, 0);
  assert.match(liveSources.timeline, /getAboutNarrativeEditorialReveal\(/);
  assert.doesNotMatch(liveSources.timeline, /editorial-blur|editorial-y/);
  assert.match(liveSources.timeline, /getAboutNarrativeSharedRevealProgress/);
  assert.doesNotMatch(liveSources.world, /getAboutNarrativeSharedRevealProgress/);
  assert.doesNotMatch(liveSources.world, /revealState\?\.active/);
  assert.doesNotMatch(
    liveSources.styles,
    /data-about-motion-profile='reduced'\] \.about-narrative-opening-copy \{[^}]*transform:\s*none/,
  );
  assert.match(liveSources.reveal, /ABOUT_NARRATIVE_REVEAL_START_VIEWPORT_Y = 1/);
  assert.match(liveSources.reveal, /ABOUT_NARRATIVE_REVEAL_TRAVEL_VIEWPORT = 0\.2/);
  assert.doesNotMatch(liveSources.timeline, /editorialIndex|logoStaggerWU|revealDelayWU/);
  assert.match(liveSources.timeline, /startScrollWU: Number\(span\.scrollBounds\.startWU\)/);
  assert.match(liveSources.timeline, /getAboutNarrativeReadingOrderRevealMetrics/);
  assert.match(liveSources.timeline, /about:editorial-lines-change/);
  assert.match(liveSources.timeline, /scrollWUFromStoryWU\(frame\.storyWU\)/);
  assert.doesNotMatch(liveSources.timeline, /sequentialPassage/);
  assert.match(liveSources.styles, /about-narrative-editorial-stack/);
  assert.match(
    liveSources.styles,
    /about-narrative-editorial-stack > \.about-narrative-client-field \{[\s\S]*?margin-block-start: var\(--about-editorial-stack-gap/,
  );
  assert.match(liveSources.styles, /\.about-narrative-client-field \{[^}]*width: 100%;[^}]*\}/);
  assert.match(liveSources.styles, /\.about-narrative-client-logos \{[^}]*width: 100%;[^}]*\}/);
  assert.match(liveSources.styles, /grid-template-columns: repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(liveSources.styles, /last-child:nth-child\(odd\)/);
  assert.doesNotMatch(liveSources.styles, /data-editorial-in-view='true'[\s\S]*?about-narrative-world/);
  assert.match(liveSources.timeline, /editorialFields\.some/);
  assert.match(liveSources.world, /latestFrame\?\.simulation\?\.visibility/);
  assert.doesNotMatch(liveSources.world, /root\.dataset\.editorialInView !== 'true'/);
  assert.match(liveSources.editor, /EDITORIAL_MODULE_GAP_CONTROL/);
  assert.match(liveSources.styles, /var\(--render-span-start-wu, 0\) \+ var\(--about-editorial-reveal-threshold, 1\)/);
  assert.doesNotMatch(liveSources.styles, /var\(--render-span-focus-wu, 0\) \+ var\(--about-editorial-reveal-threshold, 1\)/);
  assert.match(liveSources.styles, /--about-editorial-type-size: clamp\(1\.4375rem/);
  assert.match(liveSources.styles, /--about-editorial-resting-opacity: 0\.04/);
  assert.match(liveSources.styles, /\[data-editorial-reveal\] \{[\s\S]*?opacity: var\(--editorial-focus-opacity/);
  assert.match(liveSources.styles, /--about-spatial-title-type-size: clamp\([\s\S]*?var\(--about-editorial-type-size\) \* 1\.55/);
  assert.match(liveSources.styles, /font-size: var\(--about-spatial-title-type-size\)/);
  assert.match(liveSources.experience, /function EditorialLineText/);
  assert.match(liveSources.experience, /className="about-narrative-media-deck"[\s\S]*?data-editorial-reveal="module"/);
  assert.match(liveSources.experience, /data-editorial-reveal="line"/);
  assert.doesNotMatch(liveSources.experience, /data-editorial-reveal': 'word'/);
  assert.doesNotMatch(liveSources.experience, /data-editorial-sequence-ratio/);
  assert.match(liveSources.experience, /new ResizeObserver\(scheduleMeasure\)/);
  assert.match(liveSources.experience, /data-editorial-line-count/);
  assert.match(liveSources.experience, /about:editorial-lines-change/);
  assert.match(liveSources.styles, /about-narrative-spatial-title \{[\s\S]*?padding-block: 0\.2em;[\s\S]*?margin: -0\.2em auto -0\.1em;[\s\S]*?overflow: visible;/);
  assert.match(liveSources.experience, /--about-title-viewport-y/);
  assert.equal(canonical.globals.textMotion.standardViewportY, 50);
  assert.equal(canonical.globals.textMotion.bookendViewportY, 70);
  assert.doesNotMatch(liveSources.editor, /title-viewport-placement/);
  assert.match(liveSources.styles, /top: var\(--about-title-viewport-y/);
});

test('published narrative writing follows the accepted current script with its authored finale CTA', () => {
  const normalize = (value) => String(value || '')
    .toLocaleLowerCase('en-GB')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const normalizedScript = normalize(acceptedScriptSource);
  const authoredCopy = canonical.tracks.text.fields.flatMap((field) => [
      field.text,
      field.description,
      ...(field.block?.text?.split('\n') || []),
      ...(field.block?.modules || [])
        .filter((module) => ['prose', 'list', 'quote'].includes(module.kind))
        .flatMap((module) => [
          module.text,
          module.label,
          ...(module.items || []),
        ]),
    ]).filter(Boolean);
  authoredCopy.forEach((copy) => {
    assert.ok(normalizedScript.includes(normalize(copy)), `Accepted script is missing live copy: ${copy}`);
  });
  const reveal = canonical.tracks.interactions.clips.find((clip) => clip.type === 'discipline-reveal');
  reveal.parameters.items.forEach((item) => {
    assert.ok(normalizedScript.includes(normalize(item.label)), `Accepted script is missing ${item.label}`);
  });
  assert.equal(
    canonical.tracks.text.fields.find((field) => field.preset === 'finale-v1')?.text,
    'Let’s begin.',
  );
  assert.doesNotMatch(canonicalSource, /Together, they become a way to make the idea tangible/);
  assert.doesNotMatch(canonicalSource, /That is when the experience starts to feel real/);
});

test('the lower-half final title and inline email link share the closing frame with the persistent bust', () => {
  const finale = canonical.tracks.text.fields.find((field) => field.preset === 'finale-v1');
  const emergent = canonical.tracks.worlds.objects.find((world) => world.shapeId === 'bust-v1');
  const visibility = new Map(canonical.tracks.visibility.keys.map((key) => [key.id, key]));
  const keys = new Map(canonical.tracks.camera.keys.map((key) => [key.id, key]));
  const finalHold = keys.get('finale-hold');
  assert.equal(finale.endWU, canonical.profiles.desktop.storyDurationWU);
  assert.equal(finale.startWU, 20.15);
  assert.equal(finale.presentation.layout, 'text-bust-cta');
  assert.equal(canonical.globals.textMotion.bookendViewportY, 70);
  assert.ok(finale.focusWU > finale.startWU);
  assert.equal(emergent.protected, true);
  assert.equal(canonical.tracks.worlds.objects.filter((world) => world.shapeId === 'bust-v1').length, 1);
  assert.equal(sampleAboutNarrativeRuntimePlan(
    compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' }),
    finale.startWU,
  ).simulation.visibility, 1);
  assert.equal(visibility.get('visibility-end').visibility, 1);
  assert.equal(finalHold.atWU, visibility.get('visibility-end').atWU);
  assert.equal(finalHold.atWU, finale.endWU);
  assert.equal(finalHold.aimEnabled, true);
  assert.match(liveSources.experience, /about-narrative-finale-content/);
  assert.match(liveSources.styles, /\.about-narrative-finale-content/);
  assert.match(liveSources.styles, /about-narrative-finale-content \{[\s\S]*?top: var\(--about-finale-lockup-y, var\(--about-title-viewport-y, 70%\)\);[\s\S]*?translate3d\(0, -50%, 0\)/);
  assert.match(liveSources.styles, /--route-intro-description-max-width: 42ch/);
  assert.match(liveSources.styles, /--route-intro-description-max-width: 32ch/);
  assert.match(liveSources.styles, /--about-bookend-lockup-width: 48rem/);
  assert.match(liveSources.styles, /about-narrative-opening-copy \{[\s\S]*?max-width: min\(var\(--about-bookend-lockup-width\), 100%\)/);
  assert.match(liveSources.styles, /about-narrative-finale-content \{[\s\S]*?width: min\(100%, var\(--about-bookend-lockup-width\)\)/);
  assert.match(liveSources.styles, /about-narrative-opening-copy \{[\s\S]*?translate3d\(-50%, -50%, 0\)/);
  assert.match(liveSources.experience, /route-centered-page__title route-bookend-title route-title-lockup__title/);
  const finaleTitleRule = liveSources.styles.match(/about-narrative-spatial-copy\.is-finale[\s\S]*?route-bookend-title \{([^}]*)\}/)?.[1] || '';
  assert.doesNotMatch(finaleTitleRule, /font-(?:family|size|weight)|letter-spacing|line-height/);
  assert.match(liveSources.styles, /about-narrative-finale-description \{[\s\S]*?var\(--route-intro-description-opacity\)[\s\S]*?var\(--spatial-description-opacity/);
  assert.match(liveSources.experience, /about-narrative-finale-description__link/);
  assert.doesNotMatch(liveSources.experience, /about-narrative-cta/);
  assert.match(liveSources.styles, /max-height: 600px/);
});

test('all responsive editorial markers reveal through the bottom twenty percent', () => {
  assert.equal(getAboutNarrativeSharedRevealProgress(1, 1, 0.2, false), 0);
  assert.ok(Math.abs(getAboutNarrativeSharedRevealProgress(0.9, 1, 0.2, false) - 0.5) < 0.000001);
  assert.equal(getAboutNarrativeSharedRevealProgress(0.8, 1, 0.2, false), 1);
  const readingOrderMetrics = getAboutNarrativeReadingOrderRevealMetrics([
    { top: 0, height: 36 },
    { top: 0, height: 36 },
    { top: 0, height: 36 },
    { top: 42, height: 36 },
    { top: 42, height: 36 },
    { top: 120, height: 36 },
  ]);
  assert.equal(readingOrderMetrics.length, 6);
  readingOrderMetrics.forEach((metric, index) => {
    assert.ok(metric.revealSoftnessPx >= 4 && metric.revealSoftnessPx <= 18);
    if (index > 0) {
      assert.ok(
        metric.revealOffsetPx > readingOrderMetrics[index - 1].revealOffsetPx,
        `reading-order marker ${index} must follow marker ${index - 1}`,
      );
    }
  });
  assert.ok(
    readingOrderMetrics[5].revealOffsetPx - readingOrderMetrics[4].revealOffsetPx > 36,
    'authored paragraph gaps must remain pauses in the reveal scan',
  );
  for (const layoutProfile of ['desktop', 'tablet', 'mobile']) {
    const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile });
    const logos = plan.renderSpans.find((span) => span.fieldIds.includes('text-background-unit'));
    const startScrollWU = logos.scrollBounds.startWU;
    const field = plan.textFields.find((item) => item.id === 'text-background-unit');
    const record = {
      startScrollWU,
      revealOffsetPx: 0,
      revealSoftnessPx: 8,
      field,
      editorialMotion: canonical.globals.editorialMotion,
    };
    const viewportHeight = layoutProfile === 'mobile' ? 844 : 900;
    const atMarker = getAboutNarrativeEditorialReveal(
      record,
      startScrollWU,
      viewportHeight,
      canonical.globals.editorialRevealThreshold,
      false,
    );
    const beforeCompletionLine = getAboutNarrativeEditorialReveal(
      record,
      startScrollWU + (canonical.globals.editorialMotion.fadeDurationWU * 0.5),
      viewportHeight,
      canonical.globals.editorialRevealThreshold,
      false,
    );
    const softEdge = getAboutNarrativeEditorialReveal(
      record,
      startScrollWU
        + canonical.globals.editorialMotion.fadeDurationWU
        - (record.revealSoftnessPx / viewportHeight / 2),
      viewportHeight,
      canonical.globals.editorialRevealThreshold,
      false,
    );
    const atBandEnd = getAboutNarrativeEditorialReveal(
      record,
      startScrollWU + canonical.globals.editorialMotion.fadeDurationWU,
      viewportHeight,
      canonical.globals.editorialRevealThreshold,
      false,
    );
    const nextWordAtBandEnd = getAboutNarrativeEditorialReveal(
      { ...record, revealOffsetPx: 24 },
      startScrollWU + canonical.globals.editorialMotion.fadeDurationWU,
      viewportHeight,
      canonical.globals.editorialRevealThreshold,
      false,
    );
    assert.ok(atMarker <= 0.000001, `${layoutProfile} must start at the viewport bottom`);
    assert.ok(beforeCompletionLine <= 0.000001, `${layoutProfile} must stay quiet before the scan line`);
    assert.ok(softEdge > 0 && softEdge < 1, `${layoutProfile} must keep a soft active edge`);
    assert.ok(atBandEnd >= 0.999999, `${layoutProfile} must finish twenty percent above the bottom`);
    assert.ok(
      nextWordAtBandEnd <= 0.000001,
      `${layoutProfile} later words and logos must remain quiet until their reading-order turn`,
    );
  }
});

test('editor exposes the six native v6 lanes and all Text creation kinds', () => {
  const trackDeclaration = liveSources.editor.slice(
    liveSources.editor.indexOf('const POINT_FIELD_TRACKS'),
    liveSources.editor.indexOf('const TRACK_BY_ID'),
  );
  assert.deepEqual(
    [...trackDeclaration.matchAll(/id: '([^']+)'/g)].map((match) => match[1]),
    ['camera', 'camera-orientation', 'visibility', 'point-field', 'text', 'interaction'],
  );
  assert.doesNotMatch(liveSources.editor, /sectionId|sectionRefs|data-narrative-section|['"]section['"]\s*,\s*label/i);
  assert.match(liveSources.editor, /createAtPlayhead\('text', 'title'\)/);
  assert.match(liveSources.editor, /createAtPlayhead\('text', 'scroll-block'\)/);
  assert.match(liveSources.editor, /createAtPlayhead\('text', 'stub'\)/);
  assert.match(liveSources.editor, /Draft · Not published/);
  assert.match(liveSources.editor, /Reduced Motion/);
});

test('timeline point markers center their hit target and diamond on the authored WU', () => {
  assert.match(liveSources.editor, /pointLike \? ' is-point' : ''/);
  assert.match(
    liveSources.editorStyles,
    /\.about-track-editor-object\.is-point\s*\{\s*transform:\s*translateX\(-50%\);\s*\}/,
  );
  assert.match(
    liveSources.editorStyles,
    /\.about-track-editor-playhead[\s\S]*?transform:\s*translateX\(-50%\);/,
  );
  assert.match(
    liveSources.editorStyles,
    /\.about-point-field-key\s*\{[\s\S]*?transform:\s*translate\(-50%, -50%\) !important;/,
  );
});
