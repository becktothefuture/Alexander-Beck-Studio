import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import net from 'node:net';
import { once } from 'node:events';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { startProductionPreview } from './lib/release-smoke-helpers.mjs';

const repoRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const unknownPath = '/__abs-unknown-route__';

async function reservePort() {
  const server = net.createServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : null;
  server.close();
  await once(server, 'close');
  if (!port) throw new Error('Could not reserve a local port.');
  return port;
}

async function proxyResponse(response, target) {
  target.statusCode = response.status;
  response.headers.forEach((value, key) => {
    if (!['content-encoding', 'content-length', 'transfer-encoding'].includes(key)) {
      target.setHeader(key, value);
    }
  });
  target.end(Buffer.from(await response.arrayBuffer()));
}

const previewPort = await reservePort();
const fallbackPort = await reservePort();
const fallbackOrigin = `http://127.0.0.1:${fallbackPort}`;
let preview;

const fallbackServer = createServer(async (request, response) => {
  try {
    const requestUrl = new URL(request.url || '/', fallbackOrigin);
    const upstreamPath = requestUrl.pathname === unknownPath
      ? `/index.html${requestUrl.search}`
      : `${requestUrl.pathname}${requestUrl.search}`;
    const upstream = await fetch(`${preview.baseUrl}${upstreamPath}`);
    await proxyResponse(upstream, response);
  } catch (error) {
    response.statusCode = 502;
    response.end(error instanceof Error ? error.message : String(error));
  }
});

let browser;
let page;
const consoleErrors = [];
const requestFailures = [];
try {
  preview = await startProductionPreview({
    repoRoot,
    host: '127.0.0.1',
    port: previewPort,
  });
  fallbackServer.listen(fallbackPort, '127.0.0.1');
  await once(fallbackServer, 'listening');

  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  const pageErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', (request) => {
    requestFailures.push({
      url: request.url(),
      error: request.failure()?.errorText || 'unknown',
    });
  });

  const response = await page.goto(`${fallbackOrigin}${unknownPath}`, {
    waitUntil: 'domcontentloaded',
    timeout: 30_000,
  });
  assert.equal(response?.status(), 200, 'fallback host did not return the app shell');
  await page.locator('#app-frame').waitFor({ state: 'visible', timeout: 30_000 });
  await page.locator('#abs-boot-overlay').waitFor({ state: 'detached', timeout: 30_000 });

  const state = await page.evaluate((path) => ({
    pathname: window.location.pathname,
    activeRoute: document.querySelector('[data-route-tab][aria-current="page"]')?.dataset.routeTab || null,
    unknownSpaAccepted: window.__ABS_SPA_NAVIGATE__?.(`${path}-spa`, {}) ?? null,
    bootState: document.documentElement.dataset.absBootState || null,
  }), unknownPath);

  assert.deepEqual(pageErrors, [], `unknown fallback boot raised page errors: ${pageErrors.join('; ')}`);
  assert.deepEqual(consoleErrors, [], `unknown fallback boot logged console errors: ${consoleErrors.join('; ')}`);
  assert.deepEqual(requestFailures, [], 'unknown fallback boot had failed requests');
  assert.equal(state.pathname, unknownPath, 'the app claimed or rewrote the host-owned unknown URL');
  assert.equal(state.activeRoute, 'home', 'the fallback shell did not settle on its safe Home view');
  assert.equal(state.unknownSpaAccepted, false, 'the SPA bridge accepted a host-owned unknown URL');
  assert.notEqual(state.bootState, 'booting', 'the fallback shell remained in its booting state');

  console.log('PASS: unknown fallback URL boots safely and remains host-owned');
} catch (error) {
  const state = await page?.evaluate(() => ({
    pathname: window.location.pathname,
    bootState: document.documentElement.dataset.absBootState || null,
    shellRoute: document.documentElement.dataset.shellRoute || null,
    rootPresent: Boolean(document.getElementById('root')),
    appFramePresent: Boolean(document.getElementById('app-frame')),
    bootOverlayPresent: Boolean(document.getElementById('abs-boot-overlay')),
    bodyText: document.body?.innerText?.slice(0, 500) || '',
  })).catch(() => null);
  error.message += `\nFallback state:\n${JSON.stringify({
    state,
    consoleErrors,
    requestFailures,
  }, null, 2)}`;
  const previewLogs = preview?.getLogs?.() || '';
  if (previewLogs) error.message += `\nProduction preview logs:\n${previewLogs}`;
  throw error;
} finally {
  await browser?.close();
  if (fallbackServer.listening) {
    await new Promise((resolveClose, rejectClose) => {
      fallbackServer.close((error) => (error ? rejectClose(error) : resolveClose()));
    });
  }
  await preview?.stop();
}
