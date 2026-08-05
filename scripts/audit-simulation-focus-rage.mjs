#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'simulation-focus-rage');
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');

const DEFAULT_URL = 'http://127.0.0.1:8013';
const WAIT_MS = Number(process.env.ABS_SIMULATION_FOCUS_RAGE_WAIT_MS || 45000);
const SAMPLE_MS = Number(process.env.ABS_SIMULATION_FOCUS_RAGE_SAMPLE_MS || 700);
const SAMPLE_INTERVAL_MS = Number(process.env.ABS_SIMULATION_FOCUS_RAGE_INTERVAL_MS || 35);
const STABILITY_MS = Number(process.env.ABS_SIMULATION_FOCUS_RAGE_STABILITY_MS || 900);
const RAGE_ATTEMPTS = Number(process.env.ABS_SIMULATION_FOCUS_RAGE_ATTEMPTS || 10);
const HEADLESS = process.env.ABS_SIMULATION_FOCUS_RAGE_HEADED !== '1';
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').trim().toLowerCase();
const STORAGE_KEY = 'abs_simulation_focus_choice_v1';
const RELOAD_STORAGE_KEY = 'abs_simulation_reload_choice_v1';
const BLOCKED_PARAMS = ['daily', 'focus', 'mode', 'simulation'];

const VIEWPORTS = Object.freeze([
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'compact', width: 390, height: 844, hasTouch: true },
]);

const RAGE_CASE_IDS = Object.freeze([
  ['flock-of-birds', 'flubber-blob', '3d-cube'],
  ['flock-of-birds', '3d-cube', 'flubber-blob'],
  ['magnetic', 'kaleidoscope-3', '3d-sphere'],
  ['starfield-3d', '3d-sphere', 'kaleidoscope-3'],
  ['flubber-blob', 'particle-fountain-b', 'repel-room'],
  ['3d-sphere', 'repel-room', 'flubber-blob'],
]);

function resolveOrigin() {
  const raw = String(process.env.ABS_DEV_URL || DEFAULT_URL).trim() || DEFAULT_URL;
  const url = new URL(raw);
  return url.origin;
}

function resolveUrl(pathname = '/index.html') {
  const url = new URL(pathname, resolveOrigin());
  if ((url.pathname === '/' || url.pathname.endsWith('/index.html')) && !url.searchParams.has('absAudit')) {
    url.searchParams.set('absAudit', '1');
  }
  return url.toString();
}

function resolveEntryUrl(entry) {
  const href = entry.dailyHref || entry.launchPath || `/index.html?focus=${encodeURIComponent(entry.id)}`;
  const url = new URL(href, resolveOrigin());
  url.searchParams.set('absAudit', '1');
  return url.toString();
}

function getBrowserType() {
  if (BROWSER_NAME === 'webkit') return webkit;
  if (BROWSER_NAME === 'chromium') return chromium;
  throw new Error(`Unsupported ABS_BROWSER "${BROWSER_NAME}". Expected chromium or webkit.`);
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

function buildEntriesById(catalog) {
  return new Map(
    catalog.simulations
      .filter((entry) => entry.stage === 'daily-rotation')
      .map((entry) => [entry.id, entry]),
  );
}

function readStateExpression() {
  return () => {
    const root = document.documentElement;
    const switcher = document.querySelector('.simulation-focus-switcher');
    const switcherRect = switcher?.getBoundingClientRect?.() || null;
    const switcherStyles = switcher ? getComputedStyle(switcher) : null;
    const dailyLayer = document.querySelector('.daily-simulation-layer');
    let homeMode = null;
    try {
      homeMode = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.()?.mode || null;
    } catch {
      homeMode = null;
    }

    const url = new URL(window.location.href);
    const rawStorage = window.sessionStorage.getItem('abs_simulation_focus_choice_v1');
    let storedChoice = null;
    try {
      storedChoice = rawStorage ? JSON.parse(rawStorage) : null;
    } catch {
      storedChoice = { parseError: true, raw: rawStorage };
    }

    const switcherVisible = Boolean(
      switcher
      && switcherRect
      && switcherRect.width > 0
      && switcherRect.height > 0
      && switcherStyles?.display !== 'none'
      && switcherStyles?.visibility !== 'hidden'
      && switcherStyles?.pointerEvents !== 'none'
      && Number.parseFloat(switcherStyles?.opacity || '1') > 0.02
    );

    return {
      href: window.location.href,
      pathname: url.pathname,
      blockedParams: ['daily', 'focus', 'mode', 'simulation'].filter((param) => url.searchParams.has(param)),
      transitionPhase: root.dataset.absTransitionPhase || 'idle',
      simulationFocusPhase: root.dataset.absSimulationFocusTransition || 'idle',
      shellRoute: root.dataset.shellRoute || '',
      bootState: root.dataset.absBootState || '',
      bootOverlayPresent: Boolean(document.getElementById('abs-boot-overlay')),
      modalActive: Boolean(document.querySelector('.simulation-focus-modal.active')),
      modalOpenClass: root.classList.contains('simulation-focus-modal-open'),
      switcherId: switcher?.dataset.simulationId || '',
      switcherText: switcher?.textContent?.trim() || '',
      switcherDisabled: Boolean(switcher?.disabled),
      switcherBusy: switcher?.getAttribute('aria-busy') || '',
      switcherVisible,
      dailyLayerId: dailyLayer?.dataset.simulationId || '',
      homeMode,
      activeRuntimeId: dailyLayer?.dataset.simulationId || homeMode || '',
      storedChoice,
      storedChoiceId: storedChoice?.simulationId || '',
      switchState: window.__ABS_SIMULATION_SWITCH__ || null,
      switchTransaction: window.__ABS_SIMULATION_SWITCH_TRANSACTION__ || null,
    };
  };
}

async function getState(page) {
  return page.evaluate(readStateExpression());
}

async function waitForIdle(page) {
  await page.waitForFunction(
    () => (
      (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
      && (document.documentElement.dataset.absSimulationFocusTransition || 'idle') === 'idle'
      && (document.documentElement.dataset.absBootState || '') !== 'booting'
      && !document.documentElement.classList.contains('simulation-focus-modal-open')
      && !document.querySelector('.simulation-focus-modal.active')
      && !document.getElementById('abs-boot-overlay')
    ),
    null,
    { timeout: WAIT_MS, polling: 50 },
  );
}

async function waitForConsistentFocus(page, entry, options = {}) {
  const {
    requireCleanUrl = true,
    requireStoredChoice = true,
  } = options;
  await page.waitForFunction(
    ({ id, name, surface, blockedParams, requireCleanUrl: shouldRequireCleanUrl, requireStoredChoice: shouldRequireStoredChoice }) => {
      const state = (() => {
        const root = document.documentElement;
        const switcher = document.querySelector('.simulation-focus-switcher');
        const dailyLayer = document.querySelector('.daily-simulation-layer');
        let homeMode = null;
        try {
          homeMode = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.()?.mode || null;
        } catch {
          homeMode = null;
        }
        const url = new URL(window.location.href);
        const rawStorage = window.sessionStorage.getItem('abs_simulation_focus_choice_v1');
        let storedChoice = null;
        try {
          storedChoice = rawStorage ? JSON.parse(rawStorage) : null;
        } catch {
          storedChoice = null;
        }
        return {
          blockedParams: blockedParams.filter((param) => url.searchParams.has(param)),
          pathname: url.pathname,
          transitionPhase: root.dataset.absTransitionPhase || 'idle',
          simulationFocusPhase: root.dataset.absSimulationFocusTransition || 'idle',
          bootState: root.dataset.absBootState || '',
          bootOverlayPresent: Boolean(document.getElementById('abs-boot-overlay')),
          modalActive: Boolean(document.querySelector('.simulation-focus-modal.active')),
          switcherId: switcher?.dataset.simulationId || '',
          switcherText: switcher?.textContent?.trim() || '',
          switcherDisabled: Boolean(switcher?.disabled),
          dailyLayerId: dailyLayer?.dataset.simulationId || '',
          homeMode,
          storedChoiceId: storedChoice?.simulationId || '',
        };
      })();

      const runtimeMatches = surface === 'home-mode'
        ? !state.dailyLayerId && state.homeMode === id
        : state.dailyLayerId === id;

      return (
        state.transitionPhase === 'idle'
        && state.simulationFocusPhase === 'idle'
        && state.bootState !== 'booting'
        && !state.bootOverlayPresent
        && !state.modalActive
        && !state.switcherDisabled
        && state.switcherId === id
        && state.switcherText.includes(name)
        && runtimeMatches
        && (!shouldRequireStoredChoice || state.storedChoiceId === id)
        && (!shouldRequireCleanUrl || (!state.pathname.startsWith('/lab/') && state.blockedParams.length === 0))
      );
    },
    {
      id: entry.id,
      name: entry.name,
      surface: entry.surface,
      blockedParams: BLOCKED_PARAMS,
      requireCleanUrl,
      requireStoredChoice,
    },
    { timeout: WAIT_MS, polling: 50 },
  );
}

async function loadFocus(page, entry) {
  await page.goto(resolveEntryUrl(entry), {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });
  await waitForConsistentFocus(page, entry, {
    requireCleanUrl: false,
    requireStoredChoice: false,
  });
}

async function openChooser(page) {
  await page.locator('.simulation-focus-switcher').click({ timeout: WAIT_MS });
  await page.waitForSelector('.simulation-focus-modal.active', { timeout: WAIT_MS });
}

async function clickChooserEntry(page, entry) {
  const target = page.locator('.simulation-focus-modal.active .simulation-focus-row').filter({ hasText: entry.name });
  const count = await target.count();
  if (count !== 1) throw new Error(`Expected one chooser row for "${entry.name}", got ${count}`);
  await target.first().click({ timeout: WAIT_MS });
}

function analyzeSample(state, targetEntry) {
  const issues = [];
  const chooserOnlyPhase = state.modalActive
    || state.modalOpenClass
    || state.transitionPhase === 'modal-open';
  if (state.bootOverlayPresent && !chooserOnlyPhase) {
    issues.push('boot-overlay-during-switch');
  }
  if (
    state.switchTransaction?.busy
    && state.switchTransaction.targetSimulationId === targetEntry.id
    && (
      state.switcherId !== targetEntry.id
      || !state.switcherText.includes(targetEntry.name)
    )
  ) {
    issues.push(`accepted-target-label-lag:${state.switcherId || 'none'}-while-target-${targetEntry.id}`);
  }
  if (
    state.switchState?.status === 'ready'
    && state.switchState?.simulationId
    && state.switchState.simulationId !== state.activeRuntimeId
  ) {
    issues.push(`ready-published-before-runtime:${state.switchState.simulationId}-while-runtime-${state.activeRuntimeId || 'none'}`);
  }
  if (
    state.storedChoiceId
    && state.activeRuntimeId
    && state.storedChoiceId !== state.activeRuntimeId
    && state.simulationFocusPhase === 'idle'
  ) {
    issues.push(`settled-storage-runtime-mismatch:${state.storedChoiceId}-while-runtime-${state.activeRuntimeId}`);
  }
  if (
    state.switcherVisible
    && !state.switcherDisabled
    && state.simulationFocusPhase !== 'idle'
    && state.activeRuntimeId !== targetEntry.id
  ) {
    issues.push(`switcher-enabled-during-transition:${state.simulationFocusPhase}`);
  }
  return issues;
}

async function sampleInFlight(page, targetEntry) {
  const samples = [];
  const startedAt = Date.now();
  while (Date.now() - startedAt < SAMPLE_MS) {
    const elapsedMs = Date.now() - startedAt;
    const state = await getState(page);
    samples.push({
      elapsedMs,
      ...state,
      issues: analyzeSample(state, targetEntry),
    });
    await sleep(SAMPLE_INTERVAL_MS);
  }
  return samples;
}

async function attemptRageInput(page, alternateEntry) {
  const before = await getState(page);
  if (before.switcherDisabled || before.simulationFocusPhase !== 'idle' || before.transitionPhase !== 'idle') {
    return { accepted: false, reason: 'busy-blocked', before };
  }

  try {
    await page.locator('.simulation-focus-switcher').click({ timeout: 650 });
    await page.waitForSelector('.simulation-focus-modal.active', { timeout: 650 });
    await clickChooserEntry(page, alternateEntry);
    return { accepted: true, reason: 'accepted', before, after: await getState(page) };
  } catch (error) {
    return {
      accepted: false,
      reason: 'click-rejected',
      message: error?.message || String(error),
      before,
      after: await getState(page),
    };
  }
}

async function rageWhileSwitching(page, alternateEntry) {
  const attempts = [];
  for (let index = 0; index < RAGE_ATTEMPTS; index += 1) {
    attempts.push(await attemptRageInput(page, alternateEntry));
    await sleep(SAMPLE_INTERVAL_MS);
  }
  return attempts;
}

async function assertStableFocus(page, entry) {
  const snapshots = [];
  const startedAt = Date.now();
  while (Date.now() - startedAt < STABILITY_MS) {
    await waitForConsistentFocus(page, entry);
    snapshots.push(await getState(page));
    await sleep(Math.min(75, SAMPLE_INTERVAL_MS * 2));
  }
  return snapshots;
}

async function runCase(page, testCase) {
  await loadFocus(page, testCase.start);
  await waitForIdle(page);

  await openChooser(page);
  await clickChooserEntry(page, testCase.target);
  const [samples, rageAttempts] = await Promise.all([
    sampleInFlight(page, testCase.target),
    rageWhileSwitching(page, testCase.alternate),
  ]);

  await waitForConsistentFocus(page, testCase.target);
  await waitForIdle(page);
  const stableSnapshots = await assertStableFocus(page, testCase.target);
  const finalState = await getState(page);

  const sampleIssues = samples.flatMap((sample) => sample.issues.map((issue) => ({
    issue,
    elapsedMs: sample.elapsedMs,
    state: sample,
  })));
  const acceptedRageAttempts = rageAttempts.filter((attempt) => attempt.accepted);
  const finalIssues = analyzeSample(finalState, testCase.target);
  if (finalState.switcherId !== testCase.target.id) {
    finalIssues.push(`final-switcher-mismatch:${finalState.switcherId || 'none'}`);
  }
  if (finalState.activeRuntimeId !== testCase.target.id) {
    finalIssues.push(`final-runtime-mismatch:${finalState.activeRuntimeId || 'none'}`);
  }
  if (finalState.storedChoiceId !== testCase.target.id) {
    finalIssues.push(`final-storage-mismatch:${finalState.storedChoiceId || 'none'}`);
  }
  if (acceptedRageAttempts.length > 0) {
    finalIssues.push(`rage-input-accepted-during-unsettled-switch:${acceptedRageAttempts.length}`);
  }

  return {
    name: `${testCase.start.id}-to-${testCase.target.id}`,
    start: { id: testCase.start.id, name: testCase.start.name, surface: testCase.start.surface },
    target: { id: testCase.target.id, name: testCase.target.name, surface: testCase.target.surface },
    alternate: { id: testCase.alternate.id, name: testCase.alternate.name, surface: testCase.alternate.surface },
    samples,
    rageAttempts,
    stableSnapshots,
    finalState,
    issues: sampleIssues.concat(finalIssues.map((issue) => ({ issue, state: finalState }))),
  };
}

async function runViewport(browser, viewport, testCases) {
  const pageErrors = [];
  const consoleErrors = [];
  const consoleWarnings = [];
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    hasTouch: Boolean(viewport.hasTouch),
  });
  page.on('pageerror', (error) => {
    pageErrors.push(error?.stack || error?.message || String(error));
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      consoleErrors.push(`${message.type()}: ${message.text()}`);
    } else if (message.type() === 'warning') {
      consoleWarnings.push(`${message.type()}: ${message.text()}`);
    }
  });
  await page.addInitScript(({ reloadStorageKey, storageKey }) => {
    window.sessionStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(reloadStorageKey);
  }, { reloadStorageKey: RELOAD_STORAGE_KEY, storageKey: STORAGE_KEY });

  try {
    const cases = [];
    for (const testCase of testCases) {
      cases.push(await runCase(page, testCase));
    }
    return {
      viewport,
      pageErrors,
      consoleErrors,
      consoleWarnings,
      cases,
      issues: cases.flatMap((testCase) => testCase.issues.map((issue) => ({
        case: testCase.name,
        ...issue,
      }))).concat(
        pageErrors.map((message) => ({ issue: 'page-error', message })),
        consoleErrors.map((message) => ({ issue: 'console-error', message })),
      ),
    };
  } finally {
    await page.close();
  }
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const entriesById = buildEntriesById(catalog);
  const testCases = RAGE_CASE_IDS.map(([startId, targetId, alternateId]) => {
    const start = entriesById.get(startId);
    const target = entriesById.get(targetId);
    const alternate = entriesById.get(alternateId);
    if (!start || !target || !alternate) {
      throw new Error(`Missing rage case catalog entry: ${[startId, targetId, alternateId].join(', ')}`);
    }
    return { start, target, alternate };
  });

  const browser = await getBrowserType().launch({ headless: HEADLESS });
  try {
    const viewports = [];
    for (const viewport of VIEWPORTS) {
      viewports.push(await runViewport(browser, viewport, testCases));
    }

    const report = {
      ok: viewports.every((viewport) => viewport.issues.length === 0),
      browserName: BROWSER_NAME,
      origin: resolveOrigin(),
      waitMs: WAIT_MS,
      sampleMs: SAMPLE_MS,
      sampleIntervalMs: SAMPLE_INTERVAL_MS,
      rageAttempts: RAGE_ATTEMPTS,
      outputRoot,
      viewports,
    };
    const reportPath = resolve(outputRoot, `report-${BROWSER_NAME}.json`);
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

    if (!report.ok) {
      console.error(JSON.stringify({
        ok: false,
        browserName: BROWSER_NAME,
        reportPath,
        issues: viewports.flatMap((viewport) => viewport.issues.map((issue) => ({
          viewport: viewport.viewport.name,
          ...issue,
        }))),
      }, null, 2));
      process.exit(1);
    }

    console.log(JSON.stringify({
      ok: true,
      browserName: BROWSER_NAME,
      reportPath,
      viewports: viewports.map((viewport) => ({
        name: viewport.viewport.name,
        cases: viewport.cases.length,
        blockedRageAttempts: viewport.cases.reduce((sum, testCase) => (
          sum + testCase.rageAttempts.filter((attempt) => attempt.reason === 'busy-blocked').length
        ), 0),
      })),
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
