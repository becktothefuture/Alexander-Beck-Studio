import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ABOUT_NARRATIVE_CERTIFICATION_SCHEMA_VERSION,
  ABOUT_NARRATIVE_CERTIFIED_POINT_BUDGETS,
  ABOUT_NARRATIVE_REQUIRED_COMMAND_IDS,
  ABOUT_NARRATIVE_REQUIRED_EVIDENCE,
  ABOUT_NARRATIVE_REQUIREMENT_COVERAGE,
  validateAboutNarrativeCertificationManifest,
} from './lib/about-narrative-certification-manifest.mjs';

const HASH = 'a'.repeat(64);

function createPassingManifest() {
  const evidence = ABOUT_NARRATIVE_REQUIRED_EVIDENCE.map((requirement) => ({
    id: requirement.id,
    path: requirement.path,
    exists: true,
    sizeBytes: 10,
    sha256: HASH,
    fresh: true,
  }));
  return {
    schemaVersion: ABOUT_NARRATIVE_CERTIFICATION_SCHEMA_VERSION,
    generatedAt: new Date().toISOString(),
    repository: { commitSha: 'abc123', clean: true, sourceHashStart: HASH, sourceHashEnd: HASH },
    environment: {
      node: 'v20', npm: '10', os: 'Darwin', hardware: 'test hardware', gpu: 'test GPU',
      playwright: '1.58.2', chromium: 'chromium-123', webkit: 'webkit-123',
    },
    versions: {
      documentSchema: 2,
      assetSchema: 'about-point-scene',
      assetVersion: 2,
      rendererAdapter: 'blender-surfel-v2',
      pointBudgets: { ...ABOUT_NARRATIVE_CERTIFIED_POINT_BUDGETS },
    },
    artifacts: {
      canonicalConfigSha256: HASH,
      productionArtifactSha256: HASH,
      certificationArtifactSha256: HASH,
    },
    commands: ABOUT_NARRATIVE_REQUIRED_COMMAND_IDS.map((id) => ({
      id,
      status: 'passed',
      attempts: [{ status: 'passed', durationMs: 1, logPath: `${id}.log`, logSha256: HASH, logIntegrity: true }],
    })),
    evidence,
    coverage: ABOUT_NARRATIVE_REQUIREMENT_COVERAGE,
    review: {
      reviewer: 'Independent reviewer',
      independent: true,
      approved: true,
      reviewedAt: new Date().toISOString(),
      sourceHash: HASH,
      unresolvedHighSeverity: [],
      evidenceHashes: Object.fromEntries(
        ABOUT_NARRATIVE_REQUIRED_EVIDENCE.filter((item) => item.reviewRequired).map((item) => [item.id, HASH]),
      ),
    },
    acknowledgedWarnings: false,
  };
}

test('a complete current manifest is release-grade', () => {
  const validation = validateAboutNarrativeCertificationManifest(createPassingManifest());
  assert.equal(validation.releaseGrade, true);
  assert.deepEqual(validation.errors, []);
});

test('obsolete point budgets cannot certify the current renderer', () => {
  const manifest = createPassingManifest();
  manifest.versions.pointBudgets = { desktop: 30_000, mobile: 10_000 };
  const validation = validateAboutNarrativeCertificationManifest(manifest);
  assert.equal(validation.releaseGrade, false);
  assert(validation.errors.some((error) => error.code === 'point-budgets'));
});

test('strict WebKit and restoration proof are mandatory', () => {
  const manifest = createPassingManifest();
  manifest.commands = manifest.commands.filter((item) => ![
    'runtime-visual-webkit-audit',
    'terminal-hold-webkit-audit',
    'restoration-chromium-audit',
    'restoration-webkit-audit',
  ].includes(item.id));
  manifest.evidence = manifest.evidence.filter((item) => ![
    'runtime-visuals-webkit',
    'restoration-chromium-report',
    'restoration-webkit-report',
  ].includes(item.id));
  const validation = validateAboutNarrativeCertificationManifest(manifest);
  assert.equal(validation.releaseGrade, false);
  assert(validation.errors.some((error) => error.code === 'required-command-missing'));
  assert(validation.errors.some((error) => error.code === 'required-evidence-missing'));
});

test('missing or stale evidence blocks release grade', () => {
  const manifest = createPassingManifest();
  manifest.evidence.find((item) => item.id === 'chromium-trace').exists = false;
  manifest.evidence.find((item) => item.id === 'runtime-faults').fresh = false;
  const validation = validateAboutNarrativeCertificationManifest(manifest);
  assert.equal(validation.releaseGrade, false);
  assert(validation.errors.some((error) => error.code === 'evidence-invalid'));
  assert(validation.errors.some((error) => error.code === 'evidence-stale'));
});

test('failed attempts remain visible and require warning acknowledgement after retry', () => {
  const manifest = createPassingManifest();
  const command = manifest.commands.find((item) => item.id === 'production-webkit-audit');
  command.attempts.unshift({ status: 'failed', durationMs: 2, logPath: 'failed.log', logSha256: HASH, logIntegrity: true });
  let validation = validateAboutNarrativeCertificationManifest(manifest);
  assert.equal(validation.releaseGrade, false);
  assert(validation.warnings.some((warning) => warning.code === 'command-retry-used'));
  assert(validation.errors.some((error) => error.code === 'warnings-unacknowledged'));
  manifest.acknowledgedWarnings = true;
  validation = validateAboutNarrativeCertificationManifest(manifest);
  assert.equal(validation.releaseGrade, true);
});

test('dirty, changing, unreviewed, or incomplete runs cannot become release-grade', () => {
  const manifest = createPassingManifest();
  manifest.repository.clean = false;
  manifest.repository.sourceHashEnd = 'b'.repeat(64);
  manifest.commands = manifest.commands.filter((item) => item.id !== 'production-isolation');
  manifest.review.independent = false;
  const validation = validateAboutNarrativeCertificationManifest(manifest);
  assert.equal(validation.releaseGrade, false);
  assert(validation.errors.some((error) => error.code === 'repository-clean'));
  assert(validation.errors.some((error) => error.code === 'source-changed'));
  assert(validation.errors.some((error) => error.code === 'required-command-missing'));
  assert(validation.errors.some((error) => error.code === 'review-missing'));
});
