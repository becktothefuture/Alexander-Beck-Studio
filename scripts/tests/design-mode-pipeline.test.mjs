import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import adapter from '../../design-mode.config.mjs';
import { applyButtonBarCssVars } from '../../react-app/app/src/lib/buttonBarControls.js';
import { createTokenPlan, applyTokenPlan, readSnapshot, readPointer, encodeTokenValue } from '../lib/design-mode-pipeline.mjs';

const repo = fileURLToPath(new URL('../..', import.meta.url));
async function fixture(t) {
  const root = await mkdtemp(resolve(tmpdir(), 'design-mode-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  for (const file of adapter.files) {
    await mkdir(dirname(resolve(root, file)), { recursive: true });
    await writeFile(resolve(root, file), await readFile(resolve(repo, file)));
  }
  return root;
}
const report = (changes, extra = {}) => ({ pageUrl: 'http://localhost:8012/', tokenChanges: changes, ...extra });
const change = (cssVar, oldValue, newValue, extra = {}) => ({ cssVar, scopeSelector: ':root', oldValue, newValue, ...extra });

test('mobile token save, canonical reload, generated parity and responsive aliases', async (t) => {
  const root = await fixture(t);
  const before = await readSnapshot(root, adapter);
  const old = before[adapter.canonical].document.runtime.buttonBarMobileHeightPx;
  const plan = await createTokenPlan(root, adapter, report([change('--button-bar-mobile-height', `${old}px`, '66px')]));
  assert.equal(plan.ready, true);
  const result = await applyTokenPlan(root, adapter, plan);
  assert.equal(result.applied, 1);
  const after = await readSnapshot(root, adapter);
  const expected = structuredClone(before[adapter.canonical].document);
  expected.runtime.buttonBarMobileHeightPx = 66;
  assert.deepEqual(after[adapter.canonical].document, expected);
  assert.equal(after['react-app/app/public/config/default-config.json'].document.buttonBarMobileHeightPx, 66);
  for (const file of adapter.files.filter((file) => /shell-config|portfolio-config|cv-config/u.test(file))) {
    assert.equal(after[file].text, before[file].text);
  }
  const variables = new Map();
  applyButtonBarCssVars(expected.runtime, { style: { setProperty: (key, value) => variables.set(key, value) } });
  assert.equal(variables.get('--button-bar-mobile-height'), '66px');
  assert.equal(variables.get('--button-bar-height'), `${expected.runtime.buttonBarHeightPx}px`);
  assert.match(variables.get('--button-bar-frame-reserve'), /^calc\(var\(/u);
  assert.equal(variables.get('--shell-tab-height'), 'var(--button-bar-button-height)');
});

test('every registered binding agrees with the actual runtime CSS projection', async (t) => {
  const root = await fixture(t);
  const snapshot = await readSnapshot(root, adapter);
  const variables = new Map();
  applyButtonBarCssVars(snapshot[adapter.canonical].document.runtime, { style: { setProperty: (key, value) => variables.set(key, value) } });
  for (const binding of adapter.bindings) {
    assert.equal(variables.get(binding.cssVar), encodeTokenValue(readPointer(snapshot[binding.file].document, binding.pointer), binding), binding.cssVar);
  }
});

test('pixel projection returns to the canonical rem value', async (t) => {
  const root = await fixture(t);
  const snapshot = await readSnapshot(root, adapter);
  const old = snapshot[adapter.canonical].document.runtime.buttonBarMobileFontSizeRem * 16;
  const plan = await createTokenPlan(root, adapter, report([change('--button-bar-mobile-font-size', `${old}px`, '11px')]));
  await applyTokenPlan(root, adapter, plan);
  assert.equal((await readSnapshot(root, adapter))[adapter.canonical].document.runtime.buttonBarMobileFontSizeRem, 11 / 16);
});

test('stale source and tampered plans cannot overwrite files', async (t) => {
  const root = await fixture(t);
  const snapshot = await readSnapshot(root, adapter);
  const old = snapshot[adapter.canonical].document.runtime.buttonBarMobileHeightPx;
  const plan = await createTokenPlan(root, adapter, report([change('--button-bar-mobile-height', `${old}px`, '66px')]));
  const changed = structuredClone(plan);
  changed.operations[0].after = 70;
  await assert.rejects(applyTokenPlan(root, adapter, changed), /modified plan/u);
  const path = resolve(root, adapter.canonical);
  await writeFile(path, `${await readFile(path, 'utf8')}\n`);
  await assert.rejects(applyTokenPlan(root, adapter, plan), /Stale/u);
  assert.equal((await readSnapshot(root, adapter))[adapter.canonical].document.runtime.buttonBarMobileHeightPx, old);
});

test('unsupported, ambiguous, mixed and stale-browser edits fail without writing', async (t) => {
  const root = await fixture(t);
  const snapshot = await readSnapshot(root, adapter);
  const old = snapshot[adapter.canonical].document.runtime.buttonBarMobileHeightPx;
  const valid = change('--button-bar-mobile-height', `${old}px`, '66px');
  const cases = [
    report([change('--unknown', '1px', '2px')]),
    report([{ ...valid, scopeSelector: '.dark' }]),
    report([{ ...valid, media: '(max-width: 600px)' }]),
    report([{ ...valid, oldValue: '1px' }]),
    report([{ ...valid, newValue: '999px' }]),
    report([{ ...valid, newValue: 'calc(20px + 1vw)' }]),
    report([{ ...valid, newValue: 'var(--other)' }]),
    report([valid, valid]),
    report([valid], { styleChanges: [{ selector: 'body', property: 'padding', newValue: '10px' }] }),
  ];
  for (const input of cases) {
    const plan = await createTokenPlan(root, adapter, input);
    assert.equal(plan.ready, false);
    await assert.rejects(applyTokenPlan(root, adapter, plan), /unresolved/u);
  }
  assert.deepEqual(await readSnapshot(root, adapter), snapshot);
});

test('handoffs from production, another local project or another origin are rejected', async (t) => {
  const root = await fixture(t);
  for (const url of ['https://beck.fyi/', 'http://localhost:8014/', 'http://localhost:3000/', 'http://evil.test/']) {
    await assert.rejects(createTokenPlan(root, adapter, report([], { pageUrl: url })), /does not author/u);
  }
  await assert.rejects(createTokenPlan(root, adapter, report([], { handoff: { pageUrl: 'http://localhost:3000' } })), /does not author/u);
});

test('pre-existing generated drift is not silently repaired by an unrelated edit', async (t) => {
  const root = await fixture(t);
  const path = resolve(root, 'react-app/app/public/config/default-config.json');
  const document = JSON.parse(await readFile(path, 'utf8'));
  document.buttonBarMobileHeightPx = 51;
  await writeFile(path, JSON.stringify(document));
  await assert.rejects(createTokenPlan(root, adapter, report([])), /already stale/u);
});

test('source traversal and symlinks cannot become write targets', async (t) => {
  const root = await fixture(t);
  const target = resolve(root, 'external.json');
  await symlink(resolve(root, adapter.canonical), target);
  await assert.rejects(readSnapshot(root, { files: ['external.json'] }), /non-symlink/u);
  await assert.rejects(readSnapshot(root, { files: [resolve(root, adapter.canonical)] }), /project-relative/u);
});

test('a project root alias supports saves without allowing source symlinks', async (t) => {
  const root = await fixture(t);
  const directory = await mkdtemp(resolve(tmpdir(), 'design-mode-root-alias-'));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const alias = resolve(directory, 'project');
  await symlink(root, alias, 'dir');
  const snapshot = await readSnapshot(alias, adapter);
  const old = snapshot[adapter.canonical].document.runtime.buttonBarMobileHeightPx;
  const plan = await createTokenPlan(alias, adapter, report([change('--button-bar-mobile-height', `${old}px`, '66px')]));
  const result = await applyTokenPlan(alias, adapter, plan);
  assert.ok(result.files.includes(adapter.canonical));
  assert.equal((await readSnapshot(root, adapter))[adapter.canonical].document.runtime.buttonBarMobileHeightPx, 66);
  await symlink(resolve(root, 'react-app'), resolve(root, 'linked-source'), 'dir');
  await assert.rejects(readSnapshot(alias, { files: ['linked-source/app/public/config/design-system.json'] }), /non-symlink/u);
});

test('a second project can preserve and mutate an alias using only an adapter', async (t) => {
  const root = await mkdtemp(resolve(tmpdir(), 'design-mode-other-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(resolve(root, 'tokens.json'), JSON.stringify({ colour: { action: 'var(--blue-600)' }, spacing: { inset: 'clamp(1rem, 2vw, 2rem)' } }));
  const generic = { id: 'other-project', version: 1, origins: ['http://localhost:3000'], files: ['tokens.json'],
    bindings: [{ cssVar: '--action', scopes: [':root'], file: 'tokens.json', pointer: '/colour/action', valueType: 'string', context: 'Theme alias' }],
    validate() {}, derive: (documents) => documents, withWriteLock: (operation) => operation(),
    persist: adapter.persist,
  };
  // Use this fixture's root transaction, not beck.fyi's config directory.
  const { applyLocalFileTransaction } = await import('../lib/local-file-transaction.mjs');
  generic.persist = (path, replacements) => applyLocalFileTransaction({ rootPath: path, replacements });
  const plan = await createTokenPlan(root, generic, { pageUrl: 'http://localhost:3000', tokenChanges: [change('--action', 'var(--blue-600)', 'var(--violet-600)')] });
  await applyTokenPlan(root, generic, plan);
  assert.deepEqual(JSON.parse(await readFile(resolve(root, 'tokens.json'), 'utf8')), { colour: { action: 'var(--violet-600)' }, spacing: { inset: 'clamp(1rem, 2vw, 2rem)' } });
});

test('transaction failure rolls back canonical and generated files', async (t) => {
  const root = await fixture(t);
  const snapshot = await readSnapshot(root, adapter);
  const old = snapshot[adapter.canonical].document.runtime.buttonBarMobileHeightPx;
  const plan = await createTokenPlan(root, adapter, report([change('--button-bar-mobile-height', `${old}px`, '66px')]));
  const { applyLocalFileTransaction, LOCAL_FILE_TRANSACTION_IO } = await import('../lib/local-file-transaction.mjs');
  let failed = false;
  const io = { ...LOCAL_FILE_TRANSACTION_IO, async rename(from, to) {
    if (!failed && from.includes('/staged/') && to.endsWith('default-config.json')) { failed = true; throw new Error('Injected disk failure'); }
    return LOCAL_FILE_TRANSACTION_IO.rename(from, to);
  } };
  const failing = { ...adapter, persist: (path, replacements) => applyLocalFileTransaction({ rootPath: resolve(path, 'react-app/app/public/config'), replacements }, { io }) };
  await assert.rejects(applyTokenPlan(root, failing, plan), /Injected disk failure/u);
  assert.deepEqual(await readSnapshot(root, adapter), snapshot);
});
