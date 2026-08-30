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
const routeFilter = String(process.env.ABS_TITLE_SETTLEMENT_ROUTE || '').trim();
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'bookend-title-settlement', browserName);
const BOOKEND_TITLE_SELECTOR = '[data-route-enter-variant="bookend-title"]';
const START_VIEWPORT = Object.freeze({ width: 1200, height: 900 });
const RESIZE_VIEWPORTS = Object.freeze([
  Object.freeze({ width: 900, height: 520 }),
  Object.freeze({ width: 1200, height: 520 }),
  Object.freeze({ width: 390, height: 844 }),
  START_VIEWPORT,
]);
const routes = Object.freeze([
  Object.freeze({
    id: 'home',
    path: '/index.html?mode=pit&absAudit=1',
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
].filter((route) => !routeFilter || route.id === routeFilter));
if (routeFilter && routes.length === 0) {
  throw new Error(`Unknown ABS_TITLE_SETTLEMENT_ROUTE "${routeFilter}".`);
}

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
    const title = [...document.querySelectorAll(titleSelector)]
      .find((candidate) => candidate.querySelector('[data-route-enter-glyph]'));
    const glyph = title?.querySelector('[data-route-enter-glyph]');
    if (!title || !glyph) return null;
    const titleStyle = getComputedStyle(title);
    const glyphStyle = getComputedStyle(glyph);
    const titleRect = title.getBoundingClientRect();
    const glyphRect = glyph.getBoundingClientRect();
    const titleMatrix = titleStyle.transform && titleStyle.transform !== 'none'
      ? new DOMMatrixReadOnly(titleStyle.transform)
      : new DOMMatrixReadOnly();
    const glyphMatrix = glyphStyle.transform && glyphStyle.transform !== 'none'
      ? new DOMMatrixReadOnly(glyphStyle.transform)
      : new DOMMatrixReadOnly();
    const entranceState = glyph.__absRouteEntranceState || null;
    const auditAnimations = window.__ABS_BOOKEND_TITLE_AUDIT_ANIMATIONS__ || [];
    return {
      titleColor: titleStyle.color,
      titleOpacity: Number.parseFloat(titleStyle.opacity),
      titleFontSize: Number.parseFloat(titleStyle.fontSize),
      glyphColor: glyphStyle.color,
      glyphOpacity: Number.parseFloat(glyphStyle.opacity),
      glyphTransform: glyphStyle.transform,
      glyphWillChange: glyphStyle.willChange,
      inlineTransform: glyph.style.transform,
      inlineWillChange: glyph.style.willChange,
      animationCount: glyph.getAnimations().length,
      animationStates: glyph.getAnimations().map((animation) => animation.playState),
      auditAnimationTimes: auditAnimations.map((animation) => Number(animation.currentTime) || 0),
      endpoint: entranceState ? {
        phase: entranceState.phase,
        settled: entranceState.settled === true,
        startedAt: Number(entranceState.startedAt) || 0,
        delayMs: Number(entranceState.delayMs) || 0,
        durationMs: Number(entranceState.durationMs) || 0,
        travelPercent: Number(entranceState.travelPercent) || 0,
        finalOpacity: Number(entranceState.finalOpacity),
        finalColor: entranceState.finalColor || '',
      } : null,
      viewport: { width: innerWidth, height: innerHeight },
      horizontalCenterDelta: (titleRect.left + (titleRect.width * 0.5)) - (innerWidth * 0.5),
      titleMatrix: {
        a: titleMatrix.a,
        b: titleMatrix.b,
        c: titleMatrix.c,
        d: titleMatrix.d,
      },
      glyphMatrix: {
        a: glyphMatrix.a,
        b: glyphMatrix.b,
        c: glyphMatrix.c,
        d: glyphMatrix.d,
        translateX: glyphMatrix.e,
      },
      normalizedGlyphWidth: glyphRect.width / Math.max(1, Number.parseFloat(titleStyle.fontSize)),
      normalizedGlyphHeight: glyphRect.height / Math.max(1, Number.parseFloat(titleStyle.fontSize)),
      normalizedTravelX: glyphMatrix.e / Math.max(1, glyphRect.width),
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

async function readBookendTargetStates(page, selector) {
  return page.evaluate((titleSelector) => (
    [...document.querySelectorAll(titleSelector)]
      .map((title) => {
        const glyphs = [...title.querySelectorAll('[data-route-enter-glyph]')];
        if (glyphs.length === 0) return null;
        const titleStyle = getComputedStyle(title);
        return {
          text: title.getAttribute('aria-label') || title.textContent || '',
          titleColor: titleStyle.color,
          titleOpacity: Number.parseFloat(titleStyle.opacity),
          glyphs: glyphs.map((glyph) => {
            const glyphStyle = getComputedStyle(glyph);
            const state = glyph.__absRouteEntranceState || null;
            return {
              color: glyphStyle.color,
              opacity: Number.parseFloat(glyphStyle.opacity),
              finalColor: state?.finalColor || '',
              finalOpacity: Number(state?.finalOpacity),
              settled: state?.settled === true,
              transform: glyphStyle.transform,
              inlineTransform: glyph.style.transform,
              inlineWillChange: glyph.style.willChange,
              animationCount: glyph.getAnimations().length,
            };
          }),
        };
      })
      .filter(Boolean)
  ), selector);
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

function compareMetric(actual, expected, tolerance, label, details) {
  assert(
    Number.isFinite(actual)
      && Number.isFinite(expected)
      && Math.abs(actual - expected) <= tolerance,
    `${label}: expected ${expected} ± ${tolerance}, received ${actual}`,
    details,
  );
}

function assertTranslationOnly(matrix, label, details) {
  compareMetric(matrix.a, 1, 0.001, `${label} scale-x`, details);
  compareMetric(matrix.b, 0, 0.001, `${label} skew-y`, details);
  compareMetric(matrix.c, 0, 0.001, `${label} skew-x`, details);
  compareMetric(matrix.d, 1, 0.001, `${label} scale-y`, details);
}

async function pauseBookendTitleAnimations(page, selector) {
  await page.waitForFunction((titleSelector) => (
    [...document.querySelectorAll(titleSelector)].some((title) => (
      [...title.querySelectorAll('[data-route-enter-glyph]')].some((glyph) => (
        glyph.__absRouteEntranceState?.phase === 'playing'
          && glyph.__absRouteEntranceState?.settled !== true
          && glyph.getAnimations().length >= 2
      ))
    ))
  ), selector, { timeout: waitMs, polling: 'raf' });

  const animationCount = await page.evaluate((titleSelector) => {
    const animations = [];
    const seen = new Set();
    [...document.querySelectorAll(titleSelector)].forEach((title) => {
      title.getAnimations({ subtree: true }).forEach((animation) => {
        if (seen.has(animation) || animation.playState === 'idle') return;
        seen.add(animation);
        animation.pause();
        const timing = animation.effect?.getTiming?.() || {};
        const delayMs = Number(timing.delay) || 0;
        const durationMs = Number(timing.duration) || 0;
        animation.currentTime = delayMs + (durationMs * 0.5);
        animations.push(animation);
      });
    });
    window.__ABS_BOOKEND_TITLE_AUDIT_ANIMATIONS__ = animations;
    return animations.length;
  }, selector);
  assert(animationCount >= 2, 'Bookend title animations were unavailable for resize verification');
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
}

async function moveBookendTitleAnimationsToEndpoint(page) {
  await page.evaluate(() => {
    const animations = window.__ABS_BOOKEND_TITLE_AUDIT_ANIMATIONS__ || [];
    animations.forEach((animation) => {
      if (animation.playState === 'idle') return;
      animation.pause();
      const timing = animation.effect?.getTiming?.() || {};
      animation.currentTime = (Number(timing.delay) || 0) + (Number(timing.duration) || 0);
      const isColourAnimation = animation.effect?.getKeyframes?.()
        .some((keyframe) => Object.prototype.hasOwnProperty.call(keyframe, 'color'));
      if (isColourAnimation) {
        try {
          animation.finish();
        } catch {
          // The endpoint assertion below still catches a failed colour publish.
        }
      }
    });
  });
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
}

async function finishBookendTitleAnimations(page) {
  await page.evaluate(() => {
    const animations = window.__ABS_BOOKEND_TITLE_AUDIT_ANIMATIONS__ || [];
    animations.forEach((animation) => {
      if (animation.playState === 'idle') return;
      try {
        animation.finish();
      } catch {
        // A colour animation can cancel itself after publishing its endpoint.
      }
    });
  });
}

async function waitForTitleGeometryStable(page, selector) {
  await page.evaluate(async (titleSelector) => {
    const title = [...document.querySelectorAll(titleSelector)]
      .find((candidate) => candidate.querySelector('[data-route-enter-glyph]'));
    if (!title) throw new Error('Bookend title disappeared before geometry stability check.');
    const readRect = () => {
      const rect = title.getBoundingClientRect();
      return [rect.x, rect.y, rect.width, rect.height];
    };
    let previous = readRect();
    let stableFrames = 0;
    for (let frame = 0; frame < 180; frame += 1) {
      await new Promise((resolveFrame) => requestAnimationFrame(resolveFrame));
      const current = readRect();
      const stable = current.every((value, index) => Math.abs(value - previous[index]) <= 1 / 64);
      stableFrames = stable ? stableFrames + 1 : 0;
      if (stableFrames >= 6) return;
      previous = current;
    }
    throw new Error('Bookend title geometry did not settle after resize.');
  }, selector);
}

function assertResponsiveEntranceSample(sample, baseline, label) {
  const details = { baseline, sample };
  assert(sample?.endpoint?.phase === 'playing', `${label}: title entrance was not active`, details);
  assert(sample.endpoint.settled === false, `${label}: title settled during resize verification`, details);
  assert(Math.abs(sample.horizontalCenterDelta) <= 2, `${label}: title is not horizontally centred`, details);
  assertTranslationOnly(sample.titleMatrix, `${label} title`, details);
  assertTranslationOnly(sample.glyphMatrix, `${label} glyph`, details);
  compareMetric(sample.endpoint.startedAt, baseline.endpoint.startedAt, 0.001, `${label} start time`, details);
  compareMetric(sample.endpoint.delayMs, baseline.endpoint.delayMs, 0.001, `${label} delay`, details);
  compareMetric(sample.endpoint.durationMs, baseline.endpoint.durationMs, 0.001, `${label} duration`, details);
  compareMetric(sample.endpoint.travelPercent, baseline.endpoint.travelPercent, 0.001, `${label} travel`, details);
  compareMetric(sample.endpoint.finalOpacity, baseline.endpoint.finalOpacity, 0.001, `${label} final opacity`, details);
  assert(sample.endpoint.finalColor === baseline.endpoint.finalColor, `${label}: final colour changed`, details);
  assert(sample.glyphColor === baseline.glyphColor, `${label}: active glyph colour changed`, details);
  compareMetric(sample.normalizedTravelX, baseline.normalizedTravelX, 0.01, `${label} relative travel`, details);
  compareMetric(sample.normalizedGlyphWidth, baseline.normalizedGlyphWidth, 0.025, `${label} glyph width ratio`, details);
  compareMetric(sample.normalizedGlyphHeight, baseline.normalizedGlyphHeight, 0.025, `${label} glyph height ratio`, details);
  assert(
    sample.auditAnimationTimes.length === baseline.auditAnimationTimes.length
      && sample.auditAnimationTimes.every((time, index) => (
        Math.abs(time - baseline.auditAnimationTimes[index]) <= 0.01
      )),
    `${label}: resize changed the paused animation clock`,
    details,
  );
}

async function auditRoute(page, route) {
  console.log(`Auditing ${route.id} title settlement...`);
  await page.setViewportSize(START_VIEWPORT);
  await page.goto(url(route.path), { waitUntil: 'domcontentloaded', timeout: waitMs });
  if (route.canvasTitle) {
    await page.waitForFunction((selector) => {
      const root = document.documentElement;
      const titles = [...document.querySelectorAll(selector)];
      const glyphs = titles.flatMap((title) => (
        [...title.querySelectorAll('[data-route-enter-glyph]')]
      ));
      return root.dataset.absBootState === 'ready'
        && root.classList.contains('abs-home-post-boot-complete')
        && glyphs.length > 0
        && glyphs.every((glyph) => (
          glyph.__absRouteEntranceState?.settled === true
          && glyph.getAnimations().length === 0
          && glyph.style.transform === ''
          && glyph.style.willChange === ''
        ));
    }, route.selector, { timeout: waitMs });
    await page.waitForFunction(() => {
      const canvas = document.getElementById('simulation-title-canvas');
      const context = canvas?.getContext?.('2d', { willReadFrequently: true });
      if (!canvas || !context || canvas.width <= 0 || canvas.height <= 0) return false;
      const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
      for (let index = 3; index < pixels.length; index += 4) {
        if (pixels[index] > 0) return true;
      }
      return false;
    }, null, { timeout: 5000, polling: 250 });
    const settled = await readGlyphState(page, route.selector);
    const targets = await readBookendTargetStates(page, route.selector);
    assert(settled, `${route.id}: settled glyph state was unavailable`);
    assert(targets.length === 3, `${route.id}: expected all three Home title lines`, targets);
    assertIdentityTransform(settled.glyphTransform, `${route.id} settled endpoint`, settled);
    assert(settled.glyphColor === settled.titleColor, `${route.id}: settled glyph does not inherit title colour`, settled);
    assert(settled.glyphWillChange === 'auto', `${route.id}: glyph kept a compositor hint after cleanup`, settled);
    targets.forEach((target) => {
      target.glyphs.forEach((glyph) => {
        const details = { target, glyph };
        assert(glyph.settled, `${route.id}: glyph did not retain its settled state`, details);
        assert(glyph.animationCount === 0, `${route.id}: glyph animations remained attached`, details);
        assert(glyph.inlineTransform === '', `${route.id}: glyph kept an inline transform`, details);
        assert(glyph.inlineWillChange === '', `${route.id}: glyph kept a compositor hint`, details);
        assert(glyph.color === target.titleColor, `${route.id}: glyph colour changed at settlement`, details);
        assert(glyph.finalColor === target.titleColor, `${route.id}: cached glyph colour endpoint drifted`, details);
        compareMetric(
          glyph.finalOpacity,
          target.titleOpacity,
          0.001,
          `${route.id} ${target.text} opacity endpoint`,
          details,
        );
      });
    });
    await page.screenshot({ path: resolve(outputRoot, `${route.id}-settled.png`) });
    return {
      id: route.id,
      titleDelta: null,
      glyphDelta: null,
      color: settled.glyphColor,
      targetOpacities: targets.map((target) => target.titleOpacity),
      canvasTitle: true,
    };
  }

  await pauseBookendTitleAnimations(page, route.selector);
  const responsiveSamples = [];
  const baseline = await readGlyphState(page, route.selector);
  assert(baseline, `${route.id}: active glyph state was unavailable`);
  assertResponsiveEntranceSample(baseline, baseline, `${route.id}/1200x900`);
  responsiveSamples.push(baseline);

  for (const viewport of RESIZE_VIEWPORTS) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => new Promise((resolveFrame) => {
      requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
    }));
    const sample = await readGlyphState(page, route.selector);
    assertResponsiveEntranceSample(sample, baseline, `${route.id}/${viewport.width}x${viewport.height}`);
    responsiveSamples.push(sample);
    if (viewport.width === 390) {
      await page.screenshot({ path: resolve(outputRoot, `${route.id}-active-phone.png`) });
    }
  }

  await waitForTitleGeometryStable(page, route.selector);
  const stableActive = await readGlyphState(page, route.selector);
  assertResponsiveEntranceSample(stableActive, baseline, `${route.id}/stable-active`);
  responsiveSamples.push(stableActive);

  await moveBookendTitleAnimationsToEndpoint(page);
  const animated = await readGlyphState(page, route.selector);
  assert(animated, `${route.id}: animated endpoint was unavailable`);
  assert(animated.endpoint?.settled === false, `${route.id}: title cleaned up before endpoint capture`, animated);
  assertIdentityTransform(animated.glyphTransform, `${route.id} animated endpoint`, animated);
  assert(animated.glyphColor === animated.endpoint.finalColor, `${route.id}: animated colour missed its endpoint`, animated);
  compareMetric(
    animated.glyphOpacity,
    animated.endpoint.finalOpacity,
    0.001,
    `${route.id} animated opacity endpoint`,
    animated,
  );

  await finishBookendTitleAnimations(page);

  await page.waitForFunction((selector) => {
    const title = [...document.querySelectorAll(selector)]
      .find((candidate) => candidate.querySelector('[data-route-enter-glyph]'));
    const glyphs = [...(title?.querySelectorAll('[data-route-enter-glyph]') || [])];
    return glyphs.length > 0 && glyphs.every((glyph) => (
      glyph.__absRouteEntranceState?.settled === true
      && glyph.getAnimations().length === 0
      && glyph.style.transform === ''
      && glyph.style.willChange === ''
    ));
  }, route.selector, { timeout: waitMs });
  await page.evaluate(() => new Promise((resolveFrame) => {
    requestAnimationFrame(() => requestAnimationFrame(resolveFrame));
  }));
  const settled = await readGlyphState(page, route.selector);
  assert(settled, `${route.id}: settled glyph state was unavailable`);
  const workHeld = route.id === 'portfolio'
    && await page.locator('[data-work-publication="held"]').count() === 1;
  const descriptionSelector = workHeld ? null : route.descriptionSelector;
  if (descriptionSelector) {
    await page.waitForFunction((selector) => {
      const description = document.querySelector(selector);
      return description
        && description.getAnimations({ subtree: true }).length === 0
        && description.style.opacity === '';
    }, descriptionSelector, { timeout: waitMs, polling: 'raf' });
  }
  const description = await readDescriptionState(page, descriptionSelector);

  const titleDelta = rectDelta(animated.titleRect, settled.titleRect);
  const glyphDelta = rectDelta(animated.glyphRect, settled.glyphRect);
  const details = { animated, settled, titleDelta, glyphDelta, responsiveSamples };
  assertIdentityTransform(animated.glyphTransform, `${route.id} animated endpoint`, details);
  assertIdentityTransform(settled.glyphTransform, `${route.id} settled endpoint`, details);
  assert(animated.glyphColor === settled.glyphColor, `${route.id}: glyph colour changed during cleanup`, details);
  assert(settled.glyphColor === settled.titleColor, `${route.id}: settled glyph does not inherit title colour`, details);
  assert(settled.glyphWillChange === 'auto', `${route.id}: glyph kept a compositor hint after cleanup`, details);
  assert(settled.animationCount === 0, `${route.id}: glyph animations remained attached after cleanup`, details);
  if (descriptionSelector) {
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
    assert(Math.abs(value) <= 1 / 32, `${route.id}: title ${metric} changed during cleanup`, details);
  });
  Object.entries(glyphDelta).forEach(([metric, value]) => {
    assert(Math.abs(value) <= 1 / 32, `${route.id}: glyph ${metric} changed during cleanup`, details);
  });

  await page.screenshot({ path: resolve(outputRoot, `${route.id}-settled.png`) });
  return {
    id: route.id,
    titleDelta,
    glyphDelta,
    color: settled.glyphColor,
    descriptionOpacity: description?.opacity ?? null,
    responsiveSamples: responsiveSamples.map((sample) => ({
      viewport: sample.viewport,
      horizontalCenterDelta: sample.horizontalCenterDelta,
      finalOpacity: sample.endpoint.finalOpacity,
      normalizedTravelX: sample.normalizedTravelX,
    })),
  };
}

async function main() {
  assert(browserType, `Unsupported ABS_BROWSER "${browserName}". Expected chromium or webkit.`);
  const server = await ensureServer();
  const browser = await browserType.launch();
  const context = await browser.newContext({
    viewport: START_VIEWPORT,
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
