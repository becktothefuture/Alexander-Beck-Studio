import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const candidatePath = 'docs/research/about-page-direction/preparation/ABOUT-V2-COPY-CANDIDATE-2026-08-31.json';
const candidate = JSON.parse(await readFile(new URL(candidatePath, root), 'utf8'));
const applied = process.argv.includes('--applied');
const baselineIndex = process.argv.indexOf('--baseline');
const baselinePath = baselineIndex >= 0 ? process.argv[baselineIndex + 1] : null;
assert.ok(!applied || baselinePath, 'Applied verification requires --baseline <the frozen proposal source>.');
const canonicalTextAtStart = await readFile(new URL(candidate.sourceDocument, root), 'utf8');
const sourceText = applied
  ? await readFile(new URL(baselinePath, root), 'utf8') : canonicalTextAtStart;
assert.equal(createHash('sha256').update(sourceText).digest('hex'), candidate.sourceSha256,
  'Canonical copy changed after this proposal was prepared; reconcile before applying it.');
const source = JSON.parse(sourceText);
const proposed = structuredClone(source);
const fields = proposed.tracks.text.fields;
const getField = (id, collection = fields) => {
  const matches = collection.filter((field) => field.id === id);
  assert.equal(matches.length, 1, `Expected exactly one field: ${id}`);
  return matches[0];
};
const getModule = (fieldId, moduleId, collection = fields) => {
  const matches = (getField(fieldId, collection).block?.modules || [])
    .filter((module) => module.id === moduleId);
  assert.equal(matches.length, 1, `Expected exactly one module: ${fieldId}/${moduleId}`);
  return matches[0];
};

for (const change of candidate.fieldChanges) {
  const field = getField(change.id);
  for (const [key, value] of Object.entries(change)) {
    if (key === 'id') continue;
    assert.ok(['text', 'description'].includes(key), `Unexpected copy field: ${key}`);
    assert.equal(typeof value, 'string');
    field[key] = value;
  }
}
for (const change of candidate.moduleChanges) {
  getModule(change.fieldId, change.moduleId).text = change.text;
}
for (const removal of candidate.removeModules) {
  getModule(removal.fieldId, removal.moduleId);
  const block = getField(removal.fieldId).block;
  block.modules = block.modules.filter((module) => module.id !== removal.moduleId);
}
for (const id of candidate.removeFields) getField(id);
proposed.tracks.text.fields = fields.filter((field) => !candidate.removeFields.includes(field.id));
assert.equal(new Set(candidate.fieldChanges.map((change) => change.id)).size, candidate.fieldChanges.length);
assert.equal(new Set(candidate.moduleChanges.map((change) => `${change.fieldId}/${change.moduleId}`)).size,
  candidate.moduleChanges.length);

const readerKeys = new Set(['description', 'employer', 'label', 'role', 'text', 'yearLabel']);
const containerKeys = new Set(['block', 'independentWork', 'items', 'modules']);
const words = (value) => String(value || '').match(/[\p{L}\p{N}]+(?:[’'-][\p{L}\p{N}]+)*/gu)?.length || 0;
const collect = (value) => {
  if (Array.isArray(value)) return value.flatMap((item) => typeof item === 'string' ? [item] : collect(item));
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).flatMap(([key, child]) => {
    if (readerKeys.has(key)) return typeof child === 'string' ? [child] : [];
    return containerKeys.has(key) ? collect(child) : [];
  });
};
const core = (collection) => collection.flatMap((field) => {
  if (field.kind === 'title') return [field.text, field.description].filter(Boolean);
  const block = field.block;
  if (!block) return [];
  const moduleText = (block.modules || []).flatMap((module) => {
    if (module.kind === 'prose') return [module.text];
    if (module.kind !== 'career-sequence') return [];
    return [module.label, ...(module.items || []).flatMap((item) => [item.yearLabel, item.employer, item.role]),
      module.independentWork?.label, module.independentWork?.text];
  });
  return [typeof block.text === 'string' ? block.text : '', ...moduleText].filter(Boolean);
});
const count = (document) => ({
  coreWords: words(core(document.tracks.text.fields).join(' ')),
  readerFacingWords: words(collect(document.tracks.text.fields).join(' ')),
  textFields: document.tracks.text.fields.length,
  careerWords: words(collect(getModule('text-background-unit', 'career-sequence', document.tracks.text.fields)).join(' ')),
});
const baseline = count(source);
const result = count(proposed);
assert.equal(result.textFields, 13);
assert.ok(result.coreWords <= candidate.limits.coreWords);
assert.ok(result.readerFacingWords <= candidate.limits.readerFacingWords);
assert.equal(result.careerWords, 35);
if (candidate.expectedCounts) assert.deepEqual(result, candidate.expectedCounts);

for (const id of candidate.preserve.unchangedFields) {
  assert.deepEqual(getField(id, proposed.tracks.text.fields), getField(id, source.tracks.text.fields));
}
for (const [fieldId, moduleId] of [
  ['text-background-unit', 'career-turns'],
  ['text-background-unit', 'career-sequence'],
  ['text-disciplines-title', 'selected-clients'],
]) {
  assert.deepEqual(getModule(fieldId, moduleId), getModule(fieldId, moduleId, source.tracks.text.fields));
}
assert.deepEqual(getModule('text-background-unit', 'career-sequence').items.map((item) => item.id), candidate.preserve.careerItemIds);
assert.deepEqual(getField('text-discipline-labels').block.items.map((item) => item.id), candidate.preserve.disciplineItemIds);
assert.equal(getModule('text-disciplines-title', 'selected-clients').items.length, candidate.preserve.clientItemCount);
assert.equal(getField('text-life-momentum').text, 'Make the work visible early.');
assert.equal(getField('text-complexity-idea').text, 'I’ve always been fascinated by…');
assert.equal(getField('text-complexity-conditions').text, '…how ideas become visual.');
assert.equal(getModule('text-background-unit', 'context').text,
  'I studied Communication Design in Mainz after two semesters of Computer Science. I wanted to explore visual language.');
assert.ok(proposed.tracks.text.fields.filter((field) => field.kind === 'title')
  .every((field) => !/Computer Science/i.test(field.text)));
assert.ok(!proposed.tracks.text.fields.some((field) => field.id === 'text-life-form'));
const allCopy = collect(proposed.tracks.text.fields).join('\n');
assert.doesNotMatch(allCopy, /—|\b(?:TBD|TODO|lorem ipsum|placeholder)\b/i);
assert.doesNotMatch(collect(getModule('text-background-unit', 'career-sequence')).join(' '), /present|current/i);
if (applied) assert.deepEqual(JSON.parse(canonicalTextAtStart), proposed,
  'The applied document must match the exact copy proposal and preserve every other authored value.');
assert.equal(await readFile(new URL(candidate.sourceDocument, root), 'utf8'), canonicalTextAtStart);

console.log(JSON.stringify({status: 'passed', mode: applied ? 'applied' : 'proposal', baseline, candidate: result,
  wordsRemoved: baseline.readerFacingWords - result.readerFacingWords,
  reductionPercent: Number(((baseline.readerFacingWords - result.readerFacingWords) / baseline.readerFacingWords * 100).toFixed(1)),
  canonicalUnchanged: true, careerRows: 5, disciplines: 6, clientMarks: 15,
  scope: 'Copy-only projection and preservation checks; not runtime, visual, factual or award certification.'}, null, 2));
if (process.argv.includes('--copy')) console.log(allCopy);
