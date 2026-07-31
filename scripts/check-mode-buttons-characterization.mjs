#!/usr/bin/env node
import assert from 'node:assert/strict';
import test from 'node:test';
import { updateModeButtonsUI } from '../react-app/app/src/legacy/modules/ui/mode-buttons.js';
import {
  registerPanelUiDocument,
  unregisterPanelUiDocument,
} from '../react-app/app/src/legacy/modules/ui/panel-ui-context.js';

function createClassList(initialClasses = []) {
  const classes = new Set(initialClasses);
  return {
    contains(className) {
      return classes.has(className);
    },
    remove(className) {
      classes.delete(className);
    },
    add(className) {
      classes.add(className);
    },
    toggle(className, force) {
      if (force) classes.add(className);
      else classes.delete(className);
    },
  };
}

function createUiDocument() {
  const buttons = ['pit', 'flies'].map((mode) => ({
    mode,
    classList: createClassList(mode === 'flies' ? ['active'] : []),
    getAttribute(name) {
      return name === 'data-mode' ? this.mode : null;
    },
  }));
  const panels = ['pitControls', 'fliesControls'].map((id) => ({
    id,
    classList: createClassList(id === 'fliesControls' ? ['active'] : []),
  }));
  const announcer = { textContent: '' };
  const elements = new Map([...panels.map((panel) => [panel.id, panel]), ['announcer', announcer]]);
  return {
    buttons,
    panels,
    announcer,
    getElementById(id) {
      return elements.get(id) || null;
    },
    querySelectorAll(selector) {
      if (selector === '.mode-button') return buttons;
      if (selector === '.mode-controls') return panels;
      return [];
    },
  };
}

function assertActiveMode(uiDocument, mode, announcement) {
  for (const button of uiDocument.buttons) {
    assert.equal(button.classList.contains('active'), button.mode === mode);
  }
  for (const panel of uiDocument.panels) {
    assert.equal(panel.classList.contains('active'), panel.id === `${mode}Controls`);
  }
  assert.equal(uiDocument.announcer.textContent, announcement);
}

test('an explicit document is updated without touching registered panel documents', () => {
  const explicitDocument = createUiDocument();
  const registeredDocument = createUiDocument();
  registerPanelUiDocument(registeredDocument);

  try {
    updateModeButtonsUI('pit', { uiDocument: explicitDocument });
    assertActiveMode(explicitDocument, 'pit', 'Switched to Foundation mode');
    assertActiveMode(registeredDocument, 'flies', '');
  } finally {
    unregisterPanelUiDocument(registeredDocument);
  }
});

test('registered panel documents receive active button, panel, and announcer updates', () => {
  const firstDocument = createUiDocument();
  const secondDocument = createUiDocument();
  registerPanelUiDocument(firstDocument);
  registerPanelUiDocument(secondDocument);

  try {
    updateModeButtonsUI('pit');
    assertActiveMode(firstDocument, 'pit', 'Switched to Foundation mode');
    assertActiveMode(secondDocument, 'pit', 'Switched to Foundation mode');
  } finally {
    unregisterPanelUiDocument(firstDocument);
    unregisterPanelUiDocument(secondDocument);
  }
});

test('the main document is the fallback and unknown modes use their identifier in announcer copy', () => {
  const fallbackDocument = createUiDocument();
  const previousDocument = globalThis.document;
  globalThis.document = fallbackDocument;

  try {
    updateModeButtonsUI('unknown-mode');
    assertActiveMode(fallbackDocument, 'unknown-mode', 'Switched to unknown-mode mode');
  } finally {
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
