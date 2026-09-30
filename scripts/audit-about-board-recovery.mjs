import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

// Deliberate failures must preserve the visitor's route to the contact actions.
const origin = process.env.ABS_URL || 'http://localhost:8012';
const output = process.env.ABS_OUTPUT || 'output/playwright/about-board-sweep';
const gpu = process.env.ABS_ABOUT_GPU || 'swiftshader';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ args: [
  `--use-angle=${gpu}`, '--enable-webgl',
  ...(gpu === 'metal' ? ['--enable-gpu'] : ['--enable-unsafe-swiftshader']),
] });
const reports = [];
try {
  for (const fault of ['missing-asset', 'no-webgl', 'context-recovery'].filter(name =>
    !process.env.ABS_RECOVERY_CASES || process.env.ABS_RECOVERY_CASES.split(',').includes(name))) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    const page = await context.newPage();
    if (fault === 'missing-asset') {
      await page.route('**/models/about-rollercoaster-world/**', route => route.abort());
    } else if (fault === 'no-webgl') {
      await page.addInitScript(() => {
        const getContext = HTMLCanvasElement.prototype.getContext;
        HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
          return kind.includes('webgl') ? null : getContext.call(this, kind, ...args);
        };
      });
    }
    try {
      await page.goto(`${origin}/about.html`);
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().moving > 0);
      // Establish real falling motion before suspension. A closed finite
      // reservoir is correctly at rest and need not advance on return.
      await page.locator('.about-board-scrollport').evaluate(port => {
        const world = port.querySelector('.about-board-world');
        const originY = window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY;
        port.scrollTop = world.offsetTop + (1124 - originY) * world.clientWidth / 960 - port.clientHeight * .4;
      });
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot()
        .some(ball => ball.y > 1200));
      await page.locator('.about-board-scrollport').evaluate(port => { port.scrollTop = port.scrollHeight; });
      if (fault === 'context-recovery') {
        await page.waitForFunction(() => document.querySelector('.about-board-three-canvas--authored')
          ?.dataset.authoredEndingReady === 'true', null, { timeout: 20000 });
        const stageHeight = await page.locator('.about-board-three-stage').evaluate(stage => stage.offsetHeight);
        await page.evaluate(() => {
          const canvas = document.querySelector('.about-board-three-canvas--authored');
          window.aboutRecoveryExtension = canvas.getContext('webgl2').getExtension('WEBGL_lose_context');
          window.aboutRecoveryExtension.loseContext();
        });
        await page.waitForFunction(() => document.querySelector('.about-board-three-canvas--authored')
          .dataset.authoredEndingReady === 'false');
        assert.equal(await page.locator('.about-board-three-stage').evaluate(stage => stage.offsetHeight), stageHeight);
        await page.waitForTimeout(300);
        await page.evaluate(() => window.aboutRecoveryExtension.restoreContext());
        await page.waitForFunction(() => document.querySelector('.about-board-three-canvas--authored')
          .dataset.authoredEndingReady === 'true');
        assert.equal(await page.locator('.about-board-three-stage').evaluate(stage => stage.offsetHeight), stageHeight);
      } else {
        await page.waitForFunction(() => document.querySelector('.about-board-three-stage')
          ?.dataset.authoredEndingFailed === 'true');
      }
      // Failed assets retain stable scroll geometry and accessible contact actions.
      await page.locator('.about-board-scrollport').evaluate(port => { port.scrollTop = port.scrollHeight; });
      await page.waitForFunction(() => !document.querySelector('.about-board-ending').inert);
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${output}/${fault}.png` });
      await page.locator('.about-board-scrollport').evaluate(port => { port.scrollTop = 0; });
      const before = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getStats().elapsedMs);
      await page.waitForTimeout(1000);
      const after = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getStats().elapsedMs);
      assert.ok(after > before, 'the 2D machine must resume after a graphics failure');
      reports.push({ fault, passed: true, contactReachable: true, resumed: true });
      console.log(`PASS ${fault}: contact reachable; 2D motion resumes`);
    } catch (error) {
      reports.push({ fault, passed: false, error: error.message });
      await page.screenshot({ path: `${output}/${fault}-failure.png` });
      console.error(`FAIL ${fault}: ${error.message}`);
      process.exitCode = 1;
    } finally {
      await context.close();
    }
  }
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  const errorDetails = [];
  page.on('pageerror', error => {
    errors.push(error.message);
    errorDetails.push(error.stack);
    console.error(error.stack);
  });
  try {
    await page.goto(`${origin}/about.html`);
    for (const [width, height, radius] of [[390, 844, 7.832], [844, 390, 7.832],
      [1440, 1000, 9.79], [390, 844, 7.832]]) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(expected => {
        const stats = window.__ABS_ABOUT_GAME_BOARD__?.getStats();
        const world = document.querySelector('.about-board-world');
        return stats && Math.abs(stats.ballRadius * world.clientWidth / 960 - expected) < .05;
      }, radius);
      await page.waitForTimeout(700);
      assert.deepEqual(await page.evaluate(() =>
        window.__ABS_ABOUT_GAME_BOARD__.getStats().textArchitectureOverlaps), []);
    }
    for (const route of ['contact', 'portfolio', 'home', 'about']) {
      await page.locator(`[data-route-tab="${route}"]`).click();
      await page.waitForFunction(expected => document.querySelector('[data-route-tabs]')
        ?.dataset.activeRoute === expected, route);
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${output}/navigation-${route}.png` });
    }
    await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().moving > 0);
    assert.deepEqual(errors, []);
    reports.push({ fault: 'resize-navigation', passed: true, widths: [390, 844, 1440, 390],
      routes: ['contact', 'portfolio', 'home', 'about'] });
    console.log('PASS resize-navigation: shared radius and text clearances survive rotation and route changes');
  } catch (error) {
    reports.push({ fault: 'resize-navigation', passed: false, error: error.message, errorDetails });
    console.error(`FAIL resize-navigation: ${error.message}`);
    process.exitCode = 1;
  } finally {
    await context.close();
  }
} finally {
  await browser.close();
  await writeFile(`${output}/recovery-report.json`, JSON.stringify(reports, null, 2));
}
