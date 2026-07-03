#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const viewports = [
  { label: 'mobile', width: 390, height: 844 },
  { label: 'tablet', width: 768, height: 1024 },
  { label: 'desktop', width: 1440, height: 900 },
];

for (const viewport of viewports) {
  const result = spawnSync(
    process.execPath,
    ['scripts/audit-daily-focus-boundary.mjs'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        ABS_DAILY_FOCUS_WIDTH: String(viewport.width),
        ABS_DAILY_FOCUS_HEIGHT: String(viewport.height),
      },
    },
  );

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

console.log(JSON.stringify({
  ok: true,
  matrix: 'daily-focus-shell',
  viewports,
}, null, 2));
