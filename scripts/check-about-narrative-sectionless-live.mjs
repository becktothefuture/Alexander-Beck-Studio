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
import { loadAboutNarrativeTrackSource } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackPersistence.js';
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
const canonicalV4 = JSON.parse(canonicalSource);
const loadedCanonical = loadAboutNarrativeTrackSource(canonicalV4);
assert.equal(loadedCanonical.valid, true);
const canonical = loadedCanonical.document;
const currentScriptSource = await read('../docs/research/about-page-direction/ABOUT-NARRATIVE-SCRIPT-v24.md');
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

function assertCameraValue(actual, expected, label) {
  assert.ok(
    Math.abs(actual - expected) < 0.00001,
    `${label}: expected ${expected}, received ${actual}`,
  );
}

test('canonical About source is a deterministic native v5 runtime document', () => {
  assert.equal(canonicalV4.schemaVersion, 5);
  assert.equal(canonical.schemaVersion, 5);
  assert.deepEqual(loadedCanonical.migrations, []);
  assert.equal(legacy.schemaVersion, 2, 'The frozen parity fixture must remain legacy v2.');
  assert.deepEqual(collectForbiddenContainers(canonicalV4), []);
  assert.deepEqual(collectForbiddenContainers(canonical), []);
  assert.equal(validateAboutNarrativeTrackDocument(canonical).filter((item) => item.level === 'error').length, 0);
  assert.match(canonicalSource, /"tracks": \{/);
  assert.doesNotMatch(canonicalSource, /"sections"\s*:/);
});

test('canonical v5 authors one consolidated camera, visibility, and four-World emergent sequence', () => {
  const cameraKeys = canonical.tracks.camera.keys;
  const visibilityKeys = canonical.tracks.visibility.keys;
  const worlds = canonical.tracks.worlds.objects;
  const reveal = canonical.tracks.interactions.clips.find((clip) => clip.type === 'discipline-reveal');
  const ripple = canonical.tracks.interactions.clips.find((clip) => clip.type === 'grid-ripple');
  const grid = worlds.find((world) => world.id === ripple?.targetWorldId);
  const emergent = worlds.find((world) => world.id === 'world-emergent');

  assert.ok(reveal);
  assert.ok(ripple);
  assert.equal(cameraKeys.length, 12);
  const obliqueKey = cameraKeys.find((key) => key.id === 'emergent-oblique');
  const throughKey = cameraKeys.find((key) => key.id === 'emergent-through');
  const finaleHold = cameraKeys.find((key) => key.id === 'finale-hold');
  assert.ok(obliqueKey);
  assert.ok(throughKey);
  assert.ok(finaleHold);
  assert.deepEqual(finaleHold.position, throughKey.position);
  assert.deepEqual(finaleHold.rotation, throughKey.rotation);
  assert.equal(finaleHold.fov, throughKey.fov);
  assert.equal(cameraKeys.some((key) => /orbital|bust/.test(key.id)), false);
  cameraKeys.forEach((key) => {
    assert.deepEqual(
      Object.keys(key).sort(),
      ['atWU', 'easing', 'fov', 'id', 'locked', 'position', 'rotation'],
    );
  });
  assert.equal(visibilityKeys.length, 15);
  assert.equal(visibilityKeys[0].atWU, 0);
  assert.equal(visibilityKeys.at(-1).atWU, canonical.profiles.desktop.storyDurationWU);
  assert.ok(visibilityKeys.some((key) => key.visibility === 0));
  assert.ok(visibilityKeys.some((key) => key.visibility === 1));
  assert.equal(visibilityKeys.find((key) => key.id === 'visibility-open-space')?.atWU, throughKey.atWU);
  assert.equal(visibilityKeys.at(-1).visibility, 0);
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
      ['world-emergent', 'emergent-form-v1'],
    ],
  );
  assert.ok(grid);
  assert.ok(emergent);
  assert.equal(ripple.endWU, emergent.startWU);
  assert.equal(emergent.transitionIn.correspondence, 'spatial-nearest-v2');
  assert.equal(emergent.modifiers.some((modifier) => modifier.id === 'ambient-drift-v1'), true);
  assert.equal(emergent.protected, true);
  assert.equal(worlds.some((world) => /orbital|bust/.test(world.shapeId)), false);

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

test('emergent form stays a single protected World across responsive profiles', () => {
  const authored = canonical.tracks.worlds.objects.find((world) => world.id === 'world-emergent');
  const grid = canonical.tracks.worlds.objects.find((world) => world.id === 'world-grid');
  const pulse = canonical.tracks.interactions.clips.find((clip) => clip.type === 'grid-ripple');
  assert.ok(authored);
  assert.ok(grid);
  assert.ok(pulse);
  assert.equal(authored.shapeId, 'emergent-form-v1');
  assert.equal(authored.startWU, pulse.endWU);
  assert.equal(authored.transitionIn.startWU, authored.startWU);
  assert.ok(authored.transitionIn.endWU > authored.transitionIn.startWU);
  assert.equal(authored.transitionIn.correspondence, 'spatial-nearest-v2');
  assert.equal(authored.modifiers.length, 1);
  assert.equal(authored.modifiers[0].id, 'ambient-drift-v1');
  assert.equal(authored.protected, true);
  assert.ok(authored.shapeParameters.radius >= 2);
  assert.ok(authored.shapeParameters.height >= 4.5);
  assert.ok(authored.shapeParameters.density >= 0.5);

  for (const layoutProfile of ['desktop', 'tablet', 'mobile']) {
    const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile });
    const resolved = plan.worlds.find((world) => world.id === authored.id);
    assert.ok(resolved, `${layoutProfile} must retain the emergent World.`);
    assert.equal(resolved.shapeId, 'emergent-form-v1');
    assert.equal(resolved.transitionIn.correspondence, 'spatial-nearest-v2');
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
  assert.deepEqual(background.modifiers, []);
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
  assert.match(liveSources.world, /writeDisciplineSide/);
  assert.match(liveSources.experience, /data-motion-clip-id/);
  assert.match(liveSources.styles, /data-label-side='left'/);
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

test('the Text row header exposes only native-v5 global animation controls', () => {
  assert.deepEqual(
    ABOUT_NARRATIVE_TEXT_TRACK_CONTROL_GROUPS.map((group) => group.id),
    ['text-layout', 'text-path', 'text-clarity', 'text-depth', 'text-editorial'],
  );
  const exposedControls = ABOUT_NARRATIVE_GLOBAL_CONTROLS.flatMap((group) => group.controls)
    .filter((control) => control.group?.startsWith('text-'));
  assert.deepEqual(
    exposedControls.map((control) => control.id),
    [
      'readingWidthRem',
      'editorialRevealThreshold',
      'standardMaxWidthCh',
      'displayMaxWidthCh',
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
  assert.match(liveSources.editor, /Text windows define the narrative cadence and Story length/);
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
    ['position.0', 'position.1', 'position.2', 'rotation.0', 'rotation.1', 'rotation.2', 'fov'],
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
  });
  const invalidFog = structuredClone(canonical);
  invalidFog.globals.camera.distanceFogStartWU = invalidFog.globals.camera.distanceFogEndWU;
  assert.ok(validateAboutNarrativeTrackDocument(invalidFog).some(
    (item) => item.code === 'camera-fog-order',
  ));
  assert.match(liveSources.editor, /data-track-settings="camera"/);
  assert.match(liveSources.editor, /Distance fog/);
  assert.match(liveSources.editor, /Camera rig/);
  assert.doesNotMatch(liveSources.editor, /Depth offset|Frame origin|Target coordinates|Aim target/);
  assert.match(liveSources.editor, /Distance fog is global across the sequence/);
  assert.match(liveSources.editor, /Position, rotation and field of view are fully editable/);
  assert.match(liveSources.world, /float cameraDepth = max\(0\.0, -viewPoint\.z\)/);
  assert.match(liveSources.world, /presence \*= 1\.0 - distanceFog/);
});

test('B forms a denser moving field and the Camera flies straight through it', () => {
  const complexity = canonical.tracks.worlds.objects.find((world) => world.id === 'world-complexity');
  assert.deepEqual(complexity.shapeParameters, {
    width: 12.2,
    height: 9.4,
    depth: 24,
    chunkCount: 18,
    chunkSize: 2.6,
    scatter: 0.14,
    turbulence: 0.42,
    density: 0.38,
  });
  assert.equal(complexity.modifiers[0].id, 'swarm-life-v1');
  assert.equal(complexity.modifiers[0].parameters.strength, 1.5);

  const keys = new Map(canonical.tracks.camera.keys.map((key) => [key.id, key]));
  const flyThrough = [
    'orb-establish',
    'complexity-inside',
    'complexity-exit',
  ].map((id) => keys.get(id));
  flyThrough.forEach((key) => {
    assert.ok(key);
    assert.equal(key.position[0], 0);
    [...key.position, ...key.rotation].forEach((value) => assert.ok(Number.isFinite(value)));
  });
  const cameraZ = (key) => key.position[2];
  const flyThroughZ = flyThrough.map(cameraZ);
  assert.ok(flyThroughZ.every((value, index) => index === 0 || value < flyThroughZ[index - 1]));
  assert.ok(flyThrough[0].position[2] > 0);
  assert.ok(flyThrough.at(-1).position[2] < 0);
  const openingPlan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  for (let storyWU = 0; storyWU <= flyThrough.at(-1).atWU; storyWU += 0.005) {
    const frame = sampleAboutNarrativeRuntimePlan(openingPlan, storyWU);
    assert.ok(Number.isFinite(frame.camera.position[2]), `Opening Camera is invalid at ${storyWU.toFixed(3)} WU.`);
  }
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

test('World C holds a top-down discipline reveal before the emergent handoff', () => {
  const keys = new Map(canonical.tracks.camera.keys.map((key) => [key.id, key]));
  const background = canonical.tracks.worlds.objects.find((world) => world.label === 'C');
  const shift = keys.get('grid-birds-eye');
  const reveal = keys.get('grid-birds-eye-hold');
  const returnKey = keys.get('grid-return-centered');
  const ripple = keys.get('grid-ripple-zoomout');
  const emergent = keys.get('emergent-oblique');
  assert.ok(background);
  [shift, reveal, returnKey, ripple, emergent].forEach((key) => assert.ok(key));
  [shift, reveal].forEach((key) => {
    assert.deepEqual(key.position, [0, 3.5, -0.32]);
    assert.deepEqual(key.rotation, [-90, 0, 0]);
    assert.equal(key.fov, 42);
  });

  const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile: 'desktop' });
  const heldQuaternion = [...sampleAboutNarrativeRuntimePlan(plan, shift.atWU).camera.quaternion];
  for (let storyWU = shift.atWU; storyWU <= reveal.atWU; storyWU += 0.005) {
    const frame = sampleAboutNarrativeRuntimePlan(plan, storyWU);
    assert.deepEqual([...frame.camera.position], [0, 3.5, -0.32]);
    assert.equal(frame.camera.fov, 42);
    frame.camera.quaternion.forEach((value, index) => assertCameraValue(
      value,
      heldQuaternion[index],
      `discipline hold rotation ${index} at ${storyWU}`,
    ));
  }
  assert.deepEqual(returnKey.rotation, [-90, 0, 0]);
  assert.deepEqual(ripple.rotation, [-90, 0, 0]);
  assert.ok(ripple.position[1] > returnKey.position[1]);
  assert.ok(emergent.atWU > ripple.atWU);
  assert.notDeepEqual(emergent.rotation, ripple.rotation);

  const verticalPositions = ABOUT_NARRATIVE_DISCIPLINE_ANCHORS.map((anchor) => anchor.y);
  const leftColumn = ABOUT_NARRATIVE_DISCIPLINE_ANCHORS.filter((anchor) => anchor.x < 0.5);
  const rightColumn = ABOUT_NARRATIVE_DISCIPLINE_ANCHORS.filter((anchor) => anchor.x > 0.5);
  assert.equal(new Set(verticalPositions).size, 6);
  assert.equal(leftColumn.length, 3);
  assert.equal(rightColumn.length, 3);
  assert.ok(Math.max(...verticalPositions) - Math.min(...verticalPositions) >= 0.08);
  assert.ok(verticalPositions.at(-1) > verticalPositions[0]);
  assert.equal(canonical.profiles.mobile.overrides.camera['grid-return-centered'].fov, 64);
  assert.equal(canonical.profiles.mobile.overrides.camera['grid-ripple-zoomout'].fov, 64);
  assert.deepEqual(canonical.profiles.mobile.overrides.camera['grid-birds-eye'].position, [0, 5, -0.32]);
  assert.deepEqual(canonical.profiles.mobile.overrides.camera['grid-birds-eye-hold'].position, [0, 5, -0.32]);
  assert.deepEqual(canonical.profiles.tablet.overrides.camera, {});
  for (const layoutProfile of ['tablet', 'mobile']) {
    const compactPlan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile });
    const compactBackground = compactPlan.worlds.find((world) => world.id === background.id);
    assert.equal(compactPlan.pointProfile, 'mobile');
    assert.equal(compactBackground.shapeId, 'calm-field-v1');
  }
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
  assert.equal(reveal.targetWorldId, world.id);
  assert.equal(reveal.parameters.items.length, 6);
  assert.equal(Object.hasOwn(reveal.parameters, 'fieldFogStrength'), false);
  assert.equal(clip.type, 'grid-ripple');
  assert.equal(clip.targetWorldId, world.id);
  assert.ok(clip.startWU >= reveal.endWU);
  assert.ok(clip.startWU >= world.startWU);
  assert.ok(clip.endWU <= nextWorld.startWU);
  assert.ok(clip.startWU <= clip.activationWU && clip.activationWU < clip.endWU);
  assert.ok(clip.parameters.amplitude > 0);
  assert.ok(clip.parameters.speed > 0);
  assert.match(liveSources.world, /gridRippleWeight/);
  assert.doesNotMatch(liveSources.world, /radialRipple|crossingRipple/);
  assert.match(liveSources.world, /uniform float gridRippleProgress/);
  assert.match(liveSources.world, /float gatheringReach = mix\([\s\S]*?gridRippleProgress/);
  assert.match(liveSources.world, /float gatheringFront = 1\.0 - smoothstep\(/);
  assert.match(liveSources.world, /worldPoint\.y \+= gatheringWeight[\s\S]*?gatheringFront/);
  assert.match(liveSources.world, /worldPoint\.xz -= rippleDirection[\s\S]*?gatheringWeight/);
  assert.doesNotMatch(liveSources.world, /rippleScale/);
  assert.match(liveSources.world, /const isolationWeight = Number\(revealState\.backgroundProgress \|\| 0\)[\s\S]*?\* \(1 - Number\(revealState\.restoreProgress \|\| 0\)\)/);
  assert.match(liveSources.editor, /getGridRippleStartControl\(snapshot\.document, object\)/);
  assert.match(liveSources.editor, /ariaLabel="Ripple starts"/);
  assert.match(liveSources.editor, /Move ripple start/);
  assert.match(liveSources.editor, /Number\(value\) \+ attackWU/);
  assert.doesNotMatch(liveSources.world, /discipline-(?:blur|shift)/);
  assert.match(liveSources.styles, /about-narrative-discipline-reveal__label \{[\s\S]*?filter: none;[\s\S]*?text-shadow: none;[\s\S]*?transform: none;/);
});

test('E begins after the C-grid pulse and resolves to one emergent World in every layout', () => {
  const fixedGrid = canonical.tracks.worlds.objects.find((world) => world.label === 'C');
  const emergent = canonical.tracks.worlds.objects.find((world) => world.label === 'E');
  const clip = canonical.tracks.interactions.clips.find((item) => item.type === 'grid-ripple');
  assert.ok(fixedGrid);
  assert.ok(emergent);
  assert.ok(clip);
  assert.equal(clip.targetWorldId, fixedGrid.id);
  assert.equal(clip.endWU, emergent.startWU);
  assert.equal(emergent.shapeId, 'emergent-form-v1');

  for (const layoutProfile of ['desktop', 'tablet', 'mobile']) {
    const plan = compileAboutNarrativeRuntimePlan(canonical, { layoutProfile });
    const resolvedFixedGrid = plan.worlds.find((world) => world.id === fixedGrid.id);
    const resolvedEmergent = plan.worlds.find((world) => world.id === emergent.id);
    assert.equal(resolvedFixedGrid.shapeId, 'calm-field-v1');
    assert.equal(resolvedEmergent.shapeId, 'emergent-form-v1');
    assert.equal(resolvedEmergent.startWU, clip.endWU);
  }
});

test('every travelling title shares one timing while the finale holds through the last frame', () => {
  const fieldsById = new Map(canonical.tracks.text.fields.map((field) => [field.id, field]));
  const titles = canonical.tracks.text.fields.filter((field) => field.kind === 'title');
  titles.filter((field) => field.preset !== 'finale-v1').forEach((field) => {
    assert.equal(Number((field.endWU - field.startWU).toFixed(4)), 0.8, `${field.id} duration`);
    assert.equal(Number((field.focusWU - field.startWU).toFixed(4)), 0.4, `${field.id} entry timing`);
    assert.equal(Number((field.endWU - field.focusWU).toFixed(4)), 0.4, `${field.id} exit timing`);
    assert.equal(field.movement, 'spatial', `${field.id} movement`);
  });
  const finale = fieldsById.get('text-epilogue-invitation');
  assert.equal(Number((finale.focusWU - finale.startWU).toFixed(4)), 0.4);
  assert.equal(finale.endWU, canonical.profiles.desktop.storyDurationWU);
  assert.equal(finale.preset, 'finale-v1');
});

test('spatial title hierarchy reserves display type for the opening and finale bookends', () => {
  const titles = canonical.tracks.text.fields.filter((field) => field.kind === 'title');
  const opener = titles.find((field) => field.id === 'text-promise-main');
  assert.equal(opener.text, 'About Me');
  assert.equal(opener.description, 'I help shape complexity into compelling experiences.');
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

test('only the opener Title may carry a route description', () => {
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
    /data-about-layout-profile='mobile'\] \.about-narrative-spatial-title \{\s*max-width:\s*14\.08ch;/,
  );
  assert.match(
    liveSources.styles,
    /data-about-layout-profile='mobile'\] \.about-narrative-spatial-copy\[data-title-style='display'\] \.about-narrative-spatial-title \{\s*max-width:\s*10\.88ch;/,
  );
  assert.match(
    liveSources.styles,
    /@media \(max-height: 600px\)[\s\S]*?data-title-style='display'[\s\S]*?max-width:\s*12\.16ch;/,
  );
});

test('title groups retain their authored pacing', () => {
  const fieldsById = new Map(canonical.tracks.text.fields.map((field) => [field.id, field]));
  const titleSets = [
    ['text-complexity-idea', 'text-complexity-conditions'],
    ['text-complexity-curiosity', 'text-complexity-listen'],
    ['text-life-momentum', 'text-life-form', 'text-life-character'],
  ];
  titleSets.forEach((ids) => ids.slice(1).forEach((id, index) => {
    const previous = fieldsById.get(ids[index]);
    const current = fieldsById.get(id);
    assert.ok(current.startWU > previous.endWU, `${id} must follow the previous title without overlap`);
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
      ['text-background-editorial', 'scroll-block'],
      ['text-background-clients', 'scroll-block'],
      ['text-complexity-curiosity', 'title'],
      ['text-complexity-listen', 'title'],
      ['text-disciplines-title', 'scroll-block'],
      ['text-life-momentum', 'title'],
      ['text-life-form', 'title'],
      ['text-life-character', 'title'],
      ['text-epilogue-invitation', 'title'],
    ],
  );

  const passages = [
    ['reading', 'text-background-editorial', 2],
    ['disciplines', 'text-disciplines-title', 3],
  ];
  passages.forEach(([layout, id, lineCount]) => {
    const field = fields.find((candidate) => candidate.id === id);
    assert.equal(field.presentation?.layout, layout);
    assert.equal(field.kind, 'scroll-block');
    assert.equal(field.block.kind, 'prose');
    assert.equal(field.block.text.split('\n').length, lineCount);
    const searchableCopy = field.block.text;
    field.block.emphasis.forEach((item) => {
      assert.ok(searchableCopy.includes(item.text));
    });
  });
  assert.equal(fields.filter((field) => field.block?.id?.endsWith('-passage')).length, 2);
  const backgroundEditorial = fields.find((field) => field.id === 'text-background-editorial');
  const backgroundClients = fields.find((field) => field.id === 'text-background-clients');
  assert.equal(Number((backgroundEditorial.endWU - backgroundClients.startWU).toFixed(2)), -0.4);
  const boundaryTitleIds = new Set(['text-promise-main', 'text-epilogue-invitation']);
  fields
    .filter((field) => field.kind === 'title' && !boundaryTitleIds.has(field.id))
    .forEach((field) => assert.equal(field.presentation?.layout, 'center'));
  assert.deepEqual(canonical.profiles.mobile.overrides.text, {});
  assert.doesNotMatch(liveSources.experience, /data-emphasis-tone/);
  assert.match(liveSources.experience, /about-narrative-editorial-list/);
  assert.match(liveSources.experience, /about-narrative-discipline-list/);
  assert.match(liveSources.experience, /<EditorialText text=\{item\} emphasis=\{block\.emphasis\} \/>/);
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
  assert.match(liveSources.styles, /about-narrative-spatial-title \{[\s\S]*?padding-block: 0\.2em;[\s\S]*?margin: -0\.2em auto -0\.1em;[\s\S]*?overflow: visible;/);
});

test('all published narrative writing comes from the current V24 script', () => {
  const normalize = (value) => String(value || '')
    .toLocaleLowerCase('en-GB')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
  const normalizedScript = normalize(currentScriptSource);
  const authoredCopy = canonical.tracks.text.fields.flatMap((field) => {
    if (field.block?.kind === 'clients') return [];
    return [
      field.text,
      ...(field.block?.text?.split('\n') || []),
      field.block?.label,
      ...(field.block?.items || []),
    ];
  }).filter(Boolean);
  authoredCopy.forEach((copy) => {
    assert.ok(normalizedScript.includes(normalize(copy)), `V24 is missing live copy: ${copy}`);
  });
  const reveal = canonical.tracks.interactions.clips.find((clip) => clip.type === 'discipline-reveal');
  reveal.parameters.items.forEach((item) => {
    assert.ok(normalizedScript.includes(normalize(item.label)), `V24 is missing ${item.label}`);
  });
  assert.doesNotMatch(canonicalSource, /Together, they become a way to make the idea tangible/);
  assert.doesNotMatch(canonicalSource, /That is when the experience starts to feel real/);
});

test('the final title and actions occupy centered clean space after the emergent pass', () => {
  const finale = canonical.tracks.text.fields.find((field) => field.preset === 'finale-v1');
  const emergent = canonical.tracks.worlds.objects.find((world) => world.shapeId === 'emergent-form-v1');
  const visibility = new Map(canonical.tracks.visibility.keys.map((key) => [key.id, key]));
  const keys = new Map(canonical.tracks.camera.keys.map((key) => [key.id, key]));
  const through = keys.get('emergent-through');
  const finalHold = keys.get('finale-hold');
  assert.equal(finale.endWU, canonical.profiles.desktop.storyDurationWU);
  assert.equal(finale.startWU, 15.2);
  assert.equal(finale.presentation.layout, 'text-finale-cta');
  assert.ok(finale.focusWU > through.atWU);
  assert.equal(emergent.protected, true);
  assert.equal(canonical.tracks.worlds.objects.some((world) => world.shapeId === 'bust-v1'), false);
  assert.equal(visibility.get('visibility-open-space').atWU, finale.startWU);
  assert.equal(visibility.get('visibility-open-space').visibility, 0);
  assert.equal(visibility.get('visibility-end').visibility, 0);
  assert.deepEqual(finalHold.position, through.position);
  assert.match(liveSources.experience, /about-narrative-finale-content/);
  assert.match(liveSources.styles, /\.about-narrative-finale-content/);
  assert.match(liveSources.styles, /about-narrative-finale-content \{[\s\S]*?transform: none;/);
  assert.match(liveSources.styles, /\.about-narrative-finale-cta \{[\s\S]*position: relative/);
  assert.match(liveSources.styles, /max-height: 600px/);
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

test('editor exposes five independent lanes and all Text creation kinds', () => {
  const trackDeclaration = liveSources.editor.slice(
    liveSources.editor.indexOf('const TRACKS'),
    liveSources.editor.indexOf('const TRACK_BY_ID'),
  );
  assert.deepEqual(
    [...trackDeclaration.matchAll(/id: '([^']+)'/g)].map((match) => match[1]),
    ['camera', 'visibility', 'world', 'text', 'interaction'],
  );
  assert.doesNotMatch(liveSources.editor, /sectionId|sectionRefs|data-narrative-section|['"]section['"]\s*,\s*label/i);
  assert.match(liveSources.editor, /createAtPlayhead\('text', 'title'\)/);
  assert.match(liveSources.editor, /createAtPlayhead\('text', 'scroll-block'\)/);
  assert.match(liveSources.editor, /createAtPlayhead\('text', 'stub'\)/);
  assert.match(liveSources.editor, /Draft · Not published/);
  assert.match(liveSources.editor, /Reduced Motion/);
});
