import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  resolveAboutNarrativeCameraKeyEasingHandles,
  setAboutNarrativeCameraKeyEasingStrength,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraEasing.js';
import {
  compileAboutNarrativeCameraKey,
  sampleAboutNarrativeCameraKeysInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraSampling.js';
import {
  createAboutNarrativeCameraKeyAtWU,
  createAboutNarrativeCameraOrientationKeyAtWU,
  createAboutNarrativeInteractionAtWU,
  createAboutNarrativeScrollBlockAtWU,
  createAboutNarrativeStubAtWU,
  createAboutNarrativeTitleAtWU,
  createAboutNarrativeTrackClipboardPayload,
  createAboutNarrativeTrackObjectAtWU,
  createAboutNarrativeVisibilityKeyAtWU,
  createAboutNarrativeWorldAtWU,
  deleteAboutNarrativeTrackObjects,
  deriveAboutNarrativeTrackLoopRange,
  distributeAboutNarrativeTextFieldsEvenly,
  duplicateAboutNarrativeTrackObjects,
  getAboutNarrativeActiveWorld,
  getAboutNarrativeTextStoryDurationWU,
  getAboutNarrativeTrackObject,
  getAboutNarrativeTrackObjectRange,
  moveAboutNarrativeTrackObjectsByWU,
  normalizeAboutNarrativeTrackSelection,
  pasteAboutNarrativeTrackClipboardPayload,
  resizeAboutNarrativeInteractionEdge,
  resizeAboutNarrativeTextFieldEdge,
  resizeAboutNarrativeWorldEnd,
  synchronizeAboutNarrativeDurationToText,
  validateAboutNarrativeTrackClipboardPayload,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackEditing.js';

const canonical = JSON.parse(await readFile(
  new URL('../react-app/app/public/config/contents-about.json', import.meta.url),
  'utf8',
));

function createCameraSampleTarget() {
  return {
    position: [0, 0, 0],
    lookAtTarget: [0, 0, 0],
    quaternion: [0, 0, 0, 1],
    manualQuaternion: [0, 0, 0, 1],
    aimQuaternion: [0, 0, 0, 1],
    lookAtRoll: 0,
    aimWeight: 0,
    targeted: false,
    fov: 48,
  };
}

function createAuthoredCameraEasingFixture() {
  return canonical.tracks.camera.moveKeys.map((key, index) => ({
    ...structuredClone(key),
    position: [index * 10, 0, 0],
    rotation: [0, 0, 0],
    aimEnabled: false,
    lookAtTarget: [0, 0, -1],
    lookAtRoll: 0,
    fov: 40 + index,
  }));
}

function sampleCameraPositionX(keys, storyWU) {
  const compiled = keys
    .map(compileAboutNarrativeCameraKey)
    .sort((left, right) => left.atWU - right.atWU || left.id.localeCompare(right.id));
  return sampleAboutNarrativeCameraKeysInto(
    compiled,
    storyWU,
    false,
    createCameraSampleTarget(),
  ).position[0];
}

function createFixture() {
  return {
    schemaVersion: 5,
    modelVersion: 1,
    globals: { camera: { distanceFogStartWU: 8, distanceFogEndWU: 18 } },
    profiles: {
      desktop: { id: 'desktop', storyDurationWU: 10, scrollDurationWU: 10 },
      tablet: { id: 'tablet', storyDurationWU: 10, scrollDurationWU: 10 },
      mobile: { id: 'mobile', storyDurationWU: 10, scrollDurationWU: 12 },
      'reduced-motion': { id: 'reduced-motion', storyDurationWU: 10, scrollDurationWU: 10 },
    },
    tracks: {
      camera: {
        keys: [
          { id: 'camera-start', atWU: 0, position: [0, 0, 0], rotation: [0, 0, 0], fov: 48, easing: 'smoothstep', locked: true },
          { id: 'camera-middle', atWU: 3, position: [1, 0, 0], rotation: [0, 0, 5], fov: 45, easing: 'smoothstep', locked: false },
          { id: 'camera-end', atWU: 10, position: [0, 0, 0], rotation: [0, 0, 0], fov: 48, easing: 'smoothstep', locked: true },
        ],
        orientationKeys: [
          { id: 'camera-tilt-start', atWU: 1, rotation: [0, 0, 0], easing: 'smoothstep', locked: true },
          { id: 'camera-tilt-middle', atWU: 5, rotation: [-45, 0, 0], easing: 'smoothstep', locked: false },
          { id: 'camera-tilt-end', atWU: 9, rotation: [-90, 0, 0], easing: 'linear', locked: true },
        ],
      },
      visibility: {
        keys: [
          { id: 'visibility-start', atWU: 0, visibility: 1, easing: 'linear', locked: true },
          { id: 'visibility-middle', atWU: 5, visibility: 0.4, easing: 'smoothstep', locked: false },
          { id: 'visibility-end', atWU: 10, visibility: 1, easing: 'linear', locked: true },
        ],
      },
      worlds: {
        objects: [
          {
            id: 'world-one', label: 'One', startWU: 0, anchorWU: 0, endWU: 99, locked: true,
            adapterId: 'point-field-v1', shapeId: 'cluster-v1', seed: 1, entryDistanceWU: 4,
            transform: { scale: 1 }, shapeParameters: { density: 1 }, modifiers: [],
            transitionIn: { startWU: 0, endWU: 0, type: 'cut', easing: 'linear', correspondence: 'stable-seed' },
          },
          {
            id: 'world-two', label: 'Two', startWU: 4, anchorWU: 4.1,
            adapterId: 'point-field-v1', shapeId: 'field-v1', seed: 2, entryDistanceWU: 4,
            transform: { scale: 1 }, shapeParameters: { density: 1 }, modifiers: [],
            transitionIn: { startWU: 4, endWU: 4.5, type: 'morph', easing: 'smoothstep', correspondence: 'stable-seed' },
          },
          {
            id: 'world-three', label: 'Three', startWU: 8, anchorWU: 8,
            adapterId: 'point-field-v1', shapeId: 'bust-v1', seed: 3, entryDistanceWU: 4,
            transform: { scale: 1 }, shapeParameters: { density: 1 }, modifiers: [],
            transitionIn: { startWU: 8, endWU: 8.5, type: 'morph', easing: 'smoothstep', correspondence: 'stable-seed' },
          },
        ],
      },
      text: {
        fields: [
          { id: 'text-intro', kind: 'title', startWU: 1, focusWU: 1.5, endWU: 2, text: 'Intro', publishable: true },
          { id: 'text-follow', kind: 'title', startWU: 2.2, focusWU: 2.5, endWU: 2.8, text: 'Follow', anchor: 'text-intro', publishable: true },
          { id: 'text-editorial', kind: 'scroll-block', startWU: 3, focusWU: 4, endWU: 5, block: { kind: 'prose', text: 'Editorial' }, publishable: true },
          { id: 'text-placeholder', kind: 'stub', startWU: 6, focusWU: 6, endWU: 6.5, text: '', publishable: false },
        ],
      },
      interactions: {
        clips: [
          { id: 'interaction-spin', type: 'bust-spin', startWU: 4.5, activationWU: 5, endWU: 7, targetWorldId: 'world-two', parameters: { releaseWU: 0.5, speed: 1 } },
        ],
      },
    },
    library: { presets: [] },
  };
}

const bytes = (value) => JSON.stringify(value);

test('stable object-ID selections normalize directly and migrate legacy editor selections', () => {
  const model = createFixture();
  assert.deepEqual(normalizeAboutNarrativeTrackSelection({ type: 'text-field', id: 'text-intro' }, model), {
    type: 'text-field', id: 'text-intro',
  });
  assert.deepEqual(normalizeAboutNarrativeTrackSelection({ type: 'cue', sectionId: 'promise', cueId: 'intro' }, model), {
    type: 'text-field', id: 'text-intro',
  });
  assert.deepEqual(normalizeAboutNarrativeTrackSelection({ type: 'camera-key', sectionId: 'middle', keyIndex: 2 }, model, {
    legacySelectionMap: { 'camera-key:middle:2': { type: 'camera-key', id: 'camera-middle' } },
  }), { type: 'camera-key', id: 'camera-middle' });
  assert.deepEqual(normalizeAboutNarrativeTrackSelection({ type: 'section', sectionId: 'missing' }, model), {
    type: 'track', id: 'world',
  });
  assert.deepEqual(normalizeAboutNarrativeTrackSelection({ type: 'sequence', track: 'section' }, model), {
    type: 'track', id: 'world',
  });
});

test('object lookup and ranges use global WU and derive World ends from the next World Start', () => {
  const model = createFixture();
  assert.equal(getAboutNarrativeTrackObject(model, { type: 'camera-key', id: 'camera-middle' }).atWU, 3);
  assert.deepEqual(
    getAboutNarrativeTrackObject(model, { type: 'camera-orientation-key', id: 'camera-tilt-middle' }).rotation,
    [-45, 0, 0],
  );
  assert.equal(getAboutNarrativeTrackObject(model, { type: 'visibility-key', id: 'visibility-middle' }).visibility, 0.4);
  assert.deepEqual(getAboutNarrativeTrackObjectRange(model, { type: 'world', id: 'world-one' }), { startWU: 0, endWU: 4 });
  assert.deepEqual(getAboutNarrativeTrackObjectRange(model, { type: 'world', id: 'world-three' }), { startWU: 8, endWU: 10 });
  assert.equal(getAboutNarrativeActiveWorld(model, 7.9).id, 'world-two');
  assert.deepEqual(getAboutNarrativeTrackObjectRange(model, { type: 'camera-key', id: 'camera-middle' }, null, { cameraWindowWU: 0.25 }), {
    startWU: 2.75,
    endWU: 3.25,
  });
  assert.deepEqual(getAboutNarrativeTrackObjectRange(model, { type: 'camera-orientation-key', id: 'camera-tilt-middle' }, null, { cameraWindowWU: 0.25 }), {
    startWU: 4.75,
    endWU: 5.25,
  });
  assert.deepEqual(getAboutNarrativeTrackObjectRange(model, { type: 'visibility-key', id: 'visibility-middle' }, null, { cameraWindowWU: 0.25 }), {
    startWU: 4.75,
    endWU: 5.25,
  });
});

test('every authored Camera key controls its own incoming arrival and outgoing departure', () => {
  const authoredKeys = createAuthoredCameraEasingFixture();
  authoredKeys.forEach((authoredKey, keyIndex) => {
    const context = resolveAboutNarrativeCameraKeyEasingHandles(authoredKeys, authoredKey.id);
    assert.equal(context.key.id, authoredKey.id);
    assert.equal(Boolean(context.incoming), keyIndex > 0, `${authoredKey.id} incoming availability`);
    assert.equal(Boolean(context.outgoing), keyIndex < authoredKeys.length - 1, `${authoredKey.id} outgoing availability`);

    ['incoming', 'outgoing'].forEach((direction) => {
      const segmentIndex = direction === 'incoming' ? keyIndex - 1 : keyIndex;
      if (segmentIndex < 0 || segmentIndex >= authoredKeys.length - 1) return;
      const keys = createAuthoredCameraEasingFixture();
      const beforeEasings = keys.map((key) => key.easing);
      const beforeContext = resolveAboutNarrativeCameraKeyEasingHandles(keys, authoredKey.id);
      const nextStrength = beforeContext[direction].strength > 0.5 ? 0.2 : 0.8;
      const segmentStart = keys[segmentIndex];
      const segmentEnd = keys[segmentIndex + 1];
      const segmentProgress = direction === 'incoming' ? 0.75 : 0.25;
      const sampleWU = segmentStart.atWU
        + ((segmentEnd.atWU - segmentStart.atWU) * segmentProgress);
      const beforePositionX = sampleCameraPositionX(keys, sampleWU);
      const result = setAboutNarrativeCameraKeyEasingStrength(
        keys,
        authoredKey.id,
        direction,
        nextStrength,
      );

      assert.equal(result.segmentKeyId, segmentStart.id, `${authoredKey.id} ${direction} segment owner`);
      keys.forEach((key, index) => {
        if (index === segmentIndex) assert.notEqual(key.easing, beforeEasings[index]);
        else assert.equal(key.easing, beforeEasings[index], `${authoredKey.id} ${direction} must not edit ${key.id}`);
      });
      const afterPositionX = sampleCameraPositionX(keys, sampleWU);
      assert.ok(
        Math.abs(afterPositionX - beforePositionX) > 0.0001,
        `${authoredKey.id} ${direction} must change runtime camera interpolation`,
      );
      assert.equal(
        sampleCameraPositionX(keys, keys[keyIndex].atWU),
        keyIndex * 10,
        `${authoredKey.id} easing must preserve its exact keyframe pose`,
      );
    });
  });

  const boundaryKeys = createAuthoredCameraEasingFixture();
  const boundaryEasings = boundaryKeys.map((key) => key.easing);
  assert.equal(setAboutNarrativeCameraKeyEasingStrength(
    boundaryKeys,
    boundaryKeys[0].id,
    'incoming',
    0.8,
  ), null);
  assert.equal(setAboutNarrativeCameraKeyEasingStrength(
    boundaryKeys,
    boundaryKeys.at(-1).id,
    'outgoing',
    0.8,
  ), null);
  assert.deepEqual(boundaryKeys.map((key) => key.easing), boundaryEasings);
});

test('Text fields keep authored order while leaving every unrelated track byte-identical', () => {
  const model = createFixture();
  const before = {
    camera: bytes(model.tracks.camera),
    worlds: bytes(model.tracks.worlds),
    interactions: bytes(model.tracks.interactions),
  };
  const result = moveAboutNarrativeTrackObjectsByWU({
    model,
    selection: {
      type: 'text-field',
      id: 'text-intro',
      members: [
        { type: 'text-field', id: 'text-intro' },
        { type: 'text-field', id: 'text-follow' },
      ],
    },
    deltaWU: 0.335,
  });
  assert.equal(result.valid, true);
  assert.equal(result.deltaWU, 0.2);
  assert.equal(result.clamped, true);
  assert.equal(getAboutNarrativeTrackObject(result.model, { type: 'text-field', id: 'text-intro' }).focusWU, 1.7);
  assert.equal(getAboutNarrativeTrackObject(result.model, { type: 'text-field', id: 'text-follow' }).focusWU, 2.7);
  assert.equal(bytes(result.model.tracks.camera), before.camera);
  assert.equal(bytes(result.model.tracks.worlds), before.worlds);
  assert.equal(bytes(result.model.tracks.interactions), before.interactions);
  assert.equal(bytes(model.tracks.text), bytes(createFixture().tracks.text), 'The input model remains immutable.');
});

test('Text animation windows keep their duration, distribute evenly, and extend Story without retiming other tracks', () => {
  const model = createFixture();
  const durations = new Map(model.tracks.text.fields.map((field) => [
    field.id,
    Number((field.endWU - field.startWU).toFixed(6)),
  ]));
  const distributed = distributeAboutNarrativeTextFieldsEvenly({ model });
  assert.equal(distributed.valid, true);
  const fields = distributed.model.tracks.text.fields;
  const gaps = fields.slice(1).map((field, index) => Number((field.startWU - fields[index].endWU).toFixed(6)));
  assert.equal(new Set(gaps).size, 1);
  fields.forEach((field) => {
    assert.equal(Number((field.endWU - field.startWU).toFixed(6)), durations.get(field.id));
  });
  assert.equal(distributed.model.profiles.desktop.storyDurationWU, 10);

  const textDriven = createFixture();
  const finale = textDriven.tracks.text.fields.at(-1);
  finale.kind = 'title';
  finale.publishable = true;
  finale.startWU = 9;
  finale.focusWU = 9.5;
  finale.endWU = 10;
  const extended = moveAboutNarrativeTrackObjectsByWU({
    model: textDriven,
    selection: { type: 'text-field', id: finale.id },
    deltaWU: 2,
    snap: false,
  });
  assert.equal(extended.valid, true);
  assert.equal(extended.model.profiles.desktop.storyDurationWU, 12);
  assert.equal(extended.model.profiles.tablet.storyDurationWU, 12);
  assert.equal(extended.model.profiles.mobile.scrollDurationWU, 14.4);
  assert.equal(extended.model.tracks.camera.keys.at(-1).atWU, 10);
  assert.equal(extended.model.tracks.visibility.keys.at(-1).atWU, 10);
  assert.equal(extended.model.tracks.worlds.objects[1].anchorWU, 4.1);
  assert.equal(extended.model.tracks.interactions.clips[0].parameters.releaseWU, 0.5);
  assert.equal(extended.model.tracks.interactions.clips[0].parameters.speed, 1);
  assert.equal(extended.model.tracks.text.fields.at(-1).endWU, 12);
});

test('v7 Text owns page length and carries only story-bound animation endpoints with it', () => {
  const model = structuredClone(canonical);
  const previousDurationWU = model.profiles.desktop.storyDurationWU;
  const finale = model.tracks.text.fields.find((field) => field.id === 'text-epilogue-invitation');
  finale.endWU = 24;

  synchronizeAboutNarrativeDurationToText(model, previousDurationWU);

  assert.equal(getAboutNarrativeTextStoryDurationWU(model), 24);
  assert.equal(model.profiles.desktop.storyDurationWU, 24);
  assert.equal(model.profiles.tablet.storyDurationWU, 24);
  assert.equal(model.profiles.mobile.storyDurationWU, 24);
  assert.equal(model.profiles.mobile.scrollDurationWU, 24.763636);
  assert.equal(model.tracks.camera.orbit.endWU, 24);
  assert.equal(model.tracks.pointField.keys.at(-1).atWU, 24);
  assert.equal(model.tracks.visibility.keys.at(-1).atWU, 24);
  assert.equal(
    model.tracks.interactions.clips.find((clip) => clip.id === 'effect-world-emergent-bust-assembly').endWU,
    24,
  );
  assert.equal(
    model.tracks.pointField.keys.find((key) => key.id === 'key-world-emergent-arrival').atWU,
    21.4,
    'Interior animation timing stays independently editable.',
  );
});

test('v7 Text spine rejects temporal and structural timeline edits', () => {
  const text = canonical.tracks.text.fields.find((field) => field.publishable !== false);
  const selection = { type: 'text-field', id: text.id };
  const clipboard = createAboutNarrativeTrackClipboardPayload({ model: canonical, selection });
  const results = [
    moveAboutNarrativeTrackObjectsByWU({ model: canonical, selection, deltaWU: 0.1 }),
    resizeAboutNarrativeTextFieldEdge({ model: canonical, id: text.id, edge: 'end', atWU: text.endWU + 0.1 }),
    distributeAboutNarrativeTextFieldsEvenly({ model: canonical }),
    createAboutNarrativeTitleAtWU({ model: canonical, atWU: 1 }),
    deleteAboutNarrativeTrackObjects({ model: canonical, selection }),
    duplicateAboutNarrativeTrackObjects({ model: canonical, selection }),
    pasteAboutNarrativeTrackClipboardPayload({ model: canonical, payload: clipboard, atWU: 1 }),
  ];
  results.forEach((result) => {
    assert.equal(result.valid, false);
    assert.equal(result.code, 'text-spine-fixed');
  });
});

test('World, Camera travel, Camera tilt, and Visibility movement shifts only selected timing while camera boundaries stay editable', () => {
  const model = createFixture();
  const interactionsBefore = bytes(model.tracks.interactions);
  const movedWorld = moveAboutNarrativeTrackObjectsByWU({
    model,
    selection: { type: 'world', id: 'world-two' },
    deltaWU: 0.25,
  });
  assert.equal(movedWorld.valid, true);
  const world = getAboutNarrativeTrackObject(movedWorld.model, { type: 'world', id: 'world-two' });
  assert.equal(world.startWU, 4.25);
  assert.equal(world.anchorWU, 4.35);
  assert.deepEqual([world.transitionIn.startWU, world.transitionIn.endWU], [4.25, 4.75]);
  assert.equal('endWU' in world, false);
  assert.equal(bytes(movedWorld.model.tracks.interactions), interactionsBefore);

  const movedCamera = moveAboutNarrativeTrackObjectsByWU({
    model,
    selection: { type: 'camera-key', id: 'camera-middle' },
    deltaWU: 0.2,
  });
  assert.equal(movedCamera.valid, true);
  assert.equal(getAboutNarrativeTrackObject(movedCamera.model, { type: 'camera-key', id: 'camera-middle' }).atWU, 3.2);
  const movedBoundaryCamera = moveAboutNarrativeTrackObjectsByWU({
    model,
    selection: { type: 'camera-key', id: 'camera-start' },
    deltaWU: 1,
  });
  assert.equal(movedBoundaryCamera.valid, true);
  assert.equal(getAboutNarrativeTrackObject(
    movedBoundaryCamera.model,
    { type: 'camera-key', id: 'camera-start' },
  ).atWU, 1);

  const movedCameraTilt = moveAboutNarrativeTrackObjectsByWU({
    model,
    selection: { type: 'camera-orientation-key', id: 'camera-tilt-middle' },
    deltaWU: 0.2,
  });
  assert.equal(movedCameraTilt.valid, true);
  assert.equal(getAboutNarrativeTrackObject(
    movedCameraTilt.model,
    { type: 'camera-orientation-key', id: 'camera-tilt-middle' },
  ).atWU, 5.2);

  const movedVisibility = moveAboutNarrativeTrackObjectsByWU({
    model,
    selection: { type: 'visibility-key', id: 'visibility-middle' },
    deltaWU: 0.2,
  });
  assert.equal(movedVisibility.valid, true);
  assert.equal(getAboutNarrativeTrackObject(movedVisibility.model, { type: 'visibility-key', id: 'visibility-middle' }).atWU, 5.2);
  assert.equal(moveAboutNarrativeTrackObjectsByWU({
    model,
    selection: { type: 'visibility-key', id: 'visibility-start' },
    deltaWU: 1,
  }).valid, false);
});

test('Text edge resizing preserves focus ordering and clamps to the Story range', () => {
  const model = createFixture();
  const start = resizeAboutNarrativeTextFieldEdge({ model, id: 'text-intro', edge: 'start', atWU: 1.333 });
  assert.equal(start.valid, true);
  assert.equal(start.object.startWU, 1.335);
  assert.equal(start.object.focusWU, 1.5);
  const end = resizeAboutNarrativeTextFieldEdge({ model, id: 'text-intro', edge: 'end', atWU: 0.2 });
  assert.equal(end.valid, true);
  assert.equal(end.object.endWU, 1.5);
  assert.equal(end.clamped, true);
  const neighbour = resizeAboutNarrativeTextFieldEdge({
    model,
    id: 'text-intro',
    edge: 'end',
    atWU: 2.6,
  });
  assert.equal(neighbour.valid, true);
  assert.equal(neighbour.object.endWU, 2.2);
  assert.equal(neighbour.clamped, true);
  assert.equal(resizeAboutNarrativeTextFieldEdge({ model, id: 'text-intro', edge: 'focus', atWU: 2 }).valid, false);
});

test('Motion edge resizing preserves activation and stays inside its target World', () => {
  const model = createFixture();
  const start = resizeAboutNarrativeInteractionEdge({
    model,
    id: 'interaction-spin',
    edge: 'start',
    atWU: 3,
  });
  assert.equal(start.valid, true);
  assert.deepEqual(
    [start.object.startWU, start.object.activationWU, start.object.endWU],
    [4, 5, 7],
  );
  assert.equal(start.clamped, true);

  const end = resizeAboutNarrativeInteractionEdge({
    model,
    id: 'interaction-spin',
    edge: 'end',
    atWU: 9,
  });
  assert.equal(end.valid, true);
  assert.deepEqual(
    [end.object.startWU, end.object.activationWU, end.object.endWU],
    [4.5, 5, 8],
  );
  assert.equal(end.clamped, true);

  const collapsed = resizeAboutNarrativeInteractionEdge({
    model,
    id: 'interaction-spin',
    edge: 'start',
    atWU: 6,
  });
  assert.equal(collapsed.valid, true);
  assert.equal(collapsed.object.startWU, 5);
  assert.equal(collapsed.object.activationWU, 5);

  const protectedModel = createFixture();
  protectedModel.tracks.interactions.clips[0].protected = true;
  assert.equal(resizeAboutNarrativeInteractionEdge({
    model: protectedModel,
    id: 'interaction-spin',
    edge: 'end',
    atWU: 6,
  }).valid, false);
});

test('World end resizing ripples every later World without gaps and keeps free tracks independent', () => {
  const model = createFixture();
  const cameraBefore = bytes(model.tracks.camera);
  const textBefore = bytes(model.tracks.text);
  const result = resizeAboutNarrativeWorldEnd({
    model,
    id: 'world-two',
    atWU: 6.5,
  });
  assert.equal(result.valid, true);
  assert.equal(result.endWU, 6.5);
  assert.equal(result.deltaWU, -1.5);
  assert.deepEqual(result.model.tracks.worlds.objects.map((world) => world.startWU), [0, 4, 6.5]);
  assert.deepEqual(getAboutNarrativeTrackObjectRange(result.model, { type: 'world', id: 'world-one' }), { startWU: 0, endWU: 4 });
  assert.deepEqual(getAboutNarrativeTrackObjectRange(result.model, { type: 'world', id: 'world-two' }), { startWU: 4, endWU: 6.5 });
  assert.deepEqual(getAboutNarrativeTrackObjectRange(result.model, { type: 'world', id: 'world-three' }), { startWU: 6.5, endWU: 10 });
  const laterWorld = getAboutNarrativeTrackObject(result.model, { type: 'world', id: 'world-three' });
  assert.deepEqual([laterWorld.anchorWU, laterWorld.transitionIn.startWU, laterWorld.transitionIn.endWU], [6.5, 6.5, 7]);
  const currentMotion = getAboutNarrativeTrackObject(result.model, { type: 'interaction', id: 'interaction-spin' });
  assert.deepEqual([currentMotion.startWU, currentMotion.activationWU, currentMotion.endWU], [4.5, 5, 6.5]);
  assert.equal(bytes(result.model.tracks.camera), cameraBefore);
  assert.equal(bytes(result.model.tracks.text), textBefore);
  assert.equal(bytes(model), bytes(createFixture()), 'The input model remains immutable.');
});

test('World end resizing clamps protected boundaries and rejects locked or final Worlds', () => {
  const model = createFixture();
  const clamped = resizeAboutNarrativeWorldEnd({ model, id: 'world-two', atWU: 4.1 });
  assert.equal(clamped.valid, true);
  assert.equal(clamped.endWU, 5, 'A bound Motion activation remains inside its World.');
  assert.equal(clamped.clamped, true);
  assert.equal(resizeAboutNarrativeWorldEnd({ model, id: 'world-one', atWU: 3 }).valid, false);
  assert.equal(resizeAboutNarrativeWorldEnd({ model, id: 'world-three', atWU: 9 }).valid, false);
});

test('Title, Scroll block, Stub, Camera travel, Camera tilt, Visibility, World, and Interaction creation uses independent IDs and absolute WU', () => {
  const model = createFixture();
  const title = createAboutNarrativeTitleAtWU({ model, atWU: 0.5 });
  assert.equal(title.valid, true);
  assert.deepEqual([title.object.startWU, title.object.focusWU, title.object.endWU], [0.38, 0.5, 0.62]);
  assert.equal(title.object.publishable, true);

  const scroll = createAboutNarrativeScrollBlockAtWU({ model, atWU: 5.25 });
  assert.equal(scroll.valid, true);
  assert.deepEqual([scroll.object.startWU, scroll.object.focusWU, scroll.object.endWU], [5.25, 5.5, 5.75]);
  const stub = createAboutNarrativeStubAtWU({ model, atWU: 9.9 });
  assert.equal(stub.valid, true);
  assert.equal(stub.object.publishable, false);
  assert.equal(stub.object.endWU, 10);

  const camera = createAboutNarrativeCameraKeyAtWU({ model, atWU: 2, cameraKey: { position: [1, 2, 3], fov: 52 } });
  assert.equal(camera.valid, true);
  assert.equal(camera.object.atWU, 2);
  assert.deepEqual(camera.object.position, [1, 2, 3]);
  assert.equal('rotation' in camera.object, false, 'Camera Move does not duplicate Camera Look.');
  assert.equal('distanceFogStartWU' in camera.object, false);

  const cameraTilt = createAboutNarrativeCameraOrientationKeyAtWU({
    model,
    atWU: 4,
    cameraOrientationKey: { rotation: [-30, 0, 0] },
  });
  assert.equal(cameraTilt.valid, true);
  assert.equal(cameraTilt.object.atWU, 4);
  assert.deepEqual(cameraTilt.object.rotation, [-30, 0, 0]);

  const genericCameraTilt = createAboutNarrativeTrackObjectAtWU({
    model,
    track: 'camera-orientation',
    atWU: 7,
    cameraOrientationKey: { rotation: [-75, 0, 0] },
  });
  assert.equal(genericCameraTilt.valid, true);
  assert.equal(genericCameraTilt.object.atWU, 7);

  const visibility = createAboutNarrativeVisibilityKeyAtWU({
    model,
    atWU: 2.5,
    visibilityKey: { visibility: 0.25, easing: 'ease-in-out' },
  });
  assert.equal(visibility.valid, true);
  assert.deepEqual(
    [visibility.object.atWU, visibility.object.visibility, visibility.object.easing, visibility.object.locked],
    [2.5, 0.25, 'ease-in-out', false],
  );

  const world = createAboutNarrativeWorldAtWU({ model, atWU: 7.5 });
  assert.equal(world.valid, true);
  assert.equal(world.object.startWU, 7.5);
  assert.equal(world.object.anchorWU, 7.5);
  assert.equal(world.object.shapeId, 'field-v1', 'The active World is the safe creation template.');

  const interaction = createAboutNarrativeInteractionAtWU({ model, atWU: 9, interactionType: 'spin' });
  assert.equal(interaction.valid, true);
  assert.equal(interaction.object.activationWU, 9);
  assert.equal(interaction.object.targetWorldId, 'world-three');

  const generic = createAboutNarrativeTrackObjectAtWU({ model, track: 'text', kind: 'stub', atWU: 7 });
  assert.equal(generic.valid, true);
  assert.equal(generic.object.kind, 'stub');
});

test('delete and duplicate validate the complete graph and preserve unrelated tracks', () => {
  const model = createFixture();
  const worldBytes = bytes(model.tracks.worlds);
  const removed = deleteAboutNarrativeTrackObjects({ model, selection: { type: 'text-field', id: 'text-placeholder' } });
  assert.equal(removed.valid, true);
  assert.equal(getAboutNarrativeTrackObject(removed.model, { type: 'text-field', id: 'text-placeholder' }), null);
  assert.equal(bytes(removed.model.tracks.worlds), worldBytes);
  const boundaryRemoved = deleteAboutNarrativeTrackObjects({
    model,
    selection: { type: 'camera-key', id: 'camera-start' },
  });
  assert.equal(boundaryRemoved.valid, true);
  assert.equal(getAboutNarrativeTrackObject(boundaryRemoved.model, {
    type: 'camera-key',
    id: 'camera-start',
  }), null);
  const lastCameraKey = structuredClone(canonical);
  lastCameraKey.tracks.camera.moveKeys = [lastCameraKey.tracks.camera.moveKeys[0]];
  const lastCameraKeyDelete = deleteAboutNarrativeTrackObjects({
    model: lastCameraKey,
    selection: { type: 'camera-key', id: lastCameraKey.tracks.camera.moveKeys[0].id },
  });
  assert.equal(lastCameraKeyDelete.valid, false);
  assert.equal(lastCameraKeyDelete.code, 'camera-count');
  assert.equal(deleteAboutNarrativeTrackObjects({ model, selection: { type: 'world', id: 'world-two' } }).valid, false, 'Targeted Worlds cannot be removed silently.');

  const duplicate = duplicateAboutNarrativeTrackObjects({
    model,
    selection: { type: 'text-field', id: 'text-intro' },
    offsetWU: 0.4,
  });
  assert.equal(duplicate.valid, false);
  assert.equal(duplicate.code, 'text-sequence-order');

  const visibilityDuplicate = duplicateAboutNarrativeTrackObjects({
    model,
    selection: { type: 'visibility-key', id: 'visibility-middle' },
    offsetWU: 0.25,
  });
  assert.equal(visibilityDuplicate.valid, true);
  assert.equal(visibilityDuplicate.objects[0].atWU, 5.25);
  assert.equal(visibilityDuplicate.objects[0].locked, false);
  const visibilityRemoved = deleteAboutNarrativeTrackObjects({
    model: visibilityDuplicate.model,
    selection: { type: 'visibility-key', id: visibilityDuplicate.objects[0].id },
  });
  assert.equal(visibilityRemoved.valid, true);
  assert.equal(deleteAboutNarrativeTrackObjects({
    model,
    selection: { type: 'visibility-key', id: 'visibility-start' },
  }).valid, false);
});

test('generic clipboard validates strict envelopes, pastes by absolute WU, and remaps internal Text references', () => {
  const model = createFixture();
  const selection = {
    type: 'text-field',
    id: 'text-intro',
    members: [
      { type: 'text-field', id: 'text-intro' },
      { type: 'text-field', id: 'text-follow' },
    ],
  };
  const payload = createAboutNarrativeTrackClipboardPayload({ model, selection });
  assert.equal(payload.kind, 'about-narrative-track-objects');
  assert.equal(payload.track, 'text');
  assert.equal(validateAboutNarrativeTrackClipboardPayload(payload).valid, true);
  assert.equal(validateAboutNarrativeTrackClipboardPayload({ ...payload, extra: true }).valid, false);
  assert.equal(validateAboutNarrativeTrackClipboardPayload({ ...payload, version: 99 }).valid, false);
  assert.equal(validateAboutNarrativeTrackClipboardPayload({
    ...payload,
    items: payload.items.map((item) => ({ ...item, offsetWU: -1 })),
  }).valid, false);

  const pasted = pasteAboutNarrativeTrackClipboardPayload({ model, payload, atWU: 7 });
  assert.equal(pasted.valid, true);
  assert.deepEqual(pasted.objects.map((object) => object.startWU), [7, 8.2]);
  assert.equal(pasted.objects[1].anchor, pasted.objects[0].id);
  assert.equal(bytes(pasted.model.tracks.camera), bytes(model.tracks.camera));
  assert.equal(bytes(pasted.model.tracks.worlds), bytes(model.tracks.worlds));
  assert.equal(bytes(pasted.model.tracks.interactions), bytes(model.tracks.interactions));
});

test('loop audition derives ranges for every global object type and same-track multi-selection', () => {
  const model = createFixture();
  assert.deepEqual(deriveAboutNarrativeTrackLoopRange({
    model,
    selection: { type: 'text-field', id: 'text-intro' },
    preRollWU: 0.1,
    postRollWU: 0.2,
  }), {
    valid: true, startWU: 0.9, endWU: 2.2, sourceType: 'text-field', sourceId: 'text-intro',
  });
  const camera = deriveAboutNarrativeTrackLoopRange({ model, selection: { type: 'camera-key', id: 'camera-middle' } });
  assert.deepEqual([camera.startWU, camera.endWU], [2.75, 3.25]);
  const cameraTilt = deriveAboutNarrativeTrackLoopRange({
    model,
    selection: { type: 'camera-orientation-key', id: 'camera-tilt-middle' },
  });
  assert.deepEqual([cameraTilt.startWU, cameraTilt.endWU], [4.75, 5.25]);
  const visibility = deriveAboutNarrativeTrackLoopRange({ model, selection: { type: 'visibility-key', id: 'visibility-middle' } });
  assert.deepEqual([visibility.startWU, visibility.endWU], [4.75, 5.25]);
  const world = deriveAboutNarrativeTrackLoopRange({ model, selection: { type: 'world', id: 'world-two' } });
  assert.deepEqual([world.startWU, world.endWU], [4, 8]);
  const interaction = deriveAboutNarrativeTrackLoopRange({ model, selection: { type: 'interaction', id: 'interaction-spin' } });
  assert.deepEqual([interaction.startWU, interaction.endWU], [4.5, 7]);
  const textGroup = deriveAboutNarrativeTrackLoopRange({
    model,
    selection: {
      type: 'text-field', id: 'text-intro',
      members: [{ type: 'text-field', id: 'text-intro' }, { type: 'text-field', id: 'text-follow' }],
    },
  });
  assert.deepEqual([textGroup.startWU, textGroup.endWU], [1, 2.8]);
});
