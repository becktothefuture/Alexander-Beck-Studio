import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  compileAboutNarrativeComposerPlan,
  createAboutNarrativeComposerFrameSample,
  createAboutNarrativeComposerTitleSample,
  getAboutNarrativeComposerCameraSample,
  sampleAboutNarrativeComposerPlanInto,
  sampleAboutNarrativeComposerTitleInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js';
import { analyseAboutNarrativeComposerPlan } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDirectorAnalysis.js';
import {
  loadAboutNarrativePointFieldPersistenceSource,
  serializeAboutNarrativePointFieldSource,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
  validateAboutNarrativePointFieldDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';
import {
  refreshAboutNarrativeMomentTriggers,
  setAboutNarrativeMomentTrigger,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeMoments.js';
import {
  getAboutNarrativeFormOwnershipRangeAt,
  getAboutNarrativeFormSequence,
  isAboutNarrativeEffectInsideFormRange,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeFormSequence.js';
import {
  moveAboutNarrativeTrackObjectsByWU,
  normalizeAboutNarrativeTrackSelection,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackEditing.js';
import {
  moveAboutNarrativePointFieldKey,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldEditing.js';
import {
  createAboutNarrativePointFieldEditorStore,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldEditorStore.js';
import {
  advanceAboutNarrativeFinaleOrbitWU,
  getAboutNarrativeFinaleOrbitCycleWU,
  getAboutNarrativeFinaleOverflowPixels,
  getAboutNarrativeFinaleScrollDeltaWU,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeFinaleOrbit.js';

const ROOT = new URL('../', import.meta.url);
const canonical = JSON.parse(await readFile(new URL('react-app/app/public/config/contents-about.json', ROOT), 'utf8'));
const EPSILON = 0.000001;
const distance3 = (left, right) => Math.hypot(
  right[0] - left[0], right[1] - left[1], right[2] - left[2],
);

function compile(layoutProfile = 'desktop', motionProfile = 'full') {
  const plan = compileAboutNarrativeComposerPlan(canonical, {
    previewLayoutProfile: layoutProfile,
    previewMotionProfile: motionProfile,
    inlineSize: layoutProfile === 'mobile' ? 390 : layoutProfile === 'tablet' ? 1024 : 1440,
    blockSize: layoutProfile === 'mobile' ? 844 : 1000,
  });
  assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics, null, 2));
  return plan;
}

test('schema v7 is canonical, strict, and roundtrips through the one persistence boundary', () => {
  assert.equal(canonical.schemaVersion, ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION);
  assert.deepEqual(validateAboutNarrativePointFieldDocument(canonical), []);
  const wrongPageLength = structuredClone(canonical);
  wrongPageLength.profiles.desktop.storyDurationWU -= 0.5;
  assert(
    validateAboutNarrativePointFieldDocument(wrongPageLength)
      .some((diagnostic) => diagnostic.code === 'text-story-duration'),
    'Schema v7 must reject page length that diverges from the Text spine.',
  );
  const serialized = serializeAboutNarrativePointFieldSource(canonical);
  const loaded = loadAboutNarrativePointFieldPersistenceSource(serialized);
  assert.equal(loaded.valid, true);
  assert.deepEqual(loaded.document, canonical);
});

test('every animation time belongs to a Text moment and cannot drift loose', () => {
  const drifted = structuredClone(canonical);
  drifted.tracks.camera.moveKeys[1].atWU += 0.1;
  assert(validateAboutNarrativePointFieldDocument(drifted).some((diagnostic) => (
    diagnostic.code === 'moment-trigger-drift'
  )));

  const rebound = structuredClone(canonical);
  const selection = { type: 'camera-key', id: rebound.tracks.camera.moveKeys[1].id };
  assert.equal(setAboutNarrativeMomentTrigger(rebound, selection, {
    momentId: 'text-complexity-listen',
    phase: 'enter',
    offsetWU: 0.2,
  }), true);
  assert.deepEqual(validateAboutNarrativePointFieldDocument(rebound), []);
  assert.equal(rebound.tracks.camera.moveKeys[1].atWU, 8.25);
});

test('Text timing is fixed while moving animation rebinds to its nearest Text moment', () => {
  const sourceCamera = canonical.tracks.camera.moveKeys.find((key) => key.id === 'move-grid-flight-approach');
  const movedText = moveAboutNarrativeTrackObjectsByWU({
    model: canonical,
    selection: { type: 'text-field', id: 'text-life-character' },
    deltaWU: 0.1,
    snap: false,
  });
  assert.equal(movedText.valid, false);
  assert.equal(movedText.code, 'text-spine-fixed');

  const movedCamera = moveAboutNarrativeTrackObjectsByWU({
    model: canonical,
    selection: { type: 'camera-key', id: sourceCamera.id },
    deltaWU: 0.13,
    snap: false,
  });
  assert.equal(movedCamera.valid, true, JSON.stringify(movedCamera.diagnostics, null, 2));
  const reboundCamera = movedCamera.model.tracks.camera.moveKeys.find((key) => key.id === sourceCamera.id);
  assert.equal(reboundCamera.atWU, Number((sourceCamera.atWU + 0.13).toFixed(6)));
  assert.notDeepEqual(reboundCamera.trigger, sourceCamera.trigger);
});

test('moving a Form boundary carries its Effect sequence without changing the Text spine', () => {
  const beforeText = JSON.stringify(canonical.tracks.text);
  const result = moveAboutNarrativePointFieldKey(canonical, {
    keyId: 'key-world-complexity-departure',
    atWU: 0.9,
  });
  assert.equal(result.valid, true, JSON.stringify(result.diagnostics, null, 2));
  assert.equal(JSON.stringify(result.document.tracks.text), beforeText);
  assert.deepEqual(
    result.document.tracks.interactions.clips.slice(0, 2).map((clip) => [
      clip.id,
      clip.startWU,
      clip.endWU,
    ]),
    [
      ['effect-world-promise-swarm-life', 0, 0.9],
      ['effect-world-complexity-swarm-life', 0.9, 8.4],
    ],
  );
  assert.deepEqual(validateAboutNarrativePointFieldDocument(result.document), []);
});

test('Camera Move, Look, and Lens have non-overlapping ownership', () => {
  const { camera } = canonical.tracks;
  assert(camera.moveKeys.every((key) => key.position && !('rotation' in key) && !('fov' in key) && !('lookAtTarget' in key)));
  assert(camera.lookKeys.every((key) => key.rotation && !('position' in key) && !('fov' in key) && !('lookAtTarget' in key)));
  assert(camera.lensKeys.every((key) => Number.isFinite(key.fov) && !('position' in key) && !('rotation' in key)));
});

test('the pre-orbit camera is a centre-line dolly with a long atmospheric floor gather', () => {
  const { camera, pointField } = canonical.tracks;
  const preOrbitMoveKeys = camera.moveKeys.filter((key) => key.atWU <= camera.orbit.startWU);
  assert(preOrbitMoveKeys.every((key) => key.position[0] === 0));
  assert(camera.lookKeys.every((key) => key.rotation[1] === 0 && key.rotation[2] === 0));

  const steadyDollyKeys = camera.moveKeys.filter((key) => key.atWU >= 0.8 && key.atWU <= 16.1);
  for (let index = 1; index < steadyDollyKeys.length; index += 1) {
    const from = steadyDollyKeys[index - 1];
    const to = steadyDollyKeys[index];
    const depthVelocity = (to.position[2] - from.position[2]) / (to.atWU - from.atWU);
    assert(Math.abs(depthVelocity + 1.5) < EPSILON, `${from.id} to ${to.id}`);
  }

  const gridDeparture = pointField.keys.find((key) => key.id === 'key-world-grid-departure');
  const gridArrival = pointField.keys.find((key) => key.id === 'key-world-grid-arrival');
  const gridMorph = pointField.segments.find((segment) => (
    segment.fromKeyId === gridDeparture.id && segment.toKeyId === gridArrival.id
  ));
  assert.equal(gridDeparture.atWU, 8.4);
  assert.equal(gridArrival.atWU, 12.4);
  assert.equal(gridMorph.transition.easing, 'ease-in-out');
  assert.equal(gridMorph.transition.stagger.mode, 'axis');
  assert.equal(gridMorph.transition.stagger.amount, 0.07);
  assert.equal(gridMorph.transition.path.mode, 'flow');
  assert.equal(gridMorph.transition.path.amount, 0.16);
  assert.equal(gridMorph.transition.flatten.mode, 'toward-plane');
  assert(gridMorph.transition.flatten.amount <= 0.13);
  const turbulentEffect = canonical.tracks.interactions.clips.find(
    (clip) => clip.id === 'effect-world-complexity-swarm-life',
  );
  assert.equal(turbulentEffect.parameters.releaseWU, gridArrival.atWU - gridDeparture.atWU);
  const ripple = canonical.tracks.interactions.clips.find(
    (clip) => clip.id === 'interaction-grid-ripple',
  );
  assert(ripple.activationWU - ripple.startWU >= 0.8);
  assert.equal(ripple.endWU - ripple.parameters.releaseWU, camera.orbit.startWU);
  assert.equal(canonical.globals.camera.distanceFogStartWU, 8);
  assert.equal(canonical.globals.camera.distanceFogEndWU, 24);
  assert.equal(camera.orbit.easing, 'ease-in-out');
});

test('the turbulent flight stays inside the centre of its authored corridor', () => {
  for (const profile of ['desktop', 'tablet', 'mobile']) {
    const plan = compile(profile);
    const world = plan.worlds.find((candidate) => candidate.stateId === 'world-complexity');
    const radius = Number(world.shapeParameters.corridorRadius);
    assert.equal(radius, 5.2);
    const worldOffsetZ = Number(world.anchorRailZ)
      - Number(world.entryDistanceWU)
      + Number(world.transform.position[2] || 0);
    for (let atWU = 0.8; atWU <= 8.4 + EPSILON; atWU += 0.05) {
      const camera = getAboutNarrativeComposerCameraSample(plan, Math.min(atWU, 8.4));
      const localZ = camera.position[2] - worldOffsetZ;
      const corridorY = Number(world.transform.position[1] || 0)
        - 0.45
        + (Math.cos((localZ * 0.1) - 0.4) * radius * 0.11);
      assert(Math.abs(camera.position[0]) < EPSILON, `${profile} lateral drift at ${atWU}`);
      assert(
        Math.abs(camera.position[1] - corridorY) <= radius * 0.12,
        `${profile} left corridor centre at ${atWU}: ${camera.position[1]} vs ${corridorY}`,
      );
    }
  }
});

test('Camera lanes may use one freely positioned key while retaining a defined pose', () => {
  const flexible = structuredClone(canonical);
  ['desktop', 'tablet', 'mobile'].forEach((profileId) => {
    flexible.profiles[profileId].overrides.camera = {};
  });
  delete flexible.tracks.camera.orbit;
  flexible.tracks.camera.moveKeys = [{ ...structuredClone(canonical.tracks.camera.moveKeys[0]), atWU: 9.25 }];
  flexible.tracks.camera.lookKeys = [{ ...structuredClone(canonical.tracks.camera.lookKeys[0]), atWU: 9.25 }];
  flexible.tracks.camera.lensKeys = [{ ...structuredClone(canonical.tracks.camera.lensKeys[0]), atWU: 9.25 }];
  [
    { type: 'camera-key', id: flexible.tracks.camera.moveKeys[0].id },
    { type: 'camera-orientation-key', id: flexible.tracks.camera.lookKeys[0].id },
    { type: 'camera-lens-key', id: flexible.tracks.camera.lensKeys[0].id },
  ].forEach((selection) => refreshAboutNarrativeMomentTriggers(flexible, selection));

  assert.deepEqual(validateAboutNarrativePointFieldDocument(flexible), []);
  const plan = compileAboutNarrativeComposerPlan(flexible, {
    previewLayoutProfile: 'desktop',
    previewMotionProfile: 'full',
    inlineSize: 1440,
    blockSize: 1000,
  });
  assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics, null, 2));
  const start = getAboutNarrativeComposerCameraSample(plan, 0);
  const end = getAboutNarrativeComposerCameraSample(plan, 20);
  assert.deepEqual(start.position, end.position);
  assert.deepEqual(start.quaternion, end.quaternion);
  assert.equal(start.fov, end.fov);
  const roundtrip = loadAboutNarrativePointFieldPersistenceSource(
    serializeAboutNarrativePointFieldSource(flexible),
  );
  assert.equal(roundtrip.valid, true);
  assert.deepEqual(roundtrip.document, flexible);

  flexible.tracks.camera.moveKeys = [];
  assert(validateAboutNarrativePointFieldDocument(flexible).some((item) => (
    item.code === 'camera-lane-count' && item.path === 'tracks.camera.moveKeys'
  )));
});

test('camera keeps moving fluidly for every frame in which the dots are visible', () => {
  for (const profile of ['desktop', 'tablet', 'mobile']) {
    const plan = compile(profile);
    let previous = getAboutNarrativeComposerCameraSample(plan, 5.69);
    for (let atWU = 5.715; atWU <= plan.durationWU + EPSILON; atWU += 0.025) {
      const next = getAboutNarrativeComposerCameraSample(plan, Math.min(atWU, plan.durationWU), {
        position: [0, 0, 0], quaternion: [0, 0, 0, 1], lookAtTarget: [0, 0, 0], lookAtRoll: 0, aimWeight: 0, targeted: false, fov: 0,
      });
      assert(distance3(previous.position, next.position) > 0.0001, `${profile} stopped at ${atWU.toFixed(3)} WU`);
      previous = structuredClone(next);
    }
    for (const key of plan.camera.moveKeys.filter((candidate) => (
      candidate.atWU > 5.69 && candidate.atWU <= Number(plan.camera.orbit?.startWU)
    ))) {
      const delta = 0.002;
      const before = getAboutNarrativeComposerCameraSample(plan, key.atWU - delta);
      const at = getAboutNarrativeComposerCameraSample(plan, key.atWU);
      const after = getAboutNarrativeComposerCameraSample(plan, key.atWU + delta);
      const incomingSpeed = distance3(before.position, at.position) / delta;
      const outgoingSpeed = distance3(at.position, after.position) / delta;
      if (key.atWU === plan.camera.orbit?.startWU && plan.camera.orbit.easing !== 'linear') {
        // Both lanes have a zero mathematical tangent at the handoff. Compare
        // their small sampled speeds to rest instead of dividing two values
        // that both converge to zero at different accelerations.
        assert(incomingSpeed < 0.02, `${profile} dolly did not settle: ${incomingSpeed}`);
        assert(outgoingSpeed < 0.02, `${profile} orbit did not ease in: ${outgoingSpeed}`);
      } else {
        const discontinuity = Math.abs(incomingSpeed - outgoingSpeed) / Math.max(incomingSpeed, outgoingSpeed, EPSILON);
        assert(discontinuity < 0.02, `${profile} velocity jump at ${key.id}: ${discontinuity}`);
      }
    }
  }
});

test('sampling immediately around every camera key has no positional or angular snap', () => {
  const plan = compile();
  const sample = (atWU) => structuredClone(getAboutNarrativeComposerCameraSample(plan, atWU));
  for (const key of [...plan.camera.moveKeys, ...plan.camera.lookKeys, ...plan.camera.lensKeys]) {
    if (key.atWU <= 0 || key.atWU >= plan.durationWU) continue;
    const before = sample(key.atWU - 0.00001);
    const after = sample(key.atWU + 0.00001);
    assert(distance3(before.position, after.position) < 0.005, key.id);
    const dot = Math.abs(before.quaternion.reduce((sum, value, index) => sum + (value * after.quaternion[index]), 0));
    assert(dot > 0.9999, key.id);
    assert(Math.abs(before.fov - after.fov) < 0.02, key.id);
  }
});

test('disciplines are one described editorial list with no projected reveal or grid dimming', async () => {
  const fields = canonical.tracks.text.fields.filter((field) => field.block?.kind === 'disciplines');
  assert.equal(fields.length, 1);
  assert.deepEqual(fields[0].block.items.map((item) => item.label), [
    'Product Design', 'Experience Design', 'Art Direction', 'Motion & 3D',
    'Creative Engineering', 'Parametric Systems',
  ]);
  assert(fields[0].block.items.every((item) => (
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(item.id)
    && item.description.length >= 60
  )));
  assert.equal(canonical.tracks.interactions.clips.some((clip) => clip.type === 'discipline-reveal'), false);
  const experience = await readFile(new URL('react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx', ROOT), 'utf8');
  const world = await readFile(new URL('react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx', ROOT), 'utf8');
  assert.doesNotMatch(experience, /DisciplineRevealField|disciplineOverlayRef/);
  assert.doesNotMatch(world, /disciplineReveal|disciplineIsolation|disciplineBackground|projectDiscipline/);
});

test('Text never changes the opacity or continuity of the point material', async () => {
  const desktopPlan = compile('desktop');
  const frame = createAboutNarrativeComposerFrameSample();

  sampleAboutNarrativeComposerPlanInto(desktopPlan, 1.8, frame);
  assert.equal('quietAperture' in frame.text, false);

  sampleAboutNarrativeComposerPlanInto(desktopPlan, 5.2, frame);
  assert.equal(frame.text.activeFieldIds.includes('text-background-unit'), true);

  sampleAboutNarrativeComposerPlanInto(desktopPlan, 9.7, frame);
  assert.equal(frame.text.activeFieldIds.includes('text-discipline-labels'), true);

  const composer = await readFile(new URL(
    'react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js',
    ROOT,
  ), 'utf8');
  const world = await readFile(new URL(
    'react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx',
    ROOT,
  ), 'utf8');
  assert.doesNotMatch(composer, /quietAperture|aperture/i);
  assert.doesNotMatch(world, /uQuietAperture|apertureMask|resolvedPointAlpha/);
});

test('titles stay solid while editorial lines use the shared opacity-only focus channel', async () => {
  const plan = compile('desktop');
  plan.textFields.filter((field) => field.kind === 'title').forEach((field) => {
    [0.02, 0.5, 0.98].forEach((progress) => {
      const sample = createAboutNarrativeComposerTitleSample();
      sampleAboutNarrativeComposerTitleInto(
        field,
        Number(field.startWU) + ((Number(field.endWU) - Number(field.startWU)) * progress),
        plan.globals.textMotion,
        false,
        sample,
      );
      assert.equal(sample.opacity, 1, `${field.id} opacity at ${progress}`);
      assert.equal(sample.blur, 0, `${field.id} blur at ${progress}`);
    });
  });
  const css = await readFile(new URL(
    'react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css',
    ROOT,
  ), 'utf8');
  const hook = await readFile(new URL(
    'react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js',
    ROOT,
  ), 'utf8');
  assert.match(css, /\[data-editorial-reveal\] \{[\s\S]*?opacity: var\(--editorial-focus-opacity/);
  assert.doesNotMatch(css, /--about-title-shadow|text-shadow: var\(--about-title-shadow/);
  assert.match(hook, /--editorial-focus-opacity/);
  assert.match(hook, /--editorial-emphasis-opacity/);
});

test('effects and text are story-sampled and forms contain no narrative modifiers', async () => {
  assert(canonical.tracks.pointField.stateDefinitions.every((state) => state.modifiers.length === 0));
  const effects = canonical.tracks.interactions.clips.filter((clip) => clip.type === 'state-effect');
  assert.deepEqual(effects.map((clip) => clip.parameters.effectId), [
    'swarm-life-v1',
    'swarm-life-v1',
    'ambient-drift-v1',
    'bust-assembly-v1',
  ]);
  assert.equal(effects.some((clip) => clip.parameters.effectId === 'bust-yaw-v1'), false);
  assert(effects.every((clip) => !('timeMode' in clip.parameters)));
  const hook = await readFile(new URL('react-app/app/src/routes/about-narrative-lab/useAboutNarrativeTimeline.js', ROOT), 'utf8');
  assert(!hook.includes('sampleAboutNarrativeRuntimePlanInto'));
  assert(!hook.includes('sampleAboutNarrativeTitleFieldInto'));
  const css = await readFile(new URL('react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css', ROOT), 'utf8');
  assert(!/\[data-editorial-reveal\][\s\S]{0,180}transition\s*:/.test(css));
  const composer = await readFile(new URL('react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js', ROOT), 'utf8');
  const world = await readFile(new URL('react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx', ROOT), 'utf8');
  assert.doesNotMatch(composer, /PointFieldRendererBridge|compileAboutNarrativeRuntimePlan|sampleAboutNarrativeRuntimePlanInto/);
  assert.doesNotMatch(world, /getModifierSlots|beatDurationWU|itemsPerBeat|activeIndex|showCameraFocusAnchor/);
  assert.match(world, /frame\.interactions\.effectProgress/);
  assert.doesNotMatch(world, /revealState\?\.weights|disciplineReveal/);
});

test('every Form keeps its authored point size with bounded travel perspective', async () => {
  assert.equal(canonical.globals.pointMaterial.pointSize, 9.25);
  const pointSizeScales = canonical.tracks.pointField.stateDefinitions
    .map((state) => state.transform.pointSizeScale);
  assert.deepEqual(pointSizeScales, [1, 1, 1, 1]);

  const world = await readFile(new URL(
    'react-app/app/src/routes/about-narrative-lab/AboutNarrativePointWorld3D.jsx',
    ROOT,
  ), 'utf8');
  assert.match(world, /float rawPerspectiveScale = 5\.5 \/ max\(1\.0, -viewPoint\.z\)/);
  assert.match(
    world,
    /float perspectiveScale = clamp\(mix\(1\.0, rawPerspectiveScale, 0\.42\), 0\.72, 1\.5\)/,
  );
  assert.match(
    world,
    /float clampedPointSize = clamp\(cssPointSize, mix\(6\.5, 3\.8, longAssemblyWeight\), 21\.6\)/,
  );
  assert.doesNotMatch(world, /perspectiveScale = clamp\([^\n]+, 0\.68, 2\.2\)/);
});

test('Effects remain inside the one Form interval owned at their activation moment', () => {
  const durationWU = canonical.profiles.desktop.storyDurationWU;
  const sequence = getAboutNarrativeFormSequence(canonical.tracks.pointField, durationWU);
  assert.deepEqual(sequence.map((range) => [range.stateId, range.startWU, range.endWU]), [
    ['world-promise', 0, 0.8],
    ['world-complexity', 0.8, 8.4],
    ['world-grid', 8.4, 19.2],
    ['world-emergent', 19.2, 22],
  ]);

  const clips = canonical.tracks.interactions.clips;
  clips.forEach((clip) => {
    const range = getAboutNarrativeFormOwnershipRangeAt(
      canonical.tracks.pointField,
      durationWU,
      clip.targetStateId,
      clip.activationWU,
    );
    assert.equal(isAboutNarrativeEffectInsideFormRange(clip, range), true, clip.id);
  });
  for (let leftIndex = 0; leftIndex < clips.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < clips.length; rightIndex += 1) {
      const left = clips[leftIndex];
      const right = clips[rightIndex];
      assert(
        Number(left.endWU) <= Number(right.startWU)
          || Number(right.endWU) <= Number(left.startWU),
        `${left.id} overlaps ${right.id}`,
      );
    }
  }

  const bleeding = structuredClone(canonical);
  bleeding.tracks.interactions.clips
    .find((clip) => clip.id === 'effect-world-complexity-swarm-life').endWU = 8.5;
  assert(validateAboutNarrativePointFieldDocument(bleeding).some((diagnostic) => (
    diagnostic.code === 'effect-form-sequence'
  )));

  const rippleClips = clips.filter((clip) => clip.type === 'grid-ripple');
  assert.equal(rippleClips.length, 1);
  assert.deepEqual(
    rippleClips.map((clip) => [clip.startWU, clip.activationWU, clip.endWU, clip.parameters.releaseWU]),
    [[14, 14.9, 19.2, 2]],
  );
});

test('Composer exposes Effects only for the destination Form that owns the frame', () => {
  const plan = compile();
  const frame = createAboutNarrativeComposerFrameSample();
  [0.4, 1.2, 8.6, 16, 17.3, 21.8].forEach((storyWU) => {
    sampleAboutNarrativeComposerPlanInto(plan, storyWU, frame);
    const owner = frame.world.to.stateId;
    assert(frame.composerEffects.active.every((clip) => clip.targetStateId === owner), storyWU);
    if (frame.interactions.activeInteraction) {
      assert.equal(frame.interactions.activeInteraction.targetStateId, owner, storyWU);
    }
  });
});

test('ripple release, orbit acceleration, and bust formation share one continuous handoff', () => {
  const plan = compile();
  const frame = createAboutNarrativeComposerFrameSample();
  const ripple = plan.pointFieldPlan.interactions.find(
    (clip) => clip.id === 'interaction-grid-ripple',
  );
  const bust = plan.pointFieldPlan.interactions.find(
    (clip) => clip.id === 'effect-world-emergent-bust-assembly',
  );
  const finale = plan.textFields.find(
    (field) => field.id === 'text-epilogue-invitation',
  );
  const finaleGap = plan.storyLayout.gaps.find(
    (gap) => gap.id === 'gap-text-life-character-to-text-epilogue-invitation',
  );
  const orbit = plan.camera.orbit;

  assert(Math.abs((ripple.endWU - ripple.parameters.releaseWU) - orbit.startWU) < EPSILON);
  assert(Math.abs(ripple.endWU - bust.startWU) < EPSILON);
  assert(
    Math.abs(
      bust.startWU
      - Number((finaleGap.startWU + (finaleGap.durationWU * 0.72)).toFixed(6))
    ) < EPSILON,
  );

  sampleAboutNarrativeComposerPlanInto(plan, ripple.startWU, frame);
  assert.equal(frame.interactions.effectWeight, 0);
  sampleAboutNarrativeComposerPlanInto(
    plan,
    (ripple.startWU + ripple.activationWU) / 2,
    frame,
  );
  assert(frame.interactions.effectWeight > 0 && frame.interactions.effectWeight < 1);
  sampleAboutNarrativeComposerPlanInto(plan, ripple.activationWU, frame);
  assert.equal(frame.interactions.effectWeight, 1);
  sampleAboutNarrativeComposerPlanInto(plan, orbit.startWU, frame);
  assert.equal(frame.interactions.effectWeight, 1);
  sampleAboutNarrativeComposerPlanInto(plan, (orbit.startWU + ripple.endWU) / 2, frame);
  assert(Math.abs(frame.interactions.effectWeight - 0.5) < 0.001);

  const orbitStart = getAboutNarrativeComposerCameraSample(plan, orbit.startWU);
  const orbitImmediate = getAboutNarrativeComposerCameraSample(plan, orbit.startWU + 0.01);
  const orbitEarly = getAboutNarrativeComposerCameraSample(plan, orbit.startWU + 0.05);
  assert(distance3(orbitStart.position, orbitImmediate.position) < 0.001);
  assert(distance3(orbitStart.position, orbitEarly.position) < 0.02);

  sampleAboutNarrativeComposerPlanInto(plan, finale.focusWU, frame);
  const bustIndex = frame.composerEffects.active.findIndex(
    (clip) => clip.id === bust.id,
  );
  assert(bustIndex >= 0);
  assert(frame.world.visualProgress > 0.7);
  assert(frame.composerEffects.weight[bustIndex] > 0.7);
});

test('reduced motion is deterministic and Composer owns every sampled output', () => {
  const plan = compile('mobile', 'reduced');
  const left = sampleAboutNarrativeComposerPlanInto(plan, 9.5, createAboutNarrativeComposerFrameSample());
  const right = sampleAboutNarrativeComposerPlanInto(plan, 9.5, createAboutNarrativeComposerFrameSample());
  assert.deepEqual(left.camera, right.camera);
  assert.deepEqual(left.world, right.world);
  assert.equal('disciplineReveal' in left, false);
  assert.deepEqual(left.composerEffects.active.map((clip) => clip.id), right.composerEffects.active.map((clip) => clip.id));
});

test('the expanded story keeps editorial rhythm on one continuous timeline', () => {
  for (const profile of ['desktop', 'tablet', 'mobile']) {
    const plan = compile(profile);
    assert.equal(plan.durationWU, plan.storyLayout.durationWU);
    assert.equal(plan.storyLayout.mode, 'content-flow');
    assert.equal(plan.resolver.contentExtentWU, plan.durationWU + 1);
    const analysis = analyseAboutNarrativeComposerPlan(plan, { stepWU: 0.01 });
    assert.deepEqual(analysis.gaps, [], `${profile}: ${JSON.stringify(analysis.gaps)}`);
  }
  assert(canonical.tracks.text.fields.every((field) => field.flow));
  const desktop = compile('desktop');
  const finaleGap = desktop.storyLayout.gaps.at(-1);
  // The finale choreography now fits inside an ordinary chapter breath; it
  // must not extend the page merely to give the motion more runway.
  assert.equal(finaleGap.preset, 'chapter');
  assert(finaleGap.durationWU <= 0.58);
});

test('the colored point world remains fully visible from the condensed ball through the finale', () => {
  const plan = compile();
  const frame = createAboutNarrativeComposerFrameSample();
  for (let atWU = 0; atWU <= plan.durationWU + EPSILON; atWU += 0.02) {
    sampleAboutNarrativeComposerPlanInto(plan, atWU, frame);
    assert(Number(frame.simulation.visibility) > 0.99, `grid hidden at ${atWU.toFixed(2)} WU`);
  }
});

test('the finale is one constant-radius orbit that always looks at the bust anchor', () => {
  for (const profile of ['desktop', 'tablet', 'mobile']) {
    const plan = compile(profile);
    const orbit = plan.camera.orbit;
    assert(orbit);
    const radius = Math.hypot(
      orbit.startPosition[0] - orbit.target[0],
      orbit.startPosition[2] - orbit.target[2],
    );
    for (let atWU = orbit.startWU; atWU <= orbit.endWU + EPSILON; atWU += 0.05) {
      const sample = getAboutNarrativeComposerCameraSample(plan, Math.min(atWU, orbit.endWU));
      assert.equal(sample.targeted, true);
      assert(distance3(sample.lookAtTarget, orbit.target) < EPSILON);
      const sampleRadius = Math.hypot(
        sample.position[0] - orbit.target[0],
        sample.position[2] - orbit.target[2],
      );
      assert(Math.abs(sampleRadius - radius) < 0.0001, `${profile} orbit radius drift`);
    }
    const end = getAboutNarrativeComposerCameraSample(plan, orbit.endWU);
    const startOffsetX = orbit.startPosition[0] - orbit.target[0];
    const startOffsetZ = orbit.startPosition[2] - orbit.target[2];
    assert.equal(canonical.tracks.camera.orbit.arcDegrees, 360);
    assert(Math.abs((end.position[0] - orbit.target[0]) - startOffsetX) < 0.0001, `${profile} final X`);
    assert(Math.abs((end.position[2] - orbit.target[2]) - startOffsetZ) < 0.0001, `${profile} final Z`);
  }
});

test('continued end-scroll advances the finale orbit indefinitely without growing its phase', () => {
  const plan = compile();
  const orbit = plan.camera.orbit;
  const orbitDurationWU = orbit.endWU - orbit.startWU;
  const cycleWU = getAboutNarrativeFinaleOrbitCycleWU(orbit);
  assert.equal(cycleWU, orbitDurationWU);
  assert.equal(getAboutNarrativeFinaleScrollDeltaWU({
    deltaY: 1,
    deltaMode: 2,
    viewportHeight: 1000,
    storyPerScrollWU: 1,
  }), 1);
  assert.equal(getAboutNarrativeFinaleOverflowPixels({
    deltaY: 250,
    viewportHeight: 1_000,
    scrollTop: 800,
    targetScrollTop: 900,
    maximumScrollTop: 1_000,
  }), 150);
  assert.equal(getAboutNarrativeFinaleOverflowPixels({
    deltaY: 250,
    viewportHeight: 1_000,
    scrollTop: 800,
    targetScrollTop: 1_000,
    maximumScrollTop: 1_000,
  }), 250);
  assert.equal(getAboutNarrativeFinaleOverflowPixels({
    deltaY: 250,
    viewportHeight: 1_000,
    scrollTop: 980,
    targetScrollTop: 800,
    maximumScrollTop: 1_000,
  }), 50);
  assert.equal(getAboutNarrativeFinaleOverflowPixels({
    deltaY: -250,
    viewportHeight: 1_000,
    scrollTop: 1_000,
    targetScrollTop: 1_000,
    maximumScrollTop: 1_000,
  }), 0);

  let phaseWU = 0;
  for (let turn = 0; turn < 10_000; turn += 1) {
    phaseWU = advanceAboutNarrativeFinaleOrbitWU(phaseWU, orbitDurationWU + 0.001, orbit);
  }
  assert(Math.abs(phaseWU) <= cycleWU / 2);

  const final = getAboutNarrativeComposerCameraSample(plan, orbit.endWU);
  const quarterTurn = getAboutNarrativeComposerCameraSample(
    plan,
    orbit.endWU,
    null,
    { finaleOrbitWU: orbitDurationWU / 4 },
  );
  const completeExtraTurn = getAboutNarrativeComposerCameraSample(
    plan,
    orbit.endWU,
    null,
    { finaleOrbitWU: orbitDurationWU },
  );
  assert(distance3(final.position, quarterTurn.position) > 1);
  assert(distance3(final.position, completeExtraTurn.position) < 0.0001);
  assert(distance3(quarterTurn.lookAtTarget, orbit.target) < EPSILON);

  const reducedPlan = compile('desktop', 'reduced');
  const reducedFinal = getAboutNarrativeComposerCameraSample(reducedPlan, orbit.endWU);
  const reducedExtra = getAboutNarrativeComposerCameraSample(
    reducedPlan,
    orbit.endWU,
    null,
    { finaleOrbitWU: orbitDurationWU / 4 },
  );
  assert(distance3(reducedFinal.position, reducedExtra.position) < EPSILON);
});

test('Director 4 defaults to the story-level projection and retains precision aids in Advanced', async () => {
  const editor = await readFile(new URL('react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx', ROOT), 'utf8');
  const editorCss = await readFile(new URL('react-app/app/src/routes/about-narrative-lab/about-narrative-editor.css', ROOT), 'utf8');
  assert(editor.includes("useState('expanded')"));
  assert(editor.includes("const [detailMode, setDetailMode] = useState('director')"));
  assert(editor.includes('const [showAllTracks, setShowAllTracks] = useState(false)'));
  assert(editor.includes('collectTimelineSnapTargets'));
  assert(editor.includes('resolveMagneticTimelineSnap'));
  assert(editor.includes('precisionWindow={2}'));
  assert(editor.includes('About Director <sup>4.0</sup>'));
  const directorTracks = editor.slice(editor.indexOf('const DIRECTOR_TRACKS'), editor.indexOf('const ADVANCED_POINT_FIELD_TRACKS'));
  const pointFieldTracks = editor.slice(editor.indexOf('const ADVANCED_POINT_FIELD_TRACKS'), editor.indexOf('const TRACK_BY_ID'));
  assert.doesNotMatch(directorTracks, /id: 'text'/);
  assert.match(directorTracks, /label: 'Camera journey'/);
  assert.match(directorTracks, /label: 'World sequence'/);
  assert.match(editor, />Story Stack<small>Copy sets length<\/small>/);
  assert.match(pointFieldTracks, /id: 'text'.*label: 'Text spine'.*master: true/s);
  assert.doesNotMatch(pointFieldTracks, /id: 'material'/);
  assert.match(editor, />Point style<\/button>/);
  assert.match(editor, /function FormTransitionPanel/);
  const directorStageInspector = editor.slice(
    editor.indexOf('function DirectorWorldStageInspector'),
    editor.indexOf('function DirectorAnchorBindingFields'),
  );
  assert.match(directorStageInspector, /<FormTransitionPanel/);
  assert.match(editor, /Flow · recommended/);
  assert.match(editor, /opacity never does/);
  assert.doesNotMatch(pointFieldTracks, /id: 'visibility'/);
  assert.deepEqual(
    normalizeAboutNarrativeTrackSelection({ type: 'track', id: 'material' }, canonical),
    { type: 'track', id: 'material' },
  );
  assert.match(editor, /\['camera', 'camera-orientation', 'camera-lens', 'visibility', 'material', 'text', 'point-field', 'effects'\]/);
  assert.match(editor, /const visibleTracks = directorMode/);
  assert.match(editor, /getAboutNarrativeTextStoryDurationWU/);
  assert(editor.includes('aria-label={`Select ${track.group ? `${track.group} ` : \'\'}${track.label} lane`}'));
  assert.match(editorCss, /data-timeline-all-tracks='true'[\s\S]{0,120}342px/);
  assert.match(editorCss, /background-color:\s*rgb\(13 13 15 \/ 95%\)/);
  assert.match(editorCss, /\.about-track-editor-clip__point[\s\S]{0,420}clip-path:\s*polygon\(50% 0, 100% 50%, 50% 100%, 0 50%\)/);
  assert(editorCss.includes('.about-director-snap-guide'));
});

test('Director ruler adopts measured content flow without mutating authored text', () => {
  const store = createAboutNarrativePointFieldEditorStore(structuredClone(canonical));
  const beforeDocument = JSON.stringify(store.getSnapshot().document);
  const beforeDuration = store.getSnapshot().compiledPlan.durationWU;
  const measuredPlan = compileAboutNarrativeComposerPlan(canonical, {
    previewLayoutProfile: 'desktop',
    previewMotionProfile: 'full',
    storyLayoutMeasurements: {
      'text-epilogue-invitation': {
        contentHeightPx: 1_800,
        viewportHeightPx: 1_000,
      },
    },
  });
  assert.equal(measuredPlan.valid, true);
  assert(measuredPlan.durationWU > beforeDuration);
  let publications = 0;
  const unsubscribe = store.subscribe(() => { publications += 1; });
  assert.equal(store.setRuntimePlan(measuredPlan), true);
  assert.equal(store.getSnapshot().compiledPlan, measuredPlan);
  assert.equal(store.getSnapshot().lastValidPlan, measuredPlan);
  assert.equal(store.getSnapshot().dirty, false);
  assert.equal(JSON.stringify(store.getSnapshot().document), beforeDocument);
  assert.equal(store.setRuntimePlan(measuredPlan), false);
  assert.equal(publications, 1);
  unsubscribe();
});

test('Director 4 fixes Text timing and keeps bound animation freely adjustable', async () => {
  const editor = await readFile(new URL('react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx', ROOT), 'utf8');
  assert.match(editor, /const fixedTextSpine = Number\(document\.schemaVersion\) >= 7 && track\.type === 'text-field'/);
  assert.match(editor, /const timingMovable = !locked && !fixedTextSpine/);
  assert.match(editor, /if \(!timingMovable\) return;/);
  assert.match(editor, /data-timing-owner=\{fixedTextSpine \? 'text-spine' : undefined\}/);
  assert.match(editor, /Text moments set page rhythm · direct Camera and World around them/);
  assert.match(editor, /label="Fine offset"/);
  assert.doesNotMatch(editor, /label="Offset WU"/);
});
