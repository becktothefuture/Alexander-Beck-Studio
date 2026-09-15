import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const dist = resolve('react-app/app/dist');
assert.ok(existsSync(resolve(dist, 'index.html')), 'Build the production app before checking the Fancy Mode publication boundary.');
for (const entry of ['fancy-mode', 'fancy-home']) {
  assert.equal(existsSync(resolve(dist, 'lab', `${entry}.html`)), false,
    `${entry} is a retained development experiment and must not be published.`);
}

const assets = resolve(dist, 'assets');
const files = (await readdir(assets)).filter((file) => /\.(?:js|css)$/.test(file));
assert.ok(files.length > 0, 'The production assets are missing.');
for (const file of files) {
  assert.doesNotMatch(file, /fancy/i, `Production must not emit the Fancy study chunk ${file}.`);
  const source = await readFile(resolve(assets, file), 'utf8');
  assert.doesNotMatch(source,
    /__ABS_FANCY_PREVIEW__|data-fancy-preview|fancy-mode-lab|fancy-legend-pattern|Fancy Mode/,
    `Production asset ${file} includes the Fancy experiment or its bootstrap.`);
}
console.log('PASS: Fancy Mode is retained in development; its pages, controls and renderer are absent from the production build.');
