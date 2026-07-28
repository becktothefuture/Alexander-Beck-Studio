#!/usr/bin/env node
import { chromium } from 'playwright';

const DEFAULT_ORIGIN = 'http://127.0.0.1:8012';
const WAIT_MS = Number(process.env.ABS_POINTER_TITLE_WAIT_MS || 30000);
const CRISP_GLOW_PATH = '/lab/atmosphere-crisp-glow.html';
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

function resolveCrispGlowUrl(mode = 'bubbles') {
  const raw = String(process.env.ABS_DEV_URL || DEFAULT_ORIGIN).trim().replace(/\/+$/, '');
  const origin = new URL(/\.html$/i.test(raw) ? raw : `${raw}/index.html`).origin;
  const url = new URL(CRISP_GLOW_PATH, origin);
  url.searchParams.set('mode', mode);
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

async function auditCrispGlowTitleDepth(page) {
  await page.goto(resolveCrispGlowUrl(), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForFunction(() => {
    const snap = window.__ABS_ATMOSPHERE_LAB__?.getSnapshot?.();
    return snap?.variant === 'crispGlow' && snap?.titleOwner === 'engine' && snap?.titleVisible === true;
  }, undefined, { timeout: WAIT_MS });

  const simulationModes = await page.$$eval(
    'select[aria-label="Simulation"] option',
    (options) => options.map((option) => option.value),
  );
  const titleResults = [];
  for (const mode of simulationModes) {
    await page.selectOption('select[aria-label="Simulation"]', mode);
    await page.waitForFunction((expectedMode) => {
      const snap = window.__ABS_ATMOSPHERE_LAB__?.getSnapshot?.();
      return snap?.simulationMode === expectedMode
        && snap?.titleOwner === 'engine'
        && snap?.titleVisible === true;
    }, mode, { timeout: WAIT_MS });
    const snap = await page.evaluate(() => window.__ABS_ATMOSPHERE_LAB__.getSnapshot());
    titleResults.push({
      mode,
      titleVisible: snap.titleVisible,
    });
  }

  await page.selectOption('select[aria-label="Simulation"]', 'bubbles');
  await page.waitForFunction(() => {
    const snap = window.__ABS_ATMOSPHERE_LAB__?.getSnapshot?.();
    return snap?.simulationMode === 'bubbles'
      && snap?.rearCount > 0
      && snap?.frontCount > 0
      && snap?.frontShare >= 0.2
      && snap?.frontShare <= 0.48
      && document.getElementById('simulations')?.classList.contains('simulation-depth-title-layer-active');
  }, undefined, { timeout: WAIT_MS });
  const emergence = await page.evaluate(() => {
    const material = document.getElementById('c');
    const front = document.getElementById('simulation-front-depth-canvas');
    return {
      ...window.__ABS_ATMOSPHERE_LAB__.getSnapshot(),
      depthLayerActive: document.getElementById('simulations')?.classList.contains('simulation-depth-title-layer-active'),
      dedicatedTitleCanvasCount: document.querySelectorAll('.simulation-crisp-title-canvas').length,
      experimentalTitleCanvasCount: document.querySelectorAll('.atmosphere-title-canvas').length,
      edgeCanvasCount: document.querySelectorAll('.simulation-atmosphere-edge-light-canvas').length,
      edgeClipCount: document.querySelectorAll('.atmosphere-edge-light-defs clipPath path').length,
      materialZ: Number.parseFloat(getComputedStyle(material).zIndex),
      frontZ: Number.parseFloat(getComputedStyle(front).zIndex),
      materialFilter: getComputedStyle(material).filter,
      frontFilter: getComputedStyle(front).filter,
    };
  });
  if (
    emergence.depthLayerActive !== true
    || emergence.dedicatedTitleCanvasCount !== 0
    || emergence.experimentalTitleCanvasCount !== 0
    || emergence.edgeCanvasCount !== 1
    || emergence.edgeClipCount !== 0
    || !(emergence.materialZ < emergence.frontZ)
    || emergence.materialFilter !== 'none'
    || emergence.frontFilter !== 'none'
    || emergence.edgeWidth <= 0
    || emergence.edgeHeight <= 0
  ) {
    throw new Error(`Crisp + Glow layer contract invalid: ${JSON.stringify(emergence)}`);
  }

  const requiredCompositionControls = [
    'ballPresence',
    'glowAmount',
    'glowRadiusFxPx',
    'colourStrength',
    'glowBlendMode',
    'edgeLight',
    'edgeWidthPx',
    'hazeStrength',
    'grainStrength',
    'titleClearance',
    'titleYOffsetVh',
    'afterglowHalfLifeMs',
    'driftSpeedPxPerSec',
  ];
  const compositionControlIds = await page.$$eval(
    '[data-parameter-id]',
    (controls) => controls.map((control) => control.dataset.parameterId),
  );
  const missingCompositionControls = requiredCompositionControls.filter(
    (id) => !compositionControlIds.includes(id),
  );
  if (missingCompositionControls.length > 0) {
    throw new Error(`Crisp + Glow controls missing: ${missingCompositionControls.join(', ')}`);
  }

  await page.selectOption('select[aria-label="Theme values to edit and preview"]', 'dark');
  await page.waitForFunction(
    () => window.__ABS_ATMOSPHERE_LAB__?.getSnapshot?.().themeMode === 'dark',
    undefined,
    { timeout: WAIT_MS },
  );
  await page.evaluate(() => {
    const values = {
      ballPresence: '0.42',
      hazeStrength: '0.65',
      grainStrength: '0.5',
      edgeWidthPx: '2',
    };
    Object.entries(values).forEach(([id, value]) => {
      const input = document.querySelector(`input[data-parameter-id="${id}"]`);
      input.value = value;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    const blend = document.querySelector('select[data-parameter-id="glowBlendMode"]');
    blend.value = 'screen';
    blend.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const snap = window.__ABS_ATMOSPHERE_LAB__?.getSnapshot?.();
    const rootStyle = getComputedStyle(document.documentElement);
    const material = document.getElementById('c');
    const edge = document.getElementById('simulation-atmosphere-edge-light-canvas');
    return snap?.config?.dark?.ballPresence === 0.42
      && snap?.config?.dark?.hazeStrength === 0.65
      && snap?.config?.dark?.grainStrength === 0.5
      && snap?.config?.dark?.edgeWidthPx === 2
      && snap?.config?.dark?.glowBlendMode === 'screen'
      && getComputedStyle(document.body).getPropertyValue('--atmosphere-core-presence').trim() === '0.42'
      && rootStyle.getPropertyValue('--atmosphere-haze-strength').trim() === '0.65'
      && rootStyle.getPropertyValue('--atmosphere-grain-strength').trim() === '0.5'
      && rootStyle.getPropertyValue('--atmosphere-edge-width').trim() === '2px'
      && getComputedStyle(material).filter === 'none'
      && getComputedStyle(edge).filter === 'none';
  }, undefined, { timeout: WAIT_MS });

  await page.getByRole('button', { name: 'Reset' }).click();

  await page.$eval('input[data-parameter-id="titleYOffsetVh"]', (input) => {
    input.value = '3.25';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const snap = window.__ABS_ATMOSPHERE_LAB__?.getSnapshot?.();
    return snap?.config?.titleYOffsetVh === 3.25
      && getComputedStyle(document.documentElement).getPropertyValue('--atmosphere-title-y-offset').trim() === '3.25vh';
  }, undefined, { timeout: WAIT_MS });
  await page.$eval('input[data-parameter-id="titleYOffsetVh"]', (input) => {
    input.value = '0';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  const themeResults = [];
  for (const theme of ['dark', 'light']) {
    await page.selectOption('select[aria-label="Theme values to edit and preview"]', theme);
    await page.waitForFunction(
      (expectedTheme) => window.__ABS_ATMOSPHERE_LAB__?.getSnapshot?.().themeMode === expectedTheme,
      theme,
      { timeout: WAIT_MS },
    );
    const snap = await page.evaluate(() => window.__ABS_ATMOSPHERE_LAB__.getSnapshot());
    themeResults.push({
      theme,
      edgeLight: snap.config[theme].edgeLight,
    });
  }

  return {
    simulations: titleResults.length,
    emergence: {
      rearCount: emergence.rearCount,
      frontCount: emergence.frontCount,
      frontShare: emergence.frontShare,
      titleOwner: emergence.titleOwner,
    },
    compositionControls: requiredCompositionControls.length,
    themeResults,
  };
}

async function main() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    const mouseSphere = await auditMouseSphere(page);
    const touchSphere = await auditTouchSphere(browser);
    const depthModes = await auditDepthModes(page);
    const noDepthModes = await auditNoDepthModes(page);
    const crispGlow = await auditCrispGlowTitleDepth(page);
    console.log(JSON.stringify({
      ok: true,
      mouseSphere,
      touchSphere,
      depthModes,
      noDepthModes,
      crispGlow,
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
