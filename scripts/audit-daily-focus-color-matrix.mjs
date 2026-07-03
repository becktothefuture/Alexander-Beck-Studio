#!/usr/bin/env node
import { spawnSync } from 'node:child_process';

const palettes = ['river-mist', 'portland-haze', 'blue-break', 'sodium-rain'];
const themes = ['light', 'dark'];

for (const palette of palettes) {
  for (const theme of themes) {
    console.log(`[daily-focus-color] palette=${palette} theme=${theme}`);
    const result = spawnSync(
      process.execPath,
      ['scripts/audit-daily-focus-boundary.mjs'],
      {
        stdio: 'inherit',
        env: {
          ...process.env,
          ABS_DAILY_FOCUS_WIDTH: process.env.ABS_DAILY_FOCUS_WIDTH || '1440',
          ABS_DAILY_FOCUS_HEIGHT: process.env.ABS_DAILY_FOCUS_HEIGHT || '900',
          ABS_DAILY_FOCUS_PALETTE: palette,
          ABS_DAILY_FOCUS_THEME: theme,
        },
      },
    );

    if (result.status !== 0) {
      process.exit(result.status || 1);
    }
  }
}

console.log(JSON.stringify({
  ok: true,
  matrix: 'daily-focus-color',
  palettes,
  themes,
}, null, 2));
