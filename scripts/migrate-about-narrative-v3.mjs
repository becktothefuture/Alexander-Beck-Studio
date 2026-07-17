import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import {
  ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION,
  migrateAboutNarrativeVersion2To3,
  serializeAboutNarrativeTrackDocument,
  validateAboutNarrativeTrackDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackSchema.js';
import { compileAboutNarrativeRuntimePlan } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';

const repoRoot = resolve(import.meta.dirname, '..');
const canonicalPath = resolve(repoRoot, 'react-app/app/public/config/contents-about.json');
const legacyFixturePath = resolve(repoRoot, 'scripts/fixtures/about-narrative/contents-about-v2.json');
const writeRequested = process.argv.includes('--write');

function fail(message) {
  throw new Error(`[About Narrative v3 migration] ${message}`);
}

function assertNoAuthoredContainers(value, path = 'document') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['sections', 'groups', 'bands', 'chapters'].includes(key)) {
      fail(`Persisted authored container "${path}.${key}" is forbidden.`);
    }
    assertNoAuthoredContainers(child, `${path}.${key}`);
  }
}

function certifyDocument(document) {
  const diagnostics = validateAboutNarrativeTrackDocument(document);
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) fail(`Schema validation failed: ${JSON.stringify(errors, null, 2)}`);
  assertNoAuthoredContainers(document);

  for (const layoutProfile of ['desktop', 'tablet', 'mobile']) {
    for (const motionProfile of ['full', 'reduced']) {
      const plan = compileAboutNarrativeRuntimePlan(document, { layoutProfile, motionProfile });
      if (!plan.valid) {
        fail(`${layoutProfile}/${motionProfile} runtime preflight failed: ${JSON.stringify(plan.diagnostics, null, 2)}`);
      }
    }
  }
}

function preserveLegacyFixture(source) {
  mkdirSync(dirname(legacyFixturePath), { recursive: true });
  if (existsSync(legacyFixturePath)) {
    const existing = readFileSync(legacyFixturePath, 'utf8');
    if (existing !== source) fail('The existing v2 fixture differs from the canonical v2 source; refusing to overwrite it.');
    return;
  }
  writeFileSync(legacyFixturePath, source, 'utf8');
}

function writeCanonicalAtomically(serialized) {
  const temporaryPath = `${canonicalPath}.v3-${process.pid}.tmp`;
  try {
    writeFileSync(temporaryPath, serialized, 'utf8');
    const persisted = JSON.parse(readFileSync(temporaryPath, 'utf8'));
    certifyDocument(persisted);
    if (serializeAboutNarrativeTrackDocument(persisted) !== serialized) {
      fail('The temporary v3 file did not round-trip byte-for-byte.');
    }
    renameSync(temporaryPath, canonicalPath);
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
}

const canonicalSource = readFileSync(canonicalPath, 'utf8');
const canonicalDocument = JSON.parse(canonicalSource);
let v3Document;

if (canonicalDocument.schemaVersion === ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
  v3Document = canonicalDocument;
} else if (canonicalDocument.schemaVersion === 2) {
  v3Document = migrateAboutNarrativeVersion2To3(canonicalDocument);
} else {
  fail(`Unsupported canonical schemaVersion ${String(canonicalDocument.schemaVersion)}.`);
}

certifyDocument(v3Document);
const serialized = serializeAboutNarrativeTrackDocument(v3Document);

if (!writeRequested) {
  if (canonicalDocument.schemaVersion !== ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
    fail('Canonical contents-about.json is still v2. Run this script with --write after integration certification.');
  }
  if (serialized !== canonicalSource) fail('Canonical v3 JSON is not in deterministic normalized order.');
  console.log('About Narrative canonical v3 is deterministic and passes all profile preflights.');
  process.exit(0);
}

if (canonicalDocument.schemaVersion === 2) preserveLegacyFixture(canonicalSource);
if (serialized !== canonicalSource) writeCanonicalAtomically(serialized);
console.log(`About Narrative canonical schema v${ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION} is certified.`);
console.log(`Legacy parity fixture: ${legacyFixturePath}`);
