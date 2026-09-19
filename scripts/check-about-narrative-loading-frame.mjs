import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  collectAboutNarrativeFontRequests,
  createAboutNarrativeFontReadiness,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeFontReadiness.js';

import {
  ABOUT_NARRATIVE_HISTORY_PROGRESS_KEY,
  hasAboutNarrativeRestoredProgress,
  readAboutNarrativeHistoryProgress,
  writeAboutNarrativeHistoryProgress,
  createAboutNarrativeScrollPersistence,
} from '../react-app/app/src/routes/about/aboutNarrativeScrollRestoration.js';

import {
  restoreRollercoasterScrollPosition,
  rollercoasterProgressToScroll,
  sampleRollercoasterScroll,
} from '../react-app/app/src/routes/about-rollercoaster/rollercoasterStory.js';

const ROOT = new URL('../', import.meta.url);
const [loadingFrameSource, experienceSource] = await Promise.all([
  readFile(new URL('react-app/app/src/routes/about/AboutNarrativeLoadingFrame.jsx', ROOT), 'utf8'),
  readFile(new URL('react-app/app/src/routes/about-rollercoaster/AboutRollercoasterExperience.jsx', ROOT), 'utf8'),
]);

test('About history progress is entry-local, clamped, and safely persisted', () => {
  assert.equal(readAboutNarrativeHistoryProgress(null), 0);
  assert.equal(readAboutNarrativeHistoryProgress({ [ABOUT_NARRATIVE_HISTORY_PROGRESS_KEY]: 0.42 }), 0.42);
  assert.equal(readAboutNarrativeHistoryProgress({ [ABOUT_NARRATIVE_HISTORY_PROGRESS_KEY]: 2 }), 1);
  assert.equal(hasAboutNarrativeRestoredProgress({ [ABOUT_NARRATIVE_HISTORY_PROGRESS_KEY]: 0 }), false);
  assert.equal(hasAboutNarrativeRestoredProgress({ [ABOUT_NARRATIVE_HISTORY_PROGRESS_KEY]: 0.5 }), true);

  const history = {
    state: { routeId: 'about' },
    replaceState(nextState) {
      this.state = nextState;
    },
  };
  assert.equal(writeAboutNarrativeHistoryProgress(0.4567894, history), true);
  assert.deepEqual(history.state, {
    routeId: 'about',
    [ABOUT_NARRATIVE_HISTORY_PROGRESS_KEY]: 0.456789,
  });
  assert.equal(writeAboutNarrativeHistoryProgress(0.4567894, history), false);
});

test('the lazy frame shows the opener only at scroll top and hides restoration setup', () => {
  assert.match(loadingFrameSource, /hasAboutNarrativeRestoredProgress\(\)/);
  assert.match(loadingFrameSource, /data-about-opening-frame="restoring"/);
  assert.match(experienceSource, /readAboutNarrativeHistoryProgress\(\)/);
  assert.match(experienceSource, /if \(disposed \|\| \(!failed && \(!scene \|\| !measuredReady\)\)\) return/);
  assert.match(experienceSource, /if \(!fontState\.ready\) return/);
  assert.match(experienceSource, /root\.dataset\.aboutSceneReady = 'true'/);
  assert.match(experienceSource, /new CustomEvent\('abs:about-scene-ready'\)/);
  assert.match(experienceSource, /writeAboutNarrativeHistoryProgress\(frame\.progress\)/);
  assert.match(experienceSource, /!currentRouteIsAbout\(\) \|\| !root\.isConnected/);
  assert.match(experienceSource, /'pageshow', event => \{ if \(event\.persisted\) restoreHistory\(\)/);
  assert.match(experienceSource, /'popstate', restoreHistory/);
});

function createPersistenceFixture() {
  const pending = new Map();
  let nextTimer = 1;
  let writes = 0;
  const win = Object.assign(new EventTarget(), {
    location: { href: 'https://example.test/about.html' },
    document: Object.assign(new EventTarget(), { hidden: false }),
    history: {
      state: { routeId: 'about' },
      replaceState(state) { this.state = state; writes += 1; },
    },
    setTimeout(callback) { const id = nextTimer++; pending.set(id, callback); return id; },
    clearTimeout(id) { pending.delete(id); },
  });
  const scrollport = Object.assign(new EventTarget(), {
    isConnected: true, scrollHeight: 11_000, clientHeight: 1_000, scrollTop: 0,
  });
  const persistence = createAboutNarrativeScrollPersistence(scrollport, { win });
  return { win, scrollport, persistence, pending, get writes() { return writes; } };
}

test('continuous native scroll batches history writes and scrollend flushes the exact position', () => {
  const fixture = createPersistenceFixture();
  const { win, scrollport, pending, persistence } = fixture;
  for (let index = 1; index <= 120; index += 1) {
    scrollport.scrollTop = index * 20;
    scrollport.dispatchEvent(new Event('scroll'));
  }
  assert.equal(fixture.writes, 1, 'scroll frames must not write history');
  assert.equal(pending.size, 1, 'a gesture owns only one checkpoint timer');
  [...pending.values()][0]();
  assert.equal(win.history.state.absAboutNarrativeProgress, 0.24);
  assert.equal(pending.size, 0);
  scrollport.scrollTop = 4567;
  scrollport.dispatchEvent(new Event('scroll'));
  scrollport.dispatchEvent(new Event('scrollend'));
  assert.equal(win.history.state.absAboutNarrativeProgress, 0.4567);
  assert.equal(pending.size, 0);
  persistence.destroy();
});

test('route exit and pagehide flush progress without corrupting a popped history entry', () => {
  const { win, scrollport, pending, persistence } = createPersistenceFixture();
  scrollport.scrollTop = 4200;
  scrollport.dispatchEvent(new Event('scroll'));
  persistence.flush();
  assert.equal(win.history.state.absAboutNarrativeProgress, 0.42);
  scrollport.scrollTop = 5600;
  win.dispatchEvent(new Event('pagehide'));
  assert.equal(win.history.state.absAboutNarrativeProgress, 0.56);
  scrollport.scrollTop = 6800;
  scrollport.dispatchEvent(new Event('scroll'));
  win.history.state = { routeId: 'about', absAboutNarrativeProgress: 0.12 };
  win.dispatchEvent(new Event('popstate'));
  persistence.destroy();
  assert.equal(pending.size, 0);
  assert.equal(win.history.state.absAboutNarrativeProgress, 0.12);
});

test('cleanup does not replace a saved position with detached element geometry', () => {
  const { win, scrollport, pending, persistence } = createPersistenceFixture();
  scrollport.scrollTop = 7800;
  persistence.flush();
  scrollport.dispatchEvent(new Event('scroll'));
  scrollport.isConnected = false;
  scrollport.scrollHeight = 0;
  scrollport.clientHeight = 0;
  persistence.destroy();
  assert.equal(win.history.state.absAboutNarrativeProgress, 0.78);
  assert.equal(pending.size, 0);
});

test('same-route history traversal restores and re-arms the mounted About scrollport', () => {
  const { win, scrollport, pending, persistence } = createPersistenceFixture();
  scrollport.scrollTop = 7800;
  scrollport.dispatchEvent(new Event('scroll'));
  win.history.state = { routeId: 'about', absAboutNarrativeProgress: 0.4 };
  win.dispatchEvent(new Event('popstate'));
  // An old scrollend must neither overwrite the new entry nor cancel rebinding.
  scrollport.dispatchEvent(new Event('scrollend'));
  assert.equal(win.history.state.absAboutNarrativeProgress, 0.4);
  [...pending.values()][0]();
  assert.equal(scrollport.scrollTop, 4000);
  scrollport.scrollTop = 8200;
  scrollport.dispatchEvent(new Event('scroll'));
  assert.equal(pending.size, 1);
  scrollport.dispatchEvent(new Event('scrollend'));
  assert.equal(win.history.state.absAboutNarrativeProgress, 0.82);
  persistence.destroy();
  assert.equal(pending.size, 0);
});

test('BFCache return restores its own entry and resumes checkpoints', () => {
  const { win, scrollport, pending, persistence } = createPersistenceFixture();
  scrollport.scrollTop = 5300;
  win.dispatchEvent(new Event('pagehide'));
  scrollport.scrollTop = 0;
  win.dispatchEvent(Object.assign(new Event('pageshow'), { persisted: true }));
  assert.equal(scrollport.scrollTop, 5300);
  scrollport.scrollTop = 6900;
  scrollport.dispatchEvent(new Event('scroll'));
  assert.equal(pending.size, 1);
  scrollport.dispatchEvent(new Event('scrollend'));
  assert.equal(win.history.state.absAboutNarrativeProgress, 0.69);
  persistence.destroy();
});

test('same-route URL changes keep saving but a destination route is protected', () => {
  const { win, scrollport, persistence } = createPersistenceFixture();
  win.location.href = 'https://example.test/about.html?edit=0';
  scrollport.scrollTop = 6100;
  scrollport.dispatchEvent(new Event('scrollend'));
  assert.equal(win.history.state.absAboutNarrativeProgress, 0.61);
  win.location.href = 'https://example.test/contact.html';
  win.history.state = { routeId: 'contact' };
  persistence.destroy();
  assert.deepEqual(win.history.state, { routeId: 'contact' });
});

test('About uses the shared moving two-tick progress instrument', () => {
  assert.match(experienceSource, /resolveScrollProgressIndicatorState\(frame\.progress/);
  assert.match(experienceSource, /index >= state\.activeStartIndex/);
  assert.match(experienceSource, /state\.activeTickCount/);
  assert.doesNotMatch(experienceSource, /index <= resolvedActiveIndex/);
});

// Exercise the new route's actual native writer. The integer setter models
// WebKit flooring, so a needless progress round-trip is observable.
function createFlightScrollFixture({ scrollTop = 1726, maximum = 13031, integerScroll = false } = {}) {
  let current = scrollTop;
  const writes = [];
  const scrollport = {
    get scrollTop() { return current; },
    set scrollTop(value) { writes.push(value); current = integerScroll ? Math.trunc(value) : value; },
  };
  const layout = {
    viewportHeight: 746, totalScrollPx: maximum,
    segments: [{ id: 'reading', start: 0, end: 1, startPx: 0, endPx: maximum, distancePx: maximum }],
  };
  return { scrollport, writes, layout,
    progress: () => sampleRollercoasterScroll(layout, current, {}).progress };
}

test('the mounted flight uses the tested writer after applying its new native geometry', () => {
  assert.match(experienceSource, /content\.style\.height = `\$\{next\.contentHeightPx\}px`/);
  assert.match(experienceSource, /restoreRollercoasterScrollPosition\(scrollport, previous, next, preservedProgress, !restored\)/);
  assert.doesNotMatch(experienceSource, /Lenis|setScrollFromStoryWU/);
});

test('unchanged remeasurement preserves exact integer and fractional native pixels', () => {
  for (const scrollTop of [0, 1, 1726, 1726.125, 1726.7457691875757, 13031]) {
    const fixture = createFlightScrollFixture({ scrollTop, integerScroll: Number.isInteger(scrollTop) });
    for (let index = 0; index < 100; index += 1) {
      assert.equal(restoreRollercoasterScrollPosition(fixture.scrollport, fixture.layout,
        structuredClone(fixture.layout), fixture.progress()), false);
    }
    assert.deepEqual(fixture.writes, []);
    assert.equal(fixture.scrollport.scrollTop, scrollTop);
  }
});

test('forced restoration of an already represented native position does not round-trip it', () => {
  const fixture = createFlightScrollFixture({ integerScroll: true });
  assert.equal(restoreRollercoasterScrollPosition(fixture.scrollport, null,
    fixture.layout, fixture.progress(), true), false);
  assert.deepEqual(fixture.writes, []);
  assert.equal(fixture.scrollport.scrollTop, 1726);
});

test('genuine fractional history changes retain their subpixel targets', () => {
  for (const delta of [0.125, -0.125, 0.001, -0.001]) {
    const fixture = createFlightScrollFixture({ scrollTop: 1726.375 });
    const target = fixture.scrollport.scrollTop + delta;
    assert.equal(restoreRollercoasterScrollPosition(fixture.scrollport, fixture.layout,
      fixture.layout, target / fixture.layout.totalScrollPx, true), true);
    assert.equal(fixture.writes.length, 1);
    assert.ok(Math.abs(fixture.scrollport.scrollTop - target) < 1e-10);
  }
});

test('changed reading geometry restores the same authored position in the new extent', () => {
  const fixture = createFlightScrollFixture();
  const next = structuredClone(fixture.layout);
  next.totalScrollPx += 1000;
  next.segments[0].endPx += 1000;
  next.segments[0].distancePx += 1000;
  const progress = fixture.progress();
  assert.equal(restoreRollercoasterScrollPosition(fixture.scrollport, fixture.layout, next, progress), true);
  assert.deepEqual(fixture.writes, [rollercoasterProgressToScroll(next, progress)]);
  assert.ok(Math.abs(sampleRollercoasterScroll(next, fixture.scrollport.scrollTop, {}).progress - progress) < 1e-12);
});

test('forced history jumps clamp endpoints and repair out-of-range native positions', () => {
  for (const [scrollTop, target, expected] of [
    [1726, 0.5, 6515.5], [1726, -1, 0], [1726, 2, 13031],
    [-0.5, 0, 0], [13031.5, 1, 13031],
  ]) {
    const fixture = createFlightScrollFixture({ scrollTop });
    assert.equal(restoreRollercoasterScrollPosition(fixture.scrollport, fixture.layout,
      fixture.layout, target, true), true);
    assert.deepEqual(fixture.writes, [expected]);
  }
});

const ABOUT_FONT_REQUEST = Object.freeze({
  font: 'normal 400 20px Geist, sans-serif', family: 'Geist, sans-serif', text: 'Alex’s practice',
});

function fontFixture() {
  const requests = [];
  let changes = 0;
  const fontSet = Object.assign(new EventTarget(), {
    faces: [],
    [Symbol.iterator]() { return this.faces.values(); },
    has(face) { return this.faces.includes(face); },
    check() { return true; },
    load(font, text) {
      return new Promise((resolve, reject) => requests.push({ font, text, reject,
        resolve(faces) {
          for (const face of faces) if (!fontSet.has(face)) fontSet.faces.push(face);
          resolve(faces);
        },
      }));
    },
  });
  Object.defineProperty(fontSet, 'status', {
    get() { throw new Error('The unrelated global font set is not About readiness.'); },
  });
  const readiness = createAboutNarrativeFontReadiness(fontSet, () => { changes += 1; });
  return { fontSet, readiness, requests, get changes() { return changes; } };
}

const flushFonts = async () => {
  for (let turn = 0; turn < 8; turn += 1) await Promise.resolve();
};
const loadedFace = (family = 'Geist') => ({ family, status: 'loaded' });
const loadingDone = face => Object.assign(new Event('loadingdone'), { fontfaces: [face] });

test('About readiness waits for its requested face and ignores an unrelated stuck global font set', async () => {
  const fixture = fontFixture();
  const request = [ABOUT_FONT_REQUEST];
  assert.deepEqual(fixture.readiness.read(request), { ready: false, status: 'loading', diagnostics: [] });
  await flushFonts();
  assert.deepEqual(fixture.requests.map(({ font, text }) => ({ font, text })), request.map(({ font, text }) => ({ font, text })));
  const face = loadedFace();
  fixture.requests[0].resolve([face]);
  await flushFonts();
  assert.deepEqual(fixture.readiness.read(request), { ready: true, status: 'loaded', diagnostics: [] });
  assert.equal(fixture.changes, 1, 'Owned settlement schedules another stable measurement.');
  fixture.fontSet.dispatchEvent(loadingDone(loadedFace('Geist Mono')));
  fixture.fontSet.dispatchEvent(loadingDone(face));
  assert.equal(fixture.changes, 1, 'Unrelated or already loaded faces must not cause a load loop.');
  fixture.readiness.destroy();
});

test('same-family revalidation retains verified loaded faces and has one in-flight owner', async () => {
  const fixture = fontFixture();
  const face = { ...loadedFace(), weight: '400' };
  const otherWeight = { ...loadedFace(), weight: '500' };
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  fixture.requests[0].resolve([face]); await flushFonts();
  const beforeChanges = fixture.changes;
  fixture.fontSet.faces.push(otherWeight);
  fixture.fontSet.dispatchEvent(loadingDone(otherWeight));
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  await flushFonts();
  assert.equal(fixture.requests.length, 2);
  for (let index = 0; index < 20; index += 1) {
    fixture.fontSet.dispatchEvent(loadingDone(otherWeight));
    assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  }
  await flushFonts();
  assert.equal(fixture.requests.length, 2, 'Repeated events must not replace an in-flight owner.');
  fixture.requests[1].resolve([face]); await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  assert.ok(fixture.changes > beforeChanges, 'A completed font event still requests measurement.');
  fixture.readiness.destroy();
});

test('a loaded unused Unicode face does not invalidate a verified About request', async () => {
  const fixture = fontFixture();
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  fixture.requests[0].resolve([loadedFace()]); await flushFonts();
  const changes = fixture.changes;
  fixture.fontSet.dispatchEvent(loadingDone({ ...loadedFace(), unicodeRange: 'U+0370-03FF' }));
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  await flushFonts();
  assert.equal(fixture.requests.length, 1); assert.equal(fixture.changes, changes);
  fixture.readiness.destroy();
});

test('native load starting a matching face revokes retained readiness immediately', async () => {
  const fixture = fontFixture();
  const original = loadedFace();
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  fixture.requests[0].resolve([original]); await flushFonts();
  let resolveFace;
  const next = { ...loadedFace(), status: 'unloaded', unicodeRange: 'U+0000-10FFFF',
    loaded: new Promise(resolve => { resolveFace = resolve; }) };
  fixture.fontSet.faces.push(next);
  fixture.fontSet.load = () => {
    next.status = 'loading';
    return next.loaded.then(() => [next]);
  };
  fixture.fontSet.dispatchEvent(loadingDone(loadedFace()));
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  const changes = fixture.changes;
  await flushFonts();
  assert.ok(fixture.changes > changes, 'Revocation must notify the timeline after load starts.');
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).ready, false);
  next.status = 'loaded'; resolveFace(next); await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  fixture.readiness.destroy();
});

test('removing a cached face during revalidation revokes readiness on the next read', async () => {
  const fixture = fontFixture();
  const face = loadedFace();
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  fixture.requests[0].resolve([face]); await flushFonts();
  fixture.fontSet.dispatchEvent(loadingDone(loadedFace())); await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  fixture.fontSet.faces = [];
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).ready, false);
  fixture.requests[1].resolve([face]);
  fixture.fontSet.faces = [];
  await flushFonts();
  const after = fixture.readiness.read([ABOUT_FONT_REQUEST]);
  assert.equal(after.ready, false);
  assert.equal(after.diagnostics[0].reason, 'font-load-incomplete');
  fixture.readiness.destroy();
});

test('a pending face introduced during revalidation revokes readiness from its loading event', async () => {
  const fixture = fontFixture();
  const face = loadedFace();
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  fixture.requests[0].resolve([face]); await flushFonts();
  fixture.fontSet.dispatchEvent(loadingDone(loadedFace())); await flushFonts();
  let resolveFace;
  const pending = { ...loadedFace(), status: 'loading',
    loaded: new Promise(resolve => { resolveFace = resolve; }) };
  fixture.fontSet.faces.push(pending);
  const changes = fixture.changes;
  fixture.fontSet.dispatchEvent(new Event('loading'));
  assert.ok(fixture.changes > changes, 'A loading event must publish revocation before another read.');
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).ready, false);
  fixture.requests[1].resolve([face]); await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).ready, false,
    'An old successful match must not restore readiness while the new matching face is pending.');
  pending.status = 'loaded'; resolveFace(pending);
  fixture.fontSet.dispatchEvent(loadingDone(pending)); await flushFonts();
  fixture.requests[2].resolve([pending]); await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  fixture.readiness.destroy();
});

test('a successful face replacement remains loaded and schedules fresh measurement', async () => {
  const fixture = fontFixture();
  const original = loadedFace(); const replacement = loadedFace();
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  fixture.requests[0].resolve([original]); await flushFonts();
  fixture.fontSet.faces.push(replacement);
  fixture.fontSet.dispatchEvent(loadingDone(replacement)); await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  const beforeChanges = fixture.changes;
  fixture.requests[1].resolve([replacement]); await flushFonts();
  assert.ok(fixture.changes > beforeChanges, 'Changed glyph metrics must be measured after matching settles.');
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  const afterChanges = fixture.changes;
  fixture.fontSet.dispatchEvent(loadingDone(replacement));
  assert.equal(fixture.changes, afterChanges, 'The replacement is now the known matching face.');
  fixture.readiness.destroy();
});

test('a terminal error for a face added mid-revalidation becomes explicit fallback', async () => {
  const fixture = fontFixture();
  const face = loadedFace();
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  fixture.requests[0].resolve([face]); await flushFonts();
  fixture.fontSet.dispatchEvent(loadingDone(loadedFace())); await flushFonts();
  const pending = { ...loadedFace(), status: 'loading' };
  fixture.fontSet.faces.push(pending);
  fixture.fontSet.dispatchEvent(new Event('loading'));
  fixture.requests[1].resolve([face]); await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).ready, false);
  pending.status = 'error';
  fixture.fontSet.dispatchEvent(Object.assign(new Event('loadingerror'), { fontfaces: [pending] }));
  await flushFonts();
  assert.equal(fixture.requests.length, 3, 'The terminal event must recheck the current native match.');
  fixture.requests[2].reject(new Error('New matching face failed')); await flushFonts();
  const after = fixture.readiness.read([ABOUT_FONT_REQUEST]);
  assert.equal(after.status, 'fallback');
  assert.match(after.diagnostics[0].reason, /New matching face failed/);
  fixture.readiness.destroy();
});

test('a revalidation returning no matching faces cannot retain a check-only loaded result', async () => {
  const fixture = fontFixture();
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  fixture.requests[0].resolve([loadedFace()]); await flushFonts();
  fixture.fontSet.dispatchEvent(loadingDone(loadedFace())); await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  fixture.requests[1].resolve([]); await flushFonts();
  const after = fixture.readiness.read([ABOUT_FONT_REQUEST]);
  assert.equal(after.status, 'fallback');
  assert.equal(after.diagnostics[0].reason, 'no-matching-webfont');
  fixture.readiness.destroy();
});

test('changed style and size requests cannot inherit an old loaded request', async () => {
  const fixture = fontFixture();
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  fixture.requests[0].resolve([loadedFace()]); await flushFonts();
  for (const font of ['italic 400 20px Geist, sans-serif', 'normal 400 40px Geist, sans-serif']) {
    const request = { ...ABOUT_FONT_REQUEST, font };
    assert.equal(fixture.readiness.read([request]).ready, false);
    await flushFonts(); fixture.requests.at(-1).resolve([loadedFace()]); await flushFonts();
    assert.equal(fixture.readiness.read([request]).status, 'loaded');
  }
  fixture.readiness.destroy();
});

test('a failed revalidation waits for pending required faces before explicit fallback', async () => {
  const fixture = fontFixture();
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  fixture.requests[0].resolve([loadedFace()]); await flushFonts();
  fixture.fontSet.dispatchEvent(loadingDone(loadedFace())); await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  let rejectFace;
  const pending = { ...loadedFace(), status: 'loading',
    loaded: new Promise((resolve, reject) => { rejectFace = reject; }) };
  fixture.fontSet.faces.push(pending);
  fixture.requests[1].reject(new Error('One matched face failed')); await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).ready, false);
  pending.status = 'error'; rejectFace(new Error('The remaining face failed')); await flushFonts();
  const after = fixture.readiness.read([ABOUT_FONT_REQUEST]);
  assert.equal(after.status, 'fallback');
  assert.match(after.diagnostics[0].reason, /One matched face failed/);
  fixture.readiness.destroy();
});

test('cleanup during retained revalidation ignores its late native result and all font listeners', async () => {
  const fixture = fontFixture();
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  fixture.requests[0].resolve([loadedFace()]); await flushFonts();
  fixture.fontSet.dispatchEvent(loadingDone(loadedFace())); await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  const changes = fixture.changes;
  fixture.readiness.destroy();
  fixture.requests[1].reject(new Error('Disposed refresh'));
  fixture.fontSet.dispatchEvent(new Event('loading'));
  fixture.fontSet.dispatchEvent(loadingDone(loadedFace()));
  fixture.fontSet.dispatchEvent(Object.assign(new Event('loadingerror'), { fontfaces: [loadedFace()] }));
  await flushFonts();
  assert.equal(fixture.changes, changes);
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'disposed');
});

test('a pending About font stays blocked even if FontFaceSet.check returns true', async () => {
  const fixture = fontFixture();
  fixture.readiness.read([ABOUT_FONT_REQUEST]);
  await flushFonts();
  let resolveFace;
  const face = { family: 'Geist', status: 'loading', loaded: new Promise(resolve => { resolveFace = resolve; }) };
  fixture.requests[0].resolve([face]);
  await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).ready, false);
  assert.equal(fixture.changes, 0);
  face.status = 'loaded'; resolveFace(face);
  await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  fixture.readiness.destroy();
});

test('a missing matching webfont is explicit fallback, not a successful check-only load', async () => {
  const fixture = fontFixture();
  fixture.readiness.read([ABOUT_FONT_REQUEST]);
  await flushFonts(); fixture.requests[0].resolve([]); await flushFonts();
  assert.deepEqual(fixture.readiness.read([ABOUT_FONT_REQUEST]), {
    ready: true, status: 'fallback',
    diagnostics: [{ font: ABOUT_FONT_REQUEST.font, reason: 'no-matching-webfont' }],
  });
  fixture.readiness.destroy();
});

test('a failed required face preserves readable measured fallback and exposes the failure', async () => {
  const fixture = fontFixture();
  fixture.readiness.read([ABOUT_FONT_REQUEST]);
  await flushFonts(); fixture.requests[0].reject(new Error('Font download failed')); await flushFonts();
  assert.deepEqual(fixture.readiness.read([ABOUT_FONT_REQUEST]), {
    ready: true, status: 'fallback',
    diagnostics: [{ font: ABOUT_FONT_REQUEST.font, reason: 'font-load-failed: Font download failed' }],
  });
  fixture.fontSet.dispatchEvent(loadingDone(loadedFace()));
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).ready, false);
  await flushFonts(); fixture.requests[1].resolve([loadedFace()]); await flushFonts();
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'loaded');
  fixture.readiness.destroy();
});

test('a contradictory font result remains unconfirmed until a needed face settles', async () => {
  const fixture = fontFixture(); fixture.fontSet.check = () => false;
  fixture.readiness.read([ABOUT_FONT_REQUEST]);
  await flushFonts(); fixture.requests[0].resolve([loadedFace()]); await flushFonts();
  const state = fixture.readiness.read([ABOUT_FONT_REQUEST]);
  assert.equal(state.ready, false); assert.equal(state.status, 'loading');
  assert.equal(state.diagnostics[0].reason, 'font-load-incomplete');
  fixture.readiness.destroy();
});

test('aggregate font failure waits for another required face covering the same codepoint', async () => {
  const fixture = fontFixture();
  let resolvePending;
  const pending = {
    family: 'Geist', status: 'loading', unicodeRange: 'U+0-FF',
    loaded: new Promise(resolve => { resolvePending = resolve; }),
  };
  const unrelated = { ...pending, family: 'Geist Mono', loaded: new Promise(() => {}) };
  const unusedRange = { ...pending, unicodeRange: 'U+03??', loaded: new Promise(() => {}) };
  fixture.fontSet.faces = [pending, unrelated, unusedRange];
  const request = [{ ...ABOUT_FONT_REQUEST, text: 'A' }];
  fixture.readiness.read(request); await flushFonts();
  // A second matching face failed; FontFaceSet.load rejects before `pending`.
  fixture.requests[0].reject(new Error('Matching Latin face failed')); await flushFonts();
  assert.equal(fixture.readiness.read(request).ready, false);
  assert.equal(fixture.changes, 0);
  pending.status = 'loaded'; resolvePending(pending); await flushFonts();
  const result = fixture.readiness.read(request);
  assert.equal(result.ready, true); assert.equal(result.status, 'fallback');
  assert.match(result.diagnostics[0].reason, /Matching Latin face failed/);
  assert.equal(unrelated.status, 'loading', 'The unrelated Home font remains outside this wait.');
  assert.equal(unusedRange.status, 'loading', 'An unused Unicode range remains outside this wait.');
  fixture.readiness.destroy();
});

test('departure during failed-font settlement cannot publish fallback to the old route', async () => {
  const fixture = fontFixture();
  let rejectPending;
  fixture.fontSet.faces = [{
    family: 'Geist', status: 'loading', unicodeRange: 'U+0000-10FFFF',
    loaded: new Promise((resolve, reject) => { rejectPending = reject; }),
  }];
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  fixture.requests[0].reject(new Error('One required face failed')); await flushFonts();
  fixture.readiness.destroy(); rejectPending(new Error('The remaining face failed')); await flushFonts();
  assert.equal(fixture.changes, 0);
});

test('font cleanup removes listeners and ignores settled or queued work from an old route', async () => {
  const fixture = fontFixture();
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  fixture.readiness.destroy();
  fixture.requests[0].reject(new Error('Departure cancellation')); await flushFonts();
  fixture.fontSet.dispatchEvent(loadingDone(loadedFace()));
  assert.equal(fixture.changes, 0);
  assert.equal(fixture.readiness.read([ABOUT_FONT_REQUEST]).status, 'disposed');
  const queued = fontFixture(); queued.readiness.read([ABOUT_FONT_REQUEST]); queued.readiness.destroy();
  await flushFonts(); assert.equal(queued.requests.length, 0);
});

test('a changed About request supersedes pending glyphs without publishing stale readiness', async () => {
  const fixture = fontFixture();
  fixture.readiness.read([ABOUT_FONT_REQUEST]); await flushFonts();
  const changed = [{ ...ABOUT_FONT_REQUEST, text: '日本語' }];
  fixture.readiness.read(changed); await flushFonts();
  fixture.requests[0].resolve([loadedFace()]); await flushFonts();
  assert.equal(fixture.changes, 0); assert.equal(fixture.readiness.read(changed).ready, false);
  fixture.requests[1].resolve([loadedFace()]); await flushFonts();
  assert.equal(fixture.readiness.read(changed).ready, true); assert.equal(fixture.changes, 1);
  fixture.readiness.destroy();
});

test('computed text collection includes each role and relevant Unicode glyphs', () => {
  const sans = { fontFamily: 'Geist, sans-serif', fontStyle: 'normal', fontWeight: '400', fontSize: '20px', textTransform: 'none' };
  const title = { ...sans, fontFamily: '"Instrument Serif", serif', fontSize: '100px' };
  const label = { ...sans, fontWeight: '500', textTransform: 'uppercase' };
  const nodes = [
    { textContent: 'Alex’s ', parentElement: sans },
    { textContent: '日本語', parentElement: sans },
    { textContent: 'Making', parentElement: title },
    { textContent: 'Email', parentElement: label },
  ];
  const content = { ownerDocument: {
    defaultView: { getComputedStyle: element => element },
    createTreeWalker() { let index = 0; return { nextNode: () => nodes[index++] }; },
  } };
  const requests = collectAboutNarrativeFontRequests(content);
  assert.equal(requests.length, 3);
  assert.ok(requests[0].text.includes('’') && requests[0].text.includes('日'));
  assert.equal(requests[1].font, 'normal 400 100px "Instrument Serif", serif');
  assert.ok(requests[2].text.includes('E') && requests[2].text.includes('M'));
});
