#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { PNG } from 'pngjs';
import {
  getNextDailySimulation,
  waitForSimulationSwitcherIdle,
} from './lib/simulation-switcher.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const catalogPath = resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json');
const browserName = String(process.env.ABS_BROWSER || 'chromium').trim().toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const baseUrl = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8013').replace(/\/+$/, '');
const waitMs = Number(process.env.ABS_SIMULATION_FOCUS_STRESS_WAIT_MS || 40000);
const sampleCount = Number(process.env.ABS_SIMULATION_FOCUS_STRESS_FRAMES || 38);
const sampleIntervalMs = Number(process.env.ABS_SIMULATION_FOCUS_STRESS_INTERVAL_MS || 35);
const headed = process.env.ABS_SIMULATION_FOCUS_STRESS_HEADED === '1';
const outputRoot = resolve(repoRoot, 'output/playwright/simulation-focus-transition-stress', browserName);

function pageUrl(simulationId) {
  const url = new URL('/index.html', `${baseUrl}/`);
  url.searchParams.set('mode', simulationId);
  url.searchParams.set('absAudit', '1');
  return url.toString();
}

function imageStats(buffer) {
  const png = PNG.sync.read(buffer);
  let total = 0;
  let totalSquared = 0;
  let count = 0;
  for (let index = 0; index < png.data.length; index += 16) {
    const value = (png.data[index] + png.data[index + 1] + png.data[index + 2]) / 3;
    total += value;
    totalSquared += value * value;
    count += 1;
  }
  const mean = count ? total / count : 0;
  return {
    mean,
    stdev: Math.sqrt(Math.max(0, (totalSquared / Math.max(1, count)) - (mean * mean))),
  };
}

async function readState(page, screenshot = false) {
  const state = await page.evaluate(() => {
    const root = document.documentElement;
    const switcher = document.querySelector('.simulation-focus-switcher');
    const title = document.getElementById('simulation-title-canvas');
    return {
      at: performance.now(),
      activeId: switcher?.dataset.simulationId || '',
      labelPhase: switcher?.dataset.phase || '',
      transactionPhase: root.dataset.absSimulationFocusTransition || 'idle',
      routePhase: root.dataset.absTransitionPhase || 'idle',
      disabled: Boolean(switcher?.disabled),
      chooserPresent: Boolean(document.querySelector('.simulation-focus-modal, .simulation-focus-row')),
      bootOverlayPresent: Boolean(document.getElementById('abs-boot-overlay')),
      titlePresent: Boolean(title?.isConnected),
      titleReady: title?.dataset.titlePlaneReady === 'true',
      horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - innerWidth),
    };
  });
  if (!screenshot) return state;
  return { ...state, image: imageStats(await page.screenshot({ type: 'png' })) };
}

async function exerciseAdjacentSwitch(page, dailySimulations, from) {
  const expected = getNextDailySimulation(dailySimulations, from.id);
  await waitForSimulationSwitcherIdle(page, waitMs);
  const samples = [];
  const sampler = (async () => {
    for (let index = 0; index < sampleCount; index += 1) {
      samples.push(await readState(page, index % 4 === 0));
      await page.waitForTimeout(sampleIntervalMs);
    }
  })();
  await page.locator('.simulation-focus-switcher').click({ timeout: waitMs });
  await page.waitForFunction(
    (expectedId) => document.querySelector('.simulation-focus-switcher')?.dataset.simulationId === expectedId,
    expected.id,
    { timeout: waitMs, polling: 25 },
  );
  await waitForSimulationSwitcherIdle(page, waitMs);
  await sampler;
  const final = await readState(page, true);
  const allSamples = [...samples, final];
  const issues = [];
  const phases = new Set(allSamples.map((sample) => sample.transactionPhase));
  if (!phases.has('out') || !phases.has('in')) issues.push(`missing-transaction-wave:${[...phases].join('>')}`);
  if (allSamples.some((sample) => sample.chooserPresent)) issues.push('removed-chooser-returned');
  if (allSamples.some((sample) => sample.bootOverlayPresent)) issues.push('boot-overlay-during-switch');
  if (allSamples.some((sample) => !sample.titlePresent)) issues.push('stable-title-plane-missing');
  if (allSamples.some((sample) => sample.horizontalOverflow > 2)) issues.push('horizontal-overflow');
  if (allSamples.some((sample) => sample.image && (sample.image.stdev < 2 || sample.image.mean < 2))) {
    issues.push('blank-or-flat-frame');
  }
  if (final.activeId !== expected.id) issues.push(`wrong-final-simulation:${final.activeId}`);
  if (final.transactionPhase !== 'idle' || final.disabled) issues.push('switcher-did-not-settle');
  return {
    id: `${from.id}-to-${expected.id}`,
    from: from.name,
    to: expected.name,
    phases: [...phases],
    issues,
    samples: allSamples,
  };
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
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  const reports = [];
  try {
    await page.goto(pageUrl(dailySimulations[0].id), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForSimulationSwitcherIdle(page, waitMs);
    for (const from of dailySimulations) {
      reports.push(await exerciseAdjacentSwitch(page, dailySimulations, from));
    }
  } finally {
    await browser.close();
  }

  const report = {
    ok: reports.every((entry) => entry.issues.length === 0) && consoleErrors.length === 0,
    browser: browserName,
    circularOrder: dailySimulations.map((entry) => entry.id),
    consoleErrors,
    flows: reports,
  };
  await writeFile(resolve(outputRoot, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  if (!report.ok) throw new Error(`Simulation switch stress failed: ${resolve(outputRoot, 'report.json')}`);
  process.stdout.write(`Simulation switch stress passed (${reports.length} circular handoffs, ${browserName}).\n`);
}

await main();
