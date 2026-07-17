import assert from 'node:assert/strict';
import test from 'node:test';

import {
  compileAboutNarrativeRenderSpans,
  validateAboutNarrativeRenderSpans,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRenderSpans.js';

const identityResolver = {
  scrollWUFromStoryWU(storyWU) {
    return storyWU;
  },
};

function createInput({ textFields = [], worlds = [] } = {}) {
  return {
    textFields,
    worlds,
  };
}

function title(id, startWU, focusWU, endWU, extra = {}) {
  return {
    id,
    kind: 'title',
    publishable: true,
    startWU,
    focusWU,
    endWU,
    layoutMode: 'viewport',
    presentationMode: 'spatial',
    ...extra,
  };
}

test('a Text field crossing World Starts remains one semantic render span', () => {
  const plan = compileAboutNarrativeRenderSpans(createInput({
    textFields: [title('crossing-title', 1, 3, 6)],
    worlds: [
      { id: 'world-one', startWU: 0 },
      { id: 'world-two', startWU: 2 },
      { id: 'world-three', startWU: 5 },
      { id: 'world-four', startWU: 6 },
    ],
  }), { resolver: identityResolver });

  assert.equal(plan.valid, true);
  assert.equal(plan.spans.length, 1);
  assert.deepEqual(plan.spans[0].fieldIds, ['crossing-title']);
  assert.deepEqual(plan.spans[0].crossedWorldIds, ['world-two', 'world-three']);
  assert.deepEqual(plan.spans[0].storyBounds, { startWU: 1, focusWU: 3, endWU: 6 });
});

test('semantic order is deterministic by focusWU, startWU, then stable ID', () => {
  const fields = [
    title('z-last-id', 1, 4, 5),
    title('first-focus', 2, 3, 6),
    title('b-second-start', 2, 4, 7),
    title('a-first-id', 1, 4, 5),
  ];
  const first = compileAboutNarrativeRenderSpans(createInput({ textFields: fields }), {
    resolver: identityResolver,
  });
  const second = compileAboutNarrativeRenderSpans(createInput({ textFields: [...fields].reverse() }), {
    resolver: identityResolver,
  });

  const expected = ['first-focus', 'a-first-id', 'z-last-id', 'b-second-start'];
  assert.deepEqual(first.spans.map((span) => span.fieldIds[0]), expected);
  assert.deepEqual(second.spans, first.spans);
});

test('only explicitly publishable fields render, including publishable Stubs', () => {
  const plan = compileAboutNarrativeRenderSpans(createInput({
    textFields: [
      title('published-title', 0, 0.5, 1),
      { ...title('hidden-title', 1, 1.5, 2), publishable: false },
      { ...title('legacy-publish-flag', 2, 2.5, 3), publishable: undefined, publish: true },
      {
        id: 'draft-stub',
        kind: 'stub',
        publishable: false,
        startWU: 3,
        focusWU: 3.5,
        endWU: 4,
      },
      {
        id: 'published-stub',
        kind: 'stub',
        publishable: true,
        startWU: 4,
        focusWU: 4.5,
        endWU: 5,
      },
    ],
  }), { resolver: identityResolver });

  assert.equal(plan.valid, true);
  assert.deepEqual(
    plan.spans.map((span) => span.fieldIds[0]),
    ['published-title', 'published-stub'],
  );
  assert.equal(plan.spans[1].presentationMode, 'stub');
});

test('each publishable field receives exactly one semantic output', () => {
  const plan = compileAboutNarrativeRenderSpans(createInput({
    textFields: [
      title('one', 0, 1, 2),
      title('two', 1, 2, 3),
      title('three', 2, 3, 4),
    ],
  }), { resolver: identityResolver });

  const renderedIds = plan.spans.flatMap((span) => span.fieldIds);
  assert.equal(new Set(renderedIds).size, 3);
  assert.deepEqual(renderedIds.sort(), ['one', 'three', 'two']);

  const duplicate = structuredClone(plan);
  duplicate.spans.push(structuredClone(duplicate.spans[0]));
  duplicate.spans.at(-1).id = 'render-span-one-copy';
  assert.ok(validateAboutNarrativeRenderSpans(duplicate).some((item) => item.code === 'render-field-duplicate'));
});

test('Story bounds map through the injected profile resolver without mutation', () => {
  const calls = [];
  const resolver = {
    storyToScrollWU(storyWU, context) {
      calls.push({ storyWU, context });
      return storyWU * 1.5;
    },
  };
  const source = title('mobile-copy', 2, 3, 4);
  const plan = compileAboutNarrativeRenderSpans(createInput({ textFields: [source] }), {
    profileId: 'mobile',
    resolver,
  });

  assert.equal(plan.valid, true);
  assert.deepEqual(plan.spans[0].storyBounds, { startWU: 2, focusWU: 3, endWU: 4 });
  assert.deepEqual(plan.spans[0].scrollBounds, { startWU: 3, focusWU: 4.5, endWU: 6 });
  assert.deepEqual(calls, [
    { storyWU: 2, context: { profileId: 'mobile', fieldId: 'mobile-copy' } },
    { storyWU: 3, context: { profileId: 'mobile', fieldId: 'mobile-copy' } },
    { storyWU: 4, context: { profileId: 'mobile', fieldId: 'mobile-copy' } },
  ]);
  assert.deepEqual(
    { startWU: source.startWU, focusWU: source.focusWU, endWU: source.endWU },
    { startWU: 2, focusWU: 3, endWU: 4 },
  );
});

test('shared profile resolver scrollWUFromStoryWU API is the primary mapping contract', () => {
  const resolver = {
    scrollWUFromStoryWU(storyWU) {
      return storyWU * 2;
    },
    storyToScrollWU() {
      throw new Error('Compatibility alias must not override the shared resolver API.');
    },
  };
  const plan = compileAboutNarrativeRenderSpans(createInput({
    textFields: [title('shared-resolver-field', 1, 2, 3)],
  }), { profileId: 'tablet', resolver });

  assert.equal(plan.valid, true);
  assert.deepEqual(plan.spans[0].scrollBounds, { startWU: 2, focusWU: 4, endWU: 6 });
});

test('content measurements report pressure without changing Story or Scroll bounds', () => {
  const base = compileAboutNarrativeRenderSpans(createInput({
    textFields: [title('pressured-copy', 1, 1.5, 2)],
  }), { resolver: identityResolver });
  const pressured = compileAboutNarrativeRenderSpans(createInput({
    textFields: [title('pressured-copy', 1, 1.5, 2)],
  }), {
    profileId: 'tablet',
    resolver: identityResolver,
    contentPressure: {
      'pressured-copy': { measuredHeightPx: 1350, viewportHeightPx: 900 },
    },
  });

  assert.equal(pressured.valid, true);
  assert.deepEqual(pressured.spans, base.spans);
  const warning = pressured.diagnostics.find((item) => item.code === 'content-pressure');
  assert.ok(warning);
  assert.equal(warning.profileId, 'tablet');
  assert.equal(warning.fieldId, 'pressured-copy');
  assert.equal(warning.requiredScrollWU, 1.5);
  assert.equal(warning.availableScrollWU, 1);
  assert.equal(warning.overflowWU, 0.5);
});

test('invalid profile mapping is diagnosed and never emitted as a valid plan', () => {
  const plan = compileAboutNarrativeRenderSpans(createInput({
    textFields: [title('reversed', 1, 2, 3)],
  }), {
    resolver: (storyWU) => -storyWU,
  });
  assert.equal(plan.valid, false);
  assert.ok(plan.diagnostics.some((item) => item.code === 'render-scroll-order'));

  const missingResolver = compileAboutNarrativeRenderSpans(createInput());
  assert.equal(missingResolver.valid, false);
  assert.equal(missingResolver.diagnostics[0].code, 'render-profile-resolver');
});
