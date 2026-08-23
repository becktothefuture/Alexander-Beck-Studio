import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

export const ABOUT_SURFEL_OUTPUT_DIR = 'output/playwright/about-narrative-hardening/runtime';
export const ABOUT_SURFEL_PROFILES = Object.freeze({
  desktop: Object.freeze({
    viewport: Object.freeze({ width: 1440, height: 1000 }),
    residentSurfelCount: 60_000,
    maximumGpuBytes: 2_000_000,
  }),
  mobile: Object.freeze({
    viewport: Object.freeze({ width: 390, height: 844 }),
    residentSurfelCount: 20_000,
    maximumGpuBytes: 700_000,
  }),
});

export async function ensureAboutSurfelOutputDirectory() {
  await mkdir(ABOUT_SURFEL_OUTPUT_DIR, { recursive: true });
}

export async function launchAboutAuditBrowser(browserName = 'chromium') {
  const type = browserName === 'webkit' ? webkit : chromium;
  const options = browserName === 'chromium'
    ? {
      headless: true,
      args: [
        '--use-gl=angle',
        '--use-angle=swiftshader-webgl',
        '--enable-unsafe-swiftshader',
        '--disable-gpu-sandbox',
        '--enable-precise-memory-info',
      ],
    }
    : { headless: true };
  return type.launch(options);
}

export function collectPageErrors(page) {
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  return errors;
}

export async function waitForAboutSurfelRuntime(page, profile, timeout = 120_000) {
  const expected = ABOUT_SURFEL_PROFILES[profile];
  assert(expected, `Unknown About surfel profile ${profile}.`);
  await page.waitForFunction(({ expectedProfile, expectedCount }) => {
    const root = document.querySelector('.about-narrative-lab');
    const metrics = window.__aboutNarrativeRuntime?.getMetrics?.();
    return root?.dataset.pointAsset === 'blender-surfel-v2'
      && root?.dataset.worldStage === 'blender-surfel-scene'
      && metrics?.state === 'ready'
      && metrics.adapterId === 'blender-surfel-v2'
      && metrics.qualityTier === expectedProfile
      && metrics.residentSurfelCount === expectedCount
      && metrics.drawCalls === 2
      && metrics.fixedAttributeIdentityStable === true;
  }, {
    expectedProfile: profile,
    expectedCount: expected.residentSurfelCount,
  }, { timeout });
}

export function assertAboutSurfelMetrics(metrics, profile) {
  const expected = ABOUT_SURFEL_PROFILES[profile];
  assert(expected, `Unknown About surfel profile ${profile}.`);
  assert.equal(metrics.state, 'ready');
  assert.equal(metrics.adapterId, 'blender-surfel-v2');
  assert.equal(metrics.assetSchema, 'about-point-scene');
  assert.equal(metrics.assetVersion, 2);
  assert.equal(metrics.fallbackAsset, false);
  assert.equal(metrics.qualityTier, profile);
  assert.equal(metrics.pointProfile, profile);
  assert.equal(metrics.layoutProfile, profile);
  assert.equal(metrics.residentSurfelCount, expected.residentSurfelCount);
  assert.equal(metrics.activeSurfelCount, expected.residentSurfelCount);
  assert.equal(metrics.pointCount, expected.residentSurfelCount);
  assert.equal(metrics.masterSurfelCount, 90_000);
  assert.equal(metrics.modelCount, 9);
  assert.equal(Object.keys(metrics.perModelCounts).length, 9);
  assert(Object.values(metrics.perModelCounts).every((count) => count > 0));
  assert.equal(metrics.drawCalls, 2);
  assert.equal(metrics.occlusionMode, 'depth-owned-whole-surfel-reveal');
  assert.equal(metrics.lodRadiusScaleMode, 'per-object');
  assert.equal(Object.keys(metrics.lodRadiusScaleByObject).length, 16);
  assert(Object.values(metrics.lodRadiusScaleByObject).every((scale) => Number.isFinite(scale) && scale >= 1));
  assert.equal(metrics.gpuBufferBuilds, 1);
  assert.equal(metrics.bufferRebuilds, 1);
  assert.equal(metrics.gpuBufferIdentityStable, true);
  assert.equal(metrics.fixedAttributeIdentityStable, true);
  assert.equal(metrics.gpuBufferCount, 10);
  assert.equal(metrics.gpuBufferBytes, metrics.gpuBytes);
  assert(metrics.gpuBufferBytes > 0 && metrics.gpuBufferBytes <= expected.maximumGpuBytes);
  assert.deepEqual(metrics.zones, [
    'camera-page-01',
    'camera-page-02',
    'camera-page-03',
    'camera-page-04',
    'camera-page-05',
  ]);
  assert(metrics.activeZones.length > 0);
  assert(metrics.cameraPosition.every(Number.isFinite));
  assert(Number.isFinite(metrics.cameraRollDegrees));
  assert(Number.isFinite(metrics.frameTimeMs) && metrics.frameTimeMs >= 0);
  assert.equal(metrics.contextAvailable, true);
  assert.equal(metrics.visible, true);
  assert.equal(metrics.controls.detailBias, 1);
  assert.equal(metrics.controls.opacity, 1);
  assert(metrics.controls.fogEndWU > metrics.controls.fogStartWU);
  assert.equal(metrics.error, '');
}

export async function getAboutSurfelState(page) {
  return page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    return {
      metrics: window.__aboutNarrativeRuntime.getMetrics(),
      diagnostics: window.__aboutNarrativeRuntime.getDiagnosticsSnapshot(),
      dataset: { ...root.dataset },
      storyWU: Number(root.dataset.narrativeStoryWu || 0),
      scrollTop: scrollport.scrollTop,
      scrollMaximum: Math.max(0, scrollport.scrollHeight - scrollport.clientHeight),
      semanticTextLength: root.textContent.replace(/\s+/gu, ' ').trim().length,
    };
  });
}

export async function driveAboutStoryWU(page, targetWU) {
  const resolvedTarget = Number.isFinite(targetWU) ? Math.max(0, targetWU) : null;
  await page.evaluate((target) => {
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const maximum = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
    scrollport.scrollTop = target === null
      ? maximum
      : Math.min(maximum, target * scrollport.clientHeight);
    scrollport.dispatchEvent(new Event('scroll', { bubbles: false }));
  }, resolvedTarget);
  await page.waitForFunction((target) => {
    const root = document.querySelector('.about-narrative-lab');
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const storyWU = Number(root?.dataset.narrativeStoryWu);
    if (!Number.isFinite(storyWU)) return false;
    if (target === null) {
      const maximum = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
      return maximum - scrollport.scrollTop <= 1;
    }
    return Math.abs(storyWU - target) <= 0.035;
  }, resolvedTarget, { timeout: 30_000 });
  await page.waitForTimeout(120);
}

export function percentile(values, fraction) {
  assert(values.length > 0, 'Cannot calculate a percentile from no values.');
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))];
}
