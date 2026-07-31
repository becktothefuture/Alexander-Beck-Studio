#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const APP_ROOT = path.join(ROOT, 'react-app', 'app');
const ENTRY_FILES = ['index.html', 'portfolio.html', 'about.html', 'contact.html', 'playground.html', 'styleguide.html', 'palette-lab.html'];
const INSTRUMENT_FONT_PATH = path.join(APP_ROOT, 'public', 'fonts', 'instrument-serif', 'InstrumentSerif-Regular.woff2');
const INSTRUMENT_FONT_HREF = '%BASE_URL%fonts/instrument-serif/InstrumentSerif-Regular.woff2';
const CHECK_ONLY = process.argv.includes('--check');
const HTML_OPEN_PATTERN = /<html[^\n]*>/;
const CRITICAL_STYLE_PATTERN = /    <style id="abs-critical-shell">[\s\S]*?\n    <\/style>/;
const BOOT_PATTERN = /    <script>\n      \(function\(\) \{\n        window\.__ABS_BOOT_STARTED_AT__[\s\S]*?\n    <\/script>/;
const BOOT_OVERLAY_PATTERN = /    <div id="abs-boot-overlay"[\s\S]*?(?=\n    <div id="root")/;
const SHELL_STYLES_PATTERN = /    <link rel="preconnect" href="https:\/\/fonts\.googleapis\.com" \/>[\s\S]*?    <link rel="stylesheet" href="\/src\/styles\/base\.css" \/>/;

const canonicalPath = path.join(APP_ROOT, ENTRY_FILES[0]);
const canonicalHtml = await fs.readFile(canonicalPath, 'utf8');
const canonicalHtmlOpen = canonicalHtml.match(HTML_OPEN_PATTERN)?.[0];
if (!canonicalHtmlOpen) throw new Error(`Canonical html tag not found in ${canonicalPath}`);
const canonicalCriticalStyle = canonicalHtml.match(CRITICAL_STYLE_PATTERN)?.[0];
if (!canonicalCriticalStyle) throw new Error(`Canonical critical shell style not found in ${canonicalPath}`);
const canonicalBoot = canonicalHtml.match(BOOT_PATTERN)?.[0];
if (!canonicalBoot) throw new Error(`Canonical shell boot block not found in ${canonicalPath}`);
const canonicalBootOverlay = canonicalHtml.match(BOOT_OVERLAY_PATTERN)?.[0];
if (!canonicalBootOverlay) throw new Error(`Canonical boot overlay markup not found in ${canonicalPath}`);
const canonicalShellStyles = canonicalHtml.match(SHELL_STYLES_PATTERN)?.[0];
if (!canonicalShellStyles) throw new Error(`Canonical shell stylesheet block not found in ${canonicalPath}`);
const instrumentFontStat = await fs.stat(INSTRUMENT_FONT_PATH).catch(() => null);
if (!instrumentFontStat?.isFile() || instrumentFontStat.size === 0) {
  throw new Error(`Instrument Serif webfont missing or empty: ${INSTRUMENT_FONT_PATH}`);
}
if (!canonicalShellStyles.includes(`href="${INSTRUMENT_FONT_HREF}"`)) {
  throw new Error(`Canonical entry shell must preload ${INSTRUMENT_FONT_HREF}`);
}
if (canonicalShellStyles.includes('family=Instrument+Serif')) {
  throw new Error('Instrument Serif must remain self-hosted, not part of the Google Fonts request');
}

const drifted = [];
for (const entry of ENTRY_FILES.slice(1)) {
  const entryPath = path.join(APP_ROOT, entry);
  let html = await fs.readFile(entryPath, 'utf8');
  const currentHtmlOpen = html.match(HTML_OPEN_PATTERN)?.[0];
  if (!currentHtmlOpen) throw new Error(`Html tag not found in ${entryPath}`);
  const currentCriticalStyle = html.match(CRITICAL_STYLE_PATTERN)?.[0];
  if (!currentCriticalStyle) throw new Error(`Critical shell style not found in ${entryPath}`);
  const currentBoot = html.match(BOOT_PATTERN)?.[0];
  if (!currentBoot) throw new Error(`Shell boot block not found in ${entryPath}`);
  const currentBootOverlay = html.match(BOOT_OVERLAY_PATTERN)?.[0];
  if (!currentBootOverlay) throw new Error(`Boot overlay markup not found in ${entryPath}`);
  const currentShellStyles = html.match(SHELL_STYLES_PATTERN)?.[0];
  if (!currentShellStyles) throw new Error(`Shell stylesheet block not found in ${entryPath}`);

  const contracts = [];
  if (currentHtmlOpen !== canonicalHtmlOpen) {
    contracts.push('html');
    html = html.replace(HTML_OPEN_PATTERN, canonicalHtmlOpen);
  }
  if (currentCriticalStyle !== canonicalCriticalStyle) {
    contracts.push('critical-style');
    html = html.replace(CRITICAL_STYLE_PATTERN, canonicalCriticalStyle);
  }
  if (currentBoot !== canonicalBoot) {
    contracts.push('boot');
    html = html.replace(BOOT_PATTERN, canonicalBoot);
  }
  if (currentBootOverlay !== canonicalBootOverlay) {
    contracts.push('boot-overlay');
    html = html.replace(BOOT_OVERLAY_PATTERN, canonicalBootOverlay);
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
    : 'PASS: production entry boot shell and stylesheet blocks match index.html');
}
