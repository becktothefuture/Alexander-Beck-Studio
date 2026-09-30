import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';

// This audit deliberately observes real frame-to-frame movement, not merely a
// loaded Canvas or a successful build. Use the normal local development page for diagnostics.
const origin = process.env.ABS_URL || 'http://localhost:8012';
const engine = process.env.ABS_BROWSER || 'chromium';
const gpu = process.env.ABS_ABOUT_GPU || 'swiftshader';
const output = process.env.ABS_OUTPUT || 'output/playwright/about-board-sweep';
await mkdir(output, { recursive: true });
const browser = await (engine === 'webkit' ? webkit : chromium).launch({
  headless: true,
  args: engine === 'chromium'
    ? [`--use-angle=${gpu}`, '--enable-webgl',
      ...(gpu === 'metal' ? ['--enable-gpu']
        : ['--enable-unsafe-swiftshader', '--disable-gpu-rasterization'])] : [],
});
const cases = [
  [390, 844, 'light'], [390, 844, 'dark'], [1440, 1000, 'light'], [1440, 1000, 'dark'],
  [320, 740, 'light'], [768, 1024, 'light'], [844, 390, 'light'], [390, 844, 'light', 'reduce'],
].filter((_, index) => !process.env.ABS_CASES
  || process.env.ABS_CASES.split(',').includes(String(index + 1)));
const reports = [];
let failed = false;

function movedCount(before, after) {
  const previous = new Map(before.map(ball => [ball.id, ball]));
  return after.filter(ball => {
    const old = previous.get(ball.id);
    return old && Math.hypot(ball.x - old.x, ball.y - old.y) > 1;
  }).length;
}

async function ready(page) {
  await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady);
  await page.waitForFunction(() => {
    const overlay = document.querySelector('#abs-boot-overlay');
    return !overlay || getComputedStyle(overlay).visibility === 'hidden'
      || getComputedStyle(overlay).display === 'none' || Number(getComputedStyle(overlay).opacity) < .01;
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
}

for (const [width, height, theme, reducedMotion = 'no-preference'] of cases) {
  const id = `${engine}-${width}x${height}-${theme}-${reducedMotion}`;
  const context = await browser.newContext({ viewport: { width, height }, colorScheme: theme, reducedMotion });
  // Home can randomly select a particle renderer with no Matter-style balls.
  // Use its canonical pit mode for a repeatable on-screen size comparison.
  await context.addInitScript(() => { window.__ABS_ROUTE_PERF_AUDIT__ = true; });
  const page = await context.newPage();
  const report = { id, gpu: engine === 'chromium' ? gpu : 'native', sections: [], errors: [] };
  page.on('pageerror', error => report.errors.push(error.message));
  try {
    await page.goto(`${origin}/index.html?mode=pit&absAudit=1`);
    if (width > height && height < 700) {
      // The shared Home shell deliberately gates short landscape windows.
      // Its inert navigation is expected behaviour, not an About load error.
      await page.getByRole('heading', { name: 'Bit of a Squeeze.' }).waitFor();
      assert.equal(await page.locator('#root').getAttribute('inert'), '');
      report.viewportGuard = 'verified';
      await page.screenshot({ path: `${output}/${id}-viewport-guard.png` });
      console.log(`PASS ${id}: shared short-viewport cover and inert navigation`);
      continue;
    }
    await page.waitForTimeout(2500);
    // Read the mounted runtime. Importing state.js here can create a second
    // empty module beside Vite's timestamped HMR module on a warm browser.
    const homeRadius = await page.waitForFunction(() =>
      window.__ABS_HOME_AUDIT__?.getGlobals().balls?.[0]?.r);
    report.homeRadius = await homeRadius.jsonValue();
    await page.waitForFunction(() => {
      const root = document.documentElement;
      const overlay = document.querySelector('#abs-boot-overlay');
      return root.dataset.absHomeRouteReady === 'true'
        && (root.dataset.absTransitionPhase || 'idle') === 'idle'
        && !root.dataset.absInstrumentWake
        && root.dataset.absBootState !== 'booting'
        && (!overlay || getComputedStyle(overlay).display === 'none'
          || getComputedStyle(overlay).visibility === 'hidden'
          || Number(getComputedStyle(overlay).opacity) < .01);
    });
    // Use the Button Bar: a direct URL cannot catch a broken route-ready handoff.
    await page.getByRole('link', { name: 'About', exact: true }).click();
    await page.waitForURL('**/about.html');
    await ready(page);
    report.homeToAboutNavigation = true;
    assert.equal(await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getStats().gridHandoff), null,
      'the opening must not allocate the distant 3D renderer during navigation');
    if (await page.locator('html').getAttribute('data-abs-theme') !== theme) {
      await page.getByRole('button', { name: `Switch to ${theme} mode` }).click();
    }
    await page.screenshot({ path: `${output}/${id}-opening.png` });
    assert.equal(await page.locator('.about-board-drum').count(), 2,
      'rendered machine must retain both live drum replacements');
    const before = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot()
      .filter(ball => ball.id.startsWith('pit-')));
    await page.waitForTimeout(1500);
    const after = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot()
      .filter(ball => ball.id.startsWith('pit-')));
    report.closedPileMovement = movedCount(before, after);
    assert.equal(report.closedPileMovement, 0, 'the filled, closed funnel must rest without jiggling');
    assert.ok(after.length > 100 && after.every(ball => ball.sleeping),
      'first paint must contain a settled physical pile, not floating seed rows');
    assert.equal(await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__
      .getSupportSnapshot().unsupportedSleeping), 0);
    report.radiusPx = await page.evaluate(() => {
      const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
      return stats.ballRadius * document.querySelector('.about-board-world').clientWidth / 960;
    });
    assert.ok(Math.abs(report.radiusPx - report.homeRadius) < .05,
      `About ${report.radiusPx}px must match Home ${report.homeRadius}px`);

    for (const [name, y] of [['pit', 850], ['garden', 1820], ['propeller', 3000], ['pinball', 4250],
      ['receiver', 5500], ['large-drum', 6760], ['small-drum', 7500], ['seesaw', 8150],
      ['clients', 8900], ['grid', 10300]]) {
      await page.locator('.about-board-scrollport').evaluate((port, boardY) => {
        const world = port.querySelector('.about-board-world');
        const origin = window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY;
        port.scrollTop = world.offsetTop + (boardY - origin) * world.clientWidth / 960 - 100;
      }, y);
      await page.waitForTimeout(220);
      const state = await page.evaluate(() => {
        const api = window.__ABS_ABOUT_GAME_BOARD__;
        const stats = api.getStats();
        return { elapsed: stats.elapsedMs, stages: stats.stages, physicsMs: stats.meanPhysicsMs,
          drawMs: stats.meanDrawMs, overlaps: stats.textArchitectureOverlaps,
          contacts: api.getContactSnapshot(),
          reader: !document.querySelector('.about-board-reader').classList.contains('is-hidden'),
          scale: document.querySelector('.about-board-world').clientWidth / 960 };
      });
      report.sections.push({ name, ...state });
      assert.equal(state.overlaps.length, 0, `${name}: text overlaps architecture`);
      assert.equal(state.reader, false, `${name}: normal text should fit its authored spaces`);
      assert.ok(state.contacts.every(contact => contact.depth * state.scale < 1.5),
        `${name}: solved positions visibly intersect architecture: ${JSON.stringify(state.contacts.slice(0, 2))}`);
      if ([390, 1440].includes(width) || ['receiver', 'small-drum', 'clients'].includes(name)) {
        await page.screenshot({ path: `${output}/${id}-${name}.png` });
      }
      assert.equal(await page.locator('.about-board-drum').count(), 2,
        `${name}: a rerender must not restore obsolete geometry`);
      if (name === 'pinball') {
        // Check visible mechanism movement, including cancelled gestures.
        // A touch scroll can cancel pointer input before pointerup arrives.
        const left = '#geometry-fixture-0002';
        const right = '#geometry-fixture-0003';
        const waitForFlipper = (selector, active) => page.waitForFunction(({ selector, active }) => {
          const angle = Number(document.querySelector(selector)?.getAttribute('transform')
            ?.match(/rotate\(([-\d.]+)/)?.[1] || 0);
          return active ? Math.abs(angle) > 8 : Math.abs(angle) < .1;
        }, { selector, active });
        await page.keyboard.down('j');
        await waitForFlipper(left, true);
        await page.keyboard.up('j');
        await waitForFlipper(left, false);
        const target = await page.locator('.about-board-scrollport').evaluate(port => {
          const world = port.querySelector('.about-board-world');
          const rect = port.getBoundingClientRect();
          const top = window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY;
          return { x: rect.left + rect.width * .75,
            y: rect.top + world.offsetTop + (4350 - top) * world.clientWidth / 960 - port.scrollTop };
        });
        await page.mouse.move(target.x, target.y);
        await page.mouse.down();
        await waitForFlipper(right, true);
        await page.evaluate(() => window.dispatchEvent(new PointerEvent('pointercancel')));
        await waitForFlipper(right, false);
        await page.mouse.up();
        report.flipperInputs = 'keyboard, pointer, cancelled gesture and return to rest';
      }
    }
    // The valve is fully open here; gravity needs time to release its pile.
    await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot()
      .some(ball => ball.id.startsWith('pit-') && ball.y > 1200), null, { timeout: 15000 });
    report.reservoirExited = await page.evaluate(() =>
      window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot()
        .filter(ball => ball.id.startsWith('pit-') && ball.y > 1200).length);
    assert.ok(report.reservoirExited > 0, 'opening the valve must actually drain the reservoir');
    await page.locator('.about-board-scrollport').evaluate(port => { port.scrollTop = port.scrollHeight; });
    await page.waitForFunction(() => document.querySelector('.about-board-three-canvas--authored')
      ?.dataset.authoredEndingReady === 'true', null, { timeout: 20000 });
    await page.waitForFunction(() => {
      const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
      return stats.authoredEnding?.bandJourney?.progress >= .999
        && !document.querySelector('.about-board-ending').inert;
    }, null, { timeout: 20000 });
    report.ending = await page.evaluate(() => {
      const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
      return { loaded: !!stats.authoredEnding, error: stats.authoredEndingError,
        grid: stats.authoredEnding?.bandJourney || stats.gridHandoff,
        contactReachable: !document.querySelector('.about-board-ending').inert };
    });
    assert.equal(report.ending.error, null);
    assert.equal(report.ending.contactReachable, true);
    assert.ok(report.ending.grid.maximumRadiusErrorPx < .1);
    await page.screenshot({ path: `${output}/${id}-ending.png` });

    // A reverse scroll must restart a paused world without catching up all the
    // time spent in the 3D ending or losing its physical inventory.
    await page.locator('.about-board-scrollport').evaluate(port => { port.scrollTop = 0; });
    const previous = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getStats().elapsedMs);
    const resumeStarted = Date.now();
    // Software WebGL can delay compositor/scroll delivery. Observe the real
    // resumed frame instead of assuming it arrived after an arbitrary sleep.
    await page.waitForFunction(previous => {
      const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
      return stats.boardVisible && stats.handledScrollTop === 0 && stats.elapsedMs > previous;
    }, previous, { timeout: 5000 });
    report.reverseResumeWallMs = Date.now() - resumeStarted;
    if (process.env.ABS_SOAK === '1' && [390, 1440].includes(width)
      && theme === 'light' && reducedMotion === 'no-preference') {
      await page.waitForTimeout(35000);
      await page.waitForTimeout(35000);
      // Software WebGL is not a device benchmark. If its compositor drops
      // frames, still reach the actual one-minute physics boundary that used
      // to disable this machine. The report retains elapsed wall time too.
      const extraStart = Date.now();
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__.getStats().elapsedMs > 60000,
        null, { timeout: 120000 });
      report.soakExtraWallMs = Date.now() - extraStart;
      const snapshot = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot());
      await page.waitForTimeout(1500);
      report.soak = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getStats());
      report.soakMoved = movedCount(snapshot,
        await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getMotionSnapshot()));
      assert.ok(report.soak.elapsedMs > 60000 && report.soakMoved > 0, 'simulation must remain active after one minute');
      assert.equal(report.soak.fed, 0, 'the finite reservoir must never create replacement balls');
      report.soakContacts = await page.evaluate(() => {
        const scale = document.querySelector('.about-board-world').clientWidth / 960;
        return window.__ABS_ABOUT_GAME_BOARD__.getContactSnapshot()
          .map(contact => ({ ...contact, depthPx: contact.depth * scale }));
      });
      assert.ok(report.soakContacts.every(contact => contact.depthPx < 1.5),
        'settled queues must not develop visible fixture penetration');
    }
    assert.deepEqual(report.errors, []);
    console.log(`PASS ${id}: closed pile still; ${report.reservoirExited} released; radius ${report.radiusPx.toFixed(3)}px`);
  } catch (error) {
    failed = true;
    report.failure = error.message;
    report.failureState = await page.evaluate(() => ({
      hidden: document.hidden, stats: window.__ABS_ABOUT_GAME_BOARD__?.getStats(),
    })).catch(() => null);
    await page.screenshot({ path: `${output}/${id}-failure.png` }).catch(() => {});
    console.error(`FAIL ${id}: ${error.message}`);
  } finally {
    reports.push(report);
    await context.close();
  }
}
await browser.close();
await writeFile(`${output}/${engine}${process.env.ABS_SOAK ? '-soak' : ''}-report.json`,
  JSON.stringify(reports, null, 2));
if (failed) process.exitCode = 1;
