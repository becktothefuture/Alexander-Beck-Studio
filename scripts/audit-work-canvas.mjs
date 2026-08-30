#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { chromium, webkit } from 'playwright';
import { getGateInviteCode } from '../react-app/app/src/lib/access-gates.js';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const baseUrl = String(process.env.ABS_WORK_URL || process.env.ABS_DEV_URL || 'http://localhost:8012')
  .replace(/\/+$/, '');
const localOrigin = new URL(baseUrl).origin;
const timeoutMs = Number(process.env.ABS_WORK_TIMEOUT_MS || 30_000);
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'work-canvas');
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const runRoot = resolve(outputRoot, `${runStamp}-${browserName}`);
const CASE_STUDY_ID = 'case-study-chapter-1';
const SECOND_CASE_STUDY_ID = 'case-study-chapter-4';
const SNIPPET_ID = 'image-coral-orbit';
const MAX_INPUT_TO_DRAW_LATENCY_MS = 180;
const MAX_GESTURE_DRAW_COUNT = 120;

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

function round(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

async function waitForServer() {
  const response = await fetch(`${baseUrl}/portfolio.html`);
  assert(response.ok, `Work development route is not ready at ${baseUrl}`, {
    status: response.status,
  });
}

function bindFailures(page) {
  const failures = {
    consoleErrors: [],
    pageErrors: [],
    failedRequests: [],
    failedResponses: [],
  };
  page.on('console', (message) => {
    if (message.type() === 'error') failures.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => failures.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const failure = request.failure()?.errorText || 'failed';
    if (request.resourceType() === 'media' && /abort|cancel/i.test(failure)) return;
    if (new URL(request.url()).origin === localOrigin) {
      failures.failedRequests.push(`${request.method()} ${request.url()}: ${failure}`);
    }
  });
  page.on('response', (response) => {
    if (new URL(response.url()).origin === localOrigin && response.status() >= 400) {
      failures.failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
  return failures;
}

function assertNoFailures(failures, label) {
  const counts = Object.fromEntries(
    Object.entries(failures).map(([key, entries]) => [key, entries.length]),
  );
  assert(Object.values(counts).every((count) => count === 0), `${label} emitted browser errors`, {
    counts,
    failures,
  });
}

async function createAuditPage(browser, options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1440, height: 900 },
    reducedMotion: options.reducedMotion || 'no-preference',
    colorScheme: options.colorScheme || 'light',
  });
  const page = await context.newPage();
  const failures = bindFailures(page);
  return { context, page, failures };
}

async function waitForWorkReady(page, pathname = '/portfolio.html') {
  await page.goto(`${baseUrl}${pathname}`, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector(
    '[data-work-experience="true"][data-playground-ready="true"]',
    { timeout: timeoutMs },
  );
  await page.waitForFunction(
    () => window.__ABS_WORK__?.getSnapshot?.().ready === true,
    null,
    { timeout: timeoutMs, polling: 'raf' },
  );
  await page.waitForFunction(() => {
    const snapshot = window.__ABS_WORK__?.getSnapshot?.();
    return snapshot?.dotField?.routeVisualScale >= 0.999
      && snapshot?.dotField?.frameScheduled === false
      && snapshot?.camera?.frameScheduled === false;
  }, null, { timeout: timeoutMs, polling: 'raf' });
  await page.waitForFunction(() => {
    const root = document.querySelector('[data-work-experience="true"]');
    if (!root || root.dataset.playgroundInteractive !== 'true') return false;
    return root.getAnimations({ subtree: true }).every((animation) => {
      const timing = animation.effect?.getTiming?.();
      return timing?.iterations === Infinity || animation.playState !== 'running';
    });
  }, null, { timeout: timeoutMs, polling: 'raf' });
}

async function readBaseState(page) {
  return page.evaluate(() => {
    const root = document.querySelector('[data-work-experience="true"]');
    const viewport = root?.querySelector('[data-playground-viewport]');
    const items = [...(root?.querySelectorAll('.playground-semantic-collection [data-playground-item]') || [])];
    const itemState = items.map((item) => {
      const button = item.querySelector('button');
      const rect = button?.getBoundingClientRect();
      const media = item.dataset.workItemKind === 'case-study'
        ? item.querySelector('.portfolio-project-card__surface')
        : item.querySelector('.playground-media');
      const mediaRect = media?.getBoundingClientRect();
      const mediaStyle = media ? getComputedStyle(media) : null;
      return {
        id: item.dataset.playgroundItem,
        kind: item.dataset.workItemKind,
        tabIndex: button?.tabIndex,
        accessibleName: button?.getAttribute('aria-label') || '',
        area: rect ? rect.width * rect.height : 0,
        mediaArea: mediaRect ? mediaRect.width * mediaRect.height : 0,
        mediaWidth: mediaRect?.width || 0,
        mediaHeight: mediaRect?.height || 0,
        mediaRadius: Number.parseFloat(mediaStyle?.borderTopLeftRadius || '0') || 0,
      };
    });
    const routeTabs = [...document.querySelectorAll('[data-route-tab]')];
    const buttonBar = document.querySelector('[data-button-bar]');
    const barRect = buttonBar?.getBoundingClientRect();
    const tabRects = routeTabs.map((tab) => tab.getBoundingClientRect());
    const diagnostics = window.__ABS_WORK__?.getSnapshot?.() || null;
    const viewportRect = viewport?.getBoundingClientRect();
    return {
      title: document.querySelector('#playground-route-title')?.textContent?.trim() || '',
      description: document.querySelector('#playground-route-description')?.textContent?.trim() || '',
      routeContent: document.querySelector('#simulations[role="main"]')?.dataset.routeContent || '',
      projectCount: Number(root?.dataset.playgroundProjectCount || 0),
      itemState,
      routeTabs: routeTabs.map((tab) => ({
        id: tab.dataset.routeTab,
        label: tab.textContent?.trim() || '',
        current: tab.getAttribute('aria-current') || '',
      })),
      buttonBarOverflow: barRect && tabRects.length
        ? Math.max(0, Math.max(...tabRects.map((rect) => rect.right)) - barRect.right)
        : 0,
      diagnostics,
      viewport: viewportRect ? {
        left: viewportRect.left,
        top: viewportRect.top,
        right: viewportRect.right,
        bottom: viewportRect.bottom,
        width: viewportRect.width,
        height: viewportRect.height,
      } : null,
    };
  });
}

function assertBaseState(state, label) {
  const caseStudies = state.itemState.filter((item) => item.kind === 'case-study');
  const snippets = state.itemState.filter((item) => item.kind === 'snippet');
  const averageArea = (items) => items.reduce((sum, item) => sum + item.area, 0) / items.length;
  const averageMediaArea = (items) => (
    items.reduce((sum, item) => sum + item.mediaArea, 0) / items.length
  );
  assert(state.title === 'Work', `${label} must identify the route as Work`, state);
  assert(state.routeContent === 'portfolio', `${label} must retain the canonical portfolio route`, state);
  assert(state.projectCount === 36 && state.itemState.length === 36,
    `${label} must render the complete unified catalogue`, state);
  assert(caseStudies.length === 6 && snippets.length === 30,
    `${label} must expose six case studies and thirty snippets`, {
      caseStudies: caseStudies.length,
      snippets: snippets.length,
    });
  assert(averageArea(caseStudies) > averageArea(snippets) * 1.25,
    `${label} must make case studies materially larger than snippets`, {
      caseStudyArea: round(averageArea(caseStudies)),
      snippetArea: round(averageArea(snippets)),
    });
  assert(averageMediaArea(caseStudies) > averageMediaArea(snippets) * 1.25,
    `${label} case-study media must preserve the primary hierarchy`, {
      caseStudyArea: round(averageMediaArea(caseStudies)),
      snippetArea: round(averageMediaArea(snippets)),
    });
  const compactViewport = state.viewport?.width <= 700;
  const maximumCaseStudyWidth = state.viewport.width * (compactViewport ? 0.9 : 0.35);
  const maximumCaseStudyHeight = state.viewport.height * (compactViewport ? 0.44 : 0.35);
  assert(caseStudies.every((item) => item.mediaWidth <= maximumCaseStudyWidth + 1),
    `${label} case studies must stay within the compact primary width band`, {
      maximumAllowed: round(maximumCaseStudyWidth),
      widths: caseStudies.map((item) => round(item.mediaWidth)),
    });
  assert(caseStudies.every((item) => item.mediaHeight <= maximumCaseStudyHeight + 1),
    `${label} case studies must stay within the compact primary height band`, {
      maximumAllowed: round(maximumCaseStudyHeight),
      heights: caseStudies.map((item) => round(item.mediaHeight)),
    });
  assert(state.itemState.every((item) => item.mediaRadius >= 17.5),
    `${label} every Work image needs the generous rounded media edge`, {
      radii: state.itemState.map((item) => ({ id: item.id, radius: round(item.mediaRadius) })),
    });
  assert(state.itemState.every((item) => item.accessibleName.length > 12),
    `${label} item controls need descriptive accessible names`);
  assert(state.itemState.filter((item) => item.tabIndex === 0).length === 1,
    `${label} must expose one roving-tabindex entry point`);
  assert(state.routeTabs.length === 4, `${label} must expose four primary routes`, state.routeTabs);
  assert(state.routeTabs.map((tab) => tab.label).join('|') === 'Home|Work|About|Contact',
    `${label} navigation must contain the consolidated route labels`, state.routeTabs);
  assert(!state.routeTabs.some((tab) => tab.id === 'playground' || tab.label === 'Lab'),
    `${label} must not expose Lab as a primary route`, state.routeTabs);
  assert(state.routeTabs.find((tab) => tab.id === 'portfolio')?.current === 'page',
    `${label} must mark Work as the current primary route`, state.routeTabs);
  assert(state.buttonBarOverflow <= 2, `${label} route tabs must remain within the Button Bar`, {
    overflow: state.buttonBarOverflow,
  });
  assert(state.diagnostics?.dotField?.fieldMode === 'depth',
    `${label} must use the Work depth field`, state.diagnostics?.dotField);
  assert(state.diagnostics?.dotField?.depthLayerCount === 3,
    `${label} must render all three restrained depth layers`, state.diagnostics?.dotField);
  assert(state.diagnostics?.dotField?.drawnDotCount <= 1800,
    `${label} depth field must remain within its dot budget`, state.diagnostics?.dotField);
  assert(state.diagnostics?.diagnostics?.activeVideoCount <= 1,
    `${label} must bound active world videos`, state.diagnostics?.diagnostics);
  assert(state.diagnostics?.diagnostics?.activeIframeCount <= 1,
    `${label} must bound active world iframes`, state.diagnostics?.diagnostics);
}

async function setItemOffset(page, itemId, offsetX = 170, offsetY = 0) {
  await page.evaluate(({ id, x, y }) => {
    const api = window.__ABS_WORK__;
    const snapshot = api?.getSnapshot?.();
    const placement = snapshot?.placements?.find((candidate) => candidate.id === id);
    if (!api || !placement || !snapshot?.dotField) throw new Error(`Missing placement for ${id}`);
    const spacing = snapshot.dotField.gridSpacingPx;
    const scale = snapshot.dotField.worldScale;
    const centerX = (placement.xCell + (placement.footprintWidthCells / 2)) * spacing;
    const centerY = (placement.yCell + (placement.footprintHeightCells / 2)) * spacing;
    api.setCamera(centerX - (x / scale), centerY - (y / scale));
  }, { id: itemId, x: offsetX, y: offsetY });
  await page.waitForFunction(() => {
    const snapshot = window.__ABS_WORK__?.getSnapshot?.();
    return snapshot?.camera?.frameScheduled === false && snapshot?.dotField?.frameScheduled === false;
  }, null, { timeout: timeoutMs, polling: 'raf' });
}

async function auditWorkItemPresence(page) {
  const targets = [
    { id: CASE_STUDY_ID, kind: 'case-study', screenshot: 'desktop-case-study-hover.png' },
    { id: SNIPPET_ID, kind: 'snippet', screenshot: 'desktop-snippet-hover.png' },
  ];
  const report = {};

  for (const target of targets) {
    await setItemOffset(page, target.id, 0, 0);
    const button = page.locator(`[data-playground-item="${target.id}"] button`);
    const readState = () => page.evaluate(({ id, kind }) => {
      const item = document.querySelector(`[data-playground-item="${CSS.escape(id)}"]`);
      const media = kind === 'case-study'
        ? item?.querySelector('.portfolio-project-card__surface')
        : item?.querySelector('.playground-media');
      const rect = media?.getBoundingClientRect();
      const style = media ? getComputedStyle(media) : null;
      return {
        rect: rect ? {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        } : null,
        radius: Number.parseFloat(style?.borderTopLeftRadius || '0') || 0,
        shadow: style?.boxShadow || 'none',
      };
    }, target);
    const before = await readState();
    await button.hover();
    await page.waitForTimeout(520);
    const hovered = await readState();
    assert(before.rect && hovered.rect, `${target.kind} hover needs measurable media geometry`);
    assert(hovered.rect.top <= before.rect.top - 2,
      `${target.kind} hover must add a compact upward presence`, { before, hovered });
    assert(hovered.rect.width >= before.rect.width + 1,
      `${target.kind} hover must add a restrained scale response`, { before, hovered });
    assert(hovered.shadow !== before.shadow && hovered.shadow !== 'none',
      `${target.kind} hover must strengthen the contact shadow`, { before, hovered });
    assert(hovered.radius >= 17.5,
      `${target.kind} hover must retain the generous rounded edge`, hovered);
    await page.screenshot({ path: resolve(runRoot, target.screenshot) });
    report[target.kind] = {
      liftPx: round(before.rect.top - hovered.rect.top),
      scale: round(hovered.rect.width / before.rect.width),
      radiusPx: round(hovered.radius),
      shadowChanged: hovered.shadow !== before.shadow,
    };
    await page.mouse.move(2, 2);
    await page.waitForTimeout(220);
  }

  return report;
}

async function installPhaseRecorder(page, itemId) {
  await page.evaluate((id) => {
    window.__ABS_WORK_AUDIT_OBSERVER__?.disconnect?.();
    window.__ABS_WORK_AUDIT_PHASES__ = [];
    const root = document.querySelector('[data-work-experience="true"]');
    const viewport = root?.querySelector('[data-playground-viewport]');
    const capture = () => {
      const source = root?.querySelector(`[data-playground-item="${CSS.escape(id)}"] button`);
      const sourceRect = source?.getBoundingClientRect();
      const viewportRect = viewport?.getBoundingClientRect();
      window.__ABS_WORK_AUDIT_PHASES__.push({
        phase: root?.dataset.workOpenPhase || 'idle',
        time: performance.now(),
        sourceCenter: sourceRect ? {
          x: sourceRect.left + (sourceRect.width / 2),
          y: sourceRect.top + (sourceRect.height / 2),
        } : null,
        viewportCenter: viewportRect ? {
          x: viewportRect.left + (viewportRect.width / 2),
          y: viewportRect.top + (viewportRect.height / 2),
        } : null,
      });
    };
    const observer = new MutationObserver(capture);
    observer.observe(root, { attributes: true, attributeFilter: ['data-work-open-phase'] });
    window.__ABS_WORK_AUDIT_OBSERVER__ = observer;
    capture();
  }, itemId);
}

async function readPhaseRecords(page) {
  return page.evaluate(() => [...(window.__ABS_WORK_AUDIT_PHASES__ || [])]);
}

function assertCenterThenOpen(records, terminalPhases, label) {
  const phases = records.map((record) => record.phase);
  const centeringIndex = phases.indexOf('centering');
  const terminalIndex = phases.findIndex((phase) => terminalPhases.includes(phase));
  assert(centeringIndex >= 0 && terminalIndex > centeringIndex,
    `${label} must centre before presentation`, { phases });
  const centered = [...records]
    .reverse()
    .find((record) => [
      'centering',
      'expanding',
      'access-pending',
      'preparing',
      'opening',
    ].includes(record.phase));
  assert(centered?.sourceCenter && centered?.viewportCenter,
    `${label} needs a measurable centred source state`, records);
  const distance = Math.hypot(
    centered.sourceCenter.x - centered.viewportCenter.x,
    centered.sourceCenter.y - centered.viewportCenter.y,
  );
  assert(distance <= 72, `${label} source must settle near the viewport centre before opening`, {
    distance: round(distance),
    centered,
    phases,
  });
}

async function auditDepthFieldSleep(page) {
  const before = await page.evaluate(() => window.__ABS_WORK__.getSnapshot());
  await page.waitForTimeout(320);
  const stable = await page.evaluate(() => window.__ABS_WORK__.getSnapshot());
  assert(stable.dotField.drawCount === before.dotField.drawCount,
    'The stable Work depth field must sleep between input changes', {
      before: before.dotField.drawCount,
      after: stable.dotField.drawCount,
    });
  assert(!stable.dotField.frameScheduled && !stable.camera.frameScheduled,
    'The stable Work canvas must not retain a scheduled frame', stable);

  const viewport = page.locator('[data-playground-viewport]');
  const box = await viewport.boundingBox();
  assert(box, 'The Work viewport must have measurable drag geometry');
  const start = { x: box.x + (box.width * 0.52), y: box.y + (box.height * 0.52) };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.evaluate((baselineDrawCount) => {
    const viewport = document.querySelector('[data-playground-viewport]');
    window.__ABS_WORK_INPUT_LATENCY__ = {
      baselineDrawCount,
      pointerAt: 0,
      drawAt: 0,
    };
    viewport?.addEventListener('pointermove', () => {
      const measurement = window.__ABS_WORK_INPUT_LATENCY__;
      if (!measurement || measurement.pointerAt > 0) return;
      measurement.pointerAt = performance.now();
      const observeDraw = () => {
        const drawCount = window.__ABS_WORK__?.getSnapshot?.().dotField?.drawCount || 0;
        if (drawCount > measurement.baselineDrawCount) {
          measurement.drawAt = performance.now();
          return;
        }
        requestAnimationFrame(observeDraw);
      };
      requestAnimationFrame(observeDraw);
    }, { capture: true, once: true });
  }, stable.dotField.drawCount);
  await page.mouse.move(start.x - 130, start.y + 72, { steps: 8 });
  await page.mouse.up();
  await page.waitForFunction((drawCount) => {
    const snapshot = window.__ABS_WORK__?.getSnapshot?.();
    return snapshot?.dotField?.drawCount > drawCount
      && snapshot?.camera?.frameScheduled === false
      && snapshot?.dotField?.frameScheduled === false;
  }, stable.dotField.drawCount, { timeout: timeoutMs, polling: 'raf' });
  const moved = await page.evaluate(() => window.__ABS_WORK__.getSnapshot());
  assert(
    Math.hypot(moved.camera.logicalX - stable.camera.logicalX, moved.camera.logicalY - stable.camera.logicalY) > 20,
    'Dragging must move the logical Work camera', { before: stable.camera, after: moved.camera },
  );
  await page.waitForTimeout(320);
  const settled = await page.evaluate(() => window.__ABS_WORK__.getSnapshot());
  const inputLatency = await page.evaluate(() => window.__ABS_WORK_INPUT_LATENCY__ || null);
  assert(inputLatency?.pointerAt > 0 && inputLatency?.drawAt >= inputLatency.pointerAt,
    'The Work drag gesture must produce a measurable next paint', inputLatency);
  const inputToDrawMs = inputLatency.drawAt - inputLatency.pointerAt;
  assert(inputToDrawMs <= MAX_INPUT_TO_DRAW_LATENCY_MS,
    'The Work canvas must paint promptly after drag input', {
      inputToDrawMs: round(inputToDrawMs),
      maximumMs: MAX_INPUT_TO_DRAW_LATENCY_MS,
    });
  assert(settled.dotField.drawCount === moved.dotField.drawCount,
    'The Work depth field must return to sleep after drag settlement', {
      before: moved.dotField.drawCount,
      after: settled.dotField.drawCount,
    });
  const gestureDrawCount = settled.dotField.drawCount - stable.dotField.drawCount;
  assert(gestureDrawCount <= MAX_GESTURE_DRAW_COUNT,
    'One bounded drag gesture must not create an unbounded render tail', {
      gestureDrawCount,
      maximum: MAX_GESTURE_DRAW_COUNT,
    });
  return {
    drawCountBefore: before.dotField.drawCount,
    drawCountAfterDrag: settled.dotField.drawCount,
    gestureDrawCount,
    inputToDrawMs: round(inputToDrawMs),
    cameraTravel: round(Math.hypot(
      settled.camera.logicalX - stable.camera.logicalX,
      settled.camera.logicalY - stable.camera.logicalY,
    )),
  };
}

async function auditKeyboardNavigation(page) {
  const viewport = page.locator('[data-playground-viewport]');
  await viewport.focus();
  await page.keyboard.press('Tab');
  await page.waitForFunction(() => Boolean(
    document.activeElement?.closest?.('[data-playground-item]'),
  ), null, { timeout: timeoutMs, polling: 'raf' });
  const first = await page.evaluate(() => ({
    id: document.activeElement?.closest?.('[data-playground-item]')?.dataset.playgroundItem || '',
    kind: document.activeElement?.closest?.('[data-playground-item]')?.dataset.workItemKind || '',
  }));
  assert(first.id && first.kind === 'case-study',
    'Tab must enter the Work field through a case-study card', first);

  await page.keyboard.press('ArrowRight');
  await page.waitForFunction((previousId) => {
    const activeItem = document.activeElement?.closest?.('[data-playground-item]');
    return Boolean(activeItem?.dataset.playgroundItem)
      && activeItem.dataset.playgroundItem !== previousId;
  }, first.id, { timeout: timeoutMs, polling: 'raf' });
  await page.waitForFunction(() => {
    const activeItem = document.activeElement?.closest?.('[data-playground-item]');
    const activeMedia = activeItem?.dataset.workItemKind === 'case-study'
      ? activeItem.querySelector('.portfolio-project-card__surface')
      : activeItem?.querySelector('.playground-media');
    if (!activeMedia) return false;
    return (Number.parseFloat(getComputedStyle(activeMedia).scale || '1') || 1) >= 1.005;
  }, null, { timeout: timeoutMs, polling: 'raf' });
  const next = await page.evaluate(() => {
    const activeItem = document.activeElement?.closest?.('[data-playground-item]');
    const activeButton = activeItem?.querySelector('button');
    const activeMedia = activeItem?.dataset.workItemKind === 'case-study'
      ? activeItem.querySelector('.portfolio-project-card__surface')
      : activeItem?.querySelector('.playground-media');
    const rovingButtons = [...document.querySelectorAll(
      '.playground-semantic-collection [data-playground-item] button[tabindex="0"]',
    )];
    const style = activeButton ? getComputedStyle(activeButton) : null;
    const mediaStyle = activeMedia ? getComputedStyle(activeMedia) : null;
    return {
      id: activeItem?.dataset.playgroundItem || '',
      rovingCount: rovingButtons.length,
      rovingOwnsFocus: rovingButtons[0] === document.activeElement,
      focusVisible: activeButton?.matches(':focus-visible') || false,
      outlineWidth: Number.parseFloat(style?.outlineWidth || '0'),
      outlineStyle: style?.outlineStyle || '',
      boxShadow: style?.boxShadow || '',
      mediaScale: Number.parseFloat(mediaStyle?.scale || '1') || 1,
      mediaShadow: mediaStyle?.boxShadow || 'none',
    };
  });
  assert(next.id && next.id !== first.id,
    'Arrow navigation must move focus to a different spatial project', { first, next });
  assert(next.rovingCount === 1 && next.rovingOwnsFocus,
    'Arrow navigation must move the single roving-tabindex entry with focus', next);
  assert(next.focusVisible && next.outlineStyle !== 'none' && next.outlineWidth >= 2
      && next.boxShadow !== 'none',
    'Arrow-focused Work projects must expose the dual-ring focus cue', next);
  assert(next.mediaScale >= 1.005 && next.mediaShadow !== 'none',
    'Keyboard focus must give Work media the same restrained presence as hover', next);
  return { first, next };
}

async function auditSnippetFlow(page) {
  await setItemOffset(page, SNIPPET_ID, 180, -60);
  await installPhaseRecorder(page, SNIPPET_ID);
  const selector = `[data-playground-item="${SNIPPET_ID}"] button`;
  await page.locator(selector).click();
  await page.waitForSelector('[data-work-snippet-stage][data-phase="open"]', { timeout: timeoutMs });
  const records = await readPhaseRecords(page);
  assertCenterThenOpen(records, ['opening', 'open'], 'Snippet');
  const openState = await page.evaluate((id) => ({
    workId: new URL(location.href).searchParams.get('work'),
    worldHidden: document.querySelector('[data-playground-world]')?.getAttribute('aria-hidden'),
    expanded: document.querySelector(`[data-playground-item="${CSS.escape(id)}"] button`)?.getAttribute('aria-expanded'),
    activeInsideDialog: Boolean(document.querySelector('[data-work-snippet-stage]')?.contains(document.activeElement)),
    phase: document.querySelector('[data-work-experience]')?.dataset.workOpenPhase,
  }), SNIPPET_ID);
  assert(openState.workId === SNIPPET_ID, 'Snippet selection must be shareable in the Work URL', openState);
  assert(openState.worldHidden === 'true' && openState.expanded === 'true',
    'Snippet presentation must make the canvas inert and expose expanded state', openState);
  assert(openState.activeInsideDialog && openState.phase === 'open',
    'Snippet presentation must settle focus inside an open dialog', openState);
  await page.screenshot({ path: resolve(runRoot, 'desktop-snippet-open.png') });
  await page.keyboard.press('Tab');
  assert(await page.evaluate(() => (
    document.querySelector('[data-work-snippet-stage]')?.contains(document.activeElement)
  )), 'Snippet Tab navigation must stay inside the dialog');
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-work-snippet-stage]', { state: 'detached', timeout: timeoutMs });
  await page.waitForFunction((id) => {
    const source = document.activeElement?.closest?.('[data-playground-item]');
    return !new URL(location.href).searchParams.has('work')
      && source?.dataset.playgroundItem === id;
  }, SNIPPET_ID, { timeout: timeoutMs });
  return { phases: records.map((record) => record.phase) };
}

async function auditProtectedGate(browser) {
  const audit = await createAuditPage(browser);
  try {
    await waitForWorkReady(audit.page);
    await setItemOffset(audit.page, CASE_STUDY_ID, -180, 52);
    await installPhaseRecorder(audit.page, CASE_STUDY_ID);
    const selector = `[data-playground-item="${CASE_STUDY_ID}"] button`;
    await audit.page.locator(selector).click();
    await audit.page.waitForSelector('[data-portfolio-access-gate][data-phase="open"]', {
      timeout: timeoutMs,
    });
    const records = await readPhaseRecords(audit.page);
    assertCenterThenOpen(records, ['access-pending'], 'Protected case study');
    const gatedState = await audit.page.evaluate(() => ({
      gatePhase: document.documentElement.dataset.absPortfolioAccessGatePhase,
      drawerOpen: Boolean(document.querySelector('.portfolio-project-view.is-open')),
      worldHidden: document.querySelector('[data-playground-world]')?.getAttribute('aria-hidden'),
      activeInGate: Boolean(document.querySelector('[data-portfolio-access-gate]')?.contains(document.activeElement)),
    }));
    assert(gatedState.gatePhase === 'open' && !gatedState.drawerOpen,
      'A fresh session must show the gate without exposing the case study', gatedState);
    assert(gatedState.worldHidden === 'true' && gatedState.activeInGate,
      'The password gate must own focus while the Work canvas is inert', gatedState);
    await audit.page.screenshot({ path: resolve(runRoot, 'desktop-protected-gate.png') });
    await audit.page.locator('.portfolio-access-gate__close').click();
    await audit.page.waitForSelector('[data-portfolio-access-gate]', {
      state: 'detached',
      timeout: timeoutMs,
    });
    await audit.page.waitForFunction((id) => {
      const source = document.activeElement?.closest?.('[data-playground-item]');
      return !new URL(location.href).searchParams.has('work')
        && source?.dataset.playgroundItem === id
        && !document.querySelector('[data-playground-world]')?.hasAttribute('aria-hidden');
    }, CASE_STUDY_ID, { timeout: timeoutMs });
    assertNoFailures(audit.failures, 'Protected Work gate');
    return { phases: records.map((record) => record.phase) };
  } finally {
    await audit.context.close();
  }
}

async function auditUnlockedCaseStudy(browser) {
  const audit = await createAuditPage(browser);
  try {
    await waitForWorkReady(audit.page);
    await setItemOffset(audit.page, CASE_STUDY_ID, 190, -55);
    await installPhaseRecorder(audit.page, CASE_STUDY_ID);
    const selector = `[data-playground-item="${CASE_STUDY_ID}"] button`;
    await audit.page.locator(selector).click();
    await audit.page.waitForSelector('[data-portfolio-access-gate][data-phase="open"]', {
      timeout: timeoutMs,
    });
    const inviteCode = getGateInviteCode('portfolio');
    const invalidCode = inviteCode
      .split('')
      .map((digit) => String((Number(digit) + 1) % 10))
      .join('');
    const inputs = audit.page.locator('.portfolio-access-gate .portfolio-digit');
    assert(await inputs.count() === inviteCode.length,
      'The Work gate must expose one field for each access-code digit');
    for (let index = 0; index < invalidCode.length; index += 1) {
      await inputs.nth(index).fill(invalidCode[index]);
    }
    await audit.page.waitForFunction(() => (
      document.querySelector('.portfolio-access-gate__status')?.textContent?.includes('did not match')
    ), null, { timeout: timeoutMs });
    await audit.page.waitForFunction(() => (
      [...document.querySelectorAll('.portfolio-access-gate .portfolio-digit')]
        .every((input) => !input.value)
    ), null, { timeout: timeoutMs });
    for (let index = 0; index < inviteCode.length; index += 1) {
      await inputs.nth(index).fill(inviteCode[index]);
    }
    await audit.page.waitForSelector('[data-portfolio-access-gate]', {
      state: 'detached',
      timeout: timeoutMs,
    });
    await audit.page.waitForSelector('[data-work-presentation-phase="open"]', { timeout: timeoutMs });
    const records = await readPhaseRecords(audit.page);
    assertCenterThenOpen(records, ['preparing', 'opening', 'open'], 'Case study');
    const drawerState = await audit.page.evaluate((id) => {
      const drawer = document.querySelector('.portfolio-project-view__drawer');
      const host = document.querySelector('#portfolio-sheet-host');
      const buttonBar = document.querySelector('[data-button-bar]');
      const drawerRect = drawer?.getBoundingClientRect();
      const hostRect = host?.getBoundingClientRect();
      const buttonBarRect = buttonBar?.getBoundingClientRect();
      const overlapHit = buttonBarRect
        ? document.elementFromPoint(
          buttonBarRect.left + (buttonBarRect.width / 2),
          buttonBarRect.top + (buttonBarRect.height / 2),
        )
        : null;
      return {
        workId: new URL(location.href).searchParams.get('work'),
        title: document.querySelector('#portfolioProjectTitle')?.textContent?.trim() || '',
        phase: document.querySelector('[data-work-experience]')?.dataset.workOpenPhase,
        activeInsideDrawer: Boolean(document.querySelector('.portfolio-project-view')?.contains(document.activeElement)),
        expanded: document.querySelector(`[data-playground-item="${CSS.escape(id)}"] button`)?.getAttribute('aria-expanded'),
        drawerRect: drawerRect ? {
          top: drawerRect.top,
          bottom: drawerRect.bottom,
          left: drawerRect.left,
          right: drawerRect.right,
        } : null,
        hostRect: hostRect ? {
          top: hostRect.top,
          bottom: hostRect.bottom,
          left: hostRect.left,
          right: hostRect.right,
        } : null,
        buttonBarTop: buttonBarRect?.top ?? null,
        hostZIndex: Number.parseInt(getComputedStyle(host).zIndex, 10) || 0,
        buttonBarZIndex: Number.parseInt(getComputedStyle(buttonBar).zIndex, 10) || 0,
        buttonBarOwnsOverlap: Boolean(overlapHit?.closest?.('[data-button-bar]')),
      };
    }, CASE_STUDY_ID);
    assert(drawerState.workId === CASE_STUDY_ID && drawerState.title,
      'Case study drawer must retain its shareable Work selection and authored title', drawerState);
    assert(drawerState.phase === 'open' && drawerState.activeInsideDrawer && drawerState.expanded === 'true',
      'Case study drawer must settle open with focus ownership and expanded state', drawerState);
    assert(drawerState.drawerRect && drawerState.hostRect
      && drawerState.drawerRect.top >= drawerState.hostRect.top - 3
      && drawerState.drawerRect.bottom <= drawerState.hostRect.bottom + 3
      && drawerState.drawerRect.left >= drawerState.hostRect.left - 3
      && drawerState.drawerRect.right <= drawerState.hostRect.right + 3,
    'Case study drawer must retain its deliberate two-pixel bleed inside the clipped shell host', drawerState);
    assert(drawerState.buttonBarTop !== null
      && drawerState.drawerRect.bottom > drawerState.buttonBarTop
      && drawerState.hostZIndex < drawerState.buttonBarZIndex
      && drawerState.buttonBarOwnsOverlap,
    'The overlapping Button Bar must paint and receive input above the case-study drawer', drawerState);
    await audit.page.screenshot({ path: resolve(runRoot, 'desktop-case-study-open.png') });
    await audit.page.keyboard.press('Escape');
    await audit.page.waitForFunction((id) => {
      const root = document.querySelector('[data-work-experience]');
      const source = document.activeElement?.closest?.('[data-playground-item]');
      return root?.dataset.workOpenPhase === 'closed'
        && !new URL(location.href).searchParams.has('work')
        && source?.dataset.playgroundItem === id;
    }, CASE_STUDY_ID, { timeout: timeoutMs });
    await setItemOffset(audit.page, SECOND_CASE_STUDY_ID, -170, 48);
    await audit.page.locator(
      `[data-playground-item="${SECOND_CASE_STUDY_ID}"] button`,
    ).click();
    await audit.page.waitForSelector('[data-work-presentation-phase="open"]', { timeout: timeoutMs });
    assert(!await audit.page.locator('[data-portfolio-access-gate]').count(),
      'Accepted Work access must persist across protected case studies in the same browser');
    await audit.page.keyboard.press('Escape');
    await audit.page.waitForFunction((id) => {
      const source = document.activeElement?.closest?.('[data-playground-item]');
      return document.querySelector('[data-work-experience]')?.dataset.workOpenPhase === 'closed'
        && source?.dataset.playgroundItem === id;
    }, SECOND_CASE_STUDY_ID, { timeout: timeoutMs });
    assertNoFailures(audit.failures, 'Unlocked Work case study');
    return {
      title: drawerState.title,
      phases: records.map((record) => record.phase),
      invalidCodeRejected: true,
      accessPersistedAcrossCaseStudies: true,
    };
  } finally {
    await audit.context.close();
  }
}

async function auditMobile(browser) {
  const audit = await createAuditPage(browser, { viewport: { width: 390, height: 844 } });
  try {
    await waitForWorkReady(audit.page, `/portfolio.html?work=${SNIPPET_ID}`);
    await audit.page.waitForSelector('[data-work-snippet-stage][data-phase="open"]', { timeout: timeoutMs });
    const state = await readBaseState(audit.page);
    assertBaseState(state, 'Mobile Work');
    const geometry = await audit.page.evaluate(() => {
      const surface = document.querySelector('.work-snippet-stage__surface')?.getBoundingClientRect();
      const close = document.querySelector('.work-snippet-stage__close')?.getBoundingClientRect();
      const buttonBar = document.querySelector('[data-button-bar]')?.getBoundingClientRect();
      const workViewport = document.querySelector('[data-playground-viewport]')?.getBoundingClientRect();
      const overlapHit = buttonBar
        ? document.elementFromPoint(
          buttonBar.left + (buttonBar.width / 2),
          buttonBar.top + (buttonBar.height / 2),
        )
        : null;
      return {
        viewport: { width: innerWidth, height: innerHeight },
        surface: surface ? { left: surface.left, top: surface.top, right: surface.right, bottom: surface.bottom } : null,
        close: close ? { left: close.left, top: close.top, right: close.right, bottom: close.bottom } : null,
        buttonBarTop: buttonBar?.top ?? null,
        workViewport: workViewport ? {
          left: workViewport.left,
          top: workViewport.top,
          right: workViewport.right,
          bottom: workViewport.bottom,
        } : null,
        buttonBarOwnsOverlap: Boolean(overlapHit?.closest?.('[data-button-bar]')),
      };
    });
    assert(geometry.surface && geometry.close,
      'Mobile snippet presentation must expose measurable surface and close control', geometry);
    assert(geometry.workViewport
      && geometry.surface.left >= geometry.workViewport.left - 1
      && geometry.surface.right <= geometry.workViewport.right + 1
      && geometry.surface.top >= geometry.workViewport.top - 1
      && geometry.surface.bottom <= geometry.workViewport.bottom + 1,
    'Mobile snippet presentation must remain within the clipped Work window', geometry);
    assert(geometry.surface.bottom > geometry.buttonBarTop && geometry.buttonBarOwnsOverlap,
      'The mobile Button Bar must retain paint and input ownership over the window overlap', geometry);
    assert(geometry.close.left >= 0 && geometry.close.right <= geometry.viewport.width
      && geometry.close.top >= 0 && geometry.close.bottom <= geometry.viewport.height,
    'Mobile snippet close control must remain fully reachable', geometry);
    await audit.page.screenshot({ path: resolve(runRoot, 'mobile-snippet-open.png') });
    await audit.page.keyboard.press('Escape');
    await audit.page.waitForSelector('[data-work-snippet-stage]', { state: 'detached', timeout: timeoutMs });
    await waitForWorkReady(audit.page, '/playground.html');
    const aliasState = await readBaseState(audit.page);
    assertBaseState(aliasState, 'Legacy Work alias');
    await setItemOffset(audit.page, CASE_STUDY_ID, -120, 36);
    await audit.page.locator(`[data-playground-item="${CASE_STUDY_ID}"] button`).click();
    await audit.page.waitForSelector('[data-portfolio-access-gate][data-phase="open"]', {
      timeout: timeoutMs,
    });
    const gateGeometry = await audit.page.evaluate(() => {
      const panel = document.querySelector('.portfolio-access-gate__inner')?.getBoundingClientRect();
      const close = document.querySelector('.portfolio-access-gate__close')?.getBoundingClientRect();
      const workViewport = document.querySelector('[data-playground-viewport]')?.getBoundingClientRect();
      return {
        title: document.querySelector('#portfolio-access-gate-title')?.textContent?.trim() || '',
        panel: panel ? { left: panel.left, top: panel.top, right: panel.right, bottom: panel.bottom } : null,
        close: close ? { left: close.left, top: close.top, right: close.right, bottom: close.bottom } : null,
        workViewport: workViewport ? {
          left: workViewport.left,
          top: workViewport.top,
          right: workViewport.right,
          bottom: workViewport.bottom,
        } : null,
      };
    });
    assert(gateGeometry.title === 'View Work',
      'The responsive password gate must use the consolidated Work language', gateGeometry);
    assert(gateGeometry.panel && gateGeometry.close && gateGeometry.workViewport
      && gateGeometry.panel.left >= gateGeometry.workViewport.left - 1
      && gateGeometry.panel.right <= gateGeometry.workViewport.right + 1
      && gateGeometry.panel.top >= gateGeometry.workViewport.top - 1
      && gateGeometry.panel.bottom <= gateGeometry.workViewport.bottom + 1
      && gateGeometry.close.left >= gateGeometry.workViewport.left
      && gateGeometry.close.right <= gateGeometry.workViewport.right,
    'The mobile Work gate panel and close control must remain within the studio window', gateGeometry);
    await audit.page.screenshot({ path: resolve(runRoot, 'mobile-protected-gate.png') });
    await audit.page.keyboard.press('Escape');
    await audit.page.waitForSelector('[data-portfolio-access-gate]', {
      state: 'detached',
      timeout: timeoutMs,
    });
    assertNoFailures(audit.failures, 'Mobile Work');
    return { geometry, gateGeometry, aliasRoute: audit.page.url() };
  } finally {
    await audit.context.close();
  }
}

async function auditReducedMotion(browser) {
  const audit = await createAuditPage(browser, { reducedMotion: 'reduce' });
  try {
    await waitForWorkReady(audit.page);
    assert(await audit.page.locator('[data-work-experience]').getAttribute('data-playground-reduced-motion') === 'true',
      'Reduced-motion preference must reach the Work route');
    await setItemOffset(audit.page, SNIPPET_ID, 190, 40);
    const reducedButton = audit.page.locator(
      `[data-playground-item="${SNIPPET_ID}"] button`,
    );
    const readReducedPresence = () => audit.page.evaluate((id) => {
      const media = document.querySelector(
        `[data-playground-item="${CSS.escape(id)}"] .playground-media`,
      );
      const rect = media?.getBoundingClientRect();
      const style = media ? getComputedStyle(media) : null;
      return {
        rect: rect ? {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        } : null,
        shadow: style?.boxShadow || 'none',
      };
    }, SNIPPET_ID);
    const presenceBefore = await readReducedPresence();
    await reducedButton.hover();
    await audit.page.waitForTimeout(220);
    const presenceHovered = await readReducedPresence();
    assert(presenceBefore.rect && presenceHovered.rect,
      'Reduced-motion hover needs measurable Work media geometry');
    assert(Math.abs(presenceBefore.rect.left - presenceHovered.rect.left) <= 0.5
      && Math.abs(presenceBefore.rect.top - presenceHovered.rect.top) <= 0.5
      && Math.abs(presenceBefore.rect.width - presenceHovered.rect.width) <= 0.5
      && Math.abs(presenceBefore.rect.height - presenceHovered.rect.height) <= 0.5,
    'Reduced Motion must remove Work hover travel and scale', {
      before: presenceBefore,
      hovered: presenceHovered,
    });
    assert(presenceHovered.shadow !== presenceBefore.shadow,
      'Reduced Motion must retain the non-moving Work hover shadow', {
        before: presenceBefore,
        hovered: presenceHovered,
      });
    await audit.page.mouse.move(2, 2);
    await audit.page.waitForTimeout(220);
    await installPhaseRecorder(audit.page, SNIPPET_ID);
    await reducedButton.click();
    await audit.page.waitForSelector('[data-work-snippet-stage]');
    const durations = await audit.page.evaluate(() => {
      const stage = document.querySelector('[data-work-snippet-stage]');
      return [stage, ...(stage?.querySelectorAll('*') || [])]
        .flatMap((element) => element?.getAnimations?.() || [])
        .map((animation) => Number(animation.effect?.getTiming?.().duration || 0));
    });
    assert(durations.length >= 3 && Math.max(...durations) <= 150,
      'Reduced-motion snippet presentation must use only its short fade timing', durations);
    await audit.page.waitForSelector('[data-work-snippet-stage][data-phase="open"]', { timeout: timeoutMs });
    const records = await readPhaseRecords(audit.page);
    assertCenterThenOpen(records, ['opening', 'open'], 'Reduced-motion snippet');
    await audit.page.keyboard.press('Escape');
    await audit.page.waitForSelector('[data-work-snippet-stage]', { state: 'detached', timeout: timeoutMs });
    assertNoFailures(audit.failures, 'Reduced-motion Work');
    return {
      durations,
      hoverPresence: {
        geometryStable: true,
        shadowChanged: presenceHovered.shadow !== presenceBefore.shadow,
      },
      phases: records.map((record) => record.phase),
    };
  } finally {
    await audit.context.close();
  }
}

await mkdir(runRoot, { recursive: true });
await waitForServer();
const browser = await browserType.launch({ headless: process.env.ABS_HEADED !== '1' });

try {
  const desktop = await createAuditPage(browser);
  let desktopReport;
  try {
    await waitForWorkReady(desktop.page);
    const baseState = await readBaseState(desktop.page);
    assertBaseState(baseState, 'Desktop Work');
    const keyboard = await auditKeyboardNavigation(desktop.page);
    await desktop.page.screenshot({ path: resolve(runRoot, 'desktop-light.png') });
    const initialTheme = await desktop.page.locator('html').getAttribute('data-abs-theme');
    await desktop.page.locator('.shell-utility-control--theme').click();
    await desktop.page.waitForFunction((theme) => (
      document.documentElement.getAttribute('data-abs-theme') !== theme
    ), initialTheme, { timeout: timeoutMs });
    await desktop.page.screenshot({ path: resolve(runRoot, 'desktop-opposite-theme.png') });
    await desktop.page.locator('.shell-utility-control--theme').click();
    await desktop.page.waitForFunction((theme) => (
      document.documentElement.getAttribute('data-abs-theme') === theme
    ), initialTheme, { timeout: timeoutMs });
    const presence = await auditWorkItemPresence(desktop.page);
    const snippet = await auditSnippetFlow(desktop.page);
    const performance = await auditDepthFieldSleep(desktop.page);
    assertNoFailures(desktop.failures, 'Desktop Work');
    desktopReport = {
      catalogue: {
        caseStudies: baseState.itemState.filter((item) => item.kind === 'case-study').length,
        snippets: baseState.itemState.filter((item) => item.kind === 'snippet').length,
      },
      depthField: {
        layers: baseState.diagnostics.dotField.depthLayerCount,
        dots: baseState.diagnostics.dotField.drawnDotCount,
      },
      presence,
      snippet,
      keyboard,
      performance,
    };
  } finally {
    await desktop.context.close();
  }

  const report = {
    schemaVersion: 1,
    status: 'passed',
    completedAt: new Date().toISOString(),
    browser: browserName,
    baseUrl,
    desktop: desktopReport,
    protectedGate: await auditProtectedGate(browser),
    caseStudy: await auditUnlockedCaseStudy(browser),
    mobile: await auditMobile(browser),
    reducedMotion: await auditReducedMotion(browser),
  };
  await writeFile(resolve(runRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(`PASS: Work canvas audit (${browserName}).`);
  console.log(`Report: ${resolve(runRoot, 'report.json')}`);
} finally {
  await browser.close();
}
