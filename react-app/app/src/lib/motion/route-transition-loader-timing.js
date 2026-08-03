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

export function createAdaptiveSpinnerController({
  delayMs = 120,
  minimumMs = 140,
  reducedMotion = false,
  onPresentationChange = () => {},
  now = defaultNow,
  setTimer = setStableTimeout,
  clearTimer = clearStableTimeout,
} = {}) {
  let presentation = 'plate';
  let waiting = false;
  let delayTimerId = 0;
  let spinnerShownAt = 0;
  let cancellationGeneration = 0;
  const holdWaiters = new Set();

  const publish = (nextPresentation) => {
    if (presentation === nextPresentation) return;
    presentation = nextPresentation;
    onPresentationChange(presentation, {
      spinnerShownAt,
      waiting,
    });
  };
  const clearDelay = () => {
    if (!delayTimerId) return;
    clearTimer(delayTimerId);
    delayTimerId = 0;
  };
  const showSpinner = () => {
    delayTimerId = 0;
    if (!waiting || presentation === 'spinner') return;
    spinnerShownAt = now();
    publish('spinner');
  };

  return {
    begin({ restartDelay = false } = {}) {
      if (waiting && !restartDelay) return;
      waiting = true;
      if (presentation === 'spinner') return;
      clearDelay();
      if (!(delayMs > 0)) {
        showSpinner();
        return;
      }
      delayTimerId = setTimer(showSpinner, delayMs);
    },
    async resolve() {
      waiting = false;
      clearDelay();
      if (presentation !== 'spinner' || reducedMotion || !(minimumMs > 0)) return;
      const activeCancellationGeneration = cancellationGeneration;
      let remainingMs = Math.max(0, minimumMs - (now() - spinnerShownAt));
      while (remainingMs > 0 && activeCancellationGeneration === cancellationGeneration) {
        await new Promise((resolve) => {
          const waiter = { timerId: 0, resolve };
          waiter.timerId = setTimer(() => {
            holdWaiters.delete(waiter);
            resolve();
          }, remainingMs);
          holdWaiters.add(waiter);
        });
        remainingMs = Math.max(0, minimumMs - (now() - spinnerShownAt));
      }
    },
    cancel({ resetPresentation = true } = {}) {
      waiting = false;
      cancellationGeneration += 1;
      clearDelay();
      holdWaiters.forEach((waiter) => {
        clearTimer(waiter.timerId);
        waiter.resolve();
      });
      holdWaiters.clear();
      spinnerShownAt = 0;
      if (resetPresentation) publish('plate');
    },
    get presentation() {
      return presentation;
    },
    get spinnerShownAt() {
      return spinnerShownAt;
    },
    get waiting() {
      return waiting;
    },
  };
}

export function createRouteLoaderTimingDriver({
  spinnerDelayMs = 120,
  spinnerMinimumMs = 140,
  reducedMotion = false,
  onPresentationChange = () => {},
} = {}) {
  let coveredAt = 0;
  const spinner = createAdaptiveSpinnerController({
    delayMs: spinnerDelayMs,
    minimumMs: spinnerMinimumMs,
    reducedMotion,
    onPresentationChange,
  });

  return {
    async establishCover() {
      if (!coveredAt) {
        await waitForPaintFrames(1);
        coveredAt = defaultNow();
        document.documentElement.dataset.absRouteLoadingCoveredAt = String(coveredAt);
      }
      return coveredAt;
    },
    beginReadinessWait({ restartDelay = false } = {}) {
      spinner.begin({ restartDelay });
    },
    retarget() {
      // The same controller remains alive while the opaque plate is retargeted.
      // An active delay or visible spinner therefore continues without replay.
    },
    waitForDestinationPaint() {
      return waitForPaintFrames(2);
    },
    waitForReadiness() {
      return spinner.resolve();
    },
    clear() {
      spinner.cancel();
      delete document.documentElement.dataset.absRouteLoadingCoveredAt;
      coveredAt = 0;
    },
    get coveredAt() {
      return coveredAt;
    },
    get presentation() {
      return spinner.presentation;
    },
    get spinnerShownAt() {
      return spinner.spinnerShownAt;
    },
  };
}
