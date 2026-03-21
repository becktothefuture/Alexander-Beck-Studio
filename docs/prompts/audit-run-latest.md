# Executable audit swarm — latest run

**Run ID (UTC):** 2026-03-21T11:57:20Z  
**Template:** [`repo-audit-executable-swarm.md`](repo-audit-executable-swarm.md)

**Audit status:** This run is **complete** and **frozen** as a snapshot. Remediation is **deferred**; full prioritized backlog lives in [`../BACKLOG.md`](../BACKLOG.md) under **Audit status (work stream closed)**. Refresh this file after the next deliberate audit pass.

## Preflight (machine proof)

| Step | Command | Result |
|------|---------|--------|
| Build | `npm run build` (repo root) | **exit 0** — Vite reported `✓ built in 1.88s` |
| Lint | `npm run lint` in `react-app/app` | **exit 0** (`LINT_EXIT:0`) |
| HTML fragments | `npm run validate:html-fragments` (repo root) | **exit 0** — `HTML fragment validation passed: 3 files.` |

## CI snapshot (this run)

| Check | Proof |
|-------|--------|
| ESLint in Pages workflow | `rg "Lint React app|lint --prefix" .github/workflows/gh-pages.yml` → matches **Lint React app** + `npm run lint --prefix react-app/app` |
| `validate:html-fragments` in CI | **Now in** `gh-pages.yml` (step **Validate HTML fragments**) — re-grep to confirm after pull |

---

## Falsifier

| Claim | Verdict | Proof |
|-------|--------|--------|
| “Build is broken” | **REJECT** | `npm run build` exit 0 |
| “ESLint fails” | **REJECT** | `npm run lint` exit 0 |
| “No root lockfile in git” | **REJECT** | `git ls-files package-lock.json` → `package-lock.json` (tracked) |
| “App has a lockfile” | **REJECT** | Glob `react-app/app/package-lock.json` → **0 files** |
| Rows below | **KEEP** | Each has fresh `rg` / command proof in this file |

---

## Scout findings (proof-first)

### A1 — Build / CI / lockfiles

**A1-S-01 — P1 — `react-app/app` has no `package-lock.json`**

- **PROOF:** Glob `react-app/app/**/package-lock.json` → **0 files**
- **FIX_HINT:** Add lockfile + fix `.gitignore` if you want `npm ci` for the app.

**A1-S-02 — P1 — `.gitignore` ignores `package-lock.json`**

- **PROOF:** `rg package-lock .gitignore` → `package-lock.json` (line 11)
- **FIX_HINT:** Narrow or remove rule so app lock can be committed.

**A1-S-03 — P2 — HTML fragment validator not in `gh-pages.yml`**

- **PROOF:** `rg validate:html .github/workflows/gh-pages.yml` → **no matches**; local `npm run validate:html-fragments` **passed**
- **FIX_HINT:** Add a workflow step after checkout (repo root has the script).

---

### A2 — Entries / `portfolio.css` / `dist/`

**A2-S-01 — P1 — Only `index.html` + `portfolio.html` reference `portfolio.css`**

- **PROOF:** `rg "portfolio\\.css" react-app/app --glob "*.html"` → **only** `index.html` L167, `portfolio.html` L166

**A2-S-02 — P1 — After build, `dist/cv.html` still has no portfolio stylesheet**

- **PROOF:** `rg portfolio react-app/app/dist/cv.html` → **no matches**  
- **Contrast:** `rg "portfolio\\.css" react-app/app/dist/index.html` → **match** (link present)

---

### A3 — Legacy physics

**A3-S-01 — P0 — `MODES.DVD_LOGO` used but not defined on `MODES`**

- **PROOF:** `rg MODES\\.DVD_LOGO engine.js` (under `.../physics/`) → L371  
- **PROOF:** `rg DVD_LOGO .../constants.js` → **no matches**

**A3-S-02 — P1 — `resolveCollisions` returns a new object literal**

- **PROOF:** `collision.js` L422–426:
  ```js
  return {
    pairCount: pairs.length,
    overlapDebt,
    sleepingPairSkips
  };
  ```

---

### A4 — CSS / sound / motion

**A4-S-01 — P0 — Global focus outline/box-shadow removed**

- **PROOF:** `main.css` after anchor `FOCUS STYLES — DISABLED` → `*:focus, *:focus-visible { outline: none;` (lines ~3425–3430 in current tree)

**A4-S-02 — P1 — Sound engine returns early when `prefersReducedMotion`**

- **PROOF:** `rg "prefersReducedMotion\\) return" sound-engine.js` → L701, L716, L817, L860

**A4-S-03 — P2 — No `prefers-reduced-motion` in panel or palette-lab CSS**

- **PROOF:** `rg prefers-reduced-motion panel.css` → **no matches**  
- **PROOF:** `rg prefers-reduced-motion palette-lab.css` → **no matches**

---

### A5 — Docs vs code

**A5-S-01 — P0 — AGENTS says no external calls; home HTML loads Google Fonts**

- **PROOF:** `AGENTS.md` → `No external calls` (Critical Constraints)  
- **PROOF:** `index.html` → `https://fonts.googleapis.com` (preconnect + css2 link)

**A5-S-02 — P1 — `window.SIMULATIONS` not implemented in app source**

- **PROOF:** `rg window\\.SIMULATIONS` with `--glob "*.{js,jsx,ts,tsx}"` from repo root → **no matches**  
- **Docs still mention it:** `docs/reference/INTEGRATION.md` (not re-grepped here; unchanged pattern)

---

## Severity rollup

| Tier | IDs |
|------|-----|
| **P0** | A4-S-01, A3-S-01, A5-S-01 |
| **P1** | A1-S-01, A1-S-02, A2-S-01, A2-S-02, A3-S-02, A4-S-02, A5-S-02 |
| **P2** | A1-S-03, A4-S-03 |

---

## Optional next CI step

Add after **Lint React app**:

```yaml
- name: Validate HTML fragments
  run: npm run validate:html-fragments
```

(Checkout is already repo root; script exists and **passed** this run.)

---

## Re-run

From repo root: `npm run build && npm run lint --prefix react-app/app && npm run validate:html-fragments`, then re-grep the proof patterns above or replace this file’s timestamp section.
