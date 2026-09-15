import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import { FANCY_CONTROLS, FANCY_DEFAULT_CONFIG, FANCY_HOME_DEFAULT_CONFIG, FANCY_GROUPS, fancySearchParams, readFancyConfig } from '../react-app/app/src/routes/fancy-mode/fancyConfig.js';
import { FANCY_SIMULATION_PROFILES } from '../react-app/app/src/routes/fancy-mode/fancySimulationProfiles.js';
import { FANCY_ROLE_SHAPES } from '../react-app/app/src/routes/fancy-mode/fancyPatterns.js';

const browserName = process.env.ABS_BROWSER || 'chromium';
const browserType = browserName === 'webkit' ? webkit : chromium;
const origin = process.env.ABS_FANCY_URL || 'http://localhost:8012';
const homepage = process.env.ABS_FANCY_STUDY === 'home';
const uiOnly = process.env.ABS_FANCY_UI_ONLY === '1';
const defaults = homepage ? FANCY_HOME_DEFAULT_CONFIG : FANCY_DEFAULT_CONFIG;
const labPath = homepage ? '/lab/fancy-home.html' : '/lab/fancy-mode.html';
const output = resolve(homepage ? 'output/playwright/fancy-home' : 'output/playwright/fancy-mode', process.env.ABS_FANCY_OUTPUT || browserName);
const catalog = JSON.parse(await readFile(new URL('../react-app/app/src/data/simulationCatalog.json', import.meta.url), 'utf8'));
const modes = homepage ? catalog.simulations.filter((entry) => entry.stage === 'daily-rotation').map(({ id, name }) => [id, name])
  : [ ['pit', 'Pit'], ['kaleidoscope-3', 'Kaleidoscope'], ['flock-of-birds', 'Flock'] ];
if (homepage) assert.deepEqual(modes.map(([id]) => id).sort(), Object.keys(FANCY_SIMULATION_PROFILES).filter((id) => !['work', 'about', 'contact'].includes(id)).sort(), 'Every Home simulation has a presentation profile');
const results = [];
const errors = [];
await mkdir(output, { recursive: true });
const browser = await browserType.launch({
  headless: true,
  ...(browserName === 'chromium' && process.env.ABS_FANCY_HOST_RULES
    ? { args: [`--host-resolver-rules=${process.env.ABS_FANCY_HOST_RULES}`] }
    : {}),
});

async function switchSimulation(page, mode, label) {
  if (homepage) await page.getByRole('combobox', { name: 'Simulation', exact: true }).selectOption(mode);
  else await page.getByRole('button', { name: label, exact: true }).click();
}

async function measureCadence(frame) {
  return frame.evaluate(async () => {
    const intervals = [];
    let previous = 0;
    const before = window.__ABS_FANCY_PREVIEW__.snapshot();
    const start = performance.now();
    for (let i = 0; i < 61; i += 1) {
      const now = await new Promise(requestAnimationFrame);
      if (previous) intervals.push(now - previous);
      previous = now;
    }
    const elapsed = performance.now() - start;
    intervals.sort((a, b) => a - b);
    const after = window.__ABS_FANCY_PREVIEW__.snapshot();
    return { rafMedianMs: intervals[30], rafP95Ms: intervals[57], fieldFps: (after.frames - before.frames) * 1000 / elapsed,
      fieldMs: after.fancy ? after.frameMs : null, cells: after.cells, visibleCells: after.visibleCells, bodiesSubmitted: after.particles };
  });
}

async function readyFrame(page, expectedMode) {
  await page.locator('iframe').waitFor();
  const frame = await page.locator('iframe').contentFrame();
  await frame.locator('#simulations[aria-busy="false"]').waitFor({ timeout: 30000 });
  const child = page.frames().find((item) => item !== page.mainFrame());
  await child.waitForFunction((mode) => {
    const state = window.__ABS_FANCY_PREVIEW__?.snapshot();
    return state?.ready && state.mode === mode;
  }, expectedMode, { timeout: 60000 });
  await child.waitForFunction(() => document.documentElement.classList.contains('abs-home-post-boot-complete'), null, { timeout: 30000 });
  await child.waitForFunction(() => document.querySelector('#simulation-title-canvas')?.dataset.titlePlaneSleeping === 'true', null, { timeout: 30000 });
  return child;
}

async function snapshot(frame) {
  return frame.evaluate(() => window.__ABS_FANCY_PREVIEW__.snapshot());
}

async function auditLegend(frame, { shape = -1, normal = false } = {}) {
  await frame.waitForFunction(() => document.querySelectorAll('#expertise-legend .fancy-legend-pattern').length === 6);
  const legend = await frame.locator('#expertise-legend .fancy-legend-pattern').evaluateAll((canvases) => canvases.map((canvas) => {
    const role = window.__ABS_SIMULATION_PALETTE__.distribution.find((item) => item.roleId === canvas.dataset.role);
    return {
      role: canvas.dataset.role, shape: Number(canvas.dataset.shape), pigment: Number(canvas.dataset.pigment),
      label: canvas.parentElement.nextElementSibling.textContent, expectedLabel: role.label, expectedPigment: role.colorIndex,
      display: getComputedStyle(canvas).display, background: getComputedStyle(canvas.parentElement).backgroundColor,
      radius: getComputedStyle(canvas.parentElement).borderRadius, image: canvas.toDataURL(),
    };
  }));
  assert.equal(new Set(legend.map((item) => item.role)).size, 6, 'Six distinct expertise roles');
  for (const item of legend) {
    assert.equal(item.label, item.expectedLabel);
    assert.equal(item.pigment, item.expectedPigment, 'Legend pigment follows the canonical distribution');
    assert.equal(item.shape, shape === -1 ? FANCY_ROLE_SHAPES[item.role] : shape);
    assert.equal(item.display, normal ? 'none' : 'block');
    if (normal) {
      assert.notEqual(item.background, 'rgba(0, 0, 0, 0)', 'Normal restores coloured dots');
      assert.notEqual(item.radius, '0px', 'Normal restores round dots');
    } else {
      assert.equal(item.background, 'rgba(0, 0, 0, 0)', 'No old circle behind a Fancy pattern');
    }
  }
  if (normal) return;
  if (shape === -1) assert.equal(new Set(legend.map((item) => item.shape)).size, 6, 'Six distinct primary patterns');

  // Inspect actual field draw calls, rather than a diagnostic that repeats the
  // intended mapping. Also compare each legend bitmap with the rendered atlas.
  const field = await frame.evaluate(async () => {
    const prototype = CanvasRenderingContext2D.prototype;
    const original = prototype.drawImage;
    const draws = new Map();
    let atlas = null;
    prototype.drawImage = function (...args) {
      if ((this.canvas.id === 'c' || this.canvas.id === 'flock-of-birds-canvas' || this.canvas.id === 'repel-room-canvas') && args[0]?.width === 280 && args.length === 9) {
        atlas = args[0];
        const key = `${args[1] / 40}:${args[2] / 40}`;
        // A faint, tiny transitional stamp does not contribute as much as a
        // fully drawn primary mark. Small Cohesion clusters can sample more
        // than 16% transitional cells without losing their visual identity.
        draws.set(key, (draws.get(key) || 0) + this.globalAlpha * args[7] * args[8]);
      }
      return original.apply(this, args);
    };
    try {
      for (let count = 0; count < 12; count += 1) await new Promise(requestAnimationFrame);
    } finally {
      prototype.drawImage = original;
    }
    const glyphs = [...document.querySelectorAll('#expertise-legend .fancy-legend-pattern')].map((canvas) => {
      const copy = document.createElement('canvas');
      copy.width = 40;
      copy.height = 40;
      if (atlas) copy.getContext('2d').drawImage(atlas, Number(canvas.dataset.shape) * 40,
        Number(canvas.dataset.pigment) * 40, 40, 40, 0, 0, 40, 40);
      return copy.toDataURL();
    });
    return { draws: [...draws], glyphs };
  });
  assert.ok(field.draws.length > 0, 'Inspected real particle field draws');
  const allowed = new Set(legend.map((item) => `${item.shape}:${item.pigment}`));
  let primary = 0;
  let total = 0;
  for (const [pair, contribution] of field.draws) {
    const disc = pair.startsWith('0:');
    assert.ok(disc || allowed.has(pair), `Every primary tile matches its legend shape and pigment: ${pair}`);
    total += contribution;
    if (allowed.has(pair)) primary += contribution;
  }
  assert.ok(primary / total >= 0.8, `Expertise patterns dominate visible pigment: ${(primary / total).toFixed(3)}`);
  assert.deepEqual(field.glyphs, legend.map((item) => item.image), 'Legend uses the exact field glyphs, including theme reversal');
  return { primaryShare: primary / total, roles: legend.map(({ role, shape: pattern, pigment }) => ({ role, shape: pattern, pigment })) };
}

async function auditLegendInteraction(frame) {
  const first = frame.getByRole('button', { name: 'Product Design', exact: true });
  await first.click();
  assert.equal(await first.getAttribute('aria-pressed'), 'true');
  assert.equal(await frame.locator('#legend-details-status').textContent(), await first.getAttribute('data-tooltip'));
  const next = frame.getByRole('button', { name: 'Experience Design', exact: true });
  await next.focus();
  await next.press('Enter');
  assert.equal(await first.getAttribute('aria-pressed'), 'false');
  assert.equal(await next.getAttribute('aria-pressed'), 'true');
  assert.equal(await frame.locator('#legend-details-status').textContent(), await next.getAttribute('data-tooltip'));
  await next.press('Enter');
  assert.equal(await next.getAttribute('aria-pressed'), 'false');
  assert.equal(await frame.locator('#legend-details-status').textContent(), '');
}

function watchErrors(page, label) {
  page.on('pageerror', (error) => errors.push(`${label}: ${error.message}`));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`${label}: ${message.text()}`);
  });
}

async function openFolder(page, label) {
  const button = page.getByRole('button', { name: label, exact: true });
  if (await button.getAttribute('aria-expanded') !== 'true') await button.click();
}

async function panelGeometry(page) {
  return page.locator('.parameterizer-panel').evaluate((panel) => {
    const rect = panel.getBoundingClientRect();
    const rows = [...panel.querySelectorAll('.parameterizer-row')].map((row) => row.getBoundingClientRect().height);
    const folders = [...panel.querySelectorAll('.parameterizer-folder-title')].map((title) => {
      const box = title.getBoundingClientRect();
      return { top: box.top, bottom: box.bottom, height: box.height };
    });
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, bottom: rect.bottom, right: rect.right, rows, folders, overflow: panel.scrollWidth > panel.clientWidth };
  });
}

async function auditStudyControls(page) {
  if (!homepage) return;
  const selector = await page.getByRole('combobox', { name: 'Simulation', exact: true }).evaluate((node) => {
    const rect = node.getBoundingClientRect();
    const style = getComputedStyle(node);
    const ctx = document.createElement('canvas').getContext('2d');
    ctx.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const textWidth = Math.max(...[...node.options].map((option) => ctx.measureText(option.text).width));
    return { width: rect.width, needed: textWidth + parseFloat(style.paddingLeft) + parseFloat(style.paddingRight),
      left: rect.left, right: rect.right, viewport: innerWidth };
  });
  assert.ok(selector.width >= selector.needed, 'Every simulation name fits the closed selector');
  assert.ok(selector.left >= 0 && selector.right <= selector.viewport, 'Simulation selector fits the viewport');
}

async function auditConfiguration(page, size, viewport, context) {
  await page.getByRole('button', { name: 'Tune', exact: true }).click();
  await openFolder(page, 'Ripples');
  const original = await panelGeometry(page);
  const frame = page.frames().find((item) => item !== page.mainFrame());
  const expected = { ...(await snapshot(frame)).config };
  assert.ok(FANCY_CONTROLS.length >= 12, 'At least ten additional visual controls');
  for (const group of FANCY_GROUPS) {
    await openFolder(page, group.label);
    const geometry = await panelGeometry(page);
    assert.equal(geometry.width, original.width, 'Opening a folder must preserve panel width');
    assert.equal(geometry.height, original.height, 'Opening a folder must preserve panel height');
    assert.equal(geometry.overflow, false, 'No horizontal panel overflow');
    for (const row of geometry.rows) assert.equal(row, 44, 'Stable touch row');
    for (const folder of geometry.folders) assert.ok(folder.top >= geometry.y && folder.bottom <= geometry.bottom, 'Every folder header stays visible');
    for (const control of FANCY_CONTROLS.filter((item) => item.group === group.id)) {
      const input = page.getByRole(control.type === 'boolean' ? 'checkbox' : control.type === 'select' ? 'combobox' : 'slider', { name: control.label, exact: true });
      let value;
      if (control.type === 'boolean') {
        value = false;
        await input.uncheck();
      } else if (control.type === 'select') {
        value = Number(await input.inputValue()) === control.options[0].value ? control.options.at(-1).value : control.options[0].value;
        await input.selectOption(String(value));
      } else {
        value = control.default === control.max ? control.min : control.max;
        await input.focus();
        await page.keyboard.press(control.default === control.max ? 'Home' : 'End');
      }
      expected[control.id] = value;
      await frame.waitForFunction(({ key, value: target }) => window.__ABS_FANCY_PREVIEW__.snapshot().config[key] === target, { key: control.id, value });
    }
    await page.screenshot({ path: resolve(output, `${size}-config-${group.id}.png`) });
  }
  assert.deepEqual((await snapshot(frame)).config, expected, 'Every control reaches the renderer');
  await auditLegend(frame, { shape: expected.shape });
  const savedUrl = page.url();
  assert.deepEqual(readFancyConfig(new URL(savedUrl).searchParams, defaults), expected, 'Every value is in the shareable URL');
  assert.deepEqual(readFancyConfig(fancySearchParams(expected, modes.at(-1)[0], defaults), defaults), expected, 'URL round-trip');
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.getByRole('button', { name: 'Copy link', exact: true }).click();
    assert.equal(await page.evaluate(() => navigator.clipboard.readText()), savedUrl);
  }
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export settings', exact: true }).click();
  const download = await downloadEvent;
  const exportPath = resolve(output, `${size}-export.json`);
  await download.saveAs(exportPath);
  const exported = JSON.parse(await readFile(exportPath, 'utf8'));
  assert.deepEqual(exported.config, expected, 'Export contains the complete settings');
  assert.equal(exported.url, savedUrl);

  await page.reload({ waitUntil: 'domcontentloaded' });
  let currentFrame = await readyFrame(page, modes.at(-1)[0]);
  assert.deepEqual((await snapshot(currentFrame)).config, expected, 'Reload restores all settings');
  for (const [mode, label] of modes) {
    await switchSimulation(page, mode, label);
    currentFrame = await readyFrame(page, mode);
    assert.deepEqual((await snapshot(currentFrame)).config, expected, `Settings survive switching to ${label}`);
    await auditLegend(currentFrame, { shape: expected.shape });
    const point = { x: viewport.width * 0.15, y: viewport.height * 0.56 };
    if (size === 'mobile') await page.touchscreen.tap(point.x, point.y);
    await page.mouse.move(point.x, point.y, { steps: 8 });
    await page.mouse.click(point.x, point.y);
    assert.equal((await snapshot(currentFrame)).ripples, 0, 'Disabled input and opening waves stay off');
  }

  // Check independent input gates, including live removal of existing waves.
  await page.getByRole('button', { name: 'Tune', exact: true }).click();
  await openFolder(page, 'Ripples');
  await page.getByRole('checkbox', { name: 'Touch ripples', exact: true }).check();
  await page.getByRole('button', { name: 'Close configuration' }).click();
  const point = { x: viewport.width * 0.18, y: viewport.height * 0.55 };
  if (size === 'mobile') {
    await page.touchscreen.tap(point.x, point.y);
    assert.ok((await snapshot(currentFrame)).rippleSources.includes('touch'));
  }
  await page.mouse.move(point.x + 80, point.y + 20, { steps: 8 });
  assert.ok(!(await snapshot(currentFrame)).rippleSources.includes('mouse'), 'Touch does not enable mouse waves');
  await page.getByRole('button', { name: 'Tune', exact: true }).click();
  await openFolder(page, 'Ripples');
  await page.getByRole('checkbox', { name: 'Touch ripples', exact: true }).uncheck();
  assert.equal((await snapshot(currentFrame)).ripples, 0, 'Switching off removes active touch waves');
  await page.getByRole('checkbox', { name: 'Mouse ripples', exact: true }).check();
  await page.getByRole('button', { name: 'Close configuration' }).click();
  await page.mouse.move(point.x + 110, point.y - 20, { steps: 8 });
  await page.mouse.click(point.x + 110, point.y - 20);
  assert.ok((await snapshot(currentFrame)).rippleSources.includes('mouse'));
  if (size === 'mobile') await page.touchscreen.tap(point.x, point.y);
  assert.ok(!(await snapshot(currentFrame)).rippleSources.includes('touch'), 'Mouse does not enable touch waves');

  await page.getByRole('button', { name: 'Tune', exact: true }).click();
  await openFolder(page, 'Ripples');
  await page.getByRole('checkbox', { name: 'Mouse ripples', exact: true }).uncheck();
  await page.getByRole('button', { name: 'Make a ripple', exact: true }).click();
  assert.ok((await snapshot(currentFrame)).rippleSources.includes('manual'), 'Manual ripple works with both input gates off');
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  assert.deepEqual((await snapshot(currentFrame)).config, { ...defaults, dark: expected.dark }, 'Reset restores the approved material defaults');
  await auditLegend(currentFrame);
  await openFolder(page, 'Patterns');
  await page.getByRole('button', { name: 'Artwork only', exact: true }).click();
  assert.equal(await currentFrame.locator('#simulation-title-canvas').evaluate((node) => getComputedStyle(node).visibility), 'hidden');
  await page.getByRole('button', { name: 'Artwork only', exact: true }).click();
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('button', { name: 'Tune', exact: true }).evaluate((node) => node === document.activeElement), true, 'Closing restores keyboard focus');
  results.push({ size, configControls: FANCY_CONTROLS.length, configurationRoundTrip: 'passed', inputGates: 'passed', panel: original });
  console.log(`${browserName}: ${size} all controls, export, reload, simulation persistence, input gates and panel geometry passed`);
}

try {
  if (!uiOnly) {
  for (const mobile of [false, true]) {
    const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 1000 };
    const context = await browser.newContext({ viewport, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, isMobile: mobile });
    await context.addInitScript(() => localStorage.setItem('theme-preference-v3', 'auto'));
    const page = await context.newPage();
    const size = mobile ? 'mobile' : 'desktop';
    watchErrors(page, size);
    await page.goto(`${origin}${labPath}`, { waitUntil: 'domcontentloaded' });
    for (const [mode, label] of modes) {
      if (mode !== 'pit') await switchSimulation(page, mode, label);
      const frame = await readyFrame(page, mode);
      const initial = await snapshot(frame);
      assert.equal(initial.mode, mode);
      assert.equal(initial.fancy, true);
      assert.ok(initial.particles > 0);
      if (homepage) {
        assert.equal(initial.cell, defaults.cell, 'Authored cell size on every viewport');
        assert.equal(initial.profile, mode, 'Per-simulation presentation applied');
      }
      assert.ok(initial.cells <= 24500);
      assert.ok(Number.isFinite(initial.frameMs));
      for (const dark of [true, false]) {
        const current = await snapshot(frame);
        if (current.dark !== dark) {
          await page.getByRole('button', { name: dark ? 'Switch to black background' : 'Switch to white background' }).click();
        }
        await frame.waitForFunction((expected) => window.__ABS_FANCY_PREVIEW__.snapshot().dark === expected, dark);
        const legend = await auditLegend(frame);
        assert.equal(await frame.locator('#simulations').evaluate((node) => getComputedStyle(node).backgroundColor), dark ? 'rgb(0, 0, 0)' : 'rgb(255, 255, 255)');
        const point = { x: viewport.width * 0.72, y: viewport.height * 0.62 };
        if (mobile) {
          await page.touchscreen.tap(point.x, point.y);
        } else {
          await page.mouse.move(viewport.width * 0.16, viewport.height * 0.70);
          await page.mouse.move(point.x, point.y, { steps: 16 });
        }
        if (initial.rippleStrength === 0 || (homepage && !mobile && !initial.mouseRipples)) {
          assert.equal((await snapshot(frame)).ripples, 0, 'Disabled or zero-strength input does not create waves');
        }
        else await frame.waitForFunction(() => window.__ABS_FANCY_PREVIEW__.snapshot().ripples > 0);
        await frame.waitForFunction((before) => window.__ABS_FANCY_PREVIEW__.snapshot().frames > before + 8, initial.frames);
        const filename = `${size}-${mode}-${dark ? 'black' : 'white'}.png`;
        await page.screenshot({ path: resolve(output, filename) });
        const controls = await page.locator('.fancy-controls__bar button').evaluateAll((buttons) => buttons.map((button) => {
          const box = button.getBoundingClientRect();
          return { label: button.textContent, x: box.x, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
        }));
        for (const control of controls) {
          assert.ok(control.height >= 44 && control.width >= 44, `Touch target: ${control.label}`);
          assert.ok(control.x >= 0 && control.right <= viewport.width && control.bottom <= viewport.height, `Control clipped: ${control.label}`);
        }
        results.push({ size, mode, ground: dark ? 'black' : 'white', screenshot: filename, legend, metrics: await snapshot(frame), performance: homepage ? await measureCadence(frame) : undefined });
      }
      await auditLegendInteraction(frame);
      await page.getByRole('button', { name: 'Fancy Mode', exact: true }).click();
      const normal = await snapshot(frame);
      if (homepage) results.push({ size, mode, finish: 'normal', performance: await measureCadence(frame) });
      assert.equal(normal.fancy, false);
      await auditLegend(frame, { normal: true });
      // The material swap must not leave the old grid painting over Normal.
      await page.waitForTimeout(220);
      assert.equal((await snapshot(frame)).frames, normal.frames);
      await page.screenshot({ path: resolve(output, `${size}-${mode}-normal.png`) });
      await page.getByRole('button', { name: 'Normal Mode', exact: true }).click();
      await frame.waitForFunction((before) => window.__ABS_FANCY_PREVIEW__.snapshot().frames > before, normal.frames);
      assert.equal(await frame.evaluate(() => localStorage.getItem('theme-preference-v3')), 'auto');
      console.log(`${browserName}: ${size} ${label} six legend/field patterns, black/white, pointer, Normal comparison and layout passed`);
    }
    await auditConfiguration(page, size, viewport, context);
    await context.close();
  }

  const reducedContext = await browser.newContext({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce', hasTouch: true });
  const reducedPage = await reducedContext.newPage();
  watchErrors(reducedPage, 'reduced-motion');
  await reducedPage.goto(`${origin}${labPath}?mode=flock-of-birds`, { waitUntil: 'domcontentloaded' });
  const reducedFrame = await readyFrame(reducedPage, 'flock-of-birds');
  assert.equal((await snapshot(reducedFrame)).reducedMotion, true);
  await reducedPage.getByRole('button', { name: 'Tune', exact: true }).click();
  await openFolder(reducedPage, 'Ripples');
  assert.equal(await reducedPage.getByRole('button', { name: 'Make a ripple', exact: true }).isDisabled(), true);
  await reducedPage.touchscreen.tap(250, 320);
  assert.equal((await snapshot(reducedFrame)).ripples, 0);
  await reducedPage.getByRole('button', { name: 'Fancy Mode', exact: true }).click();
  const reducedNormal = await snapshot(reducedFrame);
  await reducedPage.getByRole('button', { name: 'Normal Mode', exact: true }).click();
  assert.ok((await snapshot(reducedFrame)).frames > reducedNormal.frames, 'Reduced-motion material change must repaint');
  await reducedPage.screenshot({ path: resolve(output, 'reduced-motion.png') });
  results.push({ reducedMotion: await snapshot(reducedFrame) });
  await reducedContext.close();

  const paletteContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Europe/London' });
  const palettePage = await paletteContext.newPage();
  watchErrors(palettePage, 'palette-change');
  await palettePage.clock.install({ time: new Date('2026-09-13T07:30:00.000Z') });
  await palettePage.goto(`${origin}${labPath}?mode=pit&introRipple=0`);
  const paletteFrame = await readyFrame(palettePage, 'pit');
  const beforePalette = await snapshot(paletteFrame);
  const beforeLegend = await auditLegend(paletteFrame);
  const beforeImage = await paletteFrame.locator('.fancy-legend-pattern').first().evaluate((canvas) => canvas.toDataURL());
  await palettePage.clock.setSystemTime(new Date('2026-09-13T12:30:00.000Z'));
  await paletteFrame.evaluate(() => window.dispatchEvent(new Event('focus')));
  await paletteFrame.waitForFunction((before) => window.__ABS_FANCY_PREVIEW__.snapshot().palette !== before, beforePalette.palette);
  const afterLegend = await auditLegend(paletteFrame);
  assert.deepEqual(afterLegend.roles, beforeLegend.roles, 'Time-of-day palette changes preserve all six expertise patterns');
  assert.notEqual(await paletteFrame.locator('.fancy-legend-pattern').first().evaluate((canvas) => canvas.toDataURL()), beforeImage, 'Legend pigment updates with the field palette');
  assert.deepEqual((await snapshot(paletteFrame)).config, beforePalette.config, 'Palette refresh does not reset Fancy settings');
  await palettePage.screenshot({ path: resolve(output, 'palette-change.png') });
  results.push({ paletteChange: 'passed', from: beforePalette.palette, to: (await snapshot(paletteFrame)).palette, legend: afterLegend });
  await paletteContext.close();
  }

  const fitContext = await browser.newContext();
  const fitPage = await fitContext.newPage();
  watchErrors(fitPage, 'panel-fit');
  await fitPage.goto(`${origin}${labPath}?mode=flock-of-birds&introRipple=0`);
  await readyFrame(fitPage, 'flock-of-birds');
  await fitPage.getByRole('button', { name: 'Tune', exact: true }).click();
  for (const viewport of [{ width: 320, height: 568 }, { width: 600, height: 844 }, { width: 601, height: 844 }, { width: 844, height: 390 }]) {
    await fitPage.setViewportSize(viewport);
    const fitFrame = await readyFrame(fitPage, 'flock-of-birds');
    await auditStudyControls(fitPage);
    if (viewport.width <= 600) {
      const geometry = await fitFrame.evaluate(() => {
        const copy = document.querySelector('.ui-top-right').getBoundingClientRect();
        return [...document.querySelectorAll('#expertise-legend .legend__item')].map((item) => {
          const box = item.getBoundingClientRect();
          const label = item.querySelector('span');
          return { right: box.right, limit: copy.left, overflow: label.scrollWidth > label.clientWidth + 1 };
        });
      });
      assert.ok(geometry.every((item) => item.right <= item.limit && !item.overflow), 'Phone legend labels stay clear of the adjacent copy');
    }
    for (const group of FANCY_GROUPS) {
      await openFolder(fitPage, group.label);
      const panel = await panelGeometry(fitPage);
      assert.ok(panel.x >= 0 && panel.y >= 0 && panel.right <= viewport.width && panel.bottom <= viewport.height, 'Panel must fit the viewport');
      assert.equal(panel.overflow, false);
      assert.ok(panel.rows.every((height) => height === 44));
      assert.ok(panel.folders.every((folder) => folder.top >= panel.y && folder.bottom <= panel.bottom));
      assert.ok(await fitPage.locator('.parameterizer-scroll').evaluate((node) => node.clientHeight >= 44), 'At least one full control row remains visible');
    }
    await fitPage.screenshot({ path: resolve(output, `panel-${viewport.width}x${viewport.height}.png`) });
    results.push({ panelFit: viewport, status: 'passed' });
  }
  if (homepage) {
    await fitPage.getByRole('button', { name: 'Close configuration' }).click();
    await fitPage.getByRole('button', { name: 'About this study' }).click();
    await fitPage.getByRole('dialog').waitFor({ state: 'visible' });
    assert.equal(await fitPage.getByRole('dialog').evaluate((node) => node.scrollWidth > node.clientWidth), false, 'Study notes fit without horizontal scrolling');
    await fitPage.screenshot({ path: resolve(output, 'study-notes-landscape.png') });
    await fitPage.keyboard.press('Escape');
    await fitPage.getByRole('dialog').waitFor({ state: 'detached' });
    assert.equal(await fitPage.getByRole('button', { name: 'About this study' }).evaluate((node) => node === document.activeElement), true, 'Study notes restore focus');
    results.push({ studyNotes: 'passed', simulationLabels: 'passed' });
  }
  await fitContext.close();

  const isolationPage = await browser.newPage();
  await isolationPage.goto(`${origin}/index.html?mode=pit&fancyLab=1`);
  await isolationPage.locator('#c').waitFor();
  assert.equal(await isolationPage.evaluate(() => Boolean(window.__ABS_FANCY_PREVIEW__)), false);
  assert.equal(await isolationPage.evaluate(() => document.documentElement.classList.contains('fancy-preview')), false);
  assert.equal(await isolationPage.locator('.fancy-legend-pattern').count(), 0, 'Ordinary Home has no Fancy legend glyphs');
  results.push({ normalHomeIsolation: 'passed' });
  assert.deepEqual(errors, [], 'Browser errors');
  console.log(`${browserName}: ${uiOnly ? 'focused layout and study notes' : 'reduced motion, keyboard controls and preview-only theme'}, plus normal Home isolation passed`);
} finally {
  await writeFile(resolve(output, 'results.json'), JSON.stringify({ browser: browserName, origin, results, errors }, null, 2));
  await browser.close();
}
