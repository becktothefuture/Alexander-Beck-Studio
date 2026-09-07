import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { patchDesignModeSidepanel } from '../lib/design-mode-extension-compat.mjs';

test('pinned sidepanel enables token-only Copy/Send while preserving Original and empty guards', async () => {
  const source = await readFile(new URL('../../.cache/design-mode/packages/extension/src/sidepanel/sidepanel.ts', import.meta.url), 'utf8');
  const patched = patchDesignModeSidepanel(source);
  const begin = patched.indexOf('function renderStickyBottom(): string {');
  const end = patched.indexOf('\n}', begin) + 2;
  assert.ok(begin >= 0 && end > begin);
  const fn = patched.slice(begin, end).replace('(): string', '()');
  for (const [tokens, styles, original, disabled] of [[0, 0, false, true], [1, 0, false, false], [0, 1, false, false], [1, 0, true, true]]) {
    const html = vm.runInNewContext(`${fn}; renderStickyBottom()`, {
      tokenChanges: Array(tokens).fill({}), styleChanges: Array(styles).fill({}), textChanges: [], domChanges: [], comments: [],
      previewingOriginal: original, mcpState: 'connected', icon: () => '', escapeAttr: String,
    });
    const send = html.match(/<button id="dm-send-agent-btn"[^>]*>/)[0];
    assert.equal(send.includes('disabled'), disabled, JSON.stringify({ tokens, styles, original }));
    const copy = html.match(/<button id="dm-copy-prompt-btn"[^>]*>/)[0];
    assert.equal(copy.includes('pointer-events:none'), disabled);
  }
  const tabsBegin = patched.indexOf('function renderTabs(): string {');
  const tabsEnd = patched.indexOf('\n}', tabsBegin) + 2;
  const tabs = patched.slice(tabsBegin, tabsEnd).replace('(): string', '()')
    .replace(/const tabs:.*\[\] =/, 'const tabs =');
  const tabsHtml = vm.runInNewContext(`${tabs}; renderTabs()`, {
    tokenChanges: [{}, {}], styleChanges: [{}], textChanges: [], domChanges: [], comments: [], tab: 'changes', icon: () => '',
  });
  assert.match(tabsHtml, /Changes <span[^>]*>3<\/span>/);
  assert.throws(() => patchDesignModeSidepanel(patched), /source changed/);
});
