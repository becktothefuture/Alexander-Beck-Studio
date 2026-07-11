#!/usr/bin/env node
import { chromium, firefox, webkit } from 'playwright';

const DEFAULT_URL = 'http://127.0.0.1:8013';
const WAIT_MS = Number(process.env.ABS_MODAL_UNIFIED_WAIT_MS || 30000);
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();

const BROWSERS = { chromium, firefox, webkit };

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

function resolveOrigin() {
  const raw = String(process.env.ABS_DEV_URL || DEFAULT_URL).trim() || DEFAULT_URL;
  return new URL(raw).origin;
}

function routeUrl(pathname = '/index.html') {
  return new URL(pathname, resolveOrigin()).toString();
}

async function waitForIdle(page) {
  await page.waitForFunction(
    () => (
      Boolean(document.querySelector('[data-sfid^="sfid:shell/"], [data-route-tab]'))
      &&
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

async function readRouteState(page) {
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
        backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter || 'none',
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
    return {
      path: location.pathname,
      search: location.search,
      phase: document.documentElement.dataset.absTransitionPhase || 'idle',
      bodyClass: document.body.className,
      tabs: Array.from(document.querySelectorAll('[data-route-tab]')).map((tab) => ({
        route: tab.getAttribute('data-route-tab'),
        current: tab.getAttribute('aria-current') || '',
        text: tab.textContent.trim(),
        rect: rectOf(`[data-route-tab="${tab.getAttribute('data-route-tab')}"]`),
      })),
      oldModalCount: document.querySelectorAll('#contact-modal, #cv-modal, #portfolio-modal').length,
      activeOldModalCount: document.querySelectorAll('#contact-modal.active, #cv-modal.active, #portfolio-modal.active').length,
      contactRoute: Boolean(document.querySelector('[data-route-content="contact"]')),
      aboutRoute: Boolean(document.querySelector('[data-route-content="about"]')),
      portfolioGate: Boolean(document.querySelector('[data-route-content="portfolio-gate"]')),
      portfolioDeck: Boolean(document.getElementById('portfolioProjectMount')),
      chooserActive: Boolean(document.querySelector('.simulation-focus-modal.active')),
      blurActive: Boolean(document.getElementById('modal-blur-layer')?.classList.contains('active')),
      contentActive: Boolean(document.getElementById('modal-content-layer')?.classList.contains('active')),
      windowBlur: styleOf('#window-overlay-blur-layer'),
      windowContent: styleOf('#window-overlay-content-layer'),
      wallInsetShadow: (() => {
        const simulations = document.getElementById('simulations');
        if (!simulations) return null;
        const styles = getComputedStyle(simulations, '::before');
        return { zIndex: Number.parseInt(styles.zIndex || '0', 10) || 0 };
      })(),
      wallEdge: styleOf('.inner-wall-gradient-edge'),
      globalBlur: styleOf('#modal-blur-layer'),
      sessionFlags: {
        contact: sessionStorage.getItem('abs_open_contact_modal'),
        cvGate: sessionStorage.getItem('abs_open_cv_gate'),
        cvModal: sessionStorage.getItem('abs_open_cv_modal'),
        portfolio: sessionStorage.getItem('abs_open_portfolio_modal'),
      },
    };
  });
}

function assertShellTabs(state, expectedRoute) {
  assert(state.tabs.length >= 4, 'Missing bottom shell route tabs', state);
  const active = state.tabs.filter((tab) => tab.current === 'page').map((tab) => tab.route);
  assert(active.length === 1 && active[0] === expectedRoute, `Unexpected active route tab for ${expectedRoute}`, { active, state });
  assert(state.activeOldModalCount === 0, 'Removed Contact/CV/Portfolio modal opened unexpectedly', state);
}

async function openAndAssert(browser, path, expectedRoute, predicate) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(routeUrl(path), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForIdle(page);
  const state = await readRouteState(page);
  assertShellTabs(state, expectedRoute);
  assert(predicate(state), `Route assertion failed for ${path}`, state);
  await page.close();
  return state;
}

async function assertStaleFlag(browser, flag, expectedPath, expectedRoute, predicate) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.addInitScript((flagName) => {
    sessionStorage.setItem(flagName, '1');
  }, flag);
  await page.goto(routeUrl('/index.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForIdle(page);
  const state = await readRouteState(page);
  assert(state.path === expectedPath, `Stale flag ${flag} resolved to wrong path`, state);
  assertShellTabs(state, expectedRoute);
  assert(Object.values(state.sessionFlags).every((value) => value === null), `Stale flag ${flag} was not consumed`, state);
  assert(predicate(state), `Stale flag ${flag} route assertion failed`, state);
  await page.close();
  return state;
}

async function assertSimulationChooser(browser) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(routeUrl('/index.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForIdle(page);
  await page.locator('.simulation-focus-switcher').click({ timeout: WAIT_MS });
  await page.waitForSelector('.simulation-focus-modal.active', { timeout: WAIT_MS });
  await page.waitForFunction(
    () => Number.parseFloat(getComputedStyle(document.getElementById('window-overlay-blur-layer')).opacity || '0') > 0.9,
    { timeout: WAIT_MS, polling: 50 },
  );
  const openState = await readRouteState(page);
  assert(openState.phase === 'modal-open', 'Simulation chooser did not set modal-open phase', openState);
  assert(openState.chooserActive && openState.blurActive && openState.contentActive, 'Simulation chooser modal layers are not active', openState);
  assert(openState.windowBlur?.opacity > 0.9 && openState.windowContent?.pointerEvents === 'auto', 'Simulation chooser did not activate the in-window overlay', openState);
  assert(
    openState.windowBlur.zIndex < openState.wallEdge.zIndex
      && openState.windowContent.zIndex < openState.wallEdge.zIndex,
    'Simulation chooser is not stacked below the live wall edge',
    openState,
  );
  assert(
    openState.windowBlur.zIndex < openState.wallInsetShadow?.zIndex
      && openState.windowContent.zIndex < openState.wallInsetShadow?.zIndex,
    'Simulation chooser is not stacked below the live wall inset shadow',
    openState,
  );
  assert(
    openState.globalBlur?.visibility === 'hidden'
      && openState.globalBlur?.opacity === 0
      && openState.globalBlur?.pointerEvents === 'none',
    'Viewport modal blur still paints above the studio window',
    openState,
  );
  await page.keyboard.press('Escape');
  await waitForIdle(page);
  const closedState = await readRouteState(page);
  assert(!closedState.chooserActive && !closedState.blurActive && !closedState.contentActive, 'Simulation chooser did not close cleanly', closedState);
  await page.close();
  return { openState, closedState };
}

async function main() {
  const browserType = BROWSERS[BROWSER_NAME] || chromium;
  const browser = await browserType.launch();
  const results = {};
  try {
    results.routes = [
      await openAndAssert(browser, '/contact.html', 'contact', (state) => state.contactRoute),
      await openAndAssert(browser, '/about.html', 'about', (state) => state.aboutRoute),
      await openAndAssert(browser, '/cv.html?cv=482916', 'about', (state) => state.path === '/about.html' && state.search === '' && state.aboutRoute),
      await openAndAssert(browser, '/portfolio.html?gate=portfolio', 'portfolio', (state) => state.path === '/portfolio.html' && state.search === '' && state.portfolioGate),
      await openAndAssert(browser, '/index.html?gate=cv', 'about', (state) => state.path === '/about.html' && state.search === '' && state.aboutRoute),
    ];
    results.staleFlags = [
      await assertStaleFlag(browser, 'abs_open_contact_modal', '/contact.html', 'contact', (state) => state.contactRoute),
      await assertStaleFlag(browser, 'abs_open_cv_gate', '/about.html', 'about', (state) => state.aboutRoute),
      await assertStaleFlag(browser, 'abs_open_cv_modal', '/about.html', 'about', (state) => state.aboutRoute),
      await assertStaleFlag(browser, 'abs_open_portfolio_modal', '/portfolio.html', 'portfolio', (state) => state.portfolioGate),
    ];
    results.simulationChooser = await assertSimulationChooser(browser);
  } finally {
    await browser.close();
  }
  console.log(JSON.stringify({ browser: BROWSER_NAME, results }, null, 2));
  console.error(`PASS: route/modal compatibility audit passed in ${BROWSER_NAME}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
