import { Buffer } from 'node:buffer';
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { flattenDesignConfigDir } from '../../scripts/lib/flatten-design-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicConfigDir = resolve(__dirname, 'public/config');
const rainPrismConfigPath = resolve(publicConfigDir, 'rain-prism-demo.json');
const flockOfBirdsConfigPath = resolve(publicConfigDir, 'flock-of-birds-demo.json');
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

      server.middlewares.use('/api/rain-prism/config', async (req, res) => {
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
            sendJson(res, 400, { ok: false, error: 'Missing rain prism config payload' });
            return;
          }

          await writeFile(rainPrismConfigPath, `${JSON.stringify(nextConfig, null, 2)}\n`, 'utf8');
          server.ws.send({
            type: 'full-reload',
            path: '/config/rain-prism-demo.json',
          });

          sendJson(res, 200, { ok: true });
        } catch (error) {
          sendJson(res, 500, { ok: false, error: error?.message || 'Failed to save rain prism config' });
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
        'palette-lab': resolve(__dirname, 'palette-lab.html'),
        'lab/beach-ball-room': resolve(__dirname, 'lab/beach-ball-room.html'),
        'lab/flock-of-birds': resolve(__dirname, 'lab/flock-of-birds.html'),
        'lab/rain-prism': resolve(__dirname, 'lab/rain-prism.html'),
        ...(mode === 'development'
          ? { 'panel-host': resolve(__dirname, 'panel-host.html') }
          : {})
      }
    }
  }
}));
