#!/usr/bin/env node
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { chromium } from 'playwright';
import {
  RELEASE_SMOKE_ROUTES,
  assertHomeCanvasBackingStore,
  assertRepresentativeKeyboardFocus,
  assertRouteIdentity,
  assertRouteSemanticContract,
  assertStableSimulationsNode,
  assertSmoke,
  buildReleaseSmokeSuccessReport,
  captureStableSimulationsNode,
  readRouteState,
  routeUrl,
  startProductionPreview,
  waitForProductionPreview,
  waitForRouteReady,
} from './lib/release-smoke-helpers.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = resolve(repoRoot, 'output/playwright/release-smoke');
const host = String(process.env.ABS_RELEASE_SMOKE_HOST || '127.0.0.1');
const port = Number(process.env.ABS_RELEASE_SMOKE_PORT || 8015);
const externalUrl = String(process.env.ABS_RELEASE_SMOKE_URL || '').trim().replace(/\/+$/, '');
const waitMs = Number(process.env.ABS_RELEASE_SMOKE_WAIT_MS || 30_000);
const overallTimeoutMs = Number(process.env.ABS_RELEASE_SMOKE_OVERALL_TIMEOUT_MS || 420_000);
const forcedFailure = String(process.env.ABS_RELEASE_SMOKE_FORCE_FAILURE || '').trim();
const viewport = Object.freeze({ width: 1280, height: 900 });

let browser = null;
let context = null;
let currentPage = null;
let preview = null;
let currentRouteId = 'startup';
let currentAssertion = 'preview-start';
const pageErrors = [];
const consoleErrors = [];
const failedResponses = [];
const failedRequests = [];
const results = [];

// Production routes are expected to emit no console errors. Add an entry only for a
// stable, understood browser message, with the exact route and message documented.
const CONSOLE_ERROR_ALLOWLIST = Object.freeze([]);

function elapsedMs(startedAt) {
  return Math.round(performance.now() - startedAt);
}

function attachPageDiagnostics(page) {
  page.on('pageerror', (error) => {
    pageErrors.push({ routeId: currentRouteId, message: error.message, stack: error.stack || '' });
  });
  page.on('console', (message) => {
    if (message.type() !== 'error') return;
    consoleErrors.push({ routeId: currentRouteId, text: message.text(), location: message.location() });
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    failedResponses.push({
      routeId: currentRouteId,
      status: response.status(),
      url: response.url(),
      method: response.request().method(),
      resourceType: response.request().resourceType(),
    });
  });
  page.on('requestfailed', (request) => {
    failedRequests.push({
      routeId: currentRouteId,
      url: request.url(),
      method: request.method(),
      resourceType: request.resourceType(),
      errorText: request.failure()?.errorText || 'request failed',
    });
  });
}

async function createPage() {
  const page = await context.newPage();
  attachPageDiagnostics(page);
  currentPage = page;
  return page;
}

async function maybeForceFailure(routeId, assertion) {
  if (forcedFailure !== `${routeId}:${assertion}`) return;
  assertSmoke(false, routeId, assertion, { forcedBy: 'ABS_RELEASE_SMOKE_FORCE_FAILURE' });
}

function assertNoUnexpectedConsoleErrors(routeId) {
  const routeErrors = consoleErrors.filter((entry) => entry.routeId === routeId);
  const unexpected = routeErrors.filter((entry) => !CONSOLE_ERROR_ALLOWLIST.some((allowed) => (
    allowed.routeId === entry.routeId && allowed.text === entry.text
  )));
  assertSmoke(unexpected.length === 0, routeId, 'unexpected-console-error', {
    unexpected,
    allowlist: CONSOLE_ERROR_ALLOWLIST,
  });
}

function assertNoFailedResources(routeId) {
  const responses = failedResponses.filter((entry) => entry.routeId === routeId);
  const requests = failedRequests.filter((entry) => entry.routeId === routeId);
  assertSmoke(responses.length === 0 && requests.length === 0, routeId, 'failed-resource-request', {
    responses,
    requests,
  });
}

async function auditDirectLoad(baseUrl, route) {
  const startedAt = performance.now();
  currentRouteId = route.id;
  currentAssertion = 'direct-load';
  const page = await createPage();
  await page.goto(routeUrl(baseUrl, route.requestPath || route.path), { waitUntil: 'domcontentloaded', timeout: waitMs });
  await waitForRouteReady(page, route, waitMs);
  const state = await assertRouteIdentity(page, route);
  let canvas = null;
  let semantics = null;
  let focus = null;
  if (route.id === 'home') canvas = await assertHomeCanvasBackingStore(page);
  if (route.semanticContract) {
    semantics = await assertRouteSemanticContract(page, route);
  }
  if (route.representativeFocus) {
    focus = await assertRepresentativeKeyboardFocus(page, route);
  }
  currentAssertion = 'artifact-probe';
  await maybeForceFailure(route.id, currentAssertion);
  assertSmoke(pageErrors.length === 0, route.id, 'uncaught-page-error', { pageErrors });
  assertNoUnexpectedConsoleErrors(route.id);
  assertNoFailedResources(route.id);
  results.push({
    phase: 'direct',
    routeId: route.id,
    durationMs: elapsedMs(startedAt),
    state,
    canvas,
    semantics,
    focus,
  });
  await page.close();
}

async function auditSpaNavigation(baseUrl) {
  const home = RELEASE_SMOKE_ROUTES.find((route) => route.id === 'home');
  const destinations = RELEASE_SMOKE_ROUTES.filter((route) => route.id !== 'home');
  const page = await createPage();
  currentRouteId = 'home';
  currentAssertion = 'spa-home-boot';
  await page.goto(routeUrl(baseUrl, home.requestPath || home.path), { waitUntil: 'domcontentloaded', timeout: waitMs });
  await waitForRouteReady(page, home, waitMs);
  await assertRouteIdentity(page, home);
  await assertRouteSemanticContract(page, home);
  await captureStableSimulationsNode(page);
  await assertStableSimulationsNode(page, home.id);
  const documentId = await page.evaluate(() => {
    window.__ABS_RELEASE_SMOKE_DOCUMENT_ID__ ||= crypto.randomUUID();
    return window.__ABS_RELEASE_SMOKE_DOCUMENT_ID__;
  });

  for (const destination of destinations) {
    const startedAt = performance.now();
    currentRouteId = destination.id;
    currentAssertion = 'spa-navigation';
    await page.locator(`[data-route-tab="${destination.id}"]`).click();
    await waitForRouteReady(page, destination, waitMs);
    await assertRouteIdentity(page, destination);
    await assertRouteSemanticContract(page, destination);
    await assertStableSimulationsNode(
      page,
      destination.id,
      destination.renderedRouteId || destination.id,
    );
    assertSmoke(
      await page.evaluate((expected) => window.__ABS_RELEASE_SMOKE_DOCUMENT_ID__ === expected, documentId),
      destination.id,
      'spa-document-preserved',
    );

    currentRouteId = 'home';
    currentAssertion = `spa-return-from-${destination.id}`;
    const spaReturnStarted = await page.evaluate((href) => {
      if (typeof window.__ABS_SPA_NAVIGATE__ !== 'function') return false;
      window.__ABS_SPA_NAVIGATE__(href, {
        source: 'release-smoke',
        preemptTransition: true,
      });
      return true;
    }, home.requestPath || home.path);
    assertSmoke(spaReturnStarted, 'home', `spa-return-api-from-${destination.id}`);
    await waitForRouteReady(page, home, waitMs);
    await assertRouteIdentity(page, home);
    await assertRouteSemanticContract(page, home);
    await assertStableSimulationsNode(page, home.id);
    await assertHomeCanvasBackingStore(page);
    assertSmoke(
      await page.evaluate((expected) => window.__ABS_RELEASE_SMOKE_DOCUMENT_ID__ === expected, documentId),
      'home',
      `spa-return-document-preserved-from-${destination.id}`,
    );
    results.push({
      phase: 'spa-return',
      routeId: destination.id,
      durationMs: elapsedMs(startedAt),
    });
  }
  assertSmoke(pageErrors.length === 0, 'spa', 'uncaught-page-error', { pageErrors });
  for (const routeId of new Set(consoleErrors.map((entry) => entry.routeId))) {
    assertNoUnexpectedConsoleErrors(routeId);
  }
  for (const routeId of new Set([
    ...failedResponses.map((entry) => entry.routeId),
    ...failedRequests.map((entry) => entry.routeId),
  ])) {
    assertNoFailedResources(routeId);
  }
}

async function saveFailureArtifacts(error, baseUrl, runId) {
  const outputDir = resolve(outputRoot, runId);
  await mkdir(outputDir, { recursive: true });
  const routeId = error.routeId || currentRouteId;
  const assertion = error.assertion || currentAssertion;
  const diagnostics = {
    failedAt: new Date().toISOString(),
    routeId,
    assertion,
    message: error.message,
    details: error.details || null,
    stack: error.stack || '',
    baseUrl,
    pageUrl: currentPage?.url() || '',
    routeState: currentPage && !currentPage.isClosed()
      ? await readRouteState(currentPage).catch((stateError) => ({ readError: stateError.message }))
      : null,
    pageErrors,
    consoleErrors,
    failedResponses,
    failedRequests,
    previewLogs: preview?.getLogs?.() || '',
    completedResults: results,
  };
  await writeFile(resolve(outputDir, 'diagnostics.json'), `${JSON.stringify(diagnostics, null, 2)}\n`);
  if (currentPage && !currentPage.isClosed()) {
    await currentPage.screenshot({ path: resolve(outputDir, 'failure.png'), fullPage: true }).catch(() => {});
  }
  if (context) {
    await context.tracing.stop({ path: resolve(outputDir, 'trace.zip') }).catch(() => {});
  }
  return outputDir;
}

async function saveSuccessArtifact(summary, runId) {
  const outputDir = resolve(outputRoot, runId);
  await mkdir(outputDir, { recursive: true });
  await writeFile(resolve(outputDir, 'summary.json'), `${JSON.stringify(summary, null, 2)}\n`);
  return outputDir;
}

async function main() {
  const runStartedAt = performance.now();
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  let baseUrl = externalUrl;
  let watchdogId = 0;
  let summary = null;
  const runAudit = async () => {
    if (externalUrl) {
      await waitForProductionPreview(externalUrl);
    } else {
      preview = await startProductionPreview({ repoRoot, host, port });
      baseUrl = preview.baseUrl;
    }

    browser = await chromium.launch();
    context = await browser.newContext({ viewport });
    await context.addInitScript(() => {
      window.__ABS_RELEASE_SMOKE_EVENTS__ = { routeFailures: [], pageErrors: [] };
      const serializeFailure = (event) => ({
        type: event.type,
        routeId: event.detail?.routeId || '',
        message: event.detail?.error?.message || event.detail?.message || '',
      });
      window.addEventListener('abs:route-failed', (event) => {
        window.__ABS_RELEASE_SMOKE_EVENTS__.routeFailures.push(serializeFailure(event));
      });
      window.addEventListener('abs:daily-focus-failed', (event) => {
        window.__ABS_RELEASE_SMOKE_EVENTS__.routeFailures.push(serializeFailure(event));
      });
      window.addEventListener('error', (event) => {
        window.__ABS_RELEASE_SMOKE_EVENTS__.pageErrors.push({ message: event.message || 'window error' });
      });
      window.addEventListener('unhandledrejection', (event) => {
        window.__ABS_RELEASE_SMOKE_EVENTS__.pageErrors.push({
          message: event.reason?.message || String(event.reason || 'unhandled rejection'),
        });
      });
    });
    await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

    for (const route of RELEASE_SMOKE_ROUTES) {
      await auditDirectLoad(baseUrl, route);
    }
    await auditSpaNavigation(baseUrl);
    await context.tracing.stop();

    return buildReleaseSmokeSuccessReport({
      browser: 'chromium',
      preview: externalUrl ? 'external-production-preview' : `${host}:${port}`,
      baseUrl,
      viewport,
      durationMs: elapsedMs(runStartedAt),
      results,
    });
  };
  const watchdog = new Promise((_, reject) => {
    watchdogId = setTimeout(() => {
      const error = new Error(`Release smoke exceeded its ${overallTimeoutMs}ms internal limit.`);
      error.routeId = 'smoke';
      error.assertion = 'overall-watchdog';
      error.details = { overallTimeoutMs };
      reject(error);
    }, overallTimeoutMs);
  });
  try {
    summary = await Promise.race([runAudit(), watchdog]);
  } catch (error) {
    const artifactDir = await saveFailureArtifacts(error, baseUrl, runId).catch(() => null);
    const failureRouteId = error.routeId || currentRouteId;
    const failureAssertion = error.assertion || currentAssertion;
    console.error(
      `[release-smoke] ${failureRouteId}/${failureAssertion} failed: ${error.message}`
      + `\nFailure artifacts: ${artifactDir || 'could not be written'}`,
    );
    process.exitCode = 1;
  } finally {
    clearTimeout(watchdogId);
    await context?.close().catch(() => {});
    await browser?.close().catch(() => {});
    try {
      await preview?.stop();
    } catch (error) {
      console.error(`[release-smoke] preview/shutdown failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
  if (summary && !process.exitCode) {
    try {
      const artifactDir = await saveSuccessArtifact(summary, runId);
      console.log(JSON.stringify({ ...summary, artifactDir }, null, 2));
    } catch (error) {
      console.error(`[release-smoke] success-artifact/write failed: ${error.message}`);
      process.exitCode = 1;
    }
  }
}

await main();
