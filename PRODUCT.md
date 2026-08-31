# Alexander Beck Studio: product context

The product baseline below was approved on 31 August 2026. It guides work on the main website; it does not approve a redesign, new application features, or publication of unreleased work.

## Purpose and scope

Alexander Beck Studio is a creative-technologist portfolio. It helps prospective collaborators understand Alexander's practice, assess relevant work, and start a conversation about a product, service, or experience.

The product surface is the public website: Home, Work, About, and Contact inside one persistent studio shell. The interactive material demonstrates the practice, but visitors must still be able to understand the offer and reach Contact without exploring every interaction.

The current build and preview boundaries are documented in [README.md](README.md#routes). Work and About are not fully launched by default. A development experience or an intentional preview is not proof of public release.

Standalone labs, authoring panels, the live styleguide, and other experiments in this repository support development. They are not additional public product destinations. The historical `portfolio` and `playground` source names do not create separate Work and Lab products.

## People and their needs

- Prospective clients and collaborators need to understand the kind of problems Alexander can help solve, see relevant evidence where available, and find a clear contact action.
- Visitors arriving from a shared link need enough context to understand the work without first learning the site's interactive controls.
- Alexander maintains the content and reviews work through the existing authoring and preview tools. Agent contributors need clear source ownership and must preserve work already in progress.
- People using small screens, keyboard navigation, assistive technology, or reduced motion need the same essential information and contact path.

TODO: confirm — Alexander must decide the priority between prospective clients, creative partners, and recruiters before a change optimises the site for one group.

## Core journey and success

The shortest successful journey is **understand the practice → find a reason to talk → open Contact → copy the email address or follow LinkedIn**.

When the relevant content is available, Work adds evidence through the spatial catalogue, snippets, and protected case studies. About adds the personal narrative. Neither route may make the main navigation or contact path depend on completing an animation, finding a hidden control, or obtaining access to a case study.

Observable success means a visitor can:

1. Explain what Alexander does in useful, concrete terms.
2. Find and inspect relevant work where publication and access permit it.
3. Reach a clear contact action and understand its feedback.

TODO: confirm — Alexander must define measurable success targets and any measurement method. This baseline does not invent conversion targets or approve analytics, tracking, or additional data collection.

## Product principles

1. **Make the practice understandable.** Explain what design, technology, motion, and systems make possible together. Use specific work and decisions as evidence.
2. **Keep the visitor oriented.** Preserve the persistent shell and clear Home, Work, About, and Contact destinations. Opening and closing work must preserve context.
3. **Give interaction a purpose.** Physical response and spatial exploration can express the practice. They must not obstruct reading, navigation, or contact.
4. **Protect trust.** Publish only supported claims, respect content holds and access decisions, and distinguish an experiment from a shipped result.
5. **Reuse the established system.** Make each change fit the product and its existing design language before adding a new pattern.
6. **Keep the essential journey inclusive.** Preserve semantics, keyboard operation, legibility, focus, touch access, and reduced-motion alternatives.

## Personality and references

The site should feel precise, authored, playful, restrained, and human. These traits have practical effects: clear hierarchy; a recognisable point of view; physical responses that support interaction; few effects competing at once; and direct, useful writing.

[DESIGN.md](DESIGN.md#design-thesis) owns the visual interpretation. Its reference to Teenage Engineering concerns product-minded precision, not copying hardware, branding, or typography. The [tone guide](docs/reference/TONE-OF-VOICE.md) defines how to explain the practice through specific claims and evidence.

Avoid generic startup slogans, decorative clutter, and competing interface systems. Do not turn the site into a generic application dashboard, storefront, or separate catalogue of tools. Do not add a new visual direction simply because a generic design skill suggests one.

## Content and trust

This file owns product intent. It is not a copy deck, token specification, or authority for project outcomes.

| Concern | Source and rule |
| --- | --- |
| Identity, expertise, Home copy, and contact details | [contents-home.json](react-app/app/public/config/contents-home.json); edit the relevant editorial fields, not a duplicate Markdown copy. |
| Work projects and media delivered by the site | [contents-portfolio.json](react-app/app/public/config/contents-portfolio.json); delivery content is not independent proof of a claim. |
| About narrative copy and choreography | [contents-about.json](react-app/app/public/config/contents-about.json); preserve the single authored document. |
| Case-study facts, evidence, and content holds | Follow the [portfolio knowledge rules](AGENTS.md#portfolio-knowledge-source-of-truth), beginning with [router.yaml](docs/portfolio/router.yaml). Do not promote candidate claims into facts. |
| Writing and terminology | [TONE-OF-VOICE.md](docs/reference/TONE-OF-VOICE.md) and [SITE-COPY.md](docs/reference/SITE-COPY.md); use direct language, clear labels, and honest feedback. |
| Visual rules and implemented values | [DESIGN.md](DESIGN.md#authority); implementation and authored configuration own their values. |
| Public preview and release | [Development and release policy](docs/deployment/DEVELOPMENT-AND-RELEASE.md) and [AGENTS.md](AGENTS.md#development-public-preview-and-production-policy); save, commit, and publication are separate actions. |

Content must make the next action clear. Do not imply that a clipboard operation succeeded when it failed, or that an unreleased project is publicly available. Do not publish protected case-study material or remove a hold as part of unrelated UI work.

TODO: confirm — some Home philosophy wording conflicts with the tone guide's examples of language to avoid. Alexander should approve any copy revision separately; this setup does not rewrite public copy.

## Accessibility and inclusion

The existing design target is WCAG 2.2 AA. This is a working requirement, not a conformance claim. Use the [design accessibility rules](DESIGN.md#accessibility-and-performance-rules) and verify actual behavior in the affected routes and states.

Native controls and accessible names are a starting point. Verify keyboard activation, focus visibility and restoration, announcements, resolved contrast, touch targets, text reflow, and reduced motion. Do not infer successful interaction from markup alone.

## Ownership and review

Alexander owns product direction and approves material changes to this baseline. Contributors maintain the relevant source and documentation after approved work is implemented.

Revisit this file when audience priority, the contact journey, the public route scope, or the role of Work and About changes. Launch readiness and launch timing remain separate decisions; follow the current route contracts until Alexander approves a release change. Review unresolved audience, measurement, and copy questions before work that depends on their answers.
