import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  getAboutNarrativeEditorialFocusOpacity,
  getAboutNarrativeEditorialPhraseOpacity,
  getAboutNarrativeReadingOrderRevealMetrics,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeReveal.js';
import {
  sampleAboutNarrativeResponsiveWorldMaterialInto,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeResponsiveMaterial.js';
import {
  validateAboutNarrativePointFieldDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';

const CONFIG_URL = new URL(
  '../react-app/app/public/config/contents-about.json',
  import.meta.url,
);
const EXPERIENCE_URL = new URL(
  '../react-app/app/src/routes/about-narrative-lab/AboutNarrativeLabExperience.jsx',
  import.meta.url,
);
const STYLES_URL = new URL(
  '../react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css',
  import.meta.url,
);

const canonical = JSON.parse(await readFile(CONFIG_URL, 'utf8'));
const experienceSource = await readFile(EXPERIENCE_URL, 'utf8');
const styleSource = await readFile(STYLES_URL, 'utf8');

const getState = (id) => canonical.tracks.pointField.stateDefinitions
  .find((state) => state.id === id);
const getTextField = (id) => canonical.tracks.text.fields.find((field) => field.id === id);
const getModule = (fieldId, moduleId) => getTextField(fieldId).block.modules
  .find((module) => module.id === moduleId);

test('approved editorial emphasis and pull-sentence hierarchy are canonical', () => {
  assert.deepEqual(
    getModule('text-background-unit', 'practice').emphasis,
    [{ text: 'People had to trust it', tone: 'blue' }],
  );
  assert.deepEqual(
    getModule('text-disciplines-title', 'making-early').emphasis,
    [{ text: 'A rough prototype can create better conversations', tone: 'blue' }],
  );
  assert.deepEqual(
    getModule('text-disciplines-title', 'ai-judgement').emphasis,
    [{ text: 'strengthens human judgement', tone: 'blue' }],
  );
  assert.match(experienceSource, /data-editorial-reveal="line"/);
  assert.doesNotMatch(experienceSource, /data-editorial-reveal': 'word'/);
  assert.match(styleSource, /font-size:\s*calc\(var\(--about-editorial-type-size\) \* 2\.4\)/);
  assert.match(styleSource, /font-family:\s*var\(--abs-font-headline\)/);
  assert.match(styleSource, /font-style:\s*normal/);
  assert.match(styleSource, /text-align:\s*center/);
  assert.equal(getTextField('text-background-unit').block.moduleGapRem, undefined);
  assert.equal(getTextField('text-disciplines-title').block.moduleGapRem, undefined);
});

test('each visual line enters and leaves focus independently', () => {
  assert.equal(getAboutNarrativeEditorialFocusOpacity(0, 0.6, false), 0.04);
  assert.equal(getAboutNarrativeEditorialFocusOpacity(1, 0.32, false), 1);
  assert.equal(getAboutNarrativeEditorialFocusOpacity(1, 0.08, false), 0.04);
  const leadingLine = getAboutNarrativeEditorialFocusOpacity(1, 0.16, false);
  const followingLine = getAboutNarrativeEditorialFocusOpacity(1, 0.24, false);
  assert.ok(leadingLine < followingLine);
  assert.equal(getAboutNarrativeEditorialPhraseOpacity(0.11, false), 0);
  assert.equal(getAboutNarrativeEditorialPhraseOpacity(1, false), 1);
});

test('logo rows share one atomic reveal metric', () => {
  const metrics = getAboutNarrativeReadingOrderRevealMetrics([
    { top: 24, height: 80, atomic: true },
    { top: 24, height: 80, atomic: true },
    { top: 24, height: 80, atomic: true },
  ]);
  assert.equal(metrics[0].revealOffsetPx, metrics[1].revealOffsetPx);
  assert.equal(metrics[1].revealOffsetPx, metrics[2].revealOffsetPx);
});

test('point material and narrow-mobile opening use the approved authored envelope', () => {
  assert.deepEqual(validateAboutNarrativePointFieldDocument(canonical)
    .filter((item) => item.level === 'error'), []);
  assert.equal(canonical.globals.pointMaterial.pointSize, 9.1);
  assert.deepEqual(
    ['world-promise', 'world-complexity', 'world-grid', 'world-emergent']
      .map((id) => getState(id).shapeParameters.density),
    [0.05, 0.33, 0.32, 0.26],
  );

  const target = {};
  sampleAboutNarrativeResponsiveWorldMaterialInto(
    getState('world-promise'), 390, true, false, target,
  );
  assert.equal(target.scale, 0.36);
  assert.equal(target.yOffset, 0.68);
  assert.equal(target.presenceRatio, 1);

  sampleAboutNarrativeResponsiveWorldMaterialInto(
    getState('world-promise'), 768, true, false, target,
  );
  assert.equal(target.scale, 0.44);
  assert.equal(target.yOffset, 0);
  assert.equal(target.presenceRatio, 1);
});

test('the finale invitation resolves as the bust finishes forming', () => {
  const keys = canonical.tracks.pointField.keys;
  assert.equal(keys.find((key) => key.id === 'key-world-emergent-departure').atWU, 18.95);
  assert.equal(keys.find((key) => key.id === 'key-world-emergent-arrival').atWU, 20.55);
  assert.equal(
    canonical.tracks.pointField.segments
      .find((segment) => segment.id.includes('emergent-departure-to-key-world-emergent-arrival'))
      .transition.easing,
    'smoothstep',
  );
  assert.equal(canonical.tracks.camera.keys.find((key) => key.id === 'finale-resolved-hold').atWU, 20.55);
  assert.deepEqual(
    ['startWU', 'focusWU', 'endWU'].map((key) => getTextField('text-epilogue-invitation')[key]),
    [20.15, 20.6, 22.795],
  );
});
