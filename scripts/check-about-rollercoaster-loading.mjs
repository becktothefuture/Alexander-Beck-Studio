import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { withAboutLoadDeadline } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterLoading.js';
import { loadRollercoasterBundle } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterContract.js';

const root = new URL('../react-app/app/public/models/about-rollercoaster-world/', import.meta.url);
const bytes = Object.fromEntries(await Promise.all(['meta.json', 'camera.json', 'geometry.json'].map(async file => [file, await readFile(new URL(file, root))])));
const fixtureFetch = async url => new Response(bytes[url.split('/').at(-1)]);

test('deadline rejects an uncooperative pending transport and aborts its request', async () => {
  let request;
  await assert.rejects(withAboutLoadDeadline(signal => {
    request = signal;
    return new Promise(() => {});
  }, { timeoutMs: 10 }), { name: 'TimeoutError', retryable: true });
  assert.equal(request.aborted, true);
});

test('caller cancellation rejects promptly and keeps its original reason', async () => {
  const owner = new AbortController();
  let request;
  const pending = withAboutLoadDeadline(signal => {
    request = signal;
    return new Promise(() => {});
  }, { signal: owner.signal, timeoutMs: 1000 });
  await Promise.resolve();
  const reason = new DOMException('Route left', 'AbortError');
  owner.abort(reason);
  await assert.rejects(pending, error => error === reason);
  assert.equal(request.aborted, true);
});

test('completed operation returns normally and cleans up its request', async () => {
  let request;
  assert.equal(await withAboutLoadDeadline(signal => { request = signal; return 42; }, { timeoutMs: 1000 }), 42);
  assert.equal(request.aborted, true);
});

test('a stalled response body is bounded to three attempts', async () => {
  const requests = [];
  await assert.rejects(loadRollercoasterBundle({
    assetRoot: '/assets', retryDelayMs: 0, timeoutMs: 10,
    fetchImpl: async (_url, options) => {
      requests.push(options.signal);
      return { ok: true, json: () => new Promise(() => {}) };
    },
  }), { name: 'TimeoutError' });
  assert.equal(requests.length, 3);
  assert.ok(requests.every(signal => signal.aborted));
});

test('timeout can recover on a fresh attempt and choose sampling from loaded metadata', async (t) => {
  // Advance only the intentionally stalled attempt. Real hashing/body reads on
  // a shared CI runner must not race an artificial 20ms successful-load budget.
  t.mock.timers.enable({ apis: ['setTimeout'] });
  let reads = 0;
  let sampledSource;
  const pending = loadRollercoasterBundle({
    assetRoot: '/assets', retryDelayMs: 0, timeoutMs: 8000,
    fetchImpl: (...args) => ++reads === 1 ? new Promise(() => {}) : fixtureFetch(...args),
    samplingSettings: meta => { sampledSource = meta.source.sha256; return { spacing: 0.5 }; },
  });
  await new Promise(setImmediate);
  assert.equal(reads, 1);
  t.mock.timers.tick(8000);
  await new Promise(setImmediate);
  t.mock.timers.tick(0);
  const bundle = await pending;
  assert.equal(bundle.loadAttempts, 2);
  assert.equal(sampledSource, bundle.meta.source.sha256);
  assert.equal(bundle.field.spacing, 0.5);
});

test('caller cancellation never retries a stalled bundle', async () => {
  const owner = new AbortController();
  let reads = 0;
  const pending = loadRollercoasterBundle({ assetRoot: '/assets', signal: owner.signal,
    fetchImpl: () => { reads += 1; owner.abort(); return new Promise(() => {}); } });
  await assert.rejects(pending, { name: 'AbortError' });
  assert.equal(reads, 1);
});
