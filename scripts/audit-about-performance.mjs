import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

// Serial, real-browser profiling. No production timing hooks are required.
// CDP profiles retain original URL/line/function attribution in the dev build.
const origin = process.env.ABS_URL || 'http://localhost:8012';
const engine = process.env.ABS_BROWSER || 'chromium';
const output = process.env.ABS_OUTPUT || 'output/playwright/about-performance-20260925/baseline';
const gpu = process.env.ABS_ABOUT_GPU || 'metal';
const cases = [[1440, 1000], [390, 844]].filter((_, i) => !process.env.ABS_CASES
  || process.env.ABS_CASES.split(',').includes(String(i + 1)));
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const quantile = (values, q) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] || 0;
};
await mkdir(output, { recursive: true });
const browser = await (engine === 'webkit' ? webkit : chromium).launch({
  args: engine === 'chromium' ? [`--use-angle=${gpu}`, '--enable-gpu', '--enable-webgl',
    '--enable-precise-memory-info'] : [],
});
const reports = [];

function summarizeCpu(profile) {
  const nodes = new Map(profile.nodes.map(node => [node.id, node]));
  const costs = new Map();
  for (let i = 0; i < (profile.samples?.length || 0); i++) {
    const node = nodes.get(profile.samples[i]);
    if (!node) continue;
    const frame = node.callFrame;
    const key = `${frame.url}:${frame.lineNumber + 1}:${frame.functionName}`;
    const row = costs.get(key) || { function: frame.functionName || '(anonymous)',
      url: frame.url, line: frame.lineNumber + 1, selfMs: 0, samples: 0 };
    row.selfMs += (profile.timeDeltas?.[i] || 0) / 1000;
    row.samples++;
    costs.set(key, row);
  }
  return [...costs.values()].sort((a, b) => b.selfMs - a.selfMs).slice(0, 45);
}

try {
  for (const [width, height] of cases) {
    const id = `${engine}-${width}`;
    const context = await browser.newContext({ viewport: { width, height },
      deviceScaleFactor: width < 600 ? 3 : 1, isMobile: width < 600,
      hasTouch: width < 600, colorScheme: 'light' });
    const page = await context.newPage();
    const report = { id, origin, viewport: { width, height }, gpu,
      capturedAt: new Date().toISOString(), errors: [], phases: [] };
    page.on('pageerror', error => report.errors.push(error.message));
    await page.addInitScript(() => {
      const log = { frames: [], longTasks: [], paints: [], lastPaintScroll: 0,
        lastPaintAt: 0, lastRaf: 0, running: false };
      window.__ABOUT_PERF_LOG__ = log;
      const clear = CanvasRenderingContext2D.prototype.clearRect;
      CanvasRenderingContext2D.prototype.clearRect = function (...args) {
        if (this.canvas.classList?.contains('about-board-balls')) {
          const port = document.querySelector('.about-board-scrollport');
          log.lastPaintAt = performance.now();
          log.lastPaintScroll = port?.scrollTop || 0;
          if (log.running) log.paints.push({ at: log.lastPaintAt, scroll: log.lastPaintScroll });
        }
        return clear.apply(this, args);
      };
      if (PerformanceObserver.supportedEntryTypes?.includes('longtask')) {
        new PerformanceObserver(list => {
          if (log.running) for (const entry of list.getEntries()) {
            log.longTasks.push({ at: entry.startTime, duration: entry.duration });
          }
        }).observe({ type: 'longtask', buffered: false });
      }
      function frame(now) {
        if (log.running) {
          const port = document.querySelector('.about-board-scrollport');
          log.frames.push({ at: now, interval: log.lastRaf ? now - log.lastRaf : 0,
            scroll: port?.scrollTop || 0,
            paintScrollLag: Math.abs((port?.scrollTop || 0) - log.lastPaintScroll),
            paintAge: performance.now() - log.lastPaintAt });
        }
        log.lastRaf = now;
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    const cdp = engine === 'chromium' ? await context.newCDPSession(page) : null;
    if (cdp) {
      await cdp.send('Profiler.enable');
      await cdp.send('Profiler.setSamplingInterval', { interval: 1000 });
      await cdp.send('Performance.enable');
    }
    try {
      const loadStarted = Date.now();
      await page.goto(`${origin}/about.html`);
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady,
        null, { timeout: 60000 });
      await page.waitForFunction(() => document.querySelector('[data-route-content="about"]')
        ?.dataset.aboutSceneReady === 'true', null, { timeout: 60000 });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(700);
      report.initialReadyMs = Date.now() - loadStarted;
      report.initialStats = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getStats());
      report.gpuRenderer = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl');
        const ext = gl?.getExtension('WEBGL_debug_renderer_info');
        const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unavailable';
        gl?.getExtension('WEBGL_lose_context')?.loseContext();
        return name;
      });
      const read = async () => {
        const snapshot = await page.evaluate(() => ({
        stats: window.__ABS_ABOUT_GAME_BOARD__.getStats(),
        memory: performance.memory ? { usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize } : null,
        canvases: [...document.querySelectorAll('canvas')].map(c => ({
          className: c.className, width: c.width, height: c.height,
          opacity: getComputedStyle(c).opacity,
        })),
        }));
        if (cdp) {
          const metrics = await cdp.send('Performance.getMetrics');
          snapshot.browserMetrics = Object.fromEntries(metrics.metrics
            .filter(metric => /JSHeap|LayoutCount|RecalcStyleCount|LayoutDuration|TaskDuration|Nodes|Documents/.test(metric.name))
            .map(metric => [metric.name, metric.value]));
        }
        return snapshot;
      };
      async function phase(name, action) {
        console.log(`${id}: ${name}`);
        const before = await read();
        if (cdp) await cdp.send('Profiler.start');
        const start = await page.evaluate(() => {
          const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
          const counters = { draws: stats.authoredEnding?.gpu?.drawCount || 0,
            paints: stats.boardRenderer?.paintCount ?? null,
            steps: stats.nativeLifetimeSteps ?? stats.rigidBody?.steps ?? 0,
            elapsedMs: stats.elapsedMs };
          const log = window.__ABOUT_PERF_LOG__;
          log.frames = []; log.longTasks = []; log.paints = []; log.lastRaf = 0;
          log.running = true;
          // No RAF can run between this synchronous snapshot and its clock.
          return { at: performance.now(), counters };
        });
        await action();
        const raw = await page.evaluate(() => {
          const log = window.__ABOUT_PERF_LOG__; log.running = false;
          const endedAt = performance.now();
          const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
          return { frames: log.frames, longTasks: log.longTasks, paints: log.paints,
            endedAt, counters: { draws: stats.authoredEnding?.gpu?.drawCount || 0,
              paints: stats.boardRenderer?.paintCount ?? null,
              steps: stats.nativeLifetimeSteps ?? stats.rigidBody?.steps ?? 0,
              elapsedMs: stats.elapsedMs } };
        });
        raw.startedAt = start.at;
        raw.startCounters = start.counters;
        const wallMs = raw.endedAt - start.at;
        const profile = cdp ? (await cdp.send('Profiler.stop')).profile : null;
        const after = await read();
        const intervals = raw.frames.map(f => f.interval).filter(v => v > 0);
        const row = { name, wallMs, before, after,
          frame: { count: intervals.length, p50: quantile(intervals, .5),
            p95: quantile(intervals, .95), p99: quantile(intervals, .99),
            max: Math.max(0, ...intervals), over25ms: intervals.filter(v => v > 25).length,
            effectiveFps: intervals.length / (wallMs / 1000) },
          canvasPaintCount: raw.paints.length,
          // Scene counters measure real draws; the observer's RAF can run at
          // 120 Hz even when a scene is deliberately rendered at only 30 Hz.
          authoredDrawCount: Math.max(0, raw.counters.draws - start.counters.draws),
          physicsStepCount: raw.counters.steps - start.counters.steps,
          completedCanvasPaintCount: raw.counters.paints !== null && start.counters.paints !== null
            ? raw.counters.paints - start.counters.paints : null,
          simulatedMs: raw.counters.elapsedMs - start.counters.elapsedMs,
          simulationToWallRatio: (raw.counters.elapsedMs - start.counters.elapsedMs) / wallMs,
          longTasks: { count: raw.longTasks.length,
            totalMs: raw.longTasks.reduce((sum, t) => sum + t.duration, 0),
            maxMs: Math.max(0, ...raw.longTasks.map(t => t.duration)) },
          cpu: profile ? summarizeCpu(profile) : [] };
        report.phases.push(row);
        await writeFile(`${output}/${id}-${name}-frames.json`, JSON.stringify(raw));
        if (profile) await writeFile(`${output}/${id}-${name}.cpuprofile`, JSON.stringify(profile));
        await page.screenshot({ path: `${output}/${id}-${name}.png` });
        await writeFile(`${output}/${id}-report.json`, JSON.stringify(report, null, 2));
      }
      const setBoardY = y => page.locator('.about-board-scrollport').evaluate((port, y) => {
        const world = port.querySelector('.about-board-world');
        const topY = window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY;
        port.scrollTop = world.offsetTop + (y - topY) * world.clientWidth / 960 - port.clientHeight * .4;
      }, y);
      const set3d = progress => page.locator('.about-board-scrollport').evaluate((port, p) => {
        const stage = port.querySelector('.about-board-three-stage');
        const top = stage.getBoundingClientRect().top - port.getBoundingClientRect().top + port.scrollTop;
        port.scrollTop = top + p * (stage.offsetHeight - port.clientHeight);
      }, progress);
      await phase('opening-rest', () => delay(3000));
      await phase('reservoir-release', async () => { await setBoardY(1124); await delay(6000); });
      await phase('fast-2d-scroll', async () => {
        await page.mouse.move(width * .7, height * .5);
        for (let i = 0; i < 24; i++) {
          await page.mouse.wheel(0, (i < 16 ? 1 : -1) * height * .65);
          await delay(110);
        }
        await delay(500);
      });
      await phase('seam-approach', async () => { await set3d(0); await delay(4500); });
      await phase('tunnel-hold', async () => {
        await set3d(.72); await delay(3500);
      });
      await phase('fast-3d-scroll', async () => {
        for (const p of [.35, .42, .5, .58, .68, .78, .9, 1, .9, .78, .68, .58]) {
          await set3d(p); await delay(160);
        }
        await delay(500);
      });
      await phase('reverse-to-machine', async () => { await setBoardY(4200); await delay(3000); });
      await phase('closed-return', async () => {
        await page.locator('.about-board-scrollport').evaluate(port => { port.scrollTop = 0; });
        await delay(2500);
      });
      report.finalIds = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot()
        .reduce((counts, ball) => {
          const kind = ball.id.split('-')[0]; counts[kind] = (counts[kind] || 0) + 1; return counts;
        }, {}));
      report.passed = report.errors.length === 0;
      report.captureSucceeded = true;
      if (!report.passed) process.exitCode = 1;
    } catch (error) {
      report.failure = error.stack;
      report.passed = false;
      process.exitCode = 1;
    } finally {
      reports.push(report);
      await writeFile(`${output}/${id}-report.json`, JSON.stringify(report, null, 2));
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(`${output}/manifest.json`, JSON.stringify({
    description: 'Serial Playwright baseline; hardware GPU; native wheel and direct scroll-position scenarios.',
    limitations: ['Phone is viewport emulation on desktop hardware, not a real-device benchmark.',
      'RAF cadence is not proof of GPU presentation; canvas paint count and CPU profiles are recorded separately.',
      'Paint-scroll lag is diagnostic only: before/after renderer ownership may differ.'],
    reports,
  }, null, 2));
}
