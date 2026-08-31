import assert from 'node:assert/strict';
import test from 'node:test';
import { fitMediaSize, getCoverImageExpansion, getMediaExpansionFrame } from '../../../lib/motion/media-expansion.js';
import { resolveItemGridFootprint } from '../../playground/spatial/placement.js';

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

test('Work sizing preserves portrait study covers and intrinsic snippet ratios with distinct hierarchy', () => {
  const catalog = createWorkCatalog({
    portfolioContent: { projects: PROJECTS }, snippetContent: { items: SNIPPETS },
    resolveAsset: (source) => source,
  });
  const options = { gridSpacingPx: 24, itemScale: 1.35, sizeVariation: 0.5, layoutSeed: 272684 };
  const study = resolveItemGridFootprint(catalog.caseStudies[0], options);
  const snippet = resolveItemGridFootprint(catalog.snippets[0], options);
  assert.equal(study.mediaWidthCells / study.mediaHeightCells, 4 / 5);
  assert.equal(snippet.mediaWidthCells / snippet.mediaHeightCells, 4 / 3);
  assert.ok(study.mediaWidthCells * study.mediaHeightCells > 2 * snippet.mediaWidthCells * snippet.mediaHeightCells);
  assert.equal(snippet.labelDescriptionLineCount, 0);
  assert.equal(study.labelDescriptionLineCount, 0);
  const phone = resolveItemGridFootprint(catalog.caseStudies[0], { ...options, maximumCaseStudyWidthPx: 290 });
  assert.ok(phone.mediaWidthCells * 24 <= 290);
  assert.equal(phone.mediaWidthCells / phone.mediaHeightCells, 4 / 5);
});

test('media expansion never uses independent axis scaling and fitting retains every intrinsic ratio', () => {
  for (const ratio of [4 / 5, 16 / 9, 400 / 224, 1, 2 / 3, 3]) {
    const size = fitMediaSize(342, 580, ratio);
    assert.ok(size.width <= 342 && size.height <= 580);
    assert.ok(Math.abs(size.width / size.height - ratio) < 1e-10);
    const source = { left: 42, top: 132, width: 160, height: 160 / ratio };
    const frame = getMediaExpansionFrame(source, { left: 24, top: 80, ...size }, 24);
    assert.match(frame.transform, /scale\([\d.]+\)$/);
    assert.ok(frame.scale > 0);
    assert.match(frame.clipPath, /^inset\(/);
  }
});

test('case-study image pixels match the source crop across phone and desktop hero shapes', () => {
  for (const target of [{ width: 370, height: 779 }, { width: 1412, height: 838 }]) {
    for (const ratio of [16 / 9, 1, 2 / 3]) {
      const source = { left: 100, top: 200, width: 302, height: 377.5 };
      const frame = getCoverImageExpansion(source, { left: 10, top: 10, ...target }, ratio,
        '50% 35%', '50% 50%');
      const sourceWidth = Math.max(source.width, source.height * ratio);
      assert.ok(Math.abs(frame.width * frame.sourceScale * frame.outerScale - sourceWidth) < 1e-6);
      assert.ok(Math.abs(frame.height * frame.sourceScale * frame.outerScale - sourceWidth / ratio) < 1e-6);
      assert.ok(Math.abs(frame.width / frame.height - ratio) < 1e-8);
      assert.match(frame.from, /scale\([\d.]+\)$/);
      assert.match(frame.to, /scale\(1\)$/);
    }
  }
  assert.equal(getCoverImageExpansion(null, null, 1), null);
});

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
  assert.deepEqual(catalog.items[0].preferredAnchorCells, { x: -27, y: -17 });
  assert.equal(catalog.items[0].previewAspectRatio, 4 / 5);
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
