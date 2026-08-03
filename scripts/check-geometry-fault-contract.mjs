#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';

const ROOT = process.cwd();

function readSource(relativePath) {
  return readFileSync(resolve(ROOT, relativePath), 'utf8');
}

function extractSource(source, start, end) {
  const startIndex = source.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing source marker: ${start}`);
  const endIndex = source.indexOf(end, startIndex);
  assert.notEqual(endIndex, -1, `Missing source marker: ${end}`);
  return source.slice(startIndex, endIndex + end.indexOf('}') + 1);
}

const stateSource = readSource('react-app/app/src/legacy/modules/core/state.js');
const rendererSource = readSource('react-app/app/src/legacy/modules/rendering/renderer.js');
const studioSurfaceSource = readSource('react-app/app/src/legacy/modules/ui/studio-surface-controls.js');
const siteShellSource = readSource('react-app/app/src/legacy/modules/visual/site-shell.js');

const detectResponsiveScaleSource = extractSource(
  stateSource,
  'function detectResponsiveScale() {',
  '\n}\n\n/**\n * Update ball sizes',
);
const bindLiveSimulationCanvasSource = extractSource(
  rendererSource,
  'function bindLiveSimulationCanvas() {',
  '\n}\n\nexport function setupRenderer',
);
const resizeSource = extractSource(
  rendererSource,
  'function resize() {',
  '\n}\n\nexport function getCanvas',
);
const syncStudioRuntimeStateSource = extractSource(
  studioSurfaceSource,
  'function syncStudioRuntimeState(config) {',
  '\n}\n\nexport function applyStudioSurfaceConfig',
);
const applyShellLayoutVarsSource = extractSource(
  siteShellSource,
  'function applyShellLayoutVars(config = currentShellConfig) {',
  '\n}\n\nfunction applyShellSurfaceVars',
);

function createResponsiveScaleHarness(initialState) {
  return new Function(
    'initialState',
    'navigator',
    'window',
    'document',
    'MODES',
    'updateBallSizes',
    'syncPitPortfolioRadiusStatsFromBalls',
    `
      const state = initialState;
      ${detectResponsiveScaleSource}
      return { detectResponsiveScale, state };
    `,
  )(
    initialState,
    { userAgent: '', maxTouchPoints: 0 },
    {
      innerWidth: 1200,
      matchMedia: () => ({ matches: false }),
      visualViewport: { width: 1200 },
    },
    { documentElement: { clientWidth: 1200 } },
    { PORTFOLIO_PIT: 'portfolio-pit', FLUBBER_BLOB: 'flubber' },
    () => {
      initialState.R_MED = 42;
    },
    () => {},
  );
}

function createCanvasBindingHarness({ liveCanvas, detectOptimalDPR }) {
  return new Function(
    'document',
    'acquireSimulation2dContext',
    'detectOptimalDPR',
    `
      let canvas = null;
      let ctx = null;
      let prevCanvasWidth = 320;
      let prevCanvasHeight = 180;
      ${bindLiveSimulationCanvasSource}
      return {
        bindLiveSimulationCanvas,
        snapshot: () => ({ canvas, ctx, prevCanvasWidth, prevCanvasHeight }),
      };
    `,
  )(
    { getElementById: (id) => id === 'c' ? liveCanvas : null },
    (candidate) => candidate.context,
    detectOptimalDPR,
  );
}

function createResizeHarness(failureStage) {
  let shouldFail = true;
  const calls = [];
  const styleValues = new Map();
  const rootStyle = {
    setProperty(name, value) {
      styleValues.set(name, value);
    },
  };
  const canvas = {
    width: 100,
    height: 50,
    style: { removeProperty() {} },
  };
  const container = {
    clientWidth: 200,
    clientHeight: 100,
    getBoundingClientRect: () => ({ width: 200, height: 100 }),
  };
  const globals = {
    balls: [],
    container,
    currentMode: 'pit',
  };
  const failAt = (stage) => {
    calls.push(stage);
    if (shouldFail && failureStage === stage) throw new Error(`fixture:${stage}`);
  };

  const harness = new Function(
    'canvasFixture',
    'containerFixture',
    'globalsFixture',
    'rootStyle',
    'window',
    'document',
    'MODES',
    'applyLayoutFromVwToPx',
    'applyLayoutCSSVars',
    'detectResponsiveScale',
    'detectOptimalDPR',
    `
      let canvas = canvasFixture;
      let ctx = { imageSmoothingEnabled: true };
      let effectiveDPR = 1;
      let prevCanvasWidth = 0;
      let prevCanvasHeight = 0;
      let forceRenderCallback = null;
      const bindLiveSimulationCanvas = () => true;
      const getGlobals = () => globalsFixture;
      const syncSimulationCollisionBounds = () => {};
      const getPortfolioBodyRadiusForResize = () => null;
      const syncPitPortfolioRadiusStatsFromBalls = () => {};
      const applyCanvasShadow = () => {};
      ${resizeSource}
      return {
        resize,
        snapshot: () => ({
          width: canvas.width,
          height: canvas.height,
          prevCanvasWidth,
          prevCanvasHeight,
        }),
      };
    `,
  )(
    canvas,
    container,
    globals,
    rootStyle,
    {
      innerWidth: 200,
      innerHeight: 100,
      visualViewport: null,
    },
    {
      documentElement: { style: rootStyle },
      getElementById: (id) => id === 'simulations' ? container : null,
    },
    { PORTFOLIO_PIT: 'portfolio-pit' },
    () => failAt('layout-from-vw'),
    () => failAt('layout-css-vars'),
    () => failAt('responsive-scale'),
    () => failAt('dpr'),
  );

  return {
    ...harness,
    calls,
    retry() {
      shouldFail = false;
      harness.resize();
    },
  };
}

function createStudioRuntimeHarness(globals) {
  let shouldFail = true;
  let applyCalls = 0;
  const harness = new Function(
    'getGlobals',
    'applyLayoutCSSVars',
    `
      ${syncStudioRuntimeStateSource}
      return { syncStudioRuntimeState };
    `,
  )(
    () => globals,
    () => {
      applyCalls += 1;
      if (shouldFail) throw new Error('fixture:studio-layout');
    },
  );
  return {
    ...harness,
    get applyCalls() { return applyCalls; },
    allowRetry() { shouldFail = false; },
  };
}

function createShellGeometryHarness() {
  let shouldFail = true;
  let layoutApplyCalls = 0;
  const styleValues = new Map();
  const rootStyle = {
    setProperty(name, value) { styleValues.set(name, value); },
    removeProperty(name) { styleValues.delete(name); },
  };
  const globals = {};
  const routeTransition = {
    exitDurationMs: 1,
    loaderEnterDurationMs: 2,
    spinnerDelayMs: 3,
    spinnerMinimumMs: 4,
    readinessTimeoutMs: 5,
    spinnerExitDurationMs: 6,
    plateExitDelayMs: 7,
    plateExitDurationMs: 8,
    surfaceEnterDurationMs: 9,
    typographyDelayMs: 10,
    typographyExitDurationMs: 11,
    typographyExitStaggerMs: 12,
    routeBookendDurationMs: 13,
    routeBookendOverlapPercent: 14,
    routeBookendLineDurationMs: 15,
    routeBookendTravelPercent: 16,
    contextDurationMs: 17,
    actionDurationMs: 18,
    supportDurationMs: 19,
    itemStepMs: 20,
    materialDurationMs: 21,
    materialStaggerMs: 22,
    materialDelayMs: 23,
    materialExitDurationMs: 24,
    materialExitStaggerMs: 25,
    cardTravelPx: 26,
    cardTiltDeg: 1.2,
  };
  const config = {
    layout: {
      contentInsetDesktop: '28px',
      contentInsetTablet: '22px',
      contentInsetMobile: '16px',
      decorativeScriptMaxWidth: '431px',
      decorativeScriptPaddingX: '0px',
      decorativeScriptPaddingY: '0px',
      quoteButtonSize: '224px',
      quotePaddingX: '28px',
      quotePaddingY: '24px',
      routeTitleDescriptionGap: '16px',
      edgeCaptionDistanceMin: '8px',
      edgeCaptionDistanceMax: '48px',
    },
    motion: {
      shellRevealMs: 180,
      contentRevealMs: 420,
      modalOverlayOpacity: 0,
      modalOverlayBlurPx: 13.2,
      modalOverlayMobileBlurPx: 24,
      modalOverlayTransitionMs: 700,
      modalOverlayTransitionOutMs: 500,
      modalOverlayContentDelayMs: 200,
      modalDepthScale: 0.943,
      modalDepthTranslateY: 1,
    },
    hero: {
      mobileNavBottomOffset: '20px',
      desktopLogoWidthVw: 52,
      desktopLogoMinPx: 340,
      desktopLogoMaxPx: 640,
      mobileLogoWidthVw: 64,
      mobileLogoMinPx: 220,
      mobileLogoMaxPx: 320,
    },
  };

  const harness = new Function(
    'document',
    'getGlobals',
    'getShellRouteTransitionConfig',
    'resolveFrameInsetEndpoints',
    'resolveFrameRadiusEndpoints',
    'buildResponsiveFrameInsetCss',
    'buildResponsiveFrameRadiusCss',
    'applyLayoutFromVwToPx',
    'applyLayoutCSSVars',
    'DEFAULT_SHELL_CONFIG',
    'currentShellConfig',
    `
      ${applyShellLayoutVarsSource}
      return { applyShellLayoutVars };
    `,
  )(
    { documentElement: { style: rootStyle } },
    () => globals,
    () => routeTransition,
    () => ({ mobile: 10, desktop: 16 }),
    () => ({ mobile: 32, desktop: 72 }),
    ({ mobile, desktop }) => `clamp(${mobile}px, 2vw, ${desktop}px)`,
    ({ mobile, desktop }) => `clamp(${mobile}px, 8vw, ${desktop}px)`,
    () => { layoutApplyCalls += 1; },
    () => {
      layoutApplyCalls += 1;
      if (shouldFail) throw new Error('fixture:shell-layout');
    },
    config,
    config,
  );

  return {
    ...harness,
    config,
    globals,
    styleValues,
    get layoutApplyCalls() { return layoutApplyCalls; },
    allowRetry() { shouldFail = false; },
  };
}

test('responsive ball resize exposes a body write failure and converges on retry', () => {
  let failBallWrite = true;
  let secondRadius = 30;
  const secondBall = { rBase: 30 };
  Object.defineProperty(secondBall, 'r', {
    configurable: true,
    get: () => secondRadius,
    set(value) {
      if (failBallWrite) throw new Error('fixture:ball-radius');
      secondRadius = value;
    },
  });
  const state = {
    R_MED: 30,
    balls: [{ r: 30, rBase: 30 }, secondBall],
    currentMode: 'pit',
    isMobile: false,
    isMobileViewport: false,
  };
  const harness = createResponsiveScaleHarness(state);

  assert.throws(() => harness.detectResponsiveScale(), /fixture:ball-radius/);
  failBallWrite = false;
  harness.detectResponsiveScale();
  assert.deepEqual(state.balls.map((ball) => [ball.r, ball.rBase]), [[42, 42], [42, 42]]);
});

test('renderer remount adopts a canvas only after DPR detection succeeds', () => {
  let shouldFail = true;
  let detectionCalls = 0;
  const liveCanvas = { context: { imageSmoothingEnabled: true } };
  const harness = createCanvasBindingHarness({
    liveCanvas,
    detectOptimalDPR() {
      detectionCalls += 1;
      if (shouldFail) throw new Error('fixture:remount-dpr');
    },
  });

  assert.throws(() => harness.bindLiveSimulationCanvas(), /fixture:remount-dpr/);
  assert.deepEqual(harness.snapshot(), {
    canvas: null,
    ctx: null,
    prevCanvasWidth: 320,
    prevCanvasHeight: 180,
  });
  shouldFail = false;
  assert.equal(harness.bindLiveSimulationCanvas(), true);
  assert.equal(harness.snapshot().canvas, liveCanvas);
  assert.equal(harness.snapshot().ctx, liveCanvas.context);
  assert.equal(detectionCalls, 2);
});

for (const failureStage of ['layout-css-vars', 'responsive-scale', 'dpr']) {
  test(`renderer resize exposes ${failureStage} failure before canvas commit and converges on retry`, () => {
    const harness = createResizeHarness(failureStage);
    assert.throws(() => harness.resize(), new RegExp(`fixture:${failureStage}`));
    assert.deepEqual(harness.snapshot(), {
      width: 100,
      height: 50,
      prevCanvasWidth: 0,
      prevCanvasHeight: 0,
    });
    harness.retry();
    assert.deepEqual(harness.snapshot(), {
      width: 200,
      height: 100,
      prevCanvasWidth: 200,
      prevCanvasHeight: 100,
    });
  });
}

test('studio runtime geometry failure remains visible and a retry restamps the same state', () => {
  const globals = { edgeCaptionDistanceMinPx: 1, edgeCaptionDistanceMaxPx: 2 };
  const harness = createStudioRuntimeHarness(globals);
  const config = { edgeCaptionDistanceMin: 8.4, edgeCaptionDistanceMax: 47.6 };

  assert.throws(() => harness.syncStudioRuntimeState(config), /fixture:studio-layout/);
  harness.allowRetry();
  harness.syncStudioRuntimeState(config);
  assert.deepEqual(globals, { edgeCaptionDistanceMinPx: 8, edgeCaptionDistanceMaxPx: 48 });
  assert.equal(harness.applyCalls, 2);
});

test('shell geometry failure remains visible and a retry completes all shell variables', () => {
  const harness = createShellGeometryHarness();
  assert.throws(() => harness.applyShellLayoutVars(harness.config), /fixture:shell-layout/);
  harness.allowRetry();
  harness.applyShellLayoutVars(harness.config);

  assert.deepEqual(harness.globals, {
    frameInsetMobilePx: 10,
    frameInsetDesktopPx: 16,
    frameRadiusMobilePx: 32,
    frameRadiusDesktopPx: 72,
  });
  assert.equal(harness.styleValues.get('--abs-frame-radius-desktop'), '72px');
  assert.equal(harness.styleValues.get('--abs-safe-bottom'), 'env(safe-area-inset-bottom, 0px)');
  assert.equal(harness.layoutApplyCalls, 4);
});
