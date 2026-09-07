import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import { RELEASE_SMOKE_ROUTES, waitForRouteReady } from './lib/release-smoke-helpers.mjs';

const name = process.env.ABS_BROWSER || 'chromium';
assert.ok(['chromium', 'webkit'].includes(name));
const base = process.env.ABS_BASE_URL || 'http://127.0.0.1:8013';
const output = resolve('output/playwright/about-publication', name);
await mkdir(output, { recursive: true });
const browser = await (name === 'webkit' ? webkit : chromium).launch({ headless: true });
const results = [];
try {
  for (const width of [390, 1440]) for (const theme of ['light', 'dark']) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 }, colorScheme: theme, reducedMotion: 'reduce' });
    await context.addInitScript(theme => {
      localStorage.setItem('theme-preference-v3', theme);
      localStorage.setItem('about-preview', 'true');
    }, theme);
    const page = await context.newPage();
    const requests = [], errors = [];
    page.on('request', request => requests.push(request.url()));
    page.on('pageerror', error => errors.push(error.message));
    const settle = id => id === 'home'
      ? page.waitForFunction(() => (
        document.documentElement.dataset.absBootState === 'ready'
        && (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
        && document.querySelector('[data-route-tab="home"]')?.getAttribute('aria-current') === 'page'
      ), null, { timeout: 30_000 })
      : waitForRouteReady(page, RELEASE_SMOKE_ROUTES.find(route => route.id === id), 30_000);
    async function assertHeld(label) {
      await settle('about');
      await page.locator('[data-about-publication="held"] #about-coming-soon-title').waitFor({ state: 'visible' });
      assert.equal((await page.locator('#about-coming-soon-title').innerText()).replace(/\s+/gu, ' '), 'Coming soon.');
      assert.equal(await page.locator('.about-narrative-lab, .about-coming-soon__reveal').count(), 0);
      assert.equal(await page.locator('[data-route-tab="about"]').getAttribute('aria-current'), 'page');
      assert.equal(await page.locator('[role="main"]').count(), 1);
      assert.equal(await page.locator('#simulations').getAttribute('aria-labelledby'), 'about-coming-soon-title');
      assert.equal(requests.some(url => /AboutNarrativeLabExperience|about-v2-edited-world/.test(url)), false);
      assert.deepEqual(errors, []);
      results.push({ width, theme, label, url: page.url(), held: true });
    }
    for (const path of ['/about.html', '/about', '/about.html?preview=about', '/about?preview=about&edit=1']) {
      await page.goto(new URL(path, base).href);
      await assertHeld(path);
    }
    await page.screenshot({ path: resolve(output, `${width}-${theme}.png`) });
    await page.goto(new URL('/index.html', base).href);
    await settle('home');
    await page.locator('[data-route-tab="about"]').click();
    await assertHeld('SPA Home → About');
    await page.locator('[data-route-tab="contact"]').click();
    await settle('contact');
    await page.goBack();
    await assertHeld('history Contact → About');
    await context.close();
    console.log(`PASS: ${name} ${width} ${theme}; direct, preview query, SPA and history hold.`);
  }
} finally { await browser.close(); }
await writeFile(resolve(output, 'report.json'), `${JSON.stringify(results, null, 2)}\n`);
