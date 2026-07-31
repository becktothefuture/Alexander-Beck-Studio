#!/usr/bin/env node
import { chromium, firefox, webkit } from 'playwright';

const DEFAULT_URL = 'http://127.0.0.1:8013';
const WAIT_MS = Number(process.env.ABS_MODAL_UNIFIED_WAIT_MS || 30000);
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const VIEWPORTS = Object.freeze([
  { name: 'mobile', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1280, height: 900 },
]);
const DESKTOP_MODAL_BLUR_PX = 13.2;
const MOBILE_MODAL_BLUR_PX = 24;

const BROWSERS = { chromium, firefox, webkit };

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

function readBlurPx(value) {
  const match = String(value || '').match(/blur\(([\d.]+)px\)/i);
  return match ? Number(match[1]) : 0;
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
        display: styles.display,
        zIndex: Number.parseInt(styles.zIndex || '0', 10) || 0,
        opacity: Number.parseFloat(styles.opacity || '0'),
        visibility: styles.visibility,
        pointerEvents: styles.pointerEvents,
        backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter || 'none',
        backgroundImage: styles.backgroundImage,
      };
    };
    const footerStyleOf = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const styles = getComputedStyle(element);
      return {
        display: styles.display,
        position: styles.position,
        paddingBlock: styles.paddingBlock,
        paddingInline: styles.paddingInline,
        marginBlock: styles.marginBlock,
        marginInline: styles.marginInline,
        gap: styles.gap,
        fontFamily: styles.fontFamily,
        fontSize: styles.fontSize,
        lineHeight: styles.lineHeight,
        alignItems: styles.alignItems,
        justifyContent: styles.justifyContent,
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
    const simulationList = document.querySelector('.simulation-focus-list');
    const simulationListStyles = simulationList ? getComputedStyle(simulationList) : null;
    return {
      path: location.pathname,
      search: location.search,
      phase: document.documentElement.dataset.absTransitionPhase || 'idle',
      shellRoute: document.documentElement.dataset.shellRoute || '',
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
      noiseReady: document.documentElement.classList.contains('noise-ready')
        || document.body.classList.contains('noise-ready'),
      noiseLayer: styleOf('.noise'),
      noiseTexture: getComputedStyle(document.documentElement).getPropertyValue('--abs-noise-texture').trim(),
      chooserActive: Boolean(document.querySelector('.simulation-focus-modal.active')),
      simulationList: simulationListStyles ? {
        columnCount: simulationListStyles.gridTemplateColumns.split(' ').filter(Boolean).length,
        width: simulationListStyles.width,
      } : null,
      blurActive: Boolean(document.getElementById('modal-blur-layer')?.classList.contains('active')),
      contentActive: Boolean(document.getElementById('modal-content-layer')?.classList.contains('active')),
      windowBlur: styleOf('#window-overlay-blur-layer'),
      windowContent: styleOf('#window-overlay-content-layer'),
      windowContentRect: rectOf('#window-overlay-content-layer'),
      wallEdge: styleOf('.inner-wall-gradient-edge'),
      globalBlur: styleOf('#modal-blur-layer'),
      footer: {
        container: rectOf('.ui-bottom'),
        socials: rectOf('#social-links'),
        london: rectOf('#site-year'),
        middle: rectOf('#edge-caption'),
        styles: {
          container: footerStyleOf('.ui-bottom'),
          socials: footerStyleOf('#social-links'),
          london: footerStyleOf('#site-year'),
          middle: footerStyleOf('#edge-caption'),
        },
      },
    };
  });
}

function assertShellTabs(state, expectedRoute) {
  assert(state.tabs.length >= 4, 'Missing bottom shell route tabs', state);
  const active = state.tabs.filter((tab) => tab.current === 'page').map((tab) => tab.route);
  assert(active.length === 1 && active[0] === expectedRoute, `Unexpected active route tab for ${expectedRoute}`, { active, state });
  assert(state.shellRoute === expectedRoute, `Unexpected shell route identity for ${expectedRoute}`, state);
  assert(state.activeOldModalCount === 0, 'Removed Contact/CV/Portfolio modal opened unexpectedly', state);
}

async function openAndAssert(
  browser,
  path,
  expectedRoute,
  predicate,
  viewport = VIEWPORTS[2],
  { expectNoise = true } = {},
) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  await page.goto(routeUrl(path), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForIdle(page);
  const state = await readRouteState(page);
  assertShellTabs(state, expectedRoute);
  if (expectNoise) {
    assert(
      state.noiseReady
        && state.noiseLayer?.visibility === 'visible'
        && state.noiseLayer?.display !== 'none'
        && state.noiseLayer?.opacity > 0
        && state.noiseTexture
        && state.noiseTexture !== 'none',
      `Shared shell noise is not active for ${path}`,
      state,
    );
  }
  assert(predicate(state), `Route assertion failed for ${path}`, state);
  await page.close();
  return state;
}

async function assertSimulationChooser(browser, viewport) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  await page.goto(routeUrl('/index.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await waitForIdle(page);
  await page.locator('.simulation-focus-switcher').click({ timeout: WAIT_MS });
  await page.waitForSelector('.simulation-focus-modal.active', { timeout: WAIT_MS });
  await page.waitForFunction(
    () => Number.parseFloat(getComputedStyle(document.getElementById('window-overlay-blur-layer')).opacity || '0') > 0.9,
    { timeout: WAIT_MS, polling: 50 },
  );
  const expectedBlur = viewport.name === 'mobile' ? MOBILE_MODAL_BLUR_PX : DESKTOP_MODAL_BLUR_PX;
  await page.waitForFunction((expected) => {
    const styles = getComputedStyle(document.getElementById('window-overlay-blur-layer'));
    const value = styles.backdropFilter || styles.webkitBackdropFilter || '';
    const match = value.match(/blur\(([\d.]+)px\)/i);
    const blur = match ? Number(match[1]) : 0;
    return Math.abs(blur - expected) <= 0.01;
  }, expectedBlur, { timeout: WAIT_MS, polling: 50 });
  const openState = await readRouteState(page);
  assert(openState.phase === 'modal-open', 'Simulation chooser did not set modal-open phase', openState);
  assert(openState.chooserActive && openState.blurActive && openState.contentActive, 'Simulation chooser modal layers are not active', openState);
  assert(openState.windowBlur?.opacity > 0.9 && openState.windowContent?.pointerEvents === 'auto', 'Simulation chooser did not activate the in-window overlay', openState);
  const expectedColumnCount = viewport.name === 'mobile' ? 1 : 2;
  assert(
    openState.simulationList?.columnCount === expectedColumnCount,
    `Simulation chooser did not resolve to ${expectedColumnCount} column(s) on ${viewport.name}`,
    openState,
  );
  assert(
    Math.abs(readBlurPx(openState.windowBlur?.backdropFilter) - expectedBlur) <= 0.01,
    `Simulation chooser blur did not resolve to ${expectedBlur}px on ${viewport.name}`,
    openState,
  );
  assert(
    openState.windowBlur.zIndex < openState.windowContent?.zIndex
      && openState.windowContent?.pointerEvents === 'auto',
    'Simulation chooser overlay layers are not stacked correctly',
    openState,
  );
  assert(
    openState.windowContentRect?.width > 0
      && openState.windowContentRect?.height > 0,
    'In-window modal geometry is invalid',
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
  await page.waitForFunction(
    () => {
      const contentVisibility = getComputedStyle(document.getElementById('window-overlay-content-layer')).visibility;
      return contentVisibility === 'hidden';
    },
    { timeout: WAIT_MS, polling: 50 },
  );
  const closedState = await readRouteState(page);
  assert(
    !closedState.chooserActive
      && !closedState.blurActive
      && !closedState.contentActive
      && closedState.windowContent?.opacity === 0
      && closedState.windowContent?.pointerEvents === 'none',
    'Simulation chooser did not close cleanly',
    closedState,
  );
  await page.close();
  return { openState, closedState };
}

async function main() {
  const browserType = BROWSERS[BROWSER_NAME] || chromium;
  const browser = await browserType.launch();
  const results = {};
  try {
    results.routeBreakpoints = {};
    for (const viewport of VIEWPORTS) {
      const states = {
        home: await openAndAssert(browser, '/index.html', 'home', () => true, viewport),
        contact: await openAndAssert(browser, '/contact.html', 'contact', (state) => state.contactRoute, viewport),
        about: await openAndAssert(browser, '/about.html', 'about', (state) => state.aboutRoute, viewport),
        portfolio: await openAndAssert(
          browser,
          '/portfolio.html',
          'portfolio',
          (state) => state.path === '/portfolio.html' && state.search === '' && state.portfolioDeck,
          viewport,
        ),
      };
      results.routeBreakpoints[viewport.name] = states;
      for (const key of ['container', 'socials', 'london', 'middle']) {
        assert(states.home.footer[key], `Home footer ${key} is missing on ${viewport.name}`, states.home);
        for (const routeId of ['contact', 'about', 'portfolio']) {
          assert(
            states[routeId].footer[key] === null,
            `Home-only footer ${key} unexpectedly renders on ${routeId} at ${viewport.name}`,
            states[routeId],
          );
        }
      }
    }
    results.simulationChooser = {
      desktop: await assertSimulationChooser(browser, VIEWPORTS[2]),
      tablet: await assertSimulationChooser(browser, VIEWPORTS[1]),
      mobile: await assertSimulationChooser(browser, VIEWPORTS[0]),
    };
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
