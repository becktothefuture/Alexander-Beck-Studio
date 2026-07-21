#!/usr/bin/env node

import { spawn, spawnSync } from 'node:child_process';
import { Resolver, resolve4 } from 'node:dns/promises';
import { open } from 'node:fs/promises';
import {
  access,
  chmod,
  mkdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import { request as httpsRequest } from 'node:https';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(SCRIPT_DIR, '..');
const APP_ROOT = join(REPO_ROOT, 'react-app', 'app');
const CACHE_DIR = join(REPO_ROOT, '.cache', 'studio');
const TOOL_DIR = join(CACHE_DIR, 'tools');
const STATE_PATH = join(CACHE_DIR, 'state.json');
const LOCK_PATH = join(CACHE_DIR, 'lifecycle.lock');
const LOCAL_DEV_LOG = join(CACHE_DIR, 'local-dev.log');
const PUBLIC_DEV_LOG = join(CACHE_DIR, 'public-dev.log');
const TUNNEL_LOG = join(CACHE_DIR, 'tunnel.log');

const LOCAL_DEV_PORT = 8012;
const PUBLIC_DEV_PORT = 8014;
const LOCAL_DEV_URL = `http://localhost:${LOCAL_DEV_PORT}`;
const PUBLIC_DEV_ORIGIN = `http://localhost:${PUBLIC_DEV_PORT}`;
const PUBLIC_DEV_TUNNEL_ORIGIN = `http://127.0.0.1:${PUBLIC_DEV_PORT}`;
const PROCESS_START_TIMEOUT_MS = 30_000;
const HTTP_TIMEOUT_MS = 4_000;
const QUICK_TUNNEL_PATTERN = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/i;
const PUBLIC_DNS_RESOLVER = new Resolver();
PUBLIC_DNS_RESOLVER.setServers(['1.1.1.1', '1.0.0.1']);

const useColour = Boolean(process.stdout.isTTY && !process.env.NO_COLOR);
const colour = (code, value) => (useColour ? `\u001b[${code}m${value}\u001b[0m` : value);
const good = (value) => colour('32', value);
const warn = (value) => colour('33', value);
const strong = (value) => colour('1', value);

function printHelp() {
  console.log(`${strong('Studio development and release CLI')}

Commands:
  npm run studio:dev       Start/reuse local Vite, start the safe public mirror, and open a tunnel
  npm run studio:status    Show server, tunnel, Git, and production-sync state
  npm run studio:stop      Stop only the processes started by studio:dev
  npm run studio:check     Run the canonical local production gate
  npm run studio:publish   Verify and push committed main-branch changes to trigger GitHub Pages

Options:
  npm run studio:publish -- --yes   Skip the final interactive push confirmation

Optional stable Cloudflare tunnel:
  ABS_DEV_TUNNEL_NAME=<name> ABS_DEV_PUBLIC_URL=https://<hostname> npm run studio:dev

Without those variables, studio:dev creates a temporary trycloudflare.com URL.`);
}

function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd || REPO_ROOT,
      env: options.env || process.env,
      stdio: options.stdio || 'inherit',
      shell: false,
    });
    child.on('error', rejectRun);
    child.on('close', (code, signal) => {
      if (code === 0) {
        resolveRun();
        return;
      }
      const detail = signal ? `signal ${signal}` : `exit code ${code}`;
      rejectRun(new Error(`${command} ${args.join(' ')} failed with ${detail}.`));
    });
  });
}

function capture(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd || REPO_ROOT,
    env: options.env || process.env,
    encoding: 'utf8',
    shell: false,
  });
  if (result.status !== 0) return null;
  return String(result.stdout || '').trim();
}

function isProcessRunning(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function processCommand(pid) {
  if (process.platform === 'win32') return '';
  return capture('ps', ['-p', String(pid), '-o', 'command=']) || '';
}

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function probe(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(options.timeoutMs || HTTP_TIMEOUT_MS),
    });
    return {
      reachable: true,
      ok: response.ok,
      status: response.status,
      text: await response.text(),
    };
  } catch (error) {
    return {
      reachable: false,
      ok: false,
      status: null,
      text: '',
      error,
    };
  }
}

function probeResolvedHttpsAddress(target, address) {
  return new Promise((resolveProbe) => {
    const request = httpsRequest({
      hostname: address,
      port: 443,
      path: `${target.pathname}${target.search}`,
      method: 'GET',
      servername: target.hostname,
      headers: {
        host: target.host,
        'user-agent': 'alexander-beck-studio-cli/1.0',
      },
      timeout: HTTP_TIMEOUT_MS,
    }, (response) => {
      const chunks = [];
      response.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const status = response.statusCode || null;
        resolveProbe({
          reachable: true,
          ok: status >= 200 && status < 300,
          status,
          text: Buffer.concat(chunks).toString('utf8'),
          location: response.headers.location || null,
        });
      });
    });
    request.on('timeout', () => request.destroy(new Error('Public probe timed out.')));
    request.on('error', (error) => resolveProbe({
      reachable: false,
      ok: false,
      status: null,
      text: '',
      error,
    }));
    request.end();
  });
}

async function probePublicUrl(url, redirectCount = 0) {
  const target = new URL(url);
  if (target.protocol !== 'https:') return probe(url);

  let addresses;
  try {
    addresses = await PUBLIC_DNS_RESOLVER.resolve4(target.hostname);
  } catch (publicDnsError) {
    try {
      addresses = await resolve4(target.hostname);
    } catch (error) {
      return { reachable: false, ok: false, status: null, text: '', error: error || publicDnsError };
    }
  }

  for (const address of addresses) {
    const result = await probeResolvedHttpsAddress(target, address);
    if (!result.reachable) continue;
    if (result.status >= 300 && result.status < 400 && result.location && redirectCount < 3) {
      return probePublicUrl(new URL(result.location, target).href, redirectCount + 1);
    }
    return result;
  }

  return { reachable: false, ok: false, status: null, text: '' };
}

function isStudioViteResponse(result) {
  return result.ok
    && result.text.includes('/@vite/client')
    && result.text.includes('Alexander Beck');
}

async function waitFor(check, message, timeoutMs = PROCESS_START_TIMEOUT_MS) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const value = await check();
    if (value) return value;
    await sleep(250);
  }
  throw new Error(message);
}

async function readState() {
  try {
    return JSON.parse(await readFile(STATE_PATH, 'utf8'));
  } catch (error) {
    if (error?.code === 'ENOENT') return null;
    throw new Error(`Could not read ${STATE_PATH}: ${error.message}`);
  }
}

async function writeState(state) {
  await mkdir(CACHE_DIR, { recursive: true });
  const temporaryPath = `${STATE_PATH}.${process.pid}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(state, null, 2)}\n`, { mode: 0o600 });
  await rename(temporaryPath, STATE_PATH);
}

async function acquireLifecycleLock() {
  await mkdir(CACHE_DIR, { recursive: true });

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const handle = await open(LOCK_PATH, 'wx', 0o600);
      await handle.writeFile(`${process.pid}\n`, 'utf8');
      return async () => {
        await handle.close().catch(() => {});
        await rm(LOCK_PATH, { force: true });
      };
    } catch (error) {
      if (error?.code !== 'EEXIST') throw error;
      const owner = Number.parseInt(await readFile(LOCK_PATH, 'utf8').catch(() => ''), 10);
      if (isProcessRunning(owner)) {
        throw new Error(`Another Studio lifecycle command is running (PID ${owner}).`);
      }
      await rm(LOCK_PATH, { force: true });
    }
  }

  throw new Error('Could not acquire the Studio lifecycle lock.');
}

async function spawnDetached(command, args, { env = process.env, logPath, marker }) {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(logPath, `[${new Date().toISOString()}] ${command} ${args.join(' ')}\n`, 'utf8');
  const logHandle = await open(logPath, 'a');
  const child = spawn(command, args, {
    cwd: REPO_ROOT,
    detached: process.platform !== 'win32',
    env,
    stdio: ['ignore', logHandle.fd, logHandle.fd],
    shell: false,
  });
  child.unref();
  await logHandle.close();
  if (!child.pid) throw new Error(`Failed to start ${command}.`);
  return { pid: child.pid, marker, logPath };
}

async function stopProcess(entry, label, { quiet = false } = {}) {
  const pid = entry?.pid;
  if (!isProcessRunning(pid)) return false;

  const command = processCommand(pid);
  if (entry.marker && command && !command.includes(entry.marker)) {
    throw new Error(`Refusing to stop PID ${pid}; it no longer looks like the managed ${label} process.`);
  }

  const signalTarget = process.platform === 'win32' ? pid : -pid;
  try {
    process.kill(signalTarget, 'SIGTERM');
  } catch {
    process.kill(pid, 'SIGTERM');
  }

  const stopped = await waitFor(
    async () => !isProcessRunning(pid),
    `${label} did not stop after SIGTERM.`,
    5_000,
  ).catch(() => false);

  if (!stopped && isProcessRunning(pid)) {
    try {
      process.kill(signalTarget, 'SIGKILL');
    } catch {
      process.kill(pid, 'SIGKILL');
    }
  }

  if (!quiet) console.log(`Stopped ${label}.`);
  return true;
}

async function stopFromState(state, options = {}) {
  await stopProcess(state?.tunnel, 'public tunnel', options);
  await stopProcess(state?.publicDev, 'public dev mirror', options);
  if (state?.localDev?.owned) {
    await stopProcess(state.localDev, 'local dev server', options);
  }
  await rm(STATE_PATH, { force: true });
}

async function ensureDependencies() {
  const vitePath = join(APP_ROOT, 'node_modules', 'vite', 'bin', 'vite.js');
  try {
    await access(vitePath);
  } catch {
    throw new Error('App dependencies are missing. Run npm run install:all first.');
  }
}

async function ensureLocalDev() {
  const existing = await probe(`${LOCAL_DEV_URL}/`);
  if (isStudioViteResponse(existing)) {
    return {
      owned: false,
      pid: null,
      marker: null,
      logPath: null,
      url: LOCAL_DEV_URL,
    };
  }
  if (existing.reachable) {
    throw new Error(`Port ${LOCAL_DEV_PORT} is already serving a different process.`);
  }

  console.log(`Starting local Vite on ${LOCAL_DEV_URL}...`);
  const processEntry = await spawnDetached(
    'npm',
    ['run', 'dev:react'],
    { logPath: LOCAL_DEV_LOG, marker: 'npm run dev:react' },
  );

  try {
    await waitFor(
      async () => isStudioViteResponse(await probe(`${LOCAL_DEV_URL}/`)),
      `Local Vite did not become ready. See ${LOCAL_DEV_LOG}.`,
    );
  } catch (error) {
    await stopProcess(processEntry, 'failed local dev server', { quiet: true }).catch(() => {});
    throw error;
  }

  return {
    ...processEntry,
    owned: true,
    url: LOCAL_DEV_URL,
  };
}

async function ensurePublicDev() {
  const existing = await probe(`${PUBLIC_DEV_ORIGIN}/`);
  if (existing.reachable) {
    throw new Error(`Port ${PUBLIC_DEV_PORT} is already in use. Stop that process before running studio:dev.`);
  }

  console.log(`Starting read-only public dev mirror on ${PUBLIC_DEV_ORIGIN}...`);
  const processEntry = await spawnDetached(
    'npm',
    [
      'run',
      'dev',
      '--prefix',
      'react-app/app',
      '--',
      '--host',
      '127.0.0.1',
      '--port',
      String(PUBLIC_DEV_PORT),
      '--strictPort',
    ],
    {
      env: {
        ...process.env,
        ABS_PUBLIC_DEV: '1',
      },
      logPath: PUBLIC_DEV_LOG,
      marker: 'npm run dev',
    },
  );

  try {
    await waitFor(
      async () => isStudioViteResponse(await probe(`${PUBLIC_DEV_ORIGIN}/`)),
      `The public dev mirror did not become ready. See ${PUBLIC_DEV_LOG}.`,
    );

    const blockedApi = await probe(`${PUBLIC_DEV_ORIGIN}/api/design-system/config`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        origin: PUBLIC_DEV_ORIGIN,
      },
      body: '{}',
    });
    if (blockedApi.status !== 404) {
      throw new Error(`Public dev safety check failed: /api returned ${blockedApi.status ?? 'no response'}, expected 404.`);
    }
  } catch (error) {
    await stopProcess(processEntry, 'failed public dev mirror', { quiet: true }).catch(() => {});
    throw error;
  }

  return {
    ...processEntry,
    owned: true,
    url: PUBLIC_DEV_ORIGIN,
  };
}

function cloudflaredAsset() {
  const platform = process.platform;
  const architecture = process.arch;

  if (platform === 'darwin' && architecture === 'arm64') return { name: 'cloudflared-darwin-arm64.tgz', archive: true };
  if (platform === 'darwin' && architecture === 'x64') return { name: 'cloudflared-darwin-amd64.tgz', archive: true };
  if (platform === 'linux' && architecture === 'arm64') return { name: 'cloudflared-linux-arm64', archive: false };
  if (platform === 'linux' && architecture === 'x64') return { name: 'cloudflared-linux-amd64', archive: false };

  throw new Error(`Automatic cloudflared setup is not supported on ${platform}/${architecture}. Set CLOUDFLARED_BIN explicitly.`);
}

async function download(url, destination) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(120_000),
  });
  if (!response.ok) throw new Error(`Download failed with HTTP ${response.status}: ${url}`);
  await writeFile(destination, Buffer.from(await response.arrayBuffer()), { mode: 0o600 });
}

async function ensureCloudflared() {
  const explicitPath = process.env.CLOUDFLARED_BIN?.trim();
  if (explicitPath) {
    await access(explicitPath);
    return explicitPath;
  }

  const pathBinary = capture('which', ['cloudflared']);
  if (pathBinary) return pathBinary;

  await mkdir(TOOL_DIR, { recursive: true });
  const binaryName = process.platform === 'win32' ? 'cloudflared.exe' : 'cloudflared';
  const binaryPath = join(TOOL_DIR, binaryName);
  try {
    await access(binaryPath);
    return binaryPath;
  } catch {
    // Download below.
  }

  const asset = cloudflaredAsset();
  const assetPath = join(TOOL_DIR, asset.name);
  const assetUrl = `https://github.com/cloudflare/cloudflared/releases/latest/download/${asset.name}`;
  console.log('Downloading cloudflared from the official Cloudflare release...');
  await download(assetUrl, assetPath);

  if (asset.archive) {
    await run('tar', ['-xzf', assetPath, '-C', TOOL_DIR]);
    await rm(assetPath, { force: true });
  } else {
    await rename(assetPath, binaryPath);
  }

  await chmod(binaryPath, 0o700);
  return binaryPath;
}

async function readQuickTunnelUrl() {
  try {
    const log = await readFile(TUNNEL_LOG, 'utf8');
    return log.match(QUICK_TUNNEL_PATTERN)?.[0] || null;
  } catch {
    return null;
  }
}

async function startTunnel() {
  const cloudflared = await ensureCloudflared();
  const tunnelName = process.env.ABS_DEV_TUNNEL_NAME?.trim();
  const configuredPublicUrl = process.env.ABS_DEV_PUBLIC_URL?.trim()?.replace(/\/$/, '');
  if (tunnelName && !configuredPublicUrl) {
    throw new Error('ABS_DEV_PUBLIC_URL is required when ABS_DEV_TUNNEL_NAME is set.');
  }

  const tunnelArgs = [
    'tunnel',
    '--no-autoupdate',
    '--protocol',
    'http2',
  ];
  const originArgs = [
    '--url',
    PUBLIC_DEV_TUNNEL_ORIGIN,
    '--http-host-header',
    `localhost:${PUBLIC_DEV_PORT}`,
  ];
  const args = tunnelName
    ? [...tunnelArgs, 'run', ...originArgs, tunnelName]
    : [...tunnelArgs, ...originArgs];
  const maximumAttempts = tunnelName ? 1 : 3;
  let lastError = null;

  for (let attempt = 1; attempt <= maximumAttempts; attempt += 1) {
    const retryLabel = attempt > 1 ? ` (attempt ${attempt}/${maximumAttempts})` : '';
    console.log(tunnelName
      ? `Starting named Cloudflare tunnel “${tunnelName}”...`
      : `Starting temporary Cloudflare tunnel${retryLabel}...`);
    const processEntry = await spawnDetached(cloudflared, args, {
      logPath: TUNNEL_LOG,
      marker: 'cloudflared',
    });

    try {
      const publicUrl = tunnelName
        ? configuredPublicUrl
        : await waitFor(
          readQuickTunnelUrl,
          `Cloudflare did not provide a public URL. See ${TUNNEL_LOG}.`,
        );

      await sleep(1_500);
      await waitFor(
        async () => isStudioViteResponse(await probePublicUrl(`${publicUrl}/`)),
        `The tunnel started but ${publicUrl} did not become ready. See ${TUNNEL_LOG}.`,
        60_000,
      );

      return {
        ...processEntry,
        owned: true,
        mode: tunnelName ? 'named' : 'quick',
        name: tunnelName || null,
        publicUrl,
      };
    } catch (error) {
      lastError = error;
      await stopProcess(processEntry, 'failed public tunnel', { quiet: true }).catch(() => {});
    }
  }

  throw lastError || new Error(`Cloudflare tunnel failed. See ${TUNNEL_LOG}.`);
}

async function studioDev() {
  const releaseLock = await acquireLifecycleLock();
  const started = [];
  try {
    await ensureDependencies();
    const existingState = await readState();
    if (
      existingState
      && isProcessRunning(existingState.publicDev?.pid)
      && isProcessRunning(existingState.tunnel?.pid)
      && isStudioViteResponse(await probePublicUrl(`${existingState.tunnel.publicUrl}/`))
    ) {
      console.log(`${good('Studio dev is already running.')}
Local:  ${existingState.localDev.url}
Public: ${existingState.tunnel.publicUrl}`);
      return;
    }
    if (existingState) await stopFromState(existingState, { quiet: true });

    const localDev = await ensureLocalDev();
    if (localDev.owned) started.push(localDev);
    const publicDev = await ensurePublicDev();
    started.push(publicDev);
    const tunnel = await startTunnel();
    started.push(tunnel);

    const state = {
      version: 1,
      startedAt: new Date().toISOString(),
      repoRoot: REPO_ROOT,
      localDev,
      publicDev,
      tunnel,
    };
    await writeState(state);

    console.log(`
${good(strong('Studio dev is ready.'))}
Local authoring: ${LOCAL_DEV_URL}
Public phone URL: ${tunnel.publicUrl}
About Me:        ${tunnel.publicUrl}/about.html

Edits update both Vite servers automatically. Production is unchanged.`);
    if (tunnel.mode === 'quick') {
      console.log(warn('This quick-tunnel URL lasts until studio:stop, a restart, or the computer goes offline.'));
      console.log(warn('A brand-new hostname can take up to a minute to resolve through some DNS providers.'));
    }
  } catch (error) {
    for (const entry of started.reverse()) {
      await stopProcess(entry, 'partially started Studio process', { quiet: true }).catch(() => {});
    }
    throw error;
  } finally {
    await releaseLock();
  }
}

function gitState() {
  const branch = capture('git', ['branch', '--show-current']) || '(detached)';
  const head = capture('git', ['rev-parse', '--short', 'HEAD']) || 'unknown';
  const originMain = capture('git', ['rev-parse', '--short', 'origin/main']);
  const dirtyEntries = (capture('git', ['status', '--porcelain', '--untracked-files=normal']) || '')
    .split('\n')
    .filter(Boolean);
  const divergence = capture('git', ['rev-list', '--left-right', '--count', 'origin/main...HEAD']);
  const [behind = 0, ahead = 0] = divergence
    ? divergence.split(/\s+/).map((value) => Number.parseInt(value, 10))
    : [0, 0];
  return { branch, head, originMain, dirtyEntries, behind, ahead };
}

async function studioStatus() {
  const state = await readState();
  const localProbe = await probe(`${LOCAL_DEV_URL}/`);
  const publicDevProbe = await probe(`${PUBLIC_DEV_ORIGIN}/`);
  const publicProbe = state?.tunnel?.publicUrl
    ? await probePublicUrl(`${state.tunnel.publicUrl}/`)
    : null;
  const git = gitState();

  console.log(`${strong('Studio status')}

Local authoring (${LOCAL_DEV_URL}): ${isStudioViteResponse(localProbe) ? good('running') : 'stopped'}
Safe public mirror (${PUBLIC_DEV_ORIGIN}): ${isStudioViteResponse(publicDevProbe) ? good('running') : 'stopped'}
Public tunnel: ${isStudioViteResponse(publicProbe || {}) ? good(state.tunnel.publicUrl) : 'stopped'}

Git branch: ${git.branch}
Local commit: ${git.head}
Tracked origin/main: ${git.originMain || 'unavailable'}
Sync: ${git.behind} behind, ${git.ahead} ahead
Working tree: ${git.dirtyEntries.length === 0 ? good('clean') : warn(`${git.dirtyEntries.length} changed/untracked path(s)`)}

Production rule: only a successful push to origin/main triggers the GitHub Pages deployment.`);
}

async function studioStop() {
  const releaseLock = await acquireLifecycleLock();
  try {
    const state = await readState();
    if (!state) {
      console.log('No managed Studio dev session is recorded.');
      return;
    }
    await stopFromState(state);
    console.log(good('Studio dev session stopped.'));
  } finally {
    await releaseLock();
  }
}

async function studioCheck() {
  console.log(strong('Running the canonical site gate...'));
  await run('npm', ['run', 'check:site']);
}

async function confirmPublish(ahead) {
  if (process.argv.includes('--yes')) return true;
  if (!process.stdin.isTTY) {
    throw new Error('Publishing needs confirmation. Re-run with: npm run studio:publish -- --yes');
  }
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(`Push ${ahead} commit(s) to origin/main and trigger production? [y/N] `);
    return /^y(es)?$/i.test(answer.trim());
  } finally {
    prompt.close();
  }
}

async function studioPublish() {
  const beforeFetch = gitState();
  if (beforeFetch.branch !== 'main') {
    throw new Error(`Production publishes only from main; current branch is ${beforeFetch.branch}.`);
  }
  if (beforeFetch.dirtyEntries.length > 0) {
    throw new Error('Commit or stash every working-tree change before publishing. Nothing was pushed.');
  }

  console.log('Refreshing origin/main...');
  await run('git', ['fetch', '--prune', 'origin', 'main']);
  const current = gitState();
  if (current.behind > 0) {
    throw new Error(`Local main is ${current.behind} commit(s) behind origin/main. Sync with git pull --ff-only first.`);
  }
  if (current.ahead === 0) {
    console.log('Local main already matches origin/main. There is nothing to publish.');
    return;
  }

  await studioCheck();
  if (!await confirmPublish(current.ahead)) {
    console.log('Publish cancelled. Nothing was pushed.');
    return;
  }

  await run('git', ['push', 'origin', 'main']);
  console.log(good('Push complete. GitHub Pages will deploy only after its production workflow passes.'));
}

async function main() {
  const command = process.argv[2] || 'help';
  switch (command) {
    case 'dev':
      await studioDev();
      break;
    case 'status':
      await studioStatus();
      break;
    case 'stop':
      await studioStop();
      break;
    case 'check':
      await studioCheck();
      break;
    case 'publish':
      await studioPublish();
      break;
    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;
    default:
      printHelp();
      throw new Error(`Unknown Studio command: ${command}`);
  }
}

main().catch((error) => {
  console.error(colour('31', `Studio CLI: ${error.message}`));
  process.exitCode = 1;
});
