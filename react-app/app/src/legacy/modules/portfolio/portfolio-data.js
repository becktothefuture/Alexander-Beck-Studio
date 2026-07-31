import { getBasePathWithTrailingSlash } from '../../../lib/base-path.js';
import { loadPortfolioConfig } from './portfolio-config.js';
import { getProjectContentBlocks } from './portfolio-content.js';

const BASE_PATH = (() => {
  try {
    const base = window.PORTFOLIO_BASE || '';
    if (base) return base.endsWith('/') ? base : `${base}/`;
    return getBasePathWithTrailingSlash();
  } catch (error) {
    return getBasePathWithTrailingSlash();
  }
})();

const PORTFOLIO_PATHS = Object.freeze({
  basePath: BASE_PATH,
  assetBasePath: `${BASE_PATH}images/portfolio/pages/`,
  dataPath: `${BASE_PATH}config/contents-portfolio.json`,
  coverFallback: `${BASE_PATH}images/portfolio/folio-cover/cover-default.webp`,
});

let portfolioConfigPromise = null;
let cacheBustValue = null;

function getCacheBustValue() {
  if (cacheBustValue !== null) return cacheBustValue;
  if (typeof window !== 'undefined' && typeof window.__BUILD_TIMESTAMP__ !== 'undefined') {
    cacheBustValue = String(window.__BUILD_TIMESTAMP__);
  } else {
    cacheBustValue = String(Date.now());
  }
  return cacheBustValue;
}

const PORTFOLIO_DATA_PATHS = Object.freeze([
  PORTFOLIO_PATHS.dataPath,
  `${PORTFOLIO_PATHS.basePath}js/contents-portfolio.json`,
  '../dist/js/contents-portfolio.json',
]);

export function createPortfolioDataLoader({
  paths = PORTFOLIO_DATA_PATHS,
  fetchImpl = (...args) => fetch(...args),
} = {}) {
  let pending = null;
  return async function load(signal = null) {
    // Portfolio remains runtime-fetched because the legacy deck/drawer runtime
    // consumes project data outside the Vite virtual content path.
    if (!pending) {
      pending = (async () => {
        for (const path of paths) {
          try {
            const response = await fetchImpl(path, { cache: 'no-cache' });
            if (!response.ok) continue;
            return await response.json();
          } catch (error) {
            continue;
          }
        }
        throw new Error('No portfolio data found');
      })().catch((error) => {
        pending = null;
        throw error;
      });
    }
    const data = await pending;
    if (signal?.aborted) throw new DOMException('Portfolio load aborted', 'AbortError');
    return data;
  };
}

const loadCachedPortfolioData = createPortfolioDataLoader();

export function loadPortfolioData(signal = null) {
  return loadCachedPortfolioData(signal);
}

export function loadPortfolioRuntimeConfig() {
  if (!portfolioConfigPromise) portfolioConfigPromise = loadPortfolioConfig();
  return portfolioConfigPromise;
}

export function createPortfolioAssetResolver({
  basePath = PORTFOLIO_PATHS.basePath,
  assetBasePath = PORTFOLIO_PATHS.assetBasePath,
  getCacheBust = getCacheBustValue,
} = {}) {
  return (src) => {
    if (!src) return '';
    if (/^https?:\/\//.test(src)) return src;
    const trimmed = src.replace(/^\/+/, '');
    const baseUrl = /^(?:images|video)\//.test(trimmed)
      ? `${basePath}${trimmed}`
      : `${assetBasePath}${trimmed}`;
    const separator = baseUrl.includes('?') ? '&' : '?';
    return `${baseUrl}${separator}v=${getCacheBust()}`;
  };
}

export const resolvePortfolioAsset = createPortfolioAssetResolver();

export function getPortfolioCoverFallback() {
  return PORTFOLIO_PATHS.coverFallback;
}

export function getProjectTags(project) {
  return Array.isArray(project?.tags) ? project.tags.slice(0, 3) : [];
}

export function getProjectAccessMode(project) {
  return project?.access === 'public' ? 'public' : 'protected';
}

export function getProjectImageSrc(project) {
  if (project?.image) return project.image;
  const imageBlock = getProjectContentBlocks(project).find((block) => {
    const src = String(block?.src || '');
    return block?.type === 'image' || /\.(avif|jpe?g|png|webp)$/i.test(src);
  });
  return imageBlock?.src || '';
}

export function getProjectVideoSrc(project) {
  if (project?.thumbnailVideo) return project.thumbnailVideo;
  if (project?.video) return project.video;
  return '';
}

export function getPortfolioVideoMimeType(src) {
  if (/\.webm(\?|#|$)/i.test(src)) return 'video/webm';
  if (/\.mp4(\?|#|$)/i.test(src)) return 'video/mp4';
  return '';
}
