import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { chromium } from 'playwright';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const designSystemPath = resolve(repoRoot, 'react-app/app/public/config/design-system.json');
const baseUrl = process.env.ABS_PALETTE_AUDIT_URL || 'http://localhost:8012/';
const shouldStartDevServer = !process.env.ABS_PALETTE_AUDIT_URL;
const palettes = ['riverMist', 'portlandHaze', 'blueBreak', 'sodiumRain'];
const themes = ['light', 'dark'];

function log(message) {
  console.log(`[palette-surface] ${message}`);
}

function normalize(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function hexToRgbString(hex) {
  const value = String(hex || '').trim().replace(/^#/, '');
  if (!/^[\da-f]{6}$/i.test(value)) return '';
  const n = Number.parseInt(value, 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

function loadExpectations() {
  const designSystem = JSON.parse(readFileSync(designSystemPath, 'utf8'));
  const runtime = designSystem.runtime || {};
  const shellTheme = designSystem.shell?.theme || {};
  const lightWall = shellTheme.wallBaseLight
    || shellTheme.wallBase
    || '#efefef';
  const darkWall = shellTheme.wallBaseDark
    || shellTheme.wallBase
    || '#141414';
  const lightWindow = runtime.bgLight || '#f5f5f5';
  const darkWindow = runtime.bgDark || '#141414';

  return {
    light: {
      wall: lightWall,
      wallLight: lightWall,
      wallDark: darkWall,
      bgLight: lightWindow,
      bgDark: darkWindow,
      studioWindow: lightWindow,
      textPrimary: runtime.textColorLight || '#161616',
      textMuted: runtime.textColorLightMuted || '#2f2f2f',
      veilRgb: hexToRgbString(lightWindow),
    },
    dark: {
      wall: darkWall,
      wallLight: lightWall,
      wallDark: darkWall,
      bgLight: lightWindow,
      bgDark: darkWindow,
      studioWindow: darkWindow,
      textPrimary: runtime.textColorDark || '#f0f0f0',
      textMuted: runtime.textColorDarkMuted || '#c8c8c8',
      veilRgb: hexToRgbString(darkWindow),
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
  } catch (_) {
    if (!shouldStartDevServer) throw _;
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

async function readContractState(page, palette) {
  return page.evaluate(async (nextPalette) => {
    const colors = await import('/src/legacy/modules/visual/colors.js');
    const chrome = await import('/src/legacy/modules/visual/chrome-harmony.js');
    colors.applyColorTemplate(nextPalette);
    chrome.applyChromeHarmony();
    const root = document.documentElement;
    const cs = getComputedStyle(root);
    return {
      wall: cs.getPropertyValue('--abs-wall-base').trim(),
      wallLight: cs.getPropertyValue('--abs-wall-base-light').trim(),
      wallDark: cs.getPropertyValue('--abs-wall-base-dark').trim(),
      bgLight: cs.getPropertyValue('--bg-light').trim(),
      bgDark: cs.getPropertyValue('--bg-dark').trim(),
      studioWindow: cs.getPropertyValue('--studio-window-bg').trim(),
      frameInnerSurface: cs.getPropertyValue('--frame-inner-surface').trim(),
      textPrimary: cs.getPropertyValue('--text-primary').trim(),
      textMuted: cs.getPropertyValue('--text-muted').trim(),
      veilRgb: cs.getPropertyValue('--simulation-contrast-veil-rgb').trim(),
      linkHover: cs.getPropertyValue('--link-hover-color').trim(),
      colorAccent: cs.getPropertyValue('--color-accent').trim(),
      heroRoleAccent: cs.getPropertyValue('--hero-role-accent').trim(),
      cursorColor: cs.getPropertyValue('--cursor-color').trim(),
    };
  }, palette);
}

function assertSurfaceContract(theme, palette, actual, expected) {
  for (const key of ['wall', 'wallLight', 'wallDark', 'bgLight', 'bgDark', 'studioWindow', 'textPrimary', 'textMuted', 'veilRgb']) {
    if (normalize(actual[key]) !== normalize(expected[key])) {
      throw new Error(`${theme}/${palette} ${key}: expected ${expected[key]}, got ${actual[key]}`);
    }
  }

  if (normalize(actual.frameInnerSurface) !== normalize(actual.studioWindow)) {
    throw new Error(`${theme}/${palette} frameInnerSurface: expected studio window ${actual.studioWindow}, got ${actual.frameInnerSurface}`);
  }

}

function assertPaletteVariation(rows) {
  for (const key of ['linkHover', 'colorAccent', 'cursorColor']) {
    const unique = new Set(rows.map((row) => normalize(row[key])));
    if (unique.size < 2) {
      throw new Error(`Expected palette-driven ${key} to vary; got ${[...unique].join(', ') || '(none)'}`);
    }
  }
}

async function run() {
  const expectedByTheme = loadExpectations();
  const server = await ensureDevServer();
  const browser = await chromium.launch();
  const rows = [];

  try {
    for (const theme of themes) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 820 } });
      await context.addInitScript((forcedTheme) => {
        localStorage.setItem('theme-preference-v3', forcedTheme);
        localStorage.removeItem('theme-preference');
        localStorage.removeItem('abs_palette_chapter');
      }, theme);
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
      await page.waitForSelector('#app-frame', { timeout: 15000 });
      await page.waitForFunction(() => (
        ['ready', 'failed'].includes(document.documentElement.dataset.absBootState)
      ), null, { timeout: 15000 });
      await page.waitForTimeout(250);

      for (const palette of palettes) {
        const actual = await readContractState(page, palette);
        assertSurfaceContract(theme, palette, actual, expectedByTheme[theme]);
        rows.push({ theme, palette, ...actual });
      }

      await context.close();
    }
  } finally {
    await browser.close();
    await server?.stop();
  }

  assertPaletteVariation(rows);

  for (const row of rows) {
    log(`${row.theme}/${row.palette}: wall=${row.wall}, hover=${row.linkHover}, accent=${row.colorAccent}, cursor=${row.cursorColor}`);
  }
  log(`PASS: ${rows.length} palette/theme states preserve surface tokens while interaction colours vary.`);
}

run().catch((error) => {
  console.error(`[palette-surface] FAIL: ${error.message}`);
  process.exit(1);
});
