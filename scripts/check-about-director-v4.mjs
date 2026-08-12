import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  compileAboutNarrativeComposerPlan,
  createAboutNarrativeComposerFrameSample,
  getAboutNarrativeComposerCameraSample,
  sampleAboutNarrativeComposerPlanInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js';
import { analyseAboutNarrativeComposerPlan } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDirectorAnalysis.js';
import { writeAboutNarrativeDisciplineViewfinderWeights } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDisciplineViewfinder.js';
import {
  loadAboutNarrativePointFieldPersistenceSource,
  serializeAboutNarrativePointFieldSource,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';
import {
  ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
  validateAboutNarrativePointFieldDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';

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
  const serialized = serializeAboutNarrativePointFieldSource(canonical);
  const loaded = loadAboutNarrativePointFieldPersistenceSource(serialized);
  assert.equal(loaded.valid, true);
  assert.deepEqual(loaded.document, canonical);
});

test('Camera Move, Look, and Lens have non-overlapping ownership', () => {
  const { camera } = canonical.tracks;
  assert(camera.moveKeys.every((key) => key.position && !('rotation' in key) && !('fov' in key) && !('lookAtTarget' in key)));
  assert(camera.lookKeys.every((key) => key.rotation && !('position' in key) && !('fov' in key) && !('lookAtTarget' in key)));
  assert(camera.lensKeys.every((key) => Number.isFinite(key.fov) && !('position' in key) && !('rotation' in key)));
});

test('Camera lanes may use one freely positioned key while retaining a defined pose', () => {
  const flexible = structuredClone(canonical);
  ['desktop', 'tablet', 'mobile'].forEach((profileId) => {
    flexible.profiles[profileId].overrides.camera = {};
  });
  flexible.tracks.camera.moveKeys = [{
    ...structuredClone(canonical.tracks.camera.moveKeys[4]),
    atWU: 9.25,
  }];
  flexible.tracks.camera.lookKeys = [{
    ...structuredClone(canonical.tracks.camera.lookKeys[6]),
    atWU: 9.25,
  }];
  flexible.tracks.camera.lensKeys = [{
    ...structuredClone(canonical.tracks.camera.lensKeys[4]),
    atWU: 9.25,
  }];

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

test('helicopter translation is exactly 0.8 WU/WU on every profile while Look pitches independently', () => {
  for (const profile of ['desktop', 'tablet', 'mobile']) {
    const plan = compile(profile);
    let previous = getAboutNarrativeComposerCameraSample(plan, 7.7);
    for (let atWU = 7.725; atWU <= 11.15 + EPSILON; atWU += 0.025) {
      const next = getAboutNarrativeComposerCameraSample(plan, Math.min(atWU, 11.15), {
        position: [0, 0, 0], quaternion: [0, 0, 0, 1], lookAtTarget: [0, 0, 0], lookAtRoll: 0, aimWeight: 0, targeted: false, fov: 0,
      });
      assert(Math.abs((distance3(previous.position, next.position) / 0.025) - 0.8) < 0.0001, profile);
      assert(Math.abs(next.position[1] - (profile === 'desktop' ? 3.14 : 4)) < EPSILON, profile);
      assert(next.position[2] >= previous.position[2] - EPSILON, profile);
      previous = structuredClone(next);
    }
    const beforePitch = getAboutNarrativeComposerCameraSample(plan, 8.35, structuredClone(previous));
    const afterPitch = getAboutNarrativeComposerCameraSample(plan, 9.15, structuredClone(previous));
    assert(Math.abs(beforePitch.quaternion[0]) < 0.03, profile);
    assert(Math.abs(Math.abs(afterPitch.quaternion[0]) - Math.SQRT1_2) < 0.001, profile);
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

test('discipline geometry owns responsive positions and reveal-band entry', () => {
  const reveal = canonical.tracks.interactions.clips.find((clip) => clip.type === 'discipline-reveal');
  assert.equal(reveal.parameters.items.length, 6);
  reveal.parameters.items.forEach((item) => {
    assert.equal(item.position.length, 2);
    assert.equal(item.tabletPosition.length, 2);
    assert.equal(item.mobilePosition.length, 2);
  });
  const weights = new Float32Array(2);
  writeAboutNarrativeDisciplineViewfinderWeights(weights, new Float32Array([900, 790]), 1000, {
    entryStartRatio: 0.88,
    entryCompleteRatio: 0.78,
  });
  assert.equal(weights[0], 0);
  assert(weights[1] > 0);

  for (const profile of ['desktop', 'tablet', 'mobile']) {
    const plan = compile(profile);
    const { disciplineCrossings } = analyseAboutNarrativeComposerPlan(plan, { stepWU: 0.01 });
    assert.equal(disciplineCrossings.length, 6);
    for (let pair = 0; pair < disciplineCrossings.length; pair += 2) {
      assert.equal(disciplineCrossings[pair].atWU, disciplineCrossings[pair + 1].atWU);
      if (pair > 0) {
        assert(disciplineCrossings[pair].atWU > disciplineCrossings[pair - 2].atWU);
      }
    }
    assert(disciplineCrossings[0].atWU >= reveal.startWU);
    assert(disciplineCrossings.at(-1).atWU < reveal.endWU);
    const frame = createAboutNarrativeComposerFrameSample();
    disciplineCrossings.forEach((crossing, index) => {
      sampleAboutNarrativeComposerPlanInto(plan, crossing.startWU - 0.0001, frame);
      assert(frame.disciplineReveal.weights[index] < 0.001, `${profile} group ${crossing.group} early`);
      sampleAboutNarrativeComposerPlanInto(plan, crossing.completeWU + 0.00001, frame);
      assert(frame.disciplineReveal.weights[index] > 0.999, `${profile} group ${crossing.group} complete`);
    });
    assert(disciplineCrossings.at(-1).completeWU < plan.disciplineReveal.restoreStartWU, profile);
    sampleAboutNarrativeComposerPlanInto(plan, reveal.endWU - 0.075, frame);
    const restoreWeight = 1 - frame.disciplineReveal.restoreProgress;
    frame.disciplineReveal.weights.forEach((weight, index) => {
      assert(weight * restoreWeight < 0.05, `${profile} group ${index + 1} must fade before Camera departure`);
    });
  }
});

test('effects and text are story-sampled and forms contain no narrative modifiers', async () => {
  assert(canonical.tracks.pointField.stateDefinitions.every((state) => state.modifiers.length === 0));
  const effects = canonical.tracks.interactions.clips.filter((clip) => clip.type === 'state-effect');
  assert(effects.length >= 6);
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
  assert.match(world, /revealState\?\.weights/);
});

test('reduced motion is deterministic and Composer owns every sampled output', () => {
  const plan = compile('mobile', 'reduced');
  const left = sampleAboutNarrativeComposerPlanInto(plan, 9.5, createAboutNarrativeComposerFrameSample());
  const right = sampleAboutNarrativeComposerPlanInto(plan, 9.5, createAboutNarrativeComposerFrameSample());
  assert.deepEqual(left.camera, right.camera);
  assert.deepEqual(left.world, right.world);
  assert.deepEqual(left.disciplineReveal.weights, right.disciplineReveal.weights);
  assert.deepEqual(left.composerEffects.active.map((clip) => clip.id), right.composerEffects.active.map((clip) => clip.id));
});

test('the retimed story ends at 20 WU and contains no dead-air interval over 0.15 WU', () => {
  for (const profile of ['desktop', 'tablet', 'mobile']) {
    const plan = compile(profile);
    assert.equal(plan.durationWU, 20);
    const analysis = analyseAboutNarrativeComposerPlan(plan, { stepWU: 0.01 });
    assert.deepEqual(analysis.gaps, [], `${profile}: ${JSON.stringify(analysis.gaps)}`);
  }
  assert.equal(canonical.profiles.mobile.scrollDurationWU, 20.62);
});

test('the point world stays hidden throughout the second editorial block and returns on its authored lane', () => {
  const plan = compile();
  const frame = createAboutNarrativeComposerFrameSample();
  for (let atWU = 11.2; atWU <= 14.14; atWU += 0.02) {
    sampleAboutNarrativeComposerPlanInto(plan, atWU, frame);
    assert(Number(frame.simulation.visibility) < 0.001, `grid visible at ${atWU.toFixed(2)} WU`);
  }
  sampleAboutNarrativeComposerPlanInto(plan, 14.3, frame);
  assert(Number(frame.simulation.visibility) > 0.99);
});

test('Director 4 defaults to a compact all-lanes overview with precision and magnetic authoring aids', async () => {
  const editor = await readFile(new URL('react-app/app/src/routes/about-narrative-lab/AboutNarrativeEditor.jsx', ROOT), 'utf8');
  const editorCss = await readFile(new URL('react-app/app/src/routes/about-narrative-lab/about-narrative-editor.css', ROOT), 'utf8');
  assert(editor.includes("useState('expanded')"));
  assert(editor.includes('const [showAllTracks, setShowAllTracks] = useState(true)'));
  assert(editor.includes('collectTimelineSnapTargets'));
  assert(editor.includes('resolveMagneticTimelineSnap'));
  assert(editor.includes('precisionWindow={2}'));
  assert(editor.includes('About Director <sup>4.0</sup>'));
  assert(editor.includes('aria-label={`Select ${track.group ? `${track.group} ` : \'\'}${track.label} lane`}'));
  assert.match(editorCss, /data-timeline-all-tracks='true'[\s\S]{0,120}342px/);
  assert.match(editorCss, /background-color:\s*rgb\(13 13 15 \/ 95%\)/);
  assert.match(editorCss, /\.about-track-editor-clip__point[\s\S]{0,420}clip-path:\s*polygon\(50% 0, 100% 50%, 50% 100%, 0 50%\)/);
  assert(editorCss.includes('.about-director-snap-guide'));
});
