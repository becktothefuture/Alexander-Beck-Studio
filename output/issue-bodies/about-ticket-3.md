Parent specification: #44

## What to build

Retune the About Sequence so the Discipline-to-editorial handoff and the late editorial-to-Point-Field handoff do not produce empty frames. Preserve readable editorial pacing and the small authored breaths between later Titles. Coordinate the relevant Text, Visibility, Point Field, Camera, Motion, interaction, and World timing so forward and reverse playback remain coherent.

## Acceptance criteria

- The Discipline reveal crossfades into its editorial block without an empty interval.
- The final visible Discipline editorial material hands off to the Point Field or next Title without a long blank run.
- Text or perceptible material motion remains present across nearly the entire supported Sequence.
- No inactive run longer than the agreed fine-scan tolerance appears at desktop, tablet, or portrait-mobile references.
- Later Titles retain short intentional breaths and do not overlap into an unreadable stack.
- The Point Field return, Camera reframe, Visibility, Motion, and subsequent World arrivals remain synchronized.
- Forward and reverse scrubbing do not pop, leave stale labels, or reveal hidden transitional states.
- The final invitation and the end of the Sequence remain intact.
- Canonical Story duration and responsive scroll duration are updated together when late timings move.
- Deterministic checks assert the new semantic handoffs and active-interval coverage.
- Chromium contact sheets demonstrate the complete revised Sequence at every reference viewport.
- The project’s focused checks and build pass.

## Blocked by

#46
