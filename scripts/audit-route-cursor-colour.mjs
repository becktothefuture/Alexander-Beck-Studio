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
};
const routeOrder = Object.keys(routePaths);
const routeWaitMs = Number(process.env.ABS_ROUTE_CURSOR_WAIT_MS || 20000);

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
    const normalize = (value) => String(value || '').trim().replace(/\s+/g, ' ');
    const resolveColor = (expression) => {
      const probe = document.createElement('div');
      probe.style.cssText =
        `position:fixed;left:-9999px;top:0;visibility:hidden;pointer-events:none;color:${expression};`;
      document.documentElement.appendChild(probe);
      const value = getComputedStyle(probe).color;
      probe.remove();
      return normalize(value);
    };
    const rootStyle = getComputedStyle(document.documentElement);
    const cursor = document.getElementById('custom-cursor');
    const activeTab = document.querySelector('[data-route-tab][aria-current="page"]');
    return {
      routeId: expectedRouteId,
      path: location.pathname,
      shellRoute: document.documentElement.dataset.shellRoute || '',
      cursorRoute: document.documentElement.dataset.cursorRoute || '',
      activeTab: activeTab?.getAttribute('data-route-tab') || '',
      cursorColor: resolveColor(rootStyle.getPropertyValue('--cursor-color')),
      routeAccent: resolveColor(`var(--button-bar-accent-${expectedRouteId})`),
      cursorDisplay: cursor ? getComputedStyle(cursor).display : '',
      cursorClass: cursor?.className || '',
    };
  }, routeId);
}

function assertRouteCursorState(state) {
  for (const key of ['shellRoute', 'cursorRoute', 'activeTab']) {
    if (state[key] !== state.routeId) {
      throw new Error(`${state.routeId}: expected ${key}=${state.routeId}, got ${state[key] || '(empty)'}`);
    }
  }
  if (state.cursorColor !== state.routeAccent) {
    throw new Error(`${state.routeId}: cursor ${state.cursorColor} did not match active tab accent ${state.routeAccent}`);
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
  const before = await readRouteCursorState(page, routeId);
  await page.locator(`[data-route-tab="${inactiveRouteId}"]`).hover();
  await page.waitForTimeout(120);
  const after = await readRouteCursorState(page, routeId);
  if (after.cursorColor !== before.cursorColor || after.cursorRoute !== routeId) {
    throw new Error(`${routeId}: inactive ${inactiveRouteId} hover changed cursor route/color`);
  }
}

async function assertOutsideWindowHidesCustomCursor(page, routeId) {
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
  if (state.cursorDisplay !== 'none') {
    throw new Error(`${routeId}: custom cursor remained visible outside the studio window`);
  }
}

async function assertTapRingRoute(page, routeId) {
  await moveInsideWindow(page);
  const state = await readRouteCursorState(page, routeId);
  if (!state.cursorClass.split(/\s+/).includes('abs-cursor-tap')) {
    throw new Error(`${routeId}: expected unchanged tap-ring cursor, got class "${state.cursorClass}"`);
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
    await assertOutsideWindowHidesCustomCursor(page, routeId);
    if (routeId === 'about' || routeId === 'contact') {
      await assertTapRingRoute(page, routeId);
    }
    log(`direct ${routeId}: cursor=${state.cursorColor}`);
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
    if (routeId === 'about' || routeId === 'contact') {
      await assertTapRingRoute(page, routeId);
    }
    log(`spa ${routeId}: cursor=${state.cursorColor}`);
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
  log('PASS: route cursor colour matches selected tab accent without hover preview or window-boundary leaks.');
}

run().catch((error) => {
  console.error(`[route-cursor] FAIL: ${error.message}`);
  process.exit(1);
});
