import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..');
const PORTFOLIO_ROOT = path.join(REPO_ROOT, 'docs', 'portfolio');
const CATALOG_PATH = path.join(PORTFOLIO_ROOT, 'catalog.json');
const SOURCE_INDEX_PATH = path.join(PORTFOLIO_ROOT, 'sources', 'index.json');
const INGESTION_LOG_PATH = path.join(PORTFOLIO_ROOT, 'logs', 'ingestion-log.md');

const SENSITIVITY_VALUES = new Set(['public', 'internal', 'confidential', 'personal', 'restricted']);
const REDACTION_VALUES = new Set(['not_required', 'pending', 'complete']);

function parseArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) continue;
    const key = token.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) {
      args[key] = true;
      continue;
    }
    args[key] = value;
    index += 1;
  }
  return args;
}

function usage() {
  return [
    'Register a portfolio source:',
    '',
    'npm run portfolio:source:add -- --file "/absolute/path/file.pdf" --title "Past portfolio 2021" [options]',
    '',
    'Options:',
    '  --projects sp-global,bentley   Project IDs from docs/portfolio/catalog.json',
    '  --sensitivity personal         public|internal|confidential|personal|restricted',
    '  --origin user_provided         Short source-origin label',
    '  --type pdf                     Optional type override; defaults to file extension',
    '  --capture-method file_copy     How the source was captured',
    '  --redaction-status complete    not_required|pending|complete',
    '  --source-created-at YYYY-MM-DD Original creation date when known',
    '  --source-modified-at YYYY-MM-DD Original modification date when known',
    '  --contains-credentials false   Must remain false; sanitise the file before intake',
  ].join('\n');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJsonAtomic(filePath, value) {
  const temporaryPath = `${filePath}.tmp`;
  await fs.writeFile(temporaryPath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.rename(temporaryPath, filePath);
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

function nextSourceId(sources, compactDate) {
  const prefix = `src-${compactDate}-`;
  const sequence = sources
    .map((source) => source.id)
    .filter((id) => id.startsWith(prefix))
    .map((id) => Number.parseInt(id.slice(prefix.length), 10))
    .filter(Number.isFinite)
    .reduce((maximum, value) => Math.max(maximum, value), 0) + 1;
  return `${prefix}${String(sequence).padStart(3, '0')}`;
}

function extractionTemplate(record) {
  const projects = record.projectIds.length > 0 ? record.projectIds.join(', ') : 'Unrouted';
  return `# Source Extraction: ${record.id}\n\n## Source\n\n- Title: ${record.title}\n- Registered path: \`${record.path}\`\n- Projects: ${projects}\n- Sensitivity: ${record.sensitivity}\n- Capture method: ${record.captureMethod}\n- Redaction status: ${record.redactionStatus}\n- Contains credentials: no\n- Extraction status: pending\n\n## Locator map\n\n| Locator | Visible content | Routed project | Notes |\n|---|---|---|---|\n\n## Candidate claims\n\n| Project | Category | Claim | Locator | Confidence | Sensitivity |\n|---|---|---|---|---|---|\n\n## Conflicts or ambiguities\n\n- None recorded.\n\n## Media candidates\n\n| Project | Locator | Subject | Potential story use | Permission status |\n|---|---|---|---|---|\n\n## Follow-up questions\n\n- None recorded.\n`;
}

const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(usage());
  process.exit(0);
}

if (!args.file || !args.title) {
  console.error(usage());
  process.exit(1);
}

const sourcePath = path.resolve(args.file);
const sourceStat = await fs.stat(sourcePath).catch(() => null);
if (!sourceStat?.isFile()) {
  throw new Error(`Source file does not exist or is not a file: ${sourcePath}`);
}

const sensitivity = args.sensitivity || 'personal';
if (!SENSITIVITY_VALUES.has(sensitivity)) {
  throw new Error(`Invalid sensitivity: ${sensitivity}`);
}

const redactionStatus = args['redaction-status'] || 'not_required';
if (!REDACTION_VALUES.has(redactionStatus)) {
  throw new Error(`Invalid redaction status: ${redactionStatus}`);
}

if (String(args['contains-credentials'] || 'false').toLowerCase() !== 'false') {
  throw new Error('Sources containing credentials cannot be registered. Create a sanitised extract first.');
}

const catalog = await readJson(CATALOG_PATH);
const sourceIndex = await readJson(SOURCE_INDEX_PATH);
const knownProjects = new Set(catalog.projects.map((project) => project.id));
const projectIds = String(args.projects || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

for (const projectId of projectIds) {
  if (!knownProjects.has(projectId)) {
    throw new Error(`Unknown project ID: ${projectId}`);
  }
}

const checksum = await sha256(sourcePath);
const duplicate = sourceIndex.sources.find((source) => source.sha256 === checksum);
if (duplicate) {
  console.log(`Source already registered as ${duplicate.id}: ${duplicate.path}`);
  process.exit(0);
}

const receivedAt = new Date().toISOString().slice(0, 10);
const compactDate = receivedAt.replaceAll('-', '');
const sourceId = nextSourceId(sourceIndex.sources, compactDate);
const destinationDirectory = path.join(PORTFOLIO_ROOT, 'sources', 'raw', sourceId);
const destinationPath = path.join(destinationDirectory, path.basename(sourcePath));
const extractedPath = path.join(PORTFOLIO_ROOT, 'sources', 'extracted', `${sourceId}.md`);
const relativeDestination = path.relative(REPO_ROOT, destinationPath);
const relativeExtracted = path.relative(REPO_ROOT, extractedPath);

await fs.mkdir(destinationDirectory, { recursive: false });
await fs.copyFile(sourcePath, destinationPath);

const record = {
  id: sourceId,
  title: String(args.title).trim(),
  type: String(args.type || path.extname(sourcePath).slice(1) || 'unknown').toLowerCase(),
  status: 'active',
  extractionStatus: 'pending',
  sensitivity,
  origin: String(args.origin || 'user_provided').trim(),
  captureMethod: String(args['capture-method'] || 'file_copy').trim(),
  redactionStatus,
  containsCredentials: false,
  sourceCreatedAt: args['source-created-at'] || null,
  sourceModifiedAt: args['source-modified-at'] || null,
  receivedAt,
  projectIds,
  path: relativeDestination,
  extractedPath: relativeExtracted,
  sha256: checksum,
  summary: '',
  supersedes: [],
  supersededBy: [],
};

await fs.writeFile(extractedPath, extractionTemplate(record), 'utf8');
sourceIndex.sources.push(record);
await writeJsonAtomic(SOURCE_INDEX_PATH, sourceIndex);
await fs.appendFile(
  INGESTION_LOG_PATH,
  `\n## ${receivedAt} — ${sourceId}\n\n- Registered: ${record.title.replaceAll('\n', ' ')}\n- Projects: ${projectIds.join(', ') || 'Unrouted'}\n- Sensitivity: ${sensitivity}\n- Original: \`${relativeDestination}\`\n- Extraction: \`${relativeExtracted}\`\n`,
  'utf8',
);

console.log(`Registered ${sourceId}`);
console.log(`Original: ${relativeDestination}`);
console.log(`Extraction note: ${relativeExtracted}`);
console.log('Next: extract with stable page, slide, URL, filename, or timecode locators.');
