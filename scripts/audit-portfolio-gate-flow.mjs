#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 30000);
const INVITE_CODE = process.env.ABS_PORTFOLIO_CODE || '739284';
const __dirname = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(__dirname, '..', 'output', 'playwright', 'portfolio-gate-audit');

function origin() {
  return new URL(String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8013')).origin;
}

function url(pathname) {
  return new URL(pathname, origin()).toString();
}

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

async function waitForIdle(page) {
  await page.waitForFunction(
    () => (
      (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
      && (() => {
        const overlay = document.getElementById('abs-boot-overlay');
        if (!overlay) return true;
        const styles = getComputedStyle(overlay);
        return styles.display === 'none' || styles.visibility === 'hidden' || Number.parseFloat(styles.opacity || '1') < 0.02;
      })()
      && document.documentElement.dataset.absBootState !== 'booting'
    ),
    { timeout: WAIT_MS, polling: 50 },
  );
}

async function waitForCanvasBuffer(page) {
  await page.waitForFunction(
    () => {
      const canvas = document.getElementById('c');
      if (!canvas) return false;
      const cssWidth = canvas.clientWidth || 0;
      const cssHeight = canvas.clientHeight || 0;
      if (cssWidth < 64 || cssHeight < 64) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      return canvas.width >= Math.floor(cssWidth * dpr) && canvas.height >= Math.floor(cssHeight * dpr);
    },
    { timeout: WAIT_MS },
  );
}

async function readState(page) {
  return page.evaluate(() => {
    const styleOf = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const styles = getComputedStyle(element);
      return {
        zIndex: Number.parseInt(styles.zIndex || '0', 10) || 0,
        opacity: Number.parseFloat(styles.opacity || '0'),
        visibility: styles.visibility,
        pointerEvents: styles.pointerEvents,
      };
    };
    const rectOf = (selector) => {
      const element = document.querySelector(selector);
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
    const sim = rectOf('#simulations');
    const band = rectOf('[data-button-bar]') || rectOf('[data-shell-bottom-band]');
    const host = rectOf('#portfolio-sheet-host');
    return {
      path: location.pathname,
      search: location.search,
      phase: document.documentElement.dataset.absTransitionPhase || 'idle',
      wake: document.documentElement.dataset.absInstrumentWake || '',
      bodyClass: document.body.className,
      activeTab: document.querySelector('[data-route-tab][aria-current="page"]')?.getAttribute('data-route-tab') || '',
      lockedGate: Boolean(document.querySelector('[data-route-content="portfolio-gate"]')),
      teaser: Boolean(document.querySelector('[data-portfolio-gate-teaser]')),
      teaserFocusableCount: document.querySelectorAll('[data-portfolio-gate-teaser] a, [data-portfolio-gate-teaser] button, [data-portfolio-gate-teaser] input, [data-portfolio-gate-teaser] [tabindex]').length,
      deck: Boolean(document.getElementById('portfolioProjectMount')),
      labels: document.querySelectorAll('.portfolio-project-label, .portfolio-deck-card').length,
      oldPortfolioModal: Boolean(document.querySelector('#portfolio-modal.active')),
      cookie: document.cookie,
      sessionAccess: sessionStorage.getItem('abs_portfolio_ok'),
      sim,
      band,
      host,
      windowBlur: styleOf('#window-overlay-blur-layer'),
      windowContent: styleOf('#window-overlay-content-layer'),
      wallEdge: styleOf('.inner-wall-gradient-edge'),
      geometryOk: Boolean(
        sim
        && band
        && host
        && sim.bottom <= band.top + 1
        && host.top >= sim.top - 1
        && host.left >= sim.left - 1
        && host.right <= sim.right + 1
        && host.bottom <= sim.bottom + 1
      ),
    };
  });
}

async function fillGate(page) {
  await page.waitForSelector('[data-route-content="portfolio-gate"] .portfolio-digit', { timeout: WAIT_MS });
  const inputs = await page.locator('[data-route-content="portfolio-gate"] .portfolio-digit').all();
  assert(inputs.length >= INVITE_CODE.length, 'Portfolio gate did not render enough digits', { count: inputs.length });
  for (let index = 0; index < INVITE_CODE.length; index += 1) {
    await inputs[index].fill(INVITE_CODE[index]);
  }
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  const results = {};
  try {
    await context.clearCookies();
    await page.goto(url('/portfolio.html?gate=portfolio'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    results.lockedInitial = await readState(page);
    assert(results.lockedInitial.path === '/portfolio.html' && results.lockedInitial.search === '', 'Portfolio gate URL was not normalized', results.lockedInitial);
    assert(results.lockedInitial.activeTab === 'portfolio' && results.lockedInitial.lockedGate, 'Locked Portfolio route did not show in-window gate', results.lockedInitial);
    assert(results.lockedInitial.teaser && !results.lockedInitial.deck && results.lockedInitial.labels === 0, 'Locked Portfolio did not use the static teaser-only route', results.lockedInitial);
    assert(results.lockedInitial.teaserFocusableCount === 0, 'Portfolio teaser exposed focusable content', results.lockedInitial);
    assert(
      results.lockedInitial.windowContent?.zIndex < results.lockedInitial.wallEdge?.zIndex
        && results.lockedInitial.windowBlur?.zIndex < results.lockedInitial.wallEdge?.zIndex,
      'Portfolio gate is not stacked below the live wall edge',
      results.lockedInitial,
    );
    assert(results.lockedInitial.geometryOk, 'Locked Portfolio window geometry does not align with bottom shell band', results.lockedInitial);

    await page.screenshot({ path: resolve(outputRoot, 'portfolio-locked.png'), fullPage: false });
    await page.evaluate(() => {
      document.getElementById('window-overlay-blur-layer')?.remove();
      document.getElementById('window-overlay-content-layer')?.remove();
    });
    const uncovered = await readState(page);
    assert(uncovered.teaser && !uncovered.deck && uncovered.labels === 0, 'Removing the gate overlay exposed live Portfolio content', uncovered);

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    await fillGate(page);
    await page.waitForSelector('#portfolioProjectMount', { timeout: WAIT_MS });
    await waitForCanvasBuffer(page);
    await waitForIdle(page);
    results.unlocked = await readState(page);
    assert(results.unlocked.deck && results.unlocked.labels > 0, 'Portfolio did not unlock to deck content', results.unlocked);
    assert(results.unlocked.cookie.includes('abs_portfolio_ok='), 'Portfolio unlock did not write abs_portfolio_ok cookie', results.unlocked);
    assert(results.unlocked.geometryOk, 'Unlocked Portfolio window geometry does not align with bottom shell band', results.unlocked);
    assert(!results.unlocked.oldPortfolioModal, 'Old Portfolio modal opened during route gate flow', results.unlocked);
    await page.screenshot({ path: resolve(outputRoot, 'portfolio-unlocked.png'), fullPage: false });

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#portfolioProjectMount', { timeout: WAIT_MS });
    await waitForCanvasBuffer(page);
    await waitForIdle(page);
    results.reloadUnlocked = await readState(page);
    assert(results.reloadUnlocked.deck && !results.reloadUnlocked.lockedGate, 'Portfolio cookie did not persist unlocked state across reload', results.reloadUnlocked);

    await context.clearCookies();
    await page.evaluate(() => {
      sessionStorage.removeItem('abs_portfolio_ok');
      localStorage.removeItem('abs_portfolio_ok');
    });
    await page.goto(url('/portfolio.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    results.resetLocked = await readState(page);
    assert(results.resetLocked.lockedGate && !results.resetLocked.deck, 'Clearing site storage did not return Portfolio to locked gate', results.resetLocked);
  } finally {
    await writeFile(resolve(outputRoot, 'portfolio-gate-audit.json'), `${JSON.stringify(results, null, 2)}\n`);
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
  console.error(`PASS: Portfolio in-window gate, cookie persistence, and reset flow passed (${outputRoot})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
