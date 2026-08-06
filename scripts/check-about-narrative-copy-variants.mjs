import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  loadAboutNarrativePointFieldPersistenceSource,
  preflightAboutNarrativePointFieldRuntimePlans,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';

const RAW_DOCUMENT_PATH = new URL('../react-app/app/public/config/contents-about.json', import.meta.url);
const ABOUT_ROUTE_PATH = new URL(
  '../react-app/app/src/routes/about/AboutRoute.jsx',
  import.meta.url,
);
const ABOUT_EXPERIENCE_PATH = new URL(
  '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx',
  import.meta.url,
);
const ROUTE_MANIFEST_PATH = new URL('../react-app/app/src/lib/route-manifest.js', import.meta.url);
const VITE_CONFIG_PATH = new URL('../react-app/app/vite.config.js', import.meta.url);
const rawDocument = JSON.parse(await readFile(RAW_DOCUMENT_PATH, 'utf8'));
const [aboutRouteSource, aboutExperienceSource, routeManifestSource, viteConfigSource] = await Promise.all([
  readFile(ABOUT_ROUTE_PATH, 'utf8'),
  readFile(ABOUT_EXPERIENCE_PATH, 'utf8'),
  readFile(ROUTE_MANIFEST_PATH, 'utf8'),
  readFile(VITE_CONFIG_PATH, 'utf8'),
]);
const loaded = loadAboutNarrativePointFieldPersistenceSource(rawDocument, {
  preflight: preflightAboutNarrativePointFieldRuntimePlans,
});

assert.equal(loaded.valid, true, loaded.message);

const document = loaded.document;

function getTextField(id) {
  return document.tracks.text.fields.find((field) => field.id === id);
}

function getEditorialModules() {
  return document.tracks.text.fields.flatMap((field) => field.block?.modules || []);
}

function getAuthoredText() {
  return document.tracks.text.fields.flatMap((field) => [
    field.text,
    field.description,
    ...(field.block?.modules || []).flatMap((module) => [
      module.text,
      module.label,
      ...(module.items || []).map((item) => (
        typeof item === 'string' ? item : (item.label || '') + ' ' + (item.description || '')
      )),
    ]),
  ]).filter(Boolean).join(' ');
}

test('development About owns the canonical editor and the standalone Lab route is retired', () => {
  assert.match(aboutRouteSource, /if \(!import\.meta\.env\.DEV && !__CERTIFY__\)/);
  assert.match(aboutExperienceSource, /const initialDocument = INITIAL_ABOUT_NARRATIVE_POINT_FIELD_DOCUMENT/);
  assert.match(aboutExperienceSource, /if \(__DEV__\) return requestedMode !== '0'/);
  assert.doesNotMatch(aboutExperienceSource, /copyVariant|aboutNarrativeCopyVariants/);
  assert.doesNotMatch(routeManifestSource, /['"]about-narrative-lab['"]\s*:/);
  assert.doesNotMatch(viteConfigSource, /['"]lab\/about-narrative['"]\s*:/);
});

test('the canonical document carries the accepted spoken narrative', () => {
  const authoredText = getAuthoredText();
  const modules = getEditorialModules();
  const firstProse = modules.find((module) => module.id === 'context')?.text || '';
  const disciplines = document.tracks.interactions.clips
    .find((clip) => clip.id === 'motion-discipline-reveal')
    ?.parameters?.items || [];

  assert.equal(getTextField('text-promise-main').text, 'About Me');
  assert.equal(
    getTextField('text-promise-main').description,
    'Hi, I’m Alex. I’m a designer because I’m endlessly curious about how things work.',
  );
  assert.equal(
    getTextField('text-complexity-idea').text,
    'I’ve always been drawn to complex problems…',
  );
  assert.equal(
    getTextField('text-complexity-conditions').text,
    '…especially the kind that don’t fit neatly into a single discipline.',
  );
  assert.equal(
    getTextField('text-complexity-curiosity').text,
    'The more complex the questions became…',
  );
  assert.equal(
    getTextField('text-complexity-listen').text,
    '…the more often I found myself working across disciplines.',
  );
  assert.match(firstProse, /new technology that people don’t quite trust yet/);
  assert.match(authoredText, /around thirteen years ago/);
  assert.match(authoredText, /AI becomes valuable when it strengthens human judgement/);
  assert.match(authoredText, /redesigning the iOS keyboard/);
  assert.deepEqual(
    modules.filter((module) => module.kind === 'list').map((module) => module.items),
    [
      ['Those are the problems I enjoy most.'],
      ['I’ve learned that the brief is often only part of the story.'],
    ],
  );
  assert.equal(modules.find((module) => module.id === 'selected-clients').label, 'Selected work from across my career.');
  assert.equal(
    modules.find((module) => module.id === 'selected-clients').items
      .find((item) => item.id === 'mccann').label,
    'McCann Worldgroup',
  );
  assert.equal(disciplines.length, 6);
  assert.ok(disciplines.every((item) => item.description.length >= 50));
  assert.doesNotMatch(authoredText, /\bfear\b|\bafraid\b/i);
  assert.doesNotMatch(authoredText, /—|;/);
});

test('the canonical ending is transformative and the finale continues it', () => {
  const closingTitles = [
    getTextField('text-life-momentum').text,
    getTextField('text-life-form').text,
    getTextField('text-life-character').text,
  ];
  const closingStatement = closingTitles.join(' ');
  const finale = getTextField('text-epilogue-invitation');

  assert.deepEqual(closingTitles, [
    'They may begin in one discipline…',
    '…but they rarely stay there…',
    '…and I like not knowing exactly where they’ll lead.',
  ]);
  assert.match(closingStatement, /discipline/i);
  assert.match(closingStatement, /rarely stay there/i);
  assert.match(closingStatement, /where they’ll lead/i);
  assert.doesNotMatch(closingStatement, /\bpeople\b/i);
  assert.equal(finale.text, 'Let’s begin.');
  assert.equal(
    finale.description,
    'If you’re working on something difficult to define, or have a question you can’t quite leave alone, I’d be curious to hear about it.',
  );
  assert.doesNotMatch(finale.text, /get in touch/i);
});
