## Destination

Produce an evidence-backed assessment and remediation plan for every simulation in the production Home Daily Simulation rotation. The result identifies visual, motion, and interaction outliers on desktop and mobile, then defines how to bring them into one coherent material and motion family without erasing each simulation's distinct physical rule.

## Notes

- Scope is the entries whose current catalog stage is `daily-rotation`, including route-backed Daily Focus handoffs.
- Exclude collection-only, hidden, lab-only, and standalone experiments.
- This map plans and evaluates the work. It does not implement simulation fixes unless the destination is explicitly widened later.
- Preserve useful conceptual diversity. Coherence means comparable visual weight, legibility, responsiveness, and motion interest, not identical movement or composition.
- Every evaluation session must consult `DESIGN.md`, `docs/reference/SIMULATION-DESIGN-GUIDELINES.md`, and `react-app/app/src/data/simulationCatalog.json` before judging the live result.
- Use the `dev-browser` skill against `http://localhost:8012` for interaction and screenshot evidence.
- Evaluate the first readable frame, a settled interval, a high-activity interval, pointer movement, click/drag where supported, and touch behavior at a representative mobile viewport.
- Compare body size, density, palette/material weight, spacing and overlap, title legibility, motion energy, responsiveness, concept legibility, and sustained visual interest.
- Keep colour/material findings separate from size/density findings, and distinguish deliberate family exceptions from accidental drift.
- No code changes, commits, or production publication are authorized by this map.

## Decisions so far

- [Define the production comparison rubric](issues/01-define-production-comparison-rubric.md) — Use hard contract gates plus separate 0–4 visual, motion, interaction, and mobile scores; compare intentional families without allowing renderer-specific drift, and confirm outliers through controlled desktop/mobile evidence.
- [Capture desktop simulation evidence](issues/02-capture-desktop-simulation-evidence.md) — Retain a 192-frame light/dark desktop set. Current desktop outliers are Magnetic Field, Perspective, Depth, Juxtaposition, and Flow; several high-density modes remain title-legibility candidates pending mobile confirmation.

## Not yet specified

- Whether a confirmed outlier needs parameter-only tuning, renderer or physics redesign, removal from rotation, or replacement cannot be decided until the browser evidence is reviewed.
- Any focused tuning prototype needed to compare alternative settings will be specified only after the affected simulation and failure mode are known.
- The exact number of remediation waves and their ownership boundaries depend on how many shared versus simulation-specific causes the assessment finds.

## Out of scope

- Collection-only, hidden, lab-only, and standalone simulation experiments.
- Implementing or publishing the recommended fixes.
- Redesigning the persistent shell, Home title, Button Bar, site palette, or route system except where the assessment must identify a simulation-side contract violation.
