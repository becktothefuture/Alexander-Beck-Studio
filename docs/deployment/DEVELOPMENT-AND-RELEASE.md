# Development and release pipeline

The repository has three intentionally separate runtime states:

| State | Source | Address | Update trigger | Can change production? |
| --- | --- | --- | --- | --- |
| Local authoring | Current working tree | `http://localhost:8012` | Vite HMR after a file save | No |
| Public dev mirror | Current working tree | Cloudflare tunnel → `http://localhost:8014` | Its own Vite HMR after the same file save | No |
| Production | Committed `main` | `https://beck.fyi` | Successful GitHub Pages workflow after a push to `origin/main` | Yes |

The public mirror is a second Vite process rather than a tunnel directly into the authoring server. It disables the design/admin persistence plugin, hides authoring controls, blocks `/api/*` and `/@fs/*`, and restricts Vite filesystem serving to `react-app/app/`. This keeps phone review connected to the current working tree without exposing the write-capable local editor endpoints.

## Five commands

Run these from the repository root:

```bash
npm run studio:dev
npm run studio:status
npm run studio:stop
npm run studio:check
npm run studio:publish
```

- `studio:dev` starts or reuses local Vite on port 8012, starts the safe mirror on 8014, downloads `cloudflared` from Cloudflare's official release if needed, and prints the public phone URL. The processes run in the background; logs and state live under the gitignored `.cache/studio/` directory.
- `studio:status` reports the three server states plus the current branch, dirty paths, and ahead/behind relationship with the locally tracked `origin/main`.
- `studio:stop` stops only processes recorded as owned by `studio:dev`. A local Vite process that was already running is left alone.
- `studio:check` runs `npm run check:site`, the canonical local production gate.
- `studio:publish` never creates a commit. It requires a clean `main`, fetches `origin/main`, refuses behind or divergent state, runs the canonical gate, asks for confirmation, and then pushes. The push triggers GitHub Pages; a failed workflow does not deploy.

For non-interactive use after reviewing the exact commits:

```bash
npm run studio:publish -- --yes
```

## Default working routine

1. Run `npm run studio:status` to understand the existing server, tunnel, working-tree, and Git sync state.
2. Run `npm run studio:dev` when starting work that needs phone or public review. Re-running it is safe: an active managed session is reused rather than duplicated.
3. Make changes in the current working tree. Saving a file updates localhost and the public development URL through Vite HMR; it does not update production.
4. Use `http://localhost:8012` for full authoring and configuration tools. Use the printed public URL for read-only review on phones and other devices.
5. Run targeted checks while iterating, then `npm run studio:check` before treating a milestone as production-ready.
6. Review and commit the intended files using the normal Git workflow. A local commit still does not update production.
7. Run `npm run studio:publish` only when the committed `main` branch should update `beck.fyi`. The command revalidates, confirms, and pushes; GitHub Pages deploys only if its workflow succeeds.
8. Run `npm run studio:stop` when the public review session is no longer needed. Otherwise, leave it running so the URL remains available.

The durable rule is: **save to update development, commit to preserve work, and publish to update production**.

## Agentic workflow boundary

Agents should inspect `npm run studio:status` before starting or changing a managed development session. They may start `studio:dev` when the user requests phone testing, a public preview, or ongoing shared development, but should not expose the repository publicly by default for unrelated work.

Agents must reuse an active managed session and must not stop it merely because their task has ended. Stop it only when the user asks, when the session was explicitly disposable, or when cleanup is required to recover from a failed start.

Starting a public development mirror is not publishing. Agents must never run `studio:publish`, push `main`, create a deployment, or use the non-interactive `--yes` option unless the user explicitly requests that production-changing action. If “live” could mean either the public development link or `beck.fyi`, clarify which destination is intended before acting. The CLI never creates a commit, and agents must continue to follow the repository rule that commits also require explicit authorization.

After an authorized production push, report that the workflow was triggered. Do not claim that `beck.fyi` is updated until the GitHub Pages workflow and deployed site have actually been verified.

## Public URL lifetime

With no configuration, `studio:dev` uses a Cloudflare Quick Tunnel. The URL remains the same while that managed tunnel process is alive, but it changes after `studio:stop`, a restart, or a tunnel failure. A brand-new hostname can take up to a minute to resolve through some DNS providers. The computer must remain awake and online.

For a bookmarkable hostname, create a named Cloudflare Tunnel once and route a development-only hostname to it. This creates persistent external access and should be completed deliberately in the Cloudflare-authenticated terminal:

```bash
.cache/studio/tools/cloudflared tunnel login
.cache/studio/tools/cloudflared tunnel create beck-studio-dev
.cache/studio/tools/cloudflared tunnel route dns beck-studio-dev dev.beck.fyi
ABS_DEV_TUNNEL_NAME=beck-studio-dev ABS_DEV_PUBLIC_URL=https://dev.beck.fyi npm run studio:dev
```

The named tunnel credentials remain outside the repository. Do not commit them. The hostname is still publicly reachable unless Cloudflare Access or another authentication layer is configured.

## Production deployment

`.github/workflows/gh-pages.yml` validates pull requests to `main`. A push to `main` or an authorized manual run on `main` can publish to GitHub Pages.

1. The build job installs locked dependencies, audits them, runs `npm run check:site`, and checks the built files in `react-app/app/dist`.
2. The release requires the Chromium browser checks in `npm run audit:release-smoke` and an axe scan of Home and Contact in light and dark at 1280 × 900. Axe checks accessible names and text contrast. Confirmed violations fail the check. Results that need human review appear in `output/playwright/release-smoke/accessibility.json`, which is included in the release evidence.
3. A report measures completed HTTP downloads on fresh mobile-viewport visits to Home and Work. It uses the Pit simulation for a repeatable Home measurement. The starting budgets are 1,450 KiB for Home and 1,400 KiB for Work, based on measured first visits of 1,234 KiB and 1,203 KiB. Overages appear as warnings. Measure the Work baseline again when the full Work page replaces its Coming Soon page.
4. The workflow writes the commit ID and records the checksums of the primary pages, their entry scripts and styles, and shared CSS and config. The final package check rejects source maps, editable design files, files and folders named with `draft` or `drafts`, and paths the project already reserves for source-only material. It runs on pull requests and just before upload on releases.
5. After Pages publishes, the live verification job checks the recorded files against `https://www.beck.fyi/`. It retries while the new release becomes available.

With Chromium installed, run the local build and browser checks from the repository root.

```bash
npm run check:site
npm run check:release-package
npm run audit:release-smoke
npm run audit:release-accessibility
node scripts/audit-page-weight.mjs
```
