#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');

const STORAGE_KEY = 'abs_simulation_focus_choice_v1';
const RELOAD_STORAGE_KEY = 'abs_simulation_reload_choice_v1';
const DEFAULT_URL = 'http://127.0.0.1:8013';
const WAIT_MS = Number(process.env.ABS_SIMULATION_FOCUS_WAIT_MS || 30000);
const SIMULATION_URL_STATE_PARAMS = ['daily', 'focus', 'mode', 'simulation'];

function resolveOrigin() {
  const raw = String(process.env.ABS_DEV_URL || DEFAULT_URL).trim() || DEFAULT_URL;
  const url = new URL(raw);
  return url.origin;
}

function resolveUrl(pathname = '/index.html') {
  const url = new URL(pathname, resolveOrigin());
  if (
    (url.pathname === '/' || url.pathname.endsWith('/index.html'))
    && !url.searchParams.has('absAudit')
    && !url.searchParams.has('audit')
  ) {
    url.searchParams.set('audit', 'home-runtime');
  }
  return url.toString();
}

async function waitForIdle(page) {
  await page.waitForFunction(
    () => {
      const blur = document.getElementById('modal-blur-layer');
      const content = document.getElementById('modal-content-layer');
      return (
        (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
        && (document.documentElement.dataset.absSimulationFocusTransition || 'idle') === 'idle'
        && !blur?.classList.contains('active')
        && !content?.classList.contains('active')
      );
    },
    { timeout: WAIT_MS, polling: 50 },
  );
}

async function waitForSwitcherLabel(page, label) {
  await page.waitForFunction(
    (expected) => document.querySelector('.simulation-focus-switcher')?.textContent?.includes(expected),
    label,
    { timeout: WAIT_MS, polling: 50 },
  );
}

async function waitForFocusId(page, id, label = '') {
  const canvasSelector = [
    '#c',
    '#repel-room-canvas',
    '#wall-repel-canvas',
    '#flock-of-birds-canvas',
    '#mineral-growth-canvas',
    '.napoleon-point-cloud__canvas--front',
    '.beach-ball-room-canvas',
    '.concept-simulation-canvas',
  ].join(',');

  try {
    await page.waitForFunction(
      ({ expectedId, expectedLabel, selector }) => {
        const layer = document.querySelector('.daily-simulation-layer');
        const canvas = Array.from(document.querySelectorAll(selector)).find((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return rect.width > 10 && rect.height > 10;
        });
        if (layer?.dataset.simulationId === expectedId && canvas) return true;

        let homeMode = null;
        try {
          homeMode = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.()?.mode || null;
        } catch {
          homeMode = null;
        }
        if (homeMode === expectedId && canvas) return true;

        const routeMode = new URL(window.location.href).searchParams.get('mode') || null;
        const switcherLabel = document.querySelector('.simulation-focus-switcher')?.textContent || '';
        if (
          expectedLabel
          && canvas?.id === 'c'
          && !layer
          && !routeMode
          && switcherLabel.includes(expectedLabel)
        ) {
          return true;
        }

        return routeMode === expectedId && Boolean(canvas);
      },
      { expectedId: id, expectedLabel: label, selector: canvasSelector },
      { timeout: WAIT_MS, polling: 50 },
    );
  } catch (error) {
    const diagnostics = await page.evaluate(({ selector }) => {
      let homeMode = null;
      try {
        homeMode = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.()?.mode || null;
      } catch {
        homeMode = null;
      }
      return {
        url: window.location.href,
        switcher: document.querySelector('.simulation-focus-switcher')?.textContent?.trim() || null,
        layerId: document.querySelector('.daily-simulation-layer')?.dataset.simulationId || null,
        homeMode,
        routeMode: new URL(window.location.href).searchParams.get('mode') || null,
        canvases: Array.from(document.querySelectorAll(selector)).map((candidate) => {
          const rect = candidate.getBoundingClientRect();
          return {
            id: candidate.id,
            className: candidate.className,
            width: candidate.width,
            height: candidate.height,
            rectWidth: rect.width,
            rectHeight: rect.height,
          };
        }),
        storedChoice: window.sessionStorage.getItem('abs_simulation_focus_choice_v1'),
      };
    }, { selector: canvasSelector });
    throw new Error(`Timed out waiting for focus "${id}": ${JSON.stringify(diagnostics)}`, { cause: error });
  }
}

async function openChooser(page) {
  await page.locator('.simulation-focus-switcher').click({ timeout: WAIT_MS });
  await page.waitForSelector('.simulation-focus-modal.active', { timeout: WAIT_MS });
}

async function closeChooserWithEscape(page) {
  await page.keyboard.press('Escape');
  await page.waitForSelector('.simulation-focus-modal.active', { state: 'hidden', timeout: WAIT_MS });
  await waitForIdle(page);
}

async function chooseSimulation(page, name, id, label = name) {
  await openChooser(page);
  await page.locator('.simulation-focus-modal.active .simulation-focus-row').filter({ hasText: name }).first().click();
  await waitForSwitcherLabel(page, label);
  await waitForFocusId(page, id, label);
  await waitForIdle(page);
  await assertChooserSwitchSettled(page, label);
}

async function assertChooserSwitchSettled(page, label) {
  const result = await page.evaluate((blockedParams) => {
    const url = new URL(window.location.href);
    const blur = document.getElementById('modal-blur-layer');
    const content = document.getElementById('modal-content-layer');
    return {
      href: window.location.href,
      pathname: url.pathname,
      blockedParams: blockedParams.filter((param) => url.searchParams.has(param)),
      bootOverlayPresent: Boolean(document.getElementById('abs-boot-overlay')),
      bootState: document.documentElement.dataset.absBootState || '',
      transitionPhase: document.documentElement.dataset.absTransitionPhase || 'idle',
      simulationFocusPhase: document.documentElement.dataset.absSimulationFocusTransition || 'idle',
      modalOverlayActive: Boolean(blur?.classList.contains('active') || content?.classList.contains('active')),
    };
  }, SIMULATION_URL_STATE_PARAMS);

  if (result.bootOverlayPresent || result.bootState === 'booting') {
    throw new Error(`Boot overlay/state reset during chooser switch to "${label}": ${JSON.stringify(result)}`);
  }
  if (result.transitionPhase !== 'idle' || result.simulationFocusPhase !== 'idle' || result.modalOverlayActive) {
    throw new Error(`Chooser switch to "${label}" did not settle idle: ${JSON.stringify(result)}`);
  }
  if (result.pathname.startsWith('/lab/') || result.blockedParams.length > 0) {
    throw new Error(`Chooser switch to "${label}" left a non-canonical simulation URL: ${JSON.stringify(result)}`);
  }
}

async function getStoredChoice(page) {
  return page.evaluate((key) => {
    const raw = window.sessionStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

async function clearStoredChoice(page) {
  await page.evaluate((keys) => keys.forEach((key) => window.sessionStorage.removeItem(key)), [
    STORAGE_KEY,
    RELOAD_STORAGE_KEY,
  ]);
}

async function assertStorage(page, expectedId) {
  const stored = await getStoredChoice(page);
  if (expectedId === null) {
    if (stored !== null) throw new Error(`Expected no stored focus choice, got ${JSON.stringify(stored)}`);
    return;
  }
  if (stored?.simulationId !== expectedId) {
    throw new Error(`Expected stored focus "${expectedId}", got ${JSON.stringify(stored)}`);
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

  await page.goto(resolveUrl(`${labOnlyEntry.launchPath}?daily=1`), { waitUntil: 'networkidle', timeout: 60000 });
  const result = await page.evaluate(() => ({
    hasSwitcher: Boolean(document.querySelector('.simulation-focus-switcher')),
    hasDailyLayer: Boolean(document.querySelector('.daily-simulation-layer')),
    path: window.location.pathname,
  }));
  if (result.hasSwitcher || result.hasDailyLayer) {
    throw new Error(`Lab route "${labOnlyEntry.id}" still participates in public Daily Simulation: ${JSON.stringify(result)}`);
  }
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const dailyEntries = catalog.simulations.filter((entry) => entry.stage === 'daily-rotation');
  const expectedDailyCount = dailyEntries.length;
  const dailyIds = dailyEntries.map((entry) => entry.id);
  if (expectedDailyCount <= 1) throw new Error('Expected at least two Daily Simulation entries in the catalog');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ reloadStorageKey, storageKey }) => {
    if (!window.sessionStorage.getItem('__abs_simulation_focus_audit_storage_cleared__')) {
      window.sessionStorage.removeItem(storageKey);
      window.sessionStorage.removeItem(reloadStorageKey);
      window.sessionStorage.setItem('__abs_simulation_focus_audit_storage_cleared__', '1');
    }
  }, { reloadStorageKey: RELOAD_STORAGE_KEY, storageKey: STORAGE_KEY });

  try {
    await page.goto(resolveUrl('/index.html'), { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(
      (ids) => ids.includes(document.querySelector('.simulation-focus-switcher')?.dataset.simulationId),
      dailyIds,
      { timeout: WAIT_MS, polling: 50 },
    );
    const initialId = await page.locator('.simulation-focus-switcher').getAttribute('data-simulation-id');
    const initialSimulation = dailyEntries.find((entry) => entry.id === initialId);
    if (!initialSimulation) throw new Error(`Initial reload selection is not eligible: ${initialId || 'none'}`);
    await waitForSwitcherLabel(page, initialSimulation.name);
    await waitForFocusId(page, initialSimulation.id, initialSimulation.name);
    await assertStorage(page, null);

    await openChooser(page);
    const rowCount = await page.locator('.simulation-focus-modal.active .simulation-focus-row').count();
    if (rowCount !== expectedDailyCount) throw new Error(`Expected ${expectedDailyCount} chooser rows, got ${rowCount}`);
    for (const entry of dailyEntries) {
      const matches = await page.locator('.simulation-focus-modal.active .simulation-focus-row').filter({ hasText: entry.name }).count();
      if (matches !== 1) throw new Error(`Expected one chooser row for daily simulation "${entry.name}", got ${matches}`);
    }
    const collectionEntry = (catalog.simulations || []).find((entry) => entry.stage === 'collection');
    if (collectionEntry) {
      const collectionRowCount = await page.locator('.simulation-focus-modal.active .simulation-focus-row').filter({ hasText: collectionEntry.name }).count();
      if (collectionRowCount !== 0) throw new Error(`Expected collection simulation "${collectionEntry.name}" to be absent from chooser, got ${collectionRowCount} rows`);
    }
    const focusedInsideModal = await page.evaluate(() => {
      const modal = document.querySelector('.simulation-focus-modal.active');
      return Boolean(modal && document.activeElement && modal.contains(document.activeElement));
    });
    if (!focusedInsideModal) throw new Error('Expected focus to move inside simulation chooser');
    await closeChooserWithEscape(page);
    await page.waitForFunction(
      () => document.activeElement?.classList.contains('simulation-focus-switcher'),
      { timeout: WAIT_MS, polling: 50 },
    );

    await chooseSimulation(page, 'Repel Room', 'repel-room');

    await chooseSimulation(page, 'Light Swarm', 'flies');

    await chooseSimulation(page, 'Water Flow', 'water');

    await page.goto(resolveUrl('/index.html'), { waitUntil: 'networkidle', timeout: 60000 });
    await page.waitForFunction(
      ({ ids, previousId }) => {
        const activeId = document.querySelector('.simulation-focus-switcher')?.dataset.simulationId;
        return ids.includes(activeId) && activeId !== previousId;
      },
      { ids: dailyIds, previousId: 'water' },
      { timeout: WAIT_MS, polling: 50 },
    );
    const reloadId = await page.locator('.simulation-focus-switcher').getAttribute('data-simulation-id');
    const reloadSimulation = dailyEntries.find((entry) => entry.id === reloadId);
    if (!reloadSimulation) throw new Error(`Reload selection is not eligible: ${reloadId || 'none'}`);
    await waitForFocusId(page, reloadSimulation.id, reloadSimulation.name);
    await waitForSwitcherLabel(page, reloadSimulation.name);
    await assertStorage(page, null);

    await assertLabRouteExcluded(page, catalog);
    await clearStoredChoice(page);

    console.log(JSON.stringify({
      ok: true,
      initialSelection: initialSimulation.id,
      selectionAfterManualReload: reloadSimulation.id,
      dailyFocusCount: rowCount,
      flows: [
        'reload-selected-default',
        'modal-focus-escape',
        'home-runtime-to-home-runtime',
        'manual-selection-current-page',
        'manual-selection-cleared-on-reload',
        'different-simulation-on-reload',
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
