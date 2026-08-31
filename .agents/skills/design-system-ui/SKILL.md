---
name: design-system-ui
description: Design, implement, modify, or review UI for the Alexander Beck Studio website using its product context, persistent shell, semantic tokens, and existing component patterns. Use for route layouts, controls, typography, responsive behavior, accessibility, motion, and shared UI changes. Exclude content-only edits, infrastructure, backend-only work, and standalone Blender asset work without UI changes.
---

# Website design-system UI

Use the existing website system to make the smallest coherent UI change. This repository skill adds a task workflow; it does not approve a redesign or override the user's scope.

## Establish context

1. Read [AGENTS.md](../../../AGENTS.md), [PRODUCT.md](../../../PRODUCT.md), and [DESIGN.md](../../../DESIGN.md). Inspect the working tree and run `npm run studio:status` from the repository root. Reuse the active authoring server and preserve unrelated work.
2. Identify the affected route, visitor job, component, states, and current publication boundary. Use the [route table](../../../README.md#routes): production Work is gated at build time; About has a separate intentional preview path. Development output is not evidence of a deployed release.
3. Inspect the actual component, nearby usage, and the matching `/styleguide.html` specimen where one exists. Use the [component library](../../../docs/reference/COMPONENT-LIBRARY.md) and [styleguide index](../../../docs/reference/SITE-STYLEGUIDE.md) to find the pattern. Do not invent a Storybook setup or treat a standalone lab as an approved production pattern.
4. Map the request to existing tokens, components, and interactions before editing. Record any source conflict or missing pattern that affects the decision.

## Source map

Paths below are relative to the repository root.

| Concern | Inspect |
| --- | --- |
| Authored design values | `react-app/app/public/config/design-system.json`; generated outputs are described in [GENERATED-CONFIG.md](../../../docs/reference/GENERATED-CONFIG.md). |
| Semantic CSS and shared route type/layout | `react-app/app/public/css/tokens.css` and `react-app/app/public/css/main.css`. |
| Persistent shell and navigation | `react-app/app/src/components/app/StudioShell.jsx`, `ShellButtonBar.jsx`, and `shell-button-bar-dominant.css` in the same directory. |
| Configurable Button Bar geometry | `react-app/app/src/lib/buttonBarControls.js`; read authored `runtime.buttonBar*` values before interpreting compatibility defaults. |
| Route identity and labels | `react-app/app/src/lib/route-manifest.js` and `react-app/app/src/lib/routes.js`. |
| Work field and presentation | `react-app/app/src/routes/playground/`, `react-app/app/src/routes/portfolio/work/`, and the existing drawer/handoff in `react-app/app/src/legacy/modules/portfolio/`; see [PORTFOLIO.md](../../../docs/reference/PORTFOLIO.md) and [PLAYGROUND.md](../../../docs/reference/PLAYGROUND.md). |
| Home and Contact | `react-app/app/src/routes/home/HomeRoute.jsx`, the active `react-app/app/src/legacy/` Canvas runtime, and `react-app/app/src/routes/contact/`. |
| About | `react-app/app/src/routes/about/AboutRoute.jsx`, `react-app/app/src/routes/about-narrative-lab/`, and `react-app/app/public/config/contents-about.json`. |

Read only the focused contracts needed for the change. Product intent, design intent, authored values, and implemented behavior have different owners. Do not copy whole reference documents or numeric scales into this skill.

## Implement within the system

- Prefer composition or a narrow extension of an existing pattern. Preserve the shared shell, headline roles, semantic colors, geometry ownership, and motion rules in `DESIGN.md`.
- Reuse native controls, accessible names, current focus treatment, and established state handling. A visually correct control is incomplete if it cannot be operated with the required input methods.
- Use current user authorization. If a new token, component, variant, radius, breakpoint, or interaction pattern is not already covered, prepare a concrete proposal and obtain approval before adding it. Do not ask again for a decision the user has already approved.
- Edit configurable values at their authored source. Do not hand-edit generated configuration, use browser storage as design truth, or copy a fallback value over an authored value. For a configuration change, verify live apply, save, reload, flattening, and production preview agree.
- Keep patches limited to the requested UI and its required contracts. Update real styleguide specimens or tests when the affected behavior requires it; do not create placeholder stories or tests that merely repeat the implementation.
- After an approved design change is implemented, update the relevant design/reference guidance. Do not change documentation to claim that a proposed behavior already works.
- Follow the existing source rules for copy and case-study evidence. Do not install dependencies, change launch gates, commit, push, deploy, or expose authoring APIs unless separately authorized.

## Verify the affected behavior

For implementation work, run `npm run studio:check` from the repository root. It runs the canonical source/configuration checks, Node tests, app lint, and production build. There is no separate typecheck script; do not invent one. A read-only audit must use safe checks and report any build or file-generating checks it deferred.

Useful focused checks already available:

| Change | Commands |
| --- | --- |
| Shared action controls | `npm run check:button-families` |
| Route title hierarchy | `npm run check:route-title-lockups` |
| Work catalogue or spatial interaction | `npm run check:work-canvas`; browser audit: `npm run audit:work-canvas` |
| Configurable styling | `npm run flatten:design-config` then `npm run check:design-config` |
| Focus and contrast | `npm run audit:focus-contrast`, plus direct keyboard and resolved-color inspection |

For visual changes, build first and use the relevant production preview and development surfaces. Inspect the affected routes and states at desktop and mobile sizes in both themes. Include keyboard operation, focus restoration, contrast, touch targets, text reflow, and reduced motion. Follow the wider [DESIGN.md verification matrix](../../../DESIGN.md#verification) and [AGENTS.md](../../../AGENTS.md#verification) when shell, theme, routing, or motion changes require it. Keep production gates and intentional previews distinct during QA.

Review the final diff against the starting working tree. Do not fix unrelated failures merely to make a gate green. Report the failing command, relevant evidence, and unverified behavior. A passing build does not prove visual parity, accessibility conformance, or publication.

## Missing context and handoff

If a required source is missing, inaccessible, or contradictory, gather the available evidence and identify the smallest unresolved decision. Do not invent product intent or silently replace the design language. Continue work that is independent of that decision; ask one focused question only when it blocks the remaining work.

Report changed files, the visitor benefit, reused patterns, any approved system additions, validation results, and remaining risks. Distinguish proposed changes from actual edits and local validation from deployment.

## Routing examples

Use this skill for:

- “Adjust the Contact email-copy capsule spacing using the existing action style.”
- “Review the Work snippet stage's mobile sizing and focus restoration.”
- “Fix Home title wrapping while preserving the current headline treatment.”

Do not use this skill for:

- “Rewrite a case-study paragraph without changing layout.” Follow the portfolio knowledge and copy sources.
- “Change GitHub Pages deployment permissions.” This is infrastructure work.
- “Repair the Blender scene export without changing website UI.” Use the relevant asset workflow.
