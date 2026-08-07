const HOME_TITLE_CANVAS_ID = 'simulation-title-canvas';
const TITLE_PLANE_RENDERED_EVENT = 'abs:simulation-title-plane-rendered';
export const TITLE_PLANE_INVALIDATE_EVENT = 'abs:simulation-title-plane-invalidate';
const DEFAULT_STAGE_TIMEOUT_MS = 500;

export function requestHomeTitlePlaneRender(
  windowRef = typeof window === 'undefined' ? null : window,
) {
  if (typeof windowRef?.dispatchEvent !== 'function') return false;
  const event = typeof windowRef.Event === 'function'
    ? new windowRef.Event(TITLE_PLANE_INVALIDATE_EVENT)
    : { type: TITLE_PLANE_INVALIDATE_EVENT };
  windowRef.dispatchEvent(event);
  return true;
}

function readRenderRevision(canvas) {
  const revision = Number(canvas?.dataset?.titlePlaneRenderRevision || 0);
  return Number.isFinite(revision) ? revision : 0;
}

function isStagedTitleFrame(canvas, coveredRevision) {
  return Boolean(
    canvas?.isConnected !== false
    && canvas?.dataset?.titlePlaneSourceConnected === 'true'
    && canvas?.dataset?.titlePlaneReady === 'false'
    && readRenderRevision(canvas) > coveredRevision
  );
}

function isSettledTitleFrame(canvas, stagedRevision) {
  return Boolean(
    canvas?.isConnected !== false
    && canvas?.dataset?.titlePlaneSourceConnected === 'true'
    && canvas?.dataset?.titlePlaneReady === 'true'
    && readRenderRevision(canvas) > stagedRevision
  );
}

/**
 * Keeps the persistent Home title bitmap available for measurement while
 * preventing it from painting between a covered route commit and the staged
 * title entrance. Each route transaction owns its own gate instance.
 */
export function createHomeTitlePresentationGate({
  generation = 0,
  timeoutMs = DEFAULT_STAGE_TIMEOUT_MS,
  documentRef = typeof document === 'undefined' ? null : document,
  windowRef = typeof window === 'undefined' ? null : window,
} = {}) {
  const generationId = String(generation);
  let canvas = null;
  let covered = false;
  let coveredRevision = 0;
  let stagedRevision = 0;
  let settleWaiter = null;

  const finishWaiter = (status) => {
    settleWaiter?.(status);
    settleWaiter = null;
  };

  const cover = () => {
    canvas = documentRef?.getElementById?.(HOME_TITLE_CANVAS_ID) || null;
    if (!canvas) return false;
    coveredRevision = readRenderRevision(canvas);
    canvas.dataset.titlePlanePresentation = 'covered';
    canvas.dataset.titlePlanePresentationGeneration = generationId;
    covered = true;
    return true;
  };

  const waitForTitleFrame = (predicate, readyStatus, { requireCovered = true } = {}) => {
    if ((requireCovered && !covered) || !canvas || !windowRef) {
      return Promise.resolve('not-covered');
    }
    if (predicate()) return Promise.resolve(readyStatus);

    return new Promise((resolve) => {
      let settled = false;
      let timeoutId = 0;
      const finish = (status) => {
        if (settled) return;
        settled = true;
        windowRef.clearTimeout?.(timeoutId);
        windowRef.removeEventListener?.(TITLE_PLANE_RENDERED_EVENT, handleRendered);
        if (settleWaiter === finish) settleWaiter = null;
        resolve(status);
      };
      const handleRendered = () => {
        if (predicate()) finish(readyStatus);
      };

      settleWaiter = finish;
      windowRef.addEventListener?.(TITLE_PLANE_RENDERED_EVENT, handleRendered);
      timeoutId = windowRef.setTimeout?.(
        () => finish('timeout'),
        Math.max(1, Number(timeoutMs) || DEFAULT_STAGE_TIMEOUT_MS),
      ) || 0;
      handleRendered();
    });
  };

  const waitForStagedPaint = async () => {
    requestHomeTitlePlaneRender(windowRef);
    const status = await waitForTitleFrame(
      () => isStagedTitleFrame(canvas, coveredRevision),
      'staged',
    );
    if (status === 'staged') stagedRevision = readRenderRevision(canvas);
    return status;
  };

  const waitForSettledPaint = () => {
    requestHomeTitlePlaneRender(windowRef);
    return waitForTitleFrame(
      () => isSettledTitleFrame(canvas, stagedRevision),
      'settled',
      { requireCovered: false },
    );
  };

  const release = (status = 'released') => {
    finishWaiter(status === 'released' ? 'released' : status);
    if (!covered || !canvas) return false;
    if (canvas.dataset.titlePlanePresentationGeneration !== generationId) {
      covered = false;
      return false;
    }
    delete canvas.dataset.titlePlanePresentation;
    delete canvas.dataset.titlePlanePresentationGeneration;
    covered = false;
    return true;
  };

  return Object.freeze({
    cover,
    waitForStagedPaint,
    waitForSettledPaint,
    release,
    cancel: (reason = 'cancelled') => release(reason),
    get covered() {
      return covered;
    },
  });
}
