import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { compileAboutNarrativeStoryLayout } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeStoryLayout.js';
import { synchronizeAboutNarrativeMomentTriggers } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeMoments.js';
import {
  loadAboutNarrativePointFieldPersistenceSource,
  serializeAboutNarrativePointFieldSource,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';

const CANONICAL_PATH = new URL(
  '../react-app/app/public/config/contents-about.json',
  import.meta.url,
);
const EXPERIENCE_PATH = new URL(
  '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx',
  import.meta.url,
);
const CSS_PATH = new URL(
  '../react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css',
  import.meta.url,
);
const [canonicalSource, experienceSource, cssSource] = await Promise.all([
  readFile(CANONICAL_PATH, 'utf8'),
  readFile(EXPERIENCE_PATH, 'utf8'),
  readFile(CSS_PATH, 'utf8'),
]);
const canonical = JSON.parse(canonicalSource);
const baseFixtureSource = structuredClone(canonical);
baseFixtureSource.tracks.text.fields.forEach((field) => {
  if (!Array.isArray(field.block?.modules)) return;
  field.block.modules = field.block.modules.filter((module) => module.kind !== 'career-sequence');
});
const baseFixtureLoad = loadAboutNarrativePointFieldPersistenceSource(
  synchronizeAboutNarrativeMomentTriggers(baseFixtureSource),
);
assert.equal(baseFixtureLoad.valid, true, baseFixtureLoad.message);
const baseFixture = baseFixtureLoad.document;

const FICTIONAL_CAREER_SEQUENCE = Object.freeze({
  id: 'career-sequence',
  kind: 'career-sequence',
  label: 'A fictional career sequence',
  items: Object.freeze([
    Object.freeze({
      id: 'paper-kite',
      yearLabel: '2001–2004',
      employer: 'Paper Kite Studio',
      role: 'Junior Pattern Maker',
    }),
    Object.freeze({
      id: 'north-star',
      yearLabel: '2004–2008',
      employer: 'North Star Workshop',
      role: 'Interaction Designer',
    }),
    Object.freeze({
      id: 'quiet-signal',
      yearLabel: '2008–2012',
      employer: 'Quiet Signal Works',
      role: 'Design Lead',
    }),
    Object.freeze({
      id: 'future-shapes',
      yearLabel: '2012–2016',
      employer: 'Future Shapes Laboratory',
      role: 'Creative Director',
    }),
  ]),
  independentWork: Object.freeze({
    label: 'Alongside',
    text: 'Small fictional experiments and collaborations.',
  }),
});

const FICTIONAL_FIVE_ROW_SEQUENCE = Object.freeze({
  ...FICTIONAL_CAREER_SEQUENCE,
  items: Object.freeze([
    ...FICTIONAL_CAREER_SEQUENCE.items,
    Object.freeze({
      id: 'paper-moon',
      yearLabel: '2016–2020',
      employer: 'Paper Moon Atelier',
      role: 'Design Director',
    }),
  ]),
});

function clone(value) {
  return structuredClone(value);
}

function getBackgroundModules(document) {
  return document.tracks.text.fields.find((field) => (
    field.id === 'text-background-unit'
  )).block.modules;
}

function withCareerSequence(module = FICTIONAL_CAREER_SEQUENCE) {
  const document = clone(baseFixture);
  document.tracks.text.fields.forEach((field) => {
    if (!Array.isArray(field.block?.modules)) return;
    field.block.modules = field.block.modules.filter((candidate) => candidate.id !== 'background');
  });
  const modules = getBackgroundModules(document);
  const practiceIndex = modules.findIndex((candidate) => candidate.id === 'practice');
  modules.splice(practiceIndex + 1, 0, clone(module));
  return document;
}

function getCareerSequence(document) {
  return getBackgroundModules(document).find((module) => (
    module.kind === 'career-sequence'
  ));
}

function invalidCareer(mutator) {
  const document = withCareerSequence();
  mutator(getCareerSequence(document));
  return loadAboutNarrativePointFieldPersistenceSource(document);
}

function hasDiagnostic(result, code, predicate = () => true) {
  return result.diagnostics.some((item) => (
    (item.code === code || item.code.endsWith(`-${code}`)) && predicate(item)
  ));
}

test('canonical production copy contains the five directly approved career rows', () => {
  const loaded = loadAboutNarrativePointFieldPersistenceSource(canonical);
  assert.equal(loaded.valid, true, loaded.message);
  const modules = canonical.tracks.text.fields.flatMap((field) => (
    field.block?.modules || []
  ));
  assert.equal(modules.filter((module) => module.kind === 'career-sequence').length, 1);
  const career = getCareerSequence(canonical);
  // Approved in Alexander's career follow-up. MRM's departure date was not supplied.
  assert.deepEqual(career, {
    id: 'career-sequence',
    kind: 'career-sequence',
    label: 'Experience',
    items: [
      { id: 'dennerlein', yearLabel: '2014–2017', employer: 'Dennerlein GmbH', role: 'Art Director' },
      { id: 'yoti', yearLabel: '2017–2019', employer: 'Yoti', role: 'Senior Product Designer' },
      { id: 'hugo-and-cat', yearLabel: '2020–2024', employer: 'Hugo & Cat', role: 'Associate Design Director' },
      { id: 'mrm', yearLabel: 'Joined 2024', employer: 'MRM (McCann)', role: 'Associate Design Director' },
      { id: 'critical-mass', yearLabel: 'May–Sep 2026', employer: 'Critical Mass', role: 'Associate Design Director' },
    ],
  });
  assert.equal(modules.some((module) => module.id === 'background'), false);
  assert.doesNotMatch(career.items.map((item) => item.yearLabel).join(' '), /present/i);
  assert.equal(getCareerSequence(baseFixture), undefined);
});

for (const sequence of [FICTIONAL_CAREER_SEQUENCE, FICTIONAL_FIVE_ROW_SEQUENCE]) {
  test(`a fictional ${sequence.items.length}-row career sequence validates and preserves authored order`, () => {
    const loaded = loadAboutNarrativePointFieldPersistenceSource(withCareerSequence(sequence));
    assert.equal(loaded.valid, true, loaded.message);
    const career = getCareerSequence(loaded.document);
    assert.deepEqual(career, sequence);
  });
}

test('career sequence validation is exact and rejects unsupported biography data', () => {
  for (const itemCount of [0, 3, 6]) {
    const wrongCount = invalidCareer((career) => {
      career.items = Array.from({ length: itemCount }, (_, index) => ({
        id: `fictional-role-${index}`,
        yearLabel: `${2001 + index}`,
        employer: 'Fictional Studio',
        role: 'Designer',
      }));
    });
    assert.equal(wrongCount.valid, false, `${itemCount} rows`);
    assert.ok(hasDiagnostic(wrongCount, 'career-sequence-item-count'), `${itemCount} rows`);
  }

  const duplicateId = invalidCareer((career) => {
    career.items[1].id = career.items[0].id;
  });
  assert.equal(duplicateId.valid, false);
  assert.ok(hasDiagnostic(duplicateId, 'duplicate-id'));

  const missingRole = invalidCareer((career) => {
    delete career.items[0].role;
  });
  assert.equal(missingRole.valid, false);
  assert.ok(hasDiagnostic(missingRole, 'unsafe-text', (item) => item.path.endsWith('.role')));

  for (const unsupportedKey of [
    'achievement',
    'candidateStatus',
    'client',
    'current',
    'endDate',
    'location',
    'logo',
    'projectOutcome',
    'startDate',
    'url',
  ]) {
    const unsupported = invalidCareer((career) => {
      career.items[0][unsupportedKey] = 'Not part of the public career contract';
    });
    assert.equal(unsupported.valid, false);
    assert.ok(hasDiagnostic(
      unsupported,
      'unknown-key',
      (item) => item.path.endsWith(`.${unsupportedKey}`),
    ));
  }

  const prose = invalidCareer((career) => {
    career.text = 'A career sequence cannot carry an extra prose field.';
  });
  assert.equal(prose.valid, false);
  assert.ok(hasDiagnostic(prose, 'career-sequence-field'));

  const malformedIndependentWork = invalidCareer((career) => {
    career.independentWork.logo = '/fictional-logo.svg';
  });
  assert.equal(malformedIndependentWork.valid, false);
  assert.ok(hasDiagnostic(
    malformedIndependentWork,
    'unknown-key',
    (item) => item.path.endsWith('.independentWork.logo'),
  ));
});

test('career copy limits keep the module compact', () => {
  const cases = [
    [(career) => { career.label = 'x'.repeat(49); }, '.label'],
    [(career) => { career.items[0].yearLabel = 'x'.repeat(25); }, '.yearLabel'],
    [(career) => { career.items[0].employer = 'x'.repeat(81); }, '.employer'],
    [(career) => { career.items[0].role = 'x'.repeat(101); }, '.role'],
    [(career) => { career.independentWork.label = 'x'.repeat(41); }, '.independentWork.label'],
    [(career) => { career.independentWork.text = 'x'.repeat(121); }, '.independentWork.text'],
  ];
  cases.forEach(([mutator, pathSuffix]) => {
    const loaded = invalidCareer(mutator);
    assert.equal(loaded.valid, false);
    assert.ok(hasDiagnostic(
      loaded,
      'unsafe-text',
      (item) => item.path.endsWith(pathSuffix),
    ));
  });

  const overWordBudget = invalidCareer((career) => {
    career.items.forEach((item) => {
      item.role = 'one two three four five six seven eight nine ten eleven twelve';
    });
  });
  assert.equal(overWordBudget.valid, false);
  assert.ok(hasDiagnostic(overWordBudget, 'career-sequence-word-budget'));
});

test('the public narrative permits one career sequence directly after practice', () => {
  const misplaced = withCareerSequence();
  const misplacedModules = getBackgroundModules(misplaced);
  misplacedModules.unshift(misplacedModules.pop());
  const misplacedResult = loadAboutNarrativePointFieldPersistenceSource(misplaced);
  assert.equal(misplacedResult.valid, false);
  assert.ok(hasDiagnostic(misplacedResult, 'career-sequence-placement'));

  const duplicate = withCareerSequence();
  const secondCareer = clone(FICTIONAL_CAREER_SEQUENCE);
  secondCareer.id = 'second-career-sequence';
  getBackgroundModules(duplicate).push(secondCareer);
  const duplicateResult = loadAboutNarrativePointFieldPersistenceSource(duplicate);
  assert.equal(duplicateResult.valid, false);
  assert.ok(hasDiagnostic(duplicateResult, 'career-sequence-count'));

  const wrongId = withCareerSequence();
  getCareerSequence(wrongId).id = 'career-history';
  const wrongIdResult = loadAboutNarrativePointFieldPersistenceSource(wrongId);
  assert.equal(wrongIdResult.valid, false);
  assert.ok(hasDiagnostic(wrongIdResult, 'career-sequence-id'));
});

test('an approved career sequence cannot coexist with the temporary generic career paragraph', () => {
  const document = withCareerSequence();
  getBackgroundModules(document).unshift({
    id: 'background',
    kind: 'prose',
    text: 'Fictional agency, in-house and independent work.',
  });
  const loaded = loadAboutNarrativePointFieldPersistenceSource(document);
  assert.equal(loaded.valid, false);
  assert.ok(hasDiagnostic(loaded, 'career-sequence-generic-background'));

  document.tracks.text.fields.forEach((field) => {
    if (!Array.isArray(field.block?.modules)) return;
    field.block.modules = field.block.modules.filter((module) => module.id !== 'background');
  });
  const atomicSubstitution = loadAboutNarrativePointFieldPersistenceSource(document);
  assert.equal(atomicSubstitution.valid, true, atomicSubstitution.message);
});

test('independent work remains exclusive to and subordinate within a career sequence', () => {
  const document = clone(baseFixture);
  const prose = getBackgroundModules(document).find((module) => module.kind === 'prose');
  prose.independentWork = { label: 'Alongside', text: 'Fictional work.' };
  const loaded = loadAboutNarrativePointFieldPersistenceSource(document);
  assert.equal(loaded.valid, false);
  assert.ok(hasDiagnostic(loaded, 'career-sequence-independent-work-owner'));
});

for (const sequence of [FICTIONAL_CAREER_SEQUENCE, FICTIONAL_FIVE_ROW_SEQUENCE]) {
  test(`${sequence.items.length}-row career persistence is deterministic and lossless with fictional data`, () => {
    const loaded = loadAboutNarrativePointFieldPersistenceSource(withCareerSequence(sequence));
    assert.equal(loaded.valid, true, loaded.message);
    const first = serializeAboutNarrativePointFieldSource(loaded.document);
    const reloaded = loadAboutNarrativePointFieldPersistenceSource(first);
    assert.equal(reloaded.valid, true, reloaded.message);
    assert.deepEqual(getCareerSequence(reloaded.document), sequence);
    assert.equal(serializeAboutNarrativePointFieldSource(reloaded.document), first);
  });
}

test('Story Stack reserves a structural footprint for heading, rows, and independent work', () => {
  for (const profileId of ['desktop', 'tablet', 'mobile']) {
    const baseline = compileAboutNarrativeStoryLayout(baseFixture, { profileId });
    const withCareer = compileAboutNarrativeStoryLayout(withCareerSequence(), { profileId });
    const withFiveRows = compileAboutNarrativeStoryLayout(
      withCareerSequence(FICTIONAL_FIVE_ROW_SEQUENCE),
      { profileId },
    );
    const baselineField = baseline.fields.find((field) => field.id === 'text-background-unit');
    const careerField = withCareer.fields.find((field) => field.id === 'text-background-unit');
    const fiveRowField = withFiveRows.fields.find((field) => field.id === 'text-background-unit');
    assert.ok(careerField.naturalScreens > baselineField.naturalScreens, profileId);
    assert.ok(careerField.durationWU >= baselineField.durationWU, profileId);
    assert.ok(fiveRowField.naturalScreens > careerField.naturalScreens, profileId);
    assert.ok(fiveRowField.durationWU >= careerField.durationWU, profileId);
  }

  const withoutIndependentWork = clone(FICTIONAL_CAREER_SEQUENCE);
  delete withoutIndependentWork.independentWork;
  const withoutIndependentLayout = compileAboutNarrativeStoryLayout(
    withCareerSequence(withoutIndependentWork),
    { profileId: 'desktop' },
  );
  const withIndependentLayout = compileAboutNarrativeStoryLayout(
    withCareerSequence(),
    { profileId: 'desktop' },
  );
  assert.ok(
    withIndependentLayout.fields.find((field) => field.id === 'text-background-unit').naturalScreens
      > withoutIndependentLayout.fields.find((field) => field.id === 'text-background-unit').naturalScreens,
  );
});

test('the renderer and responsive stylesheet keep the career sequence semantic and atomic', () => {
  assert.match(experienceSource, /function EditorialCareerSequence/);
  assert.match(experienceSource, /<section[\s\S]*aria-labelledby=\{labelId\}/);
  assert.match(experienceSource, /<h2 id=\{labelId\}/);
  assert.match(experienceSource, /<ol className="about-narrative-career-sequence__list">/);
  assert.match(experienceSource, /data-editorial-atomic-row="true"/);
  assert.match(experienceSource, /data-editorial-reveal="career-row"/);
  assert.match(experienceSource, /data-editorial-reveal="career-independent-work"/);
  assert.match(experienceSource, /module\.kind === ABOUT_NARRATIVE_CAREER_SEQUENCE_KIND/);
  assert.match(cssSource, /\.about-narrative-career-sequence__row\s*\{/);
  assert.match(
    cssSource,
    /data-about-layout-profile='mobile'[\s\S]*\.about-narrative-career-sequence__row[\s\S]*grid-template-columns: minmax\(0, 1fr\)/,
  );
});
