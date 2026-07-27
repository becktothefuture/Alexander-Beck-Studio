import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import {
  writeFile,
} from 'node:fs/promises';
import { resolve } from 'node:path';
import process from 'node:process';
import { flattenDesignConfigDir } from '../../scripts/lib/flatten-design-config.mjs';
import {
  SIMULATION_ADMIN_PATHS,
  createSimulationIssue,
  createSimulationDeletionPlan,
  deleteSimulation,
  getSimulationDashboardStatus,
  updateSimulationIssueStatus,
  updateSimulationReviewStatus,
  updateSimulationStage,
} from '../../scripts/lib/simulation-admin-store.mjs';
import { normalizeMineralGrowthConfig } from './src/routes/mineral-growth/mineralGrowthControls.js';
import { normalizeLoaderPlaygroundConfig } from './src/routes/loader-playground/loaderPlaygroundControls.js';
import { normalizeAtmosphereLabConfig } from './src/routes/atmosphere-lab/atmosphereLabControls.js';
import {
  ABOUT_NARRATIVE_EDITOR_HEADER,
  ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES,
} from './src/routes/about-narrative-lab/aboutNarrativeDefinitions.js';
import { createAboutNarrativePersistenceService } from './src/routes/about-narrative-lab/aboutNarrativePersistenceServer.js';

const repoRoot = SIMULATION_ADMIN_PATHS.repoRoot;
let aboutNarrativeEditorWrite = null;

export function shouldSuppressAboutNarrativeEditorReload(file) {
  if (!aboutNarrativeEditorWrite) return false;
  const matches = aboutNarrativeEditorWrite.file === file
    && Date.now() <= aboutNarrativeEditorWrite.expiresAt;
  if (Date.now() > aboutNarrativeEditorWrite.expiresAt) aboutNarrativeEditorWrite = null;
  return matches;
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

async function readRequestJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

async function readLimitedRequestJson(req, maxBytes) {
  const contentLength = Number(req.headers['content-length'] || 0);
  if (contentLength > maxBytes) {
    const error = new Error('The About document exceeds the 1MiB limit.');
    error.statusCode = 413;
    throw error;
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > maxBytes) {
      const error = new Error('The About document exceeds the 1MiB limit.');
      error.statusCode = 413;
      throw error;
    }
    chunks.push(Buffer.from(chunk));
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
  } catch (error) {
    error.statusCode = 400;
    throw error;
  }
}

function requestIsSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin || !req.headers.host) return false;
  try {
    const parsed = new URL(origin);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.host === req.headers.host;
  } catch {
    return false;
  }
}

function runRepoNodeScript(args, { timeoutMs = 120000 } = {}) {
  return runRepoCommand(process.execPath, args, { timeoutMs });
}

function runRepoCommand(command, args, { timeoutMs = 120000 } = {}) {
  return new Promise((resolveCommand) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: {
        ...process.env,
        FORCE_COLOR: '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    const stdout = [];
    const stderr = [];
    const timer = setTimeout(() => {
      child.kill('SIGTERM');
    }, timeoutMs);

    child.stdout.on('data', (chunk) => stdout.push(Buffer.from(chunk)));
    child.stderr.on('data', (chunk) => stderr.push(Buffer.from(chunk)));
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolveCommand({
        ok: code === 0,
        code,
        signal,
        stdout: Buffer.concat(stdout).toString('utf8').trim(),
        stderr: Buffer.concat(stderr).toString('utf8').trim(),
      });
    });
  });
}

export function createDevAdminPlugin({ publicConfigDir, aboutNarrativeConfigPath: aboutNarrativeConfigPathOverride = null }) {
  const aboutNarrativeConfigPath = aboutNarrativeConfigPathOverride
    ? resolve(aboutNarrativeConfigPathOverride)
    : resolve(publicConfigDir, 'contents-about.json');
  const flockOfBirdsConfigPath = resolve(publicConfigDir, 'flock-of-birds-demo.json');
  const repelRoomConfigPath = resolve(publicConfigDir, 'repel-room-demo.json');
  const wallRepelConfigPath = resolve(publicConfigDir, 'wall-repel-demo.json');
  const mineralGrowthConfigPath = resolve(publicConfigDir, 'mineral-growth-demo.json');
  const loaderPlaygroundConfigPath = resolve(publicConfigDir, 'loader-playground-demo.json');
  const atmosphereLabConfigPath = resolve(publicConfigDir, 'atmosphere-lab.json');
  const aboutPersistence = createAboutNarrativePersistenceService({ configPath: aboutNarrativeConfigPath });

  return {
    name: 'design-system-dev-plugin',
    configureServer(server) {
      aboutPersistence.cleanup().catch(() => {});

      server.middlewares.use('/api/about-narrative/config', async (req, res) => {
        if (!['GET', 'POST'].includes(req.method)) {
          sendJson(res, 405, { ok: false, message: 'Method Not Allowed' });
          return;
        }
        if (req.headers['x-abs-editor'] !== ABOUT_NARRATIVE_EDITOR_HEADER) {
          sendJson(res, 403, { ok: false, message: 'Missing development editor header.' });
          return;
        }
        if (req.method === 'POST' && !requestIsSameOrigin(req)) {
          sendJson(res, 403, { ok: false, message: 'The Save request must come from this development origin.' });
          return;
        }
        if (req.method === 'POST' && !String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
          sendJson(res, 415, { ok: false, message: 'Save requires application/json.' });
          return;
        }

        try {
          if (req.method === 'GET') {
            const current = await aboutPersistence.read();
            res.setHeader('ETag', `"${current.hash}"`);
            res.setHeader('Cache-Control', 'no-store');
            sendJson(res, 200, { ok: true, document: current.document, hash: current.hash });
            return;
          }
          const document = await readLimitedRequestJson(req, ABOUT_NARRATIVE_MAX_DOCUMENT_BYTES);
          const result = await aboutPersistence.save(document, req.headers['if-match']);
          aboutNarrativeEditorWrite = {
            file: aboutNarrativeConfigPath,
            expiresAt: Date.now() + 1500,
          };
          res.setHeader('ETag', `"${result.hash}"`);
          sendJson(res, 200, { ok: true, document: result.document, hash: result.hash });
        } catch (error) {
          const validation = error?.name === 'AboutNarrativeValidationError';
          const statusCode = error?.statusCode || (validation ? 422 : 500);
          sendJson(res, statusCode, {
            ok: false,
            message: error?.message || 'Failed to save About Narrative.',
            diagnostics: validation ? error.diagnostics : undefined,
            currentHash: error?.currentHash,
          });
        }
      });

      server.middlewares.use('/api/design-system/config', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const payload = await readRequestJson(req);
          const nextConfig = payload?.config;
          if (!nextConfig || typeof nextConfig !== 'object') {
            sendJson(res, 400, { ok: false, error: 'Missing config payload' });
            return;
          }

          const { designSystem: normalized } = await flattenDesignConfigDir(publicConfigDir, nextConfig);
          server.ws.send({
            type: 'full-reload',
            path: '/config/design-system.json',
          });

          sendJson(res, 200, { ok: true, version: normalized.version ?? 1 });
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error?.message || 'Failed to save design system' });
        }
      });

      server.middlewares.use('/api/flock-of-birds/config', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const payload = await readRequestJson(req);
          const nextConfig = payload?.config;
          if (!nextConfig || typeof nextConfig !== 'object' || Array.isArray(nextConfig)) {
            sendJson(res, 400, { ok: false, error: 'Missing flock of birds config payload' });
            return;
          }

          await writeFile(flockOfBirdsConfigPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf8');
          server.ws.send({
            type: 'full-reload',
            path: '/config/flock-of-birds-demo.json',
          });

          sendJson(res, 200, { ok: true });
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error?.message || 'Failed to save flock of birds config' });
        }
      });

      const handleRepelRoomConfigSave = async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const payload = await readRequestJson(req);
          const nextConfig = payload?.config;
          if (!nextConfig || typeof nextConfig !== 'object' || Array.isArray(nextConfig)) {
            sendJson(res, 400, { ok: false, error: 'Missing repel room config payload' });
            return;
          }

          const serializedConfig = `${JSON.stringify(nextConfig, null, 2)}\n`;
          await Promise.all([
            writeFile(repelRoomConfigPath, serializedConfig, 'utf8'),
            writeFile(wallRepelConfigPath, serializedConfig, 'utf8'),
          ]);
          server.ws.send({
            type: 'full-reload',
            path: '/config/repel-room-demo.json',
          });

          sendJson(res, 200, { ok: true });
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error?.message || 'Failed to save repel room config' });
        }
      };

      server.middlewares.use('/api/repel-room/config', handleRepelRoomConfigSave);
      server.middlewares.use('/api/wall-repel/config', handleRepelRoomConfigSave);

      server.middlewares.use('/api/atmosphere-lab/config', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const payload = await readRequestJson(req);
          const nextConfig = payload?.config;
          if (!nextConfig || typeof nextConfig !== 'object' || Array.isArray(nextConfig)) {
            sendJson(res, 400, { ok: false, error: 'Missing atmosphere lab config payload' });
            return;
          }

          const normalizedConfig = normalizeAtmosphereLabConfig(nextConfig);
          await writeFile(atmosphereLabConfigPath, `${JSON.stringify(normalizedConfig, null, 2)}\n`, 'utf8');
          sendJson(res, 200, { ok: true, version: normalizedConfig.version });
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error?.message || 'Failed to save atmosphere lab config' });
        }
      });

      server.middlewares.use('/api/mineral-growth/config', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const payload = await readRequestJson(req);
          const nextConfig = payload?.config;
          if (!nextConfig || typeof nextConfig !== 'object' || Array.isArray(nextConfig)) {
            sendJson(res, 400, { ok: false, error: 'Missing mineral growth config payload' });
            return;
          }

          const normalizedConfig = normalizeMineralGrowthConfig(nextConfig);
          await writeFile(mineralGrowthConfigPath, `${JSON.stringify(normalizedConfig, null, 2)}\n`, 'utf8');
          server.ws.send({
            type: 'full-reload',
            path: '/config/mineral-growth-demo.json',
          });

          sendJson(res, 200, { ok: true, version: normalizedConfig.version });
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error?.message || 'Failed to save mineral growth config' });
        }
      });

      server.middlewares.use('/api/loader-playground/config', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const payload = await readRequestJson(req);
          const nextConfig = payload?.config;
          if (!nextConfig || typeof nextConfig !== 'object' || Array.isArray(nextConfig)) {
            sendJson(res, 400, { ok: false, error: 'Missing loader playground config payload' });
            return;
          }

          const normalizedConfig = normalizeLoaderPlaygroundConfig(nextConfig);
          await writeFile(loaderPlaygroundConfigPath, `${JSON.stringify(normalizedConfig, null, 2)}\n`, 'utf8');
          server.ws.send({
            type: 'full-reload',
            path: '/config/loader-playground-demo.json',
          });

          sendJson(res, 200, { ok: true, version: normalizedConfig.version });
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error?.message || 'Failed to save loader playground config' });
        }
      });

      server.middlewares.use('/api/simulations/issues/status', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const payload = await readRequestJson(req);
          const result = await updateSimulationIssueStatus({
            fileName: payload?.fileName,
            status: payload?.status,
          });
          sendJson(res, 200, { ok: true, ...result });
        } catch (error) {
          sendJson(res, error?.statusCode || 500, { ok: false, error: error?.message || 'Failed to update simulation issue status' });
        }
      });

      server.middlewares.use('/api/simulations/issues', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const payload = await readRequestJson(req);
          const { relativePath } = await createSimulationIssue(payload);
          sendJson(res, 200, { ok: true, relativePath });
        } catch (error) {
          sendJson(res, error?.statusCode || 500, { ok: false, error: error?.message || 'Failed to log simulation issue' });
        }
      });

      server.middlewares.use('/api/simulations/delete', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const payload = await readRequestJson(req);
          const id = payload?.id;
          if (payload?.dryRun) {
            const plan = await createSimulationDeletionPlan({ id });
            sendJson(res, 200, { ok: true, plan });
            return;
          }

          const result = await deleteSimulation({
            id,
            confirmId: payload?.confirmId,
          });

          server.ws.send({
            type: 'full-reload',
            path: '/simulations.html',
          });

          sendJson(res, 200, { ok: true, ...result });
        } catch (error) {
          sendJson(res, error?.statusCode || 500, {
            ok: false,
            error: error?.message || 'Failed to delete simulation',
            plan: error?.plan,
          });
        }
      });

      server.middlewares.use('/api/simulations/status', async (req, res) => {
        if (req.method !== 'GET') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          sendJson(res, 200, await getSimulationDashboardStatus());
        } catch (error) {
          sendJson(res, error?.statusCode || 500, { ok: false, error: error?.message || 'Failed to read simulation status' });
        }
      });

      server.middlewares.use('/api/simulations/validate', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        const result = await runRepoNodeScript(['scripts/validate-simulation-catalog.mjs'], {
          timeoutMs: 60000,
        });
        sendJson(res, result.ok ? 200 : 500, {
          ok: result.ok,
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code,
          signal: result.signal,
        });
      });

      server.middlewares.use('/api/simulations/build', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        const result = await runRepoCommand('npm', ['run', 'build'], {
          timeoutMs: 240000,
        });
        sendJson(res, result.ok ? 200 : 500, {
          ok: result.ok,
          stdout: result.stdout,
          stderr: result.stderr,
          code: result.code,
          signal: result.signal,
        });
      });

      server.middlewares.use('/api/simulations/capture', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const payload = await readRequestJson(req);
          const id = String(payload?.id || '').trim();
          if (!id) {
            sendJson(res, 400, { ok: false, error: 'Missing simulation id' });
            return;
          }

          const args = [
            'scripts/capture-simulation-previews.mjs',
            `--ids=${id}`,
            '--frames=4',
          ];
          if (payload?.baseUrl) {
            args.push(`--base-url=${payload.baseUrl}`);
          }

          const result = await runRepoNodeScript(args, { timeoutMs: 180000 });
          sendJson(res, result.ok ? 200 : 500, {
            ok: result.ok,
            stdout: result.stdout,
            stderr: result.stderr,
            code: result.code,
            signal: result.signal,
          });
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error?.message || 'Failed to capture simulation preview' });
        }
      });

      server.middlewares.use('/api/simulations/review-status', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const payload = await readRequestJson(req);
          const { simulation, changed } = await updateSimulationReviewStatus({
            id: payload?.id,
            reviewStatus: payload?.reviewStatus,
          });
          sendJson(res, 200, { ok: true, simulation, changed });
        } catch (error) {
          sendJson(res, error?.statusCode || 500, { ok: false, error: error?.message || 'Failed to update simulation review status' });
        }
      });

      server.middlewares.use('/api/simulations/stage', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const payload = await readRequestJson(req);
          const { simulation, changed } = await updateSimulationStage({
            id: payload?.id,
            stage: payload?.stage,
          });

          if (changed) {
            server.ws.send({
              type: 'full-reload',
              path: '/simulations.html',
            });
          }

          sendJson(res, 200, { ok: true, simulation, changed });
        } catch (error) {
          sendJson(res, error?.statusCode || 500, { ok: false, error: error?.message || 'Failed to update simulation stage' });
        }
      });
    },
  };
}
