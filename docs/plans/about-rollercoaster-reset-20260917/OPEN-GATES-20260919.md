# Open hoops, gates and complete ending wall

19 September 2026. Implemented in development. No commit or deployment.

## Result

The user requested simpler geometry, open rings or gates among the enclosed tunnels, removal of the apparent ending hole, and a more detailed contact sheet. This refinement supersedes earlier enclosure-percentage and recessed-support-bay choices. It keeps the existing camera journey and text.

- Tunnel A now has an enclosed entry, five separate round hoops and an enclosed exit. Its open stretch runs from 23.5% to 34.5% of source progress.
- Tunnel B has the same sequence with five square or diamond gates, from 77.5% to 85.5%. Each passage keeps two animated gate assemblies.
- The wall's apparent hole was a 20-world-unit recess made behind the supporting text. All 38,640 cells now share one rest plane. The 159-cell neutral override is removed, restoring the continuous six-role colour pattern. The existing broad wave remains.
- The world has 145,045 circles, 10,479 fewer than the previous source. Global radius and spacing remain 0.075 and 0.23 world units.
- The ending support line uses primary text colour, the existing medium weight and full opacity. It stays in its existing support area below the centred title.

## Files changed

| Files | Purpose |
| --- | --- |
| `source-assets/about-rollercoaster-reset/about-rollercoaster.blend` | Saved, reopened and exported geometry refinement |
| `scripts/about-rollercoaster/open-gates.py` | Targeted, guarded saved-source refinement |
| `scripts/about-rollercoaster/build-world.py` | Apply the same refinement to a fresh authored world |
| `react-app/app/public/models/about-rollercoaster-world/{meta.json,points.bin}` | Validated export; `camera.json` stays byte-identical |
| `react-app/app/src/routes/about-rollercoaster/about-rollercoaster.css` | Ending support contrast |
| `scripts/check-about-rollercoaster-assets.mjs` | Independent complete-wall rest-plane check |
| Source README, `DESIGN.md`, `docs/reference/ABOUT-NARRATIVE-TOOLKIT.md` | Current geometry and source ownership |
| `output/about-open-gates-20260919/` | Recovery, source proofs, 55 website captures and contact sheets |

Canonical copy and `AboutRollercoasterExperience.jsx` match their pre-refinement hashes. Unrelated working-tree changes remain untouched.

## Verification

- `npm run studio:check` passed, including lint, tests, config parity, build and publication guards. The log is `output/about-open-gates-20260919/studio-check.log`.
- Blender source was saved and reopened. Rail, camera bytes, timing, motion definitions, fog and circle-field settings are unchanged.
- The new independent grid-plane check rejects the previous 20-unit recess and accepts the new plane, with maximum error `2.94e-15` world units.
- All 38,640 unique grid cells remain, with no colour-pattern errors in the independent review.
- 976 reading pose/phase cases have zero circle intrusions. The source motion check covers 1,824 samples; maximum evaluated error is `3.15e-5` world units.
- Nine report-path guard checks pass. A report cannot overwrite the source, candidate or master through direct paths, symlinks or hardlinks.
- Actual in-app browser captures: 36 desktop frames at 1440 × 1000, 13 portrait frames at 390 × 844, and six ending comparison views, including one explicitly labelled previous version. The final wall was inspected in both themes. Both browser tabs reported no warnings or errors during this review.
- Four contact sheets were rendered and visually inspected. The full-size gallery retains each screenshot's actual scroll position, source identity and ambient time in its manifest.

Source SHA-256: `b446f42ae7dc3ebd42ab51820e6206ce3a1047161422c116f90fe8d0506b91e9`.

## Review

- Interactive contact sheet: `http://localhost:8021/review/` while the local artifact server is running.
- Working page: `http://localhost:8012/about.html?edit=0`.
- Downloadable sheets and gallery: `output/about-open-gates-20260919/review/`.
- Source proof: `output/about-open-gates-20260919/source/SOURCE-REPORT.json`.

To repeat the canonical gate:

```bash
npm run studio:check
```

## Review roles and limits

The spatial worker refined and exported the Blender source. The independent read-only reviewer checked geometry gaps, camera preservation, full-grid coverage and the regression check; its report-path finding was fixed and verified. The root agent integrated the ending text adjustment, ran the site gate, inspected source and browser views, and assembled the contact sheet.

The contact sheet verifies these sampled views, not full-motion comfort on every device. The reading chambers retain their sparse periphery. Physical phone and additional browser-engine testing were not repeated for this bounded geometry refinement. Production remains on its existing About publication gate. Technical checks do not establish the user's visual acceptance.
