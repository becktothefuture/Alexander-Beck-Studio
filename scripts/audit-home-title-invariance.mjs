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
      domTitleOpacity: Number.parseFloat(titleStyle.opacity || '1'),
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
      const root = document.documentElement;
      return snapshot?.mode === id
        && snapshot.canvasTitleVisible === true
        && root.dataset.absBootState === 'ready';
    }, entry.id, { timeout: waitMs });
  }
  await page.evaluate(() => document.fonts?.ready);
  await page.waitForTimeout(650);
  const metrics = await readTitleMetrics(page);
  assert(metrics, `${entry.id}: title metrics unavailable`);
  if (entry.surface === 'home-mode') {
    assert(metrics.domTitleOpacity <= 0.02, `${entry.id}: semantic Home title became visually paintable`, metrics);
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

async function auditDailyFocusTitleEntrance(browser, entry) {
  assert(entry, 'Daily Focus title entrance audit requires a lab-route simulation');
  const context = await browser.newContext({
    viewport,
    colorScheme: 'light',
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(() => {
    window.__ABS_DAILY_TITLE_ENTRANCE_AUDIT__ = {
      sawPendingHidden: false,
      sawEnterIntermediate: false,
      sawEnterWithoutOverlay: false,
      sawEdgeCaptionPending: false,
      sawEdgeCaptionIntermediate: false,
      edgeCaptionMaxCenterDelta: 0,
    };

    const sample = () => {
      const audit = window.__ABS_DAILY_TITLE_ENTRANCE_AUDIT__;
      const root = document.documentElement;
      const titleLine = document.querySelector('#hero-title .hero-title__name');
      if (audit && titleLine) {
        const glyphOpacities = Array.from(
          document.querySelectorAll('#hero-title [data-route-enter-glyph]'),
          (glyph) => Number.parseFloat(getComputedStyle(glyph).opacity || '1'),
        );
        const opacity = glyphOpacities.length > 0
          ? Math.max(...glyphOpacities)
          : Number.parseFloat(getComputedStyle(titleLine).opacity || '1');
        const titleIsStaged = glyphOpacities.length > 0
          ? glyphOpacities.every((glyphOpacity) => glyphOpacity <= 0.02)
          : opacity <= 0.02;
        const titleIsInterpolating = glyphOpacities.length > 0
          ? glyphOpacities.some((glyphOpacity) => glyphOpacity > 0.02 && glyphOpacity < 0.98)
            || (Math.min(...glyphOpacities) <= 0.02 && opacity >= 0.98)
          : opacity > 0.02 && opacity < 0.98;
        if (root.classList.contains('abs-home-post-boot-pending') && titleIsStaged) {
          audit.sawPendingHidden = true;
        }
        if (root.classList.contains('abs-home-post-boot-enter')) {
          if (!document.getElementById('abs-boot-overlay')) audit.sawEnterWithoutOverlay = true;
          if (titleIsInterpolating) audit.sawEnterIntermediate = true;
        }
      }
      const edgeCaption = document.getElementById('edge-caption');
      if (audit && edgeCaption && (
        root.classList.contains('abs-home-post-boot-pending')
        || root.classList.contains('abs-home-post-boot-enter')
      )) {
        const rect = edgeCaption.getBoundingClientRect();
        const opacity = Number.parseFloat(getComputedStyle(edgeCaption).opacity || '1');
        const centerDelta = Math.abs((rect.left + rect.width * 0.5) - window.innerWidth * 0.5);
        audit.edgeCaptionMaxCenterDelta = Math.max(audit.edgeCaptionMaxCenterDelta, centerDelta);
        if (root.classList.contains('abs-home-post-boot-pending') && opacity <= 0.02) {
          audit.sawEdgeCaptionPending = true;
        }
        if (
          root.classList.contains('abs-home-post-boot-enter')
          && opacity > 0.02
          && opacity < 0.5
        ) {
          audit.sawEdgeCaptionIntermediate = true;
        }
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  const page = await context.newPage();
  try {
    await page.goto(pageUrl(entry.dailyHref), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction((id) => (
      document.body.classList.contains('daily-focus-page')
      && document.querySelector('#simulation-stage')?.dataset?.simulationId === id
      && document.documentElement.dataset.absDailyFocusStatus === 'ready'
      && document.documentElement.dataset.absHomeSimulationReady === 'true'
      && document.documentElement.classList.contains('abs-direct-boot-ready')
      && document.documentElement.classList.contains('abs-home-post-boot-complete')
      && document.documentElement.dataset.absBootState !== 'booting'
    ), entry.id, { timeout: waitMs });

    const result = await page.evaluate(() => {
      const name = document.querySelector('#hero-title .hero-title__name');
      const roles = [...document.querySelectorAll('#hero-title .hero-title__role')];
      return {
        ...window.__ABS_DAILY_TITLE_ENTRANCE_AUDIT__,
        nameOpacity: Number.parseFloat(getComputedStyle(name).opacity || '0'),
        roleOpacities: roles.map((role) => Number.parseFloat(getComputedStyle(role).opacity || '0')),
        roleLines: roles.map((role) => role.textContent?.trim() || ''),
      };
    });

    assert(result.sawPendingHidden, `${entry.id}: title was not staged hidden before its entrance`, result);
    assert(result.sawEnterIntermediate, `${entry.id}: title did not visibly interpolate into view`, result);
    assert(result.sawEnterWithoutOverlay, `${entry.id}: title entrance began before the loader detached`, result);
    assert(result.nameOpacity >= 0.99, `${entry.id}: title name did not settle visible`, result);
    assert(
      result.roleLines.length === 2
      && result.roleLines.every(Boolean)
      && result.roleOpacities.every((opacity) => Math.abs(opacity - 0.58) <= 0.02),
      `${entry.id}: title role lines did not settle at the shared secondary tone`,
      result,
    );
    assert(result.sawEdgeCaptionPending, `${entry.id}: edge caption was not staged for entrance`, result);
    assert(result.sawEdgeCaptionIntermediate, `${entry.id}: edge caption did not visibly fade into view`, result);
    assert(
      result.edgeCaptionMaxCenterDelta <= tolerance.center,
      `${entry.id}: edge caption moved horizontally during its entrance`,
      result,
    );
    return { id: entry.id, ...result };
  } finally {
    await context.close();
  }
}

async function auditHomeCanvasTitleEntrance(browser) {
  const context = await browser.newContext({
    viewport,
    colorScheme: 'light',
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'no-preference',
  });
  await context.addInitScript(() => {
    window.__ABS_HOME_CANVAS_TITLE_ENTRANCE_AUDIT__ = {
      sawPendingHidden: false,
      sawDomIntermediate: false,
      sawCanvasIntermediate: false,
      sawEnterWithoutOverlay: false,
      sawDelayedControlInert: false,
      delayedControlEscapedInert: false,
      escapedTargets: [],
    };

    const focusableSelector = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[contenteditable="true"]',
      '[tabindex]:not([tabindex="-1"])',
    ].join(',');

    const sample = () => {
      const audit = window.__ABS_HOME_CANVAS_TITLE_ENTRANCE_AUDIT__;
      const root = document.documentElement;
      const titleLine = document.querySelector('#hero-title .hero-title__name');
      const titleGlyphs = Array.from(
        document.querySelectorAll('#hero-title [data-route-enter-glyph]'),
      );
      const glyphOpacities = titleGlyphs.map((glyph) => (
        Number.parseFloat(getComputedStyle(glyph).opacity || '1')
      ));
      const domOpacity = glyphOpacities.length > 0
        ? Math.max(...glyphOpacities)
        : titleLine
          ? Number.parseFloat(getComputedStyle(titleLine).opacity || '1')
          : 1;
      const titleIsStaged = glyphOpacities.length > 0
        ? glyphOpacities.every((opacity) => opacity <= 0.02)
        : domOpacity <= 0.02;
      const titleIsInterpolating = glyphOpacities.length > 0
        ? glyphOpacities.some((opacity) => opacity > 0.02 && opacity < 0.98)
          || (Math.min(...glyphOpacities) <= 0.02 && domOpacity >= 0.98)
        : domOpacity > 0.02 && domOpacity < 0.98;
      const snapshot = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.();
      const canvasOpacity = Number(snapshot?.canvasTitleMaxOpacity) || 0;

      if (root.classList.contains('abs-home-post-boot-pending') && titleIsStaged) {
        audit.sawPendingHidden = true;
      }
      if (root.classList.contains('abs-home-post-boot-enter')) {
        if (!document.getElementById('abs-boot-overlay')) audit.sawEnterWithoutOverlay = true;
        if (titleIsInterpolating) audit.sawDomIntermediate = true;
        if (canvasOpacity > 0.02 && canvasOpacity < 0.98) audit.sawCanvasIntermediate = true;
      }

      if (root.dataset.absBootState === 'revealing' && !document.getElementById('abs-boot-overlay')) {
        document.querySelectorAll('[data-route-enter]').forEach((target) => {
          const containsControl = target.matches(focusableSelector)
            || target.querySelector(focusableSelector);
          if (!containsControl || Number.parseFloat(getComputedStyle(target).opacity || '1') > 0.02) return;
          if (target.inert) audit.sawDelayedControlInert = true;
          else {
            audit.delayedControlEscapedInert = true;
            const label = target.id || target.className || target.tagName;
            if (!audit.escapedTargets.includes(label)) audit.escapedTargets.push(label);
          }
        });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });

  const page = await context.newPage();
  try {
    await page.goto(pageUrl('/index.html?mode=pit&absAudit=1'), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await page.waitForFunction(() => (
      document.documentElement.classList.contains('abs-home-post-boot-complete')
      && document.documentElement.dataset.absBootState === 'ready'
      && window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().canvasTitleVisible === true
    ), null, { timeout: waitMs });

    const result = await page.evaluate(() => ({
      ...window.__ABS_HOME_CANVAS_TITLE_ENTRANCE_AUDIT__,
      canvasOpacity: Number(
        window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().canvasTitleMaxOpacity,
      ) || 0,
      stuckInertTargets: Array.from(document.querySelectorAll('[data-route-enter][inert]'))
        .map((target) => target.id || target.className || target.tagName),
    }));

    assert(result.sawPendingHidden, 'Home title was not staged hidden before its entrance', result);
    assert(result.sawDomIntermediate, 'Home semantic title did not interpolate after the loader', result);
    assert(result.sawCanvasIntermediate, 'Home canvas title did not mirror the semantic title entrance', result);
    assert(result.sawEnterWithoutOverlay, 'Home title entrance began before the loader detached', result);
    assert(result.sawDelayedControlInert, 'Home delayed controls were not removed from keyboard navigation', result);
    assert(!result.delayedControlEscapedInert, 'A hidden Home entrance control remained keyboard-focusable', result);
    assert(result.stuckInertTargets.length === 0, 'Home entrance left controls inert after settling', result);
    assert(result.canvasOpacity >= 0.99, 'Home canvas title did not settle visible', result);
    return result;
  } finally {
    await context.close();
  }
}

async function main() {
  const server = await ensureServer();
  const entries = await readCatalog();
  const browser = await browserType.launch();
  const byTheme = {};

  try {
    const homeCanvasEntrance = await auditHomeCanvasTitleEntrance(browser);
    const dailyFocusEntrance = await auditDailyFocusTitleEntrance(
      browser,
      entries.find((entry) => entry.surface === 'lab-route'),
    );
    if (process.env.ABS_TITLE_ENTRANCE_ONLY === '1') {
      console.log(JSON.stringify({
        ok: true,
        browser: browserName,
        viewport,
        homeCanvasEntrance,
        dailyFocusEntrance,
      }, null, 2));
      return;
    }
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
      homeCanvasEntrance,
      dailyFocusEntrance,
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
