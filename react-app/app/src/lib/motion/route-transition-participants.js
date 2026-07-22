const participants = new Map();

function matchesRoute(participant, routeId) {
  return !participant.routeId
    || participant.routeId === '*'
    || participant.routeId === routeId;
}

/**
 * Registers optional route-owned readiness work without transferring transition
 * phase ownership away from the shell. Every callback may return a promise;
 * the shell bounds essential callbacks by its readiness ceiling.
 */
export function registerRouteTransitionParticipant(participant) {
  if (!participant?.id) {
    throw new TypeError('Route transition participants require a stable id.');
  }
  participants.set(participant.id, participant);
  return () => {
    if (participants.get(participant.id) === participant) {
      participants.delete(participant.id);
    }
  };
}

export function createRouteTransitionParticipantGeneration({
  generation,
  fromRouteId,
  toRouteId,
  signal,
}) {
  let settled = false;
  const touched = new Set();
  const invoked = new Map();
  const participantController = new AbortController();
  const abortParticipants = () => participantController.abort(signal?.reason || 'transaction-aborted');
  if (signal?.aborted) abortParticipants();
  else signal?.addEventListener('abort', abortParticipants, { once: true });
  const context = Object.freeze({
    generation,
    fromRouteId,
    toRouteId,
    signal: participantController.signal,
  });

  const readForRoute = (routeId) => (
    [...participants.values()].filter((participant) => matchesRoute(participant, routeId))
  );
  const invoke = async (method, routeId) => {
    if (settled || participantController.signal.aborted) return;
    const invokedForMethod = invoked.get(method) || new Set();
    invoked.set(method, invokedForMethod);
    const selected = readForRoute(routeId).filter((participant) => !invokedForMethod.has(participant));
    selected.forEach((participant) => invokedForMethod.add(participant));
    selected.forEach((participant) => touched.add(participant));
    await Promise.all(selected.map((participant) => participant[method]?.(context)));
  };

  return {
    generation,
    async prepare() {
      await invoke('prepare', toRouteId);
    },
    async exit() {
      await invoke('exit', fromRouteId);
    },
    async restore() {
      await invoke('restore', fromRouteId);
    },
    async waitUntilReady() {
      await invoke('waitUntilReady', toRouteId);
    },
    async enter() {
      await invoke('enter', toRouteId);
    },
    cancel(reason = 'cancelled') {
      if (settled) return;
      settled = true;
      participantController.abort(reason);
      signal?.removeEventListener('abort', abortParticipants);
      new Set([...touched, ...readForRoute(fromRouteId), ...readForRoute(toRouteId)]).forEach((participant) => {
        participant.cancel?.({ ...context, reason });
      });
    },
    complete(status = 'ready') {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', abortParticipants);
      new Set([...touched, ...readForRoute(fromRouteId), ...readForRoute(toRouteId)]).forEach((participant) => {
        participant.complete?.({ ...context, status });
      });
    },
  };
}
