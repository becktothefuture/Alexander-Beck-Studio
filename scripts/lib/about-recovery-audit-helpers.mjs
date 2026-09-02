import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';
import {
  ABOUT_SURFEL_PROFILES,
  collectPageErrors,
  driveAboutStoryWU,
  getAboutSurfelJourneyMap,
  getAboutSurfelState,
  launchAboutAuditBrowser,
} from '../audit-about-narrative-surfel-v2-helpers.mjs';

export const ABOUT_RECOVERY_PROFILES = ABOUT_SURFEL_PROFILES;
export {
  driveAboutStoryWU,
  getAboutSurfelJourneyMap,
  getAboutSurfelState,
  launchAboutAuditBrowser,
};

const CONTINUITY_OCCUPANCY_CELL_COUNT = 12 * 8;

export function unionAboutContinuityOccupancy(modelOccupancy12x8 = {}) {
  const union = new Uint8Array(CONTINUITY_OCCUPANCY_CELL_COUNT);
  for (const [modelId, occupancy] of Object.entries(modelOccupancy12x8 || {})) {
    assert(Array.isArray(occupancy) || ArrayBuffer.isView(occupancy),
      `${modelId} continuity occupancy must be an array.`);
    assert.equal(occupancy.length, CONTINUITY_OCCUPANCY_CELL_COUNT,
      `${modelId} continuity occupancy must contain 96 cells.`);
    for (let index = 0; index < union.length; index += 1) {
      if (Number(occupancy[index]) > 0) union[index] = 1;
    }
  }
  return Object.freeze(Array.from(union));
}

export function summarizeAboutContinuitySnapshot(metrics, {
  minimumFramedPoints = 24,
  minimumOccupiedBins = 4,
} = {}) {
  const occupancy12x8 = Object.keys(metrics?.modelOccupancy12x8 || {}).length
    ? unionAboutContinuityOccupancy(metrics.modelOccupancy12x8)
    : Object.freeze(Array.from(metrics?.occupancy12x8 || [], (value) => Number(value) > 0 ? 1 : 0));
  assert.equal(occupancy12x8.length, CONTINUITY_OCCUPANCY_CELL_COUNT,
    'Continuity diagnostics must contain a union 12 by 8 occupancy grid.');
  const occupiedBins = occupancy12x8.reduce((sum, occupied) => sum + occupied, 0);
  const activeStageIds = Array.from(metrics?.activeStageIds || []);
  const visibleModelIds = Array.from(metrics?.visibleModelIds || []);
  const framedRenderedPoints = Number(metrics?.sampledVisibleSurfelCount) || 0;
  const checks = [
    {
      code: 'framed_particle_floor',
      pass: framedRenderedPoints >= minimumFramedPoints,
      actual: framedRenderedPoints,
      expected: minimumFramedPoints,
      message: 'Every sampled route position must retain a visible particle background.',
    },
    {
      code: 'background_spread',
      pass: occupiedBins >= minimumOccupiedBins,
      actual: occupiedBins,
      expected: minimumOccupiedBins,
      message: 'Visible particles must occupy several screen regions rather than one isolated dot cluster.',
    },
    {
      code: 'visible_scene_population',
      pass: visibleModelIds.length >= 1,
      actual: visibleModelIds,
      expected: 'at least one rendered model',
      message: 'At least one authored scene population must be visible at every sampled route position.',
    },
  ];
  return {
    occupancy12x8,
    occupiedBins,
    activeStageCount: activeStageIds.length,
    activeStageIds,
    activeModelIds: Array.from(metrics?.activeModelIds || []),
    visibleModelIds,
    framedRenderedPoints,
    residentSurfelCount: Number(metrics?.residentSurfelCount) || 0,
    renderedSurfelCount: Number(metrics?.renderedSurfelCount) || 0,
    visibleStageSurfelCount: Number(metrics?.visibleStageSurfelCount) || 0,
    checks,
    failures: checks.filter((check) => !check.pass),
  };
}

export function formatAboutRecoveryReadinessFailure(diagnostics) {
  return `About recovery renderer failed before readiness: ${JSON.stringify(diagnostics)}`;
}

export async function getAboutContinuityState(page) {
  return page.evaluate(() => {
    const root = document.querySelector('.about-narrative-lab');
    const metrics = window.__aboutNarrativeRuntime?.getContinuitySnapshot?.();
    if (!metrics) throw new Error('About continuity diagnostics are unavailable.');
    return {
      metrics,
      dataset: { ...root?.dataset },
      storyWU: Number(root?.dataset.narrativeStoryWu || metrics.storyWU || 0),
    };
  });
}

export async function openAboutRecoveryPage({
  browser,
  profile,
  baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012',
  viewport = null,
  bundleDir = process.env.ABS_ABOUT_RECOVERY_BUNDLE || null,
  theme = process.env.ABS_ABOUT_RECOVERY_THEME || 'dark',
}) {
  const expected = ABOUT_SURFEL_PROFILES[profile];
  assert(expected, `Unknown About recovery profile ${profile}.`);
  const context = await browser.newContext({
    viewport: viewport || expected.viewport,
    deviceScaleFactor: 1,
    hasTouch: profile === 'mobile',
    isMobile: profile === 'mobile',
  });
  if (theme === 'dark' || theme === 'light') {
    await context.addInitScript((requestedTheme) => {
      localStorage.setItem('theme-preference-v3', requestedTheme);
    }, theme);
  }
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);
  const errors = collectPageErrors(page);
  let bundleMetadata = null;
  if (bundleDir) {
    const resolvedBundleDir = resolve(bundleDir);
    bundleMetadata = JSON.parse(await readFile(resolve(resolvedBundleDir, 'meta.json'), 'utf8'));
    await page.route('**/models/about-v2-edited-world/*', async (route) => {
      const fileName = basename(new URL(route.request().url()).pathname);
      await route.fulfill({
        body: await readFile(resolve(resolvedBundleDir, fileName)),
        contentType: fileName.endsWith('.json') ? 'application/json' : 'application/octet-stream',
      });
    });
  }
  try {
    await page.goto(`${baseUrl}/about.html?preview=about&edit=0`, { waitUntil: 'domcontentloaded' });
    const readinessHandle = await page.waitForFunction(({ expectedProfile, expectedSourceHash }) => {
      const root = document.querySelector('.about-narrative-lab');
      const runtime = window.__aboutNarrativeRuntime;
      const motion = runtime?.getMotionSnapshot?.();
      const metrics = runtime?.getContinuitySnapshot?.();
      const rendererState = metrics?.state || root?.dataset.pointWorldState || 'missing';
      const contractStatus = metrics?.sceneContractStatus
        || root?.dataset.sceneContractStatus || 'missing';
      if (rendererState === 'unavailable' || contractStatus === 'incompatible') {
        return {
          status: 'failed',
          diagnostics: {
            expected: { profile: expectedProfile, sourceHash: expectedSourceHash },
            renderer: {
              state: rendererState,
              adapterId: metrics?.adapterId || '',
              error: metrics?.error || root?.dataset.worldError || '',
              bundleIntegrityVerified: metrics?.bundleIntegrityVerified
                ?? (root?.dataset.bundleIntegrityVerified === 'true'),
            },
            model: {
              ids: metrics?.modelIds || [],
              activeIds: metrics?.activeModelIds || [],
              visibleIds: metrics?.visibleModelIds || [],
              assetSourceHash: metrics?.assetSourceHash || '',
            },
            contract: {
              status: contractStatus,
              diagnostics: metrics?.sceneContractDiagnostics || [],
            },
          },
        };
      }
      if (rendererState === 'ready'
        && root?.dataset.aboutSceneReady === 'true'
        && root.dataset.aboutLayoutProfile === expectedProfile
        && Number.isFinite(motion?.cameraDistanceWU)
        && (!expectedSourceHash || metrics?.assetSourceHash === expectedSourceHash)) {
        return { status: 'ready' };
      }
      return null;
    }, {
      expectedProfile: profile,
      expectedSourceHash: bundleMetadata?.source?.sha256 || '',
    }, { timeout: 120_000 });
    const readiness = await readinessHandle.jsonValue();
    if (readiness.status === 'failed') {
      throw new Error(formatAboutRecoveryReadinessFailure(readiness.diagnostics));
    }
    await page.waitForFunction(() => (
      Number(document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceScale) >= 0.999
    ), null, { timeout: 60_000 });
    return { bundleMetadata, context, errors, page };
  } catch (error) {
    await context.close();
    throw error;
  }
}

export async function writeRecoveryReport(outputDir, fileName, report) {
  await mkdir(resolve(outputDir), { recursive: true });
  const path = resolve(outputDir, fileName);
  await writeFile(path, `${JSON.stringify(report, null, 2)}\n`);
  return path;
}

export function checkpointStoryWU(page, { fieldId, phase = 'focus', fraction = null }) {
  return page.evaluate(({ requestedFieldId, requestedPhase, requestedFraction }) => {
    const span = document.querySelector(`[data-render-span-id="render-span-${requestedFieldId}"]`);
    if (!(span instanceof HTMLElement)) return null;
    const start = Number(span.dataset.storyStartWu);
    const end = Number(span.dataset.storyEndWu);
    if (Number.isFinite(requestedFraction)) return start + (end - start) * requestedFraction;
    const suffix = requestedPhase[0].toUpperCase() + requestedPhase.slice(1);
    return Number(span.dataset[`story${suffix}Wu`]);
  }, { requestedFieldId: fieldId, requestedPhase: phase, requestedFraction: fraction });
}

export function summarizeFailures(checks) {
  return checks.filter((check) => !check.pass).map(({ code, message, actual, expected }) => ({
    code, message, actual, expected,
  }));
}

export const ABOUT_STORYBOARD_BEAT_RANGES = Object.freeze([
  Object.freeze({ id: 'origin', label: 'Origin field', startPercent: 0, endPercent: 11 }),
  Object.freeze({ id: 'forms', label: 'Crafted forms', startPercent: 11, endPercent: 22 }),
  Object.freeze({ id: 'round-tunnel', label: 'Round portal run', startPercent: 22, endPercent: 45 }),
  Object.freeze({ id: 'landscape', label: 'Living landscape', startPercent: 45, endPercent: 59 }),
  Object.freeze({
    id: 'clients',
    label: 'Client constellation',
    startPercent: 46.5,
    endPercent: 52,
    relationship: 'nested',
    nestedWithin: 'landscape',
  }),
  Object.freeze({ id: 'gates', label: 'Square gate cathedral', startPercent: 59, endPercent: 81 }),
  Object.freeze({ id: 'method', label: 'Method release', startPercent: 81, endPercent: 95 }),
  Object.freeze({ id: 'finale', label: 'Infinite finale', startPercent: 95, endPercent: 100 }),
]);

const ABOUT_STORYBOARD_PHASES = Object.freeze([
  Object.freeze({ id: 'entry', fraction: 0.05 }),
  Object.freeze({ id: 'key', fraction: 0.5 }),
  Object.freeze({ id: 'exit', fraction: 0.95 }),
]);

export function createAboutStoryboardCheckpoints(durationWU, {
  beats = ABOUT_STORYBOARD_BEAT_RANGES,
  phases = ABOUT_STORYBOARD_PHASES,
} = {}) {
  assert.ok(Number.isFinite(durationWU) && durationWU > 0,
    'Storyboard duration must be a positive finite number.');
  assert.equal(beats.length, 8, 'The frozen storyboard must contain eight beats.');
  assert.equal(phases.length, 3, 'Each storyboard beat must contain entry, key, and exit frames.');
  for (const beat of beats.filter((candidate) => candidate.nestedWithin)) {
    const parent = beats.find((candidate) => candidate.id === beat.nestedWithin);
    assert.ok(parent, `Nested storyboard beat ${beat.id} must name an existing parent beat.`);
    assert.ok(beat.startPercent >= parent.startPercent && beat.endPercent <= parent.endPercent,
      `Nested storyboard beat ${beat.id} must remain within ${parent.id}.`);
  }
  const checkpoints = beats.flatMap((beat, beatIndex) => {
    assert.ok(Number.isFinite(beat.startPercent) && Number.isFinite(beat.endPercent)
      && beat.startPercent >= 0 && beat.endPercent <= 100
      && beat.endPercent > beat.startPercent,
    `Storyboard beat ${beat.id} has an invalid normalized range.`);
    return phases.map((phase) => {
      assert.ok(Number.isFinite(phase.fraction) && phase.fraction > 0 && phase.fraction < 1,
        `Storyboard phase ${phase.id} must sample just inside its beat range.`);
      const normalizedPercent = beat.startPercent
        + (beat.endPercent - beat.startPercent) * phase.fraction;
      return Object.freeze({
        id: `${String(beatIndex + 1).padStart(2, '0')}-${beat.id}-${phase.id}`,
        beatId: beat.id,
        beatLabel: beat.label,
        beatIndex: beatIndex + 1,
        rangeRelationship: beat.relationship || 'primary',
        nestedWithin: beat.nestedWithin || null,
        phase: phase.id,
        rangeStartPercent: beat.startPercent,
        rangeEndPercent: beat.endPercent,
        normalizedPercent,
        storyWU: durationWU * normalizedPercent / 100,
      });
    });
  });
  assert.equal(checkpoints.length, 24, 'The storyboard must resolve to 24 frames.');
  assert.equal(new Set(checkpoints.map((checkpoint) => checkpoint.id)).size, 24,
    'Storyboard checkpoint identifiers must be unique.');
  for (const beat of beats) {
    assert.deepEqual(
      checkpoints.filter((checkpoint) => checkpoint.beatId === beat.id)
        .map((checkpoint) => checkpoint.phase),
      phases.map((phase) => phase.id),
      `Storyboard beat ${beat.id} must include entry, key, and exit.`,
    );
  }
  for (const checkpoint of checkpoints) {
    assert.ok(checkpoint.normalizedPercent > checkpoint.rangeStartPercent
      && checkpoint.normalizedPercent < checkpoint.rangeEndPercent,
    `Storyboard checkpoint ${checkpoint.id} must remain inside its beat range.`);
  }
  return Object.freeze(checkpoints);
}
