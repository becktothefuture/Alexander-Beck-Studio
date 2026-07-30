import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
const canonicalSource = await readFile('react-app/app/public/config/contents-about.json', 'utf8');
const canonicalDocument = JSON.parse(canonicalSource);
const canonicalHash = createHash('sha256').update(canonicalSource).digest('hex');
await context.route('**/api/about-narrative/config', async (route) => {
  if (route.request().method() !== 'GET') return route.abort();
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: { ETag: `"${canonicalHash}"` },
    body: JSON.stringify({ document: canonicalDocument, hash: canonicalHash }),
  });
});
const page = await context.newPage();
const consoleErrors = [];
page.on('console', (message) => {
  if (message.type() === 'error') consoleErrors.push(message.text());
});
page.on('pageerror', (error) => consoleErrors.push(error.message));

try {
  await page.goto(`${baseUrl}/lab/about-narrative.html?edit=1`, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => (
    window.__aboutNarrativeRuntime?.getMetrics
    && document.querySelector('.about-narrative-lab')?.dataset.worldPrepare === 'ready'
  ), null, { timeout: 120_000 });

  const transport = page.getByRole('slider', { name: 'Story WU playhead' });
  const maxWU = Number(await transport.getAttribute('max'));
  const storyWUs = [
    Math.min(maxWU, 2.8),
    Math.min(maxWU, 5.7),
    Math.min(maxWU, 8.0),
    Math.min(maxWU, 14.0),
    Math.min(maxWU, 18.3),
  ];

  const drive = (count) => page.evaluate(async ({ values, count: cycleCount }) => {
    const input = document.querySelector('input[aria-label="Story WU playhead"]');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    for (let index = 0; index < cycleCount; index += 1) {
      setter.call(input, String(values[index % values.length]));
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  }, { values: storyWUs, count });

  // Warm the complete interaction loop before taking the heap baseline. Ten
  // frames prepared the geometry but still counted one-time V8 event and JIT
  // caches as retained product memory on otherwise resource-stable runs.
  const warmupIterations = Math.min(200, Math.max(storyWUs.length * 2, iterations));
  await drive(warmupIterations);
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

  // Teardown from a settled, non-interactive story checkpoint. The soak metrics
  // above still describe the complete cycle, including the final emergent Form.
  await drive(1);
  await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.worldPrepare === 'ready');
  await page.keyboard.press('/');
  await page.locator('.about-track-editor').waitFor({ state: 'hidden' });
  await page.evaluate(() => {
    window.history.pushState({ source: 'about-runtime-soak' }, '', '/index.html');
    window.dispatchEvent(new PopStateEvent('popstate', { state: window.history.state }));
  });
  await page.waitForSelector('.about-narrative-lab', { state: 'detached' });
  await page.waitForTimeout(100);
  const postUnmountResources = await page.evaluate(() => window.__aboutNarrativeLastDispose || null);

  const heapGrowthBytes = Math.max(0, after.heap - before.heap);
  const evidence = {
    baseUrl,
    profile,
    iterations,
    warmupIterations,
    storyWUs,
    coldPreparationMetrics,
    before,
    after,
    postUnmountResources,
    heapGrowthBytes,
    consoleErrors,
    recordedAt: new Date().toISOString(),
  };
  await writeFile(`${outputDir}/soak-metrics-${profile}.json`, `${JSON.stringify(evidence, null, 2)}\n`);

  // Nine base point attributes plus two fixed phase attributes used by schema-v6
  // parametric transition motion.
  assert.equal(after.metrics.fixedAttributeCount, 11);
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
  // Schema v6 installs two additional fixed phase attributes. Pair publication is
  // a boundary operation, not hot-frame work, but must remain inside one 60 Hz frame.
  assert.ok(after.metrics.maxInstallDurationMs < 16, `Pair install reached ${after.metrics.maxInstallDurationMs}ms.`);
  assert.ok(after.metrics.maxWorkerMessageDurationMs < 8, `Worker message reached ${after.metrics.maxWorkerMessageDurationMs}ms.`);
  assert.ok(after.metrics.maxFirstUploadDurationMs < 8, `First upload reached ${after.metrics.maxFirstUploadDurationMs}ms.`);
  assert.ok(heapGrowthBytes <= 2 * 1024 * 1024, `Retained heap grew by ${heapGrowthBytes} bytes.`);
  assert.ok(postUnmountResources, 'Certification teardown must publish a final resource snapshot.');
  assert.equal(postUnmountResources.gpuLiveBufferCount, 0, 'WebGL buffers must return to the pre-mount baseline after unmount.');
  assert.equal(postUnmountResources.gpuLiveBufferBytes, 0);
  assert.equal(postUnmountResources.resourceLiveBufferCount, 0, 'Generated ArrayBuffers must release all runtime owners on unmount.');
  assert.equal(postUnmountResources.resourceLiveBufferBytes, 0);
  assert.ok(postUnmountResources.gpuDeleted >= after.metrics.gpuBufferCount, 'Unmount must delete the mounted point-field buffers.');
  assert.equal(postUnmountResources.diagnosticCount, 0);
  assert.deepEqual(consoleErrors, []);
  console.log(`PASS: ${iterations} About Narrative transitions retained fixed attributes and bounded memory.`);
} finally {
  await browser.close();
}
