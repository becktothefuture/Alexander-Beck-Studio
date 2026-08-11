#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const ORIGIN = String(process.env.ABS_DEV_URL || 'http://localhost:8012').replace(/\/+$/, '');
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const HEADED = process.env.ABS_HEADED === '1';
const OUTPUT_PATH = resolve(process.env.ABS_OUTPUT || (
  `output/playwright/runtime-performance/home-pit-cadence-transition-${BROWSER_NAME}.json`
));
const browserType = BROWSER_NAME === 'webkit' ? webkit : chromium;

if (!['chromium', 'webkit'].includes(BROWSER_NAME)) {
  throw new Error(`Unsupported ABS_BROWSER=${BROWSER_NAME}; use chromium or webkit.`);
}

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

async function readState(page) {
  return page.evaluate(async () => {
    const runtime = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.() || null;
    const { getGlobals } = await import('/src/legacy/modules/core/state.js');
    const globals = getGlobals();
    const balls = globals.balls || [];
    const canvas = globals.canvas;
    let finiteBodyCount = 0;
    let lockedBodyCount = 0;
    let positionChecksum = 0;
    let rotationChecksum = 0;
    let interactionTarget = null;
    let interactionTargetScore = Infinity;
    for (let index = 0; index < balls.length; index += 1) {
      const ball = balls[index];
      if (![ball?.x, ball?.y, ball?.vx, ball?.vy, ball?.omega].every(Number.isFinite)) continue;
      finiteBodyCount += 1;
      if (ball.isPointerLocked) lockedBodyCount += 1;
      positionChecksum += (ball.x * 0.37) + (ball.y * 0.63);
      rotationChecksum += (Number(ball.theta) || 0) * (index + 1);
      const targetScore = Math.hypot(
        ball.x - (canvas?.width || 0) * 0.5,
        ball.y - (canvas?.height || 0) * 0.35,
      );
      if (targetScore < interactionTargetScore) {
        interactionTargetScore = targetScore;
        interactionTarget = { x: ball.x, y: ball.y };
      }
    }
    return {
      runtime,
      bodies: {
        count: balls.length,
        finiteBodyCount,
        lockedBodyCount,
        interactionTarget,
        positionChecksum,
        rotationChecksum,
      },
    };
  });
}

async function main() {
  const browser = await browserType.launch({ headless: !HEADED });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  try {
    await page.addInitScript(() => {
      window.__ABS_ROUTE_PERF_AUDIT__ = true;
      window.__ABS_PERF_RANDOM_SEED__ = 20260811;
    });
    await page.goto(`${ORIGIN}/index.html?mode=pit&absAudit=1`, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    await page.waitForFunction(() => (
      document.documentElement.dataset.absHomeSimulationReady === 'true'
      && window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().mode === 'pit'
    ), null, { timeout: 20_000, polling: 'raf' });
    await page.waitForFunction(() => (
      window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().pitPhysicsStepHz === 60
    ), null, { timeout: 20_000, polling: 'raf' });

    const settled = await readState(page);
    const box = await page.locator('#c').boundingBox();
    assert(box, 'Pit canvas has no interactive bounds');
    const canvasSize = await page.locator('#c').evaluate((canvas) => ({
      width: canvas.width,
      height: canvas.height,
    }));
    const target = settled.bodies.interactionTarget;
    assert(target, 'Pit has no finite body to drag', settled.bodies);
    const start = {
      x: box.x + (target.x / canvasSize.width) * box.width,
      y: box.y + (target.y / canvasSize.height) * box.height,
    };
    const end = {
      x: Math.min(box.x + box.width * 0.8, start.x + box.width * 0.06),
      y: Math.min(box.y + box.height * 0.8, start.y + box.height * 0.02),
    };
    const entryPoint = {
      x: box.x + box.width * 0.5,
      y: box.y + box.height * 0.1,
    };

    await page.mouse.move(entryPoint.x, entryPoint.y);
    await page.waitForFunction(() => (
      window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().pitPhysicsStepHz === 120
    ), null, { timeout: 1_000, polling: 'raf' });
    const pointerEntry = await readState(page);

    await page.mouse.move(Math.max(0, box.x - 20), Math.max(0, box.y - 20));
    await page.waitForTimeout(150);
    const pointerHold = await readState(page);
    await page.waitForFunction(() => (
      window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().pitPhysicsStepHz === 60
    ), null, { timeout: 5_000, polling: 'raf' });
    const pointerResettled = await readState(page);

    await page.mouse.move(start.x, start.y);
    await page.mouse.down();
    await page.mouse.move(end.x, end.y, { steps: 48 });
    const duringDrag = await readState(page);
    await page.mouse.up();
    await page.waitForTimeout(150);
    const releaseHold = await readState(page);

    const samples = {
      settled,
      pointerEntry,
      pointerHold,
      pointerResettled,
      duringDrag,
      releaseHold,
    };

    assert(settled.runtime?.pitPhysicsStepHz === 60, 'Pit did not enter its settled 60 Hz state', samples);
    assert(pointerEntry.runtime?.pitPhysicsStepHz === 120, 'Pointer entry did not restore 120 Hz', samples);
    assert(pointerHold.runtime?.pitPhysicsStepHz === 120, 'Pit did not preserve the 250 ms activity hold', samples);
    assert(pointerResettled.runtime?.pitPhysicsStepHz === 60, 'Pit did not return to 60 Hz after pointer activity', samples);
    assert(duringDrag.runtime?.pitPhysicsStepHz === 120, 'Pit left 120 Hz during drag', samples);
    assert(
      duringDrag.runtime?.pointerActive === true
        && duringDrag.runtime?.pitMaxAwakeSpeedSq > settled.runtime?.pitMaxAwakeSpeedSq,
      'The drag did not produce active Pit motion',
      duringDrag,
    );
    assert(releaseHold.runtime?.pitPhysicsStepHz === 120, 'Pit did not preserve the release hold', samples);
    for (const [label, sample] of Object.entries(samples)) {
      assert(
        sample.bodies.count > 0 && sample.bodies.finiteBodyCount === sample.bodies.count,
        `${label}: Pit body state became non-finite`,
        sample,
      );
    }
    assert(releaseHold.bodies.lockedBodyCount === 0, 'The released Pit body remained pointer-locked', releaseHold);

    const result = {
      ok: true,
      browser: BROWSER_NAME,
      origin: ORIGIN,
      surface: process.env.ABS_DEV_URL ? 'external-url-diagnostic' : 'local-authoring',
      interaction: 'settle -> pointer entry -> 250 ms hold -> settle -> drag -> release',
      samples,
    };
    await mkdir(dirname(OUTPUT_PATH), { recursive: true });
    await writeFile(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
