# About V2: The Long Assembly Ride

Status: revised, blind-reviewed, and implemented on 15 August 2026

## Direction

The About page is one continuous civic-industrial point world. The visitor rides one physical track
through it. Geometry is permanent: it emerges from local fog, passes the camera once, and remains
behind. Dots do not regroup into separate scenes.

The spatial argument is:

> Complexity is encountered, organised into a working system, tested under pressure, and finally
> becomes alive.

The continuity witness is a stone deck, twin rails, and one orange service conduit. They survive every
set piece, including short voids, so a change of place never reads as a reset. The conduit hands into
green structural circuits at the destination; the ending is caused by the route rather than introduced
as a new simulation.

## Revised storyboard

| Camera punctuation | Text anchor | Spatial event | Camera event | Continuity evidence |
| --- | --- | --- | --- | --- |
| 1. Threshold | `text-promise-main` | Station blocks and one thick square gate establish scale. | Centred, 44-degree lens, level roll. | Deck, rails, and orange conduit lead into fog. |
| 2. Material yard | `text-complexity-idea` | Raw slabs, stacks, and a forked support force a chicane. | First lateral sweep and small left bank. | The threshold passes once at the frame edge. |
| 3. Hoops | `text-complexity-conditions` | Three thick hoops arrive at staggered centres, followed by an aperture wall. | Camera banks through partial arcs; lens opens to 50 degrees. | Grounded hoop supports and the same deck preserve scale. |
| 4. Archive | `text-background-unit` | A roofed archive repeats load gates around one square court. | Route settles into a compressed 43-degree view. | Piers, roof, and service line extend across the long prose. |
| 5. Question drop | `text-complexity-curiosity` | The roof wipes away; a diagonal bridge reveals a descending court. | Strong downward pitch and wide 52-degree release. | The next interchange is visible only when reached. |
| 6. Interchange | `text-complexity-listen` | Two side hoops, ramps, and overhead mass form a banked junction. | Hard lateral turn, then a short test pulse. | Rails divide visually but never detach from the main track. |
| 7. Workshops | `text-discipline-labels` | Six square gates arrive rapidly, each with one side work mass. | Alternating banks; 48-degree lens. | Repeated gate proportions make the six disciplines one system. |
| 8. Assembly hall | `text-disciplines-title` | Larger gates climb through a tall framed hall. | Motion steadies while the long copy remains readable. | Earlier gate, beam, and conduit grammar accumulates. |
| 9. Pressure wall | `text-life-momentum` | A massive wall hides a narrow aperture and four-gate compression run. | Lens tightens to 42 degrees; strongest pressure/release begins. | The orange conduit remains visible at the floor edge. |
| 10. Transfer bridge | `text-life-form` | The track crosses exposed rails after the wall. | Rapid roll reversal and lateral throw. | No floor reset; only the deck width changes. |
| 11. City run | `text-life-character` | Rapid gates, offset hoops, blind walls, and stepped towers create the largest ride sequence. | Banks peak at about 16 degrees across drops and climbs; lens opens to 52 degrees. | Z travel remains strictly forward while X and Y change drastically. |
| 12. Terminal reveal | `text-epilogue-invitation` | A final wall opens into a neutral hall. Orange hands into green side and roof circuits. | Camera recentres and the lens settles to 46 degrees. | The terminal retains the deck, rails, gates, piers, and conduit from the ride. |
| 13. Beyond | invitation exit | Deeper gates continue into fog after the invitation. | Camera stops inside the living hall, not beyond it. | A physical tail prevents a blank final frame or return transition. |

## Camera and composition contract

- One shared Hermite track owns both camera position and environmental geometry.
- Z is strictly monotonic. There are no teleports, orbits, scene returns, or reverse travel.
- X spans large chicanes and the city run; Y includes a drop, climb, and elevated terminal.
- Roll peaks at approximately plus or minus 16 degrees. Mobile scales roll to 62 percent.
- FOV changes between 42 and 52 degrees to create pressure and release without simulating zoom cuts.
- Calm copy plateaus use restrained framing. Strong banks and surprises live mainly in gaps and short titles.
- Centred one-point tableaux punctuate the threshold, a hoop passage, a pressure gate, and the terminal.
  Bounded asymmetry connects those tableaux.
- Large mass stays outside the central reading nave. Geometry may frame text but cannot become a plate.

## Fog and point-world contract

- One permanent point population: 12,000 desktop points and 5,000 mobile points.
- One static geometry buffer and one draw call for the V2 world.
- Fog starts six world units from the camera and reaches zero presence at 22 units.
- No far-field opacity floor is allowed. Future structures must be genuinely invisible.
- Recognisable primary silhouettes are square gates, aperture walls, thick hoops, deck, rails, towers,
  and the terminal hall. Diffuse atmosphere is secondary.
- Mobile narrows X and removes incidental density before weakening a primary silhouette.
- Three bounded low-amplitude pulses test the system. Reduced motion disables them and removes roll.
- Finale motion preserves openings, load paths, and the terminal silhouette.

## Distance and text-length contract

The canonical route advances 18.5 world units for each Story WU. At 22 WU it is about 407 world
units long, equivalent to roughly two minutes at 3.4 units per second. A 2.2 WU tail continues beyond
the text endpoint.

The Story Stack remains authoritative. Its measured height owns page length. Five semantic text
anchors divide the physical route; shorter copy removes local distance and repeated bays, while longer
copy extends them. Set-piece order and identity remain unchanged. Direct duration-only edits scale the
canonical anchors proportionally so the path cannot collapse at its endpoint.

## Blind review record

1. The first point-only sequence failed because it looked like unrelated simulations.
2. The first straight architectural corridor established one world but lacked travel, roll, and surprise.
3. The first long-ride render revealed the route through fog but had full-screen diagrammatic hoops,
   sparse intervals, and a terminal that appeared too abruptly.
4. The next render staggered and grounded the hoops, added an archive wall and pressure gates, kept more
   track material visible, and made the orange conduit feed a persistent green terminal.
5. The sixth-pass desktop and mobile render received independent approval through 3D-environment,
   centred-framing, controlled-tension, and emotional-travel review lenses. Reviewers reconstructed one
   fog-revealed ride, a pressure/release sequence, and the same built system becoming alive.
6. The final pass increased camera look-ahead to smooth the fastest orientation changes. Independent
   framing and payoff reviews found no new regression in punctuation, text clearance, continuity, or
   the orange-to-green terminal handoff.

The earlier clay and point boards remain in
[`long-assembly-storyboard-2026-08-15/`](long-assembly-storyboard-2026-08-15/) as rejected development
evidence. The implementation contact sheets are under
`output/playwright/about-narrative-contact-sheets/about-v2-long-ride-final-2026-08-15/` and the matching
`-mobile-` folder. Reduced-motion and WebKit evidence use the matching `-final-reduced-` and
`-final-webkit-` phase folders.
