import assert from 'node:assert/strict';
import test from 'node:test';
import { addStableEventListener, createLegacyRuntimeScope } from '../react-app/app/src/lib/legacy-runtime-scope.js';

test('editor listeners survive route cleanup; route listeners and editor disposal still work', () => {
  const previousWindow = globalThis.window;
  globalThis.window = { setTimeout, clearTimeout, setInterval, clearInterval };
  const target = new EventTarget();
  let editorCalls = 0;
  let routeCalls = 0;
  let disposeEditor;
  let scope;
  try {
    scope = createLegacyRuntimeScope();
    target.addEventListener('toggle', () => { routeCalls += 1; });
    disposeEditor = addStableEventListener(target, 'toggle', () => { editorCalls += 1; });
    scope.stopCapturing();
    target.dispatchEvent(new Event('toggle'));
    assert.deepEqual([editorCalls, routeCalls], [1, 1]);
    scope.cleanup();
    target.dispatchEvent(new Event('toggle'));
    assert.deepEqual([editorCalls, routeCalls], [2, 1]);
    disposeEditor();
    target.dispatchEvent(new Event('toggle'));
    assert.deepEqual([editorCalls, routeCalls], [2, 1]);
  } finally {
    scope?.cleanup();
    disposeEditor?.();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});
