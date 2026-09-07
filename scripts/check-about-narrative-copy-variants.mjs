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

const READER_TEXT_KEYS = new Set([
  'description',
  'employer',
  'label',
  'role',
  'text',
  'yearLabel',
]);
const READER_CONTAINER_KEYS = new Set(['block', 'independentWork', 'items', 'modules']);
const WORD_PATTERN = /[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu;
const CORE_WORD_LIMIT = 365;
const TOTAL_WORD_LIMIT = 505;

function collectAuthoredText(value) {
  if (Array.isArray(value)) {
    return value.flatMap((item) => (
      typeof item === 'string' ? [item] : collectAuthoredText(item)
    ));
  }
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    if (READER_TEXT_KEYS.has(key)) return typeof child === 'string' ? [child] : [];
    if (READER_CONTAINER_KEYS.has(key)) return collectAuthoredText(child);
    return [];
  });
}

function getAuthoredText() {
  return collectAuthoredText(document.tracks.text.fields).filter(Boolean).join(' ');
}

function countWords(value) {
  return String(value || '').match(WORD_PATTERN)?.length || 0;
}

function collectCoreText() {
  return document.tracks.text.fields.flatMap((field) => {
    if (field.kind === 'title') {
      return [field.text, field.description].filter(Boolean);
    }
    const block = field.block;
    if (!block || typeof block !== 'object') return [];
    const blockText = typeof block.text === 'string' ? [block.text] : [];
    const moduleText = (block.modules || []).flatMap((module) => {
      if (module.kind === 'prose') return [module.text];
      if (module.kind !== 'career-sequence') return [];
      return [
        module.label,
        ...(module.items || []).flatMap((item) => [
          item.yearLabel,
          item.employer,
          item.role,
          item.description,
        ]),
        module.independentWork?.label,
        module.independentWork?.text,
      ];
    });
    return [block.label, ...blockText, ...moduleText].filter(Boolean);
  });
}

test('the copy walker includes every reader-facing career field recursively', () => {
  const copy = collectAuthoredText([{
    block: {
      modules: [{
        id: 'fictional-career',
        kind: 'career-sequence',
        label: 'Fictional history',
        items: [{
          id: 'fictional-role',
          yearLabel: '2001–2004',
          employer: 'Paper Kite Studio',
          role: 'Junior Pattern Maker',
        }],
        independentWork: {
          label: 'Alongside',
          text: 'Small fictional experiments.',
        },
      }],
    },
  }]).join(' ');

  assert.match(copy, /Fictional history/);
  assert.match(copy, /2001–2004 Paper Kite Studio Junior Pattern Maker/);
  assert.match(copy, /Alongside Small fictional experiments/);
  assert.doesNotMatch(copy, /fictional-role|career-sequence/);
});

test('canonical About copy stays within the locked core and total word budgets', () => {
  const coreWordCount = countWords(collectCoreText().join(' '));
  const totalWordCount = countWords(getAuthoredText());
  assert.ok(
    coreWordCount <= CORE_WORD_LIMIT,
    `Core About copy is ${coreWordCount} words; limit is ${CORE_WORD_LIMIT}.`,
  );
  assert.ok(
    totalWordCount <= TOTAL_WORD_LIMIT,
    `Total reader-facing About copy is ${totalWordCount} words; limit is ${TOTAL_WORD_LIMIT}.`,
  );
});

test('both word budgets include all five career rows and the qualified date wording', () => {
  const career = getEditorialModules().find((module) => module.kind === 'career-sequence');
  const careerCopy = collectAuthoredText(career).join(' ');
  const authoredText = getAuthoredText();
  const coreText = collectCoreText().join(' ');

  assert.equal(career.items.length, 5);
  assert.equal(countWords(careerCopy), 116);
  assert.equal(countWords('Joined 2024'), 2);
  assert.equal(countWords('May–Sep 2026'), 3);
  assert.ok(authoredText.includes(careerCopy));
  assert.ok(coreText.includes(careerCopy));
  assert.equal(countWords(coreText), 352);
  assert.equal(countWords(authoredText), 490);
});

test('development keeps canonical About playback while production holds publication', () => {
  assert.match(aboutRouteSource, /mainLandmarkHeadingId: 'about-route-title'/);
  assert.match(aboutRouteSource, /if \(!import\.meta\.env\.DEV\) return Promise\.resolve\(\)/);
  assert.match(aboutRouteSource, /secondary: <AboutComingSoon \/>/);
  assert.match(aboutRouteSource, /import\.meta\.env\.DEV \? lazy\(loadAboutNarrativeExperience\) : null/);
  assert.doesNotMatch(aboutRouteSource, /preview.*about|searchParams|localStorage/);
  assert.doesNotMatch(aboutRouteSource, /getAboutExperienceVersion|experienceVersion=/);
  assert.match(aboutExperienceSource, /const initialDocument = ABOUT_NARRATIVE_DOCUMENT/);
  assert.match(aboutExperienceSource, /const resolvedExperienceVersion = CANONICAL_ABOUT_EXPERIENCE_VERSION/);
  assert.doesNotMatch(aboutExperienceSource, /<main\b/, 'The shell owns the only main landmark.');
  assert.doesNotMatch(aboutExperienceSource, /copyVariant|aboutNarrativeCopyVariants/);
  assert.doesNotMatch(routeManifestSource, /['"]about-narrative-lab['"]\s*:/);
  assert.doesNotMatch(viteConfigSource, /['"]lab\/about-narrative['"]\s*:/);
});

test('the canonical document carries the accepted spoken narrative', () => {
  const authoredText = getAuthoredText();
  const modules = getEditorialModules();
  const openingModules = getTextField('text-background-unit')?.block?.modules || [];
  const disciplineField = getTextField('text-discipline-labels');
  const clientField = getTextField('text-selected-clients');
  const workingModules = getTextField('text-life-character')?.block?.modules || [];
  const disciplines = disciplineField?.block?.items || [];
  const selectedClients = clientField?.block?.modules?.find((module) => module.id === 'selected-clients');

  assert.equal(getTextField('text-promise-main').text, 'Hi, I’m Alex.');
  assert.equal(
    getTextField('text-promise-main').description,
    'I’m a designer at heart. I work across product design, visual systems, motion, 3D and code.',
  );
  assert.equal(
    getTextField('text-complexity-idea').text,
    'I think in pictures.',
  );
  assert.equal(
    getTextField('text-complexity-conditions').text,
    'Design was my way in.',
  );
  assert.equal(
    getTextField('text-complexity-curiosity').text,
    'I follow the idea.',
  );
  assert.equal(
    getTextField('text-complexity-listen').text,
    'It rarely stays in one lane.',
  );
  assert.deepEqual(openingModules.map((module) => module.id), ['context', 'career-turns', 'practice', 'career-sequence']);
  assert.equal(openingModules[0].text,
    'I studied Communication Design in Mainz after two semesters of Computer Science. I wanted to explore visual language.');
  assert.match(openingModules[1].text, /interfaces, icon systems and motion alongside developers/);
  assert.match(openingModules[1].text, /Identity work brought product, brand and trust/);
  assert.match(openingModules[2].text, /make things clear without losing their character/);
  assert.equal(openingModules[3].items.length, 5);
  assert.equal(getTextField('text-background-unit').block.label, 'My background');
  assert.equal(getTextField('text-disciplines-title').text, 'I connect the disciplines.');
  assert.equal(getTextField('text-life-character').block.label, 'How I work');
  assert.doesNotMatch(authoredText, /I’ve worked in agencies, in-house and independently/);
  assert.match(disciplineField.block.text, /A decision in one discipline changes what’s possible in another/);
  assert.match(disciplineField.block.text, /code and AI to turn assumptions into things we can test/);
  assert.doesNotMatch(disciplineField.block.text, /My practice brings together/);
  assert.deepEqual(workingModules.map((module) => module.id), ['begin', 'make', 'collaborate']);
  assert.match(workingModules[0].text, /A real thing reveals more than a long explanation/);
  assert.match(workingModules[1].text, /If an interaction is hard to follow, I can change it in code and test it again/);
  assert.match(workingModules[2].text, /invite collaborators to challenge it while decisions are open/);
  assert.equal(selectedClients.label, 'Selected clients');
  assert.equal(openingModules.some((module) => module.id === 'selected-clients'), false);
  assert.equal(workingModules.some((module) => module.id === 'selected-clients'), false);
  assert.equal(clientField.block.kind, 'stack');
  assert.deepEqual(clientField.block.modules.map((module) => module.id), ['selected-clients']);
  assert.deepEqual(
    selectedClients.items.map((item) => item.id),
    [
      'yoti',
      'sp-global',
      'bentley',
      'sunexpress',
      'mccann',
      'american-heart-association',
      'sony',
      'jaguar-land-rover',
      'maybourne-hotels',
      'experian',
      'dcc',
      'tourism-ireland',
      'lufthansa',
      'general-motors',
      'think-money-think-life',
    ],
  );
  assert.ok(selectedClients.items.every((item) => item.label && item.src && item.alt));
  assert.equal(
    selectedClients.items
      .find((item) => item.id === 'mccann').label,
    'McCann Worldgroup',
  );
  assert.equal(modules.some((module) => module.kind === 'interactive-stack'), false);
  assert.equal(disciplineField.block.kind, 'disciplines');
  assert.equal(disciplines.length, 6);
  assert.ok(disciplines.every((item) => item.description.length >= 50));
  assert.doesNotMatch(authoredText, /Over the past thirteen years/);
  assert.doesNotMatch(authoredText, /\bfear\b|\bafraid\b/i);
});

test('personal origin and career context precede the thesis and its separate client evidence field', () => {
  const fields = document.tracks.text.fields;
  const originIndex = fields.findIndex((field) => field.id === 'text-background-unit');
  const thesisIndex = fields.findIndex((field) => field.id === 'text-complexity-curiosity');
  const disciplinesIndex = fields.findIndex((field) => field.id === 'text-discipline-labels');
  const proofIndex = fields.findIndex((field) => field.id === 'text-disciplines-title');

  assert.equal(fields.length, 14);
  assert.ok(originIndex < thesisIndex && thesisIndex < disciplinesIndex && disciplinesIndex < proofIndex);
  assert.equal(getEditorialModules().filter((module) => module.id === 'background').length, 0);
  assert.equal(getEditorialModules().filter((module) => module.id === 'career-turns').length, 1);
  assert.equal(getEditorialModules().filter((module) => module.kind === 'career-sequence').length, 1);
  assert.equal(getTextField('text-background-unit').flow.focusMode, 'reading-start');
  assert.doesNotMatch(getAuthoredText(), /\bFACT SLOT\b|\bNON-PRODUCTION\b|\bTBC\b|\bTBD\b|—/);
});

test('the story alternates paired statements with prose and evidence sections', () => {
  const fields = document.tracks.text.fields;
  assert.deepEqual(
    fields.map((field) => field.kind),
    [
      'title',
      'title', 'title', 'scroll-block',
      'title', 'title', 'scroll-block', 'scroll-block',
      'title', 'title', 'scroll-block',
      'title', 'title', 'title',
    ],
  );
  assert.equal(getTextField('text-background-unit').block.modules.at(-1).kind, 'career-sequence');
  assert.equal(getTextField('text-discipline-labels').block.kind, 'disciplines');
  assert.equal(getTextField('text-discipline-labels').block.text.length > 0, true);
  assert.equal(getTextField('text-selected-clients').block.modules.at(-1).id, 'selected-clients');
  assert.equal(getTextField('text-life-character').block.modules.some((module) => module.id === 'selected-clients'), false);
});

test('the canonical ending moves from an active working method into the invitation', () => {
  const workingTitle = getTextField('text-life-momentum').text;
  const workingField = getTextField('text-life-character');
  const finale = getTextField('text-epilogue-invitation');

  assert.equal(workingTitle, 'I make it real, early.');
  assert.equal(getTextField('text-life-form'), undefined);
  assert.equal(workingField.kind, 'scroll-block');
  assert.equal(workingField.presentation.layout, 'reading');
  assert.equal(finale.text, 'Let’s begin.');
  assert.equal(
    finale.description,
    'Tell me what you’re trying to make possible.',
  );
  assert.doesNotMatch(finale.text, /get in touch/i);
});
