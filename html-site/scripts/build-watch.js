#!/usr/bin/env node
// ╔══════════════════════════════════════════════════════════════════════════════╗
// ║                          BUILD WATCH (POLLING)                               ║
// ║                                                                              ║
// ║  Reliable cross-platform file watcher that triggers rebuilds on changes.     ║
// ║                                                                              ║
// ║  Why polling?                                                                ║
// ║  - Some Node/fs-event stacks can fail silently (esp. with newer Node).       ║
// ║  - Polling is predictable and good enough for a static build pipeline.       ║
// ║                                                                              ║
// ║  Default behavior:                                                           ║
// ║  - Watches source/ recursively                                               ║
// ║  - On change: runs `npm run build:dev` (debounced)                            ║
// ║                                                                              ║
// ╚══════════════════════════════════════════════════════════════════════════════╝

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SOURCE_DIR = path.join(ROOT, 'source');

const POLL_MS = Number(process.env.ABS_WATCH_POLL_MS || 350);
const DEBOUNCE_MS = Number(process.env.ABS_WATCH_DEBOUNCE_MS || 150);

// Keep this conservative: include assets that the build copies, plus code + templates.
const WATCH_EXTS = new Set([
  '.js',
  '.json',
  '.css',
  '.html',
  '.svg',
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.woff',
  '.woff2',
  '.mp4',
]);

function log(...args) {
  console.log('[build-watch]', ...args);
}

function shouldIgnorePath(absPath) {
  const rel = path.relative(SOURCE_DIR, absPath);
  if (!rel || rel.startsWith('..')) return true;

  // Ignore dot-directories at any level (but allow dotfiles if needed).
  if (rel.split(path.sep).some(part => part.startsWith('.') && part.length > 1)) return true;

  // Avoid editor temp files.
  if (rel.endsWith('~')) return true;
  if (rel.endsWith('.swp')) return true;
  if (rel.endsWith('.tmp')) return true;

  return false;
}

async function listFilesRecursive(dir) {
  const out = [];
  const stack = [dir];

  while (stack.length) {
    const current = stack.pop();
    let entries = [];
    try {
      entries = await fs.promises.readdir(current, { withFileTypes: true });
    } catch (e) {
      continue;
    }

    for (const ent of entries) {
      const abs = path.join(current, ent.name);
      if (shouldIgnorePath(abs)) continue;

      if (ent.isDirectory()) {
        stack.push(abs);
        continue;
      }

      const ext = path.extname(ent.name).toLowerCase();
      if (!WATCH_EXTS.has(ext)) continue;

      out.push(abs);
    }
  }

  return out;
}

async function buildSnapshot() {
  const files = await listFilesRecursive(SOURCE_DIR);
  const map = new Map();
  for (const abs of files) {
    try {
      const st = await fs.promises.stat(abs);
      map.set(abs, st.mtimeMs);
    } catch (e) {}
  }
  return map;
}

function diffSnapshots(prev, next) {
  const changed = [];

  for (const [file, mtime] of next.entries()) {
    const prevMtime = prev.get(file);
    if (prevMtime === undefined) {
      changed.push(file);
      continue;
    }
    if (mtime !== prevMtime) changed.push(file);
  }

  for (const file of prev.keys()) {
    if (!next.has(file)) changed.push(file);
  }

  return changed;
}

let buildInFlight = false;
let buildQueued = false;
let debounceTimer = null;

function runBuild(changedFiles) {
  if (buildInFlight) {
    buildQueued = true;
    return;
  }

  buildInFlight = true;
  buildQueued = false;

  const preview = (changedFiles || [])
    .slice(0, 4)
    .map(f => path.relative(ROOT, f))
    .join(', ');

  log(`change detected → rebuilding${preview ? ` (${preview}${changedFiles.length > 4 ? ', …' : ''})` : ''}`);

  const child = spawn('npm', ['run', 'build:dev'], {
    cwd: ROOT,
    stdio: 'inherit',
    shell: true,
  });

  child.on('close', (code) => {
    buildInFlight = false;
    if (code === 0) {
      log('✅ build complete');
    } else {
      log(`❌ build failed (exit ${code})`);
    }

    if (buildQueued) {
      // Small delay to collapse rapid successive changes.
      setTimeout(() => runBuild([]), 50);
    }
  });
}

function scheduleBuild(changedFiles) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    runBuild(changedFiles);
  }, DEBOUNCE_MS);
}

async function main() {
  if (!fs.existsSync(SOURCE_DIR)) {
    console.error('❌ build-watch: missing source/ directory');
    process.exit(1);
  }

  log(`watching source/ (polling ${POLL_MS}ms, debounce ${DEBOUNCE_MS}ms)`);
  let prev = await buildSnapshot();

  setInterval(async () => {
    const next = await buildSnapshot();
    const changed = diffSnapshots(prev, next);
    prev = next;

    if (changed.length) scheduleBuild(changed);
  }, POLL_MS);

  process.on('SIGINT', () => {
    log('stopping...');
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('❌ build-watch fatal:', err);
  process.exit(1);
});

