import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { launchAboutAuditBrowser, driveAboutStoryWU } from './audit-about-narrative-surfel-v2-helpers.mjs';

const browserName = process.env.ABS_BROWSER === 'webkit' ? 'webkit' : 'chromium';
const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const output = `output/playwright/about-cinematic-fallback/${browserName}`;
await mkdir(output, { recursive: true });
const browser = await launchAboutAuditBrowser(browserName);
const results = [];
try {
  for (const failure of ['webgl', 'scan-download']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    if (failure === 'webgl') {
      await page.addInitScript(() => {
        const original = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          return /^webgl|experimental-webgl/.test(kind) ? null : original.call(this, kind, ...args);
        };
      });
    } else {
      await page.route('**/surfels.bin*', route => route.abort());
    }
    await page.goto(`${baseUrl}/about.html?edit=0`);
    await page.waitForSelector('[data-point-world-state="unavailable"][data-about-scene-ready="true"]');
    await page.waitForFunction(() => document.querySelectorAll('[data-render-span-id]').length === 10);
    assert.equal((await page.locator('#about-route-title').innerText()).replace(/\s/g, ' '), 'Hi, I’m Alex.');
    for (const id of ['text-background-unit', 'text-discipline-labels', 'text-life-character']) {
      const field = page.locator(`[data-text-field-id="${id}"]`);
      const time = await field.evaluate(node => {
        const span = node.closest('[data-render-span-id]');
        return Number(span.dataset.storyStartWu) + (Number(span.dataset.storyEndWu) - Number(span.dataset.storyStartWu)) * 0.35;
      });
      await driveAboutStoryWU(page, time);
      const selected = await field.evaluate(node => {
        const range = document.createRange(); range.selectNodeContents(node);
        const selection = getSelection(); selection.removeAllRanges(); selection.addRange(range);
        return selection.toString().length;
      });
      assert.ok(selected > 100, `${failure}: the ${id} narrative cannot be selected.`);
      await page.screenshot({ path: `${output}/${failure}-${id}.png` });
    }
    await page.evaluate(() => getSelection().removeAllRanges());
    await driveAboutStoryWU(page, null);
    const actions = page.locator('.about-narrative-finale-actions');
    await page.waitForFunction(() => document.querySelector('.about-narrative-finale-actions')?.inert === false);
    assert.equal(await actions.getAttribute('aria-hidden'), 'false');
    const button = actions.getByRole('button', { name: 'Copy email address' });
    await button.focus();
    assert.equal(await button.evaluate(node => node === document.activeElement), true);
    assert.equal((await page.locator('.is-finale h2').innerText()).replace(/\s/g, ' '), 'Let’s begin.');
    assert.deepEqual(errors, []);
    await page.screenshot({ path: `${output}/${failure}-finale.png` });
    results.push({ failure, narrativeSelectable: true, finaleReachable: true, errors });
    await context.close();
    console.log(`PASS ${browserName}: ${failure} preserves the story and contact actions.`);
  }
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify(results, null, 2));
}
