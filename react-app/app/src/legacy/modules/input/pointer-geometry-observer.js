let disposeActivePointerGeometryObserver = null;

export function disposePointerGeometryObserver() {
  disposeActivePointerGeometryObserver?.();
  disposeActivePointerGeometryObserver = null;
}

export function observePointerGeometry(
  canvas,
  invalidate,
  {
    ResizeObserverClass = globalThis.ResizeObserver,
    windowTarget = globalThis.window,
  } = {},
) {
  disposePointerGeometryObserver();

  const resizeObserver = typeof ResizeObserverClass === 'function'
    ? new ResizeObserverClass(invalidate)
    : null;
  resizeObserver?.observe(canvas);
  windowTarget?.addEventListener('resize', invalidate, { passive: true });
  windowTarget?.addEventListener('orientationchange', invalidate, { passive: true });

  let disposed = false;
  disposeActivePointerGeometryObserver = () => {
    if (disposed) return;
    disposed = true;
    resizeObserver?.disconnect();
    windowTarget?.removeEventListener('resize', invalidate);
    windowTarget?.removeEventListener('orientationchange', invalidate);
  };
}
