import { createAboutNarrativeBufferLru } from './aboutNarrativeBufferLru.js';
import { ABOUT_NARRATIVE_CACHE_LIMITS } from './aboutNarrativeRuntimeConstants.js';

function assertCacheKey(key) {
  if (typeof key !== 'string' || !key) {
    throw new TypeError('Persistent About Narrative cache keys must be non-empty strings.');
  }
}

function assertPreparedSequence(value) {
  if (!value || typeof value !== 'object' || !(value.pairs instanceof Map)) {
    throw new TypeError('Persistent About Narrative sequence entries need a prepared pair Map.');
  }
}

function clonePreparedSequence(value, { freezePairs = false } = {}) {
  assertPreparedSequence(value);
  const pairs = new Map();
  value.pairs.forEach((pair, key) => {
    const copy = { ...pair };
    pairs.set(key, freezePairs ? Object.freeze(copy) : copy);
  });
  const copy = { ...value, pairs };
  return freezePairs ? Object.freeze(copy) : copy;
}

/**
 * Keeps immutable CPU preparation results for the current document only.
 *
 * WebGL renderers, GPU resources, abort-scoped promises, and live World
 * wrappers never enter this store. Each adapter receives a mutable wrapper
 * around the cached pair metadata while sharing the deterministic typed arrays.
 */
export function createAboutNarrativePersistentCacheStore({
  shapeLimits = ABOUT_NARRATIVE_CACHE_LIMITS.shape,
  sequenceLimits = ABOUT_NARRATIVE_CACHE_LIMITS.sequence,
} = {}) {
  const shapeCache = createAboutNarrativeBufferLru({
    name: 'about-document-shapes',
    ...shapeLimits,
  });
  const sequenceCache = createAboutNarrativeBufferLru({
    name: 'about-document-sequences',
    ...sequenceLimits,
  });
  const shapeDiagnostics = Object.freeze({ getSnapshot: shapeCache.getSnapshot });
  const sequenceDiagnostics = Object.freeze({ getSnapshot: sequenceCache.getSnapshot });
  let nextLeaseId = 1;

  const createLease = () => {
    const pinOwner = `about-runtime-lease-${nextLeaseId}`;
    nextLeaseId += 1;
    let pinnedSequenceKey = '';
    let released = false;

    const assertActive = () => {
      if (released) throw new Error('Persistent About Narrative cache lease has been released.');
    };

    const switchPinnedSequence = (key, { alreadyPinned = false } = {}) => {
      const previousKey = pinnedSequenceKey;
      if (!alreadyPinned && !sequenceCache.pin(key, pinOwner)) return false;
      pinnedSequenceKey = key;
      if (previousKey && previousKey !== key) {
        sequenceCache.unpin(previousKey, pinOwner);
      }
      return true;
    };

    return Object.freeze({
      shapeDiagnostics,
      sequenceDiagnostics,
      getShape(key) {
        assertActive();
        assertCacheKey(key);
        return shapeCache.get(key);
      },
      storeShape(key, value) {
        assertActive();
        assertCacheKey(key);
        const cached = shapeCache.peek(key);
        if (cached) return cached;
        return shapeCache.set(key, value, { owner: 'shape-cache' });
      },
      getSequence(key) {
        assertActive();
        assertCacheKey(key);
        const cached = sequenceCache.get(key);
        if (!cached) return undefined;
        if (!switchPinnedSequence(key)) return undefined;
        return clonePreparedSequence(cached);
      },
      storeSequence(key, value) {
        assertActive();
        assertCacheKey(key);
        let cached = sequenceCache.peek(key);
        let alreadyPinned = false;
        if (!cached) {
          cached = clonePreparedSequence(value, { freezePairs: true });
          sequenceCache.set(key, cached, {
            owner: 'sequence-cache',
            pins: [pinOwner],
          });
          alreadyPinned = true;
        }
        if (!switchPinnedSequence(key, { alreadyPinned })) {
          throw new Error(`Persistent About Narrative sequence ${key} could not be pinned.`);
        }
        return clonePreparedSequence(cached);
      },
      release() {
        if (released) return;
        released = true;
        if (pinnedSequenceKey) sequenceCache.unpin(pinnedSequenceKey, pinOwner);
        pinnedSequenceKey = '';
      },
    });
  };

  return Object.freeze({
    createLease,
    getShapeSnapshot: shapeCache.getSnapshot,
    getSequenceSnapshot: sequenceCache.getSnapshot,
    clear(reason = 'cleared') {
      shapeCache.clear(reason);
      sequenceCache.clear(reason);
    },
  });
}

const documentCacheStore = createAboutNarrativePersistentCacheStore();

export function createAboutNarrativePersistentCacheLease() {
  return documentCacheStore.createLease();
}
