import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  assertAboutDeliveredMetadata, captureAboutDistantOverlapReview, collectPageErrors, getAboutSurfelJourneyMap, getAboutSurfelState,
  launchAboutAuditBrowser,
} from './audit-about-narrative-surfel-v2-helpers.mjs';
import {
  analyseAboutMotionRecording, assertFinaleAccess, assertSameCamera, contactSheet,
  describeAboutJourneyMotionReviews, describeAboutJourneyVideoSegments, moveContinuously, resolveAboutAuditReviewStatus,
} from './audit-about-unified-journey.mjs';
import { resolveAboutNarrativeJourneyMap } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeJourneyMap.js';
import { TIME_OF_DAY_PALETTE_PERIODS } from '../react-app/app/src/palette/timeOfDayPalette.js';

// Run Chromium and WebKit serially. A core pass deliberately cannot certify
// the gates or city: its evidence remains useful while scan approval is held.
const browserName = process.env.ABS_BROWSER || 'chromium';
assert.ok(['chromium', 'webkit'].includes(browserName));
const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const coreOnly = process.env.ABS_ABOUT_GATES_CORE_ONLY === '1';
assert.ok(!(coreOnly && process.argv.includes('--check-source')), '--check-source requires the complete source proof gate.');
assert.ok(!(coreOnly && process.argv.includes('--check-fixtures')), '--check-fixtures requires the complete source proof gate.');
const routeId = 'blackfriars-st-pauls';
const output = resolve(process.env.ABS_ABOUT_GATES_OUTPUT
  || 'output/about-gates-thames-20260915/blackfriars/audits', browserName);
const assets = resolve(process.env.ABS_ABOUT_ASSET_DIR || 'react-app/app/public/models/about-v2-edited-world');
const metadata = JSON.parse(await readFile(resolve(assets, 'meta.json'), 'utf8'));
const cameraTrack = JSON.parse(await readFile(resolve(assets, 'camera-track.json'), 'utf8'));
const aboutSourceDirectory = 'react-app/app/src/routes/about-narrative-lab';
const runtimeSourcePaths = (await readdir(aboutSourceDirectory, { withFileTypes: true }))
  .filter(item => item.isFile() && /\.(?:js|jsx|css)$/u.test(item.name)).map(item => `${aboutSourceDirectory}/${item.name}`)
  .concat(['react-app/app/public/config/contents-about.json', 'react-app/app/public/config/design-system.json',
    'react-app/app/src/components/app/SiteApp.jsx', 'react-app/app/src/lib/legacy-runtime-scope.js',
    'react-app/app/src/lib/motion/entrance-sequence.js', 'react-app/app/src/lib/motion/title-activation-order.js']).sort();
export async function readRuntimeSourceHashes() {
  return Object.fromEntries(await Promise.all(runtimeSourcePaths.map(async path => [path,
    createHash('sha256').update(await readFile(path)).digest('hex')])));
}
export function findAboutRuntimeSourceChanges(before, after) {
  return runtimeSourcePaths.filter(path => after[path] !== before[path]);
}
const runtimeSourceHashes = await readRuntimeSourceHashes();
const runtimeSourceFingerprint = createHash('sha256').update(JSON.stringify(runtimeSourceHashes)).digest('hex');
const auditScriptSha256 = createHash('sha256').update(await readFile(fileURLToPath(import.meta.url))).digest('hex');
const detailedStillDiagnostics = process.env.ABS_ABOUT_GATES_STILL_DIAGNOSTICS === '1';
const stillPositioningByPage = new WeakMap();
const deliveredRuntimeCodeByPage = new WeakMap();
const trackDistances = [0];
for (let index = 1; index < cameraTrack.samples.length; index += 1) trackDistances.push(trackDistances.at(-1)
  + Math.hypot(...cameraTrack.samples[index].slice(0, 3).map((value, axis) => value - cameraTrack.samples[index - 1][axis])));
const requestedCases = process.env.ABS_ABOUT_GATES_CASES?.split(',').map(value => value.trim());
const filmCases = new Set((process.env.ABS_ABOUT_GATES_FILM_CASES ?? 'desktop-dark-motion,mobile-dark-motion')
  .split(',').map(value => value.trim()).filter(Boolean));
export const REQUIRED_REFERENCE_FILM_CASES = Object.freeze(['desktop-dark-motion', 'mobile-dark-motion']);
const extraCameraDistancesWU = (process.env.ABS_ABOUT_GATES_EXTRA_CAMERA_DISTANCES_WU || '')
  .split(',').map(value => value.trim()).filter(Boolean).map(Number);
assert.ok(extraCameraDistancesWU.every(value => Number.isFinite(value) && value >= 0),
  'ABS_ABOUT_GATES_EXTRA_CAMERA_DISTANCES_WU requires finite nonnegative physical camera distances.');
assert.ok(!(coreOnly && extraCameraDistancesWU.length), 'Extra source-position captures require the same-source proof gate.');
const interactionDirectionMs = 16_000;
const profiles = [
  { name: 'desktop', viewport: { width: 1440, height: 1000 }, pointProfile: 'desktop', layoutProfile: 'desktop' },
  { name: 'tablet', viewport: { width: 834, height: 1112 }, pointProfile: 'mobile', layoutProfile: 'tablet' },
  { name: 'mobile', viewport: { width: 390, height: 844 }, pointProfile: 'mobile', layoutProfile: 'mobile' },
  { name: 'short', viewport: { width: 844, height: 390 }, pointProfile: 'mobile', layoutProfile: 'mobile' },
];
const allCases = profiles.flatMap(profile => ['light', 'dark'].flatMap(theme => (
  [false, true].flatMap(reducedMotion => [false, true].map(enlargedText => ({
    ...profile, theme, reducedMotion, enlargedText,
    id: `${profile.name}-${theme}-${reducedMotion ? 'reduced' : 'motion'}${enlargedText ? '-text200' : ''}`,
  })))
)));
const cases = allCases.filter(entry => !requestedCases || requestedCases.includes(entry.id));
assert.ok(cases.length, 'No matching ABS_ABOUT_GATES_CASES. Use --list-cases.');
if (requestedCases) assert.deepEqual(requestedCases.filter(id => !allCases.some(entry => entry.id === id)), [], 'Unknown case ID.');
const completeMatrixRequested = !coreOnly && cases.length === allCases.length;

export function collectAboutReferenceFilmCoverage(recordedCases, requestedIds, expectedSourceHash) {
  return REQUIRED_REFERENCE_FILM_CASES.map(id => {
    const entry = recordedCases.find(item => item.id === id), reference = entry?.continuousReferences;
    const river = entry?.map?.anchors?.find(anchor => anchor.id === 'river-reveal')?.cameraStoryWU;
    const londonFraction = Number.isFinite(river) && entry.map.durationWU > river
      ? (entry.map.durationWU - river) / entry.map.durationWU : null;
    const wholeDurationMs = londonFraction ? 60000 / londonFraction : null;
    const missing = [];
    if (!entry) missing.push('required-case-not-recorded');
    if (entry?.sourceHash !== expectedSourceHash) missing.push('matching-source-not-established');
    if (!entry?.video || !/^[a-f0-9]{64}$/u.test(entry.videoSha256 || '') || !(entry.videoBytes > 0)) missing.push('hashed-video-missing');
    if (!entry?.checks?.some(check => check.name === 'continuousReferences' && check.status === 'passed')) missing.push('reference-check-not-passed');
    if (!wholeDurationMs) missing.push('source-resolved-London-allocation-missing');
    for (const [key, duration, label] of [['london', 60000, 'london-reference'], ['wholeRoute', wholeDurationMs, 'whole-route-reference']]) {
      const samples = reference?.[key], evidence = reference?.motionEvidence?.[key];
      const observedDurationMs = samples?.at(-1)?.timeMs - samples?.[0]?.timeMs;
      if (!samples || samples.length < 2 || evidence?.segment !== label || evidence.reference !== true
        || evidence.contextContinuityGuard !== 'initial-webgl2-state-and-segment-loss-restoration-events'
        || !Number.isFinite(evidence.recordedDurationMs) || !Number.isFinite(evidence.expectedDurationMs)
        || !Number.isFinite(observedDurationMs) || Math.abs(observedDurationMs - evidence.recordedDurationMs) > 0.001
        || samples.length !== evidence.sampleCount
        || !duration || evidence.recordedDurationMs < duration - 1000
        || Math.abs(evidence.expectedDurationMs - duration) > 1) missing.push(`${key}-complete-active-segment-missing`);
    }
    if (reference?.londonDurationMs !== 60000 || !wholeDurationMs
      || Math.abs((reference?.wholeDurationMs || 0) - wholeDurationMs) > 1) missing.push('common-reference-rate-not-established');
    return { id, required: true, requested: requestedIds.includes(id), recorded: missing.length === 0, missing,
      sourceHash: entry?.sourceHash || null, video: entry?.video || null, videoSha256: entry?.videoSha256 || null,
      requiredLondonDurationMs: 60000, requiredWholeRouteDurationMs: wholeDurationMs,
      plannedWholeRouteDurationMsAt32Percent: 187500,
      londonRecordedDurationMs: reference?.motionEvidence?.london?.recordedDurationMs ?? null,
      wholeRouteRecordedDurationMs: reference?.motionEvidence?.wholeRoute?.recordedDurationMs ?? null,
      motionReviewCount: Object.values(reference?.motionEvidence || {}).reduce((sum, evidence) => sum + (evidence.reviewReasons?.length || 0), 0),
      scope: 'Required captured evidence only. Recorded segments do not establish visual acceptance or clear pending cadence review.' };
  });
}

export function aboutMatrixCompleteness({ coreOnly: core = false, completeMatrixRequested: complete = false,
  missingCases = [], missingInteractionFilmCases = [], missingReferenceFilmCases = [] }) {
  const incompleteRecordings = missingInteractionFilmCases.length > 0 || missingReferenceFilmCases.length > 0;
  return { incompleteRecordings, blocksRequestedCompletion: !core && complete && (missingCases.length > 0 || incompleteRecordings),
    completion: core ? 'blocked-geometry-and-visual-proof' : missingCases.length ? 'incomplete-required-matrix'
      : missingInteractionFilmCases.length ? 'incomplete-required-interaction-films'
        : missingReferenceFilmCases.length ? 'incomplete-required-reference-films' : null };
}

export const DIRECT_ART_REVIEW_CRITERIA = Object.freeze([
  { id: 'about.00-depth-separation', modelKey: 'about.00', requirement: 'Visible foreground, a separate middle opening and a receding destination; assess depth in the actual scene, not from point counts.' },
  { id: 'about.01-reading-depth', modelKey: 'about.01', requirement: 'Background and experience retain a visible foreground, a separate middle anchor and a destination ahead; the next gate remains visible beyond the prose. Identify each in the actual with-copy screenshots and film.' },
  { id: 'about.02-depth-separation', modelKey: 'about.02', requirement: 'Round openings form readable depth layers and a direction ahead throughout the recorded passage.' },
  { id: 'about.03-reading-depth', modelKey: 'about.03', requirement: 'Disciplines and clients retain a visible foreground, a separate middle anchor and a destination ahead; the next gate remains visible with colour and depth beside and beyond the prose. Identify each in the actual with-copy screenshots and film.' },
  { id: 'about.04-square-progression', modelKey: 'about.04', requirement: 'The square gate is visibly square and its repeated openings progress in depth without collapsing into a flat band.' },
  { id: 'about.05-reading-depth', modelKey: 'about.05', requirement: 'How I work retains a visible foreground, a separate middle anchor and a destination ahead; the next gate and river direction remain visible through the final open reading passage. Identify each in the actual with-copy screenshots and film.' },
  { id: 'prose-all-depth-readability', modelKey: null, requirement: 'Read the actual prose with all visible material, including distant overlaps; numerical near-zero alone does not establish readability.' },
]);

export function createAboutDirectArtReview(result) {
  const readingFieldsByModel = { 'about.01': ['text-background-unit'],
    'about.03': ['text-discipline-labels', 'text-selected-clients'], 'about.05': ['text-life-character'] };
  const readingFieldPresent = (item, modelKey) => (readingFieldsByModel[modelKey] || []).some(fieldId => (
    item.fieldId === fieldId || item.visibleEditorialFields?.some(field => field.fieldId === fieldId)
  ));
  const frame = item => ({ path: item.path, sha256: item.screenshotSha256, storyWU: item.storyWU,
    cameraDistanceWU: item.motion?.cameraDistanceWU, paletteId: item.paletteId, kind: 'scene-with-copy' });
  return { schema: 'about-direct-art-review/v1', status: 'pending', caseId: result.id, browser: result.browser,
    sourceHash: result.sourceHash, runtimeSourceFingerprint: result.runtimeSourceFingerprint,
    viewport: result.viewport, theme: result.theme, reducedMotion: result.reducedMotion, enlargedText: result.enlargedText,
    film: result.video ? { path: result.video, sha256: result.videoSha256, segments: result.videoSegments || [] } : null,
    verdictPolicy: 'Only an actual direct reviewer may record pending/rejected/accepted, reviewer, reviewedAt and observations against these exact source/evidence hashes. The audit writes pending and never imports these declarations as automatic visual acceptance. Earlier-source judgments remain historical.',
    criteria: DIRECT_ART_REVIEW_CRITERIA.map(criterion => ({ ...criterion, status: 'pending', reviewer: null,
      reviewedAt: null, observations: [],
      sceneWithCopy: [...(result.review || []), ...(result.extraSourceCaptures || [])].filter(item => criterion.modelKey
        // An empty reading scene is essential evidence for this verdict. Do
        // not omit its with-copy frame merely because zero material is framed.
        ? readingFieldPresent(item, criterion.modelKey) || item.modelFraming?.[criterion.modelKey]?.renderedVisibleCount > 0
        : item.copyProtection?.visibleLineCount > 0
          || item.protectedFields?.some(field => field.copyProtection?.visibleLineCount > 0)).map(frame),
      sceneOnlyDiagnostics: criterion.modelKey ? (result.sceneOnlyDiagnostics || [])
        .filter(item => item.modelKeys.includes(criterion.modelKey)) : [],
      allDepthProseEvidence: criterion.modelKey ? null : {
        metrics: 'metrics.json#/clearance', automaticStatus: result.clearance?.automaticStatus
          || (result.checks?.some(check => check.name === 'clearance' && check.status === 'failed') ? 'failed-partial-census' : 'incomplete'),
        distantOverlaps: (result.visualReviewRequired || []).map(item => ({ id: item.id, path: item.screenshot,
          sha256: item.screenshotSha256, storyWU: item.storyWU, regions: item.regions })) },
    })) };
}

export function resolveAboutExtraSourceCaptureTargets(map, distances) {
  assert.equal(map.valid, true, 'Extra source captures require a valid resolved journey map.');
  assert.ok(Number.isFinite(map.pathLengthWU) && map.pathLengthWU > 0 && Number.isFinite(map.durationWU) && map.durationWU > 0);
  return [...new Set(distances)].map(distance => {
    assert.ok(Number.isFinite(distance) && distance >= 0 && distance <= map.pathLengthWU,
      `Requested camera distance ${distance} lies outside the active source rail [0, ${map.pathLengthWU}].`);
    return { id: `camera-${String(distance).replace('.', '_')}-wu`, requestedCameraDistanceWU: distance,
      targetStoryWU: distance / map.pathLengthWU * map.durationWU };
  });
}

export function assertAboutExtraSourceCapturePosition(map, target, actual, scrollMaximum) {
  assert.ok(Number.isFinite(scrollMaximum) && scrollMaximum > 0, 'Source-position capture needs the actual native scroll range.');
  const physicalWUPerNativePixel = map.pathLengthWU / scrollMaximum;
  const distanceErrorWU = actual.cameraDistanceWU - target.requestedCameraDistanceWU;
  assert.ok(Number.isFinite(distanceErrorWU) && Math.abs(distanceErrorWU) <= physicalWUPerNativePixel + 0.00001,
    `Source-position capture missed ${target.requestedCameraDistanceWU} WU: actual ${actual.cameraDistanceWU}; one native pixel is ${physicalWUPerNativePixel} WU.`);
  return { distanceErrorWU, physicalWUPerNativePixel,
    scope: 'Target-location guard permits at most one native scroll pixel of quantization. This is not scene or perceptual-motion acceptance.' };
}

export function aboutExtraProseCaptureFailures(fieldId, protection) {
  const failures = [];
  if (protection.nearDiagnosticsAvailable !== true) failures.push(`${fieldId}: active renderer lacks valid near-material diagnostics.`);
  else if (protection.maximumProtectedNearVisibleCount !== 0) failures.push(`${fieldId}: near geometry intersects painted prose; all-depth count ${protection.maximumProtectedVisibleCount}.`);
  if (protection.utilityRailOverlapCount !== 0) failures.push(`${fieldId}: prose overlaps utility controls.`);
  return failures;
}

let diagnosticScope = 0;
export async function withAboutCopyHiddenForDiagnostic(page, capture) {
  const token = `about-copy-diagnostic-${process.pid}-${++diagnosticScope}`;
  try {
    const hiddenNodes = await page.evaluate(owner => {
      if (window.__ABOUT_COPY_DIAGNOSTIC__) throw new Error('An About copy diagnostic already owns the temporary visibility override.');
      const nodes = [...document.querySelectorAll('.about-narrative-lab [data-text-field-id], .about-narrative-lab [data-text-field-id] *')];
      if (!nodes.length) throw new Error('No About copy was found for the diagnostic companion.');
      window.__ABOUT_COPY_DIAGNOSTIC__ = { owner, entries: nodes.map(node => ({ node,
        value: node.style.getPropertyValue('visibility'), priority: node.style.getPropertyPriority('visibility') })) };
      // Visibility preserves measured layout. Only narrative fields change;
      // the canvas, utility rail, physical window and Button Bar stay present.
      for (const node of nodes) node.style.setProperty('visibility', 'hidden', 'important');
      return nodes.length;
    }, token);
    return await capture(hiddenNodes);
  } finally {
    await page.evaluate(owner => {
      const scope = window.__ABOUT_COPY_DIAGNOSTIC__;
      if (!scope || scope.owner !== owner) return;
      for (const { node, value, priority } of scope.entries) {
        if (value) node.style.setProperty('visibility', value, priority);
        else node.style.removeProperty('visibility');
      }
      delete window.__ABOUT_COPY_DIAGNOSTIC__;
    }, token);
  }
}
export const motion = page => page.evaluate(() => {
  const baseline = window.__ABOUT_GATES_RUNTIME__;
  if (!baseline || baseline.runtime !== window.__aboutNarrativeRuntime
    || baseline.canvas !== document.querySelector('.about-narrative-world__canvas') || !baseline.canvas?.isConnected) {
    throw new Error('About runtime or canvas was replaced during a measurement phase. Reload after source writes stop; this is not continuous-scene evidence.');
  }
  return baseline.runtime.getMotionSnapshot();
});
export const runtimeMetrics = page => page.evaluate(() => {
  const baseline = window.__ABOUT_GATES_RUNTIME__;
  if (!baseline || baseline.runtime !== window.__aboutNarrativeRuntime
    || baseline.canvas !== document.querySelector('.about-narrative-world__canvas') || !baseline.canvas?.isConnected) {
    throw new Error('About runtime or canvas was replaced during a measurement phase. Reload after source writes stop; this is not continuous-scene evidence.');
  }
  return baseline.runtime.getMetrics();
});
const rectError = (first, second) => Math.max(Math.abs(first.x - second.x), Math.abs(first.y - second.y));

// This function is serialized into the page. It only reads the actual scoped
// glyph state and native animation objects; it never finishes an animation.
export function readAboutTitleStillReadiness({ requiredFieldId = '', waitForReady = false,
  includePose = false, detailedPose = false, poseOnly = false, requirePoseCoherence = false } = {}) {
  const readStartedAtMs = performance.now();
  const root = document.querySelector('.about-narrative-lab');
  const titles = [];
  if (root && !poseOnly) for (const title of root.querySelectorAll('.about-narrative-spatial-title, .route-bookend-title')) {
    let effectiveOpacity = 1;
    for (let node = title; node instanceof HTMLElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') effectiveOpacity = 0;
      effectiveOpacity *= Number.parseFloat(style.opacity);
    }
    if (!(effectiveOpacity > 0.001)) continue;
    const glyphs = [...title.querySelectorAll('[data-route-enter-glyph]')].map(glyph => {
      const entrance = glyph.__absRouteEntranceState, style = getComputedStyle(glyph);
      const color = style.color.trim(), finalColor = String(entrance?.finalColor || '').trim();
      const opacity = Number.parseFloat(style.opacity), finalOpacity = Number(entrance?.finalOpacity);
      const colorIsTransparent = color === 'transparent'
        || (/^rgba\(/u.test(color) && /,\s*0(?:\.0+)?\s*\)$/u.test(color))
        || /\/\s*0(?:\.0+)?\s*\)$/u.test(color);
      return { text: glyph.textContent, phase: entrance?.phase || null, settled: entrance?.settled === true,
        startedAt: entrance?.startedAt ?? null, delayMs: entrance?.delayMs ?? null, durationMs: entrance?.durationMs ?? null,
        opacity, finalOpacity, color, finalColor,
        ready: entrance?.settled === true && Number.isFinite(finalOpacity) && finalOpacity > 0
          && Math.abs(opacity - finalOpacity) <= 0.001 && color === finalColor && !colorIsTransparent };
    });
    const animationDiagnosticsAvailable = typeof title.getAnimations === 'function';
    const activeAnimations = animationDiagnosticsAvailable ? title.getAnimations({ subtree: true })
      .filter(animation => animation.pending || !['finished', 'idle'].includes(animation.playState))
      .map(animation => ({ playState: animation.playState, pending: animation.pending,
        currentTime: animation.currentTime, endTime: animation.effect?.getComputedTiming?.().endTime ?? null })) : [];
    const expectedText = String(title.dataset.routeEnterText || '').replace(/\s/gu, '');
    const actualText = glyphs.map(glyph => glyph.text).join('').replace(/\s/gu, '');
    titles.push({ fieldId: title.closest('[data-text-field-id]')?.dataset.textFieldId || '',
      effectiveOpacity, expectedText, actualText, glyphCount: glyphs.length,
      settledGlyphCount: glyphs.filter(glyph => glyph.settled).length,
      animationDiagnosticsAvailable, activeAnimations, glyphs,
      ready: glyphs.length > 0 && expectedText.length > 0 && actualText === expectedText
        && animationDiagnosticsAvailable && activeAnimations.length === 0 && glyphs.every(glyph => glyph.ready) });
  }
  const requiredTitlePresent = !requiredFieldId || titles.some(title => title.fieldId === requiredFieldId);
  let pose = null;
  if (includePose || requirePoseCoherence) {
    const baseline = window.__ABOUT_GATES_RUNTIME__;
    const runtime = window.__aboutNarrativeRuntime;
    const port = document.querySelector('.about-narrative-scrollport');
    const canvas = document.querySelector('.about-narrative-world__canvas');
    const bounds = canvas?.getBoundingClientRect?.();
    const nativeScroll = port ? { top: port.scrollTop, left: port.scrollLeft,
      maximum: port.scrollHeight - port.clientHeight, scrollHeight: port.scrollHeight,
      clientHeight: port.clientHeight, clientWidth: port.clientWidth } : null;
    const spans = [...(root?.querySelectorAll('[data-render-span-id]') || [])].map(node => ({
      id: node.dataset.renderSpanId, startWU: node.dataset.storyStartWu, endWU: node.dataset.storyEndWu }));
    const metricsStartedAtMs = performance.now();
    const metrics = detailedPose ? runtime?.getMetrics?.() : null;
    const metricsReadMs = performance.now() - metricsStartedAtMs;
    const actualMotion = runtime?.getMotionSnapshot?.() || null;
    pose = { timeMs: performance.now(), runtimeStable: baseline?.runtime === runtime,
      canvasStable: baseline?.canvas === canvas && Boolean(canvas?.isConnected),
      nativeScroll, motion: actualMotion,
      layout: { measuredDurationWU: Number(root?.dataset.aboutMeasuredDurationWu),
        domStoryWU: Number(root?.dataset.narrativeStoryWu), ready: root?.dataset.aboutLayoutReady,
        validation: root?.dataset.aboutLayoutValidation, fontState: root?.dataset.aboutFontState,
        profile: root?.dataset.aboutLayoutProfile, motionProfile: root?.dataset.aboutMotionProfile,
        signature: JSON.stringify(spans), spans,
        generation: null, generationScope: 'The active runtime exposes no layout generation; the exact span signature is recorded.' },
      canvas: canvas ? { x: bounds?.x, y: bounds?.y, width: bounds?.width, height: bounds?.height,
        backingWidth: canvas.width, backingHeight: canvas.height, connected: canvas.isConnected } : null,
      viewport: { width: window.innerWidth, height: window.innerHeight, pixelRatio: window.devicePixelRatio,
        visual: window.visualViewport ? { width: window.visualViewport.width, height: window.visualViewport.height,
          offsetLeft: window.visualViewport.offsetLeft, offsetTop: window.visualViewport.offsetTop, scale: window.visualViewport.scale } : null },
      render: { frameNumber: null, successfulRenderTimeMs: null,
        availability: 'No successful-render frame counter or timestamp is exposed. Ambient time and drawCalls are not substitutes.',
        domState: root?.dataset.pointWorldState, domSceneReady: root?.dataset.aboutSceneReady,
        appliedAmbientTime: actualMotion?.ambientTime ?? null, detailedMetricsRead: Boolean(metrics), metricsReadMs,
        state: metrics?.state ?? null, contextAvailable: metrics?.contextAvailable ?? null,
        sceneStoryWU: metrics?.sceneStoryWU ?? null, storyJourneyMap: metrics?.storyJourneyMap ?? null,
        drawCalls: metrics?.drawCalls ?? null, cpuSubmissionDurationMs: metrics?.frameTimeMs ?? null } };
    const contract = baseline?.poseContract, reasons = [];
    const duration = pose.layout.measuredDurationWU, maximum = nativeScroll?.maximum;
    if (!pose.runtimeStable || !pose.canvasStable) reasons.push('runtime-or-canvas-replaced');
    if (pose.layout.ready !== 'true' || pose.layout.validation !== 'valid' || pose.layout.fontState !== 'loaded') reasons.push('measured-layout-pending');
    if (pose.render.domState !== 'ready' || pose.render.domSceneReady !== 'true') reasons.push('scene-not-ready');
    if (!(duration > 0 && maximum > 0 && nativeScroll.top >= 0 && nativeScroll.top <= maximum)) reasons.push('native-geometry-unavailable');
    const spanDuration = Math.max(...spans.map(span => Number(span.endWU)));
    if (!Number.isFinite(spanDuration) || Math.abs(spanDuration - duration) > 0.000001) reasons.push('measured-duration-span-mismatch');
    if (!contract || !(contract.pathLengthWU > 0) || !(contract.railDistancesWU?.length >= 2)) reasons.push('source-pose-contract-missing');
    if (contract && pose.layout.motionProfile !== contract.motionProfile) reasons.push('motion-profile-mismatch');
    const nativeStoryWU = duration > 0 && maximum > 0 ? Math.min(1, Math.max(0, nativeScroll.top / maximum)) * duration : null;
    let expectedCameraDistanceWU = null, reducedAnchorId = null, expectedCameraPosition = null;
    if (contract && Number.isFinite(nativeStoryWU)) {
      expectedCameraDistanceWU = nativeStoryWU / duration * contract.pathLengthWU;
      if (contract.reducedMotion) {
        expectedCameraDistanceWU = 0;
        for (const anchor of contract.anchors) {
          const cameraStoryWU = anchor.cameraDistanceWU / contract.pathLengthWU * duration;
          if (cameraStoryWU > nativeStoryWU + 0.000001) break;
          expectedCameraDistanceWU = anchor.cameraDistanceWU; reducedAnchorId = anchor.id;
        }
      }
      const distances = contract.railDistancesWU, positions = contract.railPositions;
      if (distances?.length >= 2 && positions?.length === distances.length) {
        let low = 0, high = distances.length - 1;
        while (low + 1 < high) {
          const middle = Math.floor((low + high) / 2);
          if (distances[middle] <= expectedCameraDistanceWU) low = middle;
          else high = middle;
        }
        const length = distances[high] - distances[low];
        const mix = length > 0 ? Math.min(1, Math.max(0, (expectedCameraDistanceWU - distances[low]) / length)) : 0;
        expectedCameraPosition = positions[low].map((value, axis) => value + (positions[high][axis] - value) * mix);
      } else reasons.push('source-rail-unavailable');
    }
    const storyErrorWU = Number.isFinite(actualMotion?.storyWU) && Number.isFinite(nativeStoryWU)
      ? actualMotion.storyWU - nativeStoryWU : null;
    const cameraDistanceErrorWU = Number.isFinite(actualMotion?.cameraDistanceWU) && Number.isFinite(expectedCameraDistanceWU)
      ? actualMotion.cameraDistanceWU - expectedCameraDistanceWU : null;
    const cameraPositionMaximumErrorWU = expectedCameraPosition && actualMotion?.cameraPosition?.length === 3
      ? Math.max(...actualMotion.cameraPosition.map((value, axis) => Math.abs(value - expectedCameraPosition[axis]))) : null;
    if (!Number.isFinite(storyErrorWU) || Math.abs(storyErrorWU) > 0.000001) reasons.push('runtime-story-native-mismatch');
    if (!Number.isFinite(cameraDistanceErrorWU) || Math.abs(cameraDistanceErrorWU) > 0.000001) reasons.push('applied-camera-native-mismatch');
    if (!Number.isFinite(cameraPositionMaximumErrorWU) || cameraPositionMaximumErrorWU >= 0.00001) reasons.push('applied-camera-source-position-mismatch');
    pose.consistency = { ready: reasons.length === 0, reasons, nativeStoryWU, expectedCameraDistanceWU,
      expectedCameraPosition, storyErrorWU, cameraDistanceErrorWU, cameraPositionMaximumErrorWU,
      reducedMotion: contract?.reducedMotion ?? null, reducedAnchorId,
      sourceHash: contract?.sourceHash || null, cameraTrackSha256: contract?.cameraTrackSha256 || null,
      scope: 'One native geometry and lightweight runtime observation. Reduced motion keeps authored source cuts; no full framing metrics are needed.' };
  }
  const snapshot = { timeMs: performance.now(), requiredFieldId, requiredTitlePresent,
    rootPresent: Boolean(root), titles, ready: Boolean(root) && requiredTitlePresent && titles.every(title => title.ready)
      && (!requirePoseCoherence || pose?.consistency.ready),
    ...(includePose || requirePoseCoherence ? { readStartedAtMs, readDurationMs: performance.now() - readStartedAtMs, pose } : {}) };
  return waitForReady ? (snapshot.ready ? snapshot : false) : snapshot;
}

export function describeAboutStillPoseDelta(first, second, pathLengthWU) {
  const delta = (left, right) => Number.isFinite(left) && Number.isFinite(right) ? right - left : null;
  const vector = (left, right) => Array.isArray(left) && Array.isArray(right) && left.length === right.length
    ? right.map((value, index) => delta(left[index], value)) : null;
  const position = vector(first?.motion?.cameraPosition, second?.motion?.cameraPosition);
  const quaternion = vector(first?.motion?.cameraQuaternion, second?.motion?.cameraQuaternion);
  const projection = vector(first?.motion?.cameraProjection, second?.motion?.cameraProjection);
  const max = values => values?.every(Number.isFinite) ? Math.max(...values.map(Math.abs)) : null;
  const nativeMapping = state => {
    const native = state?.nativeScroll, duration = state?.layout?.measuredDurationWU;
    if (!(native?.maximum > 0 && Number.isFinite(native.top) && duration > 0 && pathLengthWU > 0)) return null;
    const progress = Math.min(1, Math.max(0, native.top / native.maximum));
    return { mapping: 'continuous-native-ratio-reference',
      scope: 'Reduced-motion camera acceptance uses pose.consistency and its authored source cut.',
      normalizedNativeScroll: progress, nativeStoryWU: progress * duration,
      nativeCameraDistanceWU: progress * pathLengthWU,
      motionStoryErrorWU: delta(progress * duration, state.motion?.storyWU),
      cameraDistanceErrorWU: delta(progress * pathLengthWU, state.motion?.cameraDistanceWU) };
  };
  return { cameraPosition: position, cameraPositionMaximumWU: max(position), cameraQuaternion: quaternion,
    cameraQuaternionMaximum: max(quaternion), cameraProjection: projection, cameraProjectionMaximum: max(projection),
    cameraDistanceWU: delta(first?.motion?.cameraDistanceWU, second?.motion?.cameraDistanceWU),
    motionStoryWU: delta(first?.motion?.storyWU, second?.motion?.storyWU),
    nativeScrollTopPx: delta(first?.nativeScroll?.top, second?.nativeScroll?.top),
    nativeMaximumPx: delta(first?.nativeScroll?.maximum, second?.nativeScroll?.maximum),
    measuredDurationWU: delta(first?.layout?.measuredDurationWU, second?.layout?.measuredDurationWU),
    layoutSignatureChanged: typeof first?.layout?.signature === 'string' && typeof second?.layout?.signature === 'string'
      ? first.layout.signature !== second.layout.signature : null,
    canvasChanged: first?.canvas && second?.canvas ? JSON.stringify(first.canvas) !== JSON.stringify(second.canvas) : null,
    beforeNativeMapping: nativeMapping(first), afterNativeMapping: nativeMapping(second),
    scope: 'Numerical observations only; native mapping uses the actual pixel position. The existing camera equality assertion remains authoritative.' };
}

export async function waitForAboutTitleStillReadiness(page, { requiredFieldId = '', timeoutMs = 3000 } = {}) {
  const startedAt = new Date().toISOString();
  const initial = await page.evaluate(readAboutTitleStillReadiness, { requiredFieldId });
  let handle;
  try {
    handle = await page.waitForFunction(readAboutTitleStillReadiness,
      { requiredFieldId, waitForReady: true }, { timeout: timeoutMs, polling: 'raf' });
    const settled = await handle.jsonValue();
    return { startedAt, endedAt: new Date().toISOString(), waitMs: settled.timeMs - initial.timeMs,
      initial, settled, scope: 'Actual glyph entrance endpoints and scoped native animations at a held pose; no forced finish or animation clock change.' };
  } catch (error) {
    error.titleReadiness = { startedAt, endedAt: new Date().toISOString(), timeoutMs, initial,
      lastObserved: await page.evaluate(readAboutTitleStillReadiness, { requiredFieldId }).catch(() => null) };
    throw error;
  } finally { await handle?.dispose(); }
}

export async function waitForAboutStillPoseReadiness(page, { timeoutMs = 3000 } = {}) {
  const options = { includePose: true, poseOnly: true, requirePoseCoherence: true };
  const initial = await page.evaluate(readAboutTitleStillReadiness, options);
  let handle;
  try {
    handle = await page.waitForFunction(readAboutTitleStillReadiness,
      { ...options, waitForReady: true }, { timeout: timeoutMs, polling: 'raf' });
    const settled = await handle.jsonValue();
    return { initial, settled, waitMs: settled.timeMs - initial.timeMs,
      scope: 'Bounded coherent native/story/applied-camera observation. No repeated scroll writes, fixed delay or full metrics polling.' };
  } catch (error) {
    error.poseReadiness = { timeoutMs, initial,
      lastObserved: await page.evaluate(readAboutTitleStillReadiness, options).catch(() => null) };
    throw error;
  } finally { await handle?.dispose(); }
}

export function assertAboutStillNativeHold(first, second, label) {
  assert.deepEqual(second.nativeScroll, first.nativeScroll, `${label}: native scroll or range changed.`);
  assert.deepEqual(second.layout, first.layout, `${label}: measured layout changed.`);
  assert.deepEqual(second.canvas, first.canvas, `${label}: canvas geometry changed.`);
  assert.deepEqual(second.viewport, first.viewport, `${label}: viewport changed.`);
}

function assertAboutStillPoseCoherent(snapshot, label) {
  assert.equal(snapshot.pose?.consistency?.ready, true,
    `${label}: native/story/applied-camera mismatch: ${JSON.stringify(snapshot.pose?.consistency || null)}`);
}

export async function captureSettledAboutStill(page, { path, requiredFieldId = '', timeoutMs = 3000 }) {
  let before = null;
  const captureState = (detailedPose = detailedStillDiagnostics) => page.evaluate(readAboutTitleStillReadiness,
    { requiredFieldId, includePose: true, detailedPose });
  const poseDiagnostics = { positioning: stillPositioningByPage.get(page) || null,
    guardBaselineMotion: null, beforeWait: null, beforeScreenshot: null, afterScreenshot: null };
  const assertSnapshotIdentity = state => assert.ok(state.pose.runtimeStable && state.pose.canvasStable,
    'About runtime or canvas was replaced during a measurement phase. This is not continuous-scene evidence.');
  const describeGuardDelta = state => describeAboutStillPoseDelta(
    { motion: before }, state?.pose, trackDistances.at(-1));
  let titleReadiness, capturedBytes;
  try {
    poseDiagnostics.readiness = await waitForAboutStillPoseReadiness(page, { timeoutMs });
    poseDiagnostics.beforeWait = await captureState();
    assertSnapshotIdentity(poseDiagnostics.beforeWait);
    assertAboutStillPoseCoherent(poseDiagnostics.beforeWait, 'Before title still');
    before = poseDiagnostics.beforeWait.pose.motion;
    poseDiagnostics.guardBaselineMotion = before;
    titleReadiness = await waitForAboutTitleStillReadiness(page, { requiredFieldId, timeoutMs });
    poseDiagnostics.beforeScreenshot = await captureState();
    assertSnapshotIdentity(poseDiagnostics.beforeScreenshot);
    assertSameCamera(before, poseDiagnostics.beforeScreenshot.pose.motion, 'Title still readiness');
    assertAboutStillNativeHold(poseDiagnostics.beforeWait.pose, poseDiagnostics.beforeScreenshot.pose, 'Title still readiness');
    assertAboutStillPoseCoherent(poseDiagnostics.beforeScreenshot, 'Before PNG');
    capturedBytes = await page.screenshot({ path, animations: 'allow' });
    const after = await captureState();
    poseDiagnostics.afterScreenshot = after;
    assertSnapshotIdentity(after);
    if (!after.ready) {
      const error = new Error('Title glyph readiness changed during the still capture.');
      error.titleReadiness = { ...titleReadiness, after };
      throw error;
    }
    assertSameCamera(before, after.pose.motion, 'Settled title still');
    assertAboutStillNativeHold(poseDiagnostics.beforeWait.pose, after.pose, 'Settled title still');
    assertAboutStillPoseCoherent(after, 'After PNG');
    poseDiagnostics.delta = describeAboutStillPoseDelta(poseDiagnostics.beforeWait.pose, after.pose, trackDistances.at(-1));
    poseDiagnostics.guardDelta = describeGuardDelta(after);
    return { bytes: capturedBytes, titleReadiness: { ...titleReadiness, after }, poseDiagnostics };
  } catch (error) {
    const kind = error.poseReadiness ? 'pose-readiness' : error.titleReadiness ? 'title-readiness'
      : /camera.*drift|native scroll|measured layout|canvas geometry|viewport changed|native\/story\/applied-camera/u.test(error.message) ? 'pose' : 'capture';
    const prefix = path.replace(/\.png$/u, '') + `-${kind}-failure`;
    poseDiagnostics.onFailure = await captureState(true).catch(() => null);
    const last = poseDiagnostics.afterScreenshot || poseDiagnostics.beforeScreenshot || poseDiagnostics.onFailure;
    poseDiagnostics.delta = describeAboutStillPoseDelta(poseDiagnostics.beforeWait?.pose, last?.pose, trackDistances.at(-1));
    poseDiagnostics.guardDelta = describeGuardDelta(last);
    const screenshot = `${prefix}.png`;
    const bytes = await page.screenshot({ path: screenshot, animations: 'allow' }).catch(() => null);
    const evidence = { kind: `failed-about-still-${kind}`, status: 'failed',
      sourceHash: metadata.source.sha256, runtimeSourceFingerprint, auditScriptSha256,
      deliveredRuntimeCode: deliveredRuntimeCodeByPage.get(page) || { status: 'not-observed', records: [] },
      requiredFieldId, motionBefore: before, poseDiagnostics,
      attemptedScreenshot: capturedBytes ? { path, sha256: createHash('sha256').update(capturedBytes).digest('hex'), accepted: false } : null,
      motionAfter: await motion(page).catch(() => null), error: error.message, ...error.titleReadiness,
      poseReadiness: error.poseReadiness || null,
      screenshot: bytes ? screenshot : null, screenshotSha256: bytes ? createHash('sha256').update(bytes).digest('hex') : null };
    await writeFile(`${prefix}.json`, JSON.stringify(evidence, null, 2));
    error.message += `; ${kind === 'title-readiness' ? 'title readiness' : 'still capture'} evidence: ${prefix}.json`;
    throw error;
  }
}

export async function driveAboutStoryWU(page, targetWU, { sceneScope = 'active-scene' } = {}) {
  // The accepted zero-smoothing contract uses the browser as scroll owner.
  // Do not pin scrollTop every RAF against an active Lenis destination.
  let target;
  try {
    const allowedScopes = ['active-scene', 'dom-only-title-measurement', 'intentional-renderer-fallback'];
    assert.ok(allowedScopes.includes(sceneScope), 'Unknown scroll measurement scope.');
    target = await page.evaluate(value => {
      const port = document.querySelector('.about-narrative-scrollport');
      if (port.classList.contains('lenis')) throw new Error(
        'Positioning fixture cannot directly drive an active Lenis owner. Check the served zero-smoothing source; use real wheel input to diagnose visitor scrolling.',
      );
      const duration = Math.max(...[...document.querySelectorAll('[data-render-span-id]')]
        .map(node => Number(node.dataset.storyEndWu)));
      const next = Number.isFinite(value) ? Math.min(duration, Math.max(0, value)) : duration;
      const requestedScrollTop = next / duration * (port.scrollHeight - port.clientHeight);
      const beforeWriteScrollTop = port.scrollTop;
      port.scrollTop = requestedScrollTop;
      port.dispatchEvent(new Event('scroll', { bubbles: false }));
      return { requestedStoryWU: value, clampedStoryWU: next, durationWU: duration,
        requestTimeMs: performance.now(), beforeWriteScrollTop, requestedScrollTop,
        afterWriteScrollTop: port.scrollTop, maximum: port.scrollHeight - port.clientHeight,
        clientWidth: port.clientWidth, clientHeight: port.clientHeight };
    }, targetWU);
    await page.waitForFunction(value => Math.abs(
      Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu) - value,
    ) <= 0.035, target.clampedStoryWU, { timeout: 10_000, polling: 50 });
    const readiness = sceneScope === 'active-scene' ? await waitForAboutStillPoseReadiness(page, { timeoutMs: 10_000 }) : null;
    const driverReturn = readiness && detailedStillDiagnostics ? await page.evaluate(readAboutTitleStillReadiness,
      { includePose: true, detailedPose: true, poseOnly: true }) : readiness?.settled || null;
    if (driverReturn) assertAboutStillPoseCoherent(driverReturn, 'Scroll driver return');
    stillPositioningByPage.set(page, { ...target, driverReturn, sceneScope,
      poseReadiness: readiness || { status: 'not-applicable-non-scene-scope', scope: sceneScope } });
    return stillPositioningByPage.get(page);
  }
  catch (error) {
    const actual = await page.evaluate(() => {
      const port = document.querySelector('.about-narrative-scrollport');
      return { storyWU: Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu),
        scrollTop: port?.scrollTop, maximum: port ? port.scrollHeight - port.clientHeight : null,
        lenisActive: port?.classList.contains('lenis'),
        durationWU: Math.max(...[...document.querySelectorAll('[data-render-span-id]')].map(node => Number(node.dataset.storyEndWu))) };
    }).catch(() => null);
    const failure = new Error(`Scroll target ${targetWU} failed: ${error.message}; actual=${JSON.stringify(actual)}`);
    failure.poseReadiness = error.poseReadiness || null;
    failure.scrollPositioning = { request: target || { requestedStoryWU: targetWU }, sceneScope, actual };
    throw failure;
  }
}

export async function installCandidateAssets(context) {
  if (!process.env.ABS_ABOUT_ASSET_DIR) return { mode: 'served-canonical', requests: [] };
  const requests = [], loaded = new Map();
  const metadataBytes = await readFile(resolve(assets, 'meta.json'));
  const bundleHash = createHash('sha256').update(metadataBytes).digest('hex');
  const allowedFiles = new Set(['meta.json', ...Object.values(metadata.files).map(file => file.file)]);
  const serve = async route => {
    const file = basename(new URL(route.request().url()).pathname);
    assert.ok(allowedFiles.has(file), `Candidate requested an unknown asset: ${file}`);
    if (!loaded.has(file)) {
      const bytes = await readFile(resolve(assets, file));
      const hash = createHash('sha256').update(bytes).digest('hex');
      const declared = Object.values(metadata.files).find(entry => entry.file === file)?.sha256;
      if (declared) assert.equal(hash, declared, `${file} does not match candidate metadata.`);
      // Only the development selection envelope is added. Geometry, camera,
      // source identity and file-integrity declarations remain the actual
      // candidate data; every binary/track response is byte-identical.
      const body = file === 'meta.json' ? Buffer.from(JSON.stringify({ ...metadata, preview: {
        status: 'ready', activeSource: 'preview', sourceMatches: true,
        expectedSourceSha: metadata.source.sha256, bundleHash,
        assetRoot: `/__about-blender-preview/${bundleHash}`, message: 'Source-bound candidate audit',
      } })) : bytes;
      loaded.set(file, { body, sourceSha256: hash,
        deliveredSha256: createHash('sha256').update(body).digest('hex') });
    }
    const selected = loaded.get(file);
    if (!requests.some(entry => entry.file === file)) requests.push({ file,
      sourceSha256: selected.sourceSha256, deliveredSha256: selected.deliveredSha256 });
    await route.fulfill({ status: 200, body: selected.body,
      contentType: file.endsWith('.json') ? 'application/json' : file.endsWith('.html') ? 'text/html' : 'application/octet-stream' });
  };
  await context.route('**/models/about-v2-edited-world/**', serve);
  await context.route('**/__about-blender-preview/**', serve);
  return { mode: 'intercepted-candidate', assetDirectory: assets, bundleHash, requests };
}

export function observeAboutDeliveredRuntimeCode(page, { staticDirectory = process.env.ABS_ABOUT_GATES_STATIC_DIRECTORY,
  requiredModules = JSON.parse(process.env.ABS_ABOUT_GATES_REQUIRED_STATIC_MODULES || '[]') } = {}) {
  const pending = [], records = [], errors = [];
  const directory = staticDirectory ? resolve(staticDirectory) : null;
  assert.ok(Array.isArray(requiredModules) && requiredModules.every(item => /^\/assets\/[^/]+\.js$/u.test(item.path)
    && /^[a-f0-9]{64}$/u.test(item.sha256)), 'Required static modules need exact /assets/*.js paths and SHA256 values.');
  assert.ok(!requiredModules.length || directory, 'Exact required static modules need the frozen static directory.');
  const state = { status: 'observing-cold-runtime-code', staticDirectory: directory, requiredModules, records, errors,
    scope: 'Actual cold-page document/script/stylesheet response bytes. Local-build parity is asserted only when staticDirectory is supplied.' };
  deliveredRuntimeCodeByPage.set(page, state);
  const onResponse = response => {
    const url = new URL(response.url());
    const type = response.request?.().resourceType?.();
    if (url.origin !== new URL(baseUrl).origin
      || !(url.pathname === '/about.html' || ['script', 'stylesheet'].includes(type))) return;
    pending.push((async () => {
      assert.equal(response.status(), 200, `Runtime code did not load: ${response.url()}`);
      const bytes = await response.body();
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      const path = directory ? resolve(directory, `.${decodeURIComponent(url.pathname)}`) : null;
      const record = { url: response.url(), resourceType: type || 'document', status: response.status(),
        bytes: bytes.length, sha256, staticPath: path, staticSha256: null };
      records.push(record);
      if (path) {
        assert.ok(path.startsWith(`${directory}/`), 'Runtime code resolved outside the selected static directory.');
        record.staticSha256 = createHash('sha256').update(await readFile(path)).digest('hex');
        assert.equal(sha256, record.staticSha256,
          `Browser runtime code differs from the frozen static build: ${response.url()}`);
      }
    })().catch(error => errors.push(error.message)));
  };
  page.on('response', onResponse);
  const stop = () => {
    page.off?.('response', onResponse);
    page.off?.('close', stop);
  };
  page.once?.('close', stop);
  let closed = false;
  return async () => {
    if (!closed) { stop(); closed = true; }
    await Promise.all(pending);
    state.fingerprint = createHash('sha256').update(JSON.stringify(records.map(({ url, sha256 }) => ({ url, sha256 }))
      .sort((a, b) => a.url.localeCompare(b.url)))).digest('hex');
    if (directory) {
      for (const name of ['SiteApp', 'AboutNarrativeLabExperience']) {
        if (!records.some(record => new RegExp(`/assets/${name}-[^/]+\\.js$`, 'u').test(new URL(record.url).pathname))) {
          errors.push(`No actual cold browser response for the ${name} static module.`);
        }
      }
      for (const expected of requiredModules) {
        if (!records.some(record => new URL(record.url).pathname === expected.path && record.sha256 === expected.sha256)) {
          errors.push(`No actual cold browser response matching required static module ${expected.path} (${expected.sha256}).`);
        }
      }
    }
    state.status = errors.length ? 'failed-runtime-code-observation' : records.length ? 'observed-browser-code' : 'not-observed';
    if (directory) {
      try { assert.deepEqual(errors, [], 'Cold runtime code delivery mismatched the frozen static build.'); }
      catch (error) { error.runtimeCodeDelivery = state; throw error; }
      state.status = 'verified-cold-static-build';
    }
    return state;
  };
}

export function observeDeliveredAssets(page, expectedMetadata = metadata) {
  const pending = [], records = [], errors = [];
  const verifyRuntimeCode = observeAboutDeliveredRuntimeCode(page);
  const requiredFiles = ['meta.json', expectedMetadata.files.cameraTrack.file, expectedMetadata.files.surfels.file,
    ...(expectedMetadata.files.instanceVisibility ? [expectedMetadata.files.instanceVisibility.file] : [])];
  page.on('response', response => {
    const url = new URL(response.url());
    if (!/\/(?:models\/about-v2-edited-world|__about-blender-preview)\//u.test(url.pathname)) return;
    const file = basename(url.pathname);
    if (!requiredFiles.includes(file)) return;
    pending.push((async () => {
      assert.equal(response.status(), 200, `${file} did not load successfully.`);
      const bytes = await response.body();
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      if (file === 'meta.json') {
        assertAboutDeliveredMetadata(JSON.parse(bytes.toString('utf8')), expectedMetadata);
      } else {
        const declared = Object.values(expectedMetadata.files).find(item => item.file === file);
        assert.equal(sha256, declared.sha256, `The browser received different ${file} bytes.`);
        assert.equal(bytes.length, declared.bytes, `The browser received an unexpected byte count for ${file}.`);
      }
      records.push({ file, url: response.url(), sha256, bytes: bytes.length });
    })().catch(error => errors.push(error.message)));
  });
  return async () => {
    await Promise.all(pending);
    await verifyRuntimeCode();
    assert.deepEqual(errors, [], 'Browser asset delivery mismatched local source.');
    for (const file of requiredFiles) {
      assert.ok(records.some(record => record.file === file), `No verified browser response for ${file}.`);
    }
    return records;
  };
}

async function installReadinessTrace(context) {
  await context.addInitScript(() => {
    const records = [];
    window.__ABOUT_AUDIT_READINESS__ = records;
    const observer = new MutationObserver(changes => {
      const root = document.querySelector('.about-narrative-lab');
      if (!root || !changes.some(change => change.target === root || change.type === 'childList')) return;
      const state = { timeMs: performance.now(), hidden: document.hidden,
        entrance: root.dataset.aboutEntranceState, scale: root.dataset.aboutEntranceScale,
        material: root.dataset.routeMaterialState, materialProgress: root.dataset.routeMaterialProgress,
        started: root.dataset.routeEntranceStarted, restoring: root.dataset.aboutRestoring,
        ready: root.dataset.aboutSceneReady, world: root.dataset.pointWorldState,
        bundle: root.dataset.aboutBlenderBundle, layout: root.dataset.aboutLayoutProfile,
        layoutValidation: root.dataset.aboutLayoutValidation, layoutDiagnostics: root.dataset.aboutLayoutDiagnostics,
        measuredDurationWU: root.dataset.aboutMeasuredDurationWu };
      if (records.length < 300) records.push(state);
    });
    observer.observe(document, { subtree: true, childList: true, attributes: true,
      attributeFilter: ['data-about-entrance-state', 'data-about-entrance-scale', 'data-route-material-state',
        'data-route-material-progress', 'data-route-entrance-started', 'data-about-restoring',
        'data-about-scene-ready', 'data-point-world-state', 'data-about-blender-bundle', 'data-about-layout-profile',
        'data-about-layout-validation', 'data-about-layout-diagnostics', 'data-about-measured-duration-wu'] });
  });
}

async function readReadiness(page) {
  return page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const canvas = root?.querySelector('.about-narrative-world__canvas');
    const style = root ? getComputedStyle(root) : null;
    return { root: { ...root?.dataset }, hidden: document.hidden,
      visibility: style?.visibility, display: style?.display,
      scrollInput: { lenisActive: Boolean(document.querySelector('.about-narrative-scrollport')?.classList.contains('lenis')) },
      canvas: canvas ? { connected: canvas.isConnected, width: canvas.width, height: canvas.height } : null,
      motion: window.__aboutNarrativeRuntime?.getMotionSnapshot?.(),
      transitions: [...(window.__ABOUT_AUDIT_READINESS__ || [])] };
  });
}

export async function waitForReadyScene(page, entry) {
  // getMetrics projects every point. Never poll that expensive diagnostic on
  // each RAF while the renderer is trying to complete its material entrance.
  await page.waitForFunction(() => {
    const root = document.querySelector('.about-narrative-lab');
    if (root?.dataset.pointWorldState === 'unavailable' || root?.dataset.aboutSceneReady === 'error') {
      throw new Error(`About renderer unavailable: ${root.dataset.worldError || root.dataset.pointWorldState}`);
    }
    return root?.dataset.pointWorldState === 'ready' && root?.dataset.aboutSceneReady === 'true'
      && Boolean(window.__aboutNarrativeRuntime?.getMotionSnapshot);
  }, null, { timeout: 60_000, polling: 100 });
  await page.waitForFunction(() => {
    const root = document.querySelector('.about-narrative-lab');
    if (root?.dataset.aboutLayoutValidation === 'invalid') throw new Error(`Rejected measured layout: ${root.dataset.aboutLayoutDiagnostics}`);
    return root?.dataset.aboutEntranceState === 'complete'
      && Number(root.dataset.aboutEntranceScale) >= 0.999
      && root.dataset.aboutRestoring !== 'true'
      && root.dataset.aboutLayoutReady === 'true'
      && root.dataset.aboutLayoutValidation === 'valid';
  }, null, { timeout: 30_000, polling: 100 });
  await page.evaluate(() => document.fonts.ready);
  // Bind once per intentional navigation/reload. HMR can replace the runtime
  // without logging an error, and every replacement starts its own counters.
  await page.evaluate(() => {
    window.__ABOUT_GATES_RUNTIME__ = { runtime: window.__aboutNarrativeRuntime,
      canvas: document.querySelector('.about-narrative-world__canvas') };
  });
  const state = await runtimeMetrics(page);
  assertIdentity(state);
  assert.equal(await page.locator('[data-viewport-mode]').count(), 0, 'A viewport cover hides this scene.');
  const plan = await page.locator('.about-narrative-lab').evaluate(node => ({ validation: node.dataset.aboutLayoutValidation,
    diagnostics: node.dataset.aboutLayoutDiagnostics }));
  assert.equal(plan.validation, 'valid', `The current DOM could not compile a new layout: ${plan.diagnostics}`);
  assert.equal(state.pointProfile, entry.pointProfile);
  assert.equal(state.layoutProfile, entry.layoutProfile);
  assert.equal(state.residentSurfelCount, metadata.profiles[entry.pointProfile].surfelCount);
  assert.equal(state.sceneContractStatus, 'compatible');
  assert.deepEqual(state.sceneContractDiagnostics, []);
  assert.equal(state.reducedMotion, entry.reducedMotion, 'The renderer motion mode differs from this case.');
  const map = resolveAboutNarrativeJourneyMap(state.storyJourneyMap, cameraTrack);
  assert.equal(map.valid, true, 'Still readiness requires the actual source journey map.');
  await page.evaluate(contract => { window.__ABOUT_GATES_RUNTIME__.poseContract = contract; }, {
    sourceHash: metadata.source.sha256, cameraTrackSha256: metadata.files.cameraTrack.sha256,
    pathLengthWU: map.pathLengthWU, reducedMotion: state.reducedMotion,
    motionProfile: state.reducedMotion ? 'reduced' : 'full',
    anchors: map.anchors.map(({ id, cameraDistanceWU }) => ({ id, cameraDistanceWU })),
    railDistancesWU: trackDistances, railPositions: cameraTrack.samples.map(sample => sample.slice(0, 3)),
  });
  return state;
}

export function assertIdentity(state) {
  assert.equal(state.state, 'ready');
  assert.equal(state.assetSourceHash, metadata.source.sha256, 'Browser is rendering a different Blender source.');
  assert.equal(state.bundleIntegrityVerified, true);
  assert.equal(state.gpuBufferBuilds, 1);
  assert.equal(state.gpuBufferIdentityStable, true);
  assert.equal(state.fixedAttributeIdentityStable, true);
  assert.equal(state.visible, true);
  if (!coreOnly) {
    assert.equal(state.sharedBodyMaterial, true, 'The accepted route must use the shared shaded-ball material.');
    assert.ok(state.materialAtlasKey && state.materialAtlasKey !== 'flat', 'The accepted route is using a flat point sprite.');
  }
}

async function readSourceProof() {
  const path = process.env.ABS_ABOUT_GATES_PROOF && resolve(process.env.ABS_ABOUT_GATES_PROOF);
  if (!path) return { status: 'blocked', reason: 'No same-source landmark and gate-recovery proof manifest.' };
  const proof = JSON.parse(await readFile(path, 'utf8'));
  if (proof.routeId !== routeId) return { status: 'blocked', path, reason: 'Proof does not cover the approved Blackfriars route.' };
  if (proof.blenderSourceHash !== metadata.source.sha256) return { status: 'blocked', path,
    reason: 'Proof belongs to a different Blender source.', actualSourceHash: metadata.source.sha256 };
  const missing = [];
  if (metadata.source?.cinematicJourney?.routeId !== routeId || cameraTrack.routeId !== routeId) missing.push('shipping-route-identity');
  const geography = metadata.source.geography;
  for (const [key, expected] of [['scanSourceSha256', geography.source.sha256],
    ['preparedScanSha256', geography.preparedScan.sha256], ['cameraTrackSha256', metadata.files.cameraTrack.sha256]]) {
    if (proof[key] !== expected) missing.push(key);
  }
  for (const file of Object.values(metadata.files)) {
    assert.equal(createHash('sha256').update(await readFile(resolve(assets, file.file))).digest('hex'), file.sha256,
      `Candidate file no longer matches its source contract: ${file.file}`);
  }
  const evidenceBase = proof.pathBase === 'manifest' ? dirname(path) : process.cwd();
  const verifyEvidence = async evidence => {
    assert.ok(evidence.path && /^[a-f\d]{64}$/u.test(evidence.sha256 || ''), 'Proof evidence needs a file path and SHA-256.');
    const bytes = await readFile(resolve(evidenceBase, evidence.path));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), evidence.sha256, `Evidence changed: ${evidence.path}`);
  };
  for (const key of ['blackfriars', 'stPauls']) {
    const item = proof.landmarkProof?.[key];
    if (item?.accepted !== true || item?.sourceVerified !== true || item?.visualJudgement !== 'pass') missing.push(key);
    for (const profile of ['desktop', 'mobile']) if (!item?.evidence?.some(evidence => evidence.profile === profile)) missing.push(`${key}-${profile}`);
    for (const evidence of item?.evidence || []) await verifyEvidence(evidence);
  }
  for (const [shape, expected] of [['round', 'director.round-tunnel'], ['square', 'director.square-gate-tunnel']]) {
    const recovery = proof.gateRecovery?.[shape];
    if (recovery?.sourceObjectKey !== expected || !recovery.backupFile || !recovery.backupSha256 || !recovery.evidence?.length) missing.push(`${shape}-source-recovery`);
    if (recovery?.backupFile) assert.equal(createHash('sha256')
      .update(await readFile(resolve(evidenceBase, recovery.backupFile))).digest('hex'), recovery.backupSha256);
    for (const evidence of recovery?.evidence || []) await verifyEvidence(evidence);
  }
  return { path, status: missing.length ? 'blocked' : 'source-reviewed', missing, proof,
    scope: 'Human/agent visual observations supplied by the reviewer; these flags are not automated landmark recognition.' };
}

export function inspectAboutShippedPaletteRoles(bytes, sourceMetadata) {
  assert.equal(createHash('sha256').update(bytes).digest('hex'), sourceMetadata.files.surfels.sha256);
  const stride = sourceMetadata.layout.strideBytes;
  const roleOffset = sourceMetadata.layout.attributes.find(attribute => attribute.name === 'paletteRole')?.offset;
  assert.ok(Number.isFinite(roleOffset), 'No encoded palette role attribute.');
  const counts = {};
  for (const profile of ['mobile', 'desktop']) {
    counts[profile] = {};
    for (const model of sourceMetadata.models) {
      const roles = Array(6).fill(0);
      for (let index = 0; index < model.profileCounts[profile]; index += 1) {
        const role = bytes[(model.surfelRange.offset + index) * stride + roleOffset];
        assert.ok(role >= 0 && role < 6, `Invalid palette role in ${model.key}.`);
        roles[role] += 1;
      }
      counts[profile][model.key] = roles;
      assert.ok(roles.every(count => count > 0), `${profile} ${model.key} does not contain all six active palette roles: ${roles}`);
    }
  }
  return { counts, sha256: sourceMetadata.files.surfels.sha256,
    scope: 'Encoded role presence and shipping prefix identity; visual colour balance requires the recorded scene review.' };
}

async function inspectShippedPaletteRoles() {
  return inspectAboutShippedPaletteRoles(await readFile(resolve(assets, metadata.files.surfels.file)), metadata);
}

async function setTextEnlargement(page) {
  const sizes = await page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const selectors = ['.about-narrative-opening-copy h1', '.about-narrative-editorial-copy'];
    const before = selectors.map(selector => parseFloat(getComputedStyle(document.querySelector(selector)).fontSize));
    const roleScales = {};
    for (const role of ['body', 'small-body', 'eyebrow', 'main-title', 'inbetween-title']) {
      const property = `--about-${role}-size-scale`;
      const current = parseFloat(getComputedStyle(root).getPropertyValue(property)) || 1;
      roleScales[role] = { before: current, after: current * 2 };
      root.style.setProperty(property, String(current * 2));
    }
    return { selectors, before, roleScales };
  });
  await page.waitForTimeout(700);
  await page.waitForFunction(() => {
    const root = document.querySelector('.about-narrative-lab');
    if (root?.dataset.aboutLayoutValidation === 'invalid') throw new Error(`Enlarged text rejected: ${root.dataset.aboutLayoutDiagnostics}`);
    return root?.dataset.aboutLayoutValidation === 'valid' && root.dataset.aboutLayoutReady === 'true';
  }, null, { timeout: 15_000, polling: 100 });
  const after = await page.evaluate(selectors => selectors.map(selector => (
    parseFloat(getComputedStyle(document.querySelector(selector)).fontSize)
  )), sizes.selectors);
  after.forEach((size, index) => assert.ok(size / sizes.before[index] > 1.99 && size / sizes.before[index] < 2.01,
    'Rendered text did not enlarge to exactly 200%.'));
  return { before: sizes.before, after, roleScales: sizes.roleScales,
    mode: '200% About text roles; native browser-menu zoom and physical-phone proof remain separate.' };
}

async function layoutFields(page) {
  return page.evaluate(() => [...document.querySelectorAll('[data-render-span-id]')].map(node => ({
    id: node.querySelector('[data-text-field-id]').dataset.textFieldId,
    startWU: Number(node.dataset.storyStartWu), endWU: Number(node.dataset.storyEndWu),
    title: Boolean(node.querySelector('h1,.about-narrative-spatial-title')),
    editorial: node.classList.contains('about-narrative-render-span--editorial'),
  })));
}

function reviewPositions(fields, map) {
  const positions = fields.flatMap(field => [{ id: field.id, fieldId: field.id,
    storyWU: field.startWU + (field.endWU - field.startWU) * (field.id === 'text-promise-main' ? 0 : 0.4) },
  ...(field.title && !['text-promise-main', 'text-epilogue-invitation'].includes(field.id)
    ? [{ id: `${field.id}-exit`, fieldId: field.id, storyWU: field.startWU + (field.endWU - field.startWU) * 0.9 }] : [])]);
  const river = map.anchors.find(anchor => anchor.id === 'river-reveal');
  assert.ok(river && Number.isFinite(river.cameraStoryWU), 'No physical river-reveal cue.');
  for (const fraction of [0, 0.25, 0.5, 0.75, 1]) positions.push({
    id: `london-${fraction}`, storyWU: river.cameraStoryWU + (map.durationWU - river.cameraStoryWU) * fraction,
  });
  assert.equal(positions.length, 19, 'The director review must retain all ten fields, four exits, and five London frames.');
  return positions.sort((first, second) => first.storyWU - second.storyWU);
}

export function selectAboutStillPosePositions(fields, map, selection = 'cold2') {
  assert.ok(['cold2', 'original19'].includes(selection), 'Unknown stillPose selection; use cold2 or original19.');
  const positions = reviewPositions(fields, map);
  assert.deepEqual(positions.slice(0, 2).map(position => position.id), ['text-promise-main', 'text-background-unit']);
  return selection === 'original19' ? positions : positions.slice(0, 2);
}

async function auditOpening(page) {
  await driveAboutStoryWU(page, 0);
  const bounds = await page.evaluate(() => {
    const rect = node => { const box = node.getBoundingClientRect(); return {
      x: box.x, y: box.y, width: box.width, height: box.height, right: box.right, bottom: box.bottom,
    }; };
    const group = document.querySelector('.about-narrative-opening-copy');
    let opacity = 1;
    for (let node = group; node instanceof HTMLElement; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.display === 'none' || style.visibility === 'hidden') opacity = 0;
      opacity *= Number(style.opacity);
    }
    return { group: rect(group), port: rect(document.querySelector('.about-narrative-scrollport')),
      title: rect(group.querySelector('h1')), description: rect(group.querySelector('.route-intro-description')),
      rule: rect(group.querySelector('.route-title-lockup__rule')), opacity };
  });
  const center = box => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
  bounds.centerErrorPx = rectError(center(bounds.group), center(bounds.port));
  assert.ok(bounds.opacity >= 0.99, 'The centered opening group is not visibly painted.');
  assert.ok(bounds.centerErrorPx <= 1, `Opening group is ${bounds.centerErrorPx.toFixed(2)}px off centre.`);
  assert.ok(bounds.group.x >= bounds.port.x - 1 && bounds.group.right <= bounds.port.right + 1, 'Opening lockup is horizontally cropped.');
  assert.ok(bounds.group.y >= bounds.port.y - 1 && bounds.group.bottom <= bounds.port.bottom + 1, 'Opening lockup is vertically cropped.');
  assert.ok(bounds.description.y >= bounds.title.bottom - 1, 'Opening title and description overlap.');
  assert.ok(bounds.rule.y >= bounds.title.bottom - 1 && bounds.rule.bottom <= bounds.description.y + 1,
    'Shared bookend rule is outside the title/description gap.');
  return bounds;
}

async function titleSample(page, id) {
  return page.evaluate(fieldId => {
    const field = document.querySelector(`.about-narrative-render-span--title [data-text-field-id="${fieldId}"]`);
    const title = field.querySelector('.about-narrative-spatial-title');
    const box = title.getBoundingClientRect(), port = document.querySelector('.about-narrative-scrollport').getBoundingClientRect();
    let opacity = 1;
    for (let node = title; node instanceof HTMLElement; node = node.parentElement) opacity *= Number(getComputedStyle(node).opacity);
    return { id: fieldId, x: box.x + box.width / 2, y: box.y + box.height / 2,
      targetX: port.x + port.width / 2, targetY: port.y + port.height / 2,
      width: box.width, height: box.height, opacity,
      drawPrepared: title.querySelectorAll('[data-route-enter-glyph]').length > 0,
      transform: getComputedStyle(title).transform };
  }, id);
}

async function auditTitles(page, fields, reducedMotion) {
  const titles = fields.filter(field => field.title && !['text-promise-main', 'text-epilogue-invitation'].includes(field.id));
  assert.equal(titles.length, 4);
  const fractions = [0.2, 0.4, 0.6, 0.8, 0.9, 0.98];
  const records = [];
  const measurementStartedAt = new Date().toISOString();
  // DOM geometry does not require a GPU redraw. Record every actual review
  // screenshot and the continuous reference later with rendering restored.
  await page.evaluate(() => window.__aboutNarrativeRuntime.setVisible(false));
  try {
  for (const [name, ordered] of [['slow-forward', titles], ['fast-reverse', titles.toReversed()], ['fast-forward', titles]]) {
    for (const title of ordered) {
      for (const fraction of name === 'fast-reverse' ? fractions.toReversed() : fractions) {
        await driveAboutStoryWU(page, title.startWU + (title.endWU - title.startWU) * fraction,
          { sceneScope: 'dom-only-title-measurement' });
        if (name === 'slow-forward') await page.waitForTimeout(30);
        records.push({ pass: name, fraction, ...await titleSample(page, title.id) });
      }
    }
  }
  for (const title of titles) {
    const visible = records.filter(record => record.id === title.id && record.opacity > 0.05);
    assert.ok(visible.length >= 6, `${title.id} has no measurable visible hold.`);
    for (const sample of visible) {
      assert.ok(rectError(sample, visible[0]) <= 1, `${title.id} moves during its visible hold.`);
      assert.ok(rectError(sample, { x: sample.targetX, y: sample.targetY }) <= 1, `${title.id} is not centred in the viewport.`);
      if (!reducedMotion) assert.equal(sample.drawPrepared, true, `${title.id} lost its colour-draw entrance.`);
    }
  }
  // Compare equal fractional positions across the four fields. Different
  // following content cannot change the scroll-owned opacity lifecycle.
  for (const pass of ['slow-forward', 'fast-reverse', 'fast-forward']) for (const fraction of fractions) {
    const samples = records.filter(record => record.pass === pass && record.fraction === fraction);
    assert.ok(Math.max(...samples.map(sample => sample.opacity)) - Math.min(...samples.map(sample => sample.opacity)) <= 0.035,
      `Intermediate titles have different ${pass} opacity at ${fraction}.`);
  }
  return { records, measurementStartedAt, measurementEndedAt: new Date().toISOString(),
    rendering: 'GPU draws suspended during these DOM-only title measurements; this segment is not scene-motion proof.' };
  } finally { await page.evaluate(() => window.__aboutNarrativeRuntime.setVisible(true)); }
}

async function auditTravel(page, map, entry) {
  const samples = [];
  for (let index = 0; index <= 24; index += 1) {
    await driveAboutStoryWU(page, map.durationWU * index / 24);
    samples.push({ ...await motion(page), scrollTop: await page.locator('.about-narrative-scrollport').evaluate(node => node.scrollTop) });
  }
  for (const sample of samples) {
    assert.deepEqual(sample.cameraProjection, samples[0].cameraProjection, 'Camera lens/projection changes within one layout.');
    assert.ok(Array.isArray(sample.authoredMotion), 'Missing authored motion diagnostic.');
    assert.equal(sample.authoredMotion.length, 0, 'Authored gates and scan must remain grounded.');
    // Independently locate the rendered position on the actual source rail.
    // A self-reported distance alone cannot prove real camera displacement.
    let closest = { errorWU: Infinity, distanceWU: 0 };
    for (let index = 1; index < cameraTrack.samples.length; index += 1) {
      const first = cameraTrack.samples[index - 1], last = cameraTrack.samples[index];
      const delta = last.slice(0, 3).map((value, axis) => value - first[axis]);
      const squared = delta.reduce((sum, value) => sum + value ** 2, 0);
      const mix = squared > 0 ? Math.max(0, Math.min(1, delta.reduce((sum, value, axis) => sum
        + value * (sample.cameraPosition[axis] - first[axis]), 0) / squared)) : 0;
      const errorWU = Math.hypot(...first.slice(0, 3).map((value, axis) => value + delta[axis] * mix - sample.cameraPosition[axis]));
      const distanceWU = trackDistances[index - 1] + Math.sqrt(squared) * mix;
      if (errorWU < closest.errorWU - 1e-8 || (Math.abs(errorWU - closest.errorWU) < 1e-8
        && Math.abs(distanceWU - sample.cameraDistanceWU) < Math.abs(closest.distanceWU - sample.cameraDistanceWU))) {
        closest = { errorWU, distanceWU };
      }
    }
    sample.railProjection = { ...closest, reportedDistanceErrorWU: Math.abs(closest.distanceWU - sample.cameraDistanceWU) };
    assert.ok(closest.errorWU < 0.0001, 'Rendered camera left the Blender-authored rail.');
    assert.ok(sample.railProjection.reportedDistanceErrorWU < 0.001, 'Reported arc distance differs from the actual camera position.');
    const [x, y, z, w] = sample.cameraQuaternion;
    // Project world-up onto the camera's right/up basis. atan2 retains the
    // visible horizon angle even when the authored camera has nonzero pitch.
    sample.horizonRollDegrees = Math.atan2(2 * (x * y + w * z), 1 - 2 * (x * x + z * z)) * 180 / Math.PI;
    if (!coreOnly) assert.ok(Math.abs(sample.horizonRollDegrees) <= 0.5, 'The camera horizon rolls more than 0.5 degrees.');
  }
  const intervals = [];
  if (!entry.reducedMotion) {
    const rate = (samples.at(-1).cameraDistanceWU - samples[0].cameraDistanceWU)
      / (samples.at(-1).scrollTop - samples[0].scrollTop);
    assert.ok(rate > 0);
    for (let index = 1; index < samples.length; index += 1) {
      const distance = samples[index].cameraDistanceWU - samples[index - 1].cameraDistanceWU;
      const scroll = samples[index].scrollTop - samples[index - 1].scrollTop;
      const error = Math.abs(distance / scroll / rate - 1);
      intervals.push({ scrollPx: scroll, distanceWU: distance, rateWUPerPx: distance / scroll, relativeError: error });
      assert.ok(error <= 0.01, `Unequal travel in interval ${index}: ${(error * 100).toFixed(3)}%.`);
    }
  } else {
    const authoredDistances = map.anchors.map(anchor => anchor.cameraDistanceWU);
    assert.ok(samples.every(sample => authoredDistances.some(distance => Math.abs(distance - sample.cameraDistanceWU) <= 0.00001)),
      'Reduced motion must use settled authored camera poses.');
  }
  for (const index of [20, 16, 12, 8, 4, 0]) {
    await driveAboutStoryWU(page, map.durationWU * index / 24);
    assertSameCamera(samples[index], await motion(page), `Reverse sample ${index}`);
  }
  for (const index of [4, 8, 12, 16, 20, 24]) {
    await driveAboutStoryWU(page, map.durationWU * index / 24);
    assertSameCamera(samples[index], await motion(page), `Repeated forward sample ${index}`);
  }
  await driveAboutStoryWU(page, map.durationWU * 0.5);
  const stoppedScroll = await auditStoppedScroll(page);
  return { samples, intervals, reducedMotion: entry.reducedMotion ? 'authored static-pose cuts; no continuous flight' : false,
    maximumRelativeRateError: Math.max(0, ...intervals.map(interval => interval.relativeError)), stoppedScroll };
}

async function auditStoppedScroll(page) {
  const before = { ...await motion(page),
    scrollTop: await page.locator('.about-narrative-scrollport').evaluate(node => node.scrollTop) };
  const held = [];
  // A short RAF-pinned sample misses delayed observer/restoration resets.
  // Leave native input untouched for the complete two-second hold.
  for (const elapsedMs of [500, 1000, 1500, 2000]) {
    await page.waitForTimeout(500);
    const sample = { elapsedMs, ...await motion(page),
      scrollTop: await page.locator('.about-narrative-scrollport').evaluate(node => node.scrollTop) };
    held.push(sample);
    assert.ok(Math.abs(before.scrollTop - sample.scrollTop) <= 1,
      `Untouched scroll reset after ${elapsedMs} ms: ${before.scrollTop} -> ${sample.scrollTop} px.`);
    assert.ok(Math.abs(before.storyWU - sample.storyWU) <= 0.00001,
      `Untouched story position changed after ${elapsedMs} ms: ${before.storyWU} -> ${sample.storyWU} WU.`);
    assertSameCamera(before, sample, `Stopped scroll after ${elapsedMs} ms`);
  }
  return { before, held, untouchedDurationMs: 2000 };
}

async function auditWheelStops(page, map, entry) {
  await driveAboutStoryWU(page, map.durationWU * 0.25);
  const port = page.locator('.about-narrative-scrollport');
  const bounds = await port.boundingBox();
  await page.mouse.move(bounds.x + bounds.width * 0.2, bounds.y + bounds.height * 0.6);
  const maximum = await port.evaluate(node => node.scrollHeight - node.clientHeight);
  const expectedRate = trackDistances.at(-1) / maximum;
  const cycles = [];
  for (const direction of [1, -1, 1, -1]) {
    const before = { ...await motion(page), scrollTop: await port.evaluate(node => node.scrollTop) };
    const deltaPx = direction * Math.min(520, Math.floor(bounds.height * 0.75));
    await page.mouse.wheel(0, deltaPx);
    await page.waitForFunction(({ initial, sign }) => sign * (
      document.querySelector('.about-narrative-scrollport').scrollTop - initial
    ) > 2, { initial: before.scrollTop, sign: direction }, { timeout: 5000, polling: 50 });
    let previous = await port.evaluate(node => node.scrollTop), stable = 0;
    for (let attempt = 0; attempt < 20 && stable < 3; attempt += 1) {
      await page.waitForTimeout(100);
      const current = await port.evaluate(node => node.scrollTop);
      stable = Math.abs(current - previous) <= 1 ? stable + 1 : 0;
      previous = current;
    }
    assert.equal(stable, 3, 'Wheel input did not settle within two seconds.');
    const after = { ...await motion(page), scrollTop: await port.evaluate(node => node.scrollTop) };
    assert.ok(direction * (after.scrollTop - before.scrollTop) > 2,
      `Wheel input returned before its untouched hold: ${before.scrollTop} -> ${after.scrollTop} px.`);
    if (!entry.reducedMotion) {
      const actualRate = (after.cameraDistanceWU - before.cameraDistanceWU) / (after.scrollTop - before.scrollTop);
      assert.ok(Math.abs(actualRate / expectedRate - 1) <= 0.01, 'Wheel-driven camera distance differs from the native-scroll rail rate.');
    }
    cycles.push({ direction, deltaPx, before, after, stoppedScroll: await auditStoppedScroll(page) });
  }
  return { cycles, scope: 'Two real wheel forward/reverse cycles, each followed by a two-second untouched native-scroll hold. This is browser wheel input, not physical-phone touch proof.' };
}

export function assertAboutProjectedPaletteStage(stage) {
  const { modelKey, samples } = stage;
  for (const sample of samples) assert.equal(sample.counts?.length, 6,
    `${modelKey} has no six-role rendered diagnostic.`);
  stage.union = Array.from({ length: 6 }, (_, index) => samples.reduce((sum, sample) => sum + sample.counts[index], 0));
  assert.ok(stage.union.filter(count => count > 0).length >= 2,
    `${modelKey} does not admit multiple material roles across its sampled stage: ${stage.union}.`);
  assert.ok(samples.some(sample => sample.counts.filter(count => count > 0).length >= 2),
    `${modelKey} remains a single-colour field.`);
}

export function assertAboutPaletteUniformUpdate(before, changed) {
  assert.ok(changed.paletteUniformUpdates > before.paletteUniformUpdates, 'Palette uniforms did not update.');
}

async function auditPaletteIdentity(page, map, result, { captureDirectory } = {}) {
  const stages = [];
  const evidence = { stages, automaticStatus: 'running',
    scope: 'Every stage: multiple projected material roles, with all six admission counts retained before depth occlusion. The separate decoded shipping check requires all six assigned roles in every profile. These counts do not establish visible pixel balance.' };
  result.paletteIdentity = evidence;
  if (!coreOnly) for (const model of metadata.models) {
    const anchors = map.anchors.filter(anchor => anchor.stageId === model.key);
    const start = Math.min(...anchors.map(anchor => anchor.cameraStoryWU));
    const next = map.anchors.find(anchor => anchor.stageId > model.key)?.cameraStoryWU ?? map.durationWU;
    assert.ok(Number.isFinite(start) && next > start, `No physical stage interval for ${model.key}.`);
    const stage = { modelKey: model.key, startWU: start, endWU: next, samples: [], union: null };
    stages.push(stage);
    for (const fraction of [0.2, 0.5, 0.8]) {
      const storyWU = start + (next - start) * fraction;
      await driveAboutStoryWU(page, storyWU);
      const measured = await runtimeMetrics(page);
      const actual = await motion(page);
      stage.samples.push({ fraction, storyWU, actualStoryWU: actual.storyWU, cameraDistanceWU: actual.cameraDistanceWU,
        counts: measured.modelFraming[model.key].renderedPaletteRoleCounts,
        framing: measured.modelFraming[model.key], paletteId: measured.paletteId, paletteGeneration: measured.paletteGeneration });
      assertIdentity(measured);
    }
    assertAboutProjectedPaletteStage(stage);
  }
  const state = await runtimeMetrics(page);
  assertIdentity(state);
  const palette = await page.evaluate(() => ({ ...window.__ABS_SIMULATION_PALETTE__ }));
  assert.equal(state.paletteId, palette.paletteId);
  assert.equal(state.paletteGeneration, palette.generation);
  assert.equal(palette.distribution.length, 6);
  assert.equal(new Set(palette.distribution.map(role => palette.colors[role.colorIndex])).size, 6,
    'The six material roles must resolve to six active palette colours.');
  const before = await motion(page);
  const next = TIME_OF_DAY_PALETTE_PERIODS.find(period => period.paletteId !== palette.paletteId);
  assert.ok(next, 'No alternate scheduled palette available.');
  evidence.before = palette;
  const capture = async name => {
    if (!captureDirectory) return null;
    const path = resolve(captureDirectory, `palette-${name}.png`);
    const { bytes, titleReadiness, poseDiagnostics } = await captureSettledAboutStill(page, { path });
    return { path, sha256: createHash('sha256').update(bytes).digest('hex'), titleReadiness, poseDiagnostics };
  };
  evidence.beforeFrame = await capture('before');
  // Exercise the installed controller's real focus-resume reconciliation on
  // static builds too. Shift only Date temporarily; native RAF, performance
  // and timer APIs remain untouched, and long motion films run after restore.
  await page.evaluate(hour => {
    if (window.__ABOUT_GATES_NATIVE_DATE__) throw new Error('Palette date fixture was not restored.');
    const NativeDate = Date, target = new NativeDate();
    target.setHours(hour, 30, 0, 0);
    const offset = target.getTime() - NativeDate.now();
    window.__ABOUT_GATES_NATIVE_DATE__ = NativeDate;
    window.Date = new Proxy(NativeDate, {
      construct: (Type, args) => Reflect.construct(Type, args.length ? args : [Type.now() + offset]),
      apply: Type => new Type(Type.now() + offset).toString(),
      get: (Type, property, receiver) => property === 'now'
        ? () => Type.now() + offset : Reflect.get(Type, property, receiver),
    });
    window.dispatchEvent(new Event('focus'));
  }, next.startHour);
  try {
    await page.waitForFunction(id => window.__ABS_SIMULATION_PALETTE__?.paletteId === id, next.paletteId);
    await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    const changed = await runtimeMetrics(page);
    assertIdentity(changed);
    assertSameCamera(before, await motion(page), 'Palette change');
    evidence.uniformUpdates = { before: state.paletteUniformUpdates, after: changed.paletteUniformUpdates };
    assertAboutPaletteUniformUpdate(state, changed);
    evidence.after = await page.evaluate(() => ({ ...window.__ABS_SIMULATION_PALETTE__ }));
    evidence.afterFrame = await capture('after');
    evidence.calendarFixture = { startHour: next.startHour, paletteId: next.paletteId,
      scope: 'Temporary Date-only calendar shift and installed focus-resume handler. No source-module import, forged palette diagnostic, RAF replacement or timer emulation.' };
  } finally {
    await page.evaluate(() => {
      if (window.__ABOUT_GATES_NATIVE_DATE__) {
        window.Date = window.__ABOUT_GATES_NATIVE_DATE__;
        delete window.__ABOUT_GATES_NATIVE_DATE__;
        window.dispatchEvent(new Event('focus'));
      }
    });
  }
  await page.waitForFunction(id => window.__ABS_SIMULATION_PALETTE__?.paletteId === id, palette.paletteId);
  assertIdentity(await runtimeMetrics(page));
  assertSameCamera(before, await motion(page), 'Palette return');
  Object.assign(evidence, { automaticStatus: 'passed', buffersStable: true, cameraStable: true });
  return evidence;
}

async function auditThemeIdentity(page) {
  const initialTheme = await page.locator('html').getAttribute('data-abs-theme');
  assert.ok(['light', 'dark'].includes(initialTheme), 'No explicit active site theme.');
  const before = await motion(page), initial = await runtimeMetrics(page), samples = [];
  for (const target of [initialTheme === 'light' ? 'dark' : 'light', initialTheme]) {
    await page.locator('.button-bar__theme-toggle').click();
    await page.waitForFunction(theme => document.documentElement.dataset.absTheme === theme, target);
    await page.evaluate(() => new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done))));
    const state = await runtimeMetrics(page);
    assertIdentity(state);
    assertSameCamera(before, await motion(page), `Switch theme to ${target}`);
    assert.equal(state.residentSurfelCount, initial.residentSurfelCount);
    assert.equal(state.gpuBufferBuilds, initial.gpuBufferBuilds);
    const palette = await page.evaluate(() => ({ ...window.__ABS_SIMULATION_PALETTE__ }));
    assert.equal(state.paletteId, palette.paletteId);
    assert.equal(state.paletteGeneration, palette.generation);
    samples.push({ theme: target, palette, gpuBufferBuilds: state.gpuBufferBuilds,
      residentSurfelCount: state.residentSurfelCount, fixedAttributeIdentityStable: state.fixedAttributeIdentityStable });
  }
  return { initialTheme, samples, cameraStable: true, sourceAttributesStable: true,
    scope: 'Actual site theme control, forward and back at one held camera pose. Both theme frame sets are captured separately in the required matrix.' };
}

async function captureReview(page, fields, map, directory, frames, result) {
  const diagnosticModels = new Set();
  const includeDiagnostics = !coreOnly && ['desktop', 'mobile'].includes(result.name)
    && !result.reducedMotion && !result.enlargedText;
  result.sceneOnlyDiagnostics = [];
  for (const [index, position] of reviewPositions(fields, map).entries()) {
    await driveAboutStoryWU(page, position.storyWU);
    const path = resolve(directory, `${String(index + 1).padStart(2, '0')}-${position.id}.png`);
    const { bytes: screenshot, titleReadiness, poseDiagnostics } = await captureSettledAboutStill(page, { path,
      requiredFieldId: fields.some(field => field.id === position.fieldId && field.title) ? position.fieldId : '' });
    const state = await getAboutSurfelState(page, { fieldId: position.fieldId || '', marginPx: 4 });
    frames.push({ ...position, label: position.id.replace(/^text-/u, ''), path });
    const review = { ...position, path, screenshotSha256: createHash('sha256').update(screenshot).digest('hex'),
      motion: await motion(page), copyProtection: state.copyProtection, titleReadiness, poseDiagnostics,
      modelFraming: state.metrics.modelFraming, paletteId: state.metrics.paletteId,
      material: { sharedBodyMaterial: state.metrics.sharedBodyMaterial, materialAtlasKey: state.metrics.materialAtlasKey,
        pixelRatio: state.metrics.pixelRatio, controls: state.metrics.controls } };
    result.review.push(review);
    assertIdentity(state.metrics);
    const modelKeys = includeDiagnostics ? DIRECT_ART_REVIEW_CRITERIA.map(criterion => criterion.modelKey)
      .filter(key => key && !diagnosticModels.has(key) && review.motion.stageVisibilityByModel[key] >= 0.95
        && state.metrics.modelFraming[key]?.renderedVisibleCount > 0) : [];
    if (modelKeys.length) {
      const diagnosticPath = resolve(directory, `diagnostic-scene-only-${String(index + 1).padStart(2, '0')}-${modelKeys.join('-')}.png`);
      const diagnostic = await withAboutCopyHiddenForDiagnostic(page, async hiddenNodes => {
        assertSameCamera(review.motion, await motion(page), 'Copy-hidden diagnostic initial pose');
        const bytes = await page.screenshot({ path: diagnosticPath, animations: 'allow' });
        assertSameCamera(review.motion, await motion(page), 'Copy-hidden diagnostic captured pose');
        const actual = await runtimeMetrics(page);
        assertIdentity(actual);
        for (const key of ['paletteId', 'paletteGeneration', 'sharedBodyMaterial', 'materialAtlasKey', 'pixelRatio', 'controls', 'residentSurfelCount']) {
          assert.deepEqual(actual[key], state.metrics[key], `Copy-hidden diagnostic changed ${key}.`);
        }
        return { path: diagnosticPath, sha256: createHash('sha256').update(bytes).digest('hex'),
          kind: 'diagnostic-scene-only', copyClearanceEvidence: false, modelKeys, hiddenNodes,
          sourceHash: result.sourceHash, runtimeSourceFingerprint, storyWU: position.storyWU,
          cameraDistanceWU: review.motion.cameraDistanceWU, motion: review.motion, paletteId: review.paletteId,
          material: review.material, pairedWithCopy: { path, sha256: review.screenshotSha256 },
          scope: 'Temporary narrative-copy visibility only at the paired exact pose, outside cadence segments. The shell and active material remain unchanged. This image cannot establish copy clearance.' };
      });
      assertSameCamera(review.motion, await motion(page), 'Copy-hidden diagnostic restored pose');
      result.sceneOnlyDiagnostics.push(diagnostic);
      modelKeys.forEach(key => diagnosticModels.add(key));
    }
  }
}

async function captureExtraSourcePositions(page, map, entry, directory, result) {
  assert.equal(entry.reducedMotion, false, 'Exact physical-position diagnostics require normal motion; reduced motion keeps authored pose cuts.');
  const records = [];
  result.extraSourceCaptures = records;
  const captureDirectory = resolve(directory, 'source-distance-review');
  const reviewDirectory = resolve(directory, 'distant-overlap-review');
  await mkdir(captureDirectory, { recursive: true });
  await mkdir(reviewDirectory, { recursive: true });
  for (const target of resolveAboutExtraSourceCaptureTargets(map, extraCameraDistancesWU)) {
    const startedAt = new Date().toISOString();
    await driveAboutStoryWU(page, target.targetStoryWU);
    const before = await motion(page);
    const path = resolve(captureDirectory, `${target.id}.png`);
    const { bytes: screenshot, titleReadiness, poseDiagnostics } = await captureSettledAboutStill(page, { path });
    const capturedAt = new Date().toISOString();
    const state = await getAboutSurfelState(page);
    assertIdentity(state.metrics);
    const precision = assertAboutExtraSourceCapturePosition(map, target, before, state.scrollMaximum);
    const fieldIds = [...new Set([...state.visibleEditorialFields, ...state.visibleTitles].map(field => field.fieldId))];
    const protectedFields = [], proseFailures = [], distantReviewIds = [];
    for (const fieldId of fieldIds) {
      const measured = await getAboutSurfelState(page, { fieldId, marginPx: 4 });
      assertIdentity(measured.metrics);
      protectedFields.push({ fieldId, copyProtection: measured.copyProtection });
      if (state.visibleEditorialFields.some(field => field.fieldId === fieldId)) {
        proseFailures.push(...aboutExtraProseCaptureFailures(fieldId, measured.copyProtection));
        if (measured.copyProtection.nearDiagnosticsAvailable) {
          const id = `extra-${target.id}-${fieldId}`;
          const review = await captureAboutDistantOverlapReview(page, { state: measured, id, fieldId,
            runtimeSourceFingerprint, screenshotPath: resolve(reviewDirectory, `${id}.png`) });
          if (review) {
            result.visualReviewRequired.push(review);
            distantReviewIds.push(id);
          }
        }
      }
    }
    const after = await motion(page), actual = await runtimeMetrics(page);
    assertSameCamera(before, after, `Extra source capture ${target.id}`);
    assertIdentity(actual);
    for (const key of ['paletteId', 'materialAtlasKey', 'pixelRatio', 'controls']) {
      assert.deepEqual(actual[key], state.metrics[key], `Extra source capture changed ${key}.`);
    }
    const observed = await page.evaluate(() => {
      const baseline = window.__ABOUT_GATES_RUNTIME__;
      if (baseline.runtime !== window.__aboutNarrativeRuntime
        || baseline.canvas !== document.querySelector('.about-narrative-world__canvas') || !baseline.canvas.isConnected) {
        throw new Error('About runtime or canvas was replaced during the source-position capture.');
      }
      const bounds = baseline.canvas.getBoundingClientRect();
      return { continuity: baseline.runtime.getContinuitySnapshot(), canvas: {
        x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height,
        backingWidth: baseline.canvas.width, backingHeight: baseline.canvas.height } };
    });
    assert.ok(Number.isInteger(observed.continuity.visibleStageSurfelCount) && observed.continuity.visibleStageSurfelCount >= 0);
    assert.ok(Number.isInteger(observed.continuity.renderedSurfelCount) && observed.continuity.renderedSurfelCount >= 0);
    const record = { ...target, path, screenshotSha256: createHash('sha256').update(screenshot).digest('hex'),
      startedAt, capturedAt, endedAt: new Date().toISOString(),
      status: 'captured-awaiting-direct-review', visualAcceptance: 'pending',
      kind: 'off-cadence-source-position', sourceHash: result.sourceHash, runtimeSourceFingerprint,
      storyWU: after.storyWU, motion: after, precision, titleReadiness, poseDiagnostics, scrollTop: state.scrollTop, scrollMaximum: state.scrollMaximum,
      modelFraming: actual.modelFraming, paletteId: actual.paletteId,
      material: { sharedBodyMaterial: actual.sharedBodyMaterial, materialAtlasKey: actual.materialAtlasKey,
        pixelRatio: actual.pixelRatio, controls: actual.controls },
      canvas: observed.canvas, visibleStageSurfelCount: observed.continuity.visibleStageSurfelCount,
      renderedSurfelCount: observed.continuity.renderedSurfelCount,
      instanceVisibility: actual.instanceVisibility,
      resolvedInstanceVisibilityWindows: actual.resolvedInstanceVisibilityWindows,
      visibleEditorialFields: state.visibleEditorialFields, visibleTitles: state.visibleTitles, protectedFields,
      proseAutomaticStatus: proseFailures.length ? 'failed' : state.visibleEditorialFields.length
        ? 'passed-sampled-near-criterion' : 'not-applicable-no-visible-prose', proseFailures, distantReviewIds,
      scope: 'Active same-source scene with DOM copy, outside timed film segments. Counts and target precision do not accept empty, faint or obstructing composition; direct screenshot review remains required.' };
    records.push(record);
    await writeFile(resolve(captureDirectory, 'review.json'), JSON.stringify(records, null, 2));
  }
  await contactSheet(records.map(record => ({ label: record.id, path: record.path, storyWU: record.storyWU })), captureDirectory);
  assert.deepEqual(records.flatMap(record => record.proseFailures.map(failure => `${record.id}: ${failure}`)), [],
    'Extra source-position samples failed the existing near-material/utility prose criteria. Both target captures remain available.');
  return records;
}

async function auditClearance(page, fields, map, directory, result) {
  await driveAboutStoryWU(page, 0);
  const census = await page.evaluate(() => {
    const port = document.querySelector('.about-narrative-scrollport');
    const canvas = document.querySelector('.about-narrative-world__canvas').getBoundingClientRect();
    const selector = '[data-editorial-visual-line],.about-narrative-discipline-list__label,.about-narrative-discipline-list__description,.about-narrative-editorial-pull-sentence,.about-narrative-career-sequence__label,.about-narrative-career-sequence__year,.about-narrative-career-sequence__employer,.about-narrative-career-sequence__role,.about-narrative-career-sequence__independent-label,.about-narrative-career-sequence__independent-text,.about-narrative-client-logos img,.about-narrative-client-logos li > span';
    return { maximum: port.scrollHeight - port.clientHeight, canvasHeight: canvas.height,
      fields: [...document.querySelectorAll('.about-narrative-render-span--editorial > [data-text-field-id]')].map(field => ({
        id: field.dataset.textFieldId,
        lines: [...field.querySelectorAll(selector)].flatMap(node => {
          const range = document.createRange(); range.selectNodeContents(node);
          const boxes = node.matches('img') ? [node.getBoundingClientRect()] : [...range.getClientRects()];
          return boxes.filter(box => box.width > 0 && box.height > 0).map(box => ({
            text: node.textContent.replace(/\s+/gu, ' ').trim(), centerY: (box.top + box.bottom) / 2,
            targetScroll: Math.max(0, Math.min(port.scrollHeight - port.clientHeight,
              (box.top + box.bottom) / 2 - canvas.top - canvas.height / 2)),
          }));
        }),
      })) };
  });
  const evidence = [];
  const coverage = [];
  const reviewDirectory = resolve(directory, 'distant-overlap-review');
  await mkdir(reviewDirectory, { recursive: true });
  const report = { evidence, coverage, distantOverlapReviews: [],
    automaticCriteria: 'Zero near-material intersections with painted prose and zero prose/utility overlap. Near means depth within the unfogged range OR rendered radius at least 2 CSS pixels. Finale retains all-depth zero.',
    visualAcceptance: 'pending',
    scope: 'Every censused visual prose line is checked at a readable position against the active GPU scene and actual canvas. All-depth counts remain in the evidence; every sampled distant-overlap region requires explicit screenshot review.' };
  // Preserve observations even if a later near-material or line-coverage check
  // fails. A failed run must not discard its outstanding distant reviews.
  result.clearance = report;
  for (const field of fields.filter(item => item.editorial)) {
    const lines = census.fields.find(item => item.id === field.id)?.lines || [];
    assert.ok(lines.length > 0, `${field.id} has no actual visual line census.`);
    const targets = [];
    for (const line of [...lines].sort((a, b) => a.targetScroll - b.targetScroll)) {
      if (!targets.some(target => Math.abs(target - line.targetScroll) < census.canvasHeight * 0.12)) targets.push(line.targetScroll);
    }
    const seen = new Set();
    for (const target of targets) {
      const storyWU = target / census.maximum * map.durationWU;
      await driveAboutStoryWU(page, storyWU);
      const state = await getAboutSurfelState(page, { fieldId: field.id, marginPx: 4 });
      evidence.push({ fieldId: field.id, storyWU, scrollTop: state.scrollTop, ...state.copyProtection });
      assert.equal(state.copyProtection.nearDiagnosticsAvailable, true, `${field.id}: active renderer lacks valid near-material diagnostics.`);
      const reviewId = `${String(evidence.length).padStart(3, '0')}-${field.id}`;
      const review = await captureAboutDistantOverlapReview(page, { state, id: reviewId, fieldId: field.id,
        runtimeSourceFingerprint, screenshotPath: resolve(reviewDirectory, `${reviewId}.png`) });
      if (review) {
        report.distantOverlapReviews.push(review);
        result.visualReviewRequired.push(review);
        console.warn(`REVIEW REQUIRED ${browserName} ${result.id}: ${reviewId}, ${review.regions.length} distant-overlap regions.`);
      }
      assert.equal(state.copyProtection.maximumProtectedNearVisibleCount, 0,
        `${field.id} at ${storyWU.toFixed(3)} WU: near geometry intersects painted prose; all-depth count ${state.copyProtection.maximumProtectedVisibleCount}.`);
      assert.equal(state.copyProtection.utilityRailOverlapCount, 0, `${field.id}: prose overlaps utility controls.`);
      lines.forEach((line, index) => {
        const expectedY = line.centerY - state.scrollTop;
        if (state.copyProtection.regions.some(region => region.text === line.text && region.readableFraction >= 0.95
          && expectedY >= region.bounds.top - 1 && expectedY <= region.bounds.bottom + 1)) seen.add(index);
      });
    }
    const missing = lines.filter((_, index) => !seen.has(index));
    coverage.push({ fieldId: field.id, lineCount: lines.length, checkedLineCount: seen.size, missing });
    assert.deepEqual(missing, [], `${field.id}: some visual lines never reached a measured readable position.`);
  }
  assert.ok(evidence.some(sample => sample.visibleLineCount > 0), 'No painted prose was measured.');
  report.automaticStatus = 'passed';
  return report;
}

async function auditJourneyAllocation(page, fields, map, entry, directory) {
  const lastProse = fields.filter(field => field.editorial).at(-1);
  const probe = async storyWU => {
    await driveAboutStoryWU(page, storyWU);
    const state = await getAboutSurfelState(page, { fieldId: lastProse.id });
    return { storyWU: state.storyWU, cityAdmittedCircles: state.metrics.modelFraming['about.06'].renderedVisibleCount,
      paintedFinalProse: state.visibleEditorialFields.some(field => field.fieldId === lastProse.id),
      city: state.metrics.modelFraming['about.06'], prose: state.visibleEditorialFields };
  };
  let beforeCity = await probe(0), firstCity = await probe(map.durationWU);
  assert.equal(beforeCity.cityAdmittedCircles, 0, 'City geometry is already admitted in the opening.');
  assert.ok(firstCity.cityAdmittedCircles > 0, 'No city is admitted in the terminal view.');
  for (let index = 0; index < 12; index += 1) {
    const sample = await probe((beforeCity.storyWU + firstCity.storyWU) / 2);
    if (sample.cityAdmittedCircles > 0) firstCity = sample; else beforeCity = sample;
  }
  let lastPainted = await probe((lastProse.startWU + lastProse.endWU) / 2), afterProse = await probe(map.durationWU);
  assert.equal(lastPainted.paintedFinalProse, true, 'Final substantive prose has no painted midpoint.');
  assert.equal(afterProse.paintedFinalProse, false, 'Substantive prose remains in the terminal view.');
  for (let index = 0; index < 12; index += 1) {
    const sample = await probe((lastPainted.storyWU + afterProse.storyWU) / 2);
    if (sample.paintedFinalProse) lastPainted = sample; else afterProse = sample;
  }
  const screens = await page.locator('.about-narrative-scrollport').evaluate(node => (node.scrollHeight - node.clientHeight) / node.clientHeight);
  const cityRemainingFraction = 1 - firstCity.storyWU / map.durationWU;
  if (entry.name === 'desktop' && !entry.enlargedText && !entry.reducedMotion) {
    assert.ok(screens >= 12 && screens <= 14, `Desktop story spans ${screens.toFixed(3)} screens.`);
    assert.ok(cityRemainingFraction >= 0.28 && cityRemainingFraction <= 0.4, `City first admission leaves ${(cityRemainingFraction * 100).toFixed(2)}% of the journey.`);
  }
  assert.ok(firstCity.storyWU >= lastPainted.storyWU - map.durationWU / 4096,
    'City geometry appears before the last substantive prose exits.');
  const frames = [];
  for (const [id, sample] of [['before-city-admission', beforeCity], ['first-city-admission', firstCity], ['last-painted-prose', lastPainted]]) {
    await driveAboutStoryWU(page, sample.storyWU);
    const path = resolve(directory, `${id}.png`); await page.screenshot({ path }); frames.push({ id, path, storyWU: sample.storyWU });
  }
  return { screens, cityRemainingFraction, beforeCity, firstCity, lastPainted, afterProse, frames,
    scope: 'Numerical first admitted circle and actual painted-prose exit, not merely authored cue times. First perceptually visible city must be confirmed in these active-render frames and the common-rate film.' };
}

async function auditFinaleClearance(page, fields) {
  const field = fields.find(item => item.id === 'text-epilogue-invitation');
  const evidence = [];
  for (const fraction of [0.2, 0.4, 0.6, 0.8, 1]) {
    await driveAboutStoryWU(page, field.startWU + (field.endWU - field.startWU) * fraction);
    for (const scrollFraction of [0, 0.5, 1]) {
      await page.locator('[data-about-finale-copy]').evaluate((node, value) => { node.scrollTop = (node.scrollHeight - node.clientHeight) * value; }, scrollFraction);
      const sample = await page.evaluate(() => {
        const canvas = document.querySelector('.about-narrative-world__canvas').getBoundingClientRect();
        const copy = document.querySelector('[data-about-finale-copy]'), clip = copy.getBoundingClientRect();
        const creditNode = document.querySelector('.about-narrative-scan-credit');
        if (!creditNode) throw new Error('The source credit is missing from the finale.');
        const protectedNodes = new Set([...copy.querySelectorAll('h1,h2,.route-title-lockup__rule,.route-intro-description,button,a'), creditNode]);
        const regions = [...protectedNodes].flatMap(node => {
          let opacity = 1;
          for (let parent = node; parent instanceof HTMLElement; parent = parent.parentElement) {
            const style = getComputedStyle(parent);
            if (style.visibility === 'hidden' || style.display === 'none') return [];
            opacity *= Number(style.opacity);
          }
          if (opacity <= 0.05) return [];
          const range = document.createRange(); range.selectNodeContents(node);
          const box = node.matches('h1,h2,.route-intro-description') ? range.getBoundingClientRect() : node.getBoundingClientRect();
          const credit = node.classList.contains('about-narrative-scan-credit');
          const bounds = { left: Math.max(canvas.left, box.left), right: Math.min(canvas.right, box.right),
            top: Math.max(canvas.top, box.top, credit ? -Infinity : clip.top),
            bottom: Math.min(canvas.bottom, box.bottom, credit ? Infinity : clip.bottom) };
          if (bounds.left >= bounds.right || bounds.top >= bounds.bottom) return [];
          return [{ text: node.textContent.trim(), bounds, credit, opacity, protectedNdcBounds: {
            minX: (bounds.left - canvas.left - 4) / canvas.width * 2 - 1,
            maxX: (bounds.right - canvas.left + 4) / canvas.width * 2 - 1,
            minY: 1 - (bounds.bottom - canvas.top + 4) / canvas.height * 2,
            maxY: 1 - (bounds.top - canvas.top - 4) / canvas.height * 2,
          } }];
        });
        const metrics = window.__aboutNarrativeRuntime.getMetrics({ protectedNdcRegions: regions.map(region => region.protectedNdcBounds) });
        return { regions, modelFraming: metrics.modelFraming, sourceHash: metrics.assetSourceHash,
          pixelRatio: metrics.pixelRatio, overflow: copy.scrollHeight - copy.clientHeight, actualCopyScroll: copy.scrollTop };
      });
      for (const [index, region] of sample.regions.entries()) {
        const models = Object.values(sample.modelFraming);
        region.intersections = models.reduce((sum, model) => sum + model.protectedRegionVisibleCounts[index], 0);
        region.nearIntersections = models.every(model => Number.isInteger(model.protectedRegionNearVisibleCounts?.[index]))
          ? models.reduce((sum, model) => sum + model.protectedRegionNearVisibleCounts[index], 0) : null;
        region.maximumRadiusPx = models.every(model => Number.isFinite(model.protectedRegionMaximumRadiusPx?.[index]))
          ? Math.max(0, ...models.map(model => model.protectedRegionMaximumRadiusPx[index])) : null;
        const depths = models.map(model => model.protectedRegionMinimumDepthWU?.[index]).filter(Number.isFinite);
        region.minimumDepthWU = depths.length ? Math.min(...depths) : null;
        region.protectedNearCriteria = Object.fromEntries(Object.entries(sample.modelFraming)
          .map(([key, model]) => [key, model.protectedNearCriteria || null]));
        assert.equal(region.intersections, 0, `Finale ${fraction}/${scrollFraction}: scenery intersects ${region.text}.`);
      }
      evidence.push({ fraction, scrollFraction, ...sample });
      if (sample.overflow < 1) break;
    }
  }
  return { evidence, scope: 'Visible title/description and complete contact targets are clipped to the real scroll region; the independently positioned scan credit is clipped only to the actual canvas. Four-pixel margin included.' };
}

async function recordReferences(page, map, entry, result) {
  if (!filmCases.has(entry.id)) return { status: 'not-selected', scope: 'This case retains its mandatory 32-second active forward/reverse interaction film. Common-rate reference films use the selected representative cases.' };
  const river = map.anchors.find(anchor => anchor.id === 'river-reveal').cameraStoryWU;
  const londonWU = map.durationWU - river;
  assert.ok(londonWU > 0);
  if (coreOnly || entry.reducedMotion) return { status: 'not-applicable',
    scope: coreOnly ? 'The mandatory fast traversal is a core diagnostic; it cannot certify the unaccepted scene at reference speed.'
      : 'The mandatory fast traversal records actual authored pose cuts; reduced motion is not continuous-flight reference-speed proof.' };
  // Only native scroll owns motion. Derive the full-route duration from the
  // 60-second London block; no second speed, easing, or finale multiplier.
  const rateWUPerSecond = londonWU / 60;
  const wholeDurationMs = map.durationWU / rateWUPerSecond * 1000;
  const maximumScroll = await page.locator('.about-narrative-scrollport').evaluate(node => node.scrollHeight - node.clientHeight);
  const distancePerPixel = trackDistances.at(-1) / maximumScroll;
  const reference = { rateWUPerSecond, londonDurationMs: 60_000, wholeDurationMs,
    motionEvidence: {}, rendering: 'Active WebGL throughout both recorded segments.' };
  result.continuousReferences = reference;
  await driveAboutStoryWU(page, river);
  reference.londonStartedAt = new Date().toISOString();
  reference.london = await moveContinuously(page, map.durationWU, reference.londonDurationMs);
  reference.londonEndedAt = new Date().toISOString();
  reference.motionEvidence.london = analyseAboutMotionRecording(reference.london, {
    segment: 'london-reference', direction: 1, durationMs: reference.londonDurationMs, distancePerPixel, reference: true,
  });
  await driveAboutStoryWU(page, 0);
  reference.wholeRouteStartedAt = new Date().toISOString();
  reference.wholeRoute = await moveContinuously(page, map.durationWU, wholeDurationMs);
  reference.wholeRouteEndedAt = new Date().toISOString();
  reference.motionEvidence.wholeRoute = analyseAboutMotionRecording(reference.wholeRoute, {
    segment: 'whole-route-reference', direction: 1, durationMs: wholeDurationMs, distancePerPixel, reference: true,
  });
  for (const samples of [reference.london, reference.wholeRoute]) {
    assert.ok(samples.at(-1).timeMs - samples[0].timeMs >= (samples === reference.london ? 59_000 : wholeDurationMs - 1000),
      'Continuous reference did not record its declared duration.');
    for (const sample of samples) assert.deepEqual(sample.cameraProjection, samples[0].cameraProjection);
  }
  reference.maximumScrollLagPx = Math.max(...[...reference.london, ...reference.wholeRoute].map(sample => (
    Math.abs(sample.cameraDistanceWU / distancePerPixel - sample.scrollTop)
  )));
  assert.ok(reference.maximumScrollLagPx <= 1.05, `Continuous camera trails the native scroll position by ${reference.maximumScrollLagPx.toFixed(2)} px.`);
  reference.maximumRecordedFrameIntervalMs = Math.max(...[...reference.london, ...reference.wholeRoute].map(sample => sample.maximumFrameIntervalMs));
  reference.cadenceScope = 'Actual browser RAF intervals during active WebGL and video encoding. GPU backend is recorded separately; emulation is not physical-device cadence proof.';
  return reference;
}

async function recordInteractionTraversal(page, map, entry, result) {
  await driveAboutStoryWU(page, 0);
  const before = await runtimeMetrics(page);
  assertIdentity(before);
  const maximum = await page.locator('.about-narrative-scrollport').evaluate(node => node.scrollHeight - node.clientHeight);
  const evidenceOptions = { durationMs: interactionDirectionMs, distancePerPixel: trackDistances.at(-1) / maximum,
    reducedMotion: entry.reducedMotion, reducedMotionAnchors: map.anchors };
  const recording = { kind: coreOnly ? 'core-fast-interaction-diagnostic' : 'fast-interaction-proof', motionEvidence: {},
    directionDurationMs: interactionDirectionMs, expectedTraversalDurationMs: interactionDirectionMs * 2,
    motionMode: entry.reducedMotion ? 'actual-authored-static-pose-cuts' : 'scroll-owned-source-rail',
    rendering: 'Active WebGL throughout a complete forward/reverse traversal. No title-only draw suspension occurs in this segment.',
    scope: 'Fast interaction and reversal proof. This speed is deliberately separate from the longer common-rate direction reference.' };
  result.interactionTraversal = recording;
  recording.startedAt = new Date().toISOString();
  recording.forward = await moveContinuously(page, map.durationWU, interactionDirectionMs);
  recording.forwardEndedAt = new Date().toISOString();
  recording.motionEvidence.forward = analyseAboutMotionRecording(recording.forward, {
    ...evidenceOptions, segment: 'fast-forward', direction: 1,
  });
  assertIdentity(await runtimeMetrics(page));
  recording.reverseStartedAt = new Date().toISOString();
  recording.reverse = await moveContinuously(page, 0, interactionDirectionMs);
  recording.endedAt = new Date().toISOString();
  recording.motionEvidence.reverse = analyseAboutMotionRecording(recording.reverse, {
    ...evidenceOptions, segment: 'fast-reverse', direction: -1,
  });
  const after = await runtimeMetrics(page);
  assertIdentity(after);
  assert.ok(recording.forward[0].scrollTop <= 1 && maximum - recording.forward.at(-1).scrollTop <= 1,
    'Fast forward film did not cover the complete native scroll range.');
  assert.ok(maximum - recording.reverse[0].scrollTop <= 1 && recording.reverse.at(-1).scrollTop <= 1,
    'Fast reverse film did not return across the complete native scroll range.');
  for (const samples of [recording.forward, recording.reverse]) {
    assert.ok(samples.at(-1).timeMs - samples[0].timeMs >= interactionDirectionMs - 250,
      'Fast interaction film ended before its declared traversal duration.');
    for (const sample of samples) assert.deepEqual(sample.cameraProjection, recording.forward[0].cameraProjection);
  }
  assertSameCamera(recording.forward.at(-1), recording.reverse[0], 'Fast film turnaround');
  assertSameCamera(recording.forward[0], recording.reverse.at(-1), 'Fast film return');
  if (entry.reducedMotion) {
    const authoredDistances = map.anchors.map(anchor => anchor.cameraDistanceWU);
    assert.ok([...recording.forward, ...recording.reverse].every(sample => authoredDistances.some(
      distance => Math.abs(distance - sample.cameraDistanceWU) <= 0.00001,
    )), 'Reduced-motion film invented travel between authored source poses.');
  }
  recording.maximumRecordedFrameIntervalMs = Math.max(...[...recording.forward, ...recording.reverse]
    .map(sample => sample.maximumFrameIntervalMs));
  recording.activeSceneBefore = { visible: before.visible, sourceHash: before.assetSourceHash,
    gpuBufferBuilds: before.gpuBufferBuilds, materialAtlasKey: before.materialAtlasKey };
  recording.activeSceneAfter = { visible: after.visible, sourceHash: after.assetSourceHash,
    gpuBufferBuilds: after.gpuBufferBuilds, materialAtlasKey: after.materialAtlasKey };
  recording.status = 'captured-active-traversal';
  return recording;
}

async function routeReturn(page, entry) {
  await page.evaluate(() => { window.__ABOUT_AUDIT_RELEASED_RUNTIME__ = window.__aboutNarrativeRuntime; });
  await page.locator('[data-route-tab="home"]').click();
  await page.waitForSelector('.about-narrative-lab', { state: 'detached' });
  await page.waitForFunction(() => window.__aboutNarrativeRuntime === undefined);
  const released = await page.evaluate(() => {
    const state = window.__ABOUT_AUDIT_RELEASED_RUNTIME__.getMetrics();
    delete window.__ABOUT_AUDIT_RELEASED_RUNTIME__;
    return { residentSurfelCount: state.residentSurfelCount, gpuBufferCount: state.gpuBufferCount,
      gpuBufferBytes: state.gpuBufferBytes, mountedCanvases: document.querySelectorAll('.about-narrative-world__canvas').length };
  });
  assert.deepEqual(released, { residentSurfelCount: 0, gpuBufferCount: 0, gpuBufferBytes: 0, mountedCanvases: 0 },
    'The unmounted About scene retains GPU resources.');
  await page.waitForFunction(() => document.documentElement.dataset.absTransitionPhase === 'idle');
  if (entry.name === 'short') await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('[data-route-tab="about"]').click();
  await waitForReadyScene(page, { ...entry, layoutProfile: entry.name === 'short' ? 'mobile' : entry.layoutProfile });
  if (entry.name === 'short') {
    await page.setViewportSize(entry.viewport);
    await waitForReadyScene(page, entry);
  }
  assertIdentity(await runtimeMetrics(page));
  return { unmountedRuntimeReleased: true, routeReturnReady: true, released };
}

async function auditRestoration(page, context, entry, map) {
  await driveAboutStoryWU(page, map.durationWU * 0.56);
  await page.waitForFunction(() => Math.abs(Number(history.state?.absAboutNarrativeProgress) - 0.56) < 0.001);
  const before = await page.evaluate(() => ({ progress: history.state.absAboutNarrativeProgress,
    measuredDurationWU: Number(document.querySelector('.about-narrative-lab').dataset.aboutMeasuredDurationWu),
    motion: window.__aboutNarrativeRuntime.getMotionSnapshot() }));
  if (entry.enlargedText) {
    const roleScales = await page.evaluate(() => Object.fromEntries(
      ['body', 'small-body', 'eyebrow', 'main-title', 'inbetween-title'].map(role => {
        const property = `--about-${role}-size-scale`;
        return [property, getComputedStyle(document.querySelector('.about-narrative-lab')).getPropertyValue(property).trim()];
      }),
    ));
    await context.addInitScript(scales => {
      // Keep the audit's exact text-size override across document and SPA
      // restoration. Reuse the measured doubled values, so an early observer
      // cannot double fallback values before the authored CSS is available.
      new MutationObserver(() => {
        const root = document.querySelector('.about-narrative-lab');
        if (!root || root.dataset.aboutAuditTextEnlarged) return;
        root.dataset.aboutAuditTextEnlarged = 'true';
        for (const [property, value] of Object.entries(scales)) root.style.setProperty(property, value);
      }).observe(document, { subtree: true, childList: true });
    }, roleScales);
  }
  await page.reload({ waitUntil: 'domcontentloaded' });
  await waitForReadyScene(page, entry);
  const after = await page.evaluate(() => {
    const port = document.querySelector('.about-narrative-scrollport');
    return { progress: port.scrollTop / (port.scrollHeight - port.clientHeight),
      measuredDurationWU: Number(document.querySelector('.about-narrative-lab').dataset.aboutMeasuredDurationWu),
      motion: window.__aboutNarrativeRuntime.getMotionSnapshot() };
  });
  assert.ok(Math.abs(before.progress - after.progress) < 0.001, 'Reload restored a different native scroll progress.');
  assert.ok(Math.abs(before.measuredDurationWU - after.measuredDurationWU) < 0.01, 'Reload restored a different text measurement.');
  assert.ok(Math.abs(before.motion.cameraDistanceWU - after.motion.cameraDistanceWU) <= trackDistances.at(-1) * 0.001,
    'Reload restored a different point on the actual source rail.');
  return { before, after };
}

async function auditRendererFailure(browser, profile, { context: existingContext } = {}) {
  const context = existingContext || await browser.newContext({ viewport: profile.viewport, deviceScaleFactor: 1,
    hasTouch: profile.name === 'mobile' });
  let page;
  try {
    context.setDefaultTimeout(15_000);
    await installCandidateAssets(context);
    await context.addInitScript(() => {
      const native = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function getContext(type, ...args) {
        return /webgl/u.test(type) ? null : native.call(this, type, ...args);
      };
    });
    page = await context.newPage();
    const errors = [], warnings = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('console', message => {
      if (['warning', 'error'].includes(message.type())) warnings.push(message.text());
    });
    await page.goto(`${baseUrl}/about.html?preview=about&edit=0`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.pointWorldState === 'unavailable', null, { polling: 100 });
    await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.aboutLayoutValidation === 'valid', null, { polling: 100 });
    await page.waitForFunction(() => {
      const overlay = document.getElementById('abs-boot-overlay');
      const style = overlay ? getComputedStyle(overlay) : null;
      const overlayHidden = !overlay || style.display === 'none' || style.visibility === 'hidden'
        || Number.parseFloat(style.opacity || '1') < 0.02;
      return document.documentElement.dataset.absBootState === 'ready' && overlayHidden
        && !document.getElementById('root')?.inert
        && (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle';
    }, null, { timeout: 20_000, polling: 100 });
    const opening = await page.evaluate(() => ({ text: document.querySelector('.about-narrative-lab').textContent.length,
      staleRuntime: Boolean(window.__aboutNarrativeRuntime), rootInert: document.getElementById('root').inert,
      world: document.querySelector('.about-narrative-lab').dataset.pointWorldState,
      layoutValidation: document.querySelector('.about-narrative-lab').dataset.aboutLayoutValidation,
      transitionPhase: document.documentElement.dataset.absTransitionPhase || 'idle',
      bootState: document.documentElement.dataset.absBootState,
      bootOverlay: (() => {
        const node = document.getElementById('abs-boot-overlay');
        if (!node) return { present: false };
        const style = getComputedStyle(node);
        return { present: true, display: style.display, visibility: style.visibility, opacity: Number(style.opacity) };
      })() }));
    assert.equal(opening.staleRuntime, false, 'Renderer failure left a stale ready runtime.');
    assert.equal(opening.rootInert, false, 'Renderer failure made editorial content inert.');
    assert.ok(opening.text > 1000, 'Renderer failure lost the substantive story.');
    await driveAboutStoryWU(page, Infinity, { sceneScope: 'intentional-renderer-fallback' });
    const finaleAccess = await assertFinaleAccess(page);
    const screenshot = resolve(output, `renderer-failure-${profile.name}.png`);
    await page.screenshot({ path: screenshot });
    assert.deepEqual(errors, [], 'Renderer failure caused an uncaught page error.');
    assert.ok(warnings.some(message => message.includes('[About narrative] WebGL is unavailable')), 'The injected failure did not reach the editorial fallback.');
    assert.deepEqual(warnings.filter(message => !/WebGL|webgl/u.test(message)), [], 'Unexpected warning during failure fallback.');
    await page.locator('[data-route-tab="home"]').click();
    await page.waitForSelector('.about-narrative-lab', { state: 'detached' });
    return { profile: profile.name, opening, finaleAccess, screenshot, warnings, errors, routeAwayPassed: true,
      scope: 'Separate intentional WebGL context-creation failure. This screenshot is accessibility fallback evidence only.' };
  } catch (error) {
    error.readiness = page ? await readReadiness(page).catch(() => null) : null;
    const path = resolve(output, `renderer-failure-${profile.name}-diagnostic.png`);
    error.failureScreenshot = page ? await page.screenshot({ path }).then(() => path).catch(() => null) : null;
    throw error;
  } finally {
    if (existingContext) await page?.close();
    else await context.close();
  }
}

async function auditStaticFixtures(report) {
  const selected = new Set((process.env.ABS_ABOUT_GATES_FIXTURES || 'paletteIdentity,rendererFailure').split(',').map(value => value.trim()));
  assert.ok(selected.size && [...selected].every(name => ['paletteIdentity', 'rendererFailure', 'stillPose'].includes(name)),
    'Unknown ABS_ABOUT_GATES_FIXTURES; use paletteIdentity, rendererFailure and/or stillPose.');
  assert.ok(!requestedCases || cases.length === 1, '--check-fixtures accepts exactly one ABS_ABOUT_GATES_CASES ID.');
  const entry = requestedCases ? cases[0] : allCases.find(item => item.id === 'desktop-dark-motion');
  assert.ok(!entry.reducedMotion && !entry.enlargedText, '--check-fixtures requires a normal-text motion case.');
  const browser = await launchAboutAuditBrowser(browserName);
  const context = await browser.newContext({ viewport: entry.viewport, deviceScaleFactor: 1,
    colorScheme: entry.theme, reducedMotion: 'no-preference', hasTouch: ['tablet', 'mobile'].includes(entry.name) });
  report.scope = 'static-audit-fixture-validation';
  report.completion = 'does-not-accept-scene-composition-or-required-matrix';
  report.requestedCases = []; report.requestedFilmCases = []; report.requestedReferenceFilmCases = [];
  report.fixtures = { caseId: entry.id, startedAt: new Date().toISOString(), requestedChecks: [...selected], checks: [] };
  const deadline = setTimeout(() => { report.fixtures.deadlineExceeded = true; void context.close(); }, 120_000);
  try {
    context.setDefaultTimeout(15_000);
    await context.addInitScript(theme => localStorage.setItem('theme-preference-v3', theme), entry.theme);
    await installReadinessTrace(context);
    report.fixtures.assetDelivery = await installCandidateAssets(context);
    const page = await context.newPage(), errors = collectPageErrors(page);
    const verifyDelivery = observeDeliveredAssets(page);
    page.on('console', message => {
      if (message.type() === 'warning' && message.text().includes('[About narrative] WebGL is unavailable')) errors.push(message.text());
    });
    await page.goto(`${baseUrl}/about.html?preview=about&edit=0`, { waitUntil: 'domcontentloaded' });
    const ready = await waitForReadyScene(page, entry);
    report.fixtures.ready = { sourceHash: ready.assetSourceHash, state: ready.state, visible: ready.visible,
      sharedBodyMaterial: ready.sharedBodyMaterial, materialAtlasKey: ready.materialAtlasKey,
      gpuBufferBuilds: ready.gpuBufferBuilds, canvas: [ready.viewportWidth, ready.viewportHeight] };
    report.fixtures.deliveredAssets = await verifyDelivery();
    report.fixtures.deliveredRuntimeCode = deliveredRuntimeCodeByPage.get(page);
    const map = resolveAboutNarrativeJourneyMap(await getAboutSurfelJourneyMap(page), cameraTrack);
    assert.equal(map.valid, true);
    if (selected.has('stillPose')) try {
      assert.equal(detailedStillDiagnostics, true, 'stillPose requires ABS_ABOUT_GATES_STILL_DIAGNOSTICS=1.');
      assert.equal(report.fixtures.deliveredRuntimeCode.status, 'verified-cold-static-build',
        'stillPose requires ABS_ABOUT_GATES_STATIC_DIRECTORY and actual delivered static module bytes.');
      const fields = await layoutFields(page);
      const selection = process.env.ABS_ABOUT_GATES_STILL_POSE_POSITIONS || 'cold2';
      const positions = selectAboutStillPosePositions(fields, map, selection);
      const captures = [];
      report.fixtures.stillPose = { selection, captures, requiredPositions: positions,
        scope: selection === 'original19'
          ? 'All 19 original still positions in a fresh context. Diagnostic pose/glyph evidence only; no film, scene-art, cadence or required-matrix acceptance.'
          : 'Cold opening to original failed prose checkpoint only. No prior traversal/history, film, scene-art, cadence or complete original19 acceptance.' };
      for (const [index, position] of positions.entries()) {
        await driveAboutStoryWU(page, position.storyWU);
        const path = resolve(output, `${String(index + 1).padStart(2, '0')}-${position.id}.png`);
        const { bytes, titleReadiness, poseDiagnostics } = await captureSettledAboutStill(page, { path,
          requiredFieldId: fields.some(field => field.id === position.fieldId && field.title) ? position.fieldId : '' });
        assertIdentity(await runtimeMetrics(page));
        captures.push({ ...position, path, sha256: createHash('sha256').update(bytes).digest('hex'),
          sourceHash: metadata.source.sha256, runtimeSourceFingerprint, titleReadiness, poseDiagnostics });
      }
      assert.deepEqual(errors, []);
      report.fixtures.checks.push({ name: 'stillPose', status: 'passed' });
      console.log('PASS static fixture stillPose');
    } catch (error) {
      report.fixtures.checks.push({ name: 'stillPose', status: 'failed', error: error.stack, errors,
        poseReadiness: error.poseReadiness, scrollPositioning: error.scrollPositioning });
      console.error(`FAIL static fixture stillPose: ${error.message}`);
    }
    if (selected.has('paletteIdentity')) try {
      await auditPaletteIdentity(page, map, report.fixtures, { captureDirectory: output });
      assert.deepEqual(errors, []);
      report.fixtures.checks.push({ name: 'paletteIdentity', status: 'passed' });
      console.log('PASS static fixture paletteIdentity');
    } catch (error) {
      report.fixtures.checks.push({ name: 'paletteIdentity', status: 'failed', error: error.stack, errors });
      console.error(`FAIL static fixture paletteIdentity: ${error.message}`);
    }
    await page.close();
    if (selected.has('rendererFailure')) try {
      report.fixtures.rendererFailure = await auditRendererFailure(browser, entry, { context });
      report.fixtures.checks.push({ name: 'rendererFailure', status: 'passed' });
      console.log('PASS static fixture rendererFailure');
    } catch (error) {
      report.fixtures.checks.push({ name: 'rendererFailure', status: 'failed', error: error.stack,
        readiness: error.readiness, screenshot: error.failureScreenshot });
      console.error(`FAIL static fixture rendererFailure: ${error.message}`);
    }
  } catch (error) {
    report.fixtures.checks.push({ name: 'fixtureReadiness', status: 'failed', error: error.stack,
      runtimeCodeDelivery: error.runtimeCodeDelivery });
  } finally {
    clearTimeout(deadline);
    await context.close().catch(() => {});
    await browser.close();
    report.fixtures.endedAt = new Date().toISOString();
    const actual = await readRuntimeSourceHashes();
    report.sourceFilesChangedDuringRun = findAboutRuntimeSourceChanges(runtimeSourceHashes, actual);
    report.status = report.fixtures.checks.some(check => check.status === 'failed') || report.sourceFilesChangedDuringRun.length
      ? 'failed-fixture-checks' : 'passed-fixture-checks';
    await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
  }
  return report.status;
}

export async function runAboutGatesThamesAudit() {
await mkdir(output, { recursive: true });
const report = { schema: 'about-gates-thames-audit/v3', routeId, recordedAt: new Date().toISOString(), browserName, baseUrl,
  scope: coreOnly ? 'independent-core-only' : completeMatrixRequested ? 'complete-candidate' : 'bounded-candidate', sourceHash: metadata.source.sha256,
  completeMatrixRequested,
  visualAcceptance: 'pending-direct-review',
  runtimeSourceFingerprint, runtimeSourceHashes, auditScriptSha256,
  requiredCases: allCases.map(entry => entry.id), requestedCases: cases.map(entry => entry.id), cases: [],
  requiredInteractionFilmCases: allCases.map(entry => entry.id),
  requiredReferenceFilmCases: [...REQUIRED_REFERENCE_FILM_CASES], missingReferenceFilmCases: [...REQUIRED_REFERENCE_FILM_CASES],
  referenceFilmRequirement: { londonDurationMs: 60000, wholeRouteDurationMsAt32Percent: 187500,
    wholeRouteRule: '60000 / source-resolved London fraction; one physical rate within each layout' },
  requestedFilmCases: cases.map(entry => entry.id), requestedReferenceFilmCases: [...filmCases],
  extraCameraDistancesWU,
  requiredDirectArtCriteria: DIRECT_ART_REVIEW_CRITERIA.map(criterion => criterion.id), directArtReviews: [],
  interactionTraversalSeconds: interactionDirectionMs * 2 / 1000,
  unverified: ['Physical phone testing', 'Native browser-menu text enlargement',
    'Recognisability, apparent speed, continuous composition and horizon need direct review of the recorded frames and films.'],
  retainedChecks: ['audit-about-narrative-terminal-hold.mjs', 'audit-about-narrative-restoration.mjs',
    'audit-about-motion-continuity.mjs', 'audit-about-narrative-editorial-refinement.mjs',
    'audit-about-unified-journey.mjs', 'audit-about-narrative-runtime-soak.mjs', 'audit-transition-flows.mjs'] };

if (process.argv.includes('--list-cases')) {
  console.log(JSON.stringify({ cases: allCases, coreOnly, sourceHash: metadata.source.sha256,
    allCasesRecordVideo: true, interactionTraversalSeconds: interactionDirectionMs * 2 / 1000,
    caseDeadlineSeconds: { fastTraversalAndMetrics: 240, fastTraversalAndReferencesAndMetrics: 600 },
    requiredReferenceFilmCases: [...REQUIRED_REFERENCE_FILM_CASES], requestedReferenceFilmCases: [...filmCases],
    extraCameraDistancesWU,
    fullReferenceSeconds: 'Required desktop/mobile dark motion: 60 + 60 / London fraction; 247.5 seconds each at 32%' }, null, 2));
} else {
  try { report.sourceProof = await readSourceProof(); }
  catch (error) { report.sourceProof = { status: 'blocked', reason: 'Source proof is missing, invalid, or no longer matches its evidence files.', detail: error.message }; }
  if (!coreOnly && report.sourceProof.status !== 'source-reviewed') {
    report.status = 'blocked-source-proof';
    await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
    console.error('BLOCKED: full gates/Thames acceptance needs same-source landmark and recovered-gate evidence. Core-only checks remain available.');
    process.exitCode = 2;
  } else if (process.argv.includes('--check-source')) {
    report.shippedPaletteRoles = await inspectShippedPaletteRoles();
    report.status = 'passed-source-proof-contract';
    report.completion = 'pending-browser-and-visual-acceptance';
    await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
    console.log('PASS source evidence hashes and shipping role prefixes. No browser scene was accepted or tested.');
  } else if (process.argv.includes('--check-fixtures')) {
    report.shippedPaletteRoles = await inspectShippedPaletteRoles();
    if (await auditStaticFixtures(report) !== 'passed-fixture-checks') process.exitCode = 1;
  } else {
    if (!coreOnly) report.shippedPaletteRoles = await inspectShippedPaletteRoles();
    for (const entry of cases) {
      const previousFiles = await readdir(resolve(output, entry.id)).catch(error => {
        if (error.code === 'ENOENT') return [];
        throw error;
      });
      assert.ok(!previousFiles.includes('direct-art-review.json'),
        `Preserve the existing art record and its images for ${entry.id}. Use a fresh ABS_ABOUT_GATES_OUTPUT directory.`);
    }
    const browser = await launchAboutAuditBrowser(browserName);
    try {
      for (const entry of cases) {
        const directory = resolve(output, entry.id);
        await mkdir(directory, { recursive: true });
        const context = await browser.newContext({ viewport: entry.viewport, deviceScaleFactor: 1,
          colorScheme: entry.theme, reducedMotion: entry.reducedMotion ? 'reduce' : 'no-preference',
          hasTouch: entry.pointProfile === 'mobile' && entry.name !== 'short',
          recordVideo: { dir: directory, size: entry.viewport } });
        context.setDefaultTimeout(15_000);
        await context.addInitScript(theme => localStorage.setItem('theme-preference-v3', theme), entry.theme);
        await installReadinessTrace(context);
        const assetDelivery = await installCandidateAssets(context);
        const page = await context.newPage(), video = page.video(), errors = collectPageErrors(page), frames = [];
        const verifyDelivery = observeDeliveredAssets(page);
        // A caught renderer startup error is logged as a warning, and can leave
        // a previous runtime diagnostic reporting ready. Treat it as a failure.
        page.on('console', message => {
          if (message.type() === 'warning' && message.text().includes('[About narrative] WebGL is unavailable')) errors.push(message.text());
        });
        const result = { ...entry, browser: browserName, status: 'running', checks: [], review: [], visualReviewRequired: [], motionReviewRequired: [], assetDelivery,
          sourceHash: metadata.source.sha256, runtimeSourceFingerprint,
          startedAt: new Date().toISOString() };
        const referenceSelected = filmCases.has(entry.id) && !coreOnly && !entry.reducedMotion;
        const caseBudgetMs = Number(process.env.ABS_ABOUT_GATES_CASE_TIMEOUT_MS) || (referenceSelected ? 600_000 : 240_000);
        result.recordingPlan = { interactionSeconds: interactionDirectionMs * 2 / 1000,
          referenceSelected, caseBudgetMs };
        const deadline = setTimeout(() => {
          result.deadlineExceeded = { caseBudgetMs, at: new Date().toISOString() };
          void context.close();
        }, caseBudgetMs);
        report.cases.push(result);
        const check = async (name, action) => {
          try { result[name] = await action(); result.checks.push({ name, status: 'passed' });
            console.log(`PASS ${browserName} ${entry.id} ${name}`); }
          catch (error) {
            const screenshot = resolve(directory, `failure-${name}.png`);
            result.checks.push({ name, status: 'failed', error: error.stack || String(error),
              poseReadiness: error.poseReadiness, scrollPositioning: error.scrollPositioning,
              readiness: await readReadiness(page).catch(() => null),
              screenshot: await page.screenshot({ path: screenshot }).then(() => screenshot).catch(() => null) });
            console.error(`FAIL ${browserName} ${entry.id} ${name}: ${error.message}`);
            if (/runtime or canvas was replaced|Renderer or canvas was replaced/u.test(error.message)) throw error;
          }
        };
        try {
          assert.ok(video, 'Every selected case requires an actual browser video recording.');
          await page.goto(`${baseUrl}/about.html?preview=about&edit=0`, { waitUntil: 'domcontentloaded' });
          await waitForReadyScene(page, entry);
          result.deliveredAssets = await verifyDelivery();
          result.deliveredRuntimeCode = deliveredRuntimeCodeByPage.get(page);
          const canvasState = await page.evaluate(() => {
            const canvas = document.querySelector('.about-narrative-world__canvas');
            const state = window.__aboutNarrativeRuntime.getMetrics();
            const context = canvas?.getContext('webgl2');
            const debug = context?.getExtension('WEBGL_debug_renderer_info');
            return { mounted: Boolean(canvas?.isConnected), width: canvas?.width, height: canvas?.height,
              expectedWidth: Math.floor(state.viewportWidth * state.pixelRatio),
              expectedHeight: Math.floor(state.viewportHeight * state.pixelRatio),
              contextAvailable: Boolean(context && !context.isContextLost()), visible: state.visible,
              vendor: debug ? context.getParameter(debug.UNMASKED_VENDOR_WEBGL) : null,
              renderer: debug ? context.getParameter(debug.UNMASKED_RENDERER_WEBGL) : null };
          });
          assert.equal(canvasState.mounted, true, 'No active mounted About canvas.');
          assert.equal(canvasState.contextAvailable, true, 'Mounted About canvas has no usable WebGL context.');
          assert.ok(Math.abs(canvasState.width - canvasState.expectedWidth) <= 1
            && Math.abs(canvasState.height - canvasState.expectedHeight) <= 1, 'Canvas backing dimensions do not match the active runtime.');
          assert.deepEqual(errors, [], 'Renderer failed before core checks began.');
          result.canvasState = canvasState;
          if (entry.enlargedText) result.textEnlargement = await setTextEnlargement(page);
          const map = resolveAboutNarrativeJourneyMap(await getAboutSurfelJourneyMap(page), cameraTrack);
          assert.equal(map.valid, true);
          result.durationWU = map.durationWU;
          result.map = map;
          result.visibilityWindows = { source: metadata.models.map(model => ({ modelKey: model.key,
            visibilitySpace: model.visibilitySpace || 'legacy-cue-space', visibilityStartWU: model.visibilityStartWU,
            visibilityEndWU: model.visibilityEndWU, visibilityHandoffWU: model.visibilityHandoffWU })),
            resolvedEditorial: (await runtimeMetrics(page)).resolvedVisibilityWindows,
            scope: 'Source coordinates retain their declared space. The renderer owns the single conversion to the measured editorial duration.' };
          const fields = await layoutFields(page);
          console.log(`READY ${browserName} ${entry.id}`);
          await check('opening', () => auditOpening(page));
          await check('interactionTraversal', () => recordInteractionTraversal(page, map, entry, result));
          await check('titles', () => auditTitles(page, fields, entry.reducedMotion));
          await check('travel', () => auditTravel(page, map, entry));
          await check('wheelStops', () => auditWheelStops(page, map, entry));
          await check('reviewFrames', () => captureReview(page, fields, map, directory, frames, result));
          if (extraCameraDistancesWU.length) await check('extraSourceCaptures', () => captureExtraSourcePositions(page, map, entry, directory, result));
          if (!coreOnly) {
            await check('clearance', () => auditClearance(page, fields, map, directory, result));
            await check('allocation', () => auditJourneyAllocation(page, fields, map, entry, directory));
            await check('finaleClearance', () => auditFinaleClearance(page, fields));
          }
          await driveAboutStoryWU(page, map.durationWU);
          await check('finaleAccess', () => assertFinaleAccess(page, { enlargedText: entry.enlargedText }));
          await check('paletteIdentity', () => auditPaletteIdentity(page, map, result));
          await check('themeIdentity', () => auditThemeIdentity(page));
          await check('continuousReferences', () => recordReferences(page, map, entry, result));
          await check('restoration', () => auditRestoration(page, context, entry, map));
          await check('routeReturn', () => routeReturn(page, entry));
          await check('restoredAssetDelivery', () => verifyDelivery());
          await check('browserErrors', () => assert.deepEqual(errors, []));
          result.automaticStatus = result.checks.some(item => item.status === 'failed') ? 'failed' : 'passed';
          result.motionReviewRequired = describeAboutJourneyMotionReviews(result);
          result.status = resolveAboutAuditReviewStatus({ failed: result.automaticStatus === 'failed',
            distantReviews: result.visualReviewRequired.length, motionReviews: result.motionReviewRequired.length });
        } catch (error) {
          result.status = 'failed'; result.automaticStatus = 'failed'; result.error = error.stack || String(error);
          result.readinessFailure = await readReadiness(page).catch(() => null);
          await page.screenshot({ path: resolve(directory, 'failure.png') }).catch(() => {});
        } finally {
          clearTimeout(deadline);
          result.endedAt = new Date().toISOString();
          result.errors = errors;
          result.motionReviewRequired = describeAboutJourneyMotionReviews(result);
          if (result.motionReviewRequired.length) console.warn(`REVIEW REQUIRED ${browserName} ${entry.id}: ${result.motionReviewRequired.length} cadence/continuity findings; see motion-review.json.`);
          if (result.motionReviewRequired.length) await writeFile(resolve(directory, 'motion-review.json'),
            JSON.stringify({ sourceHash: result.sourceHash, runtimeSourceFingerprint,
              reviews: result.motionReviewRequired }, null, 2));
          if (frames.length) await contactSheet(frames, directory);
          if (result.visualReviewRequired.length) {
            const reviewDirectory = resolve(directory, 'distant-overlap-review');
            await writeFile(resolve(reviewDirectory, 'review.json'), JSON.stringify(result.visualReviewRequired, null, 2));
            await contactSheet(result.visualReviewRequired.map(item => ({ label: item.id,
              path: item.screenshot, storyWU: item.storyWU })), reviewDirectory);
          }
          await writeFile(resolve(directory, 'metrics.json'), JSON.stringify(result, null, 2));
          await context.close().catch(error => {
            result.contextCloseError = error.message; result.status = 'failed'; result.automaticStatus = 'failed';
          });
          if (video) {
            try {
              const path = resolve(directory, 'journey.webm');
              await video.saveAs(path);
              const bytes = await readFile(path);
              assert.ok(bytes.length > 0, 'The browser produced an empty video artifact.');
              result.video = path; result.videoBytes = bytes.length;
              result.videoSha256 = createHash('sha256').update(bytes).digest('hex');
            } catch (error) {
              result.videoSaveError = error.message; result.status = 'failed'; result.automaticStatus = 'failed';
            }
          }
          if (result.video) {
            try { result.videoSegments = describeAboutJourneyVideoSegments(result); }
            catch (error) {
              result.videoSegmentError = error.message; result.status = 'failed'; result.automaticStatus = 'failed';
            }
          }
          if (result.motionReviewRequired.length) await writeFile(resolve(directory, 'motion-review.json'),
            JSON.stringify({ sourceHash: result.sourceHash, runtimeSourceFingerprint,
              video: result.video || null, videoSha256: result.videoSha256 || null,
              reviews: result.motionReviewRequired }, null, 2));
          if (!coreOnly) {
            result.directArtReviewPath = resolve(directory, 'direct-art-review.json');
            await writeFile(result.directArtReviewPath, JSON.stringify(createAboutDirectArtReview(result), null, 2), { flag: 'wx' });
          }
          await writeFile(resolve(directory, 'metrics.json'), JSON.stringify(result, null, 2));
          report.directArtReviews = report.cases.filter(item => item.directArtReviewPath).map(item => ({
            caseId: item.id, sourceHash: item.sourceHash, path: item.directArtReviewPath,
            status: 'pending-at-capture', scope: 'The linked source/evidence-bound record is completed only by an actual direct reviewer. Automated results never promote its verdict.' }));
          report.pendingVisualReviews = report.cases.flatMap(item => item.visualReviewRequired.map(review => ({
            caseId: item.id, id: review.id, screenshot: review.screenshot, screenshotSha256: review.screenshotSha256,
            regionCount: review.regions.length, status: review.status })));
          report.pendingMotionReviews = report.cases.flatMap(item => item.motionReviewRequired.map(review => ({
            caseId: item.id, sourceHash: item.sourceHash, runtimeSourceFingerprint: item.runtimeSourceFingerprint,
            video: item.video || null, videoSha256: item.videoSha256 || null, ...review })));
          report.status = resolveAboutAuditReviewStatus({ failed: report.cases.some(item => item.status === 'failed'),
            distantReviews: report.pendingVisualReviews.length, motionReviews: report.pendingMotionReviews.length,
            passedStatus: coreOnly ? 'passed-core-only' : 'passed-numerical' });
          report.missingCases = allCases.map(item => item.id).filter(id => !report.cases.some(item => item.id === id && item.automaticStatus === 'passed'));
          report.interactionFilmCoverage = report.cases.map(item => ({ id: item.id,
            recorded: item.interactionTraversal?.status === 'captured-active-traversal' && Boolean(item.videoSha256),
            video: item.video || null, videoSha256: item.videoSha256 || null,
            motionMode: item.interactionTraversal?.motionMode || null }));
          report.missingInteractionFilmCases = allCases.map(item => item.id).filter(id => !report.interactionFilmCoverage
            .some(item => item.id === id && item.recorded));
          report.referenceFilmCoverage = collectAboutReferenceFilmCoverage(report.cases, [...filmCases], metadata.source.sha256);
          report.missingReferenceFilmCases = report.referenceFilmCoverage.filter(item => !item.recorded).map(item => item.id);
          report.recordingCompleteness = aboutMatrixCompleteness({ coreOnly, completeMatrixRequested,
            missingCases: report.missingCases, missingInteractionFilmCases: report.missingInteractionFilmCases,
            missingReferenceFilmCases: report.missingReferenceFilmCases });
          if (report.status === 'passed-numerical' && report.recordingCompleteness.blocksRequestedCompletion) report.status = 'incomplete-required-recordings';
          report.completion = report.recordingCompleteness.completion || (report.pendingMotionReviews.length
              ? 'requires-cadence-continuity-and-scene-review' : report.pendingVisualReviews.length
                ? 'requires-distant-overlap-and-scene-review' : 'requires-film-and-frame-review-and-phone-proof');
          await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
          console.log(`DONE ${browserName} ${entry.id}: ${result.status}`);
        }
      }
      if (!coreOnly) {
        report.rendererFailure = [];
        for (const profile of profiles.filter(item => ['desktop', 'mobile'].includes(item.name))) {
          try { report.rendererFailure.push({ status: 'passed', ...await auditRendererFailure(browser, profile) }); }
          catch (error) { report.rendererFailure.push({ profile: profile.name, status: 'failed', error: error.stack,
            readiness: error.readiness, screenshot: error.failureScreenshot }); report.status = 'failed'; }
        }
        await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
      }
    } finally {
      await browser.close();
      const actual = await readRuntimeSourceHashes();
      report.sourceFilesChangedDuringRun = findAboutRuntimeSourceChanges(runtimeSourceHashes, actual);
      if (report.sourceFilesChangedDuringRun.length) {
        report.status = 'failed'; report.completion = 'source-changed-during-capture';
      }
      await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
    }
    if (report.status === 'failed') process.exitCode = 1;
    else if (report.pendingVisualReviews?.length || report.pendingMotionReviews?.length
      || report.recordingCompleteness?.blocksRequestedCompletion) process.exitCode = 2;
  }
}
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await runAboutGatesThamesAudit();
