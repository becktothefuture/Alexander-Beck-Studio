import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { deriveLegacyConfigFiles, normalizeDesignSystemConfig } from '../../react-app/app/src/legacy/modules/utils/design-config.js';
import {
  applyLocalFileTransaction,
  runSerializedLocalFileOperation,
} from './local-file-transaction.mjs';

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

async function readJsonIfExists(path) {
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return null;
  }
}

async function jsonReplacementIfChanged(path, value) {
  const existing = await readJsonIfExists(path);
  if (existing && JSON.stringify(existing) === JSON.stringify(value)) {
    return null;
  }
  return { path, content: `${JSON.stringify(value, null, 2)}\n` };
}

export async function flattenDesignConfigDir(publicConfigDir, nextConfig = null, {
  transactionIo,
} = {}) {
  return runSerializedLocalFileOperation(async () => {
    const canonicalPath = resolve(publicConfigDir, 'design-system.json');
    const designSystem = normalizeDesignSystemConfig(nextConfig ?? await readJson(canonicalPath));
    const derived = deriveLegacyConfigFiles(designSystem);
    const files = {
      canonical: canonicalPath,
      runtime: resolve(publicConfigDir, 'default-config.json'),
      shell: resolve(publicConfigDir, 'shell-config.json'),
      portfolio: resolve(publicConfigDir, 'portfolio-config.json'),
      cv: resolve(publicConfigDir, 'cv-config.json'),
    };
    const replacements = (await Promise.all([
      jsonReplacementIfChanged(files.canonical, designSystem),
      jsonReplacementIfChanged(files.runtime, derived.runtime),
      jsonReplacementIfChanged(files.shell, derived.shell),
      jsonReplacementIfChanged(files.portfolio, derived.portfolio),
      jsonReplacementIfChanged(files.cv, derived.cv),
    ])).filter(Boolean);

    await applyLocalFileTransaction({
      rootPath: publicConfigDir,
      replacements,
    }, { io: transactionIo });

    return { designSystem, derived, files };
  });
}
