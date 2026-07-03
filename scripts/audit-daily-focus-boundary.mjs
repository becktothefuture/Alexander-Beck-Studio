#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoRoot = resolve(import.meta.dirname, '..');
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');
const dailyFocusSourceChecks = [
  resolve(repoRoot, 'react-app/app/src/routes/daily-focus/DailyFocusRoute.jsx'),
  resolve(repoRoot, 'react-app/app/src/routes/daily-focus/dailyFocusRuntimes.jsx'),
];
const runtimeSourceChecks = [
  resolve(repoRoot, 'react-app/app/src/routes/wall-repel/WallRepelRuntime.jsx'),
  resolve(repoRoot, 'react-app/app/src/routes/flock-of-birds/FlockOfBirdsRuntime.jsx'),
  resolve(repoRoot, 'react-app/app/src/routes/mineral-growth/MineralGrowthRuntime.jsx'),
  resolve(repoRoot, 'react-app/app/src/routes/beach-ball-room/BeachBallRoomRuntime.jsx'),
  resolve(repoRoot, 'react-app/app/src/routes/concept-simulations/NapoleonPointCloudRuntime.jsx'),
  resolve(repoRoot, 'react-app/app/src/routes/concept-simulations/PressureMosaicRuntime.jsx'),
];
const runtimeCssChecks = [
  resolve(repoRoot, 'react-app/app/src/routes/wall-repel/wall-repel-runtime.css'),
  resolve(repoRoot, 'react-app/app/src/routes/flock-of-birds/flock-of-birds-runtime.css'),
  resolve(repoRoot, 'react-app/app/src/routes/mineral-growth/mineral-growth-runtime.css'),
  resolve(repoRoot, 'react-app/app/src/routes/beach-ball-room/beach-ball-room-runtime.css'),
  resolve(repoRoot, 'react-app/app/src/routes/concept-simulations/concept-simulations-runtime.css'),
];

const baseUrl = process.env.ABS_DEV_URL || 'http://localhost:8013';
const failFast = process.env.ABS_AUDIT_FAIL_FAST !== '0';

function pageUrl(path) {
  return new URL(path, baseUrl).toString();
}

async function readCatalog() {
  return JSON.parse(await readFile(catalogPath, 'utf8'));
}

async function runStaticChecks(dailyRouteIds) {
  const failures = [];
  const dailyFocusRouteSource = await readFile(dailyFocusSourceChecks[0], 'utf8');
  if (/Demo\s+dailyFocus|dailyFocus\s*\/?>/.test(dailyFocusRouteSource)) {
    failures.push('DailyFocusRoute still renders demo components with dailyFocus flags.');
  }
  if (/from ['"].*\bDemo\.jsx['"]/.test(dailyFocusRouteSource)) {
    failures.push('DailyFocusRoute imports lab demo modules.');
  }

  const runtimeRegistry = await readFile(dailyFocusSourceChecks[1], 'utf8');
  for (const routeId of dailyRouteIds) {
    if (!runtimeRegistry.includes(routeId)) {
      failures.push(`dailyFocusRuntimes is missing enabled route-backed simulation "${routeId}".`);
    }
  }

  const forbiddenMutation = /document\.(?:body|documentElement)\.(?:classList|style|dataset|setAttribute|removeAttribute)|document\.body\.appendChild|document\.body\.removeChild/;
  const forbiddenLabCssImport = /import\s+['"]\.\/(?:wall-repel|flock-of-birds|mineral-growth|beach-ball-room|concept-simulations)\.css['"]/;
  for (const path of runtimeSourceChecks) {
    const source = await readFile(path, 'utf8');
    if (forbiddenMutation.test(source)) {
      failures.push(`${path.replace(`${repoRoot}/`, '')} mutates body/html or appends global DOM from a Daily Focus runtime.`);
    }
    if (forbiddenLabCssImport.test(source)) {
      failures.push(`${path.replace(`${repoRoot}/`, '')} imports lab/page CSS instead of runtime-only CSS.`);
    }
  }

  const forbiddenRuntimeCss = /\bbody\.|#simulations|route-topbar|inner-wall|frame-vignette|parameterizer|panel|controls|fallback|\bground\b/;
  for (const path of runtimeCssChecks) {
    const source = await readFile(path, 'utf8');
    if (forbiddenRuntimeCss.test(source)) {
      failures.push(`${path.replace(`${repoRoot}/`, '')} contains lab/page selectors in runtime CSS.`);
    }
  }

  return failures;
}

async function waitForDailyFocusRoute(page, id) {
  await page.waitForSelector('.daily-simulation-layer', { timeout: 15000 });
  await page.waitForFunction((simulationId) => {
    const layer = document.querySelector('.daily-simulation-layer');
    if (!layer || layer.dataset.simulationId !== simulationId) return false;

    if (simulationId === 'napoleon-point-cloud') {
      const figure = layer.querySelector('.napoleon-point-cloud');
      const loadState = figure?.dataset.pointCloudLoadState;
      if (loadState === 'error') return true;
      const canvases = Array.from(layer.querySelectorAll('canvas'));
      const canvasesSized = canvases.length > 0 && canvases.every((canvas) => {
        const rect = canvas.getBoundingClientRect();
        return rect.width > 10 && rect.height > 10;
      });
      return loadState === 'ready' && canvasesSized;
    }

    if (simulationId === 'beach-ball-room') {
      const container = layer.querySelector('.beach-ball-room-simulation');
      if (container?.dataset.beachBallRoomLoadState === 'error') return true;
    }

    const canvases = Array.from(layer.querySelectorAll('canvas'));
    if (!canvases.length) return false;
    const canvasesSized = canvases.every((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return rect.width > 10 && rect.height > 10;
    });
    return canvasesSized;
  }, id, { timeout: 20000 });
}

async function inspectDailyLayer(page) {
  return page.evaluate(async () => {
    const layer = document.querySelector('.daily-simulation-layer');
    if (!layer) {
      return { ok: false, errors: ['Missing .daily-simulation-layer.'] };
    }

    const errors = [];
    const panelSelector = [
      'aside',
      'header',
      'footer',
      'nav',
      'h1',
      'h2',
      'h3',
      'p:not(.screen-reader)',
      'figcaption',
      'label',
      'input',
      'button',
      'textarea',
      'select',
      '[role="alert"]',
      '[role="status"]:not(.screen-reader)',
      '.parameterizer-panel',
      '.beach-ball-room-controls',
      '.flock-of-birds-ground',
      '.napoleon-point-cloud__credit',
      '.napoleon-point-cloud__title',
      '.napoleon-point-cloud__status',
    ].join(',');

    const panels = Array.from(layer.querySelectorAll(panelSelector))
      .filter((element) => {
        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== 'none'
          && style.visibility !== 'hidden'
          && Number(style.opacity) !== 0
          && rect.width > 0
          && rect.height > 0;
      })
      .map((element) => element.className || element.tagName.toLowerCase());
    if (panels.length) {
      errors.push(`Visible non-runtime UI found in simulation layer: ${panels.join(', ')}`);
    }

    const textWalker = document.createTreeWalker(layer, NodeFilter.SHOW_TEXT);
    const textNodes = [];
    while (textWalker.nextNode()) {
      const node = textWalker.currentNode;
      const text = node.nodeValue.replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const parent = node.parentElement;
      if (!parent) continue;
      const style = window.getComputedStyle(parent);
      const rect = parent.getBoundingClientRect();
      if (
        style.display === 'none'
        || style.visibility === 'hidden'
        || Number(style.opacity) === 0
        || rect.width <= 0
        || rect.height <= 0
      ) {
        continue;
      }
      textNodes.push(text);
    }
    if (textNodes.length) {
      errors.push(`Visible text found in simulation layer: ${textNodes.slice(0, 6).join(' | ')}`);
    }

    const backgroundOffenders = Array.from(layer.querySelectorAll('*'))
      .filter((element) => {
        if (element instanceof HTMLCanvasElement || element instanceof SVGElement) return false;
        const style = window.getComputedStyle(element);
        const color = style.backgroundColor;
        const hasBackgroundColor = color
          && color !== 'transparent'
          && color !== 'rgba(0, 0, 0, 0)'
          && !color.endsWith(', 0)');
        const hasImage = style.backgroundImage && style.backgroundImage !== 'none';
        return hasBackgroundColor || hasImage;
      })
      .map((element) => element.className || element.tagName.toLowerCase());
    if (backgroundOffenders.length) {
      errors.push(`Non-transparent DOM background found in simulation layer: ${backgroundOffenders.join(', ')}`);
    }

    async function waitForSettledChrome() {
      let previous = '';
      let stableStartedAt = performance.now();
      const deadline = performance.now() + 5000;

      while (performance.now() < deadline) {
        const current = JSON.stringify({
          htmlClass: document.documentElement.className,
          htmlStyle: document.documentElement.getAttribute('style') || '',
          bodyClass: document.body.className,
          bodyStyle: document.body.getAttribute('style') || '',
        });

        if (current !== previous) {
          previous = current;
          stableStartedAt = performance.now();
        }

        if (performance.now() - stableStartedAt >= 750) return;
        await new Promise((resolveTimer) => window.setTimeout(resolveTimer, 100));
      }
    }

    await waitForSettledChrome();

    const before = {
      htmlClass: document.documentElement.className,
      htmlStyle: document.documentElement.getAttribute('style') || '',
      bodyClass: document.body.className,
      bodyStyle: document.body.getAttribute('style') || '',
    };
    await new Promise((resolveTimer) => window.setTimeout(resolveTimer, 1200));
    const after = {
      htmlClass: document.documentElement.className,
      htmlStyle: document.documentElement.getAttribute('style') || '',
      bodyClass: document.body.className,
      bodyStyle: document.body.getAttribute('style') || '',
    };
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      errors.push(`html/body class or style changed after Daily Focus settled: ${JSON.stringify({ before, after })}`);
    }

    return { ok: errors.length === 0, errors };
  });
}

async function inspectHomeMode(page, id, launchPath) {
  await page.goto(pageUrl(launchPath), { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('#c', { timeout: 15000 });
  await page.waitForSelector('#hero-title', { timeout: 15000 });
  return page.evaluate((simulationId) => {
    const errors = [];
    const canvas = document.querySelector('#c');
    const simulationMount = document.querySelector('#shell-wall-slot') || document.querySelector('#simulations');
    const rect = canvas?.getBoundingClientRect();
    if (!rect || rect.width <= 10 || rect.height <= 10) {
      errors.push(`${simulationId}: home canvas is not mounted with a visible size.`);
    }
    if (simulationMount?.querySelector('aside, header, footer, nav, h1, h2, p')) {
      errors.push(`${simulationId}: visible UI was mounted inside the home simulation wall.`);
    }
    return { ok: errors.length === 0, errors };
  }, id);
}

async function main() {
  const catalog = await readCatalog();
  const dailyEntries = catalog.simulations.filter((entry) => entry.stage === 'daily-rotation');
  const routeEntries = dailyEntries.filter((entry) => entry.surface === 'lab-route');
  const homeEntries = dailyEntries.filter((entry) => entry.surface === 'home-mode');
  const failures = await runStaticChecks(routeEntries.map((entry) => entry.id));

  if (failures.length && failFast) {
    throw new Error(failures.join('\n'));
  }

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

  try {
    for (const entry of routeEntries) {
      await page.goto(pageUrl(entry.dailyHref), { waitUntil: 'domcontentloaded' });
      await waitForDailyFocusRoute(page, entry.id);
      const result = await inspectDailyLayer(page);
      if (!result.ok) {
        failures.push(`${entry.id}: ${result.errors.join('; ')}`);
        if (failFast) break;
      }
    }

    if (!failures.length) {
      for (const entry of homeEntries) {
        const result = await inspectHomeMode(page, entry.id, entry.launchPath);
        if (!result.ok) {
          failures.push(...result.errors);
          if (failFast) break;
        }
      }
    }
  } finally {
    await browser.close();
  }

  if (failures.length) {
    console.error('Daily Focus boundary audit failed:');
    failures.forEach((failure) => console.error(`- ${failure}`));
    process.exit(1);
  }

  console.log(`Daily Focus boundary audit passed (${routeEntries.length} route runtimes, ${homeEntries.length} home modes).`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
