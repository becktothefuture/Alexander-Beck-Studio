import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
import { MECHANISM } from '../react-app/app/src/routes/about-game-board/boardScene.js';

const origin = process.env.ABS_URL || 'http://localhost:8012';
const engine = process.env.ABS_BROWSER || 'chromium';
const output = process.env.ABS_OUTPUT || 'output/playwright/about-feedback-20260925';
await mkdir(output, { recursive: true });
const browser = await (engine === 'webkit' ? webkit : chromium).launch({
  args: engine === 'chromium' ? ['--use-angle=metal'] : [],
});
const reports = [];
async function scrollTo(page, y, ratio = .42) {
  await page.locator('.about-board-scrollport').evaluate((port, { y, ratio }) => {
    const world = port.querySelector('.about-board-world');
    port.scrollTop = world.offsetTop + (y - window.__ABS_ABOUT_GAME_BOARD__.getStats().reservoir.topY)
      * world.clientWidth / 960 - port.clientHeight * ratio;
  }, { y, ratio });
  await page.waitForFunction(() => {
    const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
    return Math.abs(stats.handledScrollTop - stats.scrollTop) < 1;
  });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
const waitForFlipper = (page, side, pressed) => page.waitForFunction(({ id, pressed }) => {
  const angle = Math.abs(Number(document.getElementById(id).getAttribute('transform')
    ?.match(/rotate\(([^ ,]+)/)?.[1] || 0));
  return pressed ? angle > 8 : angle < .1;
}, { id: MECHANISM[`${side}Flipper`].id, pressed }, { timeout: 3000 });
try {
  for (const [width, theme] of [
    [320, 'light'], [360, 'light'], [390, 'light'], [640, 'light'], [641, 'light'],
    [768, 'light'], [900, 'light'], [901, 'light'], [1440, 'light'],
    [390, 'dark'], [1440, 'dark'],
  ]) {
    const height = width > 1000 ? 1000 : 844;
    const page = await browser.newPage({ viewport: { width, height }, colorScheme: theme, hasTouch: width < 641 });
    const report = { engine, width, height, theme, errors: [] };
    page.on('pageerror', error => report.errors.push(error.message));
    try {
      await page.goto(`${origin}/about.html`);
      await page.waitForFunction(() => window.__ABS_ABOUT_GAME_BOARD__?.getStats().reservoirReady);
      await page.evaluate(() => document.fonts.ready);
      if (await page.locator('html').getAttribute('data-abs-theme') !== theme) {
        await page.getByRole('button', { name: `Switch to ${theme} mode` }).click();
      }
      // Include the delayed font/layout safety inspection.
      await page.waitForTimeout(1200);
      report.layout = await page.evaluate(() => {
        const stats = window.__ABS_ABOUT_GAME_BOARD__.getStats();
        const reference = parseFloat(getComputedStyle(document.querySelector('.about-board-clients__intro')).fontSize);
        const context = document.createElement('canvas').getContext('2d');
        const copy = [...document.querySelectorAll('.about-board-intro p, .about-board-world .about-board-text > :is(h2,p,small), .about-board-ending p')]
          .filter(node => node.getBoundingClientRect().width).map(node => {
            const style = getComputedStyle(node);
            context.font = style.font;
            return { slot: node.parentElement.dataset.boardTextSlot || node.parentElement.className,
              tag: node.tagName, size: parseFloat(style.fontSize), width: node.getBoundingClientRect().width,
              maximum: context.measureText('0').width * 32 };
          });
        const drum = document.querySelector('#runtime-large-drum').getBoundingClientRect();
        const art = document.querySelector('[data-board-text-slot="discipline:Art Direction"]').getBoundingClientRect();
        const utilityLeft = document.querySelector('.shell-utility-rail').getBoundingClientRect().left;
        const disciplineInsets = [...document.querySelectorAll('.about-board-world .about-board-discipline')].map(element => {
          const rects = [];
          for (const child of element.children) {
            const range = document.createRange();
            range.selectNodeContents(child);
            rects.push(...range.getClientRects());
          }
          return { slot: element.dataset.boardTextSlot,
            clearPx: utilityLeft - Math.max(...rects.filter(rect => rect.width > 0).map(rect => rect.right)) };
        });
        return { reference, copy, reader: !document.querySelector('.about-board-reader').classList.contains('is-hidden'),
          overlaps: stats.textArchitectureOverlaps, artOutsideDrum: art.right < drum.left,
          disciplineInsets,
          radius: stats.ballRadius, staticColliders: stats.rigidBody?.fixed,
          receiver: document.querySelector('#Vector_152').getAttribute('d'),
          slingCount: document.querySelectorAll('#geometry-pinball-playfield polygon').length,
          inventory: window.__ABS_ABOUT_GAME_BOARD__.getInventorySnapshot() };
      });
      assert.equal(report.layout.reader, false, 'normal text must fit without reader fallback');
      assert.deepEqual(report.layout.overlaps, []);
      assert.equal(report.layout.artOutsideDrum, true, 'Art Direction must stay outside the complete drum');
      assert.equal(report.layout.slingCount, 2);
      assert.ok(report.layout.disciplineInsets.every(item => item.clearPx > 1),
        `discipline copy must clear fixed utility controls: ${JSON.stringify(report.layout.disciplineInsets)}`);
      for (const item of report.layout.copy) {
        assert.ok(Math.abs(item.size - report.layout.reference) < .1, `${item.slot}: one reading size`);
        assert.ok(item.width <= item.maximum + 1, `${item.slot}: measure ${item.width} > ${item.maximum}`);
      }
      for (const [name, y] of [['pinball', 4060], ['product', 4800], ['drums', 6850], ['engineering', 8380]]) {
        await scrollTo(page, y);
        if ([320, 390, 1440].includes(width)) await page.screenshot({ path: `${output}/${engine}-${width}-${theme}-${name}.png` });
      }
      // Measure the moving beam's complete reach, not just its resting line.
      // Apply and restore these two diagnostic SVG poses synchronously.
      report.beamClearance = await page.evaluate(() => {
        const group = document.querySelector('#geometry-impact-seesaw');
        const original = group.getAttribute('transform');
        const beam = group.querySelector('#Vector_161');
        const texts = ['Creative Engineering', 'Parametric Systems'].map(label =>
          document.querySelector(`[data-board-text-slot="discipline:${label}"]`).getBoundingClientRect());
        const samples = [];
        try {
          for (const angle of [-.18, .18]) {
            group.setAttribute('transform', `rotate(${angle * 180 / Math.PI} 472 7980)`);
            const box = beam.getBoundingClientRect();
            const matrix = beam.getScreenCTM();
            const stroke = 12 * Math.hypot(matrix.a, matrix.b);
            samples.push({ angle, clearPx: Math.min(...texts.map(text => text.top - box.bottom - stroke)) });
          }
        } finally {
          if (original === null) group.removeAttribute('transform');
          else group.setAttribute('transform', original);
        }
        return samples;
      });
      assert.ok(report.beamClearance.every(sample => sample.clearPx > 2),
        `copy must clear both extremes of the beam: ${JSON.stringify(report.beamClearance)}`);
      if ([390, 1440].includes(width)) {
        await scrollTo(page, 4376, .55);
        for (const [key, side] of [['j', 'left'], ['k', 'right']]) {
          await page.keyboard.down(key); await waitForFlipper(page, side, true);
          await page.keyboard.up(key); await waitForFlipper(page, side, false);
        }
        const port = await page.locator('.about-board-scrollport').boundingBox();
        await page.mouse.move(port.x + port.width * .73, port.y + port.height * .55);
        await page.mouse.down(); await waitForFlipper(page, 'right', true);
        await page.locator('.about-board-scrollport').dispatchEvent('pointercancel', { bubbles: true });
        await waitForFlipper(page, 'right', false); await page.mouse.up();
        report.flippers = 'keyboard, pointer and cancellation passed';
        report.meter = [];
        for (const progress of [0, .5, 1, .5, 0]) {
          await scrollTo(page, MECHANISM.meterGate.pivot[1], .78 - .36 * progress);
          await page.waitForTimeout(100);
          const state = await page.evaluate(() => window.__ABS_ABOUT_GAME_BOARD__.getStats());
          assert.ok(Math.abs(state.meterProgress - progress) < .006);
          report.meter.push({ progress: state.meterProgress, angle: state.meterAngle });
        }
      }
      if (width === 1440 && theme === 'dark') {
        report.resizes = [];
        for (const nextWidth of [390, 768, 1440, 320, 390]) {
          await page.setViewportSize({ width: nextWidth, height: nextWidth === 1440 ? 1000 : 844 });
          await page.waitForTimeout(1300);
          const state = await page.evaluate(() => ({
            width: innerWidth,
            reader: !document.querySelector('.about-board-reader').classList.contains('is-hidden'),
            copies: document.querySelectorAll('#geometry-pinball-playfield').length,
            overlaps: window.__ABS_ABOUT_GAME_BOARD__.getStats().textArchitectureOverlaps,
          }));
          report.resizes.push(state);
          assert.equal(state.reader, false, 'resizing scrolled content must not trigger a false reader fallback');
          assert.equal(state.copies, 1, 'resize must replace the machine without duplicate fixtures');
          assert.deepEqual(state.overlaps, []);
        }
        await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
        await page.waitForTimeout(500);
        report.enlarged = await page.evaluate(() => ({
          reader: !document.querySelector('.about-board-reader').classList.contains('is-hidden'),
          texts: document.querySelectorAll('.about-board-reader [data-board-text-slot]').length,
          overflow: document.querySelector('.about-board-scrollport').scrollWidth
            > document.querySelector('.about-board-scrollport').clientWidth,
        }));
        assert.equal(report.enlarged.reader, true, 'genuinely enlarged text must retain its accessible fallback');
        assert.equal(report.enlarged.texts, 12);
        assert.equal(report.enlarged.overflow, false);
      }
      assert.deepEqual(report.errors, []);
      report.passed = true;
      console.log(`PASS ${engine} ${width} ${theme}: type, measure, drum clearance and layout`);
    } catch (error) {
      report.passed = false; report.failure = error.message; process.exitCode = 1;
      console.error(`FAIL ${engine} ${width} ${theme}: ${error.message}`);
      await page.screenshot({ path: `${output}/${engine}-${width}-${theme}-failure.png` });
    } finally { reports.push(report); await page.close(); }
  }
} finally {
  await browser.close();
  await writeFile(`${output}/${engine}-report.json`, JSON.stringify(reports, null, 2));
}
