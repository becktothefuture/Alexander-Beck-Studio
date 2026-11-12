import { appendFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import {
  RELEASE_SMOKE_ROUTES,
  routeUrl,
  startProductionPreview,
  waitForRouteReady,
} from './lib/release-smoke-helpers.mjs';

const repoRoot = fileURLToPath(new URL('../', import.meta.url));
const host = '127.0.0.1';
const port = Number(process.env.ABS_PAGE_WEIGHT_PORT ?? 8015);
const timeoutMs = 30_000;
const viewport = { width: 390, height: 844 };
const pages = [
  { id: 'home', label: 'Home', budgetKiB: 1450 },
  { id: 'portfolio', label: 'Work', budgetKiB: 1400 },
];

function toKiB(bytes) {
  return Math.ceil(bytes / 1024);
}

async function measureFirstVisit(browser, baseUrl, id) {
  const route = RELEASE_SMOKE_ROUTES.find((entry) => entry.id === id);
  const context = await browser.newContext({ viewport, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  try {
    const page = await context.newPage();
    const requests = [];
    page.on('requestfinished', (request) => {
      if (/^https?:\/\//.test(request.url())) requests.push(request);
    });
    const response = await page.goto(routeUrl(baseUrl, route.requestPath || route.path), {
      waitUntil: 'load',
      timeout: timeoutMs,
    });
    if (!response?.ok()) throw new Error(`${id} returned HTTP ${response?.status() ?? 'unknown'}`);
    await waitForRouteReady(page, route, timeoutMs);
    await page.waitForFunction(() => document.fonts.status === 'loaded', null, { timeout: timeoutMs });

    const resources = await Promise.all(requests.map(async (request) => ({
      type: request.resourceType(),
      bytes: (await request.sizes()).responseBodySize,
    })));
    const byType = new Map();
    for (const { type, bytes } of resources) {
      byType.set(type, (byType.get(type) ?? 0) + bytes);
    }
    return {
      totalKiB: toKiB(resources.reduce((total, { bytes }) => total + bytes, 0)),
      byType: [...byType].sort(([a], [b]) => a.localeCompare(b)),
    };
  } finally {
    await context.close();
  }
}

const preview = await startProductionPreview({ repoRoot, host, port });
try {
  const browser = await chromium.launch();
  try {
    const summary = [
      '### Page weight on first visit',
      '',
      'Cold Chromium sessions at a 390 × 844 viewport. Counts HTTP response bodies completed by page load, route readiness, and font readiness.',
      '',
      '| Page | Measured | Budget | Result |',
      '| --- | ---: | ---: | --- |',
    ];
    for (const { id, label, budgetKiB } of pages) {
      const { totalKiB, byType } = await measureFirstVisit(browser, preview.baseUrl, id);
      const overBudget = totalKiB > budgetKiB;
      const measurement = `${label} downloaded ${totalKiB} KiB (budget ${budgetKiB} KiB)`;
      const breakdown = byType.map(([type, bytes]) => `${type} ${toKiB(bytes)} KiB`).join(', ');
      console.log(`[page-weight] ${measurement}. ${breakdown}`);
      if (overBudget) {
        const prefix = process.env.GITHUB_ACTIONS === 'true' ? '::warning title=Page weight budget::' : 'Warning: ';
        console.warn(`${prefix}${measurement}.`);
      }
      summary.push(`| ${label} | ${totalKiB} KiB | ${budgetKiB} KiB | ${overBudget ? 'Over budget' : 'Within budget'} |`);
    }
    if (process.env.GITHUB_STEP_SUMMARY) {
      await appendFile(process.env.GITHUB_STEP_SUMMARY, `${summary.join('\n')}\n`);
    }
  } finally {
    await browser.close();
  }
} finally {
  await preview.stop();
}
