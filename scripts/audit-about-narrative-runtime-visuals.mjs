import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import {
  ABOUT_SURFEL_OUTPUT_DIR,
  ABOUT_SURFEL_PROFILES,
  assertAboutSurfelMetrics,
  collectPageErrors,
  driveAboutStoryWU,
  ensureAboutSurfelOutputDirectory,
  getAboutSurfelState,
  launchAboutAuditBrowser,
  waitForAboutSurfelRuntime,
} from './audit-about-narrative-surfel-v2-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const checkpointSpecs = Object.freeze([
  Object.freeze({ id: 'opening', storyWU: 0.2, expectedZones: ['camera-page-01'] }),
  Object.freeze({
    id: 'phone', storyWU: 5, modelKey: 'mobile_phone', expectsFullyFramed: true,
  }),
  Object.freeze({
    id: 'crt', storyWU: 5.58, mobileStoryWU: 5.4, modelKey: 'crt_monitor', expectsFullyFramed: true,
    expectedZones: ['camera-page-01', 'camera-page-02'],
  }),
  Object.freeze({
    id: 'mouse', storyWU: 6.25, mobileStoryWU: 5.95, modelKey: 'mouse_with_cable', expectsFullyFramed: true,
  }),
  Object.freeze({
    id: 'pencil', storyWU: 6.35, mobileStoryWU: 6.05, modelKey: 'pencil', expectsFullyFramed: true,
  }),
  Object.freeze({ id: 'gates', storyWU: 10.5, expectedZones: ['camera-page-03'], expectsRoll: true }),
  Object.freeze({ id: 'forest', storyWU: 18, expectedZones: ['camera-page-04'] }),
  Object.freeze({ id: 'finale', storyWU: Number.POSITIVE_INFINITY, expectsFinale: true }),
]);

await ensureAboutSurfelOutputDirectory();
const browser = await launchAboutAuditBrowser('chromium');
const results = [];

async function captureGroup({ profile, reducedMotion = false }) {
  const group = reducedMotion ? 'reduced-motion' : profile;
  const context = await browser.newContext({ viewport: ABOUT_SURFEL_PROFILES[profile].viewport });
  const page = await context.newPage();
  if (reducedMotion) await page.emulateMedia({ reducedMotion: 'reduce' });
  const consoleErrors = collectPageErrors(page);
  await page.goto(`${baseUrl}/about.html?edit=0`, { waitUntil: 'domcontentloaded' });
  await waitForAboutSurfelRuntime(page, profile);
  await page.waitForFunction(() => (
    Number(document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceScale) >= 0.999
  ), null, { timeout: 60_000 });

  const specs = reducedMotion
    ? checkpointSpecs.filter((entry) => ['opening', 'gates', 'finale'].includes(entry.id))
    : checkpointSpecs;
  const screenshotPaths = [];
  let previousCameraZ = Number.POSITIVE_INFINITY;
  for (const checkpoint of specs) {
    const requestedStoryWU = checkpoint[`${profile}StoryWU`] ?? checkpoint.storyWU;
    await driveAboutStoryWU(page, requestedStoryWU);
    const state = await getAboutSurfelState(page);
    assertAboutSurfelMetrics(state.metrics, profile);
    assert.equal(state.dataset.worldStage, 'blender-surfel-scene');
    assert.equal(state.dataset.pointAsset, 'blender-surfel-v2');
    assert(state.semanticTextLength > 500);
    assert(state.metrics.cameraPosition[2] < previousCameraZ);
    previousCameraZ = state.metrics.cameraPosition[2];
    if (checkpoint.expectedZones) {
      checkpoint.expectedZones.forEach((zone) => assert(state.metrics.activeZones.includes(zone)));
    }
    if (checkpoint.expectsRoll) {
      assert(Math.abs(state.metrics.cameraRollDegrees) > 1, `${group} gate camera has no authored roll.`);
    }
    if (checkpoint.modelKey) {
      const modelFraming = state.metrics.modelFraming[checkpoint.modelKey];
      assert(modelFraming, `${group} has no ${checkpoint.modelKey} recognition diagnostics.`);
      assert(
        modelFraming.visibleFraction >= 0.95,
        `${group} reveals only ${(modelFraming.visibleFraction * 100).toFixed(1)}% of ${checkpoint.modelKey}.`,
      );
      if (checkpoint.expectsFullyFramed) {
        assert(
          modelFraming.framedVisibleFraction >= 0.95,
          `${group} frames only ${(modelFraming.framedVisibleFraction * 100).toFixed(1)}% of ${checkpoint.modelKey}.`,
        );
      }
    }
    if (checkpoint.expectsFinale) {
      assert(Math.abs(state.metrics.cameraRollDegrees) < 0.05, `${group} finale camera is not level.`);
      assert.equal(state.metrics.controls.fogStartWU, 220);
      assert.equal(state.metrics.controls.fogEndWU, 560);
      assert(Math.abs(state.metrics.cameraPosition[0]) < 0.01);
      assert(Math.abs(state.metrics.cameraPosition[1] - 2.2) < 0.01);
      assert(Math.abs(state.metrics.cameraPosition[2] + 340.639709) < 0.01);
    } else {
      assert.equal(state.metrics.controls.fogStartWU, 7);
      assert.equal(state.metrics.controls.fogEndWU, 18);
    }
    if (reducedMotion) assert.equal(state.metrics.controls.motionAmountWU, 0);

    const path = `${ABOUT_SURFEL_OUTPUT_DIR}/${group}-${checkpoint.id}.png`;
    await page.screenshot({ path, fullPage: false });
    const image = await sharp(path).stats();
    assert(image.channels.some((channel) => channel.stdev > 8), `${group}-${checkpoint.id} capture is visually empty.`);
    screenshotPaths.push({ id: checkpoint.id, path });
    results.push({
      id: `${group}-${checkpoint.id}`,
      group,
      profile,
      reducedMotion,
      requestedStoryWU: Number.isFinite(requestedStoryWU) ? requestedStoryWU : 'end',
      renderedStoryWU: state.storyWU,
      screenshot: path,
      metrics: state.metrics,
      dataset: state.dataset,
    });
  }
  assert.deepEqual(consoleErrors, []);
  await context.close();
  return { group, screenshotPaths };
}

async function createContactSheet(group, screenshots) {
  const mobileLike = group !== 'desktop';
  const width = mobileLike ? 220 : 360;
  const height = mobileLike ? 475 : 250;
  const labelHeight = 34;
  const tiles = [];
  for (const [index, screenshot] of screenshots.entries()) {
    const image = await sharp(screenshot.path)
      .resize({ width, height, fit: 'contain', background: '#eceae5' })
      .png()
      .toBuffer();
    tiles.push({ input: image, left: index * width, top: labelHeight });
    const label = Buffer.from(
      `<svg width="${width}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">`
      + '<rect width="100%" height="100%" fill="#111"/>'
      + `<text x="12" y="23" fill="#fff" font-family="Arial, sans-serif" font-size="14">${group} · ${screenshot.id}</text>`
      + '</svg>',
    );
    tiles.push({ input: label, left: index * width, top: 0 });
  }
  const output = `${ABOUT_SURFEL_OUTPUT_DIR}/contact-sheet-${group}.png`;
  await sharp({
    create: {
      width: width * screenshots.length,
      height: height + labelHeight,
      channels: 4,
      background: '#eceae5',
    },
  }).composite(tiles).png().toFile(output);
  return output;
}

try {
  const groups = [
    await captureGroup({ profile: 'desktop' }),
    await captureGroup({ profile: 'mobile' }),
    await captureGroup({ profile: 'mobile', reducedMotion: true }),
  ];
  const contactSheets = {};
  for (const group of groups) {
    contactSheets[group.group] = await createContactSheet(group.group, group.screenshotPaths);
  }
  await writeFile(
    `${ABOUT_SURFEL_OUTPUT_DIR}/visual-checkpoints.json`,
    `${JSON.stringify({
      baseUrl,
      adapterId: 'blender-surfel-v2',
      checkpoints: results,
      contactSheets,
      recordedAt: new Date().toISOString(),
    }, null, 2)}\n`,
  );
  console.log(`PASS: captured ${results.length} v2 surfel checkpoints across desktop, mobile, and reduced motion.`);
} finally {
  await browser.close();
}
