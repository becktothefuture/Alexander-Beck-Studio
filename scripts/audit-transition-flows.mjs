#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const DEFAULT_URL = 'http://127.0.0.1:8013';
const WAIT_MS = Number(process.env.ABS_TRANSITION_HARD_TIMEOUT_MS || 60000);
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const STRICT_RAF = process.env.ABS_TRANSITION_STRICT_RAF === '1';
const REDUCED_MOTION = process.env.ABS_TRANSITION_REDUCED_MOTION === '1';
const __dirname = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(__dirname, '..', 'output', 'playwright', 'transition-flows');
const BROWSERS = { chromium, firefox, webkit };

const ROUTE_STEPS = [
  { id: 'contact', href: '/contact.html', ready: '[data-route-content="contact"]' },
  { id: 'about', href: '/about.html', ready: '[data-route-content="about"]' },
  { id: 'portfolio', href: '/portfolio.html', ready: '[data-route-content="portfolio-gate"]' },
  { id: 'home', href: '/index.html', ready: '#c' },
];

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

function origin() {
  return new URL(String(process.env.ABS_DEV_URL || DEFAULT_URL)).origin;
}

function routeUrl(pathname) {
  return new URL(pathname, origin()).toString();
}

async function waitForIdle(page) {
  await page.waitForFunction(
    () => (
      (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
      && !document.documentElement.dataset.absInstrumentWake
      && (() => {
        const overlay = document.getElementById('abs-boot-overlay');
        if (!overlay) return true;
        const styles = getComputedStyle(overlay);
        return styles.display === 'none' || styles.visibility === 'hidden' || Number.parseFloat(styles.opacity || '1') < 0.02;
      })()
      && document.documentElement.dataset.absBootState !== 'booting'
    ),
    { timeout: WAIT_MS, polling: STRICT_RAF ? 'raf' : 50 },
  );
}

async function waitForReady(page, selector) {
  await page.waitForSelector(selector, { timeout: WAIT_MS, state: 'attached' });
  await waitForIdle(page);
}

async function readFrame(page) {
  return page.evaluate(() => {
    const rectOf = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const styles = getComputedStyle(element);
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        opacity: Number.parseFloat(styles.opacity || '1'),
        visibility: styles.visibility,
        display: styles.display,
      };
    };
    const sim = rectOf('#simulations');
    const band = rectOf('[data-button-bar]') || rectOf('[data-shell-bottom-band]');
    const activeTab = document.querySelector('[data-route-tab][aria-current="page"]');
    return {
      timestampMs: performance.now(),
      path: location.pathname,
      phase: document.documentElement.dataset.absTransitionPhase || 'idle',
      wake: document.documentElement.dataset.absInstrumentWake || '',
      activeRoute: activeTab?.getAttribute('data-route-tab') || '',
      activeTabRect: activeTab ? rectOf(`[data-route-tab="${activeTab.getAttribute('data-route-tab')}"]`) : null,
      tabCount: document.querySelectorAll('[data-route-tab]').length,
      oldActiveModals: document.querySelectorAll('#contact-modal.active, #cv-modal.active, #portfolio-modal.active').length,
      sim,
      band,
      windowAboveBand: Boolean(sim && band && sim.bottom <= band.top + 1),
      bandVisible: Boolean(band && band.height >= 48 && band.opacity > 0.9 && band.visibility !== 'hidden' && band.display !== 'none'),
    };
  });
}

async function clickRouteTab(page, routeId) {
  await page.locator(`[data-route-tab="${routeId}"]`).click({ timeout: WAIT_MS });
}

async function captureCheckpoint(page, label, checkpoint) {
  const frame = await readFrame(page);
  const screenshotPath = resolve(outputRoot, `${label}-${checkpoint}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: false });
  return { label, checkpoint, screenshotPath, frame };
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const browserType = BROWSERS[BROWSER_NAME] || chromium;
  const browser = await browserType.launch();
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    reducedMotion: REDUCED_MOTION ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => {
    pageErrors.push(String(error?.stack || error));
  });

  const results = [];
  try {
    await page.goto(routeUrl('/index.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForReady(page, '#c');
    results.push(await captureCheckpoint(page, 'home-initial', 'settled'));

    for (const step of ROUTE_STEPS) {
      await clickRouteTab(page, step.id);
      const inFlight = await captureCheckpoint(page, `${step.id}`, 'in-flight');
      assert(inFlight.frame.activeRoute === step.id, `Active tab did not lead transition for ${step.id}`, inFlight);
      assert(inFlight.frame.bandVisible, `Bottom band hidden during ${step.id} transition`, inFlight);
      assert(inFlight.frame.windowAboveBand, `Window overlapped bottom band during ${step.id} transition`, inFlight);
      await waitForReady(page, step.ready);
      const settled = await captureCheckpoint(page, `${step.id}`, 'settled');
      assert(settled.frame.path === step.href, `Route path mismatch after ${step.id}`, settled);
      assert(settled.frame.phase === 'idle' && settled.frame.wake === '', `Transition did not settle to idle for ${step.id}`, settled);
      assert(settled.frame.activeRoute === step.id, `Active tab mismatch after ${step.id}`, settled);
      assert(settled.frame.tabCount >= 4, `Route tabs missing after ${step.id}`, settled);
      assert(settled.frame.oldActiveModals === 0, `Removed modal opened during ${step.id}`, settled);
      assert(settled.frame.bandVisible && settled.frame.windowAboveBand, `Shell geometry failed after ${step.id}`, settled);
      results.push(inFlight, settled);
    }
  } finally {
    await writeFile(resolve(outputRoot, `transition-flows-${BROWSER_NAME}${STRICT_RAF ? '-strict' : ''}${REDUCED_MOTION ? '-reduced' : ''}.json`), `${JSON.stringify({ results, consoleErrors, pageErrors }, null, 2)}\n`);
    await browser.close();
  }

  assert(pageErrors.length === 0, 'Page errors were reported during transition audit', pageErrors);
  assert(consoleErrors.length === 0, 'Console errors were reported during transition audit', consoleErrors);
  console.log(JSON.stringify({ browser: BROWSER_NAME, strict: STRICT_RAF, reducedMotion: REDUCED_MOTION, checkpoints: results.length, outputRoot }, null, 2));
  console.error(`PASS: transition route-flow audit passed in ${BROWSER_NAME}${STRICT_RAF ? ' strict RAF' : ''}${REDUCED_MOTION ? ' reduced motion' : ''}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
