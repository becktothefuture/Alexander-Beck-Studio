import {
  ABOUT_NARRATIVE_FAILURE_CATEGORIES,
  ABOUT_NARRATIVE_RETRY_CLASSES,
  ABOUT_NARRATIVE_RETRY_POLICY,
} from './aboutNarrativeRuntimeConstants.js';
import { createAboutNarrativeRuntimeDiagnostics } from './aboutNarrativeRuntimeDiagnostics.js';

function assertIntent(intent) {
  if (!intent || typeof intent !== 'object') throw new TypeError('Preparation requests need an intent.');
  if (typeof intent.sequenceKey !== 'string' || !intent.sequenceKey) {
    throw new TypeError('Preparation requests need an exact sequenceKey.');
  }
  if (typeof intent.inputFingerprint !== 'string' || !intent.inputFingerprint) {
    throw new TypeError('Preparation requests need an exact inputFingerprint.');
  }
  if (intent.pairId !== undefined && typeof intent.pairId !== 'string') {
    throw new TypeError('Preparation pairId must be a string.');
  }
}

function sameIntent(left, right) {
  return Boolean(left && right)
    && left.sequenceKey === right.sequenceKey
    && left.pairId === right.pairId
    && left.inputFingerprint === right.inputFingerprint;
}

function normalizeFailure(error, classifyFailure) {
  const classified = classifyFailure?.(error) || {};
  const categoryKey = classified.category || error?.category || (error?.name === 'AbortError' ? 'aborted' : 'unknown');
  const category = ABOUT_NARRATIVE_FAILURE_CATEGORIES[categoryKey]
    || Object.values(ABOUT_NARRATIVE_FAILURE_CATEGORIES).find((item) => item.code === categoryKey)
    || ABOUT_NARRATIVE_FAILURE_CATEGORIES.unknown;
  const retryClass = classified.retryClass || error?.retryClass || category.retryClass;
  return Object.freeze({
    category: categoryKey,
    code: classified.code || error?.code || category.code,
    retryClass: retryClass === ABOUT_NARRATIVE_RETRY_CLASSES.transient
      ? ABOUT_NARRATIVE_RETRY_CLASSES.transient
      : ABOUT_NARRATIVE_RETRY_CLASSES.none,
    message: classified.message || error?.publicMessage || error?.message || 'Preparation failed.',
    detail: classified.detail || error?.detail || '',
  });
}

export function createAboutNarrativePreparationController({
  startPreparation,
  validateCandidate = (candidate) => candidate,
  publishReady = () => {},
  classifyFailure = null,
  diagnostics = null,
  timers = globalThis,
  retryPolicy = ABOUT_NARRATIVE_RETRY_POLICY,
} = {}) {
  if (typeof startPreparation !== 'function') throw new TypeError('Preparation controllers need startPreparation().');
  if (typeof validateCandidate !== 'function') throw new TypeError('Preparation controllers need validateCandidate().');
  if (typeof publishReady !== 'function') throw new TypeError('Preparation controllers need publishReady().');
  if (typeof timers?.setTimeout !== 'function' || typeof timers?.clearTimeout !== 'function') {
    throw new TypeError('Preparation controllers need setTimeout and clearTimeout.');
  }

  const ownsDiagnostics = !diagnostics;
  const diagnosticStore = diagnostics || createAboutNarrativeRuntimeDiagnostics({
    initial: {
      state: 'idle',
      sequenceKey: '',
      pairId: '',
      inputFingerprint: '',
      generation: 0,
      attempts: 0,
      automaticRetries: 0,
      retryScheduled: false,
      visible: true,
      lastFailure: null,
    },
  });
  let state = 'idle';
  let currentIntent = null;
  let activeRun = null;
  let retryTimer = null;
  let generation = 0;
  let attempts = 0;
  let automaticRetries = 0;
  let visible = true;
  let disposed = false;
  let readyCandidate = null;

  const record = (type, patch = {}) => diagnosticStore.recordLifecycle(type, {
    state,
    sequenceKey: currentIntent?.sequenceKey || '',
    pairId: currentIntent?.pairId || '',
    inputFingerprint: currentIntent?.inputFingerprint || '',
    generation,
    attempts,
    automaticRetries,
    retryScheduled: retryTimer !== null,
    visible,
    ...patch,
  });

  const clearRetryTimer = () => {
    if (retryTimer === null) return;
    timers.clearTimeout(retryTimer);
    retryTimer = null;
  };

  const invalidateActiveRun = (reason) => {
    generation += 1;
    if (activeRun) {
      activeRun.controller.abort(reason);
      activeRun = null;
    }
  };

  const isCurrentRun = (runGeneration, intent) => !disposed
    && visible
    && activeRun?.generation === runGeneration
    && generation === runGeneration
    && sameIntent(currentIntent, intent);

  const scheduleAutomaticRetry = (failure) => {
    if (!visible
      || failure.retryClass !== ABOUT_NARRATIVE_RETRY_CLASSES.transient
      || automaticRetries >= retryPolicy.maximumAutomaticRetries) return false;
    automaticRetries += 1;
    retryTimer = timers.setTimeout(() => {
      retryTimer = null;
      if (disposed || !visible || state !== 'failed' || !currentIntent) return;
      startRun('automatic-retry');
    }, retryPolicy.delayMs);
    return true;
  };

  const failRun = (runGeneration, intent, error) => {
    if (!isCurrentRun(runGeneration, intent)) return;
    activeRun = null;
    const failure = normalizeFailure(error, classifyFailure);
    if (failure.category === 'aborted') {
      state = 'idle';
      record('preparation-aborted', { lastFailure: null });
      return;
    }
    state = 'failed';
    const retryScheduled = scheduleAutomaticRetry(failure);
    record('preparation-failed', { lastFailure: failure, retryScheduled });
  };

  async function executeRun(runGeneration, intent, trigger, controller) {
    try {
      const candidate = await startPreparation({
        sequenceKey: intent.sequenceKey,
        pairId: intent.pairId,
        inputFingerprint: intent.inputFingerprint,
        input: intent.input,
        generation: runGeneration,
        attempt: attempts,
        trigger,
        signal: controller.signal,
      });
      if (!isCurrentRun(runGeneration, intent)) return;
      const validated = await validateCandidate(candidate, {
        sequenceKey: intent.sequenceKey,
        pairId: intent.pairId,
        inputFingerprint: intent.inputFingerprint,
        generation: runGeneration,
      });
      if (!isCurrentRun(runGeneration, intent)) return;
      await publishReady(validated, {
        sequenceKey: intent.sequenceKey,
        pairId: intent.pairId,
        inputFingerprint: intent.inputFingerprint,
        generation: runGeneration,
      });
      if (!isCurrentRun(runGeneration, intent)) return;
      readyCandidate = validated;
      activeRun = null;
      clearRetryTimer();
      state = 'ready';
      record('preparation-ready', { lastFailure: null, retryScheduled: false });
    } catch (error) {
      failRun(runGeneration, intent, error);
    }
  }

  function startRun(trigger) {
    if (disposed || !visible || !currentIntent || activeRun) return false;
    clearRetryTimer();
    const runGeneration = ++generation;
    const controller = new AbortController();
    const intent = currentIntent;
    attempts += 1;
    state = 'preparing';
    activeRun = { generation: runGeneration, controller, intent };
    record('preparation-started', { trigger, lastFailure: null, retryScheduled: false });
    void executeRun(runGeneration, intent, trigger, controller);
    return true;
  }

  const requestPreparation = (intent, { trigger = 'request' } = {}) => {
    assertIntent(intent);
    if (disposed) return Object.freeze({ accepted: false, reason: 'disposed' });
    const normalized = {
      sequenceKey: intent.sequenceKey,
      pairId: intent.pairId || '',
      inputFingerprint: intent.inputFingerprint,
      input: intent.input,
    };
    if (sameIntent(currentIntent, normalized)) {
      if (state === 'preparing') return Object.freeze({ accepted: true, reason: 'already-preparing', generation });
      if (state === 'ready') return Object.freeze({ accepted: true, reason: 'already-ready', generation });
      if (state === 'failed') return Object.freeze({ accepted: false, reason: 'failed-latched', generation });
    } else {
      clearRetryTimer();
      invalidateActiveRun('superseded');
      currentIntent = normalized;
      readyCandidate = null;
      automaticRetries = 0;
      state = 'idle';
      record('preparation-intent-changed', { lastFailure: null, retryScheduled: false });
    }
    if (!visible) return Object.freeze({ accepted: false, reason: 'hidden', generation });
    return Object.freeze({
      accepted: startRun(trigger),
      reason: 'started',
      generation,
    });
  };

  const retryPreparation = ({ sequenceKey, pairId = '', inputFingerprint } = {}) => {
    if (disposed) return Object.freeze({ accepted: false, reason: 'disposed' });
    const requested = { sequenceKey, pairId, inputFingerprint };
    if (!sameIntent(currentIntent, requested)) {
      return Object.freeze({ accepted: false, reason: 'stale-intent' });
    }
    if (state === 'preparing') return Object.freeze({ accepted: false, reason: 'already-preparing' });
    if (state !== 'failed') return Object.freeze({ accepted: false, reason: 'not-failed' });
    if (!visible) return Object.freeze({ accepted: false, reason: 'hidden' });
    clearRetryTimer();
    automaticRetries = retryPolicy.maximumAutomaticRetries;
    record('preparation-manual-retry', { lastFailure: null, retryScheduled: false });
    return Object.freeze({
      accepted: startRun('manual-retry'),
      reason: 'started',
      generation,
    });
  };

  const setVisible = (nextVisible) => {
    if (disposed) return;
    const next = Boolean(nextVisible);
    if (visible === next) return;
    visible = next;
    if (!visible) {
      clearRetryTimer();
      if (state === 'preparing') {
        invalidateActiveRun('hidden');
        state = 'idle';
      }
    }
    record('preparation-visibility-changed', { retryScheduled: false });
  };

  const cancel = (reason = 'cancelled') => {
    if (disposed) return false;
    clearRetryTimer();
    invalidateActiveRun(reason);
    state = 'idle';
    readyCandidate = null;
    record('preparation-cancelled', { lastFailure: null, retryScheduled: false, reason });
    return true;
  };

  const dispose = () => {
    if (disposed) return;
    clearRetryTimer();
    invalidateActiveRun('disposed');
    state = 'disposed';
    disposed = true;
    record('preparation-disposed', { retryScheduled: false });
    if (ownsDiagnostics) diagnosticStore.dispose({ emit: false });
  };

  return Object.freeze({
    cancel,
    dispose,
    getDiagnosticsSnapshot: diagnosticStore.getSnapshot,
    getReadyCandidate: () => readyCandidate,
    getSnapshot: diagnosticStore.getSnapshot,
    requestPreparation,
    retryPreparation,
    setVisible,
    subscribe: diagnosticStore.subscribe,
  });
}
