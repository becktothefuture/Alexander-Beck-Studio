#!/usr/bin/env node
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const ORIGIN = String(process.env.ABS_DEV_URL || 'http://localhost:8012').replace(/\/+$/, '');
const WAIT_MS = Math.max(5000, Number(process.env.ABS_ATMOSPHERE_WAIT_MS || 45000));
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const HEADED = process.env.ABS_HEADED === '1';
const ENFORCE_COST_BUDGET = process.env.ABS_ATMOSPHERE_ENFORCE_COST === '1';
const CAPTURE_RESPONSIVE = process.env.ABS_ATMOSPHERE_CAPTURE_RESPONSIVE === '1';
const RESPONSIVE_CAPTURE_ROOT = resolve('output', 'playwright', 'production-atmosphere-responsive');
const RESPONSIVE_REFERENCE_PX = 720;
const RESPONSIVE_MIN_SCALE = 0.72;
const RESPONSIVE_MAX_SCALE = 2.5;
const PHASE_FILTER = new Set(String(process.env.ABS_ATMOSPHERE_PHASES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean));
const DIRECT_SCENARIO_FILTER = new Set(String(process.env.ABS_ATMOSPHERE_DIRECT_SCENARIOS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean));
const SPA_SCENARIO_FILTER = new Set(String(process.env.ABS_ATMOSPHERE_SPA_SCENARIOS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean));
const browserType = BROWSER_NAME === 'webkit' ? webkit : chromium;
const RESPONSIVE_PROFILES = Object.freeze([
  Object.freeze({ id: 'desktop', width: 1440, height: 900, cadence: 30 }),
  Object.freeze({ id: 'tablet', width: 820, height: 1180, cadence: 30 }),
  Object.freeze({ id: 'mobile', width: 390, height: 844, cadence: 20 }),
  Object.freeze({ id: 'short-landscape', width: 844, height: 390, cadence: 20 }),
  Object.freeze({ id: 'desktop-return', width: 1440, height: 900, cadence: 30 }),
]);

if (!['chromium', 'webkit'].includes(BROWSER_NAME)) {
  throw new Error(`Unsupported ABS_BROWSER=${BROWSER_NAME}; use chromium or webkit.`);
}

const PRIMARY_SCENARIOS = Object.freeze([
  {
    id: 'home',
    path: '/index.html?mode=pit&absAudit=1',
    routeId: 'home',
    sourceIds: [/^home:legacy:\d+$/],
    sourceKinds: ['canvas'],
  },
  {
    id: 'portfolio',
    path: '/portfolio.html?absAudit=1',
    routeId: 'portfolio',
    sourceIds: ['portfolio:speed-field'],
    sourceKinds: ['canvas'],
  },
  {
    id: 'about',
    path: '/about.html?absAudit=1',
    routeId: 'about',
    sourceIds: ['about:narrative-world', 'about:ambient'],
    sourceKinds: ['canvas', 'ambient'],
  },
  {
    id: 'contact',
    path: '/contact.html?absAudit=1',
    routeId: 'contact',
    sourceIds: ['contact:ripple'],
    sourceKinds: ['canvas'],
  },
  {
    id: 'daily-repel-room',
    path: '/lab/repel-room.html?daily=1&absAudit=1',
    routeId: 'repel-room',
    sourceIds: ['daily:repel-room'],
    sourceKinds: ['canvas'],
  },
]);

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

function routeUrl(path) {
  return new URL(path, `${ORIGIN}/`).toString();
}

function sourceIdMatches(sourceId, accepted) {
  return accepted.some((candidate) => (
    candidate instanceof RegExp ? candidate.test(sourceId) : candidate === sourceId
  ));
}

async function installPortfolioAccess(context) {
  await context.addInitScript(() => {
    document.cookie = 'abs_portfolio_ok=1; Path=/; SameSite=Lax; Max-Age=31536000';
    sessionStorage.setItem('abs_portfolio_ok', 'production-atmosphere-audit');
  });
}

async function waitForSettledAtmosphere(page, scenario) {
  await page.waitForFunction(
    ({ expectedRouteId, acceptedIds, acceptedKinds }) => {
      const root = document.documentElement;
      const audit = window.__ABS_SIMULATION_ATMOSPHERE__;
      const snapshot = audit?.getSnapshot?.();
      if (!snapshot) return false;
      const bootOverlay = document.getElementById('abs-boot-overlay');
      const routeLoader = document.querySelector('.route-transition-loader');
      const isVisuallyHidden = (element) => {
        if (!element) return true;
        const style = getComputedStyle(element);
        return style.display === 'none'
          || style.visibility === 'hidden'
          || Number.parseFloat(style.opacity || '1') < 0.02;
      };
      const sourceMatches = acceptedIds.some((candidate) => (
        candidate.type === 'regexp'
          ? new RegExp(candidate.value).test(snapshot.activeSourceId)
          : candidate.value === snapshot.activeSourceId
      ));
      const statusReady = snapshot.status === 'ready'
        || (snapshot.status === 'failed-open' && Boolean(snapshot.failOpenReason));
      return (
        (root.dataset.absTransitionPhase || 'idle') === 'idle'
        && root.dataset.absBootState === 'ready'
        && root.classList.contains('entrance-complete')
        && isVisuallyHidden(bootOverlay)
        && isVisuallyHidden(routeLoader)
        && snapshot.scope === 'production'
        && snapshot.routeId === expectedRouteId
        && sourceMatches
        && acceptedKinds.includes(snapshot.sourceKind)
        && snapshot.compositorCount === 1
        && snapshot.activeSourceCount === 1
        && snapshot.glowCanvasCount === 1
        && snapshot.edgeCanvasCount === 1
        && statusReady
      );
    },
    {
      expectedRouteId: scenario.routeId,
      acceptedIds: scenario.sourceIds.map((candidate) => (
        candidate instanceof RegExp
          ? { type: 'regexp', value: candidate.source }
          : { type: 'literal', value: candidate }
      )),
      acceptedKinds: scenario.sourceKinds,
    },
    { timeout: WAIT_MS, polling: 'raf' },
  );
}

async function readAtmosphereState(page) {
  return page.evaluate(() => {
    const snapshot = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.() || null;
    const wall = document.getElementById('simulations');
    const wallRect = wall?.getBoundingClientRect() || null;
    const glow = document.getElementById('simulation-atmosphere-glow-canvas');
    const edge = document.getElementById('simulation-atmosphere-edge-light-canvas');
    const glowRect = glow?.getBoundingClientRect() || null;
    const edgeRect = edge?.getBoundingClientRect() || null;
    const edgeLayer = edge?.closest('.simulation-atmosphere-edge-light-layer') || null;
    const wallStyle = wall ? getComputedStyle(wall) : null;
    const edgeStyle = edge ? getComputedStyle(edge) : null;
    const edgeLayerStyle = edgeLayer ? getComputedStyle(edgeLayer) : null;
    const edgeLayerRect = edgeLayer?.getBoundingClientRect() || null;
    return {
      snapshot,
      pathname: location.pathname,
      bodyClass: document.body.className,
      editorialInView: document.querySelector('[data-route-content="about"]')?.dataset.editorialInView || '',
      wallRect: wallRect ? { width: wallRect.width, height: wallRect.height } : null,
      dom: {
        glowCount: document.querySelectorAll('#simulation-atmosphere-glow-canvas').length,
        edgeCount: document.querySelectorAll('#simulation-atmosphere-edge-light-canvas').length,
        glowHidden: glow?.hidden ?? null,
        edgeHidden: edge?.hidden ?? null,
        glowPointerEvents: glow ? getComputedStyle(glow).pointerEvents : '',
        edgePointerEvents: edge ? getComputedStyle(edge).pointerEvents : '',
        glowRect: glowRect ? { width: glowRect.width, height: glowRect.height } : null,
        edgeRect: edgeRect ? { width: edgeRect.width, height: edgeRect.height } : null,
        edgeLayerCount: document.querySelectorAll('.simulation-atmosphere-edge-light-layer').length,
        legacyEdgeContourCount: document.querySelectorAll('.atmosphere-edge-light-defs').length,
        wallRadius: wallStyle?.borderTopLeftRadius || '',
        wallCornerShape: wallStyle?.cornerTopLeftShape || wallStyle?.cornerShape || '',
        edgeLayerRadius: edgeLayerStyle?.borderTopLeftRadius || '',
        edgeLayerCornerShape: edgeLayerStyle?.cornerTopLeftShape || edgeLayerStyle?.cornerShape || '',
        edgeLayerMaskImage: edgeLayerStyle?.maskImage || edgeLayerStyle?.webkitMaskImage || '',
        edgeClipPath: edgeStyle?.clipPath || '',
        edgeLayerRect: edgeLayerRect ? {
          width: edgeLayerRect.width,
          height: edgeLayerRect.height,
        } : null,
        glowFilter: glow ? getComputedStyle(glow).filter : '',
        edgeFilter: edge ? getComputedStyle(edge).filter : '',
      },
    };
  });
}

function assertAtmosphereState(state, scenario, expectedResponsive = null) {
  const snapshot = state.snapshot;
  assert(snapshot, `${scenario.id}: production atmosphere diagnostics are missing`, state);
  assert(snapshot.scope === 'production', `${scenario.id}: atmosphere scope is not production`, state);
  assert(snapshot.routeId === scenario.routeId, `${scenario.id}: route ownership is wrong`, state);
  assert(sourceIdMatches(snapshot.activeSourceId, scenario.sourceIds), `${scenario.id}: source ownership is wrong`, state);
  assert(scenario.sourceKinds.includes(snapshot.sourceKind), `${scenario.id}: source kind is wrong`, state);
  assert(snapshot.compositorCount === 1, `${scenario.id}: expected one compositor`, state);
  assert(snapshot.activeSourceCount === 1, `${scenario.id}: expected one active source`, state);
  assert(snapshot.glowCanvasCount === 1 && state.dom.glowCount === 1, `${scenario.id}: glow canvas count is wrong`, state);
  assert(snapshot.edgeCanvasCount === 1 && state.dom.edgeCount === 1, `${scenario.id}: edge canvas count is wrong`, state);
  assert(snapshot.glowCanvasId === 'simulation-atmosphere-glow-canvas', `${scenario.id}: glow canvas identity is wrong`, state);
  assert(snapshot.edgeCanvasId === 'simulation-atmosphere-edge-light-canvas', `${scenario.id}: edge canvas identity is wrong`, state);
  assert(state.dom.glowPointerEvents === 'none', `${scenario.id}: glow canvas captures pointer input`, state);
  assert(state.dom.edgePointerEvents === 'none', `${scenario.id}: edge canvas captures pointer input`, state);
  assert(
    Math.abs((state.dom.glowRect?.width || 0) - (state.wallRect?.width || 0)) <= 0.25
      && Math.abs((state.dom.glowRect?.height || 0) - (state.wallRect?.height || 0)) <= 0.25,
    `${scenario.id}: glow display geometry diverges from the wall`,
    state,
  );
  assert(state.dom.edgeLayerCount === 1, `${scenario.id}: expected one edge-light layer`, state);
  assert(state.dom.legacyEdgeContourCount === 0, `${scenario.id}: legacy edge contour is still mounted`, state);
  assert(state.dom.edgeClipPath === 'none', `${scenario.id}: edge Canvas has an independent clip path`, state);
  assert(state.dom.edgeLayerMaskImage !== 'none', `${scenario.id}: edge layer has no inset mask`, state);
  assert(
    state.dom.edgeLayerRadius === state.dom.wallRadius,
    `${scenario.id}: edge layer radius diverges from the wall radius`,
    state,
  );
  assert(
    state.dom.edgeLayerCornerShape === state.dom.wallCornerShape,
    `${scenario.id}: edge layer corner shape diverges from the wall`,
    state,
  );
  assert(
    Math.abs((state.dom.edgeLayerRect?.width || 0) - (state.wallRect?.width || 0)) <= 0.25
      && Math.abs((state.dom.edgeLayerRect?.height || 0) - (state.wallRect?.height || 0)) <= 0.25,
    `${scenario.id}: edge layer geometry diverges from the wall`,
    state,
  );
  assert(state.dom.glowFilter === 'none', `${scenario.id}: glow canvas received source-material blur`, state);
  assert(state.dom.edgeFilter === 'none', `${scenario.id}: edge canvas received source-material blur`, state);
  assert(snapshot.sourceGeneration > 0, `${scenario.id}: source generation is missing`, state);

  if (snapshot.status === 'failed-open') {
    assert(Boolean(snapshot.failOpenReason), `${scenario.id}: failed-open has no reason`, state);
    return;
  }

  assert(snapshot.status === 'ready', `${scenario.id}: atmosphere did not settle ready`, state);
  assert(snapshot.firstCompositeAt > 0, `${scenario.id}: first composite was not recorded`, state);
  assert(snapshot.compositedFrameCount > 0, `${scenario.id}: no atmosphere frame was composited`, state);
  assert(snapshot.outputWidth > 1 && snapshot.outputHeight > 1, `${scenario.id}: output buffer is empty`, state);
  assert(state.dom.glowHidden === false, `${scenario.id}: ready glow canvas is hidden`, state);
  assert(state.wallRect?.width > 1 && state.wallRect?.height > 1, `${scenario.id}: wall geometry is missing`, state);
  if (scenario.id === 'home') {
    assert(snapshot.sourceKind === 'canvas', 'home: atmosphere does not sample the final rendered frame', state);
    assert(snapshot.sourceLayerCount >= 1, 'home: final-frame source has no visible layers', state);
  }
  const expectedWidth = Math.round(state.wallRect.width * snapshot.scale);
  const expectedHeight = Math.round(state.wallRect.height * snapshot.scale);
  assert(Math.abs(snapshot.outputWidth - expectedWidth) <= 2, `${scenario.id}: output width does not match resolved scale`, state);
  assert(Math.abs(snapshot.outputHeight - expectedHeight) <= 2, `${scenario.id}: output height does not match resolved scale`, state);

  if (expectedResponsive) {
    const allowedQualities = expectedResponsive.qualities || [expectedResponsive.quality];
    const qualityScales = { high: 0.5, balanced: 0.375, low: 0.25 };
    assert(allowedQualities.includes(snapshot.quality), `${scenario.id}: responsive quality is wrong`, state);
    assert(
      Math.abs(snapshot.scale - qualityScales[snapshot.quality]) <= 0.0001,
      `${scenario.id}: responsive scale is wrong`,
      state,
    );
    assert(snapshot.cadence === expectedResponsive.cadence, `${scenario.id}: responsive cadence is wrong`, state);
    if (Number.isFinite(expectedResponsive.responsiveScale)) {
      assert(
        Math.abs(snapshot.responsiveScale - expectedResponsive.responsiveScale) <= 0.0001,
        `${scenario.id}: responsive effect scale is wrong`,
        state,
      );
    }
  }
}

async function gotoScenario(page, scenario) {
  await page.goto(routeUrl(scenario.path), { waitUntil: 'domcontentloaded', timeout: 60000 });
  try {
    await waitForSettledAtmosphere(page, scenario);
  } catch (error) {
    const state = await readAtmosphereState(page).catch(() => null);
    throw new Error(`${scenario.id}: atmosphere did not settle\n${JSON.stringify(state, null, 2)}`, {
      cause: error,
    });
  }
  return readAtmosphereState(page);
}

async function runDirectBootMatrix(browser) {
  const results = [];
  const scenarios = PRIMARY_SCENARIOS.filter((scenario) => (
    DIRECT_SCENARIO_FILTER.size === 0 || DIRECT_SCENARIO_FILTER.has(scenario.id)
  ));
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await installPortfolioAccess(context);
    const page = await context.newPage();
    try {
      const state = await gotoScenario(page, scenario);
      assertAtmosphereState(
        state,
        scenario,
        scenario.id === 'home' ? { qualities: ['balanced', 'low'], cadence: 30 } : null,
      );
      if (
        ENFORCE_COST_BUDGET
        && scenario.id === 'home'
        && state.snapshot.status === 'ready'
      ) {
        assert(state.snapshot.cost.meanMs <= 1, 'Desktop atmosphere exceeded the 1 ms mean budget', state);
      }
      results.push({
        id: scenario.id,
        status: state.snapshot.status,
        sourceId: state.snapshot.activeSourceId,
        sourceKind: state.snapshot.sourceKind,
        quality: state.snapshot.quality,
        cadence: state.snapshot.cadence,
        meanCostMs: state.snapshot.cost.meanMs,
        costSamples: state.snapshot.cost.sampleCount,
      });
    } finally {
      await context.close();
    }
  }
  return results;
}

async function markStableOutputNodes(page) {
  return page.evaluate(() => {
    window.__ABS_ATMOSPHERE_AUDIT_OUTPUTS__ = {
      glow: document.getElementById('simulation-atmosphere-glow-canvas'),
      edge: document.getElementById('simulation-atmosphere-edge-light-canvas'),
    };
    return Boolean(
      window.__ABS_ATMOSPHERE_AUDIT_OUTPUTS__.glow
      && window.__ABS_ATMOSPHERE_AUDIT_OUTPUTS__.edge
    );
  });
}

async function assertStableOutputNodes(page, label) {
  const stable = await page.evaluate(() => {
    const marked = window.__ABS_ATMOSPHERE_AUDIT_OUTPUTS__;
    return Boolean(
      marked
      && marked.glow === document.getElementById('simulation-atmosphere-glow-canvas')
      && marked.edge === document.getElementById('simulation-atmosphere-edge-light-canvas')
    );
  });
  assert(stable, `${label}: SPA navigation replaced the stable atmosphere outputs`);
}

async function clickPrimaryRoute(page, scenario) {
  await page.locator(`[data-route-tab="${scenario.routeId}"]`).click({ timeout: WAIT_MS });
  try {
    await waitForSettledAtmosphere(page, scenario);
  } catch (error) {
    const state = await readAtmosphereState(page).catch(() => null);
    throw new Error(`${scenario.id}: route-tab atmosphere did not settle\n${JSON.stringify(state, null, 2)}`, {
      cause: error,
    });
  }
  const state = await readAtmosphereState(page);
  assertAtmosphereState(state, scenario);
  await assertStableOutputNodes(page, scenario.id);
  return state;
}

async function chooseDailySimulation(page, name, scenario) {
  await page.locator('.simulation-focus-switcher').click({ timeout: WAIT_MS });
  await page.waitForSelector('.simulation-focus-modal.active', { timeout: WAIT_MS });
  await page.locator('.simulation-focus-modal.active .simulation-focus-row')
    .filter({ hasText: name })
    .first()
    .click();
  try {
    await waitForSettledAtmosphere(page, scenario);
  } catch (error) {
    const state = await readAtmosphereState(page).catch(() => null);
    throw new Error(`${scenario.id}: chooser atmosphere did not settle\n${JSON.stringify(state, null, 2)}`, {
      cause: error,
    });
  }
  const state = await readAtmosphereState(page);
  assertAtmosphereState(state, scenario);
  await assertStableOutputNodes(page, scenario.id);
  return state;
}

async function runSpaLifecycle(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await installPortfolioAccess(context);
  const page = await context.newPage();
  try {
    const initial = await gotoScenario(page, PRIMARY_SCENARIOS[0]);
    assertAtmosphereState(initial, PRIMARY_SCENARIOS[0]);
    assert(await markStableOutputNodes(page), 'Home did not mount stable atmosphere outputs');

    const rows = [];
    let previousGeneration = initial.snapshot.sourceGeneration;
    let previousSwitchCount = initial.snapshot.sourceSwitchCount;
    const dailyScenario = PRIMARY_SCENARIOS[4];
    if (SPA_SCENARIO_FILTER.size === 0 || SPA_SCENARIO_FILTER.has(dailyScenario.id)) {
      const state = await chooseDailySimulation(page, 'Tension', dailyScenario);
      assert(
        state.snapshot.sourceGeneration > previousGeneration,
        `${dailyScenario.id}: source generation did not advance after chooser selection`,
        state,
      );
      assert(
        state.snapshot.sourceSwitchCount >= previousSwitchCount,
        `${dailyScenario.id}: source switch diagnostics regressed`,
        state,
      );
      previousGeneration = state.snapshot.sourceGeneration;
      previousSwitchCount = state.snapshot.sourceSwitchCount;
      rows.push({
        id: dailyScenario.id,
        sourceId: state.snapshot.activeSourceId,
        generation: state.snapshot.sourceGeneration,
        switchCount: state.snapshot.sourceSwitchCount,
      });
    }

    const steps = [
      { path: '/portfolio.html', scenario: PRIMARY_SCENARIOS[1] },
      { path: '/about.html', scenario: PRIMARY_SCENARIOS[2] },
      { path: '/contact.html', scenario: PRIMARY_SCENARIOS[3] },
    ].filter(({ scenario }) => (
      SPA_SCENARIO_FILTER.size === 0 || SPA_SCENARIO_FILTER.has(scenario.id)
    ));
    for (const step of steps) {
      const state = ['home', 'portfolio', 'about', 'contact'].includes(step.scenario.routeId)
        ? await clickPrimaryRoute(page, step.scenario)
        : await spaNavigate(page, step.path, step.scenario);
      assert(
        state.snapshot.sourceGeneration > previousGeneration,
        `${step.scenario.id}: source generation did not advance across SPA navigation`,
        state,
      );
      assert(
        state.snapshot.sourceSwitchCount >= previousSwitchCount,
        `${step.scenario.id}: source switch diagnostics regressed`,
        state,
      );
      previousGeneration = state.snapshot.sourceGeneration;
      previousSwitchCount = state.snapshot.sourceSwitchCount;
      rows.push({
        id: step.scenario.id,
        sourceId: state.snapshot.activeSourceId,
        generation: state.snapshot.sourceGeneration,
        switchCount: state.snapshot.sourceSwitchCount,
      });
    }
    return rows;
  } finally {
    await context.close();
  }
}

async function runTransitionSnapshotContract(browser) {
  const results = [];
  for (const mode of ['pit', 'bubbles']) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    await installPortfolioAccess(context);
    const page = await context.newPage();
    try {
      const scenario = {
        ...PRIMARY_SCENARIOS[0],
        path: `/index.html?mode=${mode}&absAudit=1`,
      };
      const initial = await gotoScenario(page, scenario);
      assertAtmosphereState(initial, scenario);
      assert(await markStableOutputNodes(page), `${mode}: Home did not mount stable atmosphere outputs`);
      if (mode === 'bubbles') {
        await page.waitForFunction(() => (
          document.getElementById('simulations')?.classList.contains('simulation-depth-title-layer-active')
          && document.getElementById('simulation-front-depth-canvas')
          && window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.().sourceLayerCount === 2
        ), null, { timeout: WAIT_MS, polling: 'raf' });
      }
      await page.evaluate(() => {
        delete window.__ABS_SIMULATION_TRANSACTION_SNAPSHOT__;
      });

      await chooseDailySimulation(page, 'Tension', PRIMARY_SCENARIOS[4]);
      const records = await page.evaluate(() => (
        Array.isArray(window.__ABS_SIMULATION_TRANSACTION_SNAPSHOT__)
          ? window.__ABS_SIMULATION_TRANSACTION_SNAPSHOT__.map((record) => ({ ...record }))
          : []
      ));
      const materialIndex = records.findIndex((record) => record.id === 'c');
      const frontIndex = records.findIndex((record) => record.id === 'simulation-front-depth-canvas');
      const materialRecord = records[materialIndex];
      const frontRecord = records[frontIndex];
      assert(materialIndex >= 0, `${mode}: transition snapshot omitted Home material`, records);
      assert(materialRecord?.filter === 'none', `${mode}: transition snapshot blurred Home material`, records);
      if (mode === 'bubbles') {
        assert(materialIndex < frontIndex, 'bubbles: transition snapshot rear/front order is wrong', records);
        assert(frontRecord?.filter === 'none', 'bubbles: transition snapshot blurred front material', records);
      } else {
        assert(frontIndex < 0, `${mode}: ordinary transition snapshot captured a front depth layer`, records);
      }
      results.push({ mode, records });
    } finally {
      await context.close();
    }
  }
  return results;
}

async function runKaleidoscopeFinalFrameContract(browser) {
  const context = await browser.newContext({ viewport: { width: 2560, height: 1440 } });
  const page = await context.newPage();
  const scenario = PRIMARY_SCENARIOS[0];
  const results = [];
  try {
    await gotoScenario(page, scenario);
    await page.evaluate(async () => {
      const atmosphere = await import('/src/legacy/modules/rendering/atmosphere/simulation-atmosphere.js');
      const config = atmosphere.getSimulationAtmosphereConfig();
      atmosphere.setSimulationAtmosphereConfig({
        ...config,
        qualityMode: 'low',
        glowHoldMs: 0,
        glowFadeOutMs: 0,
      });
    });

    for (const mode of ['kaleidoscope-3', 'kaleidoscope-rift']) {
      const before = await page.evaluate(() => (
        window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.() || null
      ));
      await page.evaluate(async (nextMode) => {
        const controller = await import('/src/legacy/modules/modes/mode-controller.js');
        await controller.setMode(nextMode);
      }, mode);
      await page.waitForFunction(async (expectedMode) => {
        const runtime = await import('/src/legacy/modules/core/state.js');
        return runtime.getGlobals().currentMode === expectedMode
          && runtime.getGlobals().warmupFramesRemaining === 0;
      }, mode, { timeout: WAIT_MS, polling: 'raf' });
      await page.waitForTimeout(6200);
      await page.waitForFunction(
        async ({ expectedMode, minimumClearCount }) => {
          const runtime = await import('/src/legacy/modules/core/state.js');
          const snapshot = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.();
          return runtime.getGlobals().currentMode === expectedMode
            && snapshot?.status === 'ready'
            && snapshot?.firstCompositeAt > 0
            && snapshot?.sourceKind === 'canvas'
            && snapshot?.sourceLayerCount === 1
            && snapshot?.clearCount > minimumClearCount
            && snapshot?.glowEmissionScale >= 0.49
            && snapshot?.glowEmissionScale <= 0.51;
        },
        {
          expectedMode: mode,
          minimumClearCount: before?.clearCount || 0,
        },
        { timeout: WAIT_MS, polling: 'raf' },
      );

      const coverage = await page.evaluate(({ sampleWidth, sampleHeight, sectorCount }) => {
        const sampleSectors = (canvas) => {
          const sample = document.createElement('canvas');
          sample.width = sampleWidth;
          sample.height = sampleHeight;
          const context2d = sample.getContext('2d', { alpha: true });
          context2d.drawImage(canvas, 0, 0, sampleWidth, sampleHeight);
          const pixels = context2d.getImageData(0, 0, sampleWidth, sampleHeight).data;
          const occupied = new Array(sectorCount).fill(0);
          const alpha = new Array(sectorCount).fill(0);
          const eligible = new Array(sectorCount).fill(0);
          const centerX = sampleWidth * 0.5;
          const centerY = sampleHeight * 0.5;
          const maxRadius = Math.min(sampleWidth, sampleHeight) * 0.5;

          for (let y = 0; y < sampleHeight; y += 1) {
            for (let x = 0; x < sampleWidth; x += 1) {
              const dx = x + 0.5 - centerX;
              const dy = y + 0.5 - centerY;
              const radius = Math.hypot(dx, dy) / maxRadius;
              if (radius < 0.28 || radius > 0.92) continue;
              const angle = (Math.atan2(dy, dx) + Math.PI * 2) % (Math.PI * 2);
              const sector = Math.min(
                sectorCount - 1,
                Math.floor((angle / (Math.PI * 2)) * sectorCount),
              );
              const pixelAlpha = pixels[(y * sampleWidth + x) * 4 + 3];
              eligible[sector] += 1;
              alpha[sector] += pixelAlpha;
              if (pixelAlpha > 2) occupied[sector] += 1;
            }
          }

          return {
            occupancy: occupied.map((count, index) => count / Math.max(1, eligible[index])),
            meanAlpha: alpha.map((total, index) => total / Math.max(1, eligible[index]) / 255),
          };
        };

        return {
          snapshot: window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.() || null,
          source: sampleSectors(document.getElementById('c')),
          atmosphere: sampleSectors(document.getElementById('simulation-atmosphere-glow-canvas')),
        };
      }, { sampleWidth: 320, sampleHeight: 180, sectorCount: 16 });

      const sourceActiveSectors = coverage.source.occupancy.filter((value) => value > 0.002).length;
      const atmosphereActiveSectors = coverage.atmosphere.meanAlpha.filter((value) => value > 0.002).length;
      const matchedSectors = coverage.source.occupancy.reduce((count, value, index) => (
        value > 0.002 && coverage.atmosphere.meanAlpha[index] > 0.002 ? count + 1 : count
      ), 0);
      const matchedRatio = sourceActiveSectors > 0 ? matchedSectors / sourceActiveSectors : 0;

      assert(sourceActiveSectors === 16, `${mode}: final render does not occupy every mirrored sector`, coverage);
      assert(atmosphereActiveSectors === 16, `${mode}: atmosphere collapsed to a subset of wedges`, coverage);
      assert(matchedRatio === 1, `${mode}: atmosphere does not match every final-render sector`, coverage);
      results.push({
        mode,
        sourceActiveSectors,
        atmosphereActiveSectors,
        matchedRatio,
        glowEmissionScale: coverage.snapshot?.glowEmissionScale,
      });
    }
    return results;
  } finally {
    await context.close();
  }
}

async function runMobilePerformance(browser) {
  const scenario = PRIMARY_SCENARIOS[0];
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await gotoScenario(page, scenario);
    const settledFrameCount = await page.evaluate(() => (
      window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.().compositedFrameCount || 0
    ));
    await page.waitForFunction((minimumFrameCount) => {
      const snapshot = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.();
      return snapshot?.status === 'failed-open'
        || snapshot?.compositedFrameCount >= minimumFrameCount;
    }, settledFrameCount + 120, { timeout: WAIT_MS, polling: 50 });
    const state = await readAtmosphereState(page);
    assertAtmosphereState(state, scenario, { qualities: ['low'], cadence: 20 });
    if (ENFORCE_COST_BUDGET && state.snapshot.status === 'ready') {
      assert(state.snapshot.cost.meanMs <= 0.75, 'Mobile Low atmosphere exceeded the 0.75 ms mean budget', state);
    }
    return {
      quality: state.snapshot.quality,
      cadence: state.snapshot.cadence,
      meanCostMs: state.snapshot.cost.meanMs,
      samples: state.snapshot.cost.sampleCount,
    };
  } finally {
    await context.close();
  }
}

async function runReducedMotion(browser) {
  const scenario = PRIMARY_SCENARIOS[3];
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  try {
    await gotoScenario(page, scenario);
    await page.waitForFunction(() => {
      const snapshot = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.();
      return snapshot?.status === 'failed-open'
        || (snapshot?.reducedMotion === true && snapshot?.internalRafCount === 0);
    }, null, { timeout: WAIT_MS, polling: 'raf' });
    const state = await readAtmosphereState(page);
    assertAtmosphereState(state, scenario, { qualities: ['low'], cadence: 20 });
    assert(state.snapshot.reducedMotion === true, 'Reduced Motion was not detected', state);
    assert(state.snapshot.effectiveDrift === 0, 'Reduced Motion retained atmosphere drift', state);
    if (state.snapshot.status === 'ready') {
      assert(state.snapshot.scheduler === 'internal', 'Reduced Motion Contact source is not internally scheduled', state);
      assert(state.snapshot.internalRafCount === 0, 'Reduced Motion retained an active internal atmosphere RAF', state);
    }
    return {
      status: state.snapshot.status,
      effectiveDrift: state.snapshot.effectiveDrift,
      internalRafCount: state.snapshot.internalRafCount,
    };
  } finally {
    await context.close();
  }
}

async function setPageTheme(page, theme) {
  await page.evaluate(async (nextTheme) => {
    const module = await import('/src/legacy/modules/visual/dark-mode-v2.js');
    module.setTheme(nextTheme);
  }, theme);
  await page.waitForFunction((expectedTheme) => {
    const snapshot = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.();
    return snapshot?.themeMode === expectedTheme
      && snapshot?.status === 'ready'
      && snapshot?.firstCompositeAt > 0
      && document.getElementById('simulation-atmosphere-glow-canvas')?.hidden === false;
  }, theme, { timeout: WAIT_MS, polling: 'raf' });
}

async function waitForResponsiveAtmosphere(page, scenario, profile, previousGeometryReads) {
  await page.waitForFunction(
    ({ expectedRouteId, expectedCadence, minimumGeometryReads }) => {
      const snapshot = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.();
      const wallRect = document.getElementById('simulations')?.getBoundingClientRect();
      const glow = document.getElementById('simulation-atmosphere-glow-canvas');
      if (
        !snapshot
        || !wallRect
        || snapshot.status !== 'ready'
        || snapshot.firstCompositeAt <= 0
        || glow?.hidden !== false
      ) return false;
      const expectedWidth = Math.round(wallRect.width * snapshot.scale);
      const expectedHeight = Math.round(wallRect.height * snapshot.scale);
      return snapshot.routeId === expectedRouteId
        && snapshot.cadence === expectedCadence
        && snapshot.geometryReadCount > minimumGeometryReads
        && Math.abs(snapshot.outputWidth - expectedWidth) <= 2
        && Math.abs(snapshot.outputHeight - expectedHeight) <= 2
        && snapshot.edgeWidth === snapshot.outputWidth
        && snapshot.edgeHeight === snapshot.outputHeight;
    },
    {
      expectedRouteId: scenario.routeId,
      expectedCadence: profile.cadence,
      minimumGeometryReads: previousGeometryReads,
    },
    { timeout: WAIT_MS, polling: 'raf' },
  );
}

async function waitForStableWallGeometry(page) {
  await page.evaluate(() => new Promise((resolve) => {
    const startedAt = performance.now();
    let previousWidth = -1;
    let previousHeight = -1;
    let stableFrames = 0;
    const sample = () => {
      const rect = document.getElementById('simulations')?.getBoundingClientRect();
      if (!rect) {
        resolve();
        return;
      }
      const stable = Math.abs(rect.width - previousWidth) < 0.05
        && Math.abs(rect.height - previousHeight) < 0.05;
      stableFrames = stable ? stableFrames + 1 : 0;
      previousWidth = rect.width;
      previousHeight = rect.height;
      if (stableFrames >= 4 || performance.now() - startedAt > 2000) {
        resolve();
        return;
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
}

async function runResponsiveResizeMatrix(browser) {
  const results = [];
  const scenarios = PRIMARY_SCENARIOS.slice(0, 4);
  if (CAPTURE_RESPONSIVE) await mkdir(RESPONSIVE_CAPTURE_ROOT, { recursive: true });

  for (const scenario of scenarios) {
    const initialProfile = RESPONSIVE_PROFILES[0];
    const context = await browser.newContext({
      viewport: { width: initialProfile.width, height: initialProfile.height },
    });
    await installPortfolioAccess(context);
    const page = await context.newPage();
    try {
      let state = await gotoScenario(page, scenario);
      for (const theme of ['light', 'dark']) {
        await setPageTheme(page, theme);
        for (let index = 0; index < RESPONSIVE_PROFILES.length; index += 1) {
          const profile = RESPONSIVE_PROFILES[index];
          const previousGeometryReads = state.snapshot.geometryReadCount;
          await page.setViewportSize({ width: profile.width, height: profile.height });
          await waitForResponsiveAtmosphere(
            page,
            scenario,
            profile,
            index === 0 ? previousGeometryReads - 1 : previousGeometryReads,
          );
          await waitForStableWallGeometry(page);
          await waitForResponsiveAtmosphere(page, scenario, profile, -1);
          state = await readAtmosphereState(page);
          const expectedResponsiveScale = Math.max(
            RESPONSIVE_MIN_SCALE,
            Math.min(
              RESPONSIVE_MAX_SCALE,
              Math.min(state.wallRect.width, state.wallRect.height) / RESPONSIVE_REFERENCE_PX,
            ),
          );
          assertAtmosphereState(state, scenario, {
            qualities: ['high', 'balanced', 'low'],
            cadence: profile.cadence,
            responsiveScale: expectedResponsiveScale,
          });
          assert(
            state.snapshot.edgeWidth === state.snapshot.outputWidth
              && state.snapshot.edgeHeight === state.snapshot.outputHeight,
            `${scenario.id}/${theme}/${profile.id}: edge backing store diverges from glow output`,
            state,
          );
          if (CAPTURE_RESPONSIVE) {
            await page.screenshot({
              path: resolve(
                RESPONSIVE_CAPTURE_ROOT,
                `${BROWSER_NAME}-${scenario.id}-${theme}-${profile.id}.png`,
              ),
            });
          }
          results.push({
            route: scenario.id,
            theme,
            profile: profile.id,
            wall: state.wallRect,
            output: {
              width: state.snapshot.outputWidth,
              height: state.snapshot.outputHeight,
            },
            cadence: state.snapshot.cadence,
            quality: state.snapshot.quality,
            responsiveScale: state.snapshot.responsiveScale,
          });
        }
      }
    } finally {
      await context.close();
    }
  }
  return results;
}

async function measureFrameCadence(page, count = 90) {
  return page.evaluate((sampleCount) => new Promise((resolve) => {
    const deltas = [];
    let previous = performance.now();
    const sample = (now) => {
      deltas.push(now - previous);
      previous = now;
      if (deltas.length < sampleCount) {
        requestAnimationFrame(sample);
        return;
      }
      const sorted = [...deltas].sort((left, right) => left - right);
      resolve({
        meanMs: deltas.reduce((sum, value) => sum + value, 0) / deltas.length,
        p95Ms: sorted[Math.min(sorted.length - 1, Math.round((sorted.length - 1) * 0.95))],
        maxMs: sorted[sorted.length - 1],
        over25Ms: deltas.filter((value) => value > 25).length,
      });
    };
    requestAnimationFrame(sample);
  }), count);
}

async function runCrispLabViewport(browser, profile, { measureCadence = false } = {}) {
  const context = await browser.newContext(profile.context);
  const page = await context.newPage();
  try {
    await page.goto(routeUrl('/lab/atmosphere-crisp-glow.html?mode=water&absAudit=1'), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForFunction(() => {
      const snapshot = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.();
      return snapshot
        && window.__ABS_ATMOSPHERE_LAB__?.getSnapshot?.().variant === 'crispGlow'
        && snapshot.scope === 'lab'
        && snapshot.activeSourceId === 'lab:crisp-glow'
        && (snapshot.status === 'ready' || snapshot.status === 'failed-open');
    }, null, { timeout: WAIT_MS, polling: 'raf' });
    const state = await readAtmosphereState(page);
    assert(state.snapshot.scope === 'lab', 'Crisp authoring compositor leaked into production scope', state);
    assert(state.snapshot.compositorCount === 1, 'Crisp lab mounted more than one compositor', state);
    assert(state.snapshot.activeSourceCount === 1, 'Crisp lab mounted more than one source', state);
    assert(state.snapshot.sourceKind === 'emitters', 'Crisp lab did not reuse the emitter production path', state);
    assert(
      await page.locator('input[data-parameter-id="materialBlurPx"]').count() === 0,
      'Crisp lab still exposes the retired Body Blur control',
      state,
    );
    const baselineCadence = measureCadence ? await measureFrameCadence(page) : null;
    return {
      profile: profile.id,
      status: state.snapshot.status,
      scope: state.snapshot.scope,
      sourceId: state.snapshot.activeSourceId,
      cadenceMeasured: measureCadence,
      baselineCadence,
    };
  } finally {
    await context.close();
  }
}

async function runCrispLabIsolation(browser) {
  const profiles = [
    { id: 'desktop', context: { viewport: { width: 1440, height: 900 } } },
  ];
  if (HEADED) {
    profiles.push({
      id: 'mobile-dpr-3',
      context: {
        viewport: { width: 390, height: 844 },
        deviceScaleFactor: 3,
        hasTouch: true,
        isMobile: true,
      },
    });
  }
  const results = [];
  for (const profile of profiles) {
    results.push(await runCrispLabViewport(browser, profile, { measureCadence: HEADED }));
  }
  return results;
}

async function runCrispPersistenceContract(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(routeUrl('/lab/atmosphere-crisp-glow.html?mode=water&absAudit=1'), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForFunction(() => (
      window.__ABS_ATMOSPHERE_LAB__?.getSnapshot?.().status === 'ready'
    ), null, { timeout: WAIT_MS, polling: 'raf' });

    const clampResults = await page.evaluate(async () => {
      const module = await import('/src/legacy/modules/rendering/atmosphere/simulation-atmosphere-config.js');
      const below = module.normalizeSimulationAtmosphereConfig({
        light: { glowRadiusFxPx: -20, glowAmount: -2 },
      }).light;
      const above = module.normalizeSimulationAtmosphereConfig({
        dark: {
          glowRadiusFxPx: 900,
          glowAmount: 9,
          colourStrength: 8,
          hazeStrength: 9,
          grainStrength: 9,
          afterglowHalfLifeMs: 9000,
          driftSpeedPxPerSec: 900,
          titleClearance: 8,
          edgeLight: 9,
          edgeWidthPx: 20,
          materialBlurPx: 3,
        },
      }).dark;
      return {
        below,
        above,
        bodyBlurRetired: !Object.hasOwn(above, 'materialBlurPx'),
      };
    });
    assert(
      clampResults.below.glowRadiusFxPx === 0
        && clampResults.below.glowAmount === 0
        && clampResults.above.glowRadiusFxPx === 420
        && clampResults.above.glowAmount === 2
        && clampResults.above.colourStrength === 3
        && clampResults.above.hazeStrength === 4
        && clampResults.above.grainStrength === 4
        && clampResults.above.afterglowHalfLifeMs === 6000
        && clampResults.above.driftSpeedPxPerSec === 60
        && clampResults.above.titleClearance === 1
        && clampResults.above.edgeLight === 5
        && clampResults.above.edgeWidthPx === 8
        && clampResults.bodyBlurRetired,
      'Expanded atmosphere normalization ranges are wrong',
      clampResults,
    );
    return {
      clampResults,
    };
  } finally {
    await context.close();
  }
}

async function runExperimentalLabIsolation(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(routeUrl('/lab/atmosphere-feedback.html?mode=bubbles&panel=0&absAudit=1'), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForFunction(() => (
      window.__ABS_ATMOSPHERE_LAB__?.getSnapshot?.().variant === 'canvasFeedback'
    ), null, { timeout: WAIT_MS, polling: 'raf' });
    const state = await page.evaluate(() => ({
      sharedHandlePresent: Boolean(window.__ABS_SIMULATION_ATMOSPHERE__),
      sharedGlowCount: document.querySelectorAll('#simulation-atmosphere-glow-canvas').length,
      sharedEdgeCount: document.querySelectorAll('#simulation-atmosphere-edge-light-canvas').length,
      experimentalVariant: window.__ABS_ATMOSPHERE_LAB__?.getSnapshot?.().variant || '',
    }));
    assert(state.sharedHandlePresent === false, 'Experimental lab mounted the production compositor', state);
    assert(state.sharedGlowCount === 0 && state.sharedEdgeCount === 0, 'Experimental lab mounted shared output canvases', state);
    return state;
  } finally {
    await context.close();
  }
}

async function runConfigPanelContract(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(routeUrl('/index.html?mode=pit&absAudit=1'), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await waitForSettledAtmosphere(page, PRIMARY_SCENARIOS[0]);
    await page.getByRole('button', { name: 'Toggle design panel' }).click({ timeout: WAIT_MS });

    const group = page.locator('details[data-group-id="atmosphere"]');
    await group.waitFor({ state: 'visible', timeout: WAIT_MS });
    const expectedControlIds = [
      'atmosphereEnabledSlider',
      'atmosphereTitleYOffsetVhSlider',
      'atmosphereGlowHoldMsSlider',
      'atmosphereGlowFadeOutMsSlider',
      'atmosphereQualityModeSlider',
      'atmosphereHazeCadenceSlider',
      ...['Light', 'Dark'].flatMap((theme) => [
        'BallPresence',
        'GlowAmount',
        'GlowRadiusFxPx',
        'ColourStrength',
        'GlowBlendMode',
        'EdgeLight',
        'EdgeWidthPx',
        'HazeStrength',
        'GrainStrength',
        'TitleClearance',
        'AfterglowHalfLifeMs',
        'DriftSpeedPxPerSec',
      ].map((id) => `atmosphere${theme}${id}Slider`)),
    ];
    const state = await group.evaluate((node) => ({
      sectionTitles: Array.from(node.querySelectorAll('.panel-section-accordion > summary'))
        .map((summary) => summary.textContent.trim().replace(/\s+/g, ' ')),
      controlIds: Array.from(node.querySelectorAll('input, select')).map((control) => control.id),
    }));
    assert(
      JSON.stringify(state.controlIds) === JSON.stringify(expectedControlIds),
      'Background Atmosphere panel does not match the shared production control schema',
      state,
    );
    assert(
      state.sectionTitles.some((title) => title.includes('Global'))
        && state.sectionTitles.some((title) => title.includes('Light Mode'))
        && state.sectionTitles.some((title) => title.includes('Dark Mode')),
      'Background Atmosphere panel is missing its Global or theme sections',
      state,
    );

    await group.locator(':scope > summary').click();
    const globalSummary = group.locator('.panel-section-accordion > summary').first();
    const globalSection = globalSummary.locator('..');
    if ((await globalSection.getAttribute('open')) === null) await globalSummary.click();
    const titleSlider = page.locator('#atmosphereTitleYOffsetVhSlider');
    const originalTitleY = await titleSlider.inputValue();
    await titleSlider.fill('2.25');
    await page.waitForFunction(() => (
      getComputedStyle(document.documentElement)
        .getPropertyValue('--atmosphere-title-y-offset')
        .trim() === '2.25vh'
    ), null, { timeout: WAIT_MS });
    await titleSlider.fill(originalTitleY);

    return {
      controlCount: state.controlIds.length,
      sectionTitles: state.sectionTitles,
      titleLiveApply: true,
    };
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await browserType.launch({ headless: !HEADED });
  try {
    const shouldRun = (phase) => PHASE_FILTER.size === 0 || PHASE_FILTER.has(phase);
    const directBoots = shouldRun('direct') ? await runDirectBootMatrix(browser) : null;
    const spaLifecycle = shouldRun('spa') ? await runSpaLifecycle(browser) : null;
    const transitionSnapshot = shouldRun('snapshot') ? await runTransitionSnapshotContract(browser) : null;
    const kaleidoscope = shouldRun('kaleidoscope') ? await runKaleidoscopeFinalFrameContract(browser) : null;
    const mobile = shouldRun('mobile') ? await runMobilePerformance(browser) : null;
    const reducedMotion = shouldRun('reduced') ? await runReducedMotion(browser) : null;
    const responsive = shouldRun('responsive') ? await runResponsiveResizeMatrix(browser) : null;
    const crispLab = shouldRun('crisp') ? await runCrispLabIsolation(browser) : null;
    const persistence = shouldRun('persistence') ? await runCrispPersistenceContract(browser) : null;
    const experimentalLab = shouldRun('experimental') ? await runExperimentalLabIsolation(browser) : null;
    const configPanel = shouldRun('panel') ? await runConfigPanelContract(browser) : null;
    console.log(JSON.stringify({
      ok: true,
      browser: BROWSER_NAME,
      origin: ORIGIN,
      directBoots,
      spaLifecycle,
      transitionSnapshot,
      kaleidoscope,
      mobile,
      reducedMotion,
      responsive,
      crispLab,
      persistence,
      experimentalLab,
      configPanel,
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
