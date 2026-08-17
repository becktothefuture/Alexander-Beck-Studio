import { clearStableTimeout, setStableTimeout } from '../legacy-runtime-scope.js';
import { isSimulationVisualTransitionSourceActive } from '../simulationVisualTransition.js';
import { isCanvasBackingStoreUsable } from '../canvas-backing-store-readiness.js';

const DAILY_LAB_ROUTE_IDS = new Set([
  'repel-room',
  'flock-of-birds',
]);

function hasCanvasBufferReady() {
  const canvas = document.getElementById('c');
  return isCanvasBackingStoreUsable(canvas, {
    minCssWidth: 64,
    minCssHeight: 64,
  });
}

function isRectUsable(rect) {
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function rectHasUsableVisibleArea(innerRect, outerRect) {
  if (!isRectUsable(innerRect) || !isRectUsable(outerRect)) return false;
  const visibleWidth = Math.max(0, Math.min(innerRect.right, outerRect.right) - Math.max(innerRect.left, outerRect.left));
  const visibleHeight = Math.max(0, Math.min(innerRect.bottom, outerRect.bottom) - Math.max(innerRect.top, outerRect.top));
  return (
    visibleWidth >= Math.min(240, outerRect.width * 0.5)
    && visibleHeight >= Math.min(96, innerRect.height * 0.5)
  );
}

function rectsMatchWithinThreshold(previous, next, thresholdPx = 2) {
  if (!isRectUsable(previous) || !isRectUsable(next)) return false;
  return (
    Math.abs(previous.top - next.top) <= thresholdPx
    && Math.abs(previous.left - next.left) <= thresholdPx
    && Math.abs(previous.width - next.width) <= thresholdPx
    && Math.abs(previous.height - next.height) <= thresholdPx
  );
}

function isElementVisiblyRevealed(element) {
  if (!element) return false;
  const styles = window.getComputedStyle(element);
  return (
    styles.display !== 'none'
    && styles.visibility !== 'hidden'
    && Number(styles.opacity) > 0.9
  );
}

function isCanvasSurfacePrepared(selector) {
  const canvas = document.querySelector(selector);
  if (!canvas) return false;
  const rect = canvas.getBoundingClientRect();
  return rect.width >= 64
    && rect.height >= 64
    && canvas.width >= 64
    && canvas.height >= 64;
}

function isPortfolioScrollRailReady() {
  const wall = document.getElementById('simulations');
  const mount = document.getElementById('portfolioProjectMount');
  const firstCard = mount?.querySelector('.portfolio-deck-card.is-active, .portfolio-project-label');
  if (!wall || !mount || !firstCard) return false;
  const wallRect = wall.getBoundingClientRect();
  const cardRect = firstCard.getBoundingClientRect();
  const deckPrepared = mount.classList.contains('is-portfolio-boot-preparing');
  const hasUsableGeometry = (
    isRectUsable(wallRect)
    && isRectUsable(cardRect)
    && cardRect.width >= Math.min(240, wallRect.width * 0.5)
    && cardRect.height >= 96
    && rectHasUsableVisibleArea(cardRect, wallRect)
  );
  return (
    hasUsableGeometry
    && (
      deckPrepared
      || (isElementVisiblyRevealed(mount) && isElementVisiblyRevealed(firstCard))
    )
  );
}

function isDailyLabRouteReady(routeId) {
  const isLocalAuditHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  if (isLocalAuditHost && window.__ABS_AUDIT_FORCE_DAILY_NOT_READY__ === routeId) return false;
  switch (routeId) {
    case 'repel-room':
      return isCanvasSurfacePrepared('#repel-room-canvas')
        && isSimulationVisualTransitionSourceActive(routeId);
    case 'flock-of-birds':
      return isCanvasSurfacePrepared('#flock-of-birds-canvas')
        && isSimulationVisualTransitionSourceActive(routeId);
    case 'beach-ball-room': {
      const container = document.querySelector('.beach-ball-room-simulation');
      const loadState = container?.dataset?.beachBallRoomLoadState;
      return Boolean(
        loadState === 'ready'
          && isCanvasSurfacePrepared('.beach-ball-room-canvas')
          && isSimulationVisualTransitionSourceActive(routeId)
      );
    }
    default:
      return false;
  }
}

export function isDailyLabRouteId(routeId) {
  return DAILY_LAB_ROUTE_IDS.has(routeId);
}

function readRouteReadySnapshot(routeId) {
  if (routeId === 'portfolio') {
    return {
      wallRect: document.getElementById('simulations')?.getBoundingClientRect() || null,
      heroRect: document.getElementById('hero-title')?.getBoundingClientRect() || null,
      cardRect: document.querySelector('.portfolio-deck-card.is-active, .portfolio-project-label')?.getBoundingClientRect() || null,
      topbarRect: document.querySelector('.ui-top-main.route-topbar')?.getBoundingClientRect() || null,
    };
  }

  return null;
}

function isRouteReadySnapshotStable(routeId, previous, next, options = {}) {
  if (routeId !== 'portfolio') return true;
  if (options.lockedGateId === 'portfolio') return true;
  if (!previous || !next) return false;
  const deckFailed = document.body?.classList.contains('portfolio-deck-failed');
  const deckPrepared = document.getElementById('portfolioProjectMount')
    ?.classList.contains('is-portfolio-boot-preparing');
  if (deckPrepared) {
    return (
      rectsMatchWithinThreshold(previous.wallRect, next.wallRect, 2)
      && rectsMatchWithinThreshold(previous.cardRect, next.cardRect, 2)
    );
  }
  return (
    rectsMatchWithinThreshold(previous.wallRect, next.wallRect, 2)
    && (!previous.heroRect || !next.heroRect || rectsMatchWithinThreshold(previous.heroRect, next.heroRect, 2))
    && (deckFailed || rectsMatchWithinThreshold(previous.cardRect, next.cardRect, 2))
    && rectsMatchWithinThreshold(previous.topbarRect, next.topbarRect, 2)
  );
}

export function observeRouteBaselineReady(routeId, options = {}, getRuntimeSnapshot) {
  const body = document.body;
  if (!body) return false;

  if (routeId === 'home') {
    const isHomeRoute = !body.classList.contains('portfolio-page') && !body.classList.contains('cv-page');
    const root = document.documentElement;
    const hero = document.getElementById('hero-title');
    const routeTabs = document.querySelectorAll('[data-route-tab]');
    const bootOverlay = document.getElementById('abs-boot-overlay');
    const bootState = document.documentElement.dataset.absBootState || '';
    const runtime = getRuntimeSnapshot();
    const semanticTitleReady = Boolean(
      hero?.querySelector('.hero-title__name')?.textContent?.trim()
      && hero?.querySelectorAll('.hero-title__role').length >= 2
      && [...hero.querySelectorAll('.hero-title__role')]
        .every((line) => line.textContent?.trim())
    );
    return Boolean(
      isHomeRoute
      && hero
      && routeTabs.length >= 5
      && hasCanvasBufferReady()
      && !bootOverlay
      && bootState !== 'booting'
      && runtime.routeId === 'home'
      && runtime.status === 'ready'
      && root.dataset.absHomeRouteReady === 'true'
      && (root.dataset.absHomeCanvasTitleReady === 'true' || semanticTitleReady)
    );
  }

  if (routeId === 'portfolio') {
    const deckFailed = body.classList.contains('portfolio-deck-failed');
    const lockedGate = document.querySelector('[data-route-content="portfolio-gate"]');
    const portfolioMount = document.getElementById('portfolioProjectMount');
    const deckPrepared = portfolioMount?.classList.contains('is-portfolio-boot-preparing');
    const runtime = getRuntimeSnapshot();
    if (options.lockedGateId === 'portfolio') {
      return Boolean(body.classList.contains('portfolio-page') && lockedGate);
    }
    if (options.lockedGateId === null && lockedGate) {
      return false;
    }
    return Boolean(
      body.classList.contains('portfolio-page')
      && (
        lockedGate
        || (
          runtime.routeId === 'portfolio'
          && runtime.status === 'ready'
          && (
            portfolioMount
            && (deckFailed || deckPrepared || isPortfolioScrollRailReady())
          )
        )
      )
    );
  }

  if (routeId === 'about') {
    const aboutRoute = document.querySelector(
      '.about-narrative-lab[data-route-content="about"]',
    );
    const comingSoonTitle = document.getElementById('about-coming-soon-title');
    return Boolean(
      body.classList.contains('about-page')
      && (
        comingSoonTitle
        || (
          aboutRoute
          && aboutRoute.dataset.aboutSceneReady === 'true'
        )
      )
    );
  }

  if (routeId === 'contact') {
    return Boolean(
      body.classList.contains('contact-page')
      && document.querySelector('[data-route-content="contact"]')
    );
  }

  if (routeId === 'playground') {
    const routeContent = document.querySelector('[data-route-content="playground"]');
    const experience = routeContent?.querySelector('[data-playground-experience]');
    const comingSoonTitle = document.getElementById('playground-coming-soon-title');
    return Boolean(
      body.classList.contains('playground-page')
      && routeContent
      && (
        comingSoonTitle
        || (
          document.getElementById('playground-route-title')
          && experience?.dataset.playgroundReady === 'true'
        )
      )
    );
  }

  if (isDailyLabRouteId(routeId)) {
    return isDailyLabRouteReady(routeId);
  }

  return Boolean(document.getElementById('app-frame'));
}

export function waitForObservedRouteReady(routeId, timeoutMs, options = {}, getRuntimeSnapshot) {
  let settle = () => {};
  const promise = new Promise((resolve) => {
    let settled = false;
    let pollId = 0;
    let timeoutId = 0;
    let previousSnapshot = null;
    let stableReadyFrames = 0;
    const POLL_MS = 16;
    const isLocalAuditHost = window.location.hostname === 'localhost'
      || window.location.hostname === '127.0.0.1';
    const auditDelayMs = isLocalAuditHost
      ? Math.max(0, Number(window.__ABS_AUDIT_ROUTE_READINESS_DELAY_MS__ || 0))
      : 0;
    const readinessStartedAt = Number(options.readinessStartedAt) || performance.now();
    const auditReadyNotBefore = readinessStartedAt + auditDelayMs;
    // Portfolio's runtime and participant each own painted-geometry barriers;
    // repeating them in the shell delayed a fully prepared deck by three more
    // frames without adding a stronger invariant.
    const REQUIRED_STABLE_FRAMES = 0;
    const maybeSettleReady = () => {
      if (!observeRouteBaselineReady(routeId, options, getRuntimeSnapshot)) {
        stableReadyFrames = 0;
        previousSnapshot = null;
        return false;
      }
      if (auditDelayMs > 0 && performance.now() < auditReadyNotBefore) return false;
      if (REQUIRED_STABLE_FRAMES === 0) {
        settle('ready');
        return true;
      }

      const snapshot = readRouteReadySnapshot(routeId);
      if (snapshot && previousSnapshot && isRouteReadySnapshotStable(routeId, previousSnapshot, snapshot, options)) {
        stableReadyFrames += 1;
      } else {
        stableReadyFrames = 0;
      }
      previousSnapshot = snapshot;

      if (stableReadyFrames >= REQUIRED_STABLE_FRAMES) {
        settle('ready');
        return true;
      }
      return false;
    };

    settle = (status = 'cancelled') => {
      if (settled) return;
      settled = true;
      window.removeEventListener('abs:route-ready', onReady);
      window.removeEventListener('abs:daily-focus-failed', onFailed);
      window.removeEventListener('abs:route-failed', onFailed);
      if (pollId) clearStableTimeout(pollId);
      if (timeoutId) clearStableTimeout(timeoutId);
      resolve(status);
    };
    const onReady = (event) => {
      if ((event?.detail?.routeId || '') !== routeId) return;
      const eventGeneration = Number(event?.detail?.generation || 0);
      const currentGeneration = getRuntimeSnapshot().generation;
      if (eventGeneration && eventGeneration !== currentGeneration) return;
      maybeSettleReady();
    };
    const onFailed = (event) => {
      if ((event?.detail?.routeId || '') !== routeId) return;
      settle('failed');
    };
    window.addEventListener('abs:route-ready', onReady);
    window.addEventListener('abs:daily-focus-failed', onFailed);
    window.addEventListener('abs:route-failed', onFailed);
    timeoutId = setStableTimeout(() => settle('timeout'), timeoutMs);

    if (maybeSettleReady()) {
      return;
    }

    const tick = () => {
      if (settled) return;
      if (maybeSettleReady()) return;
      pollId = setStableTimeout(tick, POLL_MS);
    };
    pollId = setStableTimeout(tick, POLL_MS);
  });
  return {
    promise,
    cancel: settle,
  };
}
