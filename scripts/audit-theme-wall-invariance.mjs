import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { chromium } from 'playwright';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseUrl = process.env.ABS_THEME_WALL_AUDIT_URL || 'http://127.0.0.1:8012';
const shouldStartDevServer = !process.env.ABS_THEME_WALL_AUDIT_URL;
const routes = ['/', '/about.html', '/contact.html'];
const viewports = [
  { name: 'desktop', width: 1440, height: 960, deviceScaleFactor: 1, isMobile: false },
  { name: 'mobile', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
];

const invariantRootVars = [
  '--abs-wall-base',
  '--frame-inner-surface',
  '--simulation-contrast-veil-rgb',
  '--frame-inner-radius',
  '--frame-outer-radius',
  '--frame-border-width',
  '--safari-tint-inset-x',
  '--safari-tint-inset-y',
  '--container-border',
  '--container-border-x',
  '--container-border-y',
  '--inner-wall-gradient-edge-width',
];
const geometryKeys = new Set(['wallX', 'wallY', 'wallWidth', 'wallHeight']);
const maxGeometryDeltaPx = 1.5;

function log(message) {
  console.log(`[theme-wall-invariance] ${message}`);
}

function normalize(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function routeUrl(route) {
  return new URL(route, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
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

function startDevServer() {
  const child = spawn('npm', ['run', 'dev:react'], {
    cwd: repoRoot,
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
  const readyUrl = routeUrl('/');
  try {
    await waitForHttpReady(readyUrl, 2500);
    log(`using existing server at ${baseUrl}`);
    return null;
  } catch (error) {
    if (!shouldStartDevServer) throw error;
  }

  const server = startDevServer();
  try {
    await waitForHttpReady(readyUrl, 15000);
    log(`started dev server at ${baseUrl}`);
    return server;
  } catch (error) {
    await server.stop();
    throw new Error(`${error.message}\n${server.getLogs()}`.trim());
  }
}

async function waitForWallReady(page) {
  await page.waitForFunction(() => {
    const rootStyle = getComputedStyle(document.documentElement);
    const wall = document.querySelector('#simulations');
    const toggle = document.querySelector('.button-bar__theme-toggle');
    return Boolean(
      wall
      && toggle
      && rootStyle.getPropertyValue('--frame-inner-radius').trim().endsWith('px')
      && rootStyle.getPropertyValue('--container-border').trim().endsWith('px')
    );
  }, null, { timeout: 15000 });
  await page.waitForFunction(() => {
    const wall = document.querySelector('#simulations');
    if (!wall) return false;
    const rect = wall.getBoundingClientRect();
    const next = [
      Math.round(rect.x * 100) / 100,
      Math.round(rect.y * 100) / 100,
      Math.round(rect.width * 100) / 100,
      Math.round(rect.height * 100) / 100,
    ].join(',');
    const previous = window.__absThemeWallAuditRect || '';
    window.__absThemeWallAuditRect = next;
    return previous === next;
  }, null, { timeout: 15000, polling: 100 });
  await page.waitForTimeout(120);
}

async function readInvariantState(page) {
  return page.evaluate((vars) => {
    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const wall = document.querySelector('#simulations');
    const wallStyle = getComputedStyle(wall);
    const wallBeforeStyle = getComputedStyle(wall, '::before');
    const rim = document.querySelector('.inner-wall-gradient-edge');
    const rimStyle = rim ? getComputedStyle(rim) : null;
    const rect = wall.getBoundingClientRect();

    const values = {
      theme: root.getAttribute('data-abs-theme')
        || (root.classList.contains('dark-mode') ? 'dark' : 'light'),
      wallX: Math.round(rect.x * 100) / 100,
      wallY: Math.round(rect.y * 100) / 100,
      wallWidth: Math.round(rect.width * 100) / 100,
      wallHeight: Math.round(rect.height * 100) / 100,
      wallBorderRadius: wallStyle.borderRadius,
      wallOverflow: wallStyle.overflow,
      wallBackgroundImage: wallStyle.backgroundImage,
      wallBeforeBorderRadius: wallBeforeStyle.borderRadius,
      rimBorderRadius: rimStyle?.borderRadius || '',
    };

    for (const name of vars) {
      values[name] = rootStyle.getPropertyValue(name).trim();
    }

    return values;
  }, invariantRootVars);
}

function diffInvariantState(before, after) {
  const diffs = [];
  for (const key of Object.keys(before)) {
    if (key === 'theme') continue;
    if (geometryKeys.has(key)) {
      const delta = Math.abs(Number(before[key]) - Number(after[key]));
      if (delta > maxGeometryDeltaPx) {
        diffs.push(`${key}: light=${before[key]} dark=${after[key]} delta=${delta.toFixed(2)}px`);
      }
      continue;
    }
    if (normalize(before[key]) !== normalize(after[key])) {
      diffs.push(`${key}: light=${before[key]} dark=${after[key]}`);
    }
  }
  return diffs;
}

async function auditRoute(browser, route, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: viewport.deviceScaleFactor,
    isMobile: viewport.isMobile,
  });

  await context.addInitScript(() => {
    localStorage.setItem('theme-preference-v2', 'light');
    localStorage.removeItem('theme-preference');
  });

  const page = await context.newPage();
  try {
    await page.goto(routeUrl(route), { waitUntil: 'domcontentloaded' });
    await waitForWallReady(page);

    const lightState = await readInvariantState(page);
    const themeToggle = page.locator('.button-bar__theme-toggle');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
    } else {
      await themeToggle.dispatchEvent('click');
    }
    await page.waitForFunction(() => (
      document.querySelector('.button-bar__theme-toggle')?.getAttribute('aria-label') === 'Switch to light mode'
    ), undefined, { timeout: 5000 });
    await waitForWallReady(page);
    const darkState = await readInvariantState(page);

    const diffs = diffInvariantState(lightState, darkState);
    if (diffs.length > 0) {
      throw new Error(`${route} ${viewport.name} changed wall invariants:\n${diffs.join('\n')}`);
    }

    log(`PASS ${route} ${viewport.name}`);
  } finally {
    await context.close();
  }
}

async function run() {
  const server = await ensureDevServer();
  const browser = await chromium.launch();

  try {
    for (const route of routes) {
      for (const viewport of viewports) {
        await auditRoute(browser, route, viewport);
      }
    }
  } finally {
    await browser.close();
    await server?.stop();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
