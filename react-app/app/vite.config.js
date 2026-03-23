import { Buffer } from 'node:buffer';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { flattenDesignConfigDir } from '../../scripts/lib/flatten-design-config.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicConfigDir = resolve(__dirname, 'public/config');
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
            res.statusCode = 400;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ ok: false, error: 'Missing config payload' }));
            return;
          }

          const { designSystem: normalized } = await flattenDesignConfigDir(publicConfigDir, nextConfig);
          server.ws.send({
            type: 'full-reload',
            path: '/config/design-system.json',
          });

          res.statusCode = 200;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: true, version: normalized.version ?? 1 }));
        } catch (error) {
          res.statusCode = 500;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ ok: false, error: error?.message || 'Failed to save design system' }));
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
        portfolio: resolve(__dirname, 'portfolio.html'),
        cv: resolve(__dirname, 'cv.html'),
        styleguide: resolve(__dirname, 'styleguide.html'),
        'palette-lab': resolve(__dirname, 'palette-lab.html')
      }
    }
  }
}));
