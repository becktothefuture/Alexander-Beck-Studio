import { spawn } from 'node:child_process';
import net from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import process from 'node:process';
import { chromium } from 'playwright';

const configuredBaseUrl = (process.env.ABS_ROUTE_CURSOR_URL || 'http://127.0.0.1:8012').trim().replace(/\/+$/, '');
const shouldStartDevServer = !process.env.ABS_ROUTE_CURSOR_URL;
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
  if (state.cursorWidth !== '48px' || state.cursorHeight !== '48px') {
    throw new Error(`${state.routeId}: expected 48px standard lens, got ${state.cursorWidth} × ${state.cursorHeight}`);
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

function assertClickableCursorState(state, label) {
  if (!state.cursorClass.split(/\s+/).includes('abs-cursor-interactive')) {
    throw new Error(`${label} did not activate the standard clickable state`);
  }
  if (Math.abs(Number(state.cursorOpacity) - 0.72) > 0.01) {
    throw new Error(`${label} cursor opacity was ${state.cursorOpacity}, expected 0.72`);
  }
  const interactiveScale = Number(state.cursorTransform.match(/^matrix\(([^,]+)/)?.[1]);
  if (!Number.isFinite(interactiveScale) || Math.abs(interactiveScale * 48 - 20) > 0.01) {
    throw new Error(`${label} cursor transform was ${state.cursorTransform}, expected a 20px rendered lens`);
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
    if (!rect) return { x: 2, y: 2 };
    return {
      x: Math.max(1, Math.round(rect.left - 16)),
      y: Math.max(1, Math.round(rect.top - 16)),
    };
  });
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
    await assertOuterShellKeepsCustomCursor(page, routeId);
    if (routeId === 'home') await assertHomeOverlayCursor(page);
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

async function run() {
  const server = await ensureDevServer();
  const browser = await chromium.launch();
  try {
    await directLoadChecks(browser);
    await spaChecks(browser);
  } finally {
    await browser.close();
    await server?.stop();
  }
  log('PASS: one 48px neutral lens persists across routes and the outer shell, with one smaller/quieter clickable state.');
}

run().catch((error) => {
  console.error(`[route-cursor] FAIL: ${error.message}`);
  process.exit(1);
});
