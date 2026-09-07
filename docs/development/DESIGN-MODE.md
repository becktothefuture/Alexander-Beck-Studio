# Design Mode for beck.fyi

Status: development integration, workflow version **0.1.0**. Design Mode owns the visual interface; the project owns its source and tokens. The optional working name **Sidelayer** refers to this reusable integration workflow, not a forked editor or a cleared product name.

## Start using it

Requirements: Git, the repository's Node/npm versions (Node 22.19+ and npm 10+), a Chromium browser, and a coding agent that can run a local stdio MCP server. The browser, checkout and local companion must be on the same computer. A remote agent needs an explicitly configured remote connection; a localhost URL is not shared between computers.

From the repository root:

```bash
npm run install:all
npm run design:setup
npm run design:config
npm run dev
```

`design:setup` fetches the exact tested MIT-licensed Design Mode source revision, installs only extension/companion/shared workspaces and builds the extension. It does not install a browser add-on or modify agent settings. The checkout lives in `.cache/design-mode/`; no production dependency is added. The local companion is not a published npm package.

One-time browser setup:

1. Open `chrome://extensions`, enable Developer mode and choose **Load unpacked**.
2. Select the absolute `.../.cache/design-mode/packages/extension/dist` directory printed by setup. Pin Design Mode. On macOS a Finder folder chooser can open a hidden path with Cmd+Shift+G.
3. Add the local MCP configuration printed by `design:config` to your coding agent. It prints a JSON `mcpServers` entry; clients with a different configuration format need the same Node command, arguments and `DM_PORT=9960` environment value in their native format. Merge the entry; do not replace existing server settings. Restart/reconnect that agent's MCP session.
4. Open `http://localhost:8012` or `/styleguide.html` and click Design Mode. On its **MCP** page select **Local**, port **9960**, and Auto-connect. Fresh upstream installs default to Cloud, so select Local explicitly.
5. Ask the agent to call `get_session_summary`. `extensionConnected: true` is the actual connection check. `npm run design:doctor` checks installation only.

The coding agent starts the companion when it connects. Do not leave a second `design:mcp` terminal running unnecessarily. Multiple upstream clients can share the local owner, but use one active project/handoff at a time because the extension connects to one local bridge.

The [Chrome Web Store version](https://chromewebstore.google.com/detail/design-mode/ighgobegfcmjagombgnfhgioflinojih) is a convenient alternative. Its release can differ from this pinned source build; recheck the token handoff and local connection after changing versions. [Upstream installation guide](https://github.com/SandeepBaskaran/design-mode#quick-start).

## Website-wide source review

The agent workflow covers Home, Work, About, Contact and the styleguide. Save the full MCP handoff and run `npm run design:review -- <handoff.json>` to identify the route, source candidates, all mixed edits and the verification matrix. It is read-only. Registered Button Bar token edits can use the deterministic transaction; all other CSS, text and component edits are traced to their authored owner. See the [website source map](../../.agents/skills/design-mode/references/website-sources.md).

Production Work and About show Coming soon; use the full local development pages for visual authoring. Canvas/WebGL contents continue to use the existing simulation controls.

## The editing loop

1. Inspect and tweak the local website. Use the token badge's **Edit token globally** to mutate a token, or **Swap token** to change which token an element uses. Ordinary numeric edits may be local overrides; intent matters.
2. Use comments for scope, such as “mobile only” or “all instances”. Record the viewport, theme and state; a screenshot alone does not identify the authored breakpoint.
3. Send to Agent, then invoke `$design-mode`: “Apply this batch, preserve tokens and responsive behaviour.” Automatic turn-starting depends on the agent client and is not configured here.
4. The agent maps changes to source, reviews the planned diff, applies the authorised batch and runs the relevant checks. Vite reloads changed source/configuration; reload the page if an already-loaded configuration has not refreshed.
5. View Original or disable the extension and reload to inspect the saved result without override masking. Check mobile, an intermediate width and desktop, plus affected themes/states. Only then resolve the completed changes.
6. Review the Git diff. Save changes development; commit preserves a named checkpoint; an authorised production publish is separate.

No Tailwind conversion is required. The website's existing editor remains the appropriate surface for simulation/Canvas controls. Design Mode edits the surrounding DOM; a ball or WebGL object inside a canvas is not a DOM layer.

## What is implemented

| Layer | Implemented capability |
| --- | --- |
| Visual UI | Design Mode 2.2.1 UI with a narrow build-time token-only Copy/Send and badge fix, pinned at `efbf3ac3e4c1f6108caa3105ea148da91178abbd`; layers, properties, tokens and changes. |
| Local companion fix | A small in-memory compatibility adapter preserves `tokenChanges` and `tokenGuidance` in `get_changes`. The pinned upstream companion drops those fields. No vendor source files are modified. |
| Agent skill | Repository-discoverable `design-mode` skill; source ownership, token vs instance intent, responsive rules, mixed-session handling, verification and Git boundaries. |
| Deterministic writer | 25 explicitly registered Button Bar tokens → canonical `design-system.json.runtime` controls; ranges taken from the existing control schema; runtime pixel projections returned to canonical units. |
| Plan review | Exact JSON pointers, before/after values, context, source hashes and unresolved changes. Unknown tokens/scopes, stale browser values, mixed change types and unsupported expressions do not write. |
| Save | Canonical JSON plus derived runtime outputs through the existing recoverable file transaction; reload/read-back verification; no generated-file hand edits. |
| Other CSS/components | Agent applies the handoff to existing authored source using repository design guidance. This is assisted source editing, not a certified deterministic writer for arbitrary CSS. |
| Other projects | Generic skill/engine plus a project adapter contract; a second JSON-token fixture verifies alias preservation. Additional frameworks/token formats require adapter certification. |
| Production | No Vite plugin, application import, runtime hook, source annotation or editor dependency. Tooling resides outside the app/public graph. |

Inspect the current registered set with `npm run design:tokens -- catalog`. Effective/derived tokens such as `--button-bar-frame-reserve` retain their `calc()` and `var()` relationships. Frame geometry, global colour rules and simulation configuration are not silently promoted to editable tokens by this adapter.

Example agent-only workflow, after reading the actual handoff (do not invent edits to match this example):

```bash
mkdir -p .cache/design-mode-plans
# Save selected tokenChanges + the original pageUrl as handoff.json here.
npm run design:tokens -- plan .cache/design-mode-plans/handoff.json .cache/design-mode-plans/review-1.json
# Inspect the plan; apply only when it matches the authorised change.
npm run design:tokens -- apply .cache/design-mode-plans/review-1.json
npm run check:design-config
git diff
```

Plans use schema version 1 and bind to source hashes and adapter bindings. Replanning is required after another source edit. The CLI refuses an existing plan filename and serialises its own writes with `.cache/design-mode-write.lock`. Keep the existing editor's Save action and other code writers idle during apply: they do not share the CLI's cross-process lock. If a crash leaves a lock, inspect its PID before removing it; if the existing file transaction reports orphan state, follow its recovery protocol rather than deleting backups.

## Comparison and recommendation

| Option | Fit for this website | Tokens and robust saves | Decision |
| --- | --- | --- | --- |
| Design Mode + this workflow | Broad visual controls immediately; works over the existing site; reusable agent workflow. | Rich token discovery, but browser overrides are proposals. Explicit adapter and source review preserve ownership. | **Use now.** Keep the upstream UI with explicit compatibility fixes and the project-aware save layer. |
| Onlook | Integrated design/code environment; hosted product remains closed beta; public self-host/older desktop routes also exist. | Public-source diagnostics found token detachment in a numeric padding path and unsupported dynamic-class forms in an isolated writer. Not a finding about the inaccessible hosted beta. | Reassess with beta access and a real import/save/reload trial; do not refactor beck.fyi to qualify. |
| Extend existing editor with Tweakpane | Strong for registered runtime/config values and Canvas parameters. | Explicit ownership is easier, but generic selection, layers and a Figma-like inspector require substantial work. | Retain for simulation-specific controls; not the main visual workbench. |
| Build a custom workbench using FlexLayout and UI primitives | Maximum layout/shortcut control and a reusable editor product. | Still requires the entire DOM/source/cascade adapter. Reusing panels does not solve authoring correctness. | Defer until use of Design Mode reveals specific interface limitations. |
| Tweakr-style declared controls | Small developer-declared source-writing controls; architectural reference for narrow adapters. | Limited to supported declared values; not a general website inspector or complete history system. | Useful reference, not the primary solution. |

Builder.io, Piny Pro and Puck remain outside the shortlist according to the user's preferences.

Sources: [Design Mode source and setup](https://github.com/SandeepBaskaran/design-mode), [Onlook access](https://www.onlook.com/pricing), [Onlook self-hosting](https://docs.onlook.com/self-hosting/single-machine), [Tweakpane](https://tweakpane.github.io/docs/), [FlexLayout](https://github.com/caplin/FlexLayout), [Tweakr](https://github.com/angelolibero/tweakr).

## Performance, versioning and scope

The current integration adds no website runtime code. The enabled extension has its own non-zero inspection/overlay cost; its full performance on beck.fyi's animation-heavy pages has not been certified. Close it for performance audits and compare it enabled/disabled before relying on continuous inspection during simulations. Avoid polling or model calls in the drag loop: gestures preview locally; AI runs on a submitted batch.

Use Git for source versions. Keep each design experiment on a branch and inspect a coherent diff before a named checkpoint. Upstream browser Undo/Redo controls visual proposals, not source commits. The skill, adapter and workflow version travel with the project; the pinned upstream revision changes only after its compatibility checks. No automatic commits, force resets, remote branches, deployments or collaborative editing are introduced.

Before considering a custom UI fork, test real workflows: select nested/repeated components, linked spacing, mixed-value selection, token swap/global mutation, mobile and fluid layouts, hover/focus, undo and reload. Design Mode's current main panel is a large, coupled extension implementation, not a drop-in React panel SDK. A future extraction needs a bounded feasibility test.

## Verification

Run `npm run check:design-mode` for token mutation, actual runtime projection mapping, canonical units, stale and ambiguous edits, project boundaries, alias preservation in a second project and rollback after an injected write failure. Run `npm run check:design-mode-mcp` after setup for the real stdio companion's tool/transport handshake and a simulated extension handoff. The latter is a protocol test, not a browser extension interaction test.

Run `npm run check:site` for the repository gate. Browser installation, extension UI interaction, saved responsive appearance and enabled-extension performance still need a real local browser session. Read `DESIGN-MODE-VALIDATION.md` for the results obtained in this implementation session.
