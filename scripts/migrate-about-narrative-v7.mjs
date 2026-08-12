import {
  existsSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { resolve } from 'node:path';
import {
  ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION,
  serializeAboutNarrativePointFieldDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldSchema.js';
import {
  loadAboutNarrativePointFieldPersistenceSource,
  preflightAboutNarrativePointFieldRuntimePlans,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativePointFieldPersistence.js';

const repoRoot = resolve(import.meta.dirname, '..');
const canonicalPath = resolve(repoRoot, 'react-app/app/public/config/contents-about.json');
const writeRequested = process.argv.includes('--write');

function fail(message) {
  throw new Error(`[About Director 4 / schema v7 certification] ${message}`);
}

function loadAndCertify(source) {
  const loaded = loadAboutNarrativePointFieldPersistenceSource(source, {
    preflight: preflightAboutNarrativePointFieldRuntimePlans,
  });
  if (!loaded.valid) {
    const detail = loaded.diagnostics?.length
      ? JSON.stringify(loaded.diagnostics, null, 2)
      : loaded.message;
    fail(`Canonical source is not safe to certify or migrate: ${detail}`);
  }
  return loaded;
}

function writeCanonicalAtomically(serialized) {
  const temporaryPath = `${canonicalPath}.v7-${process.pid}.tmp`;
  try {
    writeFileSync(temporaryPath, serialized, { encoding: 'utf8', flag: 'wx' });
    const persistedSource = readFileSync(temporaryPath, 'utf8');
    const persisted = loadAndCertify(persistedSource);
    if (persisted.sourceVersion !== ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION) {
      fail('The temporary file is not a native schema v7 document.');
    }
    if (serializeAboutNarrativePointFieldDocument(persisted.document) !== persistedSource) {
      fail('The temporary v7 file did not round-trip byte-for-byte.');
    }
    renameSync(temporaryPath, canonicalPath);
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
}

const canonicalSource = readFileSync(canonicalPath, 'utf8');
const loaded = loadAndCertify(canonicalSource);
const serialized = serializeAboutNarrativePointFieldDocument(loaded.document);

if (!writeRequested) {
  if (loaded.sourceVersion !== ABOUT_NARRATIVE_POINT_FIELD_SCHEMA_VERSION) {
    fail('Canonical contents-about.json is not schema v7. Run npm run migrate:about-narrative:v7.');
  }
  if (loaded.status !== 'current' || loaded.migrations.length > 0) {
    fail(`Canonical v7 requires an implicit migration (${loaded.migrations.join(', ')}).`);
  }
  if (serialized !== canonicalSource) fail('Canonical v7 JSON is not in deterministic normalized order.');
  console.log('About Director 4 canonical v7 is deterministic across desktop/tablet/mobile and full/reduced profiles.');
  process.exit(0);
}

if (serialized !== canonicalSource) writeCanonicalAtomically(serialized);
console.log('About Director 4 canonical schema v7 is deterministic and certified.');
