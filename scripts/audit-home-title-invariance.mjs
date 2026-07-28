#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
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
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'home-title-invariance', browserName);

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
    const canvas = document.getElementById('simulation-title-canvas');
    const material = document.getElementById('c');
    const frontMaterial = document.getElementById('simulation-front-depth-canvas');
    const scratch = document.createElement('canvas');
    scratch.width = 48;
    scratch.height = 48;
    const scratchContext = scratch.getContext('2d', { alpha: true, willReadFrequently: true });
    if (canvas && scratchContext) scratchContext.drawImage(canvas, 0, 0, 48, 48);
    const pixels = scratchContext?.getImageData(0, 0, 48, 48).data || [];
    let titlePixelAlpha = 0;
    for (let index = 3; index < pixels.length; index += 4) titlePixelAlpha = Math.max(titlePixelAlpha, pixels[index]);
    return {
      cssFontSize,
      titleScale,
      domTitleOpacity: Number.parseFloat(titleStyle.opacity || '1'),
      semanticCanvasSource: title.dataset.canvasTitleSource === 'home',
      semanticAccessible: title.getAttribute('aria-hidden') !== 'true' && Boolean(title.textContent?.trim()),
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
      titleCanvasCount: document.querySelectorAll('#simulation-title-canvas').length,
      titleCanvasIdentity: canvas?.dataset?.titlePlaneIdentity || '',
      titleCanvasReady: canvas?.dataset?.titlePlaneReady === 'true',
      titleCanvasAtmosphereSource: Boolean(
        canvas?.hasAttribute('data-atmosphere-source-material')
        || canvas?.closest('[data-atmosphere-source-material]'),
      ),
      titlePixelAlpha,
      titleZIndex: Number.parseInt(canvas ? getComputedStyle(canvas).zIndex : '', 10) || 0,
      materialZIndex: Number.parseInt(material ? getComputedStyle(material).zIndex : '', 10) || 0,
      frontMaterialZIndex: Number.parseInt(frontMaterial ? getComputedStyle(frontMaterial).zIndex : '', 10) || 0,
      depthTitleActive: document.getElementById('simulations')?.classList.contains('simulation-depth-title-layer-active') === true,
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
  assert(metrics.domTitleOpacity <= 0.02, `${entry.id}: semantic title became a visual owner`, metrics);
  assert(metrics.semanticCanvasSource && metrics.semanticAccessible, `${entry.id}: semantic title is not the accessible geometry source`, metrics);
  assert(metrics.titleCanvasCount === 1, `${entry.id}: stable title plane count is not one`, metrics);
  assert(metrics.titleCanvasIdentity === 'shell-owned', `${entry.id}: title plane is not shell-owned`, metrics);
  assert(metrics.titleCanvasReady, `${entry.id}: stable title plane is not ready`, metrics);
  assert(metrics.titlePixelAlpha > 0, `${entry.id}: stable title plane has no painted pixels`, metrics);
  assert(!metrics.titleCanvasAtmosphereSource, `${entry.id}: title plane entered an atmosphere source layer`, metrics);
  if (entry.surface === 'home-mode' && metrics.canvasFontSize > 0) {
    assert(metrics.canvasTitleVisible, `${entry.id}: canvas title diagnostics report it hidden`, metrics);
    compareMetric(
      metrics.canvasFontSize,
      metrics.effectiveFontSize,
      'canvas versus canonical font size',
      tolerance.font,
      entry.id,
    );
    assert(
      metrics.depthTitleActive
        ? metrics.materialZIndex < metrics.titleZIndex && metrics.titleZIndex < metrics.frontMaterialZIndex
        : metrics.titleZIndex < metrics.materialZIndex,
      `${entry.id}: title/material stacking contract is wrong`,
      metrics,
    );
  }
  return metrics;
}

async function auditStableTitleHandoffs(browser) {
  const context = await browser.newContext({
    viewport,
    colorScheme: 'light',
    isMobile: true,
    hasTouch: true,
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  try {
    await page.goto(pageUrl('/index.html?mode=pit&absAudit=1'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForFunction(() => (
      document.documentElement.dataset.absBootState === 'ready'
      && document.getElementById('simulation-title-canvas')?.dataset.titlePlaneReady === 'true'
    ), null, { timeout: waitMs, polling: 'raf' });
    await page.waitForFunction(async () => {
      const titleModule = await import('/src/legacy/modules/rendering/title-depth.js');
      const snapshot = titleModule.getHomepageCanvasTitleSnapshot();
      return snapshot.sourceConnected
        && snapshot.visible
        && snapshot.firstLineX > 20
        && snapshot.firstLineY > 20;
    }, null, { timeout: waitMs, polling: 'raf' });
    await page.evaluate(() => {
      window.__ABS_TITLE_PLANE_IDENTITY__ = document.getElementById('simulation-title-canvas');
    });

    const handoffs = [
      { label: 'home-to-home', targetName: 'Assembly', targetId: 'shapes' },
      { label: 'home-to-daily', targetName: 'Tension', targetId: 'repel-room' },
      { label: 'daily-to-daily', targetName: 'Convergence', targetId: 'flock-of-birds' },
      { label: 'daily-to-home', targetName: 'Foundation', targetId: 'pit' },
    ];
    const results = [];
    for (const handoff of handoffs) {
      await page.waitForFunction(async () => {
        const titleModule = await import('/src/legacy/modules/rendering/title-depth.js');
        const snapshot = titleModule.getHomepageCanvasTitleSnapshot();
        return snapshot.sourceConnected && snapshot.visible;
      }, null, { timeout: waitMs, polling: 'raf' });
      await page.locator('.simulation-focus-switcher').click({ timeout: waitMs });
      await page.waitForSelector('.simulation-focus-modal.active', { timeout: waitMs });
      await page.evaluate(async ({ label }) => {
        const titleModule = await import('/src/legacy/modules/rendering/title-depth.js');
        const scratch = document.createElement('canvas');
        scratch.width = 48;
        scratch.height = 48;
        const scratchContext = scratch.getContext('2d', { alpha: true, willReadFrequently: true });
        const initialCanvas = document.getElementById('simulation-title-canvas');
        const initialRect = initialCanvas?.getBoundingClientRect();
        const initialTitle = titleModule.getHomepageCanvasTitleSnapshot();
        const audit = {
          label,
          samples: [],
          sawBusy: false,
          done: false,
          lastCenterX: initialRect && initialCanvas?.width > 0
            ? initialRect.left + initialTitle.firstLineX * (initialRect.width / initialCanvas.width)
            : null,
          lastCenterY: initialRect && initialCanvas?.height > 0
            ? initialRect.top + initialTitle.firstLineY * (initialRect.height / initialCanvas.height)
            : null,
        };
        window.__ABS_TITLE_HANDOFF_AUDIT__ = audit;
        const sample = () => {
          const canvas = document.getElementById('simulation-title-canvas');
          const semantic = document.getElementById('hero-title');
          const semanticLine = semantic?.querySelector('.hero-title__name');
          const semanticRect = semanticLine?.getBoundingClientRect();
          const canvasRect = canvas?.getBoundingClientRect();
          const title = titleModule.getHomepageCanvasTitleSnapshot();
          const tx = window.__ABS_SIMULATION_SWITCH_TRANSACTION__ || {};
          let maxAlpha = 0;
          if (canvas && scratchContext) {
            scratchContext.clearRect(0, 0, 48, 48);
            scratchContext.drawImage(canvas, 0, 0, 48, 48);
            const pixels = scratchContext.getImageData(0, 0, 48, 48).data;
            for (let index = 3; index < pixels.length; index += 4) maxAlpha = Math.max(maxAlpha, pixels[index]);
          }
          if (title.sourceConnected && canvasRect && canvas?.width > 0 && title.firstLineX > 20) {
            audit.lastCenterX = canvasRect.left + title.firstLineX * (canvasRect.width / canvas.width);
            audit.lastCenterY = canvasRect.top + title.firstLineY * (canvasRect.height / canvas.height);
          }
          const centerX = audit.lastCenterX;
          const centerY = audit.lastCenterY;
          audit.samples.push({
            at: performance.now(),
            phase: tx.phase || 'idle',
            transactionId: tx.transactionId || '',
            sameNode: canvas === window.__ABS_TITLE_PLANE_IDENTITY__,
            canvasCount: document.querySelectorAll('#simulation-title-canvas').length,
            canvasReady: canvas?.dataset.titlePlaneReady === 'true',
            maxAlpha,
            centerX,
            centerY,
            semanticPresent: Boolean(semantic && semanticLine),
            semanticCanvasSource: semantic?.dataset.canvasTitleSource === 'home',
            semanticAccessible: semantic?.getAttribute('aria-hidden') !== 'true' && Boolean(semantic?.textContent?.trim()),
            semanticOpacity: semantic ? Number.parseFloat(getComputedStyle(semantic).opacity || '1') : null,
            semanticWidth: semanticRect?.width || 0,
            semanticHeight: semanticRect?.height || 0,
            semanticCenterX: semanticRect ? semanticRect.left + semanticRect.width * 0.5 : null,
            semanticCenterY: semanticRect ? semanticRect.top + semanticRect.height * 0.5 : null,
            sourceConnected: title.sourceConnected,
            retainedPixels: title.retainedPixels,
            atmosphereSource: Boolean(
              canvas?.hasAttribute('data-atmosphere-source-material')
              || canvas?.closest('[data-atmosphere-source-material]'),
            ),
          });
          if (tx.busy || (tx.phase && tx.phase !== 'idle')) audit.sawBusy = true;
          if (audit.sawBusy && !tx.busy && tx.phase === 'idle') {
            audit.done = true;
            return;
          }
          if (performance.now() - audit.samples[0].at < 30000) requestAnimationFrame(sample);
        };
        requestAnimationFrame(sample);
      }, { label: handoff.label });

      await page.locator('.simulation-focus-modal.active .simulation-focus-row')
        .filter({ hasText: handoff.targetName })
        .first()
        .click({ timeout: waitMs });
      await page.waitForFunction(({ targetId }) => {
        const audit = window.__ABS_TITLE_HANDOFF_AUDIT__;
        const tx = window.__ABS_SIMULATION_SWITCH_TRANSACTION__ || {};
        const runtimeId = document.querySelector('#simulation-stage')?.dataset?.simulationId
          || window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.().mode;
        return audit?.done && tx.phase === 'idle' && tx.targetSimulationId === targetId && runtimeId === targetId;
      }, { targetId: handoff.targetId }, { timeout: waitMs, polling: 'raf' });
      const result = await page.evaluate(() => window.__ABS_TITLE_HANDOFF_AUDIT__);
      assert(result.sawBusy && result.samples.length >= 3, `${handoff.label}: handoff was not sampled`, result);
      const firstLifecycleIndex = result.samples.findIndex((sample) => sample.phase !== 'idle');
      assert(firstLifecycleIndex >= 0, `${handoff.label}: lifecycle phases were not sampled`, result);
      const lifecycleSamples = result.samples.slice(firstLifecycleIndex);
      const baseline = lifecycleSamples[0];
      for (const sample of lifecycleSamples) {
        assert(sample.sameNode && sample.canvasCount === 1, `${handoff.label}: stable title node identity changed`, sample);
        assert(sample.canvasReady && sample.maxAlpha > 0, `${handoff.label}: title pixels disappeared`, sample);
        assert(sample.semanticPresent && sample.semanticWidth > 0 && sample.semanticHeight > 0, `${handoff.label}: semantic geometry source disappeared`, sample);
        assert(sample.semanticCanvasSource && sample.semanticAccessible, `${handoff.label}: semantic accessibility source changed`, sample);
        assert(sample.semanticOpacity <= 0.02, `${handoff.label}: semantic title became visually paintable`, sample);
        assert(!sample.atmosphereSource, `${handoff.label}: title plane entered atmosphere source ownership`, sample);
        compareMetric(sample.centerX, baseline.centerX, 'canvas title center x', 1, handoff.label);
        compareMetric(sample.centerY, baseline.centerY, 'canvas title center y', 1, handoff.label);
        if (sample.sourceConnected) {
          compareMetric(sample.centerX, sample.semanticCenterX, 'canvas/semantic center x', 1, handoff.label);
          compareMetric(sample.centerY, sample.semanticCenterY, 'canvas/semantic center y', 1, handoff.label);
        }
      }
      await page.screenshot({ path: resolve(outputRoot, `${handoff.label}.png`) });
      results.push({
        ...handoff,
        sampleCount: lifecycleSamples.length,
        phaseHistory: [...new Set(lifecycleSamples.map((sample) => sample.phase))],
        maxCenterDeltaX: Math.max(...lifecycleSamples.map((sample) => Math.abs(sample.centerX - baseline.centerX))),
        maxCenterDeltaY: Math.max(...lifecycleSamples.map((sample) => Math.abs(sample.centerY - baseline.centerY))),
      });
    }
    return results;
  } catch (error) {
    await page.screenshot({ path: resolve(outputRoot, 'failure.png'), fullPage: true }).catch(() => undefined);
    throw error;
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
    await mkdir(outputRoot, { recursive: true });
    const homeCanvasEntrance = await auditHomeCanvasTitleEntrance(browser);
    const stableTitleHandoffs = await auditStableTitleHandoffs(browser);
    if (process.env.ABS_TITLE_ENTRANCE_ONLY === '1') {
      const entranceOutput = {
        ok: true,
        browser: browserName,
        viewport,
        homeCanvasEntrance,
        stableTitleHandoffs,
      };
      await writeFile(resolve(outputRoot, 'result.json'), `${JSON.stringify(entranceOutput, null, 2)}\n`);
      console.log(JSON.stringify(entranceOutput, null, 2));
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
        await page.screenshot({ path: resolve(outputRoot, `direct-${theme}.png`) });
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
      depthModes: byTheme.light.filter((entry) => entry.depthTitleActive).map((entry) => entry.id),
      homeCanvasEntrance,
      stableTitleHandoffs,
    };
    if (process.env.ABS_TITLE_AUDIT_DETAILS === '1') output.results = byTheme;
    await writeFile(resolve(outputRoot, 'result.json'), `${JSON.stringify(output, null, 2)}\n`);
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
