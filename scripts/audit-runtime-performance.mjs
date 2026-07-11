#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, devices, webkit } from 'playwright';

const ORIGIN = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').replace(/\/+$/, '');
const SAMPLE_MS = Math.max(500, Number(process.env.ABS_PERF_SAMPLE_MS || 3000));
const SETTLE_MS = Math.max(500, Number(process.env.ABS_PERF_SETTLE_MS || 2000));
const WINDOW_STARTS_SECONDS = String(process.env.ABS_PERF_WINDOW_STARTS_SECONDS || '5,30,60')
  .split(',')
  .map((value) => Number(value.trim()))
  .filter((value) => Number.isFinite(value) && value >= 0)
  .sort((a, b) => a - b);
const READY_TIMEOUT_MS = Math.max(3000, Number(process.env.ABS_PERF_READY_TIMEOUT_MS || 15_000));
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const DEVICE_NAME = String(process.env.ABS_DEVICE || 'iPhone 13');
const ORIENTATION = String(process.env.ABS_ORIENTATION || 'portrait').toLowerCase();
const MIN_FPS = Math.max(1, Number(process.env.ABS_PERF_MIN_FPS || 58));
const OUTPUT_PATH = resolve(process.env.ABS_PERF_OUTPUT || `output/playwright/runtime-performance-${BROWSER_NAME}.json`);
const browserType = BROWSER_NAME === 'webkit' ? webkit : chromium;

if (!['chromium', 'webkit'].includes(BROWSER_NAME)) {
  throw new Error(`Unsupported ABS_BROWSER=${BROWSER_NAME}; use chromium or webkit.`);
}
if (!devices[DEVICE_NAME]) {
  throw new Error(`Unknown Playwright device profile: ${DEVICE_NAME}`);
}
if (!['portrait', 'landscape'].includes(ORIENTATION)) {
  throw new Error(`Unsupported ABS_ORIENTATION=${ORIENTATION}; use portrait or landscape.`);
}

const deviceProfile = { ...devices[DEVICE_NAME] };
if (ORIENTATION === 'landscape') {
  deviceProfile.viewport = {
    width: devices[DEVICE_NAME].viewport.height,
    height: devices[DEVICE_NAME].viewport.width,
  };
  deviceProfile.screen = {
    width: devices[DEVICE_NAME].screen.height,
    height: devices[DEVICE_NAME].screen.width,
  };
}

const catalogPath = resolve('react-app/app/src/data/simulationCatalog.json');
const catalogText = await readFile(catalogPath, 'utf8');
const catalog = JSON.parse(catalogText);
const requestedIds = String(process.env.ABS_PERF_MODES || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const catalogEntries = catalog.simulations.filter((entry) => entry.launchPath || entry.dailyHref);
const entries = requestedIds.length
  ? requestedIds.map((id) => catalogEntries.find((entry) => entry.id === id)).filter(Boolean)
  : catalogEntries;
const missingRequestedIds = requestedIds.filter((id) => !entries.some((entry) => entry.id === id));
if (missingRequestedIds.length) {
  throw new Error(`Unknown ABS_PERF_MODES simulation IDs: ${missingRequestedIds.join(', ')}`);
}

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
}

function round(value, digits = 2) {
  if (value === null || value === undefined || value === '') return null;
  return Number.isFinite(Number(value)) ? Number(Number(value).toFixed(digits)) : null;
}

function entryUrl(entry) {
  const path = entry.surface === 'home-mode'
    ? '/index.html'
    : (entry.stage === 'daily-rotation' ? (entry.dailyHref || entry.launchPath) : entry.launchPath);
  const url = new URL(path, `${ORIGIN}/`);
  if (entry.surface === 'home-mode') url.searchParams.set('mode', entry.id);
  else if (entry.stage === 'daily-rotation') url.searchParams.set('daily', '1');
  url.searchParams.set('absAudit', '1');
  return url.toString();
}

const browser = await browserType.launch({ headless: process.env.ABS_HEADED !== '1' });
const results = [];
let deviceEvidence = null;

try {
  for (const entry of entries) {
    const context = await browser.newContext({
      ...deviceProfile,
      reducedMotion: 'no-preference',
      colorScheme: process.env.ABS_COLOR_SCHEME === 'dark' ? 'dark' : 'light',
    });
    const page = await context.newPage();
    await page.addInitScript(() => {
      window.__ABS_ROUTE_PERF_AUDIT__ = true;
      sessionStorage.setItem('abs_portfolio_ok', 'runtime-performance-audit');
    });
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    process.stdout.write(`Sampling ${entry.id} (${entry.surface})... `);
    try {
      const url = entryUrl(entry);
      await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
      if (entry.surface === 'home-mode') {
        await page.waitForFunction(
          (id) => window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().mode === id,
          entry.id,
          { timeout: READY_TIMEOUT_MS },
        );
      } else if (entry.surface === 'route-runtime') {
        await page.waitForFunction(
          () => document.body.classList.contains('portfolio-page')
            && Number(document.getElementById('c')?.width) > 1
            && Number(document.getElementById('c')?.height) > 1
            && Number(document.getElementById('c')?.__absAuditFrameCount) > 0,
          undefined,
          { timeout: READY_TIMEOUT_MS },
        );
      } else {
        await page.waitForFunction(
          () => Array.from(document.querySelectorAll('canvas')).some((canvas) => (
            canvas.width > 1
            && canvas.height > 1
            && Number(canvas.__absAuditFrameCount) > 0
          )),
          entry.id,
          { timeout: READY_TIMEOUT_MS },
        );
      }
      const measurementStartedAt = Date.now();
      const windowSamples = [];
      for (const windowStartSeconds of (WINDOW_STARTS_SECONDS.length ? WINDOW_STARTS_SECONDS : [SETTLE_MS / 1000])) {
        const waitMs = Math.max(0, windowStartSeconds * 1000 - (Date.now() - measurementStartedAt));
        if (waitMs > 0) await page.waitForTimeout(waitMs);

        const windowSample = await page.evaluate(async (durationMs) => {
        const intervals = [];
        const renderedIntervals = [];
        const start = performance.now();
        const auditCanvas = Array.from(document.querySelectorAll('canvas')).find((canvas) => (
          Number.isFinite(Number(canvas.__absAuditFrameCount))
          && canvas.getBoundingClientRect().width > 0
          && canvas.getBoundingClientRect().height > 0
        ));
        const startRenderedFrameCount = Number(auditCanvas?.__absAuditFrameCount) || 0;
        let previousObservedRenderedFrameCount = startRenderedFrameCount;
        let previousRenderedAt = 0;
        let previous = 0;
        await new Promise((resolveSample) => {
          const tick = (now) => {
            if (previous > 0) intervals.push(now - previous);
            previous = now;
            const observedRenderedFrameCount = Number(auditCanvas?.__absAuditFrameCount) || 0;
            if (observedRenderedFrameCount > previousObservedRenderedFrameCount) {
              if (previousRenderedAt > 0) renderedIntervals.push(now - previousRenderedAt);
              previousRenderedAt = now;
              previousObservedRenderedFrameCount = observedRenderedFrameCount;
            }
            if (now - start >= durationMs) resolveSample();
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        const runtime = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.() || null;
        const renderedFrameCount = auditCanvas
          ? Math.max(0, (Number(auditCanvas.__absAuditFrameCount) || 0) - startRenderedFrameCount)
          : null;
        const canvases = Array.from(document.querySelectorAll('canvas')).map((canvas) => {
          const rect = canvas.getBoundingClientRect();
          return {
            id: canvas.id || null,
            className: typeof canvas.className === 'string' ? canvas.className : null,
            cssWidth: Math.round(rect.width),
            cssHeight: Math.round(rect.height),
            width: canvas.width,
            height: canvas.height,
            backingDpr: rect.width > 0 ? canvas.width / rect.width : null,
            dataset: { ...canvas.dataset },
          };
        });
        const noise = document.querySelector('.noise');
        const chooser = document.querySelector('.simulation-focus-pill');
        return {
          intervals,
          renderedIntervals,
          runtime,
          renderedFrameCount,
          renderedFps: renderedFrameCount === null ? null : renderedFrameCount * 1000 / durationMs,
          visualCount: Number(window.__ABS_SIMULATION_VISUAL_TRANSITION__?.count) || null,
          device: {
            userAgent: navigator.userAgent,
            viewport: { width: innerWidth, height: innerHeight },
            screen: { width: screen.width, height: screen.height },
            browserDpr: devicePixelRatio,
          },
          canvases,
          effects: {
            noiseDisplay: noise ? getComputedStyle(noise).display : null,
            noiseAnimation: noise ? getComputedStyle(noise, '::before').animationName : null,
            chooserBackdrop: chooser ? getComputedStyle(chooser).backdropFilter : null,
          },
        };
        }, SAMPLE_MS);
        windowSamples.push({ windowStartSeconds, sample: windowSample });
      }
      const sample = windowSamples.at(-1).sample;

      deviceEvidence ||= sample.device;
      const intervals = sample.intervals.filter(Number.isFinite);
      const elapsed = intervals.reduce((sum, value) => sum + value, 0);
      const result = {
        id: entry.id,
        name: entry.name,
        surface: entry.surface,
        url,
        frameCount: intervals.length,
        rafFps: round(intervals.length * 1000 / Math.max(1, elapsed)),
        rafMeanMs: round(elapsed / Math.max(1, intervals.length)),
        rafP50Ms: round(percentile(intervals, 0.5)),
        rafP95Ms: round(percentile(intervals, 0.95)),
        rafP99Ms: round(percentile(intervals, 0.99)),
        longestGapMs: round(Math.max(...intervals, 0)),
        gapsOver25: intervals.filter((value) => value > 25).length,
        gapsOver50: intervals.filter((value) => value > 50).length,
        runtimeFps: round(sample.runtime?.adaptiveFps),
        renderedFrameCount: sample.renderedFrameCount,
        renderedFps: round(sample.renderedFps),
        targetFps: round(sample.runtime?.targetFps),
        throttleLevel: sample.runtime?.throttleLevel ?? null,
        objectOrPointCount: Number(sample.runtime?.ballCount)
          || sample.visualCount
          || null,
        renderedDpr: round(sample.runtime?.dpr ?? sample.canvases.find((canvas) => canvas.width > 1)?.backingDpr),
        effects: sample.effects,
        canvases: sample.canvases,
        consoleErrors,
        pageErrors,
        windows: windowSamples.map(({ windowStartSeconds, sample: windowSample }) => {
          const windowIntervals = windowSample.intervals.filter(Number.isFinite);
          const windowRenderedIntervals = windowSample.renderedIntervals.filter(Number.isFinite);
          const windowElapsed = windowIntervals.reduce((sum, value) => sum + value, 0);
          const renderedFps = windowSample.renderedFrameCount === null
            ? null
            : windowSample.renderedFrameCount * 1000 / SAMPLE_MS;
          return {
            startSeconds: windowStartSeconds,
            rafFps: round(windowIntervals.length * 1000 / Math.max(1, windowElapsed)),
            p95Ms: round(percentile(windowIntervals, 0.95)),
            p99Ms: round(percentile(windowIntervals, 0.99)),
            longestGapMs: round(Math.max(...windowIntervals, 0)),
            renderedP95Ms: round(percentile(windowRenderedIntervals, 0.95)),
            renderedP99Ms: round(percentile(windowRenderedIntervals, 0.99)),
            renderedFps: round(renderedFps),
            runtimeFps: round(windowSample.runtime?.adaptiveFps),
            throttleLevel: windowSample.runtime?.throttleLevel ?? null,
          };
        }),
      };
      const requiresContinuousFrames = entry.surface !== 'route-runtime';
      result.measurementKind = requiresContinuousFrames ? 'continuous-renderer' : 'interaction-driven-route';
      result.measuredFps = requiresContinuousFrames
        ? (result.renderedFps ?? result.runtimeFps ?? result.rafFps)
        : result.rafFps;
      const measuredWindows = result.windows.map((windowResult) => (
        requiresContinuousFrames
          ? (windowResult.renderedFps ?? windowResult.runtimeFps ?? windowResult.rafFps)
          : windowResult.rafFps
      ));
      const firstWindowFps = measuredWindows[0] ?? result.measuredFps;
      const lastWindowFps = measuredWindows.at(-1) ?? result.measuredFps;
      result.performanceDecayPercent = firstWindowFps > 0
        ? round(Math.max(0, (firstWindowFps - lastWindowFps) / firstWindowFps * 100))
        : null;
      result.performanceGatePassed = measuredWindows.every((fps) => fps >= MIN_FPS)
        && result.windows.every((windowResult) => windowResult.p95Ms <= 20 && windowResult.p99Ms <= 33.4)
        && (result.performanceDecayPercent === null || result.performanceDecayPercent <= 5)
        && result.windows.every((windowResult) => !windowResult.throttleLevel)
        && (!requiresContinuousFrames || result.windows.every((windowResult) => windowResult.renderedFps !== null))
        && consoleErrors.length === 0
        && pageErrors.length === 0;
      results.push(result);
      console.log(`${result.rafFps} rAF FPS, rendered ${result.renderedFps ?? 'n/a'}, runtime ${result.runtimeFps ?? 'n/a'}, gate ${result.performanceGatePassed ? 'PASS' : 'FAIL'}`);
    } catch (error) {
      results.push({ id: entry.id, name: entry.name, surface: entry.surface, error: error?.stack || String(error), consoleErrors, pageErrors });
      console.log(`ERROR: ${error?.message || error}`);
    } finally {
      await context.close();
    }
  }
} finally {
  await browser.close();
}

const successful = results.filter((result) => !result.error);
const ranked = [...successful].sort((a, b) => a.measuredFps - b.measuredFps);
const gateFailures = successful.filter((result) => !result.performanceGatePassed);
const output = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  commit: process.env.ABS_COMMIT || null,
  origin: ORIGIN,
  browser: `Playwright ${BROWSER_NAME}`,
  deviceProfile: DEVICE_NAME,
  orientation: ORIENTATION,
  minimumAcceptedFps: MIN_FPS,
  sampleMs: SAMPLE_MS,
  settleMs: SETTLE_MS,
  windowStartsSeconds: WINDOW_STARTS_SECONDS,
  catalogSha256: createHash('sha256').update(catalogText).digest('hex'),
  caveat: 'Desktop-hosted browser emulation does not reproduce physical iPhone GPU, thermal, memory, or power constraints.',
  deviceEvidence,
  summary: {
    simulationsExpected: entries.length,
    simulationsMeasured: successful.length,
    errors: results.length - successful.length,
    performanceGateFailures: gateFailures.map((result) => ({ id: result.id, measuredFps: result.measuredFps })),
    lowest: ranked[0] ? { id: ranked[0].id, measuredFps: ranked[0].measuredFps, p95Ms: ranked[0].rafP95Ms } : null,
    highest: ranked.at(-1) ? { id: ranked.at(-1).id, measuredFps: ranked.at(-1).measuredFps, p95Ms: ranked.at(-1).rafP95Ms } : null,
  },
  results,
};

await mkdir(resolve(OUTPUT_PATH, '..'), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.summary, null, 2));
console.log(`Wrote ${OUTPUT_PATH}`);

if (output.summary.errors > 0 || gateFailures.length > 0) process.exitCode = 1;
