function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function validateOwnerId(ownerId) {
  if (typeof ownerId !== 'string' || !ownerId.length || ownerId.length > 128) {
    throw new TypeError('Resource ledger owner IDs must be non-empty bounded strings.');
  }
}

function validateGpuId(bufferId) {
  if (typeof bufferId !== 'string' || !bufferId.length || bufferId.length > 256) {
    throw new TypeError('Resource ledger GPU buffer IDs must be non-empty bounded strings.');
  }
}

function validateByteLength(byteLength, label = 'GPU buffer bytes') {
  if (!Number.isSafeInteger(byteLength) || byteLength < 0) {
    throw new TypeError(`${label} must be a non-negative safe integer.`);
  }
}

function getTypedSourceByteLength(source, sourceOffset = 0, sourceLength) {
  if (source === null || source === undefined) return 0;
  if (typeof source === 'number') {
    validateByteLength(source);
    return source;
  }
  if (source instanceof ArrayBuffer) return source.byteLength;
  if (!ArrayBuffer.isView(source)) return null;

  const bytesPerElement = source instanceof DataView ? 1 : source.BYTES_PER_ELEMENT;
  const offset = Number(sourceOffset) || 0;
  const availableElements = source instanceof DataView
    ? source.byteLength
    : source.length;
  const length = sourceLength === undefined
    ? availableElements - offset
    : Number(sourceLength);
  if (!Number.isSafeInteger(offset) || offset < 0
    || !Number.isSafeInteger(length) || length < 0
    || offset + length > availableElements) return null;
  return length * bytesPerElement;
}

export function collectAboutNarrativeArrayBuffers(value, {
  maxNodes = 10000,
} = {}) {
  const buffers = new Set();
  const seen = new WeakSet();
  let nodes = 0;

  const visit = (current) => {
    if (current === null || current === undefined) return;
    if (current instanceof ArrayBuffer) {
      buffers.add(current);
      return;
    }
    if (ArrayBuffer.isView(current)) {
      if (current.buffer instanceof ArrayBuffer) buffers.add(current.buffer);
      return;
    }
    if (typeof current !== 'object' || seen.has(current)) return;
    seen.add(current);
    nodes += 1;
    if (nodes > maxNodes) throw new Error('Resource ledger value graph exceeds its bounded traversal budget.');
    if (Array.isArray(current)) {
      current.forEach(visit);
      return;
    }
    if (current instanceof Map) {
      current.forEach((item, key) => {
        visit(key);
        visit(item);
      });
      return;
    }
    if (current instanceof Set) {
      current.forEach(visit);
      return;
    }
    if (isPlainObject(current)) Object.values(current).forEach(visit);
  };

  visit(value);
  return buffers;
}

function freezeSnapshot(snapshot) {
  snapshot.owners.forEach(Object.freeze);
  snapshot.diagnostics.items.forEach(Object.freeze);
  Object.freeze(snapshot.buffers);
  Object.freeze(snapshot.gpu);
  Object.freeze(snapshot.diagnostics.items);
  Object.freeze(snapshot.diagnostics);
  Object.freeze(snapshot.owners);
  return Object.freeze(snapshot);
}

export function createAboutNarrativeResourceLedger({
  enabled = true,
  strict = true,
  owners = [],
} = {}) {
  const ownerRecords = new Map();
  const bufferRecords = new WeakMap();
  const gpuRecords = new Map();
  const diagnostics = [];
  let disposed = false;
  let uniqueBufferCount = 0;
  let uniqueBufferBytes = 0;
  let peakUniqueBufferCount = 0;
  let peakUniqueBufferBytes = 0;
  let retainCount = 0;
  let releaseCount = 0;
  let gpuCreateCount = 0;
  let gpuDeleteCount = 0;
  let gpuCreatedBytes = 0;
  let gpuDeletedBytes = 0;
  let liveGpuBytes = 0;
  let peakLiveGpuCount = 0;
  let peakLiveGpuBytes = 0;
  let gpuAllocationCount = 0;
  let gpuReallocationCount = 0;
  let gpuAllocatedBytes = 0;
  let gpuReallocatedBytes = 0;
  let gpuUploadCount = 0;
  let gpuUploadedBytes = 0;
  let revision = 0;
  let cachedSnapshot = null;
  let cachedSnapshotLabel = null;

  const touch = () => {
    revision += 1;
    cachedSnapshot = null;
    cachedSnapshotLabel = null;
  };

  const ensureActive = () => {
    if (disposed) throw new Error('The About narrative resource ledger has been disposed.');
  };

  const report = (code, message, details = {}, shouldThrow = strict) => {
    const diagnostic = Object.freeze({
      code,
      message,
      details: Object.freeze({ ...details }),
    });
    diagnostics.push(diagnostic);
    touch();
    if (shouldThrow) throw new Error(message);
    return false;
  };

  const getOwner = (ownerId) => {
    validateOwnerId(ownerId);
    const owner = ownerRecords.get(ownerId);
    if (!owner) {
      report('unknown-owner', `Resource ledger owner ${ownerId} is not registered.`, { ownerId });
      return null;
    }
    return owner;
  };

  const registerOwner = (ownerId, {
    kind = 'runtime',
    label = ownerId,
  } = {}) => {
    ensureActive();
    validateOwnerId(ownerId);
    if (ownerRecords.has(ownerId)) {
      report('duplicate-owner', `Resource ledger owner ${ownerId} is already registered.`, { ownerId });
      return false;
    }
    ownerRecords.set(ownerId, {
      id: ownerId,
      kind: String(kind),
      label: String(label),
      links: new Set(),
      attributedBytes: 0,
      retains: 0,
      releases: 0,
    });
    touch();
    return true;
  };

  const removeLink = (owner, link) => {
    if (!owner.links.delete(link)) return false;
    const record = link.record;
    record.owners.delete(owner.id);
    owner.attributedBytes -= record.byteLength;
    owner.releases += 1;
    releaseCount += 1;
    if (!record.owners.size) {
      uniqueBufferCount -= 1;
      uniqueBufferBytes -= record.byteLength;
      const buffer = link.ref.deref();
      if (buffer) bufferRecords.delete(buffer);
    }
    touch();
    return true;
  };

  const retain = (ownerId, value) => {
    ensureActive();
    if (!enabled) return 0;
    const owner = getOwner(ownerId);
    if (!owner) return 0;
    const buffers = collectAboutNarrativeArrayBuffers(value);
    let retained = 0;
    buffers.forEach((buffer) => {
      let record = bufferRecords.get(buffer);
      if (!record) {
        record = {
          byteLength: buffer.byteLength,
          owners: new Map(),
        };
        bufferRecords.set(buffer, record);
      }
      if (record.owners.has(ownerId)) return;
      const link = {
        record,
        ref: new globalThis.WeakRef(buffer),
      };
      if (!record.owners.size) {
        uniqueBufferCount += 1;
        uniqueBufferBytes += record.byteLength;
      }
      record.owners.set(ownerId, link);
      owner.links.add(link);
      owner.attributedBytes += record.byteLength;
      owner.retains += 1;
      retainCount += 1;
      retained += 1;
    });
    peakUniqueBufferCount = Math.max(peakUniqueBufferCount, uniqueBufferCount);
    peakUniqueBufferBytes = Math.max(peakUniqueBufferBytes, uniqueBufferBytes);
    if (retained) touch();
    return retained;
  };

  const release = (ownerId, value) => {
    ensureActive();
    if (!enabled) return 0;
    const owner = getOwner(ownerId);
    if (!owner) return 0;
    const buffers = collectAboutNarrativeArrayBuffers(value);
    let released = 0;
    buffers.forEach((buffer) => {
      const record = bufferRecords.get(buffer);
      const link = record?.owners.get(ownerId);
      if (!record || !link) {
        report('unregistered-release', `Resource ledger owner ${ownerId} released an unregistered buffer.`, { ownerId });
        return;
      }
      if (removeLink(owner, link)) released += 1;
    });
    return released;
  };

  const releaseOwner = (ownerId) => {
    ensureActive();
    if (!enabled) return 0;
    const owner = getOwner(ownerId);
    if (!owner) return 0;
    let released = 0;
    [...owner.links].forEach((link) => {
      if (removeLink(owner, link)) released += 1;
    });
    return released;
  };

  const unregisterOwner = (ownerId) => {
    ensureActive();
    const owner = getOwner(ownerId);
    if (!owner) return false;
    releaseOwner(ownerId);
    ownerRecords.delete(ownerId);
    touch();
    return true;
  };

  const recordGpuBufferCreate = ({
    id,
    byteLength,
    ownerId,
  }) => {
    ensureActive();
    if (!enabled) return false;
    validateGpuId(id);
    const owner = getOwner(ownerId);
    if (!owner) return false;
    validateByteLength(byteLength);
    if (gpuRecords.has(id)) {
      report('duplicate-gpu-buffer', `GPU buffer ${id} was registered twice.`, { id, ownerId });
      return false;
    }
    gpuRecords.set(id, {
      id,
      byteLength,
      ownerId,
      allocationCount: byteLength > 0 ? 1 : 0,
    });
    gpuCreateCount += 1;
    gpuCreatedBytes += byteLength;
    if (byteLength > 0) {
      gpuAllocationCount += 1;
      gpuAllocatedBytes += byteLength;
    }
    liveGpuBytes += byteLength;
    peakLiveGpuCount = Math.max(peakLiveGpuCount, gpuRecords.size);
    peakLiveGpuBytes = Math.max(peakLiveGpuBytes, liveGpuBytes);
    touch();
    return true;
  };

  const recordGpuBufferAllocation = (id, byteLength) => {
    ensureActive();
    if (!enabled) return false;
    validateGpuId(id);
    validateByteLength(byteLength);
    const record = gpuRecords.get(id);
    if (!record) {
      report('unknown-gpu-buffer', `GPU buffer ${id} was allocated without a matching create.`, { id });
      return false;
    }
    const previousByteLength = record.byteLength;
    if (record.allocationCount > 0) {
      gpuReallocationCount += 1;
      gpuReallocatedBytes += byteLength;
    }
    record.allocationCount += 1;
    record.byteLength = byteLength;
    gpuAllocationCount += 1;
    gpuAllocatedBytes += byteLength;
    liveGpuBytes += byteLength - previousByteLength;
    peakLiveGpuBytes = Math.max(peakLiveGpuBytes, liveGpuBytes);
    touch();
    return true;
  };

  const recordGpuBufferUpload = (id, {
    byteLength,
    destinationOffset = 0,
  } = {}) => {
    ensureActive();
    if (!enabled) return false;
    validateGpuId(id);
    validateByteLength(byteLength, 'GPU upload bytes');
    validateByteLength(destinationOffset, 'GPU upload destination offset');
    const record = gpuRecords.get(id);
    if (!record) {
      report('unknown-gpu-buffer', `GPU buffer ${id} received an upload without a matching create.`, { id });
      return false;
    }
    gpuUploadCount += 1;
    gpuUploadedBytes += byteLength;
    if (destinationOffset + byteLength > record.byteLength) {
      report('gpu-upload-overflow', `GPU buffer ${id} received an upload beyond its observed allocation.`, {
        id,
        byteLength,
        destinationOffset,
        allocatedBytes: record.byteLength,
      }, false);
    } else {
      touch();
    }
    return true;
  };

  const recordGpuBufferDelete = (id) => {
    ensureActive();
    if (!enabled) return false;
    validateGpuId(id);
    const record = gpuRecords.get(id);
    if (!record) {
      report('unknown-gpu-buffer', `GPU buffer ${id} was deleted without a matching create.`, { id });
      return false;
    }
    gpuRecords.delete(id);
    gpuDeleteCount += 1;
    gpuDeletedBytes += record.byteLength;
    liveGpuBytes -= record.byteLength;
    touch();
    return true;
  };

  const getSnapshot = (label = '') => {
    const normalizedLabel = String(label);
    if (cachedSnapshot && cachedSnapshotLabel === normalizedLabel) return cachedSnapshot;
    cachedSnapshotLabel = normalizedLabel;
    cachedSnapshot = freezeSnapshot({
    label: String(label),
    revision,
    enabled,
    disposed,
    buffers: {
      uniqueCount: uniqueBufferCount,
      uniqueBytes: uniqueBufferBytes,
      peakUniqueCount: peakUniqueBufferCount,
      peakUniqueBytes: peakUniqueBufferBytes,
      retains: retainCount,
      releases: releaseCount,
    },
    gpu: {
      created: gpuCreateCount,
      deleted: gpuDeleteCount,
      createdBytes: gpuCreatedBytes,
      deletedBytes: gpuDeletedBytes,
      liveCount: gpuRecords.size,
      liveBytes: liveGpuBytes,
      peakLiveCount: peakLiveGpuCount,
      peakLiveBytes: peakLiveGpuBytes,
      allocations: gpuAllocationCount,
      reallocations: gpuReallocationCount,
      allocatedBytes: gpuAllocatedBytes,
      reallocatedBytes: gpuReallocatedBytes,
      uploads: gpuUploadCount,
      uploadedBytes: gpuUploadedBytes,
    },
    owners: [...ownerRecords.values()]
      .map((owner) => ({
        id: owner.id,
        kind: owner.kind,
        label: owner.label,
        bufferCount: owner.links.size,
        attributedBytes: owner.attributedBytes,
        retains: owner.retains,
        releases: owner.releases,
      }))
      .sort((a, b) => a.id.localeCompare(b.id)),
    diagnostics: {
      count: diagnostics.length,
      items: [...diagnostics],
    },
    });
    return cachedSnapshot;
  };

  const assertNoGrowth = (baseline, {
    buffers = true,
    gpu = true,
  } = {}) => {
    ensureActive();
    if (!baseline?.buffers || !baseline?.gpu) throw new TypeError('Resource ledger growth checks need a valid snapshot.');
    const current = getSnapshot('growth-check');
    if (buffers && (current.buffers.uniqueCount > baseline.buffers.uniqueCount
      || current.buffers.uniqueBytes > baseline.buffers.uniqueBytes)) {
      report('buffer-growth', 'Generated ArrayBuffer ownership grew beyond the baseline.', {
        baselineCount: baseline.buffers.uniqueCount,
        currentCount: current.buffers.uniqueCount,
        baselineBytes: baseline.buffers.uniqueBytes,
        currentBytes: current.buffers.uniqueBytes,
      });
      return false;
    }
    if (gpu && (current.gpu.liveCount > baseline.gpu.liveCount
      || current.gpu.liveBytes > baseline.gpu.liveBytes)) {
      report('gpu-growth', 'Live GPU buffer ownership grew beyond the baseline.', {
        baselineCount: baseline.gpu.liveCount,
        currentCount: current.gpu.liveCount,
        baselineBytes: baseline.gpu.liveBytes,
        currentBytes: current.gpu.liveBytes,
      });
      return false;
    }
    return true;
  };

  const assertMatches = (baseline) => {
    ensureActive();
    if (!baseline?.buffers || !baseline?.gpu) throw new TypeError('Resource ledger balance checks need a valid snapshot.');
    const current = getSnapshot('balance-check');
    const matches = current.buffers.uniqueCount === baseline.buffers.uniqueCount
      && current.buffers.uniqueBytes === baseline.buffers.uniqueBytes
      && current.gpu.liveCount === baseline.gpu.liveCount
      && current.gpu.liveBytes === baseline.gpu.liveBytes;
    if (!matches) {
      report('resource-imbalance', 'Resource ledger state did not return to its baseline.', {
        baselineBuffers: baseline.buffers.uniqueCount,
        currentBuffers: current.buffers.uniqueCount,
        baselineGpu: baseline.gpu.liveCount,
        currentGpu: current.gpu.liveCount,
      });
      return false;
    }
    return true;
  };

  const auditRetainers = (retainers) => {
    ensureActive();
    if (!Array.isArray(retainers)) throw new TypeError('Resource retainer audits need an array.');
    let valid = true;
    retainers.forEach(({ ownerId, value }, index) => {
      const owner = ownerRecords.get(ownerId);
      if (!owner) {
        valid = report('unknown-retainer', `Observed retainer ${ownerId || index} is not registered.`, { ownerId, index }, false) && valid;
        return;
      }
      collectAboutNarrativeArrayBuffers(value).forEach((buffer) => {
        const record = bufferRecords.get(buffer);
        if (!record?.owners.has(ownerId)) {
          valid = report('untracked-retainer', `Owner ${ownerId} retains an untracked generated buffer.`, { ownerId, index }, false) && valid;
        }
      });
    });
    if (!valid && strict) throw new Error('Resource ledger retainer audit failed.');
    return valid;
  };

  const dispose = () => {
    if (disposed) return getSnapshot('already-disposed');
    [...ownerRecords.keys()].forEach((ownerId) => releaseOwner(ownerId));
    if (gpuRecords.size) {
      report('live-gpu-at-dispose', 'The resource ledger was disposed with live GPU buffers.', {
        liveCount: gpuRecords.size,
        liveBytes: liveGpuBytes,
      }, false);
    }
    const finalSnapshot = getSnapshot('dispose');
    gpuRecords.clear();
    liveGpuBytes = 0;
    ownerRecords.clear();
    disposed = true;
    touch();
    return finalSnapshot;
  };

  owners.forEach((owner) => {
    if (typeof owner === 'string') registerOwner(owner);
    else registerOwner(owner.id, owner);
  });

  return Object.freeze({
    registerOwner,
    unregisterOwner,
    retain,
    release,
    releaseOwner,
    recordGpuBufferCreate,
    recordGpuBufferAllocation,
    recordGpuBufferUpload,
    recordGpuBufferDelete,
    getSnapshot,
    assertNoGrowth,
    assertMatches,
    auditRetainers,
    dispose,
  });
}

const instrumentedWebGlContexts = new WeakMap();

function freezeWebGlSnapshot(snapshot) {
  snapshot.diagnostics.forEach(Object.freeze);
  Object.freeze(snapshot.diagnostics);
  return Object.freeze(snapshot);
}

/**
 * Certification-only observation for the actual WebGL buffer lifecycle.
 * Install this on a raw context before giving that context to Three.js.
 */
export function instrumentAboutNarrativeWebGLContext({
  context,
  ledger,
  ownerId,
  idPrefix = 'about-point-world',
} = {}) {
  if (!context || (typeof context !== 'object' && typeof context !== 'function')) {
    throw new TypeError('WebGL instrumentation needs a context object.');
  }
  if (!ledger
    || typeof ledger.recordGpuBufferCreate !== 'function'
    || typeof ledger.recordGpuBufferAllocation !== 'function'
    || typeof ledger.recordGpuBufferUpload !== 'function'
    || typeof ledger.recordGpuBufferDelete !== 'function') {
    throw new TypeError('WebGL instrumentation needs a compatible resource ledger.');
  }
  validateOwnerId(ownerId);
  const prefix = String(idPrefix);
  validateGpuId(`${prefix}:e1:b1`);
  if (instrumentedWebGlContexts.has(context)) {
    throw new Error('This WebGL context is already instrumented.');
  }

  const liveBuffers = new Map();
  const retiredBuffers = new WeakSet();
  const boundBuffers = new Map();
  const diagnostics = [];
  const restorers = [];
  let disposed = false;
  let revision = 0;
  let epoch = 1;
  let serial = 0;
  let createCount = 0;
  let deleteCount = 0;
  let implicitDeleteCount = 0;
  let allocationCount = 0;
  let reallocationCount = 0;
  let uploadCount = 0;
  let uploadedBytes = 0;
  let uploadSubmissionDurationMs = 0;
  let maxUploadSubmissionDurationMs = 0;
  let unobservedDeleteCount = 0;
  let unboundMutationCount = 0;
  let contextLossCount = 0;
  let contextRestoreCount = 0;
  let awaitingRestore = false;
  let cachedSnapshot = null;

  const touch = () => {
    revision += 1;
    cachedSnapshot = null;
  };

  const report = (code, message, details = {}) => {
    diagnostics.push({
      code,
      message,
      details: Object.freeze({ ...details }),
    });
    touch();
  };

  const observeLedger = (operation, code, details) => {
    try {
      return operation();
    } catch (error) {
      report(code, error?.message || String(error), details);
      return false;
    }
  };

  const installMethod = (name, wrapperFactory) => {
    const original = context[name];
    if (typeof original !== 'function') {
      throw new TypeError(`WebGL instrumentation requires context.${name}().`);
    }
    const hadOwn = Object.prototype.hasOwnProperty.call(context, name);
    const ownDescriptor = hadOwn ? Object.getOwnPropertyDescriptor(context, name) : null;
    const wrapper = wrapperFactory(original);
    if (!Reflect.defineProperty(context, name, {
      configurable: true,
      enumerable: ownDescriptor?.enumerable ?? false,
      writable: true,
      value: wrapper,
    })) {
      throw new Error(`WebGL instrumentation could not wrap context.${name}().`);
    }
    restorers.push(() => {
      if (context[name] !== wrapper) return;
      if (hadOwn) Reflect.defineProperty(context, name, ownDescriptor);
      else Reflect.deleteProperty(context, name);
    });
  };

  const getRecordForTarget = (target, operation) => {
    const buffer = boundBuffers.get(target);
    const record = buffer ? liveBuffers.get(buffer) : null;
    if (!record) {
      unboundMutationCount += 1;
      report('unobserved-buffer-mutation', `${operation} targeted a buffer that was not created by this instrumentation.`, {
        target,
      });
      return null;
    }
    return record;
  };

  const clearBufferBindings = (buffer) => {
    boundBuffers.forEach((bound, target) => {
      if (bound === buffer) boundBuffers.delete(target);
    });
  };

  const invalidateContextEpoch = (reason = 'context-reset') => {
    if (disposed) return false;
    liveBuffers.forEach((record) => {
      observeLedger(
        () => ledger.recordGpuBufferDelete(record.id),
        'ledger-context-delete-failed',
        { id: record.id, reason },
      );
      implicitDeleteCount += 1;
    });
    liveBuffers.forEach((record, buffer) => {
      if (buffer && typeof buffer === 'object') retiredBuffers.add(buffer);
    });
    liveBuffers.clear();
    boundBuffers.clear();
    epoch += 1;
    touch();
    return true;
  };

  try {
    installMethod('createBuffer', (original) => function instrumentedCreateBuffer(...args) {
      const buffer = Reflect.apply(original, context, args);
      if (!buffer) return buffer;
      const id = `${prefix}:e${epoch}:b${serial += 1}`;
      const record = { id, byteLength: 0, allocations: 0 };
      liveBuffers.set(buffer, record);
      createCount += 1;
      observeLedger(
        () => ledger.recordGpuBufferCreate({ id, byteLength: 0, ownerId }),
        'ledger-create-failed',
        { id },
      );
      touch();
      return buffer;
    });

    installMethod('deleteBuffer', (original) => function instrumentedDeleteBuffer(buffer) {
      const result = Reflect.apply(original, context, [buffer]);
      if (!buffer) return result;
      const record = liveBuffers.get(buffer);
      if (!record) {
        if (typeof buffer === 'object' && retiredBuffers.has(buffer)) return result;
        unobservedDeleteCount += 1;
        report('unobserved-buffer-delete', 'deleteBuffer received a buffer created before instrumentation or already deleted.', {});
        return result;
      }
      liveBuffers.delete(buffer);
      if (typeof buffer === 'object') retiredBuffers.add(buffer);
      clearBufferBindings(buffer);
      deleteCount += 1;
      observeLedger(
        () => ledger.recordGpuBufferDelete(record.id),
        'ledger-delete-failed',
        { id: record.id },
      );
      touch();
      return result;
    });

    installMethod('bindBuffer', (original) => function instrumentedBindBuffer(target, buffer) {
      const result = Reflect.apply(original, context, [target, buffer]);
      if (buffer) boundBuffers.set(target, buffer);
      else boundBuffers.delete(target);
      return result;
    });

    installMethod('bufferData', (original) => function instrumentedBufferData(...args) {
      const result = Reflect.apply(original, context, args);
      const [target, source, , sourceOffset, sourceLength] = args;
      const record = getRecordForTarget(target, 'bufferData');
      if (!record) return result;
      const byteLength = getTypedSourceByteLength(source, sourceOffset, sourceLength);
      if (byteLength === null) {
        report('unobserved-buffer-size', 'bufferData used an unsupported source whose byte length could not be observed.', {
          id: record.id,
          target,
        });
        return result;
      }
      if (record.allocations > 0) reallocationCount += 1;
      record.allocations += 1;
      record.byteLength = byteLength;
      allocationCount += 1;
      observeLedger(
        () => ledger.recordGpuBufferAllocation(record.id, byteLength),
        'ledger-allocation-failed',
        { id: record.id, byteLength },
      );
      touch();
      return result;
    });

    installMethod('bufferSubData', (original) => function instrumentedBufferSubData(...args) {
      const submissionStartedAt = performance.now();
      const result = Reflect.apply(original, context, args);
      const submissionDurationMs = performance.now() - submissionStartedAt;
      const [target, destinationOffset, source, sourceOffset, sourceLength] = args;
      const record = getRecordForTarget(target, 'bufferSubData');
      if (!record) return result;
      const byteLength = getTypedSourceByteLength(source, sourceOffset, sourceLength);
      if (byteLength === null || !Number.isSafeInteger(destinationOffset) || destinationOffset < 0) {
        report('unobserved-upload-size', 'bufferSubData used unsupported source or destination bounds.', {
          id: record.id,
          target,
        });
        return result;
      }
      uploadCount += 1;
      uploadedBytes += byteLength;
      uploadSubmissionDurationMs += submissionDurationMs;
      maxUploadSubmissionDurationMs = Math.max(
        maxUploadSubmissionDurationMs,
        submissionDurationMs,
      );
      observeLedger(
        () => ledger.recordGpuBufferUpload(record.id, { byteLength, destinationOffset }),
        'ledger-upload-failed',
        { id: record.id, byteLength, destinationOffset },
      );
      touch();
      return result;
    });
  } catch (error) {
    [...restorers].reverse().forEach((restore) => restore());
    throw error;
  }

  const handleContextLost = () => {
    contextLossCount += 1;
    awaitingRestore = true;
    invalidateContextEpoch('webgl-context-lost');
  };
  const handleContextRestored = () => {
    contextRestoreCount += 1;
    if (!awaitingRestore) invalidateContextEpoch('webgl-context-restored-without-loss');
    awaitingRestore = false;
    touch();
  };
  const canvas = context.canvas;
  if (typeof canvas?.addEventListener === 'function') {
    canvas.addEventListener('webglcontextlost', handleContextLost);
    canvas.addEventListener('webglcontextrestored', handleContextRestored);
  }

  const getSnapshot = () => {
    if (cachedSnapshot) return cachedSnapshot;
    let liveBytes = 0;
    liveBuffers.forEach((record) => { liveBytes += record.byteLength; });
    cachedSnapshot = freezeWebGlSnapshot({
      revision,
      disposed,
      epoch,
      created: createCount,
      deleted: deleteCount,
      implicitDeletes: implicitDeleteCount,
      allocations: allocationCount,
      reallocations: reallocationCount,
      uploads: uploadCount,
      uploadedBytes,
      uploadSubmissionDurationMs,
      maxUploadSubmissionDurationMs,
      liveCount: liveBuffers.size,
      liveBytes,
      unobservedDeletes: unobservedDeleteCount,
      unboundMutations: unboundMutationCount,
      contextLosses: contextLossCount,
      contextRestores: contextRestoreCount,
      diagnostics: [...diagnostics],
    });
    return cachedSnapshot;
  };

  const dispose = () => {
    if (disposed) return getSnapshot();
    if (liveBuffers.size) {
      report('live-webgl-buffers-at-detach', 'WebGL instrumentation detached while observed buffers were still live.', {
        liveCount: liveBuffers.size,
      });
    }
    if (typeof canvas?.removeEventListener === 'function') {
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      canvas.removeEventListener('webglcontextrestored', handleContextRestored);
    }
    [...restorers].reverse().forEach((restore) => restore());
    instrumentedWebGlContexts.delete(context);
    disposed = true;
    touch();
    return getSnapshot();
  };

  const instrumentation = Object.freeze({
    getSnapshot,
    invalidateContextEpoch,
    dispose,
  });
  instrumentedWebGlContexts.set(context, instrumentation);
  return instrumentation;
}
