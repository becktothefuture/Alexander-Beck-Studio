export const ABOUT_NARRATIVE_WORKER_PROTOCOL_VERSION = 2;
export const ABOUT_NARRATIVE_CORRESPONDENCE_VERSION = 'correspondence-registry-v2.1.0';

export const ABOUT_NARRATIVE_POINT_PROFILES = Object.freeze({
  desktop: Object.freeze({ id: 'desktop', pointCount: 30000, maximumPixelRatio: 1.5 }),
  mobile: Object.freeze({ id: 'mobile', pointCount: 10000, maximumPixelRatio: 1.25 }),
});

export const ABOUT_NARRATIVE_CACHE_LIMITS = Object.freeze({
  shape: Object.freeze({ maxEntries: 8, maxBytes: 4 * 1024 * 1024 }),
  sequence: Object.freeze({ maxEntries: 3, maxBytes: 16 * 1024 * 1024 }),
});

export const ABOUT_NARRATIVE_RETRY_POLICY = Object.freeze({
  delayMs: 1000,
  maximumAutomaticRetries: 1,
});

export const ABOUT_NARRATIVE_PREPARATION_STATES = Object.freeze([
  'idle',
  'preparing',
  'ready',
  'failed',
  'disposed',
]);

export const ABOUT_NARRATIVE_RETRY_CLASSES = Object.freeze({
  none: 'none',
  transient: 'one-shot',
});

export const ABOUT_NARRATIVE_FAILURE_CATEGORIES = Object.freeze({
  validation: Object.freeze({ code: 'validation', retryClass: ABOUT_NARRATIVE_RETRY_CLASSES.none }),
  unsupported: Object.freeze({ code: 'unsupported', retryClass: ABOUT_NARRATIVE_RETRY_CLASSES.none }),
  workerConstruction: Object.freeze({ code: 'worker-construction', retryClass: ABOUT_NARRATIVE_RETRY_CLASSES.transient }),
  workerImport: Object.freeze({ code: 'worker-import', retryClass: ABOUT_NARRATIVE_RETRY_CLASSES.none }),
  workerCrash: Object.freeze({ code: 'worker-crash', retryClass: ABOUT_NARRATIVE_RETRY_CLASSES.transient }),
  workerProtocol: Object.freeze({ code: 'worker-protocol', retryClass: ABOUT_NARRATIVE_RETRY_CLASSES.none }),
  workerTimeout: Object.freeze({ code: 'worker-timeout', retryClass: ABOUT_NARRATIVE_RETRY_CLASSES.transient }),
  transfer: Object.freeze({ code: 'transfer', retryClass: ABOUT_NARRATIVE_RETRY_CLASSES.none }),
  generation: Object.freeze({ code: 'generation', retryClass: ABOUT_NARRATIVE_RETRY_CLASSES.none }),
  asset: Object.freeze({ code: 'asset', retryClass: ABOUT_NARRATIVE_RETRY_CLASSES.none }),
  aborted: Object.freeze({ code: 'aborted', retryClass: ABOUT_NARRATIVE_RETRY_CLASSES.none }),
  contextLoss: Object.freeze({ code: 'context-loss', retryClass: ABOUT_NARRATIVE_RETRY_CLASSES.none }),
  unknown: Object.freeze({ code: 'unknown', retryClass: ABOUT_NARRATIVE_RETRY_CLASSES.none }),
});

export const ABOUT_NARRATIVE_FIXED_ATTRIBUTE_SPECS = Object.freeze([
  Object.freeze({ id: 'position', itemSize: 3, mutable: true }),
  Object.freeze({ id: 'targetPosition', itemSize: 3, mutable: true }),
  Object.freeze({ id: 'pointSeed', itemSize: 1, mutable: false }),
  Object.freeze({ id: 'fromPresence', itemSize: 1, mutable: true }),
  Object.freeze({ id: 'toPresence', itemSize: 1, mutable: true }),
  Object.freeze({ id: 'fromPointSize', itemSize: 1, mutable: true }),
  Object.freeze({ id: 'toPointSize', itemSize: 1, mutable: true }),
  Object.freeze({ id: 'fromFogAnchor', itemSize: 3, mutable: true }),
  Object.freeze({ id: 'toFogAnchor', itemSize: 3, mutable: true }),
]);
