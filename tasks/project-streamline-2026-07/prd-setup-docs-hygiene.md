# PRD: Setup And Docs Hygiene

## 1. Introduction/Overview

Clean repo setup metadata and stale documentation so future agents and developers run the right commands. Current setup mostly works, but missing Node/package metadata, placeholder scripts, default Vite README content, and stale audit docs create avoidable friction.

## 2. Goals

- Add explicit runtime/package manager metadata.
- Align CI with root canonical commands where practical.
- Replace placeholder scripts or mark them as intentionally manual.
- Replace default app README content with repo-specific guidance.
- Remove stale audit doc claims contradicted by current files.

## 3. User Stories

### US-001: Declare Node and package manager requirements
**Description:** As a developer, I want package metadata to state the expected Node/npm versions so local setup matches CI and Vite.

**Acceptance Criteria:**
- [ ] Root `package.json` includes appropriate `engines` and/or `packageManager`.
- [ ] App `package.json` includes compatible metadata if needed.
- [ ] CI Node version satisfies Vite's actual requirement.
- [ ] Install docs mention the expected setup command.

### US-002: Align CI and root build command
**Description:** As a maintainer, I want CI to call canonical root commands so build preconditions do not drift.

**Acceptance Criteria:**
- [ ] `.github/workflows/gh-pages.yml` uses root `npm run build` or an explicitly equivalent documented command.
- [ ] CI still verifies `react-app/app/dist/` output.
- [ ] `npm run check:site` passes locally.

### US-003: Replace placeholder scripts
**Description:** As a developer, I want scripts to either run real checks or be removed so they do not create false confidence.

**Acceptance Criteria:**
- [ ] `smoke` and `parity:capture` scripts are either wired to real commands or removed.
- [ ] Any retained manual guidance moves to docs rather than echo-only scripts.
- [ ] No documented workflow depends on removed placeholders.

### US-004: Refresh stale docs
**Description:** As a future agent, I want setup and audit docs to reflect current repo state.

**Acceptance Criteria:**
- [ ] `react-app/app/README.md` is repo-specific or points to root docs.
- [ ] Stale claims about missing lockfiles, ignored lockfiles, or absent HTML fragment validation are removed.
- [ ] Verification docs agree on `check:site`, `sim:validate`, and malformed-token command usage.

## 4. Functional Requirements

- FR-1: Setup metadata must not conflict with lockfiles or CI.
- FR-2: CI must not bypass required root prebuild steps.
- FR-3: Docs must not describe stale app architecture or deleted files as active.
- FR-4: Cleanup must not remove useful historical docs unless they are archived or clearly marked stale.

## 5. Non-Goals

- No package upgrades unless required by metadata.
- No CI provider migration.
- No deploy target change.
- No source/runtime behavior change.

## 6. Design Considerations

- Not applicable; this is repo setup and documentation work.

## 7. Technical Considerations

- Use npm because package-lock files are tracked at root and app.
- Be careful with `npm run check:malformed-tokens -- --full`; the root script already includes `--full`.
- Keep docs concise and command-focused.

## 8. Success Metrics

- New setup guidance matches the real repo.
- CI and local gates use the same command vocabulary.
- No placeholder scripts imply coverage that does not exist.

## 9. Decisions

- Replace default app README content with a short repo-specific pointer to the root setup docs and the React app's actual local commands.

## 10. Implementation Notes

Actioned: 2026-07-08

- Added Node/npm `engines` to root and app package metadata and synced top-level lockfile package metadata.
- Pinned GitHub Pages Node setup to `20.19.0`.
- Replaced CI's duplicate malformed-token invocation with `npm run check:malformed-tokens`.
- Replaced CI's manual flatten + app build sequence with root `npm run build`.
- Removed echo-only `smoke` and `parity:capture` app scripts.
- Replaced the default Vite app README with repo-specific commands.
- Updated setup, architecture, parity, implementation, and backlog docs to match current commands and lockfile/CI status.
- Marked the frozen executable audit snapshot as historical because several proof rows have since been remediated.

Verification:

```bash
npm run check:site
npm run sim:validate
```
