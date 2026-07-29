import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { PNG } from 'pngjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = resolve(repoRoot, 'output/playwright/rendered-wall-contour');
const baseUrl = process.env.ABS_RENDERED_CONTOUR_URL || 'http://localhost:8012';
const shouldStartDevServer = !process.env.ABS_RENDERED_CONTOUR_URL;
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const captureAll = process.env.ABS_CONTOUR_CAPTURE_ALL === '1';
const viewports = [
  { name: 'mobile-320', width: 320, height: 720 },
  { name: 'evidence-351', width: 351, height: 933 },
  { name: 'mobile-600', width: 600, height: 900 },
  { name: 'desktop-601', width: 601, height: 900 },
  { name: 'embedded-1280', width: 1280, height: 720 },
  { name: 'desktop-1440', width: 1440, height: 960 },
];
const themes = ['light', 'dark'];
const deviceScaleFactors = [1, 2];
const PROBE_OUTSIDE = [255, 255, 0];
const PROBE_CANVAS = [0, 255, 255];
const MAX_PIXEL_DISTANCE = 8;
const MAX_GEOMETRY_DELTA_PX = 0;

mkdirSync(outputDir, { recursive: true });

function log(message) {
  console.log(`[rendered-wall-contour] ${message}`);
}

function routeUrl(pathname = '/index.html') {
  const url = new URL(pathname, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  url.searchParams.set('mode', 'pit');
  url.searchParams.set('absAudit', '1');
  return url.toString();
}

async function waitForHttpReady(url, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError = null;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      const body = response.ok ? await response.text() : '';
      if (response.ok && body.includes('Alexander Beck Studio')) return;
      lastError = new Error(`unexpected HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Dev server not ready at ${url}: ${lastError?.message || 'unknown error'}`);
}

function startDevServer() {
  const child = spawn('npm', ['run', 'dev:react', '--', '--host', 'localhost', '--strictPort'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk.toString(); });
  child.stderr.on('data', (chunk) => { logs += chunk.toString(); });
  return {
    getLogs: () => logs,
    stop: async () => {
      if (child.exitCode !== null) return;
      child.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveStop) => child.once('exit', resolveStop)),
        delay(2000),
      ]);
      if (child.exitCode === null) child.kill('SIGKILL');
    },
  };
}

async function ensureDevServer() {
  const readyUrl = routeUrl();
  try {
    await waitForHttpReady(readyUrl, 2500);
    log(`using existing server at ${baseUrl}`);
    return null;
  } catch (error) {
    if (!shouldStartDevServer) throw error;
  }

  const server = startDevServer();
  try {
    await waitForHttpReady(readyUrl);
    log(`started dev server at ${baseUrl}`);
    return server;
  } catch (error) {
    await server.stop();
    throw new Error(`${error.message}\n${server.getLogs()}`.trim());
  }
}

async function createContext(browser, viewport, theme, deviceScaleFactor, forceDesktop = false) {
  const isMobile = !forceDesktop && viewport.width <= 600;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor,
    isMobile,
    hasTouch: isMobile,
    colorScheme: theme,
  });
  await context.addInitScript((preference) => {
    try {
      localStorage.setItem('theme-preference-v3', preference);
    } catch {
      // The initial opaque document cannot use storage; the origin document can.
    }
  }, theme);
  return context;
}

async function waitForHomeCanvas(page) {
  await page.waitForFunction(() => document.documentElement.dataset.absBootState === 'ready', null, {
    timeout: 30_000,
  });
  await page.waitForSelector('#c', { state: 'visible', timeout: 30_000 });
  await page.waitForFunction((maxGeometryDeltaPx) => {
    const canvas = document.querySelector('#c');
    const wall = document.querySelector('#simulations');
    if (!canvas || !wall) return false;
    const canvasRect = canvas.getBoundingClientRect();
    const wallRect = wall.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    return (
      Math.abs(canvasRect.x - wallRect.x) <= maxGeometryDeltaPx
      && Math.abs(canvasRect.y - wallRect.y) <= maxGeometryDeltaPx
      && Math.abs(canvasRect.width - wallRect.width) <= maxGeometryDeltaPx
      && Math.abs(canvasRect.height - wallRect.height) <= maxGeometryDeltaPx
      && Math.abs(canvas.width - Math.ceil(canvasRect.width * dpr)) <= 1
      && Math.abs(canvas.height - Math.ceil(canvasRect.height * dpr)) <= 1
    );
  }, MAX_GEOMETRY_DELTA_PX, { timeout: 30_000, polling: 100 });
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
}

async function installPixelProbe(page) {
  return page.evaluate(() => {
    if (!document.getElementById('abs-rendered-contour-probe')) {
      const style = document.createElement('style');
      style.id = 'abs-rendered-contour-probe';
      style.textContent = `
        html, body, #abs-scene { background: rgb(255 255 0) !important; }
        #simulations { background: rgb(255 0 255) !important; }
        #shell-wall-slot,
        .studio-window-route-root,
        .route-simulation-layer { background: transparent !important; }
        #scene-effects,
        .inner-wall-gradient-edge,
        #shell-hero-slot,
        .simulation-focus-switcher-slot,
        #custom-cursor,
        .frame-vignette,
        .fade-content,
        .window-overlay-layer,
        .shell-bottom-band,
        #portfolio-sheet-host,
        #quote-viewport-host,
        button[aria-label='Toggle design panel'] { display: none !important; }
        #abs-rendered-contour-probe-canvas {
          position: absolute !important;
          inset: 0 !important;
          z-index: 999 !important;
          display: block !important;
          width: 100% !important;
          height: 100% !important;
          background: rgb(0 255 255) !important;
          pointer-events: none !important;
        }
      `;
      document.head.append(style);
    }

    if (!document.getElementById('abs-rendered-contour-probe-canvas')) {
      const canvas = document.createElement('canvas');
      canvas.id = 'abs-rendered-contour-probe-canvas';
      canvas.setAttribute('aria-hidden', 'true');
      canvas.setAttribute('role', 'presentation');
      document.querySelector('#simulations')?.append(canvas);
    }
  });
}

async function fillProbeCanvas(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#abs-rendered-contour-probe-canvas');
    const wall = document.querySelector('#simulations');
    if (!canvas || !wall) throw new Error('wall or contour probe Canvas missing');
    const canvasRect = canvas.getBoundingClientRect();
    const dpr = devicePixelRatio || 1;
    canvas.width = Math.ceil(canvasRect.width * dpr);
    canvas.height = Math.ceil(canvasRect.height * dpr);
    const context = canvas.getContext('2d');
    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.globalCompositeOperation = 'copy';
    context.fillStyle = '#00ffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.restore();

    const wallRect = wall.getBoundingClientRect();
    const wallStyle = getComputedStyle(wall);
    const canvasStyle = getComputedStyle(canvas);
    return {
      dpr: devicePixelRatio,
      theme: document.documentElement.dataset.absTheme || '',
      wall: {
        x: wallRect.x,
        y: wallRect.y,
        right: wallRect.right,
        bottom: wallRect.bottom,
        width: wallRect.width,
        height: wallRect.height,
        radius: Number.parseFloat(wallStyle.borderTopLeftRadius),
        cornerShape: wallStyle.cornerShape || '',
        overflow: wallStyle.overflow,
        transform: wallStyle.transform,
      },
      canvas: {
        x: canvasRect.x,
        y: canvasRect.y,
        right: canvasRect.right,
        bottom: canvasRect.bottom,
        width: canvasRect.width,
        height: canvasRect.height,
        radius: Number.parseFloat(canvasStyle.borderTopLeftRadius),
        cornerShape: canvasStyle.cornerShape || '',
        overflow: canvasStyle.overflow,
        transform: canvasStyle.transform,
        willChange: canvasStyle.willChange,
        backingWidth: canvas.width,
        backingHeight: canvas.height,
      },
      liveCanvasRadii: Array.from(wall.querySelectorAll('canvas:not(#abs-rendered-contour-probe-canvas)'))
        .map((liveCanvas) => ({
          id: liveCanvas.id,
          className: liveCanvas.className,
          radius: Number.parseFloat(getComputedStyle(liveCanvas).borderTopLeftRadius),
        })),
    };
  });
}

function colorDistance(a, b) {
  return Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
}

function isColor(pixel, target, tolerance = 36) {
  return colorDistance(pixel, target) <= tolerance;
}

function getPixel(png, x, y) {
  const safeX = Math.max(0, Math.min(png.width - 1, x));
  const safeY = Math.max(0, Math.min(png.height - 1, y));
  const index = ((safeY * png.width) + safeX) * 4;
  return [png.data[index], png.data[index + 1], png.data[index + 2], png.data[index + 3]];
}

function setPixel(png, x, y, color) {
  if (x < 0 || y < 0 || x >= png.width || y >= png.height) return;
  const index = ((y * png.width) + x) * 4;
  png.data[index] = color[0];
  png.data[index + 1] = color[1];
  png.data[index + 2] = color[2];
  png.data[index + 3] = 255;
}

function getCornerRegions(geometry) {
  const { dpr, wall } = geometry;
  const padding = Math.ceil(4 * dpr);
  const radius = Math.ceil((wall.radius + 4) * dpr);
  const left = Math.round(wall.x * dpr);
  const top = Math.round(wall.y * dpr);
  const right = Math.round(wall.right * dpr) - 1;
  const bottom = Math.round(wall.bottom * dpr) - 1;
  return {
    upperLeft: { x0: left - padding, y0: top - padding, x1: left + radius, y1: top + radius },
    upperRight: { x0: right - radius, y0: top - padding, x1: right + padding, y1: top + radius },
    lowerLeft: { x0: left - padding, y0: bottom - radius, x1: left + radius, y1: bottom + padding },
    lowerRight: { x0: right - radius, y0: bottom - radius, x1: right + padding, y1: bottom + padding },
  };
}

function compareRenderedCorners(productionBuffer, oracleBuffer, geometry) {
  const production = PNG.sync.read(productionBuffer);
  const oracle = PNG.sync.read(oracleBuffer);
  if (production.width !== oracle.width || production.height !== oracle.height) {
    throw new Error('production/oracle screenshot dimensions differ');
  }
  const corners = {};
  for (const [name, region] of Object.entries(getCornerRegions(geometry))) {
    let changedPixels = 0;
    let materialPixels = 0;
    let maxDistance = 0;
    for (let y = Math.max(0, region.y0); y <= Math.min(production.height - 1, region.y1); y += 1) {
      for (let x = Math.max(0, region.x0); x <= Math.min(production.width - 1, region.x1); x += 1) {
        const distance = colorDistance(getPixel(production, x, y), getPixel(oracle, x, y));
        if (distance > 0) changedPixels += 1;
        if (distance > MAX_PIXEL_DISTANCE) materialPixels += 1;
        maxDistance = Math.max(maxDistance, distance);
      }
    }
    corners[name] = { changedPixels, materialPixels, maxDistance };
  }
  return corners;
}

function buildContourOverlay(buffer, geometry) {
  const source = PNG.sync.read(buffer);
  const overlay = PNG.sync.read(PNG.sync.write(source));
  const neighbours = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  for (const region of Object.values(getCornerRegions(geometry))) {
    for (let y = Math.max(1, region.y0); y <= Math.min(source.height - 2, region.y1); y += 1) {
      for (let x = Math.max(1, region.x0); x <= Math.min(source.width - 2, region.x1); x += 1) {
        const pixel = getPixel(source, x, y);
        const frameEdge = isColor(pixel, PROBE_OUTSIDE)
          && neighbours.some(([dx, dy]) => !isColor(getPixel(source, x + dx, y + dy), PROBE_OUTSIDE));
        const canvasEdge = isColor(pixel, PROBE_CANVAS)
          && neighbours.some(([dx, dy]) => !isColor(getPixel(source, x + dx, y + dy), PROBE_CANVAS));
        if (frameEdge) setPixel(overlay, x, y, [255, 32, 32]);
        if (canvasEdge) setPixel(overlay, x, y, [32, 96, 255]);
      }
    }
  }
  return PNG.sync.write(overlay);
}

function assertGeometry(geometry, label) {
  const deltas = [
    geometry.canvas.x - geometry.wall.x,
    geometry.canvas.y - geometry.wall.y,
    geometry.canvas.width - geometry.wall.width,
    geometry.canvas.height - geometry.wall.height,
  ];
  if (deltas.some((delta) => Math.abs(delta) > MAX_GEOMETRY_DELTA_PX)) {
    throw new Error(`${label}: Canvas CSS box differs from wall: ${JSON.stringify(deltas)}`);
  }
  if (geometry.canvas.radius !== 0) {
    throw new Error(`${label}: Canvas owns an independent ${geometry.canvas.radius}px radius`);
  }
  const independentlyClippedCanvas = geometry.liveCanvasRadii.find((canvas) => canvas.radius !== 0);
  if (independentlyClippedCanvas) {
    throw new Error(`${label}: live Canvas owns an independent radius: ${JSON.stringify(independentlyClippedCanvas)}`);
  }
  if (geometry.wall.overflow !== 'hidden') {
    throw new Error(`${label}: wall must be the overflow clip authority, got ${geometry.wall.overflow}`);
  }
  const expectedWidth = Math.ceil(geometry.canvas.width * geometry.dpr);
  const expectedHeight = Math.ceil(geometry.canvas.height * geometry.dpr);
  if (
    Math.abs(geometry.canvas.backingWidth - expectedWidth) > 1
    || Math.abs(geometry.canvas.backingHeight - expectedHeight) > 1
  ) {
    throw new Error(`${label}: backing store ${geometry.canvas.backingWidth}x${geometry.canvas.backingHeight} does not match ${expectedWidth}x${expectedHeight}`);
  }
}

async function captureProbe(page, label, saveArtifacts) {
  await installPixelProbe(page);
  const geometry = await fillProbeCanvas(page);
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
  const production = await page.screenshot({ animations: 'disabled', scale: 'device' });

  await page.evaluate(() => {
    document.querySelector('#abs-rendered-contour-probe-canvas')
      ?.style.setProperty('border-radius', '0px', 'important');
  });
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
  const oracle = await page.screenshot({ animations: 'disabled', scale: 'device' });
  const corners = compareRenderedCorners(production, oracle, geometry);
  const materialPixels = Object.values(corners).reduce((sum, corner) => sum + corner.materialPixels, 0);
  const maxDistance = Math.max(...Object.values(corners).map((corner) => corner.maxDistance));

  assertGeometry(geometry, label);
  if (materialPixels > 0) {
    throw new Error(`${label}: production contour differs from parent-only pixel oracle: ${JSON.stringify(corners)}`);
  }

  if (saveArtifacts) {
    writeFileSync(resolve(outputDir, `${label}-production.png`), production);
    writeFileSync(resolve(outputDir, `${label}-parent-only-oracle.png`), oracle);
    writeFileSync(resolve(outputDir, `${label}-overlay.png`), buildContourOverlay(production, geometry));
  }

  return { label, geometry, corners, materialPixels, maxDistance };
}

async function runMatrixCase(browser, viewport, theme, deviceScaleFactor) {
  const label = `${browserName}-${viewport.name}-${theme}-dpr${deviceScaleFactor}`;
  const context = await createContext(browser, viewport, theme, deviceScaleFactor);
  try {
    const page = await context.newPage();
    await page.goto(routeUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await waitForHomeCanvas(page);
    const saveArtifacts = captureAll
      || (viewport.name === 'evidence-351' && theme === 'dark' && deviceScaleFactor === 2);
    if (saveArtifacts) {
      await page.screenshot({
        path: resolve(outputDir, `${label}-actual.png`),
        animations: 'disabled',
        scale: 'device',
      });
    }
    const result = await captureProbe(page, label, saveArtifacts);
    log(`PASS ${label}`);
    return result;
  } finally {
    await context.close();
  }
}

async function runLiveResizeSequence(browser) {
  const viewport = { name: 'live-resize', width: 599, height: 900 };
  const context = await createContext(browser, viewport, 'dark', 2, true);
  const results = [];
  try {
    const page = await context.newPage();
    await page.goto(routeUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await waitForHomeCanvas(page);
    for (const width of [599, 600, 601, 600]) {
      await page.setViewportSize({ width, height: 900 });
      await waitForHomeCanvas(page);
      const label = `${browserName}-live-resize-${width}-dark-dpr2`;
      results.push(await captureProbe(page, label, captureAll));
      log(`PASS ${label}`);
    }
    return results;
  } finally {
    await context.close();
  }
}

async function runRouteRemount(browser) {
  const viewport = { name: 'route-remount', width: 351, height: 933 };
  const context = await createContext(browser, viewport, 'dark', 2);
  try {
    const page = await context.newPage();
    await page.goto(routeUrl(), { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await waitForHomeCanvas(page);
    await page.evaluate(() => { window.__absContourOldCanvas = document.querySelector('#c'); });

    await page.evaluate(() => window.__ABS_SPA_NAVIGATE__('/about.html', {}));
    await page.waitForURL(/about\.html/, { timeout: 30_000 });
    await page.waitForFunction(() => !document.querySelector('#c'), null, { timeout: 30_000 });
    await page.evaluate(() => window.__ABS_SPA_NAVIGATE__('/index.html', {}));
    await page.waitForURL((url) => /(?:\/|index\.html)$/.test(url.pathname), { timeout: 30_000 });
    await waitForHomeCanvas(page);
    const remounted = await page.evaluate(() => document.querySelector('#c') !== window.__absContourOldCanvas);
    if (!remounted) throw new Error('route transition reused the previous Canvas instead of remounting it');

    const label = `${browserName}-route-remount-351-dark-dpr2`;
    const result = await captureProbe(page, label, true);
    log(`PASS ${label}`);
    return result;
  } finally {
    await context.close();
  }
}

async function main() {
  if (!['chromium', 'webkit'].includes(browserName)) {
    throw new Error(`ABS_BROWSER must be chromium or webkit, got ${browserName}`);
  }
  const server = await ensureDevServer();
  const browser = await browserType.launch({ headless: true });
  const results = [];
  try {
    for (const viewport of viewports) {
      for (const theme of themes) {
        for (const deviceScaleFactor of deviceScaleFactors) {
          results.push(await runMatrixCase(browser, viewport, theme, deviceScaleFactor));
        }
      }
    }
    results.push(...await runLiveResizeSequence(browser));
    results.push(await runRouteRemount(browser));
  } finally {
    await browser.close();
    await server?.stop();
  }

  const summary = {
    browser: browserName,
    baseUrl,
    cases: results.length,
    maxMaterialPixels: Math.max(...results.map((result) => result.materialPixels)),
    maxPixelDistance: Math.max(...results.map((result) => result.maxDistance)),
    results,
  };
  writeFileSync(resolve(outputDir, `${browserName}-summary.json`), `${JSON.stringify(summary, null, 2)}\n`);
  log(`PASS ${results.length} cases; production contour equals parent-only pixel oracle`);
}

main().catch((error) => {
  console.error(`[rendered-wall-contour] FAIL ${error.stack || error.message}`);
  process.exitCode = 1;
});
