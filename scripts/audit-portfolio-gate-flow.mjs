#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const WAIT_MS = Number(process.env.ABS_CANVAS_WAIT_MS || 30000);
const INVITE_CODE = process.env.ABS_PORTFOLIO_CODE || '739284';
const DESKTOP_GATE_BLUR_PX = 17.16;
const MOBILE_GATE_BLUR_PX = 31.2;
const GATE_SCENE_OPACITY = 0.5;
const GATE_STATIC_POSTERS = new Set([
  'chapter-1-1.webp',
  'chapter-4-1.webp',
  'chapter-5-1.webp',
  'chapter-6-2.webp',
]);
const __dirname = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(__dirname, '..', 'output', 'playwright', 'portfolio-gate-audit');

function origin() {
  return new URL(String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8013')).origin;
}

function url(pathname) {
  return new URL(pathname, origin()).toString();
}

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

function trackLockedPortfolioRequests(page) {
  const blockedRequests = [];
  const posterRequests = [];
  const handler = (request) => {
    const requestUrl = request.url();
    const pathname = new URL(requestUrl).pathname;
    if (
      requestUrl.includes('contents-portfolio.json')
      || requestUrl.includes('/video/')
    ) {
      blockedRequests.push(requestUrl);
      return;
    }
    if (pathname.includes('/images/portfolio/pages/')) {
      const filename = pathname.split('/').at(-1) || '';
      if (GATE_STATIC_POSTERS.has(filename)) {
        posterRequests.push(requestUrl);
      } else {
        blockedRequests.push(requestUrl);
      }
    }
  };
  page.on('request', handler);
  return {
    blockedRequests,
    posterRequests,
    stop: () => page.off('request', handler),
  };
}

async function waitForIdle(page) {
  await page.waitForFunction(
    () => (
      (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
      && (() => {
        const overlay = document.getElementById('abs-boot-overlay');
        if (!overlay) return true;
        const styles = getComputedStyle(overlay);
        return styles.display === 'none' || styles.visibility === 'hidden' || Number.parseFloat(styles.opacity || '1') < 0.02;
      })()
      && document.documentElement.dataset.absBootState !== 'booting'
    ),
    undefined,
    { timeout: WAIT_MS, polling: 50 },
  );
}

async function waitForCanvasBuffer(page) {
  await page.waitForFunction(
    () => {
      const canvas = document.getElementById('c');
      if (!canvas) return false;
      const cssWidth = canvas.clientWidth || 0;
      const cssHeight = canvas.clientHeight || 0;
      if (cssWidth < 64 || cssHeight < 64) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      return canvas.width >= Math.floor(cssWidth * dpr) && canvas.height >= Math.floor(cssHeight * dpr);
    },
    undefined,
    { timeout: WAIT_MS },
  );
}

async function readState(page) {
  return page.evaluate(() => {
    const styleOf = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const styles = getComputedStyle(element);
      return {
        zIndex: Number.parseInt(styles.zIndex || '0', 10) || 0,
        opacity: Number.parseFloat(styles.opacity || '0'),
        visibility: styles.visibility,
        pointerEvents: styles.pointerEvents,
        filter: styles.filter,
        backdropFilter: styles.backdropFilter || styles.webkitBackdropFilter || '',
        transform: styles.transform,
      };
    };
    const rectOf = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      };
    };
    const sim = rectOf('#simulations');
    const band = rectOf('[data-button-bar]') || rectOf('[data-shell-bottom-band]');
    const host = rectOf('#portfolio-sheet-host');
    const finish = rectOf('.studio-window-finish-layer');
    const gateInner = rectOf('.portfolio-gate-route__inner');
    const gateInputs = rectOf('.portfolio-gate-inputs');
    const deck = document.getElementById('portfolioProjectMount');
    const activeDeckCard = deck?.querySelector('[data-deck-visual-slot="front"]');
    const root = document.documentElement;
    const body = document.body;
    const scene = document.querySelector('[data-portfolio-gate-scene]');
    const canvas = document.getElementById('c');
    const canvasReady = Boolean(
      canvas
      && canvas.clientWidth >= 64
      && canvas.clientHeight >= 64
      && canvas.width >= Math.floor(canvas.clientWidth * Math.min(window.devicePixelRatio || 1, 2))
      && canvas.height >= Math.floor(canvas.clientHeight * Math.min(window.devicePixelRatio || 1, 2))
    );
    const colorOf = (selector) => {
      const element = document.querySelector(selector);
      return element ? getComputedStyle(element).color : null;
    };
    const resolveTokenColor = (name) => {
      const probe = document.createElement('span');
      probe.style.color = `var(${name})`;
      probe.hidden = true;
      document.body.appendChild(probe);
      const color = getComputedStyle(probe).color;
      probe.remove();
      return color;
    };
    const blurLayer = document.getElementById('window-overlay-blur-layer');
    const visibleCardRects = (selector, keyFor) => Array.from(document.querySelectorAll(selector))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        const styles = getComputedStyle(element);
        return {
          key: keyFor(element),
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          opacity: Number.parseFloat(styles.opacity || '0'),
          visibility: styles.visibility,
        };
      })
      .filter((card) => (
        card.width > 0
        && card.height > 0
        && card.opacity > 0.1
        && card.visibility !== 'hidden'
        && sim
        && card.left < sim.right
        && card.left + card.width > sim.left
      ))
      .sort((left, right) => left.left - right.left);
    return {
      path: location.pathname,
      search: location.search,
      phase: document.documentElement.dataset.absTransitionPhase || 'idle',
      wake: document.documentElement.dataset.absInstrumentWake || '',
      bodyClass: document.body.className,
      activeTab: document.querySelector('[data-route-tab][aria-current="page"]')?.getAttribute('data-route-tab') || '',
      lockedGate: Boolean(document.querySelector('[data-route-content="portfolio-gate"]')),
      scene: Boolean(scene),
      sceneBridge: Boolean(document.querySelector('[data-portfolio-gate-scene-bridge]')),
      sceneFocusableCount: document.querySelectorAll('[data-portfolio-gate-scene] a, [data-portfolio-gate-scene] button, [data-portfolio-gate-scene] input, [data-portfolio-gate-scene] [tabindex]').length,
      sceneImageCount: scene?.querySelectorAll('img, picture, source').length || 0,
      sceneCardCopyCount: scene?.querySelectorAll('.portfolio-gate-scene__card-copy').length || 0,
      sceneStaticPosterCount: Array.from(scene?.querySelectorAll('.portfolio-gate-scene__card-art') || [])
        .filter((cardArt) => getComputedStyle(cardArt).backgroundImage.includes('/images/portfolio/pages/'))
        .length,
      sceneAnimationName: scene ? getComputedStyle(scene).animationName : '',
      sceneText: scene?.textContent?.trim() || '',
      sceneCards: visibleCardRects(
        '.portfolio-gate-scene__card',
        (card) => Array.from(card.classList).find((name) => name.startsWith('portfolio-gate-scene__card--')) || '',
      ),
      deck: Boolean(deck),
      deckPrepared: deck?.classList.contains('is-portfolio-boot-preparing') || false,
      deckVisible: deck?.classList.contains('is-portfolio-deck-visible') || false,
      deckRevealing: deck?.classList.contains('is-portfolio-deck-revealing') || false,
      deckCards: visibleCardRects(
        '.portfolio-project-card',
        (card) => `${card.dataset.projectId || 'project'}:${card.dataset.deckDepth || ''}`,
      ),
      activeCardRevealDelay: activeDeckCard
        ? Number.parseFloat(getComputedStyle(activeDeckCard).getPropertyValue('--portfolio-card-reveal-delay') || '0')
        : null,
      labels: document.querySelectorAll('.portfolio-project-label, .portfolio-deck-card').length,
      oldPortfolioModal: Boolean(document.querySelector('#portfolio-modal.active')),
      cookie: document.cookie,
      sessionAccess: sessionStorage.getItem('abs_portfolio_ok'),
      storedTheme: localStorage.getItem('theme-preference-v3'),
      rootTheme: root.getAttribute('data-abs-theme'),
      bodyTheme: body.getAttribute('data-abs-theme'),
      rootDark: root.classList.contains('dark-mode'),
      bodyDark: body.classList.contains('dark-mode'),
      colorScheme: getComputedStyle(root).colorScheme,
      reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches,
      gatePulse: document.querySelector('.portfolio-gate-inputs')?.classList.contains('pulse-energy') || false,
      canvasReady,
      gateColors: {
        route: colorOf('.portfolio-gate-route'),
        kicker: colorOf('.portfolio-gate-route .route-kicker'),
        title: colorOf('.portfolio-gate-route .route-centered-page__title'),
        description: colorOf('.portfolio-gate-route .route-centered-page__description'),
        input: colorOf('.portfolio-gate-route .portfolio-digit'),
      },
      gateTokens: {
        textPrimary: resolveTokenColor('--text-primary'),
        textInput: resolveTokenColor('--text-input'),
      },
      blurBackground: blurLayer ? getComputedStyle(blurLayer).backgroundColor : null,
      sim,
      band,
      host,
      windowBlur: styleOf('#window-overlay-blur-layer'),
      windowContent: styleOf('#window-overlay-content-layer'),
      windowFinish: styleOf('.studio-window-finish-layer'),
      wallEdge: styleOf('.inner-wall-gradient-edge'),
      wallSurface: styleOf('#shell-wall-slot'),
      heroSurface: styleOf('#shell-hero-slot'),
      deckSurface: styleOf('#portfolioProjectMount'),
      gateSurface: styleOf('.portfolio-gate-route'),
      gateTitleSurface: styleOf('.portfolio-gate-route .route-centered-page__title'),
      sceneSurface: styleOf('[data-portfolio-gate-scene]'),
      sceneBridgeSurface: styleOf('[data-portfolio-gate-scene-bridge]'),
      gateLayoutOk: Boolean(
        sim
        && gateInner
        && gateInputs
        && gateInner.left >= sim.left - 1
        && gateInner.top >= sim.top - 1
        && gateInner.right <= sim.right + 1
        && gateInner.bottom <= sim.bottom + 1
        && gateInputs.left >= sim.left - 1
        && gateInputs.right <= sim.right + 1
        && gateInputs.bottom <= sim.bottom + 1
      ),
      geometryOk: Boolean(
        sim
        && band
        && host
        && sim.bottom <= band.top + 1
        && host.top >= sim.top - 1
        && host.left >= sim.left - 1
        && host.right <= sim.right + 1
        && host.bottom <= sim.bottom + 1
        && finish
        && Math.abs(finish.top - host.top) <= 1
        && Math.abs(finish.left - host.left) <= 1
        && Math.abs(finish.right - host.right) <= 1
        && Math.abs(finish.bottom - host.bottom) <= 1
      ),
    };
  });
}

function assertGateSceneDeckLayoutParity(lockedState, unlockedState, label, tolerance = 3) {
  const sceneCards = lockedState.sceneCards || [];
  const deckCards = unlockedState.deckCards || [];
  assert(sceneCards.length === deckCards.length, `${label}: locked and live card counts drifted`, {
    sceneCards,
    deckCards,
  });
  sceneCards.forEach((sceneCard, index) => {
    const liveCard = deckCards[index];
    ['left', 'top', 'width', 'height'].forEach((key) => {
      assert(
        Math.abs(sceneCard[key] - liveCard[key]) <= tolerance,
        `${label}: ${sceneCard.key || `card ${index + 1}`} ${key} drifted from live deck`,
        { sceneCard, liveCard, tolerance },
      );
    });
  });
}

function readBlurPx(value) {
  const match = String(value || '').match(/blur\(([\d.]+)px\)/i);
  return match ? Number(match[1]) : 0;
}

function assertThemeState(
  state,
  theme,
  label,
  {
    expectScene = false,
    expectedGateBlurPx = DESKTOP_GATE_BLUR_PX,
  } = {},
) {
  const expectedDark = theme === 'dark';
  assert(state.rootTheme === theme && state.bodyTheme === theme, `${label}: theme attributes drifted`, state);
  assert(state.rootDark === expectedDark && state.bodyDark === expectedDark, `${label}: theme classes drifted`, state);
  assert(state.colorScheme.includes(theme), `${label}: color-scheme drifted`, state);
  assert(state.storedTheme === theme, `${label}: stored theme drifted`, state);

  if (expectScene) {
    assert(state.scene, `${label}: fictional gate scene did not mount`, state);
    assert(state.sceneImageCount === 0, `${label}: static gate posters must not use image elements`, state);
    assert(state.sceneStaticPosterCount === GATE_STATIC_POSTERS.size, `${label}: static gate poster set drifted`, state);
    assert(
      state.sceneText === "Ah, ah, ah. You didn't say the magic word.",
      `${label}: gate scene intercept copy drifted`,
      state,
    );
    assert(state.sceneCardCopyCount === 0, `${label}: locked cards must not render titles`, state);
    if (!state.reducedMotion) {
      assert(
        state.sceneAnimationName.includes('portfolio-gate-scene-enter'),
        `${label}: gate scene must fade in rather than pop in`,
        state,
      );
    }
    assert(
      Math.abs(state.sceneSurface.opacity - GATE_SCENE_OPACITY) <= 0.01,
      `${label}: scene opacity did not resolve to ${GATE_SCENE_OPACITY}`,
      state,
    );
    assert(
      Math.abs(readBlurPx(state.windowBlur?.backdropFilter) - expectedGateBlurPx) <= 0.01,
      `${label}: gate backdrop blur did not resolve to ${expectedGateBlurPx}px`,
      state,
    );
    assert(
      state.gateColors.route
        && state.gateColors.route === state.gateTokens.textPrimary
        && state.gateColors.kicker === state.gateTokens.textPrimary
        && state.gateColors.title === state.gateTokens.textPrimary
        && state.gateColors.description === state.gateTokens.textPrimary,
      `${label}: gate text does not resolve from --text-primary`,
      state,
    );
    assert(state.gateColors.input === state.gateTokens.textInput, `${label}: gate input does not resolve from --text-input`, state);
    const expectedBlur = theme === 'dark' ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.24)';
    assert(state.blurBackground === expectedBlur, `${label}: locked blur layer does not match the resolved theme`, state);
  }
}

async function waitForLockedBlurTheme(page, theme) {
  await page.waitForFunction((expectedTheme) => {
    const layer = document.getElementById('window-overlay-blur-layer');
    if (!layer) return false;
    const expected = expectedTheme === 'dark' ? 'rgba(0, 0, 0, 0.26)' : 'rgba(255, 255, 255, 0.24)';
    return getComputedStyle(layer).backgroundColor === expected;
  }, theme, { timeout: WAIT_MS });
}

async function toggleLockedGateTheme(page, currentTheme) {
  const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
  const toggle = page.locator('.button-bar__theme-toggle');
  await toggle.click();
  await page.waitForFunction((theme) => {
    return document.documentElement.getAttribute('data-abs-theme') === theme
      && document.body?.getAttribute('data-abs-theme') === theme
      && Boolean(document.querySelector('[data-portfolio-gate-scene]'));
  }, nextTheme, { timeout: WAIT_MS });
  await waitForLockedBlurTheme(page, nextTheme);
  const toggled = await readState(page);
  assertThemeState(toggled, nextTheme, `${currentTheme}/locked-live-toggle`, { expectScene: true });

  await toggle.click();
  await page.waitForFunction((theme) => (
    document.documentElement.getAttribute('data-abs-theme') === theme
    && Boolean(document.querySelector('[data-portfolio-gate-scene]'))
  ), currentTheme, { timeout: WAIT_MS });
  await waitForLockedBlurTheme(page, currentTheme);
  const restored = await readState(page);
  assertThemeState(restored, currentTheme, `${currentTheme}/locked-live-toggle-restored`, { expectScene: true });
  return { toggled, restored };
}

async function fillGate(page) {
  await page.waitForSelector('[data-route-content="portfolio-gate"] .portfolio-digit', { timeout: WAIT_MS });
  const inputs = await page.locator('[data-route-content="portfolio-gate"] .portfolio-digit').all();
  assert(inputs.length >= INVITE_CODE.length, 'Portfolio gate did not render enough digits', { count: inputs.length });
  for (let index = 0; index < INVITE_CODE.length; index += 1) {
    await inputs[index].fill(INVITE_CODE[index]);
  }
}

async function captureSequenceCheckpoint(page, cdpSession, prefix, id) {
  const state = await readState(page);
  const screenshotPath = resolve(outputRoot, `${prefix}-${id}.jpg`);
  const viewport = page.viewportSize();
  const screenshot = await cdpSession.send('Page.captureScreenshot', {
    format: 'jpeg',
    quality: 82,
    fromSurface: true,
    captureBeyondViewport: false,
    optimizeForSpeed: true,
    clip: viewport ? {
      x: 0,
      y: 0,
      width: viewport.width,
      height: viewport.height,
      scale: 0.5,
    } : undefined,
  });
  await writeFile(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  return { id, screenshotPath, state };
}

function rectsRemainStable(expected, actual, tolerance = 1) {
  if (!expected || !actual) return false;
  return ['left', 'top', 'right', 'bottom', 'width', 'height'].every((key) => (
    Math.abs(expected[key] - actual[key]) <= tolerance
  ));
}

async function captureUnlockRevealReplay(browser, profile, checkpointId) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    colorScheme: profile.theme,
    reducedMotion: 'no-preference',
    deviceScaleFactor: 1,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
  });
  await context.addInitScript((themePreference) => {
    localStorage.setItem('theme-preference-v3', themePreference);
    localStorage.removeItem('theme-preference');
    sessionStorage.removeItem('abs_portfolio_ok');
    localStorage.removeItem('abs_portfolio_ok');
  }, profile.theme);
  await context.clearCookies();
  const page = await context.newPage();
  const lockedRequestTracker = trackLockedPortfolioRequests(page);
  const cdpSession = await context.newCDPSession(page);
  const prefix = `unlock-sequence-${profile.name}-${profile.theme}`;

  try {
    await page.goto(url('/portfolio.html?gate=portfolio'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    await fillGate(page);

    if (checkpointId === '05-route-in-early') {
      await page.waitForFunction(() => {
        if ((document.documentElement.dataset.absTransitionPhase || 'idle') !== 'route-in') return false;
        const bridge = document.querySelector('[data-portfolio-gate-scene-bridge]');
        const wall = document.getElementById('shell-wall-slot');
        const hero = document.getElementById('shell-hero-slot');
        const liveOpacity = Math.max(
          Number.parseFloat(getComputedStyle(wall).opacity || '0'),
          Number.parseFloat(getComputedStyle(hero).opacity || '0'),
        );
        return Boolean(document.getElementById('portfolioProjectMount'))
          && Boolean(bridge)
          && liveOpacity > 0;
      }, undefined, { timeout: WAIT_MS, polling: 'raf' });
      await page.waitForTimeout(50);
    } else {
      await page.waitForFunction(() => {
        if ((document.documentElement.dataset.absTransitionPhase || 'idle') !== 'route-in') return false;
        const deck = document.getElementById('portfolioProjectMount');
        return deck?.classList.contains('is-portfolio-deck-revealing')
          && Boolean(document.querySelector('[data-portfolio-gate-scene-bridge]'));
      }, undefined, { timeout: WAIT_MS, polling: 'raf' });
    }

    return await captureSequenceCheckpoint(page, cdpSession, prefix, checkpointId);
  } finally {
    await context.close();
  }
}

async function auditUnlockSequence(browser, profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    colorScheme: profile.theme,
    reducedMotion: 'no-preference',
    deviceScaleFactor: 1,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
  });
  await context.addInitScript((themePreference) => {
    localStorage.setItem('theme-preference-v3', themePreference);
    localStorage.removeItem('theme-preference');
    sessionStorage.removeItem('abs_portfolio_ok');
    localStorage.removeItem('abs_portfolio_ok');
  }, profile.theme);
  await context.clearCookies();
  const page = await context.newPage();
  const cdpSession = await context.newCDPSession(page);
  const prefix = `unlock-sequence-${profile.name}-${profile.theme}`;
  const frames = [];

  try {
    await page.goto(url('/portfolio.html?gate=portfolio'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    const locked = await readState(page);
    assertThemeState(locked, profile.theme, `${prefix}/locked`, {
      expectScene: true,
      expectedGateBlurPx: profile.mobile ? MOBILE_GATE_BLUR_PX : DESKTOP_GATE_BLUR_PX,
    });
    assert(locked.gateTitleSurface?.filter === 'none', `${prefix}: gate title must remain sharp over the blurred scene`, locked);
    frames.push(await captureSequenceCheckpoint(page, cdpSession, prefix, '01-locked'));

    await page.evaluate(() => {
      const key = '__ABS_SPA_NAVIGATE__';
      const navigate = window[key];
      window.__ABS_GATE_AUDIT_ORIGINAL_NAVIGATE__ = navigate;
      window[key] = (href, options) => {
        window.__ABS_GATE_AUDIT_PENDING_NAVIGATION__ = { href, options };
        return true;
      };
    });

    await fillGate(page);
    await page.waitForFunction(
      () => (
        document.querySelector('.portfolio-gate-inputs')?.classList.contains('pulse-energy')
        && Boolean(window.__ABS_GATE_AUDIT_PENDING_NAVIGATION__)
      ),
      undefined,
      { timeout: WAIT_MS },
    );
    frames.push(await captureSequenceCheckpoint(page, cdpSession, prefix, '02-code-accepted'));
    await page.evaluate(() => {
      const key = '__ABS_SPA_NAVIGATE__';
      const navigate = window.__ABS_GATE_AUDIT_ORIGINAL_NAVIGATE__;
      const pending = window.__ABS_GATE_AUDIT_PENDING_NAVIGATION__;
      window[key] = navigate;
      delete window.__ABS_GATE_AUDIT_ORIGINAL_NAVIGATE__;
      delete window.__ABS_GATE_AUDIT_PENDING_NAVIGATION__;
      navigate(pending.href, {
        ...pending.options,
        exitMs: Math.max(Number(pending.options?.exitMs) || 0, 800),
      });
    });

    await page.waitForFunction(() => {
      if ((document.documentElement.dataset.absTransitionPhase || 'idle') !== 'route-out') return false;
      const wall = document.getElementById('shell-wall-slot');
      const opacity = wall ? Number.parseFloat(getComputedStyle(wall).opacity || '1') : 1;
      return Boolean(document.querySelector('[data-portfolio-gate-scene]'))
        && opacity > 0.05
        && opacity < 0.95;
    }, undefined, { timeout: WAIT_MS, polling: 'raf' });
    frames.push(await captureSequenceCheckpoint(page, cdpSession, prefix, '03-route-out'));

    await page.waitForFunction(() => {
      const phase = document.documentElement.dataset.absTransitionPhase || 'idle';
      if (phase !== 'route-out' && phase !== 'route-in') return false;
      const wall = document.getElementById('shell-wall-slot');
      const styles = wall ? getComputedStyle(wall) : null;
      return !document.querySelector('[data-portfolio-gate-scene]')
        && Boolean(document.querySelector('[data-portfolio-gate-scene-bridge]'))
        && Boolean(document.getElementById('portfolioProjectMount'))
        && Number.parseFloat(styles.opacity || '1') <= 0.02;
    }, undefined, { timeout: WAIT_MS, polling: 'raf' });
    frames.push(await captureSequenceCheckpoint(page, cdpSession, prefix, '04-loading-bridge'));

    await page.waitForSelector('.portfolio-project-card, .portfolio-deck-card, .portfolio-project-label', { state: 'attached', timeout: WAIT_MS });
    await waitForCanvasBuffer(page);
    await waitForIdle(page);
    const settledFrame = await captureSequenceCheckpoint(page, cdpSession, prefix, '07-settled');
    frames.push(
      await captureUnlockRevealReplay(browser, profile, '05-route-in-early'),
      await captureUnlockRevealReplay(browser, profile, '06-route-in-stagger'),
      settledFrame,
    );

    const phases = frames.map((frame) => frame.state.phase);
    assert(phases.includes('route-out') && phases.includes('route-in') && phases.at(-1) === 'idle', `${prefix}: unlock phase sequence was incomplete`, frames);
    assert(frames[1].state.gatePulse, `${prefix}: code-accepted checkpoint missed the success pulse`, frames[1]);
    assert(frames[2].state.scene && frames[2].state.wallSurface.opacity > 0 && frames[2].state.wallSurface.opacity < 1, `${prefix}: scene was not partially faded during route-out`, frames[2]);
    assert(
      !frames[3].state.scene
        && frames[3].state.sceneBridge
        && Math.abs(frames[3].state.sceneBridgeSurface.opacity - GATE_SCENE_OPACITY) <= 0.01
        && frames[3].state.deck
        && frames[3].state.wallSurface.opacity <= 0.02,
      `${prefix}: loading bridge did not preserve the faint scene while concealing the live deck`,
      frames[3],
    );
    assert(
      frames[4].state.deck
        && Math.max(frames[4].state.wallSurface.opacity, frames[4].state.heroSurface.opacity) > 0
        && Math.max(frames[4].state.wallSurface.opacity, frames[4].state.heroSurface.opacity) < 1
        && frames[4].state.sceneBridgeSurface.opacity > 0
        && frames[4].state.sceneBridgeSurface.opacity <= GATE_SCENE_OPACITY + 0.01
        && (Math.max(frames[4].state.wallSurface.opacity, frames[4].state.heroSurface.opacity) + frames[4].state.sceneBridgeSurface.opacity) >= 0.45,
      `${prefix}: scene/live crossfade dipped too dark during intermediate opacities`,
      frames[4],
    );
    assert(
      frames[5].state.deckRevealing && frames[5].state.activeCardRevealDelay === 0,
      `${prefix}: active Portfolio card did not lead the staged deck reveal`,
      frames[5],
    );
    assert(!frames.at(-1).state.scene && !frames.at(-1).state.sceneBridge && !frames.at(-1).state.lockedGate && frames.at(-1).state.deck && frames.at(-1).state.canvasReady, `${prefix}: settled Portfolio was not fully live`, frames.at(-1));
    assertGateSceneDeckLayoutParity(frames[0].state, frames.at(-1).state, `${prefix}: gate scene layout`);

    const baseline = frames[0].state;
    frames.forEach((frame) => {
      assert(rectsRemainStable(baseline.sim, frame.state.sim), `${prefix}/${frame.id}: studio window geometry moved during unlock`, frame);
      assert(rectsRemainStable(baseline.band, frame.state.band), `${prefix}/${frame.id}: Button Bar geometry moved during unlock`, frame);
    });

    return { profile, frames };
  } finally {
    await context.close();
  }
}

async function auditResponsiveGateBreakpoint(browser, profile) {
  const context = await browser.newContext({
    viewport: profile.viewport,
    colorScheme: profile.theme,
    reducedMotion: 'no-preference',
    deviceScaleFactor: 1,
    isMobile: profile.mobile,
    hasTouch: profile.mobile,
  });
  await context.addInitScript((themePreference) => {
    localStorage.setItem('theme-preference-v3', themePreference);
    localStorage.removeItem('theme-preference');
    sessionStorage.removeItem('abs_portfolio_ok');
    localStorage.removeItem('abs_portfolio_ok');
  }, profile.theme);
  await context.clearCookies();
  const page = await context.newPage();
  const lockedRequestTracker = trackLockedPortfolioRequests(page);

  try {
    await page.goto(url('/portfolio.html?gate=portfolio'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    const state = await readState(page);
    assertThemeState(state, profile.theme, `breakpoint/${profile.name}`, {
      expectScene: true,
      expectedGateBlurPx: profile.gateBlurPx,
    });
    assert(state.lockedGate && state.gateTitleSurface?.filter === 'none', `breakpoint/${profile.name}: gate copy is not sharp`, state);
    assert(state.gateLayoutOk, `breakpoint/${profile.name}: gate copy or code inputs overflow the studio window`, state);
    assert(lockedRequestTracker.blockedRequests.length === 0, `breakpoint/${profile.name}: locked scene requested project data, video, or an unapproved asset`, lockedRequestTracker.blockedRequests);
    assert(lockedRequestTracker.posterRequests.length > 0, `breakpoint/${profile.name}: locked scene did not request static project posters`, lockedRequestTracker.posterRequests);
    const screenshotPath = resolve(outputRoot, `breakpoint-${profile.name}-${profile.viewport.width}x${profile.viewport.height}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false });
    return { profile, screenshotPath, state };
  } finally {
    lockedRequestTracker.stop();
    await context.close();
  }
}

async function auditTheme(browser, theme) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: theme,
    reducedMotion: 'reduce',
  });
  await context.addInitScript((themePreference) => {
    if (sessionStorage.getItem('abs_portfolio_gate_theme_seeded') === '1') return;
    localStorage.setItem('theme-preference-v3', themePreference);
    localStorage.removeItem('theme-preference');
    sessionStorage.removeItem('abs_portfolio_ok');
    localStorage.removeItem('abs_portfolio_ok');
    sessionStorage.setItem('abs_portfolio_gate_theme_seeded', '1');
  }, theme);
  const page = await context.newPage();
  const lockedRequestTracker = trackLockedPortfolioRequests(page);
  const results = {};
  try {
    await context.clearCookies();
    await page.goto(url('/portfolio.html?gate=portfolio'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    results.lockedInitial = await readState(page);
    assertThemeState(results.lockedInitial, theme, `${theme}/locked-initial`, { expectScene: true });
    assert(results.lockedInitial.path === '/portfolio.html' && results.lockedInitial.search === '', 'Portfolio gate URL was not normalized', results.lockedInitial);
    assert(results.lockedInitial.activeTab === 'portfolio' && results.lockedInitial.lockedGate, 'Locked Portfolio route did not show in-window gate', results.lockedInitial);
    assert(results.lockedInitial.scene && !results.lockedInitial.deck && results.lockedInitial.labels === 0, 'Locked Portfolio did not use the fictional scene-only route', results.lockedInitial);
    assert(results.lockedInitial.sceneFocusableCount === 0, 'Portfolio scene exposed focusable content', results.lockedInitial);
    assert(lockedRequestTracker.blockedRequests.length === 0, 'Locked Portfolio requested project data, video, or an unapproved asset', lockedRequestTracker.blockedRequests);
    assert(lockedRequestTracker.posterRequests.length > 0, 'Locked Portfolio did not request static project posters', lockedRequestTracker.posterRequests);
    assert(
      results.lockedInitial.windowContent?.zIndex < results.lockedInitial.windowFinish?.zIndex
        && results.lockedInitial.windowBlur?.zIndex < results.lockedInitial.windowFinish?.zIndex
        && results.lockedInitial.windowFinish?.opacity > 0.9
        && results.lockedInitial.windowFinish?.pointerEvents === 'none',
      'Portfolio gate is not stacked below the active window finish',
      results.lockedInitial,
    );
    assert(results.lockedInitial.geometryOk, 'Locked Portfolio window geometry does not align with bottom shell band', results.lockedInitial);

    const posterRequestsBeforeThemeToggle = lockedRequestTracker.posterRequests.length;
    results.lockedThemeToggle = await toggleLockedGateTheme(page, theme);
    assert(
      lockedRequestTracker.posterRequests.length === posterRequestsBeforeThemeToggle
        && lockedRequestTracker.blockedRequests.length === 0,
      'Locked theme switching requested project data, video, or an extra poster asset',
      lockedRequestTracker,
    );

    await page.screenshot({ path: resolve(outputRoot, `portfolio-locked-${theme}.png`), fullPage: false });
    await page.evaluate(() => {
      document.getElementById('window-overlay-blur-layer')?.remove();
      document.getElementById('window-overlay-content-layer')?.remove();
    });
    const uncovered = await readState(page);
    assert(uncovered.scene && !uncovered.deck && uncovered.labels === 0, 'Removing the gate overlay exposed the live Portfolio runtime', uncovered);

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    await fillGate(page);
    await page.waitForSelector('#portfolioProjectMount', { timeout: WAIT_MS });
    await page.waitForSelector('.portfolio-project-card, .portfolio-deck-card, .portfolio-project-label', { state: 'attached', timeout: WAIT_MS });
    await waitForCanvasBuffer(page);
    await waitForIdle(page);
    results.unlocked = await readState(page);
    assertThemeState(results.unlocked, theme, `${theme}/unlocked`);
    assert(results.unlocked.deck && results.unlocked.labels > 0, 'Portfolio did not unlock to deck content', results.unlocked);
    assertGateSceneDeckLayoutParity(results.lockedInitial, results.unlocked, `${theme}: gate scene layout`);
    assert(results.unlocked.cookie.includes('abs_portfolio_ok='), 'Portfolio unlock did not write abs_portfolio_ok cookie', results.unlocked);
    assert(results.unlocked.geometryOk, 'Unlocked Portfolio window geometry does not align with bottom shell band', results.unlocked);
    assert(!results.unlocked.oldPortfolioModal, 'Old Portfolio modal opened during route gate flow', results.unlocked);
    await page.screenshot({ path: resolve(outputRoot, `portfolio-unlocked-${theme}.png`), fullPage: false });

    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('#portfolioProjectMount', { timeout: WAIT_MS });
    await page.waitForSelector('.portfolio-project-card, .portfolio-deck-card, .portfolio-project-label', { state: 'attached', timeout: WAIT_MS });
    await waitForCanvasBuffer(page);
    await waitForIdle(page);
    results.reloadUnlocked = await readState(page);
    assertThemeState(results.reloadUnlocked, theme, `${theme}/reload-unlocked`);
    assert(results.reloadUnlocked.deck && !results.reloadUnlocked.lockedGate, 'Portfolio cookie did not persist unlocked state across reload', results.reloadUnlocked);

    await context.clearCookies();
    await page.evaluate(() => {
      sessionStorage.removeItem('abs_portfolio_ok');
      localStorage.removeItem('abs_portfolio_ok');
    });
    await page.goto(url('/portfolio.html'), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await waitForIdle(page);
    results.resetLocked = await readState(page);
    assertThemeState(results.resetLocked, theme, `${theme}/reset-locked`, { expectScene: true });
    assert(results.resetLocked.lockedGate && !results.resetLocked.deck, 'Clearing site storage did not return Portfolio to locked gate', results.resetLocked);
  } finally {
    lockedRequestTracker.stop();
    await context.close();
  }

  return results;
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const browser = await chromium.launch();
  const results = {};
  try {
    for (const theme of ['light', 'dark']) {
      results[theme] = await auditTheme(browser, theme);
    }
    results.unlockSequences = [];
    for (const profile of [
      { name: 'desktop', theme: 'dark', viewport: { width: 1440, height: 900 }, mobile: false },
      { name: 'tablet', theme: 'light', viewport: { width: 768, height: 1024 }, mobile: false },
      { name: 'mobile', theme: 'dark', viewport: { width: 390, height: 844 }, mobile: true },
    ]) {
      results.unlockSequences.push(await auditUnlockSequence(browser, profile));
    }
    results.responsiveBreakpoints = [];
    for (const profile of [
      { name: 'mobile-compact', theme: 'light', viewport: { width: 320, height: 568 }, mobile: true, gateBlurPx: MOBILE_GATE_BLUR_PX },
      { name: 'mobile-max', theme: 'dark', viewport: { width: 600, height: 900 }, mobile: false, gateBlurPx: MOBILE_GATE_BLUR_PX },
      { name: 'tablet-min', theme: 'light', viewport: { width: 601, height: 900 }, mobile: false, gateBlurPx: DESKTOP_GATE_BLUR_PX },
      { name: 'tablet', theme: 'dark', viewport: { width: 768, height: 1024 }, mobile: false, gateBlurPx: DESKTOP_GATE_BLUR_PX },
      { name: 'tablet-max', theme: 'light', viewport: { width: 899, height: 900 }, mobile: false, gateBlurPx: DESKTOP_GATE_BLUR_PX },
      { name: 'desktop-min', theme: 'dark', viewport: { width: 900, height: 900 }, mobile: false, gateBlurPx: DESKTOP_GATE_BLUR_PX },
      { name: 'desktop-wide', theme: 'light', viewport: { width: 1440, height: 900 }, mobile: false, gateBlurPx: DESKTOP_GATE_BLUR_PX },
      { name: 'touch-landscape', theme: 'dark', viewport: { width: 844, height: 390 }, mobile: true, gateBlurPx: MOBILE_GATE_BLUR_PX },
    ]) {
      results.responsiveBreakpoints.push(await auditResponsiveGateBreakpoint(browser, profile));
    }
    assert(
      results.light.lockedInitial.gateTokens.textPrimary !== results.dark.lockedInitial.gateTokens.textPrimary,
      'Portfolio gate --text-primary did not differ between light and dark',
      results,
    );
    assert(
      results.light.lockedInitial.blurBackground !== results.dark.lockedInitial.blurBackground,
      'Portfolio gate blur surface did not differ between light and dark',
      results,
    );
  } finally {
    await writeFile(resolve(outputRoot, 'portfolio-gate-audit.json'), `${JSON.stringify(results, null, 2)}\n`);
    await browser.close();
  }

  console.log(JSON.stringify(results, null, 2));
  console.error(`PASS: Portfolio static-poster gate scene, ordered unlock sequences, cookie persistence, and reset flow passed (${outputRoot})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
