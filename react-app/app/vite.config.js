import { Buffer } from 'node:buffer';
import { writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { deriveLegacyConfigFiles, normalizeDesignSystemConfig } from './src/legacy/modules/utils/design-config.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicConfigDir = resolve(__dirname, 'public/config');
const designSystemPath = resolve(publicConfigDir, 'design-system.json');
const legacyPaths = {
  runtime: resolve(publicConfigDir, 'default-config.json'),
  shell: resolve(publicConfigDir, 'shell-config.json'),
  portfolio: resolve(publicConfigDir, 'portfolio-config.json'),
  cv: resolve(publicConfigDir, 'cv-config.json'),
};

async function writeJson(path, value) {
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function flattenAndPersistDesignSystem(config) {
  const normalized = normalizeDesignSystemConfig(config);
  const legacy = deriveLegacyConfigFiles(normalized);

  await writeJson(designSystemPath, normalized);
  await Promise.all([
    writeJson(legacyPaths.runtime, legacy.runtime),
    writeJson(legacyPaths.shell, legacy.shell),
    writeJson(legacyPaths.portfolio, legacy.portfolio),
    writeJson(legacyPaths.cv, legacy.cv),
  ]);

  return normalized;
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

          const normalized = await flattenAndPersistDesignSystem(nextConfig);
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

export default defineConfig({
  plugins: [react(), designSystemDevPlugin()],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        portfolio: resolve(__dirname, 'portfolio.html'),
        cv: resolve(__dirname, 'cv.html'),
        styleguide: resolve(__dirname, 'styleguide.html')
      }
    }
  }
});
