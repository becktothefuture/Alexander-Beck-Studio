#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseUrl = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').replace(/\/$/, '');
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const shouldStartDevServer = !process.env.ABS_DEV_URL;
const waitMs = Number(process.env.ABS_TITLE_WAIT_MS || 30000);
const viewport = { width: 390, height: 844 };
const tolerance = { font: 0.55, rect: 1.25, center: 0.75 };
const resizeViewports = Object.freeze([
  Object.freeze({ width: 1440, height: 900 }),
  Object.freeze({ width: 1024, height: 768 }),
  Object.freeze({ width: 768, height: 1024 }),
  Object.freeze({ width: 390, height: 844 }),
  Object.freeze({ width: 1440, height: 900 }),
]);
const continuousResizeWidths = Object.freeze(
  Array.from({ length: 106 }, (_, index) => 1200 - (index * 8)),
);
const continuousResizeHeights = Object.freeze(
  Array.from({ length: 44 }, (_, index) => 900 - (index * 6)),
);
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'home-title-invariance', browserName);

function pageUrl(pathname) {
  return new URL(pathname, `${baseUrl}/`).toString();
}

function assert(condition, message, details = null) {
  if (condition) return;
  throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
}

async function waitForHttpReady(timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(pageUrl('/'));
      if (response.ok) return;
    } catch {
      // Keep polling until Vite is ready.
    }
    await delay(200);
  }
  throw new Error(`Title audit server unavailable at ${baseUrl}`);
}

async function ensureServer() {
  try {
    await waitForHttpReady(1000);
    return null;
  } catch {
    if (!shouldStartDevServer) throw new Error(`Title audit server unavailable at ${baseUrl}`);
  }

  const child = spawn('npm', ['run', 'dev:react', '--', '--host', '127.0.0.1'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  await waitForHttpReady();
  return child;
}

async function readCatalog() {
  const source = await readFile(resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json'), 'utf8');
  return JSON.parse(source).simulations.filter((entry) => entry.stage === 'daily-rotation');
}

async function readTitleMetrics(page) {
  return page.evaluate(() => {
    const title = document.getElementById('hero-title');
    const line = title?.querySelector('.hero-title__name');
    if (!title || !line) return null;
    const titleStyle = getComputedStyle(title);
    const lineStyle = getComputedStyle(line);
    const titleRect = title.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const matrix = titleStyle.transform && titleStyle.transform !== 'none'
      ? new DOMMatrixReadOnly(titleStyle.transform)
      : new DOMMatrixReadOnly();
    const titleScale = Math.hypot(matrix.a, matrix.b) || 1;
    const cssFontSize = Number.parseFloat(lineStyle.fontSize) || 0;
    const homeSnapshot = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.() || null;
    const canvas = document.getElementById('simulation-title-canvas');
    const material = document.getElementById('c');
    const frontMaterial = document.getElementById('simulation-front-depth-canvas');
    const scratch = document.createElement('canvas');
    scratch.width = 48;
    scratch.height = 48;
    const scratchContext = scratch.getContext('2d', { alpha: true, willReadFrequently: true });
    if (canvas && scratchContext) scratchContext.drawImage(canvas, 0, 0, 48, 48);
    const pixels = scratchContext?.getImageData(0, 0, 48, 48).data || [];
    let titlePixelAlpha = 0;
    for (let index = 3; index < pixels.length; index += 4) titlePixelAlpha = Math.max(titlePixelAlpha, pixels[index]);
    return {
      cssFontSize,
      titleScale,
      domTitleOpacity: Number.parseFloat(titleStyle.opacity || '1'),
      semanticCanvasSource: title.dataset.canvasTitleSource === 'home',
      semanticAccessible: title.getAttribute('aria-hidden') !== 'true' && Boolean(title.textContent?.trim()),
      effectiveFontSize: cssFontSize * titleScale,
      titleRect: {
        width: titleRect.width,
        height: titleRect.height,
        centerX: titleRect.left + titleRect.width * 0.5,
        centerY: titleRect.top + titleRect.height * 0.5,
      },
      lineRect: {
        width: lineRect.width,
        height: lineRect.height,
        centerX: lineRect.left + lineRect.width * 0.5,
        centerY: lineRect.top + lineRect.height * 0.5,
      },
      canvasFontSize: Number(homeSnapshot?.canvasTitleFontSizeCssPx) || 0,
      canvasTitleVisible: homeSnapshot?.canvasTitleVisible === true,
      titleCanvasCount: document.querySelectorAll('#simulation-title-canvas').length,
      titleCanvasIdentity: canvas?.dataset?.titlePlaneIdentity || '',
      titleCanvasReady: canvas?.dataset?.titlePlaneReady === 'true',
      titleCanvasAtmosphereSource: Boolean(
        canvas?.hasAttribute('data-atmosphere-source-material')
        || canvas?.closest('[data-atmosphere-source-material]'),
      ),
      titlePixelAlpha,
      titleZIndex: Number.parseInt(canvas ? getComputedStyle(canvas).zIndex : '', 10) || 0,
      materialZIndex: Number.parseInt(material ? getComputedStyle(material).zIndex : '', 10) || 0,
      frontMaterialZIndex: Number.parseInt(frontMaterial ? getComputedStyle(frontMaterial).zIndex : '', 10) || 0,
      depthTitleActive: document.getElementById('simulations')?.classList.contains('simulation-depth-title-layer-active') === true,
      mode: homeSnapshot?.mode || document.querySelector('#simulation-stage')?.dataset?.simulationId || '',
      theme: document.documentElement.dataset.absTheme || '',
    };
  });
}

function compareMetric(actual, expected, key, limit, label) {
  const delta = Math.abs(Number(actual) - Number(expected));
  assert(delta <= limit, `${label}: ${key} drifted by ${delta.toFixed(3)}px`, { actual, expected, limit });
}

function compareTitleMetrics(actual, expected, label) {
  compareMetric(actual.effectiveFontSize, expected.effectiveFontSize, 'effective font size', tolerance.font, label);
  compareMetric(actual.titleRect.width, expected.titleRect.width, 'title width', tolerance.rect, label);
  compareMetric(actual.titleRect.height, expected.titleRect.height, 'title height', tolerance.rect, label);
  compareMetric(actual.titleRect.centerX, expected.titleRect.centerX, 'title center x', tolerance.center, label);
  compareMetric(actual.titleRect.centerY, expected.titleRect.centerY, 'title center y', tolerance.center, label);
}

async function waitForSettledHomeTitle(page) {
  await page.waitForFunction(() => {
    const glyphs = Array.from(document.querySelectorAll('#hero-title [data-route-enter-glyph]'));
    return document.documentElement.dataset.absBootState === 'ready'
      && document.getElementById('simulation-title-canvas')?.dataset.titlePlaneReady === 'true'
      && glyphs.length > 0
      && glyphs.every((glyph) => glyph.__absRouteEntranceState?.settled === true);
  }, null, { timeout: waitMs, polling: 'raf' });
  await page.evaluate(() => document.fonts?.ready);
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
}

async function readCanvasTitlePixelMetrics(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('simulation-title-canvas');
    const semanticTitle = document.getElementById('hero-title');
    const context = canvas?.getContext('2d', { alpha: true, willReadFrequently: true });
    if (!canvas || !semanticTitle || !context || canvas.width <= 0 || canvas.height <= 0) return null;

    const canvasRect = canvas.getBoundingClientRect();
    const semanticRect = semanticTitle.getBoundingClientRect();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;
    let maxAlpha = 0;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        const alpha = pixels[((y * canvas.width + x) * 4) + 3];
        if (alpha > maxAlpha) maxAlpha = alpha;
        if (alpha <= 8) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) return null;

    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const left = canvasRect.left + (minX * scaleX);
    const top = canvasRect.top + (minY * scaleY);
    const width = (maxX - minX + 1) * scaleX;
    const height = (maxY - minY + 1) * scaleY;
    const glyphs = Array.from(semanticTitle.querySelectorAll('[data-route-enter-glyph]'));
    return {
      sameNode: !window.__ABS_RESIZE_TITLE_CANVAS__ || canvas === window.__ABS_RESIZE_TITLE_CANVAS__,
      canvasCount: document.querySelectorAll('#simulation-title-canvas').length,
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      canvasCssWidth: canvasRect.width,
      canvasCssHeight: canvasRect.height,
      backingWidthDelta: Math.abs(canvas.width - Math.round(canvasRect.width * dpr)),
      backingHeightDelta: Math.abs(canvas.height - Math.round(canvasRect.height * dpr)),
      maxAlpha,
      inkRect: {
        left,
        top,
        width,
        height,
        centerX: left + (width * 0.5),
        centerY: top + (height * 0.5),
      },
      semanticRect: {
        width: semanticRect.width,
        height: semanticRect.height,
        centerX: semanticRect.left + (semanticRect.width * 0.5),
        centerY: semanticRect.top + (semanticRect.height * 0.5),
      },
      settledGlyphs: glyphs.filter((glyph) => glyph.__absRouteEntranceState?.settled === true).length,
      staleSettledRects: glyphs.filter((glyph) => (
        glyph.__absRouteEntranceState?.settled === true
        && glyph.__absRouteEntranceState?.finalRect
      )).length,
      glyphCount: glyphs.length,
      renderRevision: Number(canvas.dataset.titlePlaneRenderRevision) || 0,
    };
  });
}

async function readRetainedTitlePixelMetrics(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('simulation-title-canvas');
    const context = canvas?.getContext('2d', { alpha: true, willReadFrequently: true });
    if (!canvas || !context || canvas.width <= 0 || canvas.height <= 0) return null;

    const canvasRect = canvas.getBoundingClientRect();
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let minX = canvas.width;
    let minY = canvas.height;
    let maxX = -1;
    let maxY = -1;
    for (let y = 0; y < canvas.height; y += 1) {
      for (let x = 0; x < canvas.width; x += 1) {
        if (pixels[((y * canvas.width + x) * 4) + 3] <= 8) continue;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    if (maxX < minX || maxY < minY) return null;

    const scaleX = canvasRect.width / canvas.width;
    const scaleY = canvasRect.height / canvas.height;
    const width = (maxX - minX + 1) * scaleX;
    const height = (maxY - minY + 1) * scaleY;
    const centerX = canvasRect.left + ((minX + maxX + 1) * 0.5 * scaleX);
    const centerY = canvasRect.top + ((minY + maxY + 1) * 0.5 * scaleY);
    return {
      width,
      height,
      aspectRatio: width / height,
      canvasCssWidth: canvasRect.width,
      canvasCssHeight: canvasRect.height,
      centerX,
      centerY,
      normalizedCenterX: (centerX - canvasRect.left) / canvasRect.width,
      normalizedCenterY: (centerY - canvasRect.top) / canvasRect.height,
      sourceConnected: canvas.dataset.titlePlaneSourceConnected === 'true',
      retainedPixels: canvas.dataset.titlePlaneRetainedPixels === 'true',
      renderRevision: Number(canvas.dataset.titlePlaneRenderRevision) || 0,
    };
  });
}

function compareResizeMetrics(resized, fresh, label) {
  assert(resized && fresh, `${label}: title pixel metrics unavailable`, { resized, fresh });
  assert(resized.sameNode, `${label}: stable title plane node was replaced`, resized);
  assert(resized.canvasCount === 1, `${label}: stable title plane count is not one`, resized);
  assert(resized.maxAlpha > 0, `${label}: resized title plane has no painted pixels`, resized);
  assert(resized.glyphCount > 0 && resized.settledGlyphs === resized.glyphCount, `${label}: glyphs did not settle`, resized);
  assert(resized.staleSettledRects === 0, `${label}: settled glyphs retained entrance geometry`, resized);
  assert(resized.backingWidthDelta <= 1, `${label}: title backing-store width is stale`, resized);
  assert(resized.backingHeightDelta <= 1, `${label}: title backing-store height is stale`, resized);
  compareMetric(resized.inkRect.width, fresh.inkRect.width, 'painted title width', 1.5, label);
  compareMetric(resized.inkRect.height, fresh.inkRect.height, 'painted title height', 1.5, label);
  compareMetric(resized.inkRect.centerX, fresh.inkRect.centerX, 'painted title center x', 1.25, label);
  compareMetric(resized.inkRect.centerY, fresh.inkRect.centerY, 'painted title center y', 1.25, label);
  compareMetric(resized.semanticRect.centerX, fresh.semanticRect.centerX, 'semantic title center x', 0.75, label);
  compareMetric(resized.semanticRect.centerY, fresh.semanticRect.centerY, 'semantic title center y', 0.75, label);
}

async function auditStableTitleResize(browser) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  const results = [];
  try {
    await page.goto(pageUrl('/index.html?mode=water&absAudit=1'), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await waitForSettledHomeTitle(page);
    await page.evaluate(() => {
      window.__ABS_RESIZE_TITLE_CANVAS__ = document.getElementById('simulation-title-canvas');
    });

    for (let index = 0; index < resizeViewports.length; index += 1) {
      const target = resizeViewports[index];
      const previousRevision = await page.evaluate(() => (
        Number(document.getElementById('simulation-title-canvas')?.dataset.titlePlaneRenderRevision) || 0
      ));
      await page.setViewportSize(target);
      await page.waitForFunction(({ width, height, previous }) => {
        const canvas = document.getElementById('simulation-title-canvas');
        const rect = canvas?.getBoundingClientRect();
        const revision = Number(canvas?.dataset.titlePlaneRenderRevision) || 0;
        return window.innerWidth === width
          && window.innerHeight === height
          && rect?.width > 0
          && rect?.height > 0
          && revision > previous;
      }, { ...target, previous: previousRevision }, { timeout: waitMs, polling: 'raf' });
      // Shell geometry deliberately eases to its responsive endpoint. Compare
      // the live resize with a fresh load only after that movement settles;
      // the continuous-resize audit below owns the intermediate-frame checks.
      await page.waitForTimeout(700);
      await page.evaluate(() => new Promise((resolveFrame) => {
        requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
      }));
      const resized = await readCanvasTitlePixelMetrics(page);

      const freshPage = await context.newPage();
      let fresh;
      try {
        await freshPage.setViewportSize(target);
        await freshPage.goto(pageUrl('/index.html?mode=water&absAudit=1'), {
          waitUntil: 'domcontentloaded',
          timeout: 60000,
        });
        await waitForSettledHomeTitle(freshPage);
        fresh = await readCanvasTitlePixelMetrics(freshPage);
        await freshPage.screenshot({
          path: resolve(outputRoot, `resize-${index + 1}-${target.width}x${target.height}-fresh.png`),
        });
      } finally {
        await freshPage.close();
      }

      const label = `resize-${index + 1}/${target.width}x${target.height}`;
      compareResizeMetrics(resized, fresh, label);
      await page.screenshot({
        path: resolve(outputRoot, `resize-${index + 1}-${target.width}x${target.height}-live.png`),
      });
      results.push({
        ...target,
        renderRevision: resized.renderRevision,
        inkCenterDeltaX: Math.abs(resized.inkRect.centerX - fresh.inkRect.centerX),
        inkCenterDeltaY: Math.abs(resized.inkRect.centerY - fresh.inkRect.centerY),
        inkWidthDelta: Math.abs(resized.inkRect.width - fresh.inkRect.width),
        inkHeightDelta: Math.abs(resized.inkRect.height - fresh.inkRect.height),
      });
    }
    return results;
  } catch (error) {
    await page.screenshot({ path: resolve(outputRoot, 'resize-failure.png'), fullPage: true }).catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

async function auditRetainedTitleResize(browser) {
  const portrait = { width: 1100, height: 1500 };
  const landscape = { width: 1600, height: 900 };
  const context = await browser.newContext({
    viewport: portrait,
    colorScheme: 'light',
    reducedMotion: 'reduce',
  });
  const page = await context.newPage();
  try {
    await page.goto(pageUrl('/index.html?mode=water&absAudit=1'), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await waitForSettledHomeTitle(page);
    const before = await readRetainedTitlePixelMetrics(page);
    assert(before, 'retained-resize: portrait title pixels are unavailable');
    await page.screenshot({ path: resolve(outputRoot, 'retained-resize-portrait.png') });

    await page.evaluate(() => document.getElementById('hero-title')?.remove());
    await page.waitForFunction(() => (
      document.getElementById('simulation-title-canvas')?.dataset.titlePlaneSourceConnected === 'false'
    ), null, { timeout: waitMs, polling: 'raf' });
    await page.setViewportSize(landscape);
    await page.waitForFunction(({ width, height }) => {
      const canvas = document.getElementById('simulation-title-canvas');
      const rect = canvas?.getBoundingClientRect();
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      return innerWidth === width
        && innerHeight === height
        && canvas?.dataset.titlePlaneRetainedPixels === 'true'
        && Math.abs(canvas.width - Math.round((rect?.width || 0) * dpr)) <= 1
        && Math.abs(canvas.height - Math.round((rect?.height || 0) * dpr)) <= 1;
    }, landscape, { timeout: waitMs, polling: 'raf' });
    const after = await readRetainedTitlePixelMetrics(page);
    assert(after, 'retained-resize: landscape title pixels are unavailable');
    assert(!after.sourceConnected && after.retainedPixels,
      'retained-resize: the test did not exercise the retained title path', after);
    compareMetric(after.width, before.width, 'retained painted title width', 1.5, 'retained-resize');
    compareMetric(after.height, before.height, 'retained painted title height', 1.5, 'retained-resize');
    compareMetric(after.aspectRatio, before.aspectRatio, 'retained title aspect ratio', 0.01, 'retained-resize');
    compareMetric(
      after.normalizedCenterX,
      before.normalizedCenterX,
      'retained title normalized center x',
      4 / after.canvasCssWidth,
      'retained-resize',
    );
    compareMetric(
      after.normalizedCenterY,
      before.normalizedCenterY,
      'retained title normalized center y',
      4 / after.canvasCssHeight,
      'retained-resize',
    );
    await page.screenshot({ path: resolve(outputRoot, 'retained-resize-landscape.png') });
    return { portrait, landscape, before, after };
  } catch (error) {
    await page.screenshot({ path: resolve(outputRoot, 'retained-resize-failure.png'), fullPage: true })
      .catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

async function readContinuousResizeMetrics(page) {
  return page.evaluate(() => {
    const titleCanvas = document.getElementById('simulation-title-canvas');
    const homeSnapshot = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.() || {};
    const titleSnapshot = {
      renderRevision: Number(titleCanvas?.dataset.titlePlaneRenderRevision) || 0,
      sourceConnected: titleCanvas?.dataset.titlePlaneSourceConnected === 'true',
      visible: homeSnapshot.canvasTitleVisible === true,
      firstLineX: Number(homeSnapshot.canvasTitleFirstLineX) || 0,
      firstLineY: Number(homeSnapshot.canvasTitleFirstLineY) || 0,
    };
    const titleLine = document.querySelector('#hero-title .hero-title__name');
    const materialCanvas = document.getElementById('c');
    const titleCanvasRect = titleCanvas?.getBoundingClientRect();
    const titleLineRect = titleLine?.getBoundingClientRect();
    const materialRect = materialCanvas?.getBoundingClientRect();
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    const rect = (selector) => {
      const node = document.querySelector(selector);
      if (!node || getComputedStyle(node).display === 'none') return null;
      const bounds = node.getBoundingClientRect();
      return bounds.width > 0 || bounds.height > 0 ? bounds : null;
    };
    const legend = rect('#expertise-legend');
    const philosophy = rect('.ui-top-right .decorative-script');
    const switcher = rect('.simulation-focus-switcher-slot');
    const social = rect('#social-links');
    const year = rect('#site-year');
    const caption = rect('#edge-caption');
    const buttonBar = rect('[data-button-bar]');
    const simulations = rect('#simulations');
    const titleScaleX = titleCanvas && titleCanvasRect
      ? titleCanvasRect.width / Math.max(1, titleCanvas.width)
      : 0;
    const titleScaleY = titleCanvas && titleCanvasRect
      ? titleCanvasRect.height / Math.max(1, titleCanvas.height)
      : 0;
    const canvasTitleCenterX = titleCanvasRect
      ? titleCanvasRect.left + (titleSnapshot.firstLineX * titleScaleX)
      : 0;
    const canvasTitleCenterY = titleCanvasRect
      ? titleCanvasRect.top + (titleSnapshot.firstLineY * titleScaleY)
      : 0;
    const semanticTitleCenterX = titleLineRect
      ? titleLineRect.left + (titleLineRect.width * 0.5)
      : 0;
    const semanticTitleCenterY = titleLineRect
      ? titleLineRect.top + (titleLineRect.height * 0.5)
      : 0;

    return {
      viewport: { width: innerWidth, height: innerHeight },
      title: {
        renderRevision: titleSnapshot.renderRevision,
        sourceConnected: titleSnapshot.sourceConnected,
        visible: titleSnapshot.visible,
        canvasSemanticDeltaX: Math.abs(canvasTitleCenterX - semanticTitleCenterX),
        canvasSemanticDeltaY: Math.abs(canvasTitleCenterY - semanticTitleCenterY),
        centerOffsetX: canvasTitleCenterX - (innerWidth * 0.5),
        centerY: canvasTitleCenterY,
        backingWidthDelta: titleCanvas && titleCanvasRect
          ? Math.abs(titleCanvas.width - Math.round(titleCanvasRect.width * dpr))
          : Number.POSITIVE_INFINITY,
        backingHeightDelta: titleCanvas && titleCanvasRect
          ? Math.abs(titleCanvas.height - Math.round(titleCanvasRect.height * dpr))
          : Number.POSITIVE_INFINITY,
      },
      material: {
        present: Boolean(materialCanvas && materialRect),
        backingWidthDelta: materialCanvas && materialRect
          ? Math.abs(materialCanvas.width - Math.round(materialRect.width * dpr))
          : Number.POSITIVE_INFINITY,
        backingHeightDelta: materialCanvas && materialRect
          ? Math.abs(materialCanvas.height - Math.round(materialRect.height * dpr))
          : Number.POSITIVE_INFINITY,
      },
      anchors: {
        legendLeft: legend?.left ?? Number.POSITIVE_INFINITY,
        legendTop: legend?.top ?? Number.POSITIVE_INFINITY,
        philosophyRight: philosophy ? innerWidth - philosophy.right : Number.POSITIVE_INFINITY,
        philosophyTop: philosophy?.top ?? Number.POSITIVE_INFINITY,
        switcherCenterX: switcher ? switcher.left + (switcher.width * 0.5) - (innerWidth * 0.5) : Number.POSITIVE_INFINITY,
        switcherCenterY: switcher ? switcher.top + (switcher.height * 0.5) : Number.POSITIVE_INFINITY,
        socialLeft: social?.left ?? Number.POSITIVE_INFINITY,
        socialBottom: social ? innerHeight - social.bottom : Number.POSITIVE_INFINITY,
        yearRight: year ? innerWidth - year.right : Number.POSITIVE_INFINITY,
        yearBottom: year ? innerHeight - year.bottom : Number.POSITIVE_INFINITY,
        captionCenterX: caption ? caption.left + (caption.width * 0.5) - (innerWidth * 0.5) : Number.POSITIVE_INFINITY,
        captionBottom: caption ? innerHeight - caption.bottom : Number.POSITIVE_INFINITY,
        buttonBarCenterX: buttonBar ? buttonBar.left + (buttonBar.width * 0.5) - (innerWidth * 0.5) : Number.POSITIVE_INFINITY,
        buttonBarBottom: buttonBar ? innerHeight - buttonBar.bottom : Number.POSITIVE_INFINITY,
        simulationsLeft: simulations?.left ?? Number.POSITIVE_INFINITY,
        simulationsRight: simulations ? innerWidth - simulations.right : Number.POSITIVE_INFINITY,
        simulationsTop: simulations?.top ?? Number.POSITIVE_INFINITY,
        simulationsBottom: simulations ? innerHeight - simulations.bottom : Number.POSITIVE_INFINITY,
      },
    };
  });
}

function assertContinuousResizeSample(sample, previous, axis, label) {
  assert(sample.title.sourceConnected && sample.title.visible, `${label}: title source disconnected`, sample.title);
  assert(sample.title.renderRevision > (previous?.title.renderRevision || 0), `${label}: title did not redraw`, {
    current: sample.title.renderRevision,
    previous: previous?.title.renderRevision || 0,
  });
  assert(sample.title.canvasSemanticDeltaX <= 0.25, `${label}: canvas title drifted horizontally`, sample.title);
  assert(sample.title.canvasSemanticDeltaY <= 0.25, `${label}: canvas title drifted vertically`, sample.title);
  assert(sample.title.backingWidthDelta <= 1 && sample.title.backingHeightDelta <= 1, `${label}: title backing store is stale`, sample.title);
  assert(sample.material.present, `${label}: simulation material canvas is missing`, sample.material);
  assert(sample.material.backingWidthDelta <= 1 && sample.material.backingHeightDelta <= 1, `${label}: simulation material backing store is stale`, sample.material);
  if (!previous) return;

  const horizontalAnchors = [
    'legendLeft',
    'philosophyRight',
    'switcherCenterX',
    'socialLeft',
    'yearRight',
    'captionCenterX',
    'buttonBarCenterX',
    'simulationsLeft',
    'simulationsRight',
  ];
  const verticalAnchors = [
    'legendTop',
    'philosophyTop',
    'switcherCenterY',
    'socialBottom',
    'yearBottom',
    'captionBottom',
    'buttonBarBottom',
    'simulationsTop',
    'simulationsBottom',
  ];
  const anchors = axis === 'width' ? horizontalAnchors : verticalAnchors;
  for (const key of anchors) {
    if (!Number.isFinite(sample.anchors[key]) || !Number.isFinite(previous.anchors[key])) continue;
    const delta = Math.abs(sample.anchors[key] - previous.anchors[key]);
    assert(delta <= 4, `${label}: ${key} jumped by ${delta.toFixed(3)}px`, {
      current: sample.anchors[key],
      previous: previous.anchors[key],
      delta,
    });
  }
  if (axis === 'width') {
    const titleDelta = Math.abs(sample.title.centerOffsetX - previous.title.centerOffsetX);
    assert(titleDelta <= 1, `${label}: title horizontal anchor jumped by ${titleDelta.toFixed(3)}px`, {
      current: sample.title.centerOffsetX,
      previous: previous.title.centerOffsetX,
    });
  } else {
    const titleDelta = Math.abs(sample.title.centerY - previous.title.centerY);
    assert(titleDelta <= 4, `${label}: title vertical anchor jumped by ${titleDelta.toFixed(3)}px`, {
      current: sample.title.centerY,
      previous: previous.title.centerY,
    });
  }
}

async function auditContinuousHomeResize(browser) {
  const context = await browser.newContext({
    viewport: { width: 1200, height: 900 },
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const results = { widthSamples: 0, heightSamples: 0, maxTitleDeltaX: 0, maxTitleDeltaY: 0 };
  try {
    await page.goto(pageUrl('/index.html?mode=water&absAudit=1'), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await waitForSettledHomeTitle(page);

    let previous = null;
    for (const width of continuousResizeWidths) {
      const previousRevision = previous?.title.renderRevision || 0;
      await page.setViewportSize({ width, height: 900 });
      await page.waitForFunction((revision) => (
        (() => {
          const titleCanvas = document.getElementById('simulation-title-canvas');
          const materialCanvas = document.getElementById('c');
          const titleRect = titleCanvas?.getBoundingClientRect();
          const materialRect = materialCanvas?.getBoundingClientRect();
          const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
          return Number(titleCanvas?.dataset.titlePlaneRenderRevision) > revision
            && Math.abs(titleCanvas?.width - Math.round((titleRect?.width || 0) * dpr)) <= 1
            && Math.abs(titleCanvas?.height - Math.round((titleRect?.height || 0) * dpr)) <= 1
            && Math.abs(materialCanvas?.width - Math.round((materialRect?.width || 0) * dpr)) <= 1
            && Math.abs(materialCanvas?.height - Math.round((materialRect?.height || 0) * dpr)) <= 1;
        })()
      ), previousRevision, { timeout: waitMs, polling: 'raf' });
      const sample = await readContinuousResizeMetrics(page);
      assertContinuousResizeSample(sample, previous, 'width', `continuous-width/${width}x900`);
      results.maxTitleDeltaX = Math.max(results.maxTitleDeltaX, sample.title.canvasSemanticDeltaX);
      results.maxTitleDeltaY = Math.max(results.maxTitleDeltaY, sample.title.canvasSemanticDeltaY);
      results.widthSamples += 1;
      previous = sample;
    }

    previous = null;
    for (const height of continuousResizeHeights) {
      const previousRevision = previous?.title.renderRevision || 0;
      await page.setViewportSize({ width: 390, height });
      await page.waitForFunction((revision) => (
        (() => {
          const titleCanvas = document.getElementById('simulation-title-canvas');
          const materialCanvas = document.getElementById('c');
          const titleRect = titleCanvas?.getBoundingClientRect();
          const materialRect = materialCanvas?.getBoundingClientRect();
          const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
          return Number(titleCanvas?.dataset.titlePlaneRenderRevision) > revision
            && Math.abs(titleCanvas?.width - Math.round((titleRect?.width || 0) * dpr)) <= 1
            && Math.abs(titleCanvas?.height - Math.round((titleRect?.height || 0) * dpr)) <= 1
            && Math.abs(materialCanvas?.width - Math.round((materialRect?.width || 0) * dpr)) <= 1
            && Math.abs(materialCanvas?.height - Math.round((materialRect?.height || 0) * dpr)) <= 1;
        })()
      ), previousRevision, { timeout: waitMs, polling: 'raf' });
      const sample = await readContinuousResizeMetrics(page);
      assertContinuousResizeSample(sample, previous, 'height', `continuous-height/390x${height}`);
      results.maxTitleDeltaX = Math.max(results.maxTitleDeltaX, sample.title.canvasSemanticDeltaX);
      results.maxTitleDeltaY = Math.max(results.maxTitleDeltaY, sample.title.canvasSemanticDeltaY);
      results.heightSamples += 1;
      previous = sample;
    }

    await page.screenshot({ path: resolve(outputRoot, 'continuous-resize-final.png') });
    return results;
  } catch (error) {
    await page.screenshot({ path: resolve(outputRoot, 'continuous-resize-failure.png'), fullPage: true }).catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

async function visitSimulation(page, entry) {
  if (entry.surface === 'lab-route') {
    await page.goto(pageUrl(entry.dailyHref), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction((id) => (
      document.body.classList.contains('daily-focus-page')
      && document.querySelector('#simulation-stage')?.dataset?.simulationId === id
      && document.documentElement.dataset.absBootState !== 'booting'
    ), entry.id, { timeout: waitMs });
  } else {
    const url = new URL(pageUrl('/index.html'));
    url.searchParams.set('mode', entry.id);
    url.searchParams.set('absAudit', '1');
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction((id) => {
      const snapshot = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.();
      const root = document.documentElement;
      return snapshot?.mode === id
        && snapshot.canvasTitleVisible === true
        && root.dataset.absBootState === 'ready';
    }, entry.id, { timeout: waitMs });
  }
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(650);
  const metrics = await readTitleMetrics(page);
  assert(metrics, `${entry.id}: title metrics unavailable`);
  assert(metrics.domTitleOpacity <= 0.02, `${entry.id}: semantic title became a visual owner`, metrics);
  assert(metrics.semanticCanvasSource && metrics.semanticAccessible, `${entry.id}: semantic title is not the accessible geometry source`, metrics);
  assert(metrics.titleCanvasCount === 1, `${entry.id}: stable title plane count is not one`, metrics);
  assert(metrics.titleCanvasIdentity === 'shell-owned', `${entry.id}: title plane is not shell-owned`, metrics);
  assert(metrics.titleCanvasReady, `${entry.id}: stable title plane is not ready`, metrics);
  assert(metrics.titlePixelAlpha > 0, `${entry.id}: stable title plane has no painted pixels`, metrics);
  assert(!metrics.titleCanvasAtmosphereSource, `${entry.id}: title plane entered an atmosphere source layer`, metrics);
  if (entry.surface === 'home-mode' && metrics.canvasFontSize > 0) {
    assert(metrics.canvasTitleVisible, `${entry.id}: canvas title diagnostics report it hidden`, metrics);
    compareMetric(
      metrics.canvasFontSize,
      metrics.effectiveFontSize,
      'canvas versus canonical font size',
      tolerance.font,
      entry.id,
    );
    assert(
      metrics.depthTitleActive
        ? metrics.materialZIndex < metrics.titleZIndex && metrics.titleZIndex < metrics.frontMaterialZIndex
        : metrics.titleZIndex < metrics.materialZIndex,
      `${entry.id}: title/material stacking contract is wrong`,
      metrics,
    );
  }
  return metrics;
}

async function auditStableTitleHandoffs(browser) {
  const context = await browser.newContext({
    viewport,
    colorScheme: 'light',
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  try {
    await page.goto(pageUrl('/index.html?mode=pit&absAudit=1'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => (
      document.documentElement.dataset.absBootState === 'ready'
      && document.getElementById('simulation-title-canvas')?.dataset.titlePlaneReady === 'true'
    ), null, { timeout: waitMs, polling: 'raf' });
    await page.waitForFunction(async () => {
      const titleModule = await import('/src/legacy/modules/rendering/title-depth.js');
      const snapshot = titleModule.getHomepageCanvasTitleSnapshot();
      return snapshot.sourceConnected
        && snapshot.visible
        && snapshot.firstLineX > 20
        && snapshot.firstLineY > 20;
    }, null, { timeout: waitMs, polling: 'raf' });
    await page.evaluate(() => {
      window.__ABS_TITLE_PLANE_IDENTITY__ = document.getElementById('simulation-title-canvas');
    });

    const handoffs = [
      { label: 'home-to-home', targetName: 'Scaffold', targetId: '3d-cube' },
      { label: 'home-to-daily', targetName: 'Tension', targetId: 'repel-room' },
      { label: 'daily-to-daily', targetName: 'Convergence', targetId: 'flock-of-birds' },
      { label: 'daily-to-home', targetName: 'Foundation', targetId: 'pit' },
    ];
    const results = [];
    for (const handoff of handoffs) {
      await page.waitForFunction(async () => {
        const titleModule = await import('/src/legacy/modules/rendering/title-depth.js');
        const snapshot = titleModule.getHomepageCanvasTitleSnapshot();
        return snapshot.sourceConnected && snapshot.visible;
      }, null, { timeout: waitMs, polling: 'raf' });
      await page.locator('.simulation-focus-switcher').click({ timeout: waitMs });
      await page.waitForSelector('.simulation-focus-modal.active', { timeout: waitMs });
      await page.evaluate(async ({ label }) => {
        const titleModule = await import('/src/legacy/modules/rendering/title-depth.js');
        const scratch = document.createElement('canvas');
        scratch.width = 48;
        scratch.height = 48;
        const scratchContext = scratch.getContext('2d', { alpha: true, willReadFrequently: true });
        const initialCanvas = document.getElementById('simulation-title-canvas');
        const initialRect = initialCanvas?.getBoundingClientRect();
        const initialTitle = titleModule.getHomepageCanvasTitleSnapshot();
        const audit = {
          label,
          samples: [],
          sawBusy: false,
          done: false,
          lastCenterX: initialRect && initialCanvas?.width > 0
            ? initialRect.left + initialTitle.firstLineX * (initialRect.width / initialCanvas.width)
            : null,
          lastCenterY: initialRect && initialCanvas?.height > 0
            ? initialRect.top + initialTitle.firstLineY * (initialRect.height / initialCanvas.height)
            : null,
        };
        window.__ABS_TITLE_HANDOFF_AUDIT__ = audit;
        const sample = () => {
          const canvas = document.getElementById('simulation-title-canvas');
          const semantic = document.getElementById('hero-title');
          const semanticLine = semantic?.querySelector('.hero-title__name');
          const semanticRect = semanticLine?.getBoundingClientRect();
          const canvasRect = canvas?.getBoundingClientRect();
          const title = titleModule.getHomepageCanvasTitleSnapshot();
          const tx = window.__ABS_SIMULATION_SWITCH_TRANSACTION__ || {};
          let maxAlpha = 0;
          if (canvas && scratchContext) {
            scratchContext.clearRect(0, 0, 48, 48);
            scratchContext.drawImage(canvas, 0, 0, 48, 48);
            const pixels = scratchContext.getImageData(0, 0, 48, 48).data;
            for (let index = 3; index < pixels.length; index += 4) maxAlpha = Math.max(maxAlpha, pixels[index]);
          }
          if (title.sourceConnected && canvasRect && canvas?.width > 0 && title.firstLineX > 20) {
            audit.lastCenterX = canvasRect.left + title.firstLineX * (canvasRect.width / canvas.width);
            audit.lastCenterY = canvasRect.top + title.firstLineY * (canvasRect.height / canvas.height);
          }
          const centerX = audit.lastCenterX;
          const centerY = audit.lastCenterY;
          audit.samples.push({
            at: performance.now(),
            phase: tx.phase || 'idle',
            transactionId: tx.transactionId || '',
            sameNode: canvas === window.__ABS_TITLE_PLANE_IDENTITY__,
            canvasCount: document.querySelectorAll('#simulation-title-canvas').length,
            canvasReady: canvas?.dataset.titlePlaneReady === 'true',
            maxAlpha,
            centerX,
            centerY,
            semanticPresent: Boolean(semantic && semanticLine),
            semanticCanvasSource: semantic?.dataset.canvasTitleSource === 'home',
            semanticAccessible: semantic?.getAttribute('aria-hidden') !== 'true' && Boolean(semantic?.textContent?.trim()),
            semanticOpacity: semantic ? Number.parseFloat(getComputedStyle(semantic).opacity || '1') : null,
            semanticWidth: semanticRect?.width || 0,
            semanticHeight: semanticRect?.height || 0,
            semanticCenterX: semanticRect ? semanticRect.left + semanticRect.width * 0.5 : null,
            semanticCenterY: semanticRect ? semanticRect.top + semanticRect.height * 0.5 : null,
            sourceConnected: title.sourceConnected,
            retainedPixels: title.retainedPixels,
            atmosphereSource: Boolean(
              canvas?.hasAttribute('data-atmosphere-source-material')
              || canvas?.closest('[data-atmosphere-source-material]'),
            ),
          });
          if (tx.busy || (tx.phase && tx.phase !== 'idle')) audit.sawBusy = true;
          if (audit.sawBusy && !tx.busy && tx.phase === 'idle') {
            audit.done = true;
            return;
          }
          if (performance.now() - audit.samples[0].at < 30000) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }, { label: handoff.label });

      await page.locator('.simulation-focus-modal.active .simulation-focus-row')
        .filter({ hasText: handoff.targetName })
        .first()
        .click({ timeout: waitMs });
      await page.waitForFunction(({ targetId }) => {
        const audit = window.__ABS_TITLE_HANDOFF_AUDIT__;
        const tx = window.__ABS_SIMULATION_SWITCH_TRANSACTION__ || {};
        const runtimeId = document.querySelector('#simulation-stage')?.dataset?.simulationId
          || window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().mode;
        return audit?.done && tx.phase === 'idle' && tx.targetSimulationId === targetId && runtimeId === targetId;
      }, { targetId: handoff.targetId }, { timeout: waitMs, polling: 'raf' });
      const result = await page.evaluate(() => window.__ABS_TITLE_HANDOFF_AUDIT__);
      assert(result.sawBusy && result.samples.length >= 3, `${handoff.label}: handoff was not sampled`, result);
      const firstLifecycleIndex = result.samples.findIndex((sample) => sample.phase !== 'idle');
      assert(firstLifecycleIndex >= 0, `${handoff.label}: lifecycle phases were not sampled`, result);
      const lifecycleSamples = result.samples.slice(firstLifecycleIndex);
      const baseline = lifecycleSamples[0];
      for (const sample of lifecycleSamples) {
        assert(sample.sameNode && sample.canvasCount === 1, `${handoff.label}: stable title node identity changed`, sample);
        assert(sample.canvasReady && sample.maxAlpha > 0, `${handoff.label}: title pixels disappeared`, sample);
        assert(sample.semanticPresent && sample.semanticWidth > 0 && sample.semanticHeight > 0, `${handoff.label}: semantic geometry source disappeared`, sample);
        assert(sample.semanticCanvasSource && sample.semanticAccessible, `${handoff.label}: semantic accessibility source changed`, sample);
        assert(sample.semanticOpacity <= 0.02, `${handoff.label}: semantic title became visually paintable`, sample);
        assert(!sample.atmosphereSource, `${handoff.label}: title plane entered atmosphere source ownership`, sample);
        compareMetric(sample.centerX, baseline.centerX, 'canvas title center x', 1, handoff.label);
        compareMetric(sample.centerY, baseline.centerY, 'canvas title center y', 1, handoff.label);
        if (sample.sourceConnected) {
          compareMetric(sample.centerX, sample.semanticCenterX, 'canvas/semantic center x', 1, handoff.label);
          compareMetric(sample.centerY, sample.semanticCenterY, 'canvas/semantic center y', 1, handoff.label);
        }
      }
      await page.screenshot({ path: resolve(outputRoot, `${handoff.label}.png`) });
      results.push({
        ...handoff,
        sampleCount: lifecycleSamples.length,
        phaseHistory: [...new Set(lifecycleSamples.map((sample) => sample.phase))],
        maxCenterDeltaX: Math.max(...lifecycleSamples.map((sample) => Math.abs(sample.centerX - baseline.centerX))),
        maxCenterDeltaY: Math.max(...lifecycleSamples.map((sample) => Math.abs(sample.centerY - baseline.centerY))),
      });
    }
    return results;
  } catch (error) {
    await page.screenshot({ path: resolve(outputRoot, 'failure.png'), fullPage: true }).catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

async function auditHomeCanvasTitleEntrance(browser) {
  const context = await browser.newContext({
    viewport,
    colorScheme: 'light',
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(() => {
    window.__ABS_HOME_CANVAS_TITLE_ENTRANCE_AUDIT__ = {
      sawPendingHidden: false,
      sawDomIntermediate: false,
      sawCanvasIntermediate: false,
      sawEnterWithoutOverlay: false,
      sawDelayedControlInert: false,
      delayedControlEscapedInert: false,
      escapedTargets: [],
    };

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[contenteditable="true"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const sample = () => {
      const audit = window.__ABS_HOME_CANVAS_TITLE_ENTRANCE_AUDIT__;
      const root = document.documentElement;
      const titleLine = document.querySelector('#hero-title .hero-title__name');
      const titleGlyphs = Array.from(
        document.querySelectorAll('#hero-title [data-route-enter-glyph]'),
      );
      const glyphOpacities = titleGlyphs.map((glyph) => (
        Number.parseFloat(getComputedStyle(glyph).opacity || '1')
      ));
      const domOpacity = glyphOpacities.length > 0
        ? Math.max(...glyphOpacities)
        : titleLine
          ? Number.parseFloat(getComputedStyle(titleLine).opacity || '1')
          : 1;
      const titleIsStaged = glyphOpacities.length > 0
        ? glyphOpacities.every((opacity) => opacity <= 0.02)
        : domOpacity <= 0.02;
      const titleIsInterpolating = glyphOpacities.length > 0
        ? glyphOpacities.some((opacity) => opacity > 0.02 && opacity < 0.98)
          || (Math.min(...glyphOpacities) <= 0.02 && domOpacity >= 0.98)
        : domOpacity > 0.02 && domOpacity < 0.98;
      const snapshot = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.();
      const canvasOpacity = Number(snapshot?.canvasTitleMaxOpacity) || 0;

      if (root.classList.contains('abs-home-post-boot-pending') && titleIsStaged) {
        audit.sawPendingHidden = true;
      }
      if (root.classList.contains('abs-home-post-boot-enter')) {
        if (!document.getElementById('abs-boot-overlay')) audit.sawEnterWithoutOverlay = true;
        if (titleIsInterpolating) audit.sawDomIntermediate = true;
        if (canvasOpacity > 0.02 && canvasOpacity < 0.98) audit.sawCanvasIntermediate = true;
      }

      if (root.dataset.absBootState === 'revealing' && !document.getElementById('abs-boot-overlay')) {
        document.querySelectorAll('[data-route-enter]').forEach((target) => {
          const containsControl = target.matches(focusableSelector)
            || target.querySelector(focusableSelector);
          if (!containsControl || Number.parseFloat(getComputedStyle(target).opacity || '1') > 0.02) return;
          if (target.inert) audit.sawDelayedControlInert = true;
          else {
            audit.delayedControlEscapedInert = true;
            const label = target.id || target.className || target.tagName;
            if (!audit.escapedTargets.includes(label)) audit.escapedTargets.push(label);
          }
        });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  const page = await context.newPage();
  try {
    await page.goto(pageUrl('/index.html?mode=pit&absAudit=1'), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForFunction(() => (
      document.documentElement.classList.contains('abs-home-post-boot-complete')
      && document.documentElement.dataset.absBootState === 'ready'
      && window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().canvasTitleVisible === true
    ), null, { timeout: waitMs });

    const result = await page.evaluate(() => ({
      ...window.__ABS_HOME_CANVAS_TITLE_ENTRANCE_AUDIT__,
      canvasOpacity: Number(
        window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().canvasTitleMaxOpacity,
      ) || 0,
      stuckInertTargets: Array.from(document.querySelectorAll('[data-route-enter][inert]'))
        .map((target) => target.id || target.className || target.tagName),
    }));

    assert(result.sawPendingHidden, 'Home title was not staged hidden before its entrance', result);
    assert(result.sawDomIntermediate, 'Home semantic title did not interpolate after the loader', result);
    assert(result.sawCanvasIntermediate, 'Home canvas title did not mirror the semantic title entrance', result);
    assert(result.sawEnterWithoutOverlay, 'Home title entrance began before the loader detached', result);
    assert(result.sawDelayedControlInert, 'Home delayed controls were not removed from keyboard navigation', result);
    assert(!result.delayedControlEscapedInert, 'A hidden Home entrance control remained keyboard-focusable', result);
    assert(result.stuckInertTargets.length === 0, 'Home entrance left controls inert after settling', result);
    assert(result.canvasOpacity >= 0.99, 'Home canvas title did not settle visible', result);
    return result;
  } finally {
    await context.close();
  }
}

async function readCanvasTitleThemePaint(page) {
  return page.evaluate(() => {
    const canvas = document.getElementById('simulation-title-canvas');
    const canvasRect = canvas?.getBoundingClientRect();
    const context = canvas?.getContext('2d', { alpha: true, willReadFrequently: true });
    if (!canvas || !canvasRect || !context || canvasRect.width <= 0 || canvasRect.height <= 0) {
      return null;
    }

    const scaleX = canvas.width / canvasRect.width;
    const scaleY = canvas.height / canvasRect.height;
    return Array.from(document.querySelectorAll('#hero-title .hero-title__name, #hero-title .hero-title__role'))
      .map((line) => {
        const style = getComputedStyle(line);
        const rect = line.getBoundingClientRect();
        const x = Math.max(0, Math.floor((rect.left - canvasRect.left) * scaleX));
        const y = Math.max(0, Math.floor((rect.top - canvasRect.top) * scaleY));
        const width = Math.min(canvas.width - x, Math.ceil(rect.width * scaleX));
        const height = Math.min(canvas.height - y, Math.ceil(rect.height * scaleY));
        const pixels = context.getImageData(x, y, width, height).data;
        let maxAlpha = 0;
        let red = 0;
        let green = 0;
        let blue = 0;
        let maxAlphaPixelCount = 0;
        for (let index = 0; index < pixels.length; index += 4) {
          const alpha = pixels[index + 3];
          if (alpha < maxAlpha) continue;
          if (alpha > maxAlpha) {
            maxAlpha = alpha;
            red = 0;
            green = 0;
            blue = 0;
            maxAlphaPixelCount = 0;
          }
          if (alpha <= 0) continue;
          red += pixels[index];
          green += pixels[index + 1];
          blue += pixels[index + 2];
          maxAlphaPixelCount += 1;
        }
        const semanticRgb = (style.color.match(/[\d.]+/g) || [])
          .slice(0, 3)
          .map((channel) => Math.round(Number(channel)));
        return {
          text: String(line.textContent || '').replace(/\u00a0/g, ' ').trim(),
          semanticColor: style.color,
          semanticRgb,
          semanticOpacity: Number.parseFloat(style.opacity || '1'),
          canvasRgb: maxAlphaPixelCount > 0
            ? [
              Math.round(red / maxAlphaPixelCount),
              Math.round(green / maxAlphaPixelCount),
              Math.round(blue / maxAlphaPixelCount),
            ]
            : [],
          canvasMaxAlpha: maxAlpha,
        };
      });
  });
}

function assertCanvasTitleThemePaint(lines, label) {
  assert(lines?.length === 3, `${label}: expected three Home title lines`, lines);
  lines.forEach((line) => {
    assert(line.canvasMaxAlpha > 0, `${label}/${line.text}: Canvas title line is empty`, line);
    assert(line.canvasRgb.length === 3 && line.semanticRgb.length === 3,
      `${label}/${line.text}: title colour could not be sampled`, line);
    line.canvasRgb.forEach((channel, index) => {
      assert(Math.abs(channel - line.semanticRgb[index]) <= 1,
        `${label}/${line.text}: Canvas colour does not match the semantic title`, line);
    });
    const expectedAlpha = Math.round(line.semanticOpacity * 255);
    assert(Math.abs(line.canvasMaxAlpha - expectedAlpha) <= 3,
      `${label}/${line.text}: Canvas opacity does not match the semantic title`, {
        ...line,
        expectedAlpha,
      });
  });
  assert(lines[1].canvasMaxAlpha < lines[0].canvasMaxAlpha,
    `${label}: Creative & must remain quieter than Alexander Beck`, lines);
  assert(lines[2].canvasMaxAlpha < lines[0].canvasMaxAlpha,
    `${label}: Technologist. must remain quieter than Alexander Beck`, lines);
}

async function auditHomeCanvasTitleThemeSwitch(browser) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'dark',
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(() => {
    localStorage.setItem('theme-preference-v3', 'auto');
    localStorage.removeItem('theme-preference-v2');
  });
  const page = await context.newPage();
  try {
    await page.goto(pageUrl('/index.html?mode=pit&absAudit=1'), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await waitForSettledHomeTitle(page);
    await page.waitForFunction(() => document.documentElement.dataset.absTheme === 'dark', null, {
      timeout: waitMs,
    });
    const dark = await readCanvasTitleThemePaint(page);
    assertCanvasTitleThemePaint(dark, 'dark');
    await page.screenshot({ path: resolve(outputRoot, 'theme-switch-dark.png') });

    const previousRevision = await page.evaluate(() => (
      Number(document.getElementById('simulation-title-canvas')?.dataset.titlePlaneRenderRevision) || 0
    ));
    await page.getByRole('button', { name: 'Switch to light mode' }).click();
    await page.waitForFunction((revision) => (
      document.documentElement.dataset.absTheme === 'light'
      && Number(document.getElementById('simulation-title-canvas')?.dataset.titlePlaneRenderRevision) > revision
    ), previousRevision, { timeout: waitMs, polling: 'raf' });
    await page.evaluate(() => new Promise((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
    }));
    const light = await readCanvasTitleThemePaint(page);
    assertCanvasTitleThemePaint(light, 'light');
    await page.screenshot({ path: resolve(outputRoot, 'theme-switch-light.png') });

    return { dark, light };
  } catch (error) {
    await page.screenshot({ path: resolve(outputRoot, 'theme-switch-failure.png'), fullPage: true })
      .catch(() => undefined);
    throw error;
  } finally {
    await context.close();
  }
}

async function main() {
  const server = await ensureServer();
  const entries = await readCatalog();
  const browser = await browserType.launch();
  const byTheme = {};

  try {
    await mkdir(outputRoot, { recursive: true });
    const titleThemeSwitch = await auditHomeCanvasTitleThemeSwitch(browser);
    const themeOnly = process.env.ABS_TITLE_THEME_ONLY === '1';
    if (themeOnly) {
      const themeOutput = {
        ok: true,
        browser: browserName,
        viewport: { width: 1440, height: 900 },
        titleThemeSwitch,
      };
      await writeFile(resolve(outputRoot, 'result.json'), `${JSON.stringify(themeOutput, null, 2)}\n`);
      console.log(JSON.stringify(themeOutput, null, 2));
      return;
    }
    const resizeOnly = process.env.ABS_TITLE_RESIZE_ONLY === '1';
    const homeCanvasEntrance = resizeOnly ? null : await auditHomeCanvasTitleEntrance(browser);
    const stableTitleHandoffs = resizeOnly ? [] : await auditStableTitleHandoffs(browser);
    const stableTitleResize = await auditStableTitleResize(browser);
    const retainedTitleResize = await auditRetainedTitleResize(browser);
    const continuousHomeResize = await auditContinuousHomeResize(browser);
    if (resizeOnly || process.env.ABS_TITLE_ENTRANCE_ONLY === '1') {
      const entranceOutput = {
        ok: true,
        browser: browserName,
        viewport,
        resizeOnly,
        homeCanvasEntrance,
        stableTitleHandoffs,
        stableTitleResize,
        retainedTitleResize,
        continuousHomeResize,
      };
      await writeFile(resolve(outputRoot, 'result.json'), `${JSON.stringify(entranceOutput, null, 2)}\n`);
      console.log(JSON.stringify(entranceOutput, null, 2));
      return;
    }
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport, colorScheme: theme, reducedMotion: 'reduce' });
      await context.addInitScript(() => {
        localStorage.setItem('theme-preference-v3', 'auto');
        localStorage.removeItem('theme-preference-v2');
      });
      const page = await context.newPage();
      const results = [];
      let baseline = null;
      try {
        for (const entry of entries) {
          const metrics = await visitSimulation(page, entry);
          baseline ||= metrics;
          compareTitleMetrics(metrics, baseline, `${theme}/${entry.id}`);
          results.push({ id: entry.id, surface: entry.surface, ...metrics });
        }
        await page.screenshot({ path: resolve(outputRoot, `direct-${theme}.png`) });
      } finally {
        await context.close();
      }
      byTheme[theme] = results;
    }

    const lightById = new Map(byTheme.light.map((result) => [result.id, result]));
    byTheme.dark.forEach((darkResult) => {
      compareTitleMetrics(darkResult, lightById.get(darkResult.id), `theme-switch/${darkResult.id}`);
    });

    const output = {
      ok: true,
      browser: browserName,
      viewport,
      simulationCount: entries.length,
      checks: entries.length * 3,
      canonicalEffectiveFontSize: byTheme.light[0]?.effectiveFontSize,
      titleRect: byTheme.light[0]?.titleRect,
      depthModes: byTheme.light.filter((entry) => entry.depthTitleActive).map((entry) => entry.id),
      homeCanvasEntrance,
      stableTitleHandoffs,
      stableTitleResize,
      retainedTitleResize,
      continuousHomeResize,
      titleThemeSwitch,
    };
    if (process.env.ABS_TITLE_AUDIT_DETAILS === '1') output.results = byTheme;
    await writeFile(resolve(outputRoot, 'result.json'), `${JSON.stringify(output, null, 2)}\n`);
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await browser.close();
    server?.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
