import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { createDevAdminPlugin } from './vite.dev-admin-plugin.js';

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
  plugins: [react(), absContentVirtualPlugin(), createDevAdminPlugin({ publicConfigDir })],
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
