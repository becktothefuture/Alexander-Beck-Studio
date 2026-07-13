import { spawn } from 'node:child_process';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { chromium, webkit } from 'playwright';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseUrl = process.env.ABS_THEME_WALL_AUDIT_URL || 'http://127.0.0.1:8012';
const shouldStartDevServer = !process.env.ABS_THEME_WALL_AUDIT_URL;
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const routes = ['/', '/portfolio.html', '/about.html', '/contact.html'];
const viewports = [
  { name: 'mobile-390', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
  { name: 'mobile-anchor-480', width: 480, height: 900, deviceScaleFactor: 2, isMobile: true },
  { name: 'fluid-768', width: 768, height: 900, deviceScaleFactor: 1, isMobile: false },
  { name: 'desktop-anchor-991', width: 991, height: 900, deviceScaleFactor: 1, isMobile: false },
  { name: 'desktop-1440', width: 1440, height: 960, deviceScaleFactor: 1, isMobile: false },
];

const invariantRootVars = [
  '--abs-browser-chrome',
  '--frame-color',
  '--wall-color',
  '--abs-wall-base',
  '--shell-wall-bg',
  '--abs-frame-radius-value',
  '--abs-frame-radius',
  '--abs-frame-radius-mobile',
  '--abs-frame-radius-desktop',
  '--frame-inner-radius',
  '--frame-outer-radius',
  '--wall-radius',
  '--outer-wall-radius',
  '--container-radius',
  '--canvas-radius',
  '--frame-border-width',
  '--safari-tint-inset-x',
  '--safari-tint-inset-y',
  '--container-border',
  '--container-border-x',
  '--container-border-y',
  '--inner-wall-gradient-edge-width',
];
const geometryKeys = new Set(['wallX', 'wallY', 'wallWidth', 'wallHeight']);
const themeVariantKeys = new Set([
  'theme',
  'studioWindowBackground',
  'frameInnerSurface',
  'simulationContrastVeilRgb',
  'wallBackgroundImage',
]);
const maxGeometryDeltaPx = 1.5;
const maxRadiusDeltaPx = 0.05;
const radiusVars = [
  '--abs-frame-radius-value',
  '--abs-frame-radius',
  '--frame-inner-radius',
  '--frame-outer-radius',
  '--wall-radius',
  '--outer-wall-radius',
  '--container-radius',
  '--canvas-radius',
];

function log(message) {
  console.log(`[theme-wall-invariance] ${message}`);
}

function normalize(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function routeUrl(route) {
  const url = new URL(route, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  url.searchParams.set('absAudit', '1');
  return url.toString();
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
      && getComputedStyle(wall).borderTopLeftRadius.trim().endsWith('px')
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
  return page.evaluate(({ vars, radii }) => {
    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const wall = document.querySelector('#simulations');
    const wallStyle = getComputedStyle(wall);
    const wallBeforeStyle = getComputedStyle(wall, '::before');
    const rim = document.querySelector('.inner-wall-gradient-edge');
    const rimStyle = rim ? getComputedStyle(rim) : null;
    const rect = wall.getBoundingClientRect();
    const radiusSelectors = {
      canvasBorderRadius: '#simulations canvas',
      overlayBorderRadius: '.window-overlay-layer',
      finishBorderRadius: '.studio-window-finish-layer',
      vignetteBorderRadius: '.frame-vignette',
      veilBorderRadius: '.simulation-contrast-veil',
      noiseBorderRadius: '.noise',
      sceneEffectsBorderRadius: '.scene-effects',
    };

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
      studioWindowBackground: rootStyle.getPropertyValue('--studio-window-bg').trim(),
      frameInnerSurface: rootStyle.getPropertyValue('--frame-inner-surface').trim(),
      simulationContrastVeilRgb: rootStyle.getPropertyValue('--simulation-contrast-veil-rgb').trim(),
      tabStyles: [...document.querySelectorAll('[data-route-tab]')].map((tab) => {
        const style = getComputedStyle(tab);
        return [tab.dataset.routeTab, style.color, style.backgroundColor, style.borderColor].join('|');
      }).join(';'),
      wallBeforeBorderRadius: wallBeforeStyle.borderRadius,
      rimBorderRadius: rimStyle?.borderRadius || '',
    };

    for (const [key, selector] of Object.entries(radiusSelectors)) {
      const element = document.querySelector(selector);
      values[key] = element ? getComputedStyle(element).borderRadius : '';
    }

    for (const name of radii) {
      const probe = document.createElement('span');
      probe.style.position = 'fixed';
      probe.style.visibility = 'hidden';
      probe.style.borderRadius = `var(${name})`;
      document.body.appendChild(probe);
      values[`resolved:${name}`] = getComputedStyle(probe).borderTopLeftRadius;
      probe.remove();
    }

    const physics = window.__ABS_FRAME_RADIUS_AUDIT__?.getSnapshot?.();
    if (physics) {
      values.physicsCornerRadius = String(physics.cornerRadius ?? '');
      values.physicsWallRadius = String(physics.wallRadius ?? '');
      values.physicsFrameInnerRadius = String(physics.frameInnerRadius ?? '');
      values.physicsFrameOuterRadius = String(physics.frameOuterRadius ?? '');
    }

    for (const name of vars) {
      values[name] = rootStyle.getPropertyValue(name).trim();
    }

    return values;
  }, { vars: invariantRootVars, radii: radiusVars });
}

function parseRadius(value) {
  const numeric = Number.parseFloat(String(value ?? '').trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function expectedRadiusForViewport(width) {
  const progress = Math.min(1, Math.max(0, (width - 480) / (991 - 480)));
  return 20 + (12 * progress);
}

function assertExactRadiusContract(state, route, viewport) {
  const expected = expectedRadiusForViewport(viewport.width);
  const radiusEntries = Object.entries(state).filter(([key, value]) => (
    key.endsWith('BorderRadius')
    || key.startsWith('resolved:')
    || key.startsWith('physics')
  ) && String(value ?? '').trim());

  if (route === '/' && !radiusEntries.some(([key]) => key === 'physicsCornerRadius')) {
    throw new Error(`${route} ${viewport.name} did not expose physics radius state`);
  }

  const diffs = [];
  for (const [key, value] of radiusEntries) {
    const numeric = parseRadius(value);
    if (numeric === null || Math.abs(numeric - expected) > maxRadiusDeltaPx) {
      diffs.push(`${key}=${value}`);
    }
  }

  if (diffs.length > 0) {
    throw new Error(
      `${route} ${viewport.name} radius contract expected ${expected.toFixed(3)}px:\n${diffs.join('\n')}`
    );
  }
}

function diffInvariantState(before, after) {
  const diffs = [];
  for (const key of Object.keys(before)) {
    if (themeVariantKeys.has(key)) continue;
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
    globalThis.__ABS_ROUTE_PERF_AUDIT__ = true;
    localStorage.setItem('theme-preference-v3', 'light');
    localStorage.removeItem('theme-preference');
  });

  const page = await context.newPage();
  try {
    await page.goto(routeUrl(route), { waitUntil: 'domcontentloaded' });
    await waitForWallReady(page);
    await page.waitForFunction(() => Boolean(window.__ABS_FRAME_RADIUS_AUDIT__?.getSnapshot), undefined, {
      timeout: 15000,
    });

    const lightState = await readInvariantState(page);
    assertExactRadiusContract(lightState, route, viewport);
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
    assertExactRadiusContract(darkState, route, viewport);

    const diffs = diffInvariantState(lightState, darkState);
    if (diffs.length > 0) {
      throw new Error(`${route} ${viewport.name} changed wall invariants:\n${diffs.join('\n')}`);
    }

    if (normalize(lightState.studioWindowBackground) === normalize(darkState.studioWindowBackground)) {
      throw new Error(`${route} ${viewport.name} did not change the studio-window surface`);
    }
    if (normalize(lightState.frameInnerSurface) !== normalize(lightState.studioWindowBackground)
      || normalize(darkState.frameInnerSurface) !== normalize(darkState.studioWindowBackground)) {
      throw new Error(`${route} ${viewport.name} frame-inner surface drifted from the studio-window surface`);
    }
    if (normalize(lightState.simulationContrastVeilRgb) === normalize(darkState.simulationContrastVeilRgb)) {
      throw new Error(`${route} ${viewport.name} did not retint the in-window contrast veil`);
    }

    log(`PASS ${route} ${viewport.name}`);
  } finally {
    await context.close();
  }
}

async function run() {
  const server = await ensureDevServer();
  const browser = await browserType.launch();

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
