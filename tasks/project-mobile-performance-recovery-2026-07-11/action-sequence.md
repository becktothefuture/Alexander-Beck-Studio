# Action Sequence

1. Capture the complete WebKit/iPhone baseline and commit the repeatable audit.
2. Remove mobile-only full-frame blend, animated grain, and chooser backdrop capture; verify visuals and the full matrix.
3. Enable shared mobile canvas fast paths without changing geometry or interaction; verify layout-read and frame evidence.
4. Apply explicit budgets only to modes that remain structurally expensive; verify each changed mode visually and numerically.
5. Run final WebKit matrix, mobile screenshots, transition audits, canonical checks, and production verification.

Stop and investigate if a proof gate regresses visuals, interaction, errors, or frame pacing.
