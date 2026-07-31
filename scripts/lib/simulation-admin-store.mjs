import { readdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { basename, dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  applyLocalFileTransaction,
  runSerializedLocalFileOperation,
} from './local-file-transaction.mjs';

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
  routeRegistryPath: resolve(reactAppRoot, 'src/lib/route-manifest.js'),
  viteConfigPath: resolve(reactAppRoot, 'vite.config.js'),
  viteDevAdminPluginPath: resolve(reactAppRoot, 'vite.dev-admin-plugin.js'),
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
    hasDevAdminPluginApi: true,
  },
  'repel-room': {
    routeDir: 'repel-room',
    routeView: 'getRepelRoomRouteView',
    routeRuntime: 'REPEL_ROOM_ROUTE_RUNTIME',
    importPath: '../../routes/repel-room/RepelRoomRoute.jsx',
    hasDevAdminPluginApi: true,
  },
  'wall-repel': {
    routeDir: 'repel-room',
    routeView: 'getRepelRoomRouteView',
    routeRuntime: 'REPEL_ROOM_ROUTE_RUNTIME',
    importPath: '../../routes/repel-room/RepelRoomRoute.jsx',
    hasDevAdminPluginApi: true,
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

function toRepoRelative(filePath, rootPath = repoRoot) {
  return relative(rootPath, filePath).replace(/\\/g, '/') || '.';
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

function addDeleteTarget(plan, kind, filePath, label, rootPath = repoRoot) {
  if (!filePath || !isWithinPath(rootPath, filePath)) return;
  plan.deleteTargets.push({
    kind,
    path: toRepoRelative(filePath, rootPath),
    label,
    exists: pathExists(filePath),
  });
}

function addSourceEdit(plan, filePath, description, rootPath = repoRoot) {
  if (!filePath || !isWithinPath(rootPath, filePath)) return;
  plan.sourceEdits.push({
    path: toRepoRelative(filePath, rootPath),
    description,
  });
}

async function prepareSimulationActivityAppend(
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
  const current = await readFile(activityPath, 'utf8').catch((error) => {
    if (error?.code === 'ENOENT') return '';
    throw error;
  });
  const prefix = current && !current.endsWith('\n') ? `${current}\n` : current;
  return {
    activity,
    replacement: {
      path: activityPath,
      content: `${prefix}${JSON.stringify(activity)}\n`,
    },
  };
}

function serializeSimulationCatalog(catalog, now, touchUpdatedAt = true) {
  const nextCatalog = { ...catalog };
  if (touchUpdatedAt) nextCatalog.updatedAt = now.toISOString().slice(0, 10);
  return {
    nextCatalog,
    content: `${JSON.stringify(nextCatalog, null, 2)}\n`,
  };
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
  activityPath = SIMULATION_ADMIN_PATHS.simulationActivityPath,
  transactionRoot = repoRoot,
  transactionIo,
} = {}) {
  return runSerializedLocalFileOperation(async () => {
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

    const { nextCatalog, content } = serializeSimulationCatalog(catalog, now);
    const { replacement: activityReplacement } = await prepareSimulationActivityAppend({
      type: 'stage-change',
      id,
      from: previousStage,
      to: stage,
    }, { now, activityPath });
    await applyLocalFileTransaction({
      rootPath: transactionRoot,
      replacements: [
        { path: catalogPath, content },
        activityReplacement,
      ],
    }, { io: transactionIo });
    return { catalog: nextCatalog, simulation, changed: true };
  });
}

export async function updateSimulationReviewStatus({
  id,
  reviewStatus,
  now = new Date(),
  catalogPath = SIMULATION_ADMIN_PATHS.simulationCatalogPath,
  activityPath = SIMULATION_ADMIN_PATHS.simulationActivityPath,
  transactionRoot = repoRoot,
  transactionIo,
} = {}) {
  return runSerializedLocalFileOperation(async () => {
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

    const { nextCatalog, content } = serializeSimulationCatalog(catalog, now);
    const { replacement: activityReplacement } = await prepareSimulationActivityAppend({
      type: 'review-status-change',
      id,
      from: previousReviewStatus,
      to: reviewStatus,
    }, { now, activityPath });
    await applyLocalFileTransaction({
      rootPath: transactionRoot,
      replacements: [
        { path: catalogPath, content },
        activityReplacement,
      ],
    }, { io: transactionIo });
    return { catalog: nextCatalog, simulation, changed: true };
  });
}

export async function createSimulationIssue({
  id,
  title = 'Untitled simulation issue',
  severity = 'medium',
  note = '',
  now = new Date(),
  catalogPath = SIMULATION_ADMIN_PATHS.simulationCatalogPath,
  issuesDir = SIMULATION_ADMIN_PATHS.simulationIssuesDir,
  activityPath = SIMULATION_ADMIN_PATHS.simulationActivityPath,
  transactionRoot = repoRoot,
  transactionIo,
} = {}) {
  return runSerializedLocalFileOperation(async () => {
    const catalog = await readSimulationCatalog(catalogPath);
    const simulation = findSimulation(catalog, id);
    if (!simulation) {
      throw createStoreError('Unknown simulation id', 404);
    }

    const reportedAt = now.toISOString();
    const issueTitle = markdownEscape(title || 'Untitled simulation issue');
    const issueSeverity = slugify(severity || 'medium');
    const issueNote = markdownEscape(note || '');
    const fileNameBase = `${reportedAt.slice(0, 10)}-${slugify(simulation.id)}-${slugify(issueTitle)}`;
    let fileName = `${fileNameBase}.md`;
    let filePath = resolve(issuesDir, fileName);
    for (let suffix = 2; pathExists(filePath); suffix += 1) {
      fileName = `${fileNameBase}-${suffix}.md`;
      filePath = resolve(issuesDir, fileName);
    }
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
    const { replacement: activityReplacement } = await prepareSimulationActivityAppend({
      type: 'issue-created',
      id: simulation.id,
      issue: fileName,
      title: issueTitle,
      severity: issueSeverity,
    }, { now, activityPath });

    await applyLocalFileTransaction({
      rootPath: transactionRoot,
      replacements: [
        { path: filePath, content },
        activityReplacement,
      ],
    }, { io: transactionIo });

    return { filePath, relativePath, simulation };
  });
}

export function getSimulationPreviewPaths(entry) {
  const previewBase = resolve(SIMULATION_ADMIN_PATHS.simulationPreviewsDir, entry.previewId || entry.id);
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
  activityPath = SIMULATION_ADMIN_PATHS.simulationActivityPath,
  transactionRoot = repoRoot,
  transactionIo,
} = {}) {
  const cleanFileName = basename(String(fileName || ''));
  if (!cleanFileName.endsWith('.md') || cleanFileName !== fileName) {
    throw createStoreError('Invalid issue file name', 400);
  }
  if (!['open', 'resolved'].includes(status)) {
    throw createStoreError('Invalid issue status', 400);
  }

  return runSerializedLocalFileOperation(async () => {
    const filePath = resolve(issuesDir, cleanFileName);
    const current = await readFile(filePath, 'utf8').catch(() => null);
    if (!current) {
      throw createStoreError('Unknown issue file', 404);
    }

    const next = current.includes('- Status:')
      ? current.replace(/^- Status:.*$/m, `- Status: ${status}`)
      : current.replace(/^(# .+\n)/, `$1\n- Status: ${status}\n`);
    const issue = parseIssueFile({ fileName: cleanFileName, content: next });
    const { replacement: activityReplacement } = await prepareSimulationActivityAppend({
      type: 'issue-status-change',
      id: issue.id,
      issue: cleanFileName,
      status,
    }, { now, activityPath });
    await applyLocalFileTransaction({
      rootPath: transactionRoot,
      replacements: [
        { path: filePath, content: next },
        activityReplacement,
      ],
    }, { io: transactionIo });
    return { filePath, relativePath: `docs/simulations/issues/${cleanFileName}`, status };
  });
}

function resolveRepoOwnedPitchPath(pitchPath, paths = SIMULATION_ADMIN_PATHS) {
  if (!pitchPath) return null;
  const filePath = resolve(paths.repoRoot, pitchPath);
  return isWithinPath(paths.simulationPitchesDir, filePath) ? filePath : null;
}

function resolveSimulationConfigPath(configPath, paths = SIMULATION_ADMIN_PATHS) {
  if (!configPath || !String(configPath).startsWith('/config/')) return null;
  const filePath = resolve(
    paths.simulationPublicConfigDir,
    String(configPath).replace(/^\/config\//, ''),
  );
  return isWithinPath(paths.simulationPublicConfigDir, filePath) ? filePath : null;
}

function resolveSimulationLabHtmlPath(simulation, paths = SIMULATION_ADMIN_PATHS) {
  const launchPath = String(simulation?.launchPath || '');
  if (!launchPath.startsWith('/lab/') || !launchPath.endsWith('.html')) return null;
  const filePath = resolve(paths.reactAppRoot, launchPath.replace(/^\//, ''));
  return isWithinPath(paths.simulationLabDir, filePath) ? filePath : null;
}

async function resolveSimulationEntryPath(htmlPath, paths = SIMULATION_ADMIN_PATHS) {
  if (!htmlPath || !pathExists(htmlPath)) return null;
  const html = await readFile(htmlPath, 'utf8');
  const entryMatch = html.match(/<script\s+type="module"\s+src="\/src\/entries\/([^"]+\.jsx)">/);
  if (!entryMatch) return null;
  const filePath = resolve(paths.simulationEntriesDir, entryMatch[1]);
  return isWithinPath(paths.simulationEntriesDir, filePath) ? filePath : null;
}

function replaceRequiredText(current, pattern, replacement, description) {
  const next = current.replace(pattern, replacement);
  if (next === current) {
    throw createStoreError(`Could not apply delete edit: ${description}`, 409);
  }
  return next;
}

async function prepareSimulationRouteDeletionSourceEdits({
  id,
  routeRegistryPath = SIMULATION_ADMIN_PATHS.routeRegistryPath,
  viteConfigPath = SIMULATION_ADMIN_PATHS.viteConfigPath,
  siteAppPath = SIMULATION_ADMIN_PATHS.siteAppPath,
}) {
  const rule = DEDICATED_LAB_ROUTE_DELETION_RULES[id];
  if (!rule) {
    throw createStoreError(`No dedicated lab-route deletion rule exists for ${id}`, 409);
  }

  const [routeRegistrySource, viteConfigSource, siteAppSource] = await Promise.all([
    readFile(routeRegistryPath, 'utf8'),
    readFile(viteConfigPath, 'utf8'),
    readFile(siteAppPath, 'utf8'),
  ]);
  const nextRouteRegistrySource = replaceRequiredText(
    routeRegistrySource,
    new RegExp(`\\n  '${escapeRegExp(id)}': \\{[\\s\\S]*?\\n  \\},`),
    '',
    `remove ${id} from route manifest`,
  );
  const nextViteConfigSource = replaceRequiredText(
    viteConfigSource,
    new RegExp(`\\n\\s+'lab/${escapeRegExp(id)}': resolve\\(__dirname, 'lab/${escapeRegExp(id)}\\.html'\\),`),
    '',
    `remove ${id} from Vite inputs`,
  );
  const withoutRouteImport = replaceRequiredText(
    siteAppSource,
    new RegExp(`\\nimport\\s+\\{\\s*${escapeRegExp(rule.routeView)}\\s*,\\s*${escapeRegExp(rule.routeRuntime)}\\s*\\}\\s+from\\s+'${escapeRegExp(rule.importPath)}';`),
    '',
    `remove ${id} route import`,
  );
  const nextSiteAppSource = replaceRequiredText(
    withoutRouteImport,
    new RegExp(`\\n  '${escapeRegExp(id)}':\\s*defineRouteDescriptor\\(\\s*'${escapeRegExp(id)}'\\s*,\\s*\\{\\s*getView:\\s*${escapeRegExp(rule.routeView)}\\s*,\\s*runtime:\\s*${escapeRegExp(rule.routeRuntime)}\\s*,?\\s*\\}\\s*\\),`),
    '',
    `remove ${id} SiteApp descriptor`,
  );

  return [
    { path: routeRegistryPath, content: nextRouteRegistrySource },
    { path: viteConfigPath, content: nextViteConfigSource },
    { path: siteAppPath, content: nextSiteAppSource },
  ];
}

export async function applySimulationRouteDeletionSourceEdits(options) {
  const {
    transactionIo,
  } = options || {};
  const editPaths = [
    options?.routeRegistryPath || SIMULATION_ADMIN_PATHS.routeRegistryPath,
    options?.viteConfigPath || SIMULATION_ADMIN_PATHS.viteConfigPath,
    options?.siteAppPath || SIMULATION_ADMIN_PATHS.siteAppPath,
  ];
  const rootPath = options?.rootPath
    || (editPaths.every((filePath) => isWithinPath(repoRoot, filePath))
      ? repoRoot
      : dirname(editPaths[0]));
  return runSerializedLocalFileOperation(async () => {
    const edits = await prepareSimulationRouteDeletionSourceEdits(options);
    await applyLocalFileTransaction({
      rootPath,
      replacements: edits,
    }, { io: transactionIo });
    return edits.map((edit) => edit.path);
  });
}

async function prepareSimulationActivityReplacement(id, activityPath) {
  const raw = await readFile(activityPath, 'utf8').catch(() => '');
  if (!raw) return null;

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
  return {
    path: activityPath,
    content: retainedLines.length ? `${retainedLines.join('\n')}\n` : '',
  };
}

export async function createSimulationDeletionPlan({
  id,
  paths = SIMULATION_ADMIN_PATHS,
  catalogPath = paths.simulationCatalogPath,
  issuesDir = paths.simulationIssuesDir,
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
  } else if (routeRule.hasDevAdminPluginApi) {
    block('This route has a dedicated Vite dev/admin plugin API. Automatic deletion is blocked until that route-specific API cleanup is implemented.');
  }

  const routeDir = routeRule
    ? resolve(paths.simulationRoutesDir, routeRule.routeDir)
    : null;
  if (routeRule && !pathExists(routeDir)) {
    block(`Expected owned route folder is missing: ${toRepoRelative(routeDir, paths.repoRoot)}`);
  }

  const labHtmlPath = resolveSimulationLabHtmlPath(simulation, paths);
  if (routeRule && !labHtmlPath) {
    block('Could not resolve a repo-owned lab HTML file from launchPath.');
  }
  const entryPath = await resolveSimulationEntryPath(labHtmlPath, paths);
  if (routeRule && labHtmlPath && !entryPath) {
    block('Could not resolve the lab entry file from the lab HTML file.');
  }

  if (plan.blocked) {
    plan.cleanupPrompt = buildSimulationCleanupPrompt(simulation, plan);
    return plan;
  }

  addSourceEdit(plan, catalogPath, 'Remove catalog entry and update catalog timestamp.', paths.repoRoot);
  addSourceEdit(plan, paths.routeRegistryPath, 'Remove route manifest entry and aliases.', paths.repoRoot);
  addSourceEdit(plan, paths.viteConfigPath, 'Remove Vite build input for the lab page.', paths.repoRoot);
  addSourceEdit(plan, paths.siteAppPath, 'Remove the SiteApp route import and combined descriptor.', paths.repoRoot);
  if (pathExists(paths.simulationActivityPath)) {
    addSourceEdit(plan, paths.simulationActivityPath, 'Remove matching activity lines.', paths.repoRoot);
  }

  addDeleteTarget(
    plan,
    'directory',
    resolve(paths.simulationPreviewsDir, simulation.id),
    'Preview poster and hover GIF directory.',
    paths.repoRoot,
  );
  addDeleteTarget(plan, 'file', labHtmlPath, 'Lab HTML entry.', paths.repoRoot);
  addDeleteTarget(plan, 'file', entryPath, 'React entry file.', paths.repoRoot);
  addDeleteTarget(plan, 'directory', routeDir, 'Dedicated route source folder.', paths.repoRoot);

  const pitchPath = resolveRepoOwnedPitchPath(simulation.pitchPath, paths);
  if (pitchPath) addDeleteTarget(plan, 'file', pitchPath, 'Repo-owned pitch document.', paths.repoRoot);

  const configPath = resolveSimulationConfigPath(simulation.configPath, paths);
  if (configPath) addDeleteTarget(plan, 'file', configPath, 'Simulation config file.', paths.repoRoot);

  const issueFiles = getIssuesForSimulation(await readIssueFiles(issuesDir), simulation.id);
  issueFiles.forEach((issue) => {
    addDeleteTarget(
      plan,
      'file',
      resolve(issuesDir, issue.fileName),
      `Issue note: ${issue.title}`,
      paths.repoRoot,
    );
  });

  return plan;
}

export async function deleteSimulation({
  id,
  confirmId,
  now = new Date(),
  paths = SIMULATION_ADMIN_PATHS,
  catalogPath = paths.simulationCatalogPath,
  transactionIo,
} = {}) {
  return runSerializedLocalFileOperation(async () => {
    const plan = await createSimulationDeletionPlan({ id, catalogPath, paths });
    if (plan.blocked) {
      throw createStoreError(plan.blockers[0] || 'Simulation deletion is blocked', 409, { plan });
    }
    if (String(confirmId || '').trim() !== plan.id) {
      throw createStoreError('Typed confirmation does not match simulation id', 400, { plan });
    }

    const routeEdits = await prepareSimulationRouteDeletionSourceEdits({
      id: plan.id,
      routeRegistryPath: paths.routeRegistryPath,
      viteConfigPath: paths.viteConfigPath,
      siteAppPath: paths.siteAppPath,
    });
    const catalog = await readSimulationCatalog(catalogPath);
    const nextCatalog = {
      ...catalog,
      updatedAt: now.toISOString().slice(0, 10),
      simulations: (catalog.simulations || []).filter((entry) => entry.id !== plan.id),
    };
    const activityReplacement = await prepareSimulationActivityReplacement(
      plan.id,
      paths.simulationActivityPath,
    );
    const replacements = [
      ...routeEdits,
      { path: catalogPath, content: `${JSON.stringify(nextCatalog, null, 2)}\n` },
      ...(activityReplacement ? [activityReplacement] : []),
    ];
    const deletions = plan.deleteTargets.map((target) => ({
      ...target,
      path: resolve(paths.repoRoot, target.path),
    }));

    await applyLocalFileTransaction({
      rootPath: paths.repoRoot,
      replacements,
      deletions,
    }, { io: transactionIo });

    return { plan, deletedId: plan.id };
  });
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
