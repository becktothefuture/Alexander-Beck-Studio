import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const PORTFOLIO_ROOT = path.join(REPO_ROOT, 'docs', 'portfolio');

const errors = [];
const warnings = [];

const REQUIRED_PATHS = [
  'README.md',
  'SCHEMA.md',
  'EXTRACTION-WORKFLOW.md',
  'router.yaml',
  'catalog.json',
  'sources/index.json',
  'sources/raw/README.md',
  'sources/extracted/README.md',
  'logs/decision-log.md',
  'logs/ingestion-log.md',
  'drafts/README.md',
  'templates/source-record.json',
  'templates/project-record.json',
  'templates/extraction-report.md',
  'templates/interview-round.md',
];

const PROJECT_STATUSES = new Set(['active', 'on_hold', 'archived']);
const COPY_ELIGIBILITY = new Set(['blocked_missing_facts', 'blocked_on_hold', 'ready_for_draft', 'approved']);
const EXPECTED_PROJECT_IDS = new Set([
  'aha',
  'sp-global',
  'bentley',
  'yoti',
  'sunexpress',
  'personal-website',
  'mccann',
  'swiss-re',
  'impressions',
  'prokeyboard',
  'gen-digital',
  'tourism-ireland',
]);
const CLAIM_CATEGORIES = new Set([
  'project_identity',
  'brief',
  'audience',
  'role',
  'team',
  'timeline',
  'delivery_status',
  'scope',
  'hands_on',
  'constraint',
  'decision',
  'collaboration',
  'outcome',
  'reflection',
  'anecdote',
  'permission',
  'media',
]);
const REQUIRED_COPY_CATEGORIES = [
  'brief',
  'audience',
  'role',
  'team',
  'timeline',
  'delivery_status',
  'hands_on',
  'constraint',
  'decision',
  'collaboration',
  'outcome',
  'permission',
];
const CLAIM_STATUSES = new Set(['candidate', 'confirmed', 'disputed', 'rejected', 'withheld']);
const CONFIDENCE_VALUES = new Set(['low', 'medium', 'high']);
const SENSITIVITY_VALUES = new Set(['public', 'internal', 'confidential', 'personal', 'restricted']);
const QUESTION_STATUSES = new Set(['open', 'deferred', 'resolved', 'discarded']);

function relative(filePath) {
  return path.relative(REPO_ROOT, filePath);
}

async function exists(filePath) {
  return fs.access(filePath).then(() => true).catch(() => false);
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch (error) {
    errors.push(`${relative(filePath)}: ${error.message}`);
    return null;
  }
}

async function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

for (const requiredPath of REQUIRED_PATHS) {
  const absolutePath = path.join(PORTFOLIO_ROOT, requiredPath);
  if (!(await exists(absolutePath))) errors.push(`Missing required path: ${relative(absolutePath)}`);
}

const router = await readJson(path.join(PORTFOLIO_ROOT, 'router.yaml'));
if (router && (!Array.isArray(router.intents) || router.intents.length === 0)) {
  errors.push('docs/portfolio/router.yaml: intents must be a non-empty array');
}

const catalog = await readJson(path.join(PORTFOLIO_ROOT, 'catalog.json'));
const sourceIndex = await readJson(path.join(PORTFOLIO_ROOT, 'sources', 'index.json'));
const projectIds = new Set();
const sourceIds = new Set();

if (catalog) {
  if (!Array.isArray(catalog.projects) || catalog.projects.length === 0) {
    errors.push('docs/portfolio/catalog.json: projects must be a non-empty array');
  } else {
    for (const project of catalog.projects) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.id || '')) errors.push(`Invalid project ID: ${project.id}`);
      if (projectIds.has(project.id)) errors.push(`Duplicate project ID: ${project.id}`);
      projectIds.add(project.id);
      if (!PROJECT_STATUSES.has(project.status)) errors.push(`${project.id}: invalid status ${project.status}`);
      if (!COPY_ELIGIBILITY.has(project.copyEligibility)) errors.push(`${project.id}: invalid copyEligibility ${project.copyEligibility}`);

      const recordPath = path.join(REPO_ROOT, project.record || '');
      if (!(await exists(recordPath))) {
        errors.push(`${project.id}: missing project record ${project.record}`);
        continue;
      }

      const record = await readJson(recordPath);
      if (!record) continue;
      if (record.projectId !== project.id) errors.push(`${project.id}: project record ID does not match catalogue`);
      if (record.lifecycleStatus !== project.status) errors.push(`${project.id}: lifecycleStatus does not match catalogue status`);
      if (record.copyEligibility !== project.copyEligibility) errors.push(`${project.id}: copyEligibility does not match catalogue`);
      if (!SENSITIVITY_VALUES.has(record.sensitivity)) errors.push(`${project.id}: invalid sensitivity ${record.sensitivity}`);

      for (const key of ['workingHypotheses', 'claims', 'conflicts', 'openQuestions', 'media', 'interviewRounds']) {
        if (!Array.isArray(record[key])) errors.push(`${project.id}: ${key} must be an array`);
      }

      const claimIds = new Set();
      for (const claim of record.claims || []) {
        if (!claim.id || claimIds.has(claim.id)) errors.push(`${project.id}: missing or duplicate claim ID ${claim.id}`);
        claimIds.add(claim.id);
        if (!CLAIM_CATEGORIES.has(claim.category)) errors.push(`${claim.id}: invalid claim category ${claim.category}`);
        if (!CLAIM_STATUSES.has(claim.status)) errors.push(`${claim.id}: invalid claim status ${claim.status}`);
        if (!CONFIDENCE_VALUES.has(claim.confidence)) errors.push(`${claim.id}: invalid confidence ${claim.confidence}`);
        if (!SENSITIVITY_VALUES.has(claim.sensitivity)) errors.push(`${claim.id}: invalid sensitivity ${claim.sensitivity}`);
        if (!Array.isArray(claim.sources) || claim.sources.length === 0) errors.push(`${claim.id}: claims require at least one source locator`);
        for (const source of claim.sources || []) {
          if (!source.sourceId || !source.locator) errors.push(`${claim.id}: source references require sourceId and locator`);
        }
      }

      const questionIds = new Set();
      for (const question of record.openQuestions || []) {
        if (!question.id || questionIds.has(question.id)) errors.push(`${project.id}: missing or duplicate question ID ${question.id}`);
        questionIds.add(question.id);
        if (!CLAIM_CATEGORIES.has(question.category)) errors.push(`${question.id}: invalid question category ${question.category}`);
        if (!QUESTION_STATUSES.has(question.status)) errors.push(`${question.id}: invalid question status ${question.status}`);
        if (question.status === 'resolved' && (!Array.isArray(question.sourceIds) || question.sourceIds.length === 0)) {
          errors.push(`${question.id}: resolved questions require source IDs`);
        }
      }

      if (['ready_for_draft', 'approved'].includes(project.copyEligibility)) {
        const confirmedCategories = new Set(
          (record.claims || [])
            .filter((claim) => claim.status === 'confirmed')
            .map((claim) => claim.category),
        );
        for (const category of REQUIRED_COPY_CATEGORIES) {
          if (!confirmedCategories.has(category)) errors.push(`${project.id}: copy-ready project is missing confirmed ${category} coverage`);
        }
        if ((record.media || []).length < 10 && record.readiness?.mediaExceptionApproved !== true) {
          errors.push(`${project.id}: copy-ready project requires ten media items or mediaExceptionApproved`);
        }
      }

      const draftPath = path.join(PORTFOLIO_ROOT, 'drafts', `${project.id}.md`);
      if (await exists(draftPath) && !['ready_for_draft', 'approved'].includes(project.copyEligibility)) {
        errors.push(`${project.id}: draft exists before the project passes its copy gate`);
      }
    }


    for (const expectedId of EXPECTED_PROJECT_IDS) {
      if (!projectIds.has(expectedId)) errors.push(`Missing expected project ID: ${expectedId}`);
    }
    for (const projectId of projectIds) {
      if (!EXPECTED_PROJECT_IDS.has(projectId)) errors.push(`Unexpected project ID: ${projectId}`);
    }
  }
}

if (router?.intents && catalog) {
  const intentIds = new Set();
  const sourceIdsForRouting = sourceIndex?.sources?.map((source) => source.id) || [];
  for (const intent of router.intents) {
    if (!intent.id || intentIds.has(intent.id)) errors.push(`Router intent has missing or duplicate ID: ${intent.id}`);
    intentIds.add(intent.id);
    for (const key of ['requiredReads', 'allowedWrites', 'postconditions']) {
      if (!Array.isArray(intent[key])) errors.push(`Router intent ${intent.id}: ${key} must be an array`);
    }

    for (const routedPath of intent.requiredReads || []) {
      const candidatePaths = routedPath.includes('{project_id}')
        ? [...projectIds].map((projectId) => routedPath.replace('{project_id}', projectId))
        : routedPath.includes('{source_id}')
          ? sourceIdsForRouting.map((sourceId) => routedPath.replace('{source_id}', sourceId))
          : [routedPath];
      for (const candidatePath of candidatePaths) {
        if (!(await exists(path.join(REPO_ROOT, candidatePath)))) {
          errors.push(`Router intent ${intent.id}: required read does not resolve: ${candidatePath}`);
        }
      }
    }
  }
}

const aha = catalog?.projects?.find((project) => project.id === 'aha');
if (!aha || aha.status !== 'on_hold' || aha.copyEligibility !== 'blocked_on_hold') {
  errors.push('AHA must remain on_hold with copyEligibility blocked_on_hold');
}
if (sourceIndex) {
  if (!Array.isArray(sourceIndex.sources)) {
    errors.push('docs/portfolio/sources/index.json: sources must be an array');
  } else {
    const checksums = new Set();
    for (const source of sourceIndex.sources) {
      if (!/^src-\d{8}-\d{3}$/.test(source.id || '')) errors.push(`Invalid source ID: ${source.id}`);
      if (sourceIds.has(source.id)) errors.push(`Duplicate source ID: ${source.id}`);
      sourceIds.add(source.id);
      if (checksums.has(source.sha256)) errors.push(`Duplicate source checksum: ${source.sha256}`);
      checksums.add(source.sha256);
      if (!SENSITIVITY_VALUES.has(source.sensitivity)) errors.push(`${source.id}: invalid sensitivity ${source.sensitivity}`);
      for (const projectId of source.projectIds || []) {
        if (!projectIds.has(projectId)) errors.push(`${source.id}: unknown project ID ${projectId}`);
      }

      const originalPath = path.join(REPO_ROOT, source.path || '');
      const extractedPath = path.join(REPO_ROOT, source.extractedPath || '');
      if (!(await exists(originalPath))) errors.push(`${source.id}: missing original ${source.path}`);
      if (!(await exists(extractedPath))) errors.push(`${source.id}: missing extraction note ${source.extractedPath}`);
      if (await exists(originalPath)) {
        const actualChecksum = await sha256(originalPath);
        if (actualChecksum !== source.sha256) errors.push(`${source.id}: checksum mismatch for ${source.path}`);
      }
    }
  }
}

if (catalog && sourceIndex) {
  for (const project of catalog.projects || []) {
    const record = await readJson(path.join(REPO_ROOT, project.record));
    for (const claim of record?.claims || []) {
      for (const source of claim.sources || []) {
        if (!sourceIds.has(source.sourceId)) errors.push(`${claim.id}: unknown source ID ${source.sourceId}`);
      }
    }
    for (const media of record?.media || []) {
      if (media.sourceId && !sourceIds.has(media.sourceId)) errors.push(`${media.id}: unknown source ID ${media.sourceId}`);
    }
  }
}

for (const warning of warnings) console.warn(`WARN ${warning}`);
if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR ${error}`);
  console.error(`Portfolio knowledge verification failed with ${errors.length} error(s).`);
  process.exit(1);
}

console.log(`Portfolio knowledge verified: ${projectIds.size} projects, ${sourceIds.size} registered sources.`);
