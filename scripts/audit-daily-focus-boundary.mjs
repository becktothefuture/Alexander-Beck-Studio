#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoRoot = resolve(import.meta.dirname, '..');
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');
const homeRoutePath = resolve(repoRoot, 'react-app/app/src/routes/home/HomeRoute.jsx');
const dailyFocusRoutePath = resolve(repoRoot, 'react-app/app/src/routes/daily-focus/DailyFocusRoute.jsx');
const simulationStagePath = resolve(repoRoot, 'react-app/app/src/routes/daily-focus/SimulationStage.jsx');
const dailyFocusRuntimesPath = resolve(repoRoot, 'react-app/app/src/routes/daily-focus/dailyFocusRuntimes.jsx');
const providerPath = resolve(repoRoot, 'react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx');

const baseUrl = process.env.ABS_DEV_URL || 'http://localhost:8013';
const waitMs = Number(process.env.ABS_DAILY_FOCUS_WAIT_MS || 30000);
const viewport = {
  width: Number(process.env.ABS_DAILY_FOCUS_WIDTH || 390),
  height: Number(process.env.ABS_DAILY_FOCUS_HEIGHT || 844),
};
const palette = process.env.ABS_DAILY_FOCUS_PALETTE || '';
const theme = process.env.ABS_DAILY_FOCUS_THEME || '';
const expectedDailyFocusCount = process.env.ABS_DAILY_FOCUS_EXPECTED_COUNT === undefined
  ? null
  : Number(process.env.ABS_DAILY_FOCUS_EXPECTED_COUNT);
const DAILY_FOCUS_RUNTIME_COMPATIBILITY_CASES = new Set([
  // Collection-only lab route kept available to the Daily Focus shell for
  // direct-route compatibility, but not part of public Daily rotation.
  'beach-ball-room',
]);

function pageUrl(path) {
  return new URL(path, baseUrl).toString();
}

async function readCatalog() {
  return JSON.parse(await readFile(catalogPath, 'utf8'));
}

function isRouteBackedDailyEntry(entry) {
  return entry?.stage === 'daily-rotation'
    && entry?.surface === 'lab-route'
    && typeof entry.dailyHref === 'string'
    && entry.dailyHref.includes('daily=1');
}

function dailyRoutePath(entry) {
  const url = new URL(entry.dailyHref, baseUrl);
  if (palette) url.searchParams.set('palette', palette);
  return `${url.pathname}${url.search}${url.hash}`;
}

async function runStaticChecks(dailyEntries, routeBackedDailyEntries) {
  const failures = [];
  const homeRouteSource = await readFile(homeRoutePath, 'utf8');
  const dailyFocusRouteSource = await readFile(dailyFocusRoutePath, 'utf8');
  const simulationStageSource = await readFile(simulationStagePath, 'utf8');
  const dailyFocusRuntimesSource = await readFile(dailyFocusRuntimesPath, 'utf8');
  const providerSource = await readFile(providerPath, 'utf8');

  if (!homeRouteSource.includes('simulationLayer: (')) {
    failures.push('HomeRoute no longer exposes a replaceable simulationLayer.');
  }
  if (!dailyFocusRouteSource.includes('getHomeRouteView')) {
    failures.push('DailyFocusRoute no longer composes from getHomeRouteView.');
  }
  if (!dailyFocusRouteSource.includes('legacyRuntime: false')) {
    failures.push('DailyFocusRoute no longer disables the legacy home runtime.');
  }
  if (!dailyFocusRouteSource.includes('<SimulationStage')) {
    failures.push('DailyFocusRoute no longer mounts route-backed simulations through SimulationStage.');
  }
  if (!simulationStageSource.includes('className="daily-simulation-layer"')) {
    failures.push('SimulationStage no longer owns .daily-simulation-layer.');
  }
  if (!simulationStageSource.includes('data-simulation-stage="daily-focus"')) {
    failures.push('SimulationStage no longer marks daily-focus stage data.');
  }
  if (!providerSource.includes('replaceCurrentUrl(buildRouteHref(\'home\'))')) {
    failures.push('SimulationFocusProvider no longer cleans route-backed Daily URLs back to home.');
  }
  for (const entry of routeBackedDailyEntries) {
    if (!dailyFocusRuntimesSource.includes(`case '${entry.id}'`)) {
      failures.push(`Daily Focus pure runtime is missing a route-backed case for "${entry.id}".`);
    }
  }
  const extraRuntimeCases = Array.from(dailyFocusRuntimesSource.matchAll(/case\s+['"]([^'"]+)['"]\s*:/g))
    .map((match) => match[1])
    .filter((id) => !DAILY_FOCUS_RUNTIME_COMPATIBILITY_CASES.has(id))
    .filter((id) => !routeBackedDailyEntries.some((entry) => entry.id === id));
  if (extraRuntimeCases.length) {
    failures.push(`Daily Focus pure runtime has extra route-backed case(s): ${extraRuntimeCases.join(', ')}.`);
  }

  return failures;
}

async function waitForFocusRuntime(page, id) {
  await page.waitForSelector('.daily-simulation-layer', { timeout: waitMs });
  await page.waitForFunction((simulationId) => {
    const layer = document.querySelector('.daily-simulation-layer');
    const runtime = Array.from(document.querySelectorAll('.daily-focus-runtime'))
      .find((element) => element?.dataset?.simulationId === simulationId);
    const canvas = Array.from(runtime?.querySelectorAll('canvas') || [])
      .find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 10 && rect.height > 10;
      });
    const rect = canvas?.getBoundingClientRect?.();
    return (
      layer?.dataset.simulationId === simulationId
      && runtime
      && !document.documentElement.classList.contains('abs-direct-boot-staging')
      && (document.documentElement.dataset.absBootState || '') !== 'booting'
      && rect
      && rect.width > 10
      && rect.height > 10
      && !document.querySelector('#c')
    );
  }, id, { timeout: waitMs, polling: 50 });
}

async function inspectPage(page, id, baseline) {
  return page.evaluate(({ simulationId, baselineSnapshot }) => {
    const errors = [];
    const visibleRect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        display: style.display,
        visibility: style.visibility,
        opacity: Number.parseFloat(style.opacity || '1'),
        top: Math.round(rect.top),
        left: Math.round(rect.left),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    };
    const snapshot = {
      htmlClass: document.documentElement.className,
      bodyClass: document.body.className,
      wallBackground: getComputedStyle(document.getElementById('simulations')).backgroundColor,
      textLogo: getComputedStyle(document.documentElement).getPropertyValue('--text-logo').trim(),
      textMuted: getComputedStyle(document.documentElement).getPropertyValue('--text-color-dark-muted').trim(),
      shell: {
        title: visibleRect('#hero-title'),
        links: visibleRect('#main-links'),
        legend: visibleRect('#expertise-legend'),
        description: visibleRect('.decorative-script'),
        footer: visibleRect('.ui-bottom'),
        edgeCaption: visibleRect('#edge-caption'),
        londonTime: visibleRect('#site-year'),
      },
    };

    const layer = document.querySelector('.daily-simulation-layer');
    const runtime = Array.from(document.querySelectorAll('.daily-focus-runtime'))
      .find((element) => element?.dataset?.simulationId === simulationId);
    const canvas = Array.from(runtime?.querySelectorAll('canvas') || [])
      .find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 10 && rect.height > 10;
      });
    const url = new URL(window.location.href);
    const blockedParams = ['daily', 'focus', 'mode', 'simulation'].filter((param) => url.searchParams.has(param));
    if (!layer) errors.push('Missing .daily-simulation-layer.');
    if (!runtime) errors.push('Missing .daily-focus-runtime for active simulation.');
    if (!canvas) errors.push('Missing visible Daily Focus runtime canvas.');
    if (document.querySelector('#c')) errors.push('Legacy #c canvas is present on Daily Simulation homepage.');
    if (layer?.dataset.simulationId !== simulationId) {
      errors.push(`Expected active simulation "${simulationId}", got "${layer?.dataset.simulationId || 'none'}".`);
    }
    if (url.pathname.startsWith('/lab/') || blockedParams.length) {
      errors.push(`Daily Simulation route did not settle to a clean home URL: ${url.pathname}${url.search}.`);
    }

    const textWalker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (textWalker.nextNode()) {
      const text = textWalker.currentNode.nodeValue.replace(/\s+/g, ' ').trim();
      if (text) textNodes.push(text);
    }
    if (textNodes.length) {
      errors.push(`Visible/text DOM found in simulation layer: ${textNodes.slice(0, 6).join(' | ')}`);
    }

    const forbiddenUi = layer.querySelector('aside, header, footer, nav, h1, h2, h3, p:not(.screen-reader), button, input, textarea, select, label, [role="alert"], [role="status"]:not(.screen-reader)');
    if (forbiddenUi) {
      errors.push(`Non-runtime UI element found in simulation layer: ${forbiddenUi.tagName.toLowerCase()}.`);
    }

    const backgroundOffenders = Array.from(layer.querySelectorAll('*'))
      .filter((element) => {
        if (element instanceof HTMLCanvasElement || element instanceof SVGElement) return false;
        const style = getComputedStyle(element);
        const color = style.backgroundColor;
        return color
          && color !== 'transparent'
          && color !== 'rgba(0, 0, 0, 0)'
          && !color.endsWith(', 0)');
      })
      .map((element) => element.className || element.tagName.toLowerCase());
    if (backgroundOffenders.length) {
      errors.push(`Non-transparent DOM background in simulation layer: ${backgroundOffenders.join(', ')}.`);
    }

    Object.entries(snapshot.shell).forEach(([name, rect]) => {
      if (!rect || rect.width <= 0 || rect.height <= 0) {
        errors.push(`${name} missing or zero-size.`);
        return;
      }
      if (rect.display === 'none' || rect.visibility === 'hidden' || rect.opacity < 0.45) {
        errors.push(`${name} hidden or too transparent.`);
      }
    });

    if (baselineSnapshot) {
      const compareKeys = ['htmlClass', 'bodyClass', 'wallBackground', 'textLogo', 'textMuted'];
      compareKeys.forEach((key) => {
        if (snapshot[key] !== baselineSnapshot[key]) {
          errors.push(`${key} changed across simulations: "${baselineSnapshot[key]}" -> "${snapshot[key]}".`);
        }
      });
      Object.entries(snapshot.shell).forEach(([name, rect]) => {
        const base = baselineSnapshot.shell?.[name];
        if (!base || !rect) return;
        const drift = Math.abs(rect.top - base.top)
          + Math.abs(rect.left - base.left)
          + Math.abs(rect.width - base.width)
          + Math.abs(rect.height - base.height);
        if (drift > 8) {
          errors.push(`${name} layout drifted by ${drift}px across simulations.`);
        }
      });
    }

    return { ok: errors.length === 0, errors, snapshot };
  }, { simulationId: id, baselineSnapshot: baseline });
}

async function main() {
  const catalog = await readCatalog();
  const dailyEntries = catalog.simulations.filter((entry) => entry.stage === 'daily-rotation');
  const routeBackedDailyEntries = dailyEntries.filter(isRouteBackedDailyEntry);
  const failures = await runStaticChecks(dailyEntries, routeBackedDailyEntries);
  if (dailyEntries.length <= 0) {
    failures.push('Expected at least one Daily Simulation entry in the catalog.');
  }
  if (routeBackedDailyEntries.length <= 0) {
    failures.push('Expected at least one route-backed Daily Simulation entry in the catalog.');
  }
  if (Number.isFinite(expectedDailyFocusCount) && dailyEntries.length !== expectedDailyFocusCount) {
    failures.push(`Expected ${expectedDailyFocusCount} Daily Simulation entries, found ${dailyEntries.length}.`);
  }
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport,
    deviceScaleFactor: Number(process.env.ABS_DAILY_FOCUS_DPR || 1),
  });
  if (theme === 'light' || theme === 'dark' || theme === 'auto') {
    await page.emulateMedia({ colorScheme: theme === 'dark' ? 'dark' : 'light' });
    await page.addInitScript((themePreference) => {
      window.localStorage.setItem('theme-preference-v2', themePreference);
    }, theme);
  }
  let baseline = null;

  try {
    for (const entry of routeBackedDailyEntries) {
      await page.goto(pageUrl(dailyRoutePath(entry)), { waitUntil: 'networkidle', timeout: 60000 });
      await waitForFocusRuntime(page, entry.id);
      const result = await inspectPage(page, entry.id, baseline);
      if (!result.ok) {
        failures.push(`${entry.id}: ${result.errors.join('; ')}`);
      }
      baseline = baseline || result.snapshot;
    }
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error('Daily Simulation boundary audit failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(JSON.stringify({
    ok: true,
    dailySimulationCount: dailyEntries.length,
    routeBackedDailySimulationCount: routeBackedDailyEntries.length,
    viewport,
    palette: palette || 'default',
    theme: theme || 'default',
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
