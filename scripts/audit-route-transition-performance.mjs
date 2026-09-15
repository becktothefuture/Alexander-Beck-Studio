#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const engine = process.env.ABS_BROWSER || 'chromium';
const theme = process.env.ABS_TRANSITION_THEME || 'light';
const cpuRate = Number(process.env.ABS_TRANSITION_CPU_THROTTLE_RATE || 1);
const [width, height] = (process.env.ABS_TRANSITION_VIEWPORT || '1280x900').split('x').map(Number);
const baseUrl = process.env.ABS_DEV_URL || 'http://localhost:8015';
const tag = process.env.ABS_PERF_TAG || 'after';
const rounds = Number(process.env.ABS_PERF_ROUNDS || 2);
const output = resolve('output/playwright/route-transition-performance', `${tag}-${engine}-${width}x${height}-${theme}-${cpuRate}x`);
const steps = (process.env.ABS_TRANSITION_SEQUENCE || 'portfolio,about,home,contact,portfolio,home,about,contact,about,portfolio,contact,home').split(',');
const paths = { home: '/index.html', portfolio: '/portfolio.html', about: '/about.html', contact: '/contact.html' };
await mkdir(output, { recursive: true });
const browser = await ({ chromium, webkit })[engine].launch();
const context = await browser.newContext({ viewport: { width, height }, reducedMotion: 'no-preference' });
await context.addInitScript(({ theme }) => {
  if (window.top !== window) return;
  localStorage.setItem('theme-preference-v3', theme);
  const nativeRAF = window.requestAnimationFrame.bind(window);
  const state = { active: null, longTasks: [], eventTimings: [], longTasksSupported: PerformanceObserver.supportedEntryTypes.includes('longtask') };
  window.__routePerf = state;
  if (state.longTasksSupported) new PerformanceObserver(list => {
    for (const item of list.getEntries()) state.longTasks.push({ start: item.startTime, duration: item.duration });
  }).observe({ type: 'longtask', buffered: true });
  if (PerformanceObserver.supportedEntryTypes.includes('event')) new PerformanceObserver(list => {
    for (const item of list.getEntries()) state.eventTimings.push({ name: item.name, start: item.startTime, duration: item.duration, processingStart: item.processingStart, processingEnd: item.processingEnd });
  }).observe({ type: 'event', buffered: true, durationThreshold: 16 });
  document.addEventListener('pointerdown', event => {
    if (!state.active || !event.target.closest('[data-button-bar]')) return;
    state.active.input = performance.now();
  }, true);
  document.addEventListener('click', event => {
    if (!state.active || !event.target.closest('[data-button-bar]')) return;
    state.active.click = performance.now();
  }, true);
  const frame = t => {
    if (state.active) {
      // Deliberately no layout, computed style, Canvas readback or screenshots.
      const start = performance.now();
      const phase = document.documentElement.dataset.absTransitionPhase || 'idle';
      state.active.samples.push({ t, observedAt: start, phase });
      if (state.active.input && !state.active.firstInputFrame) state.active.firstInputFrame = start;
      state.active.maxRecorderCost = Math.max(state.active.maxRecorderCost, performance.now() - start);
    }
    nativeRAF(frame);
  };
  nativeRAF(frame);
}, { theme });
const page = await context.newPage();
if (cpuRate > 1) {
  if (engine !== 'chromium') throw new Error('CPU throttling requires Chromium');
  await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: cpuRate });
}
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const traces = [];
let failure;

function stats(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const percentile = p => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] || 0;
  return {
    frames: values.length, medianMs: percentile(0.5), p95Ms: percentile(0.95), worstMs: sorted.at(-1) || 0,
    over25Ms: values.filter(v => v > 25).length, over50Ms: values.filter(v => v > 50).length, over100Ms: values.filter(v => v > 100).length,
  };
}

function summarize(trace) {
  const phases = {};
  for (const phase of ['route-out', 'route-loading', 'route-in']) {
    const gaps = [];
    for (let i = 1; i < trace.samples.length; i++) {
      if (trace.samples[i - 1].phase === phase) gaps.push(trace.samples[i].t - trace.samples[i - 1].t);
    }
    phases[phase] = stats(gaps);
  }
  const firstOut = trace.samples.find(sample => sample.phase === 'route-out')?.observedAt;
  return {
    label: trace.label, round: trace.round,
    inputToNextFrameMs: trace.firstInputFrame - trace.input,
    clickToRouteOutFrameMs: firstOut - trace.click,
    recorderMaxMs: trace.maxRecorderCost,
    inputEvents: trace.eventTimings.filter(item => ['pointerdown', 'click'].includes(item.name)).map(item => ({ name: item.name, queueMs: item.processingStart - item.start, handlerMs: item.processingEnd - item.processingStart, presentationDurationMs: item.duration })),
    phases, longTasks: trace.longTasks,
  };
}

async function idle(route) {
  await page.waitForFunction(expected => {
    const root = document.documentElement;
    const overlay = document.getElementById('abs-boot-overlay');
    return root.dataset.shellRoute === expected && (root.dataset.absTransitionPhase || 'idle') === 'idle'
      && root.dataset.absBootState !== 'booting' && (!overlay || getComputedStyle(overlay).visibility === 'hidden' || getComputedStyle(overlay).display === 'none');
  }, route, { timeout: 90000, polling: 100 });
}

try {
  await page.goto(`${baseUrl}/index.html?mode=pit&absAudit=1`, { waitUntil: 'domcontentloaded' });
  await idle('home');
  await page.waitForTimeout(2000);
  let from = 'home';
  for (let round = 1; round <= rounds; round++) {
    for (const to of steps) {
      if (to === from) continue;
      await page.evaluate(({ label, round }) => {
        window.__routePerf.active = { label, round, started: performance.now(), samples: [], maxRecorderCost: 0 };
      }, { label: `${from}-to-${to}`, round });
      await page.locator(`[data-button-bar] a[href="${paths[to]}"]`).click();
      await idle(to);
      const trace = await page.evaluate(() => {
        const state = window.__routePerf;
        const trace = state.active;
        state.active = null;
        return { ...trace, ended: performance.now(), longTasks: state.longTasksSupported ? state.longTasks.filter(item => item.start >= trace.started) : null, eventTimings: state.eventTimings.filter(item => item.start >= trace.started) };
      });
      traces.push(trace);
      console.log(JSON.stringify(summarize(trace)));
      from = to;
    }
  }
} catch (error) {
  failure = error;
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ engine, baseUrl, theme, viewport: { width, height }, cpuRate, responseMetric: 'v2: performance.now() at event handlers and RAF callback; next-frame callback is a paint proxy. Event Timing duration includes next presentation when supported.', cache: 'Fresh browser context, site speculative prewarm enabled; round 2 reuses the document caches.', errors, failure: failure?.message, results: traces.map(summarize), traces }, null, 2));
  await browser.close();
}
if (failure) throw failure;
if (errors.length) throw new Error(errors.join('\n'));
console.log(`Report: ${output}/report.json`);
