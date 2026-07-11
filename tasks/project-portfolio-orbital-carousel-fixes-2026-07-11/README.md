# Portfolio Orbital Carousel Fixes PRD Packet

Created: 2026-07-11

This packet captures the post-release design audit for the Portfolio orbital carousel and turns the findings into focused implementation PRDs. It is a follow-up to `tasks/project-portfolio-orbital-carousel-2026-07-10/`.

## Source Material

- User screenshots:
  - `/var/folders/rw/9jhrlh_10712yxzp7d29g8440000gn/T/codex-clipboard-629a69a1-1c5a-48e0-be2b-90bfddba9444.png`
  - `/Users/alexanderbeck/Library/Application Support/CleanShot/media/media_tRPw7E6Oxy/CleanShot 2026-07-11 at 08.41.28.jpg`
- Live preview audited at `http://127.0.0.1:8013/portfolio.html`.
- Audit artifacts: `output/playwright/portfolio-carousel-design-audit-2026-07-11/`.

## Documents

- `design-audit-findings-2026-07-11.md` - observed issues, evidence, and likely causes.
- `action-sequence.md` - recommended implementation order and review checkpoints.
- `implementation-prompt.md` - OpenAI/Codex optimized prompt to action and verify this packet.
- `prd-01-non-overlap-responsive-carousel-geometry.md`
- `prd-02-dot-dial-carousel-track.md`
- `prd-03-smooth-scroll-and-drag-motion.md`
- `prd-04-pointer-press-cursor-and-open-intent.md`
- `prd-05-thumbnail-accent-gradient-contract.md`
- `prd-06-visual-qa-and-regression-gates.md`

## Working Rules

- Do not implement from this packet until the PRDs are reviewed and accepted.
- Preserve the existing route shell, gate, project drawer, and bottom dock unless a PRD explicitly touches them.
- Treat card overlap, pointer jump, non-moving dots, and janky movement as blocking defects.
- Use browser screenshot inspection at desktop, tablet, and mobile sizes before claiming a fix.
- Keep fixes scoped to the portfolio carousel unless evidence shows a shared shell regression.
