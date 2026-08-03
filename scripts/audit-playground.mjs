#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { chromium, webkit } from 'playwright';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const baseUrl = String(process.env.ABS_PLAYGROUND_URL || process.env.ABS_DEV_URL || 'http://127.0.0.1:8012')
  .replace(/\/+$/, '');
const outputRoot = resolve(repoRoot, 'output', 'playwright', 'playground');
const runStamp = new Date().toISOString().replace(/[:.]/g, '-');
const runRoot = resolve(outputRoot, `${runStamp}-${browserName}`);
const timeoutMs = Number(process.env.ABS_PLAYGROUND_TIMEOUT_MS || 30000);
const viewport = { width: 1440, height: 1000 };
const GRID_ALIGNMENT_TOLERANCE_CELLS = 0.0025;
const localOrigin = new URL(baseUrl).origin;
const previewMode = process.env.ABS_PLAYGROUND_PREVIEW === '1';
const canonicalWriteMode = process.env.ABS_PLAYGROUND_CANONICAL_WRITE === '1';
const canonicalConfigPath = resolve(
  repoRoot,
  'react-app/app/public/config/design-system.json',
);
const canonicalWriteRestorePaths = [
  canonicalConfigPath,
  resolve(repoRoot, 'react-app/app/public/config/default-config.json'),
  resolve(repoRoot, 'react-app/app/public/config/shell-config.json'),
  resolve(repoRoot, 'react-app/app/public/config/portfolio-config.json'),
  resolve(repoRoot, 'react-app/app/public/config/cv-config.json'),
];
const canonicalContentPath = resolve(
  repoRoot,
  'react-app/app/public/config/contents-playground.json',
);

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

function round(value) {
  return Math.round(Number(value || 0) * 100) / 100;
}

async function waitForServer() {
  const response = await fetch(`${baseUrl}/playground.html`);
  assert(response.ok, `Playground server is not ready at ${baseUrl}`, { status: response.status });
}

async function waitForRuntimeDiagnostics(page) {
  try {
    await page.waitForFunction(() => {
      const diagnostics = window.__ABS_PLAYGROUND__?.getSnapshot?.().diagnostics;
      if (!diagnostics) return false;
      const videoCount = document.querySelectorAll(
        '.playground-semantic-collection video, .playground-lightbox video',
      ).length;
      const iframeCount = document.querySelectorAll(
        '.playground-semantic-collection iframe, .playground-lightbox iframe',
      ).length;
      return diagnostics.activeVideoCount === videoCount
        && diagnostics.activeIframeCount === iframeCount;
    }, null, { timeout: timeoutMs, polling: 'raf' });
  } catch (error) {
    const state = await page.evaluate(() => ({
      url: location.href,
      diagnostics: window.__ABS_PLAYGROUND__?.getSnapshot?.().diagnostics || null,
      videoCount: document.querySelectorAll(
        '.playground-semantic-collection video, .playground-lightbox video',
      ).length,
      iframeCount: document.querySelectorAll(
        '.playground-semantic-collection iframe, .playground-lightbox iframe',
      ).length,
      lightboxCount: document.querySelectorAll('.playground-lightbox').length,
    }));
    assert(false, 'Playground media ownership diagnostics did not settle', {
      ...state,
      cause: error?.message || String(error),
    });
  }
}

async function installAuditHooks(page) {
  await page.addInitScript(() => {
    const targetIds = new WeakMap();
    const listenerIds = new WeakMap();
    const activeListeners = new Map();
    let nextTargetId = 1;
    let nextListenerId = 1;
    const targetId = (target) => {
      if (!targetIds.has(target)) targetIds.set(target, nextTargetId++);
      return targetIds.get(target);
    };
    const listenerId = (listener) => {
      if (!listenerIds.has(listener)) listenerIds.set(listener, nextListenerId++);
      return listenerIds.get(listener);
    };
    const captureValue = (options) => (
      typeof options === 'boolean' ? options : Boolean(options?.capture)
    );
    const listenerKey = (target, type, listener, options) => (
      `${targetId(target)}:${type}:${listenerId(listener)}:${captureValue(options) ? 1 : 0}`
    );
    const targetScope = (target) => {
      if (!(target instanceof Element)) return 'global';
      return target.matches?.('[data-playground-experience], [data-playground-viewport]')
        || target.closest?.('[data-playground-experience]')
        ? 'playground'
        : 'other';
    };
    const nativeAdd = EventTarget.prototype.addEventListener;
    const nativeRemove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function addEventListener(type, listener, options) {
      if (listener) {
        activeListeners.set(listenerKey(this, type, listener, options), {
          type: String(type),
          targetScope: targetScope(this),
          listenerName: String(listener.name || listener.handleEvent?.name || ''),
        });
      }
      return nativeAdd.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function removeEventListener(type, listener, options) {
      if (listener) activeListeners.delete(listenerKey(this, type, listener, options));
      return nativeRemove.call(this, type, listener, options);
    };

    const activeFrames = new Set();
    const nativeRequestFrame = window.requestAnimationFrame.bind(window);
    const nativeCancelFrame = window.cancelAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      let frameId = 0;
      frameId = nativeRequestFrame((timestamp) => {
        activeFrames.delete(frameId);
        callback(timestamp);
      });
      activeFrames.add(frameId);
      return frameId;
    };
    window.cancelAnimationFrame = (frameId) => {
      activeFrames.delete(frameId);
      nativeCancelFrame(frameId);
    };

    const snapshot = () => {
      const byType = {};
      const playgroundByType = {};
      activeListeners.forEach((record) => {
        byType[record.type] = (byType[record.type] || 0) + 1;
        if (record.targetScope === 'playground') {
          playgroundByType[record.type] = (playgroundByType[record.type] || 0) + 1;
        }
      });
      return { byType, playgroundByType, activeFrameCount: activeFrames.size };
    };
    Object.defineProperty(window, '__ABS_PLAYGROUND_LIFECYCLE_AUDIT__', {
      configurable: true,
      value: { snapshot },
    });

    const installReadyObserver = () => {
      const captures = [];
      const capture = (route) => {
        if (route?.dataset.playgroundReady !== 'true') return;
        const title = document.querySelector('.playground-title-anchor');
        const rect = title?.getBoundingClientRect();
        captures.push({
          fontsStatus: document.fonts?.status || 'unsupported',
          titleFontReady: document.fonts?.check?.('1em "Instrument Serif"') ?? true,
          opacity: Number.parseFloat(getComputedStyle(route).opacity || '0'),
          rect: rect ? {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          } : null,
        });
      };
      const observer = new MutationObserver((records) => {
        records.forEach((record) => capture(record.target));
      });
      observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-playground-ready'],
        childList: true,
        subtree: true,
      });
      document.querySelectorAll('[data-playground-ready="true"]').forEach(capture);
      window.__ABS_PLAYGROUND_READY_AUDIT__ = { captures };
    };
    if (document.documentElement) installReadyObserver();
    else document.addEventListener('DOMContentLoaded', installReadyObserver, { once: true });
  });
}

function bindFailureCapture(page, failures) {
  page.on('console', (message) => {
    if (message.type() === 'error') failures.consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => failures.pageErrors.push(error.message));
  page.on('requestfailed', (request) => {
    const errorText = request.failure()?.errorText || 'failed';
    if (request.resourceType() === 'media' && errorText.includes('ERR_ABORTED')) return;
    if (errorText.toLowerCase() === 'cancelled') return;
    if (new URL(request.url()).origin === localOrigin) {
      failures.failedRequests.push(`${request.method()} ${request.url()}: ${errorText}`);
    }
  });
  page.on('response', (response) => {
    if (new URL(response.url()).origin === localOrigin && response.status() >= 400) {
      failures.failedResponses.push(`${response.status()} ${response.url()}`);
    }
  });
}

async function waitForIdle(page) {
  await page.waitForFunction(() => {
    const root = document.documentElement;
    const phase = root.dataset.absTransitionPhase || 'idle';
    const pending = document.querySelector('[data-route-tabs]')?.dataset.pendingRoute || '';
    return phase === 'idle' && pending === '';
  }, null, { timeout: timeoutMs, polling: 'raf' });
}

async function waitForPlayground(page) {
  await page.waitForSelector('[data-playground-experience][data-playground-ready="true"]', {
    state: 'visible',
    timeout: timeoutMs,
  });
  await page.waitForFunction(() => Boolean(window.__ABS_PLAYGROUND__), null, {
    timeout: timeoutMs,
    polling: 'raf',
  });
  await page.waitForFunction(() => {
    const firstItem = document.querySelector('[data-playground-item]');
    const itemStyle = firstItem ? getComputedStyle(firstItem) : null;
    return (
      document.querySelector('[data-route-tab="playground"]')?.getAttribute('aria-current') === 'page'
      && document.querySelector('[data-shell-route-view]')?.dataset.shellRouteView === 'playground'
      && itemStyle?.pointerEvents !== 'none'
      && Number.parseFloat(itemStyle?.opacity || '0') >= 0.98
    );
  }, null, { timeout: timeoutMs, polling: 'raf' });
  await waitForIdle(page);
  await page.waitForFunction(() => {
    const overlay = document.getElementById('abs-boot-overlay');
    if (!overlay) return true;
    const style = getComputedStyle(overlay);
    return overlay.hidden
      || style.display === 'none'
      || style.visibility === 'hidden'
      || Number.parseFloat(style.opacity || '1') <= 0.01;
  }, null, { timeout: timeoutMs, polling: 'raf' });
  await page.waitForFunction(() => {
    const glyphs = [...document.querySelectorAll('.playground-title-lockup [data-route-enter-glyph]')];
    return glyphs.length > 0 && glyphs.every((glyph) => {
      const style = getComputedStyle(glyph);
      let transformIsSettled = style.transform === 'none';
      if (!transformIsSettled) {
        try {
          const matrix = new DOMMatrixReadOnly(style.transform);
          transformIsSettled = matrix.is2D
            && matrix.a === 1
            && matrix.b === 0
            && matrix.c === 0
            && matrix.d === 1
            && matrix.e === 0
            && matrix.f === 0;
        } catch {
          transformIsSettled = false;
        }
      }
      return Number.parseFloat(style.opacity || '0') >= 0.98
        && transformIsSettled
        && style.visibility === 'visible';
    });
  }, null, { timeout: timeoutMs, polling: 'raf' });
  await page.waitForFunction(() => {
    const routeView = document.querySelector('[data-shell-route-view="playground"]');
    const viewportNode = document.querySelector('[data-playground-viewport]');
    const firstButton = document.querySelector('[data-playground-item] button');
    const lightbox = document.querySelector('.playground-lightbox[role="dialog"]');
    return routeView
      && !routeView.hasAttribute('inert')
      && routeView.getAttribute('aria-hidden') !== 'true'
      && !viewportNode?.closest('[inert], [aria-hidden="true"]')
      && (lightbox || !firstButton?.closest('[inert], [aria-hidden="true"]'));
  }, null, { timeout: timeoutMs, polling: 'raf' });
  await page.waitForFunction(() => (
    document.querySelector('[data-playground-experience]')?.dataset.routeMaterialState === 'complete'
  ), null, { timeout: timeoutMs, polling: 'raf' });
  await waitForRuntimeDiagnostics(page);
}

async function gotoPlayground(page, path = '/playground.html') {
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  await waitForPlayground(page);
}

async function getPlaygroundState(page) {
  return page.evaluate(() => {
    const route = document.querySelector('[data-playground-experience]');
    const viewportNode = document.querySelector('[data-playground-viewport]');
    const title = document.querySelector('.playground-title-anchor');
    const titleLockup = document.querySelector('.playground-title-lockup');
    const exploreCue = document.querySelector('.playground-drag-instruction');
    const exploreIcon = exploreCue?.querySelector('.playground-drag-instruction__icon');
    const rectOf = (node) => {
      if (!node) return null;
      const rect = node.getBoundingClientRect();
      return {
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
        centerX: rect.left + (rect.width / 2),
        centerY: rect.top + (rect.height / 2),
      };
    };
    const viewportBounds = viewportNode?.getBoundingClientRect() || null;
    const items = Array.from(document.querySelectorAll('[data-playground-item]')).map((item) => {
      const button = item.querySelector('button');
      const label = item.querySelector('.playground-item__label');
      const description = item.querySelector('.playground-item__description');
      const media = item.querySelector('.playground-media, .playground-item__media');
      const itemTransform = getComputedStyle(item).transform;
      const itemTransformMatrix = itemTransform === 'none'
        ? new DOMMatrixReadOnly()
        : new DOMMatrixReadOnly(itemTransform);
      const style = getComputedStyle(label);
      const descriptionStyle = getComputedStyle(description);
      const titleStyle = getComputedStyle(item.querySelector('.playground-item__title'));
      const mediaStyle = getComputedStyle(media);
      const itemRect = rectOf(item);
      const intersectionWidth = itemRect && viewportBounds
        ? Math.max(0, Math.min(itemRect.right, viewportBounds.right)
          - Math.max(itemRect.left, viewportBounds.left))
        : 0;
      const intersectionHeight = itemRect && viewportBounds
        ? Math.max(0, Math.min(itemRect.bottom, viewportBounds.bottom)
          - Math.max(itemRect.top, viewportBounds.top))
        : 0;
      return {
        id: item.dataset.playgroundItem,
        type: item.dataset.playgroundItemType,
        rect: itemRect,
        visibleIntersectionRatio: itemRect?.width > 0 && itemRect?.height > 0
          ? (intersectionWidth * intersectionHeight) / (itemRect.width * itemRect.height)
          : 0,
        left: itemTransformMatrix.m41,
        top: itemTransformMatrix.m42,
        width: Number.parseFloat(item.style.getPropertyValue('--playground-item-width-px') || '0'),
        height: Number.parseFloat(item.style.getPropertyValue('--playground-item-height-px') || '0'),
        buttonCount: item.querySelectorAll('button').length,
        labelText: label?.textContent?.replace(/\s+/g, ' ').trim() || '',
        labelFontSize: Number.parseFloat(style.fontSize || '0'),
        titleFontSize: Number.parseFloat(titleStyle.fontSize || '0'),
        descriptionFontSize: Number.parseFloat(descriptionStyle.fontSize || '0'),
        buttonTabIndex: button?.tabIndex ?? null,
        labelVisibility: style.visibility,
        hasTypeTag: Boolean(item.querySelector('.playground-item__type')),
        descriptionFontFamily: descriptionStyle.fontFamily,
        descriptionTextAlign: descriptionStyle.textAlign,
        descriptionLineClamp: descriptionStyle.webkitLineClamp,
        descriptionOverflow: descriptionStyle.overflow,
        descriptionClientHeight: description.clientHeight,
        descriptionScrollHeight: description.scrollHeight,
        mediaBorderWidth: Math.max(
          Number.parseFloat(mediaStyle.borderTopWidth || '0'),
          Number.parseFloat(mediaStyle.borderRightWidth || '0'),
          Number.parseFloat(mediaStyle.borderBottomWidth || '0'),
          Number.parseFloat(mediaStyle.borderLeftWidth || '0'),
        ),
        mediaBorderRadius: Number.parseFloat(mediaStyle.borderTopLeftRadius || '0'),
        accessibleName: button?.getAttribute('aria-label') || '',
      };
    });
    const copies = Array.from(document.querySelectorAll('[data-playground-copy]')).map((copy) => {
      const [column, row] = String(copy.dataset.playgroundCopy || '').split(',').map(Number);
      return { column, row };
    });
    const tabStops = Array.from(document.querySelectorAll(
      '[data-playground-experience] a[href], [data-playground-experience] button, '
      + '[data-playground-experience] iframe:not([tabindex="-1"]), '
      + '[data-playground-experience] video[controls]:not([tabindex="-1"]), '
      + '[data-playground-experience] [tabindex]:not([tabindex="-1"])',
    )).filter((node) => node.tabIndex >= 0
      && !node.closest('[aria-hidden="true"]')
      && !node.closest('[inert]'));
    return {
      path: location.pathname,
      search: location.search,
      routeReady: route?.dataset.playgroundReady || '',
      activeRoute: document.querySelector('[data-route-tab][aria-current="page"]')?.dataset.routeTab || '',
      tabs: Array.from(document.querySelectorAll('[data-route-tab]')).map((tab) => ({
        id: tab.dataset.routeTab,
        current: tab.getAttribute('aria-current'),
        label: tab.textContent.replace(/\s+/g, ' ').trim(),
      })),
      viewportMeta: document.querySelector('meta[name="viewport"]')?.content || '',
      viewportRect: rectOf(viewportNode),
      titleRect: rectOf(title),
      exploreCue: exploreCue && exploreIcon ? {
        cueRect: rectOf(exploreCue),
        iconRect: rectOf(exploreIcon),
        lockupRect: rectOf(titleLockup),
        hiddenLabel: exploreCue.textContent.replace(/\s+/g, ' ').trim(),
        iconTag: exploreIcon.tagName.toLowerCase(),
        expectedGap: Math.min(12, Math.max(8, window.innerHeight * 0.012)),
        expectedIconSize: 0.38 * Math.min(48, Math.max(36, window.innerWidth * 0.032)),
        expectedCueWidth: 0.79 * Math.min(52, Math.max(40, window.innerWidth * 0.032)),
        expectedCueHeight: 0.79 * Math.min(64, Math.max(48, window.innerHeight * 0.06)),
      } : null,
      titleReadyAudit: window.__ABS_PLAYGROUND_READY_AUDIT__?.captures || [],
      routeTransform: getComputedStyle(route).transform,
      gridSpacing: Number.parseFloat(getComputedStyle(route).getPropertyValue('--playground-grid-spacing-px') || '0'),
      items,
      copies,
      semanticButtonCount: document.querySelectorAll(
        '[data-playground-item] > .playground-item__route-surface > button',
      ).length,
      decorativeItemCount: document.querySelectorAll('[data-playground-decorative-item]').length,
      visibleTypeTagCount: document.querySelectorAll('.playground-item__type').length,
      decorativeInteractiveCount: document.querySelectorAll(
        '[data-playground-decorative-item] button, [data-playground-decorative-item] a, '
        + '[data-playground-decorative-item] video, [data-playground-decorative-item] iframe',
      ).length,
      tabStopCount: tabStops.length,
      videoCount: document.querySelectorAll('.playground-lightbox video').length,
      iframeCount: document.querySelectorAll('.playground-lightbox iframe').length,
      worldVideoCount: document.querySelectorAll('.playground-semantic-collection video').length,
      worldIframeCount: document.querySelectorAll('.playground-semantic-collection iframe').length,
      activeWorldItemIds: Array.from(document.querySelectorAll(
        '[data-playground-item][data-playground-media-active="true"]',
      ), (node) => node.dataset.playgroundItem),
      lightboxCount: document.querySelectorAll('.playground-lightbox[role="dialog"]').length,
      snapshot: window.__ABS_PLAYGROUND__?.getSnapshot?.() || null,
      lifecycle: window.__ABS_PLAYGROUND_LIFECYCLE_AUDIT__?.snapshot?.() || null,
      panelLauncher: Boolean(document.querySelector('.panel-toggle-btn[data-panel-detach-supported="true"]')),
    };
  });
}

async function waitForCameraChange(page, before, axes = ['x', 'y']) {
  await page.waitForFunction(({ previous, requestedAxes }) => {
    const camera = window.__ABS_PLAYGROUND__?.getSnapshot?.().camera;
    if (!camera) return false;
    return requestedAxes.every((axis) => {
      const key = axis === 'x' ? 'logicalX' : 'logicalY';
      return Math.abs(camera[key] - previous[key]) > 0.5;
    });
  }, { previous: before, requestedAxes: axes }, { timeout: timeoutMs, polling: 'raf' });
}

async function waitForPlaygroundApi(page) {
  await page.waitForFunction(() => {
    const playground = window.__ABS_PLAYGROUND__;
    return typeof playground?.setCamera === 'function'
      && Boolean(playground.getSnapshot?.().camera)
      && document.querySelector('[data-playground-experience]')?.dataset.playgroundReady === 'true';
  }, null, { timeout: timeoutMs, polling: 'raf' });
}

async function setCamera(page, x, y) {
  await waitForPlaygroundApi(page);
  await page.evaluate(({ nextX, nextY }) => window.__ABS_PLAYGROUND__.setCamera(nextX, nextY), {
    nextX: x,
    nextY: y,
  });
  await page.waitForFunction(({ nextX, nextY }) => {
    const camera = window.__ABS_PLAYGROUND__?.getSnapshot?.().camera;
    return camera
      && Math.abs(camera.logicalX - nextX) < 0.1
      && Math.abs(camera.logicalY - nextY) < 0.1;
  }, { nextX: x, nextY: y }, { timeout: timeoutMs, polling: 'raf' });
  await page.evaluate(() => new Promise((resolvePaint) => requestAnimationFrame(() => requestAnimationFrame(resolvePaint))));
}

function assertBaseline(state) {
  assert(['/playground', '/playground.html'].includes(state.path), 'Unexpected Playground path', state);
  assert(state.routeReady === 'true', 'Playground readiness marker is not true', state);
  assert(state.activeRoute === 'playground', 'Playground shell pill is not selected', state);
  assert(state.tabs.length === 5, 'The shared shell does not expose five tabs', state.tabs);
  assert(
    state.tabs.map((tab) => tab.id).join(',') === 'home,portfolio,about,playground,contact',
    'The shared shell route order is incorrect',
    state.tabs,
  );
  assert(state.tabs.filter((tab) => tab.current === 'page').length === 1, 'Exactly one shell tab must be current', state.tabs);
  assert(state.tabs.some((tab) => tab.id === 'playground' && tab.current === 'page'), 'Playground pill is not current', state.tabs);
  assert(!/maximum-scale\s*=|user-scalable\s*=\s*no/i.test(state.viewportMeta), 'Browser zoom is disabled', state.viewportMeta);
  assert(!/scale\(/i.test(state.routeTransform), 'Playground applies application zoom', state.routeTransform);
  assert(state.viewportRect && state.titleRect, 'Title or viewport geometry is missing', state);
  assert(Math.abs(state.viewportRect.centerX - state.titleRect.centerX) <= 1, 'Initial title is not centred horizontally', state);
  assert(Math.abs(state.viewportRect.centerY - state.titleRect.centerY) <= 1, 'Initial title is not centred vertically', state);
  assert(state.exploreCue, 'Playground explore cue is missing', state);
  const cueVisualGap = state.exploreCue.cueRect.top - state.exploreCue.lockupRect.bottom;
  assert(
    state.exploreCue.iconTag === 'svg'
      && state.exploreCue.hiddenLabel === 'Drag to explore.'
      && Math.abs(cueVisualGap - state.exploreCue.expectedGap) <= 0.5
      && Math.abs(state.exploreCue.iconRect.width - state.exploreCue.expectedIconSize) <= 0.5
      && Math.abs(state.exploreCue.iconRect.height - state.exploreCue.expectedIconSize) <= 0.5
      && Math.abs(state.exploreCue.cueRect.width - state.exploreCue.expectedCueWidth) <= 0.5
      && Math.abs(state.exploreCue.cueRect.height - state.exploreCue.expectedCueHeight) <= 0.5,
    'Explore cue does not match the specified size and lockup distance',
    { ...state.exploreCue, cueVisualGap },
  );
  assert(state.titleReadyAudit.some((capture) => capture.titleFontReady && capture.rect?.width > 0), 'Title was revealed before final font geometry', state.titleReadyAudit);
  assert(state.items.length === 30, 'Playground must expose exactly 30 logical items', state.items.length);
  assert(new Set(state.items.map((item) => item.id)).size === 30, 'Logical item IDs are not unique');
  const typeCounts = state.items.reduce((counts, item) => {
    counts[item.type] = (counts[item.type] || 0) + 1;
    return counts;
  }, {});
  assert(typeCounts.image === 18 && typeCounts.video === 6 && typeCounts.code === 6, 'Media type split is incorrect', typeCounts);
  assert(state.semanticButtonCount === 30, 'Semantic collection must expose one button per logical item', state);
  assert(state.tabStopCount === 2, 'Lab must expose the viewport and one roving project as tab stops', state);
  assert(
    state.items.filter((item) => item.buttonTabIndex === 0).length === 1
      && state.items.filter((item) => item.buttonTabIndex === -1).length === 29,
    'Lab project buttons do not implement one roving tab stop',
    state.items,
  );
  assert(state.decorativeInteractiveCount === 0, 'Decorative copies contain interactive media', state);
  assert(state.items.every((item) => item.buttonCount === 1 && item.accessibleName.length > 10), 'Logical items have incomplete accessible controls', state.items);
  assert(state.items.every((item) => item.labelText && item.labelFontSize >= 10 && item.labelVisibility !== 'hidden'), 'Labels are missing or unreadable', state.items);
  assert(state.visibleTypeTagCount === 0 && state.items.every((item) => !item.hasTypeTag), 'Visible media-type tags remain in Lab captions', state.items);
  assert(
    state.items.every((item) => (
      /Geist/i.test(item.descriptionFontFamily)
      && ['left', 'start'].includes(item.descriptionTextAlign)
      && item.descriptionLineClamp === 'none'
      && item.descriptionOverflow === 'visible'
      && item.descriptionScrollHeight <= item.descriptionClientHeight + 1
    )),
    'Lab captions do not use the full, unclipped, left-aligned Portfolio caption treatment',
    state.items,
  );
  assert(
    state.items.every((item) => item.mediaBorderWidth === 0 && item.mediaBorderRadius > 0),
    'Lab media must retain rounded corners without a visible border',
    state.items,
  );
  assert(
    state.items.filter((item) => item.visibleIntersectionRatio >= 0.25).length >= 6,
    'The initial desktop Lab composition is too sparse around the title',
    state.items.map(({ id, visibleIntersectionRatio }) => ({ id, visibleIntersectionRatio })),
  );
  assert(state.snapshot?.diagnostics?.projectCount === 30, 'Runtime diagnostics do not report 30 projects', state.snapshot);
  assert(
    state.snapshot?.diagnostics?.activeVideoCount === state.worldVideoCount + state.videoCount,
    'Video diagnostics do not match mounted runtime elements',
    state,
  );
  assert(
    state.snapshot?.diagnostics?.activeIframeCount === state.worldIframeCount + state.iframeCount,
    'Iframe diagnostics do not match mounted runtime elements',
    state,
  );
  assert(state.snapshot?.camera?.logicalX === 0 && state.snapshot?.camera?.logicalY === 0, 'Initial camera is not centred', state.snapshot);
  assert(state.snapshot?.diagnostics?.worldColumns >= 80, 'World has fewer than 80 columns', state.snapshot);
  assert(state.snapshot?.diagnostics?.worldRows >= 56, 'World has fewer than 56 rows', state.snapshot);
  assert(state.snapshot?.diagnostics?.worldWidthPx > 2000, 'World width is fixed to or below the reference period', state.snapshot);
  assert(state.snapshot?.diagnostics?.worldHeightPx > 1400, 'World height is fixed to or below the reference period', state.snapshot);
  assert(
    previewMode ? !state.panelLauncher : state.panelLauncher,
    previewMode
      ? 'Production preview exposed the development parameter-panel launcher'
      : 'Playground parameter-panel launcher is missing',
    state,
  );
  assert(
    Object.values(state.lifecycle?.playgroundByType || {}).reduce((sum, count) => sum + count, 0) > 0,
    'Lifecycle instrumentation did not observe Playground-owned listeners',
    state.lifecycle,
  );

  const spacing = state.gridSpacing;
  const camera = state.snapshot.camera;
  assert(spacing > 0, 'Grid spacing is not available');
  state.items.forEach((item) => {
    const xCells = (item.left - camera.viewportCenterX + camera.renderedX) / spacing;
    const yCells = (item.top - camera.viewportCenterY + camera.renderedY) / spacing;
    assert(Math.abs((xCells * 4) - Math.round(xCells * 4)) < GRID_ALIGNMENT_TOLERANCE_CELLS, `${item.id} is not aligned to the salon quarter-cell`, { item, xCells });
    assert(Math.abs((yCells * 4) - Math.round(yCells * 4)) < GRID_ALIGNMENT_TOLERANCE_CELLS, `${item.id} is not aligned to the salon quarter-cell`, { item, yCells });
    assert(Math.abs((item.width / spacing) - Math.round(item.width / spacing)) < GRID_ALIGNMENT_TOLERANCE_CELLS, `${item.id} width is not grid-aligned`, item);
    assert(Math.abs((item.height / spacing) - Math.round(item.height / spacing)) < GRID_ALIGNMENT_TOLERANCE_CELLS, `${item.id} height is not grid-aligned`, item);
  });
}

async function assertWorldMediaLifecycle(page, evidence) {
  const initial = await getPlaygroundState(page);
  const posterLabelGeometry = await page.locator(
    '.playground-semantic-collection [data-playground-item]',
  ).evaluateAll((itemNodes) => itemNodes.map((itemNode) => {
    const labelRect = itemNode.querySelector('.playground-item__label')?.getBoundingClientRect();
    const mediaRect = itemNode.querySelector(':scope > button > .playground-media')?.getBoundingClientRect();
    return {
      itemId: itemNode.dataset.playgroundItem,
      labelTop: labelRect?.top ?? null,
      mediaBottom: mediaRect?.bottom ?? null,
      gap: labelRect && mediaRect ? labelRect.top - mediaRect.bottom : null,
    };
  }));
  posterLabelGeometry.forEach((geometry) => {
    assert(
      geometry.gap >= -0.25,
      'A Lab label overlaps its thumbnail poster',
      geometry,
    );
  });
  evidence.posterLabelGeometry = posterLabelGeometry;

  const visitMedia = async (type) => {
    const item = initial.items.find((candidate) => candidate.type === type);
    const placement = initial.snapshot.placements.find((candidate) => candidate.id === item.id);
    const x = (placement.xCell + (placement.widthCells / 2)) * initial.gridSpacing;
    const y = (placement.yCell + (placement.heightCells / 2)) * initial.gridSpacing;
    await setCamera(page, x, y);
    await page.waitForFunction(({ itemId, mediaType }) => {
      const itemNode = document.querySelector(`[data-playground-item="${itemId}"]`);
      const runtime = itemNode?.querySelector(mediaType === 'video' ? 'video' : 'iframe');
      const diagnostics = window.__ABS_PLAYGROUND__?.getSnapshot?.().diagnostics;
      const actualCount = document.querySelectorAll(
        mediaType === 'video'
          ? '.playground-semantic-collection video, .playground-lightbox video'
          : '.playground-semantic-collection iframe, .playground-lightbox iframe',
      ).length;
      const reportedCount = mediaType === 'video'
        ? diagnostics?.activeVideoCount
        : diagnostics?.activeIframeCount;
      return itemNode?.dataset.playgroundMediaActive === 'true'
        && Boolean(runtime)
        && reportedCount === actualCount;
    }, { itemId: item.id, mediaType: type }, { timeout: timeoutMs, polling: 'raf' });

    const active = await getPlaygroundState(page);
    assert(
      active.decorativeInteractiveCount === 0,
      'A decorative toroidal copy mounted interactive media',
      active,
    );
    const ownershipIsUnique = await page.evaluate(() => Array.from(
      document.querySelectorAll('[data-playground-item]'),
      (itemNode) => itemNode.querySelectorAll('video, iframe').length <= 1,
    ).every(Boolean));
    assert(ownershipIsUnique, 'One logical item mounted more than one active media runtime');
    const interactiveMediaNestedInButton = await page.evaluate(() => (
      document.querySelectorAll('.playground-semantic-collection button :is(video, iframe)').length
    ));
    assert(
      interactiveMediaNestedInButton === 0,
      'World video or iframe runtime is nested inside a native button',
      { interactiveMediaNestedInButton },
    );
    const mediaLabelGeometry = await page.locator(
      `[data-playground-item="${item.id}"]`,
    ).evaluate((itemNode) => {
      const label = itemNode.querySelector('.playground-item__label');
      const mediaNodes = Array.from(itemNode.querySelectorAll(
        ':scope > .playground-item__route-surface > .playground-item__runtime, '
        + ':scope > .playground-item__route-surface > button > .playground-media',
      ));
      const labelRect = label?.getBoundingClientRect();
      const mediaBottom = Math.max(
        ...mediaNodes.map((node) => node.getBoundingClientRect().bottom),
      );
      return {
        labelTop: labelRect?.top ?? null,
        mediaBottom,
        gap: labelRect ? labelRect.top - mediaBottom : null,
      };
    });
    assert(
      mediaLabelGeometry.gap >= -0.25,
      'A Lab label overlaps its active thumbnail runtime',
      { itemId: item.id, type, mediaLabelGeometry },
    );

    if (type === 'video') {
      const hiddenPause = await page.evaluate(async () => {
        const video = document.querySelector('.playground-semantic-collection video');
        if (!video) return { mounted: false };
        await video.play().catch(() => {});
        Object.defineProperty(document, 'hidden', {
          configurable: true,
          value: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
        const result = { mounted: true, paused: video.paused };
        delete document.hidden;
        document.dispatchEvent(new Event('visibilitychange'));
        return result;
      });
      assert(hiddenPause.mounted && hiddenPause.paused, 'Visible world video kept playing while the document was hidden', hiddenPause);
    }
    if (type === 'code') {
      await page.screenshot({ path: resolve(runRoot, 'world-media-lifecycle.png'), fullPage: true });
    }

    await setCamera(page, x + (initial.snapshot.camera.worldWidthPx / 2), y);
    await page.waitForFunction((itemId) => {
      const itemNode = document.querySelector(`[data-playground-item="${itemId}"]`);
      return itemNode?.dataset.playgroundMediaActive !== 'true'
        && !itemNode?.querySelector('video, iframe');
    }, item.id, { timeout: timeoutMs, polling: 'raf' });
    return {
      itemId: item.id,
      mountedVideoCount: active.worldVideoCount,
      mountedIframeCount: active.worldIframeCount,
      mediaLabelGeometry,
      diagnostics: active.snapshot.diagnostics,
    };
  };

  evidence.worldMedia = {
    video: await visitMedia('video'),
    code: await visitMedia('code'),
  };
  await page.evaluate(() => window.__ABS_PLAYGROUND__.recenter());
}

async function assertCameraInputs(page, evidence) {
  const viewportNode = page.locator('[data-playground-viewport]');
  await viewportNode.hover();
  let before = (await getPlaygroundState(page)).snapshot.camera;
  await page.mouse.wheel(180, 0);
  await waitForCameraChange(page, before, ['x']);
  await page.waitForFunction(() => {
    const snapshot = window.__ABS_PLAYGROUND__?.getSnapshot?.();
    return Math.abs(snapshot.camera.renderedX - snapshot.camera.logicalX) < 0.1
      && Math.abs(snapshot.dotField.cameraX - snapshot.camera.renderedX) < 0.1
      && Math.abs(snapshot.dotField.lastDrawnCameraX - snapshot.camera.renderedX) < 0.1;
  }, null, { timeout: timeoutMs, polling: 'raf' });
  const horizontal = (await getPlaygroundState(page)).snapshot;
  assert(Math.abs(horizontal.camera.logicalY - before.logicalY) < 0.5, 'Horizontal wheel changed the vertical camera', horizontal.camera);

  before = horizontal.camera;
  await page.mouse.wheel(0, 160);
  await waitForCameraChange(page, before, ['y']);
  await page.waitForFunction((drawCount) => {
    const snapshot = window.__ABS_PLAYGROUND__?.getSnapshot?.();
    return snapshot?.dotField.drawCount > drawCount
      && Math.abs(snapshot.camera.renderedY - snapshot.camera.logicalY) < 0.1
      && Math.abs(snapshot.dotField.cameraY - snapshot.camera.renderedY) < 0.1
      && Math.abs(snapshot.dotField.lastDrawnCameraY - snapshot.camera.renderedY) < 0.1;
  }, horizontal.dotField.drawCount, { timeout: timeoutMs, polling: 'raf' });
  const vertical = (await getPlaygroundState(page)).snapshot;
  assert(vertical.dotField.drawCount > horizontal.dotField.drawCount, 'Dot-grid phase did not redraw with camera movement', { horizontal, vertical });
  assert(vertical.dotField.cameraY !== horizontal.dotField.cameraY, 'Dot-grid camera phase did not move', { horizontal, vertical });

  before = vertical.camera;
  await page.mouse.wheel(130, 110);
  await waitForCameraChange(page, before, ['x', 'y']);
  evidence.input.diagonalWheel = (await getPlaygroundState(page)).snapshot.camera;

  const box = await viewportNode.boundingBox();
  assert(box, 'Playground viewport has no drag geometry');
  before = evidence.input.diagonalWheel;
  await page.mouse.move(box.x + (box.width * 0.62), box.y + (box.height * 0.58));
  await page.mouse.down();
  await page.mouse.move(box.x + (box.width * 0.48), box.y + (box.height * 0.42), { steps: 8 });
  await page.mouse.up();
  await waitForCameraChange(page, before, ['x', 'y']);
  evidence.input.drag = (await getPlaygroundState(page)).snapshot.camera;

  await viewportNode.focus();
  before = evidence.input.drag;
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await waitForCameraChange(page, before, ['x', 'y']);
  evidence.input.keyboard = (await getPlaygroundState(page)).snapshot.camera;
  await page.keyboard.press('Home');
  await page.waitForFunction(() => {
    const camera = window.__ABS_PLAYGROUND__?.getSnapshot?.().camera;
    return camera?.logicalX === 0 && camera?.logicalY === 0;
  }, null, { timeout: timeoutMs, polling: 'raf' });
}

async function assertSalonCoverage(page, evidence) {
  const snapshot = await page.evaluate(() => window.__ABS_PLAYGROUND__.getSnapshot());
  const samples = [];
  const sampleCount = 8;

  for (let row = 0; row < sampleCount; row += 1) {
    for (let column = 0; column < sampleCount; column += 1) {
      const cameraX = (snapshot.camera.worldWidthPx * column) / sampleCount;
      const cameraY = (snapshot.camera.worldHeightPx * row) / sampleCount;
      await page.evaluate(({ x, y }) => window.__ABS_PLAYGROUND__.setCamera(x, y), {
        x: cameraX,
        y: cameraY,
      });
      await page.evaluate(() => new Promise((resolvePaint) => (
        requestAnimationFrame(() => requestAnimationFrame(resolvePaint))
      )));
      const visibleCount = await page.evaluate(() => {
        const viewportBounds = document.querySelector('[data-playground-viewport]')
          .getBoundingClientRect();
        return Array.from(document.querySelectorAll('.playground-item--semantic'))
          .filter((item) => {
            const bounds = item.getBoundingClientRect();
            return bounds.right > viewportBounds.left
              && bounds.left < viewportBounds.right
              && bounds.bottom > viewportBounds.top
              && bounds.top < viewportBounds.bottom;
          }).length;
      });
      samples.push({ column, row, visibleCount });
    }
  }

  const rotationFree = await page.evaluate(() => (
    Array.from(document.querySelectorAll('.playground-item')).every((item) => {
      const transform = getComputedStyle(item).transform;
      if (!transform || transform === 'none') return true;
      const matrix = new DOMMatrixReadOnly(transform);
      return Math.abs(matrix.b) < 0.0001 && Math.abs(matrix.c) < 0.0001;
    })
  ));
  await page.evaluate(() => window.__ABS_PLAYGROUND__.recenter());

  const counts = samples.map((sample) => sample.visibleCount);
  const minimum = Math.min(...counts);
  const maximum = Math.max(...counts);
  const average = counts.reduce((sum, count) => sum + count, 0) / counts.length;
  assert(minimum >= 4, 'Salon placement leaves a sparse pannable viewport', {
    minimum,
    samples: samples.filter((sample) => sample.visibleCount === minimum),
  });
  assert(maximum <= 13, 'Salon placement is too dense in a pannable viewport', {
    maximum,
    samples: samples.filter((sample) => sample.visibleCount === maximum),
  });
  assert(rotationFree, 'One or more Playground works are rotated');
  evidence.salonCoverage = { minimum, maximum, average, rotationFree, sampleCount: counts.length };
}

async function assertSpatialProjectNavigation(page, evidence) {
  await page.evaluate(() => window.__ABS_PLAYGROUND__.recenter());
  const viewport = page.locator('[data-playground-viewport]');
  await viewport.focus();
  await page.keyboard.press('Tab');
  await page.waitForFunction(() => Boolean(
    document.activeElement?.closest?.('[data-playground-item]'),
  ), null, { timeout: timeoutMs, polling: 'raf' });
  const first = await page.evaluate(() => ({
    itemId: document.activeElement.closest('[data-playground-item]').dataset.playgroundItem,
    camera: window.__ABS_PLAYGROUND__.getSnapshot().camera,
  }));
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction((previousId) => {
    const item = document.activeElement?.closest?.('[data-playground-item]');
    return item?.dataset.playgroundItem && item.dataset.playgroundItem !== previousId;
  }, first.itemId, { timeout: timeoutMs, polling: 'raf' });
  await page.evaluate(() => new Promise((resolvePaint) => requestAnimationFrame(resolvePaint)));
  const next = await page.evaluate(() => {
    const item = document.activeElement.closest('[data-playground-item]');
    const itemRect = item.getBoundingClientRect();
    const viewportRect = document.querySelector('[data-playground-viewport]').getBoundingClientRect();
    return {
      itemId: item.dataset.playgroundItem,
      itemRect: {
        left: itemRect.left,
        top: itemRect.top,
        right: itemRect.right,
        bottom: itemRect.bottom,
      },
      viewportRect: {
        left: viewportRect.left,
        top: viewportRect.top,
        right: viewportRect.right,
        bottom: viewportRect.bottom,
      },
      camera: window.__ABS_PLAYGROUND__.getSnapshot().camera,
    };
  });
  assert(
    next.itemRect.left >= next.viewportRect.left - 0.5
      && next.itemRect.top >= next.viewportRect.top - 0.5
      && next.itemRect.right <= next.viewportRect.right + 0.5
      && next.itemRect.bottom <= next.viewportRect.bottom + 0.5,
    'Spatial keyboard navigation left the focused project clipped by the viewport',
    next,
  );
  await page.keyboard.press('Shift+Tab');
  assert(await viewport.evaluate((node) => document.activeElement === node), 'Shift+Tab did not leave the roving project focus at the Lab viewport');
  evidence.input.spatialProjectNavigation = { first, next };
  await page.evaluate(() => window.__ABS_PLAYGROUND__.recenter());
}

async function assertVisibleProjectsDoNotOverlap(page, label, evidence) {
  const result = await page.evaluate(() => {
    const viewport = document.querySelector('[data-playground-viewport]')?.getBoundingClientRect();
    if (!viewport) return { visible: [], overlaps: [] };
    const visible = Array.from(document.querySelectorAll('[data-playground-item]')).flatMap((node) => {
      const style = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      const isVisible = style.display !== 'none'
        && style.visibility !== 'hidden'
        && Number(style.opacity) > 0
        && rect.right > viewport.left
        && rect.left < viewport.right
        && rect.bottom > viewport.top
        && rect.top < viewport.bottom;
      if (!isVisible) return [];
      return [{
        id: node.dataset.playgroundItem,
        rect: {
          left: rect.left,
          top: rect.top,
          right: rect.right,
          bottom: rect.bottom,
        },
      }];
    });
    const overlaps = [];
    for (let index = 0; index < visible.length; index += 1) {
      for (let otherIndex = index + 1; otherIndex < visible.length; otherIndex += 1) {
        const left = visible[index];
        const right = visible[otherIndex];
        const overlapsHorizontally = left.rect.left < right.rect.right - 0.5
          && right.rect.left < left.rect.right - 0.5;
        const overlapsVertically = left.rect.top < right.rect.bottom - 0.5
          && right.rect.top < left.rect.bottom - 0.5;
        if (overlapsHorizontally && overlapsVertically) {
          overlaps.push({ left, right });
        }
      }
    }
    return { visible, overlaps };
  });
  assert(result.overlaps.length === 0, `${label} contains overlapping Lab projects`, result.overlaps);
  evidence.projectSeparation ??= {};
  evidence.projectSeparation[label] = {
    visibleItemCount: result.visible.length,
  };
}

async function assertWrapping(page, evidence) {
  const baseline = await getPlaygroundState(page);
  const worldWidth = baseline.snapshot.camera.worldWidthPx;
  const worldHeight = baseline.snapshot.camera.worldHeightPx;
  await setCamera(page, worldWidth + 37, worldHeight + 23);
  let state = await getPlaygroundState(page);
  assert(Math.abs(state.snapshot.camera.renderedX - 37) < 0.1, 'Positive horizontal modulo failed', state.snapshot.camera);
  assert(Math.abs(state.snapshot.camera.renderedY - 23) < 0.1, 'Positive vertical modulo failed', state.snapshot.camera);

  await setCamera(page, -37, -23);
  state = await getPlaygroundState(page);
  assert(Math.abs(state.snapshot.camera.renderedX - (worldWidth - 37)) < 0.1, 'Negative horizontal modulo failed', state.snapshot.camera);
  assert(Math.abs(state.snapshot.camera.renderedY - (worldHeight - 23)) < 0.1, 'Negative vertical modulo failed', state.snapshot.camera);

  const positions = [
    { label: 'horizontal-seam', x: (worldWidth / 2) - 1, y: 0, minimumColumns: 2, minimumRows: 1 },
    { label: 'vertical-seam', x: 0, y: (worldHeight / 2) - 1, minimumColumns: 1, minimumRows: 2 },
    { label: 'diagonal-seam', x: (worldWidth / 2) - 1, y: (worldHeight / 2) - 1, minimumColumns: 2, minimumRows: 2 },
    { label: 'opposite-side-of-cut', x: (worldWidth / 2) + 1, y: (worldHeight / 2) + 1, minimumColumns: 2, minimumRows: 2 },
  ];
  for (const position of positions) {
    await setCamera(page, position.x, position.y);
    await page.waitForFunction(({ columns, rows }) => {
      const values = Array.from(document.querySelectorAll('[data-playground-copy]')).map((node) => (
        String(node.dataset.playgroundCopy || '').split(',').map(Number)
      ));
      return new Set(values.map(([column]) => column)).size >= columns
        && new Set(values.map(([, row]) => row)).size >= rows;
    }, { columns: position.minimumColumns, rows: position.minimumRows }, { timeout: timeoutMs, polling: 'raf' });
    state = await getPlaygroundState(page);
    const visibleItemIds = state.items.filter((item) => (
      item.rect
      && item.rect.right > state.viewportRect.left
      && item.rect.left < state.viewportRect.left + state.viewportRect.width
      && item.rect.bottom > state.viewportRect.top
      && item.rect.top < state.viewportRect.top + state.viewportRect.height
    )).map((item) => item.id);
    assert(visibleItemIds.length > 0, `${position.label} exposed a grid-only world seam`, {
      camera: state.snapshot.camera,
      visibleItemIds,
    });
    await assertVisibleProjectsDoNotOverlap(page, position.label, evidence);
    evidence.wrapping[position.label] = {
      camera: state.snapshot.camera,
      copies: state.copies,
      visibleItemIds,
    };
    await page.screenshot({ path: resolve(runRoot, `${position.label}.png`), fullPage: true });
  }

  await setCamera(page, worldWidth - 2, worldHeight - 2);
  const beforeModuloWrap = await getPlaygroundState(page);
  await page.screenshot({ path: resolve(runRoot, 'before-modulo-wrap.png'), fullPage: true });
  await setCamera(page, worldWidth + 2, worldHeight + 2);
  const afterModuloWrap = await getPlaygroundState(page);
  await page.screenshot({ path: resolve(runRoot, 'after-modulo-wrap.png'), fullPage: true });
  assert(Math.abs(afterModuloWrap.snapshot.camera.renderedX - 2) < 0.1, 'Horizontal modulo boundary did not wrap to two pixels', afterModuloWrap.snapshot.camera);
  assert(Math.abs(afterModuloWrap.snapshot.camera.renderedY - 2) < 0.1, 'Vertical modulo boundary did not wrap to two pixels', afterModuloWrap.snapshot.camera);
  const beforeRects = new Map(beforeModuloWrap.items.map((item) => [item.id, item.rect]));
  const continuity = afterModuloWrap.items.map((item) => {
    const beforeRect = beforeRects.get(item.id);
    return {
      id: item.id,
      deltaX: round(item.rect.left - beforeRect.left),
      deltaY: round(item.rect.top - beforeRect.top),
    };
  });
  assert(continuity.every((item) => Math.abs(item.deltaX + 4) <= 0.25), 'Projects jumped across the horizontal modulo boundary', continuity);
  assert(continuity.every((item) => Math.abs(item.deltaY + 4) <= 0.25), 'Projects jumped across the vertical modulo boundary', continuity);
  evidence.wrapping.moduloBoundary = { continuity };
  await page.evaluate(() => window.__ABS_PLAYGROUND__.recenter());
}

async function clickLogicalItem(page, type) {
  const button = page.locator(`[data-playground-item-type="${type}"] button`).first();
  const itemId = await button.evaluate((node) => node.closest('[data-playground-item]')?.dataset.playgroundItem);
  await page.evaluate((id) => {
    const playground = window.__ABS_PLAYGROUND__;
    const placement = playground?.getSnapshot?.().placements.find((entry) => entry.id === id);
    const spacing = window.__ABS_PLAYGROUND_CONFIG__?.gridSpacingPx;
    if (!placement || !Number.isFinite(spacing)) {
      throw new Error(`Unable to center Playground item ${id}`);
    }
    playground.setCamera(
      (placement.xCell + (placement.widthCells / 2)) * spacing,
      (placement.yCell + (placement.heightCells / 2)) * spacing,
    );
  }, itemId);
  await page.waitForFunction((id) => {
    const node = document.querySelector(`[data-playground-item="${id}"]`);
    const rect = node?.getBoundingClientRect();
    return Boolean(rect
      && rect.right > 0
      && rect.bottom > 0
      && rect.left < window.innerWidth
      && rect.top < window.innerHeight);
  }, itemId, { timeout: timeoutMs, polling: 'raf' });
  await page.mouse.move(1, 1);
  await button.focus();
  await page.evaluate(() => new Promise((resolvePaint) => requestAnimationFrame(() => requestAnimationFrame(resolvePaint))));
  await page.waitForTimeout(320);
  const projectView = await getProjectViewState(page);
  await button.click({ timeout: timeoutMs });
  await page.waitForSelector(`.playground-lightbox[data-media-type="${type}"]`, {
    state: 'visible',
    timeout: timeoutMs,
  });
  await page.waitForFunction((id) => new URLSearchParams(location.search).get('work') === id, itemId, {
    timeout: timeoutMs,
  });
  return { button, itemId, projectView };
}

async function getProjectViewState(page) {
  return page.evaluate(() => ({
    items: Array.from(document.querySelectorAll('[data-playground-item]'), (node) => {
      const rect = node.getBoundingClientRect();
      return {
        id: node.dataset.playgroundItem,
        active: node.dataset.playgroundMediaActive,
        left: Math.round(rect.left * 100) / 100,
        top: Math.round(rect.top * 100) / 100,
        width: Math.round(rect.width * 100) / 100,
        height: Math.round(rect.height * 100) / 100,
        renderModes: Array.from(
          node.querySelectorAll('[data-render-mode]'),
          (media) => media.dataset.renderMode,
        ),
        videoCount: node.querySelectorAll('video').length,
        iframeCount: node.querySelectorAll('iframe').length,
      };
    }),
    worldVideoCount: document.querySelectorAll('.playground-semantic-collection video').length,
    worldIframeCount: document.querySelectorAll('.playground-semantic-collection iframe').length,
  }));
}

async function assertProjectViewUnchanged(page, before, label) {
  const after = await getProjectViewState(page);
  assert(
    JSON.stringify(after) === JSON.stringify(before),
    `Opening the ${label} lightbox changed the projects in view`,
    { before, after },
  );
  return after;
}

async function waitForLightboxClosed(page) {
  await page.waitForSelector('.playground-lightbox', { state: 'detached', timeout: timeoutMs });
  await page.waitForFunction(() => !new URLSearchParams(location.search).has('work'), null, {
    timeout: timeoutMs,
  });
  await page.evaluate(() => new Promise((resolvePaint) => requestAnimationFrame(resolvePaint)));
  await waitForRuntimeDiagnostics(page);
}

async function assertLightboxes(page, evidence) {
  const lifecycleBefore = (await getPlaygroundState(page)).lifecycle;
  let opened = await clickLogicalItem(page, 'image');
  let state = await getPlaygroundState(page);
  assert(state.lightboxCount === 1 && state.videoCount === 0 && state.iframeCount === 0, 'Image lightbox ownership failed', state);
  await assertProjectViewUnchanged(page, opened.projectView, 'image');
  const lightboxPresentation = await page.locator('.playground-lightbox').evaluate((node) => {
    const backdrop = node.querySelector('.playground-lightbox__backdrop');
    const backdropStyle = getComputedStyle(backdrop);
    return {
      detailCount: node.querySelectorAll(
        '.playground-lightbox__details, .playground-lightbox__copy, h1, h2, h3',
      ).length,
      mediaShellCount: node.querySelectorAll('.playground-lightbox__media-shell').length,
      backdropBackground: backdropStyle.backgroundColor,
      backdropFilter: backdropStyle.backdropFilter,
      webkitBackdropFilter: backdropStyle.webkitBackdropFilter,
    };
  });
  assert(
    lightboxPresentation.detailCount === 0
      && lightboxPresentation.mediaShellCount === 1
      && lightboxPresentation.backdropBackground === 'rgba(0, 0, 0, 0)'
      && (!lightboxPresentation.backdropFilter
        || lightboxPresentation.backdropFilter === 'none')
      && (!lightboxPresentation.webkitBackdropFilter
        || lightboxPresentation.webkitBackdropFilter === 'none'),
    'Lightbox is not an asset-only transparent presentation',
    lightboxPresentation,
  );
  await page.screenshot({ path: resolve(runRoot, 'image-lightbox.png'), fullPage: true });
  await page.waitForFunction(() => (
    document.activeElement === document.querySelector('.playground-lightbox__close')
  ), null, { timeout: timeoutMs, polling: 'raf' });
  await page.keyboard.press('Shift+Tab');
  assert(await page.locator('.playground-lightbox').evaluate((node) => node.contains(document.activeElement)), 'Focus escaped the image dialog');
  await page.locator('.playground-lightbox__media-shell').click();
  await waitForLightboxClosed(page);
  assert(await opened.button.evaluate((node) => document.activeElement === node), 'Image lightbox did not restore focus');

  opened = await clickLogicalItem(page, 'video');
  await page.waitForSelector('.playground-lightbox video, .playground-lightbox [data-media-state="fallback"]', {
    state: 'attached',
    timeout: timeoutMs,
  });
  await page.waitForFunction(() => {
    const diagnostics = window.__ABS_PLAYGROUND__?.getSnapshot?.().diagnostics;
    const actual = document.querySelectorAll('video').length;
    return diagnostics?.activeVideoCount === actual;
  }, null, { timeout: timeoutMs, polling: 'raf' });
  state = await getPlaygroundState(page);
  await assertProjectViewUnchanged(page, opened.projectView, 'video');
  assert(state.videoCount <= 1, 'Video lightbox mounted duplicate active video elements', state);
  assert(state.worldVideoCount === opened.projectView.worldVideoCount, 'Opening the video changed world-video ownership', state);
  assert(
    state.snapshot.diagnostics.activeVideoCount === state.worldVideoCount + state.videoCount,
    'Video diagnostics did not match the stable world plus lightbox video',
    state.snapshot,
  );
  const lightboxVideo = page.locator('.playground-lightbox video');
  await lightboxVideo.evaluate((video) => video.play().catch(() => {}));
  const playingVisibilityPause = await page.evaluate(() => {
    const video = document.querySelector('.playground-lightbox video');
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    return { mounted: Boolean(video), paused: video?.paused };
  });
  assert(
    playingVisibilityPause.mounted && playingVisibilityPause.paused,
    'Playing lightbox video did not pause while the document was hidden',
    playingVisibilityPause,
  );
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.waitForFunction(() => !document.querySelector('.playground-lightbox video')?.paused, null, {
    timeout: timeoutMs,
    polling: 'raf',
  });
  const pausedVisibilityState = await lightboxVideo.evaluate((video) => {
    video.pause();
    Object.defineProperty(document, 'hidden', { configurable: true, value: true });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'hidden', { configurable: true, value: false });
    document.dispatchEvent(new Event('visibilitychange'));
    return video.paused;
  });
  assert(pausedVisibilityState, 'User-paused lightbox video restarted after a hidden/visible cycle');
  await page.evaluate(() => {
    delete document.hidden;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  await page.locator('.playground-lightbox video').evaluate((video) => video.click());
  assert(
    await page.locator('.playground-lightbox').count() === 1,
    'Using a native video control closed the lightbox',
  );
  await page.screenshot({ path: resolve(runRoot, 'video-lightbox.png'), fullPage: true });
  await page.locator('.playground-lightbox__close').click();
  await waitForLightboxClosed(page);
  state = await getPlaygroundState(page);
  assert(
    state.videoCount === 0
      && state.snapshot.diagnostics.activeVideoCount === state.worldVideoCount,
    'Closed lightbox video remained active or world-video diagnostics drifted',
    state,
  );
  assert(await opened.button.evaluate((node) => document.activeElement === node), 'Video lightbox did not restore focus');

  opened = await clickLogicalItem(page, 'code');
  await page.waitForSelector('.playground-lightbox iframe', { state: 'attached', timeout: timeoutMs });
  await page.waitForFunction(() => {
    const diagnostics = window.__ABS_PLAYGROUND__?.getSnapshot?.().diagnostics;
    const actual = document.querySelectorAll('iframe').length;
    return diagnostics?.activeIframeCount === actual;
  }, null, { timeout: timeoutMs, polling: 'raf' });
  state = await getPlaygroundState(page);
  await assertProjectViewUnchanged(page, opened.projectView, 'code');
  assert(state.iframeCount === 1, 'Code lightbox did not mount exactly one iframe', state);
  assert(state.worldIframeCount === opened.projectView.worldIframeCount, 'Opening the code lightbox changed world-code ownership', state);
  assert(
    state.snapshot.diagnostics.activeIframeCount === state.worldIframeCount + state.iframeCount,
    'Code diagnostics did not match the stable world plus lightbox iframe',
    state.snapshot,
  );
  const iframeContract = await page.locator('.playground-lightbox iframe').evaluate((node) => ({
    sandbox: node.getAttribute('sandbox'),
    referrerPolicy: node.getAttribute('referrerpolicy'),
  }));
  assert(iframeContract.sandbox === 'allow-scripts', 'Code iframe sandbox is too permissive', iframeContract);
  assert(iframeContract.referrerPolicy === 'no-referrer', 'Code iframe referrer policy is missing', iframeContract);
  await page.screenshot({ path: resolve(runRoot, 'code-lightbox.png'), fullPage: true });
  await page.locator('.playground-lightbox iframe').focus();
  await page.keyboard.press('Escape');
  await waitForLightboxClosed(page);
  assert(await opened.button.evaluate((node) => document.activeElement === node), 'Iframe Escape did not restore focus');

  await clickLogicalItem(page, 'code');
  await page.locator('.playground-lightbox__backdrop').evaluate((node) => node.click());
  await waitForLightboxClosed(page);

  await clickLogicalItem(page, 'image');
  await page.keyboard.press('Escape');
  await waitForLightboxClosed(page);

  const backSelection = await clickLogicalItem(page, 'code');
  await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => null);
  await waitForLightboxClosed(page);
  assert(new URL(page.url()).pathname.endsWith('/playground.html') || new URL(page.url()).pathname.endsWith('/playground'), 'Browser Back left Playground instead of closing work', page.url());
  assert(await backSelection.button.evaluate((node) => document.activeElement === node), 'Browser Back did not restore item focus');

  opened = await clickLogicalItem(page, 'code');
  await page.locator('.playground-lightbox__media-shell').evaluate((node) => node.click());
  await waitForLightboxClosed(page);
  assert(await opened.button.evaluate((node) => document.activeElement === node), 'Media-shell close did not restore focus');

  const lifecycleAfter = (await getPlaygroundState(page)).lifecycle;
  assert(
    (lifecycleAfter.byType.focusin || 0) === (lifecycleBefore.byType.focusin || 0),
    'Lightbox leaked a focusin listener',
    { lifecycleBefore, lifecycleAfter },
  );
  evidence.lightboxes = { lifecycleBefore, lifecycleAfter, lightboxPresentation };
}

async function assertDragGuard(page) {
  await page.evaluate(() => window.__ABS_PLAYGROUND__.recenter());
  const button = page.locator('[data-playground-item] button').first();
  await button.evaluate((node) => node.focus({ preventScroll: true }));
  const box = await button.boundingBox();
  assert(box, 'Logical item does not have drag geometry');
  const start = { x: box.x + Math.min(30, box.width / 3), y: box.y + Math.min(30, box.height / 3) };
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 50, start.y + 42, { steps: 6 });
  await page.mouse.up();
  await page.waitForTimeout(100);
  const state = await getPlaygroundState(page);
  assert(state.lightboxCount === 0 && !state.search.includes('work='), 'Drag release opened work accidentally', state);
}

async function assertHoverDoesNotMoveProjects(page, evidence) {
  await page.evaluate(() => window.__ABS_PLAYGROUND__.recenter());
  await page.waitForTimeout(250);
  const itemId = await page.evaluate(() => {
    const viewport = document.querySelector('[data-playground-viewport]')?.getBoundingClientRect();
    if (!viewport) return null;
    return Array.from(document.querySelectorAll('[data-playground-item]')).find((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0
        && rect.right > viewport.left && rect.left < viewport.right
        && rect.bottom > viewport.top && rect.top < viewport.bottom;
    })?.dataset.playgroundItem || null;
  });
  assert(itemId, 'No visible project was available for the hover-stability check');
  const item = page.locator(`[data-playground-item="${itemId}"]`).first();
  const before = await item.boundingBox();
  assert(before, 'Visible project has no hover-stability geometry', itemId);
  const beforeStyle = await item.evaluate((node) => ({
    transform: getComputedStyle(node).transform,
    attractionX: node.style.getPropertyValue('--playground-attraction-x-px'),
    attractionY: node.style.getPropertyValue('--playground-attraction-y-px'),
  }));
  await page.mouse.move(before.x + (before.width / 2), before.y + (before.height / 2));
  await page.waitForTimeout(350);
  const after = await item.boundingBox();
  const style = await item.evaluate((node) => ({
    transform: getComputedStyle(node).transform,
    attractionX: node.style.getPropertyValue('--playground-attraction-x-px'),
    attractionY: node.style.getPropertyValue('--playground-attraction-y-px'),
  }));
  const movement = {
    x: Math.abs((after?.x ?? Number.NaN) - before.x),
    y: Math.abs((after?.y ?? Number.NaN) - before.y),
  };
  assert(after && movement.x < 0.25 && movement.y < 0.25, 'Project moved under pointer hover', {
    itemId,
    before,
    after,
    movement,
    style,
  });
  assert(
    style.transform === beforeStyle.transform
      && !style.attractionX
      && !style.attractionY,
    'Hover displacement styling is still present',
    { beforeStyle, style },
  );
  evidence.hoverStability = { itemId, movement, beforeStyle, style };
}

async function assertDotColorWake(page, evidence) {
  const viewport = page.locator('[data-playground-viewport]');
  const box = await viewport.boundingBox();
  assert(box, 'Lab viewport has no measurable bounds');
  const config = await page.evaluate(() => ({ ...window.__ABS_PLAYGROUND_CONFIG__ }));
  assert(config.dotOpacity < 0.5, 'Resting dot opacity is not low', config);
  assert(config.colorWakeRadiusPx > 0, 'Colour-wake radius is unavailable', config);
  assert(config.colorWakePersistenceMs > 0, 'Colour persistence is unavailable', config);

  await page.mouse.move(box.x + (box.width / 2), box.y + (box.height / 2));
  await page.waitForFunction(() => {
    const field = window.__ABS_PLAYGROUND__?.getSnapshot?.().dotField;
    return field?.activeColoredDotCount > 0
      && field.hoveredColoredDotCount === field.activeColoredDotCount;
  }, null, { timeout: timeoutMs, polling: 'raf' });
  await page.waitForTimeout(80);
  const hovered = (await getPlaygroundState(page)).snapshot.dotField;
  assert(hovered.frameScheduled === false, 'A stationary colour wake did not let the renderer sleep', hovered);

  await page.mouse.move(box.x + (box.width * 0.82), box.y + (box.height / 2), { steps: 1 });
  await page.waitForFunction((endpointCount) => {
    const field = window.__ABS_PLAYGROUND__?.getSnapshot?.().dotField;
    return field?.pointerSweepDistancePx > field.colorWakeRadiusPx
      && field.influencedDotCount > endpointCount
      && field.fadingColoredDotCount > 0;
  }, hovered.hoveredColoredDotCount, { timeout: timeoutMs, polling: 'raf' });
  const swept = (await getPlaygroundState(page)).snapshot.dotField;
  assert(
    swept.activeColoredDotCount > hovered.activeColoredDotCount,
    'A coalesced pointer jump did not retain the travelled dot path',
    { hovered, swept },
  );
  await page.screenshot({ path: resolve(runRoot, 'dot-color-wake.png'), fullPage: true });

  const pageSize = page.viewportSize();
  await page.mouse.move(
    box.x + (box.width / 2),
    Math.min((pageSize?.height || box.y + box.height + 8) - 2, box.y + box.height + 8),
  );
  await page.waitForFunction(() => {
    const field = window.__ABS_PLAYGROUND__?.getSnapshot?.().dotField;
    return field?.activeColoredDotCount > 0 && field.fadingColoredDotCount > 0;
  }, null, { timeout: timeoutMs, polling: 'raf' });
  const fading = (await getPlaygroundState(page)).snapshot.dotField;
  assert(fading.frameScheduled === true, 'Released colours are not running their bounded fade', fading);

  await page.waitForFunction(() => {
    const field = window.__ABS_PLAYGROUND__?.getSnapshot?.().dotField;
    return field?.activeColoredDotCount === 0 && field.frameScheduled === false;
  }, null, {
    timeout: Math.max(timeoutMs, config.colorWakePersistenceMs + 2000),
    polling: 'raf',
  });
  const settled = (await getPlaygroundState(page)).snapshot.dotField;
  evidence.dotColorWake = { config, hovered, swept, fading, settled };
}

async function assertConfigAndPanels(page, evidence) {
  const launcher = page.locator('.panel-toggle-btn');
  await launcher.click();
  const dock = page.locator('.panel:not(.hidden)').filter({ has: page.locator('[data-playground-folder]') }).first();
  await dock.waitFor({ state: 'visible', timeout: timeoutMs });
  const dockSchema = await dock.evaluate((panel) => ({
    folders: Array.from(panel.querySelectorAll('[data-playground-folder]'), (node) => node.dataset.playgroundFolder),
    controls: Array.from(panel.querySelectorAll('[data-playground-control]'), (node) => node.dataset.playgroundControl),
    actions: Array.from(panel.querySelectorAll('[data-playground-action]'), (node) => node.dataset.playgroundAction),
    diagnostics: Array.from(panel.querySelectorAll('[data-playground-diagnostic]'), (node) => node.dataset.playgroundDiagnostic),
  }));
  assert(dockSchema.folders.length === 5, 'Docked Playground panel must have five folders', dockSchema);
  assert(dockSchema.controls.length === 16, 'Docked Playground panel must have sixteen controls', dockSchema);
  assert(
    dockSchema.controls.includes('projectSpacing') && !dockSchema.controls.includes('targetDensity'),
    'Playground panel must expose direct project spacing instead of inverse target density',
    dockSchema,
  );
  assert(
    [
      'dotOpacity',
      'colorWakeRadiusPx',
      'colorWakePersistenceMs',
      'colorWakeFadeMs',
      'colorWakeOpacity',
      'colorWakeDensity',
      'colorWakeEdgeSoftness',
      'colorWakeDotScale',
    ].every((id) => dockSchema.controls.includes(id))
      && !dockSchema.controls.includes('accentFrequency'),
    'Playground panel does not expose the complete colour-wake contract',
    dockSchema,
  );
  assert(dockSchema.actions.length === 3, 'Docked Playground panel must have three actions', dockSchema);
  assert(dockSchema.diagnostics.length === 5, 'Docked Playground panel must have five diagnostics', dockSchema);
  await page.screenshot({ path: resolve(runRoot, 'docked-panel.png'), fullPage: true });

  const initialConfig = await page.evaluate(() => ({ ...window.__ABS_PLAYGROUND_CONFIG__ }));
  const initialSpatialState = await getPlaygroundState(page);
  const initialRepeatArea = initialSpatialState.snapshot.diagnostics.worldColumns
    * initialSpatialState.snapshot.diagnostics.worldRows;
  const projectSpacing = dock.locator('[data-playground-control="projectSpacing"] input');
  await projectSpacing.evaluate((input) => {
    input.value = '2.2';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction((previousArea) => {
    const snapshot = window.__ABS_PLAYGROUND__?.getSnapshot?.();
    return Math.abs(window.__ABS_PLAYGROUND_CONFIG__.projectSpacing - 2.2) < 0.001
      && document.querySelector('[data-playground-experience]')?.dataset.playgroundReady === 'true'
      && snapshot?.diagnostics?.worldColumns * snapshot?.diagnostics?.worldRows > previousArea;
  }, initialRepeatArea, { timeout: timeoutMs, polling: 'raf' });
  const spaciousState = await getPlaygroundState(page);
  const spaciousRepeatArea = spaciousState.snapshot.diagnostics.worldColumns
    * spaciousState.snapshot.diagnostics.worldRows;
  assert(spaciousRepeatArea > initialRepeatArea, 'Project spacing did not grow the modulo repeat area', {
    initial: initialSpatialState.snapshot.diagnostics,
    spacious: spaciousState.snapshot.diagnostics,
  });
  const gridSpacing = dock.locator('[data-playground-control="gridSpacingPx"] input');
  await gridSpacing.evaluate((input) => {
    input.value = '44';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => {
    const experience = document.querySelector('[data-playground-experience]');
    const snapshot = window.__ABS_PLAYGROUND__?.getSnapshot?.();
    const diagnostics = snapshot?.diagnostics;
    return window.__ABS_PLAYGROUND_CONFIG__.gridSpacingPx === 44
      && snapshot?.dotField?.gridSpacingPx === 44
      && Number.parseFloat(getComputedStyle(experience)
        .getPropertyValue('--playground-grid-spacing-px')) === 44
      && experience?.dataset.playgroundReady === 'true'
      && diagnostics?.worldWidthPx === diagnostics?.worldColumns * 44
      && diagnostics?.worldHeightPx === diagnostics?.worldRows * 44;
  }, null, { timeout: timeoutMs, polling: 'raf' });
  const spacingDot = (await getPlaygroundState(page)).snapshot.dotField;
  const dotRadius = dock.locator('[data-playground-control="dotRadiusPx"] input');
  await dotRadius.evaluate((input) => {
    input.value = '5.25';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => (
    Math.abs(window.__ABS_PLAYGROUND_CONFIG__.dotRadiusPx - 5.25) < 0.001
    && Math.abs(window.__ABS_PLAYGROUND__?.getSnapshot?.().dotField?.dotRadiusPx - 5.25) < 0.001
    && window.__ABS_PLAYGROUND__?.getSnapshot?.().dotField?.drawCount > 0
    && window.__ABS_PLAYGROUND__?.getSnapshot?.().dotField?.frameScheduled === false
  ), null, { timeout: timeoutMs, polling: 'raf' });
  const liveDot = (await getPlaygroundState(page)).snapshot.dotField;
  assert(liveDot.drawCount > 0, 'Live dot-radius change did not redraw the field', { spacingDot, liveDot });

  for (const [controlId, value] of [
    ['dotOpacity', 0.32],
    ['colorWakeRadiusPx', 240],
    ['colorWakePersistenceMs', 1800],
    ['colorWakeOpacity', 0.76],
    ['colorWakeDensity', 0.65],
    ['colorWakeEdgeSoftness', 0.4],
    ['colorWakeDotScale', 1.2],
  ]) {
    await dock.locator(`[data-playground-control="${controlId}"] input`).evaluate((input, nextValue) => {
      input.value = String(nextValue);
      input.dispatchEvent(new Event('input', { bubbles: true }));
    }, value);
  }
  await page.waitForFunction(() => {
    const config = window.__ABS_PLAYGROUND_CONFIG__;
    const field = window.__ABS_PLAYGROUND__?.getSnapshot?.().dotField;
    return config.dotOpacity === 0.32
      && config.colorWakeRadiusPx === 240
      && config.colorWakePersistenceMs === 1800
      && config.colorWakeOpacity === 0.76
      && config.colorWakeDensity === 0.65
      && config.colorWakeEdgeSoftness === 0.4
      && config.colorWakeDotScale === 1.2
      && field?.dotOpacity === 0.32
      && field.colorWakeRadiusPx === 240
      && field.colorWakePersistenceMs === 1800
      && field.colorWakeOpacity === 0.76
      && field.colorWakeDensity === 0.65
      && field.colorWakeEdgeSoftness === 0.4
      && field.colorWakeDotScale === 1.2;
  }, null, { timeout: timeoutMs, polling: 'raf' });
  const liveConfig = await page.evaluate(() => ({ ...window.__ABS_PLAYGROUND_CONFIG__ }));

  const wheelSensitivity = dock.locator('[data-playground-control="wheelSensitivity"] input');
  await wheelSensitivity.evaluate((input) => {
    input.value = '1.5';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const dragMomentum = dock.locator('[data-playground-control="dragMomentum"] input');
  await dragMomentum.evaluate((input) => {
    input.value = '0';
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.waitForFunction(() => (
    Math.abs(window.__ABS_PLAYGROUND_CONFIG__.wheelSensitivity - 1.5) < 0.001
    && window.__ABS_PLAYGROUND_CONFIG__.dragMomentum === 0
  ), null, { timeout: timeoutMs, polling: 'raf' });
  await setCamera(page, 0, 0);
  await page.locator('[data-playground-viewport]').hover();
  await page.mouse.wheel(100, 0);
  await page.waitForFunction(() => (
    Math.abs(window.__ABS_PLAYGROUND__.getSnapshot().camera.logicalX - 150) < 1
  ), null, { timeout: timeoutMs, polling: 'raf' });
  const viewportBox = await page.locator('[data-playground-viewport]').boundingBox();
  assert(viewportBox, 'Playground viewport has no panel-motion test geometry');
  await page.mouse.move(viewportBox.x + 900, viewportBox.y + 600);
  await page.mouse.down();
  await page.mouse.move(viewportBox.x + 780, viewportBox.y + 520, { steps: 6 });
  await page.mouse.up();
  await page.evaluate(() => new Promise((resolvePaint) => requestAnimationFrame(() => requestAnimationFrame(resolvePaint))));
  const motionSnapshot = (await getPlaygroundState(page)).snapshot.camera;
  assert(motionSnapshot.inertiaActive === false, 'Live drag-momentum value did not disable inertia', motionSnapshot);
  const savedState = await getPlaygroundState(page);
  const savedDimensions = {
    columns: savedState.snapshot.diagnostics.worldColumns,
    rows: savedState.snapshot.diagnostics.worldRows,
    widthPx: savedState.snapshot.diagnostics.worldWidthPx,
    heightPx: savedState.snapshot.diagnostics.worldHeightPx,
  };

  let savedRequest = null;
  if (!canonicalWriteMode) {
    await page.route('**/api/design-system/config', async (route) => {
      savedRequest = JSON.parse(route.request().postData() || '{}');
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' });
    });
  }
  await dock.locator('[data-playground-folder="actions"]').evaluate((details) => {
    details.open = true;
  });
  const saveRequestPromise = canonicalWriteMode
    ? page.waitForRequest((request) => request.url().endsWith('/api/design-system/config'))
    : null;
  await dock.locator('#savePlaygroundConfigBtn').click();
  if (saveRequestPromise) {
    const request = await saveRequestPromise;
    savedRequest = request.postDataJSON();
    const response = await request.response();
    assert(response?.ok(), 'Canonical Playground save endpoint did not succeed', {
      status: response?.status(),
    });
  }
  if (!canonicalWriteMode) {
    await page.waitForFunction(() => (
      document.querySelector('[data-playground-action-status]')?.textContent.includes('saved')
    ), null, { timeout: timeoutMs });
  }
  assert(savedRequest?.config?.playground?.dotRadiusPx === 5.25, 'Canonical save request dropped the Playground value', savedRequest);
  assert(savedRequest?.config?.playground?.gridSpacingPx === 44, 'Canonical save request dropped grid spacing', savedRequest);
  assert(savedRequest?.config?.playground?.projectSpacing === 2.2, 'Canonical save request dropped project spacing', savedRequest);
  assert(savedRequest?.config?.playground?.wheelSensitivity === 1.5, 'Canonical save request dropped wheel sensitivity', savedRequest);
  assert(savedRequest?.config?.playground?.dragMomentum === 0, 'Canonical save request dropped drag momentum', savedRequest);
  assert(savedRequest?.config?.playground?.dotOpacity === 0.32, 'Canonical save request dropped dot opacity', savedRequest);
  assert(savedRequest?.config?.playground?.colorWakeRadiusPx === 240, 'Canonical save request dropped colour radius', savedRequest);
  assert(savedRequest?.config?.playground?.colorWakePersistenceMs === 1800, 'Canonical save request dropped colour persistence', savedRequest);
  assert(savedRequest?.config?.playground?.colorWakeOpacity === 0.76, 'Canonical save request dropped colour intensity', savedRequest);
  assert(savedRequest?.config?.playground?.colorWakeDensity === 0.65, 'Canonical save request dropped colour density', savedRequest);
  assert(savedRequest?.config?.playground?.colorWakeEdgeSoftness === 0.4, 'Canonical save request dropped edge softness', savedRequest);
  assert(savedRequest?.config?.playground?.colorWakeDotScale === 1.2, 'Canonical save request dropped colour dot size', savedRequest);
  if (canonicalWriteMode) {
    const persisted = JSON.parse(await readFile(canonicalConfigPath, 'utf8'));
    assert(persisted.playground?.dotRadiusPx === 5.25, 'Canonical file did not persist dot radius', persisted.playground);
    assert(persisted.playground?.gridSpacingPx === 44, 'Canonical file did not persist grid spacing', persisted.playground);
    assert(persisted.playground?.projectSpacing === 2.2, 'Canonical file did not persist project spacing', persisted.playground);
    assert(persisted.playground?.wheelSensitivity === 1.5, 'Canonical file did not persist wheel sensitivity', persisted.playground);
    assert(persisted.playground?.dragMomentum === 0, 'Canonical file did not persist drag momentum', persisted.playground);
    assert(persisted.playground?.dotOpacity === 0.32, 'Canonical file did not persist dot opacity', persisted.playground);
    assert(persisted.playground?.colorWakeRadiusPx === 240, 'Canonical file did not persist colour radius', persisted.playground);
    assert(persisted.playground?.colorWakePersistenceMs === 1800, 'Canonical file did not persist colour persistence', persisted.playground);
    assert(persisted.playground?.colorWakeOpacity === 0.76, 'Canonical file did not persist colour intensity', persisted.playground);
    assert(persisted.playground?.colorWakeDensity === 0.65, 'Canonical file did not persist colour density', persisted.playground);
    assert(persisted.playground?.colorWakeEdgeSoftness === 0.4, 'Canonical file did not persist edge softness', persisted.playground);
    assert(persisted.playground?.colorWakeDotScale === 1.2, 'Canonical file did not persist colour dot size', persisted.playground);
  } else {
    await page.unroute('**/api/design-system/config');
  }

  const popupPromise = page.waitForEvent('popup', { timeout: timeoutMs });
  await launcher.evaluate((button) => {
    button.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      shiftKey: true,
      view: window,
    }));
  });
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  await popup.waitForSelector('[data-playground-folder]', { state: 'visible', timeout: timeoutMs });
  const popupSchema = await popup.evaluate(() => ({
    folders: Array.from(document.querySelectorAll('[data-playground-folder]'), (node) => node.dataset.playgroundFolder),
    controls: Array.from(document.querySelectorAll('[data-playground-control]'), (node) => node.dataset.playgroundControl),
    actions: Array.from(document.querySelectorAll('[data-playground-action]'), (node) => node.dataset.playgroundAction),
    diagnostics: Array.from(document.querySelectorAll('[data-playground-diagnostic]'), (node) => node.dataset.playgroundDiagnostic),
  }));
  assert(
    JSON.stringify(popupSchema) === JSON.stringify(dockSchema),
    'Detached panel does not use the docked schema',
    { dockSchema, popupSchema },
  );
  await popup.screenshot({ path: resolve(runRoot, 'detached-panel.png'), fullPage: true });
  await popup.close();

  await page.evaluate(async (config) => {
    const module = await import('/src/routes/playground/config/playgroundConfig.js');
    module.setPlaygroundConfig(config, { reason: 'audit-restore' });
  }, initialConfig);
  await page.waitForFunction((expected) => (
    Math.abs(window.__ABS_PLAYGROUND_CONFIG__.dotRadiusPx - expected.dotRadiusPx) < 0.001
    && Math.abs(window.__ABS_PLAYGROUND_CONFIG__.projectSpacing - expected.projectSpacing) < 0.001
    && window.__ABS_PLAYGROUND_CONFIG__.gridSpacingPx === expected.gridSpacingPx
    && window.__ABS_PLAYGROUND_CONFIG__.dotOpacity === expected.dotOpacity
    && window.__ABS_PLAYGROUND_CONFIG__.colorWakeRadiusPx === expected.colorWakeRadiusPx
    && window.__ABS_PLAYGROUND_CONFIG__.colorWakePersistenceMs === expected.colorWakePersistenceMs
    && window.__ABS_PLAYGROUND_CONFIG__.colorWakeOpacity === expected.colorWakeOpacity
    && window.__ABS_PLAYGROUND_CONFIG__.colorWakeDensity === expected.colorWakeDensity
    && window.__ABS_PLAYGROUND_CONFIG__.colorWakeEdgeSoftness === expected.colorWakeEdgeSoftness
    && window.__ABS_PLAYGROUND_CONFIG__.colorWakeDotScale === expected.colorWakeDotScale
  ), initialConfig, { timeout: timeoutMs });
  evidence.panel = {
    dockSchema,
    popupSchema,
    initialConfig,
    initialSpatialState: initialSpatialState.snapshot.diagnostics,
    spaciousSpatialState: spaciousState.snapshot.diagnostics,
    liveConfig,
    motionSnapshot,
    savedDimensions,
    canonicalWriteMode,
    savedPlayground: savedRequest.config.playground,
  };
}

async function assertPaletteAndMute(page, evidence, { mutable = true } = {}) {
  const before = await page.evaluate(() => ({
    palette: window.__ABS_SIMULATION_PALETTE__,
    dot: window.__ABS_PLAYGROUND__.getSnapshot().dotField,
    soundPressed: document.querySelector('.button-bar__sound-toggle')?.getAttribute('aria-pressed'),
    soundEvents: window.__ABS_SIMULATION_AUDIO__?.total || 0,
  }));
  if (mutable) {
    await page.evaluate(async () => {
      const module = await import('/src/palette/simulationPaletteController.js');
      const source = window.__ABS_SIMULATION_PALETTE__.distribution.map((row, index) => ({
        roleId: row.roleId,
        label: row.label,
        colorIndex: row.colorIndex,
        weight: row.weight + (index === 0 ? 1 : 0),
      }));
      module.configureSimulationPalette({ colorDistribution: source });
    });
    await page.waitForFunction((generation) => (
      window.__ABS_PLAYGROUND__.getSnapshot().dotField.paletteGeneration > generation
    ), before.dot.paletteGeneration, { timeout: timeoutMs, polling: 'raf' });
  }
  const after = await page.evaluate(() => ({
    palette: window.__ABS_SIMULATION_PALETTE__,
    dot: window.__ABS_PLAYGROUND__.getSnapshot().dotField,
    soundPressed: document.querySelector('.button-bar__sound-toggle')?.getAttribute('aria-pressed'),
    soundEvents: window.__ABS_SIMULATION_AUDIO__?.total || 0,
  }));
  assert(after.dot.paletteId === after.palette.paletteId, 'Dot field did not consume the shared palette ID', { before, after });
  assert(after.dot.paletteGeneration === after.palette.generation, 'Dot field did not consume the shared palette generation', { before, after });
  assert(before.soundPressed !== 'true', 'Mute audit requires the shared sound control to be muted', before);
  const camera = after.dot;
  await page.locator('[data-playground-viewport]').hover();
  await page.mouse.wheel(90, 70);
  await page.waitForFunction((drawCount) => window.__ABS_PLAYGROUND__.getSnapshot().dotField.drawCount > drawCount, camera.drawCount, {
    timeout: timeoutMs,
    polling: 'raf',
  });
  const mutedAfterPan = await page.evaluate(() => ({
    soundPressed: document.querySelector('.button-bar__sound-toggle')?.getAttribute('aria-pressed'),
    soundEvents: window.__ABS_SIMULATION_AUDIO__?.total || 0,
  }));
  assert(mutedAfterPan.soundPressed !== 'true', 'Playground panning changed the shared mute state', mutedAfterPan);
  assert(mutedAfterPan.soundEvents === after.soundEvents, 'Muted Playground panning emitted sound playback', { after, mutedAfterPan });
  evidence.paletteAndMute = { before, after, mutedAfterPan };
}

async function assertContentIsolationAndGrowth(browser, failures, evidence, baseline) {
  const source = JSON.parse(await readFile(canonicalContentPath, 'utf8'));
  const context = await browser.newContext({ viewport, colorScheme: 'light' });
  const page = await context.newPage();
  bindFailureCapture(page, failures);
  await installAuditHooks(page);
  let suppliedContent = source;
  await page.route('**/config/contents-playground.json', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(suppliedContent),
    });
  });

  try {
    const expandedItem = {
      ...structuredClone(source.items[0]),
      id: 'temporary-project-31',
      placementOrder: 31,
      label: 'Temporary project 31',
      preferredGridSpan: { columns: 32, rows: 32 },
    };
    suppliedContent = { ...source, items: [...source.items, expandedItem] };
    await gotoPlayground(page);
    let state = await getPlaygroundState(page);
    assert(state.items.length === 31, 'Browser runtime rejected a valid 31st item', state.items.length);
    assert(new Set(state.items.map((item) => item.id)).size === 31, 'Expanded world duplicated a logical item');
    assert(state.semanticButtonCount === 31, 'Expanded world did not expose 31 semantic controls', state);
    assert(
      JSON.stringify(state.snapshot.placements.slice(0, 30)) === JSON.stringify(baseline.placements),
      'Appending item 31 moved an existing deterministic placement',
      { baseline: baseline.placements, expanded: state.snapshot.placements },
    );
    assert(
      state.snapshot.placements.at(-1).widthCells
        > Math.max(...baseline.placements.map((placement) => placement.widthCells))
        && state.snapshot.placements.at(-1).heightCells
          > Math.max(...baseline.placements.map((placement) => placement.heightCells)),
      'A 32 by 32 item did not expand its footprint inside the salon field',
      { baseline: baseline.placements, expanded: state.snapshot.placements.at(-1) },
    );
    await page.screenshot({ path: resolve(runRoot, 'expanded-world-31.png'), fullPage: true });
    evidence.expandedWorld = {
      itemCount: state.items.length,
      worldWidthPx: state.snapshot.diagnostics.worldWidthPx,
      worldHeightPx: state.snapshot.diagnostics.worldHeightPx,
      expandedWidthCells: state.snapshot.placements.at(-1).widthCells,
      expandedHeightCells: state.snapshot.placements.at(-1).heightCells,
      appendStable: true,
    };

    const invalidItemContent = structuredClone(source);
    invalidItemContent.items[7].poster = '../outside-playground.png';
    suppliedContent = invalidItemContent;
    await page.reload({ waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await waitForPlayground(page);
    state = await getPlaygroundState(page);
    assert(state.items.length === 29, 'One invalid item hid or retained the wrong number of valid items', state);
    assert(
      await page.locator('.playground-sr-instructions[role="status"]')
        .textContent()
        .then((text) => text.includes('invalid Lab content')),
      'Runtime item isolation did not expose a screen-reader status',
    );

    suppliedContent = { ...source, items: 'not-an-array' };
    await page.reload({ waitUntil: 'domcontentloaded', timeout: timeoutMs });
    const errorRoute = page.locator('[data-playground-experience][data-playground-error="true"]');
    await errorRoute.waitFor({ state: 'visible', timeout: timeoutMs });
    const alert = page.locator('.playground-load-error[role="alert"]');
    await alert.waitFor({ state: 'visible', timeout: timeoutMs });
    assert((await alert.textContent()).includes('temporarily unavailable'), 'Fatal content error did not render its alert');
    evidence.contentIsolation = {
      isolatedItemCount: 29,
      fatalAlertVisible: true,
    };
  } finally {
    await context.close();
  }
}

async function assertSpaContract(page, evidence) {
  await page.goto(`${baseUrl}/index.html?mode=pit&absAudit=1`, {
    waitUntil: 'domcontentloaded',
    timeout: timeoutMs,
  });
  await page.waitForSelector('[data-route-tab="playground"]', { state: 'visible', timeout: timeoutMs });
  await page.waitForFunction(() => {
    const root = document.documentElement;
    return (
      ['ready', 'content-ready', 'entered'].includes(root.dataset.absBootState || '')
      && document.querySelector('[data-route-tab="home"]')?.getAttribute('aria-current') === 'page'
      && document.querySelector('[data-shell-route-view]')?.dataset.shellRouteView === 'home'
    );
  }, null, { timeout: timeoutMs, polling: 'raf' });
  await waitForIdle(page);
  const homeLifecycle = await page.evaluate(() => window.__ABS_PLAYGROUND_LIFECYCLE_AUDIT__.snapshot());
  await page.locator('[data-route-tab="playground"]').click();
  await page.waitForSelector(
    '[data-playground-experience][data-playground-interactive="true"]',
    { state: 'attached', timeout: timeoutMs },
  );
  await page.waitForFunction(() => (
    document.documentElement.dataset.absTransitionPhase === 'route-in'
      && document.querySelector('[data-playground-experience]')?.dataset.routeMaterialState
        === 'entering'
  ), null, { timeout: timeoutMs, polling: 'raf' });
  const earlyPanBefore = await page.evaluate(() => {
    const viewportNode = document.querySelector('[data-playground-viewport]');
    return {
      camera: window.__ABS_PLAYGROUND__.getSnapshot().camera,
      phase: document.documentElement.dataset.absTransitionPhase,
      materialState: document.querySelector('[data-playground-experience]')
        ?.dataset.routeMaterialState,
      blockedByInertSurface: Boolean(viewportNode?.closest('[inert]')),
    };
  });
  assert(earlyPanBefore.phase === 'route-in', 'Playground early-pan check missed route-in', earlyPanBefore);
  assert(
    earlyPanBefore.materialState === 'entering',
    'Playground early-pan check missed the title/material entrance',
    earlyPanBefore,
  );
  assert(!earlyPanBefore.blockedByInertSurface, 'Playground remained inert during route-in', earlyPanBefore);
  const earlyViewportBox = await page.locator('[data-playground-viewport]').boundingBox();
  assert(earlyViewportBox, 'Playground early-pan viewport has no drag geometry');
  await page.mouse.move(
    earlyViewportBox.x + (earlyViewportBox.width * 0.62),
    earlyViewportBox.y + (earlyViewportBox.height * 0.58),
  );
  await page.mouse.down();
  await page.mouse.move(
    earlyViewportBox.x + (earlyViewportBox.width * 0.49),
    earlyViewportBox.y + (earlyViewportBox.height * 0.43),
    { steps: 6 },
  );
  await page.mouse.up();
  await waitForCameraChange(page, earlyPanBefore.camera, ['x', 'y']);
  const earlyPanAfter = await page.evaluate(() => ({
    camera: window.__ABS_PLAYGROUND__.getSnapshot().camera,
    phase: document.documentElement.dataset.absTransitionPhase,
    materialState: document.querySelector('[data-playground-experience]')
      ?.dataset.routeMaterialState,
  }));
  await page.evaluate(() => window.__ABS_PLAYGROUND__.recenter());
  await waitForPlayground(page);
  assert(new URL(page.url()).pathname === '/playground.html', 'SPA entry did not commit Playground', page.url());
  await page.locator('[data-route-tab="contact"]').click();
  await page.waitForURL((url) => url.pathname === '/contact.html', { timeout: timeoutMs });
  await waitForIdle(page);
  assert(!await page.locator('[data-playground-experience]').count(), 'SPA exit retained Playground DOM');
  assert(!await page.evaluate(() => Boolean(window.__ABS_PLAYGROUND__)), 'SPA exit retained the Playground diagnostic API');
  await page.goBack();
  await waitForPlayground(page);
  assert(new URL(page.url()).pathname === '/playground.html', 'Browser Back did not re-enter Playground', page.url());
  await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => null);
  await page.waitForURL((url) => url.pathname === '/index.html', { timeout: timeoutMs });
  await page.waitForFunction(() => {
    const root = document.documentElement;
    const activeRoute = document.querySelector('[data-route-tab][aria-current="page"]')?.dataset.routeTab || '';
    const renderedRoute = document.querySelector('[data-shell-route-view]')?.dataset.shellRouteView || '';
    return (
      root.dataset.absTransitionPhase === 'idle'
      && activeRoute === 'home'
      && renderedRoute === 'home'
      && !document.querySelector('[data-playground-experience]')
    );
  }, null, { timeout: timeoutMs, polling: 'raf' });
  await page.evaluate(() => new Promise((resolvePaint) => requestAnimationFrame(() => requestAnimationFrame(resolvePaint))));
  await page.waitForTimeout(250);
  await page.waitForFunction(() => {
    const lifecycle = window.__ABS_PLAYGROUND_LIFECYCLE_AUDIT__?.snapshot?.();
    const interactionTypes = [
      'pointermove',
      'pointerleave',
      'pointerdown',
      'pointerup',
      'pointercancel',
      'wheel',
      'click',
      'keydown',
    ];
    return interactionTypes.every((type) => (lifecycle?.playgroundByType?.[type] || 0) === 0);
  }, null, { timeout: 3000, polling: 'raf' });
  const afterExit = await page.evaluate(() => window.__ABS_PLAYGROUND_LIFECYCLE_AUDIT__.snapshot());
  const interactionTypes = [
    'pointermove',
    'pointerleave',
    'pointerdown',
    'pointerup',
    'pointercancel',
    'wheel',
    'click',
    'keydown',
  ];
  assert(
    interactionTypes.every((type) => (afterExit.playgroundByType?.[type] || 0) === 0),
    'SPA exit retained interaction listeners on a Playground-owned target',
    { homeLifecycle, afterExit },
  );
  assert(afterExit.activeFrameCount <= homeLifecycle.activeFrameCount + 1, 'SPA exit leaked animation frames', { homeLifecycle, afterExit });
  evidence.spa = { homeLifecycle, earlyPanBefore, earlyPanAfter, afterExit };
}

async function assertTouchAndReducedMotion(browser, failures, evidence) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  bindFailureCapture(page, failures);
  await installAuditHooks(page);
  await gotoPlayground(page);
  let state = await getPlaygroundState(page);
  assert(state.snapshot.camera.reducedMotion === true, 'Reduced-motion camera mode is not active', state.snapshot);
  assert(await page.locator('[data-playground-experience]').getAttribute('data-playground-reduced-motion') === 'true', 'Reduced-motion route marker is missing');
  const before = state.snapshot.camera;
  const viewportBox = await page.locator('[data-playground-viewport]').boundingBox();
  assert(viewportBox, 'Touch viewport geometry is missing');
  const startX = viewportBox.x + (viewportBox.width * 0.7);
  const startY = viewportBox.y + (viewportBox.height * 0.62);
  const endX = startX - 72;
  const endY = startY - 54;
  if (browserName === 'chromium') {
    const client = await context.newCDPSession(page);
    const touchPoint = (x, y) => ({ x, y, radiusX: 8, radiusY: 8, force: 1, id: 41 });
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [touchPoint(startX, startY)],
    });
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [touchPoint((startX + endX) / 2, (startY + endY) / 2)],
    });
    await client.send('Input.dispatchTouchEvent', {
      type: 'touchMove',
      touchPoints: [touchPoint(endX, endY)],
    });
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await client.detach();
  } else {
    await page.locator('[data-playground-viewport]').evaluate((target, coordinates) => {
      const capture = target.setPointerCapture;
      const hasCapture = target.hasPointerCapture;
      target.setPointerCapture = () => {};
      target.hasPointerCapture = () => false;
      const dispatch = (type, x, y) => target.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        cancelable: true,
        pointerId: 41,
        pointerType: 'touch',
        isPrimary: true,
        button: 0,
        clientX: x,
        clientY: y,
      }));
      dispatch('pointerdown', coordinates.startX, coordinates.startY);
      dispatch('pointermove', coordinates.endX, coordinates.endY);
      dispatch('pointerup', coordinates.endX, coordinates.endY);
      target.setPointerCapture = capture;
      target.hasPointerCapture = hasCapture;
    }, { startX, startY, endX, endY });
  }
  await waitForCameraChange(page, before, ['x', 'y']);
  state = await getPlaygroundState(page);
  assert(state.snapshot.camera.inertiaActive === false, 'Reduced motion kept touch inertia active', state.snapshot.camera);
  assert(state.lightboxCount === 0, 'Touch drag release opened a lightbox', state);
  await page.waitForTimeout(750);
  const { itemId } = await clickLogicalItem(page, 'video');
  await page.waitForSelector('.playground-lightbox video', { state: 'attached', timeout: timeoutMs });
  state = await getPlaygroundState(page);
  assert(state.videoCount === 1, 'Reduced motion removed usable video controls', state);
  const reducedVideo = await page.locator('.playground-lightbox video').evaluate((video) => ({
    paused: video.paused,
    autoPlay: video.autoplay,
    controls: video.controls,
  }));
  assert(reducedVideo.paused && !reducedVideo.autoPlay && reducedVideo.controls, 'Reduced-motion video is not paused and controllable', reducedVideo);
  await page.waitForFunction(() => window.__ABS_PLAYGROUND__.getSnapshot().diagnostics.activeVideoCount === 1, null, {
    timeout: timeoutMs,
    polling: 'raf',
  });
  await page.keyboard.press('Escape');
  await waitForLightboxClosed(page);
  await page.screenshot({ path: resolve(runRoot, 'reduced-motion-touch.png'), fullPage: true });
  evidence.touchAndReducedMotion = { itemId, camera: state.snapshot.camera };
  await context.close();
}

async function assertCompactLanding(browser, failures, evidence) {
  const context = await browser.newContext({
    viewport: { width: 320, height: 568 },
    colorScheme: 'light',
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  bindFailureCapture(page, failures);
  await installAuditHooks(page);
  await gotoPlayground(page);
  const compact = await page.evaluate(() => {
    const route = document.querySelector('[data-playground-experience]');
    const worldScale = Number(route?.dataset.playgroundWorldScale || 1);
    const items = Array.from(document.querySelectorAll('[data-playground-item]'), (item) => {
      const rect = item.getBoundingClientRect();
      const viewportRect = document.querySelector('[data-playground-viewport]').getBoundingClientRect();
      const width = Math.max(0, Math.min(rect.right, viewportRect.right)
        - Math.max(rect.left, viewportRect.left));
      const height = Math.max(0, Math.min(rect.bottom, viewportRect.bottom)
        - Math.max(rect.top, viewportRect.top));
      return {
        id: item.dataset.playgroundItem,
        intersectionRatio: rect.width > 0 && rect.height > 0
          ? (width * height) / (rect.width * rect.height)
          : 0,
      };
    });
    const titleSize = Number.parseFloat(getComputedStyle(
      document.querySelector('.playground-item__title'),
    ).fontSize);
    const descriptionSize = Number.parseFloat(getComputedStyle(
      document.querySelector('.playground-item__description'),
    ).fontSize);
    return {
      items,
      worldScale,
      renderedTitleSize: titleSize * worldScale,
      renderedDescriptionSize: descriptionSize * worldScale,
      rovingTabStopCount: document.querySelectorAll(
        '[data-playground-item] > .playground-item__route-surface > button[tabindex="0"]',
      ).length,
    };
  });
  assert(
    compact.items.some((item) => item.intersectionRatio >= 0.3)
      && compact.items.filter((item) => item.intersectionRatio >= 0.04).length >= 2,
    'The initial 320 x 568 Lab view does not show one strong project peek and one supporting peek',
    compact.items,
  );
  assert(
    compact.renderedTitleSize >= 12 && compact.renderedDescriptionSize >= 12,
    'Compact Lab captions render below the 12px minimum',
    compact,
  );
  assert(compact.rovingTabStopCount === 1, 'Compact Lab lost its roving project tab stop', compact);

  const viewport = page.locator('[data-playground-viewport]');
  await viewport.focus();
  await page.keyboard.press('Tab');
  const focusStyle = await page.evaluate(() => {
    const button = document.activeElement;
    const style = getComputedStyle(button);
    const pseudo = getComputedStyle(button, '::after');
    return {
      outlineWidth: Number.parseFloat(style.outlineWidth),
      outlineOffset: Number.parseFloat(style.outlineOffset),
      pseudoContent: pseudo.content,
    };
  });
  assert(
    focusStyle.outlineWidth <= 2
      && focusStyle.outlineOffset <= 2
      && ['none', 'normal', ''].includes(focusStyle.pseudoContent.replaceAll('"', '')),
    'Compact project focus still uses the oversized double-ring treatment',
    focusStyle,
  );
  await page.keyboard.press('Shift+Tab');
  await page.evaluate(() => window.__ABS_PLAYGROUND__.recenter());
  await page.screenshot({ path: resolve(runRoot, 'compact-landing.png'), fullPage: true });
  evidence.compactLanding = { ...compact, focusStyle };
  await context.close();
}

async function main() {
  assert(browserType, `Unsupported ABS_BROWSER "${browserName}"`);
  assert(
    !(previewMode && canonicalWriteMode),
    'Canonical write verification is available only on the authoring server.',
  );
  await mkdir(runRoot, { recursive: true });
  await waitForServer();
  const canonicalOriginalSources = canonicalWriteMode
    ? new Map(await Promise.all(canonicalWriteRestorePaths.map(async (filePath) => (
      [filePath, await readFile(filePath, 'utf8')]
    ))))
    : null;

  const cssSource = await readFile(
    resolve(repoRoot, 'react-app/app/src/routes/playground/playground.css'),
    'utf8',
  );
  assert(!/--ball-\d+\s*:|--simulation-palette/i.test(cssSource), 'Playground CSS contains a route-local palette override');

  const browser = await browserType.launch({ headless: process.env.ABS_HEADED !== '1' });
  const context = await browser.newContext({
    viewport,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const failures = { consoleErrors: [], pageErrors: [], failedRequests: [], failedResponses: [] };
  bindFailureCapture(page, failures);
  await installAuditHooks(page);
  const evidence = {
    browser: browserName,
    baseUrl,
    input: {},
    wrapping: {},
  };

  try {
    await gotoPlayground(page, '/playground.html');
    let state = await getPlaygroundState(page);
    assertBaseline(state);
    const layerContract = await page.evaluate(() => {
      const grid = document.querySelector('[data-playground-dot-field]');
      const world = document.querySelector('[data-playground-world]');
      if (!grid || !world) return null;
      return {
        sameParent: grid.parentElement === world.parentElement,
        gridPrecedesWorld: Boolean(grid.compareDocumentPosition(world) & Node.DOCUMENT_POSITION_FOLLOWING),
        gridZIndex: Number.parseInt(getComputedStyle(grid).zIndex, 10),
        worldZIndex: Number.parseInt(getComputedStyle(world).zIndex, 10),
        gridPointerEvents: getComputedStyle(grid).pointerEvents,
      };
    });
    assert(layerContract?.sameParent, 'Dot grid and project world do not share the expected stacking context', layerContract);
    assert(layerContract.gridPrecedesWorld, 'Dot grid must be painted before the project world', layerContract);
    assert(layerContract.gridZIndex < layerContract.worldZIndex, 'Dot grid must remain behind every project and label', layerContract);
    assert(layerContract.gridPointerEvents === 'none', 'Dot grid must remain inert behind project interactions', layerContract);
    evidence.layerContract = layerContract;
    const canvasCalibration = await page.evaluate(() => {
      const grid = document.querySelector('[data-playground-dot-field]');
      const snapshot = window.__ABS_PLAYGROUND__?.getSnapshot?.().dotField;
      if (!grid || !snapshot) return null;
      const rect = grid.getBoundingClientRect();
      return {
        renderedScaleX: grid.width / rect.width,
        renderedScaleY: grid.height / rect.height,
        backingScaleX: snapshot.backingScaleX,
        backingScaleY: snapshot.backingScaleY,
      };
    });
    assert(
      canvasCalibration
        && Math.abs(canvasCalibration.renderedScaleX - canvasCalibration.backingScaleX) < 0.000001
        && Math.abs(canvasCalibration.renderedScaleY - canvasCalibration.backingScaleY) < 0.000001,
      'Dot-grid backing store is not calibrated equally to both CSS axes',
      canvasCalibration,
    );
    evidence.canvasCalibration = canvasCalibration;
    const atmosphereContract = await page.evaluate(() => (
      window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.() || null
    ));
    assert(
      atmosphereContract?.routeId === 'playground'
        && atmosphereContract.scheduler === 'renderer-coupled'
        && atmosphereContract.internalRafCount === 0,
      'Lab atmosphere must follow dot-renderer frames and sleep while the field is idle',
      atmosphereContract,
    );
    evidence.atmosphereContract = atmosphereContract;
    const initialDimensions = {
      columns: state.snapshot.diagnostics.worldColumns,
      rows: state.snapshot.diagnostics.worldRows,
      widthPx: state.snapshot.diagnostics.worldWidthPx,
      heightPx: state.snapshot.diagnostics.worldHeightPx,
    };
    const initialWorld = {
      ...initialDimensions,
      placements: state.snapshot.placements,
    };
    await page.screenshot({ path: resolve(runRoot, 'opening-title.png'), fullPage: true });

    await gotoPlayground(page, '/playground');
    state = await getPlaygroundState(page);
    assertBaseline(state);
    assert(state.path === '/playground', 'Extensionless Playground alias did not load', state);

    await assertSalonCoverage(page, evidence);
    await assertCameraInputs(page, evidence);
    await assertSpatialProjectNavigation(page, evidence);
    await assertDotColorWake(page, evidence);
    await assertHoverDoesNotMoveProjects(page, evidence);
    await assertDragGuard(page);
    await assertWrapping(page, evidence);
    await assertWorldMediaLifecycle(page, evidence);
    await assertLightboxes(page, evidence);

    const selectedId = state.items.find((item) => item.type === 'image').id;
    await gotoPlayground(page, `/playground.html?work=${selectedId}`);
    state = await getPlaygroundState(page);
    assert(state.lightboxCount === 1 && state.snapshot.selectedId === selectedId, 'Direct work URL did not select the requested item', state);
    await page.keyboard.press('Escape');
    await waitForLightboxClosed(page);
    await gotoPlayground(page, '/playground.html?work=not-a-project');
    state = await getPlaygroundState(page);
    assert(state.lightboxCount === 0 && state.snapshot.selectedId === null, 'Invalid work URL did not fail safely', state);

    await assertPaletteAndMute(page, evidence, { mutable: !previewMode });
    if (!previewMode) await assertConfigAndPanels(page, evidence);
    await page.reload({ waitUntil: 'domcontentloaded', timeout: timeoutMs });
    await waitForPlayground(page);
    state = await getPlaygroundState(page);
    if (canonicalWriteMode) {
      const reloadedConfig = await page.evaluate(() => ({ ...window.__ABS_PLAYGROUND_CONFIG__ }));
      assert(reloadedConfig.dotRadiusPx === 5.25, 'Reload did not consume the saved canonical dot radius', reloadedConfig);
      assert(reloadedConfig.gridSpacingPx === 44, 'Reload did not consume the saved canonical grid spacing', reloadedConfig);
      assert(reloadedConfig.projectSpacing === 2.2, 'Reload did not consume the saved canonical project spacing', reloadedConfig);
      assert(reloadedConfig.wheelSensitivity === 1.5, 'Reload did not consume the saved canonical wheel sensitivity', reloadedConfig);
      assert(reloadedConfig.dragMomentum === 0, 'Reload did not consume the saved canonical drag momentum', reloadedConfig);
      assert(reloadedConfig.dotOpacity === 0.32, 'Reload did not consume the saved canonical dot opacity', reloadedConfig);
      assert(reloadedConfig.colorWakeRadiusPx === 240, 'Reload did not consume the saved canonical colour radius', reloadedConfig);
      assert(reloadedConfig.colorWakePersistenceMs === 1800, 'Reload did not consume the saved canonical colour persistence', reloadedConfig);
      assert(reloadedConfig.colorWakeOpacity === 0.76, 'Reload did not consume the saved canonical colour intensity', reloadedConfig);
      assert(reloadedConfig.colorWakeDensity === 0.65, 'Reload did not consume the saved canonical colour density', reloadedConfig);
      assert(reloadedConfig.colorWakeEdgeSoftness === 0.4, 'Reload did not consume the saved canonical edge softness', reloadedConfig);
      assert(reloadedConfig.colorWakeDotScale === 1.2, 'Reload did not consume the saved canonical colour dot size', reloadedConfig);
      evidence.canonicalReload = reloadedConfig;
    }
    const reloadedDimensions = {
      columns: state.snapshot.diagnostics.worldColumns,
      rows: state.snapshot.diagnostics.worldRows,
      widthPx: state.snapshot.diagnostics.worldWidthPx,
      heightPx: state.snapshot.diagnostics.worldHeightPx,
    };
    const expectedReloadDimensions = canonicalWriteMode
      ? evidence.panel.savedDimensions
      : initialDimensions;
    assert(
      JSON.stringify(reloadedDimensions) === JSON.stringify(expectedReloadDimensions),
      'Reload did not reproduce canonical world dimensions',
      { expectedReloadDimensions, reloadedDimensions },
    );
    evidence.reloadParity = { expectedReloadDimensions, reloadedDimensions };

    const growthBaseline = canonicalWriteMode
      ? { ...reloadedDimensions, placements: state.snapshot.placements }
      : initialWorld;
    await assertContentIsolationAndGrowth(browser, failures, evidence, growthBaseline);
    await assertSpaContract(page, evidence);
    await assertTouchAndReducedMotion(browser, failures, evidence);
    await assertCompactLanding(browser, failures, evidence);

    assert(failures.consoleErrors.length === 0, 'Console errors were recorded', failures.consoleErrors);
    assert(failures.pageErrors.length === 0, 'Page errors were recorded', failures.pageErrors);
    assert(failures.failedRequests.length === 0, 'Local requests failed', failures.failedRequests);
    assert(failures.failedResponses.length === 0, 'Local asset responses failed', failures.failedResponses);

    const report = {
      generatedAt: new Date().toISOString(),
      result: 'pass',
      browser: browserName,
      baseUrl,
      directEvidence: [
        'direct /playground.html and /playground loads',
        'SPA entry, exit, and Browser Back',
        'SPA drag changes the Lab camera while route and title material are still entering',
        'five-tab shell and active Playground pill',
        'font-ready centred title geometry',
        'four-way explore cue uses the specified size and tighter lockup distance',
        'mouse drag, touch drag, wheel, diagonal wheel, keyboard, and Home recenter',
        'one roving project tab stop with directional nearest-neighbour arrow navigation',
        '320 x 568 landing keeps project material visible and rendered captions at 12px or larger',
        'loose, rotation-free salon placement fills deterministic quarter-cells without sparse placement-order rings',
        '64 sampled camera positions stay between the sparse and overcrowded coverage limits',
        'projects remain fixed under pointer hover with no attraction transform',
        'enlarged project and caption bounds remain collision-free at every inspected world seam',
        'low-opacity grey dots wake into current-palette colours, persist, fade, and return the renderer to sleep',
        'positive, negative, horizontal, vertical, and diagonal wrapping coverage',
        'dot phase movement and grid alignment',
        'dot grid remains inert and below the complete project world stacking layer',
        'direct project-spacing control expands placements and the modulo repeat area together',
        '30 logical items with 18 image, 6 video, and 6 code items',
        'nearest semantic world-media ownership and poster-only decorative copies',
        'drag guard, URL selection, invalid URL isolation, and all dialog close paths',
        'asset-only lightboxes preserve every visible project position and runtime without backdrop blur',
        'dialog focus trap, focus restoration, and Browser Back close',
        'accurate active video or iframe counts, offscreen cleanup, iframe sandbox, and iframe Escape bridge',
        'shared palette propagation, shared mute preservation, and reduced motion',
        previewMode
          ? 'production preview hides development authoring controls'
          : canonicalWriteMode
            ? 'live motion controls, canonical file save, and reload round trip'
            : 'live motion controls and canonical save request payload',
        ...(!previewMode ? ['docked/detached panel schema parity'] : []),
        'reload world-dimension parity, isolated invalid items, visible fatal errors, and expanded item 31',
        'route listener, dialog listener, diagnostic API, and RAF cleanup',
        'zero console errors, page errors, or failed local assets',
      ],
      structuralEvidence: [
        'browser zoom remains available because the viewport contract has no zoom lock',
        'Playground CSS contains no route-local simulation palette override',
        'haptics are supplemental because touch and mouse flows do not depend on a haptic result',
        previewMode
          ? 'this run used the built production preview'
          : 'the development run used the canonical content and configuration pipeline',
      ],
      failures,
      evidence,
      artifacts: [
        'opening-title.png',
        'compact-landing.png',
        'dot-color-wake.png',
        'horizontal-seam.png',
        'vertical-seam.png',
        'diagonal-seam.png',
        'opposite-side-of-cut.png',
        'before-modulo-wrap.png',
        'after-modulo-wrap.png',
        ...(!previewMode ? ['docked-panel.png', 'detached-panel.png'] : []),
        'world-media-lifecycle.png',
        'image-lightbox.png',
        'video-lightbox.png',
        'code-lightbox.png',
        'expanded-world-31.png',
        'reduced-motion-touch.png',
      ],
    };
    const reportPath = resolve(runRoot, 'report.json');
    await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`PASS Playground audit (${browserName})`);
    console.log(`Report: ${reportPath}`);
  } catch (error) {
    const reportPath = resolve(runRoot, 'report.json');
    await page.screenshot({ path: resolve(runRoot, 'failure.png'), fullPage: true }).catch(() => {});
    await writeFile(reportPath, `${JSON.stringify({
      generatedAt: new Date().toISOString(),
      result: 'fail',
      browser: browserName,
      baseUrl,
      error: error.stack || error.message || String(error),
      failures,
      evidence,
    }, null, 2)}\n`);
    throw error;
  } finally {
    await context.close();
    await browser.close();
    if (canonicalOriginalSources !== null) {
      await Promise.all(Array.from(canonicalOriginalSources, ([filePath, source]) => (
        writeFile(filePath, source)
      )));
    }
  }
}

main().catch((error) => {
  console.error(error.stack || error.message || String(error));
  process.exitCode = 1;
});
