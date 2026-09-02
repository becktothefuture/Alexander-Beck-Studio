import { resolve } from 'node:path';
import {
  launchAboutAuditBrowser,
  openAboutRecoveryPage,
  summarizeFailures,
  writeRecoveryReport,
} from './lib/about-recovery-audit-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const outputDir = resolve(process.env.ABS_ABOUT_RECOVERY_MOTION_OUTPUT
  || `output/playwright/about-recovery-motion-continuity/${browserName}`);
const profiles = String(process.env.ABS_ABOUT_RECOVERY_PROFILES || 'desktop,mobile')
  .split(',').map((value) => value.trim()).filter(Boolean);
const durationMs = Math.max(2_000, Number(process.env.ABS_ABOUT_RECOVERY_MOTION_DURATION_MS || 9_000));

function magnitude(vector) {
  return Math.hypot(...vector);
}

function difference(left, right) {
  return left.map((value, index) => Number(value) - Number(right[index]));
}

function quaternionAngleDegrees(left, right) {
  const denominator = Math.max(0.000001, magnitude(left) * magnitude(right));
  const cosine = Math.min(1, Math.max(0, Math.abs(left.reduce(
    (sum, value, index) => sum + value * right[index], 0,
  )) / denominator));
  return 2 * Math.acos(cosine) * 180 / Math.PI;
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const ordered = [...values].sort((left, right) => left - right);
  return ordered[Math.min(ordered.length - 1, Math.floor((ordered.length - 1) * fraction))];
}

function coefficientOfVariation(values) {
  if (!values.length) return Number.POSITIVE_INFINITY;
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  if (Math.abs(mean) < 0.000001) return Number.POSITIVE_INFINITY;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance) / Math.abs(mean);
}

function check(code, pass, message, actual, expected) {
  return { code, pass: Boolean(pass), message, actual, expected };
}

function analyseSamples(profile, direction, samples) {
  const intervals = [];
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    const dtSeconds = Math.max(0.000001, (current.time - previous.time) / 1_000);
    const scrollDelta = current.scrollTop - previous.scrollTop;
    const authoredDistanceDelta = current.cameraDistanceWU - previous.cameraDistanceWU;
    const renderedDistanceDelta = magnitude(difference(current.cameraPosition, previous.cameraPosition));
    const angularDeltaDegrees = quaternionAngleDegrees(current.cameraQuaternion, previous.cameraQuaternion);
    const modelIds = new Set([
      ...Object.keys(previous.stageVisibilityByModel),
      ...Object.keys(current.stageVisibilityByModel),
    ]);
    const modelVisibilitySteps = Array.from(modelIds, (modelId) => Math.abs(
      Number(current.stageVisibilityByModel[modelId] || 0)
      - Number(previous.stageVisibilityByModel[modelId] || 0),
    ));
    intervals.push({
      dtMs: dtSeconds * 1_000,
      scrollDelta,
      authoredDistanceDelta,
      renderedDistanceDelta,
      angularDeltaDegrees,
      authoredSpeedWUPerSecond: authoredDistanceDelta / dtSeconds,
      renderedSpeedWUPerSecond: renderedDistanceDelta / dtSeconds,
      angularSpeedDegreesPerSecond: angularDeltaDegrees / dtSeconds,
      distancePerScrollPx: Math.abs(scrollDelta) > 0.01 ? Math.abs(authoredDistanceDelta / scrollDelta) : null,
      renderedDistancePerScrollPx: Math.abs(scrollDelta) > 0.01 ? renderedDistanceDelta / Math.abs(scrollDelta) : null,
      maximumModelVisibilityStep: Math.max(0, ...modelVisibilitySteps),
      stageVisibilityL1Step: modelVisibilitySteps.reduce((sum, value) => sum + value, 0),
      cameraLocked: Boolean(current.cameraLocked),
    });
  }
  for (let index = 1; index < intervals.length; index += 1) {
    const dtSeconds = Math.max(0.000001, intervals[index].dtMs / 1_000);
    intervals[index].renderedAccelerationWUPerSecond2 = (
      intervals[index].renderedSpeedWUPerSecond - intervals[index - 1].renderedSpeedWUPerSecond
    ) / dtSeconds;
    intervals[index].angularAccelerationDegreesPerSecond2 = (
      intervals[index].angularSpeedDegreesPerSecond - intervals[index - 1].angularSpeedDegreesPerSecond
    ) / dtSeconds;
  }
  for (let index = 2; index < intervals.length; index += 1) {
    const dtSeconds = Math.max(0.000001, intervals[index].dtMs / 1_000);
    intervals[index].renderedJerkWUPerSecond3 = (
      intervals[index].renderedAccelerationWUPerSecond2 - intervals[index - 1].renderedAccelerationWUPerSecond2
    ) / dtSeconds;
  }
  const moving = intervals.filter((sample) => Math.abs(sample.scrollDelta) > 0.01);
  const movingCamera = moving.filter((sample) => Math.abs(sample.authoredDistanceDelta) > 0.000001);
  const authoredRatios = movingCamera.map((sample) => sample.distancePerScrollPx).filter(Number.isFinite);
  const renderedRatios = movingCamera.map((sample) => sample.renderedDistancePerScrollPx).filter(Number.isFinite);
  const directionErrors = moving.filter((sample) => Math.sign(sample.scrollDelta) !== direction).length;
  const prematureCameraStalls = moving.filter((sample) => (
    Math.abs(sample.authoredDistanceDelta) <= 0.000001 && !sample.cameraLocked
  )).length;
  const renderedAccelerations = movingCamera.map((sample) => Math.abs(sample.renderedAccelerationWUPerSecond2 || 0));
  const renderedJerks = movingCamera.map((sample) => Math.abs(sample.renderedJerkWUPerSecond3 || 0));
  const angularSteps = movingCamera.map((sample) => sample.angularDeltaDegrees);
  const angularAccelerations = movingCamera.map((sample) => Math.abs(sample.angularAccelerationDegreesPerSecond2 || 0));
  const maximumModelVisibilityStep = Math.max(0, ...moving.map((sample) => sample.maximumModelVisibilityStep));
  const maximumStageVisibilityL1Step = Math.max(0, ...moving.map((sample) => sample.stageVisibilityL1Step));
  const combinedStageVisibilities = samples.map((sample) => Object.values(
    sample.stageVisibilityByModel,
  ).reduce((sum, value) => sum + Number(value || 0), 0));
  const minimumCombinedStageVisibility = Math.min(...combinedStageVisibilities);
  const checks = [
    check('presented_sample_count', samples.length >= durationMs / 1_000 * 40,
      `${profile} ${direction > 0 ? 'forward' : 'reverse'} must deliver at least 40 motion samples per second.`,
      samples.length, durationMs / 1_000 * 40),
    check('scroll_direction', directionErrors === 0,
      'Continuous input must never reverse a rendered scroll step.', directionErrors, 0),
    check('camera_motion_until_terminal_lock', prematureCameraStalls === 0,
      'The camera must move with every scroll step until the authored terminal lock.',
      prematureCameraStalls, 0),
    check('authored_distance_scroll_match', coefficientOfVariation(authoredRatios) <= 0.02,
      'Equal scroll movement must produce equal physical camera distance.',
      coefficientOfVariation(authoredRatios), 0.02),
    check('rendered_speed_stability', coefficientOfVariation(renderedRatios) <= 0.35,
      'Rendered camera movement must not surge or stall along the rail.',
      coefficientOfVariation(renderedRatios), 0.35),
    check('camera_acceleration', percentile(renderedAccelerations, 0.99) <= 2_000,
      'Camera acceleration must remain inside the reviewed motion envelope.',
      percentile(renderedAccelerations, 0.99), 2_000),
    check('camera_jerk', percentile(renderedJerks, 0.99) <= 150_000,
      'Camera jerk must remain inside the reviewed motion envelope.',
      percentile(renderedJerks, 0.99), 150_000),
    check('orientation_step', percentile(angularSteps, 0.99) <= 2.5,
      'Camera orientation must not jump between presented frames.', percentile(angularSteps, 0.99), 2.5),
    check('orientation_acceleration', percentile(angularAccelerations, 0.99) <= 1_500,
      'Camera orientation acceleration must remain cinematic.',
      percentile(angularAccelerations, 0.99), 1_500),
    check('maximum_model_visibility_step', maximumModelVisibilityStep <= 0.16,
      'No individual stage may pop between presented frames.', maximumModelVisibilityStep, 0.16),
    check('stage_visibility_l1_step', maximumStageVisibilityL1Step <= 0.32,
      'The complete stage population must crossfade without a cancelling visibility jump.',
      maximumStageVisibilityL1Step, 0.32),
    check('combined_stage_population', minimumCombinedStageVisibility >= 0.98,
      'At least one full stage population must remain admitted through every handoff.',
      minimumCombinedStageVisibility, 0.98),
  ];
  return {
    sampleCount: samples.length,
    intervalCount: intervals.length,
    frameIntervalMs: {
      p50: percentile(intervals.map((sample) => sample.dtMs), 0.5),
      p95: percentile(intervals.map((sample) => sample.dtMs), 0.95),
      maximum: Math.max(0, ...intervals.map((sample) => sample.dtMs)),
    },
    authoredDistancePerScrollCoefficientOfVariation: coefficientOfVariation(authoredRatios),
    renderedDistancePerScrollCoefficientOfVariation: coefficientOfVariation(renderedRatios),
    renderedAccelerationP99: percentile(renderedAccelerations, 0.99),
    renderedJerkP99: percentile(renderedJerks, 0.99),
    angularStepP99Degrees: percentile(angularSteps, 0.99),
    angularAccelerationP99: percentile(angularAccelerations, 0.99),
    maximumModelVisibilityStep,
    maximumStageVisibilityL1Step,
    minimumCombinedStageVisibility,
    fractionalRadiusCouplingObserved: samples.some((sample) => sample.stageRadiusCoupledToStageVisibility),
    checks,
    failures: summarizeFailures(checks),
    samples,
  };
}

async function recordJourney(page, direction) {
  return page.evaluate(async ({ requestedDirection, requestedDurationMs }) => {
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const maximum = Math.max(0, scrollport.scrollHeight - scrollport.clientHeight);
    const startTop = requestedDirection > 0 ? 0 : maximum;
    const endTop = requestedDirection > 0 ? maximum : 0;
    scrollport.scrollTop = startTop;
    scrollport.dispatchEvent(new Event('scroll', { bubbles: false }));
    await new Promise((resolve) => {
      let frames = 8;
      const hold = () => {
        scrollport.scrollTop = startTop;
        frames -= 1;
        if (frames <= 0) resolve(); else requestAnimationFrame(hold);
      };
      hold();
    });
    const samples = [];
    const startedAt = performance.now();
    await new Promise((resolve) => {
      let finalPositionRequested = false;
      let paintedRequestTime = startedAt;
      const sample = (time) => {
        // The About timeline owns one RAF and consumes the painted scroll
        // position there. Read first so every sample pairs that completed
        // camera frame with the scrollTop that produced it; then request the
        // next position for the following frame.
        const metrics = window.__aboutNarrativeRuntime.getMotionSnapshot();
        samples.push({
          // The camera rendered the scroll position requested by the previous
          // RAF. Associate the completed frame with that request time so the
          // speed calculation does not compare a position delta against the
          // following RAF interval.
          time: paintedRequestTime,
          scrollTop: scrollport.scrollTop,
          storyWU: metrics.storyWU,
          cameraDistanceWU: metrics.cameraDistanceWU,
          cameraPosition: metrics.cameraPosition,
          cameraQuaternion: metrics.cameraQuaternion,
          cameraLocked: metrics.cameraLocked,
          entranceScale: metrics.entranceScale,
          stageVisibilityByModel: metrics.stageVisibilityByModel,
          stageRadiusCoupledToStageVisibility: metrics.stageRadiusCoupledToVisibility,
        });
        if (finalPositionRequested) {
          resolve();
          return;
        }
        const progress = Math.min(1, (time - startedAt) / requestedDurationMs);
        scrollport.scrollTop = startTop + (endTop - startTop) * progress;
        scrollport.dispatchEvent(new Event('scroll', { bubbles: false }));
        paintedRequestTime = time;
        finalPositionRequested = progress >= 1;
        requestAnimationFrame(sample);
      };
      requestAnimationFrame(sample);
    });
    return samples;
  }, { requestedDirection: direction, requestedDurationMs: durationMs });
}

const browser = await launchAboutAuditBrowser(browserName);
const report = {
  schema: 'about-recovery-motion-continuity/v1',
  browser: browserName,
  baseUrl,
  durationMs,
  theme: process.env.ABS_ABOUT_RECOVERY_THEME || 'dark',
  profiles: [],
  failures: [],
};
try {
  for (const profile of profiles) {
    const { context, errors, page } = await openAboutRecoveryPage({ browser, profile, baseUrl });
    const journeys = [];
    for (const direction of [1, -1]) {
      const samples = await recordJourney(page, direction);
      const analysis = analyseSamples(profile, direction, samples);
      journeys.push({ direction: direction > 0 ? 'forward' : 'reverse', ...analysis });
      report.failures.push(...analysis.failures.map((failure) => ({
        profile, journey: direction > 0 ? 'forward' : 'reverse', ...failure,
      })));
    }
    if (errors.length) report.failures.push({ profile, journey: 'runtime', code: 'page_errors', actual: errors, expected: [] });
    report.profiles.push({ profile, journeys, errors });
    await context.close();
  }
} catch (error) {
  report.failures.push({ profile: 'infrastructure', journey: 'runtime', code: 'audit_error', message: error.message });
} finally {
  await browser.close();
}
report.status = report.failures.length ? 'fail' : 'pass';
report.recordedAt = new Date().toISOString();
const reportPath = await writeRecoveryReport(outputDir, 'report.json', report);
for (const failure of report.failures) console.error(`FAIL ${failure.profile}/${failure.journey}/${failure.code}: ${failure.message || JSON.stringify(failure.actual)}`);
console.log(`${report.status.toUpperCase()}: About motion continuity report: ${reportPath}`);
if (report.failures.length) process.exitCode = 1;
