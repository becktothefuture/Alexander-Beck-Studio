import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import * as Three from '../react-app/app/node_modules/three/build/three.module.js';
import {
  resolveAboutBlenderSceneContract,
  validateAboutBlenderSceneBundle,
} from '../react-app/app/src/routes/about-narrative-lab/aboutBlenderSceneContract.js';
import {
  ABOUT_NARRATIVE_JOURNEY_ROLES,
  createAboutNarrativeJourneySample,
  sampleAboutNarrativeJourneyMapInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeJourneyMap.js';
import { resolveResponsiveVerticalFovFromHorizontalFov } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraProjection.js';
import {
  createAboutNarrativeCameraPointerPanController,
  createAboutNarrativeCameraPointerPanSample,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraPointerPan.js';
import {
  createAboutNarrativeCameraSteadycamController,
  createAboutNarrativeCameraSteadycamSample,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCameraSteadycam.js';
import { writeAboutSceneLook } from '../react-app/app/src/routes/about-narrative-lab/aboutSceneLook.js';
import { aboutSurfelIntersectsRect, decodeAboutSurfelNormal, resolveAboutSurfelRadiusPx } from '../react-app/app/src/routes/about-narrative-lab/aboutSurfelProjection.js';
import { compileAboutNarrativeComposerPlan } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeComposer.js';
import { loadAboutNarrativePointFieldPersistenceSource } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';

const source = await readFile(new URL(
  '../react-app/app/src/routes/about-narrative-lab/aboutBlenderPointScene.js', import.meta.url,
), 'utf8');
// Exercise the complete runtime through its public Interface. Only browser I/O,
// WebGL submission and imported dependencies are supplied to this local harness.
// This follows the existing check-geometry-fault-contract new Function pattern;
// production gains no test-only exports and requires no experimental VM flags.
const runtimeBody = source.replace(/^import[\s\S]*?;\n/gm, '')
  .replace('export function createBlenderPointScene', 'function createBlenderPointScene')
  .replaceAll('import.meta.env.DEV', 'false')
  .replaceAll('__CERTIFY__', 'false');
const canonical = JSON.parse(await readFile(new URL(
  '../react-app/app/public/config/contents-about.json', import.meta.url,
), 'utf8'));
const document = loadAboutNarrativePointFieldPersistenceSource(canonical).document;
const plan = compileAboutNarrativeComposerPlan(document, { inlineSize: 1440, blockSize: 900 });
assert.equal(plan.valid, true);
const frame = (overrides = {}) => ({
  storyWU: 0, durationWU: plan.durationWU, journeyMap: plan.journeyMap,
  globals: {}, world: {}, ambientTime: 0, reducedMotion: false, ...overrides,
});
const sha256 = (bytes) => createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
const encode = (value) => new TextEncoder().encode(JSON.stringify(value)).buffer;
const deferred = () => {
  let resolve;
  const promise = new Promise((complete) => { resolve = complete; });
  return { promise, resolve };
};

function bundleFixture({ missingCue = false } = {}) {
  const fixturePoints = [];
  const tanHalfFov = Math.tan(65 * Math.PI / 360);
  // Eight occupied bins: two rows, four columns, three points in every bin.
  for (const row of [4, 7]) {
    for (const column of [2, 4, 7, 9]) {
      for (let point = 0; point < 3; point += 1) {
        fixturePoints.push([
          ((column + 0.5) / 6 - 1) * 20 * tanHalfFov + point * 0.0001,
          ((row + 0.5) / 6 - 1) * 20 * tanHalfFov / (1440 / 900),
          -20,
        ]);
      }
    }
  }
  const modelBindings = [
    ['about.00', 'opening', 0, 'inciting-question', 0.6],
    ['about.01', 'inciting-question', -0.6, 'portal-entry', 0.6],
    ['about.02', 'portal-entry', -0.6, 'portal-exit', 0.6],
    ['about.03', 'portal-exit', -0.6, 'gate-entry', 0.75],
    ['about.04', 'gate-entry', -0.75, 'gate-exit', 0.8],
    ['about.05', 'gate-exit', -1.1, 'split-lattice-entry', -0.45],
    ['about.06', 'split-lattice-entry', -1.65, 'terminal-hold', 1],
  ];
  const points = modelBindings.flatMap(() => fixturePoints);
  const pointsPerModel = fixturePoints.length;
  const surfelBytes = new ArrayBuffer(points.length * 32);
  const view = new DataView(surfelBytes);
  points.forEach((position, index) => {
    position.forEach((value, axis) => view.setFloat32(index * 32 + axis * 4, value, true));
    view.setUint16(index * 32 + 16, 100, true);
    view.setUint16(index * 32 + 20, Math.floor(index / pointsPerModel), true);
    view.setUint32(index * 32 + 24, index, true);
    view.setUint8(index * 32 + 31, 1);
  });
  const cues = new Map();
  for (const role of ABOUT_NARRATIVE_JOURNEY_ROLES) {
    const name = role.requiredCueName || role.cueNames[0];
    if (missingCue && name === 'ABS_ROUND_PORTALS_CLEAR') continue;
    cues.set(name, { name, progress: role.fallbackProgress });
  }
  const cameraTrack = {
    schema: 'about-camera-track', version: 5, source: 'SYNTHETIC_LIFECYCLE_CAMERA',
    sampleCount: 2, samples: [[0, 0, 0, 0, 0, 0, 1], [0, 0, -100, 0, 0, 0, 1]],
    projection: { type: 'perspective', fovAxis: 'horizontal', horizontalFov: 65, portraitMaxVerticalFov: 115 },
    journeyCues: [...cues.values()],
  };
  const cameraTrackBytes = encode(cameraTrack);
  const count = points.length;
  const perObjectCounts = Object.fromEntries(modelBindings.map((_, index) => [
    `fixture.form.${index}`, pointsPerModel,
  ]));
  const perModelCounts = Object.fromEntries(modelBindings.map(([key]) => [key, pointsPerModel]));
  const profile = { surfelCount: count, perObjectCounts, perModelCounts };
  const models = modelBindings.map(([
    key, visibilityStartCue, visibilityStartOffsetWU,
    visibilityEndCue, visibilityEndOffsetWU,
  ], id) => ({
    id,
    key,
    objectKeys: [`fixture.form.${id}`],
    surfelRange: { offset: id * pointsPerModel, count: pointsPerModel },
    profileCounts: {
      mobile: pointsPerModel,
      desktop: pointsPerModel,
      master: pointsPerModel,
    },
    visibilityStartWU: id * 4,
    visibilityEndWU: id * 4 + 8,
    visibilityHandoffWU: 0.18,
    visibilityStartCue,
    visibilityStartOffsetWU,
    visibilityEndCue,
    visibilityEndOffsetWU,
  }));
  const meta = {
    schema: 'about-point-scene', version: 2,
    source: {
      sha256: 'c'.repeat(64),
      objects: modelBindings.map((_, index) => ({
        objectKey: `fixture.form.${index}`,
        role: 'narrative-lattice',
        surfelCount: pointsPerModel,
      })),
    },
    files: {
      cameraTrack: { file: 'camera-track.json', bytes: cameraTrackBytes.byteLength, sha256: sha256(cameraTrackBytes) },
      surfels: { file: 'surfels.bin', count, bytes: surfelBytes.byteLength, sha256: sha256(surfelBytes) },
    },
    profiles: { mobile: profile, desktop: profile, master: profile },
    models,
    pages: [], quantization: { radiusWU: { step: 0.0001 } },
  };
  return { meta, cameraTrackBytes, surfelBytes };
}

function createHarness(initialBundle = bundleFixture(), { hashWait, beforeFetch } = {}) {
  let bundle = initialBundle;
  let paletteListener;
  const stats = {
    fetches: [], hashes: 0, contracts: 0, draws: 0, clears: 0,
    worldReady: 0, editorialReady: 0, geometryDisposals: 0, materialDisposals: 0,
    rendererDisposals: 0, warnings: [], order: [], lastGeometry: null,
    visibleGeometries: [], sceneGeometries: [],
  };
  class Element extends EventTarget {
    dataset = {};
    getBoundingClientRect() { return { left: 0, top: 0, width: 1440, height: 900 }; }
  }
  class Canvas extends Element {}
  class Geometry extends Three.InstancedBufferGeometry {
    constructor() {
      super();
      this.addEventListener('dispose', () => { stats.geometryDisposals += 1; });
    }
  }
  class Material extends Three.ShaderMaterial {
    constructor(options) {
      super(options);
      this.addEventListener('dispose', () => { stats.materialDisposals += 1; });
    }
  }
  class Renderer {
    info = { render: { calls: 0 } };
    setClearColor() {}
    setPixelRatio() {}
    setSize() {}
    clear() { stats.clears += 1; }
    render(scene, camera) {
      stats.draws += 1;
      stats.order.push('draw');
      const meshes = scene.children[0].children;
      const visibleMeshes = meshes.filter((mesh) => mesh.visible && mesh.geometry.instanceCount > 0);
      this.info.render.calls = visibleMeshes.length;
      assert.equal(meshes.length, 14, 'Retry must leave exactly two stable meshes per model.');
      stats.sceneGeometries = [...new Set(meshes.map((mesh) => mesh.geometry))];
      stats.visibleGeometries = [...new Set(visibleMeshes.map((mesh) => mesh.geometry))];
      stats.lastGeometry = visibleMeshes[0]?.geometry || null;
      stats.lastUniforms = visibleMeshes[0]?.material.uniforms || meshes[0].material.uniforms;
      camera.updateMatrixWorld();
    }
    dispose() { stats.rendererDisposals += 1; }
  }
  const root = new Element();
  root.dataset.aboutEntranceState = 'complete';
  const canvas = new Canvas();
  const window = new EventTarget();
  window.devicePixelRatio = 1;
  window.matchMedia = () => ({ matches: true });
  root.addEventListener('about:world-runtime-ready', () => {
    stats.worldReady += 1;
    stats.order.push('world-ready');
  });
  window.addEventListener('abs:about-scene-ready', () => { stats.editorialReady += 1; });
  const palette = { paletteId: 'fixture', colors: ['#777777'] };
  const dependencies = {
    THREE: { ...Three, WebGLRenderer: Renderer, InstancedBufferGeometry: Geometry, ShaderMaterial: Material },
    resolveResponsiveVerticalFovFromHorizontalFov,
    createAboutNarrativeCameraPointerPanController,
    createAboutNarrativeCameraPointerPanSample,
    createAboutNarrativeCameraSteadycamController,
    createAboutNarrativeCameraSteadycamSample,
    createAboutNarrativeJourneySample,
    sampleAboutNarrativeJourneyMapInto,
    writeAboutSceneLook,
    aboutSurfelIntersectsRect,
    decodeAboutSurfelNormal,
    resolveAboutSurfelRadiusPx,
    createAboutSurfelPaletteRoles: () => [0],
    getSimulationPaletteSnapshot: () => palette,
    subscribeSimulationPalette: (listener) => { paletteListener = listener; return () => { paletteListener = null; }; },
    resolveAboutBlenderSceneContract: (input) => {
      stats.contracts += 1;
      return resolveAboutBlenderSceneContract(input);
    },
    validateAboutBlenderSceneBundle: (input) => validateAboutBlenderSceneBundle({
      ...input,
      digestSha256: async (bytes) => {
        stats.hashes += 1;
        await hashWait?.(stats.hashes);
        return sha256(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
      },
    }),
    window,
    document: { hidden: false },
    HTMLElement: Element,
    HTMLCanvasElement: Canvas,
    ResizeObserver: class { observe() {} disconnect() {} },
    fetch: async (url, options) => {
      stats.fetches.push({ url, options });
      const selected = bundle;
      await beforeFetch?.(url, stats.fetches.length);
      if (options.signal.aborted) throw new DOMException('Aborted', 'AbortError');
      return {
        ok: true,
        json: async () => structuredClone(selected.meta),
        arrayBuffer: async () => (url.endsWith('camera-track.json')
          ? selected.cameraTrackBytes.slice(0) : selected.surfelBytes.slice(0)),
      };
    },
    CustomEvent,
    AbortController,
    performance,
    console: { warn: (...message) => stats.warnings.push(message) },
  };
  const createScene = new Function(...Object.keys(dependencies), `${runtimeBody}\nreturn createBlenderPointScene;`)(...Object.values(dependencies));
  const scene = createScene({ canvas, root });
  return {
    scene, root, canvas, stats,
    replaceBundle: (next) => { bundle = next; },
    notifyPalette: () => paletteListener?.(palette),
    contextLost: () => canvas.dispatchEvent(new Event('webglcontextlost', { cancelable: true })),
    contextRestored: () => canvas.dispatchEvent(new Event('webglcontextrestored')),
  };
}

test('data-first startup stays pending until a valid frame, then announces after drawing', async (t) => {
  const h = createHarness();
  t.after(() => h.scene.destroy());
  await h.scene.preparePlan({});
  assert.equal(h.scene.getMetrics().bundleIntegrityVerified, true);
  assert.equal(h.scene.getMetrics().state, 'loading');
  assert.equal(h.scene.getMetrics().sceneContractStatus, 'pending');
  assert.equal(h.stats.draws, 0);
  assert.equal(h.root.dataset.aboutSceneReady, undefined);
  assert.equal(h.scene.render(frame()), true);
  assert.equal(h.scene.getMetrics().state, 'ready');
  assert.deepEqual(h.stats.order, ['draw', 'world-ready']);
  assert.equal(h.stats.hashes, 2);
  assert.equal(h.stats.contracts, 1);
  assert.equal(h.root.dataset.sceneContractStatus, 'compatible');
});

test('frame-first startup caches the frame without waiting for readiness', async (t) => {
  const h = createHarness();
  t.after(() => h.scene.destroy());
  assert.equal(h.scene.render(frame()), false);
  await h.scene.preparePlan({});
  assert.equal(h.stats.draws, 1);
  assert.equal(h.stats.worldReady, 1);
  assert.equal(h.scene.getMetrics().sceneContractStatus, 'compatible');
});

test('reduced-motion cuts hold camera, visibility and fog between authored poses', async (t) => {
  const h = createHarness();
  t.after(() => h.scene.destroy());
  h.scene.render(frame({ reducedMotion: true }));
  await h.scene.preparePlan({});
  const contract = resolveAboutBlenderSceneContract({
    meta: bundleFixture().meta,
    cameraTrack: JSON.parse(new TextDecoder().decode(bundleFixture().cameraTrackBytes)),
    storyMap: plan.journeyMap,
  });
  const cues = [...new Set(contract.journeyMap.anchors.map((anchor) => anchor.cameraStoryWU))];
  for (let index = 0; index < cues.length - 1; index += 1) {
    const start = cues[index], end = cues[index + 1];
    let before;
    for (const fraction of [0.2, 0.8]) {
      h.scene.render(frame({ reducedMotion: true, storyWU: start + (end - start) * fraction }));
      const metrics = h.scene.getMetrics();
      const sample = { camera: metrics.cameraPosition, clock: h.stats.lastUniforms.uStoryWU.value,
        visibility: metrics.modelFraming['about.00'].stageVisibility,
        fog: [h.stats.lastUniforms.uFogStartWU.value, h.stats.lastUniforms.uFogEndWU.value] };
      assert.equal(h.stats.lastUniforms.uReducedMotion.value, 1);
      assert.equal(h.stats.lastUniforms.uMotionAmountWU.value, 0);
      assert.ok([0, 1].includes(sample.visibility));
      if (before) assert.deepEqual(sample, before);
      before = sample;
    }
  }
  h.scene.render(frame({ storyWU: cues[1] * 0.5 }));
  assert.equal(h.stats.lastUniforms.uReducedMotion.value, 0);
  assert.equal(h.stats.lastUniforms.uStoryWU.value, cues[1] * 0.5);
});

test('repeated pending and invalid frames never draw, rehash or repeat fallback events', async (t) => {
  const h = createHarness(bundleFixture({ missingCue: true }));
  t.after(() => h.scene.destroy());
  h.scene.render(frame({ journeyMap: null }));
  await h.scene.preparePlan({});
  for (let index = 0; index < 4; index += 1) assert.equal(h.scene.render(frame({ journeyMap: null })), false);
  assert.equal(h.scene.getMetrics().sceneContractStatus, 'pending');
  assert.equal(h.stats.contracts, 1);
  assert.equal(h.scene.render(frame()), false);
  const rejected = h.scene.getMetrics();
  assert.equal(rejected.state, 'unavailable');
  assert.equal(rejected.bundleIntegrityVerified, true);
  assert.equal(rejected.sceneContractStatus, 'incompatible');
  assert.ok(rejected.sceneContractDiagnostics.some((item) => item.code === 'scene-journey-incompatible'));
  for (let index = 0; index < 8; index += 1) assert.equal(h.scene.render(frame()), false);
  h.notifyPalette();
  h.scene.setEntranceScale(1);
  h.scene.setVisible(true);
  await h.scene.preparePlan({});
  assert.equal(h.stats.contracts, 2);
  assert.equal(h.stats.hashes, 2);
  assert.equal(h.stats.fetches.length, 3);
  assert.equal(h.stats.draws, 0);
  assert.equal(h.stats.clears, 1);
  assert.equal(h.stats.worldReady, 0);
  assert.equal(h.stats.editorialReady, 1);
  assert.equal(h.root.dataset.aboutSceneReady, 'true');
  assert.equal(h.root.dataset.pointAsset, undefined);
});

test('omitted and null story maps share one pending identity', async (t) => {
  const h = createHarness();
  t.after(() => h.scene.destroy());
  h.scene.render(frame({ journeyMap: undefined }));
  await h.scene.preparePlan({});
  for (let index = 0; index < 8; index += 1) {
    assert.equal(h.scene.render(frame({ journeyMap: index % 2 ? null : undefined })), false);
  }
  assert.equal(h.scene.getMetrics().sceneContractStatus, 'pending');
  assert.equal(h.stats.contracts, 1);
  assert.equal(h.stats.draws, 0);
  assert.equal(h.stats.hashes, 2);
});

test('supplied malformed story maps reject instead of being treated as absent', async (t) => {
  for (const journeyMap of [false, 0, '']) {
    const h = createHarness();
    t.after(() => h.scene.destroy());
    h.scene.render(frame({ journeyMap }));
    await h.scene.preparePlan({});
    const metrics = h.scene.getMetrics();
    assert.equal(metrics.sceneContractStatus, 'incompatible');
    assert.equal(metrics.state, 'unavailable');
    assert.ok(metrics.sceneContractDiagnostics.some((item) => item.code === 'scene-story-map-invalid'));
    assert.equal(h.scene.render(frame({ journeyMap })), false);
    assert.equal(h.stats.contracts, 1);
    assert.equal(h.stats.draws, 0);
  }
});

test('a changed incompatible map clears the old frame once and a corrected map can recover', async (t) => {
  const h = createHarness();
  t.after(() => h.scene.destroy());
  h.scene.render(frame());
  await h.scene.preparePlan({});
  const invalidMap = structuredClone(plan.journeyMap);
  invalidMap.anchors = invalidMap.anchors.filter((anchor) => anchor.id !== 'terminal-hold');
  assert.equal(h.scene.render(frame({ journeyMap: invalidMap })), false);
  assert.equal(h.scene.getMetrics().state, 'unavailable');
  assert.deepEqual(h.scene.getMetrics().modelFraming, {});
  for (let index = 0; index < 4; index += 1) h.scene.render(frame({ journeyMap: invalidMap }));
  assert.equal(h.stats.clears, 1);
  assert.equal(h.stats.draws, 1);
  assert.equal(h.scene.render(frame()), true);
  assert.equal(h.scene.getMetrics().state, 'ready');
  assert.equal(h.stats.contracts, 3);
  assert.equal(h.stats.hashes, 2);
  assert.equal(h.scene.getMetrics().gpuBufferBuilds, 1);
  assert.deepEqual(h.stats.order, ['draw', 'world-ready', 'draw', 'world-ready']);
});

test('map identity changes revalidate once without hashing or rebuilding geometry', async (t) => {
  const h = createHarness();
  t.after(() => h.scene.destroy());
  h.scene.render(frame());
  await h.scene.preparePlan({});
  const geometry = h.stats.lastGeometry;
  const attribute = geometry.getAttribute('iVisibilityEndWU');
  const version = attribute.version;
  for (let index = 0; index < 10; index += 1) h.scene.render(frame({ storyWU: index / 100 }));
  assert.equal(attribute.version, version);
  const nextMap = structuredClone(plan.journeyMap);
  nextMap.anchors.find((anchor) => anchor.id === 'terminal-hold').storyWU += 1;
  nextMap.durationWU += 1;
  h.scene.render(frame({ journeyMap: nextMap }));
  assert.equal(h.stats.contracts, 2);
  assert.equal(h.stats.hashes, 2);
  assert.equal(attribute.version, version + 1);
  assert.equal(h.stats.lastGeometry, geometry);
  assert.equal(h.stats.worldReady, 1);
});

test('explicit retry replaces a rejected decoded bundle and disposes its resources', async (t) => {
  const h = createHarness(bundleFixture({ missingCue: true }));
  t.after(() => h.scene.destroy());
  h.scene.render(frame());
  await h.scene.preparePlan({});
  h.replaceBundle(bundleFixture());
  await h.scene.retryPreparation();
  assert.equal(h.scene.getMetrics().state, 'ready');
  assert.equal(h.scene.getMetrics().sceneContractStatus, 'compatible');
  assert.equal(h.stats.fetches.length, 6);
  assert.equal(h.stats.hashes, 4);
  assert.equal(h.stats.geometryDisposals, 7);
  assert.equal(h.stats.materialDisposals, 2);
  assert.equal(h.stats.worldReady, 1);
  assert.ok(h.stats.fetches.every(({ options }) => options.cache === 'no-cache'));
});

test('an old load finally cannot clear a retry started by a rejection subscriber', async (t) => {
  const retryGate = deferred();
  const h = createHarness(bundleFixture({ missingCue: true }), {
    beforeFetch: async (url, count) => { if (count === 4) await retryGate.promise; },
  });
  t.after(() => h.scene.destroy());
  let retry;
  let retried = false;
  h.scene.subscribeDiagnostics(() => {
    if (h.scene.getMetrics().state !== 'unavailable' || retried) return;
    retried = true;
    h.replaceBundle(bundleFixture());
    retry = h.scene.retryPreparation();
  });
  h.scene.render(frame());
  await h.scene.preparePlan({});
  assert.equal(h.scene.preparePlan({}), retry);
  retryGate.resolve();
  await retry;
  assert.equal(h.scene.getMetrics().state, 'ready');
  assert.equal(h.stats.fetches.length, 6);
});

test('mismatched bytes never install geometry or claim bundle integrity', async (t) => {
  const bundle = bundleFixture();
  new Uint8Array(bundle.surfelBytes)[0] ^= 1;
  const h = createHarness(bundle);
  t.after(() => h.scene.destroy());
  h.scene.render(frame());
  await h.scene.preparePlan({});
  const metrics = h.scene.getMetrics();
  assert.equal(metrics.state, 'unavailable');
  assert.equal(metrics.bundleIntegrityVerified, false);
  assert.equal(metrics.gpuBufferBuilds, 0);
  assert.ok(metrics.sceneContractDiagnostics.some((item) => item.code === 'scene-file-hash-mismatch'));
  assert.equal(h.stats.worldReady, 0);
  assert.equal(h.stats.editorialReady, 1);
});

test('disposal during non-abortable hashing prevents late installation and events', async () => {
  const entered = deferred();
  const finishHash = deferred();
  const h = createHarness(bundleFixture(), {
    hashWait: async () => { entered.resolve(); await finishHash.promise; },
  });
  h.scene.render(frame());
  const loading = h.scene.preparePlan({});
  await entered.promise;
  h.scene.destroy();
  finishHash.resolve();
  await loading;
  assert.equal(h.scene.getMetrics().gpuBufferBuilds, 0);
  assert.equal(h.stats.draws, 0);
  assert.equal(h.stats.worldReady, 0);
  assert.equal(h.stats.editorialReady, 0);
  assert.equal(h.stats.rendererDisposals, 1);
  assert.equal(h.root.dataset.pointWorldState, undefined);
  assert.equal(h.root.dataset.sceneContractStatus, undefined);
});

test('context restoration cannot promote an incompatible scene', async (t) => {
  const h = createHarness(bundleFixture({ missingCue: true }));
  t.after(() => h.scene.destroy());
  h.scene.render(frame());
  await h.scene.preparePlan({});
  h.contextLost();
  h.contextRestored();
  assert.equal(h.scene.getMetrics().state, 'unavailable');
  assert.equal(h.scene.getMetrics().sceneContractStatus, 'incompatible');
  assert.equal(h.stats.draws, 0);
  assert.equal(h.stats.worldReady, 0);
  assert.equal(h.stats.editorialReady, 1);
  assert.equal(h.root.dataset.aboutSceneReady, 'true');
});

test('valid context restoration announces readiness only after a new draw', async (t) => {
  const h = createHarness();
  t.after(() => h.scene.destroy());
  h.scene.render(frame());
  await h.scene.preparePlan({});
  h.contextLost();
  assert.equal(h.scene.getMetrics().state, 'context-lost');
  assert.equal(h.scene.render(frame()), false);
  h.contextRestored();
  assert.equal(h.scene.getMetrics().state, 'ready');
  assert.deepEqual(h.stats.order, ['draw', 'world-ready', 'draw', 'world-ready']);
  assert.equal(h.stats.hashes, 2);
  assert.equal(h.stats.contracts, 1);
});

test('per-model typed-array views and attribute identities stay stable across frames', async (t) => {
  const h = createHarness();
  t.after(() => h.scene.destroy());
  h.scene.render(frame());
  await h.scene.preparePlan({});
  assert.equal(h.stats.sceneGeometries.length, 7);
  const geometries = [...h.stats.sceneGeometries];
  const attributes = geometries.map((geometry) => geometry.getAttribute('iPosition'));
  assert.ok(attributes.every((attribute) => attribute.array.buffer === attributes[0].array.buffer));
  assert.deepEqual(attributes.map((attribute) => attribute.array.byteOffset), [0, 288, 576, 864, 1152, 1440, 1728]);
  for (const storyWU of [0.4, 1.2, 2.8, 4.5, 7.5]) h.scene.render(frame({ storyWU }));
  assert.deepEqual(h.stats.sceneGeometries, geometries);
  assert.deepEqual(
    geometries.map((geometry) => geometry.getAttribute('iPosition')),
    attributes,
  );
  const metrics = h.scene.getMetrics();
  assert.equal(metrics.gpuBufferBuilds, 1);
  assert.equal(metrics.gpuBufferIdentityStable, true);
  assert.equal(metrics.fixedAttributeIdentityStable, true);
});

test('overlap-aware handoffs preserve population and retire inactive stages', async (t) => {
  const h = createHarness();
  t.after(() => h.scene.destroy());
  h.scene.render(frame());
  await h.scene.preparePlan({});
  const initialMetrics = h.scene.getMetrics();
  const windows = initialMetrics.resolvedVisibilityWindows;
  const counts = initialMetrics.perModelCounts;
  let checkedOverlapCount = 0;
  for (let index = 0; index < windows.length - 1; index += 1) {
    const current = windows[index];
    const next = windows[index + 1];
    const overlapStart = next.startWU;
    const overlapEnd = current.endWU;
    if (!(overlapEnd > overlapStart)) continue;
    checkedOverlapCount += 1;
    assert.ok(Math.abs(current.exitHandoffWU - (overlapEnd - overlapStart) * 0.5) <= 1e-9);
    assert.ok(Math.abs(next.entranceHandoffWU - (overlapEnd - overlapStart) * 0.5) <= 1e-9);
    for (const fraction of [0.25, 0.5, 0.75]) {
      const storyWU = overlapStart + (overlapEnd - overlapStart) * fraction;
      h.scene.render(frame({ storyWU }));
      const motion = h.scene.getMotionSnapshot();
      assert.ok(
        motion.stageVisibilityByModel[`about.${String(index).padStart(2, '0')}`]
          + motion.stageVisibilityByModel[`about.${String(index + 1).padStart(2, '0')}`] >= 1,
        `Adjacent stage population collapsed at overlap ${index}.`,
      );
      const metrics = h.scene.getMetrics();
      const activeModelKeys = Object.entries(motion.stageVisibilityByModel)
        .filter(([, visibility]) => visibility > 0)
        .map(([key]) => key);
      const expectedActiveCount = activeModelKeys.reduce(
        (sum, key) => sum + counts[String(Number(key.split('.')[1]))],
        0,
      );
      assert.equal(metrics.activeSurfelCount, expectedActiveCount);
      assert.equal(metrics.drawCalls, activeModelKeys.length * 2);
      const hasFractionalStage = Object.values(motion.stageVisibilityByModel)
        .some((visibility) => visibility > 0 && visibility < 1);
      assert.equal(
        motion.stageRadiusCoupledToVisibility,
        hasFractionalStage,
        'Radius-coupling metric must follow fractional handoff state.',
      );
    }
  }
  assert.ok(checkedOverlapCount >= 6);
  const finalWindow = windows.at(-1);
  h.scene.render(frame({
    storyWU: finalWindow.startWU + Math.max(finalWindow.entranceHandoffWU, 0.01),
  }));
  assert.equal(h.stats.sceneGeometries[0].instanceCount, 0);
  assert.equal(h.stats.sceneGeometries[1].instanceCount, 0);
  assert.ok(h.stats.sceneGeometries.at(-1).instanceCount > 0);
  assert.equal(h.scene.getMetrics().gpuBufferBuilds, 1);
});

test('explicit framing diagnostics expose coherent grid spread, not just point totals', async (t) => {
  const h = createHarness();
  t.after(() => h.scene.destroy());
  // The opening stage now grows out of fog from zero instead of arriving as a
  // complete wall on the first frame. Sample after its authored handoff here;
  // this test owns framing spread, not entrance timing.
  h.scene.render(frame({ storyWU: 0.36 }));
  await h.scene.preparePlan({});
  const framing = h.scene.getMetrics().modelFraming['about.00'];
  assert.equal(framing.occupiedBinCount, 8);
  assert.equal(framing.occupiedRowCount, 2);
  assert.equal(framing.occupiedColumnCount, 4);
  assert.equal(framing.leftOccupiedColumnCount, 2);
  assert.equal(framing.rightOccupiedColumnCount, 2);
  assert.equal(framing.leftOccupiedBinCount, 4);
  assert.equal(framing.rightOccupiedBinCount, 4);
  assert.equal(h.stats.hashes, 2);
  assert.equal(h.stats.contracts, 1);
});
