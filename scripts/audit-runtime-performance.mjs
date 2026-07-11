#!/usr/bin/env node
import { chromium, devices } from 'playwright';

const ORIGIN = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').replace(/\/+$/, '');
const SAMPLE_MS = Math.max(500, Number(process.env.ABS_PERF_SAMPLE_MS || 1200));
const READY_TIMEOUT_MS = Math.max(3000, Number(process.env.ABS_PERF_READY_TIMEOUT_MS || 8000));
const MODES = String(process.env.ABS_PERF_MODES || [
  'pit', 'shapes', 'flies', '3d-cube', 'water', '3d-sphere',
  'flubber-blob', 'weave-field', 'kaleidoscope-3', 'bubbles',
  'starfield-3d', 'kaleidoscope-rift',
].join(','))
  .split(',')
  .map((mode) => mode.trim())
  .filter(Boolean);

function percentile(values, ratio) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
}

function round(value, digits = 1) {
  return Number(Number(value || 0).toFixed(digits));
}

const browser = await chromium.launch({ headless: process.env.ABS_HEADED !== '1' });
const context = await browser.newContext({
  ...devices['iPhone 13'],
});
const page = await context.newPage();
const results = [];

try {
  for (const mode of MODES) {
    console.log(`Sampling ${mode}...`);
    try {
      const url = new URL('/index.html', `${ORIGIN}/`);
      url.searchParams.set('mode', mode);
      url.searchParams.set('absAudit', '1');
      await page.goto(url.toString(), { waitUntil: 'networkidle', timeout: 60_000 });
      await page.waitForFunction(
        (expectedMode) => window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().mode === expectedMode,
        mode,
        { timeout: READY_TIMEOUT_MS }
      );

      const sample = await page.evaluate((durationMs) => new Promise((resolve) => {
      const intervals = [];
      let previous = 0;
      const start = performance.now();
      const tick = (now) => {
        if (previous > 0) intervals.push(now - previous);
        previous = now;
        if (now - start >= durationMs) {
          resolve({ intervals, runtime: window.__ABS_HOME_AUDIT__.getRuntimeSnapshot() });
          return;
        }
        requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      }), SAMPLE_MS);

      const meanInterval = sample.intervals.reduce((sum, value) => sum + value, 0)
        / Math.max(1, sample.intervals.length);
      results.push({
        mode,
        ballCount: sample.runtime.ballCount,
        dpr: sample.runtime.dpr,
        targetFps: round(sample.runtime.targetFps),
        adaptiveFps: round(sample.runtime.adaptiveFps),
        throttleLevel: sample.runtime.throttleLevel,
        rafFps: round(1000 / Math.max(1, meanInterval)),
        rafP95Ms: round(percentile(sample.intervals, 0.95), 2),
      });
    } catch (error) {
      results.push({ mode, error: error?.message || String(error) });
    }
  }
} finally {
  await context.close();
  await browser.close();
}

console.table(results);
console.log(JSON.stringify({ device: 'iPhone 13 emulation', sampleMs: SAMPLE_MS, results }, null, 2));
