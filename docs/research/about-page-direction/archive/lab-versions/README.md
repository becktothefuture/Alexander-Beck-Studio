# Retired About narrative Lab versions

Status: historical archive

The standalone `/lab/about-narrative.html` route was retired on 3 August 2026. About authoring now has one canonical development surface:

`http://localhost:8012/about.html`

That route opens the About editor with `ABOUT-NARRATIVE-SPOKEN-DRAFT-v4-CURRENT.md`, the only active copy candidate. Use `?edit=0` only for playback and automated audits.

The former Lab copy identifiers included `voice`, `voice-curiosity`, `voice-synthesis`, `prose`, `milestones`, `personal`, `longform`, `ordinary` and `following`. They are no longer registered routes or selectable runtime variants. Their writing remains preserved in:

- `../copy-options-2026-08-02/`
- `../copy-convergence-2026-08-03/`
- `../narrative-explorations/`

The original Lab implementation brief remains at `../narrative-explorations/ABOUT-NARRATIVE-LAB-PROMPT.md`. The implementation directory `src/routes/about-narrative-lab/` keeps its historical name because it now supplies the active About experience and editor; it is not a second public or development route.

Production `/about.html` still renders the existing coming-soon surface. Promoting the authored narrative remains a separate, explicit release step.
