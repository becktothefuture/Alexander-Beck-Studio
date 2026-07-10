# PRD 04: Contact Page From Modal Content

## 1. Overview

Convert Contact from a modal into a route page while preserving the existing Contact modal content, alignment, and copy behavior. The Contact modal becomes the visible content inside the Contact window.

## 2. Goals

- Contact tab opens a Contact route.
- Existing modal content appears inside the inner window.
- Content remains visually centered and aligned like the modal.
- Email copy behavior is preserved.

## 3. User Stories

### US-001: Contact As Page

As a visitor, I can open Contact as a page from the bottom tab.

Acceptance criteria:

- [ ] Contact has a canonical route.
- [ ] Contact tab is active on that route.
- [ ] The old modal overlay does not open for normal Contact navigation.
- [ ] The old Contact modal implementation is removed after route content is in place.
- [ ] Bottom tabs remain visible.
- [ ] Verify in browser using dev-browser skill.

### US-002: Same Contact Content

As the site owner, the Contact content remains the same as the modal.

Acceptance criteria:

- [ ] Title, description, email row, and copy behavior match the modal content.
- [ ] Alignment is visually centered inside the inner window.
- [ ] Copy success and error states still work.
- [ ] Accessible labels remain correct.
- [ ] Verify in browser using dev-browser skill.

## 4. Functional Requirements

- FR-1: Extract reusable Contact content from modal-specific behavior or duplicate only as a temporary migration step with a follow-up removal task.
- FR-2: Render Contact inside the route content layer.
- FR-3: Remove `#contact-email` as a global modal trigger.
- FR-4: Preserve copy-to-clipboard behavior.
- FR-5: Update audits and route screenshots.
- FR-6: Remove the old Contact modal bootstrap/presentation once the route version is verified.
- FR-7: Preserve the current modal's visible content structure: label/title/description/email row/copy affordance.
- FR-8: Contact route content must be vertically and visually centered inside the window, not centered in the full viewport.
- FR-9: Contact route must not set `aria-modal="true"` or use modal backdrop/scene depth.
- FR-10: Remove Contact modal reachability from `StudioShell.jsx`, `legacy/main.js`, `shared-chrome.js`, `DailyFocusShellBridge.jsx`, route templates, haptics selectors, CSS selectors, and stale storage flags after the route replacement is verified.

## 5. Non-Goals

- No Contact copy rewrite.
- No new contact form.

## 6. Technical Considerations

- `contact-modal.js` currently builds content imperatively. A React route component should own the page version.
- Keep IDs only where tests or compatibility require them.
- Do not invoke `showGateBackdrop()` or `modal-open` for Contact.
- Current modal triggers include `#contact-email`, `#contact-email-inline`, and `abs_open_contact_modal`; these should not open an overlay after the migration.
- Extract shared copy/email constants if needed before removing modal-specific code.
- Removal checklist must include `#contact-modal`, `#contact-modal-label`, `#contact-modal-inputs`, `abs_open_contact_modal`, `DailyFocusShellBridge.jsx` `initContactModal()` import/call sites, modal trigger selectors, and any haptics bindings that target Contact modal triggers.

## 7. Validation

```bash
npm run check:site
npm run build
npm run certify:screens
```

Browser checks:

- Home to Contact.
- Portfolio/About to Contact.
- Copy email success state.
- Back/forward.

## 8. Success Metrics

- Contact route visually matches the old modal content and alignment inside the window.
- Contact navigation never opens the old modal overlay.
- Email copy behavior succeeds and announces/indicates state as before.

## 9. Open Questions

- None.
