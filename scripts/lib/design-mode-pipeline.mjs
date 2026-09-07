import { createHash } from 'node:crypto';
import { readFile, realpath } from 'node:fs/promises';
import { isAbsolute, relative, resolve } from 'node:path';
import { isDeepStrictEqual } from 'node:util';

export const PIPELINE_VERSION = '0.1.0';
const hash = (value) => createHash('sha256').update(value).digest('hex');
const own = (value, key) => Object.prototype.hasOwnProperty.call(value, key);

function pointerParts(pointer) {
  if (typeof pointer !== 'string' || !pointer.startsWith('/')) throw new Error('Expected a JSON pointer.');
  return pointer.slice(1).split('/').map((part) => {
    if (/~(?![01])/u.test(part)) throw new Error('Invalid JSON pointer escape.');
    const key = part.replaceAll('~1', '/').replaceAll('~0', '~');
    if (['__proto__', 'prototype', 'constructor'].includes(key)) throw new Error('Unsafe JSON pointer.');
    return key;
  });
}

export function readPointer(document, pointer) {
  return pointerParts(pointer).reduce((value, key) => {
    if (value === null || typeof value !== 'object' || !own(value, key)) {
      throw new Error(`Authored value does not exist: ${pointer}`);
    }
    return value[key];
  }, document);
}

function replacePointer(document, pointer, value) {
  const parts = pointerParts(pointer);
  const key = parts.pop();
  const parent = parts.reduce((node, part) => node[part], document);
  readPointer(document, pointer);
  parent[key] = value;
}

async function sourcePath(root, file) {
  if (typeof file !== 'string' || isAbsolute(file)) throw new Error('Source paths must be project-relative.');
  const realRoot = await realpath(root);
  // macOS aliases /var and /tmp to /private. Resolve the project root first,
  // while still rejecting symlinks within the registered source tree.
  const path = resolve(realRoot, file);
  const realFile = await realpath(path);
  const inside = relative(realRoot, realFile);
  if (!inside || inside.startsWith('..') || isAbsolute(inside) || realFile !== path) {
    throw new Error(`Source must be an existing, non-symlink file inside the project: ${file}`);
  }
  return path;
}

export async function readSnapshot(root, adapter) {
  const snapshot = {};
  for (const file of adapter.files) {
    const text = await readFile(await sourcePath(root, file), 'utf8');
    snapshot[file] = { text, hash: hash(text), document: JSON.parse(text) };
  }
  return snapshot;
}

export function decodeTokenValue(value, binding) {
  if (typeof value !== 'string') throw new Error('Token values must be CSS strings.');
  const trimmed = value.trim();
  if (binding.valueType === 'string') {
    if (!trimmed || /[;{}\n\r]/u.test(trimmed)) throw new Error('Expected one CSS value.');
    return trimmed;
  }
  const match = trimmed.match(/^(-?(?:\d+(?:\.\d*)?|\.\d+))(px|rem|ms)?$/u);
  if (!match || (match[2] || '') !== (binding.unit || '')) {
    throw new Error(`Expected a numeric ${binding.unit || 'unitless'} value; expressions and different units require source review.`);
  }
  const number = Number(match[1]) / (binding.scale || 1);
  if (!Number.isFinite(number) || number < binding.min || number > binding.max) {
    throw new Error(`Value is outside the authored range ${binding.min}–${binding.max}.`);
  }
  return binding.valueType === 'css-length' ? `${number}${binding.unit}` : number;
}

export function encodeTokenValue(value, binding) {
  return binding.valueType === 'number'
    ? `${Number((value * (binding.scale || 1)).toFixed(9))}${binding.unit || ''}`
    : String(value);
}

function assertPage(report, adapter) {
  if (typeof report.pageUrl !== 'string') throw new Error('The handoff needs its pageUrl.');
  const urls = [report.pageUrl, report.handoff?.pageUrl].filter(Boolean);
  for (const address of urls) {
    const url = new URL(address);
    if (url.username || url.password || !adapter.origins.includes(url.origin)) {
      throw new Error(`This adapter does not author ${url.origin}. Open the project local development URL.`);
    }
    if (url.origin !== new URL(report.pageUrl).origin) throw new Error('Mixed-project handoff.');
  }
}

export function planFromSnapshot(report, snapshot, adapter) {
  assertPage(report, adapter);
  adapter.validateSnapshot?.(snapshot);
  if (!Array.isArray(report.tokenChanges)) throw new Error('Expected tokenChanges from Design Mode get_changes.');
  const operations = [];
  const unresolved = [];
  const targets = new Set();
  for (const [index, change] of report.tokenChanges.entries()) {
    try {
      const candidates = adapter.bindings.filter((binding) => binding.cssVar === change.cssVar
        && binding.scopes.includes(change.scopeSelector));
      if (candidates.length !== 1) throw new Error('No unique registered source for this token and scope.');
      const binding = candidates[0];
      if (change.media || change.supports || change.container || change.layer) {
        throw new Error('Conditional declaration requires an adapter with an explicit condition owner.');
      }
      const before = readPointer(snapshot[binding.file].document, binding.pointer);
      if (!isDeepStrictEqual(decodeTokenValue(change.oldValue, binding), before)) {
        throw new Error('Browser value differs from authored source. Clear old overrides, reload and capture again.');
      }
      const after = decodeTokenValue(change.newValue, binding);
      if (typeof after !== typeof before) throw new Error('The mutation would change the authored value type.');
      const target = `${binding.file}:${binding.pointer}`;
      if (targets.has(target)) throw new Error('Duplicate mutation of the same authored value.');
      targets.add(target);
      if (!isDeepStrictEqual(before, after)) {
        operations.push({ cssVar: binding.cssVar, scopeSelector: change.scopeSelector,
          file: binding.file, pointer: binding.pointer, before, after, context: binding.context });
      }
    } catch (error) {
      unresolved.push({ index, cssVar: change?.cssVar, reason: error.message });
    }
  }
  const otherChanges = ['styleChanges', 'textChanges', 'domChanges', 'comments']
    .filter((key) => Array.isArray(report[key]) && report[key].length > 0);
  if (otherChanges.length) unresolved.push({ reason: `Separate source review required for: ${otherChanges.join(', ')}. Submit only the selected token changes to this writer.` });
  const documents = Object.fromEntries(Object.entries(snapshot).map(([file, value]) => [file, structuredClone(value.document)]));
  for (const operation of operations) replacePointer(documents[operation.file], operation.pointer, operation.after);
  try { adapter.validate(documents); } catch (error) { unresolved.push({ reason: error.message }); }
  return {
    schemaVersion: 1, pipelineVersion: PIPELINE_VERSION,
    project: adapter.id, adapterVersion: adapter.version,
    bindingHash: hash(JSON.stringify(adapter.bindings)),
    sourceHashes: Object.fromEntries(Object.entries(snapshot).map(([file, value]) => [file, value.hash])),
    pageUrl: report.pageUrl, operations, unresolved,
    ready: operations.length > 0 && unresolved.length === 0,
    report,
  };
}

export async function createTokenPlan(root, adapter, report) {
  return planFromSnapshot(report, await readSnapshot(root, adapter), adapter);
}

export async function applyTokenPlan(root, adapter, plan) {
  root = await realpath(root);
  // The host adapter supplies its file transaction and serialisation policy.
  return adapter.withWriteLock(async () => {
    const snapshot = await readSnapshot(root, adapter);
    const current = planFromSnapshot(plan.report, snapshot, adapter);
    if (!isDeepStrictEqual(current, plan)) throw new Error('Stale or modified plan. Generate a new plan against the current source.');
    if (!current.ready) throw new Error('Plan has unresolved changes or no mutations. No files written.');
    const documents = Object.fromEntries(Object.entries(snapshot).map(([file, value]) => [file, structuredClone(value.document)]));
    for (const operation of current.operations) replacePointer(documents[operation.file], operation.pointer, operation.after);
    adapter.validate(documents);
    const output = adapter.derive(documents);
    const replacements = [];
    for (const [file, document] of Object.entries(output)) {
      if (!own(snapshot, file)) throw new Error(`Unregistered output: ${file}`);
      if (!isDeepStrictEqual(snapshot[file].document, document)) {
        replacements.push({ path: await sourcePath(root, file), content: `${JSON.stringify(document, null, 2)}\n` });
      }
    }
    // Recheck after preparation, immediately before the recoverable transaction.
    const latest = await readSnapshot(root, adapter);
    if (Object.keys(snapshot).some((file) => snapshot[file].hash !== latest[file].hash)) throw new Error('Source changed while preparing the write.');
    const transaction = await adapter.persist(root, replacements);
    const installed = await readSnapshot(root, adapter);
    for (const [file, document] of Object.entries(output)) {
      if (!isDeepStrictEqual(installed[file].document, document)) throw new Error(`Post-write verification failed: ${file}`);
    }
    return { applied: current.operations.length, files: replacements.map(({ path }) => relative(root, path)), transaction };
  });
}
