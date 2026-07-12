#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(__dirname, '..');
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');
const DEFAULT_URL = 'http://127.0.0.1:8012/';
const RELOAD_STORAGE_KEY = 'abs_simulation_reload_choice_v1';

function resolveHomeUrl() {
  const raw = String(process.env.ABS_DEV_URL || DEFAULT_URL).trim() || DEFAULT_URL;
  const url = new URL(raw);
  if (!url.pathname || url.pathname === '/') url.pathname = '/';
  if ((url.pathname === '/' || url.pathname.endsWith('/index.html')) && !url.searchParams.has('audit')) {
    url.searchParams.set('audit', 'home-runtime');
  }
  return url.toString();
}

async function waitForActiveSimulation(page, eligibleIds, previousId = null) {
  await page.waitForFunction(
    ({ ids, previous }) => {
      const switcher = document.querySelector('.simulation-focus-switcher[data-simulation-id]');
      const simulationId = switcher?.dataset.simulationId || '';
      return ids.includes(simulationId) && simulationId !== previous;
    },
    { ids: eligibleIds, previous: previousId },
    { timeout: 30000 },
  );

  return page.evaluate((storageKey) => {
    const url = new URL(window.location.href);
    const storedRaw = window.sessionStorage.getItem(storageKey);
    return {
      activeId: document.querySelector('.simulation-focus-switcher')?.dataset.simulationId || '',
      blockedParams: ['daily', 'focus', 'mode', 'simulation'].filter((key) => url.searchParams.has(key)),
      pathname: url.pathname,
      storedId: storedRaw ? JSON.parse(storedRaw)?.simulationId || '' : '',
    };
  }, RELOAD_STORAGE_KEY);
}

function assertCleanHomeState(result, label) {
  if (result.pathname.startsWith('/lab/') || result.blockedParams.length > 0) {
    throw new Error(`${label} did not settle on a clean Home URL: ${JSON.stringify(result)}`);
  }
  if (result.storedId !== result.activeId) {
    throw new Error(`${label} did not store its active reload selection: ${JSON.stringify(result)}`);
  }
}

async function main() {
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const eligibleIds = (catalog.simulations || [])
    .filter((entry) => entry.stage === 'daily-rotation')
    .map((entry) => entry.id);
  if (eligibleIds.length < 2) {
    throw new Error('Reload selection requires at least two Daily Simulation entries.');
  }

  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
    await page.goto(resolveHomeUrl(), { waitUntil: 'networkidle', timeout: 60000 });
    const first = await waitForActiveSimulation(page, eligibleIds);
    assertCleanHomeState(first, 'Initial load');

    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    const second = await waitForActiveSimulation(page, eligibleIds, first.activeId);
    assertCleanHomeState(second, 'First reload');

    await page.reload({ waitUntil: 'networkidle', timeout: 60000 });
    const third = await waitForActiveSimulation(page, eligibleIds, second.activeId);
    assertCleanHomeState(third, 'Second reload');

    console.log(JSON.stringify({
      ok: true,
      behavior: 'changes-on-every-reload',
      selections: [first.activeId, second.activeId, third.activeId],
    }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
