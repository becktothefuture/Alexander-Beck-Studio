import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const fragmentPaths = [
  'react-app/app/src/templates/index-body.html',
  'react-app/app/src/templates/portfolio-body.html',
  'react-app/app/src/templates/cv-body.html'
];

const voidTags = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr'
]);

function stripIgnoredSections(html) {
  const mask = (section) => section.replace(/[^\n]/g, ' ');

  return html
    .replace(/<!--[\s\S]*?-->/g, mask)
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, mask)
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, mask);
}

function getLineAndColumn(source, offset) {
  const slice = source.slice(0, offset);
  const lines = slice.split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

function validateFragment(filePath) {
  const absolutePath = resolve(repoRoot, filePath);
  const originalHtml = readFileSync(absolutePath, 'utf8');
  const html = stripIgnoredSections(originalHtml);
  const tagPattern = /<\/?([A-Za-z][A-Za-z0-9:-]*)(?:\s[^<>]*?)?\s*\/?>/g;
  const stack = [];
  const errors = [];

  for (const match of html.matchAll(tagPattern)) {
    const [rawTag, rawName] = match;
    const tagName = rawName.toLowerCase();
    const isClosingTag = rawTag.startsWith('</');
    const isSelfClosing = rawTag.endsWith('/>') || voidTags.has(tagName);
    const position = getLineAndColumn(originalHtml, match.index || 0);

    if (isClosingTag) {
      if (voidTags.has(tagName)) {
        errors.push({
          filePath,
          message: `Unexpected closing tag </${tagName}>`,
          ...position
        });
        continue;
      }

      const current = stack[stack.length - 1];
      if (!current) {
        errors.push({
          filePath,
          message: `Unmatched closing tag </${tagName}>`,
          ...position
        });
        continue;
      }

      if (current.tagName === tagName) {
        stack.pop();
        continue;
      }

      errors.push({
        filePath,
        message: `Mismatched closing tag </${tagName}>; expected </${current.tagName}>`,
        ...position
      });

      const matchingIndex = stack.findLastIndex((entry) => entry.tagName === tagName);
      if (matchingIndex >= 0) {
        stack.splice(matchingIndex, 1);
      }
      continue;
    }

    if (!isSelfClosing) {
      stack.push({
        tagName,
        line: position.line,
        column: position.column
      });
    }
  }

  stack.forEach((entry) => {
    errors.push({
      filePath,
      line: entry.line,
      column: entry.column,
      message: `Unclosed tag <${entry.tagName}>`
    });
  });

  return errors;
}

const errors = fragmentPaths.flatMap((filePath) => validateFragment(filePath));

if (errors.length > 0) {
  console.error('HTML fragment validation failed.');
  errors.forEach((error) => {
    console.error(`- ${error.filePath}:${error.line}:${error.column} ${error.message}`);
  });
  process.exitCode = 1;
} else {
  console.log(`HTML fragment validation passed: ${fragmentPaths.length} files.`);
}
