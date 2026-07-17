import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateAboutNarrativeCertificationManifest } from './lib/about-narrative-certification-manifest.mjs';

const manifestPath = resolve(process.argv[2] || 'output/playwright/about-narrative-hardening/certification/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const validation = validateAboutNarrativeCertificationManifest(manifest);

if (!validation.releaseGrade) {
  validation.errors.forEach((error) => console.error(`${error.code} ${error.path}: ${error.message}`));
  process.exitCode = 1;
} else {
  console.log(`PASS: release-grade About Narrative manifest: ${manifestPath}`);
}
