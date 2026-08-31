import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import {
  collectPageErrors,
  launchAboutAuditBrowser,
  waitForAboutSurfelRuntime,
} from './audit-about-narrative-surfel-v2-helpers.mjs';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const profile = process.env.ABS_ABOUT_RESTORATION_PROFILE === 'mobile' ? 'mobile' : 'desktop';
const outputDir = process.env.ABS_ABOUT_RESTORATION_OUTPUT_DIR || 'output/playwright/about-narrative-restoration';
const moduleNeedle = '/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx';
const storeModuleNeedle = '/src/routes/about-narrative-lab/aboutNarrativeParameterStore.js';

await mkdir(outputDir, { recursive: true });
const browser = await launchAboutAuditBrowser(browserName);

try {
  const context = await browser.newContext(profile === 'mobile'
    ? { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true }
    : { viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  const errors = collectPageErrors(page);
  await page.route('**/*', async (route) => {
    if (route.request().url().includes(moduleNeedle)) {
      await new Promise((resolve) => setTimeout(resolve, 700));
    }
    if (route.request().url().includes(storeModuleNeedle)) {
      // Exercise the effect restart after restoration, not only a warm editor.
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
    await route.continue();
  });

  await page.goto(`${baseUrl}/about.html?preview=about&edit=0`, { waitUntil: 'domcontentloaded' });
  const coldFallback = page.locator('[data-about-opening-frame="loading"]');
  await coldFallback.waitFor({ state: 'attached' });
  assert.equal(await coldFallback.locator('h1').textContent(), 'Hi, I’m Alex.');
  await waitForAboutSurfelRuntime(page, profile);
  await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete');
  await page.locator('[data-about-scene-parameters][data-panel-state="ready"]').waitFor({ state: 'attached' });
  await page.locator('.about-narrative-lab[data-about-layout-ready="true"]').waitFor();

  const authoredProgress = 0.56;
  await page.evaluate((progress) => {
    const node = document.querySelector('.about-narrative-scrollport');
    node.scrollTop = Math.max(0, node.scrollHeight - node.clientHeight) * progress;
    node.dispatchEvent(new Event('scroll', { bubbles: true }));
  }, authoredProgress);
  await page.waitForFunction((progress) => (
    Math.abs(Number(history.state?.absAboutNarrativeProgress) - progress) < 0.001
  ), authoredProgress);
  const storedProgress = await page.evaluate(() => Number(history.state.absAboutNarrativeProgress));

  await page.reload({ waitUntil: 'domcontentloaded' });
  const restoringFallback = page.locator('[data-about-opening-frame="restoring"]');
  await restoringFallback.waitFor({ state: 'attached' }).catch(async (error) => {
    console.error('Restoration entry state:', await page.evaluate(() => ({
      history: history.state,
      fallback: document.querySelector('[data-about-opening-frame]')?.dataset.aboutOpeningFrame,
      restoring: document.querySelector('.about-narrative-lab')?.dataset.aboutRestoring,
    })));
    throw error;
  });
  assert.equal(await restoringFallback.locator('.route-centered-page__title').count(), 0);
  assert.equal(await restoringFallback.locator('h1.screen-reader').textContent(), 'About Me');

  await page.waitForSelector('.about-narrative-lab[data-about-restoring="false"]');
  await waitForAboutSurfelRuntime(page, profile);
  await page.waitForFunction(() => document.querySelector('.about-narrative-lab')?.dataset.aboutEntranceState === 'complete');
  await page.locator('[data-about-scene-parameters][data-panel-state="ready"]').waitFor({ state: 'attached' });
  await page.locator('.about-narrative-lab[data-about-layout-ready="true"]').waitFor();
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const restored = await page.evaluate(() => {
    const node = document.querySelector('.about-narrative-scrollport');
    return {
      progress: node.scrollTop / Math.max(1, node.scrollHeight - node.clientHeight),
      storyWU: Number(document.querySelector('.about-narrative-lab')?.dataset.narrativeStoryWu),
    };
  });
  assert.ok(Math.abs(restored.progress - storedProgress) < 0.001,
    `${profile} restoration used temporary layout geometry: ${storedProgress} to ${restored.progress}`);
  assert.ok(restored.storyWU > 1);
  assert.deepEqual(errors, []);

  const screenshot = `${outputDir}/${browserName}-restored-mid-story.png`;
  await page.screenshot({ path: screenshot, timeout: 60_000 });
  await writeFile(
    `${outputDir}/${browserName}-report.json`,
    `${JSON.stringify({
      baseUrl,
      browserName,
      profile,
      authoredProgress,
      storedProgress,
      restored,
      screenshot,
    }, null, 2)}\n`,
  );
  console.log(`PASS: ${browserName} shows the opener on cold load and restores a nonzero beat without flashing it.`);
  await context.close();
} finally {
  await browser.close();
}
