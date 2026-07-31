#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import process from 'node:process';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const baseUrl = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').replace(/\/$/, '');
const browserName = String(process.env.ABS_BROWSER || 'chromium').trim().toLowerCase();
const browserType = browserName === 'webkit' ? webkit : browserName === 'chromium' ? chromium : null;
const shouldStartDevServer = !process.env.ABS_DEV_URL;
const waitMs = Number(process.env.ABS_TITLE_SETTLEMENT_WAIT_MS || 30000);
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'bookend-title-settlement', browserName);
const BOOKEND_TITLE_SELECTOR = '[data-route-enter-variant="bookend-title"]';
const routes = Object.freeze([
  Object.freeze({
    id: 'home',
    path: '/index.html',
    selector: BOOKEND_TITLE_SELECTOR,
    canvasTitle: true,
  }),
  Object.freeze({
    id: 'portfolio',
    path: '/portfolio.html',
    selector: BOOKEND_TITLE_SELECTOR,
    descriptionSelector: '[data-route-enter-variant="bookend-description"]',
  }),
  Object.freeze({ id: 'about', path: '/about.html', selector: BOOKEND_TITLE_SELECTOR }),
  Object.freeze({
    id: 'contact',
    path: '/contact.html',
    selector: BOOKEND_TITLE_SELECTOR,
    descriptionSelector: '[data-route-enter-variant="bookend-description"]',
  }),
  Object.freeze({
    id: 'playground',
    path: '/playground.html',
    selector: BOOKEND_TITLE_SELECTOR,
    descriptionSelector: '[data-route-enter-variant="bookend-description"]',
  }),
]);

function url(pathname) {
  return new URL(pathname, `${baseUrl}/`).toString();
}

function assert(condition, message, details = null) {
  if (condition) return;
  throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
}

function assertIdentityTransform(value, label, details) {
  const match = String(value || '').match(/^matrix(?:3d)?\((.+)\)$/);
  assert(match, `${label}: settled glyph lost its identity transform`, details);
  const values = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
  const identity = values.length === 6
    ? [1, 0, 0, 1, 0, 0]
    : [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
  assert(
    values.length === identity.length
      && values.every((value, index) => Math.abs(value - identity[index]) <= 1e-6),
    `${label}: settled glyph transform is not identity`,
    details,
  );
}

async function waitForHttpReady(timeoutMs = 15000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url('/'));
      if (response.ok) return;
    } catch {
      // Keep polling until Vite is ready.
    }
    await delay(200);
  }
  throw new Error(`Bookend title audit server unavailable at ${baseUrl}`);
}

async function ensureServer() {
  try {
    await waitForHttpReady(1000);
    return null;
  } catch {
    if (!shouldStartDevServer) throw new Error(`Bookend title audit server unavailable at ${baseUrl}`);
  }

  const child = spawn('npm', ['run', 'dev:react', '--', '--host', '127.0.0.1'], {
    cwd: repoRoot,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: process.env,
  });
  await waitForHttpReady();
  return child;
}

async function readGlyphState(page, selector) {
  return page.evaluate((titleSelector) => {
    const title = document.querySelector(titleSelector);
    const glyph = title?.querySelector('[data-route-enter-glyph]');
    if (!title || !glyph) return null;
    const titleStyle = getComputedStyle(title);
    const glyphStyle = getComputedStyle(glyph);
    const titleRect = title.getBoundingClientRect();
    const glyphRect = glyph.getBoundingClientRect();
    return {
      titleColor: titleStyle.color,
      glyphColor: glyphStyle.color,
      glyphTransform: glyphStyle.transform,
      glyphWillChange: glyphStyle.willChange,
      inlineTransform: glyph.style.transform,
      inlineWillChange: glyph.style.willChange,
      animationCount: glyph.getAnimations().length,
      animationStates: glyph.getAnimations().map((animation) => animation.playState),
      titleRect: {
        x: titleRect.x,
        y: titleRect.y,
        width: titleRect.width,
        height: titleRect.height,
      },
      glyphRect: {
        x: glyphRect.x,
        y: glyphRect.y,
        width: glyphRect.width,
        height: glyphRect.height,
      },
    };
  }, selector);
}

async function readDescriptionState(page, selector) {
  if (!selector) return null;
  return page.evaluate((descriptionSelector) => {
    const description = document.querySelector(descriptionSelector);
    if (!description) return null;
    const style = getComputedStyle(description);
    return {
      opacity: Number.parseFloat(style.opacity),
      inlineOpacity: description.style.opacity,
      animationCount: description.getAnimations({ subtree: true }).length,
    };
  }, selector);
}

function rectDelta(before, after) {
  return {
    x: after.x - before.x,
    y: after.y - before.y,
    width: after.width - before.width,
    height: after.height - before.height,
  };
}

async function auditRoute(page, route) {
  console.log(`Auditing ${route.id} title settlement...`);
  await page.goto(url(route.path), { waitUntil: 'domcontentloaded', timeout: waitMs });
  if (route.canvasTitle) {
    await page.waitForFunction((selector) => {
      const root = document.documentElement;
      const glyph = document.querySelector(selector)?.querySelector('[data-route-enter-glyph]');
      const snapshot = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.();
      return root.dataset.absBootState === 'ready'
        && root.classList.contains('abs-home-post-boot-complete')
        && glyph
        && glyph.getAnimations().length === 0
        && glyph.style.transform === ''
        && glyph.style.willChange === ''
        && snapshot?.canvasTitleVisible === true;
    }, route.selector, { timeout: waitMs });
    const settled = await readGlyphState(page, route.selector);
    assert(settled, `${route.id}: settled glyph state was unavailable`);
    assertIdentityTransform(settled.glyphTransform, `${route.id} settled endpoint`, settled);
    assert(settled.glyphColor === settled.titleColor, `${route.id}: settled glyph does not inherit title colour`, settled);
    assert(settled.glyphWillChange === 'auto', `${route.id}: glyph kept a compositor hint after cleanup`, settled);
    await page.screenshot({ path: resolve(outputRoot, `${route.id}-settled.png`) });
    return {
      id: route.id,
      titleDelta: null,
      glyphDelta: null,
      color: settled.glyphColor,
      canvasTitle: true,
    };
  }

  await page.waitForFunction((selector) => {
    const glyph = document.querySelector(selector)?.querySelector('[data-route-enter-glyph]');
    const animations = glyph?.getAnimations() || [];
    return animations.length >= 1 && animations.every((animation) => animation.playState === 'finished');
  }, route.selector, { timeout: waitMs });
  const animated = await readGlyphState(page, route.selector);
  assert(animated, `${route.id}: animated glyph state was unavailable`);

  await page.waitForFunction((selector) => {
    const glyph = document.querySelector(selector)?.querySelector('[data-route-enter-glyph]');
    return glyph
      && glyph.getAnimations().length === 0
      && glyph.style.transform === ''
      && glyph.style.willChange === '';
  }, route.selector, { timeout: waitMs });
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
  const settled = await readGlyphState(page, route.selector);
  assert(settled, `${route.id}: settled glyph state was unavailable`);
  const description = await readDescriptionState(page, route.descriptionSelector);

  const titleDelta = rectDelta(animated.titleRect, settled.titleRect);
  const glyphDelta = rectDelta(animated.glyphRect, settled.glyphRect);
  const details = { animated, settled, titleDelta, glyphDelta };
  assertIdentityTransform(animated.glyphTransform, `${route.id} animated endpoint`, details);
  assertIdentityTransform(settled.glyphTransform, `${route.id} settled endpoint`, details);
  assert(animated.glyphColor === settled.glyphColor, `${route.id}: glyph colour changed during cleanup`, details);
  assert(settled.glyphColor === settled.titleColor, `${route.id}: settled glyph does not inherit title colour`, details);
  assert(settled.glyphWillChange === 'auto', `${route.id}: glyph kept a compositor hint after cleanup`, details);
  assert(settled.animationCount === 0, `${route.id}: glyph animations remained attached after cleanup`, details);
  if (route.descriptionSelector) {
    assert(description, `${route.id}: settled description state was unavailable`);
    assert(
      Number.isFinite(description.opacity) && description.opacity > 0 && description.opacity < 1,
      `${route.id}: settled description must remain visibly subordinate to its title`,
      description,
    );
    assert(description.inlineOpacity === '', `${route.id}: description kept an inline opacity`, description);
    assert(description.animationCount === 0, `${route.id}: description animations remained attached`, description);
  }
  Object.entries(titleDelta).forEach(([metric, value]) => {
    assert(Math.abs(value) <= 1 / 64, `${route.id}: title ${metric} changed during cleanup`, details);
  });
  Object.entries(glyphDelta).forEach(([metric, value]) => {
    assert(Math.abs(value) <= 1 / 64, `${route.id}: glyph ${metric} changed during cleanup`, details);
  });

  await page.screenshot({ path: resolve(outputRoot, `${route.id}-settled.png`) });
  return {
    id: route.id,
    titleDelta,
    glyphDelta,
    color: settled.glyphColor,
    descriptionOpacity: description?.opacity ?? null,
  };
}

async function main() {
  assert(browserType, `Unsupported ABS_BROWSER "${browserName}". Expected chromium or webkit.`);
  const server = await ensureServer();
  const browser = await browserType.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: 'light',
    reducedMotion: 'no-preference',
  });
  const page = await context.newPage();
  const results = [];

  try {
    await mkdir(outputRoot, { recursive: true });
    for (const route of routes) results.push(await auditRoute(page, route));
    const output = { ok: true, browser: browserName, results };
    await writeFile(resolve(outputRoot, 'result.json'), `${JSON.stringify(output, null, 2)}\n`);
    console.log(JSON.stringify(output, null, 2));
  } finally {
    await context.close();
    await browser.close();
    if (server) {
      server.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveExit) => server.once('exit', resolveExit)),
        delay(2000),
      ]);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
