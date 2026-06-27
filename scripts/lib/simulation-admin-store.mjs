import { appendFile, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
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
  simulationPitchesDir: resolve(repoRoot, 'docs/simulations/pitches'),
  simulationLabDir: resolve(reactAppRoot, 'lab'),
  simulationEntriesDir: resolve(reactAppRoot, 'src/entries'),
  simulationRoutesDir: resolve(reactAppRoot, 'src/routes'),
  simulationPublicConfigDir: resolve(reactAppRoot, 'public/config'),
  siteAppPath: resolve(reactAppRoot, 'src/components/app/SiteApp.jsx'),
  routeRegistryPath: resolve(reactAppRoot, 'src/lib/routes.js'),
  viteConfigPath: resolve(reactAppRoot, 'vite.config.js'),
  constantsPath: resolve(reactAppRoot, 'src/legacy/modules/core/constants.js'),
});

const DEDICATED_LAB_ROUTE_DELETION_RULES = Object.freeze({
  'beach-ball-room': {
    routeDir: 'beach-ball-room',
    routeView: 'getBeachBallRoomRouteView',
    routeRuntime: 'BEACH_BALL_ROOM_ROUTE_RUNTIME',
    importPath: '../../routes/beach-ball-room/BeachBallRoomRoute.jsx',
  },
  'flock-of-birds': {
    routeDir: 'flock-of-birds',
    routeView: 'getFlockOfBirdsRouteView',
    routeRuntime: 'FLOCK_OF_BIRDS_ROUTE_RUNTIME',
    importPath: '../../routes/flock-of-birds/FlockOfBirdsRoute.jsx',
    hasViteConfigApi: true,
  },
  'wall-repel': {
    routeDir: 'wall-repel',
    routeView: 'getWallRepelRouteView',
    routeRuntime: 'WALL_REPEL_ROUTE_RUNTIME',
    importPath: '../../routes/wall-repel/WallRepelRoute.jsx',
    hasViteConfigApi: true,
  },
  'mineral-growth': {
    routeDir: 'mineral-growth',
    routeView: 'getMineralGrowthRouteView',
    routeRuntime: 'MINERAL_GROWTH_ROUTE_RUNTIME',
    importPath: '../../routes/mineral-growth/MineralGrowthRoute.jsx',
    hasViteConfigApi: true,
  },
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

function createStoreError(message, statusCode, details = {}) {
  const error = new Error(message);
  error.statusCode = statusCode;
  Object.assign(error, details);
  return error;
}

function toRepoRelative(filePath) {
  return relative(repoRoot, filePath).replace(/\\/g, '/') || '.';
}

function isWithinPath(parentPath, childPath) {
  const childRelativePath = relative(parentPath, childPath);
  return childRelativePath === ''
    || (!childRelativePath.startsWith('..') && !childRelativePath.startsWith('/'));
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildSimulationCleanupPrompt(simulation, plan) {
  const blockers = plan.blockers?.length
    ? plan.blockers.map((blocker) => `- ${blocker}`).join('\n')
    : '- No blocker details were returned.';
  return [
    'In /Users/alexanderbeck/Projects-code/Alexander Beck Studio Website, safely remove this simulation from the repo.',
    '',
    `Simulation: ${simulation?.name || plan.id}`,
    `ID: ${plan.id}`,
    `Stage: ${simulation?.stage || 'unknown'}`,
    '',
    'The dashboard blocked automatic deletion because ownership is ambiguous:',
    blockers,
    '',
    'Remove only files and route/config wiring uniquely owned by this simulation, keep shared concept/runtime files intact, then run:',
    'npm run sim:validate',
    'npm run lint --prefix react-app/app',
    'npm run build',
  ].join('\n');
}

function addDeleteTarget(plan, kind, filePath, label) {
  if (!filePath || !isWithinPath(repoRoot, filePath)) return;
  plan.deleteTargets.push({
    kind,
    path: toRepoRelative(filePath),
    label,
    exists: pathExists(filePath),
  });
}

function addSourceEdit(plan, filePath, description) {
  if (!filePath || !isWithinPath(repoRoot, filePath)) return;
  plan.sourceEdits.push({
    path: toRepoRelative(filePath),
    description,
  });
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

function resolveRepoOwnedPitchPath(pitchPath) {
  if (!pitchPath) return null;
  const filePath = resolve(repoRoot, pitchPath);
  return isWithinPath(SIMULATION_ADMIN_PATHS.simulationPitchesDir, filePath) ? filePath : null;
}

function resolveSimulationConfigPath(configPath) {
  if (!configPath || !String(configPath).startsWith('/config/')) return null;
  const filePath = resolve(
    SIMULATION_ADMIN_PATHS.simulationPublicConfigDir,
    String(configPath).replace(/^\/config\//, ''),
  );
  return isWithinPath(SIMULATION_ADMIN_PATHS.simulationPublicConfigDir, filePath) ? filePath : null;
}

function resolveSimulationLabHtmlPath(simulation) {
  const launchPath = String(simulation?.launchPath || '');
  if (!launchPath.startsWith('/lab/') || !launchPath.endsWith('.html')) return null;
  const filePath = resolve(reactAppRoot, launchPath.replace(/^\//, ''));
  return isWithinPath(SIMULATION_ADMIN_PATHS.simulationLabDir, filePath) ? filePath : null;
}

async function resolveSimulationEntryPath(htmlPath) {
  if (!htmlPath || !pathExists(htmlPath)) return null;
  const html = await readFile(htmlPath, 'utf8');
  const entryMatch = html.match(/<script\s+type="module"\s+src="\/src\/entries\/([^"]+\.jsx)">/);
  if (!entryMatch) return null;
  const filePath = resolve(SIMULATION_ADMIN_PATHS.simulationEntriesDir, entryMatch[1]);
  return isWithinPath(SIMULATION_ADMIN_PATHS.simulationEntriesDir, filePath) ? filePath : null;
}

async function replaceRequiredText(filePath, pattern, replacement, description) {
  const current = await readFile(filePath, 'utf8');
  const next = current.replace(pattern, replacement);
  if (next === current) {
    throw createStoreError(`Could not apply delete edit: ${description}`, 409);
  }
  await writeFile(filePath, next, 'utf8');
}

async function removeRouteRegistryEntry(id) {
  await replaceRequiredText(
    SIMULATION_ADMIN_PATHS.routeRegistryPath,
    new RegExp(`\\n  '${escapeRegExp(id)}': \\{[\\s\\S]*?\\n  \\},`),
    '',
    `remove ${id} from route registry`,
  );
}

async function removeViteInputEntry(id) {
  await replaceRequiredText(
    SIMULATION_ADMIN_PATHS.viteConfigPath,
    new RegExp(`\\n\\s+'lab/${escapeRegExp(id)}': resolve\\(__dirname, 'lab/${escapeRegExp(id)}\\.html'\\),`),
    '',
    `remove ${id} from Vite inputs`,
  );
}

async function removeSiteAppRouteEntries(id, rule) {
  await replaceRequiredText(
    SIMULATION_ADMIN_PATHS.siteAppPath,
    new RegExp(`\\nimport \\{ ${escapeRegExp(rule.routeView)}, ${escapeRegExp(rule.routeRuntime)} \\} from '${escapeRegExp(rule.importPath)}';`),
    '',
    `remove ${id} route import`,
  );
  await replaceRequiredText(
    SIMULATION_ADMIN_PATHS.siteAppPath,
    new RegExp(`\\n  '${escapeRegExp(id)}': ${escapeRegExp(rule.routeView)},?`),
    '',
    `remove ${id} route view map entry`,
  );
  await replaceRequiredText(
    SIMULATION_ADMIN_PATHS.siteAppPath,
    new RegExp(`\\n  '${escapeRegExp(id)}': ${escapeRegExp(rule.routeRuntime)},?`),
    '',
    `remove ${id} route runtime map entry`,
  );
}

async function removeSimulationActivityEntries(id) {
  const activityPath = SIMULATION_ADMIN_PATHS.simulationActivityPath;
  const raw = await readFile(activityPath, 'utf8').catch(() => '');
  if (!raw) return;

  const retainedLines = raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      try {
        const event = JSON.parse(line);
        return event?.id !== id;
      } catch {
        return true;
      }
    });
  await writeFile(activityPath, retainedLines.length ? `${retainedLines.join('\n')}\n` : '', 'utf8');
}

async function removeDeleteTargets(deleteTargets) {
  for (const target of deleteTargets) {
    const filePath = resolve(repoRoot, target.path);
    if (!isWithinPath(repoRoot, filePath)) {
      throw createStoreError(`Refusing to delete outside repo: ${target.path}`, 409);
    }
    await rm(filePath, {
      recursive: target.kind === 'directory',
      force: true,
    });
  }
}

export async function createSimulationDeletionPlan({
  id,
  catalogPath = SIMULATION_ADMIN_PATHS.simulationCatalogPath,
  issuesDir = SIMULATION_ADMIN_PATHS.simulationIssuesDir,
} = {}) {
  const simulationId = String(id || '').trim();
  if (!simulationId) {
    throw createStoreError('Missing simulation id', 400);
  }

  const catalog = await readSimulationCatalog(catalogPath);
  const simulation = findSimulation(catalog, simulationId);
  if (!simulation) {
    throw createStoreError('Unknown simulation id', 404);
  }

  const plan = {
    id: simulation.id,
    simulation: {
      id: simulation.id,
      name: simulation.name,
      stage: simulation.stage,
      surface: simulation.surface,
      launchPath: simulation.launchPath,
    },
    allowed: true,
    blocked: false,
    blockers: [],
    sourceEdits: [],
    deleteTargets: [],
    cleanupPrompt: '',
  };

  function block(reason) {
    plan.allowed = false;
    plan.blocked = true;
    plan.blockers.push(reason);
  }

  if (simulation.stage === SIMULATION_STAGES.DAILY_ROTATION) {
    block('Move this simulation to Collection before deleting it. Daily rotation entries are protected.');
  }

  if (simulation.surface !== 'lab-route') {
    block(`${simulation.surface || 'This surface'} is shared by the site runtime, so automatic source ownership is ambiguous.`);
  }

  const routeRule = DEDICATED_LAB_ROUTE_DELETION_RULES[simulation.id];
  if (!routeRule) {
    block('No dedicated lab-route deletion rule exists for this simulation. Shared concept routes need manual cleanup.');
  } else if (routeRule.hasViteConfigApi) {
    block('This route has a dedicated Vite config API. Automatic deletion is blocked until that route-specific API cleanup is implemented.');
  }

  const routeDir = routeRule
    ? resolve(SIMULATION_ADMIN_PATHS.simulationRoutesDir, routeRule.routeDir)
    : null;
  if (routeRule && !pathExists(routeDir)) {
    block(`Expected owned route folder is missing: ${toRepoRelative(routeDir)}`);
  }

  const labHtmlPath = resolveSimulationLabHtmlPath(simulation);
  if (routeRule && !labHtmlPath) {
    block('Could not resolve a repo-owned lab HTML file from launchPath.');
  }
  const entryPath = await resolveSimulationEntryPath(labHtmlPath);
  if (routeRule && labHtmlPath && !entryPath) {
    block('Could not resolve the lab entry file from the lab HTML file.');
  }

  if (plan.blocked) {
    plan.cleanupPrompt = buildSimulationCleanupPrompt(simulation, plan);
    return plan;
  }

  addSourceEdit(plan, SIMULATION_ADMIN_PATHS.simulationCatalogPath, 'Remove catalog entry and update catalog timestamp.');
  addSourceEdit(plan, SIMULATION_ADMIN_PATHS.routeRegistryPath, 'Remove route registry entry and aliases.');
  addSourceEdit(plan, SIMULATION_ADMIN_PATHS.viteConfigPath, 'Remove Vite build input for the lab page.');
  addSourceEdit(plan, SIMULATION_ADMIN_PATHS.siteAppPath, 'Remove SiteApp route import, view map, and runtime map entries.');
  if (pathExists(SIMULATION_ADMIN_PATHS.simulationActivityPath)) {
    addSourceEdit(plan, SIMULATION_ADMIN_PATHS.simulationActivityPath, 'Remove matching activity lines.');
  }

  addDeleteTarget(
    plan,
    'directory',
    resolve(SIMULATION_ADMIN_PATHS.simulationPreviewsDir, simulation.id),
    'Preview poster and hover GIF directory.',
  );
  addDeleteTarget(plan, 'file', labHtmlPath, 'Lab HTML entry.');
  addDeleteTarget(plan, 'file', entryPath, 'React entry file.');
  addDeleteTarget(plan, 'directory', routeDir, 'Dedicated route source folder.');

  const pitchPath = resolveRepoOwnedPitchPath(simulation.pitchPath);
  if (pitchPath) addDeleteTarget(plan, 'file', pitchPath, 'Repo-owned pitch document.');

  const configPath = resolveSimulationConfigPath(simulation.configPath);
  if (configPath) addDeleteTarget(plan, 'file', configPath, 'Simulation config file.');

  const issueFiles = getIssuesForSimulation(await readIssueFiles(issuesDir), simulation.id);
  issueFiles.forEach((issue) => {
    addDeleteTarget(
      plan,
      'file',
      resolve(issuesDir, issue.fileName),
      `Issue note: ${issue.title}`,
    );
  });

  return plan;
}

export async function deleteSimulation({
  id,
  confirmId,
  now = new Date(),
  catalogPath = SIMULATION_ADMIN_PATHS.simulationCatalogPath,
} = {}) {
  const plan = await createSimulationDeletionPlan({ id, catalogPath });
  if (plan.blocked) {
    throw createStoreError(plan.blockers[0] || 'Simulation deletion is blocked', 409, { plan });
  }
  if (String(confirmId || '').trim() !== plan.id) {
    throw createStoreError('Typed confirmation does not match simulation id', 400, { plan });
  }

  const routeRule = DEDICATED_LAB_ROUTE_DELETION_RULES[plan.id];
  await removeRouteRegistryEntry(plan.id);
  await removeViteInputEntry(plan.id);
  await removeSiteAppRouteEntries(plan.id, routeRule);

  const catalog = await readSimulationCatalog(catalogPath);
  const nextCatalog = {
    ...catalog,
    simulations: (catalog.simulations || []).filter((entry) => entry.id !== plan.id),
  };
  await writeSimulationCatalog(nextCatalog, { catalogPath, now });
  await removeSimulationActivityEntries(plan.id);
  await removeDeleteTargets(plan.deleteTargets);

  return { plan, deletedId: plan.id };
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
