import assert from 'node:assert/strict';
import test from 'node:test';

import {
  INTERACTION_SOUND_RECIPES,
  createInteractionSoundDelegate,
  getInteractionSoundDescriptor,
} from './interaction-sound-policy.js';

function createElement({ action, source, disabled = false, ariaDisabled = false, parent = null } = {}) {
  return {
    dataset: {
      ...(action ? { soundAction: action } : {}),
      ...(source ? { soundSource: source } : {}),
    },
    disabled,
    parentElement: parent,
    getAttribute(name) {
      if (name === 'aria-disabled') return ariaDisabled ? 'true' : null;
      return null;
    },
    closest(selector) {
      if (selector !== '[data-sound-action]') return null;
      let node = this;
      while (node) {
        if (node.dataset?.soundAction) return node;
        node = node.parentElement;
      }
      return null;
    },
  };
}

test('project-open is a quieter delayed tail layered after the standard press', () => {
  const press = INTERACTION_SOUND_RECIPES.press.layers[0];
  const projectOpen = INTERACTION_SOUND_RECIPES['project-open'];

  assert.equal(projectOpen.layers.length, 2);
  assert.deepEqual(projectOpen.layers[0], press);
  assert.equal(projectOpen.layers[1].delayMs, 35);
  assert.ok(projectOpen.layers[1].gain < press.gain * 0.5);
  assert.ok(projectOpen.durationMs <= 90);
});

test('descriptor resolves annotated ancestors and ignores manual, none, and disabled actions', () => {
  const annotated = createElement({ action: 'press', source: 'footer-link' });
  const child = createElement({ parent: annotated });

  assert.deepEqual(getInteractionSoundDescriptor(child), {
    kind: 'press',
    source: 'footer-link',
    element: annotated,
  });
  assert.equal(getInteractionSoundDescriptor(createElement({ action: 'manual' })), null);
  assert.equal(getInteractionSoundDescriptor(createElement({ action: 'none' })), null);
  assert.equal(getInteractionSoundDescriptor(createElement({ action: 'press', disabled: true })), null);
  assert.equal(getInteractionSoundDescriptor(createElement({ action: 'press', ariaDisabled: true })), null);
});

test('delegate plays one classified sound for an eligible click', () => {
  let clickListener = null;
  const root = {
    addEventListener(type, listener) {
      assert.equal(type, 'click');
      clickListener = listener;
    },
    removeEventListener(type, listener) {
      assert.equal(type, 'click');
      assert.equal(listener, clickListener);
    },
  };
  const events = [];
  const dispose = createInteractionSoundDelegate({
    root,
    play: (kind, options) => events.push({ kind, ...options }),
  });

  clickListener({
    defaultPrevented: false,
    target: createElement({ action: 'press', source: 'about-link' }),
  });

  assert.deepEqual(events, [{ kind: 'press', source: 'about-link' }]);
  dispose();
});
