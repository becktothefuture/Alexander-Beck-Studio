import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

// Cache correctness: static pixels may be reused; real changes must be painted.
// Run separately from timing benchmarks so screenshots do not skew their data.
const origin = process.env.ABS_URL || 'http://localhost:8012';
const output = process.env.ABS_OUTPUT || 'output/playwright/about-render-cache';
const engine = process.env.ABS_BROWSER || 'chromium';
await mkdir(output, { recursive: true });
const browser = await (engine === 'webkit' ? webkit : chromium).launch({
  args: engine === 'chromium' ? ['--use-angle=metal', '--enable-gpu', '--enable-webgl'] : [],
});
const results = [];
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport, isMobile: viewport.width < 600,
      hasTouch: viewport.width < 600, deviceScaleFactor: viewport.width < 600 ? 3 : 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(`${origin}/about.html`);
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady);
      await page.waitForFunction(() => {
        const overlay = document.querySelector('#abs-boot-overlay');
        return !overlay || getComputedStyle(overlay).display === 'none';
      });
      await page.evaluate(() => document.fonts.ready);
      const stats = () => page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getStats());
      // Read the rendered ball pixels, not just invalidation counters. A small
      // offscreen sample keeps the assertion inexpensive and independent of UI.
      const bitmap = () => page.evaluate(() => {
        const source = document.querySelector('.about-board-balls');
        const sample = document.createElement('canvas');
        sample.width = 64;
        sample.height = 64;
        const context = sample.getContext('2d', { willReadFrequently: true });
        context.drawImage(source, 0, 0, 64, 64);
        const pixels = context.getImageData(0, 0, 64, 64).data;
        let hash = 2166136261;
        let nonemptyPixels = 0;
        for (let index = 0; index < pixels.length; index++) {
          hash = Math.imul(hash ^ pixels[index], 16777619);
          if (index % 4 === 3 && pixels[index] > 0) nonemptyPixels++;
        }
        return { hash: hash >>> 0, nonemptyPixels };
      });
      const before = await stats();
      assert.ok(before.boardRenderer.paintCount > 0, 'the opening must have a real first paint');
      const initialPositions = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot());
      await page.waitForTimeout(1200);
      const resting = await stats();
      assert.equal(resting.boardRenderer.paintCount, before.boardRenderer.paintCount,
        'the supported resting pile must not be repainted repeatedly');
      assert.ok(resting.boardRenderer.reusedPaintCount > before.boardRenderer.reusedPaintCount);
      assert.deepEqual(await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot()),
        initialPositions, 'pixel reuse must not mask hidden ball movement');
      const openingPixels = await bitmap();
      assert.ok(openingPixels.nonemptyPixels > 0, 'the cached opening must contain visible balls');
      const themeBefore = await page.locator('html').getAttribute('data-abs-theme');
      await page.getByRole('button', { name: themeBefore === 'dark' ? 'Switch to light mode' : 'Switch to dark mode' }).click();
      await page.waitForFunction(count => window.__ABS_ABOUT_GAME_BOARD__.getStats().boardRenderer.paintCount > count,
        resting.boardRenderer.paintCount);
      await page.waitForTimeout(250);
      const themed = await stats();
      const themedPixels = await bitmap();
      assert.ok(themedPixels.nonemptyPixels > 0);
      assert.notEqual(themedPixels.hash, openingPixels.hash,
        'theme changes must update actual sphere pixels, not only paint counters');
      await page.screenshot({ path: `${output}/${engine}-${viewport.width}-theme.png` });
      await page.locator('.about-board-scrollport').evaluate(port => { port.scrollTop = 80; });
      await page.waitForFunction(() => {
        const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
        return Math.abs(stats.handledScrollTop - 80) < 1 && Math.abs(stats.boardRenderer.renderedScrollTop - 80) < 1;
      });
      const scrolled = await stats();
      assert.equal(scrolled.gateProgress, 0, 'small opening scroll must leave the valve closed');
      assert.equal(scrolled.boardRenderer.paintCount, themed.boardRenderer.paintCount,
        'native movement within the buffered strip must reuse the same bitmap');
      await page.locator('.about-board-scrollport').evaluate(port => {
        const world = port.querySelector('.about-board-world');
        const topY = window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY;
        port.scrollTop = world.offsetTop + (1124 - topY) * world.clientWidth / 960 - port.clientHeight * .4;
      });
      await page.waitForTimeout(1600);
      const released = await stats();
      assert.ok(released.boardRenderer.paintCount > scrolled.boardRenderer.paintCount + 10,
        'opening the valve must resume ball painting');
      assert.ok(released.nativeLifetimeSteps > resting.nativeLifetimeSteps + 10);
      const positions = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot());
      assert.ok(positions.some((ball, index) => Math.abs(ball.y - initialPositions[index]?.y) > 1),
        'the released balls must actually move under gravity');
      await page.screenshot({ path: `${output}/${engine}-${viewport.width}-release.png` });
      await page.locator('.about-board-scrollport').evaluate(port => {
        const stage = port.querySelector('.about-board-three-stage');
        const top = stage.getBoundingClientRect().top - port.getBoundingClientRect().top + port.scrollTop;
        port.scrollTop = top + .72 * (stage.offsetHeight - port.clientHeight);
      });
      await page.waitForFunction(() => {
        const s = window.__ABS_ABOUT_GAME_BOARD__.getStats();
        return s.suspended && s.boardRenderer.released && s.authoredEnding?.status === 'ready';
      });
      const suspended = await stats();
      assert.equal(suspended.boardRenderer.backingBytes, 4,
        'the hidden 2D bitmap must release its backing store');
      await page.locator('.about-board-scrollport').evaluate(port => { port.scrollTop = 0; });
      await page.waitForFunction(count => {
        const s = window.__ABS_ABOUT_GAME_BOARD__.getStats();
        return !s.suspended && !s.boardRenderer.released && s.boardRenderer.paintCount > count;
      }, suspended.boardRenderer.paintCount);
      const restored = await stats();
      const restoredPixels = await bitmap();
      assert.ok(restored.boardRenderer.backingBytes > 4);
      assert.ok(restoredPixels.nonemptyPixels > 0, 'returning from 3D must repaint the restored bitmap');
      await page.waitForFunction(steps => window.__ABS_ABOUT_GAME_BOARD__.getStats().nativeLifetimeSteps > steps,
        restored.nativeLifetimeSteps);
      await page.screenshot({ path: `${output}/${engine}-${viewport.width}-restored.png` });
      // Exact palette entries take the short path; equivalent CSS aliases must
      // still resolve to the same sprite through the existing parser fallback.
      const slots = await page.evaluate(async () => {
        // Vite may add an HMR revision to the module URL. Reuse the configured
        // live instance, rather than importing an unconfigured second copy.
        const url = performance.getEntriesByType('resource').find(entry =>
          entry.name.includes('/materials/simulation-body-material.js'))?.name;
        if (!url) throw new Error('Live sphere-material module was not loaded');
        const material = await import(url);
        const atlas = material.getSimulationBodyMaterialAtlas(['#cc3322', '#2288cc']);
        return [atlas.getSlot('#cc3322'), atlas.getSlot('rgb(204, 51, 34)'),
          atlas.getSlot('#2288cc'), atlas.getSlot('rgb(34, 136, 204)')];
      });
      assert.deepEqual(slots, [0, 0, 1, 1]);
      await page.setViewportSize({ width: viewport.width === 390 ? 430 : 1280, height: viewport.height });
      await page.waitForFunction(oldWidth => {
        const s = window.__ABS_ABOUT_GAME_BOARD__?.getStats();
        return s?.reservoirReady && s.boardRenderer.paintCount > 0 && !s.boardRenderer.released
          && Math.abs(s.boardRenderer.cssWidth - oldWidth) > 20;
      }, before.boardRenderer.cssWidth);
      const resized = await stats();
      assert.ok(Math.abs(resized.boardRenderer.cssWidth - before.boardRenderer.cssWidth) > 20,
        'resizing must refresh the backing-store geometry');
      assert.deepEqual(errors, []);
      results.push({ engine, viewport, restingPaints: resting.boardRenderer.paintCount - before.boardRenderer.paintCount,
        reusedFrames: resting.boardRenderer.reusedPaintCount - before.boardRenderer.reusedPaintCount,
        resumedPaints: released.boardRenderer.paintCount - scrolled.boardRenderer.paintCount,
        openingPixels, themedPixels, restoredPixels,
        suspendedBackingBytes: suspended.boardRenderer.backingBytes,
        restoredBackingBytes: restored.boardRenderer.backingBytes,
        resizeWidth: resized.boardRenderer.cssWidth, colourAliases: 'passed', errors });
      console.log(`${engine} ${viewport.width}: cache, theme pixels, scroll, release, 3D return and resize passed`);
    } finally {
      await page.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(`${output}/${engine}-report.json`, JSON.stringify(results, null, 2));
}
