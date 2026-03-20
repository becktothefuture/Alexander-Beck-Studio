# Site copy — single reference

All user-facing copy across the website in one place. Use this to edit, translate, or audit tone.  
**Source of truth for runtime:** [contents-home.json](react-app/app/public/config/contents-home.json) and [contents-portfolio.json](react-app/app/public/config/contents-portfolio.json). CV body copy lives in [cv-body.html](react-app/app/src/templates/cv-body.html) (inline).

---

## 1. Meta (global)

| Key | Current copy | Source |
|-----|--------------|--------|
| meta.title | Alexander Beck — Product Design, User Experience, Creative Technology — London | contents-home.json |
| meta.description | Alexander Beck designs product experiences and systems from London. Product design, experience strategy, and creative technology from concept to build. | contents-home.json |

---

## 2. Edge (footer caption, all pages)

| Key | Current copy | Source |
|-----|--------------|--------|
| edge.chapterText | SOURCE MATERIAL | contents-home.json |
| edge.tagline | Product design, experience strategy, and creative technology from London—where aesthetics meet intent and every interaction is built to feel inevitable. | contents-home.json |
| edge.copyright | © 2026 Alexander Beck | contents-home.json |

---

## 3. Legend (expertise, home)

| Key | Label | Tooltip | Source |
|-----|-------|---------|--------|
| legend.ariaLabel | — | Areas of expertise | contents-home.json |
| legend.items[0] | Product Systems | I structure product platforms so they stay flexible and measurable as demand changes. | contents-home.json |
| legend.items[1] | Interaction Design | I design motion and interfaces that guide behaviour on screen and in physical touchpoints. | contents-home.json |
| legend.items[2] | Creative Technology | I build digital experiences with code—from the web to spatial and emerging screens—so they stay consistent and usable. | contents-home.json |
| legend.items[3] | Applied AI | I use AI in the loop: new workflows, faster exploration, and clearer choices for product teams. | contents-home.json |
| legend.items[4] | Experience Strategy | I align product, story, and platforms so the experience stays consistent and easy to ship. | contents-home.json |
| legend.items[5] | Art Direction | I set visual direction so spatial, motion, and identity work together and the story is clear. | contents-home.json |
| legend.items[6] | Prototyping | I prototype fast to surface learnings, validate ideas, and align teams. | contents-home.json |

---

## 4. Philosophy (home)

| Key | Current copy | Source |
|-----|--------------|--------|
| philosophy.textBeforeLink | The most interesting work happens where disciplines overlap. I design at the intersection of systems, interaction, and technology, using craft and AI to shape clear, usable experiences that are ready to ship. | contents-home.json |
| philosophy.link.text | Let's chat. | contents-home.json |

---

## 5. Footer & nav (home)

| Key | Current copy | Source |
|-----|--------------|--------|
| footer.navAriaLabel | Main navigation links | contents-home.json |
| footer.links.contact.text | Contact | contents-home.json |
| footer.links.portfolio.text | Portfolio | contents-home.json |
| footer.links.cv.text | About me | contents-home.json |
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
| gates.cv.title | About me | contents-home.json |
| gates.cv.description | Bots don't deserve nice things; that's why I put this gate up. If I gave you a code, enter it here—otherwise get in touch and I'll send access. | contents-home.json |
| gates.portfolio.title | View Portfolio | contents-home.json |
| gates.portfolio.description | Good work deserves good context. Many of my projects across finance, automotive, and digital innovation startups are NDA-protected, so access is code-gated. | contents-home.json |
| gates.contact.title | Contact | contents-home.json |
| gates.contact.description | Hit me up for collaborations and job opportunities. If you need innovative thinking and a creative mind to tackle complex aesthetic, visual, and system problems, get in touch. | contents-home.json |

---

## 10. Portfolio projects (contents-portfolio.json)

### Chapter 1 — Product

| Field | Current copy |
|-------|--------------|
| client | Product |
| title | Digital Product Design for Complex Platforms |
| summary | A product suite that turns messy workflows into clear, fast-moving action. |
| role | Product Design Lead |
| year | 2024 |
| overview | Mapped workflows, defined interaction models, and shipped a modular UI system so teams could align on a multi-platform roadmap without friction. |
| tags | #product design, #UX, #UI, #prototyping, #mobile app |
| links | Prototype, Release Notes |
| contentBlocks captions | Workflow summary for the core user journey.; Interactive prototype walkthrough.; Component-driven layout exploration.; Mobile-first detail states and error paths. |
| takeaways | Design with real data to keep flows honest.; Document decisions so engineering can move faster.; Small interaction details build product trust. |

### Chapter 2 — Research

| Field | Current copy |
|-------|--------------|
| client | Research |
| title | Strategic UX Research + Insight Mapping |
| summary | A research program linking qualitative insight with quantitative signals for sharper bets. |
| role | UX Research + Strategy |
| year | 2022 |
| overview | Synthesized interviews, surveys, and usage data into an opportunity map that prioritized roadmap decisions. |
| tags | #user research, #strategy, #analytics, #testing, #insights |
| links | Insight Report, Research Plan |
| contentBlocks captions | Research scope and stakeholder alignment.; Insight synthesis and storytelling reel.; Opportunity mapping and prioritization.; Behavioral segmentation and personas. |
| takeaways | Anchor insight delivery to roadmap timing.; Blend qual and quant for sharper decisions.; Make artifacts easy to reuse across teams. |

### Chapter 3 — Motion

| Field | Current copy |
|-------|--------------|
| client | Motion |
| title | Motion & Interaction Systems |
| summary | A shared motion system so small moments feel consistent and build trust. |
| role | Motion Design + Prototyping |
| year | 2023 |
| overview | Defined pacing, easing, and feedback patterns so product teams could ship motion with clarity and confidence. |
| tags | #motion design, #interaction, #webgl, #animation, #micro-interactions |
| links | Motion Spec, Prototype Reel |
| contentBlocks captions | Animation guidelines and timing rails.; Interactive states and feedback loops.; Motion tokens for components and transitions.; Systemized micro-interactions. |
| takeaways | Consistency in motion builds product confidence.; Prototype early to validate pacing.; Motion tokens scale better than bespoke effects. |

### Chapter 4 — Design Systems

| Field | Current copy |
|-------|--------------|
| client | Design Systems |
| title | Design Systems Architecture |
| summary | A system that scales components, tokens, and governance across teams and brands. |
| role | Design Systems Architect |
| year | 2024 |
| overview | Built token strategy, component governance, and documentation patterns that make quality repeatable across squads and product lines. |
| tags | #design systems, #components, #documentation, #scalability, #tokens |
| links | System Docs, Component Library |
| contentBlocks captions | Token architecture and naming.; Component QA and release workflow.; Documentation patterns and usage notes.; System adoption and onboarding flow. |
| takeaways | Governance keeps systems from drifting.; Docs need to be as polished as the UI.; Tokens make multi-brand scaling possible. |

### Chapter 5 — Meta (Creative Direction)

| Field | Current copy |
|-------|--------------|
| client | Meta |
| title | Creative Direction + Launch Narratives |
| summary | A sprint that aligned teams around one story and clear craft standards. |
| role | Creative Direction |
| year | 2021 |
| overview | Set vision, led critique, and delivered one launch story across design and marketing teams. |
| tags | #creative direction, #team leadership, #mentorship, #vision, #execution |
| links | Launch Story, Press Kit |
| contentBlocks captions | Narrative framing and positioning.; Campaign motion and storytelling beats.; Team alignment and review cadence.; Launch artifacts and touchpoints. |
| takeaways | Narrative clarity makes execution faster.; Consistency needs ownership, not consensus.; Great launches are rehearsed, not rushed. |

### Chapter 6 — R&D

| Field | Current copy |
|-------|--------------|
| client | R&D |
| title | Experimental Lab for Frontier Prototypes |
| summary | An R&D lab exploring generative visuals, speculative interfaces, and future interaction models. |
| role | R&D Lead |
| year | 2024 |
| overview | Prototyped speculative interfaces and generative systems to test new interaction patterns and technical feasibility. |
| tags | #experimental, #generative art, #code, #future tech, #concepts |
| links | Prototype Experiments, Technical Notes |
| contentBlocks captions | Speculative interface sketches.; Realtime generative motion study.; Material and shader exploration.; Prototype outputs and experiments. |
| takeaways | Fast experiments make the future concrete.; Build small tools to unlock big visuals.; Spec work benefits from tight storytelling. |

---

## 11. CV page (cv-body.html — inline only)

*CV body copy is not loaded from JSON; it lives in the template. To centralise it, you could move these into a contents-cv.json and inject at build time or via apply-text.*

### Intro (left column)

| Element | Current copy |
|---------|--------------|
| cv-name | Alexander Beck |
| cv-title | Product Design · Creative Technology · Experience Direction |
| cv-intro-text | For more than fifteen years, I've worked where product design, technology, and human behaviour meet. I help teams make complex things clearer through systems, interfaces, and prototypes that are thoughtful to use and realistic to build. |
| img alt | Alexander Beck |

### About

| Element | Current copy |
|---------|--------------|
| section title | About |
| body | I work across product design, systems thinking, interaction, and prototyping. Most of my projects involve untangling complexity: aligning teams, clarifying priorities, and giving products a stronger behavioural point of view. |
| body | My background spans enterprise platforms, brand-led digital experiences, and experimental builds. I use code when fidelity matters, and AI when it helps a team think faster, test ideas earlier, or explore new directions without losing judgement. |

### Experience

| Entry | Title | Meta | Body |
|-------|-------|------|------|
| 1 | Independent Practice | Founder & Principal · 2019 – Present · London | Independent consultant and creative partner for product teams, founders, and agencies. I help define product direction, shape interaction models, prototype difficult ideas, and turn ambitious concepts into systems that can actually ship. |
| 2 | Senior Product Designer | Global Financial Services · 2016 – 2019 · London & New York | Led design systems and workflow redesign for enterprise finance products used by global teams. Worked closely with product, engineering, and research to simplify dense interfaces, improve decision-making, and bring more consistency to complex operational tools. |
| 3 | Design Lead | Digital Agency · 2012 – 2016 · Berlin & Amsterdam | Led multidisciplinary teams across digital campaigns, brand experiences, and interactive launches. Built a stronger prototyping culture so ideas could be tested earlier, discussed with more precision, and presented with less hand-waving. |
| 4 | Interactive Designer | Boutique Studio · 2008 – 2012 · San Francisco | Started in motion design and interactive development, building browser-based experiences and real-time visuals. That technical foundation still shapes how I think about behaviour, pacing, and performance. |

### Expertise

| Section title | List items |
|---------------|------------|
| Expertise | Product Strategy & Systems Thinking; Interaction Design & Motion; Design Systems & Component Architecture; Frontend Development (React, Vue, Canvas, WebGL); AI/ML Product Integration; Design Operations & Team Leadership; Prototyping & Experimental Technology; Workshop Facilitation & Stakeholder Alignment |

### Selected Projects

| Section title | Intro | Items |
|---------------|-------|--------|
| Selected Projects | A few representative projects: | Enterprise Trading Platform Redesign — Reframed a dense institutional product around clearer workflows, a shared component system, and tighter collaboration between design and engineering.; Luxury Retail Experience — Developed spatial and interactive concepts for a premium retail environment, blending digital storytelling with tactile product discovery.; AI-Assisted Creative Tool — Shaped early product direction and interface behaviour for a generative tool designed to expand concept exploration without removing creative control.; Interactive Brand Installation — Designed a physical and digital experience powered by real-time motion systems, turning a brand story into something people could move through and manipulate. |

### Education

| Entry | Title | Meta |
|-------|-------|------|
| 1 | MA Interactive Design | Royal College of Art · London · 2008 |
| 2 | BA Graphic Design | California College of the Arts · San Francisco · 2006 |

### Philosophy

| Section title | Body |
|---------------|------|
| Philosophy | I like work that is both rigorous and expressive. Clear structure creates room for stronger feeling, and better tools create room for better judgement. |
| | The best digital products do not perform intelligence for the user. They remove friction, reveal intent, and make complex systems feel usable without becoming bland. |
| | Based in London and available for select collaborations. |

### Recognition

| Section title | Body |
|---------------|------|
| Recognition | Selected work has been recognised by D&AD, Awwwards, FWA, and Red Dot, and featured in design publications and talks. |

### CV footer

| Element | Current copy |
|---------|--------------|
| cv-contact | hello@alexanderbeck.studio |
| cv-copyright | © 2026 Alexander Beck. All rights reserved. |

---

## 12. Hardcoded UI strings (templates / JS)

*These appear in HTML or JS with fallbacks; not in contents-home. Consider moving to contents-home if you want them in this doc as source of truth.*

| Context | String | Location |
|---------|--------|----------|
| Canvas | Bouncy balls | index-body.html (aria-label) |
| Logo SVG | Alexander Beck Studio | index-body.html (aria-label) |
| Back link | Back to home | cv-body.html, portfolio-body.html (aria-label) |
| Theme button | Toggle theme | index/cv/portfolio (aria-label) |
| CV/Portfolio gate inputs | CV invite code digit 1 of 4, etc. | cv-modal, portfolio-modal (aria-label, from JS) |

---

## How to use this doc

- **Edit runtime copy:** Change [contents-home.json](react-app/app/public/config/contents-home.json) or [contents-portfolio.json](react-app/app/public/config/contents-portfolio.json); keep this file in sync for reference.
- **Edit CV copy:** Change [cv-body.html](react-app/app/src/templates/cv-body.html); update the “CV page” section above when you do.
- **Tone:** Align with [TONE-OF-VOICE.md](TONE-OF-VOICE.md).
- **Adding a new string:** Add it to the right JSON (or CV template), then add a row/section here with key and current copy.
