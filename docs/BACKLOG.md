# Studioflow — engineering backlog

**Latest executable audit (proof-backed):** [`docs/prompts/audit-run-latest.md`](prompts/audit-run-latest.md) — run with the runnable template [`docs/prompts/repo-audit-executable-swarm.md`](prompts/repo-audit-executable-swarm.md).

## Audit status (work stream closed)

- **Status:** Audit **complete**; backlog items are **tracked** below. **Fixes are intentionally deferred** while other work is in flight — this file is the parking lot, not an active sprint.
- **Already shipped from the audit stream:** ESLint runs in **GitHub Pages** CI (`.github/workflows/gh-pages.yml`) so `main` cannot deploy with lint regressions.
- **Not done yet:** P0/P1 issues (docs vs network, focus visibility, `portfolio.css` on all entries, `MODES.DVD_LOGO`, lockfile policy, sound vs reduced motion, etc.) — tackle when you return to this lane.
- **When to re-open / refresh:** Before a release you care about, or after **shell/routing**, **multi-page HTML**, **global CSS**, or **privacy/docs** edits — re-run [`repo-audit-executable-swarm.md`](prompts/repo-audit-executable-swarm.md) and replace [`audit-run-latest.md`](prompts/audit-run-latest.md). Quick spot-check: `portfolio.css` in every shipped entry + `rg "FOCUS STYLES"` in `main.css`.
- **How to use the backlog when you resume:** Split mentally into **trust** (docs, privacy copy, a11y focus) vs **product/perf** (CSS parity across entries, physics allocations, lockfiles) and pick one lane first.

**Shipped after audit closeout (engineering follow-up):** `portfolio.css` linked on **`cv.html`**, **`styleguide.html`**, **`palette-lab.html`**; removed dead **`MODES.DVD_LOGO`** branch in `engine.js`; **`tokens.css`** double-semicolon fix; **`package.json`** repository URL from `origin`; **`AGENTS.md`** privacy line aligned with fonts/tactile/storage; **`.gitignore`** no longer ignores `package-lock.json`; **`react-app/app/package-lock.json`** added for **`npm ci`** in CI; **GitHub Pages** workflow runs **`validate:html-fragments`**; **`README`** backlog link + QA wording. Remaining **BL-*** rows still apply unless noted above.

---

## Product view — themes & consolidated future work

**ID convention (this file):**

- **BL-*** — Engineering debt and defects from the audit (tables below). **Source of truth for severity** until you re-triage.
- **FE-*** — **Feature epics** with a **PRD**; details stay in the PRD — backlog only tracks *that the initiative exists* and links to it.
- **DO-*** — **Documentation / content / DX** work mined from `docs/`; many **overlap** BL rows (noted so you do not double-count effort).
- **XP-*** — **Optional / experimental** ideas documented but **not** committed; promote to FE/BL when scoped.

### Themes → backlog IDs (roadmap planning)

| Theme | Business outcome | Primary IDs |
|-------|------------------|-------------|
| Trust & accessibility | Privacy story matches behavior; keyboard users can see focus | BL-P0-01, BL-P0-02, BL-P1-06–08, BL-P1-11, BL-P2-12 + DO-01, DO-03 |
| Release engineering | Reproducible installs and stronger CI gates | BL-P0-05, BL-P1-01–02, BL-P2-01, BL-P2-13, BL-P2-19–21 |
| Correctness & performance | Fewer latent bugs; smoother simulation | BL-P0-03, BL-P0-04, BL-P1-04–05, BL-P1-10, BL-P2-04, BL-P2-17, BL-P2-24 |
| Shell & routing | Consistent UX from any HTML entry or deploy shape | BL-P1-03, BL-P1-09, BL-P2-03, BL-P2-22–23 |
| Native macOS (future) | Credible desktop app / wrapper story | BL-NATIVE-01–03 |
| New simulation capability | 21st mode (Gaussian splat) | **FE-01** → PRD below |
| Docs hygiene | Fewer stale embed guides; single narrative for integrators | DO-01–04 |

### FE — Feature epics (PRD is canonical)

| ID | Initiative | PRD / spec | Notes |
|----|------------|------------|--------|
| **FE-01** | **Gaussian splat spatial simulation** (21st mode, local asset, WebGL, orbit interaction, reduced-motion behavior) | [`docs/development/PRD-GAUSSIAN-SPLAT-SIM.md`](development/PRD-GAUSSIAN-SPLAT-SIM.md) | **Open questions, milestones, risks, acceptance criteria** live only in the PRD (§ Open Questions, § Milestones, § Risks, § Acceptance Criteria). This row is the **backlog pointer** — do not duplicate the full spec here. |

### DO — Documentation & content (from `docs/`, merged for one backlog)

| ID | Work | Suggested priority | Overlap / note |
|----|------|-------------------|----------------|
| **DO-01** | **Rewrite or clearly label** [`INTEGRATION.md`](reference/INTEGRATION.md) for the **current Vite/React** pipeline: remove or implement documented globals (`window.SIMULATIONS`, `initBouncyBalls`, …), fix CSP example, refresh paths to `public/config`, align mode/keyboard story with [`MODES.md`](reference/MODES.md) | P1 | **Closes or narrows** BL-P0-01, BL-P1-08, BL-P1-11, BL-P2-12 in one pass if done well |
| **DO-02** | **Regenerate or remove** fixed KB figures in INTEGRATION **Performance** section; tie to real `dist` + Vite output | P3 | BL-P2-12 |
| **DO-03** | **Align README** “network / privacy” wording with actual fonts + optional tactile (same bar as AGENTS) | P2 | BL-P0-01 (trust) |
| **DO-04** | **SITE-COPY:** optionally move strings that still live only in HTML/JS into copy source of truth (per [`SITE-COPY.md`](reference/SITE-COPY.md) footnote) | P3 | Content ops; no BL duplicate |

### XP — Experimental / optional (docs only until approved)

| ID | Idea | Source | Next step if interested |
|----|------|--------|---------------------------|
| **XP-01** | **Full-screen grunge video overlay** (found-footage / rain-on-glass aesthetic, theme-aware, reduced-motion aware) | [`docs/grunge-video-overlay.md`](grunge-video-overlay.md) | Size performance + asset license + whether it fits **MATERIAL-PRESENCE**; then spawn a short PRD or FE-02 |
| **XP-02** | **Future routes** must follow shared shell + motion rules | [`docs/reference/MATERIAL-PRESENCE.md`](reference/MATERIAL-PRESENCE.md), [`SITE-STYLEGUIDE.md`](reference/SITE-STYLEGUIDE.md) | Ongoing **design contract** — not a single ticket; check when adding routes |

### Archive / explicitly not in backlog

- **Portfolio slider v1** — **Reference only.** [`docs/archive/portfolio-slider-v1.md`](archive/portfolio-slider-v1.md), [`docs/reference/PORTFOLIO.md`](reference/PORTFOLIO.md) § Archived Slider. **No default work** unless product explicitly revives a carousel.

### Related docs (no extra backlog rows)

- **DEV workflow:** [`docs/development/DEV-WORKFLOW.md`](development/DEV-WORKFLOW.md) — operational; CI improvements are covered under **BL-*** / `audit-run-latest.md`.
- **Implementation pointer:** [`docs/implementation.md`](implementation.md) — links here for backlog.

---

## How this backlog was produced

**Pass 1 (2026-03-21):** Five areas × two lenses (implementation vs systemic / native readiness), merged manually.

**Pass 2:** Mechanical grep, adversarial re-read of focus CSS, and a **verification gate**: `npm run build` (root) **passed**; `npm run lint` (`react-app/app`) **passed**; `npm run validate:html-fragments` **passed** (3 fragment files only). `dist/cv.html` after build **still omits** `/css/portfolio.css`.

**Pass 3 (same day):** **Ten parallel `explore` subagents** — **five areas × two roles**:
| Area | Senior agent | Mentor agent |
|------|----------------|---------------|
| 1 Build / CI / config | A1-S | A1-M |
| 2 Shell / entries / SPA | A2-S | A2-M |
| 3 Legacy physics / loop | A3-S | A3-M |
| 4 CSS / motion / a11y | A4-S | A4-M |
| 5 Docs / privacy / QA | A5-S | A5-M |

Findings below **merge** all three passes. Where agents disagreed (e.g. one agent’s empty `dist/` vs built artifacts), **machine checks win** (this workspace: `react-app/app/dist/*.html` exist after `npm run build`; portfolio gap reproduces in `dist/cv.html`).

**Launch bar:** Trustworthy, smooth, professional — including credibility for a **first-class macOS experience** when judged against Apple [Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/) (menu bar, keyboard, windows, visible focus, accessibility settings).

**Reality check:** Shipped artifact is **Vite + React + legacy canvas** (`react-app/app/`). Fully **native** macOS is a **separate track** (`[native]` / `[wrapper]` tags).

---

## Pair synthesis (senior + mentor) by area — after 10 subagents

### Area 1 — Build, CI, config

**Merged themes:** **`.gitignore` line 11 ignores `package-lock.json` repo-wide** — stronger than “missing app lockfile”: even a generated `react-app/app/package-lock.json` would be ignored unless the rule changes or the file is force-added. CI uses `npm install` when no lockfile is present; **`npm ci` uses `--ignore-scripts` when lockfile exists**. Root `npm run build` and CI **do not share one script invocation** (CI runs flatten + `cd react-app/app && build` vs root `package.json` `build`) — drift risk. **Two flatten writers:** CLI `scripts/flatten-design-config.mjs` and Vite dev `POST` (`vite.config.js`). Duplicate dev/preview `--port` in root + app `package.json`. No `engines` field; GHA uses floating `@v4` tags. Root holds Playwright; Pages job only installs `react-app/app`.

**Actions:** Fix lockfile policy (stop ignoring lockfiles or adopt workspaces + one committed lock); align CI with `npm run build` from root; unify flatten implementation; **ESLint in CI** (done); add optional **fragment validate** / **Playwright** steps; add `engines`; document dev POST.

### Area 2 — Shell, entries, SPA, stacking

**Merged themes:** **`portfolio.css` only on `index.html` + `portfolio.html`**; CV / styleguide / palette-lab omit it; SPA does not inject stylesheets — **first HTML wins**. **Verified in `dist/cv.html`.** **Mentor:** absolute `/css/...` URLs and no explicit Vite `base` → **subpath deploys** (e.g. GitHub Pages project site) can 404 assets; `routes.js` pathname matching **ignores base path**. **fade-blocking** differs: home `#abs-scene` only vs others `#abs-scene,#app-frame`. **popstate** may bypass the same pipeline as `pushState` navigations. **Gated routes + `sessionStorage`** brittle in webviews. Drawer host contract (React + legacy) remains high-risk if refactored.

**Actions:** Add `portfolio.css` to every shell entry; consider `base` + route normalization; unify critical CSS; review `popstate` vs transition/gate cleanup.

### Area 3 — Legacy physics / loop

**Merged themes:** **`MODES.DVD_LOGO` referenced in `engine.js`, absent from `constants.js` `MODES`** (senior: P0 correctness). **Allocations:** `resolveCollisions` return object, portfolio pit contact profile, `getModeRenderer` wrapper, per-frame option literals, per-ball rim `opts`, collision id string, `pendingPhysics` object, pit `percentile` sort (prior pass). **`updatePhysics` is `async` without `await`** (avoidable overhead). **Mentor:** `Math.random` everywhere, singleton globals, throttle skips physics, kaleidoscope vs fixed-step **dual time contracts**, portfolio pit hash seeding vs `Math.random` elsewhere, spatial hash iteration order → subtle non-determinism, **no automated physics tests**.

**Actions:** Fix or remove `DVD_LOGO`; allocation pass; RNG policy; long-term sim/view boundary and harness.

### Area 4 — CSS, motion, a11y

**Merged themes:** Global `*:focus, *:focus-visible { outline: none; box-shadow: none }` plus follow-on blocks that still **do not** add a visible ring (misleading “WCAG” comment). **`panel.css`:** form controls disable focus; **~19 `!important`**; **pulse animation** without reduced-motion; **`palette-lab.css`** transitions without reduced-motion. **Sound:** `sound-toggle.js` skips mount when reduced motion; **`sound-engine.js` bails on `prefersReducedMotion`** for collision audio too — motion preference **suppresses audio**, not just animation. Toggle does not re-run when the media query changes at runtime (engine listens; toggle does not). **Empty sound slot** min-size when toggle null. **`portfolio.css`** has a solid reduced-motion block — use as template.

**Actions:** Real focus rings; decouple audio from reduced motion (or offer in-app toggle); reduced-motion in panel + palette-lab; optional live `matchMedia` for toggle remount.

### Area 5 — Docs, privacy, QA

**Merged themes:** **`INTEGRATION.md` / `AGENTS.md`** “no external calls” vs **Google Fonts on all main HTML entries** + optional **jsdelivr** tactile. **`INTEGRATION.md` documents APIs not in code** (`window.SIMULATIONS`, `bouncyBallsModeChange`, `initBouncyBalls` — **grep: only in INTEGRATION.md**). Config paths / mode counts / bundle numbers in INTEGRATION likely **stale** vs `public/config` + 20 modes. **CSP snippet** incompatible with fonts + tactile. **`storage.js`** disables main settings blob but other `localStorage` uses remain — align copy with line 46 in `AGENTS.md`. CI = build + file check only. Placeholder `repository.url`. README vs INTEGRATION wording drift.

**Actions:** Rewrite integration + critical constraints; remove or implement documented globals; fix repo URL; CI or explicit “manual gate” story.

---

## Backlog items (grouped by severity)

### P0

| ID | Title | Tags | Notes |
|----|--------|------|--------|
| **BL-P0-01** | Docs claim no external calls; shipped HTML loads Google Fonts; tactile can load jsdelivr | `[web]` | `AGENTS.md`, `INTEGRATION.md`, `*.html`, `tactile-layer.js` |
| **BL-P0-02** | Keyboard focus effectively suppressed globally; “WCAG” overrides still omit visible ring | `[web]` `[wrapper]` | `main.css` (~3424–3432, ~3719–3730); `panel.css` form controls |
| **BL-P0-03** | Legacy sim/render coupled via singleton globals | `[native]` | `state.js`, `engine.js` |
| **BL-P0-04** | **`MODES.DVD_LOGO` used in `engine.js` but not defined on `MODES`** | `[web]` | `constants.js`, `engine.js` |
| **BL-P0-05** | **`.gitignore` ignores `package-lock.json` everywhere** — reproducible installs blocked by policy | `[web]` `[ops]` | `.gitignore` L11; cannot commit app lockfile without rule change |

### P1

| ID | Title | Tags | Notes |
|----|--------|------|--------|
| **BL-P1-01** | No lockfile under `react-app/app`; CI uses `npm install` | `[web]` | Root `package-lock.json` may still be **tracked** in git despite `.gitignore` (pre-ignore commit); app subtree has no lock; new app lock needs ignore rule change or `git add -f` |
| **BL-P1-02** | CI does not run **HTML fragment validate** or **Playwright** audits (**ESLint** added to `gh-pages.yml` after audit) | `[web]` | `gh-pages.yml`; local `npm run lint` still recommended pre-push |
| **BL-P1-03** | `portfolio.css` missing on CV / styleguide / palette-lab — **confirmed in `dist/`** | `[web]` | Source + `dist/cv.html` |
| **BL-P1-04** | Pit perf telemetry: `percentile()` sorts | `[web]` | `engine.js` |
| **BL-P1-05** | Physics tied to display throttle + accumulator caps | `[web]` `[native]` | `loop.js`, `engine.js` |
| **BL-P1-06** | Reduced motion disables **sound engine paths**, not only the toggle UI | `[web]` | `sound-engine.js` (`prefersReducedMotion` guards); `sound-toggle.js` |
| **BL-P1-07** | AGENTS “localStorage settings only” vs panel/palette persistence | `[web]` | `panel-dock.js`, `colors.js`, `control-registry.js`; contrast `storage.js` |
| **BL-P1-08** | INTEGRATION CSP + privacy bullets incompatible with real origins | `[web]` | `INTEGRATION.md` |
| **BL-P1-09** | **Root-relative asset URLs + no `base`** — subpath / some webview deploys break | `[web]` `[wrapper]` | HTML `/css/...`, `vite.config.js`, `routes.js` |
| **BL-P1-10** | **`resolveCollisions` allocates a new return object** (hot loop) | `[web]` | `collision.js` (~422–426) per senior agent |
| **BL-P1-11** | **`INTEGRATION.md` embed APIs absent from codebase** (`SIMULATIONS`, `initBouncyBalls`, …) | `[web]` `[docs]` | Grep hits only `INTEGRATION.md` |

### P2

| ID | Title | Tags | Notes |
|----|--------|------|--------|
| **BL-P2-01** | No CI check for flatten vs generated JSON drift | `[web]` | |
| **BL-P2-02** | Dev `POST /api/design-system/config` unauthenticated | `[web]` | `vite.config.js` |
| **BL-P2-03** | Reduced-motion SPA path vs legacy preload parity | `[web]` | `useShellRouteTransition.js` |
| **BL-P2-04** | Other per-frame / per-call allocations (mode renderer wrapper, pit profile, cursor explosion, option literals, rim `opts`, …) | `[web]` | `mode-controller.js`, `collision.js`, `cursor-explosion.js`, `ball-rim.js`, `engine.js` |
| **BL-P2-05** | No `prefers-reduced-motion` in `panel.css` / `palette-lab.css`; panel pulse animation | `[web]` | Senior line counts for `!important` in `panel.css` |
| **BL-P2-06** | Widespread `!important` vs AGENTS CSS rule | `[web]` | |
| **BL-P2-07** | Breakpoint literals vs tokens | `[web]` | |
| **BL-P2-08** | `user-select: none` on `body` | `[web]` `[wrapper]` | |
| **BL-P2-09** | CV smooth scroll without reduced-motion guard | `[web]` | |
| **BL-P2-10** | Root vs app install split; CI skips root | `[web]` | |
| **BL-P2-11** | No dependabot config | `[web]` | |
| **BL-P2-12** | INTEGRATION paths / mode count / bundle stats stale | `[web]` | |
| **BL-P2-13** | App `smoke` / `parity:capture` are echo placeholders | `[web]` | `react-app/app/package.json` |
| **BL-P2-14** | AGENTS omits some root scripts (portfolio audits, figma, precommit, clean) | `[web]` | |
| **BL-P2-15** | Design save dev vs static — document | `[web]` | |
| **BL-P2-16** | Portfolio drawer mount fallback if host missing | `[web]` | |
| **BL-P2-17** | `Math.random` / unstable pair order — non-deterministic sim | `[web]` `[native]` | |
| **BL-P2-18** | Motion policy split (CSS vs canvas vs routes) | `[web]` | |
| **BL-P2-19** | `validate:html-fragments` scope tiny | `[web]` | |
| **BL-P2-20** | CI recipe ≠ single `npm run build` entrypoint | `[web]` | Root `package.json` vs `gh-pages.yml` steps |
| **BL-P2-21** | Duplicate flatten logic (CLI + Vite plugin) | `[web]` | Drift risk |
| **BL-P2-22** | `popstate` vs `pushState` transition / gate parity | `[web]` | `useShellRouteTransition.js` |
| **BL-P2-23** | Gated routes + `sessionStorage` fragile in restricted webviews | `[web]` `[wrapper]` | `access-gates.js` |
| **BL-P2-24** | `updatePhysics` async with no await | `[web]` | `engine.js` |
| **BL-P2-25** | Sound toggle not updated when user toggles OS reduced motion at runtime | `[web]` | `sound-toggle.js` vs `sound-engine.js` |
| **BL-P2-26** | Empty `#sound-toggle-slot` / `.portfolio-sound-slot` still reserves space | `[web]` | `PortfolioRoute.jsx`, `CvRoute.jsx`, `main.css` |

### P3

| ID | Title | Tags | Notes |
|----|--------|------|--------|
| **BL-P3-01** | Unknown paths → home | `[web]` | `routes.js` |
| **BL-P3-02** | Unused `main.jsx` / stock `App.jsx` | `[web]` | |
| **BL-P3-03** | Placeholder `repository.url` | `[ops]` | Root `package.json` |
| **BL-P3-04** | Double `;;` in `tokens.css` | `[web]` | |
| **BL-P3-05** | POSIX env in `audit:canvas-spa:quick` | `[web]` | |
| **BL-P3-06** | Certify default port vs preview | `[web]` | |
| **BL-P3-07** | `test-gate-roundtrip.mjs` unwired | `[web]` | |
| **BL-P3-08** | `config-sync.js` banner ports | `[web]` | |
| **BL-P3-09** | Dead kaleidoscope collision branch | `[web]` | `engine.js` |
| **BL-P3-10** | `mode-controller` initialize outside try | `[web]` | |
| **BL-P3-11** | Pre-commit omits flatten/lint | `[ops]` | |
| **BL-P3-12** | GHA permissions / floating action major versions | `[ops]` | |
| **BL-P3-13** | Vite dynamic+static import warnings | `[web]` | Build reporter |
| **BL-P3-14** | Duplicate `--port` in root + app npm scripts | `[web]` | |
| **BL-P3-15** | `sound-toggle.js` stale hover docs / console.log on reduced-motion branch | `[web]` | |
| **BL-P3-16** | No `engines` in package.json | `[web]` | |
| **BL-P3-17** | `ctx.clip` errors swallowed | `[web]` | `engine.js` |
| **BL-P3-18** | `loop.js` FPS sample uses `shift` on array | `[web]` | |

### Cross-cutting — native macOS (HIG-informed)

| ID | Title | Tags | Notes |
|----|--------|------|--------|
| **BL-NATIVE-01** | No menu bar command surface / standard windowing | `[native]` `[wrapper]` | |
| **BL-NATIVE-02** | Canvas + web focus vs Full Keyboard Access / VoiceOver | `[native]` `[wrapper]` | |
| **BL-NATIVE-03** | No wrapper toolchain (signing, notarization) in repo | `[native]` | |

---

## Maintenance

- Close **BL-*** items with PR links or a “Done” section in your tracker; when **DO-01** (or similar) lands, **close or narrow** the overlapping **BL-*** rows in the same PR notes.
- **FE-*** rows stay until the PRD is delivered or explicitly cancelled; update the PRD, not a second spec in this file.
- **XP-*** rows promote to **FE-** (new PRD) or **BL-** (scoped defect) when you commit to building them.
- Config controls: live apply + `design-system.json` + flatten per `AGENTS.md`.
