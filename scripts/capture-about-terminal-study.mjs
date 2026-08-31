import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, basename } from 'node:path';
import { launchAboutAuditBrowser, driveAboutStoryWU, collectPageErrors,
  getAboutSurfelState, assertAboutSurfelFootprint } from './audit-about-narrative-surfel-v2-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const bundleDir = resolve(process.env.ABS_ABOUT_ASSET_DIR
  || 'react-app/app/public/models/about-v2-edited-world');
const isCandidate = Boolean(process.env.ABS_ABOUT_ASSET_DIR);
const outputDir = resolve(process.env.ABS_STUDY_OUTPUT_DIR
  || 'output/playwright/about-cinematic-refinement-20260831/study-expansive');
const metadata = JSON.parse(await readFile(resolve(bundleDir, 'meta.json'), 'utf8'));
const authoredContentSha256 = createHash('sha256').update(await readFile(
  'react-app/app/public/config/contents-about.json',
)).digest('hex');
const stillsOnly = process.env.ABS_STUDY_STILLS_ONLY === '1';
const profiles = [
  { id: 'desktop', viewport: { width: 1440, height: 1000 } },
  { id: 'mobile', viewport: { width: 390, height: 844 }, hasTouch: true },
  { id: 'narrow-mobile', viewport: { width: 320, height: 740 }, hasTouch: true },
  { id: 'short-portrait', viewport: { width: 390, height: 600 }, hasTouch: true },
  { id: 'desktop-dark', viewport: { width: 1440, height: 1000 }, colorScheme: 'dark' },
  { id: 'mobile-dark', viewport: { width: 390, height: 844 }, hasTouch: true, colorScheme: 'dark' },
  { id: 'wide', viewport: { width: 1920, height: 1080 } },
  { id: 'mobile-dpr3', viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 3 },
  { id: 'desktop-dpr2', viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 2 },
].filter((profile) => (process.env.ABS_STUDY_PROFILES || 'desktop,mobile').split(',').includes(profile.id));
const terminalContract = metadata.terminalResponse || metadata.terminalStudy;
assert.ok(['about-terminal-study/v1', 'about-terminal-response/v1'].includes(terminalContract?.schema));
await mkdir(outputDir, { recursive: true });
const browser = await launchAboutAuditBrowser(process.env.ABS_BROWSER || 'chromium');
const evidence = [];
try {
  for (const { id, ...options } of profiles) {
    console.log(`Rendering ${id} ${isCandidate ? 'isolated candidate' : 'canonical scene'}.`);
    const context = await browser.newContext({
      ...options, colorScheme: process.env.ABS_STUDY_THEME || options.colorScheme || 'light',
      deviceScaleFactor: options.deviceScaleFactor || 1,
      ...(!stillsOnly ? { recordVideo: { dir: outputDir, size: options.viewport } } : {}),
    });
    const page = await context.newPage();
    const errors = collectPageErrors(page);
    // The candidate bundle is substituted only in this browser context. The
    // app's canonical assets and URL contract are not changed by the study.
    if (isCandidate) await page.route('**/models/about-v2-edited-world/*', async (route) => {
      const file = basename(new URL(route.request().url()).pathname);
      assert.ok(['meta.json', 'surfels.bin', 'camera-track.json'].includes(file));
      await route.fulfill({
        body: await readFile(resolve(bundleDir, file)),
        contentType: file.endsWith('.json') ? 'application/json' : 'application/octet-stream',
      });
    });
    await page.goto(`${baseUrl}/about.html?preview=about&edit=0`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction((hash) => {
      const metrics = window.__aboutNarrativeRuntime?.getMetrics();
      return metrics?.state === 'ready' && metrics.bundleIntegrityVerified
        && metrics.assetSourceHash === hash && metrics.terminalResponse
        && document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete';
    }, metadata.source.sha256, { timeout: 60_000 });
    const fields = await page.locator('[data-render-span-id]').evaluateAll((nodes) => Object.fromEntries(nodes
      .filter((node) => node.querySelector('[data-text-field-id]'))
      .map((node) => [node.querySelector('[data-text-field-id]').dataset.textFieldId, {
        start: Number(node.dataset.storyStartWu), focus: Number(node.dataset.storyFocusWu), end: Number(node.dataset.storyEndWu),
      }])));
    for (const [name, target] of [
      ['plant', fields['text-life-momentum'].focus],
      ['method', fields['text-life-character'].start + 0.6],
      ['reveal', fields['text-epilogue-shaping'].focus],
      ['whole', fields['text-epilogue-invitation'].end],
    ]) {
      await driveAboutStoryWU(page, target);
      await page.waitForTimeout(450);
      await page.screenshot({ path: resolve(outputDir, `${id}-${name}.png`), caret: 'hide' });
    }
    let study = null;
    if (!stillsOnly) {
      const startWU = process.env.ABS_STUDY_FULL_JOURNEY === '1' ? 0 : fields['text-life-momentum'].focus;
      await driveAboutStoryWU(page, startWU);
      await page.waitForTimeout(500);
      const invitation = fields['text-epilogue-invitation'];
      const endWU = invitation.end;
      const requestedRate = Number(process.env.ABS_STUDY_SCROLL_RATE_WU);
      const scrollRateWUPerSecond = requestedRate > 0 ? requestedRate : (endWU - startWU) / 6;
      const travelSeconds = (endWU - startWU) / scrollRateWUPerSecond;
      const durationSeconds = 2 + travelSeconds + 4;
      const startedAt = Date.now();
      const samples = [];
      let lastSample = -1;
      // Yield between native scroll updates so the browser compositor and
      // screencast can present each frame while the existing timeline runs.
      while (Date.now() - startedAt < durationSeconds * 1000) {
        const elapsed = (Date.now() - startedAt) / 1000;
        let target = startWU;
        if (elapsed > 2) target += (endWU - startWU) * Math.min(1, (elapsed - 2) / travelSeconds);
        const sample = await page.evaluate((storyWU) => {
          const scrollport = document.querySelector('.about-narrative-scrollport');
          const spans = document.querySelectorAll('[data-render-span-id]');
          const last = spans[spans.length - 1];
          const duration = Number(last.dataset.storyEndWu);
          scrollport.scrollTop = Math.min(1, storyWU / duration)
            * (scrollport.scrollHeight - scrollport.clientHeight);
          scrollport.dispatchEvent(new Event('scroll'));
          const root = document.querySelector('.about-narrative-lab');
          return { storyWU: Number(root.dataset.narrativeStoryWu), cameraLocked: root.dataset.aboutCameraLocked };
        }, target);
        if (Math.floor(elapsed * 4) > lastSample) {
          lastSample = Math.floor(elapsed * 4);
          samples.push({ elapsed, ...sample });
        }
        await page.waitForTimeout(30);
      }
      study = { startedAt: new Date(startedAt).toISOString(), durationSeconds: (Date.now() - startedAt) / 1000,
        startWU, endWU, scrollRateWUPerSecond, samples };
      // Two uninterrupted complete cycles follow the scroll recording.
      const before = await page.evaluate(() => window.__aboutNarrativeRuntime.getMetrics());
      assert.equal(before.cameraLocked, true, 'The study did not reach the locked invitation.');
      assert.equal(before.atInvitation, true);
      assert.equal(before.assetSourceHash, metadata.source.sha256);
      const holdStartedAt = Date.now();
      // Let the page render two uninterrupted cycles. Running the full 90k
      // projection diagnostic every second blocks RAF under software WebGL and
      // changes the motion being measured. The swept endpoint check below is
      // conservative for every phase, so one post-hold sample is sufficient.
      await page.waitForTimeout(terminalContract.periodSeconds * 2 * 1000 + 2500);
      const heldState = await getAboutSurfelState(page, {
        fieldId: 'text-epilogue-invitation', marginPx: 16, terminalSweep: true,
      });
      const after = heldState.metrics;
      assertAboutSurfelFootprint(after.modelFraming['about.05'], 'terminal-ground', `${id} moving ground`);
      assert.equal(heldState.copyProtection.maximumProtectedVisibleCount, 0,
        `${id}: terminal motion intersects the contact lockup.`);
      assert.equal(Math.max(0, ...after.modelFraming['about.05']
        .terminalSweptProtectedRegionVisibleCounts), 0,
      `${id}: a terminal point's complete motion envelope reaches the contact lockup.`);
      assert.ok(heldState.copyProtection.regions.length > 0, 'The contact lockup must remain measured.');
      assert.equal(after.cameraLocked, true);
      assert.equal(after.atInvitation, true);
      assert.deepEqual(after.cameraPosition, before.cameraPosition);
      assert.equal(after.gpuBufferBuilds, before.gpuBufferBuilds);
      study.hold = { before, after, envelopeSamples: [{ ambientTime: after.ambientTime,
        framing: after.modelFraming['about.05'], copyIntersections: 0 }],
        wallDurationSeconds: (Date.now() - holdStartedAt) / 1000,
        measuredCycles: (after.ambientTime - before.ambientTime) / terminalContract.periodSeconds };
      assert.ok(study.hold.measuredCycles >= 2);
    }
    const metrics = await page.evaluate(() => window.__aboutNarrativeRuntime.getMetrics());
    const terminalState = await getAboutSurfelState(page, {
      fieldId: 'text-epilogue-invitation', marginPx: 16, terminalSweep: true,
    });
    assertAboutSurfelFootprint(terminalState.metrics.modelFraming['about.05'], 'terminal-ground', `${id} endpoint`);
    assert.equal(terminalState.copyProtection.maximumProtectedVisibleCount, 0);
    assert.equal(Math.max(0, ...terminalState.metrics.modelFraming['about.05']
      .terminalSweptProtectedRegionVisibleCounts), 0,
      `${id}: a terminal point's complete motion envelope reaches the contact lockup.`);
    assert.ok(terminalState.copyProtection.regions.length > 0);
    if (terminalContract.composition === 'expansive-full-width-no-visible-perimeter') {
      assert.equal(metrics.modelFraming['about.05'].occupiedColumnCount, 12,
        'The terminal material no longer spans every horizontal viewport bin.');
    }
    if (study && process.env.ABS_STUDY_REVERSE === '1') {
      const startedAt = Date.now();
      const travelSeconds = (study.endWU - study.startWU) / study.scrollRateWUPerSecond;
      const durationSeconds = travelSeconds + 2;
      const samples = [];
      let lastSample = -1;
      while (Date.now() - startedAt < durationSeconds * 1000) {
        const elapsed = (Date.now() - startedAt) / 1000;
        const fraction = Math.max(0, 1 - elapsed / travelSeconds);
        await page.evaluate(({ fraction, startWU, endWU }) => {
          const port = document.querySelector('.about-narrative-scrollport');
          const spans = document.querySelectorAll('[data-render-span-id]');
          const duration = Number(spans[spans.length - 1].dataset.storyEndWu);
          port.scrollTop = (startWU + (endWU - startWU) * fraction) / duration
            * (port.scrollHeight - port.clientHeight);
        }, { fraction, startWU: study.startWU, endWU: study.endWU });
        if (Math.floor(elapsed * 4) > lastSample) {
          lastSample = Math.floor(elapsed * 4);
          samples.push({ elapsed, fraction });
        }
        await page.waitForTimeout(30);
      }
      study.reverse = { startedAt: new Date(startedAt).toISOString(),
        durationSeconds: (Date.now() - startedAt) / 1000, samples };
    }
    const video = page.video();
    assert.deepEqual(errors, []);
    await context.close();
    const videoPath = video ? await video.path() : null;
    evidence.push({ id, options, baseUrl, authoredContentSha256, bundleDir, isCandidate,
      sourceHash: metadata.source.sha256, fields, metrics, study, videoPath, errors });
    await writeFile(resolve(outputDir, 'capture.json'), `${JSON.stringify(evidence, null, 2)}\n`);
  }
} finally {
  await browser.close();
}
console.log(`Captured ${evidence.length} ${isCandidate ? 'isolated study' : 'canonical'} profiles.`);
