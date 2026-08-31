#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import { getViewportCoverMode } from '../react-app/app/src/components/app/viewportGuard.js';

const baseUrl = (process.env.ABS_WORK_URL || 'http://localhost:8012').replace(/\/$/, '');
const browserName = process.env.ABS_BROWSER || 'chromium';
const output = resolve('output/playwright/work-refinements',
  `${new Date().toISOString().replace(/[:.]/g, '-')}-${browserName}`);
const content = JSON.parse(await readFile('react-app/app/public/config/contents-portfolio.json', 'utf8'));
const snippets = content.snippets;
const canonical = JSON.parse(await readFile('react-app/app/public/config/design-system.json', 'utf8'));
const report = { browser: browserName, baseUrl, viewports: [], media: [], repeats: [] };
await mkdir(output, { recursive: true });
const browser = await (browserName === 'webkit' ? webkit : chromium).launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
page.setDefaultTimeout(30_000);
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));

async function ready() {
  const settled = () => {
    const root = document.querySelector('[data-work-experience]');
    const viewport = root?.querySelector('[data-playground-viewport]')?.getBoundingClientRect();
    const state = window.__ABS_WORK__?.getSnapshot();
    return root?.dataset.playgroundInteractive === 'true' && state?.ready && viewport
      && root.dataset.routeMaterialState === 'complete'
      && root.getAnimations({ subtree: true }).every((animation) =>
        animation.effect?.getTiming().iterations === Infinity || animation.playState !== 'running')
      && Math.abs(state.camera.viewportWidthPx - viewport.width) < 1
      && Math.abs(state.camera.viewportHeightPx - viewport.height) < 1
      && Math.abs(state.camera.worldScale - Number(root.dataset.playgroundWorldScale)) < 0.0001
      && state.dotField.routeVisualScale >= 0.999
      && !state.camera.frameScheduled && !state.dotField.frameScheduled;
  };
  // A Promise predicate is truthy before its result resolves. Poll synchronously
  // and put the paint barrier between two checks of the current camera owner.
  await (await page.waitForFunction(settled)).dispose();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await (await page.waitForFunction(settled)).dispose();
}

async function idle() {
  await page.waitForFunction(() => {
    const state = window.__ABS_WORK__?.getSnapshot();
    return state && !state.camera.frameScheduled && !state.dotField.frameScheduled;
  });
}

async function positionItem(id, period = 0, offset = 110) {
  await page.waitForFunction(({ id, period, offset }) => {
    const api = window.__ABS_WORK__;
    const state = api?.getSnapshot();
    if (!state?.ready) return false;
    const item = state.placements.find((entry) => entry.id === id);
    const spacing = state.dotField.gridSpacingPx;
    api.setCamera((item.xCell + item.widthCells / 2) * spacing
      + period * state.camera.worldWidthPx - offset / (state.camera.worldScale * item.parallax),
    (item.yCell + item.footprintHeightCells / 2) * spacing
      - period * state.camera.worldHeightPx);
    return true;
  }, { id, period, offset });
  await idle();
}

async function closeSnippet(useBack = false) {
  if (useBack) await page.goBack();
  else await page.locator('.work-snippet-stage__close').click();
  await page.waitForSelector('[data-work-snippet-stage]', { state: 'detached' });
  await page.waitForFunction(() => {
    const state = window.__ABS_WORK__?.getSnapshot();
    return state?.ready && !state.selectedId;
  });
  await idle();
}

async function mediaGeometry(item) {
  return page.evaluate((item) => {
    const media = document.querySelector('.work-snippet-stage__media');
    const asset = media.querySelector('video, img, iframe');
    const copy = document.querySelector('.work-snippet-stage__copy');
    const viewport = document.querySelector('[data-playground-viewport]').getBoundingClientRect();
    const close = document.querySelector('.work-snippet-stage__close').getBoundingClientRect();
    const rect = media.getBoundingClientRect();
    const matrix = new DOMMatrix(getComputedStyle(media).transform);
    const trueWidth = asset?.videoWidth || asset?.naturalWidth || 0;
    const trueHeight = asset?.videoHeight || asset?.naturalHeight || 0;
    return {
      id: item.id, width: innerWidth, height: innerHeight,
      ratio: rect.width / rect.height,
      expectedRatio: item.intrinsicDimensions.width / item.intrinsicDimensions.height,
      naturalRatio: trueWidth && trueHeight ? trueWidth / trueHeight : null,
      fit: asset ? getComputedStyle(asset).objectFit : '',
      uniformScale: Math.abs(matrix.a - matrix.d) < 0.0001,
      withinViewport: rect.left >= viewport.left - 1 && rect.right <= viewport.right + 1
        && rect.top >= close.bottom - 1 && copy.getBoundingClientRect().bottom <= viewport.bottom - 1,
      rationale: copy.textContent.trim(),
      closeTarget: Math.min(close.width, close.height),
      video: asset?.tagName === 'VIDEO' ? { width: trueWidth, height: trueHeight, controls: asset.controls } : null,
    };
  }, item);
}

async function auditMedia(item, { back = false, screenshot = false } = {}) {
  await positionItem(item.id);
  await page.locator(`[data-playground-item="${item.id}"] button`).click();
  await page.waitForSelector('[data-work-snippet-stage][data-phase="open"]');
  if (item.type === 'video') {
    await page.waitForFunction(() => {
      const video = document.querySelector('.work-snippet-stage video');
      return video?.videoWidth > 0 && video.readyState >= 2 && video.currentTime >= 0.25;
    });
  }
  const geometry = await mediaGeometry(item);
  assert(Math.abs(geometry.ratio - geometry.expectedRatio) < 0.003, JSON.stringify(geometry));
  if (geometry.naturalRatio) assert(Math.abs(geometry.ratio - geometry.naturalRatio) < 0.003,
    `Real media aspect ratio disagrees with the stage: ${JSON.stringify(geometry)}`);
  assert(geometry.uniformScale && geometry.withinViewport, JSON.stringify(geometry));
  assert(geometry.closeTarget >= 43.5, JSON.stringify(geometry));
  assert(geometry.rationale.includes(item.description), 'Keep the authored rationale below open media');
  if (item.type !== 'code') assert.equal(geometry.fit, 'contain');
  if (screenshot) await page.screenshot({ path: resolve(output, `${geometry.width}-${item.id}.png`) });
  report.media.push(geometry);
  await closeSnippet(back);
  assert.equal(await page.evaluate(() => document.activeElement?.closest('[data-playground-item]')?.dataset.playgroundItem),
    item.id, 'Closing must restore focus to the exact logical item');
}

async function auditRepeat(period) {
  const item = snippets[0];
  await positionItem(item.id, period);
  const before = await page.evaluate((id) => {
    const rect = document.querySelector(`[data-playground-item="${id}"] button`).getBoundingClientRect();
    return { rect: rect.toJSON(), camera: window.__ABS_WORK__.getSnapshot().camera };
  }, item.id);
  await page.locator(`[data-playground-item="${item.id}"] button`).click();
  await page.waitForSelector('[data-work-snippet-stage][data-phase="open"]');
  const after = await page.evaluate(() => window.__ABS_WORK__.getSnapshot());
  const distance = Math.hypot(after.camera.logicalX - before.camera.logicalX,
    after.camera.logicalY - before.camera.logicalY) * after.camera.worldScale;
  assert(distance < 150, `Repeat ${period} jumped to another period: ${distance}px ${JSON.stringify({ before, after: after.camera })}`);
  assert.equal(after.selectedId, item.id);
  report.repeats.push({ period, distance, logicalX: after.camera.logicalX, logicalY: after.camera.logicalY });
  await closeSnippet();
}

async function auditInterruptions() {
  const item = snippets[0];
  await positionItem(item.id);
  await page.locator(`[data-playground-item="${item.id}"] button`).click();
  await page.waitForSelector('[data-work-snippet-stage]');
  const interruptedPhase = await page.locator('[data-work-snippet-stage]').getAttribute('data-phase');
  await page.keyboard.press('Escape');
  await page.waitForSelector('[data-work-snippet-stage]', { state: 'detached' });
  await idle();
  assert.equal(await page.locator('[data-playground-world]').getAttribute('aria-hidden'), null);
  assert.equal(await page.locator(`[data-playground-item="${item.id}"] button`).getAttribute('aria-expanded'), 'false');
  await page.locator(`[data-playground-item="${item.id}"] button`).click();
  await page.waitForSelector('[data-work-snippet-stage]');
  const motion = await page.evaluate(async () => {
    const stage = document.querySelector('[data-work-snippet-stage]');
    const media = stage.querySelector('.work-snippet-stage__media');
    const frames = [];
    const started = performance.now();
    do {
      const matrix = new DOMMatrix(getComputedStyle(media).transform);
      frames.push({ x: matrix.a, y: matrix.d });
      await new Promise(requestAnimationFrame);
    } while (stage.dataset.phase === 'opening' && performance.now() - started < 2000);
    return { frames, phase: stage.dataset.phase };
  });
  assert(motion.frames.length > 0 && motion.frames.every((frame) => Math.abs(frame.x - frame.y) < 0.0001),
    'Every sampled expansion frame must use uniform scale.');
  assert.equal(motion.phase, 'open');
  const before = await page.evaluate(() => window.__ABS_WORK__.getSnapshot().camera);
  await page.mouse.move(40, 160);
  await page.mouse.wheel(100, 140);
  const after = await page.evaluate(() => window.__ABS_WORK__.getSnapshot().camera);
  assert.equal(after.logicalX, before.logicalX, 'Open media must lock background panning');
  assert.equal(after.logicalY, before.logicalY, 'Open media must lock background panning');
  await page.setViewportSize({ width: 1280, height: 960 });
  await page.waitForFunction(() => {
    const state = window.__ABS_WORK__?.getSnapshot();
    const viewport = document.querySelector('[data-playground-viewport]')?.getBoundingClientRect();
    return state?.ready && viewport && Math.abs(state.camera.viewportWidthPx - viewport.width) < 1
      && !state.camera.frameScheduled;
  });
  const resized = await page.evaluate(() => window.__ABS_WORK__.getSnapshot().camera);
  assert.equal(resized.enabled, false, 'Resizing an open project must keep its rebuilt camera locked');
  await page.mouse.wheel(100, 140);
  const resizedAfter = await page.evaluate(() => window.__ABS_WORK__.getSnapshot().camera);
  assert.equal(resizedAfter.logicalX, resized.logicalX);
  assert.equal(resizedAfter.logicalY, resized.logicalY);
  await closeSnippet();
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready();
  report.interruption = { interruptedPhase, uniformFrames: motion.frames.length, reopened: true,
    backgroundLocked: true, resizeKeepsBackgroundLocked: true };
}

async function auditDecorativeRepeat() {
  // Allow two visible repeats of the more breathable field. The responsive
  // matrix separately retains the standard 3440px ultrawide profile.
  await page.setViewportSize({ width: 4800, height: 2160 });
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await ready();
  const id = snippets[0].id;
  await page.waitForFunction((id) => {
    const api = window.__ABS_WORK__;
    const state = api?.getSnapshot();
    if (!state?.ready) return false;
    const item = state.placements.find((candidate) => candidate.id === id);
    const spacing = state.dotField.gridSpacingPx;
    api.setCamera((item.xCell + item.widthCells / 2) * spacing + state.camera.worldWidthPx / 2,
      (item.yCell + item.footprintHeightCells / 2) * spacing);
    return true;
  }, id);
  await idle();
  const source = await page.evaluate((id) => {
    const viewport = document.querySelector('[data-playground-viewport]').getBoundingClientRect();
    const candidates = [...document.querySelectorAll(`[data-playground-decorative-item="${id}"] button`)];
    const candidate = candidates.find((element) => {
      const rect = element.getBoundingClientRect();
      return getComputedStyle(element).visibility === 'visible' && rect.left < viewport.right
        && rect.right > viewport.left && rect.top < viewport.bottom && rect.bottom > viewport.top;
    });
    if (!candidate) return null;
    const rect = candidate.getBoundingClientRect();
    return { x: (Math.max(rect.left, viewport.left + 8) + Math.min(rect.right, viewport.right - 8)) / 2,
      y: Math.max(viewport.top + 8, rect.top + 40),
      sourceCenterX: rect.left + rect.width / 2,
      viewportCenterX: viewport.left + viewport.width / 2,
      camera: window.__ABS_WORK__.getSnapshot().camera,
      tabIndex: candidate.tabIndex, pointerEvents: getComputedStyle(candidate).pointerEvents };
  }, id);
  assert(source, 'An ultrawide viewport must expose a second visible repeat for the real pointer test.');
  assert.equal(source.tabIndex, -1);
  assert.equal(source.pointerEvents, 'auto');
  await page.mouse.click(source.x, source.y);
  await page.waitForSelector('[data-work-snippet-stage][data-phase="open"]');
  await idle();
  const after = await page.evaluate(() => window.__ABS_WORK__.getSnapshot());
  assert.equal(after.selectedId, id);
  const parallax = after.placements.find((item) => item.id === id).parallax;
  const actualTravel = (after.camera.logicalX - source.camera.logicalX) * after.camera.worldScale * parallax;
  const expectedTravel = source.sourceCenterX - source.viewportCenterX;
  assert(Math.abs(actualTravel - expectedTravel) < 3,
    `Tapped repeat was substituted: expected ${expectedTravel}px, got ${actualTravel}px.`);
  await page.screenshot({ path: resolve(output, 'ultrawide-tapped-repeat.png') });
  report.decorativeRepeat = { actualTravel, expectedTravel, clicked: true, singleSemanticOwner: true };
  await closeSnippet();
}

async function auditViewport(width, height) {
  await page.setViewportSize({ width, height });
  // Let ResizeObserver commit the responsive model before sampling readiness.
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await ready();
  const guard = getViewportCoverMode(width, height);
  if (guard) {
    await page.waitForSelector(`[data-viewport-mode="${guard}"]`);
    assert.equal(await page.locator('#root').getAttribute('inert'), '');
    report.viewports.push({ width, height, compatibilityGuard: guard });
    return;
  }
  await page.waitForSelector('[data-viewport-mode]', { state: 'detached' });
  await page.waitForFunction(() => {
    const api = window.__ABS_WORK__;
    if (!api?.getSnapshot().ready) return false;
    api.recenter();
    return true;
  });
  await idle();
  const state = await page.evaluate(() => {
    const root = document.querySelector('[data-work-experience]');
    const viewport = root.querySelector('[data-playground-viewport]').getBoundingClientRect();
    const description = root.querySelector('#playground-route-description');
    const cards = [...root.querySelectorAll('.playground-semantic-collection [data-playground-item]')];
    return {
      width: innerWidth, height: innerHeight,
      viewport: viewport.toJSON(),
      bodyOverflow: document.body.scrollWidth > innerWidth + 1
        || viewport.left < -1 || viewport.right > innerWidth + 1,
      monoCaptions: cards.some((card) => /mono/i.test(getComputedStyle(card.querySelector('.work-case-study-caption__kind, .playground-item__title')).fontFamily)),
      captions: cards.filter((card) => card.dataset.workItemKind === 'snippet').map((card) => {
        const caption = card.querySelector('.playground-item__label');
        const rect = card.querySelector('button').getBoundingClientRect();
        return { words: caption.textContent.trim().split(/\s+/).length,
          rows: caption.children.length, width: rect.width, height: rect.height };
      }),
      covers: cards.filter((card) => card.dataset.workItemKind === 'case-study').map((card) => {
        const cover = card.querySelector('.portfolio-project-card__surface');
        const rect = cover.getBoundingClientRect();
        return { ratio: rect.width / rect.height, width: rect.width, text: cover.textContent.trim() };
      }),
      descriptionWidth: description.getBoundingClientRect().width,
      descriptionMeasure: getComputedStyle(description).maxInlineSize,
      drag: root.querySelector('.playground-drag-instruction').textContent.trim(),
      dragIcons: root.querySelectorAll('.playground-drag-instruction svg').length,
      dots: window.__ABS_WORK__.getSnapshot().dotField.drawnDotCount,
    };
  });
  assert(!state.bodyOverflow && !state.monoCaptions, JSON.stringify(state));
  assert(state.captions.every((caption) => caption.words <= 5 && caption.rows === 1
    && Math.min(caption.width, caption.height) >= 43.5), JSON.stringify(state.captions));
  assert(state.covers.every((cover) => Math.abs(cover.ratio - 0.8) < 0.003
    && cover.width <= state.viewport.width - 30 && !cover.text), JSON.stringify(state.covers));
  assert(state.descriptionWidth <= Number.parseFloat(state.descriptionMeasure) + 1);
  assert(state.drag.startsWith('Drag') && state.dragIcons === 0);
  assert(state.dots <= 1800);
  report.viewports.push({ width, height, minTapArea: Math.min(...state.captions.map((c) => Math.min(c.width, c.height))), dots: state.dots });
  if ([320, 390, 1440, 3440].includes(width)) {
    await page.screenshot({ path: resolve(output, `${width}-${height}-canvas.png`) });
  }
}

async function auditGridControls() {
  await page.setViewportSize({ width: 1440, height: 900 });
  await ready();
  await page.getByRole('button', { name: 'Toggle design panel' }).click();
  await page.locator('[data-playground-folder="grid"] > summary').click();
  const before = await page.evaluate(() => window.__ABS_WORK__.getSnapshot());
  const setControl = async (id, value) => {
    await page.locator(`[data-playground-control="${id}"] input`).evaluate((input, value) => {
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    await page.waitForFunction(({ id, value }) => window.__ABS_WORK__.getSnapshot().dotField[id] === value,
      { id, value });
    await idle();
  };
  await setControl('dotRandomness', 0);
  await setControl('dotDensity', 0);
  assert.equal(await page.evaluate(() => window.__ABS_WORK__.getSnapshot().dotField.drawnDotCount), 0);
  await setControl('dotDensity', 1);
  const dense = await page.evaluate(() => window.__ABS_WORK__.getSnapshot());
  assert(dense.dotField.drawnDotCount > before.dotField.drawnDotCount);
  assert.deepEqual(dense.placements, before.placements, 'Dot controls must not reflow projects');
  assert.equal(dense.camera.logicalX, before.camera.logicalX, 'Dot controls must not move the camera');
  await page.screenshot({ path: resolve(output, 'desktop-grid-controls.png') });
  await setControl('dotRandomness', canonical.playground.dotRandomness);
  await setControl('dotDensity', canonical.playground.dotDensity);
  report.controls = { zeroDensity: true, denseDots: dense.dotField.drawnDotCount, layoutUnchanged: true };
  await page.locator('[data-playground-folder="grid"] > summary').focus();
  await page.keyboard.press('/');
}

try {
  await page.goto(`${baseUrl}/portfolio.html`, { waitUntil: 'domcontentloaded' });
  await ready();
  for (const period of [-5, -1, 0, 1, 5]) await auditRepeat(period);
  await auditInterruptions();
  console.log('PASS: exact source selection across ten world seams in both axes.');
  const representatives = [...new Map(snippets.map((item) => [
    `${item.type}:${item.intrinsicDimensions.width / item.intrinsicDimensions.height}`, item,
  ])).values()];
  for (const item of representatives) await auditMedia(item, { back: true, screenshot: true });
  console.log(`PASS: ${representatives.length} media types/aspect ratios preserve their real dimensions.`);
  for (const [width, height] of [[320,568], [375,667], [390,844], [480,800], [600,900], [601,900],
    [640,900], [641,900], [767,900], [768,900], [900,900], [991,900], [992,900], [1024,768],
    [1025,768], [1440,900], [844,390], [3440,1440]]) await auditViewport(width, height);
  console.log('PASS: responsive hierarchy, captions, tap areas, and depth budget across 18 viewports.');
  await auditDecorativeRepeat();
  await page.setViewportSize({ width: 390, height: 844 });
  await ready();
  for (const id of ['image-blue-fold', 'image-red-current', 'video-drift-two', 'code-pulse-grid']) {
    await auditMedia(snippets.find((item) => item.id === id), { screenshot: true });
  }
  await auditGridControls();
  assert.deepEqual(errors, []);
  report.status = 'passed';
  await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`PASS: Work refinement audit (${browserName}).\nReport: ${resolve(output, 'report.json')}`);
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  await writeFile(resolve(output, 'failure.json'), JSON.stringify({ message: error.message, report, errors }, null, 2));
  throw error;
} finally {
  await context.close();
  await browser.close();
}
