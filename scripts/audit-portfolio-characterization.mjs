#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

import {
  assertPortfolioCleanupSnapshot,
  assertPortfolioDomContractSnapshot,
  assertPortfolioFocusSnapshot,
  assertPortfolioReadySnapshot,
} from './lib/portfolio-characterization-contract.mjs';
import { PORTFOLIO_DOM_CONTRACT } from '../react-app/app/src/legacy/modules/portfolio/portfolio-dom-contract.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(await readFile(
  resolve(__dirname, 'fixtures', 'portfolio-hotspot-characterization.json'),
  'utf8',
));
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
if (!['chromium', 'webkit'].includes(browserName)) {
  throw new Error(`Unsupported ABS_BROWSER "${browserName}". Expected chromium or webkit.`);
}
const browserType = browserName === 'webkit' ? webkit : chromium;
const timeoutMs = Number(process.env.ABS_PORTFOLIO_CHARACTERIZATION_TIMEOUT_MS || 30000);
const origin = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').replace(/\/+$/, '');
const caseName = String(process.env.ABS_PORTFOLIO_CHARACTERIZATION_CASE || 'all').toLowerCase();
if (!['all', 'direct', 'spa'].includes(caseName)) {
  throw new Error(`Unsupported ABS_PORTFOLIO_CHARACTERIZATION_CASE "${caseName}". Expected all, direct, or spa.`);
}

async function installAccess(page) {
  await page.addInitScript(() => {
    document.cookie = 'abs_portfolio_ok=1; Path=/; SameSite=Lax; Max-Age=31536000';
    sessionStorage.setItem('abs_portfolio_ok', 'm11-characterization');
  });
}

async function activateRouteTab(page, routeId) {
  const tab = page.locator(`[data-route-tab="${routeId}"]`);
  if (await tab.getAttribute('aria-current') === 'page') {
    throw new Error(`Route tab ${routeId} was already current before activation.`);
  }
  await tab.evaluate((node) => node.click());
}

async function waitForPortfolio(page) {
  await page.waitForFunction((contract) => (
    window.location.pathname === '/portfolio.html'
    && document.body.getAttribute(contract.state.bodyLoadState) === 'loaded'
    && (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
    && Boolean(window.__ABS_PORTFOLIO_AUDIT__?.getApp?.())
    && !window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.destroyed
    && document.querySelectorAll(contract.deck.activeCard).length === 1
    && !document.querySelector(contract.deck.mount)?.hasAttribute('aria-busy')
    && document.querySelector('[data-route-tab="portfolio"]')?.getAttribute('aria-current') === 'page'
    && !document.querySelector('[data-route-tabs]')?.dataset?.pendingRoute
  ), PORTFOLIO_DOM_CONTRACT, { timeout: timeoutMs });
  let stable = false;
  for (let attempt = 0; attempt < 5 && !stable; attempt += 1) {
    stable = await page.evaluate(() => new Promise((resolveStable) => {
      const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
      window.setTimeout(() => {
        resolveStable(Boolean(
          app
          && !app.destroyed
          && window.__ABS_PORTFOLIO_AUDIT__?.getApp?.() === app
        ));
      }, 400);
    }));
  }
  if (!stable) throw new Error('Portfolio app identity did not stabilize after readiness.');
}

async function waitForInitialHome(page) {
  try {
    await page.waitForFunction(() => {
      const root = document.documentElement;
      const runtime = window.__ABS_RUNTIME_LIFECYCLE__;
      const routeTabs = document.querySelector('[data-route-tabs]');
      const routeRuntimeReady = runtime?.status === 'ready'
        || (
          root.dataset.absDailyFocusStatus === 'ready'
          && root.dataset.absHomeSimulationReady === 'true'
        );
      return (
        window.location.pathname === '/index.html'
        && root.dataset.shellRoute === 'home'
        && (root.dataset.absTransitionPhase || 'idle') === 'idle'
        && root.dataset.absBootState === 'ready'
        && !document.getElementById('abs-boot-overlay')
        && routeRuntimeReady
        && document.querySelector('[data-route-tab="home"]')?.getAttribute('aria-current') === 'page'
        && !routeTabs?.dataset?.pendingRoute
      );
    }, null, { timeout: timeoutMs });
  } catch (error) {
    const state = await page.evaluate(() => ({
      path: window.location.pathname,
      shellRoute: document.documentElement.dataset.shellRoute || '',
      transitionPhase: document.documentElement.dataset.absTransitionPhase || 'idle',
      bootState: document.documentElement.dataset.absBootState || '',
      bootOverlayPresent: Boolean(document.getElementById('abs-boot-overlay')),
      runtime: window.__ABS_RUNTIME_LIFECYCLE__ || null,
      dailyFocusStatus: document.documentElement.dataset.absDailyFocusStatus || '',
      homeSimulationReady: document.documentElement.dataset.absHomeSimulationReady || '',
      currentTab: document.querySelector('[data-route-tab][aria-current="page"]')?.dataset?.routeTab || '',
      pendingRoute: document.querySelector('[data-route-tabs]')?.dataset?.pendingRoute || '',
    }));
    throw new Error(`Initial Home route did not settle before SPA characterization: ${JSON.stringify(state)}`, {
      cause: error,
    });
  }
}

async function readReadySnapshot(page) {
  return page.evaluate((contract) => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    const mount = document.querySelector(contract.deck.mount);
    const drawer = document.querySelector(contract.drawer.view);
    return {
      path: window.location.pathname,
      loadState: document.body.getAttribute(contract.state.bodyLoadState),
      booting: document.documentElement.classList.contains('portfolio-booting'),
      loaded: document.documentElement.classList.contains('portfolio-loaded'),
      transitionPhase: document.documentElement.dataset.absTransitionPhase || 'idle',
      auditAppReady: Boolean(app),
      projectCount: app?.projects?.length || 0,
      activeCardCount: document.querySelectorAll(contract.deck.activeCard).length,
      labelCount: document.querySelectorAll(contract.deck.label).length,
      drawerCount: document.querySelectorAll(contract.drawer.view).length,
      drawerHidden: drawer?.getAttribute('aria-hidden') || null,
      mountBusy: mount?.getAttribute('aria-busy') || null,
      bootstrapStages: (window.__ABS_PORTFOLIO_BOOTSTRAP__?.stages || []).map((stage) => stage.name),
    };
  }, PORTFOLIO_DOM_CONTRACT);
}

async function readDomContractSnapshot(page) {
  return page.evaluate((contract) => {
    const mount = document.querySelector(contract.deck.mount);
    const activeCards = Array.from(document.querySelectorAll(contract.deck.activeCard));
    return {
      routeNodeCounts: Object.fromEntries(
        Object.entries(contract.route).map(([name, selector]) => [name, document.querySelectorAll(selector).length])
      ),
      mountCount: document.querySelectorAll(contract.deck.mount).length,
      stageCount: document.querySelectorAll(contract.deck.stage).length,
      cardCount: document.querySelectorAll(contract.deck.card).length,
      activeCardCount: activeCards.length,
      labelCount: document.querySelectorAll(contract.deck.label).length,
      drawerHostCount: document.querySelectorAll(contract.drawer.host).length,
      drawerViewCount: document.querySelectorAll(contract.drawer.view).length,
      loadState: document.body.getAttribute(contract.state.bodyLoadState),
      entrancePhase: mount?.getAttribute(contract.state.entrancePhase) || '',
      entranceReason: mount?.getAttribute(contract.state.entranceReason) || '',
      mediaReady: mount?.getAttribute(contract.state.mediaReady) || '',
      activeProjectMarkersValid: activeCards.every((card) => card.hasAttribute(contract.state.activeProject)),
    };
  }, PORTFOLIO_DOM_CONTRACT);
}

async function assertKeyboardFocusReturn(page) {
  const activeCard = page.locator(PORTFOLIO_DOM_CONTRACT.deck.activeCard);
  const expectedProjectIndex = Number(await activeCard.getAttribute(PORTFOLIO_DOM_CONTRACT.state.activeProject));
  try {
    await page.waitForFunction(({ projectIndex, contract }) => {
      const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
      return Boolean(document.querySelector(`${contract.deck.activeCard}[${contract.state.activeProject}="${projectIndex}"]`))
        && !document.querySelector(contract.deck.stage)?.inert
        && !app?.isProjectOpen
        && !app?.pendingProjectIntent;
    }, { projectIndex: expectedProjectIndex, contract: PORTFOLIO_DOM_CONTRACT }, { timeout: timeoutMs });
  } catch (error) {
    const state = await page.evaluate(({ projectIndex, contract }) => {
      const card = document.querySelector(`${contract.deck.activeCard}[${contract.state.activeProject}="${projectIndex}"]`);
      const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
      return {
        activeTag: document.activeElement?.tagName || '',
        activeClass: document.activeElement?.className || '',
        cardFound: Boolean(card),
        cardIsActiveElement: document.activeElement === card,
        deckInert: Boolean(document.querySelector(contract.deck.stage)?.inert),
        mountInert: Boolean(document.querySelector(contract.deck.mount)?.inert),
        isProjectOpen: Boolean(app?.isProjectOpen),
        pendingProjectIntent: Boolean(app?.pendingProjectIntent),
      };
    }, { projectIndex: expectedProjectIndex, contract: PORTFOLIO_DOM_CONTRACT });
    throw new Error(`Portfolio keyboard input did not become ready: ${JSON.stringify(state)}`, { cause: error });
  }
  let focusStable = false;
  for (let attempt = 0; attempt < 20 && !focusStable; attempt += 1) {
    await activeCard.focus();
    focusStable = await page.evaluate(({ projectIndex, contract }) => new Promise((resolveFocus) => {
      requestAnimationFrame(() => requestAnimationFrame(() => {
        const card = document.querySelector(`${contract.deck.activeCard}[${contract.state.activeProject}="${projectIndex}"]`);
        resolveFocus(document.activeElement === card);
      }));
    }), { projectIndex: expectedProjectIndex, contract: PORTFOLIO_DOM_CONTRACT });
  }
  if (!focusStable) throw new Error('Portfolio route focus management did not release the active project card.');
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => (
    window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.projectOpenPhase === 'open'
    && document.activeElement?.classList?.contains('portfolio-project-view__back--top')
  ), null, { timeout: timeoutMs });
  await page.keyboard.press('Escape');
  await page.waitForFunction((projectIndex) => (
    !document.body.classList.contains('portfolio-project-open')
    && Number(document.activeElement?.dataset?.projectIndex) === projectIndex
  ), expectedProjectIndex, { timeout: timeoutMs });
  const snapshot = await page.evaluate(({ projectIndex, contract }) => ({
    drawerOpen: document.body.classList.contains('portfolio-project-open'),
    deckInert: Boolean(document.querySelector(contract.deck.stage)?.inert),
    focusedProjectIndex: Number(document.activeElement?.dataset?.projectIndex),
    expectedProjectIndex: projectIndex,
  }), { projectIndex: expectedProjectIndex, contract: PORTFOLIO_DOM_CONTRACT });
  assertPortfolioFocusSnapshot(snapshot);
}

async function runDirect(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await installAccess(page);
  await page.goto(`${origin}/portfolio.html`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await waitForPortfolio(page);
  const ready = await readReadySnapshot(page);
  assertPortfolioReadySnapshot(ready, fixture);
  assertPortfolioDomContractSnapshot(await readDomContractSnapshot(page), ready.projectCount);
  await assertKeyboardFocusReturn(page);
  await page.close();
}

async function runSpa(browser) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await installAccess(page);
  await page.goto(`${origin}/index.html`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await waitForInitialHome(page);
  await activateRouteTab(page, 'portfolio');
  await waitForPortfolio(page);
  const initialSpaReady = await readReadySnapshot(page);
  assertPortfolioReadySnapshot(initialSpaReady, fixture, { spa: true });
  assertPortfolioDomContractSnapshot(await readDomContractSnapshot(page), initialSpaReady.projectCount);

  await page.evaluate(() => {
    window.__M11_ROUTE_EVENTS__ = [];
    window.addEventListener('abs:route-ready', (event) => {
      window.__M11_ROUTE_EVENTS__.push({ type: 'ready', detail: { ...(event.detail || {}) } });
    });
    window.addEventListener('abs:route-failed', (event) => {
      window.__M11_ROUTE_EVENTS__.push({ type: 'failed', detail: { ...(event.detail || {}) } });
    });
    window.__M11_DOCUMENT__ = document;
    window.__M11_PREVIOUS_PORTFOLIO_APP__ = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.() || null;
  });
  await activateRouteTab(page, 'home');
  try {
    await page.waitForFunction(() => (
      window.location.pathname === '/index.html'
      && document.documentElement.dataset.shellRoute === 'home'
      && (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
      && document.querySelector('[data-route-tab="home"]')?.getAttribute('aria-current') === 'page'
      && !document.querySelector('[data-route-tabs]')?.dataset?.pendingRoute
      && !window.__ABS_PORTFOLIO_AUDIT__
      && Boolean(window.__M11_PREVIOUS_PORTFOLIO_APP__?.destroyed)
    ), null, { timeout: timeoutMs });
  } catch (error) {
    const state = await page.evaluate(() => ({
      path: window.location.pathname,
      renderedRoute: document.querySelector('[data-shell-route-view]')?.getAttribute('data-shell-route-view') || '',
      shellRoute: document.documentElement.dataset.shellRoute || '',
      transitionPhase: document.documentElement.dataset.absTransitionPhase || 'idle',
      auditBridgePresent: Boolean(window.__ABS_PORTFOLIO_AUDIT__),
      previousDestroyed: Boolean(window.__M11_PREVIOUS_PORTFOLIO_APP__?.destroyed),
      routeEvents: window.__M11_ROUTE_EVENTS__ || [],
    }));
    throw new Error(`Portfolio SPA cleanup did not settle: ${JSON.stringify(state)}`, { cause: error });
  }
  const cleanup = await page.evaluate((contract) => ({
    path: window.location.pathname,
    auditBridgePresent: Boolean(window.__ABS_PORTFOLIO_AUDIT__),
    previousAppDestroyed: Boolean(window.__M11_PREVIOUS_PORTFOLIO_APP__?.destroyed),
    loadState: document.body.getAttribute(contract.state.bodyLoadState),
    portfolioPage: document.body.classList.contains('portfolio-page'),
    portfolioOpen: document.body.classList.contains('portfolio-project-open'),
    mountCount: document.querySelectorAll(contract.deck.mount).length,
    drawerCount: document.querySelectorAll(contract.drawer.view).length,
    documentIdentityStable: window.__M11_DOCUMENT__ === document,
  }), PORTFOLIO_DOM_CONTRACT);
  assertPortfolioCleanupSnapshot(cleanup);

  await activateRouteTab(page, 'portfolio');
  await waitForPortfolio(page);
  const remount = await page.evaluate(() => ({
    previousDestroyed: Boolean(window.__M11_PREVIOUS_PORTFOLIO_APP__?.destroyed),
    identityChanged: window.__M11_PREVIOUS_PORTFOLIO_APP__ !== window.__ABS_PORTFOLIO_AUDIT__?.getApp?.(),
  }));
  if (!remount.previousDestroyed || !remount.identityChanged) {
    throw new Error(`Portfolio SPA remount identity contract failed: ${JSON.stringify(remount)}`);
  }
  const remountReady = await readReadySnapshot(page);
  assertPortfolioReadySnapshot(remountReady, fixture, { spa: true });
  assertPortfolioDomContractSnapshot(await readDomContractSnapshot(page), remountReady.projectCount);
  await assertKeyboardFocusReturn(page);
  await page.close();
}

const browser = await browserType.launch();
try {
  if (caseName === 'all' || caseName === 'direct') await runDirect(browser);
  if (caseName === 'all' || caseName === 'spa') await runSpa(browser);
  console.log(`Portfolio characterization passed (${browserName}: ${caseName}).`);
} finally {
  await browser.close();
}
