import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const dist = resolve('react-app/app/dist');
const assetDir = resolve(dist, 'assets');
const files = await readdir(assetDir);
const textAssets = files.filter((file) => ['.js', '.css'].includes(extname(file)));
const forbidden = [
  '/api/about-narrative/config',
  'About Narrative creative toolkit',
  'about-editor-inspector',
  'X-ABS-Editor',
];

for (const file of textAssets) {
  const source = await readFile(resolve(assetDir, file), 'utf8');
  forbidden.forEach((needle) => {
    assert.equal(source.includes(needle), false, `Production asset ${file} contains editor-only marker: ${needle}`);
  });
}

assert.equal(files.some((file) => /AboutNarrativeEditor|about-narrative-editor/i.test(file)), false, 'Production emitted an About editor chunk.');
console.log('PASS: About Narrative editor is absent from production assets');
