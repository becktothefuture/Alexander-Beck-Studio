import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(root, 'react-app/app');
const viteConfig = await readFile(resolve(appRoot, 'vite.config.js'), 'utf8');
const entries = [...viteConfig.matchAll(/resolve\(__dirname, '([^']+\.html)'\)/g)].map((match) => match[1]);
const uniqueEntries = [...new Set(entries)];
const errors = [];

for (const entry of uniqueEntries) {
  const source = await readFile(resolve(appRoot, entry), 'utf8');
  if (!/^<!doctype html>/i.test(source.trimStart())) errors.push(`${entry}: missing doctype`);
  if (!/<html[\s>]/i.test(source) || !/<\/html>/i.test(source)) errors.push(`${entry}: missing html boundary`);
  if (!/<body[\s>]/i.test(source) || !/<\/body>/i.test(source)) errors.push(`${entry}: missing body boundary`);
  if (!/<script\b[^>]*type=["']module["']/i.test(source)) errors.push(`${entry}: missing module entry script`);
}

if (errors.length) {
  console.error(`HTML entry validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}

console.log(`HTML entry validation passed: ${uniqueEntries.length} Vite entries.`);
