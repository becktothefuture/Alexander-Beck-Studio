import { spawnSync } from 'node:child_process';

const MAX_BUFFER_BYTES = 64 * 1024 * 1024;
const CANONICAL_ALLOWLIST = new Set([]);
const TEMP_DIRECTORY_NAMES = new Set(['tmp', 'temp', '.tmp', '.temp', '.cache']);

function comparePaths(left, right) {
  if (left === right) {
    return 0;
  }
  return left < right ? -1 : 1;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

function runGit(args, input = undefined) {
  const result = spawnSync('git', args, {
    encoding: 'utf8',
    input,
    maxBuffer: MAX_BUFFER_BYTES,
  });

  if (result.status !== 0) {
    fail(result.stderr.trim() || `git ${args.join(' ')} failed.`);
  }

  return result.stdout;
}

function nulRecords(value) {
  return value.split('\0').filter(Boolean);
}

function repositoryRoot() {
  return runGit(['rev-parse', '--show-toplevel']).trim();
}

function stagedPaths() {
  return nulRecords(runGit([
    'diff',
    '--cached',
    '--name-only',
    '--diff-filter=ACMR',
    '-z',
    '--',
  ])).sort(comparePaths);
}

function protectedReason(path) {
  const segments = path.split('/');

  if (segments.some((segment) => /^\.playwright-[^/]+$/.test(segment))) {
    return '.playwright-* browser artifact';
  }
  if (segments.includes('node_modules')) {
    return 'node_modules vendor artifact';
  }
  if (segments.includes('output')) {
    return 'output artifact';
  }
  if (
    segments.some((segment) => TEMP_DIRECTORY_NAMES.has(segment))
    || segments.at(-1)?.endsWith('.tmp')
  ) {
    return 'temporary artifact';
  }

  return null;
}

function parseAllowlist(args) {
  const allowlist = new Set(CANONICAL_ALLOWLIST);

  for (let index = 0; index < args.length; index += 1) {
    if (args[index] !== '--allowlist') {
      fail(`Unknown argument: ${args[index]}`);
    }

    const path = args[index + 1];
    if (!path || path.startsWith('/') || path.includes('..')) {
      fail('--allowlist requires an exact repository-relative path.');
    }
    allowlist.add(path);
    index += 1;
  }

  return allowlist;
}

function checkStaged(args) {
  const allowlist = parseAllowlist(args);
  const violations = stagedPaths()
    .filter((path) => protectedReason(path) && !allowlist.has(path))
    .map((path) => ({ path, reason: protectedReason(path) }));

  if (violations.length === 0) {
    console.log('PASS: no disallowed generated or temporary artifacts are staged.');
    return;
  }

  console.error('FAIL: staged repository artifacts are not allowed:');
  for (const violation of violations) {
    console.error(`- ${violation.path} (${violation.reason})`);
  }
  console.error(
    'Move durable evidence to a documented source path or add an exact reviewed allowlist entry.',
  );
  process.exit(1);
}

function indexEntries() {
  const entries = new Map();

  for (const record of nulRecords(runGit(['ls-files', '--stage', '-z']))) {
    const tabIndex = record.indexOf('\t');
    const metadata = record.slice(0, tabIndex).split(' ');
    const path = record.slice(tabIndex + 1);
    const stage = metadata[2];
    if (stage === '0') {
      entries.set(path, metadata[1]);
    }
  }

  return entries;
}

function blobSizes(oids) {
  if (oids.length === 0) {
    return new Map();
  }

  const output = runGit(
    ['cat-file', '--batch-check=%(objectname) %(objecttype) %(objectsize)'],
    `${oids.join('\n')}\n`,
  );
  const sizes = new Map();

  for (const line of output.trim().split('\n')) {
    const [oid, type, rawSize] = line.split(' ');
    if (type !== 'blob') {
      fail(`Expected ${oid} to be a blob, received ${type}.`);
    }
    sizes.set(oid, Number(rawSize));
  }

  return sizes;
}

function inventoryGroup(path) {
  const segments = path.split('/');
  const playwrightIndex = segments.findIndex((segment) => /^\.playwright-[^/]+$/.test(segment));
  if (playwrightIndex >= 0) {
    return {
      classification: 'generated browser evidence',
      path: `${segments.slice(0, playwrightIndex + 1).join('/')}/`,
    };
  }

  const nodeModulesIndex = segments.indexOf('node_modules');
  if (nodeModulesIndex >= 0) {
    return {
      classification: 'vendor dependency',
      path: `${segments.slice(0, nodeModulesIndex + 1).join('/')}/`,
    };
  }

  const temporaryIndex = segments.findIndex((segment) => TEMP_DIRECTORY_NAMES.has(segment));
  if (temporaryIndex >= 0 || segments.at(-1)?.endsWith('.tmp')) {
    const endIndex = temporaryIndex >= 0 ? temporaryIndex + 1 : segments.length;
    return {
      classification: 'generated temporary output',
      path: temporaryIndex >= 0 ? `${segments.slice(0, endIndex).join('/')}/` : path,
    };
  }

  const outputIndex = segments.indexOf('output');
  if (outputIndex >= 0) {
    return {
      classification: 'generated output',
      path: `${segments.slice(0, outputIndex + 1).join('/')}/`,
    };
  }

  return { classification: 'ignored source or unclassified', path };
}

function buildInventory(includeFiles) {
  const paths = nulRecords(runGit(['ls-files', '-ci', '--exclude-standard', '-z']))
    .sort(comparePaths);
  const entries = indexEntries();
  const uniqueOids = [...new Set(paths.map((path) => entries.get(path)))];
  const sizes = blobSizes(uniqueOids);
  const groups = new Map();
  const files = [];
  let totalBytes = 0;

  for (const path of paths) {
    const oid = entries.get(path);
    if (!oid || !sizes.has(oid)) {
      fail(`Could not resolve the indexed blob size for ${path}.`);
    }

    const bytes = sizes.get(oid);
    const group = inventoryGroup(path);
    const key = `${group.classification}\0${group.path}`;
    const aggregate = groups.get(key) || {
      path: group.path,
      classification: group.classification,
      files: 0,
      bytes: 0,
    };
    aggregate.files += 1;
    aggregate.bytes += bytes;
    groups.set(key, aggregate);
    totalBytes += bytes;

    if (includeFiles) {
      files.push({ path, classification: group.classification, bytes });
    }
  }

  return {
    version: 1,
    totals: { files: paths.length, bytes: totalBytes },
    groups: [...groups.values()].sort((left, right) => comparePaths(left.path, right.path)),
    ...(includeFiles ? { files } : {}),
  };
}

function printInventory(args) {
  let json = false;
  let includeFiles = false;

  for (const arg of args) {
    if (arg === '--json') {
      json = true;
    } else if (arg === '--details') {
      includeFiles = true;
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  const inventory = buildInventory(includeFiles);
  if (json) {
    console.log(JSON.stringify(inventory, null, 2));
    return;
  }

  console.log('Tracked ignored repository inventory');
  console.log('path\tclassification\tfiles\tbytes');
  for (const group of inventory.groups) {
    console.log(`${group.path}\t${group.classification}\t${group.files}\t${group.bytes}`);
  }
  console.log(`TOTAL\tall ignored tracked paths\t${inventory.totals.files}\t${inventory.totals.bytes}`);

  if (includeFiles) {
    console.log('\nfile\tclassification\tbytes');
    for (const file of inventory.files) {
      console.log(`${file.path}\t${file.classification}\t${file.bytes}`);
    }
  }
}

process.chdir(repositoryRoot());

const [command = 'check-staged', ...args] = process.argv.slice(2);
if (command === 'check-staged') {
  checkStaged(args);
} else if (command === 'inventory') {
  printInventory(args);
} else {
  fail(`Unknown command: ${command}`);
}
