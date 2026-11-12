import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { FORBIDDEN_RUNTIME_PATHS, FORBIDDEN_RUNTIME_PATTERNS } from './lib/public-runtime-policy.mjs';

const packageRoot = resolve(process.argv[2] ?? fileURLToPath(new URL('../react-app/app/dist', import.meta.url)));
const sourceMapFile = /\.map(?:\.(?:br|gz))?$/;
const sourceMapDirective = /(?:\/\/|\/\*)[#@]\s*sourceMappingURL\s*=/;
const editableDesignFile = /\.(?:aepx?|afdesign|afphoto|afpub|ai|blend\d*|fig|indd|kra|psb|psd|sketch|xcf|xd)(?:\.(?:br|gz))?$/;
const draftName = /(?:^|[-_.\s])drafts?(?:$|[-_.\s])/;
const sourceMapHosts = new Set(['.cjs', '.css', '.htm', '.html', '.js', '.mjs', '.svg']);

const entries = await readdir(packageRoot, { withFileTypes: true, recursive: true });
const problems = [];
let files = 0;

if (!entries.some((entry) => entry.isFile() && entry.parentPath === packageRoot && entry.name === 'index.html')) {
  problems.push('index.html: missing production entry');
}

for (const entry of entries) {
  const absolutePath = resolve(entry.parentPath, entry.name);
  const pathname = relative(packageRoot, absolutePath).split(sep).join('/');
  const lowerPath = pathname.toLowerCase();

  if (entry.isSymbolicLink()) {
    problems.push(`${pathname}: symbolic links are outside the Pages package contract`);
  }
  if (FORBIDDEN_RUNTIME_PATHS.includes(lowerPath) || FORBIDDEN_RUNTIME_PATTERNS.some((pattern) => pattern.test(lowerPath))) {
    problems.push(`${pathname}: source-only material`);
  }
  if (draftName.test(entry.name.toLowerCase())) {
    problems.push(`${pathname}: draft material`);
  }
  if (!entry.isFile()) continue;
  files += 1;

  if (sourceMapFile.test(lowerPath)) {
    problems.push(`${pathname}: source map file`);
  }
  if (editableDesignFile.test(lowerPath)) {
    problems.push(`${pathname}: editable design file`);
  }
  if (sourceMapHosts.has(extname(lowerPath)) && sourceMapDirective.test(await readFile(absolutePath, 'utf8'))) {
    problems.push(`${pathname}: source map directive`);
  }
}

if (problems.length) {
  console.error(`FAIL: Pages package contains ${problems.length} issue(s) in ${packageRoot}`);
  for (const problem of problems.sort()) console.error(`- ${problem}`);
  process.exitCode = 1;
} else {
  console.log(`PASS: Pages package (${files} files)`);
}
