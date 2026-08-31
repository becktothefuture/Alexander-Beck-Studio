# About V2 cinematic implementation baseline

- Captured: 2026-08-29 13:55:23 Europe/London
- Branch: `main`
- Commit: `f8afeaa5`
- Working tree at capture: 53 changed or untracked paths
- Authority: current local working tree and saved Blender source

This manifest freezes the inputs used to begin the cinematic About implementation. It
is a recovery record, not publication evidence.

## Source hashes

| Source | SHA-256 |
| --- | --- |
| `source-assets/about-v2-blender-current/about-v2-track-working.blend` | `cac7cc413abd481b582c3df5e1c566cb68569b7bd8eb1a778a5aea734f335b8f` |
| `react-app/app/public/config/contents-about.json` | `b4320acfdf2cfc4e7375b0ec611accf79f4e1c0c1c4d56ea0e61356239a34ec5` |
| `react-app/app/public/models/about-v2-edited-world/meta.json` | `62c4cac49243239b5ebedfc3e3f6c8c26d8d2cb757550da602553bb60cb8d4ff` |
| `react-app/app/public/models/about-v2-edited-world/camera-track.json` | `34531f68775e6372dab7b00ac9c2167b6f8c94c35880e84a39669c64fe47eb34` |
| `react-app/app/public/models/about-v2-edited-world/surfels.bin` | `1a08220522a86c485438544d2c1f7101c79febc3e3be1665fb437315cf400f75` |

## Recovery copy

The saved source was copied byte-for-byte before implementation to:

`source-assets/about-v2-blender-current/backups/about-v2-track-working.pre-cinematic-implementation-20260829-135523.blend`

The recovery copy has the same SHA-256 as the canonical source.

## Known baseline conditions

- The saved path contains 17 actual Bezier points.
- Scene custom properties, the repository README and the current rebuild script still
  contain stale 29-point assumptions.
- The saved source hash and public export metadata hash do not agree.
- The gate chapter still uses the previous `0.64–0.90` range and 48 gates.
- The lens chamber remains in the saved scene and exported topology.
- The saved camera track has no stationary terminal tail.
- No Blender MCP instance was claimable at capture. Seven registrations were stale or
  busy, so no live mutation or save was attempted.
- The local authoring server and public mirror were stopped.

## Recovery rule

Do not use a broad Git reset or checkout in this working tree. Restore Blender from the
named recovery copy only if the cinematic source edit fails. Restore the public asset
triplet together from this recorded baseline or regenerate it from the matching saved
scene; never mix individual files from different exports.
