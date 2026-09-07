import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { patchDesignModeSidepanel } from './lib/design-mode-extension-compat.mjs';

const root = fileURLToPath(new URL('..', import.meta.url));
const checkout = resolve(root, '.cache/design-mode');
const extension = resolve(checkout, 'packages/extension');
const entry = resolve(extension, 'src/sidepanel/sidepanel.ts');
const { build } = await import(pathToFileURL(resolve(checkout, 'node_modules/vite/dist/node/index.js')));
process.env.ENTRY = 'sidepanel';
let transformed = false;
await build({
  root: extension,
  configFile: resolve(extension, 'vite.config.ts'),
  plugins: [{ name: 'beck-design-mode-token-actions', enforce: 'pre',
    transform(source, id) {
      if (id !== entry) return null;
      transformed = true;
      return { code: patchDesignModeSidepanel(source), map: null };
    },
  }],
});
if (!transformed) throw new Error('Design Mode sidepanel compatibility transform did not run.');
const sidepanel = await readFile(resolve(extension, 'dist/sidepanel.js'));
await writeFile(resolve(extension, 'dist/beck-compat.json'), `${JSON.stringify({
  version: 1, fixes: ['token-only-send-and-copy', 'token-change-badge'],
  sidepanelSha256: createHash('sha256').update(sidepanel).digest('hex'),
}, null, 2)}\n`);
console.log('Design Mode token-only Copy/Send compatibility installed; vendor source unchanged.');
