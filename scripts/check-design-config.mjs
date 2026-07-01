import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import {
  deriveLegacyConfigFiles,
  normalizeDesignSystemConfig,
} from '../react-app/app/src/legacy/modules/utils/design-config.js';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const publicConfigDir = resolve(repoRoot, 'react-app/app/public/config');

const CONFIG_FILES = [
  {
    label: 'design-system.json',
    path: resolve(publicConfigDir, 'design-system.json'),
    getExpected: ({ designSystem }) => designSystem,
  },
  {
    label: 'default-config.json',
    path: resolve(publicConfigDir, 'default-config.json'),
    getExpected: ({ derived }) => derived.runtime,
  },
  {
    label: 'shell-config.json',
    path: resolve(publicConfigDir, 'shell-config.json'),
    getExpected: ({ derived }) => derived.shell,
  },
  {
    label: 'portfolio-config.json',
    path: resolve(publicConfigDir, 'portfolio-config.json'),
    getExpected: ({ derived }) => derived.portfolio,
  },
  {
    label: 'cv-config.json',
    path: resolve(publicConfigDir, 'cv-config.json'),
    getExpected: ({ derived }) => derived.cv,
  },
];

async function readJson(filePath) {
  return JSON.parse(await readFile(filePath, 'utf8'));
}

function stableJson(value) {
  return JSON.stringify(value);
}

async function main() {
  const currentDesignSystem = await readJson(resolve(publicConfigDir, 'design-system.json'));
  const designSystem = normalizeDesignSystemConfig(currentDesignSystem);
  const derived = deriveLegacyConfigFiles(designSystem);
  const stale = [];

  for (const file of CONFIG_FILES) {
    const actual = await readJson(file.path);
    const expected = file.getExpected({ designSystem, derived });
    if (stableJson(actual) !== stableJson(expected)) {
      stale.push(file.label);
    }
  }

  if (stale.length) {
    console.error('Generated design config files are stale or not normalized:');
    stale.forEach((label) => console.error(`- ${label}`));
    console.error('Run `npm run flatten:design-config` and commit the resulting config files.');
    process.exitCode = 1;
    return;
  }

  console.log('PASS: generated design config files match design-system.json');
}

try {
  await main();
} catch (error) {
  console.error('Failed to check generated design config files.');
  console.error(error?.message || error);
  process.exitCode = 1;
}
