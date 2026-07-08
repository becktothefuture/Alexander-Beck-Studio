# PRD: Setup Environment And CI Parity

## 1. Introduction/Overview

The setup and deployment path is much cleaner after the first streamline programme, but one stale local environment template and one CI/local parity gap remain. This PRD updates setup guidance and makes CI fail on the same generated-config drift that local `npm run check:site` catches.

## 2. Goals

- Replace stale Codex environment setup commands.
- Align documented dev/preview ports with current scripts.
- Remove references to nonexistent root commands.
- Add generated-config parity checking to GitHub Pages before the write-producing build step.
- Keep setup docs and scripts consistent.

## 3. User Stories

### US-001: Refresh Codex environment template
**Description:** As a future agent, I want the environment template to run the real install and build commands so a new worktree starts correctly.

**Acceptance Criteria:**
- [ ] Template setup uses `npm run install:all` or an explicitly justified equivalent.
- [ ] Template references current dev port `8012` and preview port `8013`.
- [ ] Template no longer references `source/`.
- [ ] Template no longer exposes nonexistent `npm run watch` or `npm run help`.

### US-002: Align CI with local generated-config gate
**Description:** As a maintainer, I want CI to catch stale generated config before deploy so root build does not hide drift by rewriting files.

**Acceptance Criteria:**
- [ ] GitHub Pages workflow runs `npm run check:design-config` before `npm run build`.
- [ ] Workflow still runs malformed-token, lint, HTML fragment, simulation validation, and root build.
- [ ] `npm run check:site` still passes locally.

### US-003: Align baseline verification docs
**Description:** As an implementation agent, I want parity docs, precommit guidance, and setup docs to use the same baseline vocabulary.

**Acceptance Criteria:**
- [ ] `PARITY-CONTRACT.md` mentions `sim:validate` where appropriate.
- [ ] Precommit guidance clearly states whether it is a light checklist or the full gate.
- [ ] No docs imply `precommit:check` replaces `check:site`.

## 4. Functional Requirements

- FR-1: Update `docs/development/CODEX-ENVIRONMENT-TEMPLATE.toml`.
- FR-2: Update `.github/workflows/gh-pages.yml` to include generated-config parity before build.
- FR-3: Update docs only where they currently describe stale or partial commands.
- FR-4: Preserve root `npm run build` as the deployment build entrypoint.

## 5. Non-Goals

- No changes to deploy target or Pages configuration.
- No conversion of CI to run every Playwright audit.
- No package manager migration.

## 6. Design Considerations

None; this is setup and documentation work only.

## 7. Technical Considerations

`npm run build` writes generated config outputs. The check must run before build so CI catches drift instead of normalizing it silently.

## 8. Success Metrics

- A fresh agent can use the environment template without hitting nonexistent commands or old ports.
- CI and local checks agree on generated config state.

## 9. Open Questions

- Should `precommit:check` be expanded to call `check:site`, or should it remain a lightweight inspection script with clearer wording?
