function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function readItemSpanRatio(item, fallbackRatio) {
  const raw = Number.parseFloat(item.getAttribute('data-scroll-presence-span') || '');
  return Number.isFinite(raw) && raw > 0 ? raw : fallbackRatio;
}

function computePresence(itemRect, rootRect, fadeSpan) {
  if (itemRect.bottom < rootRect.top - fadeSpan || itemRect.top > rootRect.bottom + fadeSpan) {
    return 0;
  }

  const enter = clamp((itemRect.bottom - rootRect.top) / fadeSpan, 0, 1);
  const exit = clamp((rootRect.bottom - itemRect.top) / fadeSpan, 0, 1);
  return Math.min(enter, exit);
}

export function createScrollPresence(root, options = {}) {
  if (!root || typeof window === 'undefined') {
    return {
      refresh() {},
      destroy() {},
    };
  }

  const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ?? false;
  if (reduceMotion) {
    return {
      refresh() {},
      destroy() {},
    };
  }

  const {
    itemSelector = '[data-scroll-presence]',
    defaultSpanRatio = 0.18,
    minSpanPx = 96,
    maxSpanPx = 220,
  } = options;

  let items = [];
  let rafId = null;
  let destroyed = false;
  const resizeObserver = typeof ResizeObserver === 'function'
    ? new ResizeObserver(() => schedule())
    : null;

  const observeItems = () => {
    if (!resizeObserver) return;
    resizeObserver.disconnect();
    resizeObserver.observe(root);
    items.forEach((item) => resizeObserver.observe(item));
  };

  const update = () => {
    rafId = null;
    if (destroyed) return;

    const rootRect = root.getBoundingClientRect();
    if (!(rootRect.height > 0)) return;

    items.forEach((item) => {
      const itemRect = item.getBoundingClientRect();
      const fadeSpan = clamp(
        rootRect.height * readItemSpanRatio(item, defaultSpanRatio),
        minSpanPx,
        maxSpanPx,
      );
      const presence = computePresence(itemRect, rootRect, fadeSpan);
      const nextValue = presence.toFixed(3);
      if (item.style.getPropertyValue('--scroll-presence') !== nextValue) {
        item.style.setProperty('--scroll-presence', nextValue);
      }
    });
  };

  const schedule = () => {
    if (destroyed || rafId != null) return;
    rafId = window.requestAnimationFrame(update);
  };

  const refresh = () => {
    if (destroyed) return;
    items = Array.from(root.querySelectorAll(itemSelector))
      .filter((item) => !item.hasAttribute('data-scroll-presence-disabled'));
    observeItems();
    schedule();
  };

  const handleScroll = () => schedule();
  const handleResize = () => schedule();
  const handleLoad = () => refresh();

  root.addEventListener('scroll', handleScroll, { passive: true });
  root.addEventListener('load', handleLoad, true);
  window.addEventListener('resize', handleResize, { passive: true });
  window.visualViewport?.addEventListener('resize', handleResize, { passive: true });

  refresh();

  return {
    refresh,
    destroy() {
      destroyed = true;
      if (rafId != null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      resizeObserver?.disconnect();
      root.removeEventListener('scroll', handleScroll);
      root.removeEventListener('load', handleLoad, true);
      window.removeEventListener('resize', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      items.forEach((item) => item.style.removeProperty('--scroll-presence'));
      items = [];
    },
  };
}
