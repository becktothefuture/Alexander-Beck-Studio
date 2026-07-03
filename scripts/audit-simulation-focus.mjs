#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');

const STORAGE_KEY = 'abs_simulation_focus_choice_v1';
const TARGET_DATE = process.env.ABS_SIMULATION_FOCUS_DATE || '2026-06-27';
const DEFAULT_URL = 'http://127.0.0.1:8013';
const WAIT_MS = Number(process.env.ABS_SIMULATION_FOCUS_WAIT_MS || 30000);

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

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) throw new Error(`Invalid ABS_SIMULATION_FOCUS_DATE: ${value}`);
  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  const day = Number.parseInt(match[3], 10);
  const timestamp = Date.UTC(year, month, day);
  return {
    iso: `${match[1]}-${match[2]}-${match[3]}`,
    timestamp,
    dayStamp: Math.floor(timestamp / 86400000),
  };
}

function getAnchoredDailySimulation(catalog, targetDate) {
  const dailySimulations = (catalog.simulations || []).filter((entry) => entry.stage === 'daily-rotation');
  const anchor = catalog.dailyRotation || {};
  const anchorDate = parseIsoDate(anchor.anchorDate);
  const date = parseIsoDate(targetDate);
  const anchorIndex = dailySimulations.findIndex((entry) => entry.id === anchor.anchorSimulationId);
  if (!dailySimulations.length || anchorIndex < 0) return null;

  const index = ((anchorIndex + date.dayStamp - anchorDate.dayStamp) % dailySimulations.length + dailySimulations.length) % dailySimulations.length;
  return dailySimulations[index] || null;
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

async function waitForFocusId(page, id) {
  const canvasSelector = [
    '#c',
    '#wall-repel-canvas',
    '#flock-of-birds-canvas',
    '#pressure-mosaic-canvas',
    '#mineral-growth-canvas',
    '.napoleon-point-cloud__canvas--front',
    '.beach-ball-room-canvas',
    '.concept-simulation-canvas',
  ].join(',');

  try {
    await page.waitForFunction(
      ({ expectedId, selector }) => {
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
        return routeMode === expectedId && Boolean(canvas);
      },
      { expectedId: id, selector: canvasSelector },
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
        storedChoice: window.localStorage.getItem('abs_simulation_focus_choice_v1'),
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
  await waitForFocusId(page, id);
  await waitForIdle(page);
}

async function getStoredChoice(page) {
  return page.evaluate((key) => {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  }, STORAGE_KEY);
}

async function setStoredChoice(page, choice) {
  await page.evaluate(({ key, value }) => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, { key: STORAGE_KEY, value: choice });
}

async function clearStoredChoice(page) {
  await page.evaluate((key) => window.localStorage.removeItem(key), STORAGE_KEY);
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
  const dailyDefault = getAnchoredDailySimulation(catalog, TARGET_DATE);
  const targetDate = parseIsoDate(TARGET_DATE);
  if (!dailyDefault) throw new Error('Could not resolve daily default from catalog');
  if (expectedDailyCount <= 0) throw new Error('Expected at least one Daily Simulation entry in the catalog');

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ targetDateIso, storageKey }) => {
    if (!window.sessionStorage.getItem('__abs_simulation_focus_audit_storage_cleared__')) {
      window.localStorage.removeItem(storageKey);
      window.sessionStorage.setItem('__abs_simulation_focus_audit_storage_cleared__', '1');
    }
    const NativeDate = Date;
    const fixed = new NativeDate(`${targetDateIso}T12:00:00`);

    class MockDate extends NativeDate {
      constructor(...args) {
        if (args.length === 0) {
          super(fixed.getTime());
          return;
        }
        super(...args);
      }

      static now() {
        return fixed.getTime();
      }

      static parse(value) {
        return NativeDate.parse(value);
      }

      static UTC(...args) {
        return NativeDate.UTC(...args);
      }
    }

    Object.setPrototypeOf(MockDate, NativeDate);
    window.Date = MockDate;
  }, { targetDateIso: targetDate.iso, storageKey: STORAGE_KEY });

  try {
    await page.goto(resolveUrl('/index.html'), { waitUntil: 'networkidle', timeout: 60000 });
    await waitForSwitcherLabel(page, dailyDefault.name);
    await waitForFocusId(page, dailyDefault.id);
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

    await chooseSimulation(page, 'Repel Room', 'wall-repel');
    await assertStorage(page, 'wall-repel');

    await chooseSimulation(page, 'Pressure Mosaic', 'pressure-mosaic');
    await assertStorage(page, 'pressure-mosaic');

    await chooseSimulation(page, 'Flies to Light', 'flies');
    await assertStorage(page, 'flies');

    await chooseSimulation(page, 'Water Swimming', 'water');
    await assertStorage(page, 'water');

    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    await waitForFocusId(page, 'water');
    await waitForSwitcherLabel(page, 'Water Swimming');
    await assertStorage(page, 'water');

    await setStoredChoice(page, {
      version: 1,
      dayStamp: targetDate.dayStamp - 1,
      simulationId: 'water',
      catalogVersion: catalog.version,
    });
    await page.goto(resolveUrl('/index.html'), { waitUntil: 'networkidle', timeout: 60000 });
    await waitForFocusId(page, dailyDefault.id);
    await waitForSwitcherLabel(page, dailyDefault.name);
    await assertStorage(page, null);

    await setStoredChoice(page, {
      version: 1,
      dayStamp: targetDate.dayStamp,
      simulationId: 'not-a-real-simulation',
      catalogVersion: catalog.version,
    });
    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    await waitForFocusId(page, dailyDefault.id);
    await waitForSwitcherLabel(page, dailyDefault.name);
    await assertStorage(page, null);

    await assertLabRouteExcluded(page, catalog);
    await clearStoredChoice(page);

    console.log(JSON.stringify({
      ok: true,
      date: targetDate.iso,
      dailyDefault: dailyDefault.id,
      dailyFocusCount: rowCount,
      flows: [
        'daily-default',
        'modal-focus-escape',
        'home-runtime-to-home-runtime',
        'same-day-persistence',
        'stale-next-day-cleanup',
        'invalid-id-cleanup',
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
