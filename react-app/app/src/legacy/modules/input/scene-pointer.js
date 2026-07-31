// Route-neutral scene-pointer event port. The input owner publishes samples;
// simulation modes subscribe without importing the input module or its mode controls.

const scenePointerSubscribers = new Set();

export function subscribeScenePointer(handler) {
  if (typeof handler !== 'function') return () => {};
  scenePointerSubscribers.add(handler);
  return () => {
    scenePointerSubscribers.delete(handler);
  };
}

export function emitScenePointer(type, detail) {
  if (scenePointerSubscribers.size === 0) return;
  for (const handler of scenePointerSubscribers) {
    try {
      handler(type, detail);
    } catch (error) {
      // One mode must not prevent later subscribers from receiving the sample.
      void error;
    }
  }
}
