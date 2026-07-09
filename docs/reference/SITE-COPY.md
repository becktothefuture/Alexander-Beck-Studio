# Site copy — single reference

All user-facing copy across the website in one place. Use this to edit, translate, or audit tone.  
**Source of truth for runtime:** [contents-home.json](../../react-app/app/public/config/contents-home.json), [contents-cv.json](../../react-app/app/public/config/contents-cv.json), and [contents-portfolio.json](../../react-app/app/public/config/contents-portfolio.json).

Canonical About/CV navigation label: `About Me`. Shared navigation and gate titles are owned by `contents-home.json`; active React routes should read `footer.links.cv.text` instead of hard-coding their own casing.

---

## 1. Meta (global)

| Key | Current copy | Source |
|-----|--------------|--------|
| meta.title | Alexander Beck — Product Design, AI Product Design, Creative Technology — London | contents-home.json |
| meta.description | Alexander Beck designs product experiences, AI workflows, interaction systems, and creative technology from London. | contents-home.json |

---

## 2. Edge (footer caption, all pages)

| Key | Current copy | Source |
|-----|--------------|--------|
| edge.chapterText | SOURCE MATERIAL | contents-home.json |
| edge.tagline | A London-based design practice shaping products, interfaces, and interactive moments with a clear point of view, so complex ideas feel precise, human, and quietly inevitable. | contents-home.json |
| edge.copyright | © 2026 Alexander Beck | contents-home.json |

---

## 3. Legend (expertise, home)

| Key | Label | Tooltip | Source |
|-----|-------|---------|--------|
| legend.ariaLabel | — | Areas of expertise | contents-home.json |
| legend.items[0] | Product Design | I turn loose product thinking into interfaces people can actually work with. | contents-home.json |
| legend.items[1] | Experience Design | I find the snags, missing steps, and moments where the product loses people. | contents-home.json |
| legend.items[2] | Art Direction | I give the work a visual spine, not just a nicer surface. | contents-home.json |
| legend.items[3] | Motion & 3D | I use movement and space to test what flat screens can't explain. | contents-home.json |
| legend.items[4] | Creative Engineering | I build working sketches so ideas can be argued with properly. | contents-home.json |
| legend.items[5] | Parametric Systems | I make rules and tools that keep variation from becoming mush. | contents-home.json |

---

## 4. Philosophy (home)

| Key | Current copy | Source |
|-----|--------------|--------|
| philosophy.textBeforeLink | Innovation happens when different creative disciplines collide. By bringing together design, technology, and storytelling, I create experiences that feel both familiar and entirely new. Precise through constraint, expressive through humanity. | contents-home.json |
| philosophy.link.text | Let's chat. | contents-home.json |

---

## 5. Footer & nav (home)

| Key | Current copy | Source |
|-----|--------------|--------|
| footer.navAriaLabel | Main navigation links | contents-home.json |
| footer.links.contact.text | Contact | contents-home.json |
| footer.links.portfolio.text | Portfolio | contents-home.json |
| footer.links.cv.text | About Me | contents-home.json |
| footer.metaLocationPrefix | London, UK ·  | contents-home.json |

---

## 6. Socials

| Key | Current copy | Source |
|-----|--------------|--------|
| socials.ariaLabel | Social media links | contents-home.json |
| socials.items.appleMusic.ariaLabel | Apple Music | contents-home.json |
| socials.items.appleMusic.screenReaderText | Apple Music | contents-home.json |
| socials.items.linkedin.ariaLabel | LinkedIn | contents-home.json |
| socials.items.linkedin.screenReaderText | LinkedIn | contents-home.json |

---

## 7. Contact

| Key | Current copy | Source |
|-----|--------------|--------|
| contact.email | alexander@beck.fyi | contents-home.json |
| contact.copy.buttonAriaLabel | Copy email address | contents-home.json |
| contact.copy.statusCopied | Copied | contents-home.json |
| contact.copy.statusError | Copy failed | contents-home.json |

---

## 8. Portfolio (overview)

| Key | Current copy | Source |
|-----|--------------|--------|
| portfolio.blurb | Selected work across finance, luxury, and frontier tech—projects I've directed, led, or built with teams. Currently designing for neurodivergent users. | contents-home.json |

---

## 9. Gates (modals)

| Key | Current copy | Source |
|-----|--------------|--------|
| gates.common.backText | BACK | contents-home.json |
| gates.common.backAriaLabel | Back | contents-home.json |
| gates.common.closeAriaLabel | Close | contents-home.json |
| gates.cv.title | About Me | contents-home.json |
| gates.cv.description | Bots don't deserve nice things; that's why I put this gate up. If I gave you a code, enter it here—otherwise get in touch and I'll send access. | contents-home.json |
| gates.portfolio.title | View Portfolio | contents-home.json |
| gates.portfolio.description | Good work deserves good context. Many of my projects across finance, automotive, and digital innovation startups are NDA-protected, so access is code-gated. | contents-home.json |
| gates.contact.title | Contact | contents-home.json |
| gates.contact.description | Hit me up for collaborations and job opportunities. If you need innovative thinking and a creative mind to tackle complex aesthetic, visual, and system problems, get in touch. | contents-home.json |

---

## 10. Portfolio projects (contents-portfolio.json)

### Chapter 1 — S&P Global

| Field | Current copy |
|-------|--------------|
| client | S&P Global |
| displayTitle | Making financial indexes visible |
| title | Making Financial Indexes Visible |
| summary | A product interface that turned index-building from emails, spreadsheets, and scripts into a visual workflow. |
| role | Lead UX and Visual Designer |
| year | Recent |
| overview | Mapped the index-building process, shaped a modular interaction model, and designed screens that helped users build, validate, and launch strategies in days instead of weeks. |
| tags | #product design, #financial UX, #workflow design, #prototyping, #B2B tools |
| links | None |
| contentBlocks captions | Project framing for a financial-index builder.; Role, design rationale, and lessons from translating financial logic into UI.; Interface states for building and validating index strategies.; Landing screen for building, validating, and deploying a strategic index. |
| takeaways | Make abstract rules visible before asking users to act.; A strong model helps technical and non-technical users work from the same idea.; Visual design can reduce ambiguity in complex financial tools. |

### Chapter 2 — Bentley

| Field | Current copy |
|-------|--------------|
| client | Bentley |
| displayTitle | Digital calm for luxury ownership |
| title | Digital Calm for Luxury Ownership |
| summary | Digital experience work that translated Bentley's brand tone into calm interaction flows, motion, and ownership moments. |
| role | Experience and Interaction Designer |
| year | Recent |
| overview | Worked across concept, interaction design, storytelling, 3D, and motion. Built a digital garage in Blender, shaped interactive flows, and co-developed a visual and motion language for Bentley's digital presence. |
| tags | #luxury digital, #motion, #3D prototyping, #brand systems, #product design |
| links | None |
| contentBlocks captions | Role, process, and lessons from shaping Bentley's digital presence.; Brand atmosphere used to guide pacing, tone, and interaction decisions.; Ownership and service touchpoints arranged as a digital product system.; Strategy prompts for a connected Bentley ownership experience. |
| takeaways | Brand tone becomes stronger when it affects interaction decisions.; Pacing is a design material in premium digital products.; Prototypes help stakeholders discuss feeling, not only screens. |

### Chapter 3 — Yoti

| Field | Current copy |
|-------|--------------|
| client | Yoti |
| displayTitle | Designing trust flows |
| title | Designing Trust Flows |
| summary | Product and interaction work for identity and age-verification moments where users needed to understand what was happening and why. |
| role | Product and Interaction Designer |
| year | 2023 |
| overview | Designed and documented verification flows across mobile and desktop, including QR handoffs, ID details, and face-scan explanations for sensitive user journeys. |
| tags | #identity UX, #trust, #mobile flows, #verification, #interaction design |
| links | None |
| contentBlocks captions | QR-code handoff flow between desktop, mobile, and callback states.; A sensitive verification moment explained in plain language.; Mobile identity states for age and document verification.; Brand and interface documentation for consistent implementation. |
| takeaways | Trust depends on explaining the reason behind a request.; Cross-device flows need clear entry, waiting, and recovery states.; Sensitive products benefit from simple language and visible system feedback. |

### Chapter 4 — SunExpress

| Field | Current copy |
|-------|--------------|
| client | SunExpress |
| displayTitle | Clearer flight booking |
| title | Clearer Flight Booking |
| summary | An early travel UX project that made a multilingual booking journey clearer across search, selection, and upsell moments. |
| role | UX and Web Designer |
| year | Archive |
| overview | Mapped booking paths, audited existing interactions, restructured decision points, and built a custom design system and icon set for a large transactional airline site. |
| tags | #travel UX, #booking flows, #design system, #web design, #accessibility |
| links | None |
| contentBlocks captions | Role and lessons from a large-scale airline booking project.; Booking and destination-page explorations for the SunExpress website.; Transactional screens across outbound and inbound flight choices.; Project notes on accessibility, language, and scalable interaction patterns. |
| takeaways | Structure affects confidence in transactional flows.; Small content and ordering changes can reduce confusion without a full rebuild.; A design system is useful only when tested against real booking cases. |

### Chapter 5 — Personal Experimental Website

| Field | Current copy |
|-------|--------------|
| client | Personal |
| displayTitle | A portfolio built as an environment |
| title | Personal Experimental Website |
| summary | A self-initiated website exploring how a portfolio can feel like an environment rather than a sequence of pages. |
| role | Designer and Developer |
| year | Ongoing |
| overview | Designed and built a responsive web environment with spatial depth, dynamic interaction, motion, sound, and layered content. The project became a live system for testing browser performance, animation, and immersive navigation. |
| tags | #creative technology, #spatial design, #web design, #motion, #sound |
| links | None |
| contentBlocks captions | Project framing for a personal website built as a spatial environment.; Annotated interaction details for navigation, overlays, and motion states.; Experience framing and visual direction for the site.; Interface study for depth, atmosphere, and movement. |
| takeaways | A portfolio can teach through movement and structure, not only written case studies.; Immersion needs performance discipline to stay usable.; Personal work is strongest when it exposes how you think and build. |

### Chapter 6 — Pro Keyboard

| Field | Current copy |
|-------|--------------|
| client | Pro Keyboard |
| displayTitle | Touch typing refined |
| title | Touch Typing Refined |
| summary | A focused product concept for making typing practice feel clearer, calmer, and easier to return to. |
| role | Product Concept Designer |
| year | Concept |
| overview | Explored a learning product around touch typing, using simple feedback, mobile-friendly screens, and practice loops that support steady improvement instead of pressure. |
| tags | #learning UX, #product concept, #mobile design, #interaction, #research |
| links | None |
| contentBlocks captions | Early research framing for exploratory product and interface studies.; Mobile product screens for a touch-typing learning concept.; Minimal interface study for the wider concept system. |
| takeaways | Small concepts still need a clear user problem.; Learning tools should reward progress without adding pressure.; This project needs sharper evidence if it remains in the final selection. |

---

## 11. CV page

Runtime source: [contents-cv.json](../../react-app/app/public/config/contents-cv.json), imported through `virtual:abs-content/cv` in [CvRoute.jsx](../../react-app/app/src/routes/cv/CvRoute.jsx).

| Area | Source |
|------|--------|
| Intro name/title/paragraphs/photo | `contents-cv.json` → `intro` |
| Body sections | `contents-cv.json` → `sections` |
| Footer prompt/contact/copyright | `contents-cv.json` → `footer` |
| Route-local UI labels | `CvRoute.jsx` (`footer.links.cv.text`, `Back to top`, route topbar ARIA labels) |

---

## 12. Hardcoded UI strings (route code / JS)

*These appear in route modules or JS with fallbacks; not all are in runtime JSON. Consider moving them to the relevant content JSON if they need editorial control.*

| Context | String | Location |
|---------|--------|----------|
| Canvas | Bouncy balls | `HomeRoute.jsx` (aria-label) |
| CV heading | About Me | `contents-home.json` → `footer.links.cv.text` |
| CV button | Back to top | `CvRoute.jsx` |
| Back link | Back to home | route modules (aria-label) |
| Theme button | Toggle theme | index/cv/portfolio (aria-label) |
| CV/Portfolio gate inputs | CV invite code digit 1 of 6, etc. | cv-modal, portfolio-modal (aria-label, from JS) |

---

## How to use this doc

- **Edit runtime copy:** Change [contents-home.json](../../react-app/app/public/config/contents-home.json), [contents-cv.json](../../react-app/app/public/config/contents-cv.json), or [contents-portfolio.json](../../react-app/app/public/config/contents-portfolio.json); keep this file in sync for reference.
- **Edit route-local labels:** Change the owning route/component module, then update the hardcoded strings table above.
- **Tone:** Align with [TONE-OF-VOICE.md](TONE-OF-VOICE.md).
- **Adding a new string:** Add it to the right JSON when it is editorial copy; otherwise add a row/section here with key, current copy, and owning module.
