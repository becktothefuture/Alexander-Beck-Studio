import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const origin = process.env.ABS_URL || 'http://localhost:8012';
const engine = process.env.ABS_BROWSER || 'chromium';
const gpu = process.env.ABS_ABOUT_GPU || 'swiftshader';
const output = process.env.ABS_OUTPUT || 'output/playwright/about-reservoir-rest';
const resolverRules = process.env.ABS_HOST_RESOLVER_RULES;
await mkdir(output, { recursive: true });
const browser = await (engine === 'webkit' ? webkit : chromium).launch({
  args: engine === 'chromium' ? [`--use-angle=${gpu}`, '--enable-webgl',
    gpu === 'metal' ? '--enable-gpu' : '--enable-unsafe-swiftshader',
    ...(resolverRules ? [`--host-resolver-rules=${resolverRules}`] : [])] : [],
});
const reports = [];
const cases = [[390, 844, 'light'], [1440, 1000, 'light'],
  [390, 844, 'dark'], [320, 740, 'light']]
  .filter((_, index) => !process.env.ABS_CASES
    || process.env.ABS_CASES.split(',').includes(String(index + 1)));

try {
  for (const [width, height, theme] of cases) {
    const id = `${engine}-${width}-${theme}`;
    const context = await browser.newContext({ viewport: { width, height },
      colorScheme: theme, isMobile: width < 600, hasTouch: width < 600,
      deviceScaleFactor: width < 600 ? 3 : 1 });
    const page = await context.newPage();
    const report = { id, gpu: engine === 'chromium' ? gpu : 'native', errors: [],
      dnsOverride: engine === 'chromium' && Boolean(resolverRules) };
    page.on('pageerror', error => report.errors.push(error.message));
    try {
      await page.goto(`${origin}/about.html`);
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady);
      await page.waitForFunction(() => {
        const overlay = document.querySelector('#abs-boot-overlay');
        return !overlay || getComputedStyle(overlay).display === 'none'
          || getComputedStyle(overlay).visibility === 'hidden'
          || Number(getComputedStyle(overlay).opacity) < .01;
      });
      await page.evaluate(() => document.fonts.ready);
      const first = await page.evaluate(() => ({
        stats: window.__ABS_ABOUT_GAME_BOARD__.getStats(),
        balls: window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot().filter(b => b.id.startsWith('pit-')),
      }));
      assert.equal(first.stats.reservoirSettled, true, 'the opening must converge, not time out');
      assert.ok(first.balls.length > 100 && first.balls.every(ball => ball.sleeping));
      assert.equal(first.stats.reservoirSealed, true);
      assert.equal(first.stats.fed, 0, 'no feeder may disturb the closed pile');
      await page.screenshot({ path: `${output}/${id}-opening.png` });
      // Reveal the complete funnel but leave the valve below its activation band.
      await page.locator('.about-board-scrollport').evaluate(port => {
        const world = port.querySelector('.about-board-world');
        const origin = window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY;
        port.scrollTop = world.offsetTop + (1124 - origin) * world.clientWidth / 960 - port.clientHeight * .8;
      });
      await page.waitForTimeout(2200);
      const resting = await page.evaluate(() => ({
        stats: window.__ABS_ABOUT_GAME_BOARD__.getStats(),
        support: window.__ABS_ABOUT_GAME_BOARD__.getSupportSnapshot(),
        balls: window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot().filter(b => b.id.startsWith('pit-')),
      }));
      report.maximumRestMovement = Math.max(...resting.balls.map(ball => {
        const before = first.balls.find(item => item.id === ball.id);
        return Math.hypot(ball.x - before.x, ball.y - before.y);
      }));
      assert.equal(resting.stats.reservoirSealed, true);
      assert.ok(report.maximumRestMovement < .01, 'the closed pile must stay still');
      assert.equal(resting.support.unsupportedSleeping, 0);
      await page.screenshot({ path: `${output}/${id}-closed.png` });
      await page.locator('.about-board-scrollport').evaluate(port => {
        const world = port.querySelector('.about-board-world');
        const origin = window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY;
        port.scrollTop = world.offsetTop + (1124 - origin) * world.clientWidth / 960 - port.clientHeight * .4;
      });
      await page.waitForFunction(() => !window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoirSealed);
      const releaseWallStart = Date.now();
      const releaseStart = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getStats().elapsedMs);
      await page.waitForFunction(start => window.__ABS_ABOUT_GAME_BOARD__.getStats().elapsedMs
        >= start + 5000, releaseStart, { timeout: 20000 });
      const released = await page.evaluate(() => ({
        stats: window.__ABS_ABOUT_GAME_BOARD__.getStats(),
        support: window.__ABS_ABOUT_GAME_BOARD__.getSupportSnapshot(),
        balls: window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot().filter(b => b.id.startsWith('pit-')),
      }));
      report.initialCount = first.balls.length;
      report.preparationSteps = first.stats.reservoirPreparationSteps;
      report.released = released.balls.filter(ball => ball.y > 1140).length;
      report.releaseSimulatedMs = released.stats.elapsedMs - releaseStart;
      report.releaseWallMs = Date.now() - releaseWallStart;
      report.releasePhysics = released.stats.rigidBody;
      report.unsupportedSleeping = released.support.unsupportedSleeping;
      assert.ok(report.released >= Math.min(80, first.balls.length * .05),
        'the full reservoir must produce a sustained stream through its real outlet');
      assert.equal(report.unsupportedSleeping, 0);
      await page.screenshot({ path: `${output}/${id}-released.png` });
      // A viewport-full reservoir contains thousands of bodies. Emptying half
      // of it in five seconds is not a physical requirement. Observe a second
      // equal interval to detect an inlet arch or a frozen airborne island.
      await page.waitForFunction(start => window.__ABS_ABOUT_GAME_BOARD__.getStats().elapsedMs
        >= start + 10000, releaseStart, { timeout: 40000 });
      const later = await page.evaluate(() => ({
        balls: window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot(),
        support: window.__ABS_ABOUT_GAME_BOARD__.getSupportSnapshot(),
      }));
      report.releasedAfterTenSeconds = first.balls.length - later.balls
        .filter(ball => ball.id.startsWith('pit-') && ball.y <= 1140).length;
      assert.ok(report.releasedAfterTenSeconds >= report.released + 25,
        'the stream must continue after the first release interval');
      assert.equal(later.support.unsupportedSleeping, 0);
      assert.deepEqual(report.errors, []);
      report.passed = true;
      console.log(`PASS ${id}: ${report.initialCount} settled; drift ${report.maximumRestMovement}; ${report.released} released`);
    } catch (error) {
      report.passed = false;
      report.failure = error.message;
      // Keep the actual solver state when a timeout occurs. A stalled scroll
      // event, a slow world and a blocked outlet need different corrections.
      report.failureState = await page.evaluate(() => {
        const api = window.__ABS_ABOUT_GAME_BOARD__;
        if (!api) return null;
        return { stats: api.getStats(), contacts: api.getContactSnapshot().slice(0, 5) };
      }).catch(() => null);
      process.exitCode = 1;
      await page.screenshot({ path: `${output}/${id}-failure.png` });
      console.error(`FAIL ${id}: ${error.message}`);
    } finally {
      reports.push(report);
      await context.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(`${output}/${engine}-rest-report.json`, JSON.stringify(reports, null, 2));
}
