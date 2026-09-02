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
  'instrumentAboutNarrativeWebGLContext',
  'live-webgl-buffers-at-detach',
  'unobserved-buffer-mutation',
  'maxInstallDurationMs',
  'workerStarts',
  'resourceDiagnosticCount',
];

for (const file of textAssets) {
  const source = await readFile(resolve(assetDir, file), 'utf8');
  forbidden.forEach((needle) => {
    assert.equal(source.includes(needle), false, `Production asset ${file} contains editor-only marker: ${needle}`);
  });
}

assert.equal(files.some((file) => /AboutNarrativeEditor|about-narrative-editor/i.test(file)), false, 'Production emitted an About editor chunk.');
assert.equal(files.some((file) => /AboutNarrativeParameterPanel|about-narrative-parameters/i.test(file)), false, 'Production emitted the development About parameter panel.');
assert.equal(files.some((file) => /AboutNarrativeLabExperience/i.test(file)), true, 'Production is missing the public About narrative chunk.');
assert.equal(files.some((file) => /aboutNarrativeResourceLedger/i.test(file)), false, 'Production emitted the About resource-ledger chunk.');
assert.equal(files.some((file) => /aboutNarrativeRuntimeObserver\.certification/i.test(file)), false, 'Production emitted the certification runtime observer.');
console.log('PASS: public About narrative is present; editor, ledger, and verbose runtime diagnostics are absent from production assets');
