#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  getProjectContentBlocks,
  resolvePortfolioLabelContent,
} from '../react-app/app/src/legacy/modules/portfolio/portfolio-content.js';
import {
  createNormalizedPortfolioRuntimeListener,
  normalizePortfolioConfig,
  normalizePortfolioRuntime,
} from '../react-app/app/src/legacy/modules/portfolio/portfolio-config.js';
import {
  createPortfolioAssetResolver,
  createPortfolioDataLoader,
  getPortfolioVideoMimeType,
  getProjectAccessMode,
  getProjectImageSrc,
  getProjectTags,
  getProjectVideoSrc,
} from '../react-app/app/src/legacy/modules/portfolio/portfolio-data.js';
import { PORTFOLIO_DOM_CONTRACT } from '../react-app/app/src/legacy/modules/portfolio/portfolio-dom-contract.js';
import { buildPortfolioCueColor } from '../react-app/app/src/legacy/modules/portfolio/project-drawer.js';
import {
  createPortfolioPrewarmCoordinator,
  createPortfolioThumbnailWarmer,
} from '../react-app/app/src/legacy/modules/portfolio/portfolio-prewarm.js';
import {
  isCanvasBackingStoreReady,
  readPortfolioPresentationSnapshot,
  rectHasUsableVisibleArea,
  rectIsUsable,
  waitForPitSimulationHostReady,
  waitForStablePortfolioPresentation,
} from '../react-app/app/src/legacy/modules/portfolio/portfolio-presentation-readiness.js';
import {
  assertPortfolioCleanupSnapshot,
  assertPortfolioDomContractSnapshot,
  assertPortfolioFocusSnapshot,
  assertPortfolioReadySnapshot,
} from './lib/portfolio-characterization-contract.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(await readFile(
  resolve(__dirname, 'fixtures', 'portfolio-hotspot-characterization.json'),
  'utf8',
));

test('Portfolio label normalization keeps authored precedence and safe fallbacks', () => {
  assert.deepEqual(resolvePortfolioLabelContent({
    client: 'Client',
    labelEyebrow: 'Label eyebrow',
    eyebrow: 'Eyebrow',
    title: 'Title',
    displayTitle: 'Display',
    bodyTitle: 'Body',
    shapeTitleLong: 'Long',
    shapeTitle: 'Shape',
  }), { eyebrow: 'Eyebrow', title: 'Shape' });
  assert.deepEqual(resolvePortfolioLabelContent({ title: '  ' }, 'Fallback'), {
    eyebrow: '',
    title: 'Fallback',
  });
  assert.deepEqual(resolvePortfolioLabelContent(null), {
    eyebrow: '',
    title: 'Untitled Project',
  });
  assert.deepEqual(getProjectContentBlocks({ contentBlocks: [{ type: 'text', body: 'Copy' }] }), [
    { type: 'text', body: 'Copy' },
  ]);
  assert.deepEqual(getProjectContentBlocks({ gallery: ['one.webp', 'two.webp'] }), [
    { type: 'image', src: 'one.webp' },
    { type: 'image', src: 'two.webp' },
  ]);
});

test('Portfolio data loading preserves fallback, cache, retry, abort, and asset resolution', async () => {
  const calls = [];
  const load = createPortfolioDataLoader({
    paths: ['/primary.json', '/fallback.json'],
    fetchImpl: async (path, options) => {
      calls.push({ path, options });
      if (path === '/primary.json') return { ok: false };
      return { ok: true, json: async () => ({ projects: [{ id: 'fallback' }] }) };
    },
  });
  assert.deepEqual(await load(), { projects: [{ id: 'fallback' }] });
  assert.deepEqual(await load(), { projects: [{ id: 'fallback' }] });
  assert.deepEqual(calls.map(({ path }) => path), ['/primary.json', '/fallback.json']);
  assert.ok(calls.every(({ options }) => options.cache === 'no-cache'));

  let attempts = 0;
  const retryingLoad = createPortfolioDataLoader({
    paths: ['/only.json'],
    fetchImpl: async () => {
      attempts += 1;
      if (attempts === 1) throw new Error('offline');
      return { ok: true, json: async () => ({ projects: [] }) };
    },
  });
  await assert.rejects(retryingLoad(), /No portfolio data found/);
  assert.deepEqual(await retryingLoad(), { projects: [] });
  assert.equal(attempts, 2);

  const abortController = new AbortController();
  abortController.abort();
  await assert.rejects(load(abortController.signal), { name: 'AbortError' });

  const resolveAsset = createPortfolioAssetResolver({
    basePath: '/studio/',
    assetBasePath: '/studio/images/portfolio/pages/',
    getCacheBust: () => 'build-7',
  });
  assert.equal(resolveAsset('cover.webp'), '/studio/images/portfolio/pages/cover.webp?v=build-7');
  assert.equal(resolveAsset('/images/shared.webp'), '/studio/images/shared.webp?v=build-7');
  assert.equal(resolveAsset('https://cdn.example/cover.webp'), 'https://cdn.example/cover.webp');
});

test('Portfolio thumbnail warming shares promises and evicts failed results', async () => {
  const instances = [];
  class FakeImage {
    constructor() {
      this.complete = false;
      this.naturalWidth = 0;
      instances.push(this);
    }

    set src(value) {
      this.currentSrc = value;
      queueMicrotask(() => {
        if (value.includes('fail')) {
          this.onerror?.();
          return;
        }
        this.naturalWidth = 320;
        this.onload?.();
      });
    }

    async decode() {}
  }
  const warm = createPortfolioThumbnailWarmer({
    ImageConstructor: FakeImage,
    setTimeoutImpl: () => 1,
    clearTimeoutImpl: () => {},
  });
  const first = warm('/shared.webp');
  assert.equal(warm('/shared.webp'), first);
  assert.deepEqual(await first, { src: '/shared.webp', ready: true });
  assert.equal(instances.length, 1);

  const failed = warm('/fail.webp');
  assert.deepEqual(await failed, { src: '/fail.webp', ready: false });
  const retried = warm('/fail.webp');
  assert.notEqual(retried, failed);
  assert.deepEqual(await retried, { src: '/fail.webp', ready: false });
  assert.equal(instances.length, 3);
});

test('Portfolio prewarm publishes prepared, shared-ready, and aborted states', async () => {
  const published = [];
  let clock = 10;
  let warmCalls = 0;
  let resolveWarm;
  const warmResult = new Promise((resolve) => { resolveWarm = resolve; });
  const coordinator = createPortfolioPrewarmCoordinator({
    loadData: async () => ({ projects: [{ image: 'one.webp' }] }),
    loadConfig: async () => ({ runtime: {} }),
    warmThumbnail: async (src) => {
      warmCalls += 1;
      await warmResult;
      return { src, ready: true };
    },
    resolveAsset: (src) => `/assets/${src}`,
    now: () => { clock += 1; return clock; },
    publish: (state) => published.push(state),
  });
  assert.equal(await coordinator.preload({ includeMedia: false }), true);
  assert.deepEqual(published.map(({ status }) => status), ['loading', 'prepared']);

  const first = coordinator.preload({ waitForMedia: true });
  const second = coordinator.preload({ waitForMedia: true });
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(warmCalls, 1);
  resolveWarm();
  assert.deepEqual(await Promise.all([first, second]), [true, true]);
  assert.equal(coordinator.getState().status, 'ready');
  assert.equal(coordinator.getState().criticalSourceCount, 1);
  assert.equal(coordinator.getState().readySourceCount, 1);

  const abortController = new AbortController();
  abortController.abort();
  assert.equal(await coordinator.preload({ signal: abortController.signal }), false);
  assert.equal(coordinator.getState().status, 'failed');
});

test('Portfolio project data normalization preserves content and access fallbacks', () => {
  const project = {
    access: 'public',
    image: 'cover.webp',
    thumbnailVideo: 'preview.webm',
    tags: ['One', 'Two', 'Three', 'Ignored'],
  };
  assert.equal(getProjectAccessMode(project), 'public');
  assert.equal(getProjectAccessMode({ access: 'private' }), 'protected');
  assert.equal(getProjectAccessMode(null), 'protected');
  assert.equal(getProjectImageSrc(project), 'cover.webp');
  assert.equal(getProjectVideoSrc(project), 'preview.webm');
  assert.deepEqual(getProjectTags(project), ['One', 'Two', 'Three']);
  assert.equal(getPortfolioVideoMimeType('preview.webm?v=1'), 'video/webm');
  assert.equal(getPortfolioVideoMimeType('preview.mp4#clip'), 'video/mp4');
  assert.equal(getPortfolioVideoMimeType('preview.mov'), '');
});

test('Portfolio publishes the stable selector and state-marker contract for CSS ownership work', () => {
  assert.ok(Object.isFrozen(PORTFOLIO_DOM_CONTRACT));
  assert.ok(Object.values(PORTFOLIO_DOM_CONTRACT).every(Object.isFrozen));
  const selectors = Object.values(PORTFOLIO_DOM_CONTRACT)
    .flatMap((group) => Object.values(group));
  assert.ok(selectors.every((value) => typeof value === 'string' && value.length > 0));
});

test('Portfolio mount skips unchanged palette work and omits permanently hidden card tags', async () => {
  const source = await readFile(resolve(
    __dirname,
    '../react-app/app/src/legacy/modules/portfolio/app.js',
  ), 'utf8');
  assert.match(source, /cardPaletteGeneration = renderedPaletteGeneration/);
  assert.match(source, /paletteGeneration === this\.cardPaletteGeneration/);
  assert.match(source, /this\.applyProjectPalette\(\{ force: true \}\)/);
  assert.doesNotMatch(source, /createElement\('ul'\)[\s\S]{0,160}portfolio-project-card__tags/);
});

test('Portfolio drawer cue colours remain valid HSL values', () => {
  assert.equal(
    buildPortfolioCueColor({ r: 255, g: 0, b: 0 }, '#000000'),
    'hsl(0deg 84% 58%)',
  );
  assert.equal(
    buildPortfolioCueColor({ r: 128, g: 128, b: 128 }, '#336699'),
    'hsl(210deg 56% 58%)',
  );
  assert.equal(buildPortfolioCueColor(null, 'invalid'), 'hsl(32deg 56% 72%)');
});

test('Portfolio presentation host wait recovers from 0×0 and cleans every watcher', async () => {
  const host = { clientWidth: 0, clientHeight: 0 };
  const documentRef = {
    getElementById: (id) => (id === 'simulations' ? host : null),
  };
  const observed = [];
  let resizeCallback = null;
  let intervalCallback = null;
  let timeoutCallback = null;
  const clearedIntervals = [];
  const clearedTimeouts = [];
  let disconnectCount = 0;

  class FakeResizeObserver {
    constructor(callback) {
      resizeCallback = callback;
    }

    observe(value) {
      observed.push(value);
    }

    disconnect() {
      disconnectCount += 1;
    }
  }

  const readyPromise = waitForPitSimulationHostReady({
    documentRef,
    windowRef: {},
    ResizeObserverClass: FakeResizeObserver,
    setIntervalImpl: (callback) => { intervalCallback = callback; return 41; },
    clearIntervalImpl: (id) => clearedIntervals.push(id),
    setTimeoutImpl: (callback) => { timeoutCallback = callback; return 42; },
    clearTimeoutImpl: (id) => clearedTimeouts.push(id),
  });

  assert.deepEqual(observed, [host]);
  assert.equal(typeof intervalCallback, 'function');
  assert.equal(typeof timeoutCallback, 'function');
  host.clientWidth = 96;
  host.clientHeight = 72;
  resizeCallback();

  assert.equal(await readyPromise, true);
  assert.equal(disconnectCount, 1);
  assert.deepEqual(clearedIntervals, [41]);
  assert.deepEqual(clearedTimeouts, [42]);

  intervalCallback();
  timeoutCallback();
  assert.equal(disconnectCount, 1, 'Late callbacks must not repeat cleanup.');
});

test('Portfolio presentation host wait settles false on timeout and still cleans up', async () => {
  const host = { clientWidth: 0, clientHeight: 0 };
  let timeoutCallback = null;
  let disconnectCount = 0;
  const cleared = [];

  class FakeResizeObserver {
    observe() {}
    disconnect() { disconnectCount += 1; }
  }

  const readyPromise = waitForPitSimulationHostReady({
    documentRef: { getElementById: () => host },
    windowRef: {},
    ResizeObserverClass: FakeResizeObserver,
    setIntervalImpl: () => 51,
    clearIntervalImpl: (id) => cleared.push(['interval', id]),
    setTimeoutImpl: (callback) => { timeoutCallback = callback; return 52; },
    clearTimeoutImpl: (id) => cleared.push(['timeout', id]),
  });

  timeoutCallback();
  assert.equal(await readyPromise, false);
  assert.equal(disconnectCount, 1);
  assert.deepEqual(cleared, [['interval', 51], ['timeout', 52]]);
});

test('Portfolio presentation canvas readiness preserves CSS and capped DPR thresholds', () => {
  const canvas = { clientWidth: 100, clientHeight: 80, width: 202, height: 162 };
  assert.equal(isCanvasBackingStoreReady(canvas, { devicePixelRatio: 2 }), true);
  assert.equal(isCanvasBackingStoreReady(canvas, { devicePixelRatio: 3 }), true);
  assert.equal(
    isCanvasBackingStoreReady({ ...canvas, width: 201 }, { devicePixelRatio: 2 }),
    false,
  );
  assert.equal(
    isCanvasBackingStoreReady({ ...canvas, clientWidth: 63 }, { devicePixelRatio: 1 }),
    false,
  );
});

test('Portfolio presentation snapshot selects nearest geometry and publishes readiness facts', () => {
  const rect = (left, top, width, height) => ({
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  });
  const wallRect = rect(0, 0, 1000, 600);
  const nearerRect = rect(120, 180, 500, 120);
  const fartherRect = rect(1200, 180, 500, 120);
  const makeElement = (elementRect, dataset = {}) => ({
    dataset,
    getBoundingClientRect: () => elementRect,
  });
  const nearerLabel = makeElement(nearerRect, { orbitOffset: '-0.25' });
  const fartherLabel = makeElement(fartherRect, { orbitOffset: '2' });
  const labelMount = {
    querySelector: () => null,
    querySelectorAll: (selector) => (
      selector.includes('data-ring-nearest')
        ? [fartherLabel, nearerLabel]
        : [fartherLabel, nearerLabel]
    ),
  };
  const elements = new Map([
    ['simulations', makeElement(wallRect)],
    ['hero-title', makeElement(rect(80, 40, 420, 80))],
    ['portfolioProjectMount', labelMount],
    ['c', { clientWidth: 100, clientHeight: 80, width: 100, height: 80 }],
  ]);
  const documentRef = {
    getElementById: (id) => elements.get(id) || null,
    querySelector: () => makeElement(rect(0, 0, 1000, 48)),
  };

  const snapshot = readPortfolioPresentationSnapshot({ documentRef, devicePixelRatio: 1 });
  assert.deepEqual(snapshot.firstLabelRect, nearerRect);
  assert.equal(snapshot.labelCount, 2);
  assert.equal(snapshot.canvasReady, true);
  assert.equal(snapshot.heroReady, true);
  assert.equal(snapshot.firstLabelReady, true);
  assert.equal(snapshot.topbarReady, true);
  assert.equal(snapshot.ready, true);
  assert.equal(rectIsUsable(rect(0, 0, 1, 1)), true);
  assert.equal(rectIsUsable(rect(0, 0, 0, 1)), false);
  assert.equal(rectHasUsableVisibleArea(nearerRect, wallRect), true);
  assert.equal(rectHasUsableVisibleArea(fartherRect, wallRect), false);
});

test('Portfolio presentation stability resets interrupted passes before publishing diagnostics', async () => {
  const frames = [];
  const windowRef = {};
  const snapshots = [
    { ready: true, marker: 1 },
    { ready: false, marker: 2 },
    { ready: true, marker: 3 },
    { ready: true, marker: 4 },
  ];
  const settled = waitForStablePortfolioPresentation({
    requiredReadyPasses: 2,
    readSnapshot: () => snapshots.shift(),
    requestAnimationFrameImpl: (callback) => frames.push(callback),
    now: () => 10,
    windowRef,
  });

  while (frames.length > 0) frames.shift()();

  assert.equal(await settled, true);
  assert.deepEqual(windowRef.__ABS_PORTFOLIO_PRESENTATION__, {
    ready: true,
    marker: 4,
    elapsedMs: 0,
    stablePasses: 2,
  });
});

test('Portfolio presentation timeout settles from the latest snapshot and publishes diagnostics', async () => {
  const frames = [];
  const windowRef = {};
  let clock = 0;
  const settled = waitForStablePortfolioPresentation({
    timeoutMs: 400,
    requiredReadyPasses: 2,
    readSnapshot: () => ({ ready: true, marker: 'latest' }),
    requestAnimationFrameImpl: (callback) => frames.push(callback),
    now: () => clock,
    windowRef,
  });

  clock = 400;
  frames.shift()();

  assert.equal(await settled, true);
  assert.deepEqual(windowRef.__ABS_PORTFOLIO_PRESENTATION__, {
    ready: true,
    marker: 'latest',
    elapsedMs: 400,
    stablePasses: 1,
  });
});

test('Portfolio config normalization deep-merges, clamps, and migrates legacy fields', () => {
  const normalized = normalizePortfolioConfig({
    cssVars: { '--portfolio-nav-top': '12px' },
    runtime: {
      carousel: {
        sliderYOffsetDvh: 99,
        introYOffsetDvh: -99,
        speedField: { maxOpacity: 0.4, densityScale: 1.5 },
      },
      labeling: { fontMaxPx: 32, fontMinPx: 18, lineHeight: 1.1 },
    },
  });
  assert.equal(normalized.cssVars['--portfolio-nav-top'], '12px');
  assert.equal(normalized.runtime.carousel.sliderYOffsetDvh, 12);
  assert.equal(normalized.runtime.carousel.introYOffsetDvh, -12);
  assert.equal(normalized.runtime.carousel.speedField, undefined);
  assert.equal(normalized.runtime.carousel.particleField.fastOpacity, 0.4);
  assert.equal(normalized.runtime.carousel.particleField.densityScale, 1.5);
  assert.equal(normalized.runtime.labeling.fontDesktopPx, 28);
  assert.equal(normalized.runtime.labeling.fontMobilePx, 20);
  assert.equal(normalized.runtime.labeling.titleLineHeight, 0.84);
  assert.equal(normalized.runtime.labeling.lineHeight, undefined);
  assert.ok(normalized.runtime.motion.openDurationMs > 0, 'Unspecified defaults must survive a partial override.');

  const runtime = normalizePortfolioRuntime({ carousel: { sliderYOffsetDvh: 99 } });
  assert.equal(runtime.carousel.sliderYOffsetDvh, 12);
  let receivedRuntime = null;
  createNormalizedPortfolioRuntimeListener((value) => { receivedRuntime = value; })({
    carousel: { introYOffsetDvh: -99 },
  });
  assert.equal(receivedRuntime.carousel.introYOffsetDvh, -12);
});

test('intentional Portfolio runtime contract breaks are rejected', () => {
  const ready = {
    path: '/portfolio.html',
    loadState: 'loaded',
    booting: false,
    loaded: true,
    transitionPhase: 'idle',
    auditAppReady: true,
    projectCount: 6,
    activeCardCount: 1,
    labelCount: 6,
    drawerCount: 1,
    drawerHidden: 'true',
    mountBusy: null,
    bootstrapStages: fixture.directReadinessStages,
  };
  assertPortfolioReadySnapshot(ready, fixture);
  assert.throws(
    () => assertPortfolioReadySnapshot({ ...ready, activeCardCount: 0 }, fixture),
    /one active card/,
  );

  const cleanup = {
    path: '/index.html',
    auditBridgePresent: false,
    previousAppDestroyed: true,
    loadState: null,
    portfolioPage: false,
    portfolioOpen: false,
    mountCount: 0,
    drawerCount: 0,
    documentIdentityStable: true,
  };
  assertPortfolioCleanupSnapshot(cleanup);
  assert.throws(
    () => assertPortfolioCleanupSnapshot({ ...cleanup, previousAppDestroyed: false }),
    /not destroyed/,
  );

  const focus = {
    drawerOpen: false,
    deckInert: false,
    focusedProjectIndex: 2,
    expectedProjectIndex: 2,
  };
  assertPortfolioFocusSnapshot(focus);
  assert.throws(
    () => assertPortfolioFocusSnapshot({ ...focus, focusedProjectIndex: 1 }),
    /Focus did not return/,
  );

  const domContract = {
    routeNodeCounts: {
      scene: 1,
      frame: 1,
      wall: 1,
      canvas: 1,
      title: 1,
      topbar: 1,
    },
    mountCount: 1,
    stageCount: 1,
    cardCount: 6,
    activeCardCount: 1,
    labelCount: 6,
    drawerHostCount: 1,
    drawerViewCount: 1,
    loadState: 'loaded',
    entrancePhase: 'complete',
    entranceReason: 'direct',
    mediaReady: 'true',
    activeProjectMarkersValid: true,
  };
  assertPortfolioDomContractSnapshot(domContract, 6);
  assert.throws(
    () => assertPortfolioDomContractSnapshot({
      ...domContract,
      routeNodeCounts: { ...domContract.routeNodeCounts, wall: 0 },
    }, 6),
    /route node wall must match exactly once/,
  );
  assert.throws(
    () => assertPortfolioDomContractSnapshot({
      ...domContract,
      routeNodeCounts: { ...domContract.routeNodeCounts, topbar: 2 },
    }, 6),
    /route node topbar must match exactly once/,
  );
});
