import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import adapter from '../../design-mode.config.mjs';
import { reviewDesignModeHandoff } from '../lib/design-mode-review.mjs';

const root = fileURLToPath(new URL('../..', import.meta.url));
test('all website pages resolve real source owners and retain every mixed edit', async () => {
  for (const [path, route] of [['/', 'home'], ['/portfolio.html', 'portfolio'], ['/playground', 'portfolio'], ['/about', 'about'], ['/contact.html', 'contact'], ['/styleguide.html', 'styleguide']]) {
    const report = { pageUrl: `http://localhost:8012${path}`,
      styleChanges: [{ id: 'style-1', selector: '.title', newValue: 'var(--route-entry-title-size)' }],
      textChanges: [{ id: 'text-1', text: 'Proposal' }], domChanges: [{ id: 'dom-1' }], comments: [{ id: 'comment-1', text: 'Mobile only' }],
      tokenChanges: [{ cssVar: '--unknown', scopeSelector: '.dark', oldValue: '1px', newValue: '2px' }],
    };
    const result = await reviewDesignModeHandoff(root, adapter, report);
    assert.equal(result.route, route);
    assert.equal(result.items.length, 5);
    for (const item of result.items) assert.deepEqual(item.change, report[item.kind][item.index]);
    assert.ok(result.items.every(item => item.handling === 'review-authored-source'));
    for (const source of result.sourceCandidates) await access(resolve(root, source));
  }
});
test('registered tokens can be planned from each route without dropping comments or writing', async () => {
  const source = await readFile(resolve(root, adapter.canonical), 'utf8');
  const old = JSON.parse(source).runtime.buttonBarMobileHeightPx;
  for (const path of ['/', '/portfolio.html', '/about.html', '/contact.html']) {
    const result = await reviewDesignModeHandoff(root, adapter, { pageUrl: `http://localhost:8012${path}`,
      tokenChanges: [{ cssVar: '--button-bar-mobile-height', scopeSelector: ':root', oldValue: `${old}px`, newValue: `${old === 66 ? 65 : 66}px` }],
      comments: [{ id: 'keep', text: 'Inspect desktop too' }],
    });
    assert.equal(result.tokenPlan.ready, true);
    assert.equal(result.items[0].handling, 'review-token-plan');
    assert.equal(result.items[1].id, 'keep');
  }
  assert.equal(await readFile(resolve(root, adapter.canonical), 'utf8'), source);
});
test('review rejects production, public mirror, unknown pages and mismatched handoffs', async () => {
  for (const pageUrl of ['https://beck.fyi/about.html', 'http://localhost:8014/', 'http://localhost:8012/not-registered']) {
    await assert.rejects(reviewDesignModeHandoff(root, adapter, { pageUrl }));
  }
  await assert.rejects(reviewDesignModeHandoff(root, adapter, { pageUrl: 'http://localhost:8012/', handoff: { pageUrl: 'http://localhost:8012/contact.html' } }), /differ/);
});
