#!/usr/bin/env node
import process from 'node:process';
import { chromium, webkit } from 'playwright';

const baseUrl = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').replace(/\/$/, '');
const waitMs = Number(process.env.ABS_SIMULATION_RECOVERY_WAIT_MS || 15000);
const browserName = String(process.env.ABS_BROWSER || 'chromium').toLowerCase();
const browserType = browserName === 'webkit' ? webkit : chromium;
const reducedMotion = process.env.ABS_REDUCED_MOTION === 'reduce' ? 'reduce' : 'no-preference';

function url(pathname) {
  return new URL(pathname, `${baseUrl}/`).toString();
}

function assert(condition, message, details = null) {
  if (condition) return;
  throw new Error(`${message}${details ? `\n${JSON.stringify(details, null, 2)}` : ''}`);
}

async function openFlies(page) {
  await page.goto(url('/index.html?mode=flies&absAudit=1'), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForFunction(() => {
    const snapshot = window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.();
    return snapshot?.mode === 'flies'
      && document.querySelector('.simulation-focus-switcher')?.dataset.simulationId === 'flies'
      && document.documentElement.dataset.absRuntimeStatus === 'ready'
      && (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
      && (document.documentElement.dataset.absSimulationFocusTransition || 'idle') === 'idle'
      && document.getElementById('simulation-title-canvas')?.dataset.titlePlaneReady === 'true'
      && !document.getElementById('abs-boot-overlay');
  }, null, { timeout: waitMs });
}

async function chooseRepelRoom(page) {
  for (let step = 0; step < 13; step += 1) {
    const switcher = page.locator('.simulation-focus-switcher');
    const currentId = await switcher.getAttribute('data-simulation-id');
    if (currentId === 'repel-room') return;
    await switcher.click();
    await page.waitForFunction((previousId) => {
      const root = document.documentElement;
      const control = document.querySelector('.simulation-focus-switcher');
      return control?.dataset.simulationId !== previousId
        && !control?.disabled
        && (root.dataset.absSimulationFocusTransition || 'idle') === 'idle';
    }, currentId, { timeout: waitMs, polling: 25 });
  }
  throw new Error('Circular switcher did not reach Tension within one cycle');
}

async function readRecoveryState(page) {
  return page.evaluate(() => ({
    href: window.location.href,
    activeId: document.querySelector('.simulation-focus-switcher')?.dataset.simulationId || '',
    homeMode: window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.()?.mode || '',
    dailyStage: document.querySelector('#simulation-stage')?.dataset.simulationId || '',
    switchState: window.__ABS_SIMULATION_SWITCH_TRANSACTION__ || null,
    loadState: window.__ABS_DAILY_RUNTIME_LOAD__ || null,
    storedChoice: sessionStorage.getItem('abs_simulation_focus_choice_v1'),
    transitionPhase: document.documentElement.dataset.absTransitionPhase || 'idle',
    focusPhase: document.documentElement.dataset.absSimulationFocusTransition || 'idle',
    windowBlur: (() => {
      const element = document.getElementById('window-overlay-blur-layer');
      const styles = element ? getComputedStyle(element) : null;
      return {
        opacity: Number.parseFloat(styles?.opacity || '0'),
        visibility: styles?.visibility || 'hidden',
      };
    })(),
    readyEvents: window.__ABS_READY_EVENTS__ || [],
  }));
}

async function waitForRestoredFlies(page) {
  await page.waitForFunction(() => {
    const windowBlur = document.getElementById('window-overlay-blur-layer');
    const styles = windowBlur ? getComputedStyle(windowBlur) : null;
    return (
      ['failed', 'recovered'].includes(window.__ABS_SIMULATION_SWITCH_TRANSACTION__?.status)
      && window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.()?.mode === 'flies'
      && document.querySelector('.simulation-focus-switcher')?.dataset.simulationId === 'flies'
      && !document.querySelector('#simulation-stage')
      && !document.documentElement.dataset.absSimulationFocusTransition
      && styles?.visibility === 'hidden'
      && Number.parseFloat(styles.opacity || '1') <= 0.001
    );
  }, null, { timeout: waitMs });
}

async function createPage(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'dark',
    reducedMotion,
  });
  await context.addInitScript(() => {
    if (sessionStorage.getItem('__abs_recovery_audit_seeded__') !== '1') {
      sessionStorage.removeItem('abs_simulation_focus_choice_v1');
      sessionStorage.removeItem('abs_simulation_reload_choice_v1');
      sessionStorage.setItem('__abs_recovery_audit_seeded__', '1');
    }
    localStorage.setItem('theme-preference-v3', 'auto');
    window.__ABS_READY_EVENTS__ = [];
    window.addEventListener('abs:route-ready', (event) => {
      window.__ABS_READY_EVENTS__.push(event?.detail?.routeId || '');
    });
  });
  const page = await context.newPage();
  return { context, page };
}

async function main() {
  const browser = await browserType.launch();
  const proof = {};

  try {
    {
      const { context, page } = await createPage(browser);
      await page.route('**/RepelRoomRuntime*', (route) => route.abort('failed'));
      await page.goto(url('/lab/repel-room.html?daily=1'), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('.daily-focus-runtime-status[data-runtime-status="failed"]', {
        timeout: waitMs,
      });
      await page.waitForFunction(() => (
        document.documentElement.dataset.absBootState !== 'booting'
        && !document.getElementById('abs-boot-overlay')
      ), null, { timeout: waitMs });
      const failureUi = await page.locator('.daily-focus-runtime-status[data-runtime-status="failed"]').evaluate((element) => ({
        text: element.textContent?.replace(/\s+/g, ' ').trim() || '',
        retryVisible: Boolean(element.querySelector('button')?.getBoundingClientRect().width),
      }));
      assert(failureUi.retryVisible && failureUi.text.includes('Retry'), 'Direct-load failure did not expose retry UI', failureUi);
      await page.unroute('**/RepelRoomRuntime*');
      await page.locator('.daily-focus-runtime-status button').click();
      await page.waitForFunction(() => (
        document.querySelector('#simulation-stage')?.dataset.simulationId === 'repel-room'
        && document.querySelector('#repel-room-canvas')?.width >= 64
      ), null, { timeout: waitMs });
      proof.directFailureExposedRetry = failureUi;
      await context.close();
    }

    {
      const { context, page } = await createPage(browser);
      await page.route('**/RepelRoomRuntime*', (route) => route.abort('failed'));
      await openFlies(page);
      await chooseRepelRoom(page);
      await waitForRestoredFlies(page);
      const state = await readRecoveryState(page);
      assert(state.switchState?.status === 'failed', 'Chunk failure was not reported', state);
      assert(state.activeId === 'flies' && state.homeMode === 'flies', 'Chunk failure replaced the working simulation', state);
      assert(!state.storedChoice?.includes('repel-room'), 'Chunk failure persisted the broken choice', state);
      proof.chunkFailurePreservedPrevious = state;
      await context.close();
    }

    {
      const { context, page } = await createPage(browser);
      const requestedUrls = [];
      page.on('request', (request) => requestedUrls.push(request.url()));
      await openFlies(page);
      await page.evaluate(() => {
        window.__ABS_AUDIT_FORCE_DAILY_NOT_READY__ = 'repel-room';
      });
      const titleBefore = await page.locator('#simulation-title-canvas').evaluate((canvas) => ({
        identity: canvas.dataset.titlePlaneIdentity || '',
        renderRevision: Number(canvas.dataset.titlePlaneRenderRevision || 0),
        width: canvas.width,
        height: canvas.height,
      }));
      await chooseRepelRoom(page);
      await waitForRestoredFlies(page);
      const retainedTitlePlane = await page.locator('#simulation-title-canvas').evaluate((canvas, before) => ({
        sameBackingStore: canvas.width === before.width && canvas.height === before.height,
        identity: canvas.dataset.titlePlaneIdentity || '',
        ready: canvas.dataset.titlePlaneReady || '',
        renderRevision: Number(canvas.dataset.titlePlaneRenderRevision || 0),
        snapshotCount: document.querySelectorAll('.simulation-transaction-snapshot').length,
      }), titleBefore);
      assert(
        retainedTitlePlane.identity === 'shell-owned'
          && retainedTitlePlane.ready === 'true'
          && retainedTitlePlane.sameBackingStore
          && retainedTitlePlane.renderRevision >= titleBefore.renderRevision
          && retainedTitlePlane.snapshotCount === 0,
        'Stable shell-owned title plane did not survive recovery without a snapshot layer',
        retainedTitlePlane,
      );
      const timeoutState = await readRecoveryState(page);
      assert(timeoutState.switchState?.status === 'recovered', 'Readiness failure did not settle through recovery', timeoutState);
      assert(!timeoutState.readyEvents.includes('repel-room'), 'Timed-out runtime dispatched route-ready', timeoutState);
      assert(timeoutState.activeId === 'flies' && timeoutState.homeMode === 'flies', 'Readiness timeout did not roll back', timeoutState);
      proof.readinessTimeoutRolledBack = timeoutState;
      proof.stableTitlePlaneRetained = retainedTitlePlane;

      await page.evaluate(() => {
        delete window.__ABS_AUDIT_FORCE_DAILY_NOT_READY__;
      });
      await chooseRepelRoom(page);
      await page.waitForFunction(() => (
        window.__ABS_SIMULATION_SWITCH_TRANSACTION__?.status === 'ready'
        && document.querySelector('#simulation-stage')?.dataset.simulationId === 'repel-room'
        && document.querySelector('.simulation-focus-switcher')?.dataset.simulationId === 'repel-room'
      ), null, { timeout: waitMs });
      await page.waitForFunction(() => (
        (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
        && (document.documentElement.dataset.absSimulationFocusTransition || 'idle') === 'idle'
        && getComputedStyle(document.getElementById('window-overlay-blur-layer')).visibility === 'hidden'
        && Number.parseFloat(getComputedStyle(document.getElementById('window-overlay-blur-layer')).opacity || '1') <= 0.001
      ), null, { timeout: waitMs });
      const successState = await readRecoveryState(page);
      assert(!requestedUrls.some((requestUrl) => requestUrl.includes('/lab/config/')), 'Route-relative config request still occurs', {
        offending: requestedUrls.filter((requestUrl) => requestUrl.includes('/lab/config/')),
      });
      proof.retryReachedTarget = successState;
      proof.routeRelativeConfigRequests = 0;
      await context.close();
    }

    console.log(JSON.stringify({ ok: true, browser: browserName, reducedMotion, proof }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
