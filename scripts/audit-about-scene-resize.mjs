import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

// Effect reconstruction must never permanently lose an attached WebGL canvas.
const engine = process.env.ABS_BROWSER || 'chromium';
const origin = process.env.ABS_URL || 'http://localhost:8012';
const output = process.env.ABS_OUTPUT || 'output/playwright/about-performance-20260925/resize';
await mkdir(output, { recursive: true });
const browser = await (engine === 'webkit' ? webkit : chromium).launch({
  args: engine === 'chromium' ? ['--use-angle=metal', '--enable-gpu'] : [],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
const report = { engine, errors: [], viewports: [] };
page.on('pageerror', error => report.errors.push(error.message));
try {
  await page.goto(`${origin}/about.html`);
  for (const [width, height] of [[1440, 1000], [390, 844], [1440, 1000]]) {
    await page.setViewportSize({ width, height });
    await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady);
    await page.locator('.about-board-scrollport').evaluate(port => { port.scrollTop = port.scrollHeight; });
    await page.waitForFunction(() => {
      const stats = window.__ABS_ABOUT_GAME_BOARD__?.getStats();
      return stats?.authoredEnding?.status === 'ready'
        && stats.authoredEnding.bandJourney.progress > .999
        && !document.querySelector('.about-board-ending').inert;
    }, null, { timeout: 30000 });
    const before = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getStats());
    await page.waitForTimeout(350);
    const after = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getStats());
    assert.ok(after.authoredEnding.gpu.drawCount > before.authoredEnding.gpu.drawCount,
      'the resized 3D scene must continue painting');
    assert.equal(after.lifecycle.activeWebglContexts, 1);
    assert.equal(after.lifecycle.activeFallbacks, 0);
    assert.equal(after.nativeWorldCount, 0);
    assert.equal(after.boardRenderer.backingBytes, 4);
    assert.deepEqual(after.textArchitectureOverlaps, []);
    assert.equal(after.authoredEndingError, null);
    report.viewports.push({ width, height, passed: true,
      viewport: after.authoredEnding.viewport, opening: after.authoredEnding.endingOpening,
      lifecycle: after.lifecycle });
    await page.screenshot({ path: `${output}/${engine}-${width}-${report.viewports.length}.png` });
    console.log(`PASS ${engine} ${width}: resized authored scene keeps rendering with one context`);
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false; report.failure = error.stack; process.exitCode = 1;
  console.error(error.message);
  await page.screenshot({ path: `${output}/${engine}-failure.png` });
} finally {
  await browser.close();
  await writeFile(`${output}/${engine}-report.json`, JSON.stringify(report, null, 2));
}
