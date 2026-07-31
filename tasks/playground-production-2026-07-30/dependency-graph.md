# Playground Dependency Graph

## Task graph

| Task | Title | Type | Dependencies | Allowed scope | Parallel with | Validation | Risk |
|---|---|---|---|---|---|---|---|
| MAP-ROUTES | Production route contract | Explore, read-only | Preparation | Route, entry, shell, readiness, validation, audit docs | MAP-REFERENCE, MAP-CONFIG, MAP-DESIGN | Evidence map | Medium |
| MAP-REFERENCE | Spatial reference | Explore, read-only | Preparation | Live reference only | Other MAP tasks | Browser evidence | Low |
| MAP-CONFIG | Parameter and persistence architecture | Explore, read-only | Preparation | Config, panel, save, flatten, preview | Other MAP tasks | Round-trip evidence labels | High |
| MAP-DESIGN | Shared design and interaction contracts | Explore, read-only | Preparation | Design, palette, modal, sound, haptics, cursor | Other MAP tasks | Contract evidence | Medium |
| IMP-SPATIAL | Camera, placement, world, dot field | Implement | All MAP tasks | New route-local spatial modules only | IMP-MEDIA, IMP-ROUTE | Node tests | High |
| IMP-MEDIA | Catalogue, assets, renderers, lightbox | Implement | All MAP tasks | New route-local media/content modules and assets | IMP-SPATIAL, IMP-ROUTE | Content tests and component checks | High |
| IMP-ROUTE | Route foundation | Implement | All MAP tasks | Route-local view/CSS/entry plus serialized manifest/input registration | IMP-SPATIAL, IMP-MEDIA | Route registry and entry parity | High |
| IMP-CONFIG | Canonical config and panel | Implement | MAP-CONFIG, route schema decision | Config normalizer/save/panel files; serialized shared edits | No other shared-config writer | Config round trip | High |
| LEAD-INTEGRATION | Shared systems and lifecycle | Integrate | IMP-SPATIAL, IMP-MEDIA, IMP-ROUTE, IMP-CONFIG | Shared route, transition, palette, sound, haptics, audits | None | Targeted source and browser checks | High |
| TEST-PLAYGROUND | Deterministic and browser tests | Test | LEAD-INTEGRATION | Playground unit and audit scripts | DOC-PLAYGROUND | Focused tests and audit | High |
| DOC-PLAYGROUND | Production documentation | Docs | Integrated architecture stable | Design/reference/content docs and packet | TEST-PLAYGROUND | Documentation review | Medium |
| REVIEW-PLAYGROUND | Independent integrated review | Review, read-only | Tests and docs complete | Final task-owned diff | None | Prioritized findings | High |
| FINAL-VALIDATION | Full proof | Verify | Review findings resolved | Required source/browser/visual matrix | None | Verification record | High |

## Dependency flow

```text
Preparation
  └─ MAP-ROUTES + MAP-REFERENCE + MAP-CONFIG + MAP-DESIGN
       ├─ IMP-SPATIAL
       ├─ IMP-MEDIA
       ├─ IMP-ROUTE
       └─ IMP-CONFIG
            └─ LEAD-INTEGRATION
                 ├─ TEST-PLAYGROUND
                 └─ DOC-PLAYGROUND
                      └─ REVIEW-PLAYGROUND
                           └─ FINAL-VALIDATION
```

## Shared-file serialization rule

Only one writer may own shared route, configuration, panel, audit-registry, or production documentation files at a time. Route-local new files may be built in parallel. The lead inspects and integrates every worker result before unblocking the next wave.
