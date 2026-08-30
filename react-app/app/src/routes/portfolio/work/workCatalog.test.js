import assert from 'node:assert/strict';
import test from 'node:test';

import {
  WORK_ITEM_KINDS,
  createWorkCatalog,
  loadWorkCatalog,
} from './workCatalog.js';

const PROJECTS = [{
  id: 'alpha',
  client: 'Alpha client',
  displayTitle: 'Alpha case study',
  summary: 'A complete account of the Alpha project.',
  image: 'alpha.webp',
  access: 'protected',
  contentBlocks: [{ type: 'text', body: 'Alpha body.' }],
}, {
  id: 'beta',
  client: 'Beta client',
  title: 'Beta case study',
  summary: 'A complete account of the Beta project.',
  image: 'beta.webp',
  access: 'public',
}];

const SNIPPETS = [{
  id: 'small-one',
  placementOrder: 4,
  type: 'image',
  label: 'Small one',
  description: 'A small experiment.',
  accessibilityText: 'A small experiment.',
  poster: '/small-one.webp',
  preview: '/small-one.webp',
  source: '/small-one.webp',
  intrinsicDimensions: { width: 800, height: 600 },
  preferredGridSpan: { columns: 6, rows: 4 },
}];

test('Work catalogue preserves case-study data while separating its two hierarchies', () => {
  const catalog = createWorkCatalog({
    portfolioContent: {
      version: 2,
      title: 'Work',
      description: 'One spatial field.',
      projects: PROJECTS,
    },
    snippetContent: { items: SNIPPETS, validationIssues: ['retained warning'] },
    resolveAsset: (source) => `/resolved/${source}`,
  });

  assert.equal(catalog.title, 'Work');
  assert.equal(catalog.version, 2);
  assert.equal(catalog.description, 'One spatial field.');
  assert.equal(catalog.caseStudies.length, 2);
  assert.equal(catalog.snippets.length, 1);
  assert.deepEqual(catalog.items.map((item) => item.placementOrder), [1, 2, 3]);
  assert.equal(catalog.items[0].id, 'case-study-alpha');
  assert.equal(catalog.items[0].kind, WORK_ITEM_KINDS.caseStudy);
  assert.equal(catalog.items[0].hierarchy, 'primary');
  assert.equal(catalog.items[0].access, 'protected');
  assert.equal(catalog.items[0].source, '/resolved/alpha.webp');
  assert.equal(catalog.items[0].project, PROJECTS[0]);
  assert.ok(catalog.items[0].preferredGridSpan.columns > catalog.items[2].preferredGridSpan.columns);
  assert.deepEqual(catalog.items[0].preferredAnchorCells, { x: 9, y: -17 });
  assert.equal(catalog.items[1].access, 'public');
  assert.equal(catalog.items[2].kind, WORK_ITEM_KINDS.snippet);
  assert.equal(catalog.items[2].hierarchy, 'secondary');
  assert.equal(catalog.items[2].access, 'public');
  assert.deepEqual(catalog.validationIssues, ['retained warning']);
});

test('Work catalogue reports invalid case studies without discarding healthy work', () => {
  const catalog = createWorkCatalog({
    portfolioContent: { projects: [{ id: 'missing-fields' }, PROJECTS[0]] },
    snippetContent: { items: SNIPPETS },
    resolveAsset: (source) => source,
  });

  assert.equal(catalog.caseStudies.length, 1);
  assert.equal(catalog.validationIssues.length, 1);
  assert.match(catalog.validationIssues[0], /projects\[0\]/);
});

test('Work loader validates one canonical Work source through injectable adapters', async () => {
  const calls = [];
  const catalog = await loadWorkCatalog({
    signal: { aborted: false },
    portfolioLoader: async (signal) => {
      calls.push(['portfolio', signal]);
      return {
        version: 2,
        title: 'Work',
        description: 'One spatial field.',
        projects: PROJECTS,
        snippets: SNIPPETS,
      };
    },
    snippetValidator: (document) => {
      calls.push(['snippets', document.items.length]);
      return { items: document.items };
    },
    resolveAsset: (source) => source,
  });

  assert.equal(catalog.items.length, 3);
  assert.deepEqual(calls.map(([name]) => name), ['portfolio', 'snippets']);
});
