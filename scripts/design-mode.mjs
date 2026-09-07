import { readFile, writeFile, mkdir, open, unlink, realpath } from 'node:fs/promises';
import { resolve, dirname, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import adapter from '../design-mode.config.mjs';
import { createTokenPlan, applyTokenPlan, readSnapshot, readPointer, encodeTokenValue } from './lib/design-mode-pipeline.mjs';

const root = await realpath(fileURLToPath(new URL('..', import.meta.url)));
const [command, input, output] = process.argv.slice(2);
const usage = 'Usage: npm run design:tokens -- catalog | plan <handoff.json> <plan.json> | apply <plan.json>';
async function jsonFile(path) {
  if (!path) throw new Error(usage);
  const value = await readFile(resolve(path), 'utf8');
  if (Buffer.byteLength(value) > 1024 * 1024) throw new Error('Handoff is larger than 1 MiB. Select a smaller batch.');
  return JSON.parse(value);
}

try {
  if (command === 'catalog') {
    const snapshot = await readSnapshot(root, adapter);
    console.log(JSON.stringify(adapter.bindings.map((binding) => ({ ...binding,
      currentValue: encodeTokenValue(readPointer(snapshot[binding.file].document, binding.pointer), binding),
    })), null, 2));
  } else if (command === 'plan') {
    if (!output) throw new Error(usage);
    const plan = await createTokenPlan(root, adapter, await jsonFile(input));
    const path = resolve(output);
    // Plans are review artifacts, never an alternate path for overwriting project sources.
    const planRoot = resolve(root, '.cache/design-mode-plans');
    const planRelative = relative(planRoot, path);
    if (!planRelative || planRelative.startsWith('..') || isAbsolute(planRelative) || !path.endsWith('.json')) throw new Error('Save plans under .cache/design-mode-plans/*.json.');
    await mkdir(dirname(path), { recursive: true });
    if (await realpath(dirname(path)) !== dirname(path)) throw new Error('Plan output may not use a symlink.');
    await writeFile(path, `${JSON.stringify(plan, null, 2)}\n`, { flag: 'wx' });
    console.log(JSON.stringify({ plan: path, ready: plan.ready, operations: plan.operations, unresolved: plan.unresolved }, null, 2));
    if (!plan.ready) process.exitCode = 2;
  } else if (command === 'apply') {
    // Cross-process exclusion for this writer. The existing dev editor and an IDE do
    // not share this lock: keep them idle while applying; hashes catch stale plans.
    const lockPath = resolve(root, '.cache/design-mode-write.lock');
    await mkdir(dirname(lockPath), { recursive: true });
    let lock;
    try {
      lock = await open(lockPath, 'wx');
      await lock.writeFile(JSON.stringify({ pid: process.pid, startedAt: new Date().toISOString() }));
      console.log(JSON.stringify(await applyTokenPlan(root, adapter, await jsonFile(input)), null, 2));
    } finally {
      if (lock) { await lock.close(); await unlink(lockPath); }
    }
  } else throw new Error(usage);
} catch (error) {
  console.error(error.code === 'EEXIST' ? 'A plan already exists or another token writer holds the lock. Inspect it before retrying.' : error.message);
  process.exitCode = 1;
}
