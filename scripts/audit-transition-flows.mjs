#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const DEFAULT_URL = 'http://127.0.0.1:8013';
const WAIT_MS = Number(process.env.ABS_TRANSITION_HARD_TIMEOUT_MS || 60000);
const BROWSER_NAME = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const HEADED = process.env.ABS_HEADED === '1';
const STRICT_RAF = process.env.ABS_TRANSITION_STRICT_RAF === '1';
const REDUCED_MOTION = process.env.ABS_TRANSITION_REDUCED_MOTION === '1';
const STRESS_MODE = process.env.ABS_TRANSITION_STRESS === '1';
const DELAYED_READINESS_MODE = process.env.ABS_TRANSITION_DELAYED_READINESS === '1';
const PRELOAD_FAILURE_MODE = process.env.ABS_TRANSITION_PRELOAD_FAILURE === '1';
const CPU_THROTTLE_RATE = Math.max(1, Number(process.env.ABS_TRANSITION_CPU_THROTTLE_RATE || 1));
const READINESS_DELAY_MS = Math.max(0, Number(process.env.ABS_TRANSITION_READINESS_DELAY_MS || 0));
const ROUTE_BACKED_HOME_ID = String(process.env.ABS_TRANSITION_ROUTE_BACKED_HOME || '').trim();
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
  HEADED ? 'headed' : '',
].filter(Boolean).join('-');

const ROUTE_DEFINITIONS = Object.freeze({
  portfolio: Object.freeze({ id: 'portfolio', href: '/portfolio.html', ready: '#portfolioProjectMount' }),
  home: Object.freeze({ id: 'home', href: '/index.html', ready: '#c, #simulation-stage' }),
  about: Object.freeze({ id: 'about', href: '/about.html', ready: '[data-route-content="about"]' }),
  contact: Object.freeze({ id: 'contact', href: '/contact.html', ready: '[data-route-content="contact"]' }),
});
const DAILY_FOCUS_ROUTE_IDS = Object.freeze([
  'repel-room',
  'flock-of-birds',
  'rift-rings',
]);
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
          'rift-rings': '#rift-rings-canvas',
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
        const mount = document.getElementById('portfolioProjectMount');
        const card = mount?.querySelector('.portfolio-deck-card.is-active')
          || mount?.querySelector('.portfolio-project-label[data-ring-nearest="true"]');
        const failed = body?.classList.contains('portfolio-deck-failed') || false;
        const gate = document.querySelector('[data-route-content="portfolio-gate"]');
        const cardRect = card?.getBoundingClientRect();
        const cardReady = Boolean(cardRect && cardRect.width >= 64 && cardRect.height >= 64);
        const ready = Boolean(
          body?.classList.contains('portfolio-page')
          && (gate || (
            root.dataset.absRuntimeRoute === 'portfolio'
            && root.dataset.absRuntimeStatus === 'ready'
            && hasCanvasBuffer(canvas)
            && mount
            && (failed || cardReady)
          ))
        );
        return {
          ready,
          runtimeRoute: root.dataset.absRuntimeRoute || '',
          runtimeStatus: root.dataset.absRuntimeStatus || '',
          canvasBufferReady: hasCanvasBuffer(canvas),
          mountPhase: mount?.dataset.portfolioEntrancePhase || '',
          cardReady,
          gate: Boolean(gate),
          failed,
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
      return {
        routeId,
        group: element.dataset.routeEnter || '',
        order: element.dataset.routeEnterOrder || String(index),
        id: element.id || '',
        className: typeof element.className === 'string' ? element.className.slice(0, 120) : '',
        effectiveOpacity: effective?.effectiveOpacity || 0,
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
    const sample = (now) => {
      const sampleStartedAt = performance.now();
      const root = document.documentElement;
      const loader = document.querySelector('[data-route-transition-loader]');
      const spinner = loader?.querySelector('.route-transition-loader__spinner');
      const spinnerDots = Array.from(spinner?.querySelectorAll('.abs-loader-spinner__dot') || []);
      const routeTabs = document.querySelector('[data-route-tabs]');
      const currentTab = document.querySelector('[data-route-tab][aria-current="page"]');
      const shellRoute = document.querySelector('[data-shell-route-view]');
      const children = readChildren();
      const loaderState = readEffective(loader);
      state.samples.push({
        elapsedMs: round(now - state.startedAt, 2),
        path: location.pathname,
        phase: root.dataset.absTransitionPhase || 'idle',
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
        buttonBar: readEffective(document.querySelector('[data-button-bar]')),
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
      longTaskObserver?.disconnect();
    };
    window.addEventListener('abs:route-ready', onReady);
    window.addEventListener('abs:route-failed', onFailed);
    window.addEventListener('abs:daily-focus-failed', onFailed);
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

function assertTransitionTrace(trace, { requireRouteOut = true } = {}) {
  assert(trace?.samples?.length > 2, `${trace?.label || 'transition'} did not record enough RAF samples`, trace);
  const samples = trace.samples;
  const phases = compress(samples.map((sample) => sample.phase));
  const routeOutIndex = samples.findIndex((sample) => sample.phase === 'route-out');
  const loadingIndex = samples.findIndex((sample) => sample.phase === 'route-loading');
  const routeInIndex = samples.findIndex((sample) => sample.phase === 'route-in');
  const finalIdleIndex = samples.findLastIndex((sample) => sample.phase === 'idle');

  if (requireRouteOut) {
    assert(routeOutIndex >= 0, `${trace.label}: route-out was not observed`, { phases });
    assert(routeOutIndex < loadingIndex, `${trace.label}: route-loading did not follow route-out`, { phases });
  }
  assert(loadingIndex >= 0, `${trace.label}: route-loading was not observed`, { phases });
  assert(routeInIndex > loadingIndex, `${trace.label}: route-in did not follow route-loading`, { phases });
  assert(finalIdleIndex > routeInIndex, `${trace.label}: idle did not follow route-in`, { phases });

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
    assert(
      outgoingVisible || loaderFullyCovering,
      `${trace.label}: neither outgoing content nor the loader covered a rendered frame`,
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
      sample.loader.rect.bottom <= (sample.buttonBar?.rect?.top ?? Infinity) + GEOMETRY_TOLERANCE_PX,
      `${trace.label}: loader overlapped the Button Bar`,
      sample,
    );
    assert(
      sample.loader.backgroundColor === sample.studioWindowBackgroundColor,
      `${trace.label}: loader plate did not match the studio-window theme`,
      sample.loader,
    );
  });
  const loadingStart = samples[loadingIndex]?.elapsedMs || 0;
  const routeInStart = samples[routeInIndex]?.elapsedMs || 0;
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
  await page.waitForFunction(({ routeId, pathname, dailyFocusRouteIds }) => {
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
  }, { timeout: WAIT_MS, polling: 'raf' });

  if (step.id === 'portfolio') {
    await page.waitForFunction(() => {
      const mount = document.getElementById('portfolioProjectMount');
      return !mount || mount.dataset.portfolioEntrancePhase === 'complete';
    }, null, { timeout: WAIT_MS, polling: 'raf' });
  }
}

async function clickRouteTab(page, routeId) {
  await page.locator(`[data-route-tab="${routeId}"]`).click({ timeout: WAIT_MS });
}

async function runTransition(page, {
  fromRouteId,
  step,
  label,
  activate,
  requireRouteOut = true,
  afterActivate,
}) {
  await startRafRecorder(page, { fromRouteId, toRouteId: step.id, label });
  let trace = null;
  try {
    await activate();
    await afterActivate?.();
    await waitForTargetSettled(page, step);
    trace = await stopRafRecorder(page);
    assertTransitionTrace(trace, { requireRouteOut });
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

  const label = `${String(nextIndex + 1).padStart(2, '0')}-portfolio-preload-failure-restore`;
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
    const mount = document.getElementById('portfolioProjectMount');
    const snapshot = window.__ABS_PORTFOLIO_AUDIT__?.getApp?.()?.getDeckDebugSnapshot?.();
    return (
      phase === 'idle'
      && rendered === 'portfolio'
      && location.pathname.endsWith('/portfolio.html')
      && mount?.dataset.portfolioEntrancePhase === 'complete'
      && mount?.inert === false
      && !mount?.hasAttribute('aria-busy')
      && snapshot?.inputState === 'idle'
      && snapshot?.particleField?.suspended === false
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

  try {
    await page.addInitScript(({ readinessDelayMs }) => {
      // Legacy route runtimes temporarily scope requestAnimationFrame so they can
      // clean up their own loops. Keep the audit recorder outside that scope or
      // a route unmount can cancel the very observer intended to inspect it.
      window.__ABS_AUDIT_NATIVE_RAF__ = window.requestAnimationFrame.bind(window);
      window.__ABS_AUDIT_NATIVE_CANCEL_RAF__ = window.cancelAnimationFrame.bind(window);
      window.__ABS_AUDIT_ROUTE_READINESS_DELAY_MS__ = readinessDelayMs;
    }, { readinessDelayMs: READINESS_DELAY_MS });
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
      await page.locator('.simulation-focus-switcher').click();
      await page.locator(`.simulation-focus-row[data-simulation-id="${ROUTE_BACKED_HOME_ID}"]`).click();
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
            let opacity = 1;
            let visible = Boolean(source);
            for (let current = source; current; current = current.parentElement) {
              const styles = getComputedStyle(current);
              opacity *= Number.parseFloat(styles.opacity || '1') || 0;
              if (styles.display === 'none' || styles.visibility === 'hidden') visible = false;
            }
            return { phase, outgoingOpacity: visible ? opacity : 0 };
          });
          assert(
            heldState.phase === 'route-out' && heldState.outgoingOpacity > VISIBILITY_EPSILON,
            'Delayed Portfolio preload exposed a blank frame before the loader transaction',
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
      traces,
      consoleErrors,
      pageErrors,
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
