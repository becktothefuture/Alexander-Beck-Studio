#!/usr/bin/env node
// Opt-in canonical write audit. Restores every tested control in finally.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { chromium, webkit } from 'playwright';

const baseUrl = (process.env.ABS_WORK_URL || 'http://localhost:8012').replace(/\/$/, '');
const mirrorUrl = (process.env.ABS_WORK_MIRROR_URL || 'http://localhost:8014').replace(/\/$/, '');
assert(['localhost', '127.0.0.1'].includes(new URL(baseUrl).hostname),
  'Canonical control audit must use the local authoring origin.');
const writeEnabled = process.argv.includes('--save');
const buildEnabled = writeEnabled && process.argv.includes('--build');
const browserName = process.env.ABS_BROWSER || 'chromium';
const output = resolve('output/playwright/work-controls',
  `${new Date().toISOString().replace(/[:.]/g, '-')}-${browserName}`);
await mkdir(output, { recursive: true });
const configPath = 'react-app/app/public/config/design-system.json';
const readCanonical = async () => {
  // The shared multi-file authoring transaction has a short rename boundary.
  for (let attempt = 0; ; attempt += 1) {
    try { return JSON.parse(await readFile(configPath, 'utf8')); }
    catch (error) {
      if (error.code !== 'ENOENT' || attempt >= 40) throw error;
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }
};
const original = await readCanonical();
const testFields = { dotDensity: 0.31, dotRandomness: 0.19, dotOpacity: 0.81,
  itemDiagonalViewportRatio: 0.42, itemDiagonalMinPx: 508, itemDiagonalMaxPx: 648,
  snippetDepth: 0.18 };
const originalFields = Object.fromEntries(Object.keys(testFields).map((key) => [key, original.playground[key]]));
const browser = await (browserName === 'webkit' ? webkit : chromium).launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
page.setDefaultTimeout(30_000);
const guardedWrites = [];
let saved = false;
let expectedFields = testFields;
let report;

const withoutTestFields = (source) => {
  const copy = structuredClone(source);
  for (const key of Object.keys(testFields)) delete copy.playground[key];
  return copy;
};

await page.route('**/api/design-system/config', async (route) => {
  const proposed = route.request().postDataJSON().config;
  const latest = await readCanonical();
  const changedScopes = Object.keys(latest).filter((key) => key !== 'playground'
    && JSON.stringify(latest[key]) !== JSON.stringify(proposed[key]));
  // Refuse the write before it can overwrite another route or shell setting.
  try {
    assert.deepEqual(withoutTestFields(proposed), withoutTestFields(latest));
    for (const [key, value] of Object.entries(expectedFields)) assert.equal(proposed.playground[key], value);
  } catch {
    guardedWrites.push({ accepted: false, changedScopes });
    await route.fulfill({ status: 409, contentType: 'application/json', body: '{"error":"Unrelated configuration changes rejected by audit"}' });
    return;
  }
  guardedWrites.push({ accepted: true, writeEnabled });
  if (writeEnabled) {
    // Record possible mutation before HMR can interrupt response delivery.
    saved = true;
    await route.continue();
  }
  else await route.fulfill({ status: 200, contentType: 'application/json', body: '{"saved":true}' });
});

async function openControls() {
  const url = `${baseUrl}/portfolio.html`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded' });
  } catch (error) {
    // WebKit can receive the save's Vite reload during our explicit reload.
    // Accept only that same-page interruption, then verify the fresh runtime.
    if (!error.message.includes(`interrupted by another navigation to "${url}"`)) throw error;
    await page.waitForLoadState('domcontentloaded');
  }
  await page.waitForFunction(() => window.__ABS_WORK__?.getSnapshot().ready);
  const toggle = page.getByRole('button', { name: 'Toggle design panel' });
  if (await toggle.getAttribute('aria-pressed') !== 'true') await toggle.click();
  const grid = page.locator('[data-playground-folder="grid"]');
  if (!await grid.evaluate((element) => element.open)) await grid.locator('summary').click();
  await page.locator('#masterPanel[data-playground-controls-ready="true"]').waitFor();
}

async function setFields(fields) {
  for (const [id, value] of Object.entries(fields)) {
    await page.locator(`[data-playground-control="${id}"] input`).evaluate((input, value) => {
      input.value = String(value);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
    await page.waitForFunction(({ id, value }) => {
      const state = window.__ABS_WORK__?.getSnapshot();
      return state?.ready && (id.startsWith('dot') ? state.dotField[id]
        : window.__ABS_PLAYGROUND_CONFIG__?.[id]) === value;
    }, { id, value });
  }
}

async function sizingState(targetPage = page) {
  await targetPage.waitForFunction(() => {
    const state = window.__ABS_WORK__?.getSnapshot();
    const root = document.querySelector('[data-work-experience]');
    const config = window.__ABS_PLAYGROUND_CONFIG__;
    const viewport = document.querySelector('[data-playground-viewport]')?.getBoundingClientRect();
    const expected = config && viewport ? Math.min(config.itemDiagonalMaxPx, Math.max(config.itemDiagonalMinPx,
      Math.hypot(Math.round(viewport.width), Math.round(viewport.height)) * config.itemDiagonalViewportRatio)) : NaN;
    return state?.ready && !state.camera.frameScheduled && !state.dotField.frameScheduled
      && Math.abs(state.diagnostics.itemDiagonalPx - expected) < 0.01
      && Math.abs(Number(root?.querySelector('[data-work-plane="snippets"]')?.dataset.workParallax)
        - (1 - config.snippetDepth)) < 0.0001
      && root?.dataset.routeMaterialState === 'complete'
      && root.getAnimations({ subtree: true }).every((animation) =>
        animation.effect?.getTiming().iterations === Infinity || animation.playState !== 'running');
  });
  return targetPage.evaluate(() => {
    const state = window.__ABS_WORK__.getSnapshot();
    const config = window.__ABS_PLAYGROUND_CONFIG__;
    const viewport = document.querySelector('[data-playground-viewport]').getBoundingClientRect();
    const expected = Math.min(config.itemDiagonalMaxPx, Math.max(config.itemDiagonalMinPx,
      Math.hypot(Math.round(viewport.width), Math.round(viewport.height)) * config.itemDiagonalViewportRatio));
    const media = document.querySelector('[data-playground-item][data-work-item-kind="case-study"] .portfolio-project-card__surface').getBoundingClientRect();
    return { expected, actual: state.diagnostics.itemDiagonalPx, mediaDiagonal: Math.hypot(media.width, media.height),
      snippetParallax: Number(document.querySelector('[data-work-plane="snippets"]').dataset.workParallax),
      width: innerWidth, height: innerHeight, config: Object.fromEntries(Object.keys(config)
        .filter((key) => key.startsWith('itemDiagonal') || key === 'snippetDepth').map((key) => [key, config[key]])) };
  });
}

async function auditSizingControls() {
  const states = [];
  for (const scenario of [
    { id: 'itemDiagonalViewportRatio', value: 0.39, width: 960, height: 1120 },
    { id: 'itemDiagonalMinPx', value: 508, width: 390, height: 844 },
    { id: 'itemDiagonalMaxPx', value: 648, width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize({ width: scenario.width, height: scenario.height });
    await openControls();
    const before = await sizingState();
    await setFields({ [scenario.id]: scenario.value });
    const after = await sizingState();
    assert(Math.abs(after.actual - after.expected) < 0.01, JSON.stringify(after));
    assert(after.mediaDiagonal > before.mediaDiagonal + 5,
      `The ${scenario.id} control must visibly change media, not just a stored number.`);
    states.push({ id: scenario.id, before, after });
    await setFields({ [scenario.id]: originalFields[scenario.id] });
  }
  // A height-only resize must drive the same sizing model without a width event.
  await page.setViewportSize({ width: 960, height: 920 });
  const short = await sizingState();
  await page.setViewportSize({ width: 960, height: 1200 });
  const tall = await sizingState();
  assert(tall.actual > short.actual + 30, 'Image sizing must respond to height as well as width.');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openControls();
  return { controls: states, heightOnlyResize: { short, tall } };
}

async function auditDepthControl() {
  const before = await sizingState();
  const samples = [];
  for (const value of [0, 0.2]) {
    await setFields({ snippetDepth: value });
    const after = await sizingState();
    assert(Math.abs(after.snippetParallax - (1 - value)) < 0.0001);
    assert(Math.abs(after.mediaDiagonal - before.mediaDiagonal) < 0.05,
      'Depth changes travel and safe spacing, not preview-image size.');
    samples.push({ value, parallax: after.snippetParallax, mediaDiagonal: after.mediaDiagonal });
  }
  await setFields({ snippetDepth: originalFields.snippetDepth });
  await sizingState();
  return samples;
}

async function saveFields(fields) {
  expectedFields = fields;
  const previousWrites = guardedWrites.length;
  await page.locator('#savePlaygroundConfigBtn').click();
  // A real save triggers Vite HMR; the old button's status is not completion
  // evidence. Verify the guarded payload and the actual authored file instead.
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if (guardedWrites.length > previousWrites) {
      assert(guardedWrites.at(-1).accepted,
        `Canonical save tried to change unrelated scopes: ${JSON.stringify(guardedWrites)}`);
      const current = await readCanonical();
      if (!writeEnabled || Object.entries(fields).every(([key, value]) => current.playground[key] === value)) return;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  assert.fail('The Work save did not reach the canonical file.');
}

async function auditDetachedControls() {
  if (await page.getByRole('button', { name: 'Toggle design panel' }).getAttribute('aria-pressed') === 'true') {
    await page.locator('[data-playground-folder="grid"] > summary').focus();
    await page.keyboard.press('/');
  }
  const opened = page.waitForEvent('popup');
  await page.getByRole('button', { name: 'Toggle design panel' }).click({ modifiers: ['Shift'] });
  const detached = await opened;
  const grid = detached.locator('[data-playground-folder="grid"]');
  await grid.waitFor();
  await detached.locator('#masterPanel[data-playground-controls-ready="true"]').waitFor();
  if (!await grid.evaluate((element) => element.open)) await grid.locator('summary').click();
  const input = detached.locator('[data-playground-control="dotDensity"] input');
  assert.equal(Number(await input.inputValue()), testFields.dotDensity);
  await input.evaluate((input) => {
    input.value = '0.42';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  try {
    await page.waitForFunction(() => window.__ABS_WORK__.getSnapshot().dotField.dotDensity === 0.42,
      null, { timeout: 10_000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      visibility: document.visibilityState,
      dotField: window.__ABS_WORK__?.getSnapshot().dotField,
      localControl: document.querySelector('[data-playground-control="dotDensity"] input')?.value,
    }));
    const detachedState = await detached.evaluate(() => ({
      ready: document.querySelector('#masterPanel')?.dataset.playgroundControlsReady,
      value: document.querySelector('[data-playground-control="dotDensity"] input')?.value,
      visibility: document.visibilityState,
    }));
    throw new Error(`${error.message}\n${JSON.stringify({ state, detachedState })}`);
  }
  assert.equal(await detached.locator('[data-playground-control="dotRandomness"] input').count(), 1);
  for (const id of Object.keys(testFields).filter((key) => key.startsWith('itemDiagonal') || key === 'snippetDepth')) {
    assert.equal(await detached.locator(`[data-playground-control="${id}"] input`).count(), 1);
    assert.equal(Number(await detached.locator(`[data-playground-control="${id}"] input`).inputValue()), testFields[id]);
  }
  const maximum = detached.locator('[data-playground-control="itemDiagonalMaxPx"] input');
  await maximum.evaluate((input) => {
    input.value = '600'; input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => window.__ABS_WORK__?.getSnapshot()?.diagnostics.itemDiagonalPx === 600);
  await maximum.evaluate((input, value) => {
    input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true }));
  }, testFields.itemDiagonalMaxPx);
  const depth = detached.locator('[data-playground-control="snippetDepth"] input');
  await depth.evaluate((input) => {
    input.value = '0.08'; input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  try {
    await page.waitForFunction(() => Math.abs(Number(document.querySelector('[data-work-plane="snippets"]')
      ?.dataset.workParallax) - 0.92) < 0.0001, null, { timeout: 10_000 });
  } catch (error) {
    const state = await page.evaluate(() => ({
      visibility: document.visibilityState,
      configDepth: window.__ABS_PLAYGROUND_CONFIG__?.snippetDepth,
      parallax: document.querySelector('[data-work-plane="snippets"]')?.dataset.workParallax,
      ready: window.__ABS_WORK__?.getSnapshot().ready,
      localControl: document.querySelector('[data-playground-control="snippetDepth"] input')?.value,
    }));
    const detachedState = await depth.evaluate((input) => ({
      visibility: document.visibilityState, value: input.value,
      connected: input.isConnected, ready: document.querySelector('#masterPanel')?.dataset.playgroundControlsReady,
    }));
    throw new Error(`${error.message}\n${JSON.stringify({ state, detachedState })}`);
  }
  await depth.evaluate((input, value) => {
    input.value = String(value); input.dispatchEvent(new Event('input', { bubbles: true }));
  }, testFields.snippetDepth);
  await detached.screenshot({ path: resolve(output, 'detached-controls.png') });
  await input.evaluate((input, value) => {
    input.value = String(value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
  }, testFields.dotDensity);
  await detached.close();
  await openControls();
}

async function auditPublicMirror() {
  const mirrorContext = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  try {
    const mirror = await mirrorContext.newPage();
    await mirror.goto(`${mirrorUrl}/portfolio.html`, { waitUntil: 'domcontentloaded' });
    await mirror.waitForFunction(() => document.querySelector('[data-work-experience]')
      ?.dataset.playgroundInteractive === 'true');
    assert.equal(await mirror.locator('.panel-toggle-btn, #masterPanel').count(), 0,
      'The public mirror must not expose development editor controls.');
    for (const path of ['/api/config', '/api/design-system/config', '/@fs/etc/passwd']) {
      const response = await mirrorContext.request.get(`${mirrorUrl}${path}`);
      assert.equal(response.status(), 404, `The public mirror must block ${path}`);
    }
    await sizingState(mirror);
    await mirror.screenshot({ path: resolve(output, 'public-read-only-preview.png') });
    const sizing = [];
    for (const viewport of [{ width: 390, height: 844 }, { width: 960, height: 1120 }, { width: 1920, height: 1080 }]) {
      await mirror.setViewportSize(viewport);
      const state = await sizingState(mirror);
      assert(Math.abs(state.expected - state.actual) < 0.01, JSON.stringify(state));
      for (const [id, value] of Object.entries(writeEnabled ? testFields : originalFields)) {
        if (id.startsWith('itemDiagonal') || id === 'snippetDepth') assert.equal(state.config[id], value);
      }
      sizing.push(state);
    }
    return { editorAbsent: true, authoringApiBlocked: true, filesystemApiBlocked: true, sizing };
  } finally {
    await mirrorContext.close();
  }
}

try {
  await openControls();
  const sizing = await auditSizingControls();
  const depth = await auditDepthControl();
  const initialGeometry = await page.locator('#masterPanel').boundingBox();
  await setFields(testFields);
  const changedGeometry = await page.locator('#masterPanel').boundingBox();
  assert(Math.abs(initialGeometry.width - changedGeometry.width) < 1,
    'Dragging controls must not resize the panel shell.');
  await sizingState();
  await page.screenshot({ path: resolve(output, 'desktop-controls.png') });
  await saveFields(testFields);
  if (buildEnabled) {
    await promisify(execFile)('npm', ['run', 'build'], { maxBuffer: 4 * 1024 * 1024 });
    const built = JSON.parse(await readFile('react-app/app/dist/config/design-system.json', 'utf8'));
    for (const [id, value] of Object.entries(testFields)) assert.equal(built.playground[id], value);
  }
  if (writeEnabled) {
    const written = await readCanonical();
    assert.deepEqual(withoutTestFields(written), withoutTestFields(original));
    await openControls();
    for (const [id, value] of Object.entries(testFields)) {
      assert.equal(Number(await page.locator(`[data-playground-control="${id}"] input`).inputValue()), value);
      assert.equal(await page.evaluate((id) => id.startsWith('dot')
        ? window.__ABS_WORK__.getSnapshot().dotField[id] : window.__ABS_PLAYGROUND_CONFIG__[id], id), value);
    }
  }
  await auditDetachedControls();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => {
    const panel = document.querySelector('#masterPanel')?.getBoundingClientRect();
    return panel && panel.width <= innerWidth && panel.bottom <= innerHeight - 4;
  });
  const mobile = await page.locator('#masterPanel').boundingBox();
  assert(mobile.x >= -1 && mobile.x + mobile.width <= 391, JSON.stringify(mobile));
  await sizingState();
  await page.screenshot({ path: resolve(output, 'mobile-controls.png') });
  const publicMirror = await auditPublicMirror();
  report = { status: 'passed', browserName, writeEnabled, liveApply: true, detachedLiveApply: true, reload: saved,
    initialGeometry, changedGeometry, mobile, guardedWrites, publicMirror, sizing, depth,
    build: buildEnabled ? 'direct evidence: non-default clamp values in the built canonical configuration' : 'not run' };
} finally {
  try {
    if (saved) {
      await page.setViewportSize({ width: 1440, height: 1000 });
      await openControls();
      await setFields(originalFields);
      await saveFields(originalFields);
      assert.deepEqual(await readCanonical(), original, 'The audit must restore every canonical value.');
      if (report) report.restored = true;
    }
  } finally {
    await context.close();
    await browser.close();
  }
}
await writeFile(resolve(output, 'report.json'), JSON.stringify(report, null, 2));
console.log(`PASS: Work controls ${writeEnabled ? 'live apply, canonical save, reload, restoration' : 'guarded save payload'} (${browserName}).`);
console.log(`Report: ${resolve(output, 'report.json')}`);
