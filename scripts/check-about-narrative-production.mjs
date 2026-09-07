import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const dist = resolve('react-app/app/dist');
const assetDir = resolve(dist, 'assets');
const files = await readdir(assetDir);
const textAssets = files.filter((file) => ['.js', '.css'].includes(extname(file)));
assert.ok(textAssets.length > 0, 'Build the production app before checking the About publication hold.');
let holdFound = false;
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
  'Reveal the About Me page',
  'data-about-narrative-shell',
];

for (const file of textAssets) {
  const source = await readFile(resolve(assetDir, file), 'utf8');
  holdFound ||= /["']data-about-publication["']\s*:\s*["']held["']/.test(source);
  forbidden.forEach((needle) => {
    assert.equal(source.includes(needle), false, `Production asset ${file} contains editor-only marker: ${needle}`);
  });
}

assert.equal(files.some((file) => /AboutNarrativeEditor|about-narrative-editor/i.test(file)), false, 'Production emitted an About editor chunk.');
assert.equal(files.some((file) => /AboutNarrativeParameterPanel|about-narrative-parameters/i.test(file)), false, 'Production emitted the development About parameter panel.');
assert.equal(files.some((file) => /AboutNarrativeLabExperience/i.test(file)), false, 'The held production build must not emit the About narrative chunk.');
assert.ok(holdFound, 'The production About construction screen is missing.');
assert.equal(files.some((file) => /aboutNarrativeResourceLedger/i.test(file)), false, 'Production emitted the About resource-ledger chunk.');
assert.equal(files.some((file) => /aboutNarrativeRuntimeObserver\.certification/i.test(file)), false, 'Production emitted the certification runtime observer.');
console.log('PASS: About publication is held; the narrative, preview reveal, editor and diagnostics are absent from production assets');
