# Site copy V13 audit

This is a recommendation note, not a duplicate copy deck. Edit the source files named in `SITE-COPY.md`.

## Direction after review

V13 works because it sounds like a specific person with a useful professional view. It does not sell with mood. It makes a judgement, explains the practical consequence, and proves it with career facts, disciplines and materials.

The stronger site-wide pattern is:

- judgement;
- practical consequence;
- proof through work, role, material or domain;
- direct invitation.

The homepage needs three separate copy jobs:

1. **Hero identity:** name and role. Keep this very short: `Alexander Beck.` / `Designer & Technologist.`
2. **Philosophy line:** keep the current desktop thought and use it on mobile as well.
3. **Edge credit line:** a longer, movie-poster-style identity strip that adds role, working range and service value without repeating the top-left tags.

Do not make all three surfaces say the same thing. The top-right philosophy explains why disciplines combine. The top-left tags show the disciplines. The bottom edge line should say something else: who Alexander helps, what kinds of things he helps shape, and how the work moves from direction into something buildable. Where useful, use externally recognisable terms such as **design engineering**, **product design**, **AI** and **multidisciplinary designer**. Personal flavour should come through as background and sensibility, not as a literal language list.

## Priority 0 - Homepage title and meta description

Source: `react-app/app/index.html`; route title also appears in `react-app/app/src/components/app/SiteApp.jsx`

Current:

> Alexander Beck Studio

Issue: the homepage title is serviceable, but it does not yet carry the clearer V13 positioning. There is currently no authored homepage meta description in the HTML entry.

Recommended title:

> Alexander Beck — Designer & Technologist

Recommended meta description:

> London-based designer and technologist working across product design, experience design, art direction, motion, 3D, design engineering, parametric systems and applied AI.

Shorter alternative:

> Alexander Beck is a London-based designer and technologist using design, design engineering and AI to give complex ideas form.

Implementation note: adding the description requires an HTML/meta update, not only a content JSON change.

## Priority 1 - Home philosophy copy

Source: `react-app/app/public/config/contents-home.json` → `philosophy.textBeforeLink` and `philosophy.mobileTextBeforeLink`

Current desktop:

> Innovation happens when different creative disciplines collide. By bringing together design, technology, and storytelling, I create experiences that feel both familiar and entirely new. Precise through constraint, expressive through humanity.

Current mobile:

> Innovation happens when different creative disciplines collide. I bring together design, technology, and storytelling to create experiences that feel familiar and entirely new.

Decision: keep the current desktop version. It addresses the homepage concept directly: different disciplines combining into something with shape, feeling and clarity. Use this same text on mobile.

Recommended desktop and mobile:

> Innovation happens when different creative disciplines collide. By bringing together design, technology, and storytelling, I create experiences that feel both familiar and entirely new. Precise through constraint, expressive through humanity.

## Priority 2 - Home edge credit line

Source: `react-app/app/public/config/contents-home.json` → `edge.tagline`

Current:

> A London-based design practice shaping products, interfaces, and interactive moments with a clear point of view, so complex ideas feel precise, human, and quietly inevitable.

Issue: this should not behave like a second manifesto line, and it should not repeat the top-left discipline tags. It can be longer on desktop, but it needs to add new information: person-led role, audience, working range, and the bridge between design direction and implementation. “Design practice” also makes the site sound more like a studio entity than a person-led practice.

Recommended desktop edge line:

> London-based designer and technologist shaped by communication design, visual culture and hands-on technology — helping ambitious teams move from early direction to useful products, interfaces and AI-enabled systems.

Recommended mobile edge line:

> London-based designer and technologist shaping products, interfaces and AI-enabled systems.

Alternative desktop edge line:

> London-based designer and technologist with one foot in visual culture and one in working systems — helping ambitious teams turn early ideas into products, interfaces and AI-enabled experiences.

Alternative mobile edge line:

> Designer and technologist based in London.

More personal desktop alternative:

> London-based designer and technologist, shaped by language, visual systems and hands-on technology — helping ambitious teams turn early ideas into products, interfaces and AI-enabled systems people can use.

Recommendation: use the first desktop line if the goal is professional clarity. Use the more personal version only if the page can carry that added texture without sounding like a profile bio.

Implementation note: the current source only has one `edge.tagline`. To support the desktop/mobile split properly, add an optional `edge.mobileTagline` or split the edge caption into core and optional desktop spans.

## Priority 3 - Contact description

Source: `react-app/app/public/config/contents-home.json` → `contact.description`

Current:

> Hit me up for collaborations and job opportunities. If you need innovative thinking and a creative mind to tackle complex aesthetic, visual, and system problems, get in touch.

Issue: too casual at the start and too generic afterwards. “Innovative thinking” and “creative mind” are unearned claims. The contact copy should sound direct and useful, not needy or performatively casual.

Recommended direction:

> If you’re building a product, service or experience that needs design, technology and AI to move together, send me a note.

Alternative:

> If you’re shaping something new and need clearer direction across product, brand, design engineering or AI, send me a note.

## Priority 4 - Portfolio gate

Source: `react-app/app/public/config/contents-home.json` → `gates.portfolio.description`

Current:

> Good work deserves good context. Many of my projects across finance, automotive, and digital innovation startups are NDA-protected, so access is code-gated.

Issue: “Good work deserves good context” is a little cute, and “digital innovation startups” is vague.

Recommended direction:

> Some projects include confidential finance, mobility, identity and product work. Enter the access code to view the selected case studies.

Status: applied in `contents-home.json`.

## No action - About gate

The About gate has been removed. Do not create or maintain About gate copy unless the route structure changes again.

## Priority 5 - Portfolio route blurb

Source: `react-app/app/public/config/contents-home.json` → `portfolio.blurb`

Current:

> From early concepts to shipped websites, apps, tools, and platforms.

Issue: not wrong, but thin. It describes formats rather than the kind of practice V13 establishes.

Recommended direction:

> Projects across product design, identity, interfaces, motion, design engineering and AI, from early direction to shipped systems.

## Priority 6 - Expertise tooltips

Source: `react-app/app/public/config/contents-home.json` → `legend.items`

Status: keep the visible tag labels unless there is a separate design reason to change one. The current six labels are doing the right structural job:

- Product Design
- Experience Design
- Art Direction
- Motion & 3D
- Creative Engineering
- Parametric Systems

No label change is currently recommended. Keep **Creative Engineering** as the visible tag because it is more distinctive and consistent with the current visual system. Use **design engineering** in metadata, bottom credit text and longer prose where external search, hiring language or LinkedIn readability matters.

Recommended tooltip text:

| Tag | Current tooltip | Recommended tooltip |
| --- | --- | --- |
| Product Design | I turn ambiguous product problems into interfaces teams can build, test, and improve. | I shape product ideas into clear flows, interfaces and decisions teams can build, test and improve. |
| Experience Design | I connect user needs, product priorities, and the decisions that shape the journey. | I connect user needs, product logic and service moments so the journey makes sense end to end. |
| Art Direction | I define the visual point of view that gives the work character, clarity, and intent. | I give ideas a visual point of view, so they have character without losing clarity. |
| Motion & 3D | I use motion and spatial prototypes to clarify ideas, interactions, and product stories. | I use motion and spatial prototypes to make behaviour, transitions and complex interactions easier to understand. |
| Creative Engineering | I prototype with code and AI to move decisions from discussion into working form. | I build working prototypes with code and AI so ideas can be tested as systems, not just described. |
| Parametric Systems | I build systems of tokens, rules, and patterns that scale without losing character. | I create rules, tokens and generative systems that keep complexity flexible without losing character. |

Notes:

- these keep the tags practical rather than slogan-like;
- “AI” appears only where it naturally belongs: Creative Engineering;
- “design engineering” is not forced into the visible tag list.

## Priority 7 - Portfolio project copy

Source: `react-app/app/public/config/contents-portfolio.json`

Status: lower priority. The current case-study summaries are mostly aligned because they are concrete and project-specific.

Recommended review pass:

- keep project titles if they are already clear;
- remove “calm / refined / emotional” only where they are unsupported by the next sentence;
- make each overview follow V13 logic: project tension → what Alexander shaped → what became usable, understandable or trustworthy.
