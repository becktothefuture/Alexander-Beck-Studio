#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_ROOT = path.join(ROOT, 'react-app', 'app');
const ENTRY_FILES = ['index.html', 'portfolio.html', 'about.html', 'contact.html'];
const CHECK_ONLY = process.argv.includes('--check');
const BOOT_PATTERN = /    <script>\n      \(function\(\) \{\n        window\.__ABS_BOOT_STARTED_AT__[\s\S]*?\n    <\/script>/;
const SHELL_STYLES_PATTERN = /    <link rel="stylesheet" href="%BASE_URL%css\/tokens\.css" \/>[\s\S]*?    <link rel="stylesheet" href="\/src\/styles\/base\.css" \/>/;

const canonicalPath = path.join(APP_ROOT, ENTRY_FILES[0]);
const canonicalHtml = await fs.readFile(canonicalPath, 'utf8');
const canonicalBoot = canonicalHtml.match(BOOT_PATTERN)?.[0];
if (!canonicalBoot) throw new Error(`Canonical shell boot block not found in ${canonicalPath}`);
const canonicalShellStyles = canonicalHtml.match(SHELL_STYLES_PATTERN)?.[0];
if (!canonicalShellStyles) throw new Error(`Canonical shell stylesheet block not found in ${canonicalPath}`);

const drifted = [];
for (const entry of ENTRY_FILES.slice(1)) {
  const entryPath = path.join(APP_ROOT, entry);
  let html = await fs.readFile(entryPath, 'utf8');
  const currentBoot = html.match(BOOT_PATTERN)?.[0];
  if (!currentBoot) throw new Error(`Shell boot block not found in ${entryPath}`);
  const currentShellStyles = html.match(SHELL_STYLES_PATTERN)?.[0];
  if (!currentShellStyles) throw new Error(`Shell stylesheet block not found in ${entryPath}`);

  const contracts = [];
  if (currentBoot !== canonicalBoot) {
    contracts.push('boot');
    html = html.replace(BOOT_PATTERN, canonicalBoot);
  }
  if (currentShellStyles !== canonicalShellStyles) {
    contracts.push('styles');
    html = html.replace(SHELL_STYLES_PATTERN, canonicalShellStyles);
  }
  if (!contracts.length) continue;

  drifted.push(`${entry} (${contracts.join(', ')})`);
  if (!CHECK_ONLY) await fs.writeFile(entryPath, html);
}

if (CHECK_ONLY && drifted.length) {
  console.error(`Production entry shell drift: ${drifted.join(', ')}`);
  console.error('Run: npm run sync:entry-shell');
  process.exitCode = 1;
} else {
  console.log(drifted.length
    ? `Synchronized production entry shell into: ${drifted.join(', ')}`
    : 'PASS: production entry boot and stylesheet blocks match index.html');
}
