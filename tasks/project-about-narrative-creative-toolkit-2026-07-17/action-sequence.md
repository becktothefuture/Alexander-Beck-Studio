# Action Sequence

## Dependency order

1. Review all PRDs for overengineering and revise them before implementation. Complete.
2. Action PRD 01A: preview transactions, Section resize, and semantic playhead preservation.
3. Action PRD 01B: Cue multi-selection and group movement.
4. Action PRD 01C: timeline zoom/pan and visible-range marquee.
5. Verify PRD 01, update the progress log, and commit it locally.
6. Action PRD 02A: rhythm commands.
7. Action PRD 02B: derived loop audition.
8. Action PRD 02C: Cue clipboard and Section duplication.
9. Verify PRD 02, update the progress log, and commit it locally.
10. Action PRD 03A: compact Camera panel and temporary framing pads.
11. Action PRD 03B: World preset schema and UI.
12. Verify PRD 03, update the progress log, and commit it locally.
13. Action PRD 04A: diagnostic enrichment and Camera fix commands.
14. Action PRD 04B: live profile review.
15. Action PRD 04C: checkpoint management and sustained performance advisories.
16. Verify PRD 04, update the progress log, and commit it locally.
17. Run the full About Narrative and site verification stack.
18. Run a final independent read-only code review and resolve material findings.
19. Move completed PRDs to `archive/actioned/` and reconcile the packet status.

## Shared gates

- Preserve current uncommitted About Narrative changes.
- Keep one renderer, scene, camera, point pool, and RAF loop.
- Keep production routes free of editor code and save endpoints.
- Keep all authoring commands undoable.
- Do not save editor selection, transport, zoom, preview, or checkpoint thumbnails into the production About document.
- Use exact-WU browser checks for motion-sensitive behavior.
