#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                         LOCAL LIVE RELOAD SERVER                             ║
// ║                                                                              ║
// ║  Zero-dependency, local-only live reload via Server-Sent Events (SSE).       ║
// ║                                                                              ║
// ║  - Runs on http://localhost:8003                                             ║
// ║  - Watches source/ and dist/ (if present)                                     ║
// ║  - Broadcasts "reload" events to connected browsers                          ║
// ║                                                                              ║
// ║  Privacy: no external calls, no telemetry.                                   ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.LIVE_RELOAD_PORT || 8003);
const ROOT = path.join(__dirname, '..');

const WATCH_TARGETS = [
  path.join(ROOT, 'source'),
  path.join(ROOT, 'dist'),
];

const clients = new Set();
let reloadTimer = null;
let lastReloadAt = 0;

function log(...args) {
  // Keep logs readable; this is dev-only tooling.
  console.log('[live-reload]', ...args);
}

function sendSse(res, event, data) {
  // SSE format: event + data lines, blank line to flush.
  if (event) res.write(`event: ${event}\n`);
  const lines = String(data ?? '').split('\n');
  for (const line of lines) res.write(`data: ${line}\n`);
  res.write('\n');
}

function broadcastReload(reason) {
  lastReloadAt = Date.now();
  for (const res of clients) {
    try {
      sendSse(res, 'message', JSON.stringify({ type: 'reload', reason, ts: lastReloadAt }));
    } catch (e) {
      // Ignore broken sockets; they’ll be cleaned up by 'close'.
    }
  }
}

function scheduleReload(reason) {
  // Debounce rebuild storms (Rollup + CSS writes) into a single reload.
  if (reloadTimer) clearTimeout(reloadTimer);
  reloadTimer = setTimeout(() => {
    reloadTimer = null;
    broadcastReload(reason);
  }, 150);
}

function shouldIgnoreFsEvent(filePath) {
  if (!filePath) return true;
  const p = String(filePath);
  if (p.includes(`${path.sep}.git${path.sep}`)) return true;
  if (p.includes(`${path.sep}node_modules${path.sep}`)) return true;
  if (p.endsWith('.map')) return true; // sourcemaps churn a lot
  if (p.endsWith('.DS_Store')) return true;
  return false;
}

function watchRecursiveIfPossible(targetDir) {
  if (!fs.existsSync(targetDir)) return null;
  try {
    // On macOS and Windows, recursive watching works. On Linux it often doesn't.
    const watcher = fs.watch(targetDir, { recursive: true }, (eventType, filename) => {
      const fullPath = filename ? path.join(targetDir, filename) : targetDir;
      if (shouldIgnoreFsEvent(fullPath)) return;
      scheduleReload(`${eventType}:${path.relative(ROOT, fullPath)}`);
    });
    watcher.on('error', (err) => {
      log(`watch error on ${path.relative(ROOT, targetDir)}:`, err?.message || err);
    });
    log(`watching (recursive): ${path.relative(ROOT, targetDir)}`);
    return watcher;
  } catch (e) {
    log(`failed to watch ${path.relative(ROOT, targetDir)}:`, e?.message || e);
    return null;
  }
}

function startServer() {
  const server = http.createServer((req, res) => {
    // Very small surface area.
    if (req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, port: PORT, clients: clients.size, lastReloadAt }));
      return;
    }

    if (req.url !== '/events') {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }

    // SSE: keep-alive connection.
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*', // local dev convenience
    });
    res.write('\n');

    clients.add(res);
    log(`client connected (${clients.size})`);

    // Initial hello so client knows it’s live.
    sendSse(res, 'message', JSON.stringify({ type: 'hello', ts: Date.now() }));

    const heartbeat = setInterval(() => {
      try {
        // Comment line = heartbeat (keeps proxies from closing the stream).
        res.write(`: ping ${Date.now()}\n\n`);
      } catch (e) {}
    }, 15000);

    req.on('close', () => {
      clearInterval(heartbeat);
      clients.delete(res);
      log(`client disconnected (${clients.size})`);
    });
  });

  server.on('error', (err) => {
    if (err?.code === 'EADDRINUSE') {
      console.error(`❌ Live reload server: Port ${PORT} already in use`);
      process.exit(1);
    }
    console.error('❌ Live reload server error:', err);
    process.exit(1);
  });

  server.listen(PORT, () => {
    log(`running on http://localhost:${PORT}`);
    log('SSE endpoint:', `http://localhost:${PORT}/events`);
  });

  // Graceful shutdown
  process.on('SIGINT', () => {
    log('stopping...');
    try {
      for (const res of clients) {
        try {
          sendSse(res, 'message', JSON.stringify({ type: 'shutdown', ts: Date.now() }));
        } catch (e) {}
        try {
          res.end();
        } catch (e) {}
      }
      clients.clear();
    } catch (e) {}

    server.close(() => process.exit(0));
  });

  return server;
}

function main() {
  startServer();

  const watchers = [];
  for (const target of WATCH_TARGETS) {
    const w = watchRecursiveIfPossible(target);
    if (w) watchers.push(w);
  }

  if (!watchers.length) {
    log('warning: no watch targets found (expected source/ and/or dist/)');
  }
}

main();

