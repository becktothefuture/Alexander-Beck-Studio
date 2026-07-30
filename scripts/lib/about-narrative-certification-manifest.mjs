export const ABOUT_NARRATIVE_CERTIFICATION_SCHEMA_VERSION = 1;

export const ABOUT_NARRATIVE_REQUIRED_COMMAND_IDS = Object.freeze([
  'hardening-tests',
  'correspondence-tests',
  'editor-hardening-tests',
  'certification-build',
  'hot-frame-audit',
  'runtime-fault-audit',
  'runtime-soak-desktop',
  'runtime-soak-mobile',
  'runtime-visual-audit',
  'certification-chromium-audit',
  'certification-webkit-audit',
  'site-gate',
  'production-isolation',
  'production-chromium-audit',
  'production-webkit-audit',
]);

export const ABOUT_NARRATIVE_REQUIRED_EVIDENCE = Object.freeze([
  Object.freeze({ id: 'hot-frame', path: 'output/playwright/about-narrative-hardening/runtime/hot-frame-600.json' }),
  Object.freeze({ id: 'runtime-faults', path: 'output/playwright/about-narrative-hardening/runtime/runtime-fault-matrix.json' }),
  Object.freeze({ id: 'runtime-soak-desktop', path: 'output/playwright/about-narrative-hardening/runtime/soak-metrics-desktop.json' }),
  Object.freeze({ id: 'runtime-soak-mobile', path: 'output/playwright/about-narrative-hardening/runtime/soak-metrics-mobile.json' }),
  Object.freeze({ id: 'runtime-visuals', path: 'output/playwright/about-narrative-hardening/runtime/visual-checkpoints.json' }),
  Object.freeze({ id: 'visual-contact-sheet-desktop', path: 'output/playwright/about-narrative-hardening/runtime/contact-sheet-desktop.png', reviewRequired: true }),
  Object.freeze({ id: 'visual-contact-sheet-mobile', path: 'output/playwright/about-narrative-hardening/runtime/contact-sheet-mobile.png', reviewRequired: true }),
  Object.freeze({ id: 'visual-contact-sheet-reduced-motion', path: 'output/playwright/about-narrative-hardening/runtime/contact-sheet-reduced-motion.png', reviewRequired: true }),
  Object.freeze({ id: 'visual-desktop-turbulent', path: 'output/playwright/about-narrative-hardening/runtime/desktop-turbulent.png', reviewRequired: true }),
  Object.freeze({ id: 'visual-desktop-discipline', path: 'output/playwright/about-narrative-hardening/runtime/desktop-discipline-middle.png', reviewRequired: true }),
  Object.freeze({ id: 'visual-mobile-discipline', path: 'output/playwright/about-narrative-hardening/runtime/mobile-discipline-middle.png', reviewRequired: true }),
  Object.freeze({ id: 'visual-reduced-motion', path: 'output/playwright/about-narrative-hardening/runtime/reduced-motion-discipline.png', reviewRequired: true }),
  Object.freeze({ id: 'visual-desktop-bust', path: 'output/playwright/about-narrative-hardening/runtime/desktop-bust-resolved.png', reviewRequired: true }),
  Object.freeze({ id: 'certification-chromium-desktop', path: 'output/playwright/about-narrative-sectionless/chromium-editor-desktop.png' }),
  Object.freeze({ id: 'certification-chromium-mobile', path: 'output/playwright/about-narrative-sectionless/chromium-editor-mobile.png' }),
  Object.freeze({ id: 'certification-webkit-desktop', path: 'output/playwright/about-narrative-sectionless/webkit-editor-desktop.png' }),
  Object.freeze({ id: 'certification-webkit-mobile', path: 'output/playwright/about-narrative-sectionless/webkit-editor-mobile.png' }),
  Object.freeze({ id: 'production-chromium-desktop', path: 'output/playwright/about-narrative-sectionless/chromium-production-desktop.png' }),
  Object.freeze({ id: 'production-chromium-tablet-portrait', path: 'output/playwright/about-narrative-sectionless/chromium-production-tablet-portrait.png' }),
  Object.freeze({ id: 'production-chromium-tablet-landscape', path: 'output/playwright/about-narrative-sectionless/chromium-production-tablet-landscape.png' }),
  Object.freeze({ id: 'production-chromium-mobile-portrait', path: 'output/playwright/about-narrative-sectionless/chromium-production-mobile-portrait.png' }),
  Object.freeze({ id: 'production-chromium-mobile-landscape', path: 'output/playwright/about-narrative-sectionless/chromium-production-mobile-landscape.png' }),
  Object.freeze({ id: 'production-webkit-desktop', path: 'output/playwright/about-narrative-sectionless/webkit-production-desktop.png' }),
  Object.freeze({ id: 'production-webkit-tablet-portrait', path: 'output/playwright/about-narrative-sectionless/webkit-production-tablet-portrait.png' }),
  Object.freeze({ id: 'production-webkit-tablet-landscape', path: 'output/playwright/about-narrative-sectionless/webkit-production-tablet-landscape.png' }),
  Object.freeze({ id: 'production-webkit-mobile-portrait', path: 'output/playwright/about-narrative-sectionless/webkit-production-mobile-portrait.png' }),
  Object.freeze({ id: 'production-webkit-mobile-landscape', path: 'output/playwright/about-narrative-sectionless/webkit-production-mobile-landscape.png' }),
  Object.freeze({ id: 'chromium-trace', path: 'output/playwright/about-narrative-hardening/performance/chromium-trace.zip' }),
]);

export const ABOUT_NARRATIVE_REQUIREMENT_COVERAGE = Object.freeze({
  'PRD-01': Object.freeze(['US-101', 'US-102', 'US-103', 'US-104', 'US-105', 'US-106', 'US-107', 'US-108', 'US-109']),
  'PRD-02': Object.freeze(['US-201', 'US-202', 'US-203', 'US-204', 'US-205', 'US-206', 'US-207', 'US-208']),
  'PRD-03': Object.freeze(['US-301', 'US-302', 'US-303', 'US-304', 'US-305', 'US-306', 'US-307', 'US-308', 'US-309']),
  'PRD-04': Object.freeze(['US-001', 'US-002', 'US-003', 'US-004', 'US-005', 'US-006', 'US-007']),
});

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isSha256(value) {
  return typeof value === 'string' && /^[a-f0-9]{64}$/u.test(value);
}

function addError(errors, code, path, message) {
  errors.push({ code, path, message });
}

function validateCommands(manifest, errors, warnings) {
  if (!Array.isArray(manifest.commands)) {
    addError(errors, 'commands-missing', 'commands', 'Certification commands must be recorded.');
    return;
  }

  const commandsById = new Map();
  manifest.commands.forEach((command, index) => {
    const path = `commands.${index}`;
    if (!isNonEmptyString(command?.id)) {
      addError(errors, 'command-id', `${path}.id`, 'Every command needs a stable ID.');
      return;
    }
    if (commandsById.has(command.id)) {
      addError(errors, 'command-duplicate', `${path}.id`, `Duplicate command ID: ${command.id}.`);
    }
    commandsById.set(command.id, command);
    if (!Array.isArray(command.attempts) || command.attempts.length === 0) {
      addError(errors, 'command-attempts', `${path}.attempts`, `${command.id} has no recorded attempt.`);
      return;
    }
    command.attempts.forEach((attempt, attemptIndex) => {
      if (!['passed', 'failed'].includes(attempt?.status)) {
        addError(errors, 'command-attempt-status', `${path}.attempts.${attemptIndex}.status`, 'Attempt status must be passed or failed.');
      }
      if (!Number.isFinite(attempt?.durationMs) || attempt.durationMs < 0) {
        addError(errors, 'command-attempt-duration', `${path}.attempts.${attemptIndex}.durationMs`, 'Attempt duration must be finite and non-negative.');
      }
      if (!isNonEmptyString(attempt?.logPath) || !isSha256(attempt?.logSha256) || attempt?.logIntegrity !== true) {
        addError(errors, 'command-attempt-log', `${path}.attempts.${attemptIndex}`, 'Every attempt needs a hashed log path.');
      }
    });
    if (command.attempts.some((attempt) => attempt.status === 'failed') && command.status === 'passed') {
      warnings.push({
        code: 'command-retry-used',
        path,
        message: `${command.id} passed only after a recorded failed attempt.`,
      });
    }
  });

  ABOUT_NARRATIVE_REQUIRED_COMMAND_IDS.forEach((id) => {
    const command = commandsById.get(id);
    if (!command) {
      addError(errors, 'required-command-missing', 'commands', `Required command ${id} is missing.`);
    } else if (command.status !== 'passed') {
      addError(errors, 'required-command-failed', `commands.${id}`, `Required command ${id} did not pass.`);
    }
  });
}

function validateEvidence(manifest, errors) {
  if (!Array.isArray(manifest.evidence)) {
    addError(errors, 'evidence-missing', 'evidence', 'Certification evidence must be recorded.');
    return;
  }
  const evidenceById = new Map(manifest.evidence.map((item) => [item?.id, item]));
  ABOUT_NARRATIVE_REQUIRED_EVIDENCE.forEach((requirement) => {
    const item = evidenceById.get(requirement.id);
    if (!item) {
      addError(errors, 'required-evidence-missing', 'evidence', `Required evidence ${requirement.id} is missing.`);
      return;
    }
    if (item.path !== requirement.path) {
      addError(errors, 'evidence-path', `evidence.${requirement.id}.path`, `Evidence ${requirement.id} must use ${requirement.path}.`);
    }
    if (!item.exists || !isSha256(item.sha256) || !Number.isFinite(item.sizeBytes) || item.sizeBytes <= 0) {
      addError(errors, 'evidence-invalid', `evidence.${requirement.id}`, `Evidence ${requirement.id} is absent or unhashed.`);
    }
    if (!item.fresh) {
      addError(errors, 'evidence-stale', `evidence.${requirement.id}.fresh`, `Evidence ${requirement.id} predates this certification run.`);
    }
  });
}

function validateReview(manifest, errors) {
  const review = manifest.review;
  if (!review || review.approved !== true || review.independent !== true || !isNonEmptyString(review.reviewer)) {
    addError(errors, 'review-missing', 'review', 'An approved independent reviewer is required.');
    return;
  }
  if (!isNonEmptyString(review.reviewedAt) || !Number.isFinite(Date.parse(review.reviewedAt))) {
    addError(errors, 'review-timestamp', 'review.reviewedAt', 'The independent review needs a valid timestamp.');
  }
  if (!Array.isArray(review.unresolvedHighSeverity) || review.unresolvedHighSeverity.length > 0) {
    addError(errors, 'review-high-severity', 'review.unresolvedHighSeverity', 'No unresolved high-severity review findings are permitted.');
  }
  if (review.sourceHash !== manifest.repository?.sourceHashEnd) {
    addError(errors, 'review-source-hash', 'review.sourceHash', 'The visual review must target the certified source hash.');
  }
  const evidenceById = new Map((manifest.evidence || []).map((item) => [item.id, item]));
  ABOUT_NARRATIVE_REQUIRED_EVIDENCE.filter((item) => item.reviewRequired).forEach((requirement) => {
    const expected = evidenceById.get(requirement.id)?.sha256;
    if (!expected || review.evidenceHashes?.[requirement.id] !== expected) {
      addError(errors, 'review-evidence-hash', `review.evidenceHashes.${requirement.id}`, `Reviewer did not approve the exact ${requirement.id} artifact.`);
    }
  });
}

export function validateAboutNarrativeCertificationManifest(manifest) {
  const errors = [];
  const warnings = [];
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest)) {
    return {
      releaseGrade: false,
      errors: [{ code: 'manifest-type', path: '', message: 'Manifest must be an object.' }],
      warnings,
    };
  }

  if (manifest.schemaVersion !== ABOUT_NARRATIVE_CERTIFICATION_SCHEMA_VERSION) {
    addError(errors, 'schema-version', 'schemaVersion', `Schema version ${ABOUT_NARRATIVE_CERTIFICATION_SCHEMA_VERSION} is required.`);
  }
  if (!isNonEmptyString(manifest.generatedAt) || !Number.isFinite(Date.parse(manifest.generatedAt))) {
    addError(errors, 'generated-at', 'generatedAt', 'Manifest needs a valid generation timestamp.');
  }

  const repository = manifest.repository;
  if (!repository || !isNonEmptyString(repository.commitSha) || repository.clean !== true) {
    addError(errors, 'repository-clean', 'repository', 'Release certification requires a clean commit SHA.');
  }
  if (!isSha256(repository?.sourceHashStart) || !isSha256(repository?.sourceHashEnd)) {
    addError(errors, 'source-hash', 'repository', 'Start and end source hashes must be SHA-256 values.');
  } else if (repository.sourceHashStart !== repository.sourceHashEnd) {
    addError(errors, 'source-changed', 'repository', 'Source changed while certification was running.');
  }

  const environment = manifest.environment;
  ['node', 'npm', 'os', 'hardware', 'gpu', 'playwright', 'chromium', 'webkit'].forEach((field) => {
    if (!isNonEmptyString(environment?.[field])) {
      addError(errors, 'environment-field', `environment.${field}`, `Environment field ${field} is required.`);
    }
  });

  const versions = manifest.versions;
  if (!Number.isInteger(versions?.schema) || !Number.isInteger(versions?.workerProtocol)) {
    addError(errors, 'runtime-versions', 'versions', 'Schema and Worker protocol versions must be recorded.');
  }
  if (!isNonEmptyString(versions?.compiler) || !isNonEmptyString(versions?.correspondenceRegistry)) {
    addError(errors, 'runtime-version-labels', 'versions', 'Compiler and correspondence registry versions must be recorded.');
  }
  if (versions?.pointBudgets?.desktop !== 12000 || versions?.pointBudgets?.mobile !== 5000) {
    addError(errors, 'point-budgets', 'versions.pointBudgets', 'Protected desktop/mobile point budgets must be 12000/5000.');
  }

  ['canonicalConfigSha256', 'productionArtifactSha256', 'certificationArtifactSha256'].forEach((field) => {
    if (!isSha256(manifest.artifacts?.[field])) {
      addError(errors, 'artifact-hash', `artifacts.${field}`, `Artifact hash ${field} is required.`);
    }
  });

  if (JSON.stringify(manifest.coverage) !== JSON.stringify(ABOUT_NARRATIVE_REQUIREMENT_COVERAGE)) {
    addError(errors, 'coverage', 'coverage', 'Manifest requirement coverage is incomplete or has drifted.');
  }

  validateCommands(manifest, errors, warnings);
  validateEvidence(manifest, errors);
  validateReview(manifest, errors);

  if (warnings.length > 0 && manifest.acknowledgedWarnings !== true) {
    addError(errors, 'warnings-unacknowledged', 'acknowledgedWarnings', 'Retry or flake warnings must be explicitly acknowledged.');
  }

  return { releaseGrade: errors.length === 0, errors, warnings };
}
