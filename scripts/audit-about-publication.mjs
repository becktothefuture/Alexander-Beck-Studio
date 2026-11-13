import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';
import { RELEASE_SMOKE_ROUTES, waitForRouteReady } from './lib/release-smoke-helpers.mjs';

const about = JSON.parse(await readFile(new URL('../react-app/app/public/config/contents-about.json', import.meta.url), 'utf8'));
const timeline = about.tracks.text.fields.find(field => field.id === 'text-background-unit')
  .block.modules.find(module => module.id === 'career-sequence');
const employers = [...timeline.items].reverse().map(item => item.employer);

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
    }, theme);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const settle = id => id === 'home'
      ? page.waitForFunction(() => (
        document.documentElement.dataset.absBootState === 'ready'
        && (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
        && document.querySelector('[data-route-tab="home"]')?.getAttribute('aria-current') === 'page'
      ), null, { timeout: 30_000 })
      : waitForRouteReady(page, RELEASE_SMOKE_ROUTES.find(route => route.id === id), 30_000);
    async function assertPublished(label) {
      await settle('about');
      await page.locator('#about-route-title').waitFor({ state: 'visible' });
      assert.equal((await page.locator('#about-route-title').textContent()).trim(), 'About Me');
      assert.deepEqual(await page.locator('.about-board-career-timeline h3').allTextContents(), employers);
      assert.deepEqual(await page.locator('.about-board-timeline-description').allTextContents(),
        [...timeline.items].reverse().map(item => item.description));
      assert.equal(await page.locator('.about-board-portrait-ledge').count(), 1);
      assert.equal(await page.locator('.about-board-error, .about-editor-inspector, .about-board-grid-guide').count(), 0);
      assert.equal(await page.locator('[data-route-tab="about"]').getAttribute('aria-current'), 'page');
      assert.equal(await page.locator('[role="main"]').count(), 1);
      assert.equal(await page.locator('#simulations').getAttribute('aria-labelledby'), 'about-route-title');
      assert.equal(await page.evaluate(() => '__ABS_ABOUT_GAME_BOARD__' in window || '__aboutRollercoaster' in window), false);
      assert.deepEqual(errors, []);
      results.push({ width, theme, label, url: page.url(), published: true });
    }
    for (const path of ['/about.html', '/about', '/about.html?preview=about&edit=1&grid=1']) {
      await page.goto(new URL(path, base).href);
      await assertPublished(path);
    }
    await page.screenshot({ path: resolve(output, `${width}-${theme}.png`) });
    await page.goto(new URL('/index.html', base).href);
    await settle('home');
    await page.locator('[data-route-tab="about"]').click();
    await assertPublished('SPA Home → About');
    await page.locator('[data-route-tab="contact"]').click();
    await settle('contact');
    await page.goBack();
    await assertPublished('history Contact → About');
    await context.close();
    console.log(`PASS: ${name} ${width} ${theme}; direct load, clean URL, SPA and history.`);
  }
} finally { await browser.close(); }
await writeFile(resolve(output, 'report.json'), `${JSON.stringify(results, null, 2)}\n`);
