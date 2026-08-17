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

test('current editorial type hierarchy is canonical', () => {
  assert.equal(getModule('text-background-unit', 'practice').emphasis, undefined);
  assert.equal(getModule('text-disciplines-title', 'making-early').emphasis, undefined);
  assert.equal(getModule('text-disciplines-title', 'ai-judgement').emphasis, undefined);
  assert.match(experienceSource, /data-editorial-reveal="line"/);
  assert.doesNotMatch(experienceSource, /data-editorial-reveal': 'word'/);
  assert.match(styleSource, /font-size:\s*calc\(var\(--about-editorial-type-size\) \* 2\.7\)/);
  assert.match(styleSource, /font-family:\s*var\(--abs-font-sans\)/);
  assert.match(styleSource, /font-family:\s*var\(--abs-font-headline\)/);
  const travellingTitleRule = styleSource.match(
    /\.about-narrative-spatial-title:not\(\.route-centered-page__title\)\s*\{([\s\S]*?)\}/,
  )?.[1] || '';
  assert.match(travellingTitleRule, /font-family:\s*var\(--abs-font-headline\)/);
  assert.doesNotMatch(travellingTitleRule, /font-family:\s*var\(--abs-font-sans\)/);
  assert.match(styleSource, /font-style:\s*normal/);
  assert.match(styleSource, /text-align:\s*center/);
  assert.equal(getTextField('text-background-unit').block.moduleGapRem, undefined);
  assert.equal(getTextField('text-disciplines-title').block.moduleGapRem, undefined);
});

test('each visual line enters and leaves focus independently', () => {
  assert.equal(getAboutNarrativeEditorialFocusOpacity(0, 0.6, false), 0.2);
  assert.equal(getAboutNarrativeEditorialFocusOpacity(1, 0.32, false), 1);
  assert.equal(getAboutNarrativeEditorialFocusOpacity(1, 0.08, false), 0.2);
  assert.equal(getAboutNarrativeEditorialFocusOpacity(0, 0.6, false, 0.35), 0.35);
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
  assert.equal(canonical.globals.pointMaterial.pointSize, 9.25);
  assert.deepEqual(
    ['world-promise', 'world-complexity', 'world-grid', 'world-emergent']
      .map((id) => getState(id).shapeParameters.density),
    [0.05, 0.7, 0.68, 0.32],
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
  // Orbit begins over the last grid ripple; the bust Form starts later so the
  // two effects remain sequential while assembly still completes in orbit.
  assert.equal(keys.find((key) => key.id === 'key-world-emergent-departure').atWU, 19.2);
  assert.equal(keys.find((key) => key.id === 'key-world-emergent-arrival').atWU, 21.4);
  assert.equal(
    canonical.tracks.pointField.segments
      .find((segment) => segment.id.includes('emergent-departure-to-key-world-emergent-arrival'))
      .transition.easing,
    'smoothstep',
  );
  assert.deepEqual(canonical.tracks.camera.orbit, {
    id: 'orbit-bust-finale',
    startWU: 17.2,
    endWU: 22,
    targetStateId: 'world-emergent',
    arcDegrees: 360,
    easing: 'smoothstep',
    // The orbit remains subordinate to the fixed Text spine at both ends.
    trigger: {
      momentId: 'text-life-character',
      phase: 'exit',
      offsetWU: 0.4,
    },
    endTrigger: {
      momentId: 'text-epilogue-invitation',
      phase: 'exit',
      offsetWU: 0,
    },
  });
  assert.deepEqual(
    ['startWU', 'focusWU', 'endWU'].map((key) => getTextField('text-epilogue-invitation')[key]),
    [20.1, 20.65, 22],
  );
});
