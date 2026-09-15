#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { chromium, webkit } from 'playwright';

const base = process.env.ABS_NAV_URL || 'http://127.0.0.1:8013';
const output = 'output/playwright/tactile-navigation';
await mkdir(output, { recursive: true });
const results = [];
const rects = page => page.locator('[data-route-tabs]').evaluate(nav => [...nav.querySelectorAll('.tactile-nav__face, .button-bar__icon, .button-bar__label')].map(el => {
  const r = el.getBoundingClientRect();
  return [r.x, r.y, r.width, r.height];
}));
// The legacy runtime owns page timers and cancels them on route disposal.
// Poll from Node so the audit itself is not disposed with a simulation.
const settle = async (page, route) => {
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    if (await page.evaluate(id => document.querySelector(`[data-route-tab='${id}']`)?.getAttribute('aria-current') === 'page'
      && (!document.documentElement.dataset.absTransitionPhase || document.documentElement.dataset.absTransitionPhase === 'idle'), route)) return;
    await delay(50);
  }
  throw new Error(`Route ${route} did not settle at ${page.url()}`);
};
const route = (page, id) => page.locator(`[data-route-tab='${id}']`);

for (const [name, engine] of Object.entries({ chromium, webkit })) {
  if (process.env.ABS_BROWSER && name !== process.env.ABS_BROWSER) continue;
  const browser = await engine.launch();
  try {
    for (const mobile of [false, true]) {
      console.log(`Checking ${name} ${mobile ? 'mobile' : 'desktop'}`);
      const context = await browser.newContext({ viewport: { width: mobile ? 390 : 1440, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 3 : 2, hasTouch: mobile });
      await context.addInitScript(() => { window.__navAuditRaf = requestAnimationFrame.bind(window); });
      const page = await context.newPage();
      page.setDefaultTimeout(60000);
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('console', message => { if (message.type() === 'error') console.log(name, message.text()); });
      await page.goto(base);
      await settle(page, 'home');
      await page.evaluate(() => document.fonts.ready);
      await route(page, 'portfolio').click({ trial: true });
      const before = await rects(page);
      // Preserve native hrefs and modified activations, including the current link.
      assert.equal(await page.locator('a[data-route-tab][href]').count(), 4);
      await route(page, 'home').evaluate(el => {
        const click = new MouseEvent('click', { bubbles: true, cancelable: true, ctrlKey: true, button: 0 });
        el.addEventListener('click', event => { window.__navModifiedPrevented = event.defaultPrevented; event.preventDefault(); }, { once: true });
        el.dispatchEvent(click);
      });
      assert.equal(await page.evaluate(() => window.__navModifiedPrevented), false);
      const work = await route(page, 'portfolio').boundingBox();
      await page.mouse.move(work.x + work.width / 2, work.y + 18);
      await page.mouse.down();
      assert.equal(await route(page, 'portfolio').getAttribute('data-pressure'), 'true');
      // Legacy CSS may load after component CSS; native :active must not paint the hit area.
      const lateLegacyFill = await page.addStyleTag({ content: ".button-bar__primary-buttons .shell-tab:active:not([aria-current='page']) { background: #000; }" });
      assert.deepEqual(await route(page, 'portfolio').evaluate(el => {
        const style = getComputedStyle(el);
        return [style.backgroundColor, style.backgroundImage];
      }), ['rgba(0, 0, 0, 0)', 'none']);
      await lateLegacyFill.evaluate(el => el.remove());
      assert.equal(await route(page, 'home').getAttribute('aria-current'), 'page');
      assert.deepEqual(await rects(page), before);
      await page.screenshot({ path: `${output}/${name}-${mobile ? 'mobile-3x' : 'desktop-2x'}-held.png` });
      // Drag away cancels, even when touch would retain implicit capture.
      await page.mouse.move(5, 5);
      await page.mouse.up();
      assert.equal(await page.locator('[data-pressure]').count(), 0);
      assert.equal(await route(page, 'home').getAttribute('aria-current'), 'page');
      // Cancel, focus loss and a second touch never leave a held key behind.
      for (const cancel of ['pointercancel', 'blur']) {
        await route(page, 'portfolio').dispatchEvent('pointerdown', { pointerId: 23, isPrimary: true, button: 0 });
        if (cancel === 'blur') await page.evaluate(() => { window.dispatchEvent(new Event('blur')); window.dispatchEvent(new Event('focus')); });
        else await route(page, 'portfolio').dispatchEvent(cancel, { pointerId: 23 });
        assert.equal(await page.locator('[data-pressure]').count(), 0);
      }
      await route(page, 'portfolio').dispatchEvent('pointerdown', { pointerId: 25, isPrimary: true, button: 0 });
      await route(page, 'about').dispatchEvent('pointerdown', { pointerId: 26, isPrimary: false, button: 0 });
      assert.equal(await page.locator('[data-pressure]').count(), 1);
      await route(page, 'portfolio').dispatchEvent('pointercancel', { pointerId: 25 });
      // A zero rebound keeps the smooth CSS release instead of cancelling it.
      const home = route(page, 'home');
      await page.evaluate(() => document.documentElement.style.setProperty('--tactile-nav-pop-strength', '0'));
      await home.evaluate(el => el.addEventListener('pointerup', () => {
        window.__plainRelease = el.querySelector('.tactile-nav__active').getAnimations().map(a => ({ id: a.id, property: a.transitionProperty }));
      }, { once: true }));
      const homeBox = await home.boundingBox();
      await page.mouse.move(homeBox.x + homeBox.width / 2, homeBox.y + 20);
      const restingShadow = await home.locator('.tactile-nav__active').evaluate(el => getComputedStyle(el).boxShadow);
      await page.mouse.down(); await page.waitForTimeout(120);
      // Observe the held style before release; elapsed time alone does not flush it.
      assert.notEqual(await home.locator('.tactile-nav__active').evaluate(el => getComputedStyle(el).boxShadow), restingShadow);
      await page.mouse.up();
      const plainRelease = await page.evaluate(() => window.__plainRelease);
      assert.ok(plainRelease.some(a => a.property === 'box-shadow'));
      assert.ok(plainRelease.every(a => a.id !== 'tactile-nav-release'));
      await page.evaluate(() => document.documentElement.style.removeProperty('--tactile-nav-pop-strength'));
      // Sample actual animation frames while switching and releasing.
      await page.evaluate(() => {
        window.__navFrames = [];
        const start = performance.now();
        const frame = () => {
          window.__navFrames.push([...document.querySelectorAll('.tactile-nav__face, .button-bar__icon, .button-bar__label')].map(el => {
            const r = el.getBoundingClientRect(); return [r.x, r.y, r.width, r.height];
          }));
          if (performance.now() - start < 700) window.__navAuditRaf(frame);
        }; window.__navAuditRaf(frame);
      });
      await route(page, 'portfolio').click();
      await settle(page, 'portfolio').catch(async error => { console.log('Failed route', page.url(), await page.evaluate(() => ({phase: document.documentElement.dataset.absTransitionPhase, nav: document.querySelector('[data-route-tabs]').dataset.activeRoute, current: document.querySelector('[data-route-tab][aria-current=page]')?.dataset.routeTab, hidden: document.hidden})), errors); throw error; });
      await page.waitForTimeout(720);
      assert.ok(await page.evaluate(() => window.__navFrames.length > 0));
      for (const frame of await page.evaluate(() => window.__navFrames)) assert.deepEqual(frame, before);
      assert.equal(await page.locator('[data-visual-active=true]').count(), 1);
      // A selected key can be pressed again without adding history.
      const historyLength = await page.evaluate(() => history.length);
      await route(page, 'portfolio').click();
      assert.equal(await page.evaluate(() => history.length), historyLength);
      await route(page, 'about').focus();
      // WebKit follows Safari's default: Option-Tab includes native links.
      await page.keyboard.press(name === 'webkit' ? 'Alt+Tab' : 'Tab');
      assert.equal(await route(page, 'contact').evaluate(el => getComputedStyle(el.querySelector('.tactile-nav__face')).outlineStyle), 'solid');
      await page.keyboard.press('Enter');
      await settle(page, 'contact');
      assert.deepEqual(await rects(page), before);
      await page.goBack(); await settle(page, 'portfolio');
      await page.goForward(); await settle(page, 'contact');
      // Normal palette updates and history restoration must not produce sound.
      assert.equal(await page.evaluate(() => window.__ABS_SIMULATION_AUDIO__?.byType?.navigation || 0), 0);
      await page.evaluate(() => {
        document.querySelector('[data-route-tab=about]').click();
        document.querySelector('[data-route-tab=portfolio]').click();
        document.querySelector('[data-route-tab=home]').click();
      });
      await settle(page, 'home');
      for (const theme of ['light', 'dark']) {
        const toggle = page.locator('[data-sound-source=theme-toggle]').first();
        const current = await page.evaluate(() => document.body.classList.contains('dark-mode') ? 'dark' : 'light');
        if (current !== theme) await toggle.click();
        for (const id of ['home', 'portfolio', 'about', 'contact']) {
          await route(page, id).click(); await settle(page, id);
          await page.mouse.move(1, 1);
          const layout = await page.evaluate(() => {
            const windowRect = document.querySelector('#simulations').getBoundingClientRect();
            const navRect = document.querySelector('[data-route-tabs]').getBoundingClientRect();
            return { bottom: windowRect.bottom, top: navRect.top, overflow: navRect.left < 0 || navRect.right > innerWidth,
              selected: document.querySelectorAll('[data-visual-active=true]').length,
              background: getComputedStyle(document.querySelector('[data-button-bar]')).backgroundImage };
          });
          assert.ok(layout.top >= layout.bottom, `${name}/${theme}/${id}: navigation overlaps window`);
          assert.equal(layout.overflow, false);
          assert.equal(layout.selected, 1);
          assert.equal(layout.background, 'none');
          assert.deepEqual(await rects(page), before);
          await page.screenshot({ path: `${output}/${name}-${mobile ? 'mobile-3x' : 'desktop-2x'}-${theme}-${id}.png` });
        }
      }
      for (const width of [320, 375, 480, 600, 601, 640, 641, 767, 768, 900, 991, 992, 1024, 1025, 1440, 3440]) {
        await page.setViewportSize({ width, height: width === 600 ? 375 : 844 });
        const layout = await page.evaluate(() => [...document.querySelectorAll('[data-route-tab]')].map(el => {
          const r = el.getBoundingClientRect(); return { left: r.left, right: r.right, height: r.height, viewport: innerWidth };
        }));
        assert.ok(layout.every(r => r.left >= 0 && r.right <= r.viewport && r.height >= 66), `${name} ${width}: target overflow`);
      }
      await page.setViewportSize({ width: mobile ? 390 : 1440, height: mobile ? 844 : 900 });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      if (mobile) await route(page, 'home').tap();
      else await route(page, 'home').click();
      await settle(page, 'home');
      assert.equal(await page.locator('.tactile-nav__active').first().evaluate(el => getComputedStyle(el).transitionDuration), '0s');
      assert.equal(await page.locator('[data-pressure]').count(), 0);
      assert.deepEqual(errors, []);
      results.push({ browser: name, scale: mobile ? 3 : 2, routes: 4, themes: 2, widths: 16, stationaryFrames: await page.evaluate(() => window.__navFrames.length), errors });
      await context.close();
    }
  } finally { await browser.close(); }
}
await writeFile(`${output}/report${process.env.ABS_BROWSER ? `-${process.env.ABS_BROWSER}` : ''}.json`, JSON.stringify(results, null, 2));
console.log('PASS tactile navigation', JSON.stringify(results));
