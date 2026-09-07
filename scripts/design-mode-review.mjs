import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import adapter from '../design-mode.config.mjs';
import { reviewDesignModeHandoff } from './lib/design-mode-review.mjs';

try {
  const input = process.argv[2];
  if (!input) throw new Error('Usage: npm run design:review -- <handoff.json>');
  const source = await readFile(input, 'utf8');
  if (Buffer.byteLength(source) > 1024 * 1024) throw new Error('Select a handoff smaller than 1 MiB.');
  console.log(JSON.stringify(await reviewDesignModeHandoff(
    fileURLToPath(new URL('..', import.meta.url)), adapter, JSON.parse(source),
  ), null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
