import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import {
  ABOUT_RECOVERY_PROFILES,
  driveAboutStoryWU,
  getAboutContinuityState,
  launchAboutAuditBrowser,
  openAboutRecoveryPage,
  summarizeAboutContinuitySnapshot,
  writeRecoveryReport,
} from './lib/about-recovery-audit-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const outputDir = resolve(process.env.ABS_ABOUT_PARTICLE_CONTINUITY_OUTPUT
  || `output/playwright/about-particle-continuity/${browserName}`);
const bundleDir = process.env.ABS_ABOUT_RECOVERY_BUNDLE
  ? resolve(process.env.ABS_ABOUT_RECOVERY_BUNDLE)
  : null;
const requestedProfiles = String(process.env.ABS_ABOUT_RECOVERY_PROFILES || 'desktop,mobile')
  .split(',').map((value) => value.trim()).filter(Boolean);
const sampleCount = Math.max(25, Number(process.env.ABS_ABOUT_CONTINUITY_SAMPLES) || 73);
const minimumFramedPoints = Math.max(1, Number(process.env.ABS_ABOUT_CONTINUITY_MIN_POINTS) || 24);
const minimumOccupiedBins = Math.max(1, Number(process.env.ABS_ABOUT_CONTINUITY_MIN_BINS) || 4);

function summarizeFrame(state, sampleIndex, targetStoryWU) {
  const summary = summarizeAboutContinuitySnapshot(state.metrics, {
    minimumFramedPoints,
    minimumOccupiedBins,
  });
  return {
    sampleIndex,
    requestedStoryWU: targetStoryWU,
    renderedStoryWU: state.storyWU,
    cameraDistanceWU: state.metrics.cameraDistanceWU,
    cueProgress: state.metrics.cueProgress,
    stageVisibilityByModel: state.metrics.stageVisibilityByModel,
    occupancy12x8: summary.occupancy12x8,
    occupiedBins: summary.occupiedBins,
    framedRenderedPoints: summary.framedRenderedPoints,
    residentSurfelCount: summary.residentSurfelCount,
    renderedSurfelCount: summary.renderedSurfelCount,
    visibleStageSurfelCount: summary.visibleStageSurfelCount,
    activeStageCount: summary.activeStageCount,
    activeStageIds: summary.activeStageIds,
    activeModelIds: summary.activeModelIds,
    visibleModelIds: summary.visibleModelIds,
    checks: summary.checks,
    failures: summary.failures,
  };
}

await mkdir(outputDir, { recursive: true });
const browser = await launchAboutAuditBrowser(browserName);
const report = {
  schema: 'about-particle-continuity/v1',
  browser: browserName,
  baseUrl,
  bundleDir,
  sampleCount,
  thresholds: { minimumFramedPoints, minimumOccupiedBins },
  profiles: [],
  failures: [],
};

try {
  for (const profile of requestedProfiles) {
    assert(ABOUT_RECOVERY_PROFILES[profile], `Unknown About recovery profile ${profile}.`);
    const {
      bundleMetadata, context, errors, page,
    } = await openAboutRecoveryPage({ browser, profile, baseUrl, bundleDir });
    report.sourceSha256 ||= bundleMetadata?.source?.sha256 || null;
    const durationWU = await page.evaluate(() => Math.max(
      0,
      ...Array.from(document.querySelectorAll('[data-render-span-id]'),
        (node) => Number(node.dataset.storyEndWu) || 0),
    ));
    assert(durationWU > 0, 'About story duration is unavailable.');
    const samples = [];
    for (let sampleIndex = 0; sampleIndex < sampleCount; sampleIndex += 1) {
      const targetStoryWU = durationWU * sampleIndex / (sampleCount - 1);
      await driveAboutStoryWU(page, targetStoryWU);
      const state = await getAboutContinuityState(page);
      const sample = summarizeFrame(state, sampleIndex, targetStoryWU);
      samples.push(sample);
      if (sample.failures.length) {
        const screenshot = resolve(outputDir, `${profile}-gap-${String(sampleIndex).padStart(3, '0')}.png`);
        await page.screenshot({ path: screenshot });
        for (const failure of sample.failures) {
          report.failures.push({
            profile,
            sampleIndex,
            storyWU: sample.renderedStoryWU,
            screenshot,
            ...failure,
          });
        }
      }
    }
    if (errors.length) {
      report.failures.push({
        profile,
        sampleIndex: null,
        code: 'page_errors',
        actual: errors,
        expected: [],
        message: 'The continuity audit collected browser errors.',
      });
    }
    report.profiles.push({
      profile,
      viewport: ABOUT_RECOVERY_PROFILES[profile].viewport,
      durationWU,
      samples,
      errors,
    });
    await context.close();
  }
} catch (error) {
  report.failures.push({
    profile: 'infrastructure',
    sampleIndex: null,
    code: 'audit_error',
    actual: error.message,
    expected: 'successful continuous-route sampling',
    message: error.message,
  });
} finally {
  await browser.close();
}

report.status = report.failures.length ? 'fail' : 'pass';
report.recordedAt = new Date().toISOString();
const reportPath = await writeRecoveryReport(outputDir, 'report.json', report);
for (const failure of report.failures) {
  console.error(`FAIL ${failure.profile}/${failure.sampleIndex ?? 'runtime'}/${failure.code}: ${failure.message}`);
}
console.log(`${report.status.toUpperCase()}: About particle continuity report: ${reportPath}`);
if (report.failures.length) process.exitCode = 1;
