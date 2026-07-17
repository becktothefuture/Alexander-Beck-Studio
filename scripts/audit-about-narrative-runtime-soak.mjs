import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const iterations = Number(process.env.ABS_ABOUT_SOAK_ITERATIONS || 1000);
const profile = process.env.ABS_ABOUT_SOAK_PROFILE === 'mobile' ? 'mobile' : 'desktop';
const outputDir = 'output/playwright/about-narrative-hardening/runtime';
const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
    '--enable-precise-memory-info',
    '--js-flags=--expose-gc',
  ],
});

await mkdir(outputDir, { recursive: true });
const context = await browser.newContext({
  viewport: profile === 'mobile' ? { width: 390, height: 844 } : { width: 1440, height: 1000 },
});
await context.addInitScript(() => {
  const prototype = globalThis.WebGL2RenderingContext?.prototype;
  if (!prototype || globalThis.__aboutGpuLifecycle) return;
  const live = new Set();
  const originalCreateBuffer = prototype.createBuffer;
  const originalDeleteBuffer = prototype.deleteBuffer;
  prototype.createBuffer = function auditedCreateBuffer(...args) {
    const buffer = Reflect.apply(originalCreateBuffer, this, args);
    if (buffer) live.add(buffer);
    globalThis.__aboutGpuLifecycle.created += buffer ? 1 : 0;
    return buffer;
  };
  prototype.deleteBuffer = function auditedDeleteBuffer(buffer) {
    const result = Reflect.apply(originalDeleteBuffer, this, [buffer]);
    if (buffer && live.delete(buffer)) globalThis.__aboutGpuLifecycle.deleted += 1;
    return result;
  };
  globalThis.__aboutGpuLifecycle = {
    created: 0,
    deleted: 0,
    get liveCount() { return live.size; },
  };
});
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(error.message));

try {
  const preMountGpu = { liveCount: 0, created: 0, deleted: 0 };
  await page.goto(`${baseUrl}/lab/about-narrative.html?edit=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (
    window.__aboutNarrativeRuntime?.getMetrics
    && document.querySelector('.about-narrative-lab')?.dataset.worldPrepare === 'ready'
  ), { timeout: 30_000 });

  const transport = page.locator('.about-editor-transport input[type="range"]');
  const maxWU = Number(await transport.getAttribute('max'));
  const storyWUs = [
    Math.min(maxWU, 2.8),
    Math.min(maxWU, 5.7),
    Math.min(maxWU, 8.0),
    Math.min(maxWU, 14.0),
    Math.min(maxWU, 18.3),
  ];

  const drive = (count) => page.evaluate(async ({ values, count: cycleCount }) => {
    const input = document.querySelector('.about-editor-transport input[type="range"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (let index = 0; index < cycleCount; index += 1) {
      setter.call(input, String(values[index % values.length]));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }, { values: storyWUs, count });

  await drive(storyWUs.length * 2);
  const coldPreparationMetrics = await page.evaluate(() => window.__aboutNarrativeRuntime.getMetrics());
  await page.evaluate(() => window.__aboutNarrativeRuntime.resetPerformanceMetrics());
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage');
  const before = await page.evaluate(() => ({
    heap: performance.memory?.usedJSHeapSize || 0,
    metrics: window.__aboutNarrativeRuntime.getMetrics(),
    diagnostics: window.__aboutNarrativeRuntime.getDiagnosticsSnapshot(),
  }));

  await drive(iterations);
  await cdp.send('HeapProfiler.collectGarbage');
  const after = await page.evaluate(() => ({
    heap: performance.memory?.usedJSHeapSize || 0,
    metrics: window.__aboutNarrativeRuntime.getMetrics(),
    diagnostics: window.__aboutNarrativeRuntime.getDiagnosticsSnapshot(),
  }));

  await page.locator('.button-bar a[href="/index.html"]').click();
  await page.waitForURL(/\/index\.html$/);
  await page.waitForSelector('.about-narrative-lab', { state: 'detached' });
  await page.waitForTimeout(100);
  const postUnmountGpu = await page.evaluate(() => ({
    liveCount: window.__aboutGpuLifecycle?.liveCount || 0,
    created: window.__aboutGpuLifecycle?.created || 0,
    deleted: window.__aboutGpuLifecycle?.deleted || 0,
  }));

  const heapGrowthBytes = Math.max(0, after.heap - before.heap);
  const evidence = {
    baseUrl,
    profile,
    iterations,
    storyWUs,
    coldPreparationMetrics,
    before,
    after,
    preMountGpu,
    postUnmountGpu,
    heapGrowthBytes,
    consoleErrors,
    recordedAt: new Date().toISOString(),
  };
  await writeFile(`${outputDir}/soak-metrics-${profile}.json`, `${JSON.stringify(evidence, null, 2)}\n`);

  assert.equal(after.metrics.fixedAttributeCount, 9);
  assert.equal(after.metrics.pointCount, profile === 'mobile' ? 5000 : 12000);
  assert.equal(after.metrics.fixedAttributeIdentityStable, true);
  assert.equal(after.metrics.gpuBufferCount, before.metrics.gpuBufferCount);
  assert.equal(after.metrics.gpuBufferBytes, before.metrics.gpuBufferBytes);
  assert.equal(after.metrics.resourceDiagnosticCount, 0);
  assert.ok(after.metrics.bufferRebuilds >= before.metrics.bufferRebuilds);
  assert.ok(after.metrics.cacheEntries <= 8);
  assert.ok(after.metrics.cacheBytes <= 4 * 1024 * 1024 || after.metrics.cacheEntries === 1);
  assert.ok(after.metrics.sequenceCacheEntries <= 3);
  assert.ok(after.metrics.sequenceCacheBytes > 0);
  assert.ok(after.metrics.sequenceCacheBytes <= 16 * 1024 * 1024 || after.metrics.sequenceCacheEntries === 1);
  assert.ok(coldPreparationMetrics.maxWorkerMessageDurationMs < 8, `Cold Worker message task reached ${coldPreparationMetrics.maxWorkerMessageDurationMs}ms.`);
  assert.ok(coldPreparationMetrics.maxFirstUploadDurationMs < 8, `Cold correspondence upload submission reached ${coldPreparationMetrics.maxFirstUploadDurationMs}ms.`);
  assert.ok(after.metrics.maxInstallDurationMs < 8, `Pair install reached ${after.metrics.maxInstallDurationMs}ms.`);
  assert.ok(after.metrics.maxWorkerMessageDurationMs < 8, `Worker message reached ${after.metrics.maxWorkerMessageDurationMs}ms.`);
  assert.ok(after.metrics.maxFirstUploadDurationMs < 8, `First upload reached ${after.metrics.maxFirstUploadDurationMs}ms.`);
  assert.ok(heapGrowthBytes <= 2 * 1024 * 1024, `Retained heap grew by ${heapGrowthBytes} bytes.`);
  assert.equal(postUnmountGpu.liveCount, preMountGpu.liveCount, 'WebGL buffers must return to the pre-mount baseline after unmount.');
  assert.ok(postUnmountGpu.deleted >= after.metrics.gpuBufferCount, 'Unmount must delete the mounted point-field buffers.');
  assert.deepEqual(consoleErrors, []);
  console.log(`PASS: ${iterations} About Narrative transitions retained fixed attributes and bounded memory.`);
} finally {
  await browser.close();
}
