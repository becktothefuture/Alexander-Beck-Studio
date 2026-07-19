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
  migrateAboutNarrativeVersion2To4,
  migrateAboutNarrativeVersion3To4,
  migrateAboutNarrativeVersion4To5,
  serializeAboutNarrativeTrackDocument,
  validateAboutNarrativeTrackDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackSchema.js';
import { compileAboutNarrativeRuntimePlan } from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeRuntimePlan.js';

const repoRoot = resolve(import.meta.dirname, '..');
const canonicalPath = resolve(repoRoot, 'react-app/app/public/config/contents-about.json');
const legacyFixturePath = resolve(repoRoot, 'scripts/fixtures/about-narrative/contents-about-v3.json');
const writeRequested = process.argv.includes('--write');
const rebakeLegacyCameraRequested = process.argv.includes('--rebake-legacy-camera');

function fail(message) {
  throw new Error(`[About Narrative v4 migration] ${message}`);
}

function assertNoDeprecatedCameraFields(value, path = 'document') {
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    if (['offset', 'lookAtOffset', 'roll', 'startZ', 'cadence', 'cadenceLocked'].includes(key)) {
      fail(`Deprecated camera field "${path}.${key}" is forbidden in v${ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION}.`);
    }
    assertNoDeprecatedCameraFields(child, `${path}.${key}`);
  }
}

function certifyDocument(document) {
  const diagnostics = validateAboutNarrativeTrackDocument(document);
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) fail(`Schema validation failed: ${JSON.stringify(errors, null, 2)}`);
  assertNoDeprecatedCameraFields(document);
  for (const layoutProfile of ['desktop', 'tablet', 'mobile']) {
    for (const motionProfile of ['full', 'reduced']) {
      const plan = compileAboutNarrativeRuntimePlan(document, { layoutProfile, motionProfile });
      if (!plan.valid) fail(`${layoutProfile}/${motionProfile} runtime preflight failed: ${JSON.stringify(plan.diagnostics, null, 2)}`);
    }
  }
}

function preserveLegacyFixture(source) {
  mkdirSync(dirname(legacyFixturePath), { recursive: true });
  if (existsSync(legacyFixturePath)) {
    const existing = readFileSync(legacyFixturePath, 'utf8');
    if (existing !== source) fail('The existing v3 fixture differs from the canonical v3 source; refusing to overwrite it.');
    return;
  }
  writeFileSync(legacyFixturePath, source, 'utf8');
}

function writeCanonicalAtomically(serialized) {
  const temporaryPath = `${canonicalPath}.v${ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION}-${process.pid}.tmp`;
  try {
    writeFileSync(temporaryPath, serialized, 'utf8');
    const persisted = JSON.parse(readFileSync(temporaryPath, 'utf8'));
    certifyDocument(persisted);
    if (serializeAboutNarrativeTrackDocument(persisted) !== serialized) {
      fail(`The temporary v${ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION} file did not round-trip byte-for-byte.`);
    }
    renameSync(temporaryPath, canonicalPath);
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
}

const canonicalSource = readFileSync(canonicalPath, 'utf8');
const canonicalDocument = JSON.parse(canonicalSource);
let currentDocument;

if (canonicalDocument.schemaVersion === ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
  currentDocument = canonicalDocument;
} else if (canonicalDocument.schemaVersion === 4) {
  currentDocument = migrateAboutNarrativeVersion4To5(canonicalDocument);
} else if (canonicalDocument.schemaVersion === 3) {
  currentDocument = migrateAboutNarrativeVersion4To5(
    migrateAboutNarrativeVersion3To4(canonicalDocument),
  );
} else if (canonicalDocument.schemaVersion === 2) {
  currentDocument = migrateAboutNarrativeVersion4To5(
    migrateAboutNarrativeVersion2To4(canonicalDocument),
  );
} else {
  fail(`Unsupported canonical schemaVersion ${String(canonicalDocument.schemaVersion)}.`);
}

if (rebakeLegacyCameraRequested) {
  if (!writeRequested) fail('--rebake-legacy-camera requires --write.');
  if (!existsSync(legacyFixturePath)) fail('The preserved v3 fixture is required to rebake the legacy camera path.');
  const legacyDocument = JSON.parse(readFileSync(legacyFixturePath, 'utf8'));
  const rebaked = migrateAboutNarrativeVersion4To5(
    migrateAboutNarrativeVersion3To4(legacyDocument),
  );
  currentDocument = {
    ...currentDocument,
    tracks: {
      ...currentDocument.tracks,
      camera: rebaked.tracks.camera,
    },
  };
}

certifyDocument(currentDocument);
const serialized = serializeAboutNarrativeTrackDocument(currentDocument);

if (!writeRequested) {
  if (canonicalDocument.schemaVersion !== ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
    fail(`Canonical contents-about.json is not v${ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION}. Run npm run migrate:about-narrative:v4.`);
  }
  if (serialized !== canonicalSource) {
    fail(`Canonical v${ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION} JSON is not in deterministic normalized order.`);
  }
  console.log(`About Narrative canonical v${ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION} is deterministic and passes all profile preflights.`);
  process.exit(0);
}

if (canonicalDocument.schemaVersion === 3) preserveLegacyFixture(canonicalSource);
if (serialized !== canonicalSource) writeCanonicalAtomically(serialized);
console.log(`About Narrative canonical schema v${ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION} is certified.`);
console.log(`Legacy parity fixture: ${legacyFixturePath}`);
