#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import process from 'node:process';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseUrl = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').replace(/\/$/, '');
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const shouldStartDevServer = !process.env.ABS_DEV_URL;
const waitMs = Number(process.env.ABS_TITLE_WAIT_MS || 30000);
const viewport = { width: 390, height: 844 };
const tolerance = { font: 0.55, rect: 1.25, center: 0.75 };

function pageUrl(pathname) {
  return new URL(pathname, `${baseUrl}/`).toString();
}

function assert(condition, message, details = null) {
  if (condition) return;
  throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
}

async function waitForHttpReady(timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(pageUrl('/'));
      if (response.ok) return;
    } catch {
      // Keep polling until Vite is ready.
    }
    await delay(200);
  }
  throw new Error(`Title audit server unavailable at ${baseUrl}`);
}

async function ensureServer() {
  try {
    await waitForHttpReady(1000);
    return null;
  } catch {
    if (!shouldStartDevServer) throw new Error(`Title audit server unavailable at ${baseUrl}`);
  }

  const child = spawn('npm', ['run', 'dev:react', '--', '--host', '127.0.0.1'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  await waitForHttpReady();
  return child;
}

async function readCatalog() {
  const source = await readFile(resolve(repoRoot, 'react-app/app/src/data/simulationCatalog.json'), 'utf8');
  return JSON.parse(source).simulations.filter((entry) => entry.stage === 'daily-rotation');
}

async function readTitleMetrics(page) {
  return page.evaluate(() => {
    const title = document.getElementById('hero-title');
    const line = title?.querySelector('.hero-title__name');
    if (!title || !line) return null;
    const titleStyle = getComputedStyle(title);
    const lineStyle = getComputedStyle(line);
    const titleRect = title.getBoundingClientRect();
    const lineRect = line.getBoundingClientRect();
    const matrix = titleStyle.transform && titleStyle.transform !== 'none'
      ? new DOMMatrixReadOnly(titleStyle.transform)
      : new DOMMatrixReadOnly();
    const titleScale = Math.hypot(matrix.a, matrix.b) || 1;
    const cssFontSize = Number.parseFloat(lineStyle.fontSize) || 0;
    const homeSnapshot = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.() || null;
    return {
      cssFontSize,
      titleScale,
      effectiveFontSize: cssFontSize * titleScale,
      titleRect: {
        width: titleRect.width,
        height: titleRect.height,
        centerX: titleRect.left + titleRect.width * 0.5,
        centerY: titleRect.top + titleRect.height * 0.5,
      },
      lineRect: {
        width: lineRect.width,
        height: lineRect.height,
        centerX: lineRect.left + lineRect.width * 0.5,
        centerY: lineRect.top + lineRect.height * 0.5,
      },
      canvasFontSize: Number(homeSnapshot?.canvasTitleFontSizeCssPx) || 0,
      canvasTitleVisible: homeSnapshot?.canvasTitleVisible === true,
      mode: homeSnapshot?.mode || document.querySelector('#simulation-stage')?.dataset?.simulationId || '',
      theme: document.documentElement.dataset.absTheme || '',
    };
  });
}

function compareMetric(actual, expected, key, limit, label) {
  const delta = Math.abs(Number(actual) - Number(expected));
  assert(delta <= limit, `${label}: ${key} drifted by ${delta.toFixed(3)}px`, { actual, expected, limit });
}

function compareTitleMetrics(actual, expected, label) {
  compareMetric(actual.effectiveFontSize, expected.effectiveFontSize, 'effective font size', tolerance.font, label);
  compareMetric(actual.titleRect.width, expected.titleRect.width, 'title width', tolerance.rect, label);
  compareMetric(actual.titleRect.height, expected.titleRect.height, 'title height', tolerance.rect, label);
  compareMetric(actual.titleRect.centerX, expected.titleRect.centerX, 'title center x', tolerance.center, label);
  compareMetric(actual.titleRect.centerY, expected.titleRect.centerY, 'title center y', tolerance.center, label);
}

async function visitSimulation(page, entry) {
  if (entry.surface === 'lab-route') {
    await page.goto(pageUrl(entry.dailyHref), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction((id) => (
      document.body.classList.contains('daily-focus-page')
      && document.querySelector('#simulation-stage')?.dataset?.simulationId === id
      && document.documentElement.dataset.absBootState !== 'booting'
    ), entry.id, { timeout: waitMs });
  } else {
    const url = new URL(pageUrl('/index.html'));
    url.searchParams.set('mode', entry.id);
    url.searchParams.set('absAudit', '1');
    await page.goto(url.toString(), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction((id) => {
      const snapshot = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.();
      return snapshot?.mode === id && snapshot.canvasTitleVisible === true;
    }, entry.id, { timeout: waitMs });
  }
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(650);
  const metrics = await readTitleMetrics(page);
  assert(metrics, `${entry.id}: title metrics unavailable`);
  if (entry.surface === 'home-mode') {
    assert(metrics.canvasTitleVisible, `${entry.id}: canvas title is not visible`, metrics);
    compareMetric(
      metrics.canvasFontSize,
      metrics.effectiveFontSize,
      'canvas versus canonical font size',
      tolerance.font,
      entry.id,
    );
  }
  return metrics;
}

async function main() {
  const server = await ensureServer();
  const entries = await readCatalog();
  const browser = await browserType.launch();
  const byTheme = {};

  try {
    for (const theme of ['light', 'dark']) {
      const context = await browser.newContext({ viewport, colorScheme: theme, reducedMotion: 'reduce' });
      await context.addInitScript(() => {
        localStorage.setItem('theme-preference-v3', 'auto');
        localStorage.removeItem('theme-preference-v2');
      });
      const page = await context.newPage();
      const results = [];
      let baseline = null;
      try {
        for (const entry of entries) {
          const metrics = await visitSimulation(page, entry);
          baseline ||= metrics;
          compareTitleMetrics(metrics, baseline, `${theme}/${entry.id}`);
          results.push({ id: entry.id, surface: entry.surface, ...metrics });
        }
      } finally {
        await context.close();
      }
      byTheme[theme] = results;
    }

    const lightById = new Map(byTheme.light.map((result) => [result.id, result]));
    byTheme.dark.forEach((darkResult) => {
      compareTitleMetrics(darkResult, lightById.get(darkResult.id), `theme-switch/${darkResult.id}`);
    });

    const output = {
      ok: true,
      browser: browserName,
      viewport,
      simulationCount: entries.length,
      checks: entries.length * 3,
      canonicalEffectiveFontSize: byTheme.light[0]?.effectiveFontSize,
      titleRect: byTheme.light[0]?.titleRect,
      depthModes: entries.filter((entry) => entry.id === '3d-sphere' || entry.id === '3d-cube').map((entry) => entry.id),
    };
    if (process.env.ABS_TITLE_AUDIT_DETAILS === '1') output.results = byTheme;
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await browser.close();
    server?.kill('SIGTERM');
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
