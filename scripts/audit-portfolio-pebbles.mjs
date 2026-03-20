/**
 * Visual-first portfolio pebble audit.
 *
 * Runs ten repeatable scenarios against /portfolio.html, captures timed frames for each,
 * and writes a JSON + Markdown report under output/playwright/portfolio-pebble-audit/.
 *
 * Run: npm run audit:portfolio-pebbles
 * Needs: dev or preview server. Set ABS_DEV_URL to an origin or full HTML URL.
 */
import { mkdir, writeFile, rm } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'portfolio-pebble-audit');
const WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 30000);
const DEFAULT_VIEWPORT = { width: 1440, height: 900 };
const DEFAULT_SCENARIO_EXPECTATION = Object.freeze({
  minSleepingCount: 5,
  maxFrameP95Ms: 12,
  maxThrottleShare: 0.15,
  allowLowQuality: false,
});

function getScenarioExpectation(id) {
  switch (id) {
    case 'baseline-settle':
    case 'long-drop-center':
    case 'resize-under-load':
      return { ...DEFAULT_SCENARIO_EXPECTATION, minSleepingCount: 5 };
    default:
      return DEFAULT_SCENARIO_EXPECTATION;
  }
}

function resolvePortfolioEntryUrl() {
  let raw = (process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').trim().replace(/\/+$/, '');
  const pathPart = raw.split('?')[0].split('#')[0];
  if (/\.html$/i.test(pathPart)) {
    return raw.replace(/\/[^/]*\.html$/i, '/portfolio.html');
  }
  return `${raw}/portfolio.html`;
}

function sleep(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

async function waitForPortfolioReady(page) {
  await page.goto(resolvePortfolioEntryUrl(), { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#c', { timeout: WAIT_MS });
  await page.waitForFunction(
    () => {
      const canvas = document.getElementById('c');
      if (!canvas) return false;
      const cssWidth = canvas.clientWidth || 0;
      const cssHeight = canvas.clientHeight || 0;
      if (cssWidth < 64 || cssHeight < 64) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const minWidth = Math.ceil((cssWidth + 2) * dpr) - 2;
      const minHeight = Math.ceil((cssHeight + 2) * dpr) - 2;
      return canvas.width >= minWidth
        && canvas.height >= minHeight
        && document.querySelectorAll('.portfolio-project-label').length > 0;
    },
    { timeout: WAIT_MS }
  );
  await page.waitForFunction(
    () => {
      const globals = window.__ABS_PORTFOLIO_AUDIT__?.getGlobals?.();
      if (!globals) return false;
      return globals.currentMode === 'portfolio-pit'
        && Array.isArray(globals.balls)
        && globals.balls.length >= 6;
    },
    { timeout: WAIT_MS }
  );
}

async function getCanvasRect(page) {
  return page.evaluate(() => {
    const rect = document.getElementById('c')?.getBoundingClientRect();
    if (!rect) return null;
    return {
      left: rect.left,
      top: rect.top,
      width: rect.width,
      height: rect.height,
    };
  });
}

async function getBallClientPoint(page, index) {
  return page.evaluate((ballIndex) => {
    const globals = window.__ABS_PORTFOLIO_AUDIT__?.getGlobals?.();
    if (!globals) return null;
    const canvas = document.getElementById('c');
    const rect = canvas?.getBoundingClientRect();
    const balls = Array.isArray(globals.balls) ? globals.balls : [];
    const normalizedIndex = Number.isInteger(ballIndex) && balls.length
      ? ((ballIndex % balls.length) + balls.length) % balls.length
      : 0;
    const ball = balls[normalizedIndex] || balls.find(Boolean);
    const dpr = globals.DPR || window.devicePixelRatio || 1;
    if (!rect || !ball) return null;
    return {
      x: rect.left + (ball.x / dpr),
      y: rect.top + (ball.y / dpr),
      radius: ball.r / dpr,
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
    };
  }, index);
}

async function dragBetween(page, start, end, steps = 12, stepDelayMs = 16) {
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let index = 1; index <= steps; index += 1) {
    const t = index / steps;
    await page.mouse.move(
      start.x + ((end.x - start.x) * t),
      start.y + ((end.y - start.y) * t),
      { steps: 1 }
    );
    if (stepDelayMs > 0) await sleep(stepDelayMs);
  }
  await page.mouse.up();
}

async function repositionBall(page, index, targetClientPoint, steps = 18, stepDelayMs = 24) {
  const start = await getBallClientPoint(page, index);
  if (!start) throw new Error(`Ball ${index} not available for reposition`);
  await dragBetween(page, start, targetClientPoint, steps, stepDelayMs);
}

async function injectBallState(page, entries) {
  await page.evaluate((nextEntries) => {
    const globals = window.__ABS_PORTFOLIO_AUDIT__?.getGlobals?.();
    if (!globals) return;
    for (const entry of nextEntries) {
      const ball = globals.balls?.[entry.index];
      if (!ball) continue;
      if (Number.isFinite(entry.x)) ball.x = entry.x;
      if (Number.isFinite(entry.y)) ball.y = entry.y;
      if (Number.isFinite(entry.vx)) ball.vx = entry.vx;
      if (Number.isFinite(entry.vy)) ball.vy = entry.vy;
      if (Number.isFinite(entry.omega)) ball.omega = entry.omega;
      ball.isSleeping = false;
      ball.sleepTimer = 0;
      ball.isGrounded = false;
      ball.hasSupport = false;
      ball.wake?.();
    }
  }, entries);
}

async function collectMetrics(page) {
  return page.evaluate(() => {
    const globals = window.__ABS_PORTFOLIO_AUDIT__?.getGlobals?.();
    if (!globals) {
      return {
        ballCount: 0,
        sleepingCount: 0,
        allFinite: false,
        inBounds: false,
        maxSpeed: 0,
        maxOmega: 0,
        overlapDebtP95: null,
        pairCountMean: null,
        frameP95Ms: null,
        physicsP95Ms: null,
        renderP95Ms: null,
        postFxP95Ms: null,
        throttleShare: null,
        throttleLevel: null,
        renderQualityTier: null,
        noiseReady: document.body.classList.contains('noise-ready'),
        quoteDisplayVisible: Boolean(document.getElementById('quote-display')),
      };
    }
    const width = globals.canvas?.width || 0;
    const height = globals.canvas?.height || 0;
    const balls = Array.isArray(globals.balls) ? globals.balls : [];
    const metrics = {
      ballCount: balls.length,
      sleepingCount: balls.filter((ball) => ball.isSleeping).length,
      allFinite: balls.every((ball) => [ball.x, ball.y, ball.vx, ball.vy, ball.omega].every(Number.isFinite)),
      inBounds: balls.every((ball) => (
        ball.x >= -ball.r
        && ball.y >= -ball.r
        && ball.x <= width + ball.r
        && ball.y <= height + ball.r
      )),
      maxSpeed: balls.reduce((max, ball) => Math.max(max, Math.hypot(ball.vx, ball.vy)), 0),
      maxOmega: balls.reduce((max, ball) => Math.max(max, Math.abs(ball.omega || 0)), 0),
      overlapDebtP95: globals.pitPerfSummary?.overlapDebtP95 ?? null,
      pairCountMean: globals.pitPerfSummary?.pairCountMean ?? null,
      frameP95Ms: globals.pitPerfSummary?.frameP95Ms ?? null,
      physicsP95Ms: globals.pitPerfSummary?.physicsP95Ms ?? null,
      renderP95Ms: globals.pitPerfSummary?.renderP95Ms ?? null,
      postFxP95Ms: globals.pitPerfSummary?.postFxP95Ms ?? null,
      throttleShare: globals.pitPerfSummary?.throttleShare ?? null,
      throttleLevel: globals.adaptiveThrottleLevel ?? null,
      renderQualityTier: globals.renderQualityTierResolved ?? null,
      noiseReady: document.body.classList.contains('noise-ready'),
      quoteDisplayVisible: Boolean(document.getElementById('quote-display')),
    };
    return metrics;
  });
}

function evaluateScenario(result) {
  const expectation = getScenarioExpectation(result.id);
  const failures = [];
  const metrics = result.metrics;

  if (!metrics.allFinite) failures.push('non-finite state');
  if (!metrics.inBounds) failures.push('body escaped bounds');
  if (metrics.noiseReady) failures.push('noise system still active');
  if (metrics.quoteDisplayVisible) failures.push('quote display still mounted');
  if (metrics.ballCount < 6) failures.push(`expected 6 bodies, saw ${metrics.ballCount}`);
  if (metrics.sleepingCount < expectation.minSleepingCount) {
    failures.push(`sleeping bodies ${metrics.sleepingCount} < ${expectation.minSleepingCount}`);
  }
  if (Number.isFinite(metrics.frameP95Ms) && metrics.frameP95Ms > expectation.maxFrameP95Ms) {
    failures.push(`frame p95 ${metrics.frameP95Ms.toFixed(2)}ms > ${expectation.maxFrameP95Ms}ms`);
  }
  if (Number.isFinite(metrics.throttleShare) && metrics.throttleShare > expectation.maxThrottleShare) {
    failures.push(`throttle share ${metrics.throttleShare.toFixed(2)} > ${expectation.maxThrottleShare}`);
  }
  if (!expectation.allowLowQuality && metrics.renderQualityTier === 'low') {
    failures.push('render quality dropped to low');
  }

  return failures;
}

async function captureFrames(page, scenarioDir, timesMs) {
  const frames = [];
  let elapsedMs = 0;
  for (let index = 0; index < timesMs.length; index += 1) {
    const targetMs = timesMs[index];
    const waitMs = Math.max(0, targetMs - elapsedMs);
    if (waitMs > 0) await sleep(waitMs);
    elapsedMs = targetMs;
    const fileName = `${String(index).padStart(2, '0')}-${targetMs}ms.png`;
    const filePath = resolve(scenarioDir, fileName);
    await page.screenshot({ path: filePath, fullPage: false });
    frames.push(filePath);
  }
  return frames;
}

const scenarioDefinitions = [
  {
    id: 'baseline-settle',
    title: 'Baseline settle',
    description: 'No interaction. Observe visible calmness over six seconds.',
    captureTimesMs: [0, 1500, 3500, 6000],
    run: async () => {},
  },
  {
    id: 'gentle-nudge',
    title: 'Gentle nudge',
    description: 'Small lateral drag and release to test low-energy recovery.',
    captureTimesMs: [0, 250, 700, 1400, 2600, 4200],
    run: async (page) => {
      const start = await getBallClientPoint(page, 0);
      if (!start) throw new Error('gentle-nudge: missing ball 0');
      const end = { x: start.x + 90, y: start.y - 24 };
      await dragBetween(page, start, end, 8, 24);
    },
  },
  {
    id: 'hard-throw-right',
    title: 'Hard throw right',
    description: 'Fast pointer throw across the canvas to test capped launch speed.',
    captureTimesMs: [0, 120, 350, 700, 1400, 2600, 4200],
    run: async (page) => {
      const start = await getBallClientPoint(page, 0);
      if (!start) throw new Error('hard-throw-right: missing ball 0');
      const end = { x: start.x + 300, y: start.y - 130 };
      await dragBetween(page, start, end, 7, 16);
    },
  },
  {
    id: 'vertical-flick-up',
    title: 'Vertical flick up',
    description: 'Quick upward flick to see if the body rebounds too elastically.',
    captureTimesMs: [0, 120, 350, 700, 1400, 2600, 4200],
    run: async (page) => {
      const start = await getBallClientPoint(page, 1);
      if (!start) throw new Error('vertical-flick-up: missing ball 1');
      const end = { x: start.x + 20, y: start.y - 280 };
      await dragBetween(page, start, end, 8, 14);
    },
  },
  {
    id: 'long-drop-center',
    title: 'Long drop center',
    description: 'Lift a body near the top center and release onto the cluster.',
    captureTimesMs: [0, 250, 700, 1400, 2600, 4200],
    run: async (page) => {
      const rect = await getCanvasRect(page);
      if (!rect) throw new Error('long-drop-center: missing canvas rect');
      await repositionBall(page, 2, { x: rect.left + (rect.width * 0.5), y: rect.top + 70 }, 18, 28);
    },
  },
  {
    id: 'long-drop-left-shoulder',
    title: 'Long drop left shoulder',
    description: 'Drop onto an off-center shoulder to test cascading stack behavior.',
    captureTimesMs: [0, 250, 700, 1400, 2600, 4200],
    run: async (page) => {
      const rect = await getCanvasRect(page);
      if (!rect) throw new Error('long-drop-left-shoulder: missing canvas rect');
      await repositionBall(page, 3, { x: rect.left + (rect.width * 0.34), y: rect.top + 72 }, 18, 28);
    },
  },
  {
    id: 'wall-slam',
    title: 'Wall slam',
    description: 'Fast wallward throw to inspect rebound, wall clamp, and edge chatter.',
    captureTimesMs: [0, 120, 350, 700, 1400, 2600, 4200],
    run: async (page) => {
      const start = await getBallClientPoint(page, 4);
      if (!start) throw new Error('wall-slam: missing ball 4');
      const end = { x: start.rect.left + start.rect.width - 60, y: start.y - 80 };
      await dragBetween(page, start, end, 7, 16);
    },
  },
  {
    id: 'dense-stack-shove',
    title: 'Dense stack shove',
    description: 'Drive a body through the cluster to test wake cascades and solver calmness.',
    captureTimesMs: [0, 120, 350, 700, 1400, 2600, 4200],
    run: async (page) => {
      const start = await getBallClientPoint(page, 5);
      if (!start) throw new Error('dense-stack-shove: missing ball 5');
      const end = { x: start.rect.left + (start.rect.width * 0.48), y: start.rect.top + (start.rect.height * 0.56) };
      await dragBetween(page, start, end, 14, 18);
    },
  },
  {
    id: 'overlap-glitch',
    title: 'Overlap glitch',
    description: 'Force two bodies into overlap with opposing velocity to test glitch recovery.',
    captureTimesMs: [0, 120, 350, 700, 1400, 2600],
    run: async (page) => {
      await page.evaluate(() => {
        const globals = window.__ABS_PORTFOLIO_AUDIT__?.getGlobals?.();
        if (!globals) return;
        const a = globals.balls?.[2];
        const b = globals.balls?.[3];
        if (!a || !b) return;
        b.x = a.x;
        b.y = a.y;
      });
      await injectBallState(page, [
        { index: 2, vx: 4200, vy: -1800, omega: 8 },
        { index: 3, vx: -4200, vy: 1800, omega: -8 },
      ]);
    },
  },
  {
    id: 'resize-under-load',
    title: 'Resize under load',
    description: 'Throw a body, then resize the viewport mid-motion to test recovery.',
    captureTimesMs: [0, 120, 350, 700, 1400, 2600, 4200],
    run: async (page) => {
      const start = await getBallClientPoint(page, 0);
      if (!start) throw new Error('resize-under-load: missing ball 0');
      const end = { x: start.x + 260, y: start.y - 90 };
      await dragBetween(page, start, end, 7, 16);
      await sleep(120);
      await page.setViewportSize({ width: 1180, height: 820 });
      await sleep(160);
      await page.setViewportSize(DEFAULT_VIEWPORT);
    },
  },
];

async function runScenario(browser, scenario) {
  const page = await browser.newPage({ viewport: DEFAULT_VIEWPORT });
  const scenarioDir = resolve(outputRoot, scenario.id);
  await mkdir(scenarioDir, { recursive: true });
  await waitForPortfolioReady(page);
  await sleep(1000);

  await scenario.run(page);
  const frames = await captureFrames(page, scenarioDir, scenario.captureTimesMs);
  await sleep(1500);
  const metrics = await collectMetrics(page);

  await page.close();
  return {
    id: scenario.id,
    title: scenario.title,
    description: scenario.description,
    captureTimesMs: scenario.captureTimesMs,
    frames: frames.map((file) => file.replace(`${repoRoot}/`, '')),
    metrics,
  };
}

function buildMarkdownReport(url, results) {
  const lines = [
    '# Portfolio Pebble Audit',
    '',
    `Source URL: ${url}`,
    '',
  ];

  for (const result of results) {
    lines.push(`## ${result.title}`);
    lines.push('');
    lines.push(result.description);
    lines.push('');
    lines.push(`- Scenario id: \`${result.id}\``);
    lines.push(`- Frames: ${result.frames.map((frame) => `\`${frame}\``).join(', ')}`);
    lines.push(`- Metrics: sleeping=${result.metrics.sleepingCount}, maxSpeed=${result.metrics.maxSpeed.toFixed(2)}, maxOmega=${result.metrics.maxOmega.toFixed(3)}, frameP95=${Number(result.metrics.frameP95Ms ?? 0).toFixed(2)}ms, quality=${result.metrics.renderQualityTier ?? 'unknown'}, inBounds=${result.metrics.inBounds}, finite=${result.metrics.allFinite}, noiseReady=${result.metrics.noiseReady}, quoteDisplay=${result.metrics.quoteDisplayVisible}`);
    if (result.metrics.overlapDebtP95 !== null) {
      lines.push(`- Overlap debt p95: ${result.metrics.overlapDebtP95.toFixed(3)}`);
    }
    if (result.metrics.pairCountMean !== null) {
      lines.push(`- Pair count mean: ${result.metrics.pairCountMean.toFixed(3)}`);
    }
    if (result.metrics.throttleShare !== null) {
      lines.push(`- Throttle share: ${(result.metrics.throttleShare * 100).toFixed(1)}%`);
    }
    if (Array.isArray(result.failures) && result.failures.length) {
      lines.push(`- Failures: ${result.failures.join('; ')}`);
    }
    lines.push('');
  }

  return `${lines.join('\n')}\n`;
}

async function main() {
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  const browser = await chromium.launch();
  const results = [];

  try {
    for (const scenario of scenarioDefinitions) {
      const result = await runScenario(browser, scenario);
      result.failures = evaluateScenario(result);
      results.push(result);
      console.error(`Captured ${scenario.id}`);
    }
  } finally {
    await browser.close();
  }

  const report = {
    sourceUrl: resolvePortfolioEntryUrl(),
    generatedAt: new Date().toISOString(),
    scenarioCount: results.length,
    scenarios: results,
  };

  const jsonPath = resolve(outputRoot, 'report.json');
  const mdPath = resolve(outputRoot, 'report.md');
  await writeFile(jsonPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
  await writeFile(mdPath, buildMarkdownReport(report.sourceUrl, results), 'utf8');

  console.log(JSON.stringify({
    outputRoot,
    reportJson: jsonPath,
    reportMarkdown: mdPath,
    scenarioIds: results.map((scenario) => scenario.id),
  }, null, 2));

  const failing = results.filter((result) => Array.isArray(result.failures) && result.failures.length > 0);

  if (failing.length) {
    console.error(`FAIL: ${failing.length} scenario(s) failed portfolio pebble acceptance`);
    for (const result of failing) {
      console.error(`- ${result.id}: ${result.failures.join('; ')}`);
    }
    process.exitCode = 1;
  } else {
    console.error(`PASS: captured ${results.length} portfolio pebble scenario(s)`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
