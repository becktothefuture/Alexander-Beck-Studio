#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';

const SEARCH_PATHS = [
  'react-app/app/src',
  'react-app/app/public',
  'react-app/app/index.html',
  'react-app/app/portfolio.html',
  'react-app/app/cv.html',
  'react-app/app/styleguide.html',
  'react-app/app/palette-lab.html',
  'react-app/app/explain-it-like-im.html',
];

const FIXED_CHECKS = [
  {
    label: 'Malformed token join `0var(`',
    needle: '0var(',
  },
];

const MALFORMED_DETECTED_COLOR_PATTERN = String.raw`var\(--color-detected-rgb(?!a?\d+\b)[^\s),]*`;
const args = new Set(process.argv.slice(2));
const stagedMode = args.has('--staged');
const fullMode = args.has('--full');

if (stagedMode && fullMode) {
  console.error('FAIL: use only one mode flag: either `--staged` or `--full`.');
  process.exit(1);
}

function runSearch(argsList) {
  try {
    const out = execFileSync('rg', argsList, { encoding: 'utf8' });
    return out.trim();
  } catch (error) {
    if (error?.status === 1) {
      return '';
    }
    if (error?.code === 'ENOENT') {
      return runNodeSearch(argsList);
    }
    throw error;
  }
}

function runGit(argsList) {
  try {
    const out = execFileSync('git', argsList, { encoding: 'utf8' });
    return out.trim();
  } catch (error) {
    if (error?.status === 1) {
      return '';
    }
    throw error;
  }
}

function runFixedSearch(needle, targets) {
  return runSearch([
    '--line-number',
    '--no-heading',
    '--color=never',
    '--fixed-strings',
    '--glob',
    '!**/node_modules/**',
    '--glob',
    '!**/dist/**',
    '--glob',
    '!**/output/**',
    '--glob',
    '!**/tmp/**',
    needle,
    ...targets,
  ]);
}

function runRegexSearch(pattern, targets) {
  return runSearch([
    '--line-number',
    '--no-heading',
    '--color=never',
    '--pcre2',
    '--glob',
    '!**/node_modules/**',
    '--glob',
    '!**/dist/**',
    '--glob',
    '!**/output/**',
    '--glob',
    '!**/tmp/**',
    '-e',
    pattern,
    ...targets,
  ]);
}

function extractSearchTargets(argsList) {
  const targets = [];
  let expectPatternValue = false;
  for (const arg of argsList) {
    if (expectPatternValue) {
      expectPatternValue = false;
      continue;
    }
    if (arg === '--glob' || arg === '--line-number' || arg === '--no-heading' || arg === '--color=never' || arg === '--fixed-strings' || arg === '--pcre2') {
      continue;
    }
    if (arg === '-e') {
      expectPatternValue = true;
      continue;
    }
    if (arg.startsWith('!')) {
      continue;
    }
    targets.push(arg);
  }
  return targets;
}

function isExcludedPath(pathName) {
  const normalizedPath = normalizePath(pathName);
  return [
    'node_modules/',
    'dist/',
    'output/',
    'tmp/',
  ].some((segment) => normalizedPath.includes(`/${segment}`) || normalizedPath.startsWith(segment));
}

function expandSearchTargets(targets) {
  const files = [];
  for (const target of targets) {
    if (!target) continue;
    let stats;
    try {
      stats = statSync(target);
    } catch {
      continue;
    }
    if (stats.isDirectory()) {
      walkDirectory(target, files);
      continue;
    }
    if (!isExcludedPath(target)) {
      files.push(normalizePath(target));
    }
  }
  return files;
}

function walkDirectory(dirPath, files) {
  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const entryPath = normalizePath(path.join(dirPath, entry.name));
    if (isExcludedPath(entryPath)) continue;
    if (entry.isDirectory()) {
      walkDirectory(entryPath, files);
      continue;
    }
    if (entry.isFile()) {
      files.push(entryPath);
    }
  }
}

function runNodeSearch(argsList) {
  const fixedStrings = argsList.includes('--fixed-strings');
  const patternIndex = fixedStrings ? argsList.findIndex((arg) => !arg.startsWith('--') && arg !== '!**/node_modules/**' && arg !== '!**/dist/**' && arg !== '!**/output/**' && arg !== '!**/tmp/**') : argsList.indexOf('-e') + 1;
  const pattern = patternIndex >= 0 ? argsList[patternIndex] : '';
  const targetStartIndex = fixedStrings ? patternIndex + 1 : patternIndex + 1;
  const targets = extractSearchTargets(argsList.slice(targetStartIndex));
  const files = expandSearchTargets(targets);
  const matcher = fixedStrings
    ? (line) => line.includes(pattern)
    : (() => {
        const regex = new RegExp(pattern, 'u');
        return (line) => regex.test(line);
      })();
  const matches = [];
  for (const filePath of files) {
    const buffer = readFileSync(filePath);
    if (buffer.includes(0)) continue;
    const text = buffer.toString('utf8');
    const lines = text.split(/\r?\n/u);
    for (let index = 0; index < lines.length; index += 1) {
      if (!matcher(lines[index])) continue;
      matches.push(`${normalizePath(filePath)}:${index + 1}:${lines[index]}`);
    }
  }
  return matches.join('\n');
}

function normalizePath(p) {
  return p.replaceAll('\\', '/');
}

function pathIsInSearchScope(pathName) {
  const normalizedPath = normalizePath(pathName);
  return SEARCH_PATHS.some((searchPath) => {
    const normalizedSearchPath = normalizePath(searchPath);
    return normalizedPath === normalizedSearchPath || normalizedPath.startsWith(`${normalizedSearchPath}/`);
  });
}

function getStagedTargets() {
  const stagedFilesRaw = runGit([
    'diff',
    '--name-only',
    '--cached',
    '--diff-filter=ACMR',
  ]);
  if (!stagedFilesRaw) return [];
  return stagedFilesRaw
    .split('\n')
    .map((file) => file.trim())
    .filter(Boolean)
    .filter(pathIsInSearchScope);
}

const scanTargets = stagedMode ? getStagedTargets() : SEARCH_PATHS;

if (stagedMode && scanTargets.length === 0) {
  console.log('PASS: malformed tokenized string guardrail (staged mode, no files in scope)');
  process.exit(0);
}

const failures = [];

for (const check of FIXED_CHECKS) {
  const hitLines = runFixedSearch(check.needle, scanTargets);
  if (!hitLines) continue;
  failures.push({
    label: check.label,
    hitLines,
  });
}

const malformedDetectedColorMatches = runRegexSearch(MALFORMED_DETECTED_COLOR_PATTERN, scanTargets);
if (malformedDetectedColorMatches) {
  failures.push({
    label: 'Malformed detected-color token `var(--color-detected-rgb...`',
    hitLines: malformedDetectedColorMatches,
  });
}

if (failures.length > 0) {
  console.error('FAIL: malformed tokenized strings detected.\n');
  for (const failure of failures) {
    console.error(`${failure.label}:`);
    console.error(failure.hitLines);
    console.error('');
  }
  process.exit(1);
}

const modeLabel = stagedMode ? 'staged' : 'full';
console.log(`PASS: malformed tokenized string guardrail (${modeLabel} scan)`);
