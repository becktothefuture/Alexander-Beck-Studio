import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import {
  ABOUT_NARRATIVE_HISTORY_PROGRESS_KEY,
  hasAboutNarrativeRestoredProgress,
  readAboutNarrativeHistoryProgress,
  writeAboutNarrativeHistoryProgress,
  createAboutNarrativeScrollPersistence,
} from '../react-app/app/src/routes/about/aboutNarrativeScrollRestoration.js';

const ROOT = new URL('../', import.meta.url);
const [loadingFrameSource, experienceSource] = await Promise.all([
  readFile(new URL('react-app/app/src/routes/about/AboutNarrativeLoadingFrame.jsx', ROOT), 'utf8'),
  readFile(new URL('react-app/app/src/routes/about-simple/AboutSimpleExperience.jsx', ROOT), 'utf8'),
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
  assert.match(experienceSource, /useRef\(readAboutNarrativeHistoryProgress\(\)\)/);
  assert.match(experienceSource, /createAboutNarrativeScrollPersistence\(scrollportRef\.current\)/);
  assert.match(experienceSource, /scrollport\.scrollTop = scrollRange \* restoredProgress/);
  assert.match(experienceSource, /data-about-scene-ready="false"/);
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

test('About uses one direct native-scroll progress instrument', () => {
  assert.match(experienceSource, /const progress = scrollRange > 0 \? scrollport\.scrollTop \/ scrollRange : 0/);
  assert.match(experienceSource, /--about-simple-progress/);
  assert.match(experienceSource, /runtimeRef\.current\?\.setProgress\(boundedProgress\)/);
  assert.doesNotMatch(experienceSource, /resolveScrollProgressIndicatorState|activeTickCount|Lenis/);
});
