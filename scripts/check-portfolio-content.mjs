#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validatePlaygroundContent } from '../react-app/app/src/routes/playground/media/playgroundContent.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentPath = resolve(__dirname, '..', 'react-app', 'app', 'public', 'config', 'contents-portfolio.json');
const accessModes = new Set(['public', 'protected']);

function fail(message) {
  throw new Error(`Portfolio content validation failed: ${message}`);
}

const contents = JSON.parse(await readFile(contentPath, 'utf8'));
if (!Number.isInteger(contents?.version) || contents.version < 2) {
  fail('version must identify the unified Work schema (2 or newer).');
}
if (String(contents?.title || '').trim() !== 'Work') {
  fail('title must be "Work".');
}
if (!String(contents?.description || '').trim()) {
  fail('description must be a non-empty string.');
}
if (!Array.isArray(contents?.projects) || contents.projects.length === 0) {
  fail('projects must be a non-empty array.');
}

const projectIds = new Set();
contents.projects.forEach((project, index) => {
  const label = `projects[${index}]`;
  if (!project || typeof project !== 'object' || Array.isArray(project)) {
    fail(`${label} must be an object.`);
  }

  const projectId = String(project.id || '').trim();
  if (!projectId) fail(`${label}.id must be a non-empty string.`);
  if (projectIds.has(projectId)) fail(`${label}.id duplicates "${projectId}".`);
  projectIds.add(projectId);

  if (!Object.hasOwn(project, 'access')) {
    fail(`${label} (${projectId}) must explicitly declare access.`);
  }
  if (!accessModes.has(project.access)) {
    fail(`${label} (${projectId}).access must be "public" or "protected".`);
  }
  if (project.access !== 'protected') {
    fail(`${label} (${projectId}) must remain password protected in the unified Work canvas.`);
  }
});

const snippetContent = validatePlaygroundContent({
  version: contents.version,
  title: contents.title,
  description: contents.description,
  items: contents.snippets,
});
if (snippetContent.items.some((item) => /\blorem ipsum\b/i.test(item.description))) {
  fail('snippets must not contain placeholder descriptions.');
}
const workIds = new Set(projectIds);
snippetContent.items.forEach((item) => {
  if (workIds.has(item.id)) fail(`snippet id duplicates project id "${item.id}".`);
  workIds.add(item.id);
});

console.log(
  `Work content validation passed (${contents.projects.length} case studies, ${snippetContent.items.length} snippets).`,
);
