import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { launchAboutAuditBrowser } from './audit-about-narrative-surfel-v2-helpers.mjs';
import { FANCY_HOME_DEFAULT_CONFIG as defaults, FANCY_CONTROLS, fancySearchParams, readFancyConfig } from '../react-app/app/src/routes/fancy-mode/fancyConfig.js';
import { FANCY_PALETTE_MODES } from '../react-app/app/src/routes/fancy-mode/fancyStyles.js';

const browserName = process.env.ABS_BROWSER || 'chromium';
const origin = process.env.ABS_FANCY_URL || 'http://localhost:8012';
const output = resolve('output/playwright/fancy-site', process.env.ABS_FANCY_OUTPUT || browserName);
await mkdir(output, { recursive: true });
const browser = await launchAboutAuditBrowser(browserName);
const results = [];
const errors = [];
const views = ['home', 'work', 'about', 'contact'];

// Explicit zero/false values must survive a share URL against the new preset.
for (const control of FANCY_CONTROLS) {
  const values = control.type === 'boolean' ? [false, true] : control.options?.map(({ value }) => value) || [control.min, control.max];
  for (const value of values) {
    const config = { ...defaults, [control.id]: value };
    assert.deepEqual(readFancyConfig(fancySearchParams(config, 'pit', defaults), defaults), config);
  }
}

async function snapshot(frame) { return frame.evaluate(() => window.__ABS_FANCY_PREVIEW__.snapshot()); }
async function ready(page, view) {
  await page.locator('iframe').contentFrame().locator('html.fancy-preview').waitFor({ timeout: 60000 }).catch(async (error) => {
    await capture(page, `failed-load-${view}.png`);
    console.log('Frame load diagnostics', page.frames().map((frame) => frame.url()), errors);
    throw error;
  });
  const frame = page.frames().find((item) => item !== page.mainFrame());
  assert.ok(frame);
  await frame.waitForFunction((expected) => {
    const state = window.__ABS_FANCY_PREVIEW__?.snapshot();
    const root = document.documentElement;
    return state?.ready && state.view === expected && state.profile === (expected === 'home' ? 'pit' : expected)
      && (root.dataset.absTransitionPhase || 'idle') === 'idle' && root.dataset.absBootState === 'ready';
  }, view, { timeout: 60000 }).catch(async (error) => {
    console.log('Readiness diagnostics', await frame.evaluate(() => ({ state: window.__ABS_FANCY_PREVIEW__?.snapshot(), root: document.documentElement.dataset, href: location.href })));
    await capture(page, `failed-${view}.png`);
    throw error;
  });
  await page.waitForFunction((expected) => (new URLSearchParams(location.search).get('view') || 'home') === expected, view);
  if (view === 'work') {
    await frame.waitForFunction(() => window.__ABS_WORK__?.getSnapshot()?.dotField?.frameScheduled === false, null, { timeout: 20000 });
  }
  return frame;
}
async function capture(page, filename) { await page.screenshot({ path: resolve(output, filename) }); }
async function waitPaint(frame) {
  const before = await snapshot(frame);
  await frame.waitForFunction((frames) => window.__ABS_FANCY_PREVIEW__.snapshot().frames > frames, before.frames);
}
async function cadence(frame) {
  return frame.evaluate(async () => {
    let previous;
    const times = [];
    const first = window.__ABS_FANCY_PREVIEW__.snapshot();
    for (let i = 0; i < 61; i++) {
      const now = await new Promise(requestAnimationFrame);
      if (previous) times.push(now - previous);
      previous = now;
    }
    times.sort((a, b) => a - b);
    const state = window.__ABS_FANCY_PREVIEW__.snapshot();
    return { medianRaf: times[30], p95Raf: times[57], cpuSubmissionMs: state.frameMs, drawnFrames: state.frames - first.frames };
  });
}

try {
  for (const mobile of [false, true]) {
    const size = mobile ? 'mobile' : 'desktop';
    if (process.env.ABS_FANCY_SIZE && process.env.ABS_FANCY_SIZE !== size) continue;
    const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
    const context = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(`${size}: ${error.message}`));
    page.on('console', (message) => { if (message.type() === 'error') errors.push(`${size}: ${message.text()}`); });
    await page.goto(`${origin}/lab/fancy-home.html?mode=pit`, { waitUntil: 'domcontentloaded' });
    let frame;
    for (const view of views) {
      if (frame) await frame.getByRole('link', { name: view[0].toUpperCase() + view.slice(1), exact: true }).click();
      frame = await ready(page, view);
      assert.deepEqual((await snapshot(frame)).config, defaults, `${view} preset`);
      assert.equal((await snapshot(frame)).cell, defaults.cell);
      assert.equal(await frame.getByRole('link', { name: view[0].toUpperCase() + view.slice(1), exact: true }).getAttribute('aria-current'), 'page');
      if (view === 'about') {
        assert.equal((await snapshot(frame)).renderer, 'webgl-grid');
        for (const progress of [0.2, 0.45, 0.82]) {
          await frame.locator('.about-narrative-scrollport').evaluate((el, ratio) => { el.scrollTop = (el.scrollHeight - el.clientHeight) * ratio; }, progress);
          await frame.waitForFunction((ratio) => {
            const el = document.querySelector('.about-narrative-scrollport');
            return Math.abs(el.scrollTop / (el.scrollHeight - el.clientHeight) - ratio) < 0.01;
          }, progress);
          await waitPaint(frame);
          await capture(page, `${size}-about-${progress}.png`);
        }
      }
      for (const dark of [true, false]) {
        if (!dark) await page.getByRole('button', { name: 'Switch to white background' }).click();
        await frame.waitForFunction((value) => window.__ABS_FANCY_PREVIEW__.snapshot().dark === value, dark);
        await capture(page, `${size}-${view}-${dark ? 'black' : 'white'}.png`);
        assert.equal(await frame.locator('#simulations').evaluate((el) => getComputedStyle(el).backgroundColor), dark ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
        results.push({ size, view, dark, config: (await snapshot(frame)).config, metrics: await cadence(frame) });
      }
      await page.getByRole('button', { name: 'Switch to black background' }).click();
      await page.getByRole('button', { name: 'Fancy Mode', exact: true }).click();
      await frame.waitForFunction(() => window.__ABS_FANCY_PREVIEW__.snapshot().fancy === false);
      const normalFrames = (await snapshot(frame)).frames;
      await cadence(frame);
      assert.equal((await snapshot(frame)).frames, normalFrames, 'No tile draws in Normal');
      await capture(page, `${size}-${view}-normal.png`);
      await page.getByRole('button', { name: 'Normal Mode', exact: true }).click();
      await waitPaint(frame);
      if (view === 'work') {
        const before = await frame.evaluate(() => window.__ABS_WORK__.getSnapshot().dotField.drawCount);
        await page.mouse.move(viewport.width * 0.5, viewport.height * 0.64);
        await page.mouse.down();
        await page.mouse.move(viewport.width * 0.67, viewport.height * 0.6, { steps: 18 });
        await page.mouse.up();
        await frame.waitForFunction((count) => window.__ABS_WORK__.getSnapshot().dotField.drawCount > count, before);
        await frame.waitForFunction(() => !window.__ABS_WORK__.getSnapshot().dotField.frameScheduled);
        await capture(page, `${size}-work-panned.png`);
      }
      // Every native renderer must repaint when a private palette selection
      // changes, and pair its patterns without changing the native role colours.
      await page.getByRole('button', { name: 'Tune', exact: true }).click();
      const colourSelect = page.locator('.parameterizer-row').filter({ hasText: 'Colour mode' }).locator('select');
      for (const palette of [FANCY_PALETTE_MODES[0], FANCY_PALETTE_MODES[3]]) {
        const frames = (await snapshot(frame)).frames;
        await colourSelect.selectOption(String(palette.value));
        await frame.waitForFunction(({ paletteId, family, frames: before }) => {
          const state = window.__ABS_FANCY_PREVIEW__.snapshot();
          return state.palette === paletteId && state.activeFamily === family && state.frames > before;
        }, { paletteId: palette.paletteId, family: palette.family, frames });
        assert.deepEqual(await frame.evaluate(() => window.__ABS_SIMULATION_PALETTE__.colors), palette.colors);
      }
      await colourSelect.selectOption('-1');
      await page.getByRole('button', { name: 'Close configuration' }).click();
      // A shared view URL must start the correct native route and exact preset.
      const url = page.url();
      await page.reload({ waitUntil: 'domcontentloaded' });
      frame = await ready(page, view);
      assert.deepEqual((await snapshot(frame)).config, defaults);
      assert.equal(page.url(), url);
      // The iframe can also reload without a Fancy query: bootstrap from its
      // labelled, same-origin lab parent, never a normal top-level page.
      if (view !== 'home') {
        await frame.goto(new URL(frame.url()).origin + new URL(frame.url()).pathname, { waitUntil: 'domcontentloaded' });
        frame = await ready(page, view);
        assert.deepEqual((await snapshot(frame)).config, defaults);
      }
      console.log(`${browserName} ${size} ${view}: navigation, preset, ground, comparison and reload passed`);
    }
    // Live controls on the non-Home renderer and a route hop with custom values.
    await page.getByRole('button', { name: 'Tune', exact: true }).click();
    await page.locator('.parameterizer-row').filter({ hasText: 'Pattern family' }).locator('select').selectOption('0');
    await page.locator('.parameterizer-row').filter({ hasText: 'Shapes' }).locator('select').selectOption('5');
    await page.getByRole('button', { name: 'Close configuration' }).click();
    await frame.getByRole('link', { name: 'About', exact: true }).click();
    frame = await ready(page, 'about');
    assert.equal((await snapshot(frame)).config.family, 0);
    assert.equal((await snapshot(frame)).config.shape, 5);
    await capture(page, `${size}-about-geometric-stripes.png`);
    if (mobile) {
      await page.touchscreen.tap(viewport.width * 0.8, viewport.height * 0.4);
      assert.equal((await snapshot(frame)).ripples, 0, 'The selected zero strength keeps input waves off');
      await capture(page, `${size}-about-touch-ripple.png`);
    }
    await page.getByRole('button', { name: 'Tune', exact: true }).click();
    await page.getByRole('button', { name: 'Reset', exact: true }).click();
    await page.getByRole('button', { name: 'Close configuration' }).click();
    assert.deepEqual((await snapshot(frame)).config, defaults);
    // A final round trip uses the real native Home button.
    await frame.getByRole('link', { name: 'Home', exact: true }).click();
    frame = await ready(page, 'home');
    assert.deepEqual((await snapshot(frame)).config, defaults);
    results.push({ size, customPresetAcrossNavigation: 'passed', homeRoundTrip: 'passed' });
    await context.close();
  }
  for (const view of ['work', 'about', 'contact']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true });
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push(`reduced ${view}: ${error.message}`));
    await page.goto(`${origin}/lab/fancy-home.html?view=${view}`, { waitUntil: 'domcontentloaded' });
    const frame = await ready(page, view);
    await page.touchscreen.tap(330, 320);
    assert.equal((await snapshot(frame)).ripples, 0);
    await capture(page, `reduced-${view}.png`);
    results.push({ view, reducedMotion: 'passed' });
    await context.close();
  }
  // The same URL flags never activate a top-level ordinary route.
  const context = await browser.newContext();
  const page = await context.newPage();
  for (const path of ['/index.html', '/portfolio.html', '/about.html', '/contact.html']) {
    await page.goto(`${origin}${path}?fancyLab=1&finish=fancy`, { waitUntil: 'domcontentloaded' });
    assert.equal(await page.evaluate(() => Boolean(window.__ABS_FANCY_PREVIEW__) || document.documentElement.classList.contains('fancy-preview')), false);
  }
  await context.close();
  assert.deepEqual(errors, []);
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ browserName, origin, results, errors }, null, 2));
  await browser.close();
}
console.log(`${browserName}: ${results.length} records, ${errors.length} browser errors`);
