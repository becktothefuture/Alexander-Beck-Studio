# PRD: Contact Route Promotion

## 1. Introduction

Promote Contact from modal-only content to a first-class route/page reachable from the new bottom dock and direct URL. Preserve the existing email/copy behavior and avoid creating two competing Contact experiences.

## 2. Goals

- Add `/contact.html` as a route-backed page.
- Reuse the current Contact copy and email source.
- Make the Contact tab and inline "Let's chat" route to Contact.
- Make Contact route canonical; modal-only Contact becomes retained compatibility only where still needed by old session/deep-link flows.
- Verify direct-load and SPA Contact behavior.

## 3. User Stories

### US-001: Direct load Contact route

**Description:** As a visitor, I want `/contact.html` to load as a real page so Contact has the same standing as Portfolio and About Me.

**Acceptance Criteria:**
- [ ] `contact` exists in the canonical route registry.
- [ ] `contact.html` is included in Vite build inputs or an equivalent direct-load build path.
- [ ] `SiteApp` can render a Contact route view.
- [ ] Direct loading `/contact.html` renders Contact content without redirecting to Home.
- [ ] `npm run build` includes the Contact entry.
- [ ] `certify:screens` includes a Contact route case.
- [ ] `audit:boot-overlay` includes a Contact direct-load case.

### US-002: Contact page content and interaction

**Description:** As a visitor, I want a clear Contact page with email copy behavior so I can get in touch.

**Acceptance Criteria:**
- [ ] Contact route uses existing content source for title, description, email, copied text, and error text.
- [ ] Email copy interaction works on the Contact route.
- [ ] Copy success and failure are announced accessibly.
- [ ] Contact page composition is shell-native and not just a full-screen modal replica.
- [ ] Verify in browser using desktop and mobile viewports.

### US-003: Inline Contact navigation

**Description:** As a visitor, I want "Let's chat" and the Contact tab to take me to the same Contact destination.

**Acceptance Criteria:**
- [ ] Bottom Contact tab navigates to `/contact.html`.
- [ ] Home inline `Let's chat` navigates to `/contact.html`.
- [ ] Browser back from Contact returns to the previous route.
- [ ] Contact tab is active on direct load and SPA navigation.

### US-004: Modal compatibility

**Description:** As a developer, I need legacy modal behavior to be handled deliberately while Contact becomes a route.

**Acceptance Criteria:**
- [ ] Existing `abs_open_contact_modal` behavior migrates to Contact route navigation, unless a hidden retained compatibility path is explicitly documented.
- [ ] No stale modal listener blocks Contact route navigation.
- [ ] Contact modal markup does not conflict with the Contact route page.
- [ ] Existing Portfolio/About gate modals still work after Contact route promotion.

## 4. Functional Requirements

- FR-1: Add Contact route registry entry and direct-load build support.
- FR-2: Add a Contact route view under `react-app/app/src/routes/contact/`.
- FR-3: Reuse Contact content from the existing content source unless a new source is justified.
- FR-4: Make Contact the canonical destination for Contact tab and inline Contact link.
- FR-5: Preserve copy-to-clipboard behavior with accessible feedback.
- FR-6: Update validation scripts that need to know Contact exists.

## 5. Non-Goals

- No final dock visual styling in this PRD.
- No removal of Portfolio/About gates.
- No broad copy rewrite beyond adapting existing Contact content to route context.

## 6. Design Considerations

- Contact should feel like a route within the shared shell, not a modal stretched into the wall.
- Prefer a compact field-like contact surface using the existing contact email row material.
- Keep visual density balanced against the home composition.

## 7. Technical Considerations

- Relevant files: `routes.js`, `SiteApp.jsx`, `vite.config.js`, `HomeRoute.jsx`, `contact-modal.js`, `contents-home.json`.
- If a new virtual content module is needed, update the Vite content plugin.
- Direct-load boot readiness must be covered by `audit:boot-overlay`.

## 8. Success Metrics

- `/contact.html` works from direct load and SPA navigation.
- Contact tab state is correct in direct load, SPA navigation, and back/forward.
- Email copy works without regressions.

## 9. Resolved Decisions

- Contact is public and ungated.
- All visible Contact intent routes to `/contact.html`.
- Modal-only Contact is retained only as compatibility if a concrete existing flow still requires it; otherwise session requests should map to the route.
