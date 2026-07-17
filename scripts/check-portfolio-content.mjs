#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const contentPath = resolve(__dirname, '..', 'react-app', 'app', 'public', 'config', 'contents-portfolio.json');
const accessModes = new Set(['public', 'protected']);

function fail(message) {
  throw new Error(`Portfolio content validation failed: ${message}`);
}

const contents = JSON.parse(await readFile(contentPath, 'utf8'));
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
});

console.log(`Portfolio content validation passed (${contents.projects.length} projects).`);
