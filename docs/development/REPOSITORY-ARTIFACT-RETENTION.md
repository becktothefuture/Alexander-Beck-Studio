# Repository artifact retention

## Purpose

This policy separates durable source and evidence from generated browser data, installed dependencies, build output, and temporary files. It implements the non-destructive part of `OPS-001`. It does not approve current-tree cleanup, remove files, or rewrite Git history.

`HD-02` was approved on 2026-07-30 and applied under `MILESTONE-09`. `ADR-005` keeps history rewriting outside this programme.

## Deterministic inventory

Run the grouped inventory:

```bash
node scripts/check-repository-artifacts.mjs inventory
```

Run the complete path-level inventory as deterministic JSON:

```bash
node scripts/check-repository-artifacts.mjs inventory --details --json
```

The byte measurement is the sum of indexed blob sizes, once for each tracked path. It is not the working-tree disk allocation or packed Git size. Paths, groups, and detailed entries are sorted. The output has no timestamp.

The policy-effective inventory has 13,776 ignored tracked paths and 1,099,684,630 bytes:

| Ignored tracked path | Classification | Files | Indexed bytes | Retention proposal | Reproduction or replacement |
| --- | --- | ---: | ---: | --- | --- |
| `.playwright-cli/` | Generated browser evidence | 13,607 | 1,017,800,663 | Do not retain | Rerun the relevant browser audit. The current directory has no complete capture manifest, so exact historical sessions are not reproducible. |
| `.playwright-mcp/` | Generated browser evidence | 80 | 73,127,851 | Do not retain | Rerun the relevant browser inspection. The current directory has no stable capture manifest. |
| `docs/research/about-page-direction/supporting/research/evidence/.playwright-cli/` | Generated research browser evidence | 3 | 1,910 | Do not retain | Use the checked-in research catalogue, screenshots, and source-specific capture material. Two of these snapshots are empty. |
| `docs/research/about-page-direction/supporting/research/evidence/awwwards/.playwright-cli/` | Generated research browser evidence | 2 | 23,233 | Do not retain | Use `research-catalogue.json`, the checked-in full-page screenshots, and the capture scripts in the adjacent `awwwards/` directory. |
| `node_modules/` | Vendored dependencies | 41 | 923,610 | Do not retain | Run `npm run install:all` from the two committed npm lockfiles. |
| `tmp/` | Generated temporary research output | 43 | 7,807,363 | Do not retain | Render or extract the checked-in `About-Me-Creative-Direction-Research.pdf` again. Use `pdftoppm` for page images and `pdftotext` for text. Rebuild a contact sheet only when it is needed for local review. |
| **Total** |  | **13,776** | **1,099,684,630** |  |  |

Before the policy edit, the inventory contained 13,777 ignored tracked paths and 1,099,684,867 indexed bytes. It also included `.vscode/settings.json`: one 237-byte source file. `.gitignore` now lists that existing file as an explicit exception, so it is tracked source and is no longer part of the ignored inventory. No tracked path was added, removed, moved, or rewritten.

The inventory contains no tracked path under `output/`, `temp/`, `.tmp/`, `.temp/`, or `.cache/` at this measurement.

## Classification and retention rules

| Classification | Repository rule |
| --- | --- |
| Authored source and shared project configuration | Track it in a source path. Do not place it below a generated directory. |
| Generated output and browser evidence | Ignore it. Regenerate it from a documented command or manifest. |
| Vendored dependencies | Ignore it. Restore it from the package manifest and lockfile. |
| Temporary output | Ignore it. Store it outside durable source paths and remove it through normal local cleanup when safe. |
| Intentionally durable evidence | Use a named location below `docs/`, compress it when practical, and add owner, reason, byte size, source, reproduction steps, and sensitivity review. Do not use `.playwright-*`, `output`, or temp directory names for durable evidence. |

In this inventory, the `tmp/` PDF render and text files are reproducible generated evidence because their checked-in PDF source remains available. The root browser captures are generated evidence but do not have enough manifest data for exact reproduction. The five browser snapshots below `docs/research/` have adjacent durable catalogues, screenshots, and capture material that replace their raw session form. No ignored path is classified as intentionally durable evidence.

The current generated-artifact exception list is empty. No current `.playwright-*`, `node_modules`, `output`, or temporary path is approved as durable evidence. `HD-02` approved retaining none of the 13,776 ignored generated, vendor, or temporary paths in their current locations. M09 applied that decision to the Git index only; local copies remain ignored.

One non-generated source exception is active:

| Exact path | Owner | Reason | Size | Reproduction or replacement |
| --- | --- | --- | ---: | --- |
| `.vscode/settings.json` | Repository maintainers | Shared Builder launch settings used by the project workflow | 237 bytes | Manually maintained project configuration; reconstruct it from the documented development command and Builder settings if lost. |

Any future durable evidence exception must be exact, not a directory wildcard. Reviewers must record the owner, reason, indexed byte size, reproduction or replacement method, and a sensitivity check in this document. Then they must add the exact path to `CANONICAL_ALLOWLIST` in `scripts/check-repository-artifacts.mjs`. A broad generated directory is never an acceptable exception.

## Staging enforcement

The pre-commit check rejects staged additions, copies, renames, or modifications when any path component matches:

- `.playwright-*`
- `node_modules`
- `output`
- `tmp`, `temp`, `.tmp`, `.temp`, or `.cache`
- a filename ending in `.tmp`

This check evaluates the staged index only. It does not change the worktree or index. Existing tracked artifacts do not fail unless a change to one is staged.

Run it directly:

```bash
node scripts/check-repository-artifacts.mjs check-staged
```

The `--allowlist <exact-repository-path>` option exists for isolated fixture validation and policy review. `scripts/precommit-check.sh` never passes command-line exceptions. Only exact entries reviewed into `CANONICAL_ALLOWLIST` are canonical exceptions.

## `HD-02` decision record

The reviewer considered these actions before `MILESTONE-09` started:

1. Approve the recommendation to retain no current generated path.
2. Name each current file that must remain durable evidence and provide its owner, reason, indexed size, reproduction or replacement method, and sensitivity review.
3. Keep all current artifacts and accept that `OPS-001` remains unresolved.

The user approved option 1 on 2026-07-30. M09 staged exact index-only deletions for all 13,776 approved paths. Approval applies only to current-tree index changes. It does not authorize deletion from local disks, Git history rewriting, commit, push, or publication.
