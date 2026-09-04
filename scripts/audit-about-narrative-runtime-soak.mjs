import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import {
  ABOUT_SURFEL_OUTPUT_DIR,
  ABOUT_SURFEL_PROFILES,
  assertAboutSurfelMetrics,
  collectPageErrors,
  ensureAboutSurfelOutputDirectory,
  getAboutSurfelState,
  launchAboutAuditBrowser,
  percentile,
  waitForAboutSurfelRuntime,
} from './audit-about-narrative-surfel-v2-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const profile = process.env.ABS_ABOUT_SOAK_PROFILE === 'mobile' ? 'mobile' : 'desktop';
const iterations = Math.max(240, Number(process.env.ABS_ABOUT_SOAK_ITERATIONS || 1_000));
const expected = ABOUT_SURFEL_PROFILES[profile];

await ensureAboutSurfelOutputDirectory();
const browser = await launchAboutAuditBrowser('chromium');
const context = await browser.newContext({ viewport: expected.viewport });
const page = await context.newPage();
const consoleErrors = collectPageErrors(page);

async function drive(count) {
  const sampleCount = Math.min(100, Math.max(12, Math.ceil(count / 50)));
  const observationDurationMs = Math.ceil((count / 60) * 1_000);
  const sampleIntervalMs = Math.max(16, Math.ceil(observationDurationMs / sampleCount));
  const frameTimes = [];
  for (let index = 0; index < sampleCount; index += 1) {
    await page.evaluate(({ sampleIndex }) => {
      const scrollport = document.querySelector('.about-narrative-scrollport');
      const maximum = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
      const checkpoint = sampleIndex % 10;
      const forward = Math.floor(sampleIndex / 10) % 2 === 0;
      const progress = forward ? checkpoint / 9 : 1 - (checkpoint / 9);
      scrollport.scrollTop = maximum * progress;
      scrollport.dispatchEvent(new Event('scroll', { bubbles: false }));
    }, { sampleIndex: index });
    await page.waitForTimeout(sampleIntervalMs);
    frameTimes.push(await page.evaluate(
      () => window.__aboutNarrativeRuntime.getMetrics().frameTimeMs,
    ));
  }
  return frameTimes;
}

try {
  await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
  await waitForAboutSurfelRuntime(page, profile);
  await drive(120);
  const cold = await getAboutSurfelState(page);
  assertAboutSurfelMetrics(cold.metrics, profile);

  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage');
  const before = {
    state: await getAboutSurfelState(page),
    heapBytes: await page.evaluate(() => performance.memory?.usedJSHeapSize || 0),
  };
  const frameTimes = await drive(iterations);
  await cdp.send('HeapProfiler.collectGarbage');
  const after = {
    state: await getAboutSurfelState(page),
    heapBytes: await page.evaluate(() => performance.memory?.usedJSHeapSize || 0),
  };
  assertAboutSurfelMetrics(after.state.metrics, profile);
  assert.equal(after.state.metrics.gpuBufferBuilds, before.state.metrics.gpuBufferBuilds);
  assert.equal(after.state.metrics.bufferRebuilds, before.state.metrics.bufferRebuilds);
  assert.equal(after.state.metrics.gpuBufferCount, before.state.metrics.gpuBufferCount);
  assert.equal(after.state.metrics.gpuBufferBytes, before.state.metrics.gpuBufferBytes);
  assert(after.state.metrics.drawCalls >= 2
    && after.state.metrics.drawCalls <= 4
    && after.state.metrics.drawCalls % 2 === 0);
  assert.equal(after.state.metrics.fixedAttributeIdentityStable, true);
  assert(frameTimes.every((value) => Number.isFinite(value) && value >= 0));
  const p95FrameTimeMs = percentile(frameTimes, 0.95);
  const maximumFrameTimeMs = Math.max(...frameTimes);
  assert(p95FrameTimeMs <= 16.7, `${profile} surfel render p95 reached ${p95FrameTimeMs} ms.`);
  assert(maximumFrameTimeMs <= 50, `${profile} surfel render maximum reached ${maximumFrameTimeMs} ms.`);
  const heapGrowthBytes = Math.max(0, after.heapBytes - before.heapBytes);
  assert(heapGrowthBytes <= 6 * 1024 * 1024, `${profile} retained heap grew by ${heapGrowthBytes} bytes.`);
  assert.deepEqual(consoleErrors, []);

  await page.evaluate(() => {
    window.history.pushState({ source: 'about-surfel-soak' }, '', '/index.html');
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  });
  await page.waitForSelector('.about-narrative-lab', { state: 'detached' });
  await page.waitForFunction(() => window.__aboutNarrativeRuntime === undefined);

  const evidence = {
    baseUrl,
    profile,
    iterations,
    residentSurfelBudget: expected.residentSurfelCount,
    p95FrameTimeMs,
    maximumFrameTimeMs,
    heapGrowthBytes,
    cold,
    before,
    after,
    unmounted: true,
    consoleErrors,
    recordedAt: new Date().toISOString(),
  };
  await writeFile(
    `${ABOUT_SURFEL_OUTPUT_DIR}/soak-metrics-${profile}.json`,
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(`PASS: ${profile} completed ${iterations} v2 surfel frames with two shared-buffer passes, stable buffers, and ${heapGrowthBytes} retained bytes.`);
} finally {
  await browser.close();
}
