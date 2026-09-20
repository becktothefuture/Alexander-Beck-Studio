import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createRollercoasterTitleAnimator, rollercoasterTitleDepth } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterTitles.js';
import {
  applyRollercoasterTitlePresentation, createRollercoasterStoryLayout, ROLLERCOASTER_BEAT_IDS,
  ROLLERCOASTER_READING_BEATS, restoreRollercoasterScrollPosition,
  rollercoasterProgressToScroll, rollercoasterTitleOpacity,
  sampleRollercoasterScroll, selectRollercoasterCopy,
} from '../react-app/app/src/routes/about-rollercoaster/rollercoasterStory.js';

const boundaries = [0, 0.04, 0.16, 0.20, 0.40, 0.44, 0.59, 0.64, 0.72, 0.90, 0.97, 1];
const beats = ROLLERCOASTER_BEAT_IDS.map((id, index) => ({
  id, start: boundaries[index], end: boundaries[index + 1],
  kind: ROLLERCOASTER_READING_BEATS.includes(id) ? 'prose'
    : id === 'ending' ? 'ending' : id.includes('tunnel') || id === 'approach' ? 'travel' : 'title',
  scrollScreens: (boundaries[index + 1] - boundaries[index]) * 32,
}));
const create = options => createRollercoasterStoryLayout(beats, { viewportHeight: 900, ...options });
const close = (actual, expected, tolerance = 1e-9) => assert.ok(
  Math.abs(actual - expected) <= tolerance, `${actual} should equal ${expected}`,
);

test('title depth retraces the stronger authored range and reduced motion stays on the reading plane', () => {
  const options = { count: 1, index: 0 };
  const depth = progress => rollercoasterTitleDepth(progress, options, 1000, false);
  close(depth(0), -300);
  close(depth(1), 210);
  close(depth(0.5), -45);
  close(rollercoasterTitleDepth(0.75, { count: 2, index: 1 }, 1000, false), depth(0.5));
  for (const opening of [false, true]) for (const ending of [false, true]) {
    const bookend = { ...options, opening, ending };
    close(rollercoasterTitleDepth(0.3, bookend, 400, true), 0);
    if (opening || ending) {
      close(rollercoasterTitleDepth(0, bookend, 0, false), -300);
      close(rollercoasterTitleDepth(0, bookend, 1400, false), 0);
    }
  }
});

test('each title visit reveals once, survives reflow, and replays after return or copy replacement', async () => {
  const sequences = [];
  const animator = createRollercoasterTitleAnimator(options => {
    let resolve;
    const sequence = { options, totalMs: 500, staged: 0, cancelled: 0,
      stage() { this.staged += 1; }, cancel() { this.cancelled += 1; },
      play() { return new Promise(done => { resolve = done; }); },
      finish() { resolve(); } };
    sequences.push(sequence);
    return sequence;
  });
  let draw = { dataset: {} };
  const record = { node: { querySelector: () => draw } };
  animator.update(record, false, 0);
  animator.update(record, false, 300);
  assert.equal(sequences.length, 1);
  assert.equal(draw.dataset.titleReveal, 'playing');
  animator.update(null, false, 350);
  assert.equal(sequences[0].cancelled, 1);
  animator.update(record, false, 400);
  sequences[0].finish();
  await Promise.resolve();
  assert.equal(draw.dataset.titleReveal, 'playing', 'Old completions cannot settle a new visit.');
  draw = { dataset: {} };
  animator.update(record, false, 450);
  assert.equal(sequences.length, 3);
  assert.equal(sequences[1].cancelled, 1);
  animator.update(record, true, 500);
  assert.equal(sequences.length, 4);
  assert.equal(draw.dataset.titleReveal, 'settled');
  assert.equal(sequences[3].options.reducedMotion, true);
  animator.dispose();
  assert.equal(sequences[3].cancelled, 1);
});

test('a retired entrance callback cannot leave invisible letters behind', () => {
  const draw = { dataset: {} };
  let cancelled = 0;
  const animator = createRollercoasterTitleAnimator(() => ({
    totalMs: 500, stage() {}, play: () => new Promise(() => {}), cancel: () => { cancelled += 1; },
  }));
  const record = { node: { querySelector: () => draw } };
  animator.update(record, false, 0);
  animator.update(record, false, 661);
  assert.equal(draw.dataset.titleReveal, 'settled');
  assert.equal(cancelled, 1);
  animator.update(record, false, 1000);
  assert.equal(cancelled, 1);
  animator.dispose();
});

test('every published copy field is retained by identity, including the full career and client list', async () => {
  const document = JSON.parse(await readFile(new URL('../react-app/app/public/config/contents-about.json', import.meta.url)));
  const copy = selectRollercoasterCopy(document);
  const retained = Object.values(copy).flat();
  assert.equal(retained.length, 10);
  assert.equal(new Set(retained.map(field => field.id)).size, 10);
  for (const field of document.tracks.text.fields) assert.ok(retained.includes(field));
  assert.equal(copy.background[0].block.modules.find(module => module.kind === 'career-sequence').items.length, 5);
  assert.equal(copy.disciplines[1].block.modules[0].items.length, 15);
  assert.equal(copy.statements.length, 2);
  assert.equal(copy.ending[0].description, 'Tell me what you’re trying to make possible.');
});

test('the source supplies the baseline distance, rather than an inherited world duration', () => {
  const original = create();
  close(original.totalScreens, 32);
  const edited = createRollercoasterStoryLayout(beats.map(beat => ({
    ...beat, scrollScreens: beat.scrollScreens * 1.5,
  })), { viewportHeight: 900 });
  close(edited.totalScreens, 48);
  original.segments.forEach((segment, index) => {
    close(segment.distancePx, beats[index].scrollScreens * 900);
    assert.equal(segment.start, beats[index].start);
    assert.equal(segment.end, beats[index].end);
  });
});

test('longer titles preserve every source boundary, reading clearance and tunnel distance', () => {
  const baseline = create();
  const longer = create({ titleDurationScale: 1.75 });
  close(longer.totalScreens, 36.8);
  longer.segments.forEach((segment, index) => {
    const original = baseline.segments[index];
    const title = segment.kind === 'title' || segment.kind === 'ending';
    close(segment.distancePx, original.distancePx * (title ? 1.75 : 1));
    close(segment.copyOffsetPx, original.copyOffsetPx);
    close(segment.start, original.start);
    close(segment.end, original.end);
  });
  for (let step = 0; step <= 1000; step += 1) {
    const progress = step / 1000;
    const scroll = rollercoasterProgressToScroll(longer, progress);
    close(sampleRollercoasterScroll(longer, scroll, {}).progress, progress);
  }
  const native = { scrollTop: rollercoasterProgressToScroll(baseline, 0.42) };
  restoreRollercoasterScrollPosition(native, baseline, longer, 0.42);
  close(sampleRollercoasterScroll(longer, native.scrollTop, {}).progress, 0.42);
  for (const invalid of [0, -1, Infinity, NaN, 5]) {
    assert.throws(() => create({ titleDurationScale: invalid }), /duration scale/);
  }
});

test('enlarged copy adds native space only inside its reading beats', () => {
  const original = create();
  const expanded = create({ readingHeights: { background: 6500, disciplines: 9000, method: 4500 } });
  assert.ok(expanded.totalScreens > 32);
  original.segments.forEach((segment, index) => {
    const enlarged = expanded.segments[index];
    assert.equal(enlarged.start, segment.start);
    assert.equal(enlarged.end, segment.end);
    if (ROLLERCOASTER_READING_BEATS.includes(segment.id)) assert.ok(enlarged.distancePx > segment.distancePx);
    else assert.equal(enlarged.distancePx, segment.distancePx);
  });
});

test('full paragraphs enter and leave with physical clearance before either neighbouring title', () => {
  for (const viewportHeight of [292, 746, 1014]) {
    for (const multiplier of [1, 2]) {
      const layout = create({ viewportHeight, readingHeights: {
        background: 1800 * multiplier, disciplines: 2350 * multiplier, method: 620 * multiplier,
      } });
      for (const segment of layout.segments.filter(beat => ROLLERCOASTER_READING_BEATS.includes(beat.id))) {
        assert.ok(segment.copyOffsetPx >= viewportHeight + 24);
        const lastLineAtExit = segment.copyOffsetPx + segment.copyHeightPx - segment.distancePx;
        assert.ok(lastLineAtExit <= -24 + 1e-9);
        assert.ok(segment.copyOffsetPx + segment.copyHeightPx <= segment.distancePx - 24 + 1e-9);
      }
    }
  }
});

test('native mapping is continuous, monotone and reversible across every measured beat', () => {
  const layout = create({ viewportHeight: 746, readingHeights: {
    background: 5800, disciplines: 7200, method: 1750,
  } });
  const target = {};
  let previous = -1;
  for (let index = 0; index <= 10000; index += 1) {
    const requested = index / 10000;
    const scroll = rollercoasterProgressToScroll(layout, requested);
    assert.equal(sampleRollercoasterScroll(layout, scroll, target), target);
    close(target.progress, requested);
    assert.ok(target.progress >= previous);
    previous = target.progress;
  }
  assert.equal(sampleRollercoasterScroll(layout, -20, target).progress, 0);
  assert.equal(sampleRollercoasterScroll(layout, Infinity, target).progress, 1);
  layout.segments.forEach((segment, index) => {
    close(sampleRollercoasterScroll(layout, segment.startPx, target).progress, segment.start);
    assert.equal(target.beatIndex, index);
  });
});

test('routine measurement never rewrites a native pixel; a real reflow preserves source progress', () => {
  const layout = create({ viewportHeight: 746 });
  let native = 1726;
  let writes = 0;
  const scrollport = {
    get scrollTop() { return native; },
    set scrollTop(value) { writes += 1; native = Math.floor(value); },
  };
  const source = sampleRollercoasterScroll(layout, native, {}).progress;
  for (let index = 0; index < 100; index += 1) {
    assert.equal(restoreRollercoasterScrollPosition(scrollport, layout, layout, source), false);
  }
  assert.equal(writes, 0);
  assert.equal(native, 1726);
  const reflow = create({ viewportHeight: 746, readingHeights: { background: 8000 } });
  assert.equal(restoreRollercoasterScrollPosition(scrollport, layout, reflow, source), true);
  const actual = sampleRollercoasterScroll(reflow, native, {}).progress;
  assert.ok(Math.abs(actual - source) < 1 / reflow.segments[1].distancePx);
});

test('each intermediate title shares the same fade and hold, with no simultaneous statement title', () => {
  for (const local of [0, 0.04, 0.18, 0.5, 0.82, 0.95, 1]) {
    const single = rollercoasterTitleOpacity(local);
    close(rollercoasterTitleOpacity(local / 2, { index: 0, count: 2 }), single);
    close(rollercoasterTitleOpacity((local + 1) / 2, { index: 1, count: 2 }), single);
  }
  for (let step = 0; step <= 1000; step += 1) {
    const local = step / 1000;
    assert.equal(rollercoasterTitleOpacity(local, { index: 0, count: 2 })
      * rollercoasterTitleOpacity(local, { index: 1, count: 2 }), 0);
  }
  close(rollercoasterTitleOpacity(0.90), 1);
  close(rollercoasterTitleOpacity(0.95), 0.5);
  close(rollercoasterTitleOpacity(0.80, {}, { exitFraction: 0.4 }), 0.5);
  assert.equal(rollercoasterTitleOpacity(0, { opening: true }), 1);
  assert.equal(rollercoasterTitleOpacity(1, { ending: true }), 1);
});

test('invalid source intervals or measurements fail explicitly', () => {
  assert.throws(() => create({ viewportHeight: 0 }), /positive viewport/);
  assert.throws(() => create({ readingHeights: { background: NaN } }), /measured copy/);
  assert.throws(() => createRollercoasterStoryLayout(beats.slice(1), { viewportHeight: 900 }), /complete editorial/);
  const gap = beats.map(beat => ({ ...beat }));
  gap[1].start += 0.001;
  assert.throws(() => createRollercoasterStoryLayout(gap, { viewportHeight: 900 }), /Invalid About scene beat/);
  const zeroTravel = beats.map(beat => ({ ...beat }));
  zeroTravel[3].scrollScreens = 0;
  assert.throws(() => createRollercoasterStoryLayout(zeroTravel, { viewportHeight: 900 }), /Invalid About scene beat/);
});

function semanticTitleRecord(ending = false) {
  const node = {
    dataset: {},
    style: new Proxy({}, {
      set(target, key, value) {
        assert.notEqual(key, 'visibility', 'opacity must not remove the heading from the accessibility tree');
        target[key] = value;
        return true;
      },
    }),
    setAttribute(name) { assert.fail(`Whole-field accessibility must not be gated with ${name}`); },
    set inert(value) { assert.fail(`Whole-field inertness would hide semantic title copy: ${value}`); },
  };
  return { node, options: { ending }, support: { tabIndex: -1 }, actions: { inert: true } };
}

test('visual title lifecycle preserves the one semantic heading and only activates visible pointer targets', () => {
  const record = semanticTitleRecord();
  for (const opacity of [0, 0.1, 1, 0.1, 0, 1]) {
    applyRollercoasterTitlePresentation(record, opacity);
    assert.equal(record.node.style.opacity, String(opacity));
    assert.equal(record.node.dataset.titleActive, String(opacity > 0));
  }
});

test('ending controls enter and leave keyboard access independently of its semantic heading and description', () => {
  const record = semanticTitleRecord(true);
  for (const opacity of [0, 0.4, 1, 0.4, 0]) {
    applyRollercoasterTitlePresentation(record, opacity);
    assert.equal(record.actions.inert, opacity === 0);
    assert.equal(record.support.tabIndex, opacity > 0 ? 0 : -1);
    assert.equal(Object.hasOwn(record.support, 'inert'), false);
  }
});
