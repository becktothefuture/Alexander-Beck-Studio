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
  serializeAboutNarrativeTrackDocument,
  validateAboutNarrativeTrackDocument,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackSchema.js';
import {
  loadAboutNarrativeTrackSource,
  preflightAboutNarrativeTrackRuntimePlans,
} from '../react-app/app/src/routes/about-narrative-lab/aboutNarrativeTrackPersistence.js';

const repoRoot = resolve(import.meta.dirname, '..');
const canonicalPath = resolve(repoRoot, 'react-app/app/public/config/contents-about.json');
const fixtureDirectory = resolve(repoRoot, 'scripts/fixtures/about-narrative');
const writeRequested = process.argv.includes('--write');

const LEGACY_CAMERA_FIELDS = new Set([
  'offset',
  'lookAtOffset',
  'roll',
  'startZ',
  'cadence',
  'cadenceLocked',
]);
const PER_KEY_FOG_FIELDS = new Set(['distanceFogStartWU', 'distanceFogEndWU']);
const RETIRED_DISCIPLINE_FIELDS = new Set([
  'fieldTravelStartWU',
  'fieldTravelEndWU',
  'fieldTravelDurationWU',
  'fieldTravelWU',
  'fieldFogStartWU',
  'fieldFogEndWU',
  'fieldFogStrength',
  'backgroundScale',
]);
const RETIRED_RIPPLE_FIELDS = new Set(['centerX', 'centerZ']);

function fail(message) {
  throw new Error(`[About Narrative v5 certification] ${message}`);
}

function assertForbiddenKeys(value, forbidden, path) {
  if (!value || typeof value !== 'object') return;
  Object.entries(value).forEach(([key, child]) => {
    if (forbidden.has(key)) fail(`Retired field "${path}.${key}" is forbidden in schema v5.`);
    assertForbiddenKeys(child, forbidden, `${path}.${key}`);
  });
}

function assertCurrentContract(document) {
  if (document.schemaVersion !== ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
    fail(`Schema v${ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION} is required after migration.`);
  }
  if (Object.hasOwn(document.globals?.camera || {}, 'fov')) {
    fail('Retired field "globals.camera.fov" is forbidden in schema v5. FOV belongs to Camera keys.');
  }
  assertForbiddenKeys(document.globals?.camera, LEGACY_CAMERA_FIELDS, 'globals.camera');
  (document.tracks?.camera?.keys || []).forEach((key, index) => {
    assertForbiddenKeys(key, LEGACY_CAMERA_FIELDS, `tracks.camera.keys.${index}`);
    assertForbiddenKeys(key, PER_KEY_FOG_FIELDS, `tracks.camera.keys.${index}`);
  });
  for (const profileId of ['desktop', 'tablet', 'mobile']) {
    Object.entries(document.profiles?.[profileId]?.overrides?.camera || {}).forEach(([id, override]) => {
      assertForbiddenKeys(override, LEGACY_CAMERA_FIELDS, `profiles.${profileId}.overrides.camera.${id}`);
      assertForbiddenKeys(override, PER_KEY_FOG_FIELDS, `profiles.${profileId}.overrides.camera.${id}`);
    });
  }
  (document.tracks?.text?.fields || []).forEach((field, index) => {
    if (field.kind !== 'discipline-reveal') return;
    assertForbiddenKeys(field, RETIRED_DISCIPLINE_FIELDS, `tracks.text.fields.${index}`);
  });
  (document.tracks?.interactions?.clips || []).forEach((clip, index) => {
    if (clip.type === 'discipline-reveal') {
      assertForbiddenKeys(
        clip.parameters,
        RETIRED_DISCIPLINE_FIELDS,
        `tracks.interactions.clips.${index}.parameters`,
      );
    }
    if (clip.type === 'grid-ripple') {
      assertForbiddenKeys(
        clip.parameters,
        RETIRED_RIPPLE_FIELDS,
        `tracks.interactions.clips.${index}.parameters`,
      );
    }
  });
}

function certifyDocument(document) {
  const diagnostics = validateAboutNarrativeTrackDocument(document);
  const errors = diagnostics.filter((item) => item.level === 'error');
  if (errors.length) fail(`Schema validation failed: ${JSON.stringify(errors, null, 2)}`);
  assertCurrentContract(document);
  const preflight = preflightAboutNarrativeTrackRuntimePlans(document);
  if (!preflight.valid) {
    fail(`Runtime profile preflight failed: ${JSON.stringify(preflight.diagnostics, null, 2)}`);
  }
}

function preserveLegacyFixture(source, sourceVersion) {
  const fixturePath = resolve(fixtureDirectory, `contents-about-v${sourceVersion}.json`);
  mkdirSync(dirname(fixturePath), { recursive: true });
  if (existsSync(fixturePath)) {
    const existing = readFileSync(fixturePath, 'utf8');
    if (existing !== source) {
      fail(`The existing v${sourceVersion} fixture differs from the canonical v${sourceVersion} source; refusing to overwrite it.`);
    }
    return fixturePath;
  }
  writeFileSync(fixturePath, source, { encoding: 'utf8', flag: 'wx' });
  return fixturePath;
}

function writeCanonicalAtomically(serialized) {
  const temporaryPath = `${canonicalPath}.v5-${process.pid}.tmp`;
  try {
    writeFileSync(temporaryPath, serialized, { encoding: 'utf8', flag: 'wx' });
    const persistedSource = readFileSync(temporaryPath, 'utf8');
    const persisted = JSON.parse(persistedSource);
    certifyDocument(persisted);
    if (serializeAboutNarrativeTrackDocument(persisted) !== persistedSource) {
      fail('The temporary v5 file did not round-trip byte-for-byte.');
    }
    renameSync(temporaryPath, canonicalPath);
  } finally {
    if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
  }
}

const canonicalSource = readFileSync(canonicalPath, 'utf8');
let canonicalDocument;
try {
  canonicalDocument = JSON.parse(canonicalSource);
} catch (error) {
  fail(`Canonical JSON could not be parsed: ${error.message}`);
}

const sourceVersion = Number(canonicalDocument?.schemaVersion);
if (!Number.isInteger(sourceVersion)) fail('Canonical schemaVersion must be an integer.');
if (sourceVersion > ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
  fail(`Canonical schemaVersion ${sourceVersion} is newer than supported v${ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION}; refusing to modify it.`);
}
if (![2, 3, 4, ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION].includes(sourceVersion)) {
  fail(`Unsupported canonical schemaVersion ${sourceVersion}. Only v2, v3, and v4 can migrate to v5.`);
}

const loaded = loadAboutNarrativeTrackSource(canonicalSource, {
  preflight: preflightAboutNarrativeTrackRuntimePlans,
});
if (!loaded.valid) {
  const detail = loaded.diagnostics?.length
    ? JSON.stringify(loaded.diagnostics, null, 2)
    : loaded.message;
  fail(`Canonical source is not safe to certify or migrate: ${detail}`);
}
if (sourceVersion === ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION && loaded.status !== 'current') {
  fail(`Canonical v5 requires an implicit repair (${loaded.migrations.join(', ')}); refusing to rewrite authored source automatically.`);
}

certifyDocument(loaded.document);
const serialized = serializeAboutNarrativeTrackDocument(loaded.document);

if (!writeRequested) {
  if (sourceVersion !== ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
    fail(`Canonical contents-about.json is still v${sourceVersion}. Run npm run migrate:about-narrative:v5.`);
  }
  if (serialized !== canonicalSource) fail('Canonical v5 JSON is not in deterministic normalized order.');
  console.log('About Narrative canonical v5 is deterministic and passes desktop/tablet/mobile × full/reduced preflights.');
  process.exit(0);
}

let legacyFixturePath = null;
if (sourceVersion < ABOUT_NARRATIVE_TRACK_SCHEMA_VERSION) {
  legacyFixturePath = preserveLegacyFixture(canonicalSource, sourceVersion);
}
if (serialized !== canonicalSource) writeCanonicalAtomically(serialized);
console.log('About Narrative canonical schema v5 is deterministic and certified.');
if (legacyFixturePath) console.log(`Legacy parity fixture: ${legacyFixturePath}`);
