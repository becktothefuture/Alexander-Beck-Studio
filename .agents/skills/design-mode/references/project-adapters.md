# Adapting the workflow to another project

Copy this skill independently of the beck.fyi adapter. Inspect the new project's package manager, framework, development URL, token source, generators, component system and verification commands. Do not assume Tailwind or Vite.

The generic engine is `scripts/lib/design-mode-pipeline.mjs`. It has no browser or framework dependency. The CLI is a host-specific entrypoint and imports `design-mode.config.mjs`; adapt that entrypoint and package scripts to the new repository. The tested second-project fixture in `scripts/tests/design-mode-pipeline.test.mjs` demonstrates JSON alias mutation without importing beck.fyi design sources.

An adapter supplies:

| Member | Contract |
| --- | --- |
| `id`, `version`, `origins` | Project identity, adapter schema version, exact permitted authoring origins. |
| `files` | Existing project-relative JSON inputs and generated outputs. Never a path from the browser payload. |
| `bindings` | Unique CSS variable + scope → authored file + JSON pointer. Include type, bounds, unit/scale and a readable context. |
| `validateSnapshot(snapshot)` | Optional initial source/generated parity check. |
| `validate(documents)` | Reject invalid states and normalisation that would silently change other fields. |
| `derive(documents)` | Pure generation of registered output documents. Preserve unrelated namespaces. |
| `withWriteLock(operation)` | Host serialisation policy. Account for existing editors; an in-process promise queue is not a cross-process lock. |
| `persist(root, replacements)` | Host's recoverable file transaction. Reuse its existing implementation and recovery policy. |

`valueType: number` can round-trip a runtime projection with an explicit `unit` and `scale`. Example: a JSON rem value projected into pixels by `value * 16` uses `unit: px`, `scale: 16`. This is an exact project transform, not permission to convert every CSS rem using 16px. String bindings preserve aliases/expressions; their adapter must validate the token grammar and permitted references for that project.

For CSS-authored tokens, the current deterministic engine is not a CSS writer. The agent edits the existing declaration in place. A future CSS adapter should use a parser and identify file, selector, complete at-rule ancestry, layer, declaration and source revision. Matching a variable name alone is insufficient. Explicitly test duplicate declarations, inactive queries, inherited aliases and layer priority before certifying that adapter.

Minimum certification: mutate one token and one alias; save/reload/regenerate; preserve a neighbouring breakpoint and unrelated tokens; reject stale/mixed-project input; prove failed writes roll back; confirm saved output with browser overrides disabled. Keep unsupported operations as source-reviewed proposals until those checks pass.

Version the skill, adapter and source together in Git. Pin the tested Design Mode revision separately. Browser preview undo, source change history and tool upgrades are separate histories; do not turn each drag event into a Git commit.
