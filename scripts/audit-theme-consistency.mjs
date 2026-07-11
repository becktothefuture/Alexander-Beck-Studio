#!/usr/bin/env node
import { spawn } from 'node:child_process';
import process from 'node:process';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseUrl = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').replace(/\/$/, '');
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const shouldStartDevServer = !process.env.ABS_DEV_URL;
const waitMs = Number(process.env.ABS_THEME_WAIT_MS || 30000);
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const routeSteps = [
  { id: 'about', path: '/about.html' },
  { id: 'contact', path: '/contact.html' },
  { id: 'portfolio', path: '/portfolio.html' },
  { id: 'home', path: '/index.html' },
];
const auxiliaryRouteSteps = [
  { id: 'styleguide', path: '/styleguide.html' },
  { id: 'palette-lab', path: '/palette-lab.html' },
];

function url(pathname) {
  return new URL(pathname, `${baseUrl}/`).toString();
}

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

async function waitForHttpReady(timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url('/'));
      if (response.ok) return;
      lastError = new Error(`HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }
  throw new Error(`Theme audit server unavailable at ${baseUrl}: ${lastError?.message || 'unknown error'}`);
}

function startDevServer() {
  const child = spawn('npm', ['run', 'dev:react', '--', '--host', '127.0.0.1'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += String(chunk); });
  child.stderr.on('data', (chunk) => { logs += String(chunk); });
  return { child, getLogs: () => logs };
}

async function ensureServer() {
  try {
    await waitForHttpReady(1500);
    return null;
  } catch (error) {
    if (!shouldStartDevServer) throw error;
  }

  const server = startDevServer();
  try {
    await waitForHttpReady();
    return server;
  } catch (error) {
    server.child.kill('SIGTERM');
    throw new Error(`${error.message}\n${server.getLogs()}`.trim());
  }
}

async function readThemeState(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const body = document.body;
    const teaser = document.querySelector('[data-portfolio-gate-teaser]');
    const teaserImage = teaser?.querySelector('img');
    return {
      path: location.pathname,
      phase: root.dataset.absTransitionPhase || 'idle',
      rootTheme: root.getAttribute('data-abs-theme'),
      bodyTheme: body?.getAttribute('data-abs-theme'),
      rootDark: root.classList.contains('dark-mode'),
      bodyDark: body?.classList.contains('dark-mode') || false,
      colorScheme: getComputedStyle(root).colorScheme,
      browserChrome: getComputedStyle(root).getPropertyValue('--abs-browser-chrome').trim(),
      frameColor: getComputedStyle(root).getPropertyValue('--frame-color').trim(),
      storedPreference: localStorage.getItem('theme-preference-v2'),
      activeRoute: document.querySelector('[data-route-tab][aria-current="page"]')?.getAttribute('data-route-tab') || '',
      teaserTheme: teaser?.getAttribute('data-portfolio-gate-theme') || '',
      teaserSrc: teaserImage?.currentSrc || teaserImage?.src || '',
      teaserReady: teaserImage ? teaserImage.complete && teaserImage.naturalWidth > 0 : null,
    };
  });
}

async function waitForTheme(page, expectedTheme) {
  await page.waitForFunction((theme) => {
    const root = document.documentElement;
    const body = document.body;
    const overlay = document.getElementById('abs-boot-overlay');
    const overlayHidden = !overlay
      || getComputedStyle(overlay).display === 'none'
      || Number.parseFloat(getComputedStyle(overlay).opacity || '1') < 0.02;
    return root.getAttribute('data-abs-theme') === theme
      && body?.getAttribute('data-abs-theme') === theme
      && root.classList.contains('dark-mode') === (theme === 'dark')
      && body?.classList.contains('dark-mode') === (theme === 'dark')
      && Boolean(document.querySelector('.button-bar__theme-toggle'))
      && root.dataset.absBootState !== 'booting'
      && overlayHidden;
  }, expectedTheme, { timeout: waitMs });
}

async function assertTheme(page, expectedTheme, label) {
  await waitForTheme(page, expectedTheme);
  const state = await readThemeState(page);
  const expectedDark = expectedTheme === 'dark';
  assert(state.rootTheme === expectedTheme, `${label}: root theme drifted`, state);
  assert(state.bodyTheme === expectedTheme, `${label}: body theme drifted`, state);
  assert(state.rootDark === expectedDark && state.bodyDark === expectedDark, `${label}: theme classes drifted`, state);
  assert(state.colorScheme.includes(expectedTheme), `${label}: color-scheme drifted`, state);
  assert(state.browserChrome && state.frameColor === state.browserChrome, `${label}: frame/browser chrome drifted`, state);
  return state;
}

function assertFrameMatches(state, expectedFrame, label) {
  assert(state.browserChrome === expectedFrame, `${label}: browser-frame palette changed across routes`, state);
}

async function setStoredPreference(context, preference) {
  await context.addInitScript((value) => {
    if (sessionStorage.getItem('abs_theme_audit_seeded') === '1') return;
    localStorage.setItem('theme-preference-v2', value);
    localStorage.removeItem('theme-preference');
    sessionStorage.removeItem('abs_portfolio_ok');
    localStorage.removeItem('abs_portfolio_ok');
    sessionStorage.setItem('abs_theme_audit_seeded', '1');
  }, preference);
}

async function activateThemeToggle(page, expectedLabel) {
  const toggle = page.locator('.button-bar__theme-toggle');
  await toggle.waitFor({ state: 'attached', timeout: waitMs });
  assert(await toggle.getAttribute('aria-label') === expectedLabel, `Unexpected theme-toggle action: ${expectedLabel}`);
  if (await toggle.isVisible()) {
    await toggle.click();
  } else {
    // The compact mobile bar intentionally hides this control; dispatching the
    // same React click still verifies persistence for a choice made elsewhere.
    await toggle.dispatchEvent('click');
  }
}

async function navigateByTab(page, step, expectedTheme, expectedFrame, viewportName) {
  console.log(`[theme-consistency] navigate ${viewportName} -> ${step.id}`);
  await page.locator(`[data-route-tab="${step.id}"]`).click();
  try {
    await page.waitForFunction((routeId) => (
      document.querySelector(`[data-route-tab="${routeId}"]`)?.getAttribute('aria-current') === 'page'
      && (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
    ), step.id, { timeout: waitMs });
  } catch (error) {
    throw new Error(`${viewportName}/${step.id}: route did not settle\n${JSON.stringify(await readThemeState(page), null, 2)}`, { cause: error });
  }
  const state = await assertTheme(page, expectedTheme, `${viewportName}/${step.id}`);
  assert(state.path === step.path, `${viewportName}/${step.id}: unexpected route`, state);
  assertFrameMatches(state, expectedFrame, `${viewportName}/${step.id}`);

  if (step.id === 'portfolio') {
    await page.waitForFunction((theme) => {
      const teaser = document.querySelector('[data-portfolio-gate-teaser]');
      const image = teaser?.querySelector('img');
      return teaser?.getAttribute('data-portfolio-gate-theme') === theme
        && image?.complete
        && image.naturalWidth > 0
        && image.currentSrc.includes(`-${theme}.jpg`);
    }, expectedTheme, { timeout: waitMs });
  }
}

async function navigateDirect(page, step, expectedTheme, expectedFrame, viewportName) {
  console.log(`[theme-consistency] direct ${viewportName} -> ${step.id}`);
  await page.goto(url(step.path), { waitUntil: 'domcontentloaded', timeout: 60000 });
  const state = await assertTheme(page, expectedTheme, `${viewportName}/${step.id}`);
  assert(state.path === step.path, `${viewportName}/${step.id}: unexpected direct route`, state);
  assertFrameMatches(state, expectedFrame, `${viewportName}/${step.id}`);
}

async function auditManualAndTabs(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  await setStoredPreference(context, 'light');
  const firstPage = await context.newPage();
  const secondPage = await context.newPage();

  try {
    await Promise.all([
      firstPage.goto(url('/'), { waitUntil: 'domcontentloaded', timeout: 60000 }),
      secondPage.goto(url('/about.html'), { waitUntil: 'domcontentloaded', timeout: 60000 }),
    ]);
    const [initialHomeState, initialSecondTabState] = await Promise.all([
      assertTheme(firstPage, 'light', `${viewport.name}/manual-initial-home`),
      assertTheme(secondPage, 'light', `${viewport.name}/manual-initial-second-tab`),
    ]);
    const lightFrame = initialHomeState.browserChrome;
    assertFrameMatches(initialSecondTabState, lightFrame, `${viewport.name}/manual-initial-second-tab`);

    for (const step of routeSteps) {
      await navigateByTab(firstPage, step, 'light', lightFrame, viewport.name);
    }
    for (const step of auxiliaryRouteSteps) {
      await navigateDirect(firstPage, step, 'light', lightFrame, viewport.name);
    }

    await firstPage.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await assertTheme(firstPage, 'light', `${viewport.name}/manual-reload`);

    await activateThemeToggle(firstPage, 'Switch to dark mode');
    const [darkFirstTabState, darkSecondTabState] = await Promise.all([
      assertTheme(firstPage, 'dark', `${viewport.name}/tab-one-dark`),
      assertTheme(secondPage, 'dark', `${viewport.name}/tab-two-storage-sync-dark`),
    ]);
    const darkFrame = darkFirstTabState.browserChrome;
    assertFrameMatches(darkSecondTabState, darkFrame, `${viewport.name}/tab-two-storage-sync-dark`);
    assert((await readThemeState(secondPage)).storedPreference === 'dark', `${viewport.name}: dark preference did not sync`);

    for (const step of routeSteps) {
      await navigateByTab(firstPage, step, 'dark', darkFrame, viewport.name);
    }
    for (const step of auxiliaryRouteSteps) {
      await navigateDirect(firstPage, step, 'dark', darkFrame, viewport.name);
    }

    await activateThemeToggle(secondPage, 'Switch to light mode');
    const [restoredFirstTabState, restoredSecondTabState] = await Promise.all([
      assertTheme(firstPage, 'light', `${viewport.name}/tab-one-storage-sync-light`),
      assertTheme(secondPage, 'light', `${viewport.name}/tab-two-light`),
    ]);
    assertFrameMatches(restoredFirstTabState, lightFrame, `${viewport.name}/tab-one-storage-sync-light`);
    assertFrameMatches(restoredSecondTabState, lightFrame, `${viewport.name}/tab-two-light`);

    for (const step of routeSteps) {
      await navigateByTab(firstPage, step, 'light', lightFrame, viewport.name);
    }
  } finally {
    await context.close();
  }
}

async function auditAutomaticPreference(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  await setStoredPreference(context, 'auto');
  const page = await context.newPage();

  try {
    await page.goto(url('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await assertTheme(page, 'dark', `${viewport.name}/auto-system-dark`);

    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await assertTheme(page, 'light', `${viewport.name}/auto-system-light`);

    await activateThemeToggle(page, 'Switch to dark mode');
    await assertTheme(page, 'dark', `${viewport.name}/manual-dark-after-auto`);

    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await assertTheme(page, 'dark', `${viewport.name}/manual-stays-dark-on-system-dark`);
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await delay(150);
    const state = await assertTheme(page, 'dark', `${viewport.name}/manual-ignores-system-change`);
    assert(state.storedPreference === 'dark', `${viewport.name}: manual override was not persisted`, state);
  } finally {
    await context.close();
  }
}

async function main() {
  const server = await ensureServer();
  const browser = await browserType.launch();
  try {
    for (const viewport of viewports) {
      await auditManualAndTabs(browser, viewport);
      await auditAutomaticPreference(browser, viewport);
      console.log(`[theme-consistency] PASS ${browserName}/${viewport.name}`);
    }
  } finally {
    await browser.close();
    server?.child.kill('SIGTERM');
  }

  console.log(`PASS: theme persistence, SPA routes, browser tabs, mobile, and Auto behavior (${browserName})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
