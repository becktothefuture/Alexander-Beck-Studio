#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { chromium, webkit } from 'playwright';
import { getGateInviteCode } from '../react-app/app/src/lib/access-gates.js';

// Isolated, bounded stress run. Never attaches to or closes a user's browser.
const exec = promisify(execFile);
const baseUrl = (process.env.ABS_WORK_URL || 'http://localhost:8012').replace(/\/$/, '');
const browserName = process.env.ABS_BROWSER || 'chromium';
const label = (process.env.ABS_PERF_LABEL || 'current').replace(/[^a-z0-9-]/gi, '-');
const rounds = Math.max(1, Math.min(6, Number(process.env.ABS_PERF_ROUNDS || 3)));
const output = resolve('output/playwright/work-performance',
  `${new Date().toISOString().replace(/[:.]/g, '-')}-${browserName}-${label}`);
const content = JSON.parse(await readFile('react-app/app/public/config/contents-portfolio.json', 'utf8'));
const cases = content.projects.map((item) => ({ id: `case-study-${item.id}`, type: 'case-study' }));
const snippets = ['image', 'video', 'code'].flatMap((type) => content.snippets.filter((item) => item.type === type).slice(0, 2));
const catalogue = [...cases, ...snippets];
const report = { label, browser: browserName, baseUrl, rounds, profiles: [], processes: [], errors: [] };
await mkdir(output, { recursive: true });
const server = await (browserName === 'webkit' ? webkit : chromium).launchServer({ headless: true });
const browser = await (browserName === 'webkit' ? webkit : chromium).connect(server.wsEndpoint());
const ownedBrowserPids = new Set([server.process().pid]);
const serviceRoots = [];
for (const port of [8012, 8014]) {
  try {
    const { stdout } = await exec('lsof', ['-t', `-iTCP:${port}`, '-sTCP:LISTEN']);
    serviceRoots.push(...stdout.trim().split(/\s+/).map(Number));
  } catch { /* A remote preview has no local service process. */ }
}
let phase = 'starting';
let sampling = false;
async function sampleProcesses() {
  if (sampling) return;
  sampling = true;
  try {
    const { stdout } = await exec('ps', ['-axo', 'pid=,ppid=,pcpu=,rss=,comm=']);
    const rows = stdout.trim().split('\n').map((line) => {
      const match = line.trim().match(/^(\d+)\s+(\d+)\s+([\d.]+)\s+(\d+)\s+(.+)$/);
      return match && { pid: +match[1], parent: +match[2], cpu: +match[3], rssKb: +match[4] };
    }).filter(Boolean);
    const collect = (roots) => {
      const ids = new Set(roots);
      for (let changed = true; changed;) {
        changed = false;
        for (const row of rows) if (ids.has(row.parent) && !ids.has(row.pid)) {
          ids.add(row.pid); changed = true;
        }
      }
      const selected = rows.filter((row) => ids.has(row.pid));
      return { count: selected.length, cpuPercent: selected.reduce((n, p) => n + p.cpu, 0),
        rssMb: selected.reduce((n, p) => n + p.rssKb, 0) / 1024, pids: selected.map((p) => p.pid) };
    };
    const browserProcesses = collect([...ownedBrowserPids]);
    browserProcesses.pids.forEach((pid) => ownedBrowserPids.add(pid));
    report.processes.push({ at: Date.now(), phase,
      browser: browserProcesses, development: collect(serviceRoots) });
  } finally { sampling = false; }
}
const processTimer = setInterval(() => sampleProcesses().catch((error) => report.errors.push(error.message)), 1000);

const percentile = (values, p) => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * p))] || 0;
};
const delta = (after, before, key) => (after[key] || 0) - (before[key] || 0);

async function runProfile(profile) {
  const context = await browser.newContext({ ...profile.options, colorScheme: 'dark' });
  const page = await context.newPage();
  page.setDefaultTimeout(30_000);
  page.on('pageerror', (error) => report.errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') report.errors.push(message.text());
  });
  const cdp = browserName === 'chromium' ? await context.newCDPSession(page) : null;
  if (cdp) await cdp.send('Performance.enable');
  const metrics = async () => cdp
    ? Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(({ name, value }) => [name, value]))
    : {};
  const result = { name: profile.name, viewport: profile.options.viewport,
    engineMetrics: cdp ? 'cdp' : 'unavailable', cycles: [], checkpoints: [], pans: [] };
  report.profiles.push(result);
  const idle = async () => page.waitForFunction(() => {
    const s = window.__ABS_WORK__?.getSnapshot();
    return s?.ready && s.dotField.routeVisualScale >= 0.999 && !s.camera.frameScheduled
      && !s.dotField.frameScheduled && !s.selectedId;
  });
  const position = async (id, offset = 90) => {
    await page.evaluate(({ id, offset }) => {
      const api = window.__ABS_WORK__;
      const s = api.getSnapshot();
      const item = s.placements.find((entry) => entry.id === id);
      const spacing = s.dotField.gridSpacingPx;
      api.setCamera((item.xCell + item.widthCells / 2) * spacing - offset / (s.camera.worldScale * item.parallax),
        (item.yCell + item.footprintHeightCells / 2) * spacing);
    }, { id, offset });
    await idle();
  };
  const startSamples = async () => {
    await page.evaluate(() => {
      const state = { frames: [], longTasks: [], running: true, last: 0 };
      const tick = (now) => {
        if (!state.running) return;
        if (state.last) state.frames.push(now - state.last);
        state.last = now;
        state.raf = requestAnimationFrame(tick);
      };
      if (PerformanceObserver.supportedEntryTypes.includes('longtask')) {
        state.observer = new PerformanceObserver((list) => {
          state.longTasks.push(...list.getEntries().map((entry) => entry.duration));
        });
        state.observer.observe({ type: 'longtask' });
      }
      state.raf = requestAnimationFrame(tick);
      window.__workPerfAudit = state;
    });
  };
  const stopSamples = async () => {
    const samples = await page.evaluate(() => {
      const s = window.__workPerfAudit;
      s.running = false;
      cancelAnimationFrame(s.raf);
      s.observer?.disconnect();
      const result = { frames: s.frames, longTasks: s.longTasks };
      delete window.__workPerfAudit;
      return result;
    });
    return { frameP50Ms: percentile(samples.frames, 0.5), frameP95Ms: percentile(samples.frames, 0.95),
      frameMaxMs: Math.max(0, ...samples.frames), frames: samples.frames.length,
      over34Ms: samples.frames.filter((n) => n > 34).length,
      longTasks: samples.longTasks.length, longestTaskMs: Math.max(0, ...samples.longTasks) };
  };
  const checkpoint = async (name) => {
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    // Collection happens outside timed interactions; this measures retained heap,
    // not live allocation peaks or a claim that normal browsing invokes GC.
    if (cdp) await cdp.send('HeapProfiler.collectGarbage');
    const m = await metrics();
    const dom = await page.evaluate(() => {
      const state = window.__ABS_WORK__.getSnapshot();
      return { nodes: document.querySelectorAll('*').length, iframes: document.querySelectorAll('iframe').length,
        videos: document.querySelectorAll('video').length,
        playingVideos: [...document.querySelectorAll('video')].filter((v) => !v.paused).length,
        decodedImageSources: [...new Set([...document.images]
          .filter((image) => image.complete && image.naturalWidth > 0).map((image) => image.currentSrc))].sort(),
        semanticItems: document.querySelectorAll('[data-playground-item]').length,
        stages: document.querySelectorAll('[data-work-snippet-stage]').length,
        activeVideoCount: state.diagnostics.activeVideoCount,
        activeIframeCount: state.diagnostics.activeIframeCount,
        camera: state.camera.frameScheduled, dots: state.dotField.frameScheduled };
    });
    assert.equal(dom.semanticItems, 36);
    assert.equal(dom.stages, 0);
    assert(dom.activeVideoCount <= 1 && dom.activeIframeCount <= 1, JSON.stringify(dom));
    assert(!dom.camera && !dom.dots, 'Camera and dots must settle after every cycle');
    result.checkpoints.push({ name, ...dom, heapMb: cdp ? m.JSHeapUsedSize / 1048576 : null,
      listeners: m.JSEventListeners, documents: m.Documents, retainedNodes: m.Nodes });
  };
  try {
    phase = `${profile.name}:load`;
    await page.goto(`${baseUrl}/portfolio.html`, { waitUntil: 'domcontentloaded' });
    await idle();
    await page.waitForFunction(() => document.querySelector('[data-work-experience]')?.dataset.playgroundInteractive === 'true');
    await page.waitForFunction(() => {
      const root = document.querySelector('[data-work-experience]');
      return root?.dataset.routeMaterialState === 'complete'
        && root.getAnimations({ subtree: true }).every((animation) =>
          animation.effect?.getTiming().iterations === Infinity || animation.playState !== 'running');
    });
    result.geometry = await page.evaluate(() => ({
      viewport: document.querySelector('[data-playground-viewport]').getBoundingClientRect().toJSON(),
      media: [...document.querySelectorAll('[data-playground-item]')].map((el) => {
        const rect = el.querySelector('.portfolio-project-card__surface, .playground-media').getBoundingClientRect();
        return { id: el.dataset.playgroundItem, width: rect.width, height: rect.height, diagonal: Math.hypot(rect.width, rect.height) };
      }),
    }));
    await page.screenshot({ path: resolve(output, `${profile.name}-initial.png`) });

    const cycle = async (item, index, measured) => {
      phase = `${profile.name}:${measured ? 'cycle' : 'warmup'}:${item.id}`;
      await position(item.id, profile.name === 'mobile' ? 25 : 90);
      if (measured) await startSamples();
      const before = await metrics();
      const started = performance.now();
      let openMs;
      const button = page.locator(`[data-playground-item="${item.id}"] button`);
      if (profile.options.hasTouch) await button.tap(); else await button.click();
      if (item.type === 'case-study') {
        if (!(await page.locator('[data-work-presentation-phase="open"]').count())) {
          await page.waitForFunction(() => Boolean(document.querySelector('[data-portfolio-access-gate][data-phase="open"]')
            || document.querySelector('[data-work-presentation-phase="open"]')));
          if (await page.locator('[data-portfolio-access-gate]').count()) {
            const code = getGateInviteCode('portfolio');
            const inputs = page.locator('.portfolio-access-gate .portfolio-digit');
            for (let i = 0; i < code.length; i += 1) await inputs.nth(i).fill(code[i]);
          }
        }
        await page.locator('[data-work-presentation-phase="open"]').waitFor();
        openMs = performance.now() - started;
        await page.locator('.portfolio-project-view__drawer').evaluate((el) => { el.scrollTop = Math.min(350, el.scrollHeight); });
      } else {
        await page.locator('[data-work-snippet-stage][data-phase="open"]').waitFor();
        openMs = performance.now() - started;
        if (item.type === 'video') await page.waitForFunction(() => document.querySelector('.work-snippet-stage video')?.videoWidth > 0);
        if (item.type === 'code') await page.locator('.work-snippet-stage iframe').waitFor();
      }
      const mediaReadyMs = performance.now() - started;
      const mediaOwnership = await page.evaluate(() => ({
        backgroundVideos: document.querySelectorAll('[data-playground-world] video').length,
        backgroundIframes: document.querySelectorAll('[data-playground-world] iframe').length,
        stageVideos: document.querySelectorAll('[data-work-snippet-stage] video').length,
        stageIframes: document.querySelectorAll('[data-work-snippet-stage] iframe').length,
      }));
      assert.equal(mediaOwnership.backgroundVideos + mediaOwnership.backgroundIframes, 0,
        'Expanded projects must suspend background video/code runtimes.');
      assert(mediaOwnership.stageVideos + mediaOwnership.stageIframes <= 1);
      if (index % 3 === 0) await page.goBack();
      else if (index % 3 === 1 || item.type === 'case-study') await page.keyboard.press('Escape');
      else await page.locator('.work-snippet-stage__close').click();
      if (item.type === 'case-study') {
        await page.locator('[data-work-presentation-phase="closed"]').waitFor({ state: 'attached' });
        await page.waitForFunction(() => document.querySelector('#portfolio-sheet-host')?.getAttribute('aria-hidden') === 'true');
      }
      await idle();
      await page.locator('[data-work-snippet-stage]').waitFor({ state: 'detached' });
      assert.equal(await button.getAttribute('aria-expanded'), 'false');
      const after = await metrics();
      if (measured) result.cycles.push({ id: item.id, type: item.type, openMs, mediaReadyMs,
        totalMs: performance.now() - started, mediaOwnership, ...(await stopSamples()),
        taskMs: delta(after, before, 'TaskDuration') * 1000,
        layoutMs: delta(after, before, 'LayoutDuration') * 1000,
        styleMs: delta(after, before, 'RecalcStyleDuration') * 1000 });
    };
    // Warm every repeated asset before comparing retained memory or timings.
    for (const [index, item] of catalogue.entries()) await cycle(item, index, false);
    console.log(`${profile.name}: twelve-project warmup complete`);
    await position(catalogue[0].id, 0);
    await checkpoint('warm');
    for (let round = 0; round < rounds; round += 1) {
      for (const [index, item] of catalogue.entries()) await cycle(item, index, true);
      await position(catalogue[0].id, 0);
      await checkpoint(`round-${round + 1}`);
      console.log(`${profile.name}: ${result.cycles.length} open/close cycles complete`);
    }
    for (let pass = 0; pass < 3; pass += 1) {
      phase = `${profile.name}:pan-${pass}`;
      await page.evaluate(() => window.__ABS_WORK__.setCamera(0, 0));
      await idle();
      await startSamples();
      const before = await metrics();
      const rect = await page.locator('[data-playground-viewport]').boundingBox();
      await page.mouse.move(rect.x + rect.width / 2, rect.y + rect.height / 2);
      await page.mouse.down();
      for (let step = 0; step < 90; step += 1) {
        await page.mouse.move(rect.x + rect.width / 2 + Math.sin(step / 13) * Math.min(280, rect.width / 3),
          rect.y + rect.height / 2 + Math.sin(step / 19) * Math.min(150, rect.height / 4));
      }
      await page.mouse.up();
      await idle();
      const after = await metrics();
      result.pans.push({ pass, ...(await stopSamples()),
        taskMs: delta(after, before, 'TaskDuration') * 1000,
        scriptMs: delta(after, before, 'ScriptDuration') * 1000,
        layoutMs: delta(after, before, 'LayoutDuration') * 1000,
        layouts: delta(after, before, 'LayoutCount'),
        styleMs: delta(after, before, 'RecalcStyleDuration') * 1000,
        styles: delta(after, before, 'RecalcStyleCount') });
    }
    phase = `${profile.name}:idle`;
    await page.evaluate(() => window.__ABS_WORK__.setCamera(0, 0));
    await idle();
    const before = await metrics();
    const beforeDraw = await page.evaluate(() => window.__ABS_WORK__.getSnapshot().dotField.drawCount);
    await page.waitForTimeout(2000);
    const after = await metrics();
    const afterDraw = await page.evaluate(() => window.__ABS_WORK__.getSnapshot().dotField.drawCount);
    assert.equal(afterDraw, beforeDraw, 'An idle depth field must not redraw');
    result.idle = { durationMs: 2000, dotDraws: afterDraw - beforeDraw,
      taskMs: delta(after, before, 'TaskDuration') * 1000 };
    await page.screenshot({ path: resolve(output, `${profile.name}-after.png`) });
    const first = result.checkpoints[0];
    const last = result.checkpoints.at(-1);
    result.retention = { heapGrowthMb: cdp ? last.heapMb - first.heapMb : null,
      nodesDelta: last.nodes - first.nodes, listenersDelta: cdp ? last.listeners - first.listeners : null,
      documentsDelta: cdp ? last.documents - first.documents : null };
    assert(last.nodes <= first.nodes + 12, `DOM grew across repeated cycles: ${JSON.stringify(result.retention)}`);
    if (cdp) {
      assert(last.heapMb - first.heapMb < 8, `Retained heap grew unexpectedly: ${JSON.stringify(result.retention)}`);
      assert(last.documents <= first.documents + 2, 'Repeated projects retained extra documents.');
      assert(last.listeners <= first.listeners + 24, `Listeners grew across cycles: ${JSON.stringify(result.retention)}`);
    }
  } finally { await context.close(); }
}

try {
  await sampleProcesses();
  await runProfile({ name: 'desktop', options: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } });
  await runProfile({ name: 'mobile', options: { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true } });
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.failure = error.stack;
  process.exitCode = 1;
} finally {
  clearInterval(processTimer);
  await browser.close();
  await server.close();
  phase = 'closed';
  while (sampling) await new Promise((resolve) => setTimeout(resolve, 25));
  await sampleProcesses();
  if (report.processes.at(-1)?.browser.count !== 0) {
    report.errors.push('The disposable browser left running processes.');
    report.passed = false;
    process.exitCode = 1;
  }
  await writeFile(resolve(output, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify({ passed: report.passed || false, output, failure: report.failure,
    profiles: report.profiles.map(({ name, cycles, pans, retention, idle }) => ({ name, cycles: cycles.length, pans, retention, idle })) }, null, 2));
}
