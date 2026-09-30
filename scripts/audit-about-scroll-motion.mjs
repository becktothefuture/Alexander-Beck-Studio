import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { MECHANISM } from '../react-app/app/src/routes/about-game-board/boardScene.js';

const origin = process.env.ABS_URL || 'http://localhost:8012';
const browserName = process.env.ABS_BROWSER || 'chromium';
const gpu = process.env.ABS_ABOUT_GPU || 'swiftshader';
const output = process.env.ABS_OUTPUT || 'output/playwright/about-scroll-motion';
await mkdir(output, { recursive: true });
const browser = await (browserName === 'webkit' ? webkit : chromium).launch({
  args: browserName === 'chromium'
    ? [`--use-angle=${gpu}`, '--enable-webgl',
      gpu === 'metal' ? '--enable-gpu' : '--enable-unsafe-swiftshader'] : [],
});
const reports = [];

try {
  for (const [width, height, theme] of [[390, 844, 'light'], [1440, 1000, 'dark']]) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme: theme });
    const report = { browser: browserName, gpu: browserName === 'chromium' ? gpu : 'native',
      width, height, theme, errors: [], valves: [] };
    page.on('pageerror', error => report.errors.push(error.message));
    try {
      await page.goto(`${origin}/about.html`);
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady);
      await page.waitForFunction(() => document.querySelector('[data-route-content="about"]')
        ?.dataset.aboutSceneReady === 'true');
      await page.evaluate(() => document.fonts.ready);
      if (await page.locator('html').getAttribute('data-abs-theme') !== theme) {
        await page.getByRole('button', { name: `Switch to ${theme} mode` }).click();
      }
      const read = () => page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getStats());
      const first = await read();
      assert.ok(Math.abs(first.reservoir.straightHeightPx - height) <= 1);
      assert.equal(first.reservoirSettled, true);

      // Scrub each mechanism forward, stop, reverse, then jump across the band.
      // Use the actual native scroll position, never call its controller directly.
      for (const [name, y, key, angleKey] of [
        ['reservoir valve', 1124, 'gateProgress', 'gateAngle'],
        ['metering valve', MECHANISM.meterGate.pivot[1], 'meterProgress', 'meterAngle'],
      ]) {
        const samples = [];
        report.valves.push({ name, samples });
        for (const progress of [0, 1, 0, .25, .5, 1, .5, .25, 0, 1, 0]) {
          await page.locator('.about-board-scrollport').evaluate((port, target) => {
            const world = port.querySelector('.about-board-world');
            const topY = window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY;
            const mechanism = world.offsetTop + (target.y - topY) * world.clientWidth / 960;
            port.scrollTop = mechanism - port.clientHeight * (.78 - .36 * target.progress);
          }, { y, progress });
          await page.waitForFunction(({ key, progress }) =>
            Math.abs(window.__ABS_ABOUT_GAME_BOARD__.getStats()[key] - progress) < .006,
          { key, progress });
          await page.waitForTimeout(100);
          const before = await read();
          await page.waitForTimeout(180);
          const after = await read();
          assert.ok(Math.abs(before[angleKey] - after[angleKey]) < .002,
            `${name} must hold its pose when scrolling stops`);
          samples.push({ progress: after[key], angle: after[angleKey] });
          const contacts = await page.evaluate(() => {
            const scale = document.querySelector('.about-board-world').clientWidth / 960;
            return window.__ABS_ABOUT_GAME_BOARD__.getContactSnapshot()
              .filter(contact => /reservoir-gate|meter-gate|reservoir-closed-seal/.test(contact.fixture))
              .map(contact => ({ ...contact, depthPx: contact.depth * scale }));
          });
          assert.ok(contacts.every(contact => contact.depthPx < 1.5),
            `scrubbing ${name} must not leave balls inside a valve: ${JSON.stringify(contacts)}`);
          const ballOverlap = await page.evaluate(() => {
            const balls = window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot().filter(ball => !ball.captured);
            const size = Math.max(...balls.map(ball => ball.radius * 2));
            const cells = new Map();
            let deepest = { depth: 0, pair: [] };
            for (const ball of balls) {
              const x = Math.floor(ball.x / size), y = Math.floor(ball.y / size);
              for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
                for (const other of cells.get(`${x + dx}:${y + dy}`) || []) {
                  const depth = ball.radius + other.radius - Math.hypot(ball.x - other.x, ball.y - other.y);
                  if (depth > deepest.depth) deepest = { depth, pair: [ball.id, other.id] };
                }
              }
              const key = `${x}:${y}`;
              if (!cells.has(key)) cells.set(key, []);
              cells.get(key).push(ball);
            }
            return { ...deepest, depthPx: deepest.depth
              * document.querySelector('.about-board-world').clientWidth / 960 };
          });
          samples.at(-1).ballOverlap = ballOverlap;
          assert.ok(ballOverlap.depthPx < 1.5,
            `${name} must not push neighbouring balls into each other: ${JSON.stringify(ballOverlap)}`);
          const escaped = await page.evaluate(() => {
            const api = window.__ABS_ABOUT_GAME_BOARD__;
            const top = api.getStats().reservoir.topY;
            return api.getMotionSnapshot().filter(ball => ball.id.startsWith('pit-')
              && ball.y < 9800 && (ball.x < -16 || ball.x > 976 || ball.y < top - 16));
          });
          assert.equal(escaped.length, 0,
            `${name}: a fast scroll must not catapult the pile out of the page`);
        }
        assert.ok(Math.abs(samples[3].angle - samples[7].angle) < .015);
        assert.ok(Math.abs(samples[4].angle - samples[6].angle) < .015);
        assert.ok(Math.abs(samples[0].angle) < .01 && Math.abs(samples.at(-1).angle) < .01);
        await page.screenshot({ path: `${output}/${browserName}-${width}-${key}-closed.png` });
      }
      // Rotors are intentionally automatic even when the visitor holds scroll.
      await page.locator('.about-board-scrollport').evaluate(port => {
        const world = port.querySelector('.about-board-world');
        const topY = window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY;
        port.scrollTop = world.offsetTop + (6760 - topY) * world.clientWidth / 960 - port.clientHeight / 2;
      });
      await page.waitForTimeout(150);
      const rotor = page.locator('#runtime-large-drum-carrier');
      const before = await rotor.getAttribute('transform');
      await page.waitForTimeout(500);
      const after = await rotor.getAttribute('transform');
      assert.notEqual(before, after, 'the rotary drum must animate while scrolling is stopped');
      report.automaticDrum = true;
      const cameraSamples = [];
      const scrollToStageProgress = progress => page.locator('.about-board-scrollport').evaluate((port, progress) => {
        const stage = port.querySelector('.about-board-three-stage');
        const top = stage.getBoundingClientRect().top - port.getBoundingClientRect().top + port.scrollTop;
        port.scrollTop = top + progress * (stage.offsetHeight - port.clientHeight);
      }, progress);
      for (const progress of [.68, .82, .68]) {
        await scrollToStageProgress(progress);
        await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__.getStats()
          .authoredEnding?.status === 'ready', null, { timeout: 25000 });
        // Loading the authored rail can expand its stage. Sample the final
        // native scroll range so the first and return positions are identical.
        await scrollToStageProgress(progress);
        await page.waitForTimeout(400);
        const start = (await read()).authoredEnding.camera;
        await page.waitForTimeout(250);
        const held = (await read()).authoredEnding.camera;
        assert.deepEqual(held.position, start.position, 'the stopped 3D camera must not coast');
        assert.deepEqual(held.quaternion, start.quaternion, 'the stopped 3D camera must not lean over time');
        cameraSamples.push(held);
      }
      assert.deepEqual(cameraSamples[0].position, cameraSamples[2].position,
        'reverse scroll must return to the same authored 3D position');
      assert.deepEqual(cameraSamples[0].quaternion, cameraSamples[2].quaternion,
        'reverse scroll must preserve authored camera orientation');
      report.cameraRetraces = true;
      assert.deepEqual(report.errors, []);
      report.passed = true;
      console.log(`PASS ${browserName} ${width}×${height}: reversible valves and 3D camera; stable holds; automatic drum`);
    } catch (error) {
      report.passed = false;
      report.failure = error.message;
      report.failureState = await page.evaluate(() => {
        const api = window.__ABS_ABOUT_GAME_BOARD__;
        const stats = api?.getStats();
        return { stats, escaped: api?.getMotionSnapshot().filter(ball => ball.id.startsWith('pit-')
          && (ball.x < -16 || ball.x > 976 || ball.y < stats.reservoir.topY - 16)).slice(0, 10) };
      }).catch(() => null);
      process.exitCode = 1;
      await page.screenshot({ path: `${output}/${browserName}-${width}-failure.png` });
      console.error(`FAIL ${browserName} ${width}: ${error.message}`);
    } finally {
      reports.push(report);
      await page.close();
    }
  }
} finally {
  await browser.close();
  await writeFile(`${output}/${browserName}-report.json`, JSON.stringify(reports, null, 2));
}
