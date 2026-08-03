import assert from 'node:assert/strict';
import test from 'node:test';

import {
  getWrappedAdjacentItem,
  shouldIgnoreGlobalKeyboardShortcut,
} from '../react-app/app/src/lib/global-keyboard-shortcuts.js';

const ITEMS = Object.freeze([
  Object.freeze({ routeId: 'home' }),
  Object.freeze({ routeId: 'portfolio' }),
  Object.freeze({ routeId: 'about' }),
]);

function createTarget({ interactive = false, routeTab = false, modalOpen = false } = {}) {
  return {
    ownerDocument: {
      querySelector: () => (modalOpen ? {} : null),
    },
    closest(selector) {
      if (selector === '[data-route-tab]') return routeTab ? {} : null;
      return interactive ? {} : null;
    },
  };
}

function createEvent(overrides = {}) {
  return {
    altKey: false,
    ctrlKey: false,
    defaultPrevented: false,
    isComposing: false,
    metaKey: false,
    repeat: false,
    shiftKey: false,
    target: createTarget(),
    ...overrides,
  };
}

test('wrapped navigation moves in both directions and wraps at each end', () => {
  const getId = (item) => item.routeId;

  assert.equal(getWrappedAdjacentItem(ITEMS, 'home', 1, getId)?.routeId, 'portfolio');
  assert.equal(getWrappedAdjacentItem(ITEMS, 'home', -1, getId)?.routeId, 'about');
  assert.equal(getWrappedAdjacentItem(ITEMS, 'about', 1, getId)?.routeId, 'home');
  assert.equal(getWrappedAdjacentItem(ITEMS, 'portfolio', -1, getId)?.routeId, 'home');
});

test('wrapped navigation chooses the directional edge when the active item is absent', () => {
  const getId = (item) => item.routeId;

  assert.equal(getWrappedAdjacentItem(ITEMS, 'missing', 1, getId)?.routeId, 'home');
  assert.equal(getWrappedAdjacentItem(ITEMS, 'missing', -1, getId)?.routeId, 'about');
});

test('global shortcuts ignore modified, repeated, composed, interactive, and modal events', () => {
  assert.equal(shouldIgnoreGlobalKeyboardShortcut(createEvent({ repeat: true })), true);
  assert.equal(shouldIgnoreGlobalKeyboardShortcut(createEvent({ metaKey: true })), true);
  assert.equal(shouldIgnoreGlobalKeyboardShortcut(createEvent({ isComposing: true })), true);
  assert.equal(shouldIgnoreGlobalKeyboardShortcut(createEvent({ target: createTarget({ interactive: true }) })), true);
  assert.equal(shouldIgnoreGlobalKeyboardShortcut(createEvent({ target: createTarget({ modalOpen: true }) })), true);
  assert.equal(shouldIgnoreGlobalKeyboardShortcut(createEvent()), false);
});

test('route tabs can opt into global arrow navigation without enabling other controls', () => {
  const routeTabEvent = createEvent({
    target: createTarget({ interactive: true, routeTab: true }),
  });
  const controlEvent = createEvent({
    target: createTarget({ interactive: true }),
  });

  assert.equal(shouldIgnoreGlobalKeyboardShortcut(routeTabEvent, { allowRouteTab: true }), false);
  assert.equal(shouldIgnoreGlobalKeyboardShortcut(controlEvent, { allowRouteTab: true }), true);
});
