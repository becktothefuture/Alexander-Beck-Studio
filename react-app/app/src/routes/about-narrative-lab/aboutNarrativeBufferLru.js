function assertKey(key) {
  if (typeof key !== 'string' || !key) throw new TypeError('Buffer LRU keys must be non-empty strings.');
}

function assertOwner(owner) {
  if (typeof owner !== 'string' || !owner) throw new TypeError('Buffer LRU entries need a registered owner.');
}

function normalizeBuffers(buffers) {
  const unique = new Set();
  for (const buffer of buffers || []) {
    if (!(buffer instanceof ArrayBuffer)) throw new TypeError('Buffer LRU entries may register ArrayBuffer instances only.');
    unique.add(buffer);
  }
  return unique;
}

export function collectAboutNarrativeArrayBuffers(value) {
  const buffers = new Set();
  const visited = new Set();
  const visit = (candidate) => {
    if (!candidate || typeof candidate !== 'object' || visited.has(candidate)) return;
    visited.add(candidate);
    if (candidate instanceof ArrayBuffer) {
      buffers.add(candidate);
      return;
    }
    if (ArrayBuffer.isView(candidate)) {
      if (candidate.buffer instanceof ArrayBuffer) buffers.add(candidate.buffer);
      return;
    }
    if (candidate instanceof Promise) return;
    if (Array.isArray(candidate)) {
      candidate.forEach(visit);
      return;
    }
    Object.values(candidate).forEach(visit);
  };
  visit(value);
  return buffers;
}

export function createAboutNarrativeBufferLru({
  name,
  maxEntries,
  maxBytes,
  onEvent = null,
} = {}) {
  if (typeof name !== 'string' || !name) throw new TypeError('Buffer LRU caches need a name.');
  if (!Number.isInteger(maxEntries) || maxEntries < 1) throw new TypeError('Buffer LRU maxEntries must be a positive integer.');
  if (!Number.isFinite(maxBytes) || maxBytes < 1) throw new TypeError('Buffer LRU maxBytes must be positive.');
  if (onEvent !== null && typeof onEvent !== 'function') throw new TypeError('Buffer LRU onEvent must be a function.');

  const entries = new Map();
  const bufferReferences = new Map();
  const counters = {
    hits: 0,
    misses: 0,
    evictions: 0,
    rejections: 0,
  };
  let uniqueBytes = 0;
  let activeKey = '';
  let disposed = false;

  const notify = (type, fields = {}) => onEvent?.({ cache: name, type, ...fields });

  const assertUsable = () => {
    if (disposed) throw new Error(`Buffer LRU ${name} has been disposed.`);
  };

  const registerBuffers = (buffers) => {
    buffers.forEach((buffer) => {
      const current = bufferReferences.get(buffer);
      if (current) {
        current.references += 1;
      } else {
        bufferReferences.set(buffer, { references: 1, byteLength: buffer.byteLength });
        uniqueBytes += buffer.byteLength;
      }
    });
  };

  const releaseBuffers = (buffers) => {
    buffers.forEach((buffer) => {
      const current = bufferReferences.get(buffer);
      if (!current) throw new Error(`Buffer LRU ${name} released an unregistered buffer.`);
      current.references -= 1;
      if (current.references === 0) {
        uniqueBytes -= current.byteLength;
        bufferReferences.delete(buffer);
      }
    });
  };

  const removeEntry = (key, reason, { callDispose = true } = {}) => {
    const entry = entries.get(key);
    if (!entry) return false;
    entries.delete(key);
    releaseBuffers(entry.buffers);
    if (activeKey === key) activeKey = '';
    if (reason === 'evicted') counters.evictions += 1;
    if (callDispose) entry.dispose?.(entry.value, reason);
    notify(reason, { key, owner: entry.owner });
    return true;
  };

  const canEvict = (entry) => !entry.active && !entry.inFlight && entry.pins.size === 0;

  const enforceLimits = () => {
    while (entries.size > maxEntries || uniqueBytes > maxBytes) {
      const candidate = [...entries.values()].find(canEvict);
      if (!candidate) break;
      removeEntry(candidate.key, 'evicted');
    }
  };

  const touch = (entry) => {
    entries.delete(entry.key);
    entries.set(entry.key, entry);
  };

  const set = (key, value, {
    owner,
    buffers = collectAboutNarrativeArrayBuffers(value),
    pins = [],
    inFlight = false,
    active = false,
    dispose: disposeValue = null,
  } = {}) => {
    assertUsable();
    assertKey(key);
    assertOwner(owner);
    if (disposeValue !== null && typeof disposeValue !== 'function') throw new TypeError('Buffer LRU dispose must be a function.');
    const normalizedBuffers = normalizeBuffers(buffers);
    const pinSet = new Set(pins);
    pinSet.forEach(assertOwner);
    removeEntry(key, 'replaced');
    if (active) {
      entries.forEach((entry) => { entry.active = false; });
      activeKey = key;
    }
    const entry = {
      key,
      value,
      owner,
      buffers: normalizedBuffers,
      pins: pinSet,
      inFlight: Boolean(inFlight),
      active: Boolean(active),
      dispose: disposeValue,
    };
    entries.set(key, entry);
    registerBuffers(normalizedBuffers);
    notify('set', { key, owner });
    enforceLimits();
    return value;
  };

  const get = (key) => {
    assertUsable();
    const entry = entries.get(key);
    if (!entry) {
      counters.misses += 1;
      return undefined;
    }
    counters.hits += 1;
    touch(entry);
    return entry.value;
  };

  const peek = (key) => {
    assertUsable();
    return entries.get(key)?.value;
  };

  const has = (key) => {
    assertUsable();
    return entries.has(key);
  };

  const pin = (key, owner) => {
    assertUsable();
    assertOwner(owner);
    const entry = entries.get(key);
    if (!entry) return false;
    entry.pins.add(owner);
    touch(entry);
    enforceLimits();
    return true;
  };

  const unpin = (key, owner) => {
    assertUsable();
    assertOwner(owner);
    const entry = entries.get(key);
    if (!entry) return false;
    const removed = entry.pins.delete(owner);
    enforceLimits();
    return removed;
  };

  const markInFlight = (key, inFlight) => {
    assertUsable();
    const entry = entries.get(key);
    if (!entry) return false;
    entry.inFlight = Boolean(inFlight);
    enforceLimits();
    return true;
  };

  const activate = (key) => {
    assertUsable();
    if (key && !entries.has(key)) return false;
    entries.forEach((entry) => { entry.active = entry.key === key; });
    activeKey = key || '';
    if (key) touch(entries.get(key));
    enforceLimits();
    return true;
  };

  const trackPromise = (key, promise, {
    owner,
    pinOwner = `${name}:pending`,
    buffersFromValue = collectAboutNarrativeArrayBuffers,
    dispose: disposeValue = null,
  } = {}) => {
    if (!(promise instanceof Promise)) throw new TypeError('Buffer LRU trackPromise expects a Promise.');
    set(key, promise, { owner, pins: [pinOwner], inFlight: true, dispose: disposeValue });
    return promise.then((value) => {
      const entry = entries.get(key);
      if (!entry || entry.value !== promise) return value;
      const nextBuffers = normalizeBuffers(buffersFromValue(value));
      releaseBuffers(entry.buffers);
      entry.value = value;
      entry.buffers = nextBuffers;
      entry.inFlight = false;
      entry.pins.delete(pinOwner);
      registerBuffers(nextBuffers);
      touch(entry);
      notify('resolved', { key, owner });
      enforceLimits();
      return value;
    }, (error) => {
      const entry = entries.get(key);
      if (entry?.value === promise) removeEntry(key, 'rejected', { callDispose: false });
      counters.rejections += 1;
      throw error;
    });
  };

  const deleteEntry = (key, reason = 'deleted') => {
    assertUsable();
    return removeEntry(key, reason);
  };

  const clear = (reason = 'cleared') => {
    assertUsable();
    [...entries.keys()].forEach((key) => removeEntry(key, reason));
  };

  const getSnapshot = () => {
    const owners = new Map();
    entries.forEach((entry) => {
      const current = owners.get(entry.owner) || { entries: 0, entryBytes: 0 };
      current.entries += 1;
      current.entryBytes += [...entry.buffers].reduce((sum, buffer) => sum + buffer.byteLength, 0);
      owners.set(entry.owner, current);
    });
    const active = activeKey ? entries.get(activeKey) : null;
    const activeBytes = active
      ? [...active.buffers].reduce((sum, buffer) => sum + buffer.byteLength, 0)
      : 0;
    return Object.freeze({
      name,
      disposed,
      entries: entries.size,
      uniqueBuffers: bufferReferences.size,
      uniqueBytes,
      maxEntries,
      maxBytes,
      hits: counters.hits,
      misses: counters.misses,
      evictions: counters.evictions,
      rejections: counters.rejections,
      activeKey,
      pinnedEntries: [...entries.values()].filter((entry) => entry.pins.size > 0).length,
      inFlightEntries: [...entries.values()].filter((entry) => entry.inFlight).length,
      oversizeActive: Boolean(active && activeBytes > maxBytes),
      budgetBlocked: (entries.size > maxEntries || uniqueBytes > maxBytes)
        && ![...entries.values()].some(canEvict),
      owners: Object.freeze(Object.fromEntries(
        [...owners.entries()].sort(([left], [right]) => left.localeCompare(right))
          .map(([owner, value]) => [owner, Object.freeze({ ...value })]),
      )),
      entryStates: Object.freeze([...entries.values()].map((entry) => Object.freeze({
        key: entry.key,
        owner: entry.owner,
        bytes: [...entry.buffers].reduce((sum, buffer) => sum + buffer.byteLength, 0),
        pins: Object.freeze([...entry.pins].sort()),
        inFlight: entry.inFlight,
        active: entry.active,
      }))),
    });
  };

  const dispose = () => {
    if (disposed) return;
    clear('disposed');
    disposed = true;
    notify('disposed');
  };

  return Object.freeze({
    activate,
    clear,
    delete: deleteEntry,
    dispose,
    get,
    getSnapshot,
    has,
    markInFlight,
    peek,
    pin,
    set,
    trackPromise,
    unpin,
  });
}
