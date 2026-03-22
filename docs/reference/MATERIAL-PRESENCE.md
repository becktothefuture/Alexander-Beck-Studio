# Material presence

Guide for how the site should feel in motion, at rest, and during state changes. Single source of truth for preserving perceptual continuity across home, portfolio, CV, modals, chrome, and future routes.

**Goal:** The interface should feel solid, continuous, and available. Motion should confirm change without making the UI feel absent, airy, or temporarily lost.

**Related:** [`SITE-STYLEGUIDE.md`](SITE-STYLEGUIDE.md), [`COMPONENT-LIBRARY.md`](COMPONENT-LIBRARY.md), [`TRANSITION-ORCHESTRATION.md`](TRANSITION-ORCHESTRATION.md), [`TONE-OF-VOICE.md`](TONE-OF-VOICE.md), [`AGENTS.md`](../../AGENTS.md)

---

## 1. Definition

“Material presence” means the UI behaves like a set of stable, tangible surfaces rather than a set of floating effects.

In practice:

- Important controls should remain perceptually anchored, even while animating.
- Groups should return as groups, not reassemble so slowly that users must reconstruct them over time.
- Motion should suggest state change, depth, or emphasis, not disappearance.
- The user should rarely have to ask: “Where did that go?” or “Is that back yet?”

This is not a rule for “less motion.” It is a rule for **clearer continuity**.

---

## 2. Core principles

1. **Continuity over disappearance**  
   Prefer transitions that preserve the feeling that an element still exists, even if it is softened, dimmed, recessed, or temporarily de-emphasized.

2. **Whole-object readability over decorative sequencing**  
   If a control or group needs to come back after a modal, route shift, or overlay dismissal, it should regain readable form quickly as a whole object. Do not replay long entrance staggers on return.

3. **Primary UI resolves early**  
   Key navigation, close actions, and main decision points should become readable and recognizable quickly. As a default, important UI should recover its readable group form within roughly a quarter second after dismiss/close unless there is a strong reason not to.

4. **Motion explains state, not availability**  
   Animation may communicate depth, emphasis, or hierarchy. It should not make users wait to understand what is available.

5. **Atmosphere is secondary to structure**  
   Blur, fade, stagger, drift, and other atmospheric effects are acceptable only when they do not weaken object permanence or delay recognition.

6. **Return transitions should be simpler than first entrances**  
   First-load choreography may take slightly more time. Returning from a modal, overlay, or temporary interruption should be faster and more direct.

7. **Stable anchors matter**  
   Navigation, route chrome, and core page landmarks should feel spatially reliable. Avoid motion that makes them appear to detach from the interface or lose their place.

---

## 3. Why this matters

Material presence improves the site for almost everyone, but it is especially helpful for users who experience cognitive load more sharply, including some people with learning disabilities, ADHD, dyslexia, slower processing speed, or working-memory strain.

It helps because:

- **It reduces temporal fragmentation.** Users do not need to rebuild the interface from separate pieces over time.
- **It supports object permanence.** Controls feel like they remained part of the page instead of vanishing and reappearing as new objects.
- **It lowers working-memory demand.** The user does not have to remember what was there while waiting for it to fully return.
- **It improves scanning.** People can recognize a whole row, title, or control group sooner than a staggered sequence of partial reveals.
- **It reduces ambiguity.** Slow or fragmented returns can feel like loading, lag, or incomplete state.
- **It improves confidence.** When the UI resolves quickly and clearly, users can act without hesitation.

Accessibility here means reducing unnecessary cognitive effort. The site should feel easier to follow, not more theatrical.

---

## 4. Do / Don’t

| Do | Don’t |
|----|--------|
| Let core UI dim, recess, or soften while staying perceptually anchored. | Make primary controls disappear so completely that the page feels empty or unavailable. |
| Restore nav and key controls as complete groups after dismissing a temporary state. | Replay long first-entrance staggers when returning from a modal or overlay. |
| Use short, decisive return timings for primary UI. | Let decorative delay hold back recognition of important actions. |
| Use motion to clarify hierarchy, depth, and focus. | Use motion mainly to add atmosphere if it weakens clarity. |
| Keep a stable sense of where major UI lives on the page. | Let repeated transitions make landmarks feel detached, floaty, or inconsistent. |
| Test whether a user can recognize what is available at a glance. | Judge animation only by taste, softness, or “feel” without checking recognition speed. |

---

## 5. Rules by area

### 5.1 Navigation and route chrome

- Main nav, route top bars, footer nav, and other primary action strips must read as stable site structure.
- On dismiss/close, nav should resolve quickly as a row or group.
- Avoid long reverse staggers on return unless the group remains readable almost immediately.
- Hover, focus, and active motion should feel tactile, not floaty.

### 5.2 Modals and overlays

- Temporary layers should suppress or recess background UI without making the page feel erased.
- When a modal closes, the underlying interface should feel like it was waiting underneath, not rebuilding from nothing.
- Restore key controls quickly and with minimal sequencing.
- If background UI is hidden during modal open, its return should be simpler and faster than its first entrance.

### 5.3 Page and route transitions

- Treat route changes as movement between stable surfaces, not a wipe into absence.
- Keep persistent landmarks perceptually continuous where possible.
- Do not stack multiple delays on top of already-recognizable UI.
- Prefer one strong transition idea over several layered effects competing for attention.

### 5.4 Typography and grouped content

- Headlines, labels, and grouped text should regain legibility as a block.
- If individual line animation is used, it must not delay recognition of the whole message.
- Return transitions for text should preserve reading flow and avoid over-fragmenting the sequence.

### 5.5 Interactive controls

- Buttons, pills, toggles, and icon controls should feel like solid interface objects.
- Use motion to reinforce press, hover, release, and state change, not to make controls seem ephemeral.
- A control should look available before the user is expected to act on it.

### 5.6 Atmospheric systems

- Blur, glass, glow, drift, and stagger are support layers, not the main event.
- If an atmospheric effect weakens recognition, tracking, or object permanence, reduce it or remove it.
- “Elegant” but delayed is still a failure if it slows understanding.

---

## 6. Decision test

Before shipping a visual change, ask:

1. Does the interface still feel present during the transition?
2. Do key controls become recognizable quickly as complete objects or groups?
3. Is the motion clarifying state, or merely decorating it?
4. Would a user with slower processing or higher cognitive load need extra effort to reconstruct what is on screen?
5. If I remove half the flourish, does the experience become clearer without losing meaning?

If the answer exposes delay, fragmentation, or theatrical absence in primary UI, simplify the motion.

---

## 7. Shipping checklist

- [ ] Primary UI remains perceptually anchored during state changes.
- [ ] Navigation and key controls re-form quickly as complete groups after dismiss/close.
- [ ] Return transitions are simpler and faster than first-load entrances where appropriate.
- [ ] Decorative stagger does not delay recognition of important actions.
- [ ] Motion supports accessibility by reducing cognitive reconstruction work.
- [ ] Verified on home, portfolio, CV, and modal flows affected by the change.
- [ ] Verified with `prefers-reduced-motion` if the change adds or alters motion.
- [ ] Transition ownership still follows `TRANSITION-ORCHESTRATION.md` (single owner + phase contract).
- [ ] Chromium + WebKit transition audits are attached (normal + strict RAF), including in-flight and settled checkpoints.

---

## 8. Working rule for this project

**Preserve material presence.** The interface should feel continuously available through motion. Core UI must return quickly as complete, readable objects or groups. Animation may guide, soften, or deepen the experience, but it must not delay recognition, weaken object permanence, or make important controls feel absent.

---

*Update this document whenever motion, transition, modal, or chrome patterns change in a way that alters how present the site feels.*
