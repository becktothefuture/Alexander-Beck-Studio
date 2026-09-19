export const ABOUT_LOAD_TIMEOUT_MS = 8000;

/** Bound network and body reads, even if a transport ignores its abort signal. */
export async function withAboutLoadDeadline(operation, { signal, timeoutMs = ABOUT_LOAD_TIMEOUT_MS } = {}) {
  signal?.throwIfAborted();
  const request = new AbortController();
  let timer;
  let cancel;
  const interrupted = new Promise((_, reject) => {
    cancel = () => {
      request.abort(signal.reason);
      reject(signal.reason);
    };
    signal?.addEventListener('abort', cancel, { once: true });
    timer = setTimeout(() => {
      const error = new Error('The About scene took too long to load.');
      error.name = 'TimeoutError';
      error.retryable = true;
      request.abort(error);
      reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([Promise.resolve().then(() => operation(request.signal)), interrupted]);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', cancel);
    request.abort();
  }
}
