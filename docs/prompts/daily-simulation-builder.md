# Daily Simulation Builder Prompt

You are working in `/Users/alexanderbeck/Projects-code/Alexander Beck Studio Website`.

Create one new simulation candidate for the Alexander Beck Studio site. This is an automation-candidate, not a promotion to the live daily rotation.

## Source of Truth

Before proposing or editing, inspect:

- `react-app/app/src/data/simulationCatalog.json`
- `docs/reference/MODES.md`
- `docs/reference/SIMULATION-DESIGN-GUIDELINES.md`
- `docs/reference/CONFIGURATION.md`
- the existing `/lab/*.html` routes and route wiring in `react-app/app/src/lib/routes.js`
- `react-app/app/vite.config.js`

The launchpad at `/simulations.html` reads from `react-app/app/src/data/simulationCatalog.json`. Any new candidate must be added there.

## First Deliverable: Pitch

Before implementation, write a dated pitch note:

`docs/simulations/pitches/YYYY-MM-DD-<simulation-id>.md`

The pitch must include:

- the simulation name and id;
- the one-sentence idea;
- why this is different from the existing daily rotation and collection entries;
- how it follows the circle/material constraints in `SIMULATION-DESIGN-GUIDELINES.md`;
- the interaction model for mouse, drag, and touch;
- why it belongs at the automation-candidate level for now;
- what would make it promotable to daily rotation;
- what would make it worth deleting.

Do not skip the pitch. The pitch is how Alexander reviews the idea before deciding whether it should move up a level.

## Candidate Implementation Contract

Build the candidate as a route-backed lab page:

- `/lab/<simulation-id>.html`
- a React entry in `react-app/app/src/entries/`
- route wiring in `react-app/app/src/lib/routes.js`
- Vite input wiring in `react-app/app/vite.config.js`
- registry/config metadata with `enabledInRotation: false`
- any config file under `react-app/app/public/config/` when the simulation is parameterised

Add the candidate to `react-app/app/src/data/simulationCatalog.json` with:

- `"stage": "automation-candidate"`
- `"origin": "daily-automation"`
- `"introducedOn": "YYYY-MM-DD"`
- `"includeInNarrative": false`
- `"reviewStatus": "candidate"`
- `"pitchPath": "docs/simulations/pitches/YYYY-MM-DD-<simulation-id>.md"`
- a concise summary that will make sense in the launchpad card

Do not add new candidates to `daily-rotation`. Promotion is a separate human decision.

## Preview Requirement

After implementing, run the dev server and capture launchpad previews:

```bash
npm run dev
npm run sim:capture -- --ids <simulation-id> --frames=4
```

If `ffmpeg` is installed, this creates a low-frame-rate GIF at:

`react-app/app/public/previews/simulations/<simulation-id>/preview.gif`

It always creates:

`react-app/app/public/previews/simulations/<simulation-id>/poster.png`

Keep the GIF lightweight. Do not produce long or high-resolution preview media.

## Verification

Run:

```bash
npm run sim:validate
npm run build
```

If the change touches routing, canvas mount behavior, transition behavior, or promoted daily rotation behavior, run the relevant audit from `AGENTS.md`.

## Handoff

Report:

1. Pitch path
2. Candidate URL
3. Catalog entry added
4. Preview assets created or why capture could not run
5. Verification command and result
6. Risks or promotion blockers

Do not commit unless Alexander explicitly asks.
