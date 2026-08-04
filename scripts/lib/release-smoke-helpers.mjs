import { spawn } from 'node:child_process';
import { access } from 'node:fs/promises';
import { resolve } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';
import { ROUTE_MANIFEST } from '../../react-app/app/src/lib/route-manifest.js';

const RELEASE_SMOKE_ROUTE_CONTRACTS = Object.freeze({
  home: Object.freeze({
    requestPath: '/index.html?mode=pit&absAudit=1',
    identitySelector: '#c',
    runtime: true,
    semanticContract: Object.freeze({
      mainSelector: '#simulations[role="main"][data-route-content="home"]',
      headingSelector: 'h1#hero-title[data-canvas-title-source="home"]',
      labelHostSelector: '#simulations',
      pressedButtonSelector: '#expertise-legend button.legend__item[aria-pressed]',
      statusSelector: '#legend-details-status[role="status"]',
    }),
  }),
  portfolio: Object.freeze({
    identitySelector: '#portfolioProjectMount',
    runtime: true,
    semanticContract: Object.freeze({
      mainSelector: '#simulations[role="main"][data-route-content="portfolio"]',
      headingSelector: 'h1#hero-title.hero-title--portfolio',
      labelHostSelector: '#simulations',
    }),
  }),
  about: Object.freeze({
    identitySelector: '#simulations[role="main"][data-route-content="about"]',
    runtime: false,
    representativeFocus: Object.freeze({
      selector: '[data-route-tab="portfolio"]',
    }),
    semanticContract: Object.freeze({
      mainSelector: '#simulations[role="main"][data-route-content="about"]',
      headingSelector: 'h1#about-coming-soon-title[data-route-focus-target]',
      labelHostSelector: '#simulations',
    }),
  }),
  contact: Object.freeze({
    identitySelector: '#simulations[role="main"][data-route-content="contact"]',
    runtime: false,
    semanticContract: Object.freeze({
      mainSelector: '#simulations[role="main"][data-route-content="contact"]',
      headingSelector: 'h1#contact-route-title[data-route-focus-target]',
      labelHostSelector: '#simulations',
    }),
  }),
  playground: Object.freeze({
    identitySelector: '#simulations[role="main"][data-route-content="playground"]',
    runtime: false,
    representativeFocus: Object.freeze({
      selector: '[data-route-tab="portfolio"]',
    }),
    semanticContract: Object.freeze({
      mainSelector: '#simulations[role="main"][data-route-content="playground"]',
      headingSelector: 'h1#playground-coming-soon-title[data-route-focus-target]',
      labelHostSelector: '#simulations',
    }),
  }),
});

const primaryRoutes = Object.values(ROUTE_MANIFEST)
  .filter((route) => route.shellTab)
  .sort((left, right) => left.shellTab.order - right.shellTab.order);
const missingContracts = primaryRoutes
  .filter((route) => !RELEASE_SMOKE_ROUTE_CONTRACTS[route.id])
  .map((route) => route.id);
const staleContracts = Object.keys(RELEASE_SMOKE_ROUTE_CONTRACTS)
  .filter((routeId) => !primaryRoutes.some((route) => route.id === routeId));
if (missingContracts.length || staleContracts.length) {
  throw new Error(
    `[release-smoke] primary route contract drift: missing=${missingContracts.join(',') || 'none'}; `
    + `stale=${staleContracts.join(',') || 'none'}`,
  );
}

export const RELEASE_SMOKE_ROUTES = Object.freeze(primaryRoutes.map((route) => Object.freeze({
  id: route.id,
  path: route.path,
  ...RELEASE_SMOKE_ROUTE_CONTRACTS[route.id],
})));

const APP_MARKERS = Object.freeze([
  'id="abs-boot-overlay"',
  'id="root"',
  'data-abs-boot-state="booting"',
]);

export function assertSmoke(condition, routeId, assertion, details = null) {
  if (condition) return;
  const error = new Error(`[release-smoke] ${routeId}/${assertion} failed`);
  error.routeId = routeId;
  error.assertion = assertion;
  error.details = details;
  throw error;
}

export function routeUrl(baseUrl, pathname) {
  return new URL(pathname, `${baseUrl.replace(/\/+$/, '')}/`).toString();
}

export function buildReleaseSmokeSuccessReport({
  browser,
  preview,
  baseUrl,
  viewport,
  durationMs,
  results,
  completedAt = new Date().toISOString(),
}) {
  return {
    schemaVersion: 1,
    status: 'passed',
    completedAt,
    browser,
    preview,
    baseUrl,
    viewport: { ...viewport },
    durationMs,
    diagnostics: {
      pageErrors: 0,
      consoleErrors: 0,
      failedResponses: 0,
      failedRequests: 0,
    },
    results: results.map(({ phase, routeId, durationMs: resultDurationMs }) => ({
      phase,
      routeId,
      durationMs: resultDurationMs,
    })),
  };
}

async function responseMatchesProductionApp(url) {
  const response = await fetch(url, { method: 'GET' });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  const html = await response.text();
  if (!APP_MARKERS.every((marker) => html.includes(marker))) {
    throw new Error('response did not match the production app shell');
  }
}

export async function waitForProductionPreview(baseUrl, timeoutMs = 20_000) {
  const startedAt = Date.now();
  let lastError = null;
  while (Date.now() - startedAt < timeoutMs) {
    try {
      await responseMatchesProductionApp(routeUrl(baseUrl, '/index.html'));
      return;
    } catch (error) {
      lastError = error;
    }
    await delay(200);
  }
  throw new Error(`Production preview unavailable at ${baseUrl}: ${lastError?.message || 'unknown error'}`);
}

function hasChildExited(child) {
  return child.exitCode !== null || child.signalCode !== null;
}

function waitForChildExit(child, timeoutMs) {
  if (hasChildExited(child)) return Promise.resolve(true);
  return new Promise((resolveExit) => {
    let settled = false;
    let timeoutId = 0;
    const finish = (exited) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeoutId);
      child.removeListener('exit', handleExit);
      resolveExit(exited);
    };
    const handleExit = () => finish(true);
    timeoutId = setTimeout(() => finish(false), timeoutMs);
    child.once('exit', handleExit);
    if (hasChildExited(child)) finish(true);
  });
}

async function stopPreviewChild(child, timeoutMs = 3_000) {
  if (hasChildExited(child)) return;
  child.kill('SIGTERM');
  if (await waitForChildExit(child, timeoutMs)) return;

  child.kill('SIGKILL');
  if (await waitForChildExit(child, 2_000)) return;
  throw new Error('Production preview did not exit after SIGTERM and SIGKILL.');
}

export async function startProductionPreview({ repoRoot, host, port }) {
  const distEntry = resolve(repoRoot, 'react-app/app/dist/index.html');
  const viteEntry = resolve(repoRoot, 'react-app/app/node_modules/vite/bin/vite.js');
  await access(distEntry);
  await access(viteEntry);

  const child = spawn(process.execPath, [
    viteEntry,
    'preview',
    '--host', host,
    '--port', String(port),
    '--strictPort',
  ], {
    cwd: resolve(repoRoot, 'react-app/app'),
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let logs = '';
  child.stdout.on('data', (chunk) => { logs += String(chunk); });
  child.stderr.on('data', (chunk) => { logs += String(chunk); });

  const baseUrl = `http://${host}:${port}`;
  try {
    await Promise.race([
      waitForProductionPreview(baseUrl),
      new Promise((_, reject) => {
        child.once('exit', (code, signal) => {
          reject(new Error(`Production preview exited before readiness (${signal || code}).\n${logs}`));
        });
      }),
    ]);
  } catch (error) {
    await stopPreviewChild(child).catch(() => {});
    throw error;
  }

  let stopPromise = null;
  return {
    baseUrl,
    getLogs: () => logs,
    stop() {
      stopPromise ||= stopPreviewChild(child);
      return stopPromise;
    },
  };
}

export async function waitForRouteReady(page, route, timeoutMs) {
  let outcome;
  try {
    const outcomeHandle = await page.waitForFunction(
      ({ expectedRoute, identitySelector, needsRuntime }) => {
        const failures = window.__ABS_RELEASE_SMOKE_EVENTS__?.routeFailures || [];
        const failure = failures.at(-1) || null;
        if (failure) return { status: 'route-failure', failure };

        const root = document.documentElement;
        const overlay = document.getElementById('abs-boot-overlay');
        const overlayHidden = !overlay
          || getComputedStyle(overlay).display === 'none'
          || getComputedStyle(overlay).visibility === 'hidden'
          || Number.parseFloat(getComputedStyle(overlay).opacity || '1') < 0.02;
        const routeView = document.querySelector('[data-shell-route-view]')?.dataset.shellRouteView || '';
        const activeRoute = document.querySelector('[data-route-tab][aria-current="page"]')?.dataset.routeTab || '';
        const readyElement = document.querySelector(identitySelector);
        const readyRect = readyElement?.getBoundingClientRect();
        const readyElementPresent = Boolean(
          readyElement && readyRect && readyRect.width > 0 && readyRect.height > 0,
        );
        const runtimeReady = !needsRuntime || (
          root.dataset.absRuntimeRoute === expectedRoute
          && root.dataset.absRuntimeStatus === 'ready'
        );
        const homeReady = expectedRoute !== 'home' || (
          root.dataset.absHomeRouteReady === 'true'
          && root.dataset.absHomeCanvasTitleReady === 'true'
        );
        const ready = (
          root.dataset.absBootState === 'ready'
          && (root.dataset.absTransitionPhase || 'idle') === 'idle'
          && overlayHidden
          && routeView === expectedRoute
          && activeRoute === expectedRoute
          && readyElementPresent
          && runtimeReady
          && homeReady
        );
        return ready ? { status: 'ready' } : false;
      },
      {
        expectedRoute: route.id,
        identitySelector: route.identitySelector,
        needsRuntime: route.runtime,
      },
      { timeout: timeoutMs, polling: 'raf' },
    );
    outcome = await outcomeHandle.jsonValue();
  } catch (error) {
    assertSmoke(false, route.id, 'route-readiness-timeout', {
      message: error.message,
      state: await readRouteState(page).catch(() => null),
    });
  }
  if (outcome.status === 'route-failure') {
    assertSmoke(false, route.id, 'route-failure-event', outcome.failure);
  }
  if (outcome.status !== 'ready') {
    assertSmoke(false, route.id, 'route-readiness-timeout', await readRouteState(page));
  }
}

export async function readRouteState(page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const overlay = document.getElementById('abs-boot-overlay');
    return {
      url: location.href,
      title: document.title,
      bootState: root.dataset.absBootState || '',
      bootDetail: root.dataset.absBootDetail || '',
      transitionPhase: root.dataset.absTransitionPhase || 'idle',
      shellRoute: root.dataset.shellRoute || '',
      renderedRoute: document.querySelector('[data-shell-route-view]')?.dataset.shellRouteView || '',
      activeRoute: document.querySelector('[data-route-tab][aria-current="page"]')?.dataset.routeTab || '',
      runtimeRoute: root.dataset.absRuntimeRoute || '',
      runtimeStatus: root.dataset.absRuntimeStatus || '',
      homeRouteReady: root.dataset.absHomeRouteReady || '',
      homeCanvasTitleReady: root.dataset.absHomeCanvasTitleReady || '',
      overlayOpacity: overlay ? getComputedStyle(overlay).opacity : 'absent',
      routeFailures: window.__ABS_RELEASE_SMOKE_EVENTS__?.routeFailures || [],
      pageErrors: window.__ABS_RELEASE_SMOKE_EVENTS__?.pageErrors || [],
    };
  });
}

export async function assertRouteIdentity(page, route) {
  const state = await readRouteState(page);
  assertSmoke(new URL(state.url).pathname === route.path, route.id, 'route-path', state);
  assertSmoke(state.shellRoute === route.id, route.id, 'shell-route', state);
  assertSmoke(state.renderedRoute === route.id, route.id, 'rendered-route', state);
  assertSmoke(state.activeRoute === route.id, route.id, 'active-route-tab', state);
  assertSmoke(state.bootState === 'ready', route.id, 'boot-ready', state);
  assertSmoke(state.transitionPhase === 'idle', route.id, 'transition-idle', state);
  assertSmoke(state.routeFailures.length === 0, route.id, 'route-failure-event', state);
  assertSmoke(state.pageErrors.length === 0, route.id, 'window-error-event', state);
  if (route.runtime) {
    assertSmoke(state.runtimeRoute === route.id, route.id, 'runtime-route', state);
    assertSmoke(state.runtimeStatus === 'ready', route.id, 'runtime-status', state);
  }

  const anchors = await page.locator(route.identitySelector).evaluateAll((elements) => (
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        visible: rect.width > 0
          && rect.height > 0
          && style.display !== 'none'
          && style.visibility !== 'hidden',
      };
    })
  ));
  assertSmoke(anchors.length === 1, route.id, 'identity-anchor-count', {
    selector: route.identitySelector,
    anchors,
  });
  assertSmoke(anchors[0]?.visible === true, route.id, 'identity-anchor-visible', anchors[0]);
  return state;
}

export async function assertHomeCanvasBackingStore(page) {
  const metrics = await page.locator('#c').evaluate((canvas) => {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    return {
      width: canvas.width,
      height: canvas.height,
      cssWidth: rect.width,
      cssHeight: rect.height,
      dpr,
      expectedWidth: Math.round(rect.width * dpr),
      expectedHeight: Math.round(rect.height * dpr),
    };
  });
  const widthDelta = Math.abs(metrics.width - metrics.expectedWidth);
  const heightDelta = Math.abs(metrics.height - metrics.expectedHeight);
  assertSmoke(metrics.cssWidth >= 64 && metrics.cssHeight >= 64, 'home', 'canvas-layout-size', metrics);
  assertSmoke(metrics.width > 300 && metrics.height > 150, 'home', 'canvas-backing-store-non-default', metrics);
  assertSmoke(widthDelta <= 2 && heightDelta <= 2, 'home', 'canvas-backing-store-size', {
    ...metrics,
    widthDelta,
    heightDelta,
  });
  return metrics;
}

export async function captureStableSimulationsNode(page) {
  const snapshot = await page.evaluate(() => {
    const element = document.getElementById('simulations');
    window.__ABS_RELEASE_SMOKE_SIMULATIONS_NODE__ = element;
    return {
      present: Boolean(element),
      tagName: element?.tagName || '',
      connected: element?.isConnected === true,
    };
  });
  assertSmoke(
    snapshot.present && snapshot.tagName === 'DIV' && snapshot.connected,
    'home',
    'stable-simulations-node-captured',
    snapshot,
  );
  return snapshot;
}

export async function assertStableSimulationsNode(page, routeId) {
  const snapshot = await page.evaluate((expectedRouteId) => {
    const element = document.getElementById('simulations');
    return {
      sameNode: element === window.__ABS_RELEASE_SMOKE_SIMULATIONS_NODE__,
      tagName: element?.tagName || '',
      connected: element?.isConnected === true,
      role: element?.getAttribute('role') || '',
      routeContent: element?.dataset.routeContent || '',
      labelledBy: element?.getAttribute('aria-labelledby') || '',
      expectedRouteId,
    };
  }, routeId);
  assertSmoke(
    snapshot.sameNode
      && snapshot.tagName === 'DIV'
      && snapshot.connected
      && snapshot.role === 'main'
      && snapshot.routeContent === routeId
      && Boolean(snapshot.labelledBy),
    routeId,
    'stable-simulations-node-preserved',
    snapshot,
  );
  return snapshot;
}

export async function assertRouteSemanticContract(page, route) {
  const semanticContract = route.semanticContract;
  assertSmoke(Boolean(semanticContract), route.id, 'semantic-contract-configured');
  const mainRoleCount = await page.getByRole('main').count();
  const headingRoleCount = await page.getByRole('heading', { level: 1 }).count();
  const contract = await page.evaluate((selectors) => {
    const isSemanticallyExposed = (element) => {
      if (!element) return false;
      for (let current = element; current; current = current.parentElement) {
        if (
          current.hidden
          || current.hasAttribute('inert')
          || current.getAttribute('aria-hidden') === 'true'
        ) {
          return false;
        }
        const style = getComputedStyle(current);
        if (
          style.display === 'none'
          || style.visibility === 'hidden'
          || style.visibility === 'collapse'
          || style.contentVisibility === 'hidden'
        ) {
          return false;
        }
      }
      return true;
    };
    const main = document.querySelector(selectors.mainSelector);
    const matchingHeadings = Array.from(document.querySelectorAll(selectors.headingSelector))
      .filter(isSemanticallyExposed);
    const heading = matchingHeadings[0] || null;
    const labelHost = heading?.closest(selectors.labelHostSelector);
    const rect = main?.getBoundingClientRect();
    return {
      mainRoleCount: 0,
      mainMatches: main ? 1 : 0,
      mainExposed: isSemanticallyExposed(main),
      headingRoleCount: 0,
      headingMatches: matchingHeadings.length,
      headingInsideMain: Boolean(main && heading && main.contains(heading)),
      headingText: (heading?.textContent || '').trim(),
      mainText: (main?.textContent || '').trim(),
      labelledBy: labelHost?.getAttribute('aria-labelledby') || '',
      headingId: heading?.id || '',
      mainVisible: Boolean(rect && rect.width > 0 && rect.height > 0),
    };
  }, semanticContract);
  contract.mainRoleCount = mainRoleCount;
  contract.headingRoleCount = headingRoleCount;
  assertSmoke(contract.mainRoleCount === 1, route.id, 'primary-main-count', contract);
  assertSmoke(
    contract.mainMatches === 1 && contract.mainExposed && contract.mainVisible,
    route.id,
    'primary-main-visible',
    contract,
  );
  assertSmoke(Boolean(contract.mainText), route.id, 'primary-main-content', contract);
  assertSmoke(contract.headingRoleCount === 1, route.id, 'primary-h1-count', contract);
  assertSmoke(
    contract.headingMatches === 1 && contract.headingInsideMain && Boolean(contract.headingText),
    route.id,
    'main-h1-target',
    contract,
  );
  assertSmoke(contract.labelledBy === contract.headingId, route.id, 'main-h1-labelling', contract);

  if (semanticContract.pressedButtonSelector) {
    const buttons = page.locator(semanticContract.pressedButtonSelector);
    const status = page.locator(semanticContract.statusSelector);
    const buttonCount = await buttons.count();
    const statusCount = await status.count();
    assertSmoke(buttonCount > 0, route.id, 'pressed-button-count', {
      selector: semanticContract.pressedButtonSelector,
      buttonCount,
    });
    assertSmoke(statusCount === 1, route.id, 'legend-details-status-count', {
      selector: semanticContract.statusSelector,
      statusCount,
    });
    const statusContract = await status.evaluate((element) => ({
      id: element.id,
      role: element.getAttribute('role'),
      live: element.getAttribute('aria-live'),
      atomic: element.getAttribute('aria-atomic'),
      text: element.textContent,
    }));
    assertSmoke(
      statusContract.id
        && statusContract.role === 'status'
        && statusContract.live === 'polite'
        && statusContract.atomic === 'true'
        && statusContract.text === '',
      route.id,
      'legend-details-status-contract',
      statusContract,
    );
    for (let index = 0; index < buttonCount; index += 1) {
      const button = buttons.nth(index);
      const initial = await button.evaluate((element) => ({
        tagName: element.tagName,
        type: element.getAttribute('type'),
        tabIndex: element.tabIndex,
        pressed: element.getAttribute('aria-pressed'),
        controls: element.getAttribute('aria-controls'),
        tooltip: element.getAttribute('data-tooltip') || '',
      }));
      assertSmoke(
        initial.tagName === 'BUTTON'
          && initial.type === 'button'
          && initial.tabIndex === 0
          && initial.pressed === 'false'
          && initial.controls === statusContract.id
          && Boolean(initial.tooltip),
        route.id,
        'pressed-button-native-state',
        { index, initial },
      );

      await button.focus();
      await page.keyboard.press('Enter');
      assertSmoke(
        await button.getAttribute('aria-pressed') === 'true'
          && await status.textContent() === initial.tooltip,
        route.id,
        'pressed-button-enter',
        { index },
      );
      await page.keyboard.press('Space');
      assertSmoke(
        await button.getAttribute('aria-pressed') === 'false'
          && await status.textContent() === '',
        route.id,
        'pressed-button-space',
        { index },
      );
      await button.click();
      assertSmoke(
        await button.getAttribute('aria-pressed') === 'true'
          && await status.textContent() === initial.tooltip,
        route.id,
        'pressed-button-pointer',
        { index },
      );
      await button.click();
      assertSmoke(
        await button.getAttribute('aria-pressed') === 'false'
          && await status.textContent() === '',
        route.id,
        'pressed-button-pointer-reset',
        { index },
      );
    }
    contract.pressedButtonCount = buttonCount;
  }
  return contract;
}

export async function assertRepresentativeKeyboardFocus(page, route) {
  const selector = route.representativeFocus?.selector;
  assertSmoke(Boolean(selector), route.id, 'representative-focus-contract-configured', {
    representativeFocus: route.representativeFocus || null,
  });
  const tabTraversalLimit = await page.evaluate(() => {
    const tabbableSelector = [
      'a[href]',
      'area[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'iframe',
      'audio[controls]',
      'video[controls]',
      '[contenteditable="true"]',
      '[tabindex]:not([tabindex^="-"])',
    ].join(',');
    const isTabbable = (element) => {
      for (let current = element; current; current = current.parentElement) {
        if (current.hidden || current.hasAttribute('inert')) return false;
        const style = getComputedStyle(current);
        if (style.display === 'none' || style.visibility === 'hidden') return false;
      }
      return element.getClientRects().length > 0;
    };
    return Math.max(1, Array.from(document.querySelectorAll(tabbableSelector)).filter(isTabbable).length + 1);
  });
  let focused = false;
  for (let attempt = 0; attempt < tabTraversalLimit; attempt += 1) {
    await page.keyboard.press('Tab');
    focused = await page.locator(selector).evaluate((element) => element === document.activeElement);
    if (focused) break;
  }
  assertSmoke(focused, route.id, 'representative-keyboard-focus-target', {
    selector,
    tabTraversalLimit,
  });

  const focus = await page.locator(selector).evaluate((element) => {
    const colorIsVisible = (value) => {
      const color = String(value || '').trim().toLowerCase();
      return color !== 'transparent'
        && !/^rgba\([^)]*,\s*0(?:\.0+)?\)$/.test(color);
    };
    const indicatorKinds = [];
    const candidates = [element, ...element.querySelectorAll('*')];
    candidates.forEach((candidate, index) => {
      const candidateStyle = getComputedStyle(candidate);
      const outlineWidth = Number.parseFloat(candidateStyle.outlineWidth || '0');
      if (
        candidateStyle.outlineStyle !== 'none'
        && outlineWidth >= 1
        && colorIsVisible(candidateStyle.outlineColor)
      ) {
        indicatorKinds.push(index === 0 ? 'outline' : 'descendant-outline');
      }
      if (
        candidateStyle.textDecorationLine?.includes('underline')
        && colorIsVisible(candidateStyle.textDecorationColor || candidateStyle.color)
      ) {
        indicatorKinds.push(index === 0 ? 'underline' : 'descendant-underline');
      }
      if (
        candidateStyle.boxShadow
        && candidateStyle.boxShadow !== 'none'
        && colorIsVisible(candidateStyle.boxShadow)
      ) {
        indicatorKinds.push(index === 0 ? 'box-shadow' : 'descendant-box-shadow');
      }
    });
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    const outlineWidth = Number.parseFloat(style.outlineWidth || '0');
    const outlineVisible = style.outlineStyle !== 'none'
      && outlineWidth >= 1
      && colorIsVisible(style.outlineColor);
    return {
      active: element === document.activeElement,
      focusVisible: element.matches(':focus-visible'),
      outlineStyle: style.outlineStyle,
      outlineWidth,
      outlineColor: style.outlineColor,
      outlineVisible,
      focusIndicatorVisible: indicatorKinds.length > 0,
      indicatorKinds: [...new Set(indicatorKinds)],
      inViewport: rect.width > 0
        && rect.height > 0
        && rect.right > 0
        && rect.bottom > 0
        && rect.left < window.innerWidth
        && rect.top < window.innerHeight,
    };
  });
  assertSmoke(focus.active && focus.focusVisible, route.id, 'representative-focus-visible-state', focus);
  assertSmoke(focus.focusIndicatorVisible && focus.inViewport, route.id, 'representative-focus-visible-style', focus);
  return focus;
}
