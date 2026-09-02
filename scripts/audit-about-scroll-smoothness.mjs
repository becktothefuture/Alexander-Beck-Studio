import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { launchAboutAuditBrowser, waitForAboutSurfelRuntime } from './audit-about-narrative-surfel-v2-helpers.mjs';

const out = resolve(process.env.ABS_PROFILE_OUTPUT || 'output/playwright/about-scroll-smoothness');
const checkEditor = process.env.ABS_PROFILE_EDITOR === '1';
await mkdir(out, { recursive: true });
const browser = await launchAboutAuditBrowser('chromium');
const reports = [];
try {
  for (const name of (process.env.ABS_PROFILE_PROFILES || 'desktop,mobile').split(',')) {
    const mobile = name === 'mobile';
    const context = await browser.newContext({
      viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
      deviceScaleFactor: mobile ? 3 : 1,
      isMobile: mobile,
      hasTouch: mobile,
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (checkEditor) {
      await page.route('**/AboutNarrativeParameterPanel.jsx*', async route => {
        const response = await route.fetch();
        const source = await response.text();
        const marker = 'const getParameterSnapshot = useMemo(';
        assert.ok(source.includes(marker), 'The development panel render probe was not installed');
        await route.fulfill({ response, body: source.replace(marker,
          `window.__aboutPanelRenderCount = (window.__aboutPanelRenderCount || 0) + 1;\n${marker}`) });
      });
    }
    await page.addInitScript(() => {
      window.__scrollProfile = { historyWrites: 0 };
      const original = history.replaceState.bind(history);
      history.replaceState = (...args) => {
        window.__scrollProfile.historyWrites++;
        return original(...args);
      };
    });
    await page.goto(`${process.env.ABS_BASE_URL || 'http://127.0.0.1:8013'}/about.html?preview=about&edit=0`, { waitUntil: 'domcontentloaded' });
    await waitForAboutSurfelRuntime(page, name);
    await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete');
    if (checkEditor) {
      await page.locator('[data-about-scene-parameters][data-panel-state="ready"]').waitFor({ state: 'attached' });
      assert.ok(await page.evaluate(() => window.__aboutPanelRenderCount > 0));
    }
    const session = await context.newCDPSession(page);
    await session.send('Performance.enable');
    if (process.env.ABS_CPU_RATE) await session.send('Emulation.setCPUThrottlingRate', { rate: Number(process.env.ABS_CPU_RATE) });
    const { result } = await session.send('Runtime.evaluate', { expression: 'document.querySelector(".about-narrative-scrollport")' });
    const { listeners } = await session.send('DOMDebugger.getEventListeners', { objectId: result.objectId });
    const cancelableScrollListeners = listeners.filter((listener) => (
      ['wheel', 'touchmove'].includes(listener.type) && !listener.passive
    ));
    if (mobile) {
      assert.equal(cancelableScrollListeners.length, 0, `${name}: About must preserve native touch momentum`);
    } else {
      assert.ok(cancelableScrollListeners.some((listener) => listener.type === 'wheel'),
        `${name}: the fine-pointer wheel transport is not active`);
    }
    const profile = { name, browserVersion: browser.version(), checkEditor, deviceScaleFactor: mobile ? 3 : 1, cpuRate: Number(process.env.ABS_CPU_RATE || 1), listeners: listeners.map(({ type, passive, useCapture }) => ({ type, passive, useCapture })), segments: [], errors };
    const wholeJourney = process.env.ABS_PROFILE_JOURNEY === '1';
    const segments = wholeJourney
      ? [{ id: 'journey-forward', start: 0, direction: 1 }, { id: 'journey-reverse', start: 1, direction: -1 }]
      : [{ id: 'editorial-forward', start: 0.22, direction: 1 }, { id: 'gates-forward', start: 0.7, direction: 1 }, { id: 'gates-reverse', start: 0.83, direction: -1 }];
    for (const segment of segments) {
      await page.evaluate(start => {
        const port = document.querySelector('.about-narrative-scrollport');
        port.scrollTop = (port.scrollHeight - port.clientHeight) * start;
      }, segment.start);
      await page.waitForTimeout(1200);
      const point = await page.locator('.about-narrative-scrollport').boundingBox();
      const speed = mobile ? 380 : 850;
      const travel = await page.locator('.about-narrative-scrollport').evaluate(port => port.scrollHeight - port.clientHeight);
      const duration = wholeJourney ? travel / speed : Number(process.env.ABS_PROFILE_DURATION || 4);
      await page.evaluate(() => {
        const stats = window.__scrollProfile;
        const port = document.querySelector('.about-narrative-scrollport');
        stats.historyWrites = 0;
        stats.raf = [];
        stats.longFrames = [];
        stats.started = performance.now();
        stats.initialTop = port.scrollTop;
        stats.initialEditorRenders = window.__aboutPanelRenderCount || 0;
        stats.previous = 0;
        stats.longFrameSupported = PerformanceObserver.supportedEntryTypes.includes('long-animation-frame');
        stats.observe = new PerformanceObserver(list => {
          for (const entry of list.getEntries()) stats.longFrames.push({ start: entry.startTime, duration: entry.duration, blocking: entry.blockingDuration, scripts: entry.scripts?.map(s => ({ function: s.sourceFunctionName, url: s.sourceURL, duration: s.duration, forcedStyleAndLayoutDuration: s.forcedStyleAndLayoutDuration })) });
        });
        stats.observe.observe({ type: 'long-animation-frame' });
        const sample = time => {
          if (stats.previous) stats.raf.push([time - stats.previous]);
          stats.previous = time;
          stats.frame = requestAnimationFrame(sample);
        };
        stats.frame = requestAnimationFrame(sample);
      });
      const before = await session.send('Performance.getMetrics');
      if (process.env.ABS_CPU_PROFILE === '1') {
        await session.send('Profiler.enable');
        await session.send('Profiler.start');
      }
      await session.send('Input.synthesizeScrollGesture', {
        x: point.x + point.width * 0.6,
        y: point.y + point.height * 0.65,
        yDistance: -segment.direction * speed * duration,
        speed,
        preventFling: true,
        gestureSourceType: mobile ? 'touch' : 'mouse',
      });
      const after = await session.send('Performance.getMetrics');
      const stats = await page.evaluate(() => {
        const stats = window.__scrollProfile;
        cancelAnimationFrame(stats.frame);
        stats.observe.disconnect();
        return { duration: performance.now() - stats.started, initialTop: stats.initialTop, finalTop: document.querySelector('.about-narrative-scrollport').scrollTop, historyWrites: stats.historyWrites, editorRenders: (window.__aboutPanelRenderCount || 0) - stats.initialEditorRenders, frames: stats.raf, longFrames: stats.longFrames, longFrameSupported: stats.longFrameSupported };
      });
      if (process.env.ABS_CPU_PROFILE === '1') {
        const { profile: cpu } = await session.send('Profiler.stop');
        await writeFile(resolve(out, `${name}-${segment.id}.cpuprofile`), JSON.stringify(cpu));
      }
      const intervals = stats.frames.map(frame => frame[0]).sort((a, b) => a - b);
      const percentile = p => intervals[Math.min(intervals.length - 1, Math.floor(intervals.length * p))];
      const beforeMap = Object.fromEntries(before.metrics.map(m => [m.name, m.value]));
      const costs = Object.fromEntries(after.metrics.filter(m => /Duration|Count/.test(m.name)).map(m => [m.name, Number((m.value - beforeMap[m.name]).toFixed(6))]));
      assert.ok((stats.finalTop - stats.initialTop) * segment.direction > speed * duration * 0.9, `${name}: the native gesture was intercepted or reversed`);
      assert.equal(stats.longFrameSupported, true, `${name}: this browser cannot observe long animation frames`);
      assert.ok(intervals.length >= duration * 30, `${name}: fewer than 30 presented frame samples per second`);
      assert.ok(intervals.every(value => Number.isFinite(value) && value > 0), `${name}: invalid frame timing sample`);
      // A 60 Hz desktop/mobile review allows isolated compositor misses, but
      // rejects sustained half-rate rendering or user-visible stalls. Run
      // without video capture; CPU throttling is a separate stress profile.
      assert.ok(percentile(0.95) <= 20, `${name}: p95 frame interval exceeds the 60 Hz review budget`);
      assert.ok(intervals.filter(value => value > 50).length / intervals.length <= 0.01,
        `${name}: more than 1% of frames exceed 50 ms`);
      assert.ok(intervals.at(-1) <= 100, `${name}: a scroll frame stalled for more than 100 ms`);
      assert.ok(stats.historyWrites <= Math.ceil(stats.duration / 250) + 2, `${name}: scroll frames are writing history`);
      if (checkEditor) assert.ok(stats.editorRenders <= 1, `${name}: scrolling repeatedly renders the parameter form`);
      const settled = await page.evaluate(async () => {
        await new Promise(requestAnimationFrame);
        await new Promise(requestAnimationFrame);
        const port = document.querySelector('.about-narrative-scrollport');
        const indicator = document.querySelector('.about-narrative-indicator');
        const metrics = window.__aboutNarrativeRuntime.getMetrics();
        return {
          scrollProgress: port.scrollTop / (port.scrollHeight - port.clientHeight),
          storyWU: metrics.storyWU,
          pointCount: metrics.residentSurfelCount,
          bufferBuilds: metrics.gpuBufferBuilds,
          indicatorProgress: Number(indicator.getAttribute('aria-valuenow')),
          activeTicks: indicator.querySelectorAll('[data-active="true"]').length,
          camera: metrics.cameraPosition,
          legacyRootVariable: document.querySelector('.about-narrative-lab').style.getPropertyValue('--narrative-story-wu'),
        };
      });
      assert.equal(settled.indicatorProgress, Math.round(settled.scrollProgress * 100));
      assert.equal(settled.activeTicks, 2);
      assert.equal(settled.pointCount, mobile ? 30_000 : 90_000);
      assert.equal(settled.bufferBuilds, 1);
      assert.equal(settled.legacyRootVariable, '', 'an unused inherited variable is invalidating all text every frame');
      const summary = { segment: segment.id, duration: stats.duration, scrollDistance: stats.finalTop - stats.initialTop, frames: intervals.length, rafP50: percentile(0.5), rafP95: percentile(0.95), rafMax: intervals.at(-1), framesOver25ms: intervals.filter(t => t > 25).length, historyWrites: stats.historyWrites, editorRenders: stats.editorRenders, longFrames: stats.longFrames.length, costs };
      profile.segments.push({ ...summary, settled });
      await writeFile(resolve(out, `${name}-${segment.id}.json`), JSON.stringify(stats, null, 2));
      console.log(JSON.stringify({ name, ...summary }));
    }
    if (mobile) {
      await page.evaluate(() => {
        const port = document.querySelector('.about-narrative-scrollport');
        port.scrollTop = (port.scrollHeight - port.clientHeight) * 0.55;
      });
      await page.waitForTimeout(300);
      const point = await page.locator('.about-narrative-scrollport').boundingBox();
      const readTop = () => page.locator('.about-narrative-scrollport').evaluate(port => port.scrollTop);
      const start = await readTop();
      await session.send('Input.synthesizeScrollGesture', {
        x: point.x + point.width * 0.6,
        y: point.y + point.height * 0.7,
        yDistance: -280,
        speed: 1100,
        preventFling: false,
        gestureSourceType: 'touch',
      });
      const released = await readTop();
      await page.waitForTimeout(180);
      const coasting = await readTop();
      assert.ok(released > start, 'native touch did not move the page');
      assert.ok(coasting - released > 8, 'touch momentum was stopped at finger release');
      profile.touchMomentum = { start, released, coasting, distanceAfterRelease: coasting - released };
      console.log(JSON.stringify({ name, touchMomentum: profile.touchMomentum }));
    }
    if (checkEditor) {
      await page.keyboard.press('/');
      const panel = page.locator('[data-about-scene-parameters]');
      await panel.waitFor({ state: 'visible' });
      const opacity = panel.getByRole('slider', { name: 'Point cloud Circle opacity', exact: true });
      const before = await opacity.inputValue();
      const minimum = Number(await opacity.getAttribute('min'));
      await opacity.focus();
      await opacity.press(Number(before) > minimum ? 'ArrowLeft' : 'ArrowRight');
      const changed = await opacity.inputValue();
      assert.notEqual(changed, before, 'The parameter form no longer applies edits');
      await page.waitForFunction(() => document.querySelector('[data-about-scene-parameters]')?.dataset.panelState === 'dirty');
      assert.equal(await panel.getByRole('button', { name: 'Save', exact: true }).isEnabled(), true);
      await panel.getByRole('button', { name: 'Revert', exact: true }).click();
      await page.waitForFunction(() => document.querySelector('[data-about-scene-parameters]')?.dataset.panelState === 'ready');
      assert.equal(await opacity.inputValue(), before, 'Revert did not update the parameter form');
      profile.editorControls = { before, changed, reverted: await opacity.inputValue(), saved: false };
    }
    assert.deepEqual(errors, []);
    reports.push(profile);
    await writeFile(resolve(out, 'report.json'), JSON.stringify(reports, null, 2));
    await context.close();
  }
} finally {
  await browser.close();
}
