#!/usr/bin/env node
import { chromium, webkit } from 'playwright';

const ORIGIN = String(process.env.ABS_DEV_URL || 'http://localhost:8012').replace(/\/+$/, '');
const WAIT_MS = Math.max(5000, Number(process.env.ABS_ATMOSPHERE_WAIT_MS || 45000));
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const ENFORCE_COST_BUDGET = process.env.ABS_ATMOSPHERE_ENFORCE_COST === '1';
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

if (!['chromium', 'webkit'].includes(BROWSER_NAME)) {
  throw new Error(`Unsupported ABS_BROWSER=${BROWSER_NAME}; use chromium or webkit.`);
}

const PRIMARY_SCENARIOS = Object.freeze([
  {
    id: 'home',
    path: '/index.html?mode=pit&absAudit=1',
    routeId: 'home',
    sourceIds: [/^home:legacy:\d+$/],
    sourceKinds: ['emitters'],
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
      const sourceMatches = acceptedIds.some((candidate) => (
        candidate.type === 'regexp'
          ? new RegExp(candidate.value).test(snapshot.activeSourceId)
          : candidate.value === snapshot.activeSourceId
      ));
      const statusReady = snapshot.status === 'ready'
        || (snapshot.status === 'failed-open' && Boolean(snapshot.failOpenReason));
      return (
        (root.dataset.absTransitionPhase || 'idle') === 'idle'
        && root.dataset.absBootState !== 'booting'
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
    await page.waitForFunction(() => {
      const snapshot = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.();
      return snapshot?.status === 'failed-open' || snapshot?.cost?.sampleCount >= 20;
    }, null, { timeout: WAIT_MS, polling: 50 });
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

async function runCrispLabIsolation(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.goto(routeUrl('/lab/atmosphere-crisp-glow.html?mode=bubbles&panel=0&absAudit=1'), {
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
    return {
      status: state.snapshot.status,
      scope: state.snapshot.scope,
      sourceId: state.snapshot.activeSourceId,
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
  const browser = await browserType.launch({ headless: process.env.ABS_HEADED !== '1' });
  try {
    const shouldRun = (phase) => PHASE_FILTER.size === 0 || PHASE_FILTER.has(phase);
    const directBoots = shouldRun('direct') ? await runDirectBootMatrix(browser) : null;
    const spaLifecycle = shouldRun('spa') ? await runSpaLifecycle(browser) : null;
    const mobile = shouldRun('mobile') ? await runMobilePerformance(browser) : null;
    const reducedMotion = shouldRun('reduced') ? await runReducedMotion(browser) : null;
    const crispLab = shouldRun('crisp') ? await runCrispLabIsolation(browser) : null;
    const experimentalLab = shouldRun('experimental') ? await runExperimentalLabIsolation(browser) : null;
    const configPanel = shouldRun('panel') ? await runConfigPanelContract(browser) : null;
    console.log(JSON.stringify({
      ok: true,
      browser: BROWSER_NAME,
      origin: ORIGIN,
      directBoots,
      spaLifecycle,
      mobile,
      reducedMotion,
      crispLab,
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
