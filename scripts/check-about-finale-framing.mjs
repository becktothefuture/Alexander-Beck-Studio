import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import * as THREE from '../react-app/app/node_modules/three/build/three.module.js';
import { createAboutFinaleFraming } from '../react-app/app/src/routes/about-narrative-lab/aboutFinaleFraming.js';
import { resolveAboutSceneProjection, resolveResponsiveVerticalFovFromHorizontalFov } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraProjection.js';

const ASSETS = pathToFileURL(path.resolve(process.env.ABS_ABOUT_ASSET_DIR || 'react-app/app/public/models/about-v2-edited-world') + '/');
const [metadata, track, binary] = await Promise.all([
  readFile(new URL('meta.json', ASSETS), 'utf8').then(JSON.parse),
  readFile(new URL('camera-track.json', ASSETS), 'utf8').then(JSON.parse),
  readFile(new URL('surfels.bin', ASSETS)),
]);
const VIEWPORTS = [
  ['desktop', 1440, 900], ['desktop', 1280, 720], ['desktop', 834, 1112],
  ['mobile', 390, 844], ['mobile', 320, 568], ['mobile', 844, 390],
];

for (const [profile, width, height] of VIEWPORTS) {
  test(`${width}×${height}: every authored camera pose retains one responsive lens`, () => {
    const lens = resolveAboutSceneProjection(track.projection, width / height, width, height);
    const camera = new THREE.PerspectiveCamera(lens.verticalFov, width / height, 0.1, 600);
    camera.projectionMatrix.elements[9] += lens.verticalOffsetNdc;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    const projection = camera.projectionMatrix.clone();
    const framing = createAboutFinaleFraming();
    framing.configure(camera, track, metadata);
    // Exercise the whole sampled rail in both directions, including every
    // editorial checkpoint and the endpoint; no extra finale lens may appear.
    const samples = [...track.samples, ...track.samples.toReversed()];
    for (let index = 0; index < samples.length; index += 1) {
      const pose = samples[index];
      camera.position.fromArray(pose);
      camera.quaternion.fromArray(pose, 3).normalize();
      const position = camera.position.clone(), rotation = camera.quaternion.clone();
      assert.equal(framing.apply(camera, index / (samples.length - 1)), 1);
      assert.deepEqual(camera.projectionMatrix.elements, projection.elements);
      assert.deepEqual(camera.position, position);
      assert.deepEqual(camera.quaternion.toArray(), rotation.toArray());
    }
    const identity = camera.projectionMatrix.clone().multiply(camera.projectionMatrixInverse);
    assert.ok(identity.elements.every((value, index) => Math.abs(value - (index % 5 === 0 ? 1 : 0)) < 1e-9));
    assert.equal(framing.snapshot().mode, 'fixed-authored-lens');
    assert.equal(framing.snapshot().fitRevision, 1);
    assert.equal(framing.snapshot().scale, 1);
    assert.equal(framing.snapshot().offsetY, 0);
  });

  test(`${width}×${height}: enlarged invitation measurements cannot reframe or alter authored world points`, () => {
    const lens = resolveAboutSceneProjection(track.projection, width / height, width, height);
    const camera = new THREE.PerspectiveCamera(lens.verticalFov, width / height, 0.1, 600);
    camera.projectionMatrix.elements[9] += lens.verticalOffsetNdc;
    camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
    camera.position.fromArray(track.samples.at(-1));
    camera.quaternion.fromArray(track.samples.at(-1), 3).normalize();
    camera.updateMatrixWorld(true);
    const projection = camera.projectionMatrix.clone();
    const position = camera.position.clone(), rotation = camera.quaternion.clone();
    const model = metadata.source.worldType === 'connected-circle-world-v1'
      ? metadata.models.find(model => model.key === 'world.connected')
      : metadata.models.find(model => model.renderingProfile === 'scan');
    assert.ok(model, 'The final scene must retain its authored source geometry.');
    const count = model.profileCounts[profile];
    assert.ok(count > 0);
    const positions = new Float32Array(count * 3);
    for (let index = 0; index < count; index += 1) for (let axis = 0; axis < 3; axis += 1) {
      positions[index * 3 + axis] = binary.readFloatLE((model.surfelRange.offset + index) * 32 + axis * 4);
    }
    const sourcePositions = positions.slice();
    const modelRanges = []; modelRanges[model.id] = { start: 0, count };
    const framing = createAboutFinaleFraming();
    // Supply the former measured-sky API inputs deliberately. Even a copy
    // region covering most of the viewport cannot trigger a corrective zoom.
    for (const copyFraction of [0.3, 0.52, 0.9, 0.52]) {
      framing.configure(camera, track, metadata, { top: 0, height },
        { top: height * copyFraction, height: height * (1 - copyFraction) }, { positions, modelRanges });
      for (const progress of [0, 0.2, 0.5, 1, 0.5, 0]) {
        framing.apply(camera, progress);
        assert.deepEqual(camera.projectionMatrix.elements, projection.elements,
          'Text enlargement must use layout and authored sky rather than a camera correction.');
        assert.deepEqual(camera.position, position);
        assert.deepEqual(camera.quaternion.toArray(), rotation.toArray());
      }
    }
    assert.deepEqual(positions, sourcePositions, 'Authored points retain their source positions.');

    // Retain the previous scan consumer as an explicit fixture. Its positions
    // are synthetic test input; the canonical world no longer includes a city.
    const legacyScan = structuredClone(metadata);
    delete legacyScan.source.worldType;
    delete legacyScan.source.cinematicJourney;
    legacyScan.models = [{ ...model, key: 'about.06', renderingProfile: 'scan' }];
    framing.configure(camera, track, legacyScan, { top: 0, height },
      { top: height * 0.9, height: height * 0.1 }, { positions, modelRanges });
    for (const progress of [0, 0.5, 1, 0.5, 0]) {
      framing.apply(camera, progress);
      assert.deepEqual(camera.projectionMatrix.elements, projection.elements);
      assert.deepEqual(camera.position, position);
      assert.deepEqual(camera.quaternion.toArray(), rotation.toArray());
      assert.deepEqual(positions, sourcePositions, 'Legacy scan points retain their source positions.');
    }
  });
}

test('Short landscape shifts the sensor within its viewport bounds without changing focal scale', () => {
  const projection = {
    horizontalFov: 70, portraitMaxVerticalFov: 90,
    shortLandscape: { maxViewportWidth: 900, maxViewportHeight: 600, verticalOffsetNdc: 0.4 },
  };
  const lens = resolveAboutSceneProjection(projection, 824 / 292, 844, 390);
  assert.equal(lens.verticalOffsetNdc, 0.4);
  assert.equal(lens.verticalFov, resolveResponsiveVerticalFovFromHorizontalFov(70, 824 / 292, 90));
  assert.equal(resolveAboutSceneProjection(projection, 880 / 502, 900, 600).verticalOffsetNdc, 0.4);
  for (const [width, height] of [[901, 600], [900, 601], [600, 900], [1440, 1000]]) {
    assert.deepEqual(resolveAboutSceneProjection(projection, width / height, width, height), {
      verticalFov: resolveResponsiveVerticalFovFromHorizontalFov(70, width / height, 90), verticalOffsetNdc: 0,
    });
  }
  assert.deepEqual(resolveAboutSceneProjection(projection, 370 / 746, 390, 844), { verticalFov: 90, verticalOffsetNdc: 0 });
  const camera = new THREE.PerspectiveCamera(lens.verticalFov, 824 / 292, 0.1, 600);
  const scaleX = camera.projectionMatrix.elements[0], scaleY = camera.projectionMatrix.elements[5];
  camera.projectionMatrix.elements[9] += lens.verticalOffsetNdc;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  const axis = new THREE.Vector3(0, 0, -20).project(camera);
  assert.ok(Math.abs(axis.y + 0.4) < 1e-12, 'Positive sensor offset moves the image down20% of the canvas.');
  assert.equal(camera.projectionMatrix.elements[0], scaleX);
  assert.equal(camera.projectionMatrix.elements[5], scaleY);
  for (const invalid of [NaN, -1, 1]) {
    assert.throws(() => resolveAboutSceneProjection({ ...projection,
      shortLandscape: { ...projection.shortLandscape, verticalOffsetNdc: invalid },
    }, 2, 844, 390), RangeError);
  }
});
