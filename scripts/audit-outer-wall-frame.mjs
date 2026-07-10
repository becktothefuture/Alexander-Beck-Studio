import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const designSystemPath = resolve(repoRoot, 'react-app/app/public/config/design-system.json');
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');
const baseUrl = process.env.ABS_OUTER_WALL_AUDIT_URL || 'http://127.0.0.1:8012/index.html';
const shouldStartDevServer = !process.env.ABS_OUTER_WALL_AUDIT_URL;
const themes = ['light', 'dark'];
const chromiumLockedHeaderFrame = {
  light: '#f1f3f4',
  dark: '#202124',
};

function log(message) {
  console.log(`[outer-wall-frame] ${message}`);
}

function normalizeHex(value) {
  return String(value || '').trim().toLowerCase();
}

function hexToRgb(hex) {
  const value = normalizeHex(hex).replace(/^#/, '');
  if (!/^[\da-f]{6}$/.test(value)) return null;
  const n = Number.parseInt(value, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function cssRgbToRgb(value) {
  const match = String(value || '').match(/^rgba?\(\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)\s*,\s*(\d+(?:\.\d+)?)/i);
  if (!match) return null;
  return [
    Math.round(Number(match[1])),
    Math.round(Number(match[2])),
    Math.round(Number(match[3])),
  ];
}

function pixelDistance(a, b) {
  return Math.max(
    Math.abs(a[0] - b[0]),
    Math.abs(a[1] - b[1]),
    Math.abs(a[2] - b[2]),
  );
}

function getDayStamp() {
  const date = new Date();
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / (1000 * 60 * 60 * 24));
}

function loadExpectations() {
  const designSystem = JSON.parse(readFileSync(designSystemPath, 'utf8'));
  const catalog = JSON.parse(readFileSync(catalogPath, 'utf8'));
  const simulations = Array.isArray(catalog.simulations) ? catalog.simulations : [];
  const homeMode = simulations.find((entry) => entry.id === 'pit' && entry.surface === 'home-mode')
    || simulations.find((entry) => entry.stage === 'daily-rotation' && entry.surface === 'home-mode');
  const routeBacked = simulations.find((entry) => entry.id === 'repel-room' && entry.stage === 'daily-rotation')
    || simulations.find((entry) => entry.stage === 'daily-rotation' && entry.surface === 'lab-route');

  if (!homeMode) throw new Error('No daily home-mode simulation available for audit.');
  if (!routeBacked) throw new Error('No route-backed daily simulation available for audit.');

  return {
    catalogVersion: catalog.version,
    dayStamp: getDayStamp(),
    homeMode,
    routeBacked,
    frame: {
      light: designSystem.shell?.theme?.siteFrameLight || '#242529',
      dark: designSystem.shell?.theme?.siteFrameDark || '#141517',
    },
  };
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
  try {
    await waitForHttpReady(baseUrl, 2500);
    log(`using existing server at ${baseUrl}`);
    return null;
  } catch (error) {
    if (!shouldStartDevServer) throw error;
  }

  const server = startDevServer();
  try {
    await waitForHttpReady(baseUrl, 15000);
    log(`started dev server at ${baseUrl}`);
    return server;
  } catch (error) {
    await server.stop();
    throw new Error(`${error.message}\n${server.getLogs()}`.trim());
  }
}

async function readFrameState(page) {
  const vars = await page.evaluate(() => {
    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const bodyStyle = getComputedStyle(document.body);
    return {
      boot: root.dataset.absBootState || '',
      transition: root.dataset.absSimulationFocusTransition || '',
      label: document.querySelector('.simulation-focus-pill__label')?.textContent?.trim() || '',
      absBrowserChrome: rootStyle.getPropertyValue('--abs-browser-chrome').trim(),
      frameColor: rootStyle.getPropertyValue('--frame-color').trim(),
      wallColor: rootStyle.getPropertyValue('--wall-color').trim(),
      chromeBg: rootStyle.getPropertyValue('--chrome-bg').trim(),
      siteFrameLight: rootStyle.getPropertyValue('--frame-color-site-light').trim(),
      bodyBackground: bodyStyle.backgroundColor,
    };
  });

  const png = PNG.sync.read(await page.screenshot({ fullPage: false }));
  const x = Math.min(8, png.width - 1);
  const y = Math.min(100, png.height - 1);
  const offset = (y * png.width + x) * 4;
  return {
    ...vars,
    outerPixel: [png.data[offset], png.data[offset + 1], png.data[offset + 2], png.data[offset + 3]],
  };
}

function assertFrameState(theme, phase, actual, expectedHex) {
  const expected = normalizeHex(expectedHex);
  for (const key of ['absBrowserChrome', 'frameColor', 'wallColor', 'chromeBg']) {
    if (normalizeHex(actual[key]) !== expected) {
      throw new Error(`${theme}/${phase} ${key}: expected ${expectedHex}, got ${actual[key]}`);
    }
  }

  const expectedOuterRgb = cssRgbToRgb(actual.bodyBackground);
  if (!expectedOuterRgb) throw new Error(`${theme}/${phase} could not parse body background ${actual.bodyBackground}`);
  if (pixelDistance(actual.outerPixel, expectedOuterRgb) > 2) {
    throw new Error(`${theme}/${phase} outer pixel: expected body background ${expectedOuterRgb.join(',')}, got ${actual.outerPixel.join(',')}`);
  }
}

async function runTheme(browser, theme, expectations) {
  const expectedFrame = chromiumLockedHeaderFrame[theme]
    || (theme === 'dark' ? expectations.frame.dark : expectations.frame.light);
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, deviceScaleFactor: 1 });
  await context.addInitScript(({ themeName, dayStamp, simulationId, catalogVersion }) => {
    localStorage.setItem('theme-preference-v2', themeName);
    localStorage.setItem('abs_simulation_focus_choice_v1', JSON.stringify({
      version: 1,
      dayStamp,
      simulationId,
      catalogVersion,
    }));
  }, {
    themeName: theme,
    dayStamp: expectations.dayStamp,
    simulationId: expectations.homeMode.id,
    catalogVersion: expectations.catalogVersion,
  });

  const page = await context.newPage();
  try {
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => ['ready', 'failed'].includes(document.documentElement.dataset.absBootState), null, { timeout: 15000 });
    await page.waitForTimeout(600);

    const directHome = await readFrameState(page);
    assertFrameState(theme, `direct-home-${expectations.homeMode.id}`, directHome, expectedFrame);

    await page.locator('.simulation-focus-switcher').click({ timeout: 5000 });
    await page.locator('.simulation-focus-row').filter({ hasText: expectations.routeBacked.name }).click({ timeout: 5000 });
    await page.waitForFunction((name) => (
      document.querySelector('.simulation-focus-pill__label')?.textContent?.trim() === name
      && document.documentElement.dataset.absSimulationFocusTransition !== 'out'
      && document.documentElement.dataset.absSimulationFocusTransition !== 'hold'
    ), expectations.routeBacked.name, { timeout: 15000 });
    await page.waitForTimeout(600);

    const routeBacked = await readFrameState(page);
    assertFrameState(theme, `route-backed-${expectations.routeBacked.id}`, routeBacked, expectedFrame);

    log(`${theme}: ${expectations.homeMode.id} -> ${expectations.routeBacked.id} locked-header-frame=${expectedFrame}`);
  } finally {
    await context.close();
  }
}

async function run() {
  const expectations = loadExpectations();
  const server = await ensureDevServer();
  const browser = await chromium.launch();

  try {
    for (const theme of themes) {
      await runTheme(browser, theme, expectations);
    }
  } finally {
    await browser.close();
    await server?.stop();
  }

  log('PASS: frame variables match locked-header browser chrome and visible edge pixels match the shell wall on direct boot and route-backed simulation switch.');
}

run().catch((error) => {
  console.error(`[outer-wall-frame] FAIL: ${error.message}`);
  process.exit(1);
});
