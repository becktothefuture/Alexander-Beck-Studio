import { clearStableTimeout, setStableTimeout } from '../legacy-runtime-scope.js';

function waitForPaintFrames(count = 2) {
  if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    let remaining = Math.max(1, count);
    const fallbackId = setStableTimeout(finish, Math.max(80, remaining * 34));
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
      window.requestAnimationFrame(tick);
    };
    window.requestAnimationFrame(tick);
  });
}

function waitForMinimumDuration(durationMs, signal = null) {
  if (!(durationMs > 0)) return Promise.resolve();
  return new Promise((resolve) => {
    let timeoutId = 0;
    const finish = () => {
      if (timeoutId) clearStableTimeout(timeoutId);
      signal?.removeEventListener('abort', finish);
      resolve();
    };
    signal?.addEventListener('abort', finish, { once: true });
    timeoutId = setStableTimeout(finish, durationMs);
  });
}

export function createRouteLoaderTimingDriver({ minimumMs = 0, signal = null } = {}) {
  let minimumPromise = Promise.resolve();
  let coveredAt = 0;

  return {
    async establishCover() {
      await waitForPaintFrames(1);
      coveredAt = performance.now();
      document.documentElement.dataset.absRouteLoadingCoveredAt = String(coveredAt);
      minimumPromise = waitForMinimumDuration(minimumMs, signal);
      return coveredAt;
    },
    waitForDestinationPaint() {
      return waitForPaintFrames(2);
    },
    waitForMinimum() {
      return minimumPromise;
    },
    clear() {
      delete document.documentElement.dataset.absRouteLoadingCoveredAt;
      coveredAt = 0;
    },
    get coveredAt() {
      return coveredAt;
    },
  };
}
