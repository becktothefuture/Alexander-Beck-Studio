import { Buffer } from 'node:buffer';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
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

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicConfigDir = resolve(__dirname, 'public/config');
const flockOfBirdsConfigPath = resolve(publicConfigDir, 'flock-of-birds-demo.json');
const wallRepelConfigPath = resolve(publicConfigDir, 'wall-repel-demo.json');
const mineralGrowthConfigPath = resolve(publicConfigDir, 'mineral-growth-demo.json');
const repoRoot = SIMULATION_ADMIN_PATHS.repoRoot;
const VIRTUAL_CONTENT_PREFIX = '\0virtual:abs-content/';
const CONTENT_MODULES = {
  'virtual:abs-content/home': resolve(publicConfigDir, 'contents-home.json'),
  'virtual:abs-content/cv': resolve(publicConfigDir, 'contents-cv.json'),
};

async function readJsonModule(filePath) {
  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw);
  return `export default ${JSON.stringify(parsed, null, 2)};\n`;
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

function designSystemDevPlugin() {
  return {
    name: 'design-system-dev-plugin',
    configureServer(server) {
      server.middlewares.use('/api/design-system/config', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(Buffer.from(chunk));
          }

          const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
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
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(Buffer.from(chunk));
          }

          const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
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

      server.middlewares.use('/api/wall-repel/config', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(Buffer.from(chunk));
          }

          const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
          const nextConfig = payload?.config;
          if (!nextConfig || typeof nextConfig !== 'object' || Array.isArray(nextConfig)) {
            sendJson(res, 400, { ok: false, error: 'Missing wall repel config payload' });
            return;
          }

          await writeFile(wallRepelConfigPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf8');
          server.ws.send({
            type: 'full-reload',
            path: '/config/wall-repel-demo.json',
          });

          sendJson(res, 200, { ok: true });
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error?.message || 'Failed to save wall repel config' });
        }
      });

      server.middlewares.use('/api/mineral-growth/config', async (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        try {
          const chunks = [];
          for await (const chunk of req) {
            chunks.push(Buffer.from(chunk));
          }

          const payload = JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
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

function absContentVirtualPlugin() {
  const watchedFiles = Object.values(CONTENT_MODULES);

  return {
    name: 'abs-content-virtual-plugin',
    buildStart() {
      watchedFiles.forEach((file) => this.addWatchFile(file));
    },
    resolveId(source) {
      if (source in CONTENT_MODULES) {
        return `${VIRTUAL_CONTENT_PREFIX}${source.split('/').pop()}`;
      }
      return null;
    },
    async load(id) {
      if (id === `${VIRTUAL_CONTENT_PREFIX}home`) {
        return readJsonModule(CONTENT_MODULES['virtual:abs-content/home']);
      }
      if (id === `${VIRTUAL_CONTENT_PREFIX}cv`) {
        return readJsonModule(CONTENT_MODULES['virtual:abs-content/cv']);
      }
      return null;
    },
    handleHotUpdate({ file, server }) {
      if (!watchedFiles.includes(file)) return;
      const modules = [...server.moduleGraph.idToModuleMap.values()].filter((mod) => mod.id && mod.id.startsWith(VIRTUAL_CONTENT_PREFIX));
      modules.forEach((mod) => server.moduleGraph.invalidateModule(mod));
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

export default defineConfig(({ mode }) => ({
  base: mode === 'production' ? './' : '/',
  plugins: [react(), absContentVirtualPlugin(), designSystemDevPlugin()],
  // Legacy bundles gate the dock + authoring UI on `__DEV__` (see main.js / portfolio app).
  define: {
    __DEV__: mode === 'development',
  },
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        'explain-it-like-im': resolve(__dirname, 'explain-it-like-im.html'),
        portfolio: resolve(__dirname, 'portfolio.html'),
        cv: resolve(__dirname, 'cv.html'),
        styleguide: resolve(__dirname, 'styleguide.html'),
        simulations: resolve(__dirname, 'simulations.html'),
        'palette-lab': resolve(__dirname, 'palette-lab.html'),
        'lab/beach-ball-room': resolve(__dirname, 'lab/beach-ball-room.html'),
        'lab/flock-of-birds': resolve(__dirname, 'lab/flock-of-birds.html'),
        'lab/wall-repel': resolve(__dirname, 'lab/wall-repel.html'),
        'lab/mineral-growth': resolve(__dirname, 'lab/mineral-growth.html'),
        'lab/aperture-bloom': resolve(__dirname, 'lab/aperture-bloom.html'),
        'lab/pressure-mosaic': resolve(__dirname, 'lab/pressure-mosaic.html'),
        'lab/confluence-bridges': resolve(__dirname, 'lab/confluence-bridges.html'),
        'lab/napoleon-point-cloud': resolve(__dirname, 'lab/napoleon-point-cloud.html'),
        'lab/spatial-scan': resolve(__dirname, 'lab/spatial-scan.html'),
        ...(mode === 'development'
          ? { 'panel-host': resolve(__dirname, 'panel-host.html') }
          : {})
      }
    }
  }
}));
