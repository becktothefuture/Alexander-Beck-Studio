#!/usr/bin/env node
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { ROUTE_MANIFEST } from '../react-app/app/src/lib/route-manifest.js';
import { startProductionPreview } from './lib/release-smoke-helpers.mjs';

const repoRoot = fileURLToPath(new URL('..', import.meta.url));
const browserName = process.env.ABS_BROWSER || 'chromium';
const browserType = { chromium, webkit }[browserName];
assert.ok(browserType, `Unsupported publication audit browser: ${browserName}`);
const externalUrl = process.env.ABS_WORK_PUBLICATION_URL;
const preview = externalUrl
  ? { baseUrl: externalUrl, stop: async () => {} }
  : await startProductionPreview({ repoRoot, host: '127.0.0.1', port: 8031 });
const outputDir = resolve(repoRoot, 'output/playwright/work-publication',
  `${new Date().toISOString().replace(/[:.]/g, '-')}-${browserName}`);
await mkdir(outputDir, { recursive: true });
const results = [];
const errors = [];
const forbiddenRequests = [];
let browser;

async function assertHeld(page, label) {
  await page.locator('[data-work-publication="held"] #portfolio-coming-soon-title')
    .waitFor({ state: 'visible', timeout: 30_000 });
  await page.waitForFunction(() => {
    const root = document.documentElement;
    return !document.getElementById('abs-boot-overlay')
      && (root.dataset.absTransitionPhase || 'idle') === 'idle'
      && document.querySelector('[data-route-tab="portfolio"][aria-current="page"]')
      && !document.querySelector('[data-route-enter-glyph][style*="will-change"]');
  }, null, { timeout: 30_000 });
  const state = await page.evaluate(() => ({
    text: document.getElementById('portfolio-coming-soon-title')?.textContent?.replace(/\s+/g, ' ').trim(),
    heading: document.querySelector('#simulations[role="main"]')?.getAttribute('aria-labelledby'),
    tabs: [...document.querySelectorAll('[data-route-tab]')].map((tab) => tab.dataset.routeTab),
    canvas: Boolean(document.querySelector('[data-work-experience], [data-playground-viewport]')),
    gate: Boolean(document.querySelector('.portfolio-access-gate')),
    presenter: Boolean(document.querySelector('.portfolio-project-view.is-open, .work-snippet-stage')),
    bodyCanvas: document.body.classList.contains('work-canvas-page'),
    inert: Boolean(document.querySelector('#simulations')?.closest('[inert]')),
    phase: document.documentElement.dataset.absTransitionPhase || 'idle',
  }));
  assert.equal(state.text, 'Coming soon.', label);
  assert.equal(state.heading, 'portfolio-coming-soon-title', label);
  assert.deepEqual(state.tabs, ['home', 'portfolio', 'about', 'contact'], label);
  assert.equal(state.canvas || state.gate || state.presenter || state.bodyCanvas || state.inert, false, label);
  results.push({ label, url: page.url(), ...state });
  console.log(`[work-publication] ${label}: held`);
}

try {
  browser = await browserType.launch();
  for (const profile of [
    { id: 'desktop-light', viewport: { width: 1280, height: 900 }, theme: 'light', reducedMotion: 'no-preference' },
    { id: 'mobile-dark-reduced', viewport: { width: 390, height: 844 }, theme: 'dark', reducedMotion: 'reduce' },
  ]) {
    const context = await browser.newContext({
      viewport: profile.viewport,
      colorScheme: profile.theme,
      reducedMotion: profile.reducedMotion,
      hasTouch: profile.id.startsWith('mobile'),
    });
    // An existing client-side project grant must not lift the publication hold.
    await context.addInitScript((theme) => {
      localStorage.setItem('theme-preference-v3', theme);
      localStorage.setItem('abs_portfolio_ok', 'certified');
      sessionStorage.setItem('abs_portfolio_ok', 'certified');
    }, profile.theme);
    const page = await context.newPage();
    page.on('pageerror', (error) => errors.push({ message: error.message, stack: error.stack, url: page.url() }));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('request', (request) => {
      if (/contents-portfolio\.json|PlaygroundExperience|WorkSnippetStage|WorkCaseStudyPresenter/.test(request.url())) {
        forbiddenRequests.push(request.url());
      }
    });
    try {
      const paths = [
        ...ROUTE_MANIFEST.portfolio.aliases,
        '/portfolio.html?preview=work&project=chapter-1',
        '/portfolio.html?preview=portfolio&work=case-study-chapter-1',
        '/playground.html?preview=playground&item=image-coral-orbit',
      ];
      for (const path of paths) {
        const response = await page.goto(new URL(path, preview.baseUrl).href, { waitUntil: 'domcontentloaded' });
        assert.ok(response?.ok(), `${profile.id}: HTTP ${response?.status()} for ${path}`);
        await assertHeld(page, `${profile.id}/direct${path}`);
      }
      await page.screenshot({ path: resolve(outputDir, `${profile.id}.png`), fullPage: true });
      await page.locator('[data-route-tab="contact"]').click();
      await page.locator('[data-route-tab="contact"][aria-current="page"]').waitFor();
      await page.waitForFunction(() => (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle');
      await page.locator('[data-route-tab="portfolio"]').click();
      await assertHeld(page, `${profile.id}/spa-return`);
      await page.goBack();
      await page.locator('[data-route-tab="contact"][aria-current="page"]').waitFor();
      await page.waitForFunction(() => (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle');
      await page.goForward();
      await assertHeld(page, `${profile.id}/history-forward`);
    } finally {
      await context.close();
    }
  }
  assert.deepEqual(errors, [], 'Publication audit reported browser errors.');
  assert.deepEqual(forbiddenRequests, [], 'Held Work requested development content or presenters.');
  await writeFile(resolve(outputDir, 'report.json'), JSON.stringify({
    status: 'passed', browser: browserName, baseUrl: preview.baseUrl, results, errors, forbiddenRequests,
  }, null, 2));
  console.log(`PASS: Work remains under construction in ${results.length} direct, alias, query, SPA, and history checks (${browserName}).`);
  console.log(`Evidence: ${outputDir}`);
} catch (error) {
  await writeFile(resolve(outputDir, 'report.json'), JSON.stringify({
    status: 'failed', browser: browserName, baseUrl: preview.baseUrl,
    message: error.message, results, errors, forbiddenRequests,
  }, null, 2));
  throw error;
} finally {
  await browser?.close();
  await preview.stop();
}
