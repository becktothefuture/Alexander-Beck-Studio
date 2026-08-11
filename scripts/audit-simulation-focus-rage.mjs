#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import {
  getNextDailySimulation,
  waitForSimulationSwitcherIdle,
} from './lib/simulation-switcher.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');
const outputRoot = resolve(repoRoot, 'output/playwright/simulation-focus-rage');
const baseUrl = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').replace(/\/+$/, '');
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const waitMs = Number(process.env.ABS_SIMULATION_FOCUS_RAGE_WAIT_MS || 30000);
const rounds = Number(process.env.ABS_SIMULATION_FOCUS_RAGE_ROUNDS || 40);
const burstSize = Number(process.env.ABS_SIMULATION_FOCUS_RAGE_BURST || 12);
const headed = process.env.ABS_SIMULATION_FOCUS_RAGE_HEADED === '1';

function pageUrl(simulationId) {
  const url = new URL('/index.html', `${baseUrl}/`);
  url.searchParams.set('mode', simulationId);
  url.searchParams.set('absAudit', '1');
  return url.toString();
}

async function readState(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const switcher = document.querySelector('.simulation-focus-switcher');
    return {
      id: switcher?.dataset.simulationId || '',
      disabled: Boolean(switcher?.disabled),
      labelPhase: switcher?.dataset.phase || '',
      transactionPhase: root.dataset.absSimulationFocusTransition || 'idle',
      routePhase: root.dataset.absTransitionPhase || 'idle',
      bootOverlay: Boolean(document.getElementById('abs-boot-overlay')),
      chooserPresent: Boolean(document.querySelector('.simulation-focus-modal, .simulation-focus-row')),
      overlayChildren: document.querySelector('#window-overlay-modal-host')?.childElementCount || 0,
      titlePlaneCount: document.querySelectorAll('#simulation-title-canvas').length,
    };
  });
}

async function main() {
  if (!['chromium', 'webkit'].includes(browserName)) {
    throw new Error(`Unsupported ABS_BROWSER ${browserName}`);
  }
  await mkdir(outputRoot, { recursive: true });
  const catalog = JSON.parse(await readFile(catalogPath, 'utf8'));
  const dailySimulations = catalog.simulations.filter((entry) => entry.stage === 'daily-rotation');
  if (!dailySimulations.length) throw new Error('No Daily Simulations found');

  const browser = await browserType.launch({ headless: !headed });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));
  const results = [];

  try {
    await page.goto(pageUrl(dailySimulations[0].id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForSimulationSwitcherIdle(page, waitMs);
    for (let round = 0; round < rounds; round += 1) {
      const before = await readState(page);
      const expected = getNextDailySimulation(dailySimulations, before.id);
      const burst = await page.evaluate((count) => {
        const switcher = document.querySelector('.simulation-focus-switcher');
        if (!switcher) return 0;
        for (let index = 0; index < count; index += 1) switcher.click();
        return count;
      }, burstSize);
      await page.waitForFunction(
        (expectedId) => document.querySelector('.simulation-focus-switcher')?.dataset.simulationId === expectedId,
        expected.id,
        { timeout: waitMs, polling: 20 },
      );
      const active = await readState(page);
      await waitForSimulationSwitcherIdle(page, waitMs);
      const settled = await readState(page);
      const issues = [];
      if (burst !== burstSize) issues.push(`burst-short:${burst}`);
      if (active.transactionPhase !== 'idle' && !active.disabled) issues.push('busy-switcher-not-disabled');
      if (settled.id !== expected.id) issues.push(`wrong-final-id:${settled.id}`);
      if (settled.disabled || settled.transactionPhase !== 'idle') issues.push('transaction-not-settled');
      if (settled.chooserPresent || settled.overlayChildren) issues.push('removed-overlay-returned');
      if (settled.bootOverlay) issues.push('boot-overlay-returned');
      if (settled.titlePlaneCount !== 1) issues.push(`title-plane-count:${settled.titlePlaneCount}`);
      results.push({ round, from: before.id, to: expected.id, issues });
      if (issues.length) break;
    }
  } finally {
    await context.close();
    await browser.close();
  }

  const report = {
    ok: results.length === rounds
      && results.every((entry) => entry.issues.length === 0)
      && consoleErrors.length === 0
      && pageErrors.length === 0,
    browser: browserName,
    rounds,
    burstSize,
    consoleErrors,
    pageErrors,
    results,
  };
  await writeFile(resolve(outputRoot, `${browserName}-report.json`), `${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) throw new Error(`Simulation switch rage audit failed: ${resolve(outputRoot, `${browserName}-report.json`)}`);
  process.stdout.write(`Simulation switch rage audit passed (${rounds} bursts × ${burstSize} presses, ${browserName}).\n`);
}

await main();
