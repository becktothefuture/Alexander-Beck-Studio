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
  ABOUT_NARRATIVE_GLOBAL_CONTROLS,
  ABOUT_NARRATIVE_INTERACTION_DEFINITIONS,
  ABOUT_NARRATIVE_MODIFIER_DEFINITIONS,
  ABOUT_NARRATIVE_SHAPE_DEFINITIONS,
  ABOUT_NARRATIVE_TEXT_TRACK_CONTROL_GROUPS,
  ABOUT_NARRATIVE_WORLD_CONTROL_GROUPS,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';

const read = (path) => readFile(new URL(path, import.meta.url), 'utf8');
const canonicalSource = await read('../react-app/app/public/config/contents-about.json');
const canonicalV6 = JSON.parse(canonicalSource);
const homeContent = JSON.parse(await read('../react-app/app/public/config/contents-home.json'));
const loadedCanonical = loadAboutNarrativeTrackSource(
  projectAboutNarrativePointFieldDocumentToVersion5(canonicalV6),
);
assert.equal(loadedCanonical.valid, true);
const canonical = loadedCanonical.document;
const currentScriptSource = await read('../docs/research/about-page-direction/archive/narrative-explorations/ABOUT-NARRATIVE-SCRIPT-v25.md');
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

test('canonical v5 authors one consolidated camera, visibility, and four-World bust sequence', () => {
  const cameraKeys = canonical.tracks.camera.keys;
  const visibilityKeys = canonical.tracks.visibility.keys;
  const worlds = canonical.tracks.worlds.objects;
  const reveal = canonical.tracks.interactions.clips.find((clip) => clip.type === 'discipline-reveal');
  const ripple = canonical.tracks.interactions.clips.find((clip) => clip.type === 'grid-ripple');
  const grid = worlds.find((world) => world.id === ripple?.targetWorldId);
  const emergent = worlds.find((world) => world.id === 'world-emergent');

  assert.ok(reveal);
  assert.ok(ripple);
  assert.equal(cameraKeys.length, 8);
  [
    'orb-establish',
    'complexity-exit',
    'complexity-exit-2',
    'grid-birds-eye',
    'discipline-hold',
    'grid-return-centered',
    'ripple-overhead-hold',
    'finale-hold',
  ].forEach((id) => assert.ok(cameraKeys.some((key) => key.id === id), `Missing authored camera key ${id}`));
  [
    'emergent-orbit-quarter',
    'emergent-orbit-rear',
    'emergent-orbit-three-quarter',
  ].forEach((id) => assert.equal(cameraKeys.some((key) => key.id === id), false));
  const finaleHold = cameraKeys.find((key) => key.id === 'finale-hold');
  assert.ok(finaleHold);
  assert.equal(finaleHold.aimEnabled, true);
  assert.equal(finaleHold.atWU, canonical.profiles.desktop.storyDurationWU);
  assert.equal(cameraKeys.some((key) => /orbital|bust/.test(key.id)), false);
  cameraKeys.forEach((key) => {
    ['aimEnabled', 'atWU', 'easing', 'fov', 'id', 'locked', 'lookAtRoll', 'lookAtTarget', 'position', 'rotation']
      .forEach((field) => assert.equal(Object.hasOwn(key, field), true));
    assert.equal(typeof key.aimEnabled, 'boolean');
    assert.equal(key.lookAtTarget.length, 3);
    assert.equal(Number.isFinite(key.lookAtRoll), true);
  });
  assert.equal(visibilityKeys.length, 11);
  assert.equal(visibilityKeys[0].atWU, 0);
  assert.equal(visibilityKeys.at(-1).atWU, canonical.profiles.desktop.storyDurationWU);
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
      atWU: 10.519,
      visibility: 0.86,
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
  assert.equal(authored.shapeParameters.density, 0.3);
  assert.ok(authored.shapeParameters.density < grid.shapeParameters.density);
  assert.equal(authored.modifiers[1].parameters.surfaceCarry, 1);
  assert.equal(authored.modifiers[1].parameters.fragmentPresence, 0.5);
  assert.equal(authored.protected, true);

  for (const layoutProfile of ['desktop', 'tablet', 'mobile']) {
    const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile });
    const resolved = plan.worlds.find((world) => world.id === authored.id);
    assert.ok(resolved, `${layoutProfile} must retain the bust World.`);
    assert.equal(resolved.shapeId, 'bust-v1');
    assert.equal(resolved.transitionIn.correspondence, 'radial-emergence-v1');
    assert.ok(Number(resolved.transform.scale) > 0);
    if (layoutProfile === 'mobile') {
      assert.ok(Number(resolved.transform.mobileScale) > 0);
      assert.ok(Number(resolved.transform.mobileScale) < Number(resolved.transform.scale));
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
  assert.match(liveSources.experience, /pointProfile=\{runtimePlan\?\.pointProfile\}/);
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
  assert.ok(reveal.parameters.reconnectOpacity > 0);
  assert.ok(reveal.parameters.restoreDurationWU > 0);
  assert.equal(canonical.tracks.text.fields.some((field) => field.kind === 'discipline-reveal'), false);
  assert.doesNotMatch(liveSources.world, /worldDisciplineRise|resolveDisciplineStoryOffset|storyOffset/);
  assert.match(liveSources.world, /camera\.position\.fromArray\(frame\.camera\.position\)/);
  assert.match(liveSources.world, /uniforms\.fromDisciplineIsolation\.value = isolationWeight/);
  assert.doesNotMatch(liveSources.world, /writeDisciplineSide|packDisciplineOrder/);
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

test('the Camera row exposes global distance fog and protected boundary poses remain editable', () => {
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
  assert.match(liveSources.editor, /Timing fixed · Pose editable/);
  assert.match(liveSources.world, /float cameraDepth = max\(0\.0, -viewPoint\.z\)/);
  assert.match(liveSources.world, /presence \*= 1\.0 - distanceFog/);
});

test('B forms a denser moving field and the Camera flies straight through it', () => {
  const complexity = canonical.tracks.worlds.objects.find((world) => world.id === 'world-complexity');
  assert.deepEqual(complexity.shapeParameters, {
    width: 10.5,
    height: 13.8,
    depth: 38.6,
    chunkCount: 30,
    chunkSize: 7.55,
    scatter: 0.14,
    turbulence: 0.42,
    density: 0.38,
  });
  assert.equal(complexity.modifiers[0].id, 'swarm-life-v1');
  assert.equal(complexity.modifiers[0].parameters.strength, 1.5);

  const keys = new Map(canonical.tracks.camera.keys.map((key) => [key.id, key]));
  const flyThrough = [
    'orb-establish',
    'complexity-exit',
    'complexity-exit-2',
  ].map((id) => keys.get(id));
  flyThrough.forEach((key) => {
    assert.ok(key);
    assert.equal(key.position[0], 0);
    [...key.position, ...key.rotation].forEach((value) => assert.ok(Number.isFinite(value)));
  });
  const cameraZ = (key) => key.position[2];
  const flyThroughZ = flyThrough.map(cameraZ);
  assert.ok(flyThroughZ[1] < flyThroughZ[0]);
  assert.ok(flyThroughZ[2] < flyThroughZ[1]);
  assert.ok(flyThrough[0].position[2] > 0);
  assert.ok(flyThrough.at(-1).position[2] < 0);
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

test('World C flies into plan view before an aimed descent into the bust', () => {
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
  const gridFlightIds = [
    'grid-birds-eye',
    'discipline-hold',
  ];
  const targetedIds = [
    'grid-return-centered',
    'ripple-overhead-hold',
    'finale-hold',
  ];
  const gridFlightKeys = gridFlightIds.map((id) => keys.get(id));
  gridFlightKeys.forEach((key) => {
    assert.ok(key);
    assert.equal(key.aimEnabled, false);
    assert.equal(key.rotation[1], 0);
    assert.equal(key.rotation[2], 0);
    assert.equal(key.lookAtRoll, 0);
  });
  assert.deepEqual(gridFlightKeys.map((key) => key.rotation[0]), [-82, -90]);
  const flyoverKeys = [keys.get('complexity-exit-2'), ...gridFlightKeys];
  flyoverKeys.slice(1).forEach((key, index) => {
    assert.ok(key.position[2] > flyoverKeys[index].position[2], 'World C camera must move forward continuously');
    assert.ok(key.position[1] >= flyoverKeys[index].position[1], 'World C camera must rise continuously');
    assert.ok(key.rotation[0] < flyoverKeys[index].rotation[0], 'World C camera must tilt downward continuously');
  });
  const targetedKeys = targetedIds.map((id) => keys.get(id));
  const gridTarget = keys.get('grid-return-centered').lookAtTarget;
  const finaleTarget = keys.get('finale-hold').lookAtTarget;
  targetedKeys.forEach((key) => {
    assert.ok(key);
    assert.equal(key.aimEnabled, true);
    assert.equal(key.lookAtRoll, 0);
  });
  assert.deepEqual(keys.get('ripple-overhead-hold').lookAtTarget, gridTarget);
  assert.equal(gridTarget[1], -0.88);
  assert.deepEqual(finaleTarget, [-0.5, -3.85, 0]);
  assert.ok(keys.get('ripple-overhead-hold').position[1] < keys.get('grid-return-centered').position[1]);
  assert.ok(keys.get('ripple-overhead-hold').position[2] < keys.get('grid-return-centered').position[2]);
  assert.ok(keys.get('finale-hold').position[1] < keys.get('ripple-overhead-hold').position[1]);
  assert.ok(keys.get('finale-hold').position[2] > keys.get('ripple-overhead-hold').position[2]);
  assert.equal(keys.get('ripple-overhead-hold').easing, 'cubic-bezier(0.32, 0, 0.82, 1)');
  const shift = keys.get('grid-birds-eye');
  const bridgeTitle = canonical.tracks.text.fields.find((field) => field.id === 'text-complexity-listen');
  assert.ok(shift.atWU > bridgeTitle.endWU);
  assert.ok(shift.atWU - bridgeTitle.endWU <= 2);
  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  const firstFrame = sampleAboutNarrativeRuntimePlan(plan, shift.atWU);
  for (let storyWU = shift.atWU; storyWU <= keys.get('discipline-hold').atWU; storyWU += 0.025) {
    const frame = sampleAboutNarrativeRuntimePlan(plan, storyWU);
    assert.equal(frame.camera.targeted, false);
    assert.equal(frame.camera.aimWeight, 0);
  }
  for (let storyWU = keys.get('grid-return-centered').atWU; storyWU <= keys.get('finale-hold').atWU; storyWU += 0.025) {
    const frame = sampleAboutNarrativeRuntimePlan(plan, storyWU);
    assert.equal(frame.camera.targeted, true);
    assert.equal(frame.camera.aimWeight, 1);
    frame.camera.lookAtTarget.forEach((value) => assert.ok(Number.isFinite(value)));
  }
  const rippleBoundaryWU = keys.get('ripple-overhead-hold').atWU;
  const beforeRippleBoundary = sampleAboutNarrativeRuntimePlan(plan, rippleBoundaryWU - 0.005);
  const afterRippleBoundary = sampleAboutNarrativeRuntimePlan(plan, rippleBoundaryWU + 0.005);
  const rippleBoundaryQuaternionDot = beforeRippleBoundary.camera.quaternion.reduce(
    (sum, value, index) => sum + (value * afterRippleBoundary.camera.quaternion[index]),
    0,
  );
  assert.ok(
    Math.abs(rippleBoundaryQuaternionDot) > 0.999999,
    'The retained overhead camera must not roll when C → E starts.',
  );
  for (const layoutProfile of ['desktop', 'tablet', 'mobile']) {
    const descentPlan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile });
    const descentKeys = new Map(descentPlan.cameraKeys.map((key) => [key.id, key]));
    const descentStart = descentKeys.get('ripple-overhead-hold');
    const descentEnd = descentKeys.get('finale-hold');
    assert.ok(descentEnd.lookAtTarget[1] < descentStart.lookAtTarget[1]);
    if (layoutProfile === 'mobile') {
      assert.equal(descentEnd.lookAtTarget[2], descentStart.lookAtTarget[2]);
      assert.deepEqual(descentEnd.position, [0.741342, 0.84025, -17.25]);
    } else {
      assert.ok(descentEnd.lookAtTarget[2] > descentStart.lookAtTarget[2]);
    }
    const descentMidpoint = sampleAboutNarrativeRuntimePlan(
      descentPlan,
      (descentStart.atWU + descentEnd.atWU) * 0.5,
    );
    [...descentMidpoint.camera.position, ...descentMidpoint.camera.lookAtTarget]
      .forEach((value) => assert.ok(Number.isFinite(value)));
  }
  const finaleFrame = sampleAboutNarrativeRuntimePlan(plan, keys.get('finale-hold').atWU);
  assert.notDeepEqual(finaleFrame.camera.quaternion, firstFrame.camera.quaternion);
  assert.ok(finaleFrame.camera.position[1] < keys.get('ripple-overhead-hold').position[1]);
  assert.ok(finaleFrame.camera.position[2] > keys.get('ripple-overhead-hold').position[2]);

  const visibility = new Map(canonical.tracks.visibility.keys.map((key) => [key.id, key]));
  const editorialOff = visibility.get('visibility-editorial-off');
  const returnStart = visibility.get('visibility-return-start');
  const returned = visibility.get('visibility-returned');
  assert.equal(editorialOff.visibility, 0);
  assert.equal(returnStart.visibility, 0);
  assert.equal(returned.visibility, 1);
  assert.equal(sampleAboutNarrativeRuntimePlan(
    plan,
    (editorialOff.atWU + returnStart.atWU) * 0.5,
  ).simulation.visibility, 0);
  assert.equal(sampleAboutNarrativeRuntimePlan(plan, returnStart.atWU).simulation.visibility, 0);
  assert.equal(sampleAboutNarrativeRuntimePlan(plan, returned.atWU).simulation.visibility, 1);
  const rippleClip = canonical.tracks.interactions.clips.find((clip) => clip.id === 'interaction-grid-ripple');
  assert.equal(rippleClip.startWU, keys.get('grid-return-centered').atWU);
  assert.ok(rippleClip.startWU > editorialOff.atWU);

  const bustBottomY = canonical.tracks.worlds.objects.find((world) => world.id === 'world-emergent').transform.position[1]
    - (0.858 * canonical.tracks.worlds.objects.find((world) => world.id === 'world-emergent').transform.scale);
  assert.ok(Math.abs(bustBottomY - rippleCenter[1]) < 0.6);

  const verticalPositions = ABOUT_NARRATIVE_DISCIPLINE_ANCHORS.map((anchor) => anchor.y);
  const horizontalPositions = ABOUT_NARRATIVE_DISCIPLINE_ANCHORS.map((anchor) => anchor.x);
  assert.equal(new Set(verticalPositions).size, 6);
  assert.ok(Math.max(...horizontalPositions) - Math.min(...horizontalPositions) >= 0.5);
  assert.ok(Math.min(...horizontalPositions) >= 0.1);
  assert.ok(Math.max(...horizontalPositions) <= 0.72);
  assert.ok(Math.max(...verticalPositions) - Math.min(...verticalPositions) <= 0.45);
  assert.ok(Math.min(...verticalPositions) >= 0.5);
  assert.ok(Math.max(...verticalPositions) <= 0.95);
  assert.ok(verticalPositions.at(-1) > verticalPositions[0]);

  const disciplineReveal = canonical.tracks.interactions.clips.find((clip) => (
    clip.type === 'discipline-reveal'
  ));
  const homeDescriptions = new Map(homeContent.legend.items.map((item) => [item.label, item.tooltip]));
  disciplineReveal.parameters.items.forEach((item) => {
    assert.equal(item.description, homeDescriptions.get(item.label));
    assert.ok(item.position[0] >= 0.1 && item.position[0] <= 0.72);
    assert.ok(item.position[1] >= 0.4 && item.position[1] <= 0.95);
    assert.ok(item.mobilePosition[0] >= 0.1 && item.mobilePosition[0] <= 0.72);
    assert.ok(item.mobilePosition[1] >= 0.4 && item.mobilePosition[1] <= 0.95);
  });
  const assertMinimumGridSeparation = (positions, pointCount) => {
    const columns = Math.max(24, Math.floor(Math.sqrt(pointCount * 1.36)));
    const rows = Math.ceil(pointCount / columns);
    positions.forEach((position, index) => positions.slice(index + 1).forEach((other, offset) => {
      const dotDistance = Math.hypot(
        (position[0] - other[0]) * (columns - 1),
        (position[1] - other[1]) * (rows - 1),
      );
      const otherIndex = index + offset + 1;
      assert.ok(dotDistance >= 4.5, `Discipline anchors ${index + 1} and ${otherIndex + 1} are only ${dotDistance.toFixed(2)} grid dots apart.`);
    }));
  };
  const assertMinimumVerticalGridSeparation = (positions, pointCount) => {
    const columns = Math.max(24, Math.floor(Math.sqrt(pointCount * 1.36)));
    const rows = Math.ceil(pointCount / columns);
    const orderedRows = positions
      .map((position) => Math.round(position[1] * (rows - 1)))
      .sort((a, b) => a - b);
    orderedRows.slice(1).forEach((row, index) => {
      assert.ok(row - orderedRows[index] >= 4, `Discipline rows ${index + 1} and ${index + 2} are fewer than 4 grid dots apart.`);
    });
  };
  assertMinimumGridSeparation(disciplineReveal.parameters.items.map((item) => item.position), 12000);
  assertMinimumGridSeparation(disciplineReveal.parameters.items.map((item) => item.mobilePosition), 5000);
  assertMinimumVerticalGridSeparation(disciplineReveal.parameters.items.map((item) => item.position), 12000);
  assertMinimumVerticalGridSeparation(disciplineReveal.parameters.items.map((item) => item.mobilePosition), 5000);
  assert.ok(keys.get('grid-birds-eye').position[1] <= keys.get('discipline-hold').position[1]);
  const mobileVerticalPositions = disciplineReveal.parameters.items.map((item) => item.mobilePosition[1]);
  assert.ok(new Set(mobileVerticalPositions).size >= 5);
  assert.ok(Math.max(...mobileVerticalPositions) - Math.min(...mobileVerticalPositions) <= 0.45);
  assert.ok(Math.min(...mobileVerticalPositions) >= 0.5);
  [
    'labelWindowWU',
    'staggerWU',
    'labelDurationWU',
    'holdWU',
    'readingLineY',
    'mobileReadingLineY',
    'approachBandY',
    'exitLineY',
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
    const compactTarget = compactKeys.get('grid-return-centered').lookAtTarget;
    gridFlightIds.forEach((id) => assert.equal(compactKeys.get(id).aimEnabled, false));
    targetedIds.forEach((id) => {
      const key = compactKeys.get(id);
      assert.equal(key.aimEnabled, true);
      key.lookAtTarget.forEach((value) => assert.ok(Number.isFinite(value)));
    });
    assert.deepEqual(compactKeys.get('ripple-overhead-hold').lookAtTarget, compactTarget);
    if (profileId === 'mobile') {
      assert.deepEqual(compactKeys.get('finale-hold').lookAtTarget, [-0.23, -0.95, -7.035]);
      assert.ok(compactKeys.get('finale-hold').lookAtTarget[1] < compactTarget[1]);
    } else {
      assert.ok(compactKeys.get('finale-hold').lookAtTarget[2] > compactTarget[2]);
    }
    const compactBackground = compactPlan.worlds.find((world) => world.id === background.id);
    assert.equal(compactPlan.pointProfile, 'mobile');
    assert.equal(compactBackground.shapeId, 'calm-field-v1');
  }
  const emergentWorld = canonical.tracks.worlds.objects.find((world) => world.id === 'world-emergent');
  assert.equal(emergentWorld.transform.mobileLandscapeScale, 1.8);
  assert.equal(emergentWorld.transform.mobileLandscapeXScale, 1.8);
  assert.equal(emergentWorld.transform.mobileLandscapeXOffset, 3.8);
  assert.equal(emergentWorld.transform.mobileLandscapeYOffset, -2);
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
  assert.equal(clip.activationWU, clip.startWU);
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
  assert.match(liveSources.world, /const isolationWeight = Number\(revealState\.backgroundProgress \|\| 0\)[\s\S]*?\* \(1 - Number\(revealState\.restoreProgress \|\| 0\)\)/);
  assert.match(liveSources.world, /frame\.globals\.editorialRevealThreshold[\s\S]*?frame\.globals\.editorialMotion\?\.fadeDurationWU/);
  assert.match(liveSources.world, /disciplineWeights\[group - 1\] = revealProgress/);
  assert.match(liveSources.world, /const activationRevealProgress = getAboutNarrativeSharedRevealProgress/);
  assert.match(liveSources.world, /const revealProgress = Math.min/);
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
  assert.equal(Number((finale.focusWU - finale.startWU).toFixed(4)), 0.48);
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
    'I’m a designer and technologist. Most of my projects involve products, systems and interactive experiences, often all three at once.',
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
      gaps: [0.5, 0.33],
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

test('semantic handoffs keep deliberate breaths without empty scroll runs', () => {
  const fields = new Map(canonical.tracks.text.fields.map((field) => [field.id, field]));
  const reveal = canonical.tracks.interactions.clips.find((clip) => clip.type === 'discipline-reveal');
  const emergent = canonical.tracks.worlds.objects.find((world) => world.id === 'world-emergent');
  const pointKeys = new Map(canonicalV6.tracks.pointField.keys.map((key) => [key.id, key]));
  const visibilityKeys = new Map(canonicalV6.tracks.visibility.keys.map((key) => [key.id, key]));
  const firstDisciplineHeading = fields.get('text-complexity-curiosity');
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
  assert.ok(finale.startWU - emergent.startWU <= 0.81);
  assert.ok(visibilityKeys.get('visibility-grid-visible').atWU <= firstDisciplineHeading.startWU);
  assert.equal(
    Number((
      (finale.startWU - pointKeys.get('key-world-emergent-departure').atWU)
      / (
        pointKeys.get('key-world-emergent-arrival').atWU
        - pointKeys.get('key-world-emergent-departure').atWU
      )
    ).toFixed(6)),
    0.310284,
  );
  assert.equal(canonical.profiles.desktop.storyDurationWU, 17.81);
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
  assert.equal(backgroundUnit.block.modules.filter((module) => module.kind === 'prose').length, 3);
  const logoGrid = backgroundUnit.block.modules.find((module) => module.kind === 'logo-grid');
  assert.equal(logoGrid.items.length, 14);
  assert.equal(
    logoGrid.label,
    'Selected work across verification, finance, aviation, automotive, hospitality, media and infrastructure.',
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
  assert.equal(disciplineEditorial.block.modules.filter((module) => module.kind === 'prose').length, 4);
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
  const firstBridgeTitle = fields.find((field) => field.id === 'text-complexity-curiosity');
  const finalBridgeTitle = fields.find((field) => field.id === 'text-complexity-listen');
  const disciplineReveal = canonical.tracks.interactions.clips.find((clip) => (
    clip.type === 'discipline-reveal'
  ));
  assert.ok(firstBridgeTitle.startWU < backgroundUnit.endWU);
  assert.ok(backgroundUnit.endWU - firstBridgeTitle.startWU <= 0.8);
  assert.ok(finalBridgeTitle.startWU > firstBridgeTitle.endWU);
  assert.equal(canonical.globals.textMotion.standardViewportY, 50);
  assert.equal(firstBridgeTitle.presentation.viewportY, undefined);
  assert.equal(finalBridgeTitle.presentation.viewportY, undefined);
  assert.ok(disciplineReveal.startWU <= firstBridgeTitle.startWU);
  assert.equal(disciplineReveal.activationWU, disciplineReveal.startWU);
  assert.ok(disciplineReveal.endWU > finalBridgeTitle.endWU);
  assert.ok(disciplineEditorial.startWU >= disciplineReveal.endWU - 0.8);
  assert.ok(disciplineEditorial.focusWU >= disciplineReveal.endWU - 0.4);
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
  assert.equal(canonicalSource.includes('"emphasis"'), false);
  assert.equal(canonical.globals.editorialRevealThreshold, 0.8);
  assert.equal(canonical.globals.editorialMotion.fadeDurationWU, 0.2);
  assert.equal(canonical.globals.editorialMotion.maxBlurPx, 0);
  assert.equal(canonical.globals.editorialMotion.travelPx, 0);
  assert.match(liveSources.timeline, /getAboutNarrativeEditorialReveal\(/);
  assert.doesNotMatch(liveSources.timeline, /editorial-blur|editorial-y/);
  assert.match(liveSources.timeline, /getAboutNarrativeSharedRevealProgress/);
  assert.match(liveSources.world, /getAboutNarrativeSharedRevealProgress/);
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
  assert.match(liveSources.styles, /--about-editorial-resting-opacity: 0\.2/);
  assert.match(liveSources.styles, /\[data-editorial-reveal\] \{[\s\S]*?opacity: calc\(/);
  assert.match(liveSources.styles, /--about-spatial-title-type-size: clamp\([\s\S]*?var\(--about-editorial-type-size\) \* 1\.55/);
  assert.match(liveSources.styles, /font-size: var\(--about-spatial-title-type-size\)/);
  assert.match(liveSources.experience, /function EditorialLineText/);
  assert.match(liveSources.experience, /className="about-narrative-media-deck"[\s\S]*?data-editorial-reveal="module"/);
  assert.match(liveSources.experience, /data-editorial-reveal': 'word'/);
  assert.match(liveSources.experience, /data-editorial-sequence-ratio/);
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

test('published narrative writing follows V25 with the authored finale CTA', () => {
  const normalize = (value) => String(value || '')
    .toLocaleLowerCase('en-GB')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const normalizedScript = normalize(currentScriptSource);
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
    assert.ok(normalizedScript.includes(normalize(copy)), `V25 is missing live copy: ${copy}`);
  });
  const reveal = canonical.tracks.interactions.clips.find((clip) => clip.type === 'discipline-reveal');
  reveal.parameters.items.forEach((item) => {
    assert.ok(normalizedScript.includes(normalize(item.label)), `V25 is missing ${item.label}`);
  });
  assert.equal(
    canonical.tracks.text.fields.find((field) => field.preset === 'finale-v1')?.text,
    'Get in Touch',
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
  assert.equal(finale.startWU, 15.91);
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
  assert.equal(finalHold.atWU, finale.endWU);
  assert.equal(finalHold.aimEnabled, true);
  assert.match(liveSources.experience, /about-narrative-finale-content/);
  assert.match(liveSources.styles, /\.about-narrative-finale-content/);
  assert.match(liveSources.styles, /about-narrative-finale-content \{[\s\S]*?top: var\(--about-finale-lockup-y, var\(--about-title-viewport-y, 70%\)\);[\s\S]*?translate3d\(0, -50%, 0\)/);
  assert.match(liveSources.styles, /--route-intro-description-max-width: 42ch/);
  assert.match(liveSources.styles, /--route-intro-description-max-width: 32ch/);
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

test('editor exposes the five native v6 lanes and all Text creation kinds', () => {
  const trackDeclaration = liveSources.editor.slice(
    liveSources.editor.indexOf('const POINT_FIELD_TRACKS'),
    liveSources.editor.indexOf('const TRACK_BY_ID'),
  );
  assert.deepEqual(
    [...trackDeclaration.matchAll(/id: '([^']+)'/g)].map((match) => match[1]),
    ['camera', 'visibility', 'point-field', 'text', 'interaction'],
  );
  assert.doesNotMatch(liveSources.editor, /sectionId|sectionRefs|data-narrative-section|['"]section['"]\s*,\s*label/i);
  assert.match(liveSources.editor, /createAtPlayhead\('text', 'title'\)/);
  assert.match(liveSources.editor, /createAtPlayhead\('text', 'scroll-block'\)/);
  assert.match(liveSources.editor, /createAtPlayhead\('text', 'stub'\)/);
  assert.match(liveSources.editor, /Draft · Not published/);
  assert.match(liveSources.editor, /Reduced Motion/);
});
