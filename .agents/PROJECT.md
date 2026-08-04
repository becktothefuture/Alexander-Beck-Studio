# Agent activity

| Date | Agent | Action | Files | Outcome |
| --- | --- | --- | --- | --- |
| 2026-07-18 | Muse | Tuned the dark studio-window surface and noise strength | `design-system.json`, `tokens.css`, production entry shell | Dark background moved from `#141414` to `#1b1b1b`; dark noise opacity moved from `0.80` to `0.84`. |
| 2026-08-03 | Muse | Rebuilt the eight time-of-day palettes around mature hue families | `londonPalettes.js`, `simulationPaletteContract.js`, Palette Lab data | Removed purple and fluorescent colour combinations while preserving the palette schedule and shell surface contract. |
| 2026-08-03 | Muse | Reduced the London circle system to four distinct palettes on a twice-daily rotation | `londonPalettes.js`, `timeOfDayPalette.js`, `check-palette-schedule.mjs` | Soho Ink, Thames Weather, Brick Lane Saffron, and Barbican Concrete now repeat across eight three-hour slots; purple and Christmas red-green pairings are guarded by contract. |
| 2026-08-03 | Muse | Replaced the four circle palettes with the approved London network set | `londonPalettes.js`, palette schedule, first-paint and lab fallbacks | Soho Signal, Thames Data, Barbican Protocol, and Night Bus Mesh now provide four cooler, vivid personalities with no purple or Christmas red-green pairing. |
| 2026-08-03 | Ink | Added ten local Lab project illustrations | `public/assets/playground/images/*.svg`, `.agents/ink.md` | Valid standalone SVGs use accessible titles and descriptions, no remote dependencies, and no work-card rotation. |
| 2026-08-04 | Muse | Promoted the approved London set to the only simulation colour authority | Palette registry, runtime fallbacks, controls, configuration, and contracts | Removed the editable accent, legacy template registry, old console and Portfolio fallback schemes, and route-config palette labels; all simulation consumers now resolve Soho Signal, Thames Data, Barbican Protocol, or Night Bus Mesh. |
