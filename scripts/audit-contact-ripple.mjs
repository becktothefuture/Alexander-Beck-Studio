#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { chromium, webkit } from 'playwright';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'contact-ripple');
const baseUrl = String(process.env.ABS_CONTACT_RIPPLE_URL || 'http://localhost:8012').replace(/\/+$/, '');
const shouldStartDevServer = !process.env.ABS_CONTACT_RIPPLE_URL;
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const viewports = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile', width: 375, height: 812 },
];

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

async function waitForHttpReady(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      const body = await response.text();
      if (response.ok && body.includes('Alexander Beck Studio')) return;
      lastError = new Error(`unexpected response ${response.status}`);
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }
  throw new Error(`Contact ripple server not ready at ${url}: ${lastError?.message || 'unknown error'}`);
}

function startDevServer() {
  const child = spawn('npm', ['run', 'dev:react'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env },
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += chunk.toString(); });
  child.stderr.on('data', (chunk) => { logs += chunk.toString(); });
  return {
    getLogs: () => logs,
    stop: async () => {
      if (child.exitCode !== null) return;
      child.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveStop) => child.once('exit', resolveStop)),
        delay(2000),
      ]);
      if (child.exitCode === null) child.kill('SIGKILL');
    },
  };
}

async function ensureDevServer() {
  try {
    await waitForHttpReady(`${baseUrl}/contact.html`, 2000);
    return null;
  } catch (error) {
    if (!shouldStartDevServer) throw error;
  }

  const server = startDevServer();
  try {
    await waitForHttpReady(`${baseUrl}/contact.html`);
    return server;
  } catch (error) {
    await server.stop();
    throw new Error(`${error.message}\n${server.getLogs()}`.trim());
  }
}

async function waitForIdle(page) {
  await page.waitForFunction(() => {
    const phase = document.documentElement.dataset.absTransitionPhase || 'idle';
    const bootState = document.documentElement.dataset.absBootState || 'ready';
    return phase === 'idle' && bootState !== 'booting';
  }, null, { timeout: 30000 });
}

async function waitForRipple(page, expectedState = null) {
  await page.waitForSelector('[data-contact-ripple-stage] [data-contact-ripple-canvas]', {
    state: 'attached',
    timeout: 20000,
  });
  await page.waitForFunction((state) => {
    const stage = document.querySelector('[data-contact-ripple-stage]');
    const canvas = document.querySelector('[data-contact-ripple-canvas]');
    if (!stage || !canvas || canvas.width < 64 || canvas.height < 64) return false;
    if (Number(canvas.dataset.contactRippleDpr || 0) <= 0) return false;
    if (Number(stage.dataset.contactRippleBodyCount || 0) <= 0) return false;
    const currentState = stage.dataset.contactRippleState || '';
    return state ? currentState === state : !['loading', 'created', 'destroyed'].includes(currentState);
  }, expectedState, { timeout: 20000 });
}

async function readRippleState(page) {
  return page.evaluate(() => {
    const stage = document.querySelector('[data-contact-ripple-stage]');
    const canvas = document.querySelector('[data-contact-ripple-canvas]');
    const content = document.querySelector('.contact-route__inner');
    const button = document.querySelector('[data-copy-email]');
    const rectOf = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const stageStyle = stage ? getComputedStyle(stage) : null;
    const canvasStyle = canvas ? getComputedStyle(canvas) : null;
    const contentStyle = content ? getComputedStyle(content) : null;
    return {
      path: location.pathname,
      stageState: stage?.dataset.contactRippleState || '',
      burstCount: Number(stage?.dataset.contactRippleBurstCount || 0),
      bodyCount: Number(stage?.dataset.contactRippleBodyCount || 0),
      bodyRadius: Number(stage?.dataset.contactRippleBodyRadius || 0),
      paletteSize: Number(stage?.dataset.contactRipplePaletteSize || 0),
      surface: stage?.dataset.contactRippleSurface || '',
      canvasWidth: canvas?.width || 0,
      canvasHeight: canvas?.height || 0,
      canvasClientWidth: canvas?.clientWidth || 0,
      canvasClientHeight: canvas?.clientHeight || 0,
      canvasDpr: Number(canvas?.dataset.contactRippleDpr || 0),
      stageRect: rectOf(stage),
      canvasRect: rectOf(canvas),
      contentRect: rectOf(content),
      buttonRect: rectOf(button),
      stageZ: Number(stageStyle?.zIndex || 0),
      contentZ: Number(contentStyle?.zIndex || 0),
      canvasPointerEvents: canvasStyle?.pointerEvents || '',
      diagnostics: window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__
        ? { ...window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__ }
        : null,
      soundMotifCount: Number(window.__ABS_SIMULATION_AUDIO__?.byType?.['contact-ripple-motif'] || 0),
      soundEnabled: document.querySelector('.button-bar__sound-toggle')?.dataset.enabled || 'false',
    };
  });
}

function assertLayout(state, viewport) {
  assert(state.canvasWidth >= Math.floor(state.canvasClientWidth * state.canvasDpr) - 2, 'Canvas backing width is undersized', state);
  assert(state.canvasHeight >= Math.floor(state.canvasClientHeight * state.canvasDpr) - 2, 'Canvas backing height is undersized', state);
  assert(state.canvasDpr > 0 && state.canvasDpr <= 1.5, 'Canvas DPR cap failed', state);
  assert(state.paletteSize >= 6, 'Contact ripple did not load the site palette', state);
  assert(state.bodyCount >= 100, 'Contact ripple fixed body field is unexpectedly sparse', state);
  assert(state.bodyRadius >= 8.5 && state.bodyRadius <= 10.4, 'Contact ripple bodies do not match the ball-pit size band', state);
  assert(state.canvasPointerEvents === 'none', 'Decorative canvas captured pointer events', state);
  assert(state.stageZ < state.contentZ, 'Contact content is not above the ripple stage', state);
  assert(state.stageRect?.width > viewport.width * 0.75, 'Ripple stage does not fill the studio window', state);
  assert(state.stageRect?.height > viewport.height * 0.65, 'Ripple stage height is too small', state);
  assert(state.buttonRect && state.contentRect, 'Contact content geometry is missing', state);
  assert(state.diagnostics?.activeInstances === 1, 'Unexpected active Contact ripple instance count', state);
}

async function forceClipboardFailure(page) {
  await page.evaluate(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('audit clipboard failure')) },
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: () => false,
    });
  });
}

async function runStandardScenario(browser, viewport, theme) {
  const contextOptions = {
    viewport: { width: viewport.width, height: viewport.height },
    reducedMotion: 'no-preference',
  };
  if (browserName === 'chromium') {
    contextOptions.permissions = ['clipboard-read', 'clipboard-write'];
  }
  const context = await browser.newContext(contextOptions);
  await context.addInitScript((initialTheme) => {
    localStorage.setItem('theme-preference-v2', initialTheme);
    localStorage.removeItem('theme-preference');
  }, theme);
  if (browserName === 'webkit') {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.resolve() },
      });
    });
  }
  const page = await context.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));

  try {
    await page.goto(`${baseUrl}/contact.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    await waitForRipple(page, 'idle');
    const initial = await readRippleState(page);
    assertLayout(initial, viewport);

    const button = page.locator('[data-copy-email]');
    await button.click();
    await page.waitForFunction((previousCount) => (
      Number(document.querySelector('[data-contact-ripple-stage]')?.dataset.contactRippleBurstCount || 0) > previousCount
    ), initial.burstCount);
    await page.waitForFunction(() => document.querySelector('[data-copy-status]')?.textContent.trim() === 'Copied');
    await page.waitForFunction((previousCount) => (
      Number(window.__ABS_SIMULATION_AUDIO__?.byType?.['contact-ripple-motif'] || 0) > previousCount
    ), initial.soundMotifCount, { timeout: 5000 });

    const immediateStart = (await readRippleState(page)).burstCount;
    await page.evaluate(() => document.querySelector('[data-copy-email]')?.click());
    await page.waitForFunction((previousCount) => (
      Number(document.querySelector('[data-contact-ripple-stage]')?.dataset.contactRippleBurstCount || 0) > previousCount
    ), immediateStart);
    const successBurst = await readRippleState(page);
    assert(successBurst.stageState === 'burst', 'Email activation did not immediately enter burst state', successBurst);
    assert(successBurst.bodyCount === initial.bodyCount, 'Burst changed the number of rendered balls', { initial, successBurst });
    assert(successBurst.bodyRadius === initial.bodyRadius, 'Burst changed the rendered ball size', { initial, successBurst });
    assert(successBurst.soundEnabled === 'true', 'First Contact activation did not unlock the requested sound motif', successBurst);

    const rapidStart = successBurst.burstCount;
    for (let clickIndex = 1; clickIndex <= 3; clickIndex += 1) {
      await page.evaluate(() => document.querySelector('[data-copy-email]')?.click());
      await page.waitForFunction((expectedCount) => (
        Number(document.querySelector('[data-contact-ripple-stage]')?.dataset.contactRippleBurstCount || 0) >= expectedCount
      ), rapidStart + clickIndex);
    }
    const rapidBurst = await readRippleState(page);
    assert(rapidBurst.stageState === 'burst', 'Rapid activation did not restart the active burst', rapidBurst);
    assert(rapidBurst.bodyCount === initial.bodyCount, 'Rapid activation changed the fixed body count', { initial, rapidBurst });

    await forceClipboardFailure(page);
    const failureStart = rapidBurst.burstCount;
    await page.evaluate(() => document.querySelector('[data-copy-email]')?.click());
    await page.waitForFunction((previousCount) => (
      Number(document.querySelector('[data-contact-ripple-stage]')?.dataset.contactRippleBurstCount || 0) > previousCount
    ), failureStart);
    await page.waitForFunction(() => document.querySelector('[data-copy-status]')?.textContent.trim() === 'Copy failed');
    const failureBurst = await readRippleState(page);
    assert(failureBurst.stageState === 'burst', 'Clipboard failure suppressed the ripple burst', failureBurst);
    assert(failureBurst.bodyCount === initial.bodyCount, 'Clipboard failure changed the fixed body count', { initial, failureBurst });

    const originalSurface = failureBurst.surface;
    await page.evaluate(() => {
      document.querySelector('[aria-label*="dark mode"], [aria-label*="light mode"]')?.click();
    });
    await page.waitForFunction((surface) => {
      const nextSurface = document.querySelector('[data-contact-ripple-stage]')?.dataset.contactRippleSurface || '';
      return Boolean(nextSurface && nextSurface !== surface);
    }, originalSurface);
    const toggled = await readRippleState(page);
    assert(toggled.diagnostics?.activeInstances === 1, 'Theme change remounted duplicate ripple instances', toggled);
    assert(toggled.bodyCount === initial.bodyCount, 'Theme change changed the fixed body geometry', { initial, toggled });

    await page.screenshot({
      path: resolve(outputRoot, `${viewport.label}-${theme}-${browserName}-burst.png`),
      fullPage: false,
    });

    await page.locator('[data-route-tab="about"]').click();
    await page.waitForURL(/about\.html/, { timeout: 30000 });
    await waitForIdle(page);
    await page.waitForFunction(() => (
      !document.querySelector('[data-contact-ripple-canvas]')
      && window.__ABS_CONTACT_RIPPLE_DIAGNOSTICS__?.activeInstances === 0
    ));
    await page.locator('[data-route-tab="contact"]').click();
    await page.waitForURL(/contact\.html/, { timeout: 30000 });
    await waitForIdle(page);
    await waitForRipple(page, 'idle');
    const remounted = await readRippleState(page);
    assert(remounted.diagnostics?.activeInstances === 1, 'Contact ripple did not remount cleanly', remounted);
    assert(remounted.diagnostics?.destroyedInstances >= 1, 'Contact ripple teardown was not recorded', remounted);
    assert(pageErrors.length === 0, 'Page errors occurred during the standard ripple scenario', pageErrors);

    return { initial, successBurst, rapidBurst, failureBurst, toggled, remounted };
  } finally {
    await context.close();
  }
}

async function runReducedMotionScenario(browser) {
  const contextOptions = {
    viewport: { width: 375, height: 812 },
    reducedMotion: 'reduce',
  };
  if (browserName === 'chromium') {
    contextOptions.permissions = ['clipboard-read', 'clipboard-write'];
  }
  const context = await browser.newContext(contextOptions);
  if (browserName === 'webkit') {
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', {
        configurable: true,
        value: { writeText: () => Promise.resolve() },
      });
    });
  }
  const page = await context.newPage();
  try {
    await page.goto(`${baseUrl}/contact.html`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    await waitForRipple(page, 'reduced-idle');
    const initial = await readRippleState(page);
    await page.locator('[data-copy-email]').click();
    await waitForRipple(page, 'reduced-burst');
    const burst = await readRippleState(page);
    assert(burst.burstCount === initial.burstCount + 1, 'Reduced-motion burst count did not increment', { initial, burst });
    await page.waitForFunction(() => (
      document.querySelector('[data-contact-ripple-stage]')?.dataset.contactRippleState === 'reduced-idle'
    ), null, { timeout: 3000 });
    return { initial, burst, settled: await readRippleState(page) };
  } finally {
    await context.close();
  }
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const server = await ensureDevServer();
  const browser = await browserType.launch();
  const results = [];
  try {
    for (const viewport of viewports) {
      for (const theme of ['light', 'dark']) {
        results.push({
          viewport: viewport.label,
          theme,
          scenario: await runStandardScenario(browser, viewport, theme),
        });
      }
    }
    results.push({ reducedMotion: await runReducedMotionScenario(browser) });
  } finally {
    await browser.close();
    await server?.stop();
  }

  await writeFile(
    resolve(outputRoot, `contact-ripple-${browserName}.json`),
    `${JSON.stringify(results, null, 2)}\n`,
  );
  console.log(`PASS: Contact ripple audit passed in ${browserName} across desktop/mobile, light/dark, failure, rapid-click, reduced-motion, and SPA lifecycle states.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
