# Open-source alternatives to GT Era Text Regular

Status: source-led shortlist for the typography prototype
Research date: 2026-08-07

## Recommendation

Start the prototype comparison with **Instrument Sans**, **Onest**, and **Inter**. They cover the three parts of the brief most convincingly:

- Instrument Sans has the closest overall neo-grotesque character and enough controlled irregularity to sit beside GT Era Display Heavy.
- Onest is the strongest text-and-interface candidate because its source explicitly supports closed and semi-closed aperture variants and recommends the family for apps, sites, interface elements, and navigation.
- Inter is the strongest functional benchmark because its source explicitly documents a tall x-height, screen optimisation, and nine weights.

No open-source family in this shortlist is an exact substitute for GT Era Text Regular. GT Era deliberately combines generous widths, increased x-height, round forms, closed apertures, diagonal contrast, and angled terminals. The prototype should therefore compare line fit and texture using the site's real copy rather than select from specimen images alone.

## Comparison basis

Grilli Type describes GT Era as a contemporary interpretation of early grotesks with an **increased x-height**, **round circular letters**, **wide caps**, **closed apertures**, **generous widths**, and **sharp, angled terminals**. It supplies Text and Display designs across seven weights; the variable family spans weight 100–900 and optical size 16–42. These are the reference characteristics for the ranking. [GT Era minisite](https://gt-era.com/) · [GT Era family page](https://www.grillitype.com/typeface/gt-era)

All similarity statements below are **visual assessments**, informed by the official specimens and source documentation. They are not claims of measured geometric equivalence. The final order should be revised after the candidates are rendered against the locally installed GT Era Text Regular using the same copy, size, leading, and tracking.

## Measured browser comparison

The prototype was measured in Chromium at the 440 × 956 mobile viewport. Canvas measurements use 100px type, weight 400 for body copy and weight 600 for the menu. The live description used the selected 102.25% size, 104.5% leading, and -0.012em tracking. `x-height` and `cap height` are browser glyph-bounds measurements divided by the 100px font size. `Sample width` is the advance width in em of “Innovation happens when different creative disciplines collide.” The similarity score is a weighted geometric comparison; lower is closer. It does not score terminal shape, aperture character, or overall personality.

| Family | x-height | Cap height | Sample width | Live lines | Metric score |
| --- | ---: | ---: | ---: | ---: | ---: |
| **GT Era Text Regular** | **0.518** | **0.705** | **29.580em** | **6** | **Reference** |
| Public Sans | 0.517 | 0.723 | 28.690em | 6 | 1.81 |
| Onest | 0.527 | 0.707 | 28.997em | 6 | 1.83 |
| Inter | 0.546 | 0.728 | 29.384em | 6 | 2.34 |
| Work Sans | 0.500 | 0.660 | 30.698em | 6 | 3.48 |
| DM Sans | 0.504 | 0.700 | 28.733em | 5 | 5.00 |
| Instrument Sans | 0.510 | 0.720 | 28.238em | 5 | 5.02 |
| Geist | 0.530 | 0.710 | 28.113em | 5 | 5.50 |
| Figtree | 0.500 | 0.700 | 27.780em | 5 | 6.54 |
| Archivo | 0.526 | 0.686 | 27.109em | 5 | 7.06 |
| Hanken Grotesk | 0.493 | 0.697 | 27.622em | 5 | 7.58 |

The measured result changes the practical recommendation. **Onest is the best first choice:** it is second-closest geometrically, preserves the six-line mobile description, has near-identical cap height, offers weights 100–900, and retains more of the closed-aperture character than Public Sans. Public Sans is the closest pure metric match but is visually flatter and its upstream project is no longer actively maintained. Instrument Sans remains the strongest stylistic comparison, but its body sample is 4.54% narrower and reduces the live description from six lines to five at the current settings.

The complete machine-readable measurements are saved at `output/design-explorations/gt-era-text-open-font-metrics.json` and can be regenerated with `node scripts/measure-gt-era-text-alternatives.mjs` while the local studio server is running.

## Ranked shortlist

### 1. Instrument Sans

- **Why it is close — visual assessment:** A contemporary neo-grotesque with generous, calm proportions and small moments of character. Its round forms, compact joins, and not-quite-neutral drawing feel more compatible with GT Era's warmth than a purely Swiss UI sans. The width axis also provides a useful way to compare line fit without horizontal CSS scaling.
- **Where it differs — visual assessment:** Its apertures are generally more open and its terminals are less assertively angled. The Regular is a little cleaner and more polished than GT Era Text Regular.
- **Weights and styles:** Variable weight 400–700; variable width 75–100; upright and italic. This gives Regular, Medium, Semibold, and Bold menu tests, but no Light, ExtraBold, or Black in the Google Fonts build. [Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/instrumentsans/METADATA.pb)
- **Official source:** [Instrument Sans repository](https://github.com/Instrument/instrument-sans)
- **Licence:** [SIL Open Font License 1.1](https://github.com/Instrument/instrument-sans/blob/master/OFL.txt)

### 2. Onest

- **Why it is close — visual assessment:** High-looking lowercase forms, round counters, sturdy text colour, and a restrained geometric/humanist mix make it a strong body-copy analogue. The official source describes character sets with closed and semi-closed apertures, which directly matches one of GT Era's defining traits. It is explicitly intended for long screen text, apps, sites, interface elements, and navigation.
- **Where it differs — visual assessment:** It is more systematic and contemporary. GT Era's diagonal contrast and sharp terminal details are less evident.
- **Weights and styles:** Variable weight 100–900, upright in the current Google Fonts build. This is ample for body copy and multiple menu emphases. [Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/onest/METADATA.pb)
- **Official source:** [Onest repository](https://github.com/simpals/onest)
- **Licence:** [SIL Open Font License 1.1](https://github.com/simpals/onest/blob/main/OFL.txt)

### 3. Inter

- **Why it is close — visual assessment:** Inter's documented tall x-height, compact vertical economy, and screen-first drawing make it the most dependable functional match for GT Era Text Regular at the site's small mobile sizes. Its current Text rendering has angled terminals on several curved letters, giving it more kinship with GT Era than older, strictly neutral UI sans faces.
- **Where it differs — visual assessment:** Inter is generally narrower and more uniform. Its texture feels cleaner and more familiar, with less of GT Era's wide-cap, pre-modern grotesque character.
- **Weights and styles:** Variable and static weights 100–900; Thin through Black; upright and italic. [Official family and weight documentation](https://github.com/rsms/inter#readme)
- **Official source:** [Inter repository](https://github.com/rsms/inter)
- **Licence:** [SIL Open Font License 1.1](https://github.com/rsms/inter/blob/master/LICENSE.txt)

### 4. Work Sans

- **Why it is close — visual assessment:** Work Sans has the most relevant historical premise: its source says it is based loosely on early grotesques and optimised for on-screen text from 14–48px. That gives it a warm, practical texture and occasional idiosyncrasy that can complement GT Era Display Heavy.
- **Where it differs — visual assessment:** Its apertures are more open, several letters are narrower, and the Regular feels lighter at the same nominal weight. It may need a slightly heavier variable value for comparable colour.
- **Weights and styles:** Variable weight 100–900; upright and italic. [Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/worksans/METADATA.pb)
- **Official source:** [Work Sans repository](https://github.com/weiweihuanghuang/Work-Sans)
- **Licence:** [SIL Open Font License 1.1](https://github.com/weiweihuanghuang/Work-Sans/blob/master/OFL.txt)

### 5. Hanken Grotesk

- **Why it is close — visual assessment:** A classic-grotesque foundation, broad lowercase, round bowls, and sturdy UI texture make it a credible direct replacement. Its source explicitly positions the updated family for text, interfaces, websites, and mobile applications.
- **Where it differs — visual assessment:** It is more even and generic through words. Its terminal treatment and internal tension are quieter than GT Era's.
- **Weights and styles:** Variable weight 100–900; upright and italic in the current Google Fonts build. [Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/hankengrotesk/METADATA.pb)
- **Official source:** [Hanken Grotesk repository](https://github.com/marcologous/hanken-grotesk)
- **Licence:** [SIL Open Font License 1.1](https://github.com/marcologous/hanken-grotesk/blob/master/OFL.txt)

### 6. Archivo

- **Why it is close — visual assessment:** Archivo is explicitly described by its source as a grotesque reminiscent of the late nineteenth century. Its weight and width axes make it unusually useful for matching both GT Era's body-copy colour and its generous horizontal proportions.
- **Where it differs — visual assessment:** At the default width it looks tighter and more industrial. The expanded part of its width range may improve line fit, but it should be treated as a real font-axis choice, not as a promise of identical glyph proportions.
- **Weights and styles:** Variable weight 100–900; variable width 62–125; upright and italic. [Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/archivo/METADATA.pb)
- **Official source:** [Archivo repository](https://github.com/Omnibus-Type/Archivo)
- **Licence:** [SIL Open Font License 1.1](https://github.com/Omnibus-Type/Archivo/blob/master/OFL.txt)

### 7. Figtree

- **Why it is close — visual assessment:** Figtree has a high-looking lowercase, generous circular forms, and friendly but restrained geometry. It should retain legibility at the small sizes used in the legend, introduction, and Button Bar while avoiding the coldness of a conventional neo-grotesque.
- **Where it differs — visual assessment:** It is softer and more openly geometric. The terminals and apertures do not reproduce GT Era's sharper friction.
- **Weights and styles:** Variable weight 300–900; upright and italic. [Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/figtree/METADATA.pb)
- **Official source:** [Figtree repository](https://github.com/erikdkennedy/figtree)
- **Licence:** [SIL Open Font License 1.1](https://github.com/erikdkennedy/figtree/blob/master/OFL.txt)

### 8. DM Sans

- **Why it is close — visual assessment:** A large x-height impression, round bowls, broad weight coverage, and a true optical-size axis make DM Sans useful for testing a text-optimised alternative at small sizes and a stronger menu cut from the same family.
- **Where it differs — visual assessment:** Its construction is more geometric and softly rounded, with less grotesque irregularity and fewer sharp terminal cues. It may feel friendlier than the title demands.
- **Weights and styles:** Variable weight 100–1000; optical size 9–40; upright and italic. [Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/dmsans/METADATA.pb)
- **Official source:** [DM Fonts repository](https://github.com/googlefonts/dm-fonts)
- **Licence:** [SIL Open Font License 1.1](https://github.com/googlefonts/dm-fonts/blob/main/Sans/OFL.txt)

### 9. Geist

- **Why it is close — visual assessment:** Geist is a modern geometric sans influenced by Inter, Univers, and SF Pro. It provides strong small-size clarity, compact spacing, and a complete family for body and navigation. It is a useful baseline because it is already the site's default supporting face.
- **Where it differs — visual assessment:** It is more neutral, tighter, and more digital in tone. It does not reproduce GT Era Text's generous widths or historical grotesque warmth, which is why it ranks below the new candidates.
- **Weights and styles:** Variable weight 100–900; upright and italic. [Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/geist/METADATA.pb)
- **Official source:** [Geist repository](https://github.com/vercel/geist-font)
- **Licence:** [SIL Open Font License 1.1](https://github.com/vercel/geist-font/blob/main/OFL.txt)

### 10. Public Sans

- **Why it is close — visual assessment:** Public Sans has a robust American grotesque base, even strokes, smooth counters, sharp vertices, and proven UI legibility. Its broad weight range makes body/menu pairing straightforward.
- **Where it differs — visual assessment:** Its own source documents narrower rounded characters and a deliberately neutral treatment. That is useful for reading flow but moves away from GT Era's generous widths and visible personality. The upstream project also states that it is not currently actively developed or maintained, although the released font remains available under the OFL and Google Fonts distributes it.
- **Weights and styles:** Variable weight 100–900; upright and italic. [Google Fonts metadata](https://github.com/google/fonts/blob/main/ofl/publicsans/METADATA.pb)
- **Official source:** [Public Sans repository](https://github.com/uswds/public-sans)
- **Licence:** [SIL Open Font License 1.1](https://github.com/uswds/public-sans/blob/develop/LICENSE.md)

## Prototype order and controls

Use this order in the body-family selector:

1. GT Era Text Regular reference
2. Instrument Sans
3. Onest
4. Inter
5. Work Sans
6. Hanken Grotesk
7. Archivo
8. Figtree
9. DM Sans
10. Geist
11. Public Sans

Keep the first comparison controlled:

- preserve the current title as GT Era Display Heavy;
- preserve the current body size, line-height, tracking, and element widths;
- begin body copy at weight 400;
- expose menu weights 500, 600, and 700 for every candidate that supports them;
- expose Instrument Sans at 500, 600, and 700 only;
- expose the Archivo and Instrument Sans width axes separately from font size or CSS transform;
- expose DM Sans optical size separately and default it near the rendered body size;
- keep the London SVG unchanged.

The useful decision is not which specimen looks most like GT Era in isolation. It is which family preserves the current line breaks, x-height impression, visual colour, and title/body relationship with the least compensating adjustment.

## Considered but not shortlisted

### Manrope

Manrope is OFL-licensed and offers variable weights 200–800. It is a capable interface family, but its highly polished geometric construction and smooth terminal treatment appear less compatible with GT Era's early-grotesque friction than the shortlisted geometric options. [Official source](https://github.com/aaronbell/manrope) · [weight and licence metadata](https://github.com/google/fonts/blob/main/ofl/manrope/METADATA.pb) · [OFL](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt)

### Source Sans 3

Source Sans 3 is OFL-licensed and offers variable weights 200–900 with upright and italic styles. Its open, humanist drawing is excellent for extended reading, but its narrower, more open rhythm is visually further from GT Era Text's round, closed, generous construction. [Official source](https://github.com/adobe-fonts/source-sans) · [weight and licence metadata](https://github.com/google/fonts/blob/main/ofl/sourcesans3/METADATA.pb) · [OFL](https://github.com/adobe-fonts/source-sans/blob/release/LICENSE.md)

### Plus Jakarta Sans

Plus Jakarta Sans is OFL-licensed and offers variable weights 200–800 with upright and italic styles. Its friendly geometric roundness is useful, but the visual tone is softer and more contemporary-brand-like than GT Era's sharper grotesque texture. [Official source](https://github.com/tokotype/PlusJakartaSans) · [weight and licence metadata](https://github.com/google/fonts/blob/main/ofl/plusjakartasans/METADATA.pb) · [OFL](https://github.com/tokotype/PlusJakartaSans/blob/master/OFL.txt)

## Primary sources

- [Grilli Type: GT Era minisite and design characteristics](https://gt-era.com/)
- [Grilli Type: GT Era family overview](https://www.grillitype.com/typeface/gt-era)
- [Google Fonts repository](https://github.com/google/fonts), used for current distributed axes, styles, and licence metadata
- Each family's upstream source and licence are linked in its entry above.
