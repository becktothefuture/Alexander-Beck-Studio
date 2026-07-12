#!/usr/bin/env node
import process from 'node:process';
import { chromium } from 'playwright';

const baseUrl = String(process.env.ABS_DEV_URL || 'http://127.0.0.1:8012').replace(/\/$/, '');
const waitMs = Number(process.env.ABS_SIMULATION_RECOVERY_WAIT_MS || 15000);

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
      && document.querySelector('.simulation-focus-switcher')?.dataset.simulationId === 'flies';
  }, { timeout: waitMs });
}

async function chooseRepelRoom(page) {
  await page.locator('.simulation-focus-switcher').click();
  await page.waitForSelector('.simulation-focus-modal.active', { timeout: waitMs });
  await page.locator('.simulation-focus-row').filter({ hasText: 'Repel Room' }).first().click();
}

async function readRecoveryState(page) {
  return page.evaluate(() => ({
    href: window.location.href,
    activeId: document.querySelector('.simulation-focus-switcher')?.dataset.simulationId || '',
    homeMode: window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.()?.mode || '',
    dailyStage: document.querySelector('#simulation-stage')?.dataset.simulationId || '',
    switchState: window.__ABS_SIMULATION_SWITCH__ || null,
    loadState: window.__ABS_DAILY_RUNTIME_LOAD__ || null,
    storedChoice: sessionStorage.getItem('abs_simulation_focus_choice_v1'),
    transitionPhase: document.documentElement.dataset.absTransitionPhase || 'idle',
    focusPhase: document.documentElement.dataset.absSimulationFocusTransition || 'idle',
    readyEvents: window.__ABS_READY_EVENTS__ || [],
  }));
}

async function waitForRestoredFlies(page) {
  await page.waitForFunction(() => (
    window.__ABS_SIMULATION_SWITCH__?.status === 'failed'
    && window.__ABS_HOME_AUDIT__?.getRuntimeSnapshot?.()?.mode === 'flies'
    && document.querySelector('.simulation-focus-switcher')?.dataset.simulationId === 'flies'
    && !document.querySelector('#simulation-stage')
    && !document.documentElement.dataset.absSimulationFocusTransition
  ), { timeout: waitMs });
}

async function createPage(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    colorScheme: 'dark',
    reducedMotion: 'reduce',
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
  const browser = await chromium.launch();
  const proof = {};

  try {
    {
      const { context, page } = await createPage(browser);
      await page.route('**/RepelRoomRuntime.jsx*', (route) => route.abort('failed'));
      await page.goto(url('/lab/repel-room.html?daily=1'), { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('.daily-focus-runtime-status[data-runtime-status="failed"]', {
        timeout: waitMs,
      });
      await page.waitForFunction(() => (
        document.documentElement.dataset.absBootState !== 'booting'
        && !document.getElementById('abs-boot-overlay')
      ), { timeout: waitMs });
      const failureUi = await page.locator('.daily-focus-runtime-status[data-runtime-status="failed"]').evaluate((element) => ({
        text: element.textContent?.replace(/\s+/g, ' ').trim() || '',
        retryVisible: Boolean(element.querySelector('button')?.getBoundingClientRect().width),
      }));
      assert(failureUi.retryVisible && failureUi.text.includes('Retry'), 'Direct-load failure did not expose retry UI', failureUi);
      await page.unroute('**/RepelRoomRuntime.jsx*');
      await page.locator('.daily-focus-runtime-status button').click();
      await page.waitForFunction(() => (
        document.querySelector('#simulation-stage')?.dataset.simulationId === 'repel-room'
        && document.querySelector('#repel-room-canvas')?.width >= 64
      ), { timeout: waitMs });
      proof.directFailureExposedRetry = failureUi;
      await context.close();
    }

    {
      const { context, page } = await createPage(browser);
      await page.route('**/RepelRoomRuntime.jsx*', (route) => route.abort('failed'));
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
      await chooseRepelRoom(page);
      await waitForRestoredFlies(page);
      const timeoutState = await readRecoveryState(page);
      assert(!timeoutState.readyEvents.includes('repel-room'), 'Timed-out runtime dispatched route-ready', timeoutState);
      assert(timeoutState.activeId === 'flies' && timeoutState.homeMode === 'flies', 'Readiness timeout did not roll back', timeoutState);
      proof.readinessTimeoutRolledBack = timeoutState;

      await page.evaluate(() => {
        delete window.__ABS_AUDIT_FORCE_DAILY_NOT_READY__;
        window.__ABS_SIMULATION_SWITCH__ = null;
      });
      await chooseRepelRoom(page);
      await page.waitForFunction(() => (
        window.__ABS_SIMULATION_SWITCH__?.status === 'ready'
        && document.querySelector('#simulation-stage')?.dataset.simulationId === 'repel-room'
        && document.querySelector('.simulation-focus-switcher')?.dataset.simulationId === 'repel-room'
      ), { timeout: waitMs });
      await page.waitForFunction(() => (
        (document.documentElement.dataset.absTransitionPhase || 'idle') === 'idle'
        && (document.documentElement.dataset.absSimulationFocusTransition || 'idle') === 'idle'
        && !document.documentElement.classList.contains('simulation-focus-modal-open')
      ), { timeout: waitMs });
      const successState = await readRecoveryState(page);
      assert(!requestedUrls.some((requestUrl) => requestUrl.includes('/lab/config/')), 'Route-relative config request still occurs', {
        offending: requestedUrls.filter((requestUrl) => requestUrl.includes('/lab/config/')),
      });
      proof.retryReachedTarget = successState;
      proof.routeRelativeConfigRequests = 0;
      await context.close();
    }

    console.log(JSON.stringify({ ok: true, proof }, null, 2));
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exitCode = 1;
});
