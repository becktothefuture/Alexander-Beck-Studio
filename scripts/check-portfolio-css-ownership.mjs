#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { access, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildOwnershipSignature,
  classifyPortfolioOverlaps,
  computedContractSignature,
  evaluateActiveCardPaintSuppression,
  hasPositivePortfolioTarget,
  parseCssRules,
  promoteEvidenceRun,
  specificity,
  splitSelectorList,
  summarizeOwnership,
} from './lib/portfolio-css-ownership.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('selector lists preserve commas inside functional selectors', () => {
  assert.deepEqual(splitSelectorList('.card:is(.active, .open), #sheet > .title'), [
    '.card:is(.active, .open)',
    '#sheet > .title',
  ]);
});

test('Selectors Level 4 functional pseudos use argument specificity', () => {
  assert.deepEqual(specificity('.x:is(#hero, .card)'), [1, 1, 0]);
  assert.deepEqual(specificity('article:where(#hero, .card) .x'), [0, 1, 1]);
  assert.deepEqual(specificity('.x:not(:is(.card, #hero), [data-copy="a,b:c"])'), [1, 1, 0]);
  assert.deepEqual(specificity('.x:has(> .card:not(#hero, .quiet))'), [1, 2, 0]);
  assert.deepEqual(specificity('.x:nth-child(2n of .card, #hero)'), [1, 2, 0]);
  assert.deepEqual(specificity('.x:nth-last-child(odd of :is(.card, #hero), .quiet)'), [1, 2, 0]);
  assert.deepEqual(specificity('.escaped\\:class[data-copy="semi;colon:comma,"]::before'), [0, 2, 1]);
});

test('declarations ignore comment and string punctuation and fail closed on malformed shapes', () => {
  const [rule] = parseCssRules(`
    .card {
      content: "looks: like; color: red";
      /* fake-property: bad; */
      background: url("data:image/svg+xml;a:b;c");
      --copy: "x;y:z";
    }
  `, 'declarations.css');
  assert.deepEqual(rule.properties, ['content', 'background', '--copy']);
  assert.throws(() => parseCssRules('.card { color red; }', 'broken.css'), /Malformed CSS declaration/);
  assert.throws(() => parseCssRules('.card { nested { color: red; } }', 'nested.css'), /Malformed CSS declaration/);
  assert.throws(() => parseCssRules('.card { content: "open; }', 'string.css'), /Unclosed CSS string/);
});

test('statement at-rules are explicit and unknown statements fail closed', () => {
  assert.equal(parseCssRules(`
    @charset "UTF-8";
    @import url("theme.css") screen;
    @namespace svg url(http://www.w3.org/2000/svg);
    @layer reset, components;
    .card { color: red; }
  `, 'statements.css').length, 1);
  assert.throws(() => parseCssRules('@custom thing; .card { color: red; }', 'unknown.css'), /Unsupported CSS statement at-rule/);
  assert.throws(() => parseCssRules('@layer; .card { color: red; }', 'layer.css'), /Malformed CSS statement at-rule/);
  assert.throws(() => parseCssRules('nonsense; .card { color: red; }', 'statement.css'), /Unsupported CSS statement/);
});

test('parser preserves source order, conditions, declarations, and specificity', () => {
  const rules = parseCssRules(`
    .button-bar { color: black; display: flex; }
    @media (max-width: 600px) {
      body.portfolio-page .portfolio-card, #portfolio-sheet-host { color: white; }
    }
  `, 'fixture.css');
  assert.equal(rules.length, 3);
  assert.deepEqual(rules.map((rule) => rule.sourceOrder), [1, 2, 2]);
  assert.deepEqual(rules[1].conditions, ['@media (max-width: 600px)']);
  assert.deepEqual(rules[1].properties, ['color']);
  assert.deepEqual(rules[1].specificity, [0, 2, 1]);
  assert.deepEqual(rules[2].specificity, [1, 0, 0]);
});

test('ownership signatures include ordered nested conditional contexts', () => {
  const source = `
    @media (min-width: 40rem) {
      @supports (display: grid) {
        @container card (inline-size > 20rem) {
          @layer components { body.portfolio-page .card { color: red; } }
        }
      }
    }
  `;
  const main = parseCssRules(source, 'main.css');
  const portfolio = parseCssRules(source.replace('red', 'white'), 'portfolio.css');
  const signature = buildOwnershipSignature(classifyPortfolioOverlaps(main, portfolio));
  assert.deepEqual(signature[0].main[3], [
    '@media (min-width: 40rem)',
    '@supports (display: grid)',
    '@container card (inline-size > 20rem)',
    '@layer components',
  ]);
  for (const mutation of [
    source.replace('40rem', '41rem'),
    source.replace('display: grid', 'display: flex'),
    source.replace('20rem', '21rem'),
    source.replace('components', 'overrides'),
  ]) {
    const mutated = buildOwnershipSignature(classifyPortfolioOverlaps(
      parseCssRules(mutation, 'main.css'), portfolio,
    ));
    assert.notDeepEqual(mutated, signature);
  }
});

test('computed style signatures reject value and provenance drift', () => {
  const contract = [{
    browser: 'chromium',
    base: {
      title: {
        contract: { color: 'rgb(0, 0, 0)' },
        provenance: { color: [{ href: '/css/portfolio.css', selector: '.title', value: 'black' }] },
      },
    },
  }];
  const baseline = computedContractSignature(contract);
  const styleMutation = structuredClone(contract);
  styleMutation[0].base.title.contract.color = 'rgb(255, 0, 0)';
  assert.notEqual(computedContractSignature(styleMutation), baseline);
  const provenanceMutation = structuredClone(contract);
  provenanceMutation[0].base.title.provenance.color[0].href = '/css/main.css';
  assert.notEqual(computedContractSignature(provenanceMutation), baseline);
});

test('active card paint proof requires containment and effective suppression', () => {
  const visible = { display: 'block', visibility: 'visible', opacity: 1 };
  const hiddenAncestor = { ...visible, opacity: 0 };
  assert.deepEqual(evaluateActiveCardPaintSuppression({
    deck: hiddenAncestor,
    card: visible,
    cardContainedByDeck: true,
  }), {
    cardContainedByDeck: true,
    deckSuppressesPaint: true,
    cardSuppressesPaint: false,
    accepted: true,
  });
  assert.equal(evaluateActiveCardPaintSuppression({
    deck: visible,
    card: visible,
    cardContainedByDeck: true,
  }).accepted, false);
  assert.equal(evaluateActiveCardPaintSuppression({
    deck: hiddenAncestor,
    card: visible,
    cardContainedByDeck: false,
  }).accepted, false);
});

test('failed evidence validation preserves approved artifacts byte-for-byte', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'portfolio-css-evidence-'));
  const approvedDir = resolve(root, 'approved');
  const runDir = resolve(root, 'run');
  await mkdir(approvedDir);
  await mkdir(runDir);
  await writeFile(resolve(approvedDir, 'report.json'), '{"signature":"approved"}\n');
  await writeFile(resolve(approvedDir, 'drawer.png'), Buffer.from('approved-image'));
  await writeFile(resolve(runDir, 'report.json'), '{"signature":"mutated"}\n');
  const approvedFiles = ['report.json', 'drawer.png'];
  const before = await Promise.all(approvedFiles.map(async (name) => createHash('sha256')
    .update(await readFile(resolve(approvedDir, name))).digest('hex')));
  await assert.rejects(() => promoteEvidenceRun({
    runDir,
    approvedDir,
    validate: async () => { throw new Error('computed provenance drift'); },
  }), /computed provenance drift/);
  const after = await Promise.all(approvedFiles.map(async (name) => createHash('sha256')
    .update(await readFile(resolve(approvedDir, name))).digest('hex')));
  assert.deepEqual(after, before);
  await assert.rejects(() => access(runDir), /ENOENT/);
  await rm(root, { recursive: true, force: true });
});

test('fixture replacement failure rolls back promoted evidence and fixture', async () => {
  const root = await mkdtemp(resolve(tmpdir(), 'portfolio-css-promotion-failure-'));
  const approvedDir = resolve(root, 'approved');
  const runDir = resolve(root, 'run');
  const fixturePath = resolve(root, 'computed.json');
  const missingPendingFixturePath = resolve(root, 'missing-pending.json');
  await Promise.all([mkdir(approvedDir), mkdir(runDir)]);
  await Promise.all([
    writeFile(resolve(approvedDir, 'report.json'), 'approved evidence\n'),
    writeFile(resolve(runDir, 'report.json'), 'candidate evidence\n'),
    writeFile(fixturePath, 'approved fixture\n'),
  ]);
  const beforeEvidence = createHash('sha256')
    .update(await readFile(resolve(approvedDir, 'report.json'))).digest('hex');
  const beforeFixture = createHash('sha256').update(await readFile(fixturePath)).digest('hex');
  await assert.rejects(promoteEvidenceRun({
    runDir,
    approvedDir,
    validate: async () => {},
    pendingFixturePath: missingPendingFixturePath,
    fixturePath,
  }), /ENOENT/);
  assert.equal(createHash('sha256')
    .update(await readFile(resolve(approvedDir, 'report.json'))).digest('hex'), beforeEvidence);
  assert.equal(createHash('sha256').update(await readFile(fixturePath)).digest('hex'), beforeFixture);
  await assert.rejects(access(runDir));
  await rm(root, { recursive: true, force: true });
});

test('parser fails closed for malformed and unsupported CSS', () => {
  assert.throws(() => splitSelectorList('.card:is(.active, .open'), /Malformed selector list/);
  assert.throws(() => parseCssRules('.card { color: red;', 'broken.css'), /Unclosed CSS block/);
  assert.throws(() => parseCssRules('@unknown test { .card { color: red; } }', 'unknown.css'), /Unsupported CSS at-rule/);
});

test('overlap analysis detects exact and subject/property cascade collisions', () => {
  const main = parseCssRules(`
    .button-bar { color: black; }
    body.portfolio-page .route-topbar { opacity: 1; }
  `, 'main.css');
  const portfolio = parseCssRules(`
    .portfolio-page .button-bar { color: white; }
    body.portfolio-page .route-topbar { opacity: 0; }
  `, 'portfolio.css');
  const overlaps = classifyPortfolioOverlaps(main, portfolio);
  assert.equal(overlaps.length, 2);
  assert.equal(overlaps.some((item) => item.exact), true);
  assert.equal(overlaps.some((item) => item.plannedOwner === 'main.css'), true);

  const mutated = classifyPortfolioOverlaps(main, parseCssRules(
    '.portfolio-page .button-bar { background: white; }',
    'portfolio.css',
  ));
  assert.equal(mutated.length, 0, 'A non-overlapping declaration mutation must not be reported as a cascade collision.');
});

test('negative Portfolio exclusions never transfer shared selectors to portfolio.css', () => {
  assert.equal(hasPositivePortfolioTarget('.project-card:not(.portfolio-project-card)'), false);
  assert.equal(hasPositivePortfolioTarget('.card:not(:is(.portfolio-card, [data-kind="portfolio"]))'), false);
  assert.equal(hasPositivePortfolioTarget('body.portfolio-page .project-card:not(.disabled)'), true);
  const main = parseCssRules('.project-card:not(.portfolio-project-card) { color: black; }', 'main.css');
  const portfolio = parseCssRules('.project-card:not(.portfolio-project-card) { color: white; }', 'portfolio.css');
  const [overlap] = classifyPortfolioOverlaps(main, portfolio);
  assert.equal(overlap.classification, 'shell-shared');
  assert.equal(overlap.plannedOwner, 'main.css');
});

test('current Portfolio cascade matches the provisional ownership inventory', async () => {
  const fixture = JSON.parse(await readFile(resolve(__dirname, 'fixtures', 'portfolio-css-ownership.json'), 'utf8'));
  const mainRules = parseCssRules(await readFile(
    resolve(__dirname, '..', 'react-app', 'app', 'public', 'css', 'main.css'), 'utf8'
  ), 'main.css');
  const portfolioRules = parseCssRules(await readFile(
    resolve(__dirname, '..', 'react-app', 'app', 'public', 'css', 'portfolio.css'), 'utf8'
  ), 'portfolio.css');
  const overlaps = classifyPortfolioOverlaps(mainRules, portfolioRules);
  const summary = summarizeOwnership(mainRules, portfolioRules, overlaps);
  const signature = buildOwnershipSignature(overlaps);
  const overlapSignature = createHash('sha256').update(JSON.stringify(signature)).digest('hex');
  assert.equal(
    overlaps.filter((item) => item.main.conditions.length || item.portfolio.conditions.length).length,
    fixture.conditionalOverlapCount,
  );
  assert.deepEqual(summary, {
    mainRuleCount: fixture.mainRuleCount,
    portfolioRuleCount: fixture.portfolioRuleCount,
    relevantMainRuleCount: fixture.relevantMainRuleCount,
    overlapCount: fixture.overlapCount,
    exactOverlapCount: fixture.exactOverlapCount,
    intentionalOverrideCount: fixture.intentionalOverrideCount,
    shellSharedCount: fixture.shellSharedCount,
    plannedMainOwnerCount: fixture.plannedMainOwnerCount,
    plannedPortfolioOwnerCount: fixture.plannedPortfolioOwnerCount,
  });
  assert.equal(overlapSignature, fixture.overlapSignature);
});
