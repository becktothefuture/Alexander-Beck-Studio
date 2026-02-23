import { useEffect } from 'react';

const bootedPages = new Set();

export function useLegacyBootstrap(pageKey, loader) {
  useEffect(() => {
    if (!pageKey || typeof loader !== 'function') return;
    if (bootedPages.has(pageKey)) return;

    bootedPages.add(pageKey);
    let cancelled = false;

    Promise.resolve()
      .then(() => loader())
      .catch((error) => {
        console.error(`[react-bridge] Failed to bootstrap page "${pageKey}"`, error);
      });

    return () => {
      cancelled = true;
      if (cancelled) {
        // Keep legacy runtime mounted for parity; no teardown path exists yet.
      }
    };
  }, [pageKey, loader]);
}
