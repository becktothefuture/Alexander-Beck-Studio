import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

// Measure the actual rendered hinge, so changes to prose or module placement
// cannot quietly move the scroll trigger away from the gate again.
const engine = process.env.ABS_BROWSER || 'chromium';
const output = 'output/playwright/about-assembly-gate';
await mkdir(output, { recursive: true });
const browser = await ({ chromium, webkit })[engine].launch({
  ...(engine === 'chromium' ? { args: ['--use-angle=metal', '--enable-gpu'] } : {}),
});
const reports = [];
try {
  for (const [width, height, theme] of [[1440, 1000, 'light'], [390, 844, 'light'],
    [1440, 1000, 'dark'], [390, 844, 'dark']]) {
    const page = await browser.newPage({ viewport: { width, height }, colorScheme: theme,
      deviceScaleFactor: 1, hasTouch: width < 600, isMobile: width < 600 });
    const report = { width, height, theme, states: [], errors: [] };
    reports.push(report);
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(`${process.env.ABS_BASE_URL || 'http://localhost:8012'}/about.html`);
    await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady,
      null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    for (const [label, ratio, expected] of [['before', .9, 0], ['half', .6, .5],
      ['open', .3, 1], ['reverse-half', .6, .5], ['closed', .9, 0]]) {
      await page.evaluate(ratio => {
        const port = document.querySelector('.about-board-scrollport');
        const arm = document.querySelector('#Vector_170');
        const hinge = arm.getPointAtLength(0).matrixTransform(arm.getScreenCTM());
        port.scrollTop += hinge.y - port.getBoundingClientRect().top - port.clientHeight * ratio;
      }, ratio);
      await page.waitForFunction(expected => {
        const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
        return Math.abs(stats.meterProgress - expected) < .005;
      }, expected);
      // A held scroll position must hold both the drawn arm and its collider.
      await page.waitForTimeout(350);
      const state = await page.evaluate(() => {
        const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
        const arm = document.querySelector('#Vector_170');
        const start = arm.getPointAtLength(0).matrixTransform(arm.getScreenCTM());
        const end = arm.getPointAtLength(arm.getTotalLength()).matrixTransform(arm.getScreenCTM());
        return { progress: stats.meterProgress, angle: stats.meterAngle,
          visualAngle: Math.atan2(end.y - start.y, end.x - start.x),
          inventoryConserved: stats.inventory.conserved };
      });
      assert.ok(Math.abs(state.progress - expected) < .005, `${label}: scroll pose drifted`);
      assert.equal(state.inventoryConserved, true);
      if (expected === 0) {
        assert.ok(Math.abs(state.angle) < .001, 'closed collision body');
        assert.ok(state.visualAngle < 0, 'closed arm must span the outlet');
      }
      if (expected === 1) assert.ok(Math.abs(state.visualAngle - Math.PI / 2) < .01);
      report.states.push({ label, ...state });
      if (label === 'before' || label === 'open') {
        await page.screenshot({ path: `${output}/${engine}-${width}-${theme}-${label}.png` });
      }
    }
    assert.ok(Math.abs(report.states[1].angle - report.states[3].angle) < .002,
      'reverse scroll must retrace the same physical pose');
    assert.deepEqual(report.errors, []);
    await page.close();
  }
} finally {
  await writeFile(`${output}/${engine}-report.json`, JSON.stringify(reports, null, 2));
  await browser.close();
}
console.log(`${engine}: assembly gate closed/open/reverse passed on desktop/mobile in both themes`);
