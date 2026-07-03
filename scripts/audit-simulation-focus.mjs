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
  return `${url.origin}`;
}

function resolveUrl(pathname = '/index.html') {
  return new URL(pathname, resolveOrigin()).toString();
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
        && !blur?.classList.contains('active')
        && !content?.classList.contains('active')
      );
    },
    { timeout: WAIT_MS, polling: 50 },
  );
}

async function waitForSwitcherLabel(page, label) {
  await page.waitForFunction(
    (expected) => {
      const button = document.querySelector('.simulation-focus-switcher');
      return Boolean(button && button.textContent?.includes(expected));
    },
    label,
    { timeout: WAIT_MS, polling: 50 },
  );
}

async function waitForHomeMode(page, mode) {
  await page.waitForFunction(
    (expectedMode) => window.__ABS_SIMULATION_FOCUS_MODE_EVENTS__?.includes(expectedMode),
    mode,
    { timeout: WAIT_MS, polling: 50 },
  );
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

async function chooseSimulation(page, name) {
  await openChooser(page);
  await page.locator('.simulation-focus-modal.active .simulation-focus-row').filter({ hasText: name }).first().click();
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

async function assertDirectDailyLabRouteReady(page) {
  await page.goto(resolveUrl('/lab/napoleon-point-cloud.html?daily=1'), { waitUntil: 'networkidle', timeout: 60000 });
  await waitForSwitcherLabel(page, 'Napoleon Point Cloud');
  await page.waitForFunction(
    () => {
      const root = document.documentElement;
      const slot = document.querySelector('.simulation-focus-switcher-slot');
      const figure = document.querySelector('.napoleon-point-cloud');
      if (!slot || !figure) return false;
      const styles = getComputedStyle(slot);
      const loadState = figure.dataset.pointCloudLoadState;
      return (
        !root.classList.contains('fonts-loading')
        && root.classList.contains('ui-entered')
        && root.classList.contains('entrance-complete')
        && Number.parseFloat(styles.opacity || '0') > 0.8
        && (loadState === 'ready' || loadState === 'error')
      );
    },
    { timeout: WAIT_MS, polling: 50 },
  );
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

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const dailyEntries = catalog.simulations.filter((entry) => entry.stage === 'daily-rotation');
  const dailyDefault = getAnchoredDailySimulation(catalog, TARGET_DATE);
  const targetDate = parseIsoDate(TARGET_DATE);
  if (!dailyDefault) throw new Error('Could not resolve daily default from catalog');
  if (dailyEntries.length !== 15) throw new Error(`Expected 15 Daily Focus entries, got ${dailyEntries.length}`);

  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(({ targetDateIso, storageKey }) => {
    if (!window.sessionStorage.getItem('__abs_simulation_focus_audit_storage_cleared__')) {
      window.localStorage.removeItem(storageKey);
      window.sessionStorage.setItem('__abs_simulation_focus_audit_storage_cleared__', '1');
    }
    window.__ABS_SIMULATION_FOCUS_MODE_EVENTS__ = [];
    window.addEventListener('bb:modeChanged', (event) => {
      window.__ABS_SIMULATION_FOCUS_MODE_EVENTS__.push(event?.detail?.mode || null);
    });
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
    await assertStorage(page, null);

    await openChooser(page);
    const rowCount = await page.locator('.simulation-focus-modal.active .simulation-focus-row').count();
    if (rowCount !== 15) throw new Error(`Expected 15 chooser rows, got ${rowCount}`);
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

    await chooseSimulation(page, 'Repel Room');
    await page.waitForURL(/\/lab\/wall-repel\.html/, { timeout: WAIT_MS });
    await waitForSwitcherLabel(page, 'Repel Room');
    await assertStorage(page, 'wall-repel');

    await chooseSimulation(page, 'Pressure Mosaic');
    await page.waitForURL(/\/lab\/pressure-mosaic\.html/, { timeout: WAIT_MS });
    await waitForSwitcherLabel(page, 'Pressure Mosaic');
    await assertStorage(page, 'pressure-mosaic');

    await chooseSimulation(page, 'Flies to Light');
    await page.waitForURL(/\/index\.html/, { timeout: WAIT_MS });
    await waitForHomeMode(page, 'flies');
    await waitForSwitcherLabel(page, 'Flies to Light');
    await assertStorage(page, 'flies');

    await chooseSimulation(page, 'Water Swimming');
    await waitForHomeMode(page, 'water');
    await waitForSwitcherLabel(page, 'Water Swimming');
    await assertStorage(page, 'water');
    const sameHomeModeParam = await page.evaluate(() => new URL(window.location.href).searchParams.get('mode'));
    if (sameHomeModeParam !== 'water') {
      throw new Error(`Expected same-home switch URL mode=water, got ${sameHomeModeParam || '(none)'}`);
    }
    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    await waitForHomeMode(page, 'water');
    await waitForSwitcherLabel(page, 'Water Swimming');
    await assertStorage(page, 'water');

    await setStoredChoice(page, {
      version: 1,
      dayStamp: targetDate.dayStamp - 1,
      simulationId: 'water',
      catalogVersion: catalog.version,
    });
    await page.goto(resolveUrl('/index.html'), { waitUntil: 'networkidle', timeout: 60000 });
    await waitForSwitcherLabel(page, dailyDefault.name);
    await assertStorage(page, null);

    await setStoredChoice(page, {
      version: 1,
      dayStamp: targetDate.dayStamp,
      simulationId: 'not-a-real-simulation',
      catalogVersion: catalog.version,
    });
    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    await waitForSwitcherLabel(page, dailyDefault.name);
    await assertStorage(page, null);

    await assertDirectDailyLabRouteReady(page);

    await clearStoredChoice(page);
    console.log(JSON.stringify({
      ok: true,
      date: targetDate.iso,
      dailyDefault: dailyDefault.id,
      dailyFocusCount: rowCount,
      flows: [
        'daily-default',
        'modal-focus-escape',
        'home-mode-to-lab-route',
        'lab-route-to-lab-route',
        'lab-route-to-home-mode',
        'home-mode-to-home-mode',
        'stale-next-day-cleanup',
        'invalid-id-cleanup',
        'direct-daily-lab-route',
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
