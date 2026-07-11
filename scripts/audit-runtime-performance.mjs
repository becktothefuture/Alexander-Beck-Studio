#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, devices, webkit } from 'playwright';

const ORIGIN = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').replace(/\/+$/, '');
const SAMPLE_MS = Math.max(500, Number(process.env.ABS_PERF_SAMPLE_MS || 3000));
const SETTLE_MS = Math.max(500, Number(process.env.ABS_PERF_SETTLE_MS || 2000));
const READY_TIMEOUT_MS = Math.max(3000, Number(process.env.ABS_PERF_READY_TIMEOUT_MS || 15_000));
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const DEVICE_NAME = String(process.env.ABS_DEVICE || 'iPhone 13');
const OUTPUT_PATH = resolve(process.env.ABS_PERF_OUTPUT || `output/playwright/runtime-performance-${BROWSER_NAME}.json`);
const browserType = BROWSER_NAME === 'webkit' ? webkit : chromium;

if (!['chromium', 'webkit'].includes(BROWSER_NAME)) {
  throw new Error(`Unsupported ABS_BROWSER=${BROWSER_NAME}; use chromium or webkit.`);
}
if (!devices[DEVICE_NAME]) {
  throw new Error(`Unknown Playwright device profile: ${DEVICE_NAME}`);
}

const catalogPath = resolve('react-app/app/src/data/simulationCatalog.json');
const catalogText = await readFile(catalogPath, 'utf8');
const catalog = JSON.parse(catalogText);
const requestedIds = String(process.env.ABS_PERF_MODES || '')
  .split(',')
  .map((id) => id.trim())
  .filter(Boolean);
const dailyEntries = catalog.simulations.filter((entry) => entry.stage === 'daily-rotation');
const entries = requestedIds.length
  ? requestedIds.map((id) => dailyEntries.find((entry) => entry.id === id)).filter(Boolean)
  : dailyEntries;

function percentile(values, ratio) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * ratio) - 1))];
}

function round(value, digits = 2) {
  return Number.isFinite(Number(value)) ? Number(Number(value).toFixed(digits)) : null;
}

function entryUrl(entry) {
  const path = entry.surface === 'home-mode' ? '/index.html' : (entry.dailyHref || entry.launchPath);
  const url = new URL(path, `${ORIGIN}/`);
  if (entry.surface === 'home-mode') url.searchParams.set('mode', entry.id);
  else url.searchParams.set('daily', '1');
  url.searchParams.set('absAudit', '1');
  return url.toString();
}

const browser = await browserType.launch({ headless: process.env.ABS_HEADED !== '1' });
const results = [];
let deviceEvidence = null;

try {
  for (const entry of entries) {
    const context = await browser.newContext({
      ...devices[DEVICE_NAME],
      reducedMotion: 'no-preference',
      colorScheme: process.env.ABS_COLOR_SCHEME === 'dark' ? 'dark' : 'light',
    });
    const page = await context.newPage();
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
      } else {
        await page.waitForFunction(
          (id) => window.__ABS_SIMULATION_VISUAL_TRANSITION__?.sourceId === id
            && Array.from(document.querySelectorAll('canvas')).some((canvas) => canvas.width > 1 && canvas.height > 1),
          entry.id,
          { timeout: READY_TIMEOUT_MS },
        );
      }
      await page.waitForTimeout(SETTLE_MS);

      const sample = await page.evaluate(async (durationMs) => {
        const intervals = [];
        const start = performance.now();
        let previous = 0;
        await new Promise((resolveSample) => {
          const tick = (now) => {
            if (previous > 0) intervals.push(now - previous);
            previous = now;
            if (now - start >= durationMs) resolveSample();
            else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        const runtime = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.() || null;
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
        const film = document.querySelector('.studio-light-film-layer');
        const noise = document.querySelector('.noise');
        const chooser = document.querySelector('.simulation-focus-pill');
        return {
          intervals,
          runtime,
          visualCount: Number(window.__ABS_SIMULATION_VISUAL_TRANSITION__?.count) || null,
          device: {
            userAgent: navigator.userAgent,
            viewport: { width: innerWidth, height: innerHeight },
            screen: { width: screen.width, height: screen.height },
            browserDpr: devicePixelRatio,
          },
          canvases,
          effects: {
            filmDisplay: film ? getComputedStyle(film).display : null,
            noiseDisplay: noise ? getComputedStyle(noise).display : null,
            noiseAnimation: noise ? getComputedStyle(noise, '::before').animationName : null,
            chooserBackdrop: chooser ? getComputedStyle(chooser).backdropFilter : null,
          },
        };
      }, SAMPLE_MS);

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
      };
      results.push(result);
      console.log(`${result.rafFps} rAF FPS, runtime ${result.runtimeFps ?? 'n/a'}, p95 ${result.rafP95Ms}ms`);
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
const ranked = [...successful].sort((a, b) => a.rafFps - b.rafFps);
const output = {
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  commit: process.env.ABS_COMMIT || null,
  origin: ORIGIN,
  browser: `Playwright ${BROWSER_NAME}`,
  deviceProfile: DEVICE_NAME,
  sampleMs: SAMPLE_MS,
  settleMs: SETTLE_MS,
  catalogSha256: createHash('sha256').update(catalogText).digest('hex'),
  caveat: 'Desktop-hosted browser emulation does not reproduce physical iPhone GPU, thermal, memory, or power constraints.',
  deviceEvidence,
  summary: {
    simulationsExpected: entries.length,
    simulationsMeasured: successful.length,
    errors: results.length - successful.length,
    lowest: ranked[0] ? { id: ranked[0].id, rafFps: ranked[0].rafFps, p95Ms: ranked[0].rafP95Ms } : null,
    highest: ranked.at(-1) ? { id: ranked.at(-1).id, rafFps: ranked.at(-1).rafFps, p95Ms: ranked.at(-1).rafP95Ms } : null,
  },
  results,
};

await mkdir(resolve(OUTPUT_PATH, '..'), { recursive: true });
await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`);
console.log(JSON.stringify(output.summary, null, 2));
console.log(`Wrote ${OUTPUT_PATH}`);

if (output.summary.errors > 0) process.exitCode = 1;
