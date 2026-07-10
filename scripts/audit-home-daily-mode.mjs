#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');

const TARGET_DATE = process.env.ABS_HOME_DAILY_DATE || '2026-06-27';
const EXPECTED_MODE = process.env.ABS_HOME_DAILY_MODE || 'pit';
const DEFAULT_URL = 'http://127.0.0.1:8012/';

function parseIsoDate(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ''));
  if (!match) return null;

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10) - 1;
  const day = Number.parseInt(match[3], 10);
  const timestamp = Date.UTC(year, month, day);
  const parsed = new Date(timestamp);
  if (parsed.getUTCFullYear() !== year || parsed.getUTCMonth() !== month || parsed.getUTCDate() !== day) {
    return null;
  }

  return { year, month, day, stamp: Math.floor(timestamp / 86400000) };
}

function resolveHomeUrl() {
  const raw = String(process.env.ABS_DEV_URL || DEFAULT_URL).trim() || DEFAULT_URL;
  const url = new URL(raw);
  if (!url.pathname || url.pathname === '/') {
    url.pathname = '/';
  }
  if ((url.pathname === '/' || url.pathname.endsWith('/index.html')) && !url.searchParams.has('audit')) {
    url.searchParams.set('audit', 'home-runtime');
  }
  return url.toString();
}

function getAnchoredDailySimulation(catalog, targetDate) {
  const dailySimulations = (catalog.simulations || []).filter((entry) => entry.stage === 'daily-rotation');
  const date = parseIsoDate(targetDate);
  const anchor = catalog.dailyRotation || {};
  const anchorDate = parseIsoDate(anchor.anchorDate);
  const anchorIndex = dailySimulations.findIndex((entry) => entry.id === anchor.anchorSimulationId);
  if (!dailySimulations.length || !date || !anchorDate || anchorIndex < 0) return null;

  const index = ((anchorIndex + date.stamp - anchorDate.stamp) % dailySimulations.length + dailySimulations.length) % dailySimulations.length;
  return dailySimulations[index] || null;
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const dailySimulation = getAnchoredDailySimulation(catalog, TARGET_DATE);
  if (dailySimulation?.id !== EXPECTED_MODE) {
    throw new Error(`Expected ${TARGET_DATE} daily simulation to be "${EXPECTED_MODE}", got "${dailySimulation?.id || 'none'}"`);
  }
  const browser = await chromium.launch();
  const consoleMessages = [];

  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    page.on('console', (message) => {
      consoleMessages.push(`${message.type()}: ${message.text()}`);
    });

    await page.addInitScript(({ targetDate }) => {
      const NativeDate = Date;
      const fixed = new NativeDate(`${targetDate}T12:00:00`);

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
    }, { targetDate: TARGET_DATE });

    const homeUrl = resolveHomeUrl();
    await page.goto(homeUrl, { waitUntil: 'networkidle', timeout: 60000 });

    if (dailySimulation.surface === 'home-mode') {
      await page.waitForSelector('#c', { timeout: 30000 });
      await page.waitForFunction(
        ({ expectedMode, expectedName }) => {
          const canvas = document.querySelector('#c');
          const rect = canvas?.getBoundingClientRect?.();
          let homeMode = null;
          try {
            homeMode = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.()?.mode || null;
          } catch {
            homeMode = null;
          }
          const switcherLabel = document.querySelector('.simulation-focus-switcher')?.textContent?.trim() || '';
          return Boolean(
            rect
            && rect.width > 10
            && rect.height > 10
            && !document.querySelector('.daily-simulation-layer')
            && (homeMode === expectedMode || switcherLabel.includes(expectedName))
          );
        },
        { expectedMode: EXPECTED_MODE, expectedName: dailySimulation.name },
        { timeout: 30000 },
      );
    } else {
      await page.waitForSelector('.daily-simulation-layer', { timeout: 30000 });
      await page.waitForFunction(
        (expectedMode) => (
          document.querySelector('.daily-simulation-layer')?.dataset.simulationId === expectedMode
          && document.querySelector('.daily-simulation-layer')?.dataset.dailyFocusReady === 'true'
        ),
        EXPECTED_MODE,
        { timeout: 30000 },
      );
    }

    const result = await page.evaluate(() => {
      const simulations = document.querySelector('#simulations');
      const layer = document.querySelector('.daily-simulation-layer');
      let homeMode = null;
      try {
        homeMode = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.()?.mode || null;
      } catch {
        homeMode = null;
      }
      return {
        href: window.location.href,
        pathname: window.location.pathname,
        search: window.location.search,
        simulationClassName: simulations?.className || '',
        activeSimulationId: layer?.dataset.simulationId || homeMode || '',
      };
    });

    if (result.pathname.startsWith('/lab/')) {
      throw new Error(`Homepage redirected to a lab route: ${result.href}`);
    }

    const modeLogFound = consoleMessages.some((line) => line.includes(EXPECTED_MODE));
    console.log(JSON.stringify({
      ok: true,
      date: TARGET_DATE,
      expectedMode: EXPECTED_MODE,
      href: result.href,
      simulationClassName: result.simulationClassName,
      activeSimulationId: result.activeSimulationId,
      modeLogFound,
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.message || error);
  process.exit(1);
});
