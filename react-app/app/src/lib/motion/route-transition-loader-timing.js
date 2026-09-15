import {
  clearStableTimeout,
  requestStableAnimationFrame,
  setStableTimeout,
} from '../legacy-runtime-scope.js';

function waitForPaintFrames(count = 2) {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let remaining = Math.max(1, count);
    // WebKit can defer RAF while a code-split route compiles. Keep a bounded
    // escape hatch, but do not let an ordinary 100–250 ms main-thread pause
    // skip the covered paint barrier entirely.
    const fallbackId = setStableTimeout(finish, Math.max(500, remaining * 50));
    function finish() {
      if (settled) return;
      settled = true;
      clearStableTimeout(fallbackId);
      resolve();
    }
    const tick = () => {
      if (settled) return;
      remaining -= 1;
      if (remaining <= 0) {
        finish();
        return;
      }
      requestStableAnimationFrame(tick);
    };
    requestStableAnimationFrame(tick);
  });
}

function defaultNow() {
  return typeof performance === 'undefined' ? Date.now() : performance.now();
}

// Inter-view navigation has no visual loader and no minimum spinner hold.
// Keep the covered paint barrier: destination pixels must be staged before
// route-in, even though its input/status shield is visually transparent.
export function createRouteLoaderTimingDriver() {
  let coveredAt = 0;
  return {
    async establishCover() {
      if (!coveredAt) {
        await waitForPaintFrames(1);
        coveredAt = defaultNow();
        document.documentElement.dataset.absRouteLoadingCoveredAt = String(coveredAt);
      }
      return coveredAt;
    },
    beginReadinessWait() {},
    retarget() {},
    waitForDestinationPaint() {
      return waitForPaintFrames(2);
    },
    waitForReadiness() {
      return Promise.resolve();
    },
    clear() {
      delete document.documentElement.dataset.absRouteLoadingCoveredAt;
      coveredAt = 0;
    },
    get coveredAt() {
      return coveredAt;
    },
    get presentation() {
      return 'none';
    },
    get spinnerShownAt() {
      return 0;
    },
  };
}
