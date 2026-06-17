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
      renderMode: 'sparse',
      dropDensity: 3600,
      pixelSize: 1,
      pixelAlpha: 0.32,
      spectrumBoost: 3.6,
      displayColor: 0.81,
      displayContrast: 1.63,
      lightBoost: 4.1,
      darkBoost: 2.8,
      redStrength: 1.1,
      greenStrength: 1.1,
      blueStrength: 1.05,
      motion: 2.4,
      cycleSpread: 1.22,
      phaseJitter: 1.18,
      targetFps: 10,
      updateFraction: 0.18,
      maxDpr: 1,
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
      timeDiff?.rgbDiffMean > 3,
      `RGB pixels did not smoothly change color over time: rgb diff ${timeDiff?.rgbDiffMean}`
    );
    const sparseMetrics = await page.evaluate(() => window.__ABS_RAIN_PRISM__?.getMetrics?.());
    assert(
      sparseMetrics?.light?.renderMode === 'sparse' && sparseMetrics?.dark?.renderMode === 'sparse',
      `Expected sparse renderer mode, got ${JSON.stringify(sparseMetrics)}`
    );
    assert(
      sparseMetrics.light.lastDrawCount > 0
        && sparseMetrics.light.lastDrawCount <= Math.ceil(sparseMetrics.light.pixelCount * 0.22),
      `Sparse light renderer redrew too many pixels: ${sparseMetrics.light.lastDrawCount} of ${sparseMetrics.light.pixelCount}`
    );
    assert(
      sparseMetrics.dark.lastDrawCount > 0
        && sparseMetrics.dark.lastDrawCount <= Math.ceil(sparseMetrics.dark.pixelCount * 0.22),
      `Sparse dark renderer redrew too many pixels: ${sparseMetrics.dark.lastDrawCount} of ${sparseMetrics.dark.pixelCount}`
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
      renderMode: 'animated',
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
      updateFraction: 1,
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

    let homeLayerExists = null;
    let styleguideLayerExists = null;
    if (staticHost) {
      homeLayerExists = await hasSiteLayerOnRoute(page, staticHost.origin, '/index.html');
      assert(!homeLayerExists, 'Rain prism site layer should not exist on the built home page');
      styleguideLayerExists = await hasSiteLayerOnRoute(page, staticHost.origin, '/styleguide.html');
      assert(!styleguideLayerExists, 'Rain prism site layer should not exist on non-lab routes');
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
      sparseMetrics,
      homeLayerExists,
      styleguideLayerExists,
    };
    await waitForRainPrismReady(page);
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
