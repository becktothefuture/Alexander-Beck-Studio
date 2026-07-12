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
const viewportFilter = String(process.env.ABS_THEME_VIEWPORT || '').trim().toLowerCase();
const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
].filter((viewport) => !viewportFilter || viewport.name === viewportFilter);
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
    const normalizeColor = (value) => {
      const probe = document.createElement('span');
      probe.style.color = value;
      probe.style.display = 'none';
      document.body.appendChild(probe);
      const normalized = getComputedStyle(probe).color;
      probe.remove();
      return normalized;
    };
    const browserChrome = getComputedStyle(root).getPropertyValue('--abs-browser-chrome').trim();
    const scene = document.querySelector('[data-portfolio-gate-scene]');
    return {
      path: location.pathname,
      phase: root.dataset.absTransitionPhase || 'idle',
      rootTheme: root.getAttribute('data-abs-theme'),
      bodyTheme: body?.getAttribute('data-abs-theme'),
      rootDark: root.classList.contains('dark-mode'),
      bodyDark: body?.classList.contains('dark-mode') || false,
      colorScheme: getComputedStyle(root).colorScheme,
      browserChrome,
      browserChromeResolved: normalizeColor(browserChrome),
      frameColor: getComputedStyle(root).getPropertyValue('--frame-color').trim(),
      frameColorLight: getComputedStyle(root).getPropertyValue('--frame-color-light').trim(),
      frameColorDark: getComputedStyle(root).getPropertyValue('--frame-color-dark').trim(),
      rootBackground: getComputedStyle(root).backgroundColor,
      bodyBackground: getComputedStyle(body).backgroundColor,
      themeColor: normalizeColor(document.querySelector('meta[name="theme-color"]:not([media])')?.content || ''),
      storedPreference: localStorage.getItem('theme-preference-v3'),
      legacyV2Preference: localStorage.getItem('theme-preference-v2'),
      activeRoute: document.querySelector('[data-route-tab][aria-current="page"]')?.getAttribute('data-route-tab') || '',
      gateScenePresent: Boolean(scene),
      gateSceneImageCount: scene?.querySelectorAll('img, picture, source').length || 0,
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
  // The boot overlay can clear one task before the async shell config reapplies
  // browser harmony. Give that projection a stable frame before comparing tabs.
  await page.waitForTimeout(180);
  const state = await readThemeState(page);
  const expectedDark = expectedTheme === 'dark';
  assert(state.rootTheme === expectedTheme, `${label}: root theme drifted`, state);
  assert(state.bodyTheme === expectedTheme, `${label}: body theme drifted`, state);
  assert(state.rootDark === expectedDark && state.bodyDark === expectedDark, `${label}: theme classes drifted`, state);
  assert(state.colorScheme.includes(expectedTheme), `${label}: color-scheme drifted`, state);
  assert(state.browserChrome && state.frameColor === state.browserChrome, `${label}: frame/browser chrome drifted`, state);
  assert(state.rootBackground === state.browserChromeResolved, `${label}: page background/browser chrome drifted`, state);
  assert(state.bodyBackground === state.browserChromeResolved, `${label}: body background/browser chrome drifted`, state);
  assert(state.themeColor === state.browserChromeResolved, `${label}: theme-color/browser chrome drifted`, state);
  return state;
}

function assertFrameMatches(state, expectedFrame, label) {
  assert(state.browserChrome === expectedFrame, `${label}: browser-frame palette changed across routes`, state);
}

async function waitForFrame(page, expectedFrame, label) {
  await page.waitForFunction((expected) => (
    getComputedStyle(document.documentElement).getPropertyValue('--abs-browser-chrome').trim() === expected
  ), expectedFrame, { timeout: waitMs });
  const state = await readThemeState(page);
  assertFrameMatches(state, expectedFrame, label);
  return state;
}

async function setStoredPreference(context, preference) {
  await context.addInitScript((value) => {
    if (sessionStorage.getItem('abs_theme_audit_seeded') === '1') return;
    localStorage.setItem('theme-preference-v3', value);
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
    await page.waitForFunction(() => {
      const scene = document.querySelector('[data-portfolio-gate-scene]');
      return Boolean(scene) && scene.querySelectorAll('img, picture, source').length === 0;
    }, undefined, { timeout: waitMs });
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
    assertFrameMatches(darkFirstTabState, lightFrame, `${viewport.name}/tab-one-dark`);
    assertFrameMatches(darkSecondTabState, lightFrame, `${viewport.name}/tab-two-storage-sync-dark`);
    assert((await readThemeState(secondPage)).storedPreference === 'dark', `${viewport.name}: dark preference did not sync`);

    for (const step of routeSteps) {
      await navigateByTab(firstPage, step, 'dark', lightFrame, viewport.name);
    }
    for (const step of auxiliaryRouteSteps) {
      await navigateDirect(firstPage, step, 'dark', lightFrame, viewport.name);
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
    const autoDarkState = await assertTheme(page, 'dark', `${viewport.name}/auto-system-dark`);
    const browserDarkFrame = autoDarkState.browserChrome;

    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    const autoLightState = await assertTheme(page, 'light', `${viewport.name}/auto-system-light`);
    const browserLightFrame = autoLightState.browserChrome;
    assert(browserDarkFrame === autoDarkState.frameColorDark, `${viewport.name}: dark browser scheme missed its authored frame palette`, autoDarkState);
    assert(browserLightFrame === autoLightState.frameColorLight, `${viewport.name}: light browser scheme missed its authored frame palette`, autoLightState);
    assert(browserLightFrame !== browserDarkFrame, `${viewport.name}: browser scheme did not change outer harmony`, {
      browserDarkFrame,
      browserLightFrame,
    });

    await activateThemeToggle(page, 'Switch to dark mode');
    const manualDarkOnLightBrowser = await assertTheme(page, 'dark', `${viewport.name}/manual-dark-after-auto`);
    assertFrameMatches(manualDarkOnLightBrowser, browserLightFrame, `${viewport.name}/manual-dark-after-auto`);

    await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' });
    await waitForFrame(page, browserDarkFrame, `${viewport.name}/manual-dark-browser-dark`);
    await assertTheme(page, 'dark', `${viewport.name}/manual-stays-dark-on-system-dark`);
    await page.emulateMedia({ colorScheme: 'light', reducedMotion: 'reduce' });
    await waitForFrame(page, browserLightFrame, `${viewport.name}/manual-dark-browser-light`);
    const state = await assertTheme(page, 'dark', `${viewport.name}/manual-ignores-system-change`);
    assert(state.storedPreference === 'dark', `${viewport.name}: manual override was not persisted`, state);
  } finally {
    await context.close();
  }
}

async function auditLegacyPreferenceMigration(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  await context.addInitScript(() => {
    localStorage.removeItem('theme-preference-v3');
    localStorage.setItem('theme-preference-v2', 'light');
    localStorage.removeItem('theme-preference');
  });
  const page = await context.newPage();

  try {
    await page.goto(url('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    const state = await assertTheme(page, 'dark', `${viewport.name}/legacy-v2-migrates-to-auto`);
    assert(state.storedPreference === 'auto', `${viewport.name}: legacy preference did not migrate to Auto`, state);
    assert(state.legacyV2Preference === null, `${viewport.name}: legacy v2 preference was not removed`, state);
  } finally {
    await context.close();
  }
}

async function auditMobileThemeReset(browser, viewport) {
  if (viewport.name !== 'mobile') return;
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    colorScheme: 'dark',
    reducedMotion: 'reduce',
  });
  await context.addInitScript(() => {
    localStorage.setItem('theme-preference-v3', 'light');
    localStorage.removeItem('theme-preference-v2');
  });
  const page = await context.newPage();

  try {
    await page.goto(url('/'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await assertTheme(page, 'light', `${viewport.name}/manual-light-before-device-reset`);
    const reset = page.locator('.button-bar__mobile-theme-reset');
    await reset.waitFor({ state: 'visible', timeout: waitMs });
    await reset.click();
    const state = await assertTheme(page, 'dark', `${viewport.name}/device-reset-follows-system-dark`);
    assert(state.storedPreference === 'auto', `${viewport.name}: device reset did not persist Auto`, state);
    assert(!(await reset.isVisible()), `${viewport.name}: device reset remained visible in Auto`);
    assert(await page.locator('.button-bar__sound-toggle').isVisible(), `${viewport.name}: sound control did not return after reset`);
  } finally {
    await context.close();
  }
}

async function main() {
  const server = await ensureServer();
  const browser = await browserType.launch();
  try {
    for (const viewport of viewports) {
      await auditLegacyPreferenceMigration(browser, viewport);
      await auditMobileThemeReset(browser, viewport);
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
