import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

import { chromium, webkit } from 'playwright';

const baseUrl = (process.env.ABS_DEV_URL || 'http://localhost:8012').trim().replace(/\/+$/, '');
const browserName = (process.env.ABS_BROWSER || 'chromium').trim().toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const outputDir = path.resolve('output/playwright/viewport-cover', browserName);

const routes = [
  ['home', '/index.html'],
  ['work', '/portfolio.html'],
  ['about', '/about.html'],
  ['lab', '/playground.html'],
  ['contact', '/contact.html'],
];

const coveredViewports = [
  ['mobile-landscape', { width: 844, height: 390 }],
  ['short', { width: 1280, height: 500 }],
  ['wide', { width: 1440, height: 500 }],
  ['tall', { width: 320, height: 1000 }],
];

const supportedViewports = [
  ['desktop', { width: 1440, height: 1000 }],
  ['laptop', { width: 1280, height: 720 }],
  ['tablet', { width: 1024, height: 768 }],
  ['portrait-mobile', { width: 390, height: 844 }],
  ['narrow-portrait-mobile', { width: 375, height: 667 }],
  ['ultrawide', { width: 3440, height: 1440 }],
];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function readCoverState(page) {
  return page.evaluate(() => {
    const root = document.getElementById('root');
    const cover = document.querySelector('.viewport-cover');
    const heading = document.getElementById('viewport-cover-title');
    return {
      mode: cover?.getAttribute('data-viewport-mode') || null,
      role: cover?.getAttribute('role') || null,
      modal: cover?.getAttribute('aria-modal') || null,
      headingFocused: document.activeElement === heading,
      rootInert: Boolean(root?.inert || root?.hasAttribute('inert')),
      rootHidden: root?.getAttribute('aria-hidden') === 'true',
      coverActive: document.documentElement.dataset.absViewportCover === 'active',
    };
  });
}

async function assertCovered(page, routeId, expectedMode) {
  const cover = page.locator('.viewport-cover');
  await cover.waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('#viewport-cover-title').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.activeElement?.id === 'viewport-cover-title');
  const state = await readCoverState(page);
  assert(state.mode === expectedMode, `${routeId}: expected ${expectedMode}, received ${state.mode}`);
  assert(state.role === 'dialog' && state.modal === 'true', `${routeId}: cover lost modal semantics`);
  assert(state.headingFocused, `${routeId}: cover heading did not receive focus`);
  assert(state.rootInert, `${routeId}: application root is not inert`);
  assert(state.rootHidden, `${routeId}: application root is not hidden from assistive technology`);
  assert(state.coverActive, `${routeId}: document cover marker is missing`);
  return state;
}

async function assertRecovered(page, routeId) {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.locator('.viewport-cover').waitFor({ state: 'detached', timeout: 30_000 });
  await page.waitForFunction(() => {
    const root = document.getElementById('root');
    return document.documentElement.dataset.absBootState !== 'booting'
      && !root?.hasAttribute('inert')
      && root?.getAttribute('aria-hidden') !== 'true';
  }, null, { timeout: 30_000 });
  const state = await readCoverState(page);
  assert(!state.mode && !state.coverActive, `${routeId}: cover state persisted after recovery`);
  assert(!state.rootInert && !state.rootHidden, `${routeId}: application root stayed unavailable after recovery`);
}

await mkdir(outputDir, { recursive: true });
const browser = await browserType.launch({ headless: true });
const results = { browser: browserName, baseUrl, covered: [], supported: [] };

try {
  for (const [routeId, routePath] of routes) {
    for (const [mode, viewport] of coveredViewports) {
      const page = await browser.newPage({ viewport });
      await page.goto(`${baseUrl}${routePath}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
      const state = await assertCovered(page, routeId, mode);
      const screenshot = path.join(outputDir, `${routeId}-${mode}.png`);
      await page.screenshot({ path: screenshot });
      results.covered.push({ routeId, routePath, mode, viewport, state, screenshot });
      if (mode === 'mobile-landscape') await assertRecovered(page, routeId);
      await page.close();
    }
  }

  for (const [name, viewport] of supportedViewports) {
    const page = await browser.newPage({ viewport });
    await page.goto(`${baseUrl}/about.html`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForTimeout(250);
    const state = await readCoverState(page);
    assert(!state.mode, `${name}: supported About viewport received ${state.mode} cover`);
    results.supported.push({ name, viewport, state });
    await page.close();
  }
} finally {
  await browser.close();
}

await writeFile(path.join(outputDir, 'report.json'), `${JSON.stringify(results, null, 2)}\n`);
console.log(`Viewport cover audit passed in ${browserName}: ${results.covered.length} covered route states and ${results.supported.length} supported About viewports.`);
