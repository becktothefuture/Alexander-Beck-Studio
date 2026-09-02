#!/usr/bin/env node
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import {
  ROUTE_LOADER_BACKDROP_MODES,
  resolveRouteLoaderBackdropMode,
} from '../react-app/app/src/lib/motion/route-transition-backplane.js';
import { advanceSimulationSwitcherTo } from './lib/simulation-switcher.mjs';

const DEFAULT_URL = 'http://127.0.0.1:8013';
const WAIT_MS = Number(process.env.ABS_TRANSITION_HARD_TIMEOUT_MS || 60000);
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const HEADED = process.env.ABS_HEADED === '1';
const STRICT_RAF = process.env.ABS_TRANSITION_STRICT_RAF === '1';
const REDUCED_MOTION = process.env.ABS_TRANSITION_REDUCED_MOTION === '1';
const BUTTON_BAR_ONLY = process.env.ABS_TRANSITION_BUTTON_BAR_ONLY === '1';
const STRESS_MODE = process.env.ABS_TRANSITION_STRESS === '1';
const DELAYED_READINESS_MODE = process.env.ABS_TRANSITION_DELAYED_READINESS === '1';
const PRELOAD_FAILURE_MODE = process.env.ABS_TRANSITION_PRELOAD_FAILURE === '1';
const CPU_THROTTLE_RATE = Math.max(1, Number(process.env.ABS_TRANSITION_CPU_THROTTLE_RATE || 1));
const READINESS_DELAY_MS = Math.max(0, Number(process.env.ABS_TRANSITION_READINESS_DELAY_MS || 0));
const DWELL_MS = Math.max(0, Number(process.env.ABS_TRANSITION_DWELL_MS || 0));
const ROUTE_BACKED_HOME_ID = String(process.env.ABS_TRANSITION_ROUTE_BACKED_HOME || '').trim();
const REQUESTED_THEME = String(process.env.ABS_TRANSITION_THEME || '').trim().toLowerCase();
if (REQUESTED_THEME && !['light', 'dark'].includes(REQUESTED_THEME)) {
  throw new Error(`Unknown ABS_TRANSITION_THEME "${REQUESTED_THEME}" (expected light or dark).`);
}
const VIEWPORT_MATCH = String(process.env.ABS_TRANSITION_VIEWPORT || '1280x900').match(/^(\d+)x(\d+)$/i);
const VIEWPORT = VIEWPORT_MATCH
  ? { width: Number(VIEWPORT_MATCH[1]), height: Number(VIEWPORT_MATCH[2]) }
  : { width: 1280, height: 900 };
const VISIBILITY_EPSILON = 0.011;
const FULL_COVER_OPACITY = 0.98;
const GEOMETRY_TOLERANCE_PX = 1.5;
const FRAME_TOLERANCE_MS = 20;
const REDUCED_SPINNER_ESTABLISHMENT_MS = 80;
const SPINNER_DELAY_MS = 120;
const SPINNER_MINIMUM_MS = 140;
const __dirname = dirname(fileURLToPath(import.meta.url));
const outputRoot = resolve(__dirname, '..', 'output', 'playwright', 'transition-flows');
const simulationCatalogPath = resolve(__dirname, '..', 'react-app/app/src/data/simulationCatalog.json');
const BROWSERS = { chromium, firefox, webkit };
const runTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
const runStem = [
  runTimestamp,
  BROWSER_NAME,
  `${VIEWPORT.width}x${VIEWPORT.height}`,
  REDUCED_MOTION ? 'reduced' : 'motion',
  STRESS_MODE ? 'stress' : '',
  DELAYED_READINESS_MODE ? 'delayed' : '',
  PRELOAD_FAILURE_MODE ? 'preload-failure' : '',
  CPU_THROTTLE_RATE > 1 ? `cpu-${CPU_THROTTLE_RATE}x` : '',
  READINESS_DELAY_MS > 0 ? `readiness-${READINESS_DELAY_MS}ms` : '',
  DWELL_MS > 0 ? `dwell-${DWELL_MS}ms` : '',
  REQUESTED_THEME ? `theme-${REQUESTED_THEME}` : '',
  HEADED ? 'headed' : '',
].filter(Boolean).join('-');

const ROUTE_DEFINITIONS = Object.freeze({
  portfolio: Object.freeze({
    id: 'portfolio',
    href: '/portfolio.html',
    ready: '#portfolio-coming-soon-title, [data-work-experience="true"][data-playground-ready="true"]',
  }),
  home: Object.freeze({ id: 'home', href: '/index.html', ready: '#c, #simulation-stage' }),
  about: Object.freeze({ id: 'about', href: '/about.html', ready: '[data-route-content="about"]' }),
  contact: Object.freeze({ id: 'contact', href: '/contact.html', ready: '[data-route-content="contact"]' }),
});
const DAILY_FOCUS_ROUTE_IDS = Object.freeze([
  'repel-room',
  'flock-of-birds',
]);
const ROUTE_VIEW_ALIASES = Object.freeze({
  about: Object.freeze(['about-coming-soon', 'about-narrative']),
});
const requestedSequence = String(process.env.ABS_TRANSITION_SEQUENCE || '').trim();
const ROUTE_STEPS = (requestedSequence
  ? requestedSequence.split(',').map((routeId) => routeId.trim()).filter(Boolean)
  : ['portfolio', 'home', 'about', 'home', 'contact', 'home']
).map((routeId) => {
  const step = ROUTE_DEFINITIONS[routeId];
  if (!step) throw new Error(`Unknown ABS_TRANSITION_SEQUENCE route "${routeId}".`);
  return step;
});

function assert(condition, message, details = null) {
  if (condition) return;
  const suffix = details ? `\n${JSON.stringify(details, null, 2)}` : '';
  throw new Error(`${message}${suffix}`);
}

function isTransparentBackground(color) {
  const normalized = String(color || '').trim().toLowerCase();
  return normalized === 'transparent'
    || (normalized.startsWith('rgba(') && /,\s*0(?:\.0+)?\s*\)$/.test(normalized))
    || (normalized.includes('/') && /\/\s*0(?:\.0+)?\s*\)$/.test(normalized));
}

function origin() {
  return new URL(String(process.env.ABS_DEV_URL || DEFAULT_URL)).origin;
}

function routeUrl(pathname) {
  return new URL(pathname, origin()).toString();
}

function compress(values) {
  return values.filter((value, index) => index === 0 || value !== values[index - 1]);
}

function isRouteViewForDestination(routeViewId, destinationRouteId) {
  return routeViewId === destinationRouteId
    || (ROUTE_VIEW_ALIASES[destinationRouteId] || []).includes(routeViewId)
    || (destinationRouteId === 'home' && DAILY_FOCUS_ROUTE_IDS.includes(routeViewId));
}

function getDestinationRouteMaxOpacity(routeViews, destinationRouteId) {
  return Math.max(
    0,
    ...Object.entries(routeViews || {})
      .filter(([routeViewId]) => isRouteViewForDestination(routeViewId, destinationRouteId))
      .map(([, routeView]) => routeView?.maxOpacity || 0),
  );
}

function traceExcerpt(trace, sampleIndex, radius = 2) {
  const start = Math.max(0, sampleIndex - radius);
  const end = Math.min(trace.samples.length, sampleIndex + radius + 1);
  return {
    fromRouteId: trace.fromRouteId,
    toRouteId: trace.toRouteId,
    phases: compress(trace.samples.map((sample) => sample.phase)),
    sampleIndex,
    samples: trace.samples.slice(start, end),
  };
}

async function waitForIdle(page) {
  await page.waitForFunction(
    () => {
      const root = document.documentElement;
      const overlay = document.getElementById('abs-boot-overlay');
      const overlayHidden = !overlay
        || getComputedStyle(overlay).display === 'none'
        || getComputedStyle(overlay).visibility === 'hidden'
        || Number.parseFloat(getComputedStyle(overlay).opacity || '1') < 0.02;
      return (
        (root.dataset.absTransitionPhase || 'idle') === 'idle'
        && !root.dataset.absInstrumentWake
        && root.dataset.absBootState !== 'booting'
        && overlayHidden
      );
    },
    null,
    { timeout: WAIT_MS, polling: 'raf' },
  );
}

async function waitForInitialHome(page) {
  await page.waitForSelector('#c', { timeout: WAIT_MS, state: 'attached' });
  await waitForIdle(page);
  await page.waitForFunction(() => {
    const root = document.documentElement;
    const canvas = document.getElementById('c');
    const route = document.querySelector('[data-shell-route-view]')?.dataset.shellRouteView || '';
    return Boolean(
      route === 'home'
      && canvas
      && canvas.clientWidth >= 64
      && canvas.clientHeight >= 64
      && root.dataset.absRuntimeRoute === 'home'
      && root.dataset.absRuntimeStatus === 'ready'
      && root.dataset.absHomeRouteReady === 'true'
    );
  }, null, { timeout: WAIT_MS, polling: 'raf' });
}

async function startRafRecorder(page, { fromRouteId, toRouteId, label }) {
  await page.evaluate(({
    fromRouteId: source,
    toRouteId: target,
    label: traceLabel,
    reducedMotion,
    dailyFocusRouteIds,
  }) => {
    window.__ABS_TRANSITION_FLOW_RECORDER__?.stop?.();

    const state = {
      label: traceLabel,
      fromRouteId: source,
      toRouteId: target,
      startedAt: performance.now(),
      samples: [],
      readyEvents: [],
      failureEvents: [],
      indicatorTransitions: [],
      longTasks: [],
      rafId: 0,
      running: true,
      spinnerDelayMs: Number.parseFloat(getComputedStyle(document.documentElement)
        .getPropertyValue('--abs-route-spinner-delay')) || 120,
      spinnerMinimumMs: reducedMotion ? 0 : (
        Number.parseFloat(getComputedStyle(document.documentElement)
          .getPropertyValue('--abs-route-spinner-minimum')) || 140
      ),
    };
    const nativeRequestAnimationFrame = window.__ABS_AUDIT_NATIVE_RAF__
      || window.requestAnimationFrame.bind(window);
    const nativeCancelAnimationFrame = window.__ABS_AUDIT_NATIVE_CANCEL_RAF__
      || window.cancelAnimationFrame.bind(window);
    const longTaskObserver = typeof PerformanceObserver === 'function'
      ? new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.startTime < state.startedAt) return;
            state.longTasks.push({
              startMs: Math.round((entry.startTime - state.startedAt) * 100) / 100,
              durationMs: Math.round(entry.duration * 100) / 100,
            });
          });
        })
      : null;
    try {
      longTaskObserver?.observe({ type: 'longtask', buffered: true });
    } catch {
      /* Long Task API is not available in every engine. */
    }

    const round = (value, precision = 4) => {
      if (!Number.isFinite(value)) return 0;
      const scale = 10 ** precision;
      return Math.round(value * scale) / scale;
    };
    const elementIdentities = new WeakMap();
    let nextElementIdentity = 1;
    const identifyElement = (element) => {
      if (!element) return 0;
      if (!elementIdentities.has(element)) {
        elementIdentities.set(element, nextElementIdentity);
        nextElementIdentity += 1;
      }
      return elementIdentities.get(element);
    };
    const rectOf = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        left: round(rect.left, 2),
        top: round(rect.top, 2),
        right: round(rect.right, 2),
        bottom: round(rect.bottom, 2),
        width: round(rect.width, 2),
        height: round(rect.height, 2),
      };
    };
    const readEffective = (element) => {
      if (!element) return null;
      let effectiveOpacity = 1;
      let visiblyStyled = true;
      let current = element;
      while (current && current.nodeType === Node.ELEMENT_NODE) {
        const styles = getComputedStyle(current);
        const opacity = Number.parseFloat(styles.opacity || '1');
        effectiveOpacity *= Number.isFinite(opacity) ? opacity : 1;
        if (
          styles.display === 'none'
          || styles.visibility === 'hidden'
          || styles.contentVisibility === 'hidden'
        ) {
          visiblyStyled = false;
        }
        current = current.parentElement;
      }
      const styles = getComputedStyle(element);
      const rect = rectOf(element);
      const hasArea = Boolean(rect && rect.width > 0 && rect.height > 0);
      return {
        opacity: round(Number.parseFloat(styles.opacity || '1')),
        effectiveOpacity: round(visiblyStyled && hasArea ? effectiveOpacity : 0),
        visiblyStyled,
        display: styles.display,
        visibility: styles.visibility,
        pointerEvents: styles.pointerEvents,
        inert: Boolean(element.inert || element.closest('[inert]')),
        ariaBusy: element.getAttribute('aria-busy') || '',
        rect,
      };
    };
    const hasCanvasBuffer = (canvas) => {
      if (!canvas || canvas.clientWidth < 64 || canvas.clientHeight < 64) return false;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const minWidth = Math.ceil((canvas.clientWidth + 2) * dpr) - 2;
      const minHeight = Math.ceil((canvas.clientHeight + 2) * dpr) - 2;
      return canvas.width >= minWidth && canvas.height >= minHeight;
    };
    const readReadiness = (routeId) => {
      const root = document.documentElement;
      const body = document.body;
      const canvas = document.getElementById('c');
      if (routeId === 'home') {
        const semanticTitle = document.getElementById('hero-title');
        const semanticTitleReady = Boolean(
          semanticTitle?.querySelector('.hero-title__name')?.textContent?.trim()
          && semanticTitle?.querySelectorAll('.hero-title__role').length >= 2
        );
        const legacyReady = Boolean(
          document.querySelector('[data-shell-route-view="home"]')
          && hasCanvasBuffer(canvas)
          && root.dataset.absRuntimeRoute === 'home'
          && root.dataset.absRuntimeStatus === 'ready'
          && root.dataset.absHomeRouteReady === 'true'
          && (root.dataset.absHomeCanvasTitleReady === 'true' || semanticTitleReady)
        );
        const dailyStage = document.getElementById('simulation-stage');
        const dailyRouteView = [...document.querySelectorAll('[data-route-view]')]
          .find((element) => dailyFocusRouteIds.includes(element.dataset.routeView || ''));
        const dailyRouteId = dailyStage?.dataset.simulationId
          || dailyRouteView?.dataset.routeView
          || '';
        const dailyCanvasSelector = {
          'repel-room': '#repel-room-canvas',
          'flock-of-birds': '#flock-of-birds-canvas',
        }[dailyRouteId] || '';
        const dailyCanvas = dailyCanvasSelector
          ? document.querySelector(dailyCanvasSelector)
          : null;
        const dailyReady = Boolean(
          dailyFocusRouteIds.includes(dailyRouteId)
          && dailyStage
          && dailyStage.getBoundingClientRect().width >= 64
          && dailyStage.getBoundingClientRect().height >= 64
          && dailyCanvas
          && dailyCanvas.getBoundingClientRect().width >= 64
          && dailyCanvas.getBoundingClientRect().height >= 64
          && dailyCanvas.width >= 64
          && dailyCanvas.height >= 64
          && dailyRouteView
        );
        return {
          ready: legacyReady || dailyReady,
          effectiveRouteId: dailyReady ? dailyRouteId : 'home',
          dailyFocusStatus: root.dataset.absDailyFocusStatus || '',
          runtimeRoute: root.dataset.absRuntimeRoute || '',
          runtimeStatus: root.dataset.absRuntimeStatus || '',
          homeRouteReady: root.dataset.absHomeRouteReady || '',
          canvasTitleReady: root.dataset.absHomeCanvasTitleReady || '',
          canvasBufferReady: hasCanvasBuffer(canvas),
        };
      }
      if (routeId === 'portfolio') {
        if (document.getElementById('portfolio-coming-soon-title')) {
          return { ready: body?.classList.contains('portfolio-page'), productionFallback: true };
        }
        const route = document.querySelector('[data-work-experience="true"]');
        const card = route?.querySelector(
          '.playground-item--case-study .portfolio-project-card[tabindex="0"]',
        );
        const gate = document.querySelector('[data-route-content="portfolio-gate"]');
        // The Work entrance intentionally starts primary cards at scale(0).
        // Use their laid-out box for readiness so the audit does not create a
        // circular dependency between route readiness and route-in animation.
        // Transformed visual geometry is asserted separately during route-in.
        const cardReady = Boolean(card && card.offsetWidth >= 64 && card.offsetHeight >= 64);
        const ready = Boolean(
          body?.classList.contains('work-canvas-page')
          && route?.dataset.playgroundReady === 'true'
          && (gate || cardReady)
        );
        return {
          ready,
          routeReady: route?.dataset.playgroundReady || '',
          interactive: route?.dataset.playgroundInteractive || '',
          openPhase: route?.dataset.workOpenPhase || '',
          cardReady,
          gate: Boolean(gate),
        };
      }
      if (routeId === 'about') {
        const content = document.querySelector('[data-route-content="about"]');
        const productionFallback = !body?.classList.contains('about-narrative-page');
        return {
          ready: Boolean(
            body?.classList.contains('about-page')
            && content
            && (content.dataset.aboutSceneReady === 'true' || productionFallback)
          ),
          sceneReady: content?.dataset.aboutSceneReady || '',
          productionFallback,
        };
      }
      if (routeId === 'contact') {
        return {
          ready: Boolean(
            body?.classList.contains('contact-page')
            && document.querySelector('[data-route-content="contact"]')
          ),
        };
      }
      return { ready: Boolean(document.getElementById('app-frame')) };
    };
    const readRouteViews = () => {
      const routes = {};
      document.querySelectorAll('[data-route-view]').forEach((element) => {
        const routeId = element.dataset.routeView || '';
        if (!routeId) return;
        const effective = readEffective(element);
        const surface = element.closest('[data-route-surface]')?.dataset.routeSurface || 'unknown';
        const entry = routes[routeId] || {
          nodeCount: 0,
          maxOpacity: 0,
          visiblyStyledCount: 0,
          surfaces: [],
        };
        entry.nodeCount += 1;
        entry.maxOpacity = Math.max(entry.maxOpacity, effective?.effectiveOpacity || 0);
        if ((effective?.effectiveOpacity || 0) > 0) entry.visiblyStyledCount += 1;
        if (!entry.surfaces.includes(surface)) entry.surfaces.push(surface);
        routes[routeId] = entry;
      });
      Object.values(routes).forEach((route) => {
        route.maxOpacity = round(route.maxOpacity);
        route.surfaces.sort();
      });
      return routes;
    };
    const readChildren = () => Array.from(document.querySelectorAll('[data-route-enter]')).map((element, index) => {
      const routeId = element.closest('[data-route-view]')?.dataset.routeView || '';
      const effective = readEffective(element);
      const visualParts = Array.from(element.querySelectorAll(
        '[data-route-enter-glyph], [data-route-enter-description-line]'
      ));
      const readVisualPartOpacity = (part) => {
        const partOpacity = readEffective(part)?.effectiveOpacity || 0;
        if (!part.matches('[data-route-enter-glyph]')) return partOpacity;
        const color = getComputedStyle(part).color.trim().toLowerCase();
        if (color === 'transparent') return 0;
        const alpha = color.match(/^rgba\([^)]*,\s*([\d.]+)\)$/i);
        return partOpacity * (alpha ? Number(alpha[1]) : 1);
      };
      const visualOpacity = visualParts.length
        ? Math.max(0, ...visualParts.map(readVisualPartOpacity))
        : effective?.effectiveOpacity || 0;
      return {
        routeId,
        group: element.dataset.routeEnter || '',
        order: element.dataset.routeEnterOrder || String(index),
        id: element.id || '',
        className: typeof element.className === 'string' ? element.className.slice(0, 120) : '',
        effectiveOpacity: round(visualOpacity),
        inert: effective?.inert || false,
        pointerEvents: effective?.pointerEvents || '',
      };
    });
    const readSurfaces = () => {
      const result = {};
      document.querySelectorAll('[data-route-surface]').forEach((element) => {
        const key = element.dataset.routeSurface || 'unknown';
        result[key] = readEffective(element);
      });
      return result;
    };
    const readFocus = () => {
      const active = document.activeElement;
      if (!active) return null;
      return {
        tag: active.tagName,
        id: active.id || '',
        routeTab: active.getAttribute('data-route-tab') || '',
        routeView: active.closest('[data-route-view]')?.dataset.routeView || '',
        inert: Boolean(active.inert || active.closest('[inert]')),
      };
    };
    const readMaterialSnapshot = (routeId) => {
      if (routeId === 'home') {
        const snapshot = window.__ABS_SIMULATION_VISUAL_TRANSITION__;
        return snapshot ? {
          id: 'home-simulation-material',
          state: snapshot.phase || '',
          minScale: round(Number(snapshot.minScale)),
          maxScale: round(Number(snapshot.maxScale)),
          targetCount: Number(snapshot.count || 0),
        } : null;
      }
      if (routeId === 'contact' || routeId === 'portfolio' || routeId === 'about') {
        if (routeId === 'about') {
          const simpleRoot = document.querySelector('[data-about-simple="true"]');
          if (simpleRoot) {
            const canvas = simpleRoot.querySelector('.about-simple__canvas');
            const sceneReady = simpleRoot.dataset.aboutSceneReady === 'true';
            return {
              id: 'about-simple-point-material',
              elementIdentity: identifyElement(simpleRoot),
              canvasIdentity: identifyElement(canvas),
              state: simpleRoot.dataset.aboutEntranceState || '',
              available: true,
              persistent: true,
              minScale: sceneReady ? 1 : 0,
              maxScale: sceneReady ? 1 : 0,
              targetCount: canvas?.width > 0 && canvas?.height > 0 ? 1 : 0,
              sceneReady: simpleRoot.dataset.aboutSceneReady || '',
              worldState: simpleRoot.dataset.pointWorldState || '',
              pointFamilies: simpleRoot.dataset.aboutPointFamilies || '',
            };
          }
        }
        const id = {
          contact: 'contact-ripple-material',
          portfolio: 'portfolio-spatial-view-material',
          about: 'about-point-field-material',
        }[routeId];
        const root = document.querySelector(`[data-route-material-id="${id}"]`);
        if (root) {
          const liveAboutScale = routeId === 'about'
            ? Number(root.dataset.aboutEntranceScale)
            : Number.NaN;
          const materialMinScale = Number(root.dataset.routeMaterialMinScale);
          const materialMaxScale = Number(root.dataset.routeMaterialMaxScale);
          return {
            id,
            elementIdentity: identifyElement(root),
            state: root.dataset.routeMaterialState || '',
            reason: root.dataset.routeMaterialReason || '',
            minScale: round(Number.isFinite(liveAboutScale) ? liveAboutScale : materialMinScale),
            maxScale: round(Number.isFinite(liveAboutScale) ? liveAboutScale : materialMaxScale),
            progress: round(Number(root.dataset.routeMaterialProgress)),
            targetCount: Number(root.dataset.routeMaterialTargetCount || 0),
            ...(routeId === 'about' ? {
              canvasIdentity: identifyElement(root.querySelector('.about-narrative-world__canvas')),
              entranceState: root.dataset.aboutEntranceState || '',
              entranceScale: round(Number(root.dataset.aboutEntranceScale)),
              sceneReady: root.dataset.aboutSceneReady || '',
              worldState: root.dataset.pointWorldState || '',
              worldStage: root.dataset.worldStage || '',
              worldBootstrapGenerationMs: round(Number(root.dataset.worldBootstrapGenerationMs), 2),
            } : null),
          };
        }
        if (routeId === 'portfolio' && document.getElementById('portfolio-coming-soon-title')) {
          return {
            id: 'portfolio-production-placeholder',
            state: 'placeholder',
            available: false,
            targetCount: 0,
          };
        }
        if (routeId === 'about') {
          const aboutRoot = document.querySelector('[data-about-entrance-state]');
          if (aboutRoot) return {
            id: 'about-point-material',
            state: aboutRoot.dataset.aboutEntranceState || '',
            available: aboutRoot.dataset.aboutEntranceState !== 'fallback',
            minScale: round(Number(aboutRoot.dataset.aboutEntranceScale)),
            maxScale: round(Number(aboutRoot.dataset.aboutEntranceScale)),
            targetCount: 1,
          };
          if (document.getElementById('about-coming-soon-title')) return {
            id: 'about-production-placeholder',
            state: 'placeholder',
            available: false,
            targetCount: 0,
          };
          return null;
        }
        return null;
      }
      return null;
    };
    const readCardEntrance = (routeId) => {
      const definition = routeId === 'portfolio'
        ? {
          selector: '.playground-item[style*="--playground-route-card-scale"]',
          opacityOverride: '--playground-route-card-opacity',
          scale: '--playground-route-card-scale',
          travel: '--playground-route-card-y',
          tilt: '--playground-route-card-rotate',
          surface: '.playground-item__route-surface',
        }
        : null;
      if (!definition) return null;
      const values = Array.from(document.querySelectorAll(definition.selector)).map((element) => {
        const read = (property, fallback) => {
          const parsed = Number.parseFloat(element.style.getPropertyValue(property));
          return Number.isFinite(parsed) ? parsed : fallback;
        };
        const surface = element.querySelector(definition.surface);
        const surfaceStyle = surface ? getComputedStyle(surface) : null;
        const originValues = String(surfaceStyle?.transformOrigin || '')
          .split(/\s+/)
          .map((value) => Number.parseFloat(value));
        const originDelta = surface && originValues.length >= 2
          ? Math.max(
              Math.abs(originValues[0] - (surface.offsetWidth / 2)),
              Math.abs(originValues[1] - (surface.offsetHeight / 2)),
            )
          : Number.POSITIVE_INFINITY;
        return {
          hasOpacityOverride: element.style
            .getPropertyValue(definition.opacityOverride)
            .trim().length > 0,
          computedOpacity: Number.parseFloat(getComputedStyle(element).opacity || '1'),
          scale: read(definition.scale, 1),
          travel: Math.abs(read(definition.travel, 0)),
          tilt: Math.abs(read(definition.tilt, 0)),
          originDelta,
        };
      });
      if (!values.length) return null;
      return {
        targetCount: values.length,
        opacityOverrideCount: values.filter((value) => value.hasOpacityOverride).length,
        minComputedOpacity: round(Math.min(...values.map((value) => value.computedOpacity))),
        maxComputedOpacity: round(Math.max(...values.map((value) => value.computedOpacity))),
        minScale: round(Math.min(...values.map((value) => value.scale))),
        maxScale: round(Math.max(...values.map((value) => value.scale))),
        maxTravel: round(Math.max(...values.map((value) => value.travel)), 2),
        maxTilt: round(Math.max(...values.map((value) => value.tilt)), 3),
        maxOriginDelta: round(Math.max(...values.map((value) => value.originDelta)), 2),
      };
    };
    const sample = (now) => {
      const sampleStartedAt = performance.now();
      const root = document.documentElement;
      const loader = document.querySelector('[data-route-transition-loader]');
      const titlePlane = document.getElementById('simulation-title-canvas');
      const noise = document.querySelector('#scene-effects .noise');
      const noiseTexture = noise ? getComputedStyle(noise, '::before').backgroundImage : '';
      const spinner = loader?.querySelector('.route-transition-loader__spinner');
      const spinnerDots = Array.from(spinner?.querySelectorAll('.abs-loader-spinner__dot') || []);
      const routeTabs = document.querySelector('[data-route-tabs]');
      const currentTab = document.querySelector('[data-route-tab][aria-current="page"]');
      const buttonBar = document.querySelector('[data-button-bar]');
      const activeIndicator = buttonBar?.querySelector('.button-bar__active-pill');
      const visualTab = routeTabs?.querySelector(`[data-route-tab="${routeTabs?.dataset.activeRoute || ''}"]`);
      const activeIndicatorRect = activeIndicator?.getBoundingClientRect();
      const visualTabRect = visualTab?.getBoundingClientRect();
      const activeIndicatorStyle = activeIndicator ? getComputedStyle(activeIndicator) : null;
      let activeIndicatorTranslateX = 0;
      try {
        activeIndicatorTranslateX = activeIndicatorStyle?.transform === 'none'
          ? 0
          : new DOMMatrixReadOnly(activeIndicatorStyle?.transform).m41;
      } catch {
        activeIndicatorTranslateX = 0;
      }
      const shellRoute = document.querySelector('[data-shell-route-view]');
      const children = readChildren();
      const loaderState = readEffective(loader);
      const atmosphereSnapshot = window.__ABS_SIMULATION_ATMOSPHERE__?.getSnapshot?.() || null;
      state.samples.push({
        elapsedMs: round(now - state.startedAt, 2),
        path: location.pathname,
        phase: root.dataset.absTransitionPhase || 'idle',
        theme: root.dataset.absTheme || '',
        instrumentWake: root.dataset.absInstrumentWake || '',
        renderedRoute: shellRoute?.dataset.shellRouteView || currentTab?.getAttribute('data-route-tab') || '',
        committedRoute: currentTab?.getAttribute('data-route-tab') || '',
        pendingRoute: routeTabs?.dataset.pendingRoute || '',
        activeRouteVisual: routeTabs?.dataset.activeRoute || '',
        loader: loaderState ? {
          ...loaderState,
          state: loader?.dataset.routeTransitionLoaderState || '',
          presentation: loader?.dataset.routeTransitionLoaderPresentation
            || root.dataset.absRouteLoaderPresentation
            || 'plate',
          backdropMode: loader?.dataset.routeTransitionLoaderBackdrop
            || root.dataset.absRouteLoaderBackdrop
            || 'opaque',
          spinnerStartedAt: Number(loader?.dataset.routeTransitionSpinnerStartedAt || 0),
          backgroundColor: getComputedStyle(loader).backgroundColor,
          coveredForMs: root.dataset.absRouteLoadingCoveredAt
            ? round(Math.max(0, performance.now() - Number(root.dataset.absRouteLoadingCoveredAt)), 2)
            : 0,
        } : null,
        spinner: {
          ...readEffective(spinner),
          color: spinner ? getComputedStyle(spinner).color : '',
          dots: spinnerDots.map((dot) => {
            const style = getComputedStyle(dot);
            const rect = rectOf(dot);
            return {
              width: rect?.width || 0,
              height: rect?.height || 0,
              borderRadius: style.borderRadius,
              clipPath: style.clipPath,
              backgroundColor: style.backgroundColor,
            };
          }),
        },
        studioWindow: readEffective(document.getElementById('simulations')),
        studioWindowBackgroundColor: getComputedStyle(document.getElementById('simulations')).backgroundColor,
        backplane: {
          noise: readEffective(noise),
          noiseIdentity: identifyElement(noise),
          noiseTexture,
        },
        titlePlane: titlePlane ? {
          ...readEffective(titlePlane),
          ready: titlePlane.dataset.titlePlaneReady === 'true',
          sourceConnected: titlePlane.dataset.titlePlaneSourceConnected === 'true',
          retainedPixels: titlePlane.dataset.titlePlaneRetainedPixels === 'true',
          renderRevision: Number(titlePlane.dataset.titlePlaneRenderRevision || 0),
          presentation: titlePlane.dataset.titlePlanePresentation || '',
          presentationGeneration: Number(titlePlane.dataset.titlePlanePresentationGeneration || 0),
        } : null,
        buttonBar: buttonBar ? {
          ...readEffective(buttonBar),
          hitTests: (() => {
            const rect = buttonBar.getBoundingClientRect();
            const points = [
              ['overlap-band', rect.left + (rect.width / 2), rect.top + 4],
              ['center', rect.left + (rect.width / 2), rect.top + (rect.height / 2)],
              ['lower-band', rect.left + (rect.width / 2), rect.bottom - 4],
              ...[...buttonBar.querySelectorAll('[data-route-tab]')].map((tab) => {
                const tabRect = tab.getBoundingClientRect();
                return [
                  `route-${tab.getAttribute('data-route-tab') || 'unknown'}`,
                  tabRect.left + (tabRect.width / 2),
                  tabRect.top + (tabRect.height / 2),
                ];
              }),
            ];
            return points.filter(([, x, y]) => (
              x >= Math.max(0, rect.left)
              && x <= Math.min(innerWidth, rect.right)
              && y >= Math.max(0, rect.top)
              && y <= Math.min(innerHeight, rect.bottom)
            )).map(([name, x, y]) => {
              const target = document.elementFromPoint(x, y);
              return { name, hit: Boolean(target && buttonBar.contains(target)) };
            });
          })(),
          zIndex: getComputedStyle(buttonBar).zIndex,
        } : null,
        buttonBarWindowOverlapPx: Number.parseFloat(
          getComputedStyle(root).getPropertyValue('--button-bar-effective-window-overlap')
        ),
        buttonBarIndicator: activeIndicator ? {
          ...readEffective(activeIndicator),
          transform: activeIndicatorStyle?.transform || '',
          translateX: round(activeIndicatorTranslateX, 3),
          targetCenterDelta: activeIndicatorRect && visualTabRect
            ? round(
              (activeIndicatorRect.left + (activeIndicatorRect.width / 2))
              - (visualTabRect.left + (visualTabRect.width / 2)),
              3,
            )
            : null,
        } : null,
        surfaces: readSurfaces(),
        routeViews: readRouteViews(),
        children,
        incoming: {
          routeMaxOpacity: 0,
          childMaxOpacity: 0,
          childCount: 0,
          inertCount: 0,
          footerMaxOpacity: 0,
          controlMaxOpacity: 0,
        },
        readiness: readReadiness(target),
        busy: {
          studioWindow: document.getElementById('simulations')?.getAttribute('aria-busy') || '',
          ui: document.querySelector('[data-route-surface="ui"]')?.getAttribute('aria-busy') || '',
        },
        focus: readFocus(),
        materialEntrance: readMaterialSnapshot(target),
        materialExit: readMaterialSnapshot(source),
        cardEntrance: readCardEntrance(target),
        cardExit: readCardEntrance(source),
        atmosphere: atmosphereSnapshot ? {
          sourceId: atmosphereSnapshot.activeSourceId || '',
          sourceKind: atmosphereSnapshot.sourceKind || '',
          sourceGeneration: Number(atmosphereSnapshot.sourceGeneration || 0),
          outputSourceGeneration: Number(atmosphereSnapshot.outputSourceGeneration || 0),
          compositedFrameCount: Number(atmosphereSnapshot.compositedFrameCount || 0),
          schedulerActive: atmosphereSnapshot.schedulerActive === true,
          transitioning: atmosphereSnapshot.transitioning === true,
        } : null,
        portfolioPrewarm: window.__ABS_PORTFOLIO_PREWARM__
          ? { ...window.__ABS_PORTFOLIO_PREWARM__ }
          : null,
        portfolioBootstrap: window.__ABS_PORTFOLIO_BOOTSTRAP__
          ? {
              ...window.__ABS_PORTFOLIO_BOOTSTRAP__,
              stages: [...(window.__ABS_PORTFOLIO_BOOTSTRAP__.stages || [])],
            }
          : null,
        routeReadiness: window.__ABS_ROUTE_READINESS__
          ? JSON.parse(JSON.stringify(window.__ABS_ROUTE_READINESS__))
          : null,
        routeHistory: window.__ABS_ROUTE_HISTORY__
          ? { ...window.__ABS_ROUTE_HISTORY__ }
          : null,
      });
      const latest = state.samples.at(-1);
      latest.incoming.routeMaxOpacity = Math.max(
        0,
        ...Object.entries(latest.routeViews)
          .filter(([routeViewId]) => (
            routeViewId === target
            || (target === 'home' && dailyFocusRouteIds.includes(routeViewId))
          ))
          .map(([, routeView]) => routeView?.maxOpacity || 0),
      );
      const incomingChildren = children.filter((child) => (
        child.routeId === target
        || (target === 'home' && dailyFocusRouteIds.includes(child.routeId))
      ));
      latest.incoming.childCount = incomingChildren.length;
      latest.incoming.childMaxOpacity = round(Math.max(0, ...incomingChildren.map((child) => child.effectiveOpacity || 0)));
      latest.incoming.inertCount = incomingChildren.filter((child) => child.inert).length;
      latest.incoming.footerMaxOpacity = round(Math.max(
        0,
        ...incomingChildren.filter((child) => child.group === 'footer').map((child) => child.effectiveOpacity || 0),
      ));
      latest.incoming.controlMaxOpacity = round(Math.max(
        0,
        ...incomingChildren.filter((child) => child.group === 'control').map((child) => child.effectiveOpacity || 0),
      ));
      latest.auditSampleCostMs = round(performance.now() - sampleStartedAt, 3);
    };
    const onReady = (event) => state.readyEvents.push({
      elapsedMs: round(performance.now() - state.startedAt, 2),
      detail: event?.detail ? { ...event.detail } : null,
    });
    const onFailed = (event) => state.failureEvents.push({
      type: event.type,
      elapsedMs: round(performance.now() - state.startedAt, 2),
      detail: event?.detail ? { ...event.detail } : null,
    });
    const activeIndicator = document.querySelector('.button-bar__active-pill');
    const onIndicatorTransition = (event) => {
      if (event.target !== activeIndicator || event.propertyName !== 'transform') return;
      state.indicatorTransitions.push({
        type: event.type,
        elapsedMs: round(performance.now() - state.startedAt, 2),
        elapsedTimeMs: round(Number(event.elapsedTime || 0) * 1000, 2),
      });
    };
    const tick = (now) => {
      if (!state.running) return;
      sample(now);
      state.rafId = nativeRequestAnimationFrame(tick);
    };
    state.stop = () => {
      if (!state.running) return;
      state.running = false;
      nativeCancelAnimationFrame(state.rafId);
      window.removeEventListener('abs:route-ready', onReady);
      window.removeEventListener('abs:route-failed', onFailed);
      window.removeEventListener('abs:daily-focus-failed', onFailed);
      ['transitionrun', 'transitionend', 'transitioncancel'].forEach((type) => {
        activeIndicator?.removeEventListener(type, onIndicatorTransition);
      });
      longTaskObserver?.disconnect();
    };
    window.addEventListener('abs:route-ready', onReady);
    window.addEventListener('abs:route-failed', onFailed);
    window.addEventListener('abs:daily-focus-failed', onFailed);
    ['transitionrun', 'transitionend', 'transitioncancel'].forEach((type) => {
      activeIndicator?.addEventListener(type, onIndicatorTransition);
    });
    sample(performance.now());
    state.rafId = nativeRequestAnimationFrame(tick);
    window.__ABS_TRANSITION_FLOW_RECORDER__ = state;
  }, {
    fromRouteId,
    toRouteId,
    label,
    reducedMotion: REDUCED_MOTION,
    dailyFocusRouteIds: DAILY_FOCUS_ROUTE_IDS,
  });
}

async function stopRafRecorder(page) {
  return page.evaluate(() => {
    const state = window.__ABS_TRANSITION_FLOW_RECORDER__;
    if (!state) return null;
    state.stop?.();
    const samples = state.samples;
    const phaseDurationsMs = {};
    for (let index = 0; index < samples.length - 1; index += 1) {
      const phase = samples[index].phase || 'unknown';
      const duration = Math.max(0, samples[index + 1].elapsedMs - samples[index].elapsedMs);
      phaseDurationsMs[phase] = Math.round(((phaseDurationsMs[phase] || 0) + duration) * 100) / 100;
    }
    const frameIntervalsMs = samples.slice(1).map((sample, index) => (
      Math.max(0, sample.elapsedMs - samples[index].elapsedMs)
    ));
    const auditSampleCostsMs = samples.map((sample) => sample.auditSampleCostMs || 0);
    const firstMeaningfulDestination = samples.find((sample) => (
      sample.phase === 'route-in'
      && Math.max(sample.incoming?.routeMaxOpacity || 0, sample.incoming?.childMaxOpacity || 0) > 0.01
    ));
    const routeInSample = samples.find((sample) => sample.phase === 'route-in');
    const trace = {
      label: state.label,
      fromRouteId: state.fromRouteId,
      toRouteId: state.toRouteId,
      startedAt: state.startedAt,
      samples: state.samples,
      readyEvents: state.readyEvents,
      failureEvents: state.failureEvents,
      indicatorTransitions: state.indicatorTransitions,
      longTasks: state.longTasks,
      spinnerDelayMs: state.spinnerDelayMs,
      spinnerMinimumMs: state.spinnerMinimumMs,
      metrics: {
        phaseDurationsMs,
        totalDurationMs: samples.at(-1)?.elapsedMs || 0,
        loaderCoveredDurationMs: routeInSample?.loader?.coveredForMs || 0,
        firstReadinessEventMs: state.readyEvents[0]?.elapsedMs ?? null,
        firstMeaningfulDestinationMs: firstMeaningfulDestination?.elapsedMs ?? null,
        maximumFrameIntervalMs: frameIntervalsMs.length ? Math.max(...frameIntervalsMs) : 0,
        maximumAuditSampleCostMs: auditSampleCostsMs.length ? Math.max(...auditSampleCostsMs) : 0,
        totalAuditSampleCostMs: Math.round(auditSampleCostsMs.reduce((sum, value) => sum + value, 0) * 100) / 100,
        longTaskCount: state.longTasks.length,
        longTaskDurationMs: Math.round(state.longTasks.reduce((sum, entry) => sum + entry.durationMs, 0) * 100) / 100,
      },
    };
    delete window.__ABS_TRANSITION_FLOW_RECORDER__;
    return trace;
  });
}

function rectCoversWindow(loaderRect, windowRect) {
  if (!loaderRect || !windowRect) return false;
  return (
    Math.abs(loaderRect.left - windowRect.left) <= GEOMETRY_TOLERANCE_PX
    && Math.abs(loaderRect.top - windowRect.top) <= GEOMETRY_TOLERANCE_PX
    && Math.abs(loaderRect.right - windowRect.right) <= GEOMETRY_TOLERANCE_PX
    && Math.abs(loaderRect.bottom - windowRect.bottom) <= GEOMETRY_TOLERANCE_PX
  );
}

function assertTransitionTrace(trace, {
  requireRouteOut = true,
  allowIndicatorReversal = false,
} = {}) {
  assert(trace?.samples?.length > 2, `${trace?.label || 'transition'} did not record enough RAF samples`, trace);
  const samples = trace.samples;
  const phases = compress(samples.map((sample) => sample.phase));
  const routeOutIndex = samples.findIndex((sample) => sample.phase === 'route-out');
  const loadingIndex = samples.findIndex((sample) => sample.phase === 'route-loading');
  const routeInIndex = samples.findIndex((sample) => sample.phase === 'route-in');
  const finalIdleIndex = samples.findLastIndex((sample) => sample.phase === 'idle');
  const materialRoutes = new Set(['home', 'portfolio', 'about', 'contact']);
  const initialButtonBarRect = samples.find((sample) => sample.buttonBar?.rect)?.buttonBar?.rect;
  const expectedLoaderBackdropMode = resolveRouteLoaderBackdropMode(
    trace.fromRouteId,
    trace.toRouteId,
  );

  samples.forEach((sample, index) => {
    assert(
      sample.buttonBar?.effectiveOpacity >= FULL_COVER_OPACITY
        && sample.buttonBar?.visiblyStyled === true,
      `${trace.label}: Button Bar became visually hidden during the route transition`,
      traceExcerpt(trace, index),
    );
    assert(
      sample.buttonBar?.pointerEvents !== 'none'
        && sample.buttonBar?.inert === false
        && sample.buttonBar?.hitTests?.length >= 4
        && sample.buttonBar.hitTests.every(({ hit }) => hit),
      `${trace.label}: Button Bar became non-interactive during the route transition`,
      traceExcerpt(trace, index),
    );
    assert(
      sample.buttonBarIndicator?.effectiveOpacity >= FULL_COVER_OPACITY
        && sample.buttonBarIndicator?.pointerEvents === 'none',
      `${trace.label}: Button Bar active pill became hidden or interactive`,
      traceExcerpt(trace, index),
    );
    if (!initialButtonBarRect || !sample.buttonBar?.rect) return;
    for (const edge of ['left', 'top', 'right', 'bottom']) {
      assert(
        Math.abs(sample.buttonBar.rect[edge] - initialButtonBarRect[edge]) <= GEOMETRY_TOLERANCE_PX,
        `${trace.label}: Button Bar ${edge} moved during the route transition`,
        traceExcerpt(trace, index),
      );
    }
    assert(
      Number.isFinite(sample.buttonBarWindowOverlapPx)
        && Math.abs(
          (sample.studioWindow?.rect?.bottom - sample.buttonBar.rect.top)
          - sample.buttonBarWindowOverlapPx
        ) <= GEOMETRY_TOLERANCE_PX,
      `${trace.label}: Button Bar lost its configured studio-window overlap`,
      traceExcerpt(trace, index),
    );
  });

  if (requireRouteOut) {
    assert(routeOutIndex >= 0, `${trace.label}: route-out was not observed`, { phases });
    assert(routeOutIndex < loadingIndex, `${trace.label}: route-loading did not follow route-out`, { phases });
  }
  assert(loadingIndex >= 0, `${trace.label}: route-loading was not observed`, { phases });
  assert(routeInIndex > loadingIndex, `${trace.label}: route-in did not follow route-loading`, { phases });
  assert(finalIdleIndex > routeInIndex, `${trace.label}: idle did not follow route-in`, { phases });
  if (REQUESTED_THEME) {
    assert(
      samples.every((sample) => sample.theme === REQUESTED_THEME),
      `${trace.label}: requested ${REQUESTED_THEME} theme changed during the transition`,
      { sampledThemes: [...new Set(samples.map((sample) => sample.theme))] },
    );
  }
  if (BUTTON_BAR_ONLY) return;

  samples.forEach((sample, index) => {
    if (sample.phase !== 'route-out' && sample.phase !== 'route-loading') return;
    assert(
      sample.incoming.routeMaxOpacity <= VISIBILITY_EPSILON,
      `${trace.label}: incoming ${trace.toRouteId} route surface painted before route-in`,
      traceExcerpt(trace, index),
    );
    assert(
      sample.incoming.childMaxOpacity <= VISIBILITY_EPSILON,
      `${trace.label}: incoming ${trace.toRouteId} child content painted before route-in`,
      traceExcerpt(trace, index),
    );
    if (trace.toRouteId === 'home') {
      assert(
        sample.incoming.footerMaxOpacity <= VISIBILITY_EPSILON,
        `${trace.label}: Home footer/social content flashed before route-in`,
        traceExcerpt(trace, index),
      );
      assert(
        sample.incoming.controlMaxOpacity <= VISIBILITY_EPSILON,
        `${trace.label}: Home controls flashed before route-in`,
        traceExcerpt(trace, index),
      );
    }

    const outgoingVisible = getDestinationRouteMaxOpacity(
      sample.routeViews,
      trace.fromRouteId,
    ) > VISIBILITY_EPSILON;
    const loaderFullyCovering = Boolean(
      sample.loader
      && sample.loader.effectiveOpacity >= FULL_COVER_OPACITY
      && rectCoversWindow(sample.loader.rect, sample.studioWindow?.rect)
    );
    const opaqueLoaderCovers = loaderFullyCovering
      && sample.loader?.backdropMode === ROUTE_LOADER_BACKDROP_MODES.OPAQUE
      && sample.loader?.backgroundColor === sample.studioWindowBackgroundColor;
    const persistentBackplaneVisible = loaderFullyCovering
      && sample.loader?.backdropMode === ROUTE_LOADER_BACKDROP_MODES.PRESERVE
      && isTransparentBackground(sample.loader?.backgroundColor)
      && (sample.backplane?.noise?.effectiveOpacity || 0) > VISIBILITY_EPSILON;
    assert(
      outgoingVisible || opaqueLoaderCovers || persistentBackplaneVisible,
      `${trace.label}: neither outgoing content, an opaque loader, nor the persistent backplane protected a rendered frame`,
      traceExcerpt(trace, index),
    );
  });

  const fullyCoveredLoadingSamples = samples.filter((sample) => (
    sample.phase === 'route-loading'
    && sample.loader?.effectiveOpacity >= FULL_COVER_OPACITY
  ));
  assert(fullyCoveredLoadingSamples.length > 0, `${trace.label}: loader never reached full opacity`, { phases });
  fullyCoveredLoadingSamples.forEach((sample) => {
    assert(
      rectCoversWindow(sample.loader?.rect, sample.studioWindow?.rect),
      `${trace.label}: loader did not match the studio-window bounds`,
      sample,
    );
    assert(
      Number.isFinite(sample.buttonBarWindowOverlapPx)
        && Math.abs(
          (sample.studioWindow?.rect?.bottom - sample.buttonBar?.rect?.top)
          - sample.buttonBarWindowOverlapPx
        ) <= GEOMETRY_TOLERANCE_PX,
      `${trace.label}: Button Bar lost its configured studio-window overlap`,
      sample,
    );
    assert(
      sample.loader?.backdropMode === expectedLoaderBackdropMode,
      `${trace.label}: loader used the wrong backdrop policy`,
      { expectedLoaderBackdropMode, loader: sample.loader },
    );
    if (expectedLoaderBackdropMode === ROUTE_LOADER_BACKDROP_MODES.PRESERVE) {
      assert(
        isTransparentBackground(sample.loader?.backgroundColor),
        `${trace.label}: persistent-backplane loader repainted the studio background`,
        sample.loader,
      );
      assert(
        (sample.backplane?.noise?.effectiveOpacity || 0) > VISIBILITY_EPSILON,
        `${trace.label}: persistent grain was hidden during the transparent loader handoff`,
        sample.backplane,
      );
      assert(
        sample.backplane?.noiseIdentity > 0
          && sample.backplane?.noiseTexture?.startsWith('url('),
        `${trace.label}: persistent grain was not backed by its existing texture`,
        sample.backplane,
      );
      return;
    }
    assert(
      sample.loader?.backgroundColor === sample.studioWindowBackgroundColor,
      `${trace.label}: opaque loader plate did not match the studio-window theme`,
      sample.loader,
    );
  });

  if (expectedLoaderBackdropMode === ROUTE_LOADER_BACKDROP_MODES.PRESERVE) {
    const activeBackplaneSamples = samples.filter((sample) => (
      ['route-out', 'route-loading', 'route-in'].includes(sample.phase)
    ));
    const noiseIdentities = new Set(activeBackplaneSamples
      .map((sample) => sample.backplane?.noiseIdentity)
      .filter(Boolean));
    assert(activeBackplaneSamples.length > 0, `${trace.label}: no active handoff frames were sampled`, { phases });
    assert(
      activeBackplaneSamples.every((sample) => (
        sample.loader?.backdropMode === ROUTE_LOADER_BACKDROP_MODES.PRESERVE
      )),
      `${trace.label}: persistent-backplane mode changed during the route transaction`,
      { activeBackplaneSamples },
    );
    assert(
      noiseIdentities.size === 1,
      `${trace.label}: persistent grain remounted during the route transaction`,
      { noiseIdentities: [...noiseIdentities] },
    );
  }

  const indicatorSamples = samples.filter((sample) => Number.isFinite(sample.buttonBarIndicator?.rect?.left));
  const finalIndicator = indicatorSamples.at(-1)?.buttonBarIndicator;
  assert(
    finalIndicator && Math.abs(finalIndicator.targetCenterDelta) <= 0.5,
    `${trace.label}: active indicator did not finish within 0.5px of the destination tab centre`,
    finalIndicator,
  );
  if (trace.fromRouteId !== trace.toRouteId) {
    const positions = indicatorSamples.map((sample) => sample.buttonBarIndicator.rect.left);
    const uniquePositions = [...new Set(positions.map((value) => Math.round(value * 10) / 10))];
    if (REDUCED_MOTION) {
      assert(uniquePositions.length <= 2, `${trace.label}: reduced motion retained indicator travel`, { uniquePositions });
    } else {
      const compositorTransitionCompleted = (
        trace.indicatorTransitions?.some((event) => event.type === 'transitionrun')
        && trace.indicatorTransitions?.some((event) => (
          event.type === 'transitionend' && event.elapsedTimeMs >= 250
        ))
      );
      assert(
        uniquePositions.length >= 3 || compositorTransitionCompleted,
        `${trace.label}: indicator produced no sampled or compositor-confirmed motion sequence`,
        { uniquePositions, indicatorTransitions: trace.indicatorTransitions },
      );
      const direction = Math.sign(positions.at(-1) - positions[0]);
      if (direction) {
        const signedDeltas = positions.slice(1).map((position, index) => (
          (position - positions[index]) * direction
        ));
        if (allowIndicatorReversal) {
          assert(
            signedDeltas.some((delta) => delta > 1)
              && signedDeltas.some((delta) => delta < -1),
            `${trace.label}: retargeted indicator did not preserve its expected reversal`,
            { positions, signedDeltas },
          );
        } else {
          signedDeltas.forEach((signedDelta, index) => {
            assert(signedDelta >= -1, `${trace.label}: indicator travel was not monotonic`, {
              index: index + 1,
              previous: positions[index],
              current: positions[index + 1],
            });
          });
        }
      }
      if (uniquePositions.length >= 3) {
        assert(
          Math.abs(positions.at(-1) - positions.at(-2)) <= 1,
          `${trace.label}: indicator snapped by more than 1px at settlement`,
          { finalPositions: positions.slice(-3) },
        );
      }
    }
  }
  const loadingStart = samples[loadingIndex]?.elapsedMs || 0;
  const routeInStart = samples[routeInIndex]?.elapsedMs || 0;
  if (requireRouteOut && !REDUCED_MOTION && CPU_THROTTLE_RATE === 1) {
    const routeOutStart = samples[routeOutIndex]?.elapsedMs || 0;
    assert(
      loadingStart - routeOutStart <= 500 + FRAME_TOLERANCE_MS,
      `${trace.label}: outgoing motion exceeded its quick-exit budget`,
      {
        routeOutDurationMs: loadingStart - routeOutStart,
        frameToleranceMs: FRAME_TOLERANCE_MS,
      },
    );
  }

  if (requireRouteOut && materialRoutes.has(trace.fromRouteId)) {
    const observedExitSamples = samples
      .slice(routeOutIndex, loadingIndex + 1)
      .map((sample) => ({ elapsedMs: sample.elapsedMs, phase: sample.phase, ...sample.materialExit }));
    const exitUnavailable = observedExitSamples.some((sample) => sample.available === false);
    const materialExitSamples = observedExitSamples.filter((sample) => (
      sample.available !== false
      && sample.targetCount > 0
      && Number.isFinite(sample.minScale)
      && Number.isFinite(sample.maxScale)
    ));
    if (exitUnavailable) {
      assert(
        observedExitSamples.some((sample) => (
          sample.state === 'placeholder'
          || (trace.fromRouteId === 'about' && sample.state === 'fallback')
        )),
        `${trace.label}: unavailable route material lost its explicit fallback state`,
        { observedExitSamples },
      );
    } else {
      assert(
        materialExitSamples.length > 0,
        `${trace.label}: ${trace.fromRouteId} material exit was not observable`,
        { observedExitSamples },
      );
      const usesPersistentAboutExit = trace.fromRouteId === 'about'
        && materialExitSamples.some((sample) => sample.persistent === true);
      if (usesPersistentAboutExit) {
        const lastPersistentSample = materialExitSamples.at(-1);
        assert(
          materialExitSamples.every((sample) => sample.minScale >= 0.98 && sample.maxScale >= 0.98)
            && lastPersistentSample.pointFamilies.includes('field'),
          `${trace.label}: simplified About field changed scale during route exit`,
          { materialExitSamples },
        );
      } else if (!REDUCED_MOTION) {
        const highestScale = Math.max(...materialExitSamples.map((sample) => sample.maxScale));
        const lowestScale = Math.min(...materialExitSamples.map((sample) => sample.maxScale));
        const progressiveSamples = materialExitSamples.filter((sample) => (
          (sample.minScale > 0.02 && sample.minScale < 0.98)
          || (sample.maxScale > 0.02 && sample.maxScale < 0.98)
        ));
        assert(
          highestScale >= 0.95 && lowestScale <= 0.02,
          `${trace.label}: ${trace.fromRouteId} material did not shrink from full size to zero`,
          { highestScale, lowestScale, materialExitSamples },
        );
        assert(
          progressiveSamples.length > 0,
          `${trace.label}: ${trace.fromRouteId} material popped out instead of shrinking`,
          { materialExitSamples },
        );
      }
    }
  }

  const spinnerSamples = samples.filter((sample) => (
    (sample.phase === 'route-loading' || sample.phase === 'route-in')
    && sample.loader?.effectiveOpacity >= FULL_COVER_OPACITY
    && sample.loader?.presentation === 'spinner'
  ));
  const visiblyEstablishedSpinner = spinnerSamples.some((sample) => sample.spinner?.effectiveOpacity > 0.5);
  const loadingDurationMs = Math.max(0, routeInStart - loadingStart);
  const spinnerExpected = READINESS_DELAY_MS > SPINNER_DELAY_MS;
  const mountsRouteBackedHomeSurface = trace.toRouteId === 'home'
    && trace.readyEvents.some((event) => event.detail?.routeId === ROUTE_BACKED_HOME_ID);
  // A clean Home URL may still own a route-backed Daily surface. Its readiness
  // now requires a real renderer frame and atmosphere composite, so it is not
  // the static warm-Home case for which a spinner would be unnecessary.
  const readinessCompletesBeforeSpinnerDelay = loadingDurationMs
    < Math.max(0, trace.spinnerDelayMs - FRAME_TOLERANCE_MS);
  const spinnerForbidden = !mountsRouteBackedHomeSurface
    && readinessCompletesBeforeSpinnerDelay
    && (READINESS_DELAY_MS > 0
      ? READINESS_DELAY_MS <= SPINNER_DELAY_MS
      : (!STRESS_MODE && CPU_THROTTLE_RATE === 1));
  if (spinnerExpected && (!REDUCED_MOTION || loadingDurationMs >= REDUCED_SPINNER_ESTABLISHMENT_MS)) {
    assert(
      visiblyEstablishedSpinner,
      `${trace.label}: sustained readiness did not escalate to the spinner`,
      { phases, loadingDurationMs, reducedMotion: REDUCED_MOTION },
    );
  }
  if (spinnerForbidden) {
    assert(
      spinnerSamples.length === 0,
      `${trace.label}: warm readiness showed an unnecessary SPA spinner`,
      { phases, loadingDurationMs, readinessDelayMs: READINESS_DELAY_MS },
    );
  }
  if (spinnerSamples.length > 0) {
    const firstSpinner = spinnerSamples[0];
    const firstEstablishedSpinnerIndex = samples.findIndex((sample) => (
      sample.loader?.presentation === 'spinner'
      && sample.spinner?.effectiveOpacity > 0.5
    ));
    const firstDisappearingSpinner = firstEstablishedSpinnerIndex >= 0
      ? samples.slice(firstEstablishedSpinnerIndex + 1).find((sample) => (
          sample.loader?.presentation !== 'spinner'
          || sample.spinner?.effectiveOpacity <= 0.5
        ))
      : null;
    const visibleUntilElapsedMs = firstDisappearingSpinner?.elapsedMs
      ?? samples.at(-1)?.elapsedMs
      ?? routeInStart;
    const spinnerVisibleForMs = firstSpinner.loader?.spinnerStartedAt > 0
      ? Math.max(0, (trace.startedAt + visibleUntilElapsedMs) - firstSpinner.loader.spinnerStartedAt)
      : Math.max(0, visibleUntilElapsedMs - firstSpinner.elapsedMs);
    if (!REDUCED_MOTION) {
      assert(
        spinnerVisibleForMs >= SPINNER_MINIMUM_MS - FRAME_TOLERANCE_MS,
        `${trace.label}: spinner disappeared before its minimum presence`,
        { spinnerVisibleForMs, configuredMinimumMs: trace.spinnerMinimumMs },
      );
    }
    assert(firstSpinner.spinner?.dots?.length === 8, `${trace.label}: spinner does not have eight dots`, firstSpinner.spinner);
    firstSpinner.spinner.dots.forEach((dot, index) => {
      assert(Math.abs(dot.width - dot.height) <= 0.05, `${trace.label}: spinner dot ${index + 1} is not square`, dot);
      assert(dot.borderRadius === '50%', `${trace.label}: spinner dot ${index + 1} lost circular radius`, dot);
      assert(dot.clipPath.includes('circle(50%'), `${trace.label}: spinner dot ${index + 1} lost circular clipping`, dot);
      assert(dot.backgroundColor === firstSpinner.spinner.color, `${trace.label}: spinner dot ${index + 1} did not inherit theme ink`, dot);
    });
  }

  const firstRouteIn = samples[routeInIndex];
  assert(
    firstRouteIn.readiness?.ready === true,
    `${trace.label}: route-in began before ${trace.toRouteId} readiness`,
    traceExcerpt(trace, routeInIndex),
  );
  assert(
    samples.some((sample) => sample.pendingRoute === trace.toRouteId),
    `${trace.label}: pending-route diagnostic never identified the destination`,
    { phases },
  );
  if (!REDUCED_MOTION) {
    assert(
      firstRouteIn.incoming.childMaxOpacity <= VISIBILITY_EPSILON,
      `${trace.label}: typography was visible on the first destination frame`,
      traceExcerpt(trace, routeInIndex),
    );
  }

  if (trace.toRouteId === 'home') {
    const committedHomeLoadingSamples = samples.filter((sample) => (
      sample.phase === 'route-loading'
      && isRouteViewForDestination(sample.renderedRoute, 'home')
    ));
    assert(
      committedHomeLoadingSamples.length > 0,
      `${trace.label}: incoming Home title was not sampled behind the loading boundary`,
      { phases },
    );
    committedHomeLoadingSamples.forEach((sample) => {
      assert(
        (sample.titlePlane?.effectiveOpacity || 0) <= VISIBILITY_EPSILON,
        `${trace.label}: retained Home title pixels became paintable during route-loading`,
        sample.titlePlane,
      );
      assert(
        sample.titlePlane?.presentation === 'covered',
        `${trace.label}: incoming Home title lost its generation-scoped presentation gate`,
        sample.titlePlane,
      );
    });
    if (!REDUCED_MOTION) {
      assert(
        firstRouteIn.titlePlane?.sourceConnected === true
          && firstRouteIn.titlePlane?.ready === false,
        `${trace.label}: Home route-in began before the staged blank title frame`,
        firstRouteIn.titlePlane,
      );
    }
    assert(
      firstRouteIn.titlePlane?.presentation === '',
      `${trace.label}: Home title presentation gate remained after route-in began`,
      firstRouteIn.titlePlane,
    );
  }

  if (materialRoutes.has(trace.toRouteId)) {
    const observedMaterialSamples = samples
      .slice(routeInIndex, finalIdleIndex + 1)
      .map((sample) => ({ elapsedMs: sample.elapsedMs, phase: sample.phase, ...sample.materialEntrance }));
    const materialUnavailable = observedMaterialSamples.some((sample) => sample.available === false);
    const materialSamples = observedMaterialSamples
      .filter((sample) => (
        sample.available !== false
        && sample.targetCount > 0
        && Number.isFinite(sample.minScale)
        && Number.isFinite(sample.maxScale)
      ));
    if (materialUnavailable) {
      const unavailableState = observedMaterialSamples.at(-1)?.state;
      assert(
        unavailableState === 'placeholder'
          || (trace.toRouteId === 'about' && unavailableState === 'fallback'),
        `${trace.label}: unavailable route material did not settle explicitly`,
        { observedMaterialSamples },
      );
    } else {
      assert(
        materialSamples.length > 1,
        `${trace.label}: ${trace.toRouteId} material entrance was not observable`,
        { phases, materialSamples },
      );
      const settledMaterial = materialSamples.at(-1);
      assert(
        settledMaterial.minScale >= 0.98 && settledMaterial.maxScale >= 0.98,
        `${trace.label}: ${trace.toRouteId} material did not settle at full size`,
        { settledMaterial, materialSamples },
      );
      const usesPersistentAboutMaterial = trace.toRouteId === 'about'
        && materialSamples.some((sample) => sample.persistent === true);
      if (usesPersistentAboutMaterial) {
        assert(
          settledMaterial.sceneReady === 'true'
            && settledMaterial.worldState === 'ready'
            && settledMaterial.pointFamilies.includes('field'),
          `${trace.label}: simplified About material did not settle as a painted persistent field`,
          { settledMaterial, materialSamples },
        );
      } else if (!REDUCED_MOTION) {
        const firstMaterial = materialSamples[0];
        const lowestScale = Math.min(...materialSamples.map((sample) => sample.minScale));
        const progressiveSamples = materialSamples.filter((sample) => (
          sample.maxScale > lowestScale + 0.02
          && sample.maxScale < 0.98
        ));
        assert(
          firstMaterial.maxScale <= 0.02 && lowestScale <= 0.02,
          `${trace.label}: ${trace.toRouteId} material was not blank on its first frame`,
          { firstMaterial, lowestScale, materialSamples },
        );
        assert(
          progressiveSamples.length > 0,
          `${trace.label}: ${trace.toRouteId} material popped instead of growing`,
          { lowestScale, materialSamples },
        );
        const firstMaterialGrowth = materialSamples.find((sample) => sample.maxScale > 0.02);
        const firstTypography = samples
          .slice(routeInIndex, finalIdleIndex + 1)
          .find((sample) => sample.incoming.childMaxOpacity > 0.02);
        assert(
          firstMaterialGrowth && firstTypography
            && firstMaterialGrowth.elapsedMs <= firstTypography.elapsedMs,
          `${trace.label}: typography began before the material field`,
          { firstMaterialGrowth, firstTypography },
        );
      }
    }
  }

  const destinationUsesProductionFallback = samples.some((sample) => (
    sample.readiness?.productionFallback === true
  ));
  if (
    !REDUCED_MOTION
    && !destinationUsesProductionFallback
    && trace.toRouteId === 'portfolio'
  ) {
    const cardSamples = samples
      .slice(routeInIndex, finalIdleIndex + 1)
      .map((sample) => ({ elapsedMs: sample.elapsedMs, ...sample.cardEntrance }))
      .filter((sample) => sample.targetCount > 0);
    assert(cardSamples.length > 1, `${trace.label}: card entrance was not observable`, { cardSamples });
    const firstCards = cardSamples[0];
    const settledCards = cardSamples.at(-1);
    const progressiveCards = cardSamples.filter((sample) => (
      sample.maxScale > 0.02
      && sample.minScale < 0.98
      && (sample.maxTravel > 0.5 || sample.maxTilt > 0.05)
    ));
    assert(
      cardSamples.every((sample) => sample.opacityOverrideCount === 0),
      `${trace.label}: cards used a route-owned opacity fade`,
      { firstCards, cardSamples },
    );
    assert(
      cardSamples.every((sample) => sample.minComputedOpacity >= 0.98),
      `${trace.label}: Work cards faded through computed opacity`,
      { cardSamples },
    );
    assert(
      firstCards.minScale <= 0.003 && firstCards.maxScale <= 0.003,
      `${trace.label}: cards did not start at scale zero`,
      { firstCards, cardSamples },
    );
    assert(
      cardSamples.every((sample) => sample.maxOriginDelta <= 1.5),
      `${trace.label}: cards did not grow from their centre`,
      { cardSamples },
    );
    assert(
      progressiveCards.length > 0,
      `${trace.label}: cards popped instead of using the shared lift and tilt`,
      { cardSamples },
    );
    assert(
      settledCards.minScale >= 0.995,
      `${trace.label}: cards did not settle cleanly`,
      { settledCards, cardSamples },
    );
  }

  if (!REDUCED_MOTION && trace.toRouteId === 'about') {
    const routeInSamples = samples.slice(routeInIndex, finalIdleIndex + 1);
    const ambientSamples = routeInSamples.filter((sample) => (
      sample.phase === 'route-in'
      && sample.atmosphere?.sourceId === 'about:ambient'
      && sample.atmosphere?.sourceKind === 'ambient'
    ));
    if (ambientSamples.length > 0) {
      assert(
        ambientSamples.at(-1).atmosphere.schedulerActive === false,
        `${trace.label}: About clear fallback retained an atmosphere loop`,
        { ambientSamples },
      );
    }
  }

  const settled = samples.at(-1);
  assert(settled.phase === 'idle', `${trace.label}: transition did not settle to idle`, settled);
  assert(
    isRouteViewForDestination(settled.renderedRoute, trace.toRouteId),
    `${trace.label}: rendered route did not settle to destination`,
    settled,
  );
  assert(settled.committedRoute === trace.toRouteId, `${trace.label}: aria-current route did not settle to destination`, settled);
  assert(settled.pendingRoute === '', `${trace.label}: pending route remained after settlement`, settled);
  assert(settled.loader?.state === 'idle', `${trace.label}: loader state did not settle to idle`, settled.loader);
  assert((settled.loader?.effectiveOpacity || 0) <= VISIBILITY_EPSILON, `${trace.label}: loader remained visible at idle`, settled.loader);
  assert(settled.busy.studioWindow === 'false' && settled.busy.ui === 'false', `${trace.label}: shell remained aria-busy`, settled.busy);
  assert(settled.incoming.inertCount === 0, `${trace.label}: destination entrance targets remained inert`, settled.incoming);
  assert(settled.focus?.inert !== true, `${trace.label}: focus remained inside inert content`, settled.focus);
  if (trace.toRouteId === 'home') {
    assert(
      settled.titlePlane?.ready === true
        && settled.titlePlane?.sourceConnected === true
        && (settled.titlePlane?.effectiveOpacity || 0) > VISIBILITY_EPSILON,
      `${trace.label}: Home title did not settle visibly after its staged entrance`,
      settled.titlePlane,
    );
  }
  assert(settled.routeHistory?.provisional !== true, `${trace.label}: provisional history survived settlement`, settled.routeHistory);
  const settledRoutes = Object.keys(settled.routeViews);
  assert(
    settledRoutes.length === 1 && isRouteViewForDestination(settledRoutes[0], trace.toRouteId),
    `${trace.label}: stale route-view roots remained after settlement`,
    { settledRoutes, routeViews: settled.routeViews },
  );
}

async function waitForTargetSettled(page, step) {
  await page.waitForSelector(step.ready, { timeout: WAIT_MS, state: 'attached' });
  await page.waitForFunction(({ routeId, pathname, dailyFocusRouteIds, routeViewAliases }) => {
    const root = document.documentElement;
    const loader = document.querySelector('[data-route-transition-loader]');
    const loaderStyle = loader ? getComputedStyle(loader) : null;
    const loaderHidden = !loader
      || loaderStyle.visibility === 'hidden'
      || Number.parseFloat(loaderStyle.opacity || '1') < 0.02;
    const committedRoute = document.querySelector('[data-route-tab][aria-current="page"]')?.getAttribute('data-route-tab') || '';
    const renderedRoute = document.querySelector('[data-shell-route-view]')?.dataset.shellRouteView || committedRoute;
    const pendingRoute = document.querySelector('[data-route-tabs]')?.dataset.pendingRoute || '';
    const renderedDestination = renderedRoute === routeId
      || (routeViewAliases[routeId] || []).includes(renderedRoute)
      || (routeId === 'home' && dailyFocusRouteIds.includes(renderedRoute));
    return (
      (root.dataset.absTransitionPhase || 'idle') === 'idle'
      && renderedDestination
      && committedRoute === routeId
      && pendingRoute === ''
      && location.pathname === pathname
      && loader?.dataset.routeTransitionLoaderState === 'idle'
      && loaderHidden
    );
  }, {
    routeId: step.id,
    pathname: step.href,
    dailyFocusRouteIds: DAILY_FOCUS_ROUTE_IDS,
    routeViewAliases: ROUTE_VIEW_ALIASES,
  }, { timeout: WAIT_MS, polling: 'raf' });

  if (step.id === 'portfolio') {
    await page.waitForFunction(() => {
      if (document.getElementById('portfolio-coming-soon-title')) return true;
      const route = document.querySelector('[data-work-experience="true"]');
      return route?.dataset.playgroundReady === 'true'
        && route.dataset.playgroundInteractive === 'true';
    }, null, { timeout: WAIT_MS, polling: 'raf' });
  }
}

async function clickRouteTab(page, routeId) {
  await page.locator(`[data-route-tab="${routeId}"]`).click({ timeout: WAIT_MS });
}

async function waitForTransitionObserved(page) {
  await page.waitForFunction(() => {
    const phase = document.documentElement.dataset.absTransitionPhase || 'idle';
    const recorder = window.__ABS_TRANSITION_FLOW_RECORDER__;
    return phase !== 'idle'
      || recorder?.samples?.some((sample) => sample.phase !== 'idle');
  }, null, { timeout: WAIT_MS, polling: 'raf' });
}

async function runTransition(page, {
  fromRouteId,
  step,
  label,
  activate,
  requireRouteOut = true,
  allowIndicatorReversal = false,
  afterActivate,
}) {
  await startRafRecorder(page, { fromRouteId, toRouteId: step.id, label });
  let trace = null;
  try {
    await activate();
    // A destination can commit in the same task that schedules the shell phase.
    // Do not let the settled-state waiter accept that narrow idle gap and stop
    // the RAF recorder while the visible transition is only just beginning.
    await waitForTransitionObserved(page);
    await afterActivate?.();
    await waitForTargetSettled(page, step);
    trace = await stopRafRecorder(page);
    assertTransitionTrace(trace, { requireRouteOut, allowIndicatorReversal });
    return trace;
  } catch (error) {
    trace ||= await stopRafRecorder(page).catch(() => null);
    if (trace) error.transitionTrace = trace;
    throw error;
  }
}

function createDelayedPortfolioDependency(page) {
  return {
    async install() {
      await page.evaluate(() => {
        window.__ABS_DELAYED_PRELOAD_REQUESTED__ = false;
        window.__ABS_RELEASE_DELAYED_PRELOAD__ = null;
      });
    },
    async activate() {
      await page.evaluate(() => {
        window.__ABS_SPA_NAVIGATE__?.('/portfolio.html', {
          activation: 'pointer',
          preloadRouteModule: () => {
            window.__ABS_DELAYED_PRELOAD_REQUESTED__ = true;
            return new Promise((resolve) => {
              window.__ABS_RELEASE_DELAYED_PRELOAD__ = resolve;
            });
          },
        });
      });
    },
    async waitUntilRequested() {
      await page.waitForFunction(
        () => window.__ABS_DELAYED_PRELOAD_REQUESTED__ === true,
        null,
        { timeout: WAIT_MS, polling: 'raf' },
      );
    },
    async release() {
      await page.evaluate(() => window.__ABS_RELEASE_DELAYED_PRELOAD__?.());
    },
    async dispose() {
      await page.evaluate(() => {
        window.__ABS_RELEASE_DELAYED_PRELOAD__?.();
        delete window.__ABS_DELAYED_PRELOAD_REQUESTED__;
        delete window.__ABS_RELEASE_DELAYED_PRELOAD__;
      }).catch(() => undefined);
    },
  };
}

async function runStressProbe(page, traces, nextIndex) {
  const contactStep = { id: 'contact', href: '/contact.html', ready: '[data-route-content="contact"]' };
  const aboutStep = { id: 'about', href: '/about.html', ready: '[data-route-content="about"]' };
  const homeStep = { id: 'home', href: '/index.html', ready: '#c, #simulation-stage' };

  const retargetTrace = await runTransition(page, {
    fromRouteId: 'home',
    step: aboutStep,
    label: `${String(nextIndex).padStart(2, '0')}-stress-home-to-contact-to-about`,
    allowIndicatorReversal: true,
    activate: async () => {
      await clickRouteTab(page, contactStep.id);
      await page.waitForFunction(() => (
        (document.documentElement.dataset.absTransitionPhase || 'idle') === 'route-out'
      ), null, { timeout: WAIT_MS, polling: 'raf' });
      await clickRouteTab(page, aboutStep.id);
    },
  });
  traces.push(retargetTrace);

  const backTrace = await runTransition(page, {
    fromRouteId: 'about',
    step: homeStep,
    label: `${String(nextIndex + 1).padStart(2, '0')}-stress-about-back-home`,
    requireRouteOut: false,
    activate: async () => {
      await page.goBack({ waitUntil: 'commit', timeout: WAIT_MS }).catch(() => undefined);
    },
  });
  traces.push(backTrace);
}

async function runPreloadFailureProbe(page, traces, nextIndex) {
  const portfolioStep = ROUTE_DEFINITIONS.portfolio;
  const renderedRoute = await page.locator('[data-shell-route-view]').getAttribute('data-shell-route-view');
  if (renderedRoute !== 'portfolio') {
    traces.push(await runTransition(page, {
      fromRouteId: renderedRoute || 'home',
      step: portfolioStep,
      label: `${String(nextIndex).padStart(2, '0')}-preload-failure-setup`,
      activate: () => clickRouteTab(page, portfolioStep.id),
    }));
  }

  const label = `${String(nextIndex + 1).padStart(2, '0')}-work-preload-failure-restore`;
  await startRafRecorder(page, {
    fromRouteId: 'portfolio',
    toRouteId: 'home',
    label,
  });
  await page.evaluate(() => {
    window.__ABS_SPA_NAVIGATE__?.('/index.html', {
      activation: 'pointer',
      preloadRouteModule: () => Promise.reject(new Error('audit-preload-rejection')),
    });
  });
  await page.waitForFunction(() => {
    const phase = document.documentElement.dataset.absTransitionPhase || 'idle';
    const rendered = document.querySelector('[data-shell-route-view]')?.dataset.shellRouteView || '';
    const loaderState = document.querySelector('[data-route-transition-loader]')
      ?.getAttribute('data-route-transition-loader-state') || '';
    const route = document.querySelector('[data-work-experience="true"]');
    return (
      phase === 'idle'
      && loaderState === 'idle'
      && rendered === 'portfolio'
      && location.pathname.endsWith('/portfolio.html')
      && route?.dataset.playgroundReady === 'true'
      && route?.dataset.playgroundInteractive === 'true'
      && route?.inert === false
      && !route?.hasAttribute('aria-busy')
    );
  }, null, { timeout: WAIT_MS, polling: 'raf' });

  const trace = await stopRafRecorder(page);
  trace.preloadFailureRecovery = true;
  const phases = compress(trace.samples.map((sample) => sample.phase));
  ['route-out', 'route-loading', 'route-in', 'idle'].forEach((phase) => {
    assert(phases.includes(phase), `${label}: missing ${phase}`, { phases });
  });
  const loadingSamples = trace.samples.filter((sample) => sample.phase === 'route-loading');
  assert(loadingSamples.length > 0, `${label}: loader phase was not sampled`, { phases });
  loadingSamples.forEach((sample) => {
    assert(
      sample.loader?.effectiveOpacity >= FULL_COVER_OPACITY,
      `${label}: preload failure recovery exposed content before the loader covered it`,
      sample,
    );
  });
  const settled = trace.samples.at(-1);
  assert(settled.renderedRoute === 'portfolio', `${label}: outgoing Portfolio route was not retained`, settled);
  assert(settled.committedRoute === 'portfolio', `${label}: committed route changed after preload rejection`, settled);
  assert(settled.loader?.state === 'idle', `${label}: loader did not settle`, settled.loader);
  traces.push(trace);
}

async function main() {
  await mkdir(outputRoot, { recursive: true });
  const simulationCatalog = JSON.parse(await readFile(simulationCatalogPath, 'utf8'));
  const dailySimulations = simulationCatalog.simulations.filter((entry) => entry.stage === 'daily-rotation');
  const browserType = BROWSERS[BROWSER_NAME] || chromium;
  const browser = await browserType.launch({ headless: !HEADED });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    reducedMotion: REDUCED_MOTION ? 'reduce' : 'no-preference',
  });
  const page = await context.newPage();
  if (CPU_THROTTLE_RATE > 1) {
    assert(BROWSER_NAME === 'chromium', 'CPU throttling is supported only by the Chromium audit profile.');
    const client = await context.newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: CPU_THROTTLE_RATE });
  }
  const consoleErrors = [];
  const pageErrors = [];
  const httpErrors = [];
  const traces = [];
  let activeLabel = 'initial';
  let delayedDependency = null;
  let failure = null;

  page.on('console', (message) => {
    const text = message.text();
    if (message.type() === 'error' && !text.includes('empty string for a boolean attribute')) {
      consoleErrors.push(text);
    }
  });
  page.on('pageerror', (error) => {
    pageErrors.push(String(error?.stack || error));
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    httpErrors.push({
      status: response.status(),
      url: response.url(),
      activeLabel,
    });
  });

  try {
    await page.addInitScript(({ readinessDelayMs, requestedTheme }) => {
      // Legacy route runtimes temporarily scope requestAnimationFrame so they can
      // clean up their own loops. Keep the audit recorder outside that scope or
      // a route unmount can cancel the very observer intended to inspect it.
      window.__ABS_AUDIT_NATIVE_RAF__ = window.requestAnimationFrame.bind(window);
      window.__ABS_AUDIT_NATIVE_CANCEL_RAF__ = window.cancelAnimationFrame.bind(window);
      window.__ABS_AUDIT_ROUTE_READINESS_DELAY_MS__ = readinessDelayMs;
      if (requestedTheme) {
        localStorage.setItem('theme-preference-v3', requestedTheme);
      }
    }, { readinessDelayMs: READINESS_DELAY_MS, requestedTheme: REQUESTED_THEME });
    await page.goto(routeUrl('/index.html?mode=pit&absAudit=1'), {
      waitUntil: 'domcontentloaded',
      timeout: 60000,
    });
    await waitForInitialHome(page);

    if (ROUTE_BACKED_HOME_ID) {
      assert(
        DAILY_FOCUS_ROUTE_IDS.includes(ROUTE_BACKED_HOME_ID),
        `Unknown ABS_TRANSITION_ROUTE_BACKED_HOME "${ROUTE_BACKED_HOME_ID}"`,
      );
      await advanceSimulationSwitcherTo(page, dailySimulations, ROUTE_BACKED_HOME_ID, WAIT_MS);
      await page.waitForFunction((simulationId) => {
        const root = document.documentElement;
        const stage = document.getElementById('simulation-stage');
        return (
          (root.dataset.absTransitionPhase || 'idle') === 'idle'
          && (root.dataset.absSimulationFocusTransition || 'idle') === 'idle'
          && root.dataset.absDailyFocusStatus === 'ready'
          && stage?.dataset.simulationId === simulationId
        );
      }, ROUTE_BACKED_HOME_ID, { timeout: WAIT_MS, polling: 'raf' });
    }

    let currentRouteId = 'home';
    for (let index = 0; index < ROUTE_STEPS.length; index += 1) {
      const step = ROUTE_STEPS[index];
      activeLabel = `${String(index + 1).padStart(2, '0')}-${currentRouteId}-to-${step.id}`;
      let afterActivate;
      let activate = () => clickRouteTab(page, step.id);

      if (DELAYED_READINESS_MODE && index === 0) {
        delayedDependency = createDelayedPortfolioDependency(page);
        await delayedDependency.install();
        activate = () => delayedDependency.activate();
        afterActivate = async () => {
          await delayedDependency.waitUntilRequested();
          await page.waitForTimeout(180);
          const heldState = await page.evaluate(() => {
            const phase = document.documentElement.dataset.absTransitionPhase || 'idle';
            const source = document.querySelector('[data-route-view="home"]');
            const loader = document.querySelector('[data-route-transition-loader]');
            const studioWindow = document.getElementById('simulations');
            const noise = document.querySelector('#scene-effects .noise');
            let opacity = 1;
            let visible = Boolean(source);
            for (let current = source; current; current = current.parentElement) {
              const styles = getComputedStyle(current);
              opacity *= Number.parseFloat(styles.opacity || '1') || 0;
              if (styles.display === 'none' || styles.visibility === 'hidden') visible = false;
            }
            const loaderStyles = loader ? getComputedStyle(loader) : null;
            const loaderVisible = Boolean(loaderStyles)
              && loaderStyles.display !== 'none'
              && loaderStyles.visibility !== 'hidden';
            let noiseOpacity = 1;
            let noiseVisible = Boolean(noise);
            for (let current = noise; current; current = current.parentElement) {
              const styles = getComputedStyle(current);
              noiseOpacity *= Number.parseFloat(styles.opacity || '1') || 0;
              if (styles.display === 'none' || styles.visibility === 'hidden') noiseVisible = false;
            }
            return {
              phase,
              outgoingOpacity: visible ? opacity : 0,
              loaderOpacity: loaderVisible ? Number.parseFloat(loaderStyles.opacity || '0') : 0,
              loaderRect: loader?.getBoundingClientRect().toJSON?.() || null,
              studioWindowRect: studioWindow?.getBoundingClientRect().toJSON?.() || null,
              loaderBackgroundColor: loaderStyles?.backgroundColor || '',
              loaderBackdropMode: loader?.dataset.routeTransitionLoaderBackdrop
                || document.documentElement.dataset.absRouteLoaderBackdrop
                || 'opaque',
              studioWindowBackgroundColor: studioWindow ? getComputedStyle(studioWindow).backgroundColor : '',
              noiseOpacity: noiseVisible ? noiseOpacity : 0,
              noiseTexture: noise ? getComputedStyle(noise, '::before').backgroundImage : '',
            };
          });
          const outgoingStillCovers = heldState.phase === 'route-out'
            && heldState.outgoingOpacity > VISIBILITY_EPSILON;
          const loaderNowProtects = heldState.phase === 'route-loading'
            && heldState.loaderOpacity >= FULL_COVER_OPACITY
            && rectCoversWindow(heldState.loaderRect, heldState.studioWindowRect)
            && (
              (heldState.loaderBackdropMode === ROUTE_LOADER_BACKDROP_MODES.OPAQUE
                && heldState.loaderBackgroundColor === heldState.studioWindowBackgroundColor)
              || (heldState.loaderBackdropMode === ROUTE_LOADER_BACKDROP_MODES.PRESERVE
                && isTransparentBackground(heldState.loaderBackgroundColor)
                && heldState.noiseOpacity > VISIBILITY_EPSILON
                && heldState.noiseTexture.startsWith('url('))
            );
          assert(
            outgoingStillCovers || loaderNowProtects,
            'Delayed Portfolio preload exposed neither outgoing content, an opaque loader, nor the persistent backplane',
            heldState,
          );
          await delayedDependency.release();
        };
      }

      const trace = await runTransition(page, {
        fromRouteId: currentRouteId,
        step,
        label: activeLabel,
        activate,
        afterActivate,
      });
      traces.push(trace);
      if (delayedDependency) {
        await delayedDependency.dispose();
        delayedDependency = null;
      }
      currentRouteId = step.id;
      if (DWELL_MS > 0) await page.waitForTimeout(DWELL_MS);
    }

    if (STRESS_MODE) {
      await runStressProbe(page, traces, traces.length + 1);
    }

    if (PRELOAD_FAILURE_MODE) {
      await runPreloadFailureProbe(page, traces, traces.length + 1);
    }

    assert(pageErrors.length === 0, 'Page errors were reported during transition audit', pageErrors);
    assert(consoleErrors.length === 0, 'Console errors were reported during transition audit', consoleErrors);
  } catch (error) {
    failure = error;
    if (error.transitionTrace && !traces.includes(error.transitionTrace)) traces.push(error.transitionTrace);
    const screenshotPath = resolve(outputRoot, `${runStem}-${activeLabel}-failure.png`);
    await page.screenshot({ path: screenshotPath, fullPage: false }).catch(() => undefined);
    error.failureScreenshot = screenshotPath;
  } finally {
    await delayedDependency?.dispose().catch(() => undefined);
    const reportPath = resolve(outputRoot, `${runStem}.json`);
    await writeFile(reportPath, `${JSON.stringify({
      browser: BROWSER_NAME,
      viewport: VIEWPORT,
      reducedMotion: REDUCED_MOTION,
      continuousRaf: true,
      strictRafCompatibilityFlag: STRICT_RAF,
      stress: STRESS_MODE,
      delayedReadiness: DELAYED_READINESS_MODE,
      preloadFailure: PRELOAD_FAILURE_MODE,
      cpuThrottleRate: CPU_THROTTLE_RATE,
      readinessDelayMs: READINESS_DELAY_MS,
      dwellMs: DWELL_MS,
      traces,
      consoleErrors,
      pageErrors,
      httpErrors,
      failure: failure ? {
        message: failure.message,
        stack: failure.stack,
        failureScreenshot: failure.failureScreenshot,
      } : null,
    }, null, 2)}\n`);
    await browser.close();

    if (failure) {
      console.error(`Trace: ${reportPath}`);
      if (failure.failureScreenshot) console.error(`Failure screenshot: ${failure.failureScreenshot}`);
      throw failure;
    }

    console.log(JSON.stringify({
      browser: BROWSER_NAME,
      viewport: VIEWPORT,
      reducedMotion: REDUCED_MOTION,
      theme: REQUESTED_THEME || 'auto',
      cpuThrottleRate: CPU_THROTTLE_RATE,
      readinessDelayMs: READINESS_DELAY_MS,
      transitions: traces.length,
      reportPath,
    }, null, 2));
    console.error(`PASS: continuous-RAF transition flow audit passed in ${BROWSER_NAME}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
