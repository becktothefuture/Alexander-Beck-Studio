#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const baseUrl = process.env.ABS_DEV_URL || 'http://127.0.0.1:8013';
const targetUrl = new URL(baseUrl);
targetUrl.searchParams.set('focus', 'pit');

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function luma({ r, g, b }) {
  return (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
}

function pixelAt(png, x, y) {
  const px = Math.max(0, Math.min(png.width - 1, Math.round(x)));
  const py = Math.max(0, Math.min(png.height - 1, Math.round(y)));
  const index = (py * png.width + px) * 4;
  return {
    r: png.data[index],
    g: png.data[index + 1],
    b: png.data[index + 2],
    a: png.data[index + 3],
  };
}

async function waitFrames(page, frames = 4) {
  for (let i = 0; i < frames; i += 1) {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
  }
}

async function setVeilOpacity(page, opacity) {
  await page.evaluate((value) => {
    document.documentElement.style.setProperty('--simulation-contrast-veil-opacity', String(value));
  }, opacity);
  await waitFrames(page, 6);
}

async function captureSample(page) {
  const canvasStats = await page.evaluate(() => {
    const canvas = document.getElementById('c');
    if (!canvas) throw new Error('Missing #c canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const { width, height } = canvas;
    const image = ctx.getImageData(0, 0, width, height);
    const data = image.data;
    const edgeBandX = width * 0.32;
    const edgeBandY = height * 0.32;
    let lumaSum = 0;
    let saturationSum = 0;
    let count = 0;

    for (let y = 0; y < height; y += 3) {
      for (let x = 0; x < width; x += 3) {
        const index = (y * width + x) * 4;
        const a = data[index + 3];
        if (a <= 4) continue;

        if (x > edgeBandX && x < width - edgeBandX && y > edgeBandY && y < height - edgeBandY) {
          continue;
        }

        const r = data[index];
        const g = data[index + 1];
        const b = data[index + 2];
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        const saturation = max - min;
        if (a < 120 || saturation < 26 || max < 80) continue;
        lumaSum += (0.2126 * r) + (0.7152 * g) + (0.0722 * b);
        saturationSum += saturation;
        count += 1;
      }
    }

    const rect = canvas.getBoundingClientRect();
    return {
      canvasWidth: width,
      canvasHeight: height,
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      ball: {
        count,
        luma: count > 0 ? lumaSum / count : 0,
        saturation: count > 0 ? saturationSum / count : 0,
      },
    };
  });

  return { canvasStats };
}

async function captureWallOnlySample(page, opacity) {
  await page.evaluate(() => {
    document.querySelectorAll('#c, .simulation-front-depth-canvas, .fade-content, .noise').forEach((element) => {
      element.dataset.absAuditPreviousVisibility = element.style.visibility || '';
      element.style.visibility = 'hidden';
    });
  });
  await setVeilOpacity(page, opacity);
  const point = await page.evaluate(() => {
    const wall = document.getElementById('simulations');
    const rect = wall.getBoundingClientRect();
    return {
      x: rect.left + (rect.width * 0.18),
      y: rect.top + (rect.height * 0.5),
    };
  });
  const screenshot = PNG.sync.read(await page.screenshot({ fullPage: false }));
  return { point, pixel: pixelAt(screenshot, point.x, point.y) };
}

async function restoreWallOnlyHiddenElements(page) {
  await page.evaluate(() => {
    document.querySelectorAll('[data-abs-audit-previous-visibility]').forEach((element) => {
      element.style.visibility = element.dataset.absAuditPreviousVisibility || '';
      delete element.dataset.absAuditPreviousVisibility;
    });
  });
  await waitFrames(page, 6);
}

async function run() {
  const enginePath = path.join(repoRoot, 'react-app/app/src/legacy/modules/physics/engine.js');
  const depthWashPath = path.join(repoRoot, 'react-app/app/src/legacy/modules/visual/depth-wash.js');
  const wallPlatePath = path.join(repoRoot, 'react-app/app/src/legacy/modules/visual/wall-shadow-plate.js');
  const engineSource = fs.readFileSync(enginePath, 'utf8');
  assert(!fs.existsSync(depthWashPath), 'depth-wash.js should be removed');
  assert(!fs.existsSync(wallPlatePath), 'wall-shadow-plate.js should be removed');
  assert(!engineSource.includes('drawDepthWash'), 'engine.js still references drawDepthWash');

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      console.error(`[browser:${message.type()}] ${message.text()}`);
    }
  });
  await page.addInitScript(() => {
    try {
      localStorage.setItem('theme-preference-v2', 'light');
      localStorage.removeItem('theme-preference');
    } catch {}
  });

  await page.goto(targetUrl.toString(), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#c');
  await page.waitForFunction(() => {
    const canvas = document.getElementById('c');
    return Boolean(canvas && canvas.width > 0 && canvas.height > 0);
  });
  await waitFrames(page, 12);

  const visualLayers = await page.evaluate(() => {
    const frame = document.querySelector('.frame-vignette');
    const veil = document.querySelector('.simulation-contrast-veil');
    const frameStyles = frame ? getComputedStyle(frame) : null;
    const veilBefore = veil ? getComputedStyle(veil, '::before') : null;
    const veilAfter = veil ? getComputedStyle(veil, '::after') : null;
    return {
      bodyHasPlateReady: document.body.classList.contains('wall-shadow-plate-ready'),
      frameBackgroundImage: frameStyles?.backgroundImage || '',
      frameBoxShadow: frameStyles?.boxShadow || '',
      veilBeforeContent: veilBefore?.content || '',
      veilAfterContent: veilAfter?.content || '',
    };
  });
  assert(!visualLayers.bodyHasPlateReady, 'body.wall-shadow-plate-ready should be absent');
  assert(visualLayers.frameBackgroundImage === 'none', `.frame-vignette background-image should be none, got ${visualLayers.frameBackgroundImage}`);
  assert(visualLayers.frameBoxShadow === 'none', `.frame-vignette box-shadow should be none, got ${visualLayers.frameBoxShadow}`);
  assert(visualLayers.veilBeforeContent === 'none', `.simulation-contrast-veil::before should not paint, got ${visualLayers.veilBeforeContent}`);
  assert(visualLayers.veilAfterContent === 'none', `.simulation-contrast-veil::after should not paint, got ${visualLayers.veilAfterContent}`);

  const beforeWall = await captureWallOnlySample(page, 0);
  const afterWall = await captureWallOnlySample(page, 0.55);
  const wallLumaDelta = Math.abs(luma(afterWall.pixel) - luma(beforeWall.pixel));
  assert(wallLumaDelta <= 1, `Wall luma changed by ${wallLumaDelta.toFixed(2)} at ${Math.round(beforeWall.point.x)},${Math.round(beforeWall.point.y)}`);
  await restoreWallOnlyHiddenElements(page);

  await setVeilOpacity(page, 0);
  const before = await captureSample(page);
  await setVeilOpacity(page, 0.55);
  const after = await captureSample(page);

  assert(before.canvasStats.ball.count > 24, `Not enough edge ball pixels before opacity change (${before.canvasStats.ball.count})`);
  assert(after.canvasStats.ball.count > 24, `Not enough edge ball pixels after opacity change (${after.canvasStats.ball.count})`);

  const ballLumaDelta = Math.abs(after.canvasStats.ball.luma - before.canvasStats.ball.luma);
  const ballSaturationDelta = Math.abs(after.canvasStats.ball.saturation - before.canvasStats.ball.saturation);
  assert(
    ballLumaDelta + ballSaturationDelta > 3,
    `Ball pixels did not change enough (luma delta ${ballLumaDelta.toFixed(2)}, saturation delta ${ballSaturationDelta.toFixed(2)})`
  );

  await browser.close();
  console.log(`PASS ball contrast veil audit: ball delta=${(ballLumaDelta + ballSaturationDelta).toFixed(2)}, wall luma delta=${wallLumaDelta.toFixed(2)}`);
}

run().catch((error) => {
  console.error(`FAIL ball contrast veil audit: ${error.message}`);
  process.exit(1);
});
