import { chromium } from 'playwright';

const BASE = process.env.ABS_DEV_URL || 'http://localhost:8013';
const TIMEOUT_MS = 30000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForCanvas(page) {
  await page.waitForFunction(() => {
    const c = document.getElementById('c');
    if (!c) return false;
    const cssW = c.clientWidth || 0;
    const cssH = c.clientHeight || 0;
    if (cssW < 64 || cssH < 64) return false;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const minW = Math.ceil((cssW + 2) * dpr) - 2;
    const minH = Math.ceil((cssH + 2) * dpr) - 2;
    return c.width >= minW && c.height >= minH;
  }, { timeout: TIMEOUT_MS });
}

async function captureState(page, label) {
  const payload = await page.evaluate((value) => {
    const readStyle = (selector) => {
      const node = document.querySelector(selector);
      if (!node) return null;
      const style = getComputedStyle(node);
      return {
        opacity: style.opacity,
        transform: style.transform,
        filter: style.filter,
      };
    };

    return {
      label: value,
      path: location.pathname,
      routeTransition: document.documentElement.dataset.absRouteTransition || null,
      gateTransition: document.documentElement.dataset.absGateTransition || null,
      fadeState: {
        wallOpacity: readStyle('#shell-wall-slot')?.opacity || null,
        heroOpacity: readStyle('#hero-title')?.opacity || null,
        uiOpacity: readStyle('.fade-content')?.opacity || null,
      },
      overlay: {
        modalActive: document.documentElement.classList.contains('modal-active'),
        modalReturning: document.documentElement.classList.contains('modal-returning'),
        blurActive: document.getElementById('modal-blur-layer')?.classList.contains('active') || false,
        contentActive: document.getElementById('modal-content-layer')?.classList.contains('active') || false,
      },
      modals: {
        cvActive: !!document.getElementById('cv-modal')?.classList.contains('active'),
        cvHidden: !!document.getElementById('cv-modal')?.classList.contains('hidden'),
        portfolioActive: !!document.getElementById('portfolio-modal')?.classList.contains('active'),
        portfolioHidden: !!document.getElementById('portfolio-modal')?.classList.contains('hidden'),
        contactActive: !!document.getElementById('contact-modal')?.classList.contains('active'),
        contactHidden: !!document.getElementById('contact-modal')?.classList.contains('hidden'),
      },
      navCount: document.querySelectorAll('.ui-main-nav .footer_link').length,
      navOps: Array.from(document.querySelectorAll('.ui-main-nav .footer_link')).map((node) => ({
        id: node.id,
        opacity: getComputedStyle(node).opacity,
        filter: getComputedStyle(node).filter,
        transform: getComputedStyle(node).transform,
        transitionDelay: getComputedStyle(node).transitionDelay,
      })),
      centeredClass:
        document.querySelector('main.ui-center-spacer')?.className ||
        document.querySelector('main.ui-center')?.className ||
        null,
    };
  }, label);

  await page.screenshot({ path: `output/playwright/${label}.png`, fullPage: true });
  return payload;
}

async function waitForRoute(page, regexSource) {
  await page.waitForFunction((source) => {
    const re = new RegExp(source, 'i');
    return re.test(window.location.pathname);
  }, regexSource, { timeout: TIMEOUT_MS });
  await waitForCanvas(page);
}

async function waitForModal(page, id, shouldBeActive = true) {
  await page.waitForFunction(({ modalId, expected }) => {
    const m = document.getElementById(modalId);
    if (!m) return !expected;
    return expected ? m.classList.contains('active') : !m.classList.contains('active');
  }, { modalId: id, expected: shouldBeActive }, { timeout: TIMEOUT_MS });
}

async function fillDigits(page, selector, digits) {
  for (let i = 0; i < digits.length; i += 1) {
    await page.locator(selector).nth(i).fill(digits[i]);
  }
}

async function runFlow() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const logs = [];

  const log = async (label) => {
    logs.push(await captureState(page, label));
  };

  await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('#shell-wall-slot', { timeout: TIMEOUT_MS });
  await waitForCanvas(page);
  await log('home.initial');

  await page.locator('#portfolio-modal-trigger').click();
  await waitForModal(page, 'portfolio-modal', true);
  await log('home.portfolio-open');
  await fillDigits(page, '.portfolio-digit', ['1', '2', '3', '4']);
  await waitForRoute(page, 'portfolio');
  await log('portfolio.route');
  await page.locator('.route-topbar__left .gate-back').click();
  await waitForRoute(page, '(^|/)index(\\\\.html)?$');
  await log('portfolio.return-home');

  await page.locator('#cv-modal-trigger').click();
  await waitForModal(page, 'cv-modal', true);
  await log('home.cv-open');
  await fillDigits(page, '.cv-digit', ['1', '1', '1', '1']);
  await waitForRoute(page, 'cv');
  await log('cv.route');
  await page.locator('.route-topbar__left .gate-back').click();
  await waitForRoute(page, '(^|/)index(\\\\.html)?$');
  await log('cv.return-home');

  for (let i = 0; i < 2; i += 1) {
    await page.evaluate(() => window.__ABS_SPA_NAVIGATE__('portfolio.html', { replace: true }));
    await waitForRoute(page, 'portfolio');
    await log(`portfolio.loop-${i}-enter`);
    await sleep(30);
    await page.locator('.route-topbar__left .gate-back').click();
    await waitForRoute(page, '(^|/)index(\\\\.html)?$');
    await log(`portfolio.loop-${i}-return`);
  }

  await page.locator('#contact-email-inline').click();
  await waitForModal(page, 'contact-modal', true);
  await log('contact.open');
  await page.evaluate(() =>
    document.dispatchEvent(new CustomEvent('modal-overlay-dismiss', { detail: { instant: false } }))
  );
  await page.waitForFunction(() => {
    const modal = document.getElementById('contact-modal');
    return !modal || !modal.classList.contains('active');
  }, { timeout: TIMEOUT_MS });
  await log('contact.closed');

  await browser.close();

  const invalid = logs.filter((entry) => {
    const wall = Number(entry.fadeState.wallOpacity);
    const hero = Number(entry.fadeState.heroOpacity);
    const ui = Number(entry.fadeState.uiOpacity);
    return (
      !Number.isFinite(wall) ||
      !Number.isFinite(hero) ||
      !Number.isFinite(ui) ||
      wall < 0 || wall > 1 ||
      hero < 0 || hero > 1 ||
      ui < 0 || ui > 1
    );
  });

  const final = logs[logs.length - 1];
  return { logs, invalid, final };
}

const result = await runFlow();
console.log('TRANSITION CHECK', {
  steps: result.logs.length,
  invalidCount: result.invalid.length,
  routeTransitionFrames: result.logs.filter((entry) => entry.routeTransition === 'active').length,
  gateTransitionFrames: result.logs.filter((entry) => entry.gateTransition === 'active').length,
  finalPath: result.final?.path,
});
for (const entry of result.logs) {
  console.log(JSON.stringify(entry));
}
