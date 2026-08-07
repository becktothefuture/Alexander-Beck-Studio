# Issue tracker: GitHub

Issues and specifications for this repository live as GitHub issues. Use the repository's `npm run github:cli --` wrapper for GitHub CLI operations so commands do not depend on the desktop process `PATH`.

## Conventions

- **Create an issue**: `npm run github:cli -- issue create --title "..." --body "..."`. Use a heredoc for multi-line bodies.
- **Read an issue**: `npm run github:cli -- issue view <number> --comments`, filtering comments by `jq` and also fetching labels.
- **List issues**: `npm run github:cli -- issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'` with appropriate `--label` and `--state` filters.
- **Comment on an issue**: `npm run github:cli -- issue comment <number> --body "..."`.
- **Apply or remove labels**: `npm run github:cli -- issue edit <number> --add-label "..."` or `npm run github:cli -- issue edit <number> --remove-label "..."`.
- **Close an issue**: `npm run github:cli -- issue close <number> --comment "..."`.

Infer the repository from `git remote -v`; the wrapped GitHub CLI does this automatically inside the clone.

## Pull requests as a triage surface

**PRs as a request surface: no.** Set this to `yes` only if the repository later treats external pull requests as feature requests.

GitHub shares one number space across issues and pull requests. Resolve an ambiguous number with `npm run github:cli -- pr view <number>` and fall back to `npm run github:cli -- issue view <number>`.

## When a skill says "publish to the issue tracker"

Create a GitHub issue.

## When a skill says "fetch the relevant ticket"

Run `npm run github:cli -- issue view <number> --comments`.

## Wayfinding operations

The map is one issue with child issues as decision tickets.

- **Map**: create one issue labelled `wayfinder:map`. It owns Destination, Notes, Decisions so far, Not yet specified, and Out of scope.
- **Child ticket**: link an issue to the map as a GitHub sub-issue through `npm run github:cli -- api`. If sub-issues are unavailable, add the child to a task list in the map and put `Part of #<map>` at the top of the child body. Apply one label: `wayfinder:research`, `wayfinder:prototype`, `wayfinder:grilling`, or `wayfinder:task`.
- **Blocking**: use GitHub's native issue dependencies. Add an edge with `npm run github:cli -- api --method POST repos/<owner>/<repo>/issues/<child>/dependencies/blocked_by -F issue_id=<blocker-database-id>`. Resolve the database ID with `npm run github:cli -- api repos/<owner>/<repo>/issues/<number> --jq .id`. If dependencies are unavailable, put `Blocked by: #<number>` at the top of the child body.
- **Frontier**: list the map's open children and remove tickets with an open blocker or an assignee. The first remaining ticket in map order is the frontier.
- **Claim**: run `npm run github:cli -- issue edit <number> --add-assignee @me` before working the ticket.
- **Resolve**: post the answer as a comment, close the ticket, then append a one-line gist and ticket link to the map's Decisions so far.
