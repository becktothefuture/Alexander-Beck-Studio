import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile, readdir, rm, mkdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:net';
import os from 'node:os';
import { basename, dirname, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { setTimeout as delay } from 'node:timers/promises';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium, webkit } from 'playwright';
import { ABOUT_NARRATIVE_SCHEMA_VERSION } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';
import {
  ABOUT_NARRATIVE_CORRESPONDENCE_VERSION,
  ABOUT_NARRATIVE_POINT_PROFILES,
  ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimeConstants.js';
import {
  ABOUT_NARRATIVE_CERTIFICATION_SCHEMA_VERSION,
  ABOUT_NARRATIVE_REQUIRED_EVIDENCE,
  ABOUT_NARRATIVE_REQUIREMENT_COVERAGE,
  validateAboutNarrativeCertificationManifest,
} from './lib/about-narrative-certification-manifest.mjs';

const require = createRequire(import.meta.url);
const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const evidenceRoot = resolve(repoRoot, 'output/playwright/about-narrative-hardening');
const certificationRoot = resolve(evidenceRoot, 'certification');
const logsRoot = resolve(certificationRoot, 'commands');
const manifestPath = resolve(certificationRoot, 'manifest.json');
const reviewPath = resolve(repoRoot, process.env.ABS_ABOUT_CERT_REVIEW_PATH || 'output/playwright/about-narrative-hardening/review/sign-off.json');
const host = '127.0.0.1';
const browserRetries = Math.max(0, Math.min(2, Number(process.env.ABS_ABOUT_CERT_BROWSER_RETRIES || 1)));
const runStartedAtMs = Date.now();
const runStartedAt = new Date(runStartedAtMs).toISOString();
const commands = [];
const servers = [];

const sourceExclusions = [
  `react-app${sep}app${sep}dist${sep}`,
  `react-app${sep}app${sep}dist-certify${sep}`,
  `output${sep}`,
];

function log(message) {
  console.log(`[about-certify] ${message}`);
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function commandOutput(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: repoRoot,
    encoding: 'utf8',
    env: { ...process.env, ...(options.env || {}) },
    maxBuffer: 20 * 1024 * 1024,
  });
}

function git(args) {
  const result = commandOutput('git', args);
  if (result.status !== 0) throw new Error(result.stderr || `git ${args.join(' ')} failed.`);
  return result.stdout.trim();
}

async function listFiles(root) {
  const output = [];
  async function visit(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const path = resolve(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) output.push(path);
    }
  }
  try {
    await visit(root);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  return output;
}

async function hashFiles(files, root = repoRoot) {
  const hash = createHash('sha256');
  for (const path of [...files].sort()) {
    hash.update(relative(root, path));
    hash.update('\0');
    try {
      hash.update(await readFile(path));
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      hash.update('<deleted>');
    }
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function sourceHash() {
  const result = commandOutput('git', ['ls-files', '-co', '--exclude-standard', '-z']);
  if (result.status !== 0) throw new Error(result.stderr || 'Could not enumerate source files.');
  const files = result.stdout.split('\0')
    .filter(Boolean)
    .filter((path) => !sourceExclusions.some((prefix) => path.startsWith(prefix)))
    .map((path) => resolve(repoRoot, path));
  return hashFiles(files);
}

async function artifactHash(path) {
  const files = await listFiles(path);
  return files.length ? hashFiles(files, path) : '';
}

async function hashLog(path, content) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, content, 'utf8');
  return sha256(content);
}

async function runAttempt(definition, attemptIndex) {
  const startedAtMs = Date.now();
  const startedAt = new Date(startedAtMs).toISOString();
  const logPath = resolve(logsRoot, `${definition.id}-attempt-${attemptIndex + 1}.log`);
  let output = '';
  log(`${definition.id}: attempt ${attemptIndex + 1}`);
  const child = spawn(definition.command, definition.args, {
    cwd: repoRoot,
    env: { ...process.env, ...(definition.env || {}) },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  for (const stream of [child.stdout, child.stderr]) {
    stream.on('data', (chunk) => {
      const text = chunk.toString();
      output += text;
      process.stdout.write(text);
    });
  }
  const exitCode = await new Promise((resolveExit, reject) => {
    child.once('error', reject);
    child.once('close', resolveExit);
  });
  const finishedAtMs = Date.now();
  const logSha256 = await hashLog(logPath, output);
  return {
    attempt: attemptIndex + 1,
    status: exitCode === 0 ? 'passed' : 'failed',
    exitCode,
    startedAt,
    finishedAt: new Date(finishedAtMs).toISOString(),
    durationMs: finishedAtMs - startedAtMs,
    logPath: relative(repoRoot, logPath),
    logSha256,
    logIntegrity: true,
  };
}

async function runCommand(definition) {
  const attempts = [];
  const maximumAttempts = 1 + (definition.retries || 0);
  for (let index = 0; index < maximumAttempts; index += 1) {
    const attempt = await runAttempt(definition, index);
    attempts.push(attempt);
    if (attempt.status === 'passed') break;
  }
  const result = {
    id: definition.id,
    required: true,
    category: definition.category,
    command: [definition.command, ...definition.args].join(' '),
    environment: definition.env || {},
    status: attempts.at(-1).status,
    attempts,
  };
  commands.push(result);
  return result;
}

async function recordSkippedCommand(definition, reason) {
  const logPath = resolve(logsRoot, `${definition.id}-attempt-1.log`);
  const content = `SKIPPED: ${reason}\n`;
  const logSha256 = await hashLog(logPath, content);
  commands.push({
    id: definition.id,
    required: true,
    category: definition.category,
    command: [definition.command, ...definition.args].join(' '),
    environment: definition.env || {},
    status: 'failed',
    skipped: true,
    attempts: [{
      attempt: 1,
      status: 'failed',
      exitCode: null,
      startedAt: new Date().toISOString(),
      finishedAt: new Date().toISOString(),
      durationMs: 0,
      logPath: relative(repoRoot, logPath),
      logSha256,
      logIntegrity: true,
    }],
  });
}

async function openPort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once('error', reject);
    server.listen(0, host, () => {
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : null;
      server.close((error) => error ? reject(error) : resolvePort(port));
    });
  });
}

async function startPreview({ id, outDir }) {
  const port = await openPort();
  const baseUrl = `http://${host}:${port}`;
  const args = ['run', 'preview', '--prefix', 'react-app/app', '--', '--host', host, '--port', String(port), '--strictPort'];
  if (outDir) args.push('--outDir', outDir);
  const child = spawn('npm', args, {
    cwd: repoRoot,
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  const startedAt = Date.now();
  let ready = false;
  while (Date.now() - startedAt < 20_000) {
    if (child.exitCode !== null) break;
    try {
      const response = await fetch(`${baseUrl}/lab/about-narrative.html`);
      if (response.ok) {
        ready = true;
        break;
      }
    } catch {
      // Preview has not bound yet.
    }
    await delay(200);
  }
  const serverLogPath = resolve(logsRoot, `${id}-server.log`);
  const serverLogSha256 = await hashLog(serverLogPath, output);
  const record = {
    id,
    baseUrl,
    command: ['npm', ...args].join(' '),
    ready,
    logPath: relative(repoRoot, serverLogPath),
    logSha256: serverLogSha256,
  };
  servers.push(record);
  if (!ready) {
    child.kill('SIGTERM');
    throw new Error(`${id} preview did not become ready. See ${record.logPath}.`);
  }
  return {
    ...record,
    async stop() {
      if (child.exitCode === null) child.kill('SIGTERM');
      await Promise.race([
        new Promise((resolveExit) => child.once('close', resolveExit)),
        delay(5_000),
      ]);
    },
  };
}

function command(id, category, executable, args, env = {}, retries = 0) {
  return { id, category, command: executable, args, env, retries };
}

async function runCommands(definitions) {
  for (const definition of definitions) await runCommand(definition);
}

async function runPreviewAudits(buildResult, previewOptions, definitions) {
  if (buildResult.status !== 'passed') {
    for (const definition of definitions('')) await recordSkippedCommand(definition, `${buildResult.id} failed.`);
    return;
  }
  let preview = null;
  try {
    preview = await startPreview(previewOptions);
    await runCommands(definitions(preview.baseUrl));
  } catch (error) {
    log(error.message);
    const recorded = new Set(commands.map((item) => item.id));
    for (const definition of definitions(preview?.baseUrl || '')) {
      if (!recorded.has(definition.id)) await recordSkippedCommand(definition, error.message);
    }
  } finally {
    await preview?.stop();
  }
}

function browserEnvironment(baseUrl, extra = {}) {
  return { ABS_BASE_URL: baseUrl, ...extra };
}

function certificationAuditCommands(baseUrl) {
  return [
    command('hot-frame-audit', 'runtime', 'node', ['scripts/audit-about-narrative-hot-frame.mjs'], browserEnvironment(baseUrl), browserRetries),
    command('runtime-fault-audit', 'runtime', 'node', ['scripts/audit-about-narrative-runtime-faults.mjs'], browserEnvironment(baseUrl), browserRetries),
    command('runtime-soak-desktop', 'runtime', 'node', ['scripts/audit-about-narrative-runtime-soak.mjs'], browserEnvironment(baseUrl, { ABS_ABOUT_SOAK_PROFILE: 'desktop' }), browserRetries),
    command('runtime-soak-mobile', 'runtime', 'node', ['scripts/audit-about-narrative-runtime-soak.mjs'], browserEnvironment(baseUrl, { ABS_ABOUT_SOAK_PROFILE: 'mobile' }), browserRetries),
    command('runtime-visual-audit', 'visual', 'node', ['scripts/audit-about-narrative-runtime-visuals.mjs'], browserEnvironment(baseUrl), browserRetries),
    command('certification-chromium-audit', 'browser', 'node', ['scripts/audit-about-narrative.mjs'], browserEnvironment(baseUrl, { ABS_BROWSER: 'chromium', ABS_ABOUT_EDITOR_ONLY: '1' }), browserRetries),
    command('certification-webkit-audit', 'browser', 'node', ['scripts/audit-about-narrative.mjs'], browserEnvironment(baseUrl, { ABS_BROWSER: 'webkit', ABS_ABOUT_EDITOR_ONLY: '1' }), browserRetries),
  ];
}

function productionAuditCommands(baseUrl) {
  return [
    command('production-chromium-audit', 'production', 'node', ['scripts/audit-about-narrative.mjs'], browserEnvironment(baseUrl, { ABS_BROWSER: 'chromium', ABS_ABOUT_PRODUCTION_INDICATOR_ONLY: '1' }), browserRetries),
    command('production-webkit-audit', 'production', 'node', ['scripts/audit-about-narrative.mjs'], browserEnvironment(baseUrl, { ABS_BROWSER: 'webkit', ABS_ABOUT_PRODUCTION_INDICATOR_ONLY: '1' }), browserRetries),
  ];
}

async function collectEvidence(freshSinceMs = runStartedAtMs) {
  const evidence = [];
  for (const requirement of ABOUT_NARRATIVE_REQUIRED_EVIDENCE) {
    const path = resolve(repoRoot, requirement.path);
    try {
      const metadata = await stat(path);
      evidence.push({
        id: requirement.id,
        path: requirement.path,
        exists: metadata.isFile(),
        sizeBytes: metadata.size,
        sha256: metadata.isFile() ? sha256(await readFile(path)) : '',
        modifiedAt: metadata.mtime.toISOString(),
        fresh: metadata.mtimeMs >= freshSinceMs - 1_000,
      });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      evidence.push({ id: requirement.id, path: requirement.path, exists: false, sizeBytes: 0, sha256: '', modifiedAt: null, fresh: false });
    }
  }
  return evidence;
}

async function loadReview() {
  try {
    return JSON.parse(await readFile(reviewPath, 'utf8'));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      return { approved: false, error: `Review could not be read: ${error.message}` };
    }
    return { approved: false, missing: true, expectedPath: relative(repoRoot, reviewPath) };
  }
}

function gpuDescription() {
  if (process.platform !== 'darwin') return process.env.ABS_CERT_GPU || 'unknown';
  const result = commandOutput('system_profiler', ['SPDisplaysDataType', '-json']);
  if (result.status !== 0) return process.env.ABS_CERT_GPU || 'unknown';
  try {
    const parsed = JSON.parse(result.stdout);
    return (parsed.SPDisplaysDataType || [])
      .map((item) => item.sppci_model || item._name)
      .filter(Boolean)
      .join(', ') || 'unknown';
  } catch {
    return 'unknown';
  }
}

function browserDescription(type, name) {
  const executable = type.executablePath();
  const revision = executable.split(sep).find((part) => new RegExp(`^${name}-\\d+$`, 'u').test(part));
  return `${revision || basename(executable)} (${executable})`;
}

async function finalizeExistingManifest() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const originalStartedAtMs = Date.parse(manifest.startedAt);
  if (!Number.isFinite(originalStartedAtMs)) {
    throw new Error('Existing certification manifest has no valid startedAt timestamp.');
  }
  const canonicalConfigPath = resolve(repoRoot, 'react-app/app/public/config/contents-about.json');
  manifest.generatedAt = new Date().toISOString();
  manifest.repository.sourceHashEnd = await sourceHash();
  manifest.artifacts = {
    canonicalConfigSha256: sha256(await readFile(canonicalConfigPath)),
    productionArtifactSha256: await artifactHash(resolve(repoRoot, 'react-app/app/dist')),
    certificationArtifactSha256: await artifactHash(resolve(repoRoot, 'react-app/app/dist-certify')),
  };
  manifest.evidence = await collectEvidence(originalStartedAtMs);
  for (const commandResult of manifest.commands) {
    for (const attempt of commandResult.attempts || []) {
      try {
        attempt.logIntegrity = sha256(await readFile(resolve(repoRoot, attempt.logPath))) === attempt.logSha256;
      } catch {
        attempt.logIntegrity = false;
      }
    }
  }
  manifest.review = await loadReview();
  manifest.acknowledgedWarnings = process.env.ABS_ABOUT_CERT_ACK_WARNINGS === '1'
    || manifest.acknowledgedWarnings === true;
  const validation = validateAboutNarrativeCertificationManifest(manifest);
  manifest.validation = validation;
  manifest.releaseGrade = validation.releaseGrade;
  manifest.status = validation.releaseGrade ? 'release-grade' : manifest.commands.some((item) => item.status === 'failed') ? 'failed' : 'incomplete';
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  log(`Finalized manifest: ${relative(repoRoot, manifestPath)}`);
  if (!validation.releaseGrade) {
    validation.errors.forEach((error) => console.error(`[about-certify] ${error.code}: ${error.message}`));
  }
  return validation.releaseGrade;
}

if (process.argv.includes('--finalize')) {
  const releaseGrade = await finalizeExistingManifest();
  process.exit(releaseGrade ? 0 : 1);
}

await rm(certificationRoot, { recursive: true, force: true });
await mkdir(logsRoot, { recursive: true });

const sourceHashStart = await sourceHash();
const statusAtStart = git(['status', '--porcelain=v1', '--untracked-files=all']);
const repository = {
  commitSha: git(['rev-parse', 'HEAD']),
  branch: git(['branch', '--show-current']) || '(detached)',
  clean: statusAtStart.length === 0,
  statusAtStart: statusAtStart ? statusAtStart.split('\n') : [],
  sourceHashStart,
  sourceHashEnd: '',
};

await runCommands([
  command('hardening-tests', 'pure', 'npm', ['run', 'check:about-narrative-hardening']),
  command('correspondence-tests', 'pure', 'node', ['--test', 'scripts/check-about-narrative-correspondence-v2.mjs']),
  command('editor-hardening-tests', 'pure', 'node', ['--test', 'scripts/check-about-narrative-editor-hardening.mjs']),
]);

const certificationBuild = await runCommand(command(
  'certification-build',
  'build',
  'npm',
  ['run', 'build:about-certification'],
  { ABS_CERTIFY: '1' },
));
await runPreviewAudits(certificationBuild, { id: 'certification-preview', outDir: 'dist-certify' }, certificationAuditCommands);

const siteGate = await runCommand(command('site-gate', 'production', 'npm', ['run', 'check:site']));
const productionIsolation = siteGate.status === 'passed'
  ? await runCommand(command('production-isolation', 'production', 'npm', ['run', 'check:about-production']))
  : (await recordSkippedCommand(command('production-isolation', 'production', 'npm', ['run', 'check:about-production']), 'site-gate failed.'), commands.at(-1));
await runPreviewAudits(
  productionIsolation.status === 'passed' ? productionIsolation : siteGate,
  { id: 'production-preview' },
  productionAuditCommands,
);

repository.sourceHashEnd = await sourceHash();
const canonicalConfigPath = resolve(repoRoot, 'react-app/app/public/config/contents-about.json');
const canonicalConfigBytes = await readFile(canonicalConfigPath);
const canonicalDocument = JSON.parse(canonicalConfigBytes.toString('utf8'));
const playwrightVersion = require('playwright/package.json').version;
const manifest = {
  schemaVersion: ABOUT_NARRATIVE_CERTIFICATION_SCHEMA_VERSION,
  kind: 'about-narrative-release-certification',
  generatedAt: new Date().toISOString(),
  startedAt: runStartedAt,
  status: 'incomplete',
  releaseGrade: false,
  repository,
  environment: {
    node: process.version,
    npm: commandOutput('npm', ['--version']).stdout.trim(),
    os: `${os.type()} ${os.release()} ${os.arch()}`,
    hardware: `${os.cpus().length} x ${os.cpus()[0]?.model || 'unknown'}; ${os.totalmem()} bytes RAM`,
    gpu: gpuDescription(),
    playwright: playwrightVersion,
    chromium: browserDescription(chromium, 'chromium'),
    webkit: browserDescription(webkit, 'webkit'),
  },
  versions: {
    schema: ABOUT_NARRATIVE_SCHEMA_VERSION,
    compiler: `sha256:${sha256(await readFile(resolve(repoRoot, 'react-app/app/src/routes/about-narrative-lab/aboutNarrativeCompiler.js')))}`,
    workerProtocol: ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION,
    correspondenceRegistry: ABOUT_NARRATIVE_CORRESPONDENCE_VERSION,
    canonicalWorldCount: canonicalDocument.sections.filter((section) => section.world?.mode === 'set').length,
    canonicalTransitionCount: Math.max(0, canonicalDocument.sections.filter((section) => section.world?.mode === 'set').length - 1),
    pointBudgets: {
      desktop: ABOUT_NARRATIVE_POINT_PROFILES.desktop.pointCount,
      mobile: ABOUT_NARRATIVE_POINT_PROFILES.mobile.pointCount,
    },
  },
  artifacts: {
    canonicalConfigSha256: sha256(canonicalConfigBytes),
    productionArtifactSha256: await artifactHash(resolve(repoRoot, 'react-app/app/dist')),
    certificationArtifactSha256: await artifactHash(resolve(repoRoot, 'react-app/app/dist-certify')),
  },
  commands,
  servers,
  evidence: await collectEvidence(),
  coverage: ABOUT_NARRATIVE_REQUIREMENT_COVERAGE,
  review: await loadReview(),
  acknowledgedWarnings: process.env.ABS_ABOUT_CERT_ACK_WARNINGS === '1',
};
const validation = validateAboutNarrativeCertificationManifest(manifest);
manifest.validation = validation;
manifest.releaseGrade = validation.releaseGrade;
manifest.status = validation.releaseGrade ? 'release-grade' : commands.some((item) => item.status === 'failed') ? 'failed' : 'incomplete';
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

log(`Manifest: ${relative(repoRoot, manifestPath)}`);
if (!manifest.releaseGrade) {
  validation.errors.forEach((error) => console.error(`[about-certify] ${error.code}: ${error.message}`));
  log('After adding the required trace and reviewer sign-off, run: npm run certify:about-narrative -- --finalize');
  process.exitCode = 1;
} else {
  log('PASS: release-grade About Narrative certification.');
}
