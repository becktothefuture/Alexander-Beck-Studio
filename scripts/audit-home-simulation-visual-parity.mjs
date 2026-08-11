#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import sharp from 'sharp';

const BASELINE_URL = String(process.env.ABS_PARITY_BASE_URL || '').replace(/\/+$/, '');
const CURRENT_URL = String(process.env.ABS_PARITY_CURRENT_URL || 'http://localhost:8012').replace(/\/+$/, '');
const OUTPUT_ROOT = resolve(
  process.env.ABS_PARITY_OUTPUT || 'output/playwright/home-simulation-visual-parity',
);
const MODES = String(
  process.env.ABS_PARITY_MODES
    || 'pit,flies,3d-cube,water,3d-sphere,flubber-blob,elastic-center,kaleidoscope-3,magnetic,weightless,critters,starfield-3d,kaleidoscope-rift,pressure-crucible,particle-fountain,particle-fountain-b',
).split(',').map((value) => value.trim()).filter(Boolean);
const PROFILE_NAMES = String(process.env.ABS_PARITY_PROFILES || 'desktop,mobile')
  .split(',').map((value) => value.trim()).filter(Boolean);
const BROWSER_NAMES = String(process.env.ABS_PARITY_BROWSERS || 'chromium,webkit')
  .split(',').map((value) => value.trim()).filter(Boolean);
const DURATION_SECONDS = Math.max(0.25, Number(process.env.ABS_PARITY_DURATION_SECONDS || 3));
const RANDOM_SEED = Math.max(1, Number(process.env.ABS_PARITY_SEED || 20260811) >>> 0);
const CURRENT_SIXTY_HZ_MODES = new Set([
  'flies',
  'weightless',
  'water',
  'magnetic',
  'elastic-center',
]);
const CANVAS_CHANGED_PIXEL_RATIO_MAX = 0.18;
const CANVAS_MEAN_CHANNEL_DIFFERENCE_MAX = 0.045;
const SCENE_CHANGED_PIXEL_RATIO_MAX = 0.2;
const SCENE_MEAN_CHANNEL_DIFFERENCE_MAX = 0.04;

const PROFILES = Object.freeze({
  desktop: Object.freeze({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 }),
  mobile: Object.freeze({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }),
});

if (!BASELINE_URL) throw new Error('ABS_PARITY_BASE_URL is required.');

function round(value, digits = 6) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : null;
}

function safeSlug(value) {
  return value.replace(/[^a-z0-9-]+/gi, '-').toLowerCase();
}

function resolveStepHz(label, profileName, mode) {
  if (profileName === 'mobile') return 60;
  if (label === 'current' && CURRENT_SIXTY_HZ_MODES.has(mode)) return 60;
  return 120;
}

async function preparePage(page, origin, mode, stepHz) {
  await page.addInitScript((seed) => {
    window.__ABS_RESET_PARITY_RANDOM__ = (nextSeed = seed) => {
      let state = nextSeed >>> 0;
      Math.random = () => {
        state = (Math.imul(1664525, state) + 1013904223) >>> 0;
        return state / 4294967296;
      };
    };
    window.__ABS_RESET_PARITY_RANDOM__(seed);
  }, RANDOM_SEED);
  await page.goto(`${origin}/index.html?mode=${encodeURIComponent(mode)}&absAudit=1`, {
    // The Home shell owns long-lived development connections. Its explicit
    // audit bridge is the readiness contract; network-idle is not.
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  });
  await page.waitForFunction(() => (
    document.documentElement.dataset.absHomeSimulationReady === 'true'
      && typeof window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot === 'function'
      && !document.getElementById('abs-boot-overlay')
      && document.documentElement.dataset.absBootState !== 'booting'
      && Number(window.__ABS_SIMULATION_VISUAL_TRANSITION__?.maxScale || 0) >= 0.999
  ), undefined, { timeout: 30_000, polling: 'raf' });
  return page.evaluate(async ({ expectedMode, seed, durationSeconds, physicsStepHz }) => {
    const audit = window.__ABS_HOME_AUDIT__;
    audit.stopMainLoop();
    window.__ABS_RESET_PARITY_RANDOM__(seed);
    const controller = await import('/src/legacy/modules/modes/mode-controller.js');
    const engine = await import('/src/legacy/modules/physics/engine.js');
    const visualTransition = await import('/src/lib/simulationVisualTransition.js');
    visualTransition.setInitialSimulationVisualScale(1);
    // Imports may initialize unrelated visual modules that also use
    // Math.random(). Seed at the mode-reset boundary so both revisions start
    // the simulation from the same random sequence.
    window.__ABS_RESET_PARITY_RANDOM__(seed);
    if (audit.getGlobals().currentMode === expectedMode) await controller.resetCurrentMode();
    else await controller.setMode(expectedMode);
    visualTransition.setInitialSimulationVisualScale(1);
    audit.stopMainLoop();
    const globals = audit.getGlobals();
    if (globals.currentMode !== expectedMode) {
      throw new Error(`Expected ${expectedMode}; received ${globals.currentMode}`);
    }
    const stepCount = Math.round(durationSeconds * physicsStepHz);
    for (let index = 0; index < stepCount; index += 1) {
      engine.updatePhysics(1 / physicsStepHz, controller.getForceApplicator());
    }
    engine.render();
    // Starfield owns its time integration inside its custom renderer rather
    // than updatePhysics(). Give that surface one bounded visual-time sample
    // so the parity proof cannot pass on a transparent first frame.
    if (expectedMode === 'starfield-3d') {
      await new Promise((resolveDelay) => window.setTimeout(resolveDelay, 120));
      engine.render();
    }
    const balls = globals.balls.filter((ball) => ball && ball.__portfolioHidden !== true);
    let left = Number.POSITIVE_INFINITY;
    let top = Number.POSITIVE_INFINITY;
    let right = Number.NEGATIVE_INFINITY;
    let bottom = Number.NEGATIVE_INFINITY;
    let sumX = 0;
    let sumY = 0;
    let sumRadius = 0;
    let sumSpeed = 0;
    let rearCount = 0;
    let frontCount = 0;
    const colours = {};
    for (const ball of balls) {
      const radius = ball.getDisplayRadius?.() ?? ball.r ?? 0;
      left = Math.min(left, ball.x - radius);
      top = Math.min(top, ball.y - radius);
      right = Math.max(right, ball.x + radius);
      bottom = Math.max(bottom, ball.y + radius);
      sumX += ball.x;
      sumY += ball.y;
      sumRadius += radius;
      sumSpeed += Math.hypot(ball.vx || 0, ball.vy || 0);
      colours[ball.color] = (colours[ball.color] || 0) + 1;
      if (Number.isFinite(ball.z)) {
        if (ball.z < 0.5) rearCount += 1;
        else frontCount += 1;
      }
    }
    const count = Math.max(1, balls.length);
    return {
      mode: globals.currentMode,
      physicsStepHz,
      stepCount,
      ballCount: balls.length,
      canvas: { width: globals.canvas.width, height: globals.canvas.height },
      dpr: globals.DPR || 1,
      centroid: {
        x: sumX / count / globals.canvas.width,
        y: sumY / count / globals.canvas.height,
      },
      bounds: {
        left: left / globals.canvas.width,
        top: top / globals.canvas.height,
        right: right / globals.canvas.width,
        bottom: bottom / globals.canvas.height,
      },
      meanRadiusCssPx: sumRadius / count / (globals.DPR || 1),
      meanSpeedCssPxPerSecond: sumSpeed / count / (globals.DPR || 1),
      depth: { rearCount, frontCount },
      colours,
      sphereRotationMatrix: globals.sphere3dState?.rotationMatrix
        ? [...globals.sphere3dState.rotationMatrix]
        : null,
      cubeRotation: globals.cube3dState
        ? {
          x: globals.cube3dState.rotX,
          y: globals.cube3dState.rotY,
          z: globals.cube3dState.rotZ,
        }
        : null,
      flubberMetrics: window.__ABS_FLUBBER_BLOB_AUDIT__?.getMetrics?.() || null,
    };
  }, {
    expectedMode: mode,
    seed: RANDOM_SEED,
    durationSeconds: DURATION_SECONDS,
    physicsStepHz: stepHz,
  });
}

async function readPixelDifference(leftPath, rightPath) {
  const left = await sharp(leftPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const right = await sharp(rightPath).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (left.info.width !== right.info.width || left.info.height !== right.info.height) {
    return { comparable: false, left: left.info, right: right.info };
  }
  let changed = 0;
  let absoluteChannelDifference = 0;
  let leftVisiblePixels = 0;
  let rightVisiblePixels = 0;
  const pixelCount = left.info.width * left.info.height;
  for (let offset = 0; offset < left.data.length; offset += 4) {
    if (left.data[offset + 3] > 0) leftVisiblePixels += 1;
    if (right.data[offset + 3] > 0) rightVisiblePixels += 1;
    let pixelMaximum = 0;
    for (let channel = 0; channel < 4; channel += 1) {
      const difference = Math.abs(left.data[offset + channel] - right.data[offset + channel]);
      absoluteChannelDifference += difference;
      pixelMaximum = Math.max(pixelMaximum, difference);
    }
    if (pixelMaximum > 24) changed += 1;
  }
  return {
    comparable: true,
    width: left.info.width,
    height: left.info.height,
    changedPixelRatio: round(changed / pixelCount),
    meanAbsoluteChannelDifference: round(
      absoluteChannelDifference / (pixelCount * 4 * 255),
    ),
    leftVisiblePixelRatio: round(leftVisiblePixels / pixelCount),
    rightVisiblePixelRatio: round(rightVisiblePixels / pixelCount),
  };
}

function pixelComparisonPasses(result, changedPixelRatioMax, meanChannelDifferenceMax) {
  return result.comparable === true
    && result.leftVisiblePixelRatio > 0.0001
    && result.rightVisiblePixelRatio > 0.0001
    && result.changedPixelRatio <= changedPixelRatioMax
    && result.meanAbsoluteChannelDifference <= meanChannelDifferenceMax;
}

function difference(left, right) {
  return round(Math.abs((Number(left) || 0) - (Number(right) || 0)));
}

function compareState(baseline, current) {
  const streamingFountain = current.mode === 'particle-fountain-b';
  const paletteKeys = [...new Set([
    ...Object.keys(baseline.colours),
    ...Object.keys(current.colours),
  ])].sort();
  const paletteDistributionDelta = paletteKeys.reduce((sum, colour) => (
    sum + Math.abs((baseline.colours[colour] || 0) - (current.colours[colour] || 0))
  ), 0) / (2 * Math.max(1, baseline.ballCount));
  const comparison = {
    ballCountMatches: baseline.ballCount === current.ballCount,
    ballCountRelativeDelta: round(
      Math.abs(baseline.ballCount - current.ballCount) / Math.max(1, baseline.ballCount),
    ),
    paletteCountsMatch: JSON.stringify(baseline.colours) === JSON.stringify(current.colours),
    paletteSetMatches: paletteKeys.every((colour) => (
      (baseline.colours[colour] || 0) > 0 && (current.colours[colour] || 0) > 0
    )),
    paletteDistributionDelta: round(paletteDistributionDelta),
    centroidDistance: round(Math.hypot(
      baseline.centroid.x - current.centroid.x,
      baseline.centroid.y - current.centroid.y,
    )),
    maximumBoundsDelta: Math.max(
      difference(baseline.bounds.left, current.bounds.left),
      difference(baseline.bounds.top, current.bounds.top),
      difference(baseline.bounds.right, current.bounds.right),
      difference(baseline.bounds.bottom, current.bounds.bottom),
    ),
    meanRadiusCssPxDelta: difference(baseline.meanRadiusCssPx, current.meanRadiusCssPx),
    rearShareDelta: difference(
      baseline.depth.rearCount / Math.max(1, baseline.depth.rearCount + baseline.depth.frontCount),
      current.depth.rearCount / Math.max(1, current.depth.rearCount + current.depth.frontCount),
    ),
  };
  comparison.passed = (comparison.ballCountMatches
      || (streamingFountain && comparison.ballCountRelativeDelta <= 0.06))
    && comparison.paletteSetMatches
    && comparison.paletteDistributionDelta <= (streamingFountain ? 0.09 : 0.03)
    && comparison.centroidDistance <= (streamingFountain ? 0.03 : 0.08)
    && comparison.maximumBoundsDelta <= (streamingFountain ? 0.18 : 0.15)
    && comparison.meanRadiusCssPxDelta <= 0.1
    && comparison.rearShareDelta <= 0.05;
  return comparison;
}

async function captureSide(browser, browserName, profileName, mode, label, origin) {
  const profile = PROFILES[profileName];
  const context = await browser.newContext({ ...profile, reducedMotion: 'no-preference' });
  const page = await context.newPage();
  try {
    const state = await preparePage(page, origin, mode, resolveStepHz(label, profileName, mode));
    const prefix = `${browserName}-${profileName}-${safeSlug(mode)}-${label}`;
    const canvasPath = resolve(OUTPUT_ROOT, `${prefix}-canvas.png`);
    const scenePath = resolve(OUTPUT_ROOT, `${prefix}-scene.png`);
    const canvasDataUrl = await page.locator('#c').evaluate((canvas) => canvas.toDataURL('image/png'));
    await writeFile(canvasPath, Buffer.from(canvasDataUrl.split(',')[1], 'base64'));
    await page.addStyleTag({ content: `
      *, *::before, *::after {
        animation-play-state: paused !important;
        transition-duration: 0s !important;
        caret-color: transparent !important;
      }
    ` });
    await page.locator('#simulations').screenshot({ path: scenePath });
    return { state, canvasPath, scenePath };
  } finally {
    await context.close();
  }
}

async function main() {
  await mkdir(OUTPUT_ROOT, { recursive: true });
  const rows = [];
  for (const browserName of BROWSER_NAMES) {
    const browserType = browserName === 'webkit' ? webkit : chromium;
    const browser = await browserType.launch({ headless: true });
    try {
      for (const profileName of PROFILE_NAMES) {
        if (!PROFILES[profileName]) throw new Error(`Unknown profile: ${profileName}`);
        for (const mode of MODES) {
          process.stdout.write(`Comparing ${browserName} ${profileName} ${mode}... `);
          const baseline = await captureSide(
            browser, browserName, profileName, mode, 'baseline', BASELINE_URL,
          );
          const current = await captureSide(
            browser, browserName, profileName, mode, 'current', CURRENT_URL,
          );
          const comparison = compareState(baseline.state, current.state);
          const pixelDifference = await readPixelDifference(
            baseline.canvasPath,
            current.canvasPath,
          );
          const scenePixelDifference = await readPixelDifference(
            baseline.scenePath,
            current.scenePath,
          );
          const pixelPassed = pixelComparisonPasses(
            pixelDifference,
            CANVAS_CHANGED_PIXEL_RATIO_MAX,
            CANVAS_MEAN_CHANNEL_DIFFERENCE_MAX,
          );
          const scenePixelPassed = pixelComparisonPasses(
            scenePixelDifference,
            SCENE_CHANGED_PIXEL_RATIO_MAX,
            SCENE_MEAN_CHANNEL_DIFFERENCE_MAX,
          );
          comparison.passed = comparison.passed && pixelPassed && scenePixelPassed;
          rows.push({
            browserName,
            profileName,
            mode,
            baseline,
            current,
            comparison,
            pixelDifference,
            scenePixelDifference,
            pixelPassed,
            scenePixelPassed,
          });
          console.log(comparison.passed ? 'PASS' : 'FAIL');
        }
      }
    } finally {
      await browser.close();
    }
  }
  const failures = rows.filter((row) => !row.comparison.passed);
  const report = {
    ok: failures.length === 0,
    generatedAt: new Date().toISOString(),
    baselineUrl: BASELINE_URL,
    currentUrl: CURRENT_URL,
    durationSeconds: DURATION_SECONDS,
    randomSeed: RANDOM_SEED,
    tolerances: {
      centroidDistance: 0.08,
      maximumBoundsDelta: 0.15,
      meanRadiusCssPxDelta: 0.1,
      rearShareDelta: 0.05,
      paletteDistributionDelta: 0.03,
      streamingFountain: {
        ballCountRelativeDelta: 0.06,
        paletteDistributionDelta: 0.09,
        centroidDistance: 0.03,
        maximumBoundsDelta: 0.18,
      },
      canvasPixels: {
        changedPixelRatio: CANVAS_CHANGED_PIXEL_RATIO_MAX,
        meanAbsoluteChannelDifference: CANVAS_MEAN_CHANNEL_DIFFERENCE_MAX,
      },
      scenePixels: {
        changedPixelRatio: SCENE_CHANGED_PIXEL_RATIO_MAX,
        meanAbsoluteChannelDifference: SCENE_MEAN_CHANNEL_DIFFERENCE_MAX,
      },
    },
    rows,
    failures: failures.map(({
      browserName,
      profileName,
      mode,
      comparison,
      pixelDifference,
      scenePixelDifference,
      pixelPassed,
      scenePixelPassed,
    }) => ({
      browserName,
      profileName,
      mode,
      comparison,
      pixelDifference,
      scenePixelDifference,
      pixelPassed,
      scenePixelPassed,
    })),
  };
  const reportPath = resolve(OUTPUT_ROOT, 'report.json');
  await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ ok: report.ok, rowCount: rows.length, failures: report.failures, reportPath }, null, 2));
  if (!report.ok) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
