import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = resolve(root, 'react-app/app/dist-editor-preview');
const destination = resolve(root, 'react-app/app/dist/editor-preview');
const sourceEntry = resolve(source, 'lab/about-narrative.html');
const destinationEntry = resolve(destination, 'lab/about-narrative.html');

const sourceHtml = await readFile(sourceEntry, 'utf8');
if (!sourceHtml.includes('/editor-preview/assets/')) {
  throw new Error('About editor preview was not built with the /editor-preview/ base path.');
}

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(source, destination, { recursive: true });

const deployedHtml = await readFile(destinationEntry, 'utf8');
const noIndexHtml = deployedHtml.includes('name="robots"')
  ? deployedHtml
  : deployedHtml.replace(
    '<meta name="viewport"',
    '<meta name="robots" content="noindex,nofollow" />\n    <meta name="viewport"',
  );
await writeFile(destinationEntry, noIndexHtml);

console.log(`Prepared public About editor preview at ${destinationEntry}`);
