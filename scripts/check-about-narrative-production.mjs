import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';

const dist = resolve('react-app/app/dist');
const assetDir = resolve(dist, 'assets');
const files = await readdir(assetDir);
const textAssets = files.filter((file) => ['.js', '.css'].includes(extname(file)));
assert.ok(textAssets.length > 0, 'Build the production app before checking the About publication boundary.');
const boardFile = files.find((file) => /^AboutGameBoardExperience-.*\.js$/.test(file));
assert.ok(boardFile, 'Production must include the released About machine.');
const board = await readFile(resolve(assetDir, boardFile), 'utf8');
for (const text of ['about-board-career-timeline', 'Critical Mass', 'MRM (McCann)', 'about-board-portrait-ledge']) {
  assert.ok(board.includes(text), `The released About machine is missing ${text}.`);
}
for (const file of ['geometry.svg', 'balls.json', 'portrait-map.json']) {
  await readFile(resolve(dist, 'models/about-game-board', file));
}
const forbidden = [
  '/api/about-narrative/config',
  '__ABS_ABOUT_GAME_BOARD__',
  'data-about-grid-guide',
  'about-coming-soon-title',
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
  '__aboutRollercoaster',
  'about-rollercoaster-world',
];

for (const file of textAssets) {
  const source = await readFile(resolve(assetDir, file), 'utf8');
  forbidden.forEach((needle) => {
    assert.equal(source.includes(needle), false, `Production asset ${file} contains development-only marker: ${needle}`);
  });
}

assert.equal(files.some((file) => /AboutNarrativeEditor|about-narrative-editor/i.test(file)), false, 'Production emitted an About editor chunk.');
assert.equal(files.some((file) => /AboutNarrativeParameterPanel|about-narrative-parameters/i.test(file)), false, 'Production emitted the development About parameter panel.');
assert.equal(files.some((file) => /AboutNarrativeLabExperience|AboutRollercoasterExperience/i.test(file)), false, 'Production must not emit the retired About renderers.');
assert.equal(files.some((file) => /AboutRollercoasterControls|rollercoaster-controls/i.test(file)), false, 'Production must not emit About authoring controls.');
assert.equal(files.some((file) => /rollercoasterSampling/i.test(file)), false, 'Production must not emit the retired About sampling worker.');
assert.equal(files.some((file) => /aboutNarrativeResourceLedger/i.test(file)), false, 'Production emitted the About resource-ledger chunk.');
assert.equal(files.some((file) => /aboutNarrativeRuntimeObserver\.certification/i.test(file)), false, 'Production emitted the certification runtime observer.');
console.log('PASS: production includes the About machine and excludes authoring controls and diagnostics');
