import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { launchAboutAuditBrowser } from './audit-about-narrative-surfel-v2-helpers.mjs';
import { FANCY_HOME_DEFAULT_CONFIG, readFancyConfig } from '../react-app/app/src/routes/fancy-mode/fancyConfig.js';
import { FANCY_PALETTE_MODES } from '../react-app/app/src/routes/fancy-mode/fancyStyles.js';

const browserName = process.env.ABS_BROWSER || 'chromium';
const origin = process.env.ABS_FANCY_URL || 'http://localhost:8012';
const output = resolve('output/playwright/fancy-styles', browserName);
const browser = await launchAboutAuditBrowser(browserName);
const results = [];
const errors = [];
await mkdir(output, { recursive: true });

const row = (page, label) => page.locator('.parameterizer-row').filter({ has: page.locator('.parameterizer-label', { hasText: new RegExp(`^${label}$`) }) });
const state = (frame) => frame.evaluate(() => window.__ABS_FANCY_PREVIEW__.snapshot());
async function ready(page) {
  await page.locator('iframe').contentFrame().locator('html.fancy-preview').waitFor();
  const frame = page.frames().find((candidate) => candidate !== page.mainFrame());
  await frame.waitForFunction(() => window.__ABS_FANCY_PREVIEW__?.snapshot().ready && document.documentElement.dataset.absBootState === 'ready');
  return frame;
}
async function panel(page) {
  if (!await page.getByRole('button', { name: 'Close configuration' }).isVisible()) await page.getByRole('button', { name: 'Tune', exact: true }).click();
  const patterns = page.getByRole('button', { name: 'Patterns', exact: true });
  if (await patterns.getAttribute('aria-expanded') !== 'true') await patterns.click();
}
async function pickPalette(page, frame, index, family = index) {
  await panel(page);
  await row(page, 'Colour mode').locator('select').selectOption(String(index));
  await frame.waitForFunction(({ paletteId, family: expected }) => {
    const current = window.__ABS_FANCY_PREVIEW__.snapshot();
    return current.palette === paletteId && current.activeFamily === expected;
  }, { paletteId: FANCY_PALETTE_MODES[index].paletteId, family });
}
async function capture(page, filename) { await page.screenshot({ path: resolve(output, filename) }); }

try {
  for (const mobile of [false, true]) {
    const size = mobile ? 'mobile' : 'desktop';
    const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
    const context = await browser.newContext({ viewport, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1, timezoneId: 'Europe/London' });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`${origin}/lab/fancy-home.html?mode=pit&cell=15&gridLock=1&wake=0.3&motionResponse=2&mouseRipples=1&introRipple=1&rippleStrength=0&rippleWidth=76&rippleLife=8`);
    let frame = await ready(page);
    assert.deepEqual((await state(frame)).config, FANCY_HOME_DEFAULT_CONFIG);
    await frame.waitForFunction(() => window.__ABS_FANCY_PREVIEW__.snapshot().frames > 45);
    for (const palette of FANCY_PALETTE_MODES) {
      await pickPalette(page, frame, palette.value);
      assert.deepEqual(await frame.evaluate(() => window.__ABS_SIMULATION_PALETTE__.colors), palette.colors);
      assert.ok((await page.locator('.fancy-style-status').textContent()).includes(palette.label));
      assert.ok((await page.locator('.fancy-controls__palette').textContent()).includes('Manual colours'));
      const guide = page.locator(`[data-fancy-style="${palette.paletteId}"]`);
      for (const period of palette.periods) assert.ok((await guide.textContent()).includes(period.hours));
      await guide.scrollIntoViewIfNeeded();
      await capture(page, `${size}-guide-${palette.value}.png`);
      await page.getByRole('button', { name: 'Close configuration' }).click();
      for (const dark of [true, false]) {
        if (!dark) await page.getByRole('button', { name: 'Switch to white background' }).click();
        await frame.waitForFunction((expected) => window.__ABS_FANCY_PREVIEW__.snapshot().dark === expected, dark);
        const glyphs = await frame.locator('.fancy-legend-pattern').evaluateAll((canvases) => canvases.map((canvas) => {
          const pixels = canvas.getContext('2d').getImageData(0, 0, 40, 40).data;
          let white = 0;
          for (let index = 0; index < pixels.length; index += 4) {
            if (pixels[index + 3] > 240 && pixels[index] > 235 && pixels[index + 1] > 235 && pixels[index + 2] > 235) white += 1;
          }
          return { family: Number(canvas.dataset.family), role: canvas.dataset.role, white, image: canvas.toDataURL() };
        }));
        assert.equal(glyphs.length, 6);
        assert.ok(glyphs.every((glyph) => glyph.family === palette.family));
        assert.equal(new Set(glyphs.map((glyph) => glyph.image)).size, 6);
        if (dark) assert.ok(glyphs.filter((glyph) => glyph.role !== 'art-direction').every((glyph) => glyph.white === 0), 'Coloured roles must not gain white decoration');
        const copyFields = await frame.locator('#expertise-legend, .ui-top-right .decorative-script, #social-links, #site-year, #edge-caption').evaluateAll((nodes) => nodes.map((node) => ({
          background: getComputedStyle(node).backgroundColor,
          opacity: Number(getComputedStyle(node, '::before').opacity),
        })));
        assert.equal(copyFields.length, 5);
        assert.ok(copyFields.every((field) => field.background === 'rgba(0, 0, 0, 0)' && field.opacity <= 0.8), 'Palette changes retain transparent Home copy and shadows capped at 80%');
        await capture(page, `${size}-${palette.value}-${dark ? 'black' : 'white'}.png`);
        results.push({ size, palette: palette.paletteId, family: palette.family, dark, glyphs: glyphs.map(({ image, ...glyph }) => glyph) });
      }
      await page.getByRole('button', { name: 'Switch to black background' }).click();
    }
    await panel(page);
    await row(page, 'Follow colours').locator('input').uncheck();
    assert.equal((await state(frame)).activeFamily, 3, 'Unlinking keeps the visible pattern');
    await row(page, 'Follow colours').locator('input').check();
    await row(page, 'Pattern family').locator('select').selectOption('0');
    assert.equal(await row(page, 'Follow colours').locator('input').isChecked(), false);
    await pickPalette(page, frame, 1, 0);
    await row(page, 'Follow colours').locator('input').check();
    await frame.waitForFunction(() => window.__ABS_FANCY_PREVIEW__.snapshot().activeFamily === 1);
    const saved = (await state(frame)).config;
    const savedUrl = page.url();
    assert.deepEqual(readFancyConfig(new URL(savedUrl).searchParams, FANCY_HOME_DEFAULT_CONFIG), saved);
    const downloadEvent = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Export settings' }).click();
    const download = await downloadEvent;
    const exportedPath = resolve(output, `${size}-settings.json`);
    await download.saveAs(exportedPath);
    assert.deepEqual(JSON.parse(await readFile(exportedPath, 'utf8')).config, saved);
    await page.reload();
    frame = await ready(page);
    assert.deepEqual((await state(frame)).config, saved);
    await page.getByRole('button', { name: 'Fancy Mode', exact: true }).click();
    assert.equal((await state(frame)).palette, FANCY_PALETTE_MODES[1].paletteId, 'Normal keeps the selected colours');
    await page.getByRole('button', { name: 'Normal Mode', exact: true }).click();
    await panel(page);
    await page.getByRole('button', { name: 'Ripples', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Make a ripple' }).isDisabled(), true);
    await row(page, 'Strength').locator('input').fill('1');
    await page.getByRole('button', { name: 'Make a ripple' }).click();
    await frame.waitForFunction(() => window.__ABS_FANCY_PREVIEW__.snapshot().ripples > 0);
    await row(page, 'Strength').locator('input').fill('0');
    assert.equal((await state(frame)).ripples, 0, 'Zero strength removes existing waves');
    await page.getByRole('button', { name: 'Close configuration' }).click();
    await context.close();
  }

  // Real automatic schedule, independent of manual preview selection.
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/London' });
  const page = await context.newPage();
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-09-13T16:59:45Z') });
  await page.goto(`${origin}/lab/fancy-home.html?mode=pit`);
  const frame = await ready(page);
  assert.equal((await state(frame)).palette, FANCY_PALETTE_MODES[1].paletteId);
  await page.clock.setSystemTime(new Date('2026-09-13T17:00:01Z'));
  await frame.evaluate(() => window.dispatchEvent(new Event('focus')));
  await frame.waitForFunction(() => window.__ABS_FANCY_PREVIEW__.snapshot().activeFamily === 2);
  await page.waitForFunction(() => document.querySelector('.fancy-controls__palette').textContent.includes('18:00–20:59'));
  await pickPalette(page, frame, 0);
  await page.clock.setSystemTime(new Date('2026-09-13T20:00:01Z'));
  await frame.evaluate(() => window.dispatchEvent(new Event('focus')));
  assert.equal((await state(frame)).palette, FANCY_PALETTE_MODES[0].paletteId);
  await row(page, 'Colour mode').locator('select').selectOption('-1');
  await frame.waitForFunction(() => window.__ABS_FANCY_PREVIEW__.snapshot().activeFamily === 3);
  results.push({ automaticSchedule: 'passed', manualPinAcrossBoundary: 'passed' });
  await context.close();
  assert.deepEqual(errors, []);
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ browserName, origin, results, errors }, null, 2));
  await browser.close();
}
console.log(`${browserName}: four simple pattern variations, palette controls, time labels, white-accent limit, export, reload and zero-strength ripples passed.`);
