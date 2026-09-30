import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';
import {
  collectPageErrors, driveAboutStoryWU, getAboutSurfelJourneyMap,
  launchAboutAuditBrowser, waitForAboutSurfelRuntime,
} from './audit-about-narrative-surfel-v2-helpers.mjs';
import {
  resolveAboutNarrativeJourneyMap,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeJourneyMap.js';

// Keep GPU rendering enabled. The separate title audit deliberately suspends
// it; this audit records the actual scene and the DOM together, serially.
const browserName = process.env.ABS_BROWSER || 'chromium';
assert.ok(['chromium', 'webkit'].includes(browserName));
const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const assetDirectory = resolve(process.env.ABS_ABOUT_ASSET_DIR
  || 'react-app/app/public/models/about-v2-edited-world');
const metadata = JSON.parse(await readFile(resolve(assetDirectory, 'meta.json'), 'utf8'));
const cameraTrack = JSON.parse(await readFile(resolve(assetDirectory, 'camera-track.json'), 'utf8'));
const output = resolve('output/playwright/about-unified-journey', browserName);
const requestedCases = process.env.ABS_ABOUT_JOURNEY_CASES?.split(',');
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 }, runtimeProfile: 'desktop' },
  { name: 'mobile', viewport: { width: 390, height: 844 }, runtimeProfile: 'mobile' },
  { name: 'tablet', viewport: { width: 834, height: 1112 }, runtimeProfile: 'mobile', layoutProfile: 'tablet' },
  { name: 'short', viewport: { width: 844, height: 390 }, runtimeProfile: 'mobile' },
];
const cases = profiles.flatMap(profile => ['light', 'dark'].flatMap(theme => (
  [false, ...(profile.name !== 'short' ? [true] : [])].map(reducedMotion => ({
    ...profile, theme, reducedMotion,
    id: `${profile.name}-${theme}-${reducedMotion ? 'reduced' : 'motion'}`,
  }))
))).filter(entry => !requestedCases || requestedCases.includes(entry.id));
assert.ok(cases.length, 'No matching ABS_ABOUT_JOURNEY_CASES.');
assert.equal(metadata.source.geography.constructedGeometry, false);
assert.equal(metadata.models.find(model => model.key === 'about.06').renderingProfile, 'scan');
assert.ok(metadata.motionGroups.every(group => !group.motion), 'The authored landscape and scanned city must remain grounded.');

const maxError = (first, second) => Math.max(...first.map((value, index) => Math.abs(value - second[index])));
export function assertSameCamera(first, second, label, tolerance = 0.00001) {
  assert.ok(maxError(first.cameraPosition, second.cameraPosition) < tolerance, `${label}: camera translation drift.`);
  assert.ok(maxError(first.cameraQuaternion, second.cameraQuaternion) < tolerance, `${label}: camera rotation drift.`);
  assert.ok(maxError(first.cameraProjection, second.cameraProjection) < tolerance, `${label}: camera projection drift.`);
}
const snapshot = page => page.evaluate(() => window.__aboutNarrativeRuntime.getMotionSnapshot());
const metrics = page => page.evaluate(() => window.__aboutNarrativeRuntime.getMetrics());
function assertBuffers(state) {
  assert.equal(state.assetSourceHash, metadata.source.sha256, 'Active Blender source changed during audit.');
  assert.equal(state.bundleIntegrityVerified, true);
  assert.equal(state.state, 'ready');
  assert.equal(state.gpuBufferBuilds, 1);
  assert.equal(state.gpuBufferIdentityStable, true);
  assert.equal(state.fixedAttributeIdentityStable, true);
  assert.equal(state.visible, true);
}
export async function moveContinuously(page, targetWU, durationMs, maximumStep = 1) {
  return page.evaluate(async ({ target, duration, stepLimit }) => {
    const scrollport = document.querySelector('.about-narrative-scrollport');
    if (scrollport.classList.contains('lenis')) throw new Error(
      'Continuous positioning fixture cannot directly drive an active Lenis owner. Use the accepted zero-smoothing source or a real-wheel capture.',
    );
    const runtime = window.__aboutNarrativeRuntime;
    const canvas = document.querySelector('.about-narrative-world__canvas');
    const maximum = scrollport.scrollHeight - scrollport.clientHeight;
    const end = Math.max(...[...document.querySelectorAll('[data-render-span-id]')]
      .map(node => Number(node.dataset.storyEndWu)));
    const from = scrollport.scrollTop;
    const to = Math.min(maximum, target / end * maximum);
    const samples = [];
    let progress = 0, previous = performance.now(), previousFrameTime = null, count = 0;
    let inputRafTimeMs = null, inputRequestedAtMs = null, requestedScrollTop = from;
    let frameRequest = null, rejectCapture = null, interruption = null;
    const stop = error => {
      interruption ||= error;
      if (frameRequest !== null) cancelAnimationFrame(frameRequest);
      frameRequest = null;
      rejectCapture?.(interruption);
    };
    const onContextEvent = event => stop(new Error(
      `${event.type} during continuous capture at ${performance.now().toFixed(3)} ms after ${count} RAF observations. The film does not prove uninterrupted active WebGL.`,
    ));
    if (!canvas?.isConnected) throw new Error('No mounted canvas at continuous capture start.');
    // A loss and restoration can occur between observations on the same
    // canvas, especially during a reduced-motion hold. Identity and camera
    // equality cannot establish continuous rendering through that interval.
    canvas.addEventListener('webglcontextlost', onContextEvent, true);
    canvas.addEventListener('webglcontextrestored', onContextEvent, true);
    try {
      const context = canvas.getContext('webgl2');
      if (interruption) throw interruption;
      if (!context || context.isContextLost()) throw new Error('No active WebGL context at continuous capture start.');
      await new Promise((complete, reject) => {
        rejectCapture = reject;
        const frame = time => {
          frameRequest = null;
          try {
            const observedAtMs = performance.now();
            if (document.hidden) {
              stop(new Error('The page became hidden during continuous capture; active-scene evidence is incomplete.'));
              return;
            }
            if (runtime !== window.__aboutNarrativeRuntime || !canvas.isConnected
              || canvas !== document.querySelector('.about-narrative-world__canvas')) {
              stop(new Error('Renderer or canvas was replaced during continuous capture. The film does not prove one continuous scene.'));
              return;
            }
            const interval = Math.max(0, time - previous);
            // Read the prior input's camera before issuing the next input.
            const state = runtime.getMotionSnapshot();
            if (interruption) return;
            const sample = {
              timeMs: time, observedAtMs, inputRafTimeMs, inputRequestedAtMs, requestedScrollTop,
              scrollTop: scrollport.scrollTop, frameNumber: ++count, framesSincePreviousSample: 1,
              frameIntervalMs: previousFrameTime === null ? null : time - previousFrameTime,
              maximumFrameIntervalMs: previousFrameTime === null ? 0 : time - previousFrameTime,
              storyWU: state.storyWU, cameraDistanceWU: state.cameraDistanceWU,
              cameraPosition: state.cameraPosition, cameraQuaternion: state.cameraQuaternion,
              cameraProjection: state.cameraProjection,
              cameraLocked: state.cameraLocked, stageVisibilityByModel: state.stageVisibilityByModel,
            };
            if (count === 1) {
              sample.timeOriginMs = performance.timeOrigin;
              sample.contextContinuityGuard = 'initial-webgl2-state-and-segment-loss-restoration-events';
            }
            samples.push(sample);
            sample.recorderCostMs = Math.max(0, performance.now() - observedAtMs);
            previousFrameTime = time;
            if (progress === 1) {
              sample.callbackCostMs = Math.max(0, performance.now() - observedAtMs);
              complete(); return;
            }
            progress = Math.min(1, progress + Math.min(stepLimit, interval / duration));
            previous = time;
            inputRafTimeMs = time;
            inputRequestedAtMs = performance.now();
            requestedScrollTop = from + (to - from) * progress;
            scrollport.scrollTop = requestedScrollTop;
            scrollport.dispatchEvent(new Event('scroll', { bubbles: false }));
            if (!interruption) frameRequest = requestAnimationFrame(frame);
            sample.callbackCostMs = Math.max(0, performance.now() - observedAtMs);
          } catch (error) { stop(error); }
        };
        frameRequest = requestAnimationFrame(frame);
      });
    } finally {
      rejectCapture = null;
      canvas.removeEventListener('webglcontextlost', onContextEvent, true);
      canvas.removeEventListener('webglcontextrestored', onContextEvent, true);
      if (frameRequest !== null) cancelAnimationFrame(frameRequest);
    }
    return samples;
  }, { target: targetWU, duration: durationMs, stepLimit: maximumStep });
}

export function analyseAboutMotionRecording(samples, {
  segment, direction, durationMs, distancePerPixel, reducedMotion = false,
  reducedMotionAnchors = [], reference = false,
}) {
  assert.ok(samples.length >= 2, 'Cadence evidence needs at least two actual RAF observations.');
  assert.ok([1, -1].includes(direction) && distancePerPixel > 0 && durationMs > 0);
  const first = samples[0], events = [], intervals = [];
  assert.ok(Number.isFinite(first.timeOriginMs), 'Cadence evidence needs its browser clock origin.');
  assert.equal(first.frameIntervalMs, null, 'Do not invent an interval before the first RAF observation.');
  const maximum = values => values.reduce((value, next) => Math.max(value, next), 0);
  const percentile = (values, fraction) => {
    if (!values.length) return null;
    const ordered = [...values].sort((left, right) => left - right);
    return ordered[Math.floor((ordered.length - 1) * fraction)];
  };
  const distribution = values => ({ count: values.length, p50: percentile(values, 0.5),
    p95: percentile(values, 0.95), p99: percentile(values, 0.99), maximum: maximum(values) });
  const coefficient = values => {
    if (!values.length) return null;
    const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.abs(mean) > 0.000001
      ? Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length) / Math.abs(mean) : null;
  };
  const positionDelta = (a, b) => Math.hypot(...a.map((value, index) => value - b[index]));
  const angle = (a, b) => 2 * Math.acos(Math.min(1, Math.max(0,
    Math.abs(a.reduce((sum, value, index) => sum + value * b[index], 0))
      / Math.max(0.000001, Math.hypot(...a) * Math.hypot(...b)),
  ))) * 180 / Math.PI;
  const eventAt = (index, value, limit, detail = {}) => ({ sampleIndex: index,
    frameNumber: samples[index].frameNumber, timeMs: samples[index].timeMs,
    inputRafTimeMs: samples[index].inputRafTimeMs, inputRequestedAtMs: samples[index].inputRequestedAtMs,
    segmentOffsetSeconds: (samples[index].timeMs - first.timeMs) / 1000, value, limit, ...detail });
  const addEvent = (code, index, value, limit, detail) => events.push({ code, ...eventAt(index, value, limit, detail) });
  const worst = (values, limit = null) => {
    const entry = values.reduce((current, next) => !current || next.value > current.value ? next : current, null);
    return entry ? eventAt(entry.index, entry.value, limit) : null;
  };
  const expectedDistance = sample => {
    let distance = 0;
    for (const anchor of reducedMotionAnchors) {
      if (anchor.cameraStoryWU > sample.storyWU + 0.00001) break;
      distance = anchor.cameraDistanceWU;
    }
    return distance;
  };
  if (reducedMotion) assert.ok(reducedMotionAnchors.length, 'Reduced cuts need the actual source anchors.');
  const matchesReducedPose = sample => Math.abs(sample.cameraDistanceWU - expectedDistance(sample)) <= 0.00001;
  const responseLags = [], populations = [], expectedCuts = [];
  for (const [index, sample] of samples.entries()) {
    assert.equal(sample.frameNumber, index + 1, 'Cadence evidence omitted a RAF observation.');
    assert.equal(sample.framesSincePreviousSample, 1, 'Cadence evidence was subsampled.');
    for (const key of ['timeMs', 'observedAtMs', 'scrollTop', 'storyWU', 'cameraDistanceWU', 'recorderCostMs', 'callbackCostMs']) {
      assert.ok(Number.isFinite(sample[key]), `Missing finite cadence field ${key} at ${index}.`);
    }
    assert.ok(sample.recorderCostMs >= 0 && sample.callbackCostMs >= sample.recorderCostMs);
    assert.ok(sample.stageVisibilityByModel && Object.keys(sample.stageVisibilityByModel).length,
      'Cadence evidence omitted stage visibility.');
    for (const [key, length] of [['cameraPosition', 3], ['cameraQuaternion', 4]]) {
      assert.ok(sample[key]?.length === length && sample[key].every(Number.isFinite), `Invalid ${key}.`);
    }
    if (index) {
      assert.ok(sample.timeMs > samples[index - 1].timeMs, 'Actual RAF timestamps must increase.');
      assert.ok(Math.abs(sample.frameIntervalMs - (sample.timeMs - samples[index - 1].timeMs)) < 0.00001,
        'Recorded RAF interval does not match its timestamps.');
      assert.ok(Number.isFinite(sample.inputRafTimeMs) && Number.isFinite(sample.inputRequestedAtMs)
        && sample.inputRafTimeMs <= sample.timeMs && sample.inputRequestedAtMs <= sample.observedAtMs,
      'Rendered camera evidence needs the preceding input timestamp.');
      if (index > 1) assert.ok(sample.inputRafTimeMs > samples[index - 1].inputRafTimeMs,
        'Continuous input timestamps must increase.');
      if (sample.frameIntervalMs > 50) addEvent('frame-gap-over-50ms', index, sample.frameIntervalMs, 50);
    }
    const population = Object.values(sample.stageVisibilityByModel).reduce((sum, value) => {
      assert.ok(Number.isFinite(value), 'Stage visibility is not finite.'); return sum + value;
    }, 0);
    populations.push(population);
    if (reducedMotion) {
      if (!matchesReducedPose(sample)) addEvent('unexpected-reduced-pose', index,
        Math.abs(sample.cameraDistanceWU - expectedDistance(sample)), 0.00001);
    } else {
      const lag = Math.abs(sample.cameraDistanceWU / distancePerPixel - sample.scrollTop);
      responseLags.push({ index, value: lag });
      if (lag > 1.05) addEvent('camera-response-lag', index, lag, 1.05);
    }
    if (!index) continue;
    const previous = samples[index - 1];
    const scrollDelta = sample.scrollTop - previous.scrollTop;
    const distanceDelta = sample.cameraDistanceWU - previous.cameraDistanceWU;
    const chord = positionDelta(sample.cameraPosition, previous.cameraPosition);
    const angularDelta = angle(sample.cameraQuaternion, previous.cameraQuaternion);
    const modelIds = new Set([...Object.keys(previous.stageVisibilityByModel), ...Object.keys(sample.stageVisibilityByModel)]);
    const visibilitySteps = [...modelIds].map(id => Math.abs(
      (sample.stageVisibilityByModel[id] || 0) - (previous.stageVisibilityByModel[id] || 0),
    ));
    const opacityStep = maximum(visibilitySteps), opacityL1Step = visibilitySteps.reduce((sum, value) => sum + value, 0);
    const expectedCut = reducedMotion && matchesReducedPose(sample) && matchesReducedPose(previous)
      && Math.abs(expectedDistance(sample) - expectedDistance(previous)) > 0.00001;
    if (expectedCut) expectedCuts.push(eventAt(index, distanceDelta, null));
    if (scrollDelta * direction < -0.01) addEvent('scroll-direction-error', index, Math.abs(scrollDelta), 0.01);
    if (distanceDelta * direction < -0.000001) addEvent('camera-direction-error', index, Math.abs(distanceDelta), 0.000001);
    const moving = Math.abs(scrollDelta) > 0.01;
    if (!reducedMotion && moving && Math.abs(distanceDelta) <= 0.000001) addEvent('camera-stall', index, Math.abs(scrollDelta), 0);
    if (!reducedMotion && Math.abs(distanceDelta) > 0.000001 && chord <= 0.000001) addEvent('camera-position-stall', index, Math.abs(distanceDelta), 0);
    if (!reducedMotion) {
      const stepErrorPx = Math.abs(distanceDelta / distancePerPixel - scrollDelta);
      if (stepErrorPx > 1.05) addEvent('unexpected-camera-distance-step', index, stepErrorPx, 1.05);
      if (chord > Math.abs(distanceDelta) * 1.01 + 0.00001) addEvent('camera-chord-exceeds-arc', index, chord, Math.abs(distanceDelta) * 1.01 + 0.00001);
    } else if (!expectedCut && (chord > 0.00001 || angularDelta > 0.00001)) {
      addEvent('unexpected-reduced-pose-movement', index, chord, 0.00001, { angularDeltaDegrees: angularDelta });
    }
    if (!expectedCut && angularDelta > 2.5) addEvent('orientation-step', index, angularDelta, 2.5);
    if (!expectedCut && opacityStep > 0.16) addEvent('model-opacity-step', index, opacityStep, 0.16);
    if (!expectedCut && opacityL1Step > 0.32) addEvent('stage-opacity-l1-step', index, opacityL1Step, 0.32);
    // Camera deltas describe the preceding inputs, not the following RAF gap.
    // Keep the actual callback clock separately for cadence and response age.
    const inputDtMs = Number.isFinite(previous.inputRafTimeMs)
      ? sample.inputRafTimeMs - previous.inputRafTimeMs : null;
    const interval = { index, scrollDelta, distanceDelta, chord, angularDelta, moving,
      opacityStep, opacityL1Step, cameraLocked: sample.cameraLocked, expectedCut, inputDtMs,
      speed: inputDtMs > 0 ? chord / (inputDtMs / 1000) : null,
      angularSpeed: inputDtMs > 0 ? angularDelta / (inputDtMs / 1000) : null };
    const prior = intervals.at(-1);
    if (inputDtMs > 0 && Number.isFinite(prior?.speed)) {
      interval.acceleration = (interval.speed - prior.speed) / (inputDtMs / 1000);
      interval.angularAcceleration = (interval.angularSpeed - prior.angularSpeed) / (inputDtMs / 1000);
      if (Number.isFinite(prior.acceleration)) interval.jerk = (interval.acceleration - prior.acceleration) / (inputDtMs / 1000);
    }
    intervals.push(interval);
  }
  const gaps = samples.slice(1).map((sample, index) => ({ index: index + 1, value: sample.frameIntervalMs }));
  const frameIntervalMs = distribution(gaps.map(item => item.value));
  frameIntervalMs.overBudgetCounts = Object.fromEntries([16.7, 25, 33.4, 50, 100]
    .map(budget => [String(budget), gaps.filter(item => item.value > budget).length]));
  if (reference && frameIntervalMs.p95 > 20) addEvent('reference-p95-over-20ms',
    worst(gaps).sampleIndex, frameIntervalMs.p95, 20, { performanceEvidence: 'unresolved-60fps-evidence' });
  const moving = intervals.filter(item => item.moving);
  const movingCamera = moving.filter(item => Math.abs(item.distanceDelta) > 0.000001);
  const absolute = key => movingCamera.filter(item => Number.isFinite(item[key])).map(item => Math.abs(item[key]));
  const legacyChecks = [
    ['presented_sample_count', samples.length, durationMs / 1000 * 40, 'minimum', false],
    ['scroll_direction', moving.filter(item => Math.sign(item.scrollDelta) !== direction).length, 0, 'maximum', false],
    ['camera_motion_until_terminal_lock', moving.filter(item => Math.abs(item.distanceDelta) <= 0.000001 && !item.cameraLocked).length, 0],
    ['authored_distance_scroll_match', coefficient(movingCamera.map(item => Math.abs(item.distanceDelta / item.scrollDelta))), 0.02],
    ['rendered_speed_stability', coefficient(movingCamera.map(item => item.chord / Math.abs(item.scrollDelta))), 0.35],
    ['camera_acceleration', percentile(absolute('acceleration'), 0.99), 2000],
    ['camera_jerk', percentile(absolute('jerk'), 0.99), 150000],
    ['orientation_step', percentile(absolute('angularDelta'), 0.99), 2.5],
    ['orientation_acceleration', percentile(absolute('angularAcceleration'), 0.99), 1500],
    ['maximum_model_visibility_step', maximum(moving.map(item => item.opacityStep)), 0.16],
    ['stage_visibility_l1_step', maximum(moving.map(item => item.opacityL1Step)), 0.32],
    ['combined_stage_population', Math.min(...populations), 0.98, 'minimum', false],
  ].map(([code, actual, limit, comparison = 'maximum', continuousOnly = true]) => {
    const applicable = !continuousOnly || !reducedMotion;
    const pass = applicable ? Number.isFinite(actual) && (comparison === 'minimum' ? actual >= limit : actual <= limit) : null;
    return { code, actual, limit, comparison, pass,
      status: !applicable ? 'not-applicable-authored-cuts' : pass ? 'within-retained-threshold' : 'requires-root-review' };
  });
  const metricWorst = {
    frameGap: worst(gaps, 50), cameraResponseLagPx: worst(responseLags, 1.05),
    cameraStepWU: worst(intervals.map(item => ({ index: item.index, value: Math.abs(item.distanceDelta) }))),
    orientationStepDegrees: worst(intervals.map(item => ({ index: item.index, value: item.angularDelta })), 2.5),
    modelOpacityStep: worst(intervals.map(item => ({ index: item.index, value: item.opacityStep })), 0.16),
    stageOpacityL1Step: worst(intervals.map(item => ({ index: item.index, value: item.opacityL1Step })), 0.32),
    cameraAccelerationWUPerSecond2: worst(intervals.filter(item => Number.isFinite(item.acceleration))
      .map(item => ({ index: item.index, value: Math.abs(item.acceleration) })), 2000),
    cameraJerkWUPerSecond3: worst(intervals.filter(item => Number.isFinite(item.jerk))
      .map(item => ({ index: item.index, value: Math.abs(item.jerk) })), 150000),
    orientationAccelerationDegreesPerSecond2: worst(intervals.filter(item => Number.isFinite(item.angularAcceleration))
      .map(item => ({ index: item.index, value: Math.abs(item.angularAcceleration) })), 1500),
    recorderCostMs: worst(samples.map((sample, index) => ({ index, value: sample.recorderCostMs }))),
    callbackCostMs: worst(samples.map((sample, index) => ({ index, value: sample.callbackCostMs }))),
  };
  for (const check of legacyChecks.filter(item => item.pass === false)) {
    // These retain the older audit's thresholds as named checks, separate
    // from frame-budget and pointwise discontinuity review requirements.
    const relevantWorst = ({ camera_acceleration: metricWorst.cameraAccelerationWUPerSecond2,
      camera_jerk: metricWorst.cameraJerkWUPerSecond3, orientation_step: metricWorst.orientationStepDegrees,
      orientation_acceleration: metricWorst.orientationAccelerationDegreesPerSecond2,
      maximum_model_visibility_step: metricWorst.modelOpacityStep,
      stage_visibility_l1_step: metricWorst.stageOpacityL1Step })[check.code];
    addEvent(`retained-motion:${check.code}`, relevantWorst?.sampleIndex ?? samples.length - 1, check.actual, check.limit,
      { scope: relevantWorst ? 'Segment statistic, with the most extreme frame as the seek location.'
        : 'Segment statistic; this timestamp is the end of its observation interval.', comparison: check.comparison });
  }
  const reviewReasons = [...new Set(events.map(item => item.code))].map(code => {
    const matching = events.filter(item => item.code === code);
    return { code, status: 'pending-root-review', eventCount: matching.length, first: matching[0],
      worst: matching.reduce((a, b) => b.value > a.value ? b : a),
      requirement: 'Review the source-bound film and capture context; record explicit disposition or remediate and recapture.' };
  });
  const recordedDurationMs = samples.at(-1).timeMs - first.timeMs;
  const cost = key => ({ ...distribution(samples.map(sample => sample[key])),
    totalMs: samples.reduce((sum, sample) => sum + sample[key], 0),
    fractionOfRecordedDuration: samples.reduce((sum, sample) => sum + sample[key], 0) / recordedDurationMs });
  return { schema: 'about-raf-motion-evidence/v1', segment, direction, reference, reducedMotion,
    sampleCount: samples.length, recordedDurationMs, expectedDurationMs: durationMs,
    timeOriginMs: first.timeOriginMs, firstRafTimeMs: first.timeMs, frameIntervalMs,
    contextContinuityGuard: first.contextContinuityGuard || null,
    status: reviewReasons.length ? 'requires-root-review' : 'recorded-no-threshold-flags',
    performanceEvidence: reference && frameIntervalMs.p95 > 20 ? 'unresolved-60fps-evidence' : 'hardware-presentation-unverified',
    cadenceScope: 'Every native RAF callback during active WebGL and video encoding; callbacks and runtime camera state do not establish GPU completion or displayed/physical-device FPS.',
    timingScope: 'Motion derivatives use preceding input RAF timestamps. Cadence uses actual observation RAF timestamps. Initial external positioning has no invented input timestamp.',
    recorderCostMs: cost('recorderCostMs'), callbackCostMs: cost('callbackCostMs'),
    overheadScope: 'Recorder cost includes existing identity guards and the cheap motion read/retention. Callback cost also includes the native input driver. Browser serialization, encoder and GPU costs are outside this timer.',
    observationAgeMs: distribution(samples.map(sample => Math.max(0, sample.observedAtMs - sample.timeMs))),
    inputObservationAgeMs: distribution(samples.filter(sample => Number.isFinite(sample.inputRequestedAtMs))
      .map(sample => sample.observedAtMs - sample.inputRequestedAtMs)),
    maximumCameraResponseLagPx: reducedMotion ? null : maximum(responseLags.map(item => item.value)),
    continuity: { cameraStallCount: events.filter(item => item.code === 'camera-stall').length,
      cameraPositionStallCount: events.filter(item => item.code === 'camera-position-stall').length,
      cameraDirectionErrorCount: events.filter(item => item.code === 'camera-direction-error').length,
      scrollDirectionErrorCount: events.filter(item => item.code === 'scroll-direction-error').length,
      modelOpacityJumpCount: events.filter(item => item.code === 'model-opacity-step').length,
      stageOpacityJumpCount: events.filter(item => item.code === 'stage-opacity-l1-step').length,
      unexpectedReducedPoseCount: events.filter(item => item.code === 'unexpected-reduced-pose').length,
      maximumModelOpacityStep: metricWorst.modelOpacityStep?.value ?? null,
      maximumStageOpacityL1Step: metricWorst.stageOpacityL1Step?.value ?? null },
    expectedReducedCuts: expectedCuts,
    reducedMotionScope: reducedMotion ? 'Only source-anchor cuts and stationary source holds are expected; frame gaps, wrong poses, wrong direction and movement within a held pose remain reviewable.' : null,
    retainedMotionChecks: legacyChecks,
    retainedMotionScope: 'Named thresholds from audit-about-motion-continuity.mjs, applied at this declared segment rate. Its default 9-second traversal remains a separate audit. The legacy sample-count name means RAF observations, not displayed frames.',
    worstEvents: metricWorst, reviewReasons, reviewEvents: events };
}

function motionEventForVideo(evidence, event, startedAt) {
  return event && ({ ...event, approximateVideoSeekSeconds: Number.isFinite(evidence.timeOriginMs)
    ? (evidence.timeOriginMs + event.timeMs - Date.parse(startedAt)) / 1000 : null });
}

export function resolveAboutAuditReviewStatus({ failed = false, distantReviews = 0, motionReviews = 0, passedStatus = 'passed' }) {
  if (failed) return 'failed';
  if (distantReviews && motionReviews) return 'requires-distant-overlap-and-motion-review';
  if (distantReviews) return 'requires-distant-overlap-review';
  if (motionReviews) return 'requires-motion-review';
  return passedStatus;
}

export function describeAboutJourneyMotionReviews({ startedAt, interactionTraversal, continuousReferences }) {
  return [interactionTraversal, continuousReferences].flatMap(record => Object.values(record?.motionEvidence || {})
    .flatMap(evidence => evidence.reviewReasons.map(reason => {
      const seek = event => motionEventForVideo(evidence, event, startedAt);
      return { segment: evidence.segment, ...reason, first: seek(reason.first), worst: seek(reason.worst),
        seekScope: 'Approximate encoder seek guide from the browser RAF clock and page-creation wall time; actual RAF/input timestamps remain authoritative.' };
    })));
}

export function describeAboutJourneyVideoSegments({ startedAt, interactionTraversal, continuousReferences }) {
  const segments = [];
  const motionReviews = describeAboutJourneyMotionReviews({ startedAt, interactionTraversal, continuousReferences });
  const append = (label, record, startKey, endKey, motionSegments) => {
    if (!record?.[startKey]) return;
    const start = Date.parse(record[startKey]), end = Date.parse(record[endKey]), origin = Date.parse(startedAt);
    assert.ok(Number.isFinite(start) && Number.isFinite(end) && Number.isFinite(origin) && end > start,
      `${label}: invalid video segment timestamps.`);
    segments.push({ label, approximateStartSeconds: (start - origin) / 1000,
      durationSeconds: (end - start) / 1000, motionMode: record.motionMode || 'scroll-owned-source-rail',
      motionReviewMarkers: motionReviews.filter(review => motionSegments.includes(review.segment)),
      motionWorstMarkers: Object.values(record.motionEvidence || {})
        .filter(evidence => motionSegments.includes(evidence.segment))
        .flatMap(evidence => Object.entries(evidence.worstEvents).filter(([, event]) => event)
          .map(([metric, event]) => ({ segment: evidence.segment, metric, ...motionEventForVideo(evidence, event, startedAt) }))),
      scope: 'Seek guide relative to page creation for the complete active-scene segment. Title-only draw suspension occurs outside these segments.' });
  };
  append('Fast interaction: complete forward and reverse', interactionTraversal, 'startedAt', 'endedAt', ['fast-forward', 'fast-reverse']);
  append('London at common reference rate', continuousReferences, 'londonStartedAt', 'londonEndedAt', ['london-reference']);
  append('Whole journey at the same reference rate', continuousReferences, 'wholeRouteStartedAt', 'wholeRouteEndedAt', ['whole-route-reference']);
  return segments;
}

export function assertAboutFocusOutlineVisible(target, label, tolerancePx = 0.5) {
  assert.equal(target.focusVisible, true, `${label}: keyboard focus is not visibly indicated.`);
  assert.ok(target.outlineStyle !== 'none' && target.outlineWidth > 0,
    `${label}: no measurable keyboard focus outline.`);
  const expansion = Math.max(0, target.outlineWidth + target.outlineOffset);
  const bounds = { left: target.left - expansion, right: target.right + expansion,
    top: target.top - expansion, bottom: target.bottom + expansion };
  const clearancePx = { left: bounds.left - target.clip.left, right: target.clip.right - bounds.right,
    top: bounds.top - target.clip.top, bottom: target.clip.bottom - bounds.bottom };
  assert.ok(Object.values(clearancePx).every(gap => Number.isFinite(gap) && gap >= -tolerancePx),
    `${label}: focus outline is clipped (${JSON.stringify(clearancePx)} CSS px).`);
  return { expansionPx: expansion, bounds, clearancePx };
}

export function assertAboutFinaleInitialVisibility(result, { enlargedText = false } = {}) {
  if (enlargedText) return;
  assert.ok(result.copyOverflow <= 1,
    `The entire normal-text invitation and actions must fit without inner scrolling (${result.copyOverflow} px overflow).`);
  for (const action of result.actions) {
    assert.ok(action.top >= result.copyTop - 1 && action.bottom <= result.copyBottom + 1,
      `Final action ${action.label} must be fully visible at normal text size before focus scrolls it.`);
  }
}

export async function assertFinaleAccess(page, { enlargedText = false } = {}) {
  await page.waitForFunction(() => {
    const actions = document.querySelector('.about-narrative-finale-actions');
    return actions && !actions.inert && actions.getAttribute('aria-hidden') !== 'true';
  });
  const result = await page.evaluate(() => {
    const scene = document.querySelector('[data-about-finale-scene-zone]').getBoundingClientRect();
    const copyElement = document.querySelector('[data-about-finale-copy]');
    const copy = copyElement.getBoundingClientRect();
    const credit = document.querySelector('.about-narrative-scan-credit').getBoundingClientRect();
    const scrollport = document.querySelector('.about-narrative-scrollport');
    const clip = scrollport.getBoundingClientRect();
    const actions = [...document.querySelectorAll('.about-narrative-finale-actions button, .about-narrative-finale-actions a')];
    return {
      sceneTop: scene.top, copyBottom: copy.bottom, copyTop: copy.top, creditTop: credit.top, creditBottom: credit.bottom,
      clip: { left: Math.max(0, clip.left), right: Math.min(innerWidth, clip.right),
        top: Math.max(0, clip.top), bottom: Math.min(innerHeight, clip.bottom) },
      horizontalOverflow: scrollport.scrollWidth - scrollport.clientWidth,
      copyOverflow: copyElement.scrollHeight - copyElement.clientHeight,
      actions: actions.map(node => {
        const bounds = node.getBoundingClientRect();
        return { label: node.getAttribute('aria-label') || node.textContent.trim(),
          left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom,
          width: bounds.width, height: bounds.height,
          hidden: Boolean(node.closest('[inert], [aria-hidden="true"]')) };
      }),
    };
  });
  assert.ok(result.copyBottom <= result.sceneTop + 1, 'The invitation must occupy the sky above the scene slot.');
  assert.ok(result.copyTop >= result.creditBottom - 0.5 || result.creditTop >= result.copyBottom - 0.5,
    'The scan credit overlaps the final reading region.');
  assert.ok(result.horizontalOverflow <= 1, 'Finale creates horizontal overflow.');
  assert.ok(result.actions.length >= 2, 'Final contact actions are missing.');
  assertAboutFinaleInitialVisibility(result, { enlargedText });
  const copy = page.locator('[data-about-finale-copy]');
  const overflow = await copy.evaluate(node => node.scrollHeight - node.clientHeight);
  await copy.focus();
  result.keyboardReading = await copy.evaluate(node => ({
    focused: document.activeElement === node, role: node.getAttribute('role'),
    label: document.getElementById(node.getAttribute('aria-labelledby'))?.textContent.trim(),
  }));
  assert.equal(result.keyboardReading.focused, true, 'The final reading region must accept keyboard focus.');
  assert.equal(result.keyboardReading.role, 'region');
  assert.ok(result.keyboardReading.label, 'The final reading region needs its visible heading as its accessible name.');
  if (overflow > 10) {
    await copy.evaluate(node => { node.scrollTop = 0; });
    await page.keyboard.press('PageDown');
    await page.waitForTimeout(250);
    result.keyboardReading.forward = await copy.evaluate(node => node.scrollTop);
    assert.ok(result.keyboardReading.forward > 2, 'Keyboard PageDown did not scroll the final reading region.');
    await page.keyboard.press('Home');
    await page.waitForTimeout(250);
    result.keyboardReading.reverse = await copy.evaluate(node => node.scrollTop);
    assert.ok(result.keyboardReading.reverse < result.keyboardReading.forward - 2, 'Keyboard Home did not return the final reading region.');
  }
  if (overflow > 10) {
    await copy.evaluate(node => { node.scrollTop = 0; });
    const bounds = await copy.boundingBox();
    const distance = Math.min(120, Math.floor(overflow / 2));
    await page.mouse.move(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
    await page.mouse.wheel(0, distance);
    await page.waitForTimeout(350);
    const forward = await copy.evaluate(node => node.scrollTop);
    assert.ok(forward > 2, 'Enlarged finale copy must accept wheel input.');
    await page.mouse.wheel(0, -distance);
    await page.waitForTimeout(350);
    const reverse = await copy.evaluate(node => node.scrollTop);
    assert.ok(reverse < forward - 2, 'Enlarged finale copy must scroll back with the wheel.');
    result.nestedScroll = { overflow, forward, reverse };
  }
  // Establish keyboard modality before checking the real :focus-visible ring.
  await copy.focus();
  await page.keyboard.press('Tab');
  result.focusedActions = [];
  for (const [index, action] of result.actions.entries()) {
    const control = page.locator('.about-narrative-finale-actions button, .about-narrative-finale-actions a').nth(index);
    await control.focus();
    // At enlarged text sizes focus scrolls the bounded copy region. Check the
    // resulting visible target, including its ancestor clip and actual viewport.
    const target = await control.evaluate(node => {
      const box = node.getBoundingClientRect();
      const style = getComputedStyle(node);
      const clip = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
      const clippingAncestors = [];
      for (let parent = node.parentElement; parent; parent = parent.parentElement) {
        const parentStyle = getComputedStyle(parent);
        const clipsX = ['auto', 'scroll', 'hidden', 'clip'].includes(parentStyle.overflowX);
        const clipsY = ['auto', 'scroll', 'hidden', 'clip'].includes(parentStyle.overflowY);
        if (!clipsX && !clipsY) continue;
        const bounds = parent.getBoundingClientRect();
        // Overflow clips at the padding box, inside the border edge.
        const paddingBox = { left: bounds.left + (parseFloat(parentStyle.borderLeftWidth) || 0),
          right: bounds.right - (parseFloat(parentStyle.borderRightWidth) || 0),
          top: bounds.top + (parseFloat(parentStyle.borderTopWidth) || 0),
          bottom: bounds.bottom - (parseFloat(parentStyle.borderBottomWidth) || 0) };
        if (clipsX) { clip.left = Math.max(clip.left, paddingBox.left); clip.right = Math.min(clip.right, paddingBox.right); }
        if (clipsY) { clip.top = Math.max(clip.top, paddingBox.top); clip.bottom = Math.min(clip.bottom, paddingBox.bottom); }
        clippingAncestors.push({ tag: parent.tagName, className: parent.className,
          overflowX: parentStyle.overflowX, overflowY: parentStyle.overflowY, bounds: paddingBox });
      }
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom,
        hit: document.elementFromPoint((box.left + box.right) / 2, (box.top + box.bottom) / 2)?.closest('button, a') === node,
        clip, clippingAncestors, focusVisible: node.matches(':focus-visible'),
        outlineWidth: parseFloat(style.outlineWidth) || 0, outlineOffset: parseFloat(style.outlineOffset) || 0,
        outlineStyle: style.outlineStyle, outlineColor: style.outlineColor };
    });
    assert.equal(action.hidden, false, `Final action ${action.label} is inaccessible.`);
    assert.ok(action.width > 20 && action.height > 20, 'Final action has no usable target.');
    assert.ok(target.left >= target.clip.left - 1 && target.right <= target.clip.right + 1,
      `Final action ${action.label} is horizontally cropped.`);
    assert.ok(target.top >= target.clip.top - 1 && target.bottom <= target.clip.bottom + 1,
      `Final action ${action.label} is vertically cropped.`);
    assert.equal(target.hit, true, `Final action ${action.label} is covered by another surface.`);
    assert.equal(await control.evaluate(node => document.activeElement === node), true);
    const outline = assertAboutFocusOutlineVisible(target, `Final action ${action.label}`);
    result.focusedActions.push({ label: action.label, ...target, outline });
  }
  // Traverse with the keyboard without following external links or sending mail.
  await page.locator('.about-narrative-finale-actions button, .about-narrative-finale-actions a').first().focus();
  // Safari's default Tab navigation skips links; Option-Tab includes them.
  await page.keyboard.press(browserName === 'webkit' ? 'Alt+Tab' : 'Tab');
  assert.equal(await page.evaluate(() => Boolean(document.activeElement.closest('.about-narrative-finale-actions'))), true);
  return result;
}

async function editRange(page, id) {
  const control = page.locator(`#${id}`);
  const folder = control.locator('xpath=ancestor::details');
  if (!await folder.getAttribute('open').then(value => value !== null)) await folder.locator('summary').click();
  await control.scrollIntoViewIfNeeded();
  const before = Number(await control.inputValue());
  await control.focus();
  await control.press(before < Number(await control.getAttribute('max')) ? 'ArrowRight' : 'ArrowLeft');
  const after = Number(await control.inputValue());
  assert.notEqual(after, before, `Range ${id} did not respond to keyboard input.`);
  await page.waitForTimeout(250);
  return { before, after };
}

async function auditControls(page, profile, layoutProfile = profile) {
  const before = await metrics(page);
  await page.locator('.about-narrative-scrollport').click({ position: { x: 8, y: 8 } });
  await page.keyboard.press('/');
  await page.locator('[data-about-scene-parameters]').waitFor({ state: 'visible' });
  const population = await editRange(page, 'about-scene-globals-pointMaterial-pointDensity');
  const changed = await metrics(page);
  assert.equal(changed.controls.pointDensity, population.after);
  assertBuffers(changed);
  const distance = await editRange(page, 'about-scene-globals-camera-distanceFogEndWU');
  const overridden = await metrics(page);
  assert.equal(overridden.controls.fogEndWU, distance.after);
  assert.equal(await page.locator('[data-about-effective-fog]').getAttribute('data-about-effective-fog'), 'website');
  await page.getByRole('button', { name: 'Reset to Blender', exact: true }).click();
  await page.waitForTimeout(250);
  const reset = await metrics(page);
  assert.equal(await page.locator('[data-about-effective-fog]').getAttribute('data-about-effective-fog'), 'blender');
  assert.equal(reset.controls.fogEndWU, metadata.source.authoring.cameraFog.endWU);
  assertBuffers(reset);
  await page.keyboard.press('Escape');
  // These edits intentionally remain unsaved. Prove reload uses canonical data;
  // durable save/reload/reset itself is exercised by the focused registry tests.
  await page.reload();
  await waitForAboutSurfelRuntime(page, profile, 120_000, layoutProfile);
  const reloaded = await metrics(page);
  assert.equal(reloaded.controls.pointDensity, before.controls.pointDensity);
  assert.equal(reloaded.controls.fogEndWU, before.controls.fogEndWU);
  return { population, distance, resetToBlender: true, unsavedReloadRestored: true };
}

export async function contactSheet(frames, directory) {
  const width = 320, height = 240, columns = 4;
  const sheet = new PNG({ width: width * columns, height: height * Math.ceil(frames.length / columns) });
  sheet.data.fill(22);
  for (let offset = 3; offset < sheet.data.length; offset += 4) sheet.data[offset] = 255;
  for (let index = 0; index < frames.length; index += 1) {
    const source = PNG.sync.read(await readFile(frames[index].path));
    const scale = Math.min(width / source.width, height / source.height);
    const tileWidth = Math.floor(source.width * scale), tileHeight = Math.floor(source.height * scale);
    const left = index % columns * width + Math.floor((width - tileWidth) / 2);
    const top = Math.floor(index / columns) * height + Math.floor((height - tileHeight) / 2);
    for (let y = 0; y < tileHeight; y += 1) for (let x = 0; x < tileWidth; x += 1) {
      const from = (Math.floor(y / scale) * source.width + Math.floor(x / scale)) * 4;
      const to = ((top + y) * sheet.width + left + x) * 4;
      source.data.copy(sheet.data, to, from, from + 4);
    }
  }
  await writeFile(resolve(directory, 'contact-sheet.png'), PNG.sync.write(sheet));
  await writeFile(resolve(directory, 'contact-sheet.json'), JSON.stringify(frames, null, 2));
}

export function resolveAboutJourneyAuditStops(map, readingStops = []) {
  assert.equal(map.valid, true, 'Physical cue audit requires a resolved, valid journey map.');
  const checkpoints = map.anchors.flatMap(anchor => {
    assert.ok(Number.isFinite(anchor.cameraStoryWU),
      `Camera cue ${anchor.id} has no physical cameraStoryWU; editorial storyWU is not a legacy fallback.`);
    if (anchor.cameraStoryWU <= 0 || anchor.cameraStoryWU >= map.durationWU) return [];
    return [{ id: `cue-${anchor.id}`, storyWU: anchor.cameraStoryWU,
      editorialStoryWU: anchor.storyWU, cameraDistanceWU: anchor.cameraDistanceWU, capture: true }];
  });
  // Reading stops belong to the measured editorial spans. Keep them distinct
  // even when a named physical camera cue resolves near the same text.
  const stops = [...checkpoints, ...readingStops].sort((a, b) => a.storyWU - b.storyWU);
  return { checkpoints, positions: [{ id: 'opening', storyWU: 0 }, ...stops,
    { id: 'finale', storyWU: map.durationWU, capture: true }] };
}

export function resolveAboutJourneyAuditReference(map) {
  const river = map.anchors.find(anchor => anchor.id === 'river-reveal');
  assert.ok(Number.isFinite(river?.cameraStoryWU) && river.cameraStoryWU >= 0 && river.cameraStoryWU < map.durationWU,
    'London reference requires a resolved physical river-reveal cameraStoryWU.');
  return { startCameraStoryWU: river.cameraStoryWU, startEditorialStoryWU: river.storyWU,
    londonMs: 60_000, wholeRouteMs: 60_000 * map.durationWU / (map.durationWU - river.cameraStoryWU),
    storyWUPerSecond: (map.durationWU - river.cameraStoryWU) / 60 };
}

export async function runUnifiedJourneyAudit() {
await mkdir(output, { recursive: true });
const report = { browser: browserName, sourceHash: metadata.source.sha256, requestedCases: cases.map(entry => entry.id), cases: [] };
const browser = await launchAboutAuditBrowser(browserName);
try {
  for (const entry of cases) {
    const directory = resolve(output, entry.id);
    await mkdir(directory, { recursive: true });
    const context = await browser.newContext({ viewport: entry.viewport, deviceScaleFactor: 1,
      colorScheme: entry.theme, reducedMotion: entry.reducedMotion ? 'reduce' : 'no-preference',
      recordVideo: { dir: directory, size: entry.viewport } });
    await context.addInitScript(theme => localStorage.setItem('theme-preference-v3', theme), entry.theme);
    const page = await context.newPage();
    const video = page.video();
    const errors = collectPageErrors(page), frames = [];
    const result = { id: entry.id, sourceHash: metadata.source.sha256, status: 'running', viewport: entry.viewport,
      reducedMotion: entry.reducedMotion, captures: [], passes: [], terminal: [] };
    report.cases.push(result);
    const capture = async label => {
      const path = resolve(directory, `${String(frames.length).padStart(3, '0')}-${label}.png`);
      await page.screenshot({ path, animations: 'allow' });
      frames.push({ label, path });
      result.captures.push({ label, ...await snapshot(page) });
    };
    try {
      await page.goto(`${baseUrl}/about.html?preview=about&edit=0`);
      await waitForAboutSurfelRuntime(page, entry.runtimeProfile, 120_000, entry.layoutProfile || entry.runtimeProfile);
      await page.waitForSelector('[data-about-entrance-state="complete"]');
      await page.waitForFunction(() => document.fonts.status === 'loaded');
      console.log(`READY ${browserName} ${entry.id}`);
      const initial = await metrics(page);
      assertBuffers(initial);
      assert.equal(initial.reducedMotion, entry.reducedMotion);
      assert.equal(await page.locator('html').getAttribute('data-abs-theme'), entry.theme);
      assert.equal(await page.locator('.about-narrative-finale-actions').evaluate(node => node.inert), true);
      const map = resolveAboutNarrativeJourneyMap(await getAboutSurfelJourneyMap(page), cameraTrack);
      assert.equal(map.valid, true);
      result.durationWU = map.durationWU;
      const readingStops = await page.evaluate(() => [...document.querySelectorAll('[data-render-span-id]')].map(node => ({
        id: node.querySelector('[data-text-field-id]').dataset.textFieldId,
        storyWU: Number(node.dataset.storyStartWu) + (Number(node.dataset.storyEndWu) - Number(node.dataset.storyStartWu)) * 0.35,
        capture: true,
      })));
      const { checkpoints, positions } = resolveAboutJourneyAuditStops(map, readingStops);
      result.physicalCheckpoints = checkpoints;
      result.editorialReadingStops = readingStops;
      await capture('opening');
      // Reduced motion is verified as stable compositions at every cue. Long
      // continuous travel is covered by the ordinary motion cases below.
      const durations = entry.reducedMotion ? [3000, 2000, 2000] : [36000, 10000, 10000];
      for (const [name, targets, totalMs] of [
        ['slow-forward', positions.slice(1), durations[0]],
        ['fast-reverse', positions.slice(0, -1).toReversed(), durations[1]],
        ['fast-forward', positions.slice(1), durations[2]],
      ]) {
        const pass = { name, samples: [], checkpoints: [] };
        for (const target of targets) {
          const previous = await snapshot(page);
          const milliseconds = Math.max(name === 'slow-forward' ? 90 : 30,
            Math.abs(target.storyWU - previous.storyWU) / map.durationWU * totalMs);
          const samples = await moveContinuously(page, target.storyWU, milliseconds, name === 'slow-forward' ? 0.15 : 0.5);
          pass.samples.push(...samples);
          if (target.id.startsWith('cue-')) {
            await driveAboutStoryWU(page, target.storyWU);
            pass.checkpoints.push({ id: target.id, targetCameraStoryWU: target.storyWU,
              editorialStoryWU: target.editorialStoryWU, targetCameraDistanceWU: target.cameraDistanceWU,
              ...await snapshot(page) });
          }
          if (name === 'slow-forward' && target.capture) await capture(target.id);
        }
        assert.equal(pass.checkpoints.length, checkpoints.length, `${name} missed a camera cue.`);
        for (let index = 1; index < pass.samples.length; index += 1) {
          const delta = pass.samples[index].cameraDistanceWU - pass.samples[index - 1].cameraDistanceWU;
          assert.ok(name === 'fast-reverse' ? delta <= 0.00001 : delta >= -0.00001,
            `${name}: camera reversed against scroll.`);
        }
        result.passes.push(pass);
        console.log(`PASS ${browserName} ${entry.id} ${name}: ${pass.checkpoints.length} camera cues`);
      }
      const reference = result.passes[0].checkpoints;
      for (const pass of result.passes.slice(1)) for (const pose of pass.checkpoints) {
        assertSameCamera(reference.find(sample => sample.id === pose.id), pose, `${pass.name} ${pose.id}`);
      }
      await driveAboutStoryWU(page, map.durationWU * 0.5);
      const stopped = await snapshot(page);
      await page.waitForTimeout(750);
      const later = await snapshot(page);
      assertSameCamera(stopped, later, 'Stationary scroll');
      assert.equal(Number.isFinite(later.ambientTime), true, 'Motion snapshot must expose the actual ambient clock.');
      const pause = page.locator('[data-about-motion-control]');
      if (entry.reducedMotion) {
        assert.equal(await pause.isDisabled(), true);
        assert.equal(later.ambientTime, stopped.ambientTime);
      } else {
        assert.ok(later.ambientTime > stopped.ambientTime, 'Ambient motion stopped with scroll.');
        await pause.click();
        const paused = await snapshot(page);
        await page.waitForTimeout(600);
        const pausedLater = await snapshot(page);
        assert.equal(pausedLater.ambientTime, paused.ambientTime, 'Pause did not stop the ambient clock.');
        assertSameCamera(paused, pausedLater, 'Paused scene');
        await pause.click();
      }
      await driveAboutStoryWU(page, null);
      await page.waitForTimeout(1000);
      result.finaleAccess = await assertFinaleAccess(page);
      const terminalStart = await snapshot(page);
      for (let tick = 0; tick < 6; tick += 1) {
        await page.waitForTimeout(500);
        const state = await snapshot(page);
        assertSameCamera(terminalStart, state, 'Terminal hold');
        assert.equal(state.cameraLocked, true);
        assert.ok(Array.isArray(state.authoredMotion), 'The runtime must expose authored motion.');
        assert.deepEqual(state.authoredMotion, terminalStart.authoredMotion,
          'The scanned city moved after scroll stopped.');
        result.terminal.push({ ambientTime: state.ambientTime, cameraPosition: state.cameraPosition });
      }
      await capture('finale-after-hold');
      // The blocking review is 60 seconds. Whole-route comparison derives its
      // duration from this same scroll rate; London never gets a camera-only
      // playback multiplier.
      if (!entry.reducedMotion && entry.name === 'desktop') {
        result.referencePlayback = resolveAboutJourneyAuditReference(map);
        await driveAboutStoryWU(page, result.referencePlayback.startCameraStoryWU);
        result.londonReference = await moveContinuously(page, map.durationWU, 60_000);
        await capture('london-reference-end');
        await driveAboutStoryWU(page, 0);
        result.wholeRouteReference = await moveContinuously(page, map.durationWU, result.referencePlayback.wholeRouteMs);
      }
      assertBuffers(await metrics(page));
      // Enlarge the five About text roles without scaling the shared shell or
      // confusing CSS zoom with the browser's own zoom/viewport behaviour.
      const textSizes = await page.evaluate(() => {
        const root = document.querySelector('.about-narrative-lab');
        const title = document.querySelector('.is-finale .about-narrative-spatial-title');
        const body = document.querySelector('.about-narrative-editorial-copy');
        const before = [title, body].map(node => parseFloat(getComputedStyle(node).fontSize));
        const roleScales = {};
        for (const role of ['body', 'small-body', 'eyebrow', 'main-title', 'inbetween-title']) {
          const property = `--about-${role}-size-scale`;
          const current = parseFloat(getComputedStyle(root).getPropertyValue(property)) || 1;
          roleScales[property] = root.style.getPropertyValue(property);
          root.style.setProperty(property, String(current * 2));
        }
        return { before, roleScales };
      });
      await page.waitForTimeout(700);
      await driveAboutStoryWU(page, null);
      const enlargedSizes = await page.evaluate(() => [
        document.querySelector('.is-finale .about-narrative-spatial-title'),
        document.querySelector('.about-narrative-editorial-copy'),
      ].map(node => parseFloat(getComputedStyle(node).fontSize)));
      enlargedSizes.forEach((size, index) => assert.ok(size / textSizes.before[index] > 1.99
        && size / textSizes.before[index] < 2.01));
      result.textSize200 = await assertFinaleAccess(page, { enlargedText: true });
      await capture('finale-text-size-200');
      await page.evaluate(roleScales => {
        const root = document.querySelector('.about-narrative-lab');
        for (const [property, value] of Object.entries(roleScales)) {
          if (value) root.style.setProperty(property, value);
          else root.style.removeProperty(property);
        }
      }, textSizes.roleScales);
      await page.waitForTimeout(300);
      result.controls = await auditControls(page, entry.runtimeProfile, entry.layoutProfile || entry.runtimeProfile);
      await page.locator('[data-route-tab="home"]').click();
      await page.waitForSelector('.about-narrative-lab', { state: 'detached' });
      await page.waitForFunction(() => document.documentElement.dataset.absTransitionPhase === 'idle');
      if (entry.name === 'short') {
        // Home retains the shared landscape rotation cover. Rotate to use its
        // navigation, then restore the short About viewport after returning.
        await page.locator('.viewport-cover').waitFor({ state: 'visible' });
        await page.setViewportSize({ width: 390, height: 844 });
        await page.locator('.viewport-cover').waitFor({ state: 'detached' });
        result.homeRotationCover = true;
      }
      await page.locator('[data-route-tab="about"]').click();
      await waitForAboutSurfelRuntime(page, entry.runtimeProfile, 120_000, entry.layoutProfile || entry.runtimeProfile);
      await page.waitForFunction(() => document.documentElement.dataset.absTransitionPhase === 'idle');
      if (entry.name === 'short') {
        await page.setViewportSize(entry.viewport);
        await waitForAboutSurfelRuntime(page, entry.runtimeProfile);
      }
      assertBuffers(await metrics(page));
      result.routeReturn = true;
      assert.deepEqual(errors, [], 'Browser console/page errors occurred.');
      result.status = 'passed';
      console.log(`DONE ${browserName} ${entry.id}`);
    } catch (error) {
      result.status = 'failed'; result.error = error.stack || String(error);
      await capture('failure').catch(() => {});
      throw error;
    } finally {
      result.errors = errors;
      await writeFile(resolve(directory, 'metrics.json'), JSON.stringify(result, null, 2));
      if (frames.length) await contactSheet(frames, directory);
      await context.close();
      if (video) await video.saveAs(resolve(directory, 'journey.webm'));
      await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
    }
  }
} finally {
  await browser.close();
}
}

if (resolve(process.argv[1] || '') === fileURLToPath(import.meta.url)) await runUnifiedJourneyAudit();
