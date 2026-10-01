import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright';
const engine = process.env.ABS_BROWSER || 'chromium';
const output = process.env.ABS_WINDOW_AUDIT_OUTPUT || 'output/playwright/studio-window';
const origin = process.env.ABS_WINDOW_AUDIT_URL || 'http://localhost:8012';
await mkdir(output, { recursive: true });
const browser = await (engine === 'webkit' ? webkit : chromium).launch();
const page = await browser.newPage({ viewport: { width: 2560, height: 1080 }, deviceScaleFactor: 1 });
const report = { engine, cases: [], errors: [] };
page.on('pageerror', error => report.errors.push(error.message));
try {
  for (const [route, path] of [['about', 'about.html'], ['home', 'index.html'], ['portfolio', 'portfolio.html'], ['contact', 'contact.html']]) {
    await page.goto(`${origin}/${path}`);
    await page.waitForFunction(() => document.documentElement.dataset.absDesignConfigRevision && document.querySelector('.app-scene').dataset.utilityContour === 'ready');
    for (const [width, height] of [[2560, 1080], [3440, 1440], [3840, 2160], [2048, 1152], [1920, 1080], [1440, 900], [390, 844]]) {
      await page.setViewportSize({ width, height });
      const themes = [];
      for (const theme of ['light', 'dark']) {
        if (await page.evaluate(() => document.documentElement.dataset.absTheme) !== theme) await page.locator('.button-bar__theme-toggle').click();
        await page.waitForFunction(() => document.querySelector('.shell-utility-rail').getBoundingClientRect().left < document.querySelector('#simulations').getBoundingClientRect().right);
        await page.waitForTimeout(650);
        const data = await page.evaluate(() => {
          const rect = element => { const r = element.getBoundingClientRect(); return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height }; };
          const scene = document.querySelector('.app-scene');
          const shadows = getComputedStyle(scene, '::before').boxShadow.split(/,(?![^()]*\))/).map(shadow => {
            const dimensions = shadow.match(/(-?[\d.]+)px\s+(-?[\d.]+)px\s+([\d.]+)px\s+(-?[\d.]+)px/);
            return { blur:Number(dimensions[3]), spread:Number(dimensions[4]), alpha:Number(shadow.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)?.[1] ?? 1) };
          });
          return { window:rect(document.querySelector('#simulations')), contour:rect(document.querySelector('.shell-window-contour')), rail:rect(document.querySelector('.shell-utility-rail')), menu:rect(document.querySelector('.button-bar')), emission:Number(getComputedStyle(scene).getPropertyValue('--window-light-emission')), menuEmission:Number(getComputedStyle(document.querySelector('.button-bar')).getPropertyValue('--window-light-emission')), controls:[...document.querySelectorAll('.shell-utility-rail button')].map(rect), scale:Number(getComputedStyle(scene).getPropertyValue('--window-wall-glow-scale')), shadows, contourFilters:[...document.querySelectorAll('.shell-window-contour feGaussianBlur')].map(filter => Number(filter.getAttribute('stdDeviation'))), frame:getComputedStyle(document.documentElement).getPropertyValue('--frame-color').trim() };
        });
        assert(Math.abs(data.contour.left - data.window.left) < 0.5, 'contour follows horizontal window placement');
        assert(Math.abs(data.contour.top - data.window.top) < 0.5, 'contour follows vertical window placement');
        assert(data.rail.left < data.window.right - 20, 'rail must visibly peek into the window');
        for (const control of data.controls) {
          assert(control.right <= data.window.right + 1, 'control faces remain inside the bay');
          assert(control.left >= data.window.left && control.top >= data.window.top && control.bottom <= data.window.bottom);
        }
        assert(data.scale >= 0.8 && data.scale <= 1.5);
        assert(data.window.width <= 1920.5);
        assert(data.menu.top > data.window.bottom, 'menu remains clear of the window');
        if (width >= 2560) {
          assert(data.window.height <= 1080.5, 'large window height stays bounded');
          assert(Math.abs(data.window.top - (height - data.menu.bottom)) < 16, 'window and menu form a balanced group');
          assert(data.window.top >= height * .08 - .5);
        }
        if (width <= 1920) assert(Math.abs(data.window.top - (width <= 480 ? 10 : 14)) < .5);
        assert.equal(data.emission, data.menuEmission);
        if (width >= 2560) assert(data.scale > 1.25, 'large source broadens the halo');
        if (width === 390) assert(data.shadows[2].blur < 20, 'mobile keeps its authored falloff');
        data.shadows.forEach((shadow, index) => assert(Math.abs(data.contourFilters[index] * 2 - shadow.blur) < .1, 'curved bay uses the exact window glow'));
        themes.push(data);
        report.cases.push({ route, width, height, theme, ...data });
        if ([2560, 3440, 390].includes(width)) await page.screenshot({ path:`${output}/${engine}-${route}-${width}-${theme}.png` });
      }
      assert(themes[0].emission > themes[1].emission * 4, 'spill follows the displayed source brightness');
      assert(themes[0].shadows[1].alpha > themes[1].shadows[1].alpha * 2, 'light contact glow is stronger');
      assert(themes[0].shadows[2].alpha > themes[1].shadows[2].alpha * 2, 'light broad glow is stronger');
      assert(Math.abs(themes[0].window.width - themes[1].window.width) < .1);
    }
    console.log(`PASS ${engine}: ${route}, rail bay and responsive light/dark halo`);
  }
  await page.emulateMedia({ reducedMotion:'reduce' });
  await page.setViewportSize({ width:2560, height:1080 });
  await page.locator('.button-bar__theme-toggle').focus();
  const before = await page.evaluate(() => document.documentElement.dataset.absTheme);
  await page.keyboard.press('Space');
  await page.waitForFunction(before => document.documentElement.dataset.absTheme !== before, before);
  assert(await page.locator('.button-bar__theme-toggle').evaluate(element => element === document.activeElement), 'keyboard focus stays on the rail');
  report.reducedMotionKeyboard = true;
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.stack;
  console.error(error.stack);
  await page.screenshot({ path:`${output}/${engine}-failure.png` });
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(`${output}/${engine}-report.json`, JSON.stringify(report, null, 2));
}
