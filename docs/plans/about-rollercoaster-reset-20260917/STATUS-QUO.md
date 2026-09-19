# About reset — status quo

17 September 2026. **V05 is rejected as the visual direction. This is an audit and replacement brief, not a completed new scene.**

## What the visitor gets today

The development route still loads the connected V05 environment. Its saved source contains a 210-unit rail, 2,101 camera samples and six regions. Most of the architecture is static. It uses surface points and a separate DOM copy layer. The final lockup sits in an upper band. Production still shows Coming soon.

The user rejects its short, weakly articulated travel, off-axis camera, unconvincing tunnels and ending. The earlier passing checks prove specific implementation behaviour, not an accepted experience. The 16 September contact sheet remains evidence of the rejected result.

## Verified causes

| Concern | Current evidence | Reset consequence |
| --- | --- | --- |
| Camera does not face travel | Comparing the exported camera's local −Z with the rail tangent gives a median deviation of 20.00°, maximum 36.75°; 1,226 of 2,101 poses exceed 15°. | Remove upward reading compensation. Derive aim from the actual path and reserve physical reading space. |
| Travel feels short | Two text-free intervals occupy 58 of 210 units; the baseline desktop journey is approximately 18 viewport lengths. More units alone would not establish a longer ride. | Author two sustained, distinct enclosed passages, with measurable spatial events and a repeatable reference playback. |
| Editing the path is indirect | The guide curve is not a live camera constraint; baked camera keys own the flight. | A single editable rail must drive the Blender camera before export. |
| Environment cannot animate | The connected-world contract rejects authored motion. The preparation utility requires one static merged mesh. | Replace the static-only contract with persistent static and animated collections. |
| Animation preview is not reliable | An older authoring helper uses different Blender rotations/noise from the runtime's axis rotation/analytic waves. | Do not reuse it as parity proof. Compare evaluated Blender motion against exported playback. |
| Circles do not reliably convey Home's material | About already requests Home's gradient atlas and uses camera-facing circles. Small point coverage hides much of that shading. | Retain the shared atlas; prove the visual result at equal apparent sizes before building the whole world. |
| End title is misplaced | Finale CSS uses a sky-band composition. | Centre the title glyph block itself; put support and actions below it. |
| Copy protection fails | The reviewed frames at 26%, 41% and 69–73% contain scenery behind prose. | Reserve the entire measured paragraph footprint, over its whole lifecycle and all animation phases. |
| A regular grid is not guaranteed | The circle-field export path bypasses the older row/column grid sampler. | Implement an explicit regular grid sampling mode using the common circle material and global density policy. |
| Pause label overstates behaviour | Pause freezes the ambient clock but scroll still moves the camera. | Specify accessible reduced-flight behaviour separately from normal ambient animation. |

Camera measurement: [machine-readable audit](../../../output/about-rollercoaster-reset-20260917/status-quo-camera-audit.json). Independent source review reproduced the result.

## Retain, replace, remove

**Retain:** approved factual prose and client content; shared shell, navigation, cursor and contact actions; Home palette and circle material; semantic DOM; font/layout readiness; source integrity and atomic bundle publication; history and reduced-motion infrastructure where compatible.

**Replace completely:** V05 camera/guide and scenery; 210-unit stage boundaries; upward camera offsets; old tunnel and overlook compositions; static-only scene rules; finale sky-band positioning; mismatched Blender motion helpers. Retain the actual shared Home atlas integration; its use is already implemented, although the current scale does not make the shading sufficiently visible.

**Remove after replacement is wired and verified:** obsolete V05-only source assets, generated exports, authoring generators, schema branches and tests that enforce the rejected design. Keep tests for shared lifecycle, integrity, accessibility and publication boundaries. The reset is not a deletion of all files with “about” in their name.

## Reset state and recovery

- A recovery archive contains 133 exact files from the saved About source, export, runtime, authoring tools and guidance. Every archived file was read back and checked against its SHA-256.
- [Recovery manifest](../../../output/about-rollercoaster-reset-20260917/recovery-manifest.json) is an inventory, **not a blanket deletion allowlist**. It includes retained infrastructure.
- Fresh authoring root: `source-assets/about-rollercoaster-reset/`. It contains no inherited scene. The future master will be `about-rollercoaster.blend`.
- Existing implementation files have **not yet been deleted or unmounted**. Removing them before the replacement adapter exists would leave broken imports and missing assets. Deletion is an explicit implementation task in the plan, with a file-specific disposition list and reference check.
- The working tree already had 183 changed/untracked paths. Unrelated Home, Work, shell, mobile and experimental work is outside this reset.
- The Blender MCP registry reported no claimable live instance: entries are unreachable or reserved/busy. No Blender instance was claimed, changed or saved. Open Blender and start/enable its MCP add-on before the scene authoring phase.

## Evidence locations

- `react-app/app/public/models/about-v2-edited-world/camera-track.json`: saved camera poses.
- `react-app/app/src/routes/about-narrative-lab/aboutBlenderSceneContract.js`: static-world prohibition and supported motion descriptors.
- `scripts/about-v2-blender/prepare-connected-world.py`: static, single-mesh preparation contract.
- `scripts/about-v2-blender/export-edited-about-v2-point-world.py`: sampling and export ownership.
- `react-app/app/src/routes/about-narrative-lab/about-narrative-lab.css`: finale layout.
- `react-app/app/src/legacy/modules/rendering/materials/simulation-body-material.js`: Home material.
- `output/about-contact-review-20260916/`: actual rejected compositions and pause finding.

No website runtime, configuration or generated asset was changed during this planning pass. Documentation now marks the old direction as rejected. A new scene, new material parity and new flight remain to be built and verified.
