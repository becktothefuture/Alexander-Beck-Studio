import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { resolveAboutNarrativeJourneyMap } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeJourneyMap.js';
import {
  collectPageErrors, driveAboutStoryWU, getAboutSurfelJourneyMap,
  launchAboutAuditBrowser, waitForAboutSurfelRuntime,
} from './audit-about-narrative-surfel-v2-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER || 'chromium';
const output = resolve(process.env.ABS_OUTPUT_DIR || 'output/playwright/about-reduced-motion');
const track = JSON.parse(await readFile('react-app/app/public/models/about-v2-edited-world/camera-track.json', 'utf8'));
await mkdir(output, { recursive: true });
const browser = await launchAboutAuditBrowser(browserName);
const results = [];
try {
  for (const [profile, viewport] of [
    ['desktop', { width: 1440, height: 1000 }],
    ['mobile', { width: 390, height: 844 }],
  ]) {
    const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = collectPageErrors(page);
    await page.goto(`${baseUrl}/about.html?preview=about`, { waitUntil: 'domcontentloaded' });
    await waitForAboutSurfelRuntime(page, profile);
    await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.aboutLayoutReady === 'true');
    const map = resolveAboutNarrativeJourneyMap(await getAboutSurfelJourneyMap(page), track);
    assert.equal(map.valid, true);
    const cuts = [...new Set(map.anchors.map((anchor) => anchor.cameraStoryWU))];
    const readScene = () => page.evaluate(() => {
      const m = window.__aboutNarrativeRuntime.getMetrics();
      return {
        camera: m.cameraPosition, rotation: m.cameraQuaternion, clock: m.sceneStoryWU,
        visibility: Object.fromEntries(Object.entries(m.modelFraming).map(([key, model]) => [key, model.stageVisibility])),
        fog: [m.controls.fogStartWU, m.controls.fogEndWU], motion: m.controls.motionAmountWU,
        buffers: m.gpuBufferBuilds, reduced: m.reducedMotion, mode: m.stageVisibilityMode,
      };
    });
    const samples = [];
    for (let index = 0; index < cuts.length - 1; index += 1) {
      const start = cuts[index], end = cuts[index + 1];
      // Keep away from the exact cue: native scroll rounding can cross it.
      if (end - start < 0.05) continue;
      let before;
      for (const fraction of [0.2, 0.8, 0.2]) {
        await driveAboutStoryWU(page, start + (end - start) * fraction);
        const sample = await readScene();
        assert.equal(sample.reduced, true);
        assert.equal(sample.mode, 'authored-settled-cuts');
        assert.equal(sample.motion, 0);
        assert.equal(sample.buffers, 1);
        assert.ok(Object.values(sample.visibility).every((value) => value === 0 || value === 1));
        if (before) assert.deepEqual(sample, before, `${profile} material moved between cuts ${start}–${end}.`);
        before = sample;
        samples.push({ storyWU: start + (end - start) * fraction, ...sample });
      }
      if ([0, Math.floor(cuts.length / 2), cuts.length - 2].includes(index)) {
        await page.screenshot({ path: resolve(output, `${browserName}-${profile}-cut-${index}.png`) });
      }
    }
    await driveAboutStoryWU(page, null);
    assert.equal(await page.evaluate(() => window.__aboutNarrativeRuntime.getMetrics().cameraLocked), true);
    const final = await readScene();
    await page.waitForTimeout(350);
    assert.deepEqual(await readScene(), final);
    await page.screenshot({ path: resolve(output, `${browserName}-${profile}-end.png`) });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await driveAboutStoryWU(page, map.durationWU * 0.5);
    const normal = await readScene();
    assert.equal(normal.reduced, false);
    assert.equal(normal.mode, 'authored-bounded-whole-surfel-handoff');
    assert.ok(Math.abs(normal.clock - map.durationWU * 0.5) < 0.035);
    assert.deepEqual(errors, []);
    results.push({ profile, viewport, samples, final, normal, errors });
    await context.close();
    console.log(`PASS ${browserName} ${profile}: ${samples.length} forward/reverse cut samples, endpoint and preference toggle.`);
  }
} finally {
  await browser.close();
}
await writeFile(resolve(output, `${browserName}-results.json`), `${JSON.stringify({ baseUrl, results }, null, 2)}\n`);
