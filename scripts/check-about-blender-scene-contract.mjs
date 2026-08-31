import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  resolveAboutBlenderSceneContract,
  validateAboutBlenderSceneBundle,
} from '../react-app/app/src/routes/about-narrative-lab/aboutBlenderSceneContract.js';
import { compileAboutNarrativeComposerPlan } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js';
import { ABOUT_NARRATIVE_JOURNEY_ROLES } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeJourneyMap.js';
import { loadAboutNarrativePointFieldPersistenceSource } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';

// Semantic metadata fixtures only, transcribed on 2026-08-30 from
// output/about-v2-stage-separated-candidate/{identity-recovery-r5-assets,
// camera-story-v31-assets}/{meta,camera-track}.json. Cue progress below is the
// exact exported value, including frame rounding and R5's post-0.8 retiming.
// Source hashes identify the metadata snapshots, not the synthetic two-sample
// cameras below. These tests require no ignored export or canonical promotion
// and do not certify geometry, the camera path, Blender source or visuals.
const RECOVERY_R5_CUES = [
  ['ABS_STAGE_00', 0], ['ABS_STAGE_01', 0.075021], ['ABS_STAGE_02', 0.18005],
  ['ABS_ROUND_BANK_START', 0.18005], ['ABS_ROUND_BANK_LEFT', 0.213948],
  ['ABS_ROUND_BANK_RIGHT', 0.248124], ['ABS_ROUND_BANK_END', 0.280078],
  ['ABS_ROUND_PORTALS_EXIT', 0.285079], ['ABS_STAGE_03', 0.310086],
  ['ABS_ROUND_PORTALS_CLEAR', 0.381495], ['ABS_PERSONAL_ORIGIN', 0.400111],
  ['ABS_TERRAIN_THESIS', 0.420117], ['ABS_CANYON_CLEAR', 0.480133],
  ['ABS_ROLL_GATE_START', 0.6399], ['ABS_STAGE_04', 0.6399],
  ['ABS_GATE_BANK_LEFT', 0.679911], ['ABS_GATE_BANK_RIGHT', 0.719922],
  ['ABS_GATE_BANK_SETTLE', 0.759933], ['ABS_ROLL_GATE_END', 0.799944],
  ['ABS_STAGE_05', 0.833009], ['ABS_GATE_PASSAGE_CLEAR', 0.864962],
  ['ABS_METHOD_RELEASE', 0.87691], ['ABS_LATTICE_APPROACH', 0.882467],
  ['ABS_SPLIT_LATTICE_ENTRY', 0.888024], ['ABS_FINALE_DECEL', 0.89636],
  ['ABS_CAMERA_LOCK', 0.909975], ['ABS_TERMINAL_FRAME', 1],
];
// Keep the rejected v31 export independent; never add recovery cues to it.
const V31_CUES = [
  ['ABS_STAGE_00', 0], ['ABS_STAGE_01', 0.075021], ['ABS_STAGE_02', 0.18005],
  ['ABS_ROUND_BANK_START', 0.18005], ['ABS_ROUND_BANK_LEFT', 0.213948],
  ['ABS_ROUND_BANK_RIGHT', 0.248124], ['ABS_ROUND_BANK_END', 0.280078],
  ['ABS_STAGE_03', 0.310086], ['ABS_ROLL_GATE_START', 0.6399], ['ABS_STAGE_04', 0.6399],
  ['ABS_GATE_BANK_LEFT', 0.679911], ['ABS_GATE_BANK_RIGHT', 0.719922],
  ['ABS_GATE_BANK_SETTLE', 0.759933], ['ABS_ROLL_GATE_END', 0.799944], ['ABS_STAGE_05', 0.833009],
  ['ABS_SPLIT_LATTICE_ENTRY', 0.833009], ['ABS_FINALE_DECEL', 0.85496],
  ['ABS_CAMERA_LOCK', 0.909975], ['ABS_TERMINAL_FRAME', 1],
];
const RECOVERY_R5_WINDOWS = [
  [0, 1.96, 0.18, 'opening', 0, 'inciting-question', 0.18],
  [1.6, 3.84, 0.18, 'inciting-question', -0.18, 'portal-entry', 0.18],
  [3.48, 4.94, 0.18, 'portal-entry', -0.18, 'portal-exit', 0.18],
  [4.58, 15.08, 0.18, 'portal-exit', -0.18, 'gate-entry', 0.18],
  [14.72, 16.18, 0.18, 'gate-entry', -0.18, 'gate-exit', 0.18],
  [15.82, 27.78, 0.18, 'gate-exit', -0.18, 'terminal-hold', 1],
];
const V31_WINDOWS = [
  [0, 1.22, 0.18, 'opening', 0, 'inciting-question', -0.18],
  [1.22, 3.16, 0.18, 'inciting-question', -0.18, 'personal-origin', -0.44],
  [3.34, 3.56, 0.08, 'personal-origin', -0.26, 'personal-origin', -0.04],
  [6.97, 8.95, 0.18, 'earned-thesis', -0.18, 'gate-entry', -2.45],
  [14.22, 14.72, 0.08, 'gate-entry', 2.9, 'gate-release', -1.5],
  [16.62, 17.06, 0.12, 'split-lattice-entry', -0.48, 'split-lattice-entry', -0.04],
];
const sourceHashes = {
  r5: '6591c0dbd69e291d60db9c073bd3b31ea30ccd11a71217a4b953055ac2452e8b',
  v31: '85df0a5b553b7d8728e14bdd040c2d57c233b564b923c7e5f6a9d85fb8917893',
};

function semanticFixture(version = 'r5') {
  return {
    meta: {
      schema: 'about-point-scene', version: 2,
      source: { sha256: sourceHashes[version] },
      models: (version === 'v31' ? V31_WINDOWS : RECOVERY_R5_WINDOWS).map((window, id) => ({
        id, key: `about.0${id}`,
        visibilityStartWU: window[0], visibilityEndWU: window[1], visibilityHandoffWU: window[2],
        visibilityStartCue: window[3], visibilityStartOffsetWU: window[4],
        visibilityEndCue: window[5], visibilityEndOffsetWU: window[6],
      })),
    },
    cameraTrack: {
      schema: 'about-camera-track', version: 5, source: 'SYNTHETIC_SEMANTIC_FIXTURE', sampleCount: 2,
      projection: { type: 'perspective', fovAxis: 'horizontal', horizontalFov: 65, portraitMaxVerticalFov: 115 },
      samples: [[0, 0, 0, 0, 0, 0, 1], [0, 0, -10, 0, 0, 0, 1]],
      journeyCues: (version === 'v31' ? V31_CUES : RECOVERY_R5_CUES)
        .map(([name, progress]) => ({ name, progress })),
    },
  };
}

const document = loadAboutNarrativePointFieldPersistenceSource(JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url), 'utf8',
))).document;
const storyMapFor = (inlineSize = 1440, blockSize = 900) => {
  const plan = compileAboutNarrativeComposerPlan(document, { inlineSize, blockSize });
  assert.equal(plan.valid, true, JSON.stringify(plan.diagnostics));
  return plan.journeyMap;
};
const hasCode = (value, code) => value.diagnostics.some((item) => item.code === code);

test('source material scales preserve defaults and reject unsafe values or shared model bindings', () => {
  const { meta, cameraTrack } = semanticFixture();
  meta.models[3].motionKey = 'about.03.coherent';
  meta.motionGroups = [{ id: 3, key: 'about.03.coherent' }];
  const resolve = (material, groups = meta.motionGroups, models = meta.models) => resolveAboutBlenderSceneContract({
    meta: { ...meta, motionGroups: groups, models: models.map((model, index) => index === 3
      ? { ...model, material } : model) }, cameraTrack, storyMap: storyMapFor(),
  });
  assert.equal(resolve(undefined).status, 'compatible');
  const material = { manifestationSpreadScale: 0.01, detailBiasScale: 1.6 };
  assert.equal(resolve(material).status, 'compatible');
  for (const invalid of [{}, 'invalid', { ...material, manifestationSpreadScale: 0 },
    { ...material, manifestationSpreadScale: Infinity }, { ...material, detailBiasScale: 3 }]) {
    assert.ok(hasCode(resolve(invalid), 'scene-model-material-invalid'));
  }
  for (const groups of [[], [null], [{ id: NaN, key: 'about.03.coherent' }],
    [...meta.motionGroups, null], [...meta.motionGroups, { id: 4, key: 3 }],
    [...meta.motionGroups, { id: 4 }],
    [{ id: 3, key: 'about.03.coherent' }, { id: 3, key: 'another-model' }],
    [{ id: 3, key: 'about.03.coherent' }, { id: 5, key: 'about.03.coherent.1' }]]) {
    assert.ok(hasCode(resolve(material, groups), 'scene-model-material-invalid'));
  }
  const shared = structuredClone(meta.models);
  shared[2].motionKey = 'about.03';
  assert.ok(hasCode(resolve(material, meta.motionGroups, shared), 'scene-model-material-invalid'));
});

test('source-authored terminal response rejects unsafe timing, geometry and model bindings', () => {
  const { meta, cameraTrack } = semanticFixture();
  meta.models[5].motionKey = 'about.05.coherent';
  const motionGroups = [{ id: 5, key: 'about.05.coherent' }, { id: 6, key: 'about.05.coherent.1' }];
  const response = {
    schema: 'about-terminal-response/v1', modelKey: 'about.05', periodSeconds: 8,
    amplitudeWU: 3.2, responseDelaySeconds: 2.6, pulseDurationSeconds: 2,
    travelXWU: [-60, 60], bankEndSiteZ: -1900,
    landscapeBounds: { min: [-420, -1200, -2800], max: [420, 0, -1500] },
  };
  const resolve = (terminalResponse, models = meta.models, groups = motionGroups) => resolveAboutBlenderSceneContract({
    meta: { ...meta, models, motionGroups: groups, terminalResponse }, cameraTrack, storyMap: storyMapFor(),
  });
  assert.equal(resolve(response).status, 'compatible');
  for (const change of [
    { amplitudeWU: Infinity }, { amplitudeWU: 10 }, { periodSeconds: 2 },
    { responseDelaySeconds: -1 }, { pulseDurationSeconds: NaN },
    { travelXWU: [60, -60] }, { modelKey: 'about.99' },
    { landscapeBounds: { min: [0, 0, 0], max: [0, 0, 0] } },
  ]) assert.equal(hasCode(resolve({ ...response, ...change }), 'scene-terminal-response-invalid'), true);
  assert.equal(hasCode(resolve(response, {}), 'scene-terminal-response-invalid'), true);
  assert.equal(hasCode(resolve(response, { some: 1 }), 'scene-terminal-response-invalid'), true);
  assert.doesNotThrow(() => resolve(response, [null, ...meta.models]));
  for (const groups of [
    [], null, [null], [{ id: NaN, key: 'about.05.coherent' }],
    [{ id: 256, key: 'about.05.coherent' }],
    [{ id: 5, key: 'about.05.coherent' }, { id: 5, key: 'about.05.coherent.1' }],
    [{ id: 5, key: 'about.05.coherent' }, { id: 6, key: 'about.04.coherent' }, { id: 7, key: 'about.05.coherent.1' }],
  ]) assert.equal(hasCode(resolve(response, meta.models, groups), 'scene-terminal-binding-invalid'), true);
  const unboundModels = structuredClone(meta.models);
  delete unboundModels[5].motionKey;
  assert.equal(hasCode(resolve(response, unboundModels), 'scene-terminal-binding-invalid'), true);
});
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const encode = (value) => new TextEncoder().encode(JSON.stringify(value));

function integrityFixture() {
  const { meta, cameraTrack } = semanticFixture();
  // These small bytes and their source marker are fictional integrity data.
  meta.source.sha256 = 'a'.repeat(64);
  const cameraTrackBytes = encode(cameraTrack);
  const surfelBytes = Uint8Array.from({ length: 64 }, (_, index) => index);
  meta.files = Object.fromEntries([
    ['cameraTrack', 'camera-track.json', cameraTrackBytes], ['surfels', 'surfels.bin', surfelBytes],
  ].map(([key, file, bytes]) => [key, { file, bytes: bytes.byteLength, sha256: sha256(bytes) }]));
  return { meta, cameraTrackBytes, surfelBytes, digestSha256: sha256 };
}

test('absent inputs are pending; supplied legacy inputs are explicitly incompatible', async () => {
  assert.equal(resolveAboutBlenderSceneContract().status, 'pending');
  assert.equal((await validateAboutBlenderSceneBundle()).status, 'pending');
  const fixture = semanticFixture();
  fixture.meta.version = 1;
  const value = resolveAboutBlenderSceneContract({ ...fixture, storyMap: storyMapFor() });
  assert.equal(value.status, 'incompatible');
  assert.ok(hasCode(value, 'scene-contract-unsupported'));
  assert.equal(value.visibilityWindows, null);
  assert.equal(resolveAboutBlenderSceneContract({ meta: fixture.meta }).status, 'incompatible');
  assert.equal(resolveAboutBlenderSceneContract({ ...semanticFixture(), storyMap: undefined }).status, 'pending');
});

for (const [profile, width, height] of [['desktop', 1440, 900], ['tablet', 900, 900], ['mobile', 390, 844]]) {
  test(`R5 recovery metadata fixture is compatible with the current ${profile} story map`, () => {
    const fixture = { ...semanticFixture(), storyMap: storyMapFor(width, height) };
    const before = JSON.stringify(fixture);
    const value = resolveAboutBlenderSceneContract(fixture);
    assert.equal(value.status, 'compatible', JSON.stringify(value.diagnostics));
    assert.equal(value.journeyMap.certifiable, true);
    assert.equal(value.visibilityWindows.length, 6);
    assert.ok(value.visibilityWindows.every((window) => window.source === 'semantic-journey-cues'
      && Number.isFinite(window.startWU) && Number.isFinite(window.endWU) && window.endWU > window.startWU));
    const gate = value.visibilityWindows[4];
    const anchors = new Map(value.journeyMap.anchors.map((anchor) => [anchor.id, anchor.cameraStoryWU]));
    assert.equal(gate.startWU, anchors.get('gate-entry') - 0.18);
    assert.equal(gate.endWU, anchors.get('gate-exit') + 0.18);
    value.visibilityWindows.forEach((window, index) => {
      const model = fixture.meta.models[index];
      assert.equal(window.startWU, anchors.get(model.visibilityStartCue) + model.visibilityStartOffsetWU);
      assert.equal(window.endWU, anchors.get(model.visibilityEndCue) + model.visibilityEndOffsetWU);
      assert.equal(window.handoffWU, model.visibilityHandoffWU);
      if (index > 0) assert.ok(window.startWU < value.visibilityWindows[index - 1].endWU,
        `${model.key} must retain its exported overlap with the previous model.`);
    });
    assert.ok(value.visibilityWindows[5].endWU > value.journeyMap.durationWU);
    assert.equal(JSON.stringify(fixture), before, 'The contract must not mutate its inputs.');
    assert.equal(Object.isFrozen(value.visibilityWindows), true);
    assert.deepEqual(resolveAboutBlenderSceneContract(fixture), value);
  });
}

test('R5 covers every journey role with its exact exported cue progress', () => {
  const fixture = semanticFixture();
  const value = resolveAboutBlenderSceneContract({ ...fixture, storyMap: storyMapFor() });
  assert.equal(value.status, 'compatible');
  assert.deepEqual(value.journeyMap.anchors.map((anchor) => anchor.id),
    ABOUT_NARRATIVE_JOURNEY_ROLES.map((role) => role.id));
  for (const role of ABOUT_NARRATIVE_JOURNEY_ROLES) {
    const anchor = value.journeyMap.anchors.find((item) => item.id === role.id);
    const cueName = role.requiredCueName || role.cueNames[0];
    const cue = fixture.cameraTrack.journeyCues.find((item) => item.name === cueName);
    assert.ok(cue, `R5 must contain the exported cue for ${role.id}.`);
    assert.equal(anchor.cueName, cueName);
    assert.equal(anchor.journeyProgress, cue.progress);
    assert.notEqual(anchor.cueSource, 'fallback');
  }
});

test('v31 is rejected against the current map and reproduces the historical 3.46 WU inversion', () => {
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const value = resolveAboutBlenderSceneContract({ ...semanticFixture('v31'), storyMap: storyMapFor(width, height) });
    assert.equal(value.status, 'incompatible');
    assert.ok(hasCode(value, 'scene-journey-incompatible'));
    assert.equal(value.visibilityWindows, null, 'Never expose a partial or unbounded replacement world.');

    // The rejected pre-recovery story reserved only 0.94 WU between gate cues.
    // Keep that historical failure independent of subsequent story improvements.
    const historicMap = structuredClone(storyMapFor(width, height));
    const entry = historicMap.anchors.find((anchor) => anchor.id === 'gate-entry');
    historicMap.anchors.find((anchor) => anchor.id === 'gate-release').storyWU = entry.storyWU + 0.94;
    const historic = resolveAboutBlenderSceneContract({ ...semanticFixture('v31'), storyMap: historicMap });
    const gate = historic.diagnostics.find((item) => item.code === 'scene-resolved-window-invalid' && item.modelKey === 'about.04');
    assert.ok(gate);
    assert.ok(Math.abs(gate.startWU - gate.endWU - 3.46) < 0.000001);
  }
});

test('mixed v31 visibility metadata and R5 camera cues still reject inverted bounds', () => {
  const value = resolveAboutBlenderSceneContract({
    meta: semanticFixture('v31').meta,
    cameraTrack: semanticFixture().cameraTrack,
    storyMap: storyMapFor(),
  });
  assert.equal(value.status, 'incompatible');
  assert.equal(hasCode(value, 'scene-journey-incompatible'), false);
  assert.ok(hasCode(value, 'scene-resolved-window-invalid'));
});

test('missing required and non-required camera cues cannot silently use fallback progress', () => {
  for (const role of ABOUT_NARRATIVE_JOURNEY_ROLES) {
    const fixture = semanticFixture();
    fixture.cameraTrack.journeyCues = fixture.cameraTrack.journeyCues
      .filter((cue) => !role.cueNames.includes(cue.name));
    const value = resolveAboutBlenderSceneContract({ ...fixture, storyMap: storyMapFor() });
    assert.equal(value.status, 'incompatible', role.id);
    assert.ok(value.diagnostics.some((item) => item.code === 'scene-camera-cue-unresolved'
      && item.path === `storyMap.anchors.${role.id}`), role.id);
    assert.equal(value.visibilityWindows, null);
  }
});

test('required semantic cues cannot downgrade to legacy aliases', () => {
  const requiredNames = new Set(ABOUT_NARRATIVE_JOURNEY_ROLES
    .map((role) => role.requiredCueName).filter(Boolean));
  for (const name of requiredNames) {
    const fixture = semanticFixture();
    fixture.cameraTrack.journeyCues = fixture.cameraTrack.journeyCues.filter((cue) => cue.name !== name);
    const value = resolveAboutBlenderSceneContract({ ...fixture, storyMap: storyMapFor() });
    assert.equal(value.status, 'incompatible', name);
    assert.ok(hasCode(value, 'journey-required-camera-cue-missing'), name);
    assert.equal(value.visibilityWindows, null);
  }
});

test('missing, reversed, equal and non-finite authored bounds never become unbounded', () => {
  for (const mutate of [
    (model) => { delete model.visibilityStartWU; },
    (model) => { delete model.visibilityEndWU; },
    (model) => { model.visibilityStartWU = model.visibilityEndWU + 1; },
    (model) => { model.visibilityEndWU = model.visibilityStartWU; },
    (model) => { model.visibilityEndWU = Infinity; },
  ]) {
    const fixture = semanticFixture();
    mutate(fixture.meta.models[4]);
    const value = resolveAboutBlenderSceneContract({ ...fixture, storyMap: storyMapFor() });
    assert.equal(value.status, 'incompatible');
    assert.ok(hasCode(value, 'scene-authored-window-invalid'));
    assert.equal(value.visibilityWindows, null);
  }
});

test('missing model cues or offsets reject instead of using authored-WU fallback', () => {
  for (const mutate of [
    (model) => { delete model.visibilityStartCue; },
    (model) => { model.visibilityEndCue = 'not-a-story-cue'; },
    (model) => { delete model.visibilityEndOffsetWU; },
    (model) => { model.visibilityEndOffsetWU = NaN; },
  ]) {
    const fixture = semanticFixture();
    mutate(fixture.meta.models[4]);
    const value = resolveAboutBlenderSceneContract({ ...fixture, storyMap: storyMapFor() });
    assert.equal(value.status, 'incompatible');
    assert.ok(hasCode(value, 'scene-visibility-cue-unresolved'));
  }
});

test('equal, reversed, extreme resolved bounds and overlong handoffs reject', () => {
  for (const offset of [0, -1, Number.MAX_VALUE]) {
    const fixture = semanticFixture();
    Object.assign(fixture.meta.models[4], {
      visibilityEndCue: 'gate-entry', visibilityStartOffsetWU: 0, visibilityEndOffsetWU: offset,
    });
    if (offset === Number.MAX_VALUE) fixture.meta.models[4].visibilityStartOffsetWU = Number.MAX_VALUE;
    const value = resolveAboutBlenderSceneContract({ ...fixture, storyMap: storyMapFor() });
    assert.equal(value.status, 'incompatible');
    assert.ok(hasCode(value, 'scene-resolved-window-invalid'));
  }
  const fixture = semanticFixture();
  fixture.meta.models[4].visibilityHandoffWU = 2;
  const value = resolveAboutBlenderSceneContract({ ...fixture, storyMap: storyMapFor() });
  assert.ok(hasCode(value, 'scene-visibility-handoff-invalid'));
});

test('malformed story maps, duplicate camera cues and reordered models reject', () => {
  const fixture = semanticFixture();
  for (const storyMap of [{ valid: true }, { ...storyMapFor(), anchors: [] }, { ...storyMapFor(), valid: false }]) {
    assert.equal(resolveAboutBlenderSceneContract({ ...fixture, storyMap }).status, 'incompatible');
  }
  fixture.cameraTrack.journeyCues.push({ ...fixture.cameraTrack.journeyCues[0] });
  assert.ok(hasCode(resolveAboutBlenderSceneContract({ ...fixture, storyMap: storyMapFor() }), 'scene-camera-cues-invalid'));
  const reordered = semanticFixture();
  reordered.meta.models.reverse();
  assert.ok(hasCode(resolveAboutBlenderSceneContract({ ...reordered, storyMap: storyMapFor() }), 'scene-model-id-invalid'));
});

test('responsive re-resolution uses new WU bounds without changing the earlier result', () => {
  const fixture = semanticFixture();
  const desktop = resolveAboutBlenderSceneContract({ ...fixture, storyMap: storyMapFor() });
  const snapshot = JSON.stringify(desktop);
  const mobile = resolveAboutBlenderSceneContract({ ...fixture, storyMap: storyMapFor(390, 844) });
  assert.equal(mobile.status, 'compatible');
  assert.notEqual(desktop.visibilityWindows[4].startWU, mobile.visibilityWindows[4].startWU);
  assert.equal(JSON.stringify(desktop), snapshot);
});

test('matching bytes are hashed exactly once each and return the verified camera', async () => {
  const fixture = integrityFixture();
  const calls = [];
  fixture.digestSha256 = (bytes) => { calls.push(bytes); return sha256(bytes); };
  const value = await validateAboutBlenderSceneBundle(fixture);
  assert.equal(value.status, 'compatible', JSON.stringify(value.diagnostics));
  assert.equal(calls.length, 2);
  assert.deepEqual(value.cameraTrack, JSON.parse(new TextDecoder().decode(fixture.cameraTrackBytes)));
  assert.equal(value.sourceHash, fixture.meta.source.sha256);
  assert.deepEqual(value.files, fixture.meta.files);
  const semantic = resolveAboutBlenderSceneContract({ meta: fixture.meta, cameraTrack: value.cameraTrack, storyMap: storyMapFor() });
  assert.equal(semantic.status, 'compatible');
});

test('the default Web Crypto capability verifies bytes without a Node dependency in the module', {
  skip: !globalThis.crypto?.subtle,
}, async () => {
  const fixture = integrityFixture();
  delete fixture.digestSha256;
  const value = await validateAboutBlenderSceneBundle({ ...fixture, expectedSourceHash: fixture.meta.source.sha256 });
  assert.equal(value.status, 'compatible');
});

test('pending bytes and wrong lengths are distinguished before any digest work', async () => {
  const fixture = integrityFixture();
  fixture.digestSha256 = () => assert.fail('Must not digest incomplete or wrong-length data.');
  assert.equal((await validateAboutBlenderSceneBundle({ ...fixture, surfelBytes: null })).status, 'pending');
  const value = await validateAboutBlenderSceneBundle({ ...fixture, surfelBytes: fixture.surfelBytes.subarray(1) });
  assert.equal(value.status, 'incompatible');
  assert.ok(hasCode(value, 'scene-file-length-mismatch'));
});

test('equal-length stale camera and surfel bytes fail their SHA-256 checks', async () => {
  for (const key of ['cameraTrackBytes', 'surfelBytes']) {
    const fixture = integrityFixture();
    const expectedLength = fixture[key].byteLength;
    fixture[key][0] ^= 1;
    assert.equal(fixture[key].byteLength, expectedLength);
    const value = await validateAboutBlenderSceneBundle(fixture);
    assert.equal(value.status, 'incompatible');
    assert.ok(hasCode(value, 'scene-file-hash-mismatch'));
    assert.equal(value.cameraTrack, null);
  }
});

test('offset byte views hash only their supplied slice', async () => {
  const fixture = integrityFixture();
  const padded = new Uint8Array(fixture.surfelBytes.byteLength + 8);
  padded.set(fixture.surfelBytes, 4);
  fixture.surfelBytes = new DataView(padded.buffer, 4, fixture.surfelBytes.byteLength);
  assert.equal((await validateAboutBlenderSceneBundle(fixture)).status, 'compatible');
});

test('source pinning, malformed file records and hash capability failures are explicit', async () => {
  const pinned = await validateAboutBlenderSceneBundle({ ...integrityFixture(), expectedSourceHash: 'b'.repeat(64) });
  assert.ok(hasCode(pinned, 'scene-source-hash-mismatch'));
  const fixture = integrityFixture();
  fixture.meta.files.surfels.sha256 = 'invalid';
  assert.ok(hasCode(await validateAboutBlenderSceneBundle(fixture), 'scene-file-record-invalid'));
  const unavailable = await validateAboutBlenderSceneBundle({ ...integrityFixture(), digestSha256: null });
  assert.equal(unavailable.status, 'incompatible');
  assert.ok(hasCode(unavailable, 'scene-digest-unavailable'));
  const rejected = await validateAboutBlenderSceneBundle({
    ...integrityFixture(), digestSha256: async () => { throw new Error('Unavailable'); },
  });
  assert.ok(hasCode(rejected, 'scene-digest-failed'));
});

test('verified but invalid camera JSON and unsupported camera versions reject', async () => {
  const malformed = integrityFixture();
  malformed.cameraTrackBytes = new TextEncoder().encode('{');
  malformed.meta.files.cameraTrack.bytes = malformed.cameraTrackBytes.byteLength;
  malformed.meta.files.cameraTrack.sha256 = sha256(malformed.cameraTrackBytes);
  assert.ok(hasCode(await validateAboutBlenderSceneBundle(malformed), 'scene-camera-json-invalid'));
  const unsupported = integrityFixture();
  const camera = JSON.parse(new TextDecoder().decode(unsupported.cameraTrackBytes));
  camera.version = 99;
  unsupported.cameraTrackBytes = encode(camera);
  unsupported.meta.files.cameraTrack.bytes = unsupported.cameraTrackBytes.byteLength;
  unsupported.meta.files.cameraTrack.sha256 = sha256(unsupported.cameraTrackBytes);
  assert.ok(hasCode(await validateAboutBlenderSceneBundle(unsupported), 'scene-camera-contract-unsupported'));
});

test('non-finite samples and malformed cue progress reject instead of being clamped', () => {
  for (const progress of [NaN, Infinity, -0.01, 1.01, '0.5']) {
    const fixture = semanticFixture();
    fixture.cameraTrack.journeyCues[2].progress = progress;
    const value = resolveAboutBlenderSceneContract({ ...fixture, storyMap: storyMapFor() });
    assert.equal(value.status, 'incompatible');
    assert.ok(hasCode(value, 'scene-camera-cues-invalid'));
  }
  const fixture = semanticFixture();
  fixture.cameraTrack.samples[0][0] = NaN;
  assert.ok(hasCode(resolveAboutBlenderSceneContract({ ...fixture, storyMap: storyMapFor() }), 'scene-camera-data-invalid'));
});
