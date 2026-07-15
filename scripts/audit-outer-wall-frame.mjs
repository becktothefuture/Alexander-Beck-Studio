import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { chromium, firefox, webkit } from 'playwright';
import { PNG } from 'pngjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const designSystemPath = resolve(repoRoot, 'react-app/app/public/config/design-system.json');
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');
const baseUrl = process.env.ABS_OUTER_WALL_AUDIT_URL || 'http://127.0.0.1:8012/index.html';
const shouldStartDevServer = !process.env.ABS_OUTER_WALL_AUDIT_URL;
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = { chromium, firefox, webkit }[browserName] || chromium;
const siteThemes = ['light', 'dark'];
const browserSchemes = ['light', 'dark'];
const browserSchemeFrames = {
  chromium: {
    light: '#f1f3f4',
    dark: '#202124',
  },
  firefox: {
    light: '#f9f9fb',
    dark: '#1c1b22',
  },
  webkit: {
    light: '#f1f3f4',
    dark: '#202124',
  },
};
const browserProfiles = browserName === 'chromium'
  ? [
      {
        name: 'desktop-browser-chrome',
        context: {
          viewport: { width: 1400, height: 900 },
          deviceScaleFactor: 1,
        },
      },
      {
        name: 'android-theme-color',
        context: {
          viewport: { width: 390, height: 844 },
          deviceScaleFactor: 2,
          isMobile: true,
          hasTouch: true,
          userAgent: 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36',
        },
      },
    ]
  : browserName === 'firefox'
    ? [
        {
          name: 'desktop-browser-chrome',
          context: {
            viewport: { width: 1400, height: 900 },
            deviceScaleFactor: 1,
          },
        },
      ]
    : [
      {
        name: 'desktop-theme-color',
        context: {
          viewport: { width: 1400, height: 900 },
          deviceScaleFactor: 1,
        },
      },
      {
        name: 'iphone-theme-color',
        context: {
          viewport: { width: 390, height: 844 },
          deviceScaleFactor: 3,
          isMobile: true,
          hasTouch: true,
          userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1',
        },
      },
    ];

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

function cssColorToRgba(value) {
  const input = String(value || '').trim();
  const rgb = input.match(/^rgba?\(\s*([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*,\s*|\s+)([\d.]+)(?:\s*(?:,|\/)\s*([\d.]+))?\s*\)$/i);
  if (rgb) {
    return [
      Math.round(Number(rgb[1])),
      Math.round(Number(rgb[2])),
      Math.round(Number(rgb[3])),
      rgb[4] === undefined ? 1 : Number(rgb[4]),
    ];
  }

  const srgb = input.match(/^color\(srgb\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)(?:\s*\/\s*([\d.]+))?\s*\)$/i);
  if (srgb) {
    return [
      Math.round(Number(srgb[1]) * 255),
      Math.round(Number(srgb[2]) * 255),
      Math.round(Number(srgb[3]) * 255),
      srgb[4] === undefined ? 1 : Number(srgb[4]),
    ];
  }

  return null;
}

function compositeRgba(foreground, background) {
  const alpha = Math.min(1, Math.max(0, foreground[3]));
  return [
    Math.round((foreground[0] * alpha) + (background[0] * (1 - alpha))),
    Math.round((foreground[1] * alpha) + (background[1] * (1 - alpha))),
    Math.round((foreground[2] * alpha) + (background[2] * (1 - alpha))),
  ];
}

function relativeLuminance(rgb) {
  const channels = rgb.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return (channels[0] * 0.2126) + (channels[1] * 0.7152) + (channels[2] * 0.0722);
}

function contrastRatio(foreground, background) {
  const foregroundLuminance = relativeLuminance(foreground);
  const backgroundLuminance = relativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function pixelDistance(a, b) {
  return Math.max(
    Math.abs(a[0] - b[0]),
    Math.abs(a[1] - b[1]),
    Math.abs(a[2] - b[2]),
  );
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
    homeMode,
    routeBacked,
    frame: {
      light: designSystem.shell?.theme?.siteFrameLight || '#141414',
      dark: designSystem.shell?.theme?.siteFrameDark || '#141414',
    },
    window: {
      light: designSystem.runtime?.bgLight || '#f5f5f5',
      dark: designSystem.runtime?.bgDark || '#141414',
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
    const activeTab = document.querySelector('[data-route-tab][aria-current="page"]');
    const activeContent = activeTab?.querySelector('.shell-tab__label, .shell-tab__icon');
    const inactiveTab = document.querySelector('[data-route-tab]:not([aria-current="page"])');
    const buttonBar = inactiveTab?.closest('.button-bar');
    const activePill = buttonBar?.querySelector('.button-bar__active-pill');
    const soundToggle = buttonBar?.querySelector('.button-bar__sound-toggle');
    const themeToggle = buttonBar?.querySelector('.button-bar__theme-toggle');
    const themeThumb = buttonBar?.querySelector('.button-bar__theme-thumb');
    const activeStyle = activeTab ? getComputedStyle(activeTab) : null;
    const activeContentStyle = activeContent ? getComputedStyle(activeContent) : null;
    const inactiveStyle = inactiveTab ? getComputedStyle(inactiveTab) : null;
    const activePillStyle = activePill ? getComputedStyle(activePill) : null;
    const soundStyle = soundToggle ? getComputedStyle(soundToggle) : null;
    const themeStyle = themeToggle ? getComputedStyle(themeToggle) : null;
    const themeThumbStyle = themeThumb ? getComputedStyle(themeThumb) : null;
    return {
      boot: root.dataset.absBootState || '',
      transition: root.dataset.absSimulationFocusTransition || '',
      label: document.querySelector('.simulation-focus-pill__label')?.textContent?.trim() || '',
      absBrowserChrome: rootStyle.getPropertyValue('--abs-browser-chrome').trim(),
      frameColor: rootStyle.getPropertyValue('--frame-color').trim(),
      wallColor: rootStyle.getPropertyValue('--wall-color').trim(),
      chromeBg: rootStyle.getPropertyValue('--chrome-bg').trim(),
      lightBrowserChrome: root.hasAttribute('data-abs-light-browser-chrome'),
      siteFrameLight: rootStyle.getPropertyValue('--frame-color-site-light').trim(),
      studioWindow: rootStyle.getPropertyValue('--studio-window-bg').trim(),
      frameInnerSurface: rootStyle.getPropertyValue('--frame-inner-surface').trim(),
      bodyBackground: bodyStyle.backgroundColor,
      activeTabBackground: activeStyle?.backgroundColor || '',
      activePillBackground: activePillStyle?.display === 'none' ? '' : activePillStyle?.backgroundColor || '',
      activeTabColor: activeContentStyle?.color || activeStyle?.color || '',
      activeTabBorder: activeStyle?.borderTopColor || '',
      inactiveTabBackground: inactiveStyle?.backgroundColor || '',
      buttonBarBackground: buttonBar ? getComputedStyle(buttonBar).backgroundColor : '',
      inactiveTabBorder: inactiveStyle?.borderTopColor || '',
      soundToggleBackground: soundStyle?.backgroundColor || '',
      soundToggleColor: soundStyle?.color || '',
      themeToggleBackground: themeStyle?.backgroundColor || '',
      themeToggleColor: themeStyle?.color || '',
      themeThumbBackground: themeThumbStyle?.backgroundColor || '',
      themeThumbColor: themeThumbStyle?.color || '',
    };
  });

  const png = PNG.sync.read(await page.screenshot({ fullPage: false }));
  const x = 0;
  const y = Math.min(100, png.height - 1);
  const offset = (y * png.width + x) * 4;
  return {
    ...vars,
    outerPixel: [png.data[offset], png.data[offset + 1], png.data[offset + 2], png.data[offset + 3]],
  };
}

function assertFrameState(siteTheme, browserScheme, phase, actual, expectedHex, expectedWindow, checkOuterPixel = true, expectLightBrowserChrome = false) {
  const expected = normalizeHex(expectedHex);
  for (const key of ['absBrowserChrome', 'frameColor', 'wallColor', 'chromeBg']) {
    if (normalizeHex(actual[key]) !== expected) {
      throw new Error(`${siteTheme}/${browserScheme}/${phase} ${key}: expected ${expectedHex}, got ${actual[key]}`);
    }
  }

  const expectedOuterRgb = cssRgbToRgb(actual.bodyBackground);
  if (!expectedOuterRgb) throw new Error(`${siteTheme}/${browserScheme}/${phase} could not parse body background ${actual.bodyBackground}`);
  if (checkOuterPixel && pixelDistance(actual.outerPixel, expectedOuterRgb) > 2) {
    throw new Error(`${siteTheme}/${browserScheme}/${phase} outer pixel: expected body background ${expectedOuterRgb.join(',')}, got ${actual.outerPixel.join(',')}`);
  }
  if (normalizeHex(actual.studioWindow) !== normalizeHex(expectedWindow)) {
    throw new Error(`${siteTheme}/${browserScheme}/${phase} studioWindow: expected ${expectedWindow}, got ${actual.studioWindow}`);
  }
  if (normalizeHex(actual.frameInnerSurface) !== normalizeHex(expectedWindow)) {
    throw new Error(`${siteTheme}/${browserScheme}/${phase} frameInnerSurface: expected ${expectedWindow}, got ${actual.frameInnerSurface}`);
  }

  const expectedFrameRgb = hexToRgb(expectedHex);
  const inactiveBackground = cssColorToRgba(actual.inactiveTabBackground);
  const buttonBarBackground = cssColorToRgba(actual.buttonBarBackground);
  const bodyBackground = cssColorToRgba(actual.bodyBackground);
  const activeBackground = cssColorToRgba(actual.activePillBackground || actual.activeTabBackground);
  const activeForeground = cssColorToRgba(actual.activeTabColor);
  if (!expectedFrameRgb || !inactiveBackground || !buttonBarBackground || !bodyBackground || !activeBackground || !activeForeground) {
    throw new Error(`${siteTheme}/${browserScheme}/${phase} could not parse Button Bar colours: ${JSON.stringify({
      expectedHex,
      inactiveTabBackground: actual.inactiveTabBackground,
      buttonBarBackground: actual.buttonBarBackground,
      activeTabBackground: actual.activeTabBackground,
      activePillBackground: actual.activePillBackground,
      activeTabColor: actual.activeTabColor,
    })}`);
  }

  const compositedButtonBarBackground = compositeRgba(buttonBarBackground, bodyBackground);
  const compositedInactiveBackground = compositeRgba(inactiveBackground, compositedButtonBarBackground);
  if (pixelDistance(compositedInactiveBackground, expectedFrameRgb) > 2) {
    throw new Error(`${siteTheme}/${browserScheme}/${phase} inactive Button Bar surface must match outer frame: expected ${expectedFrameRgb.join(',')}, got ${compositedInactiveBackground.join(',')}`);
  }

  if (activeBackground[3] < 0.9) {
    throw new Error(`${siteTheme}/${browserScheme}/${phase} active Button Bar surface must be an opaque selected state: got ${actual.activePillBackground || actual.activeTabBackground}`);
  }

  const compositedForeground = compositeRgba(activeForeground, activeBackground);
  const activeContrast = contrastRatio(compositedForeground, activeBackground);
  if (activeContrast < 4.5) {
    throw new Error(`${siteTheme}/${browserScheme}/${phase} active Button Bar contrast ${activeContrast.toFixed(2)} is below 4.5:1: foreground=${actual.activeTabColor} background=${actual.activePillBackground || actual.activeTabBackground}`);
  }

  actual.activeTabContrast = Number(activeContrast.toFixed(2));

  if (actual.lightBrowserChrome !== expectLightBrowserChrome) {
    throw new Error(`${siteTheme}/${browserScheme}/${phase} light browser chrome marker: expected ${expectLightBrowserChrome}, got ${actual.lightBrowserChrome}`);
  }

  const assertUtilityControl = (name, backgroundValue, colorValue, surfaceBackground = compositedButtonBarBackground) => {
    const background = cssColorToRgba(backgroundValue);
    const foreground = cssColorToRgba(colorValue);
    if (!background || !foreground) {
      throw new Error(`${siteTheme}/${browserScheme}/${phase} could not parse ${name} colours: background=${backgroundValue} color=${colorValue}`);
    }

    const compositedBackground = compositeRgba(background, surfaceBackground);
    if (pixelDistance(compositedBackground, expectedFrameRgb) > 2) {
      throw new Error(`${siteTheme}/${browserScheme}/${phase} ${name} surface must match outer frame: expected ${expectedFrameRgb.join(',')}, got ${compositedBackground.join(',')} from ${backgroundValue}`);
    }

    const compositedControlForeground = compositeRgba(foreground, compositedBackground);
    const controlContrast = contrastRatio(compositedControlForeground, compositedBackground);
    if (controlContrast < 3) {
      throw new Error(`${siteTheme}/${browserScheme}/${phase} ${name} icon contrast ${controlContrast.toFixed(2)} is below 3:1: foreground=${colorValue} background=${backgroundValue}`);
    }

    return Number(controlContrast.toFixed(2));
  };

  actual.utilityControlContrast = {
    sound: assertUtilityControl('sound-toggle', actual.soundToggleBackground, actual.soundToggleColor),
    themeTrack: assertUtilityControl('theme-toggle', actual.themeToggleBackground, actual.themeToggleColor),
    themeThumb: assertUtilityControl('theme-thumb', actual.themeThumbBackground, actual.themeThumbColor, cssColorToRgba(actual.themeToggleBackground) ? compositeRgba(cssColorToRgba(actual.themeToggleBackground), compositedButtonBarBackground) : compositedButtonBarBackground),
  };

  if (expectLightBrowserChrome) {
    const inactiveBorder = cssColorToRgba(actual.inactiveTabBorder);
    const activeBorder = cssColorToRgba(actual.activeTabBorder);
    if (!inactiveBorder || !activeBorder) {
      throw new Error(`${siteTheme}/${browserScheme}/${phase} could not parse light Button Bar borders: inactive=${actual.inactiveTabBorder} active=${actual.activeTabBorder}`);
    }

    const inactiveBorderContrast = contrastRatio(compositeRgba(inactiveBorder, expectedFrameRgb), expectedFrameRgb);
    const activeBorderContrast = contrastRatio(compositeRgba(activeBorder, expectedFrameRgb), expectedFrameRgb);
    if (inactiveBorderContrast > 1.35 || activeBorderContrast > 1.55) {
      throw new Error(`${siteTheme}/${browserScheme}/${phase} light Button Bar borders are too strong: inactive=${inactiveBorderContrast.toFixed(2)} active=${activeBorderContrast.toFixed(2)}`);
    }
    actual.buttonBorderContrast = {
      inactive: Number(inactiveBorderContrast.toFixed(2)),
      active: Number(activeBorderContrast.toFixed(2)),
    };
  }
}

async function runCase(browser, siteTheme, browserScheme, expectations, profile) {
  const expectedFrame = browserSchemeFrames[browserName][browserScheme];
  const expectedWindow = expectations.window[siteTheme];
  const expectLightBrowserChrome = browserScheme === 'light';
  const context = await browser.newContext({
    ...profile.context,
    colorScheme: browserScheme,
  });
  await context.addInitScript(({ themeName }) => {
    localStorage.setItem('theme-preference-v3', themeName);
  }, {
    themeName: siteTheme,
  });

  const page = await context.newPage();
  try {
    const homeModeUrl = new URL(baseUrl);
    homeModeUrl.searchParams.set('mode', expectations.homeMode.id);
    await page.goto(homeModeUrl.toString(), { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => ['ready', 'failed'].includes(document.documentElement.dataset.absBootState), null, { timeout: 15000 });
    await page.waitForTimeout(1200);

    const directHome = await readFrameState(page);
    assertFrameState(siteTheme, browserScheme, `direct-home-${expectations.homeMode.id}`, directHome, expectedFrame, expectedWindow, !profile.context.isMobile, expectLightBrowserChrome);

    await page.locator('.simulation-focus-switcher').click({ timeout: 5000 });
    await page.locator('.simulation-focus-row').filter({ hasText: expectations.routeBacked.name }).click({ timeout: 5000 });
    await page.waitForFunction((name) => (
      document.querySelector('.simulation-focus-pill__label')?.textContent?.trim() === name
      && document.documentElement.dataset.absSimulationFocusTransition !== 'out'
      && document.documentElement.dataset.absSimulationFocusTransition !== 'hold'
      && document.documentElement.dataset.absSimulationFocusTransition !== 'in'
      && !document.querySelector('#modal-blur-layer.active')
    ), expectations.routeBacked.name, { timeout: 15000 });
    await page.waitForTimeout(1200);

    const routeBacked = await readFrameState(page);
    assertFrameState(siteTheme, browserScheme, `route-backed-${expectations.routeBacked.id}`, routeBacked, expectedFrame, expectedWindow, !profile.context.isMobile, expectLightBrowserChrome);

    log(`engine=${browserName} profile=${profile.name} site=${siteTheme} browser=${browserScheme}: ${expectations.homeMode.id} -> ${expectations.routeBacked.id} frame=${expectedFrame} active-contrast=${routeBacked.activeTabContrast}:1`);
  } finally {
    await context.close();
  }
}

async function run() {
  const expectations = loadExpectations();
  const server = await ensureDevServer();
  const browser = await browserType.launch();

  try {
    for (const profile of browserProfiles) {
      for (const browserScheme of browserSchemes) {
        for (const siteTheme of siteThemes) {
          await runCase(browser, siteTheme, browserScheme, expectations, profile);
        }
      }
    }
  } finally {
    await browser.close();
    await server?.stop();
  }

  log(`PASS (${browserName}): browser/OS scheme owns outer harmony, Button Bar material follows it, and site theme independently owns the studio-window surface.`);
}

run().catch((error) => {
  console.error(`[outer-wall-frame] FAIL: ${error.message}`);
  process.exit(1);
});
