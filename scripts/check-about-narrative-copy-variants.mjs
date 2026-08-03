import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  loadAboutNarrativePointFieldPersistenceSource,
  preflightAboutNarrativePointFieldRuntimePlans,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';
import {
  ABOUT_NARRATIVE_COPY_VARIANTS,
  createAboutNarrativeCopyVariantDocument,
  getAboutNarrativeCopyVariant,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeCopyVariants.js';

const RAW_DOCUMENT_PATH = new URL('../react-app/app/public/config/contents-about.json', import.meta.url);
const rawDocument = JSON.parse(await readFile(RAW_DOCUMENT_PATH, 'utf8'));
const loaded = loadAboutNarrativePointFieldPersistenceSource(rawDocument, {
  preflight: preflightAboutNarrativePointFieldRuntimePlans,
});

assert.equal(loaded.valid, true, loaded.message);

const baseDocument = loaded.document;

function getTextField(document, id) {
  return document.tracks.text.fields.find((field) => field.id === id);
}

function getEditorialModules(document) {
  return document.tracks.text.fields.flatMap((field) => field.block?.modules || []);
}

function getAuthoredText(document) {
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

function animationContract(document) {
  const interactions = structuredClone(document.tracks.interactions);
  const disciplineItems = interactions.clips
    .find((clip) => clip.id === 'motion-discipline-reveal')
    ?.parameters?.items || [];
  disciplineItems.forEach((item) => { delete item.description; });

  return {
    globals: document.globals,
    profiles: document.profiles,
    camera: document.tracks.camera,
    visibility: document.tracks.visibility,
    pointField: document.tracks.pointField,
    interactions,
    textTiming: document.tracks.text.fields.map((field) => ({
      id: field.id,
      kind: field.kind,
      startWU: field.startWU,
      focusWU: field.focusWU,
      endWU: field.endWU,
      movement: field.movement,
      preset: field.preset,
      titleStyle: field.titleStyle,
      presentation: field.presentation,
    })),
  };
}

test('only the converged copy candidate remains active', () => {
  assert.deepEqual(
    ABOUT_NARRATIVE_COPY_VARIANTS.map((variant) => variant.id),
    ['current'],
  );
  assert.equal(getAboutNarrativeCopyVariant(new URLSearchParams('copy=current'))?.id, 'current');
  assert.equal(getAboutNarrativeCopyVariant('voice-synthesis'), null);
  assert.equal(getAboutNarrativeCopyVariant('not-a-variant'), null);
  assert.equal(createAboutNarrativeCopyVariantDocument(baseDocument, 'not-a-variant'), baseDocument);
});

test('the current candidate changes copy without changing the animation contract', () => {
  const document = createAboutNarrativeCopyVariantDocument(baseDocument, 'current');
  const modules = getEditorialModules(document);
  const disciplines = document.tracks.interactions.clips
    .find((clip) => clip.id === 'motion-discipline-reveal')
    ?.parameters?.items || [];

  assert.notEqual(document, baseDocument);
  assert.deepEqual(animationContract(document), animationContract(baseDocument));
  assert.equal(modules.filter((module) => module.kind === 'list').length, 0);
  assert.equal(modules.find((module) => module.id === 'selected-clients').label, 'Selected work from across my career.');
  assert.equal(disciplines.length, 6);
  assert.ok(disciplines.every((item) => item.description.length >= 50));
});

test('the current candidate carries the accepted spoken narrative decisions', () => {
  const document = createAboutNarrativeCopyVariantDocument(baseDocument, 'current');
  const authoredText = getAuthoredText(document);
  const firstProse = getEditorialModules(document).find((module) => module.id === 'context')?.text || '';

  assert.equal(getTextField(document, 'text-promise-main').text, 'About Me');
  assert.equal(
    getTextField(document, 'text-promise-main').description,
    'Hi, I’m Alex. I’m a designer at heart, and I love what I do.',
  );
  assert.equal(
    getTextField(document, 'text-complexity-idea').text,
    'I’ve always been fascinated by complex problems…',
  );
  assert.equal(
    getTextField(document, 'text-complexity-conditions').text,
    '…especially those that require multidisciplinary thinking.',
  );
  assert.match(firstProse, /identity technology, a financial product or something as ordinary as a keyboard/);
  assert.match(authoredText, /13 years ago/);
  assert.match(authoredText, /purposeful use of AI/);
  assert.match(authoredText, /music, Lego and independent games/);
  assert.doesNotMatch(authoredText, /\bfear\b|\bafraid\b/i);
  assert.doesNotMatch(authoredText, /—|;/);
  assert.doesNotMatch(authoredText, /\b(?:human shape|find a way through|make the question tangible|what the problem asks of me|the work widened)\b/i);
});

test('the ending is transformative and the finale continues it', () => {
  const document = createAboutNarrativeCopyVariantDocument(baseDocument, 'current');
  const closingTitles = [
    getTextField(document, 'text-life-momentum').text,
    getTextField(document, 'text-life-form').text,
    getTextField(document, 'text-life-character').text,
  ];
  const closingStatement = closingTitles.join(' ');
  const finale = getTextField(document, 'text-epilogue-invitation');

  assert.deepEqual(closingTitles, [
    'Different disciplines don’t simply add up…',
    '…they change one another as the work develops…',
    '…until the combination becomes something of its own.',
  ]);
  assert.match(closingStatement, /disciplines/i);
  assert.match(closingStatement, /change one another/i);
  assert.match(closingStatement, /combination/i);
  assert.doesNotMatch(closingStatement, /\bpeople\b/i);
  assert.equal(finale.text, 'Let’s make something new');
  assert.equal(finale.description, 'If you have a complex problem in mind, I’d be curious to hear about it.');
  assert.doesNotMatch(finale.text, /get in touch/i);
});
