# Repo audit — executable swarm prompt (runnable)

Copy everything below the horizontal rule into a new agent chat (or run as a single instruction).

**Other swarm / prompt patterns you can swap in later:** *reflection* (draft → self-critique → revise); *debate* (pro vs con agents → judge); *map-reduce* (shard files → partial notes → one reducer); *rubric scoring* (each finding scored 1–5 on evidence/impact/duplication); *majority vote* (3 scouts, promote if ≥2 agree); *specialist routing* (lint agent, security agent, a11y agent instead of geographic areas).

---

## Mission

Run a **proof-first** engineering audit of this repository. Prefer **correctness over volume**. The goal is a backlog where **every P0/P1 is hard to dispute** because it ships with **reproducible proof**.

## Method: executable audit swarm

Core idea: **claim → command → result** (every serious finding must earn a proof).

### Roles (parallel)

1. **Orchestrator (you, the lead model)**  
   - Split work into **5 areas** (same as Studioflow audits).  
   - Spawn **one Scout agent per area** (5 total).  
   - Optionally spawn **one Falsifier agent** after Scouts return (1 total).  
   - Merge into one table; **no duplicate rows** for the same root cause.

2. **Scout agents (×5)** — each owns exactly one area:  
   - **A1** Build / CI / lockfiles / flatten / Vite dev API  
   - **A2** HTML entries / SPA / routing / `portfolio.css` / `dist/` parity  
   - **A3** Legacy physics / perf allocations / obvious correctness bugs  
   - **A4** CSS a11y / motion / sound vs `prefers-reduced-motion`  
   - **A5** Docs truth vs code / privacy / script inventory vs CI  

3. **Falsifier agent (optional but recommended)**  
   - Input: merged candidate list from Scouts.  
   - Task: For each **P0/P1**, try to **disprove** or **downgrade** with a counter-proof command.  
   - Output: `KEEP | DOWNGRADE | REJECT` + one proof line each.

### Non-negotiable rules

1. **P0 or P1 requires a Proof block** with at least one of:  
   - `rg` / `grep` with pattern and **one line of real output**, or  
   - `npm run …` (or `node …`) with **exit code** and **last 5 lines of stdout/stderr**, or  
   - Exact **file path + quoted snippet ≤ 3 lines** copied from the file.  
2. If you cannot prove it in **two tries**, label **`Unverified`** and cap severity at **P3**.  
3. **Never** cite only line numbers (they drift) — always add **string anchor** or grep pattern.  
4. Run **`npm run build` from repo root** once before claiming anything about `dist/`.  
5. Read **`.gitignore`** before claiming lockfile policy.

### Scout output template (each finding = one row)

```text
ID: A{area}-S-{nn}
SEVERITY: P0 | P1 | P2 | P3 | Unverified
TITLE: <8 words max>
CLAIM: <one sentence>
PROOF:
  command: `<shell command>`
  cwd: `<repo root or react-app/app>`
  result: <paste minimal output>
FIX_HINT: <one line>
TAGS: [web] [wrapper] [native] [docs] [ops]
```

### Falsifier template

```text
CANDIDATE_ID: A2-S-03
VERDICT: KEEP | DOWNGRADE | REJECT
PROOF:
  command: `...`
  result: ...
NOTE: <one sentence>
```

### Deliverable

1. **Table** — all `KEEP` rows, severity final.  
2. **Grouped by P0 / P1 / P2 / P3** + short “**merge notes**” (what you deduped).  
3. **Suggested next CI step** — one bullet (e.g. “add lint step to `gh-pages.yml`”).

### Area boundaries (do not cross)

- A1: no deep CSS; A4: no CI YAML unless it’s about a CSS check.  
- A3: no marketing copy; A5: no physics perf unless docs claim FPS/tests.

---

## One-shot variant (no subagents)

If subagents are unavailable, **you** play all Scouts sequentially but still **must** use the same Proof rule for P0/P1.

---

## Resources (learn more)

See the parent doc or project wiki for links — or open:

- [Prompt Engineering Guide](https://www.promptingguide.ai/) — techniques catalog (CoT, self-consistency, etc.)
- [LangGraph: Multi-agent](https://langchain-ai.github.io/langgraph/concepts/multi_agent/) — orchestration patterns vocabulary
- [microsoft/promptbase](https://github.com/microsoft/promptbase) — curated prompt-engineering references
