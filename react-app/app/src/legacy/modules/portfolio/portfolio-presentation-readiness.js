/**
 * Wait until `#simulations` has a real layout box (gate transitions / SPA can report 0×0
 * for several frames). Without this, `resize()` no-ops and the pit seeds against a default buffer.
 */
export async function waitForPitSimulationHostReady(options = {}) {
  const minPx = Math.max(24, Number(options.minEdgePx) || 48);
  const timeoutMs = Math.max(250, Number(options.timeoutMs) || 8000);
  const documentRef = options.documentRef || document;
  const windowRef = options.windowRef || window;
  const ResizeObserverClass = options.ResizeObserverClass
    ?? globalThis.ResizeObserver;
  const setIntervalImpl = options.setIntervalImpl
    || windowRef.setInterval.bind(windowRef);
  const clearIntervalImpl = options.clearIntervalImpl
    || globalThis.clearInterval;
  const setTimeoutImpl = options.setTimeoutImpl
    || windowRef.setTimeout.bind(windowRef);
  const clearTimeoutImpl = options.clearTimeoutImpl
    || globalThis.clearTimeout;

  const measure = () => {
    const host = documentRef.getElementById('simulations');
    const w = host?.clientWidth ?? 0;
    const h = host?.clientHeight ?? 0;
    return Boolean(host && w >= minPx && h >= minPx);
  };

  if (measure()) return true;

  return new Promise((resolve) => {
    let done = false;
    let ro = null;
    let iv = 0;
    let tid = 0;
    const finish = (ok) => {
      if (done) return;
      done = true;
      try {
        ro?.disconnect();
      } catch (_) {
        /* ignore */
      }
      clearIntervalImpl(iv);
      clearTimeoutImpl(tid);
      resolve(ok);
    };

    const host = documentRef.getElementById('simulations');
    if (host && typeof ResizeObserverClass !== 'undefined') {
      ro = new ResizeObserverClass(() => {
        if (measure()) finish(true);
      });
      ro.observe(host);
    }

    iv = setIntervalImpl(() => {
      if (measure()) finish(true);
    }, 24);

    tid = setTimeoutImpl(() => finish(measure()), timeoutMs);
  });
}

export function isCanvasBackingStoreReady(canvas, options = {}) {
  if (!canvas) return false;
  const cssW = canvas.clientWidth || 0;
  const cssH = canvas.clientHeight || 0;
  if (cssW < 64 || cssH < 64) return false;
  const devicePixelRatio = options.devicePixelRatio
    ?? (options.windowRef || window).devicePixelRatio;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  const minW = Math.ceil((cssW + 2) * dpr) - 2;
  const minH = Math.ceil((cssH + 2) * dpr) - 2;
  return canvas.width >= minW && canvas.height >= minH;
}

export function rectIsUsable(rect) {
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

export function rectHasUsableVisibleArea(rect, outerRect) {
  if (!rectIsUsable(rect) || !rectIsUsable(outerRect)) return false;
  const visibleWidth = Math.max(0, Math.min(rect.right, outerRect.right) - Math.max(rect.left, outerRect.left));
  const visibleHeight = Math.max(0, Math.min(rect.bottom, outerRect.bottom) - Math.max(rect.top, outerRect.top));
  return (
    visibleWidth >= Math.min(240, outerRect.width * 0.5)
    && visibleHeight >= Math.min(96, rect.height * 0.5)
  );
}

export function readPortfolioPresentationSnapshot(options = {}) {
  const documentRef = options.documentRef || document;
  const wall = documentRef.getElementById('simulations');
  const hero = documentRef.getElementById('hero-title');
  const topbar = documentRef.querySelector('.ui-top-main.route-topbar');
  const labelMount = documentRef.getElementById('portfolioProjectMount');
  const nearestLabels = Array.from(
    labelMount?.querySelectorAll('.portfolio-project-label[data-ring-nearest="true"]') || []
  );
  const firstLabel = labelMount?.querySelector('.portfolio-deck-card.is-active')
    || nearestLabels.sort((labelA, labelB) => (
      Math.abs(Number(labelA.dataset.orbitOffset) || 0)
      - Math.abs(Number(labelB.dataset.orbitOffset) || 0)
    ))[0]
    || null;
  const canvas = documentRef.getElementById('c');

  const wallRect = wall?.getBoundingClientRect() || null;
  const heroRect = hero?.getBoundingClientRect() || null;
  const topbarRect = topbar?.getBoundingClientRect() || null;
  const firstLabelRect = firstLabel?.getBoundingClientRect() || null;
  const labelCount = labelMount?.querySelectorAll('.portfolio-deck-card, .portfolio-project-label').length || 0;
  const heroInsideWall = rectIsUsable(heroRect) && rectIsUsable(wallRect)
    && heroRect.left >= wallRect.left - 4
    && heroRect.right <= wallRect.right + 4
    && heroRect.top >= wallRect.top - 4
    && heroRect.bottom <= wallRect.bottom + 4;
  const heroReady = !hero || !rectIsUsable(heroRect) || heroInsideWall;
  const firstLabelReady = rectIsUsable(firstLabelRect)
    && rectIsUsable(wallRect)
    && firstLabelRect.width >= Math.min(240, wallRect.width * 0.5)
    && firstLabelRect.height >= 96
    && firstLabelRect.left >= wallRect.left - 8
    && firstLabelRect.right <= wallRect.right + 8
    && rectHasUsableVisibleArea(firstLabelRect, wallRect);

  return {
    wallRect,
    heroRect,
    topbarRect,
    firstLabelRect,
    canvasReady: isCanvasBackingStoreReady(canvas, options),
    labelCount,
    heroReady,
    firstLabelReady,
    topbarReady: rectIsUsable(topbarRect),
    ready: Boolean(
      rectIsUsable(wallRect)
      && rectIsUsable(topbarRect)
      && heroReady
      && labelCount > 0
      && firstLabelReady
    ),
  };
}

export async function waitForStablePortfolioPresentation(options = {}) {
  const timeoutMs = Math.max(400, Number(options.timeoutMs) || 2000);
  const requiredReadyPasses = Math.max(1, Math.round(Number(options.requiredReadyPasses) || 2));
  const windowRef = options.windowRef || window;
  const now = options.now || (() => performance.now());
  const requestFrame = options.requestAnimationFrameImpl || requestAnimationFrame;
  const readSnapshot = options.readSnapshot
    || (() => readPortfolioPresentationSnapshot(options));
  const publish = options.publish || ((snapshot) => {
    windowRef.__ABS_PORTFOLIO_PRESENTATION__ = snapshot;
  });

  return new Promise((resolve) => {
    const startedAt = now();
    let stablePasses = 0;

    const tick = () => {
      const snapshot = readSnapshot();
      if (snapshot.ready) {
        stablePasses += 1;
      } else {
        stablePasses = 0;
      }

      if (stablePasses >= requiredReadyPasses) {
        publish({
          ...snapshot,
          elapsedMs: now() - startedAt,
          stablePasses,
        });
        resolve(true);
        return;
      }

      if ((now() - startedAt) >= timeoutMs) {
        publish({
          ...snapshot,
          elapsedMs: now() - startedAt,
          stablePasses,
        });
        resolve(snapshot.ready);
        return;
      }

      requestFrame(tick);
    };

    if (requiredReadyPasses === 1) tick();
    else requestFrame(tick);
  });
}
