# Design Mode validation — 7 September 2026

Installed in the primary beck.fyi checkout on `feat/design-mode-pipeline`, using Node 24.14.0 and npm 11.9.0. Design Mode 2.2.1 is pinned to `efbf3ac3e4c1f6108caa3105ea148da91178abbd`. The vendor checkout remains clean.

## Verified setup and source checks

| Check | Result |
| --- | --- |
| `npm run install:all` | Passed. No dependencies were added to the website. |
| `npm run design:setup` | Passed, including the extension compatibility build and test. |
| `npm run design:doctor` | Passed; exact revision, companion, extension and compatibility artifact verified. |
| `npm run check:design-mode` | 14 tests passed: transaction, ownership, aliases, macOS paths, stale/mixed rejection, rollback and site-wide handoff review. |
| `npm run check:design-mode-mcp` | Passed; eight tools, simulated handshake, token metadata and isolated source-save/reload. |
| `npm run check:design-mode-extension` | Passed; token-only Copy/Send, empty/Original guards, mixed badge count and fail-closed source matching. |
| Upstream extension unit tests | 29 passed at the pinned revision. |
| `npm run check:site` | Passed in the primary checkout and again in the isolated release checkout after merging current remote code and fixing production About readiness; includes lint, source/config tests and production build. |
| `npm run check:about-narrative` | 204 tests passed, with the exported finale-framing regression suite included. |
| Skill metadata / `git diff --check` | Passed. |
| `npm run audit:about-publication` | Passed in Chromium and WebKit at 390px and 1440px, light/dark, reduced motion: direct URLs, old preview queries, SPA navigation and browser history all retain Coming soon. |
| `npm run audit:transition-flows` | Passed serially in Chromium and WebKit at 1280×900 with normal motion; six route transitions per browser. |
| `npm run audit:release-smoke` | Passed against the production build: route/semantic/accessibility/runtime smoke, unknown-path fallback and 18 Work publication checks. |
| Release dependencies and mutation fixtures | Both dependency audits report zero vulnerabilities; route registry, lint ratchet and dependency-cycle mutation fixtures passed. Tracked ignored-artifact inventory is empty. |

The installed Codex CLI registered `design-mode` using local stdio, an absolute Node/tooling path and `DM_PORT=9960`. A parsed comparison verified that all existing Codex settings and MCP servers were preserved. No Cloud transport is configured. The running task also used the same command through an SDK client because tools registered during a task are not added to its original tool inventory.

## Real extension acceptance

The actual unpacked extension was loaded in a separate Chromium profile on this Mac, without altering the user's Chrome profile. The real companion reported `extensionConnected: true` and an active Contact session on `http://localhost:8012/contact.html`. No simulated extension messages were used for this browser acceptance test.

The full cycle passed:

1. The extension's Design system input previewed `--button-bar-mobile-height` from `62.5px` to `66px` on the mobile Contact page.
2. **Send to Agent** submitted the real handoff. `get_changes` preserved the CSS variable, root scope, original/new values and token guidance.
3. `design:review` retained the handoff. The inspected `design:tokens` plan contained one operation: `/runtime/buttonBarMobileHeightPx`, `62.5 → 66`, with no unresolved changes.
4. The existing recoverable transaction saved canonical `design-system.json` and derived `default-config.json`.
5. The disposable session was cleared, removing its overrides; after reload, the source produced a 66px mobile bar. Desktop remained 69.5px. Widths 390, 600, 601, 767, 768, 1024, 1025 and 1440 retained the expected breakpoint and alias expressions.
6. An inspected inverse plan restored `62.5`. All five canonical/generated files matched their original bytes. Reloaded mobile height was 62.5px with zero override rules.

Evidence is under the ignored `output/playwright/design-mode-*.png` and `design-mode-token-metrics.json`; handoffs, plans and original source snapshots are under `.cache/design-mode-plans/`.

## Compatibility fixes found through validation

- macOS resolves `/var` through `/private/var`. The pipeline resolves the project root before checking source containment, while still rejecting symlinks inside the source tree. Regression coverage saves through a root alias and rejects internal symlinks.
- The upstream local companion drops `tokenChanges` and `tokenGuidance` from `get_changes`; the existing in-memory adapter preserves both.
- Upstream 2.2.1 omits token edits from its Copy/Send eligibility and Changes badge. A two-site, exact-match Vite transform fixes the sidepanel build input without changing vendor source. The doctor checks the emitted artifact hash. New upstream sources require explicit revalidation.

## Website-wide scope and remaining limits

The read-only handoff index covers Home, Work, About, Contact and the styleguide. It retains token, style, text, DOM and comment entries and lists source candidates. The deterministic writer supports 25 registered Button Bar tokens. Other changes require agent tracing and edits to the existing CSS/JSX/content owner; no generic automatic CSS writer or Tailwind conversion is included.

Canvas and WebGL objects are not DOM layers. The existing simulation controls and Blender source remain their authoring tools. The extension's inferred token categories and usage/stale labels are advisory; they do not override the source registry.

This proves a real extension cycle in the dedicated test profile, not installation in the user's normal Chrome profile. The user still needs to Load unpacked there and select MCP → Local → 9960 → Auto-connect. Continuous extension CPU/frame-time cost, every nested drawer/state, and a full arbitrary-CSS save matrix have not been certified.

Source changes were reviewed independently. The separate Home caption-alignment edits and local output/backups remain outside the About and Design Mode commits. Production About and Work are held behind Coming soon at build time; the full local experiences remain editable. No production website dependency, Vite plugin or authoring endpoint was introduced by Design Mode.

Production navigation acceptance caught the About readiness observer still waiting for the development narrative. The production hold now has its own readiness path, with a regression test confirming that development still waits for its scene. The publication audit waits for completed navigation before invoking browser history and accepts both normal Home and the existing Daily Simulation Home readiness path.
