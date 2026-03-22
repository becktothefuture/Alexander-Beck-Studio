import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const BASE = (process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').replace(/\/+$/, '');
const ENTRY = /index\.html$/i.test(BASE) ? BASE : `${BASE}/index.html`;
const BROWSER = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const OUTPUT_DIR = resolve('output/playwright/quick-transition-review', BROWSER);
const WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 25000);

function resolveBrowserEngine() {
  if (BROWSER === 'webkit' || BROWSER === 'safari') return webkit;
  return chromium;
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });

  const browser = await resolveBrowserEngine().launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const log = [];

  const snap = async (name) => {
    const state = await page.evaluate(() => ({
      path: location.pathname,
      routeTransition: document.documentElement.dataset.absRouteTransition || '',
      gateTransition: document.documentElement.dataset.absGateTransition || '',
      modalActive: document.documentElement.classList.contains('modal-active'),
      modalReturning: document.documentElement.classList.contains('modal-returning'),
      heroOpacity: getComputedStyle(document.querySelector('#hero-title') || document.body).opacity,
      fadeOpacity: getComputedStyle(document.querySelector('.fade-content') || document.body).opacity,
      homeNavVisible: Boolean(document.querySelector('#main-links')),
      topbarVisible: Boolean(document.querySelector('.ui-top-main.route-topbar')),
      cvModalActive: Boolean(document.querySelector('#cv-modal.active')),
      portfolioModalActive: Boolean(document.querySelector('#portfolio-modal.active')),
      contactModalActive: Boolean(document.querySelector('#contact-modal.active')),
    }));

    log.push({ name, ...state });
    await page.screenshot({
      path: resolve(OUTPUT_DIR, `${name}.png`),
      fullPage: true,
    });
  };

  const enterDigits = async (selector, digits) => {
    await page.evaluate(
      ({ selector: inputSelector, code }) => {
        const inputs = Array.from(document.querySelectorAll(inputSelector));
        code.split('').forEach((digit, index) => {
          const el = inputs[index];
          if (!el) return;
          el.focus();
          el.value = digit;
          el.dispatchEvent(new InputEvent('input', { bubbles: true, data: digit, inputType: 'insertText' }));
        });
      },
      { selector, code: digits }
    );
  };

  const waitForRouteSettled = async () => {
    const start = Date.now();
    while ((Date.now() - start) < WAIT_MS) {
      const settled = await page.evaluate(() => {
        const blur = document.getElementById('modal-blur-layer');
        const content = document.getElementById('modal-content-layer');
        const routeBusy =
          document.documentElement.dataset.absRouteTransition === 'active'
          || document.documentElement.dataset.absGateTransition === 'active';
        const overlayBusy = Boolean(blur?.classList.contains('active') || content?.classList.contains('active'));
        const modalBusy = document.documentElement.classList.contains('modal-active');
        const fade = Number.parseFloat(getComputedStyle(document.querySelector('.fade-content') || document.body).opacity || '1');
        const visuallySettled = fade > 0.95 && !overlayBusy && !modalBusy;
        return (!routeBusy && !overlayBusy) || visuallySettled;
      });
      if (settled) return;
      await page.waitForTimeout(50);
    }
    throw new Error('route did not settle before timeout');
  };

  await page.goto(ENTRY, { waitUntil: 'networkidle', timeout: 60000 });
  await page.waitForSelector('#hero-title', { timeout: WAIT_MS });
  await snap('01-home-idle');

  await page.click('#portfolio-modal-trigger', { timeout: 10000 });
  await page.waitForSelector('#portfolio-modal.active', { timeout: 10000 });
  await snap('02-home-portfolio-modal-open');

  const portfolioNav = page.waitForURL(/portfolio/i, { timeout: WAIT_MS });
  await enterDigits('.portfolio-digit', '1234');
  await portfolioNav;
  await waitForRouteSettled();
  await page.waitForTimeout(320);
  await snap('03-portfolio-route-arrive');
  await page.waitForTimeout(220);
  await snap('04-portfolio-route-220ms');

  const homeFromPortfolio = page.waitForURL(/index|\/$/i, { timeout: WAIT_MS });
  await page.click('.ui-top .gate-back', { timeout: 10000 });
  await homeFromPortfolio;
  await waitForRouteSettled();
  await page.waitForTimeout(320);
  await snap('05-home-return-from-portfolio');
  await page.waitForTimeout(220);
  await snap('06-home-return-from-portfolio-220ms');
  await page.waitForTimeout(900);
  await snap('06b-home-return-from-portfolio-1120ms');

  await page.click('#cv-modal-trigger', { timeout: 10000 });
  await page.waitForSelector('#cv-modal.active', { timeout: 10000 });
  await snap('07-home-cv-modal-open');

  const cvNav = page.waitForURL(/cv/i, { timeout: WAIT_MS });
  await enterDigits('.cv-digit', '1111');
  await cvNav;
  await waitForRouteSettled();
  await page.waitForTimeout(320);
  await snap('08-cv-route-arrive');
  await page.waitForTimeout(220);
  await snap('09-cv-route-220ms');
  await page.waitForTimeout(900);
  await snap('09b-cv-route-1120ms');

  await page.click('#contact-email', { timeout: 10000 });
  await page.waitForSelector('#contact-modal.active', { timeout: 10000 });
  await snap('10-cv-contact-modal-open');

  await page.click('#contact-modal [data-modal-back]', { timeout: 10000 });
  await page.waitForFunction(() => {
    const modal = document.getElementById('contact-modal');
    return modal && !modal.classList.contains('active') && modal.classList.contains('hidden');
  }, { timeout: WAIT_MS });
  await snap('11-cv-contact-modal-closed');
  await page.waitForTimeout(220);
  await snap('12-cv-contact-modal-closed-220ms');

  const homeFromCv = page.waitForURL(/index|\/$/i, { timeout: WAIT_MS });
  await page.click('.ui-top .gate-back', { timeout: 10000 });
  await homeFromCv;
  await waitForRouteSettled();
  await page.waitForTimeout(320);
  await snap('13-home-return-from-cv');
  await page.waitForTimeout(220);
  await snap('14-home-return-from-cv-220ms');
  await page.waitForTimeout(900);
  await snap('14b-home-return-from-cv-1120ms');

  await writeFile(resolve(OUTPUT_DIR, 'state-log.json'), `${JSON.stringify({ browser: BROWSER, steps: log }, null, 2)}\n`, 'utf8');
  console.log(`WROTE ${OUTPUT_DIR} (${BROWSER})`);
  await browser.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
