import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { deriveLegacyConfigFiles, normalizeDesignSystemConfig } from '../react-app/app/src/legacy/modules/utils/design-config.js';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const publicConfigDir = resolve(repoRoot, 'react-app/app/public/config');
const canonicalPath = resolve(publicConfigDir, 'design-system.json');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readJsonIfExists(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    return null;
  }
}

function writeJsonIfChanged(path, value) {
  const existing = readJsonIfExists(path);
  if (existing && JSON.stringify(existing) === JSON.stringify(value)) {
    return false;
  }
  writeJson(path, value);
  return true;
}

function main() {
  const designSystem = normalizeDesignSystemConfig(readJson(canonicalPath));
  const derived = deriveLegacyConfigFiles(designSystem);

  writeJsonIfChanged(resolve(publicConfigDir, 'default-config.json'), derived.runtime);
  writeJsonIfChanged(resolve(publicConfigDir, 'shell-config.json'), derived.shell);
  writeJsonIfChanged(resolve(publicConfigDir, 'portfolio-config.json'), derived.portfolio);

  console.log('Flattened design-system.json into legacy config files.');
  console.log(`- ${resolve(publicConfigDir, 'default-config.json')}`);
  console.log(`- ${resolve(publicConfigDir, 'shell-config.json')}`);
  console.log(`- ${resolve(publicConfigDir, 'portfolio-config.json')}`);
}

try {
  main();
} catch (error) {
  console.error('Failed to flatten design system config.');
  console.error(error?.message || error);
  process.exitCode = 1;
}
