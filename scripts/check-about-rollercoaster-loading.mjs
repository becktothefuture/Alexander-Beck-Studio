import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { withAboutLoadDeadline } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterLoading.js';
import { loadRollercoasterBundle } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterContract.js';
import { createRollercoasterSampler } from '../react-app/app/src/routes/about-rollercoaster/rollercoasterSampler.js';

const root = new URL('../react-app/app/public/models/about-rollercoaster-world/', import.meta.url);
const bytes = Object.fromEntries(await Promise.all(['meta.json', 'camera.json', 'geometry.json'].map(async file => [file, await readFile(new URL(file, root))])));
const fixtureFetch = async url => new Response(bytes[url.split('/').at(-1)]);

test('sampling keeps only the latest queued resize and returns transferred results in order', async () => {
  const sent = [];
  const worker = { postMessage: request => sent.push(request), terminate() {} };
  const sampler = createRollercoasterSampler({ workerFactory: () => worker });
  const first = sampler.sample({}, { spacing: 1 });
  const superseded = sampler.sample({}, { spacing: 2 }).catch(error => error.name);
  const latest = sampler.sample({}, { spacing: 3 });
  assert.equal(sent.length, 1);
  assert.equal(await superseded, 'AbortError');
  worker.onmessage({ data: { id: sent[0].id, result: { field: { spacing: 1 } } } });
  assert.equal((await first).field.spacing, 1);
  assert.equal(sent.length, 2);
  assert.equal(sent[1].settings.spacing, 3);
  worker.onmessage({ data: { id: sent[1].id, result: { field: { spacing: 3 } } } });
  assert.equal((await latest).field.spacing, 3);
  sampler.dispose();
  assert.equal(sampler.inspect().workers, 0);
});

test('leaving the route terminates sampling and rejects active and queued work', async () => {
  let terminations = 0;
  const sampler = createRollercoasterSampler({ workerFactory: () => ({ postMessage() {}, terminate() { terminations += 1; } }) });
  const active = sampler.sample({}, {}).catch(error => error.name);
  const queued = sampler.sample({}, {}).catch(error => error.name);
  sampler.dispose(); sampler.dispose();
  assert.deepEqual(await Promise.all([active, queued]), ['AbortError', 'AbortError']);
  assert.equal(terminations, 1);
  assert.deepEqual(sampler.inspect(), { mode: 'worker', workers: 0, active: false, queued: false });
  await assert.rejects(sampler.sample({}, {}), { name: 'AbortError' });
});

test('a stalled sampling worker has a bounded deadline and is terminated', async () => {
  let stopped = false;
  const sampler = createRollercoasterSampler({ timeoutMs: 10,
    workerFactory: () => ({ postMessage() {}, terminate() { stopped = true; } }) });
  await assert.rejects(sampler.sample({}, {}), /sampling timed out/);
  assert.equal(stopped, true);
  assert.equal(sampler.inspect().workers, 0);
  sampler.dispose();
});

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
