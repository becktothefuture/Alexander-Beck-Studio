import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

const engine = process.env.ABS_BROWSER || 'chromium';
const output = 'output/playwright/about-grid-capture';
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
    const report = { width, height, theme, errors: [] };
    reports.push(report);
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(`${process.env.ABS_BASE_URL || 'http://localhost:8012'}/about.html`);
    await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady,
      null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    const scrollToSeam = fraction => page.evaluate(fraction => {
      const port = document.querySelector('.about-board-scrollport');
      const stage = document.querySelector('.about-board-three-stage');
      port.scrollTop += stage.getBoundingClientRect().top - port.getBoundingClientRect().top
        - port.clientHeight * fraction;
    }, fraction);
    const inspect = () => page.evaluate(() => {
      const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
      const stage = document.querySelector('.about-board-three-stage');
      const viewport = stage.querySelector('.about-board-three-viewport');
      return { spatialCover: stage.dataset.spatialCover, visibility: getComputedStyle(viewport).visibility,
        background: getComputedStyle(stage).backgroundColor, boardVisible: stats.boardVisible,
        occupied: stats.gridOccupied, capturing: stats.inventory.capturing,
        suspended: stats.lifecycle.machineSuspended, conserved: stats.inventory.conserved };
    });
    await scrollToSeam(.45);
    await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__.getStats().lifecycle.authoredReady);
    report.arrivals = await inspect();
    assert.equal(report.arrivals.visibility, 'hidden', 'opaque spatial layer must not mask live arrivals');
    assert.equal(report.arrivals.background, 'rgba(0, 0, 0, 0)');
    assert.equal(report.arrivals.boardVisible, true);
    assert.equal(report.arrivals.suspended, false);
    await page.screenshot({ path: `${output}/${engine}-${width}-${theme}-sockets.png` });
    if (process.env.ABS_CAPTURE_FLOW === '1' && width === 1440 && theme === 'light') {
      await page.waitForFunction(() => {
        const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
        return stats.inventory.capturing > 0 && stats.gridOccupied > 1;
      }, null, { timeout: 180000 });
      report.flow = [];
      for (let frame = 0; frame < 4; frame += 1) {
        const sample = await page.evaluate(() => ({
          occupied: window.__ABS_ABOUT_GAME_BOARD__.getStats().gridOccupied,
          balls: window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot().filter(ball => ball.captured),
          visibility: getComputedStyle(document.querySelector('.about-board-three-viewport')).visibility,
        }));
        assert.equal(sample.visibility, 'hidden');
        report.flow.push(sample);
        await page.screenshot({ path: `${output}/${engine}-arrivals-${frame}.png` });
        await page.waitForTimeout(180);
      }
      assert.ok(report.flow.some(sample => sample.balls.length > 0));
      const first = report.flow[0].balls[0];
      assert.ok(report.flow.slice(1).some(sample => {
        const ball = sample.balls.find(ball => ball.id === first.id);
        return !ball || Math.hypot(ball.x - first.x, ball.y - first.y) > .1;
      }), 'an arriving ball must visibly travel instead of staying fixed');
    }
    await scrollToSeam(-.05);
    await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__.getStats().lifecycle.machineSuspended);
    report.spatial = await inspect();
    assert.equal(report.spatial.visibility, 'visible');
    assert.equal(report.spatial.boardVisible, false);
    assert.equal(report.spatial.conserved, true);
    await scrollToSeam(.45);
    await page.waitForFunction(() => !window.__ABS_ABOUT_GAME_BOARD__.getStats().lifecycle.machineSuspended);
    report.returned = await inspect();
    assert.equal(report.returned.visibility, 'hidden');
    assert.equal(report.returned.boardVisible, true);
    assert.equal(report.returned.conserved, true);
    assert.deepEqual(report.errors, []);
    await page.close();
  }
} finally {
  await writeFile(`${output}/${engine}-report.json`, JSON.stringify(reports, null, 2));
  await browser.close();
}
console.log(`${engine}: visible 2D capture layer and reversible spatial handoff passed on desktop/mobile, light/dark`);
