import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { ROUTE_MANIFEST } from '../react-app/app/src/lib/route-manifest.js';

const dist = new URL('../react-app/app/dist/', import.meta.url);
const releaseIdPath = '/release-id.txt';
const primaryRoutes = Object.values(ROUTE_MANIFEST).filter((route) => route.shellTab);
const sharedFiles = ['/css/tokens.css', '/css/main.css', '/config/default-config.json'];
const assetReference = /\b(?:src|href)="(\/assets\/[^"?#]+\.(?:js|css))"/g;
const attempts = 12;
const retryDelayMs = 5_000;
const requestTimeoutMs = 10_000;

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

function publicPath(route) {
  return route.id === 'home' ? '/' : route.path;
}

function builtFile(pathname) {
  return new URL(pathname.slice(1), dist);
}

async function fingerprintRelease() {
  const commit = process.env.GITHUB_SHA;
  if (!/^[0-9a-f]{40}$/.test(commit ?? '')) {
    throw new Error('GITHUB_SHA must identify the commit being published.');
  }
  const releaseId = `${commit}\n`;
  await writeFile(builtFile(releaseIdPath), releaseId);
  const checksums = { [releaseIdPath]: sha256(releaseId) };
  const assets = new Set(sharedFiles);

  for (const route of primaryRoutes) {
    const html = await readFile(builtFile(route.path));
    checksums[publicPath(route)] = sha256(html);
    for (const [, asset] of html.toString().matchAll(assetReference)) assets.add(asset);
  }
  for (const pathname of assets) {
    checksums[pathname] = sha256(await readFile(builtFile(pathname)));
  }
  console.log(JSON.stringify(checksums));
}

async function checkFile(origin, pathname, expected, cacheKey) {
  const url = new URL(origin);
  url.pathname = pathname;
  url.searchParams.set('verify', cacheKey);
  const response = await fetch(url, { signal: AbortSignal.timeout(requestTimeoutMs) });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error(`${pathname} returned HTTP ${response.status}`);
  }
  const body = new Uint8Array(await response.arrayBuffer());
  if (sha256(body) !== expected) throw new Error(`${pathname} differs from the build`);
}

async function verifyRelease(origin) {
  const { [releaseIdPath]: releaseId, ...checksums } = JSON.parse(process.env.PAGES_RELEASE_CHECKSUMS ?? '{}');
  const requiredPaths = [...primaryRoutes.map(publicPath), ...sharedFiles];
  if (!releaseId || requiredPaths.some((pathname) => !checksums[pathname])) {
    throw new Error('PAGES_RELEASE_CHECKSUMS is missing release or required file fingerprints.');
  }

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const cacheKey = `${releaseId.slice(0, 12)}-${Date.now()}`;
    try {
      // Wait for the new release before requesting its pages and bundles.
      await checkFile(origin, releaseIdPath, releaseId, cacheKey);
      const results = await Promise.allSettled(Object.entries(checksums).map(([pathname, expected]) => (
        checkFile(origin, pathname, expected, cacheKey)
      )));
      const errors = results.filter((result) => result.status === 'rejected').map((result) => result.reason.message);
      if (errors.length) throw new Error(errors.join(', '));
      console.log(`Verified the release ID and ${results.length} files at ${origin}.`);
      return;
    } catch (error) {
      console.warn(`[pages-release] Attempt ${attempt}/${attempts}: ${error.message}`);
      if (attempt === attempts) throw new Error(`Could not verify the new release at ${origin}.`, { cause: error });
      await delay(retryDelayMs);
    }
  }
}

const [command, origin = 'https://www.beck.fyi'] = process.argv.slice(2);
switch (command) {
  case 'fingerprint':
    await fingerprintRelease();
    break;
  case 'verify':
    await verifyRelease(origin);
    break;
  default:
    throw new Error('Usage: node scripts/verify-pages-release.mjs fingerprint|verify [origin]');
}
