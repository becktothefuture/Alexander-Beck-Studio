/**
 * Frame-sampled portfolio card → hero transition stress audit.
 *
 * Run against dev or preview:
 * ABS_DEV_URL=http://localhost:8013 ABS_BROWSER=chromium npm run audit:portfolio-transition
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 30000);
const CYCLES = Math.max(1, Number(process.env.ABS_PORTFOLIO_TRANSITION_CYCLES || 3));
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const BROWSER_TYPE = BROWSER_NAME === 'webkit' ? webkit : chromium;
const CAPTURE_STILLS = process.env.ABS_PORTFOLIO_TRANSITION_CAPTURE_STILLS === '1';
const ARTIFACT_ROOT = path.resolve(
  process.cwd(),
  process.env.ABS_PORTFOLIO_TRANSITION_ARTIFACT_DIR
    || `output/playwright/portfolio-project-transition-${BROWSER_NAME}`,
);
const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, cycles: CYCLES },
  { name: 'mobile', width: 390, height: 844, cycles: Math.max(1, Math.min(CYCLES, 2)) },
];
const OPEN_CAPTURE_MS = [0, 60, 120, 180, 240, 320, 420, 600];
const CLOSE_CAPTURE_MS = [0, 60, 120, 180, 260, 400];

function resolvePortfolioUrl() {
  const raw = (process.env.ABS_DEV_URL || 'http://localhost:8013').trim().replace(/\/+$/, '');
  const url = /\.html(?:[?#]|$)/i.test(raw) ? new URL(raw) : new URL(`${raw}/portfolio.html`);
  if (!/portfolio\.html$/i.test(url.pathname)) url.pathname = '/portfolio.html';
  return url.toString();
}

async function waitForCarousel(page) {
  await page.waitForSelector('.portfolio-project-card.is-active', { state: 'visible', timeout: WAIT_MS });
  await page.waitForFunction(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    const snapshot = app?.getDeckDebugSnapshot?.();
    return Boolean(
      app
      && snapshot?.isSettled
      && snapshot?.inputState === 'idle'
      && document.body.dataset.portfolioLoadState === 'loaded'
    );
  }, null, { timeout: WAIT_MS });
}

async function selectProject(page, projectIndex) {
  await page.evaluate((index) => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    app?.setActiveProject?.(index, { immediate: true, focus: false, announce: false });
  }, projectIndex);
  await page.waitForFunction((index) => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    const active = document.querySelector('.portfolio-project-card.is-active');
    return Boolean(
      app?.getDeckDebugSnapshot?.()?.isSettled
      && Number(active?.dataset?.projectIndex) === index
    );
  }, projectIndex, { timeout: WAIT_MS });
}

async function startFrameSampler(page, durationMs = 1200) {
  await page.evaluate((duration) => {
    const readRect = (element) => {
      const rect = element?.getBoundingClientRect?.();
      if (!rect) return null;
      return {
        left: Number(rect.left.toFixed(2)),
        top: Number(rect.top.toFixed(2)),
        width: Number(rect.width.toFixed(2)),
        height: Number(rect.height.toFixed(2)),
      };
    };
    const start = performance.now();
    window.__ABS_PORTFOLIO_TRANSITION_SAMPLES__ = [];
    const sample = (now) => {
      const bridge = document.querySelector('.portfolio-project-media-bridge');
      const bridgeVisual = bridge?.querySelector('.portfolio-project-card__image, .portfolio-project-card__video');
      const bridgeVeil = bridge?.querySelector('.portfolio-project-card__media-veil');
      const drawer = document.querySelector('.portfolio-project-view__drawer');
      const hero = document.querySelector('.portfolio-project-view__image-shell');
      const deck = document.querySelector('.portfolio-deck-stage');
      const root = document.getElementById('portfolioProjectView');
      const bridgeStyle = bridge ? getComputedStyle(bridge) : null;
      const rootStyle = root ? getComputedStyle(root) : null;
      const drawerStyle = drawer ? getComputedStyle(drawer) : null;
      const heroStyle = hero ? getComputedStyle(hero) : null;
      const deckStyle = deck ? getComputedStyle(deck) : null;
      window.__ABS_PORTFOLIO_TRANSITION_SAMPLES__.push({
        atMs: Number((now - start).toFixed(2)),
        phase: window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.projectOpenPhase || '',
        bridgeRect: readRect(bridge),
        bridgeOpacity: bridgeStyle ? Number(bridgeStyle.opacity) : 0,
        bridgeTransform: bridgeStyle?.transform || 'none',
        bridgeObjectPosition: bridgeVisual ? getComputedStyle(bridgeVisual).objectPosition : '',
        heroObjectPosition: document.querySelector('.portfolio-project-view__image')
          ? getComputedStyle(document.querySelector('.portfolio-project-view__image')).objectPosition
          : '',
        bridgeVeilBackground: bridgeVeil ? getComputedStyle(bridgeVeil).backgroundImage : 'none',
        bridgeBoxShadow: bridgeStyle?.boxShadow || 'none',
        bridgeZIndex: bridgeStyle ? Number(bridgeStyle.zIndex) : 0,
        rootZIndex: rootStyle ? Number(rootStyle.zIndex) : 0,
        drawerOpacity: drawerStyle ? Number(drawerStyle.opacity) : 0,
        heroOpacity: heroStyle ? Number(heroStyle.opacity) : 0,
        deckOpacity: deckStyle ? Number(deckStyle.opacity) : 0,
        heroMotionActive: Boolean(root?.classList.contains('is-hero-motion-active')),
      });
      if (now - start < duration) requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, durationMs);
}

async function captureTimedFrames(page, prefix, times) {
  const startedAt = Date.now();
  const captures = [];
  for (const targetMs of times) {
    const remaining = targetMs - (Date.now() - startedAt);
    if (remaining > 0) await page.waitForTimeout(remaining);
    const actualMs = Date.now() - startedAt;
    const file = `${prefix}-${String(targetMs).padStart(3, '0')}-${String(actualMs).padStart(3, '0')}.png`;
    await page.screenshot({ path: path.join(ARTIFACT_ROOT, file) });
    captures.push({ targetMs, actualMs, file });
  }
  return captures;
}

function validateOpenSamples(samples, label, failures, requireFrameDensity = true) {
  const bridgeSamples = samples.filter((sample) => sample.bridgeRect && sample.bridgeOpacity > 0.01);
  if (requireFrameDensity && bridgeSamples.length < 3) {
    failures.push(`${label}: media bridge was not sampled across enough frames`);
  }
  bridgeSamples.forEach((sample) => {
    if (sample.bridgeTransform !== 'none' && sample.bridgeTransform !== 'matrix(1, 0, 0, 1, 0, 0)') {
      failures.push(`${label}: bridge used a transform at ${sample.atMs}ms (${sample.bridgeTransform})`);
    }
    if (sample.heroMotionActive) {
      failures.push(`${label}: hero parallax started before the bridge handoff completed`);
    }
    if (!(sample.bridgeZIndex > sample.rootZIndex)) {
      failures.push(`${label}: media bridge did not stack above the project view`);
    }
  });
  const firstBridge = bridgeSamples[0];
  if (firstBridge?.bridgeVeilBackground === 'none') {
    failures.push(`${label}: media bridge lost the thumbnail veil`);
  }
  if (firstBridge?.bridgeBoxShadow === 'none') {
    failures.push(`${label}: media bridge lost the thumbnail contact shadow`);
  }
  const lastBridge = bridgeSamples.at(-1);
  const readPosition = (value) => String(value || '').match(/-?\d+(?:\.\d+)?/g)?.map(Number) || [];
  const bridgePosition = readPosition(lastBridge?.bridgeObjectPosition);
  const heroPosition = readPosition(lastBridge?.heroObjectPosition);
  if (
    bridgePosition.length >= 2
    && heroPosition.length >= 2
    && Math.hypot(bridgePosition[0] - heroPosition[0], bridgePosition[1] - heroPosition[1]) > 2
  ) {
    failures.push(`${label}: media bridge crop did not reconcile to the hero crop`);
  }
  if (requireFrameDensity) {
    samples.forEach((sample) => {
      if (Math.max(sample.deckOpacity, sample.bridgeOpacity, sample.heroOpacity) < 0.04) {
        failures.push(`${label}: blank continuity frame at ${sample.atMs}ms`);
      }
    });
  }
  if (requireFrameDensity) {
    const final = samples.at(-1);
    if (!final || final.phase !== 'open' || !final.heroMotionActive || final.heroOpacity < 0.95) {
      failures.push(`${label}: final open state did not settle with the hero and parallax active`);
    }
  }
}

async function assertCleanClosedState(page, label, failures) {
  const state = await page.evaluate(() => {
    const app = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.();
    return {
      bodyOpen: document.body.classList.contains('portfolio-project-open'),
      bodyClosing: document.body.classList.contains('portfolio-project-closing'),
      bridgeCount: document.querySelectorAll('.portfolio-project-media-bridge').length,
      drawerCount: document.querySelectorAll('#portfolioProjectView').length,
      drawerHidden: document.getElementById('portfolioProjectView')?.getAttribute('aria-hidden'),
      deckInert: Boolean(document.querySelector('.portfolio-deck-stage')?.inert),
      phase: app?.projectOpenPhase || '',
      focusedProjectIndex: Number(document.activeElement?.dataset?.projectIndex),
    };
  });
  if (state.bodyOpen || state.bodyClosing) failures.push(`${label}: stale body transition class`);
  if (state.bridgeCount !== 0) failures.push(`${label}: ${state.bridgeCount} bridge node(s) remained`);
  if (state.drawerCount !== 1 || state.drawerHidden !== 'true') failures.push(`${label}: drawer cleanup mismatch`);
  if (state.deckInert) failures.push(`${label}: deck remained inert after close`);
  if (state.phase !== 'closed') failures.push(`${label}: phase remained ${state.phase}`);
  return state;
}

async function closeProject(page, method) {
  if (method === 'escape') {
    await page.keyboard.press('Escape');
  } else if (method === 'backdrop') {
    await page.locator('.portfolio-project-view__backdrop').dispatchEvent('pointerdown');
  } else {
    await page.locator('.portfolio-project-view__close').click({ timeout: WAIT_MS });
  }
  await page.waitForFunction(
    () => !document.body.classList.contains('portfolio-project-open'),
    null,
    { timeout: WAIT_MS },
  );
}

async function captureVisualVideo(browser, portfolioUrl) {
  const videoDir = path.join(ARTIFACT_ROOT, 'video-tmp');
  await fs.mkdir(videoDir, { recursive: true });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    recordVideo: {
      dir: videoDir,
      size: { width: 390, height: 844 },
    },
  });
  await context.addCookies([{
    name: 'abs_portfolio_ok',
    value: '1',
    url: new URL('/', portfolioUrl).toString(),
    sameSite: 'Lax',
  }]);
  await context.addInitScript(() => {
    window.sessionStorage.setItem('abs_portfolio_ok', String(Date.now()));
  });
  const page = await context.newPage();
  await page.goto(portfolioUrl, { waitUntil: 'networkidle', timeout: 60000 });
  await waitForCarousel(page);
  await selectProject(page, 0);
  const video = page.video();
  await page.locator('.portfolio-project-card.is-active').click({ timeout: WAIT_MS });
  await page.waitForFunction(
    () => window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.projectOpenPhase === 'open',
    null,
    { timeout: WAIT_MS },
  );
  await page.waitForTimeout(500);
  await closeProject(page, 'button');
  await page.waitForTimeout(450);
  await context.close();
  const sourcePath = await video.path();
  const targetPath = path.join(ARTIFACT_ROOT, 'visual-open-close.webm');
  await fs.copyFile(sourcePath, targetPath);
  return path.basename(targetPath);
}

async function main() {
  await fs.mkdir(ARTIFACT_ROOT, { recursive: true });
  const browser = await BROWSER_TYPE.launch();
  const context = await browser.newContext();
  const portfolioUrl = resolvePortfolioUrl();
  await context.addCookies([{
    name: 'abs_portfolio_ok',
    value: '1',
    url: new URL('/', portfolioUrl).toString(),
    sameSite: 'Lax',
  }]);
  await context.addInitScript(() => {
    window.sessionStorage.setItem('abs_portfolio_ok', String(Date.now()));
  });
  const page = await context.newPage();
  const failures = [];
  const pageErrors = [];
  const consoleErrors = [];
  const summary = { browser: BROWSER_NAME, viewports: {}, failures };
  page.on('pageerror', (error) => pageErrors.push(String(error?.stack || error)));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(portfolioUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await waitForCarousel(page);
    const projectCount = await page.locator('.portfolio-project-card').evaluateAll((cards) => (
      new Set(cards.map((card) => Number(card.dataset.projectIndex))).size
    ));
    const viewportSummary = { projectCount, cycles: [], captures: {} };
    summary.viewports[viewport.name] = viewportSummary;

    for (let cycle = 0; cycle < viewport.cycles; cycle += 1) {
      for (let projectIndex = 0; projectIndex < projectCount; projectIndex += 1) {
        const label = `${viewport.name}/cycle-${cycle + 1}/project-${projectIndex}`;
        await selectProject(page, projectIndex);
        await startFrameSampler(page);
        await page.locator('.portfolio-project-card.is-active').click({ timeout: WAIT_MS });
        let openCaptures = [];
        if (CAPTURE_STILLS && cycle === 0 && projectIndex === 0) {
          openCaptures = await captureTimedFrames(page, `${viewport.name}-open`, OPEN_CAPTURE_MS);
          viewportSummary.captures.open = openCaptures;
        }
        await page.waitForFunction(
          () => window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.projectOpenPhase === 'open',
          null,
          { timeout: WAIT_MS },
        );
        await page.waitForTimeout(320);
        const openSamples = await page.evaluate(() => window.__ABS_PORTFOLIO_TRANSITION_SAMPLES__ || []);
        validateOpenSamples(
          openSamples,
          label,
          failures,
          !(cycle === 0 && projectIndex === 0),
        );

        const closeMethod = ['button', 'escape', 'backdrop'][(cycle + projectIndex) % 3];
        let closeCaptures = [];
        if (CAPTURE_STILLS && cycle === 0 && projectIndex === 0) {
          const closePromise = captureTimedFrames(page, `${viewport.name}-close`, CLOSE_CAPTURE_MS);
          await closeProject(page, closeMethod);
          closeCaptures = await closePromise;
          viewportSummary.captures.close = closeCaptures;
        } else {
          await closeProject(page, closeMethod);
        }
        const closedState = await assertCleanClosedState(page, label, failures);
        viewportSummary.cycles.push({ cycle, projectIndex, closeMethod, sampleCount: openSamples.length, closedState });
      }
    }

    await selectProject(page, 0);
    await page.locator('.portfolio-project-card.is-active').click({ timeout: WAIT_MS });
    await page.waitForTimeout(80);
    await page.keyboard.press('Escape');
    await page.waitForFunction(
      () => !document.body.classList.contains('portfolio-project-open'),
      null,
      { timeout: WAIT_MS },
    );
    viewportSummary.interrupted = await assertCleanClosedState(
      page,
      `${viewport.name}/close-during-open`,
      failures,
    );

    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(portfolioUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await waitForCarousel(page);
    await selectProject(page, 0);
    await page.locator('.portfolio-project-card.is-active').click({ timeout: WAIT_MS });
    await page.waitForFunction(
      () => document.getElementById('portfolioProjectView')?.classList.contains('is-open'),
      null,
      { timeout: WAIT_MS },
    );
    viewportSummary.reducedMotion = await page.evaluate(() => ({
      bridgeCount: document.querySelectorAll('.portfolio-project-media-bridge').length,
      heroAnimationName: getComputedStyle(
        document.querySelector('.portfolio-project-view__image-motion'),
      ).animationName,
      bodyOpen: document.body.classList.contains('portfolio-project-open'),
    }));
    if (viewportSummary.reducedMotion.bridgeCount !== 0) {
      failures.push(`${viewport.name}/reduced-motion: media bridge should not travel`);
    }
    if (viewportSummary.reducedMotion.heroAnimationName !== 'none') {
      failures.push(`${viewport.name}/reduced-motion: hero ambient motion remained active`);
    }
    await closeProject(page, 'escape');
    await assertCleanClosedState(page, `${viewport.name}/reduced-motion`, failures);
    await page.emulateMedia({ reducedMotion: 'no-preference' });
  }

  summary.visualVideo = await captureVisualVideo(browser, portfolioUrl);
  summary.pageErrors = pageErrors;
  summary.consoleErrors = consoleErrors;
  if (pageErrors.length) failures.push(`${pageErrors.length} page error(s)`);
  if (consoleErrors.length) failures.push(`${consoleErrors.length} console error(s)`);
  await fs.writeFile(path.join(ARTIFACT_ROOT, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  await browser.close();

  if (failures.length) {
    console.error(JSON.stringify(summary, null, 2));
    throw new Error(`Portfolio project transition audit failed with ${failures.length} issue(s)`);
  }
  console.error(
    `PASS: ${BROWSER_NAME} portfolio transition stress audit (${VIEWPORTS.map((item) => `${item.name}:${item.cycles}`).join(', ')})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
