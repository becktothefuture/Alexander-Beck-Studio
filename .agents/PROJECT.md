# Agent activity

| Date | Agent | Action | Files | Outcome |
| --- | --- | --- | --- | --- |
| 2026-07-18 | Muse | Tuned the dark studio-window surface and noise strength | `design-system.json`, `tokens.css`, production entry shell | Dark background moved from `#141414` to `#1b1b1b`; dark noise opacity moved from `0.80` to `0.84`. |
| 2026-08-03 | Muse | Rebuilt the eight time-of-day palettes around mature hue families | `londonPalettes.js`, `simulationPaletteContract.js`, Palette Lab data | Removed purple and fluorescent colour combinations while preserving the palette schedule and shell surface contract. |
| 2026-08-03 | Muse | Reduced the London circle system to four distinct palettes on a twice-daily rotation | `londonPalettes.js`, `timeOfDayPalette.js`, `check-palette-schedule.mjs` | Soho Ink, Thames Weather, Brick Lane Saffron, and Barbican Concrete now repeat across eight three-hour slots; purple and Christmas red-green pairings are guarded by contract. |
