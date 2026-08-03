#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const ORIGIN = String(process.env.ABS_DEV_URL || 'http://localhost:8012').replace(/\/+$/, '');
const WAIT_MS = Math.max(5000, Number(process.env.ABS_ATMOSPHERE_WAIT_MS || 45000));
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const HEADED = process.env.ABS_HEADED === '1';
const ENFORCE_COST_BUDGET = process.env.ABS_ATMOSPHERE_ENFORCE_COST === '1';
const CAPTURE_RESPONSIVE = process.env.ABS_ATMOSPHERE_CAPTURE_RESPONSIVE === '1';
const RESPONSIVE_CAPTURE_ROOT = resolve('output', 'playwright', 'production-atmosphere-responsive');
const HANDOFF_CAPTURE_ROOT = resolve('output', 'playwright', 'production-atmosphere', BROWSER_NAME);
const GLOW_RADIUS_MIN_CSS_PX = 36;
const GLOW_RADIUS_MAX_CSS_PX = 180;
const SMALL_GLOW_RADIUS_MIN_CSS_PX = 12;
const SMALL_GLOW_RADIUS_MAX_CSS_PX = 72;
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
  Object.freeze({ id: 'desktop', width: 1440, height: 900, cadence: 24 }),
  Object.freeze({ id: 'tablet', width: 820, height: 1180, cadence: 24 }),
  Object.freeze({ id: 'mobile', width: 390, height: 844, cadence: 24 }),
  Object.freeze({ id: 'short-landscape', width: 844, height: 390, cadence: 24 }),
  Object.freeze({ id: 'desktop-return', width: 1440, height: 900, cadence: 24 }),
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
    const sampleAlpha = (canvas) => {
      if (!(canvas instanceof HTMLCanvasElement) || canvas.width <= 1 || canvas.height <= 1) return null;
      const probe = document.createElement('canvas');
      probe.width = 64;
      probe.height = 36;
      const context = probe.getContext('2d', { alpha: true });
      if (!context) return null;
      context.drawImage(canvas, 0, 0, probe.width, probe.height);
      const pixels = context.getImageData(0, 0, probe.width, probe.height).data;
      let covered = 0;
      let alpha = 0;
      for (let index = 3; index < pixels.length; index += 4) {
        alpha += pixels[index];
        if (pixels[index] > 1) covered += 1;
      }
      const count = pixels.length / 4;
      return { coverage: covered / count, meanAlpha: alpha / count };
    };
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
    const homeSource = document.getElementById('c');
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
        glowAlpha: sampleAlpha(glow),
        homeSourceAlpha: sampleAlpha(homeSource),
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
  assert(
    ['native-filter', 'spread-pyramid-fallback'].includes(snapshot.glowRenderMode),
    `${scenario.id}: glow render mode is missing`,
    state,
  );
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
  assert(
    !state.dom.edgeFilter.includes('blur('),
    `${scenario.id}: edge canvas received source-material blur`,
    state,
  );
  if (snapshot.edgeStrength > 0) {
    assert(
      state.dom.edgeFilter.includes('brightness(') && state.dom.edgeFilter.includes('saturate('),
      `${scenario.id}: edge canvas is missing its compositor-only colour treatment`,
      state,
    );
  }
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
    const sourceCoverage = state.dom.homeSourceAlpha?.coverage || 0;
    const glowCoverage = state.dom.glowAlpha?.coverage || 0;
    const glowCoverageRatio = sourceCoverage > 0 ? glowCoverage / sourceCoverage : 0;
    const coverageSpreadIsVisible = sourceCoverage >= 0.2
      ? glowCoverage > sourceCoverage + 0.125
      : glowCoverage > sourceCoverage + 0.15
        && (glowCoverage > sourceCoverage + 0.25 || glowCoverageRatio >= 2.75);
    assert(
      coverageSpreadIsVisible,
      'home: glow pixels do not spread beyond the crisp source frame',
      state,
    );
    const sourceMeanAlpha = state.dom.homeSourceAlpha?.meanAlpha || 0;
    const glowEnergyRatio = sourceMeanAlpha > 0
      ? state.dom.glowAlpha?.meanAlpha / sourceMeanAlpha
      : 0;
    assert(
      glowEnergyRatio >= 0.65 && glowEnergyRatio <= 1.5,
      'home: glow energy does not match the crisp source frame',
      state,
    );
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
    const expectedCadence = snapshot.quality === 'low' ? 20 : expectedResponsive.cadence;
    assert(snapshot.cadence === expectedCadence, `${scenario.id}: responsive cadence is wrong`, state);
    if (Number.isFinite(expectedResponsive.resolvedGlowRadiusCss)) {
      assert(
        Math.abs(snapshot.resolvedGlowRadiusCss - expectedResponsive.resolvedGlowRadiusCss) <= 0.25,
        `${scenario.id}: responsive glow radius is wrong`,
        state,
      );
    }
    if (Number.isFinite(expectedResponsive.resolvedSmallGlowRadiusCss)) {
      assert(
        Math.abs(
          snapshot.resolvedSmallGlowRadiusCss - expectedResponsive.resolvedSmallGlowRadiusCss
        ) <= 0.25,
        `${scenario.id}: responsive small glow radius is wrong`,
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
        scenario.id === 'home' ? { qualities: ['balanced', 'low'], cadence: 24 } : null,
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

async function beginAtmosphereHandoffSampling(page, label) {
  await page.evaluate(({ auditLabel }) => {
    const audit = {
      label: auditLabel,
      startedAt: performance.now(),
      sawBusy: false,
      done: false,
      samples: [],
      boundaries: [],
    };
    window.__ABS_ATMOSPHERE_HANDOFF_AUDIT__ = audit;
    const capture = (kind, transactionOverride = null) => {
      const transaction = transactionOverride || window.__ABS_SIMULATION_SWITCH_TRANSACTION__ || {};
      const atmosphere = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.() || null;
      audit.samples.push({
        kind,
        at: performance.now(),
        transaction: {
          transactionId: transaction.transactionId || '',
          phase: transaction.phase || 'idle',
          busy: transaction.busy === true,
          topology: transaction.topology || '',
          commitCount: Number(transaction.commitCount) || 0,
          publicationCount: Number(transaction.publicationCount) || 0,
          phaseHistory: Array.isArray(transaction.phaseHistory) ? [...transaction.phaseHistory] : [],
          status: transaction.status || '',
        },
        atmosphere: atmosphere ? {
          status: atmosphere.status,
          transactionId: atmosphere.transactionId,
          activeSourceId: atmosphere.activeSourceId,
          activeSourceCount: atmosphere.activeSourceCount,
          compositorCount: atmosphere.compositorCount,
          activeSourceGeneration: atmosphere.activeSourceGeneration,
          outputSourceGeneration: atmosphere.outputSourceGeneration,
          resetSourceGeneration: atmosphere.resetSourceGeneration,
          firstCompositeGeneration: atmosphere.firstCompositeGeneration,
          outputTransactionId: atmosphere.outputTransactionId,
          outputResetCount: atmosphere.outputResetCount,
          sourceUnregisterCount: atmosphere.sourceUnregisterCount,
          failOpenReason: atmosphere.failOpenReason,
        } : null,
      });
      if (transaction.busy || (transaction.phase && transaction.phase !== 'idle')) audit.sawBusy = true;
      if (audit.sawBusy && !transaction.busy && transaction.phase === 'idle') audit.done = true;
    };
    audit.handleState = (event) => {
      capture('boundary', event.detail);
      audit.boundaries.push(event.detail?.phase || '');
    };
    window.addEventListener('abs:simulation-switch-state', audit.handleState);
    const sample = () => {
      capture('raf');
      if (!audit.done && performance.now() - audit.startedAt < 30000) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, { auditLabel: label });
}

async function finishAtmosphereHandoffSampling(page) {
  return page.evaluate(() => {
    const audit = window.__ABS_ATMOSPHERE_HANDOFF_AUDIT__;
    if (audit?.handleState) window.removeEventListener('abs:simulation-switch-state', audit.handleState);
    if (!audit) return null;
    return {
      label: audit.label,
      startedAt: audit.startedAt,
      sawBusy: audit.sawBusy,
      done: audit.done,
      boundaries: [...audit.boundaries],
      samples: audit.samples.map((sample) => ({
        ...sample,
        transaction: { ...sample.transaction, phaseHistory: [...sample.transaction.phaseHistory] },
        atmosphere: sample.atmosphere ? { ...sample.atmosphere } : null,
      })),
    };
  });
}

function assertAtomicAtmosphereHandoff(result, before, expected) {
  assert(result?.sawBusy && result.done, `${expected.label}: transaction was not sampled through settlement`, result);
  assert(result.samples.length >= 3, `${expected.label}: insufficient handoff samples`, result);
  const atmosphereSamples = result.samples.filter((sample) => sample.atmosphere);
  assert(
    atmosphereSamples.every((sample) => (
      sample.atmosphere.activeSourceCount <= 1 && sample.atmosphere.compositorCount <= 1
    )),
    `${expected.label}: overlapping atmosphere ownership was observed`,
    atmosphereSamples,
  );

  const settled = atmosphereSamples.at(-1);
  const transaction = settled?.transaction;
  const atmosphere = settled?.atmosphere;
  const exactHistory = ['idle', 'prepare', 'out', 'commit', 'prime', 'in', 'idle'];
  assert(
    JSON.stringify(transaction?.phaseHistory) === JSON.stringify(exactHistory),
    `${expected.label}: transaction phase history is incomplete or contains a retired phase`,
    transaction,
  );
  assert(transaction.topology === expected.topology, `${expected.label}: topology diagnostic is wrong`, transaction);
  assert(transaction.commitCount === 1, `${expected.label}: ownership commit was not exact-once`, transaction);
  assert(transaction.publicationCount === 1, `${expected.label}: settlement publication was not exact-once`, transaction);
  assert(
    atmosphere.outputResetCount - before.outputResetCount === 1,
    `${expected.label}: output reset was not exact-once`,
    { before, atmosphere },
  );
  assert(
    atmosphere.sourceUnregisterCount - before.sourceUnregisterCount === 1,
    `${expected.label}: outgoing source unregister was not exact-once`,
    { before, atmosphere },
  );
  const targetGeneration = atmosphere.activeSourceGeneration;
  assert(targetGeneration > 0, `${expected.label}: target generation is missing`, atmosphere);
  assert(atmosphere.activeSourceId === expected.sourceId, `${expected.label}: target source ownership is wrong`, atmosphere);
  assert(
    atmosphere.outputSourceGeneration === targetGeneration
      && atmosphere.resetSourceGeneration === targetGeneration
      && atmosphere.firstCompositeGeneration === targetGeneration,
    `${expected.label}: active/output/reset/first-composite generations diverged`,
    atmosphere,
  );
  assert(
    atmosphere.transactionId === transaction.transactionId
      && atmosphere.outputTransactionId === transaction.transactionId,
    `${expected.label}: atmosphere transaction ownership diverged`,
    { atmosphere, transaction },
  );

  const postCommit = atmosphereSamples.filter((sample) => (
    sample.atmosphere.resetSourceGeneration !== before.resetSourceGeneration
  ));
  assert(postCommit.length > 0, `${expected.label}: commit/reset boundary was not sampled`, atmosphereSamples);
  assert(
    postCommit.every((sample) => sample.atmosphere.outputSourceGeneration !== before.activeSourceGeneration),
    `${expected.label}: outgoing atmosphere output reappeared after commit`,
    postCommit,
  );
  const inBoundary = result.samples.find((sample) => (
    sample.kind === 'boundary' && sample.transaction.phase === 'in'
  ));
  assert(inBoundary, `${expected.label}: in boundary was not observed`, result.boundaries);
  assert(
    inBoundary.atmosphere?.firstCompositeGeneration === targetGeneration
      && inBoundary.atmosphere?.outputSourceGeneration === targetGeneration
      && inBoundary.atmosphere?.outputTransactionId === transaction.transactionId,
    `${expected.label}: target's first clean composite was not ready before in`,
    inBoundary,
  );

  return {
    label: expected.label,
    topology: expected.topology,
    transactionId: transaction.transactionId,
    sampleCount: result.samples.length,
    boundaries: result.boundaries,
    targetGeneration,
    resetDelta: atmosphere.outputResetCount - before.outputResetCount,
    unregisterDelta: atmosphere.sourceUnregisterCount - before.sourceUnregisterCount,
  };
}

async function chooseSimulationForHandoff(page, targetName) {
  await page.locator('.simulation-focus-switcher').click({ timeout: WAIT_MS });
  await page.locator('.simulation-focus-modal.active .simulation-focus-row')
    .filter({ hasText: targetName })
    .first()
    .click({ timeout: WAIT_MS });
}

async function runAtomicHandoffContract(browser) {
  await mkdir(HANDOFF_CAPTURE_ROOT, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const handoffs = [
    {
      label: 'home-to-home', targetName: 'Scaffold', targetId: '3d-cube',
      topology: 'home-mode-to-home-mode', sourceId: null,
    },
    {
      label: 'home-to-daily', targetName: 'Tension', targetId: 'repel-room',
      topology: 'home-mode-to-route-backed', sourceId: 'daily:repel-room',
    },
    {
      label: 'daily-to-daily', targetName: 'Convergence', targetId: 'flock-of-birds',
      topology: 'route-backed-to-route-backed', sourceId: 'daily:flock-of-birds',
    },
    {
      label: 'daily-to-home', targetName: 'Foundation', targetId: 'pit',
      topology: 'route-backed-to-home-mode', sourceId: null,
    },
  ];
  try {
    const initial = await gotoScenario(page, PRIMARY_SCENARIOS[0]);
    assertAtmosphereState(initial, PRIMARY_SCENARIOS[0]);
    assert(await markStableOutputNodes(page), 'Atomic handoff audit could not mark stable outputs');
    const results = [];
    for (const handoff of handoffs) {
      const before = await page.evaluate(() => window.__ABS_SIMULATION_ATMOSPHERE__.getSnapshot());
      await beginAtmosphereHandoffSampling(page, handoff.label);
      await chooseSimulationForHandoff(page, handoff.targetName);
      await page.waitForFunction(({ targetId }) => {
        const audit = window.__ABS_ATMOSPHERE_HANDOFF_AUDIT__;
        const transaction = window.__ABS_SIMULATION_SWITCH_TRANSACTION__ || {};
        const runtimeId = document.querySelector('#simulation-stage')?.dataset?.simulationId
          || window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().mode;
        return audit?.done && transaction.targetSimulationId === targetId && runtimeId === targetId;
      }, { targetId: handoff.targetId }, { timeout: WAIT_MS, polling: 'raf' });
      const result = await finishAtmosphereHandoffSampling(page);
      const settledSourceId = result.samples.at(-1)?.atmosphere?.activeSourceId || '';
      const expected = {
        ...handoff,
        sourceId: handoff.sourceId || settledSourceId,
      };
      results.push(assertAtomicAtmosphereHandoff(result, before, expected));
      await assertStableOutputNodes(page, handoff.label);
      await page.screenshot({ path: resolve(HANDOFF_CAPTURE_ROOT, `${handoff.label}.png`) });
    }
    return results;
  } catch (error) {
    await page.screenshot({ path: resolve(HANDOFF_CAPTURE_ROOT, 'handoff-failure.png'), fullPage: true }).catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

async function runAtmosphereFailOpenContract(browser) {
  await mkdir(HANDOFF_CAPTURE_ROOT, { recursive: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await gotoScenario(page, PRIMARY_SCENARIOS[0]);
    await page.evaluate(() => {
      window.__ABS_AUDIT_FORCE_ATMOSPHERE_FIRST_FRAME_FAILURE__ = true;
    });
    await chooseSimulationForHandoff(page, 'Tension');
    await page.waitForFunction(() => {
      const transaction = window.__ABS_SIMULATION_SWITCH_TRANSACTION__ || {};
      const atmosphere = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.();
      const material = document.querySelector('#simulation-stage canvas');
      const rect = material?.getBoundingClientRect();
      return transaction.phase === 'idle'
        && transaction.targetSimulationId === 'repel-room'
        && atmosphere?.status === 'failed-open'
        && atmosphere?.failOpenReason === 'audit-first-composite-failure'
        && atmosphere?.activeSourceCount <= 1
        && atmosphere?.compositorCount <= 1
        && rect?.width > 1
        && rect?.height > 1
        && Number.parseFloat(getComputedStyle(material).opacity || '1') >= 0.99;
    }, null, { timeout: WAIT_MS, polling: 'raf' });
    const result = await page.evaluate(() => ({
      transaction: window.__ABS_SIMULATION_SWITCH_TRANSACTION__,
      atmosphere: window.__ABS_SIMULATION_ATMOSPHERE__.getSnapshot(),
      routeStatus: document.documentElement.dataset.absDailyFocusStatus,
      transitionPhase: document.documentElement.dataset.absTransitionPhase || 'idle',
    }));
    assert(result.transaction.phase === 'idle' && !result.transaction.busy, 'Fail-open did not settle idle', result);
    assert(result.routeStatus === 'ready', 'Fail-open target runtime is not ready', result);
    assert(result.transitionPhase === 'idle', 'Fail-open left the shell transition active', result);
    await page.screenshot({ path: resolve(HANDOFF_CAPTURE_ROOT, 'fail-open.png') });
    return result;
  } catch (error) {
    await page.screenshot({ path: resolve(HANDOFF_CAPTURE_ROOT, 'fail-open-failure.png'), fullPage: true }).catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

async function runKaleidoscopeFinalFrameContract(browser) {
  const context = await browser.newContext({ viewport: { width: 2560, height: 1440 } });
  const page = await context.newPage();
  const scenario = PRIMARY_SCENARIOS[0];
  const results = [];
  try {
    await gotoScenario(page, scenario);
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
            && snapshot?.temporalMemoryFrames === 1;
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
        temporalMemoryFrames: coverage.snapshot?.temporalMemoryFrames,
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
    assertAtmosphereState(state, scenario, { qualities: ['low'], cadence: 24 });
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
    assertAtmosphereState(state, scenario, { qualities: ['low'], cadence: 24 });
    assert(state.snapshot.reducedMotion === true, 'Reduced Motion was not detected', state);
    assert(state.snapshot.temporalMemoryFrames === 0, 'Reduced Motion retained temporal glow memory', state);
    if (state.snapshot.status === 'ready') {
      assert(state.snapshot.scheduler === 'internal', 'Reduced Motion Contact source is not internally scheduled', state);
      assert(state.snapshot.internalRafCount === 0, 'Reduced Motion retained an active internal atmosphere RAF', state);
    }
    return {
      status: state.snapshot.status,
      temporalMemoryFrames: state.snapshot.temporalMemoryFrames,
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
      const resolvedCadence = snapshot.quality === 'low' ? 20 : expectedCadence;
      return snapshot.routeId === expectedRouteId
        && snapshot.cadence === resolvedCadence
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
          const expectedGlowRadiusCss = Math.max(
            GLOW_RADIUS_MIN_CSS_PX,
            Math.min(
              GLOW_RADIUS_MAX_CSS_PX,
              Math.min(state.wallRect.width, state.wallRect.height) * state.snapshot.largeSpread,
            ),
          );
          const expectedSmallGlowRadiusCss = Math.max(
            SMALL_GLOW_RADIUS_MIN_CSS_PX,
            Math.min(
              SMALL_GLOW_RADIUS_MAX_CSS_PX,
              Math.min(state.wallRect.width, state.wallRect.height)
                * state.snapshot.smallSpread,
            ),
          );
          assertAtmosphereState(state, scenario, {
            qualities: ['high', 'balanced', 'low'],
            cadence: profile.cadence,
            resolvedGlowRadiusCss: expectedGlowRadiusCss,
            resolvedSmallGlowRadiusCss: expectedSmallGlowRadiusCss,
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
            resolvedGlowRadiusCss: state.snapshot.resolvedGlowRadiusCss,
            resolvedSmallGlowRadiusCss: state.snapshot.resolvedSmallGlowRadiusCss,
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
    assert(state.snapshot.sourceKind === 'canvas', 'Crisp lab did not reuse the final-frame production path', state);
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
      const belowConfig = module.normalizeSimulationAtmosphereConfig({
        largeSpread: -2,
        smallSpread: -2,
        contentClearance: -2,
        memoryMs: -2,
        edgeStrength: -2,
        edgeWidthPx: -2,
        edgeInsetPx: -2,
        light: { intensity: -2, colourStrength: -2 },
      });
      const aboveConfig = module.normalizeSimulationAtmosphereConfig({
        largeSpread: 9,
        smallSpread: 9,
        contentClearance: 9,
        memoryMs: 9000,
        edgeStrength: 9,
        edgeWidthPx: 9,
        edgeInsetPx: 90,
        dark: { intensity: 9, colourStrength: 9, afterglowHalfLifeMs: 9000 },
      });
      return {
        below: belowConfig,
        above: aboveConfig,
        legacy: module.normalizeSimulationAtmosphereConfig({ spread: 0.12 }),
        legacyAfterglowRetired: !Object.hasOwn(aboveConfig.dark, 'afterglowHalfLifeMs'),
        legacyClearanceRetired: !Object.hasOwn(aboveConfig, 'contentClearance')
          && !Object.hasOwn(belowConfig, 'contentClearance'),
        legacySpreadRetired: !Object.hasOwn(aboveConfig, 'spread'),
      };
    });
    assert(
      clampResults.below.largeSpread === 0.06
        && clampResults.below.smallSpread === 0.02
        && clampResults.below.memoryMs === 0
        && clampResults.below.edgeStrength === 0
        && clampResults.below.edgeWidthPx === 0.5
        && clampResults.below.edgeInsetPx === 0
        && clampResults.below.light.intensity === 0
        && clampResults.below.light.colourStrength === 0
        && clampResults.above.largeSpread === 0.2
        && clampResults.above.smallSpread === 0.1
        && clampResults.above.memoryMs === 600
        && clampResults.above.edgeStrength === 1.5
        && clampResults.above.edgeWidthPx === 4
        && clampResults.above.edgeInsetPx === 24
        && clampResults.above.dark.intensity === 1
        && clampResults.above.dark.colourStrength === 1.6
        && clampResults.legacy.largeSpread === 0.12
        && Math.abs(clampResults.legacy.smallSpread - 0.0408) < 0.000001
        && clampResults.legacyAfterglowRetired
        && clampResults.legacyClearanceRetired
        && clampResults.legacySpreadRetired,
      'Diffuse atmosphere normalization ranges are wrong',
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

async function runHybridGlowLabContract(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  try {
    await page.goto(routeUrl('/lab/atmosphere-hybrid-glow.html?mode=pit&absAudit=1'), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForFunction(() => {
      const snapshot = window.__ABS_ATMOSPHERE_LAB__?.getSnapshot?.();
      return snapshot?.variant === 'hybridGlow'
        && snapshot.fieldMode === 'broad'
        && snapshot.updateCount > 1
        && snapshot.temporalMemoryFrames === 1;
    }, null, { timeout: WAIT_MS, polling: 'raf' });

    const initial = await page.evaluate(() => ({
      sharedHandlePresent: Boolean(window.__ABS_SIMULATION_ATMOSPHERE__),
      sharedGlowCount: document.querySelectorAll('#simulation-atmosphere-glow-canvas').length,
      sharedEdgeCount: document.querySelectorAll('#simulation-atmosphere-edge-light-canvas').length,
      outputCount: document.querySelectorAll('.atmosphere-hybrid-glow-output').length,
      legacyLayerGroupCount: document.querySelectorAll('.atmosphere-hybrid-glow-layer-group').length,
      legacyCrossfadeFrameCount: document.querySelectorAll(
        '.atmosphere-hybrid-glow-crossfade-frame',
      ).length,
      outputPresentation: (() => {
        const output = document.querySelector('.atmosphere-hybrid-glow-output');
        const style = output ? getComputedStyle(output) : null;
        return {
          animationCount: output?.getAnimations?.().length || 0,
          mixBlendMode: style?.mixBlendMode || '',
          opacity: style?.opacity || '',
          willChange: style?.willChange || '',
        };
      })(),
      snapshot: window.__ABS_ATMOSPHERE_LAB__.getSnapshot(),
    }));
    assert(initial.sharedHandlePresent === false, 'Hybrid Glow mounted the production compositor', initial);
    assert(
      initial.sharedGlowCount === 0 && initial.sharedEdgeCount === 0,
      'Hybrid Glow mounted shared production output canvases',
      initial,
    );
    assert(
      initial.outputCount === 1
        && initial.legacyLayerGroupCount === 0
        && initial.legacyCrossfadeFrameCount === 0,
      'Atmospheric Glow did not reduce to one visible output Canvas',
      initial,
    );
    assert(
      initial.snapshot.config.version === 13
        && JSON.stringify(Object.keys(initial.snapshot.config.profiles.hybridGlow).sort())
          === JSON.stringify(['glowCadence', 'glowStrength'])
        && initial.snapshot.fieldMode === 'broad'
        && initial.snapshot.glowCadence === 8
        && initial.snapshot.memoryMs > 0
        && initial.snapshot.memoryMs === initial.snapshot.renderProfile.memoryMs
        && initial.snapshot.temporalMemoryFrames === 1
        && initial.snapshot.displaySmoothing === 'temporal-memory',
      'Atmospheric Glow defaults do not describe the broad 8 FPS memory field',
      initial,
    );
    assert(
      initial.outputPresentation.animationCount === 0
        && initial.outputPresentation.mixBlendMode === 'normal'
        && initial.outputPresentation.opacity === '1'
        && initial.outputPresentation.willChange === 'auto',
      'Atmospheric Glow retained crossfade compositor work',
      initial,
    );

    const sampleCadence = async (cadence, durationMs) => {
      await page.locator('select[data-parameter-id="glowCadence"]').selectOption(cadence);
      await page.waitForFunction((expectedCadence) => (
        window.__ABS_ATMOSPHERE_LAB__?.getSnapshot?.().glowCadence === Number(expectedCadence)
      ), cadence, { timeout: WAIT_MS, polling: 'raf' });
      await page.waitForTimeout(400);
      const before = await page.evaluate(() => (
        window.__ABS_ATMOSPHERE_LAB__.getSnapshot().updateCount
      ));
      await page.waitForTimeout(durationMs);
      const after = await page.evaluate(() => (
        window.__ABS_ATMOSPHERE_LAB__.getSnapshot().updateCount
      ));
      return after - before;
    };
    const eightFpsUpdates = await sampleCadence('8', 2000);
    const twelveFpsUpdates = await sampleCadence('12', 1500);
    await page.locator('select[data-parameter-id="glowCadence"]').selectOption('8');
    assert(
      eightFpsUpdates >= 14 && eightFpsUpdates <= 20,
      'Atmospheric Glow did not hold the 8 FPS cadence',
      { eightFpsUpdates },
    );
    assert(
      twelveFpsUpdates >= 15 && twelveFpsUpdates <= 22,
      'Atmospheric Glow cadence control did not apply live',
      { twelveFpsUpdates },
    );

    return {
      renderer: initial.snapshot.renderer,
      quality: initial.snapshot.quality,
      scale: initial.snapshot.scale,
      fieldMode: initial.snapshot.fieldMode,
      memoryMs: initial.snapshot.memoryMs,
      eightFpsUpdates,
      twelveFpsUpdates,
      outputPresentation: initial.outputPresentation,
    };
  } finally {
    await context.close();
  }
}

async function runStatelessGlowContract(browser) {
  const context = await browser.newContext({ viewport: { width: 640, height: 480 } });
  const page = await context.newPage();
  try {
    await page.goto(routeUrl('/index.html?mode=pit&absAudit=1'), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    const result = await page.evaluate(async () => {
      const { DiffuseGlowEffect } = await import(
        '/src/legacy/modules/rendering/atmosphere/diffuse-glow-effect.js'
      );
      const { AtmosphereEdgeLight } = await import(
        '/src/legacy/modules/rendering/atmosphere/atmosphere-edge-light.js'
      );
      const {
        resolveSimulationAtmosphereCadence,
        shouldRenderSimulationAtmosphereFrame,
      } = await import(
        '/src/legacy/modules/rendering/atmosphere/simulation-atmosphere-config.js'
      );
      const automaticCadence = resolveSimulationAtmosphereCadence('auto');
      const sampleSchedule = (refreshRate, durationMs = 3000) => {
        const schedule = { nextFrameAt: 0 };
        const accepted = [];
        const sourceInterval = 1000 / refreshRate;
        for (let now = 0; now < durationMs; now += sourceInterval) {
          if (shouldRenderSimulationAtmosphereFrame(schedule, now, automaticCadence)) accepted.push(now);
        }
        const deltas = accepted.slice(1).map((time, index) => time - accepted[index]);
        return {
          count: accepted.length,
          meanDelta: deltas.reduce((sum, value) => sum + value, 0) / Math.max(1, deltas.length),
          maxDelta: Math.max(...deltas),
        };
      };
      const cadenceContract = {
        automaticCadence,
        sixtyHz: sampleSchedule(60),
        highRefresh: sampleSchedule(144),
      };
      const source = document.createElement('canvas');
      const output = document.createElement('canvas');
      source.width = 160;
      source.height = 64;
      output.width = 160;
      output.height = 64;
      const sourceContext = source.getContext('2d', { alpha: true });
      const outputContext = output.getContext('2d', { alpha: true, willReadFrequently: true });
      const effect = new DiffuseGlowEffect(output);
      const config = {
        intensity: 1,
        largeBlurRadiusBackingPx: 4,
        smallBlurRadiusBackingPx: 1.36,
        colourStrength: 1,
      };
      const paintSource = (x) => {
        sourceContext.clearRect(0, 0, source.width, source.height);
        sourceContext.fillStyle = '#00ff88';
        sourceContext.fillRect(x - 8, 24, 16, 16);
      };
      const readAlpha = (x) => outputContext.getImageData(x, 32, 1, 1).data[3];
      const readAlphaEnergy = () => {
        const pixels = outputContext.getImageData(0, 0, output.width, output.height).data;
        let total = 0;
        for (let index = 3; index < pixels.length; index += 4) total += pixels[index];
        return total;
      };

      paintSource(80);
      config.fieldMode = 'broad';
      effect.render({ sourceCanvas: source, config });
      const broadFieldEnergy = readAlphaEnergy();
      effect.clear();
      config.fieldMode = 'tight';
      effect.render({ sourceCanvas: source, config });
      const tightFieldEnergy = readAlphaEnergy();
      effect.clear();
      delete config.fieldMode;
      effect.render({ sourceCanvas: source, config });
      const combinedFieldEnergy = readAlphaEnergy();
      effect.clear();

      paintSource(24);
      effect.render({ sourceCanvas: source, config });
      const firstOldAlpha = readAlpha(24);
      paintSource(136);
      effect.render({ sourceCanvas: source, config });
      const secondOldAlpha = readAlpha(24);
      const secondNewAlpha = readAlpha(136);

      effect.clear();
      config.memoryMs = 100;
      paintSource(24);
      effect.render({ sourceCanvas: source, config, nowMs: 1000 });
      paintSource(136);
      effect.render({ sourceCanvas: source, config, nowMs: 1033 });
      const memoryOldAlpha = readAlpha(24);
      const memoryNewAlpha = readAlpha(136);
      paintSource(80);
      effect.render({ sourceCanvas: source, config, nowMs: 1066 });
      const memoryOldestAlpha = readAlpha(24);
      const memoryPreviousAlpha = readAlpha(136);
      const memoryCurrentAlpha = readAlpha(80);
      const temporalMemoryFrames = effect.temporalMemoryFrames;

      effect.clear();
      paintSource(80);
      effect.render({ sourceCanvas: source, config, nowMs: 2000 });
      const stationaryFirst = Array.from(outputContext.getImageData(80, 32, 1, 1).data);
      effect.render({ sourceCanvas: source, config, nowMs: 2027 });
      const stationaryEarly = Array.from(outputContext.getImageData(80, 32, 1, 1).data);
      effect.render({ sourceCanvas: source, config, nowMs: 2062 });
      const stationaryLate = Array.from(outputContext.getImageData(80, 32, 1, 1).data);

      effect.clear();
      paintSource(136);
      effect.render({ sourceCanvas: source, config, nowMs: 1099 });
      const resetOldAlpha = readAlpha(24);

      const legacyMask = document.createElement('canvas');
      legacyMask.width = source.width;
      legacyMask.height = source.height;
      legacyMask.getContext('2d').fillRect(0, 0, legacyMask.width, legacyMask.height);
      effect.clear();
      config.memoryMs = 0;
      sourceContext.clearRect(0, 0, source.width, source.height);
      sourceContext.fillStyle = '#00ff88';
      sourceContext.fillRect(0, 0, source.width, source.height);
      effect.render({ sourceCanvas: source, maskCanvas: legacyMask, config, nowMs: 1132 });
      const fullWallCenterAlpha = readAlpha(80);
      effect.destroy();

      const edgeOutput = document.createElement('canvas');
      edgeOutput.width = source.width;
      edgeOutput.height = source.height;
      sourceContext.clearRect(0, 0, source.width, source.height);
      sourceContext.fillStyle = '#00ff88';
      sourceContext.fillRect(0, 0, source.width, source.height);
      const edgeEffect = new AtmosphereEdgeLight(edgeOutput);
      edgeEffect.render(source, 1.2);
      const edgeContext = edgeOutput.getContext('2d', { alpha: true, willReadFrequently: true });
      const edgeAlpha = edgeContext.getImageData(0, 32, 1, 1).data[3];
      const centerAlpha = edgeContext.getImageData(80, 32, 1, 1).data[3];
      const cornerAlpha = edgeContext.getImageData(12, 12, 1, 1).data[3];
      const edgeDrawCallCount = edgeEffect.lastDrawCallCount;
      edgeEffect.destroy();
      return {
        firstOldAlpha,
        broadFieldEnergy,
        tightFieldEnergy,
        combinedFieldEnergy,
        secondOldAlpha,
        secondNewAlpha,
        memoryOldAlpha,
        memoryNewAlpha,
        memoryOldestAlpha,
        memoryPreviousAlpha,
        memoryCurrentAlpha,
        stationaryFirst,
        stationaryEarly,
        stationaryLate,
        resetOldAlpha,
        fullWallCenterAlpha,
        temporalMemoryFrames,
        edgeAlpha,
        centerAlpha,
        cornerAlpha,
        edgeDrawCallCount,
        cadenceContract,
      };
    });
    assert(result.firstOldAlpha > 20, 'Diffuse glow fixture did not render its first source', result);
    assert(
      result.broadFieldEnergy > 0
        && result.tightFieldEnergy > 0
        && result.combinedFieldEnergy > result.broadFieldEnergy
        && result.combinedFieldEnergy > result.tightFieldEnergy,
      'Diffuse glow field isolation did not exclude the unselected field',
      result,
    );
    assert(result.secondOldAlpha <= 1, 'Diffuse glow retained the previous source position', result);
    assert(result.secondNewAlpha > 20, 'Diffuse glow did not follow the current source position', result);
    assert(
      result.memoryOldAlpha > 20 && result.memoryOldAlpha < result.firstOldAlpha,
      'Short atmosphere memory did not preserve and decay the previous position',
      result,
    );
    assert(result.memoryNewAlpha > 20, 'Atmosphere memory obscured the current source position', result);
    assert(
      result.memoryOldestAlpha <= 1
        && result.memoryPreviousAlpha > 20
        && result.memoryCurrentAlpha > 20,
      'Atmosphere memory recursively retained positions older than the previous clean frame',
      result,
    );
    assert(result.temporalMemoryFrames === 1, 'Atmosphere memory allocated more than one history frame', result);
    assert(
      JSON.stringify(result.stationaryFirst) === JSON.stringify(result.stationaryEarly)
        && JSON.stringify(result.stationaryFirst) === JSON.stringify(result.stationaryLate),
      'Stationary atmosphere brightness changed with compositor frame-time jitter',
      result,
    );
    assert(result.resetOldAlpha <= 1, 'Atmosphere memory survived an explicit reset boundary', result);
    assert(
      result.fullWallCenterAlpha > 20,
      'Retired quiet-zone input still removed the middle of the atmosphere',
      result,
    );
    assert(result.edgeAlpha > 20, 'Edge response did not render its colour texture', result);
    assert(
      result.centerAlpha > 20 && result.cornerAlpha > 20 && result.edgeDrawCallCount === 2,
      'Edge colour texture is not continuous across straight, centre, and corner samples',
      result,
    );
    assert(
      result.cadenceContract.automaticCadence === 24
        && result.cadenceContract.sixtyHz.count >= 72
        && result.cadenceContract.sixtyHz.count <= 73
        && result.cadenceContract.sixtyHz.meanDelta > 41
        && result.cadenceContract.sixtyHz.meanDelta < 42
        && result.cadenceContract.sixtyHz.maxDelta < 51
        && result.cadenceContract.highRefresh.count >= 72
        && result.cadenceContract.highRefresh.count <= 73
        && result.cadenceContract.highRefresh.meanDelta > 41
        && result.cadenceContract.highRefresh.meanDelta < 42
        && result.cadenceContract.highRefresh.maxDelta < 43,
      'Atmosphere frame scheduling reintroduced cadence aliasing',
      result,
    );
    return result;
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
      'atmosphereLargeSpreadSlider',
      'atmosphereSmallSpreadSlider',
      'atmosphereMemoryMsSlider',
      ...['Light', 'Dark'].flatMap((theme) => [
        'Intensity',
        'ColourStrength',
      ].map((id) => `atmosphere${theme}${id}Slider`)),
    ];
    const state = await group.evaluate((node) => ({
      groupTitle: node.querySelector(':scope > summary')?.textContent
        ?.trim()
        .replace(/\s+/g, ' ') ?? null,
      sectionTitles: Array.from(node.querySelectorAll('.panel-section-accordion > summary'))
        .map((summary) => summary.textContent.trim().replace(/\s+/g, ' ')),
      controlIds: Array.from(node.querySelectorAll('input, select')).map((control) => control.id),
      intensityMaxima: ['Light', 'Dark'].map((theme) => (
        node.querySelector(`#atmosphere${theme}IntensitySlider`)?.max ?? null
      )),
    }));
    assert(
      state.groupTitle?.includes('Background Atmosphere'),
      'Glow controls are not grouped under the Background Atmosphere parent',
      state,
    );
    assert(
      JSON.stringify(state.controlIds) === JSON.stringify(expectedControlIds),
      'Background Atmosphere panel does not match the shared production control schema',
      state,
    );
    assert(
      JSON.stringify(state.intensityMaxima) === JSON.stringify(['1', '1']),
      'Background Atmosphere intensity must remain adjustable through 100%',
      state,
    );
    assert(
      state.sectionTitles.some((title) => title.includes('Glow Field'))
        && state.sectionTitles.some((title) => title.includes('Light Mode'))
        && state.sectionTitles.some((title) => title.includes('Dark Mode')),
      'Background Atmosphere panel is missing its glow-field or theme sections',
      state,
    );

    const edgeControl = page.locator('#atmosphereEdgeStrengthSlider');
    const edgeWidthControl = page.locator('#atmosphereEdgeWidthPxSlider');
    const edgeInsetControl = page.locator('#atmosphereEdgeInsetPxSlider');
    assert(
      await edgeControl.count() === 1,
      'Surface Finish must expose exactly one edge-strength control',
      { count: await edgeControl.count() },
    );
    assert(
      await edgeWidthControl.count() === 1,
      'Surface Finish must expose exactly one edge-thickness control',
      { count: await edgeWidthControl.count() },
    );
    assert(
      await edgeInsetControl.count() === 1,
      'Surface Finish must expose exactly one edge-inset control',
      { count: await edgeInsetControl.count() },
    );
    const readEdgeControlState = (control) => {
      const group = control.closest('details[data-group-id]');
      const section = control.closest('.panel-section-accordion');
      return {
        groupId: group?.dataset.groupId ?? null,
        sectionTitle: section?.querySelector(':scope > summary')?.textContent
          ?.trim()
          .replace(/\s+/g, ' ') ?? null,
        min: control.min,
        max: control.max,
        step: control.step,
      };
    };
    const edgeControlState = await edgeControl.evaluate(readEdgeControlState);
    const edgeWidthControlState = await edgeWidthControl.evaluate(readEdgeControlState);
    const edgeInsetControlState = await edgeInsetControl.evaluate(readEdgeControlState);
    assert(
      edgeControlState.groupId === 'finish'
        && edgeControlState.sectionTitle?.includes('Edge Response')
        && edgeWidthControlState.groupId === 'finish'
        && edgeWidthControlState.sectionTitle?.includes('Edge Response')
        && edgeInsetControlState.groupId === 'finish'
        && edgeInsetControlState.sectionTitle?.includes('Edge Response'),
      'Atmosphere edge controls are not grouped together with Surface Finish',
      { edgeControlState, edgeWidthControlState, edgeInsetControlState },
    );
    assert(
      edgeWidthControlState.min === '0.5'
        && edgeWidthControlState.max === '4'
        && edgeWidthControlState.step === '0.25',
      'Atmosphere edge-thickness control range is wrong',
      edgeWidthControlState,
    );
    assert(
      edgeInsetControlState.min === '0'
        && edgeInsetControlState.max === '24'
        && edgeInsetControlState.step === '1',
      'Atmosphere edge-inset control range is wrong',
      edgeInsetControlState,
    );

    const originalEdgeWidth = await edgeWidthControl.inputValue();
    await edgeWidthControl.evaluate((control) => {
      control.value = '4';
      control.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(async () => {
      const module = await import('/src/legacy/modules/rendering/atmosphere/simulation-atmosphere.js');
      const config = module.getSimulationAtmosphereConfig();
      const wall = document.getElementById('simulations');
      return config.edgeWidthPx === 4
        && getComputedStyle(wall).getPropertyValue('--atmosphere-edge-width').trim() === '4px';
    }, null, { timeout: WAIT_MS });
    await edgeWidthControl.evaluate((control, value) => {
      control.value = value;
      control.dispatchEvent(new Event('input', { bubbles: true }));
    }, originalEdgeWidth);

    const originalEdgeInset = await edgeInsetControl.inputValue();
    await edgeInsetControl.evaluate((control) => {
      control.value = '12';
      control.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(async () => {
      const module = await import('/src/legacy/modules/rendering/atmosphere/simulation-atmosphere.js');
      const config = module.getSimulationAtmosphereConfig();
      const wall = document.getElementById('simulations');
      const edgeLayer = wall?.querySelector(':scope > .simulation-atmosphere-edge-light-layer');
      if (!wall || !edgeLayer) return false;
      const wallRect = wall.getBoundingClientRect();
      const edgeRect = edgeLayer.getBoundingClientRect();
      return config.edgeInsetPx === 12
        && getComputedStyle(wall).getPropertyValue('--atmosphere-edge-inset').trim() === '12px'
        && Math.abs(edgeRect.left - wallRect.left - 12) <= 0.25
        && Math.abs(edgeRect.top - wallRect.top - 12) <= 0.25;
    }, null, { timeout: WAIT_MS });
    await edgeInsetControl.evaluate((control, value) => {
      control.value = value;
      control.dispatchEvent(new Event('input', { bubbles: true }));
    }, originalEdgeInset);

    await group.locator(':scope > summary').click();
    const globalSummary = group.locator('.panel-section-accordion > summary').first();
    const globalSection = globalSummary.locator('..');
    if ((await globalSection.getAttribute('open')) === null) await globalSummary.click();
    const largeSpreadSlider = page.locator('#atmosphereLargeSpreadSlider');
    const smallSpreadSlider = page.locator('#atmosphereSmallSpreadSlider');
    const memorySlider = page.locator('#atmosphereMemoryMsSlider');
    const originalLargeSpread = await largeSpreadSlider.inputValue();
    const originalSmallSpread = await smallSpreadSlider.inputValue();
    const originalMemory = await memorySlider.inputValue();
    await largeSpreadSlider.fill('0.12');
    await smallSpreadSlider.fill('0.04');
    await memorySlider.fill('175');
    await page.waitForFunction(async () => {
      const module = await import('/src/legacy/modules/rendering/atmosphere/simulation-atmosphere.js');
      const config = module.getSimulationAtmosphereConfig();
      return config.largeSpread === 0.12
        && config.smallSpread === 0.04
        && config.memoryMs === 175;
    }, null, { timeout: WAIT_MS });
    await largeSpreadSlider.fill(originalLargeSpread);
    await smallSpreadSlider.fill(originalSmallSpread);
    await memorySlider.fill(originalMemory);

    return {
      controlCount: state.controlIds.length,
      sectionTitles: state.sectionTitles,
      intensityMaxima: state.intensityMaxima,
      edgeControl: edgeControlState,
      edgeWidthControl: edgeWidthControlState,
      edgeInsetControl: edgeInsetControlState,
      spreadLiveApply: true,
      memoryLiveApply: true,
      edgeWidthLiveApply: true,
      edgeInsetLiveApply: true,
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
    const atomicHandoffs = shouldRun('handoff') || shouldRun('snapshot')
      ? await runAtomicHandoffContract(browser)
      : null;
    const failOpen = shouldRun('fail-open') ? await runAtmosphereFailOpenContract(browser) : null;
    const kaleidoscope = shouldRun('kaleidoscope') ? await runKaleidoscopeFinalFrameContract(browser) : null;
    const mobile = shouldRun('mobile') ? await runMobilePerformance(browser) : null;
    const reducedMotion = shouldRun('reduced') ? await runReducedMotion(browser) : null;
    const responsive = shouldRun('responsive') ? await runResponsiveResizeMatrix(browser) : null;
    const crispLab = shouldRun('crisp') ? await runCrispLabIsolation(browser) : null;
    const persistence = shouldRun('persistence') ? await runCrispPersistenceContract(browser) : null;
    const experimentalLab = shouldRun('experimental') ? await runExperimentalLabIsolation(browser) : null;
    const hybridLab = shouldRun('hybrid') ? await runHybridGlowLabContract(browser) : null;
    const stateless = shouldRun('stateless') ? await runStatelessGlowContract(browser) : null;
    const configPanel = shouldRun('panel') ? await runConfigPanelContract(browser) : null;
    const output = {
      ok: true,
      browser: BROWSER_NAME,
      origin: ORIGIN,
      directBoots,
      spaLifecycle,
      atomicHandoffs,
      failOpen,
      kaleidoscope,
      mobile,
      reducedMotion,
      responsive,
      crispLab,
      persistence,
      experimentalLab,
      hybridLab,
      stateless,
      configPanel,
    };
    await mkdir(HANDOFF_CAPTURE_ROOT, { recursive: true });
    await writeFile(resolve(HANDOFF_CAPTURE_ROOT, 'result.json'), `${JSON.stringify(output, null, 2)}\n`);
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
