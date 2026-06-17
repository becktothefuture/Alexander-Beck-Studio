/**
 * Focused smoke audit for the isolated Rain Prism lab.
 *
 * Run: npm run audit:rain-prism
 * Needs: dev or preview server. Set ABS_DEV_URL to an origin or full HTML URL.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createReadStream } from 'node:fs';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'rain-prism-audit');
const distRoot = resolve(repoRoot, 'react-app', 'app', 'dist');
const WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 25000);
let auditOrigin = null;

function resolveRainPrismUrl() {
  let raw = (process.env.ABS_DEV_URL || auditOrigin || 'http://127.0.0.1:8012').trim().replace(/\/+$/, '');
  const pathPart = raw.split('?')[0].split('#')[0];
  if (/\.html$/i.test(pathPart)) {
    return raw.replace(/\/[^/]*\.html$/i, '/lab/rain-prism.html');
  }
  return `${raw}/lab/rain-prism.html`;
}

function getContentType(pathname) {
  if (pathname.endsWith('.html')) return 'text/html; charset=utf-8';
  if (pathname.endsWith('.js')) return 'text/javascript; charset=utf-8';
  if (pathname.endsWith('.css')) return 'text/css; charset=utf-8';
  if (pathname.endsWith('.json')) return 'application/json; charset=utf-8';
  if (pathname.endsWith('.svg')) return 'image/svg+xml';
  if (pathname.endsWith('.png')) return 'image/png';
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'image/jpeg';
  if (pathname.endsWith('.woff2')) return 'font/woff2';
  return 'application/octet-stream';
}

function startStaticServer() {
  return new Promise((resolveStart, rejectStart) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || '/', 'http://127.0.0.1');
      const pathname = decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname);
      const filePath = resolve(distRoot, `.${pathname}`);
      if (!filePath.startsWith(distRoot)) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
      }

      const stream = createReadStream(filePath);
      stream.on('open', () => {
        res.statusCode = 200;
        res.setHeader('Content-Type', getContentType(pathname));
        stream.pipe(res);
      });
      stream.on('error', () => {
        res.statusCode = 404;
        res.end('Not Found');
      });
    });

    server.on('error', rejectStart);
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      if (!address || typeof address === 'string') {
        rejectStart(new Error('Static audit server did not expose a TCP port'));
        return;
      }
      resolveStart({
        server,
        origin: `http://127.0.0.1:${address.port}`,
      });
    });
  });
}

async function waitForRainPrismReady(page) {
  await page.goto(resolveRainPrismUrl(), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.rain-prism-demo', { timeout: WAIT_MS });
  await page.waitForFunction(
    () => {
      const lightBase = document.getElementById('rain-prism-base-light');
      const lightOverlay = document.getElementById('rain-prism-overlay-light');
      const darkBase = document.getElementById('rain-prism-base-dark');
      const darkOverlay = document.getElementById('rain-prism-overlay-dark');
      const api = window.__ABS_RAIN_PRISM__;
      return Boolean(
        lightBase
        && lightOverlay
        && darkBase
        && darkOverlay
        && api?.setConfigPatch
        && lightBase.width > 0
        && lightBase.height > 0
        && darkBase.width > 0
        && darkBase.height > 0
        && lightOverlay.width === lightBase.width
        && lightOverlay.height === lightBase.height
        && darkOverlay.width === darkBase.width
        && darkOverlay.height === darkBase.height
      );
    },
    { timeout: WAIT_MS }
  );
}

async function sampleCanvasStats(page, canvasId) {
  return page.evaluate((id) => {
    const canvas = document.getElementById(id);
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return null;
    const width = canvas.width;
    const height = canvas.height;
    const stride = Math.max(1, Math.round(Math.min(width, height) / 900));
    const data = ctx.getImageData(0, 0, width, height).data;
    let alphaHits = 0;
    let colorHits = 0;
    let alphaTotal = 0;
    let chromaTotal = 0;
    let chromaHitTotal = 0;
    let chromaEnergyTotal = 0;
    let lumaTotal = 0;
    let sampleCount = 0;

    for (let y = 0; y < height; y += stride) {
      for (let x = 0; x < width; x += stride) {
        const offset = ((y * width) + x) * 4;
        const r = data[offset];
        const g = data[offset + 1];
        const b = data[offset + 2];
        const a = data[offset + 3];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const chroma = max - min;
        const luma = (r + g + b) / 3;
        alphaTotal += a;
        chromaEnergyTotal += chroma * (a / 255);
        if (a > 2) {
          alphaHits += 1;
          chromaHitTotal += chroma;
        }
        if (a > 2 && luma > 3) colorHits += 1;
        chromaTotal += chroma;
        lumaTotal += luma;
        sampleCount += 1;
      }
    }

    const rect = canvas.getBoundingClientRect();
    return {
      id,
      width,
      height,
      cssWidth: rect.width,
      cssHeight: rect.height,
      alphaHitRatio: alphaHits / sampleCount,
      colorHitRatio: colorHits / sampleCount,
      alphaMean: alphaTotal / sampleCount,
      chromaMean: chromaTotal / sampleCount,
      chromaHitMean: alphaHits > 0 ? chromaHitTotal / alphaHits : 0,
      chromaEnergyMean: chromaEnergyTotal / sampleCount,
      lumaMean: lumaTotal / sampleCount,
    };
  }, canvasId);
}

async function storeCanvasSnapshot(page, canvasId, key) {
  await page.evaluate(({ id, snapshotKey }) => {
    const canvas = document.getElementById(id);
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !ctx) return;
    window[snapshotKey] = ctx.getImageData(0, 0, canvas.width, canvas.height);
  }, { id: canvasId, snapshotKey: key });
}

async function compareCanvasSnapshot(page, canvasId, key) {
  return page.evaluate(({ id, snapshotKey }) => {
    const before = window[snapshotKey];
    const canvas = document.getElementById(id);
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!before || !canvas || !ctx || before.width !== canvas.width || before.height !== canvas.height) {
      return null;
    }

    const after = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const stride = Math.max(1, Math.round(Math.min(canvas.width, canvas.height) / 900));
    let alphaUnionHits = 0;
    let rgbDiffTotal = 0;
    let alphaDiffTotal = 0;

    for (let y = 0; y < canvas.height; y += stride) {
      for (let x = 0; x < canvas.width; x += stride) {
        const offset = ((y * canvas.width) + x) * 4;
        const beforeAlpha = before.data[offset + 3];
        const afterAlpha = after.data[offset + 3];
        if (beforeAlpha <= 2 && afterAlpha <= 2) continue;
        alphaUnionHits += 1;
        rgbDiffTotal += Math.abs(before.data[offset] - after.data[offset])
          + Math.abs(before.data[offset + 1] - after.data[offset + 1])
          + Math.abs(before.data[offset + 2] - after.data[offset + 2]);
        alphaDiffTotal += Math.abs(beforeAlpha - afterAlpha);
      }
    }

    return {
      alphaUnionHits,
      rgbDiffMean: alphaUnionHits > 0 ? rgbDiffTotal / (alphaUnionHits * 3) : 0,
      alphaDiffMean: alphaUnionHits > 0 ? alphaDiffTotal / alphaUnionHits : 0,
    };
  }, { id: canvasId, snapshotKey: key });
}

async function getCanvasDimensions(page) {
  return page.evaluate(() => {
    const modes = ['light', 'dark'];
    const deviceDpr = window.devicePixelRatio || 1;
    const config = window.__ABS_RAIN_PRISM__?.getConfig?.() || {};
    const result = { dpr: deviceDpr, modes: {} };

    for (const mode of modes) {
      const base = document.getElementById(`rain-prism-base-${mode}`);
      const overlay = document.getElementById(`rain-prism-overlay-${mode}`);
      const rect = base?.getBoundingClientRect();
      if (!base || !overlay || !rect) return null;
      const actualDpr = base.width / Math.max(1, rect.width);
      const expectedDpr = Math.max(0.75, Math.min(Number(config.maxDpr) || deviceDpr, deviceDpr, 2.5));
      result.modes[mode] = {
        baseWidth: base.width,
        baseHeight: base.height,
        overlayWidth: overlay.width,
        overlayHeight: overlay.height,
        cssWidth: rect.width,
        cssHeight: rect.height,
        actualDpr,
        expectedDpr,
        expectedWidth: Math.round(rect.width * expectedDpr),
        expectedHeight: Math.round(rect.height * expectedDpr),
      };
    }

    return result;
  });
}

async function setRainPrismConfig(page, patch) {
  await page.evaluate((nextPatch) => {
    window.__ABS_RAIN_PRISM__?.setConfigPatch?.(nextPatch);
    window.__ABS_RAIN_PRISM__?.renderOnce?.();
  }, patch);
  await page.waitForTimeout(180);
  await page.evaluate(() => {
    window.__ABS_RAIN_PRISM__?.renderOnce?.();
  });
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function inspectSiteLayer(page, origin) {
  await page.goto(`${origin}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('.rain-prism-site-layer', { timeout: WAIT_MS });
  await page.waitForFunction(
    () => {
      const canvas = document.getElementById('rain-prism-site-overlay');
      const layer = document.querySelector('.rain-prism-site-layer');
      return Boolean(canvas && layer && layer.getAttribute('data-ready') === 'true' && canvas.width > 0 && canvas.height > 0);
    },
    { timeout: WAIT_MS }
  );

  const geometry = await page.evaluate(() => {
    const layer = document.querySelector('.rain-prism-site-layer');
    const canvas = document.getElementById('rain-prism-site-overlay');
    const wall = document.getElementById('simulations');
    const fade = document.querySelector('.fade-content');
    if (!layer || !canvas || !wall) return null;
    const layerRect = layer.getBoundingClientRect();
    const wallRect = wall.getBoundingClientRect();
    const deviceDpr = window.devicePixelRatio || 1;
    const configuredMaxDpr = Number(layer.getAttribute('data-max-dpr')) || deviceDpr;
    const dpr = Math.max(0.75, Math.min(2.5, configuredMaxDpr, deviceDpr));
    const layerStyle = window.getComputedStyle(layer);
    const fadeStyle = fade ? window.getComputedStyle(fade) : null;
    const actualDpr = canvas.width / Math.max(1, layerRect.width);
    return {
      dpr,
      actualDpr,
      ready: layer.getAttribute('data-ready'),
      siteScope: layer.getAttribute('data-site-scope'),
      blendMode: layer.getAttribute('data-blend-mode'),
      canvasBlendMode: window.getComputedStyle(canvas).mixBlendMode,
      targetFps: Number(layer.getAttribute('data-target-fps')),
      maxDpr: Number(layer.getAttribute('data-max-dpr')),
      adaptiveDensity: layer.getAttribute('data-adaptive-density'),
      pauseWhenHidden: layer.getAttribute('data-pause-when-hidden'),
      layerRect: {
        top: layerRect.top,
        right: layerRect.right,
        bottom: layerRect.bottom,
        left: layerRect.left,
        width: layerRect.width,
        height: layerRect.height,
      },
      wallRect: {
        top: wallRect.top,
        right: wallRect.right,
        bottom: wallRect.bottom,
        left: wallRect.left,
        width: wallRect.width,
        height: wallRect.height,
      },
      canvasWidth: canvas.width,
      canvasHeight: canvas.height,
      expectedWidth: Math.round(layerRect.width * dpr),
      expectedHeight: Math.round(layerRect.height * dpr),
      pointerEvents: layerStyle.pointerEvents,
      zIndex: Number.parseInt(layerStyle.zIndex || '0', 10),
      fadeZIndex: Number.parseInt(fadeStyle?.zIndex || '0', 10),
    };
  });
  const overlayStats = await sampleCanvasStats(page, 'rain-prism-site-overlay');

  return {
    geometry,
    overlayStats,
  };
}

async function inspectSiteLayerDarkMode(page) {
  await page.evaluate(() => {
    if (document.documentElement.classList.contains('dark-mode') || document.body.classList.contains('dark-mode')) {
      return;
    }
    const themeToggle = document.getElementById('site-year');
    if (themeToggle) {
      themeToggle.click();
      return;
    }
    document.documentElement.classList.add('dark-mode');
    document.body.classList.add('dark-mode');
    document.dispatchEvent(new CustomEvent('abs:theme-change'));
    window.dispatchEvent(new CustomEvent('abs:theme-changed'));
  });
  await page.waitForTimeout(500);
  const geometry = await page.evaluate(() => {
    const layer = document.querySelector('.rain-prism-site-layer');
    const canvas = document.getElementById('rain-prism-site-overlay');
    if (!layer || !canvas) return null;
    return {
      blendMode: layer.getAttribute('data-blend-mode'),
      canvasBlendMode: window.getComputedStyle(canvas).mixBlendMode,
      htmlDark: document.documentElement.classList.contains('dark-mode'),
      bodyDark: document.body.classList.contains('dark-mode'),
    };
  });
  const overlayStats = await sampleCanvasStats(page, 'rain-prism-site-overlay');
  return {
    geometry,
    overlayStats,
  };
}

async function hasSiteLayerOnRoute(page, origin, pathname) {
  await page.goto(`${origin}${pathname}`, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#abs-scene', { timeout: WAIT_MS });
  await page.waitForTimeout(250);
  return page.evaluate(() => Boolean(document.querySelector('.rain-prism-site-layer')));
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const staticHost = process.env.ABS_DEV_URL ? null : await startStaticServer();
  if (staticHost) {
    auditOrigin = staticHost.origin;
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });

  try {
    await waitForRainPrismReady(page);
    const dimensions = await getCanvasDimensions(page);
    assert(dimensions, 'Rain prism canvases were not found');
    for (const mode of ['light', 'dark']) {
      const modeDimensions = dimensions.modes[mode];
      assert(modeDimensions, `Missing ${mode} canvas dimensions`);
      assert(
        Math.abs(modeDimensions.actualDpr - modeDimensions.expectedDpr) <= 0.03,
        `${mode} canvas DPR ${modeDimensions.actualDpr} does not match configured DPR cap ${modeDimensions.expectedDpr}`
      );
      assert(
        Math.abs(modeDimensions.baseWidth - modeDimensions.expectedWidth) <= 2,
        `${mode} base canvas backing width does not match CSS width x DPR`
      );
      assert(
        Math.abs(modeDimensions.baseHeight - modeDimensions.expectedHeight) <= 2,
        `${mode} base canvas backing height does not match CSS height x DPR`
      );
      assert(modeDimensions.overlayWidth === modeDimensions.baseWidth, `${mode} overlay canvas width does not match base canvas`);
      assert(modeDimensions.overlayHeight === modeDimensions.baseHeight, `${mode} overlay canvas height does not match base canvas`);
    }

    await setRainPrismConfig(page, {
      enabled: true,
      theme: 'dark',
      blendMode: 'auto',
      siteBlendMode: 'auto',
      siteScope: 'home',
      dropDensity: 6400,
      pixelSize: 1,
      pixelAlpha: 0.26,
      spectrumBoost: 3.25,
      displayColor: 0.81,
      displayContrast: 1.63,
      lightBoost: 4.1,
      darkBoost: 2.65,
      redStrength: 1.1,
      greenStrength: 1.1,
      blueStrength: 1.05,
      motion: 3,
      cycleSpread: 1.22,
      phaseJitter: 1.18,
      targetFps: 30,
      maxDpr: 1.5,
      pauseWhenHidden: true,
      adaptiveDensity: true,
    });
    const lightOverlayStats = await sampleCanvasStats(page, 'rain-prism-overlay-light');
    const darkOverlayStats = await sampleCanvasStats(page, 'rain-prism-overlay-dark');
    assert(
      lightOverlayStats?.alphaHitRatio > 0.00045 && lightOverlayStats?.alphaMean > 0.01,
      `Light overlay canvas appears blank: alpha hit ratio ${lightOverlayStats?.alphaHitRatio}, alpha mean ${lightOverlayStats?.alphaMean}`
    );
    assert(
      darkOverlayStats?.alphaHitRatio > 0.00045 && darkOverlayStats?.alphaMean > 0.01,
      `Dark overlay canvas appears blank: alpha hit ratio ${darkOverlayStats?.alphaHitRatio}, alpha mean ${darkOverlayStats?.alphaMean}`
    );
    await page.screenshot({ path: resolve(outputRoot, 'rain-prism-default.png'), fullPage: true });
    await storeCanvasSnapshot(page, 'rain-prism-overlay-light', '__ABS_RAIN_PRISM_TIME_A__');
    await page.waitForTimeout(1200);
    const timeDiff = await compareCanvasSnapshot(page, 'rain-prism-overlay-light', '__ABS_RAIN_PRISM_TIME_A__');
    assert(
      timeDiff?.rgbDiffMean > 5,
      `RGB pixels did not smoothly change color over time: rgb diff ${timeDiff?.rgbDiffMean}`
    );

    const lightBaseStats = await sampleCanvasStats(page, 'rain-prism-base-light');
    await page.screenshot({ path: resolve(outputRoot, 'rain-prism-light.png'), fullPage: true });
    const darkBaseStats = await sampleCanvasStats(page, 'rain-prism-base-dark');
    assert(
      Math.abs((lightBaseStats?.lumaMean || 0) - (darkBaseStats?.lumaMean || 0)) > 35,
      'Split light/dark halves did not measurably change the base canvas color'
    );
    assert(
      (lightBaseStats?.chromaMean || 0) < 0.1 && (darkBaseStats?.chromaMean || 0) < 0.1,
      `Base canvas should not contain colored striping: light chroma ${lightBaseStats?.chromaMean}, dark chroma ${darkBaseStats?.chromaMean}`
    );
    assert(
      (lightOverlayStats?.chromaEnergyMean || 0) > (darkOverlayStats?.chromaEnergyMean || 0) * 1.2,
      `Light theme gain did not make the RGB pixels more visible: dark ${darkOverlayStats?.chromaEnergyMean}, light ${lightOverlayStats?.chromaEnergyMean}`
    );

    await setRainPrismConfig(page, {
      enabled: true,
      theme: 'dark',
      blendMode: 'screen',
      siteBlendMode: 'auto',
      siteScope: 'home',
      dropDensity: 8000,
      pixelSize: 2,
      pixelAlpha: 2,
      spectrumBoost: 4.5,
      displayColor: 1.2,
      displayContrast: 2.2,
      lightBoost: 4.5,
      darkBoost: 1.8,
      redStrength: 1.6,
      greenStrength: 1.6,
      blueStrength: 1.6,
      motion: 0.8,
      cycleSpread: 1.8,
      phaseJitter: 1.5,
      targetFps: 60,
      maxDpr: 2,
      pauseWhenHidden: true,
      adaptiveDensity: true,
    });
    const boostedOverlayStats = await sampleCanvasStats(page, 'rain-prism-overlay-light');
    assert(
      (boostedOverlayStats?.chromaEnergyMean || 0) > (lightOverlayStats?.chromaEnergyMean || 0) * 1.6,
      `High brightness did not increase RGB pixel chroma energy: baseline ${lightOverlayStats?.chromaEnergyMean}, boosted ${boostedOverlayStats?.chromaEnergyMean}`
    );
    await page.screenshot({ path: resolve(outputRoot, 'rain-prism-high-spectrum.png'), fullPage: true });

    let siteLayerStats = null;
    let darkSiteLayerStats = null;
    let styleguideLayerExists = null;
    if (staticHost) {
      siteLayerStats = await inspectSiteLayer(page, staticHost.origin);
      const geometry = siteLayerStats.geometry;
      assert(geometry, 'Rain prism site layer was not found on the built home page');
      assert(geometry.ready === 'true', 'Rain prism site layer did not finish loading config');
      assert(geometry.siteScope === 'home', `Site layer should default to the home route only: ${geometry.siteScope}`);
      assert(geometry.blendMode === 'auto', `Site layer should use auto compositing so dark mode can switch to screen: ${geometry.blendMode}`);
      assert(geometry.canvasBlendMode === 'normal', `Light site layer should compute to normal compositing: ${geometry.canvasBlendMode}`);
      assert(geometry.targetFps === 30, `Site layer target FPS should be capped at 30: ${geometry.targetFps}`);
      assert(geometry.maxDpr === 1.5, `Site layer DPR should be capped at 1.5: ${geometry.maxDpr}`);
      assert(geometry.adaptiveDensity === 'true', 'Site layer adaptive density should be enabled');
      assert(geometry.pauseWhenHidden === 'true', 'Site layer hidden-tab pause should be enabled');
      assert(Math.abs(geometry.actualDpr - geometry.dpr) <= 0.03, `Site overlay DPR ${geometry.actualDpr} does not match configured cap ${geometry.dpr}`);
      assert(Math.abs(geometry.canvasWidth - geometry.expectedWidth) <= 2, 'Site overlay canvas backing width does not match layer width x DPR');
      assert(Math.abs(geometry.canvasHeight - geometry.expectedHeight) <= 2, 'Site overlay canvas backing height does not match layer height x DPR');
      assert(geometry.pointerEvents === 'none', 'Site overlay must not intercept pointer input');
      assert(geometry.zIndex > geometry.fadeZIndex, `Site overlay should stack above .fade-content: layer ${geometry.zIndex}, fade ${geometry.fadeZIndex}`);
      assert(geometry.layerRect.left >= geometry.wallRect.left - 1, 'Site overlay escapes the left wall bound');
      assert(geometry.layerRect.right <= geometry.wallRect.right + 1, 'Site overlay escapes the right wall bound');
      assert(geometry.layerRect.top >= geometry.wallRect.top - 1, 'Site overlay escapes the top wall bound');
      assert(geometry.layerRect.bottom <= geometry.wallRect.bottom + 1, 'Site overlay escapes the bottom wall bound');
      assert(
        siteLayerStats.overlayStats?.alphaHitRatio > 0.00045 && siteLayerStats.overlayStats?.alphaMean > 0.005,
        `Site overlay appears blank: alpha hit ratio ${siteLayerStats.overlayStats?.alphaHitRatio}, alpha mean ${siteLayerStats.overlayStats?.alphaMean}`
      );
      await page.screenshot({ path: resolve(outputRoot, 'rain-prism-site-layer.png'), fullPage: true });
      darkSiteLayerStats = await inspectSiteLayerDarkMode(page);
      assert(darkSiteLayerStats.geometry?.htmlDark && darkSiteLayerStats.geometry?.bodyDark, 'Dark mode was not applied for the site layer check');
      assert(darkSiteLayerStats.geometry?.canvasBlendMode === 'screen', `Dark site layer should compute to screen compositing: ${darkSiteLayerStats.geometry?.canvasBlendMode}`);
      assert(
        darkSiteLayerStats.overlayStats?.alphaHitRatio > 0.00045 && darkSiteLayerStats.overlayStats?.alphaMean > 0.005,
        `Dark site overlay appears blank: alpha hit ratio ${darkSiteLayerStats.overlayStats?.alphaHitRatio}, alpha mean ${darkSiteLayerStats.overlayStats?.alphaMean}`
      );
      await page.screenshot({ path: resolve(outputRoot, 'rain-prism-site-layer-dark.png'), fullPage: true });
      styleguideLayerExists = await hasSiteLayerOnRoute(page, staticHost.origin, '/styleguide.html');
      assert(!styleguideLayerExists, 'Site layer should be route-gated off non-home routes by default');
    }

    const result = {
      ok: true,
      url: resolveRainPrismUrl(),
      dimensions,
      lightOverlayStats,
      darkOverlayStats,
      lightBaseStats,
      darkBaseStats,
      timeDiff,
      boostedOverlayStats,
      siteLayerStats,
      darkSiteLayerStats,
      styleguideLayerExists,
    };
    await page.screenshot({ path: resolve(outputRoot, 'rain-prism-smoke.png'), fullPage: true });
    await writeFile(resolve(outputRoot, 'rain-prism-smoke.json'), `${JSON.stringify(result, null, 2)}\n`, 'utf8');
    console.log('PASS rain prism audit');
  } finally {
    await browser.close();
    if (staticHost) {
      await new Promise((resolveClose) => staticHost.server.close(resolveClose));
    }
  }
}

try {
  await main();
} catch (error) {
  console.error('FAIL rain prism audit');
  console.error(error?.message || error);
  process.exitCode = 1;
}
