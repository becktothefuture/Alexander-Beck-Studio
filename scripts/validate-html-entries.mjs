import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(root, 'react-app/app');
const viteConfig = await readFile(resolve(appRoot, 'vite.config.js'), 'utf8');
const entries = [...viteConfig.matchAll(/resolve\(\s*__dirname\s*,\s*['"]([^'"]+\.html)['"]\s*\)/g)]
  .map((match) => match[1]);
const uniqueEntries = [...new Set(entries)];
const errors = [];

if (entries.length !== uniqueEntries.length) {
  errors.push('vite.config.js: duplicate HTML input path');
}

const rootHtmlEntries = (await readdir(appRoot, { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => entry.name);
const labHtmlEntries = (await readdir(resolve(appRoot, 'lab'), { withFileTypes: true }))
  .filter((entry) => entry.isFile() && entry.name.endsWith('.html'))
  .map((entry) => `lab/${entry.name}`);
const authoredEntries = [...rootHtmlEntries, ...labHtmlEntries];
const viteEntrySet = new Set(uniqueEntries);
const authoredEntrySet = new Set(authoredEntries);

authoredEntries.forEach((entry) => {
  if (!viteEntrySet.has(entry)) errors.push(`${entry}: authored HTML entry is missing from Vite inputs`);
});
uniqueEntries.forEach((entry) => {
  if (!authoredEntrySet.has(entry)) errors.push(`${entry}: Vite input is not an authored HTML entry`);
});

for (const entry of uniqueEntries) {
  const source = await readFile(resolve(appRoot, entry), 'utf8');
  if (!/^<!doctype html>/i.test(source.trimStart())) errors.push(`${entry}: missing doctype`);
  if (!/<html[\s>]/i.test(source) || !/<\/html>/i.test(source)) errors.push(`${entry}: missing html boundary`);
  if (!/<body[\s>]/i.test(source) || !/<\/body>/i.test(source)) errors.push(`${entry}: missing body boundary`);
  const moduleScripts = Array.from(source.matchAll(/<script\b([^>]*)>/gi))
    .map((match) => match[1])
    .filter((attributes) => /\btype\s*=\s*["']module["']/i.test(attributes));
  if (moduleScripts.length !== 1) {
    errors.push(`${entry}: expected one module entry script, found ${moduleScripts.length}`);
    continue;
  }
  const moduleSource = /\bsrc\s*=\s*["']([^"']+)["']/i.exec(moduleScripts[0])?.[1];
  if (!moduleSource) {
    errors.push(`${entry}: module entry script is missing src`);
    continue;
  }
  if (!moduleSource.startsWith('/src/entries/')) {
    errors.push(`${entry}: module entry script must load from /src/entries/`);
    continue;
  }
  if (!existsSync(resolve(appRoot, moduleSource.replace(/^\//, '')))) {
    errors.push(`${entry}: module entry target ${moduleSource} does not exist`);
  }
}

if (errors.length) {
  console.error(`HTML entry validation failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  process.exit(1);
}

console.log(`HTML entry validation passed: ${uniqueEntries.length} Vite entries.`);
