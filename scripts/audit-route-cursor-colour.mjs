import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const configuredBaseUrl = (process.env.ABS_ROUTE_CURSOR_URL || 'http://127.0.0.1:8012').trim().replace(/\/+$/, '');
const shouldStartDevServer = !process.env.ABS_ROUTE_CURSOR_URL;
const buttonBarOnly = process.env.ABS_ROUTE_CURSOR_BUTTON_BAR_ONLY === '1';
let baseUrl = configuredBaseUrl;
const routePaths = {
  home: '/index.html',
  portfolio: '/portfolio.html',
  about: '/about.html',
  contact: '/contact.html',
  playground: '/playground.html',
};
const routeOrder = Object.keys(routePaths);
const routeWaitMs = Number(process.env.ABS_ROUTE_CURSOR_WAIT_MS || 20000);
const expectedCursorBackground = 'rgba(148, 148, 148, 0.34)';

function log(message) {
  console.log(`[route-cursor] ${message}`);
}

async function waitForHttpReady(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = new Error(`unexpected HTTP ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(250);
  }
  throw new Error(`Dev server not ready at ${url}: ${lastError?.message || 'unknown error'}`);
}

async function findAvailablePort(startPort = 8012) {
  for (let port = startPort; port < startPort + 50; port += 1) {
    const isAvailable = await new Promise((resolve) => {
      const server = net.createServer();
      server.once('error', () => resolve(false));
      server.once('listening', () => {
        server.close(() => resolve(true));
      });
      server.listen(port, '127.0.0.1');
    });
    if (isAvailable) return port;
  }
  throw new Error(`Could not find an available port from ${startPort} to ${startPort + 49}`);
}

function startDevServer(port) {
  const child = spawn('npm', ['run', 'dev', '--prefix', 'react-app/app', '--', '--host', '127.0.0.1', '--port', String(port), '--strictPort'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });

  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk.toString(); });
  child.stderr.on('data', (chunk) => { logs += chunk.toString(); });

  return {
    child,
    getLogs: () => logs,
    stop: async () => {
      if (child.exitCode !== null) return;
      child.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveStop) => child.once('exit', resolveStop)),
        delay(2000),
      ]);
      if (child.exitCode === null) child.kill('SIGKILL');
    },
  };
}

async function ensureDevServer() {
  try {
    await waitForHttpReady(`${configuredBaseUrl}/index.html`, 2500);
    baseUrl = configuredBaseUrl;
    log(`using existing server at ${baseUrl}`);
    return null;
  } catch (error) {
    if (!shouldStartDevServer) throw error;
  }

  const port = await findAvailablePort(8012);
  baseUrl = `http://127.0.0.1:${port}`;
  const server = startDevServer(port);
  try {
    await waitForHttpReady(`${baseUrl}/index.html`, 15000);
    log(`started dev server at ${baseUrl}`);
    return server;
  } catch (error) {
    await server.stop();
    throw new Error(`${error.message}\n${server.getLogs()}`.trim());
  }
}

function routeUrl(routeId) {
  return `${baseUrl}${routePaths[routeId]}?absAudit=1`;
}

async function waitForRouteReady(page, routeId) {
  await page.waitForSelector('#app-frame', { timeout: routeWaitMs });
  await page.waitForFunction(
    (expectedRouteId) => {
      const root = document.documentElement;
      const activeTab = document.querySelector('[data-route-tab][aria-current="page"]');
      return (
        root.dataset.shellRoute === expectedRouteId
        && root.dataset.cursorRoute === expectedRouteId
        && activeTab?.getAttribute('data-route-tab') === expectedRouteId
        && ['ready', 'failed'].includes(root.dataset.absBootState)
      );
    },
    routeId,
    { timeout: routeWaitMs }
  );
}

async function readRouteCursorState(page, routeId) {
  return page.evaluate((expectedRouteId) => {
    const cursor = document.getElementById('custom-cursor');
    const cursorStyle = cursor ? getComputedStyle(cursor) : null;
    const activeTab = document.querySelector('[data-route-tab][aria-current="page"]');
    return {
      routeId: expectedRouteId,
      path: location.pathname,
      shellRoute: document.documentElement.dataset.shellRoute || '',
      cursorRoute: document.documentElement.dataset.cursorRoute || '',
      activeTab: activeTab?.getAttribute('data-route-tab') || '',
      cursorDisplay: cursorStyle?.display || '',
      cursorClass: cursor?.className || '',
      cursorWidth: cursorStyle?.width || '',
      cursorHeight: cursorStyle?.height || '',
      cursorOpacity: cursorStyle?.opacity || '',
      cursorTransform: cursorStyle?.transform || '',
      cursorBackground: cursorStyle?.backgroundColor || '',
      cursorBoxShadow: cursorStyle?.boxShadow || '',
      cursorZIndex: cursorStyle?.zIndex || '',
    };
  }, routeId);
}

function assertRouteCursorState(state) {
  for (const key of ['shellRoute', 'cursorRoute', 'activeTab']) {
    if (state[key] !== state.routeId) {
      throw new Error(`${state.routeId}: expected ${key}=${state.routeId}, got ${state[key] || '(empty)'}`);
    }
  }
  if (state.cursorDisplay !== 'block') {
    throw new Error(`${state.routeId}: expected standard cursor to be visible, got ${state.cursorDisplay || '(empty)'}`);
  }
  const cursorWidth = Number.parseFloat(state.cursorWidth);
  const cursorHeight = Number.parseFloat(state.cursorHeight);
  if (
    !Number.isFinite(cursorWidth)
    || !Number.isFinite(cursorHeight)
    || Math.abs(cursorWidth - 57.6) > 0.02
    || Math.abs(cursorHeight - 57.6) > 0.02
  ) {
    throw new Error(`${state.routeId}: expected 57.6px standard lens, got ${state.cursorWidth} × ${state.cursorHeight}`);
  }
  if (/abs-cursor-(?:tap|action-hover|project-hover)/.test(state.cursorClass)) {
    throw new Error(`${state.routeId}: legacy cursor mode remained active: "${state.cursorClass}"`);
  }
  if (state.cursorBackground !== expectedCursorBackground) {
    throw new Error(
      `${state.routeId}: standard lens material was ${state.cursorBackground || '(empty)'}, expected ${expectedCursorBackground}`
    );
  }
  if (state.cursorBoxShadow !== 'none') {
    throw new Error(`${state.routeId}: standard lens shadow was ${state.cursorBoxShadow || '(empty)'}, expected none`);
  }
}

async function moveInsideWindow(page) {
  const point = await page.evaluate(() => {
    const rect = document.getElementById('simulations')?.getBoundingClientRect();
    if (!rect) return null;
    return {
      x: Math.round(rect.left + rect.width * 0.5),
      y: Math.round(rect.top + rect.height * 0.5),
    };
  });
  if (!point) throw new Error('Could not find #simulations for cursor probe');
  await page.mouse.move(point.x, point.y);
  await page.waitForTimeout(80);
}

async function assertInactiveHoverDoesNotPreview(page, routeId) {
  const inactiveRouteId = routeOrder.find((candidate) => candidate !== routeId);
  await page.locator(`[data-route-tab="${inactiveRouteId}"]`).hover();
  await page.waitForTimeout(500);
  const state = await readRouteCursorState(page, routeId);
  assertClickableCursorState(state, `${routeId}: ${inactiveRouteId} tab`);
}

async function readCurrentRouteTabVisualState(page) {
  return page.evaluate(() => {
    const tab = document.querySelector('[data-route-tab][aria-current="page"]');
    const label = tab?.querySelector('.shell-tab__label');
    if (!tab || !label) return null;
    const tabStyle = getComputedStyle(tab);
    const tabBeforeStyle = getComputedStyle(tab, '::before');
    const labelStyle = getComputedStyle(label);
    const activePill = document.querySelector('.button-bar__active-pill');
    const activePillStyle = activePill ? getComputedStyle(activePill) : null;
    const rect = tab.getBoundingClientRect();
    return {
      routeId: tab.getAttribute('data-route-tab') || '',
      backgroundColor: tabStyle.backgroundColor,
      backgroundImage: tabStyle.backgroundImage,
      boxShadow: tabStyle.boxShadow,
      transform: tabStyle.transform,
      pseudoContent: tabBeforeStyle.content,
      activePillOpacity: activePillStyle?.opacity || '',
      rect: {
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      },
      focusVisible: tab.matches(':focus-visible'),
      labelBoxShadow: labelStyle.boxShadow,
      labelTextDecoration: labelStyle.textDecorationLine,
    };
  });
}

function assertSameTabGeometry(actual, expected, label) {
  for (const edge of ['left', 'top', 'width', 'height']) {
    if (Math.abs(actual.rect[edge] - expected.rect[edge]) > 0.02) {
      throw new Error(`${label}: current-route ${edge} changed from ${expected.rect[edge]} to ${actual.rect[edge]}`);
    }
  }
}

function assertCurrentTabSurfaceInvariant(actual, expected, label) {
  for (const property of ['backgroundColor', 'backgroundImage', 'boxShadow', 'transform']) {
    if (actual[property] !== expected[property]) {
      throw new Error(
        `${label}: current-route ${property} changed from ${expected[property]} to ${actual[property]}`,
      );
    }
  }
  assertSameTabGeometry(actual, expected, label);
}

async function assertCurrentRouteActivationNoOp(page, routeId) {
  const before = await page.evaluate(() => ({
    href: location.href,
    historyLength: history.length,
    transitionPhase: document.documentElement.dataset.absTransitionPhase || 'idle',
  }));
  const activation = await page.evaluate(() => {
    const tab = document.querySelector('[data-route-tab][aria-current="page"]');
    if (!tab) return null;
    tab.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      cancelable: true,
      button: 0,
      pointerType: 'mouse',
    }));
    const pointerPressStarted = tab.dataset.buttonBarPointerActivated === 'true';
    tab.dataset.buttonBarPointerActivated = 'true';
    const trailingClickPrevented = !tab.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      button: 0,
      detail: 1,
    }));
    const trailingPointerMarkerCleared = tab.dataset.buttonBarPointerActivated !== 'true';
    const events = [
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 1 }),
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, detail: 0 }),
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, metaKey: true }),
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ctrlKey: true }),
      new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, shiftKey: true }),
      new MouseEvent('auxclick', { bubbles: true, cancelable: true, button: 1 }),
    ];
    return {
      pointerPressStarted,
      trailingClickPrevented,
      trailingPointerMarkerCleared,
      activationsPrevented: events.map((event) => !tab.dispatchEvent(event)),
    };
  });
  await page.waitForTimeout(100);
  const after = await page.evaluate(() => ({
    href: location.href,
    historyLength: history.length,
    transitionPhase: document.documentElement.dataset.absTransitionPhase || 'idle',
  }));
  if (
    !activation
    || activation.pointerPressStarted
    || !activation.trailingClickPrevented
    || !activation.trailingPointerMarkerCleared
    || activation.activationsPrevented.some((prevented) => !prevented)
    || after.href !== before.href
    || after.historyLength !== before.historyLength
    || after.transitionPhase !== before.transitionPhase
  ) {
    throw new Error(`${routeId}: current route allowed navigation or started an interaction press`);
  }
}

async function assertCurrentRouteTabVisualInvariance(page, routeId) {
  await moveInsideWindow(page);
  const activeTab = page.locator('[data-route-tab][aria-current="page"]');
  const rest = await readCurrentRouteTabVisualState(page);
  if (!rest || rest.routeId !== routeId) {
    throw new Error(`${routeId}: current route tab was unavailable for visual-state checks`);
  }
  if (!['none', 'normal'].includes(rest.pseudoContent) || Number(rest.activePillOpacity) !== 1) {
    throw new Error(`${routeId}: current route rendered a selected surface outside the shared active pill`);
  }

  await activeTab.hover();
  await page.waitForTimeout(200);
  const hover = await readCurrentRouteTabVisualState(page);
  assertCurrentTabSurfaceInvariant(hover, rest, `${routeId}: hover`);
  const hoverCursor = await readRouteCursorState(page, routeId);
  if (hoverCursor.cursorClass.split(/\s+/).includes('abs-cursor-interactive')) {
    throw new Error(`${routeId}: current route activated the clickable cursor state`);
  }

  await page.mouse.down();
  const pressed = await readCurrentRouteTabVisualState(page);
  await page.mouse.up();
  assertCurrentTabSurfaceInvariant(pressed, rest, `${routeId}: press`);

  await moveInsideWindow(page);
  await page.keyboard.press('Tab');
  await activeTab.focus();
  await page.waitForTimeout(200);
  const focus = await readCurrentRouteTabVisualState(page);
  assertCurrentTabSurfaceInvariant(focus, rest, `${routeId}: keyboard focus`);
  if (!focus.focusVisible || focus.labelTextDecoration !== 'underline') {
    throw new Error(`${routeId}: current route lost its keyboard focus indicator`);
  }
  await assertCurrentRouteActivationNoOp(page, routeId);
}

function assertClickableCursorState(state, label) {
  if (!state.cursorClass.split(/\s+/).includes('abs-cursor-interactive')) {
    throw new Error(`${label} did not activate the standard clickable state`);
  }
  if (Math.abs(Number(state.cursorOpacity) - 0.72) > 0.01) {
    throw new Error(`${label} cursor opacity was ${state.cursorOpacity}, expected 0.72`);
  }
  const interactiveScale = Number(state.cursorTransform.match(/^matrix\(([^,]+)/)?.[1]);
  if (!Number.isFinite(interactiveScale) || Math.abs(interactiveScale * 57.6 - 20) > 0.01) {
    throw new Error(`${label} cursor transform was ${state.cursorTransform}, expected a 20px rendered lens`);
  }
}

async function assertPlaygroundCursorStates(page) {
  const viewport = page.locator('[data-playground-viewport]');
  const box = await viewport.boundingBox();
  if (!box) throw new Error('playground: drag surface was unavailable for cursor checks');
  const start = await page.evaluate(() => {
    const surface = document.querySelector('[data-playground-viewport]');
    const rect = surface?.getBoundingClientRect();
    if (!surface || !rect) return null;
    const ratios = [
      [0.5, 0.5],
      [0.1, 0.5],
      [0.9, 0.5],
      [0.5, 0.1],
      [0.5, 0.9],
    ];
    const clickableSelector = [
      'a[href]:not([aria-disabled="true"])',
      'button:not([disabled]):not([aria-disabled="true"])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'summary',
      '[role="button"]:not([aria-disabled="true"])',
      '[role="link"]:not([aria-disabled="true"])',
      '[tabindex]:not([tabindex="-1"]):not([aria-disabled="true"])',
    ].join(',');
    for (const [xRatio, yRatio] of ratios) {
      const x = Math.round(rect.left + rect.width * xRatio);
      const y = Math.round(rect.top + rect.height * yRatio);
      const target = document.elementFromPoint(x, y);
      const action = target?.closest(clickableSelector);
      if (
        target?.closest('[data-cursor-default-surface]') === surface
        && !target.closest('[data-playground-item]')
        && (!action || action === surface)
      ) {
        return { x, y };
      }
    }
    return null;
  });
  if (!start) throw new Error('playground: no empty drag-surface point was available for cursor checks');
  const end = { x: start.x + 36, y: start.y + 20 };

  await page.mouse.move(start.x, start.y);
  await page.waitForTimeout(260);
  let state = await readRouteCursorState(page, 'playground');
  if (state.cursorClass.split(/\s+/).includes('abs-cursor-interactive')) {
    throw new Error('playground: resting drag surface activated the smaller cursor');
  }

  const item = page.locator('[data-playground-item] button').first();
  await item.hover();
  await page.waitForTimeout(260);
  assertClickableCursorState(
    await readRouteCursorState(page, 'playground'),
    'playground: project item',
  );

  await page.mouse.move(start.x, start.y);
  await page.waitForTimeout(260);
  await page.mouse.down();
  await page.mouse.move(end.x, end.y, { steps: 3 });
  await page.waitForTimeout(80);
  state = await readRouteCursorState(page, 'playground');
  await page.mouse.up();
  if (state.cursorClass.split(/\s+/).includes('abs-cursor-interactive')) {
    throw new Error('playground: canvas drag activated the smaller cursor');
  }
}

async function assertHomeOverlayCursor(page) {
  await page.locator('.simulation-focus-switcher').click();
  await page.waitForSelector('.simulation-focus-modal.active', { timeout: routeWaitMs });

  for (const [label, locator] of [
    ['chooser row', page.locator('.simulation-focus-row').nth(1)],
    ['chooser close control', page.locator('.simulation-focus-modal .gate-back')],
  ]) {
    await locator.hover();
    await page.waitForTimeout(500);
    const state = await readRouteCursorState(page, 'home');
    assertRouteCursorState(state);
    assertClickableCursorState(state, `home: ${label}`);
    if (state.cursorZIndex !== '20000') {
      throw new Error(`home: ${label} cursor z-index was ${state.cursorZIndex}, expected modal level 20000`);
    }
  }

  await page.keyboard.press('Escape');
  await page.waitForSelector('.simulation-focus-modal', { state: 'hidden', timeout: routeWaitMs });
}

async function assertOuterShellKeepsCustomCursor(page, routeId) {
  const outside = await page.evaluate(() => {
    const rect = document.getElementById('simulations')?.getBoundingClientRect();
    if (!rect) return null;

    // Probe the middle of a real exposed wall band. The extreme viewport
    // corners sit outside the rounded physical frame and intentionally receive
    // a document-leave event in Chromium, so they are not outer-shell surface.
    const candidates = [
      { x: rect.left / 2, y: rect.top + rect.height / 2 },
      { x: rect.right + (innerWidth - rect.right) / 2, y: rect.top + rect.height / 2 },
      { x: rect.left + rect.width / 2, y: rect.top / 2 },
      { x: rect.left + rect.width / 2, y: rect.bottom + (innerHeight - rect.bottom) / 2 },
    ];
    const point = candidates.find(({ x, y }) => (
      x >= 1
      && x <= innerWidth - 2
      && y >= 1
      && y <= innerHeight - 2
      && (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom)
    ));
    if (!point) return null;
    return {
      x: Math.round(point.x),
      y: Math.round(point.y),
    };
  });
  if (!outside) {
    throw new Error(`${routeId}: no exposed outer-shell band was available for the cursor probe`);
  }
  await page.mouse.move(outside.x, outside.y);
  await page.waitForTimeout(80);
  const state = await readRouteCursorState(page, routeId);
  if (state.cursorDisplay !== 'block') {
    throw new Error(`${routeId}: standard cursor disappeared over the outer shell`);
  }
}

async function directLoadChecks(browser) {
  for (const routeId of routeOrder) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
    await context.addInitScript(() => {
      sessionStorage.setItem('abs_portfolio_ok', String(Date.now()));
      localStorage.setItem('theme-preference-v3', 'light');
    });
    const page = await context.newPage();
    await page.goto(routeUrl(routeId), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForRouteReady(page, routeId);
    await moveInsideWindow(page);
    const state = await readRouteCursorState(page, routeId);
    assertRouteCursorState(state);
    await assertInactiveHoverDoesNotPreview(page, routeId);
    await assertCurrentRouteTabVisualInvariance(page, routeId);
    if (buttonBarOnly) {
      log(`direct ${routeId}: Button Bar interaction states passed`);
      await context.close();
      continue;
    }
    await assertOuterShellKeepsCustomCursor(page, routeId);
    if (routeId === 'home') await assertHomeOverlayCursor(page);
    if (routeId === 'playground') await assertPlaygroundCursorStates(page);
    log(`direct ${routeId}: ${state.cursorWidth} neutral lens`);
    await context.close();
  }
}

async function spaChecks(browser) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
  await context.addInitScript(() => {
    sessionStorage.setItem('abs_portfolio_ok', String(Date.now()));
    localStorage.setItem('theme-preference-v3', 'dark');
  });
  const page = await context.newPage();
  await page.goto(routeUrl('home'), { waitUntil: 'domcontentloaded', timeout: 60000 });

  for (const routeId of routeOrder) {
    if (routeId !== 'home') {
      await page.evaluate((path) => {
        window.__ABS_SPA_NAVIGATE__(path, {});
      }, routePaths[routeId]);
    }
    await page.waitForURL((url) => url.pathname.endsWith(routePaths[routeId]), { timeout: routeWaitMs });
    await waitForRouteReady(page, routeId);
    await moveInsideWindow(page);
    const state = await readRouteCursorState(page, routeId);
    assertRouteCursorState(state);
    log(`spa ${routeId}: ${state.cursorWidth} neutral lens`);
  }

  await context.close();
}

async function responsiveButtonBarChecks(browser) {
  for (const width of [320, 390, 768, 1280]) {
    const context = await browser.newContext({ viewport: { width, height: 820 } });
    await context.addInitScript(() => {
      localStorage.setItem('theme-preference-v3', 'dark');
    });
    const page = await context.newPage();
    await page.goto(routeUrl('home'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForRouteReady(page, 'home');
    const state = await page.evaluate(() => {
      const tabs = [...document.querySelectorAll('[data-route-tab]')];
      return tabs.map((tab) => {
        const label = tab.querySelector('.shell-tab__label');
        const rect = tab.getBoundingClientRect();
        const labelRect = label?.getBoundingClientRect();
        return {
          routeId: tab.getAttribute('data-route-tab') || '',
          cellWidth: rect.width,
          labelFontSize: Number.parseFloat(getComputedStyle(label).fontSize),
          labelFits: Boolean(
            label
            && labelRect
            && label.scrollWidth <= label.clientWidth + 0.5
            && labelRect.left >= rect.left - 0.5
            && labelRect.right <= rect.right + 0.5
          ),
        };
      });
    });
    const expectedFontSize = width < 768 ? 10 : 12;
    const expectedCellWidth = width < 768 ? 62 : 85;
    for (const tab of state) {
      if (Math.abs(tab.labelFontSize - expectedFontSize) > 0.02) {
        throw new Error(
          `${width}px ${tab.routeId}: label was ${tab.labelFontSize}px, expected ${expectedFontSize}px`,
        );
      }
      if (Math.abs(tab.cellWidth - expectedCellWidth) > 0.02) {
        throw new Error(
          `${width}px ${tab.routeId}: route cell was ${tab.cellWidth}px, expected ${expectedCellWidth}px`,
        );
      }
      if (!tab.labelFits) {
        throw new Error(`${width}px ${tab.routeId}: route label clipped or overflowed its cell`);
      }
    }
    log(`responsive ${width}px: ${expectedFontSize}px labels in ${expectedCellWidth}px cells`);
    await context.close();
  }
}

async function run() {
  const server = await ensureDevServer();
  const browser = await chromium.launch();
  try {
    await responsiveButtonBarChecks(browser);
    await directLoadChecks(browser);
    if (!buttonBarOnly) await spaChecks(browser);
  } finally {
    await browser.close();
    await server?.stop();
  }
  log(buttonBarOnly
    ? 'PASS: Button Bar active states, route affordances, and responsive labels passed.'
    : 'PASS: one 57.6px neutral lens persists across routes and the outer shell, with one smaller/quieter clickable state.');
}

run().catch((error) => {
  console.error(`[route-cursor] FAIL: ${error.message}`);
  process.exit(1);
});
