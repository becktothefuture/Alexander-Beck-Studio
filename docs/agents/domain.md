# Domain docs

How engineering skills consume this repository's domain documentation.

## Before exploring

Read these sources when they exist:

- `CONTEXT.md` at the repository root.
- `CONTEXT-MAP.md` at the repository root if it exists; it points to context-specific `CONTEXT.md` files.
- ADRs in `docs/adr/` that affect the area being changed.

Proceed silently when a source does not exist. Create domain files lazily through the domain-modeling workflow only when terminology or a durable architectural decision has been resolved.

## Layout

This repository uses a single context:

```text
/
├── CONTEXT.md
├── docs/
│   └── adr/
│       ├── 0001-example-decision.md
│       └── 0002-another-decision.md
└── react-app/
```

## Vocabulary

Use terms as defined in `CONTEXT.md`. Do not replace a defined term with a casual synonym in issue titles, specifications, implementation plans, or tests.

If a needed concept is absent, reconsider whether it is real project language. When it is a genuine gap, resolve it through domain modeling before adding it.

## ADR conflicts

If proposed work contradicts an existing ADR, surface the conflict explicitly rather than silently overriding the decision.
