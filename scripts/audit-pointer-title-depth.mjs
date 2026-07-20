#!/usr/bin/env node
import { chromium } from 'playwright';

const DEFAULT_ORIGIN = 'http://127.0.0.1:8012';
const WAIT_MS = Number(process.env.ABS_POINTER_TITLE_WAIT_MS || 30000);
// This audit verifies the legacy home #c canvas contract. Keep these fixtures
// to current daily home-mode entries; collection modes can route to the daily
// shell and intentionally do not provide #c on direct startup.
const DEPTH_MODES = ['3d-sphere', '3d-cube'];
const NO_DEPTH_MODES = ['pit', 'water', 'flies'];

function resolveModeUrl(mode) {
  const raw = String(process.env.ABS_DEV_URL || DEFAULT_ORIGIN).trim().replace(/\/+$/, '');
  const url = new URL(/\.html$/i.test(raw) ? raw : `${raw}/index.html`);
  url.searchParams.set('mode', mode);
  url.searchParams.set('absAudit', '1');
  return url.toString();
}

async function waitForAudit(page, mode) {
  await page.waitForFunction(
    (expectedMode) => {
      const audit = window.__ABS_HOME_AUDIT__;
      if (!audit || typeof audit.getRuntimeSnapshot !== 'function') return false;
      const snap = audit.getRuntimeSnapshot();
      return snap?.mode === expectedMode;
    },
    mode,
    { timeout: WAIT_MS }
  );
}

async function snapshot(page) {
  return page.evaluate(() => window.__ABS_HOME_AUDIT__.getRuntimeSnapshot());
}

function matrixDistance(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  let total = 0;
  for (let i = 0; i < a.length; i += 1) {
    total += Math.abs((a[i] || 0) - (b[i] || 0));
  }
  return total;
}

async function gotoMode(page, mode) {
  await page.goto(resolveModeUrl(mode), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#c', { state: 'attached', timeout: WAIT_MS });
  await page.waitForFunction(() => window.__pointerReady === true, { timeout: WAIT_MS });
  await waitForAudit(page, mode);
}

async function canvasClientPoint(page, xRatio = 0.5, yRatio = 0.5) {
  return page.$eval('#c', (canvas, ratios) => {
    const rect = canvas.getBoundingClientRect();
    return {
      x: rect.left + rect.width * ratios.xRatio,
      y: rect.top + rect.height * ratios.yRatio
    };
  }, { xRatio, yRatio });
}

async function auditMouseSphere(page) {
  await gotoMode(page, '3d-sphere');
  await page.evaluate(() => {
    window.__ABS_HOME_AUDIT__.getGlobals().sphere3dIdleSpeed = 0;
  });
  const start = await snapshot(page);
  const p1 = await canvasClientPoint(page, 0.5, 0.5);
  const p2 = await canvasClientPoint(page, 0.58, 0.54);
  await page.mouse.move(p1.x, p1.y);
  await page.mouse.down();
  await page.mouse.move(p2.x, p2.y, { steps: 4 });
  await page.mouse.up();
  await page.waitForFunction(
    (initialSequence) => window.__ABS_HOME_AUDIT__.getRuntimeSnapshot().pointerSequence > initialSequence,
    start.pointerSequence || 0,
    { timeout: WAIT_MS }
  );
  await page.waitForTimeout(120);
  const end = await snapshot(page);
  const rotationDelta = matrixDistance(start.sphereRotationMatrix, end.sphereRotationMatrix);
  if (rotationDelta <= 0.0001) {
    throw new Error(`3d-sphere mouse drag did not change rotation matrix enough (${rotationDelta})`);
  }
  if (end.pointerType !== 'mouse' || end.pointerInCanvas !== true) {
    throw new Error(`3d-sphere mouse pointer state invalid: ${JSON.stringify(end)}`);
  }
  return { rotationDelta, pointerSequence: end.pointerSequence };
}

async function auditTouchSphere(browser) {
  const page = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true
  });
  await gotoMode(page, '3d-sphere');
  await page.evaluate(() => {
    window.__ABS_HOME_AUDIT__.getGlobals().sphere3dIdleSpeed = 0;
  });
  const start = await snapshot(page);
  const p1 = await canvasClientPoint(page, 0.42, 0.50);
  const p2 = await canvasClientPoint(page, 0.58, 0.54);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchStart',
    touchPoints: [{ x: p1.x, y: p1.y, id: 11 }]
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchMove',
    touchPoints: [{ x: p2.x, y: p2.y, id: 11 }]
  });
  await cdp.send('Input.dispatchTouchEvent', {
    type: 'touchEnd',
    touchPoints: []
  });
  await cdp.detach();
  await page.waitForFunction(
    (initialSequence) => window.__ABS_HOME_AUDIT__.getRuntimeSnapshot().pointerSequence > initialSequence,
    start.pointerSequence || 0,
    { timeout: WAIT_MS }
  );
  await page.waitForTimeout(120);
  const end = await snapshot(page);
  const rotationDelta = matrixDistance(start.sphereRotationMatrix, end.sphereRotationMatrix);
  await page.close();
  if (rotationDelta <= 0.0001) {
    throw new Error(`3d-sphere touch drag did not change rotation matrix enough (${rotationDelta})`);
  }
  if (end.pointerType !== 'touch') {
    throw new Error(`3d-sphere touch pointer type invalid: ${JSON.stringify(end)}`);
  }
  return { rotationDelta, pointerSequence: end.pointerSequence };
}

async function auditDepthModes(page) {
  const results = [];
  for (const mode of DEPTH_MODES) {
    await gotoMode(page, mode);
    await page.waitForFunction(() => {
      const snap = window.__ABS_HOME_AUDIT__.getRuntimeSnapshot();
      return snap.depthTitleLayerActive === true &&
        snap.frontDepthCanvasActive === true &&
        snap.canvasTitleActive === true &&
        snap.canvasTitleVisible === true &&
        snap.canvasTitleLineCount >= 3 &&
        snap.behindTitleCount > 0 &&
        snap.inFrontOfTitleCount > 0;
    }, { timeout: WAIT_MS });
    const snap = await snapshot(page);
    results.push({
      mode,
      behindTitleCount: snap.behindTitleCount,
      inFrontOfTitleCount: snap.inFrontOfTitleCount,
      canvasTitleLineCount: snap.canvasTitleLineCount
    });
  }
  return results;
}

async function auditNoDepthModes(page) {
  const results = [];
  for (const mode of NO_DEPTH_MODES) {
    await gotoMode(page, mode);
    await page.waitForFunction(() => {
      const snap = window.__ABS_HOME_AUDIT__.getRuntimeSnapshot();
      return snap.depthTitleLayerActive === false &&
        snap.frontDepthCanvasActive !== true &&
        snap.canvasTitleActive === true &&
        snap.canvasTitleVisible === true &&
        snap.canvasTitleLineCount >= 3;
    }, { timeout: WAIT_MS });
    const snap = await snapshot(page);
    results.push({
      mode,
      depthTitleLayerActive: snap.depthTitleLayerActive,
      canvasTitleLineCount: snap.canvasTitleLineCount
    });
  }
  return results;
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    const mouseSphere = await auditMouseSphere(page);
    const touchSphere = await auditTouchSphere(browser);
    const depthModes = await auditDepthModes(page);
    const noDepthModes = await auditNoDepthModes(page);
    console.log(JSON.stringify({
      ok: true,
      mouseSphere,
      touchSphere,
      depthModes,
      noDepthModes
    }, null, 2));
  } finally {
    await page.close().catch(() => {});
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
