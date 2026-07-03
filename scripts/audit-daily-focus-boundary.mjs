#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const repoRoot = resolve(import.meta.dirname, '..');
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');
const homeRoutePath = resolve(repoRoot, 'react-app/app/src/routes/home/HomeRoute.jsx');
const providerPath = resolve(repoRoot, 'react-app/app/src/components/simulation-focus/SimulationFocusProvider.jsx');
const runtimePath = resolve(repoRoot, 'react-app/app/src/routes/daily-focus/DailyFocusCanvasRuntime.jsx');

const baseUrl = process.env.ABS_DEV_URL || 'http://localhost:8013';
const waitMs = Number(process.env.ABS_DAILY_FOCUS_WAIT_MS || 30000);
const viewport = {
  width: Number(process.env.ABS_DAILY_FOCUS_WIDTH || 390),
  height: Number(process.env.ABS_DAILY_FOCUS_HEIGHT || 844),
};
const palette = process.env.ABS_DAILY_FOCUS_PALETTE || '';
const theme = process.env.ABS_DAILY_FOCUS_THEME || '';
const expectedDailyFocusCount = Number(process.env.ABS_DAILY_FOCUS_EXPECTED_COUNT || 15);

function pageUrl(path) {
  return new URL(path, baseUrl).toString();
}

async function readCatalog() {
  return JSON.parse(await readFile(catalogPath, 'utf8'));
}

function focusPath(id) {
  const params = new URLSearchParams({ focus: id });
  if (palette) params.set('palette', palette);
  return `/index.html?${params.toString()}`;
}

async function runStaticChecks(dailyEntries) {
  const failures = [];
  const homeRouteSource = await readFile(homeRoutePath, 'utf8');
  const providerSource = await readFile(providerPath, 'utf8');
  const runtimeSource = await readFile(runtimePath, 'utf8');

  if (!homeRouteSource.includes('DailyFocusRuntimeHost')) {
    failures.push('HomeRoute does not mount DailyFocusRuntimeHost.');
  }
  if (homeRouteSource.includes('<canvas id="c"')) {
    failures.push('HomeRoute still mounts the legacy #c canvas.');
  }
  if (/trySpaNavigate|buildRouteHref|mode-controller/.test(providerSource)) {
    failures.push('SimulationFocusProvider still contains route or legacy mode switching.');
  }
  if (/document\.(?:body|documentElement)\.(?:classList|style)/.test(runtimeSource)) {
    failures.push('Daily Simulation runtime mutates body/html classList or style.');
  }
  for (const entry of dailyEntries) {
    if (!runtimeSource.includes(entry.id)) {
      failures.push(`Daily Simulation runtime is missing a dedicated pattern for "${entry.id}".`);
    }
  }

  return failures;
}

async function waitForFocusRuntime(page, id) {
  await page.waitForSelector('.daily-simulation-layer', { timeout: waitMs });
  await page.waitForFunction((simulationId) => {
    const layer = document.querySelector('.daily-simulation-layer');
    const canvas = document.querySelector('.daily-focus-canvas');
    const rect = canvas?.getBoundingClientRect?.();
    return (
      layer?.dataset.simulationId === simulationId
      && layer?.dataset.dailyFocusReady === 'true'
      && !document.documentElement.classList.contains('abs-direct-boot-staging')
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
    const canvas = document.querySelector('.daily-focus-canvas');
    const wall = document.querySelector('#shell-wall-slot');
    const hero = document.querySelector('#shell-hero-slot');
    if (!layer) errors.push('Missing .daily-simulation-layer.');
    if (!canvas) errors.push('Missing .daily-focus-canvas.');
    if (document.querySelector('#c')) errors.push('Legacy #c canvas is present on Daily Simulation homepage.');
    if (layer?.dataset.simulationId !== simulationId) {
      errors.push(`Expected active simulation "${simulationId}", got "${layer?.dataset.simulationId || 'none'}".`);
    }
    if (getComputedStyle(layer).pointerEvents !== 'none') {
      errors.push('Daily simulation layer intercepts pointer events.');
    }
    if (Number.parseInt(getComputedStyle(wall).zIndex || '0', 10) >= Number.parseInt(getComputedStyle(hero).zIndex || '0', 10)) {
      errors.push('Daily simulation wall is not visually behind the hero/title layer.');
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

    const protectedSelectors = {
      title: '#hero-title',
      links: '#main-links',
      legend: '#expertise-legend',
      description: '.decorative-script',
      footer: '.ui-bottom',
      edgeCaption: '#edge-caption',
      londonTime: '#site-year',
      switcher: '.simulation-focus-switcher',
    };
    const canvasRect = canvas?.getBoundingClientRect();
    const canvasContext = canvas?.getContext?.('2d', { willReadFrequently: true });
    if (canvas && canvasRect?.width > 0 && canvasRect?.height > 0 && canvasContext) {
      const scaleX = canvas.width / canvasRect.width;
      const scaleY = canvas.height / canvasRect.height;
      Object.entries(protectedSelectors).forEach(([name, selector]) => {
        const element = document.querySelector(selector);
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        if (
          rect.width <= 0
          || rect.height <= 0
          || style.display === 'none'
          || style.visibility === 'hidden'
          || Number.parseFloat(style.opacity || '1') <= 0.02
        ) {
          return;
        }
        const left = Math.max(0, Math.floor((rect.left - canvasRect.left) * scaleX));
        const top = Math.max(0, Math.floor((rect.top - canvasRect.top) * scaleY));
        const right = Math.min(canvas.width, Math.ceil((rect.right - canvasRect.left) * scaleX));
        const bottom = Math.min(canvas.height, Math.ceil((rect.bottom - canvasRect.top) * scaleY));
        const width = right - left;
        const height = bottom - top;
        if (width <= 0 || height <= 0) return;
        const pixels = canvasContext.getImageData(left, top, width, height).data;
        let alphaPixels = 0;
        for (let i = 3; i < pixels.length; i += 4) {
          if (pixels[i] > 8) {
            alphaPixels += 1;
            if (alphaPixels > 0) break;
          }
        }
        if (alphaPixels > 0) {
          errors.push(`Simulation canvas draws under protected shell element: ${name}.`);
        }
      });
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
  const failures = await runStaticChecks(dailyEntries);
  if (dailyEntries.length <= 0) {
    failures.push('Expected at least one Daily Simulation entry in the catalog.');
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
    for (const entry of dailyEntries) {
      await page.goto(pageUrl(focusPath(entry.id)), { waitUntil: 'networkidle', timeout: 60000 });
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
    dailyFocusCount: dailyEntries.length,
    viewport,
    palette: palette || 'default',
    theme: theme || 'default',
  }, null, 2));
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
