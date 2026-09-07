import { spawn } from 'node:child_process';
import { access, mkdir, readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import process from 'node:process';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('..', import.meta.url));
const checkout = resolve(root, '.cache/design-mode');
const revision = 'efbf3ac3e4c1f6108caa3105ea148da91178abbd';
const repository = 'https://github.com/SandeepBaskaran/design-mode.git';
const cli = resolve(checkout, 'packages/mcp-local/src/bin/cli.ts');
const tsx = resolve(checkout, 'node_modules/tsx/dist/loader.mjs');
const command = process.argv[2];

async function exists(path) { try { await access(path); return true; } catch { return false; } }
function run(binary, args, cwd, capture = false) {
  // npm run supplies its CLI path, avoiding a shell and Windows .cmd handling.
  if (binary === 'npm' && process.env.npm_execpath) {
    args = [process.env.npm_execpath, ...args];
    binary = process.execPath;
  }
  return new Promise((fulfil, reject) => {
    const child = spawn(binary, args, { cwd, stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', shell: false });
    let text = '';
    let errors = '';
    const interrupt = () => child.kill('SIGINT');
    const terminate = () => child.kill('SIGTERM');
    process.on('SIGINT', interrupt);
    process.on('SIGTERM', terminate);
    const cleanup = () => { process.off('SIGINT', interrupt); process.off('SIGTERM', terminate); };
    if (capture) { child.stdout.on('data', (chunk) => { text += chunk; }); child.stderr.on('data', (chunk) => { errors += chunk; }); }
    child.on('error', (error) => { cleanup(); reject(error); });
    child.on('exit', (code) => { cleanup(); code === 0 ? fulfil(text.trim()) : reject(new Error(`${binary} exited ${code}: ${errors}`)); });
  });
}
async function assertPinned() {
  if (!await exists(cli)) throw new Error('Run npm run design:setup first.');
  const actual = await run('git', ['rev-parse', 'HEAD'], checkout, true);
  if (actual !== revision) throw new Error(`Design Mode must be at the tested revision ${revision}. Found ${actual}.`);
  if (await run('git', ['status', '--porcelain', '--untracked-files=no'], checkout, true)) throw new Error('The pinned Design Mode checkout has source changes. Review them before use.');
}

try {
  if (command === 'setup') {
    if (!await exists(resolve(checkout, '.git'))) {
      if (await exists(checkout) && (await readdir(checkout)).length > 0) throw new Error('The tooling directory already contains unrelated files. Choose a clean checkout location.');
      await mkdir(checkout, { recursive: true });
      await run('git', ['init', '--quiet'], checkout);
      await run('git', ['remote', 'add', 'origin', repository], checkout);
    }
    if (!await exists(cli)) {
      if (await run('git', ['remote', 'get-url', 'origin'], checkout, true) !== repository) throw new Error('Unexpected repository in the tooling directory.');
      await run('git', ['fetch', '--depth=1', 'origin', revision], checkout);
      await run('git', ['checkout', '--detach', revision], checkout);
    }
    await assertPinned();
    await run('npm', ['ci', '--ignore-scripts', '--workspace', '@design-mode/extension', '--workspace', '@design-mode/mcp-local', '--workspace', '@design-mode/shared', '--include-workspace-root=false', '--no-audit', '--no-fund'], checkout);
    await run('npm', ['run', 'build:extension'], checkout);
    await run(process.execPath, [resolve(root, 'scripts/design-mode-extension-build.mjs')], root);
    await run(process.execPath, ['--test', resolve(root, 'scripts/tests/design-mode-extension.test.mjs')], root);
    console.log(`\nLoad unpacked extension: ${resolve(checkout, 'packages/extension/dist')}\nThen run npm run design:config for the local MCP settings.`);
  } else if (command === 'mcp') {
    await assertPinned();
    await run(process.execPath, ['--import', tsx, resolve(root, 'scripts/lib/design-mode-companion.mjs')], checkout);
  } else if (command === 'config') {
    console.log(JSON.stringify({ mcpServers: { 'design-mode': { command: process.execPath,
      args: [resolve(root, 'scripts/design-mode-tooling.mjs'), 'mcp'], env: { DM_PORT: '9960' } } } }, null, 2));
  } else if (command === 'doctor') {
    await assertPinned();
    const pkg = JSON.parse(await readFile(resolve(checkout, 'package.json'), 'utf8'));
    const compatibility = JSON.parse(await readFile(resolve(checkout, 'packages/extension/dist/beck-compat.json'), 'utf8'));
    const sidepanelHash = createHash('sha256').update(await readFile(resolve(checkout, 'packages/extension/dist/sidepanel.js'))).digest('hex');
    if (compatibility.version !== 1 || compatibility.sidepanelSha256 !== sidepanelHash) throw new Error('Extension compatibility build is missing or stale. Run npm run design:setup.');
    console.log(JSON.stringify({ version: pkg.version, revision,
      companionInstalled: await exists(tsx), extensionBuilt: await exists(resolve(checkout, 'packages/extension/dist/manifest.json')),
      tokenOnlyActionsFixed: true,
      localSite: 'http://localhost:8012', connection: 'Choose Local on the extension MCP page; port 9960.',
      browserConnection: 'Check get_session_summary from the configured agent; this command does not prove a browser connection.',
    }, null, 2));
  } else throw new Error('Expected setup, mcp, config or doctor.');
} catch (error) { console.error(error.message); process.exitCode = 1; }
