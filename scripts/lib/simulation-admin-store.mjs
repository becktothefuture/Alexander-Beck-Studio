import { appendFile, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '../..');
const reactAppRoot = resolve(repoRoot, 'react-app/app');

export const SIMULATION_STAGES = Object.freeze({
  DAILY_ROTATION: 'daily-rotation',
  COLLECTION: 'collection',
  AUTOMATION_CANDIDATE: 'automation-candidate',
  HIDDEN: 'hidden',
});

export const ALLOWED_SIMULATION_STAGES = Object.freeze(Object.values(SIMULATION_STAGES));

export const SIMULATION_REVIEW_STATUSES = Object.freeze({
  CANDIDATE: 'candidate',
  WATCH: 'watch',
  STABLE: 'stable',
  DISABLED: 'disabled',
  INTERNAL: 'internal',
});

export const ALLOWED_SIMULATION_REVIEW_STATUSES = Object.freeze(
  Object.values(SIMULATION_REVIEW_STATUSES),
);

export const SIMULATION_ADMIN_PATHS = Object.freeze({
  repoRoot,
  reactAppRoot,
  simulationCatalogPath: resolve(reactAppRoot, 'src/data/simulationCatalog.json'),
  simulationActivityPath: resolve(repoRoot, 'docs/simulations/activity.jsonl'),
  simulationIssuesDir: resolve(repoRoot, 'docs/simulations/issues'),
  simulationPreviewsDir: resolve(reactAppRoot, 'public/previews/simulations'),
  routeRegistryPath: resolve(reactAppRoot, 'src/lib/routes.js'),
  viteConfigPath: resolve(reactAppRoot, 'vite.config.js'),
  constantsPath: resolve(reactAppRoot, 'src/legacy/modules/core/constants.js'),
});

export function slugify(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'note';
}

export function markdownEscape(value) {
  return String(value || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

export function isAllowedSimulationStage(stage) {
  return ALLOWED_SIMULATION_STAGES.includes(stage);
}

export function isAllowedSimulationReviewStatus(reviewStatus) {
  return ALLOWED_SIMULATION_REVIEW_STATUSES.includes(reviewStatus);
}

export async function readSimulationCatalog(
  catalogPath = SIMULATION_ADMIN_PATHS.simulationCatalogPath,
) {
  return JSON.parse(await readFile(catalogPath, 'utf8'));
}

export async function writeSimulationCatalog(
  catalog,
  {
    catalogPath = SIMULATION_ADMIN_PATHS.simulationCatalogPath,
    now = new Date(),
    touchUpdatedAt = true,
  } = {},
) {
  const nextCatalog = { ...catalog };
  if (touchUpdatedAt) {
    nextCatalog.updatedAt = now.toISOString().slice(0, 10);
  }
  await writeFile(catalogPath, `${JSON.stringify(nextCatalog, null, 2)}\n`, 'utf8');
  return nextCatalog;
}

export function findSimulation(catalog, id) {
  return (catalog?.simulations || []).find((entry) => entry.id === id) || null;
}

function createStoreError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

async function appendSimulationActivity(
  event,
  {
    now = new Date(),
    activityPath = SIMULATION_ADMIN_PATHS.simulationActivityPath,
  } = {},
) {
  const activity = {
    at: now.toISOString(),
    ...event,
  };
  await mkdir(dirname(activityPath), { recursive: true });
  await appendFile(activityPath, `${JSON.stringify(activity)}\n`, 'utf8');
  return activity;
}

async function readSimulationActivity(
  activityPath = SIMULATION_ADMIN_PATHS.simulationActivityPath,
) {
  const raw = await readFile(activityPath, 'utf8').catch(() => '');
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

export function validateStageTransition(simulation, stage) {
  if (!isAllowedSimulationStage(stage)) {
    throw createStoreError('Invalid simulation stage', 400);
  }
  if (!simulation) {
    throw createStoreError('Unknown simulation id', 404);
  }
  if (
    stage === SIMULATION_STAGES.DAILY_ROTATION
    && simulation.surface === 'lab-route'
    && !simulation.dailyHref
  ) {
    throw createStoreError('Lab-route simulations need dailyHref before promotion', 400);
  }
}

export async function updateSimulationStage({
  id,
  stage,
  now = new Date(),
  catalogPath = SIMULATION_ADMIN_PATHS.simulationCatalogPath,
} = {}) {
  const catalog = await readSimulationCatalog(catalogPath);
  const simulation = findSimulation(catalog, id);
  validateStageTransition(simulation, stage);

  if (simulation.stage === stage) {
    return { catalog, simulation, changed: false };
  }

  const previousStage = simulation.stage;
  simulation.stage = stage;
  simulation.reviewStatus = stage === SIMULATION_STAGES.DAILY_ROTATION
    ? 'stable'
    : simulation.reviewStatus || 'watch';
  simulation.lastReviewedAt = now.toISOString().slice(0, 10);

  const nextCatalog = await writeSimulationCatalog(catalog, { catalogPath, now });
  await appendSimulationActivity({
    type: 'stage-change',
    id,
    from: previousStage,
    to: stage,
  }, { now });
  return { catalog: nextCatalog, simulation, changed: true };
}

export async function updateSimulationReviewStatus({
  id,
  reviewStatus,
  now = new Date(),
  catalogPath = SIMULATION_ADMIN_PATHS.simulationCatalogPath,
} = {}) {
  const catalog = await readSimulationCatalog(catalogPath);
  const simulation = findSimulation(catalog, id);
  if (!simulation) {
    throw createStoreError('Unknown simulation id', 404);
  }
  if (!isAllowedSimulationReviewStatus(reviewStatus)) {
    throw createStoreError('Invalid simulation review status', 400);
  }

  if (simulation.reviewStatus === reviewStatus) {
    return { catalog, simulation, changed: false };
  }

  const previousReviewStatus = simulation.reviewStatus;
  simulation.reviewStatus = reviewStatus;
  simulation.lastReviewedAt = now.toISOString().slice(0, 10);

  const nextCatalog = await writeSimulationCatalog(catalog, { catalogPath, now });
  await appendSimulationActivity({
    type: 'review-status-change',
    id,
    from: previousReviewStatus,
    to: reviewStatus,
  }, { now });
  return { catalog: nextCatalog, simulation, changed: true };
}

export async function createSimulationIssue({
  id,
  title = 'Untitled simulation issue',
  severity = 'medium',
  note = '',
  now = new Date(),
  catalogPath = SIMULATION_ADMIN_PATHS.simulationCatalogPath,
  issuesDir = SIMULATION_ADMIN_PATHS.simulationIssuesDir,
} = {}) {
  const catalog = await readSimulationCatalog(catalogPath);
  const simulation = findSimulation(catalog, id);
  if (!simulation) {
    throw createStoreError('Unknown simulation id', 404);
  }

  const reportedAt = now.toISOString();
  const issueTitle = markdownEscape(title || 'Untitled simulation issue');
  const issueSeverity = slugify(severity || 'medium');
  const issueNote = markdownEscape(note || '');
  const fileName = `${reportedAt.slice(0, 10)}-${slugify(simulation.id)}-${slugify(issueTitle)}.md`;
  const filePath = resolve(issuesDir, fileName);
  const relativePath = `docs/simulations/issues/${fileName}`;
  const content = [
    `# ${issueTitle}`,
    '',
    `- Simulation: ${simulation.name}`,
    `- ID: \`${simulation.id}\``,
    `- Severity: ${issueSeverity}`,
    '- Status: open',
    `- Reported: ${reportedAt}`,
    `- Launch path: ${simulation.launchPath || 'n/a'}`,
    '',
    '## Note',
    '',
    issueNote || 'No note provided.',
    '',
  ].join('\n');

  await mkdir(issuesDir, { recursive: true });
  await writeFile(filePath, content, 'utf8');
  await appendSimulationActivity({
    type: 'issue-created',
    id: simulation.id,
    issue: fileName,
    title: issueTitle,
    severity: issueSeverity,
  }, { now });

  return { filePath, relativePath, simulation };
}

export function getSimulationPreviewPaths(entry) {
  const previewBase = resolve(SIMULATION_ADMIN_PATHS.simulationPreviewsDir, entry.id);
  return {
    posterPath: resolve(previewBase, 'poster.png'),
    gifPath: resolve(previewBase, 'preview.gif'),
  };
}

export function getSimulationCaptureOptions(entry, fallback = {}) {
  const capture = entry.capture && typeof entry.capture === 'object' ? entry.capture : {};
  return {
    capturePath: capture.capturePath || capture.path || entry.dailyHref || entry.launchPath,
    delayMs: Number.isFinite(capture.delayMs) ? capture.delayMs : fallback.delayMs,
    readySelector: capture.readySelector || '',
    notes: capture.notes || '',
  };
}

function pathExists(path) {
  return existsSync(path);
}

async function readIssueFiles(issuesDir) {
  const names = await readdir(issuesDir).catch(() => []);
  const issueFiles = names.filter((name) => name.endsWith('.md'));
  const entries = await Promise.all(issueFiles.map(async (fileName) => {
    const filePath = resolve(issuesDir, fileName);
    const content = await readFile(filePath, 'utf8').catch(() => '');
    return { fileName, content };
  }));
  return entries;
}

function readIssueField(content, label) {
  const line = content.split('\n').find((item) => item.startsWith(`- ${label}:`));
  return line ? line.replace(`- ${label}:`, '').trim() : '';
}

function parseIssueFile({ fileName, content }) {
  const title = content.match(/^#\s+(.+)$/m)?.[1]?.trim() || fileName.replace(/\.md$/, '');
  const id = readIssueField(content, 'ID').replace(/^`|`$/g, '');
  return {
    fileName,
    relativePath: `docs/simulations/issues/${fileName}`,
    title,
    id,
    severity: readIssueField(content, 'Severity') || 'medium',
    status: readIssueField(content, 'Status') || 'open',
    reportedAt: readIssueField(content, 'Reported'),
  };
}

function getIssuesForSimulation(issueFiles, id) {
  return issueFiles
    .filter(({ fileName, content }) => (
      fileName.includes(`-${id}-`) || content.includes(`ID: \`${id}\``)
    ))
    .map(parseIssueFile)
    .sort((a, b) => String(b.reportedAt).localeCompare(String(a.reportedAt)));
}

function isOpenIssue(issue) {
  return !['resolved', 'closed'].includes(String(issue.status || '').toLowerCase());
}

export async function updateSimulationIssueStatus({
  fileName,
  status,
  now = new Date(),
  issuesDir = SIMULATION_ADMIN_PATHS.simulationIssuesDir,
} = {}) {
  const cleanFileName = basename(String(fileName || ''));
  if (!cleanFileName.endsWith('.md') || cleanFileName !== fileName) {
    throw createStoreError('Invalid issue file name', 400);
  }
  if (!['open', 'resolved'].includes(status)) {
    throw createStoreError('Invalid issue status', 400);
  }

  const filePath = resolve(issuesDir, cleanFileName);
  const current = await readFile(filePath, 'utf8').catch(() => null);
  if (!current) {
    throw createStoreError('Unknown issue file', 404);
  }

  const next = current.includes('- Status:')
    ? current.replace(/^- Status:.*$/m, `- Status: ${status}`)
    : current.replace(/^(# .+\n)/, `$1\n- Status: ${status}\n`);
  await writeFile(filePath, next, 'utf8');
  const issue = parseIssueFile({ fileName: cleanFileName, content: next });
  await appendSimulationActivity({
    type: 'issue-status-change',
    id: issue.id,
    issue: cleanFileName,
    status,
  }, { now });
  return { filePath, relativePath: `docs/simulations/issues/${cleanFileName}`, status };
}

export async function getSimulationDashboardStatus({
  catalogPath = SIMULATION_ADMIN_PATHS.simulationCatalogPath,
  issuesDir = SIMULATION_ADMIN_PATHS.simulationIssuesDir,
} = {}) {
  const catalog = await readSimulationCatalog(catalogPath);
  const issueFiles = await readIssueFiles(issuesDir);
  const activityEntries = await readSimulationActivity();
  const simulations = {};

  (catalog.simulations || []).forEach((entry) => {
    const blockers = [];
    const { posterPath, gifPath } = getSimulationPreviewPaths(entry);
    const posterPresent = pathExists(posterPath);
    const gifPresent = pathExists(gifPath);
    const pitchPresent = entry.pitchPath
      ? pathExists(resolve(SIMULATION_ADMIN_PATHS.repoRoot, entry.pitchPath))
      : null;

    if (entry.stage !== SIMULATION_STAGES.HIDDEN) {
      if (!posterPresent) blockers.push('Missing preview poster');
      if (!gifPresent) blockers.push('Missing preview GIF');
    }
    if (entry.stage === SIMULATION_STAGES.AUTOMATION_CANDIDATE && !entry.pitchPath) {
      blockers.push('Missing pitch path');
    }
    if (entry.pitchPath && !pitchPresent) {
      blockers.push('Pitch file missing');
    }
    if (entry.stage === SIMULATION_STAGES.DAILY_ROTATION && entry.surface === 'lab-route' && !entry.dailyHref) {
      blockers.push('Missing daily href');
    }

    const issues = getIssuesForSimulation(issueFiles, entry.id);
    const issueCount = issues.filter(isOpenIssue).length;
    const activity = activityEntries
      .filter((event) => event.id === entry.id)
      .slice(-8)
      .reverse();
    simulations[entry.id] = {
      issueCount,
      issues,
      activity,
      preview: {
        poster: posterPresent,
        animated: gifPresent,
      },
      pitch: entry.pitchPath
        ? {
          path: entry.pitchPath,
          present: Boolean(pitchPresent),
        }
        : null,
      validation: blockers.length ? 'warnings' : 'passing',
      blockers,
    };
  });

  return {
    ok: true,
    generatedAt: new Date().toISOString(),
    simulations,
  };
}
