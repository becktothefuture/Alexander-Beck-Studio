import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import {
  ABOUT_SURFEL_OUTPUT_DIR,
  assertAboutSurfelMetrics,
  collectPageErrors,
  ensureAboutSurfelOutputDirectory,
  getAboutSurfelState,
  launchAboutAuditBrowser,
  percentile,
  waitForAboutSurfelRuntime,
} from './audit-about-narrative-surfel-v2-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const frameCount = Math.max(120, Number(process.env.ABS_ABOUT_HOT_FRAME_COUNT || 600));
const source = await readFile(
  'react-app/app/src/routes/about-narrative-lab/aboutBlenderPointScene.js',
  'utf8',
);
const hotFrameSource = source.slice(
  source.indexOf('const applyFrame ='),
  source.indexOf('const getDiagnosticsSnapshot ='),
);

assert.match(source, /const ADAPTER_ID = 'blender-surfel-v2';/);
assert.match(source, /const SURFEL_STRIDE_BYTES = 32;/);
assert.doesNotMatch(source, /createDepthProxy|depthProxy/);
assert.doesNotMatch(hotFrameSource, /querySelector|getBoundingClientRect|style\./);
assert.doesNotMatch(hotFrameSource, /new\s+(?:Array|Float\w*Array|THREE\.)/);
assert.match(hotFrameSource, /const startedAt = performance\.now\(\);\s*if \(!applyFrame\(latestFrame\)\) return false;/);
assert.match(hotFrameSource, /renderer\.render\(scene, camera\)/);
assert.match(hotFrameSource, /drawCalls = renderer\.info\.render\.calls/);

await ensureAboutSurfelOutputDirectory();
await mkdir('output/playwright/about-narrative-hardening/performance', { recursive: true });
const browser = await launchAboutAuditBrowser('chromium');
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const consoleErrors = collectPageErrors(page);
const tracePath = 'output/playwright/about-narrative-hardening/performance/chromium-trace.zip';

try {
  await context.tracing.start({ screenshots: false, snapshots: false, sources: false });
  await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
  await waitForAboutSurfelRuntime(page, 'desktop');
  const before = await getAboutSurfelState(page);
  assertAboutSurfelMetrics(before.metrics, 'desktop');

  const sampleCount = Math.min(60, Math.max(12, Math.ceil(frameCount / 50)));
  const observationDurationMs = Math.ceil((frameCount / 60) * 1_000);
  const sampleIntervalMs = Math.max(16, Math.ceil(observationDurationMs / sampleCount));
  const samples = [];
  for (let index = 0; index < sampleCount; index += 1) {
    await page.evaluate(({ sampleIndex, totalSamples }) => {
      const scrollport = document.querySelector('.about-narrative-scrollport');
      const maximum = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
      const phase = (sampleIndex % 6) / 5;
      const direction = Math.floor(sampleIndex / 6) % 2 === 0 ? phase : 1 - phase;
      scrollport.scrollTop = maximum * direction;
      scrollport.dispatchEvent(new Event('scroll', { bubbles: false }));
      if (sampleIndex === totalSamples - 1) scrollport.scrollTop = maximum;
    }, { sampleIndex: index, totalSamples: sampleCount });
    await page.waitForTimeout(sampleIntervalMs);
    samples.push(await page.evaluate(
      () => window.__aboutNarrativeRuntime.getMetrics().frameTimeMs,
    ));
  }

  const after = await getAboutSurfelState(page);
  assertAboutSurfelMetrics(after.metrics, 'desktop');
  assert.equal(after.metrics.bufferRebuilds, before.metrics.bufferRebuilds);
  assert.equal(after.metrics.gpuBufferBytes, before.metrics.gpuBufferBytes);
  assert.equal(after.metrics.gpuBufferCount, before.metrics.gpuBufferCount);
  assert.equal(after.metrics.fixedAttributeIdentityStable, true);
  assert.equal(after.metrics.drawCalls, 2);
  assert(samples.every((value) => Number.isFinite(value) && value >= 0));
  const p95FrameTimeMs = percentile(samples, 0.95);
  const maximumFrameTimeMs = Math.max(...samples);
  assert(p95FrameTimeMs <= 16.7, `Surfel render p95 reached ${p95FrameTimeMs} ms.`);
  assert(maximumFrameTimeMs <= 50, `Surfel render maximum reached ${maximumFrameTimeMs} ms.`);
  assert.deepEqual(consoleErrors, []);

  const evidence = {
    baseUrl,
    browserChannel: process.env.ABS_CHROMIUM_CHANNEL || null,
    adapterId: after.metrics.adapterId,
    assetSchema: after.metrics.assetSchema,
    assetVersion: after.metrics.assetVersion,
    profile: 'desktop',
    frameCount,
    sampleCount: samples.length,
    observationDurationMs,
    p95FrameTimeMs,
    maximumFrameTimeMs,
    before: before.metrics,
    after: after.metrics,
    consoleErrors,
    recordedAt: new Date().toISOString(),
  };
  await writeFile(
    `${ABOUT_SURFEL_OUTPUT_DIR}/hot-frame-600.json`,
    `${JSON.stringify(evidence, null, 2)}\n`,
  );
  console.log(`PASS: ${frameCount} v2 surfel frames retained two shared-buffer passes and stable buffers; p95 ${p95FrameTimeMs.toFixed(3)} ms.`);
} finally {
  await context.tracing.stop({ path: tracePath }).catch(() => {});
  await browser.close();
}
