import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import {
  ABOUT_SURFEL_OUTPUT_DIR,
  assertAboutSurfelMetrics,
  collectPageErrors,
  ensureAboutSurfelOutputDirectory,
  getAboutSurfelState,
  launchAboutAuditBrowser,
  waitForAboutSurfelRuntime,
} from './audit-about-narrative-surfel-v2-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
await ensureAboutSurfelOutputDirectory();
const browser = await launchAboutAuditBrowser('chromium');
const scenarios = {};

try {
  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    let failedRequests = 0;
    await context.route('**/models/about-v2-edited-world/surfels.bin', async (route) => {
      if (failedRequests === 0) {
        failedRequests += 1;
        await route.abort('failed');
        return;
      }
      await route.continue();
    });
    const page = await context.newPage();
    const consoleErrors = collectPageErrors(page);
    await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => {
      const root = document.querySelector('.about-narrative-lab');
      const metrics = window.__aboutNarrativeRuntime?.getMetrics?.();
      return root?.dataset.aboutSceneReady === 'true'
        && metrics?.state === 'unavailable'
        && Boolean(metrics.error);
    }, null, { timeout: 120_000 });
    const failed = await getAboutSurfelState(page);
    assert.equal(failed.metrics.adapterId, 'blender-surfel-v2');
    assert.equal(failed.metrics.state, 'unavailable');
    assert(failed.metrics.error.length > 0);
    assert(failed.semanticTextLength > 500, 'Editorial content must remain readable during an asset fault.');
    assert.equal(failedRequests, 1);

    await context.unroute('**/models/about-v2-edited-world/surfels.bin');
    await page.evaluate(() => window.__aboutNarrativeRuntime.retryPreparation());
    await waitForAboutSurfelRuntime(page, 'desktop');
    const recovered = await getAboutSurfelState(page);
    assertAboutSurfelMetrics(recovered.metrics, 'desktop');
    assert.equal(recovered.semanticTextLength, failed.semanticTextLength);
    const unexpectedConsoleErrors = consoleErrors.filter((message) => !/ERR_FAILED|Failed to load resource/u.test(message));
    assert.deepEqual(unexpectedConsoleErrors, []);
    scenarios.assetRequestRecovery = { failed, recovered, failedRequests, consoleErrors };
    await context.close();
  }

  {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const consoleErrors = collectPageErrors(page);
    await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
    await waitForAboutSurfelRuntime(page, 'desktop');
    const beforeLoss = await getAboutSurfelState(page);
    assertAboutSurfelMetrics(beforeLoss.metrics, 'desktop');

    const extensionAvailable = await page.evaluate(() => {
      const canvas = document.querySelector('.about-narrative-world__canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      const extension = gl?.getExtension('WEBGL_lose_context') || null;
      window.__aboutSurfelContextLossExtension = extension;
      extension?.loseContext();
      return Boolean(extension);
    });
    assert.equal(extensionAvailable, true, 'WEBGL_lose_context is required for certification.');
    await page.waitForFunction(() => {
      const metrics = window.__aboutNarrativeRuntime?.getMetrics?.();
      return metrics?.state === 'context-lost' && metrics.contextAvailable === false;
    }, null, { timeout: 30_000 });
    const lost = await getAboutSurfelState(page);
    assert.equal(lost.metrics.state, 'context-lost');
    assert.equal(lost.metrics.contextAvailable, false);
    assert(lost.semanticTextLength > 500);

    await page.waitForTimeout(150);
    await page.evaluate(() => window.__aboutSurfelContextLossExtension.restoreContext());
    await waitForAboutSurfelRuntime(page, 'desktop');
    const restored = await getAboutSurfelState(page);
    assertAboutSurfelMetrics(restored.metrics, 'desktop');
    assert.equal(restored.metrics.gpuBufferBytes, beforeLoss.metrics.gpuBufferBytes);
    assert.equal(restored.metrics.gpuBufferCount, beforeLoss.metrics.gpuBufferCount);
    assert.equal(restored.metrics.bufferRebuilds, beforeLoss.metrics.bufferRebuilds);
    assert.deepEqual(consoleErrors, []);
    scenarios.contextRecovery = { beforeLoss, lost, restored, consoleErrors };
    await context.close();
  }

  await writeFile(
    `${ABOUT_SURFEL_OUTPUT_DIR}/runtime-fault-matrix.json`,
    `${JSON.stringify({
      baseUrl,
      adapterId: 'blender-surfel-v2',
      scenarios,
      recordedAt: new Date().toISOString(),
    }, null, 2)}\n`,
  );
  console.log('PASS: v2 surfel asset retry and WebGL context recovery retained editorial content and stable buffers.');
} finally {
  await browser.close();
}
