import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { flattenDesignConfigDir } from './lib/flatten-design-config.mjs';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const publicConfigDir = resolve(repoRoot, 'react-app/app/public/config');
async function main() {
  const result = await flattenDesignConfigDir(publicConfigDir);
  console.log('Flattened design-system.json into legacy config files.');
  console.log(`- ${result.files.runtime}`);
  console.log(`- ${result.files.shell}`);
  console.log(`- ${result.files.portfolio}`);
  console.log(`- ${result.files.cv}`);
}

try {
  await main();
} catch (error) {
  console.error('Failed to flatten design system config.');
  console.error(error?.message || error);
  process.exitCode = 1;
}
