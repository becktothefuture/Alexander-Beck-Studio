import { watch } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(repo, 'source-assets/about-surface-world/about-surface-world.blend');
const blender = process.env.ABS_BLENDER_BIN || '/Applications/Blender.app/Contents/MacOS/Blender';
const report = resolve(repo, 'output/about-surfaces-20260919/source/export-report.json');
const args = ['--background', '--factory-startup', '--enable-autoexec', '--python-exit-code', '1',
  '--python', resolve(repo, 'scripts/about-rollercoaster/export-surfaces.py'), '--',
  '--source', source, '--output', resolve(repo, 'react-app/app/public/models/about-rollercoaster-world'),
  '--report', report];
let lastExported = '';
let child = null;
let pending = false;
let timer = null;
let stopping = false;

async function exportSavedSource() {
  if (stopping) return;
  if (child) { pending = true; return; }
  let hash;
  try { hash = createHash('sha256').update(await readFile(source)).digest('hex'); }
  catch (error) { console.error(`Cannot read the saved About source: ${error.message}`); return; }
  if (hash === lastExported) return;
  await mkdir(dirname(report), { recursive: true });
  console.log(`Exporting saved About source ${hash.slice(0, 12)}…`);
  child = spawn(blender, args, { cwd: repo, stdio: 'inherit' });
  child.on('error', error => console.error(`Cannot start Blender: ${error.message}`));
  child.on('close', code => {
    child = null;
    if (code === 0) {
      lastExported = hash;
      console.log('About export saved. Vite verifies the manifest before refreshing the page.');
    } else console.error(`About export failed (${code}); the existing preview remains available.`);
    if (pending && !stopping) { pending = false; void exportSavedSource(); }
  });
}

const watcher = watch(dirname(source), (_event, file) => {
  if (String(file) !== 'about-surface-world.blend') return;
  clearTimeout(timer);
  timer = setTimeout(() => { void exportSavedSource(); }, 500);
});
const stop = () => {
  stopping = true;
  clearTimeout(timer);
  watcher.close();
  child?.kill('SIGTERM');
};
process.once('SIGINT', stop);
process.once('SIGTERM', stop);
console.log(`Watching ${source}`);
void exportSavedSource();
