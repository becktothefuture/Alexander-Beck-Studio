#!/usr/bin/env node
// Default: 64 core traces (2 browsers × 2 viewports × 2 themes × 2 motion
// profiles × 4 topologies), one rapid-input probe per profile, and three fresh-
// context fault probes per browser. Deterministic comma-separated filters:
//   ABS_LIFECYCLE_BROWSER=chromium|webkit|all (ABS_BROWSER is also accepted)
//   ABS_LIFECYCLE_VIEWPORT=desktop|mobile|all
//   ABS_LIFECYCLE_THEME=light|dark|all
//   ABS_LIFECYCLE_MOTION=normal|reduced|all
//   ABS_LIFECYCLE_TOPOLOGY=home-mode-to-home-mode|home-mode-to-route-backed|
//     route-backed-to-home-mode|route-backed-to-route-backed|all
//   ABS_LIFECYCLE_FLOW=foundation-to-scaffold,...|all
// Harness controls: ABS_DEV_URL, ABS_LIFECYCLE_WAIT_MS,
// ABS_LIFECYCLE_HEADED=1, ABS_LIFECYCLE_SKIP_RAPID=1,
// ABS_LIFECYCLE_SKIP_FAULTS=1, ABS_LIFECYCLE_SKIP_CORE=1.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import {
  aggregateGeometrySamples,
  analyzeFaultEvidence,
} from './simulation-switch-lifecycle-analysis.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputRoot = resolve(repoRoot, 'output/playwright/simulation-switch-lifecycle');
const runId = safeName(`run-${new Date().toISOString()}-${process.pid}`);
const runOutputDir = resolve(outputRoot, runId);
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');
const baseUrl = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').replace(/\/$/, '');
const waitMs = Number(process.env.ABS_LIFECYCLE_WAIT_MS || 30000);
const headed = process.env.ABS_LIFECYCLE_HEADED === '1';
const skipFaults = process.env.ABS_LIFECYCLE_SKIP_FAULTS === '1';
const skipCore = process.env.ABS_LIFECYCLE_SKIP_CORE === '1';
const skipRapid = process.env.ABS_LIFECYCLE_SKIP_RAPID === '1';
const expectedPhases = Object.freeze(['idle', 'prepare', 'out', 'commit', 'prime', 'in', 'idle']);
const blockedUrlParams = Object.freeze(['daily', 'focus', 'mode', 'simulation']);

const dimensions = Object.freeze({
  browser: Object.freeze(['chromium', 'webkit']),
  viewport: Object.freeze(['desktop', 'mobile']),
  theme: Object.freeze(['light', 'dark']),
  motion: Object.freeze(['normal', 'reduced']),
});

const viewports = Object.freeze({
  desktop: Object.freeze({ width: 1440, height: 900 }),
  mobile: Object.freeze({ width: 390, height: 844, isMobile: true, hasTouch: true }),
});

const coreFlows = Object.freeze([
  Object.freeze({ name: 'foundation-to-scaffold', from: 'pit', to: '3d-cube', topology: 'home-mode-to-home-mode' }),
  Object.freeze({ name: 'flow-to-tension', from: 'water', to: 'repel-room', topology: 'home-mode-to-route-backed' }),
  Object.freeze({ name: 'tension-to-multiplicity', from: 'repel-room', to: 'kaleidoscope-rift', topology: 'route-backed-to-home-mode' }),
  Object.freeze({ name: 'tension-to-convergence', from: 'repel-room', to: 'flock-of-birds', topology: 'route-backed-to-route-backed' }),
]);

function csvFilter(name, values, aliases = {}, fallback = '') {
  const raw = String(process.env[name] || fallback || 'all').trim().toLowerCase();
  if (!raw || raw === 'all' || raw === '*') return [...values];
  const requested = raw.split(',').map((value) => aliases[value.trim()] || value.trim()).filter(Boolean);
  const invalid = requested.filter((value) => !values.includes(value));
  if (invalid.length) throw new Error(`${name} has unsupported value(s): ${invalid.join(', ')}. Expected ${values.join(', ')} or all.`);
  return [...new Set(requested)];
}

function selectedFlows() {
  const topology = String(process.env.ABS_LIFECYCLE_TOPOLOGY || 'all').trim().toLowerCase();
  const names = String(process.env.ABS_LIFECYCLE_FLOW || 'all').trim().toLowerCase();
  const selectedNames = names === 'all' || names === '*'
    ? null
    : new Set(names.split(',').map((value) => value.trim()).filter(Boolean));
  const flows = coreFlows.filter((flow) => (
    (topology === 'all' || topology === '*' || flow.topology === topology)
    && (!selectedNames || selectedNames.has(flow.name) || selectedNames.has(`${flow.from}-to-${flow.to}`))
  ));
  if (!flows.length) throw new Error('ABS_LIFECYCLE_FLOW/TOPOLOGY selected no core traces.');
  return flows;
}

function browserType(name) {
  return name === 'webkit' ? webkit : chromium;
}

function safeName(value) {
  return String(value).replace(/[^a-z0-9-_]+/gi, '-').replace(/-+/g, '-').replace(/(^-|-$)/g, '').toLowerCase();
}

function pageUrl(pathname) {
  return new URL(pathname, `${baseUrl}/`).toString();
}

function isRepelRoomRuntimeRequest(url) {
  let pathname = String(url);
  try {
    pathname = new URL(url).pathname;
  } catch {
    // Fall back to the raw request URL for malformed diagnostic input.
  }
  return /\/RepelRoomRuntime(?:-[^/]+)?\.(?:jsx?|tsx?)$/i.test(pathname);
}

function entryUrl(entry) {
  const url = new URL(entry.surface === 'lab-route'
    ? entry.dailyHref
    : `/index.html?mode=${encodeURIComponent(entry.id)}`, `${baseUrl}/`);
  url.searchParams.set('absAudit', '1');
  return url.toString();
}

function compactError(error) {
  return error instanceof Error ? error.message : String(error);
}

async function waitForServer() {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 10000) {
    try {
      const response = await fetch(pageUrl('/index.html'));
      if (response.ok) return;
    } catch {
      // Keep polling the explicitly supplied authoring server.
    }
    await new Promise((resolveWait) => setTimeout(resolveWait, 150));
  }
  throw new Error(`Simulation lifecycle audit server unavailable at ${baseUrl}`);
}

function instrumentation() {
  const state = {
    recording: false,
    phaseEvents: [],
    frames: [],
    switchEvents: [],
    storageEvents: [],
    historyEvents: [],
    titleEvents: [],
    runtimeEvents: [],
    startedAt: 0,
    titleNode: null,
    rafId: 0,
  };
  window.__ABS_SIMULATION_LIFECYCLE_AUDIT__ = state;

  const rect = (element) => {
    if (!element) return null;
    const box = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      centerX: box.left + box.width / 2,
      centerY: box.top + box.height / 2,
      opacity: Number.parseFloat(style.opacity || '1'),
      visibility: style.visibility,
      display: style.display,
      transform: style.transform,
      transformOrigin: style.transformOrigin,
    };
  };
  const runtimeId = () => {
    try {
      return document.querySelector('.daily-simulation-layer')?.dataset.simulationId
        || window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.()?.mode
        || '';
    } catch {
      return document.querySelector('.daily-simulation-layer')?.dataset.simulationId || '';
    }
  };
  const canvasState = () => Array.from(document.querySelectorAll('canvas')).flatMap((canvas) => {
    if (
      canvas.id === 'simulation-title-canvas'
      || canvas.id.startsWith('simulation-atmosphere-')
      || canvas.closest('#scene-effects')
    ) return [];
    const box = canvas.getBoundingClientRect();
    const style = getComputedStyle(canvas);
    if (box.width < 16 || box.height < 16 || style.display === 'none' || style.visibility === 'hidden') return [];
    const owner = canvas.closest('[data-simulation-id]')?.dataset.simulationId || runtimeId();
    return [{ id: canvas.id || canvas.className || 'canvas', owner, opacity: Number.parseFloat(style.opacity || '1') }];
  });
  const snapshot = (source, detail = null) => {
    if (!state.recording) return;
    const root = document.documentElement;
    const title = document.getElementById('simulation-title-canvas');
    if (!state.titleNode && title) state.titleNode = title;
    let atmosphere = null;
    try { atmosphere = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.() || null; } catch { atmosphere = { snapshotError: true }; }
    const visual = window.__ABS_SIMULATION_VISUAL_TRANSITION__ || null;
    const transaction = window.__ABS_SIMULATION_SWITCH_TRANSACTION__ || null;
    state.frames.push({
      source,
      at: performance.now(),
      detail,
      phase: root.dataset.absSimulationFocusTransition || transaction?.phase || 'idle',
      routePhase: root.dataset.absTransitionPhase || 'idle',
      href: location.href,
      runtimeId: runtimeId(),
      runtime: window.__ABS_RUNTIME_LIFECYCLE__ || null,
      dailyRuntimeLoad: window.__ABS_DAILY_RUNTIME_LOAD__ || null,
      transaction,
      atmosphere,
      visual: visual ? {
        phase: visual.phase || '',
        direction: visual.direction || '',
        minScale: Number(visual.minScale),
        maxScale: Number(visual.maxScale),
        visibleRatio: Number(visual.visibleRatio),
        count: Number(visual.count),
      } : null,
      canvases: canvasState(),
      title: {
        present: Boolean(title),
        sameNode: Boolean(title && title === state.titleNode),
        rect: rect(title),
        backingWidth: Number(title?.width || 0),
        backingHeight: Number(title?.height || 0),
        identity: title?.dataset.titlePlaneIdentity || '',
        ready: title?.dataset.titlePlaneReady || '',
        renderRevision: Number(title?.dataset.titlePlaneRenderRevision || 0),
        devicePixelRatio: Number(window.devicePixelRatio || 1),
        computedTransform: title ? getComputedStyle(title).transform : 'none',
      },
      shell: {
        simulations: rect(document.getElementById('simulations')),
        buttonBar: rect(document.querySelector('[data-button-bar]')),
        switcher: rect(document.querySelector('.simulation-focus-switcher')),
        hero: rect(document.getElementById('hero-title')),
        description: rect(document.querySelector('.decorative-script')),
        footer: rect(document.querySelector('.ui-bottom')),
      },
      boot: {
        state: root.dataset.absBootState || '',
        overlay: Boolean(document.getElementById('abs-boot-overlay')),
        postBootPending: root.classList.contains('abs-home-post-boot-pending'),
        postBootEnter: root.classList.contains('abs-home-post-boot-enter'),
      },
    });
  };
  const phase = (source, detail = null) => {
    if (!state.recording) return;
    const value = document.documentElement.dataset.absSimulationFocusTransition
      || window.__ABS_SIMULATION_SWITCH_TRANSACTION__?.phase
      || 'idle';
    const previous = state.phaseEvents.at(-1);
    if (previous?.phase !== value) state.phaseEvents.push({ phase: value, at: performance.now(), source, detail });
    snapshot(`phase:${source}`, detail);
  };

  const installRootObserver = () => {
    if (!document.documentElement) return;
    new MutationObserver(() => phase('mutation')).observe(document.documentElement, {
      attributes: true,
      attributeFilter: [
        'data-abs-simulation-focus-transition',
        'data-abs-transition-phase',
        'data-abs-runtime-generation',
        'data-abs-runtime-status',
        'class',
      ],
    });
  };
  if (document.documentElement) installRootObserver();
  else document.addEventListener('DOMContentLoaded', installRootObserver, { once: true });
  window.addEventListener('abs:simulation-switch-state', (event) => {
    if (!state.recording) return;
    state.switchEvents.push({ at: performance.now(), detail: event.detail });
    phase('switch-event', event.detail);
  });
  window.addEventListener('abs:simulation-title-plane-rendered', (event) => {
    if (state.recording) state.titleEvents.push({ at: performance.now(), detail: event.detail });
  });
  window.addEventListener('abs:daily-runtime-load', (event) => {
    if (state.recording) state.runtimeEvents.push({ at: performance.now(), detail: event.detail });
  });

  for (const method of ['pushState', 'replaceState']) {
    const original = history[method].bind(history);
    history[method] = (...args) => {
      const result = original(...args);
      if (state.recording) state.historyEvents.push({ method, at: performance.now(), href: location.href });
      return result;
    };
  }
  const originalSetItem = Storage.prototype.setItem;
  Storage.prototype.setItem = function patchedSetItem(key, value) {
    const result = originalSetItem.call(this, key, value);
    if (state.recording) state.storageEvents.push({ at: performance.now(), key: String(key), value: String(value) });
    return result;
  };

  const tick = () => {
    snapshot('raf');
    state.rafId = requestAnimationFrame(tick);
  };
  state.rafId = requestAnimationFrame(tick);
  state.start = () => {
    state.recording = true;
    state.phaseEvents.length = 0;
    state.frames.length = 0;
    state.switchEvents.length = 0;
    state.storageEvents.length = 0;
    state.historyEvents.length = 0;
    state.titleEvents.length = 0;
    state.runtimeEvents.length = 0;
    state.startedAt = performance.now();
    state.titleNode = document.getElementById('simulation-title-canvas');
    phase('start');
  };
  state.stop = () => {
    phase('stop');
    state.recording = false;
    return {
      phaseEvents: [...state.phaseEvents],
      frames: [...state.frames],
      switchEvents: [...state.switchEvents],
      storageEvents: [...state.storageEvents],
      historyEvents: [...state.historyEvents],
      titleEvents: [...state.titleEvents],
      runtimeEvents: [...state.runtimeEvents],
    };
  };
}

async function waitForSettledSimulation(page, simulationId) {
  await page.waitForFunction((id) => {
    const root = document.documentElement;
    let homeMode = '';
    try { homeMode = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.()?.mode || ''; } catch { homeMode = ''; }
    const current = document.querySelector('.daily-simulation-layer')?.dataset.simulationId || homeMode;
    return current === id
      && (root.dataset.absSimulationFocusTransition || 'idle') === 'idle'
      && (root.dataset.absTransitionPhase || 'idle') === 'idle'
      && root.dataset.absBootState !== 'booting'
      && !document.getElementById('abs-boot-overlay')
      && !document.querySelector('.simulation-focus-modal.active');
  }, simulationId, { timeout: waitMs, polling: 25 });
  await page.waitForTimeout(80);
}

async function openAndSelect(page, simulationId) {
  await page.locator('.simulation-focus-switcher').click({ timeout: waitMs });
  const row = page.locator(`.simulation-focus-modal.active .simulation-focus-row[data-simulation-id="${simulationId}"]`);
  const expectedLabel = (await row.locator('.simulation-focus-row__name').textContent())?.trim() || '';
  await row.click({ timeout: waitMs });
  return page.evaluate(({ expectedId, expectedName }) => {
    const switcher = document.querySelector('.simulation-focus-switcher');
    const transaction = window.__ABS_SIMULATION_SWITCH_TRANSACTION__ || null;
    return {
      expectedId,
      expectedName,
      switcherId: switcher?.dataset.simulationId || '',
      switcherText: switcher?.textContent?.trim() || '',
      targetSimulationId: transaction?.targetSimulationId || '',
      transactionBusy: Boolean(transaction?.busy),
    };
  }, { expectedId: simulationId, expectedName: expectedLabel });
}

async function stableBaseline(page) {
  return page.evaluate(() => {
    const title = document.getElementById('simulation-title-canvas');
    const box = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + rect.width / 2,
        centerY: rect.top + rect.height / 2,
        transform: style.transform,
        transformOrigin: style.transformOrigin,
      };
    };
    return {
      title: box(title),
      buttonBar: box(document.querySelector('[data-button-bar]')),
      simulations: box(document.getElementById('simulations')),
      titleIdentity: title?.dataset.titlePlaneIdentity || '',
      devicePixelRatio: Number(window.devicePixelRatio || 1),
    };
  });
}

async function repeatedBaseline(page, count = 7) {
  const samples = [];
  for (let index = 0; index < count; index += 1) {
    const sample = await stableBaseline(page);
    samples.push({
      at: Date.now(),
      rect: sample.title,
      transform: sample.title?.transform || 'none',
      devicePixelRatio: sample.devicePixelRatio,
    });
    if (index < count - 1) await page.waitForTimeout(16);
  }
  return samples;
}

function maxRectDelta(rect, baseline) {
  if (!rect || !baseline) return Number.POSITIVE_INFINITY;
  return Math.max(...['x', 'y', 'width', 'height'].map((key) => Math.abs(Number(rect[key]) - Number(baseline[key]))));
}

function nearestFrame(frames, at, preferBefore = false) {
  const candidates = preferBefore ? frames.filter((frame) => frame.at <= at) : frames;
  return candidates.reduce((best, frame) => (
    !best || Math.abs(frame.at - at) < Math.abs(best.at - at) ? frame : best
  ), null);
}

function analyzeSuccessfulTrace(trace, baseline, baselineSamples, flow) {
  const issues = [];
  const phases = trace.phaseEvents.map((event) => event.phase).filter((phase, index, values) => phase !== values[index - 1]);
  const firstPrepareFrameIndex = trace.frames.findIndex((frame) => frame.phase === 'prepare');
  const lifecycleFrames = firstPrepareFrameIndex >= 0 ? trace.frames.slice(firstPrepareFrameIndex) : trace.frames;
  if (JSON.stringify(phases) !== JSON.stringify(expectedPhases)) issues.push(`phase-order:${phases.join('>')}`);
  if (phases.includes('hold')) issues.push('legacy-hold-phase');
  if (!trace.frames.some((frame) => frame.source === 'raf' && frame.phase !== 'idle')) issues.push('no-native-raf-samples');
  if (lifecycleFrames.some((frame) => !frame.title.present || !frame.title.sameNode)) issues.push('title-node-replaced-or-absent');
  if (lifecycleFrames.some((frame) => frame.title.identity && frame.title.identity !== 'shell-owned')) issues.push('title-not-shell-owned');
  const titleBackingSizes = new Set(lifecycleFrames.map((frame) => `${frame.title.backingWidth}x${frame.title.backingHeight}`));
  if (titleBackingSizes.has('0x0') || titleBackingSizes.size !== 1) issues.push(`title-backing-store-reset:${[...titleBackingSizes].join(',')}`);
  if (lifecycleFrames.some((frame) => (
    !frame.shell.buttonBar
    || frame.shell.buttonBar.display === 'none'
    || frame.shell.buttonBar.visibility === 'hidden'
    || frame.shell.buttonBar.opacity < 0.98
    || !frame.shell.simulations
    || frame.shell.simulations.display === 'none'
    || frame.shell.simulations.visibility === 'hidden'
    || frame.shell.simulations.opacity < 0.98
  ))) issues.push('persistent-shell-not-visible');

  const titleGeometrySamples = lifecycleFrames.map((frame) => ({
    at: frame.at,
    rect: frame.title.rect,
    transform: frame.title.computedTransform,
    devicePixelRatio: frame.title.devicePixelRatio,
  }));
  const lifecycleBaselineSamples = titleGeometrySamples.filter((sample) => sample.rect).slice(0, 7);
  const titleGeometry = aggregateGeometrySamples(titleGeometrySamples, lifecycleBaselineSamples);
  titleGeometry.preSwitchComparison = aggregateGeometrySamples(titleGeometrySamples, baselineSamples);
  const titleDrift = titleGeometry.maxRawCssDelta;
  if (!titleGeometry.valid) issues.push('title-geometry-evidence-invalid');
  else if (!titleGeometry.pass) {
    issues.push(`title-device-pixel-drift:${titleGeometry.maxSnappedDeviceDelta.toFixed(3)}px`);
  }
  const shellReferenceFrame = lifecycleFrames.find((frame) => (
    frame.shell.buttonBar && frame.shell.simulations
  ));
  const shellReference = shellReferenceFrame ? {
    buttonBar: shellReferenceFrame.shell.buttonBar,
    simulations: shellReferenceFrame.shell.simulations,
  } : baseline;
  const shellDrift = lifecycleFrames.reduce((max, frame) => Math.max(
    max,
    maxRectDelta(frame.shell.buttonBar, shellReference.buttonBar),
    maxRectDelta(frame.shell.simulations, shellReference.simulations),
  ), 0);
  if (shellDrift > 1) issues.push(`persistent-shell-drift:${shellDrift.toFixed(3)}px`);

  const commitEvent = trace.switchEvents.find((event) => event.detail?.phase === 'commit');
  const commitFrame = lifecycleFrames.find((frame) => (
    frame.phase === 'commit' && frame.source === 'phase:switch-event'
  )) || (commitEvent ? nearestFrame(lifecycleFrames, commitEvent.at) : null);
  if (!commitFrame) issues.push('missing-commit-sample');
  else if (Number(commitFrame.visual?.maxScale ?? 1) > 0.035) issues.push(`commit-before-zero-scale:${commitFrame.visual?.maxScale}`);

  for (const frame of lifecycleFrames) {
    const visibleCanvasCount = Number(frame.visual?.maxScale ?? 1) > 0.035
      ? new Set(frame.canvases.map((canvas) => canvas.owner || canvas.id)).size
      : 0;
    if (visibleCanvasCount > 1) {
      issues.push(`visible-runtime-overlap:${visibleCanvasCount}`);
      break;
    }
  }

  const inEvent = trace.switchEvents.find((event) => event.detail?.phase === 'in');
  const inFrame = trace.frames.find((frame) => (
    frame.phase === 'in' && frame.source === 'phase:switch-event'
  )) || (inEvent ? nearestFrame(trace.frames, inEvent.at) : null);
  const finalTransaction = [...trace.switchEvents].reverse().find((event) => event.detail?.phase === 'idle')?.detail;
  if (!inFrame) issues.push('missing-in-sample');
  else {
    if (inFrame.runtimeId !== flow.to) issues.push(`old-runtime-present-at-in:${inFrame.runtimeId || 'none'}`);
    const inOwners = new Set(inFrame.canvases.map((canvas) => canvas.owner || canvas.id));
    if (inOwners.size !== 1 || !inOwners.has(flow.to)) issues.push(`runtime-ownership-at-in:${[...inOwners].join(',') || 'none'}`);
    const atmosphere = inFrame.atmosphere;
    if (!atmosphere) issues.push('atmosphere-snapshot-missing-at-in');
    else {
      if (atmosphere.activeSourceCount !== 1) issues.push(`active-source-count:${atmosphere.activeSourceCount}`);
      if (atmosphere.compositorCount !== 1 || atmosphere.glowCanvasCount !== 1 || atmosphere.edgeCanvasCount !== 1) {
        issues.push('persistent-compositor-count');
      }
      if (atmosphere.status !== 'failed-open') {
        if (!(atmosphere.outputSourceGeneration > 0 && atmosphere.outputSourceGeneration === atmosphere.activeSourceGeneration)) issues.push('output-generation-not-active-at-in');
        if (atmosphere.resetSourceGeneration !== atmosphere.activeSourceGeneration) issues.push('feedback-not-reset-for-target-at-in');
        if (atmosphere.firstCompositeGeneration !== atmosphere.activeSourceGeneration) issues.push('first-composite-not-ready-at-in');
        if (atmosphere.outputTransactionId !== finalTransaction?.transactionId && finalTransaction) issues.push('output-transaction-mismatch');
      }
      if (atmosphere.outputResetCount !== 1) issues.push(`output-reset-count:${atmosphere.outputResetCount}`);
      if (atmosphere.sourceUnregisterCount !== 1) issues.push(`source-unregister-count:${atmosphere.sourceUnregisterCount}`);
    }
  }

  if (!finalTransaction) issues.push('missing-final-transaction');
  else {
    if (finalTransaction.commitCount !== 1) issues.push(`commit-count:${finalTransaction.commitCount}`);
    if (finalTransaction.publicationCount !== 1) issues.push(`publication-count:${finalTransaction.publicationCount}`);
    if (finalTransaction.targetSimulationId !== flow.to) issues.push(`published-target:${finalTransaction.targetSimulationId}`);
  }
  const focusWrites = trace.storageEvents.filter((event) => event.key === 'abs_simulation_focus_choice_v1' && event.value.includes(`"simulationId":"${flow.to}"`));
  if (focusWrites.length !== 1) issues.push(`selection-write-count:${focusWrites.length}`);
  const cleanHistoryWrites = trace.historyEvents.filter((event) => {
    const url = new URL(event.href);
    return blockedUrlParams.every((param) => !url.searchParams.has(param));
  });
  if (cleanHistoryWrites.length !== 1) issues.push(`clean-url-write-count:${cleanHistoryWrites.length}`);
  const finalFrame = trace.frames.at(-1);
  const finalUrl = new URL(finalFrame?.href || baseUrl);
  const dirtyParams = blockedUrlParams.filter((param) => finalUrl.searchParams.has(param));
  if (dirtyParams.length) issues.push(`unclean-url:${dirtyParams.join(',')}`);
  if (lifecycleFrames.some((frame) => frame.boot.overlay || frame.boot.state === 'booting' || frame.boot.postBootPending || frame.boot.postBootEnter)) {
    issues.push('boot-or-postboot-marker-during-switch');
  }
  if (lifecycleFrames.some((frame) => frame.transaction?.generation && frame.transaction.generation < (finalTransaction?.generation || 0))) {
    issues.push('stale-transaction-generation-visible');
  }
  return { issues: [...new Set(issues)], phases, titleDrift, titleGeometry, shellDrift, finalTransaction };
}

async function runCoreTrace(browser, profile, flow, entries) {
  const context = await browser.newContext({
    viewport: viewports[profile.viewport],
    colorScheme: profile.theme,
    reducedMotion: profile.motion === 'reduced' ? 'reduce' : 'no-preference',
    isMobile: profile.viewport === 'mobile',
    hasTouch: profile.viewport === 'mobile',
  });
  await context.addInitScript(instrumentation);
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(compactError(error)));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const id = safeName(`${profile.browser}-${profile.viewport}-${profile.theme}-${profile.motion}-${flow.name}`);
  let trace = null;
  let analysis = null;
  try {
    await page.goto(entryUrl(entries.get(flow.from)), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForSettledSimulation(page, flow.from);
    const baseline = await stableBaseline(page);
    const baselineSamples = await repeatedBaseline(page);
    await page.evaluate(() => window.__ABS_SIMULATION_LIFECYCLE_AUDIT__.start());
    const phaseCaptures = ['commit', 'in'].map(async (phase) => {
      await page.waitForFunction((expectedPhase) => (
        window.__ABS_SIMULATION_LIFECYCLE_AUDIT__?.switchEvents?.some(
          (event) => event.detail?.phase === expectedPhase,
        )
      ), phase, { timeout: waitMs, polling: 10 });
      await page.screenshot({ path: resolve(runOutputDir, `${id}-${phase}.png`) });
    });
    const tapState = await openAndSelect(page, flow.to);
    await waitForSettledSimulation(page, flow.to);
    await Promise.all(phaseCaptures);
    trace = await page.evaluate(() => window.__ABS_SIMULATION_LIFECYCLE_AUDIT__.stop());
    analysis = analyzeSuccessfulTrace(trace, baseline, baselineSamples, flow);
    if (
      tapState.switcherId !== tapState.expectedId
      || !tapState.switcherText.includes(tapState.expectedName)
      || tapState.targetSimulationId !== tapState.expectedId
      || !tapState.transactionBusy
    ) {
      analysis.issues.push(`tap-label-not-atomic:${JSON.stringify(tapState)}`);
    }
    if (consoleErrors.length) analysis.issues.push(`console-errors:${consoleErrors.length}`);
    if (pageErrors.length) analysis.issues.push(`page-errors:${pageErrors.length}`);
    if (analysis.issues.length) await page.screenshot({ path: resolve(runOutputDir, `${id}-failure.png`) });
    else await page.screenshot({ path: resolve(runOutputDir, `${id}-settled.png`) });
  } catch (error) {
    analysis = { issues: [`harness:${compactError(error)}`], phases: [], titleDrift: null, shellDrift: null };
    await page.screenshot({ path: resolve(runOutputDir, `${id}-failure.png`) }).catch(() => undefined);
    if (!trace) trace = await page.evaluate(() => window.__ABS_SIMULATION_LIFECYCLE_AUDIT__?.stop?.() || null).catch(() => null);
  } finally {
    await context.close();
  }
  return { kind: 'core', id, profile, flow, analysis, trace, consoleErrors, pageErrors };
}

async function runRapidProbe(browser, profile, entries) {
  const context = await browser.newContext({
    viewport: viewports[profile.viewport],
    colorScheme: profile.theme,
    reducedMotion: profile.motion === 'reduced' ? 'reduce' : 'no-preference',
    isMobile: profile.viewport === 'mobile',
    hasTouch: profile.viewport === 'mobile',
  });
  await context.addInitScript(instrumentation);
  const page = await context.newPage();
  const id = safeName(`${profile.browser}-${profile.viewport}-${profile.theme}-${profile.motion}-rapid`);
  const issues = [];
  let trace = null;
  try {
    await page.goto(entryUrl(entries.get('pit')), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForSettledSimulation(page, 'pit');
    await page.evaluate(() => window.__ABS_SIMULATION_LIFECYCLE_AUDIT__.start());
    await page.locator('.simulation-focus-switcher').click({ timeout: waitMs });
    await page.waitForSelector('.simulation-focus-modal.active', { timeout: waitMs });
    const burstDispatchCount = await page.evaluate((targetId) => {
      const row = document.querySelector(
        `.simulation-focus-modal.active .simulation-focus-row[data-simulation-id="${targetId}"]`,
      );
      if (!row) return 0;
      const count = 20;
      for (let index = 0; index < count; index += 1) row.click();
      return count;
    }, 'repel-room');
    if (burstDispatchCount !== 20) issues.push(`same-task-burst-not-dispatched:${burstDispatchCount}`);
    const latestIntentAccepted = await page.evaluate(() => {
      const navigate = window.__ABS_SPA_NAVIGATE__;
      if (typeof navigate !== 'function') return false;
      const queuedIntermediate = navigate('/index.html', {
        transitionStyle: 'simulation-focus',
        simulationId: '3d-cube',
      });
      const restoredLatest = navigate('/index.html', {
        transitionStyle: 'simulation-focus',
        simulationId: 'repel-room',
      });
      return queuedIntermediate === true && restoredLatest === true;
    });
    if (!latestIntentAccepted) issues.push('programmatic-latest-intent-rejected');
    const rapidAttempts = [];
    for (let index = 0; index < 10; index += 1) {
      rapidAttempts.push(await page.evaluate(() => {
        const switcher = document.querySelector('.simulation-focus-switcher');
        const phase = document.documentElement.dataset.absSimulationFocusTransition || 'idle';
        const busy = phase !== 'idle';
        if (busy) switcher?.click();
        return {
          phase,
          busy,
          disabled: Boolean(switcher?.disabled),
          modalActive: Boolean(document.querySelector('.simulation-focus-modal.active')),
        };
      }));
      await page.waitForTimeout(12);
    }
    await waitForSettledSimulation(page, 'repel-room');
    trace = await page.evaluate(() => window.__ABS_SIMULATION_LIFECYCLE_AUDIT__.stop());
    const final = trace.frames.at(-1);
    if (final?.runtimeId !== 'repel-room') issues.push(`target-not-settled:${final?.runtimeId}`);
    const busyAttempts = rapidAttempts.filter((attempt) => attempt.busy);
    if (!busyAttempts.length) issues.push('rapid-input-missed-active-transaction');
    if (busyAttempts.some((attempt) => !attempt.disabled || attempt.modalActive)) issues.push('rapid-input-not-blocked');
    if (trace.frames.some((frame) => new Set(frame.canvases.map((canvas) => canvas.owner || canvas.id)).size > 1 && Number(frame.visual?.maxScale ?? 1) > 0.035)) issues.push('visible-overlap');
    if (trace.frames.some((frame) => !frame.title.present || !frame.title.sameNode)) issues.push('title-node-replaced');
    const finalTx = [...trace.switchEvents].reverse().find((event) => event.detail?.phase === 'idle')?.detail;
    if (finalTx?.busy) issues.push('transaction-left-busy');
    if (finalTx?.targetSimulationId !== 'repel-room') issues.push(`stale-transaction-published:${finalTx?.targetSimulationId}`);
    const historiesByTransaction = new Map();
    for (const event of trace.switchEvents) {
      if (!event.detail?.transactionId) continue;
      historiesByTransaction.set(event.detail.transactionId, event.detail);
    }
    for (const transaction of historiesByTransaction.values()) {
      if (transaction.phase !== 'idle') issues.push(`unsettled-transaction:${transaction.transactionId}`);
      if (transaction.phase === 'idle' && JSON.stringify(transaction.phaseHistory) !== JSON.stringify(expectedPhases)) {
        issues.push(`rapid-phase-order:${transaction.transactionId}:${transaction.phaseHistory?.join('>')}`);
      }
    }
    if (historiesByTransaction.size !== 1) {
      issues.push(`same-task-burst-created-${historiesByTransaction.size}-transactions`);
    }
  } catch (error) {
    issues.push(`harness:${compactError(error)}`);
  }
  if (issues.length) await page.screenshot({ path: resolve(runOutputDir, `${id}-failure.png`) }).catch(() => undefined);
  await context.close();
  return { kind: 'rapid', id, profile, issues, trace };
}

async function runFaultProbe(browser, browserName, type, entries) {
  const context = await browser.newContext({ viewport: viewports.desktop, colorScheme: 'light' });
  await context.addInitScript(instrumentation);
  await context.addInitScript((fault) => {
    const state = { fault, activationCount: 0 };
    window.__ABS_LIFECYCLE_FAULT_INJECTION__ = state;
    if (fault === 'runtime-readiness') {
      Object.defineProperty(window, '__ABS_AUDIT_FORCE_DAILY_NOT_READY__', {
        configurable: true,
        get() {
          state.activationCount += 1;
          return 'repel-room';
        },
      });
    }
    if (fault === 'atmosphere-first-frame') {
      Object.defineProperty(window, '__ABS_AUDIT_FORCE_ATMOSPHERE_FIRST_FRAME_FAILURE__', {
        configurable: true,
        get() {
          state.activationCount += 1;
          return true;
        },
      });
    }
  }, type);
  const interception = { interceptionCount: 0, abortedCount: 0, urls: [], failedRequestUrls: [] };
  if (type === 'preload') {
    await context.route('**/*', async (route) => {
      const url = route.request().url();
      if (!isRepelRoomRuntimeRequest(url)) return route.continue();
      interception.interceptionCount += 1;
      interception.urls.push(url);
      await route.abort('failed');
      interception.abortedCount += 1;
    });
  }
  const page = await context.newPage();
  page.on('requestfailed', (request) => {
    if (isRepelRoomRuntimeRequest(request.url())) interception.failedRequestUrls.push(request.url());
  });
  const id = safeName(`${browserName}-fault-${type}`);
  let trace = null;
  let evidence = null;
  try {
    await page.goto(entryUrl(entries.get('pit')), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForSettledSimulation(page, 'pit');
    const activationBaseline = await page.evaluate(() => (
      Number(window.__ABS_LIFECYCLE_FAULT_INJECTION__?.activationCount || 0)
    ));
    await page.evaluate(() => window.__ABS_SIMULATION_LIFECYCLE_AUDIT__.start());
    await openAndSelect(page, 'repel-room');
    await page.waitForFunction(() => (
      window.__ABS_SIMULATION_LIFECYCLE_AUDIT__?.switchEvents?.some(
        (event) => event.detail?.phase && event.detail.phase !== 'idle',
      )
    ), null, { timeout: waitMs, polling: 10 });
    await page.waitForFunction(() => (
      (document.documentElement.dataset.absSimulationFocusTransition || 'idle') === 'idle'
      && !document.querySelector('.simulation-focus-modal.active')
      && window.__ABS_SIMULATION_LIFECYCLE_AUDIT__?.switchEvents?.some(
        (event) => event.detail?.phase === 'idle' && event.detail?.busy === false,
      )
    ), null, { timeout: waitMs * 2, polling: 30 });
    await page.waitForTimeout(100);
    trace = await page.evaluate(() => window.__ABS_SIMULATION_LIFECYCLE_AUDIT__.stop());
    const final = trace.frames.at(-1);
    const finalTx = [...trace.switchEvents].reverse().find((event) => event.detail?.phase === 'idle')?.detail;
    const browserInjection = await page.evaluate(() => window.__ABS_LIFECYCLE_FAULT_INJECTION__ || null);
    const injection = {
      ...interception,
      activationCount: Math.max(0, Number(browserInjection?.activationCount || 0) - activationBaseline),
    };
    evidence = analyzeFaultEvidence({
      fault: type,
      injection,
      trace,
      finalRuntimeId: final?.runtimeId || '',
      finalTransaction: finalTx,
    });
    evidence.injection = injection;
    evidence.finalRuntimeLoadState = final?.dailyRuntimeLoad || null;
    evidence.finalAtmosphereState = final?.atmosphere || null;
    if (type === 'atmosphere-first-frame') {
      if (final?.atmosphere?.status !== 'failed-open') {
        evidence.issues.push(`invalid-test:atmosphere-failure-state-missing:${final?.atmosphere?.status || 'none'}`);
      }
    }
    if (trace.frames.some((frame) => !frame.title.present || !frame.title.sameNode)) {
      evidence.issues.push('product-failure:title-node-replaced');
    }
    if (trace.frames.some((frame) => new Set(frame.canvases.map((canvas) => canvas.owner || canvas.id)).size > 1 && Number(frame.visual?.maxScale ?? 1) > 0.035)) {
      evidence.issues.push('product-failure:visible-overlap');
    }
    evidence.classification = evidence.issues.some((issue) => issue.startsWith('invalid-test:'))
      ? 'invalid-test'
      : (evidence.issues.some((issue) => issue.startsWith('product-failure:')) ? 'product-failure' : 'pass');
  } catch (error) {
    evidence = {
      classification: 'invalid-test',
      injection: interception,
      issues: [`invalid-test:harness:${compactError(error)}`],
    };
  }
  await page.screenshot({ path: resolve(runOutputDir, `${id}-${evidence.issues.length ? 'failure' : 'settled'}.png`) }).catch(() => undefined);
  await context.close();
  return { kind: 'fault', id, browser: browserName, fault: type, issues: evidence.issues, evidence, trace };
}

async function main() {
  await waitForServer();
  await mkdir(runOutputDir, { recursive: true });
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const entries = new Map(catalog.simulations.map((entry) => [entry.id, entry]));
  const browserNames = csvFilter(
    'ABS_LIFECYCLE_BROWSER',
    dimensions.browser,
    { chrome: 'chromium', safari: 'webkit' },
    process.env.ABS_BROWSER,
  );
  const viewportNames = csvFilter('ABS_LIFECYCLE_VIEWPORT', dimensions.viewport, { compact: 'mobile' });
  const themes = csvFilter('ABS_LIFECYCLE_THEME', dimensions.theme);
  const motions = csvFilter('ABS_LIFECYCLE_MOTION', dimensions.motion, { reduce: 'reduced', 'no-preference': 'normal' });
  const flows = selectedFlows();
  const results = [];
  const startedAt = Date.now();

  for (const browserName of browserNames) {
    const browser = await browserType(browserName).launch({ headless: !headed });
    try {
      for (const viewport of viewportNames) {
        for (const theme of themes) {
          for (const motion of motions) {
            const profile = { browser: browserName, viewport, theme, motion };
            if (!skipCore) {
              for (const flow of flows) {
                const result = await runCoreTrace(browser, profile, flow, entries);
                results.push(result);
                process.stdout.write(`${result.analysis.issues.length ? 'FAIL' : 'PASS'} ${result.id}\n`);
              }
            }
            if (!skipRapid) {
              const rapid = await runRapidProbe(browser, profile, entries);
              results.push(rapid);
              process.stdout.write(`${rapid.issues.length ? 'FAIL' : 'PASS'} ${rapid.id}\n`);
            }
          }
        }
      }
      if (!skipFaults) {
        for (const fault of ['preload', 'runtime-readiness', 'atmosphere-first-frame']) {
          const result = await runFaultProbe(browser, browserName, fault, entries);
          results.push(result);
          process.stdout.write(`${result.issues.length ? 'FAIL' : 'PASS'} ${result.id}\n`);
        }
      }
    } finally {
      await browser.close();
    }
  }

  const failures = results.filter((result) => (result.analysis?.issues || result.issues || []).length > 0);
  const report = {
    ok: failures.length === 0,
    runId,
    outputDirectory: runOutputDir,
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    baseUrl,
    filters: {
      browsers: browserNames,
      viewports: viewportNames,
      themes,
      motions,
      flows: flows.map((flow) => flow.name),
      faults: skipFaults ? [] : ['preload', 'runtime-readiness', 'atmosphere-first-frame'],
      core: !skipCore,
      rapid: !skipRapid,
    },
    expectedCoreTraceCount: skipCore ? 0 : browserNames.length * viewportNames.length * themes.length * motions.length * flows.length,
    coreTraceCount: results.filter((result) => result.kind === 'core').length,
    failureCount: failures.length,
    results,
  };
  const reportPath = resolve(runOutputDir, 'report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`\nSimulation lifecycle: ${report.coreTraceCount} core trace(s), ${failures.length} failure(s).\n`);
  process.stdout.write(`Report: ${reportPath}\n`);
  if (failures.length) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
