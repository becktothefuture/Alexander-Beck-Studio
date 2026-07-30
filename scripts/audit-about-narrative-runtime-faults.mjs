import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.env.ABS_BASE_URL || 'http://localhost:8012';
const outputDir = 'output/playwright/about-narrative-hardening/runtime';
const labUrl = `${baseUrl}/lab/about-narrative.html?edit=1`;
const scenarioResults = [];
const canonicalSource = await readFile('react-app/app/public/config/contents-about.json', 'utf8');
const canonicalDocument = JSON.parse(canonicalSource);
const canonicalHash = createHash('sha256').update(canonicalSource).digest('hex');

const browser = await chromium.launch({
  headless: true,
  args: [
    '--use-gl=angle',
    '--use-angle=swiftshader-webgl',
    '--enable-unsafe-swiftshader',
    '--disable-gpu-sandbox',
  ],
});

function installFaultHarness({ mode }) {
  const NativeWorker = globalThis.Worker;
  const heldEvents = [];
  const events = [];
  const state = {
    mode,
    attempts: 0,
    starts: 0,
    terminations: 0,
    active: 0,
    maxActive: 0,
    faultUsed: false,
    staleDeliveries: 0,
  };

  const record = (type, detail = {}) => {
    events.push({ type, at: performance.now(), ...detail });
    while (events.length > 64) events.shift();
  };

  class AuditedWorker {
    constructor(url, options) {
      const source = String(url);
      if (!source.includes('aboutNarrativeCorrespondence.worker')) {
        return new NativeWorker(url, options);
      }

      state.attempts += 1;
      record('worker-construction-attempt', { attempt: state.attempts });
      if (mode === 'construction-once' && !state.faultUsed) {
        state.faultUsed = true;
        record('fault-injected', { fault: 'construction' });
        throw new Error('Injected correspondence Worker construction failure.');
      }

      this.onmessage = null;
      this.onerror = null;
      this.onmessageerror = null;
      this.terminated = false;
      this.native = new NativeWorker(url, options);
      state.starts += 1;
      state.active += 1;
      state.maxActive = Math.max(state.maxActive, state.active);
      record('worker-started', { start: state.starts });

      this.native.onmessage = (event) => {
        if (mode === 'malformed-publication-once' && !state.faultUsed) {
          state.faultUsed = true;
          event.data.outputs[0].output.positions[0] = Number.NaN;
          record('fault-injected', { fault: 'malformed-publication' });
          this.onmessage?.(event);
          return;
        }

        if (
          (mode === 'hold-success-once' || mode === 'hold-error-once')
          && !state.faultUsed
        ) {
          state.faultUsed = true;
          const messageHandler = this.onmessage;
          const errorHandler = this.onerror;
          heldEvents.push({
            kind: mode === 'hold-success-once' ? 'success' : 'error',
            deliver: () => {
              state.staleDeliveries += 1;
              record('held-event-delivered', { kind: mode === 'hold-success-once' ? 'success' : 'error' });
              if (mode === 'hold-success-once') messageHandler?.(event);
              else errorHandler?.({ message: 'Injected stale correspondence Worker error.' });
            },
          });
          record('fault-injected', { fault: mode });
          return;
        }

        this.onmessage?.(event);
      };
      this.native.onerror = (event) => this.onerror?.(event);
      this.native.onmessageerror = (event) => this.onmessageerror?.(event);
    }

    postMessage(message, transfer) {
      if (mode === 'crash-once' && !state.faultUsed) {
        state.faultUsed = true;
        this.native.terminate();
        record('fault-injected', { fault: 'worker-crash' });
        queueMicrotask(() => this.onerror?.({ message: 'Injected correspondence Worker crash.' }));
        return;
      }
      this.native.postMessage(message, transfer);
    }

    terminate() {
      if (this.terminated) return;
      this.terminated = true;
      this.native.terminate();
      state.active = Math.max(0, state.active - 1);
      state.terminations += 1;
      record('worker-terminated', { termination: state.terminations });
    }
  }

  globalThis.Worker = AuditedWorker;
  globalThis.__aboutNarrativeFaultHarness = {
    releaseHeldEvent() {
      const held = heldEvents.shift();
      held?.deliver();
      return Boolean(held);
    },
    snapshot() {
      return {
        ...state,
        heldEventCount: heldEvents.length,
        events: events.map((event) => ({ ...event })),
      };
    },
  };
}

async function waitForRuntime(page) {
  await page.waitForFunction(() => (
    window.__aboutNarrativeRuntime?.getDiagnosticsSnapshot
    && document.querySelector('.about-narrative-lab')
  ), null, { timeout: 60_000 });
}

async function waitForPreparation(page, state) {
  await page.waitForFunction((expected) => (
    window.__aboutNarrativeRuntime?.getDiagnosticsSnapshot?.().state === expected
  ), state, { timeout: 30_000 });
}

async function waitForHeldEvent(page) {
  await page.waitForFunction(() => (
    window.__aboutNarrativeFaultHarness?.snapshot?.().heldEventCount === 1
  ), null, { timeout: 60_000 });
}

async function snapshot(page) {
  return page.evaluate(() => {
    const runtime = window.__aboutNarrativeRuntime;
    const root = document.querySelector('.about-narrative-lab');
    const semanticCopy = document.querySelector('.about-narrative-content')?.textContent || '';
    return {
      href: window.location.href,
      runtimePresent: Boolean(runtime),
      rootCount: document.querySelectorAll('.about-narrative-lab').length,
      canvasCount: document.querySelectorAll('.about-narrative-world__canvas').length,
      semanticCopyLength: semanticCopy.replace(/\s+/g, ' ').trim().length,
      dataset: root ? { ...root.dataset } : null,
      diagnostics: runtime?.getDiagnosticsSnapshot?.() || null,
      metrics: runtime?.getMetrics?.() || null,
      harness: window.__aboutNarrativeFaultHarness?.snapshot?.() || null,
    };
  });
}

function assertSingleReadableRuntime(value, { ready = true } = {}) {
  assert.equal(value.runtimePresent, true, 'The certification runtime must remain exposed.');
  assert.equal(value.rootCount, 1, 'Exactly one About Narrative root may be mounted.');
  assert.equal(value.canvasCount, 1, 'Exactly one point-world canvas may be mounted.');
  assert.ok(value.semanticCopyLength > 200, 'Semantic editorial copy must remain readable.');
  assert.equal(value.dataset.pointWorldState, 'ready');
  assert.equal(value.metrics.fixedAttributeIdentityStable, true);
  // Schema v6 keeps the nine base point attributes and adds two fixed phase
  // attributes for parametric transition motion.
  assert.equal(value.metrics.fixedAttributeCount, 11);
  assert.ok(value.metrics.drawCalls >= 1, 'The last-known-good field must remain rendered.');
  assert.ok(value.metrics.gpuBufferCount <= 24, 'GPU buffer ownership must remain bounded.');
  assert.ok(value.metrics.cacheEntries <= 8, 'Shape cache ownership must remain bounded.');
  assert.ok(value.metrics.sequenceCacheEntries <= 3, 'Sequence cache ownership must remain bounded.');
  assert.ok(value.harness.maxActive <= 1, 'Only one correspondence Worker may be active at a time.');
  if (ready) {
    assert.equal(value.diagnostics.state, 'ready');
    assert.equal(value.dataset.worldPrepare, 'ready');
  }
}

function hasFailure(snapshotValue, category) {
  return snapshotValue.diagnostics.records.some((record) => (
    record.type === 'preparation-failed'
    && record.lastFailure?.category === category
  ));
}

function assertStablePreparationIdentity(snapshotValue) {
  const preparationRecords = snapshotValue.diagnostics.records.filter((record) => (
    record.type.startsWith('preparation-') && record.sequenceKey
  ));
  assert.equal(new Set(preparationRecords.map((record) => record.sequenceKey)).size, 1);
  assert.equal(new Set(preparationRecords.map((record) => record.pairId)).size, 1);
  assert.equal(new Set(preparationRecords.map((record) => record.inputFingerprint)).size, 1);
  assert.equal(snapshotValue.diagnostics.automaticRetries, 1);
}

function assertRetryCadence(snapshotValue, eventType) {
  const events = snapshotValue.harness.events.filter((event) => event.type === eventType);
  assert.equal(events.length, 2);
  assert.ok(
    events[1].at - events[0].at >= 1_000,
    `${eventType} retried after ${events[1].at - events[0].at}ms instead of at least 1000ms.`,
  );
}

async function createScenarioPage(mode) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(installFaultHarness, { mode });
  await context.route('**/api/about-narrative/config', async (route) => {
    if (route.request().method() !== 'GET') return route.abort();
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { ETag: `"${canonicalHash}"` },
      body: JSON.stringify({ document: canonicalDocument, hash: canonicalHash }),
    });
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push({ type: 'pageerror', message: error.message }));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push({ type: 'console', message: message.text() });
  });
  return { context, page, errors };
}

async function runScenario(name, mode, execute) {
  const { context, page, errors } = await createScenarioPage(mode);
  const evidence = { name, mode, startedAt: new Date().toISOString(), checkpoints: {}, errors };
  try {
    await execute(page, evidence);
    assert.deepEqual(errors, [], `${name} emitted unexpected browser errors.`);
    evidence.status = 'passed';
  } catch (error) {
    evidence.status = 'failed';
    evidence.failure = { name: error.name, message: error.message, stack: error.stack };
  } finally {
    evidence.finishedAt = new Date().toISOString();
    scenarioResults.push(evidence);
    await context.close();
  }
}

await mkdir(outputDir, { recursive: true });

try {
  await runScenario('worker-construction-retry', 'construction-once', async (page, evidence) => {
    await page.goto(labUrl, { waitUntil: 'domcontentloaded' });
    await waitForRuntime(page);
    await waitForPreparation(page, 'ready');
    evidence.checkpoints.recovered = await snapshot(page);
    assertSingleReadableRuntime(evidence.checkpoints.recovered);
    assert.equal(evidence.checkpoints.recovered.harness.faultUsed, true);
    assert.equal(evidence.checkpoints.recovered.harness.attempts, 2);
    assert.equal(evidence.checkpoints.recovered.harness.starts, 1);
    assertStablePreparationIdentity(evidence.checkpoints.recovered);
    assertRetryCadence(evidence.checkpoints.recovered, 'worker-construction-attempt');
    assert.ok(hasFailure(evidence.checkpoints.recovered, 'workerConstruction'));
  });

  await runScenario('worker-crash-retry', 'crash-once', async (page, evidence) => {
    await page.goto(labUrl, { waitUntil: 'domcontentloaded' });
    await waitForRuntime(page);
    await waitForPreparation(page, 'ready');
    evidence.checkpoints.recovered = await snapshot(page);
    assertSingleReadableRuntime(evidence.checkpoints.recovered);
    assert.equal(evidence.checkpoints.recovered.harness.faultUsed, true);
    assert.equal(evidence.checkpoints.recovered.harness.attempts, 2);
    assert.equal(evidence.checkpoints.recovered.harness.starts, 2);
    assertStablePreparationIdentity(evidence.checkpoints.recovered);
    assertRetryCadence(evidence.checkpoints.recovered, 'worker-started');
    assert.ok(hasFailure(evidence.checkpoints.recovered, 'workerCrash'));
  });

  await runScenario('malformed-publication-manual-recovery', 'malformed-publication-once', async (page, evidence) => {
    await page.goto(labUrl, { waitUntil: 'domcontentloaded' });
    await waitForRuntime(page);
    await waitForPreparation(page, 'failed');
    evidence.checkpoints.failed = await snapshot(page);
    assertSingleReadableRuntime(evidence.checkpoints.failed, { ready: false });
    assert.equal(evidence.checkpoints.failed.dataset.worldPrepare, 'failed');
    assert.equal(evidence.checkpoints.failed.diagnostics.lastFailure.category, 'validation');
    assert.equal(evidence.checkpoints.failed.diagnostics.activeSequenceKey, '');

    const retry = await page.evaluate(() => {
      const runtime = window.__aboutNarrativeRuntime;
      const current = runtime.getDiagnosticsSnapshot();
      return runtime.retryPreparation({
        sequenceKey: current.sequenceKey,
        pairId: current.pairId,
        inputFingerprint: current.inputFingerprint,
      });
    });
    assert.equal(retry.accepted, true);
    await waitForPreparation(page, 'ready');
    evidence.checkpoints.recovered = await snapshot(page);
    assertSingleReadableRuntime(evidence.checkpoints.recovered);
    assert.equal(evidence.checkpoints.recovered.metrics.resourceDiagnosticCount, 0);
  });

  await runScenario('hidden-page-cancellation-and-stale-success', 'hold-success-once', async (page, evidence) => {
    await page.goto(labUrl, { waitUntil: 'domcontentloaded' });
    await waitForRuntime(page);
    await waitForHeldEvent(page);
    evidence.checkpoints.preparing = await snapshot(page);
    assert.equal(evidence.checkpoints.preparing.diagnostics.state, 'preparing');

    await page.evaluate(() => {
      globalThis.__aboutNarrativeTestHidden = true;
      Object.defineProperty(document, 'hidden', {
        configurable: true,
        get: () => globalThis.__aboutNarrativeTestHidden,
      });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitForPreparation(page, 'idle');
    assert.equal(await page.evaluate(() => document.hidden), true);
    assert.equal(await page.evaluate(() => window.__aboutNarrativeFaultHarness.releaseHeldEvent()), true);
    await page.waitForTimeout(250);
    evidence.checkpoints.hiddenAfterStaleSuccess = await snapshot(page);
    assert.equal(evidence.checkpoints.hiddenAfterStaleSuccess.diagnostics.state, 'idle');
    assert.equal(evidence.checkpoints.hiddenAfterStaleSuccess.diagnostics.activeSequenceKey, '');
    assert.equal(evidence.checkpoints.hiddenAfterStaleSuccess.harness.staleDeliveries, 1);

    await page.evaluate(() => {
      globalThis.__aboutNarrativeTestHidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await waitForPreparation(page, 'ready');
    evidence.checkpoints.recovered = await snapshot(page);
    assertSingleReadableRuntime(evidence.checkpoints.recovered);
    assert.equal(evidence.checkpoints.recovered.metrics.resourceDiagnosticCount, 0);
  });

  await runScenario('stale-worker-error-ignored', 'hold-error-once', async (page, evidence) => {
    await page.goto(labUrl, { waitUntil: 'domcontentloaded' });
    await waitForRuntime(page);
    await waitForHeldEvent(page);
    await page.evaluate(() => window.__aboutNarrativeRuntime.setVisible(false));
    await waitForPreparation(page, 'idle');
    await page.evaluate(() => window.__aboutNarrativeRuntime.setVisible(true));
    await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
    await waitForPreparation(page, 'ready');
    evidence.checkpoints.beforeStaleError = await snapshot(page);
    const activeSequenceKey = evidence.checkpoints.beforeStaleError.diagnostics.activeSequenceKey;
    const installCount = evidence.checkpoints.beforeStaleError.diagnostics.metrics.installCount;
    assert.equal(await page.evaluate(() => window.__aboutNarrativeFaultHarness.releaseHeldEvent()), true);
    await page.waitForTimeout(100);
    evidence.checkpoints.afterStaleError = await snapshot(page);
    assertSingleReadableRuntime(evidence.checkpoints.afterStaleError);
    assert.equal(evidence.checkpoints.afterStaleError.diagnostics.activeSequenceKey, activeSequenceKey);
    assert.equal(evidence.checkpoints.afterStaleError.diagnostics.metrics.installCount, installCount);
    assert.equal(evidence.checkpoints.afterStaleError.harness.staleDeliveries, 1);
  });

  await runScenario('unmount-during-preparation', 'hold-success-once', async (page, evidence) => {
    await page.goto(labUrl, { waitUntil: 'domcontentloaded' });
    await waitForRuntime(page);
    await waitForHeldEvent(page);
    evidence.checkpoints.preparing = await snapshot(page);
    await page.evaluate(() => document.querySelector('[data-route-tab="contact"]')?.click());
    await page.waitForFunction(() => (
      window.location.pathname.endsWith('/contact.html')
      && !window.__aboutNarrativeRuntime
      && !document.querySelector('.about-narrative-lab')
    ), null, { timeout: 30_000 });
    evidence.checkpoints.unmounted = await page.evaluate(() => ({
      href: window.location.href,
      runtimePresent: Boolean(window.__aboutNarrativeRuntime),
      rootCount: document.querySelectorAll('.about-narrative-lab').length,
      canvasCount: document.querySelectorAll('.about-narrative-world__canvas').length,
      harness: window.__aboutNarrativeFaultHarness.snapshot(),
    }));
    assert.equal(evidence.checkpoints.unmounted.runtimePresent, false);
    assert.equal(evidence.checkpoints.unmounted.rootCount, 0);
    assert.equal(evidence.checkpoints.unmounted.canvasCount, 0);
    assert.equal(evidence.checkpoints.unmounted.harness.active, 0);
    assert.ok(evidence.checkpoints.unmounted.harness.terminations >= 1);

    await page.goto(labUrl, { waitUntil: 'domcontentloaded' });
    await waitForRuntime(page);
    await waitForPreparation(page, 'ready');
    evidence.checkpoints.remounted = await snapshot(page);
    assertSingleReadableRuntime(evidence.checkpoints.remounted);
  });

  await runScenario('webgl-context-loss-and-restoration', 'none', async (page, evidence) => {
    await page.goto(labUrl, { waitUntil: 'domcontentloaded' });
    await waitForRuntime(page);
    await waitForPreparation(page, 'ready');
    evidence.checkpoints.beforeLoss = await snapshot(page);
    assertSingleReadableRuntime(evidence.checkpoints.beforeLoss);

    const supported = await page.evaluate(() => {
      const canvas = document.querySelector('.about-narrative-world__canvas');
      const context = canvas?.getContext('webgl2');
      const extension = context?.getExtension('WEBGL_lose_context');
      if (!extension) return false;
      globalThis.__aboutNarrativeContextLossExtension = extension;
      extension.loseContext();
      return true;
    });
    assert.equal(supported, true, 'WEBGL_lose_context must be available in the certification browser.');
    await page.waitForFunction(() => (
      document.querySelector('.about-narrative-lab')?.dataset.pointWorldState === 'context-lost'
    ));
    evidence.checkpoints.lost = await snapshot(page);
    assert.equal(evidence.checkpoints.lost.dataset.pointWorldState, 'context-lost');
    assert.ok(evidence.checkpoints.lost.semanticCopyLength > 200);
    assert.ok(evidence.checkpoints.lost.diagnostics.records.some((record) => record.type === 'context-lost'));

    await page.evaluate(() => globalThis.__aboutNarrativeContextLossExtension.restoreContext());
    await page.waitForFunction(() => {
      const runtime = window.__aboutNarrativeRuntime;
      const root = document.querySelector('.about-narrative-lab');
      return root?.dataset.pointWorldState === 'ready'
        && runtime?.getDiagnosticsSnapshot?.().records.some((record) => record.type === 'context-restored');
    }, null, { timeout: 60_000 });
    await page.waitForTimeout(250);
    evidence.checkpoints.restored = await snapshot(page);
    assertSingleReadableRuntime(evidence.checkpoints.restored);
    assert.equal(evidence.checkpoints.restored.metrics.resourceDiagnosticCount, 0);
    assert.ok(
      evidence.checkpoints.restored.metrics.gpuBufferCount
        <= evidence.checkpoints.beforeLoss.metrics.gpuBufferCount + 9,
      'Context restoration must not create an unbounded second GPU allocation set.',
    );
  });
} finally {
  await browser.close();
}

const evidence = {
  baseUrl,
  labUrl,
  recordedAt: new Date().toISOString(),
  summary: {
    passed: scenarioResults.filter((result) => result.status === 'passed').length,
    failed: scenarioResults.filter((result) => result.status === 'failed').length,
    total: scenarioResults.length,
  },
  scenarios: scenarioResults,
};

await writeFile(
  `${outputDir}/runtime-fault-matrix.json`,
  `${JSON.stringify(evidence, null, 2)}\n`,
);

const failures = scenarioResults.filter((result) => result.status === 'failed');
if (failures.length) {
  failures.forEach((failure) => console.error(`FAIL: ${failure.name}: ${failure.failure.message}`));
  throw new Error(`${failures.length} About Narrative runtime fault scenario(s) failed.`);
}

console.log(`PASS: ${scenarioResults.length} About Narrative runtime fault and recovery scenarios.`);
