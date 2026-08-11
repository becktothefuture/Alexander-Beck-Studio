#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  advanceSimulationSwitcher,
  waitForSimulationSwitcherIdle,
} from './lib/simulation-switcher.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');

const STORAGE_KEY = 'abs_simulation_focus_choice_v1';
const RELOAD_STORAGE_KEY = 'abs_simulation_reload_choice_v1';
const DEFAULT_URL = 'http://127.0.0.1:8013';
const WAIT_MS = Number(process.env.ABS_SIMULATION_FOCUS_WAIT_MS || 30_000);
const SIMULATION_URL_STATE_PARAMS = ['daily', 'focus', 'mode', 'simulation'];

function resolveOrigin() {
  const raw = String(process.env.ABS_DEV_URL || DEFAULT_URL).trim() || DEFAULT_URL;
  return new URL(raw).origin;
}

function resolveUrl(pathname = '/index.html') {
  const url = new URL(pathname, resolveOrigin());
  if (url.pathname === '/' || url.pathname.endsWith('/index.html')) {
    url.searchParams.set('audit', 'home-runtime');
  }
  return url.toString();
}

async function getStoredChoice(page) {
  return page.evaluate((key) => {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

async function assertCanonicalSettledState(page, expectedEntry) {
  const state = await page.evaluate(({ blockedParams, expectedId, expectedName }) => {
    const switcher = document.querySelector('.simulation-focus-switcher');
    const url = new URL(window.location.href);
    return {
      id: switcher?.dataset.simulationId || '',
      label: switcher?.getAttribute('aria-label') || '',
      motionPhase: switcher?.dataset.phase || '',
      transactionPhase: document.documentElement.dataset.absSimulationFocusTransition || 'idle',
      disabled: Boolean(switcher?.disabled),
      chooserPresent: Boolean(document.querySelector('.simulation-focus-modal')),
      chooserOpenClass: document.documentElement.classList.contains('simulation-focus-modal-open'),
      overlayChildCount: document.querySelector('#window-overlay-modal-host')?.childElementCount || 0,
      bootOverlayPresent: Boolean(document.getElementById('abs-boot-overlay')),
      bootState: document.documentElement.dataset.absBootState || '',
      blockedParams: blockedParams.filter((param) => url.searchParams.has(param)),
      pathname: url.pathname,
      expectedId,
      expectedName,
    };
  }, {
    blockedParams: SIMULATION_URL_STATE_PARAMS,
    expectedId: expectedEntry.id,
    expectedName: expectedEntry.name,
  });

  if (state.id !== expectedEntry.id) {
    throw new Error(`Expected switcher id "${expectedEntry.id}": ${JSON.stringify(state)}`);
  }
  if (!state.label.includes(expectedEntry.name)) {
    throw new Error(`Expected accessible label to include "${expectedEntry.name}": ${JSON.stringify(state)}`);
  }
  if (
    state.motionPhase !== 'idle'
    || state.transactionPhase !== 'idle'
    || state.disabled
    || state.chooserPresent
    || state.chooserOpenClass
    || state.overlayChildCount !== 0
    || state.bootOverlayPresent
    || state.bootState === 'booting'
  ) {
    throw new Error(`Circular switcher did not settle cleanly: ${JSON.stringify(state)}`);
  }
  if (state.pathname.startsWith('/lab/') || state.blockedParams.length > 0) {
    throw new Error(`Circular switcher left a non-canonical Home URL: ${JSON.stringify(state)}`);
  }
}

async function assertLabRouteExcluded(page, catalog) {
  const labOnlyEntry = (catalog.simulations || []).find((entry) => (
    entry.stage !== 'daily-rotation'
    && entry.surface === 'lab-route'
    && typeof entry.launchPath === 'string'
    && entry.launchPath.startsWith('/lab/')
  ));
  if (!labOnlyEntry) return;

  await page.goto(resolveUrl(`${labOnlyEntry.launchPath}?daily=1`), {
    waitUntil: 'networkidle',
    timeout: 60_000,
  });
  const result = await page.evaluate(() => ({
    hasSwitcher: Boolean(document.querySelector('.simulation-focus-switcher')),
    hasDailyLayer: Boolean(document.querySelector('.daily-simulation-layer')),
    path: window.location.pathname,
  }));
  if (result.hasSwitcher || result.hasDailyLayer) {
    throw new Error(`Lab route "${labOnlyEntry.id}" participates in Daily Simulation: ${JSON.stringify(result)}`);
  }
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const dailyEntries = catalog.simulations.filter((entry) => entry.stage === 'daily-rotation');
  const dailyIds = dailyEntries.map((entry) => entry.id);
  if (dailyEntries.length <= 1) throw new Error('Expected at least two Daily simulations');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ reloadStorageKey, storageKey }) => {
    if (window.sessionStorage.getItem('__abs_simulation_switcher_audit_cleared__')) return;
    window.sessionStorage.removeItem(storageKey);
    window.sessionStorage.removeItem(reloadStorageKey);
    window.sessionStorage.setItem('__abs_simulation_switcher_audit_cleared__', '1');
  }, { reloadStorageKey: RELOAD_STORAGE_KEY, storageKey: STORAGE_KEY });

  try {
    await page.goto(resolveUrl('/index.html'), { waitUntil: 'networkidle', timeout: 60_000 });
    await waitForSimulationSwitcherIdle(page, WAIT_MS);

    const switcher = page.locator('.simulation-focus-switcher');
    const initialId = await switcher.getAttribute('data-simulation-id');
    const initialEntry = dailyEntries.find((entry) => entry.id === initialId);
    if (!initialEntry) throw new Error(`Initial simulation is not Daily: ${initialId || 'none'}`);
    await assertCanonicalSettledState(page, initialEntry);
    if (await getStoredChoice(page)) throw new Error('Random reload selection must not be a manual choice');

    const semantics = await switcher.evaluate((button) => ({
      hasPopup: button.hasAttribute('aria-haspopup'),
      expanded: button.hasAttribute('aria-expanded'),
      controls: button.hasAttribute('aria-controls'),
    }));
    if (semantics.hasPopup || semantics.expanded || semantics.controls) {
      throw new Error(`Switcher still exposes dialog semantics: ${JSON.stringify(semantics)}`);
    }

    const visitedIds = [initialEntry.id];
    for (let index = 0; index < dailyEntries.length; index += 1) {
      const nextEntry = await advanceSimulationSwitcher(page, dailyEntries, WAIT_MS);
      visitedIds.push(nextEntry.id);
      await assertCanonicalSettledState(page, nextEntry);
    }

    if (visitedIds.at(-1) !== initialEntry.id) {
      throw new Error(`Circular order did not wrap to "${initialEntry.id}": ${visitedIds.join(' -> ')}`);
    }
    if (new Set(visitedIds.slice(0, -1)).size !== dailyEntries.length) {
      throw new Error(`Circular order did not visit each Daily simulation once: ${visitedIds.join(' -> ')}`);
    }

    const storedChoice = await getStoredChoice(page);
    if (storedChoice?.simulationId !== initialEntry.id) {
      throw new Error(`Wrapped selection was not stored for the current page: ${JSON.stringify(storedChoice)}`);
    }

    await page.reload({ waitUntil: 'networkidle', timeout: 60_000 });
    await waitForSimulationSwitcherIdle(page, WAIT_MS);
    const reloadId = await switcher.getAttribute('data-simulation-id');
    if (!dailyIds.includes(reloadId) || reloadId === initialEntry.id) {
      throw new Error(`Reload did not choose a different Daily simulation: ${reloadId || 'none'}`);
    }
    if (await getStoredChoice(page)) throw new Error('Manual selection survived a full reload');

    await assertLabRouteExcluded(page, catalog);

    console.log(JSON.stringify({
      ok: true,
      dailySimulationCount: dailyEntries.length,
      initialSelection: initialEntry.id,
      reloadSelection: reloadId,
      circularOrder: visitedIds,
      checks: [
        'next-only-semantics',
        'catalog-order',
        'circular-wrap',
        'no-chooser-overlay',
        'canonical-home-url',
        'manual-selection-current-page-only',
        'different-random-selection-on-reload',
        'lab-route-excluded',
        'reduced-motion',
      ],
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
