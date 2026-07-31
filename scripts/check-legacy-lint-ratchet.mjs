import { existsSync, readFileSync, readdirSync, realpathSync, writeFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = resolve(SCRIPT_DIR, '..')
const APP_ROOT = join(REPO_ROOT, 'react-app', 'app')
const LEGACY_ROOT = join(APP_ROOT, 'src', 'legacy')
const BASELINE_PATH = join(SCRIPT_DIR, 'fixtures', 'legacy-lint-debt-baseline.json')
const ESLINT_BIN = join(APP_ROOT, 'node_modules', '.bin', 'eslint')
const UNUSED_RULE = 'no-unused-vars:["error",{"varsIgnorePattern":"^[A-Z_]","caughtErrors":"none"}]'
const PARSER_OPTIONS = '{"ecmaVersion":"latest","sourceType":"module","ecmaFeatures":{"jsx":true}}'
const TRACKED_RULES = new Set(['no-unused-vars', 'no-empty'])

const configUrl = pathToFileURL(join(APP_ROOT, 'eslint.config.js')).href
const { LEGACY_EMPTY_CATCH_DEBT, LEGACY_UNUSED_VARS_DEBT_FILES } = await import(configUrl)

function fail(message) {
  throw new Error(`Legacy lint ratchet failed: ${message}`)
}

function toRepoPath(absolutePath) {
  return relative(APP_ROOT, absolutePath).split(sep).join('/')
}

function validateInventory(name, entries) {
  if (!Array.isArray(entries)) fail(`${name} must be an array.`)

  const canonicalPaths = []
  const resolvedPaths = new Set()
  for (const entry of entries) {
    const file = typeof entry === 'string' ? entry : entry?.file
    if (typeof file !== 'string' || file.length === 0 || file.includes('\\')) {
      fail(`${name} contains an invalid path.`)
    }
    if (typeof entry === 'object' && (typeof entry.reason !== 'string' || entry.reason.trim().length === 0)) {
      fail(`${name} must give a reason for ${file}.`)
    }

    const absolutePath = resolve(APP_ROOT, file)
    const canonicalPath = toRepoPath(absolutePath)
    const legacyRelativePath = relative(LEGACY_ROOT, absolutePath)
    if (
      isAbsolute(file)
      || file !== canonicalPath
      || legacyRelativePath === ''
      || legacyRelativePath.startsWith(`..${sep}`)
      || isAbsolute(legacyRelativePath)
      || !/\.(?:js|jsx)$/.test(file)
    ) {
      fail(`${name} path is not canonical and contained by src/legacy: ${file}`)
    }
    if (!existsSync(absolutePath)) fail(`${name} references a missing file: ${file}`)

    const resolvedPath = realpathSync(absolutePath)
    const resolvedLegacyRelativePath = relative(realpathSync(LEGACY_ROOT), resolvedPath)
    if (
      resolvedLegacyRelativePath === ''
      || resolvedLegacyRelativePath.startsWith(`..${sep}`)
      || isAbsolute(resolvedLegacyRelativePath)
      || resolvedPath !== absolutePath
    ) {
      fail(`${name} path resolves through an alias or outside src/legacy: ${file}`)
    }
    if (resolvedPaths.has(resolvedPath)) fail(`${name} contains a duplicate resolved path: ${file}`)

    resolvedPaths.add(resolvedPath)
    canonicalPaths.push(file)
  }

  const sortedPaths = [...canonicalPaths].sort()
  if (sortedPaths.some((file, index) => file !== canonicalPaths[index])) {
    fail(`${name} must stay sorted.`)
  }
  return canonicalPaths
}

function collectJavaScriptFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const absolutePath = join(directory, entry.name)
    if (entry.isDirectory()) return collectJavaScriptFiles(absolutePath)
    return /\.(?:js|jsx)$/.test(entry.name) ? [absolutePath] : []
  })
}

function violationIdentity(violation) {
  return [
    violation.file,
    violation.ruleId,
    violation.line,
    violation.column,
    violation.endLine,
    violation.endColumn,
    violation.message,
  ].join('\u0000')
}

function sortViolations(violations) {
  return [...violations].sort((left, right) => violationIdentity(left).localeCompare(violationIdentity(right)))
}

function lintStrictLegacy() {
  if (!existsSync(ESLINT_BIN)) fail('ESLint is not installed. Run npm run install:all first.')

  const result = spawnSync(
    ESLINT_BIN,
    [
      'src/legacy/**/*.{js,jsx}',
      '--no-config-lookup',
      '--parser-options', PARSER_OPTIONS,
      '--rule', UNUSED_RULE,
      '--rule', 'no-empty:error',
      '--format', 'json',
      '--no-error-on-unmatched-pattern',
    ],
    { cwd: APP_ROOT, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 },
  )
  if (!result.stdout) fail(result.stderr.trim() || 'ESLint did not return the strict debt inventory.')

  let lintRows
  try {
    lintRows = JSON.parse(result.stdout)
  } catch {
    fail(`could not parse the strict ESLint inventory: ${result.stderr.trim()}`)
  }

  const fatalMessages = lintRows.flatMap((row) => row.messages.filter((message) => message.fatal))
  if (fatalMessages.length > 0) fail(`strict ESLint reported ${fatalMessages.length} fatal errors.`)

  return sortViolations(lintRows.flatMap((row) => row.messages
    .filter((message) => TRACKED_RULES.has(message.ruleId))
    .map((message) => ({
      file: toRepoPath(row.filePath),
      ruleId: message.ruleId,
      line: message.line,
      column: message.column,
      endLine: message.endLine ?? message.line,
      endColumn: message.endColumn ?? message.column,
      message: message.message,
    }))))
}

function diffViolations(expected, actual) {
  const expectedIdentities = new Set(expected.map(violationIdentity))
  const actualIdentities = new Set(actual.map(violationIdentity))
  return {
    added: actual.filter((violation) => !expectedIdentities.has(violationIdentity(violation))),
    removed: expected.filter((violation) => !actualIdentities.has(violationIdentity(violation))),
  }
}

function formatViolation(violation) {
  return `${violation.file}:${violation.line}:${violation.column} ${violation.ruleId} ${violation.message}`
}

function assertExactBaseline(expected, actual) {
  const { added, removed } = diffViolations(expected, actual)
  if (added.length === 0 && removed.length === 0) return

  const detail = [
    ...added.slice(0, 8).map((violation) => `  added: ${formatViolation(violation)}`),
    ...removed.slice(0, 8).map((violation) => `  removed: ${formatViolation(violation)}`),
  ].join('\n')
  fail(`strict debt differs from the reviewed baseline. Review the change, then update the baseline explicitly.\n${detail}`)
}

function validateBaseline(baseline) {
  if (baseline?.version !== 1 || !Array.isArray(baseline.violations)) {
    fail('the reviewed baseline has an unsupported shape.')
  }
  if (JSON.stringify(baseline.ruleOptions) !== JSON.stringify({
    'no-unused-vars': { varsIgnorePattern: '^[A-Z_]', caughtErrors: 'none' },
    'no-empty': { allowEmptyCatch: false },
  })) {
    fail('the reviewed baseline rule options do not match the strict ratchet.')
  }

  for (const violation of baseline.violations) {
    if (
      typeof violation.file !== 'string'
      || !TRACKED_RULES.has(violation.ruleId)
      || !Number.isInteger(violation.line)
      || !Number.isInteger(violation.column)
      || !Number.isInteger(violation.endLine)
      || !Number.isInteger(violation.endColumn)
      || typeof violation.message !== 'string'
    ) {
      fail('the reviewed baseline contains an invalid violation signature.')
    }
  }

  const identities = baseline.violations.map(violationIdentity)
  if (new Set(identities).size !== identities.length) {
    fail('the reviewed baseline contains a duplicate violation signature.')
  }
  const sortedIdentities = sortViolations(baseline.violations).map(violationIdentity)
  if (sortedIdentities.some((identity, index) => identity !== identities[index])) {
    fail('the reviewed baseline violations must stay sorted.')
  }

  validateInventory(
    'reviewed baseline files',
    [...new Set(baseline.violations.map(({ file }) => file))].sort(),
  )
}

function assertRuleFileSets(violations, unusedFiles, emptyCatchFiles) {
  const actualUnusedFiles = [...new Set(violations
    .filter(({ ruleId }) => ruleId === 'no-unused-vars')
    .map(({ file }) => file))].sort()
  const actualEmptyFiles = [...new Set(violations
    .filter(({ ruleId }) => ruleId === 'no-empty')
    .map(({ file }) => file))].sort()

  if (JSON.stringify(actualUnusedFiles) !== JSON.stringify(unusedFiles)) {
    fail('LEGACY_UNUSED_VARS_DEBT_FILES must exactly match the strict baseline files.')
  }
  if (JSON.stringify(actualEmptyFiles) !== JSON.stringify(emptyCatchFiles)) {
    fail('LEGACY_EMPTY_CATCH_DEBT must exactly match the strict baseline files.')
  }
}

function lintTextStrict(file, source) {
  const result = spawnSync(
    ESLINT_BIN,
    [
      '--stdin', '--stdin-filename', file,
      '--no-config-lookup',
      '--parser-options', PARSER_OPTIONS,
      '--rule', UNUSED_RULE,
      '--rule', 'no-empty:error',
      '--format', 'json',
    ],
    { cwd: APP_ROOT, input: source, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  )
  if (!result.stdout) fail(result.stderr.trim() || `ESLint did not lint the ${file} mutation probe.`)
  return JSON.parse(result.stdout)[0].messages
}

function lintTextWithProjectConfig(file, source) {
  const result = spawnSync(
    ESLINT_BIN,
    ['--stdin', '--stdin-filename', file, '--format', 'json'],
    { cwd: APP_ROOT, input: source, encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 },
  )
  if (!result.stdout) fail(result.stderr.trim() || `ESLint did not lint the configured ${file} mutation probe.`)
  return JSON.parse(result.stdout)[0].messages
}

function expectFailure(label, callback) {
  try {
    callback()
  } catch {
    return
  }
  fail(`mutation probe did not reject ${label}.`)
}

function runMutationProbes(currentViolations) {
  const existingPath = 'src/legacy/modules/core/constants.js'
  expectFailure('path traversal', () => validateInventory('probe', ['src/legacy/../main.js']))
  expectFailure('a canonical path alias', () => validateInventory('probe', [
    existingPath,
    'src/legacy/modules/core/../core/constants.js',
  ]))
  expectFailure('a duplicate resolved path', () => validateInventory('probe', [existingPath, existingPath]))

  const syntheticUnused = {
    file: LEGACY_UNUSED_VARS_DEBT_FILES[0],
    ruleId: 'no-unused-vars',
    line: 999999,
    column: 1,
    endLine: 999999,
    endColumn: 25,
    message: "'lintRatchetUnusedProbe' is assigned a value but never used.",
  }
  expectFailure('a new violation', () => assertExactBaseline(currentViolations, [
    ...currentViolations,
    syntheticUnused,
  ]))
  expectFailure('a stale baseline after debt removal', () => assertExactBaseline(
    currentViolations,
    currentViolations.slice(1),
  ))
  expectFailure('same-size debt substitution', () => assertExactBaseline(currentViolations, [
    ...currentViolations.slice(1),
    syntheticUnused,
  ]))

  const probeFile = LEGACY_UNUSED_VARS_DEBT_FILES[0]
  const probeSource = readFileSync(join(APP_ROOT, probeFile), 'utf8')
  const unusedMessages = lintTextStrict(
    probeFile,
    `${probeSource}\nconst lintRatchetUnusedProbe = 1\n`,
  )
  if (!unusedMessages.some(({ ruleId, message }) => (
    ruleId === 'no-unused-vars' && message.includes('lintRatchetUnusedProbe')
  ))) {
    fail('strict ESLint did not detect a new unused variable in an allowlisted file.')
  }

  const emptyMessages = lintTextStrict(probeFile, `${probeSource}\ntry {} catch {}\n`)
  if (!emptyMessages.some(({ ruleId }) => ruleId === 'no-empty')) {
    fail('strict ESLint did not detect a new empty catch in an allowlisted file.')
  }

  const normalSource = readFileSync(join(APP_ROOT, existingPath), 'utf8')
  const configuredEmptyMessages = lintTextWithProjectConfig(
    existingPath,
    `${normalSource}\ntry {} catch {}\n`,
  )
  if (!configuredEmptyMessages.some(({ ruleId }) => ruleId === 'no-empty')) {
    fail('project ESLint did not reject an empty catch in a normal legacy file.')
  }
}

try {
  const unusedFiles = validateInventory('LEGACY_UNUSED_VARS_DEBT_FILES', LEGACY_UNUSED_VARS_DEBT_FILES)
  const emptyCatchFiles = validateInventory('LEGACY_EMPTY_CATCH_DEBT', LEGACY_EMPTY_CATCH_DEBT)
  const currentViolations = lintStrictLegacy()
  assertRuleFileSets(currentViolations, unusedFiles, emptyCatchFiles)

  const baseline = {
    version: 1,
    ruleOptions: {
      'no-unused-vars': { varsIgnorePattern: '^[A-Z_]', caughtErrors: 'none' },
      'no-empty': { allowEmptyCatch: false },
    },
    violations: currentViolations,
  }

  if (process.argv.includes('--update-baseline')) {
    writeFileSync(BASELINE_PATH, `${JSON.stringify(baseline, null, 2)}\n`)
    console.log(`Updated ${relative(REPO_ROOT, BASELINE_PATH)} for explicit review.`)
    process.exit(0)
  }

  if (!existsSync(BASELINE_PATH)) fail(`missing baseline: ${relative(REPO_ROOT, BASELINE_PATH)}`)
  const reviewedBaseline = JSON.parse(readFileSync(BASELINE_PATH, 'utf8'))
  validateBaseline(reviewedBaseline)
  assertExactBaseline(reviewedBaseline.violations, currentViolations)

  if (process.argv.includes('--fixtures')) runMutationProbes(currentViolations)

  const counts = currentViolations.reduce((result, { ruleId }) => {
    result[ruleId] = (result[ruleId] ?? 0) + 1
    return result
  }, {})
  const legacyFileCount = collectJavaScriptFiles(LEGACY_ROOT).length
  console.log('Legacy lint ratchet passed.')
  console.log(`  Legacy JS/JSX files: ${legacyFileCount}`)
  console.log(`  Reviewed no-unused-vars debt: ${counts['no-unused-vars'] ?? 0} violations in ${unusedFiles.length} files`)
  console.log(`  Reviewed no-empty debt: ${counts['no-empty'] ?? 0} catches in ${emptyCatchFiles.length} files`)
  console.log('  New, removed, shifted, or substituted violations require an explicit baseline review')
  if (process.argv.includes('--fixtures')) console.log('  Mutation probes: passed')
} catch (error) {
  console.error(error.message)
  process.exit(1)
}
