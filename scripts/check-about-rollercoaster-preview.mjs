import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { aboutRollercoasterPreviewPlugin } from './lib/about-rollercoaster-preview.mjs';

test('surface preview reloads only for a complete source-matched manifest and detaches on close', async () => {
  const root = await mkdtemp(join(tmpdir(), 'about-surface-preview-'));
  const relative = 'react-app/app/public/models/about-rollercoaster-world';
  const directory = join(root, relative);
  const manifest = join(directory, 'meta.json');
  const fixture = resolve(relative);
  const originalMeta = await readFile(join(fixture, 'meta.json'));
  const meta = JSON.parse(originalMeta);
  assert.equal(meta.schema, 'about-rollercoaster-world/v2');
  const warnings = [], messages = [], callbacks = new Map();
  const httpServer = new EventEmitter();
  const server = {
    watcher: {
      add: file => assert.equal(file, manifest),
      on: (event, callback) => callbacks.set(event, callback),
      off: (event, callback) => {
        assert.equal(callbacks.get(event), callback);
        callbacks.delete(event);
      },
    },
    ws: { send: message => messages.push(message) },
    config: { logger: { warn: message => warnings.push(message) } },
    httpServer,
  };
  try {
    await mkdir(directory, { recursive: true });
    await mkdir(dirname(join(root, meta.source.file)), { recursive: true });
    await writeFile(join(root, meta.source.file), await readFile(resolve(meta.source.file)));
    for (const file of ['camera.json', 'geometry.json', 'meta.json']) {
      await writeFile(join(directory, file), await readFile(join(fixture, file)));
    }
    const plugin = aboutRollercoasterPreviewPlugin(root);
    plugin.configureServer(server);
    const publish = callbacks.get('change');
    await publish(join(directory, 'geometry.json'), server);
    assert.equal(messages.length, 0, 'A surface write cannot signal a complete export.');
    await publish(manifest, server);
    assert.deepEqual(messages, [{ type: 'full-reload', path: '*' }]);
    assert.equal(warnings.length, 0);

    await writeFile(join(directory, 'geometry.json'), '{"objects":[]}');
    await publish(manifest, server);
    assert.equal(messages.length, 1, 'Truncated or stale geometry must retain the last preview.');
    assert.equal(warnings.length, 1);
    await writeFile(join(directory, 'geometry.json'), await readFile(join(fixture, 'geometry.json')));
    await writeFile(join(root, meta.source.file), 'changed source');
    await publish(manifest, server);
    assert.equal(messages.length, 1, 'A changed Blender file must not use a stale export.');
    assert.match(warnings.at(-1), /source does not match/i);
    assert.deepEqual(plugin.handleHotUpdate({ file: manifest }), []);
    assert.equal(plugin.handleHotUpdate({ file: join(directory, 'camera.json') }), undefined);
    httpServer.emit('close');
    assert.equal(callbacks.size, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
