import {
  getProjectImageSrc,
  loadPortfolioData,
  loadPortfolioRuntimeConfig,
  resolvePortfolioAsset,
} from './portfolio-data.js';

export const PORTFOLIO_THUMBNAIL_READY_TIMEOUT_MS = 1800;

function getCriticalPortfolioThumbnailSources(
  data,
  activeProjectIndex = 0,
  { getImageSrc = getProjectImageSrc, resolveAsset = resolvePortfolioAsset } = {}
) {
  const projects = Array.isArray(data?.projects) ? data.projects : [];
  const count = projects.length;
  if (!count) return [];
  const wrap = (index) => ((index % count) + count) % count;
  return Array.from(new Set(
    [0, 1, -1, 2, -2]
      .map((offset) => projects[wrap(activeProjectIndex + offset)])
      .map((project) => getImageSrc(project))
      .filter(Boolean)
      .map((src) => resolveAsset(src))
  ));
}

export function createPortfolioThumbnailWarmer({
  ImageConstructor = globalThis.Image,
  timeoutMs = PORTFOLIO_THUMBNAIL_READY_TIMEOUT_MS,
  setTimeoutImpl = (callback, delay) => globalThis.setTimeout(callback, delay),
  clearTimeoutImpl = (id) => globalThis.clearTimeout(id),
} = {}) {
  const promises = new Map();
  return function warm(src) {
    const cached = promises.get(src);
    if (cached) return cached;

    const pending = new Promise((resolve) => {
      const image = new ImageConstructor();
      let settled = false;
      let timeoutId = 0;
      const finish = (ready) => {
        if (settled) return;
        settled = true;
        clearTimeoutImpl(timeoutId);
        image.onload = null;
        image.onerror = null;
        resolve({ src, ready });
      };
      const decode = async () => {
        try {
          if (typeof image.decode === 'function') await image.decode();
          finish(image.naturalWidth > 0);
        } catch {
          finish(image.naturalWidth > 0);
        }
      };
      image.onload = decode;
      image.onerror = () => finish(false);
      image.decoding = 'async';
      image.src = src;
      timeoutId = setTimeoutImpl(() => finish(false), timeoutMs);
      if (image.complete) {
        if (image.naturalWidth > 0) void decode();
        else finish(false);
      }
    });

    promises.set(src, pending);
    void pending.then((result) => {
      if (!result.ready && promises.get(src) === pending) promises.delete(src);
    });
    return pending;
  };
}

export function createPortfolioPrewarmCoordinator({
  loadData = loadPortfolioData,
  loadConfig = loadPortfolioRuntimeConfig,
  warmThumbnail,
  resolveAsset = resolvePortfolioAsset,
  getImageSrc = getProjectImageSrc,
  now = () => performance.now(),
  schedule = (callback, delay) => globalThis.setTimeout(callback, delay),
  publish = () => {},
} = {}) {
  const state = {
    status: 'idle',
    startedAt: 0,
    settledAt: 0,
    criticalSourceCount: 0,
    readySourceCount: 0,
  };
  let thumbnailPreloadPromise = null;
  const publishState = () => publish({ ...state });

  return {
    getState: () => ({ ...state }),
    async preload({ signal = null, includeMedia = true, waitForMedia = false } = {}) {
      state.status = 'loading';
      state.startedAt = now();
      state.settledAt = 0;
      publishState();
      try {
        const [data] = await Promise.all([loadData(), loadConfig()]);
        if (signal?.aborted) throw new DOMException('Portfolio prewarm aborted.', 'AbortError');
        if (!includeMedia) {
          state.status = 'prepared';
          state.settledAt = now();
          publishState();
          return true;
        }
        if (!thumbnailPreloadPromise) {
          const sources = getCriticalPortfolioThumbnailSources(data, 0, { getImageSrc, resolveAsset });
          state.criticalSourceCount = sources.length;
          thumbnailPreloadPromise = Promise.all(sources.map(warmThumbnail))
            .then((results) => {
              state.readySourceCount = results.filter((result) => result.ready).length;
              state.status = 'ready';
              state.settledAt = now();
              publishState();
              return results;
            })
            .finally(() => {
              thumbnailPreloadPromise = null;
            });
        }
        const settledWithinBudget = waitForMedia
          ? await thumbnailPreloadPromise.then(() => true)
          : await Promise.race([
              thumbnailPreloadPromise.then(() => true),
              new Promise((resolve) => schedule(() => resolve(false), 650)),
            ]);
        if (signal?.aborted) throw new DOMException('Portfolio prewarm aborted.', 'AbortError');
        if (!settledWithinBudget) {
          state.status = 'warming';
          publishState();
        }
        return true;
      } catch (error) {
        state.status = 'failed';
        state.settledAt = now();
        publishState();
        return false;
      }
    },
  };
}

export const warmPortfolioThumbnail = createPortfolioThumbnailWarmer();
const portfolioPrewarm = createPortfolioPrewarmCoordinator({
  warmThumbnail: warmPortfolioThumbnail,
  publish: (state) => {
    if (typeof window !== 'undefined') window.__ABS_PORTFOLIO_PREWARM__ = state;
  },
});

export function preloadPortfolioRoute(options = {}) {
  return portfolioPrewarm.preload(options);
}
