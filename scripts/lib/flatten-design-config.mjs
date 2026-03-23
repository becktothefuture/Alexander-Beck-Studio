import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { deriveLegacyConfigFiles, normalizeDesignSystemConfig } from '../../react-app/app/src/legacy/modules/utils/design-config.js';

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

async function writeJson(path, value) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

async function writeJsonIfChanged(path, value) {
  const existing = await readJsonIfExists(path);
  if (existing && JSON.stringify(existing) === JSON.stringify(value)) {
    return false;
  }
  await writeJson(path, value);
  return true;
}

export async function flattenDesignConfigDir(publicConfigDir, nextConfig = null) {
  const canonicalPath = resolve(publicConfigDir, 'design-system.json');
  const designSystem = normalizeDesignSystemConfig(nextConfig ?? await readJson(canonicalPath));
  const derived = deriveLegacyConfigFiles(designSystem);

  await Promise.all([
    writeJsonIfChanged(canonicalPath, designSystem),
    writeJsonIfChanged(resolve(publicConfigDir, 'default-config.json'), derived.runtime),
    writeJsonIfChanged(resolve(publicConfigDir, 'shell-config.json'), derived.shell),
    writeJsonIfChanged(resolve(publicConfigDir, 'portfolio-config.json'), derived.portfolio),
    writeJsonIfChanged(resolve(publicConfigDir, 'cv-config.json'), derived.cv),
  ]);

  return {
    designSystem,
    derived,
    files: {
      canonical: canonicalPath,
      runtime: resolve(publicConfigDir, 'default-config.json'),
      shell: resolve(publicConfigDir, 'shell-config.json'),
      portfolio: resolve(publicConfigDir, 'portfolio-config.json'),
      cv: resolve(publicConfigDir, 'cv-config.json'),
    },
  };
}
