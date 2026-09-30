import { sampleRollercoasterField } from './rollercoasterField.js';

const cancelled = () => new DOMException('About sampling superseded or disposed.', 'AbortError');

/** One worker, one running request and at most one latest queued request. */
export function createRollercoasterSampler({
  workerFactory = null,
  timeoutMs = 15000,
} = {}) {
  let worker, active, queued, timer, disposed = false, sequence = 0;
  const mode = workerFactory ? 'worker' : 'synchronous';
  function fail(error) {
    clearTimeout(timer);
    worker?.terminate(); worker = null;
    active?.reject(error); queued?.reject(error);
    active = queued = null;
  }
  function start(request) {
    active = request;
    try {
      if (!worker) {
        worker = workerFactory();
        worker.onmessage = ({ data }) => {
          if (disposed || data.id !== active?.id) return;
          clearTimeout(timer);
          const finished = active; active = null;
          if (data.error) finished.reject(new Error(data.error));
          else finished.resolve(data.result);
          if (queued) { const next = queued; queued = null; start(next); }
        };
        worker.onerror = () => fail(new Error('About circle sampling worker failed.'));
      }
      timer = setTimeout(() => fail(new Error('About circle sampling timed out.')), timeoutMs);
      worker.postMessage({ id: request.id, geometry: request.geometry, settings: request.settings });
    } catch (error) { fail(error); }
  }
  return {
    async sample(geometry, settings) {
      if (disposed) throw cancelled();
      if (!workerFactory) {
        const started = performance.now();
        return { ...sampleRollercoasterField(geometry, settings), samplingMs: performance.now() - started };
      }
      return new Promise((resolve, reject) => {
        const request = { id: ++sequence, geometry, settings, resolve, reject };
        if (active) { queued?.reject(cancelled()); queued = request; }
        else start(request);
      });
    },
    inspect: () => ({ mode, workers: worker ? 1 : 0, active: Boolean(active), queued: Boolean(queued) }),
    dispose() { if (!disposed) { disposed = true; fail(cancelled()); } },
  };
}
