import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const assetDir = resolve('react-app/app/dist/assets');
const files = await readdir(assetDir);
const scripts = files.filter((file) => file.endsWith('.js'));
assert.ok(scripts.length > 0, 'Build the production app before checking the Work publication hold.');
assert.equal(
  files.some((file) => /PlaygroundExperience|WorkSnippetStage|WorkCaseStudyPresenter/.test(file)),
  false,
  'The held production build must not emit a Work canvas or presenter chunk.',
);

let holdFound = false;
for (const file of scripts) {
  const source = await readFile(resolve(assetDir, file), 'utf8');
  holdFound ||= /["']data-work-publication["']\s*:\s*["']held["']/.test(source);
  assert.doesNotMatch(
    source,
    /["']data-work-experience["']\s*:/,
    `Production asset ${file} can render the development Work canvas.`,
  );
}
assert.ok(holdFound, 'The production Work construction screen is missing.');
console.log('PASS: Work publication is held; the production bundle contains no Work canvas or presenter.');
