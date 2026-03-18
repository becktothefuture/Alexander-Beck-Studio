import { useEffect } from 'react';

const pageBootStates = new Map();

export function useLegacyBootstrap(pageKey, loader) {
  useEffect(() => {
    if (!pageKey || typeof loader !== 'function') return;

    const currentState = pageBootStates.get(pageKey);
    if (currentState?.status === 'booted' || currentState?.status === 'loading') return;

    const attemptId = (currentState?.attemptId || 0) + 1;
    let cancelled = false;

    pageBootStates.set(pageKey, {
      status: 'loading',
      attemptId
    });

    Promise.resolve()
      .then(() => loader())
      .then(() => {
        if (cancelled) return;

        const latestState = pageBootStates.get(pageKey);
        if (latestState?.attemptId !== attemptId) return;

        pageBootStates.set(pageKey, {
          status: 'booted',
          attemptId
        });
      })
      .catch((error) => {
        const latestState = pageBootStates.get(pageKey);
        if (latestState?.attemptId === attemptId) {
          pageBootStates.delete(pageKey);
        }
        console.error(`[react-bridge] Failed to bootstrap page "${pageKey}"`, error);
      });

    return () => {
      cancelled = true;

      const latestState = pageBootStates.get(pageKey);
      if (latestState?.attemptId === attemptId && latestState.status === 'loading') {
        // Allow a fresh attempt if the component unmounts before bootstrap completes.
        pageBootStates.delete(pageKey);
      }
    };
  }, [pageKey, loader]);
}
