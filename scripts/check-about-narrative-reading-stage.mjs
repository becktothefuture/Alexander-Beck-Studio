import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  ABOUT_READING_STAGE,
  writeAboutNarrativeReadingStage,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeReadingStage.js';

for (const height of [331, 779, 943]) {
  test(`reading stage keeps every line readable through the full ${height}px viewport`, () => {
    const stage = {};
    const fieldHeight = height * 3;
    const visibleLines = new Set();
    for (let step = 0; step <= 1000; step += 1) {
      const top = height - step / 1000 * (fieldHeight + height * 1.25);
      assert.equal(writeAboutNarrativeReadingStage(stage, top, fieldHeight, height), stage);
      assert.ok(stage.clipTopPx >= 0 && stage.clipTopPx <= fieldHeight);
      assert.ok(stage.clipBottomPx >= 0 && stage.clipBottomPx <= fieldHeight);
      for (let line = 0; line < 50; line += 1) {
        const lineY = fieldHeight * line / 50;
        if (lineY > stage.startPx + stage.featherPx
          && lineY + 28 < stage.endPx - stage.featherPx) visibleLines.add(line);
      }
      assert.ok(Math.abs(top + stage.startPx) < 0.00001);
      assert.ok(Math.abs(top + stage.endPx - height) < 0.00001);
    }
    assert.equal(visibleLines.size, 50, 'No line may disappear before it reaches the reading window.');
  });
}

test('reading stage is deterministic in reverse and does not change document height', () => {
  const height = 779;
  const fieldHeight = 1300;
  const forward = Array.from({ length: 100 }, (_, index) => (
    writeAboutNarrativeReadingStage({}, height - index * 24, fieldHeight, height)
  ));
  for (let index = 99; index >= 0; index -= 1) {
    assert.deepEqual(writeAboutNarrativeReadingStage({}, height - index * 24, fieldHeight, height), forward[index]);
  }
  assert.equal(ABOUT_READING_STAGE.bottom, 1);
  assert.equal(fieldHeight, 1300);
});

test('the reading window stops above the overlapping Button Bar without shrinking document flow', () => {
  const height = 779;
  const inset = 62;
  const fieldHeight = 1300;
  for (const top of [height, 400, 0, -600]) {
    const stage = writeAboutNarrativeReadingStage(
      {}, top, fieldHeight, height, undefined, inset,
    );
    assert.ok(Math.abs(top + stage.endPx - (height - inset)) < 0.00001);
    assert.ok(stage.clipTopPx >= 0 && stage.clipTopPx <= fieldHeight);
    assert.ok(stage.clipBottomPx >= 0 && stage.clipBottomPx <= fieldHeight);
  }
  assert.equal(fieldHeight, 1300);
});

test('a complete line remains visible in the lower, middle and upper viewport', () => {
  for (const height of [331, 779, 943]) {
    for (const fraction of [0.8, 0.5, 0.2]) {
      const stage = writeAboutNarrativeReadingStage({}, height * fraction, 28, height);
      assert.equal(stage.visible, true);
      assert.equal(stage.clipTopPx, 0);
      assert.equal(stage.clipBottomPx, 0);
      assert.ok(stage.startPx + stage.featherPx < 0);
      assert.ok(stage.endPx - stage.featherPx > 28);
    }
  }
});

test('the clipped V2 reading window owns visibility without a second line-opacity fade', async () => {
  const css = await readFile(new URL(
    '../react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css', import.meta.url,
  ), 'utf8');
  assert.match(css, /\[data-editorial-reveal\]\s*\{[^}]*opacity: var\(--editorial-focus-opacity/,
    'Unclipped legacy/editorial views retain their focus treatment.');
  assert.match(css,
    /\.about-narrative-lab\[data-about-experience-version='v2'\]:not\(\[data-editor-active='true'\]\)\s+\.about-narrative-render-span--editorial \[data-editorial-reveal\]\s*\{\s*opacity: 1;\s*\}/,
    'V2 prose, disciplines and career rows must remain opaque throughout the viewport.');
  assert.match(css, /\[data-text-field-id\]:focus-within\s*\{\s*clip-path: none;\s*mask-image: none;/,
    'Keyboard focus must still escape the reading clip.');
});
