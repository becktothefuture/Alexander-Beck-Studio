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
const OPEN_CAPTURE_MS = [0, 80, 180, 320, 500, 700, 850];
const CLOSE_CAPTURE_MS = [0, 80, 180, 320, 520, 650];

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
      && document.getElementById('portfolioProjectMount')?.dataset?.portfolioEntrancePhase === 'complete'
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
    const generation = (window.__ABS_PORTFOLIO_TRANSITION_SAMPLE_GENERATION__ || 0) + 1;
    window.__ABS_PORTFOLIO_TRANSITION_SAMPLE_GENERATION__ = generation;
    window.__ABS_PORTFOLIO_TRANSITION_SAMPLES__ = [];
    let bridgeObserver = null;
    let sampleInterval = null;
    const stopSampling = () => {
      bridgeObserver?.disconnect();
      if (sampleInterval !== null) window.clearInterval(sampleInterval);
      sampleInterval = null;
    };
    const sample = (now, scheduleNext = true) => {
      if (window.__ABS_PORTFOLIO_TRANSITION_SAMPLE_GENERATION__ !== generation) {
        stopSampling();
        return;
      }
      const bridge = document.querySelector('.portfolio-project-media-bridge');
      const bridgeVisual = bridge?.querySelector('.portfolio-project-view__image');
      const bridgeMedia = bridge?.querySelector('.portfolio-project-view__image-motion');
      const bridgeVeil = bridge?.querySelector('.portfolio-project-media-bridge__source-veil');
      const heroVeil = document.querySelector('.portfolio-project-view__image-veil');
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
        bridgeMediaMode: bridge?.dataset?.mediaMode || 'image',
        bridgeMediaBackground: bridgeMedia ? getComputedStyle(bridgeMedia).backgroundColor : 'transparent',
        heroObjectPosition: document.querySelector('.portfolio-project-view__image')
          ? getComputedStyle(document.querySelector('.portfolio-project-view__image')).objectPosition
          : '',
        bridgeVeilBackgroundImage: bridgeVeil ? getComputedStyle(bridgeVeil).backgroundImage : 'none',
        bridgeVeilBackgroundColor: bridgeVeil ? getComputedStyle(bridgeVeil).backgroundColor : 'transparent',
        bridgeVeilOpacity: bridgeVeil ? Number(getComputedStyle(bridgeVeil).opacity) : 0,
        heroVeilOpacity: heroVeil ? Number(getComputedStyle(heroVeil).opacity) : 0,
        bridgeBoxShadow: bridgeStyle?.boxShadow || 'none',
        bridgeZIndex: bridgeStyle ? Number(bridgeStyle.zIndex) : 0,
        rootZIndex: rootStyle ? Number(rootStyle.zIndex) : 0,
        rootHandoffActive: Boolean(root?.classList.contains('is-shared-handoff')),
        handoffMediaCount: document.querySelectorAll('.portfolio-project-view__image-motion').length,
        drawerOpacity: drawerStyle ? Number(drawerStyle.opacity) : 0,
        heroOpacity: heroStyle ? Number(heroStyle.opacity) : 0,
        deckOpacity: deckStyle ? Number(deckStyle.opacity) : 0,
        heroMotionActive: Boolean(root?.classList.contains('is-hero-motion-active')),
      });
      if (scheduleNext && now - start < duration) requestAnimationFrame(sample);
      else if (now - start >= duration) stopSampling();
    };
    bridgeObserver = new MutationObserver(() => {
      if (!document.querySelector('.portfolio-project-media-bridge')) return;
      sample(performance.now(), false);
      bridgeObserver.disconnect();
    });
    bridgeObserver.observe(document.body, { childList: true, subtree: true });
    // WebKit can heavily coalesce requestAnimationFrame callbacks in headless mode.
    // Keep an independent cadence so the audit still observes intermediate WAAPI geometry.
    sampleInterval = window.setInterval(() => sample(performance.now(), false), 32);
    sample(performance.now());
  }, durationMs);
}

async function appendSettledFrameSample(page) {
  await page.evaluate(() => {
    window.__ABS_PORTFOLIO_TRANSITION_SAMPLE_GENERATION__ = (
      window.__ABS_PORTFOLIO_TRANSITION_SAMPLE_GENERATION__ || 0
    ) + 1;
    const samples = window.__ABS_PORTFOLIO_TRANSITION_SAMPLES__ || [];
    const previous = samples.at(-1) || {};
    const hero = document.querySelector('.portfolio-project-view__image-shell');
    const deck = document.querySelector('.portfolio-deck-stage');
    const root = document.getElementById('portfolioProjectView');
    samples.push({
      ...previous,
      atMs: Number((Number(previous.atMs) + 1 || 0).toFixed(2)),
      phase: window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.projectOpenPhase || '',
      bridgeRect: null,
      bridgeOpacity: 0,
      heroOpacity: hero ? Number(getComputedStyle(hero).opacity) : 0,
      deckOpacity: deck ? Number(getComputedStyle(deck).opacity) : 0,
      heroMotionActive: Boolean(root?.classList.contains('is-hero-motion-active')),
    });
    window.__ABS_PORTFOLIO_TRANSITION_SAMPLES__ = samples;
  });
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

function readColorAlpha(value) {
  if (!value || value === 'transparent') return 0;
  const channels = String(value).match(/[\d.]+/g)?.map(Number) || [];
  return channels.length >= 4 && Number.isFinite(channels[3]) ? channels[3] : 1;
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
    if (!(sample.bridgeZIndex < sample.rootZIndex) || !sample.rootHandoffActive) {
      failures.push(`${label}: shared media was not layered beneath the transparent project handoff surface`);
    }
    if (sample.handoffMediaCount !== 1) {
      failures.push(`${label}: expected one shared hero-media node, found ${sample.handoffMediaCount}`);
    }
    if (sample.bridgeMediaMode !== 'colour' && sample.bridgeVeilOpacity + sample.heroVeilOpacity < 0.8) {
      failures.push(`${label}: media darkening dropped out at ${sample.atMs}ms`);
    }
  });
  const firstBridge = bridgeSamples[0];
  if (
    firstBridge?.bridgeMediaMode === 'colour'
    && ['transparent', 'rgba(0, 0, 0, 0)'].includes(firstBridge.bridgeMediaBackground)
  ) {
    failures.push(`${label}: colour media bridge lost its solid fill`);
  } else if (firstBridge?.bridgeMediaMode !== 'colour') {
    if (['transparent', 'rgba(0, 0, 0, 0)'].includes(firstBridge?.bridgeVeilBackgroundColor)) {
      failures.push(`${label}: media bridge lost the solid thumbnail veil`);
    } else if (readColorAlpha(firstBridge?.bridgeVeilBackgroundColor) < 0.08) {
      failures.push(`${label}: media bridge thumbnail veil is too faint`);
    }
    if (firstBridge?.bridgeVeilBackgroundImage !== 'none') {
      failures.push(`${label}: media bridge retained a thumbnail gradient`);
    }
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

function validateCloseSamples(samples, label, failures) {
  const bridgeSamples = samples.filter((sample) => sample.bridgeRect && sample.bridgeOpacity > 0.01);
  if (bridgeSamples.length < 3) failures.push(`${label}: reverse handoff was not sampled across enough frames`);
  bridgeSamples.forEach((sample) => {
    if (sample.handoffMediaCount !== 1) {
      failures.push(`${label}: reverse handoff duplicated the hero-media node`);
    }
    if (sample.heroMotionActive) {
      failures.push(`${label}: hero parallax remained active during reverse handoff`);
    }
  });
  for (let index = 1; index < bridgeSamples.length; index += 1) {
    const previous = bridgeSamples[index - 1].bridgeRect;
    const current = bridgeSamples[index].bridgeRect;
    if (current.width > previous.width + 2 || current.height > previous.height + 2) {
      failures.push(`${label}: reverse handoff geometry moved away from the card target`);
      break;
    }
  }
}

async function assertCleanClosedState(page, label, failures, expectedFocusIndex = null) {
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
  if (expectedFocusIndex !== null && state.focusedProjectIndex !== expectedFocusIndex) {
    failures.push(`${label}: focus returned to project ${state.focusedProjectIndex}, expected ${expectedFocusIndex}`);
  }
  return state;
}

async function closeProject(page, method) {
  if (method === 'escape') {
    await page.keyboard.press('Escape');
  } else if (method === 'backdrop') {
    await page.locator('.portfolio-project-view__backdrop').dispatchEvent('pointerdown');
  } else {
    await page.locator('.portfolio-project-view__back--top').click({ timeout: WAIT_MS });
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
    if (message.type() !== 'error') return;
    const location = message.location();
    const source = location?.url ? ` (${location.url})` : '';
    consoleErrors.push(`${message.text()}${source}`);
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
        await page.waitForFunction(() => {
          const root = document.getElementById('portfolioProjectView');
          const hero = document.querySelector('.portfolio-project-view__image-shell');
          return root?.classList.contains('is-hero-motion-active')
            && Number.parseFloat(getComputedStyle(hero).opacity || '0') > 0.95;
        }, null, { timeout: WAIT_MS });
        await page.waitForTimeout(320);
        await appendSettledFrameSample(page);
        const openSamples = await page.evaluate(() => window.__ABS_PORTFOLIO_TRANSITION_SAMPLES__ || []);
        validateOpenSamples(
          openSamples,
          label,
          failures,
          !(cycle === 0 && projectIndex === 0),
        );

        const closeMethod = ['button', 'escape', 'backdrop'][(cycle + projectIndex) % 3];
        await startFrameSampler(page, 900);
        let closeCaptures = [];
        if (CAPTURE_STILLS && cycle === 0 && projectIndex === 0) {
          const closePromise = captureTimedFrames(page, `${viewport.name}-close`, CLOSE_CAPTURE_MS);
          await closeProject(page, closeMethod);
          closeCaptures = await closePromise;
          viewportSummary.captures.close = closeCaptures;
        } else {
          await closeProject(page, closeMethod);
        }
        await page.waitForTimeout(80);
        const closeSamples = await page.evaluate(() => window.__ABS_PORTFOLIO_TRANSITION_SAMPLES__ || []);
        validateCloseSamples(closeSamples, `${label}/close`, failures);
        const closedState = await assertCleanClosedState(page, label, failures);
        viewportSummary.cycles.push({
          cycle,
          projectIndex,
          closeMethod,
          sampleCount: openSamples.length,
          closeSampleCount: closeSamples.length,
          closedState,
        });
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

    await selectProject(page, Math.min(1, projectCount - 1));
    await startFrameSampler(page);
    await page.locator('.portfolio-project-card.is-active').focus();
    await page.keyboard.press('Enter');
    await page.waitForFunction(
      () => window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.projectOpenPhase === 'open',
      null,
      { timeout: WAIT_MS },
    );
    const keyboardSamples = await page.evaluate(() => window.__ABS_PORTFOLIO_TRANSITION_SAMPLES__ || []);
    if (keyboardSamples.filter((sample) => sample.bridgeRect).length < 3) {
      failures.push(`${viewport.name}/keyboard: shared-media handoff did not run`);
    }
    await closeProject(page, 'escape');
    await assertCleanClosedState(
      page,
      `${viewport.name}/keyboard`,
      failures,
      Math.min(1, projectCount - 1),
    );

    await selectProject(page, Math.min(1, projectCount - 1));
    await page.locator('.portfolio-project-card.is-active').click({ timeout: WAIT_MS });
    await page.waitForFunction(
      () => window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.projectOpenPhase === 'open',
      null,
      { timeout: WAIT_MS },
    );
    await page.evaluate(() => {
      const scroll = document.querySelector('.portfolio-project-view__scroll');
      const hero = document.querySelector('.portfolio-project-view__hero');
      if (scroll && hero) scroll.scrollTop = hero.getBoundingClientRect().height * 0.65;
    });
    await startFrameSampler(page, 500);
    await closeProject(page, 'button');
    await page.waitForTimeout(80);
    const scrolledCloseSamples = await page.evaluate(() => window.__ABS_PORTFOLIO_TRANSITION_SAMPLES__ || []);
    if (scrolledCloseSamples.some((sample) => sample.bridgeRect)) {
      failures.push(`${viewport.name}/scrolled-close: direct close unexpectedly created a media bridge`);
    }
    await assertCleanClosedState(page, `${viewport.name}/scrolled-close`, failures);

    await selectProject(page, 0);
    await page.locator('.portfolio-project-card.is-active').click({ timeout: WAIT_MS });
    await page.waitForTimeout(100);
    await page.setViewportSize({ width: Math.max(320, viewport.width - 1), height: viewport.height });
    await page.waitForFunction(
      () => window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.projectOpenPhase === 'open',
      null,
      { timeout: WAIT_MS },
    );
    const resizeState = await page.evaluate(() => ({
      bridgeCount: document.querySelectorAll('.portfolio-project-media-bridge').length,
      mediaCount: document.querySelectorAll('.portfolio-project-view__image-motion').length,
    }));
    if (resizeState.bridgeCount !== 0 || resizeState.mediaCount !== 1) {
      failures.push(`${viewport.name}/resize: handoff did not settle to one clean hero-media node`);
    }
    await closeProject(page, 'escape');
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await waitForCarousel(page);

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
