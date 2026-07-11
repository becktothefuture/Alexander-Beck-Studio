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
      blurActive: Boolean(document.getElementById('modal-blur-layer')?.classList.contains('active')),
      contentActive: Boolean(document.getElementById('modal-content-layer')?.classList.contains('active')),
      windowBlur: styleOf('#window-overlay-blur-layer'),
      windowContent: styleOf('#window-overlay-content-layer'),
      windowFinish: styleOf('.studio-window-finish-layer'),
      windowContentRect: rectOf('#window-overlay-content-layer'),
      windowFinishRect: rectOf('.studio-window-finish-layer'),
      windowFinishInset: (() => {
        const finish = document.querySelector('.studio-window-finish-layer');
        if (!finish) return null;
        const styles = getComputedStyle(finish, '::before');
        return { boxShadow: styles.boxShadow };
      })(),
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
    openState.windowBlur.zIndex < openState.windowFinish?.zIndex
      && openState.windowContent.zIndex < openState.windowFinish?.zIndex
      && openState.windowFinish?.opacity > 0.9
      && openState.windowFinish?.visibility === 'visible'
      && openState.windowFinish?.pointerEvents === 'none',
    'Simulation chooser is not stacked below the active window finish',
    openState,
  );
  assert(
    JSON.stringify(openState.windowContentRect) === JSON.stringify(openState.windowFinishRect)
      && openState.windowFinish?.backgroundImage !== 'none'
      && openState.windowFinishInset?.boxShadow !== 'none',
    'Active window finish does not match the modal geometry or visual recipe',
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
      const finishVisibility = getComputedStyle(document.querySelector('.studio-window-finish-layer')).visibility;
      const contentVisibility = getComputedStyle(document.getElementById('window-overlay-content-layer')).visibility;
      return finishVisibility === 'hidden' && contentVisibility === 'hidden';
    },
    { timeout: WAIT_MS, polling: 50 },
  );
  const closedState = await readRouteState(page);
  assert(
    !closedState.chooserActive
      && !closedState.blurActive
      && !closedState.contentActive
      && closedState.windowFinish?.opacity === 0
      && closedState.windowFinish?.pointerEvents === 'none',
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
          '/portfolio.html?gate=portfolio',
          'portfolio',
          (state) => state.path === '/portfolio.html' && state.search === '' && state.portfolioGate,
          viewport,
          { expectNoise: false },
        ),
      };
      results.routeBreakpoints[viewport.name] = states;
      for (const key of ['container', 'socials', 'london']) {
        const baselineRect = JSON.stringify(states.home.footer[key]);
        const baselineStyle = JSON.stringify(states.home.footer.styles[key]);
        for (const routeId of ['contact', 'about', 'portfolio']) {
          assert(
            JSON.stringify(states[routeId].footer[key]) === baselineRect,
            `Shared footer ${key} geometry differs on ${viewport.name}`,
            states,
          );
          assert(
            JSON.stringify(states[routeId].footer.styles[key]) === baselineStyle,
            `Shared footer ${key} styles differ on ${viewport.name}`,
            states,
          );
        }
      }
      assert(states.home.footer.middle && states.contact.footer.middle && states.about.footer.middle, `Standard footer middle caption is missing on ${viewport.name}`, states);
      assert(states.portfolio.footer.middle === null, `Portfolio footer unexpectedly renders the middle caption on ${viewport.name}`, states.portfolio);
    }
    results.aliases = [
      await openAndAssert(browser, '/cv.html?cv=482916', 'about', (state) => state.path === '/about.html' && state.search === '' && state.aboutRoute),
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
