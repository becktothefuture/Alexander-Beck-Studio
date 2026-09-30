import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const origin = process.env.ABS_URL || 'http://localhost:8012';
const engine = process.env.ABS_BROWSER || 'chromium';
const output = process.env.ABS_OUTPUT || 'output/playwright/about-performance-20260925/lifecycle';
await mkdir(output, { recursive: true });
const browser = await (engine === 'webkit' ? webkit : chromium).launch({
  args: engine === 'chromium' ? ['--use-angle=metal', '--enable-gpu'] : [],
});
const reports = [];
function assertConserved(snapshot, expectedIds) {
  const identities = ['liveIds', 'capturingIds', 'capturedIds', 'retiredIds']
    .flatMap(key => snapshot[key]);
  assert.equal(new Set(identities).size, identities.length, 'every identity must have exactly one owner');
  assert.deepEqual([...identities].sort(), [...expectedIds].sort(), 'the complete initial population must be conserved');
  assert.ok(identities.every(id => id.startsWith('pit-')), 'no downstream or feeder identities may appear');
}
try {
  for (const [width, height] of [[1440, 1000], [390, 844]]) {
    const page = await browser.newPage({ viewport: { width, height },
      deviceScaleFactor: width < 600 ? 3 : 1 });
    const report = { engine, width, height, errors: [], returns: [] };
    page.on('pageerror', error => report.errors.push(error.message));
    try {
      await page.goto(`${origin}/about.html`);
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady);
      const read = () => page.evaluate(() => ({
        stats: window.__ABS_ABOUT_GAME_BOARD__.getStats(),
        inventory: window.__ABS_ABOUT_GAME_BOARD__.getInventorySnapshot(),
      }));
      const first = await read();
      const ids = first.inventory.initialIds;
      assertConserved(first.inventory, ids);
      assert.equal(first.stats.nativeWorldCount, 1);
      await page.waitForTimeout(800);
      const held = await read();
      assert.equal(held.stats.nativeLifetimeSteps, first.stats.nativeLifetimeSteps,
        'a closed supported reservoir must not run needless native steps');
      const setBoardY = y => page.locator('.about-board-scrollport').evaluate((port, y) => {
        const world = port.querySelector('.about-board-world');
        const topY = window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY;
        port.scrollTop = world.offsetTop + (y - topY) * world.clientWidth / 960 - port.clientHeight * .4;
      }, y);
      const set3d = p => page.locator('.about-board-scrollport').evaluate((port, progress) => {
        const stage = port.querySelector('.about-board-three-stage');
        const top = stage.getBoundingClientRect().top - port.getBoundingClientRect().top + port.scrollTop;
        port.scrollTop = top + progress * (stage.offsetHeight - port.clientHeight);
      }, p);
      const setSeamOffset = viewports => page.locator('.about-board-scrollport').evaluate((port, offset) => {
        const stage = port.querySelector('.about-board-three-stage');
        const top = stage.getBoundingClientRect().top - port.getBoundingClientRect().top + port.scrollTop;
        port.scrollTop = top + port.clientHeight * offset;
      }, viewports);
      await setBoardY(1124);
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot()
        .some(body => body.y > 1230), null, { timeout: 15000 });
      for (let turn = 0; turn < 3; turn++) {
        await set3d(.72);
        await page.waitForFunction(() => {
          const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
          return stats.suspended && stats.authoredEnding?.status === 'ready';
        }, null, { timeout: 30000 });
        const suspended = await read();
        assert.equal(suspended.stats.nativeWorldCount, 0);
        assert.equal(suspended.stats.nativeRecordCount, 0);
        assert.equal(suspended.stats.boardRenderer.backingBytes, 4);
        assertConserved(suspended.inventory, ids);
        await page.waitForTimeout(650);
        const quiet = await read();
        assert.equal(quiet.stats.nativeLifetimeSteps, suspended.stats.nativeLifetimeSteps);
        assert.equal(quiet.stats.elapsedMs, suspended.stats.elapsedMs);
        assert.equal(quiet.stats.lifecycle.activeWebglContexts, 1);
        assert.equal(quiet.stats.lifecycle.activeFallbacks, 0);
        // Palette changes must not resurrect the inactive Canvas backing store.
        if (turn === 0) {
          const theme = await page.locator('html').getAttribute('data-abs-theme');
          await page.getByRole('button', { name: `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode` }).click();
          await page.waitForTimeout(250);
          assert.equal((await read()).stats.boardRenderer.backingBytes, 4);
        }
        const started = Date.now();
        // Return well beyond the 3D release margin at both responsive scales.
        // A fixed board coordinate can still be only two viewports from the
        // seam on a phone, where retaining a prewarmed scene is intentional.
        await page.locator('.about-board-scrollport').evaluate(port => { port.scrollTop = 0; });
        await page.waitForFunction(() => {
          const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
          return !stats.suspended && stats.nativeWorldCount === 1 && stats.authoredEnding === null;
        }, null, { timeout: 10000 });
        const restored = await read();
        assertConserved(restored.inventory, ids);
        assert.equal(restored.stats.lifecycle.activeWebglContexts, 0);
        assert.equal(restored.stats.lifecycle.activeFallbacks, 0);
        report.returns.push({ turn, wallMs: Date.now() - started,
          suspended: suspended.stats.lifecycle, restored: restored.stats.lifecycle,
          checkpointBytes: suspended.stats.checkpointBytes,
          retainedProxyCount: suspended.stats.retainedProxyCount,
          lastResumeMs: restored.stats.lastResumeMs,
          nativeLifetimeSteps: restored.stats.nativeLifetimeSteps });
      }
      // Reverse gradually: rebuild before exposure, then retain that world
      // while scrubbing across the seam without simulating behind opaque 3D.
      await set3d(.72);
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__.getStats().suspended);
      const deep = await read();
      await setSeamOffset(.9);
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__.getStats().lifecycle.machinePrewarmed);
      const prewarmed = await read();
      assert.equal(prewarmed.stats.nativeWorldCount, 1);
      assert.equal(prewarmed.stats.boardRenderer.backingBytes, 4);
      await page.waitForTimeout(350);
      const waiting = await read();
      assert.equal(waiting.stats.nativeLifetimeSteps, prewarmed.stats.nativeLifetimeSteps);
      assert.equal(waiting.stats.elapsedMs, prewarmed.stats.elapsedMs);
      for (const offset of [.1, -.1, .1, 1.2]) {
        await setSeamOffset(offset);
        await page.waitForTimeout(100);
      }
      const scrubbed = await read();
      assert.equal(scrubbed.stats.lifecycle.physicsResumes, deep.stats.lifecycle.physicsResumes + 1);
      assert.equal(scrubbed.stats.lifecycle.physicsSuspends, deep.stats.lifecycle.physicsSuspends);
      assertConserved(scrubbed.inventory, ids);
      await setSeamOffset(1.6);
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__.getStats().suspended);
      assert.equal((await read()).stats.lifecycle.physicsSuspends, deep.stats.lifecycle.physicsSuspends + 1);
      report.prewarm = { passed: true, lastResumeMs: prewarmed.stats.lastResumeMs,
        hiddenSteps: waiting.stats.nativeLifetimeSteps - prewarmed.stats.nativeLifetimeSteps,
        repeatedRestores: scrubbed.stats.lifecycle.physicsResumes - prewarmed.stats.lifecycle.physicsResumes };
      report.inventoryTotal = ids.length;
      report.final = await read();
      assert.deepEqual(report.errors, []);
      report.passed = true;
      await page.screenshot({ path: `${output}/${engine}-${width}-restored.png` });
      console.log(`PASS ${engine} ${width}: conserved ${ids.length} identities; three solver/3D lifecycles`);
    } catch (error) {
      report.failure = error.stack; report.passed = false; process.exitCode = 1;
      report.failureStats = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats()).catch(() => null);
      console.error(`FAIL ${engine} ${width}: ${error.message}`);
    } finally {
      reports.push(report);
      await page.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(`${output}/${engine}-report.json`, JSON.stringify(reports, null, 2));
}
