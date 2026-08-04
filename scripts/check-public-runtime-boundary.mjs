import { readdir, readFile, stat } from 'node:fs/promises';
import { extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const PUBLIC_ROOT = resolve(REPO_ROOT, 'react-app/app/public');
const CONFIG_ROOT = resolve(PUBLIC_ROOT, 'config');
const MAX_PUBLIC_BYTES = 40 * 1024 * 1024;
const MAX_SINGLE_FILE_BYTES = 10 * 1024 * 1024;

const FORBIDDEN_RUNTIME_PATHS = [
  'config/figma-tokens.json',
  'font-vibe-test.html',
  'images/palette-review',
  'images/realistic_noise.gif',
  'review',
  'video/archive',
  'video/under consideration',
];

const FORBIDDEN_RUNTIME_PATTERNS = [
  /^images\/portfolio\/pages\/chapter-7-\d+\.webp$/,
];

const MEDIA_EXTENSIONS = new Set([
  '.avif',
  '.bin',
  '.gif',
  '.glb',
  '.ico',
  '.jpeg',
  '.jpg',
  '.mp4',
  '.png',
  '.svg',
  '.webm',
  '.webp',
  '.woff',
  '.woff2',
]);

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...await walk(absolutePath));
      continue;
    }
    if (entry.isFile()) {
      files.push(absolutePath);
    }
  }

  return files;
}

async function pathExists(pathname) {
  try {
    await stat(pathname);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function collectMediaReferences(value, references = new Set()) {
  if (Array.isArray(value)) {
    value.forEach((entry) => collectMediaReferences(entry, references));
    return references;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((entry) => collectMediaReferences(entry, references));
    return references;
  }

  if (typeof value !== 'string' || !value.startsWith('/')) return references;
  const pathname = value.split(/[?#]/, 1)[0];
  if (MEDIA_EXTENSIONS.has(extname(pathname).toLowerCase())) {
    references.add(pathname);
  }
  return references;
}

const publicFiles = await walk(PUBLIC_ROOT);
const failures = [];
let publicBytes = 0;

for (const absolutePath of publicFiles) {
  const pathname = relative(PUBLIC_ROOT, absolutePath);
  const fileStat = await stat(absolutePath);
  publicBytes += fileStat.size;

  if (pathname.split('/').includes('.DS_Store')) {
    failures.push(`${pathname}: Finder metadata must not ship`);
  }
  if (FORBIDDEN_RUNTIME_PATTERNS.some((pattern) => pattern.test(pathname))) {
    failures.push(`${pathname}: source-only portfolio media must live in source-assets`);
  }
  if (fileStat.size > MAX_SINGLE_FILE_BYTES) {
    failures.push(`${pathname}: ${(fileStat.size / 1024 / 1024).toFixed(1)} MiB exceeds the 10 MiB runtime-file budget`);
  }
}

for (const pathname of FORBIDDEN_RUNTIME_PATHS) {
  if (await pathExists(resolve(PUBLIC_ROOT, pathname))) {
    failures.push(`${pathname}: source-only material must live outside public`);
  }
}

if (publicBytes > MAX_PUBLIC_BYTES) {
  failures.push(`public/: ${(publicBytes / 1024 / 1024).toFixed(1)} MiB exceeds the 40 MiB deploy budget`);
}

const configEntries = await readdir(CONFIG_ROOT, { withFileTypes: true });
const contentConfigs = configEntries
  .filter((entry) => entry.isFile() && /^contents-.*\.json$/.test(entry.name))
  .map((entry) => resolve(CONFIG_ROOT, entry.name));

const mediaReferences = new Set();
for (const configPath of contentConfigs) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  collectMediaReferences(config, mediaReferences);
}

for (const pathname of mediaReferences) {
  if (!await pathExists(resolve(PUBLIC_ROOT, `.${pathname}`))) {
    failures.push(`${pathname}: referenced by content config but missing from public`);
  }
}

if (failures.length > 0) {
  console.error('FAIL: public runtime boundary');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exitCode = 1;
} else {
  console.log(
    `PASS: public runtime boundary (${publicFiles.length} files, ${(publicBytes / 1024 / 1024).toFixed(1)} MiB, ${mediaReferences.size} content media references)`,
  );
}
