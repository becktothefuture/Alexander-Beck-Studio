#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import { chromium } from 'playwright';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'simulation-focus-transition-stress');
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');

const DEFAULT_URL = 'http://127.0.0.1:8013';
const WAIT_MS = Number(process.env.ABS_SIMULATION_FOCUS_STRESS_WAIT_MS || 40000);
const FRAME_COUNT = Number(process.env.ABS_SIMULATION_FOCUS_STRESS_FRAMES || 46);
const FRAME_INTERVAL_MS = Number(process.env.ABS_SIMULATION_FOCUS_STRESS_INTERVAL_MS || 45);
const HEADLESS = process.env.ABS_SIMULATION_FOCUS_STRESS_HEADED !== '1';
const TARGET_FOCUS_IDS = new Set(
  String(process.env.ABS_SIMULATION_FOCUS_STRESS_TARGETS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean),
);
const SIMULATION_URL_STATE_PARAMS = ['daily', 'focus', 'mode', 'simulation'];
let expectedChooserRows = 0;
const ROUTE_BACKED_FOCUS_IDS = new Set([
  'repel-room',
  'flock-of-birds',
  'mineral-growth',
  'napoleon-point-cloud',
  'rift-rings',
]);

function resolveOrigin() {
  const raw = String(process.env.ABS_DEV_URL || DEFAULT_URL).trim() || DEFAULT_URL;
  const url = new URL(raw);
  return url.origin;
}

function resolveUrl(pathname = '/index.html?focus=pit') {
  return new URL(pathname, resolveOrigin()).toString();
}

function withAuditParam(pathname) {
  const url = new URL(pathname, resolveOrigin());
  url.searchParams.set('absAudit', '1');
  return `${url.pathname}${url.search}`;
}

function sleep(ms) {
  return new Promise((resolveSleep) => {
    setTimeout(resolveSleep, ms);
  });
}

function safeName(value) {
  return String(value || 'frame')
    .replace(/[^a-z0-9-_]+/gi, '-')
    .replace(/-+/g, '-')
    .replace(/(^-|-$)/g, '')
    .toLowerCase();
}

function buildDailyFocusFlows(dailyEntries) {
  const startIndex = dailyEntries.findIndex((entry) => entry.id === 'pit');
  const orderedEntries = startIndex >= 0
    ? dailyEntries.slice(startIndex).concat(dailyEntries.slice(0, startIndex))
    : dailyEntries;
  return orderedEntries.map((fromEntry, index) => {
    const toEntry = orderedEntries[(index + 1) % orderedEntries.length];
    return {
      name: `${safeName(fromEntry.id)}-to-${safeName(toEntry.id)}`,
      from: fromEntry.name,
      fromFocus: fromEntry.id,
      to: toEntry.name,
      finalFocus: toEntry.id,
      finalLabel: toEntry.name,
      finalRouteBacked: ROUTE_BACKED_FOCUS_IDS.has(toEntry.id),
    };
  });
}

async function waitForIdle(page) {
  await page.waitForFunction(
    () => {
      const blur = document.getElementById('modal-blur-layer');
      const content = document.getElementById('modal-content-layer');
      return (
        (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
        && (document.documentElement.dataset.absSimulationFocusTransition || 'idle') === 'idle'
        && !blur?.classList.contains('active')
        && !content?.classList.contains('active')
      );
    },
    { timeout: WAIT_MS, polling: 50 },
  );
}

async function waitForSwitcherLabel(page, label) {
  try {
    await page.waitForFunction(
      (expected) => document.querySelector('.simulation-focus-switcher')?.textContent?.includes(expected),
      label,
      { timeout: WAIT_MS, polling: 50 },
    );
  } catch (error) {
    const diagnostics = await page.evaluate(() => ({
      href: window.location.href,
      switcher: document.querySelector('.simulation-focus-switcher')?.textContent?.trim() || null,
      layerId: document.querySelector('.daily-simulation-layer')?.dataset.simulationId || null,
      routePhase: document.documentElement.dataset.absTransitionPhase || '',
      focusPhase: document.documentElement.dataset.absSimulationFocusTransition || '',
      switchState: window.__ABS_SIMULATION_SWITCH__ || null,
      runtimeLifecycle: window.__ABS_RUNTIME_LIFECYCLE__ || null,
      modalActive: Boolean(document.querySelector('.simulation-focus-modal.active')),
      rows: Array.from(document.querySelectorAll('.simulation-focus-row__name')).map((node) => node.textContent?.trim()).filter(Boolean),
    }));
    throw new Error(`Timed out waiting for switcher label "${label}": ${JSON.stringify(diagnostics)}`, { cause: error });
  }
}

async function waitForRows(page) {
  await page.waitForSelector('.simulation-focus-modal.active', { timeout: WAIT_MS });
  const count = await page.locator('.simulation-focus-modal.active .simulation-focus-row').count();
  if (count !== expectedChooserRows) throw new Error(`Expected ${expectedChooserRows} chooser rows, got ${count}`);
}

async function openChooser(page) {
  await page.locator('.simulation-focus-switcher').click({ timeout: WAIT_MS });
  await waitForRows(page);
}

async function closeChooserWithClick(page) {
  await page.locator('.simulation-focus-modal.active [data-modal-back]').click({ timeout: WAIT_MS });
  await page.waitForSelector('.simulation-focus-modal.active', { state: 'hidden', timeout: WAIT_MS });
  await waitForIdle(page);
}

async function installSimulationFocusPhaseRecorder(page) {
  await page.evaluate(() => {
    if (window.__ABS_SIMULATION_FOCUS_PHASE_AUDIT_INSTALLED__) return;
    window.__ABS_SIMULATION_FOCUS_PHASE_AUDIT_INSTALLED__ = true;
    window.__ABS_SIMULATION_FOCUS_PHASE_AUDIT__ = [];
    const root = document.documentElement;
    let previousPhase = '';
    const record = () => {
      const phase = root.dataset.absSimulationFocusTransition || 'idle';
      if (phase === previousPhase) return;
      previousPhase = phase;
      window.__ABS_SIMULATION_FOCUS_PHASE_AUDIT__.push({
        phase,
        at: performance.now(),
        wallTime: Date.now(),
      });
    };
    record();
    const observer = new MutationObserver(record);
    observer.observe(root, {
      attributes: true,
      attributeFilter: ['data-abs-simulation-focus-transition'],
    });
  });
}

async function getState(page, elapsedMs) {
  return page.evaluate((elapsed) => {
    const rectFor = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return {
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        opacity: Number.parseFloat(styles.opacity || '1'),
        visibility: styles.visibility,
        display: styles.display,
      };
    };

    const visible = (selector) => {
      const rect = rectFor(selector);
      return Boolean(
        rect
        && rect.display !== 'none'
        && rect.visibility !== 'hidden'
        && rect.opacity > 0.02
        && rect.width > 0
        && rect.height > 0
      );
    };
    const visibleThroughAncestors = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return false;
      const rect = element.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return false;

      let opacity = 1;
      let current = element;
      while (current instanceof Element) {
        const styles = getComputedStyle(current);
        if (styles.display === 'none' || styles.visibility === 'hidden') return false;
        opacity *= Number.parseFloat(styles.opacity || '1');
        if (opacity <= 0.02) return false;
        current = current.parentElement;
      }
      return true;
    };
    const scaleFor = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const styles = getComputedStyle(element);
      const transform = styles.transform;
      if (!transform || transform === 'none') return 1;
      const values = transform.match(/matrix\(([^)]+)\)/)?.[1]?.split(',').map((value) => Number.parseFloat(value.trim()));
      if (!values || values.length < 4) return 1;
      return Math.sqrt((values[0] * values[0]) + (values[1] * values[1]));
    };

    const activeCanvas = Array.from(document.querySelectorAll([
      '#c',
      '#repel-room-canvas',
      '#wall-repel-canvas',
      '#flock-of-birds-canvas',
      '#mineral-growth-canvas',
      '.napoleon-point-cloud__canvas--front',
      '.beach-ball-room-canvas',
      '.concept-simulation-canvas',
    ].join(',')))
      .find((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return rect.width >= 64 && rect.height >= 64;
      });
    const visualTransition = window.__ABS_SIMULATION_VISUAL_TRANSITION__ || null;
    const homeSnapshot = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.() || null;
    const params = new URLSearchParams(window.location.search);
    const bootState = document.documentElement.dataset.absBootState || '';
    const titleCanvasVisible = Boolean(
      homeSnapshot?.canvasTitleVisible
      && Number(homeSnapshot?.canvasTitleMaxOpacity || 0) > 0.35
      && Number(homeSnapshot?.canvasTitleLineCount || 0) > 0
    );
    const titleDomRect = rectFor('#hero-title');
    const homeDomTitlePaintable = Boolean(
      document.documentElement.dataset.shellRoute === 'home'
      && !document.body.classList.contains('daily-focus-page')
      && document.getElementById('hero-title')?.classList.contains('hero-title--canvas-source')
      && Number(titleDomRect?.opacity) > 0.02
    );
    const titleDomVisible = visibleThroughAncestors('#hero-title');
    const titleCopiesExposed = Boolean(
      titleDomVisible
      && titleCanvasVisible
      && visibleThroughAncestors('#c')
      && !document.getElementById('abs-boot-overlay')
      && !visible('.simulation-focus-modal.active')
      && !visible('.simulation-focus-modal.closing')
    );

    return {
      elapsed,
      href: window.location.href,
      path: window.location.pathname,
      bootOverlayPresent: Boolean(document.getElementById('abs-boot-overlay')),
      bootState,
      homeCanvasTitleReady: document.documentElement.dataset.absHomeCanvasTitleReady || '',
      blockedSimulationUrlParams: Array.from(params.keys()).filter((key) => (
        key === 'daily' || key === 'focus' || key === 'mode' || key === 'simulation'
      )),
      phase: document.documentElement.dataset.absTransitionPhase || 'idle',
      simulationFocusPhase: document.documentElement.dataset.absSimulationFocusTransition || 'idle',
      htmlClass: document.documentElement.className,
      modalActive: visible('.simulation-focus-modal.active'),
      modalClosing: visible('.simulation-focus-modal.closing'),
      switcherText: document.querySelector('.simulation-focus-switcher')?.textContent?.trim() || '',
      simulationRect: rectFor('#simulations'),
      sceneRect: rectFor('#abs-scene'),
      wallScale: scaleFor('#shell-wall-slot'),
      runtimeScale: Number.parseFloat(visualTransition?.maxScale ?? '1'),
      visualTransition: visualTransition ? {
        phase: visualTransition.phase || '',
        sourceId: visualTransition.sourceId || '',
        direction: visualTransition.direction || '',
        minScale: Number(visualTransition.minScale),
        maxScale: Number(visualTransition.maxScale),
        visibleRatio: Number(visualTransition.visibleRatio),
        count: Number(visualTransition.count),
        events: Array.isArray(visualTransition.events)
          ? visualTransition.events.slice(-80)
          : [],
      } : null,
      activeFocus: (
        document.querySelector('.daily-simulation-layer')?.dataset.simulationId
        || homeSnapshot?.mode
        || params.get('focus')
        || params.get('mode')
        || ''
      ),
      switcherRect: rectFor('.simulation-focus-switcher'),
      modalRect: rectFor('.simulation-focus-modal'),
      titleRect: titleDomRect,
      buttonBarRect: rectFor('[data-button-bar]'),
      legendRect: rectFor('#expertise-legend'),
      descriptionRect: rectFor('.decorative-script'),
      footerRect: rectFor('.ui-bottom'),
      edgeCaptionRect: rectFor('#edge-caption'),
      londonTimeRect: rectFor('#site-year'),
      titleCanvasVisible,
      titleDomVisible,
      homeDomTitlePaintable,
      titleCopiesExposed,
      titleCanvasMaxOpacity: Number(homeSnapshot?.canvasTitleMaxOpacity || 0),
      titleCanvasLineCount: Number(homeSnapshot?.canvasTitleLineCount || 0),
      canvas: activeCanvas ? {
        id: activeCanvas.id || activeCanvas.className || 'canvas',
        width: activeCanvas.width,
        height: activeCanvas.height,
        rect: (() => {
          const rect = activeCanvas.getBoundingClientRect();
          return { top: rect.top, right: rect.right, bottom: rect.bottom, left: rect.left, width: rect.width, height: rect.height };
        })(),
      } : null,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
        scrollWidth: document.documentElement.scrollWidth,
        scrollHeight: document.documentElement.scrollHeight,
      },
    };
  }, elapsedMs);
}

async function captureFrame(page, flowName, index, startedAt) {
  const elapsed = Date.now() - startedAt;
  const filename = `${safeName(flowName)}-${String(index).padStart(2, '0')}.png`;
  const path = resolve(outputRoot, filename);
  await page.screenshot({ path, fullPage: false });
  return {
    index,
    image: path,
    relativeImage: filename,
    state: await getState(page, elapsed),
  };
}

function analyzeImage(path) {
  const png = PNG.sync.read(Buffer.from(readFileSyncCache.get(path)));
  const pixelCount = png.width * png.height;
  let sum = 0;
  let sumSquares = 0;

  for (let i = 0; i < png.data.length; i += 4) {
    const luminance = (0.2126 * png.data[i]) + (0.7152 * png.data[i + 1]) + (0.0722 * png.data[i + 2]);
    sum += luminance;
    sumSquares += luminance * luminance;
  }

  const mean = sum / pixelCount;
  const variance = Math.max(0, (sumSquares / pixelCount) - (mean * mean));
  return {
    width: png.width,
    height: png.height,
    mean,
    stdev: Math.sqrt(variance),
    png,
  };
}

function meanDelta(previous, next) {
  if (!previous || !next) return 0;
  if (previous.width !== next.width || previous.height !== next.height) return 255;
  let total = 0;
  const length = previous.png.data.length;
  for (let i = 0; i < length; i += 4) {
    total += Math.abs(previous.png.data[i] - next.png.data[i]);
    total += Math.abs(previous.png.data[i + 1] - next.png.data[i + 1]);
    total += Math.abs(previous.png.data[i + 2] - next.png.data[i + 2]);
  }
  return total / ((length / 4) * 3);
}

function rectWithinViewport(rect, viewport, slack = 3) {
  if (!rect || !viewport) return false;
  return (
    rect.left >= -slack
    && rect.top >= -slack
    && rect.right <= viewport.width + slack
    && rect.bottom <= viewport.height + slack
  );
}

function isShellUiStableFrame(frame) {
  const { state } = frame;
  if (state.phase === 'modal-open' || state.modalActive || state.modalClosing) return false;
  const titleVisible = Number(state.titleRect?.opacity) >= 0.9 || state.titleCanvasVisible === true;
  return (
    titleVisible
    && Number(state.descriptionRect?.opacity) >= 0.62
    && Number(state.edgeCaptionRect?.opacity) >= 0.45
    && Number(state.londonTimeRect?.opacity) >= 0.62
    && rectWithinViewport(state.titleRect, state.viewport, 6)
    && rectWithinViewport(state.buttonBarRect, state.viewport, 6)
    && rectWithinViewport(state.legendRect, state.viewport, 6)
    && rectWithinViewport(state.descriptionRect, state.viewport, 6)
    && rectWithinViewport(state.footerRect, state.viewport, 6)
    && rectWithinViewport(state.edgeCaptionRect, state.viewport, 6)
    && rectWithinViewport(state.londonTimeRect, state.viewport, 6)
  );
}

function checkFrame(frame, imageStats, { enforceShellUi = true } = {}) {
  const issues = [];
  const { state } = frame;
  const modalBusy = state.phase === 'modal-open' || state.modalActive || state.modalClosing;

  if (state.bootOverlayPresent) {
    issues.push('boot-overlay-visible-during-switch');
  }

  if (state.bootState === 'booting') {
    issues.push('boot-state-reset-during-switch');
  }

  if (state.titleCopiesExposed) {
    issues.push('dom-and-canvas-title-visible-together');
  }

  if (state.homeDomTitlePaintable) {
    issues.push('home-dom-title-paintable');
  }

  if (!modalBusy && state.simulationFocusPhase === 'idle' && (imageStats.stdev < 2 || imageStats.mean < 2 || imageStats.mean > 253)) {
    issues.push('blank-or-flat-frame');
  }

  if ((state.viewport.scrollWidth - state.viewport.width) > 2) {
    issues.push(`horizontal-overflow:${state.viewport.scrollWidth - state.viewport.width}`);
  }

  if (!rectWithinViewport(state.simulationRect, state.viewport, 4)) {
    issues.push('simulation-frame-clipped');
  }

  if (state.modalActive && !rectWithinViewport(state.modalRect, state.viewport, 4)) {
    issues.push('modal-clipped');
  }

  if (state.switcherRect && state.switcherRect.width > state.viewport.width - 24) {
    issues.push('switcher-overwide');
  }

  if (!modalBusy && enforceShellUi) {
    if (Number.isFinite(state.wallScale) && Math.abs(state.wallScale - 1) > 0.015) {
      issues.push(`wall-scaled:${state.wallScale.toFixed(3)}`);
    }

    [
      ['title', state.titleRect, state.titleCanvasVisible === true],
      ['button-bar', state.buttonBarRect],
      ['legend', state.legendRect],
      ['description', state.descriptionRect],
      ['footer', state.footerRect],
      ['edge-caption', state.edgeCaptionRect],
      ['london-time', state.londonTimeRect],
    ].forEach(([name, rect, alternateVisible = false]) => {
      if (!rectWithinViewport(rect, state.viewport, 6)) {
        issues.push(`${name}-missing-or-clipped`);
        return;
      }
      if (!alternateVisible && (rect.opacity < 0.45 || rect.visibility === 'hidden' || rect.display === 'none')) {
        issues.push(`${name}-hidden`);
      }
    });
  }

  return issues;
}

async function collectFrames(page, flowName, action) {
  const startedAt = Date.now();
  const frames = [];
  frames.eventStartedWallTime = startedAt;
  frames.eventBaseline = await page.evaluate(() => (
    Array.isArray(window.__ABS_SIMULATION_VISUAL_TRANSITION__?.events)
      ? window.__ABS_SIMULATION_VISUAL_TRANSITION__.events.length
      : 0
  ));
  frames.phaseAuditBaseline = await page.evaluate(() => (
    Array.isArray(window.__ABS_SIMULATION_FOCUS_PHASE_AUDIT__)
      ? window.__ABS_SIMULATION_FOCUS_PHASE_AUDIT__.length
      : 0
  ));
  const sampler = (async () => {
    for (let index = 0; index < FRAME_COUNT; index += 1) {
      frames.push(await captureFrame(page, flowName, index, startedAt));
      await sleep(FRAME_INTERVAL_MS);
    }
  })();

  await sleep(20);
  await action();
  await sampler;
  frames.phaseAudit = await page.evaluate((baseline) => (
    Array.isArray(window.__ABS_SIMULATION_FOCUS_PHASE_AUDIT__)
      ? window.__ABS_SIMULATION_FOCUS_PHASE_AUDIT__.slice(baseline)
      : []
  ), frames.phaseAuditBaseline);
  return frames;
}

async function sampleStates(page, label, count = 32, intervalMs = 45) {
  const startedAt = Date.now();
  const states = [];
  for (let index = 0; index < count; index += 1) {
    states.push({
      index,
      label,
      state: await getState(page, Date.now() - startedAt),
    });
    await sleep(intervalMs);
  }
  return states;
}

function analyzeBootStates(states) {
  const visualMinScales = states
    .map((entry) => Number(entry.state.visualTransition?.minScale))
    .filter(Number.isFinite);
  const visualMaxScales = states
    .map((entry) => Number(entry.state.visualTransition?.maxScale))
    .filter(Number.isFinite);
  const phases = new Set(states.map((entry) => entry.state.visualTransition?.phase || entry.state.simulationFocusPhase));
  const events = states[states.length - 1]?.state.visualTransition?.events || [];
  const eventTypes = new Set(events.map((event) => event.type));
  const issues = [];
  const duplicateTitleFrames = states
    .filter(({ state }) => state.titleCopiesExposed)
    .map(({ index, state }) => ({
      index,
      elapsed: state.elapsed,
      bootState: state.bootState,
      homeCanvasTitleReady: state.homeCanvasTitleReady,
      titleOpacity: state.titleRect?.opacity,
      sceneOpacity: state.sceneRect?.opacity,
    }));
  const paintableDomTitleFrames = states
    .filter(({ state }) => state.homeDomTitlePaintable)
    .map(({ index, state }) => ({
      index,
      elapsed: state.elapsed,
      bootState: state.bootState,
      titleOpacity: state.titleRect?.opacity,
    }));
  if (!visualMinScales.some((scale) => scale >= 0 && scale < 0.35)) {
    issues.push('direct-reload-missing-low-scale-entry-frame');
  }
  if (!visualMaxScales.some((scale) => scale > 0.9)) {
    issues.push('direct-reload-missing-scale-one-frame');
  }
  if (
    !phases.has('in')
    && !eventTypes.has('in-start')
    && !states.some((entry) => entry.state.visualTransition?.direction === 'in')
  ) {
    issues.push('direct-reload-missing-scale-in-wave');
  }
  if (duplicateTitleFrames.length > 0) {
    issues.push('direct-reload-dom-and-canvas-title-visible-together');
  }
  if (paintableDomTitleFrames.length > 0) {
    issues.push('direct-reload-home-dom-title-paintable');
  }
  return {
    duplicateTitleFrames,
    paintableDomTitleFrames,
    phases: Array.from(phases),
    minScale: visualMinScales.length ? Math.min(...visualMinScales) : null,
    maxScale: visualMaxScales.length ? Math.max(...visualMaxScales) : null,
    issues,
  };
}

async function chooseSimulationWithFrames(page, flow) {
  await openChooser(page);
  const rows = page.locator('.simulation-focus-modal.active .simulation-focus-row');
  const target = rows.filter({ hasText: flow.to });
  const targetCount = await target.count();
  if (targetCount !== 1) {
    throw new Error(`Expected one chooser row for "${flow.to}" in "${flow.name}", got ${targetCount}`);
  }
  const frames = await collectFrames(page, flow.name, () => target.click({ timeout: WAIT_MS }));

  await waitForSwitcherLabel(page, flow.finalLabel);
  if (flow.finalRouteBacked) {
    await page.waitForFunction(
      (expectedFocus) => document.querySelector('.daily-simulation-layer')?.dataset.simulationId === expectedFocus,
      flow.finalFocus,
      { timeout: WAIT_MS, polling: 50 },
    );
  } else {
    await page.waitForFunction(
      () => {
        const layer = document.querySelector('.daily-simulation-layer');
        const canvas = document.querySelector('#c');
        const rect = canvas?.getBoundingClientRect?.();
        return !layer && rect?.width > 64 && rect?.height > 64;
      },
      { timeout: WAIT_MS, polling: 50 },
    );
  }
  await waitForIdle(page);
  if (flow.finalRouteBacked) {
    try {
      await page.waitForFunction(
        (expectedFocus) => {
          const visualTransition = window.__ABS_SIMULATION_VISUAL_TRANSITION__;
          return visualTransition?.sourceId === expectedFocus
            && Number(visualTransition.maxScale) >= 0.9
            && Number(visualTransition.visibleRatio) >= 0.9;
        },
        flow.finalFocus,
        { timeout: WAIT_MS, polling: 50 },
      );
    } catch (error) {
      const diagnostics = await page.evaluate(() => ({
        focus: document.querySelector('.simulation-focus-switcher')?.dataset.simulationId || '',
        pointCloudLoadState: document.querySelector('.napoleon-point-cloud')?.dataset.pointCloudLoadState || '',
        visualTransition: window.__ABS_SIMULATION_VISUAL_TRANSITION__ || null,
      }));
      throw new Error(
        `Route-backed flow "${flow.name}" did not become visibly ready: ${JSON.stringify(diagnostics)}`,
        { cause: error },
      );
    }
  }
  await assertChooserSwitchSettled(page, flow);
  frames.push(await captureFrame(page, `${flow.name}-settled`, frames.length, Date.now()));
  return frames;
}

async function assertChooserSwitchSettled(page, flow) {
  const result = await page.evaluate((blockedParams) => {
    const url = new URL(window.location.href);
    const blur = document.getElementById('modal-blur-layer');
    const content = document.getElementById('modal-content-layer');
    return {
      href: window.location.href,
      pathname: url.pathname,
      blockedParams: blockedParams.filter((param) => url.searchParams.has(param)),
      bootOverlayPresent: Boolean(document.getElementById('abs-boot-overlay')),
      bootState: document.documentElement.dataset.absBootState || '',
      transitionPhase: document.documentElement.dataset.absTransitionPhase || 'idle',
      simulationFocusPhase: document.documentElement.dataset.absSimulationFocusTransition || 'idle',
      modalOverlayActive: Boolean(blur?.classList.contains('active') || content?.classList.contains('active')),
    };
  }, SIMULATION_URL_STATE_PARAMS);

  const issues = [];
  if (result.bootOverlayPresent) issues.push('boot-overlay-present-after-switch');
  if (result.bootState === 'booting') issues.push('boot-state-booting-after-switch');
  if (result.transitionPhase !== 'idle') issues.push(`transition-phase:${result.transitionPhase}`);
  if (result.simulationFocusPhase !== 'idle') issues.push(`simulation-focus-phase:${result.simulationFocusPhase}`);
  if (result.modalOverlayActive) issues.push('modal-overlay-active-after-switch');
  if (result.pathname.startsWith('/lab/')) issues.push(`lab-path:${result.pathname}`);
  if (result.blockedParams.length > 0) issues.push(`simulation-url-params:${result.blockedParams.join(',')}`);

  if (issues.length) {
    throw new Error(`Chooser switch "${flow.name}" did not settle correctly: ${issues.join('; ')} ${JSON.stringify(result)}`);
  }
}

function buildReportHtml(report) {
  const sections = report.flows.map((flow) => `
    <section>
      <h2>${flow.name}</h2>
      <p>max frame delta: ${flow.maxMeanDelta.toFixed(2)} · issues: ${flow.issues.length ? flow.issues.join(', ') : 'none'}</p>
      <div class="frames">
        ${flow.frames.map((frame) => `
          <figure>
            <img src="${frame.relativeImage}" alt="${flow.name} frame ${frame.index}">
            <figcaption>${frame.index} · ${frame.state.simulationFocusPhase} · scale ${Number(frame.state.visualTransition?.minScale ?? frame.state.runtimeScale ?? 0).toFixed(2)}-${Number(frame.state.visualTransition?.maxScale ?? frame.state.runtimeScale ?? 0).toFixed(2)} · ${frame.state.activeFocus}</figcaption>
          </figure>
        `).join('')}
      </div>
    </section>
  `).join('');
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Simulation Focus Transition Stress</title>
  <style>
    body { margin: 24px; font: 14px/1.4 system-ui, sans-serif; background: #111; color: #eee; }
    .frames { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
    figure { margin: 0; }
    img { width: 100%; border: 1px solid #444; border-radius: 6px; }
    figcaption { margin-top: 4px; color: #aaa; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Simulation Focus Transition Stress</h1>
  ${sections}
</body>
</html>
`;
}

const readFileSyncCache = new Map();

async function analyzeFrames(frames, flow) {
  for (const frame of frames) {
    readFileSyncCache.set(frame.image, await readFile(frame.image));
  }

  const analyzed = frames.map((frame) => ({ frame, stats: analyzeImage(frame.image) }));
  const firstShellStableIndex = frames.findIndex(isShellUiStableFrame);
  const deltas = analyzed.map((entry, index) => (
    index === 0 ? 0 : meanDelta(analyzed[index - 1].stats, entry.stats)
  ));
  const issues = [];

  analyzed.forEach(({ frame, stats }, index) => {
    checkFrame(frame, stats, {
      enforceShellUi: firstShellStableIndex >= 0 && index >= firstShellStableIndex,
    }).forEach((issue) => {
      issues.push(`frame-${index}:${issue}`);
    });
  });
  if (firstShellStableIndex < 0) {
    issues.push('shell-ui-never-stable-after-modal-close');
  }

  const maxMeanDelta = Math.max(0, ...deltas);
  const phases = new Set(frames.map((frame) => frame.state.simulationFocusPhase));
  const auditedPhases = new Set((frames.phaseAudit || []).map((entry) => entry.phase));
  const observedPhases = new Set([...phases, ...auditedPhases]);
  const latestEvents = frames[frames.length - 1]?.state.visualTransition?.events || [];
  const flowEvents = latestEvents.filter((event) => (
    !frames.eventStartedWallTime
    || !Number.isFinite(event.wallTime)
    || event.wallTime >= frames.eventStartedWallTime - 50
  ));
  const eventTypes = new Set(flowEvents.map((event) => event.type));
  const visualMinScales = frames
    .map((frame) => Number(frame.state.visualTransition?.minScale))
    .filter(Number.isFinite);
  const visualMaxScales = frames
    .map((frame) => Number(frame.state.visualTransition?.maxScale))
    .filter(Number.isFinite);
  const visibleRatios = frames
    .map((frame) => Number(frame.state.visualTransition?.visibleRatio))
    .filter(Number.isFinite);

  if (!observedPhases.has('out') && !eventTypes.has('out-start')) issues.push('missing-simulation-scale-out-phase');
  if (!observedPhases.has('hold') && !eventTypes.has('hold-start')) issues.push('missing-simulation-zero-hold-phase');
  if (!observedPhases.has('in') && !eventTypes.has('in-start')) issues.push('missing-simulation-scale-in-phase');
  if (!visualMinScales.some((scale) => scale >= 0 && scale < 0.16)) {
    issues.push('missing-scale-zero-near-frame');
  }
  if (!visualMaxScales.some((scale) => scale > 0.9)) {
    issues.push('missing-scale-one-frame');
  }
  if (visibleRatios.length >= 3) {
    const minVisibleRatio = Math.min(...visibleRatios);
    const maxVisibleRatio = Math.max(...visibleRatios);
    if (minVisibleRatio > 0.32) issues.push(`visible-area-did-not-decrease:${minVisibleRatio.toFixed(2)}`);
    if (maxVisibleRatio < 0.9) issues.push(`visible-area-did-not-recover:${maxVisibleRatio.toFixed(2)}`);
  }

  const settledVisualTransition = frames[frames.length - 1]?.state.visualTransition;
  const settledSourceId = settledVisualTransition?.sourceId || '';
  const settledMaxScale = Number(settledVisualTransition?.maxScale);
  const settledVisibleRatio = Number(settledVisualTransition?.visibleRatio);
  if (flow.finalRouteBacked && settledSourceId !== flow.finalFocus) {
    issues.push(`settled-source-mismatch:${settledSourceId || 'none'}`);
  }
  if (Number.isFinite(settledMaxScale) && settledMaxScale < 0.9) {
    issues.push(`settled-scale-did-not-recover:${settledMaxScale.toFixed(2)}`);
  }
  if (Number.isFinite(settledVisibleRatio) && settledVisibleRatio < 0.9) {
    issues.push(`settled-visible-area-did-not-recover:${settledVisibleRatio.toFixed(2)}`);
  }

  return {
    frames,
    maxMeanDelta,
    deltas,
    phases: Array.from(observedPhases),
    events: flowEvents,
    phaseAudit: frames.phaseAudit || [],
    firstShellStableIndex,
    issues,
  };
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const dailyEntries = catalog.simulations.filter((entry) => entry.stage === 'daily-rotation');
  expectedChooserRows = dailyEntries.length;
  if (expectedChooserRows <= 0) throw new Error('Expected at least one Daily Simulation entry in the catalog');
  const allFlows = buildDailyFocusFlows(dailyEntries);
  const flows = TARGET_FOCUS_IDS.size
    ? allFlows.filter((flow) => TARGET_FOCUS_IDS.has(flow.finalFocus))
    : allFlows;
  if (!flows.length) throw new Error('No simulation focus flows matched the requested targets');
  const startFocus = flows[0]?.fromFocus || dailyEntries[0]?.id || 'pit';
  const startLabel = flows[0]?.from || dailyEntries[0]?.name || 'Ball Field';

  const browser = await chromium.launch({ headless: HEADLESS });
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });

  try {
    await page.goto(resolveUrl(withAuditParam(`/index.html?focus=${encodeURIComponent(startFocus)}`)), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await installSimulationFocusPhaseRecorder(page);
    const bootReport = analyzeBootStates(await sampleStates(page, 'direct-reload', 120, 50));
    await waitForSwitcherLabel(page, startLabel);

    await openChooser(page);
    await closeChooserWithClick(page);
    await openChooser(page);
    await page.keyboard.press('Escape');
    await page.waitForSelector('.simulation-focus-modal.active', { state: 'hidden', timeout: WAIT_MS });
    await waitForIdle(page);

    const flowReports = [];
    for (const flow of flows) {
      await waitForSwitcherLabel(page, flow.from);
      const frames = await chooseSimulationWithFrames(page, flow);
      const analyzed = await analyzeFrames(frames, flow);
      flowReports.push({
        ...analyzed,
        name: flow.name,
        from: flow.from,
        to: flow.to,
      });
    }

    const report = {
      ok: bootReport.issues.length === 0 && flowReports.every((flow) => flow.issues.length === 0),
      outputRoot,
      frameCount: FRAME_COUNT,
      frameIntervalMs: FRAME_INTERVAL_MS,
      boot: {
        issues: bootReport.issues,
        phases: bootReport.phases,
        minScale: bootReport.minScale,
        maxScale: bootReport.maxScale,
      },
      flows: flowReports,
    };

    await writeFile(resolve(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    await writeFile(resolve(outputRoot, 'report.html'), buildReportHtml(report), 'utf8');

    if (!report.ok) {
      console.error(JSON.stringify({
        ok: false,
        outputRoot,
        boot: bootReport.issues.length ? bootReport : undefined,
        failures: flowReports
          .filter((flow) => flow.issues.length)
          .map((flow) => ({ name: flow.name, issues: flow.issues, maxMeanDelta: flow.maxMeanDelta })),
      }, null, 2));
      process.exitCode = 1;
      return;
    }

    console.log(JSON.stringify({
      ok: true,
      outputRoot,
      flows: flowReports.map((flow) => ({
        name: flow.name,
        from: flow.from,
        to: flow.to,
        maxMeanDelta: Number(flow.maxMeanDelta.toFixed(2)),
        phases: flow.phases,
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
