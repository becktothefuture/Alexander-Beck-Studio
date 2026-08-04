import { readFileSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import {
  createDevAdminPlugin,
  shouldSuppressAboutNarrativeEditorReload,
} from './vite.dev-admin-plugin.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicConfigDir = resolve(__dirname, 'public/config');
const designSystemConfigPath = resolve(publicConfigDir, 'design-system.json');
const VIRTUAL_CONTENT_PREFIX = '\0virtual:abs-content/';
const CONTENT_MODULES = {
  'virtual:abs-content/home': resolve(publicConfigDir, 'contents-home.json'),
  'virtual:abs-content/about': resolve(publicConfigDir, 'contents-about.json'),
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
      if (!id.startsWith(VIRTUAL_CONTENT_PREFIX)) return null;
      const moduleId = `virtual:abs-content/${id.slice(VIRTUAL_CONTENT_PREFIX.length)}`;
      return CONTENT_MODULES[moduleId] ? readJsonModule(CONTENT_MODULES[moduleId]) : null;
    },
    handleHotUpdate({ file, server }) {
      if (!watchedFiles.includes(file)) return;
      const modules = [...server.moduleGraph.idToModuleMap.values()].filter((mod) => mod.id && mod.id.startsWith(VIRTUAL_CONTENT_PREFIX));
      modules.forEach((mod) => server.moduleGraph.invalidateModule(mod));
      if (shouldSuppressAboutNarrativeEditorReload(file)) return [];
      server.ws.send({ type: 'full-reload' });
      return [];
    },
  };
}

function publicDevGuardPlugin() {
  return {
    name: 'abs-public-dev-guard',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const pathname = String(req.url || '').split('?', 1)[0];
        if (pathname === '/api' || pathname.startsWith('/api/') || pathname.startsWith('/@fs/')) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'text/plain; charset=utf-8');
          res.end('Not available on the public development mirror.');
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  // The editor reads the canonical file in development. A production build
  // captures the normalized settings here, so the shipped runtime has no
  // design-config fetch or mutable control source to resolve.
  const productionDesignSystem = mode === 'production'
    ? JSON.parse(readFileSync(designSystemConfigPath, 'utf8'))
    : null;

  return {
  base: '/',
  plugins: [
    react(),
    absContentVirtualPlugin(),
    ...(process.env.ABS_PUBLIC_DEV === '1'
      ? [publicDevGuardPlugin()]
      : [createDevAdminPlugin({ publicConfigDir })]),
  ],
  resolve: {
    alias: {
      'virtual:about-narrative-resource-tools': resolve(
        __dirname,
        'src/routes/about-narrative-lab',
        mode === 'production'
          ? 'aboutNarrativeResourceTools.production.js'
          : 'aboutNarrativeResourceTools.certification.js',
      ),
      'virtual:about-narrative-runtime-observer': resolve(
        __dirname,
        'src/routes/about-narrative-lab',
        mode === 'production'
          ? 'aboutNarrativeRuntimeObserver.production.js'
          : 'aboutNarrativeRuntimeObserver.certification.js',
      ),
    },
  },
  // Legacy bundles gate the dock + authoring UI on `__DEV__` (see main.js / portfolio app).
  define: {
    __DEV__: mode === 'development' && process.env.ABS_PUBLIC_DEV !== '1',
    __CERTIFY__: mode === 'certification',
    __ABS_PRODUCTION_DESIGN_SYSTEM_CONFIG__: JSON.stringify(productionDesignSystem),
  },
  server: process.env.ABS_PUBLIC_DEV === '1'
    ? {
      fs: {
        strict: true,
        allow: [__dirname],
      },
    }
    : undefined,
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        'explain-it-like-im': resolve(__dirname, 'explain-it-like-im.html'),
        contact: resolve(__dirname, 'contact.html'),
        about: resolve(__dirname, 'about.html'),
        portfolio: resolve(__dirname, 'portfolio.html'),
        playground: resolve(__dirname, 'playground.html'),
        styleguide: resolve(__dirname, 'styleguide.html'),
        simulations: resolve(__dirname, 'simulations.html'),
        'palette-lab': resolve(__dirname, 'palette-lab.html'),
        'lab/beach-ball-room': resolve(__dirname, 'lab/beach-ball-room.html'),
        'lab/flock-of-birds': resolve(__dirname, 'lab/flock-of-birds.html'),
        'lab/button-bar-playground': resolve(__dirname, 'lab/button-bar-playground.html'),
        'lab/dominant-tab': resolve(__dirname, 'lab/dominant-tab.html'),
        'lab/sound-playground': resolve(__dirname, 'lab/sound-playground.html'),
        'lab/repel-room': resolve(__dirname, 'lab/repel-room.html'),
        'lab/atmosphere-webgl-post': resolve(__dirname, 'lab/atmosphere-webgl-post.html'),
        'lab/atmosphere-density': resolve(__dirname, 'lab/atmosphere-density.html'),
        'lab/atmosphere-feedback': resolve(__dirname, 'lab/atmosphere-feedback.html'),
        'lab/atmosphere-crisp-glow': resolve(__dirname, 'lab/atmosphere-crisp-glow.html'),
        'lab/atmosphere-hybrid-glow': resolve(__dirname, 'lab/atmosphere-hybrid-glow.html'),
        'lab/wall-repel': resolve(__dirname, 'lab/wall-repel.html'),
        'lab/aperture-bloom': resolve(__dirname, 'lab/aperture-bloom.html'),
        'lab/confluence-bridges': resolve(__dirname, 'lab/confluence-bridges.html'),
        'lab/napoleon-point-cloud': resolve(__dirname, 'lab/napoleon-point-cloud.html'),
        'lab/rift-rings': resolve(__dirname, 'lab/rift-rings.html'),
        'lab/spatial-scan': resolve(__dirname, 'lab/spatial-scan.html'),
        'lab/loader-playground': resolve(__dirname, 'lab/loader-playground.html'),
        'lab/title-entrance': resolve(__dirname, 'lab/title-entrance.html'),
        'lab/route-ball-transition': resolve(__dirname, 'lab/route-ball-transition.html'),
        ...(mode === 'development'
          ? { 'panel-host': resolve(__dirname, 'panel-host.html') }
          : {})
      }
    }
  }
  };
});
