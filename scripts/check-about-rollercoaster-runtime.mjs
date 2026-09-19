import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  ROLLERCOASTER_SCHEMA, ROLLERCOASTER_SOURCE_FILE,
  createRollercoasterCameraPose, loadRollercoasterBundle, resolveRollercoasterProgress,
  sampleRollercoasterCamera, validateRollercoasterBundle, validateRollercoasterCamera,
  validateRollercoasterMeta,
} from '../react-app/app/src/routes/about-rollercoaster/rollercoasterContract.js';
import {
  rollercoasterMotionPhase, sampleRollercoasterMotion,
} from '../react-app/app/src/routes/about-rollercoaster/rollercoasterMotion.js';

import {
  HOME_SIZE_REFERENCE_DEPTH_WU, resolveRollercoasterBodySize, sampleRollercoasterVisibility,
} from '../react-app/app/src/routes/about-rollercoaster/rollercoasterVisibility.js';
import { resolveHomeSimulationBodyRadius } from '../react-app/app/src/lib/homeSimulationSizing.js';
import {
  resolveRollercoasterProjection, resolveRollercoasterSamplingSpacing,
} from '../react-app/app/src/routes/about-rollercoaster/rollercoasterProjection.js';
import { mapRollercoasterTone } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterTone.js';

const digest = bytes => createHash('sha256').update(bytes).digest('hex');
const near = (actual, expected, epsilon = 1e-10) => assert.ok(Math.abs(actual - expected) < epsilon, `${actual} != ${expected}`);
const vectorNear = (actual, expected, epsilon) => actual.forEach((value, index) => near(value, expected[index], epsilon));
const clone = value => structuredClone(value);

test('one aspect-driven lens retains desktop framing and widens portrait capture to its reviewed cap', () => {
  const source = { horizontalFov: 70, portraitVerticalFov: 90 };
  for (const [width, height] of [[1412, 898], [1252, 618], [362, 742], [292, 466], [816, 288]]) {
    const lens = resolveRollercoasterProjection(source, width, height);
    const authoredVertical = 2 * Math.atan(Math.tan(35 * Math.PI / 180) / (width / height)) * 180 / Math.PI;
    near(lens.verticalFov, Math.min(105, authoredVertical));
    if (width >= height) near(lens.verticalFov, Math.min(90, authoredVertical));
    near(lens.focalLengthPx, height / (2 * Math.tan(lens.verticalFov * Math.PI / 360)));
    for (const portraitVerticalFov of [76, 80, 85, 90, 100, 105]) {
      const candidate = resolveRollercoasterProjection(source, width, height, { portraitVerticalFov });
      near(candidate.verticalFov, Math.min(portraitVerticalFov, authoredVertical));
      assert.equal(candidate.aspect, lens.aspect);
      assert.equal(Object.hasOwn(candidate, 'position'), false);
    }
  }
  const phone = resolveRollercoasterProjection(source, 362, 742);
  const previousPhone = resolveRollercoasterProjection(source, 362, 742, { portraitVerticalFov: 90 });
  near(phone.verticalFov, 105);
  assert.ok(phone.focalLengthPx < previousPhone.focalLengthPx,
    'The reviewed phone lens reveals more of the surrounding gate instead of cropping it further.');
  const widerSource = resolveRollercoasterProjection({ ...source, portraitVerticalFov: 120 }, 292, 742);
  assert.ok(widerSource.verticalFov > 105 && widerSource.verticalFov <= 120,
    'The browser portrait minimum does not narrow a wider source cap.');
  assert.deepEqual(source, { horizontalFov: 70, portraitVerticalFov: 90 });
  for (const [width, height] of [[0, 200], [200, 0], [NaN, 200], [200, Infinity]]) {
    assert.throws(() => resolveRollercoasterProjection(source, width, height), /positive viewport/);
  }
});

test('responsive pitch preserves Home pixel size and circle separation without a denser field', () => {
  const appearance = { homeSimulationBodyRadiusPx: 9.79, mobileSimulationBodyScale: 0.8 };
  const source = { horizontalFov: 70, portraitVerticalFov: 90 };
  for (const [width, height] of [[1412, 898], [1252, 618], [362, 742], [292, 466], [402, 830], [816, 288]]) {
    const lens = resolveRollercoasterProjection(source, width, height);
    const body = resolveRollercoasterBodySize(appearance, width, height, lens.focalLengthPx);
    const spacing = resolveRollercoasterSamplingSpacing(body.radiusWU, { currentSpacing: 0.23 });
    assert.ok(spacing >= 0.23);
    assert.ok(spacing > body.radiusWU * 2 * (5 / 3),
      'The clear gap remains at least two thirds of a circle diameter.');
    if (spacing > 0.23) assert.ok(spacing < body.radiusWU * 4,
      'The portrait field must retain a continuous circle lattice rather than become isolated dots.');
    near(body.radiusWU * lens.focalLengthPx / HOME_SIZE_REFERENCE_DEPTH_WU, body.radiusPx);
    assert.equal(resolveRollercoasterSamplingSpacing(body.radiusWU, { currentSpacing: spacing }), spacing);
  }
  assert.ok(resolveRollercoasterSamplingSpacing(0.08760424, { currentSpacing: 0.23 }) > 0.23,
    'The quieter global separation applies on desktop as well as phones.');
  assert.equal(resolveRollercoasterSamplingSpacing(0.04, { currentSpacing: 0.23 }), 0.23,
    'Large views never increase sampling density beyond the existing baseline.');
});

test('small responsive changes keep one sampling bucket and larger changes settle reversibly', () => {
  const radius = 0.168;
  const spacing = resolveRollercoasterSamplingSpacing(radius, { currentSpacing: 0.23 });
  for (let index = 0; index < 80; index += 1) {
    const jittered = radius * (1 + Math.sin(index) * 0.01);
    assert.equal(resolveRollercoasterSamplingSpacing(jittered, { currentSpacing: spacing }), spacing);
  }
  assert.equal(resolveRollercoasterSamplingSpacing(0.04, { currentSpacing: spacing }), 0.23);
  const wider = resolveRollercoasterSamplingSpacing(radius * 1.4, { currentSpacing: spacing });
  assert.ok(wider > spacing);
  assert.equal(resolveRollercoasterSamplingSpacing(radius, { currentSpacing: wider }), spacing);
  assert.throws(() => resolveRollercoasterSamplingSpacing(Infinity), /finite circle radius/);
});

test('resizing through sampling boundaries is monotonic and does not chatter after a bucket change', () => {
  for (const direction of [1, -1]) {
    let previous = resolveRollercoasterSamplingSpacing(direction > 0 ? 0.06 : 0.4);
    let changes = 0;
    for (let step = 1; step <= 340; step += 1) {
      const radius = direction > 0 ? 0.06 + step / 1000 : 0.4 - step / 1000;
      const spacing = resolveRollercoasterSamplingSpacing(radius, { currentSpacing: previous });
      assert.ok(direction > 0 ? spacing >= previous : spacing <= previous);
      if (spacing !== previous) {
        changes += 1;
        assert.ok(Math.max(spacing, previous) / Math.min(spacing, previous) > 1.09,
          'A resize must cross a meaningful pitch step before rebuilding the field.');
        for (const factor of [0.999, 1, 1.001]) {
          assert.equal(resolveRollercoasterSamplingSpacing(radius * factor, { currentSpacing: spacing }), spacing,
            'Minor viewport jitter after a bucket change must not rebuild again.');
        }
      }
      previous = spacing;
    }
    assert.ok(changes > 5 && changes < 30, 'The full viewport sweep uses a bounded number of field rebuilds.');
  }
});

test('global material exposure maintains primary prose contrast across both themes and fog coverage', async () => {
  const { runtime } = JSON.parse(await readFile(new URL('../react-app/app/public/config/design-system.json', import.meta.url), 'utf8'));
  const linear = value => value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  const srgb = value => value <= 0.0031308 ? value * 12.92 : 1.055 * value ** (1 / 2.4) - 0.055;
  const rgb = hex => [1, 3, 5].map(index => Number.parseInt(hex.slice(index, index + 2), 16) / 255);
  const luminance = color => color.reduce((sum, value, index) => sum + linear(value) * [0.2126, 0.7152, 0.0722][index], 0);
  for (const [darkMix, ink, background] of [
    [0, runtime.textColorLight, runtime.bgLight], [1, runtime.textColorDark, runtime.bgDark],
  ]) {
    const inkLuminance = luminance(rgb(ink)), ground = rgb(background);
    for (const r of [0, 0.1, 0.4, 0.75, 1]) for (const g of [0, 0.1, 0.4, 0.75, 1]) for (const b of [0, 0.1, 0.4, 0.75, 1]) {
      const material = mapRollercoasterTone([r, g, b], darkMix).map(srgb);
      for (const coverage of [0, 0.125, 0.25, 0.5, 0.75, 1]) {
        const resolved = material.map((channel, index) => channel * coverage + ground[index] * (1 - coverage));
        const sceneLuminance = luminance(resolved);
        const contrast = (Math.max(inkLuminance, sceneLuminance) + 0.05) / (Math.min(inkLuminance, sceneLuminance) + 0.05);
        assert.ok(contrast >= 4.5, `Primary ink contrast ${contrast.toFixed(3)} at theme ${darkMix}, RGB ${[r, g, b]}, coverage ${coverage}`);
      }
    }
  }
});

test('tonal exposure preserves hue relationships and continuous gradient order for every theme mix', () => {
  const hue = [0.8, 0.35, 0.1];
  const hueRatio = (hue[0] - hue[1]) / (hue[1] - hue[2]);
  for (const mix of [0, 0.2, 0.5, 0.8, 1]) {
    let previousLuminance = -1;
    for (let step = 0; step <= 100; step += 1) {
      const input = hue.map(channel => channel * step / 100);
      const output = mapRollercoasterTone(input, mix);
      assert.ok(output.every(channel => channel >= 0 && channel <= 1));
      const luminance = output[0] * 0.2126 + output[1] * 0.7152 + output[2] * 0.0722;
      assert.ok(luminance > previousLuminance, 'The material gradient retains smooth brightness ordering.');
      if (step > 0) near((output[0] - output[1]) / (output[1] - output[2]), hueRatio, 1e-8);
      previousLuminance = luminance;
    }
  }
  assert.throws(() => mapRollercoasterTone([0, NaN, 1]), /linear RGB/);
  assert.throws(() => mapRollercoasterTone([0, 0.5, 1], 2), /theme mix/);
});

function fixture() {
  const camera = { samples: [
    [0, 0, 2, 0, 0, 0, 0, 1],
    [0.25, 10, 2, 0, 0, Math.SQRT1_2, 0, Math.SQRT1_2],
    [1, 40, 2, 0, 0, 1, 0, 0],
  ] };
  const geometry = { objects: [0, 1, 2].map(index => ({
    id: `surface-${index}`, name: `Surface ${index}`, paletteRole: index === 2 ? 6 : index,
    motionGroup: index, positions: [0, 0, index, 2, 0, index, 2, 2, index, 0, 2, index], faces: [[0, 1, 2, 3]],
  })) };
  const geometryBytes = Buffer.from(JSON.stringify(geometry));
  const cameraBytes = Buffer.from(JSON.stringify(camera));
  const meta = {
    schema: ROLLERCOASTER_SCHEMA,
    source: { file: ROLLERCOASTER_SOURCE_FILE, sha256: 'a'.repeat(64) },
    camera: { file: 'camera.json', horizontalFov: 70, portraitVerticalFov: 90 },
    cameraSha256: digest(cameraBytes), geometry: { file: 'geometry.json', objectCount: 3, sha256: digest(geometryBytes) },
    beats: [
      { id: 'departure', start: 0, end: 0.1, kind: 'title', scrollScreens: 1 },
      { id: 'background', start: 0.1, end: 0.3, kind: 'prose', scrollScreens: 4 },
      { id: 'tunnel-a', start: 0.3, end: 0.8, kind: 'travel', scrollScreens: 6 },
      { id: 'release', start: 0.8, end: 0.97, kind: 'title', scrollScreens: 2 },
      { id: 'ending', start: 0.97, end: 1, kind: 'ending', scrollScreens: 1 },
    ],
    motionGroups: [
      { id: 0, kind: 'static' },
      { id: 1, kind: 'rotate', axis: [0, 1, 0], pivot: [2, 0, 0], amplitude: Math.PI / 2, period: 8, phase: 0, continuous: true },
      { id: 2, kind: 'wave', axis: [0, 0, 1], uAxis: [1, 0, 0], vAxis: [0, 1, 0], origin: [0, 0, 0],
        amplitude: 3, period: 8, wavelength: 4, phase: 0, quietRadius: 1, quietFeather: 2 },
    ],
  };
  return { meta, camera, geometry, geometryBytes, cameraBytes };
}

test('raw surface validation verifies both hashes without sampling or adding density', async () => {
  const source = fixture();
  const result = await validateRollercoasterBundle(source);
  assert.deepEqual(result.geometry, source.geometry);
  assert.equal(Object.hasOwn(result, 'points'), false);
  assert.equal(Object.hasOwn(result, 'field'), false);
  assert.deepEqual(result.camera, source.camera);
  assert.equal(result.meta.source.file, ROLLERCOASTER_SOURCE_FILE);
});

test('rejects the old point scene, wrong source, malformed lens and exported density', () => {
  for (const mutate of [
    meta => { meta.schema = 'about-point-scene'; },
    meta => { meta.source.file = 'source-assets/about-v2-blender-current/about-v2-track-working.blend'; },
    meta => { meta.source.sha256 = 'missing'; },
    meta => { meta.camera.file = '../camera.json'; },
    meta => { meta.camera.horizontalFov = 180; },
    meta => { meta.camera.portraitVerticalFov = NaN; },
    meta => { meta.circleField = { spacing: 0.23, radius: 0.075 }; },
    meta => { meta.points = { file: 'points.bin' }; },
    meta => { meta.pointObjects = []; },
    meta => { meta.geometry.file = '../geometry.json'; },
    meta => { meta.fog = { near: 20, far: 100 }; },
    meta => { meta.geometry.objectCount = 1.5; },
  ]) {
    const { meta } = fixture(); mutate(meta);
    assert.throws(() => validateRollercoasterMeta(meta), /About rollercoaster/);
  }
});

test('motion contract rejects missing IDs, unsupported transforms and non-unit/non-orthogonal bases', () => {
  for (const mutate of [
    meta => { meta.motionGroups = []; },
    meta => { meta.motionGroups = Array.from({ length: 33 }, (_, id) => ({ id, kind: 'static' })); },
    meta => { meta.motionGroups[1].id = 0; },
    meta => { meta.motionGroups[1].kind = 'fcurve'; },
    meta => { meta.motionGroups[1].axis = [0, 2, 0]; },
    meta => { meta.motionGroups[1].period = 0; },
    meta => { meta.motionGroups[1].phase = Infinity; },
    meta => { meta.motionGroups[1].clock = 'progress'; },
    meta => { meta.motionGroups[0].clock = null; },
    meta => { meta.motionGroups[1].continuous = 'true'; },
    meta => { meta.motionGroups[2].vAxis = [1, 0, 0]; },
    meta => { meta.motionGroups[2].axis = [1, 0, 0]; },
    meta => { meta.motionGroups[2].quietFeather = 0; },
    meta => { meta.motionGroups[2].wavelength = -1; },
  ]) {
    const { meta } = fixture(); mutate(meta);
    assert.throws(() => validateRollercoasterMeta(meta), /motion|rotation|wave/);
  }
});

test('surface motion supports ambient time and rejects an unsupported clock instead of ignoring it', () => {
  const { meta } = fixture();
  for (const group of meta.motionGroups) group.clock = 'ambient';
  assert.equal(validateRollercoasterMeta(meta), meta);
  meta.motionGroups[2].clock = 'scroll';
  assert.throws(() => validateRollercoasterMeta(meta), /unsupported motion clock/);
});

test('source beats cannot overlap, omit the ending or have duplicate IDs', () => {
  for (const mutate of [
    meta => { meta.beats[1].start = 0.09; },
    meta => { meta.beats[1].id = 'departure'; },
    meta => { meta.beats.at(-1).end = 0.99; },
    meta => { meta.beats.at(-1).kind = 'travel'; },
    meta => { meta.beats[2].scrollScreens = 0; },
  ]) {
    const { meta } = fixture(); mutate(meta);
    assert.throws(() => validateRollercoasterMeta(meta), /beat/);
  }
});

test('rejects mixed surface exports and tampering before geometry parsing or sampling', async () => {
  const f = fixture();
  await assert.rejects(validateRollercoasterBundle({ ...f, geometryBytes: f.geometryBytes.subarray(0, 24) }), /geometry hash mismatch/);
  const changed = Buffer.from(f.geometryBytes); changed[0] ^= 1;
  await assert.rejects(validateRollercoasterBundle({ ...f, geometryBytes: changed }), /geometry hash mismatch/);
  await assert.rejects(validateRollercoasterBundle({ ...f, cameraBytes: Buffer.from('{}') }), /camera hash mismatch/);
});

test('correctly hashed geometry rejects malformed coordinates, faces, material roles and motion groups', async () => {
  for (const mutate of [
    object => { object.positions[0] = null; },
    object => { object.faces[0][0] = 99; },
    object => { object.faces[0][0] = 1.5; },
    object => { object.paletteRole = 7; },
    object => { object.paletteRole = 1.5; },
    object => { object.motionGroup = 3; },
    object => { object.motionGroup = -1; },
  ]) {
    const f = fixture();
    mutate(f.geometry.objects[0]);
    f.geometryBytes = Buffer.from(JSON.stringify(f.geometry));
    f.meta.geometry.sha256 = digest(f.geometryBytes);
    await assert.rejects(validateRollercoasterBundle(f), /positions|face|palette|motion group/);
  }
});

test('camera contract rejects unordered samples, missing endpoints and non-unit quaternions', () => {
  for (const mutate of [
    camera => { camera.samples[1][0] = 0; },
    camera => { camera.samples[0][0] = 0.01; },
    camera => { camera.samples.at(-1)[0] = 0.99; },
    camera => { camera.samples[1][4] = 2; },
    camera => { camera.samples[1][1] = Infinity; },
  ]) {
    const { camera } = fixture(); mutate(camera);
    assert.throws(() => validateRollercoasterCamera(camera), /camera/);
  }
});

test('camera interpolates actual source progress and shortest quaternion arc without a history filter', () => {
  const { camera } = fixture();
  const target = createRollercoasterCameraPose();
  assert.equal(sampleRollercoasterCamera(camera, 0.125, target), target);
  vectorNear(target.position, [5, 2, 0]);
  vectorNear(target.quaternion, [0, Math.sin(Math.PI / 8), 0, Math.cos(Math.PI / 8)]);
  const snapshot = clone(target);
  sampleRollercoasterCamera(camera, 0.9, target);
  sampleRollercoasterCamera(camera, 0.125, target);
  assert.deepEqual(target, snapshot);
  for (let i = 4; i < 8; i += 1) camera.samples[1][i] *= -1;
  sampleRollercoasterCamera(camera, 0.125, target);
  vectorNear(target.quaternion, snapshot.quaternion);
  vectorNear(sampleRollercoasterCamera(camera, 1).position, [40, 2, 0]);
  vectorNear(sampleRollercoasterCamera(camera, -2).position, [0, 2, 0]);
});

test('reduced motion holds each reading/title start and the ending start', () => {
  const { meta } = fixture();
  assert.equal(resolveRollercoasterProgress(meta, 0.7), 0.7);
  assert.equal(resolveRollercoasterProgress(meta, 0.07, true), 0);
  assert.equal(resolveRollercoasterProgress(meta, 0.29, true), 0.1);
  assert.equal(resolveRollercoasterProgress(meta, 0.85, true), 0.8);
  assert.equal(resolveRollercoasterProgress(meta, 0.99, true), 0.97);
  assert.equal(resolveRollercoasterProgress(meta, 1, true), 0.97);
});

test('reduced long-tunnel travel holds its midpoint on entry, reverse and every in-beat scroll position', () => {
  const { meta, camera } = fixture();
  meta.beats = [
    { id: 'departure', start: 0, end: 0.16, kind: 'title', scrollScreens: 4 },
    { id: 'curiosity', start: 0.16, end: 0.2, kind: 'title', scrollScreens: 1 },
    { id: 'tunnel-a', start: 0.2, end: 0.4, kind: 'travel', scrollScreens: 6.4 },
    { id: 'release', start: 0.4, end: 0.97, kind: 'title', scrollScreens: 4 },
    { id: 'ending', start: 0.97, end: 1, kind: 'ending', scrollScreens: 1 },
  ];
  validateRollercoasterMeta(meta);
  const firstPose = sampleRollercoasterCamera(camera, resolveRollercoasterProgress(meta, 0.2, true));
  for (const progress of [0.2, 0.28, 0.39, 0.399999, 0.28, 0.2]) {
    const checkpoint = resolveRollercoasterProgress(meta, progress, true);
    near(checkpoint, 0.3);
    assert.deepEqual(sampleRollercoasterCamera(camera, checkpoint), firstPose);
    assert.equal(resolveRollercoasterProgress(meta, progress), progress);
  }
  assert.equal(resolveRollercoasterProgress(meta, 0.199999, true), 0.16);
  assert.equal(resolveRollercoasterProgress(meta, 0.4, true), 0.4);
});

test('continuous and bounded rotations respect source pivot and local axis', () => {
  const group = fixture().meta.motionGroups[1];
  vectorNear(sampleRollercoasterMotion([3, 0, 0], group, 2), [2, 0, -1]);
  const bounded = { ...group, continuous: false };
  vectorNear(sampleRollercoasterMotion([3, 0, 0], bounded, 2), [2, 0, -1]);
  vectorNear(sampleRollercoasterMotion([3, 0, 0], bounded, 6), [2, 0, 1]);
});

test('wave uses its authored U/V plane, quiet feather and displacement normal', () => {
  const wave = fixture().meta.motionGroups[2];
  vectorNear(sampleRollercoasterMotion([0.2, 0.1, 5], wave, 2), [0.2, 0.1, 5]);
  vectorNear(sampleRollercoasterMotion([2, 0, 0], wave, 2), [2, 0, -1.5]);
  const vertical = { ...wave, axis: [0, 1, 0], uAxis: [1, 0, 0], vAxis: [0, 0, 1], origin: [10, 0, 0] };
  vectorNear(sampleRollercoasterMotion([12, 0, 0], vertical, 2), [12, -1.5, 0]);
});

test('absolute motion is deterministic under reverse seeks, repeated holds and complete loops', () => {
  for (const group of fixture().meta.motionGroups) {
    const point = [4, 3, 2], target = [0, 0, 0];
    const expected = sampleRollercoasterMotion(point, group, 1.7);
    sampleRollercoasterMotion(point, group, 19, target);
    assert.equal(sampleRollercoasterMotion(point, group, 1.7, target), target);
    assert.deepEqual(target, expected);
    sampleRollercoasterMotion(point, group, 1.7, target);
    assert.deepEqual(target, expected);
    vectorNear(sampleRollercoasterMotion(point, group, 1.7 + (group.period || 0)), expected);
  }
  const rotate = fixture().meta.motionGroups[1];
  near(rollercoasterMotionPhase(rotate, 1_000_000_002), Math.PI / 2);
});

function fetchFixture(f, transform) {
  let metaReads = 0;
  const fetchImpl = async (url, options) => {
    assert.equal(options.cache, 'no-store');
    if (url.endsWith('/meta.json')) {
      metaReads += 1;
      return { ok: true, json: async () => clone(f.meta) };
    }
    const bytes = url.endsWith('/camera.json') ? f.cameraBytes : f.geometryBytes;
    return { ok: true, arrayBuffer: async () => transform ? transform(url, bytes, metaReads) : bytes };
  };
  return { fetchImpl, reads: () => metaReads };
}

test('viewport sampling resolves once from verified metadata before allocating the first field', async () => {
  const f = fixture();
  const fetcher = fetchFixture(f);
  let resolutions = 0;
  const loaded = await loadRollercoasterBundle({ assetRoot: '/new-world', fetchImpl: fetcher.fetchImpl,
    samplingSettings: meta => {
      resolutions += 1;
      assert.deepEqual(meta, f.meta);
      const lens = resolveRollercoasterProjection(meta.camera, 362, 742);
      const body = resolveRollercoasterBodySize({ homeSimulationBodyRadiusPx: 9.79, mobileSimulationBodyScale: 0.8 },
        362, 742, lens.focalLengthPx);
      return { spacing: resolveRollercoasterSamplingSpacing(body.radiusWU, { currentSpacing: 0.23 }) };
    },
  });
  assert.equal(resolutions, 1);
  assert.ok(loaded.field.spacing > 0.4);
  assert.deepEqual(loaded.geometry, f.geometry);
  const corrupt = fetchFixture(f, (url, bytes) => url.endsWith('/geometry.json') ? Buffer.alloc(bytes.length) : bytes);
  await assert.rejects(loadRollercoasterBundle({ assetRoot: '/new-world', fetchImpl: corrupt.fetchImpl, retryDelayMs: 0,
    samplingSettings: () => { throw new Error('Must not sample an unverified bundle'); },
  }), /geometry hash mismatch/);
});

test('atomic export race retries the whole manifest and both files, then returns one consistent bundle', async () => {
  const f = fixture();
  const fetcher = fetchFixture(f, (url, bytes, attempt) => url.endsWith('/geometry.json') && attempt === 1 ? bytes.subarray(0, 24) : bytes);
  const loaded = await loadRollercoasterBundle({ assetRoot: '/new-world', fetchImpl: fetcher.fetchImpl, retryDelayMs: 0 });
  assert.equal(loaded.loadAttempts, 2);
  assert.equal(fetcher.reads(), 2);
  assert.equal(loaded.points.length, loaded.field.count * 6);
  assert.ok(loaded.field.count > 0);
  assert.deepEqual(loaded.geometry, f.geometry);
});

test('persistent corruption stops after three attempts and never falls back to old assets', async () => {
  const f = fixture();
  const fetcher = fetchFixture(f, (url, bytes) => url.endsWith('/geometry.json') ? Buffer.alloc(bytes.length) : bytes);
  await assert.rejects(loadRollercoasterBundle({ assetRoot: '/new-world', fetchImpl: fetcher.fetchImpl, retryDelayMs: 0 }), /geometry hash mismatch/);
  assert.equal(fetcher.reads(), 3);
});

test('cancellation interrupts the retry wait and prevents stale scene setup', async () => {
  const controller = new AbortController();
  let reads = 0;
  const pending = loadRollercoasterBundle({ assetRoot: '/new-world', signal: controller.signal,
    fetchImpl: async () => { reads += 1; return { ok: false, status: 503 }; }, retryDelayMs: 500 });
  await new Promise(resolve => setTimeout(resolve, 0));
  controller.abort();
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(reads, 1);
});

test('a failed parallel request cancels its sibling before another export attempt', async () => {
  const f = fixture();
  let attempts = 0, siblingCancelled = false;
  const fetchImpl = async (url, { signal }) => {
    if (url.endsWith('/meta.json')) {
      attempts += 1;
      if (attempts > 1) assert.equal(siblingCancelled, true);
      return { ok: true, json: async () => clone(f.meta) };
    }
    if (attempts === 1 && url.endsWith('/camera.json')) return {
      ok: true, arrayBuffer: () => new Promise((resolve, reject) => {
        signal.addEventListener('abort', () => { siblingCancelled = true; reject(signal.reason); }, { once: true });
      }),
    };
    if (attempts === 1) return { ok: false, status: 503 };
    return { ok: true, arrayBuffer: async () => url.endsWith('/camera.json') ? f.cameraBytes : f.geometryBytes };
  };
  const bundle = await loadRollercoasterBundle({ assetRoot: '/new-world', fetchImpl, retryDelayMs: 0 });
  assert.equal(bundle.loadAttempts, 2);
  assert.equal(siblingCancelled, true);
});

test('a network failure while reading the response body retries the complete export', async () => {
  const f = fixture();
  const fetcher = fetchFixture(f, (url, bytes, attempt) => {
    if (attempt === 1 && url.endsWith('/camera.json')) throw new TypeError('Connection interrupted.');
    return bytes;
  });
  const bundle = await loadRollercoasterBundle({ assetRoot: '/new-world', fetchImpl: fetcher.fetchImpl, retryDelayMs: 0 });
  assert.equal(bundle.loadAttempts, 2);
});

test('expired metadata responses and bodies cannot start new fetches when transport ignores abort', async () => {
  for (const stage of ['response', 'body']) {
    const late = [], requested = [];
    const f = fixture();
    const fetchImpl = async url => {
      requested.push(url);
      assert.ok(url.endsWith('/meta.json'), 'An expired attempt must not start geometry or camera reads.');
      if (stage === 'response') return new Promise(resolve => late.push(() => resolve({ ok: true, json: async () => clone(f.meta) })));
      return { ok: true, json: () => new Promise(resolve => late.push(() => resolve(clone(f.meta)))) };
    };
    await assert.rejects(loadRollercoasterBundle({ assetRoot: '/new-world', fetchImpl, timeoutMs: 5, retryDelayMs: 0 }),
      { name: 'TimeoutError' });
    assert.equal(requested.length, 3);
    late.forEach(resolve => resolve());
    await new Promise(resolve => setTimeout(resolve, 0));
    assert.equal(requested.length, 3, `Late ${stage} results must stay retired.`);
  }
});

test('source metadata cannot reintroduce ordinary or ending visibility overrides', () => {
  for (const fog of [{ near: 6, far: 9 }, { near: 6, far: 9, finalWall: { near: 18, far: 48 } }]) {
    const { meta } = fixture(); meta.fog = fog;
    assert.throws(() => validateRollercoasterMeta(meta), /visibility is browser-owned/);
  }
  for (const key of ['fogNear', 'fogFar', 'finalFogNear', 'finalFogFar']) {
    for (const property of ['key', 'binding']) {
      const { meta } = fixture(); meta.controls = [{ [property]: key }];
      assert.throws(() => validateRollercoasterMeta(meta), /visibility is browser-owned/);
    }
  }
});

test('the renderer uses the same near and far visibility for all material and motion groups', async () => {
  const source = await readFile(new URL('../react-app/app/src/routes/about-rollercoaster/rollercoasterScene.js', import.meta.url), 'utf8');
  const fragment = source.split('const FRAGMENT_SHADER = `')[1].split('`;')[0];
  assert.match(fragment, /float visibility = corridorVisibility\(vDepth\);/);
  assert.match(fragment, /if \(visibility <= 0\.0\) discard;/,
    'Fully hidden circles cannot occlude visible geometry.');
  assert.doesNotMatch(fragment, /MotionGroup|FinalWall|finalGrid|progress|ambient/);
  assert.doesNotMatch(source, /meta\.fog|uFinalWallFog|uFinalWallMotionGroup/);
  assert.match(source, /canvas\.getContext\('webgl2', \{\s*alpha: false,/,
    'Coverage must resolve against the theme ground once, without another transparent-canvas fade.');
  assert.match(source, /new THREE\.WebGLRenderer\(\{ canvas, context, alpha: false,/,
    'The renderer must receive the explicit opaque context because Three otherwise requests alpha internally.');
  assert.match(source, /if \(!context\) throw new Error/,
    'A failed context creation must enter the readable story fallback.');
  assert.match(source, /renderer\.setClearColor\(uniforms\.uFogColor\.value, 1\)/);
  assert.match(source, /renderedBackground\.equals\(uniforms\.uFogColor\.value\)/,
    'Theme interpolation must invalidate a static reduced-motion frame.');
  assert.match(fragment, /applyRollercoasterTone\(material\.rgb, uToneDarkMix\)/,
    'The shared atlas uses one tonal response before coverage, without group or story branches.');
});

test('one visibility corridor fades both ends, remains clear between them and treats the ending identically', () => {
  const corridor = { nearHidden: .75, nearClear: 2.5, farClear: 16, farHidden: 32 };
  for (const depth of [-10, 0, .75, 32, 100]) assert.equal(sampleRollercoasterVisibility(depth, corridor), 0);
  for (const depth of [2.5, 8, 10.8, 12, 13.2, 16]) assert.equal(sampleRollercoasterVisibility(depth, corridor), 1);
  near(sampleRollercoasterVisibility(1.625, corridor), .5);
  near(sampleRollercoasterVisibility(24, corridor), .5);
  const shortened = { ...corridor, farClear: 4, farHidden: 8 };
  for (const wallDepth of [10.8, 12, 13.2]) assert.equal(sampleRollercoasterVisibility(wallDepth, shortened), 0);
});

test('Home size is exact at the reference plane on desktop and mobile, with perspective independent of fog or DPR', () => {
  const appearance = { homeSimulationBodyRadiusPx: 9.79, mobileSimulationBodyScale: .8 };
  for (const [width, height] of [[1440, 900], [390, 844], [844, 390]]) {
    const focal = width / (2 * Math.tan(35 * Math.PI / 180));
    const size = resolveRollercoasterBodySize(appearance, width, height, focal);
    const home = resolveHomeSimulationBodyRadius(appearance.homeSimulationBodyRadiusPx, appearance,
      { cssWidth: width, cssHeight: height });
    near(size.radiusWU * focal / HOME_SIZE_REFERENCE_DEPTH_WU, home);
    near(size.radiusWU * focal / (HOME_SIZE_REFERENCE_DEPTH_WU * 2), home / 2);
    for (const pixelRatio of [1, 2, 3]) {
      const again = resolveRollercoasterBodySize({ ...appearance, pixelRatio, farClear: 4, farHidden: 6 }, width, height, focal);
      assert.deepEqual(again, size);
    }
  }
});
