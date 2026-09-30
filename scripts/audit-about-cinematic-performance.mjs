import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { cpus, platform, release } from 'node:os';
import { launchAboutAuditBrowser, waitForAboutSurfelRuntime, driveAboutStoryWU, percentile } from './audit-about-narrative-surfel-v2-helpers.mjs';

const browserName = process.env.ABS_BROWSER || 'chromium';
const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const output = `output/playwright/about-cinematic-performance/${browserName}`;
await mkdir(output, { recursive: true });
const browser = await launchAboutAuditBrowser(browserName);
const results = [];
try {
  // No video recording, pixel reads, tracing or per-frame diagnostic allocation
  // during these samples. This measures presented RAF cadence separately from
  // the renderer's own CPU timer and from the recording audit.
  for (const [profile, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
    const page = await context.newPage();
    await page.goto(`${baseUrl}/about.html?edit=0`);
    await waitForAboutSurfelRuntime(page, profile);
    await page.waitForSelector('[data-about-entrance-state="complete"]');
    await driveAboutStoryWU(page, 0);
    const sample = await page.evaluate(async () => {
      const canvas = document.querySelector('.about-narrative-world__canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const extension = gl.getExtension('WEBGL_debug_renderer_info');
      const renderer = extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
      const scrollport = document.querySelector('.about-narrative-scrollport');
      const maximum = scrollport.scrollHeight - scrollport.clientHeight;
      const times = new Float64Array(3000);
      let count = 0, start = 0, previous = 0;
      await new Promise(resolve => {
        const tick = time => {
          if (!start) start = time;
          if (previous && count < times.length) times[count++] = time - previous;
          previous = time;
          const progress = Math.min(1, (time - start) / 16000);
          scrollport.scrollTop = maximum * progress;
          scrollport.dispatchEvent(new Event('scroll'));
          if (progress < 1) requestAnimationFrame(tick);
          else resolve();
        };
        requestAnimationFrame(tick);
      });
      const metrics = window.__aboutNarrativeRuntime.getMetrics();
      return { renderer, frameIntervals: Array.from(times.subarray(0, count)),
        sourceHash: metrics.assetSourceHash, residentPoints: metrics.residentSurfelCount,
        bufferBuilds: metrics.gpuBufferBuilds, renderCpuMs: metrics.frameTimeMs };
    });
    const intervals = sample.frameIntervals;
    const fps = intervals.length * 1000 / intervals.reduce((sum, value) => sum + value, 0);
    const p95Ms = percentile(intervals, 0.95);
    const result = { profile, viewport, deviceScaleFactor: 1, physicalPhone: false,
      host: { platform: platform(), release: release(), cpu: cpus()[0]?.model },
      fps, p95Ms, over34ms: intervals.filter(value => value > 34).length, ...sample };
    results.push(result);
    assert.equal(sample.bufferBuilds, 1);
    await context.close();
    console.log(`${browserName} ${profile}: ${fps.toFixed(1)} FPS, RAF p95 ${p95Ms.toFixed(1)} ms; ${sample.renderer}`);
  }
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify(results, null, 2));
}
assert.ok(results.every(result => result.fps >= 55 && result.p95Ms <= 20),
  'The local reference did not sustain approximately 60 FPS. See the cadence report; emulation does not certify phone hardware.');
