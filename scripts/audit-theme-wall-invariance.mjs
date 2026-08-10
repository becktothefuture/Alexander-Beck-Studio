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
const viewportFilter = String(process.env.ABS_THEME_WALL_VIEWPORT || '').trim().toLowerCase();
const routeFilter = String(process.env.ABS_THEME_WALL_ROUTE || '').trim();
const NAVIGATION_TIMEOUT_MS = 60_000;
const routes = ['/', '/portfolio.html', '/about.html', '/contact.html', '/playground.html']
  .filter((route) => !routeFilter || route === routeFilter);
if (routeFilter && routes.length === 0) {
  throw new Error(`Unknown ABS_THEME_WALL_ROUTE "${routeFilter}".`);
}
const viewports = [
  { name: 'mobile-min-320', width: 320, height: 720, deviceScaleFactor: 2, isMobile: true },
  { name: 'mobile-edge-340', width: 340, height: 760, deviceScaleFactor: 2, isMobile: true },
  { name: 'mobile-edge-341', width: 341, height: 760, deviceScaleFactor: 2, isMobile: true },
  { name: 'evidence-351', width: 351, height: 933, deviceScaleFactor: 2, isMobile: true },
  { name: 'mobile-390', width: 390, height: 844, deviceScaleFactor: 2, isMobile: true },
  { name: 'mobile-anchor-480', width: 480, height: 900, deviceScaleFactor: 2, isMobile: true },
  { name: 'mobile-edge-599', width: 599, height: 900, deviceScaleFactor: 2, isMobile: true },
  { name: 'mobile-max-600', width: 600, height: 900, deviceScaleFactor: 2, isMobile: true },
  { name: 'desktop-min-601', width: 601, height: 900, deviceScaleFactor: 1, isMobile: false },
  { name: 'fluid-edge-767', width: 767, height: 900, deviceScaleFactor: 1, isMobile: false },
  { name: 'fluid-768', width: 768, height: 900, deviceScaleFactor: 1, isMobile: false },
  { name: 'desktop-anchor-991', width: 991, height: 900, deviceScaleFactor: 1, isMobile: false },
  { name: 'evidence-1273', width: 1273, height: 1326, deviceScaleFactor: 1, isMobile: false },
  { name: 'desktop-1440', width: 1440, height: 960, deviceScaleFactor: 1, isMobile: false },
].filter((viewport) => !viewportFilter || viewport.name === viewportFilter);

const invariantRootVars = [
  '--abs-browser-chrome',
  '--frame-color',
  '--wall-color',
  '--abs-wall-base',
  '--shell-wall-bg',
  '--abs-frame-inset-value',
  '--abs-frame-inset',
  '--abs-frame-inset-mobile',
  '--abs-frame-inset-desktop',
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
  '--wall-thickness',
  '--safari-tint-inset-x',
  '--safari-tint-inset-y',
  '--container-border',
  '--container-border-x',
  '--container-border-y',
  '--inner-wall-gradient-edge-width',
];
const geometryKeys = new Set([
  'wallX', 'wallY', 'wallWidth', 'wallHeight',
  'canvasX', 'canvasY', 'canvasWidth', 'canvasHeight',
  'physicsBoundaryX', 'physicsBoundaryY', 'physicsBoundaryWidth', 'physicsBoundaryHeight',
  'activePrimaryTabX', 'activePrimaryTabWidth', 'activePrimaryTabHeight',
  'activePrimaryContentWidth', 'activePrimaryInlinePadding',
  'activePrimaryPillX', 'activePrimaryPillWidth', 'activePrimaryPillHeight',
]);
const physicalBoundaryKeys = new Set([
  'canvasX', 'canvasY', 'canvasWidth', 'canvasHeight',
  'physicsBoundaryX', 'physicsBoundaryY', 'physicsBoundaryWidth', 'physicsBoundaryHeight',
  'physicsBoundaryRadius', 'physicsBoundaryAuthoredInset', 'physicsBoundaryInset',
  'physicsBoundaryOuterRadius', 'physicsBoundaryCornerShape', 'physicsCanvasGeneration',
  'rimX', 'rimY', 'rimWidth', 'rimHeight',
]);
const themeVariantKeys = new Set([
  'theme',
  'studioWindowBackground',
  'frameInnerSurface',
  'studioWindowColorScheme',
  'studioWindowBackgroundResolved',
  'wallBackgroundImage',
]);
const maxGeometryDeltaPx = 1.5;
const maxRadiusDeltaPx = 0.05;
const maxFrameSizeDeltaPx = 0.1;
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
const simulationRadiusVars = [];
const frameSizeVars = [
  '--abs-frame-inset-value',
  '--abs-frame-inset',
  '--container-border',
  '--container-border-x',
  '--container-border-y',
  '--wall-thickness',
];

function log(message) {
  console.log(`[theme-wall-invariance] ${message}`);
}

function normalize(value) {
  return String(value || '').trim().replace(/\s+/g, ' ');
}

function routeUrl(route, params = {}) {
  const url = new URL(route, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`);
  url.searchParams.set('absAudit', '1');
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, String(value));
  }
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

async function readWallReadyDebug(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const wall = document.querySelector('#simulations');
    const wallStyle = wall ? getComputedStyle(wall) : null;
    const rect = wall?.getBoundingClientRect();
    return {
      boot: root.dataset.absBootState || '',
      classes: root.className,
      wallExists: Boolean(wall),
      themeToggleExists: Boolean(document.querySelector('.button-bar__theme-toggle')),
      borderTopLeftRadius: wallStyle?.borderTopLeftRadius || '',
      containerBorder: rootStyle.getPropertyValue('--container-border').trim(),
      expectedX: rootStyle.getPropertyValue('--safari-tint-inset-x').trim(),
      expectedY: rootStyle.getPropertyValue('--safari-tint-inset-y').trim(),
      rect: rect ? {
        x: Math.round(rect.x * 1000) / 1000,
        y: Math.round(rect.y * 1000) / 1000,
        width: Math.round(rect.width * 1000) / 1000,
        height: Math.round(rect.height * 1000) / 1000,
      } : null,
    };
  });
}

async function waitForWallReady(page, label = 'wall') {
  async function waitForStableWall() {
    await page.evaluate(() => {
      window.__absThemeWallAuditRect = '';
      window.__absThemeWallAuditExactKey = '';
      window.__absThemeWallAuditExactSince = 0;
    });
    await page.waitForFunction(() => {
      const rootStyle = getComputedStyle(document.documentElement);
      const wall = document.querySelector('#simulations');
      const toggle = document.querySelector('.button-bar__theme-toggle');
      const routeTabs = [...document.querySelectorAll('[data-route-tab]')];
      return Boolean(
        wall
        && toggle
        && routeTabs.length >= 4
        && routeTabs.every((tab) => getComputedStyle(tab).color !== 'rgb(0, 0, 238)')
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
    await page.waitForFunction(({ tolerance, stableForMs }) => {
      const wall = document.querySelector('#simulations');
      if (!wall) return false;
      const rootStyle = getComputedStyle(document.documentElement);
      const expectedX = Number.parseFloat(rootStyle.getPropertyValue('--safari-tint-inset-x'));
      const expectedY = Number.parseFloat(rootStyle.getPropertyValue('--safari-tint-inset-y'));
      const rect = wall.getBoundingClientRect();
      const stableKey = [
        Math.round(rect.x * 1000) / 1000,
        Math.round(rect.y * 1000) / 1000,
        Math.round(rect.width * 1000) / 1000,
        Math.round(rect.height * 1000) / 1000,
        Math.round(expectedX * 1000) / 1000,
        Math.round(expectedY * 1000) / 1000,
      ].join(',');
      const matches = Number.isFinite(expectedX)
        && Number.isFinite(expectedY)
        && Math.abs(rect.x - expectedX) <= tolerance
        && Math.abs(rect.y - expectedY) <= tolerance;
      if (!matches || window.__absThemeWallAuditExactKey !== stableKey) {
        window.__absThemeWallAuditExactKey = stableKey;
        window.__absThemeWallAuditExactSince = 0;
        return false;
      }
      if (!window.__absThemeWallAuditExactSince) {
        window.__absThemeWallAuditExactSince = performance.now();
        return false;
      }
      return performance.now() - window.__absThemeWallAuditExactSince >= stableForMs;
    }, { tolerance: maxRadiusDeltaPx, stableForMs: 300 }, { timeout: 15000, polling: 100 });
  }

  try {
    await waitForStableWall();
  } catch (error) {
    const debug = await readWallReadyDebug(page).catch(() => null);
    if (debug && !debug.wallExists) {
      await page.reload({ waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
      try {
        await waitForStableWall();
        return;
      } catch (retryError) {
        const retryDebug = await readWallReadyDebug(page).catch(() => null);
        throw new Error(`${label}: wall did not settle after reload\n${JSON.stringify(retryDebug, null, 2)}`, { cause: retryError });
      }
    }
    throw new Error(`${label}: wall did not settle\n${JSON.stringify(debug, null, 2)}`, { cause: error });
  }
}

async function waitForPhysicalSimulationBoundary(page) {
  await page.waitForFunction(({ tolerance, stableForMs }) => {
    const canvas = document.querySelector('#c');
    const wall = document.querySelector('#simulations');
    const physics = window.__ABS_FRAME_RADIUS_AUDIT__?.getSnapshot?.();
    const boundary = physics?.simulationCollisionBounds?.css;
    if (!canvas || !wall || !boundary) return false;
    const canvasRect = canvas.getBoundingClientRect();
    const wallRect = wall.getBoundingClientRect();
    const wallStyle = getComputedStyle(wall);
    const wallRadius = Number.parseFloat(wallStyle.borderTopLeftRadius);
    const wallCornerValue = wallStyle.cornerTopLeftShape
      || wallStyle.cornerShape
      || wallStyle.getPropertyValue('corner-top-left-shape')
      || wallStyle.getPropertyValue('corner-shape')
      || '';
    const normalizedWallCorner = String(wallCornerValue).toLowerCase();
    const wallCornerShape = normalizedWallCorner.includes('squircle')
      || /superellipse\(\s*2(?:\.0+)?\s*\)/.test(normalizedWallCorner)
      ? 'squircle'
      : 'round';
    const inset = Number(physics?.collisionInset);
    const matches = [
      canvasRect.x - wallRect.x,
      canvasRect.y - wallRect.y,
      canvasRect.width - wallRect.width,
      canvasRect.height - wallRect.height,
      boundary.x - inset,
      boundary.y - inset,
      boundary.width - (wallRect.width - (inset * 2)),
      boundary.height - (wallRect.height - (inset * 2)),
      boundary.radius - Math.max(0, wallRadius - inset),
    ].every((delta) => Number.isFinite(delta) && Math.abs(delta) <= tolerance);
    if (!matches || boundary.cornerShape !== wallCornerShape) {
      window.__absThemeWallPhysicalBoundarySince = 0;
      return false;
    }
    if (!window.__absThemeWallPhysicalBoundarySince) {
      window.__absThemeWallPhysicalBoundarySince = performance.now();
      return false;
    }
    return performance.now() - window.__absThemeWallPhysicalBoundarySince >= stableForMs;
  }, { tolerance: maxRadiusDeltaPx, stableForMs: 250 }, { timeout: 15000, polling: 100 });
}

async function readInvariantState(page) {
  return page.evaluate(({ vars, radii, simulationRadii, frameSizes }) => {
    const root = document.documentElement;
    const rootStyle = getComputedStyle(root);
    const wall = document.querySelector('#simulations');
    const wallStyle = getComputedStyle(wall);
    const wallBeforeStyle = getComputedStyle(wall, '::before');
    const rim = document.querySelector('.inner-wall-gradient-edge');
    const rimStyle = rim ? getComputedStyle(rim) : null;
    const rimRect = rim?.getBoundingClientRect();
    const rect = wall.getBoundingClientRect();
    const canvas = document.querySelector('#c');
    const canvasRect = canvas?.getBoundingClientRect();
    const activePrimaryTab = document.querySelector('[data-route-tab][aria-current="page"]');
    const activePrimaryContent = activePrimaryTab?.querySelector('.shell-tab__label, .shell-tab__icon');
    const activePrimaryVisibleContent = activePrimaryTab
      ? [...activePrimaryTab.querySelectorAll('.shell-tab__label, .shell-tab__icon')]
        .find((content) => {
          const contentRect = content.getBoundingClientRect();
          return contentRect.width > 0 && contentRect.height > 0;
        })
      : null;
    const buttonBar = activePrimaryTab?.closest('.button-bar');
    const activePrimaryPill = buttonBar?.querySelector('.button-bar__active-pill');
    const activePrimaryTabRect = activePrimaryTab?.getBoundingClientRect();
    const activePrimaryContentRect = activePrimaryVisibleContent?.getBoundingClientRect();
    const activePrimaryPillRect = activePrimaryPill?.getBoundingClientRect();
    const activePrimaryTabStyle = activePrimaryTab ? getComputedStyle(activePrimaryTab) : null;
    const roundGeometry = (value) => Math.round(value * 100) / 100;
    const resolveColor = (value) => {
      const probe = document.createElement('span');
      probe.style.position = 'fixed';
      probe.style.visibility = 'hidden';
      probe.style.backgroundColor = value;
      document.body.appendChild(probe);
      const resolved = getComputedStyle(probe).backgroundColor;
      probe.remove();
      return resolved;
    };
    const radiusSelectors = {
      canvasBorderRadius: '#simulations canvas',
      overlayBorderRadius: '.window-overlay-layer',
      vignetteBorderRadius: '.frame-vignette',
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
      wallCornerShape: wallStyle.cornerTopLeftShape
        || wallStyle.cornerShape
        || wallStyle.getPropertyValue('corner-top-left-shape')
        || wallStyle.getPropertyValue('corner-shape')
        || '',
      wallOverflow: wallStyle.overflow,
      wallBackgroundImage: wallStyle.backgroundImage,
      studioWindowBackground: rootStyle.getPropertyValue('--studio-window-bg').trim(),
      studioWindowBackgroundResolved: resolveColor(rootStyle.getPropertyValue('--studio-window-bg').trim()),
      frameInnerSurface: rootStyle.getPropertyValue('--frame-inner-surface').trim(),
      rootColorScheme: rootStyle.colorScheme,
      studioWindowColorScheme: getComputedStyle(wall).colorScheme,
      inactiveTabStyles: [...document.querySelectorAll('[data-route-tab]:not([aria-current="page"])')].map((tab) => {
        const style = getComputedStyle(tab);
        return [tab.dataset.routeTab, style.color, style.backgroundColor, style.borderColor].join('|');
      }).join(';'),
      activePrimaryPillBackground: activePrimaryPill ? getComputedStyle(activePrimaryPill).backgroundColor : '',
      activePrimaryPillInset: Number.parseFloat(
        rootStyle.getPropertyValue('--button-bar-effective-active-inset')
        || rootStyle.getPropertyValue('--button-bar-active-inset'),
      ),
      activePrimaryInk: activePrimaryContent ? getComputedStyle(activePrimaryContent).color : '',
      activePrimaryRouteId: activePrimaryTab?.dataset.routeTab || '',
      activePrimaryTabX: activePrimaryTabRect ? roundGeometry(activePrimaryTabRect.x) : '',
      activePrimaryTabWidth: activePrimaryTabRect ? roundGeometry(activePrimaryTabRect.width) : '',
      activePrimaryTabHeight: activePrimaryTabRect ? roundGeometry(activePrimaryTabRect.height) : '',
      activePrimaryContentWidth: activePrimaryContentRect ? roundGeometry(activePrimaryContentRect.width) : '',
      activePrimaryInlinePadding: activePrimaryTabStyle
        ? roundGeometry(
          Number.parseFloat(activePrimaryTabStyle.paddingLeft)
          + Number.parseFloat(activePrimaryTabStyle.paddingRight)
        )
        : '',
      activePrimaryPillX: activePrimaryPillRect ? roundGeometry(activePrimaryPillRect.x) : '',
      activePrimaryPillWidth: activePrimaryPillRect ? roundGeometry(activePrimaryPillRect.width) : '',
      activePrimaryPillHeight: activePrimaryPillRect ? roundGeometry(activePrimaryPillRect.height) : '',
      utilityStyles: [...document.querySelectorAll('.button-bar__sound-toggle, .button-bar__theme-toggle, .button-bar__theme-thumb')].map((control) => {
        const style = getComputedStyle(control);
        return [control.className, style.color, style.backgroundColor, style.borderColor, style.boxShadow].join('|');
      }).join(';'),
      wallBeforeBorderRadius: wallBeforeStyle.borderRadius,
      wallBeforeContent: wallBeforeStyle.content,
      wallInlineBorderRadius: wall.style.borderRadius,
      rimBorderRadius: rimStyle?.borderRadius || '',
      rimX: rimRect ? Math.round(rimRect.x * 100) / 100 : '',
      rimY: rimRect ? Math.round(rimRect.y * 100) / 100 : '',
      rimWidth: rimRect ? Math.round(rimRect.width * 100) / 100 : '',
      rimHeight: rimRect ? Math.round(rimRect.height * 100) / 100 : '',
      canvasX: canvasRect ? Math.round(canvasRect.x * 100) / 100 : '',
      canvasY: canvasRect ? Math.round(canvasRect.y * 100) / 100 : '',
      canvasWidth: canvasRect ? Math.round(canvasRect.width * 100) / 100 : '',
      canvasHeight: canvasRect ? Math.round(canvasRect.height * 100) / 100 : '',
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

    for (const name of simulationRadii) {
      const probe = document.createElement('span');
      probe.style.position = 'fixed';
      probe.style.visibility = 'hidden';
      probe.style.borderRadius = `var(${name})`;
      document.body.appendChild(probe);
      values[`resolvedSimulation:${name}`] = getComputedStyle(probe).borderTopLeftRadius;
      probe.remove();
    }

    for (const name of frameSizes) {
      const probe = document.createElement('span');
      probe.style.position = 'fixed';
      probe.style.visibility = 'hidden';
      probe.style.width = `var(${name})`;
      document.body.appendChild(probe);
      values[`resolvedSize:${name}`] = getComputedStyle(probe).width;
      probe.remove();
    }

    const physics = window.__ABS_FRAME_RADIUS_AUDIT__?.getSnapshot?.();
    if (physics) {
      values.physicsCornerRadius = String(physics.cornerRadius ?? '');
      values.physicsWallRadius = String(physics.wallRadius ?? '');
      values.physicsFrameInnerRadius = String(physics.frameInnerRadius ?? '');
      values.physicsFrameOuterRadius = String(physics.frameOuterRadius ?? '');
      values.physicsFrameInset = String(physics.frameInset ?? '');
      values.physicsContainerBorderX = String(physics.containerBorderX ?? '');
      values.physicsContainerBorderY = String(physics.containerBorderY ?? '');
      values.physicsWallThickness = String(physics.wallThickness ?? '');
      values.physicsCollisionInset = String(physics.collisionInset ?? '');
      values.physicsCanvasGeneration = String(physics.simulationCanvasGeneration ?? '');
      const boundary = physics.simulationCollisionBounds?.css;
      values.physicsBoundaryX = String(boundary?.x ?? '');
      values.physicsBoundaryY = String(boundary?.y ?? '');
      values.physicsBoundaryWidth = String(boundary?.width ?? '');
      values.physicsBoundaryHeight = String(boundary?.height ?? '');
      values.physicsBoundaryRadius = String(boundary?.radius ?? '');
      values.physicsBoundaryAuthoredInset = String(boundary?.authoredInset ?? '');
      values.physicsBoundaryInset = String(boundary?.inset ?? '');
      values.physicsBoundaryOuterRadius = String(boundary?.outerRadius ?? '');
      values.physicsBoundaryCornerShape = String(boundary?.cornerShape ?? '');
    }

    for (const name of vars) {
      values[name] = rootStyle.getPropertyValue(name).trim();
    }

    return values;
  }, {
    vars: invariantRootVars,
    radii: radiusVars,
    simulationRadii: simulationRadiusVars,
    frameSizes: frameSizeVars,
  });
}

function parseRadius(value) {
  const numeric = Number.parseFloat(String(value ?? '').trim());
  return Number.isFinite(numeric) ? numeric : null;
}

function expectedResponsiveValue(width, mobile, desktop) {
  const progress = Math.min(1, Math.max(0, (width - 480) / (991 - 480)));
  return mobile + ((desktop - mobile) * progress);
}

function expectedRadiusForViewport(width, state) {
  const mobile = parseRadius(state['--abs-frame-radius-mobile']) ?? 32;
  const desktop = parseRadius(state['--abs-frame-radius-desktop']) ?? 72;
  return expectedResponsiveValue(width, mobile, desktop);
}

function expectedFrameSizeForViewport(width, state) {
  const resolved = parseRadius(state['resolvedSize:--abs-frame-inset']);
  if (resolved !== null) return resolved;
  const mobile = parseRadius(state['--abs-frame-inset-mobile']) ?? 10;
  const desktop = parseRadius(state['--abs-frame-inset-desktop']) ?? 16;
  return expectedResponsiveValue(width, mobile, desktop);
}

function assertExactRadiusContract(state, route, viewport) {
  const expected = expectedRadiusForViewport(viewport.width, state);
  const radiusEntries = Object.entries(state).filter(([key, value]) => (
    key.endsWith('BorderRadius')
    || key.startsWith('resolved:')
    || key === 'physicsWallRadius'
    || key === 'physicsCornerRadius'
    || key === 'physicsFrameInnerRadius'
    || key === 'physicsFrameOuterRadius'
  )
    && key !== 'wallBeforeBorderRadius'
    && key !== 'rimBorderRadius'
    && key !== 'canvasBorderRadius'
    && String(value ?? '').trim());

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

function assertExactSimulationRadiusContract(state, route, viewport, { requireLiveCanvas = false } = {}) {
  const outerRadius = expectedRadiusForViewport(viewport.width, state);
  const keys = ['rimBorderRadius'];
  if (!['', 'none', 'normal'].includes(String(state.wallBeforeContent || '').trim())) {
    keys.push('wallBeforeBorderRadius');
  }
  const diffs = [];
  for (const key of keys) {
    const value = state[key];
    const numeric = parseRadius(value);
    if (numeric === null || Math.abs(numeric - outerRadius) > maxRadiusDeltaPx) {
      diffs.push(`${key}=${value}`);
    }
  }
  if (String(state.canvasBorderRadius || '').trim()) {
    const canvasRadius = parseRadius(state.canvasBorderRadius);
    if (canvasRadius === null || Math.abs(canvasRadius) > maxRadiusDeltaPx) {
      diffs.push(`canvasBorderRadius=${state.canvasBorderRadius} (must be 0; #simulations owns the clip)`);
    }
  } else if (requireLiveCanvas) {
    diffs.push('canvasBorderRadius=missing');
  }
  if (String(state.wallInlineBorderRadius || '').trim()) {
    diffs.push(`wallInlineBorderRadius=${state.wallInlineBorderRadius}`);
  }
  if (requireLiveCanvas) {
    const inset = parseRadius(state.physicsCollisionInset);
    const expectedCollisionRadius = Math.max(0, outerRadius - inset);
    const actualCollisionRadius = parseRadius(state.physicsBoundaryRadius);
    if (actualCollisionRadius === null || Math.abs(actualCollisionRadius - expectedCollisionRadius) > maxRadiusDeltaPx) {
      diffs.push(`physicsBoundaryRadius=${state.physicsBoundaryRadius}`);
    }
    const normalizedWallCorner = String(state.wallCornerShape).toLowerCase();
    const renderedShape = normalizedWallCorner.includes('squircle')
      || /superellipse\(\s*2(?:\.0+)?\s*\)/.test(normalizedWallCorner)
      ? 'squircle'
      : 'round';
    if (state.physicsBoundaryCornerShape !== renderedShape) {
      diffs.push(`physicsBoundaryCornerShape=${state.physicsBoundaryCornerShape} differs from wall ${renderedShape}`);
    }
  }
  if (diffs.length > 0) {
    throw new Error(
      `${route} ${viewport.name} visual rim expected ${outerRadius.toFixed(3)}px:\n${diffs.join('\n')}`
    );
  }
}

function assertExactRenderedBoundary(state, route, viewport, { requireLiveCanvas = false } = {}) {
  // Some daily simulations supply their own canvas or no canvas at all. The
  // Ball Field run below is the authoritative physics check; generic route
  // coverage remains focused on the shared rendered wall contract.
  if (!requireLiveCanvas) return;

  const canvasKeys = ['canvasX', 'canvasY', 'canvasWidth', 'canvasHeight'];
  const boundaryKeys = [
    'physicsBoundaryX',
    'physicsBoundaryY',
    'physicsBoundaryWidth',
    'physicsBoundaryHeight',
    'physicsBoundaryRadius',
  ];
  const hasCanvas = canvasKeys.every((key) => parseRadius(state[key]) !== null);
  const hasBoundary = boundaryKeys.every((key) => parseRadius(state[key]) !== null);

  if (!hasCanvas) {
    throw new Error(`${route} ${viewport.name} did not expose the live canvas and physical wall boundary`);
  }
  if (!hasBoundary) {
    throw new Error(`${route} ${viewport.name} did not expose the canvas physical wall boundary`);
  }

  const diffs = [];
  const canvasToWall = [
    ['canvasX', 'wallX'],
    ['canvasY', 'wallY'],
    ['canvasWidth', 'wallWidth'],
    ['canvasHeight', 'wallHeight'],
  ];
  for (const [canvasKey, wallKey] of canvasToWall) {
    const delta = Math.abs(parseRadius(state[canvasKey]) - parseRadius(state[wallKey]));
    if (delta > maxRadiusDeltaPx) {
      diffs.push(`${canvasKey}=${state[canvasKey]} differs from ${wallKey}=${state[wallKey]}`);
    }
  }
  const inset = parseRadius(state.physicsCollisionInset);
  const wallRadius = parseRadius(state.wallBorderRadius);
  const expectedBoundary = {
    physicsBoundaryX: inset,
    physicsBoundaryY: inset,
    physicsBoundaryWidth: parseRadius(state.wallWidth) - (inset * 2),
    physicsBoundaryHeight: parseRadius(state.wallHeight) - (inset * 2),
    physicsBoundaryRadius: Math.max(0, wallRadius - inset),
  };
  for (const [boundaryKey, expected] of Object.entries(expectedBoundary)) {
    const actual = parseRadius(state[boundaryKey]);
    if (!Number.isFinite(expected) || actual === null || Math.abs(actual - expected) > maxRadiusDeltaPx) {
      diffs.push(`${boundaryKey}=${state[boundaryKey]} differs from expected ${expected}`);
    }
  }

  const rimToWall = [
    ['rimX', 'wallX'],
    ['rimY', 'wallY'],
    ['rimWidth', 'wallWidth'],
    ['rimHeight', 'wallHeight'],
  ];
  for (const [rimKey, wallKey] of rimToWall) {
    const rimValue = parseRadius(state[rimKey]);
    const wallValue = parseRadius(state[wallKey]);
    if (rimValue === null || wallValue === null || Math.abs(rimValue - wallValue) > maxRadiusDeltaPx) {
      diffs.push(`${rimKey}=${state[rimKey]} differs from ${wallKey}=${state[wallKey]}`);
    }
  }

  if (diffs.length > 0) {
    throw new Error(`${route} ${viewport.name} simulation interior boundary drifted:\n${diffs.join('\n')}`);
  }
}

function assertExactFrameSizeContract(state, route, viewport) {
  const expected = expectedFrameSizeForViewport(viewport.width, state);
  const frameSizeEntries = Object.entries(state).filter(([key, value]) => (
    key.startsWith('resolvedSize:')
    || key === 'physicsFrameInset'
    || key === 'physicsContainerBorderX'
    || key === 'physicsContainerBorderY'
    || key === 'physicsWallThickness'
    || key === 'wallX'
    || key === 'wallY'
  ) && String(value ?? '').trim());

  const diffs = [];
  for (const [key, value] of frameSizeEntries) {
    const numeric = parseRadius(value);
    if (numeric === null || Math.abs(numeric - expected) > maxFrameSizeDeltaPx) {
      diffs.push(`${key}=${value}`);
    }
  }

  if (diffs.length > 0) {
    throw new Error(
      `${route} ${viewport.name} frame-size contract expected ${expected.toFixed(3)}px:\n${diffs.join('\n')}`
    );
  }
}

function diffInvariantState(before, after, { includePhysicalBoundary = false } = {}) {
  const diffs = [];
  for (const key of Object.keys(before)) {
    if (themeVariantKeys.has(key)) continue;
    if (!includePhysicalBoundary && physicalBoundaryKeys.has(key)) continue;
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

function assertActivePrimaryTabThemeContract(state, theme, route, viewport) {
  if (!normalize(state.activePrimaryPillBackground).startsWith('rgba(255, 255, 255,')) {
    throw new Error(`${route} ${viewport.name} ${theme} active key lost its neutral surface: ${state.activePrimaryPillBackground}`);
  }
  const expectedInk = 'rgb(255, 255, 255)';
  if (normalize(state.activePrimaryInk) !== expectedInk) {
    throw new Error(`${route} ${viewport.name} ${theme} active primary ink expected ${expectedInk}, got ${state.activePrimaryInk}`);
  }
}

function assertActivePrimaryPillGeometryContract(state, route, viewport) {
  const requiredValues = [
    'activePrimaryTabX',
    'activePrimaryTabWidth',
    'activePrimaryTabHeight',
    'activePrimaryPillX',
    'activePrimaryPillWidth',
    'activePrimaryPillHeight',
    'activePrimaryPillInset',
  ];
  if (!state.activePrimaryRouteId || requiredValues.some((key) => !Number.isFinite(Number(state[key])))) {
    throw new Error(`${route} ${viewport.name} active primary key geometry was unavailable`);
  }

  const geometryTolerance = 0.5;
  const expectedWidth = Number(state.activePrimaryTabWidth) - (2 * Number(state.activePrimaryPillInset));
  const expectedHeight = Number(state.activePrimaryTabHeight) - (2 * Number(state.activePrimaryPillInset));
  const expectedCenter = Number(state.activePrimaryTabX) + (Number(state.activePrimaryTabWidth) / 2);
  const actualCenter = Number(state.activePrimaryPillX) + (Number(state.activePrimaryPillWidth) / 2);
  const failures = [];

  if (Math.abs(Number(state.activePrimaryPillHeight) - expectedHeight) > geometryTolerance) {
    failures.push(`height expected ${expectedHeight.toFixed(3)}px, got ${state.activePrimaryPillHeight}px`);
  }
  if (Math.abs(Number(state.activePrimaryPillWidth) - expectedWidth) > geometryTolerance) {
    failures.push(`width expected ${expectedWidth.toFixed(3)}px, got ${state.activePrimaryPillWidth}px`);
  }
  if (Math.abs(actualCenter - expectedCenter) > geometryTolerance) {
    failures.push(`center expected ${expectedCenter.toFixed(2)}px, got ${actualCenter.toFixed(2)}px`);
  }
  if (failures.length > 0) {
    throw new Error(`${route} ${viewport.name} active primary key geometry contract failed:\n${failures.join('\n')}`);
  }
}

async function waitForActivePrimaryTabThemeContract(page) {
  await page.waitForFunction(() => {
    const activePrimaryTab = document.querySelector('[data-route-tab][aria-current="page"]');
    const activePrimaryContent = activePrimaryTab?.querySelector('.shell-tab__label, .shell-tab__icon');
    const buttonBar = activePrimaryTab?.closest('.button-bar');
    const activePrimaryPill = buttonBar?.querySelector('.button-bar__active-pill');
    if (!activePrimaryContent || !activePrimaryPill) return false;

    const activePrimaryTabRect = activePrimaryTab.getBoundingClientRect();
    const activePrimaryPillRect = activePrimaryPill.getBoundingClientRect();
    const rootStyle = getComputedStyle(document.documentElement);
    const activePrimaryPillInset = Number.parseFloat(
      rootStyle.getPropertyValue('--button-bar-effective-active-inset')
      || rootStyle.getPropertyValue('--button-bar-active-inset'),
    );
    const expectedPillWidth = activePrimaryTabRect.width - (2 * activePrimaryPillInset);
    const expectedPillHeight = activePrimaryTabRect.height - (2 * activePrimaryPillInset);
    const activeTabCenter = activePrimaryTabRect.left + (activePrimaryTabRect.width / 2);
    const activePillCenter = activePrimaryPillRect.left + (activePrimaryPillRect.width / 2);
    const geometryTolerance = 0.5;

    return buttonBar.querySelector('[data-button-bar-nav]')?.dataset.activePillReady === 'true'
      && getComputedStyle(activePrimaryPill).backgroundColor.startsWith('rgba(255, 255, 255,')
      && getComputedStyle(activePrimaryContent).color === 'rgb(255, 255, 255)'
      && Math.abs(activePrimaryPillRect.width - expectedPillWidth) <= geometryTolerance
      && Math.abs(activePrimaryPillRect.height - expectedPillHeight) <= geometryTolerance
      && Math.abs(activePillCenter - activeTabCenter) <= geometryTolerance;
  }, null, { timeout: 5000 });
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
    await page.goto(routeUrl(route), { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    await waitForWallReady(page, `${route} ${viewport.name} light`);
    await waitForActivePrimaryTabThemeContract(page, 'light');
    await page.waitForFunction(() => Boolean(window.__ABS_FRAME_RADIUS_AUDIT__?.getSnapshot), undefined, {
      timeout: 15000,
    });
    const lightState = await readInvariantState(page);
    assertExactRadiusContract(lightState, route, viewport);
    assertExactSimulationRadiusContract(lightState, route, viewport);
    assertExactFrameSizeContract(lightState, route, viewport);
    assertExactRenderedBoundary(lightState, route, viewport);
    assertActivePrimaryTabThemeContract(lightState, 'light', route, viewport);
    assertActivePrimaryPillGeometryContract(lightState, route, viewport);
    const themeToggle = page.locator('.button-bar__theme-toggle');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
    } else {
      await themeToggle.dispatchEvent('click');
    }
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.waitForFunction(() => (
      document.querySelector('.button-bar__theme-toggle')?.getAttribute('aria-label') === 'Switch to light mode'
    ), undefined, { timeout: 5000 });
    await waitForWallReady(page, `${route} ${viewport.name} dark`);
    await waitForActivePrimaryTabThemeContract(page, 'dark');
    const darkState = await readInvariantState(page);
    assertExactRadiusContract(darkState, route, viewport);
    assertExactSimulationRadiusContract(darkState, route, viewport);
    assertExactFrameSizeContract(darkState, route, viewport);
    assertExactRenderedBoundary(darkState, route, viewport);
    assertActivePrimaryTabThemeContract(darkState, 'dark', route, viewport);
    assertActivePrimaryPillGeometryContract(darkState, route, viewport);

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
    if (!normalize(lightState.rootColorScheme).includes('dark') || !normalize(darkState.rootColorScheme).includes('dark')) {
      throw new Error(`${route} ${viewport.name} root browser color-scheme did not stay dark`);
    }
    if (!normalize(lightState.studioWindowColorScheme).includes('light') || !normalize(darkState.studioWindowColorScheme).includes('dark')) {
      throw new Error(`${route} ${viewport.name} studio-window color-scheme did not follow the site theme`);
    }

    log(`PASS ${route} ${viewport.name}`);
  } finally {
    await context.close();
  }
}

async function auditBallPitBoundary(browser, viewport) {
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
    await page.goto(routeUrl('/', { mode: 'pit' }), { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    await waitForWallReady(page, `/?mode=pit ${viewport.name} light`);
    await page.waitForFunction(() => Boolean(window.__ABS_FRAME_RADIUS_AUDIT__?.getSnapshot), undefined, {
      timeout: 15000,
    });
    await waitForPhysicalSimulationBoundary(page);

    const lightState = await readInvariantState(page);
    assertExactRadiusContract(lightState, '/?mode=pit', viewport);
    assertExactSimulationRadiusContract(lightState, '/?mode=pit', viewport, { requireLiveCanvas: true });
    assertExactFrameSizeContract(lightState, '/?mode=pit', viewport);
    assertExactRenderedBoundary(lightState, '/?mode=pit', viewport, { requireLiveCanvas: true });

    // The collision control must move only physics. Visual geometry and the
    // current canvas generation stay unchanged across live 0/10/24px edits.
    const visualKeys = [
      'wallX', 'wallY', 'wallWidth', 'wallHeight', 'wallBorderRadius',
      'canvasX', 'canvasY', 'canvasWidth', 'canvasHeight',
      'rimX', 'rimY', 'rimWidth', 'rimHeight', 'rimBorderRadius',
    ];
    for (const authoredInset of [0, 10, 24]) {
      await page.evaluate((nextInset) => {
        const globals = window.__ABS_HOME_AUDIT__?.getGlobals?.();
        if (!globals) throw new Error('Home audit globals unavailable');
        globals.simulationCollisionInsetPx = nextInset;
        window.dispatchEvent(new Event('resize'));
      }, authoredInset);
      await waitForPhysicalSimulationBoundary(page);
      const insetState = await readInvariantState(page);
      assertExactSimulationRadiusContract(insetState, `/?mode=pit&inset=${authoredInset}`, viewport, { requireLiveCanvas: true });
      assertExactRenderedBoundary(insetState, `/?mode=pit&inset=${authoredInset}`, viewport, { requireLiveCanvas: true });
      for (const key of visualKeys) {
        if (normalize(insetState[key]) !== normalize(lightState[key])) {
          throw new Error(`/?mode=pit ${viewport.name} collision inset ${authoredInset}px moved visual ${key}`);
        }
      }
      if (insetState.physicsCanvasGeneration !== lightState.physicsCanvasGeneration) {
        throw new Error(`/?mode=pit ${viewport.name} collision inset remounted the canvas`);
      }
    }

    // Restore the canonical authored value before testing theme invariance.
    await page.evaluate((canonicalInset) => {
      const globals = window.__ABS_HOME_AUDIT__?.getGlobals?.();
      globals.simulationCollisionInsetPx = canonicalInset;
      window.dispatchEvent(new Event('resize'));
    }, Number(lightState.physicsCollisionInset) || 0);
    await waitForPhysicalSimulationBoundary(page);

    const themeToggle = page.locator('.button-bar__theme-toggle');
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
    } else {
      await themeToggle.dispatchEvent('click');
    }
    await page.mouse.move(0, 0);
    await page.evaluate(() => document.activeElement?.blur?.());
    await page.waitForFunction(() => (
      document.querySelector('.button-bar__theme-toggle')?.getAttribute('aria-label') === 'Switch to light mode'
    ), undefined, { timeout: 5000 });
    await waitForWallReady(page, `/?mode=pit ${viewport.name} dark`);
    await waitForPhysicalSimulationBoundary(page);

    const darkState = await readInvariantState(page);
    assertExactRadiusContract(darkState, '/?mode=pit', viewport);
    assertExactSimulationRadiusContract(darkState, '/?mode=pit', viewport, { requireLiveCanvas: true });
    assertExactFrameSizeContract(darkState, '/?mode=pit', viewport);
    assertExactRenderedBoundary(darkState, '/?mode=pit', viewport, { requireLiveCanvas: true });

    const diffs = diffInvariantState(lightState, darkState, { includePhysicalBoundary: true });
    if (diffs.length > 0) {
      throw new Error(`/?mode=pit ${viewport.name} changed wall invariants:\n${diffs.join('\n')}`);
    }
    log(`PASS /?mode=pit ${viewport.name}`);
  } finally {
    await context.close();
  }
}

async function auditLiveResizeBoundary(browser) {
  const context = await browser.newContext({
    viewport: { width: 599, height: 900 },
    deviceScaleFactor: 1,
  });
  await context.addInitScript(() => {
    globalThis.__ABS_ROUTE_PERF_AUDIT__ = true;
    localStorage.setItem('theme-preference-v3', 'light');
  });
  const page = await context.newPage();
  try {
    await page.goto(routeUrl('/', { mode: 'pit' }), { waitUntil: 'domcontentloaded', timeout: NAVIGATION_TIMEOUT_MS });
    await waitForWallReady(page, '/?mode=pit live-resize initial');
    await waitForPhysicalSimulationBoundary(page);
    const initial = await readInvariantState(page);
    const resizeSequence = [
      { name: '599→600', width: 600, height: 900 },
      { name: '600→601', width: 601, height: 900 },
      { name: '601→600', width: 600, height: 900 },
      { name: '600→480', width: 480, height: 900 },
      { name: '480→991', width: 991, height: 900 },
      { name: '991→320', width: 320, height: 720 },
      { name: '320→390-portrait', width: 390, height: 844 },
      { name: 'portrait→landscape', width: 844, height: 390 },
      { name: 'landscape→portrait', width: 390, height: 844 },
    ];

    for (const viewport of resizeSequence) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await waitForWallReady(page, `/?mode=pit live-resize ${viewport.name}`);
      await waitForPhysicalSimulationBoundary(page);
      const state = await readInvariantState(page);
      assertExactRadiusContract(state, '/?mode=pit live-resize', viewport);
      assertExactSimulationRadiusContract(state, '/?mode=pit live-resize', viewport, { requireLiveCanvas: true });
      assertExactRenderedBoundary(state, '/?mode=pit live-resize', viewport, { requireLiveCanvas: true });
      if (initial.physicsCanvasGeneration !== state.physicsCanvasGeneration) {
        throw new Error(`/?mode=pit ${viewport.name} live resize remounted the canvas`);
      }
      log(`PASS /?mode=pit live-resize-${viewport.name}`);
    }
  } finally {
    await context.close();
  }
}

async function run() {
  const server = await ensureDevServer();
  try {
    let browser = await browserType.launch();
    try {
      for (const route of routes) {
        for (const viewport of viewports) {
          await auditRoute(browser, route, viewport);
        }
      }
    } finally {
      await browser.close();
    }

    browser = await browserType.launch();
    try {
      for (const viewport of viewports) {
        await auditBallPitBoundary(browser, viewport);
      }
      await auditLiveResizeBoundary(browser);
    } finally {
      await browser.close();
    }
  } finally {
    await server?.stop();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
